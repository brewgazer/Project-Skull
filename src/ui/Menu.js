// Menu
// ----------------------------------------------------------------------------
// Reusable vertical menu widget with full keyboard + mouse support, used by the
// main menu, level select, settings and pause screens. Emits audio feedback and
// supports left/right value adjustment for slider-style options.

import Phaser from 'phaser';
import { audio } from '../systems/AudioManager.js';
import { PALETTE } from '../config.js';

export class Menu {
  constructor(scene, { x, y, items, spacing = 16, fontSize = 10, align = 'center' }) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.spacing = spacing;
    this.fontSize = fontSize;
    this.align = align;
    this.index = 0;
    this.texts = [];
    this.items = items;

    this._build();
    this._bindInput();
    this._refresh();
  }

  _build() {
    this.items.forEach((item, i) => {
      const t = this.scene.add
        .text(this.x, this.y + i * this.spacing, '', {
          fontFamily: 'monospace',
          fontSize: `${this.fontSize}px`,
          color: '#e8e0cf',
        })
        .setOrigin(this.align === 'center' ? 0.5 : 0, 0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(10);

      t.on('pointerover', () => {
        if (this.index !== i) {
          this.index = i;
          audio.unlock();
          audio.play('uiMove');
          this._refresh();
        }
      });
      t.on('pointerdown', (pointer, localX) => {
        audio.unlock();
        this.index = i;
        const item = this.items[i];
        // Adjustable items (volume sliders, cycle options) have no inherent
        // "click" action — tapping the LEFT half decreases, the RIGHT half
        // increases. This is the only way to change them on touch/mouse.
        if (item.onAdjust) {
          // localX is in the text's local space [0, width].
          const dir = localX < t.width / 2 ? -1 : 1;
          this._adjust(dir);
        } else {
          this._activate();
        }
      });
      this.texts.push(t);
    });
  }

  _bindInput() {
    const kb = this.scene.input.keyboard;
    this._keyHandler = (e) => {
      // Pause navigation while the host scene is capturing a key rebind.
      if (this.scene.rebinding) return;
      audio.unlock();
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.move(-1);
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.move(1);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this._adjust(-1);
          break;
        case 'ArrowRight':
        case 'KeyD':
          this._adjust(1);
          break;
        case 'Enter':
        case 'Space':
        case 'KeyJ':
          this._activate();
          break;
        default:
          break;
      }
    };
    kb.on('keydown', this._keyHandler);
    this.scene.events.once('shutdown', () => this.destroy());
  }

  move(dir) {
    this.index = (this.index + dir + this.items.length) % this.items.length;
    audio.play('uiMove');
    this._refresh();
  }

  _adjust(dir) {
    const item = this.items[this.index];
    if (item.onAdjust) {
      item.onAdjust(dir);
      audio.play('uiMove');
      this._refresh();
    }
  }

  _activate() {
    const item = this.items[this.index];
    audio.play('uiSelect');
    item.onSelect?.();
    this._refresh();
  }

  _refresh() {
    this.items.forEach((item, i) => {
      const selected = i === this.index;
      const label = typeof item.label === 'function' ? item.label() : item.label;
      // Adjustable items render their value flanked by arrows so it's clear you
      // can tap/click either side to change it (works for touch + mouse).
      let value = '';
      if (item.value) {
        value = item.onAdjust ? `: \u2039 ${item.value()} \u203A` : `: ${item.value()}`;
      }
      const prefix = selected ? '> ' : '  ';
      this.texts[i].setText(`${prefix}${label}${value}`);
      this.texts[i].setColor(selected ? '#ff3b4c' : '#e8e0cf');
      this.texts[i].setScale(selected ? 1.05 : 1);
    });
  }

  refresh() {
    this._refresh();
  }

  destroy() {
    this.scene.input.keyboard.off('keydown', this._keyHandler);
    this.texts.forEach((t) => t.destroy());
  }
}
