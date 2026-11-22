// Gilded Vault — every number the game balances on, in one place.
// Edit the table, not the code: speeds, alarm rates, sight factors,
// tool counts and score values all live here and nowhere else.
export const STAGE = { width: 1280, height: 800 };
export const STRIP = 64; // HUD band across the top of the canvas

// The burglar. Speeds are px/s; carrying loot makes Rook heavier.
export const BURGLAR = {
  walk: 175,
  sprint: 262,
  crouch: 96,
  duct: 88,
  radius: 13,
  slowPerItem: 0.06,
  heardWhileSprinting: 118, // guards hear sprinting footsteps this far
  coinHeard: 150, // a tossed coin is heard this far
};

// The alarm meter: 0 is calm, 35 is suspicious, 100 locks the bank down.
export const METER = {
  guardPressure: 26, // per second while a guard's cone holds Rook
  lensPressure: 34, // per second while a camera's cone holds Rook
  beamTrip: 25, // flat jump when a laser beam is crossed
  drain: 7, // per second while nobody can see Rook
  drainLocked: 3, // slower drain during lockdown
  suspicious: 35,
  lockdown: 100,
  calmAgain: 70, // lockdown lifts once the meter drops under this
  police: 20, // seconds on the police clock once lockdown starts
};

// Eyes: how far a cone reaches, how wide it opens, and what changes it.
export const EYES = {
  guardReach: 215,
  guardSpread: 0.61, // ~35 degrees either side of facing
  lensReach: 245,
  lensSpread: 0.49, // ~28 degrees either side
  crouched: 0.6, // harder to spot while crouched
  sprinting: 1.3, // easier to spot while sprinting
  shadowed: 0.5, // dark corners hide Rook
  lit: 1.3, // lit pools expose Rook
  ducted: 0.3, // inside the vent, barely visible at all
  loaded: 1.08, // each loot item makes Rook easier to spot
};

// Tools. Everything costs something — that is the heist.
export const GEAR = {
  smoke: 2, // Q: a pellet that blinds every eye for 6 s
  smokeRadius: 78,
  smokeTime: 6,
  coins: 3, // click: toss a coin, guards walk over to the clink
  hackTime: 2, // hold E at the terminal to switch the cameras off…
  hackOff: 12, // …for this long
  crackTime: 3, // hold E at the vault door to crack it
  grabRange: 18, // a chasing guard this close ends the night
  giveUp: 2.5, // a guard stops chasing after this long without seeing Rook
};

// The score: loot value plus a bonus for a fast, clean night.
export const POINTS = {
  sapphire: 5000,
  goldBar: 800,
  cashStack: 400,
  perSecond: 10, // time bonus per second under the cap
  capSeconds: 600,
};

export const PALETTE = {
  floor: '#1d2440',
  floorAlt: '#232b4d',
  marble: '#2b3358',
  barrier: '#0e1226',
  barrierTop: '#3a4470',
  gold: '#f5c542',
  goldDark: '#a8842a',
  sapphire: '#4dd7ff',
  burglar: '#e5484d',
  burglarDark: '#8f2b30',
  watchman: '#7fb069',
  uniform: '#4a6b3f',
  lens: '#c9d1d9',
  beam: '#ff3b5c',
  haze: '#9aa3b2',
  stripBg: '#10142a',
  ink: '#e8eaf2',
  inkDim: '#9aa3c0',
};
