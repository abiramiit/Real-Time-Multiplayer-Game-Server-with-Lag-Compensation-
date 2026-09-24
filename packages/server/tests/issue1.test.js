import { describe, it, expect } from 'vitest';
// Mock Redis environment inside Memory!
const mockDb = new Map();
const pub = {
    hdel: async (hash, field) => {
        if (mockDb.has(hash))
            mockDb.get(hash)?.delete(field);
        return 1;
    },
    hsetnx: async (hash, field, value) => {
        if (!mockDb.has(hash))
            mockDb.set(hash, new Map());
        const hm = mockDb.get(hash);
        if (hm.has(field))
            return 0; // Already acquired
        hm.set(field, value);
        return 1; // Success
    },
    hget: async (hash, field) => {
        if (!mockDb.has(hash))
            return null;
        return mockDb.get(hash)?.get(field) || null;
    }
};
describe('Issue 1 & 6: Redis Atomicity & Cleanup', () => {
    it('should assign ownership to exactly one server when attempted concurrently', async () => {
        const roomId = 'test-concurrent-room';
        await pub.hdel('rooms', roomId);
        const simulateNodeA = async () => {
            const acq = await pub.hsetnx('rooms', roomId, 'SERVER_A');
            return acq === 1 ? 'SERVER_A' : null;
        };
        const simulateNodeB = async () => {
            const acq = await pub.hsetnx('rooms', roomId, 'SERVER_B');
            return acq === 1 ? 'SERVER_B' : null;
        };
        const results = await Promise.all([simulateNodeA(), simulateNodeB()]);
        // Exactly one should win
        const winners = results.filter(r => r !== null);
        expect(winners.length).toBe(1);
        const owner = await pub.hget('rooms', roomId);
        expect(owner).toBe(winners[0]);
    });
});
//# sourceMappingURL=issue1.test.js.map