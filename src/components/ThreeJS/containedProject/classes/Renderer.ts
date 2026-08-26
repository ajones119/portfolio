import * as THREE from "three";
import type { Sizes } from "../../shared/runtime";
import type Camera from "./Camera";
import type Experience from "./Experience";

export default class Renderer {
  experience: Experience;
  sizes: Sizes;
  scene: THREE.Scene;
  camera: Camera;
  canvas: HTMLCanvasElement;
  instance: THREE.WebGLRenderer;
  constructor(experience: Experience) {
    this.experience = experience;
    this.sizes = experience.sizes;
    this.scene = experience.scene;
    this.camera = experience.camera;
    this.canvas = experience.canvas;
    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });

    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.CineonToneMapping;
    this.instance.toneMappingExposure = 1.75;
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
    this.instance.shadowMap.autoUpdate = true;
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
  }

  render() {
    this.instance.render(this.scene, this.camera.instance)
  }
}
