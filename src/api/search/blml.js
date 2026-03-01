const axios = require("axios");

/**
 * 🎮 MLBB Hero Build Scraper (V2)
 * Path: /v2/tools/buildml
 * Category: Tools
 * Creator: D2:业
 */

const SUPABASE_URL = "https://bfnagdegsgqrrhlurlpc.supabase.co";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbmFnZGVnc2dxcnJobHVybHBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTE1NzQsImV4cCI6MjA2OTI4NzU3NH0._RoSCboOxjr3ldxbn_WYPGOCsTADqV6siaS0wVmkBSA";

async function db(table, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}&select=*`;
  const res = await axios.get(url, {
    headers: {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 10000
  });
  return res.data;
}

function normalizeItems(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  if (typeof raw === "string" && raw.includes(",")) return raw.split(",").map(i => Number(i.trim()));
  return [raw];
}

module.exports = function (app) {
  app.get("/v2/search/buildml", async (req, res) => {
    const { hero } = req.query;

    if (!hero) {
      return res.status(400).json({
        status: false,
        creator: "D2:业",
        message: "Masukkan nama hero! Contoh: ?hero=miya"
      });
    }

    try {
      // 1. Cari Hero ID
      const heroes = await db("heroes", `name=ilike.%25${hero}%25`);
      if (!heroes.length) return res.json({ status: false, message: "Hero tidak ditemukan." });

      const targetHero = heroes[0];

      // 2. Ambil Build & Items secara pararel (Biar cepet)
      const [builds, items] = await Promise.all([
        db("builds", `hero_id=eq.${targetHero.id}`),
        db("items"),
      ]);

      // 3. Mapping ID Item ke Nama Item
      const finalBuilds = builds.map(b => {
        const itemIds = normalizeItems(b.items);
        return {
          title: b.title,
          items: itemIds.map(id => {
            const itemData = items.find(i => i.id == id);
            return itemData ? { name: itemData.name, icon: itemData.icon_url } : { name: "Unknown Item" };
          }),
        };
      });

      res.json({
        status: true,
        creator: "D2:业",
        result: {
          hero: targetHero.name,
          role: targetHero.role,
          builds: finalBuilds
        }
      });

    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
};
