import Experience from "../Experience";
import { BoxGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, Scene } from "three";
import Environment from "./Environment";
import type { Resources } from "../../../shared/runtime";
import Floor from "./Floor";
import Fox from "./Fox";
export default class World {
  experience: Experience;
  scene: Scene;
  environment!: Environment;
  resources: Resources;
  floor!: Floor;
  fox!: Fox;
  constructor(experience: Experience) {
    this.experience = experience;
    this.scene = experience.scene;
    this.resources = experience.resources;

    this.resources.on('loaded', () => {
      // const testMesh = new Mesh(
      //   new BoxGeometry(1, 1, 1),
      //   new MeshStandardMaterial({ color: 0xff8855 })
      // );
      // testMesh.castShadow = true;
      // testMesh.receiveShadow = true;
      // this.scene.add(testMesh);

      this.environment = new Environment(this.experience);
      this.floor = new Floor(this.experience);
      this.fox = new Fox(this.experience);
    });
  }

  resize() {}

  update() {
    this.fox?.update();
  }
}
