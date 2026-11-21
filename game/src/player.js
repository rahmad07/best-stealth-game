// The Quiet Gallery — the player. A night courier with soft shoes: WASD or
// arrows to move, Shift to sneak (slower, quieter, harder to spot), click to
// toss a coin that draws a guard's attention. Walking makes noise a nearby
// guard can hear; sneaking barely does.
import { GAME, GUARD, PLAYER, TILE } from './config.js';
import { circleHitsSolid, isExitTile } from './level.js';

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    spawnX: spawn.x,
    spawnY: spawn.y,
    sneaking: false,
    moving: false,
    stepTime: 0,
    coins: 5,
    relics: 0,
    facing: 0,
  };
}

function tryMove(player, dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;
  if (!circleHitsSolid(nx, player.y, PLAYER.radius)) player.x = nx;
  if (!circleHitsSolid(player.x, ny, PLAYER.radius)) player.y = ny;
}

/**
 * Move the player one step from `input` ({x, y} unit direction, sneak flag).
 * Returns 'step' when a footstep sound is due, else null.
 */
export function updatePlayer(player, dt, input) {
  const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  player.sneaking = input.sneak;
  const length = Math.hypot(input.x, input.y);
  player.moving = length > 0;
  if (player.moving) {
    const nx = (input.x / length) * speed * dt;
    const ny = (input.y / length) * speed * dt;
    tryMove(player, nx, ny);
    player.facing = Math.atan2(input.y, input.x);
    player.stepTime -= dt;
    if (player.stepTime <= 0) {
      player.stepTime = (TILE * 1.4) / speed;
      return 'step';
    }
  } else {
    player.stepTime = 0;
  }
  return null;
}

/** How loud the player is right now: 0 when still, more when running. */
export function noiseLevel(player) {
  if (!player.moving) return 0;
  return player.sneaking ? PLAYER.sneakNoiseRadius : PLAYER.noiseRadius;
}

/** True when the player stands on the exit tile. */
export function isOnExit(player) {
  return isExitTile(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
}

/** True when a chasing guard is close enough to grab the player. */
export function isCaughtBy(player, guard) {
  return Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.catchDistance;
}

/**
 * Toss a coin toward (tx, ty). Returns the landing point, or null when out of
 * coins or out of throwing range.
 */
export function throwCoin(player, tx, ty) {
  if (player.coins <= 0) return null;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance > GAME.coinRange || distance < 10) return null;
  player.coins -= 1;
  return { x: tx, y: ty, time: 0 };
}

/** Send the player back to the start after being caught. */
export function resetPlayer(player) {
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.sneaking = false;
  player.moving = false;
}
