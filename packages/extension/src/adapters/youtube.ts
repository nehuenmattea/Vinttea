import type { SiteAdapter, PlayerState, EpisodePreview } from './types';
import {
  findInteractiveButton,
  clickElementSafely,
  simulateKey,
  toggleReliableFullscreen,
  isFullscreenActive,
} from './utils';
import { GenericAdapter } from './generic';

export class YouTubeAdapter extends GenericAdapter implements SiteAdapter {
  id = 'youtube';
  name = 'YouTube';

  matches(url: string): boolean {
    return (
      (url.includes('youtube.com') || url.includes('youtu.be')) &&
      !url.includes('music.youtube.com')
    );
  }

  private getYouTubeVideo(): HTMLVideoElement | null {
    return (
      document.querySelector<HTMLVideoElement>('video.html5-main-video') ||
      document.querySelector<HTMLVideoElement>('#movie_player video') ||
      document.querySelector<HTMLVideoElement>('video')
    );
  }

  override seekTo(seconds: number): void {
    const video = this.getYouTubeVideo();
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration || 0, seconds));
    }
  }

  override nextEpisode(): void {
    const nextBtn = findInteractiveButton(['.ytp-next-button']);
    if (nextBtn) {
      clickElementSafely(nextBtn);
    } else {
      simulateKey('N', 'KeyN', 78);
    }
  }

  override prevEpisode(): void {
    const prevBtn = findInteractiveButton(['.ytp-prev-button']);
    if (prevBtn) {
      clickElementSafely(prevBtn);
    } else {
      simulateKey('P', 'KeyP', 80);
    }
  }

  override toggleFullscreen(forceState?: number): void {
    const video = this.getYouTubeVideo();
    const playerContainer =
      document.querySelector<HTMLElement>('#movie_player, ytd-player, #player') ||
      video?.parentElement;

    toggleReliableFullscreen(
      video,
      playerContainer,
      [
        '.ytp-fullscreen-button',
        'button[title*="pantalla completa" i]',
        'button[aria-label*="pantalla completa" i]',
      ],
      forceState
    );
  }

  override skipIntro(): void {
    // On YouTube, skipIntro skips ads or sponsor segments
    const skipAdBtn = findInteractiveButton([
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      'button.ytp-ad-skip-button-slot',
      '.ytp-ad-overlay-close-button',
    ]);
    if (skipAdBtn) {
      clickElementSafely(skipAdBtn);
    }
  }

  override getState(): PlayerState | null {
    const video = this.getYouTubeVideo();
    if (!video) return null;

    // Video title
    const titleEl = document.querySelector<HTMLElement>(
      '#title h1 yt-formatted-string, ytd-watch-metadata #title, h1.ytd-video-primary-info-renderer, #above-the-fold #title'
    );
    let title = titleEl?.textContent?.trim() || document.title || 'YouTube Video';
    title = title.replace(/\s*-\s*YouTube$/i, '').trim();

    // Channel / Creator name
    const channelEl = document.querySelector<HTMLElement>(
      'ytd-channel-name yt-formatted-string#text, #channel-name a, #owner #channel-name a'
    );
    const channelName = channelEl?.textContent?.trim() || '';

    // Check if Skip Ad button exists in DOM
    const skipAdBtn = findInteractiveButton([
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      'button.ytp-ad-skip-button-slot',
    ]);
    const skipVisible = !!skipAdBtn;

    // Extract current video thumbnail
    let thumbnail: string | undefined;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const videoId = urlParams.get('v');
      if (videoId) {
        thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      } else if (window.location.pathname.startsWith('/shorts/')) {
        const shortId = window.location.pathname.split('/shorts/')[1]?.split('/')[0];
        if (shortId) {
          thumbnail = `https://img.youtube.com/vi/${shortId}/hqdefault.jpg`;
        }
      }
    } catch {}

    if (!thumbnail) {
      thumbnail =
        document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
        video.getAttribute('poster') ||
        undefined;
    }

    // Extract Next Video Preview from YouTube sidebar
    let nextPreview: EpisodePreview | undefined;
    const nextVideoRenderer = document.querySelector<HTMLElement>(
      '#items ytd-compact-video-renderer, ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer'
    );
    if (nextVideoRenderer) {
      const nextTitle =
        nextVideoRenderer.querySelector<HTMLElement>('#video-title')?.textContent?.trim() ||
        'Siguiente Video';
      const nextChannel = nextVideoRenderer.querySelector<HTMLElement>(
        'ytd-channel-name #text'
      )?.textContent?.trim();
      const nextThumb =
        nextVideoRenderer.querySelector<HTMLImageElement>('img')?.src || undefined;

      nextPreview = {
        title: nextTitle,
        episode: nextChannel,
        thumbnail: nextThumb,
      };
    }

    // Check if watching within a playlist / saga
    const playlistEl = document.querySelector<HTMLElement>(
      'ytd-playlist-panel-renderer .header-title, #playlist-header .title, .ytd-playlist-panel-renderer h3'
    );
    const playlistTitle = playlistEl?.textContent?.trim();

    return {
      playing: !video.paused && !video.ended,
      title: title || 'YouTube Video',
      series: channelName || undefined,
      season: playlistTitle || undefined,
      service: 'youtube',
      position: Math.round(video.currentTime),
      duration: Math.round(video.duration || 0),
      volume: video.muted ? 0 : video.volume,
      muted: video.muted,
      fullscreen: isFullscreenActive(),
      playbackRate: video.playbackRate,
      thumbnail,
      nextPreview,
      skipButton: {
        visible: skipVisible,
        text: 'Omitir anuncio',
      },
      updatedAt: Date.now(),
    };
  }
}
