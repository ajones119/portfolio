import {
  BufferGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import type { ColorRepresentation } from 'three';

export interface RabbitParams {
  color: ColorRepresentation;
  scale?: number;
}

export default class Rabbit {
  readonly group = new Group();

  constructor({ color, scale = 1 }: RabbitParams) {
    const fur = new MeshStandardMaterial({ color, roughness: 1 });
    const paleFur = new MeshStandardMaterial({ color: '#e7ddd0', roughness: 1 });
    const eyeMaterial = new MeshStandardMaterial({ color: '#171510', roughness: .8 });

    const body = new Mesh(new SphereGeometry(.46, 8, 6), fur);
    body.scale.set(1.12, .78, .84);
    body.position.y = .52;
    this.group.add(body);

    const chest = new Mesh(new SphereGeometry(.31, 8, 6), fur);
    chest.scale.set(.82, 1.08, .82);
    chest.position.set(0, .72, -.3);
    this.group.add(chest);

    const head = new Mesh(new SphereGeometry(.32, 8, 6), fur);
    head.position.set(0, .91, -.5);
    this.group.add(head);

    for (const side of [-1, 1]) {
      const ear = new Mesh(new SphereGeometry(.16, 7, 5), fur);
      ear.scale.set(.58, 2.15, .5);
      ear.position.set(side * .14, 1.28, -.48);
      ear.rotation.z = side * -.08;
      this.group.add(ear);

      const eye = new Mesh(new SphereGeometry(.045, 6, 4), eyeMaterial);
      eye.position.set(side * .25, .98, -.68);
      this.group.add(eye);
    }

    const tail = new Mesh(new SphereGeometry(.2, 7, 5), paleFur);
    tail.position.set(0, .65, .45);
    this.group.add(tail);

    this.group.scale.setScalar(scale);
    this.group.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }

  destroy(): void {
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    this.group.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      geometries.add(child.geometry);
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }
}
