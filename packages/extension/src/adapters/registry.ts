import type { SiteAdapter } from './types';
import { NetflixAdapter } from './netflix';
import { CrunchyrollAdapter } from './crunchyroll';
import { YouTubeMusicAdapter } from './youtubeMusic';
import { YouTubeAdapter } from './youtube';
import { GenericAdapter } from './generic';

const adapters: SiteAdapter[] = [
  new NetflixAdapter(),
  new CrunchyrollAdapter(),
  new YouTubeMusicAdapter(),
  new YouTubeAdapter(),
  new GenericAdapter(), // Generic fallback must be last
];

export function getAdapterForUrl(url: string): SiteAdapter {
  for (const adapter of adapters) {
    if (adapter.matches(url)) {
      return adapter;
    }
  }
  return adapters[adapters.length - 1];
}
