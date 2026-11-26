'use strict';
// ===== v3.0 content: jeepney routes (with "sukli"), car mods + car show, gang territories in every city,
// weekly challenges with a shareable result card =====

// ---------- 🚌 Jeepney route job ("Ruta") ----------
JOB_NAMES.ruta = '🚌 Ruta ng Jeep';
Object.assign(JOBS, {
  setupRuta() {
    const c = this.c, v = c.v, [i, j] = MAP.nearestNode(v.x, v.y), path = racePath(i, j, 7);
    c.stops = []; for (let k = 0; k + 1 < path.length; k++) c.stops.push({ x: (path[k].x + path[k + 1].x) / 2, y: (path[k].y + path[k + 1].y) / 2 });
    const lab = (p) => (MAP.labels.filter(l => !l.vert).sort((a, b) => U.d2(a.x, a.y, p.x, p.y) - U.d2(b.x, b.y, p.x, p.y))[0] || { name: '?' }).name;
    c.route = `${lab(c.stops[0])} – ${lab(c.stops[c.stops.length - 1])}`;
    c.si = 0; c.pax = 0; c.rate = 5; c.goal = 600; c.stage = 'go';
    UI.big('🚌 ' + c.route.toUpperCase(), `${c.stops.length} hintuan · Boundary: ${U.money(c.goal)}`, 2.6);
    this.rutaWait();
  },
  rutaWait() {
    const c = this.c, s = c.stops[c.si]; if (!s) return;
    removePeds(c.waiting || []); c.waiting = [];
    const n = U.randi(1, 4);
    for (let k = 0; k < n; k++) { const pt = MAP.safeNear(s.x + U.rand(-50, 50), s.y + U.rand(-30, 30)); const p = new Person(pt.x, pt.y, 'ped'); p.npc = true; p.keep = true; p.state = 'idle'; p.umb = null; p.say = U.choice(['Para po!', 'Sakay!', 'Quiapo ba \'to?', 'Bayad po!']); p.sayT = 2; G.peds.push(p); c.waiting.push(p); }
  },
  u_ruta(dt, c) {
    if (!c.stops) { this.setupRuta(); return; }
    const v = c.v, s = c.stops[c.si];
    c.tgt = Object.assign({ stop: true }, s);
    c.obj = `${c.route} · Hintuan ${c.si + 1}/${c.stops.length} · 🧍 ${c.pax}/16 · ⭐ ${c.rate.toFixed(1)} · ${U.money(c.earned)}`;
    if (U.dist(v.x, v.y, s.x, s.y) < 120 && v.speed < 60) c.hold = (c.hold || 0) + dt; else c.hold = 0;
    if (c.hold < 0.8) return;
    c.hold = 0;
    // passengers get off and pay
    const off = c.si === c.stops.length - 1 ? c.pax : Math.min(c.pax, U.randi(0, 4));
    if (off) { const fare = off * (13 + Math.round(c.si * 2)); c.pax -= off; this.pay(fare, `"Para po!" ${off} bumaba`); }
    // new passengers get on (and someone may need change)
    const on = c.si === c.stops.length - 1 ? 0 : Math.min(16 - c.pax, (c.waiting || []).length + U.randi(0, 2));
    removePeds(c.waiting || []); c.waiting = null; c.pax += on;
    if (on) { AUD.coin(); if (Math.random() < 0.55) SUKLI.ask(c); }
    c.si++;
    if (c.si >= c.stops.length) {
      const ok = c.earned >= c.goal; if (ok) this.pay(300, '🎯 Naabot ang boundary!');
      G.stats.rutas = (G.stats.rutas || 0) + 1; PROG.xp(60, 'Ruta');
      UI.big(ok ? '🚌 TAPOS ANG BIYAHE!' : '🚌 TAPOS ANG BIYAHE', `${c.route} · ${U.money(c.earned)} · ⭐ ${c.rate.toFixed(1)}`, 3, 'good');
      ACH.check(); this.stop(''); return;
    }
    this.rutaWait();
  },
});
// a quick "give the right change" challenge while passengers pay (doesn't pause the game)
const SUKLI = {
  ask(c) {
    if (document.getElementById('sukli')) return;
    const fare = 13, bill = U.choice([20, 50, 100]), right = bill - fare;
    const opts = U.shuffle ? U.shuffle([right, right + 5, right - 5]) : [right, right + 5, right - 5].sort(() => Math.random() - 0.5);
    const el = document.createElement('div'); el.id = 'sukli';
    el.innerHTML = `<b>${I18N.t('💵 "Bayad po!"')} ${U.money(bill)} → ${I18N.t('sukli?')}</b><div>${opts.map(o => `<button data-v="${o}">${U.money(o)}</button>`).join('')}</div><i></i>`;
    document.getElementById('hud').appendChild(el);
    const done = (ok) => {
      if (!el.isConnected) return; el.remove(); clearTimeout(this.to);
      if (ok) { c.rate = Math.min(5, c.rate + 0.1); if (JOBS.c === c) JOBS.pay(5, '😊 Tamang sukli! Tip'); }
      else { c.rate = Math.max(1, c.rate - 0.4); UI.toast(I18N.t('😠 Mali ang sukli!')); AUD.fail(); }
    };
    el.querySelectorAll('button').forEach(b => b.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); done(+b.dataset.v === right); }));
    this.to = setTimeout(() => done(false), 6500);
  },
};

// ---------- 🏎 Car mods 2.0: neon, rims, spoiler — and a nightly car show ----------
const NEONS = [['none', 'Wala', ''], ['#00e5ff', 'Cyan', '#00e5ff'], ['#ff2bd6', 'Pink', '#ff2bd6'], ['#39ff14', 'Green', '#39ff14'], ['#ffd400', 'Gold', '#ffd400'], ['#8f5bff', 'Violet', '#8f5bff']];
const RIMS = [['none', 'Stock'], ['#c0c0c0', 'Chrome'], ['#ffd400', 'Gold'], ['#111111', 'Black'], ['#ff3b3b', 'Red']];
const KITS = [['none', 'Wala'], ['spoiler', 'Spoiler'], ['wide', 'Wide body + spoiler']];
const CARMOD = {
  rows(u, cost) {
    const chips = (list, key, price) => `<div class="chips">${list.map(([id, n]) => `<button class="chip ${(u[key] || 'none') === id ? 'on' : ''}" data-mod="${key}:${id}:${price}">${id !== 'none' && list === NEONS ? `<span style="color:${id}">●</span> ` : ''}${n}</button>`).join('')}</div>`;
    return `<div class="shoprow"><span class="ic">💡</span><div><b>Neon sa ilalim</b><small>${U.money(cost(1500))}</small></div></div>${chips(NEONS, 'neon', 1500)}`
      + `<div class="shoprow"><span class="ic">🛞</span><div><b>Rims</b><small>${U.money(cost(800))}</small></div></div>${chips(RIMS, 'rims', 800)}`
      + `<div class="shoprow"><span class="ic">🏁</span><div><b>Body kit</b><small>${U.money(cost(1200))}</small></div></div>${chips(KITS, 'kit', 1200)}`;
  },
  bind(el, u, pay, reopen) {
    el.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => {
      const [k, id, price] = b.dataset.mod.split(':');
      if ((u[k] || 'none') === id || (id !== 'none' && !pay(+price))) return;
      u[k] = id; AUD.spray(); ACH.check(); reopen();
    });
  },
  score(v) {
    const u = v.upg || {};
    return Math.round(v.t.value / 12 + (u.eng || 0) * 15 + (u.arm || 0) * 8 + (u.sticker && u.sticker !== 'none' ? 20 : 0) + (u.neon && u.neon !== 'none' ? 45 : 0) + (u.rims && u.rims !== 'none' ? 25 : 0) + (u.kit === 'wide' ? 45 : u.kit === 'spoiler' ? 25 : 0) + (v.hp / v.maxhp) * 25 + U.rand(0, 30));
  },
  showLabel() {
    const v = G.player.vehicle, h = WORLD.hour();
    if (!v || v.t.boat || v.t.fly) return null;
    if (!(h >= 18 && h < 23.5)) return '🏆 Car Show — tuwing gabi (6 PM – 11 PM)';
    if (FAMILY.done('carshow')) return '🏆 Car Show — bumalik bukas ng gabi';
    return `🏆 Sumali sa Car Show (${U.money(500)})`;
  },
  enter() {
    const v = G.player.vehicle, h = WORLD.hour();
    if (!v || !(h >= 18 && h < 23.5) || FAMILY.done('carshow')) return;
    if (G.player.money < 500) { UI.toast('Kulang ang pera mo!'); return; }
    G.addMoney(-500); FAMILY.mark('carshow');
    const me = this.score(v), rivals = [U.randi(90, 170), U.randi(120, 220), U.randi(150, 260)];
    const place = 1 + rivals.filter(r => r > me).length, prize = [5000, 2000, 800, 0][place - 1];
    if (prize) G.addMoney(prize, true);
    if (place === 1) G.stats.carshowWins = (G.stats.carshowWins || 0) + 1;
    G.stats.carshows = (G.stats.carshows || 0) + 1; PROG.xp(40 + (4 - place) * 20, 'Car Show');
    UI.big(place === 1 ? '🏆 KAMPEON NG CAR SHOW!' : `🏆 Ika-${place} na puwesto`, `Iskor ${me} vs ${rivals.sort((a, b) => b - a).join(' / ')}${prize ? ' · +' + U.money(prize) : ''}`, 3.2, place <= 3 ? 'good' : '');
    for (let i = 0; i < 20; i++) setTimeout(() => G.particle('spark', v.x + U.rand(-60, 60), v.y + U.rand(-60, 60)), i * 50);
    AUD.cash(); ACH.check();
  },
  ensurePoi() {
    if (MAP.pois.carshow || !MAP.pois.lm_baywalk) return;
    const b = MAP.pois.lm_baywalk, p = MAP.safeNear(b.x + 30, b.y + 220);
    MAP.pois.carshow = { x: p.x, y: p.y, type: 'carshow', label: 'Car Show sa Baywalk', icon: '🏆', id: 'carshow' };
  },
};
// underglow / rims / spoiler drawing (local coords, front = +x)
function drawCarMods(g, v, hl, hw, under) {
  const u = v.upg; if (!u || v.burnt || v.t.boat || v.t.fly) return;
  if (under) {
    if (u.neon && u.neon !== 'none') { g.save(); g.globalAlpha = 0.55 + Math.sin(G.time * 4) * 0.12; g.shadowColor = u.neon; g.shadowBlur = 18; g.fillStyle = u.neon; U.rr(g, -hl + 2, -hw - 3, hl * 2 - 4, hw * 2 + 6, 8); g.fill(); g.restore(); }
    return;
  }
  if (u.rims && u.rims !== 'none') { g.fillStyle = u.rims; for (const sx of [0.55, -0.55]) for (const sy of [-1, 1]) { g.fillRect(hl * sx - 4, sy * hw - (sy > 0 ? 2 : 0), 8, 2); } }
  if (u.kit === 'spoiler' || u.kit === 'wide') { g.fillStyle = '#16181d'; g.fillRect(-hl - 1, -hw + 2, 4, hw * 2 - 4); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(-hl, -hw + 3, 1.5, hw * 2 - 6); }
  if (u.kit === 'wide') { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-hl * 0.7, -hw - 2, hl * 1.4, 2); g.fillRect(-hl * 0.7, hw, hl * 1.4, 2); }
}

// ---------- 🏚 Gang territories in every city (they can come back!) ----------
const TURF = {
  regionDefs() {
    const mk = (R, key, name, i, j) => { if (!R) return null; const x = (R.cx(i) + R.cx(i + 1)) / 2, y = (R.cy(j) + R.cy(j + 1)) / 2; return { key, name, x, y, r: Math.abs(R.cx(i + 1) - R.cx(i)) * 0.4 }; };
    return [mk(MAP.sugbo, 'cebu1', 'Kuta sa Pantalan ng Cebu', 0, 1), mk(MAP.sugbo, 'cebu2', 'Kuta sa Kolon', 1, 2), mk(MAP.dabaw, 'davao1', 'Kuta sa Bankerohan', 0, 1), mk(MAP.bagiw, 'baguio1', 'Kuta sa Kennon', 1, 2)].filter(Boolean);
  },
  init() { if (this.done) return; const L = KUTA.defs(); if (!L.length) return; this.done = true; for (const d of this.regionDefs()) if (!L.some(k => k.key === d.key)) L.push(d); },
  city(k) { const x = k.x / T; return x >= BX0 ? 'Baguio' : x >= DX0 - 12 ? 'Davao' : x >= SX0 - 12 ? 'Cebu' : 'Manila'; },
  // each new day: freed areas pay a little thanks; a gang may come back to an area freed 4+ days ago
  dayT: 0,
  update(dt) {
    if (!G.started || !KUTA.on()) return; this.init();
    const f = G.flags; f.kutaDay = f.kutaDay || {};
    if (f.turfDay === WORLD.day) return; f.turfDay = WORLD.day;
    const freed = KUTA.defs().filter(k => KUTA.cleared(k.key));
    for (const k of freed) if (!f.kutaDay[k.key]) f.kutaDay[k.key] = WORLD.day;
    if (freed.length) { const pay = freed.length * 150; G.addMoney(pay, true); UI.toast(`🏘 Pasasalamat ng mga barangay na napalaya mo: +${U.money(pay)}`); }
    const old = freed.filter(k => WORLD.day - f.kutaDay[k.key] >= 4);
    if (old.length && Math.random() < 0.4) {
      const k = U.choice(old); delete f.kuta[k.key]; delete f.kutaDay[k.key]; k.goons = null;
      PHONE.msg('📢 Barangay', `Bumalik ang sindikato sa ${k.name}! Tulungan mo ulit kami! ☠️`);
    }
  },
  panel() {
    this.init();
    const rows = KUTA.defs().map(k => `<div class="shoprow"><span class="ic">${KUTA.cleared(k.key) ? '🏘' : '☠️'}</span><div><b>${k.name}</b><small>${this.city(k)} · ${KUTA.cleared(k.key) ? 'Malaya — +₱150 araw-araw' : 'Hawak ng sindikato — ₱3,000 kapag nalinis'}</small></div><button data-turf="${k.key}">🧭</button></div>`).join('');
    return (KUTA.on() ? '' : '<p class="note">Bubukas pagkatapos ng Misyon 2.</p>') + rows;
  },
  gps(key) { const k = KUTA.defs().find(x => x.key === key); if (k) G.setWaypoint(k, `☠️ ${k.name}`); },
};

// ---------- 🏅 Weekly challenge + shareable result card ----------
const WEEKLY_POOL = [
  { id: 'errands', text: 'Tapusin ang 8 pakiusap', stat: 'errands', n: 8 },
  { id: 'rutas', text: 'Tapusin ang 3 ruta ng jeep', stat: 'rutas', n: 3 },
  { id: 'earned', text: 'Kumita ng ₱25,000', stat: 'earned', n: 25000 },
  { id: 'escapes', text: 'Takasan ang pulis ng 5 beses', stat: 'escapes', n: 5 },
  { id: 'carshows', text: 'Sumali sa 2 car show', stat: 'carshows', n: 2 },
  { id: 'photos', text: 'Kumuha ng 5 litrato', stat: 'photos', n: 5 },
  { id: 'dates', text: 'Mag-date ng 2 beses', stat: 'dates', n: 2 },
  { id: 'trials', text: 'Tapusin ang 3 Time Trial', stat: 'trials', n: 3 },
];
const WEEKLY = {
  key() { const d = new Date(), j = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + '-W' + Math.ceil(((d - j) / 864e5 + j.getDay() + 1) / 7); },
  ensure() {
    const k = this.key(); if (G.weekly && G.weekly.k === k) return G.weekly;
    const R = U.rng([...k].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0), pool = WEEKLY_POOL.slice(), ids = [];
    while (ids.length < 3) ids.push(pool.splice(Math.floor(R() * pool.length), 1)[0].id);
    const base = {}; for (const id of ids) { const c = WEEKLY_POOL.find(x => x.id === id); base[c.stat] = G.stats[c.stat] || 0; }
    return (G.weekly = { k, ids, base, done: [], paid: false });
  },
  prog(c) { const w = this.ensure(); return Math.max(0, Math.min(c.n, (G.stats[c.stat] || 0) - (w.base[c.stat] || 0))); },
  t: 0,
  update(dt) {
    if (!G.started) return; this.t -= dt; if (this.t > 0) return; this.t = 3;
    const w = this.ensure();
    for (const id of w.ids) { if (w.done.includes(id)) continue; const c = WEEKLY_POOL.find(x => x.id === id); if (this.prog(c) >= c.n) { w.done.push(id); UI.toast(`🏅 Lingguhang hamon: ${c.text} ✅`); } }
    if (w.done.length === 3 && !w.paid) { w.paid = true; G.addMoney(5000, true); PROG.xp(200, 'Lingguhan'); G.stats.weeklies = (G.stats.weeklies || 0) + 1; UI.big('🏅 TAPOS ANG LINGGUHANG HAMON!', '+₱5,000 · ibahagi ang resulta sa 📱', 3, 'good'); ACH.check(); }
  },
  panel() {
    const w = this.ensure();
    return w.ids.map(id => { const c = WEEKLY_POOL.find(x => x.id === id), p = this.prog(c), ok = w.done.includes(id); return `<div class="shoprow ${ok ? 'done' : ''}"><span class="ic">${ok ? '✅' : '🏅'}</span><div><b>${c.text}</b><div class="bar xpbar"><div style="width:${Math.round(p / c.n * 100)}%"></div></div><small>${p} / ${c.n}</small></div></div>`; }).join('')
      + `<p class="note">Kumpletuhin ang tatlo para sa ₱5,000. Bagong hamon tuwing Lunes!</p><div class="ph-list"><button data-card="1">📤 Ibahagi ang aking card</button></div>`;
  },
  // a square "player card" image to share on Messenger / Facebook
  async card() {
    const c = document.createElement('canvas'); c.width = c.height = 1080; const g = c.getContext('2d'), P = G.player, w = this.ensure();
    const gr = g.createLinearGradient(0, 0, 1080, 1080); gr.addColorStop(0, '#1b2440'); gr.addColorStop(1, '#070a12'); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1080);
    try { g.globalAlpha = 0.25; g.drawImage(G.canvas, 0, 0, G.canvas.width, G.canvas.height, 0, 300, 1080, 1080 * G.canvas.height / G.canvas.width); g.globalAlpha = 1; } catch (e) { g.globalAlpha = 1; }
    g.textAlign = 'center'; g.fillStyle = '#f39c2b'; g.font = '90px Bungee, sans-serif'; g.fillText('HARI NG KALSADA', 540, 160);
    g.fillStyle = '#fff'; g.font = '900 44px Nunito, sans-serif'; g.fillText(`⭐ Level ${P.level || 1} · 📖 ${MS.idx}/${MISSIONS.length} misyon`, 540, 260);
    const lines = [`💰 ${U.money(G.stats.earned || 0)} kinita`, `🏃 ${G.stats.escapes || 0} beses nakatakas`, `📋 ${G.stats.errands || 0} pakiusap · 🚌 ${G.stats.rutas || 0} ruta`, `🏆 ${ACH.got.size} tagumpay · 🏅 ${w.done.length}/3 lingguhan`];
    g.font = '800 46px Nunito, sans-serif'; lines.forEach((l, i) => { g.fillStyle = 'rgba(0,0,0,0.55)'; U.rr(g, 140, 340 + i * 120, 800, 90, 24); g.fill(); g.fillStyle = '#fff'; g.fillText(I18N.t(l), 540, 400 + i * 120); });
    g.fillStyle = '#9fd3ff'; g.font = '800 36px Nunito, sans-serif'; g.fillText(I18N.t('Kaya mo bang lampasan? Laro na!'), 540, 900);
    g.fillStyle = '#ffffff99'; g.font = '700 30px Nunito, sans-serif'; g.fillText(location.host + location.pathname, 540, 960); g.fillText('K&A Studios', 540, 1010);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const file = new File([blob], 'harinkalsada-card.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await SHARE.send('🏅 Ang aking Hari ng Kalsada card!', location.origin + location.pathname, [file]); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'harinkalsada-card.png'; document.body.appendChild(a); a.click(); a.remove(); UI.toast('📥 Na-save ang card — i-share mula sa Gallery mo.'); }
    G.stats.shared = (G.stats.shared || 0) + 1; ACH.check();
  },
};
