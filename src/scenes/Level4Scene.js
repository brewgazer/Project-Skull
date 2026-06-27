// Level4Scene — "Laboratory"
// A sterile research wing gone wrong. Scientists flee and lash out, guards hold
// the line, and broken containment tubes loose mutated experiments. Periodic
// power outages plunge the wing into darkness and energize the floor grates —
// electrical hazards that only bite while the lights are out.

import { SCENES, TEX, PALETTE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { BaseLevelScene, GROUND_Y } from './BaseLevelScene.js';
import { audio } from '../systems/AudioManager.js';

export class Level4Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_4);
  }

  get levelNumber() { return 4; }
  get parTime() { return 115000; }
  get startWeapon() { return 'pipe'; }
  get nextScene() { return SCENES.LEVEL_5; }

  buildLevel() {
    this.worldWidth = 2600;
    this.musicBpm = 150;
    this.powerOut = false;
    this.electricNodes = [];

    this.addGround();

    // Glowing containment tubes line the back wall.
    for (let x = 120; x < this.worldWidth; x += 150) {
      this.add.rectangle(x, GROUND_Y, 10, 60, 0x6dd400, 0.12).setOrigin(0.5, 1).setDepth(-4);
    }

    // --- intro: scientists -----------------------------------------------
    this.spawnEnemy('scientist', 320);
    this.spawnEnemy('scientist', 380);
    this.setObjective('LABORATORY  -  LIGHTS FAIL AND THE GRATES GO LIVE  -  KEEP MOVING');

    // Electrified floor grates (dormant until an outage).
    this._addGrate(520, 60);
    this._addGrate(900, 80);
    this._addGrate(1500, 100);
    this._addGrate(1980, 80);
    this._addGrate(2300, 60);

    // --- guards + a containment tube -------------------------------------
    this.spawnEnemy('guard', 640);
    this.spawnEnemy('scientist', 700);
    this.addCheckpoint(760);
    this._addTube(840, 'mutant');

    // --- mid section: mixed forces ---------------------------------------
    this.spawnEnemy('guard', 1080);
    this.spawnEnemy('guard', 1140);
    this.addDestructible(1040, GROUND_Y, 'barrel');
    this.spawnPickup(1200, GROUND_Y - 30, 'heart');
    this.addCheckpoint(1320);

    this._addTube(1420, 'mutant');
    this.spawnEnemy('scientist', 1560);
    this.spawnEnemy('mutant', 1640);
    this.spawnEnemy('guard', 1720);

    // --- final wing ------------------------------------------------------
    this._addTube(1900, 'mutant');
    this._addTube(1960, 'mutant');
    this.spawnEnemy('guard', 2080);
    this.spawnEnemy('mutant', 2160);
    this.addCheckpoint(2240);
    this.spawnEnemy('guard', 2360);
    this.spawnEnemy('scientist', 2420);

    this.addExit(2540);

    // Drive the power-outage cycle.
    this.time.addEvent({ delay: 7000, loop: true, startAt: 3500, callback: () => this._togglePower() });
  }

  /** A live floor grate. Visible + damaging only during a power outage. */
  _addGrate(x, w) {
    const node = this.addHazard(x, GROUND_Y - 2, w, 6, {
      damage: 1, texture: TEX.ELECTRIC, tint: 0x7fd0ff, depth: 9,
    });
    node.setDisplaySize(w, 10);
    node.refreshBody();
    node.body.enable = false;
    node.setVisible(false);
    node.baseX = x;
    node.baseW = w;
    this.electricNodes.push(node);
    return node;
  }

  /** A containment tube; when the player nears it, it shatters and releases an
   *  experiment. Reads as the "mutated experiments" beat. */
  _addTube(x, type) {
    const tube = this.add.rectangle(x, GROUND_Y, 16, 46, 0x6dd400, 0.22).setOrigin(0.5, 1).setDepth(4);
    tube.setStrokeStyle(1, 0x9aff4a, 0.6);
    tube.released = false;
    tube.x0 = x;
    tube.type = type;
    (this.tubes ||= []).push(tube);
  }

  _togglePower() {
    if (this.levelOver) return;
    this.powerOut = !this.powerOut;
    if (this.powerOut) {
      audio.play('hurt');
      this.fx.flash(0x000000, 0.6, 120);
      if (!this.darkness) {
        this.darkness = this.add
          .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x02030a, 0)
          .setOrigin(0, 0).setScrollFactor(0).setDepth(880);
      }
      this.tweens.add({ targets: this.darkness, alpha: 0.72, duration: 300 });
      // Energize the grates.
      this.electricNodes.forEach((n) => {
        n.body.enable = true;
        n.setVisible(true);
      });
      // Things attack under cover of darkness.
      this.spawnEnemy('mutant', this.player.x + 130);
    } else {
      if (this.darkness) this.tweens.add({ targets: this.darkness, alpha: 0, duration: 400 });
      this.electricNodes.forEach((n) => {
        n.body.enable = false;
        n.setVisible(false);
      });
    }
  }

  onLevelUpdate() {
    // Flicker the live grates for menace.
    if (this.powerOut) {
      this.electricNodes.forEach((n) => n.setAlpha(Math.random() < 0.5 ? 0.9 : 0.4));
    }
    // Shatter nearby containment tubes.
    if (this.tubes) {
      for (const t of this.tubes) {
        if (!t.released && Math.abs(this.player.x - t.x0) < 70) {
          t.released = true;
          this.particles.sparkBurst(t.x0, GROUND_Y - 24, 10);
          this.particles.smokePuff(t.x0, GROUND_Y - 24, 4);
          audio.play('crateBreak');
          this.fx.shake(120, 0.008);
          this.tweens.add({ targets: t, alpha: 0, duration: 200, onComplete: () => t.destroy() });
          this.spawnEnemy(t.type, t.x0);
        }
      }
    }
  }
}
