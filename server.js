const express = require('express');
const app = express();

app.use(express.json());

let targetServers = [];

app.get('/api/servers', (req, res) => {
    res.json(targetServers);
});

app.post('/api/servers', (req, res) => {
    const { jobId, item, owner } = req.body;
    
    if (jobId) {
        targetServers.unshift({
            jobId: jobId,
            item: item || "Unknown",
            owner: owner || "Unknown",
            time: new Date().toISOString()
        });
        
        if (targetServers.length > 30) targetServers.pop();
        return res.json({ status: "success", message: "Data added" });
    }
    res.status(400).json({ status: "error", message: "Invalid jobId" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
