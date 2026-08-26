import type { Vector3 } from "three";
import type Experience from "../Experience";
import Paddle from "./Paddle";

const MOVE_KEYS = new Set(["w", "a", "s", "d"]);

export default class PlayerPaddle extends Paddle {
  private keys = new Set<string>();

  private onKeyDown = (e: KeyboardEvent) => {
    if (!MOVE_KEYS.has(e.key)) return;

    e.preventDefault();
    this.keys.add(e.key);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
  };

  constructor(experience: Experience, color: string, startPosition: Vector3, id: string) {
    super(experience, color, startPosition, id);
    this.speed = 5;
    this.setControls();
  }

  setControls() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  update() {
    const dt = this.experience.time.delta / 1000;
    const move = this.speed * dt;

    if (this.keys.has("a")) this.mesh.position.x -= move;
    if (this.keys.has("d")) this.mesh.position.x += move;

    this.clampPosition();
  }

  destroy() {
    super.destroy();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.keys.clear();
  }
}
