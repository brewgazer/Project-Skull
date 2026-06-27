// PauseScene — overlay shown while a level is paused.

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Menu } from '../ui/Menu.js';
import { audio } from '../systems/AudioManager.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PAUSE);
  }

  init(data) {
    this.level = data.level;
  }

  create() {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0);
    this.add
      .text(cx, 34, 'PAUSED', {
        fontFamily: 'monospace', fontSize: '16px', color: '#e8e0cf',
        stroke: '#b3001b', strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.menu = new Menu(this, {
      x: cx, y: 66, spacing: 13,
      items: [
        { label: 'RESUME', onSelect: () => this._resume() },
        {
          label: 'FULLSCREEN', value: () => (this.scale.isFullscreen ? 'ON' : 'OFF'),
          onSelect: () => { this.scale.toggleFullscreen(); this.menu.refresh(); },
          onAdjust: () => { this.scale.toggleFullscreen(); this.menu.refresh(); },
        },
        { label: 'SETTINGS', onSelect: () => this._settings() },
        { label: 'RESTART LEVEL', onSelect: () => this._restart() },
        { label: 'QUIT TO MENU', onSelect: () => this._quit() },
      ],
    });

    this.input.keyboard.on('keydown-ESC', () => this._resume());
  }

  _resume() {
    this.scene.stop();
    this.level.resumeFromPause();
  }

  _settings() {
    // Entering settings from a pause abandons the current run (keeps state clean).
    const key = this.level.scene.key;
    audio.revChainsaw(false);
    audio.stopMusic();
    this.scene.stop(SCENES.HUD);
    this.scene.stop(key);
    this.scene.start(SCENES.SETTINGS, { from: SCENES.MAIN_MENU });
  }

  _restart() {
    // Hand off to the level's own restart so global FX state is restored and
    // the (paused) scene reloads cleanly.
    this.scene.stop();
    this.level.restartLevel();
  }

  _quit() {
    const key = this.level.scene.key;
    audio.revChainsaw(false);
    audio.stopMusic();
    this.scene.stop(SCENES.HUD);
    this.scene.stop(key);
    this.scene.start(SCENES.MAIN_MENU);
  }
}
