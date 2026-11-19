# 05: Dev-only debug panel

**What to build:** When running locally, the developer sees a debug panel on `/place` showing what the server sees about them, and can shorten or reset their Cooldown to test quickly. None of this exists in production. See `.scratch/place/spec.md`.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Debug HTTP routes are registered only when `NODE_ENV` is development: get my visitor/network hashes, Cooldown status, and network Placement count; set the runtime Cooldown length in seconds (0 allowed); reset my Cooldown
- [ ] The debug panel renders only in dev builds of the portfolio and uses those routes
- [ ] Changing the Cooldown length applies to subsequent Placements and is reflected in the countdown
- [ ] Server tests: debug routes respond in development and return 404 in production
