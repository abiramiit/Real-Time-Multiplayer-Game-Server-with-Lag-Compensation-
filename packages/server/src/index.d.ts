import { WebSocket } from 'ws';
import { CoreRoom } from './logic/CoreRoom';
import http from 'http';
declare const wss: import("ws").Server<typeof WebSocket, typeof http.IncomingMessage>;
declare const activeRooms: Map<string, CoreRoom>;
export { wss, activeRooms };
//# sourceMappingURL=index.d.ts.map