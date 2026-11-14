import { useEffect, useRef } from 'preact/hooks';
import type { PlayerState, CommandAction } from '@vinttea/shared';

/**
 * Connects the remote page with the native phone notification / lock screen media controls
 * using navigator.mediaSession.
 * User request: ONLY play/pause, next episode, previous episode, and nothing else.
 */
export function useMediaSession(
  state: PlayerState,
  sendCommand: (action: CommandAction, value?: number) => void
) {
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize silent background audio loop to keep Media Session active in background
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    // Create a tiny silent wav data URI audio element
    // Single sample silent WAV (44 bytes)
    const silentWav =
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    const audio = new Audio(silentWav);
    audio.loop = true;
    audio.volume = 0.001; // virtually silent
    silentAudioRef.current = audio;

    const startAudio = () => {
      if (silentAudioRef.current && silentAudioRef.current.paused) {
        silentAudioRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('click', startAudio, { once: true });
    window.addEventListener('touchstart', startAudio, { once: true });

    return () => {
      window.removeEventListener('click', startAudio);
      window.removeEventListener('touchstart', startAudio);
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const titleText = state.episode || state.title || 'Vinttea Remote';
      const artistText = state.series || (state.service ? state.service.toUpperCase() : 'Vinttea');
      const albumText = state.season || 'Streaming';

      const artworkList: MediaImage[] = [];
      if (state.thumbnail) {
        artworkList.push(
          { src: state.thumbnail, sizes: '96x96', type: 'image/jpeg' },
          { src: state.thumbnail, sizes: '128x128', type: 'image/jpeg' },
          { src: state.thumbnail, sizes: '256x256', type: 'image/jpeg' },
          { src: state.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        );
      } else {
        artworkList.push({ src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' });
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: titleText,
        artist: artistText,
        album: albumText,
        artwork: artworkList,
      });

      // Synchronize playback state
      navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused';

      // Set ONLY the 3 requested actions:
      // 1. Play
      navigator.mediaSession.setActionHandler('play', () => {
        sendCommand('togglePlay');
      });

      // 2. Pause
      navigator.mediaSession.setActionHandler('pause', () => {
        sendCommand('togglePlay');
      });

      // 3. Next Track / Episode
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        sendCommand('nextEpisode');
      });

      // 4. Previous Track / Episode
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        sendCommand('prevEpisode');
      });

      // Explicitly disable any other controls so notification shade only has the 3 buttons
      const ignoredActions: MediaSessionAction[] = [
        'seekbackward',
        'seekforward',
        'seekto',
        'stop',
        'skipad',
      ];
      for (const action of ignoredActions) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore unsupported actions
        }
      }
    } catch (err) {
      console.warn('[Vinttea] MediaSession error:', err);
    }
  }, [state.playing, state.title, state.episode, state.series, state.season, state.thumbnail, sendCommand]);
}
