import EventEmitter from "./EventEmitter";

export default class Time extends EventEmitter {
  readonly start: number;
  current: number;
  elapsed = 0;
  delta = 16;

  private animationFrameId: number | null = null;
  private running = true;

  constructor() {
    super();
    this.start = performance.now();
    this.current = this.start;
    this.animationFrameId = window.requestAnimationFrame(this.tick);
  }

  private tick = (currentTime: number): void => {
    this.delta = currentTime - this.current;
    this.current = currentTime;
    this.elapsed = currentTime - this.start;
    this.emit("tick");
    if (this.running) {
      this.animationFrameId = window.requestAnimationFrame(this.tick);
    }
  };

  override destroy(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    super.destroy();
  }
}
