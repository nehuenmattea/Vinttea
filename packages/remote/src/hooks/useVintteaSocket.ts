import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { PlayerState, CommandAction, VintteaMessage } from '@vinttea/shared';

const INITIAL_PLAYER_STATE: PlayerState = {
  playing: false,
  title: 'Esperando video...',
  position: 0,
  duration: 0,
  volume: 1,
  muted: false,
  service: 'generic',
  skipButton: { visible: false, text: 'Omitir intro' },
};

export function useVintteaSocket() {
  const [serverConnected, setServerConnected] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [state, setState] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: any = null;

    function connect() {
      const host = window.location.hostname || 'localhost';
      const wsUrl = `ws://${host}:9876/ws?role=remote`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setServerConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as VintteaMessage;
          if (msg.type === 'status') {
            setExtensionConnected(msg.extensionConnected);
          } else if (msg.type === 'state') {
            setState(msg.state);
          }
        } catch (err) {
          console.error('[Vinttea] Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setServerConnected(false);
        setExtensionConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const sendCommand = useCallback((action: CommandAction, value?: number) => {
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'command', action, value }));
    }
  }, []);

  return {
    serverConnected,
    extensionConnected,
    state,
    sendCommand,
  };
}
