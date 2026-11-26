'use strict';
// ===== A more lively, more engaging world: phone errands, street chatter, daily login rewards,
// tips for newer features, bug reports and a support button =====

// ---------- tips for the newer features ----------
Object.assign(TIPS, {
  love: () => ['💗 May bagong kakilala', 'Lapitan siya at kausapin araw-araw, bigyan ng regalo at yayaing mag-date. Sa 100 ❤️, pwede ka nang mag-propose at magpakasal sa simbahan!'],
  phone: () => ['📱 Cellphone', 'Pindutin ang 📱 (o P) para sa mga mensahe, GPS, pamilya, bangko at 📋 mga pakiusap mula sa mga kakilala mo.'],
  gps: () => ['🧭 GPS', 'Sundan ang LILA na arrow papunta sa lugar na pinili mo. Alisin ito sa mapa (✕ GPS) o sa phone.'],
  errand: () => ['📋 Pakiusap', 'May nag-text na humihingi ng tulong! Tanggapin sa 📱 → 📋 Pakiusap. Sundan ang BERDENG arrow: kunin ang bagay, tapos ihatid bago maubos ang oras.'],
  animals: () => ['🐓 Mga Hayop', 'May mga manok, pusa, kambing at kalabaw sa paligid. Ingat sa pagmamaneho — kawawa naman sila!'],
});

// ---------- phone errands: small favours from people you know ----------
const ERRAND_T = [
  { from: 'Tito Boy', text: 'Nonoy, pabili naman ng pandesal sa sari-sari, dalhin mo dito sa terminal. 🥖', pick: 'sari', drop: () => MAP.pois.home, pay: 300, need: () => MS.idx >= 1 },
  { from: 'Aling Nena', text: 'Iho, pakidala naman ng ulam sa amiga ko. Kunin mo sa Manukan. 🍗', pick: 'kainan', drop: 'landmark', pay: 400 },
  { from: 'Mang Ben', text: 'Boss, may piyesa akong kailangan sa hardware. Bilisan mo ha! 🔧', pick: 'weapon', drop: () => MAP.pois.chop, pay: 500, need: () => MS.idx >= 2 },
  { from: 'Kuya Ramon', text: 'Pre, pasabuy ng milk tea sa mall, ihatid mo sa simbahan — may date ako! 🧋', pick: 'mall', drop: 'church', pay: 450 },
  { from: 'Ate Joy', text: 'Pakisundo naman ang gamot ni Lola sa ospital, dalhin sa bahay namin malapit sa plaza. 💊', pick: 'hospital', drop: 'landmark', pay: 550 },
  { lover: true, text: 'Pasabuy naman ng paborito kong tsokolate sa mall? 🍫 Hintayin kita!', pick: 'mall', drop: 'lover', pay: 200, love: 10 },
  { spouse: true, text: 'Mahal, pabili ng gamot sa ospital para sa bata, tapos uwi ka na. 💊', pick: 'hospital', drop: () => MAP.pois.famhome, pay: 0, love: 0, xp: 80 },
];
const ERRAND = {
  t: 150,
  get e() { return G.flags.errand || null; },
  on() { const e = this.e; return !!(e && (e.stage === 'pick' || e.stage === 'drop')); },
  nearestOf(type) {
    const P = G.player; let best = null, bd = 1e18;
    for (const k in MAP.pois) { const p = MAP.pois[k]; if ((p.landmark ? 'landmark' : p.type) !== type || regionName(p.x) !== regionName(P.x)) continue; const d = U.d2(p.x, p.y, P.x, P.y); if (d < bd && d > 200 * 200) { bd = d; best = p; } }
    return best;
  },
  update(dt) {
    if (!G.started || G.cutscene) return;
    const e = this.e, P = G.player, me = P.vehicle || P;
    if (!e || e.stage === 'done') {
      this.t -= dt;
      if (this.t <= 0 && !MS.active && WANTED.stars === 0) { this.t = U.rand(200, 320); this.offer(); }
      return;
    }
    if (e.stage === 'offer') { e.wait -= dt; if (e.wait <= 0) { G.flags.errand = null; } return; }
    e.time -= dt;
    if (e.time <= 0) { G.flags.errand = null; UI.toast(`⌛ Hindi mo naabutan ang pakiusap ni ${e.from}...`); AUD.fail(); return; }
    const tg = e.stage === 'pick' ? e.pick : e.drop;
    if (U.dist(me.x, me.y, tg.x, tg.y) < (P.vehicle ? 130 : 80)) {
      if (e.stage === 'pick') { e.stage = 'drop'; e.time += 60; UI.toast(`📦 Nakuha mo na! Ihatid sa ${e.drop.label}`); AUD.coin(); }
      else this.finish(e);
    }
  },
  offer() {
    const f = G.flags.fam || {}, P = G.player;
    const opts = ERRAND_T.filter(t => (!t.need || t.need()) && (!t.lover || (f.partner && f.stage !== 'married')) && (!t.spouse || (f.stage === 'married' && f.house)));
    if (!opts.length) return;
    const T0 = U.choice(opts), pick = this.nearestOf(T0.pick); if (!pick) return;
    let drop = typeof T0.drop === 'function' ? T0.drop() : T0.drop === 'lover' ? Object.assign({ label: LOVERS[f.partner].name }, FAMILY.spot(LOVERS[f.partner])) : this.nearestOf(T0.drop);
    if (!drop || U.dist(pick.x, pick.y, drop.x, drop.y) < 250) { const alt = Object.values(MAP.pois).filter(p => p.landmark && regionName(p.x) === regionName(P.x)); drop = U.choice(alt); }
    if (!drop) return;
    const from = T0.lover ? '💗 ' + LOVERS[f.partner].name : T0.spouse ? '💍 ' + LOVERS[f.partner].name : T0.from;
    const dist = U.dist(P.x, P.y, pick.x, pick.y) + U.dist(pick.x, pick.y, drop.x, drop.y);
    G.flags.errand = { stage: 'offer', wait: 240, from, text: T0.text, pick: { x: pick.x, y: pick.y, label: pick.label }, drop: { x: drop.x, y: drop.y, label: drop.label || 'bahay' }, time: Math.round(dist / 170 + 45), pay: T0.pay, love: T0.love || 0, xp: T0.xp || 40 };
    PHONE.msg(from, T0.text + ' (📱 → 📋 Pakiusap)');
    TIP.show('errand');
  },
  accept() { const e = this.e; if (!e || e.stage !== 'offer') return; e.stage = 'pick'; AUD.success(); UI.toast(`📋 Tinanggap! Kunin sa ${e.pick.label}`); },
  decline() { G.flags.errand = null; },
  finish(e) {
    G.flags.errand = Object.assign(e, { stage: 'done' });
    const bonus = Math.max(0, Math.round(e.time)) * 3, pay = e.pay ? e.pay + bonus : 0;
    if (pay) G.addMoney(pay, true);
    if (e.love && G.flags.fam && G.flags.fam.partner) FAMILY.addAff(G.flags.fam.partner, e.love);
    PROG.xp(e.xp, 'Pakiusap'); G.stats.errands = (G.stats.errands || 0) + 1; AUD.success();
    UI.big('📋 SALAMAT!', `Pakiusap ni ${e.from}${pay ? ` · +${U.money(pay)}` : ''}${e.love ? ` · +${e.love} ❤️` : ''}`, 2.4, 'good'); ACH.check();
    G.flags.errand = null;
  },
  target() { const e = this.e; if (!this.on()) return null; const t = e.stage === 'pick' ? e.pick : e.drop; return { x: t.x, y: t.y, stop: true }; },
  text() { const e = this.e; if (!this.on()) return ''; return `📋 ${e.from}: ${e.stage === 'pick' ? 'kunin sa ' + e.pick.label : 'ihatid sa ' + e.drop.label} (${Math.max(0, Math.ceil(e.time))}s)`; },
  panel() {
    const e = this.e;
    if (!e) return `<p class="note">Wala pang pakiusap. Maghintay ng text mula sa mga kakilala mo!</p><p class="note">Natapos: ${G.stats.errands || 0}</p>`;
    const st = e.stage === 'offer' ? 'Bagong pakiusap' : e.stage === 'pick' ? `Kunin sa ${e.pick.label}` : `Ihatid sa ${e.drop.label}`;
    return `<div class="ph-msg"><b>${e.from}</b><span>${e.text}</span><small>${st}${e.pay ? ' · Bayad: ' + U.money(e.pay) + ' + bonus sa bilis' : ''}</small></div>`
      + (e.stage === 'offer' ? `<div class="ph-list"><button data-err="ok">✅ TANGGAPIN</button><button data-err="no">✕ Tanggihan</button></div>` : `<div class="ph-list"><button data-err="no">✕ Kanselahin</button></div>`);
  },
};

// ---------- street chatter: people react to the weather, the time, your car and your fame ----------
const CHATTER = {
  t: 4,
  lines() {
    const P = G.player, h = WORLD.hour(), r = regionName(P.x), out = [];
    if (WORLD.rain > 0.3) out.push('Ang lakas ng ulan!', 'Wala akong payong...', 'Baha na naman!');
    if (WANTED.stars > 0) out.push('Siya yun! Tawag kayo ng pulis!', 'Ay, delikado!', 'Takbo!');
    if (P.vehicle && ['supercar', 'sports', 'bigbike'].includes(P.vehicle.type)) out.push('Wow, ang ganda ng kotse!', 'Ang yaman naman niyan!');
    if (h < 9 && h >= 5) out.push('Magandang umaga!', 'Taho! Tahooo!', 'Late na ako sa trabaho!');
    else if (h >= 19 || h < 4) out.push('Gabi na, uwi na tayo.', 'Tara, inuman!', 'Ingat sa daan pauwi!');
    else out.push('Ang init!', 'Kumain ka na?', 'Grabe ang traffic!', 'May sale sa mall!', 'Magkano na ang bigas?');
    if ((P.level || 1) >= 5) out.push('Uy, si Nonoy yan! Idol!', 'Pa-picture naman, idol!');
    if (G.flags.fam && G.flags.fam.stage === 'married') out.push('Congrats sa kasal mo!');
    if (/CEBU/i.test(r)) out.push('Maayong adlaw!', 'Lami kaayo ang lechon diri!');
    if (/DAVAO/i.test(r)) out.push('Madayaw!', 'Durian, gusto mo?');
    if (/BAGUIO/i.test(r)) out.push('Ang lamig!', 'Strawberry taho, bili na!');
    return out;
  },
  update(dt) {
    if (!G.started || G.paused || UI.talking) return;
    this.t -= dt; if (this.t > 0) return; this.t = U.rand(3.5, 6.5);
    const P = G.player, near = G.peds.filter(p => p.kind === 'ped' && !p.animal && p.state !== 'down' && !(p.sayT > 0) && U.d2(p.x, p.y, P.x, P.y) < 300 * 300);
    if (!near.length) return;
    const p = U.choice(near); p.say = U.choice(this.lines()); p.sayT = 2.6;
  },
};

// ---------- daily login reward (a streak for coming back each real day) ----------
const STREAK = {
  REWARDS: [300, 500, 800, 1200, 1500, 2000, 3000],
  check() {
    let d; try { d = JSON.parse(localStorage.getItem('hnk_streak') || '{}'); } catch (e) { d = {}; }
    const today = DAILY.key(); if (d.last === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1); const yk = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
    d.n = d.last === yk ? Math.min(7, (d.n || 0) + 1) : 1; d.last = today;
    try { localStorage.setItem('hnk_streak', JSON.stringify(d)); } catch (e) { }
    const pay = this.REWARDS[d.n - 1];
    setTimeout(() => { G.addMoney(pay, true); UI.big(`🎁 ARAW ${d.n} NA SUNOD-SUNOD!`, `Pabalik-balik na premyo +${U.money(pay)}${d.n < 7 ? ' · bumalik bukas para mas malaki!' : ' · MAXIMUM!'}`, 3, 'good'); AUD.cash(); }, 2500);
  },
};

// ---------- bug report & support ----------
const SUPPORT_URL = '';   // put a GCash / Ko-fi / Facebook page link here to show the ☕ Support button
const BUGREPORT = {
  text() {
    const P = G.player || {}, s = (G.started ? `Misyon ${MS.idx + 1}/${MISSIONS.length} · Level ${P.level || 1} · ${regionName(P.x || 0)} · ${WORLD.timeStr()}` : 'Nasa menu');
    return `🐞 Hari ng Kalsada v${GAME_VERSION}\n${s}\nScreen: ${innerWidth}×${innerHeight} @${devicePixelRatio}\nQuality: ${SETTINGS.quality} · Lang: ${SETTINGS.lang} · Touch: ${INPUT.touch}\n${navigator.userAgent}\n\nAno ang nangyari? (isulat dito)`;
  },
  async send() { await SHARE.send(this.text()); },
};
