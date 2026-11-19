# 02: Place a Pixel and everyone sees it

**What to build:** A visitor taps or clicks a Pixel to select it, picks a Palette color (previewed on the Pixel), presses Place, and the Placement appears for every connected visitor. Visitors are identified by a signed cookie; there is no Cooldown yet. See `.scratch/place/spec.md`.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] AramisJonesApi has a session endpoint that issues a signed, httpOnly visitor cookie (`SameSite=Lax`, `Secure` in production) holding a random visitor id; `PLACE_COOKIE_SECRET` is added to config (required in production, dev default allowed)
- [ ] The room rejects joins with a missing or invalid cookie; the page then calls the session endpoint and retries once
- [ ] Tap/click selects and highlights a Pixel; a Palette bar appears; the chosen color is previewed; a Place button sends `place { x, y, color }`
- [ ] The Pixel is drawn immediately and rolled back with a short message on `place:rejected`
- [ ] Accepted Placements send `place:accepted` to the placer and `placed { x, y, color }` to every client; the last Placement on a Pixel wins
- [ ] Out-of-bounds coordinates and unknown Palette indices are rejected (`out_of_bounds`, `bad_color`) and leave the Canvas unchanged
- [ ] Server tests: two clients, one places, both receive `placed`; bad coordinates and bad colors rejected; join without a valid cookie rejected
