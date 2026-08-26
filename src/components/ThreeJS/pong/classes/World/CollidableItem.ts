import type { Box3 } from "three";

export default abstract class CollidableItem {
  abstract getBounds(): Box3;
  abstract update(): void;
  abstract destroy(): void;
  abstract checkCollision(target: CollidableItem): void;
  abstract reset(): void;
  abstract onCollide(target: CollidableItem): void;
}
