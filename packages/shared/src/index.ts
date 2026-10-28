export interface EpisodePreview {
  title?: string;
  episode?: string;
  thumbnail?: string;
}

/**
 * Player state representing current playback in the active streaming tab.
 */
export interface PlayerState {
  playing: boolean;
  title: string;
  series?: string;       // Nombre de la serie o anime si aplica
  season?: string;       // Temporada, saga o arco (ej: "Temporada 4", "Saga de Wano")
  episode?: string;      // "T1:E3 - Título" o "Episodio 24"
  position: number;     // seconds
  duration: number;     // seconds
  volume: number;       // 0.0 to 1.0
  muted: boolean;
  fullscreen?: boolean;
  service?: 'youtube' | 'youtubemusic' | 'netflix' | 'crunchyroll' | 'prime' | 'generic' | string;
  playbackRate?: number;
  thumbnail?: string;    // Portada / miniatura del video actual
  prevPreview?: EpisodePreview; // Info y miniatura del episodio anterior
  nextPreview?: EpisodePreview; // Info y miniatura del episodio siguiente
  skipButton?: {
    visible: boolean;
    text: string;       // "Omitir intro", "Omitir resumen", etc.
  };
  updatedAt?: number;   // timestamp ms
}

/**
 * Commands that can be sent from a remote control to the browser.
 */
export type CommandAction =
  | 'play'
  | 'pause'
  | 'togglePlay'
  | 'seek'              // relative seconds (+10, -10, etc.)
  | 'seekTo'            // absolute seconds
  | 'setVolume'         // target volume (0.0 to 1.0)
  | 'volumeDelta'       // volume change (+0.1, -0.1)
  | 'toggleMute'
  | 'toggleFullscreen'
  | 'nextEpisode'
  | 'prevEpisode'
  | 'skipIntro'         // Omitir intro o resumen
  | 'requestState';

export type ClientRole = 'remote' | 'extension' | 'web-tester';

/**
 * WebSocket Protocol Messages
 */
export interface IdentifyMessage {
  type: 'identify';
  role: ClientRole;
  deviceName?: string;
  token?: string;
}

export interface IdentifiedMessage {
  type: 'identified';
  success: boolean;
  clientId: string;
  role: ClientRole;
  message?: string;
}

export interface CommandMessage {
  type: 'command';
  action: CommandAction;
  value?: number;
}

export interface StateMessage {
  type: 'state';
  state: PlayerState;
}

export interface StatusMessage {
  type: 'status';
  extensionConnected: boolean;
  activeRemotes: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface PingMessage {
  type: 'ping';
}

export interface PongMessage {
  type: 'pong';
}

export type VintteaMessage =
  | IdentifyMessage
  | IdentifiedMessage
  | CommandMessage
  | StateMessage
  | StatusMessage
  | ErrorMessage
  | PingMessage
  | PongMessage;

/**
 * SiteAdapter interface to normalize media player interactions across platforms.
 */
export interface SiteAdapter {
  id: string;
  name: string;
  matches(url: string): boolean;
  play(): Promise<void> | void;
  pause(): Promise<void> | void;
  togglePlay?(): Promise<void> | void;
  seek(seconds: number): Promise<void> | void;
  seekTo?(seconds: number): Promise<void> | void;
  setVolume(level: number): Promise<void> | void;
  toggleMute?(): Promise<void> | void;
  toggleFullscreen?(value?: number): Promise<void> | void;
  nextEpisode(): Promise<void> | void;
  prevEpisode(): Promise<void> | void;
  skipIntro?(): Promise<void> | void;
  getState(): PlayerState | null;
}

/**
 * Default constants
 */
export const DEFAULT_PORT = 9876;
export const DEFAULT_WS_PATH = '/ws';
export const HEARTBEAT_INTERVAL_MS = 15000;
