import type { EpisodePreview } from '@vinttea/shared';
import { IconSkipBack, IconSkipForward } from '../icons';

interface EpisodePreviewsProps {
  prevPreview?: EpisodePreview;
  nextPreview?: EpisodePreview;
  activeAccent: string;
  onPrev: () => void;
  onNext: () => void;
}

export function EpisodePreviews({
  prevPreview,
  nextPreview,
  activeAccent,
  onPrev,
  onNext,
}: EpisodePreviewsProps) {
  if (!prevPreview && !nextPreview) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}
    >
      {/* Previous Episode Card */}
      <div
        onClick={onPrev}
        role="button"
        tabIndex={0}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          padding: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          opacity: prevPreview ? 1 : 0.5,
          transition: 'transform 0.1s, background 0.15s',
        }}
      >
        {prevPreview?.thumbnail ? (
          <img
            src={prevPreview.thumbnail}
            alt="Prev"
            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: '#252a3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconSkipBack size={18} />
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            ⏮️ Anterior
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#fff',
            }}
          >
            {prevPreview?.title || 'Capítulo anterior'}
          </div>
        </div>
      </div>

      {/* Next Episode Card */}
      <div
        onClick={onNext}
        role="button"
        tabIndex={0}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          padding: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          opacity: nextPreview ? 1 : 0.5,
          transition: 'transform 0.1s, background 0.15s',
        }}
      >
        {nextPreview?.thumbnail ? (
          <img
            src={nextPreview.thumbnail}
            alt="Next"
            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: '#252a3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconSkipForward size={18} />
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: activeAccent, textTransform: 'uppercase' }}>
            Siguiente ⏭️
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#fff',
            }}
          >
            {nextPreview?.title || 'Siguiente capítulo'}
          </div>
        </div>
      </div>
    </div>
  );
}
