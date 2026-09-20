/** @typedef {'normal'|'explosive'|'multi'|'invincible'|'almost'|'hidden'} BrickType */
/** @typedef {'pos'|'neu'|'neg'} PowerKind */

/** Reference playfield (physics feel tuned at this size). */
export const REF_W = 800;
export const REF_H = 600;

/** Live playfield — updated by syncPlayfieldFromHost (ESM live bindings). */
export let W = REF_W;
export let H = REF_H;
export let PLAY_TOP = 56;
export let PLAY_BOTTOM = 560;
export let BRICK_OFFSET_Y = 64;
export let PADDLE_Y = 540;
/** Multiplier so vertical travel time stays similar on taller panels. */
export let SPEED_SCALE = 1;

export const BRICK_W = 40;
export const BRICK_H = 20;
export const COLS = 20;
export const ROWS = 16;
export const BRICK_OFFSET_X = 0;

export const PADDLE_HEIGHT = 14;
export const PADDLE_SIZES = [48, 72, 96, 128, 160]; // index 1 = default
export const DEFAULT_PADDLE_SIZE = 1;

export const BALL_R = 7;
export const BALL_R_SMALL = 4;
export const BALL_R_MEGA = 12;
export const BASE_SPEED = 4.2;
export const MIN_SPEED = 3.0;
export const MAX_SPEED = 7.8;
export const SUPER_SPEED = 6.8;

export const START_LIVES = 3;
export const POWERUP_FALL_SPEED = 2.2;
export const POWERUP_SIZE = 22;
export const POWERUP_SPAWN_CHANCE = 0.18;
export const POWERUP_COOLDOWN_MS = 2800;

export const CHARM_THRESHOLD = 0.75;
export const LIGHTNING_TIMEOUT_MS = 45000;
export const STUCK_HITS = 80;
export const GOLD_BALL_MS = 4000;

export const BRICK_COLORS = [
  "#e74c3c",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#1abc9c",
  "#3498db",
  "#9b59b6",
  "#ecf0f1",
  "#fd79a8",
  "#00cec9"
];

/** Super DX-Ball classic power-up set (DX-Ball 2 clones, no 20AE exclusives). */
export const POWERUPS = {
  extraLife: { id: "extraLife", name: "Extra Life", kind: "pos", weight: 2, color: "#3dff8a", letter: "1UP" },
  levelWarp: { id: "levelWarp", name: "Level Warp", kind: "pos", weight: 2, color: "#3dff8a", letter: "W" },
  grab: { id: "grab", name: "Grab Paddle", kind: "pos", weight: 8, color: "#3dff8a", letter: "G" },
  laser: { id: "laser", name: "Laser Paddle", kind: "pos", weight: 5, color: "#3dff8a", letter: "L" },
  fireball: { id: "fireball", name: "Fire Ball", kind: "pos", weight: 5, color: "#3dff8a", letter: "F" },
  explode: { id: "explode", name: "Set-Off Explode", kind: "pos", weight: 7, color: "#3dff8a", letter: "E" },
  thru: { id: "thru", name: "Thru Brick", kind: "pos", weight: 5, color: "#3dff8a", letter: "T" },
  expandExplode: { id: "expandExplode", name: "Expand Explode", kind: "pos", weight: 7, color: "#3dff8a", letter: "X" },
  zap: { id: "zap", name: "Zap Bricks", kind: "pos", weight: 7, color: "#3dff8a", letter: "Z" },
  slow: { id: "slow", name: "Slow Ball", kind: "pos", weight: 8, color: "#3dff8a", letter: "S" },

  expand: { id: "expand", name: "Expand Paddle", kind: "neu", weight: 8, color: "#9aa4b2", letter: "+" },
  shrink: { id: "shrink", name: "Shrink Paddle", kind: "neu", weight: 8, color: "#9aa4b2", letter: "−" },
  split: { id: "split", name: "Split Ball", kind: "neu", weight: 8, color: "#9aa4b2", letter: "2" },
  eight: { id: "eight", name: "Eight Balls", kind: "neu", weight: 5, color: "#9aa4b2", letter: "8" },
  mega: { id: "mega", name: "Mega Ball", kind: "neu", weight: 8, color: "#9aa4b2", letter: "M" },

  kill: { id: "kill", name: "Kill Paddle", kind: "neg", weight: 14, color: "#ff3b4a", letter: "K" },
  superShrink: { id: "superShrink", name: "Super Shrink", kind: "neg", weight: 12, color: "#ff3b4a", letter: "SS" },
  fast: { id: "fast", name: "Fast Ball", kind: "neg", weight: 12, color: "#ff3b4a", letter: ">>" },
  shrinkBall: { id: "shrinkBall", name: "Shrink Ball", kind: "neg", weight: 12, color: "#ff3b4a", letter: "o" },
  falling: { id: "falling", name: "Falling Bricks", kind: "neg", weight: 12, color: "#ff3b4a", letter: "↓" }
};

export const POWERUP_LIST = Object.values(POWERUPS);

export const KIND_BG = {
  pos: "#1a3d28",
  neu: "#2a3038",
  neg: "#3d1a1e"
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/**
 * Fit logical playfield to host CSS size (full panel height, fixed ref width).
 * Ball speeds scale with height so taller panels do not feel sluggish.
 */
export function syncPlayfieldFromHost(cssW, cssH) {
  const aw = Math.max(1, Number(cssW) || REF_W);
  const ah = Math.max(1, Number(cssH) || REF_H);
  const aspect = ah / aw;

  W = REF_W;
  H = Math.round(clamp(REF_W * aspect, 520, 1400));
  PLAY_TOP = 56;
  BRICK_OFFSET_Y = 64;
  PADDLE_Y = H - 60;
  PLAY_BOTTOM = PADDLE_Y + PADDLE_HEIGHT;
  SPEED_SCALE = H / REF_H;
}

export function scaledSpeed(base) {
  return base * SPEED_SCALE;
}
