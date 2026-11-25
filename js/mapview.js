'use strict';
// ===== Interactive map: drag to pan, pinch / wheel to zoom, labels appear by zoom level,
// category chips instead of a long legend, tap a place for info + GPS =====
const MAPCATS = [
  { id: 'shop', name: '🛒 Tindahan', types: [['gunshop', '🔫', 'Baril'], ['weapon', '🔨', 'Hardware'], ['ukay', '👕', 'Ukay-Ukay'], ['barber', '💈', 'Barberya'], ['paint', '🎨', 'Pintura'], ['sari', '🏪', 'Sari-sari'], ['chop', '🔧', 'Talyer']] },
  { id: 'serv', name: '🏥 Serbisyo', types: [['hospital', '🏥', 'Ospital'], ['home', '🏠', 'Bahay / Save'], ['garage', '🅿️', 'Garahe'], ['police', '🚓', 'Presinto'], ['evac', '⛺', 'Evacuation'], ['famhome', '🏡', 'Bahay ng Pamilya']] },
  { id: 'job', name: '💼 Trabaho', types: [['rider', '🛵', 'Rider Hub'], ['tow', '🛻', 'Impound'], ['depot', '🚑', 'Ambulansya / Bumbero'], ['race', '🏁', 'Karera']] },
  { id: 'fun', name: '🎉 Libangan', types: [['kainan', '🍗', 'Kainan'], ['mall', '🏬', 'Mall'], ['church', '⛪', 'Simbahan'], ['videoke', '🎤', 'Videoke'], ['court', '🏀', 'Basketball'], ['property', '🔑', 'Ibinebenta'], ['landmark', '📸', 'Pasyalan']] },
  { id: 'go', name: '✈️ Biyahe', types: [['ferry', '⛴', 'Ferry'], ['airport', '✈️', 'Paliparan']] },
  { id: 'ts', name: '🩴 Koleksyon', types: [] },
];
const PLACE_INFO = {
  gunshop: 'Baril, bala, granada, vest at shooting range', weapon: 'Pamalo, tirador at water gun', ukay: 'Damit at aksesorya — iba ang itsura mo para sa pulis', barber: 'Bagong gupit — iba ang mukha mo para sa pulis',
  paint: 'Kulay, makina, armor at sticker ng sasakyan', sari: 'Pagkain para sa buhay', chop: 'Ibenta ang mga sasakyan', hospital: 'Full heal', home: 'I-save ang laro', garage: 'Iparada ang mga sasakyan mo',
  famhome: 'Bahay ng pamilya mo — bilhin, i-upgrade, bisitahin ang asawa at mga anak', police: 'Presinto ng pulis — iwasan kung wanted ka!', evac: 'Dalhin dito ang mga nasagip sa bagyo', rider: 'Food delivery na side job', tow: 'Tow truck na side job', depot: 'Ambulansya, fire truck at trak ng basura',
  kainan: 'Kumain — buhay at SIGLA', mall: 'Mamili, maglaro o magtago sa pulis', church: 'Magdasal (libreng full heal araw-araw)', race: 'Underground race sa gabi', videoke: 'Kumanta para sa premyo', court: '3-Point Shootout', property: 'Ari-arian na may araw-araw na kita', ferry: 'Sakay ng barko', airport: 'Lumipad sa ibang lungsod', landmark: 'Magandang lugar para sa litrato (Photo Mode)',
};
const MAPVIEW = {
  s: 0.1, cx: 0, cy: 0, cat: null, pop: null, ptrs: new Map(),
  open() {
    G.paused = true; UI.show('mapscreen');
    const P = G.player;
    this.cx = P.x; this.cy = P.y; this.pop = null;
    this.resize(); this.s = this.s0(); this.setS(this.s);
    this.renderChips(); this.hidePop();
    if (!this.bound) this.bind();
    this.draw();
  },
  close() { if (PHMAP.on) PHMAP.close(); UI.hide('mapscreen'); this.hidePop(); if (document.getElementById('pause').classList.contains('hidden')) G.paused = false; },
  s0() { return Math.max(Math.min(this.W, this.H) / (150 * T), this.H / (MH * T), this.W / (MW * T)); },            // ~150 tiles across the short side
  sMin() { return Math.min(this.W / (MW * T), this.H / (MH * T)) * 0.95; },
  sMax() { return 14 / T; },
  resize() {
    const c = document.getElementById('bigmap'), r = c.getBoundingClientRect(), pr = Math.min(2, devicePixelRatio || 1);
    this.pr = pr; this.W = r.width; this.H = r.height; c.width = r.width * pr; c.height = r.height * pr;
  },
  setS(s) { this.s = U.clamp(s, this.sMin(), this.sMax()); this.clampPan(); },
  clampPan() {
    const hw = this.W / 2 / this.s, hh = this.H / 2 / this.s;
    this.cx = MW * T < hw * 2 ? MW * T / 2 : U.clamp(this.cx, hw, MW * T - hw);
    this.cy = MH * T < hh * 2 ? MH * T / 2 : U.clamp(this.cy, hh, MH * T - hh);
  },
  toScreen(x, y) { return [(x - this.cx) * this.s + this.W / 2, (y - this.cy) * this.s + this.H / 2]; },
  toWorld(sx, sy) { return [(sx - this.W / 2) / this.s + this.cx, (sy - this.H / 2) / this.s + this.cy]; },
  zoomAt(f, sx, sy) {
    const [wx, wy] = this.toWorld(sx, sy);
    this.setS(this.s * f);
    this.cx = wx - (sx - this.W / 2) / this.s; this.cy = wy - (sy - this.H / 2) / this.s; this.clampPan();
    this.dirty();
  },
  dirty() { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); }); },
  bind() {
    this.bound = true;
    const c = document.getElementById('bigmap');
    c.onpointerdown = (e) => { c.setPointerCapture(e.pointerId); this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY }); this.moved = this.ptrs.size > 1; this.pinch = null; };
    c.onpointermove = (e) => {
      const p = this.ptrs.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (Math.hypot(p.x - p.x0, p.y - p.y0) > 8) this.moved = true;
      if (this.ptrs.size === 1) { this.cx -= dx / this.s; this.cy -= dy / this.s; this.clampPan(); this.dirty(); }
      else if (this.ptrs.size === 2) {
        const [a, b] = [...this.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = c.getBoundingClientRect();
        const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
        if (this.pinch) { this.zoomAt(d / this.pinch.d, mx, my); this.cx -= (mx - this.pinch.mx) / this.s; this.cy -= (my - this.pinch.my) / this.s; this.clampPan(); }
        this.pinch = { d, mx, my };
      }
    };
    const up = (e) => {
      const p = this.ptrs.get(e.pointerId); this.ptrs.delete(e.pointerId); this.pinch = null;
      if (p && !this.moved && this.ptrs.size === 0) { const r = c.getBoundingClientRect(); this.tap(e.clientX - r.left, e.clientY - r.top); }
    };
    c.onpointerup = up; c.onpointercancel = up;
    c.onwheel = (e) => { e.preventDefault(); if (e.deltaY > 0 && this.s <= this.sMin() * 1.01) { PHMAP.open(); return; } const r = c.getBoundingClientRect(); this.zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top); };
    document.getElementById('mz-in').onclick = () => { if (PHMAP.on) { PHMAP.close(); this.dirty(); return; } this.zoomAt(1.4, this.W / 2, this.H / 2); };
    document.getElementById('mz-out').onclick = () => { if (PHMAP.on) return; if (this.s <= this.sMin() * 1.01) { PHMAP.open(); return; } this.zoomAt(1 / 1.4, this.W / 2, this.H / 2); };
    document.getElementById('mz-me').onclick = () => { if (PHMAP.on) PHMAP.close(); const P = G.player; this.cx = P.x; this.cy = P.y; this.setS(Math.max(this.s, this.s0())); this.dirty(); };
    document.getElementById('mz-all').onclick = () => { AUD.click(); PHMAP.on ? PHMAP.close() : PHMAP.open(); };
    document.getElementById('btn-mapclose').onclick = () => this.close();
    addEventListener('resize', () => { if (!document.getElementById('mapscreen').classList.contains('hidden')) { this.resize(); this.setS(this.s); this.dirty(); } });
  },
  // ----- places shown on the map -----
  places() {
    const out = [];
    for (const k in MAP.pois) { const p = MAP.pois[k]; if (p.type === 'npc' || (p.type === 'spot' && !p.landmark)) continue; out.push({ x: p.x, y: p.y, icon: p.icon, name: p.label, type: p.landmark ? 'landmark' : p.type, key: k }); }
    if (KUTA.on()) for (const kt of KUTA.defs()) if (!KUTA.cleared(kt.key)) out.push({ x: kt.x, y: kt.y, icon: '☠️', name: kt.name, type: 'kuta', info: 'Kuta ng sindikato — armado sila!' });
    return out;
  },
  catTypes() { const c = MAPCATS.find(c => c.id === this.cat); return c ? c.types.map(t => t[0]) : []; },
  renderChips() {
    const el = document.getElementById('mapchips');
    el.innerHTML = (G.waypoint ? `<button data-c="gpsx" class="gpsx">✕ GPS</button>` : '') + MAPCATS.map(c => `<button data-c="${c.id}" class="${this.cat === c.id ? 'on' : ''}">${c.name}</button>`).join('');
    const gx = el.querySelector('[data-c="gpsx"]'); if (gx) gx.onclick = (e) => { e.stopPropagation(); AUD.click(); G.waypoint = null; UI.toast('📍 Inalis ang GPS'); this.renderChips(); this.dirty(); };
    el.querySelectorAll('button:not(.gpsx)').forEach(b => b.onclick = () => { AUD.click(); this.cat = this.cat === b.dataset.c ? null : b.dataset.c; this.renderChips(); this.dirty(); });
    const sub = document.getElementById('mapsub'), cat = MAPCATS.find(c => c.id === this.cat);
    const have = new Set(Object.values(MAP.pois).map(p => p.landmark ? 'landmark' : p.type));
    sub.innerHTML = cat && cat.types.length ? '<small>🧭 Pinakamalapit:</small>' + cat.types.filter(t => have.has(t[0])).map(([t, ic, n]) => `<button data-t="${t}">${ic} ${n}</button>`).join('') : '';
    sub.classList.toggle('hidden', !sub.innerHTML);
    sub.querySelectorAll('button').forEach(b => b.onclick = () => {
      AUD.click(); const P = G.player; let best = null, bd = 1e18;
      for (const p of this.places()) { if (p.type !== b.dataset.t) continue; const d = U.d2(p.x, p.y, P.x, P.y); if (d < bd) { bd = d; best = p; } }
      if (best) { this.cx = best.x; this.cy = best.y; this.setS(Math.max(this.s, 3 / T)); this.showPop(best); this.dirty(); }
    });
  },
  visible(p) {
    const tile = this.s * T;
    if (this.cat) return this.catTypes().includes(p.type);
    if (p.type === 'kuta') return true;
    if (tile >= 7) return true;
    return ['home', 'airport', 'ferry'].includes(p.type) && tile >= 1.4;
  },
  tap(sx, sy) {
    let best = null, bd = 26 * 26;
    for (const p of this.places()) { if (!this.visible(p)) continue; const [x, y] = this.toScreen(p.x, p.y), d = (x - sx) ** 2 + (y - sy) ** 2; if (d < bd) { bd = d; best = p; } }
    const t = G.target;
    if (t) { const [x, y] = this.toScreen(t.x, t.y); if ((x - sx) ** 2 + (y - sy) ** 2 < bd) best = { x: t.x, y: t.y, icon: '⭐', name: MS.active ? MS.objText() : (t.giver ? 'Susunod na misyon' : 'Target'), type: 'target' }; }
    if (!best) { const [wx, wy] = this.toWorld(sx, sy); const lab = MAP.labels.filter(l => !l.vert).sort((a, b) => U.d2(a.x, a.y, wx, wy) - U.d2(b.x, b.y, wx, wy))[0]; best = { x: wx, y: wy, icon: '📍', name: 'Malapit sa ' + (lab ? lab.name : 'dito'), type: 'pin' }; }
    this.showPop(best); this.dirty();
  },
  showPop(p) {
    this.pop = p;
    const el = document.getElementById('mappop'), P = G.player;
    const dist = Math.round(U.dist(P.x, P.y, p.x, p.y) / 14);
    el.innerHTML = `<span class="mp-ic">${p.icon}</span><div><b>${p.name}</b><small>${p.info || PLACE_INFO[p.type] || ''}${p.info || PLACE_INFO[p.type] ? ' · ' : ''}${dist}m</small></div><button id="mp-gps" class="mbtn small primary">🧭 GPS</button><button id="mp-x" class="mbtn small">✕</button>`;
    el.classList.remove('hidden');
    document.getElementById('mp-gps').onclick = () => { AUD.click(); G.setWaypoint(p, `${p.icon} ${p.name}`); this.hidePop(); };
    document.getElementById('mp-x').onclick = () => { this.hidePop(); this.dirty(); };
  },
  hidePop() { this.pop = null; document.getElementById('mappop').classList.add('hidden'); },
  // ----- drawing -----
  draw() {
    if (document.getElementById('mapscreen').classList.contains('hidden')) return;
    const c = document.getElementById('bigmap'), g = c.getContext('2d'), pr = this.pr, W = this.W, H = this.H, s = this.s, tile = s * T;
    g.setTransform(pr, 0, 0, pr, 0, 0);
    g.fillStyle = '#163454'; g.fillRect(0, 0, W, H);
    // the map image (1 px per tile)
    const [x0, y0] = this.toWorld(0, 0);
    g.imageSmoothingEnabled = tile < 2;
    g.drawImage(MAP.mini, x0 / T, y0 / T, W / tile, H / tile, 0, 0, W, H);
    g.imageSmoothingEnabled = true;
    // gentle vignette
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    const scr = (x, y) => this.toScreen(x, y);
    // search zone, GPS path
    const Wd = WANTED;
    if (Wd.stars > 0 && Wd.mode === 'search') { const [a, b] = scr(Wd.lastX - Wd.zone, Wd.lastY - Wd.zone); g.strokeStyle = 'rgba(170,140,255,0.9)'; g.lineWidth = 2; g.setLineDash([8, 6]); g.strokeRect(a, b, Wd.zone * 2 * s, Wd.zone * 2 * s); g.setLineDash([]); }
    if (G.gpsPath && G.gpsPath.length > 1) {
      g.strokeStyle = '#c86bff'; g.lineWidth = Math.max(3, tile * 0.9); g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
      G.gpsPath.forEach(([tx, ty], i) => { const [x, y] = scr((tx + 0.5) * T, (ty + 0.5) * T); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    }
    const boxes = [];
    const free = (x, y, w, h) => { for (const b of boxes) if (x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + h > b[1]) return false; boxes.push([x, y, w, h]); return true; };
    const text = (t, x, y, size, col, weight = 900, stroke = 'rgba(0,0,0,0.75)', avoid) => {
      if (avoid) { g.font = `${weight} ${size}px Nunito, sans-serif`; const w = g.measureText(t).width + 6; if (!free(x - w / 2, y - size * 0.6, w, size * 1.2)) return; }
      g.font = `${weight} ${size}px Nunito, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = Math.max(2, size / 5); g.strokeStyle = stroke; g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y);
    };
    // region names when zoomed out, district names in between
    if (tile < 1.7) {
      for (const r of MAP.regions || []) { const [x, y] = scr(r.x, r.y); text(I18N.t(r.name), x, y, Math.max(14, Math.min(26, tile * 16)), '#ffffff'); }
    } else {
      const a = U.clamp((tile - 1.7) / 0.8, 0, 1), big = tile < 5;
      g.globalAlpha = big ? a : U.clamp(1 - (tile - 7) / 3, 0.35, 1);
      for (const l of MAP.labels) { const [x, y] = scr(l.x, l.y); if (x < -100 || x > W + 100 || y < -40 || y > H + 40) continue; g.save(); g.translate(x, y); if (l.vert) g.rotate(-Math.PI / 2); if (l.vert) text(l.name, 0, 0, U.clamp(tile * 4.2, 11, 22), 'rgba(150,200,255,0.9)'); else { g.restore(); text(l.name, x, y, U.clamp(tile * 4.2, 11, 22), 'rgba(255,255,255,0.92)', 900, undefined, true); continue; } g.restore(); }
      g.globalAlpha = 1;
    }
    // tsinelas
    if (this.cat === 'ts' || tile >= 7) for (const c of COLL.all()) if (!COLL.got().has(c.id)) { const [x, y] = scr(c.x, c.y); g.font = '14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(COLL.kinds[c.kind].icon, x, y); }
    if (this.cat === 'ts' || tile >= 7) for (const t of MAP.tsinelas) if (!G.tsinelas.has(t.id)) { const [x, y] = scr(t.x, t.y); g.fillStyle = '#ffd23f'; g.strokeStyle = '#5a4300'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 3.5, 6, 0.4, 0, TAU); g.fill(); g.stroke(); }
    // places
    const showNames = tile >= 9 || (!!this.cat && tile >= 4);
    const named = [];
    for (const p of this.places()) {
      if (!this.visible(p)) continue;
      const [x, y] = scr(p.x, p.y); if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
      const hi = this.cat || (this.pop && this.pop.x === p.x && this.pop.y === p.y), r = hi ? 15 : 12;
      g.fillStyle = hi ? 'rgba(243,156,43,0.95)' : 'rgba(14,20,34,0.82)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5; g.stroke();
      g.font = `${r * 1.15}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(p.icon, x, y + 1);
      boxes.push([x - r, y - r, r * 2, r * 2]);
      if (showNames || hi) named.push([I18N.t(p.name), x, y + r + 9]);
    }
    for (const [n, x, y] of named) text(n, x, y, 11, '#ffe9c4', 800, undefined, true);
    // mission target
    const t = G.target;
    if (t) {
      const [x, y] = scr(t.x, t.y), pulse = 1 + Math.sin(performance.now() / 300) * 0.15;
      g.fillStyle = '#ffd23f'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 11 * pulse, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#1a1205'; g.font = '900 12px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.letter || '★', x, y + 1);
    }
    // waypoint pin
    if (G.waypoint) { const [x, y] = scr(G.waypoint.x, G.waypoint.y); g.fillStyle = '#c86bff'; g.beginPath(); g.arc(x, y - 14, 8, 0, TAU); g.moveTo(x - 6, y - 10); g.lineTo(x, y); g.lineTo(x + 6, y - 10); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y - 14, 3, 0, TAU); g.fill(); }
    // cops while wanted
    if (Wd.stars > 0) for (const v of G.vehicles) if (v.isCop && v.driver && !v.dead) { const [x, y] = scr(v.x, v.y); g.fillStyle = Math.floor(performance.now() / 250) % 2 ? '#ff3030' : '#3070ff'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
    // popup marker
    if (this.pop && this.pop.type === 'pin') { const [x, y] = scr(this.pop.x, this.pop.y); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.stroke(); }
    // player
    const P = G.player, [px, py] = scr(P.x, P.y), sz = 11;
    g.save(); g.translate(px, py); g.rotate(P.a);
    g.fillStyle = 'rgba(80,160,255,0.25)'; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(sz, 0); g.lineTo(-sz * 0.7, -sz * 0.7); g.lineTo(-sz * 0.3, 0); g.lineTo(-sz * 0.7, sz * 0.7); g.closePath(); g.fill(); g.stroke();
    g.restore();
    // scale hint
    const sy0 = 62; text(`${Math.round(80 / s / 14)}m`, 54, sy0 + 12, 11, 'rgba(255,255,255,0.8)', 800);
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, sy0); g.lineTo(94, sy0); g.stroke();
    if (t || Wd.stars > 0) this.dirty();   // keep the target pulsing / cops moving
  },
};
