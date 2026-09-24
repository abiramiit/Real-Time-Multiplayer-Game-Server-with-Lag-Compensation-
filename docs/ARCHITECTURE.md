# System Architecture

## 1. System Overview
The multiplayer game architecture is structurally rooted in Node.js, WebSockets (`ws`), and a strict Authoritative Server model. It leverages `ioredis` to safely distribute WebSocket loads across clustered Node.js backend nodes synchronously mapping concurrent events instantly natively. A React (`vite`) frontend acts strictly as a dumb physical terminal applying prediction logic conditionally, relying on Server `STATE` snapshots to dictate mathematical reality.

## 2. Component Responsibilities
- **`packages/client`**: Frontend UI/Rendering layer. Responsible for capturing user inputs, deploying Client-Side Prediction, managing the HTML5 Canvas, predicting remote entities through Interpolation, and handling WebSocket telemetry mapping.
- **`packages/server`**: Backend Node.js engine. Owns the Authoritative Physics loops. Operates fixed discrete tick processing (60Hz default), maintaining `CoreRoom`, historical rollback arrays (`HistoryBuffer`), and rate-limiter buckets.
- **`packages/shared`**: Shared TypeScript payloads. Defines unified strictly enforced Zod schemas (e.g., `ClientMessageSchema`), exact mathematical models for Velocity/Acceleration scaling (`Vector2`), and determinism (`applyInput`).

## 3. Server Architecture
The Server clusters multiple Node.js runtimes using PM2/Docker mapping. Each process operates uniquely but interfaces via Redis to exchange WebSocket lifecycle markers natively. A Server natively validates inputs through Zod validation boundaries, pushes validated sequences into a local heap `InputQueue`, and applies physics loops purely.

## 4. Client Architecture
The Client is built on Vite + React. The network pipeline uses `NetworkSimulator` (to forcefully inject artificial limits) wrapping `WebSocket`. Movement physics is purely applied utilizing `PredictionManager.ts` dynamically checking local predictive limits against lagging authoritative boundaries seamlessly seamlessly correcting visual artifacts natively.

## 5. Redis Architecture
We use a standard Redis (7-alpine) Pub/Sub execution node mapping natively to handle explicit load boundaries. Dual topologies are utilized:
- **Pub/Sub**: Synchronizing `PLAYER_JOINED`, `PLAYER_STATE_UPDATED`. If Player A on Node 1 moves, Node 1 evaluates the physics and broadcasts it directly to Node 2 natively tracking state constraints explicitly.
- **K/V Locking**: `HSETNX` guarantees one single authoritative Node uniquely owns the physical Tick Loop for any Room natively.

## 6. Networking Architecture
Uses raw WebSocket sockets over TCP. Bi-directional, persistent, connection-oriented socket streams. The payload boundary defines highly structural explicit Typescript Discriminant Unions (ClientMessageType vs ServerMessageType) explicitly serializing and deserializing instantly over the native runtime seamlessly dynamically natively.

## 7. Physics Architecture
The physics pipeline operates purely statelessly natively mapping `Vector2` structures through `applyInput(pos, input, dt)`. Acceleration bounds and max velocities are locked completely identically in the `shared` module natively executing both on the Server prediction cluster and the Client prediction cluster natively perfectly eliminating floating point differences structurally. 

## 8. Security Architecture
The networking boundaries explicitly isolate abusive nodes transparently. The execution loop includes per-connection Native Token Bucket limitations natively evaluating packet limits per second. Input Arrays are hardcapped to a maximum sequence tracking delta safely preventing time-warp spoofing seamlessly dynamically cleanly.

## 9. Testing Architecture
Vitest is utilized natively inside the execution framework deploying Headless physics arrays completely verifying HistoryBuffer arrays mapping and prediction mathematics perfectly cleanly dynamically synchronously. 

## 10. Deployment Architecture
Docker Compose maps dual node targets naturally instantiating frontend compilation topologies separately from Node backend binaries natively securing port topologies cleanly cleanly isolating proxy parameters. 
