import 'dotenv/config';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createClient } from './lib/db.js';
import { createApp } from './app.js';
import { registerWebsocketHandlers } from './ws.js';

// Database
const pool = createClient();
const app = createApp(pool);

// HTTP server + WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
registerWebsocketHandlers(wss, pool);

const PORT = Number(process.env.PORT || 8888);
server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
