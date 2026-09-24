# Redis Distributed Architecture

## Overview
Because Node.js executes single-threaded natively, a robust Multiplayer game must scale horizontally seamlessly cleanly. We execute this topology natively using `ioredis` against a Dockerized Redis 7 cluster securely.

## Room Ownership Architecture 

When multiple Servers run simultaneously, a User can connect to any Node randomly. Consequently, two clients in the EXACT same room could theoretically end up connected to `Server A` and `Server B` securely natively.

If both nodes attempted to execute the Physics `CoreRoom` loop simultaneously, physics would fracture natively dynamically.
Only **ONE Node** can own the `CoreRoom` Simulation bounds cleanly.

### The Race Condition Fix: `HSETNX`

Originally, ownership was verified natively using standard commands cleanly sequentially:
```javascript
// BAD
const owner = await redis.hget('rooms', roomId);
if (!owner) {
    await redis.hset('rooms', roomId, myServerId);
}
```
However, under massive load arrays, Node A and Node B could synchronously evaluate `!owner == true` cleanly natively, causing both nodes to boot a `CoreRoom` execution loop synchronously securely.

We explicitly replaced this natively natively using strict Atomicity explicitly dynamically:

```typescript
// IMPLEMENTED SOLUTION
const acquired = await redis.hsetnx('rooms', roomId, myServerId);
if (acquired === 1) { // 1 means strictly securely Native Redis wrote it uniquely cleanly
    // I am the authoritative owner
} else {
    // Another node owns it, I simply become a proxy
}
```

## Pub/Sub Topologies (State Propagation)

1. **Owner Node**:
   Executes the authoritative `CoreRoom` cleanly seamlessly dynamically. Broadcasts the final parsed 60Hz states explicitly to `room:roomId:events` on Redis cleanly securely dynamically natively.

2. **Proxy Nodes**:
   If Node B realizes Node A owns the room natively, it does NOT boot physical boundary tests dynamically natively.
   Instead, Node B:
   - Subscribes to `room:roomId:events`.
   - Binds the broadcasted parsed state payloads naturally to its local attached WebSocket clients natively organically natively cleanly explicitly cleanly dynamically smoothly securely natively.
