// Enemy
// ----------------------------------------------------------------------------
// Generic, data-driven enemy entity with a compact AI state machine. A single
// class covers grunts, runners, bruisers and the mini-boss; behaviour is
// selected by the archetype's `behavior` field. Designed to be recycled by a
// Phaser group for pooling.

import Phaser from 'phaser';
import { ENEMIES } from '../data/enemies.js';
import { EVENTS } from '../utils/events.js';
import { audio } from '../systems/AudioManager.js';
import { clamp, sign } from '../utils/math.js';

const STATE = {
  IDLE: 'idle',
  CHASE: 'chase',
  WINDUP: 'windup',
  RECOVER: 'recover',
  HURT: 'hurt',
  DEAD: 'dead',
  CHARGE: 'charge',
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, archetypeId = 'grunt') {
    super(scene, x, y, ENEMIES[archetypeId].texture, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1); // feet anchored
    this.body.setSize(12, 26).setOffset(8, 6);
    this.spawn(x, y, archetypeId);
  }

  /** (Re)initialise — supports group recycling. */
  spawn(x, y, archetypeId) {
    const cfg = ENEMIES[archetypeId];
    this.cfg = cfg;
    this.archetypeId = archetypeId;
    // Kill any leftover death/fade tweens from a previous life and restore full
    // opacity — otherwise a recycled corpse spawns invisible.
    this.scene.tweens.killTweensOf(this);
    this.setTexture(cfg.texture, 0);
    this.setPosition(x, y);
    this.setScale(cfg.scale || 1);
    this.setAlpha(1);
    this.setActive(true).setVisible(true);
    this.body.enable = true;
    // Stay inside the level so a heavy knockback can't fling an enemy off the
    // edge into the void where it never lands, never dies, and stalls the wave.
    this.setCollideWorldBounds(true);
    this.setVelocity(0, 0);
    this.setTint(0xffffff);
    this.clearTint();
    this.__nextSawTick = 0;

    this.maxHp = cfg.hp;
    this.hp = cfg.hp;
    this.state = STATE.IDLE;
    this.stateTimer = 0;
    this.attackCd = 0;
    this.hurtTimer = 0;
    this.staggered = false;
    this.dead = false;
    this.facing = -1;
    this.isBoss = !!cfg.isBoss;
    this.phase = 1;
    this.chargeCd = 2000;
    this.jumpCd = 0; // gates platform-climbing hops
    this.shootCd = 600; // gates ranged (gunner) fire
    // Enemies lie dormant until the player gets close (keeps wide levels calm).
    this.aggro = !!cfg.isBoss;
    this.activateRange = cfg.activateRange || 150;

    // Status effects (Cryo Sprayer et al.).
    this.speedMul = 1;
    this.slowUntil = 0;
    this.freeze = 0;
    this.frozen = false;
    this.frozenUntil = 0;
    this.freezeNeed = 6 + cfg.hp * 0.6;

    this.play(`${cfg.texture}-idle`, true);
    if (this.isBoss) {
      this.scene.events.emit(EVENTS.BOSS_SPAWNED, this);
      audio.play('bossRoar');
    }
    return this;
  }

  get player() {
    return this.scene.player;
  }

  /** Slow this enemy's movement for a while (e.g. cryo vapor). */
  applySlow(factor, ms) {
    if (this.dead) return;
    this.speedMul = Math.min(this.speedMul || 1, factor);
    this.slowUntil = this.scene.time.now + ms;
    if (!this.frozen) this.setTint(0x9fe8ff);
  }

  /** Build the freeze meter; once full the enemy is locked solid and shatters
   *  for bonus damage on the next hit. Bosses resist a full freeze. */
  applyFreeze(amount) {
    if (this.dead || this.frozen || this.isBoss) return;
    this.freeze = (this.freeze || 0) + amount;
    if (this.freeze >= this.freezeNeed) {
      this.frozen = true;
      this.frozenUntil = this.scene.time.now + 1600;
      this.setVelocity(0, this.body.velocity.y);
      this.setTintFill(0xbfefff);
      this.state = STATE.HURT;
      this.hurtTimer = 0;
    }
  }

  takeHit(amount, knockback, dirX, opts = {}) {
    if (this.dead) return;
    this.aggro = true;
    // Frozen foes shatter: any blow does massive bonus damage and gibs. The
    // flat term (scaled to the foe's size) guarantees even a weak hit shatters
    // lighter enemies outright, while tanks still need a real swing.
    if (this.frozen) {
      amount = amount * 2.4 + this.maxHp * 0.6;
      opts = { ...opts, gib: true };
      this.frozen = false;
      audio.play('gib');
    }
    let dmg = amount;
    // Armored enemies shrug off damage until staggered by a heavy blow.
    if (this.cfg.armor && !this.staggered) dmg *= this.cfg.armor;
    this.hp -= dmg;

    // Knockback, reduced by archetype resistance.
    const kb = knockback / (this.cfg.knockbackResist || 1);
    if (kb > 0) {
      this.setVelocityX(dirX * kb);
      this.setVelocityY(-kb * 0.25);
    }

    // Hit reaction.
    this.hurtTimer = 140;
    this.state = STATE.HURT;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (!this.dead) this.clearTint();
    });

    if (opts.heavy && this.cfg.armor) this.staggered = true;

    this.scene.particles.bloodHit(this.x, this.y - this.displayHeight * 0.5, dirX);
    this.scene.events.emit(EVENTS.ENEMY_HIT, { enemy: this, dmg });

    if (this.hp <= 0) {
      this.die({ ...opts, dirX });
    } else {
      this.play(`${this.cfg.texture}-hurt`, true);
    }
  }

  /** Instant stylish kill (heavy attack on a weakened foe). */
  execute(dirX = 1) {
    if (this.dead) return;
    this.hp = 0;
    this.die({ execution: true, dirX });
  }

  die(opts = {}) {
    if (this.dead) return;
    this.dead = true;
    this.state = STATE.DEAD;
    this.body.enable = false;
    this.setVelocity(0, 0);

    const cx = this.x;
    const cy = this.y - this.displayHeight * 0.5;

    if (opts.execution || opts.gib) {
      this.scene.particles.splatterGibs(cx, cy, this.isBoss ? 18 : 8);
      audio.play('gib');
      this.scene.fx.slowMo(0.4, 280);
    } else {
      this.scene.particles.bloodSpray(cx, cy, opts.dirX || 1, 14);
      audio.play('death');
    }

    this.scene.events.emit(EVENTS.ENEMY_KILLED, {
      enemy: this,
      x: cx,
      y: cy,
      score: this.cfg.scoreKill,
      execution: !!opts.execution,
      isBoss: this.isBoss,
    });

    // Death animation, then fade out and recycle.
    this.play(`${this.cfg.texture}-death`, true);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: this.isBoss ? 900 : 450,
      duration: 350,
      onComplete: () => this.deactivate(),
    });
  }

  deactivate() {
    this.setActive(false).setVisible(false);
    this.body.enable = false;
    if (this.killOnDeactivate) this.destroy();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.dead || !this.active) return;

    this.attackCd = Math.max(0, this.attackCd - delta);
    this.chargeCd = Math.max(0, this.chargeCd - delta);
    this.jumpCd = Math.max(0, this.jumpCd - delta);
    this.shootCd = Math.max(0, this.shootCd - delta);

    // Status: slow expiry + frozen lockout.
    if (this.slowUntil && time > this.slowUntil) {
      this.speedMul = 1;
      this.slowUntil = 0;
      if (!this.frozen) this.clearTint();
    }
    if (this.frozen) {
      this.setVelocityX(0);
      if (time > this.frozenUntil) {
        this.frozen = false;
        this.freeze = 0;
        this.clearTint();
        this.state = STATE.CHASE;
      } else {
        this.play(`${this.cfg.texture}-idle`, true);
        return;
      }
    }

    if (this.state === STATE.HURT) {
      this.hurtTimer -= delta;
      if (this.hurtTimer <= 0) this.state = STATE.CHASE;
      return;
    }
    if (this.state === STATE.WINDUP || this.state === STATE.RECOVER) {
      this.stateTimer -= delta;
      this.setVelocityX(this.body.velocity.x * 0.85);
      if (this.stateTimer <= 0) this._resolveAttack();
      return;
    }
    if (this.state === STATE.CHARGE) {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0 || this.body.blocked.left || this.body.blocked.right) {
        this.state = STATE.RECOVER;
        this.stateTimer = 500;
        this.setVelocityX(0);
      }
      return;
    }

    if (!this.player || !this.player.active) {
      this.setVelocityX(0);
      this.play(`${this.cfg.texture}-idle`, true);
      return;
    }

    this._think(delta);
  }

  _think(delta) {
    const dx = this.player.x - this.x;
    const dist = Math.abs(dx);
    // Vertical gap matters too: an enemy a floor below/above must not be able
    // to "reach" the player through a platform.
    const dy = Math.abs(this.player.y - this.y);

    // Stay dormant until the player approaches or we've been hit.
    if (!this.aggro) {
      if (dist < this.activateRange) this.aggro = true;
      else {
        this.setVelocityX(this.body.velocity.x * 0.8);
        this.play(`${this.cfg.texture}-idle`, true);
        return;
      }
    }

    this.facing = sign(dx) || this.facing;
    this.setFlipX(this.facing < 0 ? false : true); // art faces right by default

    // Gunners fight at range with firearms (combat-shooter levels).
    if (this.cfg.behavior === 'gunner') {
      this._gunnerThink(delta, dist, dy);
      return;
    }

    // Boss occasionally charges across the arena.
    if (this.isBoss && this.chargeCd <= 0 && dist > 50 && dist < 220) {
      this._startCharge();
      return;
    }

    // Hop onto raised platforms so the player can't kite the boss from a ledge.
    // Trigger when grounded, the player is meaningfully above us, and within
    // horizontal range — either pressed against the platform wall or just close.
    if (this.cfg.canJump) {
      const grounded = this.body.blocked.down || this.body.onFloor();
      const playerAbove = this.player.y < this.y - 10;
      const blockedAhead = this.body.blocked.left || this.body.blocked.right;
      if (grounded && playerAbove && this.jumpCd <= 0 && dist < 260 && (blockedAhead || dist < 90)) {
        this.setVelocityY(this.cfg.jumpVelocity || -360);
        this.jumpCd = 650;
      }
    }

    if (dist > this.cfg.attackRange || dy > 30) {
      // Chase (also when the player is on a different vertical level).
      const targetVx = this.facing * this.cfg.speed * (this.speedMul || 1) * (this.isBoss && this.phase >= 2 ? 1.3 : 1);
      const ax = this.cfg.accel * (delta / 1000);
      this.setVelocityX(clamp(this.body.velocity.x + this.facing * ax, -Math.abs(targetVx), Math.abs(targetVx)));
      this.state = STATE.CHASE;
      this.play(`${this.cfg.texture}-walk`, true);
    } else {
      // In range — attack if ready.
      this.setVelocityX(this.body.velocity.x * 0.8);
      if (this.attackCd <= 0) this._startWindup();
      else this.play(`${this.cfg.texture}-idle`, true);
    }
  }

  /** Ranged "gunner" AI: hold a preferred distance and fire bursts. Will
   *  sometimes target an explosive barrel near the player to flush out cover. */
  _gunnerThink(delta, dist, dy) {
    const cfg = this.cfg;
    const pref = cfg.prefersRange || 130;
    let moveDir = 0;
    if (dist > cfg.shootRange) moveDir = this.facing;        // close in to firing range
    else if (dist < pref - 26) moveDir = -this.facing;       // back off if crowded

    if (moveDir !== 0) {
      const targetVx = moveDir * cfg.speed * (this.speedMul || 1);
      const ax = cfg.accel * (delta / 1000);
      this.setVelocityX(clamp(this.body.velocity.x + moveDir * ax, -Math.abs(targetVx), Math.abs(targetVx)));
      this.play(`${cfg.texture}-walk`, true);
    } else {
      this.setVelocityX(this.body.velocity.x * 0.8);
      this.play(`${cfg.texture}-idle`, true);
    }

    if (this.shootCd <= 0 && dist <= cfg.shootRange && dy < 56) this._fireGun();
  }

  _fireGun() {
    const cfg = this.cfg;
    this.shootCd = cfg.shootCooldown || 1100;
    this.play(`${cfg.texture}-attack`, true);
    this.setTint(0xffd0a0);
    this.scene.time.delayedCall(90, () => { if (!this.dead) this.clearTint(); });

    // Aim at the player, or — with some chance — an explosive barrel beside them.
    let tx = this.player.x;
    let ty = this.player.y - 12;
    if (Math.random() < (cfg.barrelAimChance || 0.35)) {
      const b = this._nearbyExplosiveBarrel();
      if (b) { tx = b.x; ty = b.y - b.height * 0.4; }
    }
    this.scene.spawnEnemyShot?.(
      this.x + this.facing * 9, this.y - this.displayHeight * 0.55,
      tx, ty, cfg.projectileDamage || 1, cfg.projectileSpeed || 240
    );
    audio.play('hit');
  }

  _nearbyExplosiveBarrel() {
    const ds = this.scene.destructibles?.getChildren?.() || [];
    let best = null;
    let bd = 150;
    for (const o of ds) {
      if (!o.active || o.dead || !o.explosive) continue;
      const d = Math.abs(o.x - this.player.x);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  _startWindup() {
    this.state = STATE.WINDUP;
    this.stateTimer = this.cfg.attackWindup;
    this.play(`${this.cfg.texture}-attack`, true);
    // Telegraph with a brief tint so players can time their counter.
    this.setTint(0xffd0d0);
    this.scene.time.delayedCall(Math.min(120, this.cfg.attackWindup), () => {
      if (!this.dead) this.clearTint();
    });
  }

  _resolveAttack() {
    if (this.state === STATE.WINDUP) {
      // Deal damage if the player is still in reach (horizontally and vertically).
      const dist = Math.abs(this.player.x - this.x);
      const dyHit = Math.abs(this.player.y - this.y);
      if (dist <= this.cfg.attackRange + 6 && dyHit < 30 && this.player.active) {
        this.player.takeDamage(this.cfg.attackDamage, sign(this.player.x - this.x));
      }
      this.state = STATE.RECOVER;
      this.stateTimer = 220;
      this.attackCd = this.cfg.attackCooldown;
    } else {
      this.state = STATE.CHASE;
    }
  }

  _startCharge() {
    this.state = STATE.CHARGE;
    this.stateTimer = 800;
    this.chargeCd = 4200;
    this.setTint(0xffa040);
    this.scene.time.delayedCall(300, () => {
      if (this.dead) return;
      this.clearTint();
      this.setVelocityX(this.facing * this.cfg.speed * 4);
      this.play(`${this.cfg.texture}-walk`, true);
      audio.play('bossRoar');
    });
  }

  /** Boss phase transition (called by the level when HP crosses a threshold). */
  enterPhase(phase) {
    this.phase = phase;
    this.scene.events.emit(EVENTS.BOSS_PHASE, { enemy: this, phase });
    this.scene.fx.flash(0xffa040, 0.4, 200);
    this.scene.fx.zoomPunch(0.1);
    audio.play('bossRoar');
  }
}
