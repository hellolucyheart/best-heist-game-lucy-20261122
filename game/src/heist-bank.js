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

function rect(x, y, w, h) { return { x, y, w, h }; }

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
  { name: 'VENT DUCT', x: 316, y: 80, w: 448, h: 56, tint: '#141a2e' },
  { name: 'LOBBY', x: LFT, y: TOP, w: 284, h: BOT - TOP, tint: '#20264a' },
  { name: 'TELLER HALL', x: 316, y: 152, w: 464, h: BOT - 152, tint: '#232b4d' },
  { name: 'SECURITY', x: 796, y: TOP, w: 468, h: 236, tint: '#1a2038' },
  { name: 'VAULT CORRIDOR', x: 796, y: 316, w: 304, h: 244, tint: '#241f33' },
  { name: 'VAULT', x: 1116, y: 316, w: 148, h: 324, tint: '#2a2410' },
  { name: 'SOUTH HALL', x: 796, y: 576, w: 304, h: BOT - 576, tint: '#20264a' },
  { name: 'SOUTH HALL', x: 1116, y: 656, w: 148, h: BOT - 656, tint: '#20264a' },
];

// The vent duct: a crawl space along the top of the hall. Cameras cannot
// see in here and guards barely can, but Rook crawls slowly through it.
export const DUCT = { x: 316, y: 80, w: 448, h: 56 };

// Treasure. `taken` flips at runtime; `kind` decides value and weight.
export const TREASURE = [
  { id: 'keycard', kind: 'keycard', x: 975, y: 158, label: 'KEYCARD' },
  { id: 'sapphire', kind: 'sapphire', x: 1190, y: 470, label: 'STAR SAPPHIRE' },
  { id: 'gold1', kind: 'gold', x: 1175, y: 372, label: 'GOLD BAR' },
  { id: 'gold2', kind: 'gold', x: 470, y: 640, label: 'GOLD BAR' },
  { id: 'gold3', kind: 'gold', x: 1040, y: 156, label: 'GOLD BAR' },
  { id: 'cash1', kind: 'cash', x: 660, y: 500, label: 'CASH' },
  { id: 'cash2', kind: 'cash', x: 700, y: 720, label: 'CASH' },
];

// The vault door (west wall of the vault room) and the security terminal.
export const DOOR = { x: 1100, y: 430, w: 16, h: 60 };
export const CONSOLE = { x: 905, y: 152, r: 36, label: 'SECURITY TERMINAL' };

// Rotating lenses: mounted on a wall point, sweeping around `base`.
export const LENSES = [
  { id: 'cam1', x: 548, y: 160, base: Math.PI / 2, sweep: 0.9, speed: 0.45, phase: 0 },
  { id: 'cam2', x: 812, y: 316, base: 0.35, sweep: 0.8, speed: 0.55, phase: 1.6 },
  { id: 'cam3', x: 940, y: 768, base: -Math.PI / 2, sweep: 0.85, speed: 0.4, phase: 3.1 },
];

// Laser beams across the vault corridor: a horizontal line whose height
// slides up and down. Crossing one trips the alarm.
export const BEAMS = [
  { id: 'laser1', x0: 800, x1: 1096, yMid: 380, amp: 52, speed: 0.5, phase: 0 },
  { id: 'laser2', x0: 800, x1: 1096, yMid: 490, amp: 44, speed: 0.65, phase: 2.2 },
];

// Guard patrols: named watchmen, waypoint loops, pause at each stop.
// Every segment was checked clear of walls and desks (see BARRIERS note).
export const PATROLS = [
  { name: 'Marco', waypoints: [[380, 180], [700, 180], [700, 620], [380, 620]], speed: 62, pause: 1.2 },
  { name: 'Dana', waypoints: [[200, 700], [200, 440], [440, 440], [440, 640], [160, 640]], speed: 58, pause: 1.0 },
  { name: 'Petra', waypoints: [[850, 170], [1050, 170], [1050, 260], [940, 260], [940, 380], [1040, 380], [1040, 520], [860, 520], [860, 380], [940, 380]], speed: 66, pause: 0.9 },
  { name: 'Viktor', waypoints: [[860, 700], [1200, 700], [1200, 660], [860, 660]], speed: 60, pause: 1.1 },
];

// Dark corners (hide) and lit pools (expose), as circles.
export const DARK = [
  { x: 82, y: 172, r: 46 }, { x: 82, y: 642, r: 46 },
  { x: 750, y: 420, r: 42 }, { x: 340, y: 740, r: 44 },
  { x: 1210, y: 130, r: 40 }, { x: 830, y: 730, r: 42 },
];
export const GLOW = [
  { x: 485, y: 237, r: 58 }, { x: 630, y: 237, r: 58 },
  { x: 530, y: 577, r: 58 }, { x: 650, y: 577, r: 58 },
  { x: 1190, y: 470, r: 66 },
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
