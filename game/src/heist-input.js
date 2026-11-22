// Gilded Vault — keyboard and mouse. Two sets: `keys` holds what is
// down right now (for movement), `tapped` records every key pressed
// since the last frame (for one-shot actions like Enter or Q). Keyup
// clears `keys` only — a quick tap between two frames must still count,
// so `tapped` is cleared by the frame loop after it has been read.
// Mouse clicks are converted to canvas coordinates and handed to the
// world as a "toss a coin here" order.
export class Keys {
  constructor(canvas, onClick) {
    this.keys = new Set();
    this.tapped = new Set();
    this.onClick = onClick;
    this.canvas = canvas;
    this.down = (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      this.tapped.add(k);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }
    };
    this.up = (e) => this.keys.delete(e.key.toLowerCase());
    this.blur = () => { this.keys.clear(); this.tapped.clear(); };
    this.click = (e) => {
      const r = this.canvas.getBoundingClientRect();
      const sx = this.canvas.width / r.width;
      const sy = this.canvas.height / r.height;
      this.onClick((e.clientX - r.left) * sx, (e.clientY - r.top) * sy);
    };
    window.addEventListener('keydown', this.down);
    window.addEventListener('keyup', this.up);
    window.addEventListener('blur', this.blur);
    this.canvas.addEventListener('click', this.click);
  }

  has(k) {
    return this.keys.has(k);
  }

  // True once per physical press, even a tap between frames.
  wasTapped(k) {
    if (!this.tapped.has(k)) return false;
    this.tapped.delete(k);
    return true;
  }

  // Call at the end of every frame, after the game has read its input.
  endFrame() {
    this.tapped.clear();
  }

  detach() {
    window.removeEventListener('keydown', this.down);
    window.removeEventListener('keyup', this.up);
    window.removeEventListener('blur', this.blur);
    this.canvas.removeEventListener('click', this.click);
  }
}
