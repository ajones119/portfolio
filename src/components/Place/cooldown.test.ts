import { describe, expect, it } from 'vitest';
import { cooldownRemaining, formatCooldown } from './cooldown';

describe('cooldownRemaining', () => {
  it('uses elapsed server time when the local clock is far ahead', () => {
    expect(cooldownRemaining({
      nextAllowedAt: 1_600_000,
      serverNow: 1_000_000,
      synchronizedAt: 10_000_000,
    }, 10_150_000)).toBe(450_000);
  });

  it('never returns a negative duration', () => {
    expect(cooldownRemaining({
      nextAllowedAt: 1_600_000,
      serverNow: 1_000_000,
      synchronizedAt: 10_000_000,
    }, 10_700_000)).toBe(0);
  });
});

describe('formatCooldown', () => {
  it.each([
    [600_000, '10:00'],
    [599_000, '9:59'],
    [1_001, '0:02'],
    [1, '0:01'],
    [0, '0:00'],
  ])('formats %i milliseconds as %s', (milliseconds, display) => {
    expect(formatCooldown(milliseconds)).toBe(display);
  });
});
