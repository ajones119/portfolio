import { Box3, BoxGeometry, Mesh, MeshStandardMaterial, Vector3 } from "three";
import Experience from "../Experience";
import { PADDLE_SIZE, PADDLE_X_LIMIT } from "./court";
import CollidableItem from "./CollidableItem";
import Puck from "./Puck";

export default class Paddle extends CollidableItem {
  id: string;
  experience: Experience;
  color: string;
  geometry: BoxGeometry;
  material: MeshStandardMaterial;
  mesh: Mesh;
  speed: number;
  laneZ: number;
  private bounds = new Box3();

  constructor(experience: Experience, color: string, startPosition: Vector3, id: string) {
    super();
    this.experience = experience;
    this.color = color;
    this.id = id;
    this.speed = 0.01;
    this.laneZ = startPosition.z;

    this.geometry = new BoxGeometry(PADDLE_SIZE.x, PADDLE_SIZE.y, PADDLE_SIZE.z);
    this.material = new MeshStandardMaterial({ color: color });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.set(startPosition.x, startPosition.y, startPosition.z);
    this.experience.scene.add(this.mesh);
  }

  update() {}

  clampPosition() {
    this.mesh.position.x = Math.max(-PADDLE_X_LIMIT, Math.min(PADDLE_X_LIMIT, this.mesh.position.x));
    this.mesh.position.z = this.laneZ;
  }

  destroy() {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach(material => material.dispose());
    } else {
      this.mesh.material.dispose();
    }
    this.experience.scene.remove(this.mesh);
  }

  reset() {
    this.mesh.position.set(0, 0, this.laneZ);
  }

  onCollide(target: CollidableItem) {
    if (!(target instanceof Puck)) return;
    if (target.lastPaddle === this.id) return;

    target.lastPaddle = this.id as "player" | "enemy";

    // -1 = far left of paddle, +1 = far right
    const offset = (target.mesh.position.x - this.mesh.position.x) / (PADDLE_SIZE.x * 0.5);
    const english = Math.max(-1, Math.min(1, offset));

    // Player paddle faces -Z (toward enemy); enemy faces +Z
    const bounceZ = target.direction.z > 0 ? -1 : 1;
    target.direction.set(english, 0, bounceZ).normalize();

    target.speed *= 1.1;
  }

  checkCollision(target: CollidableItem) {
    if (this.getBounds().intersectsBox(target.getBounds())) {
      this.onCollide(target);
    }
  }

  getBounds() {
    return this.bounds.setFromObject(this.mesh);
  }
}
