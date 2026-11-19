export interface CooldownSync {
  nextAllowedAt: number;
  serverNow: number;
  synchronizedAt: number;
}

/** Remaining Cooldown based on elapsed time, independent of the device wall clock. */
export function cooldownRemaining(sync: CooldownSync, localNow: number): number {
  const elapsed = localNow - sync.synchronizedAt;
  return Math.max(0, sync.nextAllowedAt - sync.serverNow - elapsed);
}

export function formatCooldown(milliseconds: number): string {
  const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
