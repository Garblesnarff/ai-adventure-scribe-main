import 'dotenv/config';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createClient } from './lib/db';
import { createApp } from './app';
import { registerWebsocketHandlers } from './ws';
import bffWebSocketManager from './bff/websocket/websocket-manager';
import { shutdownBFF } from './routes/bff';

// Database
const pool = createClient();
const app = createApp(pool);

// HTTP server + WebSocket
const server = http.createServer(app);

// Original WebSocket server for existing functionality
const wss = new WebSocketServer({ server, path: '/ws' });
registerWebsocketHandlers(wss, pool);

// BFF WebSocket server for React-optimized real-time features
bffWebSocketManager.initialize(server);

const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => {
  console.log(`🚀 API listening on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket endpoints:`);
  console.log(`   - Original: ws://localhost:${PORT}/ws`);
  console.log(`   - BFF: ws://localhost:${PORT}/bff/ws`);
  console.log(`📡 Server-Sent Events: http://localhost:${PORT}/bff/streaming-chat/stream/`);
  console.log(`🎯 BFF Health Check: http://localhost:${PORT}/bff/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  shutdownBFF();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  shutdownBFF();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

