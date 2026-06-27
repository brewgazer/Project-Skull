// Player
// ----------------------------------------------------------------------------
// The protagonist controller: responsive platforming (coyote time + jump
// buffering), a dash with invulnerability frames, and a data-driven weapon
// system supporting continuous grinders (chainsaw) and timed swings (bat) with
// sweet-spot timing, executions, knockback and full game-feel feedback.

import Phaser from 'phaser';
import { WEAPONS } from '../data/weapons.js';
import { EVENTS } from '../utils/events.js';
import { audio } from '../systems/AudioManager.js';
import { clamp, approach } from '../utils/math.js';

const MOVE = {
  runSpeed: 96,
  groundAccel: 1100,
  airAccel: 700,
  friction: 1300,
  jumpVelocity: -312,
  maxFall: 520,
  coyoteMs: 90,
  jumpBufferMs: 130,
  dashSpeed: 260,
  dashMs: 170,
  dashCdMs: 560,
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setSize(11, 26).setOffset(8.5, 6);
    this.body.setMaxVelocity(MOVE.runSpeed * 2.8, 800);
    this.setCollideWorldBounds(true);
    this.setDepth(40);

    this.maxHearts = 3;
    this.hearts = 3;
    this.facing = 1;

    // timers
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.dashTimer = 0;
    this.dashCd = 0;
    this.invuln = 0;
    this.attackCd = 0;

    // state flags
    this.dashing = false;
    this.dead = false;
    this.attacking = false;
    this.grinding = false;
    this.swingId = 0;
    this.hitThisSwing = new Set();
    this.heavySwing = false;

    // Cover (combat-shooter levels): duck behind crates/steel barrels.
    this.covered = false;
    this.coverObj = null;
    this.coverDir = 1; // side the cover sits on (incoming fire from this side is blocked)

    // weapon
    this.weaponSprite = scene.add.sprite(x, y, 'chainsaw').setDepth(41).setOrigin(0.1, 0.5);
    this.setWeapon('chainsaw');

    // melee hit zone (bodied, invisible)
    this.attackZone = scene.physics.add.image(x, y, 'pixel').setVisible(false);
    this.attackZone.body.setAllowGravity(false);
    this.attackZone.body.enable = false;
    this.attackZone.owner = this;

    this.controls = scene.controls;
  }

  setWeapon(id) {
    this.weapon = WEAPONS[id];
    this.weaponId = id;
    this.weaponSprite.setTexture(this.weapon.sprite);
    this.scene.events.emit(EVENTS.WEAPON_CHANGED, this.weapon);
  }

  // --- combat wiring ----------------------------------------------------

  /** Register a group whose members can be hit by melee swings. */
  registerHittable(group) {
    this.scene.physics.add.overlap(this.attackZone, group, (zone, target) =>
      this.handleMeleeOverlap(target)
    );
  }

  handleMeleeOverlap(target) {
    if (!this.attackZone.body.enable || target.dead === true || !target.active) return;
    const w = this.weapon;

    if (w.continuous) {
      const now = this.scene.time.now;
      if (target.__nextSawTick && now < target.__nextSawTick) return;
      target.__nextSawTick = now + w.tickRate;
      this.applyHit(target, false);
    } else {
      if (this.hitThisSwing.has(target)) return;
      this.hitThisSwing.add(target);
      this.applyHit(target, this.heavySwing);
    }
  }

  applyHit(target, heavy) {
    const w = this.weapon;
    const dirX = this.facing;
    let damage = w.damage * (heavy ? 1.8 : 1);
    let knockback = w.knockback * (heavy ? 1.4 : 1);
    let scoreBonus = 0;

    // Bat (and similar) sweet-spot timing window.
    if (w.sweetSpot && this.attacking) {
      const t = this.scene.time.now - this.swingStart;
      if (t >= w.sweetSpot.start && t <= w.sweetSpot.end) {
        knockback *= w.sweetSpot.knockbackBonus;
        scoreBonus = w.sweetSpot.scoreBonus;
        this.scene.fx.flash(0xffffff, 0.5, 70);
        this.scene.fx.slowMo(0.4, 220);
        audio.play('comboUp');
      }
    }

    // Execution: a heavy blow that would finish a weakened foe.
    const willKill = typeof target.hp === 'number' && target.hp - damage <= 0;
    if (heavy && willKill && typeof target.execute === 'function' && w.canExecute) {
      target.execute(dirX);
      this.scene.events.emit(EVENTS.EXECUTION, { target, x: target.x, y: target.y });
    } else {
      target.takeHit(damage, knockback, dirX, { heavy });
    }

    // Feedback.
    this.scene.fx.impact({
      shake: w.shake,
      shakeMs: 130,
      stop: w.hitstop,
      flash: heavy ? 0xffffff : 0,
    });
    audio.play(w.sound);
    if (scoreBonus) this.scene.scoreSystem.add(scoreBonus, { x: target.x, y: target.y - 20 });
  }

  // --- input + update ---------------------------------------------------

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.dead) {
      this._syncWeapon();
      return;
    }

    // Input gate (used for short cinematic beats like the boss intro).
    if (this.canAct === false) {
      this.setVelocityX(this.body.velocity.x * 0.8);
      if (this.grinding) this._setGrind(false);
      this.play('player-idle', true);
      this._syncWeapon();
      return;
    }

    const dt = delta;
    const onGround = this.body.blocked.down || this.body.touching.down;

    // timers
    this.coyote = onGround ? MOVE.coyoteMs : Math.max(0, this.coyote - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);

    const c = this.controls;
    if (c.justDown('jump')) this.jumpBuffer = MOVE.jumpBufferMs;
    if (c.justDown('dash')) this._tryDash();

    // Cover: E/Down toggles ducking behind nearby cover. Moving or dashing
    // leaves cover; it also drops if the cover is destroyed or you leave the ground.
    if (c.justDown('interact')) this._toggleCover();
    if (this.covered && (c.axisX !== 0 || this.dashing || !this._coverValid())) this._setCover(false);

    if (this.dashing) {
      this._updateDash(dt);
    } else if (this.covered) {
      // Rooted behind cover, but you can still return fire.
      this.setVelocityX(0);
      this.jumpBuffer = 0;
      this._updateAttack(c);
    } else {
      this._updateMovement(dt, onGround, c);
      this._updateJump(onGround);
      this._updateAttack(c);
    }

    this._updateAnim(onGround);
    this._updateInvulnBlink();
    this._syncWeapon();
  }

  _updateMovement(dt, onGround, c) {
    const ax = c.axisX;
    const weight = this.weapon.weight || 1;
    const maxSpeed = MOVE.runSpeed * weight * (this.grinding ? 0.6 : 1);
    if (ax !== 0) {
      this.facing = ax;
      const accel = (onGround ? MOVE.groundAccel : MOVE.airAccel) * weight;
      this.setVelocityX(
        clamp(this.body.velocity.x + ax * accel * (dt / 1000), -maxSpeed, maxSpeed)
      );
      if (onGround && Math.random() < 0.08) this.scene.particles.dustKick(this.x, this.y, 1);
    } else {
      this.setVelocityX(approach(this.body.velocity.x, 0, MOVE.friction * (dt / 1000)));
    }
    if (this.body.velocity.y > MOVE.maxFall) this.setVelocityY(MOVE.maxFall);
  }

  _updateJump(onGround) {
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.setVelocityY(MOVE.jumpVelocity);
      this.jumpBuffer = 0;
      this.coyote = 0;
      audio.play('jump');
      this.scene.particles.dustKick(this.x, this.y, 4);
    }
    // Variable jump height: release early to cut the rise short.
    if (!this.controls.isDown('jump') && this.body.velocity.y < -120) {
      this.setVelocityY(-120);
    }
  }

  _tryDash() {
    if (this.dashCd > 0 || this.dashing) return;
    this.dashing = true;
    this.dashTimer = MOVE.dashMs;
    this.dashCd = MOVE.dashCdMs;
    this.invuln = Math.max(this.invuln, MOVE.dashMs + 40);
    this.setVelocityX(this.facing * MOVE.dashSpeed);
    this.setVelocityY(0);
    this.body.setAllowGravity(false);
    this.scene.particles.smokePuff(this.x, this.y - 10, 3);
    this.scene.afterImage?.(this);
  }

  _updateDash(dt) {
    this.dashTimer -= dt;
    this.setVelocityX(this.facing * MOVE.dashSpeed);
    if (this.dashTimer <= 0) {
      this.dashing = false;
      this.body.setAllowGravity(true);
    }
  }

  // --- cover ------------------------------------------------------------

  _toggleCover() {
    if (this.covered) { this._setCover(false); return; }
    const o = this._findCover();
    if (o) this._setCover(true, o);
  }

  /** Nearest crate / steel cover-barrel we're standing next to. */
  _findCover() {
    const ds = this.scene.destructibles?.getChildren?.() || [];
    let best = null;
    let bd = 26;
    for (const d of ds) {
      if (!d.active || d.dead || !d.cover) continue;
      const dx = Math.abs(d.x - this.x);
      if (dx < bd) { bd = dx; best = d; }
    }
    return best;
  }

  _coverValid() {
    const o = this.coverObj;
    const onGround = this.body.blocked.down || this.body.touching.down;
    return o && o.active && !o.dead && Math.abs(o.x - this.x) < 30 && onGround;
  }

  _setCover(on, obj = null) {
    if (on === this.covered && obj === this.coverObj) return;
    this.covered = on;
    if (on) {
      this.coverObj = obj;
      this.coverDir = Math.sign(obj.x - this.x) || this.facing;
      this.facing = this.coverDir; // face the threat side to return fire
      this.setVelocity(0, this.body.velocity.y);
      this.setScale(1, 0.72); // duck (origin is at the feet, so the head lowers)
      audio.play('pickup');
    } else {
      this.coverObj = null;
      this.setScale(1, 1);
    }
  }

  _updateAttack(c) {
    const w = this.weapon;
    if (w.kind === 'ranged') {
      // Automatic weapons fire while held; others are semi-auto (per press).
      const pressed = w.auto ? c.isDown('attack') : c.justDown('attack');
      if (pressed && this.attackCd <= 0) this._fireRanged();
      return;
    }
    if (w.kind === 'throw') {
      if (c.justDown('attack') && this.attackCd <= 0) this._throwProjectile();
      return;
    }
    if (w.kind === 'spray') {
      if (c.isDown('attack') && this.attackCd <= 0) this._sprayCryo();
      return;
    }
    if (w.continuous) {
      const held = c.isDown('attack');
      this._setGrind(held);
      // heavy = quick lunge bite
      if (c.justDown('heavy') && this.attackCd <= 0) this._swing(true);
    } else {
      if (c.justDown('attack') && this.attackCd <= 0 && !this.attacking) this._swing(false);
      if (c.justDown('heavy') && this.attackCd <= 0 && !this.attacking) this._swing(true);
    }
  }

  /** Hitscan firearm. Shotguns (pellets > 1) spray everything in a short cone;
   *  single-shot guns (nail gun) hit the nearest target at longer range. */
  _fireRanged() {
    const w = this.weapon;
    this.attackCd = w.cooldown || 300;
    this.attacking = true;
    this.swingStart = this.scene.time.now;
    this.scene.time.delayedCall(120, () => { this.attacking = false; });

    const spread = (w.pellets || 1) > 1;
    const range = w.range || 120;
    const my = this.y - 14;
    const tipX = this.x + this.facing * 16;

    // Muzzle flash, recoil, casing, tracer.
    audio.play(w.sound);
    this.scene.particles.sparkBurst(tipX, my, spread ? 8 : 3);
    this.scene.particles.shellCasing(this.x, my, this.facing);
    this.setVelocityX(this.body.velocity.x - this.facing * (spread ? 70 : 30));
    this.scene.fx.impact({ shake: w.shake, shakeMs: 90, stop: w.hitstop, flash: spread ? 0xffffff : 0 });
    this.weaponSprite.x -= this.facing * 3;
    this._rangedTracer(my, range);

    // Resolve hits.
    const targets = [];
    const scan = (group) => {
      if (!group) return;
      group.getChildren().forEach((t) => {
        if (!t.active || t.dead) return;
        const rel = (t.x - this.x) * this.facing;
        if (rel > -6 && rel <= range && Math.abs(t.y - this.y) < 34) targets.push({ t, rel });
      });
    };
    scan(this.scene.enemies);
    scan(this.scene.destructibles);
    targets.sort((a, b) => a.rel - b.rel);
    const list = spread ? targets : targets.slice(0, 1);
    list.forEach(({ t }) => t.takeHit(w.damage, w.knockback, this.facing, {}));

    // Arc Cutter: the bolt jumps from the struck enemy to nearby foes, dealing
    // reduced damage down the chain with a crackling visual link each hop.
    if (w.chain && list.length) {
      this._chainArc(list[0].t, w);
    }
  }

  /** Chain an electric arc outward from `from` to the nearest un-hit enemies. */
  _chainArc(from, w) {
    const hops = w.chain || 0;
    const reach = w.chainRange || 50;
    const struck = new Set([from]);
    let src = from;
    for (let i = 0; i < hops; i++) {
      let best = null;
      let bestD = reach;
      this.scene.enemies?.getChildren().forEach((e) => {
        if (!e.active || e.dead || struck.has(e)) return;
        const d = Phaser.Math.Distance.Between(src.x, src.y, e.x, e.y);
        if (d < bestD) { bestD = d; best = e; }
      });
      if (!best) break;
      this._arcBolt(src.x, src.y - 12, best.x, best.y - 12);
      const dir = best.x >= src.x ? 1 : -1;
      best.takeHit(w.damage * (0.7 - i * 0.12), w.knockback * 0.5, dir, {});
      struck.add(best);
      src = best;
    }
  }

  _arcBolt(x1, y1, x2, y2) {
    const g = this.scene.add.graphics().setDepth(47);
    g.lineStyle(2, 0x9fe8ff, 0.95);
    g.beginPath();
    g.moveTo(x1, y1);
    const segs = 4;
    for (let i = 1; i <= segs; i++) {
      const tx = Phaser.Math.Linear(x1, x2, i / segs) + (i < segs ? Phaser.Math.Between(-5, 5) : 0);
      const ty = Phaser.Math.Linear(y1, y2, i / segs) + (i < segs ? Phaser.Math.Between(-5, 5) : 0);
      g.lineTo(tx, ty);
    }
    g.strokePath();
    this.scene.particles?.sparkBurst(x2, y2, 4);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 110, onComplete: () => g.destroy() });
  }

  /** Lob a thrown projectile (Molotov). The scene owns the flight + impact. */
  _throwProjectile() {
    const w = this.weapon;
    this.attackCd = w.cooldown || 800;
    this.attacking = true;
    this.swingStart = this.scene.time.now;
    this.scene.time.delayedCall(170, () => { this.attacking = false; });
    audio.play(w.sound);
    this.weaponSprite.setAngle(this.facing > 0 ? -45 : 45);
    this.scene.spawnPlayerProjectile?.(this, w);
  }

  /** Emit a short freezing cone that slows and freezes foes in front. */
  _sprayCryo() {
    const w = this.weapon;
    this.attackCd = w.cooldown || 90;
    this.attacking = true;
    this.swingStart = this.scene.time.now;
    this.scene.time.delayedCall(80, () => { this.attacking = false; });
    if (Math.random() < 0.4) audio.play(w.sound);

    const range = w.range || 64;
    const h = w.arcHeight || 30;
    const ox = this.x + this.facing * (range / 2 + 6);
    const oy = this.y - 14;
    const vfx = this.scene.add.rectangle(ox, oy, range, h, 0x9fe8ff, 0.16).setDepth(44);
    this.scene.tweens.add({ targets: vfx, alpha: 0, scaleX: 1.1, duration: 130, onComplete: () => vfx.destroy() });
    this.scene.particles.smokePuff(ox + this.facing * 6, oy, 2);

    this.scene.enemies?.getChildren().forEach((t) => {
      if (!t.active || t.dead) return;
      const rel = (t.x - this.x) * this.facing;
      if (rel > -8 && rel <= range && Math.abs(t.y - this.y) < h && typeof t.applySlow === 'function') {
        t.applySlow(w.slow, w.slowMs);
        t.applyFreeze(w.freezePerTick);
      }
    });
  }

  _rangedTracer(y, range) {
    const tracer = this.scene.add
      .rectangle(this.x + this.facing * (range / 2 + 10), y, range, 2, 0xfff2a8, 0.85)
      .setDepth(46);
    this.scene.tweens.add({ targets: tracer, alpha: 0, duration: 90, onComplete: () => tracer.destroy() });
  }

  _setGrind(on) {
    if (on === this.grinding) {
      if (on) this._positionAttackZone(); // keep zone tracking the player
      return;
    }
    this.grinding = on;
    this.attackZone.body.enable = on;
    audio.revChainsaw(on);
    if (on) {
      this._positionAttackZone();
    }
  }

  _swing(heavy) {
    const w = this.weapon;
    this.attacking = true;
    this.heavySwing = heavy;
    this.swingId++;
    this.hitThisSwing.clear();
    this.swingStart = this.scene.time.now;
    const dur = (w.attackTime || 220) * (heavy ? 1.3 : 1);
    this.attackCd = dur + (w.cooldown || 100);

    // Active hit window: middle of the swing.
    this.scene.time.delayedCall(dur * 0.25, () => this._enableZone());
    this.scene.time.delayedCall(dur * 0.8, () => this._disableZone());
    this.scene.time.delayedCall(dur, () => {
      this.attacking = false;
    });

    // Weapon arc tween + slash VFX. flipX mirrors the sprite, so the left arc
    // is the negation of the right arc (not a 180 offset, which would point it
    // back to the right).
    this.weaponSprite.setAngle(this.facing > 0 ? -70 : 70);
    this.scene.tweens.add({
      targets: this.weaponSprite,
      angle: this.facing > 0 ? 70 : -70,
      duration: dur * 0.7,
      ease: 'Cubic.easeIn',
    });
    this._spawnSlash();
    audio.play('slash');
  }

  _spawnSlash() {
    const slash = this.scene.add
      .image(this.x + this.facing * 16, this.y - 14, 'slash_arc')
      .setDepth(45)
      .setFlipX(this.facing < 0)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 160,
      onComplete: () => slash.destroy(),
    });
  }

  _enableZone() {
    if (this.dead) return;
    this.attackZone.body.enable = true;
    this._positionAttackZone();
  }

  _disableZone() {
    if (this.weapon.continuous && this.grinding) return;
    this.attackZone.body.enable = false;
  }

  _positionAttackZone() {
    const w = this.weapon;
    const reach = w.reach;
    this.attackZone.setSize(reach, w.arcHeight);
    this.attackZone.body.setSize(reach, w.arcHeight);
    this.attackZone.setPosition(
      this.x + this.facing * (reach / 2 + 4),
      this.y - 14
    );
    this.attackZone.body.reset(this.attackZone.x, this.attackZone.y);
  }

  _syncWeapon() {
    const offX = this.facing * 7;
    this.weaponSprite.setPosition(this.x + offX, this.y - 14);
    // Mirror with scaleX (NOT flipX): the sprite's origin sits at the grip
    // (~0.1), so flipX would only mirror the texture and leave the blade on the
    // body with the handle jutting the wrong way. Negative scaleX flips around
    // the origin, keeping the grip at the hand and the blade extended outward.
    this.weaponSprite.scaleX = this.facing;
    if (this.grinding) {
      // flipX (set above) already mirrors the sprite, so the left-facing angle
      // is the NEGATION of the right-facing angle — adding 180 would flip it
      // back to pointing right.
      this.weaponSprite.setAngle(Math.sin(this.scene.time.now / 18) * 6 * this.facing);
      // continuous grind sparks at the tip
      if (Math.random() < 0.4) {
        this.scene.particles.sparkBurst(
          this.x + this.facing * this.weapon.reach,
          this.y - 14,
          1
        );
      }
    } else if (!this.attacking) {
      this.weaponSprite.setAngle(this.facing > 0 ? 8 : -8);
    }
    this.weaponSprite.setVisible(!this.dead);
  }

  _updateAnim(onGround) {
    const key = (n) => `player-${n}`;
    if (this.dead) return;
    if (this.dashing) {
      this.play(key('air'), true);
    } else if (!onGround) {
      this.play(key('air'), true);
    } else if (this.attacking || this.grinding) {
      this.play(key('attack'), true);
    } else if (Math.abs(this.body.velocity.x) > 12) {
      this.play(key('walk'), true);
    } else {
      this.play(key('idle'), true);
    }
    this.setFlipX(this.facing < 0);
    // Keep body offset correct when flipped.
    this.body.setOffset(this.flipX ? 8.5 : 8.5, 6);
  }

  _updateInvulnBlink() {
    if (this.invuln > 0 && !this.dashing) {
      this.setAlpha(Math.floor(this.scene.time.now / 60) % 2 ? 0.35 : 1);
    } else {
      this.setAlpha(1);
    }
  }

  // --- damage / life ----------------------------------------------------

  takeDamage(amount, dirX) {
    if (this.dead || this.invuln > 0 || this.dashing) return;
    // Taking a hit (e.g. a barrel blast) knocks you out of cover and exposed.
    if (this.covered) this._setCover(false);
    this.hearts = Math.max(0, this.hearts - amount);
    this.invuln = 900;
    this.setVelocity(-dirX * 180, -160);
    this.scene.fx.damagePulse();
    this.scene.fx.shake(180, 0.012);
    this.scene.fx.hitStop(60);
    audio.play('hurt');
    this.scene.events.emit(EVENTS.PLAYER_HIT, { hearts: this.hearts });
    if (this.hearts <= 0) this._die();
  }

  heal(amount = 1) {
    this.hearts = Math.min(this.maxHearts, this.hearts + amount);
    audio.play('pickup');
    this.scene.events.emit(EVENTS.PLAYER_HEAL, { hearts: this.hearts });
  }

  _die() {
    if (this.dead) return;
    this.dead = true;
    this.grinding = false;
    this.attackZone.body.enable = false;
    audio.revChainsaw(false);
    this.setVelocity(0, -180);
    this.play('player-death', true);
    this.scene.fx.slowMo(0.4, 600);
    this.scene.fx.flash(0xb3001b, 0.5, 200);
    audio.play('death');
    this.scene.events.emit(EVENTS.PLAYER_DIED, {});
  }

  respawn(x, y) {
    this.dead = false;
    this.canAct = true;
    this.hearts = this.maxHearts;
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.setAlpha(1);
    this.invuln = 1200;
    this.body.enable = true;
    this.body.setAllowGravity(true);
    this.scene.events.emit(EVENTS.PLAYER_HIT, { hearts: this.hearts });
  }
}
