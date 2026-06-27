// BootScene
// ----------------------------------------------------------------------------
// Generates all procedural textures + animations once, syncs audio volumes with
// the saved settings, removes the HTML loading splash, then hands off to the
// main menu.

import Phaser from 'phaser';
import { SCENES } from '../config.js';
import { generateAllTextures } from '../assets/Assets.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioManager.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create() {
    generateAllTextures(this);

    // Apply saved volume preferences to the audio bus.
    const s = saveSystem.settings;
    audio.setVolumes({
      master: s.masterVolume,
      music: s.musicVolume,
      sfx: s.sfxVolume,
    });

    // Fade out and remove the HTML boot splash.
    const splash = document.getElementById('boot-splash');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 600);
    }

    this.scene.start(SCENES.MAIN_MENU);
  }
}
