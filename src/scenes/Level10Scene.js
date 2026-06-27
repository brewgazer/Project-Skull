// Level10Scene — "Maximum Security Prison" (EXPANSION, first of Levels 10-18)
// The player breaks into a prison mid-riot. New, reusable mechanics debut here:
// gated security doors (clear the block to advance), collapsing catwalks,
// wall-mounted automated turrets, and electrified perimeter fences. Two new
// weapons are introduced: the Revolver (start loadout) and the Arc Cutter
// (selectable in boss prep rooms / future pickups).

import { SCENES, TEX } from '../config.js';
import { BaseLevelScene, GROUND_Y } from './BaseLevelScene.js';
import { randInt } from '../utils/math.js';

export class Level10Scene extends BaseLevelScene {
  constructor() {
    super(SCENES.LEVEL_10);
  }

  get levelNumber() { return 10; }
  get parTime() { return 135000; }
  get startWeapon() { return 'revolver'; }
  get nextScene() { return SCENES.LEVEL_11; }

  buildLevel() {
    this.worldWidth = 2640;

    // Per-mechanic state.
    this.alarmLights = [];
    this.alarmOn = false;
    this.catwalks = [];
    this.turrets = [];
    this.turretShots = [];
    this.gateOpen = false;
    this.gateWaveTriggered = false;
    this.gateEnemies = [];
    this.finalTriggered = false;
    this.finalCleared = false;
    this.finalEnemies = [];

    // Exit is gated behind the final yard fight.
    this.canComplete = false;

    this._buildPrisonBackdrop();
    this.addGround();

    // --- Segment 1: intake hall — loose inmates ---
    this.player.setPosition(60, GROUND_Y);
    this.addCheckpoint(60);
    this.spawnEnemy('inmate', 240);
    this.spawnEnemy('inmate', 320);

    // --- Segment 2: electrified perimeter fences (jump them) ---
    this._fence(470);
    this._fence(560);
    this.addDestructible(640, GROUND_Y, 'crate');

    // --- Segment 3: locked security gate (clears on riot wave) ---
    this._buildGate(940);

    // --- Segment 4: collapsing catwalk over an electrified floor ---
    // A live floor strip in the pit punishes a fall, so cross before the
    // grating gives way.
    this.addHazard(1340, GROUND_Y - 5, 360, 10, { texture: TEX.ELECTRIC, damage: 1 });
    const cwY = GROUND_Y - 46;
    for (let i = 0; i < 4; i++) this._collapsingLedge(1180 + i * 90, cwY, 78);
    this.addLedge(1540, GROUND_Y - 46, 70, 8); // safe landing ledge

    // --- Segment 5: automated turret gauntlet ---
    this.addDestructible(1700, GROUND_Y, 'crate'); // cover
    this._turret(1820, GROUND_Y - 70);
    this.addDestructible(1980, GROUND_Y, 'crate');
    this._turret(2080, GROUND_Y - 70);
    this.spawnEnemy('inmate', 1900);

    // --- Segment 6: the yard — final riot, then the breakout door ---
    this.spawnPickup(2180, GROUND_Y - 30, 'heart');
    this.addExit(2580);

    this.setObjective('PRISON RIOT  -  FIGHT TO THE GATE \u2192');
  }

  // --- prison set dressing -------------------------------------------------

  _buildPrisonBackdrop() {
    // Dim concrete back wall.
    this.add.rectangle(0, 0, this.worldWidth, GROUND_Y, 0x14161c, 1).setOrigin(0, 0).setDepth(-12);
    // Repeating cell frames with bars.
    for (let x = 20; x < this.worldWidth; x += 80) {
      this.add.rectangle(x, 28, 60, 92, 0x0d0f14, 1).setOrigin(0, 0).setDepth(-11);
      for (let bx = x + 6; bx < x + 56; bx += 8) {
        this.add.rectangle(bx, 30, 2, 88, 0x2c2f37, 1).setOrigin(0, 0).setDepth(-10);
      }
      this.add.rectangle(x, 30, 60, 3, 0x2c2f37, 1).setOrigin(0, 0).setDepth(-10);
    }
    // Alarm strobes along the ceiling.
    for (let x = 60; x < this.worldWidth; x += 200) {
      const lamp = this.add.rectangle(x, 12, 14, 6, 0xff2b3c, 0.08).setDepth(-9);
      this.alarmLights.push(lamp);
    }
  }

  _setAlarm(on) {
    this.alarmOn = on;
    this.cameras.main.setBackgroundColor(on ? 0x140607 : 0x050507);
    for (const l of this.alarmLights) {
      if (on) {
        if (!l._tw) {
          l._tw = this.tweens.add({
            targets: l, alpha: { from: 0.12, to: 0.85 }, yoyo: true, repeat: -1, duration: 320,
          });
        }
      } else {
        l._tw?.stop();
        l._tw = null;
        l.setAlpha(0.08);
      }
    }
  }

  // --- mechanics: fences, gate, catwalks, turrets --------------------------

  _fence(x) {
    // A short electrified fence segment rising from the floor — jump it.
    this.addHazard(x, GROUND_Y - 16, 12, 32, { texture: TEX.ELECTRIC, damage: 1 });
  }

  _buildGate(x) {
    this.gateX = x;
    this.gate = this.add.rectangle(x, GROUND_Y, 16, 96, 0x23262e, 1).setOrigin(0.5, 1).setDepth(7);
    for (let i = 0; i < 4; i++) {
      this.add.rectangle(x - 5 + i * 3, GROUND_Y - 92, 2, 92, 0x3a3f48, 1).setOrigin(0.5, 0).setDepth(8);
    }
    this.gateBody = this.platforms.create(x, GROUND_Y - 48, TEX.PIXEL);
    this.gateBody.setVisible(false).setDisplaySize(16, 96).refreshBody();
  }

  _openGate() {
    if (this.gateOpen) return;
    this.gateOpen = true;
    this.gateBody.destroy();
    this.tweens.add({ targets: this.gate, y: GROUND_Y - 100, alpha: 0.35, duration: 700, ease: 'Cubic.easeIn' });
    this.fx.shake(160, 0.006);
    this._setAlarm(false);
    this.setObjective('GATE OPEN  -  PUSH DEEPER \u2192');
  }

  _collapsingLedge(x, y, w) {
    const tile = this.add.tileSprite(x, y, w, 8, TEX.FLOOR).setOrigin(0, 0).setDepth(10).setTint(0x5a5e68);
    const body = this.platforms.create(x + w / 2, y + 4, TEX.PIXEL);
    body.setVisible(false).setDisplaySize(w, 8).refreshBody();
    this.catwalks.push({ tile, body, x1: x, x2: x + w, top: y, triggered: false });
  }

  _triggerCollapse(l) {
    if (l.triggered) return;
    l.triggered = true;
    this.particles.dustKick((l.x1 + l.x2) / 2, l.top, 5);
    this.tweens.add({ targets: l.tile, x: l.tile.x + 1.5, yoyo: true, repeat: 5, duration: 55 });
    this.time.delayedCall(420, () => {
      l.body.destroy();
      this.tweens.add({
        targets: l.tile, y: l.top + 90, alpha: 0, angle: randInt(-12, 12),
        duration: 520, onComplete: () => l.tile.destroy(),
      });
    });
  }

  _turret(x, y) {
    // Wall mount + barrel. Faces whichever way the player is.
    const base = this.add.rectangle(x, y, 14, 12, 0x2a2d33, 1).setDepth(8);
    const barrel = this.add.rectangle(x, y + 1, 12, 4, 0x4a4f58, 1).setDepth(9);
    const eye = this.add.rectangle(x, y - 4, 4, 4, 0xff2b3c, 0.9).setDepth(9);
    this.turrets.push({ x, y, base, barrel, eye, fireCd: randInt(700, 1500) });
  }

  _fireTurret(t) {
    const dir = this.player.x >= t.x ? 1 : -1;
    t.barrel.x = t.x + dir * 5;
    const shot = this.addMovingHazard(t.x + dir * 8, t.y + 1, TEX.DEBRIS, { damage: 1 });
    shot.setScale(0.6);
    shot.body.setAllowGravity(false);
    shot.setVelocity(dir * 200, 0);
    shot.originX = t.x;
    this.turretShots.push(shot);
    this.particles.sparkBurst(t.x + dir * 8, t.y + 1, 3);
  }

  _noTracked(list) {
    return list.length > 0 && list.every((e) => !e.active || e.dead);
  }

  _spawnTracked(list, id, x) {
    const e = this.spawnEnemy(id, x);
    list.push(e);
    return e;
  }

  // --- per-frame -----------------------------------------------------------

  onLevelUpdate(time, delta) {
    const px = this.player.x;

    // Gate riot wave.
    if (!this.gateWaveTriggered && px > 720) {
      this.gateWaveTriggered = true;
      this._setAlarm(true);
      this.setObjective('RIOT  -  CLEAR THE CELL BLOCK');
      this._spawnTracked(this.gateEnemies, 'inmate', 860);
      this._spawnTracked(this.gateEnemies, 'riotcop', 900);
      this._spawnTracked(this.gateEnemies, 'guard', 1000);
      this._spawnTracked(this.gateEnemies, 'inmate', 1040);
    }
    if (this.gateWaveTriggered && !this.gateOpen && this._noTracked(this.gateEnemies)) {
      this._openGate();
    }

    // Collapsing catwalk.
    for (const l of this.catwalks) {
      if (l.triggered) continue;
      const b = this.player.body;
      if (px > l.x1 - 4 && px < l.x2 + 4 &&
          b.bottom <= l.top + 8 && b.bottom >= l.top - 10 && b.velocity.y >= -10) {
        this._triggerCollapse(l);
      }
    }

    // Turrets fire on a cadence when the player is roughly in their lane.
    for (const t of this.turrets) {
      const inRange = Math.abs(px - t.x) < 210 && this.player.y > t.y - 30;
      t.eye.setAlpha(inRange ? (t.fireCd < 320 ? 1 : 0.5) : 0.2);
      if (!inRange) continue;
      t.fireCd -= delta;
      if (t.fireCd <= 0) {
        this._fireTurret(t);
        t.fireCd = 1500;
      }
    }
    // Cull spent turret shots.
    for (let i = this.turretShots.length - 1; i >= 0; i--) {
      const s = this.turretShots[i];
      if (!s.active || Math.abs(s.x - s.originX) > 300) {
        s.destroy();
        this.turretShots.splice(i, 1);
      }
    }

    // Final yard riot gates the exit.
    if (!this.finalTriggered && px > 2240) {
      this.finalTriggered = true;
      this._setAlarm(true);
      this.setObjective('THE YARD  -  CLEAR IT TO BREAK OUT');
      this._spawnTracked(this.finalEnemies, 'riotcop', 2360);
      this._spawnTracked(this.finalEnemies, 'guard', 2420);
      this._spawnTracked(this.finalEnemies, 'inmate', 2300);
      this._spawnTracked(this.finalEnemies, 'inmate', 2480);
    }
    if (this.finalTriggered && !this.finalCleared && this._noTracked(this.finalEnemies)) {
      this.finalCleared = true;
      this.canComplete = true;
      this._setAlarm(false);
      this.setObjective('BREAKOUT  -  ESCAPE \u2192');
      this.spawnPickup(this.player.x, GROUND_Y - 30, 'heart');
    }
  }
}
