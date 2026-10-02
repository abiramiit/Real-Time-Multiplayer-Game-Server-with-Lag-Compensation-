import type { PlayerInput, Vector2 } from 'shared';
export declare class PredictionManager {
    predictedPosition: Vector2;
    authoritativePosition: Vector2;
    pendingInputs: PlayerInput[];
    lastAcknowledgedSequence: number;
    predictionError: number;
    constructor(initialPosition: Vector2);
    addInput(input: PlayerInput): void;
    onServerState(serverPosition: Vector2, lastProcessedInputNumber: number): void;
}
//# sourceMappingURL=PredictionManager.d.ts.map