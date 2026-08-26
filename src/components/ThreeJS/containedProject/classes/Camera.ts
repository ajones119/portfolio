import type Experience from "./Experience";
import type { Sizes } from "../../shared/runtime";
import { PerspectiveCamera, Scene } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default class instancCamera {
  experience: Experience;
  sizes: Sizes;
  scene: Scene;
  canvas: HTMLCanvasElement;
  instance: PerspectiveCamera;
  controls: OrbitControls;
  constructor(experience: Experience) {
    this.experience = experience;
    this.sizes = experience.sizes;
    this.scene = experience.scene;
    this.canvas = experience.canvas;
    this.instance = new PerspectiveCamera(65, this.sizes.width / this.sizes.height, 0.1, 100);
    this.controls = new OrbitControls(this.instance, this.canvas);

    this.setInstance();
    this.setControls();
  }

  setInstance() {
    this.instance = new PerspectiveCamera(35, this.sizes.width / this.sizes.height, 0.1, 100);
    this.instance.position.set(6, 4, 8);
    this.scene.add(this.instance);
  }

  setControls() {
    this.controls = new OrbitControls(this.instance, this.canvas)
    this.controls.enableDamping = true
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update() {
    this.controls.update();
  }
}
