const FIRST_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const JITTER = 0.2;

/** How long to wait before reconnect attempt `attempt` (0-based): doubling from 1 s up to 30 s, ±20% jitter. */
export function reconnectDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(FIRST_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return base * (1 - JITTER + 2 * JITTER * random());
}
