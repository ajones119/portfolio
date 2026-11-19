# 08: Reconnect and connection status

**What to build:** If the connection to the Place room drops, the page tells the visitor and reconnects by itself, replacing its Canvas with the server's on rejoin so it never shows a stale picture. See `.scratch/place/spec.md`.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] A visible connection status (connecting, live, offline) over the Canvas
- [ ] Automatic reconnect with backoff; Place is disabled while disconnected
- [ ] On rejoin the full Canvas from the server replaces local state, including any unacknowledged optimistic Pixel
- [ ] A clear message when the API is unreachable on first load
- [ ] Checked by hand by stopping and restarting the API while the page is open
