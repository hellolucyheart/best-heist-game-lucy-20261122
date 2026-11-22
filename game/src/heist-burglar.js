// Gilded Vault — Rook, the burglar.
//
// Movement, tools, loot and the two hold-to-use jobs (hack the terminal,
// crack the vault). Rook is a disc that slides along walls; everything
// else is state the world reads.
//
// Movement reads as a velocity: the pressed keys pick a direction, the
// posture picks a speed, the loot picks a penalty, and the disc slides
// along whatever it touches — including the closed vault door, which is
// a gap in the walls that only opens once cracked.
import { BURGLAR, GEAR } from './heist-tuning.js';
import { START, DOOR, CONSOLE, TREASURE, isWall, inDuct, inDark, inGlow } from './heist-bank.js';
import { discHitsBarrier } from './heist-sight.js';

const STEPS = [
  { keys: ['arrowleft', 'a'], x: -1, y: 0 },
  { keys: ['arrowright', 'd'], x: 1, y: 0 },
  { keys: ['arrowup', 'w'], x: 0, y: -1 },
  { keys: ['arrowdown', 's'], x: 0, y: 1 },
];

function circleOverlapsRect(x, y, r, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

export class Burglar {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = START.x;
    this.y = START.y;
    this.angle = -Math.PI / 2; // facing up, into the bank
    this.radius = BURGLAR.radius;
    this.crouch = false;
    this.sprint = false;
    this.moving = false;
    this.smoke = GEAR.smoke;
    this.coins = GEAR.coins;
    this.loot = []; // collected treasure ids
    this.hasKeycard = false;
    this.hasSapphire = false;
    this.hackProgress = 0; // 0..1 at the terminal
    this.crackProgress = 0; // 0..1 at the vault door
    this.vaultOpen = false;
    this.smokeClouds = []; // {x, y, until}
    this.stepTimer = 0; // footstep sound pacing
    this.stepped = false;
  }

  get lootCount() {
    return this.loot.length;
  }

  // Posture speed, capped in the duct, taxed by the loot on Rook's back.
  get speed() {
    const base = this.crouch ? BURGLAR.crouch : this.sprint ? BURGLAR.sprint : BURGLAR.walk;
    const capped = this.inVent() ? Math.min(base, BURGLAR.duct) : base;
    return capped * Math.max(0.55, 1 - BURGLAR.slowPerItem * this.lootCount);
  }

  inVent() { return inDuct(this.x, this.y); }
  inShadow() { return inDark(this.x, this.y); }
  inLight() { return inGlow(this.x, this.y); }

  // Keyboard movement. `keys` is the live key set from heist-input.
  step(dt, keys) {
    let vx = 0, vy = 0;
    for (const s of STEPS) {
      if (s.keys.some((k) => keys.has(k))) { vx += s.x; vy += s.y; }
    }
    this.crouch = keys.has('c') || keys.has('control');
    this.sprint = (keys.has('shift') || keys.has('shiftleft')) && !this.crouch;
    this.moving = vx !== 0 || vy !== 0;
    if (!this.moving) return;
    const mag = Math.hypot(vx, vy);
    const stride = this.speed * dt;
    const dx = (vx / mag) * stride, dy = (vy / mag) * stride;
    // Slide axis by axis; the closed vault door blocks like a wall.
    const blocked = (x, y) => discHitsBarrier(x, y, this.radius) || this.doorBlocks(x, y);
    let nx = this.x + dx;
    if (blocked(nx, this.y)) nx = this.x;
    let ny = this.y + dy;
    if (blocked(nx, ny)) ny = this.y;
    this.x = nx;
    this.y = ny;
    this.angle = Math.atan2(vy, vx);
    // Footstep pacing for the sound board (faster when sprinting).
    this.stepTimer -= dt * (this.sprint ? 1.8 : 1);
    if (this.stepTimer <= 0) {
      this.stepTimer = this.crouch ? 0.55 : 0.38;
      this.stepped = true;
    }
  }

  // The closed vault door is solid: a disc overlapping its rect.
  doorBlocks(x, y) {
    return !this.vaultOpen && circleOverlapsRect(x, y, this.radius, DOOR);
  }

  nearConsole() {
    return Math.hypot(this.x - CONSOLE.x, this.y - CONSOLE.y) < CONSOLE.r + this.radius;
  }

  // Close enough to work the door: within 52 px of its rect.
  nearDoor() {
    return circleOverlapsRect(this.x, this.y, 52, DOOR);
  }

  // Hold E: hack the terminal (lenses off) or crack the vault door.
  // Returns 'hacking' | 'hacked' | 'cracking' | 'cracked' | null so the
  // world can show progress and play the right sound.
  useHeld(dt, keys, now, world) {
    if (!keys.has('e')) {
      this.hackProgress = 0;
      this.crackProgress = 0;
      return null;
    }
    if (this.nearConsole() && !world.camerasOffline()) {
      this.hackProgress += dt / GEAR.hackTime;
      if (this.hackProgress >= 1) {
        this.hackProgress = 0;
        world.hackCameras(now);
        return 'hacked';
      }
      return 'hacking';
    }
    if (this.nearDoor() && this.hasKeycard && !this.vaultOpen) {
      this.crackProgress += dt / GEAR.crackTime;
      if (this.crackProgress >= 1) {
        this.vaultOpen = true;
        return 'cracked';
      }
      return 'cracking';
    }
    this.hackProgress = 0;
    this.crackProgress = 0;
    return null;
  }

  // Q: drop a smoke pellet at Rook's feet.
  dropSmoke(now) {
    if (this.smoke <= 0) return false;
    this.smoke -= 1;
    this.smokeClouds.push({ x: this.x, y: this.y, until: now + GEAR.smokeTime });
    return true;
  }

  // Mouse click: toss a coin to a floor point; watchmen investigate the clink.
  tossCoin(x, y, world) {
    if (this.coins <= 0) return false;
    if (isWall(x, y)) return false;
    this.coins -= 1;
    world.noise = { x, y, radius: BURGLAR.coinHeard, until: world.now + 0.6 };
    world.coinFx = { x, y, until: world.now + 0.9 };
    return true;
  }

  // Walk over treasure to pick it up. The keycard is needed for the
  // vault; the sapphire is the whole point of the night.
  gather(world) {
    for (const item of TREASURE) {
      if (item.taken) continue;
      if (Math.hypot(this.x - item.x, this.y - item.y) >= this.radius + 20) continue;
      if (item.kind === 'sapphire' && !this.vaultOpen) continue; // sealed inside
      item.taken = true;
      this.loot.push(item.id);
      if (item.kind === 'keycard') this.hasKeycard = true;
      if (item.kind === 'sapphire') this.hasSapphire = true;
      world.onPickup(item);
    }
  }

  clearSmoke(now) {
    this.smokeClouds = this.smokeClouds.filter((c) => c.until > now);
  }
}
