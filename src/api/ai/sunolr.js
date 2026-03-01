const axios = require("axios");

/**
 * Suno AI Lyrics Generator
 * Engine: Sunora API (Mavtao)
 * Category: AI
 * Creator: D2:业 (Engine by gienetic)
 */
async function generateLyrics(description) {
  const headers = {
    "user-agent": "Dart/3.4 (gienetic_build)",
    "version": "2.2.2",
    "x-auth": "863c9980-cc71-4b81-96fa-67f7d3e266fa", 
    "content-type": "application/json",
    "platform": "android"
  };

  try {
    const payload = {
      description,
      key_word: "",
      mood: ""
    };

    const response = await axios.post(
      "https://api.sunora.mavtao.com/api/music/generate_lyrics",
      payload,
      { headers }
    );

    const d = response.data.data;

    return {
      song_name: d.song_name,
      style: d.music_style,
      genre: d.music_genre,
      mood: d.mood,
      instrument: d.instrument,
      theme: d.theme,
      lyrics: d.lyrics
    };
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /v1/ai/sunolyrics
   * @query ?text=lagu sedih tentang perpisahan
   */
  app.get("/v1/ai/sunolyrics", async (req, res) => {
    const { text } = req.query;

    if (!text) {
      return res.status(400).json({ 
        status: false, 
        creator: "D2:业",
        error: "Kasih deskripsi lagunya dulu, Bang!" 
      });
    }

    try {
      const result = await generateLyrics(text);
      res.json({
        status: true,
        creator: "D2:业",
        result: result
      });
    } catch (err) {
      res.status(500).json({ 
        status: false, 
        error: err.message 
      });
    }
  });
};
