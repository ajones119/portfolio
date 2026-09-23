import type { GuestIdentity } from '../../planes/classes/GameClient';

const STORAGE_KEY = 'aramis-planes-guest-identity';
const COLORS = ['#ff6f61', '#f0bd3d', '#5cc8d7', '#8bd17c', '#c78cff', '#ff9f68'] as const;
const FALLBACK_NAME = 'Pilot';

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)] ?? COLORS[0];
}

export function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 24);
}

export function getGuestIdentity(): GuestIdentity {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<GuestIdentity> | null;
    const displayName = typeof stored?.displayName === 'string' ? normalizeDisplayName(stored.displayName) : '';
    const color = typeof stored?.color === 'string' && /^#[0-9a-f]{6}$/i.test(stored.color)
      ? stored.color
      : randomColor();
    const identity = { displayName: displayName || FALLBACK_NAME, color };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    return identity;
  } catch {
    return { displayName: FALLBACK_NAME, color: randomColor() };
  }
}

export function saveGuestIdentity(identity: GuestIdentity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}
