// Gilded Vault — the watchmen. Each one walks a waypoint loop, pauses
// at every stop, and watches a cone. Their mood is a small state machine:
//
//   patrol -> investigate -> patrol        (something looked off)
//   investigate -> chase                  (sure now, and Rook is visible)
//   chase -> investigate                  (lost Rook for a while)
//   any -> converge                       (lockdown: run at Rook's last spot)
//
// A watchman's `spotted` meter (0..1) is what feeds the alarm: it fills
// while Rook is in the cone and drains when hidden. Noise (sprinting
// nearby, a tossed coin) sends the nearest watchman to investigate.
import { EYES, GEAR } from './heist-tuning.js';
import { seesInCone, slideDisc } from './heist-sight.js';

// Transition rules, checked top to bottom each frame. Each rule names the
// state it leaves, the test that fires it, and the state it lands in.
const RULES = [
  { from: '*', test: (g, w) => w.lockdown, to: 'converge' },
  { from: '*', test: (g, w) => g.spotted >= 0.85 && g.seenNow, to: 'chase' },
  { from: 'chase', test: (g) => g.unseenFor > GEAR.giveUp, to: 'investigate', look: 2.0 },
  { from: 'investigate', test: (g) => g.lookTimer <= 0 && g.spotted < 0.3, to: 'patrol' },
  { from: 'patrol', test: (g) => g.spotted >= 0.35, to: 'investigate', look: 1.6 },
];

export class Watchman {
  constructor(def) {
    this.name = def.name;
    this.waypoints = def.waypoints;
    this.speed = def.speed;
    this.pause = def.pause;
    this.x = def.waypoints[0][0];
    this.y = def.waypoints[0][1];
    this.leg = 1; // next waypoint index
    this.wait = 0;
    this.angle = 0;
    this.state = 'patrol';
    this.spotted = 0; // 0..1, how sure this watchman is that Rook is there
    this.unseenFor = 0;
    this.seenNow = false;
    this.investigate = null; // {x, y} to walk to and look around
    this.lookTimer = 0;
    this.chaseSpeed = def.speed * 1.85;
  }

  // Where this watchman is walking toward right now.
  goal() {
    if (this.state === 'investigate' || this.state === 'chase' || this.state === 'converge') {
      return this.investigate;
    }
    const wp = this.waypoints[this.leg];
    return { x: wp[0], y: wp[1] };
  }

  update(dt, world) {
    const rook = world.rook;
    this.seenNow = this.canSee(rook, world);
    // Spotted fills while Rook is in the cone, drains when hidden.
    if (this.seenNow) {
      this.spotted = Math.min(1, this.spotted + dt * 1.6);
      this.unseenFor = 0;
      this.investigate = { x: rook.x, y: rook.y };
    } else {
      this.spotted = Math.max(0, this.spotted - dt * 0.7);
      this.unseenFor += dt;
    }

    for (const rule of RULES) {
      if (rule.from !== '*' && rule.from !== this.state) continue;
      if (!rule.test(this, world)) continue;
      if (rule.to === this.state) break; // already there: no other rule fires
      this.state = rule.to;
      if (rule.look !== undefined) this.lookTimer = rule.look;
      break;
    }
    if (this.state === 'investigate') this.lookTimer -= dt;

    // Movement.
    const dest = this.goal();
    const pace = this.state === 'chase' || this.state === 'converge' ? this.chaseSpeed : this.speed;
    if (this.state === 'patrol' && this.wait > 0) {
      this.wait -= dt;
    } else if (dest) {
      const dx = dest.x - this.x, dy = dest.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        if (this.state === 'patrol') {
          this.leg = (this.leg + 1) % this.waypoints.length;
          this.wait = this.pause;
        } else if (this.state === 'investigate') {
          this.lookTimer = Math.max(this.lookTimer, 0.6);
          this.angle += dt * 1.4; // scan around while looking
        }
      } else {
        const step = Math.min(d, pace * dt);
        const moved = slideDisc(this, 13, (dx / d) * step, (dy / d) * step);
        this.x = moved.x;
        this.y = moved.y;
        this.angle = Math.atan2(dy, dx);
      }
    }

    // Hearing: sprinting close by, or a coin landing nearby.
    if (world.noise) {
      const nd = Math.hypot(world.noise.x - this.x, world.noise.y - this.y);
      if (nd < world.noise.radius && this.state !== 'chase' && this.state !== 'converge') {
        this.state = 'investigate';
        this.investigate = { x: world.noise.x, y: world.noise.y };
        this.lookTimer = 2.2;
      }
    }
  }

  canSee(rook, world) {
    if (world.smokeBlocks(this.x, this.y, rook.x, rook.y)) return false;
    const vis = world.rookVisibility();
    return seesInCone(this.x, this.y, this.angle, EYES.guardSpread,
      EYES.guardReach * vis, rook.x, rook.y);
  }

  // Caught: a chasing watchman right on top of Rook.
  catches(rook) {
    return (this.state === 'chase' || this.state === 'converge')
      && Math.hypot(rook.x - this.x, rook.y - this.y) < GEAR.grabRange;
  }

  alerted() {
    return this.state !== 'patrol';
  }
}

export function makeWatchmen(defs) {
  return defs.map((d) => new Watchman(d));
}

// A watchman that just got sure shouts: every other watchman in earshot
// turns toward the same spot. Called by the world when spotted jumps.
export function shoutToNearby(watchmen, source, x, y) {
  for (const g of watchmen) {
    if (g === source) continue;
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < 320 && g.state === 'patrol') {
      g.state = 'investigate';
      g.investigate = { x, y };
      g.lookTimer = 2.0;
    }
  }
}
