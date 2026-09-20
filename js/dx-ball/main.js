/**
 * Super DX-Ball — mountable host for Terminal (not a standalone page boot).
 */
import { AudioSys } from "./audio.js?v=2";
import { Input } from "./input.js?v=3";
import { Game } from "./game.js?v=5";

let rafId = 0;
let last = 0;
let game = null;
let input = null;
let audio = null;
let canvas = null;
let running = false;
let unlockBound = false;

function polyfillRoundRect() {
  if (CanvasRenderingContext2D.prototype.roundRect) {
    return;
  }
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const radius = typeof r === "number" ? r : 4;
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
    return this;
  };
}

function frame(now) {
  if (!running || !game) {
    rafId = 0;
    return;
  }
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.handleMenu();
  game.update(dt);
  game.draw();
  rafId = requestAnimationFrame(frame);
}

function unlockAudio() {
  audio?.ensure();
}

/**
 * @param {HTMLCanvasElement} canvasEl
 * @returns {{ game: import('./game.js').Game, stop: () => void, pause: () => void }}
 */
export function startDxBall(canvasEl) {
  stopDxBall();
  polyfillRoundRect();

  canvas = canvasEl;
  audio = new AudioSys();
  input = new Input(canvas);
  game = new Game(canvas, input, audio);
  window.__dxball = game;

  if (!unlockBound) {
    unlockBound = true;
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
  }

  running = true;
  last = performance.now();
  rafId = requestAnimationFrame(frame);

  return {
    game,
    pause() {
      try {
        game?.pauseGame?.();
      } catch {
        /* ignore */
      }
      try {
        input?.exitLock?.();
      } catch {
        /* ignore */
      }
    },
    resize() {
      try {
        game?.fitToHost?.();
      } catch {
        /* ignore */
      }
    },
    stop: stopDxBall
  };
}

export function stopDxBall() {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  try {
    game?.pauseGame?.();
  } catch {
    /* ignore */
  }
  try {
    input?.destroy?.();
  } catch {
    /* ignore */
  }
  if (window.__dxball === game) {
    delete window.__dxball;
  }
  game = null;
  input = null;
  audio = null;
  canvas = null;
}

export function isDxBallRunning() {
  return running && !!game;
}
