// The screenshot scenes behind ?shot=start|play|win|end. Each one builds a real world and
// plays the real rules forward with a simple autopilot — plant on every cooldown at a random
// empty plot, drift the drone on a slow patrol — so the frame is what a short game really
// looks like, and a fixed seed always grows the same frame.

import { FINAL_WAVE, GARDEN, PLANT_COST } from './config.js';
import { makeRng } from './random.js';
import {
  PHASE_FIGHTING,
  SCREEN_PLAY,
  SCREEN_TITLE,
  createWorld,
  plantAt,
  plotCenter,
  stepWorld,
  addFloater,
} from './world.js';

const STEP = 1 / 30;

/** Put a flower straight into a plot, bypassing cost: set dressing for the title scene. */
function dressFlower(world, col, row) {
  const centre = plotCenter(col, row);
  world.flowers.set(col + ',' + row, {
    col,
    row,
    x: centre.x,
    y: centre.y,
    cooldown: 0.4,
    kills: 0,
    elder: col === 3 && row === 2,
    sway: col * 1.3 + row,
  });
}

/** Step the world with the autopilot at the controls for `seconds` of game time. */
function autopilot(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const t = world.time;
    const control = {
      mouseX: 480 + Math.sin(t * 0.45) * 300,
      mouseY: 300 + Math.cos(t * 0.6) * 170,
      mouseInside: true,
      left: false,
      right: false,
      up: false,
      down: false,
    };
    if (world.screen === SCREEN_PLAY && world.plantCooldown <= 0 && world.sun >= PLANT_COST) {
      // Plant at a random empty plot, the way a busy player would fill the bed.
      const empty = [];
      for (let row = 0; row < GARDEN.rows; row += 1) {
        for (let col = 0; col < GARDEN.cols; col += 1) {
          if (!world.flowers.has(col + ',' + row)) empty.push([col, row]);
        }
      }
      if (empty.length > 0) {
        const [col, row] = empty[Math.floor(world.rng() * empty.length)];
        const centre = plotCenter(col, row);
        plantAt(world, centre.x, centre.y);
      }
    }
    stepWorld(world, STEP, control);
    world.events.length = 0;
    if (world.screen !== SCREEN_PLAY) break;
  }
}

/** Build the world a screenshot name asks for, ready for one draw. */
export function buildShotScene(name, seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);
  if (name === 'play') {
    world.screen = SCREEN_PLAY;
    autopilot(world, 22);
    // Never photograph a lull: if the frame caught the breath between arrivals, play on a
    // little until the swarm is visibly marching across the lawn, not just entering it.
    const marching = () =>
      world.beetles.filter((b) => b.x > 40 && b.x < 920 && b.y > 90 && b.y < 600).length;
    let extra = 0;
    while (world.screen === SCREEN_PLAY && marching() < 2 && extra < 14) {
      autopilot(world, 0.5);
      extra += 0.5;
    }
    if (world.screen !== SCREEN_PLAY) {
      // A very unlucky garden fell before the camera arrived; regrow a hardier one.
      const retry = createWorld(makeRng(seed + 7));
      retry.screen = SCREEN_PLAY;
      autopilot(retry, 15);
      return retry;
    }
    return world;
  }
  if (name === 'win') {
    world.screen = SCREEN_PLAY;
    world.wave = FINAL_WAVE;
    world.phase = PHASE_FIGHTING;
    world.score = 1180;
    world.sun = 85;
    world.health = 64;
    // A bed in full bloom and the last two nibblers of wave 10 already inside pollen range.
    for (const [col, row] of [[0, 0], [2, 0], [4, 1], [6, 0], [1, 2], [3, 2], [5, 3], [7, 2], [2, 4], [5, 4], [0, 3], [7, 4]]) {
      dressFlower(world, col, row);
    }
    for (const [x, y] of [[430, 210], [560, 300]]) {
      world.beetles.push({
        kind: 'nibbler', hp: 1, maxHp: 3, x, y, targetX: x, targetY: y + 40,
        col: 3, row: 1, chewing: false, legPhase: 1, flash: 0,
      });
    }
    autopilot(world, 6);
    world.screen = 'won';
    return world;
  }
  if (name === 'end') {
    world.screen = SCREEN_PLAY;
    world.wave = 6;
    world.phase = PHASE_FIGHTING;
    world.score = 640;
    world.sun = 25;
    world.health = 7;
    dressFlower(world, 1, 1);
    dressFlower(world, 6, 3);
    // Three beetles already chewing the bed down; a couple of steps and the garden falls.
    for (const [col, row] of [[3, 2], [4, 1], [2, 3]]) {
      const centre = plotCenter(col, row);
      world.beetles.push({
        kind: 'nibbler', hp: 3, maxHp: 3, x: centre.x, y: centre.y, targetX: centre.x, targetY: centre.y,
        col, row, chewing: true, legPhase: 2, flash: 0,
      });
    }
    autopilot(world, 3);
    addFloater(world, 480, 130, 'the swarm broke through', '#ef476f');
    return world;
  }
  // 'start' and anything else: the title over a bed already in early bloom.
  world.screen = SCREEN_TITLE;
  dressFlower(world, 1, 1);
  dressFlower(world, 3, 2);
  dressFlower(world, 6, 1);
  dressFlower(world, 5, 3);
  dressFlower(world, 2, 4);
  return world;
}
