# Client Prediction & Reconciliation

## Overview
Because network latency delay breaks immersive responsive interactions, `Client Prediction` fundamentally predicts the Authoritative Server's future mathematical state instantly upon the user pressing a key. `Server Reconciliation` corrects eventual mathematical drift by aligning predictions explicitly natively.

## The 7-Step Pipeline (Actually Implemented)

1. **Input Creation**:
   The Vite React UI natively captures `WASD` bindings. At ~60Hz, it extracts exactly what keys are pressed down and calculates the exact floating point `dt` (Delta Time) natively mapping explicit millisecond spans.

2. **Sequence Numbers**:
   Every Input structure is sequentially identified by an atomically augmenting `sequenceNumber`.
   Example: `{ sequenceNumber: 154, up: true, dt: 0.016 }`

3. **Local Prediction**:
   The client injects this input immediately into an internal loop utilizing `PredictionManager.addInput(input)`. It natively executes `applyInput(pos, input, dt)` using exactly the identical shared logic as the node server. It pushes the payload to the local `pendingInputs[]` array.

4. **Network Dispatch**:
   The input is encoded via JSON into the `ws` network stream natively bounded.

5. **Server Acknowledgement**:
   When the Server organically evaluates its 60Hz tick, it resolves the input queue, executing physics, and binds the resolved `sequenceNumber` securely cleanly under `lastProcessedInputNumber` across the outbound `STATE` payload broadcast.

6. **Reconciliation**:
   Upon intercepting `STATE`, the Client cleanly filters its `pendingInputs` discarding bounds parsed `unackedInput.sequenceNumber <= lastProcessedInputNumber`.

7. **Correction & Replay**:
   The Client `authoritativePosition` is assigned identically to the Server's payload mapping `x, y` explicitly identically. The remaining `pendingInputs` are instantly evaluated re-applying prediction continuously over the newly anchored state.

## Prediction Error Magnitude
If the mathematical vectors diverge due to out-of-order latency manipulation cleanly intercepted, `predictionError` tracks the vector distance explicitly cleanly using native `Math.sqrt(...)` distances. If it diverges heavily, the visual engine snaps back to the authoritative limit.
