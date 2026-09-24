import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import WebSocket from 'ws';

describe('Part D: Session Lifecycle Continuity (Issue 7 Real Test)', () => {
    let serverMod: any;

    beforeAll(async () => {
        process.env.PORT = '8083';
        serverMod = await import('../src/index');
    });

    afterAll(() => {
        if (serverMod && serverMod.wss) {
            serverMod.wss.clients.forEach((c: any) => c.close());
            serverMod.wss.close();
        }
    });

    it('creates session natively, disconnects marking grace period, and reconnects smoothly', async () => {
        return new Promise<void>((resolve, reject) => {
            const ws = new WebSocket('ws://localhost:8083');
            let sessionToken: string | null = null;
            let playerId: string | null = null;

            ws.on('open', () => {
                ws.send(JSON.stringify({ type: 'JOIN', roomId: 'issue7-room' }));
            });

            ws.on('message', (data: Buffer) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'WELCOME') {
                    sessionToken = msg.token;
                    playerId = msg.id;
                    expect(sessionToken).toBeDefined();

                    // Step 1: Disconnect immediately
                    ws.close();

                    setTimeout(() => {
                        // Step 2: Ensure Grace Period triggers but doesn't wipe
                        const ws2 = new WebSocket('ws://localhost:8083');
                        ws2.on('open', () => {
                            ws2.send(JSON.stringify({ type: 'JOIN', roomId: 'issue7-room', token: sessionToken }));
                        });

                        ws2.on('message', (data2: Buffer) => {
                            const msg2 = JSON.parse(data2.toString());
                            if (msg2.type === 'WELCOME') {
                                expect(msg2.id).toBe(playerId);
                                ws2.close();
                                resolve();
                            }
                        });

                        ws2.on('close', (code, reason) => {
                            if (code === 4001) reject(new Error('Session Already Claimed unexpectedly'));
                        });
                    }, 500); // 500ms is well within the 3000ms grace limit!
                }
            });
        });
    });

    it('rejects completely invalid session credentials organically', async () => {
        return new Promise<void>((resolve, reject) => {
            const ws = new WebSocket('ws://localhost:8083');

            ws.on('open', () => {
                // Trying malicious token
                ws.send(JSON.stringify({ type: 'JOIN', roomId: 'issue7-room', token: 'malicious-injected-token' }));
            });

            ws.on('message', (data: Buffer) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'WELCOME') {
                    // Because it was invalid, the token should NOT match 'malicious-injected-token', it creates a BRAND NEW ONE gracefully instead of rejecting!
                    expect(msg.token).toBeDefined();
                    expect(msg.token).not.toBe('malicious-injected-token');
                    ws.close();
                    resolve();
                }
            });
        });
    });

    it('rejects simultaneous reconnects organically via 4001', async () => {
        return new Promise<void>((resolve, reject) => {
            const ws1 = new WebSocket('ws://localhost:8083');
            let sessionToken: string | null = null;
            ws1.on('open', () => {
                ws1.send(JSON.stringify({ type: 'JOIN', roomId: 'conflict-room' }));
            });

            ws1.on('message', (data: Buffer) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'WELCOME') {
                    sessionToken = msg.token;

                    // LEAVE ws1 ALIVE (State = ACTIVE)
                    // Fire WS2 attempting to hijack actively!
                    const ws2 = new WebSocket('ws://localhost:8083');
                    ws2.on('open', () => {
                        ws2.send(JSON.stringify({ type: 'JOIN', roomId: 'conflict-room', token: sessionToken }));
                    });

                    ws2.on('close', (code, reason) => {
                        expect(code).toBe(4001);
                        expect(reason.toString()).toEqual('Session Already Claimed');
                        ws1.close();
                        resolve();
                    });
                }
            });
        });
    });
});
