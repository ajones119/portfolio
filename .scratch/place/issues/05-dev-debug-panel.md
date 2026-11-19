# 05: Dev-only debug panel

**What to build:** When running locally, the developer sees a debug panel on `/place` showing what the server sees about them, and can shorten or reset their Cooldown to test quickly. None of this exists in production. See `.scratch/place/spec.md`.

**Blocked by:** 03

**Status:** done

- [x] Debug HTTP routes are registered only when `NODE_ENV` is development: get my visitor/network hashes, Cooldown status, and network Placement count; set the runtime Cooldown length in seconds (0 allowed); reset my Cooldown
- [x] The debug panel renders only in dev builds of the portfolio and uses those routes
- [x] Changing the Cooldown length applies to subsequent Placements and is reflected in the countdown
- [x] Server tests: debug routes respond in development and return 404 in production

## Comments

**Implementation (agent):** `GET /place/debug`, `POST /place/debug/cooldown {seconds}` (whole seconds 0–86400) and `POST /place/debug/reset`, registered only when `NODE_ENV` is `development`. They identify the caller by the visitor cookie (401 without one) and `request.ip`, and every route returns `{ visitorHash, networkHash, cooldownSeconds, nextAllowedAt, serverNow, networkPlacements, networkCap }`.

- The Place model is now created in `buildApp` and shared by the room and the debug routes. Its new operations are `cooldownStatus`, `setCooldownSeconds` and `resetCooldown`.
- Changing the length affects later Placements only; a running Cooldown keeps its end time. Use Reset for that. Reset also clears the visitor's network Placement window, so the network cap doesn't block quick testing.
- The panel's markup is behind `import.meta.env.DEV`, and its script and CSS are imported dynamically only in dev. A production build was checked: no debug markup, code, styles or route paths.
- Every panel response re-syncs the page's countdown, and the panel refreshes after each accepted Placement while it is open.

**Verified:** 3 server tests (dev routes, Cooldown change and reset, 404 in production) and a Playwright run against both dev servers: panel values, a 4 s Cooldown in the countdown, reset, and placing again straight after.
