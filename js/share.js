'use strict';
// ===== Sharing: ghost time trial (race your best run or a friend's shared link) & photo sharing =====
const GHOST = {
  KEY: 'hnk_ghost_best', FKEY: 'hnk_ghost_friend',
  // a fixed route so everyone races the same course
  route() {
    if (this._route) return this._route;
    const rs = MAP.pois.racespot, [i, j] = MAP.nearestNode(rs.x, rs.y), R = U.rng(20261125), mr = Math.random;
    Math.random = R; try { this._route = racePath(i, j, 10); } finally { Math.random = mr; }
    return this._route;
  },
  load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  // compact code: time, start point, then one url-safe char per x/y delta (16px units, every 0.5s)
  A: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
  encode(run) {
    const pts = run.p.filter((_, i) => i % 2 === 0); if (!pts.length) return '';
    let qx = Math.round(pts[0][0] / 16), qy = Math.round(pts[0][1] / 16), out = '';
    for (let i = 1; i < pts.length; i++) {
      const dx = U.clamp(Math.round(pts[i][0] / 16) - qx, -32, 31), dy = U.clamp(Math.round(pts[i][1] / 16) - qy, -32, 31);
      qx += dx; qy += dy; out += this.A[dx + 32] + this.A[dy + 32];
    }
    return `${Math.round(run.t * 10)}.${Math.round(pts[0][0] / 16)}.${Math.round(pts[0][1] / 16)}.${out}`;
  },
  decode(code) {
    try {
      const [t, x0, y0, d] = code.split('.'); let x = +x0, y = +y0; const p = [[x * 16, y * 16]];
      for (let i = 0; i + 1 < (d || '').length; i += 2) { x += this.A.indexOf(d[i]) - 32; y += this.A.indexOf(d[i + 1]) - 32; p.push([x * 16, y * 16]); }
      return +t > 0 && p.length > 2 && isFinite(x + y) ? { t: +t / 10, p, dt: 0.5, friend: true } : null;
    } catch (e) { return null; }
  },
  // a link opened with ?ghost=... becomes the friend's ghost
  checkLink() {
    const m = location.search.match(/[?&]ghost=([^&]+)/); if (!m) return;
    const run = this.decode(decodeURIComponent(m[1]));
    if (run) { this.save(this.FKEY, run); setTimeout(() => UI.toast(`👻 Ghost ng kaibigan: ${run.t.toFixed(1)}s — talunin sa ⏱ Time Trial sa Baywalk!`), 2500); }
  },
  label() { const b = this.load(this.KEY), f = this.load(this.FKEY); return `⏱ Time Trial (Ghost) — pinakamabilis mo: ${b ? b.t.toFixed(1) + 's' : '—'}${f ? ` · kaibigan: ${f.t.toFixed(1)}s` : ''}`; },
  start() {
    const v = G.player.vehicle;
    if (!v || v.t.boat || v.t.fly || ['bus', 'jeepney'].includes(v.type)) { UI.toast('Kailangan ng kotse o motor para sa Time Trial.'); return; }
    if (WANTED.stars > 0 || JOBS.active || MS.active) { UI.toast('Hindi pwede ngayon.'); return; }
    const vs = this.load(this.FKEY) || this.load(this.KEY);
    JOBS.start('trial', { cps: this.route(), pi: 0, cd: 3.5, last: 4, stage: 'count', rec: [], t: 0, recT: 0, vs });
  },
};
const JOB_TRIAL_NAME = '⏱ Time Trial';
JOB_NAMES.trial = JOB_TRIAL_NAME;
Object.assign(JOBS, {
  u_trial(dt, c) {
    const v = c.v;
    if (c.stage === 'count') {
      c.cd -= dt; c.obj = 'Humanda...'; c.tgt = c.cps[0]; v.vx = v.vy = 0;
      const n = Math.ceil(c.cd); if (n !== c.last && n > 0) { c.last = n; UI.big(String(n), '', 0.8); AUD.beep(); }
      if (c.cd <= 0) { UI.big('GO!', '', 0.8); AUD.tone(1600, 0.4, 'square', 0.1); c.stage = 'race'; }
      return;
    }
    c.t += dt; c.recT -= dt;
    if (c.recT <= 0) { c.recT = 0.25; c.rec.push([v.x, v.y]); }
    if (U.dist(v.x, v.y, c.cps[c.pi].x, c.cps[c.pi].y) < 120) {
      c.pi++; AUD.checkpoint();
      if (c.pi >= c.cps.length) {
        const run = { t: Math.round(c.t * 10) / 10, p: c.rec }, best = GHOST.load(GHOST.KEY), fr = GHOST.load(GHOST.FKEY);
        const nb = !best || run.t < best.t; if (nb) GHOST.save(GHOST.KEY, run);
        G.stats.trials = (G.stats.trials || 0) + 1;
        let msg = nb ? '🏆 Bagong record!' : `Record: ${best.t.toFixed(1)}s`;
        if (fr) msg += run.t < fr.t ? ' · 👻 Natalo mo ang kaibigan mo!' : ' · 👻 Mas mabilis pa ang kaibigan mo';
        if (fr && run.t < fr.t) { G.stats.beatFriend = 1; }
        UI.big(`⏱ ${run.t.toFixed(1)}s`, msg, 3, 'good'); this.pay(150 + (nb ? 350 : 0), '⏱ Time Trial');
        this.stop(''); setTimeout(() => SHARE.ghostPanel(), 1800); ACH.check();
        return;
      }
    }
    c.obj = `Checkpoint ${c.pi + 1}/${c.cps.length} · ⏱ ${c.t.toFixed(1)}s${c.vs ? ` · 👻 ${c.vs.t.toFixed(1)}s` : ''}`;
    c.tgt = Object.assign({ cp: true, n: c.pi + 1 }, c.cps[c.pi]);
    // ghost car follows the saved run
    if (c.vs && c.vs.p.length > 1) {
      const f = c.t / (c.vs.dt || 0.25), i = Math.min(c.vs.p.length - 2, Math.floor(f)), k = Math.min(1, f - i), a = c.vs.p[i], b = c.vs.p[i + 1];
      if (!c.ghost) { c.ghost = new Vehicle('sports', a[0], a[1], 0, { color: c.vs.friend ? '#a044ff' : '#7fdcff' }); c.ghost.driver = 'ai'; }
      c.ghost.x = U.lerp(a[0], b[0], k); c.ghost.y = U.lerp(a[1], b[1], k);
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 2) c.ghost.a = Math.atan2(b[1] - a[1], b[0] - a[0]);
    }
  },
});
const SHARE = {
  link() { const b = GHOST.load(GHOST.KEY); return b ? location.origin + location.pathname + '?ghost=' + encodeURIComponent(GHOST.encode(b)) : null; },
  async send(text, url, files) {
    text = I18N.t(text);
    try {
      if (navigator.share) { await navigator.share(Object.assign({ title: 'Hari ng Kalsada', text }, url ? { url } : {}, files ? { files } : {})); return true; }
    } catch (e) { if (e && e.name === 'AbortError') return true; }
    try { await navigator.clipboard.writeText(url ? `${text} ${url}` : text); UI.toast('📋 Nakopya ang link! I-paste sa Messenger o Facebook.'); return true; } catch (e) { }
    prompt('Kopyahin ang link:', url || text); return true;
  },
  ghostPanel() {
    const b = GHOST.load(GHOST.KEY); if (!b) return;
    G.paused = true;
    document.getElementById('shop-title').textContent = '⏱ TIME TRIAL';
    const el = document.getElementById('shop-list');
    el.innerHTML = `<div class="shoprow"><span class="ic">🏆</span><div><b>Pinakamabilis mo: ${b.t.toFixed(1)}s</b><small>Ipadala ang ghost mo sa kaibigan — makikita nila ang eksaktong takbo mo!</small></div><button id="sh-ghost">📤 IBAHAGI</button></div>`
      + (GHOST.load(GHOST.FKEY) ? `<div class="shoprow"><span class="ic">👻</span><div><b>Ghost ng kaibigan: ${GHOST.load(GHOST.FKEY).t.toFixed(1)}s</b><small>Ito ang kalaban mo sa susunod na Time Trial</small></div><button id="sh-clear">ALISIN</button></div>` : '');
    document.getElementById('sh-ghost').onclick = () => { AUD.click(); this.send(`👻 Kaya mo bang talunin ang ${b.t.toFixed(1)}s ko sa Hari ng Kalsada Time Trial?`, this.link()); G.stats.shared = (G.stats.shared || 0) + 1; ACH.check(); };
    const cl = document.getElementById('sh-clear'); if (cl) cl.onclick = () => { try { localStorage.removeItem(GHOST.FKEY); } catch (e) { } UI.toast('👻 Inalis ang ghost ng kaibigan'); this.ghostPanel(); };
    UI.show('shop');
  },
  // share the last Photo Mode picture as an image file
  async photo() {
    const url = PHOTO.lastUrl; if (!url) { UI.toast('Kumuha muna ng litrato 📸'); return; }
    let files = null;
    try { const blob = await (await fetch(url)).blob(), f = new File([blob], 'harinkalsada.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) files = [f]; } catch (e) { }
    if (files) { await this.send('📸 Mula sa Hari ng Kalsada!', null, files); G.stats.shared = (G.stats.shared || 0) + 1; ACH.check(); }
    else { UI.toast('📥 Na-save na ang litrato — i-share mula sa Gallery mo.'); }
  },
};
