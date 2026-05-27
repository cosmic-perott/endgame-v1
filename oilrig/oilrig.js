const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Receive data from Google Sheets
app.post('/api/sheet-webhook', (req, res) => {
    const { rows } = req.body;

    if (!rows || rows.length === 0) {
        return res.status(400).send("No data.");
    }

    console.log("Spreadsheet update received");

    // Convert sheet cells into plain arrays
    const extractedData = rows.map(row =>
        row.map(cell => cell.value)
    );

    console.log(JSON.stringify(extractedData, null, 2));

    res.status(200).json({
        success: true,
        rows: extractedData
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
