const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for video info
app.get('/api/download', async (req, res) => {
    const url = req.query.url;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const apiUrl = `https://sexmy-downloader.noobgamingv40.workers.dev/api/parse?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Download error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch video',
            details: error.message 
        });
    }
});

// Proxy download endpoint (works for both Instagram & YouTube)
app.get('/api/proxy-download', async (req, res) => {
    const videoUrl = req.query.url;
    
    if (!videoUrl) {
        return res.status(400).json({ error: 'Video URL required' });
    }

    try {
        // Detect platform from URL or headers
        const isInstagram = videoUrl.includes('cdninstagram.com') || videoUrl.includes('instagram.com');
        const isYouTube = videoUrl.includes('googlevideo.com') || videoUrl.includes('youtube.com');
        
        // Set appropriate headers based on platform
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        
        if (isYouTube) {
            headers['Referer'] = 'https://www.youtube.com/';
            headers['Origin'] = 'https://www.youtube.com';
        }
        
        if (isInstagram) {
            headers['Referer'] = 'https://www.instagram.com/';
            headers['Origin'] = 'https://www.instagram.com';
        }
        
        const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            headers: headers,
            timeout: 60000,
            maxRedirects: 5,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        // Generate filename
        let filename = isInstagram ? 'instagram_video.mp4' : 'youtube_video.mp4';
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition && contentDisposition.includes('filename=')) {
            filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
        }

        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
        res.setHeader('Cache-Control', 'no-cache');
        
        // Pipe the video stream to response
        response.data.pipe(res);
        
    } catch (error) {
        console.error('Proxy download error:', error.message);
        res.status(500).json({ error: 'Failed to download video' });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Open: http://localhost:${PORT}`);
});

module.exports = app;
