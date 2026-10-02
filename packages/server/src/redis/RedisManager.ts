import Redis from 'ioredis';

export enum RedisEventType {
    PLAYER_JOINED = 'PLAYER_JOINED',
    PLAYER_LEFT = 'PLAYER_LEFT',
    INPUT_FORWARD = 'INPUT_FORWARD',
    ATTACK_FORWARD = 'ATTACK_FORWARD',
    PLAYER_STATE_UPDATED = 'PLAYER_STATE_UPDATED',
    ROOM_CREATED = 'ROOM_CREATED',
    ROOM_CLOSED = 'ROOM_CLOSED',
}

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export class RedisManager {
    public pub: Redis;
    public sub: Redis;

    constructor() {
        this.pub = new Redis(REDIS_URL);
        this.sub = new Redis(REDIS_URL);

        // Prevent Unhandled 'error' events from crashing the node process
        this.pub.on('error', (err) => console.error('\x1b[31m[Redis Pub] Error: Cannot connect to Redis!\x1b[0m Please ensure Docker is running or Redis is installed on this machine.', err.message));
        this.sub.on('error', (err) => console.error('\x1b[31m[Redis Sub] Error: Cannot connect to Redis!\x1b[0m', err.message));
    }
}

export const redisManager = new RedisManager();
