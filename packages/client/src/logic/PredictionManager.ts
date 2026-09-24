import { applyInput } from 'shared';
import type { PlayerInput, Vector2 } from 'shared';

export class PredictionManager {
    public predictedPosition: Vector2;
    public authoritativePosition: Vector2;
    public pendingInputs: PlayerInput[] = [];
    public lastAcknowledgedSequence: number = 0;
    public predictionError: number = 0;

    constructor(initialPosition: Vector2) {
        this.predictedPosition = { ...initialPosition };
        this.authoritativePosition = { ...initialPosition };
    }

    addInput(input: PlayerInput) {
        this.pendingInputs.push(input);
        // Apply instantly to predictor using isolated exact network dt
        this.predictedPosition = applyInput(this.predictedPosition, input, input.dt);
    }

    onServerState(serverPosition: Vector2, lastProcessedInputNumber: number) {
        this.authoritativePosition = { ...serverPosition };
        this.lastAcknowledgedSequence = lastProcessedInputNumber;

        // Discard inputs resolved by authoratative server tick
        this.pendingInputs = this.pendingInputs.filter(i => i.sequenceNumber > lastProcessedInputNumber);

        const preReconcileSnapshot = { ...this.predictedPosition };

        // Snap back to strictly dictated authoritative point
        this.predictedPosition = { ...this.authoritativePosition };

        // Reconcile / Replay pending events continuously
        for (const unackedInput of this.pendingInputs) {
            this.predictedPosition = applyInput(this.predictedPosition, unackedInput, unackedInput.dt);
        }

        // Exact measure of rubber-band visual correction distance
        this.predictionError = Math.sqrt(
            Math.pow(preReconcileSnapshot.x - this.predictedPosition.x, 2) +
            Math.pow(preReconcileSnapshot.y - this.predictedPosition.y, 2)
        );
    }
}
