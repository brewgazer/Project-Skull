// BaseLevelScene
// ----------------------------------------------------------------------------
// The reusable backbone for every gameplay level. It instantiates the engine
// systems (input, camera FX, particles, combo, score), builds the player and
// shared physics groups, wires up the scoring/combo/respawn event flow, and
// exposes level-authoring helpers (platforms, props, enemies, checkpoints).
// Concrete levels subclass this and implement buildLevel().

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES, TEX, PALETTE } from '../config.js';
import { EVENTS } from '../utils/events.js';
import { generateAllTextures } from '../assets/Assets.js';
import { InputManager } from '../systems/InputManager.js';
import { CameraEffects } from '../systems/CameraEffects.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { ComboSystem } from '../systems/ComboSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Destructible } from '../entities/Destructible.js';
import { audio } from '../systems/AudioManager.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { touch } from '../systems/touch.js';

export const GROUND_Y = 160;

export class BaseLevelScene extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.levelKey = key;
  }

  // Subclasses override these.
  get levelNumber() {
    return 1;
  }
  get levelId() {
    return this.levelKey;
  }
  get parTime() {
    return 90000;
  }
  get startWeapon() {
    return 'chainsaw';
  }
  buildLevel() {}
  onLevelUpdate(time, delta) {}

  create() {
    generateAllTextures(this);

    this.worldWidth = 2400; // subclasses can override before buildLevel
    this.worldHeight = GAME_HEIGHT; // vertical levels override this
    this.enemiesRemaining = 0;
    this.levelOver = false;
    // scene.restart() REUSES this instance, so reset the restart guard here or
    // a second death/retry would be silently ignored.
    this._restarting = false;
    this.checkpoint = { x: 60, y: GROUND_Y };

    // Authoring helpers populated by levels (driven each frame in update()).
    this.movers = []; // moving/elevator platforms
    this.conveyors = []; // belt push zones
    this.spotlight = null; // optional flashlight that follows the player

    // Systems
    this.controls = new InputManager(this);
    this.fx = new CameraEffects(this);
    this.particles = new ParticleSystem(this);
    this.combo = new ComboSystem(this);
    this.scoreSystem = new ScoreSystem(this, this.combo);

    // Groups
    this.platforms = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.destructibles = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.hazards = this.physics.add.group(); // moving hazards (saws, trains...)
    this.staticHazards = this.physics.add.staticGroup(); // fixed damage zones
    this.projectiles = this.physics.add.group(); // thrown player projectiles (molotov...)
    this.fireZones = []; // lingering area hazards (molotov fire, etc.)
    this.enemyShots = this.physics.add.group(); // gunfire from ranged enemies

    this._buildBackground();

    // Player
    this.player = new Player(this, this.checkpoint.x, this.checkpoint.y);

    // Let the concrete level lay out its world.
    this.buildLevel();

    // World + camera bounds derived from final world dimensions.
    this.physics.world.setBounds(0, -200, this.worldWidth, this.worldHeight + 400);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(40, 30);
    this.cameras.main.setBackgroundColor(PALETTE.shadow);

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.destructibles, this.platforms);
    this.physics.add.collider(this.enemies, this.destructibles);
    // Keep enemies from stacking on the exact same pixel (otherwise a whole
    // wave can pile onto one spawn point and look like a single sprite).
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.pickups, (p, pk) => this._collectPickup(pk));
    this.physics.add.overlap(this.player, this.hazards, (p, h) => this._touchHazard(h));
    this.physics.add.overlap(this.player, this.staticHazards, (p, h) => this._touchHazard(h));
    this.physics.add.collider(this.projectiles, this.platforms, (pr) => this._onProjectileHit(pr));
    this.physics.add.overlap(this.projectiles, this.enemies, (pr) => this._onProjectileHit(pr));
    // NOTE: when overlapping a GROUP with a single SPRITE, Phaser passes the
    // sprite as the FIRST callback arg — so we must identify the bullet by group
    // membership rather than by argument position (else we'd act on the player).
    this.physics.add.collider(this.enemyShots, this.platforms, (a, b) => {
      const shot = this.enemyShots.contains(a) ? a : b;
      shot.destroy();
    });
    this.physics.add.overlap(this.enemyShots, this.player, (a, b) => {
      const shot = this.enemyShots.contains(a) ? a : b;
      this._enemyShotHitsPlayer(shot);
    });
    this.physics.add.overlap(this.enemyShots, this.destructibles, (a, b) => {
      const shot = this.enemyShots.contains(a) ? a : b;
      this._enemyShotHitsDestructible(shot, shot === a ? b : a);
    });

    // Melee hit registration
    this.player.registerHittable(this.enemies);
    this.player.registerHittable(this.destructibles);

    this._wireEvents();

    // HUD overlay — must render above the level (scene list order otherwise
    // draws it underneath).
    this.scene.launch(SCENES.HUD, { level: this });
    this.scene.bringToTop(SCENES.HUD);

    // Audio: start the soundtrack + chainsaw idle if applicable. Level 1 plays
    // the signature anthem; levels 2+ pull a random track from the pool.
    audio.unlock();
    audio.playLevelMusic(this.levelNumber);
    if (this.startWeapon === 'chainsaw') audio.startChainsaw();
    this.player.setWeapon(this.startWeapon);

    this.events.once('shutdown', () => this._cleanup());

    // On-screen controls (mobile): show while this level is live, hide on exit.
    touch.setGameplay(true);
    this.events.once('shutdown', () => touch.setGameplay(false));

    // Fullscreen hotkey (PC). Mobile uses the on-screen fullscreen button.
    this.input.keyboard.on('keydown-F', () => this.scale.toggleFullscreen());

    // Pause handling.
    this.paused = false;
  }

  // --- world building helpers ------------------------------------------

  _buildBackground() {
    // Parallax layers built from the generated wall texture.
    this.bgFar = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEX.WALL_BG)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setTint(0x33343c)
      .setDepth(-30);
    this.bgNear = this.add
      .tileSprite(0, 20, GAME_WIDTH, GAME_HEIGHT - 20, TEX.WALL_BG)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setTint(0x4a4b55)
      .setAlpha(0.6)
      .setDepth(-20);
  }

  /** Add a solid platform: visible tiled floor + static physics body. */
  addPlatform(x, y, width, height = GAME_HEIGHT - GROUND_Y + 40) {
    const tile = this.add
      .tileSprite(x, y, width, height, TEX.FLOOR)
      .setOrigin(0, 0)
      .setDepth(10);
    const body = this.platforms.create(x + width / 2, y + height / 2, TEX.PIXEL);
    body.setVisible(false).setDisplaySize(width, height).refreshBody();
    return tile;
  }

  /** Ground floor spanning the whole level. */
  addGround() {
    this.addPlatform(0, GROUND_Y, this.worldWidth, GAME_HEIGHT - GROUND_Y + 40);
  }

  /** A floating solid ledge (used by vertical / platforming levels). */
  addLedge(x, y, width, height = 8) {
    return this.addPlatform(x, y, width, height);
  }

  /** Place the level exit. Walking into it finishes the level (unless the
   *  level sets `this.canComplete = false` to gate it behind an objective). */
  addExit(x, y = GROUND_Y) {
    const exit = this.physics.add.image(x, y, TEX.DOOR).setOrigin(0.5, 1).setDepth(6);
    exit.body.setAllowGravity(false);
    exit.body.setImmovable(true);
    this.exit = exit;
    this.physics.add.overlap(this.player, exit, () => {
      if (this.canComplete !== false) this.completeLevel();
    });
    return exit;
  }

  /** A fixed damaging zone. Pass a texture for a visible hazard, or omit it for
   *  a tinted rectangle of the given size. */
  addHazard(x, y, w, h, opts = {}) {
    const { damage = 1, texture = null, tint = null, visible = true, depth = 9 } = opts;
    const hz = this.staticHazards.create(x, y, texture || TEX.PIXEL);
    hz.setOrigin(0.5, 0.5);
    if (w && h) hz.setDisplaySize(w, h);
    hz.setTint(tint != null ? tint : texture ? 0xffffff : PALETTE.hazard);
    if (!visible) hz.setVisible(false);
    hz.damage = damage;
    hz.setDepth(depth);
    hz.refreshBody();
    return hz;
  }

  /** A moving hazard (saw blade, forklift, train...). Driven by the caller via
   *  velocity or tween; the dynamic body keeps the collision in sync. */
  addMovingHazard(x, y, texture, opts = {}) {
    const { damage = 1, depth = 9, bodyScale = 1, spin = 0, patrol = null, gravity = false } = opts;
    const hz = this.hazards.create(x, y, texture);
    hz.setOrigin(0.5, 0.5);
    hz.body.setAllowGravity(gravity);
    hz.body.setImmovable(!gravity);
    if (bodyScale !== 1) {
      hz.body.setSize(hz.width * bodyScale, hz.height * bodyScale);
    }
    hz.damage = damage;
    hz.spin = spin;
    hz.setDepth(depth);
    if (patrol) {
      hz.patrol = { axis: patrol.axis || 'y', range: patrol.range || 40, speed: patrol.speed || 50 };
      hz.startX = x;
      hz.startY = y;
      hz.dir = patrol.dir || 1;
    }
    return hz;
  }

  /** A solid platform that patrols back and forth, carrying riders. Use for
   *  elevators (axis 'y') and crane loads / lifts (axis 'x'). */
  addMover(x, y, opts = {}) {
    const { axis = 'y', range = 40, speed = 30, texture = TEX.ELEVATOR } = opts;
    const plat = this.physics.add.image(x, y, texture).setDepth(12);
    plat.body.setAllowGravity(false);
    plat.body.setImmovable(true);
    plat.startX = x;
    plat.startY = y;
    plat.axis = axis;
    plat.range = range;
    plat.spd = speed;
    plat.dir = 1;
    this.physics.add.collider(this.player, plat);
    this.physics.add.collider(this.enemies, plat);
    this.movers.push(plat);
    return plat;
  }

  /** A conveyor belt: a solid surface that pushes whatever stands on it. */
  addConveyor(x, y, width, dir = 1, speed = 70) {
    const belt = this.add
      .tileSprite(x, y, width, 8, TEX.CONVEYOR)
      .setOrigin(0, 0)
      .setDepth(11);
    // The chevrons are authored pointing right; mirror for a left-running belt
    // so the arrows always face the push direction.
    belt.setFlipX(dir < 0);
    const body = this.platforms.create(x + width / 2, y + 4, TEX.PIXEL);
    body.setVisible(false).setDisplaySize(width, 8).refreshBody();
    this.conveyors.push({ x1: x, x2: x + width, top: y, dir, speed, belt });
    return belt;
  }

  /** Turn the arena dark with a flashlight glow that follows the player. */
  enableDarkness(alpha = 0.82, lightScale = 1) {
    this.darkness = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05060a, alpha)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(900);
    this.spotlight = this.add
      .image(this.player.x, this.player.y, TEX.LIGHT)
      .setDepth(901)
      .setScale(lightScale)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5);
  }

  spawnEnemy(archetypeId, x, y = GROUND_Y, opts = {}) {
    let e = this.enemies.getChildren().find((c) => !c.active);
    if (e) e.spawn(x, y, archetypeId);
    else {
      e = new Enemy(this, x, y, archetypeId);
      this.enemies.add(e);
    }
    if (opts.countTowardClear !== false) this.enemiesRemaining++;
    return e;
  }

  addDestructible(x, y, kind = 'crate') {
    const d = new Destructible(this, x, y, kind);
    this.destructibles.add(d);
    return d;
  }

  addProp(x, y, texture, depth = 8) {
    return this.add.image(x, y, texture).setOrigin(0.5, 1).setDepth(depth);
  }

  addCheckpoint(x, y = GROUND_Y) {
    this.checkpoint = { x, y };
  }

  /** Set the on-screen objective/tutorial text. Stored so the HUD can show the
   *  initial objective even if it was set before the HUD scene launched. */
  setObjective(text) {
    this.objective = text;
    this.events.emit('hud-objective', text);
  }

  spawnPickup(x, y, kind = 'heart') {
    const tex = kind === 'heart' ? TEX.HEART_FULL : TEX.SPARK;
    const pk = this.pickups.create(x, y, tex);
    pk.kind = kind;
    pk.setDepth(35);
    // Float in place (no floor collider exists), bobbing for visibility.
    pk.body.setAllowGravity(false);
    pk.body.setVelocity(0, 0);
    this.tweens.add({ targets: pk, y: pk.y - 4, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
    return pk;
  }

  // --- pickups / hazards ------------------------------------------------

  _collectPickup(pk) {
    if (!pk.active) return;
    if (pk.kind === 'heart') this.player.heal(1);
    else this.scoreSystem.award('collectible', { x: pk.x, y: pk.y });
    audio.play('pickup');
    pk.destroy();
  }

  _touchHazard(h) {
    if (this.player.invuln > 0 || this.player.dashing) return;
    this.player.takeDamage(h.damage || 1, Math.sign(this.player.x - h.x) || 1);
  }

  // --- thrown projectiles + lingering fire zones ------------------------

  /** Lob a player projectile (e.g. a Molotov). Called by the Player when a
   *  'throw' weapon fires; the scene owns the group/colliders so any level
   *  supports thrown weapons for free. */
  spawnPlayerProjectile(player, w) {
    const p = this.projectiles.create(player.x + player.facing * 10, player.y - 16, w.sprite);
    p.kind = w.id;
    p.weaponCfg = w;
    p.setDepth(42);
    p.body.setAllowGravity(true);
    p.body.setSize(8, 8);
    p.setVelocity(player.facing * (w.throwSpeed || 200), -180);
    p.setAngularVelocity(player.facing * 360);
    p._life = 2600;
    return p;
  }

  _onProjectileHit(p) {
    if (!p || !p.active) return;
    const w = p.weaponCfg;
    const x = p.x;
    const y = p.y;
    p.destroy();
    if (w && (w.id === 'molotov' || w.shatterFire)) this._spawnFireZone(x, y, w);
  }

  _spawnFireZone(x, y, w) {
    const width = w.fireWidth || 56;
    audio.play('death');
    this.fx.flash(0xff7a1e, 0.22, 110);
    this.particles.smokePuff(x, y, 5);
    const flames = [];
    for (let i = 0; i < 5; i++) {
      const fx = x - width / 2 + i * (width / 5) + width / 10;
      const f = this.add.rectangle(fx, y + 2, 8, 14, 0xff7a1e, 0.85).setOrigin(0.5, 1).setDepth(40);
      this.tweens.add({
        targets: f, scaleY: { from: 0.6, to: 1.25 }, alpha: { from: 0.5, to: 0.95 },
        yoyo: true, repeat: -1, duration: 170 + i * 28,
      });
      flames.push(f);
    }
    this.fireZones.push({ x, y, w: width, until: this.time.now + (w.fireMs || 2600), tick: 0, dmg: w.fireDps || 1.2, flames });
  }

  _updateProjectiles(delta) {
    this.projectiles.getChildren().forEach((p) => {
      if (!p.active) return;
      p._life -= delta;
      if (p._life <= 0 || p.y > this.worldHeight + 80 || p.x < -20 || p.x > this.worldWidth + 20) {
        this._onProjectileHit(p);
      }
    });
  }

  _updateFireZones(time, delta) {
    for (let i = this.fireZones.length - 1; i >= 0; i--) {
      const z = this.fireZones[i];
      if (time >= z.until) {
        z.flames.forEach((f) => f.destroy());
        this.fireZones.splice(i, 1);
        continue;
      }
      z.tick -= delta;
      if (z.tick > 0) continue;
      z.tick = 300;
      const inZone = (o) => o.active && !o.dead && Math.abs(o.x - z.x) < z.w / 2 && Math.abs(o.y - z.y) < 42;
      this.enemies.getChildren().forEach((e) => {
        if (inZone(e)) e.takeHit(z.dmg, 20, Math.sign(e.x - z.x) || 1, {});
      });
      const p = this.player;
      if (p && !p.dead && p.invuln <= 0 && Math.abs(p.x - z.x) < z.w / 2 && Math.abs(p.y - z.y) < 42) {
        p.takeDamage(1, Math.sign(p.x - z.x) || 1);
      }
    }
  }

  // --- enemy gunfire (combat-shooter levels) ----------------------------

  /** Fire an enemy bullet from (x,y) toward (tx,ty). */
  spawnEnemyShot(x, y, tx, ty, dmg = 1, speed = 240) {
    const s = this.enemyShots.create(x, y, TEX.DEBRIS);
    s.setScale(0.5).setTint(0xffd35a).setDepth(43);
    s.body.setAllowGravity(false);
    s.body.setSize(6, 6);
    s.dmg = dmg;
    const ang = Math.atan2(ty - y, tx - x);
    s.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    s.setRotation(ang);
    s._life = 2400;
    this.particles.sparkBurst(x, y, 2);
    return s;
  }

  _enemyShotHitsPlayer(s) {
    if (!s.active) return;
    const p = this.player;
    if (p.dead) { s.destroy(); return; }
    // Cover blocks bullets arriving from the side the cover sits on. Use the
    // bullet's travel direction (robust even if a fast shot has tunnelled past
    // the player's centre by the time the overlap resolves): a shot from the
    // covered side travels toward the player in the -coverDir direction.
    const fromCoverSide = Math.sign(s.body.velocity.x) === -p.coverDir || Math.sign(s.x - p.x) === p.coverDir;
    if (p.covered && fromCoverSide) {
      this.particles.sparkBurst(s.x, s.y, 3);
      s.destroy();
      return;
    }
    if (p.invuln > 0 || p.dashing) { s.destroy(); return; }
    p.takeDamage(s.dmg || 1, Math.sign(p.x - s.x) || 1);
    s.destroy();
  }

  _enemyShotHitsDestructible(s, d) {
    if (!s.active || !d.active || d.dead) return;
    // Bullets detonate explosive barrels; steel cover/crates just chip.
    d.takeHit(d.explosive ? 99 : 1, 30, Math.sign(s.body.velocity.x) || 1);
    this.particles.sparkBurst(s.x, s.y, 3);
    s.destroy();
  }

  _updateEnemyShots(delta) {
    this.enemyShots.getChildren().forEach((s) => {
      if (!s.active) return;
      s._life -= delta;
      if (s._life <= 0 || s.x < -30 || s.x > this.worldWidth + 30 || s.y < -60 || s.y > this.worldHeight + 80) {
        s.destroy();
      }
    });
  }

  // --- wave tracking (expansion levels) ---------------------------------

  /** Spawn an enemy and remember it in `list` so a level can gate on a wave. */
  spawnTracked(list, id, x, y = GROUND_Y) {
    const e = this.spawnEnemy(id, x, y);
    list.push(e);
    return e;
  }

  /** True once every enemy spawned into `list` is dead/inactive. */
  waveCleared(list) {
    return list.length > 0 && list.every((e) => !e.active || e.dead);
  }

  // --- scoring / combat event flow -------------------------------------

  _wireEvents() {
    this.events.on(EVENTS.ENEMY_HIT, () => {
      this.combo.add(1);
      audio.play('comboUp');
      this._raiseIntensity();
    });

    this.events.on(EVENTS.ENEMY_KILLED, (info) => {
      this.scoreSystem.award(info.execution ? 'execution' : 'kill', { x: info.x, y: info.y });
      this.combo.add(info.isBoss ? 10 : 2);
      saveSystem.addStats({ kills: 1, bestCombo: this.combo.best });
      if (info.execution) saveSystem.addStats({ executions: 1 });
      this._floatScore(info.x, info.y, info.execution ? 'EXECUTION' : null);
      if (info.countTowardClear !== false) {
        this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
      }
      this._raiseIntensity();
      this.onEnemyKilled?.(info);
    });

    this.events.on(EVENTS.SCORE_CHANGED, (info) => {
      if (info && info.gained && info.x != null) {
        this._floatScore(info.x, info.y, `+${info.gained}`);
      }
    });

    this.events.on(EVENTS.PLAYER_HIT, () => {
      this.scoreSystem.markDamaged();
      this.combo.break();
    });

    this.events.on(EVENTS.PLAYER_DIED, () => this._handleDeath());

    this.events.on(EVENTS.LEVEL_COMPLETE, () => this._handleComplete());
  }

  _raiseIntensity() {
    const i = Math.min(1, 0.3 + this.combo.count * 0.03);
    audio.setMusicIntensity(i);
  }

  _floatScore(x, y, text) {
    if (!text) return;
    const label = this.add
      .text(x, y - 16, text, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffe08a',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({
      targets: label,
      y: y - 36,
      alpha: 0,
      duration: 700,
      onComplete: () => label.destroy(),
    });
  }

  _handleDeath() {
    saveSystem.addStats({ deaths: 1 });
    this.combo.break();
    audio.revChainsaw(false);
    // Death restarts the whole level from the beginning.
    this.levelOver = true;
    this.time.delayedCall(1100, () => this.restartLevel());
  }

  /** Tear down and reload this level from scratch. Used by death and the
   *  pause/results "restart" actions. Robust against being called while the
   *  scene is paused or mid hit-stop/slow-mo. */
  restartLevel() {
    if (this._restarting) return;
    this._restarting = true;
    audio.revChainsaw(false);
    audio.stopMusic();
    this.scene.stop(SCENES.HUD);
    if (this.scene.isPaused()) this.scene.resume();
    this.scene.restart();
  }

  completeLevel() {
    if (this.levelOver) return;
    this.levelOver = true;
    this.events.emit(EVENTS.LEVEL_COMPLETE);
  }

  _handleComplete() {
    const results = this.scoreSystem.finalize({ par: this.parTime });
    saveSystem.recordScore(this.levelId, results.total, results.rank);
    saveSystem.completeLevel(this.levelId);
    saveSystem.unlockLevel(this.levelNumber + 1);
    audio.revChainsaw(false);
    audio.stopMusic();
    this.fx.slowMo(0.5, 600);
    this.time.delayedCall(700, () => {
      this.scene.stop(SCENES.HUD);
      this.scene.start(SCENES.LEVEL_COMPLETE, {
        results,
        levelNumber: this.levelNumber,
        nextScene: this.nextScene,
      });
    });
  }

  // --- per-frame --------------------------------------------------------

  update(time, delta) {
    if (this.controls.justDown('pause') && !this.levelOver) {
      this._togglePause();
      return;
    }

    this.combo.update(delta);

    // Parallax scroll.
    const camX = this.cameras.main.scrollX;
    if (this.bgFar) this.bgFar.tilePositionX = camX * 0.2;
    if (this.bgNear) this.bgNear.tilePositionX = camX * 0.45;

    this._updateMovers(delta);
    this._updateConveyors(delta);
    this._updateMovingHazards(delta);
    this._updateProjectiles(delta);
    this._updateFireZones(time, delta);
    this._updateEnemyShots(delta);
    if (this.spotlight && this.player) {
      this.spotlight.setPosition(this.player.x, this.player.y - 14);
    }

    this.onLevelUpdate(time, delta);
  }

  _updateMovers() {
    for (const m of this.movers) {
      if (!m.active) continue;
      if (m.axis === 'y') {
        if (m.y <= m.startY - m.range && m.dir < 0) m.dir = 1;
        else if (m.y >= m.startY + m.range && m.dir > 0) m.dir = -1;
        m.setVelocityY(m.dir * m.spd);
        m.setVelocityX(0);
      } else {
        if (m.x <= m.startX - m.range && m.dir < 0) m.dir = 1;
        else if (m.x >= m.startX + m.range && m.dir > 0) m.dir = -1;
        m.setVelocityX(m.dir * m.spd);
        m.setVelocityY(0);
      }
    }
  }

  _updateConveyors(delta) {
    const dt = delta / 1000;
    const p = this.player;
    for (const c of this.conveyors) {
      // Scroll the belt so its surface visibly travels in the push direction.
      // Decreasing tilePositionX moves the pattern right; the belt's flipX (set
      // for left-running belts) mirrors both arrows AND scroll together, so the
      // same decrement is correct for both directions.
      c.belt.tilePositionX -= c.speed * dt * 0.5;
      if (
        p &&
        p.body.onFloor() &&
        p.x > c.x1 &&
        p.x < c.x2 &&
        Math.abs(p.body.bottom - c.top) < 12
      ) {
        p.x += c.dir * c.speed * dt;
      }
    }
  }

  _updateMovingHazards() {
    const hazards = this.hazards.getChildren();
    for (const h of hazards) {
      if (!h.active) continue;
      if (h.spin) h.angle += h.spin;
      const p = h.patrol;
      if (p) {
        if (p.axis === 'y') {
          if (h.y <= h.startY - p.range && h.dir < 0) h.dir = 1;
          else if (h.y >= h.startY + p.range && h.dir > 0) h.dir = -1;
          h.setVelocityY(h.dir * p.speed);
        } else {
          if (h.x <= h.startX - p.range && h.dir < 0) h.dir = 1;
          else if (h.x >= h.startX + p.range && h.dir > 0) h.dir = -1;
          h.setVelocityX(h.dir * p.speed);
        }
      }
    }
  }

  _togglePause() {
    audio.revChainsaw(false);
    audio.setMusicIntensity(0.1);
    this.scene.launch(SCENES.PAUSE, { level: this });
    this.scene.bringToTop(SCENES.PAUSE);
    // Pausing the scene halts its update loop AND physics, so the player can't
    // act while the menu is open.
    this.scene.pause();
  }

  resumeFromPause() {
    this.scene.resume();
    audio.setMusicIntensity(0.3);
    if (this.startWeapon === 'chainsaw') audio.startChainsaw();
  }

  _cleanup() {
    // Fully tear down the chainsaw engine — revChainsaw(false) only drops it to
    // an idle hum, which would otherwise keep droning across menus and levels.
    audio.stopChainsaw();
    this.fx?.destroy();
    this.particles?.destroy();
  }
}
