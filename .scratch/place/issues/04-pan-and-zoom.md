# 04: Pan and zoom on phone and desktop

**What to build:** A visitor can drag to pan the Canvas and wheel- or pinch-zoom around their pointer, with the same behavior on phone and desktop; finishing a drag never selects a Pixel. See `.scratch/place/spec.md`.

**Blocked by:** 02

**Status:** ready-for-human

- [x] Pointer Events on the viewport with `touch-action: none`; one-pointer drag pans, wheel and two-pointer pinch zoom around the pointer or pinch midpoint
- [x] Movement under about 6 CSS px between down and up is a tap (selects a Pixel); anything more is a drag
- [x] Zoom has min/max limits and pan is clamped so the Canvas cannot leave the viewport entirely
- [x] Pixels stay crisp at every zoom level; the selection highlight tracks the selected Pixel through pan and zoom
- [x] Viewport math and gesture classification are DOM-free modules
- [x] Vitest: screen↔Pixel mapping at several zooms and offsets, zoom-about-point keeps the anchor fixed, clamping, tap vs drag thresholds, pinch detection
- [ ] Checked by hand on a desktop browser and a phone (automated Chromium checks pass, including emulated touch; a real phone is still to try)

## Comments

**Implementation (agent):** Viewport math (`viewport.ts`) and gesture classification (`gesture.ts`) are DOM-free and covered by Vitest (16 + 11 tests). They replace `pixelAtPoint`; its "no snapping off-Canvas clicks to the edge" behavior is kept in `pixelAt`.

- The canvas element is sized (`width`/`height` = Canvas × scale) and positioned with `translate`, rather than CSS-scaled, so Pixels stay nearest-neighbor and the selection outline stays 1 CSS px at every zoom. The selection marker sits beside the canvas element in the surface and is placed from the view on every change.
- Zoom: wheel ≈ ×0.82 per 120 px notch; ctrl-wheel (trackpad pinch) is faster per delta. Limits are half the fitted size up to 48 CSS px per Pixel. Pan keeps at least 48 CSS px of the Canvas (or all of it, if smaller) on screen on each axis.
- Until the visitor pans or zooms, resizing the screen re-fits the whole Canvas. A snapshot of a different size (ticket 11) re-fits; a same-size snapshot (a reconnect) keeps the view.
- Panning and zooming work while connecting; taps wait for the Canvas.

**Browser check (Playwright, Chromium):** Desktop 1440×900 and a touch-emulated 412×839 phone, 19/19 checks. Covered: wheel zoom keeps the Pixel under the pointer; drag pans exactly and never selects; a 3 px move is a tap and selects the Pixel under it; the marker tracks the Pixel through zoom; pan clamp and both zoom limits hold; a two-finger pinch zooms about its midpoint without selecting; one-finger drag pans; a finger tap selects; neither page scrolls.

**Not done:** arrow-key selection does not pan to keep the selected Pixel on screen when zoomed in. Keyboard zoom (+/−) is not implemented. Worth a small follow-up if keyboard use matters.
