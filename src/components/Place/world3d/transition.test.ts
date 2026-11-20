import { describe, expect, it } from 'vitest';
import { divePose, EYE_HEIGHT, nearestYaw, topDownPose } from './transition';

describe('topDownPose', () => {
  it('centers on the Canvas point under the middle of the viewport, looking straight down', () => {
    const pose = topDownPose({ scale: 4, x: 0, y: 0 }, { width: 400, height: 600 }, 90);
    expect(pose.x).toBeCloseTo(50);
    expect(pose.z).toBeCloseTo(75);
    expect(pose.pitch).toBeCloseTo(-Math.PI / 2);
  });

  it('flies high enough that one screen height covers the same Pixels as the 2D view', () => {
    // 600 px tall at 4 px per Pixel shows 150 Pixels; with a 90° fov that needs a height of 75.
    expect(topDownPose({ scale: 4, x: 0, y: 0 }, { width: 400, height: 600 }, 90).y).toBeCloseTo(75);
  });
});

describe('divePose', () => {
  const high = { x: 100, y: 200, z: 100, yaw: 0, pitch: -Math.PI / 2 };
  const ground = { x: 40, y: EYE_HEIGHT, z: 60, yaw: 0, pitch: 0 };

  it('starts at the high pose and ends standing at eye height facing the horizon', () => {
    const start = divePose(high, ground, 0);
    for (const key of ['x', 'y', 'z', 'yaw', 'pitch'] as const) expect(start[key]).toBeCloseTo(high[key]);
    const end = divePose(high, ground, 1);
    expect(end.x).toBeCloseTo(40);
    expect(end.y).toBeCloseTo(EYE_HEIGHT);
    expect(end.z).toBeCloseTo(60);
    expect(end.pitch).toBeCloseTo(0);
  });

  it('keeps looking straight down for the first half', () => {
    expect(divePose(high, ground, 0.45).pitch).toBeCloseTo(-Math.PI / 2);
  });

  it('only ever descends', () => {
    let last = Infinity;
    for (let t = 0; t <= 1; t += 0.05) {
      const { y } = divePose(high, ground, t);
      expect(y).toBeLessThanOrEqual(last + 1e-9);
      last = y;
    }
  });
});

describe('nearestYaw', () => {
  it('picks the equivalent yaw closest to the target', () => {
    expect(nearestYaw(Math.PI * 2 + 0.1, 0)).toBeCloseTo(0.1);
    expect(nearestYaw(-Math.PI * 4 - 0.2, 0)).toBeCloseTo(-0.2);
  });
});
