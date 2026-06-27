// Destructible
// ----------------------------------------------------------------------------
// Breakable scenery (crates, explosive barrels). Shares the takeHit() contract
// with Enemy so the player's combat code treats everything uniformly. Barrels
// chain-react and damage nearby enemies — the basis for environmental kills.

import Phaser from 'phaser';
import { TEX } from '../config.js';
import { EVENTS } from '../utils/events.js';
import { audio } from '../systems/AudioManager.js';
import { randInt } from '../utils/math.js';

const TEX_FOR_KIND = {
  barrel: TEX.BARREL,
  coverbarrel: TEX.COVER_BARREL,
  door: TEX.DOOR,
  crate: TEX.CRATE,
};

export class Destructible extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind = 'crate') {
    super(scene, x, y, TEX_FOR_KIND[kind] || TEX.CRATE, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.kind = kind;
    this.dead = false;
    this.hp = kind === 'barrel' ? 1 : kind === 'door' ? 4 : kind === 'coverbarrel' ? 10 : 3;
    this.explosive = kind === 'barrel';
    // Crates + steel barrels can be ducked behind (explosive TNT barrels cannot).
    this.cover = kind === 'crate' || kind === 'coverbarrel';
    // Doors are bolted in place; crates/barrels are loose and fall.
    this.body.setAllowGravity(kind !== 'door');
    if (kind === 'door') this.body.setImmovable(true);
    this.body.setSize(this.width - 2, this.height - 2);
    this.setDepth(30);
    this.dropChance = kind === 'crate' ? 0.25 : kind === 'door' ? 0.6 : 0;
  }

  takeHit(amount, knockback, dirX) {
    if (this.dead) return;
    this.hp -= amount;
    this.scene.fx.shake(60, 0.004);
    this.setVelocityX(dirX * Math.min(40, knockback * 0.1));
    this.scene.particles.dustKick(this.x, this.y - this.height / 2, 2);
    if (this.hp <= 0) this.break(dirX);
    else {
      this.setTintFill(0xffffff);
      this.scene.time.delayedCall(50, () => this.active && this.clearTint());
    }
  }

  break(dirX = 1) {
    if (this.dead) return;
    this.dead = true;
    this.body.enable = false;
    const cx = this.x;
    const cy = this.y - this.height / 2;

    if (this.explosive) {
      this.explode(cx, cy);
    } else {
      audio.play('crateBreak');
      this.scene.particles.smokePuff(cx, cy, 4);
      this.scene.particles.dustKick(cx, cy, 8);
      this.scene.events.emit(EVENTS.SCORE_CHANGED, {}); // noop guard
      this.scene.scoreSystem.add(25, { x: cx, y: cy });
      if (Math.random() < this.dropChance) this.scene.spawnPickup?.(cx, this.y - 4);
    }
    this.setActive(false).setVisible(false);
    this.destroy();
  }

  explode(cx, cy) {
    audio.play('explosion');
    this.scene.particles.explosion(cx, cy);
    this.scene.fx.impact({ shake: 0.025, shakeMs: 260, stop: 60, flash: 0xffa040, zoom: 0.08 });
    this.scene.scoreSystem.award('barrel', { x: cx, y: cy });

    // Damage everything within blast radius.
    const radius = 56;
    const enemies = this.scene.enemies?.getChildren?.() || [];
    enemies.forEach((e) => {
      if (!e.active || e.dead) return;
      const d = Phaser.Math.Distance.Between(cx, cy, e.x, e.y - 12);
      if (d <= radius) {
        const dir = Math.sign(e.x - cx) || 1;
        e.takeHit(6, 320, dir, { gib: true, environmental: true });
        this.scene.events.emit(EVENTS.SCORE_CHANGED, { x: e.x, y: e.y });
      }
    });
    // The blast also catches the player — cover does NOT stop an explosion, so
    // enemies can shoot a barrel near you to flush you out of hiding.
    const p = this.scene.player;
    if (p && !p.dead) {
      const d = Phaser.Math.Distance.Between(cx, cy, p.x, p.y - 12);
      if (d <= radius + 6) p.takeDamage(1, Math.sign(p.x - cx) || 1);
    }
    // Chain-react nearby barrels.
    const others = this.scene.destructibles?.getChildren?.() || [];
    others.forEach((o) => {
      if (o === this || o.dead || !o.explosive) return;
      if (Phaser.Math.Distance.Between(cx, cy, o.x, o.y) <= radius) {
        this.scene.time.delayedCall(randInt(40, 120), () => o.active && o.break(1));
      }
    });
  }
}
