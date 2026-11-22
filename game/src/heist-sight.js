// Gilded Vault — sight and touch: line-of-sight sampling, vision
// cones, circle-vs-wall sliding, and point-to-segment distance.
//
// Deliberately simple (sampled, not analytic): the bank's walls are
// rectangles, so stepping along a sight line and asking "is this point
// in a wall?" is exact enough at 4 px steps and cheap enough every frame.
import { BARRIERS, isWall } from './heist-bank.js';
import { EYES } from './heist-tuning.js';

// True when nothing solid stands between (x0,y0) and (x1,y1).
export function clearLine(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
  for (let i = 1; i < steps; i++) {
    if (isWall(x0 + (dx * i) / steps, y0 + (dy * i) / steps)) return false;
  }
  return true;
}

// True when (tx,ty) sits inside the cone from (x,y) facing `angle` with
// `spread` on either side and `reach` range, with a clear sight line.
export function seesInCone(x, y, angle, spread, reach, tx, ty) {
  const dx = tx - x, dy = ty - y;
  const dist = Math.hypot(dx, dy);
  if (dist > reach) return false;
  if (dist < 1) return true;
  const off = Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle));
  if (Math.abs(off) > spread) return false;
  return clearLine(x, y, tx, ty);
}

// Slide a disc (centre p, radius r) by (dx,dy) along the walls.
// Axis-separated: try x, resolve, then y, resolve.
export function slideDisc(p, r, dx, dy) {
  let nx = p.x + dx;
  if (discHitsBarrier(nx, p.y, r)) nx = p.x;
  let ny = p.y + dy;
  if (discHitsBarrier(nx, ny, r)) ny = p.y;
  return { x: nx, y: ny };
}

export function discHitsBarrier(x, y, r) {
  for (const b of BARRIERS) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const ddx = x - cx, ddy = y - cy;
    if (ddx * ddx + ddy * ddy < r * r) return true;
  }
  return false;
}

// Shortest distance from point (px,py) to segment (x0,y0)-(x1,y1).
export function pointSeg(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x0) * dx + (py - y0) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

// How exposed is Rook right now? 1 is normal; lower hides, higher exposes.
export function exposure(x, y, flags) {
  let v = 1;
  if (flags.crouch) v *= EYES.crouched;
  if (flags.sprint) v *= EYES.sprinting;
  if (flags.inVent) v *= EYES.ducted;
  else if (flags.inShadow) v *= EYES.shadowed;
  if (flags.inLight) v *= EYES.lit;
  if (flags.lootCount > 0) v *= 1 + (EYES.loaded - 1) * flags.lootCount;
  return v;
}

// Deterministic PRNG (mulberry32) so staged screenshots never wobble.
export function seededRand(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
