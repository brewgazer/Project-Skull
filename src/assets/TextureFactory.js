// TextureFactory
// ----------------------------------------------------------------------------
// All Project Skull art is generated at runtime as original pixel art. Sprites
// are described as small character grids (think ASCII art) mapped to a palette,
// then rasterized onto Phaser canvas textures. This keeps the repository free
// of binary assets, guarantees originality, and makes every sprite trivially
// tweakable in code.
//
// Grid syntax: an array of equal-length strings. Each character is a palette
// key. A space or '.' means transparent.

/**
 * Draw a single pixel grid to a 2D canvas context at the given pixel size.
 */
function paintGrid(ctx, grid, palette, px, offsetX = 0, offsetY = 0) {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === ' ' || ch === '.') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(offsetX + x * px, offsetY + y * px, px, px);
    }
  }
}

/**
 * Convert a numeric color (0xRRGGBB) or string into a CSS color string.
 */
export function cssColor(c, alpha = 1) {
  if (typeof c === 'string') return c;
  const r = (c >> 16) & 0xff;
  const g = (c >> 8) & 0xff;
  const b = c & 0xff;
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

export class TextureFactory {
  /**
   * Register a single-frame texture from a pixel grid.
   */
  static sprite(scene, key, grid, palette, px = 1) {
    if (scene.textures.exists(key)) return;
    const w = grid[0].length * px;
    const h = grid.length * px;
    const tex = scene.textures.createCanvas(key, w, h);
    paintGrid(tex.context, grid, palette, px);
    tex.refresh();
  }

  /**
   * Register an animated spritesheet from an array of pixel grids (one per
   * frame). All frames must share the same dimensions. Frames are laid out
   * horizontally and registered as a Phaser spritesheet.
   */
  static sheet(scene, key, frames, palette, px = 1) {
    if (scene.textures.exists(key)) return { frameWidth: 0, frameHeight: 0 };
    const frameW = frames[0][0].length * px;
    const frameH = frames[0].length * px;
    const tex = scene.textures.createCanvas(key, frameW * frames.length, frameH);
    const ctx = tex.context;
    frames.forEach((grid, i) => paintGrid(ctx, grid, palette, px, i * frameW, 0));
    tex.refresh();
    // Register frame boundaries so Phaser can address each frame index.
    const sheet = scene.textures.get(key);
    for (let i = 0; i < frames.length; i++) {
      sheet.add(i, 0, i * frameW, 0, frameW, frameH);
    }
    return { frameWidth: frameW, frameHeight: frameH, frames: frames.length };
  }

  /**
   * Register an animated spritesheet whose frames are produced by an
   * imperative per-frame draw callback. The callback receives a context whose
   * origin is already translated to the current frame's top-left corner.
   */
  static sheetFromDraw(scene, key, frameW, frameH, count, drawFrame) {
    if (scene.textures.exists(key)) return { frameWidth: frameW, frameHeight: frameH, frames: count };
    const tex = scene.textures.createCanvas(key, frameW * count, frameH);
    const ctx = tex.context;
    for (let i = 0; i < count; i++) {
      ctx.save();
      ctx.translate(i * frameW, 0);
      // Clip so neighbouring frames never bleed into one another.
      ctx.beginPath();
      ctx.rect(0, 0, frameW, frameH);
      ctx.clip();
      drawFrame(ctx, i, frameW, frameH);
      ctx.restore();
    }
    tex.refresh();
    const sheet = scene.textures.get(key);
    for (let i = 0; i < count; i++) {
      sheet.add(i, 0, i * frameW, 0, frameW, frameH);
    }
    return { frameWidth: frameW, frameHeight: frameH, frames: count };
  }

  /**
   * Build a texture using an imperative draw callback. Useful for gradients,
   * noise, soft particles and backgrounds that aren't grid-based.
   */
  static canvas(scene, key, w, h, drawFn) {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, w, h);
    drawFn(tex.context, w, h);
    tex.refresh();
  }

  /**
   * A 1x1 white pixel — the workhorse for tinted rectangles, flashes, bars.
   */
  static pixel(scene, key = 'pixel') {
    TextureFactory.canvas(scene, key, 1, 1, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1, 1);
    });
  }

  /**
   * A soft radial blob, used for smoke / glow particles.
   */
  static softCircle(scene, key, size, color) {
    TextureFactory.canvas(scene, key, size, size, (ctx, w, h) => {
      const r = w / 2;
      const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, cssColor(color, 1));
      grad.addColorStop(0.6, cssColor(color, 0.5));
      grad.addColorStop(1, cssColor(color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
  }

  /**
   * Add value noise speckle to an existing context region (grime/texture).
   */
  static speckle(ctx, x, y, w, h, color, density = 0.08, alpha = 0.25) {
    ctx.fillStyle = cssColor(color, alpha);
    const count = Math.floor(w * h * density);
    for (let i = 0; i < count; i++) {
      const px = x + Math.floor(Math.random() * w);
      const py = y + Math.floor(Math.random() * h);
      ctx.fillRect(px, py, 1, 1);
    }
  }
}
