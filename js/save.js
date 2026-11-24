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
  read(slot) { try { return JSON.parse(localStorage.getItem(this.key(slot))); } catch (e) { return null; } },
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
      clock: WORLD.clock, rain: WORLD.rainTarget,
      ts: [...G.tsinelas], stats: G.stats, unlock: G.unlock,
      weapons: P.weapons, weapon: P.weapon,
      props: [...ECON.owned], garage: ECON.garage, ach: [...ACH.got], visited: [...ACH.visited], drove: [...ACH.drove],
    };
  },
  write(slot, silent) {
    try {
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
    if (s.rain) { WORLD.rainTarget = s.rain; WORLD.rain = s.rain; }
    G.tsinelas = new Set(s.ts || []);
    G.stats = Object.assign({ sold: 0, pasada: 0, escapes: 0, earned: 0, taxi: 0, rider: 0, tow: 0, races: 0, vigil: 0 }, s.stats || {});
    G.unlock = Object.assign({ sports: false, gold: false }, s.unlock || {});
    P.weapons = Object.assign({ fists: true }, s.weapons || {}); P.weapon = s.weapon && P.weapons[s.weapon] !== undefined ? s.weapon : 'fists';
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
    } else UI.big('MAYNILA', MS.idx >= MISSIONS.length ? 'Free roam' : `Susunod: ${MISSIONS[MS.idx].title}`, 2);
  },
  describe(d) {
    if (!d) return null;
    const dt = new Date(d.saved || 0);
    const when = d.saved ? dt.toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' }) + ' ' + dt.toLocaleTimeString('fil-PH', { hour: 'numeric', minute: '2-digit' }) : '';
    const mis = Math.min(d.m || 0, MISSIONS.length);
    const pct = ACH.percentOf(d);
    return { line1: `Misyon ${mis}/${MISSIONS.length} · ${U.money(d.money || 0)} · ${pct}%`, line2: `${d.active >= 0 && MISSIONS[d.active] ? '▶ ' + MISSIONS[d.active].title + ' · ' : ''}na-save ${when}` };
  },
  // screen: mode = 'save' | 'load'
  open(mode) {
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
