import pino from 'pino';
import type { Logger } from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger: Logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: isDev ? ({
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
    } as any) : undefined
});
