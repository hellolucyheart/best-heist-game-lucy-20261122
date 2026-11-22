// Gilded Vault — the renderer. One canvas, one job: draw the bank, the
// people in it, and the HUD, so that a single frame tells the whole
// heist: the room Rook is crossing, watchmen with vision cones, lenses,
// the loot target, and the alarm meter. Palette is navy marble and gold:
// safe cover dark, danger red, loot gold — obvious at a glance.
import { STAGE, STRIP, PALETTE, EYES, METER } from './heist-tuning.js';
import {
  BARRIERS, AREAS, DARK, GLOW, DUCT, TREASURE, DOOR, CONSOLE, WAY_OUT,
} from './heist-bank.js';

const FONT = 'system-ui, sans-serif';

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
    if (world.phase === 'title') this.paintTitle(c, world);
    if (world.phase === 'win') this.paintWin(c, world);
    if (world.phase === 'lose') this.paintLose(c, world);
  }

  paintFloor(c) {
    c.fillStyle = PALETTE.floor;
    c.fillRect(0, STRIP, STAGE.width, STAGE.height - STRIP);
    // Marble checker, faint, so the floor reads as bank tile.
    c.fillStyle = PALETTE.floorAlt;
    for (let y = STRIP; y < STAGE.height; y += 64) {
      for (let x = ((y / 64) % 2) * 32; x < STAGE.width; x += 64) {
        c.fillRect(x, y, 32, 32);
      }
    }
  }

  paintAreas(c) {
    for (const a of AREAS) {
      c.fillStyle = a.tint;
      c.fillRect(a.x, a.y, a.w, a.h);
      c.fillStyle = 'rgba(232,234,242,0.16)';
      c.font = `600 13px ${FONT}`;
      c.textAlign = 'left';
      c.fillText(a.name, a.x + 10, a.y + 20);
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
      c.fillStyle = PALETTE.barrier;
      c.fillRect(b.x, b.y, b.w, b.h);
      c.fillStyle = PALETTE.barrierTop;
      c.fillRect(b.x, b.y, b.w, 3);
    }
  }

  paintTreasure(c, world) {
    for (const item of TREASURE) {
      if (item.taken) continue;
      const pulse = 1 + Math.sin(world.now * 3 + item.x) * 0.12;
      if (item.kind === 'sapphire') {
        c.save();
        c.translate(item.x, item.y);
        c.scale(pulse, pulse);
        c.fillStyle = PALETTE.sapphire;
        c.beginPath();
        c.moveTo(0, -14); c.lineTo(11, 0); c.lineTo(0, 14); c.lineTo(-11, 0);
        c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.beginPath(); c.moveTo(0, -14); c.lineTo(5, 0); c.lineTo(0, 2); c.lineTo(-5, 0); c.closePath(); c.fill();
        c.restore();
        this.label(c, item.x, item.y - 26, 'STAR SAPPHIRE', PALETTE.sapphire);
      } else if (item.kind === 'gold') {
        c.fillStyle = PALETTE.gold;
        c.fillRect(item.x - 11, item.y - 6, 22, 12);
        c.fillStyle = PALETTE.goldDark;
        c.fillRect(item.x - 11, item.y + 2, 22, 4);
        c.fillStyle = 'rgba(255,255,255,0.5)';
        c.fillRect(item.x - 8, item.y - 6, 16, 3);
      } else if (item.kind === 'cash') {
        c.fillStyle = '#69b578';
        c.fillRect(item.x - 10, item.y - 7, 20, 14);
        c.fillStyle = '#3f7d4e';
        c.fillRect(item.x - 10, item.y - 2, 20, 4);
        c.fillStyle = '#dcefe0';
        c.beginPath(); c.arc(item.x, item.y, 3, 0, Math.PI * 2); c.fill();
      } else if (item.kind === 'keycard') {
        c.fillStyle = '#e8eaf2';
        c.fillRect(item.x - 9, item.y - 6, 18, 12);
        c.fillStyle = PALETTE.gold;
        c.fillRect(item.x - 9, item.y - 6, 18, 4);
        this.label(c, item.x, item.y - 20, 'KEYCARD', '#e8eaf2');
      }
    }
  }

  label(c, x, y, text, color) {
    c.font = `700 11px ${FONT}`;
    c.textAlign = 'center';
    c.fillStyle = 'rgba(10,12,26,0.75)';
    const w = c.measureText(text).width + 10;
    c.fillRect(x - w / 2, y - 10, w, 15);
    c.fillStyle = color;
    c.fillText(text, x, y + 2);
  }

  hint(c, x, y, text) {
    c.font = `700 13px ${FONT}`;
    c.textAlign = 'center';
    const w = c.measureText(text).width + 16;
    c.fillStyle = 'rgba(10,12,26,0.85)';
    c.fillRect(x - w / 2, y - 13, w, 20);
    c.fillStyle = '#e8eaf2';
    c.fillText(text, x, y + 2);
  }

  paintConsole(c, world) {
    const on = !world.camerasOffline();
    c.fillStyle = on ? '#37d67a' : '#5a6274';
    c.beginPath(); c.arc(CONSOLE.x, CONSOLE.y, 7, 0, Math.PI * 2); c.fill();
    c.strokeStyle = on ? '#37d67a' : '#5a6274';
    c.lineWidth = 2;
    c.beginPath(); c.arc(CONSOLE.x, CONSOLE.y, 12, 0, Math.PI * 2); c.stroke();
    this.label(c, CONSOLE.x, CONSOLE.y - 24, CONSOLE.label, on ? '#37d67a' : '#9aa3c0');
    if (world.rook.nearConsole() && on) {
      this.hint(c, CONSOLE.x, CONSOLE.y + 30, 'Hold E — hack cameras');
    }
  }

  paintExit(c, world) {
    const sealed = world.lockdown;
    c.fillStyle = sealed ? '#ff3b5c' : '#37d67a';
    c.fillRect(WAY_OUT.x, WAY_OUT.y - 6, WAY_OUT.w, 6);
    c.font = `700 13px ${FONT}`;
    c.textAlign = 'center';
    c.fillStyle = sealed ? '#ff3b5c' : '#37d67a';
    c.fillText(sealed ? 'EXIT — SEALED' : 'EXIT', WAY_OUT.x + WAY_OUT.w / 2, WAY_OUT.y - 14);
  }

  paintDoor(c, world) {
    const d = DOOR;
    if (world.rook.vaultOpen) {
      c.fillStyle = '#3a2f10';
      c.fillRect(d.x, d.y, d.w, d.h);
      c.fillStyle = PALETTE.gold;
      c.font = `700 11px ${FONT}`;
      c.textAlign = 'center';
      c.fillText('OPEN', d.x + d.w / 2 + 34, d.y + d.h / 2 + 4);
      return;
    }
    c.fillStyle = '#8a6d1f';
    c.fillRect(d.x, d.y, d.w, d.h);
    c.fillStyle = '#5c4712';
    for (let i = 0; i < 3; i++) c.fillRect(d.x + 2, d.y + 6 + i * 18, d.w - 4, 3);
    c.fillStyle = PALETTE.gold;
    c.beginPath(); c.arc(d.x + d.w / 2, d.y + d.h / 2, 7, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a2f10';
    c.beginPath(); c.arc(d.x + d.w / 2, d.y + d.h / 2, 3, 0, Math.PI * 2); c.fill();
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
      c.fillStyle = '#ff3b5c';
      c.fillRect(b.x0 - 4, b.y - 5, 8, 10);
      c.fillRect(b.x1 - 4, b.y - 5, 8, 10);
    }
  }

  wedge(c, x, y, angle, spread, range, fill, edge) {
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(x, y);
    c.arc(x, y, range, angle - spread, angle + spread);
    c.closePath();
    c.fill();
    c.strokeStyle = edge;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(angle - spread) * range, y + Math.sin(angle - spread) * range);
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(angle + spread) * range, y + Math.sin(angle + spread) * range);
    c.stroke();
  }

  paintLenses(c, world) {
    for (const lens of world.cameras) {
      const off = lens.offline;
      const hot = lens.seesRook;
      const fill = off ? 'rgba(120,128,145,0.10)'
        : hot ? 'rgba(255,59,92,0.34)' : 'rgba(255,196,66,0.20)';
      const edge = off ? 'rgba(120,128,145,0.5)'
        : hot ? 'rgba(255,59,92,0.9)' : 'rgba(255,196,66,0.7)';
      if (!off) this.wedge(c, lens.x, lens.y, lens.angle, EYES.lensSpread, EYES.lensReach, fill, edge);
      c.fillStyle = off ? '#5a6274' : hot ? '#ff3b5c' : '#c9d1d9';
      c.beginPath(); c.arc(lens.x, lens.y, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#10142a';
      c.beginPath(); c.arc(lens.x, lens.y, 3, 0, Math.PI * 2); c.fill();
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
      const fill = chasing ? 'rgba(255,59,92,0.36)'
        : alert ? 'rgba(255,196,66,0.26)' : 'rgba(127,176,105,0.16)';
      const edge = chasing ? 'rgba(255,59,92,0.9)'
        : alert ? 'rgba(255,196,66,0.75)' : 'rgba(127,176,105,0.55)';
      this.wedge(c, g.x, g.y, g.angle, EYES.guardSpread, EYES.guardReach, fill, edge);
      // Body: dark uniform, cap, and a facing tick.
      c.fillStyle = PALETTE.uniform;
      c.beginPath(); c.arc(g.x, g.y, 13, 0, Math.PI * 2); c.fill();
      c.fillStyle = PALETTE.watchman;
      c.beginPath(); c.arc(g.x, g.y, 8, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#20264a';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(g.x, g.y);
      c.lineTo(g.x + Math.cos(g.angle) * 13, g.y + Math.sin(g.angle) * 13);
      c.stroke();
      // Spotted meter above the head.
      if (g.spotted > 0.05) {
        const w = 30;
        c.fillStyle = 'rgba(10,12,26,0.8)';
        c.fillRect(g.x - w / 2, g.y - 26, w, 5);
        c.fillStyle = chasing ? '#ff3b5c' : '#f5c542';
        c.fillRect(g.x - w / 2, g.y - 26, w * g.spotted, 5);
      }
      if (g.state === 'investigate' || chasing) {
        c.font = `700 13px ${FONT}`;
        c.textAlign = 'center';
        c.fillStyle = chasing ? '#ff3b5c' : '#f5c542';
        c.fillText(chasing ? '!' : '?', g.x, g.y - 30);
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
    c.fillStyle = PALETTE.burglarDark;
    c.beginPath(); c.arc(0, 0, rad + 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = PALETTE.burglar;
    c.beginPath(); c.arc(0, 0, rad, 0, Math.PI * 2); c.fill();
    // Cloak point + the loot sack on the back.
    c.fillStyle = '#7a1f24';
    c.beginPath(); c.moveTo(rad, 0); c.lineTo(-rad * 0.7, -rad * 0.8); c.lineTo(-rad * 0.7, rad * 0.8); c.closePath(); c.fill();
    if (r.lootCount > 0) {
      c.fillStyle = PALETTE.gold;
      c.beginPath(); c.arc(-rad * 0.9, 0, 5, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    // Hold-to-use progress ring.
    const prog = Math.max(r.hackProgress, r.crackProgress);
    if (prog > 0) {
      c.strokeStyle = 'rgba(232,234,242,0.35)';
      c.lineWidth = 4;
      c.beginPath(); c.arc(r.x, r.y, 22, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = PALETTE.gold;
      c.beginPath(); c.arc(r.x, r.y, 22, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); c.stroke();
    }
    // Sprint noise ring.
    if (r.sprint && r.moving) {
      c.strokeStyle = 'rgba(232,234,242,0.35)';
      c.lineWidth = 2;
      c.beginPath(); c.arc(r.x, r.y, 34 + Math.sin(world.now * 10) * 4, 0, Math.PI * 2); c.stroke();
    }
  }

  paintCoin(c, world) {
    if (!world.coinFx || world.coinFx.until < world.now) return;
    const left = world.coinFx.until - world.now;
    c.strokeStyle = `rgba(245,197,66,${Math.min(1, left)})`;
    c.lineWidth = 2;
    c.beginPath(); c.arc(world.coinFx.x, world.coinFx.y, 14 + (0.9 - left) * 30, 0, Math.PI * 2); c.stroke();
    c.fillStyle = PALETTE.gold;
    c.beginPath(); c.arc(world.coinFx.x, world.coinFx.y, 4, 0, Math.PI * 2); c.fill();
  }

  paintHud(c, world) {
    c.fillStyle = PALETTE.stripBg;
    c.fillRect(0, 0, STAGE.width, STRIP);
    c.fillStyle = 'rgba(245,197,66,0.25)';
    c.fillRect(0, STRIP - 2, STAGE.width, 2);
    // Title.
    c.textAlign = 'left';
    c.fillStyle = PALETTE.gold;
    c.font = `800 20px ${FONT}`;
    c.fillText('GILDED VAULT', 16, 28);
    c.fillStyle = PALETTE.inkDim;
    c.font = `600 11px ${FONT}`;
    c.fillText('Meridian National Bank — 02:47 AM', 16, 47);
    // Alarm meter.
    const ax = 330, ay = 16, aw = 300, ah = 20;
    const a = world.alarm;
    const aColor = a >= METER.lockdown ? '#ff3b5c'
      : a >= METER.suspicious ? '#f5c542' : '#37d67a';
    c.fillStyle = 'rgba(232,234,242,0.15)';
    c.fillRect(ax, ay, aw, ah);
    c.fillStyle = aColor;
    c.fillRect(ax, ay, aw * (a / 100), ah);
    c.strokeStyle = 'rgba(232,234,242,0.5)';
    c.lineWidth = 1;
    c.strokeRect(ax, ay, aw, ah);
    c.fillStyle = PALETTE.ink;
    c.font = `700 12px ${FONT}`;
    c.textAlign = 'left';
    const aLabel = world.lockdown
      ? `LOCKDOWN  ${Math.round(a)}%  —  POLICE ${Math.ceil(world.policeTimer)}s`
      : a >= METER.suspicious ? `SUSPICIOUS  ${Math.round(a)}%` : `ALARM  ${Math.round(a)}%`;
    c.fillText(aLabel + (world.sound.muted ? '   ·   MUTED' : ''), ax, ay + ah + 15);
    // Loot + tools.
    const lootValue = world.lootValue();
    c.fillStyle = PALETTE.ink;
    c.font = `700 14px ${FONT}`;
    c.textAlign = 'left';
    c.fillText(`LOOT $${lootValue.toLocaleString('en-US')}`, 700, 26);
    c.fillStyle = PALETTE.inkDim;
    c.font = `600 12px ${FONT}`;
    const sap = world.rook.hasSapphire ? '★ SAPPHIRE' : '○ SAPPHIRE';
    const key = world.rook.hasKeycard ? 'KEYCARD ✓' : 'KEYCARD ○';
    c.fillText(`${sap}   ${key}   smoke ${world.rook.smoke}   coins ${world.rook.coins}`, 700, 46);
    // Timer + room.
    c.textAlign = 'right';
    c.fillStyle = PALETTE.ink;
    c.font = `700 16px ${FONT}`;
    const mm = String(Math.floor(world.elapsed / 60)).padStart(2, '0');
    const ss = String(Math.floor(world.elapsed % 60)).padStart(2, '0');
    c.fillText(`${mm}:${ss}`, STAGE.width - 16, 26);
    c.fillStyle = PALETTE.inkDim;
    c.font = `600 12px ${FONT}`;
    c.fillText(world.roomName(), STAGE.width - 16, 46);
    // Objective line, bottom-right (bottom-left holds the EXIT sign).
    c.textAlign = 'right';
    c.fillStyle = 'rgba(232,234,242,0.85)';
    c.font = `600 13px ${FONT}`;
    c.fillText(world.objective(), STAGE.width - 16, STAGE.height - 14);
    // Lockdown flash.
    if (world.lockdown && Math.floor(world.now * 2) % 2 === 0) {
      c.fillStyle = 'rgba(255,59,92,0.06)';
      c.fillRect(0, STRIP, STAGE.width, STAGE.height - STRIP);
    }
  }

  overlay(c, title, lines, accent) {
    c.fillStyle = 'rgba(10,12,26,0.88)';
    c.fillRect(240, 170, 800, 400);
    c.strokeStyle = accent;
    c.lineWidth = 3;
    c.strokeRect(240, 170, 800, 400);
    c.textAlign = 'center';
    c.fillStyle = accent;
    c.font = `800 44px ${FONT}`;
    c.fillText(title, 640, 250);
    c.fillStyle = PALETTE.ink;
    c.font = `600 18px ${FONT}`;
    lines.forEach((line, i) => c.fillText(line, 640, 300 + i * 32));
  }

  paintTitle(c, world) {
    c.fillStyle = 'rgba(10,12,26,0.72)';
    c.fillRect(0, STRIP, STAGE.width, STAGE.height - STRIP);
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
