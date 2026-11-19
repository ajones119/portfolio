import { describe, expect, it } from 'vitest';
import { reconnectDelay } from './reconnect';

describe('reconnectDelay', () => {
  it('doubles from one second, up to thirty seconds', () => {
    const middle = (attempt: number) => reconnectDelay(attempt, () => 0.5);
    expect([0, 1, 2, 3, 4, 5, 6, 10].map(middle)).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000]);
  });

  it('spreads retries ±20% so reconnecting visitors do not all arrive at once', () => {
    expect(reconnectDelay(2, () => 0)).toBe(3_200);
    expect(reconnectDelay(2, () => 0.999999)).toBeCloseTo(4_800, 0);
    expect(reconnectDelay(20, () => 0.999999)).toBeCloseTo(36_000, 0);
  });
});
