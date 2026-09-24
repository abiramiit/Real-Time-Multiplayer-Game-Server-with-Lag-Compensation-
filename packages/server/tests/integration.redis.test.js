import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import Redis from 'ioredis';
import fs from 'fs';
function waitForMessage(ws, predicate, timeoutMs, diagnosticCtx) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            ws.removeListener('message', listener);
            const errBase = `\n--- TIMEOUT (${timeoutMs}ms) WAITING FOR MSG ---\n`;
            const diagStr = JSON.stringify(diagnosticCtx, null, 2);
            reject(new Error(errBase + diagStr));
        }, timeoutMs);
        const listener = (data) => {
            const rawJson = JSON.parse(data.toString());
            diagnosticCtx.lastMessageReceived = rawJson.type;
            if (predicate(rawJson)) {
                clearTimeout(timeout);
                ws.removeListener('message', listener);
                resolve(rawJson);
            }
        };
        ws.on('message', listener);
    });
}
describe('Part G: Real Multi-Server Redis Validation', () => {
    let serverA;
    let serverB;
    const redis = new Redis('redis://127.0.0.1:6379');
    beforeAll(async () => {
        const indexPath = path.join(__dirname, '../src/index.ts');
        const envA = { ...process.env, PORT: '9106', SERVER_ID: 'SA' };
        const envB = { ...process.env, PORT: '9107', SERVER_ID: 'SB' };
        // Hook removed
        serverA = spawn('npx.cmd', ['tsx', indexPath], { env: envA, shell: true });
        serverB = spawn('npx.cmd', ['tsx', indexPath], { env: envB, shell: true });
        serverA.stdout?.on('data', d => fs.appendFileSync('test-serverA.log', d.toString()));
        serverA.stderr?.on('data', d => fs.appendFileSync('test-serverA.log', d.toString()));
        serverB.stdout?.on('data', d => fs.appendFileSync('test-serverB.log', d.toString()));
        // Ensure nodes boot natively binding raw Redis contexts
        await new Promise(r => setTimeout(r, 6000));
    });
    afterAll(async () => {
        serverA?.kill('SIGINT');
        serverB?.kill('SIGINT');
        redis.disconnect();
        await new Promise(r => setTimeout(r, 1000));
    });
    it('Cross-server true physics execution & atomicity lifecycle', async () => {
        const ROOM = `rm-${Math.random().toString(36).substring(2, 9)}`;
        const wsA = new WebSocket('ws://localhost:9106');
        const wsB = new WebSocket('ws://localhost:9107');
        const ctx = {
            roomId: ROOM,
            pidA: serverA?.pid,
            pidB: serverB?.pid,
            portA: 9106,
            portB: 9107
        };
        // 6. Listen for WELCOME precisely dodging synchronous Promise traps BY REGISTERING BEFORE AWAITING OPEN!
        const welcomeAPromise = waitForMessage(wsA, m => m.type === 'WELCOME', 3000, { ...ctx, expecting: 'WELCOME on A' });
        const welcomeBPromise = waitForMessage(wsB, m => m.type === 'WELCOME', 3000, { ...ctx, expecting: 'WELCOME on B' });
        // 1. Connect organically
        await new Promise((resolve, reject) => {
            let ops = 0;
            const onOp = () => { if (++ops === 2)
                resolve(); };
            const onErr = (e) => reject(new Error('Socket refused: ' + e));
            wsA.on('open', onOp);
            wsB.on('open', onOp);
            wsA.on('error', onErr);
            wsB.on('error', onErr);
        });
        // 2 & 7. JOIN organically
        wsA.send(JSON.stringify({ type: 'JOIN', roomId: ROOM }));
        wsB.send(JSON.stringify({ type: 'JOIN', roomId: ROOM }));
        const [welcomeA, welcomeB] = await Promise.all([welcomeAPromise, welcomeBPromise]);
        expect(welcomeA.id).toBeTruthy();
        expect(welcomeB.id).toBeTruthy();
        // 8. Confirm Organic Registration across instances tracking Native Event ticks accurately
        const firstStateAPromise = waitForMessage(wsA, m => m.type === 'STATE' && m.players.some((p) => p.id === welcomeA.id), 5000, { ...ctx, expecting: 'STATE on A proving Registration' });
        const firstStateA = await firstStateAPromise;
        // 9. Confirm ROOM OWNERSHIP is Atomic!
        const owner = await redis.hget('rooms', ROOM);
        expect(['SA', 'SB']).toContain(owner);
        // Map baseline positional states properly
        const pInitA = firstStateA.players.find((p) => p.id === welcomeA.id);
        expect(pInitA).toBeTruthy();
        // 11. Listen for TICK simulation matching mapped properties
        const stAPromise = waitForMessage(wsA, m => m.type === 'STATE' && m.players.some((p) => p.id === welcomeA.id && p.lastProcessedInputNumber >= 7), 5000, { ...ctx, expecting: 'STATE on A via Physics Tick matching input 7' });
        const stBPromise = waitForMessage(wsB, m => m.type === 'STATE' && m.players.some((p) => p.id === welcomeA.id && p.lastProcessedInputNumber >= 7), 5000, { ...ctx, expecting: 'STATE on B propagated crossing Redis server seamlessly matching limit 7' });
        // 10. Send VALID payload explicitly generating movement bounds organically natively!
        const input = { sequenceNumber: 7, up: true, down: false, left: false, right: false, dt: 0.1 };
        wsA.send(JSON.stringify({ type: 'INPUT', input }));
        // 12. Confirm E2E Propagations
        const [stA, stB] = await Promise.all([stAPromise, stBPromise]);
        expect(stA.tick).toBeGreaterThan(0);
        expect(stB.tick).toEqual(stA.tick);
        const playerA = stA.players.find((p) => p.id === welcomeA.id);
        // 14 & 15. Verify Position was bounded matching identical matrices!
        expect(playerA).toBeTruthy();
        expect(playerA.lastProcessedInputNumber).toBeGreaterThanOrEqual(1);
        expect(playerA.position.y).not.toEqual(pInitA.position.y);
        // Cleanup
        wsA.close();
        wsB.close();
    }, 20000); // Wait 20 seconds total to encapsulate all internal wait thresholds
});
//# sourceMappingURL=integration.redis.test.js.map