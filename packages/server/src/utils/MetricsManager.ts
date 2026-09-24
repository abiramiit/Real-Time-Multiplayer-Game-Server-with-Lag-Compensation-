import { redisManager } from '../redis/RedisManager';
import os from 'os';

class MetricsManager {
    private lastCpu = process.cpuUsage();

    public init(serverId: string) {
        setInterval(() => {
            const mem = process.memoryUsage();
            const cpu = process.cpuUsage(this.lastCpu);
            this.lastCpu = process.cpuUsage(); // reset

            // cpu.user represents microseconds spent in user code over the last interval (1 sec = 1,000,000 usec)
            const cpuPercent = (cpu.user + cpu.system) / 10000;

            redisManager.pub.publish('telemetry', JSON.stringify({
                node: serverId,
                memoryMb: Math.round(mem.rss / 1024 / 1024),
                cpuPercent: cpuPercent.toFixed(2),
                timestamp: Date.now()
            }));
        }, 1000);
    }

    public trackTick(roomId: string, durationMs: number) {
        redisManager.pub.publish('telemetry', JSON.stringify({
            room: roomId,
            tickDurationMs: durationMs,
            type: 'TICK_AGGREGATE'
        }));
    }
}

export const telemetry = new MetricsManager();
