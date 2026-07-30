const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let serverList = [];

// Roblox側がアクセスしている /secure ルートを追加
app.get('/secure', (req, res) => {
    res.status(200).json({ success: true, message: "Connected successfully" });
});

// データを追加・更新するルート
app.post('/update', (req, res) => {
    const data = req.body;
    const updates = Array.isArray(data) ? data : [data];

    updates.forEach(item => {
        if (item && item.jobId) {
            item.lastUpdated = Date.now();
            const index = serverList.findIndex(s => s.jobId === item.jobId);
            if (index >= 0) {
                serverList[index] = item;
            } else {
                serverList.push(item);
            }
        }
    });

    res.status(200).json({ success: true });
});

// データを取得するルート
app.get('/servers', (req, res) => {
    const now = Date.now();
    serverList = serverList.filter(s => now - s.lastUpdated < 180000);
    res.json(serverList);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
