/** Viewport math for panning and zooming the Canvas. All points are CSS px relative to the viewport's top-left corner. */

export interface Point {
  x: number;
  y: number;
}

export interface Pixel {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Where the Canvas sits: its top-left corner in the viewport, and how many CSS px one Pixel covers. */
export interface View {
  scale: number;
  x: number;
  y: number;
}

export interface ZoomLimits {
  min: number;
  max: number;
}

export const FIT_MARGIN = 16;
export const MAX_SCALE = 48;
/** How much of the Canvas must stay on screen, per axis, however far it is panned. */
export const KEEP_VISIBLE = 48;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** The view that shows the whole Canvas, centered, with a margin. */
export function fitView(viewport: Size, canvas: Size, margin = FIT_MARGIN): View {
  const scale = Math.max(
    Math.min((viewport.width - 2 * margin) / canvas.width, (viewport.height - 2 * margin) / canvas.height),
    0.01,
  );
  return {
    scale,
    x: (viewport.width - canvas.width * scale) / 2,
    y: (viewport.height - canvas.height * scale) / 2,
  };
}

export function zoomLimits(viewport: Size, canvas: Size, margin = FIT_MARGIN): ZoomLimits {
  const fit = fitView(viewport, canvas, margin).scale;
  return { min: fit / 2, max: Math.max(MAX_SCALE, fit) };
}

export function pixelAt(view: View, point: Point, canvas: Size): Pixel | null {
  const x = Math.floor((point.x - view.x) / view.scale);
  const y = Math.floor((point.y - view.y) / view.scale);
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
  return { x, y };
}

/** The square a Pixel covers on screen. */
export function pixelRect(view: View, pixel: Pixel): { left: number; top: number; size: number } {
  return { left: view.x + pixel.x * view.scale, top: view.y + pixel.y * view.scale, size: view.scale };
}

/** Zoom by `factor`, within the limits, keeping the Canvas point under `anchor` where it is. */
export function zoomAbout(view: View, anchor: Point, factor: number, limits: ZoomLimits): View {
  const scale = clamp(view.scale * factor, limits.min, limits.max);
  const ratio = scale / view.scale;
  return {
    scale,
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
  };
}

/** Pan the view back until at least `keep` CSS px of the Canvas (or all of it, if smaller) is inside the viewport on each axis. */
export function clampView(view: View, viewport: Size, canvas: Size, keep = KEEP_VISIBLE): View {
  const axis = (offset: number, length: number, space: number) => {
    const keepOnScreen = Math.min(keep, length);
    return clamp(offset, keepOnScreen - length, space - keepOnScreen);
  };
  return {
    scale: view.scale,
    x: axis(view.x, canvas.width * view.scale, viewport.width),
    y: axis(view.y, canvas.height * view.scale, viewport.height),
  };
}

const LINE_HEIGHT = 16;
const PAGE_HEIGHT = 800;

/** The zoom factor for one wheel event. Trackpad pinches arrive as ctrl-wheel events with small deltas. */
export function wheelZoomFactor(deltaY: number, deltaMode: number, ctrlKey: boolean): number {
  const pixels = deltaMode === 1 ? deltaY * LINE_HEIGHT : deltaMode === 2 ? deltaY * PAGE_HEIGHT : deltaY;
  return Math.exp(-pixels * (ctrlKey ? 0.01 : 0.002));
}

/** The Pixel at the middle of the viewport, clamped onto the Canvas. */
export function viewCenter(view: View, viewport: Size, canvas: Size): Pixel {
  return {
    x: clamp(Math.floor((viewport.width / 2 - view.x) / view.scale), 0, canvas.width - 1),
    y: clamp(Math.floor((viewport.height / 2 - view.y) / view.scale), 0, canvas.height - 1),
  };
}

/** The view, at `scale`, that puts the middle of `pixel` at the middle of the viewport. */
export function centerOn(pixel: Pixel, scale: number, viewport: Size): View {
  return {
    scale,
    x: viewport.width / 2 - (pixel.x + 0.5) * scale,
    y: viewport.height / 2 - (pixel.y + 0.5) * scale,
  };
}
