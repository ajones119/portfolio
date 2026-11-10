import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEffectBag, effects, resolveTheme, revealFrames, saveTheme } from './themeMotion';
import { initThemeToggle } from './themeToggle';

test('preference resolution validates storage and never writes on initialization', () => {
 assert.deepEqual(resolveTheme(() => 'dark', false), { theme: 'dark', explicit: true });
 assert.deepEqual(resolveTheme(() => 'light', true), { theme: 'light', explicit: true });
 for (const saved of [null, '', 'garbage']) assert.deepEqual(resolveTheme(() => saved, true), { theme: 'dark', explicit: false });
 assert.deepEqual(resolveTheme(() => { throw Error(); }, false), { theme: 'light', explicit: false });
 assert.doesNotThrow(() => saveTheme(() => { throw Error(); }));
});
test('shuffle covers each effect once per bag and never repeats at boundaries', () => {
 for (const random of [() => 0, () => .99999, Math.random]) {
  const next = createEffectBag(random); let last: string | undefined;
  for (let round = 0; round < 100; round++) {
   const bag = Array.from({ length: effects.length }, () => next());
   assert.equal(new Set(bag).size, effects.length); assert.notEqual(bag[0], last); last = bag.at(-1);
  }
 }
});
test('all shapes produce finite matching frames at viewport corners and mobile dimensions', () => {
 for (const [w, h] of [[1440, 900], [390, 844]]) for (const [x, y] of [[0, 0], [w, h], [w/2, h/2]]) for (const effect of effects) {
  const frames = revealFrames(effect, x, y, w, h); assert.ok(frames.length >= 2); assert.ok(frames.every(f => !/NaN|Infinity/.test(f)));
 }
});

function environment() {
 const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string>, animate: () => { throw Error('not expected'); } };
 const button = Object.assign(new EventTarget(), { innerHTML: '', setAttribute() {}, getBoundingClientRect: () => ({ left: 100, top: 20, width: 32, height: 32 }) });
 const system = Object.assign(new EventTarget(), { matches: false });
 const reduced = Object.assign(new EventTarget(), { matches: false });
 let writes = 0;
 const doc = { addEventListener() {}, documentElement: root, querySelector: () => null, startViewTransition: undefined as undefined | ((callback: () => void) => any) };
 const win = new EventTarget();
 Object.assign(globalThis, { document: doc, window: win, matchMedia: (q: string) => q.includes('reduced') ? reduced : system, localStorage: { getItem: () => null, setItem: () => { writes++; } }, innerWidth: 1000, innerHeight: 800 });
 return { root, button, system, reduced, doc, win, writes: () => writes };
}
test('system following stops only after explicit choice, even with blocked writes', async () => {
 const e = environment(), controller = initThemeToggle({ button: e.button as any });
 assert.equal(e.writes(), 0); e.system.matches = true; e.system.dispatchEvent(new Event('change')); assert.equal(e.root.dataset.theme, 'dark');
 globalThis.localStorage.setItem = () => { throw Error(); };
 await controller.toggle(false); assert.equal(e.root.dataset.theme, 'light');
 e.system.dispatchEvent(new Event('change')); assert.equal(e.root.dataset.theme, 'light');
});
test('rapid activation before snapshot readiness honors latest choice and skips old reveal', async () => {
 const e = environment(); let ready!: () => void, update!: () => void, skips = 0;
 e.doc.startViewTransition = callback => { update = callback; return { ready: new Promise<void>(r => ready = r), finished: Promise.resolve(), skipTransition: () => { skips++; } }; };
 const controller = initThemeToggle({ button: e.button as any });
 const first = controller.toggle(true); await controller.toggle(true);
 assert.equal(e.root.dataset.theme, 'light'); assert.equal(skips, 1);
 update(); ready(); await first; assert.equal(e.root.dataset.theme, 'light'); assert.equal(e.root.dataset.themeTransition, undefined);
});
test('failed transition falls back to real theme and cleans up', async () => {
 const e = environment();
 e.doc.startViewTransition = () => ({ ready: Promise.reject(Error()), finished: Promise.resolve(), skipTransition() {} });
 await initThemeToggle({ button: e.button as any }).toggle(true);
 assert.equal(e.root.dataset.theme, 'dark'); assert.equal(e.root.dataset.themeTransition, undefined);
});

test('rapid activation during animation finishes and releases the snapshot', async () => {
 const e = environment(); let finishAnimation!: () => void, finishTransition!: () => void, finishes = 0, cancels = 0;
 const animationDone = new Promise<void>(resolve => finishAnimation = resolve);
 const transitionDone = new Promise<void>(resolve => finishTransition = resolve);
 e.doc.startViewTransition = update => { update(); return { ready: Promise.resolve(), finished: transitionDone, skipTransition: finishTransition }; };
 e.root.animate = () => ({ finished: animationDone, finish: () => { finishes++; finishAnimation(); }, cancel: () => { cancels++; } }) as any;
 const controller = initThemeToggle({ button: e.button as any });
 const first = controller.toggle(true);
 await Promise.resolve(); await controller.toggle(true); await first;
 assert.equal(finishes, 1); assert.equal(cancels, 1); assert.equal(e.root.dataset.theme, 'light');
 assert.equal(e.root.dataset.themeTransition, undefined);
});
test('inward reveal animates a hole in the new snapshot with the old snapshot underneath', async () => {
 const e = environment(); let target = '', layer = '', clip: string[] = [];
 e.doc.startViewTransition = update => { update(); return { ready: Promise.resolve(), finished: Promise.resolve(), skipTransition() {} }; };
 e.root.animate = ((frames: { clipPath: string[] }, options: { pseudoElement: string }) => {
  target = options.pseudoElement; layer = e.root.dataset.themeTransition; clip = frames.clipPath;
  return { finished: Promise.resolve(), finish() {}, cancel() {} };
 }) as any;
 await initThemeToggle({ button: e.button as any }).toggle(true, 'circle-in');
 assert.equal(target, '::view-transition-new(root)'); assert.equal(layer, 'reveal');
 assert.ok(clip.every(frame => frame.startsWith('polygon(evenodd,')));
 assert.equal(e.root.dataset.themeTransition, undefined);
});

test('each reveal uses its approved duration and easing', async () => {
 const expected = {
  'circle-out': [400, 'cubic-bezier(0.55,0.085,0.68,0.53)'],
  'circle-in': [400, 'cubic-bezier(0.455,0.03,0.515,0.955)'],
  'wipe-right': [400, 'cubic-bezier(0.645,0.045,0.355,1)'],
  curtain: [350, 'cubic-bezier(0.25,0.46,0.45,0.94)'],
 };
 assert.deepEqual(new Set(effects), new Set(Object.keys(expected)));
 for (const effect of effects) {
  const e = environment(); let actual: any;
  e.doc.startViewTransition = update => { update(); return { ready: Promise.resolve(), finished: Promise.resolve(), skipTransition() {} }; };
  e.root.animate = ((_frames: unknown, options: unknown) => {
   actual = options; return { finished: Promise.resolve(), finish() {}, cancel() {} };
  }) as any;
  await initThemeToggle({ button: e.button as any }).toggle(true, effect);
  assert.deepEqual([actual.duration, actual.easing], expected[effect]);
 }
});
