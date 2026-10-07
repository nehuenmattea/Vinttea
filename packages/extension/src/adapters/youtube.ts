import type { SiteAdapter, PlayerState } from './types';
import { GenericAdapter } from './generic';

export class YouTubeAdapter extends GenericAdapter implements SiteAdapter {
  id = 'youtube';
  name = 'YouTube';

  matches(url: string): boolean {
    return url.includes('youtube.com/watch') || url.includes('youtube.com/embed') || url.includes('youtube.com/shorts');
  }

  override nextEpisode(): void {
    const nextBtn = document.querySelector<HTMLElement>('.ytp-next-button');
    if (nextBtn) {
      nextBtn.click();
    } else {
      super.nextEpisode();
    }
  }

  override prevEpisode(): void {
    const prevBtn = document.querySelector<HTMLElement>('.ytp-prev-button');
    if (prevBtn) {
      prevBtn.click();
    } else {
      super.prevEpisode();
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

    return {
      ...baseState,
      title: title || 'YouTube Video',
      service: 'youtube',
    };
  }
}
