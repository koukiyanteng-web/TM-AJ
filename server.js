const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/secure', (req, res) => {
    res.status(200).json({ success: true, message: "Connected successfully" });
});

app.get('/servers', async (req, res) => {
    let placeId = req.query.placeId;
    
    if (!placeId) {
        return res.status(400).json({ error: "PlaceId is required" });
    }

    try {
        // 1. まずPlaceIdからUniverseId（RootPlaceId）を特定する、または直接APIを叩く
        let targetPlaceId = placeId;
        
        // RobloxのゲームAPIからサーバー一覧を取得
        const url = `https://games.roblox.com/v1/games/${targetPlaceId}/servers/Public?sortOrder=Asc&limit=100`;
        const response = await fetch(url);
        const data = await response.json();

        let servers = data.data || [];

        // もしサーバーが空の場合、PlaceIdからUniverseIDを逆引きして再トライする仕組み
        if (servers.length === 0) {
            try {
                const infoRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
                const infoData = await infoRes.json();
                if (infoData && infoData.universeId) {
                    // ユニバースIDからルートプレイスを取得するか、別ルートを試す
                    const univUrl = `https://games.roblox.com/v1/games/${infoData.universeId}/servers/Public?sortOrder=Asc&limit=100`;
                    const univRes = await fetch(univUrl);
                    const univData = await univRes.json();
                    servers = univData.data || [];
                }
            } catch (e) {
                console.log("Universe lookup failed:", e.message);
            }
        }

        const serverList = servers.map(server => ({
            jobId: server.id,
            playerCount: server.playing,
            maxPlayers: server.maxPlayers
        }));

        res.json(serverList);
    } catch (error) {
        console.error("Error fetching servers:", error);
        res.status(500).json({ error: "Failed to fetch servers", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
