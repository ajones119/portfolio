export type Theme = 'light' | 'dark';
export const effects = ['circle-out', 'wipe-right', 'curtain', 'circle-in'] as const;
export type Effect = typeof effects[number];
export type Tuning = { duration: number; curve: [number, number, number, number] };
export const effectTuning: Record<Effect, Tuning> = {
 'circle-out': { duration: 400, curve: [0.55, 0.085, 0.68, 0.53] },
 'circle-in': { duration: 400, curve: [0.455, 0.03, 0.515, 0.955] },
 'wipe-right': { duration: 400, curve: [0.645, 0.045, 0.355, 1] },
 curtain: { duration: 350, curve: [0.25, 0.46, 0.45, 0.94] },
};
export function resolveTheme(read: () => string | null, dark: boolean): { theme: Theme; explicit: boolean } {
 let saved: string | null = null;
 try { saved = read(); } catch { /* Storage is optional. */ }
 const explicit = saved === 'dark' || saved === 'light';
 return { theme: explicit ? saved as Theme : dark ? 'dark' : 'light', explicit };
}
export function saveTheme(write: () => void) { try { write(); } catch { /* Retain the in-memory choice. */ } }
export function createEffectBag(random = Math.random) {
 let bag: Effect[] = [], previous: Effect | undefined;
 return () => {
  if (!bag.length) {
   bag = [...effects];
   for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
   if (bag[bag.length - 1] === previous) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
  }
  previous = bag.pop()!;
  return previous;
 };
}
export function revealFrames(effect: Effect, x: number, y: number, w: number, h: number) {
 const dx = Math.max(x, w - x), dy = Math.max(y, h - y);
 const circle = (r: number) => `circle(${r}px at ${x}px ${y}px)`;
 const full = circle(Math.hypot(dx, dy) + 2);
 // Reveal the new snapshot outside a shrinking hole. Keep the old snapshot
 // underneath, just like every other effect, rather than reversing the layers.
 const outsideCircle = (radius: number) => {
  const edge = `${x + radius}px ${y}px`;
  const hole = Array.from({ length: 121 }, (_, i) => {
   const angle = i / 120 * Math.PI * 2;
   return `${x + Math.cos(angle) * radius}px ${y + Math.sin(angle) * radius}px`;
  });
  return `polygon(evenodd, 0px 0px, ${w}px 0px, ${w}px ${h}px, 0px ${h}px, 0px 0px, ${edge}, ${hole.join(',')}, ${edge}, 0px 0px)`;
 };
 switch (effect) {
  case 'circle-out': return [circle(0), full];
  case 'circle-in': return [outsideCircle(Math.hypot(dx, dy) + 4), outsideCircle(0)];
  case 'curtain': return ['inset(0 50% 0 50%)', 'inset(0 0% 0 0%)'];
  case 'wipe-right': return ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'];
 }
}


