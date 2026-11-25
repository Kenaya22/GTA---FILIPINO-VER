'use strict';
// ===== Guns, grenades, armor, gun shops, gang hideouts, shooting range =====
// Cartoon rules: anyone hit enough gets "knocked out" (nahimatay) — no gore.
Object.assign(WEAPONS, {
  pistola: { name: 'Pistola', icon: '🔫', gun: true, price: 2500, mag: 12, pack: 48, ammoPrice: 300, dmg: 34, rate: 0.28, spread: 0.035, range: 520, pellets: 1, reload: 1.1, drive: true, desc: 'Maaasahan at mabilis i-reload. Pwede sa drive-by.' },
  shotgun: { name: 'Shotgun', icon: '💥', gun: true, price: 6000, mag: 6, pack: 24, ammoPrice: 500, dmg: 20, rate: 0.85, spread: 0.2, range: 300, pellets: 7, reload: 2.0, desc: 'Napakalakas sa malapitan. Pang-sira ng sasakyan.' },
  smg: { name: 'SMG', icon: '⚡', gun: true, auto: true, price: 8500, mag: 30, pack: 120, ammoPrice: 700, dmg: 16, rate: 0.085, spread: 0.075, range: 450, pellets: 1, reload: 1.5, drive: true, desc: 'Awtomatiko — hawakan para tuloy-tuloy. Pwede sa drive-by.' },
  riple: { name: 'Riple', icon: '🔭', gun: true, auto: true, price: 15000, mag: 20, pack: 80, ammoPrice: 900, dmg: 44, rate: 0.14, spread: 0.018, range: 700, pellets: 1, reload: 1.9, desc: 'Malayo, tumpak at malakas. Para sa seryosong labanan.' },
  granada: { name: 'Granada', icon: '💣', throw: true, price: 1500, pack: 3, ammoPrice: 1500, desc: 'Ihagis — sasabog pagkatapos ng 1.5 segundo. Ingat!' },
});
WEAPON_ORDER.push('pistola', 'shotgun', 'smg', 'riple', 'granada');
const GUN_IDS = ['pistola', 'shotgun', 'smg', 'riple'];

const GUNS = {
  tracers: [],
  mouse: { x: 0, y: 0, wx: 0, wy: 0, t: -9, down: false },
  owned(id) { const P = G.player; return P.weapons && P.weapons[id] !== undefined && P.weapons[id] !== false; },
  mag(id) { const P = G.player; P.mags = P.mags || {}; return P.mags[id] || 0; },
  // the gun in use: on foot the equipped one; in a car the best drive-by gun you own
  driveGun() {
    const P = G.player, w = WEAPONS[P.weapon];
    if (w && w.drive && this.owned(P.weapon)) return P.weapon;
    return this.owned('smg') ? 'smg' : this.owned('pistola') ? 'pistola' : null;
  },
  cur() { const P = G.player; return P.vehicle ? this.driveGun() : P.weapon; },
  label() {
    const P = G.player, id = this.cur(), w = WEAPONS[id];
    if (!w || !w.gun) return null;
    if (P.reloadT > 0) return `${w.icon} ${w.name} · nagre-reload...`;
    return `${w.icon} ${w.name} ${this.mag(id)}/${P.weapons[id] || 0}`;
  },
  // ---------- player firing ----------
  aimAngle(range) {
    const P = G.player;
    if (G.time - this.mouse.t < 2.5 && !INPUT.touch) return Math.atan2(this.mouse.wy - P.y, this.mouse.wx - P.x);
    if (INPUT.touch && SETTINGS.aim === 'manual') return P.a;
    const t = this.bestTarget(P.x, P.y, P.a, range, P.vehicle ? Math.PI : 0.7);
    return t ? Math.atan2(t.y + (t.vy || 0) * 0.12 - P.y, t.x + (t.vx || 0) * 0.12 - P.x) : P.a;
  },
  bestTarget(x, y, a, range, cone) {
    let best = null, bs = 1e9;
    const hostile = (o) => o.kind === 'goon' && o.hostile || (WANTED.stars > 0 && (o.kind === 'cop' || o.isCop));
    const cand = G.peds.filter(p => p.state !== 'down' && !p.npc).concat(G.vehicles.filter(v => v.driver && !v.burnt && v.driver !== 'player'));
    for (const t of cand) {
      const d = U.dist(x, y, t.x, t.y); if (d > range || d < 8) continue;
      const da = Math.abs(U.angDiff(a, Math.atan2(t.y - y, t.x - x)));
      if (da > cone || !MAP.los(x, y, t.x, t.y)) continue;
      const sc = d + da * 260 - (hostile(t) ? 600 : 0);
      if (sc < bs) { bs = sc; best = t; }
    }
    return best;
  },
  trigger(held) {
    const P = G.player, id = this.cur(), w = WEAPONS[id];
    if (P.downed || G.cutscene || G.paused || UI.talking) return;
    if (!w) { if (P.vehicle && !held && !this.warned) { this.warned = true; UI.toast('Kailangan ng Pistola o SMG para bumaril mula sa sasakyan.'); } return; }
    if (w.throw) { if (!held) this.throwGrenade(); return; }
    if (!w.gun) return;
    if (held && !w.auto) return;
    if (P.reloadT > 0 || (P.fireCd || 0) > 0) return;
    P.mags = P.mags || {};
    if (!P.mags[id]) { this.reload(id); return; }
    P.mags[id]--; P.fireCd = w.rate;
    const a = this.aimAngle(w.range);
    if (!P.vehicle) P.a = a;
    const sx = P.x + Math.cos(a) * 16, sy = P.y + Math.sin(a) * 16;
    const sw = PROG.aimDmg() === 1 ? w : Object.assign({}, w, { dmg: w.dmg * PROG.aimDmg() });
    for (let k = 0; k < w.pellets; k++) this.bullet(sx, sy, a + U.rand(-w.spread, w.spread) * PROG.aimSpread() * (P.vehicle ? 1.6 : 1), sw, 'player');
    P.punchT = 0.12;
    this.flash(sx, sy, a);
    AUD.gun(id, 1);
    G.shake(id === 'shotgun' ? 4 : 1.5);
    this.gunshot(P.x, P.y);
    if (!P.mags[id] && P.weapons[id] > 0) setTimeout(() => this.reload(id), 250);
    G.stats.shots = (G.stats.shots || 0) + 1;
  },
  reload(id) {
    const P = G.player; id = id || this.cur(); const w = WEAPONS[id];
    if (!w || !w.gun || P.reloadT > 0) return;
    if ((P.mags[id] || 0) >= w.mag) return;
    if (!P.weapons[id]) { UI.toast(`Ubos ang bala ng ${w.name}! Bumili sa Armas.`); AUD.click(); return; }
    P.reloadT = w.reload; P.reloadId = id;
    AUD.tone(300, 0.08, 'square', 0.05); AUD.tone(500, 0.08, 'square', 0.05, 0, w.reload * 0.8);
  },
  update(dt) {
    const P = G.player;
    if (P.fireCd > 0) P.fireCd -= dt;
    if (P.reloadT > 0) {
      P.reloadT -= dt;
      if (P.reloadT <= 0 || this.cur() !== P.reloadId) {
        const id = P.reloadId, w = WEAPONS[id];
        if (P.reloadT <= 0 && w) { const need = w.mag - (P.mags[id] || 0), take = Math.min(need, P.weapons[id] || 0); P.mags[id] = (P.mags[id] || 0) + take; P.weapons[id] -= take; }
        P.reloadT = 0;
      }
    }
    // auto weapons keep firing while held: Space / SUNTOK button on foot; mouse, X or the 🔫 button anywhere (drive-by)
    const foot = !P.vehicle && (INPUT.keys.Space || INPUT.bHeld);
    const any = this.mouse.down || INPUT.fireHeld || INPUT.keys.KeyX;
    const w = WEAPONS[this.cur()];
    if ((foot || any) && w && w.auto) this.trigger(true);
    // mouse world position follows the camera
    const z = G.cam.zoom || 1;
    this.mouse.wx = G.cam.x + (this.mouse.x - innerWidth / 2) / z; this.mouse.wy = G.cam.y + (this.mouse.y - innerHeight / 2) / z;
    for (const t of this.tracers) t.life -= dt;
    this.tracers = this.tracers.filter(t => t.life > 0);
    this.updateGrenades(dt);
    KUTA.update(dt);
  },
  flash(x, y, a) { G.particles.push({ type: 'flash', x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6, vx: 0, vy: 0, life: 0.06, max: 0.06, size: 18 }); G.particle('shell', x, y); },
  // hearing gunfire: police nearby react even without line of sight
  gunshot(x, y) {
    G.panic(x, y, 520);
    if (MS.active && MS.c && MS.c.noCops) return;
    for (const v of G.vehicles) if (v.isCop && v.driver && v.driver !== 'player' && U.d2(v.x, v.y, x, y) < 650 * 650) { WANTED.crime(2, x, y, true); return; }
    for (const p of G.peds) if ((p.kind === 'cop') && p.state !== 'down' && U.d2(p.x, p.y, x, y) < 600 * 600) { WANTED.crime(2, x, y, true); return; }
  },
  // hitscan bullet with a tracer; owner: 'player' | 'cop' | 'goon'
  bullet(x, y, a, w, owner, shooter) {
    const ca = Math.cos(a), sa = Math.sin(a);
    let best = w.range, hit = null, hitKind = null;
    // walls
    for (let t = 8; t < best; t += 8) { const tt = MAP.tileAt(x + ca * t, y + sa * t); if (tt === TL.BLD || tt === TL.WALL || tt === TL.TREE || tt === 255) { best = t; break; } }
    const ray = (cx, cy, r) => { const dx = cx - x, dy = cy - y, along = dx * ca + dy * sa; if (along < 0 || along > best) return -1; const perp = Math.abs(-dx * sa + dy * ca); return perp < r ? along - Math.sqrt(r * r - perp * perp) : -1; };
    const P = G.player;
    if (owner !== 'player') {
      const tg = P.vehicle || P;
      const t = P.vehicle ? Math.max(...P.vehicle.circ.map(o => ray(P.vehicle.x + Math.cos(P.vehicle.a) * o, P.vehicle.y + Math.sin(P.vehicle.a) * o, P.vehicle.r))) : ray(P.x, P.y, 12);
      if (t >= 0 && t < best && !P.downed) { best = t; hit = tg; hitKind = 'player'; }
    }
    for (const p of G.peds) {
      if (p === shooter || p.state === 'down') continue;
      if (owner === 'cop' && p.kind === 'cop') continue;
      if (owner === 'goon' && p.kind === 'goon') continue;
      if (Math.abs(p.x - x) > w.range || Math.abs(p.y - y) > w.range) continue;
      const t = ray(p.x, p.y, 11);
      if (t >= 0 && t < best) { best = t; hit = p; hitKind = 'ped'; }
    }
    for (const v of G.vehicles) {
      if (v.driver === 'player' && owner === 'player') continue;
      if (owner === 'cop' && v.isCop) continue;
      if (Math.abs(v.x - x) > w.range + v.L || Math.abs(v.y - y) > w.range + v.L) continue;
      const cav = Math.cos(v.a), sav = Math.sin(v.a);
      for (const o of v.circ) { const t = ray(v.x + cav * o, v.y + sav * o, v.r); if (t >= 0 && t < best) { best = t; hit = v; hitKind = 'veh'; } }
    }
    const ex = x + ca * best, ey = y + sa * best;
    this.tracers.push({ x1: x, y1: y, x2: ex, y2: ey, life: 0.07, c: owner === 'player' ? '255,235,160' : '255,140,90' });
    if (!hit) { G.particle('spark', ex, ey); return; }
    if (hitKind === 'player') {
      if (P.vehicle) { P.vehicle.hp -= w.dmg * 0.35 / (P.vehicle.t.armor || 1); G.particle('spark', ex, ey); if (P.vehicle.hp <= 0 && !P.vehicle.dead) P.vehicle.wreck(); }
      else P.hurt(w.dmg, x, y);
      return;
    }
    if (hitKind === 'ped') {
      const p = hit;
      p.hp -= w.dmg;
      G.particle('hit', ex, ey);
      if (p.hp <= 0) { p.knock(x, y, 220 + w.dmg * 3); p.downT = p.kind === 'goon' ? 999 : U.rand(10, 16); p.hp = 100; if (p.kind === 'goon') p.ko = true; }
      else if (p.kind === 'ped' && !p.npc) { p.state = 'flee'; p.fleeT = 5; p.tx = x; p.ty = y; }
      if (owner === 'player') {
        if (p.kind === 'cop') WANTED.crime(4, p.x, p.y, true);
        else if (p.kind === 'goon') { p.hostile = true; }
        else if (!p.npc && !p.snatcher && p.kind !== 'dog') WANTED.crime(3, P.x, P.y);
      }
      return;
    }
    // vehicle
    const v = hit;
    v.hp -= w.dmg * 0.5 / (v.t.armor || 1); v.lastImpact = 0;
    G.particle('spark', ex, ey);
    if (w === WEAPONS.shotgun && Math.random() < 0.15) v.popped = true;
    if (owner === 'player') {
      if (v.isCop && v.driver) { v.lastHitByPlayer = true; WANTED.crime(3, v.x, v.y, true); }
      else if (v.driver && !v.criminal && !v.goon) WANTED.crime(2, v.x, v.y);
    }
    if (v.hp <= 0 && !v.dead) v.wreck();
  },
  // ---------- grenades ----------
  grenades: [],
  throwGrenade() {
    const P = G.player;
    if (P.vehicle || (P.fireCd || 0) > 0) return;
    if (!P.weapons.granada) { UI.toast('Ubos ang granada! Bumili sa Armas.'); return; }
    P.weapons.granada--; P.fireCd = 0.8; P.punchT = 0.25;
    const a = this.aimAngle(320);
    let dist = 260;
    if (G.time - this.mouse.t < 2.5 && !INPUT.touch) dist = U.clamp(U.dist(P.x, P.y, this.mouse.wx, this.mouse.wy), 60, 320);
    else { const t = this.bestTarget(P.x, P.y, P.a, 320, 0.7); if (t) dist = U.clamp(U.dist(P.x, P.y, t.x, t.y), 60, 320); }
    P.a = a;
    this.grenades.push({ x: P.x, y: P.y, sx: P.x, sy: P.y, tx: P.x + Math.cos(a) * dist, ty: P.y + Math.sin(a) * dist, t: 0, fuse: 1.5, h: 0 });
    AUD.whoosh();
  },
  updateGrenades(dt) {
    for (const g of this.grenades) {
      g.t += dt;
      const k = Math.min(1, g.t / 0.7);
      let nx = U.lerp(g.sx, g.tx, k), ny = U.lerp(g.sy, g.ty, k);
      if (MAP.solidAt(nx, ny)) { g.tx = g.x; g.ty = g.y; g.sx = g.x; g.sy = g.y; nx = g.x; ny = g.y; }
      g.x = nx; g.y = ny; g.h = Math.sin(k * Math.PI) * 40;
      if (g.t >= g.fuse) {
        g.done = true;
        G.explosion(g.x, g.y);
        for (const p of G.peds) if (p.kind === 'goon' && U.d2(p.x, p.y, g.x, g.y) < 140 * 140) { p.ko = true; p.downT = 999; }
        this.gunshot(g.x, g.y);
        if (G.peds.some(p => p.kind !== 'goon' && !p.npc && U.d2(p.x, p.y, g.x, g.y) < 160 * 160)) WANTED.crime(3, g.x, g.y);
      }
    }
    this.grenades = this.grenades.filter(g => !g.done);
  },
  // ---------- drawing ----------
  draw(g, inV) {
    for (const t of this.tracers) {
      g.strokeStyle = `rgba(${t.c},${Math.min(1, t.life / 0.07)})`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(t.x1, t.y1); g.lineTo(t.x2, t.y2); g.stroke();
    }
    for (const gr of this.grenades) {
      if (!inV(gr.x, gr.y, 20)) continue;
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(gr.x + 3, gr.y + 4, 5, 0, TAU); g.fill();
      g.fillStyle = '#4b5a32'; g.beginPath(); g.arc(gr.x, gr.y - gr.h, 5.5, 0, TAU); g.fill();
      if (Math.floor(gr.t * 8) % 2) { g.fillStyle = '#ff3030'; g.beginPath(); g.arc(gr.x, gr.y - gr.h - 3, 2, 0, TAU); g.fill(); }
    }
    // aim reticle (desktop mouse)
    const P = G.player, w = WEAPONS[this.cur()];
    if (w && (w.gun || w.throw) && G.time - this.mouse.t < 2.5 && !INPUT.touch && !(P.vehicle && w.throw)) {
      const mx = this.mouse.wx, my = this.mouse.wy;
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2;
      g.beginPath(); g.arc(mx, my, 10, 0, TAU); g.moveTo(mx - 16, my); g.lineTo(mx - 6, my); g.moveTo(mx + 6, my); g.lineTo(mx + 16, my); g.moveTo(mx, my - 16); g.lineTo(mx, my - 6); g.moveTo(mx, my + 6); g.lineTo(mx, my + 16); g.stroke();
    }
  },
  // ---------- shop ----------
  unlocked() { return true; },
  openShop() {
    const P = G.player;
    if (!this.unlocked()) { UI.toast('🔒 Sarado pa ang Armas — bumalik pagkatapos ng Misyon 2.'); AUD.fail(); return; }
    G.paused = true;
    const el = document.getElementById('shop-list');
    document.getElementById('shop-title').textContent = 'ARMAS NI KABO';
    const bar = (v, max) => `<span class="sbar"><i style="width:${Math.round(Math.min(1, v / max) * 100)}%"></i></span>`;
    const rows = [];
    for (const id of GUN_IDS) {
      const w = WEAPONS[id], own = this.owned(id);
      rows.push(`<div class="shoprow gunrow"><span class="ic">${w.icon}</span><div><b>${w.name}</b><small>${w.desc}</small>
        <div class="stats"><span>Lakas ${bar(w.dmg * w.pellets, 140)}</span><span>Bilis ${bar(1 / w.rate, 12)}</span><span>Abot ${bar(w.range, 700)}</span></div>
        ${own ? `<small>Bala: ${this.mag(id)} / ${P.weapons[id]}</small>` : ''}</div>
        ${own ? `<button data-buy="ammo:${id}">+${w.pack} BALA · ${U.money(w.ammoPrice)}</button>` : `<button data-buy="${id}">BILHIN · ${U.money(w.price)}</button>`}</div>`);
    }
    const gr = WEAPONS.granada;
    rows.push(`<div class="shoprow"><span class="ic">${gr.icon}</span><div><b>${gr.name} ×${gr.pack}</b><small>${gr.desc}${this.owned('granada') ? ` · meron: ${P.weapons.granada}` : ''}</small></div><button data-buy="granada">BILHIN · ${U.money(gr.price)}</button></div>`);
    rows.push(`<div class="shoprow"><span class="ic">🦺</span><div><b>Bulletproof Vest</b><small>Sumasalo ng karamihan ng tama. Ngayon: ${Math.round(P.armor || 0)}/100</small></div><button data-buy="vest" ${P.armor >= 100 ? 'disabled' : ''}>${P.armor >= 100 ? 'PUNO' : 'BILHIN · ' + U.money(1200)}</button></div>`);
    rows.push(`<div class="shoprow"><span class="ic">🥫</span><div><b>Barilan ng Lata (Shooting Range)</b><small>30 segundo — patamaan ang mga lata. Premyo kapag 25+ ang tama! Pinakamataas: ${G.stats.rangeBest || 0}</small></div><button data-buy="range">LARO · ${U.money(100)}</button></div>`);
    el.innerHTML = rows.join('');
    el.querySelectorAll('button[data-buy]').forEach(b => b.onclick = () => this.buy(b.dataset.buy));
    UI.show('shop');
  },
  buy(k) {
    const P = G.player;
    const pay = (n) => { if (P.money < n) { UI.toast('Kulang ang pera mo!'); AUD.fail(); return false; } G.addMoney(-n); AUD.cash(); return true; };
    if (k === 'range') { if (!pay(100)) return; UI.hide('shop'); RANGE.start(); return; }
    if (k === 'vest') { if (!pay(1200)) return; P.armor = 100; UI.toast('🦺 Suot mo na ang bulletproof vest!'); }
    else if (k === 'granada') { if (!pay(WEAPONS.granada.price)) return; P.weapons.granada = (P.weapons.granada || 0) + 3; P.weapon = 'granada'; }
    else if (k.startsWith('ammo:')) { const id = k.slice(5), w = WEAPONS[id]; if (!pay(w.ammoPrice)) return; P.weapons[id] += w.pack; }
    else { const w = WEAPONS[k]; if (!pay(w.price)) return; P.weapons[k] = w.pack; P.mags = P.mags || {}; P.mags[k] = w.mag; P.weapon = k; UI.toast(`${w.icon} Nabili: ${w.name}! (Q / 🔄 para magpalit)`); TIP.show('guns'); }
    ACH.check(); SAVE.auto();
    this.openShop();
  },
};

// ===== Gang hideouts (Kuta ng Sindikato): armed goons, no wanted level for fighting them =====
const KUTA = {
  t: 0, list: null,
  defs() {
    if (this.list) return this.list;
    const mk = (key, bi, bj, name) => { const [x0, y0, w, h] = MAP.blockRect(bi, bj); return { key, name, x: (x0 + w / 2) * T, y: (y0 + h / 2) * T, r: w * T / 2 }; };
    this.list = [mk('tondo', 1, -1, 'Kuta sa Tondo'), mk('pantalan', 0, 0, 'Kuta sa Pantalan'), mk('pasay', 2, 8, 'Kuta sa Pasay')];
    return this.list;
  },
  on() { return MS.idx >= 2; },
  cleared(k) { return !!(G.flags.kuta && G.flags.kuta[k]); },
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 0.5;
    if (!KUTA.on()) return;
    const P = G.player;
    for (const k of this.defs()) {
      const d = U.dist(P.x, P.y, k.x, k.y);
      if (this.cleared(k.key)) { if (k.goons && d > 1300) { for (const g of k.goons) g.remove = true; k.goons = null; } continue; }
      if (!k.goons && d < 1000 && d > 500) this.spawn(k);
      if (k.goons && d > 1800) { for (const g of k.goons) g.remove = true; k.goons = null; continue; }
      if (k.goons) {
        const left = k.goons.filter(g => !g.ko && !g.remove).length;
        k.left = left;
        if (left === 0) {
          G.flags.kuta = G.flags.kuta || {}; G.flags.kuta[k.key] = true;
          G.addMoney(3000, true); PROG.xp(120, 'Kuta'); if (GUNS.owned('pistola')) P.weapons.pistola += 24;
          UI.big('KUTA NALINIS!', `${k.name} · +₱3,000`, 2.5, 'good'); AUD.success(); ACH.check(); SAVE.auto();
        }
      }
    }
  },
  spawn(k) {
    k.goons = [];
    for (let n = 0; n < 6; n++) {
      let x, y, tries = 0;
      do { x = k.x + U.rand(-k.r * 0.8, k.r * 0.8); y = k.y + U.rand(-k.r * 0.8, k.r * 0.8); tries++; } while ((MAP.solidAt(x, y) || TRAFFIC.inView(x, y, 20)) && tries < 30);
      if (tries >= 30) continue;
      const p = new Person(x, y, 'goon', { skin: U.choice(SKINS), shirt: U.choice(['#24262b', '#3b1f1f', '#2b2b3b']), pat: 'plain', outfit: 'goon', hair: 'cap_red', hairCol: '#111', pants: '#1f2633' });
      p.keep = true; p.home = { x, y }; p.state = 'guard'; p.hp = 100; p.gunCd = U.rand(0.5, 1.5); p.kuta = k.key; p.weapon = n === 0 ? 'shotgun' : 'pistola'; p.umb = null;
      k.goons.push(p); G.peds.push(p);
    }
  },
  near() { const P = G.player; return this.defs().find(k => k.goons && U.dist(P.x, P.y, k.x, k.y) < 900 && k.left > 0); },
};

// goon behaviour (called from Person.updateAI)
function updateGoon(p, dt) {
  const P = G.player, tg = P.vehicle || P;
  if (p.ko) { p.state = 'down'; p.downT = 999; return; }
  const d = U.dist(p.x, p.y, tg.x, tg.y);
  const sees = d < 430 && MAP.los(p.x, p.y, tg.x, tg.y);
  if (sees && !P.downed && (!MS.active || p.mgoon)) p.hostile = true;
  if (!p.hostile || d > (p.mgoon ? 1400 : 900) || P.downed) {
    if (!p.tgt || U.d2(p.x, p.y, p.tgt.x, p.tgt.y) < 64) p.tgt = { x: p.home.x + U.rand(-90, 90), y: p.home.y + U.rand(-90, 90) };
    p.walkTo(p.tgt.x, p.tgt.y, 45, dt);
  } else {
    const a = Math.atan2(tg.y - p.y, tg.x - p.x);
    p.a = a;
    // keep distance and strafe
    const want = d > 300 ? 1 : d < 170 ? -1 : 0, side = Math.sin(G.time * 1.3 + p.x) > 0 ? 1 : -1;
    p.vx = Math.cos(a) * want * 120 - Math.sin(a) * side * 60; p.vy = Math.sin(a) * want * 120 + Math.cos(a) * side * 60; p.moveAmt = 0.8;
    p.gunCd -= dt;
    if (p.gunCd <= 0 && sees) {
      p.gunCd = U.rand(0.7, 1.3) / Math.max(0.6, D().copSpeed);
      p.punchT = 0.12;
      GUNS.bullet(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14, a + U.rand(-0.14, 0.14), { dmg: 9, range: 460, pellets: 1 }, 'goon', p);
      GUNS.flash(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14, a);
      AUD.gun('pistola', Math.max(0.15, 1 - d / 900));
    }
  }
  p.phase += dt * p.moveAmt * 12;
  p.move(dt);
}

// ===== Shooting range mini-game (Barilan ng Lata) =====
const RANGE = {
  active: false,
  start() {
    G.paused = true; this.active = true;
    const c = document.getElementById('mg-canvas'); this.c = c; this.g = c.getContext('2d');
    this.t = 30; this.hits = 0; this.shots = 0; this.cans = []; this.spawnT = 0; this.fx = [];
    document.getElementById('mg-title').textContent = '🥫 BARILAN NG LATA';
    document.getElementById('mg-help').textContent = 'I-tap / i-click ang mga lata bago sila mawala!';
    UI.show('minigame');
    this.resize();
    c.onpointerdown = (e) => { e.preventDefault(); this.shoot(e); };
    document.getElementById('mg-quit').onclick = () => this.end(true);
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  },
  resize() { const r = this.c.getBoundingClientRect(); this.c.width = r.width * 2; this.c.height = r.height * 2; this.W = this.c.width; this.H = this.c.height; },
  shoot(e) {
    const r = this.c.getBoundingClientRect(), x = (e.clientX - r.left) * 2, y = (e.clientY - r.top) * 2;
    this.shots++; AUD.gun('pistola', 0.8);
    this.fx.push({ x, y, t: 0.15 });
    for (const can of this.cans) if (!can.hit && Math.hypot(can.x - x, can.y - y) < can.s * 1.2) { can.hit = true; can.vy = -900; can.vx = U.rand(-300, 300); this.hits++; AUD.tone(1600, 0.06, 'square', 0.05); return; }
  },
  loop(t) {
    if (!this.active) return;
    const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
    this.t -= dt; this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = U.rand(0.35, 0.7);
      const fence = this.H * U.choice([0.38, 0.6, 0.82]);
      this.cans.push({ x: U.rand(this.W * 0.08, this.W * 0.92), y: fence, s: this.W * 0.03, life: U.rand(1.1, 1.8), col: U.choice(['#c0392b', '#27ae60', '#f1c40f', '#2e86c1']) });
    }
    const g = this.g, W = this.W, H = this.H;
    g.fillStyle = '#5a4632'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#7a6040'; for (const f of [0.38, 0.6, 0.82]) g.fillRect(0, H * f + W * 0.03, W, H * 0.03);
    for (const can of this.cans) {
      can.life -= dt;
      if (can.hit) { can.vy += 2400 * dt; can.x += can.vx * dt; can.y += can.vy * dt; }
      g.save(); g.translate(can.x, can.y); if (can.hit) g.rotate(can.life * 10);
      g.fillStyle = can.col; g.fillRect(-can.s * 0.6, -can.s, can.s * 1.2, can.s * 2);
      g.fillStyle = '#ddd'; g.fillRect(-can.s * 0.6, -can.s, can.s * 1.2, can.s * 0.25); g.fillRect(-can.s * 0.6, can.s * 0.75, can.s * 1.2, can.s * 0.25);
      g.restore();
    }
    this.cans = this.cans.filter(c => c.life > 0 && c.y < H + 100);
    for (const f of this.fx) { f.t -= dt; g.strokeStyle = `rgba(255,220,120,${f.t / 0.15})`; g.lineWidth = 6; g.beginPath(); g.arc(f.x, f.y, 30 * (1 - f.t / 0.15) + 10, 0, TAU); g.stroke(); }
    this.fx = this.fx.filter(f => f.t > 0);
    g.fillStyle = '#fff'; g.font = `bold ${W * 0.035}px Nunito, sans-serif`; g.textAlign = 'left';
    g.fillText(I18N.t(`Tama: ${this.hits}`), W * 0.03, H * 0.1); g.textAlign = 'right'; g.fillText(`⏱ ${Math.ceil(Math.max(0, this.t))}s`, W * 0.97, H * 0.1);
    if (this.t <= 0) { this.end(false); return; }
    requestAnimationFrame((tt) => this.loop(tt));
  },
  end(quit) {
    this.active = false; UI.hide('minigame'); G.paused = false;
    if (quit) return;
    const best = G.stats.rangeBest || 0;
    if (this.hits > best) G.stats.rangeBest = this.hits;
    const prize = this.hits >= 35 ? 1500 : this.hits >= 25 ? 500 : 0;
    if (prize) { G.addMoney(prize, true); UI.big('MAGALING!', `${this.hits} tama · +${U.money(prize)}`, 2.5, 'good'); }
    else UI.big('TAPOS!', `${this.hits} tama — 25+ para sa premyo`, 2.5);
    ACH.check();
  },
};
