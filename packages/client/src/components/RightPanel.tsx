import { Server, Activity, Shield, Tv, Users, ChevronUp } from 'lucide-react';

export function RightPanel({ connected, serverPort, roomId, playerCount, rtt, netConfig, players, myId }: any) {
    const isOnline = connected;

    return (
        <div className="side-panel right-panel">

            {/* Connection Status Panel */}
            <div className="panel-card">
                <div className="card-title">
                    <div className="title-left">
                        <div className="circle-icon green"></div> Connection Status
                    </div>
                </div>
                <div className="status-banner">
                    <div className="status-ring"></div>
                    <div className="status-text">
                        <div className="status-strong">Connected</div>
                        <div className="status-sub">WebSocket &bull; Stable</div>
                    </div>
                    <Activity size={24} color="#10b981" style={{ marginLeft: 'auto', opacity: 0.8 }} />
                </div>
            </div>

            {/* Room Details Panel */}
            <div className="panel-card">
                <div className="card-title">
                    <div className="title-left"><Server size={16} color="#8b5cf6" /> Room Details</div>
                </div>
                <div className="room-detail-row"><span>Room ID</span><span className="val">{roomId}</span></div>
                <div className="room-detail-row"><span>Players</span><span className="val">{playerCount}/8</span></div>
                <div className="room-detail-row"><span>Server</span><span className="val-edge">A ({serverPort}) <span className="dot green"></span></span></div>
            </div>

            {/* Diagnostic Metrics */}
            <div className="panel-card">
                <div className="card-title">
                    <div className="title-left"><Activity size={16} color="#63d2ff" /> Diagnostic Metrics</div>
                    <ChevronUp size={16} color="#475569" />
                </div>
                <div className="metrics-grid">
                    <div className="metric-box">
                        <span className="m-label">Latency</span>
                        <div className="m-value-row">
                            <span className="m-val green">{rtt} ms</span>
                            <Activity size={16} color="#10b981" />
                        </div>
                    </div>
                    <div className="metric-box">
                        <span className="m-label">Packet Loss</span>
                        <div className="m-value-row">
                            <span className="m-val blue">{netConfig.packetLossPct}%</span>
                            <Shield size={16} color="#3b82f6" />
                        </div>
                    </div>
                    <div className="metric-box">
                        <span className="m-label">Jitter</span>
                        <div className="m-value-row">
                            <span className="m-val purple">3 ms</span>
                            <Activity size={16} color="#8b5cf6" />
                        </div>
                    </div>
                    <div className="metric-box">
                        <span className="m-label">FPS</span>
                        <div className="m-value-row">
                            <span className="m-val yellow">60</span>
                            <Tv size={16} color="#facc15" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Players List */}
            <div className="panel-card">
                <div className="card-title">
                    <div className="title-left"><Users size={16} color="#63d2ff" /> Players</div>
                    <ChevronUp size={16} color="#475569" />
                </div>
                <div className="player-list">
                    {players.map((p: any, i: number) => {
                        const isMe = p.id === myId;
                        const colorClass = isMe ? 'p-blue' : 'p-pink';
                        return (
                            <div key={p.id} className="player-row">
                                <div className="p-left">
                                    <div className={`p-dot ${colorClass}`}></div>
                                    <span className="p-name">{isMe ? 'You' : `Player ${p.id.substring(0, 3)}`}</span>
                                    {isMe && <span className="crown">👑</span>}
                                    <span className="p-server">({serverPort === '8080' ? 'Server A' : 'Server B'})</span>
                                </div>
                                <div className="p-ready badge-green">Ready</div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}
