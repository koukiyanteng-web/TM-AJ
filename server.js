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
        let servers = [];

        // 1. まず通常のプレイスIDでサーバー一覧を取得してみる
        const url1 = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Asc&limit=100`;
        const res1 = await fetch(url1, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        const data1 = await res1.json();
        if (data1 && data1.data) {
            servers = data1.data;
        }

        // 2. それでも空の場合は、プレイスIDからUniverse IDに変換して再取得を試す
        if (servers.length === 0) {
            const infoRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`, {
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            });
            const infoData = await infoRes.json();
            if (infoData && infoData.universeId) {
                const url2 = `https://games.roblox.com/v1/games/${infoData.universeId}/servers/Public?sortOrder=Asc&limit=100`;
                const res2 = await fetch(url2, {
                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    }
                });
                const data2 = await res2.json();
                if (data2 && data2.data) {
                    servers = data2.data;
                }
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
