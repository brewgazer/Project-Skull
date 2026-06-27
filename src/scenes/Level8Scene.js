// Level8Scene — "Warehouse"
// Pitch-black storage aisles lit only by the glow you carry. Forklifts trundle
// blindly through the dark, shipping containers form cover and high ground, and
// guards ambush from the shadows. The exit stays sealed until the final pile-up
// is cleared.

import { SCENES, TEX, PALETTE, GAME_HEIGHT } from '../config.js';
import { BaseLevelScene, GROUND_Y } from './BaseLevelScene.js';
import { audio } from '../systems/AudioManager.js';

export class Level8Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_8);
  }

  get levelNumber() { return 8; }
  get parTime() { return 120000; }
  get startWeapon() { return 'shotgun'; }
  get nextScene() { return SCENES.LEVEL_9; }

  buildLevel() {
    this.worldWidth = 2500;
    this.musicBpm = 150;
    this.ambushes = [];
    this.finalTriggered = false;
    this.canComplete = false; // exit sealed until the warehouse is cleared

    this.addGround();

    this.setObjective('WAREHOUSE  -  CLEAR IT OUT  -  THE LIGHTS ARE DEAD');

    // Containers: cover + high ground scattered through the aisles.
    this._container(360, GROUND_Y, 0);
    this._container(360, GROUND_Y - 36, 1); // stacked
    this._container(880, GROUND_Y, 0);
    this._container(1500, GROUND_Y, 0);
    this._container(1540, GROUND_Y - 36, 1);
    this._container(2080, GROUND_Y, 0);

    // Forklifts patrolling in the dark.
    this.addMovingHazard(680, GROUND_Y - 13, TEX.FORKLIFT, {
      damage: 1, patrol: { axis: 'x', range: 120, speed: 60 },
    });
    this.addMovingHazard(1760, GROUND_Y - 13, TEX.FORKLIFT, {
      damage: 1, patrol: { axis: 'x', range: 150, speed: 75 },
    });

    // Opening foes.
    this.spawnEnemy('guard', 320);
    this.spawnEnemy('grunt', 420);
    this.addCheckpoint(520);

    // --- ambush triggers --------------------------------------------------
    this._ambush(760, () => {
      this.spawnEnemy('guard', this.player.x + 120, GROUND_Y);
      this.spawnEnemy('runner', this.player.x - 90, GROUND_Y);
      this.spawnEnemy('grunt', this.player.x + 60, GROUND_Y);
    });
    this.spawnPickup(960, GROUND_Y - 30, 'heart');
    this.addCheckpoint(1080);

    this._ambush(1240, () => {
      this.spawnEnemy('guard', this.player.x + 130, GROUND_Y);
      this.spawnEnemy('guard', this.player.x - 110, GROUND_Y);
      this.spawnEnemy('brute', this.player.x + 70, GROUND_Y);
    });
    this.addDestructible(1340, GROUND_Y, 'barrel');
    this.addCheckpoint(1640);

    this._ambush(1820, () => {
      this.spawnEnemy('runner', this.player.x + 100, GROUND_Y);
      this.spawnEnemy('runner', this.player.x - 100, GROUND_Y);
      this.spawnEnemy('grunt', this.player.x + 40, GROUND_Y);
    });
    this.spawnPickup(1980, GROUND_Y - 30, 'heart');
    this.addCheckpoint(2160);

    // The sealed loading door at the far end.
    this.exitDoor = this.addExit(2420);
    this.exitDoor.setTint(0x445);

    // Carry-your-own-light darkness.
    this.enableDarkness(0.86, 1.0);
  }

  _container(x, y, tier) {
    this.add.image(x, y, TEX.CONTAINER).setOrigin(0.5, 1).setDepth(6 + tier);
    // Solid top surface to stand on.
    this.addLedge(x - 22, y - 36, 44, 6);
  }

  _ambush(x, spawnFn) {
    this.ambushes.push({ x, done: false, spawnFn });
  }

  onLevelUpdate() {
    const px = this.player.x;

    // Trigger ambushes as the player advances.
    for (const a of this.ambushes) {
      if (!a.done && px > a.x) {
        a.done = true;
        audio.play('bossRoar');
        this.fx.flash(PALETTE.blood, 0.25, 140);
        a.spawnFn();
      }
    }

    // Final pile-up at the loading door.
    if (!this.finalTriggered && px > 2200) {
      this.finalTriggered = true;
      this.setObjective('CLEAR THE LOADING BAY');
      for (let i = 0; i < 6; i++) {
        const t = i % 3 === 0 ? 'brute' : i % 2 === 0 ? 'guard' : 'runner';
        this.spawnEnemy(t, 2300 + (i % 3) * 40 + Math.random() * 30, GROUND_Y);
      }
    }

    // Unseal the exit once everything is dead.
    if (this.finalTriggered && !this.canComplete && this.enemiesRemaining <= 0) {
      this.canComplete = true;
      this.exitDoor.clearTint();
      this.fx.flash(0xffffff, 0.3, 200);
      this.setObjective('THE BAY IS CLEAR  -  GET OUT  ->');
    }
  }
}
