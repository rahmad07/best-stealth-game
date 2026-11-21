// The Quiet Gallery — vision. A guard's cone is a range, an angle and a clear
// line of sight: walls, crates and pedestals block it, bushes and shadow do
// not. Every "can this guard see the player" question goes through here.
import { GUARD, TILE } from './config.js';
import { blocksSightTile } from './level.js';

/** Smallest absolute difference between two angles, in radians. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** True when the straight segment between two points crosses no sight blocker. */
export function hasLineOfSight(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / (TILE / 4)));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const col = Math.floor((x0 + dx * t) / TILE);
    const row = Math.floor((y0 + dy * t) / TILE);
    if (blocksSightTile(col, row)) return false;
  }
  return true;
}

/**
 * How clearly a guard at (gx, gy) facing `facing` sees a point (px, py):
 * 0 when out of range, outside the cone or behind cover; 1 when close and
 * dead centre. The value scales how fast suspicion grows.
 */
export function visibilityAt(gx, gy, facing, px, py) {
  const dx = px - gx;
  const dy = py - gy;
  const distance = Math.hypot(dx, dy);
  if (distance > GUARD.sightRange) return 0;
  if (distance < 1) return 1;
  const angle = Math.atan2(dy, dx);
  const off = angleDifference(angle, facing);
  if (off > GUARD.sightHalfAngle) return 0;
  if (!hasLineOfSight(gx, gy, px, py)) return 0;
  const angleFalloff = 1 - off / GUARD.sightHalfAngle;
  const rangeFalloff = 1 - (distance / GUARD.sightRange) * 0.55;
  return Math.max(0, Math.min(1, angleFalloff * rangeFalloff + 0.25));
}

/** The cone's outline polygon (guard position plus the arc's edge points). */
export function conePolygon(gx, gy, facing, range = GUARD.sightRange) {
  const points = [{ x: gx, y: gy }];
  const steps = 14;
  for (let i = 0; i <= steps; i += 1) {
    const a = facing - GUARD.sightHalfAngle + (2 * GUARD.sightHalfAngle * i) / steps;
    points.push({ x: gx + Math.cos(a) * range, y: gy + Math.sin(a) * range });
  }
  return points;
}
