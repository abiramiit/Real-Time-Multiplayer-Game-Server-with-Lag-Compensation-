import { describe, it, expect, vi } from 'vitest';
import { InterpolationManager } from '../src/logic/InterpolationManager';
import { PlayerState } from 'shared';

const snapshot = (x: number, y: number): PlayerState[] => [{
    id: 'p1', position: { x, y }, lastProcessedInputNumber: 1
}];

describe('Phase 4: Interpolation Manager & Scenarios', () => {

    it('Scenario A: Baseline 0ms Delay Interpolation checks out', () => {
        const im = new InterpolationManager();
        im.interpolationDelayMs = 100;

        let currentTime = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

        // Receive state at Target A
        im.onServerState(snapshot(100, 0));

        // 50ms pass... next tick arrives
        currentTime = 1050;
        im.onServerState(snapshot(150, 0));

        // We are currently rendering strictly -100ms in the past (t=950). We gracefully gracefully bound to the oldest known.
        let render = im.getInterpolatedPlayers()!;
        expect(render[0].position.x).toBe(100);

        // At t=1100, target rendering time is exactly t=1000. It snaps perfectly to State A.
        currentTime = 1100;
        render = im.getInterpolatedPlayers()!;
        expect(render[0].position.x).toBe(100);

        // At t=1125, target is t=1025. It smoothly blends 50% between State A (100) and State B (150).
        currentTime = 1125;
        render = im.getInterpolatedPlayers()!;
        expect(render[0].position.x).toBe(125);

        vi.restoreAllMocks();
    });

});
