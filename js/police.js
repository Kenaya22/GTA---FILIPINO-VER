'use strict';
// ===== Wanted system (6 stars + suspect profile) =====
const HEAT_T = [0, 1, 3, 6, 10, 16, 24];
const UNIT_CARS = [0, 1, 3, 4, 5, 5, 6];
const UNIT_SWAT = [0, 0, 0, 0, 2, 2, 2];
const UNIT_ARMY = [0, 0, 0, 0, 0, 0, 3];
const UNIT_HELI = [0, 0, 0, 0, 0, 1, 2];

function camSees(c, x, y) {
  const d = U.dist(c.x, c.y, x, y);
  if (d > 320) return false;
  const a = Math.atan2(y - c.y, x - c.x);
  if (Math.abs(U.angDiff(c.a, a)) > 0.55) return false;
  return MAP.los(c.x, c.y, x, y);
}

const WANTED = {
  stars: 0, heat: 0, mode: 'none', lastX: 0, lastY: 0, unseenT: 0, decayT: 0, zone: 0, escaping: false,
  prof: { car: null, clothes: null, face: null }, cctvT: 0, recognized: false, lock: false, minStars: 0,
  roadT: 8, spawnT: 0, seeT: 0, susp: 0, seer: null, helis: [], spikes: [], chaseT: 0,
  reset() {
    this.stars = 0; this.heat = 0; this.mode = 'none'; this.unseenT = 0; this.decayT = 0; this.escaping = false;
    this.prof = { car: null, clothes: null, face: null }; this.cctvT = 0; this.recognized = false; this.lock = false; this.minStars = 0;
    this.susp = 0; this.spikes = []; this.chaseT = 0;
    for (const h of this.helis) h.leaving = true;
  },
  current() {
    const P = G.player;
    return { car: P.vehicle ? P.vehicle.ident : null, clothes: P.look.outfit, face: P.look.hair };
  },
  visibleKeys(kind, dist) {
    const P = G.player;
    if (kind === 'cctv') return P.vehicle ? ['car', 'face'] : ['clothes', 'face'];
    if (P.vehicle) return dist < 160 ? ['car', 'face'] : ['car'];
    return dist < 220 ? ['clothes', 'face'] : ['clothes'];
  },
  learn(keys) {
    const c = this.current();
    for (const k of keys) if (c[k] !== null) this.prof[k] = c[k];
  },
  crime(sev, x, y, force) {
    if (G.cutscene || G.player.downed) return false;
    let w = !!force, kind = 'cop', dist = 100;
    if (!w) {
      for (const v of G.vehicles) {
        if (!v.isCop || !v.driver || v.dead) continue;
        const d = U.dist(v.x, v.y, x, y);
        if (d < 520 && MAP.los(v.x, v.y, x, y)) { w = true; dist = d; break; }
      }
    }
    if (!w) for (const p of G.peds) {
      if (p.kind !== 'cop' || p.state === 'down') continue;
      const d = U.dist(p.x, p.y, x, y);
      if (d < 420 && MAP.los(p.x, p.y, x, y)) { w = true; dist = d; break; }
    }
    if (!w) for (const c of MAP.cctv) if (camSees(c, x, y)) { w = true; kind = 'cctv'; break; }
    if (!w) return false;
    this.addHeat(sev * D().heat);
    this.spotted(kind, dist);
    return true;
  },
  addHeat(n) {
    this.heat += n;
    let s = 0; for (let k = 0; k < HEAT_T.length; k++) if (this.heat >= HEAT_T[k]) s = k;
    if (s > this.stars) this.setStars(s);
  },
  setStars(n) {
    n = U.clamp(n, 0, 6);
    if (n > this.stars) {
      this.peak = Math.max(this.peak || 0, n);
      AUD.star(); UI.flashStars();
      if (n === 6) UI.big('6 BITUIN!', 'Lahat ng pulis at sundalo, hinahabol ka!', 2.2);
      else if (this.stars === 0) UI.toast('🚨 Hinahabol ka ng pulis!');
    }
    this.stars = n; this.heat = Math.max(this.heat, HEAT_T[n]);
    if (n > 0 && this.mode === 'none') { this.mode = 'chase'; this.lastX = G.player.x; this.lastY = G.player.y; this.chaseT = 0; }
    if (n === 0) this.clear(false);
  },
  spotted(kind, dist) {
    const P = G.player;
    if (this.stars === 0) return;
    if (this.mode === 'search') { UI.toast(kind === 'cctv' ? '📹 Nakunan ka ng CCTV!' : '👀 Namukhaan ka!'); AUD.star(); }
    this.mode = 'chase'; this.lastX = P.x; this.lastY = P.y; this.unseenT = 0; this.decayT = 0; this.escaping = false; this.recognized = true;
    this.learn(this.visibleKeys(kind, dist));
    if (kind === 'cctv') { this.cctvT = 10; this.learn(['clothes', 'face', 'car']); }
  },
  clear(msg) {
    const had = this.stars > 0 || this.mode !== 'none';
    this.stars = 0; this.heat = 0; this.mode = 'none'; this.escaping = false; this.recognized = false;
    this.prof = { car: null, clothes: null, face: null }; this.cctvT = 0; this.susp = 0; this.spikes = [];
    for (const p of G.peds) p.susp = 0;
    for (const h of this.helis) h.leaving = true;
    if (had && msg) {
      UI.big('NAKATAKAS KA!', 'Nawala na ang mga pulis', 1.8); AUD.escaped(); G.stats.escapes++;
      if ((this.peak || 0) >= 3) ACH.flags.escape3 = true;
      if ((this.peak || 0) >= 6) ACH.flags.escape6 = true;
      ACH.check();
    }
    this.peak = 0;
  },
  update(dt) {
    const P = G.player;
    for (const c of MAP.cctv) c.a = c.base + Math.sin(G.time * 0.6 + c.ph) * 0.6;
    if (this.cctvT > 0) this.cctvT -= dt;
    this.updateHelis(dt);
    this.updateSpikes(dt);
    if (this.stars === 0) { AUD.siren(0); return; }
    if (P.downed) return;
    // who sees the player?
    this.seeT -= dt;
    let seen = null;
    if (this.seeT <= 0) {
      this.seeT = 0.12;
      const px = P.x, py = P.y, vis = WORLD.copVision() * D().vision;
      for (const v of G.vehicles) {
        if (!v.isCop || !v.driver || v.dead || v.driver === 'player') continue;
        const d = U.dist(v.x, v.y, px, py);
        if (d < 540 * vis && MAP.los(v.x, v.y, px, py)) { if (!seen || d < seen.d) seen = { kind: 'cop', d, who: v }; }
      }
      for (const p of G.peds) {
        if (p.kind !== 'cop' || p.state === 'down') continue;
        const d = U.dist(p.x, p.y, px, py);
        if (d < 420 * vis && MAP.los(p.x, p.y, px, py)) { if (!seen || d < seen.d) seen = { kind: 'cop', d, who: p }; }
      }
      for (const h of this.helis) if (!h.leaving && U.dist(h.sx, h.sy, px, py) < 130) seen = seen || { kind: 'heli', d: 300, who: h };
      if (!seen) for (const c of MAP.cctv) if (camSees(c, px, py)) { seen = { kind: 'cctv', d: 0, who: c }; break; }
      this.lastSeen = seen;
    } else seen = this.lastSeen;

    if (this.mode === 'chase') {
      this.chaseT += dt;
      if (seen) {
        this.lastX = P.x; this.lastY = P.y; this.unseenT = 0;
        this.learn(this.visibleKeys(seen.kind, seen.d));
        if (seen.kind === 'cctv') { this.cctvT = 10; this.learn(['clothes', 'face', 'car']); }
        this.heat += dt * 0.015;
        this.addHeat(0);
      } else {
        this.unseenT += dt;
        if (this.unseenT > D().lost) {
          this.mode = 'search'; this.zone = (520 + this.stars * 150) * D().zone; this.decayT = 0; this.recognized = false; this.susp = 0;
          UI.toast('Nawala ka sa paningin nila — tumakas palabas ng search zone!');
        }
      }
    } else if (this.mode === 'search') {
      const inside = Math.abs(P.x - this.lastX) < this.zone && Math.abs(P.y - this.lastY) < this.zone;
      this.escaping = !inside;
      let recog = false;
      if (seen) {
        const cur = this.current();
        const keys = this.visibleKeys(seen.kind, seen.d);
        const known = keys.filter(k => this.prof[k] !== null);
        const match = known.filter(k => this.prof[k] === cur[k]);
        if (match.length > 0) {
          recog = true;
          if (match.length === known.length && (seen.kind !== 'cop' || seen.d < 420)) this.susp += dt * 2.2;
          else this.susp += dt * 0.55;
          if (seen.who && seen.who.susp !== undefined) seen.who.susp = this.susp;
          if (this.susp >= 1) { this.susp = 0; this.spotted(seen.kind, seen.d); for (const p of G.peds) p.susp = 0; }
        }
      }
      if (!recog) { this.susp = Math.max(0, this.susp - dt * 0.5); for (const p of G.peds) if (p.susp > 0) p.susp = Math.max(0, p.susp - dt); }
      if (this.mode === 'search') {
        this.decayT += dt * (this.escaping ? 1 : D().inZone) * (recog ? 0 : 1);
        const need = (3.5 + this.stars * 0.9) * D().decay;
        if (this.decayT > need && !(this.lock && this.stars <= this.minStars)) {
          this.decayT = 0;
          const n = this.stars - 1;
          // forget one clue
          const ks = Object.keys(this.prof).filter(k => this.prof[k] !== null);
          if (ks.length && Math.random() < 0.6) this.prof[U.choice(ks)] = null;
          this.stars = n; this.heat = HEAT_T[n];
          if (n <= 0) this.clear(true);
        }
      }
    }
    this.updateUnits(dt);
    // siren volume
    let nd = 1e9;
    for (const v of G.vehicles) if (v.siren) nd = Math.min(nd, U.dist(v.x, v.y, P.x, P.y));
    AUD.siren(nd < 1400 ? 1 - nd / 1400 : 0);
  },
  updateUnits(dt) {
    const P = G.player;
    // recruit nearby patrol cars
    for (const v of G.vehicles) {
      if (v.isCop && v.driver === 'ai' && !v.unit && !v.dead && U.dist(v.x, v.y, P.x, P.y) < 1300) { v.unit = true; v.ai = new CopDriver(v); }
    }
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = this.mode === 'chase' ? 1.1 : 2.2;
    const s = this.stars;
    let cars = 0, swat = 0, army = 0;
    for (const v of G.vehicles) {
      if (!v.unit || v.dead) continue;
      if (U.dist(v.x, v.y, P.x, P.y) > 2600) { v.remove = true; continue; }
      if (v.type === 'swat') swat++; else if (v.type === 'army') army++; else cars++;
    }
    let need = null;
    const lim = (arr) => arr[s] ? Math.max(1, Math.round(arr[s] * D().units)) : 0;
    if (cars < lim(UNIT_CARS)) need = s <= 2 && Math.random() < 0.3 ? 'policemoto' : 'police';
    else if (swat < lim(UNIT_SWAT)) need = 'swat';
    else if (army < lim(UNIT_ARMY)) need = 'army';
    if (need && !WORLD.onIsland(P.x, P.y)) this.spawnUnit(need);
    if (WORLD.onIsland(P.x, P.y) || (P.vehicle && P.vehicle.t.boat)) {
      const boats = G.vehicles.filter(v => v.type === 'policeboat' && v.unit && !v.dead).length;
      if (boats < Math.min(3, Math.ceil(s / 2) + 1)) this.spawnBoat();
    }
    const hs = this.helis.filter(h => !h.leaving).length;
    const heliWant = s >= D().heliMin ? (D().heliMin > 5 ? 1 : UNIT_HELI[s]) : 0;
    if (hs < heliWant) {
      const a = Math.random() * TAU;
      this.helis.push(new Heli(P.x + Math.cos(a) * 1300, P.y + Math.sin(a) * 1300));
    }
    // roadblocks
    this.roadT -= 2.2;
    if (s >= D().roadblock && this.mode === 'chase' && P.vehicle && P.vehicle.speed > 180 && this.roadT <= 0) { this.roadT = 14; this.roadblock(); }
  },
  spawnUnit(type) {
    const cx = this.mode === 'search' ? this.lastX : G.player.x, cy = this.mode === 'search' ? this.lastY : G.player.y;
    if (MAP.prov && cx > (CITY_W - 20) * T) {
      // province: spawn on the highway / farm roads
      for (let tries = 0; tries < 16; tries++) {
        const p = U.choice(MAP.prov.pts), d = U.dist(p.x, p.y, cx, cy);
        if (d < 800 || d > 1700 || TRAFFIC.inView(p.x, p.y, 100) || G.vehicles.some(v => U.d2(v.x, v.y, p.x, p.y) < 120 * 120)) continue;
        const v = new Vehicle(type, p.x, p.y, Math.atan2(cy - p.y, cx - p.x));
        v.driver = 'cop'; v.unit = true; v.siren = true; v.ai = new CopDriver(v); G.vehicles.push(v);
        return v;
      }
      return null;
    }
    for (let tries = 0; tries < 12; tries++) {
      const i = U.randi(0, NR - 1), j = U.randi(0, NR - 1), d = U.randi(0, 3);
      if (!MAP.segOK(i, j, d)) continue;
      const D = DIRS[d], t = Math.random();
      let x, y;
      if (D[0]) { x = U.lerp(MAP.cx(i), MAP.cx(i + D[0]), 0.2 + t * 0.6); y = MAP.laneY(j, d); }
      else { y = U.lerp(MAP.cy(j), MAP.cy(j + D[1]), 0.2 + t * 0.6); x = MAP.laneX(i, d); }
      const dist = U.dist(x, y, cx, cy);
      if (dist < 850 || dist > 1600 || TRAFFIC.inView(x, y, 100)) continue;
      if (G.vehicles.some(v => U.d2(v.x, v.y, x, y) < 120 * 120)) continue;
      const v = new Vehicle(type, x, y, Math.atan2(cy - y, cx - x));
      v.driver = 'cop'; v.unit = true; v.siren = true; v.ai = new CopDriver(v);
      G.vehicles.push(v);
      return v;
    }
    return null;
  },
  spawnBoat() {
    const P = G.player;
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * TAU, d = U.rand(700, 1200);
      const x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
      if (MAP.tileAt(x, y) !== TL.WATER || MAP.tileAt(x + 40, y) !== TL.WATER || MAP.tileAt(x - 40, y) !== TL.WATER || TRAFFIC.inView(x, y, 80)) continue;
      const v = new Vehicle('policeboat', x, y, Math.atan2(P.y - y, P.x - x));
      v.driver = 'cop'; v.unit = true; v.siren = true; v.ai = new BoatCop(v); G.vehicles.push(v);
      return;
    }
  },
  roadblock() {
    const P = G.player, v = P.vehicle;
    const ax = Math.abs(v.vx) > Math.abs(v.vy);
    const sg = ax ? Math.sign(v.vx) : Math.sign(v.vy);
    let best = null;
    for (let i = 0; i < NR; i++) for (let j = 0; j < NR; j++) {
      if (!MAP.nodeExists(i, j)) continue;
      const nx = MAP.cx(i), ny = MAP.cy(j);
      const along = ax ? (nx - P.x) * sg : (ny - P.y) * sg;
      const lat = ax ? Math.abs(ny - P.y) : Math.abs(nx - P.x);
      if (lat > 90 || along < 650 || along > 1400) continue;
      if (!best || along < best.along) best = { i, j, along, nx, ny };
    }
    if (!best) return;
    const bx = ax ? best.nx - sg * 150 : best.nx, by = ax ? best.ny : best.ny - sg * 150;
    if (TRAFFIC.inView(bx, by, 40)) return;
    for (const off of [-30, 30]) {
      const x = ax ? bx : bx + off, y = ax ? by + off : by;
      const c = new Vehicle(this.stars >= 4 && off > 0 ? 'swat' : 'police', x, y, ax ? Math.PI / 2 : 0);
      c.driver = 'cop'; c.unit = true; c.siren = true; c.ai = new CopDriver(c); c.ai.hold = 14;
      G.vehicles.push(c);
    }
    if (this.stars >= D().spikes) {
      const sx = ax ? best.nx - sg * 320 : best.nx, sy = ax ? best.ny : best.ny - sg * 320;
      this.spikes.push({ x: sx, y: sy, horiz: !ax, life: 40 });
    }
    UI.toast('🚧 May roadblock sa unahan!');
  },
  updateSpikes(dt) {
    const v = G.player.vehicle;
    for (const s of this.spikes) {
      s.life -= dt;
      if (v && !v.popped) {
        const hw = s.horiz ? 64 : 8, hh = s.horiz ? 8 : 64;
        if (Math.abs(v.x - s.x) < hw + v.W / 2 && Math.abs(v.y - s.y) < hh + v.W / 2) {
          v.popped = true; AUD.noise(0.6, 0.4, 3000, 0, 'highpass'); UI.toast('💥 Butas ang gulong! (Ipa-repaint/ayos sa Pintura)');
        }
      }
    }
    this.spikes = this.spikes.filter(s => s.life > 0);
  },
  updateHelis(dt) {
    let vol = 0;
    for (const h of this.helis) { h.update(dt); const d = U.dist(h.x, h.y, G.player.x, G.player.y); vol = Math.max(vol, d < 1500 ? 1 - d / 1500 : 0); }
    this.helis = this.helis.filter(h => !h.gone);
    AUD.heli(vol);
  },
};

class CopDriver {
  constructor(v) { this.v = v; this.stuckT = 0; this.revT = 0; this.road = null; this.deployCd = 0; this.hold = 0; }
  update(dt) {
    const v = this.v, P = G.player;
    if (v.dead) { v.throttle = 0; v.steer = 0; return; }
    this.deployCd -= dt;
    if (WANTED.stars === 0) {
      v.siren = false; v.unit = false;
      if (!this.road) this.road = new RoadDriver(v, { cruise: 240 });
      this.road.update(dt);
      return;
    }
    v.siren = true;
    v.speedMul = [1, 0.8, 0.86, 0.93, 0.98, 1, 1.04][WANTED.stars] * D().copSpeed;
    if (this.hold > 0) {
      this.hold -= dt; v.throttle = 0; v.hand = true; v.steer = 0;
      if (U.dist(v.x, v.y, P.x, P.y) < 260) this.hold = 0;
      return;
    }
    const tgt = P.vehicle || P;
    let tx, ty, field;
    if (WANTED.mode === 'chase') {
      tx = tgt.x + (P.vehicle ? P.vehicle.vx * 0.3 : 0); ty = tgt.y + (P.vehicle ? P.vehicle.vy * 0.3 : 0);
      field = G.copField; this.road = null; this.ptgt = null;
    } else {
      tx = WANTED.lastX; ty = WANTED.lastY; field = G.copField;
      if (MAP.prov && v.x > (CITY_W - 4) * T && (U.dist(v.x, v.y, tx, ty) < 320 || this.ptgt)) {
        // province search: wander between nearby farm/highway points
        if (!this.ptgt || U.dist(v.x, v.y, this.ptgt.x, this.ptgt.y) < 80) this.ptgt = U.choice(MAP.prov.pts.filter(p => U.dist(p.x, p.y, tx, ty) < 1400)) || MAP.prov.pts[0];
        tx = this.ptgt.x; ty = this.ptgt.y; field = null;
      } else if (U.dist(v.x, v.y, tx, ty) < 320 || this.road) {
        if (!this.road) this.road = new RoadDriver(v, { cruise: 300, ignoreLights: true });
        this.road.update(dt);
        return;
      }
    }
    const d = U.dist(v.x, v.y, tgt.x, tgt.y);
    let ax = tx, ay = ty;
    if (!(d < 320 && MAP.los(v.x, v.y, tx, ty) && WANTED.mode === 'chase')) {
      const n = field ? MAP.fieldNext(field, v.x, v.y, 4) : null;
      if (n) { ax = n.x; ay = n.y; }
    }
    const desired = Math.atan2(ay - v.y, ax - v.x);
    const diff = U.angDiff(v.a, desired);
    const fs = v.fwd();
    if (this.revT > 0) { this.revT -= dt; v.throttle = -1; v.steer = -Math.sign(diff) || 1; v.hand = false; return; }
    v.steer = U.clamp(diff * 2.3, -1, 1);
    let th = 1;
    if (Math.abs(diff) > 1.2 && fs > 230) th = -0.7;
    v.hand = Math.abs(diff) > 1.5 && fs > 260;
    if (!P.vehicle && WANTED.mode === 'chase' && d < 190) {
      th = fs > 40 ? -1 : 0; v.hand = false;
      if (this.deployCd <= 0 && fs < 60) {
        this.deployCd = 12;
        const foot = G.peds.filter(p => p.kind === 'cop' && p.fromCar).length;
        if (foot < 6) for (const s of [-1, 1]) {
          const ox = v.x - Math.sin(v.a) * s * 30, oy = v.y + Math.cos(v.a) * s * 30;
          if (MAP.solidAt(ox, oy)) continue;
          const c = new Person(ox, oy, 'cop'); c.fromCar = v; c.state = 'chase'; G.peds.push(c);
        }
      }
    }
    v.throttle = th;
    if (Math.abs(fs) < 25 && th > 0) { this.stuckT += dt; if (this.stuckT > 1.0) { this.revT = 0.8; this.stuckT = 0; } }
    else this.stuckT = Math.max(0, this.stuckT - dt);
  }
}

class Heli {
  constructor(x, y) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.a = 0; this.rot = 0; this.sx = x; this.sy = y; this.leaving = false; this.gone = false; this.t = Math.random() * 10; }
  update(dt) {
    this.t += dt; this.rot += dt * 30;
    const P = G.player;
    let tx, ty;
    if (this.leaving) { tx = this.x + (this.x - P.x) * 2; ty = this.y + (this.y - P.y) * 2; if (U.dist(this.x, this.y, P.x, P.y) > 2200) this.gone = true; }
    else if (WANTED.mode === 'chase') { tx = P.x; ty = P.y; }
    else { tx = WANTED.lastX + Math.cos(this.t * 0.4) * WANTED.zone * 0.7; ty = WANTED.lastY + Math.sin(this.t * 0.55) * WANTED.zone * 0.7; }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    const sp = Math.min(440, d * 1.2);
    this.vx = U.lerp(this.vx, dx / d * sp, dt * 1.5); this.vy = U.lerp(this.vy, dy / d * sp, dt * 1.5);
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.hypot(this.vx, this.vy) > 30) this.a = Math.atan2(this.vy, this.vx);
    // spotlight
    const stx = WANTED.mode === 'chase' && !this.leaving ? P.x : this.x + Math.cos(this.t) * 120;
    const sty = WANTED.mode === 'chase' && !this.leaving ? P.y : this.y + Math.sin(this.t * 1.3) * 120;
    const k = Math.min(1, dt * 2.2);
    this.sx = U.lerp(this.sx, stx, k); this.sy = U.lerp(this.sy, sty, k);
    const sd = U.dist(this.sx, this.sy, this.x, this.y);
    if (sd > 320) { this.sx = this.x + (this.sx - this.x) / sd * 320; this.sy = this.y + (this.sy - this.y) / sd * 320; }
  }
  draw(g) {
    g.save(); g.translate(this.x + 40, this.y + 60); g.rotate(this.a);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 0, 34, 15, 0, 0, TAU); g.fill(); g.fillRect(-70, -3, 40, 6);
    g.restore();
    g.save(); g.translate(this.x, this.y); g.rotate(this.a);
    g.fillStyle = '#2b3a55'; g.fillRect(-70, -3, 44, 6); g.fillRect(-74, -10, 6, 20);
    g.fillStyle = '#e9edf2'; g.beginPath(); g.ellipse(0, 0, 32, 15, 0, 0, TAU); g.fill();
    g.fillStyle = '#1d3f8f'; g.fillRect(-20, -15, 30, 4); g.fillRect(-20, 11, 30, 4);
    g.fillStyle = '#18202d'; g.beginPath(); g.ellipse(16, 0, 12, 11, 0, -1.2, 1.2); g.fill();
    g.strokeStyle = 'rgba(30,30,30,0.75)'; g.lineWidth = 5; g.lineCap = 'round';
    for (let k = 0; k < 4; k++) { const a = this.rot + k * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 58, Math.sin(a) * 58); g.stroke(); }
    g.fillStyle = '#555'; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
    const ph = Math.floor(performance.now() / 150) % 2; g.fillStyle = ph ? '#ff3030' : '#3070ff'; g.fillRect(-8, -2, 4, 4);
    g.restore();
  }
}
