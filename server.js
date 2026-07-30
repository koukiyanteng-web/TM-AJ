const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;
const PLACE_ID = "109983668079237"; // Steal a Brainrot

app.use(express.json({ limit: '10mb' }));

// ターゲットサーバー保持用マップ
let targetServers = new Map();

// 1. スクリプトからのデータ受け取り
app.post('/api/servers', (req, res) => {
    const { jobId, brainrots, brainrot, income, playing, maxPlayers } = req.body;
    
    if (!jobId) return res.status(400).send({ error: 'JobId required' });

    let list = [];
    if (Array.isArray(brainrots)) {
        list = brainrots;
    } else if (typeof brainrots === 'string') {
        list = brainrots.split(',').map(item => item.trim());
    } else if (brainrot) {
        list = [`${brainrot} ${income || ''}`];
    }

    targetServers.set(jobId, {
        id: jobId,
        brainrots: list,
        playing: playing || 3,
        maxPlayers: maxPlayers || 8,
        createdAt: Date.now()
    });

    console.log(`[🎯 サーバー更新] ID: ${jobId} | キャラ数: ${list.length}`);
    res.status(200).send({ status: 'success' });
});

// 古くなったターゲットの自動削除（5分経過で消去）
setInterval(() => {
    const NOW = Date.now();
    for (const [id, server] of targetServers.entries()) {
        if (NOW - server.createdAt > 5 * 60 * 1000) {
            targetServers.delete(id);
        }
    }
}, 10000);

// 2. フロントエンド用 API
app.get('/api/servers-json', (req, res) => {
    const list = Array.from(targetServers.values()).sort((a, b) => b.createdAt - a.createdAt);
    res.json(list);
});

// 3. UI ダッシュボード
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brainrot Sniper UI</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #12131a; color: #fff; padding: 8px; margin: 0; }
        .header-bar { text-align: center; font-size: 13px; color: #aaa; margin-bottom: 8px; font-weight: bold; }
        .server-card { background: #1c1e28; border: 1px solid #2d3142; border-radius: 6px; padding: 10px; margin-bottom: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
        .brainrot-list { font-size: 13px; line-height: 1.45; color: #e0e0e0; font-weight: 500; margin-bottom: 12px; word-break: break-word; }
        .brainrot-item { display: inline; }
        .brainrot-item::after { content: ", "; color: #888; }
        .brainrot-item:last-child::after { content: ""; }
        .card-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .player-count { display: flex; align-items: center; gap: 6px; font-size: 26px; font-weight: 800; color: #a4b0be; white-space: nowrap; }
        .player-icon { width: 24px; height: 24px; fill: #2e86de; }
        .btn-group { display: flex; gap: 8px; }
        .btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 18px; border-radius: 6px; font-weight: 900; font-size: 20px; text-decoration: none; letter-spacing: 1px; cursor: pointer; border: none; }
        .btn-spam { background: #4b6584; color: #d1d8e0; }
        .btn-join { background: #2e86de; color: #ffffff; box-shadow: 0 0 10px rgba(46, 134, 222, 0.5); }
        .btn:active { transform: scale(0.95); }
        .empty-msg { text-align: center; color: #777; padding: 40px 10px; font-size: 13px; }
    </style>
</head>
<body>
    <div id="stats" class="header-bar">📡 ターゲット監視中...</div>
    <div id="server-list"></div>

    <script>
        const placeId = "${PLACE_ID}";

        async function updateList() {
            try {
                const res = await fetch('/api/servers-json');
                const servers = await res.json();
                
                document.getElementById('stats').innerText = '🎯 検出中サーバー: ' + servers.length + ' 件';
                
                const container = document.getElementById('server-list');
                if (servers.length === 0) {
                    container.innerHTML = '<div class="empty-msg">🧠 ターゲットデータ受信待機中...</div>';
                    return;
                }

                let html = '';
                servers.forEach(s => {
                    const joinUrl = 'roblox://placeID=' + placeId + '&gameInstanceId=' + s.id;
                    
                    let itemsHtml = '';
                    if (s.brainrots && s.brainrots.length > 0) {
                        itemsHtml = s.brainrots.map(item => '<span class="brainrot-item">' + item + '</span>').join('');
                    } else {
                        itemsHtml = '<span class="brainrot-item">🔥 激レアターゲット検出</span>';
                    }

                    html += '<div class="server-card">' +
                        '<div class="brainrot-list">' + itemsHtml + '</div>' +
                        '<div class="card-bottom">' +
                            '<div class="player-count">' +
                                '<svg class="player-icon" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>' +
                                s.playing + '/' + s.maxPlayers +
                            '</div>' +
                            '<div class="btn-group">' +
                                '<a href="' + joinUrl + '" class="btn btn-spam">SPAM</a>' +
                                '<a href="' + joinUrl + '" class="btn btn-join">JOIN</a>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                });
                container.innerHTML = html;
            } catch (e) {
                console.error(e);
            }
        }

        setInterval(updateList, 500);
        updateList();
    </script>
</body>
</html>`);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Brainrot Sniper UI running on port ${PORT}`);
});
