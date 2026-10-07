import type { SiteAdapter, PlayerState } from './types';
import { simulateKey, findVisibleButton, isElementVisible } from './utils';
import { GenericAdapter } from './generic';

export class CrunchyrollAdapter extends GenericAdapter implements SiteAdapter {
  id = 'crunchyroll';
  name = 'Crunchyroll';

  matches(url: string): boolean {
    return url.includes('crunchyroll.com/watch') || url.includes('crunchyroll.com/');
  }

  override togglePlay(): void {
    const playPauseBtn = findVisibleButton([
      '[data-testid="play_pause_button"]',
      '[data-testid="play-pause-button"]',
      'button[aria-label*="play" i]',
      'button[aria-label*="pause" i]',
    ]);
    if (playPauseBtn) {
      playPauseBtn.click();
    } else {
      simulateKey(' ', 'Space', 32);
    }
  }

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

  /**
   * Fix for Crunchyroll fullscreen:
   * Crunchyroll hides custom subtitles and overlays if standard video.requestFullscreen is called.
   * We first trigger Crunchyroll's dedicated fullscreen button, or simulate 'f', or fullscreen the Vilos container.
   */
  override toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }

    const fsBtn = findVisibleButton([
      '[data-testid="fullscreen-button"]',
      '[data-testid="fullscreen_button"]',
      'button[title*="pantalla completa" i]',
      'button[title*="fullscreen" i]',
      'button[aria-label*="pantalla completa" i]',
      'button[aria-label*="fullscreen" i]',
      '.fullscreen-icon',
    ]);

    if (fsBtn) {
      fsBtn.click();
      return;
    }

    // Try Vilos keyboard shortcut
    simulateKey('f', 'KeyF', 70);

    // Fallback: Fullscreen the entire player package (keeps subtitles and controls intact)
    const playerContainer = document.querySelector<HTMLElement>(
      '#vilos-player, .velocity-player-package, #player0, [data-testid="player-wrapper"]'
    );
    if (playerContainer) {
      playerContainer.requestFullscreen().catch(() => {});
    } else {
      super.toggleFullscreen();
    }
  }

  override nextEpisode(): void {
    const nextBtn = findVisibleButton([
      '[data-testid="next-episode-button"]',
      '[data-testid="next-button"]',
      'button[data-t="next-episode"]',
      'a[data-testid="next-episode-button"]',
    ]);
    if (nextBtn) {
      nextBtn.click();
    } else {
      simulateKey('n', 'KeyN', 78);
    }
  }

  override prevEpisode(): void {
    const prevBtn = findVisibleButton([
      '[data-testid="prev-episode-button"]',
      '[data-testid="previous-button"]',
      'button[data-t="prev-episode"]',
      'a[data-testid="prev-episode-button"]',
    ]);
    if (prevBtn) {
      prevBtn.click();
    } else {
      simulateKey('p', 'KeyP', 80);
    }
  }

  override skipIntro(): void {
    const skipBtn = findVisibleButton([
      '[data-testid="skip-button"]',
      '[data-t="skip-intro"]',
      '.vilos-skip-intro',
      '.skip-intro',
      'button[aria-label*="skip" i]',
      'button[aria-label*="omitir" i]',
    ]);
    if (skipBtn) {
      skipBtn.click();
    }
  }

  override getState(): PlayerState | null {
    const baseState = super.getState();
    if (!baseState) return null;

    // Detect Anime title & Episode title
    const seriesEl = document.querySelector<HTMLElement>(
      '[data-t="show-title"], .show-title-link, a[href*="/series/"]'
    );
    const episodeEl = document.querySelector<HTMLElement>(
      '[data-t="episode-title"], h1.title, .episode-title, h4.title'
    );

    const seriesTitle = seriesEl?.textContent?.trim() || '';
    const episodeTitle = episodeEl?.textContent?.trim() || '';

    // Detect Skip Intro button
    const skipBtn = findVisibleButton([
      '[data-testid="skip-button"]',
      '[data-t="skip-intro"]',
      '.vilos-skip-intro',
      '.skip-intro',
      'button[aria-label*="skip" i]',
      'button[aria-label*="omitir" i]',
    ]);

    const skipVisible = !!skipBtn && isElementVisible(skipBtn);
    const skipText = skipBtn?.textContent?.trim() || 'Omitir intro';

    return {
      ...baseState,
      service: 'crunchyroll',
      series: seriesTitle || undefined,
      episode: episodeTitle || undefined,
      title: episodeTitle
        ? `${seriesTitle ? seriesTitle + ' - ' : ''}${episodeTitle}`
        : (seriesTitle || baseState.title),
      skipButton: {
        visible: skipVisible,
        text: skipText,
      },
    };
  }
}
