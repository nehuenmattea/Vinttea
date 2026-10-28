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
 * Checks whether a skip intro/recap button is genuinely active on screen.
 * Resolves bug where faded/finished buttons remained active or caused flickering.
 */
export function isSkipButtonTrulyActive(btn: HTMLElement | null): boolean {
  if (!btn || !btn.isConnected) return false;

  // 1. Accessibility attributes
  if (btn.getAttribute('aria-hidden') === 'true') return false;
  if (btn.hasAttribute('disabled')) return false;

  // 2. Class names indicating hidden/fade-out
  const className = (btn.className || '').toLowerCase();
  if (
    className.includes('hidden') ||
    className.includes('fade-out') ||
    className.includes('is-hidden') ||
    className.includes('inactive')
  ) {
    return false;
  }

  // 3. Computed style check on button itself
  const style = window.getComputedStyle(btn);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (style.pointerEvents === 'none') return false;
  const opacity = parseFloat(style.opacity || '1');
  if (opacity < 0.1) return false;

  // 4. Must occupy physical screen space
  const rect = btn.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return false;

  // 5. Parent chain check: if container or wrapper is hidden/faded, button is inactive
  let parent = btn.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const pStyle = window.getComputedStyle(parent);
    if (pStyle.display === 'none' || pStyle.visibility === 'hidden') return false;
    const pOpacity = parseFloat(pStyle.opacity || '1');
    if (pOpacity < 0.05) return false;
    parent = parent.parentElement;
  }

  return true;
}

/**
 * Searches for an interactive button matching selectors.
 */
export function findInteractiveButton(
  selectors: string[],
  includeFadedControls: boolean = false
): HTMLElement | null {
  for (const selector of selectors) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    for (const el of elements) {
      if (!el.isConnected) continue;

      if (includeFadedControls) {
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
      html.vinttea-fs-body-lock,
      body.vinttea-fs-body-lock {
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: #000 !important;
      }

      /* Neutralize any ancestor transforms/containment that trap position: fixed */
      .vinttea-fs-ancestor {
        transform: none !important;
        filter: none !important;
        perspective: none !important;
        contain: none !important;
        clip-path: none !important;
        overflow: visible !important;
        max-width: none !important;
        max-height: none !important;
      }

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
        padding: 0 !important;
        border: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .vinttea-virtual-fullscreen video,
      video.vinttea-video-fullscreen {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        object-fit: contain !important;
        background: #000 !important;
        z-index: 2147483647 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }
}

export function isFullscreenActive(): boolean {
  const isDocFs = !!document.fullscreenElement;
  const isCssFs = document.body.classList.contains('vinttea-fs-body-lock');
  const isWindowFs =
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (typeof window !== 'undefined' &&
      typeof screen !== 'undefined' &&
      window.innerHeight >= screen.height - 4 &&
      window.innerWidth >= screen.width - 4);

  return isDocFs || isCssFs || isWindowFs;
}

/**
 * Bulletproof fullscreen toggle that guarantees true edge-to-edge video display:
 * 1. Window-level OS fullscreen via background script (hides Windows taskbar, desktop icons, browser chrome).
 * 2. Neutralizes parent CSS containment/transforms so video is untrapped.
 * 3. Expands video element to 100vw x 100vh (object-fit: contain).
 * 4. Dispatches native button clicks and 'f' shortcut.
 */
export function toggleReliableFullscreen(
  videoEl: HTMLVideoElement | null,
  containerEl?: HTMLElement | null,
  fsBtnSelectors: string[] = [],
  forceState?: number // 1: enter, 0: exit
): void {
  ensureFsStyle();

  const isCurrentlyFs = isFullscreenActive();
  const shouldExit = forceState !== undefined ? forceState === 0 : isCurrentlyFs;

  if (shouldExit) {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    document.querySelectorAll('.vinttea-virtual-fullscreen').forEach((el) => {
      el.classList.remove('vinttea-virtual-fullscreen');
    });
    document.querySelectorAll('.vinttea-video-fullscreen').forEach((el) => {
      el.classList.remove('vinttea-video-fullscreen');
    });
    document.querySelectorAll('.vinttea-fs-ancestor').forEach((el) => {
      el.classList.remove('vinttea-fs-ancestor');
    });
    document.documentElement.classList.remove('vinttea-fs-body-lock');
    document.body.classList.remove('vinttea-fs-body-lock');

    simulateKey('Escape', 'Escape', 27);
    chrome.runtime.sendMessage({ type: 'vinttea_window_fullscreen', fullscreen: false }).catch(() => {});
    return;
  }

  // 1. Try native button first
  if (fsBtnSelectors.length > 0) {
    const btn = findInteractiveButton(fsBtnSelectors, true);
    if (btn) {
      clickElementSafely(btn);
    }
  }

  // 2. Dispatch 'f' and 'F' keydown/keyup on window, document, and video
  simulateKey('f', 'KeyF', 70);
  simulateKey('F', 'KeyF', 70);
  if (videoEl) {
    simulateKey('f', 'KeyF', 70, videoEl);
  }

  // 3. Untrap and expand video to true 100vw x 100vh edge-to-edge
  const target = containerEl || videoEl?.parentElement || videoEl;
  if (target) {
    target.classList.add('vinttea-virtual-fullscreen');
  }
  if (videoEl) {
    videoEl.classList.add('vinttea-video-fullscreen');
  }

  // Neutralize ancestors
  let el: HTMLElement | null = (target || videoEl)?.parentElement || null;
  while (el && el !== document.body && el !== document.documentElement) {
    el.classList.add('vinttea-fs-ancestor');
    el = el.parentElement;
  }

  document.documentElement.classList.add('vinttea-fs-body-lock');
  document.body.classList.add('vinttea-fs-body-lock');

  chrome.runtime.sendMessage({ type: 'vinttea_window_fullscreen', fullscreen: true }).catch(() => {});
}
