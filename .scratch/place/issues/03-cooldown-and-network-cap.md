# 03: Cooldown and network cap

**What to build:** After a Placement a visitor must wait out their Cooldown (10 minutes by default) before placing again, shown as an accurate countdown. Friends on the same network each get their own Cooldown, but one network can make at most 4 Placements per Cooldown window, so clearing cookies does not buy unlimited Pixels. See `.scratch/place/spec.md`.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] `PLACE_COOLDOWN_SECONDS` (default 600) and `PLACE_NETWORK_CAP` (default 4) are added to config
- [ ] The server rejects a Placement during the visitor's Cooldown with reason `cooldown` and `nextAllowedAt`
- [ ] The network id is the request IP (honoring `TRUST_PROXY`), truncated to /64 for IPv6; a 5th Placement from one network within one Cooldown window (sliding) is rejected with reason `network_cap`
- [ ] Visitor and network ids are held only as HMAC hashes keyed by a server secret; raw IPs are never stored
- [ ] Join and `place:accepted` / `place:rejected` carry `nextAllowedAt` and `serverNow`
- [ ] The page shows a countdown computed from the server timestamps (correct under device clock skew), disables Place during the Cooldown, and shows the correct countdown after a reload
- [ ] Server tests with an injected clock: Cooldown rejection then acceptance after expiry; separate visitors on one network each place but the 5th in a window is rejected; IPv6 addresses in one /64 share a cap
- [ ] Vitest: countdown arithmetic with a skewed local clock, and formatting
