// The Quiet Gallery — the world. One state object holds the player, the
// guards, the relics and the run's numbers; step() advances it all one fixed
// tick and reports what happened as events, so the loop (main.js) only has
// to play sounds and change screens.
import { GAME } from './config.js';
import { parseLevel } from './level.js';
import { createGuards, updateGuard, GUARD_CHASE } from './guards.js';
import { createPlayer, isCaughtBy, isOnExit, noiseLevel, resetPlayer, throwCoin, updatePlayer } from './player.js';

export function createWorld() {
  const level = parseLevel();
  const world = {
    player: createPlayer(level.spawn),
    guards: createGuards(),
    relics: level.relics,
    exit: level.exit,
    coins: [],
    time: 0,
    nerves: GAME.nerves,
    spottedCount: 0,
    won: false,
    over: false,
    muted: false,
  };
  world.reset = () => {
    const fresh = createWorld();
    Object.assign(world, fresh, { reset: world.reset });
  };
  return world;
}

/**
 * Advance the world one tick. `input` is the movement direction, `click` is
 * a world-space point to toss a coin at (or null). Returns an array of
 * events: step, guardStep, spotted, coin, relic, caught, win, over.
 */
export function stepWorld(world, dt, input, click) {
  const events = [];
  if (world.won || world.over) return events;
  world.time += dt;

  if (updatePlayer(world.player, dt, input) === 'step') events.push({ type: 'step' });

  if (click) {
    const coin = throwCoin(world.player, click.x, click.y);
    if (coin) {
      world.coins.push(coin);
      events.push({ type: 'coin' });
      for (const guard of world.guards) {
        const distance = Math.hypot(guard.x - coin.x, guard.y - coin.y);
        if (distance < GAME.coinHearRadius) guard.heard = { x: coin.x, y: coin.y };
      }
    }
  }

  // Loud footsteps pull nearby patrolling guards toward the noise.
  const noise = noiseLevel(world.player);
  if (noise > 0) {
    for (const guard of world.guards) {
      if (guard.state === GUARD_CHASE) continue;
      const distance = Math.hypot(guard.x - world.player.x, guard.y - world.player.y);
      if (distance < noise) guard.heard = { x: world.player.x, y: world.player.y };
    }
  }

  const playerView = {
    x: world.player.x,
    y: world.player.y,
    sneaking: world.player.sneaking,
  };
  for (const guard of world.guards) {
    const guardEvents = [];
    updateGuard(guard, dt, playerView, guardEvents);
    for (const event of guardEvents) {
      if (event.type === 'spotted') {
        world.spottedCount += 1;
        events.push({ type: 'spotted', guard });
      } else if (event.type === 'footstep') {
        events.push({ type: 'guardStep', guard });
      }
    }
  }

  for (const coin of world.coins) coin.time += dt;
  world.coins = world.coins.filter((coin) => coin.time < 1.5);

  for (const relic of world.relics) {
    if (!relic.taken && Math.hypot(relic.x - world.player.x, relic.y - world.player.y) < 28) {
      relic.taken = true;
      world.player.relics += 1;
      events.push({ type: 'relic' });
    }
  }

  for (const guard of world.guards) {
    if (guard.state === GUARD_CHASE && isCaughtBy(world.player, guard)) {
      world.nerves -= 1;
      events.push({ type: 'caught', guard });
      if (world.nerves <= 0) {
        world.over = true;
        events.push({ type: 'over' });
      } else {
        resetPlayer(world.player);
        for (const other of world.guards) {
          other.state = 'patrol';
          other.suspicion = 0;
          other.lastSeen = null;
          other.target = null;
          other.pauseTime = 1.5;
        }
      }
      break;
    }
  }

  if (!world.over && isOnExit(world.player)) {
    world.won = true;
    events.push({ type: 'win' });
  }

  return events;
}
