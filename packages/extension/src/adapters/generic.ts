import type { SiteAdapter, PlayerState } from './types';
import { toggleReliableFullscreen, isFullscreenActive } from './utils';

export class GenericAdapter implements SiteAdapter {
  id = 'generic';
  name = 'Reproductor Web Estándar';

  private getVideoElement(): HTMLVideoElement | null {
    // Look for playing video first, or largest video on page
    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length === 0) return null;

    const playing = videos.find((v) => !v.paused && v.readyState > 1);
    if (playing) return playing;

    // Sort by visible size
    return videos.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      return bRect.width * bRect.height - aRect.width * aRect.height;
    })[0];
  }

  matches(_url: string): boolean {
    return true; // Generic fallback
  }

  play(): void {
    const video = this.getVideoElement();
    if (video) video.play();
  }

  pause(): void {
    const video = this.getVideoElement();
    if (video) video.pause();
  }

  togglePlay(): void {
    const video = this.getVideoElement();
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  seek(seconds: number): void {
    const video = this.getVideoElement();
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    video.currentTime = target;
  }

  seekTo(seconds: number): void {
    const video = this.getVideoElement();
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, seconds));
  }

  setVolume(level: number): void {
    const video = this.getVideoElement();
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, level));
    video.volume = clamped;
    video.muted = clamped === 0;
  }

  toggleMute(): void {
    const video = this.getVideoElement();
    if (!video) return;
    video.muted = !video.muted;
  }

  toggleFullscreen(): void {
    const video = this.getVideoElement();
    toggleReliableFullscreen(video, video?.parentElement, [
      'button[aria-label*="fullscreen" i]',
      'button[aria-label*="pantalla completa" i]',
      'button[title*="fullscreen" i]',
      'button[title*="pantalla completa" i]',
    ]);
  }

  nextEpisode(): void {
    // Attempt standard 'next' button selectors
    const nextBtn = document.querySelector<HTMLElement>(
      'button[aria-label*="next" i], button[aria-label*="siguiente" i], .next-button, [data-testid*="next"]'
    );
    if (nextBtn) {
      nextBtn.click();
    }
  }

  prevEpisode(): void {
    const prevBtn = document.querySelector<HTMLElement>(
      'button[aria-label*="prev" i], button[aria-label*="anterior" i], .prev-button, [data-testid*="prev"]'
    );
    if (prevBtn) {
      prevBtn.click();
    }
  }

  getState(): PlayerState | null {
    const video = this.getVideoElement();
    if (!video) return null;

    let title = document.title || 'Video en reproducción';
    // Clean document title if it ends with common suffixes like "- YouTube"
    title = title.replace(/\s*-\s*(YouTube|Netflix|Crunchyroll|Prime Video).*$/i, '').trim();

    const poster =
      video.getAttribute('poster') ||
      document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      undefined;

    return {
      playing: !video.paused && !video.ended,
      title: title || 'Video en reproducción',
      position: Math.round(video.currentTime),
      duration: Math.round(video.duration || 0),
      volume: video.muted ? 0 : video.volume,
      muted: video.muted,
      fullscreen: isFullscreenActive(),
      service: 'generic',
      playbackRate: video.playbackRate,
      thumbnail: poster || undefined,
      updatedAt: Date.now(),
    };
  }
}
