import type { Point } from './viewport';

/** Movement below this many CSS px between down and up is a tap; anything more is a drag. */
export const TAP_SLOP = 6;

export interface PointerSample extends Point {
  id: number;
}

/**
 * What a pointer event means for the view. A pinch pans by (dx, dy) and then
 * zooms by `factor` about `anchor`, the fingers' current midpoint.
 */
export type GestureAction =
  | { type: 'tap'; point: Point }
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'pinch'; anchor: Point; factor: number; dx: number; dy: number };

export interface Gesture {
  down(pointer: PointerSample): GestureAction | null;
  move(pointer: PointerSample): GestureAction | null;
  up(pointer: PointerSample): GestureAction | null;
  cancel(id: number): void;
  /** Whether any pointer is still down. */
  readonly active: boolean;
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Classifies a stream of pointer events into taps, drags (pans) and pinches. */
export function createGesture(): Gesture {
  const pointers = new Map<number, Point>();
  // Set while the only pointer down could still be a tap.
  let tap: { id: number; origin: Point } | null = null;

  function pinchPair(): [number, number] | null {
    const ids = [...pointers.keys()];
    return ids.length >= 2 ? [ids[0], ids[1]] : null;
  }

  return {
    get active() {
      return pointers.size > 0;
    },

    down({ id, x, y }) {
      pointers.set(id, { x, y });
      tap = pointers.size === 1 ? { id, origin: { x, y } } : null;
      return null;
    },

    move({ id, x, y }) {
      const previous = pointers.get(id);
      if (!previous) return null;
      const point = { x, y };

      const pair = pinchPair();
      if (pair) {
        if (!pair.includes(id)) {
          pointers.set(id, point);
          return null;
        }
        const other = pointers.get(pair[0] === id ? pair[1] : pair[0])!;
        const before = midpoint(previous, other);
        const after = midpoint(point, other);
        const spread = distance(previous, other);
        pointers.set(id, point);
        return {
          type: 'pinch',
          anchor: after,
          factor: spread === 0 ? 1 : distance(point, other) / spread,
          dx: after.x - before.x,
          dy: after.y - before.y,
        };
      }

      pointers.set(id, point);
      if (tap?.id === id) {
        if (distance(tap.origin, point) < TAP_SLOP) return null;
        const { origin } = tap;
        tap = null;
        return { type: 'pan', dx: x - origin.x, dy: y - origin.y };
      }
      return { type: 'pan', dx: x - previous.x, dy: y - previous.y };
    },

    up({ id, x, y }) {
      if (!pointers.delete(id)) return null;
      const candidate = tap?.id === id ? tap : null;
      if (candidate) tap = null;
      if (candidate && pointers.size === 0 && distance(candidate.origin, { x, y }) < TAP_SLOP) {
        return { type: 'tap', point: { x, y } };
      }
      return null;
    },

    cancel(id) {
      pointers.delete(id);
      if (tap?.id === id) tap = null;
    },
  };
}
