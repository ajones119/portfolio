import { describe, expect, it } from 'vitest';
import { clampView, fitView, pixelAt, pixelRect, wheelZoomFactor, zoomAbout, zoomLimits } from './viewport';

const canvas = { width: 128, height: 128 };

describe('fitView', () => {
  it('fits the whole Canvas inside the viewport with a margin, centered', () => {
    expect(fitView({ width: 412, height: 600 }, canvas, 16)).toEqual({ scale: 380 / 128, x: 16, y: 110 });
    expect(fitView({ width: 1440, height: 768 }, canvas, 16)).toEqual({ scale: 736 / 128, x: 352, y: 16 });
  });
});

describe('pixelAt', () => {
  it('maps viewport points to Pixels at 1:1 with no offset', () => {
    const view = { scale: 1, x: 0, y: 0 };
    expect(pixelAt(view, { x: 0, y: 0 }, canvas)).toEqual({ x: 0, y: 0 });
    expect(pixelAt(view, { x: 127.9, y: 64.2 }, canvas)).toEqual({ x: 127, y: 64 });
  });

  it('maps viewport points to Pixels when zoomed in and panned', () => {
    const view = { scale: 8, x: -200, y: 40 };
    expect(pixelAt(view, { x: 0, y: 40 }, canvas)).toEqual({ x: 25, y: 0 });
    expect(pixelAt(view, { x: 7.99, y: 47.99 }, canvas)).toEqual({ x: 25, y: 0 });
    expect(pixelAt(view, { x: 8, y: 48 }, canvas)).toEqual({ x: 26, y: 1 });
  });

  it('maps viewport points to Pixels when zoomed out', () => {
    const view = { scale: 0.5, x: 10, y: 10 };
    expect(pixelAt(view, { x: 73.9, y: 10 }, canvas)).toEqual({ x: 127, y: 0 });
  });

  it('returns no Pixel for points off the Canvas instead of snapping to an edge', () => {
    const view = { scale: 4, x: 100, y: 50 };
    expect(pixelAt(view, { x: 99.9, y: 60 }, canvas)).toBeNull();
    expect(pixelAt(view, { x: 120, y: 49.9 }, canvas)).toBeNull();
    expect(pixelAt(view, { x: 612, y: 60 }, canvas)).toBeNull();
    expect(pixelAt(view, { x: 120, y: 562 }, canvas)).toBeNull();
  });

  it('round-trips with pixelRect, so the selection highlight sits on the selected Pixel', () => {
    const view = { scale: 12.5, x: -333, y: 71 };
    const rect = pixelRect(view, { x: 40, y: 9 });
    expect(rect).toEqual({ left: 167, top: 183.5, size: 12.5 });
    expect(pixelAt(view, { x: rect.left + 0.1, y: rect.top + 0.1 }, canvas)).toEqual({ x: 40, y: 9 });
    expect(pixelAt(view, { x: rect.left + 12.4, y: rect.top + 12.4 }, canvas)).toEqual({ x: 40, y: 9 });
  });
});

describe('zoomAbout', () => {
  const limits = { min: 0.5, max: 48 };

  it('keeps the Pixel under the anchor point fixed while zooming in and out', () => {
    const view = { scale: 3, x: 20, y: 50 };
    const anchor = { x: 201, y: 141 };
    const before = pixelAt(view, anchor, canvas);
    for (const factor of [2, 0.5, 1.7, 7]) {
      const zoomed = zoomAbout(view, anchor, factor, limits);
      expect(zoomed.scale).toBeCloseTo(view.scale * factor);
      expect(pixelAt(zoomed, anchor, canvas)).toEqual(before);
      expect((anchor.x - zoomed.x) / zoomed.scale).toBeCloseTo((anchor.x - view.x) / view.scale);
      expect((anchor.y - zoomed.y) / zoomed.scale).toBeCloseTo((anchor.y - view.y) / view.scale);
    }
  });

  it('stops at the zoom limits and still keeps the anchor fixed', () => {
    const view = { scale: 40, x: 0, y: 0 };
    const zoomedIn = zoomAbout(view, { x: 100, y: 100 }, 4, limits);
    expect(zoomedIn).toEqual({ scale: 48, x: -20, y: -20 });
    expect(zoomAbout(view, { x: 0, y: 0 }, 0.001, limits).scale).toBe(0.5);
  });
});

describe('zoomLimits', () => {
  it('allows zooming out to half the fitted size and in to 48 CSS px per Pixel', () => {
    expect(zoomLimits({ width: 412, height: 600 }, canvas)).toEqual({ min: 380 / 256, max: 48 });
  });

  it('never sets the maximum below the fitted size on a huge screen', () => {
    expect(zoomLimits({ width: 8000, height: 8000 }, canvas, 0).max).toBe(62.5);
  });
});

describe('clampView', () => {
  const viewport = { width: 400, height: 600 };

  it('leaves a view alone while enough of the Canvas is on screen', () => {
    const view = { scale: 4, x: -300, y: 500 };
    expect(clampView(view, viewport, canvas)).toEqual(view);
  });

  it('keeps at least 48 CSS px of the Canvas inside the viewport on every side', () => {
    // The Canvas is 512 CSS px wide at scale 4.
    expect(clampView({ scale: 4, x: -1000, y: -1000 }, viewport, canvas)).toEqual({ scale: 4, x: -464, y: -464 });
    expect(clampView({ scale: 4, x: 1000, y: 1000 }, viewport, canvas)).toEqual({ scale: 4, x: 352, y: 552 });
  });

  it('keeps a Canvas smaller than the margin entirely on screen', () => {
    // The Canvas is 32 CSS px wide at scale 0.25.
    expect(clampView({ scale: 0.25, x: -50, y: 900 }, viewport, canvas)).toEqual({ scale: 0.25, x: 0, y: 568 });
  });
});

describe('wheelZoomFactor', () => {
  it('zooms in when the wheel moves up and out when it moves down, symmetrically', () => {
    const zoomIn = wheelZoomFactor(-100, 0, false);
    const zoomOut = wheelZoomFactor(100, 0, false);
    expect(zoomIn).toBeGreaterThan(1);
    expect(zoomOut).toBeLessThan(1);
    expect(zoomIn * zoomOut).toBeCloseTo(1);
  });

  it('treats line-mode wheels like pixel-mode wheels of the same distance', () => {
    expect(wheelZoomFactor(3, 1, false)).toBeCloseTo(wheelZoomFactor(48, 0, false));
  });

  it('makes trackpad pinches, which arrive as small ctrl-wheel deltas, zoom faster per delta', () => {
    expect(wheelZoomFactor(-10, 0, true)).toBeGreaterThan(wheelZoomFactor(-10, 0, false));
  });
});
