'use strict';
// ===== Traffic: lane-following road drivers & spawning =====
class RoadDriver {
  constructor(v, opt = {}) {
    this.v = v; this.cruise = opt.cruise || v.t.cruise || 220; this.wps = [];
    this.route = opt.route || null; this.ri = 0; this.blockT = 0; this.stuckT = 0; this.revT = 0;
    this.stopT = 0; this.hornCd = 0; this.finished = false; this.ignorePlayer = !!opt.ignorePlayer; this.ignoreLights = !!opt.ignoreLights;
    this.snap();
  }
  snap() {
    const v = this.v;
    const fi = (v.x / T - OX - RW / 2) / PER, fj = (v.y / T - OY - RW / 2) / PER;
    let i = U.clamp(Math.round(fi), 0, NR - 1), j = U.clamp(Math.round(fj), 0, NR - 1);
    const dxv = Math.abs(v.x - MAP.cx(i)), dyh = Math.abs(v.y - MAP.cy(j));
    const ca = Math.cos(v.a), sa = Math.sin(v.a);
    let ti, tj, d;
    if (dxv < dyh) {
      d = sa >= 0 ? 1 : 3; ti = i;
      tj = d === 1 ? Math.floor(fj) + 1 : Math.ceil(fj) - 1;
      tj = U.clamp(tj, 0, NR - 1);
      const fromJ = tj - DIRS[d][1];
      if (fromJ < 0 || fromJ >= NR || !MAP.segOK(ti, fromJ, d)) { d = (d + 2) % 4; tj = U.clamp(tj - DIRS[(d + 2) % 4][1] * 1, 0, NR - 1); }
    } else {
      d = ca >= 0 ? 0 : 2; tj = j;
      ti = d === 0 ? Math.floor(fi) + 1 : Math.ceil(fi) - 1;
      ti = U.clamp(ti, 0, NR - 1);
      const fromI = ti - DIRS[d][0];
      if (fromI < 0 || fromI >= NR || !MAP.segOK(fromI, tj, d)) { d = (d + 2) % 4; ti = U.clamp(ti - DIRS[(d + 2) % 4][0], 0, NR - 1); }
    }
    this.ti = ti; this.tj = tj; this.d = d;
    this.wps = [this.approach(ti, tj, d)];
  }
  approach(i, j, d) {
    const D = DIRS[d];
    if (D[0]) return { x: MAP.cx(i) - D[0] * 100, y: MAP.laneY(j, d), ap: true };
    return { x: MAP.laneX(i, d), y: MAP.cy(j) - D[1] * 100, ap: true };
  }
  chooseNext() {
    const i = this.ti, j = this.tj, d = this.d;
    let nd;
    if (this.route) {
      if (this.ri >= this.route.length - 1) { this.finished = true; nd = -1; }
      else {
        const [ni, nj] = this.route[this.ri + 1];
        nd = ni > i ? 0 : ni < i ? 2 : nj > j ? 1 : 3;
        this.ri++;
      }
    }
    if (nd === undefined) {
      const opts = [];
      for (let k = 0; k < 4; k++) if (k !== (d + 2) % 4 && MAP.segOK(i, j, k)) opts.push(k);
      if (!opts.length) nd = (d + 2) % 4;
      else if (opts.includes(d) && Math.random() < 0.5) nd = d;
      else nd = U.choice(opts);
    }
    if (nd < 0) { this.wps = []; return; }
    const cx = MAP.cx(i), cy = MAP.cy(j);
    const horiz = (k) => k === 0 || k === 2;
    let corner;
    if (nd === d) corner = horiz(d) ? { x: cx, y: MAP.laneY(j, d) } : { x: MAP.laneX(i, d), y: cy };
    else if (nd === (d + 2) % 4) corner = horiz(d) ? { x: cx, y: cy } : { x: cx, y: cy };
    else if (horiz(d)) corner = { x: MAP.laneX(i, nd), y: MAP.laneY(j, d), turn: true };
    else corner = { x: MAP.laneX(i, d), y: MAP.laneY(j, nd), turn: true };
    const D2 = DIRS[nd];
    const exit = horiz(nd) ? { x: cx + D2[0] * 100, y: MAP.laneY(j, nd) } : { x: MAP.laneX(i, nd), y: cy + D2[1] * 100 };
    this.ti = i + D2[0]; this.tj = j + D2[1]; this.d = nd;
    this.wps.push(corner, exit, this.approach(this.ti, this.tj, nd));
  }
  update(dt) {
    const v = this.v;
    if (v.dead) { v.throttle = 0; v.steer = 0; return; }
    this.hornCd -= dt;
    if (!this.wps.length) { if (!this.finished) this.snap(); else { v.throttle = v.fwd() > 10 ? -1 : 0; v.steer = 0; return; } }
    let wp = this.wps[0];
    let d = U.dist(v.x, v.y, wp.x, wp.y);
    const red = wp.ap && !this.ignoreLights && this.redAhead(d);
    if (!red && (d < 34 || (this.wps.length > 1 && d < 60 && this.passed(wp)))) {
      const was = this.wps.shift();
      if (was.ap) this.chooseNext();
      if (!this.wps.length) { v.throttle = 0; return; }
      wp = this.wps[0]; d = U.dist(v.x, v.y, wp.x, wp.y);
    }
    const desired = Math.atan2(wp.y - v.y, wp.x - v.x);
    const diff = U.angDiff(v.a, desired);
    const fs = v.fwd();
    if (this.revT > 0) {
      this.revT -= dt; v.throttle = -0.8; v.steer = -Math.sign(diff); v.hand = false; return;
    }
    v.steer = U.clamp(diff * 2.4, -1, 1);
    let target = this.cruise;
    if (Math.abs(diff) > 0.5) target = Math.min(target, 120);
    const next = this.wps.find(w => w.turn);
    if (next && U.dist(v.x, v.y, next.x, next.y) < 170) target = Math.min(target, 125);
    // obstacles
    const ob = this.obstacle();
    if (ob < 1e9) {
      target = Math.min(target, Math.max(0, (ob - 14) * 2.2));
      if (ob < 30) target = 0;
    }
    if (this.stopT > 0) { this.stopT -= dt; target = 0; }
    if (red && d < 190) { target = Math.min(target, Math.max(0, (d - 22) * 1.7)); if (d < 30) target = 0; this.atRed = true; } else this.atRed = false;
    if (fs < target - 10) v.throttle = U.clamp((target - fs) / 80, 0.3, 1);
    else if (fs > target + 25) v.throttle = -U.clamp((fs - target) / 100, 0.3, 1);
    else v.throttle = 0;
    v.hand = false;
    // stuck handling
    if (target > 50 && Math.abs(fs) < 15 && !this.atRed) {
      this.stuckT += dt;
      if (this.stuckT > 2.5) { this.revT = 0.9; this.stuckT = 0; }
    } else this.stuckT = 0;
    if (ob < 60 && this.blockByPlayer) {
      this.blockT += dt;
      if (this.blockT > 1.8 && this.hornCd <= 0 && U.dist(v.x, v.y, G.player.x, G.player.y) < 500) { this.hornCd = U.rand(2, 4); AUD.horn(v.isBig()); }
    } else this.blockT = 0;
  }
  redAhead(d) {
    const L = MAP.lightMap[this.ti + ',' + this.tj];
    if (!L) return false;
    const st = MAP.lightState(L, this.d === 0 || this.d === 2 ? 'h' : 'v', G.time);
    if (st === 'g') return false;
    if (st === 'y' && d < 70) return false;
    return true;
  }
  passed(wp) {
    const v = this.v;
    return (wp.x - v.x) * Math.cos(v.a) + (wp.y - v.y) * Math.sin(v.a) < 0;
  }
  obstacle() {
    const v = this.v, ca = Math.cos(v.a), sa = Math.sin(v.a);
    const look = 50 + Math.max(0, v.fwd()) * 0.55 + v.L / 2;
    let best = 1e9; this.blockByPlayer = false;
    for (const o of G.vehicles) {
      if (o === v) continue;
      const dx = o.x - v.x, dy = o.y - v.y;
      if (Math.abs(dx) > 260 || Math.abs(dy) > 260) continue;
      const fx = dx * ca + dy * sa, fy = -dx * sa + dy * ca;
      if (fx <= 0 || fx > look + o.L / 2) continue;
      if (Math.abs(fy) < v.W / 2 + o.W / 2 + 2) {
        const gap = fx - v.L / 2 - o.L / 2 * Math.abs(Math.cos(o.a - v.a)) - o.W / 2 * Math.abs(Math.sin(o.a - v.a));
        if (gap < best) { best = gap; this.blockByPlayer = o.driver === 'player'; }
      }
    }
    const P = G.player;
    if (!P.vehicle && !P.downed) {
      const dx = P.x - v.x, dy = P.y - v.y, fx = dx * ca + dy * sa, fy = -dx * sa + dy * ca;
      if (fx > 0 && fx < look && Math.abs(fy) < v.W / 2 + 12) { const gap = fx - v.L / 2 - 10; if (gap < best) { best = gap; this.blockByPlayer = true; } }
    }
    for (const p of G.peds) {
      if (p.state === 'down') continue;
      const dx = p.x - v.x, dy = p.y - v.y;
      if (Math.abs(dx) > 200 || Math.abs(dy) > 200) continue;
      const fx = dx * ca + dy * sa, fy = -dx * sa + dy * ca;
      if (fx > 0 && fx < look && Math.abs(fy) < v.W / 2 + 10) { const gap = fx - v.L / 2 - 10; if (gap < best) best = gap; }
    }
    return best;
  }
}

const TRAFFIC = {
  maxCars: 26, maxPeds: 34, spawnT: 0,
  carType(i, j) {
    const r = Math.random();
    const avenue = i === 4 || j === 4;
    if (r < 0.26) return 'jeepney';
    if (r < 0.45) return U.choice(['sedan', 'sedan', 'hatch']);
    if (r < 0.52) return 'taxi';
    if (r < 0.63) return avenue ? 'sedan' : (Math.random() < 0.25 ? 'padyak' : 'tricycle');
    if (r < 0.67) return 'motor';
    if (r < 0.685) return Math.random() < 0.5 ? 'ebike' : 'bisikleta';
    if (r < 0.70) return 'bigbike';
    if (r < 0.76) return 'suv';
    if (r < 0.81) return 'van';
    if (r < 0.85) return 'pickup';
    if (r < 0.88) return avenue ? 'bus' : 'van';
    if (r < 0.90) return Math.random() < 0.3 ? 'supercar' : 'sports';
    if (r < 0.92) return 'garbage';
    if (r < 0.94) return 'ambulance';
    if (r < 0.95) return avenue ? 'firetruck' : 'pickup';
    return 'police';
  },
  inView(x, y, m) {
    const c = G.cam, hw = c.vw / 2 + m, hh = c.vh / 2 + m;
    return Math.abs(x - c.x) < hw && Math.abs(y - c.y) < hh;
  },
  update(dt) {
    this.spawnT -= dt;
    const P = G.player, c = G.cam;
    // despawn far
    for (const v of G.vehicles) {
      if (v.driver === 'player' || v.mission || v.keep) continue;
      const d = U.dist(v.x, v.y, c.x, c.y);
      if ((v.ai && v.ai instanceof RoadDriver && d > 2000) || (v.burnt && d > 1400 && !this.inView(v.x, v.y, 50)) || (!v.driver && !v.parked && d > 1800)) v.remove = true;
      if (v.ai && v.ai.revT === 0 && v.ai.blockT > 8 && !this.inView(v.x, v.y, 60)) v.remove = true;
    }
    for (const p of G.peds) {
      if (p.npc || p.keep) continue;
      if (U.dist(p.x, p.y, c.x, c.y) > 1600) p.remove = true;
    }
    if (this.spawnT > 0) return;
    this.spawnT = 0.35;
    const traffic = G.vehicles.filter(v => v.ai instanceof RoadDriver && !v.mission).length;
    if (traffic < this.maxCars) this.spawnCar();
    const peds = G.peds.filter(p => !p.npc && !p.fromCar).length;
    if (peds < this.maxPeds) this.spawnPed();
  },
  spawnCar() {
    const c = G.cam;
    for (let tries = 0; tries < 8; tries++) {
      const i = U.randi(0, NR - 1), j = U.randi(0, NR - 1);
      const d = U.randi(0, 3);
      if (!MAP.segOK(i, j, d)) continue;
      const t = Math.random();
      const D = DIRS[d];
      const ni = i + D[0], nj = j + D[1];
      let x, y;
      if (D[0]) { x = U.lerp(MAP.cx(i), MAP.cx(ni), 0.2 + t * 0.6); y = MAP.laneY(j, d); }
      else { y = U.lerp(MAP.cy(j), MAP.cy(nj), 0.2 + t * 0.6); x = MAP.laneX(i, d); }
      const dist = U.dist(x, y, c.x, c.y);
      if (dist < 700 || dist > 1500 || this.inView(x, y, 120)) continue;
      if (G.vehicles.some(v => U.d2(v.x, v.y, x, y) < 130 * 130)) continue;
      const type = this.carType(i, j);
      const v = new Vehicle(type, x, y, Math.atan2(D[1], D[0]));
      v.driver = 'ai';
      v.ai = new RoadDriver(v);
      if (v.t.emerg && Math.random() < 0.45) { v.siren = true; v.ai.cruise *= 1.2; }
      const f = v.ai.cruise * 0.7; v.vx = Math.cos(v.a) * f; v.vy = Math.sin(v.a) * f;
      G.vehicles.push(v);
      return;
    }
  },
  spawnPed() {
    const c = G.cam;
    for (let tries = 0; tries < 8; tries++) {
      const bi = U.randi(0, NR - 1), bj = U.randi(-1, NR - 1);
      if ((bi === 0 && (bj === 2 || bj === 3 || bj === 4)) || (bi === 1 && bj === 4)) continue;
      const [x0, y0, w, h] = MAP.blockRect(bi, bj);
      const side = U.randi(0, 3), t = Math.random();
      let x, y;
      if (side === 0) { x = (x0 + 0.5 + t * (w - 1)) * T; y = (y0 + 0.5) * T; }
      else if (side === 1) { x = (x0 + w - 0.5) * T; y = (y0 + 0.5 + t * (h - 1)) * T; }
      else if (side === 2) { x = (x0 + 0.5 + t * (w - 1)) * T; y = (y0 + h - 0.5) * T; }
      else { x = (x0 + 0.5) * T; y = (y0 + 0.5 + t * (h - 1)) * T; }
      const d = U.dist(x, y, c.x, c.y);
      if (d < 500 || d > 1300 || this.inView(x, y, 60)) continue;
      if (MAP.solidAt(x, y)) continue;
      const cop = Math.random() < 0.07;
      const p = new Person(x, y, cop ? 'cop' : 'ped');
      G.peds.push(p);
      return;
    }
  },
  spawnParked() {
    for (const s of MAP.boatSpots) { const b = new Vehicle('bangka', s.x, s.y, s.a, { parked: true, color: U.choice(['#2e86c1', '#c0392b', '#16a085', '#f1c40f']) }); b.keep = true; G.vehicles.push(b); }
    for (const s of MAP.spots) {
      if (s.depot) continue;
      let type;
      if (s.type === 'jeep') type = 'jeepney';
      else if (s.type === 'bus') type = 'bus';
      else if (s.type === 'police') type = 'police';
      else { if (Math.random() < 0.35) continue; type = U.choice(['sedan', 'sedan', 'hatch', 'suv', 'van', 'taxi', 'sports', 'motor', 'tricycle', 'pickup', 'bigbike', 'ebike', 'bisikleta', 'supercar']); }
      if ((type === 'sports' || type === 'supercar') && Math.random() < 0.5) type = 'sedan';
      const v = new Vehicle(type, s.x, s.y, s.a, { parked: true });
      v.keep = true;
      G.vehicles.push(v);
    }
  },
};
