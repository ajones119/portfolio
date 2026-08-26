import type { Vector3 } from "three";
import type Experience from "../Experience";
import Paddle from "./Paddle";

const TRACK_DEAD_ZONE = 0.15;

export default class EnemyPaddle extends Paddle {
  constructor(experience: Experience, color: string, startPosition: Vector3, id: string) {
    super(experience, color, startPosition, id);
    this.speed = 4;
  }

  update() {
    const puck = this.experience.world.puck;
    if (!puck) return;

    // Only track when the puck is coming toward the enemy goal (-Z)
    if (puck.direction.z >= 0) {
      this.clampPosition();
      return;
    }

    const dt = this.experience.time.delta / 1000;
    const maxStep = this.speed * dt;
    const dx = puck.mesh.position.x - this.mesh.position.x;

    if (Math.abs(dx) > TRACK_DEAD_ZONE) {
      this.mesh.position.x += Math.max(-maxStep, Math.min(maxStep, dx));
    }

    this.clampPosition();
  }

  destroy() {
    super.destroy();
  }
}
