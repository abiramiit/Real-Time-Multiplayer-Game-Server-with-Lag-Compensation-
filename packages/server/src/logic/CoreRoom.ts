import {
    applyInput, ATTACK_RADIUS, ServerMessageType
} from 'shared';
import type { GameStateSnapshot, PlayerState, PlayerInput, ServerMessageHit } from 'shared';
import { HistoryBuffer } from './HistoryBuffer';
import { redisManager, RedisEventType } from '../redis/RedisManager';
import { telemetry } from '../utils/MetricsManager';
import Redis from 'ioredis';

export class CoreRoom {
    public roomId: string;
    public players: Map<string, { state: PlayerState; pendingInputs: PlayerInput[]; rtt: number }> = new Map();
    public history: HistoryBuffer = new HistoryBuffer(500);
    public onStop?: () => void;
    public subscriptionPromise: Promise<any>;

    private tickInterval: NodeJS.Timeout | null = null;
    private currentTick: number = 0;

    private internalSub: Redis; // A dedicated subscriber for this tick loop listening to inputs

    constructor(roomId: string, tickRate: number = 30) {
        this.roomId = roomId;
        const TICK_DURATION_MS = 1000 / tickRate;

        // Spawn a dedicated listener purely driving this Headless simulation room!
        const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
        this.internalSub = new Redis(REDIS_URL);
        this.subscriptionPromise = this.internalSub.subscribe(`room:${this.roomId}:inputs`);

        this.internalSub.on('message', (channel, message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === RedisEventType.PLAYER_JOINED) {
                    if (this.players.size >= 10) return; // Strict Room scaling limits preventing DDOS arrays natively
                    if (!this.players.has(data.id)) {
                        this.players.set(data.id, {
                            state: { id: data.id, position: { x: 400, y: 300 }, lastProcessedInputNumber: 0 },
                            pendingInputs: [],
                            rtt: 0
                        });
                    }
                }
                else if (data.type === RedisEventType.PLAYER_LEFT) {
                    this.players.delete(data.id);
                }
                else if (data.type === RedisEventType.INPUT_FORWARD) {
                    const p = this.players.get(data.id);
                    if (p && data.input.sequenceNumber > p.state.lastProcessedInputNumber) {
                        p.pendingInputs.push(data.input);
                        p.rtt = Math.max(0, data.rtt || p.rtt);
                    }
                }
                else if (data.type === RedisEventType.ATTACK_FORWARD) {
                    // Compute Lag Compensation mathematically isolated inside CoreRoom
                    const p = this.players.get(data.id);
                    if (p) {
                        const INTERPOLATION_DELAY_MS = 100;
                        /* 
                         * FORMULA DOCUMENTATION (Issue 4):
                         * T = 0 : Server generates snapshot.
                         * T = RTT/2 : Client receives snapshot. Interpolation buffers it.
                         * T = (RTT/2) + INTERPOLATION_DELAY_MS : Client visibly renders snapshot and user clicks Attack.
                         * T = (RTT/2) + INTERPOLATION_DELAY_MS + (RTT/2) : Attack packet reaches Server.
                         * TOTAL TIME ELAPSED since snapshot generation = RTT + INTERPOLATION_DELAY_MS.
                         * Therefore, using full Raw RTT (p.rtt) is mathematically EXACT for this architecture!
                         */
                        const targetDelayMs = p.rtt + INTERPOLATION_DELAY_MS;
                        const clampedRewind = Math.min(targetDelayMs, this.history.maxRewindMs);

                        const targetServerTime = Date.now() - clampedRewind;
                        const historicalSnapshot = this.history.getHistoricalState(targetServerTime);

                        if (historicalSnapshot) {
                            const me = p.state.position;
                            for (const hp of historicalSnapshot) {
                                if (hp.id !== data.id) {
                                    const dx = hp.position.x - me.x;
                                    const dy = hp.position.y - me.y;
                                    const dist = Math.sqrt(dx * dx + dy * dy);
                                    if (dist <= ATTACK_RADIUS) {
                                        // HIT! Publish event outward to nodes
                                        redisManager.pub.publish(`room:${this.roomId}:events`, JSON.stringify({
                                            type: ServerMessageType.HIT,
                                            attackerId: data.id,
                                            targetId: hp.id
                                        }));
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) { }
        });

        let lastTime = Date.now();
        let emptyTicks = 0;

        this.tickInterval = setInterval(() => {
            if (this.players.size === 0) {
                emptyTicks++;
                if (emptyTicks > tickRate * 10) { // 10 seconds of complete idle silence triggers Room Deallocation natively
                    this.stop();
                    return;
                }
            } else {
                emptyTicks = 0;
            }

            const now = Date.now();
            const dt = (now - lastTime) / 1000;
            lastTime = now;
            this.currentTick++;

            this.players.forEach(player => {
                let anyProcessed = false;
                player.pendingInputs.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

                const MAX_CUMULATIVE_DT = 0.25; // Maximum 250ms simulated per tick
                let cumulativeDt = 0;

                for (const input of player.pendingInputs) {
                    const safeDt = Math.min(input.dt || dt, 0.1);
                    if (cumulativeDt + safeDt > MAX_CUMULATIVE_DT) {
                        console.warn(`[CoreRoom] Dropped trailing physics inputs for ${player.state.id} (exceeded dt budget)`);
                        break;
                    }
                    cumulativeDt += safeDt;
                    player.state.position = applyInput(player.state.position, input, safeDt);
                    player.state.lastProcessedInputNumber = input.sequenceNumber;
                    anyProcessed = true;
                }
                if (!anyProcessed) {
                    player.state.position = applyInput(player.state.position, { sequenceNumber: 0, up: false, down: false, left: false, right: false, dt: dt }, dt);
                }
                player.pendingInputs = [];
            });

            const snapshot: GameStateSnapshot = {
                timestamp: now,
                players: Array.from(this.players.values()).map(p => p.state)
            };
            this.history.pushSnapshot(snapshot);

            // PUBLISH AUTHORITATIVE STATE TO REDIS
            const payload = JSON.stringify({
                type: 'STATE',
                tick: this.currentTick,
                players: snapshot.players
            });
            try { require('fs').appendFileSync('test-core.log', `[CORE] PUSHING NATIVELY: ${payload.substring(0, 50)}...\n`); } catch (e) { }
            redisManager.pub.publish(`room:${this.roomId}:events`, payload);

            telemetry.trackTick(this.roomId, Date.now() - now); // End tick tracking timer

        }, TICK_DURATION_MS);
    }

    public stop() {
        if (this.tickInterval) clearInterval(this.tickInterval);
        this.internalSub.disconnect();
        if (this.onStop) this.onStop();
    }
}
