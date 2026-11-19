# 10: Durable persistence for the Canvas and Placement History

**What to build:** The Canvas and Placement History survive any server loss, not just restarts on the same disk — likely by storing them in Supabase from AramisJonesApi. The owner wants to discuss the approach before it is specified.

**Blocked by:** 07

**Status:** needs-triage

- [ ] Decide the store (Supabase Postgres is the leading option; it already backs the soundscape catalog) and what is stored (Canvas snapshot, full or capped Placement History)
- [ ] Account for the risk that a Render deploy's filesystem is wiped on restart, redeploy, or free-tier spin-down, which makes the disk persistence from 07 unreliable there
- [ ] Writes use a server-only secret key; the browser never talks to Supabase directly
