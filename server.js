const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// サーバーごとの稼ぎ額やブレインロットのデータを一時保存するメモリ
let serverDataStore = {};

app.get('/secure', (req, res) => {
    res.status(200).json({ success: true, message: "Connected successfully" });
});

// Roblox側から「今のサーバーのデータ」を受け取るエンドポイント (POST)
app.post('/update', (req, res) => {
    const { jobId, bestBrainrot, money } = req.body;
    if (!jobId) {
        return res.status(400).json({ error: "jobId is required" });
    }

    serverDataStore[jobId] = {
        bestBrainrot: bestBrainrot || "不明",
        money: money || "不明",
        updatedAt: Date.now()
    };

    res.json({ success: true });
});

// リスト表示用エンドポイント (GET)
app.get('/servers', async (req, res) => {
    let placeId = req.query.placeId;
    
    if (!placeId) {
        return res.status(400).json({ error: "PlaceId is required" });
    }

    try {
        let servers = [];

        // 1. Roblox公式からサーバー一覧を取得
        const url1 = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Asc&limit=100`;
        const res1 = await fetch(url1, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        });
        const data1 = await res1.json();
        if (data1 && data1.data) {
            servers = data1.data;
        }

        // 2. 取得したサーバー情報に、保存されている稼ぎデータ等を合体させる
        const serverList = servers.map(server => {
            const extraData = serverDataStore[server.id] || { bestBrainrot: "データなし", money: "データなし" };
            return {
                jobId: server.id,
                playerCount: server.playing,
                maxPlayers: server.maxPlayers,
                bestBrainrot: extraData.bestBrainrot,
                money: extraData.money
            };
        });

        res.json(serverList);
    } catch (error) {
        console.error("Error fetching servers:", error);
        res.status(500).json({ error: "Failed to fetch servers", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
