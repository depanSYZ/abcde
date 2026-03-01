/**
 * 🌐 Web to Zip Cloner (V2)
 * Path: /v2/tools/webcloner
 * Category: Tools
 * Creator: D2:业
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function saveweb2zip(url) {
    const request = await fetch('https://copier.saveweb2zip.com/api/copySite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url,
            renameAssets: false,
            saveStructure: true,
            alternativeAlgorithm: false,
            mobileVersion: false,
        }),
    });

    if (!request.ok) throw new Error('API Copier Down atau URL tidak valid');
    const { md5 } = await request.json();

    // Polling Status (Maksimal 12 kali / 1 menit biar gak timeout di Vercel)
    let attempts = 0;
    while (attempts < 12) {
        const req = await fetch('https://copier.saveweb2zip.com/api/getStatus/' + md5);
        const res = await req.json();

        if (res.isFinished) {
            if (!res.success) throw new Error(res.errorText || 'Gagal cloning');
            return {
                md5: res.md5,
                startedAt: res.startedAt,
                filesCount: res.copiedFilesAmount,
                downloadUrl: 'https://copier.saveweb2zip.com/api/downloadArchive/' + res.md5,
            };
        }
        
        attempts++;
        await delay(5000); // Tunggu 5 detik per cek
    }
    throw new Error('Proses terlalu lama, silakan cek manual nanti.');
}

module.exports = function (app) {
    app.get("/tools/cloneweb", async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: "D2:业",
                message: "Masukkan URL web yang mau di-clone! Contoh: ?url=https://google.com"
            });
        }

        try {
            const result = await saveweb2zip(url);
            res.json({
                status: true,
                creator: "D2:业",
                result: result
            });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
