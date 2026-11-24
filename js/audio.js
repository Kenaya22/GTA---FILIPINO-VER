'use strict';
// ===== Synthesized audio (WebAudio, no files) =====
const AUD = {
  ctx: null, master: null, on: true,
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      this.master = c.createGain();
      this.master.gain.value = this.on ? 0.55 : 0;
      this.master.connect(c.destination);
      // noise buffer
      const len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      // engine
      this.engOsc = c.createOscillator(); this.engOsc.type = 'sawtooth';
      this.engOsc2 = c.createOscillator(); this.engOsc2.type = 'square';
      this.engF = c.createBiquadFilter(); this.engF.type = 'lowpass'; this.engF.frequency.value = 400;
      this.engG = c.createGain(); this.engG.gain.value = 0;
      this.engOsc.connect(this.engF); this.engOsc2.connect(this.engF);
      this.engF.connect(this.engG); this.engG.connect(this.master);
      this.engOsc.start(); this.engOsc2.start();
      // siren
      this.sirOsc = c.createOscillator(); this.sirOsc.type = 'triangle';
      this.sirG = c.createGain(); this.sirG.gain.value = 0;
      this.sirOsc.connect(this.sirG); this.sirG.connect(this.master); this.sirOsc.start();
      // heli
      const hn = c.createBufferSource(); hn.buffer = buf; hn.loop = true;
      const hf = c.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 220;
      this.heliG = c.createGain(); this.heliG.gain.value = 0;
      this.heliAm = c.createGain(); this.heliAm.gain.value = 0.5;
      const lfo = c.createOscillator(); lfo.frequency.value = 13;
      const lfoG = c.createGain(); lfoG.gain.value = 0.5;
      lfo.connect(lfoG); lfoG.connect(this.heliAm.gain);
      hn.connect(hf); hf.connect(this.heliAm); this.heliAm.connect(this.heliG); this.heliG.connect(this.master);
      hn.start(); lfo.start();
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.55 : 0; },
  t() { return this.ctx ? this.ctx.currentTime : 0; },
  engine(on, frac, big) {
    if (!this.ctx) return;
    const t = this.t();
    const base = big ? 32 : 46;
    this.engOsc.frequency.setTargetAtTime(base + frac * (big ? 60 : 110), t, 0.08);
    this.engOsc2.frequency.setTargetAtTime((base + frac * (big ? 60 : 110)) * 0.5, t, 0.08);
    this.engF.frequency.setTargetAtTime(260 + frac * 900, t, 0.1);
    this.engG.gain.setTargetAtTime(on ? 0.045 + frac * 0.04 : 0, t, 0.15);
  },
  siren(vol) {
    if (!this.ctx) return;
    const t = this.t();
    const ph = (t * 0.55) % 1;
    const f = 620 + 520 * (ph < 0.5 ? ph * 2 : 2 - ph * 2);
    this.sirOsc.frequency.setTargetAtTime(f, t, 0.02);
    this.sirG.gain.setTargetAtTime(vol * 0.05, t, 0.2);
  },
  heli(vol) {
    if (!this.ctx) return;
    this.heliG.gain.setTargetAtTime(vol * 0.5, this.t(), 0.3);
  },
  tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.3, freq = 1200, delay = 0, type = 'lowpass') {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  horn(big) {
    if (big) { this.tone(330, 0.35, 'square', 0.08); this.tone(415, 0.35, 'square', 0.08); }
    else { this.tone(440, 0.25, 'square', 0.07); this.tone(554, 0.25, 'square', 0.06); }
  },
  crash(i) { this.noise(0.25 + i * 0.3, Math.min(0.6, 0.15 + i * 0.5), 900 + i * 1200); this.tone(90, 0.2, 'sine', 0.2 * i, 40); },
  punch() { this.noise(0.08, 0.35, 1800); this.tone(120, 0.12, 'sine', 0.3, 60); },
  whoosh() { this.noise(0.12, 0.1, 2500, 0, 'bandpass'); },
  coin() { this.tone(988, 0.08, 'square', 0.08); this.tone(1319, 0.25, 'square', 0.08, 0, 0.08); },
  cash() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.07, 0, i * 0.06)); },
  star() { this.tone(880, 0.12, 'square', 0.1); this.tone(660, 0.18, 'square', 0.1, 0, 0.12); },
  door() { this.noise(0.06, 0.25, 600); this.tone(200, 0.06, 'square', 0.08, 100, 0.03); },
  click() { this.tone(660, 0.05, 'square', 0.05); },
  explosion() { this.noise(1.4, 0.8, 500); this.tone(60, 0.9, 'sine', 0.5, 25); },
  success() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'square', 0.08, 0, i * 0.11)); },
  fail() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, 'sawtooth', 0.07, 0, i * 0.18)); },
  escaped() { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.12, 0, i * 0.1)); },
  checkpoint() { this.tone(1046, 0.1, 'square', 0.08); this.tone(1568, 0.15, 'square', 0.08, 0, 0.08); },
  beep() { this.tone(1200, 0.08, 'square', 0.07); },
  spray() { this.noise(1.2, 0.2, 4000, 0, 'highpass'); },
  snip() { for (let i = 0; i < 5; i++) this.noise(0.04, 0.2, 5000, i * 0.15, 'highpass'); },
};
