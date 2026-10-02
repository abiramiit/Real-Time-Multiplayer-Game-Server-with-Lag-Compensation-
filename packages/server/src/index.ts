import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import { ClientMessageType, ServerMessageType, ClientMessageSchema } from 'shared';
import type { ClientMessage } from 'shared';
import { redisManager, RedisEventType } from './redis/RedisManager';
import { CoreRoom } from './logic/CoreRoom';
import { logger } from './utils/logger';
import { telemetry } from './utils/MetricsManager';

import http from 'http';

const PORT = parseInt(process.env.PORT || "8080", 10);
const SERVER_ID = process.env.SERVER_ID || `server-${PORT}-${Math.random().toString(36).substring(7)}`;

telemetry.init(SERVER_ID);

const server = http.createServer((req, res) => {
    console.log(`[HTTP] Incoming request: ${req.method} ${req.url}`);
    if (req.method === 'GET' && req.url === '/') {
        console.log(`[HTTP] Responding 200 OK`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'multiplayer-server' }));
    } else {
        console.log(`[HTTP] Responding 404`);
        res.writeHead(404);
        res.end();
    }
});

const wss = new WebSocketServer({ server });
const activeRooms: Map<string, CoreRoom> = new Map();
const proxyConnections: Map<string, WebSocket[]> = new Map();
const wsRttMap: Map<WebSocket, number> = new Map();
interface Session {
    playerId: string;
    roomId: string;
    state: 'ACTIVE' | 'DISCONNECTED_GRACE_PERIOD';
}

const reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
const activeSessions: Map<string, Session> = new Map();

function generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Pattern subscriber securely funneling ALL room events straight downstream
redisManager.sub.psubscribe('room:*:events', (err) => {
    if (err) console.error("Redis Sub error", err);
});

redisManager.sub.on('pmessage', (pattern, channel, message) => {
    // format -> room:lobby:events
    const roomId = channel.split(':')[1];
    if (!roomId) return;

    // Broadcast blindly to all WS proxied listeners
    if (proxyConnections.has(roomId)) {
        try { require('fs').appendFileSync('test-core.log', `[PROXY] FORWARDING BLINDLY: ${message.substring(0, 50)}...\n`); } catch (e) { }
        const subs = proxyConnections.get(roomId);
        if (subs) {
            subs.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(message);
                }
            });
        }
    }
});

wss.on('connection', (ws) => {
    let playerId: string | null = null;
    let localRoomId: string | null = null;
    let sessionToken: string | null = null;
    wsRttMap.set(ws, 0);

    // Issue 5: Real Server-Side Rate Limiter (Token Bucket)
    const MAX_MESSAGES_PER_SECOND = parseFloat(process.env.MAX_MESSAGES_PER_SECOND || "20");
    const MAX_MESSAGE_BURST = parseFloat(process.env.MAX_MESSAGE_BURST || "50");
    let tokens = MAX_MESSAGE_BURST;
    let lastRefill = Date.now();

    ws.on('message', async (data) => {
        // Refill tokens
        const now = Date.now();
        const ellapsedMs = now - lastRefill;
        tokens = Math.min(MAX_MESSAGE_BURST, tokens + (ellapsedMs * (MAX_MESSAGES_PER_SECOND / 1000)));
        lastRefill = now;

        if (tokens < 1) {
            console.warn(`[${SERVER_ID}] Rate Limiter: Dropped packet from ${playerId || 'unknown'} (bucket exhausted)`);
            return; // Drop excessive message before parsing
        }
        tokens -= 1;

        try {
            const rawJson = JSON.parse(data.toString());
            const validation = ClientMessageSchema.safeParse(rawJson);
            if (!validation.success) {
                console.warn(`[${SERVER_ID}] Dropped malformed WS payload from client`, validation.error.message);
                return;
            }
            const message = validation.data;

            if (message.type === ClientMessageType.JOIN) {
                if (!playerId) {
                    if (message.token && activeSessions.has(message.token)) {
                        const session = activeSessions.get(message.token)!;
                        if (session.state === 'ACTIVE') {
                            ws.close(4001, 'Session Already Claimed');
                            return;
                        }

                        // Reconnect Context successfully hit!
                        session.state = 'ACTIVE';
                        playerId = session.playerId;
                        localRoomId = session.roomId;
                        sessionToken = message.token;

                        // Nullify impending prune timeout!
                        if (reconnectTimeouts.has(playerId)) {
                            clearTimeout(reconnectTimeouts.get(playerId)!);
                            reconnectTimeouts.delete(playerId);
                        }

                        if (!proxyConnections.has(localRoomId)) proxyConnections.set(localRoomId, []);
                        proxyConnections.get(localRoomId)!.push(ws);
                        ws.send(JSON.stringify({ type: ServerMessageType.WELCOME, id: playerId, token: message.token }));
                        console.log(`[${SERVER_ID}] Player ${playerId} successfully reconnected to ${localRoomId}`);
                        return;
                    }

                    playerId = Math.random().toString(36).substring(7);
                    localRoomId = message.roomId || 'lobby'; // Default to lobby!

                    sessionToken = generateSecureToken();
                    activeSessions.set(sessionToken, { playerId, roomId: localRoomId, state: 'ACTIVE' });

                    // Elect / Confirm Authorship Rights Atomically (Fix Issue 1 & 6)
                    console.log(`[${SERVER_ID}] Attempting HSETNX on ${localRoomId}`);
                    const acquired = await redisManager.pub.hsetnx('rooms', localRoomId, SERVER_ID);
                    console.log(`[${SERVER_ID}] HSETNX acquired flag: ${acquired}`);

                    if (acquired === 1 || (await redisManager.pub.hget('rooms', localRoomId)) === SERVER_ID) {
                        if (!activeRooms.has(localRoomId)) {
                            const room = new CoreRoom(localRoomId);
                            // Bind cleanup lifecycle (Fix Issue 6)
                            room.onStop = () => {
                                activeRooms.delete(localRoomId!);
                                redisManager.pub.hdel('rooms', localRoomId!);
                            };
                            activeRooms.set(localRoomId, room);
                            console.log(`[${SERVER_ID}] Initialized local authority for room: ${localRoomId}`);
                        }
                    }

                    // Strict Race Condition Fix: Wait for internal Pub/Sub to actively bind BEFORE broadcasting!
                    console.log(`[${SERVER_ID}] Checking activeRooms for ${localRoomId}`);
                    if (activeRooms.has(localRoomId)) {
                        console.log(`[${SERVER_ID}] Awaiting core subscription promise...`);
                        await activeRooms.get(localRoomId)!.subscriptionPromise;
                        console.log(`[${SERVER_ID}] Core subscription promise resolved.`);
                    }
                    // Wait for proxy subscriptions generically (Give CoreRoom on remote nodes time to bind fully!)
                    await new Promise(r => setTimeout(r, 150));

                    // Setup proxy subscription map
                    if (!proxyConnections.has(localRoomId)) {
                        proxyConnections.set(localRoomId, []);
                    }
                    proxyConnections.get(localRoomId)!.push(ws);

                    redisManager.pub.publish(`room:${localRoomId}:inputs`, JSON.stringify({
                        type: RedisEventType.PLAYER_JOINED,
                        id: playerId
                    }));

                    // Instantly welcome regardless of proxy or authorship
                    ws.send(JSON.stringify({ type: ServerMessageType.WELCOME, id: playerId, token: sessionToken }));
                }
            }
            else if (message.type === ClientMessageType.INPUT && localRoomId && playerId) {
                redisManager.pub.publish(`room:${localRoomId}:inputs`, JSON.stringify({
                    type: RedisEventType.INPUT_FORWARD,
                    id: playerId,
                    input: message.input,
                    rtt: wsRttMap.get(ws) || 0
                }));
            }
            else if (message.type === ClientMessageType.ATTACK && localRoomId && playerId) {
                redisManager.pub.publish(`room:${localRoomId}:inputs`, JSON.stringify({
                    type: RedisEventType.ATTACK_FORWARD,
                    id: playerId
                }));
            }
            else if (message.type === ClientMessageType.PING) {
                ws.send(JSON.stringify({ type: ServerMessageType.PONG, clientTime: message.clientTime }));
            }
            else if (message.type === ClientMessageType.PONG) {
                wsRttMap.set(ws, Math.max(0, Date.now() - message.serverTime));
            }
        } catch (e) {
            console.error(`[${SERVER_ID}] FATAL ERROR IN WS LOOP:`, e);
        }
    });

    ws.on('close', () => {
        if (playerId && localRoomId) {
            const subs = proxyConnections.get(localRoomId);
            if (subs) {
                proxyConnections.set(localRoomId, subs.filter(s => s !== ws));
            }

            // Grant 3 seconds of Reconnect Grace Period resolving micro wifi-drops organically
            const savedPlayerId = playerId;
            const savedRoomId = localRoomId;
            const savedToken = sessionToken;

            if (savedToken && activeSessions.has(savedToken)) {
                const session = activeSessions.get(savedToken)!;
                session.state = 'DISCONNECTED_GRACE_PERIOD';

                const timeout = setTimeout(() => {
                    // Mark as EXPIRED natively and remove memory mappings
                    activeSessions.delete(savedToken);
                    redisManager.pub.publish(`room:${savedRoomId}:inputs`, JSON.stringify({
                        type: RedisEventType.PLAYER_LEFT,
                        id: savedPlayerId
                    }));
                    reconnectTimeouts.delete(savedPlayerId);
                }, 3000);

                reconnectTimeouts.set(savedPlayerId, timeout);
            }
        }
        wsRttMap.delete(ws);
    });
});

const pingWorker = setInterval(() => {
    const p = JSON.stringify({ type: ServerMessageType.PING, serverTime: Date.now() });
    wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(p);
        }
    });
}, 1000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[${SERVER_ID}] Edge Node runtime ready on HTTP/WS port ${PORT}`);
});

// Cleanup hooks loosely
process.on('SIGINT', () => {
    activeRooms.forEach(r => r.stop());
    process.exit();
});

export { wss, activeRooms };
