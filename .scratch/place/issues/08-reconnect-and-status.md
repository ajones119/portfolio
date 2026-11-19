# 08: Reconnect and connection status

**What to build:** If the connection to the Place room drops, the page tells the visitor and reconnects by itself, replacing its Canvas with the server's on rejoin so it never shows a stale picture. See `.scratch/place/spec.md`.

**Blocked by:** 02

**Status:** done

- [x] A visible connection status (connecting, live, offline) over the Canvas
- [x] Automatic reconnect with backoff; Place is disabled while disconnected
- [x] On rejoin the full Canvas from the server replaces local state, including any unacknowledged optimistic Pixel
- [x] A clear message when the API is unreachable on first load
- [x] Checked by hand by stopping and restarting the API while the page is open (done in real Chromium via Playwright, stopping and restarting the actual API process)

## Comments

**Implementation (agent):** The page rejoins with a fresh `join` rather than the SDK's session reconnect (turned off with `room.reconnection.enabled = false`). The server never allows session reconnection, and a restarted API has a new room anyway. A fresh join always delivers a full `canvas` snapshot.

- Backoff: 1 s doubling to 30 s, ±20% jitter (`reconnectDelay`, Vitest). The browser `online` event retries straight away.
- On leave: the unacknowledged optimistic Pixel is repainted from the last known Canvas, the selection is cleared, and taps, keys and the Place button do nothing until the next snapshot replaces the whole Canvas.
- A connection pill over the top of the Canvas shows Connecting…, Live, or Offline/unreachable with the retry countdown. The dock's status line now carries only selection and Placement messages.
- First load with the API down shows "Place is unreachable right now. Retrying in Ns…" and keeps retrying.

**Verified (Playwright, real API process stopped and restarted):** first load with the API down shows the unreachable message, then goes live by itself when the API starts. Stopping the API mid-session shows Offline with a countdown and disables Placing, and taps select nothing. After restart it rejoins, the server's (now empty) Canvas replaced the locally drawn red Pixel, and Placing is re-enabled.

**Local dev note:** another project's `astro preview` was listening on `127.0.0.1:4322` and shadowed the API on `0.0.0.0:4322`. The check ran the API on 4323 with `PUBLIC_ARAMIS_API_URL=http://localhost:4323`.
