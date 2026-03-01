const cheerio = require('cheerio');

/**
 * Quran Data Scraper
 * Path: /v1/info/quran/:id
 * Creator: D2:业
 */

async function readSurah(id) {
    const url = `https://quran.nu.or.id/${id}`;
    const htmlRaw = await fetch(url);
    if (!htmlRaw.ok) return null;
    
    const html = await htmlRaw.text();
    const $ = cheerio.load(html);
    const result = [];

    $('.flex-grow.flex').each((i, el) => {
        const arab = $(el).find('.__className_8a198f').text().trim();
        const latin = $(el).find('.mb-3').text().trim();
        const indo = $(el).find('.text-neutral-700').text().trim();
        
        if (arab) {
            result.push({
                ayat: i + 1,
                arab,
                latin,
                indo
            });
        }
    });
    return result;
}

module.exports = function (app) {
    app.get("/v1/info/quran/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const data = await readSurah(id);

            if (!data || data.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: "D2:业",
                    error: "Data tidak ditemukan"
                });
            }

            // Respons sesuai permintaan Abang
            res.json({
                status: true,
                creator: "D2:业",
                surah: id,
                result: data
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                creator: "D2:业",
                error: err.message
            });
        }
    });
};
