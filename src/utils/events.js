// Central, game-wide event names. Using a shared registry avoids typo-prone
// string literals scattered through scenes and systems.

export const EVENTS = {
  PLAYER_HIT: 'player-hit',
  PLAYER_DIED: 'player-died',
  PLAYER_HEAL: 'player-heal',
  ENEMY_KILLED: 'enemy-killed',
  ENEMY_HIT: 'enemy-hit',
  EXECUTION: 'execution',
  COMBO_CHANGED: 'combo-changed',
  COMBO_BROKEN: 'combo-broken',
  SCORE_CHANGED: 'score-changed',
  WEAPON_CHANGED: 'weapon-changed',
  LEVEL_COMPLETE: 'level-complete',
  SETTINGS_CHANGED: 'settings-changed',
  WAVE_STARTED: 'wave-started',
  BOSS_SPAWNED: 'boss-spawned',
  BOSS_PHASE: 'boss-phase',
};
