# 02: Place a Pixel and everyone sees it

**What to build:** A visitor taps or clicks a Pixel to select it, picks a Palette color (previewed on the Pixel), presses Place, and the Placement appears for every connected visitor. Visitors are identified by a signed cookie; there is no Cooldown yet. See `.scratch/place/spec.md`.

**Blocked by:** 01

**Status:** done

- [x] AramisJonesApi has a session endpoint that issues a signed, httpOnly visitor cookie (`SameSite=Lax`, `Secure` in production) holding a random visitor id; `PLACE_COOKIE_SECRET` is added to config (required in production, dev default allowed)
- [x] The room rejects joins with a missing or invalid cookie; the page then calls the session endpoint and retries once
- [x] Tap/click selects and highlights a Pixel; a Palette bar appears; the chosen color is previewed; a Place button sends `place { x, y, color }`
- [x] The Pixel is drawn immediately and rolled back with a short message on `place:rejected`
- [x] Accepted Placements send `place:accepted` to the placer and `placed { x, y, color }` to every client; the last Placement on a Pixel wins
- [x] Out-of-bounds coordinates and unknown Palette indices are rejected (`out_of_bounds`, `bad_color`) and leave the Canvas unchanged
- [x] Server tests: two clients, one places, both receive `placed`; bad coordinates and bad colors rejected; join without a valid cookie rejected

## Comments

**Kickoff:** 01 is verified. Start with a real SDK join in `AramisJonesApi/src/place/place.integration.test.ts`: reject a missing or invalid cookie, then join with the cookie from the session endpoint. Keep the portfolio and API on the same hostname; the page must request the session with credentials. The current dev pair uses `http://localhost:4321/place` and `http://localhost:4332` (`PORT=4332` for the API, `PUBLIC_ARAMIS_API_URL=http://localhost:4332` for Astro) because another preview uses 4322.

Next, join two visitors and place Palette index 5 at (0, 0) and index 3 at (1, 0). Assert that both receive `placed` and that a fresh join's single `canvas` snapshot begins with `0x53` (high nibble first). Use the same two-browser flow to check selection, preview, Place and rollback; leave Cooldown to ticket 03. Ticket 09 has no dependency on this work.

**Verified:** Playwright/Chrome, two independent visitors: desktop click → Palette preview → Place appeared on both Canvases; the emulated Pixel 7 reloaded the snapshot and placed by touch. With the first cookie withheld, the phone received a real 401, refreshed its session and joined on its only retry. With a desktop Placement held in transit, its optimistic Pixel was visible locally only; an invalid Palette index sent to the real room triggered feedback and rollback to the phone's intervening Placement on that same Pixel. Restored the test Pixel. Eight Place API integration tests, API TypeScript and seven Place frontend tests passed.
