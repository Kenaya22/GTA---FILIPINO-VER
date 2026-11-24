'use strict';
// ===== Living city: day/night clock, weather & floods, street life =====
const WORLD = {
  clock: 19 * 60, rain: 0, rainTarget: 0, weatherT: 150, flood: 0, lightning: 0, thunderT: -1, npcT: 0,
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
    this.clock = (this.clock + dt * 2) % 1440;           // 1 real second = 2 game minutes (12-min day)
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
    TRAFFIC.maxCars = Math.round(base * (this.rush() ? 1.45 : h >= 0 && h < 5 ? 0.6 : 1));
    TRAFFIC.maxPeds = Math.round((SETTINGS.quality === 'low' ? 20 : 34) * (h >= 0 && h < 5 ? 0.5 : 1) * (1 - this.rain * 0.4));
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
    const type = h >= 5 && h < 11 ? 'taho' : (h >= 18 || h < 3) ? 'balut' : null;
    this.vendors = this.drop(this.vendors, p => (p.vendor !== type && !TRAFFIC.inView(p.x, p.y, 50)) || this.far(p, 1700));
    if (type && this.vendors.length < 2 && !this.onIsland(P.x, P.y)) {
      const p = this.spawnOnSidewalk(450, 900);
      if (p) {
        p.vendor = type; p.speed = 42; p.keep = true; p.amb = true;
        p.look.shirt = type === 'taho' ? '#e9e2cc' : '#3a4a5c'; p.look.pat = 'plain'; p.look.hair = type === 'taho' ? 'bucket' : 'cap_red';
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
    G.addMoney(-20); P.hp = Math.min(100, P.hp + (v.vendor === 'taho' ? 15 : 20)); AUD.coin();
    UI.toast(v.vendor === 'taho' ? '🥣 Mainit-init na taho! +15 buhay' : '🥚 Balut na may asin at suka! +20 buhay');
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
    for (const f of MAP.floods) {
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
  },
  drawRain(g, W, H, dpr) {
    if (this.drops.length) {
      g.strokeStyle = 'rgba(180,200,230,0.35)'; g.lineWidth = 1.2 * dpr; g.beginPath();
      for (const d of this.drops) { const x = d.x * W, y = d.y * H; g.moveTo(x, y); g.lineTo(x - 5 * dpr * d.s, y + 22 * dpr * d.s); }
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
