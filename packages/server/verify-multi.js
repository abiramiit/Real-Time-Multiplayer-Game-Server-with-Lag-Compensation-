const WebSocket = require('ws');

async function testMultiServer() {
    console.log("Connecting to Docker Node A (8080) and Node B (8081)...");
    const wsA = new WebSocket('ws://localhost:8080'); // Main Backend
    const wsB = new WebSocket('ws://localhost:8081'); // Secondary Backend

    let A_connected = false;
    let B_connected = false;
    let A_states = 0;
    let B_states = 0;
    const room = "docker-verification-room";

    wsA.on('open', () => {
        A_connected = true;
        console.log("Node A Connected");
        wsA.send(JSON.stringify({ type: 'JOIN', roomId: room }));
    });

    wsA.on('message', (d) => {
        const msg = JSON.parse(d.toString());
        if (msg.type === 'STATE') A_states++;
    });

    wsB.on('open', () => {
        B_connected = true;
        console.log("Node B Connected");
        wsB.send(JSON.stringify({ type: 'JOIN', roomId: room }));
    });

    wsB.on('message', (d) => {
        const msg = JSON.parse(d.toString());
        if (msg.type === 'STATE') B_states++;
    });

    await new Promise(r => setTimeout(r, 2000));

    if (A_connected && B_connected) {
        console.log("MULTI-SERVER TOPOLOGY: CONNECTED");
    } else {
        console.log("MULTI-SERVER TOPOLOGY: FAILED (No connection)");
        process.exit(1);
    }

    if (A_states > 5 && B_states > 5) {
        console.log("REDIS PUB/SUB SYNCHRONIZATION: PASS");
    } else {
        console.log(`REDIS PUB/SUB SYNCHRONIZATION: FAIL (A_states: ${A_states}, B_states: ${B_states})`);
        process.exit(1);
    }

    wsA.close();
    wsB.close();
    console.log("MULTI-SERVER END-TO-END VALIDATION COMPLETED NATIVELY!");
    process.exit(0);
}

testMultiServer().catch(console.error);
