const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// JSONデータを受け取れるようにする
app.use(express.json());

// サーバー情報を保存するメモリ上の配列
let servers = [];

// 1. データを送信する用（POST): ゲーム側からサーバー情報を受け取る
app.post('/api/servers', (req, res) => {
    const { jobId, players, brainrot } = req.body;
    
    if (!jobId) {
        return res.status(400).json({ error: 'JobId is required' });
    }

    // 既に同じJobIdがあれば更新、なければ追加
    const existingIndex = servers.findIndex(s => s.jobId === jobId);
    const serverData = {
        jobId,
        players: players || [],
        brainrot: brainrot || 'Unknown',
        lastUpdated: Date.now()
    };

    if (existingIndex >= 0) {
        servers[existingIndex] = serverData;
    } else {
        servers.push(serverData);
    }

    // 古いデータ（5分以上更新がないもの）を自動削除
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    servers = servers.filter(s => s.lastUpdated > fiveMinutesAgo);

    res.json({ success: true, message: 'Server data updated', total: servers.length });
});

// 2. スマホ画面用（GET): 保存されているサーバーの一覧をHTMLで表示する
app.get('/', (req, res) => {
    let html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Steal a Brainrot - Server Sniper</title>
            <style>
                body { font-family: sans-serif; background: #121212; color: #fff; padding: 20px; }
                h1 { color: #00ffcc; font-size: 1.5rem; }
                .card { background: #1e1e1e; padding: 15px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #333; }
                .btn { display: inline-block; background: #00ffcc; color: #000; padding: 10px 15px; text-decoration: none; font-weight: bold; border-radius: 5px; margin-top: 10px; }
                .info { font-size: 0.9rem; color: #aaa; margin: 5px 0; }
            </style>
        </head>
        <body>
            <h1>Server Sniper / List</h1>
            <p>アクティブなサーバー数: ${servers.length}</p>
    `;

    if (servers.length === 0) {
        html += `<p>現在アクティブなサーバーはありません。ゲーム側からデータを送信してください。</p>`;
    } else {
        servers.forEach(s => {
            // Robloxのプロトコルリンク（タップするとRobloxアプリが起動してそのJobIdに飛ぶ仕組みなどに応用可能）
            // 例: roblox://experiences/start?placeId=PLACE_ID&gameInstanceId=JOB_ID
            html += `
                <div class="card">
                    <div class="info"><strong>ブレインロット:</strong> ${s.brainrot}</div>
                    <div class="info"><strong>プレイヤー数:</strong> ${s.players.length}人</div>
                    <div class="info"><strong>JobId:</strong> ${s.jobId}</div>
                    <a class="btn" href="roblox://experiences/start?placeId=YOUR_PLACE_ID&gameInstanceId=${s.jobId}">このサーバーに参加する</a>
                </div>
            `;
        });
    }

    html += `
        </body>
        </html>
    `;
    res.send(html);
});

// 3. APIとしてJSONでサーバーリストが欲しい用（GET）
app.get('/api/servers', (req, res) => {
    res.json(servers);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
