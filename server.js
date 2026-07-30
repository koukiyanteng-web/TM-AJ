const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// サーバー情報を保存しておくメモリ上のストレージ
let servers = {};

// Robloxからのデータ受信 (POST)
app.post('/api/servers', (req, res) => {
    const { jobId, players, brainrot } = req.body;
    if (!jobId) {
        return res.status(400).json({ error: 'JobId is required' });
    }

    servers[jobId] = {
        jobId,
        players: players || [],
        brainrot: brainrot || 'Unknown',
        lastUpdated: Date.now()
    };

    // 古いサーバー情報（30秒以上更新がないもの）を削除
    const now = Date.now();
    for (const id in servers) {
        if (now - servers[id].lastUpdated > 30000) {
            delete servers[id];
        }
    }

    res.status(200).json({ success: true });
});

// スマホ向けウェブUIの表示 (GET)
app.get('/', (req, res) => {
    let serverListHTML = '';
    
    const serverEntries = Object.values(servers);
    if (serverEntries.length === 0) {
        serverListHTML = `<p style="color: #888; text-align: center;">現在アクティブなサーバーがありません。Robloxでスクリプトを実行してください。</p>`;
    } else {
        serverEntries.forEach(server => {
            // Robloxを直接起動するカスタムスキームURL
            const joinUrl = `roblox://placeId=109983668079237&linkCode=${server.jobId}`;
            
            serverListHTML += `
                <div style="background: #1e1e2f; border: 1px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <p style="margin: 0 0 5px 0; color: #aaa; font-size: 12px;">JobId: ${server.jobId}</p>
                    <p style="margin: 0 0 10px 0; color: #fff; font-size: 14px;"><strong>ステータス:</strong> ${server.brainrot}</p>
                    <p style="margin: 0 0 10px 0; color: #ddd; font-size: 13px;"><strong>プレイヤー (${server.players.length}人):</strong> ${server.players.join(', ')}</p>
                    <a href="${joinUrl}" style="display: block; background: #4f46e5; color: #fff; text-align: center; padding: 10px; border-radius: 5px; text-decoration: none; font-weight: bold;">このサーバーに参加する</a>
                </div>
            `;
        });
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Steal a Brainrot - Server Sniper</title>
            <meta http-equiv="refresh" content="5"> <!-- 5秒ごとに自動更新 -->
        </head>
        <body style="font-family: sans-serif; background: #121216; color: #fff; padding: 20px; margin: 0;">
            <h2 style="text-align: center; color: #a78bfa;">🎯 Server Sniper</h2>
            <p style="text-align: center; color: #888; font-size: 12px;">5秒ごとに自動更新されます</p>
            <div style="max-width: 600px; margin: 0 auto;">
                ${serverListHTML}
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
