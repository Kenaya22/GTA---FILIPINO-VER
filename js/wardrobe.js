'use strict';
// ===== Wardrobe (Ukay-Ukay): pick outfits & accessories; owned items are free to re-wear =====
const WARDROBE = {
  owned: { outfits: new Set(), accs: new Set(['none']) },
  open() {
    const P = G.player, free = MS.freeShops, tab = this.tab || 'damit';
    G.paused = true;
    document.getElementById('shop-title').textContent = 'UKAY-UKAY';
    const el = document.getElementById('shop-list');
    const tabs = `<div class="wtabs"><button data-tab="damit" class="${tab === 'damit' ? 'on' : ''}">👕 Damit</button><button data-tab="acc" class="${tab === 'acc' ? 'on' : ''}">🕶 Aksesorya</button></div>`;
    const sw = (o) => `<span class="swatch" style="background:${o.shirt}"></span>`;
    let rows;
    if (tab === 'damit') {
      rows = OUTFITS.map(o => {
        const on = P.look.outfit === o.id, own = this.owned.outfits.has(o.id) || free;
        return `<div class="shoprow"><span class="ic">${sw(o)}</span><div><b>${o.name}</b><small>${on ? 'Suot mo ngayon' : own ? 'Nasa aparador mo' : ''}</small></div>
          <button data-o="${o.id}" ${on ? 'disabled' : ''}>${on ? '✓ SUOT' : own ? 'SUOTIN' : 'BILHIN · ' + U.money(150)}</button></div>`;
      }).join('');
      rows = `<div class="shoprow"><span class="ic">🎲</span><div><b>Kahit ano (random)</b><small>Mabilis na pagpapalit ng damit</small></div><button data-o="random">${free ? 'LIBRE' : U.money(100)}</button></div>` + rows;
    } else {
      rows = ACCS.map(a => {
        const on = (P.look.acc || 'none') === a.id, own = this.owned.accs.has(a.id) || free;
        return `<div class="shoprow"><span class="ic">${a.icon}</span><div><b>${a.name}</b><small>${a.head ? 'Nagbabago ng itsura ng mukha (para sa pulis)' : a.id === 'none' ? 'Tanggalin ang aksesorya' : 'Pang-porma lang'}</small></div>
          <button data-a="${a.id}" ${on ? 'disabled' : ''}>${on ? '✓ SUOT' : own ? 'ISUOT' : 'BILHIN · ' + U.money(a.price)}</button></div>`;
      }).join('');
    }
    el.innerHTML = tabs + rows;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { this.tab = b.dataset.tab; AUD.click(); this.open(); });
    el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => this.wearOutfit(b.dataset.o));
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => this.wearAcc(b.dataset.a));
    UI.show('shop');
  },
  wearOutfit(id) {
    const P = G.player;
    let o;
    if (id === 'random') { if (!SHOP.pay(100)) return; do { o = U.choice(OUTFITS); } while (o.id === P.look.outfit); }
    else { o = OUTFITS.find(x => x.id === id); if (!this.owned.outfits.has(id) && !SHOP.pay(150)) return; }
    this.owned.outfits.add(o.id);
    P.look.shirt = o.shirt; P.look.pat = o.pat; P.look.outfit = o.id;
    if (id === 'random') P.look.pants = U.choice(['#2b3a55', '#3b3b3b', '#4a3b2a', '#1f2633', '#6b5a3a']);
    AUD.cash(); UI.toast(`👕 Bagong damit: ${o.name}`); G.fadeFlash(); ACH.check();
    this.open();
  },
  wearAcc(id) {
    const P = G.player, a = ACCS.find(x => x.id === id);
    if (!this.owned.accs.has(id) && !SHOP.pay(a.price)) return;
    this.owned.accs.add(id); P.look.acc = id === 'none' ? undefined : id;
    AUD.cash(); UI.toast(`${a.icon} ${id === 'none' ? 'Tinanggal ang aksesorya' : 'Suot mo na: ' + a.name}`); G.fadeFlash(); ACH.check();
    this.open();
  },
  save() { return { o: [...this.owned.outfits], a: [...this.owned.accs] }; },
  load(d) { this.owned = { outfits: new Set((d && d.o) || []), accs: new Set(['none'].concat((d && d.a) || [])) }; },
};

// ===== Photo mode: freeze, hide HUD, pan/zoom, filters, save a PNG =====
const PHOTO_FILTERS = [
  { id: 'none', name: 'Normal', css: 'none' },
  { id: 'vivid', name: 'Matingkad', css: 'saturate(1.6) contrast(1.1)' },
  { id: 'luma', name: 'Luma', css: 'sepia(0.75) contrast(1.05) brightness(1.05)' },
  { id: 'bw', name: 'Itim-Puti', css: 'grayscale(1) contrast(1.2)' },
  { id: 'pelikula', name: 'Pelikula', css: 'contrast(1.15) saturate(0.85) hue-rotate(-12deg) brightness(0.95)' },
  { id: 'gabi', name: 'Neon', css: 'saturate(1.8) hue-rotate(20deg) contrast(1.2)' },
];
const PHOTO = {
  on: false, f: 0, frame: true,
  open() {
    if (!G.started || this.on) return;
    UI.hide('pause');
    this.on = true; this.wasPaused = G.paused; G.paused = true;
    this.cx = G.cam.x; this.cy = G.cam.y; this.z0 = G.cam.zoom; this.zoom = 1;
    document.body.classList.add('photo');
    document.getElementById('photo').classList.remove('hidden');
    this.render();
    this.keyH = (e) => {
      if (!this.on) return;
      const s = 40 / G.cam.zoom;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.cx -= s; else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.cx += s;
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') this.cy -= s; else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.cy += s;
      else if (e.code === 'Equal' || e.code === 'NumpadAdd') this.setZoom(this.zoom * 1.15);
      else if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.setZoom(this.zoom / 1.15);
      else if (e.code === 'Escape') { this.close(); return; }
      else return;
      e.stopPropagation(); this.apply();
    };
    addEventListener('keydown', this.keyH, true);
    const cv = G.canvas;
    this.drag = null;
    cv.onpointerdown = (e) => { if (this.on) { this.drag = { x: e.clientX, y: e.clientY, cx: this.cx, cy: this.cy }; } };
    cv.onpointermove = (e) => { if (this.on && this.drag) { this.cx = this.drag.cx - (e.clientX - this.drag.x) / G.cam.zoom; this.cy = this.drag.cy - (e.clientY - this.drag.y) / G.cam.zoom; this.apply(); } };
    cv.onpointerup = cv.onpointercancel = () => { this.drag = null; };
    cv.onwheel = (e) => { if (this.on) { e.preventDefault(); this.setZoom(this.zoom * (e.deltaY < 0 ? 1.1 : 0.9)); } };
    this.apply();
    AUD.click();
  },
  setZoom(z) { this.zoom = U.clamp(z, 0.5, 2.6); document.getElementById('ph-zoom').value = this.zoom; this.apply(); },
  apply() {
    const P = G.player, tg = P.vehicle || P;
    // keep the camera near the action
    this.cx = U.clamp(this.cx, tg.x - 900, tg.x + 900); this.cy = U.clamp(this.cy, tg.y - 900, tg.y + 900);
    G.cam.x = this.cx; G.cam.y = this.cy; G.cam.sx = G.cam.sy = 0; G.cam.zoom = this.z0 * this.zoom;
    G.cam.vw = innerWidth / G.cam.zoom; G.cam.vh = innerHeight / G.cam.zoom;
    G.canvas.style.filter = PHOTO_FILTERS[this.f].css;
  },
  render() {
    document.getElementById('ph-filters').innerHTML = PHOTO_FILTERS.map((f, i) => `<button class="${i === this.f ? 'on' : ''}" data-f="${i}">${f.name}</button>`).join('');
    document.querySelectorAll('#ph-filters button').forEach(b => b.onclick = () => { this.f = +b.dataset.f; this.render(); this.apply(); AUD.click(); });
    document.getElementById('ph-frame').classList.toggle('on', this.frame);
  },
  close() {
    if (!this.on) return;
    this.on = false; G.paused = this.wasPaused && false;
    document.body.classList.remove('photo');
    document.getElementById('photo').classList.add('hidden');
    G.canvas.style.filter = '';
    removeEventListener('keydown', this.keyH, true);
    G.canvas.onpointerdown = G.canvas.onpointermove = G.canvas.onpointerup = G.canvas.onwheel = null;
    G.cam.zoom = this.z0;
  },
  snap() {
    const src = G.canvas, c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    try { g.filter = PHOTO_FILTERS[this.f].css; } catch (e) { }
    g.drawImage(src, 0, 0); g.filter = 'none';
    if (this.frame) {
      const W = c.width, H = c.height, b = Math.round(Math.min(W, H) * 0.03);
      g.strokeStyle = '#fff'; g.lineWidth = b; g.strokeRect(b / 2, b / 2, W - b, H - b);
      g.font = `400 ${Math.round(H * 0.06)}px Bungee, Nunito, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'bottom';
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillText('HARI NG KALSADA', b * 2 + 3, H - b * 1.6 + 3); g.fillStyle = '#f39c2b'; g.fillText('HARI NG KALSADA', b * 2, H - b * 1.6);
      g.font = `900 ${Math.round(H * 0.025)}px Nunito, sans-serif`; g.textAlign = 'right'; g.fillStyle = '#fff';
      g.fillText(`${WORLD.timeStr()} · ${(MAP.labels.slice().sort((a, l) => U.d2(a.x, a.y, G.cam.x, G.cam.y) - U.d2(l.x, l.y, G.cam.x, G.cam.y))[0] || { name: 'MAYNILA' }).name}`, W - b * 2, H - b * 1.6);
    }
    const url = c.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = `harinkalsada-${Date.now()}.png`; document.body.appendChild(a); a.click(); a.remove();
    const fl = document.getElementById('fade'); fl.classList.add('flash', 'on'); setTimeout(() => fl.classList.remove('on'), 120); setTimeout(() => fl.classList.remove('flash'), 500);
    AUD.tone(1800, 0.05, 'square', 0.06); AUD.noise(0.12, 0.15, 3000, 0.05, 'highpass');
    G.stats.photos = (G.stats.photos || 0) + 1; ACH.check();
    UI.toast('📸 Na-save ang litrato!');
    this.lastUrl = url;
  },
};
