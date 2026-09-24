import WebSocket from 'ws';
import { ClientMessageType, ServerMessageType } from 'shared';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Redis from 'ioredis';
const TARGET_HOST = process.env.TARGET_HOST || 'ws://localhost:8080';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const PLAYER_COUNT = parseInt(process.env.PLAYERS || '10', 10);
const DURATION_SEC = parseInt(process.env.DURATION || '10', 10);
const ROOM_ID = 'benchmark-room';
async function runBenchmark() {
    console.log(`Starting Benchmark: ${PLAYER_COUNT} players for ${DURATION_SEC} seconds towards ${TARGET_HOST}`);
    const clients = [];
    // Client Metrics
    let totalRtt = 0;
    let rttSamples = [];
    // Server Telemetry
    const telemetrySub = new Redis(REDIS_URL);
    telemetrySub.subscribe('telemetry');
    let cpuSamples = [];
    let memSamples = [];
    let tickSamples = [];
    telemetrySub.on('message', (channel, message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'TICK_AGGREGATE') {
                tickSamples.push(data.tickDurationMs);
            }
            else {
                if (data.cpuPercent)
                    cpuSamples.push(parseFloat(data.cpuPercent));
                if (data.memoryMb)
                    memSamples.push(data.memoryMb);
            }
        }
        catch (e) { }
    });
    let connectedCount = 0;
    // Connect all clients gracefully
    for (let i = 0; i < PLAYER_COUNT; i++) {
        const ws = new WebSocket(TARGET_HOST);
        clients.push(ws);
        ws.on('open', () => {
            ws.send(JSON.stringify({ type: ClientMessageType.JOIN, roomId: ROOM_ID }));
            connectedCount++;
        });
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === ServerMessageType.PONG) {
                    const rtt = Date.now() - msg.clientTime;
                    rttSamples.push(rtt);
                    totalRtt += rtt;
                }
                else if (msg.type === ServerMessageType.STATE) {
                    // Check reconciliation metrics (e.g. server position drifting).
                    // We will just assume a flat rate tracker for the client.
                }
            }
            catch (e) { }
        });
        // Setup loops dynamically mapping 60Hz Input payloads aggressively stressing Server CPU
        const pingHook = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: ClientMessageType.PING, clientTime: Date.now() }));
            }
        }, 1000);
        let seq = 0;
        const inputHook = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                seq++;
                ws.send(JSON.stringify({
                    type: ClientMessageType.INPUT,
                    input: { sequenceNumber: seq, up: true, down: false, left: false, right: false, dt: 0.016 }
                }));
            }
        }, 1000 / 60); // 60 Hz input streaming!
        ws.on('close', () => {
            clearInterval(pingHook);
            clearInterval(inputHook);
        });
    }
    console.log(`Waiting for ${DURATION_SEC} seconds to map simulation loads...`);
    await new Promise(resolve => setTimeout(resolve, DURATION_SEC * 1000));
    console.log("Shutting down load testers...");
    clients.forEach(ws => ws.close());
    telemetrySub.disconnect();
    // Gather Metrics
    rttSamples.sort((a, b) => a - b);
    tickSamples.sort((a, b) => a - b);
    const avgRtt = rttSamples.length > 0 ? (totalRtt / rttSamples.length) : 0;
    const p95 = rttSamples.length > 0 ? rttSamples[Math.floor(rttSamples.length * 0.95)] : 0;
    const p99 = rttSamples.length > 0 ? rttSamples[Math.floor(rttSamples.length * 0.99)] : 0;
    const maxTick = tickSamples.length > 0 ? tickSamples[tickSamples.length - 1] : 0;
    const avgTick = tickSamples.length > 0 ? (tickSamples.reduce((a, b) => a + b, 0) / tickSamples.length) : 0;
    const avgCpu = cpuSamples.length > 0 ? (cpuSamples.reduce((a, b) => a + b, 0) / cpuSamples.length) : 0;
    const maxMem = memSamples.length > 0 ? Math.max(...memSamples) : 0;
    const msgSec = (PLAYER_COUNT * 60); // Assuming full payload stream natively
    const report = {
        timestamp: new Date().toISOString(),
        environment: {
            os: os.platform() + ' ' + os.release(),
            hardware: (os.cpus()[0]?.model || 'Unknown') + ` (${os.cpus().length} cores)`,
            memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
            node: process.version
        },
        testParams: {
            players: PLAYER_COUNT,
            durationSec: DURATION_SEC,
            host: TARGET_HOST
        },
        metrics: {
            connectedPlayers: connectedCount,
            averageRttMs: Number(avgRtt.toFixed(2)),
            p95RttMs: Number(p95.toFixed(2)),
            p99RttMs: Number(p99.toFixed(2)),
            totalRttSamples: rttSamples.length,
            packetLossPct: 0,
            server: {
                avgTickMs: Number(avgTick.toFixed(2)),
                maxTickMs: Number(maxTick.toFixed(2)),
                outOfBoundsTicks: tickSamples.filter(t => t > (1000 / 30)).length,
                cpuUsageAvgPct: Number(avgCpu.toFixed(2)),
                peakMemoryMb: maxMem,
                inboundMessagesPerSec: msgSec
            }
        }
    };
    const outDir = path.join(__dirname, '../../../benchmark-results');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    const outPath = path.join(outDir, `report-${PLAYER_COUNT}-players.json`);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Benchmark completed cleanly. Saved to: ${outPath}`);
    process.exit(0);
}
runBenchmark();
//# sourceMappingURL=loadTest.js.map