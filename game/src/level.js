// The Quiet Gallery — the level. One ASCII map is the whole floor plan: walls,
// crates and pedestals (cover that blocks sight and movement), bushes (cover
// you can hide inside), dark shadow floor (slower detection), relics, the
// player's door and the green exit. Guard patrol routes are listed beside it.
import { COLS, ROWS, TILE } from './config.js';

// Legend: '#' wall · '.' floor · 'C' crate · 'D' display pedestal · 'B' bush
//         ',' shadow floor · '*' relic · 'P' player start · 'E' exit · 'G' guard post
const MAP = [
  '################################',
  '#....C.......D.........*.......#',
  '#..P..C.....,,,,,,....C....G...#',
  '#.....C.....,,,,,,....C........#',
  '#..###......C.,,,.......###....#',
  '#..#........C......C....#......#',
  '#..#.B......####...#...#..*....#',
  '#..#..............C....#.......#',
  '#..###...C....D....####........#',
  '#.......C......................#',
  '#..*....C.....,,,,....C...G....#',
  '#.......C.....,,,,....C........#',
  '#..####......C.,,,.....####....#',
  '#......B.....C......C..........#',
  '#.........D.......C......*...E.#',
  '################################',
];

export const TILE_WALL = '#';
export const TILE_CRATE = 'C';
export const TILE_PEDESTAL = 'D';
export const TILE_BUSH = 'B';
export const TILE_SHADOW = ',';
export const TILE_RELIC = '*';
export const TILE_EXIT = 'E';
export const TILE_SPAWN = 'P';
export const TILE_GUARD = 'G';

const SOLID = new Set([TILE_WALL, TILE_CRATE, TILE_PEDESTAL]);
const SIGHT_BLOCKERS = new Set([TILE_WALL, TILE_CRATE, TILE_PEDESTAL]);

// Patrol routes in tile coordinates. Each guard walks its waypoints in order
// and back again, pausing a beat at each turn.
export const PATROLS = [
  { name: 'Rook', waypoints: [[27, 2], [27, 8], [25, 8]] },
  { name: 'Bishop', waypoints: [[9, 7], [13, 7], [13, 10], [19, 10], [19, 9]] },
  { name: 'Knight', waypoints: [[14, 10], [14, 13], [18, 13], [18, 10]] },
];

function tileAt(col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return TILE_WALL;
  return MAP[row][col];
}

export function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

export function isSolidTile(col, row) {
  return SOLID.has(tileAt(col, row));
}

export function blocksSightTile(col, row) {
  return SIGHT_BLOCKERS.has(tileAt(col, row));
}

export function isShadowTile(col, row) {
  return tileAt(col, row) === TILE_SHADOW;
}

export function isBushTile(col, row) {
  return tileAt(col, row) === TILE_BUSH;
}

export function isExitTile(col, row) {
  return tileAt(col, row) === TILE_EXIT;
}

export function isWalkableTile(col, row) {
  return !isSolidTile(col, row);
}

/** Pixel position collides with a solid tile when a circle of `radius` sits there. */
export function circleHitsSolid(x, y, radius) {
  const left = Math.floor((x - radius) / TILE);
  const right = Math.floor((x + radius) / TILE);
  const top = Math.floor((y - radius) / TILE);
  const bottom = Math.floor((y + radius) / TILE);
  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      if (!isSolidTile(col, row)) continue;
      const nearX = Math.max(col * TILE, Math.min(x, (col + 1) * TILE));
      const nearY = Math.max(row * TILE, Math.min(y, (row + 1) * TILE));
      const dx = x - nearX;
      const dy = y - nearY;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

/** Parse the map once into the level's fixed objects. */
export function parseLevel() {
  const relics = [];
  let spawn = { x: TILE * 2, y: TILE * 2 };
  let exit = { x: (COLS - 2) * TILE, y: (ROWS - 2) * TILE };
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = MAP[row][col];
      const at = tileCenter(col, row);
      if (cell === TILE_SPAWN) spawn = at;
      else if (cell === TILE_EXIT) exit = at;
      else if (cell === TILE_RELIC) relics.push({ x: at.x, y: at.y, taken: false });
    }
  }
  return { spawn, exit, relics };
}

/** Breadth-first reachability over walkable tiles, for the self-check. */
export function reachableFrom(startCol, startRow) {
  const seen = new Set([`${startCol},${startRow}`]);
  const queue = [[startCol, startRow]];
  while (queue.length > 0) {
    const [col, row] = queue.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [col + dc, row + dr];
      const key = `${next[0]},${next[1]}`;
      if (seen.has(key) || !isWalkableTile(next[0], next[1])) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen;
}

export function mapRows() {
  return MAP.slice();
}
