import Experience from "../Experience";
import type { Resources } from "../../../shared/runtime";
import { DoubleSide, Mesh, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, Scene, SRGBColorSpace, Texture } from "three";

export default class Floor {
  experience: Experience;
  scene: Scene;
  resources: Resources;
  floor!: Mesh;
  geometry!: PlaneGeometry;
  material!: MeshStandardMaterial;
  textures!: {
    colorTexture: Texture;
    normalTexture: Texture;
  }
  constructor(experience: Experience) {
    this.experience = experience;
    this.scene = experience.scene;
    this.resources = experience.resources;

    this.setTexture();
    this.setGeometry();
    this.setMaterial();
    this.setMesh();
  }

  setGeometry() {
    this.geometry = new PlaneGeometry(10, 10);
  }

  setMaterial() {
    this.material = new MeshStandardMaterial({ map: this.textures.colorTexture, normalMap: this.textures.normalTexture, side: DoubleSide });
  }

  setMesh() {
    this.floor = new Mesh(this.geometry, this.material);
    this.floor.rotation.x = -Math.PI * 0.5;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
  }

  setTexture() {
    this.textures = {
      colorTexture: this.resources.get<Texture>("grassColorTexture"),
      normalTexture: this.resources.get<Texture>("grassNormalTexture"),
    };
    this.textures.colorTexture.colorSpace = SRGBColorSpace;
    this.textures.colorTexture.repeat.set(1.5, 1.5);
    this.textures.colorTexture.wrapS = RepeatWrapping;
    this.textures.colorTexture.wrapT = RepeatWrapping;
    this.textures.normalTexture.repeat.set(1.5, 1.5);
    this.textures.normalTexture.wrapS = RepeatWrapping;
    this.textures.normalTexture.wrapT = RepeatWrapping;
  }
}
