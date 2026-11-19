import gsap from 'gsap';

/**
 * Opens and closes the Place palette with motion. The dock card resizes from
 * its current on-screen size (so a reversal mid-animation never jumps), and the
 * palette rises in and sinks out along the same path. No overshoot: this is UI
 * appearing, not something the visitor threw.
 */
export function mountDockMotion(dock: HTMLElement, panel: HTMLElement) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let open = !panel.hidden;
  let generation = 0;

  /**
   * Runs `animate` after the caller's synchronous DOM updates (such as new
   * status text) but before the next paint, so sizes are measured from the
   * finished layout. A newer show/hide cancels an older pending one.
   */
  function afterUpdates(animate: () => void): void {
    const mine = ++generation;
    queueMicrotask(() => {
      if (mine === generation) animate();
    });
  }

  /** The dock's size with the panel shown or hidden, measured without a visible flash. */
  function measure(withPanel: boolean): { width: number; height: number; panelWidth: number } {
    const wasHidden = panel.hidden;
    const inlineWidth = dock.style.width;
    const inlineHeight = dock.style.height;
    panel.hidden = !withPanel;
    dock.style.width = '';
    dock.style.height = '';
    const inlinePanelWidth = panel.style.width;
    panel.style.width = '';
    const { width, height } = dock.getBoundingClientRect();
    const panelWidth = panel.offsetWidth; // ignores the panel's own mid-animation scale
    panel.style.width = inlinePanelWidth;
    panel.hidden = wasHidden;
    dock.style.width = inlineWidth;
    dock.style.height = inlineHeight;
    return { width, height, panelWidth };
  }

  // The panel keeps one width while the card resizes around it (the card clips
  // it), so the swatches never squeeze and reflow mid-animation.
  const pinPanel = (width: number) => gsap.set(panel, { width });
  const unpinPanel = () => gsap.set(panel, { clearProps: 'width' });

  /** Tweens the dock from `from` (its on-screen size, read before any DOM change) to `to`. */
  function resize(from: DOMRect, to: { width: number; height: number }, duration: number, ease: string, onComplete?: () => void): void {
    gsap.killTweensOf(dock);
    gsap.fromTo(dock, { width: from.width, height: from.height }, {
      width: to.width,
      height: to.height,
      duration,
      ease,
      overwrite: true,
      onComplete: () => {
        onComplete?.();
        settle();
      },
    });
  }

  /**
   * Hands the dock back to CSS sizing. If its natural size changed while it
   * animated (a web font arriving, new status text), ease the difference
   * instead of snapping to it.
   */
  function settle(): void {
    const natural = measure(!panel.hidden);
    const { width, height } = dock.getBoundingClientRect();
    if (Math.abs(natural.width - width) < 0.5 && Math.abs(natural.height - height) < 0.5) {
      gsap.set(dock, { clearProps: 'width,height' });
      return;
    }
    gsap.to(dock, {
      width: natural.width, height: natural.height, duration: 0.25, ease: 'expo.out', overwrite: true,
      onComplete: () => gsap.set(dock, { clearProps: 'width,height' }),
    });
  }

  return {
    get isOpen(): boolean {
      return open;
    },

    show(): void {
      if (open) return;
      open = true;
      panel.inert = false;
      afterUpdates(animateOpen);
    },

    hide(): void {
      if (!open) return;
      open = false;
      // Unclickable straight away, though it is still visibly leaving.
      panel.inert = true;
      afterUpdates(animateClose);
    },
  };

  function animateOpen(): void {
    gsap.killTweensOf(panel);
    const from = dock.getBoundingClientRect();
    const target = measure(true);
    const reversing = !panel.hidden; // caught mid-close: carry on from where it is
    panel.hidden = false;
    if (reduceMotion.matches) {
      gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: 'none', clearProps: 'opacity' });
      return;
    }
    pinPanel(target.panelWidth);
    resize(from, target, 0.42, 'expo.out', unpinPanel);
    if (!reversing) gsap.set(panel, { opacity: 0, y: 10, scale: 0.98, filter: 'blur(4px)' });
    gsap.to(panel, {
      opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
      duration: 0.36, ease: 'expo.out', delay: reversing ? 0 : 0.04, clearProps: 'opacity,transform,filter',
    });
  }

  function animateClose(): void {
    gsap.killTweensOf(panel);
    const finish = () => {
      unpinPanel();
      panel.hidden = true;
      panel.inert = false;
      gsap.set(panel, { clearProps: 'opacity,transform,filter' });
    };
    if (reduceMotion.matches) {
      gsap.to(panel, { opacity: 0, duration: 0.12, ease: 'none', onComplete: finish });
      return;
    }
    const from = dock.getBoundingClientRect();
    pinPanel(panel.offsetWidth);
    gsap.to(panel, { opacity: 0, y: 10, scale: 0.98, filter: 'blur(4px)', duration: 0.2, ease: 'power2.in' });
    resize(from, measure(false), 0.34, 'expo.out', finish);
  }
}
