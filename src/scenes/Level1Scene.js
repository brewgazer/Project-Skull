// Level1Scene — "Chainsaw Rampage"
// Teaches movement, combat, executions and destruction across a derelict
// office floor, building to a fight with the Foreman mini-boss.

import { SCENES, TEX, PALETTE } from '../config.js';
import { BaseLevelScene, GROUND_Y } from './BaseLevelScene.js';
import { audio } from '../systems/AudioManager.js';

export class Level1Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_1);
  }

  get levelNumber() { return 1; }
  get parTime() { return 105000; }
  get startWeapon() { return 'chainsaw'; }
  get nextScene() { return SCENES.LEVEL_2; }

  buildLevel() {
    this.worldWidth = 2600;
    this.musicBpm = 146;
    this.bossTriggered = false;
    this.bossDefeated = false;
    this.exitSpawned = false;
    this.boss = null;

    this.addGround();

    // Background pillars for depth.
    for (let x = 120; x < this.worldWidth; x += 260) {
      this.add.image(x, GROUND_Y, TEX.PILLAR).setOrigin(0.5, 1).setDepth(-5).setTint(0x2a2c33);
    }

    // --- opening: teach destruction -------------------------------------
    this.addDestructible(150, GROUND_Y, 'crate');
    this.addDestructible(168, GROUND_Y, 'crate');
    this.addDestructible(210, GROUND_Y, 'crate');

    // --- first foes ------------------------------------------------------
    this.spawnEnemy('grunt', 360);
    this.spawnEnemy('grunt', 430);

    // --- explosive set-piece (environmental kills) ----------------------
    this.addDestructible(610, GROUND_Y, 'barrel');
    this.addDestructible(640, GROUND_Y, 'barrel');
    this.spawnEnemy('grunt', 600);
    this.spawnEnemy('grunt', 660);
    this.addCheckpoint(720);

    // --- furniture corridor + a runner ----------------------------------
    this.addDestructible(820, GROUND_Y, 'crate');
    this.addDestructible(838, GROUND_Y, 'crate');
    this.addDestructible(856, GROUND_Y, 'crate');
    this.spawnEnemy('runner', 960);
    this.spawnEnemy('grunt', 1020);

    // --- first bruiser ---------------------------------------------------
    this.spawnEnemy('brute', 1240);
    this.addDestructible(1180, GROUND_Y, 'barrel');
    this.spawnPickup(1300, GROUND_Y - 30, 'heart');
    this.addCheckpoint(1340);

    // --- mixed mob -------------------------------------------------------
    this.spawnEnemy('grunt', 1500);
    this.spawnEnemy('runner', 1560);
    this.spawnEnemy('grunt', 1620);
    this.spawnEnemy('brute', 1720);
    this.addDestructible(1500, GROUND_Y, 'crate');
    this.addDestructible(1660, GROUND_Y, 'barrel');

    // --- approach to the arena ------------------------------------------
    this.spawnEnemy('runner', 1900);
    this.spawnEnemy('grunt', 1960);
    this.addCheckpoint(1980);

    // Arena props.
    this.add.image(2580, GROUND_Y, TEX.PILLAR).setOrigin(0.5, 1).setDepth(-5);

    this.setObjective('SHRED EVERYTHING  -  HOLD J TO REV  -  K TO EXECUTE');
    this.time.delayedCall(5000, () => this.setObjective('REACH THE FOREMAN  ->'));
  }

  /** Brief cinematic: pan to the boss so the player sees the threat, then
   *  return control. Player is held in place during the intro so they can't be
   *  hit by an off-screen charge. */
  _introBoss() {
    const cam = this.cameras.main;
    cam.stopFollow();
    this.player.setVelocity(0, 0);
    this.player.canAct = false; // gate input during the intro
    this.player.invuln = 1500; // no cheap hits during the cinematic
    cam.pan(this.boss.x, GROUND_Y - 30, 900, 'Sine.easeInOut');
    this.fx.zoomTo(1.08, 900);
    this.time.delayedCall(1300, () => {
      cam.startFollow(this.player, true, 0.12, 0.12);
      this.player.canAct = true;
    });
  }

  onEnemyKilled(info) {
    if (info.isBoss) {
      this.bossDefeated = true;
      this.setObjective('THE FOREMAN IS DOWN  -  ESCAPE  ->');
      // Reward + dramatic beat.
      this.fx.zoomPunch(0.15);
      this.spawnPickup(info.x, info.y - 10, 'heart');
    }
  }

  onLevelUpdate(time, delta) {
    const px = this.player.x;

    // Trigger the boss encounter.
    if (!this.bossTriggered && px > 2080) {
      this.bossTriggered = true;
      this.setObjective('SURVIVE THE FOREMAN');
      this.boss = this.spawnEnemy('miniboss', 2360);
      this.spawnEnemy('grunt', 2300);
      this.spawnEnemy('grunt', 2460);
      audio.setMusicIntensity(0.9);
      this._introBoss();
    }

    // Boss phase transition at half health.
    if (this.boss && this.boss.active && !this.boss.dead) {
      if (this.boss.phase < 2 && this.boss.hp <= this.boss.maxHp * 0.5) {
        this.boss.enterPhase(2);
        this.spawnEnemy('runner', this.player.x - 80);
        this.spawnEnemy('runner', this.player.x + 80);
      }
    }

    // Spawn the exit once the boss is dead, then watch for the player to leave.
    if (this.bossDefeated && !this.exitSpawned) {
      this.exitSpawned = true;
      this.fx.zoomTo(1, 800);
      this.exit = this.physics.add.image(2560, GROUND_Y - 20, TEX.DOOR).setOrigin(0.5, 1);
      this.exit.body.setAllowGravity(false);
      this.physics.add.overlap(this.player, this.exit, () => this.completeLevel());
    }
  }
}
