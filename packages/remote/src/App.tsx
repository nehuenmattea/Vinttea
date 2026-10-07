import { useState, useEffect, useRef } from 'preact/hooks';
import type { PlayerState, CommandAction, VintteaMessage } from '@vinttea/shared';

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function App() {
  const [serverConnected, setServerConnected] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [state, setState] = useState<PlayerState>({
    playing: false,
    title: 'Esperando video...',
    position: 0,
    duration: 0,
    volume: 1,
    muted: false,
    service: 'Esperando',
  });

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: any = null;

    function connect() {
      // Connect to server port 9876
      const host = window.location.hostname || 'localhost';
      const wsUrl = `ws://${host}:9876/ws?role=remote`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setServerConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as VintteaMessage;
          if (msg.type === 'status') {
            setExtensionConnected(msg.extensionConnected);
          } else if (msg.type === 'state') {
            setState(msg.state);
          }
        } catch (err) {
          console.error(err);
        }
      };

      ws.onclose = () => {
        setServerConnected(false);
        setExtensionConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const sendCommand = (action: CommandAction, value?: number) => {
    if (navigator.vibrate) {
      navigator.vibrate(35);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'command', action, value }));
    }
  };

  const progressPercent =
    state.duration > 0 ? Math.min(100, Math.max(0, (state.position / state.duration) * 100)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 4px',
        }}
      >
        <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Vint<span style={{ color: 'var(--accent)' }}>tea</span>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 9999,
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background:
                serverConnected && extensionConnected
                  ? 'var(--success)'
                  : serverConnected
                  ? 'var(--warning)'
                  : '#ef4444',
            }}
          />
          <span>
            {serverConnected && extensionConnected
              ? 'PC Conectada'
              : serverConnected
              ? 'Extensión Offline'
              : 'Desconectado'}
          </span>
        </div>
      </header>

      {/* Now Playing Card */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 18,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {state.service || 'VIDEO'}
        </div>

        <div
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {state.title}
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: 6,
            background: '#2d3345',
            borderRadius: 3,
            position: 'relative',
            marginTop: 4,
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'var(--accent)',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>{formatTime(state.position)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Primary Media Controls */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 18,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 12 }}>
          <button
            onClick={() => sendCommand('seek', -10)}
            style={btnStyle}
          >
            <span style={{ fontSize: '1.4rem' }}>⏪</span>
            <span style={btnLabelStyle}>-10s</span>
          </button>

          <button
            onClick={() => sendCommand('togglePlay')}
            style={{
              ...btnStyle,
              background: 'var(--accent)',
              borderColor: 'var(--accent)',
              boxShadow: '0 4px 18px var(--accent-glow)',
            }}
          >
            <span style={{ fontSize: '1.8rem' }}>{state.playing ? '⏸' : '▶'}</span>
            <span style={{ ...btnLabelStyle, color: '#fff', fontWeight: 700 }}>
              {state.playing ? 'Pausar' : 'Reproducir'}
            </span>
          </button>

          <button
            onClick={() => sendCommand('seek', 10)}
            style={btnStyle}
          >
            <span style={{ fontSize: '1.4rem' }}>⏩</span>
            <span style={btnLabelStyle}>+10s</span>
          </button>
        </div>

        {/* Next & Prev Episode */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
          <button
            onClick={() => sendCommand('prevEpisode')}
            style={btnStyle}
          >
            <span style={{ fontSize: '1.2rem' }}>⏮️</span>
            <span style={btnLabelStyle}>Anterior</span>
          </button>

          <button
            onClick={() => sendCommand('nextEpisode')}
            style={btnStyle}
          >
            <span style={{ fontSize: '1.2rem' }}>⏭️</span>
            <span style={btnLabelStyle}>Siguiente</span>
          </button>
        </div>
      </div>

      {/* Audio & Display Controls */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 18,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            onClick={() => sendCommand('toggleMute')}
            style={btnStyle}
          >
            <span style={{ fontSize: '1.3rem' }}>{state.muted ? '🔇' : '🔊'}</span>
            <span style={btnLabelStyle}>{state.muted ? 'Desmutear' : 'Silenciar'}</span>
          </button>

          <button
            onClick={() => sendCommand('toggleFullscreen')}
            style={btnStyle}
          >
            <span style={{ fontSize: '1.3rem' }}>⛶</span>
            <span style={btnLabelStyle}>Pantalla completa</span>
          </button>
        </div>

        {/* Volume Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 6px' }}>
          <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>🔉</span>
          <input
            type="range"
            min="0"
            max="100"
            value={state.muted ? 0 : Math.round(state.volume * 100)}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              sendCommand('setVolume', Number(target.value) / 100);
            }}
            style={{
              flex: 1,
              accentColor: 'var(--accent)',
              cursor: 'pointer',
              height: 6,
            }}
          />
          <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>🔊</span>
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  background: '#1d2232',
  border: '1px solid var(--card-border)',
  color: '#fff',
  borderRadius: 14,
  padding: '16px 10px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  userSelect: 'none' as const,
  transition: 'transform 0.1s, background 0.15s',
};

const btnLabelStyle = {
  fontSize: '0.8rem',
  color: 'var(--text-muted)',
  fontWeight: 500,
};
