// The Quiet Gallery — input. Keyboard (WASD/arrows, Shift to sneak, P pause,
// R restart, M mute, Space/Enter confirm) and mouse (click to toss a coin,
// click buttons on the menus). One edge-triggered action queue, so a key
// press is never read twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const KEYS = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let actions = 0;
  let mouse = null;
  let mouseClicked = false;

  function onKeyDown(event) {
    if (event.repeat) return;
    const move = KEYS[event.code];
    if (move) {
      held.add(move);
      event.preventDefault();
      return;
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      held.add('sneak');
      event.preventDefault();
      return;
    }
    if (event.code === 'Space' || event.code === 'Enter') {
      pressed.add('confirm');
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      pressed.add('pause');
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      pressed.add('restart');
      actions |= ACTION_RESTART;
    } else if (event.code === 'KeyM') {
      pressed.add('mute');
      actions |= ACTION_MUTE;
    }
  }

  function onKeyUp(event) {
    const move = KEYS[event.code];
    if (move) held.delete(move);
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.delete('sneak');
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse = {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function onMouseDown(event) {
    onMouseMove(event);
    mouseClicked = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    /** Normalised movement direction plus the sneak flag, from held keys. */
    direction() {
      const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      const y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      return { x, y, sneak: held.has('sneak') };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      pressed.clear();
      return taken;
    },
    /** The last mouse position in canvas pixels, or null before any move. */
    mousePosition() {
      return mouse;
    },
    /** True once per click; call it every frame to consume the click. */
    takeClick() {
      const clicked = mouseClicked;
      mouseClicked = false;
      return clicked;
    },
    /** True while the pointer hovers the rectangle (canvas pixels). */
    hovering(rect) {
      return (
        mouse !== null &&
        mouse.x >= rect.x &&
        mouse.x <= rect.x + rect.width &&
        mouse.y >= rect.y &&
        mouse.y <= rect.y + rect.height
      );
    },
  };
}
