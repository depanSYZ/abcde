const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const multer = require('multer');

// --- 🛠️ SETTINGAN SUNG ---
const SETTING = {
    // CARA DAPETIN: Buka terminal di laptop, ketik 'npx surge token'. 
    // Login sekali, trus copy string panjang yang muncul. Paste di bawah:
    surgeToken: "5796d21b55ad39d9167d1964cf47c8a2", 
    creator: "D2:业"
};

const upload = multer({ dest: os.tmpdir() });

module.exports = function (app) {
    app.post("/v2/tools/deploy", upload.single('file'), async (req, res) => {
        const { domain } = req.body;
        const file = req.file;

        if (!file || !domain) return res.status(400).json({ status: false, message: "File & Domain wajib ada!" });

        const targetDomain = `${domain.replace(/\s+/g, '-')}.surge.sh`;
        const extractPath = path.join(os.tmpdir(), `d2_${Date.now()}`);

        try {
            // 1. Ekstrak
            const zip = new AdmZip(file.path);
            zip.extractAllTo(extractPath, true);

            // 2. Deploy (Gak pake email, cuma pake TOKEN)
            // Perintah: npx surge [folder] [domain] --token [token]
            const command = `npx surge ${extractPath} ${targetDomain} --token ${SETTING.surgeToken}`;

            exec(command, (error, stdout) => {
                // Cleanup
                fs.unlinkSync(file.path);
                fs.rmSync(extractPath, { recursive: true, force: true });

                if (error) return res.status(500).json({ status: false, error: "Gagal! Token salah atau domain 'udah ada yang punya'." });

                res.json({
                    status: true,
                    creator: SETTING.creator,
                    result: {
                        url: `https://${targetDomain}`,
                        status: "Success Online! 🚀"
                    }
                });
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    });
};
