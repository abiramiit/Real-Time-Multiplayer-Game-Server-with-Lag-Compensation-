import { Gamepad2, Settings, User, Users, Wifi } from 'lucide-react';

export function TopBar({ roomId, playerCount, rtt }: any) {
    return (
        <div className="top-bar">
            <div className="top-left">
                <Gamepad2 size={36} className="logo-icon" />
                <div className="logo-text">
                    <h1>Physics Engine</h1>
                    <p>Real-Time Multiplayer</p>
                </div>
            </div>

            <div className="top-center">
                <div className="header-pill">
                    <Users size={14} color="#63d2ff" /> Room: {roomId}
                </div>
                <div className="header-pill">
                    <div className="status-dot green"></div> Players: {playerCount}/8
                </div>
                <div className="header-pill" style={{ color: rtt < 80 ? '#4ade80' : '#facc15' }}>
                    <Wifi size={14} /> Ping: {rtt}ms
                </div>
            </div>

            <div className="top-right">
                <button className="icon-btn"><Settings size={20} /></button>
                <button className="user-btn"><User size={20} /></button>
            </div>
        </div>
    );
}
