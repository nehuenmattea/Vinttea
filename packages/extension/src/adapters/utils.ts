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

function ensureFsStyle(): void {
  if (document.getElementById('vinttea-fs-style')) return;
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

    video.vinttea-video-fullscreen,
    .vinttea-video-fullscreen,
    .vinttea-player-fullscreen {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      object-fit: contain !important;
      background: #000 !important;
      z-index: 2147483640 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    }

    .vinttea-player-fullscreen video {
      width: 100% !important;
      height: 100% !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      object-fit: contain !important;
    }

    .vinttea-player-fullscreen canvas,
    .vinttea-player-fullscreen [class*="captions" i],
    .vinttea-player-fullscreen [class*="subtitles" i],
    .vinttea-player-fullscreen [class*="renderer" i] {
      z-index: 2147483645 !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

export function isFullscreenActive(): boolean {
  return Boolean(
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ||
    document.querySelector(
      '.vinttea-video-fullscreen, .vinttea-player-fullscreen, #movie_player.ytp-fullscreen, #vilos .fullscreen, .watch-video--player-view.fullscreen'
    )
  );
}

function removeVirtualFullscreen(): void {
  document.querySelectorAll('.vinttea-video-fullscreen, .vinttea-player-fullscreen, .vinttea-fs-ancestor').forEach((el) => {
    el.classList.remove('vinttea-video-fullscreen', 'vinttea-player-fullscreen', 'vinttea-fs-ancestor');
  });
  document.documentElement.classList.remove('vinttea-fs-body-lock');
  document.body?.classList.remove('vinttea-fs-body-lock');
}

/** Toggles true edge-to-edge fullscreen showing strictly the video covering the screen. */
export function toggleReliableFullscreen(
  videoEl: HTMLVideoElement | null,
  containerEl?: HTMLElement | null,
  fsBtnSelectors: string[] = [],
  forceState?: number // 1: enter, 0: exit
): void {
  ensureFsStyle();
  const isCurrentlyFs = isFullscreenActive();
  const shouldEnter = forceState !== undefined ? forceState === 1 : !isCurrentlyFs;

  if (!shouldEnter) {
    removeVirtualFullscreen();
    simulateKey('Escape', 'Escape', 27);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if ((document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement) {
      (document as Document & { webkitExitFullscreen?: () => void }).webkitExitFullscreen?.();
    }
    chrome.runtime.sendMessage({ type: 'vinttea_window_fullscreen', fullscreen: false }).catch(() => {});
    return;
  }

  // 1. Enter Edge-to-Edge DOM Fullscreen (breaks out of all containers)
  const targetEl = containerEl || videoEl || document.querySelector<HTMLVideoElement>('video');
  if (targetEl) {
    if (containerEl) {
      containerEl.classList.add('vinttea-player-fullscreen');
    } else {
      targetEl.classList.add('vinttea-video-fullscreen');
    }

    let ancestor = targetEl.parentElement;
    while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
      ancestor.classList.add('vinttea-fs-ancestor');
      ancestor = ancestor.parentElement;
    }

    document.documentElement.classList.add('vinttea-fs-body-lock');
    document.body?.classList.add('vinttea-fs-body-lock');
  }

  // 2. Also simulate player's internal button / key
  wakePlayerControls(containerEl || videoEl || undefined);
  if (fsBtnSelectors.length > 0) {
    const btn = findInteractiveButton(fsBtnSelectors, true);
    if (btn) {
      clickElementSafely(btn);
    }
  }
  simulateKey('f', 'KeyF', 70);

  // 3. Request window-level fullscreen from background script
  chrome.runtime.sendMessage({ type: 'vinttea_window_fullscreen', fullscreen: true }).catch(() => {});
}
