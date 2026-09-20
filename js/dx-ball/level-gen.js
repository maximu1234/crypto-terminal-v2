/**
 * Procedural DX-Ball boards — 100 levels with rising difficulty.
 * Hard (invincible/almost) bricks never seal breakable bricks above them.
 */
import { COLS } from "./constants.js?v=2";

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyRow() {
  return Array.from({ length: COLS }, () => null);
}

function cellNormal(color) {
  return { type: "normal", color };
}

function cellExplosive() {
  return { type: "explosive" };
}

function cellMulti(hits = 3) {
  return { type: "multi", hits };
}

function cellInvincible() {
  return { type: "invincible" };
}

function cellAlmost() {
  return { type: "almost" };
}

function cellHidden(color = 3) {
  return { type: "hidden", color };
}

function isHardBlock(cell) {
  return !!(cell && (cell.type === "invincible" || cell.type === "almost"));
}

function isBreakableCell(cell) {
  return !!(cell && !isHardBlock(cell));
}

/**
 * Ball enters from below the brick field (paddle side).
 * Soft cells (empty / breakable) are passable; hard blocks are walls.
 */
function markReachable(grid) {
  const rows = grid.length;
  const seen = Array.from({ length: rows }, () => Array(COLS).fill(false));
  const queue = [];

  for (let c = 0; c < COLS; c++) {
    const cell = grid[rows - 1][c];
    if (!isHardBlock(cell)) {
      seen[rows - 1][c] = true;
      queue.push([rows - 1, c]);
    }
  }

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= COLS) continue;
      if (seen[nr][nc]) continue;
      if (isHardBlock(grid[nr][nc])) continue;
      seen[nr][nc] = true;
      queue.push([nr, nc]);
    }
  }

  return seen;
}

/**
 * Guarantee every breakable brick is reachable from below.
 * Punch gaps in hard walls; never leave a sealed shelf of soft bricks.
 */
function ensurePlayable(grid) {
  const rows = grid.length;
  if (!rows) return grid;

  /* Bottom brick row (closest to paddle) must never be a hard wall. */
  for (let c = 0; c < COLS; c++) {
    if (isHardBlock(grid[rows - 1][c])) {
      grid[rows - 1][c] = cellNormal((c + rows) % 10);
    }
  }

  for (let guard = 0; guard < 24; guard++) {
    const reach = markReachable(grid);
    let fixed = false;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!isBreakableCell(grid[r][c]) || reach[r][c]) continue;

        /* Open a vertical corridor from this cell down to the paddle side. */
        for (let rr = r; rr < rows; rr++) {
          if (isHardBlock(grid[rr][c])) {
            grid[rr][c] = null;
            fixed = true;
          }
        }
        /* Also open one side gap on the sealing row below, if any. */
        for (let rr = r + 1; rr < rows; rr++) {
          if (!isHardBlock(grid[rr][c])) continue;
          const side = c > 0 ? c - 1 : c + 1;
          if (side >= 0 && side < COLS && isHardBlock(grid[rr][side])) {
            grid[rr][side] = null;
            fixed = true;
          }
        }
      }
    }

    /* No full-width hard barrier on any row. */
    for (let r = 0; r < rows; r++) {
      let hard = 0;
      for (let c = 0; c < COLS; c++) {
        if (isHardBlock(grid[r][c])) hard++;
      }
      if (hard >= COLS - 1) {
        for (let c = 1; c < COLS; c += 4) {
          if (isHardBlock(grid[r][c])) {
            grid[r][c] = null;
            fixed = true;
          }
        }
      }
    }

    if (!fixed) break;
  }

  /* If anything breakable is still sealed, convert hard blocks under it to soft. */
  const reach = markReachable(grid);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isBreakableCell(grid[r][c]) || reach[r][c]) continue;
      for (let rr = r + 1; rr < rows; rr++) {
        if (isHardBlock(grid[rr][c])) {
          grid[rr][c] = cellNormal((rr + c) % 10);
        }
      }
    }
  }

  return grid;
}

function paintStripe(rows, rand, diff) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const line = emptyRow();
    const color = (r + Math.floor(rand() * 3)) % 10;
    for (let c = 0; c < COLS; c++) {
      if (diff > 0.45 && rand() < 0.08) line[c] = cellMulti(3);
      else if (diff > 0.6 && rand() < 0.05) line[c] = cellExplosive();
      else line[c] = cellNormal(color);
    }
    grid.push(line);
  }
  return grid;
}

function paintChecker(rows, rand, diff) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const line = emptyRow();
    for (let c = 0; c < COLS; c++) {
      if ((r + c) % 2 !== 0) continue;
      const color = (c + r) % 10;
      if (diff > 0.5 && rand() < 0.1) line[c] = cellHidden(color);
      else line[c] = cellNormal(color);
    }
    grid.push(line);
  }
  return grid;
}

function paintPyramid(rows, rand, diff) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const line = emptyRow();
    const span = Math.min(COLS, 2 + r * 2);
    const start = Math.floor((COLS - span) / 2);
    for (let c = start; c < start + span; c++) {
      const color = (rows - r) % 10;
      if (diff > 0.55 && rand() < 0.12) line[c] = cellMulti(3);
      else line[c] = cellNormal(color);
    }
    grid.push(line);
  }
  return grid;
}

function paintFrame(rows, rand, diff) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const line = emptyRow();
    for (let c = 0; c < COLS; c++) {
      /* Never hard-block the bottom edge — that sealed entire boards. */
      const border =
        r === 0 || c === 0 || c === COLS - 1;
      if (border) {
        /* Leave gaps in side walls so the ball can weave in. */
        if ((c === 0 || c === COLS - 1) && r > 0 && r % 3 === 0) {
          line[c] = null;
        } else {
          line[c] =
            diff > 0.7 && rand() < 0.35 ? cellInvincible() : cellAlmost();
        }
      } else if (rand() < 0.55 + diff * 0.25) {
        const color = (r * 3 + c) % 10;
        if (rand() < 0.12) line[c] = cellExplosive();
        else if (rand() < 0.15) line[c] = cellMulti(3);
        else line[c] = cellNormal(color);
      }
    }
    grid.push(line);
  }
  return grid;
}

function paintScatter(rows, rand, diff) {
  const grid = [];
  const density = 0.35 + diff * 0.4;
  for (let r = 0; r < rows; r++) {
    const line = emptyRow();
    for (let c = 0; c < COLS; c++) {
      if (rand() > density) continue;
      const roll = rand();
      /* Hard blocks only high up, sparse, never on bottom 2 rows. */
      if (r < rows - 2 && diff > 0.75 && roll < 0.06) line[c] = cellAlmost();
      else if (diff > 0.4 && roll < 0.08) line[c] = cellExplosive();
      else if (diff > 0.5 && roll < 0.18) line[c] = cellMulti(2 + Math.floor(diff * 2));
      else if (diff > 0.65 && roll < 0.24) line[c] = cellHidden((c + r) % 10);
      else line[c] = cellNormal((c + r * 2) % 10);
    }
    grid.push(line);
  }
  return grid;
}

function paintDiamonds(rows, rand, diff) {
  const grid = [];
  const cx = (COLS - 1) / 2;
  const cy = (rows - 1) / 2;
  for (let r = 0; r < rows; r++) {
    const line = emptyRow();
    for (let c = 0; c < COLS; c++) {
      const d = Math.abs(c - cx) + Math.abs(r - cy);
      if (d > rows * 0.55) continue;
      if (d % 2 === 1 && rand() < 0.4) continue;
      const color = Math.floor(d) % 10;
      if (diff > 0.55 && d < 2 && rand() < 0.4) line[c] = cellMulti(3);
      else line[c] = cellNormal(color);
    }
    grid.push(line);
  }
  return grid;
}

const PATTERNS = [
  paintStripe,
  paintChecker,
  paintPyramid,
  paintFrame,
  paintScatter,
  paintDiamonds
];

const NAMES = [
  "Drift",
  "Pulse",
  "Cascade",
  "Lattice",
  "Forge",
  "Mirage",
  "Vertex",
  "Orbit",
  "Shard",
  "Nova",
  "Ridge",
  "Flux"
];

/**
 * @param {number} index 0-based
 * @param {number} [seed]
 */
export function generateLevel(index, seed = 0xd8b011 + index * 9973) {
  const rand = mulberry32(seed >>> 0);
  const diff = Math.min(1, index / 99);
  const rows = Math.min(
    14,
    5 + Math.floor(diff * 7) + (rand() < 0.35 ? 1 : 0)
  );
  const pattern = PATTERNS[Math.floor(rand() * PATTERNS.length)];
  const bricks = ensurePlayable(pattern(rows, rand, diff));
  const name = `${NAMES[index % NAMES.length]} ${index + 1}`;
  return { name, bricks };
}

export function buildEndlessLevels(count = 100) {
  const levels = [];
  for (let i = 0; i < count; i++) {
    levels.push(generateLevel(i));
  }
  return levels;
}

/** Test helper: count sealed breakables (should be 0 after ensurePlayable). */
export function countUnreachableBreakables(grid) {
  const reach = markReachable(grid);
  let n = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < COLS; c++) {
      if (isBreakableCell(grid[r][c]) && !reach[r][c]) n++;
    }
  }
  return n;
}
