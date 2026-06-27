// LevelSelectScene — pick an unlocked level; shows best score + rank per level.

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, LEVEL_SCENE, LEVEL_NAMES } from '../config.js';
import { Menu } from '../ui/Menu.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioManager.js';

// All nine levels, built from the central registry.
const LEVELS = Object.keys(LEVEL_SCENE).map((n) => {
  const num = Number(n);
  return { num, name: LEVEL_NAMES[num], scene: LEVEL_SCENE[num], id: LEVEL_SCENE[num] };
});

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENES.LEVEL_SELECT);
  }

  create() {
    const cx = GAME_WIDTH / 2;
    this.cameras.main.setBackgroundColor('#0a0a0f');
    this.add
      .text(cx, 9, 'LEVEL SELECT', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e8e0cf',
        stroke: '#b3001b',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    const unlocked = saveSystem.data.progress.unlockedLevels;
    const items = LEVELS.map((lv) => {
      const locked = lv.num > unlocked;
      const hi = saveSystem.data.highScores[lv.id];
      const suffix = locked ? ' [LOCKED]' : hi ? `  ${hi.rank} ${hi.score}` : '';
      return {
        label: `${lv.num}. ${lv.name}${suffix}`,
        onSelect: () => {
          if (locked) {
            audio.play('hurt');
            return;
          }
          this.cameras.main.fadeOut(200, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(lv.scene));
        },
      };
    });

    items.push({ label: 'BACK', onSelect: () => this.scene.start(SCENES.MAIN_MENU) });

    new Menu(this, { x: cx, y: 28, spacing: 13, align: 'center', fontSize: 9, items });

    this.input.keyboard.on('keydown-ESC', () => this.scene.start(SCENES.MAIN_MENU));
  }
}
