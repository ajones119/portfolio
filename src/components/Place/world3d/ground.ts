import * as THREE from 'three';
import { EMPTY } from '../canvasCodec';

/** Unpainted Pixels read as bare, unplanted soil. */
export const SOIL_COLOR = 0x6b5442;
const OUTSIDE_COLOR = 0x4a3b2f;

export interface Ground {
  group: THREE.Group;
  /** Repaint one Pixel's tile. */
  setPixel(x: number, y: number, color: number): void;
  /** 1 draws the ground unlit, exactly like the 2D Canvas; 0 is fully lit. Used to blend in and out of 3D. */
  setFlat(amount: number): void;
  dispose(): void;
}

/**
 * The whole Canvas as one flat plane, one texel per Pixel, so the artwork stays
 * legible to the horizon. Pixel (x, y) covers world X in [x, x+1] and Z in [y, y+1].
 */
export function createGround(pixels: Int32Array, width: number, height: number): Ground {
  const data = new Uint8Array(width * height * 4);
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;

  // Row 0 of a DataTexture is v = 0, which the rotated plane puts at the south edge, so rows are stored flipped.
  const write = (x: number, y: number, color: number) => {
    const c = color === EMPTY ? SOIL_COLOR : color;
    data.set([c >> 16, (c >> 8) & 0xff, c & 0xff, 255], ((height - 1 - y) * width + x) * 4);
  };
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) write(x, y, pixels[y * width + x]);
  texture.needsUpdate = true;

  const flat = { value: 1 };
  // Fog by true distance, not view depth, so it doesn't creep in at the sides of a wide view.
  // The ground fogs at 0.6× the rate plants do, so the artwork stays legible well past the plants.
  const radialFog = (shader: { vertexShader: string }) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <fog_vertex>',
      '#ifdef USE_FOG\n  vFogDepth = 0.6 * length(mvPosition.xyz);\n#endif',
    );
  };
  const material = new THREE.MeshLambertMaterial({ map: texture });
  material.onBeforeCompile = (shader) => {
    radialFog(shader);
    shader.uniforms.uFlat = flat;
    shader.uniforms.uGrid = { value: new THREE.Vector2(width, height) };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uFlat;\nuniform vec2 uGrid;\nvoid main() {')
      // A faint furrow between tiles, so blank areas read as plots waiting to be planted.
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 cell = fract(vMapUv * uGrid);
        float edge = min(min(cell.x, 1.0 - cell.x), min(cell.y, 1.0 - cell.y));
        float furrow = mix(0.86, 1.0, smoothstep(0.0, 0.06, edge));
        vec3 flatColor = diffuseColor.rgb;
        diffuseColor.rgb *= mix(furrow, 1.0, uFlat);`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, flatColor, uFlat);`);
  };

  // Fog is by distance per vertex, which only interpolates correctly across small triangles, so subdivide.
  const plane = new THREE.PlaneGeometry(width, height, Math.ceil(width / 4), Math.ceil(height / 4));
  plane.rotateX(-Math.PI / 2);
  plane.translate(width / 2, 0, height / 2);
  const mesh = new THREE.Mesh(plane, material);
  mesh.receiveShadow = true;

  // Earth beyond the Canvas edge, so the horizon isn't a cliff into the sky.
  const outsideGeometry = new THREE.PlaneGeometry(width + 2000, height + 2000, 160, 160);
  outsideGeometry.rotateX(-Math.PI / 2);
  outsideGeometry.translate(width / 2, -0.02, height / 2);
  const outsideMaterial = new THREE.MeshLambertMaterial({ color: OUTSIDE_COLOR });
  outsideMaterial.onBeforeCompile = radialFog;
  const outside = new THREE.Mesh(outsideGeometry, outsideMaterial);
  outside.receiveShadow = true;

  const group = new THREE.Group();
  group.add(mesh, outside);

  return {
    group,
    setPixel(x, y, color) {
      write(x, y, color);
      texture.needsUpdate = true;
    },
    setFlat(amount) {
      flat.value = amount;
      outsideMaterial.opacity = 1 - amount;
      outsideMaterial.transparent = amount > 0;
    },
    dispose() {
      plane.dispose();
      outsideGeometry.dispose();
      material.dispose();
      outsideMaterial.dispose();
      texture.dispose();
    },
  };
}
