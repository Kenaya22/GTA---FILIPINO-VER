'use strict';
// ===== A livelier world: interiors, random street events, a stray dog, regional collectibles =====

// ---------- interiors (simple "room" screens) ----------
const INTERIOR = {
  open(p) {
    const P = G.player, kind = p.type;
    G.paused = true;
    const room = {
      kainan: { title: '🍗 MANUKAN SA KANTO', art: '🍗🍟🥤🍦', bg: 'linear-gradient(160deg,#c0392b,#e67e22)', desc: 'Mabangong manok, mainit na kanin at malamig na halo-halo.' },
      mall: { title: '🏬 ' + p.label.toUpperCase(), art: '🛍️🎮📸❄️', bg: 'linear-gradient(160deg,#2c5aa0,#16a085)', desc: 'Malamig ang aircon! Mamili, maglaro o magtago muna.' },
      church: { title: '⛪ ' + p.label.toUpperCase(), art: '🕯️⛪🙏🕊️', bg: 'linear-gradient(160deg,#5b4a36,#a0784a)', desc: 'Tahimik. Mabango ang kandila.' },
    }[kind];
    const acts = {
      kainan: [
        ['🍗', 'Pritong Manok + Kanin', 'Full heal', 99, () => { P.hp = 100; }],
        ['🍝', 'Matamis na Spaghetti', '+50 buhay at 90s na SIGLA (mas mabilis tumakbo)', 79, () => { P.hp = Math.min(100, P.hp + 50); P.buffT = 90; }],
        ['🍧', 'Halo-halo', '+30 buhay', 59, () => { P.hp = Math.min(100, P.hp + 30); }],
      ],
      mall: [
        ['👕', 'Boutique', 'Damit at aksesorya', 0, () => { UI.hide('interior'); WARDROBE.open(); return 'keep'; }],
        ['🕹', 'Arcade: 3-Point Shootout', 'Libre!', 0, () => { UI.hide('interior'); MG.run(SHOOTOUT); return 'keep'; }],
        ['🎤', 'Videoke Booth', '₱20 kada kanta', 0, () => { UI.hide('interior'); VIDEOKE.pick(); return 'keep'; }],
        ['❄️', 'Magpalamig at magtago', WANTED.stars > 0 && WANTED.stars <= 2 && WANTED.mode !== 'chase' ? 'Mawawala ang 1–2 bituin habang nasa loob' : 'Pahinga sa aircon (+20 buhay)', 0, () => {
          if (WANTED.stars > 0 && WANTED.stars <= 2 && WANTED.mode !== 'chase') { WANTED.clear(true); UI.toast('❄️ Nagtago ka sa mall — nawala ka sa paningin ng pulis!'); }
          else P.hp = Math.min(100, P.hp + 20);
        }],
      ],
      church: [
        ['🙏', 'Magdasal', 'Libreng full heal (isang beses bawat araw)', 0, () => {
          if (G.flags.prayDay === WORLD.day) { UI.toast('🙏 Nakapagdasal ka na ngayong araw.'); return 'keep'; }
          G.flags.prayDay = WORLD.day; P.hp = 100; PROG.xp(15, 'Dasal');
        }],
        ['🕯', 'Magsindi ng kandila', 'Para sa mga mahal sa buhay', 20, () => { G.stats.candles = (G.stats.candles || 0) + 1; }],
        ...(FIESTA.pasko() ? [['🌅', 'Simbang Gabi', '4–6 AM lang — kumpletuhin ang 9 na araw!', 0, () => {
          const h = WORLD.hour(); if (h < 4 || h >= 6) { UI.toast('🌅 Ang Simbang Gabi ay tuwing 4–6 AM.'); return 'keep'; }
          const sg = G.flags.simbang = G.flags.simbang || []; if (sg.includes(WORLD.day)) { UI.toast('Nakadalo ka na ngayong araw.'); return 'keep'; }
          sg.push(WORLD.day); PROG.xp(30, 'Simbang Gabi'); UI.toast(`🌅 Simbang Gabi: ${sg.length}/9 na araw`); ACH.check();
          if (sg.length === 9) { G.addMoney(3000, true); UI.big('🌅 KUMPLETO ANG SIMBANG GABI!', 'Matutupad daw ang hiling mo · +₱3,000', 3, 'good'); }
        }]] : []),
      ],
    }[kind];
    document.getElementById('int-title').textContent = room.title;
    const art = document.getElementById('int-art'); art.textContent = room.art; art.style.background = room.bg;
    document.getElementById('int-desc').textContent = room.desc;
    const el = document.getElementById('int-list');
    el.innerHTML = acts.map((a, i) => `<div class="shoprow"><span class="ic">${a[0]}</span><div><b>${a[1]}</b><small>${a[2]}</small></div><button data-i="${i}">${a[3] ? U.money(a[3]) : 'PUMILI'}</button></div>`).join('');
    el.querySelectorAll('button').forEach(b => b.onclick = () => {
      const a = acts[+b.dataset.i];
      if (a[3] && !SHOP.pay(a[3])) return;
      AUD.cash();
      const r = a[4]();
      if (r !== 'keep') { UI.toast(`${a[0]} ${a[1]}!`); G.stats.indoor = (G.stats.indoor || 0) + 1; }
      if (!document.getElementById('interior').classList.contains('hidden')) this.open(p);
    });
    UI.show('interior');
    AUD.door();
  },
  close() { UI.hide('interior'); G.paused = false; },
};

// ---------- random street events ----------
const STREET = {
  ev: null, t: 40, dog: null,
  update(dt) {
    const P = G.player;
    this.updateDog(dt);
    if (this.ev) { this.updateEvent(dt); return; }
    this.t -= dt;
    if (this.t > 0 || MS.active || JOBS.active || WANTED.stars > 0 || G.cutscene) return;
    this.t = U.rand(70, 130);
    const kinds = ['snatcher', 'lost', 'accident'];
    if (!this.dog && !this.dogNear) kinds.push('dog');
    this.start(U.choice(kinds));
  },
  spot(minD = 420, maxD = 800, tiles = [TL.SIDE, TL.PLAZA, TL.PROM]) {
    const P = G.player;
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * TAU, r = U.rand(minD, maxD), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
      if (tiles.includes(MAP.tileAt(x, y)) && !TRAFFIC.inView(x, y, 20)) return { x, y };
    }
    return null;
  },
  start(kind) {
    const pt = this.spot(kind === 'dog' ? 300 : 420, kind === 'dog' ? 600 : 800); if (!pt) return;
    const e = this.ev = { kind, t: 0, x: pt.x, y: pt.y };
    if (kind === 'snatcher') {
      const v = new Person(pt.x, pt.y, 'ped'); v.npc = true; v.keep = true; v.state = 'idle'; v.umb = null; G.peds.push(v);
      const s = new Person(pt.x + 20, pt.y, 'ped', { skin: U.choice(SKINS), shirt: '#24262b', pat: 'hood', outfit: 'npc', hair: 'cap_red', hairCol: '#111', pants: '#1f2633' });
      s.keep = true; s.snatcher = true; s.state = 'flee'; s.fleeT = 999; s.tx = G.player.x; s.ty = G.player.y; s.umb = null; G.peds.push(s);
      e.victim = v; e.s = s; v.say = 'MAGNANAKAW! Tulong!'; v.sayT = 4;
      UI.toast('🚨 May snatcher! Habulin at patumbahin siya!');
    } else if (kind === 'lost') {
      const k = new Person(pt.x, pt.y, 'ped', { skin: U.choice(SKINS), shirt: U.choice(['#f1c40f', '#e84393', '#16a085']), pat: 'plain', outfit: 'npc', hair: 'short', hairCol: '#1b1410', pants: '#2b3a55' });
      k.npc = true; k.keep = true; k.state = 'idle'; k.scale = 0.72; k.umb = null; G.peds.push(k);
      const mom = this.spot(900, 1500);
      if (!mom) { k.remove = true; this.ev = null; return; }
      e.kid = k; e.mom = mom; k.say = 'Huhu... nasaan si Nanay?'; k.sayT = 4;
      UI.toast('😢 May batang nawawala — lapitan at tulungan siya!');
    } else if (kind === 'accident') {
      const a = U.rand(0, TAU), c1 = new Vehicle(U.choice(['sedan', 'hatch', 'taxi']), pt.x, pt.y, a, { parked: true }), c2 = new Vehicle(U.choice(['suv', 'van', 'pickup']), pt.x + Math.cos(a) * 60, pt.y + Math.sin(a) * 60, a + 2.2, { parked: true });
      for (const c of [c1, c2]) { c.hp = c.maxhp * 0.25; c.mission = true; G.vehicles.push(c); }
      const hurt = new Person(pt.x + 30, pt.y + 40, 'ped'); hurt.npc = true; hurt.keep = true; hurt.state = 'down'; hurt.downT = 1e9; hurt.umb = null; G.peds.push(hurt);
      e.cars = [c1, c2]; e.hurt = hurt;
      UI.toast('🚑 May aksidente sa malapit! Tumulong ka.');
    } else if (kind === 'dog') {
      const d = new Person(pt.x, pt.y, 'dog'); d.keep = true; d.npc = true; d.state = 'wander'; d.home = { x: pt.x, y: pt.y }; d.wtiles = [TL.SIDE, TL.PLAZA, TL.GRASS, TL.ALLEY]; d.speed = 40; d.umb = null; d.r = 7;
      d.look.shirt = U.choice(['#b5803a', '#e8d8b0', '#3b2a1a', '#ffffff']); G.peds.push(d);
      e.d = d; UI.toast('🐕 May askal na mukhang gutom... (₱20 para pakainin)');
    }
  },
  end(msg, money = 0, xp = 0) {
    const e = this.ev; if (!e) return;
    for (const k of ['victim', 's', 'kid', 'hurt']) if (e[k]) e[k].remove = true;
    if (e.cars) for (const c of e.cars) { c.mission = false; c.remove = true; }
    if (e.kind === 'dog' && e.d && !e.d.pet) e.d.remove = true;
    if (msg) UI.toast(msg);
    if (money) G.addMoney(money, true);
    if (xp) { PROG.xp(xp, 'Tulong'); G.stats.events = (G.stats.events || 0) + 1; ACH.check(); }
    this.ev = null; this.t = U.rand(70, 130);
  },
  updateEvent(dt) {
    const e = this.ev, P = G.player, me = P.vehicle || P;
    e.t += dt;
    if (MS.active) { this.end(''); return; }
    if (e.kind === 'snatcher') {
      const s = e.s; s.tx = P.x; s.ty = P.y; s.fleeT = 999;
      if (s.state === 'down') { s.downT = 999; this.end('👜 Naibalik mo ang bag! Salamat, bayani! +₱300', 300, 40); return; }
      if (s.state !== 'flee' && s.state !== 'down') { s.state = 'flee'; }
      if (e.t > 45 || U.dist(s.x, s.y, P.x, P.y) > 1400) this.end('💨 Nakatakas ang snatcher...');
    } else if (e.kind === 'lost') {
      const k = e.kid;
      if (!e.found) { if (U.dist(k.x, k.y, me.x, me.y) < 70) { e.found = true; k.say = 'Salamat po, Kuya! Sa may ' + (MAP.labels.filter(l => !l.vert).sort((a, b) => U.d2(a.x, a.y, e.mom.x, e.mom.y) - U.d2(b.x, b.y, e.mom.x, e.mom.y))[0] || { name: 'doon' }).name + ' po si Nanay!'; k.sayT = 4; UI.toast('🧒 Sumusunod na ang bata — dalhin siya kay Nanay (sundan ang GPS)'); const m = new Person(e.mom.x, e.mom.y, 'ped'); m.npc = true; m.keep = true; m.state = 'idle'; m.umb = null; G.peds.push(m); e.momP = m; } else if (e.t > 120) this.end(''); return; }
      if (P.vehicle) { k.x = P.x; k.y = P.y; k.hidden = true; } else { k.hidden = false; const d = U.dist(k.x, k.y, P.x, P.y); if (d > 40) { k.state = 'goto'; k.tx = P.x; k.ty = P.y; } else { k.state = 'idle'; } if (d > 600) { k.x = P.x - 30; k.y = P.y; } }
      if (U.dist(me.x, me.y, e.mom.x, e.mom.y) < 90) { if (e.momP) { e.momP.say = 'Anak ko! Salamat po!'; e.momP.sayT = 3; const m = e.momP; setTimeout(() => { m.remove = true; }, 4000); } this.end('🤱 Naibalik mo ang bata sa kanyang Nanay! +₱250', 250, 50); }
    } else if (e.kind === 'accident') {
      if (U.dist(me.x, me.y, e.hurt.x, e.hurt.y) < 120 && (!P.vehicle || P.vehicle.speed < 40)) {
        e.h = (e.h || 0) + dt;
        if (e.h > 2) {
          if (P.vehicle && P.vehicle.type === 'ambulance') this.end('🚑 Naisugod mo ang biktima sa ospital! +₱500', 500, 70);
          else this.end('📞 Tumawag ka ng ambulansya at binantayan ang biktima. +₱150', 150, 35);
        }
      } else e.h = 0;
      if (e.t > 120) this.end('');
    } else if (e.kind === 'dog') {
      if (e.t > 120 || U.dist(e.d.x, e.d.y, P.x, P.y) > 1600) this.end('');
    }
  },
  target() {
    const e = this.ev; if (!e) return null;
    if (e.kind === 'snatcher') return e.s;
    if (e.kind === 'lost') return e.found ? Object.assign({ stop: true }, e.mom) : e.kid;
    if (e.kind === 'accident') return Object.assign({ stop: true }, { x: e.hurt.x, y: e.hurt.y });
    return null;
  },
  objText() {
    const e = this.ev; if (!e) return '';
    return { snatcher: '🚨 Habulin ang snatcher!', lost: e.found ? '🧒 Ihatid ang bata kay Nanay' : '😢 Lapitan ang batang nawawala', accident: '🚑 Tumulong sa aksidente (huminto malapit)', dog: '🐕 May gutom na askal sa malapit' }[e.kind];
  },
  // E / GAMIT interactions
  near() {
    const e = this.ev, P = G.player;
    if (e && e.kind === 'dog' && !P.vehicle && U.dist(e.d.x, e.d.y, P.x, P.y) < 60) return 'Pakainin at ampunin ang askal (₱20)';
    return null;
  },
  use() {
    const e = this.ev;
    if (e && e.kind === 'dog') {
      if (!SHOP.pay(20)) return;
      const d = e.d; d.pet = true; d.state = 'follow'; this.dog = d; G.flags.dog = { col: d.look.shirt, name: U.choice(['Bantay', 'Brownie', 'Tagpi', 'Whitey', 'Choco']) };
      d.name = G.flags.dog.name; AUD.success(); UI.big('🐕 MAY ASO KA NA!', `Siya si ${d.name} — susunod siya sa iyo.`, 2.4, 'good'); this.end('', 0, 30);
    }
  },
  // a pet dog follows you on foot (and waits when you drive)
  updateDog(dt) {
    const P = G.player;
    if (!this.dog && G.flags && G.flags.dog && G.started) {
      const d = new Person(P.x + 30, P.y + 20, 'dog'); d.keep = true; d.npc = true; d.pet = true; d.state = 'follow'; d.look.shirt = G.flags.dog.col; d.name = G.flags.dog.name; d.r = 7; d.umb = null; G.peds.push(d); this.dog = d;
    }
    const d = this.dog; if (!d) return;
    if (d.remove) { this.dog = null; return; }
    if (P.vehicle) { d.x = P.x; d.y = P.y; d.hidden = true; d.state = 'follow'; return; }
    d.hidden = false;
    const dist = U.dist(d.x, d.y, P.x, P.y);
    if (dist > 700) { d.x = P.x - 30; d.y = P.y + 20; }
    if (d.state === 'down') return;
    d.state = 'follow';
    if (dist > 50) d.walkTo(P.x - Math.cos(P.a) * 34, P.y - Math.sin(P.a) * 34, dist > 160 ? 240 : 150, dt); else { d.vx *= 0.8; d.vy *= 0.8; d.moveAmt = 0; }
    d.phase += dt * d.moveAmt * 16; d.move(dt);
    if (WANTED.stars > 0 && Math.random() < dt * 0.3) { d.say = 'Aw aw!'; d.sayT = 1; if (Math.random() < 0.3) AUD.tone(520, 0.08, 'square', 0.04); }
  },
};
function drawDog(g, p) {
  if (p.hidden) return;
  g.save(); g.translate(p.x, p.y); g.rotate(p.a);
  const c = p.look.shirt, leg = Math.sin(p.phase) * 3;
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(2, 3, 12, 7, 0, 0, TAU); g.fill();
  g.fillStyle = '#222'; for (const [x, y] of [[6, -5], [6, 5], [-6, -5], [-6, 5]]) g.fillRect(x + (y > 0 ? leg : -leg) - 1, y - 1, 3, 2);
  g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, 10, 5.5, 0, 0, TAU); g.fill();
  g.beginPath(); g.arc(10, 0, 4.5, 0, TAU); g.fill();
  g.fillStyle = U.shade(c, -0.3); g.beginPath(); g.ellipse(9, -4, 2, 3, 0.4, 0, TAU); g.ellipse(9, 4, 2, 3, -0.4, 0, TAU); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(14, 0, 1.4, 0, TAU); g.fill();
  g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, 0); g.lineTo(-14, Math.sin(G.time * 12) * 3); g.stroke();
  g.restore();
}

// ---------- regional collectibles: shells (Cebu) and eagle feathers (Davao) ----------
const COLL = {
  list: null,
  kinds: { kabibe: { icon: '🐚', name: 'Kabibe', region: 'Cebu' }, balahibo: { icon: '🪶', name: 'Balahibo ng Agila', region: 'Davao' }, presa: { icon: '🍓', name: 'Gintong Strawberry', region: 'Baguio' }, perlas: { icon: '🦪', name: 'Perlas', region: 'Boracay' } },
  make() {
    const out = [], R = U.rng(9191);
    const pick = (kind, x0, x1, n, sp = 18) => {
      const c = [];
      for (let y = 2; y < MH - 2; y++) for (let x = x0; x < x1; x++) { const t = MAP.get(x, y); if ((t === TL.ALLEY || t === TL.GRASS || t === TL.PLAZA || t === TL.DIRT) && R() < 0.03) c.push([x, y]); }
      for (let k = c.length - 1; k > 0; k--) { const r = Math.floor(R() * (k + 1)); [c[k], c[r]] = [c[r], c[k]]; }
      const got = [];
      for (const [x, y] of c) { if (got.length >= n) break; if (got.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < sp)) continue; got.push([x, y]); }
      got.forEach(([x, y], i) => out.push({ id: kind + i, kind, x: (x + 0.5) * T, y: (y + 0.5) * T }));
    };
    pick('kabibe', SX0 + 1, SUGBO_END - 2, 10);
    pick('balahibo', DX0 + 1, DABAW_END - 2, 10);
    pick('presa', BX0 + 1, BAGIW_END - 2, 10);
    pick('perlas', BRX0 + 1, MW - 2, 10, 11);
    return (this.list = out);
  },
  all() { return this.list || this.make(); },
  got() { return G.coll || (G.coll = new Set()); },
  count(kind) { return this.all().filter(c => c.kind === kind && this.got().has(c.id)).length; },
  update() {
    const P = G.player, me = P.vehicle || P, r = P.vehicle ? 50 : 28;
    for (const c of this.all()) {
      if (this.got().has(c.id) || Math.abs(c.x - me.x) > r || Math.abs(c.y - me.y) > r) continue;
      this.got().add(c.id); G.addMoney(150, true);
      const k = this.kinds[c.kind], n = this.count(c.kind);
      UI.big(`${k.icon} ${k.name.toUpperCase()}!`, `${n} / 10 · +₱150`, 1.8, 'good'); PROG.xp(20, k.name);
      if (n === 10) { G.addMoney(3000, true); setTimeout(() => UI.toast(`🏆 Kumpleto ang ${k.name}! +₱3,000`), 1800); }
      ACH.check();
    }
  },
  draw(g, inV, now) {
    for (const c of this.all()) {
      if (this.got().has(c.id) || !inV(c.x, c.y, 30)) continue;
      const b = Math.sin(now * 3 + c.x) * 3;
      g.fillStyle = 'rgba(255,230,120,0.25)'; g.beginPath(); g.arc(c.x, c.y + b, 14, 0, TAU); g.fill();
      g.font = '20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(this.kinds[c.kind].icon, c.x, c.y + b);
    }
  },
};
