// Level12Scene — "Military Research Facility" (EXPANSION, Levels 10-18)
// A combat-shooter side-scroller. The player wields a full-auto Assault Rifle
// and fights through soldier squads using a new COVER system: press E (or Down)
// next to a crate or steel barrel to duck behind it and trade fire. Enemy
// gunners can shoot the red explosive barrels littering the floor to blast you
// out of cover — so position carefully. New hazards: timed laser security grids
// and a blast-door gate. Mini-boss: the Prototype Security Android.

import { SCENES, TEX } from '../config.js';
import { BaseLevelScene, GROUND_Y } from './BaseLevelScene.js';

export class Level12Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_12);
  }

  get levelNumber() { return 12; }
  get parTime() { return 150000; }
  get startWeapon() { return 'ar'; }
  get nextScene() { return SCENES.LEVEL_13 || null; } // next chapter (falls back to victory)

  buildLevel() {
    this.worldWidth = 2960;

    // Per-mechanic state.
    this.lasers = [];
    this._laserPhase = true;
    this.gateOpen = false;
    this.gateTriggered = false;
    this.gateEnemies = [];
    this.finalTriggered = false;
    this.finalCleared = false;
    this.finalEnemies = [];

    // Exit is gated behind the final firefight.
    this.canComplete = false;

    this._buildFacilityBackdrop();
    this.addGround();

    // --- Segment 1: breach — learn cover + return fire ---
    this.player.setPosition(60, GROUND_Y);
    this.addCheckpoint(60);
    this._coverPair(250, 1);        // steel cover barrel + nearby explosive barrel
    this.addDestructible(300, GROUND_Y, 'crate');
    this.spawnEnemy('soldier', 520);

    // --- Segment 2: a two-man fire team behind their own cover ---
    this.addDestructible(640, GROUND_Y, 'crate');
    this._coverPair(700, 1);
    this.spawnEnemy('soldier', 880);
    this.addDestructible(840, GROUND_Y, 'barrel'); // explosive — shoot to clear them
    this.spawnEnemy('soldier', 980);

    // Elevated sniper nest — fires down into the lane.
    this.addLedge(1080, GROUND_Y - 54, 90, 8);
    this.spawnEnemy('soldier', 1120, GROUND_Y - 54);

    // --- Segment 3: laser security grid (timed) ---
    this._coverPair(1240, 1);
    this._laser(1340);
    this._laser(1400);
    this.spawnPickup(1380, GROUND_Y - 64, 'heart');

    // --- Segment 4: blast-door gate (clears on the squad firefight) ---
    this.addDestructible(1560, GROUND_Y, 'crate');
    this._coverPair(1620, 1);
    this._buildGate(1760);

    // --- Segment 5: open hangar firefight beyond the gate ---
    this.addDestructible(1900, GROUND_Y, 'crate');
    this._coverPair(1960, 1);
    this.addDestructible(2080, GROUND_Y, 'barrel');
    this._coverPair(2200, -1);

    // --- Segment 6: the lab — mini-boss android + escort ---
    this.spawnPickup(2380, GROUND_Y - 30, 'heart');
    this._coverPair(2440, 1);
    this.addExit(2900);

    this.setObjective('PRESS E TO TAKE COVER  -  RETURN FIRE \u2192');
  }

  // --- facility set dressing ----------------------------------------------

  _buildFacilityBackdrop() {
    // Steel back wall.
    this.add.rectangle(0, 0, this.worldWidth, GROUND_Y, 0x171b21, 1).setOrigin(0, 0).setDepth(-12);
    // Riveted wall panels.
    for (let x = 0; x < this.worldWidth; x += 96) {
      this.add.rectangle(x + 2, 18, 90, 96, 0x1f242c, 1).setOrigin(0, 0).setDepth(-11);
      this.add.rectangle(x + 2, 18, 90, 2, 0x2c333d, 1).setOrigin(0, 0).setDepth(-10);
    }
    // Server racks / lab glass with a soft glow.
    for (let x = 60; x < this.worldWidth; x += 240) {
      this.add.rectangle(x, 40, 46, 70, 0x0c1014, 1).setOrigin(0, 0).setDepth(-10);
      this.add.rectangle(x + 4, 46, 38, 8, 0x2bd6c0, 0.25).setOrigin(0, 0).setDepth(-9);
      this.add.rectangle(x + 4, 60, 38, 4, 0xff9a3c, 0.2).setOrigin(0, 0).setDepth(-9);
    }
    // Hazard chevrons along the floor line.
    for (let x = 0; x < this.worldWidth; x += 24) {
      this.add.rectangle(x, GROUND_Y - 2, 12, 3, 0xd8b13a, 0.5).setOrigin(0, 0).setDepth(-8);
    }
  }

  // --- cover + barrels -----------------------------------------------------

  /** A steel cover barrel with an explosive barrel placed close enough that an
   *  enemy can detonate it to flush the player out of cover. `side` (+1/-1) puts
   *  the explosive barrel ahead of or behind the cover. */
  _coverPair(x, side = 1) {
    this.addDestructible(x, GROUND_Y, 'coverbarrel');
    this.addDestructible(x + side * 44, GROUND_Y, 'barrel');
  }

  // --- laser security grid -------------------------------------------------

  _laser(x, h = 104) {
    const beam = this.add.rectangle(x, GROUND_Y, 4, h, 0xff3b3b, 0.85).setOrigin(0.5, 1).setDepth(9);
    this.add.rectangle(x, GROUND_Y - h, 9, 5, 0x3a3f48, 1).setDepth(9);     // top emitter
    this.add.rectangle(x, GROUND_Y, 9, 4, 0x3a3f48, 1).setOrigin(0.5, 1).setDepth(9); // base
    const hz = this.addHazard(x, GROUND_Y - h / 2, 6, h, { texture: TEX.PIXEL, tint: 0xff3b3b, damage: 1 });
    this.lasers.push({ beam, hz, x });
  }

  _setLaser(l, on) {
    l.hz.body.enable = on;
    l.beam.setAlpha(on ? 0.85 : 0.1);
  }

  // --- blast-door gate -----------------------------------------------------

  _buildGate(x) {
    this.gateX = x;
    this.gate = this.add.rectangle(x, GROUND_Y, 20, 104, 0x2a2f38, 1).setOrigin(0.5, 1).setDepth(7);
    for (let i = 0; i < 5; i++) {
      this.add.rectangle(x - 7 + i * 3.2, GROUND_Y - 100, 2, 100, 0x444b56, 1).setOrigin(0.5, 0).setDepth(8);
    }
    this.add.rectangle(x, GROUND_Y - 52, 16, 6, 0xff9a3c, 0.8).setDepth(9); // warning light
    this.gateBody = this.platforms.create(x, GROUND_Y - 52, TEX.PIXEL);
    this.gateBody.setVisible(false).setDisplaySize(20, 104).refreshBody();
  }

  _openGate() {
    if (this.gateOpen) return;
    this.gateOpen = true;
    this.gateBody.destroy();
    this.tweens.add({ targets: this.gate, y: GROUND_Y - 108, alpha: 0.3, duration: 700, ease: 'Cubic.easeIn' });
    this.fx.shake(180, 0.007);
    this.setObjective('BLAST DOOR OPEN  -  PUSH INTO THE HANGAR \u2192');
  }

  // --- per-frame -----------------------------------------------------------

  onLevelUpdate(time, delta) {
    const px = this.player.x;

    // Laser grid: alternate the two beams so the player threads through one
    // lane at a time. Phase flips on a steady cadence.
    if (this.lasers.length) {
      const phase = Math.floor(time / 900) % 2 === 0;
      if (phase !== this._laserPhase) {
        this._laserPhase = phase;
        this.lasers.forEach((l, i) => this._setLaser(l, (i % 2 === 0) === phase));
      }
    }

    // Blast-door squad: trigger when the player nears the gate.
    if (!this.gateTriggered && px > 1560) {
      this.gateTriggered = true;
      this.setObjective('FIRE TEAM  -  CLEAR THE SQUAD');
      this.spawnTracked(this.gateEnemies, 'soldier', 1640);
      this.spawnTracked(this.gateEnemies, 'soldier', 1700);
      this.spawnTracked(this.gateEnemies, 'commando', 1730);
    }
    if (this.gateTriggered && !this.gateOpen && this.waveCleared(this.gateEnemies)) {
      this._openGate();
    }

    // Final lab fight — the Prototype Security Android gates the exit.
    if (!this.finalTriggered && px > 2480) {
      this.finalTriggered = true;
      this.setObjective('PROTOTYPE SECURITY ANDROID  -  DESTROY IT');
      this.spawnTracked(this.finalEnemies, 'android', 2680);
      this.spawnTracked(this.finalEnemies, 'soldier', 2600);
      this.spawnTracked(this.finalEnemies, 'soldier', 2760);
    }
    if (this.finalTriggered && !this.finalCleared && this.waveCleared(this.finalEnemies)) {
      this.finalCleared = true;
      this.canComplete = true;
      this.setObjective('FACILITY SECURED  -  EXTRACT \u2192');
      this.spawnPickup(this.player.x, GROUND_Y - 30, 'heart');
    }
  }
}
