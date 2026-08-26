import { Color, Group, MathUtils, Scene } from 'three';
import type { Debug } from '../../shared/runtime';
import Tree from './Tree';

export interface TrunkCollider {
  x: number;
  z: number;
  radius: number;
}

const CLEARING = { x: 0, z: 34, radius: 7 };

export default class Forest {
  readonly trunks: TrunkCollider[] = [];
  private group = new Group();
  private trees: Tree[] = [];
  private settings = {
    seed: 119,
    density: 115,
    trunkHeight: 5.6,
    trunkRadius: .42,
    canopyHeight: 6.8,
    canopyRadius: 2.7,
    sizeVariation: .34,
    trunkColor: '#60452f',
    foliageColor: '#274f35',
  };

  constructor(private readonly scene: Scene, debug: Debug) {
    scene.add(this.group);
    this.build();
    this.setupDebug(debug);
  }

  rebuild = (): void => {
    this.trees.forEach((tree) => tree.destroy());
    this.scene.remove(this.group);
    this.group = new Group();
    this.trees = [];
    this.trunks.length = 0;
    this.scene.add(this.group);
    this.build();
  };

  destroy(): void {
    this.trees.forEach((tree) => tree.destroy());
    this.scene.remove(this.group);
  }

  private build(): void {
    const random = mulberry32(this.settings.seed);
    const baseFoliage = new Color(this.settings.foliageColor);

    for (let index = 0; index < this.settings.density; index += 1) {
      let x = 0;
      let z = 0;
      let attempts = 0;
      do {
        const radius = Math.sqrt(random()) * 45;
        const angle = random() * Math.PI * 2;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        attempts += 1;
      } while (attempts < 30 && Math.hypot(x - CLEARING.x, z - CLEARING.z) < CLEARING.radius);

      const scale = 1 + (random() * 2 - 1) * this.settings.sizeVariation;
      const foliage = baseFoliage.clone().offsetHSL((random() - .5) * .035, 0, (random() - .5) * .08);
      const tree = new Tree({
        trunkHeight: this.settings.trunkHeight * scale,
        trunkRadius: this.settings.trunkRadius * MathUtils.lerp(.82, 1.12, random()) * scale,
        canopyHeight: this.settings.canopyHeight * scale,
        canopyRadius: this.settings.canopyRadius * MathUtils.lerp(.84, 1.13, random()) * scale,
        trunkColor: this.settings.trunkColor,
        foliageColor: foliage,
      });
      tree.group.position.set(x, 0, z);
      tree.group.rotation.y = random() * Math.PI * 2;
      this.group.add(tree.group);
      this.trees.push(tree);
      this.trunks.push({ x, z, radius: this.settings.trunkRadius * scale });
    }
  }

  private setupDebug(debug: Debug): void {
    const folder = debug.ui?.addFolder('Forest');
    folder?.add(this.settings, 'seed', 1, 9999, 1).onFinishChange(this.rebuild);
    folder?.add(this.settings, 'density', 20, 220, 1).onFinishChange(this.rebuild);
    folder?.add(this.settings, 'trunkHeight', 2, 10, .1).onFinishChange(this.rebuild);
    folder?.add(this.settings, 'trunkRadius', .15, 1, .01).onFinishChange(this.rebuild);
    folder?.add(this.settings, 'canopyHeight', 2, 12, .1).onFinishChange(this.rebuild);
    folder?.add(this.settings, 'canopyRadius', 1, 5, .1).onFinishChange(this.rebuild);
    folder?.add(this.settings, 'sizeVariation', 0, .7, .01).onFinishChange(this.rebuild);
    folder?.addColor(this.settings, 'trunkColor').onFinishChange(this.rebuild);
    folder?.addColor(this.settings, 'foliageColor').onFinishChange(this.rebuild);
  }
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
