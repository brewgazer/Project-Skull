// Level5Scene — "Apartment Complex"
// A vertical climb up a derelict tenement to the rooftop. Zig-zag ledges form
// the stairwell; breakable doors seal side rooms hiding loot, and tenants ambush
// from the landings. Showcases vertical level support + breakable doors.

import { SCENES, TEX, GAME_WIDTH, PALETTE } from '../config.js';
import { BaseLevelScene } from './BaseLevelScene.js';
import { randInt } from '../utils/math.js';

export class Level5Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_5);
  }

  get levelNumber() { return 5; }
  get parTime() { return 120000; }
  get startWeapon() { return 'fireaxe'; }
  get nextScene() { return SCENES.LEVEL_6; }

  buildLevel() {
    this.worldWidth = GAME_WIDTH;
    this.worldHeight = 900;
    this.musicBpm = 148;

    // Donkey-Kong-style rolling TNT barrels.
    this.barrels = [];
    this.barrelSpeed = 66; // px/s — tuned so each drop clears the ledge gap
    this.maxBarrels = 4;
    this.barrelSpawnT = 2200; // small grace before the first barrel

    const bottomY = this.worldHeight - 16;
    this.lobbyY = bottomY;

    // Ground floor lobby.
    this.addPlatform(0, bottomY, this.worldWidth, 40);

    // Spawn the player on the lobby floor.
    this.player.setPosition(40, bottomY);
    this.addCheckpoint(40, bottomY);

    // Background apartment windows.
    for (let y = bottomY - 60; y > 40; y -= 70) {
      for (let x = 30; x < this.worldWidth; x += 70) {
        this.add.rectangle(x, y, 18, 22, 0x2a2230, 0.5).setDepth(-6);
        if (Math.random() < 0.3) this.add.rectangle(x, y, 18, 22, 0xf2c200, 0.08).setDepth(-5);
      }
    }

    this.setObjective('CLIMB TO THE ROOF  -  BREAK DOORS FOR LOOT  -  ^ TO JUMP');

    // --- the zig-zag stairwell -------------------------------------------
    const floors = 15;
    const stepY = 50;
    const ledgeW = 156;
    for (let i = 1; i <= floors; i++) {
      const left = i % 2 === 1;
      const x = left ? 0 : this.worldWidth - ledgeW;
      const y = bottomY - i * stepY;
      this.addLedge(x, y, ledgeW, 8);

      // Populate landings: enemies, breakable loot doors, hidden crates.
      const inner = left ? x + ledgeW - 24 : x + 24;
      if (i % 3 === 0) {
        this.spawnEnemy(i % 2 ? 'grunt' : 'runner', left ? x + 40 : x + ledgeW - 40, y);
      }
      if (i === 4 || i === 9) {
        this._lootDoor(inner, y);
      }
      if (i === 6 || i === 12) {
        const cx = left ? x + 30 : x + ledgeW - 30;
        this.addDestructible(cx, y, 'crate'); // hidden stash
        this.spawnPickup(cx, y - 30, Math.random() < 0.5 ? 'heart' : 'spark');
      }
      if (i === 7) this.spawnEnemy('brute', left ? x + 60 : x + ledgeW - 60, y);
    }

    // --- rooftop + exit ---------------------------------------------------
    // The roof is the final step of the climb (right side, continuing the
    // zig-zag) so the player can hop up onto it — NOT a full-width ceiling that
    // would seal the top off.
    const roofY = bottomY - (floors + 1) * stepY;
    const roofX = this.worldWidth - ledgeW;
    this.addLedge(roofX, roofY, ledgeW, 8);
    this.spawnEnemy('grunt', roofX + 40, roofY);
    this.spawnEnemy('runner', roofX + 110, roofY);
    this.addExit(roofX + ledgeW / 2, roofY);

    // --- rolling TNT barrels ---------------------------------------------
    // They tumble down from the top of the stairwell. The top climbing ledge
    // (i = floors) is on the left, so barrels start there rolling right and
    // zig-zag down toward the ascending player.
    const topLedgeY = bottomY - floors * stepY;
    this.barrelSpawn = { x: 90, y: topLedgeY - 14 };
    // A leaking barrel rack at the top sells where they come from.
    this.add.image(70, topLedgeY, TEX.BARREL).setOrigin(0.5, 1).setDepth(9).setAlpha(0.9);
    this.add.image(96, topLedgeY, TEX.BARREL).setOrigin(0.5, 1).setDepth(9).setAlpha(0.6).setScale(0.85);
    this.add
      .rectangle(this.barrelSpawn.x, topLedgeY - 30, 120, 12, PALETTE.hazard, 0.08)
      .setDepth(-2);

    // A barrel that rolls into the player costs a heart (handled per-frame).
    this.physics.add.overlap(this.player, this.destructibles, (pl, d) => this._barrelHitsPlayer(d));

    this.setObjective('CLIMB TO THE ROOF  -  DODGE OR SMASH THE TNT BARRELS');
  }

  /** Drop a fresh TNT barrel at the top of the stairwell. */
  _spawnRollingBarrel() {
    const b = this.addDestructible(this.barrelSpawn.x, this.barrelSpawn.y, 'barrel');
    // Swap to the round keg sprite + centred origin + circular body so the
    // barrel SPINS about its centre and reads as rolling on its side rather
    // than a tall box tumbling end-over-end.
    b.setTexture(TEX.BARREL_ROLL);
    b.setOrigin(0.5, 0.5);
    const r = b.width / 2 - 1;
    b.body.setCircle(r, b.width / 2 - r, b.height / 2 - r);
    b.rolling = true;
    b.dir = 1; // start rolling right off the top (left) ledge
    b._wasFloor = true; // it spawns resting on the ledge
    b._life = 9000;
    b.setVelocityX(this.barrelSpeed);
    this.particles.dustKick(b.x, b.y, 2);
    this.barrels.push(b);
  }

  /** The player got rolled over — one heart, and the barrel detonates. */
  _barrelHitsPlayer(d) {
    if (!d || !d.rolling || d.dead) return;
    const p = this.player;
    if (p.invuln > 0 || p.dashing) return;
    p.takeDamage(1, Math.sign(p.x - d.x) || 1);
    d.break(Math.sign(d.x - p.x) || 1);
  }

  onLevelUpdate(time, delta) {
    // Emit barrels on a timer (capped so the stairwell never floods).
    this.barrelSpawnT -= delta;
    if (this.barrelSpawnT <= 0) {
      this.barrelSpawnT = randInt(2400, 3400);
      if (this.barrels.length < this.maxBarrels) this._spawnRollingBarrel();
    }

    const mid = this.worldWidth / 2;
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      const b = this.barrels[i];
      if (!b.active || b.dead) { this.barrels.splice(i, 1); continue; }

      // Each time it lands on a ledge, send it toward the centre — i.e. the
      // inner (drop) edge of that ledge. The stairwell ledges are flush with
      // the outer walls, so heading inward keeps barrels zig-zagging down the
      // gap instead of rolling off the outside into the void.
      const onFloor = b.body.blocked.down;
      if (onFloor && !b._wasFloor) {
        b.dir = b.x < mid ? 1 : -1;
        this.particles.dustKick(b.x, b.y, 2);
      }
      b._wasFloor = onFloor;

      b.setVelocityX(b.dir * this.barrelSpeed);
      // Roll the sprite at the rate its rim would travel along the ground:
      // dθ = (v · dt) / radius. This makes the spin track the actual motion so
      // it reads as rolling on its side, not flipping over its faces.
      const radius = b.width / 2 - 1;
      const degPerSec = (this.barrelSpeed / radius) * (180 / Math.PI);
      b.angle += b.dir * degPerSec * (delta / 1000);

      // Despawn at the lobby floor, if it ever escapes the world, or after a
      // lifetime (anti-stuck safety).
      b._life -= delta;
      if (
        b.y >= this.lobbyY - 6 ||
        b._life <= 0 ||
        b.x < -10 || b.x > this.worldWidth + 10 ||
        b.y > this.worldHeight + 40
      ) {
        this.particles.dustKick(b.x, b.y, 4);
        b.dead = true;
        b.destroy();
        this.barrels.splice(i, 1);
      }
    }
  }

  /** A bolted side door that blocks a small loot alcove. Smashing it (the fire
   *  axe makes short work) reveals the reward and clears the way. */
  _lootDoor(x, y) {
    const door = this.addDestructible(x, y, 'door');
    door.body.setSize(door.width - 2, door.height - 2);
    // Block the player until it is broken.
    const col = this.physics.add.collider(this.player, door);
    door.once('destroy', () => this.physics.world.removeCollider(col));
    // The reward sits just behind it.
    this.spawnPickup(x, y - 28, 'heart');
  }
}
