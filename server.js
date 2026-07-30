const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// 全サーバーのデータをリアルタイム保持するメモリ
let globalServers = {};

// 数値変換関数（$/s計算用）
function parseRate(str) {
    if (!str) return 0;
    const match = str.match(/(\d+(?:\.\d+)?)\s*([KMBTQa-z]*)\/s/i);
    if (!match) return 0;
    const val = parseFloat(match[1]);
    const unit = (match[2] || '').toUpperCase();
    const mult = { 'K': 1e3, 'M': 1e6, 'B': 1e9, 'T': 1e12, 'QA': 1e15, 'QI': 1e18 };
    return val * (mult[unit] || 1);
}

// 外部からデータを受信するAPIエンドポイント
app.post('/api/report', (req, res) => {
    const { jobId, players, brainrots, joinUrl } = req.body;
    if (!jobId) return res.status(400).send('No JobID');

    const maxRate = parseRate(brainrots);

    // データを更新
    globalServers[jobId] = {
        jobId,
        players: players || '0/8',
        brainrots: brainrots || '情報なし',
        joinUrl,
        maxRate,
        updatedAt: Date.now()
    };

    // 接続中の全ブラウザに即時リアルタイム配信（WebSocket）
    broadcastServerData();

    res.json({ success: true });
});

// 全ブラウザへデータを一括送信する関数
function broadcastServerData() {
    // 10分以上古いサーバーをクリーニング
    const now = Date.now();
    for (let id in globalServers) {
        if (now - globalServers[id].updatedAt > 10 * 60 * 1000) {
            delete globalServers[id];
        }
    }

    // 全サーバーを $/s の高い順にソート
    const sortedList = Object.values(globalServers).sort((a, b) => b.maxRate - a.maxRate);
    const payload = JSON.stringify(sortedList);

    // サイトを開いている全ユーザーに一斉送信
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// WebSocket接続時の処理（サイトを開いた瞬間に全データを即座に送信）
wss.on('connection', (ws) => {
    const sortedList = Object.values(globalServers).sort((a, b) => b.maxRate - a.maxRate);
    ws.send(JSON.stringify(sortedList)); // 開いた瞬間に一括プッシュ！
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
