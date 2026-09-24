import { MousePointer2, Keyboard, LocateFixed, Activity } from 'lucide-react';
import type { RefObject } from 'react';

export function GameArena({ canvasRef, myId, players }: { canvasRef: RefObject<HTMLCanvasElement | null>, myId: string | null, players: any[] }) {
    return (
        <div className="arena-wrapper">
            <div className="arena-border-glow">
                <canvas className="arena-canvas" ref={canvasRef} width={800} height={600} tabIndex={0}></canvas>

                <div className="hud-overlay-container">
                    <div className="hud-top">
                        <div className="hud-top-left">
                            <LocateFixed size={18} color="#00E5FF" />
                            <span>ROOM: LOBBY</span>
                        </div>
                        <div className="hud-top-right">
                            <span>SERVER: A</span>
                            <Activity size={18} color="#f99e1a" />
                        </div>
                    </div>

                    <div className="hud-bottom">
                        <div className="hud-server-info" style={{ borderLeftColor: '#f99e1a' }}>
                            <span>MOVEMENT</span>
                            <Keyboard size={14} style={{ display: 'inline', marginRight: '4px' }} /> W A S D
                        </div>

                        <div className="hud-server-info">
                            <span>COMBAT</span>
                            <MousePointer2 size={14} style={{ display: 'inline', marginRight: '4px' }} /> ACTION
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
