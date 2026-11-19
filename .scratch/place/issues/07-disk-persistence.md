# 07: The Canvas and Placement History survive a restart (disk)

**What to build:** Restarting or redeploying AramisJonesApi no longer wipes the art: the Canvas and Placement History are saved to the server's disk and loaded back on boot. Durable persistence is a later ticket (10). See `.scratch/place/spec.md`.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] `PLACE_DATA_DIR` is added to config with a local default that is git-ignored
- [ ] The Canvas and Placement History are written at most every 30 seconds when changed, and on graceful shutdown, via write-to-temp-then-rename
- [ ] On boot they are loaded; missing files start an empty Canvas; corrupt files log a warning and start empty
- [ ] Cooldowns are not persisted (a restart clears them)
- [ ] Server tests with a temporary data folder: Placements survive a restart; a corrupt file boots an empty Canvas
