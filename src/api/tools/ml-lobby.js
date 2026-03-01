const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

/**
 * Mobile Legends Lobby Generator
 * Category: Tools / Image Processing
 * Creator: D2:业
 */

module.exports = function (app) {
    app.get("/v1/tools/ml-lobby", async (req, res) => {
        const { user_img, nickname, type } = req.query;

        if (!user_img || !nickname || !type) {
            return res.status(400).json({ status: false, msg: "Query 'user_img', 'nickname', dan 'type' (airplane/stardom) wajib diisi!" });
        }

        try {
            // Load Font (Pastikan file brat.ttf ada di folder /public/fonts/)
            const fontPath = path.join(process.cwd(), 'public', 'fonts', 'brat.ttf');
            GlobalFonts.registerFromPath(fontPath, 'BratFont');

            // Load Semua Gambar
            const [bg, frameOverlay, userImage] = await Promise.all([
                loadImage('https://files.catbox.moe/liplnf.jpg'),
                loadImage(type === 'airplane' 
                    ? 'https://cloud-fukushima.vercel.app/uploader/bh46ua9ah1.jpg' 
                    : 'https://cloud-fukushima.vercel.app/uploader/256wbyxi69.jpg'),
                loadImage(user_img)
            ]);

            const canvas = createCanvas(bg.width, bg.height);
            const ctx = canvas.getContext('2d');

            // 1. Gambar Background
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

            // 2. Setting Koordinat (Sesuai logic Abang)
            const avatarSize = 205;
            const frameSize = 293;
            const centerX = (canvas.width - frameSize) / 2;
            const centerY = (canvas.height - frameSize) / 2 - 282;
            const avatarX = centerX + (frameSize - avatarSize) / 2;
            const avatarY = centerY + (frameSize - avatarSize) / 2 - 3;

            // 3. Crop User Image jadi Square
            const minSide = Math.min(userImage.width, userImage.height);
            const cropX = (userImage.width - minSide) / 2;
            const cropY = (userImage.height - minSide) / 2;

            // 4. Gambar Avatar & Frame
            ctx.drawImage(userImage, cropX, cropY, minSide, minSide, avatarX, avatarY, avatarSize, avatarSize);
            ctx.drawImage(frameOverlay, centerX, centerY, frameSize, frameSize);

            // 5. Render Teks Nickname
            let fontSize = nickname.length > 11 ? Math.max(24, 36 - (nickname.length - 11) * 2) : 36;
            ctx.font = `${fontSize}px BratFont`;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(nickname, canvas.width / 2 + 13, centerY + frameSize + 15);

            // 6. Output sebagai Buffer
            const buffer = canvas.toBuffer('image/png');
            res.setHeader('Content-Type', 'image/png');
            res.send(buffer);

        } catch (e) {
            res.status(500).json({ status: false, msg: e.message });
        }
    });
};
