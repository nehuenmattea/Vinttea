import type { SiteAdapter, PlayerState } from './types';
import { findVisibleButton } from './utils';
import { GenericAdapter } from './generic';

export class YouTubeMusicAdapter extends GenericAdapter implements SiteAdapter {
  id = 'youtubemusic';
  name = 'YouTube Music';

  matches(url: string): boolean {
    return url.includes('music.youtube.com');
  }

  override nextEpisode(): void {
    const nextBtn = findVisibleButton([
      '.next-button',
      'button[aria-label*="Siguiente" i]',
      'button[aria-label*="Next" i]',
    ]);
    if (nextBtn) {
      nextBtn.click();
    }
  }

  override prevEpisode(): void {
    const prevBtn = findVisibleButton([
      '.previous-button',
      'button[aria-label*="Anterior" i]',
      'button[aria-label*="Previous" i]',
    ]);
    if (prevBtn) {
      prevBtn.click();
    }
  }

  override getState(): PlayerState | null {
    const baseState = super.getState();
    if (!baseState) return null;

    const titleEl = document.querySelector<HTMLElement>(
      'yt-formatted-string.title.ytmusic-player-bar, .middle-controls .title'
    );
    const bylineEl = document.querySelector<HTMLElement>(
      'yt-formatted-string.byline.ytmusic-player-bar, .middle-controls .byline'
    );

    const trackTitle = titleEl?.textContent?.trim() || baseState.title;
    const artist = bylineEl?.textContent?.trim() || '';

    return {
      ...baseState,
      service: 'youtubemusic',
      series: artist || undefined,
      episode: trackTitle || undefined,
      title: artist ? `${artist} - ${trackTitle}` : trackTitle,
    };
  }
}
