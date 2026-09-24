import { BarChart2, Gamepad2, User, Users, Rocket, ChevronUp } from 'lucide-react';

function Toggle({ checked, onChange }: any) {
    return (
        <div className="custom-switch" onClick={() => onChange(!checked)}>
            <input type="checkbox" checked={checked} readOnly />
            <span className="switch-slider"></span>
        </div>
    );
}

export function LeftPanel({ netConfig, updateSim, usePrediction, setUsePrediction, useInterpolation, setUseInterpolation, playerCount, roomId }: any) {
    return (
        <div className="side-panel left-panel">

            <div className="panel-card">
                <div className="card-title">
                    <div className="title-left"><BarChart2 size={16} color="#63d2ff" /> Network Simulation</div>
                    <ChevronUp size={16} color="#475569" />
                </div>
                <div className="control-slider">
                    <div className="slider-header"><span>Latency (ms)</span><span>{netConfig.latencyMs}</span></div>
                    <input type="range" min="0" max="300" step="10" value={netConfig.latencyMs} onChange={e => updateSim('latencyMs', parseInt(e.target.value))} />
                </div>
                <div className="control-slider" style={{ marginTop: '20px' }}>
                    <div className="slider-header"><span>Packet Loss (%)</span><span>{netConfig.packetLossPct}</span></div>
                    <input type="range" min="0" max="15" value={netConfig.packetLossPct} onChange={e => updateSim('packetLossPct', parseInt(e.target.value))} />
                </div>
            </div>

            <div className="panel-card">
                <div className="card-title">
                    <div className="title-left"><Gamepad2 size={16} color="#63d2ff" /> Game Features</div>
                    <ChevronUp size={16} color="#475569" />
                </div>
                <div className="toggle-row">
                    <span>⚙ Client Prediction</span>
                    <Toggle checked={usePrediction} onChange={setUsePrediction} />
                </div>
                <div className="toggle-row" style={{ border: 'none', paddingBottom: 0 }}>
                    <span>👥 Interpolation</span>
                    <Toggle checked={useInterpolation} onChange={setUseInterpolation} />
                </div>
            </div>

            <div className="panel-card">
                <div className="card-title">
                    <div className="title-left"><User size={16} color="#63d2ff" /> Player Info</div>
                    <ChevronUp size={16} color="#475569" />
                </div>
                <div className="info-row"><span>Your Color</span><div className="color-box"><div className="color-square blue"></div>Blue</div></div>
                <div className="info-row"><span>Players Online</span><span className="val"><Users size={12} /> {playerCount}</span></div>
                <div className="info-row"><span># Room ID</span><span className="val">{roomId}</span></div>
            </div>

            <button className="ready-button">
                <Rocket size={24} />
                <div className="ready-text">
                    <strong>Ready to Play!</strong>
                    <span>Move with WASD</span>
                </div>
            </button>

        </div>
    );
}
