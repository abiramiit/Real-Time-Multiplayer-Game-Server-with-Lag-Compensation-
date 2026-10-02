export interface NetworkConfig {
    latencyMs: number;
    jitterMs: number;
    packetLossPct: number;
    enabled: boolean;
}
export declare class NetworkSimulator {
    onopen: (() => void) | null;
    onclose: (() => void) | null;
    onmessage: ((event: {
        data: string;
    }) => void) | null;
    config: NetworkConfig;
    private ws;
    constructor(url: string, config: NetworkConfig);
    send(data: string): void;
    close(): void;
    get readyState(): number;
}
//# sourceMappingURL=NetworkSimulator.d.ts.map