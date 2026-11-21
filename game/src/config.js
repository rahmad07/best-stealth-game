// The Quiet Gallery — shared tuning numbers. One place holds every constant the
// other modules read, so balancing the stealth (speeds, sight, suspicion) never
// means hunting numbers through the game.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 16;
export const FIELD_WIDTH = COLS * TILE;
export const FIELD_HEIGHT = ROWS * TILE;
export const HUD_HEIGHT = 80;
export const CANVAS_WIDTH = FIELD_WIDTH;
export const CANVAS_HEIGHT = HUD_HEIGHT + FIELD_HEIGHT;
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 95,
  // How far a running player's footsteps carry: a guard inside this radius
  // turns toward the noise.
  noiseRadius: 170,
  sneakNoiseRadius: 55,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 132,
  investigateSpeed: 95,
  // Vision cone: how far a guard sees and how wide the cone opens.
  sightRange: 250,
  sightHalfAngle: 0.61,
  // Suspicion (0..100) gained per second while the player is seen.
  spotRateClose: 95,
  spotRateFar: 55,
  spotRateShadow: 26,
  spotRateSneak: 0.55,
  decayRate: 22,
  // Seconds a guard keeps chasing after losing sight before giving up.
  chaseMemory: 3.5,
  investigateTime: 3.0,
  catchDistance: 26,
};

export const GAME = {
  nerves: 3,
  relicsTotal: 4,
  coinRange: 260,
  coinInvestigateRadius: 230,
  // A coin landing this close to a guard is heard for sure.
  coinHearRadius: 210,
};

export const COLORS = {
  page: '#0d1117',
  hud: '#121826',
  hudLine: '#2a3550',
  floorA: '#1d2637',
  floorB: '#1a2233',
  floorEdge: '#232f47',
  wall: '#46587c',
  wallTop: '#5b6f96',
  crate: '#8a6b3f',
  crateTop: '#a8834f',
  pedestal: '#6b5a8a',
  pedestalTop: '#8a76ad',
  bush: '#2f6b3a',
  bushTop: '#3f8a4d',
  shadow: 'rgba(6, 8, 16, 0.55)',
  exit: '#37e08a',
  exitGlow: 'rgba(55, 224, 138, 0.25)',
  relic: '#ffd94d',
  player: '#ffc857',
  playerSneak: '#e8a94e',
  guard: '#e5484d',
  cone: 'rgba(255, 214, 90, 0.16)',
  coneEdge: 'rgba(255, 214, 90, 0.5)',
  coneAlert: 'rgba(229, 72, 77, 0.22)',
  coneAlertEdge: 'rgba(229, 72, 77, 0.65)',
  text: '#e8ecf4',
  textDim: '#9aa7bd',
  danger: '#ff5d5d',
  ok: '#37e08a',
};
