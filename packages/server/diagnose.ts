import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8080');
ws.on('open', () => {
    console.log("WebSocket connected. Sending JOIN.");
    ws.send(JSON.stringify({ type: 'JOIN', roomId: 'diag-room' }));
});

let welcomes = 0;
let states = 0;
let pings = 0;

ws.on('message', (d) => {
    const msg = JSON.parse(d.toString());
    if (msg.type === 'WELCOME') {
        welcomes++;
        console.log("Welcome received:", msg);
        // Fire input 0.5s after welcome to give CoreRoom time to subscribe completely organically
        setTimeout(() => {
            console.log("Sending INPUT.");
            ws.send(JSON.stringify({ type: 'INPUT', input: { sequenceNumber: 1, up: true, down: false, left: false, right: false, dt: 0.1 } }));
        }, 500);
    } else if (msg.type === 'STATE') {
        states++;
        if (states === 1) console.log("First STATE received:", JSON.stringify(msg, null, 2));
    } else if (msg.type === 'PING') {
        pings++;
    } else {
        console.log("Unknown msg:", msg.type);
    }
});

setTimeout(() => {
    console.log("Diagnostics after 3s:");
    console.log("Welcomes:", welcomes);
    console.log("States:", states);
    console.log("Pings:", pings);
    process.exit(0);
}, 3000);
