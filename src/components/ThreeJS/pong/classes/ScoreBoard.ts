import type Experience from "./Experience";
import type { ScorePayload } from "./Game";

export default class ScoreBoard {
  experience: Experience;
  root: HTMLElement;
  playerValue: HTMLElement;
  enemyValue: HTMLElement;
  status: HTMLElement;

  private onScore = (payload: unknown) => {
    const score = payload as ScorePayload;
    this.renderScore(score.player, score.enemy);
  };

  private onGameOver = (payload: unknown) => {
    const score = payload as ScorePayload;
    this.renderScore(score.player, score.enemy);
    const winner = score.player > score.enemy ? "You win" : "Enemy wins";
    this.status.textContent = `${winner} — click to rematch`;
    this.status.hidden = false;
    this.root.classList.add("is-game-over");
  };

  private onReset = () => {
    this.renderScore(0, 0);
    this.status.hidden = true;
    this.root.classList.remove("is-game-over");
  };

  private onRematch = () => {
    if (this.experience.game.state !== "gameOver") return;
    this.experience.game.reset();
    this.experience.world.puck?.reset();
    this.experience.world.playerPaddle?.reset();
    this.experience.world.enemyPaddle?.reset();
  };

  constructor(experience: Experience) {
    this.experience = experience;

    this.root = document.createElement("div");
    this.root.className = "pong-scoreboard";
    this.root.innerHTML = `
      <div class="pong-scoreboard__panel">
        <div class="pong-scoreboard__side pong-scoreboard__side--enemy">
          <span class="pong-scoreboard__label">Enemy</span>
          <span class="pong-scoreboard__value" data-side="enemy">0</span>
        </div>
        <div class="pong-scoreboard__divider">:</div>
        <div class="pong-scoreboard__side pong-scoreboard__side--player">
          <span class="pong-scoreboard__label">You</span>
          <span class="pong-scoreboard__value" data-side="player">0</span>
        </div>
      </div>
      <p class="pong-scoreboard__status" hidden></p>
    `;

    this.playerValue = this.root.querySelector('[data-side="player"]') as HTMLElement;
    this.enemyValue = this.root.querySelector('[data-side="enemy"]') as HTMLElement;
    this.status = this.root.querySelector(".pong-scoreboard__status") as HTMLElement;

    this.injectStyles();
    this.mount();
    this.bind();
  }

  private mount() {
    const host = this.experience.canvas.parentElement ?? document.body;
    if (getComputedStyle(host).position === "static") {
      host.style.position = "relative";
    }
    host.appendChild(this.root);
  }

  private bind() {
    this.experience.game.on("score", this.onScore);
    this.experience.game.on("gameOver", this.onGameOver);
    this.experience.game.on("reset", this.onReset);
    this.root.addEventListener("click", this.onRematch);
  }

  private renderScore(player: number, enemy: number) {
    this.playerValue.textContent = String(player);
    this.enemyValue.textContent = String(enemy);
  }

  private injectStyles() {
    if (document.getElementById("pong-scoreboard-styles")) return;

    const style = document.createElement("style");
    style.id = "pong-scoreboard-styles";
    style.textContent = `
      .pong-scoreboard {
        position: absolute;
        inset: auto 0 0 0;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 0 1rem 1.25rem;
        pointer-events: none;
        font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      }

      .pong-scoreboard.is-game-over {
        pointer-events: auto;
        cursor: pointer;
      }

      .pong-scoreboard__panel {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        padding: 0.65rem 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(8, 10, 14, 0.72);
        backdrop-filter: blur(8px);
        color: #f4f4f4;
        letter-spacing: 0.04em;
      }

      .pong-scoreboard__side {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 4.5rem;
      }

      .pong-scoreboard__label {
        font-size: 0.7rem;
        text-transform: uppercase;
        opacity: 0.75;
      }

      .pong-scoreboard__value {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.1;
        font-variant-numeric: tabular-nums;
      }

      .pong-scoreboard__side--player .pong-scoreboard__value {
        color: #00ff00;
      }

      .pong-scoreboard__side--enemy .pong-scoreboard__value {
        color: #ff0000;
      }

      .pong-scoreboard__divider {
        font-size: 1.75rem;
        opacity: 0.55;
      }

      .pong-scoreboard__status {
        margin: 0;
        padding: 0.4rem 0.85rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(8, 10, 14, 0.8);
        color: #f4f4f4;
        font-size: 0.85rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
    `;
    document.head.appendChild(style);
  }

  destroy() {
    this.experience.game.off("score");
    this.experience.game.off("gameOver");
    this.experience.game.off("reset");
    this.root.removeEventListener("click", this.onRematch);
    this.root.remove();
  }
}
