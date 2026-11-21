// The Quiet Gallery — boot and the one loop. Input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is
// there. Screens: title, play, paused, win and game over.
//
// ?shot=cover|patrol|chase|exit stages that scene instead of running the
// loop, paints it twice and sets window.__shotReady for a screenshot.
import { HUD_HEIGHT, STEP } from './config.js';
import { createWorld, stepWorld } from './world.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import {
  AGAIN_BUTTON,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  START_BUTTON,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;
const BEST_KEY = 'quiet-gallery-best-seconds';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseFloat(window.localStorage.getItem(BEST_KEY) ?? '') || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best time then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    world.muted = audio.muted;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Reach the green exit unseen.');
  }

  function endRun(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (won && (best === 0 || world.time < best)) {
      best = world.time;
      saveBest(best);
    }
    announce(won ? `Clean getaway in ${Math.round(world.time)} seconds.` : 'Caught. The gallery keeps its secrets.');
  }

  function playEvents(events) {
    for (const event of events) {
      if (event.type === 'step') audio.playerStep(world.player.sneaking);
      else if (event.type === 'guardStep') {
        const distance = Math.hypot(event.guard.x - world.player.x, event.guard.y - world.player.y);
        audio.guardStep(distance);
      } else if (event.type === 'coin') audio.coin();
      else if (event.type === 'relic') audio.relic();
      else if (event.type === 'spotted') {
        audio.spotted();
        announce('Spotted! Break line of sight!');
      } else if (event.type === 'caught') {
        audio.caught();
        announce(world.nerves > 0 ? `Caught! ${world.nerves} nerve${world.nerves === 1 ? '' : 's'} left.` : 'Caught!');
      } else if (event.type === 'win') audio.win();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    let click = null;
    if (input.takeClick()) {
      const mouse = input.mousePosition();
      if (mouse && mouse.y > HUD_HEIGHT) click = { x: mouse.x, y: mouse.y - HUD_HEIGHT };
    }
    const events = stepWorld(world, STEP, input.direction(), click);
    playEvents(events);
    if (world.won) endRun(true);
    else if (world.over) endRun(false);
  }

  function buttonClicked(button) {
    return input.takeClick() && input.hovering(button);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      world.muted = audio.toggleMute();
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_OVER) {
      if (actions & (ACTION_CONFIRM | ACTION_RESTART) || buttonClicked(screen === SCREEN_TITLE ? START_BUTTON : AGAIN_BUTTON)) {
        startGame();
      }
      return;
    }
    if (actions & ACTION_RESTART) {
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Quiet Gallery. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
