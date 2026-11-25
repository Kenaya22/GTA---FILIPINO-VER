'use strict';
// ===== Music: synthesized songs + car radio stations (WebAudio, no files) =====
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
function chordOf(root, scale, deg, size = 3) {
  const sc = SCALE[scale], out = [];
  for (let k = 0; k < size; k++) { const i = deg + k * 2; out.push(root + sc[i % 7] + 12 * Math.floor(i / 7)); }
  return out;
}
// a repeating melodic motif made from chord tones / scale steps (seeded so phrases repeat)
function makeMotif(seed, steps, density) {
  const R = U.rng(seed), notes = [];
  let deg = 2 + Math.floor(R() * 3);
  for (let s = 0; s < steps; s++) {
    const strong = s % 4 === 0;
    if (R() < (strong ? density + 0.25 : density * 0.6)) {
      deg += Math.floor(R() * 5) - 2; deg = U.clamp(deg, 0, 9);
      const len = R() < 0.35 ? 4 : R() < 0.6 ? 2 : 1;
      notes.push({ s, deg, len }); s += len - 1;
    }
  }
  return notes;
}
function scaleNote(root, scale, deg) { const sc = SCALE[scale]; return root + sc[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7); }

const SONGS = {
  // ---- Title theme: heroic minor with kulintang gongs ----
  title: {
    vol: 1.7, bpm: 100, root: 57, scale: 'minor', prog: [0, 5, 2, 6], loop: 16,
    init(M) { this.motA = makeMotif(11, 32, 0.45); this.motB = makeMotif(29, 32, 0.5); },
    play(M, bar, s, t, sd) {
      const b = bar % this.loop, ch = chordOf(this.root, this.scale, this.prog[b % 4]);
      if (s === 0) M.pad(t, ch.map(n => n), sd * 16, 0.05);
      if ([0, 3, 6, 8, 11, 14].includes(s)) M.gong(t, ch[[0, 1, 2, 1, 2, 0][[0, 3, 6, 8, 11, 14].indexOf(s)]] + 12, 0.08);
      if (b >= 4) {
        if ([0, 6, 8, 14].includes(s)) M.bass(t, ch[0] - 24, sd * 2, 0.16, 'sawtooth', 500);
        if (s === 0 || s === 8 || s === 10) M.kick(t, 0.8);
        if (s === 4 || s === 12) M.snare(t, 0.45);
        if (s % 2 === 0) M.hat(t, 0.5);
      }
      if (b >= 8) {
        const mot = b < 12 ? this.motA : this.motB, off = (b % 2) * 16;
        for (const n of mot) if (n.s === s + off) M.lead(t, scaleNote(this.root + 12, this.scale, n.deg), sd * n.len * 0.95, 0.06, 'square', 2200);
      }
      if (b === this.loop - 1 && s === 8) M.rise(t, sd * 8, 0.05);
    },
  },
  // ---- HIMIG FM: OPM pop ballad ----
  himig: {
    vol: 1.25, bpm: 84, root: 62, scale: 'major', loop: 16,
    init() { this.mot = [makeMotif(101, 32, 0.4), makeMotif(131, 32, 0.45), makeMotif(171, 32, 0.5)]; },
    prog(b) { return b % 16 < 8 ? [0, 4, 5, 3][b % 4] : [3, 4, 2, 5][b % 4]; },
    play(M, bar, s, t, sd) {
      const b = bar % this.loop, ch = chordOf(this.root, this.scale, this.prog(b));
      if (s === 0) M.pad(t, ch.map(n => n - 12), sd * 16, 0.035);
      const arp = [0, 1, 2, 3, 2, 1, 0, 1], tones = [ch[0], ch[1], ch[2], ch[0] + 12];
      if (s % 2 === 0) M.pluck(t, tones[arp[s / 2]], sd * 3, 0.06, 'triangle');
      if (s === 0 || s === 10) M.bass(t, ch[0] - 24, sd * 6, 0.14, 'triangle', 900);
      if (s === 12) M.bass(t, ch[2] - 24, sd * 3, 0.1, 'triangle', 900);
      if (s === 0 || s === 7 || s === 10) M.kick(t, 0.5);
      if (s === 4 || s === 12) M.snare(t, 0.25);
      M.shaker(t, s % 4 === 2 ? 0.09 : 0.04);
      const mot = this.mot[b < 8 ? 0 : b < 12 ? 1 : 2], off = (b % 2) * 16;
      if (b >= 2) for (const n of mot) if (n.s === s + off) M.keys(t, scaleNote(this.root + 12, this.scale, n.deg), sd * n.len * 1.4, 0.07);
    },
  },
  // ---- BUDOTS 101: dance ----
  budots: {
    bpm: 126, root: 53, scale: 'minor', loop: 16,
    init() { this.riff = makeMotif(55, 32, 0.6); this.riff2 = makeMotif(77, 32, 0.7); },
    play(M, bar, s, t, sd) {
      const b = bar % this.loop, deg = [0, 0, 5, 6][b % 4], ch = chordOf(this.root, this.scale, deg);
      if (s % 4 === 0) M.kick(t, 0.9);
      if (s % 4 === 2) M.hat(t, 0.9, true);
      if (s === 4 || s === 12) M.clap(t, 0.5);
      if (s % 2 === 1 && b >= 2) M.hat(t, 0.35);
      if ([0, 3, 6, 10, 12].includes(s)) M.tsug(t, ch[0] - 12 + (s === 10 ? 7 : 0), 0.16);
      if (b >= 4 && [2, 6, 14].includes(s)) M.stab(t, ch.map(n => n + 12), 0.04);
      if (b >= 4) {
        const r = b >= 8 && b < 12 ? this.riff2 : this.riff, off = (b % 2) * 16;
        for (const n of r) if (n.s === s + off) M.lead(t, scaleNote(this.root + 24, this.scale, n.deg), sd * n.len * 0.8, 0.05, 'square', 3200, 2);
      }
      if (b % 8 === 0 && s === 0 && bar > 0) M.horn(t, 0.08);
    },
  },
  // ---- KALYE RAP: boom bap with gongs ----
  kalye: {
    bpm: 88, root: 52, scale: 'minor', swing: 0.2, loop: 8,
    chords: [[52, 55, 59], [48, 52, 55], [45, 48, 52], [47, 51, 54]],
    init() { this.mot = makeMotif(303, 32, 0.3); },
    play(M, bar, s, t, sd) {
      const b = bar % this.loop, ch = this.chords[b % 4];
      if (s === 0 || s === 7 || s === 10) M.kick(t, 0.95);
      if (s === 4 || s === 12) M.snare(t, 0.55);
      if (s % 2 === 0) M.hat(t, s % 4 === 0 ? 0.35 : 0.55);
      if (b % 4 === 3 && s >= 13) M.hat(t, 0.4);
      if (s === 0) M.sub(t, ch[0] - 24, sd * 9, 0.22);
      if (s === 10) M.sub(t, ch[0] - 24, sd * 5, 0.18);
      if (s === 0 || s === 6) M.keys(t, ch[0], sd * 5, 0.05), M.keys(t, ch[1], sd * 5, 0.04), M.keys(t, ch[2], sd * 5, 0.04);
      if (bar % 16 >= 4) { const off = (b % 2) * 16; for (const n of this.mot) if (n.s === s + off) M.gong(t, scaleNote(this.root + 12, this.scale, n.deg), 0.07); }
    },
  },
  // ---- Walking around: lo-fi ----
  lakad: {
    vol: 0.6, bpm: 74, swing: 0.22, loop: 8,
    chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
    init() { this.mot = makeMotif(707, 32, 0.28); },
    play(M, bar, s, t, sd) {
      const b = bar % this.loop, ch = this.chords[b % 4];
      if (s === 0) for (const n of ch) M.keys(t + Math.random() * 0.02, n, sd * 14, 0.035);
      if (s === 8 && b % 2) for (const n of ch) M.keys(t, n + 12, sd * 6, 0.015);
      if (s === 0 || s === 10) M.kick(t, 0.45);
      if (s === 8) M.snare(t, 0.18);
      if (s % 2 === 0) M.hat(t, 0.18);
      if (s === 0) M.sub(t, ch[0] - 24, sd * 12, 0.12);
      if (Math.random() < 0.35) M.crackle(t);
      if (bar % 16 >= 8) { const off = (b % 2) * 16; for (const n of this.mot) if (n.s === s + off) M.pluck(t, scaleNote(65, 'major', n.deg), sd * 4, 0.04, 'sine'); }
    },
  },
  // ---- Police chase: driving tension, layers grow with stars ----
  chase: {
    bpm: 140, root: 50, scale: 'minor', loop: 8,
    play(M, bar, s, t, sd) {
      const b = bar % this.loop, deg = [0, 0, 5, 6, 0, 0, 3, 4][b], ch = chordOf(this.root, this.scale, deg);
      const I = M.intensity || 1;
      const pat = [0, 0, 12, 0, 0, 12, 0, 10, 0, 0, 12, 0, 7, 0, 12, 10];
      M.bass(t, ch[0] - 12 + pat[s], sd * 0.9, 0.13, 'sawtooth', 700 + I * 120);
      if (s % 4 === 0) M.kick(t, 0.85);
      if (I >= 2 && (s === 4 || s === 12)) M.snare(t, 0.45);
      if (I >= 2) M.hat(t, s % 2 ? 0.2 : 0.35);
      if (I >= 3 && [0, 3, 6].includes(s)) M.stab(t, ch.map(n => n + 12), 0.04);
      if (I >= 4 && b % 2 === 1 && s === 0) M.lead(t, ch[0] + 24, sd * 14, 0.035, 'sawtooth', 2500, 0, ch[0] + 31);
      if (I >= 5 && b === this.loop - 1 && s >= 8) M.tom(t, 50 - (s - 8), 0.35);
      if (I >= 5 && s === 14) M.kick(t, 0.6);
    },
  },
};

const STATIONS = [
  { id: 'himig', name: 'HIMIG FM 98.7', genre: 'OPM Pop', lines: [
    'Para sa lahat ng nagmamahal... at naiipit sa traffic sa Taft.',
    'Request ni Jun ng Tondo para kay Marites: "Sorry na, hindi na ako male-late."',
    'Ad: Pancit ni Lola Pina — mahaba ang buhay, mahaba rin ang pila!',
    'Kumusta mga ka-Himig! Ang init ngayong gabi, mag-sando na tayo.',
    'Paalala: bawal mag-videoke lampas alas-diyes. Bulong-bulong lang.'] },
  { id: 'budots', name: 'BUDOTS 101.1', genre: 'Budots / Dance', lines: [
    'BUDOTS 101 — sayaw muna bago ang trabaho!',
    'Ad: Videoke Rental ni Kuya Jojo — tatlong araw, isang bayad, libreng mic na may echo!',
    'Shout out sa mga tricycle driver ng Pasay! Busina kung sumasayaw ka!',
    'Huwag mag-text habang nagda-drive. Sumayaw ka na lang.'] },
  { id: 'kalye', name: 'KALYE RAP 89.5', genre: 'Pinoy Hip-Hop', lines: [
    'Kalye Rap — tunog ng kanto, bars ng bayan.',
    'Ad: Tindahan ni Aling Nena — may load, may yelo, may chismis.',
    'Paalala: kung may humahabol na pulis, magpalit ng damit. Hindi kami ang nagsabi niyan.',
    'Freestyle Friday sa Divisoria. Bring your own beat.'] },
  { id: 'off', name: 'RADYO OFF', genre: '', lines: [] },
];

const MUSIC = {
  bus: null, track: null, song: null, step: 0, nextT: 0, intensity: 1, duck: 1, radioFx: false,
  stationIdx: 0, djT: 25, switching: false,
  init() {
    const c = AUD.ctx; if (!c || this.bus) return;
    this.bus = c.createGain(); this.bus.gain.value = 0;
    this.filt = c.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.frequency.value = 18000;
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -18; this.comp.ratio.value = 3;
    this.bus.connect(this.filt); this.filt.connect(this.comp); this.comp.connect(AUD.out);
    setInterval(() => this.tick(), 25);
  },
  target() { return SETTINGS.music * this.duck * (this.song ? (this.song.vol || 1) : 0); },
  play(name) {
    if (name === this.track) return;
    this.track = name;
    if (!this.bus) return;
    const c = AUD.ctx, now = c.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setTargetAtTime(0, now, 0.08);
    clearTimeout(this.swT);
    this.switching = true;
    this.swT = setTimeout(() => {
      this.switching = false;
      this.song = SONGS[name] || null;
      this.step = 0; this.nextT = AUD.ctx.currentTime + 0.05;
      if (this.song && this.song.init && !this.song._ready) { this.song.init(this); this.song._ready = true; }
      this.applyGain();
    }, 320);
  },
  applyGain() {
    if (!this.bus || this.switching) return;
    const c = AUD.ctx;
    this.bus.gain.setTargetAtTime(this.target() * (AUD.on ? 1 : 0), c.currentTime, 0.15);
    this.filt.frequency.setTargetAtTime(this.radioFx ? 4200 : 18000, c.currentTime, 0.1);
  },
  tick() {
    const c = AUD.ctx;
    if (!c || !this.song || c.state !== 'running') return;
    const song = this.song, sd = 60 / song.bpm / 4;
    if (this.nextT < c.currentTime - 0.3) this.nextT = c.currentTime + 0.05;
    while (this.nextT < c.currentTime + 0.15) {
      const bar = Math.floor(this.step / 16), s = this.step % 16;
      let t = this.nextT;
      if (song.swing && s % 2) t += sd * song.swing;
      try { song.play(this, bar, s, t, sd); } catch (e) { }
      this.step++; this.nextT += sd;
    }
  },
  // -------- instruments --------
  env(g, t, a, peak, dur, rel = 0.05) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + Math.max(a, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
  },
  osc(type, f, t, dur, peak, a = 0.005, dest, rel) {
    const c = AUD.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    this.env(g, t, a, peak, dur, rel);
    o.connect(g); g.connect(dest || this.bus);
    o.start(t); o.stop(t + dur + (rel || 0.05) + 0.05);
    return o;
  },
  lp(f, t, f2, dur) {
    const c = AUD.ctx, fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    fl.connect(this.bus); return fl;
  },
  noise(t, dur, peak, type, freq, q = 1) {
    const c = AUD.ctx, s = c.createBufferSource(); s.buffer = AUD.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.bus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  },
  kick(t, v) {
    const c = AUD.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(v * 0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.4);
  },
  snare(t, v) { this.noise(t, 0.18, v * 0.5, 'bandpass', 1800, 0.7); this.osc('triangle', 190, t, 0.06, v * 0.3, 0.002); },
  clap(t, v) { for (let k = 0; k < 3; k++) this.noise(t + k * 0.011, 0.03, v * 0.5, 'bandpass', 1500, 1); this.noise(t + 0.033, 0.15, v * 0.35, 'bandpass', 1400, 1); },
  hat(t, v, open) { this.noise(t, open ? 0.2 : 0.045, v * 0.16, 'highpass', 7500); },
  shaker(t, v) { this.noise(t, 0.06, v, 'bandpass', 6500, 2); },
  crackle(t) { this.noise(t + Math.random() * 0.1, 0.008, 0.05 + Math.random() * 0.05, 'highpass', 3000); },
  tom(t, m, v) { const c = AUD.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(mtof(m), t); o.frequency.exponentialRampToValueAtTime(mtof(m) * 0.5, t + 0.2); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.3); },
  bass(t, m, dur, v, type = 'sawtooth', cut = 600) { const f = this.lp(cut * 3, t, cut, Math.min(dur, 0.2)); this.osc(type, mtof(m), t, dur, v, 0.005, f, 0.04); },
  sub(t, m, dur, v) { this.osc('sine', mtof(m), t, dur, v, 0.01, null, 0.15); this.osc('triangle', mtof(m + 12), t, dur * 0.6, v * 0.15, 0.01); },
  tsug(t, m, v) { const f = this.lp(2400, t, 180, 0.09); this.osc('square', mtof(m), t, 0.09, v, 0.002, f, 0.03); },
  pad(t, ms, dur, v) {
    const f = this.lp(1300);
    for (const m of ms) for (const d of [-7, 7]) { const o = this.osc('sawtooth', mtof(m), t, dur, v * 0.5, 0.35, f, 0.5); o.detune.value = d; }
  },
  pluck(t, m, dur, v, type = 'triangle') { this.osc(type, mtof(m), t, Math.min(dur, 0.35), v, 0.003, null, 0.2); },
  keys(t, m, dur, v) { this.osc('sine', mtof(m), t, dur, v, 0.01, null, 0.3); this.osc('triangle', mtof(m + 12), t, dur * 0.4, v * 0.25, 0.005, null, 0.2); },
  gong(t, m, v) {
    const f = mtof(m);
    this.osc('sine', f, t, 0.05, v, 0.002, null, 1.1);
    this.osc('sine', f * 2.76, t, 0.03, v * 0.35, 0.002, null, 0.5);
    this.osc('sine', f * 5.4, t, 0.02, v * 0.12, 0.002, null, 0.25);
  },
  lead(t, m, dur, v, type = 'square', cut = 2500, slide = 0, slideTo) {
    const f = this.lp(cut);
    const o = this.osc(type, mtof(m + slide), t, dur, v, 0.01, f, 0.06);
    if (slide) o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.06);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(mtof(slideTo), t + dur);
  },
  stab(t, ms, v) { const f = this.lp(3200, t, 900, 0.12); for (const m of ms) this.osc('sawtooth', mtof(m), t, 0.1, v, 0.003, f, 0.05); },
  horn(t, v) { for (const m of [65, 69, 72]) { const o = this.osc('sawtooth', mtof(m), t, 0.5, v, 0.01, this.lp(2600), 0.1); o.frequency.exponentialRampToValueAtTime(mtof(m - 5), t + 0.55); } },
  rise(t, dur, v) {
    const c = AUD.ctx, s = c.createBufferSource(); s.buffer = AUD.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(6000, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    s.connect(f); f.connect(g); g.connect(this.bus); s.start(t); s.stop(t + dur + 0.1);
  },

  // -------- game logic: choose what plays --------
  stationOf(v) {
    if (v.station === undefined) v.station = v.type === 'jeepney' || v.type === 'tricycle' ? (Math.random() < 0.6 ? 1 : U.randi(0, 2)) : v.isCop ? 3 : U.randi(0, 2);
    return v.station;
  },
  nextStation() {
    const v = G.player.vehicle; if (!v) return;
    v.station = (this.stationOf(v) + 1) % STATIONS.length;
    AUD.click(); this.announce(v.station);
  },
  announce(i) {
    const st = STATIONS[i];
    UI.radio(st.id === 'off' ? '📻 RADYO OFF' : `📻 ${st.name} · ${st.genre}`);
    this.djT = U.rand(18, 35);
  },
  update(dt, P) {
    if (!AUD.ctx) return;
    this.init();
    let want = null, fx = false;
    if (!G.started) want = 'title';
    else if (WANTED.stars > 0 && WANTED.mode === 'chase') { want = 'chase'; this.intensity = WANTED.stars; }
    else if (P.vehicle) {
      const st = STATIONS[this.stationOf(P.vehicle)];
      want = st.id === 'off' ? null : st.id; fx = true;
      if (P.vehicle !== this.lastVeh) { this.lastVeh = P.vehicle; this.announce(P.vehicle.station); }
      if (want) {
        this.djT -= dt;
        if (this.djT <= 0) {
          this.djT = U.rand(35, 60);
          let lines = st.lines.slice();
          const news = NEWS.lines(); if (news.length && Math.random() < 0.55) lines = news;
          UI.radio(`📻 ${st.name}: "${U.choice(lines)}"`, 6);
        }
      }
    } else { this.lastVeh = null; want = SETTINGS.walkMusic ? 'lakad' : null; }
    const duck = G.paused ? 0.35 : UI.talking ? 0.45 : G.cutscene ? 0.5 : 1;
    if (duck !== this.duck || fx !== this.radioFx) { this.duck = duck; this.radioFx = fx; this.applyGain(); }
    this.play(want);
  },
};

// ===== Radio news that follows what the player has done =====
const NEWS = {
  lines() {
    const f = G.flags || {}, st = G.stats || {}, out = [];
    if (MS.idx >= 8) out.push('BALITA: Mayor Kurakot, nananatiling nakakulong. Ang ayuda, naibigay na sa mga tao!');
    if (f.ending2 === 'A') out.push('BALITA: Nabawi ng mga magsasaka ng San Isidro ang kanilang lupa! Si Don Severo, nasa kulungan.');
    if (f.ending2 === 'B') out.push('BALITA: Mga magsasaka ng San Isidro, nagpoprotesta — nabakuran ang kanilang mga bukid.');
    if (f.ch3 === 'ilantad') out.push('BALITA: Ledger ni Kapitan Tiburon, inilabas! Mga pulitiko at hepe, iniimbestigahan.');
    if (f.ch3 === 'itago') out.push('BALITA: Kapitan Tiburon, nakalaya dahil "kulang sa ebidensya". Saan napunta ang ledger?');
    if (f.ch4) out.push('BALITA: Ninong, arestado sa Dabaw! Ilegal na pagtotroso sa Bundok Apo, itinigil na.');
    if (f.kuta && Object.keys(f.kuta).length) out.push(`BALITA: ${Object.keys(f.kuta).length} kuta ng sindikato, nilinis ng isang misteryosong bayani!`);
    if ((st.rescued || 0) >= 5) out.push(`BALITA: ${st.rescued} katao, nailigtas ng isang driver habang may bagyo. Saludo kami sa iyo!`);
    if ((st.escapes || 0) >= 5) out.push(`BALITA: Isang driver, ${st.escapes} beses nang nakatakas sa pulis. "Hari ng Kalsada" daw ang tawag sa kanya.`);
    if (WANTED.stars >= 3) out.push(`BALITA: Habulan ngayon sa kalye! ${WANTED.stars} bituin ang hinahabol ng pulis. Mag-ingat ang mga motorista!`);
    if (TYPHOON.s) out.push(`BALITA: ${TYPHOON.s.name}, Signal No. ${TYPHOON.s.signal}. Manatili sa bahay at lumayo sa baha!`);
    if ((G.player && G.player.level || 1) >= 5) out.push(`BALITA: Si Nonoy, Level ${G.player.level} na raw! Sikat na sikat!`);
    return out;
  },
};
