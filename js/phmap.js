'use strict';
// ===== Philippines overview: the playable cities on a map of the whole country; places not built yet are under clouds =====
const PH_ISLANDS = {
  luzon: [[120.6, 18.5], [121.2, 18.6], [122.2, 18.5], [122.3, 17.1], [122.5, 16.2], [121.6, 15.9], [121.6, 15.2], [121.9, 14.3], [122.4, 14.3], [123.0, 13.8], [123.9, 13.8], [124.2, 13.0], [124.0, 12.6], [123.3, 13.0], [122.6, 13.4], [121.8, 13.9], [121.3, 13.6], [120.6, 14.2], [120.6, 14.8], [120.1, 14.9], [119.8, 16.3], [120.4, 16.1], [120.4, 17.5]],
  mindoro: [[120.3, 13.5], [121.2, 13.4], [121.5, 12.6], [121.1, 12.2], [120.6, 12.5], [120.4, 13.0]],
  palawan: [[117.2, 8.4], [118.0, 9.1], [118.8, 10.0], [119.6, 11.0], [119.4, 11.4], [118.8, 10.5], [117.8, 9.5], [117.1, 8.6]],
  panay: [[121.9, 11.9], [122.6, 11.6], [123.1, 11.1], [122.5, 10.7], [121.9, 10.5], [121.9, 11.3]],
  negros: [[122.4, 10.9], [123.2, 10.9], [123.5, 10.4], [123.2, 9.4], [122.9, 9.1], [122.5, 9.9]],
  cebu: [[123.9, 11.3], [124.1, 11.0], [123.8, 10.2], [123.4, 9.5], [123.3, 9.9], [123.7, 10.7]],
  bohol: [[123.8, 10.1], [124.5, 10.1], [124.6, 9.7], [124.0, 9.6], [123.8, 9.8]],
  leyte: [[124.3, 11.6], [125.0, 11.4], [125.1, 10.8], [125.2, 10.1], [124.8, 10.0], [124.4, 10.9]],
  samar: [[124.2, 12.5], [125.0, 12.6], [125.7, 12.2], [125.7, 11.1], [125.0, 11.2], [124.6, 11.7]],
  masbate: [[123.2, 12.4], [124.0, 12.3], [123.7, 11.9], [123.3, 12.0]],
  catanduanes: [[124.1, 14.0], [124.4, 13.9], [124.3, 13.5], [124.0, 13.6]],
  mindanao: [[122.0, 6.9], [122.4, 7.6], [123.0, 8.0], [123.6, 8.6], [124.2, 8.3], [124.8, 8.9], [125.4, 9.8], [125.6, 9.4], [126.2, 9.2], [126.6, 7.6], [126.2, 6.4], [125.5, 5.6], [125.2, 6.0], [124.2, 6.2], [124.0, 7.0], [123.4, 7.6], [122.8, 7.4], [122.2, 6.9]],
  sulu: [[120.9, 6.1], [121.4, 6.1], [121.3, 5.8], [120.9, 5.9]], basilan: [[121.8, 6.7], [122.2, 6.6], [122.1, 6.4], [121.8, 6.5]],
  batanes: [[121.9, 20.5], [122.0, 20.5], [122.0, 20.3], [121.9, 20.3]], siargao: [[126.0, 9.95], [126.15, 9.9], [126.1, 9.7], [126.0, 9.75]],
  camiguin: [[124.65, 9.25], [124.8, 9.25], [124.8, 9.1], [124.65, 9.1]],
};
const PH_PLACES = [
  { id: 'manila', name: 'Manila', lon: 121.0, lat: 14.6, icon: '🏙', ch: 'Kabanata 1' },
  { id: 'prov', name: 'San Isidro', lon: 121.4, lat: 15.4, icon: '🌾', ch: 'Kabanata 2' },
  { id: 'baguio', name: 'Baguio', lon: 120.6, lat: 16.4, icon: '🌲', ch: 'Kabanata 5' },
  { id: 'cebu', name: 'Cebu', lon: 123.9, lat: 10.3, icon: '⛵', ch: 'Kabanata 3' },
  { id: 'davao', name: 'Davao', lon: 125.6, lat: 7.1, icon: '🦅', ch: 'Kabanata 4' },
  { name: 'Vigan', lon: 120.35, lat: 17.45, soon: 1 }, { name: 'Tuguegarao', lon: 121.85, lat: 18.0, soon: 1 }, { name: 'Batanes', lon: 121.95, lat: 20.4, soon: 1 },
  { name: 'Legazpi', lon: 123.7, lat: 13.15, soon: 1 }, { name: 'Puerto Galera', lon: 120.95, lat: 13.0, soon: 1 }, { name: 'Palawan', lon: 118.7, lat: 9.8, soon: 1 },
  { name: 'Boracay', lon: 121.95, lat: 11.95, soon: 1 }, { name: 'Iloilo', lon: 122.55, lat: 10.8, soon: 1 }, { name: 'Bacolod', lon: 122.95, lat: 10.2, soon: 1 },
  { name: 'Bohol', lon: 124.35, lat: 9.7, soon: 1 }, { name: 'Tacloban', lon: 124.9, lat: 11.0, soon: 1 }, { name: 'Samar', lon: 125.1, lat: 12.0, soon: 1 },
  { name: 'Cagayan de Oro', lon: 124.6, lat: 8.4, soon: 1 }, { name: 'Zamboanga', lon: 122.5, lat: 7.4, soon: 1 }, { name: 'Siargao', lon: 126.05, lat: 9.85, soon: 1 },
  { name: 'Sulu', lon: 121.1, lat: 6.0, soon: 1 },
];
const PHMAP = {
  on: false,
  regionPos(id) {
    const mid = (a, b) => (a + b) / 2 * T, my = MH * T / 2;
    return { manila: { x: MAP.cx(4), y: MAP.cy(4) }, prov: { x: mid(CITY_W, PROV_END), y: my }, cebu: { x: mid(SX0, SUGBO_END), y: my }, davao: { x: mid(DX0, DABAW_END), y: my }, baguio: { x: mid(BX0, MW), y: my } }[id];
  },
  here() { const x = G.player.x / T; return x >= BX0 ? 'baguio' : x >= DX0 - 12 ? 'davao' : x >= SX0 - 12 ? 'cebu' : x >= CITY_W ? 'prov' : 'manila'; },
  open() {
    this.on = true; MAPVIEW.hidePop();
    let c = document.getElementById('phmap');
    if (!c) { c = document.createElement('canvas'); c.id = 'phmap'; document.getElementById('mapscreen').insertBefore(c, document.querySelector('#mapscreen .map-top').nextSibling); c.onpointerup = (e) => { const r = c.getBoundingClientRect(); this.tap(e.clientX - r.left, e.clientY - r.top); }; }
    c.classList.remove('hidden'); document.getElementById('mapscreen').classList.add('ph');
    document.querySelector('#mapscreen .map-title').textContent = I18N.t('🇵🇭 PILIPINAS');
    const loop = () => { if (!this.on) return; this.draw(); this.raf = requestAnimationFrame(loop); }; loop();
  },
  close() {
    this.on = false; cancelAnimationFrame(this.raf);
    const c = document.getElementById('phmap'); if (c) c.classList.add('hidden');
    document.getElementById('mapscreen').classList.remove('ph');
    document.querySelector('#mapscreen .map-title').textContent = I18N.t('🗺 MAPA');
  },
  proj() {
    const c = document.getElementById('phmap'), r = c.getBoundingClientRect(), W = r.width, H = r.height, pr = Math.min(2, devicePixelRatio || 1);
    if (c.width !== Math.round(W * pr)) { c.width = W * pr; c.height = H * pr; }
    const L0 = 116.6, L1 = 127.2, A0 = 4.6, A1 = 21.0, pad = 40, top = 60, bot = 70;
    const s = Math.min((W - pad * 2) / (L1 - L0), (H - top - bot) / (A1 - A0));
    const ox = (W - (L1 - L0) * s) / 2, oy = top + (H - top - bot - (A1 - A0) * s) / 2;
    return { W, H, pr, s, f: (lon, lat) => [ox + (lon - L0) * s, oy + (A1 - lat) * s] };
  },
  draw() {
    const c = document.getElementById('phmap'), g = c.getContext('2d'), { W, H, pr, s, f } = this.proj(), t = performance.now() / 1000;
    g.setTransform(pr, 0, 0, pr, 0, 0);
    const sea = g.createLinearGradient(0, 0, 0, H); sea.addColorStop(0, '#16385a'); sea.addColorStop(1, '#0f2741'); g.fillStyle = sea; g.fillRect(0, 0, W, H);
    // islands
    for (const k in PH_ISLANDS) {
      g.beginPath(); PH_ISLANDS[k].forEach(([lo, la], i) => { const [x, y] = f(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
      g.fillStyle = '#c9b27a'; g.save(); g.translate(0, 0); g.lineWidth = 5; g.strokeStyle = 'rgba(201,178,122,0.5)'; g.stroke(); g.restore();
      g.fillStyle = '#3d6b46'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#6f9a6a'; g.stroke();
    }
    // clouds over the places that aren't built yet
    const puff = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.arc(x + r * 0.9, y + r * 0.15, r * 0.75, 0, TAU); g.arc(x - r * 0.9, y + r * 0.2, r * 0.7, 0, TAU); g.arc(x + r * 0.3, y - r * 0.55, r * 0.7, 0, TAU); g.fill(); };
    g.fillStyle = 'rgba(0,0,0,0.18)';
    const R = s * 0.42; g.lineJoin = 'round';
    for (const p of PH_PLACES) if (p.soon) { const [x, y] = f(p.lon, p.lat), dx = Math.sin(t * 0.3 + p.lon) * 4; puff(x + dx + 4, y + 6, R); }
    g.fillStyle = 'rgba(236,241,248,0.93)';
    for (const p of PH_PLACES) if (p.soon) { const [x, y] = f(p.lon, p.lat), dx = Math.sin(t * 0.3 + p.lon) * 4; puff(x + dx, y, R); }
    // labels
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fs = U.clamp(s * 0.2, 9, 13);
    for (const p of PH_PLACES) if (p.soon) {
      const [x, y] = f(p.lon, p.lat);
      g.font = `800 ${fs}px Nunito, sans-serif`; g.lineWidth = 3; g.strokeStyle = 'rgba(10,20,35,0.85)'; g.fillStyle = '#c9d2e3';
      g.strokeText('🔒 ' + p.name, x, y + R * 1.05); g.fillText('🔒 ' + p.name, x, y + R * 1.05);
    }
    const here = this.here();
    for (const p of PH_PLACES) if (!p.soon) {
      const [x, y] = f(p.lon, p.lat), me = p.id === here, pul = 1 + Math.sin(t * 3) * 0.12;
      if (me) { g.fillStyle = 'rgba(255,210,63,0.25)'; g.beginPath(); g.arc(x, y, 22 * pul, 0, TAU); g.fill(); }
      g.fillStyle = me ? '#ffd23f' : '#f39c2b'; g.strokeStyle = '#1a1205'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.fill(); g.stroke();
      g.font = '13px sans-serif'; g.fillText(p.icon, x, y + 1);
      g.font = `900 ${fs + 2}px Nunito, sans-serif`; g.lineWidth = 3.5; g.strokeStyle = 'rgba(0,0,0,0.75)';
      const lx = p.id === 'prov' ? x + 16 : p.id === 'baguio' ? x - 16 : x, ta = p.id === 'prov' ? 'left' : p.id === 'baguio' ? 'right' : 'center', ly = p.id === 'prov' || p.id === 'baguio' ? y : y + 24;
      g.textAlign = ta; g.strokeText(p.name + (me ? ' 📍' : ''), lx, ly); g.fillStyle = '#fff'; g.fillText(p.name + (me ? ' 📍' : ''), lx, ly); g.textAlign = 'center';
    }
    g.font = '800 12px Nunito, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fillText(I18N.t('I-tap ang lungsod para makita · ☁️ = darating pa'), W / 2, H - 40);
  },
  tap(sx, sy) {
    const { f } = this.proj(); let best = null, bd = 34 * 34;
    for (const p of PH_PLACES) { const [x, y] = f(p.lon, p.lat), d = (x - sx) ** 2 + (y - sy) ** 2; if (d < bd) { bd = d; best = p; } }
    if (!best) return;
    AUD.click();
    if (best.soon) { UI.toast(I18N.t(`☁️ ${best.name} — malapit na! Darating sa susunod na update.`)); return; }
    const pos = this.regionPos(best.id); this.close();
    MAPVIEW.cx = pos.x; MAPVIEW.cy = pos.y; MAPVIEW.setS(MAPVIEW.s0()); MAPVIEW.dirty();
  },
};
