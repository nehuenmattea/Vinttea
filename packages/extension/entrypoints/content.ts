import { defineContentScript } from 'wxt/sandbox';
import { getAdapterForUrl } from '../src/adapters/registry';
import type { PlayerState, CommandAction } from '../src/adapters/types';

export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_idle',
  main() {
    console.log('[Vinttea Content Script] Injected on', window.location.href);

    const adapter = getAdapterForUrl(window.location.href);
    let lastReportedTime = 0;
    let attachedVideos = new WeakSet<HTMLVideoElement>();

    function sendStateUpdate() {
      const state = adapter.getState();
      if (!state) return;

      chrome.runtime.sendMessage({
        type: 'vinttea_state_update',
        state,
      }).catch(() => {
        // Background script might be temporarily inactive
      });
    }

    function attachListenersToVideo(video: HTMLVideoElement) {
      if (attachedVideos.has(video)) return;
      attachedVideos.add(video);

      const notifyChange = () => {
        sendStateUpdate();
      };

      video.addEventListener('play', notifyChange);
      video.addEventListener('pause', notifyChange);
      video.addEventListener('volumechange', notifyChange);
      video.addEventListener('ended', notifyChange);

      video.addEventListener('timeupdate', () => {
        const now = Date.now();
        // Throttle time updates to once per 800ms
        if (now - lastReportedTime > 800) {
          lastReportedTime = now;
          sendStateUpdate();
        }
      });

      // Initial report if video is already playing
      if (!video.paused) {
        notifyChange();
      }
    }

    function scanForVideos() {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => attachListenersToVideo(v));
    }

    // Scan initial videos
    scanForVideos();

    // Observe DOM mutations to hook newly added videos (SPA navigation)
    const observer = new MutationObserver(() => {
      scanForVideos();
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Listen for remote commands from background service worker
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'vinttea_command') {
        const action: CommandAction = message.action;
        const value: number | undefined = message.value;

        switch (action) {
          case 'play':
            adapter.play();
            break;
          case 'pause':
            adapter.pause();
            break;
          case 'togglePlay':
            if (adapter.togglePlay) {
              adapter.togglePlay();
            } else {
              const state = adapter.getState();
              if (state?.playing) adapter.pause();
              else adapter.play();
            }
            break;
          case 'seek':
            adapter.seek(value || 0);
            break;
          case 'seekTo':
            if (adapter.seekTo) {
              adapter.seekTo(value || 0);
            } else {
              adapter.seek(value || 0);
            }
            break;
          case 'setVolume':
            adapter.setVolume(value !== undefined ? value : 1);
            break;
          case 'toggleMute':
            if (adapter.toggleMute) {
              adapter.toggleMute();
            }
            break;
          case 'toggleFullscreen':
            if (adapter.toggleFullscreen) {
              adapter.toggleFullscreen();
            }
            break;
          case 'nextEpisode':
            adapter.nextEpisode();
            break;
          case 'prevEpisode':
            adapter.prevEpisode();
            break;
          case 'skipIntro':
            if (adapter.skipIntro) {
              adapter.skipIntro();
            }
            break;
          case 'requestState':
            break;
        }

        // Return updated state after short delay to let video DOM update
        setTimeout(() => {
          const state = adapter.getState();
          sendResponse({ state });
          sendStateUpdate();
        }, 50);

        return true; // Keep sendResponse channel open for async response
      }
    });
  },
});
