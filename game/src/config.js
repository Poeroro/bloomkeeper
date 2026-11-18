// Bloomkeeper tuning: every number the game balances on lives here, so the world's rules in
// world.js read as plain behaviour and the feel can be retuned in one place.

/** The play field, in canvas pixels. The canvas is exactly this size and CSS scales it. */
export const FIELD = { width: 960, height: 640 };

/** The garden bed: a grid of soil plots the player plants flowers on. */
export const GARDEN = { cols: 8, rows: 5, cell: 64, originX: 224, originY: 168 };

/** Garden health at the start; beetles chewing a plot drain it. Zero health loses the game. */
export const START_HEALTH = 100;
/** Health lost per second for each beetle chewing on a plot. */
export const CHEW_DAMAGE_PER_SECOND = 5;

/** Sunlight is the planting currency: kills earn it, flowers cost it. */
export const START_SUN = 60;
export const PLANT_COST = 20;
/** Seconds between plantings, so one click cannot fill the bed instantly. */
export const PLANT_COOLDOWN = 0.35;

/** Survive this many waves to win. */
export const FINAL_WAVE = 10;
/** Calm seconds between one wave falling and the next one arriving. */
export const WAVE_BREAK_SECONDS = 3;

/** One flower's reach, firing pace and pollen strength. */
export const FLOWER = {
  range: 195,
  fireEvery: 0.85,
  damage: 1,
  pollenSpeed: 330,
  /** Kills that grow a bloom into an elder: bigger, faster, double damage. */
  elderAtKills: 5,
  elderFireEvery: 0.5,
  elderDamage: 2,
};

/** The drone the player steers: it trails the mouse, or flies on keys at this speed. */
export const DRONE = { radius: 16, keySpeed: 340 };

/**
 * The beetle kinds. `hp` is pollen hits to kill; `speed` is pixels a second on the march to a
 * plot; `score` and `sun` are what a kill pays. Tanks crawl but shrug off pollen; darts are
 * fragile but quick.
 */
export const BEETLE_KINDS = {
  nibbler: { hp: 3, speed: 34, radius: 13, score: 10, sun: 4, shell: '#7a4a21', belly: '#a9713a' },
  dart: { hp: 2, speed: 62, radius: 10, score: 15, sun: 5, shell: '#5b3a8c', belly: '#8465b8' },
  tank: { hp: 11, speed: 20, radius: 19, score: 30, sun: 10, shell: '#37474f', belly: '#5d7a86' },
};

/** How many beetles a wave sends, and when each kind joins the swarm. */
export function waveSize(wave) {
  return 4 + wave * 2;
}
export function waveMix(wave, rng) {
  const kinds = ['nibbler'];
  if (wave >= 3) kinds.push('dart', 'nibbler');
  if (wave >= 5) kinds.push('tank');
  if (wave >= 8) kinds.push('dart', 'tank');
  return kinds[Math.floor(rng() * kinds.length)];
}

/** The palette: warm soil, leaf greens, petal pinks and golds, one calm night-grass backdrop. */
export const COLORS = {
  grass: '#2e5339',
  grassDark: '#26452f',
  soil: '#6d4c2f',
  soilDark: '#5d4027',
  soilLight: '#7d5a38',
  petal: '#ef6f9c',
  petalElder: '#f4a259',
  petalCore: '#ffd166',
  leaf: '#4c956c',
  pollen: '#ffe66d',
  droneBody: '#e8f1f2',
  droneTrim: '#ef476f',
  ink: '#14231a',
  paper: '#fdf6e3',
  gold: '#ffd166',
  danger: '#ef476f',
};
