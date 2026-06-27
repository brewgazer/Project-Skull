// Level9Scene — "Corporate Headquarters" (FINAL LEVEL)
// A penthouse boardroom showdown with THE CHAIRMAN, an original three-phase
// boss. Each phase changes the rules: a measured duel, a guarded onslaught, and
// a desperate, glass-shattering last stand. Defeat him to finish the game.

import { SCENES, TEX, PALETTE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { BaseLevelScene, GROUND_Y } from './BaseLevelScene.js';
import { audio } from '../systems/AudioManager.js';
import { touch } from '../systems/touch.js';
import { Menu } from '../ui/Menu.js';
import { WEAPONS, WEAPON_ORDER } from '../data/weapons.js';
import { randInt } from '../utils/math.js';

// Short blurbs to help the player pick a tool for the final fight.
const WEAPON_BLURB = {
  chainsaw: 'shred - hold to grind',
  bat: 'big knockback swings',
  crowbar: 'fast, balanced',
  pipe: 'fast, solid knockback',
  fireaxe: 'slow but huge damage',
  shotgun: 'ranged - point blank burst',
  nailgun: 'ranged - rapid fire',
  revolver: 'ranged - heavy single shot',
  arccutter: 'ranged - chains between foes',
  molotov: 'thrown - pool of fire',
  cryo: 'freeze foes, then shatter',
  ar: 'full-auto - hold to spray',
};

export class Level9Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_9);
  }

  get levelNumber() { return 9; }
  get parTime() { return 150000; }
  get startWeapon() { return 'fireaxe'; }
  get nextScene() { return SCENES.LEVEL_10; } // the campaign continues into the expansion

  buildLevel() {
    this.worldWidth = 1000;
    this.musicBpm = 162;
    this.phase = 1;
    this.bossTriggered = false;
    this.bossDefeated = false;
    this.escapeReady = false;
    this.boss = null;
    this.debris = [];

    this.addGround();

    // Penthouse backdrop: city skyline through a wall of windows.
    this.add.rectangle(0, 0, this.worldWidth, GROUND_Y, 0x0a1020, 1).setOrigin(0, 0).setDepth(-12);
    for (let x = 30; x < this.worldWidth; x += 26) {
      const hgt = randInt(30, 110);
      this.add.rectangle(x, GROUND_Y, 16, hgt, 0x141d33, 1).setOrigin(0.5, 1).setDepth(-11);
      if (Math.random() < 0.5) this.add.rectangle(x, GROUND_Y - hgt + 8, 16, 4, 0xf2c200, 0.25).setOrigin(0.5, 1).setDepth(-10);
    }
    for (let x = 0; x < this.worldWidth; x += 60) {
      this.add.rectangle(x, 0, 2, GROUND_Y, 0x0a0a10, 0.5).setOrigin(0.5, 0).setDepth(-9); // mullions
    }

    // Cover: a long boardroom table + barrels for environmental kills.
    this.addLedge(420, GROUND_Y - 24, 150, 6);
    this.add.rectangle(495, GROUND_Y, 150, 24, 0x2a1d24, 1).setOrigin(0.5, 1).setDepth(5);
    this.addDestructible(300, GROUND_Y, 'barrel');
    this.addDestructible(720, GROUND_Y, 'barrel');

    // Player starts on the left; arena trigger sits to the right.
    this.player.setPosition(80, GROUND_Y);
    this.addCheckpoint(80);

    this.setObjective('TOP FLOOR  -  END THIS');
  }

  create() {
    super.create();
    // Let the player choose how to face the boss — the fire axe is brutal but
    // not for everyone.
    this._showWeaponSelect();
  }

  /** Pre-fight loadout screen. Freezes the player until a weapon is chosen. */
  _showWeaponSelect() {
    const cx = GAME_WIDTH / 2;
    this._weaponChosen = false;
    this.player.canAct = false;
    this.player.setVelocity(0, 0);
    touch.setGameplay(false); // hide on-screen sticks while choosing

    const ui = [];
    const fix = (o, depth) => o.setScrollFactor(0).setDepth(depth);
    ui.push(fix(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82).setOrigin(0), 200));
    ui.push(fix(this.add.text(cx, 24, 'CHOOSE YOUR WEAPON', {
      fontFamily: 'monospace', fontSize: '12px', color: '#e8e0cf',
      stroke: '#b3001b', strokeThickness: 2,
    }).setOrigin(0.5), 201));
    ui.push(fix(this.add.text(cx, 38, 'THE CHAIRMAN AWAITS  -  tap or use ARROWS + ENTER', {
      fontFamily: 'monospace', fontSize: '7px', color: '#8c8f98',
    }).setOrigin(0.5), 201));

    const menu = new Menu(this, {
      x: cx, y: 56, spacing: 16, align: 'center', fontSize: 9,
      items: WEAPON_ORDER.map((id) => ({
        label: `${WEAPONS[id].name}  -  ${WEAPON_BLURB[id] || ''}`,
        onSelect: () => this._pickWeapon(id, ui, menu),
      })),
    });
    menu.texts.forEach((t) => t.setScrollFactor(0).setDepth(201));
    this._weaponMenu = menu;
  }

  _pickWeapon(id, ui, menu) {
    if (this._weaponChosen) return;
    this._weaponChosen = true;

    // Swap the weapon, managing the chainsaw's looping engine.
    if (id === 'chainsaw') audio.startChainsaw();
    else if (this.player.weaponId === 'chainsaw') audio.stopChainsaw();
    this.player.setWeapon(id);

    // Tear down the overlay AFTER the menu's activate cycle finishes (its
    // internal refresh runs right after onSelect).
    this.time.delayedCall(0, () => {
      menu.destroy();
      ui.forEach((o) => o.destroy());
    });

    this.player.canAct = true;
    touch.setGameplay(true);
    this.setObjective('THE CHAIRMAN AWAITS  -  ADVANCE \u2192');
  }

  _introBoss() {
    const cam = this.cameras.main;
    cam.stopFollow();
    this.player.setVelocity(0, 0);
    this.player.canAct = false;
    this.player.invuln = 2000;
    cam.pan(this.boss.x, GROUND_Y - 40, 1100, 'Sine.easeInOut');
    this.fx.zoomTo(1.1, 1100);
    audio.setMusicIntensity(1);
    this.time.delayedCall(1600, () => {
      cam.startFollow(this.player, true, 0.12, 0.12);
      this.fx.zoomTo(1, 700);
      this.player.canAct = true;
      this.setObjective('THE CHAIRMAN  -  PHASE 1: THE DUEL');
    });
  }

  onEnemyKilled(info) {
    if (info.isBoss) {
      this.bossDefeated = true;
      this.setObjective('THE CHAIRMAN FALLS');
      this.fx.slowMo(0.3, 1200);
      this.fx.zoomPunch(0.2, 500);
      this.fx.flash(0xffffff, 0.7, 500);
      // Clear any remaining adds for a clean finish.
      this.enemies.getChildren().forEach((e) => {
        if (e.active && !e.dead && !e.isBoss) e.die({ gib: true });
      });
    }
  }

  onLevelUpdate(time, delta) {
    const px = this.player.x;

    // Start the fight when the player advances into the arena.
    if (!this.bossTriggered && px > 360) {
      this.bossTriggered = true;
      this.boss = this.spawnEnemy('chairman', 820);
      this._introBoss();
    }

    if (this.boss && this.boss.active && !this.boss.dead) {
      const frac = this.boss.hp / this.boss.maxHp;

      // Phase 2 at 66% — bring in the security detail.
      if (this.phase === 1 && frac <= 0.66) {
        this.phase = 2;
        this.boss.enterPhase(2);
        this.setObjective('PHASE 2: SECURITY DETAIL');
        this.spawnEnemy('guard', px - 90);
        this.spawnEnemy('guard', px + 110);
      }

      // Phase 3 at 33% — the glass breaks, debris rains, experiments loosed.
      if (this.phase === 2 && frac <= 0.33) {
        this.phase = 3;
        this.boss.enterPhase(3);
        this.setObjective('PHASE 3: NO WAY OUT');
        this.fx.flash(0x7fd0ff, 0.5, 300);
        this.spawnEnemy('mutant', px - 70);
        this.spawnEnemy('mutant', px + 90);
        // Begin raining debris from the shattered ceiling.
        this.debrisTimer = this.time.addEvent({
          delay: 1400, loop: true,
          callback: () => {
            if (this.boss?.active && !this.boss.dead) {
              this._dropDebris(randInt(this.cameras.main.scrollX + 20, this.cameras.main.scrollX + GAME_WIDTH - 20));
            }
          },
        });
      }
    }

    // Clean up fallen debris.
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      if (!d.active) { this.debris.splice(i, 1); continue; }
      if (d.y >= GROUND_Y - 4) {
        this.particles.dustKick(d.x, GROUND_Y, 6);
        this.fx.shake(70, 0.005);
        d.destroy();
        this.debris.splice(i, 1);
      }
    }

    // Once the boss is down, drop the exit and let the player leave.
    if (this.bossDefeated && !this.escapeReady) {
      this.escapeReady = true;
      if (this.debrisTimer) this.debrisTimer.remove();
      this.time.delayedCall(1400, () => {
        this.setObjective('ESCAPE  ->');
        this.addExit(940);
        this.spawnPickup(this.player.x, GROUND_Y - 30, 'heart');
      });
    }
  }

  _dropDebris(x) {
    const d = this.addMovingHazard(x, 6, TEX.DEBRIS, { damage: 1, spin: randInt(-8, 8), gravity: true });
    d.setVelocityY(50);
    this.debris.push(d);
  }
}
