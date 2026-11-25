'use strict';
// ===== Progression: levels & skills, daily challenges, mission replays with grades, New Game+ =====
const SKILLS = [
  { id: 'drive', icon: '🚗', name: 'Pagmamaneho', desc: '+4% bilis at kapit ng sasakyan bawat antas' },
  { id: 'aim', icon: '🎯', name: 'Asinta', desc: 'Mas tumpak (−12% kalat) at +5% lakas ng baril bawat antas' },
  { id: 'stamina', icon: '🏃', name: 'Tibay sa Takbo', desc: '+6% bilis tumakbo bawat antas' },
  { id: 'tough', icon: '🛡', name: 'Tibay ng Katawan', desc: '−7% na tama/sakit bawat antas' },
];
const PROG = {
  need(l) { return Math.round(100 * Math.pow(l, 1.35)); },
  sk(id) { const P = G.player; return (P.skills && P.skills[id]) || 0; },
  xp(n, why) {
    const P = G.player; if (!P || !G.started || n <= 0) return;
    P.xp = (P.xp || 0) + Math.round(n); P.level = P.level || 1;
    let up = false;
    while (P.xp >= this.need(P.level)) { P.xp -= this.need(P.level); P.level++; P.sp = (P.sp || 0) + 1; up = true; }
    if (up) { UI.big(`⭐ LEVEL ${P.level}!`, 'May bagong skill point — ☰ → 📈 SKILLS', 2.6, 'good'); AUD.success(); ACH.check(); }
  },
  // effects
  runMul() { return 1 + this.sk('stamina') * 0.06 + (G.player.buffT > 0 ? 0.2 : 0); },
  dmgMul() { return 1 - this.sk('tough') * 0.07; },
  aimSpread() { return 1 - this.sk('aim') * 0.12; },
  aimDmg() { return 1 + this.sk('aim') * 0.05; },
  driveMul() { return 1 + this.sk('drive') * 0.04; },
  open() {
    const P = G.player; P.level = P.level || 1;
    const el = document.getElementById('skill-list'), need = this.need(P.level);
    document.getElementById('skill-head').innerHTML = `<b>LEVEL ${P.level}</b><div class="bar xpbar"><div style="width:${Math.round((P.xp || 0) / need * 100)}%"></div></div><small>${P.xp || 0} / ${need} XP · Skill points: <b>${P.sp || 0}</b></small>`;
    el.innerHTML = SKILLS.map(s => { const lv = this.sk(s.id); return `<div class="shoprow"><span class="ic">${s.icon}</span><div><b>${s.name} <span class="pips">${'●'.repeat(lv)}${'○'.repeat(5 - lv)}</span></b><small>${s.desc}</small></div><button data-s="${s.id}" ${(P.sp || 0) < 1 || lv >= 5 ? 'disabled' : ''}>${lv >= 5 ? 'MAX' : '+1'}</button></div>`; }).join('');
    el.querySelectorAll('button[data-s]').forEach(b => b.onclick = () => { P.skills = P.skills || {}; P.skills[b.dataset.s] = this.sk(b.dataset.s) + 1; P.sp--; AUD.success(); ACH.check(); this.open(); });
    UI.show('skills');
  },
};

// ---------- daily challenges (new set every real day) ----------
const DAILY_POOL = [
  { id: 'rider', text: 'Mag-deliver ng 3 pagkain (🛵 Rider)', stat: 'rider', n: 3 },
  { id: 'taxi', text: 'Magsakay ng 3 pasahero sa taxi', stat: 'taxi', n: 3 },
  { id: 'esc', text: 'Takasan ang pulis ng 2 beses', stat: 'escapes', n: 2 },
  { id: 'snack', text: 'Bumili ng 3 pagkain sa mga naglalako', stat: 'snacks', n: 3 },
  { id: 'event', text: 'Tumulong sa 2 pangyayari sa kalye', stat: 'events', n: 2 },
  { id: 'earn', text: 'Kumita ng ₱3,000', stat: 'earned', n: 3000 },
  { id: 'pasada', text: 'Mag-pasada ng 2 beses sa jeepney', stat: 'pasada', n: 2 },
  { id: 'tow', text: 'Mag-tow ng 2 sasakyan', stat: 'tow', n: 2 },
  { id: 'medic', text: 'Maghatid ng 2 pasyente (🚑)', stat: 'medic', n: 2 },
  { id: 'fire', text: 'Patayin ang 2 sunog (🚒)', stat: 'fire', n: 2 },
  { id: 'photo', text: 'Kumuha ng 2 litrato sa Photo Mode', stat: 'photos', n: 2 },
  { id: 'indoor', text: 'Kumain o mamili sa loob ng 2 lugar', stat: 'indoor', n: 2 },
  { id: 'sold', text: 'Magbenta ng 2 sasakyan kay Mang Ben', stat: 'sold', n: 2 },
  { id: 'shots', text: 'Magpaputok ng 60 bala', stat: 'shots', n: 60 },
];
const DAILY = {
  key() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },
  ensure() {
    const k = this.key();
    if (G.daily && G.daily.day === k) return G.daily;
    const R = U.rng([...k].reduce((a, c) => a * 31 + c.charCodeAt(0), 11) >>> 0), pool = DAILY_POOL.slice(), pick = [];
    while (pick.length < 3) pick.push(pool.splice(Math.floor(R() * pool.length), 1)[0].id);
    const base = {}; for (const id of pick) { const c = DAILY_POOL.find(x => x.id === id); base[c.stat] = G.stats[c.stat] || 0; }
    return (G.daily = { day: k, ids: pick, base, done: [] });
  },
  prog(c) { const d = this.ensure(); return Math.max(0, Math.min(c.n, (G.stats[c.stat] || 0) - (d.base[c.stat] || 0))); },
  t: 0,
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 2;
    const d = this.ensure();
    for (const id of d.ids) {
      if (d.done.includes(id)) continue;
      const c = DAILY_POOL.find(x => x.id === id);
      if (this.prog(c) >= c.n) {
        d.done.push(id); G.addMoney(500, true); PROG.xp(60, 'Hamon');
        UI.big('📅 HAMON TAPOS!', `${c.text} · +₱500`, 2.4, 'good');
        if (d.done.length === 3) setTimeout(() => { G.addMoney(1500, true); UI.big('📅 LAHAT NG HAMON!', 'Bonus +₱1,500', 2.4, 'good'); G.stats.dailyAll = (G.stats.dailyAll || 0) + 1; ACH.check(); }, 2600);
      }
    }
  },
  open() {
    const d = this.ensure(), el = document.getElementById('daily-list');
    el.innerHTML = d.ids.map(id => { const c = DAILY_POOL.find(x => x.id === id), p = this.prog(c), ok = d.done.includes(id); return `<div class="shoprow ${ok ? 'done' : ''}"><span class="ic">${ok ? '✅' : '📅'}</span><div><b>${c.text}</b><div class="bar xpbar"><div style="width:${Math.round(p / c.n * 100)}%"></div></div><small>${p} / ${c.n} · Premyo: ₱500 + 60 XP</small></div></div>`; }).join('')
      + `<p class="note">Kumpletuhin ang tatlo para sa bonus na ₱1,500. Bagong hamon bukas!</p>`;
    UI.show('daily');
  },
};

// ---------- mission replays with grades ----------
const REPLAY = {
  on: false,
  start(i) {
    if (MS.active || JOBS.active) { UI.toast('Tapusin muna ang ginagawa mo.'); return; }
    const m = MISSIONS[i];
    this.on = true; this.m = m; this.t = 0; this.hp0 = G.player.hp; this.dmg = 0; this.flags = JSON.parse(JSON.stringify(G.flags || {})); this.wasted = false;
    UI.hide('missions'); UI.hide('pause'); G.paused = false;
    const pos = m.cp && m.cp.pos ? m.cp.pos() : MS.giverPOI(m);
    const P = G.player; if (P.vehicle) G.exitVehicle(true);
    const g = MS.giverPOI(m); P.x = g.x; P.y = g.y + 40; G.cam.x = P.x; G.cam.y = P.y;
    MS.start(i);
    UI.toast('🔁 REPLAY — para sa medalya! 🥇🥈🥉');
  },
  update(dt) {
    if (!this.on) return;
    if (!MS.active) { this.finish(false); return; }
    this.t += dt;
    if (G.player.hurtT > 0.29) this.dmg += 1;
  },
  par(m) { return m.par || 60 + m.stages.length * 40; },
  // called from MS.complete when replaying
  complete(m) {
    const t = this.t, par = this.par(m);
    const medal = t <= par && this.dmg < 12 ? 'gold' : t <= par * 1.7 ? 'silver' : 'bronze';
    const best = G.grades = G.grades || {}, rank = { bronze: 1, silver: 2, gold: 3 };
    if (!best[m.id] || rank[medal] > rank[best[m.id]]) best[m.id] = medal;
    const icon = { gold: '🥇', silver: '🥈', bronze: '🥉' }[medal];
    setTimeout(() => UI.big(`${icon} ${{ gold: 'GINTO', silver: 'PILAK', bronze: 'TANSO' }[medal]}!`, `${m.title} · ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')} (par ${Math.floor(par / 60)}:${String(par % 60).padStart(2, '0')})`, 3, 'good'), 3200);
    PROG.xp(medal === 'gold' ? 120 : medal === 'silver' ? 70 : 40, 'Replay');
    this.finish(true);
  },
  finish(ok) {
    if (!this.on) return;
    this.on = false; G.flags = Object.assign(G.flags || {}, this.flags); this.noEndingUntil = performance.now() + 4000;
    ACH.check();
  },
  gradeIcon(m) { const g = G.grades && G.grades[m.id]; return g ? { gold: '🥇', silver: '🥈', bronze: '🥉' }[g] : ''; },
};

// ---------- New Game+ ----------
const NGPLUS = {
  available() { const s = SAVE.read && SAVE.read('auto'); return !!(s && s.flags && (s.flags.ch4 || s.flags.ch5)); },
  start() {
    const s = SAVE.read('auto'); if (!s) return;
    G.newGame();
    const P = G.player;
    P.money = s.money || 0; P.weapons = Object.assign({ fists: true }, s.weapons || {}); P.mags = Object.assign({}, s.mags || {}); P.armor = s.armor || 0;
    P.level = s.level || 1; P.xp = s.xp || 0; P.sp = s.sp || 0; P.skills = Object.assign({}, s.skills || {});
    if (s.look) Object.assign(P.look, s.look);
    ECON.garage = s.garage || []; WARDROBE.load(s.ward);
    ACH.got = new Set(s.ach || []); G.grades = s.grades || {}; G.coll = new Set(s.coll || []);
    G.flags.ngplus = ((s.flags && s.flags.ngplus) || 0) + 1;
    if (s.flags && s.flags.dog) G.flags.dog = s.flags.dog;
    UI.big('✨ NEW GAME+', `Ika-${G.flags.ngplus} ikot · dala mo ang pera, armas, sasakyan at level mo · ×1.5 premyo`, 3.2, 'good');
  },
  mult() { return G.flags && G.flags.ngplus ? 1.5 : 1; },
};
