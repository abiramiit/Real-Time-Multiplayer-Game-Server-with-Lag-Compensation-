import type { PlayerState } from 'shared';

interface StateSnapshot {
    timestamp: number;
    players: PlayerState[];
}

export class InterpolationManager {
    private snapshots: StateSnapshot[] = [];
    public interpolationDelayMs = 100; // Customizable delay

    onServerState(players: PlayerState[]) {
        this.snapshots.push({
            timestamp: performance.now(),
            players: JSON.parse(JSON.stringify(players)) // Deep copy safety
        });

        // Prevent unbounded memory growth (e.g. at 30Hz ~60 is 2 seconds of buffer)
        if (this.snapshots.length > 60) {
            this.snapshots.shift();
        }
    }

    getInterpolatedPlayers(): PlayerState[] | null {
        if (this.snapshots.length === 0) return null;

        // The render time is in the past!
        const targetTimeMs = performance.now() - this.interpolationDelayMs;

        let before: StateSnapshot | null = null;
        let after: StateSnapshot | null = null;

        for (let i = this.snapshots.length - 1; i >= 0; i--) {
            if (this.snapshots[i].timestamp <= targetTimeMs) {
                before = this.snapshots[i];
                if (i + 1 < this.snapshots.length) {
                    after = this.snapshots[i + 1];
                }
                break;
            }
        }

        // If we only have newest state but it hasn't matured past delay, fallback to the oldest available bounding
        if (!before && this.snapshots.length > 0) return this.snapshots[0].players;
        if (before && !after) return before.players;
        if (!before || !after) return null; // Type guard

        const timeDiff = after.timestamp - before.timestamp;
        const progress = Math.min(1, Math.max(0, (targetTimeMs - before.timestamp) / timeDiff));

        const result: PlayerState[] = [];

        // Linear Interpolation loop
        for (const bp of before.players) {
            const ap = after.players.find(p => p.id === bp.id);
            if (ap) {
                result.push({
                    id: bp.id,
                    lastProcessedInputNumber: ap.lastProcessedInputNumber,
                    position: {
                        x: bp.position.x + (ap.position.x - bp.position.x) * progress,
                        y: bp.position.y + (ap.position.y - bp.position.y) * progress,
                    }
                });
            } else {
                result.push({ ...bp }); // Player absent in next tick
            }
        }

        return result;
    }
}
