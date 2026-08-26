import { Box3, BoxGeometry, Mesh, MeshStandardMaterial, Scene } from "three";
import Experience from "../Experience";
import CollidableItem from "./CollidableItem";
import Puck from "./Puck";
import {
  COURT_SIZE,
  LEFT_WALL_X,
  RIGHT_WALL_X,
  WALL_DEPTH,
  WALL_HEIGHT,
  WALL_Y,
} from "./court";

export type WallSide = "left" | "right";

export default class SideWall extends CollidableItem {
  experience: Experience;
  scene: Scene;
  side: WallSide;
  geometry: BoxGeometry;
  material: MeshStandardMaterial;
  mesh: Mesh;
  private bounds = new Box3();

  constructor(experience: Experience, side: WallSide) {
    super();
    this.experience = experience;
    this.scene = experience.scene;
    this.side = side;

    const x = side === "left" ? LEFT_WALL_X : RIGHT_WALL_X;

    this.geometry = new BoxGeometry(WALL_DEPTH, WALL_HEIGHT, COURT_SIZE);
    this.material = new MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.1,
      roughness: 0.7,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.position.set(x, WALL_Y, 0);
    this.mesh.castShadow = true;
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

    const movingIntoWall = this.side === "left" ? target.direction.x < 0 : target.direction.x > 0;
    if (!movingIntoWall) return;

    target.direction.x = -target.direction.x;
  }

  destroy() {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}
