import Redis from 'ioredis';
export var RedisEventType;
(function (RedisEventType) {
    RedisEventType["PLAYER_JOINED"] = "PLAYER_JOINED";
    RedisEventType["PLAYER_LEFT"] = "PLAYER_LEFT";
    RedisEventType["INPUT_FORWARD"] = "INPUT_FORWARD";
    RedisEventType["ATTACK_FORWARD"] = "ATTACK_FORWARD";
    RedisEventType["PLAYER_STATE_UPDATED"] = "PLAYER_STATE_UPDATED";
    RedisEventType["ROOM_CREATED"] = "ROOM_CREATED";
    RedisEventType["ROOM_CLOSED"] = "ROOM_CLOSED";
})(RedisEventType || (RedisEventType = {}));
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
export class RedisManager {
    pub;
    sub;
    constructor() {
        this.pub = new Redis(REDIS_URL);
        this.sub = new Redis(REDIS_URL);
        // Prevent Unhandled 'error' events from crashing the node process
        this.pub.on('error', (err) => console.error('\x1b[31m[Redis Pub] Error: Cannot connect to Redis!\x1b[0m Please ensure Docker is running or Redis is installed on this machine.', err.message));
        this.sub.on('error', (err) => console.error('\x1b[31m[Redis Sub] Error: Cannot connect to Redis!\x1b[0m', err.message));
    }
}
export const redisManager = new RedisManager();
//# sourceMappingURL=RedisManager.js.map