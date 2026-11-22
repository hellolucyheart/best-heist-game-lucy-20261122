// Gilded Vault — the bank itself: its walls, rooms, loot, cameras,
// lasers, patrols and light. Data plus the small questions the rest of
// the game keeps asking: "is this point inside a wall?" and "which room
// is this point in?"
//
// Floor plan (canvas 1280x800, HUD strip y 0..64, playfield y 64..784):
//   LOBBY (west) | TELLER HALL (centre) | SECURITY office (north-east)
//   VAULT CORRIDOR (east-centre) | VAULT (south-east) | SOUTH HALL.
// Three ways into the east wing: the main hall door, the vent duct along
// the top (crawl, cameras blind), and the south hall door. The vault door
// is the only way into the vault room and must be cracked open.
import { STAGE, STRIP } from './heist-tuning.js';

const T = 16; // wall thickness
const TOP = STRIP;
const BOT = STAGE.height - T;
const LFT = T;
const RGT = STAGE.width - T;

// Builders keep the tables short: one row per thing, no repeated keys.
function rect(x, y, w, h) { return { x, y, w, h }; }
function room(name, x, y, w, h, tint) { return { name, x, y, w, h, tint }; }
function spot(x, y, r) { return { x, y, r }; }
function loot(id, kind, x, y, label) { return { id, kind, x, y, label }; }
function lens(id, x, y, base, sweep, speed, phase) { return { id, x, y, base, sweep, speed, phase }; }
function beam(id, x0, x1, yMid, amp, speed, phase) { return { id, x0, x1, yMid, amp, speed, phase }; }
function patrol(name, waypoints, speed, pause) { return { name, waypoints, speed, pause }; }

// Every barrier is a solid rectangle. Doors are gaps between segments.
// Patrol lines were checked against these rects by hand: every guard
// waypoint segment runs clear of every wall and desk.
export const BARRIERS = [
  // Outer shell: top, right, bottom (front-door gap x 120..216), left.
  rect(LFT, TOP, RGT - LFT, T),
  rect(RGT, TOP, T, BOT - TOP),
  rect(LFT, BOT, 104, T),
  rect(216, BOT, RGT - 216, T),
  rect(LFT, TOP, T, BOT - TOP),
  // Lobby | teller hall divider (x = 300): vent mouth y 96..136, main door y 400..480.
  rect(300, TOP, T, 32),
  rect(300, 136, T, 264),
  rect(300, 480, T, BOT - 480),
  // Vent duct south wall (y = 136): the drop out is x 724..764.
  rect(316, 136, 408, T),
  // Teller hall | east wing divider (x = 780): doors y 80..176, 360..440, 560..640.
  rect(780, 176, T, 184),
  rect(780, 440, T, 120),
  rect(780, 640, T, BOT - 640),
  // Security office | vault corridor divider (y = 300): office door x 900..980.
  rect(796, 300, 104, T),
  rect(980, 300, RGT - 980, T),
  // Vault corridor | south hall divider (y = 560): corridor door x 980..1060.
  rect(796, 560, 184, T),
  rect(1060, 560, RGT - 1060, T),
  // Vault room west wall (x = 1100): the vault door is the only gap, y 430..490.
  rect(1100, 300, T, 130),
  rect(1100, 490, T, 150),
  // Vault room south wall (y = 640): second door x 1180..1240.
  rect(1116, 640, 64, T),
  rect(1240, 640, RGT - 1240, T),
  // Teller desks (cover + obstacles). Kept clear of every patrol line.
  rect(420, 220, 130, 34),
  rect(580, 220, 100, 34),
  rect(470, 560, 120, 34),
  rect(620, 560, 60, 34),
  // Planters in the lobby and hall (cover).
  rect(60, 150, 44, 44),
  rect(60, 620, 44, 44),
  rect(730, 400, 40, 40),
  // Security office desk (holds the keycard) and cabinet.
  rect(900, 110, 150, 30),
  rect(1180, 120, 60, 60),
  // Vault room pedestal plinth and gold shelf.
  rect(1130, 330, 90, 26),
  rect(1180, 600, 70, 22),
];

// Rooms, for floor tint and the "you are here" label. Checked in order.
export const AREAS = [
  room('VENT DUCT', 316, 80, 448, 56, '#141a2e'),
  room('LOBBY', LFT, TOP, 284, BOT - TOP, '#20264a'),
  room('TELLER HALL', 316, 152, 464, BOT - 152, '#232b4d'),
  room('SECURITY', 796, TOP, 468, 236, '#1a2038'),
  room('VAULT CORRIDOR', 796, 316, 304, 244, '#241f33'),
  room('VAULT', 1116, 316, 148, 324, '#2a2410'),
  room('SOUTH HALL', 796, 576, 304, BOT - 576, '#20264a'),
  room('SOUTH HALL', 1116, 656, 148, BOT - 656, '#20264a'),
];

// The vent duct: a crawl space along the top of the hall. Cameras cannot
// see in here and guards barely can, but Rook crawls slowly through it.
export const DUCT = { x: 316, y: 80, w: 448, h: 56 };

// Treasure. `taken` flips at runtime; `kind` decides value and weight.
export const TREASURE = [
  loot('keycard', 'keycard', 975, 158, 'KEYCARD'),
  loot('sapphire', 'sapphire', 1190, 470, 'STAR SAPPHIRE'),
  loot('gold1', 'gold', 1175, 372, 'GOLD BAR'),
  loot('gold2', 'gold', 470, 640, 'GOLD BAR'),
  loot('gold3', 'gold', 1040, 156, 'GOLD BAR'),
  loot('cash1', 'cash', 660, 500, 'CASH'),
  loot('cash2', 'cash', 700, 720, 'CASH'),
];

// The vault door (west wall of the vault room) and the security terminal.
export const DOOR = { x: 1100, y: 430, w: 16, h: 60 };
export const CONSOLE = { x: 905, y: 152, r: 36, label: 'SECURITY TERMINAL' };

// Rotating lenses: mounted on a wall point, sweeping around `base`.
export const LENSES = [
  lens('cam1', 548, 160, Math.PI / 2, 0.9, 0.45, 0),
  lens('cam2', 812, 316, 0.35, 0.8, 0.55, 1.6),
  lens('cam3', 940, 768, -Math.PI / 2, 0.85, 0.4, 3.1),
];

// Laser beams across the vault corridor: a horizontal line whose height
// slides up and down. Crossing one trips the alarm.
export const BEAMS = [
  beam('laser1', 800, 1096, 380, 52, 0.5, 0),
  beam('laser2', 800, 1096, 490, 44, 0.65, 2.2),
];

// Guard patrols: named watchmen, waypoint loops, pause at each stop.
// Every segment was checked clear of walls and desks (see BARRIERS note).
export const PATROLS = [
  patrol('Marco', [[380, 180], [700, 180], [700, 620], [380, 620]], 62, 1.2),
  patrol('Dana', [[200, 700], [200, 440], [440, 440], [440, 640], [160, 640]], 58, 1.0),
  patrol('Petra', [[850, 170], [1050, 170], [1050, 260], [940, 260], [940, 380], [1040, 380], [1040, 520], [860, 520], [860, 380], [940, 380]], 66, 0.9),
  patrol('Viktor', [[860, 700], [1200, 700], [1200, 660], [860, 660]], 60, 1.1),
];

// Dark corners (hide) and lit pools (expose), as circles.
export const DARK = [
  spot(82, 172, 46), spot(82, 642, 46),
  spot(750, 420, 42), spot(340, 740, 44),
  spot(1210, 130, 40), spot(830, 730, 42),
];
export const GLOW = [
  spot(485, 237, 58), spot(630, 237, 58),
  spot(530, 577, 58), spot(650, 577, 58),
  spot(1190, 470, 66),
];

// The way out: the front door at the bottom of the lobby.
export const WAY_OUT = { x: 120, y: 784, w: 96, h: 16 };
export const START = { x: 160, y: 730 };

function inside(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

function insideCircle(x, y, c) {
  const dx = x - c.x, dy = y - c.y;
  return dx * dx + dy * dy < c.r * c.r;
}

export function isWall(x, y) {
  return BARRIERS.some((b) => inside(x, y, b));
}

export function areaName(x, y) {
  const hit = AREAS.find((a) => inside(x, y, a));
  return hit ? hit.name : '';
}

export function inDuct(x, y) {
  return inside(x, y, DUCT);
}

export function inDark(x, y) {
  return DARK.some((c) => insideCircle(x, y, c));
}

export function inGlow(x, y) {
  return GLOW.some((c) => insideCircle(x, y, c));
}
