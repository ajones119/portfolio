import Experience from "../Experience";
import { BoxGeometry, Mesh, MeshStandardMaterial, Scene } from "three";
import { COURT_SIZE, DIVIDER_DEPTH, DIVIDER_HEIGHT, DIVIDER_Y } from "./court";

export default class DividerLine {
  experience: Experience;
  scene: Scene;
  geometry: BoxGeometry;
  material: MeshStandardMaterial;
  mesh: Mesh;

  constructor(experience: Experience) {
    this.experience = experience;
    this.scene = experience.scene;

    this.geometry = new BoxGeometry(COURT_SIZE, DIVIDER_HEIGHT, DIVIDER_DEPTH);
    this.material = new MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.15,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.position.set(0, DIVIDER_Y, 0);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  destroy() {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}
