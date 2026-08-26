import { AnimationAction, AnimationMixer, Mesh, type Group, type Scene } from "three";
import Experience from "../Experience";
import type { Resources } from "../../../shared/runtime";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
export default class Fox {
  experience: Experience;
  scene: Scene;
  resources: Resources;
  resource!: GLTF;
  model!: Group;
  animation!: {
    mixer: AnimationMixer;
    currentAction: AnimationAction;
    actions: {
      idle: AnimationAction;
      walking: AnimationAction;
      running: AnimationAction;
    },
  }
  constructor(experience: Experience) {
    this.experience = experience;
    this.scene = experience.scene;
    this.resources = experience.resources;
    this.resource = this.resources.get<GLTF>("foxModel");
    this.setModel();
    this.setAnimation();
    this.setDebug();
  }

  setDebug() {
    if (this.experience.debug.ui) {
      const folder = this.experience.debug.ui.addFolder("Fox");
      const debug = {
        idle: () => this.playAnimation("idle"),
        walking: () => this.playAnimation("walking"),
        running: () => this.playAnimation("running"),
      };

      folder
        .add(this.animation.actions.idle, "timeScale")
        .min(0)
        .max(3)
        .step(0.001)
        .name("Idle Speed");
      folder
        .add(this.animation.actions.walking, "timeScale")
        .min(0)
        .max(3)
        .step(0.001)
        .name("Walking Speed");
      folder
        .add(this.animation.actions.running, "timeScale")
        .min(0)
        .max(3)
        .step(0.001)
        .name("Running Speed");

      folder.add(debug, "idle").name("Idle");
      folder.add(debug, "walking").name("Walking");
      folder.add(debug, "running").name("Running");
    }
  }

  setModel() {
    this.model = this.resource.scene;
    this.model.scale.set(0.02, 0.02, 0.02);
    this.scene.add(this.model);

    this.model.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
      }
    });
  }

  setAnimation() {
    const mixer = new AnimationMixer(this.model);
    this.animation = {
      mixer,
      currentAction: mixer.clipAction(this.resource.animations[0]!),
      actions: {
        idle: mixer.clipAction(this.resource.animations[0]!),
        walking: mixer.clipAction(this.resource.animations[1]!),
        running: mixer.clipAction(this.resource.animations[2]!),
      }
    };
    this.animation.currentAction = this.animation.actions.idle;
    this.animation.currentAction.play();
  }

  playAnimation(name: keyof typeof this.animation.actions) {
    const newAction = this.animation.actions[name];
    const oldAction = this.animation.currentAction;

    if (newAction === oldAction) return;

    newAction.reset();
    newAction.play();
    oldAction.crossFadeTo(newAction, 0.5);
    this.animation.currentAction = newAction;
  }

  update() {
    this.animation.mixer.update(this.experience.time.delta / 1000);
  }
}
