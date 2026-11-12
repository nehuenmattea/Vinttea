import type { SiteAdapter, PlayerState, EpisodePreview } from './types';
import {
  simulateKey,
  findInteractiveButton,
  isSkipButtonTrulyActive,
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

  /** Uses Crunchyroll's own fullscreen control for the media player. */
  override toggleFullscreen(forceState?: number): void {
    const video = document.querySelector<HTMLVideoElement>('video');
    const playerContainer =
      document.querySelector<HTMLElement>(
        '#vilos, #vilos-player, .velocity-player-package, #player0, [data-testid="player-wrapper"], [class*="video-player-wrapper" i], div[class*="player-wrapper"]'
      ) || video?.parentElement;

    toggleReliableFullscreen(
      video,
      playerContainer,
      [
        'button[data-testid="fullscreen-button"]',
        'button[data-testid="fullscreen_button"]',
        'button[data-t="fullscreen-btn"]',
        'button[title*="pantalla completa" i]',
        'button[title*="fullscreen" i]',
        'button[aria-label*="pantalla completa" i]',
        'button[aria-label*="fullscreen" i]',
        'button[aria-label*="full screen" i]',
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
   * Robust Skip Button detection:
   * Accurately detects whether "Omitir intro" or "Omitir resumen" is genuinely active,
   * avoiding flickering and fading properly once the intro or recap ends.
   */
  private getSkipButtonInfo(): { visible: boolean; text: string; element: HTMLElement | null } {
    const selectors = [
      '[data-testid="skip-button"]',
      '[data-testid="skip-intro-button"]',
      '[data-testid="skip-recap-button"]',
      '[data-t="skip-intro"]',
      '[data-t="skip-recap"]',
      '.vilos-skip-intro',
      '.skip-intro',
      '[class*="skip-button" i]',
      '[class*="skipintro" i]',
      '[class*="SkipIntro" i]',
      '[class*="skip-recap" i]',
      '[class*="skiprecap" i]',
    ];

    const candidates: HTMLElement[] = [];
    for (const sel of selectors) {
      const matches = Array.from(document.querySelectorAll<HTMLElement>(sel));
      for (const m of matches) {
        if (!candidates.includes(m)) candidates.push(m);
      }
    }

    const allButtons = Array.from(
      document.querySelectorAll<HTMLElement>('button, div[role="button"], a')
    );
    for (const b of allButtons) {
      const txt = (b.textContent || '').trim().toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      if (
        txt.includes('omitir') ||
        txt.includes('skip') ||
        aria.includes('omitir') ||
        aria.includes('skip')
      ) {
        if (!candidates.includes(b)) candidates.push(b);
      }
    }

    // 1. Check if any button is truly active right now
    for (const btn of candidates) {
      if (isSkipButtonTrulyActive(btn)) {
        const fullTxt = (
          (btn.textContent || '') +
          ' ' +
          (btn.getAttribute('aria-label') || '') +
          ' ' +
          (btn.getAttribute('title') || '')
        ).toLowerCase();

        let label = 'Omitir intro';
        if (fullTxt.includes('resumen') || fullTxt.includes('recap')) {
          label = 'Omitir resumen';
        } else if (
          fullTxt.includes('créditos') ||
          fullTxt.includes('credits') ||
          fullTxt.includes('ending') ||
          fullTxt.includes('outro')
        ) {
          label = 'Omitir créditos';
        } else if (fullTxt.includes('intro') || fullTxt.includes('opening')) {
          label = 'Omitir intro';
        } else {
          const video = document.querySelector<HTMLVideoElement>('video');
          const time = video?.currentTime || 0;
          label = time < 100 ? 'Omitir resumen' : 'Omitir intro';
        }

        return { visible: true, text: label, element: btn };
      }
    }

    // 2. If not active, extract candidate text for idle display
    for (const btn of candidates) {
      if (btn.isConnected) {
        const fullTxt = ((btn.textContent || '') + ' ' + (btn.getAttribute('aria-label') || '')).toLowerCase();
        let label = 'Omitir intro';
        if (fullTxt.includes('resumen') || fullTxt.includes('recap')) {
          label = 'Omitir resumen';
        }
        return { visible: false, text: label, element: btn };
      }
    }

    return { visible: false, text: 'Omitir intro', element: null };
  }

  override skipIntro(): void {
    wakePlayerControls();
    const info = this.getSkipButtonInfo();
    if (info.element) {
      clickElementSafely(info.element);
    }
    // Also dispatch Crunchyroll's native skip intro keyboard shortcuts 's' and 'S'
    simulateKey('s', 'KeyS', 83);
    simulateKey('S', 'KeyS', 83);
  }

  /**
   * Extracts anime season or saga (e.g. Dragon Ball 1986 sagas like "Saga de Pilaf", "Saga de la Patrulla Roja")
   */
  private extractSeason(seriesTitle: string): string | undefined {
    // 1. Check Schema.org JSON-LD (most reliable for anime sagas)
    try {
      const scripts = Array.from(
        document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
      );
      for (const s of scripts) {
        if (!s.textContent) continue;
        const data = JSON.parse(s.textContent);
        const checkItem = (item: any): string | null => {
          if (!item) return null;
          if (item['@type'] === 'TVEpisode' || item.partOfSeason || item.partOfSeries) {
            const seasonName = item.partOfSeason?.name || item.season?.name;
            if (seasonName && typeof seasonName === 'string') return seasonName.trim();
          }
          if (item['@type'] === 'TVSeason' && item.name) {
            return String(item.name).trim();
          }
          if (Array.isArray(item['@graph'])) {
            for (const g of item['@graph']) {
              const res = checkItem(g);
              if (res) return res;
            }
          }
          return null;
        };
        const found = checkItem(data);
        if (found) {
          return this.cleanSeasonName(found, seriesTitle);
        }
      }
    } catch {}

    // 2. Season selector dropdown button or text on Crunchyroll
    const seasonSelectors = [
      '[data-testid="season-selector-button"]',
      'button[data-testid="season-selector-button"]',
      '[data-t="season-title"]',
      '.season-title',
      '[class*="season-title" i]',
      '[class*="seasonTitle" i]',
      '[data-testid="season-name"]',
      '[class*="seasonSelector" i] [class*="title" i]',
      '.season-selector',
      '[class*="select-season" i]',
    ];
    for (const sel of seasonSelectors) {
      const el = document.querySelector<HTMLElement>(sel);
      const txt = el?.textContent?.trim();
      if (txt && txt.length > 1 && txt.length < 80) {
        return this.cleanSeasonName(txt, seriesTitle);
      }
    }

    // 3. Breadcrumbs
    const breadcrumbs = Array.from(
      document.querySelectorAll<HTMLElement>(
        'nav[aria-label*="readcrumb" i] a, .erc-breadcrumb a, .breadcrumb a, [class*="breadcrumb" i] a, [class*="breadcrumb" i] span'
      )
    );
    if (breadcrumbs.length >= 2) {
      for (let i = 1; i < breadcrumbs.length; i++) {
        const txt = (breadcrumbs[i].textContent || '').trim();
        if (
          /temporada|season|saga|arco|t\d+|serie|part/i.test(txt) &&
          txt.length < 70 &&
          txt !== seriesTitle
        ) {
          return this.cleanSeasonName(txt, seriesTitle);
        }
      }
    }

    // 4. Subtitle or episode metadata row
    const metaRow = document.querySelector<HTMLElement>(
      '[class*="episode-header" i], [class*="current-media" i], [data-t="episode-header"]'
    );
    if (metaRow) {
      const match = metaRow.textContent?.match(
        /(Temporada\s+\d+|Season\s+\d+|Saga\s+[^-\n\r|,]+|Arco\s+[^-\n\r|,]+|T\d+\s*:\s*E\d+)/i
      );
      if (match && match[1]) {
        return this.cleanSeasonName(match[1].trim(), seriesTitle);
      }
    }

    return undefined;
  }

  private cleanSeasonName(raw: string, seriesTitle: string): string {
    let clean = raw.trim();
    if (seriesTitle) {
      // Remove repetitive "Dragon Ball (Saga de Pilaf)" -> "Saga de Pilaf"
      clean = clean
        .replace(new RegExp(`^${seriesTitle}\\s*[-–:]?\\s*\\(?`, 'i'), '')
        .replace(/\)$/, '')
        .trim();
    }
    return clean || raw;
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
    const seasonTitle = this.extractSeason(seriesTitle);

    // Skip Button status: checks genuine activity so it doesn't flicker or linger
    const skipInfo = this.getSkipButtonInfo();

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
        visible: skipInfo.visible,
        text: skipInfo.text,
      },
    };
  }
}
