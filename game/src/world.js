// Bloomkeeper's world: the garden, its flowers, the beetle swarm, the pollen in the air and
// the drone, advanced one fixed step at a time. This file owns the rules — planting, firing,
// chewing, scoring, winning and losing — and knows nothing about pixels or sound; render.js
// draws what lives here and main.js feeds it input and time.

import {
  BEETLE_KINDS,
  CHEW_DAMAGE_PER_SECOND,
  DRONE,
  FIELD,
  FINAL_WAVE,
  FLOWER,
  GARDEN,
  PLANT_COOLDOWN,
  PLANT_COST,
  START_HEALTH,
  START_SUN,
  WAVE_BREAK_SECONDS,
  waveMix,
  waveSize,
} from './config.js';
import { range } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

export const PHASE_FIGHTING = 'fighting';
export const PHASE_BREAK = 'break';

/** The centre of a garden plot, in field coordinates. */
export function plotCenter(col, row) {
  return {
    x: GARDEN.originX + col * GARDEN.cell + GARDEN.cell / 2,
    y: GARDEN.originY + row * GARDEN.cell + GARDEN.cell / 2,
  };
}

/** The plot a field point falls in, or null when the point is off the bed. */
export function plotAt(x, y) {
  const col = Math.floor((x - GARDEN.originX) / GARDEN.cell);
  const row = Math.floor((y - GARDEN.originY) / GARDEN.cell);
  if (col < 0 || row < 0 || col >= GARDEN.cols || row >= GARDEN.rows) return null;
  return { col, row };
}

function plotKey(col, row) {
  return col + ',' + row;
}

/** A fresh game: an empty bed, a full purse of sunlight and wave 1 about to arrive. */
export function createWorld(rng) {
  return {
    rng,
    screen: SCREEN_TITLE,
    time: 0,
    score: 0,
    sun: START_SUN,
    health: START_HEALTH,
    wave: 0,
    phase: PHASE_BREAK,
    phaseTimer: 1.2,
    toSpawn: 0,
    spawnTimer: 0,
    flowers: new Map(),
    beetles: [],
    pollen: [],
    particles: [],
    floaters: [],
    drone: { x: FIELD.width / 2, y: 120 },
    plantCooldown: 0,
    shake: 0,
    events: [],
  };
}

/** Begin (or begin again): clear the bed and send wave 1. */
export function startGame(world) {
  const fresh = createWorld(world.rng);
  fresh.screen = SCREEN_PLAY;
  Object.assign(world, fresh);
}

/** Queue a sound-side event ('plant', 'pop', ...) for main.js to play; world stays silent. */
function emit(world, name) {
  world.events.push(name);
}

/**
 * Plant a flower on the plot under (x, y). Returns true when a flower went in; a taken plot,
 * thin sunlight or the planting cooldown refuse quietly and return false.
 */
export function plantAt(world, x, y) {
  const plot = plotAt(x, y);
  if (!plot) return false;
  if (world.plantCooldown > 0) return false;
  const key = plotKey(plot.col, plot.row);
  if (world.flowers.has(key)) {
    emit(world, 'denied');
    return false;
  }
  if (world.sun < PLANT_COST) {
    emit(world, 'denied');
    addFloater(world, x, y - 18, 'need sunlight', '#ef476f');
    return false;
  }
  const centre = plotCenter(plot.col, plot.row);
  world.flowers.set(key, {
    col: plot.col,
    row: plot.row,
    x: centre.x,
    y: centre.y,
    cooldown: range(world.rng, 0, 0.3),
    kills: 0,
    elder: false,
    sway: range(world.rng, 0, Math.PI * 2),
  });
  world.sun -= PLANT_COST;
  world.plantCooldown = PLANT_COOLDOWN;
  emit(world, 'plant');
  burst(world, centre.x, centre.y, '#4c956c', 6, 60);
  return true;
}

/** Start the next wave: count its beetles and stagger their arrival. */
function beginWave(world) {
  world.wave += 1;
  world.toSpawn = waveSize(world.wave);
  world.spawnTimer = 0;
  world.phase = PHASE_FIGHTING;
}

/** Bring one beetle in from a field edge, marching on a plot chosen by the rng. */
function spawnBeetle(world) {
  const kindName = waveMix(world.wave, world.rng);
  const kind = BEETLE_KINDS[kindName];
  const col = Math.floor(world.rng() * GARDEN.cols);
  const row = Math.floor(world.rng() * GARDEN.rows);
  const target = plotCenter(col, row);
  const edge = world.rng();
  let x;
  let y;
  if (edge < 0.5) {
    x = range(world.rng, 60, FIELD.width - 60);
    y = -24;
  } else if (edge < 0.75) {
    x = -24;
    y = range(world.rng, 120, 300);
  } else {
    x = FIELD.width + 24;
    y = range(world.rng, 120, 300);
  }
  world.beetles.push({
    kind: kindName,
    hp: kind.hp,
    maxHp: kind.hp,
    x,
    y,
    targetX: target.x + range(world.rng, -10, 10),
    targetY: target.y + range(world.rng, -10, 10),
    col,
    row,
    chewing: false,
    legPhase: range(world.rng, 0, Math.PI * 2),
    flash: 0,
  });
}

/** A burst of soft particles (petals, soil, shell bits) at a point. */
export function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng() * Math.PI * 2;
    const v = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 30,
      life: range(world.rng, 0.3, 0.7),
      maxLife: 0.7,
      color,
      size: range(world.rng, 2, 4.5),
    });
  }
}

/** A line of floating text (score popups, warnings) that rises and fades. */
export function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, life: 1.1 });
}

/** Kill a beetle: pay its score and sunlight, burst its shell, credit its flower. */
function killBeetle(world, beetle, flower) {
  const kind = BEETLE_KINDS[beetle.kind];
  world.score += kind.score;
  world.sun += kind.sun;
  addFloater(world, beetle.x, beetle.y - 16, '+' + kind.score, '#ffd166');
  burst(world, beetle.x, beetle.y, kind.shell, 10, 110);
  emit(world, 'pop');
  if (flower) {
    flower.kills += 1;
    if (!flower.elder && flower.kills >= FLOWER.elderAtKills) {
      flower.elder = true;
      burst(world, flower.x, flower.y, '#f4a259', 12, 90);
      addFloater(world, flower.x, flower.y - 30, 'elder bloom!', '#f4a259');
    }
  }
}

/** Advance the whole world by dt seconds. Only the play screen simulates. */
export function stepWorld(world, dt, control) {
  world.time += dt;
  if (world.screen !== SCREEN_PLAY) return;

  // The drone trails the mouse; held keys fly it instead and are the finer tool.
  const keyX = (control.right ? 1 : 0) - (control.left ? 1 : 0);
  const keyY = (control.down ? 1 : 0) - (control.up ? 1 : 0);
  if (keyX !== 0 || keyY !== 0) {
    const len = Math.hypot(keyX, keyY) || 1;
    world.drone.x += (keyX / len) * DRONE.keySpeed * dt;
    world.drone.y += (keyY / len) * DRONE.keySpeed * dt;
  } else if (control.mouseInside) {
    const dx = control.mouseX - world.drone.x;
    const dy = control.mouseY - world.drone.y;
    const follow = Math.min(1, dt * 14);
    world.drone.x += dx * follow;
    world.drone.y += dy * follow;
  }
  world.drone.x = Math.max(20, Math.min(FIELD.width - 20, world.drone.x));
  world.drone.y = Math.max(20, Math.min(FIELD.height - 20, world.drone.y));

  if (world.plantCooldown > 0) world.plantCooldown -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 3);

  // Waves: a break to breathe and plant, then the next swarm.
  if (world.phase === PHASE_BREAK) {
    world.phaseTimer -= dt;
    if (world.phaseTimer <= 0) beginWave(world);
  } else if (world.toSpawn > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      spawnBeetle(world);
      world.toSpawn -= 1;
      world.spawnTimer = Math.max(0.25, 1.1 - world.wave * 0.06);
    }
  }

  stepBeetles(world, dt);
  stepFlowers(world, dt);
  stepPollen(world, dt);
  stepEffects(world, dt);

  // The wave is beaten when nothing is left to come and nothing is left alive.
  if (world.phase === PHASE_FIGHTING && world.toSpawn === 0 && world.beetles.length === 0) {
    if (world.wave >= FINAL_WAVE) {
      world.screen = SCREEN_WON;
      emit(world, 'win');
    } else {
      world.phase = PHASE_BREAK;
      world.phaseTimer = WAVE_BREAK_SECONDS;
      world.sun += 10;
      addFloater(world, FIELD.width / 2, 120, 'wave ' + world.wave + ' held  ·  +10 sunlight', '#ffd166');
    }
  }
  if (world.health <= 0) {
    world.health = 0;
    world.screen = SCREEN_LOST;
    world.shake = 1;
    emit(world, 'lose');
  }
}

/** Beetles march on their plot; arriving, they eat its flower and chew the garden down. */
function stepBeetles(world, dt) {
  for (const beetle of world.beetles) {
    beetle.legPhase += dt * 10;
    if (beetle.flash > 0) beetle.flash -= dt;
    if (beetle.chewing) {
      world.health -= CHEW_DAMAGE_PER_SECOND * dt;
      world.shake = Math.max(world.shake, 0.25);
      emit(world, 'chew');
      continue;
    }
    const dx = beetle.targetX - beetle.x;
    const dy = beetle.targetY - beetle.y;
    const dist = Math.hypot(dx, dy);
    const kind = BEETLE_KINDS[beetle.kind];
    if (dist < 6) {
      beetle.chewing = true;
      const key = plotKey(beetle.col, beetle.row);
      if (world.flowers.has(key)) {
        const flower = world.flowers.get(key);
        burst(world, flower.x, flower.y, '#ef6f9c', 10, 90);
        world.flowers.delete(key);
        addFloater(world, beetle.x, beetle.y - 20, 'a bloom is eaten!', '#ef476f');
      }
    } else {
      beetle.x += (dx / dist) * kind.speed * dt;
      beetle.y += (dy / dist) * kind.speed * dt;
    }
  }
}

/** Flowers scan for the nearest beetle in range and loose pollen at it on their own pace. */
function stepFlowers(world, dt) {
  for (const flower of world.flowers.values()) {
    flower.cooldown -= dt;
    if (flower.cooldown > 0) continue;
    let best = null;
    let bestDist = FLOWER.range;
    for (const beetle of world.beetles) {
      const d = Math.hypot(beetle.x - flower.x, beetle.y - flower.y);
      if (d < bestDist) {
        best = beetle;
        bestDist = d;
      }
    }
    if (!best) continue;
    flower.cooldown = flower.elder ? FLOWER.elderFireEvery : FLOWER.fireEvery;
    world.pollen.push({
      x: flower.x,
      y: flower.y - 14,
      target: best,
      from: flower,
      speed: FLOWER.pollenSpeed,
      damage: flower.elder ? FLOWER.elderDamage : FLOWER.damage,
      life: 1.6,
    });
    emit(world, 'shoot');
  }
}

/** Pollen homes loosely on its beetle; a hit wounds, a kill pays out. */
function stepPollen(world, dt) {
  const dead = [];
  world.pollen = world.pollen.filter((shot) => {
    shot.life -= dt;
    if (shot.life <= 0) return false;
    const target = shot.target;
    if (!target || target.hp <= 0) {
      shot.y -= shot.speed * dt * 0.4;
      return shot.life > 0.3;
    }
    const dx = target.x - shot.x;
    const dy = target.y - shot.y;
    const dist = Math.hypot(dx, dy);
    if (dist < BEETLE_KINDS[target.kind].radius + 4) {
      target.hp -= shot.damage;
      target.flash = 0.12;
      burst(world, target.x, target.y, '#ffe66d', 3, 60);
      if (target.hp <= 0) dead.push({ beetle: target, flower: shot.from });
      return false;
    }
    shot.x += (dx / dist) * shot.speed * dt;
    shot.y += (dy / dist) * shot.speed * dt;
    return true;
  });
  for (const { beetle, flower } of dead) {
    killBeetle(world, beetle, flower);
  }
  if (dead.length > 0) {
    world.beetles = world.beetles.filter((b) => b.hp > 0);
  }
}

/** Particles drift and fade; floaters rise and fade. */
function stepEffects(world, dt) {
  world.particles = world.particles.filter((p) => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 140 * dt;
    return p.life > 0;
  });
  world.floaters = world.floaters.filter((f) => {
    f.life -= dt;
    f.y -= 26 * dt;
    return f.life > 0;
  });
}
