import type { SiteAdapter, PlayerState } from './types';
import { findVisibleButton, isElementVisible, simulateKey } from './utils';
import { GenericAdapter } from './generic';

export class YouTubeAdapter extends GenericAdapter implements SiteAdapter {
  id = 'youtube';
  name = 'YouTube';

  matches(url: string): boolean {
    return (
      (url.includes('youtube.com/watch') ||
        url.includes('youtube.com/embed') ||
        url.includes('youtube.com/shorts')) &&
      !url.includes('music.youtube.com')
    );
  }

  override nextEpisode(): void {
    const nextBtn = findVisibleButton(['.ytp-next-button']);
    if (nextBtn) {
      nextBtn.click();
    } else {
      simulateKey('N', 'KeyN', 78);
    }
  }

  override prevEpisode(): void {
    const prevBtn = findVisibleButton(['.ytp-prev-button']);
    if (prevBtn) {
      prevBtn.click();
    } else {
      simulateKey('P', 'KeyP', 80);
    }
  }

  override toggleFullscreen(): void {
    const fsBtn = findVisibleButton(['.ytp-fullscreen-button']);
    if (fsBtn) {
      fsBtn.click();
    } else {
      simulateKey('f', 'KeyF', 70);
    }
  }

  override skipIntro(): void {
    // On YouTube, skipIntro skips ads or sponsor segments
    const skipAdBtn = findVisibleButton([
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      'button.ytp-ad-skip-button-slot',
    ]);
    if (skipAdBtn) {
      skipAdBtn.click();
    }
  }

  override getState(): PlayerState | null {
    const baseState = super.getState();
    if (!baseState) return null;

    // Try extracting specific YouTube title
    const titleEl = document.querySelector<HTMLElement>(
      '#title h1 yt-formatted-string, ytd-watch-metadata #title, #above-the-fold #title'
    );
    let title = titleEl?.textContent?.trim() || baseState.title;
    title = title.replace(/\s*-\s*YouTube$/i, '').trim();

    // Channel name
    const channelEl = document.querySelector<HTMLElement>(
      'ytd-channel-name yt-formatted-string#text, #channel-name a'
    );
    const channelName = channelEl?.textContent?.trim() || '';

    // Check if Skip Ad is visible
    const skipAdBtn = findVisibleButton([
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      'button.ytp-ad-skip-button-slot',
    ]);
    const skipVisible = !!skipAdBtn && isElementVisible(skipAdBtn);

    return {
      ...baseState,
      title: title || 'YouTube Video',
      series: channelName || undefined,
      service: 'youtube',
      skipButton: {
        visible: skipVisible,
        text: 'Omitir anuncio',
      },
    };
  }
}
