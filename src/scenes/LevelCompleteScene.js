// LevelCompleteScene — results breakdown, letter rank and next steps.

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, LEVEL_SCENE } from '../config.js';
import { Menu } from '../ui/Menu.js';
import { audio } from '../systems/AudioManager.js';

const RANK_COLOR = { S: '#f2c200', A: '#6dd400', B: '#7fd0ff', C: '#e8e0cf', D: '#9aa0a8' };

export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super(SCENES.LEVEL_COMPLETE);
  }

  init(data) {
    this.results = data.results;
    this.levelNumber = data.levelNumber;
    this.nextScene = data.nextScene;
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const r = this.results;
    this.cameras.main.setBackgroundColor('#08080b');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.add
      .text(cx, 12, 'LEVEL CLEAR', {
        fontFamily: 'monospace', fontSize: '14px', color: '#e8e0cf',
        stroke: '#b3001b', strokeThickness: 2,
      })
      .setOrigin(0.5);

    // --- breakdown table (right side) -----------------------------------
    // Only the score-bonus lines; counts are shown compactly.
    const detail = [
      ['KILLS', `${r.kills}`],
      ['EXECUTIONS', `${r.executions}`],
      ['BEST COMBO', `x${r.bestCombo}`],
      ['TIME BONUS', `${r.timeBonus}`],
      ['STYLE BONUS', `${r.styleBonus}`],
      ['NO-HIT BONUS', `${r.noHitBonus}`],
    ];
    const labelX = 104;
    const valueX = 290;
    const top = 34;
    const lineH = 12;

    detail.forEach(([label, value], i) => {
      const yy = top + i * lineH; // captured per row — no closure bug
      this.time.delayedCall(250 + i * 140, () => {
        audio.play('uiMove');
        this.add.text(labelX, yy, label, {
          fontFamily: 'monospace', fontSize: '9px', color: '#9aa0a8',
        }).setOrigin(0, 0.5);
        this.add.text(valueX, yy, value, {
          fontFamily: 'monospace', fontSize: '9px', color: '#e8e0cf',
        }).setOrigin(1, 0.5);
      });
    });

    // Divider + TOTAL.
    const totalY = top + detail.length * lineH + 6;
    this.time.delayedCall(250 + detail.length * 140, () => {
      audio.play('uiSelect');
      this.add.rectangle(labelX, totalY - 8, valueX - labelX, 1, 0x44444c).setOrigin(0, 0.5);
      this.add.text(labelX, totalY, 'TOTAL', {
        fontFamily: 'monospace', fontSize: '12px', color: '#f2c200',
      }).setOrigin(0, 0.5);
      this.add.text(valueX, totalY, `${r.total}`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#f2c200',
      }).setOrigin(1, 0.5);
    });

    // --- rank stamp (left side) -----------------------------------------
    this.add
      .text(48, 40, 'RANK', { fontFamily: 'monospace', fontSize: '9px', color: '#7a7d85' })
      .setOrigin(0.5);
    this.time.delayedCall(250 + (detail.length + 1) * 140 + 150, () => {
      audio.play('crit');
      const rank = this.add
        .text(48, 78, r.rank, {
          fontFamily: 'monospace', fontSize: '48px',
          color: RANK_COLOR[r.rank] || '#fff', stroke: '#000', strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setScale(2.5)
        .setAlpha(0);
      this.tweens.add({ targets: rank, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
      this.cameras.main.flash(200, 60, 60, 70);
      this._buildMenu();
    });
  }

  _buildMenu() {
    const items = [];
    if (this.nextScene) {
      items.push({ label: 'NEXT LEVEL', onSelect: () => this._go(this.nextScene) });
    }
    items.push({ label: 'RETRY', onSelect: () => this._go(this._levelSceneKey()) });
    items.push({ label: 'LEVEL SELECT', onSelect: () => this._go(SCENES.LEVEL_SELECT) });
    items.push({ label: 'MAIN MENU', onSelect: () => this._go(SCENES.MAIN_MENU) });
    new Menu(this, { x: GAME_WIDTH / 2, y: 142, spacing: 10, fontSize: 9, items });
  }

  _levelSceneKey() {
    return LEVEL_SCENE[this.levelNumber] || SCENES.LEVEL_1;
  }

  _go(key) {
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }
}
