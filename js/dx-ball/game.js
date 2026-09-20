import {
  W, H, BRICK_W, BRICK_H, COLS, ROWS, BRICK_OFFSET_X, BRICK_OFFSET_Y,
  PADDLE_HEIGHT, PADDLE_Y, PADDLE_SIZES, DEFAULT_PADDLE_SIZE,
  BALL_R, BALL_R_SMALL, BALL_R_MEGA, BASE_SPEED, MIN_SPEED, MAX_SPEED, SUPER_SPEED,
  START_LIVES, POWERUP_FALL_SPEED, POWERUP_SIZE, POWERUP_SPAWN_CHANCE, POWERUP_COOLDOWN_MS,
  CHARM_THRESHOLD, LIGHTNING_TIMEOUT_MS, STUCK_HITS, GOLD_BALL_MS,
  BRICK_COLORS, POWERUPS, POWERUP_LIST, KIND_BG,
  scaledSpeed, syncPlayfieldFromHost,
} from './constants.js?v=2';
import { getPack } from './levels.js?v=3';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function pickWeighted(list) {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of list) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return list[list.length - 1];
}

export class Game {
  constructor(canvas, input, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.audio = audio;
    this.fitToHost();

    this.mode = 'title'; // title | pack | playing | paused | clear | gameover | help
    this.packId = 'classic';
    this.levelIndex = 0;
    this.score = 0;
    this.lives = START_LIVES;
    this.highScore = +(localStorage.getItem('sdxb_hi') || 0);
    this.charmsCollected = 0;
    this.menuIndex = 0;
    this.flash = null;
    this.messages = [];
    this.particles = [];
    this.floatScores = [];
    this._ignoreLockLoss = false;
    this._pauseAt = 0;

    this.input.onLockChange((locked) => {
      // Browser Esc (or Alt-Tab) releases the pointer — treat as pause
      if (!locked && this.mode === 'playing' && !this._ignoreLockLoss) {
        this.pauseGame();
      }
    });

    this.resetRun();
  }

  resetRun() {
    this.score = 0;
    this.lives = START_LIVES;
    this.levelIndex = 0;
    this.charmsCollected = 0;
  }

  /** Match canvas buffer + physics to the Terminal host panel size. */
  fitToHost() {
    const host = this.canvas?.closest?.('.terminal-dxball-host') || this.canvas?.parentElement;
    const rect = host?.getBoundingClientRect?.();
    const cssW = Math.max(120, rect?.width || this.canvas.clientWidth || 800);
    const cssH = Math.max(160, rect?.height || this.canvas.clientHeight || 600);
    syncPlayfieldFromHost(cssW, cssH);
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
  }

  startPack(packId) {
    this.packId = packId;
    this.resetRun();
    this.loadLevel(0);
    this.resumeGame();
  }

  pauseGame() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this._pauseAt = performance.now();
    this._ignoreLockLoss = true;
    this.input.exitLock();
    this._ignoreLockLoss = false;
    this.canvas.classList.remove('is-playing');
  }

  resumeGame() {
    this.mode = 'playing';
    this.canvas.classList.add('is-playing');
    // Sync virtual cursor to paddle center, then lock
    this.input.syncX(this.paddleX + this.paddleWidth() / 2);
    this.input.requestLock();
  }

  goToTitle() {
    this.mode = 'title';
    this.menuIndex = 0;
    this._ignoreLockLoss = true;
    this.input.exitLock();
    this._ignoreLockLoss = false;
    this.canvas.classList.remove('is-playing');
  }

  toggleSound() {
    /* Sound removed — game is silent in Terminal. */
  }

  titleMenuHitIndex(mouseY) {
    const baseY = Math.min(H - 180, Math.max(340, Math.round(H * 0.58)));
    for (let i = 0; i < 2; i++) {
      const y = baseY + i * 36;
      if (mouseY >= y - 18 && mouseY <= y + 14) return i;
    }
    return -1;
  }

  packMenuHitIndex(mouseY) {
    const baseY = Math.min(H - 360, Math.max(160, Math.round(H * 0.28)));
    for (let i = 0; i < 3; i++) {
      const y = baseY + i * 100;
      if (mouseY >= y && mouseY <= y + 84) return i;
    }
    return -1;
  }

  get pack() { return getPack(this.packId); }
  get level() { return this.pack.levels[this.levelIndex]; }

  loadLevel(index) {
    this.levelIndex = index;
    const def = this.pack.levels[index];
    this.bricks = [];
    this.initialBreakable = 0;
    const rows = def.bricks;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const cell = rows[r][c];
        if (!cell) continue;
        const brick = {
          c, r,
          x: BRICK_OFFSET_X + c * BRICK_W,
          y: BRICK_OFFSET_Y + r * BRICK_H,
          w: BRICK_W - 1,
          h: BRICK_H - 1,
          type: cell.type,
          color: cell.color ?? (cell.type === 'explosive' ? 0 : 3),
          hits: cell.hits ?? (cell.type === 'multi' ? 3 : 1),
          maxHits: cell.hits ?? (cell.type === 'multi' ? 3 : 1),
          revealed: cell.type !== 'hidden',
          alive: true,
        };
        this.bricks.push(brick);
        if (this.isBreakable(brick)) this.initialBreakable++;
      }
    }

    this.powerups = [];
    this.lasers = [];
    this.charm = null;
    this.charmSpawned = false;
    this.falling = false;
    this.fallFloor = BRICK_OFFSET_Y + 12 * BRICK_H;
    this.stuckHits = 0;
    this.lastBrickBreak = performance.now();
    this.lightningTimer = null;
    this.goldUntil = 0;
    this.powerCooldownUntil = 0;
    this.levelAnnounce = performance.now() + 1600;
    this.effects = {
      grab: false,
      laser: false,
      fireball: false,
      thru: false,
      ballSize: 'normal', // normal | small | mega
    };
    this.paddleSizeIdx = DEFAULT_PADDLE_SIZE;
    this.resetBallOnPaddle(true);
  }

  isBreakable(b) {
    if (!b.alive) return false;
    if (b.type === 'invincible') return false;
    return true;
  }

  breakableCount() {
    return this.bricks.filter((b) => b.alive && this.isBreakable(b)).length;
  }

  paddleWidth() {
    return PADDLE_SIZES[this.paddleSizeIdx];
  }

  ballRadius() {
    if (this.effects.ballSize === 'small') return BALL_R_SMALL;
    if (this.effects.ballSize === 'mega') return BALL_R_MEGA;
    return BALL_R;
  }

  resetBallOnPaddle(fresh = false) {
    const pw = this.paddleWidth();
    this.paddleX = W / 2 - pw / 2;
    this.balls = [{
      x: W / 2,
      y: PADDLE_Y - this.ballRadius() - 2,
      vx: 0,
      vy: 0,
      speed: scaledSpeed(BASE_SPEED),
      stuck: true,
      stuckOffset: 0,
    }];
    this.effects.grab = true; // start-of-life grab
    this.startingGrab = true;
    if (fresh) {
      this.effects.laser = false;
      this.effects.fireball = false;
      this.effects.thru = false;
      this.effects.ballSize = 'normal';
      this.paddleSizeIdx = DEFAULT_PADDLE_SIZE;
      this.falling = false;
    }
  }

  releaseBalls() {
    let released = false;
    for (const b of this.balls) {
      if (!b.stuck) continue;
      b.stuck = false;
      released = true;
      const angle = -Math.PI / 2 + 0.35; // slightly right like original
      b.vx = Math.cos(angle) * b.speed;
      b.vy = Math.sin(angle) * b.speed;
    }
    // Temporary start-of-board / start-of-life grab ends on first launch
    if (this.startingGrab && released) {
      this.effects.grab = false;
      this.startingGrab = false;
    }
  }

  releaseCaught() {
    for (const b of this.balls) {
      if (b.stuck && !this.startingGrab) {
        b.stuck = false;
        if (b.vx === 0 && b.vy === 0) {
          const angle = -Math.PI / 2 + rand(-0.4, 0.4);
          b.vx = Math.cos(angle) * b.speed;
          b.vy = Math.sin(angle) * b.speed;
        }
      }
    }
  }

  addScore(n, x, y) {
    this.score += n;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('sdxb_hi', String(this.highScore));
    }
    if (x != null) {
      this.floatScores.push({ x, y, text: `+${n}`, life: 0.7, vy: -30 });
    }
  }

  brickPoints(ball) {
    let pts = Math.round(8 + ball.speed * 4);
    if (this.effects.ballSize === 'small') pts = Math.round(pts * 1.5);
    if (this.paddleSizeIdx === 0) pts = Math.round(pts * 1.5);
    return clamp(pts, 9, 50);
  }

  spawnPowerup(brick, ball) {
    const now = performance.now();
    if (now < this.powerCooldownUntil) {
      if (Math.random() > 0.08) return;
    } else if (Math.random() > POWERUP_SPAWN_CHANCE) return;

    const def = pickWeighted(POWERUP_LIST);
    const dir = Math.atan2(ball.vy, ball.vx);
    this.powerups.push({
      id: def.id,
      x: brick.x + brick.w / 2,
      y: brick.y + brick.h / 2,
      vx: Math.cos(dir) * rand(0.5, 1.8),
      vy: Math.sin(dir) * rand(0.2, 1.2) + scaledSpeed(POWERUP_FALL_SPEED),
      wobble: rand(0, Math.PI * 2),
    });
    this.powerCooldownUntil = now + POWERUP_COOLDOWN_MS;
  }

  destroyBrick(brick, opts = {}) {
    if (!brick.alive) return;
    const { ball = null, explosion = false, laser = false, silent = false } = opts;

    if (brick.type === 'invincible' && !this.effects.thru && !this.isGold() && !explosion) {
      this.stuckHits++;
      if (this.stuckHits >= STUCK_HITS) this.applyZap();
      return;
    }

    if (brick.type === 'hidden' && !brick.revealed) {
      brick.revealed = true;
      brick.type = 'normal';
      if (!silent) this.audio.brick(2);
      this.stuckHits = 0;
      return;
    }

    if (brick.type === 'almost' && !explosion && !this.effects.thru && !this.isGold() && !this.effects.fireball) {
      brick.type = 'invincible';
      this.addScore(2, brick.x + brick.w / 2, brick.y);
      if (!silent) this.audio.brick(1);
      this.stuckHits = 0;
      this.lastBrickBreak = performance.now();
      return;
    }

    if (brick.type === 'multi' && brick.hits > 1 && !explosion && !this.effects.thru && !this.isGold() && !(ball && ball.speed >= scaledSpeed(SUPER_SPEED)) && !this.effects.fireball) {
      brick.hits--;
      this.addScore(2, brick.x + brick.w / 2, brick.y);
      if (!silent) this.audio.brick(brick.hits);
      this.stuckHits = 0;
      this.lastBrickBreak = performance.now();
      return;
    }

    // Destroy
    brick.alive = false;
    this.stuckHits = 0;
    this.lastBrickBreak = performance.now();
    this.lightningTimer = null;

    let pts;
    if (explosion || laser || this.effects.fireball) pts = 8;
    else if (ball) pts = this.brickPoints(ball);
    else pts = 8;
    this.addScore(pts, brick.x + brick.w / 2, brick.y);
    this.burst(brick.x + brick.w / 2, brick.y + brick.h / 2, this.brickColor(brick));
    if (!silent) {
      if (brick.type === 'explosive' || explosion) this.audio.explode();
      else this.audio.brick(brick.color || 0);
    }

    if (ball && !explosion && !laser) this.spawnPowerup(brick, ball);

    if (brick.type === 'explosive' || this.effects.fireball) {
      this.explodeAround(brick);
    }

    this.checkCharm();
    if (this.breakableCount() === 0) this.onLevelClear();
  }

  explodeAround(center) {
    const queue = [center];
    const seen = new Set([center]);
    while (queue.length) {
      const cur = queue.shift();
      const neighbors = this.bricks.filter(
        (b) => b.alive && !seen.has(b) && Math.abs(b.c - cur.c) <= 1 && Math.abs(b.r - cur.r) <= 1
      );
      for (const b of neighbors) {
        seen.add(b);
        const wasExplosive = b.type === 'explosive';
        if (b.type === 'hidden') b.revealed = true;
        b.alive = false;
        this.addScore(8, b.x + b.w / 2, b.y);
        this.burst(b.x + b.w / 2, b.y + b.h / 2, this.brickColor(b));
        if (wasExplosive) queue.push(b);
      }
    }
    this.stuckHits = 0;
    this.lastBrickBreak = performance.now();
    this.checkCharm();
    if (this.breakableCount() === 0) this.onLevelClear();
  }

  checkCharm() {
    if (this.charmSpawned || this.initialBreakable === 0) return;
    const destroyed = this.initialBreakable - this.breakableCount();
    if (destroyed / this.initialBreakable >= CHARM_THRESHOLD || this.initialBreakable === 1) {
      this.charmSpawned = true;
      // find empty spot in playfield
      let x = rand(60, W - 60);
      let y = rand(BRICK_OFFSET_Y + 20, PADDLE_Y - 120);
      this.charm = { x, y, r: 14, pulse: 0 };
    }
  }

  onLevelClear() {
    this.audio.levelClear();
    this.mode = 'clear';
    this.clearTimer = performance.now() + 1800;
    this.pushMsg('BOARD CLEAR!', '#3dff8a');
  }

  nextLevel() {
    if (this.levelIndex + 1 >= this.pack.levels.length) {
      this.mode = 'gameover';
      this.pushMsg('PACK COMPLETE!', '#ffb020');
      this._ignoreLockLoss = true;
      this.input.exitLock();
      this._ignoreLockLoss = false;
      this.canvas.classList.remove('is-playing');
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.mode = 'playing';
    this.canvas.classList.add('is-playing');
    this.input.syncX(this.paddleX + this.paddleWidth() / 2);
    // Keep lock if we still have it; otherwise ask again
    if (!this.input.isLocked()) this.input.requestLock();
  }

  loseLife() {
    this.audio.lifeLost();
    this.lives--;
    this.powerups = [];
    this.lasers = [];
    this.charm = null;
    this.falling = false;
    this.effects.grab = false;
    this.effects.laser = false;
    this.effects.fireball = false;
    this.effects.thru = false;
    this.effects.ballSize = 'normal';
    this.paddleSizeIdx = DEFAULT_PADDLE_SIZE;
    this.goldUntil = 0;
    this.lightningTimer = null;
    if (this.lives <= 0) {
      this.mode = 'gameover';
      this._ignoreLockLoss = true;
      this.input.exitLock();
      this._ignoreLockLoss = false;
      this.canvas.classList.remove('is-playing');
      return;
    }
    this.resetBallOnPaddle(true);
  }

  isGold() {
    return performance.now() < this.goldUntil;
  }

  applyZap() {
    this.stuckHits = 0;
    this.pushMsg('ZAP!', '#3de0ff');
    this.audio.lightning();
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (b.type === 'invincible' || b.type === 'almost') {
        b.type = 'normal';
        b.color = 4;
      }
      if (b.type === 'multi') b.hits = 1;
      if (b.type === 'hidden') {
        b.revealed = true;
        b.type = 'normal';
      }
    }
    this.flash = { color: 'rgba(61,224,255,0.25)', until: performance.now() + 200 };
  }

  applyPowerup(id) {
    const def = POWERUPS[id];
    this.addScore(50);
    this.audio.power(def.kind);
    this.pushMsg(def.name, def.color);
    if (def.kind === 'neg') this.flash = { color: 'rgba(255,59,74,0.2)', until: performance.now() + 250 };

    const release = () => this.releaseCaught();

    switch (id) {
      case 'extraLife':
        this.lives++;
        // Super DX-Ball: Extra Life does NOT remove grab/laser
        break;
      case 'levelWarp':
        this.onLevelClear();
        break;
      case 'grab':
        this.effects.grab = true;
        this.startingGrab = false;
        break;
      case 'laser':
        release();
        this.effects.laser = true;
        break;
      case 'fireball':
        release();
        this.effects.fireball = true;
        this.effects.thru = false;
        break;
      case 'thru':
        this.effects.thru = true;
        break;
      case 'explode':
        for (const b of [...this.bricks]) {
          if (b.alive && b.type === 'explosive') this.destroyBrick(b, { explosion: true });
        }
        break;
      case 'expandExplode': {
        const explosives = this.bricks.filter((b) => b.alive && b.type === 'explosive');
        const add = [];
        for (const e of explosives) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nc = e.c + dc;
              const nr = e.r + dr;
              if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
              let target = this.bricks.find((b) => b.c === nc && b.r === nr && b.alive);
              if (!target) {
                target = {
                  c: nc, r: nr,
                  x: BRICK_OFFSET_X + nc * BRICK_W,
                  y: BRICK_OFFSET_Y + nr * BRICK_H,
                  w: BRICK_W - 1, h: BRICK_H - 1,
                  type: 'explosive', color: 0, hits: 1, maxHits: 1, revealed: true, alive: true,
                };
                add.push(target);
              } else {
                target.type = 'explosive';
              }
            }
          }
        }
        this.bricks.push(...add);
        break;
      }
      case 'zap':
        this.applyZap();
        break;
      case 'slow':
        release();
        for (const b of this.balls) {
          b.speed = scaledSpeed(MIN_SPEED);
          const mag = Math.hypot(b.vx, b.vy) || 1;
          b.vx = (b.vx / mag) * b.speed;
          b.vy = (b.vy / mag) * b.speed;
        }
        this.effects.thru = false;
        this.effects.fireball = false;
        break;
      case 'expand':
        release();
        this.paddleSizeIdx = Math.min(PADDLE_SIZES.length - 1, this.paddleSizeIdx + 1);
        break;
      case 'shrink':
        release();
        this.paddleSizeIdx = Math.max(0, this.paddleSizeIdx - 1);
        break;
      case 'superShrink':
        release();
        this.paddleSizeIdx = 0;
        break;
      case 'split':
        release();
        this.splitBalls(2);
        break;
      case 'eight':
        release();
        this.splitBalls(8, true);
        break;
      case 'mega':
        release();
        this.effects.ballSize = 'mega';
        break;
      case 'shrinkBall':
        release();
        this.effects.ballSize = 'small';
        break;
      case 'fast':
        release();
        for (const b of this.balls) {
          // Super DX-Ball: only slight speed-up
          b.speed = clamp(b.speed + scaledSpeed(1.2), scaledSpeed(MIN_SPEED), scaledSpeed(MAX_SPEED));
          const mag = Math.hypot(b.vx, b.vy) || 1;
          b.vx = (b.vx / mag) * b.speed;
          b.vy = (b.vy / mag) * b.speed;
        }
        break;
      case 'kill':
        this.loseLife();
        break;
      case 'falling':
        this.falling = true;
        break;
      default:
        break;
    }
  }

  splitBalls(count, fromOne = false) {
    if (this.balls.length === 0) return;
    if (fromOne || count === 8) {
      const src = this.balls[0];
      const speed = Math.max(src.speed, scaledSpeed(BASE_SPEED) + scaledSpeed(0.5));
      this.balls = [];
      for (let i = 0; i < count; i++) {
        const a = -Math.PI + (Math.PI * 2 * i) / count + 0.2;
        this.balls.push({
          x: src.x, y: src.y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          speed,
          stuck: false,
          stuckOffset: 0,
        });
      }
    } else {
      const extras = [];
      for (const src of this.balls) {
        const a = Math.atan2(src.vy, src.vx) + 0.5;
        extras.push({
          x: src.x, y: src.y,
          vx: Math.cos(a) * src.speed,
          vy: Math.sin(a) * src.speed,
          speed: src.speed,
          stuck: false,
          stuckOffset: 0,
        });
      }
      this.balls.push(...extras);
    }
  }

  pushMsg(text, color) {
    this.messages.push({ text, color, life: 1.4 });
  }

  burst(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, 140);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.25, 0.55),
        color,
        size: rand(1.5, 3.5),
      });
    }
  }

  update(dt) {
    if (this.mode === 'clear') {
      if (performance.now() >= this.clearTimer) this.nextLevel();
      this.updateFx(dt);
      return;
    }
    if (this.mode !== 'playing') {
      this.updateFx(dt);
      return;
    }

    const pw = this.paddleWidth();
    // Paddle control
    let target = this.input.mouseX - pw / 2;
    if (this.input.left()) target = this.paddleX - scaledSpeed(420) * dt;
    if (this.input.right()) target = this.paddleX + scaledSpeed(420) * dt;
    this.paddleX = clamp(target, 0, W - pw);

    const click = this.input.consumeClick();
    if (click) {
      const anyStuck = this.balls.some((b) => b.stuck);
      if (anyStuck) this.releaseBalls();
      else if (this.effects.laser) this.fireLaser();
    }

    // Balls
    const r = this.ballRadius();
    for (const ball of this.balls) {
      if (ball.stuck) {
        ball.x = this.paddleX + pw / 2 + (ball.stuckOffset || 0);
        ball.y = PADDLE_Y - r - 2;
        continue;
      }

      // accelerate slowly over time
      if (ball.speed < scaledSpeed(BASE_SPEED) + scaledSpeed(1.5)) {
        ball.speed = Math.min(scaledSpeed(BASE_SPEED) + scaledSpeed(1.5), ball.speed + dt * scaledSpeed(0.15));
      }

      // substeps for tunneling prevention
      const steps = Math.ceil(ball.speed / 3);
      const sdt = dt / steps;
      for (let s = 0; s < steps; s++) {
        ball.x += ball.vx * 60 * sdt;
        ball.y += ball.vy * 60 * sdt;
        this.collideBall(ball, r);
      }
    }

    // Remove lost balls
    this.balls = this.balls.filter((b) => b.stuck || b.y < H + 40);
    if (this.balls.length === 0) this.loseLife();

    // Powerups
    for (const p of this.powerups) {
      p.wobble += dt * 6;
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      p.vx *= 0.98;
      p.vy = scaledSpeed(POWERUP_FALL_SPEED) + Math.sin(p.wobble) * 0.3;
      // paddle catch
      if (
        p.y + POWERUP_SIZE / 2 >= PADDLE_Y &&
        p.y - POWERUP_SIZE / 2 <= PADDLE_Y + PADDLE_HEIGHT &&
        p.x >= this.paddleX &&
        p.x <= this.paddleX + pw
      ) {
        p.caught = true;
        this.applyPowerup(p.id);
      }
    }
    this.powerups = this.powerups.filter((p) => !p.caught && p.y < H + 40);

    // Lasers
    for (const l of this.lasers) {
      l.y -= scaledSpeed(520) * dt;
      for (const b of this.bricks) {
        if (!b.alive || (b.type === 'hidden' && !b.revealed)) continue;
        if (l.x >= b.x && l.x <= b.x + b.w && l.y >= b.y && l.y <= b.y + b.h) {
          l.dead = true;
          if (this.effects.thru) {
            this.destroyBrick(b, { laser: true });
            l.dead = false; // continue
          } else if (this.effects.fireball) {
            this.destroyBrick(b, { laser: true, explosion: true });
          } else {
            this.destroyBrick(b, { laser: true });
          }
          break;
        }
      }
    }
    this.lasers = this.lasers.filter((l) => !l.dead && l.y > 0);

    // Charm
    if (this.charm) {
      this.charm.pulse += dt * 4;
      for (const ball of this.balls) {
        if (ball.stuck) continue;
        const dx = ball.x - this.charm.x;
        const dy = ball.y - this.charm.y;
        if (dx * dx + dy * dy < (this.charm.r + r) ** 2) {
          this.charmsCollected++;
          const pts = Math.round(250 * Math.pow(1.15, this.charmsCollected - 1));
          this.addScore(pts, this.charm.x, this.charm.y);
          this.audio.charm();
          this.pushMsg(`CHARM +${pts}`, '#ffb020');
          this.charm = null;
          this.lightningTimer = null;
          break;
        }
      }
    }

    // Lightning timeout for last bricks
    const left = this.breakableCount();
    if (left > 0 && left <= 2) {
      if (!this.lightningTimer) this.lightningTimer = performance.now() + LIGHTNING_TIMEOUT_MS;
      else if (performance.now() >= this.lightningTimer) {
        this.strikeLightning();
      }
    } else {
      this.lightningTimer = null;
    }

    // Zap timeout — no brick destroyed for a while
    if (performance.now() - this.lastBrickBreak > 60000 && this.balls.some((b) => !b.stuck)) {
      this.applyZap();
      this.lastBrickBreak = performance.now();
    }

    // Gold ball if stuck bouncing on invincible
    // (handled via stuckHits → zap; also soft gold after many hits)
    if (this.stuckHits >= 40 && !this.isGold()) {
      this.goldUntil = performance.now() + GOLD_BALL_MS;
      this.pushMsg('GOLD BALL!', '#ffd700');
    }

    this.updateFx(dt);
  }

  updateFx(dt) {
    for (const m of this.messages) m.life -= dt;
    this.messages = this.messages.filter((m) => m.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floatScores) {
      f.life -= dt;
      f.y += f.vy * dt;
    }
    this.floatScores = this.floatScores.filter((f) => f.life > 0);
  }

  fireLaser() {
    if (this.lasers.length >= 6) return;
    const pw = this.paddleWidth();
    this.lasers.push({ x: this.paddleX + 8, y: PADDLE_Y, dead: false });
    this.lasers.push({ x: this.paddleX + pw - 8, y: PADDLE_Y, dead: false });
    this.audio.laser();
  }

  strikeLightning() {
    this.audio.lightning();
    this.flash = { color: 'rgba(200,220,255,0.35)', until: performance.now() + 180 };
    const targets = this.bricks.filter((b) => b.alive && this.isBreakable(b));
    const n = Math.min(targets.length, 1 + Math.floor(Math.random() * 2));
    for (let i = 0; i < n; i++) {
      const t = targets[Math.floor(Math.random() * targets.length)];
      if (!t || !t.alive) continue;
      // treat as explosive
      if (t.type === 'hidden') t.revealed = true;
      t.type = 'explosive';
      this.destroyBrick(t, { explosion: true });
    }
    this.lightningTimer = performance.now() + LIGHTNING_TIMEOUT_MS;
  }

  collideBall(ball, r) {
    // Walls
    if (ball.x - r < 0) { ball.x = r; ball.vx = Math.abs(ball.vx); this.audio.wall(); }
    if (ball.x + r > W) { ball.x = W - r; ball.vx = -Math.abs(ball.vx); this.audio.wall(); }
    if (ball.y - r < 40) { ball.y = 40 + r; ball.vy = Math.abs(ball.vy); this.audio.wall(); }

    // Paddle
    const pw = this.paddleWidth();
    const py = PADDLE_Y;
    if (
      ball.vy > 0 &&
      ball.y + r >= py &&
      ball.y + r <= py + PADDLE_HEIGHT + Math.abs(ball.vy) &&
      ball.x >= this.paddleX - 2 &&
      ball.x <= this.paddleX + pw + 2
    ) {
      ball.y = py - r;
      if (this.effects.grab && !this.effects.fireball) {
        ball.stuck = true;
        ball.stuckOffset = ball.x - (this.paddleX + pw / 2);
        ball.vx = 0;
        ball.vy = 0;
        this.audio.paddle();
      } else {
        const hit = (ball.x - this.paddleX) / pw; // 0..1
        const angle = -Math.PI + hit * Math.PI; // left to right, upward hemisphere-ish
        // Better: map to -150° .. -30°
        const a = -Math.PI * 0.85 + hit * Math.PI * 0.7;
        ball.speed = clamp(ball.speed + scaledSpeed(0.05), scaledSpeed(MIN_SPEED), scaledSpeed(MAX_SPEED));
        ball.vx = Math.cos(a) * ball.speed;
        ball.vy = Math.sin(a) * ball.speed;
        if (ball.vy > 0) ball.vy = -ball.vy;
        this.audio.paddle();
        if (this.falling) this.dropBricks();
      }
    }

    // Bricks
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (b.type === 'hidden' && !b.revealed) {
        // still collide
      }
      if (this.circleRect(ball.x, ball.y, r, b.x, b.y, b.w, b.h)) {
        const thru = this.effects.thru || this.isGold();
        const prevAlive = b.alive;
        const prevType = b.type;
        const prevHits = b.hits;

        this.destroyBrick(b, { ball });

        if (!thru) {
          // bounce based on overlap
          const overlapL = (ball.x + r) - b.x;
          const overlapR = (b.x + b.w) - (ball.x - r);
          const overlapT = (ball.y + r) - b.y;
          const overlapB = (b.y + b.h) - (ball.y - r);
          const minX = Math.min(overlapL, overlapR);
          const minY = Math.min(overlapT, overlapB);
          if (minX < minY) {
            ball.vx *= -1;
            ball.x += overlapL < overlapR ? -overlapL : overlapR;
          } else {
            ball.vy *= -1;
            ball.y += overlapT < overlapB ? -overlapT : overlapB;
          }
          // normalize speed
          const mag = Math.hypot(ball.vx, ball.vy) || 1;
          ball.vx = (ball.vx / mag) * ball.speed;
          ball.vy = (ball.vy / mag) * ball.speed;
        } else if (prevAlive && b.alive && prevType === b.type && prevHits === b.hits) {
          // invincible without destroy — bounce even for gold? gold destroys
        }
        if (!thru) break;
      }
    }
  }

  circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw);
    const ny = clamp(cy, ry, ry + rh);
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < cr * cr;
  }

  dropBricks() {
    // Move all bricks down one row if possible
    const maxY = this.fallFloor;
    // Sort bottom-up so we don't overlap incorrectly
    const alive = this.bricks.filter((b) => b.alive).sort((a, b) => b.r - a.r);
    const occupied = new Set(alive.map((b) => `${b.c},${b.r}`));
    for (const b of alive) {
      if (b.y + BRICK_H >= maxY) continue;
      const nr = b.r + 1;
      const key = `${b.c},${nr}`;
      if (occupied.has(key)) continue;
      occupied.delete(`${b.c},${b.r}`);
      occupied.add(key);
      b.r = nr;
      b.y = BRICK_OFFSET_Y + nr * BRICK_H;
    }
  }

  brickColor(b) {
    if (b.type === 'explosive') return '#ff6b35';
    if (b.type === 'multi') {
      const shades = ['#bdc3c7', '#95a5a6', '#7f8c8d'];
      return shades[3 - b.hits] || shades[0];
    }
    if (b.type === 'invincible') return '#4a5568';
    if (b.type === 'almost') return '#718096';
    if (b.type === 'hidden' && !b.revealed) return 'transparent';
    return BRICK_COLORS[b.color % BRICK_COLORS.length];
  }

  // ——— Rendering ———

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    // subtle grid
    ctx.strokeStyle = 'rgba(40,60,90,0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, H); ctx.stroke();
    }

    if (this.mode === 'title') return this.drawTitle();
    if (this.mode === 'pack') return this.drawPackSelect();
    if (this.mode === 'help') return this.drawHelp();

    this.drawHud();
    this.drawBricks();
    this.drawCharm();
    this.drawPowerups();
    this.drawLasers();
    this.drawPaddle();
    this.drawBalls();
    this.drawParticles();
    this.drawMessages();

    if (this.flash && performance.now() < this.flash.until) {
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, W, H);
    }

    if (this.mode === 'paused') {
      this.drawCenterText('PAUSED', 'Click / Space — resume  ·  Esc — menu');
    }
    if (this.mode === 'clear') this.drawCenterText('BOARD CLEAR!', this.level?.name || '');
    if (this.mode === 'gameover') this.drawGameOver();

    if (this.mode === 'playing' && this.levelAnnounce && performance.now() < this.levelAnnounce) {
      this.drawCenterText(this.level.name, `Board ${this.levelIndex + 1} / ${this.pack.levels.length}`);
    }

    // lightning warning
    if (this.lightningTimer) {
      const left = Math.max(0, this.lightningTimer - performance.now());
      if (left < 10000) {
        ctx.fillStyle = `rgba(61,224,255,${0.3 + Math.sin(performance.now() / 100) * 0.2})`;
        ctx.font = '12px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚡ ${Math.ceil(left / 1000)}s`, W / 2, H - 16);
      }
    }
  }

  drawHud() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, W, 40);
    ctx.strokeStyle = '#1e2a3c';
    ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(W, 40); ctx.stroke();

    ctx.fillStyle = '#e8eef7';
    ctx.font = '700 16px Rajdhani, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE  ${this.score}`, 16, 26);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a96a8';
    ctx.fillText(`${this.pack.name.toUpperCase()}  ·  ${this.levelIndex + 1}/${this.pack.levels.length}`, W / 2, 26);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8eef7';
    ctx.fillText(`HI  ${this.highScore}`, W - 16, 26);

    // lives as mini paddles
    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = '#3de0ff';
      ctx.fillRect(W - 120 - i * 28, 12, 22, 6);
    }

    // effect icons
    const icons = [];
    if (this.effects.grab) icons.push(['G', '#3dff8a']);
    if (this.effects.laser) icons.push(['L', '#3dff8a']);
    if (this.effects.fireball) icons.push(['F', '#ff6b35']);
    if (this.effects.thru) icons.push(['T', '#3de0ff']);
    if (this.falling) icons.push(['↓', '#ff3b4a']);
    if (this.isGold()) icons.push(['★', '#ffd700']);
    icons.forEach(([t, c], i) => {
      ctx.fillStyle = c;
      ctx.font = '700 12px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(t, 200 + i * 18, 26);
    });
  }

  drawBricks() {
    const ctx = this.ctx;
    const t = performance.now() / 1000;
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (b.type === 'hidden' && !b.revealed) continue;
      const color = this.brickColor(b);
      // body
      ctx.fillStyle = color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // gloss
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(b.x, b.y, b.w, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x, b.y + b.h - 3, b.w, 3);

      if (b.type === 'explosive') {
        ctx.strokeStyle = `rgba(255,200,80,${0.5 + Math.sin(t * 8 + b.c) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('●', b.x + b.w / 2, b.y + b.h / 2 + 3);
      }
      if (b.type === 'multi') {
        ctx.fillStyle = '#111';
        ctx.font = 'bold 11px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText(String(b.hits), b.x + b.w / 2, b.y + b.h / 2 + 4);
      }
      if (b.type === 'invincible') {
        ctx.strokeStyle = '#8899aa';
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      }
      if (b.type === 'almost') {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      }
    }
  }

  drawPaddle() {
    const ctx = this.ctx;
    const pw = this.paddleWidth();
    const x = this.paddleX;
    const y = PADDLE_Y;

    const grad = ctx.createLinearGradient(x, y, x, y + PADDLE_HEIGHT);
    grad.addColorStop(0, '#7ad7ff');
    grad.addColorStop(0.4, '#2a9fd6');
    grad.addColorStop(1, '#145a8a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, pw, PADDLE_HEIGHT, 4);
    ctx.fill();

    // nubs
    ctx.fillStyle = '#b8ecff';
    ctx.fillRect(x, y + 2, 6, PADDLE_HEIGHT - 4);
    ctx.fillRect(x + pw - 6, y + 2, 6, PADDLE_HEIGHT - 4);

    if (this.effects.grab) {
      ctx.strokeStyle = `rgba(61,255,138,${0.4 + Math.sin(performance.now() / 120) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 8, y);
      ctx.quadraticCurveTo(x + pw / 2, y - 10, x + pw - 8, y);
      ctx.stroke();
    }
    if (this.effects.laser) {
      ctx.fillStyle = '#ff3b4a';
      ctx.fillRect(x + 2, y - 6, 5, 8);
      ctx.fillRect(x + pw - 7, y - 6, 5, 8);
    }
  }

  drawBalls() {
    const ctx = this.ctx;
    const r = this.ballRadius();
    for (const ball of this.balls) {
      let color = '#e8eef7';
      if (this.effects.fireball) color = '#ff6b35';
      else if (this.effects.thru) color = '#3de0ff';
      else if (this.isGold()) color = '#ffd700';

      if (this.effects.fireball || ball.speed >= scaledSpeed(SUPER_SPEED)) {
        ctx.fillStyle = 'rgba(255,120,40,0.35)';
        ctx.beginPath();
        ctx.arc(ball.x - ball.vx * 2, ball.y - ball.vy * 2, r * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(ball.x - r * 0.3, ball.y - r * 0.3, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPowerups() {
    const ctx = this.ctx;
    for (const p of this.powerups) {
      const def = POWERUPS[p.id];
      const s = POWERUP_SIZE;
      ctx.fillStyle = KIND_BG[def.kind];
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(p.x - s / 2, p.y - s / 2, s, s, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.font = `700 ${def.letter.length > 1 ? 9 : 12}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.letter, p.x, p.y + 1);
      ctx.textBaseline = 'alphabetic';
    }
  }

  drawLasers() {
    const ctx = this.ctx;
    ctx.strokeStyle = '#ff5a6a';
    ctx.lineWidth = 2;
    for (const l of this.lasers) {
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x, l.y + 14);
      ctx.stroke();
    }
  }

  drawCharm() {
    if (!this.charm) return;
    const ctx = this.ctx;
    const c = this.charm;
    const pulse = 1 + Math.sin(c.pulse) * 0.1;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.pulse * 0.5);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffb020';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x = Math.cos(a) * c.r;
      const y = Math.sin(a) * c.r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const f of this.floatScores) {
      ctx.globalAlpha = clamp(f.life * 2, 0, 1);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Rajdhani';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  drawMessages() {
    const ctx = this.ctx;
    let y = 70;
    for (const m of this.messages) {
      ctx.globalAlpha = clamp(m.life, 0, 1);
      ctx.fillStyle = m.color;
      ctx.font = '700 18px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.text, W / 2, y);
      y += 22;
    }
    ctx.globalAlpha = 1;
  }

  drawCenterText(title, sub) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8eef7';
    ctx.font = '900 36px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, H / 2 - 10);
    if (sub) {
      ctx.fillStyle = '#8a96a8';
      ctx.font = '600 16px Rajdhani, sans-serif';
      ctx.fillText(sub, W / 2, H / 2 + 24);
    }
  }

  drawGameOver() {
    const done = this.levelIndex + 1 >= this.pack.levels.length && this.lives > 0;
    this.drawCenterText(done ? 'PACK COMPLETE' : 'GAME OVER', `Score ${this.score}  ·  Enter / click for menu`);
  }

  drawTitle() {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(W / 2, H * 0.35, 20, W / 2, H * 0.4, Math.min(420, H * 0.55));
    g.addColorStop(0, '#122038');
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = BRICK_COLORS[i];
      ctx.fillRect(80 + i * 64, Math.round(H * 0.16), 50, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(80 + i * 64, Math.round(H * 0.16), 50, 4);
    }

    const titleY = Math.round(H * 0.32);
    ctx.fillStyle = '#e8eef7';
    ctx.font = '900 54px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SUPER', W / 2, titleY);
    ctx.fillStyle = '#3de0ff';
    ctx.font = '900 64px Orbitron, sans-serif';
    ctx.fillText('DX-BALL', W / 2, titleY + 70);

    ctx.fillStyle = '#8a96a8';
    ctx.font = '600 18px Rajdhani, sans-serif';
    ctx.fillText('Browser remake · all classic power-ups', W / 2, titleY + 110);

    const baseY = Math.min(H - 180, Math.max(340, Math.round(H * 0.58)));
    const items = ['PLAY', 'POWER-UPS'];
    items.forEach((label, i) => {
      const selected = this.menuIndex === i;
      ctx.fillStyle = selected ? '#3de0ff' : '#e8eef7';
      ctx.font = `${selected ? 700 : 600} 22px Orbitron, sans-serif`;
      ctx.fillText(`${selected ? '▸ ' : '  '}${label}`, W / 2, baseY + i * 36);
    });

    ctx.fillStyle = '#5a6577';
    ctx.font = '500 14px Rajdhani, sans-serif';
    ctx.fillText('Click menu  ·  Mouse / ← → move paddle  ·  Click / Space launch  ·  Esc pause', W / 2, H - 40);
    ctx.fillText(`Best: ${this.highScore}`, W / 2, H - 20);
    this.drawMessages();
  }

  drawPackSelect() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8eef7';
    ctx.font = '900 28px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT BOARD PACK', W / 2, Math.round(H * 0.12));

    const packs = [
      { id: 'classic', name: 'CLASSIC', desc: `${getPack('classic').levels.length} boards · original rectangular style` },
      { id: 'super', name: 'SUPER', desc: `${getPack('super').levels.length} boards · geometric mosaics` },
      { id: 'endless', name: 'ENDLESS', desc: `${getPack('endless').levels.length} boards · auto-generated, rising difficulty` },
    ];
    const baseY = Math.min(H - 360, Math.max(160, Math.round(H * 0.28)));
    packs.forEach((p, i) => {
      const selected = this.menuIndex === i;
      const y = baseY + i * 100;
      ctx.strokeStyle = selected ? '#3de0ff' : '#2a3548';
      ctx.fillStyle = selected ? 'rgba(61,224,255,0.08)' : 'rgba(20,28,40,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(120, y, 560, 84, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = selected ? '#3de0ff' : '#e8eef7';
      ctx.font = '700 22px Orbitron, sans-serif';
      ctx.fillText(p.name, W / 2, y + 36);
      ctx.fillStyle = '#8a96a8';
      ctx.font = '600 15px Rajdhani, sans-serif';
      ctx.fillText(p.desc, W / 2, y + 62);
    });

    ctx.fillStyle = '#5a6577';
    ctx.font = '500 14px Rajdhani';
    ctx.fillText('Click a pack to start  ·  Esc back', W / 2, H - 36);
  }

  drawHelp() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8eef7';
    ctx.font = '900 24px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POWER-UPS', W / 2, 48);

    const cols = [
      { title: 'POSITIVE', kind: 'pos', y: 70 },
      { title: 'NEUTRAL', kind: 'neu', y: 70 },
      { title: 'NEGATIVE', kind: 'neg', y: 70 },
    ];
    const groups = {
      pos: POWERUP_LIST.filter((p) => p.kind === 'pos'),
      neu: POWERUP_LIST.filter((p) => p.kind === 'neu'),
      neg: POWERUP_LIST.filter((p) => p.kind === 'neg'),
    };
    const colW = 240;
    ['pos', 'neu', 'neg'].forEach((kind, ci) => {
      const x = 50 + ci * colW;
      ctx.fillStyle = POWERUP_LIST.find((p) => p.kind === kind).color;
      ctx.font = '700 14px Orbitron';
      ctx.textAlign = 'left';
      ctx.fillText(cols[ci].title, x, 78);
      groups[kind].forEach((p, i) => {
        const y = 100 + i * 36;
        ctx.fillStyle = KIND_BG[p.kind];
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, 24, 24, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = p.color;
        ctx.font = '700 9px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(p.letter, x + 12, y + 16);
        ctx.fillStyle = '#c5ced9';
        ctx.font = '600 13px Rajdhani';
        ctx.textAlign = 'left';
        ctx.fillText(p.name, x + 32, y + 16);
      });
    });

    ctx.fillStyle = '#5a6577';
    ctx.font = '500 14px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText('Green = help you  ·  Gray = situational  ·  Red = trouble  ·  Esc back', W / 2, H - 24);
  }

  // ——— Menu input ———

  handleMenu() {
    const esc = this.input.pressed('Escape');
    const pauseKey = this.input.pressed('KeyP');
    const enter = this.input.pressed('Enter');
    const space = this.input.pressed('Space');
    const mouseY = this.input.mouseY;

    if (this.mode === 'title') {
      const hit = this.titleMenuHitIndex(mouseY);
      if (hit >= 0) this.menuIndex = hit;
      const click = this.input.consumeClick();
      if (click && hit >= 0) {
        if (hit === 0) {
          this.mode = 'pack';
          this.menuIndex = 0;
        } else {
          this.mode = 'help';
        }
      }
    } else if (this.mode === 'pack') {
      const hit = this.packMenuHitIndex(mouseY);
      if (hit >= 0) this.menuIndex = hit;
      if (esc) this.goToTitle();
      const click = this.input.consumeClick();
      if (click && hit >= 0) {
        const ids = ['classic', 'super', 'endless'];
        this.startPack(ids[hit] || 'classic');
      }
    } else if (this.mode === 'help') {
      const click = this.input.consumeClick();
      if (click || esc) {
        this.mode = 'title';
        this.menuIndex = 1;
      }
    } else if (this.mode === 'gameover') {
      const click = this.input.consumeClick();
      if (click || esc) this.goToTitle();
    } else if (this.mode === 'playing') {
      if (pauseKey || esc) this.pauseGame();
    } else if (this.mode === 'paused') {
      const click = this.input.consumeClick();
      // Ignore the same Esc that just released pointer lock
      const escToMenu = esc && performance.now() - this._pauseAt > 250;
      if (escToMenu) {
        this.goToTitle();
      } else if (click || pauseKey || enter || space) {
        this.resumeGame();
      }
    } else if (this.mode === 'clear') {
      // keep pointer locked between boards
      if (!this.input.isLocked()) this.input.wantLock = true;
    }

    this.input.endFrame();
  }
}
