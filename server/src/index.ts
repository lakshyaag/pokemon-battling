import express from 'express';
import { createServer } from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import path from 'path';
import { SocketHandler } from './websocket/SocketHandler';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    stats: socketHandler.getStats()
  });
});

app.get('/api/stats', (req, res) => {
  res.json(socketHandler.getStats());
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// WebSocket Setup
const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

const socketHandler = new SocketHandler();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection from:', req.socket.remoteAddress);
  socketHandler.handleConnection(ws);
});

// Error handling
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Start server
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Pokemon Battle Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🎮 Development mode - Client should run on port 3000`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
