// Gilded Vault — lenses and beams, the bank's unblinking eyes.
//
// A lens sits on a wall and sweeps its cone back and forth. It cannot
// be outrun, only avoided, hacked (terminal, 12 s offline) or smoked.
// A beam is a line of light across the vault corridor that slides up and
// down; crossing it is a flat alarm jump and a very loud klaxon.
import { EYES } from './heist-tuning.js';
import { seesInCone, pointSeg } from './heist-sight.js';

export class Lens {
  constructor(def) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.base = def.base;
    this.sweep = def.sweep;
    this.speed = def.speed;
    this.phase = def.phase;
    this.angle = def.base;
    this.offlineUntil = 0; // world time until which the lens is hacked off
    this.seesRook = false;
  }

  get offline() {
    return this.offlineUntil > 0;
  }

  update(dt, now) {
    if (this.offlineUntil > 0 && now >= this.offlineUntil) this.offlineUntil = 0;
    if (this.offline) return;
    this.angle = this.base + Math.sin(now * this.speed + this.phase) * this.sweep;
  }

  sees(rook, world) {
    if (this.offline) return false;
    if (world.smokeBlocks(this.x, this.y, rook.x, rook.y)) return false;
    if (world.rookInVent()) return false; // lenses cannot see into the duct
    const vis = world.rookVisibility();
    return seesInCone(this.x, this.y, this.angle, EYES.lensSpread,
      EYES.lensReach * vis, rook.x, rook.y);
  }

  hack(now, seconds) {
    this.offlineUntil = now + seconds;
  }
}

export class Beam {
  constructor(def) {
    this.id = def.id;
    this.x0 = def.x0;
    this.x1 = def.x1;
    this.yMid = def.yMid;
    this.amp = def.amp;
    this.speed = def.speed;
    this.phase = def.phase;
    this.y = def.yMid;
    this.tripped = false; // latched until Rook leaves the beam
  }

  update(dt, now) {
    this.y = this.yMid + Math.sin(now * this.speed + this.phase) * this.amp;
  }

  // True on the frame Rook steps through the beam.
  trips(rook) {
    const d = pointSeg(rook.x, rook.y, this.x0, this.y, this.x1, this.y);
    const inside = d < rook.radius + 5;
    const hit = inside && !this.tripped;
    this.tripped = inside;
    return hit;
  }
}

export function makeLenses(defs) {
  return defs.map((d) => new Lens(d));
}

export function makeBeams(defs) {
  return defs.map((d) => new Beam(d));
}
