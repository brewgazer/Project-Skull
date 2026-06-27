// Level6Scene — "Construction Site"
// A half-built tower of scaffolding. Swinging crane loads and rising elevators
// move you between tiers while debris rains from above. Built around the moving
// platform + falling-hazard systems.

import { SCENES, TEX, PALETTE, GAME_HEIGHT } from '../config.js';
import { BaseLevelScene, GROUND_Y } from './BaseLevelScene.js';
import { randInt } from '../utils/math.js';

export class Level6Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_6);
  }

  get levelNumber() { return 6; }
  get parTime() { return 120000; }
  get startWeapon() { return 'nailgun'; }
  get nextScene() { return SCENES.LEVEL_7; }

  buildLevel() {
    this.worldWidth = 2700;
    this.musicBpm = 154;
    this.debris = [];
    this.debrisZones = [];

    this.addGround();

    // Skeletal girders in the background.
    for (let x = 60; x < this.worldWidth; x += 90) {
      this.add.rectangle(x, 0, 4, GAME_HEIGHT, PALETTE.rust, 0.12).setOrigin(0.5, 0).setDepth(-6);
    }

    this.setObjective('CONSTRUCTION SITE  -  MIND THE FALLING DEBRIS  -  RIDE THE LIFTS');

    // --- opening: scaffolding climb with a guard --------------------------
    this.spawnEnemy('grunt', 300);
    this.addLedge(360, GROUND_Y - 44, 90, 8);
    this.addLedge(470, GROUND_Y - 80, 90, 8);
    this.spawnPickup(500, GROUND_Y - 100, 'spark');
    this.addCheckpoint(560);

    // --- crane load: a horizontal moving platform over a debris zone ------
    this.addMover(720, GROUND_Y - 70, { axis: 'x', range: 110, speed: 55, texture: TEX.ELEVATOR });
    this._debrisZone(640, 900, 1400);
    this.spawnEnemy('grunt', 760);
    this.spawnEnemy('runner', 880);

    // --- elevator up to a scaffold tier -----------------------------------
    this.addMover(1080, GROUND_Y - 30, { axis: 'y', range: 56, speed: 34, texture: TEX.ELEVATOR });
    this.addLedge(1180, GROUND_Y - 86, 160, 8);
    this.spawnEnemy('brute', 1240, GROUND_Y - 86);
    this.spawnPickup(1320, GROUND_Y - 110, 'heart');
    this.addDestructible(1160, GROUND_Y, 'barrel');
    this.addCheckpoint(1420);

    // --- debris gauntlet --------------------------------------------------
    this._debrisZone(1500, 1900, 1100);
    this.spawnEnemy('grunt', 1560);
    this.spawnEnemy('runner', 1640);
    this.spawnEnemy('grunt', 1720);
    this.addLedge(1560, GROUND_Y - 50, 80, 8);
    this.addLedge(1700, GROUND_Y - 70, 80, 8);

    // --- swinging crane + final tier -------------------------------------
    this.addMover(2000, GROUND_Y - 60, { axis: 'x', range: 90, speed: 70, texture: TEX.ELEVATOR });
    this.spawnEnemy('brute', 2080);
    this.spawnEnemy('runner', 2160);
    this._debrisZone(1980, 2300, 1500);
    this.addCheckpoint(2360);

    this.spawnEnemy('grunt', 2460);
    this.spawnEnemy('grunt', 2520);
    this.addExit(2640);
  }

  /** Register a horizontal strip where debris periodically falls from the top. */
  _debrisZone(x1, x2, period) {
    const zone = { x1, x2, period, t: randInt(0, period) };
    this.debrisZones.push(zone);
    // Faint hazard tint above the zone so the threat reads.
    this.add.rectangle((x1 + x2) / 2, 0, x2 - x1, 14, PALETTE.hazard, 0.06).setOrigin(0.5, 0).setDepth(-2);
  }

  _dropDebris(x) {
    const d = this.addMovingHazard(x, 6, TEX.DEBRIS, { damage: 1, spin: randInt(-8, 8), gravity: true });
    d.setVelocityY(40);
    // Telegraph shadow on the ground.
    const shadow = this.add.ellipse(x, GROUND_Y - 2, 16, 5, 0x000000, 0.4).setDepth(7);
    d.shadow = shadow;
    this.debris.push(d);
  }

  onLevelUpdate(time, delta) {
    // Spawn debris on each zone's timer.
    for (const z of this.debrisZones) {
      z.t -= delta;
      if (z.t <= 0) {
        z.t = z.period * (0.6 + Math.random() * 0.8);
        this._dropDebris(randInt(z.x1, z.x2));
      }
    }
    // Land / clean up debris.
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      if (!d.active) { this.debris.splice(i, 1); continue; }
      if (d.y >= GROUND_Y - 4) {
        this.particles.dustKick(d.x, GROUND_Y, 6);
        this.fx.shake(60, 0.004);
        d.shadow?.destroy();
        d.destroy();
        this.debris.splice(i, 1);
      }
    }
  }
}
