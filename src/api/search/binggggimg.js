const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * 🖼️ Bing Image Search Scraper (V2)
 * Path: /v2/search/bingimg
 * Category: Search
 * Creator: D2:业
 */

const AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
];

const fetchUrl = (targetUrl) => {
    return new Promise((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            timeout: 15000,
            headers: {
                'User-Agent': AGENTS[Math.floor(Math.random() * AGENTS.length)],
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        req.on('error', reject);
        req.end();
    });
};

const parseImages = (html) => {
    const results = [];
    const seen = new Set();
    const patterns = [
        /"murl"\s*:\s*"([^"]+)"/gi,
        /"imgurl"\s*:\s*"([^"]+)"/gi,
        /mediaurl=([^&" ]+)/gi
    ];

    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            let url = match[1];
            if (url.startsWith('http') && !seen.has(url) && !url.includes('bing.com')) {
                url = url.replace(/&amp;/g, '&');
                try { url = decodeURIComponent(url); } catch(e) {}
                seen.add(url);
                results.push(url);
            }
        }
    });
    return results;
};

module.exports = function (app) {
    app.get("/v2/search/bingimg", async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                creator: "D2:业",
                message: "Query 'q' wajib diisi. Contoh: /v2/search/bingimg?q=cyberpunk"
            });
        }

        try {
            // Kita pakai endpoint async Bing biar dapet banyak hasil
            const target = `https://www.bing.com/images/async?q=${encodeURIComponent(q)}&first=1&count=50&mmasync=1`;
            const html = await fetchUrl(target);
            const images = parseImages(html);

            res.json({
                status: true,
                creator: "D2:业",
                result: images.slice(0, 50) // Ambil 50 gambar teratas
            });
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};
