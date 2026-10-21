import type { SiteAdapter, PlayerState } from './types';
import {
  simulateKey,
  findInteractiveButton,
  clickElementSafely,
  toggleReliableFullscreen,
  isFullscreenActive,
} from './utils';
import { GenericAdapter } from './generic';

export class NetflixAdapter extends GenericAdapter implements SiteAdapter {
  id = 'netflix';
  name = 'Netflix';

  matches(url: string): boolean {
    return url.includes('netflix.com');
  }

  override play(): void {
    const playBtn = findInteractiveButton(['button[data-uia="control-play-pause-play"]']);
    if (playBtn) {
      clickElementSafely(playBtn);
    } else {
      simulateKey(' ', 'Space', 32);
    }
  }

  override pause(): void {
    const pauseBtn = findInteractiveButton(['button[data-uia="control-play-pause-pause"]']);
    if (pauseBtn) {
      clickElementSafely(pauseBtn);
    } else {
      simulateKey(' ', 'Space', 32);
    }
  }

  override togglePlay(): void {
    const btn = findInteractiveButton([
      'button[data-uia="control-play-pause-play"]',
      'button[data-uia="control-play-pause-pause"]',
    ]);
    if (btn) {
      clickElementSafely(btn);
    } else {
      simulateKey(' ', 'Space', 32);
    }
  }

  /**
   * On Netflix, modifying video.currentTime directly causes Cadmium buffer desync and error M7375.
   * Simulating native keyboard shortcuts (ArrowLeft/ArrowRight) triggers smooth 10-second jumps.
   */
  override seek(seconds: number): void {
    const count = Math.max(1, Math.round(Math.abs(seconds) / 10));
    const isForward = seconds > 0;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (isForward) {
          simulateKey('ArrowRight', 'ArrowRight', 39);
        } else {
          simulateKey('ArrowLeft', 'ArrowLeft', 37);
        }
      }, i * 80);
    }
  }

  override seekTo(seconds: number): void {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (!video) return;
    const diff = seconds - video.currentTime;
    this.seek(diff);
  }

  override toggleFullscreen(forceState?: number): void {
    const video = document.querySelector<HTMLVideoElement>('video');
    const container =
      document.querySelector<HTMLElement>('.watch-video--player-view') ||
      video?.parentElement;

    toggleReliableFullscreen(
      video,
      container,
      [
        'button[data-uia="control-fullscreen-enter"]',
        'button[data-uia="control-fullscreen-exit"]',
      ],
      forceState
    );
  }

  override toggleMute(): void {
    const muteBtn = findInteractiveButton([
      'button[data-uia="control-volume-high"]',
      'button[data-uia="control-volume-low"]',
      'button[data-uia="control-volume-muted"]',
    ]);
    if (muteBtn) {
      clickElementSafely(muteBtn);
    } else {
      simulateKey('m', 'KeyM', 77);
    }
  }

  override nextEpisode(): void {
    const nextBtn = findInteractiveButton(['button[data-uia="control-next"]']);
    if (nextBtn) {
      clickElementSafely(nextBtn);
    } else {
      simulateKey('n', 'KeyN', 78);
    }
  }

  override skipIntro(): void {
    const skipBtn = findInteractiveButton([
      'button[data-uia="player-skip-intro"]',
      'button[data-uia="player-skip-recap"]',
      '.watch-video--skip-content-button',
      '.skip-credits > a',
      '.skip-credits > button',
    ]);
    if (skipBtn) {
      clickElementSafely(skipBtn);
    }
  }

  override getState(): PlayerState | null {
    const baseState = super.getState();
    if (!baseState) return null;

    // Detect Netflix series, season/saga, and episode title
    let seriesTitle = '';
    let seasonTitle = '';
    let episodeTitle = '';

    const titleContainer = document.querySelector<HTMLElement>('[data-uia="video-title"]');
    if (titleContainer) {
      const spans = Array.from(titleContainer.querySelectorAll('span, h4'));
      if (spans.length >= 3) {
        seriesTitle = spans[0]?.textContent?.trim() || '';
        seasonTitle = spans[1]?.textContent?.trim() || '';
        episodeTitle = spans[2]?.textContent?.trim() || '';
      } else if (spans.length === 2) {
        seriesTitle = spans[0]?.textContent?.trim() || '';
        const second = spans[1]?.textContent?.trim() || '';
        if (/temporada|season|saga|t\d+/i.test(second)) {
          seasonTitle = second;
        } else {
          episodeTitle = second;
        }
      } else {
        seriesTitle = titleContainer.textContent?.trim() || '';
      }
    }

    // Detect Skip Intro / Recap button visibility and text (active even if controls are faded)
    const skipBtn = findInteractiveButton([
      'button[data-uia="player-skip-intro"]',
      'button[data-uia="player-skip-recap"]',
      '.watch-video--skip-content-button',
      '.skip-credits > a',
      '.skip-credits > button',
    ]);

    const skipVisible = !!skipBtn && skipBtn.isConnected;
    const skipText = skipBtn?.textContent?.trim() || 'Omitir intro';

    const thumbnail =
      document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      document.querySelector<HTMLImageElement>('.title-card img, .hero-image img')?.src ||
      baseState.thumbnail;

    return {
      ...baseState,
      service: 'netflix',
      series: seriesTitle || undefined,
      season: seasonTitle || undefined,
      episode: episodeTitle || undefined,
      title: episodeTitle
        ? `${seriesTitle ? seriesTitle + ': ' : ''}${seasonTitle ? seasonTitle + ' - ' : ''}${episodeTitle}`
        : (seriesTitle || baseState.title),
      fullscreen: isFullscreenActive(),
      thumbnail,
      skipButton: {
        visible: skipVisible,
        text: skipText,
      },
    };
  }
}
