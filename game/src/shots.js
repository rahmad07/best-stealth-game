// The Quiet Gallery — screenshot scenes. Each named scene stages a real world
// state the game itself can reach (positions, facing, suspicion, relics) and
// lets the renderer paint it: no mock drawing, the frame is the game. The
// whole level fits on one screen, so every shot shows the level, guards with
// cones, cover and the exit at once.
import { tileCenter } from './level.js';
import { SCREEN_PLAY } from './render.js';

function placeGuard(world, index, col, row, facingDegrees, suspicion, state) {
  const guard = world.guards[index];
  const at = tileCenter(col, row);
  guard.x = at.x;
  guard.y = at.y;
  guard.facing = (facingDegrees * Math.PI) / 180;
  guard.suspicion = suspicion;
  guard.state = state;
  guard.stateTime = 0;
  guard.lastSeen = null;
  guard.target = null;
  guard.pauseTime = 0;
  return guard;
}

function placePlayer(world, col, row, sneaking) {
  const at = tileCenter(col, row);
  world.player.x = at.x;
  world.player.y = at.y;
  world.player.sneaking = sneaking;
  world.player.moving = false;
  world.player.facing = 0;
}

/**
 * Stage the named scene on a fresh world and return the screen to paint.
 * Names: cover (sneaking behind a crate, guard closing in), patrol (mid
 * patrol in the shadow hall), chase (spotted, a guard giving chase) and
 * exit (at the door with every relic). Any other name stages the cover.
 */
export function stageShot(name, world) {
  world.reset();
  const scene = name === 'patrol' || name === 'chase' || name === 'exit' ? name : 'cover';

  if (scene === 'cover') {
    // Crouched behind the crate row, Rook's cone sweeping straight at the player.
    placePlayer(world, 5, 2, true);
    const rook = placeGuard(world, 0, 10, 2, 180, 55, 'suspicious');
    rook.lastSeen = { x: world.player.x, y: world.player.y };
    placeGuard(world, 1, 14, 7, 0, 0, 'patrol');
    placeGuard(world, 2, 19, 13, 180, 0, 'patrol');
    world.time = 42;
  } else if (scene === 'patrol') {
    // Deep in the shadow hall, two cones crossing the open floor ahead.
    placePlayer(world, 13, 3, true);
    placeGuard(world, 0, 24, 2, 180, 0, 'patrol');
    const bishop = placeGuard(world, 1, 14, 7, 0, 12, 'patrol');
    bishop.lastSeen = { x: world.player.x, y: world.player.y };
    placeGuard(world, 2, 19, 13, 180, 0, 'patrol');
    world.relics[0].taken = true;
    world.player.relics = 1;
    world.time = 96;
  } else if (scene === 'chase') {
    // Caught in the open: Bishop is on the run after the player, meter full.
    placePlayer(world, 16, 8, false);
    placeGuard(world, 0, 21, 5, 90, 20, 'patrol');
    const bishop = placeGuard(world, 1, 15, 8, 0, 100, 'chase');
    bishop.lastSeen = { x: world.player.x, y: world.player.y };
    placeGuard(world, 2, 25, 10, 270, 0, 'patrol');
    world.relics[0].taken = true;
    world.player.relics = 1;
    world.time = 150;
  } else {
    // One step from the door, every relic pocketed, Knight's cone on the exit.
    placePlayer(world, 28, 14, true);
    placeGuard(world, 0, 27, 5, 90, 0, 'patrol');
    placeGuard(world, 1, 19, 10, 90, 0, 'patrol');
    placeGuard(world, 2, 27, 12, 90, 40, 'suspicious');
    for (const relic of world.relics) relic.taken = true;
    world.player.relics = 4;
    world.time = 210;
  }
  return { screen: SCREEN_PLAY };
}
