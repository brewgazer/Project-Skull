// Global game constants for Project Skull.
// Native render resolution is 320x180 (16:9) scaled up x4 for chunky pixel art.

export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;
export const SCALE = 4;

// World gravity (pixels/sec^2) used by arcade physics.
export const GRAVITY_Y = 900;

// Color palette — gritty industrial / urban decay.
export const PALETTE = {
  blood: 0xb3001b,
  bloodDark: 0x6e0010,
  bone: 0xe8e0cf,
  steel: 0x6c7079,
  steelDark: 0x3a3d44,
  rust: 0x7a4a2b,
  hazard: 0xf2c200,
  toxic: 0x6dd400,
  shadow: 0x050507,
  smoke: 0x9aa0a8,
  spark: 0xfff2a8,
  ui: 0xe8e0cf,
  uiDim: 0x7a7d85,
};

// Local storage key for the persistent save profile.
export const SAVE_KEY = 'project-skull-save-v1';

// Scene keys, centralized to avoid magic strings.
export const SCENES = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MAIN_MENU: 'MainMenuScene',
  SETTINGS: 'SettingsScene',
  LEVEL_SELECT: 'LevelSelectScene',
  HUD: 'HUDScene',
  PAUSE: 'PauseScene',
  GAME_OVER: 'GameOverScene',
  LEVEL_COMPLETE: 'LevelCompleteScene',
  LEVEL_1: 'Level1Scene',
  LEVEL_2: 'Level2Scene',
  LEVEL_3: 'Level3Scene',
  LEVEL_4: 'Level4Scene',
  LEVEL_5: 'Level5Scene',
  LEVEL_6: 'Level6Scene',
  LEVEL_7: 'Level7Scene',
  LEVEL_8: 'Level8Scene',
  LEVEL_9: 'Level9Scene',
  LEVEL_10: 'Level10Scene',
  LEVEL_11: 'Level11Scene',
  LEVEL_12: 'Level12Scene',
};

// Maps a 1-based level number to its scene key. Single source of truth for
// progression (level-select unlock, "next level", retry).
export const LEVEL_SCENE = {
  1: SCENES.LEVEL_1,
  2: SCENES.LEVEL_2,
  3: SCENES.LEVEL_3,
  4: SCENES.LEVEL_4,
  5: SCENES.LEVEL_5,
  6: SCENES.LEVEL_6,
  7: SCENES.LEVEL_7,
  8: SCENES.LEVEL_8,
  9: SCENES.LEVEL_9,
  10: SCENES.LEVEL_10,
  11: SCENES.LEVEL_11,
  12: SCENES.LEVEL_12,
};

export const LEVEL_NAMES = {
  1: 'CHAINSAW RAMPAGE',
  2: 'DOOR DEFENSE',
  3: 'FACTORY',
  4: 'LABORATORY',
  5: 'APARTMENT COMPLEX',
  6: 'CONSTRUCTION SITE',
  7: 'SUBWAY',
  8: 'WAREHOUSE',
  9: 'CORPORATE HQ',
  10: 'MAX SECURITY PRISON',
  11: 'CHEMICAL PLANT',
  12: 'RESEARCH FACILITY',
};

// Texture keys generated procedurally at boot.
export const TEX = {
  // characters
  PLAYER: 'player',
  // enemies
  GRUNT: 'grunt',
  RUNNER: 'runner',
  BRUTE: 'brute',
  MINIBOSS: 'miniboss',
  // weapons / icons
  CHAINSAW_ICON: 'chainsaw_icon',
  BAT_ICON: 'bat_icon',
  // effects
  BLOOD: 'blood_particle',
  SPARK: 'spark_particle',
  SMOKE: 'smoke_particle',
  DUST: 'dust_particle',
  GIB: 'gib_particle',
  SLASH: 'slash_arc',
  // environment
  FLOOR: 'floor_tile',
  WALL_BG: 'wall_bg',
  CRATE: 'crate',
  BARREL: 'barrel',
  BARREL_ROLL: 'barrel_roll',
  COVER_BARREL: 'cover_barrel',
  DOOR: 'door',
  PILLAR: 'pillar',
  // level props / hazards (levels 3-9)
  CONVEYOR: 'conveyor',
  SAWBLADE: 'sawblade',
  CRUSHER: 'crusher',
  ELECTRIC: 'electric',
  CONTAINER: 'container',
  FORKLIFT: 'forklift',
  TRAIN: 'train',
  DEBRIS: 'debris',
  ELEVATOR: 'elevator',
  SCAFFOLD: 'scaffold',
  LIGHT: 'light_glow',
  // ui
  HEART_FULL: 'heart_full',
  HEART_EMPTY: 'heart_empty',
  PIXEL: 'pixel',
};
