// Assets.js
// ----------------------------------------------------------------------------
// Single entry point that procedurally generates every texture the game uses.
// Called once from the Preload scene. Everything here is original art drawn
// with code — no external image files.

import { TextureFactory, cssColor } from './TextureFactory.js';
import { buildCharacter } from './CharacterArtist.js';
import { SCHEMES } from '../data/characters.js';
import { TEX, PALETTE } from '../config.js';

function buildEffects(scene) {
  // Blood droplet (a few sizes baked into one sheet for variety).
  TextureFactory.sheetFromDraw(scene, TEX.BLOOD, 4, 4, 3, (ctx, i) => {
    const sizes = [4, 3, 2];
    const s = sizes[i];
    ctx.fillStyle = cssColor(PALETTE.blood);
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = cssColor(PALETTE.bloodDark);
    ctx.fillRect(0, s - 1, s, 1);
  });

  // Chunky gib (severed cartoon chunk).
  TextureFactory.sprite(
    scene,
    TEX.GIB,
    ['.bb.', 'bBBb', 'bBBb', '.bb.'],
    { b: PALETTE.bloodDark, B: PALETTE.blood },
    1
  );

  TextureFactory.softCircle(scene, TEX.SMOKE, 12, PALETTE.smoke);
  TextureFactory.softCircle(scene, TEX.DUST, 10, PALETTE.rust);
  TextureFactory.softCircle(scene, TEX.SPARK, 6, PALETTE.spark);

  // Slash arc — a crescent swipe used for melee feedback.
  TextureFactory.canvas(scene, TEX.SLASH, 22, 22, (ctx, w, h) => {
    ctx.strokeStyle = cssColor(PALETTE.bone, 0.95);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(2, h / 2, 16, -0.9, 0.9);
    ctx.stroke();
    ctx.strokeStyle = cssColor(0xffffff, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(2, h / 2, 13, -0.8, 0.8);
    ctx.stroke();
  });
}

function buildEnvironment(scene) {
  // Industrial floor tile with grime + bolts.
  TextureFactory.canvas(scene, TEX.FLOOR, 16, 16, (ctx, w, h) => {
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cssColor(PALETTE.steel, 0.5);
    ctx.fillRect(0, 0, w, 2);
    ctx.fillStyle = cssColor(0x000000, 0.4);
    ctx.fillRect(0, h - 1, w, 1);
    ctx.fillRect(w - 1, 0, 1, h);
    // bolts
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(w - 3, 2, 1, 1);
    TextureFactory.speckle(ctx, 0, 0, w, h, 0x000000, 0.06, 0.3);
  });

  // Background wall panel (parallax layer base).
  TextureFactory.canvas(scene, TEX.WALL_BG, 64, 64, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#191a20');
    grad.addColorStop(1, '#0d0d11');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = cssColor(0x000000, 0.5);
    for (let x = 0; x <= w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
    TextureFactory.speckle(ctx, 0, 0, w, h, PALETTE.rust, 0.02, 0.4);
  });

  // Breakable crate.
  TextureFactory.canvas(scene, TEX.CRATE, 18, 18, (ctx, w, h) => {
    ctx.fillStyle = cssColor(PALETTE.rust);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cssColor(0x000000, 0.35);
    ctx.fillRect(0, 0, w, 1);
    ctx.fillRect(0, h - 2, w, 2);
    ctx.strokeStyle = cssColor(0x2a1a0e);
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(w - 1, h - 1);
    ctx.moveTo(w - 1, 1);
    ctx.lineTo(1, h - 1);
    ctx.stroke();
  });

  // Explosive barrel.
  TextureFactory.canvas(scene, TEX.BARREL, 16, 20, (ctx, w, h) => {
    ctx.fillStyle = cssColor(PALETTE.blood);
    ctx.fillRect(2, 0, w - 4, h);
    ctx.fillStyle = cssColor(PALETTE.bloodDark);
    ctx.fillRect(2, 0, 2, h);
    ctx.fillStyle = cssColor(PALETTE.hazard);
    ctx.fillRect(2, 6, w - 4, 4);
    ctx.fillStyle = cssColor(0x000000);
    ctx.fillRect(6, 7, 1, 2);
    ctx.fillRect(9, 7, 1, 2);
    ctx.fillRect(7, 6, 2, 1);
    ctx.fillStyle = cssColor(0x000000, 0.3);
    ctx.fillRect(2, 0, w - 4, 1);
    ctx.fillRect(2, h - 1, w - 4, 1);
  });

  // Steel cover barrel — inert blue-grey drum (clearly NOT the red TNT one), used
  // as bullet cover. Steel hoops, no hazard band.
  TextureFactory.canvas(scene, TEX.COVER_BARREL, 16, 20, (ctx, w, h) => {
    ctx.fillStyle = cssColor(0x4a606e);
    ctx.fillRect(2, 0, w - 4, h);
    ctx.fillStyle = cssColor(0x33454f);
    ctx.fillRect(2, 0, 2, h); // shaded edge
    ctx.fillStyle = cssColor(0x6f8c9c);
    ctx.fillRect(w - 5, 0, 2, h); // lit edge
    ctx.fillStyle = cssColor(0x26333b);
    ctx.fillRect(2, 4, w - 4, 2); // upper hoop
    ctx.fillRect(2, h - 6, w - 4, 2); // lower hoop
    ctx.fillStyle = cssColor(0x000000, 0.3);
    ctx.fillRect(2, 0, w - 4, 1);
    ctx.fillRect(2, h - 1, w - 4, 1);
    ctx.fillStyle = cssColor(0xffffff, 0.12);
    ctx.fillRect(5, 1, 2, h - 2); // vertical highlight
  });

  // Rolling TNT keg — a near-round barrel so that continuous rotation reads as
  // ROLLING (like a Donkey Kong barrel) rather than a tall box tumbling. The
  // wooden staves + steel hoops run across the face so the spin is legible.
  TextureFactory.canvas(scene, TEX.BARREL_ROLL, 22, 22, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 1;
    // Clip everything to the round silhouette.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    // Red body.
    ctx.fillStyle = cssColor(PALETTE.blood);
    ctx.fillRect(0, 0, w, h);
    // Vertical wood staves (these rotate with the keg => visible roll).
    ctx.fillStyle = cssColor(PALETTE.bloodDark);
    for (let x = 2; x < w; x += 5) ctx.fillRect(x, 0, 1, h);
    // Volume shading on the lower half.
    ctx.fillStyle = cssColor(0x000000, 0.28);
    ctx.fillRect(0, cy + 2, w, h);
    // Yellow TNT danger band across the middle.
    ctx.fillStyle = cssColor(PALETTE.hazard);
    ctx.fillRect(0, cy - 3, w, 6);
    // Two dark steel hoops above/below the band.
    ctx.fillStyle = cssColor(0x1b1410);
    ctx.fillRect(0, 3, w, 2);
    ctx.fillRect(0, h - 5, w, 2);
    // A bright rivet so a single feature is trackable as it spins.
    ctx.fillStyle = cssColor(0xffe066);
    ctx.fillRect(cx + 3, 4, 2, 2);
    ctx.restore();
    // Dark rim outline around the circle.
    ctx.strokeStyle = cssColor(0x000000, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Door (level exit / breakable).
  TextureFactory.canvas(scene, TEX.DOOR, 22, 40, (ctx, w, h) => {
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = cssColor(0x000000);
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(w - 6, h / 2 - 1, 3, 3); // handle
    ctx.fillStyle = cssColor(PALETTE.hazard, 0.8);
    ctx.fillRect(3, 4, w - 6, 3); // exit stripe
  });

  // Pillar / column.
  TextureFactory.canvas(scene, TEX.PILLAR, 14, 64, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#23252b');
    grad.addColorStop(0.5, '#3a3d44');
    grad.addColorStop(1, '#1c1d21');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cssColor(0x000000, 0.3);
    ctx.fillRect(0, 0, w, 3);
    ctx.fillRect(0, h - 3, w, 3);
  });
}

// Industrial / urban hazards and props used by levels 3-9.
function buildLevelProps(scene) {
  // Conveyor belt segment (24x8) with directional chevrons.
  TextureFactory.canvas(scene, TEX.CONVEYOR, 24, 8, (ctx, w, h) => {
    ctx.fillStyle = cssColor(0x16171c);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(0, 0, w, 1);
    ctx.fillStyle = cssColor(0x000000, 0.5);
    ctx.fillRect(0, h - 1, w, 1);
    // Right-pointing chevrons ">" (the belt is flipped for left-moving belts).
    ctx.fillStyle = cssColor(PALETTE.hazard, 0.85);
    for (let x = 1; x < w; x += 8) {
      ctx.fillRect(x, 1, 1, 1);
      ctx.fillRect(x + 1, 2, 1, 1);
      ctx.fillRect(x + 2, 3, 1, 2);
      ctx.fillRect(x + 1, 5, 1, 1);
      ctx.fillRect(x, 6, 1, 1);
    }
  });

  // Spinning saw blade (24x24).
  TextureFactory.canvas(scene, TEX.SAWBLADE, 24, 24, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    // teeth
    ctx.fillStyle = cssColor(PALETTE.bone);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const tx = cx + Math.cos(a) * 11;
      const ty = cy + Math.sin(a) * 11;
      ctx.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 3, 3);
    }
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cssColor(0x000000);
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
    TextureFactory.speckle(ctx, cx - 9, cy - 9, 18, 18, PALETTE.blood, 0.05, 0.5);
  });

  // Crusher head (28x22) — heavy hydraulic press block.
  TextureFactory.canvas(scene, TEX.CRUSHER, 28, 22, (ctx, w, h) => {
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(0, 0, w, 3);
    ctx.fillStyle = cssColor(0x000000, 0.4);
    ctx.fillRect(0, h - 4, w, 4);
    // hazard stripes on the crushing face
    for (let x = 0; x < w; x += 8) {
      ctx.fillStyle = cssColor(PALETTE.hazard);
      ctx.fillRect(x, h - 4, 4, 3);
    }
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(w / 2 - 3, -2, 6, 6); // piston stub
  });

  // Electric arc tile (16x18) — floor hazard.
  TextureFactory.canvas(scene, TEX.ELECTRIC, 16, 18, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = cssColor(0x7fd0ff, 0.95);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, h - 1);
    ctx.lineTo(5, h - 8);
    ctx.lineTo(9, h - 4);
    ctx.lineTo(12, h - 12);
    ctx.lineTo(14, 1);
    ctx.stroke();
    ctx.strokeStyle = cssColor(0xffffff, 0.8);
    ctx.beginPath();
    ctx.moveTo(7, h - 1);
    ctx.lineTo(9, h - 9);
    ctx.lineTo(6, h - 13);
    ctx.stroke();
  });

  // Shipping container (44x36).
  TextureFactory.canvas(scene, TEX.CONTAINER, 44, 36, (ctx, w, h) => {
    const cols = ['#5a3a2a', '#3a5a4a', '#3a4a6a', '#6a3a3a'];
    const base = cols[Math.floor(Math.random() * cols.length)];
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cssColor(0x000000, 0.25);
    for (let x = 2; x < w; x += 4) ctx.fillRect(x, 1, 1, h - 2); // corrugation
    ctx.strokeStyle = cssColor(0x000000, 0.6);
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.fillStyle = cssColor(0x000000, 0.4);
    ctx.fillRect(0, 0, w, 2);
    ctx.fillRect(0, h - 3, w, 3);
  });

  // Forklift (34x26) — moving hazard.
  TextureFactory.canvas(scene, TEX.FORKLIFT, 34, 26, (ctx, w, h) => {
    ctx.fillStyle = cssColor(PALETTE.hazard);
    ctx.fillRect(6, 8, 16, 12); // body
    ctx.fillStyle = cssColor(0x000000, 0.4);
    ctx.fillRect(6, 8, 16, 2);
    ctx.fillStyle = cssColor(0x1a1a1f);
    ctx.fillRect(8, 4, 8, 6); // cab
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(22, 2, 2, 20); // mast
    ctx.fillRect(22, 20, 11, 2); // fork
    ctx.fillRect(31, 6, 2, 16);
    ctx.fillStyle = cssColor(0x0a0a0c);
    ctx.beginPath(); ctx.arc(10, 22, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(19, 22, 4, 0, Math.PI * 2); ctx.fill();
  });

  // Subway train car (96x48).
  TextureFactory.canvas(scene, TEX.TRAIN, 96, 48, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#9aa0a8');
    grad.addColorStop(1, '#5a5e66');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 4, w, h - 8);
    ctx.fillStyle = cssColor(PALETTE.blood);
    ctx.fillRect(0, 4, w, 4); // roof stripe
    ctx.fillStyle = cssColor(0x10131a);
    for (let x = 8; x < w - 10; x += 22) ctx.fillRect(x, 14, 14, 16); // windows
    ctx.fillStyle = cssColor(0x000000, 0.5);
    ctx.fillRect(0, h - 6, w, 6);
    ctx.fillStyle = cssColor(PALETTE.hazard);
    ctx.fillRect(2, h - 10, 6, 4); // headlight
  });

  // Concrete debris chunk (14x14).
  TextureFactory.canvas(scene, TEX.DEBRIS, 14, 14, (ctx, w, h) => {
    ctx.fillStyle = cssColor(0x6b6f76);
    ctx.beginPath();
    ctx.moveTo(1, 5); ctx.lineTo(6, 1); ctx.lineTo(13, 4);
    ctx.lineTo(12, 12); ctx.lineTo(4, 13); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = cssColor(0x000000, 0.35);
    ctx.fillRect(4, 9, 7, 4);
    TextureFactory.speckle(ctx, 0, 0, w, h, 0x000000, 0.1, 0.4);
    ctx.fillStyle = cssColor(PALETTE.steel); // rebar
    ctx.fillRect(10, 0, 1, 6);
  });

  // Elevator / lift platform (44x8) and wooden scaffold plank (48x8).
  TextureFactory.canvas(scene, TEX.ELEVATOR, 44, 8, (ctx, w, h) => {
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.fillRect(0, h - 3, w, 3);
    ctx.fillStyle = cssColor(PALETTE.hazard);
    for (let x = 0; x < w; x += 8) ctx.fillRect(x, 0, 4, 2);
  });
  TextureFactory.canvas(scene, TEX.SCAFFOLD, 48, 8, (ctx, w, h) => {
    ctx.fillStyle = cssColor(0xb98a4a);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cssColor(0x8a6433);
    ctx.fillRect(0, h - 2, w, 2);
    ctx.fillStyle = cssColor(0x6b4d28);
    for (let x = 0; x < w; x += 12) ctx.fillRect(x, 0, 1, h);
  });

  // Soft light glow for darkness levels (large additive radial).
  TextureFactory.softCircle(scene, TEX.LIGHT, 220, 0xfff2c8);
}

function buildWeaponSprites(scene) {
  // Chainsaw — held pointing right, anchored at the player's hand.
  TextureFactory.canvas(scene, 'chainsaw', 26, 12, (ctx) => {
    ctx.fillStyle = cssColor(0x1a1a1f);
    ctx.fillRect(0, 3, 8, 6); // motor body
    ctx.fillStyle = cssColor(PALETTE.blood);
    ctx.fillRect(1, 4, 5, 3); // red casing
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(7, 4, 18, 4); // bar
    ctx.fillStyle = cssColor(0x101012);
    ctx.fillRect(7, 3, 18, 1); // teeth top
    ctx.fillRect(7, 8, 18, 1); // teeth bottom
    ctx.fillStyle = cssColor(PALETTE.hazard);
    for (let x = 9; x < 24; x += 3) {
      ctx.fillRect(x, 2, 1, 1);
      ctx.fillRect(x + 1, 9, 1, 1);
    }
  });

  // Baseball bat — for Level 2 door defense.
  TextureFactory.canvas(scene, 'bat', 22, 8, (ctx) => {
    ctx.fillStyle = cssColor(PALETTE.rust);
    ctx.fillRect(0, 3, 6, 2); // handle
    ctx.fillStyle = cssColor(0xb98a4a);
    ctx.fillRect(6, 2, 16, 4); // barrel
    ctx.fillStyle = cssColor(0x8a6433);
    ctx.fillRect(6, 5, 16, 1);
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(16, 1, 6, 6); // taped/dented end
    TextureFactory.speckle(ctx, 16, 1, 6, 6, PALETTE.blood, 0.2, 0.6);
  });

  // Crowbar — bent steel bar with a hooked claw.
  TextureFactory.canvas(scene, 'crowbar', 24, 10, (ctx) => {
    ctx.fillStyle = cssColor(0xc23a2a); // painted red steel
    ctx.fillRect(0, 4, 18, 3);
    ctx.fillStyle = cssColor(0x8a2a1e);
    ctx.fillRect(0, 6, 18, 1);
    ctx.fillStyle = cssColor(0xc23a2a);
    ctx.fillRect(17, 1, 3, 6); // upturned claw
    ctx.fillRect(20, 1, 2, 2);
    ctx.fillStyle = cssColor(0xffffff, 0.3);
    ctx.fillRect(2, 4, 12, 1);
  });

  // Lead pipe — dull grey cylinder with a coupling.
  TextureFactory.canvas(scene, 'pipe', 24, 7, (ctx) => {
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(0, 2, 24, 3);
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.fillRect(0, 4, 24, 1);
    ctx.fillStyle = cssColor(0xffffff, 0.35);
    ctx.fillRect(0, 2, 24, 1);
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.fillRect(18, 1, 4, 5); // coupling
  });

  // Fire axe — wood haft + red/steel head.
  TextureFactory.canvas(scene, 'fireaxe', 24, 16, (ctx) => {
    ctx.fillStyle = cssColor(0xb98a4a);
    ctx.fillRect(0, 7, 18, 3); // handle
    ctx.fillStyle = cssColor(0x8a6433);
    ctx.fillRect(0, 9, 18, 1);
    ctx.fillStyle = cssColor(PALETTE.blood);
    ctx.fillRect(15, 1, 6, 14); // axe head body
    ctx.fillStyle = cssColor(PALETTE.bone);
    ctx.fillRect(20, 1, 3, 14); // blade edge
    ctx.fillStyle = cssColor(0x000000, 0.3);
    ctx.fillRect(15, 7, 6, 2);
  });

  // Shotgun — wooden stock + twin steel barrels.
  TextureFactory.canvas(scene, 'shotgun', 28, 9, (ctx) => {
    ctx.fillStyle = cssColor(0x6b4d28);
    ctx.fillRect(0, 3, 9, 5); // stock
    ctx.fillStyle = cssColor(0x4a3419);
    ctx.fillRect(0, 6, 9, 2);
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.fillRect(8, 2, 20, 3); // barrels
    ctx.fillRect(8, 5, 20, 2);
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(8, 2, 20, 1);
    ctx.fillStyle = cssColor(0x111114);
    ctx.fillRect(26, 2, 2, 5); // muzzle
  });

  // Nail gun — chunky yellow power tool.
  TextureFactory.canvas(scene, 'nailgun', 22, 12, (ctx) => {
    ctx.fillStyle = cssColor(PALETTE.hazard);
    ctx.fillRect(2, 1, 12, 7); // body
    ctx.fillStyle = cssColor(0xc99a00);
    ctx.fillRect(2, 6, 12, 2);
    ctx.fillStyle = cssColor(0x1a1a1f);
    ctx.fillRect(4, 7, 4, 5); // grip
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(13, 3, 9, 3); // nose / barrel
    ctx.fillStyle = cssColor(0x111114);
    ctx.fillRect(20, 3, 2, 3);
    ctx.fillStyle = cssColor(0x9a7a00);
    ctx.fillRect(10, 0, 4, 2); // magazine nub
  });

  // Revolver — stubby steel frame, wooden grip, long barrel.
  TextureFactory.canvas(scene, 'revolver', 20, 11, (ctx) => {
    ctx.fillStyle = cssColor(0x6b4d28);
    ctx.fillRect(0, 5, 5, 6); // grip
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.fillRect(3, 3, 6, 5); // frame
    ctx.fillStyle = cssColor(0x111114);
    ctx.fillRect(4, 3, 4, 4); // cylinder
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(8, 4, 11, 2); // barrel
    ctx.fillStyle = cssColor(0xffffff, 0.35);
    ctx.fillRect(8, 4, 11, 1);
    ctx.fillStyle = cssColor(0x111114);
    ctx.fillRect(18, 4, 2, 2); // muzzle
  });

  // Arc Cutter — industrial emitter with a glowing electric prong.
  TextureFactory.canvas(scene, 'arccutter', 22, 12, (ctx) => {
    ctx.fillStyle = cssColor(0x2a2d33);
    ctx.fillRect(0, 3, 11, 6); // body
    ctx.fillStyle = cssColor(0x1a1c20);
    ctx.fillRect(2, 8, 4, 4); // grip
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(10, 4, 5, 4); // emitter housing
    ctx.fillStyle = cssColor(0x7fd0ff);
    ctx.fillRect(15, 3, 2, 6); // prong upper
    ctx.fillRect(18, 4, 2, 4); // prong lower
    ctx.fillStyle = cssColor(0xeaffff);
    ctx.fillRect(16, 5, 4, 2); // arc spark
    ctx.fillStyle = cssColor(0x7fd0ff, 0.6);
    ctx.fillRect(3, 4, 6, 1);
  });

  // Molotov — glass bottle of fuel with a burning rag.
  TextureFactory.canvas(scene, 'molotov', 12, 16, (ctx) => {
    ctx.fillStyle = cssColor(0x2f7a3a); // green glass
    ctx.fillRect(3, 5, 6, 10);
    ctx.fillStyle = cssColor(0x3f9a4a, 0.8);
    ctx.fillRect(4, 6, 2, 8); // highlight
    ctx.fillStyle = cssColor(0xc08a3a); // fuel line
    ctx.fillRect(3, 9, 6, 5);
    ctx.fillStyle = cssColor(0x6b4d28);
    ctx.fillRect(4, 2, 4, 4); // neck/cork
    ctx.fillStyle = cssColor(0xff7a1e); // flame
    ctx.fillRect(4, 0, 3, 3);
    ctx.fillStyle = cssColor(0xffe066);
    ctx.fillRect(5, 0, 1, 2);
  });

  // Cryo Sprayer — pressurized tank + nozzle venting frost.
  TextureFactory.canvas(scene, 'cryo', 22, 13, (ctx) => {
    ctx.fillStyle = cssColor(0x2a6f86);
    ctx.fillRect(0, 3, 9, 9); // tank
    ctx.fillStyle = cssColor(0x3f93ad, 0.8);
    ctx.fillRect(1, 4, 3, 7);
    ctx.fillStyle = cssColor(0x1a1c20);
    ctx.fillRect(3, 9, 4, 4); // grip
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(9, 5, 7, 3); // hose/nozzle
    ctx.fillStyle = cssColor(0xbfefff);
    ctx.fillRect(16, 4, 2, 5); // frost burst
    ctx.fillRect(18, 5, 3, 3);
    ctx.fillStyle = cssColor(0x9fe8ff, 0.7);
    ctx.fillRect(19, 4, 3, 5);
  });

  // Assault rifle — black polymer body, magazine, stock + muzzle.
  TextureFactory.canvas(scene, 'ar', 28, 11, (ctx) => {
    ctx.fillStyle = cssColor(0x23262b);
    ctx.fillRect(0, 4, 9, 4); // stock
    ctx.fillStyle = cssColor(0x16181c);
    ctx.fillRect(7, 3, 13, 5); // receiver
    ctx.fillStyle = cssColor(0x2c3036);
    ctx.fillRect(19, 4, 9, 2); // barrel
    ctx.fillStyle = cssColor(0x111114);
    ctx.fillRect(26, 3, 2, 4); // muzzle
    ctx.fillRect(10, 7, 4, 4); // magazine
    ctx.fillStyle = cssColor(0x3a3f47);
    ctx.fillRect(12, 8, 3, 3);
    ctx.fillStyle = cssColor(0xffffff, 0.18);
    ctx.fillRect(7, 3, 13, 1); // top highlight
    ctx.fillStyle = cssColor(0x6c7079);
    ctx.fillRect(15, 2, 3, 1); // sight
  });

  const wIcon = (key, draw) => TextureFactory.canvas(scene, key, 20, 12, draw);
  wIcon('crowbar_icon', (ctx) => {
    ctx.fillStyle = cssColor(0xc23a2a);
    ctx.fillRect(1, 5, 15, 3);
    ctx.fillRect(14, 2, 3, 5);
  });
  wIcon('pipe_icon', (ctx) => {
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(1, 4, 18, 4);
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.fillRect(14, 3, 4, 6);
  });
  wIcon('fireaxe_icon', (ctx) => {
    ctx.fillStyle = cssColor(0xb98a4a);
    ctx.fillRect(1, 5, 14, 3);
    ctx.fillStyle = cssColor(PALETTE.blood);
    ctx.fillRect(12, 1, 5, 10);
    ctx.fillStyle = cssColor(PALETTE.bone);
    ctx.fillRect(16, 1, 2, 10);
  });
  wIcon('shotgun_icon', (ctx) => {
    ctx.fillStyle = cssColor(0x6b4d28);
    ctx.fillRect(0, 4, 7, 5);
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.fillRect(6, 4, 14, 3);
  });
  wIcon('nailgun_icon', (ctx) => {
    ctx.fillStyle = cssColor(PALETTE.hazard);
    ctx.fillRect(2, 2, 10, 6);
    ctx.fillStyle = cssColor(0x1a1a1f);
    ctx.fillRect(4, 7, 3, 4);
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(11, 3, 8, 2);
  });
  wIcon('revolver_icon', (ctx) => {
    ctx.fillStyle = cssColor(0x6b4d28);
    ctx.fillRect(1, 6, 4, 5);
    ctx.fillStyle = cssColor(PALETTE.steelDark);
    ctx.fillRect(3, 3, 5, 4);
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(7, 4, 11, 2);
  });
  wIcon('arccutter_icon', (ctx) => {
    ctx.fillStyle = cssColor(0x2a2d33);
    ctx.fillRect(1, 3, 9, 6);
    ctx.fillStyle = cssColor(0x7fd0ff);
    ctx.fillRect(11, 3, 2, 6);
    ctx.fillStyle = cssColor(0xeaffff);
    ctx.fillRect(13, 5, 5, 2);
  });
  wIcon('molotov_icon', (ctx) => {
    ctx.fillStyle = cssColor(0x2f7a3a);
    ctx.fillRect(6, 4, 6, 7);
    ctx.fillStyle = cssColor(0x6b4d28);
    ctx.fillRect(7, 1, 4, 3);
    ctx.fillStyle = cssColor(0xff7a1e);
    ctx.fillRect(7, 0, 3, 2);
  });
  wIcon('cryo_icon', (ctx) => {
    ctx.fillStyle = cssColor(0x2a6f86);
    ctx.fillRect(1, 3, 8, 7);
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(9, 4, 5, 2);
    ctx.fillStyle = cssColor(0xbfefff);
    ctx.fillRect(14, 3, 4, 5);
  });
  wIcon('ar_icon', (ctx) => {
    ctx.fillStyle = cssColor(0x16181c);
    ctx.fillRect(1, 4, 14, 3);
    ctx.fillStyle = cssColor(0x2c3036);
    ctx.fillRect(14, 4, 5, 2);
    ctx.fillStyle = cssColor(0x3a3f47);
    ctx.fillRect(4, 6, 3, 4);
  });

  // Weapon HUD icons.
  TextureFactory.canvas(scene, TEX.CHAINSAW_ICON, 20, 12, (ctx) => {
    ctx.fillStyle = cssColor(PALETTE.blood);
    ctx.fillRect(0, 3, 6, 6);
    ctx.fillStyle = cssColor(PALETTE.steel);
    ctx.fillRect(5, 4, 14, 3);
  });
  TextureFactory.canvas(scene, TEX.BAT_ICON, 20, 12, (ctx) => {
    ctx.fillStyle = cssColor(0xb98a4a);
    ctx.fillRect(2, 3, 16, 4);
    ctx.fillStyle = cssColor(PALETTE.rust);
    ctx.fillRect(0, 4, 4, 2);
  });
}

function buildUI(scene) {
  TextureFactory.pixel(scene, TEX.PIXEL);

  const heart = (key, full) =>
    TextureFactory.canvas(scene, key, 11, 10, (ctx) => {
      const c = full ? PALETTE.blood : 0x2a2226;
      const hi = full ? '#ff5566' : '#3a3036';
      ctx.fillStyle = cssColor(c);
      // chunky pixel heart
      const rows = [
        '.XX.XX.',
        'XXXXXXX',
        'XXXXXXX',
        '.XXXXX.',
        '..XXX..',
        '...X...',
      ];
      const ox = 2;
      const oy = 2;
      for (let y = 0; y < rows.length; y++)
        for (let x = 0; x < rows[y].length; x++)
          if (rows[y][x] === 'X') ctx.fillRect(ox + x, oy + y, 1, 1);
      ctx.fillStyle = hi;
      ctx.fillRect(ox + 1, oy + 1, 2, 1);
    });
  heart(TEX.HEART_FULL, true);
  heart(TEX.HEART_EMPTY, false);
}

/**
 * Generate everything. Idempotent: safe to call from multiple scenes.
 */
export function generateAllTextures(scene) {
  // Characters (player + enemies + mini-boss) share one parametric pipeline.
  for (const [key, scheme] of Object.entries(SCHEMES)) {
    buildCharacter(scene, key, scheme);
  }
  buildEffects(scene);
  buildEnvironment(scene);
  buildLevelProps(scene);
  buildWeaponSprites(scene);
  buildUI(scene);
}
