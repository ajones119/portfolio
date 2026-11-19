# 04: Pan and zoom on phone and desktop

**What to build:** A visitor can drag to pan the Canvas and wheel- or pinch-zoom around their pointer, with the same behavior on phone and desktop; finishing a drag never selects a Pixel. See `.scratch/place/spec.md`.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Pointer Events on the viewport with `touch-action: none`; one-pointer drag pans, wheel and two-pointer pinch zoom around the pointer or pinch midpoint
- [ ] Movement under about 6 CSS px between down and up is a tap (selects a Pixel); anything more is a drag
- [ ] Zoom has min/max limits and pan is clamped so the Canvas cannot leave the viewport entirely
- [ ] Pixels stay crisp at every zoom level; the selection highlight tracks the selected Pixel through pan and zoom
- [ ] Viewport math and gesture classification are DOM-free modules
- [ ] Vitest: screen↔Pixel mapping at several zooms and offsets, zoom-about-point keeps the anchor fixed, clamping, tap vs drag thresholds, pinch detection
- [ ] Checked by hand on a desktop browser and a phone
