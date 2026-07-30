const express = require('express');
const app = express();

// Railwayが動的に割り当てるポート番号（process.env.PORT）を使用
const PORT = process.env.PORT || 8080;

app.use(express.json());

// サーバー情報の一時保存用（メモリ上）
let activeServers = {};

// 15秒以上更新がない（落ちた）サーバーを自動削除
setInterval(() => {
    const now = Date.now();
    for (const jobId in activeServers) {
        if (now - activeServers[jobId].lastSeen > 15000) {
            delete activeServers[jobId];
        }
    }
}, 5000);

// Roblox（Delta）からのデータ受け取り用 API
app.post('/api/servers', (req, res) => {
    const { jobId, players, brainrot } = req.body;
    if (!jobId) {
        return res.status(400).send({ error: 'JobId is required' });
    }

    activeServers[jobId] = {
        jobId,
        players: players || [],
        brainrot: brainrot || 'Target',
        lastSeen: Date.now()
    };

    res.status(200).send({ status: 'success' });
});

// スマホブラウザ閲覧用 Web画面
app.get('/', (req, res) => {
    const placeId = "109983668079237";
    const serverListHtml = Object.values(activeServers).map(server => {
        const joinUrl = `roblox://placeID=${placeId}&gameInstanceId=${server.jobId}`;
        return `
            <div style="background: #25262b; padding: 15px; border-radius: 10px; margin-bottom: 12px; border: 1px solid #373a40;">
                <div style="font-weight: bold; color: #4dabf7; margin-bottom: 5px;">JobId: ${server.jobId.slice(0, 10)}...</div>
                <div style="font-size: 14px; color: #c1c2c5; margin-bottom: 12px; line-height: 1.5;">
                    👥 プレイヤー数: <b>${server.players.length} 人</b><br>
                    🎯 ターゲット: <b>${server.brainrot}</b>
                </div>
                <a href="${joinUrl}" style="display: block; width: 100%; text-align: center; background: #228be6; color: white; padding: 12px 0; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">参加する (Roblox起動)</a>
            </div>
        `;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Sniper</title>
        <meta http-equiv="refresh" content="5">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #1a1b1e; color: #fff; padding: 20px; margin: 0; }
            h1 { font-size: 22px; margin-bottom: 5px; text-align: center; color: #e7f5ff; }
            .status { text-align: center; font-size: 12px; color: #868e96; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <h1>🎯 Server Sniper</h1>
        <div class="status">⚡ 5秒ごとに自動更新中</div>
        ${serverListHtml.length > 0 ? serverListHtml : '<p style="text-align: center; color: #868e96; margin-top: 40px;">現在検出されたサーバーがありません。<br>Deltaでスクリプトを実行してください。</p>'}
    </body>
    </html>
    `;

    res.send(html);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
