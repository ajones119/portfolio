export type CameraMode = 'walk' | 'fly';

export interface ControlState {
  forward: number;
  right: number;
  ascend: boolean;
  descend: boolean;
  lookX: number;
  lookY: number;
}

export default class Controls {
  readonly state: ControlState = {
    forward: 0,
    right: 0,
    ascend: false,
    descend: false,
    lookX: 0,
    lookY: 0,
  };

  mode: CameraMode = 'walk';
  private readonly keys = new Set<string>();
  private readonly modeButtons: HTMLButtonElement[];
  private readonly controlHint: HTMLElement | null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.modeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-mode]'));
    this.controlHint = document.querySelector('[data-control-hint]');

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('click', this.lockPointer);
    this.modeButtons.forEach((button) => button.addEventListener('click', this.onModeClick));
  }

  update(): ControlState {
    this.state.forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    this.state.right = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    this.state.ascend = this.keys.has('Space');
    this.state.descend = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    return this.state;
  }

  consumeLook(): { x: number; y: number } {
    const look = { x: this.state.lookX, y: this.state.lookY };
    this.state.lookX = 0;
    this.state.lookY = 0;
    return look;
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
    this.modeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    });
    if (this.controlHint) {
      this.controlHint.textContent = mode === 'walk'
        ? 'Click the forest to look around · WASD move · Shift sprint'
        : 'Click the forest to look around · WASD move · Space up · Shift down';
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('click', this.lockPointer);
    this.modeButtons.forEach((button) => button.removeEventListener('click', this.onModeClick));
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
    if (event.code === 'Digit1') this.setMode('walk');
    if (event.code === 'Digit2') this.setMode('fly');
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onBlur = (): void => this.keys.clear();

  private onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.canvas) return;
    this.state.lookX += event.movementX;
    this.state.lookY += event.movementY;
  };

  private lockPointer = (): void => {
    if (document.pointerLockElement !== this.canvas) void this.canvas.requestPointerLock();
  };

  private onModeClick = (event: Event): void => {
    const mode = (event.currentTarget as HTMLButtonElement).dataset.mode as CameraMode;
    this.setMode(mode);
  };
}
