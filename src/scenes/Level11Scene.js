// Level11Scene — "Chemical Processing Plant" (EXPANSION)
// Leaking hazards everywhere: acid pools, drifting toxic gas, rotating
// machinery, and a stair-stepped catwalk crossing over an acid moat. Introduces
// the Molotov Cocktail (start loadout) and the Cryo Sprayer (prep rooms /
// future pickups). Enemies: chemical workers, hazmat security, cleanup robots.

import { SCENES, TEX, PALETTE } from '../config.js';
import { BaseLevelScene, GROUND_Y } from './BaseLevelScene.js';
import { randInt } from '../utils/math.js';

export class Level11Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_11);
  }

  get levelNumber() { return 11; }
  get parTime() { return 140000; }
  get startWeapon() { return 'molotov'; }
  get nextScene() { return SCENES.LEVEL_12; }

  buildLevel() {
    this.worldWidth = 2640;
    this.gasClouds = [];
    this.finalTriggered = false;
    this.finalCleared = false;
    this.finalEnemies = [];
    this.canComplete = false;

    this._buildPlantBackdrop();
    this.addGround();

    // --- Segment 1: control floor — workers + hazmat ---
    this.player.setPosition(60, GROUND_Y);
    this.addCheckpoint(60);
    this.spawnEnemy('scientist', 250);
    this.spawnEnemy('hazmat', 340);

    // --- Segment 2: acid spills to hop ---
    this._acid(470, 70);
    this._acid(600, 60);
    this.addDestructible(700, GROUND_Y, 'barrel');

    // --- Segment 3: rotating machinery corridor ---
    this._sawblade(900, GROUND_Y - 40, 'y', 34);
    this._sawblade(1010, GROUND_Y - 70, 'y', 40);
    this.spawnEnemy('cleanbot', 1080);

    // --- Segment 4: venting toxic gas ---
    // Each cloud rises and settles on its own grate (staggered), so there's a
    // clear ground lane to slip under when it lifts. A safe pocket sits between
    // them. (A dash's i-frames also carry you through unharmed.)
    this._gasCloud(1200, 1);
    this._gasCloud(1440, -1);
    this.spawnEnemy('hazmat', 1320); // waits in the safe pocket between vents
    this.spawnEnemy('scientist', 1490);

    // --- Segment 5: acid moat crossed by gentle stair-step catwalks ---
    // The player's max jump is ~54px, so each step is a small, comfortable hop:
    // ground -> 18px step -> 36px crossing (over the acid) -> 18px step -> down.
    this._acid(1660, 175); // moat on the floor (~1572-1748)
    this.addLedge(1500, GROUND_Y - 18, 48, 8); // step up
    this.addLedge(1555, GROUND_Y - 36, 210, 8); // crossing above the acid
    this.addLedge(1770, GROUND_Y - 18, 48, 8); // step down
    this.spawnPickup(1660, GROUND_Y - 60, 'heart');

    // --- Segment 6: reactor floor — final fight then the exit ---
    this.spawnPickup(2180, GROUND_Y - 30, 'heart');
    this.addExit(2580);

    this.setObjective('CONTAINMENT BREACH  -  REACH THE REACTOR \u2192');
  }

  // --- set dressing --------------------------------------------------------

  _buildPlantBackdrop() {
    this.add.rectangle(0, 0, this.worldWidth, GROUND_Y, 0x10160f, 1).setOrigin(0, 0).setDepth(-12);
    // Storage tanks + pipework.
    for (let x = 40; x < this.worldWidth; x += 150) {
      const th = randInt(60, 100);
      this.add.rectangle(x, GROUND_Y, 46, th, 0x1b2a18, 1).setOrigin(0.5, 1).setDepth(-11);
      this.add.rectangle(x, GROUND_Y - th, 46, 4, 0x2e4327, 1).setOrigin(0.5, 1).setDepth(-10);
      this.add.rectangle(x, GROUND_Y - th * 0.5, 46, 3, PALETTE.toxic, 0.25).setOrigin(0.5, 1).setDepth(-10);
    }
    for (let x = 0; x < this.worldWidth; x += 90) {
      this.add.rectangle(x, 24, 6, GROUND_Y - 24, 0x223018, 0.6).setOrigin(0.5, 0).setDepth(-10); // vertical pipes
    }
  }

  // --- hazards -------------------------------------------------------------

  _acid(x, w) {
    const pool = this.addHazard(x, GROUND_Y - 4, w, 8, { tint: PALETTE.toxic, damage: 1 });
    pool.setAlpha(0.85);
    // Bubbling surface accents.
    for (let i = 0; i < w; i += 14) {
      this.add.rectangle(x - w / 2 + i + 6, GROUND_Y - 6, 4, 3, 0x9aff4a, 0.5).setDepth(9);
    }
    return pool;
  }

  _sawblade(x, y, axis, range) {
    return this.addMovingHazard(x, y, TEX.SAWBLADE, {
      damage: 1, spin: 12, patrol: { axis, range, speed: 60 },
    });
  }

  _gasCloud(x, dir = 1) {
    // Vertical vent: the cloud bobs between head-height (lane clear) and the
    // floor (lane blocked), so there's a generous, readable window to pass.
    const centerY = GROUND_Y - 40;
    const c = this.addMovingHazard(x, centerY, TEX.SMOKE, {
      damage: 1, patrol: { axis: 'y', range: 22, speed: 26, dir },
    });
    c.setTint(PALETTE.toxic).setAlpha(0.5).setScale(2.6);
    c.body.setSize(22, 18);
    this.tweens.add({ targets: c, alpha: { from: 0.32, to: 0.58 }, yoyo: true, repeat: -1, duration: 700 });
    // A faint grate marks where the gas vents from.
    this.add.rectangle(x, GROUND_Y, 26, 4, 0x3a4327, 1).setOrigin(0.5, 1).setDepth(9);
    this.gasClouds.push(c);
    return c;
  }

  // --- per-frame -----------------------------------------------------------

  onLevelUpdate(time, delta) {
    const p = this.player;
    const px = p.x;

    // Final reactor fight gates the exit.
    if (!this.finalTriggered && px > 2240) {
      this.finalTriggered = true;
      this.setObjective('REACTOR FLOOR  -  CLEAR IT TO VENT THE BREACH');
      this.spawnTracked(this.finalEnemies, 'cleanbot', 2360);
      this.spawnTracked(this.finalEnemies, 'hazmat', 2300);
      this.spawnTracked(this.finalEnemies, 'hazmat', 2440);
      this.spawnTracked(this.finalEnemies, 'scientist', 2480);
    }
    if (this.finalTriggered && !this.finalCleared && this.waveCleared(this.finalEnemies)) {
      this.finalCleared = true;
      this.canComplete = true;
      this.setObjective('BREACH CONTAINED  -  ESCAPE \u2192');
      this.spawnPickup(px, GROUND_Y - 30, 'heart');
    }
  }
}
