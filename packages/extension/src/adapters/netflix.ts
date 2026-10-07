import type { SiteAdapter, PlayerState } from './types';
import { simulateKey, findVisibleButton, isElementVisible } from './utils';
import { GenericAdapter } from './generic';

export class NetflixAdapter extends GenericAdapter implements SiteAdapter {
  id = 'netflix';
  name = 'Netflix';

  matches(url: string): boolean {
    return url.includes('netflix.com/watch');
  }

  override play(): void {
    const playBtn = findVisibleButton(['button[data-uia="control-play-pause-play"]']);
    if (playBtn) {
      playBtn.click();
    } else {
      simulateKey(' ', 'Space', 32);
    }
  }

  override pause(): void {
    const pauseBtn = findVisibleButton(['button[data-uia="control-play-pause-pause"]']);
    if (pauseBtn) {
      pauseBtn.click();
    } else {
      simulateKey(' ', 'Space', 32);
    }
  }

  override togglePlay(): void {
    const btn = findVisibleButton([
      'button[data-uia="control-play-pause-play"]',
      'button[data-uia="control-play-pause-pause"]',
    ]);
    if (btn) {
      btn.click();
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

  override toggleFullscreen(): void {
    const fsBtn = findVisibleButton([
      'button[data-uia="control-fullscreen-enter"]',
      'button[data-uia="control-fullscreen-exit"]',
    ]);
    if (fsBtn) {
      fsBtn.click();
    } else {
      simulateKey('f', 'KeyF', 70);
    }
  }

  override toggleMute(): void {
    const muteBtn = findVisibleButton([
      'button[data-uia="control-volume-high"]',
      'button[data-uia="control-volume-low"]',
      'button[data-uia="control-volume-muted"]',
    ]);
    if (muteBtn) {
      muteBtn.click();
    } else {
      simulateKey('m', 'KeyM', 77);
    }
  }

  override nextEpisode(): void {
    const nextBtn = findVisibleButton(['button[data-uia="control-next"]']);
    if (nextBtn) {
      nextBtn.click();
    } else {
      simulateKey('n', 'KeyN', 78);
    }
  }

  override skipIntro(): void {
    const skipBtn = findVisibleButton([
      'button[data-uia="player-skip-intro"]',
      'button[data-uia="player-skip-recap"]',
      '.watch-video--skip-content-button',
      '.skip-credits > a',
      '.skip-credits > button',
    ]);
    if (skipBtn) {
      skipBtn.click();
    }
  }

  override getState(): PlayerState | null {
    const baseState = super.getState();
    if (!baseState) return null;

    // Detect Netflix series and episode title
    let seriesTitle = '';
    let episodeTitle = '';

    const titleContainer = document.querySelector<HTMLElement>('[data-uia="video-title"]');
    if (titleContainer) {
      const spans = Array.from(titleContainer.querySelectorAll('span, h4'));
      if (spans.length >= 3) {
        seriesTitle = spans[0]?.textContent?.trim() || '';
        const seasonEp = spans[1]?.textContent?.trim() || '';
        const epName = spans[2]?.textContent?.trim() || '';
        episodeTitle = seasonEp ? `${seasonEp} - ${epName}` : epName;
      } else if (spans.length === 2) {
        seriesTitle = spans[0]?.textContent?.trim() || '';
        episodeTitle = spans[1]?.textContent?.trim() || '';
      } else {
        seriesTitle = titleContainer.textContent?.trim() || '';
      }
    }

    // Detect Skip Intro / Recap button visibility and text
    const skipBtn = findVisibleButton([
      'button[data-uia="player-skip-intro"]',
      'button[data-uia="player-skip-recap"]',
      '.watch-video--skip-content-button',
      '.skip-credits > a',
      '.skip-credits > button',
    ]);

    const skipVisible = !!skipBtn && isElementVisible(skipBtn);
    const skipText = skipBtn?.textContent?.trim() || 'Omitir intro';

    return {
      ...baseState,
      service: 'netflix',
      series: seriesTitle || undefined,
      episode: episodeTitle || undefined,
      title: episodeTitle ? `${seriesTitle ? seriesTitle + ': ' : ''}${episodeTitle}` : (seriesTitle || baseState.title),
      skipButton: {
        visible: skipVisible,
        text: skipText,
      },
    };
  }
}
