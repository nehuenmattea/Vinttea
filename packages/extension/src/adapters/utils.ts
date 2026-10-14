/**
 * Helper to simulate realistic keyboard events that modern media players (Netflix, YouTube, Crunchyroll) recognize.
 */
export function simulateKey(
  key: string,
  code: string,
  keyCode: number,
  target?: Element
): void {
  const eventOptions: KeyboardEventInit = {
    key,
    code,
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    composed: true,
  };

  const downEvent = new KeyboardEvent('keydown', eventOptions);
  const upEvent = new KeyboardEvent('keyup', eventOptions);

  const targets = target
    ? [target]
    : [
        document.activeElement || document.body,
        document.querySelector('video') || document.body,
        document.documentElement,
        window,
      ];

  for (const t of targets) {
    if (t && typeof (t as EventTarget).dispatchEvent === 'function') {
      try {
        (t as EventTarget).dispatchEvent(downEvent);
        (t as EventTarget).dispatchEvent(upEvent);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Wakes up the player control bar (simulating mouse activity over the video area).
 */
export function wakePlayerControls(container?: Element): void {
  const target =
    container ||
    document.querySelector('#vilos, #player0, .video-player, video, #movie_player') ||
    document.body;

  if (target) {
    const moveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight / 2,
    });
    target.dispatchEvent(moveEvent);
  }
}

/**
 * Safely clicks an element, even if the player controls are visually faded out.
 */
export function clickElementSafely(el: HTMLElement): void {
  wakePlayerControls(el);
  try {
    el.click();
  } catch {}
  try {
    el.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
  } catch {}
}

/**
 * Searches for an interactive button matching selectors.
 * If includeFadedControls is true, it will find buttons even when the player control overlay has opacity: 0 (faded).
 */
export function findInteractiveButton(
  selectors: string[],
  includeFadedControls: boolean = true
): HTMLElement | null {
  for (const selector of selectors) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    for (const el of elements) {
      if (!el.isConnected) continue;

      if (includeFadedControls) {
        // As long as the button itself is not explicitly display: none or disabled
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          return el;
        }
      } else {
        if (isElementVisible(el)) {
          return el;
        }
      }
    }
  }
  return null;
}

/**
 * Checks whether an element is fully visible (not faded, not hidden).
 */
export function isElementVisible(el: HTMLElement): boolean {
  if (!el || !el.isConnected) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function ensureFsStyle() {
  if (!document.getElementById('vinttea-fs-style')) {
    const style = document.createElement('style');
    style.id = 'vinttea-fs-style';
    style.textContent = `
      .vinttea-virtual-fullscreen {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        z-index: 2147483647 !important;
        background: #000 !important;
        margin: 0 !important;
      }
      body.vinttea-fs-body-lock {
        overflow: hidden !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }
}

export function isFullscreenActive(): boolean {
  return !!document.fullscreenElement || document.body.classList.contains('vinttea-fs-body-lock');
}

/**
 * Bulletproof fullscreen toggle that handles:
 * 1. Native exit if active.
 * 2. Site button click and keyboard 'f' event.
 * 3. Double-click simulation on video.
 * 4. Virtual CSS Fullscreen + Chrome window-level fullscreen fallback.
 */
export function toggleReliableFullscreen(
  videoEl: HTMLVideoElement | null,
  containerEl?: HTMLElement | null,
  fsBtnSelectors: string[] = []
): void {
  ensureFsStyle();

  if (isFullscreenActive()) {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    document.querySelectorAll('.vinttea-virtual-fullscreen').forEach((el) => {
      el.classList.remove('vinttea-virtual-fullscreen');
    });
    document.body.classList.remove('vinttea-fs-body-lock');
    chrome.runtime.sendMessage({ type: 'vinttea_window_fullscreen', fullscreen: false }).catch(() => {});
    return;
  }

  // 1. Try native button first
  if (fsBtnSelectors.length > 0) {
    const btn = findInteractiveButton(fsBtnSelectors);
    if (btn) {
      clickElementSafely(btn);
    }
  }

  // 2. Dispatch 'f' keydown/keyup
  simulateKey('f', 'KeyF', 70);

  // 3. Double click on video
  if (videoEl) {
    try {
      videoEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
    } catch {}
  }

  // 4. Virtual Fullscreen fallback if native wasn't triggered
  setTimeout(() => {
    if (!document.fullscreenElement) {
      const target = containerEl || videoEl?.parentElement || videoEl;
      if (target) {
        target.classList.add('vinttea-virtual-fullscreen');
        document.body.classList.add('vinttea-fs-body-lock');
        chrome.runtime.sendMessage({ type: 'vinttea_window_fullscreen', fullscreen: true }).catch(() => {});
      }
    }
  }, 120);
}

