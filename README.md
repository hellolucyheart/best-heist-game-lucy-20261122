# best-heist-game-lucy-20261122

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/hellolucyheart/best-heist-game-lucy-20261122/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/hellolucyheart/best-heist-game-lucy-20261122/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Gilded Vault** — a complete, original top-down bank heist game that plays offline in a desktop browser. One night at Meridian National Bank: Rook the cat burglar slips in through the lobby, lifts the keycard from the Security office, cracks the vault door open, pockets the Star Sapphire, and walks out the front door before the police arrive.

What stands between Rook and the sapphire: four watchmen on patrol with vision cones, three sweeping security cameras, and two laser beams across the vault corridor. Every eye that finds Rook pushes the alarm meter up — at 100% the bank locks down, the exit seals, and a 20-second police timer starts. The tools all cost something: two smoke pellets, three coins to toss as distractions, a camera hack at the security terminal, and a vent duct the cameras cannot see into. Every gold bar Rook carries slows him down, so each piece of loot is a risk decision.

## How to play

```sh
node serve.ts
```

Then open http://localhost:8080.

- **WASD / arrows** — move · **Shift** — sprint (loud) · **C** — crouch (hidden)
- **E (hold)** — hack the terminal / crack the vault · **Q** — smoke pellet
- **Click** — toss a coin to distract a guard · **M** — mute · **Enter** — start · **R** — retry

## How it is built

Plain JavaScript modules under `game/src/`, no dependencies and no build step: a tuning table (`heist-tuning.js`), the bank itself (`heist-bank.js`), sight and movement (`heist-sight.js`), watchmen (`heist-guard.js`), cameras and lasers (`heist-camera.js`), the burglar (`heist-burglar.js`), the synth sound board (`heist-audio.js`), the canvas renderer (`heist-paint.js`), staged screenshots (`heist-shots.js`), input (`heist-input.js`) and the world loop (`heist-main.js`). `main.ts` hands the game in to make.fun's grader; `shots.json` lists the four staged screenshots.

---

<sub>Entered on [make.fun](https://make.fun/?ref=68wvraae&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
