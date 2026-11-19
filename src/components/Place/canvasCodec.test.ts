import { describe, expect, it } from 'vitest';
import { colorsToRgba, colorToHex, decodeCanvas, hexToColor } from './canvasCodec';

describe('decodeCanvas', () => {
  it('reads three bytes (R, G, B) per Pixel, row-major, into 0xRRGGBB colors', () => {
    // A 2×1 Canvas: white then a custom blue, as the server sends it.
    const rgb = new Uint8Array([0xff, 0xff, 0xff, 0x12, 0x34, 0x56]);
    expect(Array.from(decodeCanvas(rgb, 2, 1))).toEqual([0xffffff, 0x123456]);
  });

  it('decodes a full 128×128 all-white Canvas', () => {
    const pixels = decodeCanvas(new Uint8Array(128 * 128 * 3).fill(0xff), 128, 128);
    expect(pixels.length).toBe(16384);
    expect(pixels.every((color) => color === 0xffffff)).toBe(true);
  });

  it('rejects a payload that does not match the Canvas size', () => {
    expect(() => decodeCanvas(new Uint8Array(10), 128, 128)).toThrow();
  });
});

describe('colorsToRgba', () => {
  it('turns Pixel colors into opaque RGBA bytes', () => {
    expect(Array.from(colorsToRgba(new Uint32Array([0xffffff, 0xe50000])))).toEqual([255, 255, 255, 255, 229, 0, 0, 255]);
  });
});

describe('hex colors', () => {
  it('converts between #rrggbb and 0xRRGGBB both ways', () => {
    expect(hexToColor('#E50000')).toBe(0xe50000);
    expect(hexToColor('#00d3dd')).toBe(0x00d3dd);
    expect(colorToHex(0x0000ea)).toBe('#0000ea');
  });
});
