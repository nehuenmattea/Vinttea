import type { PlayerState } from '@vinttea/shared';
import type { AnimeTheme } from '../types/theme';
import { DragonBallSphere } from './DragonBallSphere';
import { Timeline } from './Timeline';

interface NowPlayingCardProps {
  state: PlayerState;
  activeAccent: string;
  animeTheme: AnimeTheme | null;
  onSeek: (seconds: number) => void;
  onTriggerExplosion?: () => void;
}

export function NowPlayingCard({
  state,
  activeAccent,
  animeTheme,
  onSeek,
  onTriggerExplosion,
}: NowPlayingCardProps) {
  return (
    <div
      className="now-playing-card"
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

      <div className="now-playing-main" style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 14 }}>
        {/* Episode / Video Cover Art */}
        {state.thumbnail ? (
          <div
            className="now-playing-thumbnail"
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
            className="now-playing-thumbnail now-playing-placeholder"
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
        <div
          className="now-playing-content"
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1, gap: 2 }}
        >
          <div className="anime-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            {state.series && (
              <div
                className="series-title"
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
            {animeTheme?.icon === 'dragonball' && (
              <DragonBallSphere onTap={onTriggerExplosion} />
            )}
          </div>

          {/* Dedicated Season / Saga Badge */}
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

      {/* Scrubbable Timeline */}
      <Timeline
        position={state.position}
        duration={state.duration}
        activeAccent={activeAccent}
        onSeek={onSeek}
      />
    </div>
  );
}
