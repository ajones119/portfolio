import { Scene } from 'three';
import { Debug, Sizes, Time } from '../../shared/runtime';
import Camera from './Camera';
import Controls from './Controls';
import Renderer from './Renderer';
import World from './World';

export default class Experience {
  readonly scene = new Scene();
  readonly sizes = new Sizes();
  readonly time = new Time();
  readonly debug = new Debug();
  readonly controls: Controls;
  readonly camera: Camera;
  readonly renderer: Renderer;
  readonly world: World;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.controls = new Controls(canvas);
    this.world = new World(this);
    this.camera = new Camera(this, this.world.forest);
    this.renderer = new Renderer(this);

    this.sizes.on('resize', this.resize);
    this.time.on('tick', this.update);
  }

  private resize = (): void => {
    this.camera.resize();
    this.renderer.resize();
  };

  private update = (): void => {
    const deltaSeconds = Math.min(this.time.delta / 1000, 0.05);
    this.camera.update(deltaSeconds);
    this.world.update(deltaSeconds, this.time.elapsed / 1000);
    this.renderer.render();
  };

  destroy(): void {
    this.sizes.destroy();
    this.time.destroy();
    this.controls.destroy();
    this.world.destroy();
    this.renderer.destroy();
    this.debug.destroy();
  }
}
