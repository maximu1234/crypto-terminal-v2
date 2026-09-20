/** Silent stub — DX-Ball runs without audio in Terminal. */

export class AudioSys {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this.master = 0;
  }

  toggle() {
    return false;
  }

  setEnabled() {
    this.enabled = false;
  }

  ensure() {}

  tone() {}

  blip() {}

  menu() {}

  paddle() {}

  wall() {}

  brick() {}

  explode() {}

  power() {}

  laser() {}

  lifeLost() {}

  levelClear() {}

  lightning() {}

  charm() {}
}
