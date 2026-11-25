'use strict';
// ===== Mini-games: Videoke (rhythm) & 3-Point Shootout =====
// shared runner on the #minigame canvas
const MG = {
  cur: null,
  run(game) {
    this.cur = game; G.paused = true;
    const c = document.getElementById('mg-canvas'); this.c = c; this.g = c.getContext('2d');
    document.getElementById('mg-title').textContent = game.title;
    document.getElementById('mg-help').textContent = INPUT.touch ? game.helpTouch : game.help;
    UI.show('minigame');
    const r = c.getBoundingClientRect(); c.width = r.width * 2; c.height = r.height * 2; this.W = c.width; this.H = c.height;
    c.onpointerdown = (e) => { e.preventDefault(); const rr = c.getBoundingClientRect(); game.tap && game.tap((e.clientX - rr.left) * 2, (e.clientY - rr.top) * 2); };
    this.onKey = (e) => { if (!this.cur || e.repeat) return; if (e.code === 'Escape') { this.end(true); return; } game.key && game.key(e.code); };
    addEventListener('keydown', this.onKey);
    document.getElementById('mg-quit').onclick = () => this.end(true);
    game.init(this.W, this.H);
    this.last = performance.now();
    const loop = (t) => {
      if (this.cur !== game) return;
      const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
      if (game.update(dt, this.g, this.W, this.H)) { this.end(false); return; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  end(quit) {
    const game = this.cur; if (!game) return;
    this.cur = null; removeEventListener('keydown', this.onKey);
    UI.hide('minigame'); G.paused = false;
    if (!quit) game.finish();
  },
  text(g, s, x, y, size, col = '#fff', align = 'center', font = 'Nunito, sans-serif', weight = 900) {
    g.font = `${weight} ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText(I18N.t(s), x + size * 0.06, y + size * 0.08);
    g.fillStyle = col; g.fillText(I18N.t(s), x, y);
  },
};

// ---------- VIDEOKE ----------
const SONGS_VK = [
  { title: 'Ikaw Pa Rin', by: 'Himig Band', bpm: 88, seed: 3, key: 261.6, lyr: ['Sa bawat ulan, sa bawat araw', 'Ikaw pa rin ang hinahanap', 'Kahit ang mundo ay magulo', 'Ikaw pa rin, ikaw pa rin'] },
  { title: 'Sayaw sa Kanto', by: 'DJ Budots', bpm: 112, seed: 11, key: 293.7, lyr: ['Kaliwa, kanan, taas, baba', 'Sayaw tayo sa kanto, pare', 'Walang tulog hanggang umaga', 'Budots, budots, sige pa!'] },
  { title: 'Pauwi sa Probinsya', by: 'Lola Isyang & the Kalabaws', bpm: 100, seed: 7, key: 246.9, lyr: ['Tanaw ko na ang palayan', 'Amoy ng sinaing ni Inay', 'Pauwi na, pauwi na', 'Sa piling mo, ako\'y buhay'] },
];
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
const VIDEOKE = {
  title: '🎤 VIDEOKE', help: 'Pindutin ang D F J K (o ← ↓ ↑ →) pagdating ng nota sa linya!', helpTouch: 'I-tap ang kolum pagdating ng nota sa linya!',
  pick() {
    G.paused = true;
    const el = document.getElementById('shop-list');
    document.getElementById('shop-title').textContent = 'VIDEOKE NI ALING PURING';
    el.innerHTML = SONGS_VK.map((s, i) => `<div class="shoprow"><span class="ic">🎵</span><div><b>${s.title}</b><small>${s.by} · ${s.bpm} BPM · Pinakamataas: ${(G.stats.vkBest || {})[i] || 0}</small></div><button data-song="${i}">KANTA · ${U.money(20)}</button></div>`).join('')
      + `<div class="shoprow"><span class="ic">🏆</span><div><b>Premyo</b><small>90+ = ₱500 · 100 = ₱1,500 · 70+ = ₱100</small></div></div>`;
    el.querySelectorAll('button[data-song]').forEach(b => b.onclick = () => {
      if (G.player.money < 20) { UI.toast('Kulang ang pera mo!'); AUD.fail(); return; }
      G.addMoney(-20); AUD.coin(); UI.hide('shop'); this.song = +b.dataset.song; MG.run(this);
    });
    UI.show('shop');
  },
  init(W, H) {
    const s = SONGS_VK[this.song], R = U.rng(s.seed * 977);
    this.s = s; this.spb = 60 / s.bpm; this.t = -2.2; this.notes = []; this.fx = []; this.combo = 0; this.best = 0; this.pts = 0; this.max = 0; this.lastBeat = -1;
    // melody: 4 phrases of 8 beats, notes on beats and some off-beats
    let deg = 2;
    for (let ph = 0; ph < 4; ph++) for (let b = 0; b < 8; b++) {
      const beat = ph * 8 + b;
      if (b === 7 && ph % 2 === 1) continue; // breath
      deg = U.clamp(deg + Math.round((R() - 0.5) * 4), 0, PENTA.length - 1);
      this.notes.push({ time: beat * this.spb, deg, lane: deg % 4 });
      if (R() < (s.bpm > 105 ? 0.45 : 0.25) && b < 7) { const d2 = U.clamp(deg + (R() < 0.5 ? 1 : -1), 0, PENTA.length - 1); this.notes.push({ time: (beat + 0.5) * this.spb, deg: d2, lane: d2 % 4 }); }
    }
    this.end = 32 * this.spb + 1.5;
    this.max = this.notes.length * 100;
    AUD.click();
  },
  freq(deg) { return this.s.key * Math.pow(2, PENTA[deg] / 12); },
  key(code) {
    const map = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
    if (map[code] !== undefined) this.hit(map[code]);
  },
  tap(x, y) { const W = MG.W, lw = W * 0.12, x0 = W / 2 - lw * 2; const lane = Math.floor((x - x0) / lw); if (lane >= 0 && lane < 4) this.hit(lane); },
  hit(lane) {
    this.press = this.press || [0, 0, 0, 0]; this.press[lane] = 0.12;
    let best = null, bd = 0.2;
    for (const n of this.notes) { if (n.done || n.lane !== lane) continue; const d = Math.abs(n.time - this.t); if (d < bd) { bd = d; best = n; } }
    if (!best) { this.combo = 0; AUD.tone(110, 0.08, 'sawtooth', 0.04); return; }
    best.done = true;
    const q = bd < 0.07 ? 100 : bd < 0.13 ? 70 : 40;
    this.pts += q; this.combo++; this.best = Math.max(this.best, this.combo);
    this.fx.push({ lane, t: 0.4, txt: q === 100 ? 'PERFECT!' : q === 70 ? 'GOOD' : 'OK' });
    const f = this.freq(best.deg);
    AUD.tone(f, this.spb * 0.9, 'triangle', 0.11); AUD.tone(f * 2, this.spb * 0.5, 'sine', 0.03);
  },
  update(dt, g, W, H) {
    this.t += dt;
    // backing track: bass + chord on each beat
    const beat = Math.floor(this.t / this.spb);
    if (beat !== this.lastBeat && this.t >= 0 && this.t < this.end - 1.2) {
      this.lastBeat = beat;
      const root = this.s.key / 2 * Math.pow(2, [0, 9, 5, 7][Math.floor(beat / 2) % 4] / 12);
      AUD.tone(root, this.spb * 0.8, 'sine', 0.12);
      if (beat % 2 === 1) { AUD.tone(root * 2, this.spb * 0.4, 'square', 0.025); AUD.tone(root * 2.52, this.spb * 0.4, 'square', 0.02); }
      AUD.noise(0.04, 0.05, 5000, 0, 'highpass');
    }
    for (const n of this.notes) if (!n.done && this.t - n.time > 0.2) { n.done = true; n.miss = true; this.combo = 0; }
    // --- draw ---
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#1d2b64'); grd.addColorStop(1, '#0b0f24'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // stage lights
    for (let k = 0; k < 5; k++) { g.fillStyle = `hsla(${(k * 70 + this.t * 40) % 360},90%,60%,0.08)`; g.beginPath(); g.moveTo(W * (0.1 + k * 0.2), 0); g.lineTo(W * (0.02 + k * 0.2), H); g.lineTo(W * (0.22 + k * 0.2), H); g.fill(); }
    const lw = W * 0.12, x0 = W / 2 - lw * 2, hitY = H * 0.74, speed = H * 0.42; // px per sec
    const cols = ['#ff5c7a', '#ffd23f', '#3ddc97', '#4aa8ff'];
    for (let l = 0; l < 4; l++) {
      g.fillStyle = l % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'; g.fillRect(x0 + l * lw, 0, lw, H);
      const pr = this.press && this.press[l] > 0; if (pr) this.press[l] -= dt;
      g.fillStyle = pr ? cols[l] : 'rgba(255,255,255,0.18)'; U.rr(g, x0 + l * lw + 8, hitY - 14, lw - 16, 28, 14); g.fill();
      MG.text(g, ['D', 'F', 'J', 'K'][l], x0 + l * lw + lw / 2, hitY + 44, W * 0.022, 'rgba(255,255,255,0.5)');
    }
    for (const n of this.notes) {
      if (n.done && !n.miss) continue;
      const y = hitY - (n.time - this.t) * speed; if (y < -40 || y > H + 40) continue;
      g.fillStyle = n.miss ? 'rgba(120,120,120,0.5)' : cols[n.lane];
      U.rr(g, x0 + n.lane * lw + 12, y - 12, lw - 24, 24, 12); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; U.rr(g, x0 + n.lane * lw + 20, y - 8, lw - 40, 6, 3); g.fill();
    }
    for (const f of this.fx) { f.t -= dt; MG.text(g, f.txt, x0 + f.lane * lw + lw / 2, hitY - 60 - (0.4 - f.t) * 80, W * 0.024, f.txt === 'PERFECT!' ? '#ffd23f' : '#fff'); }
    this.fx = this.fx.filter(f => f.t > 0);
    // lyrics bar like a real videoke screen
    const li = U.clamp(Math.floor(this.t / (8 * this.spb)), 0, 3), line = this.s.lyr[li], prog = U.clamp((this.t - li * 8 * this.spb) / (8 * this.spb), 0, 1);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, H * 0.86, W, H * 0.14);
    g.font = `900 ${W * 0.03}px Nunito, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const tw = g.measureText(line).width, lx = W / 2 - tw / 2;
    g.fillStyle = '#fff'; g.fillText(line, W / 2, H * 0.93);
    g.save(); g.beginPath(); g.rect(lx, H * 0.86, tw * prog, H * 0.14); g.clip(); g.fillStyle = '#3ddc97'; g.fillText(line, W / 2, H * 0.93); g.restore();
    MG.text(g, `🎵 ${this.s.title}`, W * 0.03, H * 0.06, W * 0.028, '#fff', 'left');
    MG.text(g, `Combo ×${this.combo}`, W * 0.97, H * 0.06, W * 0.026, '#ffd23f', 'right');
    if (this.t < 0) MG.text(g, String(Math.ceil(-this.t)), W / 2, H * 0.4, W * 0.1, '#fff');
    return this.t > this.end;
  },
  finish() {
    const score = Math.round(this.pts / this.max * 100);
    const best = G.stats.vkBest = G.stats.vkBest || {};
    best[this.song] = Math.max(best[this.song] || 0, score);
    G.stats.vkTop = Math.max(G.stats.vkTop || 0, score);
    const prize = score >= 100 ? 1500 : score >= 90 ? 500 : score >= 70 ? 100 : 0;
    const msg = score >= 100 ? 'PERPEKTO! Ikaw na ang bagong idol!' : score >= 90 ? 'Ang galing! Pang-Tawag ng Tanghalan!' : score >= 70 ? 'Pwede na! Palakpakan!' : score >= 40 ? 'Ensayo pa, pre!' : 'Huwag na po kumanta... 😅';
    if (prize) { G.addMoney(prize, true); }
    UI.big(`🎤 ${score}`, `${msg}${prize ? ' · +' + U.money(prize) : ''}`, 3, score >= 70 ? 'good' : '');
    [523, 659, 784].forEach((f, i) => AUD.tone(f, 0.25, 'square', score >= 70 ? 0.07 : 0.02, 0, i * 0.12));
    ACH.check(); SAVE.auto();
  },
};

// ---------- 3-POINT SHOOTOUT ----------
const SHOOTOUT = {
  title: '🏀 3-POINT SHOOTOUT', help: 'Space / click kapag nasa berde ang palaso. 15 tira — ang huli sa bawat rack ay 2 puntos!', helpTouch: 'I-tap kapag nasa berde ang palaso. Ang huli sa bawat rack ay 2 puntos!',
  init(W, H) { this.shot = 0; this.score = 0; this.m = 0; this.dir = 1; this.ball = null; this.msg = null; this.wait = 0.8; this.racks = [[], [], []]; this.speed = 1.1; },
  key(code) { if (code === 'Space' || code === 'Enter' || code === 'KeyE') this.shoot(); },
  tap() { this.shoot(); },
  sweet() { return { c: 0.5 + Math.sin(this.shot * 1.7) * 0.18, w: 0.12 - Math.floor(this.shot / 5) * 0.02 }; },
  shoot() {
    if (this.ball || this.wait > 0 || this.shot >= 15) return;
    const sw = this.sweet(), off = Math.abs(this.m - sw.c);
    const made = off < sw.w / 2 ? true : off < sw.w ? Math.random() < 0.45 : false;
    this.ball = { t: 0, made, off: (this.m - sw.c), money: this.shot % 5 === 4 };
    AUD.whoosh();
  },
  update(dt, g, W, H) {
    if (this.wait > 0) this.wait -= dt;
    if (!this.ball && this.shot < 15) { this.m += this.dir * dt * this.speed * (1 + Math.floor(this.shot / 5) * 0.3); if (this.m > 1) { this.m = 1; this.dir = -1; } if (this.m < 0) { this.m = 0; this.dir = 1; } }
    // court
    g.fillStyle = '#c98b4f'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 5;
    g.beginPath(); g.ellipse(W / 2, H * 0.18, W * 0.42, H * 0.62, 0, 0, Math.PI); g.stroke();
    g.strokeRect(W * 0.36, H * 0.0, W * 0.28, H * 0.42);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 0; x < W; x += W / 14) g.fillRect(x, 0, 2, H);
    // backboard + hoop
    g.fillStyle = '#f5f5f5'; g.fillRect(W * 0.42, H * 0.05, W * 0.16, H * 0.1); g.strokeStyle = '#c0392b'; g.lineWidth = 4; g.strokeRect(W * 0.47, H * 0.08, W * 0.06, H * 0.05);
    g.strokeStyle = '#ff6b1a'; g.lineWidth = 6; g.beginPath(); g.ellipse(W / 2, H * 0.19, W * 0.035, H * 0.018, 0, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(W / 2 + k * W * 0.01, H * 0.19); g.lineTo(W / 2 + k * W * 0.006, H * 0.26); g.stroke(); }
    // ball flight
    const bx0 = W / 2, by0 = H * 0.82;
    if (this.ball) {
      const b = this.ball; b.t += dt;
      const k = Math.min(1, b.t / 0.9), tx = W / 2 + (b.made ? 0 : b.off * W * 0.35 + (b.off > 0 ? 30 : -30)), ty = H * 0.19;
      let x = U.lerp(bx0, tx, k), y = U.lerp(by0, ty, k) - Math.sin(k * Math.PI) * H * 0.35, r = W * 0.03 * (1 - k * 0.45);
      if (k >= 1) { y += (b.t - 0.9) * H * (b.made ? 0.5 : 0.3); x += b.made ? 0 : (b.t - 0.9) * W * 0.3 * Math.sign(b.off || 1); }
      g.fillStyle = '#e8641e'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#3a1a05'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
      if (b.t > 0.9 && !b.scored) {
        b.scored = true; const pts = b.made ? (b.money ? 2 : 1) : 0; this.score += pts;
        this.racks[Math.floor(this.shot / 5)].push(b.made ? (b.money ? 2 : 1) : 0);
        this.msg = { t: 0.9, txt: b.made ? (b.money ? 'MONEY BALL! +2' : 'SWISH!') : U.choice(['SABLAY!', 'BRICK!', 'AIRBALL!']), good: b.made };
        if (b.made) { AUD.tone(1046, 0.1, 'square', 0.06); AUD.noise(0.25, 0.1, 3000, 0, 'highpass'); } else AUD.tone(180, 0.2, 'sawtooth', 0.05);
      }
      if (b.t > 1.4) { this.ball = null; this.shot++; this.wait = 0.25; }
    } else if (this.shot < 15) {
      const money = this.shot % 5 === 4;
      g.fillStyle = money ? '#f1c40f' : '#e8641e'; g.beginPath(); g.arc(bx0, by0, W * 0.03, 0, TAU); g.fill();
      g.strokeStyle = '#3a1a05'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx0 - W * 0.03, by0); g.lineTo(bx0 + W * 0.03, by0); g.stroke();
    }
    if (this.msg) { this.msg.t -= dt; MG.text(g, this.msg.txt, W / 2, H * 0.45, W * 0.05, this.msg.good ? '#ffd23f' : '#ff6b5a'); if (this.msg.t <= 0) this.msg = null; }
    // meter
    const mx = W * 0.08, my = H * 0.25, mh = H * 0.55, mw = W * 0.04, sw = this.sweet();
    g.fillStyle = 'rgba(0,0,0,0.5)'; U.rr(g, mx, my, mw, mh, 10); g.fill();
    g.fillStyle = 'rgba(61,220,151,0.85)'; g.fillRect(mx + 4, my + mh * (1 - sw.c - sw.w / 2), mw - 8, mh * sw.w);
    g.fillStyle = 'rgba(255,210,63,0.5)'; g.fillRect(mx + 4, my + mh * (1 - sw.c - sw.w), mw - 8, mh * sw.w / 2); g.fillRect(mx + 4, my + mh * (1 - sw.c + sw.w / 2), mw - 8, mh * sw.w / 2);
    const ny = my + mh * (1 - this.m);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(mx + mw + 4, ny); g.lineTo(mx + mw + 22, ny - 10); g.lineTo(mx + mw + 22, ny + 10); g.fill();
    // racks
    for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) {
      const v = this.racks[r][k], x = W * 0.72 + k * W * 0.045, y = H * 0.62 + r * H * 0.08;
      g.fillStyle = v === undefined ? 'rgba(0,0,0,0.25)' : v ? (k === 4 ? '#f1c40f' : '#3ddc97') : '#7f3a3a'; g.beginPath(); g.arc(x, y, W * 0.015, 0, TAU); g.fill();
    }
    MG.text(g, `Puntos: ${this.score}`, W * 0.97, H * 0.06, W * 0.03, '#fff', 'right');
    MG.text(g, `Tira ${Math.min(15, this.shot + 1)}/15`, W * 0.03, H * 0.06, W * 0.026, '#fff', 'left');
    return this.shot >= 15 && !this.ball && !this.msg;
  },
  finish() {
    G.stats.shootBest = Math.max(G.stats.shootBest || 0, this.score);
    const prize = this.score >= 15 ? 1000 : this.score >= 10 ? 300 : 0;
    if (prize) G.addMoney(prize, true);
    UI.big(`🏀 ${this.score} PUNTOS`, prize ? `Ang lupit! +${U.money(prize)}` : '10+ puntos para sa premyo', 3, prize ? 'good' : '');
    ACH.check(); SAVE.auto();
  },
};

// ---------- TUMBANG PRESO: knock the can over with your tsinelas ----------
const TUMBANG = {
  title: '🥫 TUMBANG PRESO', help: 'Space / click para itigil ang palaso, tapos ulit para sa lakas. 6 na tira!', helpTouch: 'I-tap para itigil ang palaso, tapos ulit para sa lakas. 6 na tira!',
  init() { this.n = 0; this.hits = 0; this.phase = 'aim'; this.ang = 0; this.dir = 1; this.pow = 0; this.anim = null; this.msg = null; this.canX = 0.5 + U.rand(-0.15, 0.15); },
  key(c) { if (c === 'Space' || c === 'Enter') this.tap(); },
  tap() {
    if (this.anim || this.n >= 6) return;
    if (this.phase === 'aim') { this.phase = 'power'; this.pow = 0; this.pdir = 1; }
    else if (this.phase === 'power') {
      const tx = 0.5 + Math.sin(this.ang) * 0.42, need = 0.62 + this.n * 0.03;
      const hit = Math.abs(tx - this.canX) < 0.05 && Math.abs(this.pow - need) < 0.16;
      this.anim = { t: 0, tx, ty: 0.18 + (1 - this.pow) * 0.25, hit }; AUD.whoosh();
    }
  },
  update(dt, g, W, H) {
    if (this.phase === 'aim' && !this.anim) { this.ang += this.dir * dt * (1.3 + this.n * 0.15); if (Math.abs(this.ang) > 0.9) this.dir *= -1; }
    if (this.phase === 'power' && !this.anim) { this.pow += this.pdir * dt * 1.4; if (this.pow > 1 || this.pow < 0) this.pdir *= -1; }
    g.fillStyle = '#7a6040'; g.fillRect(0, 0, W, H); g.fillStyle = '#8a7050'; for (let k = 0; k < 40; k++) g.fillRect((k * 97) % W, (k * 53) % H, 6, 4);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, H * 0.78); g.lineTo(W, H * 0.78); g.stroke();
    // the can + its guard (taya)
    const cx = this.canX * W, cy = H * 0.22;
    if (!(this.anim && this.anim.hit && this.anim.t > 0.6)) { g.fillStyle = '#c0392b'; g.fillRect(cx - 14, cy - 22, 28, 44); g.fillStyle = '#ddd'; g.fillRect(cx - 14, cy - 22, 28, 6); }
    else { g.save(); g.translate(cx + 40, cy + 10); g.rotate(1.4); g.fillStyle = '#c0392b'; g.fillRect(-14, -22, 28, 44); g.restore(); }
    g.font = `${W * 0.06}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(this.anim && this.anim.hit && this.anim.t > 0.6 ? '😱' : '🧍', cx + W * 0.1, cy);
    // aim line from the player
    const px = W / 2, py = H * 0.88;
    if (!this.anim && this.n < 6) {
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.setLineDash([10, 10]); g.lineWidth = 3; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.sin(this.ang) * W * 0.42, H * 0.2); g.stroke(); g.setLineDash([]);
      if (this.phase === 'power') { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(W * 0.9, H * 0.3, W * 0.03, H * 0.45); const need = 0.62 + this.n * 0.03; g.fillStyle = 'rgba(61,220,151,0.8)'; g.fillRect(W * 0.9, H * 0.75 - H * 0.45 * (need + 0.16), W * 0.03, H * 0.45 * 0.32); g.fillStyle = '#fff'; g.fillRect(W * 0.885, H * 0.75 - H * 0.45 * this.pow - 3, W * 0.06, 6); }
    }
    g.font = `${W * 0.05}px sans-serif`; g.fillText('🩴', px, py);
    if (this.anim) {
      const a = this.anim; a.t += dt; const k = Math.min(1, a.t / 0.6);
      g.save(); g.translate(U.lerp(px, a.tx * W, k), U.lerp(py, a.ty * H, k) - Math.sin(k * Math.PI) * H * 0.1); g.rotate(a.t * 14); g.fillText('🩴', 0, 0); g.restore();
      if (a.t > 0.6 && !a.done) { a.done = true; this.n++; if (a.hit) { this.hits++; this.msg = { t: 1, txt: 'TUMBA! 🥫' }; AUD.tone(1046, 0.1, 'square', 0.06); } else { this.msg = { t: 1, txt: U.choice(['Sablay!', 'Muntik na!', 'Taya ka!']) }; AUD.tone(180, 0.2, 'sawtooth', 0.04); } }
      if (a.t > 1.3) { this.anim = null; this.phase = 'aim'; this.canX = 0.5 + U.rand(-0.2, 0.2); }
    }
    if (this.msg) { this.msg.t -= dt; MG.text(g, this.msg.txt, W / 2, H * 0.5, W * 0.05, '#ffd23f'); if (this.msg.t <= 0) this.msg = null; }
    MG.text(g, `Tumba: ${this.hits}`, W * 0.97, H * 0.06, W * 0.03, '#fff', 'right');
    MG.text(g, `Tira ${Math.min(6, this.n + 1)}/6`, W * 0.03, H * 0.06, W * 0.026, '#fff', 'left');
    return this.n >= 6 && !this.anim && !this.msg;
  },
  finish() {
    G.stats.tumbang = Math.max(G.stats.tumbang || 0, this.hits);
    const prize = this.hits >= 5 ? 800 : this.hits >= 3 ? 250 : 0; if (prize) G.addMoney(prize, true);
    UI.big(`🥫 ${this.hits} TUMBA`, prize ? `Panalo! +${U.money(prize)}` : '3+ para sa premyo', 2.6, prize ? 'good' : ''); PROG.xp(this.hits * 8, 'Laro'); ACH.check();
  },
};

// ---------- SIPA: keep the sipa in the air ----------
const SIPA = {
  title: '🪶 SIPA', help: 'Space / click kapag nasa bilog ang sipa — huwag ilaglag!', helpTouch: 'I-tap kapag nasa bilog ang sipa — huwag ilaglag!',
  init(W, H) { this.y = 0.2; this.vy = 0; this.kicks = 0; this.over = false; this.x = 0.5; this.vx = 0; this.t = 0; this.flash = 0; },
  key(c) { if (c === 'Space' || c === 'Enter') this.tap(); },
  tap() {
    if (this.over) return;
    if (this.y > 0.62 && this.y < 0.86) { this.vy = -1.38 - Math.min(0.5, this.kicks * 0.02); this.vx = U.rand(-0.25, 0.25); this.kicks++; this.flash = 0.15; AUD.tone(700 + this.kicks * 10, 0.05, 'square', 0.05); }
    else { this.vy += 0.2; AUD.tone(150, 0.08, 'sawtooth', 0.03); }
  },
  update(dt, g, W, H) {
    this.t += dt;
    if (!this.over) { this.vy += dt * (1.6 + this.kicks * 0.04); this.y += this.vy * dt; this.x = U.clamp(this.x + this.vx * dt, 0.2, 0.8); if (this.y > 0.95) { this.over = true; this.endT = 1.2; AUD.fail(); } }
    else this.endT -= dt;
    g.fillStyle = '#2a4231'; g.fillRect(0, 0, W, H);
    g.fillStyle = this.flash > 0 ? 'rgba(61,220,151,0.35)' : 'rgba(255,255,255,0.12)'; this.flash -= dt;
    g.beginPath(); g.ellipse(this.x * W, H * 0.74, W * 0.09, H * 0.1, 0, 0, TAU); g.fill();
    g.font = `${W * 0.08}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🦶', this.x * W, H * 0.88);
    g.save(); g.translate(this.x * W, this.y * H); g.rotate(Math.sin(this.t * 6) * 0.4);
    g.fillStyle = '#d4af37'; g.beginPath(); g.arc(0, 8, 9, 0, TAU); g.fill();
    for (let k = -2; k <= 2; k++) { g.fillStyle = ['#e74c3c', '#f1c40f', '#27ae60', '#2e86c1', '#e84393'][k + 2]; g.beginPath(); g.ellipse(k * 5, -10, 3, 13, k * 0.2, 0, TAU); g.fill(); }
    g.restore();
    MG.text(g, `Sipa: ${this.kicks}`, W / 2, H * 0.08, W * 0.045, '#fff');
    if (this.over) MG.text(g, 'NAHULOG!', W / 2, H * 0.45, W * 0.06, '#ff6b5a');
    return this.over && this.endT <= 0;
  },
  finish() {
    G.stats.sipa = Math.max(G.stats.sipa || 0, this.kicks);
    const prize = this.kicks >= 30 ? 1000 : this.kicks >= 15 ? 300 : 0; if (prize) G.addMoney(prize, true);
    UI.big(`🪶 ${this.kicks} SIPA`, prize ? `Galing! +${U.money(prize)}` : '15+ para sa premyo', 2.6, prize ? 'good' : ''); PROG.xp(Math.min(80, this.kicks * 2), 'Laro'); ACH.check();
  },
};
// courts: pick a game
const COURTGAMES = {
  open() {
    G.paused = true;
    document.getElementById('shop-title').textContent = '🏀 LARO SA KORTE';
    const el = document.getElementById('shop-list'), st = G.stats;
    el.innerHTML = [['shoot', '🏀', '3-Point Shootout', `Pinakamataas: ${st.shootBest || 0}`], ['tumbang', '🥫', 'Tumbang Preso', `Pinakamataas: ${st.tumbang || 0}`], ['sipa', '🪶', 'Sipa', `Pinakamataas: ${st.sipa || 0}`]]
      .map(([k, ic, n, d]) => `<div class="shoprow"><span class="ic">${ic}</span><div><b>${n}</b><small>${d}</small></div><button data-g="${k}">LARO</button></div>`).join('');
    el.querySelectorAll('button[data-g]').forEach(b => b.onclick = () => { UI.hide('shop'); MG.run({ shoot: SHOOTOUT, tumbang: TUMBANG, sipa: SIPA }[b.dataset.g]); });
    UI.show('shop');
  },
};
