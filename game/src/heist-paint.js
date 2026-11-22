// Gilded Vault — the renderer, second pass.
//
// One canvas, one job: draw the bank, the people in it, and the HUD, so
// a single frame tells the whole heist. The drawing is built from a few
// tiny canvas verbs (disc, box, stroke, words) plus one table per thing
// that has a shape, so adding a prop is adding a row, not a branch.
//
// Palette is navy marble and gold: safe cover dark, danger red, loot
// gold — obvious at a glance.
import { STAGE, STRIP, PALETTE, EYES, METER } from './heist-tuning.js';
import {
  BARRIERS, AREAS, DARK, GLOW, DUCT, TREASURE, DOOR, CONSOLE, WAY_OUT,
} from './heist-bank.js';

const FONT = 'system-ui, sans-serif';

// --- tiny canvas verbs -------------------------------------------------

function disc(c, x, y, r, fill) {
  c.fillStyle = fill;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function box(c, x, y, w, h, fill) {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
}

function words(c, str, x, y, font, fill, align = 'left') {
  c.font = font;
  c.textAlign = align;
  c.fillStyle = fill;
  c.fillText(str, x, y);
}

function ring(c, x, y, r, stroke, width) {
  c.strokeStyle = stroke;
  c.lineWidth = width;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.stroke();
}

// A vision cone drawn in the watcher's own frame: rotate to face the
// way they look, then sweep an arc either side of straight ahead.
function coneShape(c, x, y, angle, spread, reach, fill, edge) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(0, 0);
  c.arc(0, 0, reach, -spread, spread);
  c.closePath();
  c.fill();
  c.strokeStyle = edge;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(Math.cos(-spread) * reach, Math.sin(-spread) * reach);
  c.moveTo(0, 0);
  c.lineTo(Math.cos(spread) * reach, Math.sin(spread) * reach);
  c.stroke();
  c.restore();
}

// --- treasure shapes ---------------------------------------------------
// Each kind knows how to draw itself at (x, y); `pulse` is the idle
// shimmer applied to the sapphire only.

function drawSapphire(c, x, y, pulse) {
  c.save();
  c.translate(x, y);
  c.scale(pulse, pulse);
  c.fillStyle = PALETTE.sapphire;
  c.beginPath();
  c.moveTo(0, -14); c.lineTo(11, 0); c.lineTo(0, 14); c.lineTo(-11, 0);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.beginPath();
  c.moveTo(0, -14); c.lineTo(5, 0); c.lineTo(0, 2); c.lineTo(-5, 0);
  c.closePath();
  c.fill();
  c.restore();
}

function drawGoldBar(c, x, y) {
  box(c, x - 11, y - 6, 22, 12, PALETTE.gold);
  box(c, x - 11, y + 2, 22, 4, PALETTE.goldDark);
  box(c, x - 8, y - 6, 16, 3, 'rgba(255,255,255,0.5)');
}

function drawCash(c, x, y) {
  box(c, x - 10, y - 7, 20, 14, '#69b578');
  box(c, x - 10, y - 2, 20, 4, '#3f7d4e');
  disc(c, x, y, 3, '#dcefe0');
}

function drawKeycard(c, x, y) {
  box(c, x - 9, y - 6, 18, 12, '#e8eaf2');
  box(c, x - 9, y - 6, 18, 4, PALETTE.gold);
}

const TREASURE_SHAPES = { sapphire: drawSapphire, gold: drawGoldBar, cash: drawCash, keycard: drawKeycard };
const TREASURE_TAGS = { sapphire: ['STAR SAPPHIRE', PALETTE.sapphire, -26], keycard: ['KEYCARD', '#e8eaf2', -20] };

// --- the renderer ------------------------------------------------------

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render(world) {
    const c = this.ctx;
    c.clearRect(0, 0, STAGE.width, STAGE.height);
    this.paintFloor(c);
    this.paintAreas(c);
    this.paintTreasure(c, world);
    this.paintConsole(c, world);
    this.paintExit(c, world);
    this.paintDoor(c, world);
    this.paintSmoke(c, world);
    this.paintBeams(c, world);
    this.paintLenses(c, world);
    this.paintWatchmen(c, world);
    this.paintBurglar(c, world);
    this.paintCoin(c, world);
    this.paintHud(c, world);
    const phase = world.phase;
    if (phase === 'title') this.paintTitle(c, world);
    if (phase === 'win') this.paintWin(c, world);
    if (phase === 'lose') this.paintLose(c, world);
  }

  paintFloor(c) {
    box(c, 0, STRIP, STAGE.width, STAGE.height - STRIP, PALETTE.floor);
    // Marble checker, faint, so the floor reads as bank tile.
    for (let y = STRIP; y < STAGE.height; y += 64) {
      for (let x = ((y / 64) % 2) * 32; x < STAGE.width; x += 64) {
        box(c, x, y, 32, 32, PALETTE.floorAlt);
      }
    }
  }

  paintAreas(c) {
    for (const a of AREAS) {
      box(c, a.x, a.y, a.w, a.h, a.tint);
      words(c, a.name, a.x + 10, a.y + 20, `600 13px ${FONT}`, 'rgba(232,234,242,0.16)');
    }
    // Lit pools (warm) and dark corners (shadow) on top of the floor.
    for (const g of GLOW) {
      const grad = c.createRadialGradient(g.x, g.y, 4, g.x, g.y, g.r);
      grad.addColorStop(0, 'rgba(245,197,66,0.20)');
      grad.addColorStop(1, 'rgba(245,197,66,0)');
      c.fillStyle = grad;
      c.beginPath(); c.arc(g.x, g.y, g.r, 0, Math.PI * 2); c.fill();
    }
    for (const s of DARK) {
      const grad = c.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
      grad.addColorStop(0, 'rgba(6,8,20,0.55)');
      grad.addColorStop(1, 'rgba(6,8,20,0)');
      c.fillStyle = grad;
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill();
    }
    // Vent duct grille lines.
    c.strokeStyle = 'rgba(232,234,242,0.25)';
    c.lineWidth = 2;
    for (let x = DUCT.x + 24; x < DUCT.x + DUCT.w; x += 32) {
      c.beginPath(); c.moveTo(x, DUCT.y + 6); c.lineTo(x, DUCT.y + DUCT.h - 6); c.stroke();
    }
    // Barriers: dark slabs with a lit top edge.
    for (const b of BARRIERS) {
      box(c, b.x, b.y, b.w, b.h, PALETTE.barrier);
      box(c, b.x, b.y, b.w, 3, PALETTE.barrierTop);
    }
  }

  paintTreasure(c, world) {
    for (const item of TREASURE) {
      if (item.taken) continue;
      const pulse = 1 + Math.sin(world.now * 3 + item.x) * 0.12;
      TREASURE_SHAPES[item.kind](c, item.x, item.y, pulse);
      const tag = TREASURE_TAGS[item.kind];
      if (tag) this.label(c, item.x, item.y + tag[2], tag[0], tag[1]);
    }
  }

  label(c, x, y, text, color) {
    c.font = `700 11px ${FONT}`;
    c.textAlign = 'center';
    const w = c.measureText(text).width + 10;
    box(c, x - w / 2, y - 10, w, 15, 'rgba(10,12,26,0.75)');
    words(c, text, x, y + 2, `700 11px ${FONT}`, color, 'center');
  }

  hint(c, x, y, text) {
    c.font = `700 13px ${FONT}`;
    c.textAlign = 'center';
    const w = c.measureText(text).width + 16;
    box(c, x - w / 2, y - 13, w, 20, 'rgba(10,12,26,0.85)');
    words(c, text, x, y + 2, `700 13px ${FONT}`, '#e8eaf2', 'center');
  }

  paintConsole(c, world) {
    const on = !world.camerasOffline();
    const dot = on ? '#37d67a' : '#5a6274';
    disc(c, CONSOLE.x, CONSOLE.y, 7, dot);
    ring(c, CONSOLE.x, CONSOLE.y, 12, dot, 2);
    this.label(c, CONSOLE.x, CONSOLE.y - 24, CONSOLE.label, on ? '#37d67a' : '#9aa3c0');
    if (world.rook.nearConsole() && on) {
      this.hint(c, CONSOLE.x, CONSOLE.y + 30, 'Hold E — hack cameras');
    }
  }

  paintExit(c, world) {
    const sealed = world.lockdown;
    const color = sealed ? '#ff3b5c' : '#37d67a';
    box(c, WAY_OUT.x, WAY_OUT.y - 6, WAY_OUT.w, 6, color);
    words(c, sealed ? 'EXIT — SEALED' : 'EXIT', WAY_OUT.x + WAY_OUT.w / 2, WAY_OUT.y - 14,
      `700 13px ${FONT}`, color, 'center');
  }

  paintDoor(c, world) {
    const d = DOOR;
    if (world.rook.vaultOpen) {
      box(c, d.x, d.y, d.w, d.h, '#3a2f10');
      words(c, 'OPEN', d.x + d.w / 2 + 34, d.y + d.h / 2 + 4, `700 11px ${FONT}`, PALETTE.gold, 'center');
      return;
    }
    box(c, d.x, d.y, d.w, d.h, '#8a6d1f');
    for (let i = 0; i < 3; i++) box(c, d.x + 2, d.y + 6 + i * 18, d.w - 4, 3, '#5c4712');
    disc(c, d.x + d.w / 2, d.y + d.h / 2, 7, PALETTE.gold);
    disc(c, d.x + d.w / 2, d.y + d.h / 2, 3, '#3a2f10');
    const doorTag = world.rook.hasKeycard ? 'VAULT — HOLD E TO CRACK' : 'VAULT — NEEDS KEYCARD';
    this.label(c, d.x + d.w / 2, d.y - 12, doorTag, PALETTE.gold);
    if (world.rook.nearDoor() && world.rook.hasKeycard) {
      this.hint(c, d.x + d.w / 2, d.y + d.h + 22, 'Hold E — crack the vault');
    }
  }

  paintSmoke(c, world) {
    for (const cloud of world.rook.smokeClouds) {
      const left = Math.max(0, cloud.until - world.now);
      const alpha = Math.min(0.85, 0.35 + left * 0.1);
      const g = c.createRadialGradient(cloud.x, cloud.y, 6, cloud.x, cloud.y, 78);
      g.addColorStop(0, `rgba(154,163,178,${alpha})`);
      g.addColorStop(1, 'rgba(154,163,178,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(cloud.x, cloud.y, 78, 0, Math.PI * 2); c.fill();
    }
  }

  paintBeams(c, world) {
    for (const b of world.lasers) {
      const flicker = b.tripped ? 1 : 0.75 + Math.sin(world.now * 9) * 0.2;
      c.strokeStyle = `rgba(255,59,92,${flicker})`;
      c.lineWidth = b.tripped ? 5 : 3;
      c.beginPath(); c.moveTo(b.x0, b.y); c.lineTo(b.x1, b.y); c.stroke();
      box(c, b.x0 - 4, b.y - 5, 8, 10, '#ff3b5c');
      box(c, b.x1 - 4, b.y - 5, 8, 10, '#ff3b5c');
    }
  }

  paintLenses(c, world) {
    for (const lens of world.cameras) {
      const off = lens.offline;
      const hot = lens.seesRook;
      const mood = off
        ? { fill: 'rgba(120,128,145,0.10)', edge: 'rgba(120,128,145,0.5)', dot: '#5a6274' }
        : hot
          ? { fill: 'rgba(255,59,92,0.34)', edge: 'rgba(255,59,92,0.9)', dot: '#ff3b5c' }
          : { fill: 'rgba(255,196,66,0.20)', edge: 'rgba(255,196,66,0.7)', dot: '#c9d1d9' };
      if (!off) coneShape(c, lens.x, lens.y, lens.angle, EYES.lensSpread, EYES.lensReach, mood.fill, mood.edge);
      disc(c, lens.x, lens.y, 8, mood.dot);
      disc(c, lens.x, lens.y, 3, '#10142a');
      if (off) {
        c.strokeStyle = '#ff3b5c';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(lens.x - 11, lens.y - 11); c.lineTo(lens.x + 11, lens.y + 11);
        c.moveTo(lens.x + 11, lens.y - 11); c.lineTo(lens.x - 11, lens.y + 11);
        c.stroke();
      }
    }
  }

  paintWatchmen(c, world) {
    for (const g of world.guards) {
      const chasing = g.state === 'chase' || g.state === 'converge';
      const alert = g.spotted > 0.35;
      const mood = chasing
        ? { fill: 'rgba(255,59,92,0.36)', edge: 'rgba(255,59,92,0.9)', mark: '!', markColor: '#ff3b5c' }
        : alert
          ? { fill: 'rgba(255,196,66,0.26)', edge: 'rgba(255,196,66,0.75)', mark: '?', markColor: '#f5c542' }
          : { fill: 'rgba(127,176,105,0.16)', edge: 'rgba(127,176,105,0.55)', mark: '', markColor: '' };
      coneShape(c, g.x, g.y, g.angle, EYES.guardSpread, EYES.guardReach, mood.fill, mood.edge);
      // Body: dark uniform, cap, and a facing tick.
      disc(c, g.x, g.y, 13, PALETTE.uniform);
      disc(c, g.x, g.y, 8, PALETTE.watchman);
      c.strokeStyle = '#20264a';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(g.x, g.y);
      c.lineTo(g.x + Math.cos(g.angle) * 13, g.y + Math.sin(g.angle) * 13);
      c.stroke();
      // Spotted meter above the head.
      if (g.spotted > 0.05) {
        const w = 30;
        box(c, g.x - w / 2, g.y - 26, w, 5, 'rgba(10,12,26,0.8)');
        box(c, g.x - w / 2, g.y - 26, w * g.spotted, 5, chasing ? '#ff3b5c' : '#f5c542');
      }
      if (mood.mark) {
        words(c, mood.mark, g.x, g.y - 30, `700 13px ${FONT}`, mood.markColor, 'center');
      }
    }
  }

  paintBurglar(c, world) {
    const r = world.rook;
    if (world.phase === 'title') return;
    // Crouch = smaller, lower profile.
    const rad = r.crouch ? 10 : r.radius;
    c.save();
    c.translate(r.x, r.y);
    c.rotate(r.angle);
    disc(c, 0, 0, rad + 2, PALETTE.burglarDark);
    disc(c, 0, 0, rad, PALETTE.burglar);
    // Cloak point + the loot sack on the back.
    c.fillStyle = '#7a1f24';
    c.beginPath(); c.moveTo(rad, 0); c.lineTo(-rad * 0.7, -rad * 0.8); c.lineTo(-rad * 0.7, rad * 0.8); c.closePath(); c.fill();
    if (r.lootCount > 0) disc(c, -rad * 0.9, 0, 5, PALETTE.gold);
    c.restore();
    // Hold-to-use progress ring.
    const prog = Math.max(r.hackProgress, r.crackProgress);
    if (prog > 0) {
      ring(c, r.x, r.y, 22, 'rgba(232,234,242,0.35)', 4);
      c.strokeStyle = PALETTE.gold;
      c.lineWidth = 4;
      c.beginPath(); c.arc(r.x, r.y, 22, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); c.stroke();
    }
    // Sprint noise ring.
    if (r.sprint && r.moving) {
      ring(c, r.x, r.y, 34 + Math.sin(world.now * 10) * 4, 'rgba(232,234,242,0.35)', 2);
    }
  }

  paintCoin(c, world) {
    if (!world.coinFx || world.coinFx.until < world.now) return;
    const left = world.coinFx.until - world.now;
    ring(c, world.coinFx.x, world.coinFx.y, 14 + (0.9 - left) * 30, `rgba(245,197,66,${Math.min(1, left)})`, 2);
    disc(c, world.coinFx.x, world.coinFx.y, 4, PALETTE.gold);
  }

  paintHud(c, world) {
    box(c, 0, 0, STAGE.width, STRIP, PALETTE.stripBg);
    box(c, 0, STRIP - 2, STAGE.width, 2, 'rgba(245,197,66,0.25)');
    // Title.
    words(c, 'GILDED VAULT', 16, 28, `800 20px ${FONT}`, PALETTE.gold);
    words(c, 'Meridian National Bank — 02:47 AM', 16, 47, `600 11px ${FONT}`, PALETTE.inkDim);
    // Alarm meter.
    const ax = 330, ay = 16, aw = 300, ah = 20;
    const a = world.alarm;
    const aColor = a >= METER.lockdown ? '#ff3b5c'
      : a >= METER.suspicious ? '#f5c542' : '#37d67a';
    box(c, ax, ay, aw, ah, 'rgba(232,234,242,0.15)');
    box(c, ax, ay, aw * (a / 100), ah, aColor);
    c.strokeStyle = 'rgba(232,234,242,0.5)';
    c.lineWidth = 1;
    c.strokeRect(ax, ay, aw, ah);
    const aLabel = world.lockdown
      ? `LOCKDOWN  ${Math.round(a)}%  —  POLICE ${Math.ceil(world.policeTimer)}s`
      : a >= METER.suspicious ? `SUSPICIOUS  ${Math.round(a)}%` : `ALARM  ${Math.round(a)}%`;
    words(c, aLabel + (world.sound.muted ? '   ·   MUTED' : ''), ax, ay + ah + 15,
      `700 12px ${FONT}`, PALETTE.ink);
    // Loot + tools.
    const lootValue = world.lootValue();
    words(c, `LOOT $${lootValue.toLocaleString('en-US')}`, 700, 26, `700 14px ${FONT}`, PALETTE.ink);
    const sap = world.rook.hasSapphire ? '★ SAPPHIRE' : '○ SAPPHIRE';
    const key = world.rook.hasKeycard ? 'KEYCARD ✓' : 'KEYCARD ○';
    words(c, `${sap}   ${key}   smoke ${world.rook.smoke}   coins ${world.rook.coins}`, 700, 46,
      `600 12px ${FONT}`, PALETTE.inkDim);
    // Timer + room.
    const mm = String(Math.floor(world.elapsed / 60)).padStart(2, '0');
    const ss = String(Math.floor(world.elapsed % 60)).padStart(2, '0');
    words(c, `${mm}:${ss}`, STAGE.width - 16, 26, `700 16px ${FONT}`, PALETTE.ink, 'right');
    words(c, world.roomName(), STAGE.width - 16, 46, `600 12px ${FONT}`, PALETTE.inkDim, 'right');
    // Objective line, bottom-right (bottom-left holds the EXIT sign).
    words(c, world.objective(), STAGE.width - 16, STAGE.height - 14,
      `600 13px ${FONT}`, 'rgba(232,234,242,0.85)', 'right');
    // Lockdown flash.
    if (world.lockdown && Math.floor(world.now * 2) % 2 === 0) {
      box(c, 0, STRIP, STAGE.width, STAGE.height - STRIP, 'rgba(255,59,92,0.06)');
    }
  }

  overlay(c, title, lines, accent) {
    box(c, 240, 170, 800, 400, 'rgba(10,12,26,0.88)');
    c.strokeStyle = accent;
    c.lineWidth = 3;
    c.strokeRect(240, 170, 800, 400);
    words(c, title, 640, 250, `800 44px ${FONT}`, accent, 'center');
    lines.forEach((line, i) => words(c, line, 640, 300 + i * 32, `600 18px ${FONT}`, PALETTE.ink, 'center'));
  }

  paintTitle(c, world) {
    box(c, 0, STRIP, STAGE.width, STAGE.height - STRIP, 'rgba(10,12,26,0.72)');
    this.overlay(c, 'GILDED VAULT', [
      'One night. One vault. One sapphire.',
      'Steal the keycard, crack the vault, grab the Star Sapphire,',
      'and walk out the front door before the police arrive.',
      '',
      'WASD / arrows — move    Shift — sprint (loud)    C — crouch (hidden)',
      'E (hold) — hack terminal / crack vault    Q — smoke pellet',
      'Click — toss a coin to distract a guard    M — mute',
      '',
      'Press ENTER to begin the heist',
    ], PALETTE.gold);
  }

  paintWin(c, world) {
    const s = world.scoreBreakdown();
    this.overlay(c, 'CLEAN GETAWAY', [
      `Loot  $${s.loot.toLocaleString('en-US')}    Time bonus  $${s.timeBonus.toLocaleString('en-US')}`,
      `TOTAL SCORE  $${s.total.toLocaleString('en-US')}`,
      `Finished in ${s.time}`,
      '',
      'The sapphire is yours. The bank never knew Rook was there.',
      '',
      'Press R to run it again',
    ], '#37d67a');
  }

  paintLose(c, world) {
    this.overlay(c, world.loseReason === 'police' ? 'POLICE ARRIVED' : 'CAUGHT', [
      world.loseReason === 'police'
        ? 'Lockdown held too long — the police walked in the front door.'
        : 'A guard got hands on Rook. The night ends in the lobby.',
      '',
      `Loot kept: $${world.lootValue().toLocaleString('en-US')} (the sapphire stays in the vault)`,
      '',
      'Press R to try the vault again',
    ], '#ff3b5c');
  }
}
