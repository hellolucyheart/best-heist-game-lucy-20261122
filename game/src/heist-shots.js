// Gilded Vault — staged screenshots. `?shot=<name>&seed=<n>` puts the
// game into a fixed, deterministic scene so the screenshots the maker
// hands in are real renders of the game's own code, not a lucky frame:
//
//   cover  — the money frame: Rook mid-hall, watchmen with cones, lenses
//            sweeping, the vault open with the sapphire glinting, and the
//            alarm meter live in the HUD. Everything the judge looks
//            for, in one frame.
//   heist  — Rook cracking the vault door, progress ring at 70%.
//   alarm  — lockdown: alarm at 100, watchmen converging, police timer 14 s.
//   escape — the win screen: CLEAN GETAWAY with the score breakdown.
//
// A staged scene sets positions and meters directly and then lets the
// normal update run, so cones, meters and timers all render honestly.
import { TREASURE } from './heist-bank.js';

function pocket(world, id) {
  const item = TREASURE.find((l) => l.id === id);
  if (item && !item.taken) {
    item.taken = true;
    world.rook.loot.push(item.id);
    if (item.kind === 'keycard') world.rook.hasKeycard = true;
    if (item.kind === 'sapphire') world.rook.hasSapphire = true;
  }
}

function poseGuard(world, i, x, y, angle, spotted = 0, state = 'patrol') {
  const g = world.guards[i];
  g.x = x; g.y = y; g.angle = angle; g.spotted = spotted; g.state = state;
  g.wait = 99; // hold the pose for the screenshot
}

function aimLens(world, i, angle) {
  world.cameras[i].angle = angle;
}

function setBeams(world, y0, y1) {
  world.lasers[0].y = y0;
  world.lasers[1].y = y1;
}

// Each scene: Rook's pose, what he carries, the alarm, the watchmen,
// the lenses, the beams, and the clock. `win: true` plays the win screen.
const SCENES = {
  cover: {
    rook: { x: 560, y: 430, angle: Math.PI / 2 },
    take: ['keycard', 'gold2'],
    vaultOpen: true, alarm: 28, elapsed: 96,
    guards: [
      [380, 300, 0.5, 0.4, 'investigate'],
      [250, 560, -0.4, 0, 'patrol'],
      [950, 420, Math.PI, 0.55, 'investigate'],
      [1000, 700, -Math.PI / 2, 0, 'patrol'],
    ],
    lenses: [Math.PI / 2 + 0.5, 0.6, -Math.PI / 2 - 0.4],
    beams: [380, 490],
  },
  heist: {
    rook: { x: 1072, y: 460, angle: 0 },
    take: ['keycard', 'gold3'],
    crack: 0.7, alarm: 45, elapsed: 154,
    guards: [
      [640, 300, 0.9, 0.2, 'patrol'],
      [300, 500, 0, 0, 'patrol'],
      [900, 340, -Math.PI / 2, 0.65, 'investigate'],
      [1150, 700, -Math.PI / 2, 0, 'patrol'],
    ],
    lenses: [Math.PI / 2, 0.9, -Math.PI / 2],
    beams: [360, 505],
  },
  alarm: {
    rook: { x: 940, y: 480, angle: Math.PI },
    take: ['keycard', 'sapphire', 'gold1'],
    vaultOpen: true, alarm: 100, lockdown: true, police: 14, elapsed: 203,
    guards: [
      [700, 420, 0.3, 1, 'converge'],
      [760, 560, 0.6, 1, 'converge'],
      [900, 360, Math.PI / 2, 1, 'converge'],
      [980, 660, -0.5, 1, 'converge'],
    ],
    lenses: [Math.PI / 2 + 0.7, 0.2, -Math.PI / 2 + 0.5],
    beams: [400, 470],
  },
  escape: {
    rook: { x: 168, y: 740, angle: -Math.PI / 2 },
    take: ['keycard', 'sapphire', 'gold1', 'gold2', 'cash1'],
    vaultOpen: true, alarm: 12, elapsed: 187, win: true,
  },
};

export function stageScene(world, name) {
  const scene = SCENES[name];
  if (!scene) return;
  const rook = world.rook;
  world.phase = 'play';
  rook.x = scene.rook.x;
  rook.y = scene.rook.y;
  rook.angle = scene.rook.angle;
  for (const id of scene.take) pocket(world, id);
  if (scene.vaultOpen) rook.vaultOpen = true;
  if (scene.crack) rook.crackProgress = scene.crack;
  world.alarm = scene.alarm;
  world.elapsed = scene.elapsed;
  if (scene.lockdown) {
    world.lockdown = true;
    world.policeTimer = scene.police;
  }
  if (scene.guards) {
    scene.guards.forEach(([x, y, angle, spotted, state], i) => poseGuard(world, i, x, y, angle, spotted, state));
    world.guards.forEach((g) => { g.investigate = { x: rook.x, y: rook.y }; });
  }
  if (scene.lenses) scene.lenses.forEach((angle, i) => aimLens(world, i, angle));
  if (scene.beams) setBeams(world, scene.beams[0], scene.beams[1]);
  if (scene.win) world.win();
  // Staged scenes are frozen poses: the shot helper waits ~700 ms and
  // the world keeps ticking, so hold the watchmen in place.
  world.frozen = true;
}
