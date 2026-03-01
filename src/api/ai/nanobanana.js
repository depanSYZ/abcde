const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

/**
 * Class untuk handle OTP via akunlama.com
 * Creator: D2:业
 */
class TempMail {
    constructor() {
        this.baseUrl = 'https://akunlama.com';
        this.recipient = crypto.randomBytes(4).toString('hex'); 
        this.domain = 'fexpost.com'; 
    }

    async getEmail() {
        return `${this.recipient}@${this.domain}`;
    }

    async checkInbox() {
        try {
            const { data } = await axios.get(`${this.baseUrl}/api/list`, {
                params: { recipient: this.recipient }
            });
            return data;
        } catch {
            return [];
        }
    }

    async getOtp() {
        let attempts = 0;
        while (attempts < 20) {
            const inbox = await this.checkInbox();
            if (inbox && inbox.length > 0) {
                const msg = inbox[0];
                const { data: html } = await axios.get(`${this.baseUrl}/api/getHtml`, {
                    params: { region: msg.storage.region, key: msg.storage.key }
                });
                const match = html.match(/(\d{6})/);
                if (match) return match[1];
            }
            await new Promise(r => setTimeout(r, 5000));
            attempts++;
        }
        throw new Error("OTP Nanana tidak kunjung tiba...");
    }
}

/**
 * Logic utama Nano Banana AI
 * Creator: D2:业
 */
async function nanoBanana(imagePath, prompt) {
    const tempMail = new TempMail();
    const email = await tempMail.getEmail();
    const baseUrl = 'https://nanana.app';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': baseUrl,
        'Referer': `${baseUrl}/en`
    };

    // 1. Kirim OTP
    await axios.post(`${baseUrl}/api/auth/email-otp/send-verification-otp`, 
        { email, type: 'sign-in' }, { headers });

    // 2. Ambil OTP
    const otp = await tempMail.getOtp();

    // 3. Login & Ambil Cookie
    const login = await axios.post(`${baseUrl}/api/auth/sign-in/email-otp`, 
        { email, otp }, { headers });
    
    const cookie = login.headers['set-cookie'].join('; ');

    // 4. Upload Image ke Server Nanana
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    const upload = await axios.post(`${baseUrl}/api/upload-img`, form, {
        headers: { 
            ...form.getHeaders(), 
            'Cookie': cookie, 
            'x-fp-id': crypto.randomBytes(16).toString('hex') 
        }
    });

    // 5. Generate Image-to-Image
    const gen = await axios.post(`${baseUrl}/api/image-to-image`, 
        { prompt, image_urls: [upload.data.url] }, 
        { headers: { 'Cookie': cookie, 'Content-Type': 'application/json' } }
    );

    // 6. Polling Hasil
    let attempts = 0;
    while (attempts < 30) {
        const res = await axios.post(`${baseUrl}/api/get-result`, 
            { requestId: gen.data.request_id, type: 'image-to-image' },
            { headers: { 'Cookie': cookie } }
        );
        if (res.data.completed) return res.data;
        await new Promise(r => setTimeout(r, 3000));
        attempts++;
    }
    throw new Error("Proses AI NanoBanana timeout.");
}

/**
 * Export Express Route
 * Endpoint: /v1/ai/nanobanana
 */
module.exports = function (app) {
    app.get("/v1/ai/nanobanana", async (req, res) => {
        const { url, prompt } = req.query;
        
        if (!url || !prompt) {
            return res.status(400).json({ 
                status: false, 
                error: "Parameter 'url' dan 'prompt' wajib diisi, Bang D2:业!" 
            });
        }

        // Buat folder tmp kalau belum ada
        const tmpDir = path.join(__dirname, '../../../tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const fileName = `${crypto.randomBytes(8).toString('hex')}.jpg`;
        const tempPath = path.join(tmpDir, fileName);

        try {
            // 1. Download Gambar dari URL
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            });
            
            const writer = fs.createWriteStream(tempPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // 2. Kirim ke AI NanoBanana
            const result = await nanoBanana(tempPath, prompt);

            // 3. Cleanup: Hapus file temporary
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

            // 4. Return Hasil Akhir
            res.json({
                status: true,
                creator: "D2:业",
                result: {
                    request_id: result.request_id,
                    input_url: url,
                    output_url: Array.isArray(result.output_url) ? result.output_url[0] : result.output_url,
                    completed: result.completed
                }
            });

        } catch (err) {
            // Cleanup kalau error
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            console.error(err);
            res.status(500).json({ 
                status: false, 
                error: err.message || "Terjadi kesalahan pada sistem Nano Banana." 
            });
        }
    });
};
