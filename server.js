const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;
const PLACE_ID = "109983668079237"; // Steal a Brainrot

app.use(express.json());

// 全サーバー保持用
let serverMap = new Map();

// 1. Roblox公式APIを極限のスピードでバックグラウンドスキャン
async function scanAllPublicServers() {
    try {
        let cursor = "";
        const maxPages = 3; // スキャン速度優先で上位300サーバーに絞り込み
        const currentBatch = new Map();

        for (let i = 0; i < maxPages; i++) {
            const url = `https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?limit=100${cursor ? `&cursor=${cursor}` : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) break;

            const data = await response.json();
            if (data.data && data.data.length > 0) {
                data.data.forEach(s => {
                    const existing = serverMap.get(s.id);
                    currentBatch.set(s.id, {
                        id: s.id,
                        playing: s.playing,
                        maxPlayers: s.maxPlayers,
                        ping: s.ping || 'N/A',
                        brainrot: existing ? existing.brainrot : null, // 条件一致データ
                        income: existing ? existing.income : null,
                        isTarget: existing ? existing.isTarget : false, // ターゲットフラグ
                        lastSeen: Date.now()
                    });
                });
            }

            if (data.nextPageCursor) {
                cursor = data.nextPageCursor;
            } else {
                break;
            }
        }

        serverMap = currentBatch;
    } catch (e) {
        console.error("スキャンエラー:", e);
    }
}

// バックグラウンドで1.5秒ごとに全サーバー最新化
setInterval(scanAllPublicServers, 1500);
scanAllPublicServers();

// 2. Luaスクリプトから条件一致（激レア発見）の通知をミリ秒で受領
app.post('/api/servers', (req, res) => {
    const { jobId, brainrot, income } = req.body;
    if (!jobId) return res.status(400).send({ error: 'JobId required' });

    const serverData = {
        id: jobId,
        playing: req.body.playing || 1,
        maxPlayers: 12,
        ping: 'FAST',
        brainrot: brainrot || '🔥 レアターゲット発見！',
        income: income || '高収益',
        isTarget: true, // 最優先ターゲットとしてフラグON
        lastSeen: Date.now()
    };

    // 即座にメモリの先頭へセット
    serverMap.set(jobId, serverData);
    res.status(200).send({ status: 'success' });
});

// フロントエンド用 JSON（ターゲット検知済みサーバーを最優先で最上部にソート）
app.get('/api/servers-json', (req, res) => {
    const list = Array.from(serverMap.values()).sort((a, b) => {
        // 条件に合ったターゲット（isTarget）を一番上に強制配置！
        if (a.isTarget && !b.isTarget) return -1;
        if (!a.isTarget && b.isTarget) return 1;
        // 次に空きプレイヤー数順
        return a.playing - b.playing;
    });
    res.json(list);
});

// スマホ用ダッシュボード UI (0.3秒超高速リフレッシュ)
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Sniper - Ultra Fast</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0b0e; color: #fff; padding: 10px; margin: 0; }
            h1 { font-size: 18px; text-align: center; color: #ff4757; margin: 5px 0 2px 0; text-transform: uppercase; letter-spacing: 1px; }
            .subtitle { font-size: 10px; text-align: center; color: #ffa502; margin-bottom: 10px; font-weight: bold; }
            .stats-bar { background: #1e1f29; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 10px; color: #2ed573; border: 1px solid #2f3542; }
            
            .server-card { background: #14151d; padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #2f3542; display: flex; justify-content: space-between; align-items: center; }
            
            /* 条件に一致した「当たりサーバー」の極太警告スタイル */
            .server-card.target { background: #2f1215; border: 2px solid #ff4757; box-shadow: 0 0 10px rgba(255, 71, 87, 0.5); animation: pulse 1s infinite alternate; }
            @keyframes pulse { from { border-color: #ff4757; } to { border-color: #ffa502; } }
            
            .server-info { font-size: 12px; line-height: 1.4; }
            .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #2f3542; color: #eccc68; }
            .badge-target { background: #ff4757; color: #fff; font-size: 11px; }
            
            .join-btn { background: #2e86de; color: white; padding: 10px 14px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; white-space: nowrap; }
            .target .join-btn { background: #ff4757; font-size: 14px; padding: 12px 16px; box-shadow: 0 0 8px #ff4757; }
            .join-btn:active { transform: scale(0.95); }
        </style>
    </head>
    <body>
        <h1>🔥 Ultra Sniper</h1>
        <div class="subtitle">⚡ 0.3秒超高速モニタリング中</div>
        
        <div id="stats" class="stats-bar">📡 高速スキャン準備中...</div>
        <div id="server-list"></div>

        <script>
            const placeId = "${PLACE_ID}";

            async function updateList() {
                try {
                    const res = await fetch('/api/servers-json');
                    const servers = await res.json();
                    
                    const targetCount = servers.filter(s => s.isTarget).length;
                    document.getElementById('stats').innerHTML = '⚡ 監視サーバー: ' + servers.length + ' 件 | <span style="color:#ff4757;">🎯 確定ターゲット: ' + targetCount + ' 件</span>';
                    
                    const container = document.getElementById('server-list');
                    let html = '';

                    servers.forEach(s => {
                        const joinUrl = 'roblox://placeID=' + placeId + '&gameInstanceId=' + s.id;
                        const cardClass = s.isTarget ? 'server-card target' : 'server-card';
                        const badgeHtml = s.isTarget 
                            ? '<span class="badge badge-target">🎯 条件達成: ' + (s.brainrot || '激レア') + '</span>' 
                            : '<span class="badge">👥 ' + s.playing + '/' + s.maxPlayers + '人</span>';

                        html += \`
                            <div class="\${cardClass}">
                                <div class="server-info">
                                    \${badgeHtml}<br>
                                    <span style="color: #a4b0be; font-size: 10px;">ID: \${s.id.slice(0,8)}...</span>
                                </div>
                                <a href="\${joinUrl}" class="join-btn">\${s.isTarget ? '🚨 即突入！' : '参加'}</a>
                            </div>
                        \`;
                    });
                    container.innerHTML = html;
                } catch (e) {
                    console.error(e);
                }
            }

            // 0.3秒（300ミリ秒）ごとに画面を超爆速更新
            setInterval(updateList, 300);
            updateList();
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ultra Fast Server running on port ${PORT}`);
});
