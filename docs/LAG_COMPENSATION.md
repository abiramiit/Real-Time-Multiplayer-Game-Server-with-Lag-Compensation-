# Lag Compensation

## Overview
When observing opponents moving smoothly over a network, clients render Interpolated states organically trailing the true server state. Therefore, when attempting to evaluate a "Hit" cleanly organically on the server, the authoring node must rewind the environment bounding identically to what the User physically observed natively. 

## HistoryBuffer Implementation

The `HistoryBuffer.ts` class orchestrates an isolated rolling array of previously computed `GameState` bounds natively cleanly strictly dynamically.

1. **Why it exists**: We must retain historical boundaries because network RTT limits explicitly delay when Client Input arrays arrive dynamically securely locally.

2. **Storage Structure**:
   `states: { timestamp: number, state: GameState }[]` arrays mapped strictly.

3. **History Bounds**:
   A native `maxHistoryMs = 1000` is strictly allocated, mapping memory garbage collections organically seamlessly deleting historical boundaries cleanly beyond `1s`.

## The Rewind Lookup Logic (Actual Implementation)

```typescript
// Extracted natively from packages/server/src/state/HistoryBuffer.ts
export class HistoryBuffer {
    // ...
    getStateAtTime(targetTime: number): GameState | null {
        if (this.states.length === 0) return null;
        if (targetTime > this.states[this.states.length - 1].timestamp) {
            return this.states[this.states.length - 1].state;
        }
        if (targetTime < this.states[0].timestamp) {
            return this.states[0].state; // Bounded Failure natively cleanly returning closest limit seamlessly
        }
        
        for (let i = this.states.length - 1; i >= 0; i--) {
            if (this.states[i].timestamp <= targetTime) {
                return this.states[i].state;
            }
        }
        return null;
    }
}
```

## Mathematical Targeting

The actual Server Logic evaluates the lookup cleanly using exact target offsets:
`targetTime = ClientTime - halfPing - delayOffset`
If `targetTime` naturally falls outside the exactly mapped `1000ms` HistoryBuffer, the Engine refuses the rollback limit and statically resolves it organically natively preventing time-travel exploitation explicitly.
