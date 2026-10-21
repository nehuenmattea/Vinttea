import type { SiteAdapter, PlayerState, EpisodePreview } from './types';
import {
  simulateKey,
  findInteractiveButton,
  clickElementSafely,
  wakePlayerControls,
  toggleReliableFullscreen,
  isFullscreenActive,
} from './utils';
import { GenericAdapter } from './generic';

export class CrunchyrollAdapter extends GenericAdapter implements SiteAdapter {
  id = 'crunchyroll';
  name = 'Crunchyroll';

  matches(url: string): boolean {
    return url.includes('crunchyroll.com');
  }

  override togglePlay(): void {
    const playPauseBtn = findInteractiveButton([
      '[data-testid="play_pause_button"]',
      '[data-testid="play-pause-button"]',
      'button[aria-label*="play" i]',
      'button[aria-label*="pause" i]',
      'button[title*="play" i]',
      'button[title*="pause" i]',
    ]);
    if (playPauseBtn) {
      clickElementSafely(playPauseBtn);
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

  override seekTo(seconds: number): void {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration || 0, seconds));
    }
  }

  /**
   * Fixed Crunchyroll fullscreen:
   * Uses toggleReliableFullscreen which combines native button clicks, 'f' shortcut,
   * video dblclick, and virtual CSS fullscreen + window maximization fallback.
   */
  override toggleFullscreen(forceState?: number): void {
    const video = document.querySelector<HTMLVideoElement>('video');
    const playerContainer = document.querySelector<HTMLElement>(
      '#vilos-player, .velocity-player-package, #player0, [data-testid="player-wrapper"], div[class*="player-wrapper"]'
    ) || video?.parentElement;

    toggleReliableFullscreen(
      video,
      playerContainer,
      [
        '[data-testid="fullscreen-button"]',
        '[data-testid="fullscreen_button"]',
        'button[data-t="fullscreen-btn"]',
        'button[title*="pantalla completa" i]',
        'button[title*="fullscreen" i]',
        'button[aria-label*="pantalla completa" i]',
        'button[aria-label*="fullscreen" i]',
        '.fullscreen-icon',
        '[class*="fullscreen-button" i]',
        '[class*="fullscreen_button" i]',
      ],
      forceState
    );
  }

  override nextEpisode(): void {
    const nextBtn = findInteractiveButton([
      '[data-testid="next-episode-button"]',
      '[data-testid="next-button"]',
      'button[data-t="next-episode"]',
      'a[data-testid="next-episode-button"]',
      'button[aria-label*="siguiente" i]',
      'button[aria-label*="next" i]',
    ]);
    if (nextBtn) {
      clickElementSafely(nextBtn);
    } else {
      simulateKey('n', 'KeyN', 78);
    }
  }

  override prevEpisode(): void {
    const prevBtn = findInteractiveButton([
      '[data-testid="prev-episode-button"]',
      '[data-testid="previous-button"]',
      'button[data-t="prev-episode"]',
      'a[data-testid="prev-episode-button"]',
      'button[aria-label*="anterior" i]',
      'button[aria-label*="previous" i]',
    ]);
    if (prevBtn) {
      clickElementSafely(prevBtn);
    } else {
      simulateKey('p', 'KeyP', 80);
    }
  }

  /**
   * Helper to locate Crunchyroll's Skip Intro button.
   */
  private findSkipButton(): HTMLElement | null {
    const btn = findInteractiveButton([
      '[data-testid="skip-button"]',
      '[data-testid="skip-intro-button"]',
      '[data-t="skip-intro"]',
      '.vilos-skip-intro',
      '.skip-intro',
      '[class*="skip-button" i]',
      '[class*="skipintro" i]',
      '[class*="SkipIntro" i]',
    ]);
    if (btn) return btn;

    const allButtons = Array.from(
      document.querySelectorAll<HTMLElement>('button, div[role="button"], a')
    );
    for (const b of allButtons) {
      const txt = (b.textContent || '').trim().toLowerCase();
      if (
        txt.includes('omitir intro') ||
        txt.includes('skip intro') ||
        txt.includes('omitir resumen') ||
        txt.includes('skip recap') ||
        txt === 'omitir' ||
        txt === 'skip'
      ) {
        return b;
      }
    }
    return null;
  }

  override skipIntro(): void {
    wakePlayerControls();
    const skipBtn = this.findSkipButton();
    if (skipBtn) {
      clickElementSafely(skipBtn);
    }
    // Also dispatch Crunchyroll's native skip intro keyboard shortcuts 's' and 'S'
    simulateKey('s', 'KeyS', 83);
    simulateKey('S', 'KeyS', 83);
  }

  override getState(): PlayerState | null {
    const baseState = super.getState();
    if (!baseState) return null;

    // Detect Anime title, Season/Saga & Episode title
    const seriesEl = document.querySelector<HTMLElement>(
      '[data-t="show-title"], .show-title-link, a[href*="/series/"]'
    );
    const seasonEl = document.querySelector<HTMLElement>(
      '[data-t="season-title"], .season-title, .season-selector, [class*="season-title" i], [class*="seasonTitle" i], [data-testid="season-name"]'
    );
    const episodeEl = document.querySelector<HTMLElement>(
      '[data-t="episode-title"], h1.title, .episode-title, h4.title'
    );

    const seriesTitle = seriesEl?.textContent?.trim() || '';
    let seasonTitle = seasonEl?.textContent?.trim() || '';
    const episodeTitle = episodeEl?.textContent?.trim() || '';

    // If seasonTitle is not found directly, check breadcrumbs or subtitles
    if (!seasonTitle) {
      const breadcrumbs = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.breadcrumb a, [class*="breadcrumb" i] span, [class*="breadcrumb" i] a'
        )
      );
      for (const b of breadcrumbs) {
        const txt = (b.textContent || '').trim();
        if (/temporada|season|saga|arco|t\d+/i.test(txt) && txt !== seriesTitle) {
          seasonTitle = txt;
          break;
        }
      }
    }

    // Detect Skip Intro button:
    // Even if controls fade out, as long as Crunchyroll keeps the skip button in DOM, it is ACTIVE and CLICKABLE!
    const skipBtn = this.findSkipButton();
    const skipVisible = !!skipBtn && skipBtn.isConnected;
    const skipText = skipBtn?.textContent?.trim() || 'Omitir intro';

    // Extract Thumbnails: Current, Next, Prev
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    const videoPoster = document.querySelector('video')?.getAttribute('poster');
    const thumbImg = document.querySelector<HTMLImageElement>(
      'img[data-t="thumbnail"], .video-player-wrapper img, .current-media-poster img'
    );
    const currentThumb = ogImage || videoPoster || thumbImg?.src || baseState.thumbnail;

    let nextPreview: EpisodePreview | undefined;
    const nextCard = document.querySelector<HTMLElement>(
      '[data-testid="next-episode-card"], .up-next-section a, .next-episode-card, a[href*="/watch/"][class*="next"]'
    );
    if (nextCard) {
      const nextImg = nextCard.querySelector<HTMLImageElement>('img')?.src;
      const nextTitle =
        nextCard.querySelector<HTMLElement>('[class*="title"], h4, p')?.textContent?.trim() ||
        'Siguiente Episodio';
      if (nextImg || nextTitle) {
        nextPreview = { title: nextTitle, thumbnail: nextImg };
      }
    }

    let prevPreview: EpisodePreview | undefined;
    const prevCard = document.querySelector<HTMLElement>(
      '[data-testid="prev-episode-card"], .prev-episode-card, a[href*="/watch/"][class*="prev"]'
    );
    if (prevCard) {
      const prevImg = prevCard.querySelector<HTMLImageElement>('img')?.src;
      const prevTitle =
        prevCard.querySelector<HTMLElement>('[class*="title"], h4, p')?.textContent?.trim() ||
        'Episodio Anterior';
      if (prevImg || prevTitle) {
        prevPreview = { title: prevTitle, thumbnail: prevImg };
      }
    }

    return {
      ...baseState,
      service: 'crunchyroll',
      series: seriesTitle || undefined,
      season: seasonTitle || undefined,
      episode: episodeTitle || undefined,
      title: episodeTitle
        ? `${seriesTitle ? seriesTitle + ' - ' : ''}${episodeTitle}`
        : seriesTitle || baseState.title,
      fullscreen: isFullscreenActive(),
      thumbnail: currentThumb,
      nextPreview: nextPreview || baseState.nextPreview,
      prevPreview: prevPreview || baseState.prevPreview,
      skipButton: {
        visible: skipVisible,
        text: skipText.length > 25 ? 'Omitir intro' : skipText,
      },
    };
  }
}
