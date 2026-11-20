import { describe, expect, it } from 'vitest';
import { EMPTY } from '../canvasCodec';
import { nearestPaletteIndex, PALETTE_PLANTS, PLANT_KINDS, plantForColor } from './plants';

const hex = (h: string) => parseInt(h.replace('#', ''), 16);

describe('PALETTE_PLANTS', () => {
  it('has the 16 palette colors, each growing a distinct non-soil plant', () => {
    expect(PALETTE_PLANTS).toHaveLength(16);
    const kinds = PALETTE_PLANTS.map((p) => p.kind);
    expect(new Set(kinds).size).toBe(16);
    expect(kinds).not.toContain('soil');
    expect([...kinds, 'soil'].sort()).toEqual([...PLANT_KINDS].sort());
  });
});

describe('plantForColor', () => {
  it.each(PALETTE_PLANTS.map((p, i) => [p.hex, p.kind, i] as const))('%s grows %s', (h, kind, i) => {
    expect(nearestPaletteIndex(hex(h))).toBe(i);
    expect(plantForColor(hex(h)).kind).toBe(kind);
  });

  it('maps an EMPTY Pixel to bare soil that neither blocks, slows nor sways', () => {
    expect(plantForColor(EMPTY)).toEqual({ kind: 'soil', blocks: false, slows: false, sways: false });
  });

  it('snaps off-palette custom colors to the perceptually nearest palette entry', () => {
    expect(['grass', 'bush']).toContain(plantForColor(0x00ff00).kind);
    expect(plantForColor(0x000000).kind).toBe('spire');
    expect(plantForColor(0xfefefe).kind).toBe('snow');
    expect(plantForColor(0x7f7f7f).kind).toBe('boulder');
    expect(plantForColor(0x4f2f6f).kind).toBe('crystal');
    expect(plantForColor(0x80a8cc).kind).toBe('water');
    expect(plantForColor(0xff9a60).kind).toBe('pumpkin');
  });

  it('flags blocking, slowing and swaying plants', () => {
    const flags = (kind: string) => {
      const p = PALETTE_PLANTS.find((e) => e.kind === kind)!;
      const { blocks, slows, sways } = plantForColor(hex(p.hex));
      return { blocks, slows, sways };
    };
    for (const kind of ['boulder', 'spire', 'pine', 'cherry', 'crystal']) {
      expect(flags(kind)).toEqual({ blocks: true, slows: false, sways: false });
    }
    expect(flags('water')).toEqual({ blocks: false, slows: true, sways: false });
    for (const kind of ['reeds', 'grass', 'wheat', 'lavender']) {
      expect(flags(kind)).toEqual({ blocks: false, slows: false, sways: true });
    }
    for (const kind of ['snow', 'daisy', 'bush', 'sand', 'pumpkin', 'mushroom']) {
      expect(flags(kind)).toEqual({ blocks: false, slows: false, sways: false });
    }
  });

  it('memoizes: the same color returns the same object', () => {
    expect(plantForColor(0x123456)).toBe(plantForColor(0x123456));
  });
});
