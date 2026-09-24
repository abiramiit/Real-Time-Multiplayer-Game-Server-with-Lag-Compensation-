import { useEffect, useRef, useState } from 'react';
import type { ServerMessage, ClientMessage, PlayerState } from 'shared';
import { ServerMessageType, ClientMessageType, PLAYER_RADIUS, ATTACK_RADIUS } from 'shared';
import { PredictionManager } from './logic/PredictionManager';
import { InterpolationManager } from './logic/InterpolationManager';
import { NetworkSimulator } from './network/NetworkSimulator';
import type { NetworkConfig } from './network/NetworkSimulator';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { GameArena } from './components/GameArena';
import './App.css';

const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [serverPort, setServerPort] = useState('8080'); // Defaults to Node 1
  const [roomId, setRoomId] = useState('lobby');

  const [connected, setConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [myId, setMyId] = useState<string | null>(null);

  const [serverTick, setServerTick] = useState<number>(0);
  const [rtt, setRtt] = useState<number>(0);
  const [rttHistory, setRttHistory] = useState<{ time: string, rtt: number }[]>([]);

  const [pendingInputsCount, setPendingInputsCount] = useState<number>(0);
  const [lastAck, setLastAck] = useState<number>(0);
  const [predictionError, setPredictionError] = useState<number>(0);
  const [playerCount, setPlayerCount] = useState<number>(0);

  const [hits, setHits] = useState<{ [id: string]: number }>({});
  const hitsRef = useRef(hits);
  useEffect(() => { hitsRef.current = hits; }, [hits]);

  const [usePrediction, setUsePrediction] = useState(true);
  const [useInterpolation, setUseInterpolation] = useState(true);
  const [netConfig, setNetConfig] = useState<NetworkConfig>({
    latencyMs: 0, jitterMs: 0, packetLossPct: 0, enabled: false
  });

  const playersRef = useRef<PlayerState[]>([]);
  const wsRef = useRef<NetworkSimulator | null>(null);
  const myIdRef = useRef<string | null>(null);
  const sequenceNumberRef = useRef<number>(0);

  const pmRef = useRef<PredictionManager | null>(null);
  const imRef = useRef<InterpolationManager>(new InterpolationManager());

  useEffect(() => { myIdRef.current = myId; }, [myId]);

  useEffect(() => {
    if (wsRef.current) wsRef.current.close();

    const sim = new NetworkSimulator(`ws://localhost:${serverPort}`, netConfig);
    wsRef.current = sim;

    sim.onopen = () => {
      setConnected(true);
      setReconnectAttempt(0); // Reset backoff recursively
      const joinMsg: ClientMessage = { type: ClientMessageType.JOIN, roomId };
      sim.send(JSON.stringify(joinMsg));
    };

    sim.onclose = () => {
      setConnected(false);
      setMyId(null);
      pmRef.current = null;

      const backoff = Math.min(1000 * Math.pow(1.5, reconnectAttempt), 10000);
      setTimeout(() => {
        setReconnectAttempt(prev => prev + 1);
      }, backoff);
    };

    sim.onmessage = (event: any) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;

        if (msg.type === ServerMessageType.WELCOME) {
          setMyId(msg.id);
          pmRef.current = new PredictionManager({ x: 400, y: 300 });
        }
        else if (msg.type === ServerMessageType.STATE) {
          setServerTick(msg.tick);
          playersRef.current = msg.players;
          imRef.current.onServerState(msg.players);
          setPlayerCount(msg.players.length);

          if (pmRef.current && myIdRef.current) {
            const me = msg.players.find(p => p.id === myIdRef.current);
            if (me) {
              pmRef.current.onServerState(me.position, me.lastProcessedInputNumber);
              setLastAck(me.lastProcessedInputNumber);
              setPendingInputsCount(pmRef.current.pendingInputs.length);
              setPredictionError(pmRef.current.predictionError);
            }
          }
        }
        else if (msg.type === ServerMessageType.PONG) {
          const currentRtt = Date.now() - msg.clientTime;
          setRtt(currentRtt);
          setRttHistory(prev => {
            const now = [...prev, { time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }), rtt: currentRtt }];
            if (now.length > 30) return now.slice(now.length - 30);
            return now;
          });
        }
        else if (msg.type === ServerMessageType.PING) {
          sim.send(JSON.stringify({ type: ClientMessageType.PONG, serverTime: msg.serverTime }));
        }
        else if (msg.type === ServerMessageType.HIT) {
          setHits(prev => ({ ...prev, [msg.targetId]: performance.now() }));
        }
      } catch (e) { }
    };

    return () => sim.close();
  }, [netConfig.enabled, serverPort, roomId]);

  useEffect(() => {
    if (wsRef.current) wsRef.current.config = netConfig;
  }, [netConfig]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in keys) keys[e.key as keyof typeof keys] = true;
      if (e.code === 'Space') {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: ClientMessageType.ATTACK }));
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key in keys) keys[e.key as keyof typeof keys] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: ClientMessageType.PING, clientTime: Date.now() }));
      }
    }, 1000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(pingInterval);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastInputTime = performance.now();
    const INPUT_RATE_MS = 1000 / 60;
    const FIXED_DT = INPUT_RATE_MS / 1000;

    const loop = (time: number) => {
      const pm = pmRef.current;
      const im = imRef.current;

      if (time - lastInputTime > INPUT_RATE_MS) {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN && myIdRef.current && pm) {
          const up = keys.w || keys.ArrowUp;
          const down = keys.s || keys.ArrowDown;
          const left = keys.a || keys.ArrowLeft;
          const right = keys.d || keys.ArrowRight;

          if (up || down || left || right) {
            sequenceNumberRef.current++;
            const inputMsg: ClientMessage = {
              type: ClientMessageType.INPUT,
              input: { sequenceNumber: sequenceNumberRef.current, up, down, left, right, dt: FIXED_DT }
            };
            ws.send(JSON.stringify(inputMsg));

            if (usePrediction) {
              pm.addInput(inputMsg.input);
              setPendingInputsCount(pm.pendingInputs.length);
            }
          }
        }
        lastInputTime = time;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && pm) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const myActiveId = myIdRef.current;
        const currentHits = hitsRef.current;

        const interpolatedPlayers = useInterpolation ? im.getInterpolatedPlayers() : playersRef.current;
        const remoteDataSet = interpolatedPlayers || playersRef.current;

        remoteDataSet.forEach(p => {
          const isMe = p.id === myActiveId;
          const isHit = performance.now() - (currentHits[p.id] || 0) < 300;

          if (isMe && usePrediction) return; // Draw prediction later

          ctx.beginPath();
          ctx.roundRect(p.position.x - 15, p.position.y - 15, 30, 30, 6);
          const baseColor = isMe ? '#3b82f6' : (isHit ? '#fff' : '#ec4899');
          ctx.fillStyle = baseColor;
          ctx.fill();

          ctx.shadowColor = baseColor;
          ctx.shadowBlur = isHit ? 25 : 15;
          ctx.lineWidth = 2;
          ctx.strokeStyle = isHit ? '#facc15' : 'rgba(255,255,255,0.2)';
          ctx.stroke();
          ctx.shadowBlur = 0; // reset

          // Direction Marker (triangle)
          ctx.beginPath();
          ctx.moveTo(p.position.x, p.position.y - 25);
          ctx.lineTo(p.position.x - 8, p.position.y - 35);
          ctx.lineTo(p.position.x + 8, p.position.y - 35);
          ctx.fillStyle = baseColor;
          ctx.fill();

          // Nametag Pill
          ctx.beginPath();
          ctx.roundRect(p.position.x - 30, p.position.y - 65, 60, 20, 10);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fill();
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#fff';
          ctx.font = '10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(isMe ? 'You' : `Player ${p.id.substring(0, 1)}`, p.position.x, p.position.y - 51);

          if (!usePrediction && isMe) {
            ctx.beginPath();
            ctx.arc(p.position.x, p.position.y, ATTACK_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.stroke();
          }
        });

        if (usePrediction) {
          ctx.beginPath();
          ctx.roundRect(pm.predictedPosition.x - 15, pm.predictedPosition.y - 15, 30, 30, 6);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 15;
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Direction Marker
          ctx.beginPath();
          ctx.moveTo(pm.predictedPosition.x, pm.predictedPosition.y - 25);
          ctx.lineTo(pm.predictedPosition.x - 8, pm.predictedPosition.y - 35);
          ctx.lineTo(pm.predictedPosition.x + 8, pm.predictedPosition.y - 35);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();

          // Nametag Pill
          ctx.beginPath();
          ctx.roundRect(pm.predictedPosition.x - 30, pm.predictedPosition.y - 65, 60, 20, 10);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fill();
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#fff';
          ctx.font = '10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('You', pm.predictedPosition.x, pm.predictedPosition.y - 51);

          // Draw local attack radius precisely
          ctx.beginPath();
          ctx.arc(pm.predictedPosition.x, pm.predictedPosition.y, ATTACK_RADIUS, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [usePrediction, useInterpolation]);

  const updateSim = (key: keyof NetworkConfig, value: number | boolean) => {
    setNetConfig(prev => ({ ...prev, [key]: value }));
  };

  const getRttColor = (val: number) => val < 60 ? 'value-green' : val < 150 ? 'value-yellow' : 'value-red';

  return (
    <div className="dashboard-layout">
      <TopBar roomId={roomId} playerCount={playerCount} rtt={rtt} />

      <div className="main-content">

        <LeftPanel
          netConfig={netConfig}
          updateSim={updateSim}
          usePrediction={usePrediction}
          setUsePrediction={setUsePrediction}
          useInterpolation={useInterpolation}
          setUseInterpolation={setUseInterpolation}
          playerCount={playerCount}
          roomId={roomId}
        />

        <GameArena canvasRef={canvasRef} myId={myId} players={playersRef.current} />

        <RightPanel
          connected={connected}
          serverPort={serverPort}
          roomId={roomId}
          playerCount={playerCount}
          rtt={rtt}
          netConfig={netConfig}
          players={playersRef.current}
          myId={myId}
        />

      </div>
    </div>
  );
}

export default App;
