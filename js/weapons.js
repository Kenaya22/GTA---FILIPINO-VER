'use strict';
// ===== Weapons (cartoonish, non-lethal) & projectiles =====
const WEAPONS = {
  fists: { name: 'Kamao', icon: '👊' },
  pamalo: { name: 'Pamalo', icon: '🏏', price: 300, desc: 'Malakas na palo, mas malayo ang abot' },
  tirador: { name: 'Tirador', icon: '🎯', price: 800, ammo: 20, ammoPrice: 100, desc: 'Tirador na may batong bala (auto-aim)' },
  watergun: { name: 'Water Gun', icon: '💦', price: 500, ammo: 100, ammoPrice: 50, desc: 'Basain sila! Madudulas ang mga tao' },
};
const WEAPON_ORDER = ['fists', 'pamalo', 'tirador', 'watergun'];

const ARMS = {
  cycle() {
    const P = G.player; if (!P.weapons) return;
    const owned = WEAPON_ORDER.filter(w => P.weapons[w] !== undefined && P.weapons[w] !== false);
    const i = owned.indexOf(P.weapon);
    P.weapon = owned[(i + 1) % owned.length];
    AUD.click(); UI.toast(`${WEAPONS[P.weapon].icon} ${WEAPONS[P.weapon].name}`);
  },
  label() {
    const P = G.player, w = WEAPONS[P.weapon || 'fists'];
    const ammo = typeof P.weapons[P.weapon] === 'number' ? ` ×${P.weapons[P.weapon]}` : '';
    return `${w.icon} ${w.name}${ammo}`;
  },
  attack() {
    const P = G.player;
    if (P.vehicle || P.downed) return;
    switch (P.weapon) {
      case 'pamalo': return this.melee(36, 30, 240, 0.55, 'swing');
      case 'tirador': return this.shoot();
      case 'watergun': return; // handled while held
      default: return P.punch();
    }
  },
  melee(reach, rad, force, cd) {
    const P = G.player;
    if (P.punchCd > 0) return;
    P.punchCd = cd; P.punchT = 0.25; P.swingT = 0.25;
    const hx = P.x + Math.cos(P.a) * reach, hy = P.y + Math.sin(P.a) * reach;
    let hit = false;
    for (const p of G.peds) {
      if (p.state === 'down') continue;
      if (U.d2(hx, hy, p.x, p.y) < rad * rad) {
        hit = true; p.knock(P.x, P.y, force); p.hp = 100;
        this.crimeOn(p);
        G.particle('hit', p.x, p.y);
      }
    }
    for (const v of G.vehicles) if (U.d2(hx, hy, v.x, v.y) < (v.L / 2 + 10) ** 2 && !v.burnt) { hit = true; v.hp -= 6; v.lastImpact = 0; G.particle('spark', hx, hy); if (v.isCop && v.driver) WANTED.crime(2, v.x, v.y, true); }
    if (hit) AUD.punch(); else AUD.whoosh();
  },
  crimeOn(p) {
    if (p.kind === 'cop') WANTED.crime(3, p.x, p.y, true);
    else if (!p.npc) { WANTED.crime(1, G.player.x, G.player.y); G.panic(p.x, p.y, 260); }
  },
  aim(range, cone) {
    const P = G.player;
    let best = null, bs = 1e9;
    const cand = G.peds.filter(p => p.state !== 'down' && !p.npc).concat(G.vehicles.filter(v => v.driver && !v.burnt && v.driver !== 'player'));
    for (const t of cand) {
      const d = U.dist(P.x, P.y, t.x, t.y); if (d > range || d < 10) continue;
      const da = Math.abs(U.angDiff(P.a, Math.atan2(t.y - P.y, t.x - P.x)));
      if (da > cone || !MAP.los(P.x, P.y, t.x, t.y)) continue;
      const sc = d + da * 300; if (sc < bs) { bs = sc; best = t; }
    }
    return best;
  },
  shoot() {
    const P = G.player;
    if (P.punchCd > 0) return;
    if (!P.weapons.tirador) { UI.toast('Ubos ang bato! Bumili sa Hardware.'); AUD.click(); return; }
    P.punchCd = 0.45; P.punchT = 0.15;
    P.weapons.tirador--;
    const t = this.aim(420, 0.6);
    const a = t ? Math.atan2(t.y + (t.vy || 0) * 0.15 - P.y, t.x + (t.vx || 0) * 0.15 - P.x) : P.a;
    if (t) P.a = a;
    G.projectiles.push({ x: P.x + Math.cos(a) * 14, y: P.y + Math.sin(a) * 14, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, life: 0.7, type: 'pebble', owner: 'player' });
    AUD.tone(900, 0.06, 'square', 0.05, 300);
  },
  spray(dt) {
    const P = G.player;
    P.sprayT = (P.sprayT || 0) - dt;
    if (P.sprayT > 0) return;
    if (!P.weapons.watergun) { if (!this.emptyMsg) { UI.toast('Ubos ang tubig! Mag-refill sa Hardware.'); this.emptyMsg = 3; } return; }
    P.sprayT = 0.05; P.weapons.watergun--;
    const a = P.a + U.rand(-0.08, 0.08);
    G.projectiles.push({ x: P.x + Math.cos(a) * 14, y: P.y + Math.sin(a) * 14, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, life: 0.5, type: 'water', owner: 'player' });
    if (G.frame % 6 === 0) AUD.noise(0.08, 0.05, 3000, 0, 'highpass');
  },
  update(dt) {
    if (this.emptyMsg > 0) this.emptyMsg -= dt;
    const P = G.player;
    for (const b of G.projectiles) {
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (MAP.solidAt(b.x, b.y) && MAP.tileAt(b.x, b.y) !== TL.WATER) { b.life = 0; if (b.type === 'water') G.particle('splash', b.x, b.y); continue; }
      if (b.owner === 'cop') {
        const tg = P.vehicle || P;
        if (U.d2(b.x, b.y, tg.x, tg.y) < (P.vehicle ? P.vehicle.W / 2 + 6 : 12) ** 2) {
          b.life = 0;
          if (P.vehicle) { P.vehicle.hp -= 3; P.vehicle.lastImpact = 0; } else P.hurt(5, b.x, b.y);
          G.particle('spark', b.x, b.y);
        }
        continue;
      }
      for (const p of G.peds) {
        if (p.state === 'down' || U.d2(b.x, b.y, p.x, p.y) > 13 * 13) continue;
        b.life = 0;
        if (b.type === 'pebble') { p.hp -= 40; if (p.hp <= 0) { p.knock(b.x - b.vx, b.y - b.vy, 200); p.hp = 100; } else { p.vx += b.vx * 0.1; p.vy += b.vy * 0.1; if (!p.npc && p.kind !== 'cop') { p.state = 'flee'; p.fleeT = 3; p.tx = P.x; p.ty = P.y; } } AUD.punch(); this.crimeOn(p); }
        else {
          p.wet = (p.wet || 0) + 0.12; p.vx += b.vx * 0.05; p.vy += b.vy * 0.05;
          if (p.wet > 1) { p.wet = 0; p.knock(b.x - b.vx, b.y - b.vy, 120); this.crimeOn(p); }
          else if (!p.npc && p.kind !== 'cop' && p.state !== 'flee') { p.state = 'flee'; p.fleeT = 2.5; p.tx = P.x; p.ty = P.y; }
          G.particle('splash', b.x, b.y);
        }
        break;
      }
      if (b.life <= 0) continue;
      for (const v of G.vehicles) {
        if (v.driver === 'player' || U.d2(b.x, b.y, v.x, v.y) > (v.L / 2) ** 2) continue;
        b.life = 0;
        if (b.type === 'pebble') { v.hp -= 4; G.particle('spark', b.x, b.y); AUD.tone(1800, 0.04, 'square', 0.04); if (v.isCop && v.driver) WANTED.crime(2, v.x, v.y, true); }
        else { G.particle('splash', b.x, b.y); if (v.dead && v.burn > 0) v.burn += 0.05; }
        break;
      }
    }
    G.projectiles = G.projectiles.filter(b => b.life > 0);
  },
  // cops fire rubber pellets at 5+ stars
  copFire(cop, dt) {
    if (WANTED.stars < D().pellet || WANTED.mode !== 'chase') return;
    cop.shootCd = (cop.shootCd || U.rand(0.5, 1.5)) - dt;
    if (cop.shootCd > 0) return;
    const P = G.player, tg = P.vehicle || P;
    const d = U.dist(cop.x, cop.y, tg.x, tg.y);
    if (d < 90 || d > 380 || !MAP.los(cop.x, cop.y, tg.x, tg.y)) { cop.shootCd = 0.4; return; }
    cop.shootCd = U.rand(1.1, 1.8);
    const a = Math.atan2(tg.y + (tg.vy || 0) * 0.3 - cop.y, tg.x + (tg.vx || 0) * 0.3 - cop.x) + U.rand(-0.12, 0.12);
    cop.a = a; cop.punchT = 0.15;
    G.projectiles.push({ x: cop.x + Math.cos(a) * 14, y: cop.y + Math.sin(a) * 14, vx: Math.cos(a) * 650, vy: Math.sin(a) * 650, life: 0.8, type: 'pellet', owner: 'cop' });
    AUD.tone(500, 0.05, 'square', 0.05, 150);
  },
  draw(g, inV) {
    for (const b of G.projectiles) {
      if (!inV(b.x, b.y, 10)) continue;
      if (b.type === 'pebble') { g.fillStyle = '#b9b2a4'; g.beginPath(); g.arc(b.x, b.y, 3, 0, TAU); g.fill(); }
      else if (b.type === 'water') { g.fillStyle = 'rgba(120,190,255,0.75)'; g.beginPath(); g.arc(b.x, b.y, 3.5, 0, TAU); g.fill(); }
      else { g.fillStyle = '#ff9a3c'; g.beginPath(); g.arc(b.x, b.y, 2.5, 0, TAU); g.fill(); }
    }
  },
  // hardware shop
  shopLabel() { return 'Hardware — bili ng armas at bala'; },
  openShop() {
    const P = G.player;
    G.paused = true;
    const el = document.getElementById('shop-list');
    document.getElementById('shop-title').textContent = 'HARDWARE NI MANG TONYO';
    const rows = [];
    for (const id of ['pamalo', 'tirador', 'watergun']) {
      const w = WEAPONS[id], own = P.weapons[id] !== undefined;
      rows.push(`<div class="shoprow"><span class="ic">${w.icon}</span><div><b>${w.name}</b><small>${w.desc}${own && w.ammo ? ` · meron: ${P.weapons[id]}` : ''}</small></div>
        ${own ? (w.ammo ? `<button data-buy="ammo:${id}">+${w.ammo} ${id === 'tirador' ? 'bato' : 'tubig'} · ${U.money(w.ammoPrice)}</button>` : '<button disabled>✓ MERON NA</button>') : `<button data-buy="${id}">BILHIN · ${U.money(w.price)}</button>`}</div>`);
    }
    el.innerHTML = rows.join('');
    el.querySelectorAll('button[data-buy]').forEach(b => b.onclick = () => {
      const k = b.dataset.buy, ammo = k.startsWith('ammo:'), id = ammo ? k.slice(5) : k, w = WEAPONS[id];
      const cost = ammo ? w.ammoPrice : w.price;
      if (P.money < cost) { UI.toast('Kulang ang pera mo!'); AUD.fail(); return; }
      G.addMoney(-cost); AUD.cash();
      if (ammo) P.weapons[id] += w.ammo;
      else { P.weapons[id] = w.ammo ? w.ammo : true; P.weapon = id; UI.toast(`${w.icon} Nabili: ${w.name}! (Q / 🔄 para magpalit)`); }
      ACH.check();
      this.openShop();
    });
    UI.show('shop');
  },
};
