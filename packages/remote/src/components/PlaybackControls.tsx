import {
  IconPlay,
  IconPause,
  IconRewind10,
  IconForward10,
  IconSkipBack,
  IconSkipForward,
} from '../icons';

interface PlaybackControlsProps {
  playing: boolean;
  activeAccent: string;
  onSeekRelative: (seconds: number) => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
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

export function PlaybackControls({
  playing,
  activeAccent,
  onSeekRelative,
  onTogglePlay,
  onPrev,
  onNext,
}: PlaybackControlsProps) {
  return (
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
        <button onClick={() => onSeekRelative(-10)} style={btnStyle}>
          <IconRewind10 size={26} />
          <span style={btnLabelStyle}>-10s</span>
        </button>

        <button
          onClick={onTogglePlay}
          style={{
            ...btnStyle,
            background: activeAccent,
            borderColor: activeAccent,
            boxShadow: `0 4px 20px ${activeAccent}44`,
          }}
        >
          {playing ? (
            <IconPause size={32} color="#ffffff" />
          ) : (
            <IconPlay size={32} color="#ffffff" />
          )}
          <span style={{ ...btnLabelStyle, color: '#ffffff', fontWeight: 700 }}>
            {playing ? 'Pausa' : 'Play'}
          </span>
        </button>

        <button onClick={() => onSeekRelative(10)} style={btnStyle}>
          <IconForward10 size={26} />
          <span style={btnLabelStyle}>+10s</span>
        </button>
      </div>

      {/* Previous & Next Episode Quick Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={onPrev} style={btnStyle}>
          <IconSkipBack size={20} />
          <span style={btnLabelStyle}>Anterior</span>
        </button>

        <button onClick={onNext} style={btnStyle}>
          <IconSkipForward size={20} />
          <span style={btnLabelStyle}>Siguiente</span>
        </button>
      </div>
    </div>
  );
}
