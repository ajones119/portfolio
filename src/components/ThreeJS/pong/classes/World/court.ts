export const COURT_SIZE = 10;
export const HALF_COURT = COURT_SIZE / 2;

export const PADDLE_SIZE = { x: 1, y: 0.25, z: 0.25 };

export const PADDLE_HALF = {
  x: PADDLE_SIZE.x / 2,
  y: PADDLE_SIZE.y / 2,
  z: PADDLE_SIZE.z / 2,
};

/** Flat disk puck — radius ~44% of paddle width */
export const PUCK_RADIUS = 0.22;
export const PUCK_HEIGHT = 0.12;

/** How far a paddle center can travel along X */
export const PADDLE_X_LIMIT = HALF_COURT - PADDLE_HALF.x;

/** How far the puck center can travel along X/Z before wall bounce */
export const PUCK_X_LIMIT = HALF_COURT - PUCK_RADIUS;
export const PUCK_Z_LIMIT = HALF_COURT - PUCK_RADIUS;

/** Paddle centers sit flush with the near/far court edges */
export const PLAYER_PADDLE_Z = HALF_COURT - PADDLE_HALF.z;
export const ENEMY_PADDLE_Z = -PLAYER_PADDLE_Z;

export const PADDLE_Y = PADDLE_HALF.y;
export const PUCK_Y = PUCK_HEIGHT / 2;

/** Center court divider sitting flush on the floor */
export const DIVIDER_HEIGHT = 0.02;
export const DIVIDER_DEPTH = 0.06;
export const DIVIDER_Y = DIVIDER_HEIGHT / 2 + 0.001;

/** Goal lines at the near/far court edges */
export const GOAL_HEIGHT = DIVIDER_HEIGHT;
export const GOAL_DEPTH = DIVIDER_DEPTH;
export const GOAL_Y = DIVIDER_Y;
export const PLAYER_GOAL_Z = HALF_COURT;
export const ENEMY_GOAL_Z = -HALF_COURT;

/** Side walls along left/right court edges */
export const WALL_HEIGHT = 0.35;
export const WALL_DEPTH = 0.08;
export const WALL_Y = WALL_HEIGHT / 2;
export const LEFT_WALL_X = -HALF_COURT;
export const RIGHT_WALL_X = HALF_COURT;

export const PLAYER_SIDE_COLOR = 0x00ff00;
export const ENEMY_SIDE_COLOR = 0xff0000;
