/** A Pixel nobody has painted. It is drawn transparent, so the page shows through. */
export const EMPTY = -1;

/**
 * Reads the Canvas the Place room sends: four bytes (R, G, B, A) per Pixel,
 * row-major, alpha 0 for an empty Pixel. Returns one color per Pixel: a 24-bit
 * 0xRRGGBB, or EMPTY.
 */
export function decodeCanvas(rgba: Uint8Array, width: number, height: number): Int32Array {
  const pixelCount = width * height;
  if (rgba.byteLength !== pixelCount * 4) {
    throw new Error(`Canvas payload is ${rgba.byteLength} bytes; expected ${pixelCount * 4} for ${width}×${height}.`);
  }
  const pixels = new Int32Array(pixelCount);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const i = pixel * 4;
    pixels[pixel] = rgba[i + 3] === 0 ? EMPTY : (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
  }
  return pixels;
}

/** Converts Pixel colors into RGBA bytes ready for `ImageData`; empty Pixels are transparent. */
export function colorsToRgba(pixels: Int32Array): Uint8ClampedArray<ArrayBuffer> {
  const rgba = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((color, pixel) => {
    if (color !== EMPTY) rgba.set([color >> 16, (color >> 8) & 0xff, color & 0xff, 255], pixel * 4);
  });
  return rgba;
}

/** `#rrggbb` (any case) to a 24-bit color. */
export function hexToColor(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

/** A 24-bit color to `#rrggbb`, the form `<input type="color">` and canvas styles use. */
export function colorToHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
