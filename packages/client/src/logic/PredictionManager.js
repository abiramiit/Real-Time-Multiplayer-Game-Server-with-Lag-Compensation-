import { applyInput } from 'shared';
export class PredictionManager {
    predictedPosition;
    authoritativePosition;
    pendingInputs = [];
    lastAcknowledgedSequence = 0;
    predictionError = 0;
    constructor(initialPosition) {
        this.predictedPosition = { ...initialPosition };
        this.authoritativePosition = { ...initialPosition };
    }
    addInput(input) {
        this.pendingInputs.push(input);
        // Apply instantly to predictor using isolated exact network dt
        this.predictedPosition = applyInput(this.predictedPosition, input, input.dt);
    }
    onServerState(serverPosition, lastProcessedInputNumber) {
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
        this.predictionError = Math.sqrt(Math.pow(preReconcileSnapshot.x - this.predictedPosition.x, 2) +
            Math.pow(preReconcileSnapshot.y - this.predictedPosition.y, 2));
    }
}
//# sourceMappingURL=PredictionManager.js.map