// Gilded Vault — the sound board. Every sound is synthesised with
// WebAudio: no audio files, no network, nothing to load. Each call guards
// the AudioContext, so the game also runs silent in a headless screenshot.
export class SoundBoard {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  resume() {
    if (this.ensure() && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  tone(freq, dur, type = 'sine', vol = 1, slideTo = 0) {
    if (this.muted || !this.ensure()) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch { /* silent */ }
  }

  hiss(dur, vol = 0.5, lowpass = 1200) {
    if (this.muted || !this.ensure()) return;
    try {
      const t0 = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start(t0);
    } catch { /* silent */ }
  }

  // Play [freq, dur, type, vol, delay] notes one after another.
  melody(notes) {
    notes.forEach(([f, d, type, v, delay]) => {
      setTimeout(() => this.tone(f, d, type, v), delay);
    });
  }

  step(sprinting) {
    this.hiss(0.07, sprinting ? 0.5 : 0.22, sprinting ? 900 : 500);
  }

  coin() {
    this.melody([[1900, 0.09, 'triangle', 0.5, 0], [2500, 0.12, 'triangle', 0.4, 70]]);
  }

  pickup() {
    this.melody([[660, 0.1, 'sine', 0.6, 0], [990, 0.16, 'sine', 0.6, 80]]);
  }

  keycard() {
    this.melody([[520, 0.08, 'square', 0.25, 0], [780, 0.08, 'square', 0.25, 90], [1040, 0.14, 'square', 0.25, 180]]);
  }

  crackTick() {
    this.tone(1400 + Math.random() * 500, 0.05, 'square', 0.2);
  }

  vaultOpen() {
    this.hiss(0.5, 0.5, 300);
    this.tone(110, 0.5, 'sawtooth', 0.35, 55);
    this.melody([[220, 0.3, 'sine', 0.5, 120]]);
  }

  hackDone() {
    this.melody([[880, 0.12, 'sine', 0.5, 0], [1108, 0.12, 'sine', 0.5, 90], [1318, 0.12, 'sine', 0.5, 180]]);
  }

  smoke() {
    this.hiss(0.4, 0.45, 800);
  }

  beamTrip() {
    this.tone(220, 0.35, 'sawtooth', 0.7, 440);
    this.tone(233, 0.35, 'sawtooth', 0.7, 466);
  }

  spotted() {
    this.melody([[392, 0.16, 'square', 0.4, 0], [311, 0.22, 'square', 0.4, 140]]);
  }

  klaxon() {
    for (let i = 0; i < 3; i++) {
      this.melody([
        [620, 0.22, 'sawtooth', 0.55, i * 260],
        [466, 0.22, 'sawtooth', 0.55, i * 260 + 130],
      ]);
    }
  }

  win() {
    this.melody([[523, 0.28, 'triangle', 0.55, 0], [659, 0.28, 'triangle', 0.55, 130], [784, 0.28, 'triangle', 0.55, 260], [1046, 0.28, 'triangle', 0.55, 390], [1318, 0.28, 'triangle', 0.55, 520]]);
  }

  lose() {
    this.melody([[392, 0.35, 'sawtooth', 0.4, 0], [370, 0.35, 'sawtooth', 0.4, 170], [349, 0.35, 'sawtooth', 0.4, 340], [311, 0.35, 'sawtooth', 0.4, 510]]);
  }
}
