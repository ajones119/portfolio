import type Experience from './Experience';
import Environment from './Environment';
import Floaters from './Floaters';
import Forest from './Forest';
import Rabbits from './Rabbits';

export default class World {
  readonly forest: Forest;
  private readonly environment: Environment;
  private readonly floaters: Floaters;
  private readonly rabbits: Rabbits;

  constructor(experience: Experience) {
    this.environment = new Environment(experience.scene, experience.debug);
    this.forest = new Forest(experience.scene, experience.debug);
    this.rabbits = new Rabbits(experience.scene, experience.debug, this.forest.trunks);
    this.floaters = new Floaters(experience.scene, experience.debug);
  }

  update(delta: number, elapsed: number): void {
    this.environment.update(delta);
    this.rabbits.update(delta);
    this.floaters.update(elapsed);
  }

  destroy(): void {
    this.floaters.destroy();
    this.rabbits.destroy();
    this.forest.destroy();
    this.environment.destroy();
  }
}
