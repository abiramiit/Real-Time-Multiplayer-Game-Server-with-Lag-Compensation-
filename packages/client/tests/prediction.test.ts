import { describe, it, expect, beforeEach } from 'vitest';
import { PredictionManager } from '../src/logic/PredictionManager';

describe('Client-Side Prediction & Server Reconciliation', () => {
    let pm: PredictionManager;

    beforeEach(() => {
        pm = new PredictionManager({ x: 400, y: 300 });
    });

    it('1. Inputs are predicted immediately', () => {
        pm.addInput({ sequenceNumber: 1, up: false, down: false, left: false, right: true, dt: 0.1 }); // Speed 200 * 0.1 = 20
        expect(pm.predictedPosition.x).toBe(420);
        expect(pm.pendingInputs.length).toBe(1);
    });

    it('2. Pending inputs are stored', () => {
        pm.addInput({ sequenceNumber: 1, up: true, down: false, left: false, right: false, dt: 0.1 });
        pm.addInput({ sequenceNumber: 2, up: true, down: false, left: false, right: false, dt: 0.1 });
        expect(pm.pendingInputs.length).toBe(2);
    });

    it('3. Server acknowledgement removes processed inputs', () => {
        pm.addInput({ sequenceNumber: 1, up: true, down: false, left: false, right: false, dt: 0.1 });
        pm.addInput({ sequenceNumber: 2, up: true, down: false, left: false, right: false, dt: 0.1 });

        // Assert we are now at (400, 260) locally
        expect(pm.predictedPosition.y).toBe(260);

        // Server processed sequence 1, confirming we are at 280
        pm.onServerState({ x: 400, y: 280 }, 1);

        // Only seq 2 should remain
        expect(pm.pendingInputs.length).toBe(1);
        expect(pm.pendingInputs[0].sequenceNumber).toBe(2);
    });

    it('4. Unacknowledged inputs are replayed AND 5. Client converges to server state', () => {
        // We press right twice
        pm.addInput({ sequenceNumber: 1, up: false, down: false, left: false, right: true, dt: 0.1 });
        pm.addInput({ sequenceNumber: 2, up: false, down: false, left: false, right: true, dt: 0.1 });

        // Locally predicted is (440)
        expect(pm.predictedPosition.x).toBe(440);

        // Say the server lagged or encountered logic that constrained sequence 1 slightly to (418) instead of (420)
        pm.onServerState({ x: 418, y: 300 }, 1);

        // The reconciliation engine should have:
        // 1. Snapped authoritative base to 418
        // 2. Discarded seq 1
        // 3. Replayed seq 2 (moving right by 20 units based on dt 0.1)
        expect(pm.pendingInputs.length).toBe(1);
        expect(pm.predictedPosition.x).toBe(438); // 418 + 20
        expect(pm.predictedPosition.y).toBe(300);
    });
});
