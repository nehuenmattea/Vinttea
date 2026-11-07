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
  IconPower,
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
    badgeBg: 'rgba(229, 9, 20, 0.18)',
    badgeColor: '#e50914',
    accent: '#e50914',
  },
  crunchyroll: {
    name: 'Crunchyroll',
    badgeBg: 'rgba(255, 100, 10, 0.18)',
    badgeColor: '#ff640a',
    accent: '#ff640a',
  },
  youtube: {
    name: 'YouTube',
    badgeBg: 'rgba(255, 0, 0, 0.18)',
    badgeColor: '#ff2d2d',
    accent: '#ff0000',
  },
  youtubemusic: {
    name: 'YouTube Music',
    badgeBg: 'rgba(255, 0, 51, 0.22)',
    badgeColor: '#ff0033',
    accent: '#ff0033',
  },
  prime: {
    name: 'Prime Video',
    badgeBg: 'rgba(0, 168, 225, 0.18)',
    badgeColor: '#00a8e1',
    accent: '#00a8e1',
  },
  generic: {
    name: 'Reproductor Web',
    badgeBg: 'rgba(99, 102, 241, 0.18)',
    badgeColor: '#818cf8',
    accent: '#6366f1',
  },
};

interface AnimeTheme {
  name: string;
  badge: string;
  accent: string;
  icon: 'dragonball' | 'onepiece' | 'naruto' | 'kimetsu' | 'shingeki';
}

function getAnimeTheme(title: string = '', series: string = ''): AnimeTheme | null {
  const combined = `${title} ${series}`.toLowerCase();

  if (/dragon\s*ball|dbz|goku|vegeta/i.test(combined)) {
    return {
      name: 'Dragon Ball',
      badge: '🐉 DRAGON BALL',
      accent: '#f59e0b',
      icon: 'dragonball',
    };
  }
  if (/one\s*piece|luffy|zoro|mugiwara/i.test(combined)) {
    return {
      name: 'One Piece',
      badge: '🏴‍☠️ MUGIWARA',
      accent: '#eab308',
      icon: 'onepiece',
    };
  }
  if (/naruto|boruto|shippuden/i.test(combined)) {
    return {
      name: 'Naruto',
      badge: '🍥 ALDEA DE LA HOJA',
      accent: '#f97316',
      icon: 'naruto',
    };
  }
  if (/kimetsu|demon\s*slayer|tanjiro/i.test(combined)) {
    return {
      name: 'Demon Slayer',
      badge: '⚔️ DEMON SLAYER',
      accent: '#0d9488',
      icon: 'kimetsu',
    };
  }
  if (/shingeki|attack\s*on\s*titan|eren/i.test(combined)) {
    return {
      name: 'Attack on Titan',
      badge: '🛡️ LEGIÓN',
      accent: '#10b981',
      icon: 'shingeki',
    };
  }

  return null;
}

function DragonBallSphere({ size = 36 }: { size?: number }) {
  return (
    <div
      title="Esfera del Dragón de 4 estrellas (Toca para activar Ki)"
      onClick={() => {
        if (navigator.vibrate) {
          navigator.vibrate([40, 60, 40]);
        }
      }}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        boxShadow: '0 0 18px rgba(245, 158, 11, 0.85), inset 0 -3px 8px rgba(180, 83, 9, 0.9)',
        background: 'radial-gradient(circle at 35% 30%, #fef08a 0%, #f59e0b 50%, #b45309 95%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      {/* 4 ruby stars arranged cleanly in diamond formation */}
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 100 100">
        <defs>
          <polygon
            id="db-star"
            points="0,-6.5 1.9,-2.1 6.5,-1.5 3.2,1.8 3.9,6.4 0,4.2 -3.9,6.4 -3.2,1.8 -6.5,-1.5 -1.9,-2.1"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="0.5"
          />
        </defs>
        {/* Top Star */}
        <use href="#db-star" transform="translate(50, 32)" />
        {/* Bottom Star */}
        <use href="#db-star" transform="translate(50, 68)" />
        {/* Left Star */}
        <use href="#db-star" transform="translate(32, 50)" />
        {/* Right Star */}
        <use href="#db-star" transform="translate(68, 50)" />
      </svg>
      {/* Specular gloss highlight */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '16%',
          width: '32%',
          height: '24%',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.8)',
          filter: 'blur(1px)',
          transform: 'rotate(-30deg)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export function App() {
  const [serverConnected, setServerConnected] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [showShutdownModal, setShowShutdownModal] = useState(false);
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
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Seekbar interactive state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);

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
      navigator.vibrate(30);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'command', action, value }));
    }
  };

  // Timeline Scrubbing Math
  function computeSeek(clientX: number) {
    if (!progressBarRef.current || state.duration <= 0) return { percent: 0, targetSeconds: 0 };
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percent = offsetX / rect.width;
    const targetSeconds = Math.round(percent * state.duration);
    return { percent, targetSeconds };
  }

  function handleSeekStart(e: MouseEvent | TouchEvent) {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const { percent } = computeSeek(clientX);
    setIsDragging(true);
    setDragPercent(percent);
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function handleSeekMove(e: MouseEvent | TouchEvent) {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const { percent } = computeSeek(clientX);
    setDragPercent(percent);
  }

  function handleSeekEnd(e: MouseEvent | TouchEvent) {
    if (!isDragging) return;
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
    const { targetSeconds } = computeSeek(clientX);
    setIsDragging(false);
    setDragPercent(null);
    sendCommand('seekTo', targetSeconds);
    if (navigator.vibrate) navigator.vibrate(40);
  }

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent | TouchEvent) => handleSeekMove(e);
    const onEnd = (e: MouseEvent | TouchEvent) => handleSeekEnd(e);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, state.duration]);

  const activePercent = isDragging && dragPercent !== null
    ? dragPercent * 100
    : state.duration > 0
    ? Math.min(100, Math.max(0, (state.position / state.duration) * 100))
    : 0;

  const displayTime = isDragging && dragPercent !== null
    ? Math.round(dragPercent * state.duration)
    : state.position;

  const currentService = SERVICE_CONFIGS[state.service || 'generic'] || SERVICE_CONFIGS.generic;
  const animeTheme = getAnimeTheme(state.title, state.series);
  const activeAccent = animeTheme ? animeTheme.accent : currentService.accent;

  const isSkipVisible = !!state.skipButton?.visible;
  const skipText = state.skipButton?.text || 'Omitir intro';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 48 }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.45rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
            Vint<span style={{ color: activeAccent }}>tea</span>
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
          {animeTheme && (
            <span
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: '0.68rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: `${animeTheme.accent}22`,
                color: animeTheme.accent,
                border: `1px solid ${animeTheme.accent}55`,
              }}
            >
              {animeTheme.badge}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Quick Power Off button right in header */}
          <button
            onClick={() => setShowShutdownModal(true)}
            title="Apagar la PC"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              borderRadius: 9999,
              padding: '5px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            <IconPower size={13} color="#f87171" />
            <span>Apagar</span>
          </button>

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
        </div>
      </header>

      {/* Floating Shutdown Alert Banner (if active) */}
      {state.shutdownSecondsLeft !== undefined && state.shutdownSecondsLeft > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #dc2626, #991b1b)',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(220, 38, 38, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.9rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⏳</span>
            <span>Apagando PC en {state.shutdownSecondsLeft}s...</span>
          </div>
          <button
            onClick={() => sendCommand('cancelShutdown')}
            style={{
              background: '#ffffff',
              color: '#991b1b',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Main Now-Playing Media Card with Cover / Thumbnail */}
      <div
        style={{
          background: 'var(--card)',
          border: `1px solid ${animeTheme ? `${activeAccent}44` : 'var(--card-border)'}`,
          borderRadius: 22,
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: animeTheme ? `0 8px 30px ${activeAccent}22` : '0 8px 30px rgba(0,0,0,0.4)',
        }}
      >
        {/* Ambient Glow behind card if thumbnail exists */}
        {state.thumbnail && (
          <div
            style={{
              position: 'absolute',
              inset: -15,
              backgroundImage: `url(${state.thumbnail})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(35px)',
              opacity: 0.22,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 14 }}>
          {/* Episode / Video Cover Art */}
          {state.thumbnail ? (
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: 14,
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                background: '#1a1e2d',
              }}
            >
              <img
                src={state.thumbnail}
                alt="Portada"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${activeAccent}33, #151926)`,
                border: `1px solid ${activeAccent}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                flexShrink: 0,
              }}
            >
              {animeTheme?.icon === 'dragonball' ? '🐉' : '🎬'}
            </div>
          )}

          {/* Titles & Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1, gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              {state.series && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: activeAccent,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {state.series}
                </div>
              )}
              {/* Dragon Ball Themed 4-Star Sphere Easter Egg */}
              {animeTheme?.icon === 'dragonball' && <DragonBallSphere size={36} />}
            </div>

            {/* Dedicated Season / Saga Badge (ej. Saga de Pilaf en Dragon Ball 1986) */}
            {state.season && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 2, marginBottom: 1 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: animeTheme ? `${activeAccent}18` : 'rgba(255, 255, 255, 0.08)',
                    color: animeTheme ? activeAccent : '#e2e8f0',
                    border: `1px solid ${animeTheme ? `${activeAccent}44` : 'rgba(255, 255, 255, 0.14)'}`,
                    letterSpacing: '0.02em',
                    maxWidth: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <span style={{ fontSize: '0.72rem' }}>{animeTheme ? '⭐' : '🎞️'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{state.season}</span>
                </span>
              </div>
            )}

            <div
              style={{
                fontSize: '1.12rem',
                fontWeight: 800,
                lineHeight: 1.25,
                color: '#ffffff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                marginTop: state.season ? 2 : 0,
              }}
            >
              {state.episode || state.title || 'Esperando video...'}
            </div>

            {state.episode && state.title && state.title !== state.episode && (
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {state.title}
              </div>
            )}
          </div>
        </div>

        {/* Scrubbable Timeline (Línea de tiempo para elegir minuto) */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: 4 }}>
          {/* Floating Time Bubble while dragging */}
          {isDragging && (
            <div
              style={{
                position: 'absolute',
                top: -32,
                left: `clamp(35px, ${activePercent}%, calc(100% - 35px))`,
                transform: 'translateX(-50%)',
                background: activeAccent,
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 6,
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {formatTime(displayTime)}
            </div>
          )}

          {/* Interactive touch slider box */}
          <div
            ref={progressBarRef}
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
            style={{
              width: '100%',
              height: 28,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            <div
              style={{
                width: '100%',
                height: isDragging ? 8 : 6,
                background: '#2b3044',
                borderRadius: 4,
                position: 'relative',
                transition: 'height 0.15s ease',
              }}
            >
              <div
                style={{
                  width: `${activePercent}%`,
                  height: '100%',
                  background: activeAccent,
                  borderRadius: 4,
                }}
              />
              {/* Scrub Handle / Thumb Knob */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${activePercent}%`,
                  transform: 'translate(-50%, -50%)',
                  width: isDragging ? 16 : 12,
                  height: isDragging ? 16 : 12,
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: `0 0 10px ${activeAccent}`,
                  transition: 'width 0.15s, height 0.15s',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              fontWeight: 700,
              marginTop: -2,
            }}
          >
            <span>{formatTime(displayTime)}</span>
            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Toca o desliza para ir al minuto</span>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>
      </div>

      {/* Episode Previews Strip (Capítulo Anterior & Siguiente con portadas) */}
      {(state.prevPreview || state.nextPreview) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          {/* Previous Episode Card */}
          <div
            onClick={() => sendCommand('prevEpisode')}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: 16,
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              opacity: state.prevPreview ? 1 : 0.5,
              transition: 'transform 0.1s, background 0.15s',
            }}
          >
            {state.prevPreview?.thumbnail ? (
              <img
                src={state.prevPreview.thumbnail}
                alt="Prev"
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#252a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconSkipBack size={18} />
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ⏮️ Anterior
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
                {state.prevPreview?.title || 'Capítulo anterior'}
              </div>
            </div>
          </div>

          {/* Next Episode Card */}
          <div
            onClick={() => sendCommand('nextEpisode')}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: 16,
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              opacity: state.nextPreview ? 1 : 0.5,
              transition: 'transform 0.1s, background 0.15s',
            }}
          >
            {state.nextPreview?.thumbnail ? (
              <img
                src={state.nextPreview.thumbnail}
                alt="Next"
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#252a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconSkipForward size={18} />
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: activeAccent, textTransform: 'uppercase' }}>
                Siguiente ⏭️
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
                {state.nextPreview?.title || 'Siguiente capítulo'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Persistent Omitir Intro / Resumen Button */}
      <div style={{ width: '100%' }}>
        <button
          onClick={() => sendCommand('skipIntro')}
          disabled={!isSkipVisible}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 14,
            border: isSkipVisible
              ? `1.5px solid ${activeAccent}`
              : '1px solid var(--card-border)',
            background: isSkipVisible
              ? `linear-gradient(135deg, ${activeAccent}22, ${activeAccent}44)`
              : '#161924',
            color: isSkipVisible ? '#ffffff' : '#6b7280',
            fontWeight: 700,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: isSkipVisible ? 'pointer' : 'default',
            opacity: isSkipVisible ? 1 : 0.4,
            transition: 'all 0.25s ease',
            boxShadow: isSkipVisible
              ? `0 0 18px ${activeAccent}44`
              : 'none',
          }}
        >
          <IconFastForward
            size={20}
            color={isSkipVisible ? activeAccent : '#6b7280'}
          />
          <span>{skipText}</span>
          {isSkipVisible && (
            <span
              style={{
                fontSize: '0.65rem',
                padding: '2px 6px',
                borderRadius: 4,
                background: activeAccent,
                color: '#fff',
                marginLeft: 4,
                fontWeight: 800,
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
              background: activeAccent,
              borderColor: activeAccent,
              boxShadow: `0 4px 20px ${activeAccent}44`,
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

        {/* Previous & Next Episode Quick Buttons (always visible) */}
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
              background: state.fullscreen ? 'rgba(99, 102, 241, 0.25)' : '#1d2232',
              borderColor: state.fullscreen ? '#818cf8' : 'var(--card-border)',
              boxShadow: state.fullscreen ? '0 0 16px rgba(99, 102, 241, 0.4)' : 'none',
            }}
          >
            <IconFullscreen size={22} color={state.fullscreen ? '#818cf8' : '#f3f4f6'} />
            <span style={{ ...btnLabelStyle, color: state.fullscreen ? '#818cf8' : 'var(--text-muted)' }}>
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
              accentColor: activeAccent,
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

      {/* PC Power Off Trigger */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <button
          onClick={() => setShowShutdownModal(true)}
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            borderRadius: 14,
            padding: '12px 20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <IconPower size={18} color="#f87171" />
          <span>Apagar la PC desde aquí</span>
        </button>
      </div>

      {/* Confirmation Modal for PC Shutdown */}
      {showShutdownModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#161924',
              border: '1px solid #2e354a',
              borderRadius: 22,
              padding: 24,
              maxWidth: 360,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconPower size={32} color="#ef4444" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>¿Apagar la computadora?</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
                Puedes iniciar una cuenta regresiva de 30 segundos (con opción a cancelar desde aquí) o apagarla de inmediato.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  sendCommand('shutdownPC', 30);
                  setShowShutdownModal(false);
                }}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                }}
              >
                ⏱️ Apagar en 30s (Recomendado)
              </button>

              <button
                onClick={() => {
                  sendCommand('shutdownPC', 0);
                  setShowShutdownModal(false);
                }}
                style={{
                  background: '#1e2436',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '12px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                ⚡ Apagar de inmediato
              </button>

              <button
                onClick={() => setShowShutdownModal(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--card-border)',
                  padding: '10px',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
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
