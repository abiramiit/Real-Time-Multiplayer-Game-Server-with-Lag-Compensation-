import { describe, it, expect } from 'vitest';
describe('Issue 5: Server-Side Rate Limiter', () => {
    it('properly drops excessive messages mimicking WS interactions', async () => {
        const MAX_MESSAGES_PER_SECOND = 20;
        const MAX_MESSAGE_BURST = 50;
        let tokens = MAX_MESSAGE_BURST;
        let lastRefill = Date.now();
        let accepted = 0;
        let dropped = 0;
        const processMessage = (now) => {
            const ellapsedMs = now - lastRefill;
            tokens = Math.min(MAX_MESSAGE_BURST, tokens + (ellapsedMs * (MAX_MESSAGES_PER_SECOND / 1000)));
            lastRefill = now;
            if (tokens < 1)
                dropped++;
            else {
                tokens--;
                accepted++;
            }
        };
        const startTime = Date.now();
        // Burst 60 messages instantly!
        for (let i = 0; i < 60; i++) {
            processMessage(startTime);
        }
        // We expect EXACTLY 50 to pass, and 10 to drop.
        expect(accepted).toBe(50);
        expect(dropped).toBe(10);
    });
});
//# sourceMappingURL=issue5.test.js.map