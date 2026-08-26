import { Group, Scene, Vector3 } from 'three';
import type { Debug } from '../../shared/runtime';
import type { TrunkCollider } from './Forest';
import Rabbit from './Rabbit';

interface RabbitAgent {
  rabbit: Rabbit;
  from: Vector3;
  to: Vector3;
  progress: number;
  pause: number;
  duration: number;
}

const WANDER_RADIUS = 39;
const RABBIT_RADIUS = .5;

export default class Rabbits {
  private group = new Group();
  private agents: RabbitAgent[] = [];
  private random = seededRandom(734);
  private settings = {
    seed: 734,
    count: 8,
    hopSpeed: 1.15,
    hopHeight: .7,
    color: '#a98d73',
  };

  constructor(
    private readonly scene: Scene,
    debug: Debug,
    private readonly trunks: TrunkCollider[],
  ) {
    scene.add(this.group);
    this.build();
    this.setupDebug(debug);
  }

  update(delta: number): void {
    for (const agent of this.agents) {
      if (agent.pause > 0) {
        agent.pause -= delta;
        continue;
      }

      agent.progress = Math.min(
        agent.progress + delta * this.settings.hopSpeed / agent.duration,
        1,
      );
      const eased = smoothstep(agent.progress);
      agent.rabbit.group.position.lerpVectors(agent.from, agent.to, eased);
      agent.rabbit.group.position.y = Math.sin(agent.progress * Math.PI) * this.settings.hopHeight;
      agent.rabbit.group.rotation.x = Math.sin(agent.progress * Math.PI * 2) * .055;

      if (agent.progress === 1) this.beginNextHop(agent);
    }
  }

  rebuild = (): void => {
    this.agents.forEach(({ rabbit }) => rabbit.destroy());
    this.scene.remove(this.group);
    this.group = new Group();
    this.agents = [];
    this.random = seededRandom(this.settings.seed);
    this.scene.add(this.group);
    this.build();
  };

  destroy(): void {
    this.agents.forEach(({ rabbit }) => rabbit.destroy());
    this.scene.remove(this.group);
  }

  private build(): void {
    for (let index = 0; index < this.settings.count; index += 1) {
      const position = index === 0
        ? new Vector3(2, 0, 29)
        : this.findOpenPosition();
      const rabbit = new Rabbit({
        color: this.settings.color,
        scale: .82 + this.random() * .28,
      });
      rabbit.group.position.copy(position);
      this.group.add(rabbit.group);

      const agent: RabbitAgent = {
        rabbit,
        from: position.clone(),
        to: position.clone(),
        progress: 0,
        pause: index === 0 ? .25 : this.random() * 1.5,
        duration: .8 + this.random() * .45,
      };
      agent.to.copy(this.findHopTarget(agent.from));
      this.faceTarget(agent);
      this.agents.push(agent);
    }
  }

  private beginNextHop(agent: RabbitAgent): void {
    agent.from.copy(agent.to);
    agent.to.copy(this.findHopTarget(agent.from));
    agent.rabbit.group.position.copy(agent.from);
    agent.rabbit.group.rotation.x = 0;
    agent.progress = 0;
    agent.pause = .35 + this.random() * 1.25;
    agent.duration = .8 + this.random() * .45;
    this.faceTarget(agent);
  }

  private faceTarget(agent: RabbitAgent): void {
    const dx = agent.to.x - agent.from.x;
    const dz = agent.to.z - agent.from.z;
    agent.rabbit.group.rotation.y = Math.atan2(-dx, -dz);
  }

  private findHopTarget(from: Vector3): Vector3 {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const angle = this.random() * Math.PI * 2;
      const distance = 1.8 + this.random() * 4;
      const candidate = new Vector3(
        from.x + Math.cos(angle) * distance,
        0,
        from.z + Math.sin(angle) * distance,
      );
      if (candidate.length() <= WANDER_RADIUS && this.isOpen(candidate)) return candidate;
    }
    return from.clone();
  }

  private findOpenPosition(): Vector3 {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const radius = Math.sqrt(this.random()) * WANDER_RADIUS;
      const angle = this.random() * Math.PI * 2;
      const candidate = new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      if (this.isOpen(candidate)) return candidate;
    }
    return new Vector3();
  }

  private isOpen(position: Vector3): boolean {
    return this.trunks.every((trunk) => {
      const minimum = trunk.radius + RABBIT_RADIUS;
      const dx = position.x - trunk.x;
      const dz = position.z - trunk.z;
      return dx * dx + dz * dz > minimum * minimum;
    });
  }

  private setupDebug(debug: Debug): void {
    const folder = debug.ui?.addFolder('Rabbits');
    folder?.add(this.settings, 'seed', 1, 9999, 1).onFinishChange(this.rebuild);
    folder?.add(this.settings, 'count', 1, 20, 1).onFinishChange(this.rebuild);
    folder?.add(this.settings, 'hopSpeed', .35, 3, .05);
    folder?.add(this.settings, 'hopHeight', .2, 1.4, .05);
    folder?.addColor(this.settings, 'color').onFinishChange(this.rebuild);
  }
}

function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}
