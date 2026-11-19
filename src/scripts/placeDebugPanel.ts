import '../components/Place/placeDebug.css';
import { cooldownRemaining, formatCooldown } from '../components/Place/cooldown';

/** What AramisJonesApi's dev-only debug routes report about this visitor. */
interface DebugStatus {
  visitorHash: string;
  networkHash: string;
  cooldownSeconds: number;
  nextAllowedAt: number;
  serverNow: number;
  networkPlacements: number;
  networkCap: number;
}

interface DebugPanelOptions {
  apiBaseUrl: string;
  /** Called with the server's Cooldown status after every refresh, so the page's countdown follows debug changes. */
  onCooldown: (status: { nextAllowedAt: number; serverNow: number }) => void;
}

/**
 * The /place debug panel, loaded only in dev builds. It shows what the server
 * sees about this visitor and can change the Cooldown length or reset it.
 */
export function mountDebugPanel(element: HTMLElement, { apiBaseUrl, onCooldown }: DebugPanelOptions) {
  const field = (name: string) => element.querySelector<HTMLElement>(`[data-debug-${name}]`)!;
  const secondsInput = element.querySelector<HTMLInputElement>('[data-debug-seconds-input]')!;
  const message = field('message');

  async function request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<void> {
    message.textContent = '';
    try {
      const response = await fetch(`${apiBaseUrl}/place/debug${path}`, {
        method,
        credentials: 'include',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.status === 404) throw new Error('Debug routes are off (the API is not in development).');
      if (!response.ok) throw new Error(`Debug request failed (${response.status}).`);
      show(await response.json() as DebugStatus);
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  function show(status: DebugStatus): void {
    field('visitor').textContent = status.visitorHash.slice(0, 12);
    field('visitor').title = status.visitorHash;
    field('network').textContent = status.networkHash.slice(0, 12);
    field('network').title = status.networkHash;
    field('cooldown').textContent = `${status.cooldownSeconds}s`;
    const remaining = cooldownRemaining({ ...status, synchronizedAt: 0 }, 0);
    field('remaining').textContent = remaining === 0 ? 'ready' : formatCooldown(remaining);
    field('network-count').textContent = `${status.networkPlacements} / ${status.networkCap}`;
    if (document.activeElement !== secondsInput) secondsInput.value = String(status.cooldownSeconds);
    onCooldown(status);
  }

  element.querySelector('form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    void request('POST', '/cooldown', { seconds: secondsInput.valueAsNumber });
  });
  field('reset').addEventListener('click', () => void request('POST', '/reset'));
  field('refresh').addEventListener('click', () => void request('GET', ''));
  element.addEventListener('toggle', () => {
    if ((element as HTMLDetailsElement).open) void request('GET', '');
  });

  return {
    refresh(): void {
      if ((element as HTMLDetailsElement).open) void request('GET', '');
    },
  };
}
