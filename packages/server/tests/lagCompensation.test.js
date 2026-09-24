import { describe, it, expect } from 'vitest';
import { HistoryBuffer } from '../src/logic/HistoryBuffer';
const simulateTargetPath = (buffer, currentServerTime) => {
    let t = currentServerTime - 1000; // Simulated timeline starting 1 sec ago
    for (let i = 0; i <= 30; i++) {
        // 30 ticks of 33.33ms = ~1000ms. End tick is at currentServerTime
        buffer.pushSnapshot({
            timestamp: t,
            players: [
                { id: 'target', position: { x: 100 + (200 * (i * (1 / 30))), y: 300 }, lastProcessedInputNumber: i }
            ]
        });
        t += (1000 / 30); // ~33.33
    }
};
describe('Phase 5: Lag Compensation Algorithm Analysis', () => {
    it('Scenario 1 & 2: 0ms & 100ms Latency - Base exactness interpolation tests', () => {
        const buffer = new HistoryBuffer(500); // Max rewind 500ms
        const currentServerTime = 2000;
        simulateTargetPath(buffer, currentServerTime);
        const RTTs = [0, 100];
        for (const RTT of RTTs) {
            const pingDelay = RTT;
            const interpolationDelay = 100;
            const expectedTargetServerTime = currentServerTime - pingDelay - interpolationDelay;
            const correctHistoricalPosition = buffer.getHistoricalState(expectedTargetServerTime).find(p => p.id === 'target').position.x;
            // Uncompensated
            const uncompensatedPosition = buffer.getHistoricalState(currentServerTime).find(p => p.id === 'target').position.x;
            const error = uncompensatedPosition - correctHistoricalPosition;
            // Expected drift: 200 units/sec * requested rewind
            const expectedDrift = 200 * ((pingDelay + interpolationDelay) / 1000);
            expect(Math.abs(error - expectedDrift)).toBeLessThan(5);
        }
    });
    it('Scenario 3: 200ms Latency Comparison Mapping', () => {
        const buffer = new HistoryBuffer(500);
        const currentServerTime = 2000;
        simulateTargetPath(buffer, currentServerTime);
        const RTT = 200;
        const pingDelay = RTT;
        const interpolationDelay = 100;
        const rewindTime = pingDelay + interpolationDelay;
        const renderedPos = buffer.getHistoricalState(currentServerTime - rewindTime).find(p => p.id === 'target').position.x;
        const actualPos = buffer.getHistoricalState(currentServerTime).find(p => p.id === 'target').position.x;
        const missDistance = actualPos - renderedPos;
        expect(Math.abs(missDistance - 60)).toBeLessThan(5);
    });
    it('Scenario 4: 300ms Latency and Bounded Clamping', () => {
        const buffer = new HistoryBuffer(500);
        const currentServerTime = 3000;
        simulateTargetPath(buffer, currentServerTime);
        const RTT = 300;
        const pingDelay = RTT;
        const interpolationDelay = 100;
        const requestedRewind = pingDelay + interpolationDelay; // 400
        const clampedRewind = Math.min(requestedRewind, buffer.maxRewindMs); // 400
        expect(clampedRewind).toBe(400);
        const renderedPos = buffer.getHistoricalState(currentServerTime - clampedRewind).find(p => p.id === 'target').position.x;
        const actualPos = buffer.getHistoricalState(currentServerTime).find(p => p.id === 'target').position.x;
        const missDist = actualPos - renderedPos;
        // 400ms * 200 units/second = 80 units!
        expect(Math.abs(missDist - 80)).toBeLessThan(5);
    });
});
//# sourceMappingURL=lagCompensation.test.js.map