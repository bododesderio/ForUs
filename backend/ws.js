import { WebSocketServer } from 'ws';
import { handleConnection, startHeartbeat } from './services/ChatService.js';
import { logger } from './utils/logger.js';

export const attachWebSocket = (server) => {
    const wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', handleConnection);
    wss.on('error', (error) => logger.error({ error }, 'WebSocket server error'));

    startHeartbeat(wss);

    logger.info('WebSocket server attached at /ws');
    return wss;
};
