// SaveSystem
// ----------------------------------------------------------------------------
// Persistent player profile backed by localStorage: settings, progression,
// high scores, collectibles and lifetime stats. All access goes through this
// module so the storage schema lives in exactly one place.

import { SAVE_KEY } from '../config.js';

const DEFAULT_SAVE = {
  version: 1,
  settings: {
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.9,
    screenShake: true,
    bloodIntensity: 1, // 0 = off, 0.5 = reduced, 1 = full
    colorblind: 'off', // off | protanopia | deuteranopia | tritanopia
    touchControls: 'auto', // auto (show on touch devices) | on | off
    // Keys use Phaser KeyCode names (see InputManager normalization).
    keybinds: {
      left: ['LEFT', 'A'],
      right: ['RIGHT', 'D'],
      jump: ['UP', 'W', 'SPACE'],
      attack: ['J', 'X'],
      heavy: ['K', 'C'],
      dash: ['SHIFT', 'L'],
      interact: ['E', 'DOWN'],
      pause: ['ESC', 'P'],
    },
  },
  progress: {
    unlockedLevels: 1, // highest unlocked level (1-based)
    completedLevels: [],
  },
  highScores: {}, // levelId -> { score, rank }
  collectibles: {}, // levelId -> [ids]
  stats: {
    kills: 0,
    deaths: 0,
    executions: 0,
    bestCombo: 0,
    playtimeMs: 0,
  },
};

function deepMerge(target, source) {
  const out = Array.isArray(target) ? [...target] : { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      out[key] = deepMerge(target[key], source[key]);
    } else if (!(key in out)) {
      out[key] = source[key];
    }
  }
  return out;
}

class SaveSystem {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE);
      const parsed = JSON.parse(raw);
      // Merge to absorb new fields added in updates.
      return deepMerge(parsed, DEFAULT_SAVE);
    } catch (e) {
      console.warn('[Save] Failed to load, using defaults.', e);
      return structuredClone(DEFAULT_SAVE);
    }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[Save] Failed to persist.', e);
    }
  }

  get settings() {
    return this.data.settings;
  }

  updateSettings(patch) {
    Object.assign(this.data.settings, patch);
    this.save();
  }

  unlockLevel(levelNumber) {
    if (levelNumber > this.data.progress.unlockedLevels) {
      this.data.progress.unlockedLevels = levelNumber;
      this.save();
    }
  }

  completeLevel(levelId) {
    if (!this.data.progress.completedLevels.includes(levelId)) {
      this.data.progress.completedLevels.push(levelId);
      this.save();
    }
  }

  recordScore(levelId, score, rank) {
    const prev = this.data.highScores[levelId];
    if (!prev || score > prev.score) {
      this.data.highScores[levelId] = { score, rank };
      this.save();
      return true; // new record
    }
    return false;
  }

  getHighScore(levelId) {
    return this.data.highScores[levelId]?.score ?? 0;
  }

  addStats(patch) {
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'bestCombo') {
        this.data.stats.bestCombo = Math.max(this.data.stats.bestCombo, v);
      } else {
        this.data.stats[k] = (this.data.stats[k] || 0) + v;
      }
    }
    this.save();
  }

  collect(levelId, id) {
    const list = this.data.collectibles[levelId] || (this.data.collectibles[levelId] = []);
    if (!list.includes(id)) {
      list.push(id);
      this.save();
    }
  }

  reset() {
    this.data = structuredClone(DEFAULT_SAVE);
    this.save();
  }
}

export const saveSystem = new SaveSystem();
