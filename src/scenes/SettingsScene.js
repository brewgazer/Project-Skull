// SettingsScene — audio, accessibility and key-rebinding options.

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH } from '../config.js';
import { Menu } from '../ui/Menu.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioManager.js';
import { touch } from '../systems/touch.js';
import { clamp } from '../utils/math.js';

const BLOOD_LABELS = { 0: 'OFF', 0.5: 'LOW', 1: 'FULL' };
const COLORBLIND_MODES = ['off', 'protanopia', 'deuteranopia', 'tritanopia'];
const TOUCH_MODES = ['auto', 'on', 'off'];

// Convert a DOM KeyboardEvent.code to a Phaser KeyCode name.
function codeToPhaser(code) {
  if (code.startsWith('Key')) return code.slice(3); // KeyA -> A
  if (code.startsWith('Digit')) {
    return ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'][
      +code.slice(5)
    ];
  }
  const map = {
    ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN',
    Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Escape: 'ESC',
    Enter: 'ENTER', ControlLeft: 'CTRL', ControlRight: 'CTRL',
  };
  return map[code] || null;
}

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENES.SETTINGS);
  }

  init(data) {
    this.from = data?.from || SCENES.MAIN_MENU;
  }

  create() {
    const cx = GAME_WIDTH / 2;
    this.cameras.main.setBackgroundColor('#0a0a0f');
    this.add
      .text(cx, 12, 'SETTINGS', {
        fontFamily: 'monospace', fontSize: '12px', color: '#e8e0cf',
        stroke: '#b3001b', strokeThickness: 2,
      })
      .setOrigin(0.5);

    const s = saveSystem.settings;
    const pct = (v) => `${Math.round(v * 100)}%`;

    const applyVolumes = () => {
      audio.setVolumes({ master: s.masterVolume, music: s.musicVolume, sfx: s.sfxVolume });
      saveSystem.updateSettings({
        masterVolume: s.masterVolume, musicVolume: s.musicVolume, sfxVolume: s.sfxVolume,
      });
    };

    this.rebinding = null;
    const rebindItem = (action, label) => ({
      label: () => (this.rebinding === action ? `${label}: <PRESS KEY>` : `${label}`),
      value: () => (this.rebinding === action ? '' : (s.keybinds[action]?.[0] || '?')),
      onSelect: () => {
        this.rebinding = action;
        this.menu.refresh();
      },
    });

    this.menu = new Menu(this, {
      x: 40, y: 30, spacing: 11, align: 'left', fontSize: 8,
      items: [
        {
          label: 'MASTER VOL', value: () => pct(s.masterVolume),
          onAdjust: (d) => { s.masterVolume = clamp(+(s.masterVolume + d * 0.1).toFixed(2), 0, 1); applyVolumes(); },
        },
        {
          label: 'MUSIC VOL', value: () => pct(s.musicVolume),
          onAdjust: (d) => { s.musicVolume = clamp(+(s.musicVolume + d * 0.1).toFixed(2), 0, 1); applyVolumes(); },
        },
        {
          label: 'SFX VOL', value: () => pct(s.sfxVolume),
          onAdjust: (d) => { s.sfxVolume = clamp(+(s.sfxVolume + d * 0.1).toFixed(2), 0, 1); applyVolumes(); audio.play('hit'); },
        },
        {
          label: 'SCREEN SHAKE', value: () => (s.screenShake ? 'ON' : 'OFF'),
          onAdjust: () => { s.screenShake = !s.screenShake; saveSystem.updateSettings({ screenShake: s.screenShake }); },
          onSelect: () => { s.screenShake = !s.screenShake; saveSystem.updateSettings({ screenShake: s.screenShake }); },
        },
        {
          label: 'BLOOD', value: () => BLOOD_LABELS[s.bloodIntensity] ?? 'FULL',
          onAdjust: (d) => {
            const opts = [0, 0.5, 1];
            let i = opts.indexOf(s.bloodIntensity); if (i < 0) i = 2;
            i = (i + d + opts.length) % opts.length;
            s.bloodIntensity = opts[i]; saveSystem.updateSettings({ bloodIntensity: s.bloodIntensity });
          },
          onSelect: () => this.menu._adjust(1),
        },
        {
          label: 'COLORBLIND', value: () => s.colorblind.toUpperCase(),
          onAdjust: (d) => {
            let i = COLORBLIND_MODES.indexOf(s.colorblind); if (i < 0) i = 0;
            i = (i + d + COLORBLIND_MODES.length) % COLORBLIND_MODES.length;
            s.colorblind = COLORBLIND_MODES[i]; saveSystem.updateSettings({ colorblind: s.colorblind });
          },
          onSelect: () => this.menu._adjust(1),
        },
        {
          label: 'TOUCH CONTROLS', value: () => (s.touchControls || 'auto').toUpperCase(),
          onAdjust: (d) => {
            let i = TOUCH_MODES.indexOf(s.touchControls); if (i < 0) i = 0;
            i = (i + d + TOUCH_MODES.length) % TOUCH_MODES.length;
            s.touchControls = TOUCH_MODES[i];
            touch.setMode(s.touchControls); // persists + updates the overlay
          },
          onSelect: () => this.menu._adjust(1),
        },
        {
          label: 'FULLSCREEN', value: () => (this.scale.isFullscreen ? 'ON' : 'OFF'),
          // Must run inside the key/click handler (a user gesture) — Menu calls
          // these synchronously from input events, so the request is allowed.
          onSelect: () => { this.scale.toggleFullscreen(); this.menu.refresh(); },
          onAdjust: () => { this.scale.toggleFullscreen(); this.menu.refresh(); },
        },
        rebindItem('jump', 'REBIND JUMP'),
        rebindItem('attack', 'REBIND ATTACK'),
        rebindItem('heavy', 'REBIND HEAVY'),
        rebindItem('dash', 'REBIND DASH'),
        {
          label: 'RESET PROGRESS', onSelect: () => {
            saveSystem.reset();
            this.scene.restart();
          },
        },
        { label: 'BACK', onSelect: () => this.scene.start(this.from) },
      ],
    });

    // Capture the next key for rebinding (handled before Menu's nav handler
    // by checking the rebinding flag).
    this.input.keyboard.on('keydown', (e) => {
      if (!this.rebinding) return;
      const name = codeToPhaser(e.code);
      if (name) {
        const action = this.rebinding;
        const existing = s.keybinds[action] || [];
        s.keybinds[action] = [name, ...existing.slice(1)];
        saveSystem.updateSettings({ keybinds: s.keybinds });
        this.game.events.emit('rebind');
        audio.play('uiSelect');
      }
      this.rebinding = null;
      this.menu.refresh();
      e.stopImmediatePropagation();
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (!this.rebinding) this.scene.start(this.from);
    });
  }
}
