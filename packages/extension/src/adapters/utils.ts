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

const CINEMA_MODE_CLASS = 'vinttea-cinema-mode';

function ensureCinemaStyle(): void {
  if (document.getElementById('vinttea-cinema-style')) return;

  const style = document.createElement('style');
  style.id = 'vinttea-cinema-style';
  style.textContent = `
    .${CINEMA_MODE_CLASS} {
      position: relative !important;
      z-index: 2147483000 !important;
      width: min(100vw, 177.78vh) !important;
      max-width: 100vw !important;
      height: min(56.25vw, 82vh) !important;
      min-height: 0 !important;
      aspect-ratio: 16 / 9 !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      margin-top: clamp(16px, 3vh, 36px) !important;
      margin-bottom: clamp(16px, 3vh, 36px) !important;
      background: #000 !important;
      box-shadow: 0 18px 60px rgba(0, 0, 0, .45) !important;
    }

    .${CINEMA_MODE_CLASS} video {
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
      background: #000 !important;
    }

    @media (max-width: 600px) {
      .${CINEMA_MODE_CLASS} {
        width: 100vw !important;
        height: min(56.25vw, 72vh) !important;
      }
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

export function isCinemaModeActive(): boolean {
  const youtubePlayer = document.querySelector<HTMLElement>('#movie_player');
  return (
    !!youtubePlayer?.classList.contains('ytp-big-mode') ||
    !!document.querySelector(`.${CINEMA_MODE_CLASS}`)
  );
}

/** Expands only the player area, leaving the browser window and page controls intact. */
export function toggleCinemaMode(
  videoEl: HTMLVideoElement | null,
  containerEl?: HTMLElement | null,
  forceState?: number
): void {
  const target = containerEl || videoEl?.parentElement || videoEl;
  if (!target) return;

  const shouldEnable = forceState === undefined
    ? !isCinemaModeActive()
    : forceState === 1;

  // YouTube's native size control toggles theater mode (the T shortcut), never fullscreen.
  if (document.querySelector('#movie_player')) {
    const theaterButton = findInteractiveButton(['.ytp-size-button'], true);
    if (theaterButton) {
      if (isCinemaModeActive() !== shouldEnable) clickElementSafely(theaterButton);
      return;
    }
  }

  ensureCinemaStyle();
  target.classList.toggle(CINEMA_MODE_CLASS, shouldEnable);
}
