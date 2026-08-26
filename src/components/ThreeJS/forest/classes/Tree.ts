import {
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  Material,
  MeshStandardMaterial,
} from 'three';
import type { ColorRepresentation } from 'three';

export interface TreeParams {
  trunkHeight: number;
  trunkRadius: number;
  canopyHeight: number;
  canopyRadius: number;
  trunkColor: ColorRepresentation;
  foliageColor: ColorRepresentation;
}

export default class Tree {
  readonly group = new Group();

  constructor(params: TreeParams) {
    const trunkMaterial = new MeshStandardMaterial({ color: params.trunkColor, roughness: 1 });
    const foliageMaterial = new MeshStandardMaterial({ color: params.foliageColor, roughness: .92 });
    const trunk = new Mesh(
      new CylinderGeometry(params.trunkRadius * .78, params.trunkRadius, params.trunkHeight, 7),
      trunkMaterial,
    );
    trunk.position.y = params.trunkHeight * .5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.group.add(trunk);

    const canopyBase = params.trunkHeight * .68;
    for (let layer = 0; layer < 3; layer += 1) {
      const scale = 1 - layer * .19;
      const canopy = new Mesh(
        new ConeGeometry(params.canopyRadius * scale, params.canopyHeight * .58, 8),
        foliageMaterial,
      );
      canopy.position.y = canopyBase + layer * params.canopyHeight * .25;
      canopy.rotation.y = layer * .7;
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      this.group.add(canopy);
    }
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
