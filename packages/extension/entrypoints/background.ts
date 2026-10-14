import { defineBackground } from 'wxt/sandbox';
import type { VintteaMessage, CommandMessage, StateMessage } from '@vinttea/shared';

export default defineBackground(() => {
  console.log('[Vinttea Background] Service worker initialized.');

  let ws: WebSocket | null = null;
  let reconnectTimer: any = null;
  let heartbeatTimer: any = null;
  let lastActiveMediaTabId: number | null = null;
  let lastActiveMediaFrameId: number | null = null;

  const WS_URL = 'ws://localhost:9876/ws?role=extension';

  function connect() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return;
    }

    console.log('[Vinttea] Connecting to server:', WS_URL);

    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[Vinttea] Connected to server.');
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        // Identify self
        ws?.send(
          JSON.stringify({
            type: 'identify',
            role: 'extension',
            deviceName: 'PC Browser',
          })
        );

        // Start heartbeat ping
        startHeartbeat();

        // Request state from active tab
        forwardCommandToTab('requestState');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as VintteaMessage;
          handleServerMessage(msg);
        } catch (e) {
          console.error('[Vinttea] Failed to parse server message:', e);
        }
      };

      ws.onclose = () => {
        console.log('[Vinttea] WebSocket closed. Reconnecting in 3s...');
        stopHeartbeat();
        scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.warn('[Vinttea] WebSocket error:', err);
        ws?.close();
      };
    } catch (err) {
      console.error('[Vinttea] Connection error:', err);
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 3000);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function sendToServer(msg: VintteaMessage) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  async function getTargetTab(): Promise<chrome.tabs.Tab | null> {
    // 1. Try active tab in current/last focused window
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTab && activeTab.id) {
      return activeTab;
    }

    // 2. Try last active media tab if still valid
    if (lastActiveMediaTabId) {
      try {
        const tab = await chrome.tabs.get(lastActiveMediaTabId);
        if (tab) return tab;
      } catch {
        lastActiveMediaTabId = null;
      }
    }

    // 3. Fallback to any tab with audible audio or active
    const audibleTabs = await chrome.tabs.query({ audible: true });
    if (audibleTabs.length > 0) {
      return audibleTabs[0];
    }

    const allTabs = await chrome.tabs.query({});
    return allTabs[0] || null;
  }

  async function forwardCommandToTab(action: string, value?: number) {
    const tab = await getTargetTab();
    if (!tab || !tab.id) {
      console.warn('[Vinttea] No suitable tab found to send command:', action);
      return;
    }

    lastActiveMediaTabId = tab.id;

    const msg = { type: 'vinttea_command', action, value };
    const options = lastActiveMediaFrameId !== null ? { frameId: lastActiveMediaFrameId } : undefined;

    chrome.tabs.sendMessage(tab.id, msg, options, (response) => {
      if (chrome.runtime.lastError && options) {
        // Fallback to default frame
        chrome.tabs.sendMessage(tab.id, msg, (res) => {
          if (res && res.state) {
            sendToServer({ type: 'state', state: res.state });
          }
        });
        return;
      }
      if (response && response.state) {
        sendToServer({ type: 'state', state: response.state });
      }
    });
  }

  function handleServerMessage(msg: VintteaMessage) {
    if (msg.type === 'command') {
      const cmd = msg as CommandMessage;
      forwardCommandToTab(cmd.action, cmd.value);
    }
  }

  // Listen for messages from content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'vinttea_state_update') {
      if (sender.tab?.id) {
        lastActiveMediaTabId = sender.tab.id;
        lastActiveMediaFrameId = sender.frameId ?? 0;
      }
      sendToServer({ type: 'state', state: message.state });
      sendResponse({ received: true });
    } else if (message.type === 'vinttea_window_fullscreen') {
      if (sender.tab?.windowId) {
        chrome.windows.get(sender.tab.windowId, (win) => {
          const isFs = win.state === 'fullscreen';
          const targetState = message.fullscreen !== undefined
            ? (message.fullscreen ? 'fullscreen' : 'maximized')
            : (isFs ? 'maximized' : 'fullscreen');
          chrome.windows.update(sender.tab!.windowId, { state: targetState });
        });
      }
      sendResponse({ handled: true });
    }
  });

  // Re-connect when tabs update or activate to keep service worker alive
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    lastActiveMediaTabId = activeInfo.tabId;
    connect();
    // Request state from the newly focused tab
    chrome.tabs.sendMessage(activeInfo.tabId, { type: 'vinttea_command', action: 'requestState' }, (res) => {
      if (!chrome.runtime.lastError && res && res.state) {
        sendToServer({ type: 'state', state: res.state });
      }
    });
  });

  // Connect on start
  connect();
});
