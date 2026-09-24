import { WebSocket } from 'ws';
import { CoreRoom } from './logic/CoreRoom';
declare const wss: import("ws").Server<typeof WebSocket, typeof import("node:http").IncomingMessage>;
declare const activeRooms: Map<string, CoreRoom>;
export { wss, activeRooms };
//# sourceMappingURL=index.d.ts.map