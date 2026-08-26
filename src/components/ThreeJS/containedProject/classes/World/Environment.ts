import Experience from "../Experience";
import { AmbientLight, CubeTexture, DirectionalLight, Scene } from "three";
import type { Resources } from "../../../shared/runtime";
import * as THREE from "three";

export default class Environment {
  experience: Experience;
  scene: Scene;
  resources: Resources;
  sunLight!: DirectionalLight;
  ambientLight!: AmbientLight;
  environmentMap!: any;
  constructor(experience: Experience) {
    this.experience = experience;
    this.scene = experience.scene;
    this.resources = experience.resources;

    this.setSunLight();
    this.setEnvironmentMap();
  }

  setSunLight() {
    // this.ambientLight = new AmbientLight(0xffffff, 0.2);
    // this.scene.add(this.ambientLight);

    this.sunLight = new DirectionalLight(0xffffff, 1.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.far = 15;
    this.sunLight.shadow.camera.left = -7;
    this.sunLight.shadow.camera.right = 7;
    this.sunLight.shadow.camera.top = 7;
    this.sunLight.shadow.camera.bottom = -7;
    this.sunLight.shadow.normalBias = 0.05;
    this.sunLight.position.set(3.5, 2, -1.25);
    this.scene.add(this.sunLight);
  }

  setEnvironmentMap() {
    this.environmentMap = {}
    this.environmentMap.intensity = 0.4;
    this.environmentMap.texture = this.resources.get<CubeTexture>("environmentMapTexture");
    this.environmentMap.texture.colorSpace = THREE.SRGBColorSpace;
    this.scene.environment = this.environmentMap.texture;

    const updateEnvironmentMap = () => {
      this.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.envMap = this.environmentMap.texture;
          child.material.envMapIntensity = this.environmentMap.intensity;
          child.material.needsUpdate = true;
        } else {
        }
      })
    };

    updateEnvironmentMap();
  }
}
