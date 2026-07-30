// ========================================================
// 外部ツールの全サーバーデータを自サイトへ中継する処理
// ========================================================
const WebSocketClient = require('ws');

// ステップ1でコピーしたURLをここに貼り付ける
const TARGET_WS_URL = 'wss://ここにコピーしたURLを貼り付け';

function connectToDataStream() {
    const sourceWs = new WebSocketClient(TARGET_WS_URL);

    sourceWs.on('open', () => {
        console.log('データ元への接続成功！全サーバーデータの自動取得を開始します。');
    });

    sourceWs.on('message', (data) => {
        try {
            const rawServers = JSON.parse(data);

            // 届いた全サーバー情報を自分のメモリ(globalServers)に読み込む
            if (Array.isArray(rawServers)) {
                rawServers.forEach(item => {
                    globalServers[item.jobId || item.id] = {
                        jobId: item.jobId || item.id,
                        players: item.players || '0/8',
                        brainrots: item.brainrot || item.name || '検出中',
                        joinUrl: `roblox://experiences/start?placeId=12345678&gameInstanceId=${item.jobId || item.id}`,
                        maxRate: parseRate(item.incomeRate || item.rate || '0'),
                        updatedAt: Date.now()
                    };
                });

                // 自分のWebサイト（ダッシュボード）に一括プッシュ！
                broadcastServerData();
            }
        } catch (err) {
            // 単発データの形式に合わせて処理
        }
    });

    // 通信が切れたら自動で再接続
    sourceWs.on('close', () => {
        setTimeout(connectToDataStream, 3000);
    });

    sourceWs.on('error', (err) => console.error('通信エラー:', err.message));
}

// データ中継スタート
connectToDataStream();
