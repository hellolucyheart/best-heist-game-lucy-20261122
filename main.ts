// Gilded Vault — the hand-in program (Node 22, standard library only).
//
// It copies the game and its screenshots into the hand-in folder
// (/output, or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, so the sealed
// scorer can check the entry and the judge can read it.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const target = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, mirrored here so a bad entry fails loudly at home
// instead of quietly on the server: at most 4 screenshots of 256 KiB,
// at most 993 files and 48 MiB under game/, paths under 1000 bytes, and
// the dossier text capped at 160 KiB — all inside /output's 1000-entry,
// 64 MiB budget shared by game/, screenshots/ and dossier.json.
const DOSSIER_OPTS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn() {
  const gameEntry = join(here, 'game', 'index.html');
  if (!existsSync(gameEntry)) {
    throw new Error('game/index.html is missing — the entry has no game to hand in');
  }
  mkdirSync(target, { recursive: true });
  cpSync(join(here, 'game'), join(target, 'game'), { recursive: true });
  const shotsOut = join(target, 'screenshots');
  mkdirSync(shotsOut, { recursive: true });
  const shotsIn = join(here, 'screenshots');
  if (existsSync(shotsIn)) cpSync(shotsIn, shotsOut, { recursive: true });
  writeFileSync(join(target, 'dossier.json'), buildDossier(target, DOSSIER_OPTS));
}

handIn();
