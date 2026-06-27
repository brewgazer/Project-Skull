// CameraEffects
// ----------------------------------------------------------------------------
// Centralizes the "juice": screen shake, hit-stop (freeze frames), slow-motion,
// full-screen flashes and zoom punches. Every effect respects the player's
// accessibility settings (e.g. screen-shake toggle). Attach one instance per
// gameplay scene.

import { saveSystem } from './SaveSystem.js';

export class CameraEffects {
  constructor(scene) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this._hitStopActive = false;
    this._hitStopTimer = null;
    this._slowmoTimer = null;
    this._baseZoom = this.cam.zoom;

    // Reusable full-screen flash rectangle (created lazily).
    this._flash = null;
  }

  get shakeEnabled() {
    return saveSystem.settings.screenShake !== false;
  }

  /** Quick camera shake. intensity ~0.002..0.02. */
  shake(duration = 120, intensity = 0.008) {
    if (!this.shakeEnabled) return;
    this.cam.shake(duration, intensity, true);
  }

  /**
   * Freeze the entire scene for a few milliseconds — the single most important
   * ingredient of satisfying impacts. Uses real wall-clock time so it works
   * even while everything else is paused.
   */
  hitStop(ms = 60) {
    if (this._hitStopActive) {
      // Extend the current freeze rather than stacking resumes.
      clearTimeout(this._hitStopTimer);
    } else {
      this.scene.physics.world.pause();
      this.scene.anims.pauseAll();
      this.scene.tweens.pauseAll();
      this._hitStopActive = true;
    }
    this._hitStopTimer = setTimeout(() => this._resumeFromHitStop(), ms);
  }

  _resumeFromHitStop() {
    this._hitStopActive = false;
    this._hitStopTimer = null;
    if (!this.scene.scene.isActive()) return;
    this.scene.physics.world.resume();
    this.scene.anims.resumeAll();
    this.scene.tweens.resumeAll();
  }

  /** Brief slow-motion, e.g. on a perfect parry or boss kill. */
  slowMo(scale = 0.35, ms = 350) {
    clearTimeout(this._slowmoTimer);
    this.scene.time.timeScale = scale;
    this.scene.anims.globalTimeScale = scale;
    this.scene.tweens.timeScale = scale;
    this.scene.physics.world.timeScale = 1 / scale;
    this._slowmoTimer = setTimeout(() => {
      if (!this.scene.scene.isActive()) return;
      this.scene.time.timeScale = 1;
      this.scene.anims.globalTimeScale = 1;
      this.scene.tweens.timeScale = 1;
      this.scene.physics.world.timeScale = 1;
    }, ms * scale); // ms is real-time desired; convert back
  }

  /** Full-screen color flash (impact, damage, explosion). */
  flash(color = 0xffffff, alpha = 0.5, duration = 90) {
    const { width, height } = this.scene.scale.gameSize;
    if (!this._flash) {
      this._flash = this.scene.add
        .rectangle(0, 0, width, height, color, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(9000);
    }
    this._flash.setFillStyle(color, 1).setAlpha(alpha).setVisible(true);
    this.scene.tweens.add({
      targets: this._flash,
      alpha: 0,
      duration,
      onComplete: () => this._flash && this._flash.setVisible(false),
    });
  }

  /** Vignette-style red pulse when the player is hurt. */
  damagePulse() {
    this.flash(0xb3001b, 0.4, 160);
  }

  /** Punch the zoom in then ease back — used on big hits / boss intros. */
  zoomPunch(amount = 0.12, duration = 220) {
    const target = this._baseZoom + amount;
    this.scene.tweens.add({
      targets: this.cam,
      zoom: target,
      duration: duration * 0.3,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** Smoothly settle to a zoom level (e.g. dynamic boss-arena zoom). */
  zoomTo(zoom, duration = 600) {
    this._baseZoom = zoom;
    this.cam.zoomTo(zoom, duration, 'Sine.easeInOut');
  }

  /** Convenience combo used by most heavy melee impacts. */
  impact({ shake = 0.01, shakeMs = 140, stop = 50, flash = 0, zoom = 0 } = {}) {
    if (stop) this.hitStop(stop);
    if (shake) this.shake(shakeMs, shake);
    if (flash) this.flash(flash, 0.35, 80);
    if (zoom) this.zoomPunch(zoom);
  }

  destroy() {
    clearTimeout(this._hitStopTimer);
    clearTimeout(this._slowmoTimer);
    // CRITICAL: hit-stop and slow-mo touch GLOBAL state (the shared animation
    // manager + time scales). If the scene shuts down mid-effect, the pending
    // timers bail out early and would leave the whole game frozen or in
    // slow-motion — which breaks the next scene (e.g. a level restart). Always
    // restore globals on teardown.
    try {
      this.scene.anims.resumeAll();
      this.scene.anims.globalTimeScale = 1;
      if (this.scene.physics?.world) {
        this.scene.physics.world.resume();
        this.scene.physics.world.timeScale = 1;
      }
      this.scene.time.timeScale = 1;
      this.scene.tweens.timeScale = 1;
    } catch (e) {
      /* scene already torn down */
    }
    this._hitStopActive = false;
    if (this._flash) this._flash.destroy();
  }
}
