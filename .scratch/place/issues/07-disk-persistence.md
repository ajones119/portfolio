# 07: The Canvas and Placement History survive a restart (disk)

**What to build:** Restarting or redeploying AramisJonesApi no longer wipes the art: the Canvas and Placement History are saved to the server's disk and loaded back on boot. Durable persistence is a later ticket (10). See `.scratch/place/spec.md`.

**Blocked by:** 06

**Status:** done

- [x] `PLACE_DATA_DIR` is added to config with a local default that is git-ignored
- [x] The Canvas and Placement History are written at most every 30 seconds when changed, and on graceful shutdown, via write-to-temp-then-rename
- [x] On boot they are loaded; missing files start an empty Canvas; corrupt files log a warning and start empty
- [x] Cooldowns are not persisted (a restart clears them)
- [x] Server tests with a temporary data folder: Placements survive a restart; a corrupt file boots an empty Canvas

## Comments

**Implementation (agent):** One file, `place.json` in `PLACE_DATA_DIR` (default `data/place`, git-ignored), holds `{ version: 1, width, height, pixels (base64 packed Canvas), history }`. One rename keeps the Canvas and history consistent.

- `loadPlace` runs in `buildApp` before the model is created. A missing file gives an empty Canvas. A corrupt file (bad JSON, or wrong shape or sizes, checked by zod) is renamed to `place.json.corrupt-<ms>`, a warning is logged, and Place starts empty. The bad file is never overwritten, so it can be recovered by hand.
- `startPlaceSaver` saves only when the model's `changeCount` has moved, every 30 s (timer `unref`'d), and on Fastify `onClose`. It writes `place.json.tmp`, then renames. Save failures are logged, not thrown.
- Cooldowns and network windows are not saved; a restart clears them (tested).
- Graceful shutdown (Ctrl+C / SIGTERM) flushes. A hard kill (Windows `taskkill /F`, a crash) can lose up to 30 s of Placements.

**Verified:** 3 server tests with temp data folders (Placements and history survive a restart, revert still works on loaded history, Cooldown cleared; an unchanged Canvas writes nothing; corrupt JSON and a wrong-sized Canvas each boot empty with the file kept aside). On the real dev server, a Placement was saved by the timer within 30 s and was present after a watch-mode restart.

**For ticket 10:** on Render the disk is ephemeral, so this protects restarts on one machine, not redeploys. `PlaceSave` from `serialize()` is the natural payload to move into durable storage.
