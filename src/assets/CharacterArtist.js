// CharacterArtist
// ----------------------------------------------------------------------------
// A parametric pixel-art humanoid renderer. Instead of hand-authoring hundreds
// of sprite frames, every character (player + all enemies + the mini-boss) is
// drawn from composable body parts driven by a color "scheme" and an animation
// pose. This is the reusable framework behind all character art: new enemies
// are a data table away.

import { TextureFactory, cssColor } from './TextureFactory.js';

export const FRAME_W = 28;
export const FRAME_H = 32;
const CX = 14; // horizontal centre
const BASE = 30; // foot baseline
const SHOULDER_Y = 11;
const HIP_Y = 19;

// Animation frame layout inside the generated sheet.
export const CHAR_ANIM = {
  idle: { start: 0, count: 2, rate: 3, repeat: -1 },
  walk: { start: 2, count: 6, rate: 12, repeat: -1 },
  attack: { start: 8, count: 4, rate: 18, repeat: 0 },
  hurt: { start: 12, count: 2, rate: 10, repeat: 0 },
  air: { start: 14, count: 2, rate: 6, repeat: -1 },
  death: { start: 16, count: 4, rate: 10, repeat: 0 },
};
const TOTAL_FRAMES = 20;

function rect(ctx, x, y, w, h, color, alpha = 1) {
  ctx.fillStyle = cssColor(color, alpha);
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// Draw one leg. `swing` shifts the foot forward/back, `lift` raises it.
function drawLeg(ctx, S, x, swing, lift) {
  const footY = BASE - lift;
  const legLen = footY - HIP_Y;
  rect(ctx, x + swing * 0.4, HIP_Y, 4, legLen, S.limbShade);
  rect(ctx, x + swing - 1, footY - 2, 6, 3, S.boots); // boot
}

// Draw the head with a style-specific covering (skull mask, helmet, cap...).
function drawHead(ctx, S, cx, topY, lean) {
  const hx = cx - 5 + lean;
  // hood / hair backdrop
  rect(ctx, hx - 1, topY, 12, 11, S.hood ?? S.bodyShade);
  // face / mask base
  rect(ctx, hx + 1, topY + 1, 9, 9, S.head);
  rect(ctx, hx + 1, topY + 7, 9, 3, S.headShade); // jaw shadow

  switch (S.headStyle) {
    case 'skull':
      // eye sockets + nasal void + teeth — the protagonist's signature look
      rect(ctx, hx + 2, topY + 3, 2, 3, S.outline);
      rect(ctx, hx + 7, topY + 3, 2, 3, S.outline);
      rect(ctx, hx + 2, topY + 4, 2, 1, S.eye); // glowing eyes
      rect(ctx, hx + 7, topY + 4, 2, 1, S.eye);
      rect(ctx, hx + 5, topY + 6, 1, 2, S.outline); // nose
      for (let i = 0; i < 4; i++) rect(ctx, hx + 2 + i * 2, topY + 9, 1, 1, S.outline);
      // hood peak
      rect(ctx, hx, topY - 1, 11, 2, S.hood ?? S.bodyShade);
      break;
    case 'cap':
      rect(ctx, hx, topY, 11, 3, S.accent); // cap
      rect(ctx, hx + 9, topY + 2, 3, 1, S.accent); // brim
      rect(ctx, hx + 2, topY + 4, 2, 2, S.eye);
      rect(ctx, hx + 7, topY + 4, 2, 2, S.eye);
      break;
    case 'helmet':
      rect(ctx, hx, topY, 11, 4, S.accent); // riot helmet
      rect(ctx, hx + 1, topY + 4, 9, 2, S.outline); // visor
      rect(ctx, hx + 2, topY + 4, 7, 1, S.eye, 0.7);
      break;
    case 'hardhat':
      rect(ctx, hx - 1, topY + 1, 12, 2, S.accent); // brim
      rect(ctx, hx + 1, topY - 1, 8, 3, S.accent); // dome
      rect(ctx, hx + 2, topY + 4, 2, 2, S.eye);
      rect(ctx, hx + 7, topY + 4, 2, 2, S.eye);
      break;
    case 'lab':
      rect(ctx, hx + 1, topY, 9, 3, S.headShade); // hair
      rect(ctx, hx + 2, topY + 4, 2, 2, S.eye);
      rect(ctx, hx + 7, topY + 4, 2, 2, S.eye);
      rect(ctx, hx, topY + 3, 11, 1, S.accent); // goggles strap
      break;
    case 'suit':
      // slicked executive hair + cold stare
      rect(ctx, hx, topY - 1, 11, 3, S.outline); // hair
      rect(ctx, hx + 1, topY + 1, 9, 1, S.headShade);
      rect(ctx, hx + 2, topY + 4, 2, 2, S.eye);
      rect(ctx, hx + 7, topY + 4, 2, 2, S.eye);
      rect(ctx, hx + 4, topY + 7, 3, 1, S.outline); // grim mouth
      break;
    default: // 'bald' generic
      rect(ctx, hx + 2, topY + 4, 2, 2, S.eye);
      rect(ctx, hx + 7, topY + 4, 2, 2, S.eye);
      break;
  }
}

function drawTorso(ctx, S, cx, bob, lean) {
  const x = cx - 5 + lean * 0.5;
  rect(ctx, x, SHOULDER_Y + bob, 10, HIP_Y - SHOULDER_Y + 1, S.body);
  rect(ctx, x, SHOULDER_Y + bob, 10, 2, S.bodyShade); // collar shade
  rect(ctx, x + 4, SHOULDER_Y + bob, 2, HIP_Y - SHOULDER_Y, S.accent, 0.5); // zipper
}

// Back arm hangs/swings opposite to the front arm.
function drawBackArm(ctx, S, cx, bob, swing) {
  const sx = cx + 3;
  rect(ctx, sx + swing * 0.3, SHOULDER_Y + 1 + bob, 3, 9, S.limbShade);
}

// Front arm reaches toward (handX, handY) — used to anchor weapons.
function drawFrontArm(ctx, S, cx, bob, handX, handY) {
  const sx = cx - 4;
  const sy = SHOULDER_Y + 2 + bob;
  // upper + fore arm as two chunky segments toward the hand
  const midX = (sx + handX) / 2;
  const midY = (sy + handY) / 2;
  rect(ctx, Math.min(sx, midX), Math.min(sy, midY), Math.abs(sx - midX) + 3, Math.abs(sy - midY) + 3, S.limb);
  rect(ctx, Math.min(midX, handX), Math.min(midY, handY), Math.abs(midX - handX) + 3, Math.abs(midY - handY) + 3, S.limb);
  rect(ctx, handX, handY, 3, 3, S.head); // hand
}

// Compute the pose for a given animation frame and draw the full character.
function drawFrame(ctx, S, index) {
  // Determine which animation + sub-index this frame belongs to.
  let bob = 0;
  let lean = 0;
  let backLeg = { swing: 0, lift: 0 };
  let foreLeg = { swing: 0, lift: 0 };
  let hand = { x: CX + 2, y: SHOULDER_Y + 7 };
  let topY = 1;
  let dead = false;

  if (index <= 1) {
    // idle — gentle breathing
    bob = index === 1 ? 1 : 0;
  } else if (index <= 7) {
    // walk — 6 frame leg cycle
    const k = index - 2;
    const phase = (k / 6) * Math.PI * 2;
    const s = Math.sin(phase);
    backLeg = { swing: -s * 4, lift: Math.max(0, Math.cos(phase)) * 3 };
    foreLeg = { swing: s * 4, lift: Math.max(0, -Math.cos(phase)) * 3 };
    bob = Math.abs(s) < 0.3 ? 0 : -1;
    hand = { x: CX + 2 - s * 2, y: SHOULDER_Y + 7 };
  } else if (index <= 11) {
    // attack — windup -> strike -> follow-through -> recover
    const k = index - 8;
    const poses = [
      { lean: -2, hand: { x: CX - 4, y: SHOULDER_Y + 1 } },
      { lean: 2, hand: { x: CX + 9, y: SHOULDER_Y + 2 } },
      { lean: 3, hand: { x: CX + 11, y: SHOULDER_Y + 7 } },
      { lean: 1, hand: { x: CX + 5, y: SHOULDER_Y + 6 } },
    ];
    lean = poses[k].lean;
    hand = poses[k].hand;
    foreLeg = { swing: 3, lift: 0 };
    backLeg = { swing: -3, lift: 0 };
  } else if (index <= 13) {
    // hurt — recoil
    const k = index - 12;
    lean = -3 - k;
    bob = 1;
    hand = { x: CX - 3, y: SHOULDER_Y + 4 };
  } else if (index <= 15) {
    // air (jump/fall)
    const k = index - 14;
    foreLeg = { swing: 3, lift: 4 + k };
    backLeg = { swing: -2, lift: 2 };
    hand = { x: CX + 4, y: SHOULDER_Y - 1 };
    bob = -1;
  } else {
    // death — crumple into a heap
    dead = true;
    const k = index - 16;
    drawDeathFrame(ctx, S, k);
    return;
  }

  // Draw order (back to front): back arm, back leg, torso, head, fore leg, fore arm
  drawBackArm(ctx, S, CX, bob, backLeg.swing);
  drawLeg(ctx, S, CX - 3, backLeg.swing, backLeg.lift);
  drawLeg(ctx, S, CX + 1, foreLeg.swing, foreLeg.lift);
  drawTorso(ctx, S, CX, bob, lean);
  drawHead(ctx, S, CX, topY + bob, lean);
  drawFrontArm(ctx, S, CX, bob, hand.x, hand.y);
}

function drawDeathFrame(ctx, S, k) {
  // Progressive collapse, ending as a flattened pile on the ground.
  const drop = [2, 6, 11, 15][k];
  const squash = [0, 2, 5, 8][k];
  const y = SHOULDER_Y + drop;
  const h = (HIP_Y - SHOULDER_Y + 12) - squash;
  rect(ctx, CX - 6, BASE - h, 12, h, S.body);
  rect(ctx, CX - 6, BASE - 3, 12, 3, S.bodyShade);
  if (k < 3) drawHead(ctx, S, CX, y - 9, 4 + k * 2);
  else {
    rect(ctx, CX - 7, BASE - 5, 9, 5, S.head); // head lying sideways
    rect(ctx, CX - 6, BASE - 4, 2, 2, S.outline);
  }
}

/**
 * Build a complete animated character spritesheet from a color scheme and
 * register its animations on the scene's anim manager (shared across scenes).
 */
export function buildCharacter(scene, key, scheme) {
  TextureFactory.sheetFromDraw(scene, key, FRAME_W, FRAME_H, TOTAL_FRAMES, (ctx, i) => {
    drawFrame(ctx, scheme, i);
  });
  registerCharacterAnims(scene, key);
}

let animKeysReady = new Set();

export function registerCharacterAnims(scene, key) {
  for (const [name, def] of Object.entries(CHAR_ANIM)) {
    const animKey = `${key}-${name}`;
    if (scene.anims.exists(animKey)) continue;
    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNumbers(key, {
        start: def.start,
        end: def.start + def.count - 1,
      }),
      frameRate: def.rate,
      repeat: def.repeat,
    });
  }
  animKeysReady.add(key);
}
