import gsap from 'gsap';

// The soundscape and site colors the rolling Pixel cycles through.
const COLORS = ['#9BE3D2', '#E9B872', '#E58C8C', '#4A9D9D', '#FF9966', '#996699', '#7FA7C9', '#99CC99'];

const CAPTIONS = [
  'Mixing the paint…',
  'Waking the server…',
  'Counting Pixels…',
  'Rinsing the brushes…',
  'Still waking up. It naps when nobody is around…',
];

/** Waits this long before showing, so a quick connection never flashes the loader. */
const SHOW_DELAY_SECONDS = 0.2;
const ROLL_SECONDS = 0.34;
const CAPTION_SECONDS = 2.6;

/**
 * The connecting animation: one Pixel that rolls along a short track, tipping
 * over its corner like a die. It changes color every roll, squashes as it lands,
 * leaves a fading paint stamp behind, and turns around at each end.
 * Purely decorative (the connection pill announces the state), so it is
 * aria-hidden, and it stops all motion while hidden.
 */
export function mountLoader(root: HTMLElement) {
  const pixel = root.querySelector<HTMLElement>('[data-loader-pixel]')!;
  const stamps = [...root.querySelectorAll<HTMLElement>('[data-loader-stamp]')];
  const caption = root.querySelector<HTMLElement>('[data-loader-caption]')!;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let active = false;
  let position = 0;
  let direction = 1;
  let colorIndex = 0;
  let captionIndex = 0;
  let showCall: gsap.core.Tween | null = null;
  let captionCall: gsap.core.Tween | null = null;

  const cellSize = () => stamps[0].offsetWidth;

  function stamp(cell: number, color: string): void {
    gsap.killTweensOf(stamps[cell]);
    gsap.fromTo(stamps[cell], { backgroundColor: color, opacity: 0.9, scale: 1.15 }, {
      opacity: 0, scale: 1, duration: 1.4, ease: 'power2.out',
    });
  }

  /** One roll to the next cell, then the next roll. */
  function roll(): void {
    if (!active) return;
    if (position + direction < 0 || position + direction >= stamps.length) direction = -direction;
    const size = cellSize();
    // Tip over the leading bottom corner, falling faster as it goes, like a real die.
    gsap.set(pixel, { transformOrigin: direction > 0 ? '100% 100%' : '0% 100%' });
    gsap.to(pixel, {
      rotation: 90 * direction,
      duration: ROLL_SECONDS,
      ease: 'power2.in',
      onComplete: () => {
        position += direction;
        colorIndex = (colorIndex + 1) % COLORS.length;
        const color = COLORS[colorIndex];
        gsap.set(pixel, { rotation: 0, x: position * size, backgroundColor: color, transformOrigin: '50% 100%' });
        stamp(position, color);
        // Squash on landing, then spring back up.
        gsap.fromTo(pixel, { scaleX: 1.3, scaleY: 0.7 }, {
          scaleX: 1, scaleY: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)',
        });
        gsap.delayedCall(0.12, roll);
      },
    });
  }

  /** Reduced motion: the Pixel stays put and gently changes color. */
  function shimmer(): void {
    if (!active) return;
    colorIndex = (colorIndex + 1) % COLORS.length;
    gsap.to(pixel, { backgroundColor: COLORS[colorIndex], duration: 0.6, ease: 'none', onComplete: () => void gsap.delayedCall(0.4, shimmer) });
  }

  function nextCaption(): void {
    if (!active) return;
    // The last caption (for a slow cold start) stays once it is reached.
    if (captionIndex < CAPTIONS.length - 1) {
      captionIndex++;
      const text = CAPTIONS[captionIndex];
      gsap.to(caption, {
        opacity: 0, filter: reduceMotion.matches ? 'none' : 'blur(4px)', duration: 0.15, ease: 'power1.out',
        onComplete: () => {
          caption.textContent = text;
          gsap.to(caption, { opacity: 1, filter: 'blur(0px)', duration: 0.25, ease: 'power2.out' });
        },
      });
    }
    captionCall = gsap.delayedCall(CAPTION_SECONDS, nextCaption);
  }

  function start(): void {
    // Clear anything left from a previous run, so only one roll loop ever runs.
    gsap.killTweensOf([pixel, caption, ...stamps]);
    gsap.killTweensOf(roll);
    gsap.killTweensOf(shimmer);
    gsap.set(stamps, { opacity: 0 });
    position = 0;
    direction = 1;
    captionIndex = 0;
    caption.textContent = CAPTIONS[0];
    gsap.set(pixel, { x: 0, rotation: 0, scale: 1, backgroundColor: COLORS[colorIndex] });
    root.hidden = false;
    gsap.fromTo(root, { opacity: 0, scale: 0.94, filter: 'blur(6px)' }, {
      opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.3, ease: 'power3.out',
    });
    if (reduceMotion.matches) shimmer(); else roll();
    captionCall = gsap.delayedCall(CAPTION_SECONDS, nextCaption);
  }

  function stop(): void {
    gsap.to(root, {
      opacity: 0, scale: 0.96, filter: 'blur(6px)', duration: 0.2, ease: 'power2.out',
      onComplete: () => {
        root.hidden = true;
        // Nothing keeps animating once it is out of sight.
        gsap.killTweensOf([pixel, caption, ...stamps]);
        gsap.killTweensOf(roll);
        gsap.killTweensOf(shimmer);
        gsap.set(stamps, { opacity: 0 });
      },
    });
  }

  return {
    /** Shows the loader (after a short delay) while connecting, and hides it once live. */
    setActive(next: boolean): void {
      if (next === active) return;
      active = next;
      showCall?.kill();
      captionCall?.kill();
      if (active) {
        gsap.killTweensOf(root);
        showCall = gsap.delayedCall(SHOW_DELAY_SECONDS, () => {
          if (active) start();
        });
      } else if (!root.hidden) {
        stop();
      }
    },
  };
}
