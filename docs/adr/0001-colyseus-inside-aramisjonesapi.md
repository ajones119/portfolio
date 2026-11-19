# Realtime rooms run on Colyseus inside AramisJonesApi

Place needs live updates, and more multiplayer games are coming, so realtime rooms run on Colyseus attached to AramisJonesApi's existing HTTP server rather than as SSE or a separate game service. One deploy owns the REST routes, the rooms, CORS/origin rules, and the visitor identity cookie that both need. The existing compiled-only Colyseus server in the portfolio's `server/` folder has no recoverable source, so its rooms will be rebuilt inside AramisJonesApi rather than extended.

## Considered Options

- **SSE from AramisJonesApi**: simplest for Place alone, but every future game would need a second transport anyway.
- **A standalone Colyseus service**: isolates game tick loads from the API, but splits identity, config, and deploys across two services for a low-traffic site.

## Consequences

- AramisJonesApi must run as a single instance while rooms keep state in memory.
- A CPU-heavy game room can slow REST responses; revisit by splitting the service out if that ever happens.
