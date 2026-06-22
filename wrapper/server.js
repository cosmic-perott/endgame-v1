require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cookieSession = require('cookie-session');

const app = express();

app.use(express.json());

// Set up secure cookie sessions to store user tokens
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

app.get('/auth/login', (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/drive.readonly' 
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', 
        scope: scopes,
        prompt: 'consent'
    });
    res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        const userEmail = userInfo.data.email;
        const userDomain = userEmail.split('@')[1];

        if (userDomain !== process.env.SCHOOL_DOMAIN) {
            return res.status(403).send(`Access Denied: You must log in with a @${process.env.SCHOOL_DOMAIN} account.`);
        }

        req.session.tokens = tokens;
        
        res.send('Successfully authenticated! You can now use the /api/search endpoint.');
    } catch (error) {
        console.error('Authentication Error:', error);
        res.status(500).send('Authentication failed.');
    }
});

app.get('/api/search', async (req, res) => {
    const { searchTerm } = req.query;

    if (!req.session.tokens) {
        return res.status(401).send('Unauthorized: Please log in first via /auth/login');
    }

    if (!searchTerm) {
        return res.status(400).send('Missing "searchTerm" query parameter.');
    }

    try {
        const userAuth = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI);
        userAuth.setCredentials(req.session.tokens);

        const drive = google.drive({ version: 'v3', auth: userAuth });

        const searchQuery = `mimeType contains 'application/vnd.google-apps' and name contains '${searchTerm.replace(/'/g, "\\'")}' and trashed = false`;

        const response = await drive.files.list({
            corpora: 'domain',                
            supportsAllDrives: true,          
            includeItemsFromAllDrives: true, 
            q: searchQuery,
            pageSize: 20,                      
            fields: 'files(id, name, mimeType, webViewLink, owners)', 
        });

        res.json({
            success: true,
            results: response.data.files
        });

    } catch (error) {
        console.error('Google Drive API Error:', error);
        res.status(500).json({ error: 'Failed to fetch search results from Google Drive.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
