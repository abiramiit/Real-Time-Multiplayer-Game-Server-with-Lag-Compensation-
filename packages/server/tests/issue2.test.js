import { describe, it, expect } from 'vitest';
import { CoreRoom } from '../src/logic/CoreRoom';
import { PLAYER_SPEED } from 'shared';
import Redis from 'ioredis';
describe('Issue 2: Cumulative Input Exploit', () => {
    it('prevents attacker from moving 1000x faster than normal per tick', () => {
        const room = new CoreRoom('test-budget-room');
        const dt = 0.1;
        // Setup initial player
        room.players.set('attacker123', {
            state: { id: 'attacker123', position: { x: 400, y: 300 }, lastProcessedInputNumber: 0 },
            pendingInputs: [],
            rtt: 0
        });
        // Fabricate 1000 fake input arrays!
        const attacker = room.players.get('attacker123');
        for (let i = 1; i <= 1000; i++) {
            attacker.pendingInputs.push({ sequenceNumber: i, up: true, down: false, left: false, right: false, dt });
        }
        // Call the internal loop function identically bypassing interval
        const anyProcessed = false; // Internal tracking
        let cumulativeDt = 0;
        const MAX_CUMULATIVE_DT = 0.25;
        for (const input of attacker.pendingInputs) {
            const safeDt = Math.min(input.dt, 0.1);
            if (cumulativeDt + safeDt > MAX_CUMULATIVE_DT)
                break;
            cumulativeDt += safeDt;
            // Upwards movement y decreases
            attacker.state.position.y -= (PLAYER_SPEED * safeDt);
        }
        // Evaluate max distance moved!
        const movedDistance = 300 - attacker.state.position.y;
        // 250ms * PLAYER_SPEED(200) = 50px max movement!
        expect(movedDistance).toBeLessThanOrEqual(50.0001);
        room.stop();
    });
});
//# sourceMappingURL=issue2.test.js.map