'use strict';
// ===== Save / Load: 3 manual slots + autosave =====
const SAVE = {
  slots: ['auto', '1', '2', '3'],
  key(s) { return 'harinkalsada_slot_' + s; },
  autoT: 45,
  migrate() {
    try {
      const old = localStorage.getItem('harinkalsada_v1');
      if (old && !localStorage.getItem(this.key('auto'))) {
        const s = JSON.parse(old); s.v = 2; s.saved = Date.now();
        localStorage.setItem(this.key('auto'), JSON.stringify(s));
      }
    } catch (e) { }
  },
  read(slot) {
    try { const d = JSON.parse(localStorage.getItem(this.key(slot))); if (d || slot !== 'auto') return d; } catch (e) { if (slot !== 'auto') return null; }
    try { return JSON.parse(localStorage.getItem(this.key('backup'))); } catch (e) { return null; }   // a broken auto-save falls back to the backup copy
  },
  list() { return this.slots.map(s => ({ slot: s, data: this.read(s) })); },
  latest() {
    let best = null;
    for (const { slot, data } of this.list()) if (data && (!best || (data.saved || 0) > (best.data.saved || 0))) best = { slot, data };
    return best;
  },
  canSave() {
    const P = G.player;
    if (!G.started || G.cutscene || P.downed) return 'Hindi pwedeng mag-save ngayon.';
    if (WANTED.stars > 0) return 'Hindi pwedeng mag-save habang hinahabol ka ng pulis!';
    return null;
  },
  vehData(v) {
    return { type: v.type, color: v.color, color2: v.color2, color3: v.color3, hp: Math.round(v.hp), plate: v.plate, upg: v.upg || null };
  },
  snapshot() {
    const P = G.player;
    return {
      v: 2, ver: GAME_VERSION, saved: Date.now(),
      m: MS.idx, active: MS.active ? MISSIONS.indexOf(MS.active) : -1,
      money: P.money, hp: Math.round(P.hp), look: P.look, pos: { x: Math.round(P.x), y: Math.round(P.y), a: P.a },
      veh: P.vehicle && !P.vehicle.dead && !P.vehicle.mission && !P.vehicle.isCop ? this.vehData(P.vehicle) : null,
      clock: WORLD.clock, day: WORLD.day, rain: WORLD.rainTarget,
      ts: [...G.tsinelas], stats: G.stats, unlock: G.unlock,
      weapons: P.weapons, weapon: P.weapon, mags: P.mags, armor: Math.round(P.armor || 0),
      ward: WARDROBE.save(), flags: G.flags, coll: [...(G.coll || [])], level: P.level || 1, xp: P.xp || 0, sp: P.sp || 0, skills: P.skills || {}, daily: G.daily || null, grades: G.grades || {}, props: [...ECON.owned], garage: ECON.garage, ach: [...ACH.got], visited: [...ACH.visited], drove: [...ACH.drove],
    };
  },
  write(slot, silent) {
    try {
      // keep a second copy of the auto-save (refreshed every 10 minutes) in case the main one ever gets damaged
      if (slot === 'auto' && Date.now() - (this.bkT || 0) > 600000) { const old = localStorage.getItem(this.key('auto')); if (old && old.length > 50) { localStorage.setItem(this.key('backup'), old); this.bkT = Date.now(); } }
      localStorage.setItem(this.key(slot), JSON.stringify(this.snapshot()));
      if (!silent) { UI.toast(`💾 Na-save sa ${slot === 'auto' ? 'Auto-save' : 'Slot ' + slot}!`); AUD.success(); }
      return true;
    } catch (e) { if (!silent) UI.toast('Hindi ma-save: ' + e.message); return false; }
  },
  auto() { if (!this.canSave()) this.write('auto', true); },
  update(dt) {
    this.autoT -= dt;
    if (this.autoT <= 0) { this.autoT = 45; this.auto(); }
  },
  apply(s) {
    G.resetWorld();
    const P = G.player;
    MS.idx = s.m || 0;
    P.money = s.money || 0; P.hp = s.hp || 100;
    if (s.look) Object.assign(P.look, s.look);
    if (s.clock !== undefined) WORLD.clock = s.clock;
    WORLD.day = s.day || 1;
    if (s.rain) { WORLD.rainTarget = s.rain; WORLD.rain = s.rain; }
    G.tsinelas = new Set(s.ts || []);
    G.stats = Object.assign({ sold: 0, pasada: 0, escapes: 0, earned: 0, taxi: 0, rider: 0, tow: 0, races: 0, vigil: 0 }, s.stats || {});
    G.unlock = Object.assign({ sports: false, gold: false }, s.unlock || {});
    P.weapons = Object.assign({ fists: true }, s.weapons || {}); P.weapon = s.weapon && P.weapons[s.weapon] !== undefined ? s.weapon : 'fists';
    P.mags = Object.assign({}, s.mags || {}); P.armor = s.armor || 0;
    G.flags = Object.assign({}, s.flags || {});
    WARDROBE.load(s.ward || { o: [P.look.outfit] });
    G.coll = new Set(s.coll || []); P.level = s.level || 1; P.xp = s.xp || 0; P.sp = s.sp || 0; P.skills = Object.assign({}, s.skills || {}); G.daily = s.daily || null; G.grades = s.grades || {};
    ECON.owned = new Set(s.props || []); ECON.garage = s.garage || []; ECON.refreshIcons();
    ACH.got = new Set(s.ach || []); ACH.visited = new Set(s.visited || []); ACH.drove = new Set(s.drove || []);
    const pos = s.pos || MAP.pois.home;
    P.x = pos.x; P.y = pos.y; P.a = pos.a || 0;
    if (MAP.solidAt(P.x, P.y) && !s.veh) { P.x = MAP.pois.home.x; P.y = MAP.pois.home.y; }
    G.beginPlay();
    if (s.veh) {
      const v = ECON.spawnCar(s.veh, P.x, P.y, P.a);
      G.enterVehicle(v);
    }
    G.spawnHomeCars();
    if (s.active >= 0 && MISSIONS[s.active]) {
      const m = MISSIONS[s.active];
      MS.active = m; MS.stage = m.cp ? m.cp.stage : 0; MS.c = {}; MS.entered = false;
      UI.big(m.title.toUpperCase(), 'Itinuloy mula checkpoint', 2);
    } else UI.big(regionName(G.player.x), MS.idx >= MISSIONS.length ? 'Free roam' : `Susunod: ${MISSIONS[MS.idx].title}`, 2);
  },
  describe(d) {
    if (!d) return null;
    const dt = new Date(d.saved || 0);
    const when = d.saved ? dt.toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' }) + ' ' + dt.toLocaleTimeString('fil-PH', { hour: 'numeric', minute: '2-digit' }) : '';
    const mis = Math.min(d.m || 0, MISSIONS.length);
    const pct = ACH.percentOf(d);
    return { line1: `Misyon ${mis}/${MISSIONS.length} · ${U.money(d.money || 0)} · ${pct}%`, line2: `${d.active >= 0 && MISSIONS[d.active] ? '▶ ' + MISSIONS[d.active].title + ' · ' : ''}na-save ${when}` };
  },
  // ----- backup: export / import every slot as a text code -----
  exportCode() {
    const slots = {};
    for (const s of this.slots) { const d = localStorage.getItem(this.key(s)); if (d) slots[s] = JSON.parse(d); }
    const json = JSON.stringify({ app: 'hari-ng-kalsada', v: 1, at: Date.now(), slots });
    return 'HNK1:' + btoa(unescape(encodeURIComponent(json)));
  },
  importCode(code) {
    try {
      code = (code || '').trim();
      const json = code.startsWith('HNK1:') ? decodeURIComponent(escape(atob(code.slice(5)))) : code;
      const o = JSON.parse(json);
      if (!o || o.app !== 'hari-ng-kalsada' || !o.slots) throw new Error('bad');
      const n = Object.keys(o.slots).length;
      if (!n || !confirm(`I-import ang ${n} save? Papalitan nito ang mga kaparehong slot sa device na ito.`)) return false;
      for (const s in o.slots) if (this.slots.includes(s)) localStorage.setItem(this.key(s), JSON.stringify(o.slots[s]));
      UI.toast(`✅ Na-import ang ${n} save!`); AUD.success(); UI.refreshTitle();
      return true;
    } catch (e) { alert('Mali o sirang save code.'); AUD.fail(); return false; }
  },
  openBackup(mode) {
    const $ = (id) => document.getElementById(id);
    const exp = mode === 'export';
    $('bk-title').textContent = exp ? '📤 I-EXPORT ANG SAVE' : '📥 I-IMPORT ANG SAVE';
    $('bk-note').textContent = exp ? 'Kopyahin ang code na ito at itago. Gamitin sa I-IMPORT para ibalik ang save mo sa ibang phone o browser.' : 'I-paste ang save code dito:';
    $('bk-code').value = exp ? this.exportCode() : ''; $('bk-code').readOnly = exp;
    $('bk-exp').classList.toggle('hidden', !exp); $('bk-imp').classList.toggle('hidden', exp);
    $('bk-copy').onclick = async () => { try { await navigator.clipboard.writeText($('bk-code').value); } catch (e) { $('bk-code').select(); document.execCommand('copy'); } UI.toast('Na-kopya ang save code!'); AUD.click(); };
    $('bk-dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([$('bk-code').value], { type: 'text/plain' })); a.download = 'hari-ng-kalsada-save.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
    $('bk-file').onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { $('bk-code').value = t; }); };
    $('bk-go').onclick = () => { if (this.importCode($('bk-code').value)) { UI.hide('backup'); if (!document.getElementById('slots').classList.contains('hidden')) this.open(this.mode || 'load'); } };
    $('bk-close').onclick = () => UI.hide('backup');
    UI.show('backup');
  },
  // screen: mode = 'save' | 'load'
  open(mode) {
    this.mode = mode;
    document.getElementById('btn-export').onclick = () => this.openBackup('export');
    document.getElementById('btn-import').onclick = () => this.openBackup('import');
    const el = document.getElementById('slot-list');
    document.getElementById('slot-title').textContent = mode === 'save' ? 'I-SAVE ANG LARO' : 'I-LOAD ANG LARO';
    el.innerHTML = this.list().map(({ slot, data }) => {
      if (mode === 'save' && slot === 'auto') return '';
      const d = this.describe(data);
      return `<button class="slot ${d ? '' : 'empty'}" data-slot="${slot}"><b>${slot === 'auto' ? '🔄 Auto-save' : '💾 Slot ' + slot}</b>${d ? `<span>${d.line1}</span><small>${d.line2}</small>` : '<span>— walang laman —</span>'}</button>`;
    }).join('');
    el.querySelectorAll('.slot').forEach(b => b.onclick = () => {
      const slot = b.dataset.slot, data = this.read(slot);
      if (mode === 'save') {
        const why = this.canSave(); if (why) { UI.toast(why); AUD.fail(); return; }
        if (data && !confirm(`Papalitan ang laman ng Slot ${slot}?`)) return;
        this.write(slot); this.open('save');
      } else {
        if (!data) { AUD.fail(); return; }
        UI.hide('slots'); UI.hide('pause'); UI.hide('title');
        AUD.init(); AUD.resume();
        this.apply(data);
      }
    });
    UI.show('slots');
  },
};
