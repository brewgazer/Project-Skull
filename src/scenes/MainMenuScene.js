// MainMenuScene — atmospheric title screen with the protagonist idling.

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config.js';
import { Menu } from '../ui/Menu.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioManager.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MAIN_MENU);
  }

  create() {
    const cx = GAME_WIDTH / 2;
    this.cameras.main.setBackgroundColor('#08080b');

    // Moody backdrop bars.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0c0c12).setOrigin(0);
    this.add.rectangle(0, 120, GAME_WIDTH, 60, 0x000000, 0.5).setOrigin(0);

    // Protagonist idling under a flickering light, off to the right so it
    // never overlaps the menu.
    const heroX = 252;
    const hero = this.add.sprite(heroX, 154, 'player').setOrigin(0.5, 1).setScale(2.4);
    if (this.anims.exists('player-idle')) hero.play('player-idle');
    const light = this.add
      .image(heroX, 70, 'smoke_particle')
      .setScale(5, 9)
      .setTint(0xb3001b)
      .setAlpha(0.14)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: light, alpha: 0.05, duration: 1700, yoyo: true, repeat: -1 });

    // Title.
    const title = this.add
      .text(cx, 40, 'PROJECT SKULL', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#e8e0cf',
        stroke: '#b3001b',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: title, y: 38, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add
      .text(cx, 60, 'AN ORIGINAL FLASH-ERA MASSACRE', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#8c8f98',
      })
      .setOrigin(0.5);

    const hi = saveSystem.getHighScore(SCENES.LEVEL_1);
    this.add
      .text(GAME_WIDTH - 4, 4, `HI ${hi}`, {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#f2c200',
      })
      .setOrigin(1, 0);

    new Menu(this, {
      x: 90,
      y: 80,
      spacing: 14,
      align: 'center',
      items: [
        { label: 'NEW MASSACRE', onSelect: () => this._start(SCENES.LEVEL_1) },
        { label: 'LEVEL SELECT', onSelect: () => this.scene.start(SCENES.LEVEL_SELECT) },
        { label: 'SETTINGS', onSelect: () => this.scene.start(SCENES.SETTINGS, { from: SCENES.MAIN_MENU }) },
      ],
    });

    this._buildControlsPanel();

    // Navigation hint.
    this.add
      .text(cx, GAME_HEIGHT - 8, 'ARROWS / WASD navigate   •   ENTER confirm   •   F fullscreen', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#6f727b',
      })
      .setOrigin(0.5);

    // The menu (and level 1) play the signature anthem. Browsers block audio
    // until a user gesture, so kick it off on the first interaction too.
    audio.playMenuMusic();
    const startMenuMusic = () => { audio.unlock(); audio.playMenuMusic(); };
    this.input.once('pointerdown', startMenuMusic);
    this.input.keyboard.once('keydown', startMenuMusic);

    // Fullscreen hotkey (also available in Settings + the mobile button).
    this.input.keyboard.on('keydown-F', () => this.scale.toggleFullscreen());
  }

  _buildControlsPanel() {
    // A clear, readable control reference (the old 6px line was unreadable
    // once the 320x180 canvas was upscaled).
    const rows = [
      ['A / D', 'MOVE'],
      ['W', 'JUMP'],
      ['J', 'ATTACK  (hold to rev)'],
      ['K', 'HEAVY / EXECUTE'],
      ['SHIFT', 'DASH'],
    ];
    const top = 118;
    const lineH = 10;

    // Faint backing panel for contrast.
    this.add
      .rectangle(6, top - 6, 156, rows.length * lineH + 10, 0x000000, 0.35)
      .setOrigin(0, 0);

    rows.forEach(([key, action], i) => {
      const y = top + i * lineH;
      this.add
        .text(58, y, key, { fontFamily: 'monospace', fontSize: '9px', color: '#f2c200' })
        .setOrigin(1, 0);
      this.add
        .text(66, y, action, { fontFamily: 'monospace', fontSize: '9px', color: '#d8d2c4' })
        .setOrigin(0, 0);
    });
  }

  _start(sceneKey) {
    audio.unlock();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(sceneKey));
  }
}
