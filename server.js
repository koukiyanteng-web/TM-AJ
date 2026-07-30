const express = require('express');
const app = express();
app.use(express.json());

// 各サーバーから送られてきたデータを保存するストレージ
let serverDataStore = {};

// 1. Robloxクライアントから送られてくるデータを保存
app.post('/update', (req, res) => {
    const { jobId, bestBrainrot, money, playerCount, maxPlayers } = req.body;
    if (jobId) {
        serverDataStore[jobId] = {
            jobId,
            bestBrainrot: bestBrainrot || "不明",
            money: money || "0",
            playerCount: playerCount || 1,
            maxPlayers: maxPlayers || 20,
            lastUpdated: Date.now()
        };
    }
    res.sendStatus(200);
});

// 2. サーバー一覧と蓄積データを統合して返す
app.get('/servers', async (req, res) => {
    const placeId = req.query.placeId;
    if (!placeId) return res.status(400).json({ error: "placeId is required" });

    try {
        // Node.js標準のfetchを使用（外部ライブラリ不要）
        const robloxApiUrl = `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100`;
        const response = await fetch(robloxApiUrl);
        const data = await response.json();
        const robloxServers = data.data || [];

        const mergedServers = robloxServers.map(server => {
            const stored = serverDataStore[server.id];
            return {
                jobId: server.id,
                playerCount: server.playing,
                maxPlayers: server.maxPlayers,
                bestBrainrot: stored ? stored.bestBrainrot : "データなし",
                money: stored ? stored.money : "-"
            };
        });

        res.json(mergedServers);
    } catch (error) {
        console.error("Failed to fetch:", error.message);
        const fallback = Object.values(serverDataStore);
        res.json(fallback);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
