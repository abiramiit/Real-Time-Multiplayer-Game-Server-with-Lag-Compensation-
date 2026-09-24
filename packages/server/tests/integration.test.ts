import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import fs from 'fs';

function waitForMessage(ws: WebSocket, predicate: (msg: any) => boolean, timeoutMs: number, diagCtx: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            ws.removeListener('message', listener);
            reject(new Error(`TIMEOUT E2E Single Node flow: ${JSON.stringify(diagCtx)}`));
        }, timeoutMs);

        const listener = (data: WebSocket.Data) => {
            const raw = JSON.parse(data.toString());
            fs.appendFileSync('test-debug.txt', `recv: ${raw.type}\n`);
            console.log(`[TEST-WS] recv: ${raw.type}`);
            diagCtx.lastMsg = raw.type;
            if (predicate(raw)) {
                clearTimeout(timeout);
                ws.removeListener('message', listener);
                resolve(raw);
            }
        };
        ws.on('message', listener);
    });
}

describe('Part E: Real WS Integration Logic', () => {
    let serverMod: any;

    beforeAll(async () => {
        process.env.PORT = '9101';
        serverMod = await import('../src/index');
        // Give the proxy connections time to organically bind natively
        await new Promise(r => setTimeout(r, 1000));
    });

    afterAll(() => {
        if (serverMod && serverMod.wss) {
            serverMod.wss.clients.forEach((c: any) => c.close());
            serverMod.wss.close();
        }
    });

    it('Part E: True WebSocket e2e logic flows identically tracing valid movements securely', async () => {
        const wsA = new WebSocket('ws://localhost:9101');
        const ctx = { expecting: 'WELCOME' };

        await new Promise<void>(r => wsA.on('open', r));

        // Prepare WELCOME listener BEFORE sending JOIN
        const welcomePromise = waitForMessage(wsA, m => m.type === 'WELCOME', 3000, ctx);
        const ROOM_ID = `e2e-${Math.floor(Math.random() * 1000)}`;
        wsA.send(JSON.stringify({ type: 'JOIN', roomId: ROOM_ID }));
        const welcome = await welcomePromise;
        expect(welcome.id).toBeTruthy();

        // Prepare STATE (Registration) listener BEFORE simulation completes
        ctx.expecting = 'First Registration STATE';
        await waitForMessage(wsA, m => m.type === 'STATE' && m.players.some((p: any) => p.id === welcome.id), 3000, ctx);

        // Prepare STATE matching physics mapping BEFORE sending physics update natively
        ctx.expecting = 'Physics TICK processed';
        const physicsPromise = waitForMessage(wsA, m => m.type === 'STATE' && m.players.some((p: any) => p.id === welcome.id && p.lastProcessedInputNumber >= 1), 5000, ctx);

        // Send Input safely mapping sequential pipelines seamlessly!
        wsA.send(JSON.stringify({ type: 'INPUT', input: { sequenceNumber: 1, up: true, down: false, left: false, right: false, dt: 0.1 } }));

        const result = await physicsPromise;
        expect(result.tick).toBeGreaterThan(0);

        wsA.close();
    }, 10000);
});
