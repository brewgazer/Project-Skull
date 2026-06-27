// Level3Scene — "Factory"
// A horizontal industrial gauntlet built around environmental hazards:
// conveyor belts that shove you, spinning saw blades, hydraulic crushers and
// chains of explosive barrels. The reward is environmental kills — lure enemies
// onto a saw, into a crusher, or next to a barrel.

import { SCENES, TEX, PALETTE, GAME_HEIGHT } from '../config.js';
import { BaseLevelScene, GROUND_Y } from './BaseLevelScene.js';

export class Level3Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_3);
  }

  get levelNumber() { return 3; }
  get parTime() { return 110000; }
  get startWeapon() { return 'crowbar'; }
  get nextScene() { return SCENES.LEVEL_4; }

  buildLevel() {
    this.worldWidth = 2800;
    this.musicBpm = 152;

    this.addGround();

    // Overhead machinery silhouettes for depth.
    for (let x = 80; x < this.worldWidth; x += 200) {
      this.add.image(x, 0, TEX.PILLAR).setOrigin(0.5, 0).setDepth(-6).setTint(0x202228).setFlipY(true);
    }

    // --- opening: a conveyor introduces the push mechanic -----------------
    this.addConveyor(180, GROUND_Y - 4, 150, 1, 80);
    this.spawnEnemy('grunt', 300);
    this.setObjective('FACTORY FLOOR  -  USE THE MACHINES  -  LURE FOES INTO HAZARDS');

    // --- first saw blade + barrel combo ----------------------------------
    this.addMovingHazard(470, GROUND_Y - 18, TEX.SAWBLADE, {
      damage: 1, spin: 12, bodyScale: 0.7,
      patrol: { axis: 'x', range: 40, speed: 70 },
    });
    this.addDestructible(560, GROUND_Y, 'barrel');
    this.spawnEnemy('grunt', 600);
    this.spawnEnemy('runner', 640);
    this.addCheckpoint(700);

    // --- crusher corridor -------------------------------------------------
    this._addCrusher(820, 1400);
    this._addCrusher(980, 2200);
    this.addDestructible(900, GROUND_Y, 'crate');
    this.addDestructible(918, GROUND_Y, 'crate');
    this.spawnEnemy('brute', 1040);
    this.spawnPickup(1080, GROUND_Y - 30, 'heart');

    // --- conveyor over a pit of saws (the showpiece) ----------------------
    this.addConveyor(1180, GROUND_Y - 4, 220, 1, 110);
    for (let i = 0; i < 3; i++) {
      this.addMovingHazard(1230 + i * 70, GROUND_Y - 16, TEX.SAWBLADE, {
        damage: 1, spin: 14, bodyScale: 0.65,
        patrol: { axis: 'y', range: 14, speed: 40, dir: i % 2 ? 1 : -1 },
      });
    }
    this.spawnEnemy('runner', 1320);
    this.addCheckpoint(1460);

    // --- barrel chain reaction set-piece ---------------------------------
    this.addDestructible(1560, GROUND_Y, 'barrel');
    this.addDestructible(1590, GROUND_Y, 'barrel');
    this.addDestructible(1620, GROUND_Y, 'barrel');
    this.spawnEnemy('grunt', 1640);
    this.spawnEnemy('grunt', 1700);
    this.spawnEnemy('brute', 1760);

    // --- mixed gauntlet ---------------------------------------------------
    this.addConveyor(1880, GROUND_Y - 4, 160, -1, 90); // pushes back toward saws
    this._addCrusher(2000, 1600);
    this.addMovingHazard(2120, GROUND_Y - 18, TEX.SAWBLADE, {
      damage: 1, spin: 12, bodyScale: 0.7,
      patrol: { axis: 'x', range: 60, speed: 90 },
    });
    this.spawnEnemy('runner', 2180);
    this.spawnEnemy('grunt', 2240);
    this.spawnEnemy('brute', 2320);
    this.addDestructible(2260, GROUND_Y, 'barrel');
    this.addCheckpoint(2420);

    // --- final stretch to the exit ---------------------------------------
    this.spawnEnemy('grunt', 2520);
    this.spawnEnemy('runner', 2560);
    this.addExit(2760);

    this.time.delayedCall(6000, () => {
      if (!this.levelOver) this.setObjective('REACH THE LOADING BAY  ->');
    });
  }

  /** A hydraulic crusher: a heavy head that slams down on an interval and
   *  retreats. Lethal while descending; safe to dash under between slams. */
  _addCrusher(x, period) {
    const topY = 14;
    const head = this.addMovingHazard(x, topY, TEX.CRUSHER, { damage: 2, depth: 8 });
    head.body.setImmovable(true);
    // Animate via tween on Y, syncing the body each step.
    const slam = () => {
      if (!head.active || this.levelOver) return;
      this.tweens.add({
        targets: head,
        y: GROUND_Y - 11,
        duration: 180,
        ease: 'Quad.easeIn',
        onUpdate: () => head.body.reset(head.x, head.y),
        onComplete: () => {
          this.fx.shake(120, 0.01);
          this.particles.dustKick(head.x, GROUND_Y, 8);
          this.tweens.add({
            targets: head,
            y: topY,
            duration: 600,
            delay: 250,
            ease: 'Quad.easeOut',
            onUpdate: () => head.body.reset(head.x, head.y),
          });
        },
      });
    };
    this.time.addEvent({ delay: period, loop: true, startAt: Math.random() * period, callback: slam });
    // A warning pillar so the crusher reads clearly.
    this.add.rectangle(x, GROUND_Y, 30, GAME_HEIGHT, PALETTE.hazard, 0.05).setOrigin(0.5, 1).setDepth(-2);
  }
}
