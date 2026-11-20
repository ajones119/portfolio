import type { Size, View } from '../viewport';

/** A camera pose: world position plus yaw and pitch (radians; yaw 0 faces north, −Z; pitch −π/2 looks straight down). */
export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export const EYE_HEIGHT = 1.7;
export const DIVE_SECONDS = 1.6;
export const FADE_SECONDS = 0.2;

/**
 * The straight-down camera that frames the ground exactly as the 2D view shows
 * the Canvas: same center, same Pixels per screen height. `fov` is the vertical
 * field of view in degrees.
 */
export function topDownPose(view: View, viewport: Size, fov: number): Pose {
  const worldPerScreenHeight = viewport.height / view.scale;
  return {
    x: (viewport.width / 2 - view.x) / view.scale,
    y: worldPerScreenHeight / 2 / Math.tan((fov * Math.PI) / 360),
    z: (viewport.height / 2 - view.y) / view.scale,
    yaw: 0,
    pitch: -Math.PI / 2,
  };
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const smoothstep = (a: number, b: number, t: number) => {
  const x = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return x * x * (3 - 2 * x);
};

/** The yaw equal to `yaw`, modulo a full turn, closest to `to`, so the camera never spins the long way round. */
export function nearestYaw(yaw: number, to: number): number {
  const turn = Math.PI * 2;
  return yaw + Math.round((to - yaw) / turn) * turn;
}

/**
 * The dive from a high, straight-down pose to standing at eye height, at
 * progress t in [0, 1]. Height falls on a log curve so it feels like a steady
 * zoom; the camera keeps looking down until late, then swings up to the horizon.
 */
export function divePose(high: Pose, ground: Pose, t: number): Pose {
  const e = easeInOutCubic(Math.min(Math.max(t, 0), 1));
  const lift = smoothstep(0.5, 1, t);
  const yaw = nearestYaw(ground.yaw, high.yaw);
  return {
    x: high.x + (ground.x - high.x) * e,
    y: Math.exp(Math.log(high.y) + (Math.log(ground.y) - Math.log(high.y)) * e),
    z: high.z + (ground.z - high.z) * e,
    yaw: high.yaw + (yaw - high.yaw) * smoothstep(0.3, 1, t),
    pitch: high.pitch + (ground.pitch - high.pitch) * lift,
  };
}
