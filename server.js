const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// JSONデータを正しく受け取るための設定
app.use(express.json());

// サーバー情報を保持するメモリ上のストレージ（簡易DB代わり）
// キー: jobId, 値: { jobId, bestBrainrot, money, playerCount, maxPlayers, lastUpdated }
const serversMap = new Map();

// 古くなったサーバー情報を自動で削除する（例: 30秒以上更新がないものは消す）
setInterval(() => {
    const now = Date.now();
    for (const [jobId, data] of serversMap.entries()) {
        if (now - data.lastUpdated > 30000) {
            serversMap.delete(jobId);
        }
    }
}, 10000);

// 1. ゲーム内サーバーから定期的にデータを受け取るエンドポイント (POST /update)
app.post('/update', (req, res) => {
    const { jobId, bestBrainrot, money, playerCount, maxPlayers } = req.body;

    if (!jobId) {
        return res.status(400).json({ error: 'jobId is required' });
    }

    // データを保存（更新日時も一緒に記録）
    serversMap.set(jobId, {
        jobId,
        bestBrainrot: bestBrainrot || 'Unknown',
        money: money || '0',
        playerCount: Number(playerCount) || 0,
        maxPlayers: Number(maxPlayers) || 20,
        lastUpdated: Date.now()
    });

    res.status(200).json({ success: true });
});

// 2. ブラウザやUI側へ「空っぽじゃないサーバー」のリストを返すエンドポイント (GET /servers)
app.get('/servers', (req, res) => {
    const activeServers = [];

    for (const data of serversMap.values()) {
        // 条件：空っぽじゃない（プレイヤーが1人以上いる）サーバーのみ抽出
        if (data.playerCount > 0) {
            activeServers.push({
                jobId: data.jobId,
                bestBrainrot: data.bestBrainrot,
                money: data.money,
                playerCount: data.playerCount,
                maxPlayers: data.maxPlayers
            });
        }
    }

    // 稼ぎ額やプレイヤー数などで並び替えたい場合はここで調整可能
    res.json(activeServers);
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
