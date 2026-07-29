const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let serverList = [];

app.post('/update', (req, res) => {
    const data = req.body;
    if (data && data.jobId) {
        const index = serverList.findIndex(s => s.jobId === data.jobId);
        if (index >= 0) {
            serverList[index] = data;
        } else {
            serverList.push(data);
        }
        res.status(200).json({ success: true });
    } else {
        res.status(400).json({ error: "Invalid data" });
    }
});

app.get('/servers', (req, res) => {
    res.json(serverList);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
