export function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export interface ServiceConfig {
  name: string;
  badgeBg: string;
  badgeColor: string;
  accent: string;
}

export const SERVICE_CONFIGS: Record<string, ServiceConfig> = {
  netflix: {
    name: 'Netflix',
    badgeBg: 'rgba(229, 9, 20, 0.18)',
    badgeColor: '#e50914',
    accent: '#e50914',
  },
  crunchyroll: {
    name: 'Crunchyroll',
    badgeBg: 'rgba(255, 100, 10, 0.18)',
    badgeColor: '#ff640a',
    accent: '#ff640a',
  },
  youtube: {
    name: 'YouTube',
    badgeBg: 'rgba(255, 0, 0, 0.18)',
    badgeColor: '#ff2d2d',
    accent: '#ff0000',
  },
  youtubemusic: {
    name: 'YouTube Music',
    badgeBg: 'rgba(255, 0, 51, 0.22)',
    badgeColor: '#ff0033',
    accent: '#ff0033',
  },
  prime: {
    name: 'Prime Video',
    badgeBg: 'rgba(0, 168, 225, 0.18)',
    badgeColor: '#00a8e1',
    accent: '#00a8e1',
  },
  generic: {
    name: 'Reproductor Web',
    badgeBg: 'rgba(99, 102, 241, 0.18)',
    badgeColor: '#818cf8',
    accent: '#6366f1',
  },
};

export interface AnimeTheme {
  name: string;
  badge: string;
  accent: string;
  icon: 'dragonball' | 'onepiece' | 'naruto' | 'kimetsu' | 'shingeki';
}

export function getAnimeTheme(title: string = '', series: string = ''): AnimeTheme | null {
  const combined = `${title} ${series}`.toLowerCase();

  if (/dragon\s*ball|dbz|goku|vegeta/i.test(combined)) {
    return {
      name: 'Dragon Ball',
      badge: '🐉 DRAGON BALL',
      accent: '#f59e0b',
      icon: 'dragonball',
    };
  }
  if (/one\s*piece|luffy|zoro|mugiwara/i.test(combined)) {
    return {
      name: 'One Piece',
      badge: '🏴‍☠️ MUGIWARA',
      accent: '#eab308',
      icon: 'onepiece',
    };
  }
  if (/naruto|boruto|shippuden/i.test(combined)) {
    return {
      name: 'Naruto',
      badge: '🍥 ALDEA DE LA HOJA',
      accent: '#f97316',
      icon: 'naruto',
    };
  }
  if (/kimetsu|demon\s*slayer|tanjiro/i.test(combined)) {
    return {
      name: 'Demon Slayer',
      badge: '⚔️ DEMON SLAYER',
      accent: '#0d9488',
      icon: 'kimetsu',
    };
  }
  if (/shingeki|attack\s*on\s*titan|eren/i.test(combined)) {
    return {
      name: 'Attack on Titan',
      badge: '🛡️ LEGIÓN',
      accent: '#10b981',
      icon: 'shingeki',
    };
  }

  return null;
}
