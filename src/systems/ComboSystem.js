// ComboSystem
// ----------------------------------------------------------------------------
// Tracks the player's combo chain and damage multiplier. A combo decays if the
// player goes too long without landing a hit, rewarding aggression. Emits
// events the HUD listens to.

import { EVENTS } from '../utils/events.js';

const TIERS = [
  { at: 0, label: '', mult: 1 },
  { at: 4, label: 'NICE', mult: 1.25 },
  { at: 8, label: 'SAVAGE', mult: 1.5 },
  { at: 15, label: 'BRUTAL', mult: 2 },
  { at: 25, label: 'MASSACRE', mult: 2.5 },
  { at: 40, label: 'CARNAGE', mult: 3 },
  { at: 60, label: 'UNSTOPPABLE', mult: 4 },
];

export class ComboSystem {
  constructor(scene, { window = 2600 } = {}) {
    this.scene = scene;
    this.window = window; // ms before the combo drops
    this.count = 0;
    this.best = 0;
    this.timer = 0;
    this.tier = TIERS[0];
  }

  add(n = 1) {
    this.count += n;
    this.best = Math.max(this.best, this.count);
    this.timer = this.window;
    const tier = this._tierFor(this.count);
    const tierChanged = tier !== this.tier;
    this.tier = tier;
    this.scene.events.emit(EVENTS.COMBO_CHANGED, {
      count: this.count,
      tier,
      tierChanged,
      mult: tier.mult,
    });
    return tierChanged;
  }

  _tierFor(count) {
    let t = TIERS[0];
    for (const tier of TIERS) if (count >= tier.at) t = tier;
    return t;
  }

  get multiplier() {
    return this.tier.mult;
  }

  update(dt) {
    if (this.count === 0) return;
    this.timer -= dt;
    if (this.timer <= 0) this.break();
  }

  break() {
    if (this.count === 0) return;
    const had = this.count;
    this.count = 0;
    this.tier = TIERS[0];
    this.scene.events.emit(EVENTS.COMBO_BROKEN, { had });
    this.scene.events.emit(EVENTS.COMBO_CHANGED, {
      count: 0,
      tier: this.tier,
      tierChanged: true,
      mult: 1,
    });
  }

  /** 0..1 fraction of the decay window remaining (for the HUD timer bar). */
  get fraction() {
    return this.count === 0 ? 0 : Math.max(0, this.timer / this.window);
  }
}
