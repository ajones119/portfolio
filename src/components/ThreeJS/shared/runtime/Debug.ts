import GUI from "lil-gui";

export interface DebugOptions {
  enabled?: boolean;
}

export default class Debug {
  readonly active: boolean;
  readonly ui: GUI | null;

  constructor(options: DebugOptions = {}) {
    const hashDebugEnabled = typeof window !== "undefined"
      && window.location.hash === "#debug";
    this.active = options.enabled ?? hashDebugEnabled;
    this.ui = this.active && typeof document !== "undefined" ? new GUI() : null;
  }

  destroy(): void {
    this.ui?.destroy();
  }
}
