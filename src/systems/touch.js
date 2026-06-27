// Touch / mobile controls
// ----------------------------------------------------------------------------
// A platform-agnostic VIRTUAL input layer plus an on-screen control overlay for
// phones/tablets: an analog joystick on the LEFT (push left/right to move, push
// UP to jump) and three action buttons on the RIGHT (ATTACK, EXECUTE, DASH).
//
// It deliberately does NOT touch any gameplay code — the stick/buttons only flip
// abstract action states, and InputManager OR's those in alongside the keyboard.
// PC keyboard play is unchanged.
//
// Action edges (justDown) are tracked with a monotonically increasing press
// counter so detection is frame- and scene-order independent.

import { saveSystem } from './SaveSystem.js';

const ACTIONS = ['left', 'right', 'jump', 'attack', 'heavy', 'dash', 'pause'];

class TouchControls {
  constructor() {
    this.held = {};
    this.pressCount = {};
    this._pointers = {}; // action -> Set<pointerId/string token>
    for (const a of ACTIONS) {
      this.held[a] = false;
      this.pressCount[a] = 0;
      this._pointers[a] = new Set();
    }
    this.mode = 'auto'; // 'auto' | 'on' | 'off'
    this.gameplay = false; // true while a level scene is live
    this.root = null;
    this._initialized = false;

    // Joystick runtime state.
    this._joyId = null; // active pointerId controlling the stick
    this._joyBase = null;
    this._joyKnob = null;
    this._joyCenter = { x: 0, y: 0 };
    this._joyRadius = 48;
  }

  /** Heuristic: does this device look like it has a touchscreen? */
  isTouchDevice() {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      (navigator.maxTouchPoints || 0) > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    );
  }

  /** Whether the on-screen controls should ever be shown for this player/device. */
  get active() {
    if (this.mode === 'on') return true;
    if (this.mode === 'off') return false;
    return this.isTouchDevice(); // auto
  }

  // --- virtual button state -------------------------------------------------

  _down(action, token) {
    const set = this._pointers[action];
    const wasHeld = set.size > 0;
    set.add(token);
    if (!wasHeld) {
      this.held[action] = true;
      this.pressCount[action]++; // rising edge for justDown()
    }
  }

  _up(action, token) {
    const set = this._pointers[action];
    set.delete(token);
    if (set.size === 0) this.held[action] = false;
  }

  /** Set a direction/jump on or off from the joystick (idempotent). */
  _setDir(action, on) {
    const token = `joy:${action}`;
    if (on) this._down(action, token);
    else this._up(action, token);
  }

  releaseAll() {
    for (const a of ACTIONS) {
      this._pointers[a].clear();
      this.held[a] = false;
    }
    this._joyId = null;
    this._resetKnob();
    if (this.root) this.root.querySelectorAll('.tc-btn').forEach((b) => b.classList.remove('tc-active'));
  }

  // --- lifecycle ------------------------------------------------------------

  init() {
    if (this._initialized || typeof document === 'undefined') return;
    this._initialized = true;
    this.mode = saveSystem.settings.touchControls || 'auto';
    this._preventBrowserZoom();
    this._injectStyles();
    this._buildOverlay();
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
    window.addEventListener('resize', () => this._measureJoystick());
    this._applyVisibility();
  }

  /** Stop the mobile browser from pinch-zooming / double-tap-zooming the page
   *  (two-finger play would otherwise zoom the whole canvas). */
  _preventBrowserZoom() {
    const stop = (e) => e.preventDefault();
    // iOS Safari pinch gestures.
    document.addEventListener('gesturestart', stop, { passive: false });
    document.addEventListener('gesturechange', stop, { passive: false });
    document.addEventListener('gestureend', stop, { passive: false });
    // Double-tap to zoom.
    document.addEventListener('dblclick', stop, { passive: false });
    // Multi-touch pinch on Android/Chrome.
    document.addEventListener(
      'touchmove',
      (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); },
      { passive: false }
    );
    // Ctrl/Cmd + wheel zoom on trackpads/desktop.
    document.addEventListener(
      'wheel',
      (e) => { if (e.ctrlKey) e.preventDefault(); },
      { passive: false }
    );
  }

  // Fullscreen is toggled from the Settings/Pause menus (Phaser scale manager),
  // not from an on-screen button.

  /** Called by level scenes so the controls only appear during gameplay. */
  setGameplay(on) {
    if (!this._initialized) this.init();
    this.gameplay = on;
    if (!on) this.releaseAll();
    this._applyVisibility();
  }

  /** Cycle/set the control mode and persist it (used by the Settings menu). */
  setMode(mode) {
    this.mode = mode;
    saveSystem.updateSettings({ touchControls: mode });
    this.releaseAll();
    this._applyVisibility();
  }

  _applyVisibility() {
    if (!this.root) return;
    const show = this.active && this.gameplay;
    this.root.style.display = show ? 'block' : 'none';
    if (show) this._measureJoystick();
  }

  // --- DOM overlay ----------------------------------------------------------

  _injectStyles() {
    const css = `
      #tc-root { position: fixed; inset: 0; z-index: 40; pointer-events: none;
        font-family: monospace; -webkit-user-select: none; user-select: none;
        touch-action: none; }
      #tc-root .tc-btn { position: absolute; pointer-events: auto; touch-action: none;
        display: flex; align-items: center; justify-content: center;
        color: #e8e0cf; font-weight: bold; letter-spacing: 0.04em;
        background: rgba(20,20,28,0.34); border: 2px solid rgba(232,224,207,0.4);
        border-radius: 999px; box-shadow: 0 2px 10px rgba(0,0,0,0.45);
        transition: background 0.05s, transform 0.05s;
        -webkit-tap-highlight-color: transparent; }
      #tc-root .tc-btn.tc-active { background: rgba(179,0,27,0.7);
        border-color: #ff6170; transform: scale(0.94); }
      /* Safe-area insets keep controls clear of camera cutouts, rounded
         corners and the home indicator. */
      #tc-root { --sat: env(safe-area-inset-top); --sar: env(safe-area-inset-right);
        --sab: env(safe-area-inset-bottom); --sal: env(safe-area-inset-left); }
      /* action buttons: right side */
      #tc-root .tc-attack { right: calc(4vmin + var(--sar));  bottom: calc(8vmin + var(--sab));  width: 19vmin; height: 19vmin; font-size: 4.2vmin; }
      #tc-root .tc-heavy  { right: calc(24vmin + var(--sar)); bottom: calc(14vmin + var(--sab)); width: 15vmin; height: 15vmin; font-size: 3vmin; }
      #tc-root .tc-dash   { right: calc(8vmin + var(--sar));  bottom: calc(29vmin + var(--sab)); width: 15vmin; height: 15vmin; font-size: 3.4vmin; }
      /* pause: small, top-right */
      #tc-root .tc-pause  { right: calc(3vmin + var(--sar)); top: calc(3vmin + var(--sat)); width: 9vmin; height: 9vmin; font-size: 4.5vmin;
        background: rgba(20,20,28,0.5); }
      /* joystick: left side */
      #tc-root .tc-joy { position: absolute; pointer-events: auto; touch-action: none;
        left: calc(4vmin + var(--sal)); bottom: calc(6vmin + var(--sab)); width: 30vmin; height: 30vmin;
        border-radius: 50%; background: rgba(20,20,28,0.30);
        border: 2px solid rgba(232,224,207,0.35); box-shadow: 0 2px 12px rgba(0,0,0,0.45);
        -webkit-tap-highlight-color: transparent; }
      #tc-root .tc-knob { position: absolute; left: 50%; top: 50%; width: 14vmin; height: 14vmin;
        margin-left: -7vmin; margin-top: -7vmin; border-radius: 50%;
        background: rgba(232,224,207,0.55); border: 2px solid rgba(255,255,255,0.5);
        box-shadow: 0 1px 6px rgba(0,0,0,0.5); transition: transform 0.04s;
        pointer-events: none; }
      #tc-root .tc-joy-hint { position: absolute; left: 0; right: 0; top: -3.6vmin;
        text-align: center; color: rgba(232,224,207,0.5); font-size: 2.4vmin; }
    `;
    const style = document.createElement('style');
    style.id = 'tc-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  _buildOverlay() {
    const root = document.createElement('div');
    root.id = 'tc-root';

    // --- analog joystick (left) ---
    const joy = document.createElement('div');
    joy.className = 'tc-joy';
    const knob = document.createElement('div');
    knob.className = 'tc-knob';
    const hint = document.createElement('div');
    hint.className = 'tc-joy-hint';
    hint.textContent = 'MOVE  /  \u25B2 JUMP';
    joy.appendChild(hint);
    joy.appendChild(knob);
    root.appendChild(joy);
    this._joyBase = joy;
    this._joyKnob = knob;

    joy.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { joy.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
      this._joyId = e.pointerId;
      this._measureJoystick();
      this._onJoyMove(e);
    });
    joy.addEventListener('pointermove', (e) => {
      if (this._joyId === e.pointerId) this._onJoyMove(e);
    });
    const joyEnd = (e) => {
      if (this._joyId !== e.pointerId) return;
      this._joyId = null;
      this._setDir('left', false);
      this._setDir('right', false);
      this._setDir('jump', false);
      this._resetKnob();
    };
    joy.addEventListener('pointerup', joyEnd);
    joy.addEventListener('pointercancel', joyEnd);
    joy.addEventListener('lostpointercapture', joyEnd);
    joy.addEventListener('contextmenu', (e) => e.preventDefault());

    // --- action buttons (right) ---
    const buttons = [
      { action: 'attack', cls: 'tc-attack', label: 'ATTACK' },
      { action: 'heavy', cls: 'tc-heavy', label: 'EXECUTE' },
      { action: 'dash', cls: 'tc-dash', label: 'DASH' },
      { action: 'pause', cls: 'tc-pause', label: '\u2161' }, // II
    ];
    for (const cfg of buttons) {
      const el = document.createElement('div');
      el.className = `tc-btn ${cfg.cls}`;
      el.textContent = cfg.label;
      el.setAttribute('aria-label', cfg.action);

      const onDown = (e) => {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
        this._down(cfg.action, e.pointerId);
        el.classList.add('tc-active');
      };
      const onUp = (e) => {
        this._up(cfg.action, e.pointerId);
        if (this._pointers[cfg.action].size === 0) el.classList.remove('tc-active');
      };
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
      el.addEventListener('lostpointercapture', onUp);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      root.appendChild(el);
    }

    document.body.appendChild(root);
    this.root = root;
  }

  _measureJoystick() {
    if (!this._joyBase) return;
    const r = this._joyBase.getBoundingClientRect();
    this._joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    this._joyRadius = r.width / 2;
  }

  _onJoyMove(e) {
    let dx = e.clientX - this._joyCenter.x;
    let dy = e.clientY - this._joyCenter.y;
    const radius = this._joyRadius || 48;
    const dist = Math.hypot(dx, dy);
    // Clamp the knob to the base radius for the visual.
    if (dist > radius) {
      dx = (dx / dist) * radius;
      dy = (dy / dist) * radius;
    }
    this._joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;

    // Map to actions with a generous deadzone.
    const dead = radius * 0.32;
    this._setDir('left', dx < -dead);
    this._setDir('right', dx > dead);
    // Push UP to jump (screen y grows downward, so up is negative).
    this._setDir('jump', dy < -dead * 1.05);
  }

  _resetKnob() {
    if (this._joyKnob) this._joyKnob.style.transform = 'translate(0px, 0px)';
  }
}

export const touch = new TouchControls();
