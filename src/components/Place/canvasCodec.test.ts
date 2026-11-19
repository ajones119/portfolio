import { describe, expect, it } from 'vitest';
import { colorsToRgba, colorToHex, decodeCanvas, EMPTY, hexToColor } from './canvasCodec';

describe('decodeCanvas', () => {
  it('reads four bytes (R, G, B, A) per Pixel, row-major; alpha 0 is an empty Pixel', () => {
    // A 3×1 Canvas: empty, a custom blue, then white, as the server sends it.
    const rgba = new Uint8Array([0, 0, 0, 0, 0x12, 0x34, 0x56, 0xff, 0xff, 0xff, 0xff, 0xff]);
    expect(Array.from(decodeCanvas(rgba, 3, 1))).toEqual([EMPTY, 0x123456, 0xffffff]);
  });

  it('decodes a full 256×256 empty Canvas', () => {
    const pixels = decodeCanvas(new Uint8Array(256 * 256 * 4), 256, 256);
    expect(pixels.length).toBe(65536);
    expect(pixels.every((color) => color === EMPTY)).toBe(true);
  });

  it('rejects a payload that does not match the Canvas size', () => {
    expect(() => decodeCanvas(new Uint8Array(10), 256, 256)).toThrow();
  });
});

describe('colorsToRgba', () => {
  it('turns painted Pixels opaque and empty ones transparent', () => {
    expect(Array.from(colorsToRgba(new Int32Array([0xe50000, EMPTY])))).toEqual([229, 0, 0, 255, 0, 0, 0, 0]);
  });
});

describe('hex colors', () => {
  it('converts between #rrggbb and 0xRRGGBB both ways', () => {
    expect(hexToColor('#E50000')).toBe(0xe50000);
    expect(hexToColor('#00d3dd')).toBe(0x00d3dd);
    expect(colorToHex(0x0000ea)).toBe('#0000ea');
  });
});
