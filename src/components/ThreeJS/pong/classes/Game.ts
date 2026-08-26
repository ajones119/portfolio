import { EventEmitter } from "../../shared/runtime";

export type GameState = "playing" | "gameOver";

export type ScorePayload = {
  player: number;
  enemy: number;
  scoredOn: "player" | "enemy";
};

export default class Game extends EventEmitter {
  playerScore = 0;
  enemyScore = 0;
  state: GameState = "playing";
  readonly winScore = 5;

  get score() {
    return { player: this.playerScore, enemy: this.enemyScore };
  }

  /** `scoredOn` is the goal that was hit (that side conceded). */
  scoreGoal(scoredOn: "player" | "enemy") {
    if (this.state !== "playing") return;

    if (scoredOn === "player") this.enemyScore += 1;
    else this.playerScore += 1;

    const payload: ScorePayload = {
      player: this.playerScore,
      enemy: this.enemyScore,
      scoredOn,
    };

    console.log(`score — player ${this.playerScore} : ${this.enemyScore} enemy`);
    this.emit("score", [payload]);

    if (this.playerScore >= this.winScore || this.enemyScore >= this.winScore) {
      this.state = "gameOver";
      console.log(`game over — ${this.playerScore > this.enemyScore ? "player" : "enemy"} wins`);
      this.emit("gameOver", [payload]);
    }
  }

  reset() {
    this.playerScore = 0;
    this.enemyScore = 0;
    this.state = "playing";
    this.emit("reset", [this.score]);
  }
}
