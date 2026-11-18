// Bloomkeeper's drawing: every pixel of the game is a canvas shape painted here — the grass,
// the soil bed, the flowers, the beetles, the drone, the HUD and the title and ending panels.
// Nothing is loaded; the whole look is code, in one palette from config.js.

import {
  BEETLE_KINDS,
  COLORS,
  FIELD,
  FINAL_WAVE,
  GARDEN,
  PLANT_COST,
  START_HEALTH,
} from './config.js';
import { PHASE_BREAK, SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON, plotCenter } from './world.js';

/** The one button every non-play screen shows, centred low on the field. */
export function mainButtonRect() {
  return { x: FIELD.width / 2 - 110, y: 470, w: 220, h: 54 };
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Paint the whole frame for the world's current screen. */
export function drawScene(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake * 5;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawGrass(ctx, world);
  drawGarden(ctx, world);
  drawPollen(ctx, world);
  drawBeetles(ctx, world);
  drawParticles(ctx, world);
  if (world.screen !== SCREEN_TITLE) drawDrone(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();

  if (world.screen === SCREEN_PLAY) drawHud(ctx, world);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world);
  if (world.screen === SCREEN_WON) drawEndPanel(ctx, world, true);
  if (world.screen === SCREEN_LOST) drawEndPanel(ctx, world, false);
}

/** The lawn: two greens in broad stripes, with a soft vignette of darker grass at the edges. */
function drawGrass(ctx, world) {
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = COLORS.grassDark;
  for (let i = 0; i < 6; i += 1) {
    if (i % 2 === 0) ctx.fillRect(0, i * 112, FIELD.width, 56);
  }
  // A few still grass tufts, placed by a fixed pattern so the lawn never flickers.
  ctx.strokeStyle = 'rgba(0,0,0,0.13)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i += 1) {
    const x = ((i * 173) % 920) + 20;
    const y = ((i * 257) % 600) + 20;
    if (x > GARDEN.originX - 30 && x < GARDEN.originX + GARDEN.cols * GARDEN.cell + 30 &&
        y > GARDEN.originY - 30 && y < GARDEN.originY + GARDEN.rows * GARDEN.cell + 30) continue;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y - 9);
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 6, y - 11);
    ctx.stroke();
  }
}

/** The soil bed: plots in alternating browns, a rim of planks, and the flower on each plot. */
function drawGarden(ctx, world) {
  const w = GARDEN.cols * GARDEN.cell;
  const h = GARDEN.rows * GARDEN.cell;
  ctx.fillStyle = '#4a3520';
  roundRect(ctx, GARDEN.originX - 12, GARDEN.originY - 12, w + 24, h + 24, 14);
  ctx.fill();
  for (let row = 0; row < GARDEN.rows; row += 1) {
    for (let col = 0; col < GARDEN.cols; col += 1) {
      const x = GARDEN.originX + col * GARDEN.cell;
      const y = GARDEN.originY + row * GARDEN.cell;
      ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.soil : COLORS.soilDark;
      roundRect(ctx, x + 3, y + 3, GARDEN.cell - 6, GARDEN.cell - 6, 9);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.beginPath();
      ctx.arc(x + GARDEN.cell / 2, y + GARDEN.cell / 2, 13, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const flower of world.flowers.values()) drawFlower(ctx, world, flower);
}

/** One flower: a curved stem, two leaves and a ring of petals that sways with the breeze. */
function drawFlower(ctx, world, flower) {
  const sway = Math.sin(world.time * 1.6 + flower.sway) * 3;
  const baseX = flower.x;
  const baseY = flower.y + 22;
  const topX = flower.x + sway;
  const topY = flower.y - 8;
  ctx.strokeStyle = COLORS.leaf;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + sway * 0.3, flower.y + 8, topX, topY);
  ctx.stroke();
  ctx.fillStyle = COLORS.leaf;
  ctx.beginPath();
  ctx.ellipse(baseX - 8, flower.y + 14, 8, 4, -0.6, 0, Math.PI * 2);
  ctx.ellipse(baseX + 8, flower.y + 16, 8, 4, 0.6, 0, Math.PI * 2);
  ctx.fill();
  const petal = flower.elder ? COLORS.petalElder : COLORS.petal;
  const petals = flower.elder ? 8 : 6;
  const radius = flower.elder ? 11 : 9;
  ctx.fillStyle = petal;
  for (let i = 0; i < petals; i += 1) {
    const a = (i / petals) * Math.PI * 2 + flower.sway;
    ctx.beginPath();
    ctx.arc(topX + Math.cos(a) * radius * 0.85, topY + Math.sin(a) * radius * 0.85, radius * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.petalCore;
  ctx.beginPath();
  ctx.arc(topX, topY, radius * 0.62, 0, Math.PI * 2);
  ctx.fill();
}

/** One beetle: shell, head, six working legs, and a wound bar once pollen has bitten. */
function drawBeetles(ctx, world) {
  for (const beetle of world.beetles) {
    const kind = BEETLE_KINDS[beetle.kind];
    const r = kind.radius;
    ctx.save();
    ctx.translate(beetle.x, beetle.y);
    const angle = beetle.chewing ? 0 : Math.atan2(beetle.targetY - beetle.y, beetle.targetX - beetle.x);
    ctx.rotate(angle + Math.PI / 2);
    ctx.strokeStyle = 'rgba(20,20,20,0.75)';
    ctx.lineWidth = 2.5;
    for (let side = -1; side <= 1; side += 2) {
      for (let leg = 0; leg < 3; leg += 1) {
        const ly = -r * 0.5 + leg * r * 0.5;
        const kick = Math.sin(beetle.legPhase + leg * 1.7) * 4;
        ctx.beginPath();
        ctx.moveTo(side * r * 0.7, ly);
        ctx.lineTo(side * (r + 7), ly + kick);
        ctx.stroke();
      }
    }
    ctx.fillStyle = beetle.flash > 0 ? '#ffffff' : kind.shell;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = kind.belly;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.25, r * 0.55, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(0, -r * 0.95, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-r * 0.16, -r * 1.02, r * 0.09, 0, Math.PI * 2);
    ctx.arc(r * 0.16, -r * 1.02, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (beetle.hp < beetle.maxHp) {
      const w = 34;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(beetle.x - w / 2, beetle.y - r - 13, w, 5);
      ctx.fillStyle = '#8bc34a';
      ctx.fillRect(beetle.x - w / 2, beetle.y - r - 13, (w * beetle.hp) / beetle.maxHp, 5);
    }
  }
}

/** Pollen in flight: small gold motes with a soft halo. */
function drawPollen(ctx, world) {
  for (const shot of world.pollen) {
    ctx.fillStyle = 'rgba(255,230,109,0.35)';
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.pollen;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The gardener drone: a white shell, a pink trim ring, four spinning rotors and a shadow. */
function drawDrone(ctx, world) {
  const { x, y } = world.drone;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,241,242,0.5)';
  ctx.lineWidth = 3;
  const spin = world.time * 40;
  for (const [ox, oy] of [[-20, -14], [20, -14], [-20, 14], [20, 14]]) {
    ctx.beginPath();
    ctx.ellipse(x + ox, y + oy, 10 + Math.sin(spin + ox) * 2, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,35,26,0.6)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + ox, y + oy);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(232,241,242,0.5)';
  }
  ctx.fillStyle = COLORS.droneBody;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.droneTrim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = COLORS.droneTrim;
  ctx.beginPath();
  ctx.arc(x, y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  // The plot the drone hovers over glows when a flower could go in there.
  const hover = plotCenter(
    Math.max(0, Math.min(GARDEN.cols - 1, Math.floor((x - GARDEN.originX) / GARDEN.cell))),
    Math.max(0, Math.min(GARDEN.rows - 1, Math.floor((y - GARDEN.originY) / GARDEN.cell))),
  );
  if (x >= GARDEN.originX && x < GARDEN.originX + GARDEN.cols * GARDEN.cell &&
      y >= GARDEN.originY && y < GARDEN.originY + GARDEN.rows * GARDEN.cell) {
    ctx.strokeStyle = 'rgba(255,209,102,0.8)';
    ctx.lineWidth = 2;
    roundRect(ctx, hover.x - GARDEN.cell / 2 + 3, hover.y - GARDEN.cell / 2 + 3, GARDEN.cell - 6, GARDEN.cell - 6, 9);
    ctx.stroke();
  }
}

/** Floating score and warning text. */
function drawFloaters(ctx, world) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 17px system-ui, sans-serif';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

/** The heads-up strip: garden health, score, wave, sunlight and the flowers standing. */
function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(16,28,20,0.82)';
  roundRect(ctx, 14, 12, FIELD.width - 28, 52, 12);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // Health bar.
  ctx.fillStyle = '#0c1710';
  roundRect(ctx, 30, 28, 210, 20, 10);
  ctx.fill();
  const frac = Math.max(0, world.health / START_HEALTH);
  ctx.fillStyle = frac > 0.35 ? '#8bc34a' : COLORS.danger;
  if (frac > 0) {
    roundRect(ctx, 30, 28, 210 * frac, 20, 10);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.paper;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('GARDEN ' + Math.ceil(world.health), 40, 39);
  // Score, wave, sun, blooms.
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText('Score ' + world.score, 268, 39);
  const waveText = world.phase === PHASE_BREAK && world.wave < FINAL_WAVE
    ? 'Wave ' + (world.wave + 1) + ' in ' + Math.ceil(world.phaseTimer) + '…'
    : 'Wave ' + Math.max(1, world.wave) + ' / ' + FINAL_WAVE;
  ctx.fillText(waveText, 430, 39);
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('☀ ' + Math.floor(world.sun), 640, 39);
  ctx.fillStyle = COLORS.paper;
  ctx.fillText('❀ ' + world.flowers.size + ' blooms', 730, 39);
  ctx.textBaseline = 'alphabetic';
  // The planting hint along the bottom.
  ctx.textAlign = 'center';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(253,246,227,0.85)';
  ctx.fillText(
    'Click a soil plot to plant a bloom (' + PLANT_COST + ' ☀) · move with the mouse or WASD · blooms shoot pollen on their own',
    FIELD.width / 2,
    FIELD.height - 14,
  );
}

/** A dim veil and a paper panel, shared by the title and ending screens. */
function panel(ctx, y, h) {
  ctx.fillStyle = 'rgba(10,20,14,0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = COLORS.paper;
  roundRect(ctx, FIELD.width / 2 - 300, y, 600, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,35,26,0.25)';
  ctx.lineWidth = 2;
  roundRect(ctx, FIELD.width / 2 - 300, y, 600, h, 18);
  ctx.stroke();
}

function drawButton(ctx, label) {
  const rect = mainButtonRect();
  ctx.fillStyle = COLORS.droneTrim;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, FIELD.width / 2, rect.y + 35);
}

/** The title screen: the game's name, its rules in three lines, and the start button. */
function drawTitle(ctx, world) {
  panel(ctx, 92, 330);
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'center';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText('BLOOMKEEPER', FIELD.width / 2, 168);
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('You are the garden drone. Beetle swarms', FIELD.width / 2, 202);
  ctx.fillText('are coming for your flower bed.', FIELD.width / 2, 226);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Click a soil plot to plant a bloom — blooms fire pollen on their own.', FIELD.width / 2, 256);
  ctx.fillText('Beetles that reach a plot eat its flower and chew the garden down.', FIELD.width / 2, 282);
  ctx.fillText('Kills earn sunlight for more blooms. Hold all ' + FINAL_WAVE + ' waves to win;', FIELD.width / 2, 308);
  ctx.fillText('if the garden\'s health reaches zero, the swarm wins.', FIELD.width / 2, 334);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('Move: mouse or WASD / arrow keys · Plant: click or Space', FIELD.width / 2, 374);
  drawButton(ctx, 'Start gardening');
}

/** The ending panel: the verdict, the score that was earned, and the restart button. */
function drawEndPanel(ctx, world, won) {
  panel(ctx, 120, 300);
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'center';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.fillText(won ? 'The garden blooms!' : 'The garden is eaten', FIELD.width / 2, 190);
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText(
    won
      ? 'You held all ' + FINAL_WAVE + ' waves and the bed is still flowering.'
      : 'The swarm chewed through on wave ' + Math.max(1, world.wave) + ' of ' + FINAL_WAVE + '.',
    FIELD.width / 2,
    232,
  );
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('Score ' + world.score, FIELD.width / 2, 292);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(world.flowers.size + ' blooms standing · garden health ' + Math.ceil(world.health), FIELD.width / 2, 330);
  ctx.fillText('Every garden deserves another spring.', FIELD.width / 2, 366);
  drawButton(ctx, 'Play again');
}
