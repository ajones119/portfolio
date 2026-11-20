import { EMPTY } from '../canvasCodec';

/** What grows on a tile in the 3D Walk view. Pure data: no three.js here. */
export type PlantKind =
  | 'snow'
  | 'daisy'
  | 'boulder'
  | 'spire'
  | 'reeds'
  | 'bush'
  | 'pine'
  | 'grass'
  | 'water'
  | 'sand'
  | 'wheat'
  | 'pumpkin'
  | 'cherry'
  | 'mushroom'
  | 'lavender'
  | 'crystal'
  | 'soil';

export const PLANT_KINDS: readonly PlantKind[] = [
  'snow',
  'daisy',
  'boulder',
  'spire',
  'reeds',
  'bush',
  'pine',
  'grass',
  'water',
  'sand',
  'wheat',
  'pumpkin',
  'cherry',
  'mushroom',
  'lavender',
  'crystal',
  'soil',
];

export interface PlantInfo {
  kind: PlantKind;
  /** The player can't walk through this tile. */
  blocks: boolean;
  /** Walking through this tile is slower. */
  slows: boolean;
  /** The plant sways in the wind (vertex shader). */
  sways: boolean;
}

/** The 16 palette colors, in palette order, and the plant each one grows. */
export const PALETTE_PLANTS: readonly { hex: string; kind: PlantKind }[] = [
  { hex: '#FFFFFF', kind: 'snow' },
  { hex: '#D9E6E3', kind: 'daisy' },
  { hex: '#808080', kind: 'boulder' },
  { hex: '#1E2B2A', kind: 'spire' },
  { hex: '#9BE3D2', kind: 'reeds' },
  { hex: '#4A9D9D', kind: 'bush' },
  { hex: '#336666', kind: 'pine' },
  { hex: '#99CC99', kind: 'grass' },
  { hex: '#7FA7C9', kind: 'water' },
  { hex: '#FFCC99', kind: 'sand' },
  { hex: '#E9B872', kind: 'wheat' },
  { hex: '#FF9966', kind: 'pumpkin' },
  { hex: '#E58C8C', kind: 'cherry' },
  { hex: '#B5524F', kind: 'mushroom' },
  { hex: '#996699', kind: 'lavender' },
  { hex: '#5B3F6E', kind: 'crystal' },
];

const BLOCKING: ReadonlySet<PlantKind> = new Set<PlantKind>(['boulder', 'spire', 'pine', 'cherry', 'crystal']);
const SLOWING: ReadonlySet<PlantKind> = new Set<PlantKind>(['water']);
const SWAYING: ReadonlySet<PlantKind> = new Set<PlantKind>(['reeds', 'grass', 'wheat', 'lavender']);

type Lab = readonly [number, number, number];

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** 0xRRGGBB → OKLab (Björn Ottosson's matrices). */
function toOklab(color: number): Lab {
  const r = srgbToLinear((color >> 16) & 0xff);
  const g = srgbToLinear((color >> 8) & 0xff);
  const b = srgbToLinear(color & 0xff);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const PALETTE_LAB: readonly Lab[] = PALETTE_PLANTS.map(({ hex }) => toOklab(parseInt(hex.slice(1), 16)));

/** Index into PALETTE_PLANTS of the perceptually nearest (OKLab) palette color. */
export function nearestPaletteIndex(color: number): number {
  const [L, A, B] = toOklab(color & 0xffffff);
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < PALETTE_LAB.length; i++) {
    const [l, a, b] = PALETTE_LAB[i];
    const dist = (L - l) ** 2 + (A - a) ** 2 + (B - b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function infoFor(kind: PlantKind): PlantInfo {
  return { kind, blocks: BLOCKING.has(kind), slows: SLOWING.has(kind), sways: SWAYING.has(kind) };
}

const SOIL: PlantInfo = Object.freeze(infoFor('soil'));
const cache = new Map<number, PlantInfo>();

/** The plant for a Pixel color (EMPTY → bare soil). Memoized: called per tile, every frame. */
export function plantForColor(color: number): PlantInfo {
  if (color === EMPTY) return SOIL;
  let info = cache.get(color);
  if (!info) {
    info = Object.freeze(infoFor(PALETTE_PLANTS[nearestPaletteIndex(color)].kind));
    cache.set(color, info);
  }
  return info;
}
