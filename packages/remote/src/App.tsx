import { useState, useEffect, useRef } from 'preact/hooks';
import type { PlayerState, CommandAction, VintteaMessage } from '@vinttea/shared';
import {
  IconPlay,
  IconPause,
  IconRewind10,
  IconForward10,
  IconSkipBack,
  IconSkipForward,
  IconVolume,
  IconVolumeMute,
  IconFullscreen,
  IconFastForward,
} from './icons';

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

interface ServiceConfig {
  name: string;
  badgeBg: string;
  badgeColor: string;
  accent: string;
}

const SERVICE_CONFIGS: Record<string, ServiceConfig> = {
  netflix: {
    name: 'Netflix',
    badgeBg: 'rgba(229, 9, 20, 0.15)',
    badgeColor: '#e50914',
    accent: '#e50914',
  },
  crunchyroll: {
    name: 'Crunchyroll',
    badgeBg: 'rgba(255, 100, 10, 0.15)',
    badgeColor: '#ff640a',
    accent: '#ff640a',
  },
  youtube: {
    name: 'YouTube',
    badgeBg: 'rgba(255, 0, 0, 0.15)',
    badgeColor: '#ff2d2d',
    accent: '#ff0000',
  },
  youtubemusic: {
    name: 'YouTube Music',
    badgeBg: 'rgba(255, 0, 51, 0.18)',
    badgeColor: '#ff0033',
    accent: '#ff0033',
  },
  prime: {
    name: 'Prime Video',
    badgeBg: 'rgba(0, 168, 225, 0.15)',
    badgeColor: '#00a8e1',
    accent: '#00a8e1',
  },
  generic: {
    name: 'Reproductor Web',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    badgeColor: '#818cf8',
    accent: '#6366f1',
  },
};

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
    service: 'generic',
    skipButton: { visible: false, text: 'Omitir intro' },
  });

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: any = null;

    function connect() {
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

  const currentService = SERVICE_CONFIGS[state.service || 'generic'] || SERVICE_CONFIGS.generic;
  const isSkipVisible = !!state.skipButton?.visible;
  const skipText = state.skipButton?.text || 'Omitir intro';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.45rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
            Vint<span style={{ color: currentService.accent }}>tea</span>
          </span>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: currentService.badgeBg,
              color: currentService.badgeColor,
              border: `1px solid ${currentService.badgeColor}33`,
            }}
          >
            {currentService.name}
          </span>
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

      {/* Now Playing Media Card */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 20,
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Series or Channel Name */}
        {state.series && (
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: currentService.accent,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>📺</span> {state.series}
          </div>
        )}

        {/* Main Title or Episode Name */}
        <div>
          <div
            style={{
              fontSize: state.series ? '1.25rem' : '1.15rem',
              fontWeight: 800,
              lineHeight: 1.25,
              color: '#ffffff',
              wordBreak: 'break-word',
            }}
          >
            {state.episode || state.title || 'Esperando reproducción...'}
          </div>

          {state.episode && state.title && state.title !== state.episode && (
            <div
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginTop: 4,
                fontWeight: 500,
              }}
            >
              {state.title}
            </div>
          )}
        </div>

        {/* Progress Bar & Timestamps */}
        <div style={{ marginTop: 6 }}>
          <div
            style={{
              width: '100%',
              height: 6,
              background: '#2b3044',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: currentService.accent,
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginTop: 6,
              fontWeight: 600,
            }}
          >
            <span>{formatTime(state.position)}</span>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>
      </div>

      {/* Dynamic OMITIR INTRO / RESUMEN Button */}
      <div style={{ width: '100%' }}>
        <button
          onClick={() => sendCommand('skipIntro')}
          disabled={!isSkipVisible}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 14,
            border: isSkipVisible
              ? `1.5px solid ${currentService.accent}`
              : '1px solid var(--card-border)',
            background: isSkipVisible
              ? `linear-gradient(135deg, ${currentService.accent}22, ${currentService.accent}44)`
              : '#161924',
            color: isSkipVisible ? '#ffffff' : '#6b7280',
            fontWeight: 700,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: isSkipVisible ? 'pointer' : 'default',
            opacity: isSkipVisible ? 1 : 0.45,
            transition: 'all 0.25s ease',
            boxShadow: isSkipVisible
              ? `0 0 16px ${currentService.accent}44`
              : 'none',
          }}
        >
          <IconFastForward
            size={20}
            color={isSkipVisible ? currentService.accent : '#6b7280'}
          />
          <span>{skipText}</span>
          {isSkipVisible && (
            <span
              style={{
                fontSize: '0.65rem',
                padding: '2px 6px',
                borderRadius: 4,
                background: currentService.accent,
                color: '#fff',
                marginLeft: 4,
              }}
            >
              DISPONIBLE
            </span>
          )}
        </button>
      </div>

      {/* Primary Media Controls */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 20,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr 1fr', gap: 10 }}>
          <button onClick={() => sendCommand('seek', -10)} style={btnStyle}>
            <IconRewind10 size={26} />
            <span style={btnLabelStyle}>-10s</span>
          </button>

          <button
            onClick={() => sendCommand('togglePlay')}
            style={{
              ...btnStyle,
              background: currentService.accent,
              borderColor: currentService.accent,
              boxShadow: `0 4px 20px ${currentService.accent}44`,
            }}
          >
            {state.playing ? (
              <IconPause size={32} color="#ffffff" />
            ) : (
              <IconPlay size={32} color="#ffffff" />
            )}
            <span style={{ ...btnLabelStyle, color: '#ffffff', fontWeight: 700 }}>
              {state.playing ? 'Pausa' : 'Play'}
            </span>
          </button>

          <button onClick={() => sendCommand('seek', 10)} style={btnStyle}>
            <IconForward10 size={26} />
            <span style={btnLabelStyle}>+10s</span>
          </button>
        </div>

        {/* Previous & Next Episode */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={() => sendCommand('prevEpisode')} style={btnStyle}>
            <IconSkipBack size={20} />
            <span style={btnLabelStyle}>Anterior</span>
          </button>

          <button onClick={() => sendCommand('nextEpisode')} style={btnStyle}>
            <IconSkipForward size={20} />
            <span style={btnLabelStyle}>Siguiente</span>
          </button>
        </div>
      </div>

      {/* Audio & Fullscreen Controls */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 20,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={() => sendCommand('toggleMute')} style={btnStyle}>
            {state.muted ? (
              <IconVolumeMute size={22} color="#f87171" />
            ) : (
              <IconVolume size={22} />
            )}
            <span style={btnLabelStyle}>{state.muted ? 'Silenciado' : 'Mute'}</span>
          </button>

          <button
            onClick={() => sendCommand('toggleFullscreen')}
            style={{
              ...btnStyle,
              background: state.fullscreen ? 'rgba(99, 102, 241, 0.2)' : undefined,
              borderColor: state.fullscreen ? '#6366f1' : undefined,
            }}
          >
            <IconFullscreen size={22} color={state.fullscreen ? '#818cf8' : undefined} />
            <span style={btnLabelStyle}>
              {state.fullscreen ? 'Salir pantalla' : 'Pantalla compl.'}
            </span>
          </button>
        </div>

        {/* Volume Slider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '6px 8px',
            background: '#12151f',
            borderRadius: 12,
            border: '1px solid var(--card-border)',
          }}
        >
          <span style={{ display: 'flex', color: 'var(--text-muted)' }}>
            <IconVolume size={18} />
          </span>
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
              accentColor: currentService.accent,
              cursor: 'pointer',
              height: 6,
            }}
          />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              minWidth: 32,
              textAlign: 'right',
              color: 'var(--text-muted)',
            }}
          >
            {state.muted ? '0%' : `${Math.round(state.volume * 100)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  background: '#1d2232',
  border: '1px solid var(--card-border)',
  color: '#f3f4f6',
  borderRadius: 14,
  padding: '14px 10px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  userSelect: 'none' as const,
  transition: 'transform 0.1s, background 0.15s, border-color 0.15s',
};

const btnLabelStyle = {
  fontSize: '0.78rem',
  color: 'var(--text-muted)',
  fontWeight: 600,
};
