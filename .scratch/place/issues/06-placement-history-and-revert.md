# 06: Placement History and admin revert

**What to build:** The server keeps a Placement History of the last 5,000 Placements, and the site owner can list recent Placements and revert one visitor's vandalism without undoing friends' later fixes. Admin access is by token; there is no admin UI. See `.scratch/place/spec.md`.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Each Placement History entry records the Pixel, new color, the color it replaced, visitor hash, network hash, and time; the history holds the most recent 5,000 and evicts the oldest
- [ ] `PLACE_ADMIN_TOKEN` is added to config; admin routes require it as a bearer token and are not registered when it is unset
- [ ] Admin can list recent Placements (with a limit and optional visitor hash filter)
- [ ] Admin can revert a visitor hash over a time range: only Pixels where that visitor's Placement is still the latest are restored to the color it replaced; the response gives the count restored
- [ ] Restored Pixels are broadcast as `placed` to all clients and recorded in the Placement History as admin Placements
- [ ] Server tests: history caps at 5,000 with oldest evicted; revert skips Pixels a later visitor placed over; restorations are broadcast; missing/wrong token rejected; routes absent without a token
