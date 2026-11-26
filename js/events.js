'use strict';
// ===== City events: typhoon (bagyo) =====
const TY_NAMES = ['Kulog', 'Lintik', 'Ugong', 'Dagundong', 'Daluyong'];
const TYPHOON = {
  s: null, debris: [], lastDay: -9,
  // phases: warn → storm → after
  start(force) {
    if (this.s) return;
    const sig = force ? 4 : U.randi(2, 4);
    this.s = { phase: 'warn', t: force ? 6 : 40, signal: sig, wa: U.rand(0, TAU), name: 'Bagyong ' + U.choice(TY_NAMES), gust: 0, total: 0 };
    this.lastDay = WORLD.day;
    UI.big('🌀 BABALA NG BAGYO', `${this.s.name} · Signal No. ${sig} — maghanda!`, 3, 'bad');
    AUD.tone(880, 0.3, 'square', 0.08); AUD.tone(660, 0.5, 'square', 0.08, 0, 0.35);
    WORLD.rainTarget = Math.max(WORLD.rainTarget, 0.6); WORLD.weatherT = 999;
  },
  storm() { return !!(this.s && this.s.phase === 'storm'); },
  flooded() { return !!(this.s && (this.s.phase === 'storm' || this.s.phase === 'after')); },
  // wind acceleration vector (px/s²)
  wind() {
    if (!this.s) return [0, 0];
    const s = this.s, k = s.phase === 'storm' ? 1 : s.phase === 'warn' ? 0.25 * (1 - s.t / 40) : Math.max(0, s.t / 30) * 0.3;
    const mag = s.signal * 42 * k * (0.75 + 0.25 * Math.sin(s.total * 0.6) + s.gust);
    return [Math.cos(s.wa) * mag, Math.sin(s.wa) * mag];
  },
  banner() {
    const s = this.s; if (!s) return '';
    if (s.phase === 'warn') return `🌀 ${s.name} · Signal No. ${s.signal} — darating na`;
    if (s.phase === 'storm') return `🌀 ${s.name} · Signal No. ${s.signal} · ${Math.ceil(s.t)}s`;
    return `🌤 Lumipas na ang ${s.name}`;
  },
  update(dt) {
    // random typhoon: rolled once a day after Mission 3
    if (!this.s && WORLD.day !== this.rolledDay && WORLD.hour() >= 9 && WORLD.hour() < 15 && MS.idx >= 3 && !MS.active) {
      this.rolledDay = WORLD.day;
      if (WORLD.day - this.lastDay >= 2 && Math.random() < 0.3) this.start();
    }
    const s = this.s; if (!s) { this.debris.length = 0; return; }
    s.t -= dt; s.total += dt;
    s.gust = Math.max(0, s.gust - dt * 0.8);
    if (s.phase === 'storm' && Math.random() < dt * 0.25) { s.gust = U.rand(0.3, 0.7); }
    s.wa += Math.sin(s.total * 0.05) * dt * 0.05;
    if (s.phase === 'warn') {
      if (s.t <= 0) { s.phase = 'storm'; s.t = 150 + s.signal * 15; UI.big('🌀 ' + s.name.toUpperCase(), `Signal No. ${s.signal} · Malakas na hangin at baha!`, 2.6, 'bad'); TIP.show('typhoon'); }
    } else if (s.phase === 'storm') {
      WORLD.rainTarget = 1; WORLD.rain = Math.max(WORLD.rain, 0.75); WORLD.weatherT = 999;
      WORLD.flood = Math.min(1, WORLD.flood + dt * 0.03);
      if (Math.random() < dt * 0.05) { WORLD.lightning = 1; WORLD.thunderT = U.rand(0.3, 1.5); }
      if (s.t <= 0) { s.phase = 'after'; s.t = 30; WORLD.rainTarget = 0; WORLD.weatherT = 120; UI.big('🌤 TAPOS ANG BAGYO', 'Unti-unting huhupa ang baha.', 2.4, 'good'); if (JOBS.active === 'rescue') JOBS.stop('Tapos ang bagyo — salamat, bayani!'); }
    } else if (s.t <= 0 && WORLD.flood < 0.05) { this.s = null; return; }
    this.push(dt);
    this.updateDebris(dt);
    AUD.windLoop(Math.min(1, Math.hypot(...this.wind()) / 180));
  },
  push(dt) {
    const [wx, wy] = this.wind(); if (!wx && !wy) return;
    const P = G.player, cx = G.cam.x, cy = G.cam.y;
    for (const v of G.vehicles) {
      if (v.parked && !v.driver) continue;
      if (Math.abs(v.x - cx) > 1800 || Math.abs(v.y - cy) > 1800) continue;
      const k = (v.t.boat ? 1.4 : 1) / v.mass;
      v.vx += wx * k * dt; v.vy += wy * k * dt;
      if (!MAP.solidAt(v.x + wx * 0.3 * k * dt * 4, v.y + wy * 0.3 * k * dt * 4)) { v.x += wx * 0.3 * k * dt; v.y += wy * 0.3 * k * dt; }
    }
    if (!P.vehicle && !P.downed) { P.vx += wx * 0.35 * dt * 10; P.vy += wy * 0.35 * dt * 10; P.x += wx * 0.2 * dt; P.y += wy * 0.2 * dt; }
  },
  updateDebris(dt) {
    const [wx, wy] = this.wind(), mag = Math.hypot(wx, wy), P = G.player;
    const max = this.storm() ? (SETTINGS.quality === 'low' ? 10 : 24) : 0;
    if (this.debris.length < max && Math.random() < dt * 6) {
      // spawn upwind just outside the view
      const a = Math.atan2(wy, wx) + Math.PI + U.rand(-0.8, 0.8), r = Math.max(G.cam.vw, G.cam.vh) * 0.6;
      const type = U.choice(['leaf', 'leaf', 'leaf', 'yero', 'bag', 'branch']);
      this.debris.push({ x: G.cam.x + Math.cos(a) * r, y: G.cam.y + Math.sin(a) * r, vx: 0, vy: 0, rot: U.rand(0, TAU), spin: U.rand(-8, 8), type, life: 9, hitCd: 0 });
    }
    const sp = 2.2 + mag / 60;
    for (const d of this.debris) {
      d.life -= dt; d.hitCd -= dt;
      const tx = wx * sp, ty = wy * sp;
      d.vx += (tx - d.vx) * Math.min(1, dt * 2) + U.rand(-60, 60) * dt; d.vy += (ty - d.vy) * Math.min(1, dt * 2) + U.rand(-60, 60) * dt;
      d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.spin * dt;
      if (d.type === 'yero' || d.type === 'branch') {
        const tg = P.vehicle || P, r = P.vehicle ? P.vehicle.W / 2 + 14 : 16;
        if (d.hitCd <= 0 && U.d2(d.x, d.y, tg.x, tg.y) < r * r) {
          d.hitCd = 1.5; d.life = Math.min(d.life, 0.6);
          if (P.vehicle) { P.vehicle.hp -= 6; P.vehicle.lastImpact = 0; AUD.crash(0.3); }
          else { P.hurt(d.type === 'yero' ? 10 : 6); AUD.punch(); P.vx += d.vx * 0.5; P.vy += d.vy * 0.5; }
          G.particle('spark', d.x, d.y);
        }
      }
    }
    this.debris = this.debris.filter(d => d.life > 0);
  },
  draw(g, inV) {
    for (const d of this.debris) {
      if (!inV(d.x, d.y, 30)) continue;
      g.save(); g.translate(d.x, d.y); g.rotate(d.rot);
      if (d.type === 'leaf') { g.fillStyle = '#3f7d3a'; g.beginPath(); g.ellipse(0, 0, 6, 3, 0, 0, TAU); g.fill(); }
      else if (d.type === 'yero') { g.fillStyle = '#9aa4ae'; g.fillRect(-14, -9, 28, 18); g.strokeStyle = '#6f7880'; g.lineWidth = 1; for (let x = -12; x < 14; x += 5) { g.beginPath(); g.moveTo(x, -9); g.lineTo(x, 9); g.stroke(); } }
      else if (d.type === 'bag') { g.fillStyle = 'rgba(240,240,240,0.85)'; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); }
      else { g.strokeStyle = '#6b4a2b'; g.lineWidth = 3; g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.moveTo(2, 0); g.lineTo(9, -7); g.stroke(); g.fillStyle = '#3f7d3a'; g.beginPath(); g.arc(9, -7, 4, 0, TAU); g.fill(); }
      g.restore();
    }
  },
  // stormy overlay (darker, cold)
  drawOverlay(g, x0, y0, w, h) {
    if (!this.s) return;
    const s = this.s, k = s.phase === 'storm' ? 1 : s.phase === 'warn' ? 1 - s.t / 40 : Math.max(0, s.t / 30);
    if (k > 0) { g.fillStyle = `rgba(20,34,40,${0.25 * k})`; g.fillRect(x0, y0, w, h); }
  },
};

// ===== Rescue side job during typhoons =====
const RESCUE_CAP = { multicab: 6, jeepney: 10, bus: 14, van: 6, kuliglig: 6, pickup: 5, garbage: 4, firetruck: 4, ambulance: 4, bangka: 6, army: 12, suv: 4, tow: 2, armored: 4, policeboat: 4 };
Object.assign(JOBS, {
  u_rescue(dt, c) {
    const v = c.v, cap = RESCUE_CAP[v.type] || 3;
    c.load = c.load || 0;
    if (!TYPHOON.storm()) { this.stop('Tapos ang bagyo.'); return; }
    if (!c.stage) {
      const fl = MAP.floods.concat(MAP.tfloods).filter(f => { const d = U.dist(f.x + f.w / 2, f.y + f.h / 2, v.x, v.y); return d > 400 && d < 2000; });
      if (!fl.length) return;
      const f = U.choice(fl), x = f.x + f.w / 2, y = f.y + f.h / 2;
      c.pt = { x, y }; c.stage = 'pick'; c.waiting = [];
      const n = U.randi(2, 4);
      for (let k = 0; k < n; k++) { const p = new Person(x + U.rand(-30, 30), y + U.rand(-20, 20), 'ped'); p.npc = true; p.keep = true; p.state = 'idle'; p.umb = null; G.peds.push(p); c.waiting.push(p); }
    }
    if (c.stage === 'pick') {
      for (const p of c.waiting) p.wave += G.dt * 3;
      c.obj = `Sagipin ang mga nasa baha (sakay: ${c.load}/${cap}) · Nailigtas: ${c.n}`; c.tgt = Object.assign({ stop: true }, c.pt);
      if (this.stopped(c.pt, 130, 1)) {
        const room = cap - c.load, n = Math.min(room, c.waiting.length);
        if (n <= 0) { UI.toast('Puno na! Dalhin muna sa Evacuation Center.'); c.stage = 'drop'; return; }
        removePeds(c.waiting.splice(0, n)); c.load += n; AUD.door();
        UI.toast(`🛟 ${n} ang naisakay! (${c.load}/${cap})`);
        if (c.waiting.length) { c.stage = 'drop'; } else { c.waiting = null; c.stage = c.load >= cap ? 'drop' : null; if (!c.stage && c.load > 0) c.stage = 'choose'; }
      }
    } else if (c.stage === 'choose') {
      // half-full: go save more or drop at the evac center
      c.stage = c.load >= Math.ceil(cap / 2) ? 'drop' : null;
    } else {
      const ev = [MAP.pois.evac, MAP.pois.evac_sg].filter(Boolean).reduce((a, b) => U.d2(a.x, a.y, v.x, v.y) < U.d2(b.x, b.y, v.x, v.y) ? a : b);
      c.obj = `Dalhin sa Evacuation Center ⛺ (sakay: ${c.load}/${cap})`; c.tgt = Object.assign({ stop: true }, ev);
      if (this.stopped(ev, 170, 0.8)) {
        c.n += c.load; G.stats.rescued = (G.stats.rescued || 0) + c.load;
        this.pay(c.load * 120, `⛺ ${c.load} ang ligtas na!`); c.load = 0;
        if (c.waiting && c.waiting.length) c.stage = 'pick'; else { removePeds(c.waiting); c.waiting = null; c.stage = null; }
        ACH.check();
      }
    }
  },
});

// ===== Fiestas & holidays: Tondo parade, Pasko (parol), Undas =====
const FIESTA = {
  force: {}, floats: null, marchers: null, crowd: null, tip: 0, beatT: 0, beat: 0, danceT: 0, earned: 0, greeted: false,
  date() { return this.dt || new Date(); },
  pasko() { if (this.force.pasko !== undefined) return this.force.pasko; const m = this.date().getMonth(); return m >= 8; },            // "ber" months
  undas() { if (this.force.undas !== undefined) return this.force.undas; const d = this.date(), m = d.getMonth(), n = d.getDate(); return (m === 9 && n >= 28) || (m === 10 && n <= 2); },
  paradeTime() { if (this.force.parade !== undefined) return this.force.parade; const h = WORLD.hour(); return WORLD.day % 3 === 0 && h >= 16 && h < 19.5; },
  // each city has its own festival: Tondo fiesta (Manila), Sinulog (Cebu), Kadayawan (Davao), Panagbenga (Baguio)
  FESTS: {
    manila: { name: '🎉 Pista sa Tondo — may parada!', cols: ['#e84393', '#f1c40f', '#16a085'] },
    cebu: { name: '🥁 SINULOG sa Cebu — Pit Señor!', cols: ['#d4161b', '#f1c40f', '#d4161b'] },
    davao: { name: '🍈 KADAYAWAN sa Davao — pista ng ani!', cols: ['#8e44ad', '#f39c12', '#27ae60'] },
    baguio: { name: '🌸 PANAGBENGA sa Baguio — pista ng bulaklak!', cols: ['#ff6fa8', '#ffd1e6', '#e84393'] },
  },
  region() { const x = G.player.x / T; return x >= BX0 ? 'baguio' : x >= DX0 - 12 ? 'davao' : x >= SX0 - 12 ? 'cebu' : x < CITY_W ? 'manila' : null; },
  route() {
    const reg = this.region() || 'manila'; this._routes = this._routes || {};
    if (!this._routes[reg]) {
      const R = { cebu: MAP.sugbo, davao: MAP.dabaw, baguio: MAP.bagiw }[reg];
      this._routes[reg] = R ? [[0, 0], [1, 0], [1, 1], [0, 1]].map(([i, j]) => ({ x: R.cx(i), y: R.cy(j) })) : [[1, 0], [2, 0], [2, 1], [1, 1]].map(([i, j]) => ({ x: MAP.cx(i), y: MAP.cy(j) }));
    }
    return this._routes[reg];
  },
  banner() {
    if (this.floats) return this.custom ? '🎉 Pista Señor sa Cebu!' : (this.FESTS[this.festReg] || this.FESTS.manila).name;
    if (this.undas()) return '🕯 Undas — dalaw sa mga yumao';
    return '';
  },
  update(dt) {
    if (!G.started) return;
    // a marching band plays near the parade
    if (this.floats && this.floats.length) {
      this.bandT = (this.bandT || 0) - dt;
      if (this.bandT <= 0) { this.bandT = 2.1; const P = G.player; let nd = 1e9; for (const f of this.floats) nd = Math.min(nd, U.dist(f.x, f.y, P.x, P.y)); if (nd < 900) AUD.band(1 - nd / 900); }
    }
    if (!this.greeted && G.frame > 300) {
      this.greeted = true;
      if (this.undas()) UI.toast('🕯 Undas na — may mga kandila sa paligid ng simbahan.');
      else if (this.pasko()) UI.toast('🎄 Simoy ng Pasko na! May mga parol sa buong Manila.');
    }
    const r = this.route(), cx = (r[0].x + r[2].x) / 2, cy = (r[0].y + r[2].y) / 2, P = G.player;
    const d = U.dist(P.x, P.y, cx, cy);
    if (this.paradeTime() && !this.floats && d < 2600 && d > 300) this.spawnParade();
    if (this.floats && this.custom && !MS.active) this.endParade();
    if (this.floats && !this.custom && (!this.paradeTime() || d > 3200 || this.festReg !== (this.region() || 'manila'))) this.endParade();
    if (this.floats) this.updateParade(dt);
  },
  spawnParade(route, crowdAt) {
    const r = route || this.route();
    this.custom = !!route; this.festReg = route ? null : (this.region() || 'manila');
    this.floats = []; this.marchers = []; this.crowd = []; this.earned = 0;
    const cols = (this.FESTS[this.festReg] || this.FESTS.manila).cols;
    if (!route) { UI.toast(I18N.t((this.FESTS[this.festReg] || this.FESTS.manila).name)); G.stats.fests = Object.assign(G.stats.fests || {}, { [this.festReg]: 1 }); }
    for (let k = 0; k < 3; k++) {
      // spread floats along the first leg
      const t = k * 0.28, x = U.lerp(r[0].x, r[1].x, t), y = r[0].y;
      const v = new Vehicle('float', x, y, 0, { color: cols[k] }); v.driver = 'ai'; v.mission = true; v.keep = true; v.invuln = true; v.fk = k;
      v.ai = new PathDriver(v, r, { cruise: 55, loop: true, start: 1, solid: true });
      G.vehicles.push(v); this.floats.push(v);
      for (let n = 0; n < 5; n++) {
        const role = k === 0 ? 'band' : 'dancer';
        const p = new Person(x - 70 - (n % 3) * 18, y + ((n % 2) ? 14 : -14), 'ped', { skin: U.choice(SKINS), shirt: role === 'band' ? '#c0392b' : U.choice(['#e84393', '#f1c40f', '#8e44ad', '#16a085', '#e67e22']), pat: role === 'band' ? 'barong' : 'floral', outfit: 'fiesta', hair: role === 'band' ? 'cap_red' : 'long', hairCol: '#111', pants: '#f0f0f0' });
        p.npc = true; p.keep = true; p.umb = null; p.fiesta = role; p.state = 'goto'; p.follow = v; p.slot = n; G.peds.push(p); this.marchers.push(p);
      }
    }
    // spectators on the sidewalks near the fiesta
    const f = crowdAt || MAP.pois.fiesta;
    for (let n = 0; n < 12; n++) {
      const x = f.x + U.rand(-160, 160), y = f.y + U.rand(-260, 260);
      if (MAP.solidAt(x, y) || MAP.tileAt(x, y) === TL.ROAD) continue;
      const p = new Person(x, y, 'ped'); p.npc = true; p.keep = true; p.state = 'idle'; p.umb = null; p.cheer = true; G.peds.push(p); this.crowd.push(p);
    }
    UI.toast(this.custom ? '🎉 Pista Señor sa Cebu! Sayaw, tambol at karosa!' : '🎉 May parada sa Tondo! Sumabay sa paglakad para sa tip.');
  },
  endParade() {
    for (const v of this.floats || []) v.remove = true;
    removePeds(this.marchers); removePeds(this.crowd);
    this.floats = this.marchers = this.crowd = null; this.custom = false;
  },
  updateParade(dt) {
    const P = G.player;
    for (const p of this.marchers) {
      const v = p.follow; if (!v || v.remove) continue;
      const ca = Math.cos(v.a), sa = Math.sin(v.a), back = v.L / 2 + 22 + Math.floor(p.slot / 2) * 20, side = (p.slot % 2 ? 1 : -1) * (p.slot === 4 ? 0 : 14);
      p.tx = v.x - ca * back - sa * side; p.ty = v.y - sa * back + ca * side;
      if (p.state === 'arrived') p.state = 'goto';
      if (p.state === 'goto' && U.d2(p.x, p.y, p.tx, p.ty) > 400 * 400) { p.x = p.tx; p.y = p.ty; }
      p.wave += dt * 4;
    }
    for (const p of this.crowd) p.wave += dt * 3;
    // marching band drums
    const near = Math.min(...this.floats.map(v => U.dist(v.x, v.y, P.x, P.y)));
    this.beatT -= dt;
    if (this.beatT <= 0 && near < 700 && !G.paused) {
      this.beatT = 0.25; this.beat++;
      const vol = (1 - near / 700) * 0.6, b = this.beat % 8;
      if (b === 0 || b === 4 || b === 6) AUD.tone(70, 0.18, 'sine', 0.35 * vol, 45);
      if (b % 2 === 1) AUD.noise(0.05, 0.12 * vol, 3500, 0, 'highpass');
      if (b === 2 || b === 6) AUD.noise(0.1, 0.2 * vol, 1500);
      if (this.beat % 16 === 0) [784, 988, 1175, 988].forEach((f, i) => AUD.tone(f, 0.2, 'triangle', 0.05 * vol, 0, i * 0.25));
    }
    // join the parade on foot: walk along with it for tips
    if (!P.vehicle && near < 110 && P.moveAmt > 0.1) {
      this.danceT += dt;
      if (this.danceT > 4 && this.earned < 300) { this.danceT = 0; this.earned += 30; G.addMoney(30, true); UI.toast('💃 Sumayaw ka sa parada! +₱30'); G.stats.parade = (G.stats.parade || 0) + 1; ACH.check(); }
    }
  },
  // parols on lamp posts (Pasko) and candles near the church (Undas)
  draw(g, inV, now) {
    if (this.pasko()) for (let k = 0; k < MAP.lamps.length; k += 2) {
      const l = MAP.lamps[k]; if (!inV(l.x, l.y, 30)) continue;
      drawParol(g, l.x, l.y - 6, 11, k, now);
    }
    if (this.undas()) for (const c of this.candles()) {
      if (!inV(c.x, c.y, 10)) continue;
      g.fillStyle = '#f5f0e1'; g.fillRect(c.x - 1.5, c.y - 5, 3, 6);
      g.fillStyle = Math.sin(now * 12 + c.x) > 0 ? '#ffd23f' : '#ff9f1a'; g.beginPath(); g.ellipse(c.x, c.y - 7, 1.6, 2.6, 0, 0, TAU); g.fill();
    }
  },
  drawLights(g, inV, S) {
    if (G.lightMul < 0.15) return;
    g.globalAlpha = 0.55 * G.lightMul;
    if (this.pasko()) for (let k = 0; k < MAP.lamps.length; k += 2) { const l = MAP.lamps[k]; if (inV(l.x, l.y, 40)) g.drawImage(k % 4 ? S.red : S.gold, l.x - 26, l.y - 32, 52, 52); }
    if (this.undas()) for (const c of this.candles()) if (inV(c.x, c.y, 20)) g.drawImage(S.gold, c.x - 12, c.y - 18, 24, 24);
    if (this.floats) for (const v of this.floats) if (inV(v.x, v.y, 80)) g.drawImage(S.gold, v.x - 70, v.y - 70, 140, 140);
    g.globalAlpha = 1;
  },
  candles() {
    if (this._candles) return this._candles;
    const out = [], [x0, y0, w, h] = MAP.blockRect(6, 1);
    for (let k = 0; k < w; k += 1) { out.push({ x: (x0 + k + 0.3) * T, y: (y0 + h - 0.25) * T }); out.push({ x: (x0 + k + 0.7) * T, y: (y0 + 0.25) * T }); }
    for (let k = 0; k < h; k += 1) { out.push({ x: (x0 + 0.25) * T, y: (y0 + k + 0.5) * T }); out.push({ x: (x0 + w - 0.25) * T, y: (y0 + k + 0.5) * T }); }
    return (this._candles = out);
  },
};
function drawParol(g, x, y, r, seed, now) {
  const cols = [['#e74c3c', '#f1c40f'], ['#2e86c1', '#ecf0f1'], ['#27ae60', '#f39c12'], ['#8e44ad', '#f1c40f']][seed % 4];
  g.save(); g.translate(x, y); g.rotate(Math.sin(now * 1.5 + seed) * 0.12);
  const star = (rr, c) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? rr * 0.45 : rr; i ? g.lineTo(Math.cos(a) * q, Math.sin(a) * q) : g.moveTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); };
  star(r, cols[0]); star(r * 0.55, cols[1]);
  g.fillStyle = cols[1]; g.beginPath(); g.arc(0, 0, r * 0.18, 0, TAU); g.fill();
  g.strokeStyle = cols[0]; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-r * 0.3, r * 0.5); g.lineTo(-r * 0.4, r * 1.4); g.moveTo(r * 0.3, r * 0.5); g.lineTo(r * 0.4, r * 1.4); g.stroke();
  g.restore();
}
