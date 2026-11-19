# 01: Tracer bullet — the empty Canvas appears on /place

**What to build:** A visitor opens `/place` and sees the whole 128×128 Canvas (all white) filling the screen under the site header, drawn from the live `place` Colyseus room in AramisJonesApi. This stands up Colyseus inside AramisJonesApi (ADR-0001), the Place model's Canvas and Palette, the join payload, the page, and both test seams. See `.scratch/place/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Colyseus is attached to AramisJonesApi's existing HTTP server, using the server version matching the portfolio's `@colyseus/sdk`; its origin checks reuse `CORS_ORIGINS`
- [x] A single `place` room is created at boot and is never auto-disposed or locked
- [x] On join the room sends the 16-color r/place 2017 Palette (index 0 = white), the Canvas size, and the Canvas as 4-bit Palette indices packed two Pixels per byte, row-major (8,192 bytes)
- [x] `/place` is a static Astro page following the existing widget pattern, reading `PUBLIC_ARAMIS_API_URL`
- [x] The page decodes the Canvas and draws it on one 2D canvas element at 1:1 Pixel scale, scaled up with `image-rendering: pixelated`
- [x] Full-height layout under the site header with no page scroll, on desktop and phone
- [x] Server test seam: AramisJonesApi booted in-process with test config, driven by a real Colyseus SDK client; a test asserts the join payload (Palette, size, all-white Canvas)
- [x] Vitest is added to the portfolio with a test script; a test decodes a packed Canvas into Palette indices and matches the server's packing

## Comments

**Implementation (agent):** Done except a visual check. AramisJonesApi commit `094b22a`; portfolio commit adding `/place`. API tests 8/8, portfolio Vitest 4/4.

- Colyseus's own HTTP router is not used (it would take over every Fastify request); websocket upgrades attach to Fastify's server and matchmaking is a Fastify route limited to `join`, `joinById`, `reconnect`.
- The join payload is one `canvas` message: `{ palette, width, height, pixels }`, where `pixels` is the packed 4-bit binary. Ticket 02 should use the same shape.
- Sockets with no `Origin` header are allowed (non-browser clients); browsers always send one.
- The three pre-existing `node:test` files in the portfolio are excluded from Vitest and still have no runner.

**Remaining (human):** open `/place` with both dev servers running and confirm the full-height, no-scroll layout on desktop and a phone, then set this to done.

**Notes for ticket 02:** no test yet ties the server's nibble order to the decoder (the server only sends zeros so far); once Placements exist, add a server test that places a Pixel and checks its packed byte. The API's dev `@colyseus/sdk` is ^0.18.10 while the portfolio uses ^0.18.4.

**Layout verification (Playwright/Chrome):** Desktop (1440×900) and emulated Pixel 7 (412×839) both joined the live room and drew the opaque white 128×128 Canvas. The viewport starts at the header's bottom (130 CSS px) and ends at the screen bottom; the square canvas element measures 738×738 and 380×380 respectively. Neither page scrolled in either axis. Fixed the collapsed Place layout under Lenis and enabled credentialed requests for the API's existing CORS allowlist. All four Place integration tests passed, including the new browser preflight regression.
