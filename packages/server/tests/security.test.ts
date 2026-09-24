import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import WebSocket from 'ws';



describe('Part F: Real Security Boundary Validations', () => {
    let serverMod: any;

    beforeAll(async () => {
        process.env.PORT = '8082';
        serverMod = await import('../src/index');
    });

    afterAll(() => {
        if (serverMod && serverMod.wss) {
            serverMod.wss.clients.forEach((c: any) => c.close());
            serverMod.wss.close();
        }
    });

    it('gracefully isolates structural json manipulation dropping bad frames organically', async () => {
        return new Promise<void>((resolve, reject) => {
            const ws = new WebSocket('ws://localhost:8082');
            ws.on('open', () => {
                // Completely malformed format!
                ws.send('!! MALFORMED {{ }} !!!');
                setTimeout(() => {
                    // Send legitimate immediately after
                    ws.send(JSON.stringify({ type: 'JOIN', roomId: 'security-room' }));
                }, 50);
            });

            ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'WELCOME') {
                    // Survived malformed logic exactly!
                    expect(msg.token).toBeDefined();
                    ws.close();
                    resolve();
                }
            });
        });
    });

    it('blocks volumetric traffic limits securely dropping DDoS natively via Token Bucket', async () => {
        return new Promise<void>((resolve, reject) => {
            const ws = new WebSocket('ws://localhost:8082');
            ws.on('open', () => {
                ws.send(JSON.stringify({ type: 'JOIN', roomId: 'ddos-room' }));
            });

            let welcomed = false;
            let counter = 0;

            ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'WELCOME') welcomed = true;
                if (msg.type === 'PONG') counter++;

                if (welcomed && counter === 0) {
                    // Spike 60 PING matrices instantly!
                    for (let i = 0; i < 60; i++) {
                        ws.send(JSON.stringify({ type: 'PING', clientTime: Date.now() }));
                    }

                    setTimeout(() => {
                        // Bucket allows exactly 50 bursts!
                        expect(counter).toBeLessThanOrEqual(51);
                        expect(counter).toBeGreaterThan(45); // Due to token refill time overlaps
                        ws.close();
                        resolve();
                    }, 500);
                }
            });
        });
    });
});
