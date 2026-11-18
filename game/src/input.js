// Mouse and keyboard input for Bloomkeeper. The canvas has a fixed internal size and CSS
// scales it, so pointer positions are converted through the canvas's on-screen rectangle into
// field coordinates. Clicks are queued, not fired as events, so the game loop decides what a
// click means for the screen it is on (start the game, plant a flower, restart).

import { FIELD } from './config.js';

export function createInput(canvas) {
  const input = {
    mouse: { x: FIELD.width / 2, y: FIELD.height / 2, inside: false },
    clicks: [],
    keys: new Set(),
  };

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    const p = toField(event);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => {
    input.mouse.inside = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toField(event);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.clicks.push(p);
  });
  window.addEventListener('keydown', (event) => {
    input.keys.add(event.code);
    if (event.code === 'Space') {
      input.clicks.push({ x: input.mouse.x, y: input.mouse.y, viaKey: true });
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  /** Take the oldest queued click, or null when there is none. */
  input.takeClick = function takeClick() {
    return input.clicks.length > 0 ? input.clicks.shift() : null;
  };

  return input;
}

/** True when any of the given key codes is currently held. */
export function keyDown(input, ...codes) {
  return codes.some((code) => input.keys.has(code));
}
