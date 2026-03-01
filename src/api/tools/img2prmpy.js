import axios from 'axios';

/**
 * 🛠️ Image to Prompt (URL Version)
 * Path: /v2/tools/img2prompt
 * Category: Tools
 * Creator: D2:业
 */

async function fetchImageToBase64(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const contentType = response.headers['content-type'];
    const base64 = Buffer.from(response.data).toString('base64');
    return `data:${contentType};base64,${base64}`;
}

async function processPrompt(base64Image) {
    const response = await axios.post(
        'https://wabpfqsvdkdjpjjkbnok.supabase.co/functions/v1/unified-prompt-dev',
        { feature: 'image-to-prompt-en', language: 'en', image: base64Image },
        {
            responseType: 'stream',
            headers: {
                'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYnBmcXN2ZGtkanBqamtibm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczNjk5MjEsImV4cCI6MjA1Mjk0NTkyMX0.wGGq1SWLIRELdrntLntBz-QH-JxoHUdz8Gq-0ha-4a4',
                'content-type': 'application/json',
                'origin': 'https://generateprompt.ai',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }
    );

    return new Promise((resolve, reject) => {
        let result = '';
        let buffer = '';
        response.data.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    try {
                        const json = JSON.parse(line.slice(5).trim());
                        result += json?.choices?.[0]?.delta?.content || json?.content || json?.text || '';
                    } catch (e) {}
                }
            }
        });
        response.data.on('end', () => resolve(result.trim()));
        response.data.on('error', reject);
    });
}

export default function (app) {
    app.get("/v2/tools/img2prompt", async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ 
                status: false, 
                creator: "D2:业", 
                error: "Sertakan URL gambar! (?url=https://link-gambar.com/foto.jpg)" 
            });
        }

        try {
            const base64Data = await fetchImageToBase64(url);
            const prompt = await processPrompt(base64Data);

            res.json({
                status: true,
                creator: "D2:业",
                result: prompt
            });
        } catch (err) {
            res.status(500).json({ 
                status: false, 
                error: "Gagal memproses gambar ke prompt.",
                detail: err.message 
            });
        }
    });
}
