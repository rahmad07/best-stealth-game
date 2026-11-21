// The Quiet Gallery — cover. Two ways to stay unseen without leaving the
// floor: bushes you can crouch inside (a guard's cone passes over them) and
// the dark shadow floor, where a guard's eyes are slow. Both are read from
// the level map, so the art and the rules can never drift apart.
import { TILE } from './config.js';
import { isBushTile, isShadowTile } from './level.js';

/** True when the point sits inside a bush tile: fully hidden from sight. */
export function isHiddenInBush(x, y) {
  return isBushTile(Math.floor(x / TILE), Math.floor(y / TILE));
}

/** True when the point stands on shadow floor: seen slowly, not safely. */
export function isInShadow(x, y) {
  return isShadowTile(Math.floor(x / TILE), Math.floor(y / TILE));
}

/**
 * How much a hiding spot slows detection: 0 while hidden in a bush (a guard
 * cannot see the player at all there), 1 in the open, and the shadow rate
 * in between.
 */
export function coverFactor(x, y) {
  if (isHiddenInBush(x, y)) return 0;
  if (isInShadow(x, y)) return 0.35;
  return 1;
}
