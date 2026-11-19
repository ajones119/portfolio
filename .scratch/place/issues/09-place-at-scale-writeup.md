# 09: Write-up — designing Place at large scale

**What to build:** A design document, `docs/place-at-scale.md`, describing how Place would change to handle Reddit-scale traffic, so a future redesign starts from a plan rather than from scratch. See `.scratch/place/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Covers Canvas storage (e.g. Redis bitfield) and CDN-cached snapshots, with how r/place 2017/2022 did it
- [ ] Covers chunked or growing Canvases and viewport loading
- [ ] Covers realtime fan-out across multiple instances (pub/sub, diff frames) and what changes in the single-instance Colyseus design
- [ ] Covers enforcement at scale: accounts, Turnstile/proof-of-work, proxy detection, and their trade-offs against anonymity
- [ ] Covers durable Placement History storage
- [ ] Uses the glossary's vocabulary and cites sources
