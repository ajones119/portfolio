import { createEffectBag, effectTuning, resolveTheme, revealFrames, saveTheme, type Effect } from './themeMotion';
type Transition = { ready: Promise<void>; finished: Promise<void>; skipTransition(): void };
export interface ThemeController {
 toggle(animate: boolean, effect?: Effect): Promise<void>;
 bindTrigger(trigger: HTMLButtonElement): void;
}
export function initThemeToggle({ button }: { button: HTMLButtonElement }): ThemeController {
 const root = document.documentElement;
 const system = matchMedia('(prefers-color-scheme: dark)'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const initial = resolveTheme(() => localStorage.getItem('theme'), system.matches);
 let chosen = initial.explicit, theme = initial.theme;
 let active: { transition?: Transition; animation?: Animation } | undefined;
 const triggers = new Set<HTMLButtonElement>();
 const nextEffect = createEffectBag();
 const report = (effect: Effect | undefined, reason = '') => window.dispatchEvent(new CustomEvent('theme-motion-status', { detail: { effect, reason } }));
 const apply = () => {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#336666');
  button.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  button.innerHTML = theme === 'dark'
   ? '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'
   : '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
 };
 const finish = () => {
  active?.animation?.finish();
  active?.transition?.skipTransition();
  active?.animation?.cancel();
  active = undefined;
  delete root.dataset.themeTransition;
 };
 const controller: ThemeController = {
  bindTrigger(trigger) {
   triggers.add(trigger);
   trigger.addEventListener('click', event => void controller.toggle(event.detail > 0));
  },
  async toggle(animate, forcedEffect) {
   const interrupted = !!active;
   finish(); theme = theme === 'dark' ? 'light' : 'dark'; chosen = true;
   saveTheme(() => localStorage.setItem('theme', theme));
   const start = (document as Document & { startViewTransition?: (update: () => void) => Transition }).startViewTransition;
   const reason = interrupted ? 'Repeated activation' : reduced.matches ? 'Reduced motion' : !animate ? 'Keyboard activation' : !start ? 'View Transitions unavailable' : '';
   if (reason) { apply(); report(undefined, reason); return; }

   const effect = forcedEffect ?? nextEffect();
   const tuning = effectTuning[effect];
   const rect = button.getBoundingClientRect();
   const x = Math.max(0, Math.min(innerWidth, rect.left + rect.width / 2)), y = Math.max(0, Math.min(innerHeight, rect.top + rect.height / 2));
   const frames = revealFrames(effect, x, y, innerWidth, innerHeight);
   const run: NonNullable<typeof active> = {}; active = run;
   root.dataset.themeTransition = 'reveal';
   try {
    run.transition = start!.call(document, apply);
    const finished = run.transition.finished.catch(() => {});
    await run.transition.ready;
    if (active !== run) return;
    run.animation = root.animate({ clipPath: frames }, { duration: tuning.duration, easing: `cubic-bezier(${tuning.curve.join(',')})`, fill: 'forwards', pseudoElement: '::view-transition-new(root)' });
    report(effect);
    await run.animation.finished; await finished;
   } catch {
    if (active === run) { apply(); report(effect, 'Transition unavailable or interrupted'); }
   } finally { if (active === run) finish(); }
  },
 };
 apply();
 controller.bindTrigger(button);
 // A captured root can become the pointer hit target while its snapshot is visible.
 // Forward only theme-control hits; never hijack ordinary page clicks.
 document.addEventListener('click', event => {
  if (!active || event.target !== root || event.detail === 0) return;
  for (const trigger of triggers) {
   const rect = trigger.getBoundingClientRect();
   if (rect.width > 0 && rect.height > 0 && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
    trigger.focus({ preventScroll: true });
    void controller.toggle(true);
    break;
   }
  }
 }, true);
 system.addEventListener('change', () => { if (!chosen) { finish(); theme = system.matches ? 'dark' : 'light'; apply(); } });
 reduced.addEventListener('change', () => { if (reduced.matches && active) { finish(); apply(); report(undefined, 'Reduced motion enabled'); } });
 window.addEventListener('resize', () => { if (active) { finish(); apply(); report(undefined, 'Viewport resized'); } });
 return controller;
}

