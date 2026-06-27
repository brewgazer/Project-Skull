// Level2Scene — "Door Defense"
// A single-screen survival brawler: waves of enemies pour in from the right and
// try to breach the doorway behind the player. The baseball bat's sweet-spot
// timing sends them flying. Showcases the timed-swing weapon and wave system.

import { SCENES, GAME_WIDTH, TEX, PALETTE } from '../config.js';
import { BaseLevelScene, GROUND_Y } from './BaseLevelScene.js';
import { audio } from '../systems/AudioManager.js';
import { EVENTS } from '../utils/events.js';

const TOTAL_WAVES = 8;
const BREACH_X = 26;

export class Level2Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_2);
  }

  get levelNumber() { return 2; }
  get parTime() { return 120000; }
  get startWeapon() { return 'bat'; }
  get nextScene() { return null; } // Levels 3+ are framework-ready, not yet built.

  buildLevel() {
    this.worldWidth = GAME_WIDTH;
    this.musicBpm = 150;

    this.addGround();
    this.addCheckpoint(60);

    // The doorway being defended.
    this.door = this.add.image(16, GROUND_Y, TEX.DOOR).setOrigin(0.5, 1).setDepth(5);
    this.add.image(8, GROUND_Y, TEX.PILLAR).setOrigin(0.5, 1).setDepth(-5);
    this.add.image(GAME_WIDTH - 8, GROUND_Y, TEX.PILLAR).setOrigin(0.5, 1).setDepth(-5);

    this.doorHealth = 6;
    this.wave = 0;
    this.spawnsLeft = 0;
    this.waveActive = false;
    this.spawnTimer = null;

    // Camera stays put on this single-screen arena.
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(GAME_WIDTH / 2, GROUND_Y - 40);

    this.setObjective('DEFEND THE DOOR  -  TIME YOUR SWINGS (J)');
    this.time.delayedCall(2200, () => this._startWave(1));
  }

  _startWave(n) {
    this.wave = n;
    this.waveActive = true;
    this.doneSpawning = false;
    this.setObjective(`WAVE ${n} / ${TOTAL_WAVES}   DOOR ${this._doorBar()}`);
    audio.setMusicIntensity(0.4 + n * 0.06);

    // Build this wave's roster, scaling count + toughness.
    const count = 2 + n;
    const roster = [];
    for (let i = 0; i < count; i++) {
      let type = 'grunt';
      const r = Math.random();
      if (n >= 3 && r < 0.3) type = 'runner';
      if (n >= 5 && r > 0.75) type = 'brute';
      roster.push(type);
    }
    this.spawnsLeft = roster.length;

    const interval = Math.max(500, 1500 - n * 110);
    let idx = 0;
    this.spawnTimer = this.time.addEvent({
      delay: interval,
      repeat: roster.length - 1,
      callback: () => {
        const type = roster[idx++];
        // Stagger the entry point a little so enemies don't all stack onto the
        // exact same pixel (which made a whole wave read as a single sprite).
        const sx = GAME_WIDTH - 8 - (idx % 3) * 7;
        const e = this.spawnEnemy(type, sx, GROUND_Y);
        e.aggro = true; // they march immediately
        this.spawnsLeft--;
        if (this.spawnsLeft <= 0) this.doneSpawning = true;
      },
    });
  }

  _doorBar() {
    return '|'.repeat(this.doorHealth) + '.'.repeat(Math.max(0, 6 - this.doorHealth));
  }

  _breach(enemy) {
    enemy.deactivate?.();
    this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
    this.doorHealth = Math.max(0, this.doorHealth - 1);
    this.combo.break();
    this.scoreSystem.score = Math.max(0, this.scoreSystem.score - 250);
    this.events.emit(EVENTS.SCORE_CHANGED, { score: this.scoreSystem.score });
    this.fx.flash(PALETTE.blood, 0.4, 160);
    this.fx.shake(200, 0.014);
    audio.play('hurt');
    this.setObjective(`WAVE ${this.wave} / ${TOTAL_WAVES}   DOOR ${this._doorBar()}`);

    if (this.doorHealth <= 0) {
      // The door is overrun — the player is pushed back to recover (retry beat).
      this.doorHealth = 6;
      this.player.takeDamage(1, 1);
    }
  }

  onLevelUpdate() {
    // Detect breaches: any active enemy that slips past the doorway line.
    // Also reclaim any enemy that somehow ends up outside the arena (e.g. flung
    // off-screen by a heavy hit) so it can never silently stall wave progress.
    this.enemies.getChildren().forEach((e) => {
      if (!e.active || e.dead) return;
      if (e.x < BREACH_X) {
        this._breach(e);
      } else if (e.x > GAME_WIDTH + 12 || e.y > GROUND_Y + 80 || e.y < -120) {
        e.deactivate?.();
        this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
      }
    });

    // Wave progression.
    if (this.waveActive && this.doneSpawning && this.enemiesRemaining <= 0) {
      this.waveActive = false;
      if (this.wave >= TOTAL_WAVES) {
        this.setObjective('THE DOOR HOLDS');
        this.time.delayedCall(800, () => this.completeLevel());
      } else {
        this.setObjective(`WAVE ${this.wave} CLEARED`);
        this.fx.flash(0xffffff, 0.2, 120);
        this.time.delayedCall(2200, () => this._startWave(this.wave + 1));
      }
    }
  }
}
