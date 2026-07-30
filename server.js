const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;
const PLACE_ID = "109983668079237"; // Steal a Brainrot

app.use(express.json());

// 確定ターゲットサーバーだけを保持するマップ
let targetServers = new Map();

// 1. Luaスクリプト（Delta）から激レアブレインロットの通知を受け取る
app.post('/api/servers', (req, res) => {
    const { jobId, brainrot, income, playing } = req.body;
    
    if (!jobId) return res.status(400).send({ error: 'JobId required' });

    // 届いたデータを確定ターゲットとして保存
    targetServers.set(jobId, {
        id: jobId,
        brainrot: brainrot || '🔥 激レアブレインロット',
        income: income || '高収益',
        playing: playing || '1',
        createdAt: Date.now()
    });

    console.log(`[🎯 ターゲット検知] ID: ${jobId} | ブレインロット: ${brainrot} | 収益: ${income}`);
    res.status(200).send({ status: 'success' });
});

// 定期クリーンアップ：5分以上経った古いターゲットは自動削除（満員・移動済み対策）
setInterval(() => {
    const NOW = Date.now();
    for (const [id, server] of targetServers.entries()) {
        if (NOW - server.createdAt > 5 * 60 * 1000) {
            targetServers.delete(id);
        }
    }
}, 10000);

// 2. フロントエンド用 JSON（ターゲットのみ返却）
app.get('/api/servers-json', (req, res) => {
    // 新しい順（最新見つけた順）に並べて返却
    const list = Array.from(targetServers.values()).sort((a, b) => b.createdAt - a.createdAt);
    res.json(list);
});

// 3. スマホ用 確定スナイパーダッシュボード UI
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Brainrot Sniper - Target Only</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0b0e; color: #fff; padding: 12px; margin: 0; }
            h1 { font-size: 20px; text-align: center; color: #ff4757; margin: 5px 0 2px 0; text-transform: uppercase; letter-spacing: 1px; }
            .subtitle { font-size: 11px; text-align: center; color: #ffa502; margin-bottom: 12px; font-weight: bold; }
            
            .stats-bar { background: #1e1f29; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 12px; color: #ff4757; border: 1px solid #ff4757; box-shadow: 0 0 10px rgba(255,71,87,0.2); }
            
            .server-card { background: #2f1215; padding: 14px; border-radius: 10px; margin-bottom: 10px; border: 2px solid #ff4757; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 0 12px rgba(255, 71, 87, 0.4); animation: pulse 1.2s infinite alternate; }
            @keyframes pulse { from { border-color: #ff4757; box-shadow: 0 0 8px rgba(255, 71, 87, 0.4); } to { border-color: #ffa502; box-shadow: 0 0 16px rgba(255, 165, 2, 0.7); } }
            
            .server-info { font-size: 13px; line-height: 1.5; }
            .brainrot-title { font-size: 15px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #ff4757; margin-bottom: 2px; }
            .income-text { font-size: 12px; color: #2ed573; font-weight: bold; }
            .meta-text { font-size: 10px; color: #a4b0be; margin-top: 4px; }
            
            .join-btn { background: #ff4757; color: white; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; white-space: nowrap; box-shadow: 0 0 10px #ff4757; }
            .join-btn:active { transform: scale(0.92); }
            
            .empty-state { text-align: center; padding: 40px 20px; color: #747d8c; font-size: 13px; line-height: 1.6; }
        </style>
    </head>
    <body>
        <h1>🎯 Brainrot Sniper</h1>
        <div class="subtitle">⚡ 激レア・高収益ターゲット自動検知中</div>
        
        <div id="stats" class="stats-bar">📡 ターゲット監視中...</div>
        <div id="server-list"></div>

        <script>
            const placeId = "${PLACE_ID}";

            async function updateList() {
                try {
                    const res = await fetch('/api/servers-json');
                    const servers = await res.json();
                    
                    document.getElementById('stats').innerHTML = '🎯 検出中の確定ターゲット: <span style="font-size:16px;">' + servers.length + '</span> 件';
                    
                    const container = document.getElementById('server-list');
                    
                    if (servers.length === 0) {
                        container.innerHTML = '<div class="empty-state">🧠 現在、条件に合うターゲットはありません。<br>Deltaでスクリプトを実行して放置してください...</div>';
                        return;
                    }

                    let html = '';
                    servers.forEach(s => {
                        const joinUrl = 'roblox://placeID=' + placeId + '&gameInstanceId=' + s.id;
                        
                        html += \`
                            <div class="server-card">
                                <div class="server-info">
                                    <div class="brainrot-title">🧠 \${s.brainrot}</div>
                                    <div class="income-text">💰 収益: \${s.income}</div>
                                    <div class="meta-text">👥 検出時人数: \${s.playing}人 | ID: \${s.id.slice(0,8)}...</div>
                                </div>
                                <a href="\${joinUrl}" class="join-btn">🚨 即突入！</a>
                            </div>
                        \`;
                    });
                    container.innerHTML = html;
                } catch (e) {
                    console.error(e);
                }
            }

            // 0.3秒間隔で超高速更新
            setInterval(updateList, 300);
            updateList();
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Target-Only Sniper Server running on port ${PORT}`);
});
