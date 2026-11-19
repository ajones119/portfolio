import { Client } from '@colyseus/sdk';
import { decodeCanvas, paletteToRgba } from '../components/Place/canvasCodec';

/** The whole Canvas as the Place room sends it on join. */
interface CanvasSnapshot {
  palette: string[];
  width: number;
  height: number;
  pixels: Uint8Array;
}

const API_BASE_URL = (import.meta.env.PUBLIC_ARAMIS_API_URL ?? 'http://localhost:4322').replace(/\/$/, '');

const canvasElement = document.querySelector<HTMLCanvasElement>('[data-place-canvas]');
const statusElement = document.querySelector<HTMLElement>('[data-place-status]');

function setStatus(state: 'connecting' | 'live' | 'offline', text: string): void {
  if (!statusElement) return;
  statusElement.dataset.state = state;
  statusElement.textContent = text;
}

function drawCanvas({ palette, width, height, pixels }: CanvasSnapshot): void {
  if (!canvasElement) return;
  const context = canvasElement.getContext('2d');
  if (!context) return;
  canvasElement.width = width;
  canvasElement.height = height;
  const rgba = paletteToRgba(decodeCanvas(pixels, width, height), palette);
  context.putImageData(new ImageData(rgba, width, height), 0, 0);
}

async function connect(): Promise<void> {
  setStatus('connecting', 'Connecting…');
  try {
    const room = await new Client(API_BASE_URL).join('place');
    room.onMessage('canvas', (snapshot: CanvasSnapshot) => {
      drawCanvas(snapshot);
      setStatus('live', 'Live');
    });
    room.onLeave(() => setStatus('offline', 'Disconnected from Place.'));
  } catch (error) {
    console.error('Could not join Place', error);
    setStatus('offline', 'Place is unreachable right now.');
  }
}

if (canvasElement) void connect();
