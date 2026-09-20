export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = 400;
    this.mouseY = 300;
    this.clicked = false;
    this.keysDown = new Set();
    this.keysPressed = new Set();
    this.wantLock = false;
    this._lockListeners = [];
    this._bound = false;
    this._onPointerMove = null;
    this._onPointerDown = null;
    this._onKeyDown = null;
    this._onKeyUp = null;
    this._onContextMenu = null;
    this._onPointerLockChange = null;
    this._bind();
  }

  _scale() {
    const r = this.canvas.getBoundingClientRect();
    return {
      r,
      sx: this.canvas.width / Math.max(1, r.width),
      sy: this.canvas.height / Math.max(1, r.height),
    };
  }

  _setFromClient(clientX, clientY) {
    const { r, sx, sy } = this._scale();
    this.mouseX = (clientX - r.left) * sx;
    this.mouseY = (clientY - r.top) * sy;
  }

  _bind() {
    if (this._bound) return;
    this._bound = true;

    /* Pointer Events cover mouse + iPad touch (mousedown alone is silent on iOS). */
    this._onPointerMove = (e) => {
      if (this.isLocked() && e.pointerType === "mouse") {
        const { sx, sy } = this._scale();
        this.mouseX = Math.max(0, Math.min(this.canvas.width, this.mouseX + e.movementX * sx));
        this.mouseY = Math.max(0, Math.min(this.canvas.height, this.mouseY + e.movementY * sy));
        return;
      }
      this._setFromClient(e.clientX, e.clientY);
    };

    this._onPointerDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      this._setFromClient(e.clientX, e.clientY);
      this.clicked = true;
      try {
        this.canvas.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
      /* Stop iPad page scroll / chart pan while tapping the game. */
      if (e.pointerType !== "mouse") {
        e.preventDefault();
      }
      if (this.wantLock && e.pointerType === "mouse" && !this.isLocked()) {
        this.requestLock();
      }
    };

    this._onKeyDown = (e) => {
      if (!this.canvas.isConnected) return;
      const host = this.canvas.closest(".terminal-dxball-host");
      if (host?.hidden) return;
      const active =
        this.isLocked() ||
        document.activeElement === this.canvas ||
        !!host?.matches(":hover");
      if (!active) return;

      /* Don't let ↑↓ scroll Terminal charts while the game panel is active. */
      if (
        e.code === "ArrowUp" ||
        e.code === "ArrowDown" ||
        e.code === "PageUp" ||
        e.code === "PageDown"
      ) {
        e.preventDefault();
      }

      if (!this.keysDown.has(e.code)) this.keysPressed.add(e.code);
      this.keysDown.add(e.code);
      if (e.code === "Space") {
        e.preventDefault();
        this.clicked = true;
      }
    };

    this._onKeyUp = (e) => {
      this.keysDown.delete(e.code);
    };

    this._onContextMenu = (e) => e.preventDefault();

    this._onPointerLockChange = () => {
      for (const fn of this._lockListeners) fn(this.isLocked());
    };

    const ptrOpts = { passive: false };
    this.canvas.addEventListener("pointermove", this._onPointerMove, ptrOpts);
    this.canvas.addEventListener("pointerdown", this._onPointerDown, ptrOpts);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    this.canvas.addEventListener("contextmenu", this._onContextMenu);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
  }

  destroy() {
    if (!this._bound) return;
    this._bound = false;
    this.exitLock();
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this.canvas.removeEventListener("contextmenu", this._onContextMenu);
    document.removeEventListener("pointerlockchange", this._onPointerLockChange);
    this._lockListeners.length = 0;
    this.keysDown.clear();
    this.keysPressed.clear();
  }

  onLockChange(fn) {
    this._lockListeners.push(fn);
  }

  isLocked() {
    return document.pointerLockElement === this.canvas;
  }

  requestLock() {
    this.wantLock = true;
    if (this.isLocked()) return;
    /* Pointer Lock is desktop-only; iPad has no API / always rejects. */
    if (typeof this.canvas.requestPointerLock !== "function") return;
    const req = this.canvas.requestPointerLock();
    if (req && typeof req.catch === "function") req.catch(() => {});
  }

  exitLock() {
    this.wantLock = false;
    if (this.isLocked()) document.exitPointerLock();
  }

  /** Keep virtual cursor on the paddle when (re)locking. */
  syncX(x) {
    this.mouseX = Math.max(0, Math.min(this.canvas.width, x));
  }

  consumeClick() {
    const v = this.clicked;
    this.clicked = false;
    return v;
  }

  pressed(code) {
    return this.keysPressed.has(code);
  }

  endFrame() {
    this.keysPressed.clear();
  }

  left() {
    return this.keysDown.has("ArrowLeft") || this.keysDown.has("KeyA");
  }

  right() {
    return this.keysDown.has("ArrowRight") || this.keysDown.has("KeyD");
  }
}
