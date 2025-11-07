import 'dotenv/config';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createApp } from './app.js';
import { registerWebsocketHandlers } from './ws.js';
import { validateEnvironmentOrExit } from './utils/validate-env.js';

// SECURITY: Validate all required environment variables before starting server
// This prevents the application from starting with missing critical configuration
validateEnvironmentOrExit(process.env.NODE_ENV === 'production');

const app = createApp();

// HTTP server + WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
registerWebsocketHandlers(wss);

const PORT = Number(process.env.PORT || 8888);
server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
