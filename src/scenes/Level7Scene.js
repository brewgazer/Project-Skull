// Level7Scene — "Subway"
// A crowded underground platform. Trains scream through on a telegraph, smashing
// anything on the line — time your jumps, and bat the crowd into the path of an
// incoming train for spectacular environmental executions.

import { SCENES, TEX, PALETTE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { BaseLevelScene, GROUND_Y } from './BaseLevelScene.js';
import { audio } from '../systems/AudioManager.js';

export class Level7Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_7);
  }

  get levelNumber() { return 7; }
  get parTime() { return 115000; }
  get startWeapon() { return 'pipe'; }
  get nextScene() { return SCENES.LEVEL_8; }

  buildLevel() {
    this.worldWidth = 2500;
    this.musicBpm = 158;
    this.trainWarning = null;

    this.addGround();

    // Tiled tunnel + the live third rail running along the platform edge.
    for (let x = 40; x < this.worldWidth; x += 80) {
      this.add.rectangle(x, GROUND_Y - 70, 50, 40, 0x14161c, 0.6).setDepth(-6); // tiling
    }
    // Dangerous track: a thin electrified rail at the platform lip. Stepping
    // onto it (crouch-walking the very edge) shocks you.
    this.add.rectangle(0, GROUND_Y + 2, this.worldWidth, 4, 0x7fd0ff, 0.5).setOrigin(0, 0).setDepth(7);

    this.setObjective('SUBWAY  -  TRAINS KILL  -  KNOCK ENEMIES INTO THE TRACKS');

    // --- the crowd (waves of fodder) + a few tougher commuters ------------
    this.spawnEnemy('grunt', 300);
    this.spawnEnemy('grunt', 360);
    this.spawnEnemy('runner', 440);
    this.addCheckpoint(520);

    this.spawnEnemy('grunt', 640);
    this.spawnEnemy('grunt', 700);
    this.spawnEnemy('runner', 760);
    this.spawnEnemy('brute', 860);
    this.spawnPickup(900, GROUND_Y - 30, 'heart');
    this.addCheckpoint(1000);

    this.spawnEnemy('grunt', 1140);
    this.spawnEnemy('runner', 1200);
    this.spawnEnemy('grunt', 1260);
    this.spawnEnemy('grunt', 1320);
    this.addCheckpoint(1480);

    this.spawnEnemy('brute', 1620);
    this.spawnEnemy('runner', 1680);
    this.spawnEnemy('grunt', 1740);
    this.spawnEnemy('grunt', 1800);
    this.spawnPickup(1880, GROUND_Y - 30, 'heart');
    this.addCheckpoint(2000);

    this.spawnEnemy('grunt', 2120);
    this.spawnEnemy('runner', 2180);
    this.spawnEnemy('brute', 2260);
    this.addExit(2420);

    // Trains kill enemies caught on the line — the environmental-execution hook.
    this.physics.add.overlap(this.hazards, this.enemies, (train, en) => {
      if (!train.isTrain || !en.active || en.dead) return;
      en.takeHit(999, 700, Math.sign(en.x - train.x) || 1, { gib: true, environmental: true });
      this.scoreSystem.award('environmentalKill', { x: en.x, y: en.y - 16 });
    });

    // Schedule recurring trains.
    this.time.addEvent({ delay: 5200, loop: true, startAt: 2600, callback: () => this._telegraphTrain() });
  }

  _telegraphTrain() {
    if (this.levelOver) return;
    audio.play('bossRoar');
    this.fx.shake(700, 0.006);
    // Flash a warning banner.
    const cam = this.cameras.main;
    const warn = this.add
      .text(cam.scrollX + GAME_WIDTH / 2, 30, '! TRAIN INCOMING !', {
        fontFamily: 'monospace', fontSize: '12px', color: '#ff3b4c',
        stroke: '#000', strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(800);
    this.tweens.add({ targets: warn, alpha: 0.2, yoyo: true, repeat: 3, duration: 200, onComplete: () => warn.destroy() });
    this.time.delayedCall(1000, () => this._spawnTrain());
  }

  _spawnTrain() {
    if (this.levelOver) return;
    const cam = this.cameras.main;
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? cam.scrollX - 60 : cam.scrollX + GAME_WIDTH + 60;
    const dir = fromLeft ? 1 : -1;
    const train = this.addMovingHazard(x, GROUND_Y - 22, TEX.TRAIN, { damage: 1, depth: 20, bodyScale: 0.8 });
    train.isTrain = true;
    train.setFlipX(dir < 0);
    train.setVelocityX(dir * 260);
    audio.play('explosion');
    // Despawn once it has fully crossed the view.
    this.time.delayedCall(4000, () => train.active && train.destroy());
  }
}
