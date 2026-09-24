declare class MetricsManager {
    private lastCpu;
    init(serverId: string): void;
    trackTick(roomId: string, durationMs: number): void;
}
export declare const telemetry: MetricsManager;
export {};
//# sourceMappingURL=MetricsManager.d.ts.map