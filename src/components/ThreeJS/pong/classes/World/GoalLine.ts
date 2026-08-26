import { Box3, BoxGeometry, Mesh, MeshStandardMaterial, Scene } from "three";
import Experience from "../Experience";
import CollidableItem from "./CollidableItem";
import Puck from "./Puck";
import {
  COURT_SIZE,
  ENEMY_GOAL_Z,
  ENEMY_SIDE_COLOR,
  GOAL_DEPTH,
  GOAL_HEIGHT,
  GOAL_Y,
  PLAYER_GOAL_Z,
  PLAYER_SIDE_COLOR,
} from "./court";

export type GoalSide = "player" | "enemy";

export default class GoalLine extends CollidableItem {
  experience: Experience;
  scene: Scene;
  side: GoalSide;
  geometry: BoxGeometry;
  material: MeshStandardMaterial;
  mesh: Mesh;
  private bounds = new Box3();

  constructor(experience: Experience, side: GoalSide) {
    super();
    this.experience = experience;
    this.scene = experience.scene;
    this.side = side;

    const color = side === "player" ? PLAYER_SIDE_COLOR : ENEMY_SIDE_COLOR;
    const z = side === "player" ? PLAYER_GOAL_Z : ENEMY_GOAL_Z;

    this.geometry = new BoxGeometry(COURT_SIZE, GOAL_HEIGHT, GOAL_DEPTH);
    this.material = new MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.position.set(0, GOAL_Y, z);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  update() {}

  reset() {}

  getBounds() {
    return this.bounds.setFromObject(this.mesh);
  }

  checkCollision(target: CollidableItem) {
    if (this.getBounds().intersectsBox(target.getBounds())) {
      this.onCollide(target);
    }
  }

  onCollide(target: CollidableItem) {
    if (!(target instanceof Puck)) return;
    if (this.experience.game.state !== "playing") return;

    // Hitting this goal means the other side scored
    this.experience.game.scoreGoal(this.side);
    target.reset();
  }

  destroy() {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}
