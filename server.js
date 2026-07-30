const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// 各サーバーから送られてきたデータを保存するメモリ上のストレージ
// { "jobId": { bestBrainrot: "...", money: "...", playerCount: X, maxPlayers: Y } }
let serverDataStore = {};

// 1. Robloxクライアントから定期的に送られてくるデータを保存
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

// 2. Robloxクライアント（UI）からのリクエストに対し、実際の全サーバー一覧と蓄積データを統合して返す
app.get('/servers', async (req, res) => {
    const placeId = req.query.placeId;
    if (!placeId) return res.status(400).json({ error: "placeId is required" });

    try {
        // Roblox公式の公開サーバーリストAPIを叩いて、現在の実際の全サーバーを取得
        const robloxApiUrl = `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100`;
        const response = await axios.get(robloxApiUrl);
        const robloxServers = response.data.data || [];

        // 公式のサーバーリストと、私たちが集めた詳細データを合体させる
        const mergedServers = robloxServers.map(server => {
            const stored = serverDataStore[server.id];
            return {
                jobId: server.id,
                playerCount: server.playing,
                maxPlayers: server.maxPlayers,
                // データがあればそれを使い、なければ「データなし」とする
                bestBrainrot: stored ? stored.bestBrainrot : "データなし",
                money: stored ? stored.money : "-"
            };
        });

        res.json(mergedServers);
    } catch (error) {
        console.error("Failed to fetch Roblox servers:", error.message);
        // 万が一公式API制限等で失敗した場合は、手元にあるデータだけでも返す
        const fallback = Object.values(serverDataStore);
        res.json(fallback);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
