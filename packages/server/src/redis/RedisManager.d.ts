import Redis from 'ioredis';
export declare enum RedisEventType {
    PLAYER_JOINED = "PLAYER_JOINED",
    PLAYER_LEFT = "PLAYER_LEFT",
    INPUT_FORWARD = "INPUT_FORWARD",
    ATTACK_FORWARD = "ATTACK_FORWARD",
    PLAYER_STATE_UPDATED = "PLAYER_STATE_UPDATED",
    ROOM_CREATED = "ROOM_CREATED",
    ROOM_CLOSED = "ROOM_CLOSED"
}
export declare class RedisManager {
    pub: Redis;
    sub: Redis;
    constructor();
}
export declare const redisManager: RedisManager;
//# sourceMappingURL=RedisManager.d.ts.map