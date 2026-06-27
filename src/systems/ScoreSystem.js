// ScoreSystem
// ----------------------------------------------------------------------------
// Owns the running score and the end-of-level bonus tally + letter rank. Score
// from kills/executions is scaled by the live combo multiplier to reward
// stylish, uninterrupted play.

import { EVENTS } from '../utils/events.js';

export const BASE_POINTS = {
  kill: 100,
  execution: 250,
  crateBreak: 25,
  barrel: 150,
  environmentalKill: 300,
  perfectParry: 200,
  collectible: 500,
};

export class ScoreSystem {
  constructor(scene, comboSystem) {
    this.scene = scene;
    this.combo = comboSystem;
    this.score = 0;
    this.startTime = scene.time.now;

    // Bonus tracking for the results screen.
    this.kills = 0;
    this.executions = 0;
    this.environmentalKills = 0;
    this.collectiblesFound = 0;
    this.tookDamage = false;
    this.secretsFound = 0;
  }

  add(points, { applyCombo = true, x = null, y = null } = {}) {
    const mult = applyCombo ? this.combo.multiplier : 1;
    const gained = Math.round(points * mult);
    this.score += gained;
    this.scene.events.emit(EVENTS.SCORE_CHANGED, { score: this.score, gained, x, y });
    return gained;
  }

  award(type, opts = {}) {
    const base = BASE_POINTS[type] ?? 0;
    if (type === 'kill') this.kills++;
    if (type === 'execution') this.executions++;
    if (type === 'environmentalKill') this.environmentalKills++;
    if (type === 'collectible') this.collectiblesFound++;
    return this.add(base, opts);
  }

  markDamaged() {
    this.tookDamage = true;
  }

  get elapsedMs() {
    return this.scene.time.now - this.startTime;
  }

  /**
   * Compute the end-of-level breakdown and an S/A/B/C/D rank. `par` is the
   * target completion time in ms for full time bonus.
   */
  finalize({ par = 90000 } = {}) {
    const timeBonus = Math.max(0, Math.round((par - this.elapsedMs) / 100) * 10);
    const styleBonus = this.combo.best * 50;
    const executionBonus = this.executions * BASE_POINTS.execution;
    const noHitBonus = this.tookDamage ? 0 : 5000;
    const secretBonus = this.secretsFound * 1000;

    const total =
      this.score + timeBonus + styleBonus + noHitBonus + secretBonus;

    const rank = this._rank(total, noHitBonus > 0);
    return {
      base: this.score,
      timeBonus,
      styleBonus,
      executionBonus,
      noHitBonus,
      secretBonus,
      bestCombo: this.combo.best,
      total,
      rank,
      kills: this.kills,
      executions: this.executions,
      timeMs: this.elapsedMs,
    };
  }

  _rank(total, noHit) {
    if (total >= 20000 && noHit) return 'S';
    if (total >= 14000) return 'A';
    if (total >= 9000) return 'B';
    if (total >= 5000) return 'C';
    return 'D';
  }
}
