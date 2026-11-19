# 06: Placement History and admin revert

**What to build:** The server keeps a Placement History of the last 5,000 Placements, and the site owner can list recent Placements and revert one visitor's vandalism without undoing friends' later fixes. Admin access is by token; there is no admin UI. See `.scratch/place/spec.md`.

**Blocked by:** 03

**Status:** done

- [x] Each Placement History entry records the Pixel, new color, the color it replaced, visitor hash, network hash, and time; the history holds the most recent 5,000 and evicts the oldest
- [x] `PLACE_ADMIN_TOKEN` is added to config; admin routes require it as a bearer token and are not registered when it is unset
- [x] Admin can list recent Placements (with a limit and optional visitor hash filter)
- [x] Admin can revert a visitor hash over a time range: only Pixels where that visitor's Placement is still the latest are restored to the color it replaced; the response gives the count restored
- [x] Restored Pixels are broadcast as `placed` to all clients and recorded in the Placement History as admin Placements
- [x] Server tests: history caps at 5,000 with oldest evicted; revert skips Pixels a later visitor placed over; restorations are broadcast; missing/wrong token rejected; routes absent without a token

## Comments

**Implementation (agent):** The Place model keeps the Placement History (newest last in memory, capped at `HISTORY_CAPACITY` = 5,000). It exposes `listPlacements({ limit, visitorHash })`, `revert(visitorHash, from, to)`, and `onPixelChange(listener)`.

- Every Pixel change, whether a visitor's Placement or an admin restoration, goes through one `paint` that updates the Canvas, records history and notifies listeners. The room broadcasts `placed` from that subscription, so `placed` now arrives just before the placer's `place:accepted` (the page handles either order).
- Revert walks newest to oldest. Where the visitor's in-range Placement is still a Pixel's latest, it follows their unbroken run of Placements on that Pixel back and restores the color from before the run. If they placed red then black over white, the Pixel goes back to white, not red. Restorations are recorded under the `admin` pseudo-visitor.
- Routes, registered only when `PLACE_ADMIN_TOKEN` (min 16 chars) is set, with `Authorization: Bearer <token>`:
  - `GET /place/admin/placements?limit=1..5000&visitorHash=<64 hex | admin>` → `{ placements: [{ x, y, color, previousColor, visitorHash, networkHash, at }] }`, newest first.
  - `POST /place/admin/revert { visitorHash, from?, to? }` (epoch ms, inclusive) → `{ restored }`.
- Tokens are compared as SHA-256 digests with `timingSafeEqual`.
- Finding a vandal's visitor hash: list recent Placements and read `visitorHash` off the bad entries.

**Verified:** 4 server tests (5,001 Placements leave the newest 5,000; revert skips a friend's fix, restores the pre-run color, ignores Placements outside the range, broadcasts, records admin entries; wrong or missing token gets 401; no token configured gives 404). Two deliberate bugs were each caught by a failing test: restoring only the latest Placement's previous color, and a 5,001 cap.

**For ticket 07:** persist `history` alongside the Canvas. Cooldown and network-window state are not persisted (spec: Canvas and history only).
