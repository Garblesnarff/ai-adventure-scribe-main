import 'dotenv/config';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createApp } from './app.js';
import { registerWebsocketHandlers } from './ws.js';

const app = createApp();

// HTTP server + WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
registerWebsocketHandlers(wss);

const PORT = Number(process.env.PORT || 8888);
server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
