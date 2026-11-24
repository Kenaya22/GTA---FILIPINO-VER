'use strict';
// ===== Main game =====
const SAVE_KEY = 'harinkalsada_v1';

const G = {
  started: false, paused: false, cutscene: false, time: 0, dt: 1 / 60, frame: 0,
  vehicles: [], peds: [], pickups: [], particles: [], skids: [], projectiles: [],
  cam: { x: 0, y: 0, zoom: 1, vw: 1000, vh: 1000, shake: 0, sx: 0, sy: 0 },
  unlock: { sports: false, gold: false }, tsinelas: new Set(), stats: { sold: 0, pasada: 0, escapes: 0, earned: 0, taxi: 0, rider: 0, tow: 0, races: 0, vigil: 0 },
  copField: null, walkField: null, gpsField: null, gpsPath: null, target: null,
  fieldT: 0, walkT: 0, gpsT: 0, gpsKey: '', ramCd: 0, nearVeh: null, shopNear: null, lightMul: 1,

  boot() {
    SETTINGS.load();
    SAVE.migrate();
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    addEventListener('resize', () => this.resize());
    this.resize();
    MAP.gen();
    this.copField = new Uint16Array(MW * MH);
    this.walkField = new Uint16Array(MW * MH);
    this.gpsField = new Uint16Array(MW * MH);
    this.makeSprites();
    this.player = new Player(MAP.pois.busterm.x, MAP.pois.busterm.y);
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    UI.init();
    SETTINGS.apply();
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  },
  resize() {
    this.dpr = SETTINGS.quality === 'low' ? 1 : Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(innerWidth * this.dpr);
    this.canvas.height = Math.floor(innerHeight * this.dpr);
  },
  makeSprites() {
    const mk = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; };
    const radial = (col) => mk(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    this.sprites = {
      lamp: radial('rgba(255,196,110,0.42)'),
      red: radial('rgba(255,40,40,0.9)'),
      blue: radial('rgba(50,110,255,0.9)'),
      white: radial('rgba(255,255,240,0.7)'),
      fire: radial('rgba(255,140,40,0.8)'),
      gold: radial('rgba(255,210,60,0.8)'),
      green: radial('rgba(60,255,120,0.85)'),
      cone: mk(240, 150, (g, w, h) => {
        const gr = g.createRadialGradient(0, h / 2, 0, 0, h / 2, w);
        gr.addColorStop(0, 'rgba(255,240,200,0.55)'); gr.addColorStop(0.6, 'rgba(255,235,190,0.15)'); gr.addColorStop(1, 'rgba(255,235,190,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, h / 2 - 10); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(0, h / 2 + 10); g.closePath(); g.fill();
      }),
    };
  },

  // ---------- game lifecycle ----------
  hasSave() { return !!SAVE.latest(); },
  save() { if (this.started) SAVE.write('auto', true); },
  resetWorld() {
    this.vehicles = []; this.peds = []; this.pickups = []; this.particles = []; this.skids = []; this.projectiles = [];
    if (JOBS.active) { JOBS.active = null; JOBS.c = null; }
    WANTED.reset(); WANTED.helis = []; MS.reset(); PASADA.reset(); WORLD.reset();
    this.player = new Player(0, 0);
    ECON.owned = new Set(); ECON.garage = []; ECON.refreshIcons(); ACH.got = new Set(); ACH.visited = new Set(); ACH.drove = new Set();
    TRAFFIC.spawnParked();
  },
  beginPlay() {
    this.started = true; this.paused = false;
    UI.hide('title'); UI.show('hud');
    if (INPUT.touch) UI.show('touch');
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    // pre-render chunks around player
    const cs = MAP.CH, cx = Math.floor(this.player.x / cs), cy = Math.floor(this.player.y / cs);
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) MAP.getChunk(x, y, true);
    this.cam.vw = innerWidth; this.cam.vh = innerHeight;
    for (let k = 0; k < 40; k++) { TRAFFIC.spawnCar(); TRAFFIC.spawnPed(); }
  },
  newGame() {
    this.resetWorld();
    this.tsinelas = new Set(); this.stats = { sold: 0, pasada: 0, escapes: 0, earned: 0, taxi: 0, rider: 0, tow: 0, races: 0, vigil: 0 }; this.unlock = { sports: false, gold: false };
    const b = MAP.pois.busterm;
    this.player.x = b.x; this.player.y = b.y - 40; this.player.a = -Math.PI / 2; this.player.money = 200;
    // a tricycle to borrow
    const tr = new Vehicle('tricycle', b.x + 70, b.y - 10, -Math.PI / 2, { color: '#2e86c1' }); tr.keep = true;
    this.vehicles.push(tr);
    this.beginPlay();
    UI.big('HARI NG KALSADA', 'Maynila', 2.5);
    MS.start(0);
    this.save();
  },
  continueGame() {
    const l = SAVE.latest();
    if (!l) return this.newGame();
    SAVE.apply(l.data);
  },
  spawnHomeCars() {
    const h = MAP.pois.home;
    const want = [];
    if (this.unlock.sports) want.push(['homeSports', '#f28c28']);
    if (this.unlock.gold) want.push(['homeGold', '#d4af37']);
    want.forEach(([tag, col], i) => {
      if (this.vehicles.some(v => v[tag] && !v.burnt && U.dist(v.x, v.y, h.x, h.y) < 1500)) return;
      const v = new Vehicle('sports', h.x - 120 - i * 80, MAP.laneY(2, 0), 0, { color: col });
      v[tag] = true; v.keep = true; if (tag === 'homeGold') { v.t = Object.assign({}, v.t, { max: 780, acc: 780 }); v.maxhp = v.hp = 150; }
      this.vehicles.push(v);
    });
  },
  pause(v) {
    if (!this.started) return;
    this.paused = v;
    if (v) UI.openPause(); else { UI.hide('pause'); UI.hide('mapscreen'); UI.hide('missions'); UI.hide('help'); }
    AUD.engine(false, 0); AUD.siren(0); AUD.heli(0);
  },

  // ---------- input actions ----------
  onKey(code) {
    if (!this.started) return;
    if (code === 'Escape' || code === 'KeyP') {
      if (!document.getElementById('mapscreen').classList.contains('hidden') && document.getElementById('pause').classList.contains('hidden')) { UI.hide('mapscreen'); this.paused = false; return; }
      return this.pause(!this.paused);
    }
    if (code === 'KeyM') {
      if (document.getElementById('mapscreen').classList.contains('hidden')) UI.openMap();
      else { UI.hide('mapscreen'); if (document.getElementById('pause').classList.contains('hidden')) this.paused = false; }
      return;
    }
    if (this.paused) return;
    if (code === 'KeyE' || code === 'KeyF' || code === 'Enter') this.action();
    else if (code === 'Space') { if (UI.talking) UI.nextLine(); else if (!this.player.vehicle) ARMS.attack(); }
    else if (code === 'KeyH') this.horn();
    else if (code === 'KeyR') MUSIC.nextStation();
    else if (code === 'KeyQ') { if (!this.player.vehicle) ARMS.cycle(); }
    else if (code === 'KeyJ') JOBS.toggle();
  },
  action() {
    if (!this.started || this.paused || this.cutscene || this.player.downed) return;
    if (UI.talking) { UI.nextLine(); return; }
    if (MS.canRetry()) { MS.retry(); return; }
    const vend = WORLD.nearVendor(); if (vend) { WORLD.buy(vend); return; }
    if (MS.canStart()) { MS.start(MS.idx); return; }
    const shop = SHOP.near();
    if (shop && SHOP.label(shop)) { SHOP.use(shop); return; }
    if (this.player.vehicle) { this.exitVehicle(false); return; }
    if (this.nearVeh) this.enterVehicle(this.nearVeh);
  },
  horn() {
    const v = this.player.vehicle; if (!v) return;
    AUD.horn(v.isBig(), v.upg && v.upg.horn);
    const ca = Math.cos(v.a), sa = Math.sin(v.a);
    for (const p of this.peds) {
      if (p.npc || p.kind === 'cop' || p.state === 'down') continue;
      const dx = p.x - v.x, dy = p.y - v.y;
      if (dx * dx + dy * dy < 220 * 220 && dx * ca + dy * sa > 0) { p.state = 'flee'; p.fleeT = 1.5; p.tx = v.x; p.ty = v.y; }
    }
  },
  findNearVehicle() {
    const P = this.player;
    let best = null, bd = 1e9;
    for (const v of this.vehicles) {
      if (v.burnt || v.driver === 'player') continue;
      const dx = P.x - v.x, dy = P.y - v.y;
      if (Math.abs(dx) > 140 || Math.abs(dy) > 140) continue;
      const ca = Math.cos(v.a), sa = Math.sin(v.a);
      const fx = dx * ca + dy * sa, fy = -dx * sa + dy * ca;
      if (Math.abs(fx) < v.L / 2 + 26 && Math.abs(fy) < v.W / 2 + 26) {
        const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = v; }
      }
    }
    return best;
  },
  enterVehicle(v) {
    const P = this.player;
    if (v.dead) { UI.toast('Sira na yan, nasusunog!'); return; }
    if (v.driver === 'ai' || v.driver === 'cop') {
      this.ejectDriver(v);
      WANTED.crime(v.isCop ? 3 : 1, v.x, v.y);
      this.panic(v.x, v.y, 220);
    } else if (v.parked && !v.mission && Math.random() < 0.12) {
      AUD.tone(1400, 0.15, 'square', 0.08); AUD.tone(1000, 0.15, 'square', 0.08, 0, 0.18);
      UI.toast('🚨 May alarma ang kotse!');
      WANTED.crime(1, v.x, v.y);
    }
    v.driver = 'player'; v.ai = null; v.parked = false; v.siren = false; v.keep = false; v.hand = false;
    P.vehicle = v; P.revMode = false;
    AUD.door();
  },
  ejectDriver(v) {
    const side = MAP.solidAt(v.x - Math.sin(v.a) * (v.W / 2 + 14), v.y + Math.cos(v.a) * (v.W / 2 + 14)) ? -1 : 1;
    const x = v.x - Math.sin(v.a) * (v.W / 2 + 14) * side, y = v.y + Math.cos(v.a) * (v.W / 2 + 14) * side;
    const p = new Person(x, y, v.driver === 'cop' || v.isCop ? 'cop' : 'ped');
    if (p.kind === 'cop') { p.state = 'chase'; p.fromCar = v; }
    else { p.state = 'flee'; p.fleeT = 5; p.tx = this.player.x; p.ty = this.player.y; }
    this.peds.push(p);
    v.driver = null; v.ai = null; v.unit = false;
  },
  exitVehicle(force) {
    const P = this.player, v = P.vehicle; if (!v) return;
    const sp = v.speed;
    const opts = v.t.boat ? [[-1, 0], [1, 0], [0, 1], [0, -1], [-2, 0], [2, 0]] : [[-1, 0], [1, 0], [0, 1], [0, -1]];
    let placed = false;
    for (const [s, f] of opts) {
      const sd = v.t.boat ? (Math.abs(s) > 1 ? 56 : 34) : v.W / 2 + 14, ss = Math.sign(s);
      const ox = s ? -Math.sin(v.a) * sd * ss : Math.cos(v.a) * (v.L / 2 + 14) * f;
      const oy = s ? Math.cos(v.a) * sd * ss : Math.sin(v.a) * (v.L / 2 + 14) * f;
      if (!MAP.solidAt(v.x + ox, v.y + oy)) { P.x = v.x + ox; P.y = v.y + oy; placed = true; break; }
    }
    if (!placed) {
      if (v.t.boat && !force) { UI.toast('🌊 Hindi ka pwedeng bumaba sa gitna ng dagat! Pumunta sa pantalan o pampang.'); return; }
      P.x = v.x; P.y = v.y;
    }
    v.driver = null; v.throttle = 0; v.steer = 0; v.hand = true;
    P.vehicle = null; P.vx = v.vx * 0.3; P.vy = v.vy * 0.3;
    if (!force && sp > 220) P.hurt(Math.min(40, (sp - 220) * 0.1));
    AUD.door();
  },
  panic(x, y, r) {
    for (const p of this.peds) {
      if (p.npc || p.kind === 'cop' || p.state === 'down') continue;
      if (U.d2(p.x, p.y, x, y) < r * r) { p.state = 'flee'; p.fleeT = U.rand(3, 6); p.tx = x; p.ty = y; }
    }
  },
  promptText() {
    if (UI.talking || this.cutscene) return '';
    if (MS.canRetry()) return `Ulitin ang misyon mula checkpoint: ${MS.retryInfo.m.title} (${Math.ceil(MS.retryT)}s)`;
    const vend = WORLD.nearVendor();
    if (vend) return vend.vendor === 'taho' ? 'Bumili ng taho kay Manong (₱20)' : 'Bumili ng balut kay Manong (₱20)';
    const m = MS.canStart();
    if (m) return `Kausapin si ${CHARS[m.giver].name} — Misyon ${MS.idx + 1}: ${m.title}`;
    const shop = SHOP.near(); const lab = shop && SHOP.label(shop);
    this.shopNear = lab ? shop : null;
    if (lab) return lab;
    if (!this.player.vehicle && this.nearVeh) {
      const v = this.nearVeh;
      return v.dead ? '' : (v.driver ? `Agawin ang ${v.t.name}` : `Sumakay sa ${v.t.name}`);
    }
    return '';
  },

  // ---------- effects ----------
  addMoney(n, sound) {
    this.player.money = Math.max(0, this.player.money + n);
    if (n > 0) this.stats.earned = (this.stats.earned || 0) + n;
    const m = document.getElementById('money'); m.classList.remove('pulse'); void m.offsetWidth; m.classList.add('pulse');
    if (sound && n > 0) AUD.cash();
  },
  dropCash(x, y, amt) { this.pickups.push({ x: x + U.rand(-8, 8), y: y + U.rand(-8, 8), amt, life: 25, type: 'cash' }); },
  shake(n) { this.cam.shake = Math.max(this.cam.shake, n); },
  fadeFlash() { const f = document.getElementById('fade'); f.classList.add('flash', 'on'); setTimeout(() => f.classList.remove('on'), 120); setTimeout(() => f.classList.remove('flash'), 500); },
  particle(type, x, y) {
    if (this.particles.length > 500) return;
    const p = { type, x, y, vx: U.rand(-20, 20), vy: U.rand(-20, 20), life: 1, max: 1, size: 8 };
    if (type === 'smoke') { p.life = p.max = U.rand(1, 1.8); p.size = U.rand(8, 14); p.vx *= 0.6; p.vy = U.rand(-30, -10); }
    else if (type === 'fire') { p.life = p.max = U.rand(0.4, 0.8); p.size = U.rand(8, 16); p.vy = U.rand(-50, -20); }
    else if (type === 'spark') { p.life = p.max = 0.3; p.size = 3; p.vx = U.rand(-200, 200); p.vy = U.rand(-200, 200); }
    else if (type === 'hit') { p.life = p.max = 0.25; p.size = 18; p.vx = 0; p.vy = 0; }
    else if (type === 'boom') { p.life = p.max = U.rand(0.6, 1.1); p.size = U.rand(20, 40); p.vx = U.rand(-160, 160); p.vy = U.rand(-160, 160); }
    else if (type === 'splash') { p.life = p.max = 0.5; p.size = U.rand(4, 9); p.vx = U.rand(-60, 60); p.vy = U.rand(-60, 60); }
    else if (type === 'wake') { p.life = p.max = 1.6; p.size = U.rand(5, 9); p.vx *= 0.3; p.vy *= 0.3; }
    else if (type === 'drip') { p.life = p.max = 0.4; p.size = U.rand(3, 6); p.vx = 0; p.vy = 0; }
    else if (type === 'cash') { p.life = p.max = 1; p.size = 14; p.vx = 0; p.vy = -40; }
    this.particles.push(p);
  },
  addSkid(v) {
    if (this.skids.length > 700) this.skids.splice(0, 40);
    const ca = Math.cos(v.a), sa = Math.sin(v.a);
    for (const s of [-1, 1]) {
      const x = v.x - ca * v.L * 0.35 - sa * s * v.W * 0.35, y = v.y - sa * v.L * 0.35 + ca * s * v.W * 0.35;
      this.skids.push({ x, y, a: v.a, life: 12 });
    }
  },
  explosion(x, y) {
    AUD.explosion(); this.shake(18);
    for (let k = 0; k < 30; k++) this.particle('boom', x, y);
    for (let k = 0; k < 20; k++) this.particle('smoke', x + U.rand(-30, 30), y + U.rand(-30, 30));
    for (const v of this.vehicles) {
      const d = U.dist(v.x, v.y, x, y);
      if (d < 160 && d > 1) { v.hp -= 90 * (1 - d / 160); const a = Math.atan2(v.y - y, v.x - x); v.vx += Math.cos(a) * 300 * (1 - d / 160) / v.mass; v.vy += Math.sin(a) * 300 * (1 - d / 160) / v.mass; if (v.hp <= 0 && !v.dead) v.wreck(); }
    }
    for (const p of this.peds) if (U.dist(p.x, p.y, x, y) < 140 && p.state !== 'down') p.knock(x, y, 300);
    const P = this.player;
    if (!P.vehicle) { const d = U.dist(P.x, P.y, x, y); if (d < 140) P.hurt(60 * (1 - d / 140)); }
    this.panic(x, y, 500);
  },

  // ---------- death / arrest ----------
  onWasted(reason) {
    if (this.cutscene) return;
    this.cutscene = true;
    AUD.fail();
    if (MS.active) MS.fail('Nahimatay ka');
    const fee = Math.min(this.player.money, 300);
    setTimeout(() => UI.big('NAHIMATAY!', `Dinala ka sa ospital (−${U.money(fee)})`, 3), 300);
    this.respawn('hospital', fee);
  },
  busted() {
    if (this.cutscene) return;
    this.cutscene = true; this.player.arrest = 0;
    AUD.fail();
    if (MS.active) MS.fail('Nahuli ka ng pulis');
    const fee = Math.min(this.player.money, 500);
    setTimeout(() => UI.big('HULI KA!', `Nakulong ka sa presinto. Piyansa: −${U.money(fee)}`, 3), 300);
    this.respawn('presinto', fee);
  },
  respawn(where, fee) {
    const f = document.getElementById('fade');
    setTimeout(() => f.classList.add('on'), 2200);
    setTimeout(() => {
      const P = this.player;
      if (P.vehicle) this.exitVehicle(true);
      WANTED.clear(false);
      for (const v of this.vehicles) if (v.unit) { v.remove = true; }
      for (const p of this.peds) if (p.fromCar) p.remove = true;
      const pt = MAP.pois[where];
      P.x = pt.x; P.y = pt.y + 6; P.hp = 100; P.downed = false; P.arrest = 0; P.vx = P.vy = 0;
      this.addMoney(-fee);
      this.cam.x = P.x; this.cam.y = P.y;
      f.classList.remove('on');
      this.cutscene = false;
      this.save();
    }, 3200);
  },

  // ---------- main loop ----------
  loop(t) {
    let dt = (t - this.last) / 1000; this.last = t;
    if (dt > 0.1) dt = 0.1;
    if (this.started && !this.paused) {
      this.acc = (this.acc || 0) + dt;
      let n = 0;
      while (this.acc >= 1 / 60 && n < 4) { this.update(1 / 60); this.acc -= 1 / 60; n++; }
      if (n === 4) this.acc = 0;
      UI.update(dt);
      TIP.check(dt); TIP.update(dt);
    }
    MUSIC.update(dt, this.player);
    if (this.started) this.render(); else this.renderTitle(dt);
    requestAnimationFrame((tt) => this.loop(tt));
  },
  update(dt) {
    this.dt = dt; this.time += dt; this.frame++;
    const P = this.player;
    const inp = (this.cutscene || UI.talking && MS.active && !P.vehicle) ? { mx: 0, my: 0, throttle: 0, steer: 0, hand: !!P.vehicle, joy: { x: 0, y: 0, mag: 0 }, touchDrive: false } : INPUT.state();
    if (this.cutscene && P.vehicle) { inp.hand = true; }
    P.update(dt, inp);
    const cx = this.cam.x, cy = this.cam.y;
    // vehicles
    for (const v of this.vehicles) {
      const far = Math.abs(v.x - cx) > 2400 || Math.abs(v.y - cy) > 2400;
      if (far && !v.mission && !v.unit) continue;
      if (v.towedBy) {
        const tr = v.towedBy;
        if (tr.remove || tr.burnt) { v.towedBy = null; continue; }
        v.a += U.angDiff(v.a, tr.a) * Math.min(1, dt * 4);
        const back = tr.L / 2 + v.L / 2 + 4;
        v.x = tr.x - Math.cos(tr.a) * back; v.y = tr.y - Math.sin(tr.a) * back; v.vx = tr.vx; v.vy = tr.vy;
        continue;
      }
      if (v.ai && v.driver !== 'player') v.ai.update(dt);
      if (v.parked && !v.driver && v.vx === 0 && v.vy === 0 && !v.dead) continue;
      v.update(dt);
      if (!v.driver && !v.dead && v.speed < 3) { v.vx = 0; v.vy = 0; }
    }
    this.collideVehicles();
    for (const p of this.peds) {
      if (Math.abs(p.x - cx) > 1900 || Math.abs(p.y - cy) > 1900) continue;
      p.updateAI(dt);
    }
    this.collidePeople();
    WANTED.update(dt);
    WORLD.update(dt);
    // fields
    this.fieldT -= dt;
    if (WANTED.stars > 0 && this.fieldT <= 0) {
      this.fieldT = 0.45;
      const tx = WANTED.mode === 'chase' ? P.x : WANTED.lastX, ty = WANTED.mode === 'chase' ? P.y : WANTED.lastY;
      MAP.computeField(this.copField, tx, ty, DRIVE_COST);
    }
    this.walkT -= dt;
    if (this.walkT <= 0 && WANTED.stars > 0 && this.peds.some(p => p.kind === 'cop' && p.state === 'chase')) { this.walkT = 0.5; MAP.computeField(this.walkField, P.x, P.y, WALK_COST); }
    TRAFFIC.update(dt);
    MS.update(dt);
    PASADA.update(dt);
    JOBS.update(dt);
    ARMS.update(dt);
    ACH.update(dt);
    SAVE.update(dt);
    this.updateGPS(dt);
    this.updatePickups(dt);
    this.updateArrest(dt);
    // particles
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const s of this.skids) s.life -= dt;
    if (this.frame % 30 === 0) this.skids = this.skids.filter(s => s.life > 0);
    // removals
    if (this.frame % 10 === 0 || this.vehicles.some(v => v.remove)) {
      this.vehicles = this.vehicles.filter(v => !v.remove || v.driver === 'player');
      this.peds = this.peds.filter(p => !p.remove);
    }
    this.nearVeh = P.vehicle ? null : this.findNearVehicle();
    // camera
    const tg = P.vehicle || P;
    const sp = P.vehicle ? P.vehicle.speed : 0;
    const lx = tg.x + (P.vehicle ? P.vehicle.vx * 0.42 : 0), ly = tg.y + (P.vehicle ? P.vehicle.vy * 0.42 : 0);
    const k = Math.min(1, dt * 4);
    this.cam.x = U.lerp(this.cam.x, lx, k); this.cam.y = U.lerp(this.cam.y, ly, k);
    const minSide = Math.min(innerWidth, innerHeight);
    const fit = U.clamp(minSide / 760, 0.66, 1);
    const visible = (P.vehicle ? 820 + Math.min(1, sp / 650) * 380 : 680) * fit;
    const zt = minSide / visible;
    this.cam.zoom = U.lerp(this.cam.zoom || zt, zt, Math.min(1, dt * 1.6));
    this.cam.vw = innerWidth / this.cam.zoom; this.cam.vh = innerHeight / this.cam.zoom;
    if (this.cam.shake > 0) { this.cam.shake *= Math.pow(0.02, dt); if (this.cam.shake < 0.3) this.cam.shake = 0; }
    this.cam.sx = U.rand(-1, 1) * this.cam.shake; this.cam.sy = U.rand(-1, 1) * this.cam.shake;
    // audio
    if (P.vehicle && !P.vehicle.dead) AUD.engine(true, Math.min(1, Math.abs(P.vehicle.fwd()) / P.vehicle.t.max), P.vehicle.isBig());
    else AUD.engine(false, 0);
    if (this.ramCd > 0) this.ramCd -= dt;
  },
  collideVehicles() {
    const cx = this.cam.x, cy = this.cam.y;
    const act = this.vehicles.filter(v => Math.abs(v.x - cx) < 1700 && Math.abs(v.y - cy) < 1700);
    for (let i = 0; i < act.length; i++) {
      const a = act[i];
      for (let j = i + 1; j < act.length; j++) {
        const b = act[j];
        if (a.towedBy === b || b.towedBy === a) continue;
        const lim = (a.L + b.L) / 2;
        const dx0 = b.x - a.x, dy0 = b.y - a.y;
        if (dx0 * dx0 + dy0 * dy0 > lim * lim) continue;
        const caA = Math.cos(a.a), saA = Math.sin(a.a), caB = Math.cos(b.a), saB = Math.sin(b.a);
        let hit = 0;
        for (const oa of a.circ) {
          const ax = a.x + caA * oa, ay = a.y + saA * oa;
          for (const ob of b.circ) {
            const bx = b.x + caB * ob, by = b.y + saB * ob;
            const dx = bx - ax, dy = by - ay, rr = a.r + b.r;
            const d2 = dx * dx + dy * dy;
            if (d2 >= rr * rr || d2 < 0.0001) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = rr - d;
            const ma = a.parked && !a.driver && a.speed < 1 ? a.mass * 2.5 : a.mass, mb = b.parked && !b.driver && b.speed < 1 ? b.mass * 2.5 : b.mass;
            const tot = ma + mb;
            a.x -= nx * pen * mb / tot; a.y -= ny * pen * mb / tot;
            b.x += nx * pen * ma / tot; b.y += ny * pen * ma / tot;
            const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (vn < 0) {
              const jj = -(1.3) * vn / (1 / ma + 1 / mb);
              a.vx -= jj / ma * nx; a.vy -= jj / ma * ny; b.vx += jj / mb * nx; b.vy += jj / mb * ny;
              hit = Math.max(hit, -vn);
              a.av += U.rand(-1, 1) * Math.min(2, -vn / 300); b.av += U.rand(-1, 1) * Math.min(2, -vn / 300);
            }
          }
        }
        if (hit > 0) {
          a.impact(hit, b); b.impact(hit, a);
          if (a.parked) a.parked = !!a.parked; // stays parked flag but can move
          const pl = a.driver === 'player' ? a : b.driver === 'player' ? b : null;
          const other = pl === a ? b : a;
          if (pl && hit > 90 && this.ramCd <= 0) {
            this.ramCd = 1;
            if (other.isCop && other.driver) { other.lastHitByPlayer = true; WANTED.crime(2, other.x, other.y, true); }
            else if (hit > 260 && other.driver && !other.criminal) WANTED.crime(1, other.x, other.y);
            if (other.ai instanceof RoadDriver && Math.random() < 0.5) AUD.horn(other.isBig());
          }
        }
      }
    }
  },
  collidePeople() {
    const P = this.player;
    const list = this.peds.filter(p => Math.abs(p.x - this.cam.x) < 1500 && Math.abs(p.y - this.cam.y) < 1500);
    if (!P.vehicle && !P.downed) list.push(P);
    for (const v of this.vehicles) {
      if (Math.abs(v.x - this.cam.x) > 1500 || Math.abs(v.y - this.cam.y) > 1500) continue;
      const ca = Math.cos(v.a), sa = Math.sin(v.a), sp = v.speed;
      for (const p of list) {
        const dx = p.x - v.x, dy = p.y - v.y;
        if (Math.abs(dx) > v.L || Math.abs(dy) > v.L) continue;
        const fx = dx * ca + dy * sa, fy = -dx * sa + dy * ca;
        const hx = v.L / 2 + p.r, hy = v.W / 2 + p.r;
        if (Math.abs(fx) >= hx || Math.abs(fy) >= hy) continue;
        // hit?
        const rel = (v.vx * dx + v.vy * dy) / (Math.hypot(dx, dy) || 1);
        if (sp > 140 && rel > 60 && p.state !== 'down') {
          if (p === P) {
            P.hurt(Math.min(70, sp * 0.09), v.x, v.y);
            P.vx = v.vx * 0.8; P.vy = v.vy * 0.8;
          } else {
            p.knock(v.x - v.vx, v.y - v.vy, Math.min(500, sp * 0.9));
            if (v.driver === 'player') { WANTED.crime(p.kind === 'cop' ? 3 : 1, p.x, p.y); this.panic(p.x, p.y, 260); }
          }
          v.vx *= 0.9; v.vy *= 0.9;
          AUD.punch();
          continue;
        }
        // push out along smallest penetration
        const px = hx - Math.abs(fx), py = hy - Math.abs(fy);
        if (px < py) { const s = Math.sign(fx) * px; p.x += ca * s; p.y += sa * s; }
        else { const s = Math.sign(fy) * py; p.x += -sa * s; p.y += ca * s; }
      }
    }
  },
  updateArrest(dt) {
    const P = this.player;
    if (WANTED.stars === 0 || P.downed || this.cutscene) { P.arrest = Math.max(0, P.arrest - dt); return; }
    let near = false;
    if (!P.vehicle) {
      for (const p of this.peds) if (p.kind === 'cop' && p.state !== 'down' && U.d2(p.x, p.y, P.x, P.y) < 34 * 34) { near = true; break; }
    } else if (Math.abs(P.vehicle.fwd()) < 35) {
      const v = P.vehicle;
      let box = 0;
      for (const c of this.vehicles) if (c.unit && c.driver && !c.dead && U.dist(c.x, c.y, v.x, v.y) < (v.L + c.L) / 2 + 26) box++;
      near = box >= (D().boxIn || 1);
      if (!near) for (const p of this.peds) if (p.kind === 'cop' && p.state !== 'down' && U.dist(p.x, p.y, v.x, v.y) < v.L / 2 + 28) { near = true; break; }
    }
    if (near) P.arrest += dt / ((P.vehicle ? 2.6 : 1.7) * D().arrest);
    else P.arrest = Math.max(0, P.arrest - dt * 0.6);
    if (P.arrest >= 1) this.busted();
  },
  updateGPS(dt) {
    let t = MS.target();
    if (!t && JOBS.active) t = JOBS.target();
    if (!t && PASADA.mode && PASADA.pt) t = Object.assign({ stop: true }, PASADA.pt);
    this.target = t;
    this.gpsT -= dt;
    if (!t) { this.gpsPath = null; return; }
    const key = Math.round(t.x / 160) + ',' + Math.round(t.y / 160);
    if (key !== this.gpsKey) { this.gpsKey = key; MAP.computeField(this.gpsField, t.x, t.y, DRIVE_COST); this.gpsT = 0; }
    if (this.gpsT <= 0) { this.gpsT = 0.4; this.gpsPath = MAP.pathFrom(this.gpsField, this.player.x, this.player.y); }
  },
  updatePickups(dt) {
    const P = this.player;
    const r = P.vehicle ? 50 : 26;
    for (const p of this.pickups) {
      p.life -= dt;
      if (U.d2(p.x, p.y, P.x, P.y) < r * r) { p.life = 0; this.addMoney(p.amt); AUD.coin(); this.particle('cash', p.x, p.y); }
    }
    this.pickups = this.pickups.filter(p => p.life > 0);
    for (const s of MAP.tsinelas) {
      if (this.tsinelas.has(s.id)) continue;
      if (U.d2(s.x, s.y, P.x, P.y) < (r + 10) * (r + 10)) {
        this.tsinelas.add(s.id); this.addMoney(100, true);
        const n = this.tsinelas.size;
        UI.big('GINTONG TSINELAS!', `${n} / ${MAP.tsinelas.length} · +₱100`, 1.8, 'good');
        if (n === MAP.tsinelas.length) { this.unlock.gold = true; setTimeout(() => UI.toast('🏆 Lahat ng tsinelas! May GINTONG kotse ka na sa terminal ni Tito Boy!'), 2000); }
        this.save();
      }
    }
  },

  // ---------- rendering ----------
  render() {
    const g = this.ctx, cam = this.cam, z = cam.zoom * this.dpr;
    const W = this.canvas.width, H = this.canvas.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#0d111b'; g.fillRect(0, 0, W, H);
    const ox = cam.x + cam.sx, oy = cam.y + cam.sy;
    g.setTransform(z, 0, 0, z, W / 2 - ox * z, H / 2 - oy * z);
    const x0 = ox - cam.vw / 2 - 20, x1 = ox + cam.vw / 2 + 20, y0 = oy - cam.vh / 2 - 20, y1 = oy + cam.vh / 2 + 20;
    const inV = (x, y, m) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
    // chunks
    const CS = MAP.CH;
    let budget = 2;
    for (let cy = Math.floor(y0 / CS); cy <= Math.floor(y1 / CS); cy++) for (let cx = Math.floor(x0 / CS); cx <= Math.floor(x1 / CS); cx++) {
      if (cx < 0 || cy < 0 || cx * CS > WORLD_W || cy * CS > WORLD_H) continue;
      let c = MAP.getChunk(cx, cy, false);
      if (!c && budget > 0) { c = MAP.getChunk(cx, cy, true); budget--; }
      if (c) g.drawImage(c, cx * CS, cy * CS, CS + 0.6, CS + 0.6);
      else { g.fillStyle = '#1a1f2c'; g.fillRect(cx * CS, cy * CS, CS, CS); }
    }
    const now = this.time;
    // search zone
    const Wd = WANTED;
    if (Wd.stars > 0 && Wd.mode === 'search') {
      g.fillStyle = Wd.escaping ? 'rgba(255,90,60,0.05)' : 'rgba(130,100,255,0.10)';
      g.fillRect(Wd.lastX - Wd.zone, Wd.lastY - Wd.zone, Wd.zone * 2, Wd.zone * 2);
      g.strokeStyle = Wd.escaping ? 'rgba(255,90,60,0.5)' : 'rgba(170,140,255,0.8)'; g.lineWidth = 6; g.setLineDash([24, 14]);
      g.strokeRect(Wd.lastX - Wd.zone, Wd.lastY - Wd.zone, Wd.zone * 2, Wd.zone * 2); g.setLineDash([]);
    }
    WORLD.drawFloods(g, inV, now);
    // skids
    g.fillStyle = 'rgba(10,10,12,0.35)';
    for (const s of this.skids) { if (!inV(s.x, s.y, 10)) continue; g.globalAlpha = Math.min(1, s.life / 4) * 0.6; g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.fillRect(-5, -2.5, 10, 5); g.restore(); }
    g.globalAlpha = 1;
    // spikes
    for (const s of Wd.spikes) {
      g.save(); g.translate(s.x, s.y); if (!s.horiz) g.rotate(Math.PI / 2);
      g.fillStyle = '#222'; g.fillRect(-64, -6, 128, 12); g.fillStyle = '#bbb'; for (let k = -60; k < 64; k += 8) { g.beginPath(); g.moveTo(k, -6); g.lineTo(k + 4, -12); g.lineTo(k + 8, -6); g.fill(); }
      g.restore();
    }
    // CCTV cameras
    for (const c of MAP.cctv) {
      if (!inV(c.x, c.y, 340)) continue;
      g.fillStyle = Wd.stars > 0 ? 'rgba(255,70,60,0.07)' : 'rgba(255,255,255,0.035)';
      g.beginPath(); g.moveTo(c.x, c.y); g.arc(c.x, c.y, 320, c.a - 0.55, c.a + 0.55); g.closePath(); g.fill();
      g.save(); g.translate(c.x, c.y); g.rotate(c.a);
      g.fillStyle = '#9aa3ad'; g.fillRect(-4, -4, 8, 8);
      g.fillStyle = '#e8ebee'; U.rr(g, -2, -5, 16, 10, 3); g.fill();
      g.fillStyle = Math.floor(now * 2) % 2 ? '#ff3030' : '#801010'; g.beginPath(); g.arc(13, 0, 2.5, 0, TAU); g.fill();
      g.restore();
    }
    WORLD.drawLights(g, inV, false);
    // POI rings
    for (const k in MAP.pois) {
      const p = MAP.pois[k];
      if (p.type === 'npc' || p.type === 'spot' || !inV(p.x, p.y, 60)) continue;
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.setLineDash([6, 6]);
      g.beginPath(); g.arc(p.x, p.y, 22, 0, TAU); g.stroke(); g.setLineDash([]);
    }
    // markers
    this.drawTarget(g, now);
    // pickups
    for (const p of this.pickups) {
      if (!inV(p.x, p.y, 20)) continue;
      const b = Math.sin(now * 5 + p.x) * 2;
      g.fillStyle = '#2ecc71'; U.rr(g, p.x - 9, p.y - 6 + b, 18, 12, 2); g.fill();
      g.fillStyle = '#0b3d1a'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₱', p.x, p.y + b + 0.5);
    }
    for (const s of MAP.tsinelas) {
      if (this.tsinelas.has(s.id) || !inV(s.x, s.y, 30)) continue;
      const b = Math.sin(now * 3 + s.id) * 3;
      g.save(); g.translate(s.x, s.y + b); g.rotate(0.4);
      g.fillStyle = '#d4af37'; g.beginPath(); g.ellipse(0, 0, 7, 13, 0, 0, TAU); g.fill();
      g.strokeStyle = '#7a5c12'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-6, -3); g.lineTo(0, -7); g.lineTo(6, -3); g.stroke();
      g.restore();
    }
    WORLD.drawCourts(g, inV, now);
    // people (down first)
    for (const p of this.peds) if (p.state === 'down' && inV(p.x, p.y, 30)) drawPerson(g, p, now);
    // vehicles
    for (const v of this.vehicles) if (inV(v.x, v.y, v.L)) drawVehicle(g, v, now);
    for (const p of this.peds) if (p.state !== 'down' && inV(p.x, p.y, 30)) drawPerson(g, p, now);
    const P = this.player;
    if (!P.vehicle) drawPerson(g, P, now);
    else if (P.turnQueued !== false && P.turnQueued !== undefined) {
      // easy-drive: show the queued turn as an arrow ahead of the car
      const v = P.vehicle, Q = Math.PI / 2, cur = Math.round(v.a / Q) * Q, des = P.turnDes;
      const ax = v.x + Math.cos(cur) * (v.L / 2 + 40), ay = v.y + Math.sin(cur) * (v.L / 2 + 40);
      g.save(); g.translate(ax, ay); g.rotate(des); g.globalAlpha = 0.6 + Math.sin(now * 8) * 0.3;
      g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(14, 0); g.lineTo(-6, -11); g.lineTo(-2, 0); g.lineTo(-6, 11); g.closePath(); g.fill();
      g.restore(); g.globalAlpha = 1;
    }
    ARMS.draw(g, inV);
    // particles
    for (const p of this.particles) {
      if (!inV(p.x, p.y, 40)) continue;
      const t = p.life / p.max;
      if (p.type === 'smoke') { g.fillStyle = `rgba(60,60,66,${0.35 * t})`; g.beginPath(); g.arc(p.x, p.y, p.size * (2 - t), 0, TAU); g.fill(); }
      else if (p.type === 'spark') { g.fillStyle = `rgba(255,220,120,${t})`; g.fillRect(p.x, p.y, 3, 3); }
      else if (p.type === 'hit') { g.strokeStyle = `rgba(255,255,255,${t})`; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, p.size * (1.5 - t), 0, TAU); g.stroke(); }
      else if (p.type === 'splash' || p.type === 'drip') { g.strokeStyle = `rgba(190,215,240,${0.6 * t})`; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, p.y, p.size * (1.6 - t), 0, TAU); g.stroke(); }
      else if (p.type === 'wake') { g.fillStyle = `rgba(220,235,245,${0.35 * t})`; g.beginPath(); g.arc(p.x, p.y, p.size * (2 - t), 0, TAU); g.fill(); }
      else if (p.type === 'cash') { g.fillStyle = `rgba(125,255,155,${t})`; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.fillText('+₱', p.x, p.y); }
    }
    WORLD.drawOverlay(g, x0 - 40, y0 - 40, x1 - x0 + 80, y1 - y0 + 80);
    // ---- light pass ----
    g.globalCompositeOperation = 'lighter';
    const S = this.sprites;
    WORLD.drawLights(g, inV, true);
    g.globalAlpha = 0.9 * this.lightMul;
    for (const l of MAP.lamps) if (inV(l.x, l.y, 130)) g.drawImage(S.lamp, l.x - 120, l.y - 120, 240, 240);
    g.globalAlpha = 1;
    for (const v of this.vehicles) if (inV(v.x, v.y, 200)) drawVehicleLights(g, v, now, S);
    for (const p of this.particles) {
      if ((p.type === 'fire' || p.type === 'boom') && inV(p.x, p.y, 60)) { const t = p.life / p.max; g.globalAlpha = t; g.drawImage(S.fire, p.x - p.size * 1.5, p.y - p.size * 1.5, p.size * 3, p.size * 3); }
    }
    g.globalAlpha = 1;
    for (const s of MAP.tsinelas) if (!this.tsinelas.has(s.id) && inV(s.x, s.y, 40)) { g.globalAlpha = 0.5 + Math.sin(now * 4) * 0.2; g.drawImage(S.gold, s.x - 30, s.y - 30, 60, 60); }
    g.globalAlpha = 1;
    if (MAP.island && inV(MAP.island.lighthouse.x, MAP.island.lighthouse.y, 400)) {
      const lh = MAP.island.lighthouse, a = now * 0.8;
      g.globalAlpha = 0.35 * this.lightMul; g.save(); g.translate(lh.x, lh.y); g.rotate(a); g.drawImage(S.cone, 0, -75, 360, 150); g.restore();
    }
    for (const h of Wd.helis) { g.globalAlpha = 0.38; g.drawImage(S.white, h.sx - 120, h.sy - 120, 240, 240); }
    if (this.target) { g.globalAlpha = 0.35 + Math.sin(now * 5) * 0.1; g.drawImage(S.gold, this.target.x - 60, this.target.y - 60, 120, 120); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    // lamp posts
    g.fillStyle = '#c9c2a8';
    for (const l of MAP.lamps) if (inV(l.x, l.y, 10)) { g.beginPath(); g.arc(l.x, l.y, 3, 0, TAU); g.fill(); }
    // helis on top
    for (const h of Wd.helis) if (inV(h.x, h.y, 120)) h.draw(g);
    // names
    g.font = 'bold 12px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom';
    for (const p of this.peds) if (p.sayT > 0 && p.say && inV(p.x, p.y, 40)) {
      g.font = 'bold 12px Nunito, sans-serif'; const w = g.measureText(p.say).width + 12;
      g.fillStyle = 'rgba(255,255,255,0.92)'; U.rr(g, p.x - w / 2, p.y - 46, w, 20, 8); g.fill();
      g.beginPath(); g.moveTo(p.x - 4, p.y - 27); g.lineTo(p.x + 4, p.y - 27); g.lineTo(p.x, p.y - 21); g.fill();
      g.fillStyle = '#1a2030'; g.fillText(p.say, p.x, p.y - 30);
    }
    g.font = 'bold 12px Nunito, sans-serif';
    for (const p of this.peds) if (p.name && inV(p.x, p.y, 20)) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(p.name, p.x + 1, p.y - 17); g.fillStyle = '#ffd23f'; g.fillText(p.name, p.x, p.y - 18); }
    // POI icons
    g.font = '18px sans-serif'; g.textBaseline = 'middle';
    for (const k in MAP.pois) { const p = MAP.pois[k]; if (p.type === 'npc' || p.type === 'spot' || !inV(p.x, p.y, 40)) continue; g.fillText(p.icon, p.x, p.y - 34 + Math.sin(now * 3) * 2); }
    // screen-space: edge arrow
    g.setTransform(1, 0, 0, 1, 0, 0);
    this.drawEdgeArrow(g, W, H, z, ox, oy);
    WORLD.drawRain(g, W, H, this.dpr);
  },
  drawTarget(g, now) {
    const t = this.target; if (!t) return;
    const pulse = 1 + Math.sin(now * 5) * 0.08;
    g.save(); g.translate(t.x, t.y);
    if (t instanceof Vehicle || t instanceof Person) {
      const b = Math.sin(now * 6) * 5;
      g.fillStyle = '#ffd23f'; g.strokeStyle = '#3a2a00'; g.lineWidth = 2;
      const off = (t.L || 20) / 2 + 26;
      g.beginPath(); g.moveTo(-10, -off - 16 + b); g.lineTo(10, -off - 16 + b); g.lineTo(0, -off + b); g.closePath(); g.fill(); g.stroke();
    } else {
      const r = (t.cp ? 70 : t.giver ? 30 : 50) * pulse;
      g.fillStyle = t.giver ? 'rgba(255,210,63,0.16)' : 'rgba(255,210,63,0.12)';
      g.strokeStyle = '#ffd23f'; g.lineWidth = 4;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
      g.lineWidth = 2; g.globalAlpha = 0.5; g.beginPath(); g.arc(0, 0, r * 0.7, 0, TAU); g.stroke(); g.globalAlpha = 1;
      if (t.cp) { g.fillStyle = '#ffd23f'; g.font = 'bold 34px Lilita One, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(t.n), 0, 2); }
      if (t.giver) {
        g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -52, 15, 0, TAU); g.fill();
        g.fillStyle = '#1a1205'; g.font = 'bold 18px Lilita One, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.letter, 0, -51);
      }
      if (t.stop) { g.fillStyle = '#ffd23f'; g.font = 'bold 13px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('PARA', 0, 0); }
    }
    g.restore();
  },
  drawEdgeArrow(g, W, H, z, ox, oy) {
    const t = this.target; if (!t) return;
    const sx = W / 2 + (t.x - ox) * z, sy = H / 2 + (t.y - oy) * z;
    const m = 50 * this.dpr;
    if (sx > m && sx < W - m && sy > m && sy < H - m) return;
    const a = Math.atan2(sy - H / 2, sx - W / 2);
    const rx = W / 2 - 70 * this.dpr, ry = H / 2 - 90 * this.dpr;
    const ex = W / 2 + Math.cos(a) * rx, ey = H / 2 + Math.sin(a) * ry;
    g.save(); g.translate(ex, ey); g.rotate(a); g.scale(this.dpr, this.dpr);
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(16, 0); g.lineTo(-8, -12); g.lineTo(-3, 0); g.lineTo(-8, 12); g.closePath(); g.fill(); g.stroke();
    g.restore();
    const d = U.dist(this.player.x, this.player.y, t.x, t.y);
    g.fillStyle = '#ffd23f'; g.font = `bold ${12 * this.dpr}px Nunito, sans-serif`; g.textAlign = 'center';
    g.fillText(Math.round(d / 14) + 'm', ex - Math.cos(a) * 30 * this.dpr, ey - Math.sin(a) * 30 * this.dpr);
  },
  // animated chase scene behind the home page
  titleScene() {
    if (this.ts) return this.ts;
    const A = [MAP.cx(3) + LO, MAP.cy(5) + LO], B = [MAP.cx(6) - LO, MAP.cy(5) + LO], C = [MAP.cx(6) - LO, MAP.cy(7) - LO], Dd = [MAP.cx(3) + LO, MAP.cy(7) - LO];
    const corners = [A, B, C, Dd], pts = [], R = 70;
    for (let k = 0; k < 4; k++) {
      const p0 = corners[(k + 3) % 4], p1 = corners[k], p2 = corners[(k + 1) % 4];
      const d0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const a = [p1[0] + (p0[0] - p1[0]) / d0 * R, p1[1] + (p0[1] - p1[1]) / d0 * R], b = [p1[0] + (p2[0] - p1[0]) / d2 * R, p1[1] + (p2[1] - p1[1]) / d2 * R];
      for (let t = 0; t <= 1; t += 0.125) pts.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * p1[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * p1[1] + t * t * b[1]]);
    }
    const seg = []; let L = 0;
    for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push({ a, b, l, s: L }); L += l; }
    const mk = (type, col) => { const v = new Vehicle(type, 0, 0, 0, { color: col }); v.driver = 'ai'; return v; };
    const cars = [{ v: mk('sports', '#f28c28'), off: 0 }];
    for (let k = 1; k <= 3; k++) { const c = mk('police'); c.siren = true; cars.push({ v: c, off: -140 * k - 20 }); }
    const heli = new Heli(A[0], A[1]);
    if (!this.vehicles.length) TRAFFIC.spawnParked();
    this.ts = { seg, L, cars, heli, s: 0, camX: A[0], camY: A[1] };
    return this.ts;
  },
  pathAt(sc, d) {
    d = ((d % sc.L) + sc.L) % sc.L;
    for (const sg of sc.seg) if (d <= sg.s + sg.l) { const t = (d - sg.s) / sg.l; return { x: sg.a[0] + (sg.b[0] - sg.a[0]) * t, y: sg.a[1] + (sg.b[1] - sg.a[1]) * t, a: Math.atan2(sg.b[1] - sg.a[1], sg.b[0] - sg.a[0]) }; }
    const sg = sc.seg[0]; return { x: sg.a[0], y: sg.a[1], a: 0 };
  },
  renderTitle(dt) {
    this.time += dt;
    const sc = this.titleScene();
    sc.s += dt * 420;
    for (const c of sc.cars) {
      const p = this.pathAt(sc, sc.s + c.off), v = c.v;
      const wob = c.off ? Math.sin(this.time * 3 + c.off) * 6 : 0;
      v.x = p.x - Math.sin(p.a) * wob; v.y = p.y + Math.cos(p.a) * wob;
      v.a += U.angDiff(v.a, p.a) * Math.min(1, dt * 8);
    }
    const hero = sc.cars[0].v, h = sc.heli;
    h.x += (hero.x - 60 - h.x) * Math.min(1, dt * 1.2); h.y += (hero.y - 80 - h.y) * Math.min(1, dt * 1.2);
    h.a = Math.atan2(hero.y - h.y, hero.x - h.x); h.rot += dt * 30; h.sx = hero.x; h.sy = hero.y;
    const lx = hero.x + Math.cos(hero.a) * 160, ly = hero.y + Math.sin(hero.a) * 160;
    sc.camX += (lx - sc.camX) * Math.min(1, dt * 1.5); sc.camY += (ly - sc.camY) * Math.min(1, dt * 1.5);
    const g = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const z = Math.min(innerWidth, innerHeight) / 760 * this.dpr * (innerWidth > 820 ? 1.05 : 0.95);
    // on wide screens, keep the action on the right side (menu card is on the left/center)
    const ox = sc.camX - (innerWidth > 820 ? innerWidth * 0.18 : 0) * this.dpr / z, oy = sc.camY + (innerWidth > 820 ? 0 : innerHeight * 0.12) * this.dpr / z;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0d111b'; g.fillRect(0, 0, W, H);
    g.setTransform(z, 0, 0, z, W / 2 - ox * z, H / 2 - oy * z);
    const vw = W / z, vh = H / z, CS = MAP.CH;
    const inV = (x, y, m) => Math.abs(x - ox) < vw / 2 + m && Math.abs(y - oy) < vh / 2 + m;
    let budget = 2;
    for (let cy = Math.floor((oy - vh / 2) / CS); cy <= Math.floor((oy + vh / 2) / CS); cy++) for (let cx = Math.floor((ox - vw / 2) / CS); cx <= Math.floor((ox + vw / 2) / CS); cx++) {
      let c = MAP.getChunk(cx, cy, false);
      if (!c && budget-- > 0) c = MAP.getChunk(cx, cy, true);
      if (c) g.drawImage(c, cx * CS, cy * CS, CS + 0.6, CS + 0.6);
    }
    WORLD.drawLights(g, inV, false);
    for (const v of this.vehicles) if (inV(v.x, v.y, 80)) drawVehicle(g, v, this.time);
    for (const c of sc.cars) drawVehicle(g, c.v, this.time);
    g.globalCompositeOperation = 'lighter';
    const S = this.sprites;
    g.globalAlpha = 0.9;
    for (const l of MAP.lamps) if (inV(l.x, l.y, 130)) g.drawImage(S.lamp, l.x - 120, l.y - 120, 240, 240);
    g.globalAlpha = 1;
    WORLD.drawLights(g, inV, true);
    for (const c of sc.cars) drawVehicleLights(g, c.v, this.time, S);
    g.globalAlpha = 0.35; g.drawImage(S.white, h.sx - 120, h.sy - 120, 240, 240); g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    h.draw(g);
  },

};

window.addEventListener('load', () => G.boot());
// leave anytime: autosave when the tab/app is hidden or closed
const leaveSave = () => { if (G.started && !G.cutscene && !G.player.downed) SAVE.write('auto', true); };
window.addEventListener('pagehide', leaveSave);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leaveSave(); });
