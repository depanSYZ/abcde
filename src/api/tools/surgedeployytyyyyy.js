const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const multer = require('multer');

/**
 * 🔥 D2:业 - SURGE DEPLOYER VERCEL EDITION
 */

// Konfigurasi Multer buat simpan file di folder /tmp Vercel
const upload = multer({ dest: os.tmpdir() });

const SETTING = {
    // DAPETIN TOKEN: Ketik 'npx surge token' di terminal laptop lu
    surgeToken: "5796d21b55ad39d9167d1964cf47c8a2", 
    creator: "D2:业"
};

module.exports = function (app) {
    // Endpoint: POST /v2/tools/deploy
    app.post("/v2/tools/deploy", upload.single('file'), async (req, res) => {
        try {
            const { domain } = req.body;
            const file = req.file;

            // 1. Validasi Input
            if (!file || !domain) {
                return res.status(400).json({ 
                    status: false, 
                    message: "Mana file ZIP-nya? Domain-nya juga isi dong, Bos! 🗿" 
                });
            }

            // 2. Setup Jalur Aman (Wajib di /tmp buat Vercel)
            const targetDomain = `${domain.replace(/\s+/g, '-')}.surge.sh`;
            const extractPath = path.join(os.tmpdir(), `d2_web_${Date.now()}`);

            // 3. Ekstrak ZIP ke folder temporary
            const zip = new AdmZip(file.path);
            zip.extractAllTo(extractPath, true);

            // 4. Perintah Deploy Pakai NPX (Biar gak usah install global)
            const command = `npx surge ${extractPath} ${targetDomain} --token ${SETTING.surgeToken}`;

            exec(command, (error, stdout, stderr) => {
                // Hapus sampah file setelah proses selesai (biar gak menuhin /tmp)
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });

                if (error) {
                    console.error("SURGE ERROR:", stderr);
                    return res.status(500).json({
                        status: false,
                        creator: SETTING.creator,
                        message: "Deploy Gagal! Cek apakah domain sudah dipakai orang lain.",
                        error: stderr || error.message
                    });
                }

                // 5. Sukses! Kirim Link-nya
                res.json({
                    status: true,
                    creator: SETTING.creator,
                    result: {
                        url: `https://${targetDomain}`,
                        info: "Website lu udah online, Bos! 🚀",
                        log: stdout.split('\n').filter(line => line.includes('Success')).join(' ')
                    }
                });
            });

        } catch (e) {
            res.status(500).json({ 
                status: false, 
                creator: SETTING.creator,
                error: "System Crash: " + e.message 
            });
        }
    });
};
