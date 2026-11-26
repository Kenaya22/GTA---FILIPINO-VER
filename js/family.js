'use strict';
// ===== Love & family: meet someone in each city, chat, give gifts, go on dates, propose, get married at a church,
// buy a family house, have kids — and visit them at home for home-cooked meals and a full heal =====
const LOVERS = {
  ligaya: { name: 'Ligaya', job: 'nars sa ospital', at: 'kainan_m', shirt: '#e84393', likes: '🌹' },
  isabel: { name: 'Isabel', job: 'guro sa Cebu', at: 'kainan_s', shirt: '#8e44ad', likes: '🍫' },
  migo: { name: 'Migo', job: 'magsasaka ng durian', at: 'kainan_d', shirt: '#27ae60', likes: '🍫' },
  rosa: { name: 'Rosa', job: 'nagtitinda ng strawberry', at: 'bg_kainan', shirt: '#c0392b', likes: '🌹' },
};
const LOVE_LINES = [
  ['Uy, ikaw pala! Ingat ka sa kalsada, ha?', 'Mainit ngayon, \'no? Gusto mo ng tubig?', 'Ang dami mong kuwento, nakakatuwa ka!'],
  ['Hinihintay kita kanina pa! 😊', 'Ikaw lang ang nagpapangiti sa akin ngayong araw.', 'Ang sweet mo talaga...'],
  ['Mahal na yata kita... 💗', 'Ikaw lang ang iniisip ko buong araw.', 'Kahit saan, basta kasama ka.'],
];
const KID_NAMES = ['Junjun', 'Bea', 'Pao', 'Mika', 'Toto', 'Ning', 'Jaja', 'Bimbo', 'Liza', 'Popoy'];
const HOUSES = [
  { name: 'Wala pa', cost: 0 },
  { name: 'Bahay Kubo', cost: 15000, kids: 1, desc: 'Simpleng bahay — dito titira ang pamilya mo' },
  { name: 'Bungalow', cost: 60000, kids: 2, desc: 'Mas malaki — 2 anak, at baon na ₱200 araw-araw' },
  { name: 'Mansyon', cost: 250000, kids: 3, desc: 'Pang-mayaman — 3 anak, baon na ₱600 araw-araw' },
];
const FAMILY = {
  peds: {}, home: [],
  f() { const g = G.flags; return g.fam || (g.fam = { aff: {}, day: {}, partner: null, stage: null, house: 0, kids: [], wedDay: 0 }); },
  day() { return WORLD.day || 1; },
  hearts(id) { return Math.round(this.f().aff[id] || 0); },
  heartBar(n) { return '❤️'.repeat(Math.floor(n / 20)) + '🤍'.repeat(5 - Math.floor(n / 20)); },
  done(key) { return this.f().day[key] === this.day(); },
  mark(key) { this.f().day[key] = this.day(); },
  addAff(id, n) { const f = this.f(); f.aff[id] = U.clamp((f.aff[id] || 0) + n, 0, 100); },
  spot(L) {
    const p = MAP.pois[L.at]; if (!p) return null; if (L._s) return L._s;
    const ok = [TL.SIDE, TL.PLAZA, TL.LOT, TL.GRASS, TL.PROM, TL.ALLEY];
    for (let r = 80; r <= 220; r += 20) for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (ok.includes(MAP.tileAt(x, y))) return (L._s = { x, y }); }
    return (L._s = { x: p.x + 90, y: p.y + 30 });
  },
  // the family house: a residential lot in Manila
  ensureHome() {
    if (MAP.pois.famhome) return;
    const d = MAP.door(7, 0, 'S', 2);
    MAP.pois.famhome = { x: d.x, y: d.y, type: 'famhome', label: 'Bahay ng Pamilya', icon: '🏡', id: 'famhome' };
  },
  // ---------- per-frame ----------
  t: 0,
  update(dt) {
    if (!G.started) return;
    this.ensureHome();
    const P = G.player, f = this.f();
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 0.6;
      for (const id in LOVERS) {
        const L = LOVERS[id], married = f.partner === id && f.stage === 'married';
        const sp = married ? (f.house ? { x: MAP.pois.famhome.x + 90, y: MAP.pois.famhome.y + 26 } : null) : this.spot(L);
        const want = sp && !(this.date && this.date.id === id) && U.dist(P.x, P.y, sp.x, sp.y) < 1100;
        let p = this.peds[id];
        if (want && !p) {
          p = new Person(sp.x, sp.y, 'ped'); p.npc = true; p.keep = true; p.state = 'idle'; p.umb = null; p.look.shirt = L.shirt; p.loverId = id;
          p.name = (married ? '💍 ' : f.partner === id ? '💗 ' : '') + L.name; G.peds.push(p); this.peds[id] = p; if (!married) TIP.show('love');
        } else if (p && !want && !(this.date && this.date.id === id)) { p.remove = true; delete this.peds[id]; }
        if (p && p.remove && !(this.date && this.date.id === id)) delete this.peds[id];
      }
      // kids at the family house
      const h = MAP.pois.famhome, nearHome = h && f.house && U.dist(P.x, P.y, h.x, h.y) < 1000;
      if (nearHome && this.home.length !== f.kids.length) {
        removePeds(this.home); this.home = [];
        f.kids.forEach((k, i) => { const c = new Person(h.x - 30 - i * 24, h.y + 40 + (i % 2) * 14, 'ped'); c.npc = true; c.keep = true; c.state = 'idle'; c.umb = null; c.scale = this.day() - k.born < 3 ? 0.5 : 0.72; c.name = '👶 ' + k.name; G.peds.push(c); this.home.push(c); });
      } else if (!nearHome && this.home.length) { removePeds(this.home); this.home = []; }
      // morning message + allowance from the family
      if (f.stage === 'married' && WORLD.clock > 420 && WORLD.clock < 600 && !this.done('text')) {
        this.mark('text'); const L = LOVERS[f.partner], baon = [0, 0, 200, 600][f.house] || 0;
        PHONE.msg('💍 ' + L.name, U.choice(['Ingat ka sa biyahe, mahal! 🍱', 'Umuwi ka nang maaga ha, may sinigang ako 😘', 'Miss ka na ng mga bata! 👨‍👩‍👧', 'Huwag kang magpapahuli sa pulis ha 😅']) + (baon ? ` (+${U.money(baon)} baon)` : ''));
        if (baon) G.addMoney(baon, true);
      }
    }
    this.updateDate(dt);
  },
  // ---------- talking ----------
  near() {
    const P = G.player; if (P.vehicle || UI.talking) return null;
    for (const id in this.peds) { const p = this.peds[id]; if (!p.remove && U.dist(p.x, p.y, P.x, P.y) < 50) return id; }
    return null;
  },
  label(id) {
    const f = this.f(), L = LOVERS[id];
    if (f.partner === id && f.stage === 'married') return `💍 Kausapin si ${L.name} (asawa mo)`;
    return `💗 Kausapin si ${L.name} · ${this.heartBar(this.hearts(id))}`;
  },
  open(id) {
    const f = this.f(), L = LOVERS[id], h = this.hearts(id), P = G.player;
    const married = f.partner === id && f.stage === 'married', taken = f.partner && f.partner !== id;
    G.paused = true; document.getElementById('shop-title').textContent = `${married ? '💍' : '💗'} ${L.name.toUpperCase()}`;
    const rows = [];
    const row = (k, ic, t, s, btn, dis) => rows.push(`<div class="shoprow"><span class="ic">${ic}</span><div><b>${t}</b><small>${s}</small></div><button data-k="${k}" ${dis ? 'disabled' : ''}>${btn}</button></div>`);
    rows.push(`<p class="note">${L.name} — ${L.job} · ${married ? 'Asawa mo 💍' : this.heartBar(h) + ` (${h}/100)`}</p>`);
    if (taken && f.stage === 'married') rows.push(`<p class="note">Kasal ka na kay ${LOVERS[f.partner].name} — magkaibigan na lang kayo 🙂</p>`);
    row('talk', '💬', 'Makipagkuwentuhan', this.done('talk_' + id) ? 'Nakapag-usap na kayo ngayong araw' : '+6 ❤️ (isang beses bawat araw)', 'USAP', this.done('talk_' + id));
    if (!(taken && f.stage === 'married')) {
      row('rose', '🌹', 'Bigyan ng bulaklak', `${U.money(200)} · +${L.likes === '🌹' ? 14 : 9} ❤️`, 'IBIGAY', this.done('gift_' + id) || P.money < 200);
      row('choc', '🍫', 'Bigyan ng tsokolate', `${U.money(150)} · +${L.likes === '🍫' ? 12 : 7} ❤️`, 'IBIGAY', this.done('gift_' + id) || P.money < 150);
    }
    if (!married && !taken) {
      row('date', '💑', 'Yayain mag-date', h < 30 ? 'Kailangan ng 30 ❤️' : this.done('date_' + id) ? 'Nag-date na kayo ngayong araw' : '+20 ❤️ — sasama siya sa iyo', 'TARA!', h < 30 || this.done('date_' + id) || !!this.date);
      row('ring', '💍', 'Mag-propose', h < 100 ? 'Kailangan ng 100 ❤️' : `Singsing ${U.money(25000)} — kasal sa simbahan!`, 'PROPOSE', h < 100 || P.money < 25000);
    }
    if (married) {
      row('cook', '🍲', 'Lutong-bahay', this.done('cook') ? 'Busog ka na ngayong araw' : 'Full heal + 💪 SIGLA (araw-araw)', 'KAIN', this.done('cook'));
      if (f.house) row('kid', '👶', 'Magkaanak', f.kids.length >= HOUSES[f.house].kids ? `Puno na ang bahay (${HOUSES[f.house].name}) — mag-upgrade sa 🏡` : this.day() - (f.kidDay || f.wedDay) < 2 ? 'Maghintay pa ng ilang araw' : 'Bagong miyembro ng pamilya!', 'OO', f.kids.length >= HOUSES[f.house].kids || this.day() - (f.kidDay || f.wedDay) < 2);
    }
    const el = document.getElementById('shop-list'); el.innerHTML = rows.join('');
    el.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => { AUD.click(); this.act(id, b.dataset.k); });
    UI.show('shop');
  },
  close() { UI.hide('shop'); G.paused = false; },
  act(id, k) {
    const f = this.f(), L = LOVERS[id], P = G.player, tier = Math.min(2, Math.floor(this.hearts(id) / 35));
    if (k === 'talk') { this.mark('talk_' + id); this.addAff(id, 6); this.close(); UI.say([[L.name, U.choice(LOVE_LINES[tier])]]); PROG.xp(10, 'Usap'); }
    else if (k === 'rose' || k === 'choc') {
      const cost = k === 'rose' ? 200 : 150, love = (k === 'rose') === (L.likes === '🌹') ? (k === 'rose' ? 14 : 12) : (k === 'rose' ? 9 : 7);
      G.addMoney(-cost); this.mark('gift_' + id); this.addAff(id, love); this.close();
      UI.say([[L.name, love > 10 ? 'Waaah, paborito ko \'to! Salamat! 😍' : 'Ang sweet mo naman, salamat! 😊']]);
    } else if (k === 'date') { this.close(); this.startDate(id); }
    else if (k === 'ring') {
      G.addMoney(-25000); f.partner = id; f.stage = 'engaged'; this.close();
      UI.say([[L.name, 'OO! OO! Pakakasal ako sa iyo! 💍😭'], [L.name, 'Tara na sa simbahan — doon tayo ikakasal!']]);
      const ch = this.nearest('church'); if (ch) G.setWaypoint(ch, '💒 Kasal: ' + ch.label);
      AUD.success();
    } else if (k === 'cook') { this.mark('cook'); P.hp = 100; P.buffT = 120; this.close(); UI.say([[L.name, 'Kain na, mahal! Sinigang na baboy, paborito mo. 🍲']]); AUD.success(); }
    else if (k === 'kid') {
      const boy = Math.random() < 0.5, name = U.choice(KID_NAMES.filter(n => !f.kids.some(c => c.name === n)));
      f.kids.push({ name, born: this.day() }); f.kidDay = this.day(); this.close();
      UI.big('👶 MAY BAGONG BABY!', `Si ${name} — ang bagong miyembro ng pamilya!`, 3, 'good'); AUD.success(); PROG.xp(150, 'Pamilya'); ACH.check();
      PHONE.msg('💍 ' + L.name, `Ang cute ni ${name}! Kamukha mo! 👶`);
    }
  },
  nearest(type) {
    const P = G.player; let best = null, bd = 1e18;
    for (const k in MAP.pois) { const p = MAP.pois[k]; if (p.type !== type || regionName(p.x) !== regionName(P.x)) continue; const d = U.d2(p.x, p.y, P.x, P.y); if (d < bd) { bd = d; best = p; } }
    return best;
  },
  // ---------- dates ----------
  date: null,
  startDate(id) {
    const P = G.player, opts = Object.values(MAP.pois).filter(p => (p.landmark || p.type === 'videoke' || p.type === 'mall' || p.type === 'kainan') && regionName(p.x) === regionName(P.x) && U.dist(p.x, p.y, P.x, P.y) > 500);
    if (!opts.length) { UI.toast('Walang mapupuntahan dito — subukan sa ibang lugar.'); return; }
    const dest = U.choice(opts), p = this.peds[id];
    this.date = { id, dest, t: 300, p };
    G.setWaypoint(dest, `💑 Date: ${dest.label}`);
    UI.say([[LOVERS[id].name, `Tara sa ${dest.label}! Excited na ako! 💕`]]);
  },
  updateDate(dt) {
    const d = this.date; if (!d) return;
    const P = G.player, p = d.p, L = LOVERS[d.id];
    d.t -= dt;
    if (p && !p.remove) {
      if (P.vehicle) { p.x = P.x; p.y = P.y; p.hidden = true; }
      else {
        p.hidden = false; const dist = U.dist(p.x, p.y, P.x, P.y);
        if (dist > 600) { p.x = P.x - 30; p.y = P.y + 20; }
        p.state = 'goto';
        if (dist > 46) p.walkTo(P.x - Math.cos(P.a) * 30 + 14, P.y - Math.sin(P.a) * 30, dist > 150 ? 230 : 140, dt); else { p.vx *= 0.8; p.vy *= 0.8; p.moveAmt = 0; }
        p.phase += dt * (p.moveAmt || 0) * 12; p.move(dt);
      }
    }
    const me = P.vehicle || P;
    if (U.dist(me.x, me.y, d.dest.x, d.dest.y) < 140) {
      this.date = null; this.mark('date_' + d.id); this.addAff(d.id, 20); G.waypoint = null;
      if (p) { p.hidden = false; p.x = P.x + 30; p.y = P.y + 10; p.state = 'idle'; }
      UI.say([[L.name, U.choice(['Ang saya! Salamat sa date! 💕', 'Ang ganda dito... parang ayoko nang umuwi. 🥰', 'Ulitin natin \'to ha? 😊'])]]);
      UI.big('💑 MASAYANG DATE!', `+20 ❤️ · ${L.name}`, 2.2, 'good'); PROG.xp(40, 'Date'); AUD.success();
      G.stats.dates = (G.stats.dates || 0) + 1; ACH.check();
      setTimeout(() => { if (p && !this.date) { p.remove = true; delete this.peds[d.id]; } }, 6000);
    } else if (d.t <= 0 || (p && p.state === 'down')) {
      this.date = null; G.waypoint = null; this.addAff(d.id, -5);
      UI.toast(`💔 Nainip si ${L.name} at umuwi na...`); if (p) { p.remove = true; delete this.peds[d.id]; }
    }
  },
  dateText() { const d = this.date; return d ? `💑 Date kasama si ${LOVERS[d.id].name}: pumunta sa ${d.dest.label} (${Math.ceil(d.t)}s)` : ''; },
  // ---------- wedding (arrive at a church while engaged) ----------
  checkWedding() {
    const f = this.f(); if (f.stage !== 'engaged') return;
    const P = G.player, ch = this.nearest('church'); if (!ch || P.vehicle || U.dist(P.x, P.y, ch.x, ch.y) > 90) return;
    f.stage = 'married'; f.wedDay = this.day(); G.waypoint = null; const L = LOVERS[f.partner];
    for (let i = 0; i < 40; i++) setTimeout(() => G.particle('cash', P.x + U.rand(-80, 80), P.y + U.rand(-60, 20)), i * 40);
    UI.big('💒 KASAL!', `Ikaw at si ${L.name} — habambuhay! 💍`, 3.5, 'good'); AUD.success(); PROG.xp(300, 'Kasal'); ACH.check();
    setTimeout(() => UI.say([['Pari', 'Ipinapahayag ko kayong mag-asawa! Maaari mo nang halikan ang iyong asawa. 💋'], [L.name, f.house ? 'Uwi na tayo sa bahay natin! 🏡' : 'Saan tayo titira? Bumili tayo ng bahay — tingnan ang 🏡 sa mapa!']]), 1200);
  },
  // ---------- the family house ----------
  homeLabel() {
    const f = this.f();
    return f.house ? `🏡 ${HOUSES[f.house].name} — pamilya, save at upgrade` : `🏡 Bumili ng bahay para sa pamilya (${U.money(HOUSES[1].cost)})`;
  },
  openHome() {
    const f = this.f(), P = G.player, nx = HOUSES[f.house + 1];
    G.paused = true; document.getElementById('shop-title').textContent = '🏡 ' + (f.house ? HOUSES[f.house].name.toUpperCase() : 'BAHAY NG PAMILYA');
    const rows = [];
    if (f.stage === 'married') rows.push(`<p class="note">💍 ${LOVERS[f.partner].name}${f.kids.length ? ' · 👶 ' + f.kids.map(k => k.name).join(', ') : ''}</p>`);
    else rows.push(`<p class="note">Wala ka pang asawa — may makikilala ka sa mga 🍗 Manukan sa bawat lungsod 💗</p>`);
    if (nx) rows.push(`<div class="shoprow"><span class="ic">${f.house ? '⬆️' : '🔑'}</span><div><b>${f.house ? 'I-upgrade: ' : 'Bilhin: '}${nx.name}</b><small>${nx.desc}</small></div><button data-k="buy" ${P.money < nx.cost ? 'disabled' : ''}>${U.money(nx.cost)}</button></div>`);
    if (f.house) rows.push(`<div class="shoprow"><span class="ic">💾</span><div><b>Magpahinga at i-save</b><small>Full heal</small></div><button data-k="save">SAVE</button></div>`);
    if (f.house && f.kids.length) rows.push(`<div class="shoprow"><span class="ic">🎈</span><div><b>Makipaglaro sa mga anak</b><small>${this.done('play') ? 'Napaglaro mo na sila ngayong araw' : '+60 XP at saya!'}</small></div><button data-k="play" ${this.done('play') ? 'disabled' : ''}>LARO</button></div>`);
    const el = document.getElementById('shop-list'); el.innerHTML = rows.join('');
    el.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => {
      AUD.click(); const k = b.dataset.k;
      if (k === 'buy') { G.addMoney(-nx.cost); f.house++; AUD.success(); UI.big('🏡 ' + nx.name.toUpperCase() + '!', 'Bagong tahanan ng pamilya', 2.4, 'good'); ACH.check(); this.openHome(); }
      else if (k === 'save') { P.hp = 100; G.save(); this.close(); UI.toast('💾 Na-save ang laro. Pahinga muna sa bahay!'); }
      else if (k === 'play') { this.mark('play'); PROG.xp(60, 'Pamilya'); this.close(); UI.say([[f.kids[0].name, U.choice(['Taya ka, Tatay/Nanay! 😆', 'Laro pa tayo! Isa pa!', 'Yehey, umuwi ka na! 🤗'])]]); }
    });
    UI.show('shop');
  },
  // ---------- phone app ----------
  panel() {
    const f = this.f();
    return Object.keys(LOVERS).map(id => {
      const L = LOVERS[id], h = this.hearts(id), me = f.partner === id;
      return `<div class="shoprow"><span class="ic">${me && f.stage === 'married' ? '💍' : me ? '💗' : '🙂'}</span><div><b>${L.name}</b><small>${L.job} · ${me && f.stage === 'married' ? 'Asawa mo' : this.heartBar(h)}</small></div><button data-gps="${id}">🧭</button></div>`;
    }).join('') + (f.kids.length ? `<p class="note">👶 Mga anak: ${f.kids.map(k => k.name).join(', ')}</p>` : '') + `<p class="note">🏡 Bahay: ${HOUSES[f.house].name}</p>`;
  },
  gps(id) { const f = this.f(); const pt = f.partner === id && f.stage === 'married' && f.house ? MAP.pois.famhome : this.spot(LOVERS[id]); if (pt) G.setWaypoint(pt, (f.partner === id ? '💗 ' : '') + LOVERS[id].name); },
  reset() { this.peds = {}; this.home = []; this.date = null; },
};

// ===== In-game phone: messages, quick GPS, family, bank =====
const PHONE = {
  msgs: [],
  msg(from, text) {
    const f = G.flags; f.msgs = f.msgs || []; f.msgs.unshift({ from, text, day: WORLD.day || 1, t: WORLD.timeStr() }); f.msgs.length = Math.min(f.msgs.length, 30);
    f.unread = (f.unread || 0) + 1; UI.toast(`📱 ${from}: ${text}`); AUD.tone(1320, 0.07, 'sine', 0.06); AUD.tone(1760, 0.09, 'sine', 0.06, 0, 0.09); this.badge();
  },
  badge() { const b = document.getElementById('btn-phone'); if (b) b.dataset.n = (G.flags && G.flags.unread) || ''; },
  open(app) {
    G.paused = true; const el = document.getElementById('phone-body'), f = G.flags;
    document.querySelectorAll('#phone .ph-apps button').forEach(b => b.classList.toggle('on', b.dataset.app === (app || 'home')));
    if (!app || app === 'home') {
      el.innerHTML = `<div class="ph-time">${WORLD.timeStr()}</div><div class="ph-date">Araw ${WORLD.day || 1} · ${regionName(G.player.x)}</div>`
        + `<div class="ph-grid">${[['msg', '💬', 'Mensahe'], ['err', '📋', 'Pakiusap'], ['gps', '🧭', 'GPS'], ['fam', '💗', 'Pamilya'], ['bank', '🏦', 'Bangko'], ['daily', '📅', 'Hamon'], ['skills', '📈', 'Skills'], ['ach', '🏆', 'Tagumpay'], ['photo', '📷', 'Kamera']].map(([k, ic, n]) => `<button data-go="${k}"><span>${ic}</span>${n}${k === 'msg' && f.unread ? `<i>${f.unread}</i>` : ''}${k === 'err' && f.errand && f.errand.stage === 'offer' ? '<i>!</i>' : ''}</button>`).join('')}</div>`;
    } else if (app === 'msg') {
      f.unread = 0; this.badge();
      el.innerHTML = (f.msgs && f.msgs.length ? f.msgs.map(m => `<div class="ph-msg"><b>${m.from}</b><span>${m.text}</span><small>Araw ${m.day} · ${m.t}</small></div>`).join('') : '<p class="note">Wala pang mensahe.</p>');
    } else if (app === 'gps') {
      el.innerHTML = '<p class="note">Pinakamalapit na:</p><div class="ph-list">' + MAPCATS.filter(c => c.types.length).map(c => c.types.map(([t, ic, n]) => `<button data-poi="${t}">${ic} ${n}</button>`).join('')).join('') + (G.waypoint ? '<button data-poi="x">✕ Alisin ang GPS</button>' : '') + '</div>';
    } else if (app === 'fam') { el.innerHTML = FAMILY.panel(); }
    else if (app === 'err') { el.innerHTML = ERRAND.panel(); }
    else if (app === 'ach') { this.close(); ACH.open(); return; }
    else if (app === 'photo') { this.close(); PHOTO.open(); return; }
    else if (app === 'bank') {
      const b = f.bank || 0;
      el.innerHTML = `<div class="ph-bank"><small>Ipon sa bangko</small><b>${U.money(b)}</b><small>+1% tubo bawat araw (hanggang ₱2,000) · ligtas kahit mahuli o mahimatay</small></div><div class="ph-list">${[1000, 10000, 'all'].map(n => `<button data-dep="${n}">⬆ Ideposito ${n === 'all' ? 'LAHAT' : U.money(n)}</button>`).join('')}${[1000, 10000, 'all'].map(n => `<button data-wd="${n}">⬇ Kunin ${n === 'all' ? 'LAHAT' : U.money(n)}</button>`).join('')}</div>`;
    } else if (app === 'daily') { this.close(); DAILY.open(); return; }
    else if (app === 'skills') { this.close(); PROG.open(); return; }
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { AUD.click(); this.open(b.dataset.go); });
    el.querySelectorAll('[data-err]').forEach(b => b.onclick = () => { AUD.click(); if (b.dataset.err === 'ok') { ERRAND.accept(); this.close(); } else { ERRAND.decline(); this.open('err'); } });
    el.querySelectorAll('[data-gps]').forEach(b => b.onclick = () => { AUD.click(); FAMILY.gps(b.dataset.gps); this.close(); });
    el.querySelectorAll('[data-poi]').forEach(b => b.onclick = () => {
      AUD.click(); if (b.dataset.poi === 'x') { G.waypoint = null; this.close(); return; }
      const P = G.player; let best = null, bd = 1e18;
      for (const k in MAP.pois) { const p = MAP.pois[k]; if ((p.landmark ? 'landmark' : p.type) !== b.dataset.poi) continue; const d = U.d2(p.x, p.y, P.x, P.y); if (d < bd) { bd = d; best = p; } }
      if (best) { G.setWaypoint(best, `${best.icon} ${best.label}`); this.close(); } else UI.toast('Wala dito.');
    });
    const P = G.player;
    el.querySelectorAll('[data-dep]').forEach(b => b.onclick = () => { const n = b.dataset.dep === 'all' ? P.money : Math.min(P.money, +b.dataset.dep); if (n > 0) { G.addMoney(-n); f.bank = (f.bank || 0) + n; AUD.coin(); } this.open('bank'); });
    el.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => { const n = b.dataset.wd === 'all' ? (f.bank || 0) : Math.min(f.bank || 0, +b.dataset.wd); if (n > 0) { f.bank -= n; G.addMoney(n, true); } this.open('bank'); });
    UI.show('phone');
  },
  close() { UI.hide('phone'); G.paused = false; },
  // daily bank interest
  interest() { const f = G.flags; if (f.bank > 0 && f.bankDay !== WORLD.day) { f.bankDay = WORLD.day; const i = Math.min(2000, Math.round(f.bank * 0.01)); f.bank += i; if (i >= 10) UI.toast(`🏦 Tubo sa bangko: +${U.money(i)}`); } },
};
