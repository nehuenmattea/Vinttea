import type { SiteAdapter, PlayerState } from './types';
import { findInteractiveButton, clickElementSafely } from './utils';
import { GenericAdapter } from './generic';

export class YouTubeMusicAdapter extends GenericAdapter implements SiteAdapter {
  id = 'youtubemusic';
  name = 'YouTube Music';

  matches(url: string): boolean {
    return url.includes('music.youtube.com');
  }

  override nextEpisode(): void {
    const nextBtn = findInteractiveButton([
      '.next-button',
      'button[aria-label*="Siguiente" i]',
      'button[aria-label*="Next" i]',
    ]);
    if (nextBtn) {
      clickElementSafely(nextBtn);
    }
  }

  override prevEpisode(): void {
    const prevBtn = findInteractiveButton([
      '.previous-button',
      'button[aria-label*="Anterior" i]',
      'button[aria-label*="Previous" i]',
    ]);
    if (prevBtn) {
      clickElementSafely(prevBtn);
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
    const thumbnail =
      document.querySelector<HTMLImageElement>('.image.ytmusic-player-bar img')?.src ||
      document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      baseState.thumbnail;

    return {
      ...baseState,
      service: 'youtubemusic',
      series: artist || undefined,
      episode: trackTitle || undefined,
      title: artist ? `${artist} - ${trackTitle}` : trackTitle,
      thumbnail,
    };
  }
}
