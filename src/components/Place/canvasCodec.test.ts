import { describe, expect, it } from 'vitest';
import { decodeCanvas, paletteToRgba } from './canvasCodec';

describe('decodeCanvas', () => {
  it('unpacks two Pixels per byte, high nibble first, row-major', () => {
    // A 4×1 Canvas: Pixels 5, 12, 0, 15 packed as 0x5C, 0x0F (as the server sends them).
    const packed = new Uint8Array([0x5c, 0x0f]);
    expect(Array.from(decodeCanvas(packed, 4, 1))).toEqual([5, 12, 0, 15]);
  });

  it('decodes a full 128×128 all-white Canvas', () => {
    const pixels = decodeCanvas(new Uint8Array(8192), 128, 128);
    expect(pixels.length).toBe(16384);
    expect(pixels.every((index) => index === 0)).toBe(true);
  });

  it('rejects a payload that does not match the Canvas size', () => {
    expect(() => decodeCanvas(new Uint8Array(10), 128, 128)).toThrow();
  });
});

describe('paletteToRgba', () => {
  it('turns Pixels into RGBA bytes using the Palette', () => {
    const rgba = paletteToRgba(new Uint8Array([0, 1]), ['#FFFFFF', '#E50000']);
    expect(Array.from(rgba)).toEqual([255, 255, 255, 255, 229, 0, 0, 255]);
  });
});
