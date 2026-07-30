const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let serverList = [];

// データを追加・更新するルート
app.post('/update', (req, res) => {
    const data = req.body;
    
    // 配列（複数人）で送られてきても、単体で送られてきても処理できるようにする
    const updates = Array.isArray(data) ? data : [data];

    updates.forEach(item => {
        if (item && item.jobId) {
            item.lastUpdated = Date.now(); // 新しく「更新時間」を記録する
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

// データを取得するルート（ここで古いゴミデータを掃除する）
app.get('/servers', (req, res) => {
    const now = Date.now();
    // 最終更新から「3分（180,000ミリ秒）」以上経っている古いデータを自動削除
    serverList = serverList.filter(s => now - s.lastUpdated < 180000);
    
    res.json(serverList);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
