// ParticleSystem
// ----------------------------------------------------------------------------
// A thin, reusable wrapper around Phaser particle emitters for all the gory
// combat feedback: blood spray, flying gibs, sparks, smoke, dust and shell
// casings. Emitters are created once and reused via explode() bursts.
// Blood density honours the accessibility "blood intensity" setting.

import { TEX, PALETTE } from '../config.js';
import { saveSystem } from './SaveSystem.js';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.depth = 50;

    this.blood = scene.add.particles(0, 0, TEX.BLOOD, {
      lifespan: 700,
      speed: { min: 40, max: 180 },
      angle: { min: 0, max: 360 },
      gravityY: 600,
      scale: { start: 1.2, end: 0.4 },
      rotate: { min: 0, max: 360 },
      frame: [0, 1, 2],
      emitting: false,
    }).setDepth(this.depth);

    this.gibs = scene.add.particles(0, 0, TEX.GIB, {
      lifespan: 1200,
      speed: { min: 80, max: 220 },
      angle: { min: -120, max: -60 },
      gravityY: 700,
      scale: { start: 1, end: 1 },
      rotate: { min: -360, max: 360 },
      bounce: 0.4,
      emitting: false,
    }).setDepth(this.depth);

    this.sparks = scene.add.particles(0, 0, TEX.SPARK, {
      lifespan: 350,
      speed: { min: 60, max: 200 },
      angle: { min: 0, max: 360 },
      gravityY: 200,
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(this.depth + 1);

    this.smoke = scene.add.particles(0, 0, TEX.SMOKE, {
      lifespan: 900,
      speed: { min: 10, max: 40 },
      angle: { min: -100, max: -80 },
      scale: { start: 0.6, end: 1.8 },
      alpha: { start: 0.5, end: 0 },
      emitting: false,
    }).setDepth(this.depth + 2);

    this.dust = scene.add.particles(0, 0, TEX.DUST, {
      lifespan: 500,
      speed: { min: 20, max: 70 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.5, end: 1.2 },
      alpha: { start: 0.6, end: 0 },
      emitting: false,
    }).setDepth(this.depth);

    this.casings = scene.add.particles(0, 0, TEX.SPARK, {
      lifespan: 900,
      speedX: { min: -120, max: -40 },
      speedY: { min: -180, max: -90 },
      gravityY: 800,
      scale: { start: 0.8, end: 0.8 },
      rotate: { min: 0, max: 360 },
      tint: PALETTE.hazard,
      bounce: 0.5,
      emitting: false,
    }).setDepth(this.depth);
  }

  get bloodScale() {
    return saveSystem.settings.bloodIntensity ?? 1;
  }

  bloodSpray(x, y, dir = 1, amount = 10) {
    const b = this.bloodScale;
    if (b <= 0) return;
    const count = Math.round(amount * b);
    this.blood.explode(count, x, y);
  }

  bloodHit(x, y, dir = 1) {
    this.bloodSpray(x, y, dir, 8);
  }

  splatterGibs(x, y, amount = 6) {
    const b = this.bloodScale;
    if (b <= 0) return;
    this.gibs.explode(Math.round(amount * b), x, y);
    this.bloodSpray(x, y, 1, 16);
  }

  sparkBurst(x, y, amount = 8) {
    this.sparks.explode(amount, x, y);
  }

  smokePuff(x, y, amount = 4) {
    this.smoke.explode(amount, x, y);
  }

  dustKick(x, y, amount = 5) {
    this.dust.explode(amount, x, y);
  }

  shellCasing(x, y, dir = 1) {
    this.casings.explode(1, x, y);
  }

  explosion(x, y) {
    this.smokePuff(x, y, 12);
    this.sparkBurst(x, y, 24);
    this.bloodSpray(x, y, 1, 6);
    this.dustKick(x, y, 10);
  }

  destroy() {
    [this.blood, this.gibs, this.sparks, this.smoke, this.dust, this.casings].forEach(
      (e) => e && e.destroy()
    );
  }
}
