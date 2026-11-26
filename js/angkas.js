'use strict';
// ===== 🛵 Pa-angkas: book a motorbike ride from the phone — a rider comes to you and drives you there =====
const ANGKAS = {
  ride: null,
  fare(d) { return Math.round(40 + d / T * 1.2); },
  dests() {
    const P = G.player, reg = regionName(P.x), out = [];
    if (G.waypoint) out.push({ x: G.waypoint.x, y: G.waypoint.y, label: G.waypoint.name || '📍 GPS', icon: '📍' });
    const want = [['famhome', '🏡'], ['home', '🏠'], ['kainan', '🍗'], ['mall', '🏬'], ['hospital', '🏥'], ['airport', '✈️'], ['church', '⛪'], ['gunshop', '🔫']];
    for (const [type, ic] of want) {
      let best = null, bd = 1e18;
      for (const k in MAP.pois) { const p = MAP.pois[k]; if (p.type !== type || regionName(p.x) !== reg) continue; const d = U.d2(p.x, p.y, P.x, P.y); if (d < bd && d > 300 * 300) { bd = d; best = p; } }
      if (best) out.push({ x: best.x, y: best.y, label: best.label, icon: ic });
    }
    const lms = Object.values(MAP.pois).filter(p => p.landmark && regionName(p.x) === reg && U.dist(p.x, p.y, P.x, P.y) > 300);
    for (const p of lms.slice(0, 4)) out.push({ x: p.x, y: p.y, label: p.label, icon: p.icon || '📸' });
    return out;
  },
  panel() {
    const P = G.player;
    if (this.ride) return `<div class="ph-msg"><b>🛵 ${this.ride.name}</b><span>${this.ride.stage === 'come' ? 'Papunta na sa iyo ang rider...' : 'Nasa biyahe — kumapit ka!'}</span><small>${this.ride.dest.label} · ${U.money(this.ride.fare)}</small></div><div class="ph-list"><button data-ang="x">✕ Kanselahin</button></div>`;
    const list = this.dests();
    return `<p class="note">Saan ka pupunta? Darating ang rider sa loob ng ilang segundo.</p><div class="ph-list">`
      + list.map((d, i) => `<button data-ang="${i}">${d.icon} ${d.label} · ${U.money(this.fare(U.dist(P.x, P.y, d.x, d.y)))}</button>`).join('') + '</div>';
  },
  book(i) {
    const P = G.player, d = this.dests()[+i]; if (!d) return;
    if (P.vehicle) { UI.toast('🛵 Bumaba muna sa sasakyan para mag-book.'); return; }
    if (WANTED.stars > 0) { UI.toast('🛵 Walang rider na kukuha sa iyo habang hinahabol ka ng pulis!'); return; }
    if (MS.active) { UI.toast('🛵 Hindi pwede habang may misyon.'); return; }
    const fare = this.fare(U.dist(P.x, P.y, d.x, d.y));
    if (P.money < fare) { UI.toast('Kulang ang pera mo!'); return; }
    // the rider starts on a road a little way off
    let sp = null;
    for (let k = 0; k < 40 && !sp; k++) { const a = U.rand(0, TAU), r = U.rand(320, 520), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (MAP.tileAt(x, y) === TL.ROAD && !TRAFFIC.inView(x, y, 10)) sp = { x, y }; }
    if (!sp) for (let k = 0; k < 40 && !sp; k++) { const a = U.rand(0, TAU), r = U.rand(150, 400), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (MAP.tileAt(x, y) === TL.ROAD) sp = { x, y }; }
    if (!sp) { UI.toast('🛵 Walang rider sa paligid — lumapit sa kalsada.'); return; }
    const v = new Vehicle('motor', sp.x, sp.y, Math.atan2(P.y - sp.y, P.x - sp.x), { color: '#1aa34a' });
    v.mission = true; v.keep = true; v.driver = 'ai'; v.angkas = true; G.vehicles.push(v);
    this.ride = { v, dest: d, fare, stage: 'come', t: 0, name: U.choice(['Kuya Jomar', 'Kuya Rey', 'Ate Liza', 'Kuya Boyet', 'Kuya Dante']) };
    this.route(v, P.x, P.y, 210);
    AUD.coin(); UI.toast(`🛵 ${this.ride.name} ay papunta na! (${U.money(fare)})`);
  },
  route(v, x, y, cruise) {
    const f = this._f || (this._f = new Uint16Array(MW * MH));
    MAP.computeField(f, x, y, DRIVE_COST);
    const tiles = MAP.pathFrom(f, v.x, v.y, 900), pts = [];
    for (let k = 2; k < tiles.length; k += 3) pts.push({ x: (tiles[k][0] + 0.5) * T, y: (tiles[k][1] + 0.5) * T });
    pts.push({ x, y });
    v.ai = new PathDriver(v, pts, { cruise, solid: true });
  },
  cancel(msg) {
    const r = this.ride; if (!r) return;
    const P = G.player;
    if (r.stage === 'ride') { P.hidden = false; P.x = r.v.x + 30; P.y = r.v.y; }
    r.v.mission = false; r.v.keep = false; r.v.ai = new RoadDriver(r.v); this.ride = null;
    if (msg) UI.toast(msg);
  },
  // called every frame; returns true while the player is riding (the normal player update is skipped)
  update(dt) {
    const r = this.ride; if (!r) return false;
    const P = G.player, v = r.v;
    r.t += dt;
    if (v.dead || v.remove) { this.cancel('🛵 Naaksidente ang rider — kanselado ang biyahe.'); return false; }
    if (r.stage === 'come') {
      if (P.vehicle || WANTED.stars > 0) { this.cancel('🛵 Kanselado ang booking.'); return false; }
      if (r.t > 2 && Math.floor(r.t) % 4 === 0 && r.lastR !== Math.floor(r.t)) { r.lastR = Math.floor(r.t); this.route(v, P.x, P.y, 210); }
      if (U.dist(v.x, v.y, P.x, P.y) < 80 || r.t > 45) {
        if (r.t > 45) { v.x = P.x + 40; v.y = P.y; }
        r.stage = 'ride'; r.t = 0; v.vx = v.vy = 0; P.hidden = true;
        this.route(v, r.dest.x, r.dest.y, 280); AUD.tone(880, 0.08, 'square', 0.05);
        UI.say([[r.name, U.choice(['Sakay na po, boss! Helmet po.', 'Kapit lang po, ma\'am/sir!', 'Tara na po! Iwas-traffic tayo.'])]]);
      }
      return false;
    }
    // riding on the back
    P.x = v.x - Math.cos(v.a) * 10; P.y = v.y - Math.sin(v.a) * 10; P.a = v.a; P.vx = P.vy = 0;
    if (WANTED.stars > 0) { this.cancel('🛵 "Pasensya na boss, ayoko ng gulo!" — ibinaba ka ng rider.'); return true; }
    if (U.dist(v.x, v.y, r.dest.x, r.dest.y) < 130 || (v.ai && v.ai.finished) || r.t > 120) {
      if (r.t > 120) { v.x = r.dest.x; v.y = r.dest.y; }
      G.addMoney(-r.fare); P.hidden = false; P.x = v.x + 30; P.y = v.y + 10;
      G.stats.angkas = (G.stats.angkas || 0) + 1; ACH.check();
      UI.toast(`🛵 Nakarating ka na! Bayad: ${U.money(r.fare)} · ⭐⭐⭐⭐⭐`); AUD.coin();
      v.mission = false; v.keep = false; v.ai = new RoadDriver(v); setTimeout(() => { if (!TRAFFIC.inView(v.x, v.y, 50)) v.remove = true; }, 8000);
      this.ride = null;
    }
    return true;
  },
};
