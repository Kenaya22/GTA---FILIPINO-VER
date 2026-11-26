'use strict';
// ===== Living city: day/night clock, weather & floods, street life =====
const WORLD = {
  clock: 19 * 60, day: 1, rain: 0, rainTarget: 0, weatherT: 150, flood: 0, lightning: 0, thunderT: -1, npcT: 0,
  drops: [], vendors: [], kids: [], devotees: [], enforcers: [], islanders: [],
  reset(clock) {
    this.clock = clock === undefined ? 19 * 60 : clock;
    this.rain = 0; this.rainTarget = 0; this.weatherT = 150; this.flood = 0; this.lightning = 0;
    this.vendors = []; this.kids = []; this.devotees = []; this.enforcers = []; this.islanders = [];
    for (const c of MAP.courts) c.kids = null;
  },
  hour() { return this.clock / 60; },
  daylight() {
    const h = this.hour();
    const ss = (x) => x * x * (3 - 2 * x);
    if (h < 5 || h >= 20) return 0;
    if (h < 7) return ss((h - 5) / 2);
    if (h < 17.5) return 1;
    return ss(1 - (h - 17.5) / 2.5);
  },
  dusk() { const h = this.hour(); return U.clamp(Math.max(1 - Math.abs(h - 18.2) / 1.3, (1 - Math.abs(h - 6) / 1) * 0.7), 0, 1); },
  timeStr() {
    const m = Math.floor(this.clock), h = Math.floor(m / 60) % 24, mm = m % 60;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  },
  icon() { const d = this.daylight(); return this.rain > 0.3 ? '🌧' : d > 0.6 ? '☀️' : d > 0.1 ? '🌅' : '🌙'; },
  rush() { const h = this.hour(); return (h >= 7 && h < 9.5) || (h >= 17 && h < 19.5); },
  copVision() { return 1 - this.rain * 0.3; },
  onIsland(x, y) { return x < (OX - 3) * T; },
  update(dt) {
    const prev = this.clock;
    this.clock = (this.clock + dt * 2) % 1440;           // 1 real second = 2 game minutes (12-min day)
    if (prev < 360 && this.clock >= 360) ECON.payday();
    if (this.clock < prev) this.day++;
    // weather
    this.weatherT -= dt * 2;
    if (this.weatherT <= 0) {
      const h = this.hour(), afternoon = h >= 13 && h < 19;
      this.weatherT = U.rand(70, 200);
      const was = this.rainTarget > 0;
      this.rainTarget = Math.random() < (afternoon ? 0.45 : 0.25) ? U.rand(0.45, 1) : 0;
      if (this.rainTarget > 0 && !was) { UI.toast('🌧 Umuulan na! Madulas ang daan at may baha sa ilang kalye.'); TIP.show('rain'); }
      if (this.rainTarget === 0 && was) UI.toast('🌤 Tumigil na ang ulan.');
    }
    this.rain += U.clamp(this.rainTarget - this.rain, -dt * 0.04, dt * 0.04);
    if (this.rain > 0.4) this.flood = Math.min(1, this.flood + dt * 0.006 * this.rain);
    else this.flood = Math.max(0, this.flood - dt * 0.004);
    if (this.rain > 0.7 && Math.random() < dt * 0.025) { this.lightning = 1; this.thunderT = U.rand(0.4, 2); }
    this.lightning = Math.max(0, this.lightning - dt * 3);
    if (this.thunderT > 0) { this.thunderT -= dt; if (this.thunderT <= 0) AUD.thunder(); }
    AUD.rainLoop(this.rain);
    G.lightMul = 1 - this.daylight() * 0.82;
    const vig = (1 - this.daylight() * 0.7).toFixed(2);
    if (vig !== this.vig) { this.vig = vig; document.getElementById('vignette').style.opacity = vig; }
    // traffic density: rush hour & late night
    const base = SETTINGS.quality === 'low' ? 16 : 26, h = this.hour();
    TRAFFIC.maxCars = Math.round(base * SETTINGS.dens() * (this.rush() ? 1.45 : h >= 0 && h < 5 ? 0.6 : 1));
    TRAFFIC.maxPeds = Math.round((SETTINGS.quality === 'low' ? 20 : 34) * SETTINGS.dens() * (h >= 0 && h < 5 ? 0.5 : 1) * (1 - this.rain * 0.4));
    // rain drops (screen space)
    const want = this.rain > 0.02 ? Math.round(this.rain * (SETTINGS.quality === 'low' ? 70 : 160)) : 0;
    while (this.drops.length < want) this.drops.push({ x: Math.random(), y: Math.random(), s: U.rand(0.8, 1.3) });
    if (this.drops.length > want) this.drops.length = want;
    for (const d of this.drops) { d.y += dt * 1.6 * d.s; d.x -= dt * 0.25 * d.s; if (d.y > 1) { d.y -= 1; d.x = Math.random() * 1.2; } if (d.x < 0) d.x += 1; }
    if (this.rain > 0.2 && Math.random() < this.rain * 0.8) {
      const c = G.cam; G.particle('drip', c.x + U.rand(-c.vw / 2, c.vw / 2), c.y + U.rand(-c.vh / 2, c.vh / 2));
    }
    // vendors' calls & speech bubbles
    for (const p of G.peds) {
      if (p.sayT > 0) p.sayT -= dt;
      if (p.vendor || p.role === 'enforcer') {
        p.callT = (p.callT === undefined ? U.rand(2, 6) : p.callT) - dt;
        if (p.callT <= 0) {
          p.callT = U.rand(6, 11);
          const near = U.dist(p.x, p.y, G.player.x, G.player.y) < 600;
          if (p.vendor === 'taho') { p.say = 'Tahooooo!'; if (near) AUD.call('taho'); }
          else if (p.vendor === 'balut') { p.say = 'Baluuuut! Penoy!'; if (near) AUD.call('balut'); }
          else if (p.vendor === 'sorbetes') { p.say = 'Sorbeteees! Ding-ding!'; if (near) { AUD.tone(1568, 0.15, 'sine', 0.05); AUD.tone(1568, 0.15, 'sine', 0.05, 0, 0.25); } }
          else if (p.vendor === 'puso') { p.say = 'Puso! Puso! Lami ni!'; if (near) AUD.call('taho'); }
          else if (p.vendor === 'durian') { p.say = 'Durian! Presko pa!'; if (near) AUD.call('balut'); }
          else { p.say = 'Priiiit!'; if (near) AUD.call('whistle'); }
          p.sayT = 2.4;
        }
      }
    }
    this.npcT -= dt;
    if (this.npcT <= 0) { this.npcT = 1; this.manageNPCs(); }
    this.updateKids(dt);
  },
  // ---------- ambient NPCs ----------
  far(p, d = 1500) { return U.dist(p.x, p.y, G.cam.x, G.cam.y) > d; },
  drop(list, cond) { return list.filter(p => { if (p.remove) return false; if (cond(p)) { p.remove = true; return false; } return true; }); },
  manageNPCs() {
    const P = G.player, h = this.hour();
    // vendors
    const reg = regionName(P.x);
    const type = reg === 'CEBU' ? (h >= 6 && h < 22 ? 'puso' : null) : reg === 'DAVAO' ? (h >= 6 && h < 21 ? 'durian' : null) : reg === 'SAN ISIDRO' ? null
      : h >= 5 && h < 11 ? 'taho' : h >= 11 && h < 17 ? 'sorbetes' : (h >= 18 || h < 3) ? 'balut' : null;
    this.vendors = this.drop(this.vendors, p => (p.vendor !== type && !TRAFFIC.inView(p.x, p.y, 50)) || this.far(p, 1700));
    if (type && this.vendors.length < 2 && !this.onIsland(P.x, P.y)) {
      let p = null;
      if (reg === 'MANILA') p = this.spawnOnSidewalk(450, 900);
      else for (let k = 0; k < 12 && !p; k++) { const a = Math.random() * TAU, r = U.rand(450, 900), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (MAP.tileAt(x, y) === TL.SIDE && !TRAFFIC.inView(x, y, 30)) { p = new Person(x, y, 'ped'); p.state = 'wander'; p.home = { x, y }; p.wtiles = [TL.SIDE, TL.PLAZA]; G.peds.push(p); } }
      if (p) {
        p.vendor = type; p.speed = 42; p.keep = true; p.amb = true; p.umb = null;
        p.look.shirt = { taho: '#e9e2cc', balut: '#3a4a5c', sorbetes: '#f5f5f5', puso: '#2e86c1', durian: '#7fb800' }[type]; p.look.pat = 'plain'; p.look.hair = type === 'balut' ? 'cap_red' : 'bucket';
        this.vendors.push(p);
      }
    }
    // kids at basketball courts (daytime, no heavy rain)
    const play = h >= 7 && h < 21 && this.rain < 0.4;
    for (const c of MAP.courts) {
      const near = U.dist(c.px, c.py, P.x, P.y) < 1000;
      if (c.kids && (!near || !play)) { if (!near || !c.kids.some(k => TRAFFIC.inView(k.x, k.y, 40))) { for (const k of c.kids) k.remove = true; c.kids = null; } }
      else if (!c.kids && near && play && !TRAFFIC.inView(c.px, c.py, 0)) {
        c.kids = [];
        for (let k = 0; k < 4; k++) {
          const p = new Person(c.px + U.rand(-30, 30), c.py + U.rand(-20, 20), 'ped');
          p.role = 'kid'; p.scale = 0.72; p.state = 'hoop'; p.court = c; p.keep = true; p.amb = true; p.speed = 90;
          p.look.shirt = U.choice(['#c0392b', '#2e6fd1', '#f1c40f', '#27ae60', '#f0f0f0']); p.look.pat = U.choice(['jersey', 'sando', 'plain']);
          c.kids.push(p); G.peds.push(p);
        }
        c.ball = { x: c.px, y: c.py, holder: c.kids[0], t: 0, h: 0, fx: 0, fy: 0, tx: 0, ty: 0 };
      }
    }
    // devotees at Quiapo church
    const [qx0, qy0, qw, qh] = MAP.blockRect(6, 1);
    const qx = (qx0 + qw / 2) * T, qy = (qy0 + qh - 2.5) * T;
    const nearQ = U.dist(qx, qy, P.x, P.y) < 1100;
    const wantD = !nearQ ? 0 : (h >= 5 && h < 21 ? 10 : 4);
    this.devotees = this.drop(this.devotees, p => this.far(p, 1500) || (this.devotees.length > wantD && !TRAFFIC.inView(p.x, p.y, 30)));
    while (nearQ && this.devotees.length < wantD) {
      const x = (qx0 + 2 + Math.random() * (qw - 4)) * T, y = (qy0 + qh - 3.6 + Math.random() * 1.6) * T;
      if (TRAFFIC.inView(x, y, 20) && this.devotees.length > 2) break;
      const p = new Person(x, y, 'ped'); p.state = 'pray'; p.faceA = -Math.PI / 2 + U.rand(-0.2, 0.2); p.a = p.faceA; p.keep = true; p.amb = true;
      if (Math.random() < 0.5) { p.look.hair = 'long'; p.look.shirt = U.choice(['#f0f0f0', '#8e2b3a', '#e8d6a0', '#2b3a55']); }
      this.devotees.push(p); G.peds.push(p);
    }
    // traffic enforcers at busy intersections (daytime)
    const onDuty = h >= 6 && h < 20;
    this.enforcers = this.drop(this.enforcers, p => this.far(p, 1600) || (!onDuty && !TRAFFIC.inView(p.x, p.y, 40)));
    if (onDuty && this.enforcers.length < 3) {
      for (const L of MAP.lights) {
        if (this.enforcers.length >= 3) break;
        if (!(L.i === 4 || L.j === 4)) continue;
        const cx = MAP.cx(L.i), cy = MAP.cy(L.j);
        const d = U.dist(cx, cy, P.x, P.y);
        if (d > 1300 || d < 500 || TRAFFIC.inView(cx, cy, 100)) continue;
        if (this.enforcers.some(e => e.post === L)) continue;
        const sx = U.choice([-1, 1]), sy = U.choice([-1, 1]);
        const p = new Person(cx + sx * 84, cy - sy * 84, 'cop');
        p.role = 'enforcer'; p.post = L; p.state = 'post'; p.keep = true; p.amb = true; p.a = Math.atan2(cy - p.y, cx - p.x);
        p.look.shirt = '#2f6fb5'; p.look.pat = 'vest'; p.look.hair = 'cap_blue';
        this.enforcers.push(p); G.peds.push(p);
      }
    }
    // villagers on Isla Maligaya
    const isl = MAP.island, ix = isl.cx * T, iy = isl.cy * T;
    const nearI = U.dist(ix, iy, P.x, P.y) < 1600;
    this.islanders = this.drop(this.islanders, p => !nearI);
    while (nearI && this.islanders.length < 9) {
      const x = ix + U.rand(-300, 300), y = iy + U.rand(-700, 700);
      const tt = MAP.tileAt(x, y);
      if (tt !== TL.GRASS && tt !== TL.SAND) continue;
      const p = new Person(x, y, 'ped'); p.state = 'wander'; p.home = { x, y }; p.keep = true; p.amb = true; p.speed = 45;
      if (Math.random() < 0.4) { p.look.pat = 'sando'; p.look.hair = U.choice(['bucket', 'buzz', 'short']); }
      this.islanders.push(p); G.peds.push(p);
    }
  },
  spawnOnSidewalk(minD, maxD) {
    const P = G.player;
    for (let k = 0; k < 20; k++) {
      const [bi, bj] = MAP.blockOf(P.x + U.rand(-900, 900), P.y + U.rand(-900, 900));
      if ((bi === 0 && bj >= 2 && bj <= 4) || (bi === 1 && bj === 4)) continue;
      const [x0, y0, w, h] = MAP.blockRect(bi, bj);
      const t = Math.random(), side = U.randi(0, 3);
      const x = side % 2 === 0 ? (x0 + 0.5 + t * (w - 1)) * T : (side === 1 ? x0 + w - 0.5 : x0 + 0.5) * T;
      const y = side % 2 === 1 ? (y0 + 0.5 + t * (h - 1)) * T : (side === 0 ? y0 + 0.5 : y0 + h - 0.5) * T;
      const d = U.dist(x, y, P.x, P.y);
      if (d < minD || d > maxD || TRAFFIC.inView(x, y, 40) || MAP.solidAt(x, y)) continue;
      const p = new Person(x, y, 'ped'); G.peds.push(p); return p;
    }
    return null;
  },
  updateKids(dt) {
    for (const c of MAP.courts) {
      if (!c.kids || !c.ball) continue;
      const b = c.ball;
      const alive = c.kids.filter(k => k.state === 'hoop' && !k.remove);
      if (!alive.length) { b.holder = null; continue; }
      if (b.holder && b.holder.state !== 'hoop') b.holder = alive[0];
      b.t += dt;
      if (b.holder) {
        b.x = b.holder.x + Math.cos(b.holder.a) * 9; b.y = b.holder.y + Math.sin(b.holder.a) * 9;
        b.h = Math.abs(Math.sin(b.t * 9)) * 6;
        if (b.t > U.rand(1.2, 3)) {
          // shoot or pass
          b.fx = b.x; b.fy = b.y; b.t = 0;
          if (Math.random() < 0.5) {
            const e = Math.random() < 0.5 ? 0 : 1;
            b.tx = c.horiz ? (e ? c.x + c.w - 22 : c.x + 22) : c.px; b.ty = c.horiz ? c.py : (e ? c.y + c.h - 22 : c.y + 22);
            b.shot = true;
          } else { const r = U.choice(alive); b.tx = r.x; b.ty = r.y; b.shot = false; b.recv = r; }
          b.holder = null; b.fly = 0.7;
        }
      } else {
        b.fly -= dt;
        const k = 1 - Math.max(0, b.fly) / 0.7;
        b.x = U.lerp(b.fx, b.tx, k); b.y = U.lerp(b.fy, b.ty, k); b.h = Math.sin(k * Math.PI) * (b.shot ? 26 : 12);
        if (b.fly <= 0) { b.holder = b.shot ? U.choice(alive) : (b.recv && alive.includes(b.recv) ? b.recv : alive[0]); b.t = 0; }
      }
    }
  },
  nearVendor() {
    const P = G.player; if (P.vehicle) return null;
    for (const p of this.vendors) if (!p.remove && p.state !== 'down' && U.d2(p.x, p.y, P.x, P.y) < 55 * 55) return p;
    return null;
  },
  buy(v) {
    const P = G.player;
    if (P.hp >= 100) { UI.toast('Busog ka pa!'); return; }
    if (P.money < 20) { UI.toast('Kulang ang pera mo!'); return; }
    const it = { taho: [15, '🥣 Mainit-init na taho! +15 buhay'], balut: [20, '🥚 Balut na may asin at suka! +20 buhay'], sorbetes: [15, '🍦 Sorbetes na ube at keso! +15 buhay'], puso: [25, '🍚 Puso at lechon — lami! +25 buhay'], durian: [30, '🍈 Durian! Amoy-impyerno, lasang-langit! +30 buhay'] }[v.vendor] || [15, ''];
    G.addMoney(-20); P.hp = Math.min(100, P.hp + it[0]); AUD.coin();
    UI.toast(it[1]); G.stats.snacks = (G.stats.snacks || 0) + 1;
    v.say = 'Salamat, suki!'; v.sayT = 2;
  },
  // ---------- drawing ----------
  drawCourts(g, inV, now) {
    for (const c of MAP.courts) {
      if (!c.ball || !inV(c.ball.x, c.ball.y, 20)) continue;
      const b = c.ball;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(b.x + 2, b.y + 3, 4, 0, TAU); g.fill();
      g.fillStyle = '#e8641e'; g.beginPath(); g.arc(b.x, b.y - b.h, 4.5, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(b.x - 4.5, b.y - b.h); g.lineTo(b.x + 4.5, b.y - b.h); g.stroke();
    }
  },
  drawFloods(g, inV, now) {
    if (this.flood < 0.03) return;
    for (const f of TYPHOON.flooded() ? MAP.floods.concat(MAP.tfloods) : MAP.floods) {
      if (!inV(f.x + f.w / 2, f.y + f.h / 2, Math.max(f.w, f.h))) continue;
      g.fillStyle = `rgba(70,105,140,${0.5 * this.flood})`;
      g.fillRect(f.x, f.y, f.w, f.h);
      g.strokeStyle = `rgba(170,200,230,${0.2 * this.flood})`; g.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const x = f.x + ((k * 97 + now * 18) % f.w), y = f.y + ((k * 53) % f.h);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y); g.stroke();
      }
    }
  },
  drawLights(g, inV, glow) {
    const S = G.sprites;
    for (const L of MAP.lights) {
      const cx = MAP.cx(L.i), cy = MAP.cy(L.j);
      if (!inV(cx, cy, 120)) continue;
      const h = MAP.lightState(L, 'h', G.time), v = MAP.lightState(L, 'v', G.time);
      const heads = [[-1, 1, h], [1, -1, h], [-1, -1, v], [1, 1, v]];
      for (const [sx, sy, st] of heads) {
        const x = cx + sx * 74, y = cy + sy * 74;
        const col = st === 'g' ? '#3dff7a' : st === 'y' ? '#ffd23f' : '#ff3b3b';
        if (glow) { g.globalAlpha = 0.5; g.drawImage(st === 'g' ? S.green : st === 'y' ? S.gold : S.red, x - 16, y - 16, 32, 32); g.globalAlpha = 1; }
        else {
          g.fillStyle = '#14171f'; U.rr(g, x - 6, y - 6, 12, 12, 3); g.fill();
          g.fillStyle = col; g.beginPath(); g.arc(x, y, 3.6, 0, TAU); g.fill();
        }
      }
    }
  },
  drawOverlay(g, x0, y0, w, h) {
    const dl = this.daylight();
    if (dl > 0) {
      g.globalCompositeOperation = 'overlay';
      g.fillStyle = `rgba(255,250,238,${0.9 * dl * (1 - this.rain * 0.4)})`;
      g.fillRect(x0, y0, w, h);
      g.globalCompositeOperation = 'source-over';
    }
    const dk = this.dusk();
    if (dk > 0) { g.fillStyle = `rgba(255,115,40,${dk * 0.14})`; g.fillRect(x0, y0, w, h); }
    if (this.rain > 0.01) { g.fillStyle = `rgba(12,20,34,${this.rain * 0.22})`; g.fillRect(x0, y0, w, h); }
    TYPHOON.drawOverlay(g, x0, y0, w, h);
    if (MAP.bagiw && G.cam.x > (BX0 - 10) * T) { const hr = this.hour(), fog = hr < 9 ? 0.32 : hr > 18 ? 0.22 : 0.1; g.fillStyle = `rgba(215,222,232,${fog})`; g.fillRect(x0, y0, w, h); }
  },
  drawRain(g, W, H, dpr) {
    if (this.drops.length) {
      g.strokeStyle = 'rgba(180,200,230,0.35)'; g.lineWidth = 1.2 * dpr; g.beginPath();
      const sl = TYPHOON.wind()[0] * 0.09;
      for (const d of this.drops) { const x = d.x * W, y = d.y * H; g.moveTo(x, y); g.lineTo(x + (sl - 5) * dpr * d.s, y + 22 * dpr * d.s); }
      g.stroke();
    }
    if (this.lightning > 0) { g.fillStyle = `rgba(230,240,255,${this.lightning * 0.45})`; g.fillRect(0, 0, W, H); }
  },
};

// police boats chase you on the water
class BoatCop {
  constructor(v) { this.v = v; this.stuckT = 0; this.revT = 0; }
  update(dt) {
    const v = this.v, P = G.player;
    if (v.dead) { v.throttle = 0; return; }
    if (WANTED.stars === 0) {
      v.siren = false; v.unit = false;
      const a = Math.atan2(v.y - P.y, v.x - P.x);
      v.steer = U.clamp(U.angDiff(v.a, a) * 2, -1, 1); v.throttle = 0.7;
      if (U.dist(v.x, v.y, P.x, P.y) > 1600 && !TRAFFIC.inView(v.x, v.y, 60)) v.remove = true;
      return;
    }
    v.siren = true;
    const tgt = P.vehicle || P;
    const tx = WANTED.mode === 'chase' ? tgt.x : WANTED.lastX, ty = WANTED.mode === 'chase' ? tgt.y : WANTED.lastY;
    const diff = U.angDiff(v.a, Math.atan2(ty - v.y, tx - v.x));
    if (this.revT > 0) { this.revT -= dt; v.throttle = -0.8; v.steer = -Math.sign(diff); return; }
    v.steer = U.clamp(diff * 2.2, -1, 1);
    const d = U.dist(v.x, v.y, tx, ty);
    v.throttle = d < 90 && !P.vehicle ? 0 : 1;
    if (Math.abs(v.fwd()) < 20 && v.throttle > 0) { this.stuckT += dt; if (this.stuckT > 1.2) { this.revT = 1; this.stuckT = 0; } } else this.stuckT = 0;
  }
}

// ===== Province (San Isidro): path drivers, goons, villagers, highway traffic =====
class PathDriver {
  // follows a list of points; loop=false stops at the end (finished=true)
  constructor(v, pts, opt = {}) { this.v = v; this.pts = pts; this.i = opt.start || 0; this.cruise = opt.cruise || 180; this.loop = !!opt.loop; this.finished = false; this.solid = !!opt.solid; this.stuckT = 0; this.revT = 0; }
  update(dt) {
    const v = this.v;
    if (v.dead || this.finished) { v.throttle = v.fwd() > 10 ? -1 : 0; v.steer = 0; return; }
    let p = this.pts[this.i];
    if (U.dist(v.x, v.y, p.x, p.y) < 60) {
      this.i++;
      if (this.i >= this.pts.length) { if (this.loop) this.i = 0; else { this.finished = true; return; } }
      p = this.pts[this.i];
    }
    const diff = U.angDiff(v.a, Math.atan2(p.y - v.y, p.x - v.x)), fs = v.fwd();
    if (this.revT > 0) { this.revT -= dt; v.throttle = -0.8; v.steer = -Math.sign(diff); return; }
    v.steer = U.clamp(diff * 2.4, -1, 1);
    let tgt = Math.abs(diff) > 0.5 ? Math.min(this.cruise, 110) : this.cruise;
    if (!this.solid) { const ob = RoadDriver.prototype.obstacle.call(this); if (ob < 1e9) tgt = Math.min(tgt, Math.max(0, (ob - 14) * 2)); }
    v.throttle = fs < tgt - 10 ? 1 : fs > tgt + 30 ? -0.6 : 0;
    if (tgt > 40 && Math.abs(fs) < 12) { this.stuckT += dt; if (this.stuckT > 2) { this.revT = 0.8; this.stuckT = 0; } } else this.stuckT = 0;
  }
}
// Don Severo's men: ram their target (a convoy vehicle or the player)
class GoonDriver {
  constructor(v, target) { this.v = v; this.target = target; this.stuckT = 0; this.revT = 0; }
  update(dt) {
    const v = this.v;
    if (v.dead) { v.throttle = 0; return; }
    const tg = typeof this.target === 'function' ? this.target() : this.target;
    if (!tg) { v.throttle = 0; v.hand = true; return; }
    const lead = 0.35, tx = tg.x + (tg.vx || 0) * lead, ty = tg.y + (tg.vy || 0) * lead;
    const diff = U.angDiff(v.a, Math.atan2(ty - v.y, tx - v.x)), fs = v.fwd();
    if (this.revT > 0) { this.revT -= dt; v.throttle = -1; v.steer = -Math.sign(diff) || 1; return; }
    v.steer = U.clamp(diff * 2.4, -1, 1);
    v.throttle = Math.abs(diff) > 1.3 && fs > 220 ? -0.6 : 1;
    v.hand = Math.abs(diff) > 1.5 && fs > 240;
    if (Math.abs(fs) < 25) { this.stuckT += dt; if (this.stuckT > 1.1) { this.revT = 0.8; this.stuckT = 0; } } else this.stuckT = Math.max(0, this.stuckT - dt);
  }
}
const PROV = {
  t: 0, folk: [], cars: [],
  near() { return MAP.prov && G.player.x > (CITY_W - 30) * T && G.player.x < (PROV_END + 4) * T; },
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 1;
    const P = G.player, pr = MAP.prov;
    if (!pr) return;
    const near = this.near();
    // villagers around town & farms
    this.folk = this.folk.filter(p => { if (p.remove) return false; if (!near || U.dist(p.x, p.y, P.x, P.y) > 1800) { p.remove = true; return false; } return true; });
    let tries = 0;
    while (near && this.folk.length < 14 && tries++ < 20) {
      const homes = [{ x: (pr.tcx + 0.5) * T, y: (pr.tcy - 2) * T }, ...pr.farms];
      const h = U.choice(homes), x = h.x + U.rand(-260, 260), y = h.y + U.rand(-200, 200);
      const t = MAP.tileAt(x, y);
      if (!(t === TL.GRASS || t === TL.PLAZA || t === TL.SIDE || t === TL.DIRT) || TRAFFIC.inView(x, y, 30)) continue;
      const p = new Person(x, y, 'ped'); p.state = 'wander'; p.home = { x, y }; p.keep = true; p.amb = true; p.speed = 40;
      if (Math.random() < 0.5) { p.look.hair = U.choice(['bucket', 'bucket', 'cap_red', 'buzz']); p.look.pat = U.choice(['sando', 'plain']); }
      this.folk.push(p); G.peds.push(p);
    }
    // highway & farm-road traffic
    this.cars = this.cars.filter(v => { if (v.remove) return false; if (v.ai && v.ai.finished || U.dist(v.x, v.y, P.x, P.y) > 2200) { if (!TRAFFIC.inView(v.x, v.y, 60)) v.remove = true; return !v.remove; } return true; });
    if (near && this.cars.length < 6) {
      const east = Math.random() < 0.5, y = (pr.hy + (east ? 3 : 1)) * T;
      const x0 = (MAP.rs(8) + RW + 2) * T, x1 = (PROV_END - 3) * T;
      const x = U.rand(x0, x1);
      if (!TRAFFIC.inView(x, y, 120) && U.dist(x, y, P.x, P.y) < 1800 && !G.vehicles.some(o => U.d2(o.x, o.y, x, y) < 140 * 140)) {
        const type = U.choice(['jeepney', 'tricycle', 'kuliglig', 'sedan', 'van', 'motor', 'suv', 'pickup', 'pickup']);
        const v = new Vehicle(type, x, y, east ? 0 : Math.PI); v.driver = 'ai';
        v.ai = new PathDriver(v, [{ x: east ? x1 : x0, y }], { cruise: type === 'kuliglig' ? 150 : 230 });
        v.vx = Math.cos(v.a) * 150; v.vy = Math.sin(v.a) * 150;
        this.cars.push(v); G.vehicles.push(v);
      }
    }
  },
  reset() { this.folk = []; this.cars = []; },
};

// ===== Cebu (Chapter 3 city): traffic loops & people =====
function cityLife(region, x0, x1, carTypes) { return {
  t: 0, folk: [], cars: [],
  in(x) { return x > x0() * T && x < x1() * T; },
  near() { return region() && this.in(G.player.x); },
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 1;
    const P = G.player, sg = region(); if (!sg) return;
    const near = this.near();
    this.folk = this.folk.filter(p => { if (p.remove) return false; if (!near || U.dist(p.x, p.y, P.x, P.y) > 1700) { p.remove = true; return false; } return true; });
    let tries = 0;
    const want = Math.round((SETTINGS.quality === 'low' ? 12 : 22) * SETTINGS.dens());
    let added = 0;
    while (near && this.folk.length < want && tries++ < 25 && added < 4) {
      const a = Math.random() * TAU, r = U.rand(500, 1100), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
      const t = MAP.tileAt(x, y);
      if (!(t === TL.SIDE || t === TL.PLAZA) || TRAFFIC.inView(x, y, 30)) continue;
      const p = new Person(x, y, 'ped'); p.state = 'wander'; p.home = { x, y }; p.keep = true; p.wtiles = [TL.SIDE, TL.PLAZA, TL.PROM]; p.speed = U.rand(45, 70);
      if (Math.random() < 0.35) p.look.hair = U.choice(['cap_blue', 'bucket', 'curly', 'short']);
      this.folk.push(p); G.peds.push(p); added++;
    }
    this.cars = this.cars.filter(v => { if (v.remove) return false; if (!near || U.dist(v.x, v.y, P.x, P.y) > 2300) { if (!TRAFFIC.inView(v.x, v.y, 60)) v.remove = true; return !v.remove; } return true; });
    const cw = Math.round((SETTINGS.quality === 'low' ? 7 : 12) * SETTINGS.dens());
    for (let k = 0, made = 0; near && this.cars.length < cw && k < 8 && made < 3; k++) {
      const loop = U.choice(sg.loops), i = U.randi(0, loop.length - 1), a = loop[i], b = loop[(i + 1) % loop.length], f = U.rand(0.15, 0.85);
      const x = U.lerp(a.x, b.x, f), y = U.lerp(a.y, b.y, f);
      const d = U.dist(x, y, P.x, P.y);
      if (d < 500 || d > 1900 || TRAFFIC.inView(x, y, 120) || G.vehicles.some(o => U.d2(o.x, o.y, x, y) < 150 * 150)) continue;
      const type = U.choice(carTypes);
      const v = new Vehicle(type, x, y, Math.atan2(b.y - a.y, b.x - a.x), type === 'taxi' ? { color: '#f4f4f0' } : {}); v.driver = 'ai';
      v.ai = new PathDriver(v, loop, { cruise: type === 'bus' ? 170 : 215, loop: true, start: (i + 1) % loop.length });
      v.vx = Math.cos(v.a) * 120; v.vy = Math.sin(v.a) * 120;
      this.cars.push(v); G.vehicles.push(v); made++;
    }
  },
  reset() { this.folk = []; this.cars = []; },
}; }
const SUGBO = cityLife(() => MAP.sugbo, () => SX0 - 12, () => SUGBO_END + 4, ['multicab', 'multicab', 'multicab', 'jeepney', 'taxi', 'taxi', 'motor', 'motor', 'sedan', 'suv', 'pickup', 'van', 'bus']);
const DABAW = cityLife(() => MAP.dabaw, () => DX0 - 12, () => DABAW_END + 3, ['jeepney', 'jeepney', 'taxi', 'taxi', 'motor', 'tricycle', 'sedan', 'suv', 'pickup', 'pickup', 'van', 'multicab']);
const BAGIW = cityLife(() => MAP.bagiw, () => BX0 - 4, () => BAGIW_END + 1, ['jeepney', 'jeepney', 'taxi', 'sedan', 'suv', 'pickup', 'pickup', 'van', 'motor']);
const PALW = cityLife(() => MAP.pal, () => PX0 - 6, () => MW + 1, ['tricycle', 'tricycle', 'jeepney', 'multicab', 'van', 'motor', 'pickup', 'ebike']);
const BORA = cityLife(() => MAP.bora, () => BRX0 - 6, () => BRX0 + BORA_W + 1, ['tricycle', 'tricycle', 'ebike', 'ebike', 'motor', 'multicab', 'van', 'padyak', 'bisikleta']);
// road points used by police in the outer regions
function regionPts(x) { return PALW.in(x) ? MAP.pal.pts : BORA.in(x) ? MAP.bora.pts : BAGIW.in(x) ? MAP.bagiw.pts : DABAW.in(x) ? MAP.dabaw.pts : SUGBO.in(x) ? MAP.sugbo.pts : MAP.prov.pts; }
function regionName(x) { return PALW.in(x) ? 'PALAWAN' : BORA.in(x) ? 'BORACAY' : BAGIW.in(x) ? 'BAGUIO' : DABAW.in(x) ? 'DAVAO' : SUGBO.in(x) ? 'CEBU' : MAP.inProvince(x) ? 'SAN ISIDRO' : 'MANILA'; }

// ===== Flights between Manila and Cebu (short animated transition) =====
const FLY = {
  go(dest, done) {
    const P = G.player, el = document.getElementById('flight');
    if (P.vehicle) G.exitVehicle(true);
    G.cutscene = true; AUD.whoosh(); AUD.tone(180, 2.4, 'sawtooth', 0.04, 120);
    const toSugbo = dest.key === 'airport_s', nm = { airport_m: 'MANILA', airport_s: 'CEBU', airport_d: 'DAVAO', airport_b: 'BAGUIO', airport_bo: 'BORACAY', airport_p: 'PALAWAN' }, from = regionName(P.x);
    document.getElementById('fl-to').textContent = `${from} ✈️ ${nm[dest.key]}`;
    el.classList.remove('hidden'); el.classList.add('on');
    const arr = MAP.safeNear(dest.x, dest.y + (dest.key === 'airport_m' ? -50 : 30));
    setTimeout(() => MAP.prewarm(arr.x, arr.y, 1300), 300);
    setTimeout(() => {
      P.x = arr.x; P.y = arr.y; P.vx = P.vy = 0; G.cam.x = P.x; G.cam.y = P.y;
      WORLD.clock = (WORLD.clock + 60) % 1440;
    }, 1600);
    setTimeout(() => {
      el.classList.remove('on'); el.classList.add('hidden'); G.cutscene = false;
      UI.big(nm[dest.key], dest.key === 'airport_m' ? 'Balik sa Manila' : dest.key === 'airport_d' ? 'Madayaw nga pag-abot! (Maligayang pagdating!)' : dest.key === 'airport_p' ? 'Maligayang pagdating sa Palawan — ang huling paraiso! 🏝' : dest.key === 'airport_bo' ? 'Mabuhay sa Boracay! Puting buhangin at paglubog ng araw 🏖' : dest.key === 'airport_b' ? 'Malamig dito! Brrr... 🌲' : 'Maayong pag-abot! (Maligayang pagdating!)', 2.2);
      if (toSugbo) TIP.show('sugbo'); if (dest.key === 'airport_d') TIP.show('dabaw'); if (dest.key === 'airport_b') TIP.show('bagiw'); if (dest.key === 'airport_bo') TIP.show('bora');
      G.stats.flights = (G.stats.flights || 0) + 1; ACH.check();
      if (done) done();
    }, 3200);
  },
};
