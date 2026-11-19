# 13: Rebuild the planes and catch-of-the-day rooms in AramisJonesApi

**What to build:** The existing multiplayer rooms (planes, catch-of-the-day), which currently exist only as compiled output with no source, run as Colyseus rooms inside AramisJonesApi alongside Place (ADR-0001), and the portfolio's game clients point at it.

**Blocked by:** 01

**Status:** needs-triage

- [ ] Decide whether to recover the original source or rebuild from the compiled output and client code
- [ ] Rooms run in AramisJonesApi with the same origin rules as Place
- [ ] The portfolio's game clients connect to AramisJonesApi; the old `server/` folder can be retired
