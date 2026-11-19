/**
 * Reads the Canvas the Place room sends: three bytes (R, G, B) per Pixel,
 * row-major. Returns one 24-bit color (0xRRGGBB) per Pixel.
 */
export function decodeCanvas(rgb: Uint8Array, width: number, height: number): Uint32Array {
  const pixelCount = width * height;
  if (rgb.byteLength !== pixelCount * 3) {
    throw new Error(`Canvas payload is ${rgb.byteLength} bytes; expected ${pixelCount * 3} for ${width}×${height}.`);
  }
  const pixels = new Uint32Array(pixelCount);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const i = pixel * 3;
    pixels[pixel] = (rgb[i] << 16) | (rgb[i + 1] << 8) | rgb[i + 2];
  }
  return pixels;
}

/** Converts Pixel colors into RGBA bytes ready for `ImageData`. */
export function colorsToRgba(pixels: Uint32Array): Uint8ClampedArray<ArrayBuffer> {
  const rgba = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((color, pixel) => {
    rgba.set([color >> 16, (color >> 8) & 0xff, color & 0xff, 255], pixel * 4);
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
