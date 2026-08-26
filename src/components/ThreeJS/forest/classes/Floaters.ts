import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
  Scene,
} from 'three';
import type { Debug } from '../../shared/runtime';

export default class Floaters {
  private readonly geometry = new BufferGeometry();
  private readonly material = new PointsMaterial({
    color: new Color('#ffe7a8'),
    size: .09,
    transparent: true,
    opacity: .82,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true,
  });
  private readonly points: Points;
  private readonly baseY: Float32Array;
  private readonly speeds: Float32Array;
  private readonly settings = {
    count: 700,
    opacity: .82,
    driftSpeed: .28,
  };

  constructor(private readonly scene: Scene, debug: Debug, maxCount = 1600) {
    const positions = new Float32Array(maxCount * 3);
    this.baseY = new Float32Array(maxCount);
    this.speeds = new Float32Array(maxCount);
    const random = seededRandom(8421);

    for (let index = 0; index < maxCount; index += 1) {
      const radius = Math.sqrt(random()) * 45;
      const angle = random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = .35 + random() * 8;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
      this.baseY[index] = positions[index * 3 + 1];
      this.speeds[index] = .55 + random() * .9;
    }

    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.setDrawRange(0, this.settings.count);
    this.points = new Points(this.geometry, this.material);
    scene.add(this.points);

    const folder = debug.ui?.addFolder('Floaters');
    folder?.add(this.settings, 'count', 100, maxCount, 1).onChange((count: number) => {
      this.geometry.setDrawRange(0, count);
    });
    folder?.add(this.material, 'size', .01, .35, .01);
    folder?.add(this.settings, 'opacity', 0, 1, .01);
    folder?.add(this.settings, 'driftSpeed', 0, 1, .01);
  }

  update(elapsed: number): void {
    const attribute = this.geometry.getAttribute('position') as BufferAttribute;
    const positions = attribute.array as Float32Array;
    for (let index = 0; index < this.settings.count; index += 1) {
      const cycle = elapsed * this.settings.driftSpeed * this.speeds[index];
      positions[index * 3 + 1] = this.baseY[index] + cycle % 3;
    }
    attribute.needsUpdate = true;
    this.material.opacity = this.settings.opacity * (.82 + Math.sin(elapsed * .75) * .18);
  }

  destroy(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = Math.imul(48271, seed) % 2147483647;
    return (seed & 2147483647) / 2147483647;
  };
}
