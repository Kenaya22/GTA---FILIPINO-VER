'use strict';
// ===== Language: Filipino (default) / English =====
// Text is written in Filipino in the code; when English is on, a MutationObserver translates
// every piece of text as it appears on screen using LANG_EN (exact strings + pattern rules).
const I18N = {
  on: false, rx: [], mo: null,
  RICH: '#tut-text, .changelog li, .helpgrid p',
  init() {
    this.rx = LANG_EN.rules.map(([s, e]) => [new RegExp(s, 's'), e]);
    this.upper = {};   // for titles shown in CAPITALS (e.g. mission banners)
    for (const k in LANG_EN.exact) { const u = k.toUpperCase(); if (u !== k && !(u in LANG_EN.exact)) this.upper[u] = LANG_EN.exact[k].toUpperCase(); }
    for (const f of ['alert', 'confirm', 'prompt']) { const o = window[f].bind(window); window[f] = (m, ...a) => o(this.t(m), ...a); }
    if (SETTINGS.lang === 'en') this.enable();
  },
  enable() {
    this.on = true; document.documentElement.lang = 'en';
    this.node(document.body);
    if (!this.mo) {
      this.mo = new MutationObserver((ms) => {
        for (const m of ms) { if (m.type === 'characterData') this.node(m.target); else m.addedNodes.forEach(n => this.node(n)); }
      });
      this.mo.observe(document.body, { subtree: true, childList: true, characterData: true });
    }
  },
  t(s) {
    if (!this.on || typeof s !== 'string') return s;
    const k = s.trim();
    if (!k || !/[A-Za-z]{2}/.test(k) || /^[\d:\s]+(AM|PM)$/.test(k)) return s;
    const r = this.tk(k, 0);
    return r === k ? s : s.replace(k, r);
  },
  tk(k, depth) {
    const e = LANG_EN.exact[k];
    if (e !== undefined) return e;
    const u = this.upper[k];
    if (u !== undefined) return u;
    if (depth > 3) return k;
    for (const [re, en] of this.rx) {
      const m = k.match(re);
      if (m) return en.replace(/\{(\d)\}/g, (_, n) => { const g = m[+n + 1] || ''; const tr = g.trim(); return tr ? g.replace(tr, this.tk(tr, depth + 1)) : g; });
    }
    const p = k.match(/^([^A-Za-z0-9"'(<]+)(.+)$/s);   // emoji / symbol prefix
    if (p) { const r = this.tk(p[2], depth + 1); if (r !== p[2]) return p[1] + r; }
    return k;
  },
  rich(el) {
    const h = el.innerHTML.trim(), r = this.tk(h, 0);
    if (r !== h) el.innerHTML = r;
  },
  node(n) {
    if (!this.on || !n) return;
    if (n.nodeType === 3) {
      const p = n.parentElement;
      if (!p || p.closest('script,style')) return;
      const rp = p.closest(this.RICH); if (rp) { this.rich(rp); return; }
      const v = this.t(n.data); if (v !== n.data) n.data = v;
      return;
    }
    if (n.nodeType !== 1 || n.closest('script,style')) return;
    const rp = n.closest(this.RICH); if (rp) { this.rich(rp); return; }
    n.querySelectorAll(this.RICH).forEach(e => this.rich(e));
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT), list = [];
    let x; while ((x = w.nextNode())) list.push(x);
    for (const tn of list) { if (tn.parentElement && tn.parentElement.closest(this.RICH)) continue; const v = this.t(tn.data); if (v !== tn.data) tn.data = v; }
  },
  set(lang) {
    if (lang === SETTINGS.lang) return;
    SETTINGS.lang = lang; SETTINGS.save();
    if (lang === 'en') this.enable();
    else { if (G.started && !SAVE.canSave()) SAVE.write('auto', true); location.reload(); }
  },
};
