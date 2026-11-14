import { IconVolume, IconVolumeMute, IconFullscreen } from '../icons';

interface AudioControlsProps {
  volume: number;
  muted: boolean;
  fullscreen?: boolean;
  activeAccent: string;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onSetVolume: (volume: number) => void;
  onPcVolumeDelta: (delta: number) => void;
  onTogglePcMute: () => void;
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

const pcMiniBtnStyle = {
  background: '#1a1e2d',
  border: '1px solid var(--card-border)',
  color: '#e2e8f0',
  borderRadius: 10,
  padding: '6px 12px',
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  transition: 'background 0.15s, border-color 0.15s',
};

export function AudioControls({
  volume,
  muted,
  fullscreen,
  activeAccent,
  onToggleMute,
  onToggleFullscreen,
  onSetVolume,
  onPcVolumeDelta,
  onTogglePcMute,
}: AudioControlsProps) {
  return (
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
      {/* Top Row: Video Mute & Fullscreen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={onToggleMute} style={btnStyle}>
          {muted ? (
            <IconVolumeMute size={22} color="#f87171" />
          ) : (
            <IconVolume size={22} />
          )}
          <span style={btnLabelStyle}>{muted ? 'Silenciado' : 'Mute'}</span>
        </button>

        <button
          className="fullscreen-button"
          onClick={onToggleFullscreen}
          style={{
            ...btnStyle,
            background: fullscreen ? 'rgba(99, 102, 241, 0.25)' : '#1d2232',
            borderColor: fullscreen ? '#818cf8' : 'var(--card-border)',
            boxShadow: fullscreen ? '0 0 16px rgba(99, 102, 241, 0.35)' : 'none',
          }}
        >
          <IconFullscreen size={22} color={fullscreen ? '#818cf8' : '#f3f4f6'} />
          <span
            style={{
              ...btnLabelStyle,
              color: fullscreen ? '#818cf8' : '#f3f4f6',
              fontWeight: 700,
            }}
          >
            {fullscreen ? 'Salir pantalla' : 'Pantalla compl.'}
          </span>
        </button>
      </div>

      {/* Video Volume Slider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 10px',
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
          value={muted ? 0 : Math.round(volume * 100)}
          onInput={(e) => {
            const target = e.target as HTMLInputElement;
            onSetVolume(Number(target.value) / 100);
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
            minWidth: 34,
            textAlign: 'right',
            color: 'var(--text-muted)',
          }}
        >
          {muted ? '0%' : `${Math.round(volume * 100)}%`}
        </span>
      </div>

      {/* PC Master Volume Sub-bar (Windows Master Volume) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 10,
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.9rem' }}>🖥️</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Audio PC
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => onPcVolumeDelta(-0.05)}
            title="Bajar volumen de la PC"
            style={pcMiniBtnStyle}
          >
            <span>🔉</span>
            <span>-</span>
          </button>

          <button
            onClick={onTogglePcMute}
            title="Silenciar / Reactivar audio de la PC"
            style={pcMiniBtnStyle}
          >
            <span>🔇</span>
            <span>Mute</span>
          </button>

          <button
            onClick={() => onPcVolumeDelta(0.05)}
            title="Subir volumen de la PC"
            style={pcMiniBtnStyle}
          >
            <span>🔊</span>
            <span>+</span>
          </button>
        </div>
      </div>
    </div>
  );
}
