import WebSocket from 'ws';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function testGame() {
    const ws = new WebSocket('ws://localhost:8080');
    let connected = false;
    let joined = false;
    let receivedState = false;

    ws.on('open', async () => {
        connected = true;
        console.log('WS CONNECTED');
        ws.send(JSON.stringify({ type: 'JOIN', roomId: 'lobby' }));
    });

    ws.on('message', async (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'WELCOME') {
            joined = true;
            console.log('PLAYER JOINED. ID:', msg.id);
            // Send synthetic input
            ws.send(JSON.stringify({
                type: 'INPUT',
                input: { sequenceNumber: 1, up: true, down: false, left: false, right: false, dt: 0.016 }
            }));
        } else if (msg.type === 'STATE') {
            if (msg.players.length > 0) {
                receivedState = true;
                console.log('RECEIVED AUTHORITATIVE STATE!', msg.players.length, 'players');
                ws.close();
            }
        }
    });

    ws.on('close', () => {
        if (connected && joined && receivedState) {
            console.log('TEST PASS');
            process.exit(0);
        } else {
            console.log('TEST FAIL');
            process.exit(1);
        }
    });

    ws.on('error', (err) => {
        console.log('WS ERROR:', err.message);
        process.exit(1);
    });

    await delay(3000); // timeout
    ws.close();
}

testGame();
