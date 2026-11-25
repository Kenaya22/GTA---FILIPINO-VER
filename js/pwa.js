'use strict';
// ===== Installable app (PWA): offline cache, install button, update notice =====
const PWA = {
  deferred: null,
  standalone() { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true; },
  ios() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; },
  init() {
    const btn = document.getElementById('btn-install');
    if (location.protocol.startsWith('http') && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => { });
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        if (!G.started) { reloaded = true; location.reload(); }
        else UI.toast('✨ May bagong update! I-restart ang laro para makuha.');
      });
    }
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.deferred = e; });
    window.addEventListener('appinstalled', () => { btn.classList.add('hidden'); UI.toast('📲 Naka-install na! Buksan mula sa home screen.'); });
    // always offer the button (except when already installed); explain the steps when the browser can't prompt
    if (!this.standalone() && location.protocol.startsWith('http')) btn.classList.remove('hidden');
    if (this.inApp()) {
      document.getElementById('t-inapp').classList.remove('hidden');
      let shown = false; try { shown = sessionStorage.getItem('hnk_inapp') === '1'; sessionStorage.setItem('hnk_inapp', '1'); } catch (e) { }
      if (!shown) setTimeout(() => this.help(), 1500);
    }
    btn.onclick = () => this.install();
    if (this.standalone()) { const si = document.getElementById('set-install'); if (si) si.textContent = '✅ Naka-install na ang app'; }
    document.getElementById('t-inapp').onclick = () => this.help();
  },
  async install() {
    AUD.click();
    if (this.standalone()) { UI.toast('✅ Naka-install na ang app — buksan mula sa home screen.'); return; }
    if (this.deferred) { this.deferred.prompt(); const r = await this.deferred.userChoice.catch(() => null); this.deferred = null; if (r && r.outcome === 'accepted') document.getElementById('btn-install').classList.add('hidden'); return; }
    this.help();
  },
  inApp() { return /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat/i.test(navigator.userAgent); },
  help() {
    const ios = this.ios(), inApp = this.inApp(), android = /android/i.test(navigator.userAgent);
    let steps;
    if (inApp) steps = [
      '⚠️ Nakabukas ang laro sa loob ng <b>Messenger / Facebook</b>. Hindi dito pwedeng mag-install, at minsan walang tunog.',
      ios ? '1. Pindutin ang <b>⋯</b> o <b>🧭</b> sa taas/baba ng screen → <b>"Open in Safari"</b>.' : '1. Pindutin ang <b>⋮</b> sa taas-kanan → <b>"Open in Chrome"</b> / <b>"Buksan sa browser"</b>.',
      '2. Sa browser, pindutin ulit ang <b>📲 I-INSTALL ANG APP</b>.',
      'O kopyahin ang link at i-paste sa ' + (ios ? 'Safari' : 'Chrome') + ':',
    ];
    else if (ios) steps = ['1. Pindutin ang <b>Share</b> (parisukat na may arrow pataas ⬆️) sa baba ng Safari.', '2. Mag-scroll at piliin ang <b>"Add to Home Screen" ➕</b>.', '3. Pindutin ang <b>Add</b>. Buksan ang laro mula sa home screen — full screen at gumagana kahit offline!'];
    else if (android) steps = ['1. Pindutin ang <b>⋮</b> sa taas-kanan ng Chrome.', '2. Piliin ang <b>"Install app"</b> o <b>"Add to Home screen"</b>.', '3. Buksan ang laro mula sa home screen — full screen at gumagana kahit offline!'];
    else steps = ['1. Sa Chrome o Edge, pindutin ang <b>install icon ⊕</b> sa kanan ng address bar.', '2. O sa menu <b>⋮</b> → <b>"Install Hari ng Kalsada"</b>.'];
    document.getElementById('inst-steps').innerHTML = steps.map(t => `<p>${t}</p>`).join('');
    document.getElementById('inst-link').classList.toggle('hidden', !inApp);
    document.getElementById('inst-url').value = location.href.split('#')[0];
    UI.show('install');
  },
  copyLink() {
    const v = document.getElementById('inst-url').value;
    const ok = () => UI.toast('📋 Nakopya ang link!');
    if (navigator.clipboard) navigator.clipboard.writeText(v).then(ok, () => { document.getElementById('inst-url').select(); document.execCommand('copy'); ok(); });
    else { document.getElementById('inst-url').select(); document.execCommand('copy'); ok(); }
  },
};
