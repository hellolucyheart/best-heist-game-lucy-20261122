// Gilded Vault — the heist itself: one loop, one alarm, one night. It
// owns the burglar, the watchmen, the lenses and the beams, and the rules
// that bind them: the alarm meter, lockdown and the police timer, the win
// (out the front door with the sapphire) and the two ways to lose
// (caught, or the police arriving during lockdown).
import { METER, BURGLAR, POINTS, GEAR } from './heist-tuning.js';
import {
  PATROLS, LENSES, BEAMS, TREASURE, WAY_OUT, areaName,
} from './heist-bank.js';
import { makeWatchmen, shoutToNearby } from './heist-guard.js';
import { makeLenses, makeBeams } from './heist-camera.js';
import { Burglar } from './heist-burglar.js';
import { SoundBoard } from './heist-audio.js';
import { Renderer } from './heist-paint.js';
import { Keys } from './heist-input.js';
import { exposure, pointSeg } from './heist-sight.js';
import { stageScene } from './heist-shots.js';

const WORTH = { sapphire: POINTS.sapphire, gold: POINTS.goldBar, cash: POINTS.cashStack, keycard: 0 };

export class Heist {
  constructor() {
    this.reset();
  }

  reset() {
    for (const item of TREASURE) item.taken = false;
    this.rook = new Burglar();
    this.guards = makeWatchmen(PATROLS);
    this.cameras = makeLenses(LENSES);
    this.lasers = makeBeams(BEAMS);
    this.alarm = 0;
    this.lockdown = false;
    this.policeTimer = METER.police;
    this.elapsed = 0;
    this.now = 0;
    this.phase = 'title';
    this.noise = null;
    this.coinFx = null;
    this.loseReason = null;
    this.frozen = false; // staged screenshots hold every pose
    this.sound = this.sound ?? new SoundBoard();
    this.spottedLatch = false; // edge-trigger the "spotted" sting
  }

  rookVisibility() {
    const r = this.rook;
    return exposure(r.x, r.y, {
      crouch: r.crouch,
      sprint: r.sprint,
      inVent: r.inVent(),
      inShadow: r.inShadow(),
      inLight: r.inLight(),
      lootCount: r.lootCount,
    });
  }

  rookInVent() {
    return this.rook.inVent();
  }

  // True when a smoke cloud sits between the watcher and Rook.
  smokeBlocks(x0, y0, x1, y1) {
    for (const cloud of this.rook.smokeClouds) {
      if (pointSeg(cloud.x, cloud.y, x0, y0, x1, y1) < GEAR.smokeRadius) return true;
    }
    return false;
  }

  camerasOffline() {
    return this.cameras.every((c) => c.offline);
  }

  hackCameras(now) {
    for (const c of this.cameras) c.hack(now, GEAR.hackOff);
    this.sound.hackDone();
  }

  onPickup(item) {
    if (item.kind === 'keycard') this.sound.keycard();
    else if (item.kind === 'sapphire') this.sound.pickup();
    else this.sound.coin();
  }

  lootValue() {
    return this.rook.loot.reduce((sum, id) => {
      const item = TREASURE.find((l) => l.id === id);
      return sum + (item ? WORTH[item.kind] : 0);
    }, 0);
  }

  scoreBreakdown() {
    const loot = this.lootValue();
    const timeBonus = Math.max(0, POINTS.capSeconds - Math.floor(this.elapsed)) * POINTS.perSecond;
    const mm = String(Math.floor(this.elapsed / 60)).padStart(2, '0');
    const ss = String(Math.floor(this.elapsed % 60)).padStart(2, '0');
    return { loot, timeBonus, total: loot + timeBonus, time: `${mm}:${ss}` };
  }

  roomName() {
    return areaName(this.rook.x, this.rook.y) || 'THE BANK';
  }

  objective() {
    if (this.lockdown) return 'LOCKDOWN — break line of sight until the alarm drops below 70%.';
    if (!this.rook.hasKeycard) return 'Find the KEYCARD in the Security office.';
    if (!this.rook.vaultOpen) return 'Crack the VAULT door — hold E at the gold door.';
    if (!this.rook.hasSapphire) return 'Grab the STAR SAPPHIRE from the vault.';
    return 'Escape through the front door — bottom left.';
  }

  // Lockdown trips the moment the meter reaches 100 — checked right
  // where the meter rises, not a frame later, so a beam jump or a
  // last-second sighting cannot decay away before the check runs.
  maybeLockdown() {
    if (!this.lockdown && this.alarm >= METER.lockdown) {
      this.lockdown = true;
      this.policeTimer = METER.police;
      this.sound.klaxon();
    }
  }

  win() {
    if (this.phase !== 'play') return;
    this.phase = 'win';
    this.sound.win();
  }

  lose(reason) {
    if (this.phase !== 'play') return;
    this.phase = 'lose';
    this.loseReason = reason;
    this.sound.lose();
  }

  tick(dt, keys) {
    if (this.phase !== 'play' || this.frozen) return;
    this.now += dt;
    this.elapsed += dt;
    const rook = this.rook;

    // Burglar: move, hold-to-use, loot.
    rook.step(dt, keys.keys);
    const use = rook.useHeld(dt, keys.keys, this.now, this);
    if (use === 'hacked') this.alarm = Math.max(0, this.alarm - 10);
    if (use === 'cracked') this.sound.vaultOpen();
    if (use === 'cracking' && Math.random() < dt * 6) this.sound.crackTick();
    rook.gather(this);
    rook.clearSmoke(this.now);
    if (rook.stepped) { rook.stepped = false; this.sound.step(rook.sprint); }

    // Q: smoke. The key is read here (not in Burglar) so one press = one pellet.
    if (keys.wasTapped('q')) {
      if (rook.dropSmoke(this.now)) this.sound.smoke();
    }

    // Sprinting is loud: a rolling noise pulse the watchmen can hear.
    if (rook.sprint && rook.moving) {
      this.noise = { x: rook.x, y: rook.y, radius: BURGLAR.heardWhileSprinting, until: this.now + 0.15 };
    } else if (this.noise && this.now > this.noise.until) {
      this.noise = null;
    }

    // The bank watches back.
    for (const g of this.guards) g.update(dt, this);
    for (const lens of this.cameras) {
      lens.update(dt, this.now);
      lens.seesRook = lens.sees(rook, this);
    }
    for (const beam of this.lasers) {
      beam.update(dt, this.now);
      if (beam.trips(rook)) {
        this.alarm = Math.min(100, this.alarm + METER.beamTrip);
        this.sound.beamTrip();
        this.maybeLockdown();
      }
    }

    // The alarm: pressure from every eye on Rook, decay when hidden.
    let pressure = 0;
    let maxSpotted = 0;
    for (const g of this.guards) {
      maxSpotted = Math.max(maxSpotted, g.spotted);
      if (g.spotted > 0.05) pressure += METER.guardPressure * (0.4 + 0.6 * g.spotted);
    }
    for (const lens of this.cameras) {
      if (lens.seesRook) pressure += METER.lensPressure;
    }
    if (pressure > 0) {
      this.alarm = Math.min(100, this.alarm + pressure * dt);
      this.maybeLockdown();
    } else {
      this.alarm = Math.max(0, this.alarm - (this.lockdown ? METER.drainLocked : METER.drain) * dt);
    }

    // A watchman that just got sure shouts: neighbours turn to look.
    if (maxSpotted >= 0.85 && !this.spottedLatch) {
      this.spottedLatch = true;
      this.sound.spotted();
      const source = this.guards.find((g) => g.spotted >= 0.85);
      if (source) shoutToNearby(this.guards, source, rook.x, rook.y);
    }
    if (maxSpotted < 0.5) this.spottedLatch = false;

    // Lockdown lifts when the meter falls back under the calm line.
    if (this.lockdown && this.alarm < METER.calmAgain) {
      this.lockdown = false;
    }
    if (this.lockdown) {
      this.policeTimer -= dt;
      // The front door is sealed during lockdown.
      if (rook.y + rook.radius > 784 && rook.x > WAY_OUT.x && rook.x < WAY_OUT.x + WAY_OUT.w) {
        rook.y = 784 - rook.radius;
      }
      if (this.policeTimer <= 0) {
        this.lose('police');
        return;
      }
    }

    // Caught.
    for (const g of this.guards) {
      if (g.catches(rook)) {
        this.lose('caught');
        return;
      }
    }

    // Out the front door with the sapphire: the heist is done.
    if (rook.hasSapphire && !this.lockdown
      && rook.y + rook.radius > 786 && rook.x > WAY_OUT.x && rook.x < WAY_OUT.x + WAY_OUT.w) {
      this.win();
    }
  }
}

// Boot: canvas, input, loop, staged shots. The game exposes itself as
// window.__vault so a smoke test can read its state.
export function boot() {
  const canvas = document.getElementById('game');
  const world = new Heist();
  const painter = new Renderer(canvas);
  const input = new Keys(canvas, (x, y) => {
    if (world.phase === 'play') world.rook.tossCoin(x, y, world);
  });

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    stageScene(world, shot);
  }

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (input.wasTapped('m')) {
      world.sound.muted = !world.sound.muted;
    }
    if (world.phase === 'title' && (input.wasTapped('enter') || input.wasTapped(' '))) {
      world.phase = 'play';
      world.sound.resume();
    }
    if ((world.phase === 'win' || world.phase === 'lose') && input.wasTapped('r')) {
      world.reset();
      world.phase = 'play';
    }
    if (world.phase === 'title' && input.wasTapped('r')) {
      world.reset();
    }
    world.tick(dt, input);
    painter.render(world);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.__vault = world;
  return world;
}
