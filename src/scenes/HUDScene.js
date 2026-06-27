// HUDScene
// ----------------------------------------------------------------------------
// Overlay scene drawn on top of the active level. Reacts to gameplay events
// (score, combo, health, weapon, boss) emitted by the level scene. Kept fully
// decoupled: it only reads from the level via events + a couple of getters.

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, TEX, PALETTE } from '../config.js';
import { EVENTS } from '../utils/events.js';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super(SCENES.HUD);
  }

  init(data) {
    this.level = data.level;
  }

  create() {
    this.hearts = [];
    for (let i = 0; i < this.level.player.maxHearts; i++) {
      this.hearts.push(this.add.image(8 + i * 12, 10, TEX.HEART_FULL).setScrollFactor(0));
    }

    this.scoreText = this.add
      .text(GAME_WIDTH - 6, 4, '0', {
        fontFamily: 'monospace', fontSize: '12px', color: '#e8e0cf',
        stroke: '#000', strokeThickness: 3,
      })
      .setOrigin(1, 0);
    this.displayScore = 0;

    // Combo display.
    this.comboText = this.add
      .text(GAME_WIDTH - 6, 18, '', {
        fontFamily: 'monospace', fontSize: '10px', color: '#f2c200',
        stroke: '#000', strokeThickness: 2,
      })
      .setOrigin(1, 0);
    this.tierText = this.add
      .text(GAME_WIDTH - 6, 30, '', {
        fontFamily: 'monospace', fontSize: '8px', color: '#ff3b4c',
        stroke: '#000', strokeThickness: 2,
      })
      .setOrigin(1, 0);
    // Combo decay bar.
    this.comboBarBg = this.add.image(GAME_WIDTH - 6, 42, TEX.PIXEL)
      .setOrigin(1, 0).setTint(0x222228).setDisplaySize(50, 2).setVisible(false);
    this.comboBar = this.add.image(GAME_WIDTH - 6, 42, TEX.PIXEL)
      .setOrigin(1, 0).setTint(PALETTE.hazard).setDisplaySize(50, 2).setVisible(false);

    // Weapon icon.
    this.weaponIcon = this.add.image(10, GAME_HEIGHT - 10, TEX.CHAINSAW_ICON).setOrigin(0, 1);
    this.weaponLabel = this.add
      .text(10, GAME_HEIGHT - 22, '', { fontFamily: 'monospace', fontSize: '8px', color: '#b8bcc4' })
      .setOrigin(0, 1);

    // Objective / tutorial text (top-center) — sits on a dim strip for contrast
    // and is large enough to read once the canvas is upscaled.
    this.objBg = this.add
      .rectangle(GAME_WIDTH / 2, 4, GAME_WIDTH, 22, 0x000000, 0.4)
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.objText = this.add
      .text(GAME_WIDTH / 2, 7, '', {
        fontFamily: 'monospace', fontSize: '9px', color: '#ffffff',
        stroke: '#000', strokeThickness: 3, align: 'center', lineSpacing: 2,
      })
      .setOrigin(0.5, 0);

    // Boss bar (hidden until a boss appears).
    this.bossBarBg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 8, TEX.PIXEL)
      .setTint(0x000000).setDisplaySize(220, 6).setVisible(false);
    this.bossBar = this.add.image(GAME_WIDTH / 2 - 109, GAME_HEIGHT - 8, TEX.PIXEL)
      .setOrigin(0, 0.5).setTint(PALETTE.blood).setDisplaySize(218, 4).setVisible(false);
    this.bossName = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 16, '', {
        fontFamily: 'monospace', fontSize: '7px', color: '#ff3b4c',
      })
      .setOrigin(0.5).setVisible(false);
    this.boss = null;

    this._listen();
    this._updateHearts(this.level.player.hearts);
    this._updateWeapon(this.level.player.weapon);
    // Show any objective the level set during buildLevel(), before the HUD
    // existed to receive the event.
    if (this.level.objective) this._showObjective(this.level.objective);
  }

  _showObjective(text) {
    this.objText.setText(text || '');
    const show = !!text;
    this.objBg.setVisible(show);
    if (show) this.objBg.setSize(GAME_WIDTH, this.objText.height + 8);
  }

  _listen() {
    const lv = this.level.events;
    // A Scene's event emitter PERSISTS across scene.restart() (it is only
    // destroyed on a full scene destroy). If we don't remove these listeners
    // when this HUD shuts down, a restarted level will fire them against our
    // already-destroyed game objects and crash mid-create. So track + detach.
    this._levelHandlers = [];
    const on = (evt, fn) => { lv.on(evt, fn); this._levelHandlers.push([evt, fn]); };

    on(EVENTS.SCORE_CHANGED, (i) => { if (i && typeof i.score === 'number') this.targetScore = i.score; });
    on(EVENTS.PLAYER_HIT, (i) => this._updateHearts(i.hearts));
    on(EVENTS.PLAYER_HEAL, (i) => this._updateHearts(i.hearts));
    on(EVENTS.WEAPON_CHANGED, (w) => this._updateWeapon(w));
    on(EVENTS.COMBO_CHANGED, (i) => this._updateCombo(i));
    on(EVENTS.COMBO_BROKEN, () => this._updateCombo({ count: 0, tier: { label: '' } }));
    on(EVENTS.BOSS_SPAWNED, (boss) => this._showBoss(boss));
    on('hud-objective', (text) => this._showObjective(text));
    this.targetScore = 0;

    // Stop the HUD when the level shuts down...
    lv.once('shutdown', () => this.scene.stop());
    // ...and detach our level listeners when THIS HUD shuts down.
    this.events.once('shutdown', () => {
      this._levelHandlers.forEach(([evt, fn]) => lv.off(evt, fn));
      this._levelHandlers.length = 0;
    });
  }

  _updateHearts(n) {
    this.hearts.forEach((h, i) => h.setTexture(i < n ? TEX.HEART_FULL : TEX.HEART_EMPTY));
    // brief pop on the changed heart
    if (n >= 0 && n < this.hearts.length) {
      const h = this.hearts[Math.max(0, n - 1)];
    }
  }

  _updateWeapon(w) {
    if (!w || !this.weaponIcon || !this.weaponIcon.scene) return;
    this.weaponIcon.setTexture(w.icon || TEX.CHAINSAW_ICON);
    this.weaponLabel.setText(w.name.toUpperCase());
  }

  _updateCombo(i) {
    const count = i.count || 0;
    if (count >= 2) {
      this.comboText.setText(`x${count}`);
      this.comboBar.setVisible(true);
      this.comboBarBg.setVisible(true);
      if (i.tierChanged) {
        this.comboText.setScale(1.6);
        this.tweens.add({ targets: this.comboText, scale: 1, duration: 220, ease: 'Back.easeOut' });
      }
    } else {
      this.comboText.setText('');
      this.comboBar.setVisible(false);
      this.comboBarBg.setVisible(false);
    }
    this.tierText.setText(i.tier?.label || '');
  }

  _showBoss(boss) {
    this.boss = boss;
    this.bossBarBg.setVisible(true);
    this.bossBar.setVisible(true);
    const name = boss.bossName || boss.cfg?.bossName || 'THE FOREMAN';
    this.bossName.setVisible(true).setText(name);
  }

  update() {
    // Smoothly roll the score toward its target.
    if (this.displayScore !== this.targetScore) {
      const diff = this.targetScore - this.displayScore;
      this.displayScore += Math.ceil(diff * 0.2);
      if (Math.abs(this.targetScore - this.displayScore) < 2) this.displayScore = this.targetScore;
      this.scoreText.setText(`${this.displayScore}`);
    }

    // Combo decay bar.
    if (this.comboBar.visible) {
      this.comboBar.setDisplaySize(50 * this.level.combo.fraction, 2);
    }

    // Boss health.
    if (this.boss) {
      if (!this.boss.active || this.boss.dead) {
        this.bossBar.setVisible(false);
        this.bossBarBg.setVisible(false);
        this.bossName.setVisible(false);
        this.boss = null;
      } else {
        const frac = Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1);
        this.bossBar.setDisplaySize(218 * frac, 4);
      }
    }
  }
}
