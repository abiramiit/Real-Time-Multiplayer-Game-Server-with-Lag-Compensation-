"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ws_1 = __importDefault(require("ws"));
const shared_1 = require("shared");
const index_1 = require("../src/index");
const PORT = 8080;
const URL = `ws://localhost:${PORT}`;
function connectClient() {
    return new Promise((resolve) => {
        const ws = new ws_1.default(URL);
        ws.on('open', () => resolve(ws));
    });
}
function waitForStateMessage(ws) {
    return new Promise((resolve) => {
        const listener = (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === shared_1.ServerMessageType.STATE) {
                ws.off('message', listener);
                resolve(msg);
            }
        };
        ws.on('message', listener);
    });
}
(0, vitest_1.describe)('Phase 2: Authoritative Server Movement', () => {
    let client1;
    let clientId;
    (0, vitest_1.afterAll)(() => {
        if (client1)
            client1.close();
        clearInterval(index_1.tickInterval);
        index_1.wss.close();
    });
    (0, vitest_1.test)('1. Client connects and receives WELCOME', async () => {
        client1 = await connectClient();
        client1.send(JSON.stringify({ type: shared_1.ClientMessageType.JOIN }));
        await new Promise(resolve => {
            const listener = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === shared_1.ServerMessageType.WELCOME) {
                    clientId = msg.id;
                    client1.off('message', listener);
                    resolve();
                }
            };
            client1.on('message', listener);
        });
        (0, vitest_1.expect)(clientId).toBeDefined();
    });
    (0, vitest_1.test)('2. input changes movement and sequence tracks strongly', async () => {
        client1.send(JSON.stringify({
            type: shared_1.ClientMessageType.INPUT,
            input: { sequenceNumber: 1, up: false, down: false, left: false, right: true }
        }));
        await new Promise(resolve => setTimeout(resolve, 80));
        const stateMsg = await waitForStateMessage(client1);
        const me = stateMsg.players.find((p) => p.id === clientId);
        (0, vitest_1.expect)(me.position.x).toBeGreaterThan(400);
        (0, vitest_1.expect)(me.lastProcessedInputNumber).toBe(1);
    });
    (0, vitest_1.test)('3. invalid input is rejected', async () => {
        client1.send(JSON.stringify({
            type: shared_1.ClientMessageType.INPUT,
            input: { sequenceNumber: 'invalid_type_str', up: 'true' }
        }));
        await new Promise(resolve => setTimeout(resolve, 80));
        const stateMsg = await waitForStateMessage(client1);
        const me = stateMsg.players.find((p) => p.id === clientId);
        (0, vitest_1.expect)(me.lastProcessedInputNumber).toBe(1);
    });
    (0, vitest_1.test)('4. player cannot move outside world', async () => {
        // Move left for 2.5 seconds (75 inputs at ~33ms) to hit the left wall.
        for (let i = 0; i < 75; i++) {
            client1.send(JSON.stringify({
                type: shared_1.ClientMessageType.INPUT,
                input: { sequenceNumber: 10 + i, up: false, down: false, left: true, right: false }
            }));
            await new Promise(r => setTimeout(r, 33));
        }
        const stateMsg = await waitForStateMessage(client1);
        const me = stateMsg.players.find((p) => p.id === clientId);
        // Ensure bounds logic works and clamped to the edge exactly without passing x=0
        (0, vitest_1.expect)(me.position.x).toBe(shared_1.PLAYER_RADIUS);
    }, 10000); // Allow test to run up to 10s
    (0, vitest_1.test)('5. multiple players remain synchronized', async () => {
        const client2 = await connectClient();
        client2.send(JSON.stringify({ type: shared_1.ClientMessageType.JOIN }));
        let p2Id = '';
        await new Promise(resolve => {
            const listener = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === shared_1.ServerMessageType.WELCOME) {
                    p2Id = msg.id;
                    resolve();
                }
            };
            client2.once('message', listener);
        });
        client2.send(JSON.stringify({
            type: shared_1.ClientMessageType.INPUT,
            input: { sequenceNumber: 1, up: false, down: true, left: false, right: false }
        }));
        await new Promise(resolve => setTimeout(resolve, 100));
        const stateMsg = await waitForStateMessage(client1);
        const client2State = stateMsg.players.find((p) => p.id === p2Id);
        // Check standard movement over network
        (0, vitest_1.expect)(client2State.position.y).toBeGreaterThan(300);
        client2.close();
    });
});
//# sourceMappingURL=server.test.js.map