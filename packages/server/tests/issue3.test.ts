import { describe, it, expect } from 'vitest';
import { ClientMessageSchema } from 'shared';

describe('Issue 3: Real Zod Validation', () => {
    it('rejects completely malformed message structures safely', () => {
        const payload = { type: 'FAKE_TYPE', arbitraryProp: 123 };
        const result = ClientMessageSchema.safeParse(payload);

        expect(result.success).toBe(false);
    });

    it('rejects input packets traversing negative or huge dt scales', () => {
        const payload = {
            type: 'INPUT',
            input: {
                sequenceNumber: 1, up: true, down: false, left: false, right: false,
                dt: 5000 // Huge dt! (Schema restricts to 0.1)
            }
        };

        const result = ClientMessageSchema.safeParse(payload);
        expect(result.success).toBe(false);
    });

    it('accepts perfectly formatted sequences', () => {
        const payload = {
            type: 'INPUT',
            input: {
                sequenceNumber: 1, up: true, down: false, left: false, right: false,
                dt: 0.1
            }
        };

        const result = ClientMessageSchema.safeParse(payload);
        expect(result.success).toBe(true);
    });
});
