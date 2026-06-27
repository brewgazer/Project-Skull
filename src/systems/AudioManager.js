// AudioManager
// ----------------------------------------------------------------------------
// SFX and the chainsaw engine are synthesized at runtime with the Web Audio
// API. The soundtrack uses real looping MP3 tracks (HTML5 Audio) layered on top
// of that engine: a signature anthem for the menu + level 1, and a randomly
// shuffled pool of tracks from level 2 onward.

import anthemUrl from '../assets/audio/subwoofer-riddim.mp3?url';
import squareFourRumbleUrl from '../assets/audio/square-four-rumble.mp3?url';
import blackIronRiftUrl from '../assets/audio/black-iron-rift.mp3?url';
import square4Riddim1Url from '../assets/audio/square4-riddim-1.mp3?url';
import square4Riddim2Url from '../assets/audio/square4-riddim-2.mp3?url';
import gravelBreakUrl from '../assets/audio/gravel-break.mp3?url';
import cutTheGridUrl from '../assets/audio/cut-the-grid.mp3?url';

// The signature track (menu + level 1 only).
const ANTHEM = 'anthem';
// The dedicated boss-fight track (final level only).
const BOSS = 'cutTheGrid';
const TRACK_URLS = {
  [ANTHEM]: anthemUrl,
  squareFourRumble: squareFourRumbleUrl,
  blackIronRift: blackIronRiftUrl,
  square4Riddim1: square4Riddim1Url,
  square4Riddim2: square4Riddim2Url,
  gravelBreak: gravelBreakUrl,
  [BOSS]: cutTheGridUrl,
};
// The mid-game rotation pool. Excludes the anthem and the boss-only track.
const POOL = ['squareFourRumble', 'blackIronRift', 'square4Riddim1', 'square4Riddim2', 'gravelBreak'];
// The anthem is exclusive to the menu, level 1 and level 10.
const ANTHEM_LEVELS = [1, 10];
// Boss-fight levels always play the boss track and nothing else.
const BOSS_LEVELS = [9, 18];

const NOTE = {
  // frequencies for a dark minor scale (E minor-ish), in Hz
  E1: 41.2, G1: 49.0, A1: 55.0, B1: 61.7, D2: 73.4, E2: 82.4,
  G2: 98.0, A2: 110.0, B2: 123.5, D3: 146.8, E3: 164.8,
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.noiseBuffer = null;

    this.volumes = { master: 0.8, music: 0.6, sfx: 0.9 };
    this.unlocked = false;

    // chainsaw engine state
    this.saw = null;

    // real-track soundtrack state (HTML5 Audio)
    this.tracks = {}; // key -> HTMLAudioElement
    this._tracksBuilt = false;
    this.currentTrack = null;
    this.currentTrackKey = null;
    this._lastPoolKey = null; // avoid repeating the same pool track back-to-back

    // music scheduler state
    this.music = {
      playing: false,
      bpm: 140,
      step: 0,
      nextTime: 0,
      timer: null,
      intensity: 0, // 0..1, raised during combat
    };
  }

  /** Create the audio graph lazily after a user gesture (browser policy). */
  unlock() {
    if (this.unlocked) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.ctx.destination);

    // Pre-render a noise buffer for percussive / texture sounds.
    const len = this.ctx.sampleRate * 1;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.unlocked = true;
    this.applyVolumes();
  }

  setVolumes(v) {
    Object.assign(this.volumes, v);
    this.applyVolumes();
  }

  applyVolumes() {
    // Real-track volume is independent of the Web Audio graph, so update it
    // even before the synth context is unlocked.
    if (this.currentTrack && !this.currentTrack._fading) {
      this.currentTrack.volume = this._trackVolume();
    }
    if (!this.unlocked) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, now, 0.02);
    this.musicBus.gain.setTargetAtTime(this.volumes.music, now, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, now, 0.02);
  }

  // --- real soundtrack (looping MP3 tracks) -----------------------------

  _trackVolume() {
    return Math.max(0, Math.min(1, this.volumes.master * this.volumes.music));
  }

  _ensureTracks() {
    if (this._tracksBuilt || typeof Audio === 'undefined') return;
    for (const [key, url] of Object.entries(TRACK_URLS)) {
      const el = new Audio(url);
      el.loop = true;
      el.preload = 'auto';
      el.volume = this._trackVolume();
      this.tracks[key] = el;
    }
    this._tracksBuilt = true;
  }

  /** Play a named track on loop, crossfading from whatever is playing. If the
   *  requested track is already playing it is left untouched (seamless hand-off
   *  e.g. menu -> level 1). */
  playTrack(key) {
    this._ensureTracks();
    const next = this.tracks[key];
    if (!next) return;
    if (this.currentTrack === next && !next.paused) return; // already playing

    if (this.currentTrack && this.currentTrack !== next) {
      this._fadeOutTrack(this.currentTrack);
    }
    this.currentTrack = next;
    this.currentTrackKey = key;
    next._fading = false;
    try { next.currentTime = 0; } catch (_) { /* not seekable yet */ }
    next.volume = this._trackVolume();
    const p = next.play();
    // Autoplay may be blocked until a user gesture; it will be retried the next
    // time a scene (re)requests music after unlock().
    if (p && p.catch) p.catch(() => {});
  }

  _fadeOutTrack(el) {
    el._fading = true;
    const startVol = el.volume;
    const steps = 12;
    let i = 0;
    const tick = () => {
      i++;
      el.volume = Math.max(0, startVol * (1 - i / steps));
      if (i >= steps) {
        el.pause();
        try { el.currentTime = 0; } catch (_) { /* noop */ }
        el._fading = false;
      } else {
        setTimeout(tick, 40);
      }
    };
    setTimeout(tick, 40);
  }

  /** Menu music: always the signature anthem. */
  playMenuMusic() {
    this.playTrack(ANTHEM);
  }

  /** Level music: boss levels always play the boss track; the anthem levels
   *  (1 and 10) play the signature anthem; every other level pulls a random
   *  pool track (avoiding an immediate repeat). */
  playLevelMusic(levelNumber) {
    if (BOSS_LEVELS.includes(levelNumber)) {
      this.playTrack(BOSS);
      return;
    }
    if (ANTHEM_LEVELS.includes(levelNumber)) {
      this.playTrack(ANTHEM);
      return;
    }
    let key = POOL[Math.floor(Math.random() * POOL.length)];
    if (POOL.length > 1 && key === this._lastPoolKey) {
      key = POOL[(POOL.indexOf(key) + 1) % POOL.length];
    }
    this._lastPoolKey = key;
    this.playTrack(key);
  }

  // --- low level synth helpers ------------------------------------------

  _noise(dur, { gain = 0.5, type = 'highpass', freq = 1000, q = 1, decay = true } = {}) {
    if (!this.unlocked) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    if (decay) g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start(now);
    src.stop(now + dur);
  }

  _tone(freq, dur, { type = 'square', gain = 0.3, slideTo = null, bus = null } = {}) {
    if (!this.unlocked) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(bus || this.sfxBus);
    osc.start(now);
    osc.stop(now + dur);
  }

  // --- SFX vocabulary ---------------------------------------------------

  play(name) {
    if (!this.unlocked) return;
    switch (name) {
      case 'slash':
        this._noise(0.18, { gain: 0.35, type: 'bandpass', freq: 3500, q: 0.7 });
        this._tone(900, 0.1, { type: 'sawtooth', gain: 0.12, slideTo: 300 });
        break;
      case 'hit':
        this._noise(0.12, { gain: 0.5, type: 'lowpass', freq: 1800 });
        this._tone(160, 0.12, { type: 'square', gain: 0.25, slideTo: 60 });
        break;
      case 'crit':
        this._noise(0.2, { gain: 0.6, type: 'lowpass', freq: 2200 });
        this._tone(220, 0.2, { type: 'square', gain: 0.3, slideTo: 50 });
        this._tone(660, 0.15, { type: 'sawtooth', gain: 0.18, slideTo: 120 });
        break;
      case 'batHit':
        this._tone(420, 0.14, { type: 'triangle', gain: 0.4, slideTo: 90 });
        this._noise(0.1, { gain: 0.4, type: 'bandpass', freq: 1200, q: 1.5 });
        break;
      case 'gib':
        this._noise(0.25, { gain: 0.5, type: 'lowpass', freq: 900 });
        this._tone(120, 0.25, { type: 'sawtooth', gain: 0.2, slideTo: 40 });
        break;
      case 'explosion':
        this._noise(0.7, { gain: 0.9, type: 'lowpass', freq: 700 });
        this._tone(90, 0.6, { type: 'square', gain: 0.4, slideTo: 30 });
        break;
      case 'crateBreak':
        this._noise(0.2, { gain: 0.4, type: 'bandpass', freq: 2000, q: 0.6 });
        this._tone(300, 0.12, { type: 'square', gain: 0.15, slideTo: 120 });
        break;
      case 'hurt':
        this._tone(330, 0.18, { type: 'sawtooth', gain: 0.3, slideTo: 110 });
        break;
      case 'death':
        this._tone(220, 0.5, { type: 'sawtooth', gain: 0.3, slideTo: 50 });
        break;
      case 'pickup':
        this._tone(660, 0.08, { type: 'square', gain: 0.25 });
        this._tone(990, 0.1, { type: 'square', gain: 0.22 });
        break;
      case 'uiMove':
        this._tone(440, 0.05, { type: 'square', gain: 0.18 });
        break;
      case 'uiSelect':
        this._tone(550, 0.07, { type: 'square', gain: 0.22 });
        this._tone(880, 0.09, { type: 'square', gain: 0.2 });
        break;
      case 'comboUp':
        this._tone(700, 0.06, { type: 'triangle', gain: 0.2 });
        this._tone(1050, 0.07, { type: 'triangle', gain: 0.18 });
        break;
      case 'jump':
        this._tone(300, 0.12, { type: 'square', gain: 0.18, slideTo: 600 });
        break;
      case 'bossRoar':
        this._tone(70, 0.8, { type: 'sawtooth', gain: 0.5, slideTo: 120 });
        this._noise(0.8, { gain: 0.4, type: 'lowpass', freq: 500 });
        break;
      default:
        break;
    }
  }

  // --- chainsaw engine (continuous loop) --------------------------------

  startChainsaw() {
    if (!this.unlocked || this.saw) return;
    const idle = this.ctx.createOscillator();
    const rev = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    idle.type = 'sawtooth';
    rev.type = 'square';
    idle.frequency.value = 80;
    rev.frequency.value = 160;
    lfo.type = 'sawtooth';
    lfo.frequency.value = 28; // engine chug
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(idle.frequency);
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    g.gain.value = 0.0;
    idle.connect(filter);
    rev.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    idle.start();
    rev.start();
    lfo.start();
    g.gain.setTargetAtTime(0.16, this.ctx.currentTime, 0.05);
    this.saw = { idle, rev, lfo, g, filter };
  }

  revChainsaw(active) {
    if (!this.saw) return;
    const now = this.ctx.currentTime;
    const target = active ? 0.32 : 0.14;
    this.saw.g.gain.setTargetAtTime(target, now, 0.04);
    this.saw.idle.frequency.setTargetAtTime(active ? 120 : 80, now, 0.05);
    this.saw.filter.frequency.setTargetAtTime(active ? 2600 : 1400, now, 0.05);
  }

  stopChainsaw() {
    if (!this.saw) return;
    const s = this.saw;
    const now = this.ctx.currentTime;
    s.g.gain.setTargetAtTime(0, now, 0.08);
    setTimeout(() => {
      try {
        s.idle.stop();
        s.rev.stop();
        s.lfo.stop();
      } catch (e) {
        /* already stopped */
      }
    }, 200);
    this.saw = null;
  }

  // --- procedural music -------------------------------------------------

  startMusic(bpm = 140) {
    if (!this.unlocked || this.music.playing) return;
    this.music.playing = true;
    this.music.bpm = bpm;
    this.music.step = 0;
    this.music.nextTime = this.ctx.currentTime + 0.1;
    this._scheduleLoop();
  }

  setMusicIntensity(v) {
    this.music.intensity = Math.max(0, Math.min(1, v));
  }

  stopMusic() {
    // Stop the procedural scheduler (legacy/fallback)...
    this.music.playing = false;
    if (this.music.timer) {
      clearTimeout(this.music.timer);
      this.music.timer = null;
    }
    // ...and the real soundtrack.
    if (this.currentTrack) {
      this.currentTrack.pause();
      try { this.currentTrack.currentTime = 0; } catch (_) { /* noop */ }
      this.currentTrack._fading = false;
      this.currentTrack = null;
      this.currentTrackKey = null;
    }
  }

  _scheduleLoop() {
    if (!this.music.playing) return;
    const secPerStep = 60 / this.music.bpm / 4; // 16th notes
    while (this.music.nextTime < this.ctx.currentTime + 0.2) {
      this._playStep(this.music.step, this.music.nextTime, secPerStep);
      this.music.step = (this.music.step + 1) % 32;
      this.music.nextTime += secPerStep;
    }
    this.music.timer = setTimeout(() => this._scheduleLoop(), 40);
  }

  _playStep(step, time, dur) {
    const i = this.music.intensity;
    // Driving bassline (E minor riff).
    const bass = [
      NOTE.E1, NOTE.E1, 0, NOTE.E1, NOTE.G1, 0, NOTE.E1, 0,
      NOTE.A1, 0, NOTE.A1, 0, NOTE.B1, 0, NOTE.D2, NOTE.B1,
      NOTE.E1, NOTE.E1, 0, NOTE.E1, NOTE.G1, 0, NOTE.E1, 0,
      NOTE.A1, 0, NOTE.B1, 0, NOTE.D2, NOTE.E2, NOTE.D2, NOTE.B1,
    ];
    const f = bass[step];
    if (f) this._scheduleTone(f, time, dur * 1.8, 'sawtooth', 0.18 + i * 0.06, this.musicBus, 'lowpass', 600 + i * 600);

    // Kick on every quarter.
    if (step % 4 === 0) this._scheduleKick(time);
    // Snare on the back-beats once intensity rises.
    if (step % 8 === 4 && i > 0.2) this._scheduleSnare(time);
    // Hats — denser as intensity climbs.
    if (step % 2 === 0 || (i > 0.5 && step % 1 === 0)) this._scheduleHat(time, 0.06 + i * 0.05);

    // Lead stabs during high intensity (combat peaks).
    if (i > 0.6) {
      const lead = [NOTE.E3, 0, NOTE.G2, 0, NOTE.B2, 0, NOTE.A2, 0,
        NOTE.E3, 0, 0, NOTE.D3, 0, NOTE.B2, 0, NOTE.A2,
        NOTE.E3, 0, NOTE.G2, 0, NOTE.B2, 0, NOTE.D3, 0,
        NOTE.E3, NOTE.D3, NOTE.B2, 0, NOTE.A2, 0, NOTE.G2, 0];
      const lf = lead[step];
      if (lf) this._scheduleTone(lf, time, dur * 1.2, 'square', 0.07, this.musicBus, 'bandpass', 1800);
    }
  }

  _scheduleTone(freq, time, dur, type, gain, bus, filterType, filterFreq) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    let node = osc;
    if (filterType) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterFreq;
      osc.connect(filter);
      node = filter;
    }
    node.connect(g);
    g.connect(bus);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  _scheduleKick(time) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    g.gain.setValueAtTime(0.5, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    osc.connect(g);
    g.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  _scheduleSnare(time) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.musicBus);
    src.start(time);
    src.stop(time + 0.16);
  }

  _scheduleHat(time, gain) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.musicBus);
    src.start(time);
    src.stop(time + 0.05);
  }
}

// Single shared instance across the whole game.
export const audio = new AudioManager();
