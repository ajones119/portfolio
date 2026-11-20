import * as THREE from 'three';
import { PLANT_KINDS, plantForColor, type PlantKind } from './plants';
import type { PlantVisuals } from './geometry';

/** Plants are only built within this many tiles of the player; fog hides the edge. */
export const PLANT_RADIUS = 64;
/** Rebuild the instance lists once the player has walked this far from the last rebuild. */
const REBUILD_DISTANCE = 6;
const GROW_SECONDS = 0.55;
const SHRINK_SECONDS = 0.25;
const CASTS_SHADOW = new Set<PlantKind>(['pine', 'cherry', 'boulder', 'spire', 'crystal', 'bush']);

/** A cheap, stable per-tile hash in [0, 1). */
function hash(tile: number, salt: number): number {
  let h = Math.imul(tile ^ (salt * 0x9e3779b9), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Overshoots a little, so plants pop as they grow. */
function easeOutBack(t: number): number {
  const c = 1.6;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}

interface KindMesh {
  mesh: THREE.InstancedMesh;
  tiles: number[];
  /** The slots changed this frame, uploaded as one range instead of the whole buffer. */
  dirtyMin: number;
  dirtyMax: number;
}

export interface PlantField {
  group: THREE.Group;
  /** Grow every plant in a ripple outward from a tile, starting at `startAt` seconds. */
  ripple(fromX: number, fromY: number, startAt: number, tilesPerSecond: number): void;
  /** Show every plant fully grown at once. */
  growAll(): void;
  /** A Pixel changed: its old plant shrinks away, then the new one grows. */
  setPixel(x: number, y: number, color: number, now: number): void;
  update(playerX: number, playerZ: number, now: number): void;
  dispose(): void;
}

/**
 * One InstancedMesh per plant kind, holding just the tiles near the player.
 * Each tile remembers the color it shows (which lags behind the Canvas while
 * an old plant shrinks away) and when its grow or shrink animation started.
 */
export function createPlantField(
  pixels: Int32Array,
  width: number,
  height: number,
  visuals: PlantVisuals,
  { shadows }: { shadows: boolean },
): PlantField {
  const tileCount = width * height;
  const shown = Int32Array.from(pixels);
  const target = Int32Array.from(pixels);
  /** When the current animation started, in seconds; -Infinity means settled. */
  const animStart = new Float64Array(tileCount).fill(-Infinity);
  /** +1 growing, -1 shrinking. */
  const animDir = new Int8Array(tileCount).fill(1);
  const animating = new Set<number>();
  const slotOf = new Int32Array(tileCount).fill(-1);

  const maxTiles = Math.min(tileCount, Math.ceil(Math.PI * (PLANT_RADIUS + REBUILD_DISTANCE + 2) ** 2));
  const group = new THREE.Group();
  const meshes = new Map<PlantKind, KindMesh>();
  for (const kind of PLANT_KINDS) {
    const visual = visuals.visuals.get(kind);
    if (!visual) continue;
    const mesh = new THREE.InstancedMesh(visual.geometry, visual.material, maxTiles);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, new THREE.Color());
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = shadows && CASTS_SHADOW.has(kind);
    mesh.receiveShadow = shadows;
    group.add(mesh);
    meshes.set(kind, { mesh, tiles: [], dirtyMin: Infinity, dirtyMax: -1 });
  }

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();

  function growth(tile: number, now: number): number {
    const start = animStart[tile];
    if (animDir[tile] > 0) {
      if (start === -Infinity) return 1;
      const t = (now - start) / GROW_SECONDS;
      return t <= 0 ? 0 : t >= 1 ? 1 : easeOutBack(t);
    }
    const t = (now - start) / SHRINK_SECONDS;
    return t <= 0 ? 1 : t >= 1 ? 0 : 1 - t * t;
  }

  function compose(tile: number, kind: PlantKind, grow: number): THREE.Matrix4 {
    const x = tile % width;
    const y = (tile - x) / width;
    const g = Math.max(grow, 0.0001);
    if (kind === 'water') {
      // Water tiles must line up edge to edge, so no jitter or turning. It rests just above the ground.
      position.set(x + 0.5, 0.17, y + 0.5);
      rotation.identity();
      scale.set(g, 1, g);
    } else {
      position.set(x + 0.5 + (hash(tile, 1) - 0.5) * 0.2, 0, y + 0.5 + (hash(tile, 2) - 0.5) * 0.2);
      rotation.setFromAxisAngle(up, hash(tile, 3) * Math.PI * 2);
      const s = (0.85 + hash(tile, 4) * 0.3) * g;
      scale.set(s, s, s);
    }
    return matrix.compose(position, rotation, scale);
  }

  let center = { x: Number.NaN, z: Number.NaN };
  let dirty = true;

  function rebuild(px: number, pz: number, now: number): void {
    center = { x: px, z: pz };
    dirty = false;
    for (const entry of meshes.values()) entry.tiles.length = 0;
    slotOf.fill(-1);
    const r = PLANT_RADIUS;
    const cx = Math.floor(px);
    const cy = Math.floor(pz);
    for (let y = Math.max(0, cy - r); y <= Math.min(height - 1, cy + r); y += 1) {
      for (let x = Math.max(0, cx - r); x <= Math.min(width - 1, cx + r); x += 1) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
        const tile = y * width + x;
        const entry = meshes.get(plantForColor(shown[tile]).kind);
        if (!entry) continue;
        slotOf[tile] = entry.tiles.length;
        entry.tiles.push(tile);
      }
    }
    for (const [kind, { mesh, tiles }] of meshes) {
      tiles.forEach((tile, slot) => {
        mesh.setMatrixAt(slot, compose(tile, kind, growth(tile, now)));
        mesh.setColorAt(slot, color.setHex(shown[tile]));
      });
      mesh.count = tiles.length;
      for (const attribute of [mesh.instanceMatrix, mesh.instanceColor]) {
        if (!attribute) continue;
        attribute.clearUpdateRanges();
        attribute.addUpdateRange(0, Math.max(tiles.length, 1) * attribute.itemSize);
        attribute.needsUpdate = true;
      }
    }
  }

  function refreshTile(tile: number, now: number): void {
    const slot = slotOf[tile];
    if (slot < 0) return;
    const kind = plantForColor(shown[tile]).kind;
    const entry = meshes.get(kind);
    if (!entry) return;
    entry.mesh.setMatrixAt(slot, compose(tile, kind, growth(tile, now)));
    entry.dirtyMin = Math.min(entry.dirtyMin, slot);
    entry.dirtyMax = Math.max(entry.dirtyMax, slot);
  }

  function flush(): void {
    for (const entry of meshes.values()) {
      if (entry.dirtyMax < 0) continue;
      const matrices = entry.mesh.instanceMatrix;
      matrices.addUpdateRange(entry.dirtyMin * 16, (entry.dirtyMax - entry.dirtyMin + 1) * 16);
      matrices.needsUpdate = true;
      entry.dirtyMin = Infinity;
      entry.dirtyMax = -1;
    }
  }

  function startGrowing(tile: number, at: number): void {
    animDir[tile] = 1;
    animStart[tile] = at;
    animating.add(tile);
  }

  return {
    group,
    ripple(fromX, fromY, startAt, tilesPerSecond) {
      for (let tile = 0; tile < tileCount; tile += 1) {
        const x = tile % width;
        const y = (tile - x) / width;
        const distance = Math.hypot(x - fromX, y - fromY);
        // Tiles far beyond the plant radius are grown before the player can reach them.
        if (distance > PLANT_RADIUS + REBUILD_DISTANCE) continue;
        startGrowing(tile, startAt + distance / tilesPerSecond + hash(tile, 5) * 0.08);
      }
      dirty = true;
    },
    growAll() {
      animStart.fill(-Infinity);
      animDir.fill(1);
      animating.clear();
      dirty = true;
    },
    setPixel(x, y, next, now) {
      const tile = y * width + x;
      if (target[tile] === next) return;
      target[tile] = next;
      const before = plantForColor(shown[tile]).kind;
      const after = plantForColor(next).kind;
      if (before === after || before === 'soil') {
        // Same plant, new tint (or nothing to shrink): swap now and pop it back in.
        shown[tile] = next;
        startGrowing(tile, now);
        dirty = true;
        return;
      }
      animDir[tile] = -1;
      animStart[tile] = now;
      animating.add(tile);
    },
    update(px, pz, now) {
      if (dirty || Math.hypot(px - center.x, pz - center.z) > REBUILD_DISTANCE) rebuild(px, pz, now);
      for (const tile of animating) {
        if (animDir[tile] < 0 && now - animStart[tile] >= SHRINK_SECONDS) {
          // The old plant is gone; plant the new one in its place.
          shown[tile] = target[tile];
          startGrowing(tile, now);
          dirty = true;
          continue;
        }
        if (animDir[tile] > 0 && now - animStart[tile] >= GROW_SECONDS) {
          animStart[tile] = -Infinity;
          animating.delete(tile);
        }
        if (!dirty) refreshTile(tile, now);
      }
      if (dirty) rebuild(px, pz, now);
      flush();
    },
    dispose() {
      for (const { mesh } of meshes.values()) mesh.dispose();
      visuals.dispose();
    },
  };
}
