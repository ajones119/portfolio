# Spec: Place — a shared pixel Canvas

Status: ready-for-agent

Repos: AramisJonesApi (server) and AramisJonesPortfolio (page). Vocabulary follows `GLOSSARY.md`; architecture follows `docs/adr/0001-colyseus-inside-aramisjonesapi.md`.

## Problem Statement

Friends visiting the portfolio have nothing they can make together. There is no shared, persistent space where each visitor leaves a small mark that everyone else sees, and no realtime infrastructure in AramisJonesApi to support that kind of experience (or the multiplayer games planned after it).

## Solution

A `/place` page in the spirit of Reddit's r/place: one shared 128×128 Canvas of Pixels colored from a 16-color Palette or any custom color. Any visitor, without signing in, may make one Placement per Cooldown (10 minutes by default), coloring any Pixel, including one someone else just placed. Everyone watching sees Placements appear live. The Canvas lives forever (until wiped by hand), survives API restarts via a file on the server's disk, and keeps a Placement History of the last 5,000 Placements so the owner can undo vandalism. A local-only debug UI lets the developer shorten or reset the Cooldown while testing.

## User Stories

1. As a visitor, I want to open `/place` and immediately see the whole current Canvas, so that I know what everyone has made so far.
2. As a visitor, I want the Canvas to fill my screen without the page scrolling, so that panning it feels like a native app.
3. As a visitor, I want to drag with a mouse or one finger to pan the Canvas, so that I can move around it.
4. As a visitor, I want to zoom with the mouse wheel or a pinch, so that I can see individual Pixels or the whole picture.
5. As a visitor, I want Pixels to stay crisp and square at every zoom level, so that the art reads as pixel art.
6. As a visitor, I want zoom to center on my cursor or pinch point, so that the thing I'm zooming into stays under my fingers.
7. As a visitor, I want panning and zooming to stop at sensible limits, so that I can't lose the Canvas off screen or zoom into nothing.
8. As a visitor, I want a tap or click to select a Pixel rather than color it, so that a mis-tap doesn't waste my Cooldown.
9. As a visitor, I want ending a drag never to count as a tap, so that panning never selects a Pixel by accident.
10. As a visitor, I want the selected Pixel highlighted, so that I know exactly which Pixel I'm about to color.
11. As a visitor, I want a Palette bar to appear when I select a Pixel, so that I can choose one of the 16 colors, or any color from the custom color picker at its end.
12. As a visitor, I want to see the chosen color previewed on the selected Pixel, so that I can judge it before committing.
13. As a visitor, I want a Place button that confirms the Placement, so that coloring is a deliberate act.
14. As a visitor, I want my Pixel to appear the moment I press Place, so that the page feels responsive.
15. As a visitor, I want my Pixel to revert and a short message to show if the server rejects my Placement, so that the Canvas never shows something that didn't happen.
16. As a visitor, I want a countdown showing when I can place again, so that I know how long my Cooldown has left.
17. As a visitor, I want the countdown to be correct even if my device clock is wrong, so that I'm not told I can place when I can't.
18. As a visitor, I want the Place button disabled during my Cooldown, so that I don't try a Placement that will fail.
19. As a visitor, I want my Cooldown to survive a page reload, so that the countdown is accurate when I come back.
20. As a visitor, I want to see other visitors' Placements appear live, so that the Canvas feels shared and alive.
21. As a visitor, I want the page to reconnect by itself after a network drop and resync the whole Canvas, so that I never look at a stale picture.
22. As a visitor, I want a clear message when the server is unreachable, so that I know why nothing is updating.
23. As a visitor, I want to place without creating an account, so that friends can join instantly from a shared link.
24. As a visitor sharing Wi-Fi with friends, I want my own Cooldown separate from theirs, so that a household doesn't share a single Placement.
25. As a visitor, I want the same experience on phone and desktop, so that I can play from whatever device I have.
26. As a visitor, I want hovering or selecting a Pixel to reveal nothing about who placed it, so that the Canvas stays anonymous.
27. As the site owner, I want each visitor's Cooldown enforced on the server, so that devtools or curl can't bypass it.
28. As the site owner, I want Placements with out-of-range coordinates or unknown colors rejected, so that the Canvas can't be corrupted.
29. As the site owner, I want clearing cookies to buy a spammer at most 4 Placements per Cooldown window from one network, so that casual cheating is capped.
30. As the site owner, I want IPv6 visitors grouped by their /64 network, so that rotating addresses doesn't escape the cap.
31. As the site owner, I want visitor and network identities stored only as keyed hashes, so that the server never keeps raw IPs.
32. As the site owner, I want the Cooldown length and per-network cap set by server configuration, so that I can tune them without code changes.
33. As the site owner, I want the Canvas and Placement History saved to disk and reloaded on restart, so that a redeploy doesn't wipe the art.
34. As the site owner, I want a missing or corrupt save file to start an empty Canvas and log a warning, so that the API still boots.
35. As the site owner, I want the Placement History capped at the most recent 5,000 Placements, so that memory and disk stay bounded.
36. As the site owner, I want to list recent Placements with their visitor hash, so that I can identify a vandal.
37. As the site owner, I want to revert one visitor's Placements in a time range, so that I can undo vandalism.
38. As the site owner, I want a revert to restore only Pixels where that visitor's Placement is still on top, so that friends' later fixes are not undone.
39. As the site owner, I want reverted Pixels broadcast to everyone watching, so that the undo is visible immediately.
40. As the site owner, I want admin actions protected by a secret token, so that nobody else can revert or list Placements.
41. As the site owner, I want only allowed origins to connect to the Place room, so that other sites can't embed or script it.
42. As the developer, I want a debug panel on `/place` in local dev only, so that I can test without waiting 10 minutes.
43. As the developer, I want the debug panel to show my visitor identity, Cooldown, and network Placement count, so that I can see what the server sees.
44. As the developer, I want to set the Cooldown to a few seconds or zero from the debug panel, so that I can place rapidly while testing.
45. As the developer, I want to reset my own Cooldown from the debug panel, so that I can retry flows quickly.
46. As the developer, I want debug endpoints to not exist in production, so that a leaked debug UI can't bypass the Cooldown.
47. As the developer, I want Place to be the first Colyseus room in AramisJonesApi, so that future multiplayer games reuse the same realtime setup.
48. As the developer, I want frontend logic (coordinate mapping, gesture classification, Canvas decoding, countdown) covered by Vitest, so that phone and desktop behavior doesn't regress.

## Implementation Decisions

**Architecture**
- Colyseus is attached to AramisJonesApi's Fastify HTTP server (ADR-0001), using the Colyseus server version matching the portfolio's existing `@colyseus/sdk`. Place is a single long-lived room named `place`, created at boot, never auto-disposed, never locked, with no player cap.
- The Canvas, Placement History, and Cooldown state are held in memory in the room. The API must run as a single instance.
- Colyseus schema state sync is **not** used for Pixels; the room communicates with explicit messages.

**Domain module (server, deep module behind the room)**
- A Place model owns the Canvas (128×128, 24-bit RGB colors), the Placement History ring (capacity 5,000, oldest evicted first), Cooldown bookkeeping, and revert. The Colyseus room and HTTP routes are thin adapters over it. It takes an injected clock.
- Its interface, roughly: attempt a Placement (visitor id, network id, x, y, color) → accepted with `nextAllowedAt`, or rejected with a reason (`cooldown`, `network_cap`, `out_of_bounds`, `bad_color`) and `nextAllowedAt` where relevant; encode the Canvas; list recent Placements; revert (visitor id, from, to) → list of restored Pixels; serialize/restore for persistence.
- Each Placement History entry records Pixel coordinates, new color, the color it replaced, visitor hash, network hash, and time.
- Revert walks history newest-to-oldest and restores a Pixel only if the visitor's Placement is still the latest Placement on that Pixel, restoring the replaced color. Restorations are themselves recorded as Placements by an admin pseudo-visitor. Placements older than the 5,000-entry window cannot be reverted.

**Cooldown and identity**
- Visitor identity is a random id in a signed, httpOnly cookie issued by AramisJonesApi from an HTTP session endpoint the page calls before joining. Cookie is `SameSite=Lax`, `Secure` in production. This requires the API to be served from a subdomain of the site (e.g. `api.aramisjones.com`) in production; locally, `localhost:4321` and `localhost:4322` are same-site.
- The room authenticates in its auth hook by verifying the cookie from the request headers; a missing or invalid cookie rejects the join with a reason the client handles by calling the session endpoint and retrying once.
- The visitor's Cooldown is keyed by the visitor id. A network cap additionally limits Placements per network to 4 per Cooldown window (sliding window over the last Cooldown length). The network id is the request IP (honoring `TRUST_PROXY`), truncated to /64 for IPv6.
- Visitor and network ids are stored only as HMAC hashes keyed by a server secret.
- Cooldown state is in memory and is not persisted; a restart clears all Cooldowns (accepted).

**Wire contract (room messages)**
- On join, server → client: one `canvas` message `{ palette, width, height, pixels }` — Palette (16 preset hex colors, ordered), Canvas size, and `pixels` as binary RGB, three bytes per Pixel, row-major (49,152 bytes) — plus the visitor's Cooldown status (`nextAllowedAt`, `serverNow`).
- Client → server `place`: `{ x, y, color }` where color is a 24-bit RGB number (0xRRGGBB), a Palette preset or any custom color.
- Server → placer: `place:accepted { nextAllowedAt, serverNow }` or `place:rejected { reason, nextAllowedAt?, serverNow }`.
- Server → all clients: `placed { x, y, color }` for every accepted Placement and every Pixel restored by a revert.
- The Palette is the r/place 2017 16-color palette; white is the empty-Canvas color. The last swatch opens a custom color picker. (Changed after ticket 07: Pixels were 4-bit Palette indices; save files from then, version 1, are upgraded on load.)

**HTTP routes (registered like existing route modules)**
- Session: issues or refreshes the visitor cookie; returns nothing sensitive.
- Admin (bearer token from `PLACE_ADMIN_TOKEN`; routes absent when the token is unset): list recent Placements (limit, optional visitor hash); revert by visitor hash and time range, returning the count restored. No admin UI.
- Debug (registered only when `NODE_ENV` is development): get my identity hashes, Cooldown status, and network Placement count; set the runtime Cooldown length in seconds (including 0); reset my Cooldown.

**Configuration (added to the zod config schema)**
- `PLACE_COOLDOWN_SECONDS` (default 600), `PLACE_NETWORK_CAP` (default 4), `PLACE_COOKIE_SECRET` (required in production; dev default allowed), `PLACE_ADMIN_TOKEN` (optional), `PLACE_DATA_DIR` (default a local data folder, git-ignored).
- Colyseus origin checks reuse `CORS_ORIGINS`.

**Persistence (disk, interim)**
- The Canvas and Placement History are written to files in `PLACE_DATA_DIR` at most every 30 seconds when changed, and on graceful shutdown; writes go to a temp file then rename. On boot they are loaded; missing files start an empty Canvas, corrupt files are logged and start empty. Durable persistence is a follow-up (see Further Notes).

**Page (portfolio)**
- A static Astro page at `/place` following the existing widget pattern (page + page script + component folder with CSS), reading `PUBLIC_ARAMIS_API_URL`.
- Rendering: one 2D canvas element at 1:1 Pixel scale, drawn once from the decoded Canvas and updated one Pixel per `placed` message, scaled with CSS `image-rendering: pixelated` and positioned with a CSS transform.
- Input: Pointer Events on a viewport element with `touch-action: none`; one-pointer drag pans, wheel and two-pointer pinch zoom around the pointer/pinch midpoint; movement under about 6 CSS px between down and up is a tap. Zoom and pan are clamped so the Canvas cannot leave the viewport entirely.
- Layout: full-height viewport under the site header with no page scroll; Palette bar, Place button, Cooldown countdown, connection status, and (dev only) debug panel float over it.
- Placement flow: tap/click selects and highlights a Pixel → Palette bar → choose color (previewed) → Place. The Pixel is drawn optimistically and rolled back on `place:rejected`.
- Countdown is computed from `nextAllowedAt` adjusted by the offset between `serverNow` and the local clock.
- Reconnect with backoff; on rejoin the full Canvas replaces local state.
- Pure frontend modules, kept free of DOM so they are testable: viewport math (screen ↔ Pixel coordinates, zoom about a point, clamping), gesture classification (tap vs drag vs pinch), Canvas decoding (packed 4-bit → indices/RGBA), Cooldown countdown (server-offset arithmetic, formatting).

## Testing Decisions

- Good tests exercise external behavior through the highest seam and never assert on internals (no peeking at the ring buffer or maps); they use injected clocks rather than real waiting.
- **Seam A (server, primary)**: boot AramisJonesApi in-process (Fastify + Colyseus) with test config, an injected clock, and a temporary data folder; drive it with real Colyseus SDK clients and `app.inject`. Covers: join receives Palette, Canvas, and Cooldown; accepted Placement broadcasts to all clients; Cooldown rejection and expiry; separate visitors on one network each get a Cooldown but the 5th Placement in a window from that network is rejected; IPv6 /64 grouping; out-of-bounds and bad color rejection; join without a valid cookie is rejected; Placement History caps at 5,000 with oldest evicted; revert restores only Pixels where the visitor is still on top and broadcasts them; admin routes reject a missing/wrong token and are absent without one; debug routes exist in development and not in production; Canvas and history survive a restart via the data folder; corrupt save file boots empty.
- Prior art: `soundscape.integration.test.ts` (in-process Fastify with `app.inject`, explicit `Config` objects, rate-limit assertions) and `rateLimiter.test.ts` (injected `now`). Tests run under `node:test` via `tsx --test`.
- **Seam B (portfolio, new)**: add Vitest to the portfolio and test the pure frontend modules: screen↔Pixel mapping at several zooms and offsets, zoom-about-point keeps the anchor fixed, clamping, tap vs drag thresholds and pinch detection, Canvas decoding round-trips against the server's packing, countdown with skewed clocks. No DOM or canvas-element rendering tests; the page itself is checked by hand with the debug panel on desktop and a phone.

## Out of Scope

- Accounts, OAuth sign-in, Cloudflare Turnstile, or fingerprinting.
- Showing who placed a Pixel, or any placer info on hover. Place is anonymous by design.
- Durable persistence (Supabase) for the Canvas or Placement History.
- Growing or infinite Canvas.
- An admin UI, timelapse/replay UI, seasons or resets.
- Rebuilding the existing planes / catch-of-the-day rooms.
- Persisting Cooldowns across restarts.
- Horizontal scaling of AramisJonesApi.

## Further Notes

- Disk persistence is interim. If AramisJonesApi is deployed on Render, its filesystem is ephemeral and may be wiped on restart, redeploy, or free-tier spin-down; the owner wants to discuss durable persistence (Placement History and Canvas in Supabase) as a follow-up.
- Follow-ups to file as tickets: durable persistence; a large-scale design write-up (`docs/place-at-scale.md`: Redis bitfield, CDN-cached snapshots, chunked/growing canvas, websocket fan-out, account-based enforcement, as r/place did); growing the Canvas (doubling, art kept in place) and moving rendering to a per-frame redraw when it does; Turnstile if botting appears; recovering or rebuilding the existing compiled-only Colyseus game server inside AramisJonesApi.
- Production deploy needs the API on a same-site subdomain for the visitor cookie, `TRUST_PROXY=true` behind the host's proxy, and `PUBLIC_ARAMIS_API_URL` set for the portfolio build.
