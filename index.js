const express = require("express");
const chalk = require("chalk");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK || "https://discord.com/api/webhooks/1475655302383665213/U5FwGe2sMbUcujPKvq9fgLdjIO3Euf1xxsgI95fwHcaYHJ-x3VBAh_wSCENEnpK6p0h1";

// --- ANTI SPAM CONFIG ---
const requestLog = new Map();
const SPAM_THRESHOLD = 20; // Maksimal request per menit
const BAN_DURATION = 60000; // Blokir selama 1 menit (ms)
const spamDetectedIPs = new Set();

async function sendDiscord(message, embed = null) {
    try {
        const payload = { content: message };
        if (embed) payload.embeds = [embed];
        await axios.post(DISCORD_WEBHOOK_URL, payload);
    } catch (err) {
        console.error(chalk.red(`[DiscordError] ${err.message}`));
    }
}

app.enable("trust proxy");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(fileUpload());
app.set("json spaces", 2);

// --- MIDDLEWARE ANTI SPAM ---
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    if (spamDetectedIPs.has(ip)) {
        return res.status(429).json({ status: false, message: "Too many requests. IP temporary blocked." });
    }

    if (!requestLog.has(ip)) {
        requestLog.set(ip, []);
    }

    const timestamps = requestLog.get(ip);
    timestamps.push(now);

    // Filter timestamp yang lebih lama dari 1 menit
    const recentRequests = timestamps.filter(time => now - time < 60000);
    requestLog.set(ip, recentRequests);

    if (recentRequests.length > SPAM_THRESHOLD) {
        spamDetectedIPs.add(ip);
        
        console.log(chalk.bgRed.white(` SPAM DETECTED `) + ` IP: ${ip}`);
        
        sendDiscord(`⚠️ **SPAM ATTACK DETECTED**`, {
            color: 16711680,
            fields: [
                { name: "IP Address", value: `\`${ip}\``, inline: true },
                { name: "Total Requests", value: `\`${recentRequests.length} req/min\``, inline: true },
                { name: "Action", value: "Temporary Blocked (1 Min)" },
                { name: "Path", value: `\`${req.url}\`` }
            ],
            timestamp: new Date()
        });

        setTimeout(() => {
            spamDetectedIPs.delete(ip);
            requestLog.delete(ip);
        }, BAN_DURATION);

        return res.status(429).json({ status: false, message: "Spam detected. Notified to Owner." });
    }
    next();
});

app.use("/", express.static(path.join(__dirname, "api-page")));
app.use("/src", express.static(path.join(__dirname, "src")));

const openApiPath = path.join(__dirname, "src", "openapi.json");
let openApi = {};
if (fs.existsSync(openApiPath)) {
    openApi = JSON.parse(fs.readFileSync(openApiPath));
}

app.use((req, res, next) => {
    const original = res.json;
    res.json = function (data) {
        if (typeof data === "object") {
            data = { status: data.status ?? true, creator: "D2:業", ...data };
        }
        return original.call(this, data);
    };
    next();
});

const apiFolder = path.join(__dirname, "src", "api");
if (fs.existsSync(apiFolder)) {
    const categories = fs.readdirSync(apiFolder);
    categories.forEach((sub) => {
        const subPath = path.join(apiFolder, sub);
        if (fs.statSync(subPath).isDirectory()) {
            const files = fs.readdirSync(subPath);
            files.forEach((file) => {
                if (file.endsWith(".js")) {
                    try {
                        const route = require(path.join(subPath, file));
                        if (typeof route === "function") {
                            route(app);
                            console.log(chalk.bgGreen.black(` OK `) + ` ${file}`);
                        }
                    } catch (e) {
                        console.error(chalk.bgRed.white(` ERROR LOADER `) + ` ${file}: ${e.message}`);
                        sendDiscord(`❌ **Gagal Memuat API**`, {
                            title: "Loader Error",
                            description: `File: \`${file}\`\nError: \`${e.message}\``,
                            color: 16711680
                        });
                    }
                }
            });
        }
    });
}

app.post('/api/request', async (req, res) => {
    const { name, detail } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    try {
        await sendDiscord(`🚀 **NEW REQUEST**`, {
            color: 3447003,
            fields: [
                { name: "Name", value: name || "N/A", inline: true },
                { name: "Type", value: "Request", inline: true },
                { name: "IP Address", value: `||\`${ip}\`||`, inline: true },
                { name: "Detail", value: `\`\`\`\n${detail || "N/A"}\n\`\`\`` }
            ]
        });

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, description: err.message });
    }
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "api-page", "index.html")));
app.get("/docs", (req, res) => res.sendFile(path.join(__dirname, "api-page", "docs.html")));
app.get("/dev", (req, res) => res.sendFile(path.join(__dirname, "api-page", "dev.html")));
app.get("/nt", (req, res) => res.sendFile(path.join(__dirname, "api-page", "nt.html")));
app.get("/req", (req, res) => res.sendFile(path.join(__dirname, "api-page", "r.html")));
app.get("/openapi.json", (req, res) => res.sendFile(openApiPath));

app.use((err, req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.error(chalk.red(`[RuntimeError] ${req.url} - ${err.message}`));
    
    sendDiscord(`🚨 **Server Error Runtime**`, {
        color: 15105570,
        fields: [
            { name: "Path", value: `\`${req.url}\``, inline: true },
            { name: "Method", value: `\`${req.method}\``, inline: true },
            { name: "IP Address", value: `\`${ip}\``, inline: true },
            { name: "Error Message", value: `\`${err.message}\`` }
        ],
        timestamp: new Date()
    });

    res.status(500).json({ status: false, error: "Internal Server Error. Notified to Owner." });
});

app.listen(PORT, () => {
    console.log(chalk.bgCyan.black(` INFO `) + ` Server running on port ${PORT}`);
    sendDiscord("🟢 **Server Dinzo Apis Started**", {
        description: `Server successfully running on port ${PORT}`,
        color: 3066993,
        timestamp: new Date()
    });
});

module.exports = app;
