import { describe, expect, it } from 'vitest';
import {
  applyLook,
  PITCH_LIMIT,
  PLAYER_RADIUS,
  SPRINT_SPEED,
  stepPlayer,
  WALK_SPEED,
  WATER_FACTOR,
  type Grid,
  type MoveInput,
  type Player,
} from './controls';

const r = PLAYER_RADIUS;

function grid(width: number, height: number, walls: [number, number][] = [], water: [number, number][] = []): Grid {
  const has = (list: [number, number][], tx: number, ty: number) => list.some(([x, y]) => x === tx && y === ty);
  return { width, height, blocks: (x, y) => has(walls, x, y), slows: (x, y) => has(water, x, y) };
}

const at = (x: number, z: number, yaw = 0): Player => ({ x, z, yaw, pitch: 0 });
const input = (forward: number, strafe = 0, sprint = false): MoveInput => ({ forward, strafe, sprint });

function walk(p: Player, i: MoveInput, seconds: number, g: Grid, dt = 1 / 60): Player {
  for (let t = 0; t < seconds - 1e-9; t += dt) p = stepPlayer(p, i, dt, g);
  return p;
}

describe('stepPlayer: walking', () => {
  const open = grid(100, 100);

  it('with yaw 0, forward faces north and decreases z at WALK_SPEED', () => {
    const p = stepPlayer(at(50.5, 50.5), input(1), 1, open);
    expect(p.z).toBeCloseTo(50.5 - WALK_SPEED);
    expect(p.x).toBeCloseTo(50.5);
  });

  it('strafes right towards +x at yaw 0', () => {
    const p = stepPlayer(at(50.5, 50.5), input(0, 1), 1, open);
    expect(p.x).toBeCloseTo(50.5 + WALK_SPEED);
    expect(p.z).toBeCloseTo(50.5);
  });

  it('positive yaw turns left: yaw π/2 forward goes west (−x)', () => {
    const p = stepPlayer(at(50.5, 50.5, Math.PI / 2), input(1), 1, open);
    expect(p.x).toBeCloseTo(50.5 - WALK_SPEED);
    expect(p.z).toBeCloseTo(50.5);
  });

  it('sprints at SPRINT_SPEED', () => {
    const p = stepPlayer(at(50.5, 50.5), input(1, 0, true), 1, open);
    expect(50.5 - p.z).toBeCloseTo(SPRINT_SPEED);
  });

  it('normalizes diagonal movement to the same speed', () => {
    const p = stepPlayer(at(50.5, 50.5), input(1, 1), 1, open);
    expect(Math.hypot(p.x - 50.5, p.z - 50.5)).toBeCloseTo(WALK_SPEED);
  });

  it('keeps partial joystick deflection below full speed', () => {
    const p = stepPlayer(at(50.5, 50.5), input(0.5), 1, open);
    expect(50.5 - p.z).toBeCloseTo(WALK_SPEED * 0.5);
  });

  it('does not move with no input, and keeps yaw/pitch', () => {
    const start = { x: 3.5, z: 4.5, yaw: 1, pitch: 0.2 };
    expect(stepPlayer(start, input(0), 1, open)).toEqual(start);
  });

  it('slows by WATER_FACTOR on a slowing tile', () => {
    const wet = grid(100, 100, [], [[50, 50]]);
    const p = stepPlayer(at(50.5, 50.5), input(1), 0.1, wet);
    expect(50.5 - p.z).toBeCloseTo(WALK_SPEED * WATER_FACTOR * 0.1);
  });
});

describe('stepPlayer: collision', () => {
  it('stops against a wall tile ahead', () => {
    const g = grid(10, 10, [[5, 4]]); // tile spans z in [4,5]
    const p = walk(at(5.5, 7.5), input(1), 2, g);
    expect(p.z).toBeCloseTo(5 + r);
    expect(p.x).toBeCloseTo(5.5);
  });

  it('cannot tunnel through a wall in one big step', () => {
    const g = grid(10, 10, [[5, 4]]);
    const p = stepPlayer(at(5.5, 7.5), input(1, 0, true), 1, g);
    expect(p.z).toBeCloseTo(5 + r);
  });

  it('slides along a wall when moving diagonally into it', () => {
    const wall: [number, number][] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => [x, 4]);
    const g = grid(10, 10, wall);
    const p = walk(at(2.5, 6), input(1, 1), 1, g); // north-east into an east-west wall
    expect(p.z).toBeCloseTo(5 + r);
    expect(p.x).toBeGreaterThan(4.5);
  });

  it('stays outside wall tiles from any approach', () => {
    const g = grid(10, 10, [[5, 5]]);
    for (let a = 0; a < 16; a++) {
      const yaw = (a / 16) * Math.PI * 2;
      // Start 2m out, facing the tile centre, and walk well past it.
      const start = at(5.5 + 2 * Math.sin(yaw), 5.5 + 2 * Math.cos(yaw), yaw);
      const p = walk(start, input(1, 0.3), 2, g);
      const dx = p.x - Math.min(Math.max(p.x, 5), 6);
      const dz = p.z - Math.min(Math.max(p.z, 5), 6);
      expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(r - 1e-6);
    }
  });

  it('clamps to the Canvas edge', () => {
    const g = grid(10, 10);
    expect(walk(at(5, 5), input(1), 5, g).z).toBeCloseTo(r);
    expect(walk(at(5, 5), input(-1), 5, g).z).toBeCloseTo(10 - r);
    expect(walk(at(5, 5), input(0, -1), 5, g).x).toBeCloseTo(r);
    expect(walk(at(5, 5), input(0, 1), 5, g).x).toBeCloseTo(10 - r);
  });

  it('lets a player who spawned inside a blocking tile walk out, then the tile is solid', () => {
    const g = grid(10, 10, [[5, 5]]);
    const out = walk(at(5.5, 5.5), input(-1), 1, g); // walk south out of the tile
    expect(out.z).toBeGreaterThan(6 + r);
    const back = walk(out, input(1), 2, g); // and back north into it
    expect(back.z).toBeCloseTo(6 + r);
  });
});

describe('applyLook', () => {
  it('adds yaw and pitch', () => {
    const p = applyLook(at(1, 2), 0.5, 0.25);
    expect(p).toMatchObject({ x: 1, z: 2, yaw: 0.5, pitch: 0.25 });
  });

  it('clamps pitch to ±1.4 rad', () => {
    expect(applyLook(at(0, 0), 0, 5).pitch).toBe(PITCH_LIMIT);
    expect(applyLook(at(0, 0), 0, -5).pitch).toBe(-PITCH_LIMIT);
    expect(PITCH_LIMIT).toBe(1.4);
  });

  it('keeps yaw within ±π without changing the facing', () => {
    const p = applyLook(at(0, 0, 3), 1, 0);
    expect(Math.abs(p.yaw)).toBeLessThanOrEqual(Math.PI);
    expect(Math.sin(p.yaw)).toBeCloseTo(Math.sin(4));
    expect(Math.cos(p.yaw)).toBeCloseTo(Math.cos(4));
  });
});
