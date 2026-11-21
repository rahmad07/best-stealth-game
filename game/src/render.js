// The Quiet Gallery — rendering. One canvas, painted top-down: the tiled
// floor, shadow patches, the glowing exit, relics, each guard's vision cone
// (raycast so it stops at walls and crates), the guards and the player, then
// the HUD with its suspicion meter. Menus are painted over the same scene.
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLORS,
  COLS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GAME,
  GUARD,
  HUD_HEIGHT,
  ROWS,
  TILE,
} from './config.js';
import {
  blocksSightTile,
  isBushTile,
  isExitTile,
  isShadowTile,
  mapRows,
  tileCenter,
} from './level.js';
import { GUARD_CHASE, anyChasing, highestSuspicion } from './guards.js';
import { conePolygon } from './vision.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

export const START_BUTTON = { x: CANVAS_WIDTH / 2 - 130, y: 470, width: 260, height: 56 };
export const AGAIN_BUTTON = { x: CANVAS_WIDTH / 2 - 130, y: 480, width: 260, height: 56 };

/** March one ray until a sight blocker; the cone edge stops there. */
function rayEnd(gx, gy, angle) {
  const step = TILE / 4;
  let distance = step;
  while (distance <= GUARD.sightRange) {
    const x = gx + Math.cos(angle) * distance;
    const y = gy + Math.sin(angle) * distance;
    if (blocksSightTile(Math.floor(x / TILE), Math.floor(y / TILE))) break;
    distance += step;
  }
  return {
    x: gx + Math.cos(angle) * (distance - step),
    y: gy + Math.sin(angle) * (distance - step),
  };
}

/** The vision cone clipped by walls and crates, as a polygon in field pixels. */
function clippedCone(guard) {
  const points = [{ x: guard.x, y: guard.y }];
  const rays = 20;
  for (let i = 0; i <= rays; i += 1) {
    const angle = guard.facing - GUARD.sightHalfAngle + (2 * GUARD.sightHalfAngle * i) / rays;
    points.push(rayEnd(guard.x, guard.y, angle));
  }
  return points;
}

function drawCone(context, guard) {
  const alerted = guard.state === GUARD_CHASE;
  const points = clippedCone(guard);
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) context.lineTo(points[i].x, points[i].y);
  context.closePath();
  context.fillStyle = alerted ? COLORS.coneAlert : COLORS.cone;
  context.fill();
  context.strokeStyle = alerted ? COLORS.coneAlertEdge : COLORS.coneEdge;
  context.lineWidth = 1.5;
  context.stroke();
  // The unclipped arc's faint edge, so the cone's reach reads at a glance.
  const arc = conePolygon(guard.x, guard.y, guard.facing, GUARD.sightRange);
  context.beginPath();
  context.moveTo(arc[1].x, arc[1].y);
  for (let i = 2; i < arc.length; i += 1) context.lineTo(arc[i].x, arc[i].y);
  context.strokeStyle = alerted ? 'rgba(229,72,77,0.25)' : 'rgba(255,214,90,0.18)';
  context.stroke();
}

function drawFloor(context, state) {
  const rows = mapRows();
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const x = col * TILE;
      const y = row * TILE;
      const cell = rows[row][col];
      if (cell === '#') {
        context.fillStyle = COLORS.wall;
        context.fillRect(x, y, TILE, TILE);
        context.fillStyle = COLORS.wallTop;
        context.fillRect(x, y, TILE, 6);
        continue;
      }
      context.fillStyle = (col + row) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      context.fillRect(x, y, TILE, TILE);
      context.strokeStyle = COLORS.floorEdge;
      context.lineWidth = 1;
      context.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      if (cell === ',') {
        context.fillStyle = COLORS.shadow;
        context.fillRect(x, y, TILE, TILE);
      }
    }
  }
  // The exit door glows on the floor.
  const exit = state.exit;
  context.save();
  context.shadowColor = COLORS.exit;
  context.shadowBlur = 22;
  context.fillStyle = COLORS.exitGlow;
  context.fillRect(exit.x - TILE / 2, exit.y - TILE / 2, TILE, TILE);
  context.restore();
  context.fillStyle = COLORS.exit;
  context.fillRect(exit.x - 16, exit.y - 18, 32, 36);
  context.fillStyle = '#0d1117';
  context.font = 'bold 11px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText('EXIT', exit.x, exit.y + 4);
  context.fillStyle = COLORS.text;
  context.font = 'bold 12px system-ui, sans-serif';
  context.fillText('EXIT', exit.x, exit.y - TILE / 2 - 8);
}

function drawCover(context) {
  const rows = mapRows();
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = rows[row][col];
      if (cell !== 'C' && cell !== 'D') continue;
      const x = col * TILE;
      const y = row * TILE;
      const top = cell === 'C' ? COLORS.crateTop : COLORS.pedestalTop;
      const side = cell === 'C' ? COLORS.crate : COLORS.pedestal;
      context.fillStyle = side;
      context.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      context.fillStyle = top;
      context.fillRect(x + 3, y + 3, TILE - 6, 10);
      context.strokeStyle = 'rgba(0,0,0,0.45)';
      context.lineWidth = 2;
      context.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
      if (cell === 'C') {
        context.beginPath();
        context.moveTo(x + 3, y + 3);
        context.lineTo(x + TILE - 3, y + TILE - 3);
        context.moveTo(x + TILE - 3, y + 3);
        context.lineTo(x + 3, y + TILE - 3);
        context.strokeStyle = 'rgba(0,0,0,0.25)';
        context.lineWidth = 1;
        context.stroke();
      } else {
        context.fillStyle = 'rgba(255,255,255,0.25)';
        context.beginPath();
        context.arc(x + TILE / 2, y + TILE / 2, 6, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
}

function drawBushes(context) {
  const rows = mapRows();
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (rows[row][col] !== 'B') continue;
      const center = tileCenter(col, row);
      context.fillStyle = COLORS.bush;
      context.beginPath();
      context.arc(center.x - 8, center.y + 4, 12, 0, Math.PI * 2);
      context.arc(center.x + 9, center.y + 5, 11, 0, Math.PI * 2);
      context.arc(center.x, center.y - 7, 12, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = COLORS.bushTop;
      context.beginPath();
      context.arc(center.x - 4, center.y - 4, 6, 0, Math.PI * 2);
      context.arc(center.x + 7, center.y - 2, 5, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawRelics(context, state) {
  for (const relic of state.relics) {
    if (relic.taken) continue;
    const pulse = 1 + Math.sin(state.time * 4 + relic.x) * 0.12;
    context.save();
    context.translate(relic.x, relic.y);
    context.scale(pulse, pulse);
    context.shadowColor = COLORS.relic;
    context.shadowBlur = 12;
    context.fillStyle = COLORS.relic;
    context.beginPath();
    context.moveTo(0, -11);
    context.lineTo(8, 0);
    context.lineTo(0, 11);
    context.lineTo(-8, 0);
    context.closePath();
    context.fill();
    context.restore();
  }
}

function drawCoins(context, state) {
  for (const coin of state.coins) {
    context.fillStyle = '#e8c85a';
    context.beginPath();
    context.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#8a6d1f';
    context.lineWidth = 1;
    context.stroke();
  }
}

function drawGuard(context, guard) {
  const alerted = guard.state === GUARD_CHASE;
  context.fillStyle = alerted ? '#ff2d2d' : COLORS.guard;
  context.beginPath();
  context.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#7d1a1a';
  context.lineWidth = 2;
  context.stroke();
  // Facing tick: the guard's nose.
  context.strokeStyle = '#ffd9d9';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(guard.x, guard.y);
  context.lineTo(guard.x + Math.cos(guard.facing) * (GUARD.radius + 5), guard.y + Math.sin(guard.facing) * (GUARD.radius + 5));
  context.stroke();
  // Suspicion ring while the guard grows wary.
  if (guard.suspicion > 5 && !alerted) {
    context.strokeStyle = 'rgba(255, 214, 90, 0.85)';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(guard.x, guard.y, GUARD.radius + 5, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
    context.stroke();
  }
  const mark = alerted ? '!' : guard.suspicion >= 35 ? '?' : null;
  if (mark) {
    context.fillStyle = alerted ? '#ff2d2d' : '#ffd65a';
    context.font = 'bold 22px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(mark, guard.x, guard.y - GUARD.radius - 8);
  }
  context.fillStyle = COLORS.text;
  context.font = 'bold 10px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText(guard.name.toUpperCase(), guard.x, guard.y + GUARD.radius + 13);
}

function drawPlayer(context, state) {
  const player = state.player;
  const hidden = isBushTile(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  context.save();
  if (hidden) context.globalAlpha = 0.45;
  context.shadowColor = COLORS.player;
  context.shadowBlur = player.sneaking ? 4 : 12;
  context.fillStyle = player.sneaking ? COLORS.playerSneak : COLORS.player;
  context.beginPath();
  context.arc(player.x, player.y, 13, 0, Math.PI * 2);
  context.fill();
  context.restore();
  context.strokeStyle = '#7a5a12';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(player.x, player.y, 13, 0, Math.PI * 2);
  context.stroke();
  // Facing tick.
  context.strokeStyle = '#fff3cf';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(player.x, player.y);
  context.lineTo(player.x + Math.cos(player.facing) * 18, player.y + Math.sin(player.facing) * 18);
  context.stroke();
  if (player.sneaking) {
    context.fillStyle = COLORS.textDim;
    context.font = 'bold 10px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText('SNEAKING', player.x, player.y - 20);
  }
}

function suspicionColor(value) {
  if (value >= 70) return COLORS.danger;
  if (value >= 35) return '#ffb02e';
  return COLORS.ok;
}

function drawHud(context, state) {
  context.fillStyle = COLORS.hud;
  context.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
  context.fillStyle = COLORS.hudLine;
  context.fillRect(0, HUD_HEIGHT - 2, CANVAS_WIDTH, 2);

  context.textAlign = 'left';
  context.fillStyle = COLORS.text;
  context.font = 'bold 20px system-ui, sans-serif';
  context.fillText('THE QUIET GALLERY', 18, 30);
  context.fillStyle = COLORS.textDim;
  context.font = '13px system-ui, sans-serif';
  context.fillText('Reach the green EXIT — unseen. Shift to sneak, click to toss a coin.', 18, 54);

  const suspicion = highestSuspicion(state.guards);
  const meterX = 560;
  const meterY = 22;
  const meterWidth = 220;
  context.fillStyle = COLORS.textDim;
  context.font = 'bold 11px system-ui, sans-serif';
  context.fillText('SUSPICION', meterX, meterY - 6);
  context.fillStyle = '#0a0e16';
  context.fillRect(meterX, meterY, meterWidth, 16);
  context.fillStyle = suspicionColor(suspicion);
  context.fillRect(meterX, meterY, (meterWidth * suspicion) / 100, 16);
  context.strokeStyle = COLORS.hudLine;
  context.lineWidth = 1;
  context.strokeRect(meterX + 0.5, meterY + 0.5, meterWidth - 1, 15);
  context.fillStyle = COLORS.text;
  context.font = 'bold 12px system-ui, sans-serif';
  context.fillText(`${Math.round(suspicion)}%`, meterX + meterWidth + 10, meterY + 13);

  const minutes = Math.floor(state.time / 60);
  const seconds = Math.floor(state.time % 60);
  const clock = `${minutes}:${String(seconds).padStart(2, '0')}`;
  context.textAlign = 'right';
  context.fillStyle = COLORS.text;
  context.font = 'bold 15px system-ui, sans-serif';
  context.fillText(`◆ ${state.player.relics}/${GAME.relicsTotal} relics   ◉ ${state.player.coins} coins`, CANVAS_WIDTH - 18, 26);
  context.fillStyle = COLORS.textDim;
  context.font = '13px system-ui, sans-serif';
  const nerves = '●'.repeat(state.nerves) + '○'.repeat(Math.max(0, GAME.nerves - state.nerves));
  context.fillText(`${nerves} nerves   ${clock}   ${state.muted ? 'MUTED (M)' : 'M mute'}`, CANVAS_WIDTH - 18, 52);

  if (anyChasing(state.guards)) {
    context.fillStyle = 'rgba(180, 20, 20, 0.92)';
    context.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, 30);
    context.fillStyle = '#ffffff';
    context.font = 'bold 15px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText('SPOTTED!  Break line of sight — hide in a bush or behind cover!', CANVAS_WIDTH / 2, HUD_HEIGHT + 20);
  }
}

function overlay(context, alpha) {
  context.fillStyle = `rgba(8, 10, 18, ${alpha})`;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function menuPanel(context, title, lines, button, buttonLabel) {
  overlay(context, 0.72);
  context.textAlign = 'center';
  context.fillStyle = COLORS.text;
  context.font = 'bold 44px system-ui, sans-serif';
  context.fillText(title, CANVAS_WIDTH / 2, 170);
  context.font = '16px system-ui, sans-serif';
  context.fillStyle = COLORS.textDim;
  lines.forEach((line, index) => {
    context.fillText(line, CANVAS_WIDTH / 2, 230 + index * 28);
  });
  context.fillStyle = '#2a6f4f';
  context.fillRect(button.x, button.y, button.width, button.height);
  context.strokeStyle = COLORS.exit;
  context.lineWidth = 2;
  context.strokeRect(button.x, button.y, button.width, button.height);
  context.fillStyle = '#ffffff';
  context.font = 'bold 19px system-ui, sans-serif';
  context.fillText(buttonLabel, CANVAS_WIDTH / 2, button.y + 36);
  context.fillStyle = COLORS.textDim;
  context.font = '13px system-ui, sans-serif';
  context.fillText('or press Space', CANVAS_WIDTH / 2, button.y + button.height + 26);
}

function formatStats(state) {
  const minutes = Math.floor(state.time / 60);
  const seconds = Math.floor(state.time % 60);
  return `Time ${minutes}:${String(seconds).padStart(2, '0')}  ·  Relics ${state.player.relics}/${GAME.relicsTotal}  ·  Spotted ${state.spottedCount}×  ·  Nerves left ${state.nerves}`;
}

export function createRenderer(canvas) {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext('2d');

  return {
    draw(state, screen) {
      context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      context.fillStyle = COLORS.page;
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      context.save();
      context.translate(0, HUD_HEIGHT);
      drawFloor(context, state);
      drawRelics(context, state);
      drawCoins(context, state);
      for (const guard of state.guards) drawCone(context, guard);
      drawCover(context);
      for (const guard of state.guards) drawGuard(context, guard);
      drawPlayer(context, state);
      drawBushes(context);
      context.restore();
      drawHud(context, state);

      if (screen === SCREEN_TITLE) {
        menuPanel(
          context,
          'THE QUIET GALLERY',
          [
            'A night courier. A sleeping museum. Three guards on patrol.',
            'Slip past their vision cones, hide behind crates and in the bushes,',
            'grab the relics if you dare — and reach the green EXIT unseen.',
            '',
            'Move: WASD / arrows    Sneak: hold Shift    Toss a coin: click',
            'Seen too long and a guard gives chase. Caught three times, the job is over.',
          ],
          START_BUTTON,
          'START THE JOB',
        );
      } else if (screen === SCREEN_PAUSED) {
        menuPanel(context, 'PAUSED', ['The guards wait. Take a breath.'], START_BUTTON, 'RESUME');
      } else if (screen === SCREEN_WIN) {
        menuPanel(
          context,
          'CLEAN GETAWAY!',
          [formatStats(state), state.player.relics === GAME.relicsTotal ? 'Every relic, not a single alarm that stuck. A perfect job.' : 'Out the door with the night still quiet.'],
          AGAIN_BUTTON,
          'PLAY AGAIN',
        );
      } else if (screen === SCREEN_OVER) {
        menuPanel(
          context,
          'CAUGHT!',
          [formatStats(state), 'The guards finally closed in. The gallery keeps its secrets — this time.'],
          AGAIN_BUTTON,
          'TRY AGAIN',
        );
      }
    },
  };
}
