// Project Skull — entry point.
// Configures Phaser for crisp 320x180 pixel-art rendering scaled to the window
// and registers every scene.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES } from './config.js';
import { touch } from './systems/touch.js';
import { audio } from './systems/AudioManager.js';

import { BootScene } from './scenes/BootScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { LevelCompleteScene } from './scenes/LevelCompleteScene.js';
import { Level1Scene } from './scenes/Level1Scene.js';
import { Level2Scene } from './scenes/Level2Scene.js';
import { Level3Scene } from './scenes/Level3Scene.js';
import { Level4Scene } from './scenes/Level4Scene.js';
import { Level5Scene } from './scenes/Level5Scene.js';
import { Level6Scene } from './scenes/Level6Scene.js';
import { Level7Scene } from './scenes/Level7Scene.js';
import { Level8Scene } from './scenes/Level8Scene.js';
import { Level9Scene } from './scenes/Level9Scene.js';
import { Level10Scene } from './scenes/Level10Scene.js';
import { Level11Scene } from './scenes/Level11Scene.js';
import { Level12Scene } from './scenes/Level12Scene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#050507',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 900 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MainMenuScene,
    SettingsScene,
    LevelSelectScene,
    HUDScene,
    PauseScene,
    LevelCompleteScene,
    Level1Scene,
    Level2Scene,
    Level3Scene,
    Level4Scene,
    Level5Scene,
    Level6Scene,
    Level7Scene,
    Level8Scene,
    Level9Scene,
    Level10Scene,
    Level11Scene,
    Level12Scene,
  ],
};

const game = new Phaser.Game(config);

// Build the optional on-screen touch controls (hidden until a level starts and
// only when enabled / on a touch device). Keyboard play is unaffected.
touch.init();

// Expose for debugging in the console.
window.__SKULL__ = game;
window.__TOUCH__ = touch;
window.__AUDIO__ = audio;

export default game;
