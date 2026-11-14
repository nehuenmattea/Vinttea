import { useState, useRef, useEffect } from 'preact/hooks';
import { formatTime } from '../types/theme';

interface TimelineProps {
  position: number;
  duration: number;
  activeAccent: string;
  onSeek: (seconds: number) => void;
}

export function Timeline({ position, duration, activeAccent, onSeek }: TimelineProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);

  function computeSeek(clientX: number) {
    if (!progressBarRef.current || duration <= 0) return { percent: 0, targetSeconds: 0 };
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percent = offsetX / rect.width;
    const targetSeconds = Math.round(percent * duration);
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
    onSeek(targetSeconds);
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
  }, [isDragging, duration]);

  const activePercent =
    isDragging && dragPercent !== null
      ? dragPercent * 100
      : duration > 0
      ? Math.min(100, Math.max(0, (position / duration) * 100))
      : 0;

  const displayTime =
    isDragging && dragPercent !== null ? Math.round(dragPercent * duration) : position;

  return (
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
        className="timeline-time-row"
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
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
