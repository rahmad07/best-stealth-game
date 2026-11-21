// The Quiet Gallery — guards. Each guard walks a patrol route, watches its
// vision cone, and keeps a suspicion meter (0-100) instead of catching the
// player on first sight: a glimpse raises it, breaking sight lets it fall,
// and only a full meter turns a patrol into a chase. A chase that loses the
// player becomes an investigation, then the patrol resumes — the recovery
// window the game is built around.
import { GUARD, TILE } from './config.js';
import { PATROLS, circleHitsSolid, tileCenter } from './level.js';
import { angleDifference, visibilityAt } from './vision.js';
import { coverFactor } from './cover.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_CHASE = 'chase';

const TURN_SPEED = 3.2;
const WAYPOINT_PAUSE = 0.9;
const SUSPICIOUS_AT = 35;

function waypointPoint(route, index) {
  const [col, row] = route.waypoints[index];
  return tileCenter(col, row);
}

/** Build one guard from a patrol route, standing on its first waypoint. */
export function createGuard(routeIndex) {
  const route = PATROLS[routeIndex];
  const start = waypointPoint(route, 0);
  const next = waypointPoint(route, 1);
  return {
    name: route.name,
    route,
    x: start.x,
    y: start.y,
    facing: Math.atan2(next.y - start.y, next.x - start.x),
    waypointIndex: 1,
    patrolForward: true,
    state: GUARD_PATROL,
    suspicion: 0,
    stateTime: 0,
    pauseTime: 0,
    target: null,
    lastSeen: null,
    unseenTime: 0,
    stepTime: 0,
    heard: null,
  };
}

export function createGuards() {
  return PATROLS.map((route, index) => createGuard(index));
}

function turnToward(guard, angle, dt) {
  const diff = angleDifference(angle, guard.facing);
  const step = TURN_SPEED * dt;
  if (diff <= step) {
    guard.facing = angle;
    return true;
  }
  const clockwise = ((angle - guard.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI > 0;
  guard.facing += clockwise ? step : -step;
  return false;
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return true;
  const step = Math.min(distance, speed * dt);
  const nx = guard.x + (dx / distance) * step;
  const ny = guard.y + (dy / distance) * step;
  // Guards slide along walls like the player: never through cover.
  if (!circleHitsSolid(nx, guard.y, GUARD.radius)) guard.x = nx;
  if (!circleHitsSolid(guard.x, ny, GUARD.radius)) guard.y = ny;
  turnToward(guard, Math.atan2(dy, dx), dt);
  return Math.hypot(tx - guard.x, ty - guard.y) < 2;
}

/** A footstep tick for the renderer's sound cue, timed by the guard's stride. */
function stride(guard, dt, speed) {
  guard.stepTime -= dt;
  if (speed > 0 && guard.stepTime <= 0) {
    guard.stepTime = TILE * 1.6 / speed;
    return true;
  }
  return false;
}

/**
 * Advance one guard one step. `player` carries {x, y, sneaking, noiseLevel}
 * and `events` collects {type:'footstep', guard} and {type:'spotted', guard}.
 * Returns nothing; the guard's state, suspicion and position are updated.
 */
export function updateGuard(guard, dt, player, events) {
  guard.stateTime += dt;
  const seen = visibilityAt(guard.x, guard.y, guard.facing, player.x, player.y);
  const hidden = coverFactor(player.x, player.y);
  let speed = 0;

  if (seen > 0 && hidden > 0) {
    // Seen: suspicion climbs with closeness, faster when the player runs.
    const closeness = seen;
    const base = closeness > 0.6 ? GUARD.spotRateClose : GUARD.spotRateFar;
    const rate = base * (player.sneaking ? GUARD.spotRateSneak : 1) * hidden;
    guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.unseenTime = 0;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.decayRate * dt);
    guard.unseenTime += dt;
  }

  if (guard.state !== GUARD_CHASE && guard.suspicion >= 100) {
    guard.state = GUARD_CHASE;
    guard.stateTime = 0;
    guard.unseenTime = 0;
    events.push({ type: 'spotted', guard });
  }

  if (guard.state === GUARD_CHASE) {
    if (guard.lastSeen) {
      const arrived = moveToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.chaseSpeed, dt);
      speed = GUARD.chaseSpeed;
      if (seen > 0 && hidden > 0) guard.unseenTime = 0;
      if (guard.unseenTime > GUARD.chaseMemory || arrived) {
        guard.state = GUARD_INVESTIGATE;
        guard.stateTime = 0;
        guard.target = guard.lastSeen;
      }
    } else {
      guard.state = GUARD_PATROL;
      guard.stateTime = 0;
    }
  } else if (guard.state === GUARD_INVESTIGATE) {
    if (guard.target) {
      const arrived = moveToward(guard, guard.target.x, guard.target.y, GUARD.investigateSpeed, dt);
      speed = GUARD.investigateSpeed;
      if (arrived || guard.stateTime > GUARD.investigateTime + 2) {
        guard.state = GUARD_PATROL;
        guard.stateTime = 0;
        guard.target = null;
        guard.pauseTime = WAYPOINT_PAUSE;
      }
    }
  } else {
    // Patrol (and suspicious): keep walking the route, or stop and stare.
    if (guard.suspicion >= SUSPICIOUS_AT && seen > 0 && hidden > 0) {
      guard.state = GUARD_SUSPICIOUS;
      turnToward(guard, Math.atan2(player.y - guard.y, player.x - guard.x), dt);
    } else if (guard.suspicion < SUSPICIOUS_AT) {
      guard.state = GUARD_PATROL;
    }
    if (guard.state === GUARD_SUSPICIOUS) {
      if (guard.suspicion < SUSPICIOUS_AT) guard.state = GUARD_PATROL;
    } else if (guard.pauseTime > 0) {
      guard.pauseTime -= dt;
      turnToward(guard, guard.facing + Math.PI * dt * 0.4, dt);
    } else {
      const target = waypointPoint(guard.route, guard.waypointIndex);
      const arrived = moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt);
      speed = GUARD.patrolSpeed;
      if (arrived) {
        guard.pauseTime = WAYPOINT_PAUSE;
        if (guard.patrolForward) {
          guard.waypointIndex += 1;
          if (guard.waypointIndex >= guard.route.waypoints.length) {
            guard.waypointIndex = guard.route.waypoints.length - 2;
            guard.patrolForward = false;
          }
        } else {
          guard.waypointIndex -= 1;
          if (guard.waypointIndex < 0) {
            guard.waypointIndex = 1;
            guard.patrolForward = true;
          }
        }
      }
    }
    // Loud footsteps pull a patrolling guard off its route to listen.
    if (guard.heard) {
      guard.state = GUARD_INVESTIGATE;
      guard.stateTime = 0;
      guard.target = guard.heard;
      guard.heard = null;
    }
  }

  if (stride(guard, dt, speed)) events.push({ type: 'footstep', guard });
}

/** The highest suspicion across all guards — the HUD's single danger meter. */
export function highestSuspicion(guards) {
  return guards.reduce((max, guard) => Math.max(max, guard.suspicion), 0);
}

export function anyChasing(guards) {
  return guards.some((guard) => guard.state === GUARD_CHASE);
}
