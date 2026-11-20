// First-person movement, collision and input for the /place 3D Walk mode.
//
// World conventions: Pixel (x,y) is a 1m tile covering world X in [x, x+1] and Z in [y, y+1];
// the Canvas spans [0,W]×[0,H]. Yaw 0 faces north (−Z) and positive yaw turns left, matching a
// three.js camera with rotation order 'YXZ' and `rotation.y = yaw`, `rotation.x = pitch`.

export interface Player {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}

/** `forward` and `strafe` are each in [-1, 1]; strafe +1 is to the right. */
export interface MoveInput {
  forward: number;
  strafe: number;
  sprint: boolean;
}

export interface Grid {
  width: number;
  height: number;
  /** Integer tile coords. */
  blocks(tx: number, ty: number): boolean;
  slows(tx: number, ty: number): boolean;
}

export const PLAYER_RADIUS = 0.3;
export const WALK_SPEED = 4;
export const SPRINT_SPEED = 7;
export const WATER_FACTOR = 0.5;
export const PITCH_LIMIT = 1.4;

/** Mouse look sensitivity while pointer-locked, in radians per CSS px. */
export const MOUSE_SENSITIVITY = 0.0022;
/** Touch drag-look sensitivity, in radians per CSS px. */
export const TOUCH_LOOK_SENSITIVITY = 0.005;
/** Joystick throw in CSS px at which input reaches full deflection. */
export const JOYSTICK_RADIUS = 50;

// A tile the player overlaps by more than this at the start of a step is one it is already
// stuck in (e.g. spawned inside), so it's ignored to let the player walk out. Resolution leaves
// the player exactly touching walls, and this slack keeps float error from counting that touch
// as being stuck — which would let the player walk through the wall on the next step.
const STUCK_SLACK = 1e-4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Squared distance from (px,pz) to the unit square at tile (tx,tz). */
function distSqToTile(px: number, pz: number, tx: number, tz: number): number {
  const dx = px - clamp(px, tx, tx + 1);
  const dz = pz - clamp(pz, tz, tz + 1);
  return dx * dx + dz * dz;
}

function tileBlocks(grid: Grid, tx: number, tz: number): boolean {
  if (tx < 0 || tz < 0 || tx >= grid.width || tz >= grid.height) return false; // edge clamp handles it
  return grid.blocks(tx, tz);
}

const tileKey = (tx: number, tz: number) => `${tx},${tz}`;

/**
 * Sweeps one coordinate (`a`, the moving axis) from `from` to `to` while the other (`b`) stays
 * fixed, stopping at the first blocking tile the player circle would touch. Tiles are full 1×1
 * squares with the circle's rounded contact at their corners, so the player slides around them.
 */
function sweepAxis(
  from: number,
  to: number,
  b: number,
  r: number,
  isBlocked: (ta: number, tb: number) => boolean,
): number {
  if (to === from) return to;
  const lo = Math.floor(Math.min(from, to) - r);
  const hi = Math.floor(Math.max(from, to) + r);
  const bLo = Math.floor(b - r);
  const bHi = Math.floor(b + r);
  let result = to;
  for (let tb = bLo; tb <= bHi; tb++) {
    const db = b - clamp(b, tb, tb + 1);
    if (db * db >= r * r) continue;
    const reach = Math.sqrt(r * r - db * db); // how close the centre may get to the tile along `a`
    for (let ta = lo; ta <= hi; ta++) {
      if (!isBlocked(ta, tb)) continue;
      if (to > from) {
        const limit = ta - reach;
        if (from <= limit && result > limit) result = limit;
      } else {
        const limit = ta + 1 + reach;
        if (from >= limit && result < limit) result = limit;
      }
    }
  }
  return result;
}

/** Advances the player by `dt` seconds of `input`. Pure. */
export function stepPlayer(p: Player, input: MoveInput, dt: number, grid: Grid): Player {
  let forward = clamp(input.forward || 0, -1, 1);
  let strafe = clamp(input.strafe || 0, -1, 1);
  const mag = Math.hypot(forward, strafe);
  if (mag === 0 || !(dt > 0)) return { ...p };
  if (mag > 1) {
    forward /= mag;
    strafe /= mag;
  }

  const r = PLAYER_RADIUS;
  const tileX = clamp(Math.floor(p.x), 0, grid.width - 1);
  const tileZ = clamp(Math.floor(p.z), 0, grid.height - 1);
  let speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
  if (grid.slows(tileX, tileZ)) speed *= WATER_FACTOR;

  // Forward is (−sin yaw, −cos yaw); right is (cos yaw, −sin yaw).
  const sin = Math.sin(p.yaw);
  const cos = Math.cos(p.yaw);
  const dist = speed * dt;
  const targetX = p.x + (-sin * forward + cos * strafe) * dist;
  const targetZ = p.z + (-cos * forward - sin * strafe) * dist;

  // Tiles the player is already stuck in don't collide, so a bad spawn can't trap them.
  const stuck = new Set<string>();
  const stuckDist = Math.max(0, r - STUCK_SLACK);
  for (let tz = Math.floor(p.z - r); tz <= Math.floor(p.z + r); tz++) {
    for (let tx = Math.floor(p.x - r); tx <= Math.floor(p.x + r); tx++) {
      if (tileBlocks(grid, tx, tz) && distSqToTile(p.x, p.z, tx, tz) < stuckDist * stuckDist) {
        stuck.add(tileKey(tx, tz));
      }
    }
  }
  const solid = (tx: number, tz: number) => tileBlocks(grid, tx, tz) && !stuck.has(tileKey(tx, tz));

  let x = sweepAxis(p.x, targetX, p.z, r, (tx, tz) => solid(tx, tz));
  x = clamp(x, r, grid.width - r);
  let z = sweepAxis(p.z, targetZ, x, r, (tz, tx) => solid(tx, tz));
  z = clamp(z, r, grid.height - r);

  return { x, z, yaw: p.yaw, pitch: p.pitch };
}

/** Turns the player by `dYaw` and tilts by `dPitch` (radians), clamping pitch to ±1.4. Pure. */
export function applyLook(p: Player, dYaw: number, dPitch: number): Player {
  let yaw = p.yaw + dYaw;
  // Keep yaw bounded so it never loses precision over a long session.
  if (yaw > Math.PI || yaw < -Math.PI) yaw = yaw - 2 * Math.PI * Math.round(yaw / (2 * Math.PI));
  return { x: p.x, z: p.z, yaw, pitch: clamp(p.pitch + dPitch, -PITCH_LIMIT, PITCH_LIMIT) };
}

export interface Input {
  read(): MoveInput;
  /** Radians accumulated since the last call. */
  consumeLook(): { dYaw: number; dPitch: number };
  /** Removes every listener and DOM node it added. */
  dispose(): void;
}

const FORWARD_KEYS = ['KeyW', 'ArrowUp'];
const BACK_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const SPRINT_KEYS = ['ShiftLeft', 'ShiftRight'];
const MOVEMENT_KEYS = new Set([...FORWARD_KEYS, ...BACK_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, ...SPRINT_KEYS]);

interface Joystick {
  id: number;
  originX: number;
  originY: number;
  forward: number;
  strafe: number;
  ring: HTMLDivElement;
  knob: HTMLDivElement;
}

/**
 * Desktop: click `el` for pointer lock, mouse looks, WASD/arrows move, Shift sprints.
 * Touch: a touch starting on the left half of `el` spawns a joystick; one on the right half
 * drag-looks. Both can be held at once. Escape is left to the caller.
 */
export function createInput(el: HTMLElement): Input {
  const held = new Set<string>();
  let dYaw = 0;
  let dPitch = 0;
  let joystick: Joystick | null = null;
  let look: { id: number; x: number; y: number } | null = null;
  let disposed = false;

  const prevTouchAction = el.style.touchAction;
  el.style.touchAction = 'none';

  const anyHeld = (codes: string[]) => codes.some((c) => held.has(c));

  const onKeyDown = (e: KeyboardEvent) => {
    if (!MOVEMENT_KEYS.has(e.code) || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    held.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (!MOVEMENT_KEYS.has(e.code)) return;
    e.preventDefault();
    e.stopPropagation();
    held.delete(e.code);
  };
  const onBlur = () => held.clear();

  const onClick = (e: MouseEvent) => {
    if ((e as PointerEvent).pointerType === 'touch') return;
    if (document.pointerLockElement === el) return;
    try {
      // Returns a promise in modern browsers; it rejects if the user exits lock too recently.
      const result = el.requestPointerLock() as unknown;
      if (result instanceof Promise) result.catch(() => {});
    } catch {
      /* unsupported — mouse look just stays off */
    }
  };
  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== el) return;
    dYaw -= e.movementX * MOUSE_SENSITIVITY;
    dPitch -= e.movementY * MOUSE_SENSITIVITY;
  };

  const placeJoystick = (j: Joystick) => {
    const rect = el.getBoundingClientRect();
    j.ring.style.left = `${j.originX - rect.left}px`;
    j.ring.style.top = `${j.originY - rect.top}px`;
    j.knob.style.transform =
      `translate(-50%, -50%) translate(${j.strafe * JOYSTICK_RADIUS}px, ${-j.forward * JOYSTICK_RADIUS}px)`;
  };

  const endJoystick = () => {
    if (!joystick) return;
    joystick.ring.remove();
    joystick = null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    const rect = el.getBoundingClientRect();
    const leftHalf = e.clientX - rect.left < rect.width / 2;
    if (leftHalf && !joystick) {
      const ring = document.createElement('div');
      ring.className = 'place-world__joystick';
      Object.assign(ring.style, {
        position: 'absolute',
        width: `${JOYSTICK_RADIUS * 2}px`,
        height: `${JOYSTICK_RADIUS * 2}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      });
      const knob = document.createElement('div');
      knob.className = 'place-world__joystick-knob';
      Object.assign(knob.style, { position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none' });
      ring.appendChild(knob);
      el.appendChild(ring);
      joystick = { id: e.pointerId, originX: e.clientX, originY: e.clientY, forward: 0, strafe: 0, ring, knob };
      placeJoystick(joystick);
    } else if (!leftHalf && !look) {
      look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    } else {
      return;
    }
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone */
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (joystick && e.pointerId === joystick.id) {
      let dx = (e.clientX - joystick.originX) / JOYSTICK_RADIUS;
      let dy = (e.clientY - joystick.originY) / JOYSTICK_RADIUS;
      const mag = Math.hypot(dx, dy);
      if (mag > 1) {
        dx /= mag;
        dy /= mag;
      }
      joystick.strafe = dx;
      joystick.forward = -dy;
      placeJoystick(joystick);
    } else if (look && e.pointerId === look.id) {
      dYaw -= (e.clientX - look.x) * TOUCH_LOOK_SENSITIVITY;
      dPitch -= (e.clientY - look.y) * TOUCH_LOOK_SENSITIVITY;
      look.x = e.clientX;
      look.y = e.clientY;
    }
  };

  const onPointerEnd = (e: PointerEvent) => {
    if (joystick && e.pointerId === joystick.id) endJoystick();
    if (look && e.pointerId === look.id) look = null;
  };

  const listen = { capture: true } as const;
  window.addEventListener('keydown', onKeyDown, listen);
  window.addEventListener('keyup', onKeyUp, listen);
  window.addEventListener('blur', onBlur);
  el.addEventListener('click', onClick);
  document.addEventListener('mousemove', onMouseMove);
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerEnd);
  el.addEventListener('pointercancel', onPointerEnd);
  el.addEventListener('lostpointercapture', onPointerEnd);

  return {
    read() {
      if (joystick) {
        return { forward: joystick.forward, strafe: joystick.strafe, sprint: anyHeld(SPRINT_KEYS) };
      }
      return {
        forward: (anyHeld(FORWARD_KEYS) ? 1 : 0) - (anyHeld(BACK_KEYS) ? 1 : 0),
        strafe: (anyHeld(RIGHT_KEYS) ? 1 : 0) - (anyHeld(LEFT_KEYS) ? 1 : 0),
        sprint: anyHeld(SPRINT_KEYS),
      };
    },
    consumeLook() {
      const out = { dYaw, dPitch };
      dYaw = 0;
      dPitch = 0;
      return out;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener('keydown', onKeyDown, listen);
      window.removeEventListener('keyup', onKeyUp, listen);
      window.removeEventListener('blur', onBlur);
      el.removeEventListener('click', onClick);
      document.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerEnd);
      el.removeEventListener('pointercancel', onPointerEnd);
      el.removeEventListener('lostpointercapture', onPointerEnd);
      endJoystick();
      look = null;
      held.clear();
      el.style.touchAction = prevTouchAction;
      if (document.pointerLockElement === el) document.exitPointerLock();
    },
  };
}
