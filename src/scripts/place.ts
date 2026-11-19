import { Client, MatchMakeError, type Room } from '@colyseus/sdk';
import { decodeCanvas, paletteToRgba } from '../components/Place/canvasCodec';
import { cooldownRemaining, formatCooldown, type CooldownSync } from '../components/Place/cooldown';
import { createGesture } from '../components/Place/gesture';
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

async function mountPlace(root: HTMLElement): Promise<void> {
  const surface = root.querySelector<HTMLElement>('[data-place-surface]')!;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-place-canvas]')!;
  const marker = root.querySelector<HTMLElement>('[data-place-selection]')!;
  const status = root.querySelector<HTMLElement>('[data-place-status]')!;
  const cooldownStatus = root.querySelector<HTMLElement>('[data-place-cooldown]')!;
  const panel = root.querySelector<HTMLElement>('[data-place-panel]')!;
  const paletteBar = root.querySelector<HTMLFieldSetElement>('[data-place-palette]')!;
  const confirm = root.querySelector<HTMLButtonElement>('[data-place-confirm]')!;
  const cancel = root.querySelector<HTMLButtonElement>('[data-place-cancel]')!;
  const context = canvas.getContext('2d');
  if (!context) {
    status.dataset.state = 'offline';
    status.textContent = 'This browser cannot display the Canvas.';
    return;
  }

  // Only snapshots and broadcasts change these indices. A draft lives in the
  // selection marker; an in-flight Placement paints just the canvas element.
  let pixels: Uint8Array | null = null;
  let palette: string[] = [];
  let selected: Pixel | null = null;
  let pending: Placement | null = null;
  let choice: HTMLInputElement | null = null;
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

  let room: Room;
  try {
    room = await joinPlace();
  } catch (error) {
    console.error('Could not join Place', error);
    status.dataset.state = 'offline';
    status.textContent = 'Place is unreachable right now. Reload to try again.';
    return;
  }

  function remainingCooldown(): number {
    return cooldownSync ? cooldownRemaining(cooldownSync, performance.now()) : 0;
  }

  function refreshCooldown(): void {
    const remaining = remainingCooldown();
    cooldownStatus.hidden = remaining === 0;
    cooldownStatus.textContent = remaining === 0 ? '' : `Place again in ${formatCooldown(remaining)}.`;
    confirm.disabled = !choice || pending !== null || remaining > 0;
  }

  function synchronizeCooldown({ nextAllowedAt, serverNow }: CooldownMessage): void {
    cooldownSync = { nextAllowedAt, serverNow, synchronizedAt: performance.now() };
    refreshCooldown();
  }

  const cooldownInterval = window.setInterval(refreshCooldown, 250);

  function clearSelection(): void {
    if (panel.contains(document.activeElement)) canvas.focus({ preventScroll: true });
    if (choice) choice.checked = false;
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

  paletteBar.addEventListener('change', (event) => {
    if (!selected || !(event.target instanceof HTMLInputElement)) return;
    choice = event.target;
    marker.style.backgroundColor = palette[Number(choice.value)];
    refreshCooldown();
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
    context.fillStyle = palette[color];
    context.fillRect(x, y, 1, 1);
  };
  confirm.addEventListener('click', () => {
    if (!pixels || !selected || !choice || pending || remainingCooldown() > 0) return;
    pending = { ...selected, color: Number(choice.value) };
    paint(pending.x, pending.y, pending.color);
    clearSelection();
    canvas.setAttribute('aria-disabled', 'true');
    status.textContent = `Placing Pixel (${pending.x}, ${pending.y})…`;
    room.send('place', pending);
  });

  room.onMessage('canvas', (snapshot: CanvasSnapshot) => {
    const { width, height } = snapshot;
    pixels = decodeCanvas(snapshot.pixels, width, height);
    palette = snapshot.palette;
    const resized = canvas.width !== width || canvas.height !== height;
    canvas.width = width;
    canvas.height = height;
    context.putImageData(new ImageData(paletteToRgba(pixels, palette), width, height), 0, 0);
    if (resized) viewport.refit();
    synchronizeCooldown(snapshot);
    clearSelection();
    pending = null;
    paletteBar.replaceChildren(...palette.map((hex, index) => {
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'place-color';
      input.value = String(index);
      input.style.backgroundColor = hex;
      input.title = `Palette color ${index}: ${hex}`;
      input.setAttribute('aria-label', input.title);
      return input;
    }));
    canvas.setAttribute('aria-disabled', 'false');
    status.dataset.state = 'live';
    status.textContent = SELECT_HINT;
  });

  room.onMessage('placed', ({ x, y, color }: Placement) => {
    if (!pixels) return;
    pixels[y * canvas.width + x] = color;
    paint(x, y, color);
  });
  room.onMessage('place:accepted', (message: CooldownMessage) => {
    if (!pending) return;
    status.textContent = `Placed Pixel (${pending.x}, ${pending.y}). Select another Pixel.`;
    pending = null;
    synchronizeCooldown(message);
    canvas.setAttribute('aria-disabled', 'false');
  });
  function discardPending(): void {
    if (pending && pixels) paint(pending.x, pending.y, pixels[pending.y * canvas.width + pending.x]);
    pending = null;
  }
  room.onMessage('place:rejected', (message: RejectedPlacement) => {
    if (!pending) return;
    discardPending();
    if (message.nextAllowedAt !== undefined) {
      synchronizeCooldown({ nextAllowedAt: message.nextAllowedAt, serverNow: message.serverNow });
    }
    const problem = message.reason === 'out_of_bounds' ? 'That Pixel is outside the Canvas.'
      : message.reason === 'bad_color' ? 'That color is not in the Palette.'
      : message.reason === 'cooldown' ? 'Your Cooldown is still active.'
      : message.reason === 'network_cap' ? 'This network has reached its Placement cap.'
      : 'Placement rejected.';
    status.textContent = `${problem} Select a Pixel to try again.`;
    canvas.setAttribute('aria-disabled', 'false');
  });
  function disconnect(): void {
    window.clearInterval(cooldownInterval);
    discardPending();
    clearSelection();
    pixels = null;
    canvas.setAttribute('aria-disabled', 'true');
    status.dataset.state = 'offline';
    status.textContent = 'Disconnected from Place. Reload to rejoin.';
  }
  room.onDrop(disconnect);
  room.onLeave(disconnect);
}

const root = document.querySelector<HTMLElement>('[data-place]');
if (root) void mountPlace(root);
