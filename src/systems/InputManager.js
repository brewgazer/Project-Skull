// InputManager
// ----------------------------------------------------------------------------
// Maps configurable keybinds (and, in the future, gamepad buttons) to abstract
// game "actions" so gameplay code never references raw keys. Supports rebinding
// at runtime via the settings menu. Instantiate per gameplay scene.

import Phaser from 'phaser';
import { saveSystem } from './SaveSystem.js';
import { touch } from './touch.js';

export class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.keys = {}; // action -> [Phaser.Key]
    this._touchSeen = {}; // action -> last consumed touch press count
    this.build();

    // Re-create keys if bindings change while a scene is live.
    this._onSettings = () => this.build();
    scene.game.events.on('rebind', this._onSettings);
    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  build() {
    // Clear any previously registered keys.
    for (const list of Object.values(this.keys)) {
      list.forEach((k) => this.scene.input.keyboard.removeKey(k, false));
    }
    this.keys = {};

    const binds = saveSystem.settings.keybinds;
    const KeyCodes = Phaser.Input.Keyboard.KeyCodes;
    for (const [action, names] of Object.entries(binds)) {
      this.keys[action] = names
        .map((n) => KeyCodes[n])
        .filter((code) => code !== undefined)
        .map((code) => this.scene.input.keyboard.addKey(code, true, false));
      // Sync the touch edge baseline so a press made on a previous scene does
      // not spuriously fire justDown() the instant this scene starts.
      this._touchSeen[action] = touch.pressCount[action] || 0;
    }
  }

  /** True while any bound key for the action is held — keyboard OR touch. */
  isDown(action) {
    if (touch.held[action]) return true;
    const list = this.keys[action];
    if (!list) return false;
    for (const k of list) if (k.isDown) return true;
    return false;
  }

  /** True on the frame the action was first pressed — keyboard OR touch.
   *  The touch edge is consumed on first read this frame. */
  justDown(action) {
    const list = this.keys[action];
    if (list) {
      for (const k of list) if (Phaser.Input.Keyboard.JustDown(k)) return true;
    }
    const pc = touch.pressCount[action] || 0;
    if (pc > (this._touchSeen[action] || 0)) {
      this._touchSeen[action] = pc;
      return true;
    }
    return false;
  }

  /** Horizontal axis in [-1, 1] from left/right actions. */
  get axisX() {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }

  destroy() {
    this.scene.game.events.off('rebind', this._onSettings);
  }
}
