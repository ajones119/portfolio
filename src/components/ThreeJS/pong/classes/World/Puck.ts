import { Box3, CylinderGeometry, Mesh, MeshStandardMaterial, Vector3 } from "three";
import type Experience from "../Experience";
import CollidableItem from "./CollidableItem";
import {
  PUCK_HEIGHT,
  PUCK_RADIUS,
  PUCK_X_LIMIT,
  PUCK_Y,
  PUCK_Z_LIMIT,
  PLAYER_SIDE_COLOR,
  ENEMY_SIDE_COLOR,
} from "./court";

export default class Puck extends CollidableItem {
  experience: Experience;
  geometry: CylinderGeometry;
  material: MeshStandardMaterial;
  mesh: Mesh;
  speed: number;
  direction: Vector3;
  lastPaddle: "player" | "enemy" | null = null;
  private velocity = new Vector3();
  private side: "player" | "enemy" | null = null;
  private bounds = new Box3();

  constructor(experience: Experience, position: Vector3, speed: number, direction: Vector3) {
    super();
    this.experience = experience;
    this.geometry = new CylinderGeometry(PUCK_RADIUS, PUCK_RADIUS, PUCK_HEIGHT, 24);
    this.material = new MeshStandardMaterial({
      color: "blue",
      metalness: 0.3,
      roughness: 0.4,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.rotation.y = Math.PI / 2;
    this.experience.scene.add(this.mesh);
    this.speed = speed;
    this.direction = direction.clone().normalize();
  }

  update() {
    const dt = this.experience.time.delta / 1000;
    this.velocity.copy(this.direction).multiplyScalar(this.speed * dt);
    this.mesh.position.add(this.velocity);
    this.clampPosition();
    this.updateSideColor();
  }

  private updateSideColor() {
    const onPlayerSide = this.mesh.position.z >= 0;
    const nextSide = onPlayerSide ? "player" : "enemy";
    if (nextSide === this.side) return;

    this.side = nextSide;
    this.material.color.setHex(onPlayerSide ? PLAYER_SIDE_COLOR : ENEMY_SIDE_COLOR);
  }

  clampPosition() {
    this.mesh.position.x = Math.max(-PUCK_X_LIMIT, Math.min(PUCK_X_LIMIT, this.mesh.position.x));
    this.mesh.position.z = Math.max(-PUCK_Z_LIMIT, Math.min(PUCK_Z_LIMIT, this.mesh.position.z));
  }

  reset() {
    this.mesh.position.set(0, PUCK_Y, 0);
    this.direction.set(0, 0, 1);
    this.speed = 5;
    this.lastPaddle = null;
    this.side = null;
  }

  getBounds() {
    return this.bounds.setFromObject(this.mesh);
  }

  checkCollision(_target: CollidableItem) {}

  onCollide(_target: CollidableItem) {}

  destroy() {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach(material => material.dispose());
    } else {
      this.mesh.material.dispose();
    }
    this.experience.scene.remove(this.mesh);
  }
}
