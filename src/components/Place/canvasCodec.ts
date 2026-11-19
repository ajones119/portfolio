/**
 * Unpacks the Canvas the Place room sends: 4-bit Palette indices, two Pixels per
 * byte (high nibble first), row-major. Returns one Palette index per Pixel.
 */
export function decodeCanvas(packed: Uint8Array, width: number, height: number): Uint8Array {
  const pixelCount = width * height;
  if (packed.byteLength !== Math.ceil(pixelCount / 2)) {
    throw new Error(`Canvas payload is ${packed.byteLength} bytes; expected ${Math.ceil(pixelCount / 2)} for ${width}×${height}.`);
  }
  const pixels = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    const byte = packed[index >> 1];
    pixels[index] = index % 2 === 0 ? byte >> 4 : byte & 0x0f;
  }
  return pixels;
}

/** Converts Pixels (Palette indices) into RGBA bytes ready for `ImageData`. */
export function paletteToRgba(pixels: Uint8Array, palette: readonly string[]): Uint8ClampedArray<ArrayBuffer> {
  const colors = palette.map(hexToRgb);
  const rgba = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((paletteIndex, pixel) => {
    const [r, g, b] = colors[paletteIndex] ?? colors[0];
    rgba.set([r, g, b, 255], pixel * 4);
  });
  return rgba;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}
