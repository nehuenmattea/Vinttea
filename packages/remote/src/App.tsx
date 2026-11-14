import { useState, useRef, useEffect } from 'preact/hooks';
import { useVintteaSocket } from './hooks/useVintteaSocket';
import { useMediaSession } from './hooks/useMediaSession';
import { SERVICE_CONFIGS, getAnimeTheme } from './types/theme';
import { Header } from './components/Header';
import { NowPlayingCard } from './components/NowPlayingCard';
import { EpisodePreviews } from './components/EpisodePreviews';
import { SkipButton } from './components/SkipButton';
import { PlaybackControls } from './components/PlaybackControls';
import { AudioControls } from './components/AudioControls';
import { ShutdownBanner, ShutdownModal } from './components/ShutdownModal';
import { AnimeExplosion } from './components/AnimeExplosion';
import { IconPower } from './icons';

export function App() {
  const { serverConnected, extensionConnected, state, sendCommand } = useVintteaSocket();
  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const explosionTimerRef = useRef<number | null>(null);

  // Hook for lockscreen & phone notification media controls (play/pause, next, prev only)
  useMediaSession(state, sendCommand);

  const currentService = SERVICE_CONFIGS[state.service || 'generic'] || SERVICE_CONFIGS.generic;
  const animeTheme = getAnimeTheme(state.title, state.series);
  const activeAccent = animeTheme ? animeTheme.accent : currentService.accent;

  const isSkipVisible = !!state.skipButton?.visible;
  const skipText = state.skipButton?.text || 'Omitir intro';

  const triggerAnimeExplosion = () => {
    setShowExplosion(true);
    if (navigator.vibrate) {
      navigator.vibrate([40, 60, 100]);
    }
    if (explosionTimerRef.current !== null) {
      window.clearTimeout(explosionTimerRef.current);
    }
    explosionTimerRef.current = window.setTimeout(() => setShowExplosion(false), 750);
  };

  const handleSkipIntro = () => {
    sendCommand('skipIntro');
    if (animeTheme?.icon === 'dragonball') {
      triggerAnimeExplosion();
    }
  };

  useEffect(() => {
    return () => {
      if (explosionTimerRef.current !== null) {
        window.clearTimeout(explosionTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="remote-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        paddingBottom: 48,
      }}
    >
      {/* Top Navigation & Status Bar */}
      <Header
        currentService={currentService}
        animeTheme={animeTheme}
        activeAccent={activeAccent}
        serverConnected={serverConnected}
        extensionConnected={extensionConnected}
        battery={state.battery}
      />

      {/* Anime Explosion Particle Effect (Easter Egg) */}
      {showExplosion && animeTheme?.icon === 'dragonball' && <AnimeExplosion />}

      {/* Floating Shutdown Alert Banner (if active) */}
      <ShutdownBanner
        secondsLeft={state.shutdownSecondsLeft}
        onCancel={() => sendCommand('cancelShutdown')}
      />

      {/* Main Now-Playing Media Card with Cover / Thumbnail & Scrubbable Timeline */}
      <NowPlayingCard
        state={state}
        activeAccent={activeAccent}
        animeTheme={animeTheme}
        onSeek={(targetSeconds) => sendCommand('seekTo', targetSeconds)}
        onTriggerExplosion={triggerAnimeExplosion}
      />

      {/* Episode Previews Strip (Capítulo Anterior & Siguiente con portadas) */}
      <EpisodePreviews
        prevPreview={state.prevPreview}
        nextPreview={state.nextPreview}
        activeAccent={activeAccent}
        onPrev={() => sendCommand('prevEpisode')}
        onNext={() => sendCommand('nextEpisode')}
      />

      {/* Dynamic Persistent Omitir Intro / Resumen Button */}
      <SkipButton
        isSkipVisible={isSkipVisible}
        skipText={skipText}
        activeAccent={activeAccent}
        onSkip={handleSkipIntro}
      />

      {/* Primary Playback Controls (-10s, Play/Pause, +10s, Prev, Next) */}
      <PlaybackControls
        playing={state.playing}
        activeAccent={activeAccent}
        onSeekRelative={(seconds) => sendCommand('seek', seconds)}
        onTogglePlay={() => sendCommand('togglePlay')}
        onPrev={() => sendCommand('prevEpisode')}
        onNext={() => sendCommand('nextEpisode')}
      />

      {/* Audio & True Edge-to-Edge Fullscreen + PC Master Volume */}
      <AudioControls
        volume={state.volume}
        muted={state.muted}
        fullscreen={state.fullscreen}
        activeAccent={activeAccent}
        onToggleMute={() => sendCommand('toggleMute')}
        onToggleFullscreen={() => sendCommand('toggleFullscreen')}
        onSetVolume={(vol) => sendCommand('setVolume', vol)}
        onPcVolumeDelta={(delta) => sendCommand('pcVolumeDelta', delta)}
        onTogglePcMute={() => sendCommand('togglePcMute')}
      />

      {/* PC Power Off Trigger */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
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
      <ShutdownModal
        isOpen={showShutdownModal}
        onClose={() => setShowShutdownModal(false)}
        onConfirm={(seconds) => sendCommand('shutdownPC', seconds)}
      />
    </div>
  );
}
