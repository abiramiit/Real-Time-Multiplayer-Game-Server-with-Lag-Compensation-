export class NetworkSimulator {
    onopen = null;
    onclose = null;
    onmessage = null;
    config;
    ws;
    constructor(url, config) {
        this.config = config;
        this.ws = new WebSocket(url);
        this.ws.onopen = () => {
            if (this.onopen)
                this.onopen();
        };
        this.ws.onclose = () => {
            if (this.onclose)
                this.onclose();
        };
        // Incoming intercept
        this.ws.onmessage = (e) => {
            if (!this.config.enabled) {
                if (this.onmessage)
                    this.onmessage(e);
                return;
            }
            if (Math.random() * 100 < this.config.packetLossPct)
                return; // Drop!
            const jitter = (Math.random() * this.config.jitterMs * 2) - this.config.jitterMs;
            const delay = Math.max(0, this.config.latencyMs + jitter);
            setTimeout(() => {
                if (this.onmessage)
                    this.onmessage(e);
            }, delay);
        };
    }
    // Outgoing intercept
    send(data) {
        if (!this.config.enabled) {
            if (this.ws.readyState === WebSocket.OPEN)
                this.ws.send(data);
            return;
        }
        if (Math.random() * 100 < this.config.packetLossPct)
            return; // Drop!
        const jitter = (Math.random() * this.config.jitterMs * 2) - this.config.jitterMs;
        const delay = Math.max(0, this.config.latencyMs + jitter);
        setTimeout(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(data);
            }
        }, delay);
    }
    close() {
        this.ws.close();
    }
    get readyState() {
        return this.ws.readyState;
    }
}
//# sourceMappingURL=NetworkSimulator.js.map