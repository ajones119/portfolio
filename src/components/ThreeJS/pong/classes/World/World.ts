import Experience from "../Experience";
import { Scene, Vector3 } from "three";
import Environment from "./Environment";
import type { Resources } from "../../../shared/runtime";
import Floor from "./Floor";
import DividerLine from "./DividerLine";
import GoalLine from "./GoalLine";
import SideWall from "./SideWall";
import PlayerPaddle from "./PlayerPaddle";
import EnemyPaddle from "./EnemyPaddle";
import Puck from "./Puck";
import {
  ENEMY_PADDLE_Z,
  PADDLE_Y,
  PLAYER_PADDLE_Z,
  PUCK_Y,
} from "./court";

export default class World {
  experience: Experience;
  scene: Scene;
  environment!: Environment;
  resources: Resources;
  floor!: Floor;
  dividerLine!: DividerLine;
  playerGoalLine!: GoalLine;
  enemyGoalLine!: GoalLine;
  leftWall!: SideWall;
  rightWall!: SideWall;
  playerPaddle!: PlayerPaddle;
  enemyPaddle!: EnemyPaddle;
  puck!: Puck;

  constructor(experience: Experience) {
    this.experience = experience;
    this.scene = experience.scene;
    this.resources = experience.resources;

    this.resources.on("loaded", () => {
      this.environment = new Environment(this.experience);
      this.floor = new Floor(this.experience);
      this.dividerLine = new DividerLine(this.experience);
      this.playerGoalLine = new GoalLine(this.experience, "player");
      this.enemyGoalLine = new GoalLine(this.experience, "enemy");
      this.leftWall = new SideWall(this.experience, "left");
      this.rightWall = new SideWall(this.experience, "right");
      this.playerPaddle = new PlayerPaddle(this.experience, "red", new Vector3(0, PADDLE_Y, PLAYER_PADDLE_Z), "player");
      this.enemyPaddle = new EnemyPaddle(this.experience, "blue", new Vector3(0, PADDLE_Y, ENEMY_PADDLE_Z), "enemy");
      this.puck = new Puck(this.experience, new Vector3(0, PUCK_Y, 0), 3, new Vector3(0.4, 0, 1));
    });
  }

  update() {
    if (this.experience.game.state !== "playing") return;
    if (!this.playerPaddle || !this.enemyPaddle || !this.puck) return;
    if (!this.playerGoalLine || !this.enemyGoalLine) return;
    if (!this.leftWall || !this.rightWall) return;

    this.playerPaddle.update();
    this.enemyPaddle.update();
    this.puck.update();

    this.playerPaddle.checkCollision(this.puck);
    this.enemyPaddle.checkCollision(this.puck);
    this.playerGoalLine.checkCollision(this.puck);
    this.enemyGoalLine.checkCollision(this.puck);
    this.leftWall.checkCollision(this.puck);
    this.rightWall.checkCollision(this.puck);
  }

  resize() {}

  destroy() {
    this.playerPaddle?.destroy();
    this.enemyPaddle?.destroy();
    this.puck?.destroy();
    this.dividerLine?.destroy();
    this.playerGoalLine?.destroy();
    this.enemyGoalLine?.destroy();
    this.leftWall?.destroy();
    this.rightWall?.destroy();
  }
}
