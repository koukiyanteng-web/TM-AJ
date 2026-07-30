const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/secure', (req, res) => {
    res.status(200).json({ success: true, message: "Connected successfully" });
});

app.get('/servers', async (req, res) => {
    const placeId = req.query.placeId;
    
    if (!placeId) {
        return res.status(400).json({ error: "PlaceId is required" });
    }

    try {
        const url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Asc&limit=100`;
        const response = await fetch(url);
        const data = await response.json();
        
        // ログに出力して中身を確認できるようにする
        console.log("Roblox API Response:", JSON.stringify(data));

        const servers = data.data || [];
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
