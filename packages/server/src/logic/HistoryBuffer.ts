import type { GameStateSnapshot, PlayerState } from 'shared';

export class HistoryBuffer {
    private snapshots: GameStateSnapshot[] = [];
    public maxRewindMs: number;

    constructor(maxRewindMs: number = 500) {
        this.maxRewindMs = maxRewindMs;
    }

    public pushSnapshot(snapshot: GameStateSnapshot) {
        // Clone for immutability
        this.snapshots.push(JSON.parse(JSON.stringify(snapshot)));

        const cutoff = snapshot.timestamp - this.maxRewindMs;
        while (this.snapshots.length > 0 && this.snapshots[0]!.timestamp < cutoff) {
            this.snapshots.shift();
        }
    }

    public getHistoricalState(targetTimeMs: number): PlayerState[] | null {
        if (this.snapshots.length === 0) return null;

        let before: GameStateSnapshot | null = null;
        let after: GameStateSnapshot | null = null;

        for (let i = this.snapshots.length - 1; i >= 0; i--) {
            if (this.snapshots[i]!.timestamp <= targetTimeMs) {
                before = this.snapshots[i]!;
                if (i + 1 < this.snapshots.length) {
                    after = this.snapshots[i + 1]!;
                }
                break;
            }
        }

        if (!before) return this.snapshots[0]!.players;
        if (!after) return before.players;

        const timeDiff = after.timestamp - before.timestamp;
        const progress = Math.min(1, Math.max(0, (targetTimeMs - before.timestamp) / timeDiff));

        const result: PlayerState[] = [];
        for (const bp of before.players) {
            const ap = after.players.find(p => p.id === bp.id);
            if (ap) {
                result.push({
                    id: bp.id,
                    lastProcessedInputNumber: bp.lastProcessedInputNumber,
                    position: {
                        x: bp.position.x + (ap.position.x - bp.position.x) * progress,
                        y: bp.position.y + (ap.position.y - bp.position.y) * progress,
                    }
                });
            } else {
                result.push({ ...bp });
            }
        }
        return result;
    }
}
