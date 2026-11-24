'use strict';
// ===== Side jobs: Food Rider, Taxi, Tow, Underground Race, Vigilante =====
const EATERIES = ['Lutong Bahay ni Aling Bining', 'Inasal sa Kanto', 'Lugawan 24/7', 'Siomai House ni Ah Beng', 'Pares ni Mang Dado', 'Tapsihan sa Tondo', 'Bilao Pancit Express'];
const JOB_NAMES = { rider: '🛵 Food Rider', taxi: '🚕 Taxi', tow: '🛻 Tow Truck', race: '🏁 Underground Race', vigil: '🚨 Pulis Vigilante', medic: '🚑 Paramedic', fire: '🚒 Bumbero', garbage: '🗑 Basurero', rescue: '🌀 Rescue' };

function racePath(startI, startJ, n) {
  const path = [[startI, startJ]], seen = new Set([startI + ',' + startJ]);
  let i = startI, j = startJ, pd = -1;
  for (let k = 0; k < n * 4 && path.length <= n; k++) {
    const opts = [];
    for (let d = 0; d < 4; d++) {
      if (d === (pd + 2) % 4 || !MAP.segOK(i, j, d)) continue;
      let ni = i + DIRS[d][0], nj = j + DIRS[d][1];
      // go 1-2 nodes straight for longer stretches
      if (Math.random() < 0.5 && MAP.segOK(ni, nj, d)) { ni += DIRS[d][0]; nj += DIRS[d][1]; }
      if (!seen.has(ni + ',' + nj)) opts.push([d, ni, nj]);
    }
    if (!opts.length) break;
    const [d, ni, nj] = U.choice(opts);
    // add intermediate node if we skipped one
    if (Math.abs(ni - i) + Math.abs(nj - j) === 2) path.push([i + DIRS[d][0], j + DIRS[d][1]]);
    path.push([ni, nj]); seen.add(ni + ',' + nj); i = ni; j = nj; pd = d;
  }
  return path.slice(1).map(([a, b]) => ({ x: MAP.cx(a), y: MAP.cy(b) }));
}
// shared racer AI (used by race job)
function driveRacer(r, cp, next, ahead, dt, st) {
  const d = U.dist(r.x, r.y, cp.x, cp.y);
  const desired = Math.atan2(cp.y - r.y, cp.x - r.x), diff = U.angDiff(r.a, desired);
  const turn = next ? Math.abs(U.angDiff(desired, Math.atan2(next.y - cp.y, next.x - cp.x))) : 0;
  const fs = r.fwd();
  let tgt = 640 * r.skill * (ahead > 600 ? 0.85 : ahead < -900 ? 1.06 : 1);
  if (turn > 0.8 && d < 300) tgt = 300;
  if (Math.abs(diff) > 0.6) tgt = Math.min(tgt, 240);
  r.steer = U.clamp(diff * 2.5, -1, 1); r.throttle = fs < tgt ? 1 : -0.6; r.hand = Math.abs(diff) > 1.2 && fs > 280;
  st.t = Math.abs(fs) < 20 ? st.t + dt : 0;
  if (st.t > 1.5) { r.throttle = -1; r.steer = -Math.sign(diff); if (st.t > 2.4) st.t = 0; }
  return d;
}

const JOBS = {
  active: null, c: null,
  avail() {
    const P = G.player, v = P.vehicle;
    if (this.active || MS.active || !v || v.dead) return null;
    if (TYPHOON.storm() && RESCUE_CAP[v.type]) return 'rescue';
    if (v.type === 'taxi') return 'taxi';
    if (v.type === 'tow') return 'tow';
    if (v.type === 'ambulance') return 'medic';
    if (v.type === 'firetruck') return 'fire';
    if (v.type === 'garbage') return 'garbage';
    if (v.rider) return 'rider';
    if (v.isCop && !v.t.boat) return 'vigil';
    return null;
  },
  toggle() {
    if (this.active) { this.stop('Tinapos mo ang trabaho.'); return; }
    const t = this.avail();
    if (t) this.start(t);
    else UI.toast('💼 Walang trabaho dito. Sumakay sa taxi, police car, o kumuha ng motor sa 🛵 Rider Hub / tow truck sa 🛻 Impound.');
  },
  start(type, opt = {}) {
    const v = G.player.vehicle;
    if (type === 'vigil' && WANTED.stars > 0) { UI.toast('Wanted ka pa! Iwala muna ang pulis bago mag-vigilante.'); return; }
    PASADA.reset();
    this.active = type; this.c = Object.assign({ v, n: 0, earned: 0, stage: null }, opt);
    UI.big(JOB_NAMES[type].toUpperCase(), 'Side job · J / 💼 para tumigil', 1.8);
    AUD.checkpoint();
    if (type === 'vigil') { v.siren = true; this.c.level = 1; }
    if (type === 'race') this.setupRace();
  },
  stop(msg, good) {
    const c = this.c || {};
    if (c.v && this.active === 'vigil') c.v.siren = false;
    if (this.active === 'garbage') { MAP.trash = null; if (c.v) c.v.cargo = 0; }
    for (const k of ['waiting', 'riders']) if (c[k]) removePeds(c[k]);
    if (c.towed) { c.towed.towedBy = null; c.towed.remove = true; }
    if (c.target) { c.target.mission = false; c.target.criminal = false; }
    if (c.illegal && !c.towed) c.illegal.remove = true;
    if (c.rivals) for (const r of c.rivals) { r.mission = false; r.driver = 'ai'; r.ai = new RoadDriver(r); }
    if (msg) UI.toast(`${JOB_NAMES[this.active]}: ${msg}${c.earned ? ` (Kinita: ${U.money(c.earned)})` : ''}`);
    this.active = null; this.c = null;
    SAVE.auto();
  },
  pay(n, why) { n = Math.round(n); G.addMoney(n, true); this.c.earned += n; UI.toast(`${why} +${U.money(n)}`); },
  // generic: stop near a point for a moment
  stopped(pt, r, hold = 0.7) {
    const v = this.c.v;
    if (!pt || U.dist(v.x, v.y, pt.x, pt.y) > r || v.speed > 60) { this.c.h = 0; return false; }
    this.c.h = (this.c.h || 0) + G.dt; return this.c.h > hold;
  },
  update(dt) {
    if (!this.active) return;
    const c = this.c, P = G.player;
    if (MS.active && this.active !== 'race') { this.stop('Natigil dahil sa misyon.'); return; }
    if (P.vehicle !== c.v) {
      c.out = (c.out || 0) + dt;
      if (c.out > (this.active === 'race' ? 3 : 8) || c.v.dead || c.v.remove) { this.stop(this.active === 'race' ? 'Bumaba ka — talo ang pusta.' : 'Iniwan mo ang sasakyan.'); return; }
    } else c.out = 0;
    this['u_' + this.active](dt, c);
  },
  objText() {
    if (!this.active) return '';
    const c = this.c;
    if (G.player.vehicle !== c.v) return `${JOB_NAMES[this.active]}: Bumalik sa sasakyan!`;
    return `${JOB_NAMES[this.active]}: ${c.obj || ''}`;
  },
  target() {
    if (!this.active) return null;
    const c = this.c;
    if (G.player.vehicle !== c.v) return c.v;
    return c.tgt || null;
  },
  // ---------- TAXI ----------
  u_taxi(dt, c) {
    if (!c.stage) {
      const pt = PASADA.randomStop(450, 1300); if (!pt) return;
      c.pt = pt; c.stage = 'pick'; c.waiting = [];
      const p = new Person(pt.x, pt.y, 'ped'); p.npc = true; p.state = 'idle'; p.keep = true; G.peds.push(p); c.waiting.push(p);
    }
    if (c.stage === 'pick') {
      c.obj = 'Sunduin ang pasahero'; c.tgt = Object.assign({ stop: true }, c.pt);
      if (this.stopped(c.pt, 100)) {
        removePeds(c.waiting); c.waiting = null;
        c.dest = PASADA.randomStop(1200, 3000) || PASADA.randomStop(600, 4000);
        c.sx = c.v.x; c.sy = c.v.y; c.time = Math.round(U.dist(c.sx, c.sy, c.dest.x, c.dest.y) / 230 + 20);
        c.stage = 'drop'; AUD.door(); UI.say([['Pasahero', U.choice(['Boss, pakibilis lang, late na ako!', 'Kuya, diretso lang po tayo.', 'Taxi! Sa may ' + (MAP.labels[U.randi(0, 8)].name) + ' po.', 'May bayad ba yung aircon? Joke lang!'])]]);
      }
    } else {
      c.time -= dt;
      c.obj = `Ihatid ang pasahero ⏱ ${Math.max(0, Math.ceil(c.time))}s`; c.tgt = Object.assign({ stop: true }, c.dest);
      if (this.stopped(c.dest, 110)) {
        const d = U.dist(c.sx, c.sy, c.dest.x, c.dest.y);
        this.pay(45 + d / 22 + Math.max(0, c.time) * 4, c.time > 0 ? '🚕 Bayad + tip!' : '🚕 Bayad (late, walang tip).');
        G.stats.taxi = (G.stats.taxi || 0) + 1; c.stage = null; c.n++;
      }
    }
  },
  // ---------- FOOD RIDER ----------
  u_rider(dt, c) {
    if (!c.stage) {
      c.shop = PASADA.randomStop(500, 1500); if (!c.shop) return;
      c.shopName = U.choice(EATERIES); c.stage = 'pick';
    }
    if (c.stage === 'pick') {
      c.obj = `Kunin ang order sa ${c.shopName} (${c.n}/5)`; c.tgt = Object.assign({ stop: true }, c.shop);
      if (this.stopped(c.shop, 90, 0.5)) {
        c.dest = PASADA.randomStop(800, 2200) || PASADA.randomStop(500, 3500);
        c.time = Math.round(U.dist(c.shop.x, c.shop.y, c.dest.x, c.dest.y) / 300 + 18); c.stage = 'drop';
        AUD.coin(); UI.toast('🥡 Nakuha ang order! Mainit pa — bilisan!');
      }
    } else {
      c.time -= dt;
      c.obj = `Ihatid ang pagkain ⏱ ${Math.max(0, Math.ceil(c.time))}s (${c.n}/5)`; c.tgt = Object.assign({ stop: true }, c.dest);
      if (this.stopped(c.dest, 90, 0.5)) {
        const d = U.dist(c.shop.x, c.shop.y, c.dest.x, c.dest.y);
        c.n++; G.stats.rider = (G.stats.rider || 0) + 1;
        this.pay(40 + d / 30 + Math.max(0, c.time) * 5, c.time > 0 ? '🛵 Delivered! May tip' : '🛵 Delivered (late)');
        c.stage = null;
        if (c.n >= 5) { this.pay(400, '⭐ Shift bonus!'); this.stop('Tapos ang shift! Salamat, rider!'); }
      }
    }
  },
  // ---------- TOW ----------
  u_tow(dt, c) {
    const v = c.v;
    if (!c.stage) {
      for (let k = 0; k < 20; k++) {
        const i = U.randi(0, NR - 2), j = U.randi(0, NR - 1);
        if (!MAP.segOK(i, j, 0)) continue;
        const x = U.lerp(MAP.cx(i), MAP.cx(i + 1), 0.35 + Math.random() * 0.3), y = MAP.laneY(j, 0) + 10;
        const d = U.dist(x, y, v.x, v.y);
        if (d < 600 || d > 1800 || TRAFFIC.inView(x, y, 80)) continue;
        c.illegal = new Vehicle(U.choice(['sedan', 'hatch', 'suv', 'van']), x, y, 0, { parked: true }); c.illegal.keep = true; c.illegal.mission = true; G.vehicles.push(c.illegal);
        c.stage = 'hook'; break;
      }
      return;
    }
    if (c.stage === 'hook') {
      const car = c.illegal;
      c.obj = 'Hilahin ang illegal na nakaparadang sasakyan (huminto sa harap nito)'; c.tgt = car;
      const rx = v.x - Math.cos(v.a) * v.L / 2, ry = v.y - Math.sin(v.a) * v.L / 2;
      if (car.driver || car.remove) { c.stage = null; return; }
      if (v.speed < 50 && U.dist(rx, ry, car.x, car.y) < car.L / 2 + 50) {
        c.h = (c.h || 0) + dt;
        if (c.h > 0.6) { car.towedBy = v; car.parked = false; c.towed = car; c.stage = 'deliver'; c.h = 0; AUD.tone(200, 0.4, 'sawtooth', 0.06, 120); UI.toast('🛻 Nakakabit na! Dalhin sa Impound.'); }
      } else c.h = 0;
    } else {
      c.obj = 'Dalhin ang sasakyan sa Impound Lot'; c.tgt = Object.assign({ stop: true }, MAP.pois.towyard);
      if (this.stopped(MAP.pois.towyard, 150, 0.6)) {
        c.towed.towedBy = null; c.towed.remove = true; c.towed = null; c.illegal = null;
        G.stats.tow = (G.stats.tow || 0) + 1; c.n++;
        this.pay(220 + c.n * 20, '🛻 Na-impound!'); c.stage = null;
      }
    }
  },
  // ---------- VIGILANTE ----------
  u_vigil(dt, c) {
    if (WANTED.stars > 0) { this.stop('Wanted ka — tapos ang vigilante.'); return; }
    if (!c.stage) {
      c.wait = (c.wait || 0) - dt; if (c.wait > 0) { c.obj = 'Naghihintay ng tawag sa radyo...'; c.tgt = null; return; }
      for (let k = 0; k < 20; k++) {
        const i = U.randi(0, NR - 1), j = U.randi(0, NR - 1), d = U.randi(0, 3);
        if (!MAP.segOK(i, j, d)) continue;
        const D = DIRS[d];
        const x = D[0] ? U.lerp(MAP.cx(i), MAP.cx(i + D[0]), 0.5) : MAP.laneX(i, d), y = D[0] ? MAP.laneY(j, d) : U.lerp(MAP.cy(j), MAP.cy(j + D[1]), 0.5);
        const dist = U.dist(x, y, c.v.x, c.v.y);
        if (dist < 800 || dist > 1500 || TRAFFIC.inView(x, y, 80)) continue;
        const t = new Vehicle(U.choice(c.level > 2 ? ['sports', 'suv'] : ['sedan', 'hatch', 'suv']), x, y, Math.atan2(D[1], D[0]));
        t.driver = 'ai'; t.mission = true; t.criminal = true;
        t.ai = new RoadDriver(t, { cruise: 330 + c.level * 25, ignoreLights: true, ignorePlayer: true });
        G.vehicles.push(t); c.target = t; c.stage = 'chase'; c.far = 0; c.time = 120;
        UI.radio(`📻 PULIS RADYO: "May carnapper sa ${MAP.labels[U.randi(0, MAP.labels.length - 2)].name}! Level ${c.level}"`, 4);
        AUD.star(); break;
      }
      return;
    }
    const t = c.target;
    c.time -= dt;
    c.obj = `Habulin at banggain ang carnapper! (${Math.max(0, Math.round((t.hp - t.maxhp * 0.35) / (t.maxhp * 0.65) * 100))}%) ⏱ ${Math.ceil(c.time)}s`; c.tgt = t;
    if (t.hp <= t.maxhp * 0.35 && t.driver) {
      t.invuln = true; t.ai = null; t.driver = null; t.throttle = 0; t.hand = true; t.mission = false; t.criminal = false;
      G.stats.vigil = (G.stats.vigil || 0) + 1; this.pay(250 + c.level * 150, `🦸 Nahuli ang carnapper (Level ${c.level})!`);
      c.level++; c.stage = null; c.wait = 3; c.target = null; return;
    }
    if (t.hp < t.maxhp * 0.45) t.invuln = false;
    const d = U.dist(c.v.x, c.v.y, t.x, t.y);
    if (d > 1700) c.far += dt; else c.far = 0;
    if (c.far > 8 || c.time <= 0 || t.remove) { t.mission = false; t.criminal = false; UI.toast('💨 Nakatakas ang carnapper!'); c.stage = null; c.wait = 4; c.target = null; }
  },
  // ---------- UNDERGROUND RACE ----------
  raceLabel() {
    const h = WORLD.hour(), v = G.player.vehicle;
    if (!(h >= 20 || h < 4)) return 'Underground Race — bumalik ng gabi (8 PM – 4 AM)';
    if (!v) return 'Underground Race — kailangan mo ng sasakyan';
    return `Underground Race — pusta ${U.money(this.bet())}, panalo x2`;
  },
  bet() { return Math.max(0, Math.min(1000, Math.floor(G.player.money / 100) * 100)); },
  raceStart() {
    const h = WORLD.hour(), v = G.player.vehicle;
    if (!(h >= 20 || h < 4)) { UI.toast('🌙 Gabi lang ang karera (8 PM – 4 AM). Hintayin ang gabi.'); return; }
    if (!v || v.t.boat || ['bus', 'jeepney', 'tricycle'].includes(v.type)) { UI.toast('Kailangan ng kotse o motor para sa karera.'); return; }
    if (WANTED.stars > 0) { UI.toast('May humahabol na pulis — walang karera!'); return; }
    if (this.active || MS.active) { UI.toast('Tapusin muna ang ginagawa mo.'); return; }
    const bet = this.bet();
    if (bet < 200) { UI.toast('Kailangan ng hindi bababa sa ₱200 na pusta.'); return; }
    G.addMoney(-bet);
    this.start('race', { bet });
  },
  setupRace() {
    const c = this.c, v = c.v;
    const [i, j] = MAP.nearestNode(v.x, v.y);
    c.cps = racePath(i, j, 9);
    const a0 = Math.atan2(c.cps[0].y - v.y, c.cps[0].x - v.x);
    c.rivals = [];
    for (const [k, col] of [[0, '#e84393'], [1, '#16a085']]) {
      let x = v.x - Math.cos(a0) * (90 + k * 70) - Math.sin(a0) * (k ? -36 : 36), y = v.y - Math.sin(a0) * (90 + k * 70) + Math.cos(a0) * (k ? -36 : 36);
      if (MAP.solidAt(x, y)) { x = v.x - Math.cos(a0) * (100 + k * 80); y = v.y - Math.sin(a0) * (100 + k * 80); }
      const r = new Vehicle('sports', x, y, a0, { color: col }); r.driver = 'ai'; r.mission = true; r.skill = k ? 0.86 : 0.92; r.ri = 0; r.st = { t: 0 };
      G.vehicles.push(r); c.rivals.push(r);
    }
    v.a = a0; c.cd = 3.5; c.last = 4; c.pi = 0; c.stage = 'count';
  },
  u_race(dt, c) {
    const v = c.v;
    if (c.stage === 'count') {
      c.cd -= dt; c.obj = 'Humanda...'; c.tgt = c.cps[0];
      for (const r of [v, ...c.rivals]) { r.vx = 0; r.vy = 0; }
      const n = Math.ceil(c.cd);
      if (n !== c.last && n > 0) { c.last = n; UI.big(String(n), '', 0.8); AUD.beep(); }
      if (c.cd <= 0) { UI.big('GO!', '', 0.8); AUD.tone(1600, 0.4, 'square', 0.1); c.stage = 'race'; }
      return;
    }
    const prog = (idx, o) => idx * 10000 - U.dist(o.x, o.y, c.cps[Math.min(idx, c.cps.length - 1)].x, c.cps[Math.min(idx, c.cps.length - 1)].y);
    const pp = prog(c.pi, v);
    if (U.dist(v.x, v.y, c.cps[c.pi].x, c.cps[c.pi].y) < 120) { c.pi++; AUD.checkpoint(); if (c.pi >= c.cps.length) { G.stats.races = (G.stats.races || 0) + 1; this.pay(c.bet * 2, '🏁 PANALO sa karera!'); UI.big('PANALO!', `+${U.money(c.bet * 2)}`, 2, 'good'); this.stop(''); return; } }
    let pos = 1;
    for (const r of c.rivals) {
      if (r.dead) continue;
      if (r.ri >= c.cps.length) { pos++; continue; }
      const cp = c.cps[r.ri], nx = c.cps[r.ri + 1];
      const rp = prog(r.ri, r); if (rp > pp) pos++;
      if (driveRacer(r, cp, nx, rp - pp, dt, r.st) < 110) r.ri++;
      if (r.ri >= c.cps.length) { UI.big('TALO!', `Naunahan ka. −${U.money(c.bet)}`, 2.2, 'bad'); AUD.fail(); this.stop(''); return; }
    }
    c.obj = `Checkpoint ${c.pi + 1}/${c.cps.length} · Posisyon ${pos}/3 · Pusta ${U.money(c.bet)}`;
    c.tgt = Object.assign({ cp: true, n: c.pi + 1 }, c.cps[c.pi]);
  },
};

// ===== v1.7 emergency & city jobs: Paramedic, Bumbero, Basurero + vehicle depots =====
Object.assign(JOBS, {
  // ---------- PARAMEDIC ----------
  u_medic(dt, c) {
    if (!c.stage) {
      const pt = PASADA.randomStop(500, 1600); if (!pt) return;
      c.pt = pt; c.stage = 'pick'; c.waiting = [];
      const p = new Person(pt.x, pt.y, 'ped'); p.npc = true; p.keep = true; p.state = 'down'; p.downT = 1e9; p.umb = null; G.peds.push(p); c.waiting.push(p);
      const f = new Person(pt.x + 22, pt.y + 6, 'ped'); f.npc = true; f.keep = true; f.state = 'idle'; f.umb = null; G.peds.push(f); c.waiting.push(f);
      UI.toast('📻 May nasaktan! Puntahan agad.');
    }
    if (c.stage === 'pick') {
      c.obj = `Puntahan ang pasyente (${c.n}/5)`; c.tgt = Object.assign({ stop: true }, c.pt);
      if (this.stopped(c.pt, 110, 1)) {
        removePeds(c.waiting); c.waiting = null; AUD.door();
        c.time = Math.round(U.dist(c.pt.x, c.pt.y, MAP.pois.hospital.x, MAP.pois.hospital.y) / 260 + 22); c.stage = 'drop';
        UI.toast('🚑 Naisakay ang pasyente! Dalhin sa Ospital — buksan ang sirena (H / BUSINA).');
      }
    } else {
      c.time -= dt;
      c.obj = `Dalhin sa Ospital ⏱ ${Math.max(0, Math.ceil(c.time))}s (${c.n}/5)`; c.tgt = Object.assign({ stop: true }, MAP.pois.hospital);
      if (c.time <= 0) { UI.toast('😞 Hindi umabot ang pasyente...'); c.stage = null; return; }
      if (this.stopped(MAP.pois.hospital, 160, 0.8)) {
        c.n++; G.stats.medic = (G.stats.medic || 0) + 1;
        this.pay(150 + c.time * 6 * (c.v.siren ? 1.2 : 1), '🚑 Ligtas ang pasyente!'); c.stage = null;
        if (c.n >= 5) { this.pay(600, '⭐ Bayani ng Ospital!'); this.stop('Tapos ang shift!'); }
      }
    }
  },
  // ---------- BUMBERO ----------
  u_fire(dt, c) {
    const v = c.v;
    if (!c.stage) {
      const pt = PASADA.randomStop(600, 1800); if (!pt) return;
      c.fire = { x: pt.x, y: pt.y, hp: 100 }; c.time = Math.round(U.dist(v.x, v.y, pt.x, pt.y) / 220 + 30); c.stage = 'go';
      UI.toast('📻 SUNOG! May nasusunog na bahay — bilisan!');
    }
    const f = c.fire;
    if (f && G.frame % 3 === 0 && U.d2(f.x, f.y, G.cam.x, G.cam.y) < 1400 * 1400) {
      const k = f.hp / 100;
      if (Math.random() < 0.4 + k) G.particle('fire', f.x + U.rand(-40, 40) * k, f.y + U.rand(-30, 10) * k);
      G.particle('smoke', f.x + U.rand(-30, 30), f.y + U.rand(-20, 0));
    }
    c.time -= dt;
    c.obj = `Patayin ang sunog! 🔥 ${Math.ceil(f.hp)}% ⏱ ${Math.max(0, Math.ceil(c.time))}s (${c.n}/5) — huminto malapit`;
    c.tgt = Object.assign({ stop: true }, f);
    if (c.time <= 0) { UI.toast('🔥 Lumaki ang sunog... may ibang bumbero na dumating.'); c.fire = null; c.stage = null; return; }
    const d = U.dist(v.x, v.y, f.x, f.y);
    if (d < 190 && v.speed < 70 && P_IN(v)) {
      f.hp -= dt * 22;
      if (G.frame % 2 === 0) {
        const a = Math.atan2(f.y - v.y, f.x - v.x) + U.rand(-0.12, 0.12), sx = v.x + Math.cos(v.a) * v.L * 0.3, sy = v.y + Math.sin(v.a) * v.L * 0.3;
        G.projectiles.push({ x: sx, y: sy, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, life: Math.min(0.5, d / 460), type: 'water', owner: 'hose' });
      }
      if (G.frame % 8 === 0) AUD.noise(0.12, 0.05, 3000, 0, 'highpass');
      if (f.hp <= 0) {
        for (let k = 0; k < 12; k++) G.particle('smoke', f.x + U.rand(-40, 40), f.y + U.rand(-30, 10));
        c.n++; G.stats.fire = (G.stats.fire || 0) + 1;
        this.pay(250 + Math.max(0, c.time) * 5, '🚒 Napatay ang sunog!'); c.fire = null; c.stage = null;
        if (c.n >= 5) { this.pay(800, '⭐ Bumbero ng Taon!'); this.stop('Tapos ang shift!'); }
      }
    }
  },
  // ---------- BASURERO ----------
  u_garbage(dt, c) {
    const v = c.v;
    if (!c.stage) {
      c.piles = []; let from = { x: v.x, y: v.y };
      for (let k = 0; k < 6; k++) {
        let pt = null;
        for (let t = 0; t < 30 && !pt; t++) { const q = PASADA.randomStop(300, 2400); if (q && U.dist(q.x, q.y, from.x, from.y) > 280 && U.dist(q.x, q.y, from.x, from.y) < 1100) pt = q; }
        if (!pt) break;
        c.piles.push({ x: pt.x, y: pt.y, seed: Math.random() * 100 }); from = pt;
      }
      if (!c.piles.length) return;
      c.stage = 'collect'; c.pi = 0; v.cargo = 0; c.time = 150;
      MAP.trash = c.piles;
    }
    c.time -= dt;
    if (c.stage === 'collect') {
      const p = c.piles[c.pi];
      c.obj = `Kolektahin ang basura (${c.pi}/${c.piles.length}) ⏱ ${Math.max(0, Math.ceil(c.time))}s`; c.tgt = Object.assign({ stop: true }, p);
      if (this.stopped(p, 120, 1.2)) {
        p.done = true; c.pi++; v.cargo = c.pi; AUD.noise(0.4, 0.15, 500); this.pay(70, '🗑 Nakolekta!');
        if (c.pi >= c.piles.length) { c.stage = 'dump'; }
      }
    } else {
      c.obj = `Itapon sa Tambakan ⏱ ${Math.max(0, Math.ceil(c.time))}s`; c.tgt = Object.assign({ stop: true }, MAP.pois.dump);
      if (this.stopped(MAP.pois.dump, 170, 0.8)) {
        G.stats.garbage = (G.stats.garbage || 0) + 1; v.cargo = 0; MAP.trash = null;
        this.pay(250 + Math.max(0, c.time) * 3, '♻️ Malinis ang kalye!'); c.stage = null;
      }
    }
    if (c.time <= 0) { MAP.trash = null; this.stop('Naubos ang oras ng ruta.'); }
  },
  // parked emergency/city vehicles keep coming back to their depots
  depotT: 0,
  depots() {
    if (!this.dl) this.dl = [['ambulance', MAP.pois.depot_amb], ['firetruck', MAP.pois.depot_fire], ['garbage', MAP.pois.dump]].filter(d => d[1]);
    return this.dl;
  },
  depotTick(dt) {
    this.depotT -= dt; if (this.depotT > 0) return; this.depotT = 3;
    const P = G.player;
    for (const [type, p] of this.depots()) {
      if (G.vehicles.some(v => v.type === type && U.d2(v.x, v.y, p.vx, p.vy) < 200 * 200)) continue;
      if (TRAFFIC.inView(p.vx, p.vy, 80) || U.dist(P.x, P.y, p.vx, p.vy) < 500) continue;
      if (G.vehicles.some(v => U.d2(v.x, v.y, p.vx, p.vy) < 70 * 70)) continue;
      const v = new Vehicle(type, p.vx, p.vy, p.va, { parked: true }); v.keep = true; G.vehicles.push(v);
    }
  },
  drawExtra(g, inV, now) {
    if (MAP.trash) for (const p of MAP.trash) {
      if (p.done || !inV(p.x, p.y, 40)) continue;
      for (let k = 0; k < 5; k++) { g.fillStyle = ['#2b2b2b', '#4a6fa5', '#7a5230', '#3c763d', '#555'][k]; g.beginPath(); g.arc(p.x + Math.cos(p.seed + k * 2) * 12, p.y + Math.sin(p.seed + k * 1.3) * 9, 7, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(120,140,60,0.25)'; g.beginPath(); g.arc(p.x, p.y - 14 - Math.sin(now * 3) * 3, 6, 0, TAU); g.fill();
    }
  },
});
function P_IN(v) { return G.player.vehicle === v; }
