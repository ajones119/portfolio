import { Debug, Resources, Sizes, Time } from "../../shared/runtime";
import { Mesh, Scene } from "three";
import Camera from "./Camera";
import Renderer from "./Renderer";
import World from "./World/World";
import { sources } from "./Sources";

export default class Experience {
  private static instance: Experience | null = null;

  canvas: HTMLCanvasElement;
  sizes: Sizes;
  time: Time;
  scene: Scene;
  camera: Camera;
  renderer: Renderer
  world: World;
  resources: Resources;
  debug: Debug;
  private constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Setup
    this.sizes = new Sizes();
    this.time = new Time();
    this.scene = new Scene();
    this.resources = new Resources(sources);
    this.debug = new Debug();

    this.camera = new Camera(this);
    this.renderer = new Renderer(this);
    this.world = new World(this);
    this.sizes.on("resize", () => {
      this.resize();
    });

    this.time.on("tick", () => {
      this.update();
    });
  }

  static getInstance(canvas: HTMLCanvasElement): Experience {
    if (!Experience.instance) {
      Experience.instance = new Experience(canvas);
    }
    return Experience.instance;
  }

  resize() {
    this.camera.resize()
    this.renderer.resize()
    this.world.resize()
  }

  update() {
    this.camera.update()
    this.world.update()
    this.renderer.render()
  }

  destroy() {
    this.sizes.destroy();
    this.time.destroy();
    this.scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
    this.debug.destroy();
  }
}
