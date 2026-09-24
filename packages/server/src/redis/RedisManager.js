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
    }
}
export const redisManager = new RedisManager();
//# sourceMappingURL=RedisManager.js.map