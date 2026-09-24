import WebSocket from 'ws';
import { ClientMessageType, ServerMessageType, applyInput } from 'shared';
import type { ClientMessage, ServerMessage, PlayerInput } from 'shared';
import { NetworkSimulator } from '../../client/src/network/NetworkSimulator';
import type { NetworkConfig } from '../../client/src/network/NetworkSimulator';
import { PredictionManager } from '../../client/src/logic/PredictionManager';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Polyfill global WebSocket for NetworkSimulator 
(global as any).WebSocket = WebSocket;

const TARGET_HOST = 'ws://localhost:9700';

const configs: NetworkConfig[] = [
    { latencyMs: 0, jitterMs: 0, packetLossPct: 0, enabled: true },
    { latencyMs: 50, jitterMs: 5, packetLossPct: 0, enabled: true },
    { latencyMs: 100, jitterMs: 10, packetLossPct: 0, enabled: true },
    { latencyMs: 150, jitterMs: 15, packetLossPct: 0, enabled: true },
    { latencyMs: 200, jitterMs: 20, packetLossPct: 0, enabled: true },
    { latencyMs: 50, jitterMs: 5, packetLossPct: 1, enabled: true },
    { latencyMs: 50, jitterMs: 5, packetLossPct: 5, enabled: true },
    { latencyMs: 50, jitterMs: 5, packetLossPct: 10, enabled: true },
];

async function runConfig(config: NetworkConfig): Promise<any> {
    return new Promise((resolve) => {
        const sim = new NetworkSimulator(TARGET_HOST, config);
        const predictor = new PredictionManager({ x: 400, y: 300 });

        let myId = '';
        let connected = false;

        const metrics = {
            rttAvg: 0,
            rttSamples: 0 as number,
            totalRtt: 0,
            messagesSent: 0,
            messagesReceived: 0,
            reconciliations: 0,
            correctionMagnitudesTotal: 0,
            maxCorrection: 0,
            finalAuthoritativeState: { x: 0, y: 0 },
            finalPredictedState: { x: 0, y: 0 }
        };

        sim.onopen = () => {
            connected = true;
            sim.send(JSON.stringify({ type: ClientMessageType.JOIN, roomId: 'physics-bench' }));
            metrics.messagesSent++;
        };

        sim.onmessage = (e: any) => {
            metrics.messagesReceived++;
            try {
                const msg = JSON.parse(e.data.toString()) as ServerMessage;
                if (msg.type === ServerMessageType.WELCOME) {
                    myId = msg.id;
                }
                else if (msg.type === ServerMessageType.PONG) {
                    const rtt = Date.now() - msg.clientTime;
                    metrics.totalRtt += rtt;
                    metrics.rttSamples++;
                }
                else if (msg.type === ServerMessageType.STATE) {
                    const me = msg.players.find(p => p.id === myId);
                    if (me) {
                        metrics.reconciliations++;
                        predictor.onServerState(me.position, me.lastProcessedInputNumber);

                        metrics.correctionMagnitudesTotal += predictor.predictionError;
                        if (predictor.predictionError > metrics.maxCorrection) {
                            metrics.maxCorrection = predictor.predictionError;
                        }

                        metrics.finalAuthoritativeState = { ...predictor.authoritativePosition };
                        metrics.finalPredictedState = { ...predictor.predictedPosition };
                    }
                }
            } catch (err) { }
        };

        const inputLoop = setInterval(() => {
            if (!connected) return;
            const seq = Math.floor(Math.random() * 1000000);
            const input = { sequenceNumber: seq, up: true, down: false, left: Math.random() > 0.5, right: false, dt: 1 / 60 };
            predictor.addInput(input);
            sim.send(JSON.stringify({ type: ClientMessageType.INPUT, input }));
            metrics.messagesSent++;
        }, 1000 / 60);

        const pingLoop = setInterval(() => {
            if (!connected) return;
            sim.send(JSON.stringify({ type: ClientMessageType.PING, clientTime: Date.now() }));
            metrics.messagesSent++;
        }, 500);

        setTimeout(() => {
            clearInterval(inputLoop);
            clearInterval(pingLoop);
            sim.close();

            metrics.rttAvg = metrics.rttSamples > 0 ? (metrics.totalRtt / metrics.rttSamples) : 0;
            resolve(metrics);
        }, 8000);
    });
}

async function start() {
    process.stdout.write("--- PHASE 11 PHYSICS / NETWORK SIMULATION RUNNER ---\n");
    const indexPath = path.join(__dirname, '../src/index.ts');

    console.log("Booting Benchmark Server...");
    const server = spawn('npx.cmd', ['tsx', indexPath], {
        env: { ...process.env, PORT: '9700', SERVER_ID: 'BENCH_PHYS' },
        shell: true
    });
    server.stdout?.on('data', () => { });
    server.stderr?.on('data', () => { });
    await new Promise(r => setTimeout(r, 6000));

    const results: any[] = [];

    for (const conf of configs) {
        process.stdout.write(`\nTesting Config: [Latency ${conf.latencyMs}ms | Loss ${conf.packetLossPct}%]...\n`);
        const r = await runConfig(conf);
        results.push({ config: conf, metrics: r });
        await new Promise(r => setTimeout(r, 1000));
    }

    const outDir = path.join(__dirname, '../../../benchmark-results');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(path.join(outDir, 'phase11-network-physics.json'), JSON.stringify(results, null, 2));
    console.log(`\n\nResults firmly mapped and saved securely!`);

    console.log("Closing Server...");
    server.kill();
    process.exit(0);
}

start();
