const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Fetch error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch video',
            details: error.message 
        });
    }
});

// Proxy download endpoint - FIXED for YouTube
app.get('/api/proxy-download', async (req, res) => {
    const videoUrl = req.query.url;
    
    if (!videoUrl) {
        return res.status(400).json({ error: 'Video URL required' });
    }

    try {
        console.log('Downloading video from:', videoUrl.substring(0, 100) + '...');
        
        // Detect platform
        const isInstagram = videoUrl.includes('cdninstagram.com') || videoUrl.includes('instagram.f');
        const isYouTube = videoUrl.includes('googlevideo.com') || videoUrl.includes('youtube.com');
        
        // Headers for request
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Range': 'bytes=0-'
        };
        
        if (isYouTube) {
            headers['Referer'] = 'https://www.youtube.com/';
            headers['Origin'] = 'https://www.youtube.com';
        }
        
        if (isInstagram) {
            headers['Referer'] = 'https://www.instagram.com/';
            headers['Origin'] = 'https://www.instagram.com';
        }
        
        // Make request to get video
        const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            headers: headers,
            timeout: 120000,
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });
        
        // Get content type
        const contentType = response.headers['content-type'] || 'video/mp4';
        
        // Generate filename
        let filename = 'video.mp4';
        if (isYouTube) {
            filename = `youtube_video_${Date.now()}.mp4`;
        } else if (isInstagram) {
            filename = `instagram_video_${Date.now()}.mp4`;
        }
        
        // Get content length if available
        const contentLength = response.headers['content-length'];
        
        // Set response headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }
        
        // Pipe the video stream to response
        await streamPipeline(response.data, res);
        
        console.log(`Video downloaded successfully: ${filename}`);
        
    } catch (error) {
        console.error('Proxy download error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Failed to download video',
                details: error.message 
            });
        }
    }
});

// Alternative direct download for YouTube (bypasses proxy issues)
app.get('/api/youtube-direct', async (req, res) => {
    const videoUrl = req.query.url;
    
    if (!videoUrl) {
        return res.status(400).json({ error: 'Video URL required' });
    }
    
    try {
        // Fetch video info first to get the best quality
        const apiUrl = `https://sexmy-downloader.noobgamingv40.workers.dev/api/parse?url=${encodeURIComponent(videoUrl)}`;
        const infoResponse = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (infoResponse.data.status === 1 && infoResponse.data.data) {
            const data = infoResponse.data.data;
            const videoMedia = data.media?.find(m => m.type === 'video');
            
            if (videoMedia && videoMedia.resources && videoMedia.resources.length > 0) {
                // Get the highest quality video URL
                const downloadUrl = videoMedia.resources[0].download_url;
                
                // Redirect to the actual video URL (browser will handle download)
                return res.redirect(downloadUrl);
            }
        }
        
        res.status(404).json({ error: 'No video found' });
    } catch (error) {
        console.error('YouTube direct error:', error.message);
        res.status(500).json({ error: 'Failed to get video' });
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
