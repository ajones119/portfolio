import { Client, MatchMakeError, type Room } from '@colyseus/sdk';
import { colorsToRgba, colorToHex, decodeCanvas, hexToColor } from '../components/Place/canvasCodec';
import { cooldownRemaining, formatCooldown, type CooldownSync } from '../components/Place/cooldown';
import { createGesture } from '../components/Place/gesture';
import { reconnectDelay } from '../components/Place/reconnect';
import {
  clampView, fitView, pixelAt, pixelRect, wheelZoomFactor, zoomAbout, zoomLimits,
  type Pixel, type Point, type View,
} from '../components/Place/viewport';

/** The whole Canvas as the Place room sends it on join. */
interface CanvasSnapshot {
  palette: string[];
  width: number;
  height: number;
  pixels: Uint8Array;
  nextAllowedAt: number;
  serverNow: number;
}

interface Placement extends Pixel {
  /** A 24-bit color, 0xRRGGBB. */
  color: number;
}

interface CooldownMessage {
  nextAllowedAt: number;
  serverNow: number;
}

interface RejectedPlacement {
  reason: string;
  nextAllowedAt?: number;
  serverNow: number;
}

const API_BASE_URL = (import.meta.env.PUBLIC_ARAMIS_API_URL ?? 'http://localhost:4322').replace(/\/$/, '');

const SELECT_HINT = 'Select a Pixel on the Canvas to choose its color.';

async function establishSession(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/place/session`, { method: 'POST', credentials: 'include' });
  if (!response.ok) throw new Error(`Place session failed (${response.status}).`);
}

async function joinPlace(): Promise<Room> {
  const client = new Client(API_BASE_URL);
  await establishSession();
  try {
    return await client.join('place');
  } catch (error) {
    if (!(error instanceof MatchMakeError) || error.code !== 401) throw error;
    await establishSession();
    return client.join('place');
  }
}

/**
 * Pans and zooms the Canvas inside the surface. Drags pan, wheels and pinches
 * zoom about the pointer, and taps select the Pixel under them. `onChange`
 * runs after every view change so overlays can follow the Canvas.
 */
function mountViewport(
  surface: HTMLElement,
  canvas: HTMLCanvasElement,
  { onTap, onChange }: { onTap: (pixel: Pixel) => void; onChange: (view: View) => void },
) {
  const canvasSize = () => ({ width: canvas.width, height: canvas.height });
  const surfaceSize = () => ({ width: surface.clientWidth, height: surface.clientHeight });
  let view = fitView(surfaceSize(), canvasSize());
  // Until the visitor pans or zooms, resizing the screen re-fits the whole Canvas.
  let moved = false;

  function apply(next: View): void {
    view = clampView(next, surfaceSize(), canvasSize());
    canvas.style.width = `${canvas.width * view.scale}px`;
    canvas.style.height = `${canvas.height * view.scale}px`;
    canvas.style.transform = `translate(${view.x}px, ${view.y}px)`;
    onChange(view);
  }

  function zoom(anchor: Point, factor: number): void {
    moved = true;
    apply(zoomAbout(view, anchor, factor, zoomLimits(surfaceSize(), canvasSize())));
  }

  const toSurface = (event: PointerEvent | WheelEvent) => {
    const bounds = surface.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const gesture = createGesture();
  const sample = (event: PointerEvent) => ({ id: event.pointerId, ...toSurface(event) });

  surface.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    surface.setPointerCapture(event.pointerId);
    gesture.down(sample(event));
  });
  surface.addEventListener('pointermove', (event) => {
    const action = gesture.move(sample(event));
    if (!action) return;
    surface.dataset.gesture = '';
    moved = true;
    if (action.type === 'pan') {
      apply({ ...view, x: view.x + action.dx, y: view.y + action.dy });
    } else if (action.type === 'pinch') {
      view = { ...view, x: view.x + action.dx, y: view.y + action.dy };
      zoom(action.anchor, action.factor);
    }
  });
  const end = () => {
    if (!gesture.active) delete surface.dataset.gesture;
  };
  surface.addEventListener('pointerup', (event) => {
    const action = gesture.up(sample(event));
    end();
    if (action?.type !== 'tap') return;
    const pixel = pixelAt(view, action.point, canvasSize());
    if (pixel) onTap(pixel);
  });
  const cancel = (event: PointerEvent) => {
    gesture.cancel(event.pointerId);
    end();
  };
  surface.addEventListener('pointercancel', cancel);
  surface.addEventListener('lostpointercapture', cancel);

  surface.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoom(toSurface(event), wheelZoomFactor(event.deltaY, event.deltaMode, event.ctrlKey));
  }, { passive: false });

  new ResizeObserver(() => apply(moved ? view : fitView(surfaceSize(), canvasSize()))).observe(surface);
  apply(view);

  return {
    get view(): View {
      return view;
    },
    /** Re-fit after the Canvas size changes (for example on a new snapshot). */
    refit(): void {
      moved = false;
      apply(fitView(surfaceSize(), canvasSize()));
    },
  };
}

/** The last Palette swatch: a rainbow tile over a color input that opens the browser's picker. */
function customSwatch(): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'place__custom';
  label.title = 'Custom color';
  const input = document.createElement('input');
  input.type = 'color';
  input.value = '#ff6600';
  input.setAttribute('aria-label', 'Custom color');
  label.append(input);
  return label;
}

function mountPlace(root: HTMLElement): void {
  const surface = root.querySelector<HTMLElement>('[data-place-surface]')!;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-place-canvas]')!;
  const marker = root.querySelector<HTMLElement>('[data-place-selection]')!;
  const status = root.querySelector<HTMLElement>('[data-place-status]')!;
  const connection = root.querySelector<HTMLElement>('[data-place-connection]')!;
  const cooldownStatus = root.querySelector<HTMLElement>('[data-place-cooldown]')!;
  const panel = root.querySelector<HTMLElement>('[data-place-panel]')!;
  const paletteBar = root.querySelector<HTMLFieldSetElement>('[data-place-palette]')!;
  const confirm = root.querySelector<HTMLButtonElement>('[data-place-confirm]')!;
  const cancel = root.querySelector<HTMLButtonElement>('[data-place-cancel]')!;
  const context = canvas.getContext('2d');
  if (!context) {
    connection.dataset.state = 'offline';
    connection.textContent = 'This browser cannot display the Canvas.';
    return;
  }

  // Only snapshots and broadcasts change these colors. A draft lives in the
  // selection marker; an in-flight Placement paints just the canvas element.
  let pixels: Uint32Array | null = null;
  let selected: Pixel | null = null;
  let pending: Placement | null = null;
  /** The color chosen for the selected Pixel: a Palette preset or the custom color. */
  let choice: number | null = null;
  let cooldownSync: CooldownSync | null = null;

  // The selection marker sits over the Canvas and follows it through pan and zoom.
  function placeMarker(view: View): void {
    if (!selected) return;
    const { left, top, size } = pixelRect(view, selected);
    marker.style.width = `${size}px`;
    marker.style.height = `${size}px`;
    marker.style.transform = `translate(${left}px, ${top}px)`;
  }

  // Panning and zooming work while connecting; taps wait for the Canvas.
  const viewport = mountViewport(surface, canvas, { onTap: (pixel) => select(pixel), onChange: placeMarker });

  function remainingCooldown(): number {
    return cooldownSync ? cooldownRemaining(cooldownSync, performance.now()) : 0;
  }

  function refreshCooldown(): void {
    const remaining = remainingCooldown();
    cooldownStatus.hidden = remaining === 0;
    cooldownStatus.textContent = remaining === 0 ? '' : `Place again in ${formatCooldown(remaining)}.`;
    confirm.disabled = choice === null || pending !== null || remaining > 0;
  }

  function synchronizeCooldown({ nextAllowedAt, serverNow }: CooldownMessage): void {
    cooldownSync = { nextAllowedAt, serverNow, synchronizedAt: performance.now() };
    refreshCooldown();
  }

  const cooldownInterval = window.setInterval(refreshCooldown, 250);

  function clearSelection(): void {
    if (panel.contains(document.activeElement)) canvas.focus({ preventScroll: true });
    for (const swatch of paletteBar.querySelectorAll<HTMLInputElement>('input[type=radio]')) swatch.checked = false;
    custom?.classList.remove('is-chosen');
    choice = null;
    selected = null;
    marker.hidden = true;
    marker.style.backgroundColor = '';
    panel.hidden = true;
    confirm.disabled = true;
  }

  function select(pixel: Pixel): void {
    if (!pixels || pending) return;
    selected = pixel;
    placeMarker(viewport.view);
    marker.hidden = false;
    panel.hidden = false;
    status.textContent = `Pixel (${pixel.x}, ${pixel.y}) · Choose a color, then press Place.`;
  }

  canvas.addEventListener('keydown', (event) => {
    if (!pixels || pending) return;
    let { x, y } = selected ?? { x: Math.floor(canvas.width / 2), y: Math.floor(canvas.height / 2) };
    switch (event.key) {
      case 'ArrowLeft':  x = Math.max(0, x - 1); break;
      case 'ArrowRight': x = Math.min(canvas.width - 1, x + 1); break;
      case 'ArrowUp':    y = Math.max(0, y - 1); break;
      case 'ArrowDown':  y = Math.min(canvas.height - 1, y + 1); break;
      case ' ':
      case 'Enter': break;
      default: return;
    }
    event.preventDefault();
    select({ x, y });
  });

  function choose(color: number): void {
    choice = color;
    marker.style.backgroundColor = colorToHex(color);
    refreshCooldown();
  }

  // The last swatch opens the browser's color picker for any color. Picking
  // updates the preview live; clicking it again reuses the last custom color.
  let custom: HTMLLabelElement | null = null;
  let customUsed = false;
  function chooseCustom(input: HTMLInputElement): void {
    if (!selected) return;
    for (const swatch of paletteBar.querySelectorAll<HTMLInputElement>('input[type=radio]')) swatch.checked = false;
    customUsed = true;
    custom!.classList.add('is-chosen');
    custom!.style.setProperty('--custom-color', input.value);
    choose(hexToColor(input.value));
  }

  paletteBar.addEventListener('input', (event) => {
    if (!selected || !(event.target instanceof HTMLInputElement)) return;
    if (event.target.type === 'color') {
      chooseCustom(event.target);
      return;
    }
    custom?.classList.remove('is-chosen');
    choose(hexToColor(event.target.value));
  });
  paletteBar.addEventListener('click', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'color' && customUsed) chooseCustom(event.target);
  });
  function cancelSelection(): void {
    clearSelection();
    status.textContent = SELECT_HINT;
  }
  cancel.addEventListener('click', cancelSelection);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && selected) cancelSelection();
  });

  const paint = (x: number, y: number, color: number) => {
    context.fillStyle = colorToHex(color);
    context.fillRect(x, y, 1, 1);
  };
  confirm.addEventListener('click', () => {
    if (!pixels || !selected || choice === null || pending || remainingCooldown() > 0) return;
    pending = { ...selected, color: choice };
    paint(pending.x, pending.y, pending.color);
    clearSelection();
    canvas.setAttribute('aria-disabled', 'true');
    status.textContent = `Placing Pixel (${pending.x}, ${pending.y})…`;
    room?.send('place', pending);
  });

  // The room for the current connection, or null while connecting or offline.
  let room: Room | null = null;

  function discardPending(): void {
    if (pending && pixels) paint(pending.x, pending.y, pixels[pending.y * canvas.width + pending.x]);
    pending = null;
  }

  function setConnection(state: 'connecting' | 'live' | 'offline', text: string): void {
    connection.dataset.state = state;
    connection.textContent = text;
  }

  /** Every message handler for one joined room. A rejoin gets a fresh room and a full snapshot. */
  function attach(joined: Room): void {
    joined.onMessage('canvas', (snapshot: CanvasSnapshot) => {
      const { width, height } = snapshot;
      pixels = decodeCanvas(snapshot.pixels, width, height);
      const resized = canvas.width !== width || canvas.height !== height;
      canvas.width = width;
      canvas.height = height;
      context.putImageData(new ImageData(colorsToRgba(pixels), width, height), 0, 0);
      if (resized) viewport.refit();
      synchronizeCooldown(snapshot);
      clearSelection();
      pending = null;
      if (!custom) paletteBar.replaceChildren(...snapshot.palette.map((hex) => {
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'place-color';
        input.value = hex;
        input.style.backgroundColor = hex;
        input.title = hex;
        input.setAttribute('aria-label', `Color ${hex}`);
        return input;
      }), custom = customSwatch());
      canvas.setAttribute('aria-disabled', 'false');
      setConnection('live', 'Live');
      status.textContent = SELECT_HINT;
    });

    joined.onMessage('placed', ({ x, y, color }: Placement) => {
      if (!pixels) return;
      pixels[y * canvas.width + x] = color;
      paint(x, y, color);
    });
    joined.onMessage('place:accepted', (message: CooldownMessage) => {
      if (!pending) return;
      status.textContent = `Placed Pixel (${pending.x}, ${pending.y}). Select another Pixel.`;
      pending = null;
      synchronizeCooldown(message);
      canvas.setAttribute('aria-disabled', 'false');
      debugPanel?.refresh();
    });
    joined.onMessage('place:rejected', (message: RejectedPlacement) => {
      if (!pending) return;
      discardPending();
      if (message.nextAllowedAt !== undefined) {
        synchronizeCooldown({ nextAllowedAt: message.nextAllowedAt, serverNow: message.serverNow });
      }
      const problem = message.reason === 'out_of_bounds' ? 'That Pixel is outside the Canvas.'
        : message.reason === 'bad_color' ? 'That color is not allowed.'
        : message.reason === 'cooldown' ? 'Your Cooldown is still active.'
        : message.reason === 'network_cap' ? 'This network has reached its Placement cap.'
        : 'Placement rejected.';
      status.textContent = `${problem} Select a Pixel to try again.`;
      canvas.setAttribute('aria-disabled', 'false');
    });
    joined.onLeave(() => {
      if (room !== joined) return;
      room = null;
      pauseWhileOffline();
      scheduleReconnect();
    });
  }

  // Placing is off until the next snapshot replaces the Canvas, including any unacknowledged Pixel.
  function pauseWhileOffline(): void {
    discardPending();
    clearSelection();
    pixels = null;
    canvas.setAttribute('aria-disabled', 'true');
    status.textContent = 'Placing is paused until Place reconnects.';
  }

  let attempt = 0;
  let joinedOnce = false;
  let connecting = false;
  let retryTimer: number | undefined;

  async function connect(): Promise<void> {
    if (connecting || room) return;
    connecting = true;
    window.clearTimeout(retryTimer);
    setConnection('connecting', joinedOnce ? 'Reconnecting…' : 'Connecting…');
    try {
      const joined = await joinPlace();
      // This page rejoins with a fresh snapshot instead of resuming the old session.
      joined.reconnection.enabled = false;
      room = joined;
      attempt = 0;
      joinedOnce = true;
      attach(joined);
    } catch (error) {
      console.error('Could not join Place', error);
      scheduleReconnect();
    } finally {
      connecting = false;
    }
  }

  function scheduleReconnect(): void {
    const delay = reconnectDelay(attempt++);
    const seconds = Math.max(1, Math.round(delay / 1_000));
    setConnection('offline', joinedOnce
      ? `Offline. Reconnecting in ${seconds}s…`
      : `Place is unreachable right now. Retrying in ${seconds}s…`);
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => void connect(), delay);
  }

  // Try straight away when the browser says the network is back.
  window.addEventListener('online', () => void connect());

  let debugPanel: { refresh(): void } | null = null;
  if (import.meta.env.DEV) {
    void import('./placeDebugPanel').then(({ mountDebugPanel }) => {
      const element = root.querySelector<HTMLElement>('[data-place-debug]');
      if (element) debugPanel = mountDebugPanel(element, { apiBaseUrl: API_BASE_URL, onCooldown: synchronizeCooldown });
    });
  }

  void connect();
}

const root = document.querySelector<HTMLElement>('[data-place]');
if (root) mountPlace(root);
