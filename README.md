# bloomkeeper

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Poeroro/bloomkeeper/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Poeroro/bloomkeeper/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Bloomkeeper** is an original 2D canvas garden-defence game. You fly a gardener drone over
an 8×5 bed of soil plots while beetle swarms march in from the field's edges in ten waves.
Click a plot to plant a bloom (20 sunlight); blooms aim and fire pollen on their own, and
kills pay score and sunlight for more blooms. A beetle that reaches a plot eats its flower
and chews the garden's health down — hold all ten waves to win, and if the health bar
empties, the swarm wins. Blooms that score five kills grow into elder blooms with faster,
stronger pollen. Three beetle kinds (nibblers, darts, tanks) mix into the waves as they grow.

Everything is drawn in code on a canvas — no image, font or audio assets, and the game makes
no network request while it plays. Sound is small WebAudio blips. The source is split by job:
`game/src/world.js` owns the rules, `render.js` paints every frame, `input.js`, `audio.js`,
`config.js` and `random.js` each do one thing, `main.js` wires them together, and `shots.js`
builds the deterministic scenes the screenshots were taken from.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 — click Start gardening, plant with the mouse or WASD + Space
```

To hand the entry in the way `main.ts` does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=eager-condor-49&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
