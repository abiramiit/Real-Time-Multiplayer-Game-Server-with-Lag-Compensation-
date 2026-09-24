import type { PlayerState, PlayerInput } from 'shared';
import { HistoryBuffer } from './HistoryBuffer';
export declare class CoreRoom {
    roomId: string;
    players: Map<string, {
        state: PlayerState;
        pendingInputs: PlayerInput[];
        rtt: number;
    }>;
    history: HistoryBuffer;
    onStop?: () => void;
    subscriptionPromise: Promise<any>;
    private tickInterval;
    private currentTick;
    private internalSub;
    constructor(roomId: string, tickRate?: number);
    stop(): void;
}
//# sourceMappingURL=CoreRoom.d.ts.map