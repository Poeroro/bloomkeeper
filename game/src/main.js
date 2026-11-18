// Bloomkeeper's boot and loop: wire the canvas, input, world and renderer together, run the
// frame loop, and translate clicks into meaning for the screen they land on — the button on
// the title and ending screens, a planting on the play screen. With ?shot=<name>&seed=<n> in
// the address it instead builds one deterministic scene from shots.js and draws a single
// frame, which is how the entry's screenshots are taken.

import {
  chewSound,
  deniedSound,
  loseSound,
  plantSound,
  popSound,
  shootSound,
  unlockAudio,
  winSound,
} from './audio.js';
import { createInput, keyDown } from './input.js';
import { makeRng } from './random.js';
import { drawScene, mainButtonRect, pointInRect } from './render.js';
import { buildShotScene } from './shots.js';
import {
  SCREEN_LOST,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WON,
  createWorld,
  plantAt,
  startGame,
  stepWorld,
} from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const input = createInput(canvas);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? seedParam : (Date.now() % 2147483647) + 1;

const SOUND_BY_EVENT = {
  plant: plantSound,
  denied: deniedSound,
  shoot: shootSound,
  pop: popSound,
  chew: chewSound,
  win: winSound,
  lose: loseSound,
};

function playEvents(world) {
  for (const name of world.events) {
    const sound = SOUND_BY_EVENT[name];
    if (sound) sound();
  }
  world.events.length = 0;
}

const STATUS_BY_SCREEN = {
  [SCREEN_TITLE]: 'Bloomkeeper. Click Start gardening to play.',
  [SCREEN_PLAY]: 'Playing. Click a soil plot to plant a bloom.',
  [SCREEN_WON]: 'You held all ten waves. The garden blooms.',
  [SCREEN_LOST]: 'The garden was eaten. Click Play again to retry.',
};

if (shotName) {
  // One still frame for the screenshotter; no loop, no sound.
  const world = buildShotScene(shotName, seed);
  drawScene(ctx, world);
  window.__shotReady = true;
} else {
  const world = createWorld(makeRng(seed));
  window.__bloom = { world };
  let last = performance.now();
  let lastStatus = '';

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    let click = input.takeClick();
    while (click) {
      unlockAudio();
      if (world.screen === SCREEN_PLAY) {
        if (click.viaKey) plantAt(world, world.drone.x, world.drone.y);
        else plantAt(world, click.x, click.y);
      } else if (pointInRect(click.x, click.y, mainButtonRect())) {
        startGame(world);
      }
      click = input.takeClick();
    }
    if (world.screen !== SCREEN_PLAY &&
        (keyDown(input, 'Enter') || keyDown(input, 'KeyR'))) {
      startGame(world);
    }

    stepWorld(world, dt, {
      mouseX: input.mouse.x,
      mouseY: input.mouse.y,
      mouseInside: input.mouse.inside,
      left: keyDown(input, 'KeyA', 'ArrowLeft'),
      right: keyDown(input, 'KeyD', 'ArrowRight'),
      up: keyDown(input, 'KeyW', 'ArrowUp'),
      down: keyDown(input, 'KeyS', 'ArrowDown'),
    });
    playEvents(world);
    drawScene(ctx, world);

    const line = STATUS_BY_SCREEN[world.screen];
    if (line && line !== lastStatus) {
      lastStatus = line;
      if (status) status.textContent = line;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
