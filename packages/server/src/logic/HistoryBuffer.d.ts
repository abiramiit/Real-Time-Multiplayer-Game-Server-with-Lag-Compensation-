import type { GameStateSnapshot, PlayerState } from 'shared';
export declare class HistoryBuffer {
    private snapshots;
    maxRewindMs: number;
    constructor(maxRewindMs?: number);
    pushSnapshot(snapshot: GameStateSnapshot): void;
    getHistoricalState(targetTimeMs: number): PlayerState[] | null;
}
//# sourceMappingURL=HistoryBuffer.d.ts.map