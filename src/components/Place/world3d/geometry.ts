import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PlantKind } from './plants';

/**
 * Procedural low-poly geometry + materials for every plant kind in the Walk view.
 *
 * Each kind is ONE merged, non-indexed BufferGeometry whose origin is the tile center at
 * ground level, fitting a ~1×1 footprint. Attributes: `position`, `normal`, `color`
 * (vertex color) and `tint` (0..1). The shader multiplies the per-instance color in by
 * `mix(1, instanceColor, tint)`, so leaves/petals/crystals (tint 1) take the Pixel color
 * while trunks, stems and daisy centers (tint ≈ 0) keep their own color.
 */

export interface PlantVisual {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

export interface PlantVisuals {
  /** Every kind except 'soil'. */
  visuals: Map<PlantKind, PlantVisual>;
  /** Drives the wind and water uniforms. */
  update(timeSec: number): void;
  /** Dispose every geometry and material. */
  dispose(): void;
}

type Vec3 = readonly [number, number, number];

interface Place {
  p?: Vec3;
  r?: Vec3;
  s?: Vec3 | number;
}

const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();

function matrix({ p = [0, 0, 0], r = [0, 0, 0], s = 1 }: Place): THREE.Matrix4 {
  const scale = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  tmpQuat.setFromEuler(tmpEuler.set(r[0], r[1], r[2]));
  return new THREE.Matrix4().compose(new THREE.Vector3(...p), tmpQuat, scale);
}

/**
 * Turn a temporary primitive into a mergeable part: non-indexed, only position/normal,
 * plus a flat vertex color and tint. Disposes the source.
 */
function part(src: THREE.BufferGeometry, color: number, tint: number, place: Place = {}): THREE.BufferGeometry {
  const g = src.index ? src.toNonIndexed() : src.clone();
  src.dispose();
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position') g.deleteAttribute(name);
  }
  g.applyMatrix4(matrix(place));
  g.computeVertexNormals();
  const count = g.getAttribute('position').count;
  const c = new THREE.Color(color);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(count).fill(tint), 1));
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error('plant geometry: mergeGeometries failed');
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

/** Deterministic PRNG so every tile of a kind shares the same (stable) layout. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const range = (r: () => number, lo: number, hi: number) => lo + (hi - lo) * r();

/**
 * Displace vertices by a hash of their position, so vertices shared between faces of a
 * non-indexed mesh move together (no cracks).
 */
function lumpy(g: THREE.BufferGeometry, amount: number, seed: number): THREE.BufferGeometry {
  const pos = g.getAttribute('position');
  const offsets = new Map<string, Vec3>();
  const r = rng(seed);
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let o = offsets.get(key);
    if (!o) {
      o = [range(r, -amount, amount), range(r, -amount, amount), range(r, -amount, amount)];
      offsets.set(key, o);
    }
    pos.setXYZ(i, pos.getX(i) + o[0], pos.getY(i) + o[1], pos.getZ(i) + o[2]);
  }
  return g;
}

/** A tapered, slightly bent blade (double-sided material), base at origin, pointing +Y. */
function blade(width: number, height: number, segments: number, bend: number): THREE.BufferGeometry {
  const verts: number[] = [];
  const at = (t: number): [number, number, number] => [(width / 2) * (1 - t), height * t, bend * t * t];
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const [w0, y0, z0] = at(t0);
    const [w1, y1, z1] = at(t1);
    if (i === segments - 1) {
      verts.push(-w0, y0, z0, w0, y0, z0, 0, y1, z1);
    } else {
      verts.push(-w0, y0, z0, w0, y0, z0, w1, y1, z1, -w0, y0, z0, w1, y1, z1, -w1, y1, z1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return g;
}

// ---------------------------------------------------------------------------------------
// Palette of untinted / lightly tinted parts.
const BARK = 0x6b4a32;
const STEM = 0x5f8a45;
const WHITE = 0xffffff;
const T_BARK = 0.15;
const T_STEM = 0.2;

function pine(): THREE.BufferGeometry {
  const parts = [part(new THREE.CylinderGeometry(0.07, 0.11, 0.8, 6), BARK, T_BARK, { p: [0, 0.4, 0] })];
  const layers: [number, number, number, number][] = [
    // radius, height, center y, shade
    [0.5, 1.2, 1.15, 0xe6efe9],
    [0.4, 1.0, 1.8, 0xf3f8f4],
    [0.28, 0.85, 2.5, WHITE],
  ];
  layers.forEach(([radius, height, y, shade], i) =>
    parts.push(part(new THREE.ConeGeometry(radius, height, 7), shade, 1, { p: [0, y, 0], r: [0, i * 0.45, 0] })),
  );
  return merge(parts);
}

function cherry(): THREE.BufferGeometry {
  const parts = [
    part(new THREE.CylinderGeometry(0.07, 0.12, 1.7, 6), BARK, T_BARK, { p: [0, 0.85, 0], r: [0, 0, 0.06] }),
    part(new THREE.CylinderGeometry(0.035, 0.05, 0.6, 5), BARK, T_BARK, { p: [0.14, 1.65, 0.02], r: [0, 0, -0.7] }),
    part(new THREE.CylinderGeometry(0.035, 0.05, 0.55, 5), BARK, T_BARK, { p: [-0.12, 1.7, -0.05], r: [0.3, 0, 0.6] }),
  ];
  const blobs: [number, number, number, number, number][] = [
    [0, 2.45, 0, 0.42, WHITE],
    [0.2, 2.15, 0.12, 0.33, 0xf6eef0],
    [-0.2, 2.2, -0.1, 0.32, 0xfaf4f5],
    [0.05, 2.1, -0.22, 0.3, 0xf0e6e8],
    [-0.1, 2.75, 0.1, 0.27, WHITE],
  ];
  blobs.forEach(([x, y, z, radius, shade], i) =>
    parts.push(part(lumpy(new THREE.IcosahedronGeometry(radius, 0), radius * 0.12, 11 + i), shade, 1, { p: [x, y, z] })),
  );
  return merge(parts);
}

function boulder(): THREE.BufferGeometry {
  return merge([
    part(lumpy(new THREE.IcosahedronGeometry(0.38, 0), 0.07, 3), WHITE, 1, { p: [0.03, 0.2, 0], s: [1.1, 0.75, 0.95] }),
    part(lumpy(new THREE.IcosahedronGeometry(0.17, 0), 0.04, 4), 0xe6e6e6, 1, { p: [-0.28, 0.08, 0.24], s: [1, 0.7, 1] }),
    part(lumpy(new THREE.IcosahedronGeometry(0.1, 0), 0.025, 5), 0xd8d8d8, 1, { p: [0.3, 0.04, -0.28] }),
  ]);
}

function spire(): THREE.BufferGeometry {
  const shards: [number, number, number, number, number, number, number][] = [
    // x, z, radius, height, tiltX, tiltZ, shade
    [0, 0, 0.24, 2.0, 0.03, -0.05, 0xffffff],
    [0.2, 0.12, 0.15, 1.2, 0.12, -0.25, 0xd9dedd],
    [-0.18, 0.1, 0.13, 0.9, 0.2, 0.28, 0xe8ecea],
    [-0.04, -0.22, 0.12, 0.7, -0.3, 0.05, 0xcfd5d3],
  ];
  const parts = shards.map(([x, z, radius, height, tx, tz, shade], i) =>
    part(lumpy(new THREE.ConeGeometry(radius, height, 5, 2), radius * 0.18, 20 + i), shade, 1, {
      p: [x, height / 2 - 0.05, z],
      r: [tx, i * 1.3, tz],
    }),
  );
  parts.push(part(lumpy(new THREE.IcosahedronGeometry(0.3, 0), 0.05, 29), 0xbfc6c4, 1, { p: [0, 0.05, 0], s: [1.2, 0.4, 1.1] }));
  return merge(parts);
}

function bush(): THREE.BufferGeometry {
  const blobs: [number, number, number, number, number][] = [
    [0, 0.32, 0, 0.32, WHITE],
    [0.2, 0.22, 0.1, 0.24, 0xeef3ef],
    [-0.2, 0.22, 0.08, 0.23, 0xf4f8f4],
    [0.02, 0.2, -0.2, 0.22, 0xe8eee9],
  ];
  return merge(
    blobs.map(([x, y, z, radius, shade], i) =>
      part(lumpy(new THREE.IcosahedronGeometry(radius, 0), radius * 0.1, 40 + i), shade, 1, { p: [x, y, z] }),
    ),
  );
}

function grass(): THREE.BufferGeometry {
  const r = rng(7);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + range(r, -0.3, 0.3);
    const d = range(r, 0.05, 0.36);
    parts.push(
      part(blade(range(r, 0.06, 0.09), range(r, 0.25, 0.45), 2, range(r, 0.04, 0.1)), i % 2 ? WHITE : 0xe9f1e6, 1, {
        p: [Math.cos(a) * d, 0, Math.sin(a) * d],
        r: [0, range(r, 0, Math.PI * 2), 0],
      }),
    );
  }
  return merge(parts); // 8 blades × 3 tris = 24 tris
}

function reeds(): THREE.BufferGeometry {
  const r = rng(13);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + range(r, -0.3, 0.3);
    const d = range(r, 0.05, 0.32);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const h = range(r, 0.8, 1.3);
    parts.push(
      part(blade(range(r, 0.05, 0.07), h, 3, range(r, 0.08, 0.18)), i % 2 ? WHITE : 0xe4efea, 1, {
        p: [x, 0, z],
        r: [0, range(r, 0, Math.PI * 2), 0],
      }),
    );
    if (i % 3 === 0) {
      // A cattail: thin stalk + brown head. Untinted so it stays brown.
      const sh = h * 0.95;
      parts.push(part(new THREE.CylinderGeometry(0.008, 0.012, sh, 3, 1, true), STEM, T_STEM, { p: [x * 0.8, sh / 2, z * 0.8] }));
      parts.push(part(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 5), 0x7a4e2e, 0, { p: [x * 0.8, sh - 0.06, z * 0.8] }));
    }
  }
  return merge(parts);
}

function wheat(): THREE.BufferGeometry {
  const r = rng(21);
  const parts: THREE.BufferGeometry[] = [];
  const spots: [number, number][] = [
    [0, 0],
    [0.24, 0.14],
    [-0.22, 0.16],
    [0.1, -0.25],
    [-0.16, -0.2],
  ];
  for (const [x, z] of spots) {
    const h = range(r, 0.7, 0.95);
    const lean = range(r, -0.08, 0.08);
    parts.push(part(blade(0.025, h, 2, 0.02), 0xe8dcb5, 0.8, { p: [x, 0, z], r: [0, range(r, 0, Math.PI), lean] }));
    parts.push(
      part(new THREE.OctahedronGeometry(1, 0), WHITE, 1, {
        p: [x - Math.sin(lean) * h, h + 0.08, z],
        r: [0, range(r, 0, Math.PI), lean],
        s: [0.045, 0.13, 0.045],
      }),
    );
    parts.push(part(blade(0.05, 0.22, 1, 0.08), 0xe8dcb5, 0.8, { p: [x, 0.15, z], r: [0, range(r, 0, Math.PI * 2), 0.5] }));
  }
  return merge(parts);
}

function lavender(): THREE.BufferGeometry {
  const r = rng(31);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + range(r, -0.3, 0.3);
    const d = range(r, 0.06, 0.3);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const h = range(r, 0.45, 0.65);
    parts.push(part(blade(0.03, h, 2, 0.03), 0x7f9470, T_STEM, { p: [x, 0, z], r: [0, range(r, 0, Math.PI), 0] }));
    parts.push(part(new THREE.OctahedronGeometry(1, 0), WHITE, 1, { p: [x, h + 0.02, z], s: [0.045, 0.13, 0.045] }));
    parts.push(part(new THREE.OctahedronGeometry(1, 0), 0xe8e0ec, 1, { p: [x, h - 0.13, z], s: [0.035, 0.07, 0.035] }));
  }
  // A silvery leafy tuft at the base.
  parts.push(part(lumpy(new THREE.IcosahedronGeometry(0.16, 0), 0.03, 39), 0x9aab8c, T_STEM, { p: [0, 0.08, 0], s: [1.4, 0.6, 1.4] }));
  return merge(parts);
}

function daisy(): THREE.BufferGeometry {
  const r = rng(41);
  const parts: THREE.BufferGeometry[] = [];
  const flowers: [number, number, number][] = [
    [0, 0, 0.32],
    [0.24, 0.16, 0.24],
    [-0.22, 0.12, 0.27],
    [0.06, -0.25, 0.2],
  ];
  for (const [x, z, h] of flowers) {
    parts.push(part(new THREE.CylinderGeometry(0.008, 0.012, h, 3, 1, true), STEM, T_STEM, { p: [x, h / 2, z] }));
    parts.push(part(blade(0.06, 0.12, 1, 0.03), STEM, T_STEM, { p: [x, 0, z], r: [0, range(r, 0, Math.PI * 2), 0.6] }));
    const tilt = range(r, -0.25, 0.25);
    const spin = range(r, 0, Math.PI);
    // Petals: a 7-point star disc, white (tinted by the Pixel color).
    const petals: number[] = [];
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const a1 = ((k + 0.5) / n) * Math.PI * 2;
      const a2 = ((k + 1) / n) * Math.PI * 2;
      const R = 0.075;
      const rr = 0.03;
      petals.push(0, 0, 0, Math.cos(a1) * R, 0, Math.sin(a1) * R, Math.cos(a0) * rr, 0, Math.sin(a0) * rr);
      petals.push(0, 0, 0, Math.cos(a2) * rr, 0, Math.sin(a2) * rr, Math.cos(a1) * R, 0, Math.sin(a1) * R);
    }
    const disc = new THREE.BufferGeometry();
    disc.setAttribute('position', new THREE.Float32BufferAttribute(petals, 3));
    parts.push(part(disc, WHITE, 1, { p: [x, h, z], r: [tilt, spin, 0] }));
    // Yellow center, untinted.
    parts.push(part(new THREE.ConeGeometry(0.03, 0.025, 6), 0xffc93c, 0, { p: [x, h + 0.008, z], r: [tilt, spin, 0] }));
  }
  return merge(parts);
}

function pumpkinBody(radius: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(radius, 10, 5).toNonIndexed();
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const k = 1 - 0.1 * (0.5 - 0.5 * Math.cos(10 * Math.atan2(z, x)));
    pos.setXYZ(i, x * k, pos.getY(i), z * k);
  }
  return g;
}

function pumpkin(): THREE.BufferGeometry {
  const parts = [
    part(pumpkinBody(0.26), WHITE, 1, { p: [0.04, 0.17, 0.02], s: [1, 0.7, 1] }),
    part(new THREE.CylinderGeometry(0.025, 0.035, 0.12, 5), 0x4f7a2c, 0, { p: [0.04, 0.38, 0.02], r: [0.2, 0, 0.15] }),
    part(pumpkinBody(0.14), 0xf2f2f2, 1, { p: [-0.27, 0.09, -0.22], s: [1, 0.72, 1] }),
    part(new THREE.CylinderGeometry(0.015, 0.02, 0.08, 5), 0x4f7a2c, 0, { p: [-0.27, 0.21, -0.22] }),
  ];
  // Vine leaves lying on the ground.
  const leaves: [number, number, number][] = [
    [0.3, 0.25, 0.4],
    [-0.3, 0.2, 2.2],
    [0.2, -0.3, 4.1],
  ];
  for (const [x, z, a] of leaves) {
    parts.push(part(new THREE.CircleGeometry(0.1, 5), 0x5d8f3a, 0.1, { p: [x, 0.02, z], r: [-Math.PI / 2 + 0.25, 0, a] }));
  }
  parts.push(part(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 3, 1, true), 0x5d8f3a, 0.1, { p: [0, 0.02, 0.05], r: [0, 0.6, Math.PI / 2] }));
  return merge(parts);
}

function mushroom(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const shrooms: [number, number, number, number][] = [
    // x, z, height, cap radius
    [0.02, 0.02, 0.32, 0.2],
    [0.25, -0.18, 0.2, 0.12],
    [-0.22, 0.2, 0.16, 0.1],
  ];
  shrooms.forEach(([x, z, h, cap], i) => {
    const tilt = (i - 1) * 0.15;
    parts.push(part(new THREE.CylinderGeometry(cap * 0.32, cap * 0.42, h, 6, 1, true), 0xf3e9d6, 0, { p: [x, h / 2, z], r: [tilt, 0, 0] }));
    const dome = new THREE.SphereGeometry(cap, 8, 2, 0, Math.PI * 2, 0, Math.PI / 2);
    parts.push(part(dome, WHITE, 1, { p: [x, h - 0.01, z], r: [tilt, 0, 0], s: [1, 0.75, 1] }));
    // Underside of the cap, untinted cream.
    parts.push(part(new THREE.CircleGeometry(cap, 8), 0xe8dcc4, 0, { p: [x, h - 0.01, z], r: [Math.PI / 2 + tilt, 0, 0] }));
  });
  // White spots on the big cap (untinted).
  const spots: Vec3[] = [
    [0.08, 0.43, 0.06],
    [-0.08, 0.44, -0.02],
    [0.02, 0.42, -0.12],
    [-0.02, 0.46, 0.1],
  ];
  for (const p of spots) {
    parts.push(part(new THREE.IcosahedronGeometry(0.025, 0), 0xfffaf0, 0, { p, s: [1, 0.5, 1] }));
  }
  return merge(parts);
}

function crystal(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    part(lumpy(new THREE.IcosahedronGeometry(0.28, 0), 0.05, 51), 0x6e6a74, 0.2, { p: [0, 0.04, 0], s: [1.3, 0.4, 1.2] }),
  ];
  const shards: [number, number, number, number, number, number, number][] = [
    // x, z, radius, prism height, tiltX, tiltZ, shade
    [0, 0, 0.11, 0.95, 0, 0, WHITE],
    [0.15, 0.08, 0.075, 0.55, 0.2, -0.45, 0xeee8ff],
    [-0.13, 0.1, 0.07, 0.45, 0.3, 0.5, 0xf6f0ff],
    [0.0, -0.16, 0.06, 0.35, -0.55, 0.1, 0xe6e0f5],
  ];
  shards.forEach(([x, z, radius, h, tx, tz, shade], i) => {
    const prism = new THREE.CylinderGeometry(radius, radius * 1.1, h, 6, 1, true);
    prism.translate(0, h / 2, 0);
    const tip = new THREE.ConeGeometry(radius, radius * 2.4, 6, 1, true);
    tip.translate(0, h + radius * 1.2, 0);
    const place: Place = { p: [x, 0, z], r: [tx, i * 0.7, tz] };
    parts.push(part(prism, shade, 1, place), part(tip, shade, 1, place));
  });
  return merge(parts);
}

function snow(): THREE.BufferGeometry {
  const parts = [
    part(new THREE.SphereGeometry(0.45, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), WHITE, 1, { s: [1, 0.32, 1] }),
    part(new THREE.SphereGeometry(0.2, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2), 0xf4f8ff, 1, { p: [0.28, 0, -0.26], s: [1, 0.4, 1] }),
  ];
  // Frosted shrub: bare twigs (untinted) capped with icy blobs (tinted).
  const twigs: [number, number, number][] = [
    [0, 0.5, 0.25],
    [2.1, 0.45, 0.35],
    [4.2, 0.4, 0.3],
  ];
  for (const [a, h, lean] of twigs) {
    parts.push(
      part(new THREE.CylinderGeometry(0.012, 0.025, h, 4), 0x5a4636, 0.05, {
        p: [Math.cos(a) * lean * h * 0.5 - 0.05, 0.1 + h / 2, Math.sin(a) * lean * h * 0.5 + 0.05],
        r: [Math.sin(a) * lean, 0, -Math.cos(a) * lean],
      }),
    );
    parts.push(
      part(new THREE.IcosahedronGeometry(0.07, 0), 0xeef6ff, 1, {
        p: [Math.cos(a) * lean * h - 0.05, 0.1 + h, Math.sin(a) * lean * h + 0.05],
      }),
    );
  }
  parts.push(part(new THREE.IcosahedronGeometry(0.12, 0), 0xf7fbff, 1, { p: [-0.05, 0.22, 0.05], s: [1, 0.7, 1] }));
  return merge(parts);
}

function sand(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const pebbles: [number, number, number, number][] = [
    [0.22, 0.18, 0.06, 0xf2eee6],
    [-0.25, -0.1, 0.045, 0xe6e0d4],
    [0.05, -0.3, 0.035, 0xfaf6ee],
  ];
  pebbles.forEach(([x, z, radius, shade], i) =>
    parts.push(part(lumpy(new THREE.IcosahedronGeometry(radius, 0), radius * 0.2, 61 + i), shade, 0.5, { p: [x, radius * 0.2, z], s: [1.2, 0.55, 1] })),
  );
  const shells: [number, number, number, number][] = [
    [-0.12, 0.25, 0.4, 0xffe9e2],
    [0.3, -0.18, 2.0, 0xfff4e6],
  ];
  for (const [x, z, a, shade] of shells) {
    // A scallop: a flattened ribbed fan.
    parts.push(part(new THREE.ConeGeometry(0.06, 0.03, 7, 1, false, 0, Math.PI * 1.2), shade, 0.25, { p: [x, 0.012, z], r: [0, a, 0] }));
  }
  // A little sand ripple ridge.
  parts.push(part(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 4, 1, true), WHITE, 1, { p: [-0.05, 0.0, 0.0], r: [0, 0.4, Math.PI / 2], s: [1, 1, 0.5] }));
  return merge(parts);
}

/** Exactly 1×1, so adjacent water tiles meet seamlessly; ripple comes from the shader. */
function water(): THREE.BufferGeometry {
  return merge([part(new THREE.PlaneGeometry(1, 1, 4, 4), WHITE, 1, { p: [0, -0.12, 0], r: [-Math.PI / 2, 0, 0] })]);
}

// ---------------------------------------------------------------------------------------
// Materials

interface MaterialOptions {
  /** Wind amplitude; offset = sway * amp * position.y². */
  wind?: number;
  /** Emissive strength, multiplied by the tinted diffuse color. */
  glow?: number;
  water?: boolean;
}

const TINT_VERTEX = THREE.ShaderChunk.color_vertex.replace(
  'vColor.rgb *= instanceColor.rgb;',
  'vColor.rgb *= mix( vec3( 1.0 ), instanceColor.rgb, tint );',
);

function makeMaterial(uTime: { value: number }, opts: MaterialOptions = {}): THREE.Material {
  const material = opts.water
    ? new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        transparent: true,
        opacity: 0.82,
        roughness: 0.25,
        metalness: 0,
      })
    : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  if (opts.glow) {
    (material as THREE.MeshLambertMaterial).emissive.setRGB(opts.glow, opts.glow, opts.glow);
  }

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    let vs = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float tint;\nuniform float uTime;')
      .replace('#include <color_vertex>', TINT_VERTEX)
      // Radial fog (distance from the camera, not view depth), so plants at the screen
      // sides fade at the same distance as straight ahead and don't pop at the plant radius.
      .replace('#include <fog_vertex>', '#ifdef USE_FOG\n\tvFogDepth = length( mvPosition.xyz );\n#endif');

    if (opts.wind) {
      vs = vs.replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 wPhase = instanceMatrix[3].xz;
          mat3 wM = mat3( instanceMatrix );
        #else
          vec2 wPhase = vec2( 0.0 );
          mat3 wM = mat3( 1.0 );
        #endif
        float wH = max( position.y, 0.0 );
        float wGust = sin( uTime * 1.7 + wPhase.x * 0.37 + wPhase.y * 0.23 )
                    + 0.35 * sin( uTime * 4.1 + wPhase.x * 1.3 - wPhase.y * 0.9 );
        vec3 wWorld = vec3( wGust, 0.0, 0.45 * wGust + 0.3 * sin( uTime * 1.3 + wPhase.y * 0.5 ) )
                    * ( ${opts.wind.toFixed(4)} * wH * wH );
        // Express the world-space offset in instance-local space (undo the random Y
        // rotation), scaled with the instance so a growing sprout sways proportionally.
        float wScale = max( length( wM[0] ), 1e-4 );
        transformed += ( transpose( wM ) * wWorld ) / wScale;`,
      );
    }

    if (opts.water) {
      vs = vs.replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vec4 wp = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        // Ripple from world position: neighbouring tiles agree at shared edges.
        transformed.y += 0.022 * ( sin( wp.x * 2.6 + uTime * 1.4 ) + sin( wp.z * 2.1 - uTime * 1.1 + wp.x * 0.8 ) );`,
      );
    }
    shader.vertexShader = vs;

    if (opts.glow) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb;',
      );
    }
  };
  material.customProgramCacheKey = () => `plant:${opts.wind ?? 0}:${opts.glow ?? 0}:${opts.water ? 1 : 0}`;
  return material;
}

// ---------------------------------------------------------------------------------------

const BUILDERS: Record<Exclude<PlantKind, 'soil'>, [() => THREE.BufferGeometry, MaterialOptions?]> = {
  snow: [snow],
  daisy: [daisy],
  boulder: [boulder],
  spire: [spire],
  reeds: [reeds, { wind: 0.1 }],
  bush: [bush],
  pine: [pine],
  grass: [grass, { wind: 0.35 }],
  water: [water, { water: true }],
  sand: [sand],
  wheat: [wheat, { wind: 0.16 }],
  pumpkin: [pumpkin],
  cherry: [cherry],
  mushroom: [mushroom],
  lavender: [lavender, { wind: 0.18 }],
  crystal: [crystal, { glow: 0.55 }],
};

export function createPlantVisuals(): PlantVisuals {
  const uTime = { value: 0 };
  const visuals = new Map<PlantKind, PlantVisual>();
  // Kinds without special shading share one material.
  const shared = makeMaterial(uTime);
  for (const [kind, [build, opts]] of Object.entries(BUILDERS) as [PlantKind, [() => THREE.BufferGeometry, MaterialOptions?]][]) {
    visuals.set(kind, { geometry: build(), material: opts ? makeMaterial(uTime, opts) : shared });
  }
  return {
    visuals,
    update(timeSec: number) {
      uTime.value = timeSec;
    },
    dispose() {
      const materials = new Set<THREE.Material>();
      for (const { geometry, material } of visuals.values()) {
        geometry.dispose();
        materials.add(material);
      }
      for (const m of materials) m.dispose();
      visuals.clear();
    },
  };
}
