import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

// The same curves the soundscape page uses, so the site moves as one.
const EASE_DRAWER = CustomEase.create('place-drawer', '0.32, 0.72, 0, 1');
const EASE_OUT = CustomEase.create('place-out', '0.23, 1, 0.32, 1');

const RESIZE_SECONDS = 0.28;
const ENTER_SECONDS = 0.24;
const EXIT_SECONDS = 0.15;
const BLUR = 'blur(6px)';

interface DockParts {
  /** The floating card. Script sizes it; it clips whatever is mid-transition. */
  dock: HTMLElement;
  /** Everything inside the card, always laid out at its natural size. */
  content: HTMLElement;
  /** The palette and its buttons. */
  panel: HTMLElement;
  /** The status line, whose text crossfades. */
  status: HTMLElement;
}

/**
 * Motion for the Place dock.
 *
 * The card never decides its own size mid-animation. Its contents lay out at
 * their natural size, and a ResizeObserver eases the card to match, so every
 * change (palette opening or closing, new status text, the Cooldown line, a
 * late web font) takes the same smooth path and can be interrupted at any point.
 * Content that leaves is lifted out of the layout and fades out through blur
 * while the card shrinks beneath it; content that arrives fades in through blur
 * as the card grows to reveal it.
 */
export function mountDockMotion({ dock, content, panel, status }: DockParts) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let open = !panel.hidden;

  // Load the panel's fonts (the bold buttons) now, not on first open, so the
  // card's target size doesn't change halfway through that first animation.
  for (const button of panel.querySelectorAll('button')) {
    void document.fonts?.load(getComputedStyle(button).font).catch(() => undefined);
  }

  // The card follows its contents.
  let sized = false;
  new ResizeObserver(() => {
    const border = dock.offsetWidth - dock.clientWidth;
    const width = content.offsetWidth + border;
    const height = content.offsetHeight + border;
    if (!sized || reduceMotion.matches) {
      gsap.set(dock, { width, height });
      sized = true;
      return;
    }
    gsap.to(dock, { width, height, duration: RESIZE_SECONDS, ease: EASE_DRAWER, overwrite: true });
  }).observe(content);

  /**
   * Takes `element` out of the layout where it stands (so the card can start
   * resizing at once) and fades it out through blur, then calls `done`.
   */
  function leave(element: HTMLElement, done: () => void): void {
    const { offsetTop: top, offsetWidth: width } = element;
    gsap.killTweensOf(element);
    // Pinned by its center: the dock's contents are centered, so it stays put as they re-center around it.
    gsap.set(element, { position: 'absolute', left: '50%', xPercent: -50, top, width, margin: 0 });
    gsap.to(element, {
      opacity: 0,
      filter: reduceMotion.matches ? 'none' : BLUR,
      scale: reduceMotion.matches ? 1 : 0.97,
      duration: EXIT_SECONDS,
      ease: EASE_OUT,
      onComplete: done,
    });
  }

  /** Fades `element` in through blur, from wherever it is now if it was leaving. */
  function enter(element: HTMLElement, delay = 0): void {
    const wasLeaving = gsap.isTweening(element);
    gsap.killTweensOf(element);
    gsap.set(element, { clearProps: 'position,left,top,width,margin', xPercent: 0 });
    if (!wasLeaving) {
      gsap.set(element, { opacity: 0, filter: reduceMotion.matches ? 'none' : BLUR, scale: reduceMotion.matches ? 1 : 0.97 });
    }
    gsap.to(element, {
      opacity: 1,
      filter: 'blur(0px)',
      scale: 1,
      duration: ENTER_SECONDS,
      delay: wasLeaving ? 0 : delay,
      ease: EASE_OUT,
      clearProps: 'opacity,filter,transform',
    });
  }

  return {
    show(): void {
      if (open) return;
      open = true;
      panel.inert = false;
      panel.hidden = false;
      // A beat after the card starts growing, so the colors arrive into space rather than being sliced by its edge.
      enter(panel, 0.05);
    },

    hide(): void {
      if (!open) return;
      open = false;
      // Unclickable at once, though it is still visibly leaving.
      panel.inert = true;
      leave(panel, () => {
        panel.hidden = true;
        panel.inert = false;
        gsap.set(panel, { clearProps: 'all' });
      });
    },

    /** Changes the status line, crossfading the old text out and the new text in. */
    setStatus(text: string): void {
      const current = status.querySelector<HTMLElement>(':scope > span:not([data-leaving])');
      if (current?.textContent === text) return;
      const next = document.createElement('span');
      next.textContent = text;
      // First, so the status line's text reads as the new message straight away.
      status.prepend(next);
      if (current) {
        current.dataset.leaving = '';
        current.setAttribute('aria-hidden', 'true');
        leave(current, () => current.remove());
        enter(next);
      }
    },
  };
}
