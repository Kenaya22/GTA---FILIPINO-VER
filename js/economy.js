'use strict';
// ===== Properties, garage, car customization, achievements =====
const PROPS = [
  { id: 'sari', poi: 'prop_sari', name: 'Sari-sari Store', price: 5000, income: 400, perk: 'Kita araw-araw + safehouse' },
  { id: 'carinderia', poi: 'prop_carin', name: 'Carinderia ni Aling Bining', price: 12000, income: 1100, perk: 'Kita araw-araw + safehouse + libreng kain (full heal)' },
  { id: 'talyer', poi: 'prop_talyer', name: 'Talyer sa Paco', price: 20000, income: 1600, perk: 'Garahe + 50% discount sa upgrades sa Pintura' },
  { id: 'resort', poi: 'prop_resort', name: 'Beach Resort sa Isla', price: 35000, income: 3000, perk: 'Pinakamalaking kita + safehouse sa isla' },
  { id: 'condo', poi: 'prop_condo', name: 'Condo sa Makati', price: 50000, income: 500, perk: 'Garahe + libreng Armored SUV na pang-mayaman' },
];
const UPG_PRICE = [2000, 4000, 7000];
const STICKERS = [['none', 'Wala'], ['flame', '🔥 Apoy'], ['stripes', '〰 Racing Stripes'], ['araw', '☀️ Araw'], ['number', '#️⃣ Numero'], ['bulaklak', '🌺 Bulaklak']];
const HORNS = [['normal', 'Normal'], ['jeep', 'Jeepney (malakas)'], ['tri', 'Tri-tone'], ['moo', 'Kalabaw 🐃'], ['tiktilaok', 'Tandang 🐓']];
const PAINTS = ['#e8e8e8', '#c0392b', '#2e86c1', '#1c1f26', '#f1c40f', '#27ae60', '#8e44ad', '#f28c28', '#e84393', '#16a085', '#d4af37', '#7f8c8d'];

const ECON = {
  owned: new Set(), garage: [], MAX_GARAGE: 6,
  prop(id) { return PROPS.find(p => p.id === id); },
  propAt(poiKey) { return PROPS.find(p => p.poi === poiKey); },
  isGarage(poiKey) { return poiKey === 'garage_home' || (poiKey === 'prop_talyer' && this.owned.has('talyer')) || (poiKey === 'prop_condo' && this.owned.has('condo')); },
  discount() { return this.owned.has('talyer') ? 0.5 : 1; },
  refreshIcons() { for (const pr of PROPS) { const p = MAP.pois[pr.poi]; if (p) p.icon = this.owned.has(pr.id) ? '🏠' : '🔑'; } },
  payday() {
    let total = 0;
    for (const id of this.owned) total += this.prop(id).income;
    if (total > 0) { G.addMoney(total, true); UI.toast(`🏪 Kita ng mga ari-arian ngayong araw: +${U.money(total)}`); }
  },
  spawnCar(d, x, y, a) {
    const v = new Vehicle(d.type, x, y, a || 0, { color: d.color });
    if (d.color2) v.color2 = d.color2; if (d.color3) v.color3 = d.color3;
    if (d.plate) v.plate = d.plate;
    v.upg = d.upg ? Object.assign({}, d.upg) : null;
    ECON.applyUpg(v);
    if (d.hp) v.hp = Math.min(v.maxhp, d.hp);
    v.keep = true; G.vehicles.push(v);
    return v;
  },
  applyUpg(v) {
    const u = v.upg; if (!u) return;
    if (!v.baseT) v.baseT = v.t;
    const m = 1 + 0.08 * (u.eng || 0);
    v.t = Object.assign({}, v.baseT, { max: v.baseT.max * m, acc: v.baseT.acc * (1 + 0.12 * (u.eng || 0)), armor: (v.baseT.armor || 1) * (1 + 0.35 * (u.arm || 0)) });
  },
  // ---------- property purchase ----------
  propLabel(p) {
    const pr = this.propAt(p.key);
    if (this.owned.has(pr.id)) return G.player.vehicle ? (this.isGarage(p.key) ? 'I-park sa garahe' : null) : `${pr.name} — I-save / pahinga${this.isGarage(p.key) ? ' / garahe' : ''}`;
    return G.player.vehicle ? null : `BILHIN: ${pr.name} — ${U.money(pr.price)} (+${U.money(pr.income)}/araw)`;
  },
  propUse(p) {
    const pr = this.propAt(p.key), P = G.player;
    if (!this.owned.has(pr.id)) {
      if (P.money < pr.price) { UI.toast(`Kulang ang pera mo! Kailangan ng ${U.money(pr.price)}.`); AUD.fail(); return; }
      if (!confirm(`Bilhin ang ${pr.name} sa halagang ${U.money(pr.price)}?\n${pr.perk}`)) return;
      G.addMoney(-pr.price); this.owned.add(pr.id); this.refreshIcons(); AUD.success();
      UI.big('NABILI!', `${pr.name} · ${pr.perk}`, 3, 'good');
      if (pr.id === 'condo') { const v = ECON.spawnCar({ type: 'mayor', color: '#f4efe4', upg: { eng: 2, arm: 3, sticker: 'none', horn: 'tri' } }, p.x + 60, p.y + 70, 0); v.homeCondo = true; }
      ACH.check(); SAVE.auto(); return;
    }
    if (P.vehicle) { if (this.isGarage(p.key)) this.store(P.vehicle); return; }
    P.hp = 100; SAVE.write('auto'); AUD.success();
    if (this.isGarage(p.key)) this.openGarage(p);
  },
  // ---------- garage ----------
  store(v) {
    if (v.mission || v.isCop || v.dead || v.t.boat) { UI.toast('Hindi pwedeng i-garahe ang sasakyang ito.'); return; }
    if (WANTED.stars > 0) { UI.toast('May humahabol sa iyo! Iwala muna ang pulis.'); return; }
    if (this.garage.length >= this.MAX_GARAGE) { UI.toast(`Puno na ang garahe (${this.MAX_GARAGE} sasakyan).`); return; }
    this.garage.push(SAVE.vehData(v));
    G.exitVehicle(true); v.remove = true; AUD.door();
    UI.toast(`🅿️ Naiparada ang ${v.t.name} sa garahe (${this.garage.length}/${this.MAX_GARAGE})`);
    SAVE.auto();
  },
  openGarage(p) {
    G.paused = true;
    const el = document.getElementById('shop-list');
    document.getElementById('shop-title').textContent = `GARAHE (${this.garage.length}/${this.MAX_GARAGE})`;
    el.innerHTML = this.garage.length ? this.garage.map((c, i) => {
      const u = c.upg || {};
      return `<div class="shoprow"><span class="ic" style="color:${c.color}">■</span><div><b>${VT[c.type].name}</b><small>${c.plate}${u.eng ? ' · Makina ' + u.eng : ''}${u.arm ? ' · Armor ' + u.arm : ''}${u.sticker && u.sticker !== 'none' ? ' · sticker' : ''}</small></div><button data-take="${i}">KUNIN</button></div>`;
    }).join('') : '<p style="text-align:center;color:var(--muted);font-weight:800">Walang sasakyan sa garahe. Mag-drive papunta dito at pindutin ang E / GAMIT para mag-park.</p>';
    el.querySelectorAll('button[data-take]').forEach(b => b.onclick = () => {
      const d = this.garage.splice(+b.dataset.take, 1)[0];
      UI.hide('shop'); G.paused = false;
      let x = p.x, y = p.y + 70;
      for (const [ox, oy] of [[0, 70], [0, -70], [80, 0], [-80, 0], [0, 110]]) if (!MAP.solidAt(p.x + ox, p.y + oy)) { x = p.x + ox; y = p.y + oy; break; }
      const v = this.spawnCar(d, x, y, 0);
      G.player.x = x; G.player.y = y; G.enterVehicle(v); SAVE.auto();
    });
    UI.show('shop');
  },
  // ---------- car customization (at Pintura) ----------
  openCustom() {
    const v = G.player.vehicle; if (!v) return;
    if (SHOP.watched()) { UI.toast('👀 May pulis na nakatingin! Mawala ka muna sa paningin nila.'); return; }
    G.paused = true;
    v.upg = v.upg || { eng: 0, arm: 0, sticker: 'none', horn: 'normal' };
    const u = v.upg, dc = this.discount(), free = MS.freeShops;
    const cost = (n) => free ? 0 : Math.round(n * dc);
    const el = document.getElementById('shop-list');
    document.getElementById('shop-title').textContent = `PINTURA: ${v.t.name}${dc < 1 ? ' (−50% may-ari ka ng Talyer)' : ''}`;
    const lvl = (k, name, ic) => {
      const n = u[k] || 0;
      return `<div class="shoprow"><span class="ic">${ic}</span><div><b>${name} ${'●'.repeat(n)}${'○'.repeat(3 - n)}</b><small>${k === 'eng' ? '+8% bilis bawat level' : '+35% tibay bawat level'}</small></div>${n < 3 ? `<button data-up="${k}">LEVEL ${n + 1} · ${U.money(cost(UPG_PRICE[n]))}</button>` : '<button disabled>MAX</button>'}</div>`;
    };
    el.innerHTML = `
      <div class="shoprow"><span class="ic">🎨</span><div><b>Bagong kulay + plaka</b><small>Ayos din ang sira · nililinis ang "sasakyan" clue ng pulis · ${U.money(cost(300))}</small></div></div>
      <div class="swatches">${PAINTS.map(c => `<button class="sw" data-paint="${c}" style="background:${c}"></button>`).join('')}</div>
      <div class="shoprow"><span class="ic">🔧</span><div><b>Ayusin lang</b><small>Buo ulit ang sasakyan at gulong</small></div><button data-fix="1">AYUSIN · ${U.money(cost(100))}</button></div>
      ${lvl('eng', 'Makina', '⚙️')}${lvl('arm', 'Armor', '🛡')}
      <div class="shoprow"><span class="ic">✨</span><div><b>Sticker</b><small>${U.money(cost(250))} bawat palit</small></div></div>
      <div class="chips">${STICKERS.map(([id, n]) => `<button class="chip ${u.sticker === id ? 'on' : ''}" data-st="${id}">${n}</button>`).join('')}</div>
      <div class="shoprow"><span class="ic">📯</span><div><b>Busina</b><small>${U.money(cost(150))} bawat palit · H para subukan</small></div></div>
      <div class="chips">${HORNS.map(([id, n]) => `<button class="chip ${u.horn === id ? 'on' : ''}" data-horn="${id}">${n}</button>`).join('')}</div>
      ${CARMOD.rows(u, cost)}`;
    const pay = (n) => { n = cost(n); if (G.player.money < n) { UI.toast('Kulang ang pera mo!'); AUD.fail(); return false; } G.addMoney(-n); return true; };
    el.querySelectorAll('[data-paint]').forEach(b => b.onclick = () => {
      if (!pay(300)) return;
      v.color = b.dataset.paint; v.color2 = U.choice(JEEP_COLORS); v.color3 = U.choice(JEEP_COLORS);
      v.hp = v.maxhp; v.popped = false; v.plate = U.plate(); v.ident = ++VID; AUD.spray(); UI.toast(`🎨 Bagong kulay at plaka: ${v.plate}`); this.openCustom();
    });
    el.querySelectorAll('[data-fix]').forEach(b => b.onclick = () => { if (!pay(100)) return; v.hp = v.maxhp; v.popped = false; AUD.coin(); this.openCustom(); });
    el.querySelectorAll('[data-up]').forEach(b => b.onclick = () => {
      const k = b.dataset.up; if (!pay(UPG_PRICE[u[k] || 0])) return;
      u[k] = (u[k] || 0) + 1; this.applyUpg(v); AUD.cash(); ACH.check(); this.openCustom();
    });
    el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { if (u.sticker === b.dataset.st || !pay(250)) return; u.sticker = b.dataset.st; AUD.spray(); this.openCustom(); });
    el.querySelectorAll('[data-horn]').forEach(b => b.onclick = () => { if (u.horn === b.dataset.horn || !pay(150)) return; u.horn = b.dataset.horn; AUD.horn(false, u.horn); this.openCustom(); });
    CARMOD.bind(el, u, pay, () => this.openCustom());
    UI.show('shop');
  },
};

// sticker decals drawn on top of the car body (local coords, front = +x)
function drawSticker(g, v, hl, hw) {
  const s = v.upg && v.upg.sticker; if (!s || s === 'none' || v.burnt) return;
  if (s === 'flame') {
    g.fillStyle = '#ff7a1a';
    for (const sy of [-1, 1]) { g.beginPath(); g.moveTo(hl * 0.9, sy * (hw - 4)); for (let k = 0; k < 4; k++) { g.lineTo(hl * (0.6 - k * 0.22), sy * (hw - 3 - (k % 2) * 5)); } g.lineTo(-hl * 0.3, sy * (hw - 2)); g.lineTo(hl * 0.9, sy * (hw - 1)); g.fill(); }
    g.fillStyle = '#ffd23f'; g.fillRect(hl * 0.5, -hw + 2, hl * 0.3, 2); g.fillRect(hl * 0.5, hw - 4, hl * 0.3, 2);
  } else if (s === 'stripes') {
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(-hl + 2, -5, hl * 2 - 4, 3); g.fillRect(-hl + 2, 2, hl * 2 - 4, 3);
  } else if (s === 'araw') {
    g.save(); g.translate(hl * 0.62, 0); g.fillStyle = '#ffd23f';
    for (let k = 0; k < 8; k++) { g.rotate(TAU / 8); g.fillRect(4, -1.2, 5, 2.4); }
    g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); g.restore();
  } else if (s === 'number') {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(hl * 0.62, 0, 7, 0, TAU); g.fill();
    g.fillStyle = '#111'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(v.plate.slice(-2)), hl * 0.62, 0.5);
  } else if (s === 'bulaklak') {
    for (const [fx, fy] of [[hl * 0.6, -hw * 0.4], [hl * 0.7, hw * 0.35], [-hl * 0.5, 0]]) {
      g.fillStyle = '#ff6fa8'; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(fx + Math.cos(a) * 3, fy + Math.sin(a) * 3, 2.2, 0, TAU); g.fill(); }
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(fx, fy, 1.6, 0, TAU); g.fill();
    }
  }
}

// ===== Achievements & completion =====
const ACH_LIST = [
  ['first_mission', '🥇', 'Unang Hakbang', 'Tapusin ang unang misyon', () => MS.idx >= 1],
  ['story', '👑', 'Hari ng Kalsada', 'Tapusin ang Kabanata 1 (Manila)', () => MS.idx >= 8],
  ['chapter2', '🌾', 'Anak ng Bukid', 'Tapusin ang Kabanata 2 (San Isidro)', () => MS.idx >= 14],
  ['endingA', '⚖️', 'Lupa ng Bayan', 'Makuha ang Ending A', () => G.flags && G.flags.ending2 === 'A'],
  ['chapter3', '🏝', 'Bayani ng Cebu', 'Tapusin ang Kabanata 3 (Cebu)', () => !!(G.flags && G.flags.final)],
  ['chapter4', '🦅', 'Tagapagtanggol ng Agila', 'Tapusin ang Kabanata 4 (Davao)', () => !!(G.flags && G.flags.ch4)],
  ['chapter5', '🌲', 'Ang Huling Ninong', 'Tapusin ang Kabanata 5 (Baguio) — ang buong serye!', () => !!(G.flags && G.flags.ch5)],
  ['presa10', '🍓', 'Strawberry Hunter', 'Makuha ang 10 gintong strawberry sa Baguio', () => COLL.count('presa') >= 10],
  ['ruta3', '🚌', 'Hari ng Ruta', 'Tapusin ang 3 ruta ng jeep', () => (G.stats.rutas || 0) >= 3],
  ['carshow1', '🏆', 'Pinakaastig na Kotse', 'Manalo sa Car Show', () => (G.stats.carshowWins || 0) >= 1],
  ['turfall', '🏘', 'Tagapagtanggol ng Bayan', 'Palayain ang lahat ng teritoryo nang sabay', () => KUTA.list && KUTA.list.length > 3 && KUTA.list.every(k => KUTA.cleared(k.key))],
  ['weekly1', '🏅', 'Lingguhang Kampeon', 'Tapusin ang isang lingguhang hamon', () => (G.stats.weeklies || 0) >= 1],
  ['errand10', '📋', 'Matulungin', 'Tapusin ang 10 pakiusap sa phone', () => (G.stats.errands || 0) >= 10],
  ['date1', '💑', 'Unang Date', 'Mag-date kasama ang isang espesyal na tao', () => (G.stats.dates || 0) >= 1],
  ['kasal', '💒', 'Habambuhay', 'Magpakasal sa simbahan', () => !!(G.flags.fam && G.flags.fam.stage === 'married')],
  ['anak', '👶', 'Tatay/Nanay na!', 'Magkaroon ng anak', () => !!(G.flags.fam && G.flags.fam.kids.length)],
  ['mansyon', '🏰', 'Mansyon ng Pamilya', 'I-upgrade ang bahay sa Mansyon', () => !!(G.flags.fam && G.flags.fam.house >= 3)],
  ['trial1', '⏱', 'Laban sa Oras', 'Tapusin ang isang Time Trial', () => (G.stats.trials || 0) >= 1],
  ['ghost1', '👻', 'Talo ang Multo', 'Talunin ang ghost ng kaibigan sa Time Trial', () => !!G.stats.beatFriend],
  ['share1', '📤', 'Ipinagmamalaki', 'Mag-share ng litrato o ghost sa kaibigan', () => (G.stats.shared || 0) >= 1],
  ['heli1', '🚁', 'Piloto', 'Umarkila at magpalipad ng helicopter', () => (G.stats.heli || 0) >= 1],
  ['sakay5', '📱', '5-Star Driver', 'Tapusin ang 5 booking sa Sakay App', () => (G.stats.sakay || 0) >= 5],
  ['fish10', '🎣', 'Mangingisda', 'Makahuli at magbenta ng 10 isda', () => (G.stats.fish || 0) >= 10],
  ['tour3', '📸', 'Tour Guide', 'Tapusin ang 3 tour', () => (G.stats.tours || 0) >= 3],
  ['laro', '🥫', 'Larong Pinoy', '5 tumba sa Tumbang Preso o 30 sa Sipa', () => (G.stats.tumbang || 0) >= 5 || (G.stats.sipa || 0) >= 30],
  ['trueEnding', '👑', 'Tunay na Hari', 'Makuha ang Tunay na Wakas (bayan + ilantad)', () => !!(G.flags && G.flags.final === 'AC')],
  ['flight1', '✈️', 'Frequent Flyer', 'Sumakay ng eroplano papuntang Cebu', () => (G.stats.flights || 0) >= 1],
  ['endingB', '💰', 'Ang Presyo', 'Makuha ang Ending B', () => G.flags && G.flags.ending2 === 'B'],
  ['escape3', '🏃', 'Madulas', 'Takasan ang 3 bituin o higit pa', () => ACH.flags.escape3],
  ['escape6', '🌪', 'Imposible', 'Takasan ang 6 na bituin', () => ACH.flags.escape6],
  ['ts10', '🩴', 'Tsinelas Hunter', 'Makakuha ng 10 Gintong Tsinelas', () => G.tsinelas.size >= 10],
  ['ts20', '✨', 'Gintong Paa', 'Makuha ang lahat ng Gintong Tsinelas', () => G.tsinelas.size >= MAP.tsinelas.length],
  ['districts', '🗺', 'Turista', 'Puntahan ang lahat ng distrito', () => ACH.visited.size >= ACH.districtCount()],
  ['island', '🏝', 'Islander', 'Pumunta sa Isla Maligaya', () => ACH.visited.has('ISLA MALIGAYA')],
  ['prop1', '🔑', 'May-ari', 'Bumili ng unang ari-arian', () => ECON.owned.size >= 1],
  ['propall', '🏰', 'Haciendero', 'Bilhin ang lahat ng ari-arian', () => ECON.owned.size >= PROPS.length],
  ['pasada10', '🚌', 'Hari ng Pasada', '10 pasada sa jeepney', () => G.stats.pasada >= 10],
  ['rider5', '🛵', 'Rider of the Month', '5 food delivery', () => G.stats.rider >= 5],
  ['taxi5', '🚕', 'Suki ng Taxi', '5 taxi rides', () => G.stats.taxi >= 5],
  ['tow5', '🛻', 'Hila Master', 'Mag-tow ng 5 sasakyan', () => G.stats.tow >= 5],
  ['race1', '🏁', 'Kampeon sa Kalye', 'Manalo sa underground race', () => G.stats.races >= 1],
  ['vigil3', '🦸', 'Bayani ng Bayan', 'Mahuli ang 3 carnapper', () => G.stats.vigil >= 3],
  ['vehicles8', '🚗', 'Kolektor', 'Mag-drive ng 8 klase ng sasakyan', () => ACH.drove.size >= 8],
  ['maxcar', '⚙️', 'Full Upgrade', 'I-max ang makina at armor ng isang sasakyan', () => { const v = G.player.vehicle; return !!(v && v.upg && v.upg.eng >= 3 && v.upg.arm >= 3); }],
  ['armed', '🎯', 'Armado', 'Magkaroon ng lahat ng armas sa Hardware', () => ['pamalo', 'tirador', 'watergun'].every(w => G.player.weapons && G.player.weapons[w] !== undefined)],
  ['medic3', '🚑', 'Sagip-Buhay', 'Maihatid ang 3 pasyente sa ospital', () => (G.stats.medic || 0) >= 3],
  ['fire3', '🚒', 'Bumbero ng Taon', 'Patayin ang 3 sunog', () => (G.stats.fire || 0) >= 3],
  ['garbage1', '♻️', 'Malinis na Manila', 'Tapusin ang isang ruta ng basura', () => (G.stats.garbage || 0) >= 1],
  ['pasyalan', '📸', 'Turista ng Pilipinas', 'Bisitahin ang 8 pasyalan (tingnan ang 🎉 sa mapa)', () => ((G.stats.lm || []).length) >= 8],
  ['lvl10', '⭐', 'Beterano', 'Umabot sa Level 10', () => (G.player.level || 1) >= 10],
  ['kabibe10', '🐚', 'Kolektor ng Kabibe', 'Makuha ang 10 kabibe sa Cebu', () => COLL.count('kabibe') >= 10],
  ['balahibo10', '🪶', 'Balahibo ng Agila', 'Makuha ang 10 balahibo sa Davao', () => COLL.count('balahibo') >= 10],
  ['events5', '🦸', 'Mabuting Kapitbahay', 'Tumulong sa 5 pangyayari sa kalye', () => (G.stats.events || 0) >= 5],
  ['dog1', '🐕', 'May Kaibigan', 'Mag-ampon ng askal', () => !!(G.flags && G.flags.dog)],
  ['simbang9', '🌅', 'Simbang Gabi', 'Kumpletuhin ang 9 na Simbang Gabi', () => !!(G.flags && G.flags.simbang && G.flags.simbang.length >= 9)],
  ['daily1', '📅', 'Masipag', 'Kumpletuhin ang lahat ng hamon sa isang araw', () => (G.stats.dailyAll || 0) >= 1],
  ['gold5', '🥇', 'Gintong Driver', 'Makakuha ng 5 gintong medalya sa replay', () => Object.values(G.grades || {}).filter(g => g === 'gold').length >= 5],
  ['rescue10', '🛟', 'Bayani ng Bagyo', 'Magligtas ng 10 tao sa bagyo', () => (G.stats.rescued || 0) >= 10],
  ['fiesta1', '🎉', 'Pistahan!', 'Sumayaw sa parada ng Pista sa Tondo', () => (G.stats.parade || 0) >= 1],
  ['videoke90', '🎤', 'Tawag ng Tanghalan', 'Makakuha ng 90+ sa Videoke', () => (G.stats.vkTop || 0) >= 90],
  ['shoot10', '🏀', 'Tres Points', 'Makakuha ng 10+ puntos sa 3-Point Shootout', () => (G.stats.shootBest || 0) >= 10],
  ['fashion', '👗', 'Fashionista', 'Magkaroon ng 8 damit sa aparador', () => WARDROBE.owned.outfits.size >= 8],
  ['photo1', '📸', 'Selfie sa Manila', 'Kumuha ng litrato sa Photo Mode', () => (G.stats.photos || 0) >= 1],
  ['gun1', '🔫', 'Kasa Na', 'Bumili ng unang baril sa Armas ni Kabo', () => GUN_IDS.some(w => GUNS.owned(w))],
  ['arsenal', '🧰', 'Arsenal', 'Magkaroon ng lahat ng baril at granada', () => GUN_IDS.concat('granada').every(w => GUNS.owned(w))],
  ['kuta1', '☠️', 'Unang Kuta', 'Linisin ang isang kuta ng sindikato', () => !!(G.flags.kuta && Object.keys(G.flags.kuta).length >= 1)],
  ['kutaall', '🛡', 'Linis-Bayan', 'Linisin ang lahat ng 3 kuta ng sindikato', () => !!(G.flags.kuta && Object.keys(G.flags.kuta).length >= 3)],
  ['range25', '🥫', 'Asintado', '25+ tama sa Barilan ng Lata', () => (G.stats.rangeBest || 0) >= 25],
  ['rich', '💰', 'Milyonaryo (Halos)', 'Kumita ng ₱100,000 sa kabuuan', () => (G.stats.earned || 0) >= 100000],
];
const ACH = {
  got: new Set(), visited: new Set(), drove: new Set(), flags: {}, t: 0,
  districtCount() { return MAP.labels.filter(l => !l.vert).length; },
  check() {
    if (!G.started) return;
    for (const [id, ic, name, desc, fn] of ACH_LIST) {
      if (this.got.has(id)) continue;
      let ok = false; try { ok = fn(); } catch (e) { }
      if (ok) { this.got.add(id); if (G.frame < 400) UI.toast(`🏆 Tagumpay: ${name}`); else { UI.big(`${ic} TAGUMPAY!`, name, 2.4, 'good'); AUD.success(); } }
    }
  },
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 1;
    const P = G.player;
    for (const k in MAP.pois) { const p = MAP.pois[k]; if (!p.landmark) continue; const lm = G.stats.lm = G.stats.lm || []; if (!lm.includes(k) && U.d2(p.x, p.y, P.x, P.y) < 160 * 160) { lm.push(k); UI.toast(`📸 Pasyalan: ${p.label} (${lm.length})`); this.check(); } }
    for (const l of MAP.labels) if (!l.vert && !this.visited.has(l.name) && U.d2(l.x, l.y, P.x, P.y) < 650 * 650) { this.visited.add(l.name); UI.toast(`🗺 Napuntahan: ${l.name} (${this.visited.size}/${this.districtCount()})`); }
    if (P.vehicle) this.drove.add(P.vehicle.type);
    this.check();
  },
  percentOf(d) {
    const m = Math.min(d.m || 0, MISSIONS.length) / MISSIONS.length;
    const ts = (d.ts || []).length / Math.max(1, MAP.tsinelas.length);
    const pr = (d.props || []).length / PROPS.length;
    const ac = (d.ach || []).length / ACH_LIST.length;
    return Math.round(m * 40 + ts * 15 + pr * 15 + ac * 30);
  },
  percent() { return this.percentOf({ m: MS.idx, ts: [...G.tsinelas], props: [...ECON.owned], ach: [...this.got] }); },
  open() {
    document.getElementById('ach-pct').textContent = `${this.percent()}% KUMPLETO`;
    document.getElementById('ach-list').innerHTML = ACH_LIST.map(([id, ic, name, desc]) =>
      `<div class="ach ${this.got.has(id) ? 'got' : ''}"><span>${this.got.has(id) ? ic : '🔒'}</span><div><b>${name}</b><small>${desc}</small></div></div>`).join('');
    UI.show('achievements');
  },
};
