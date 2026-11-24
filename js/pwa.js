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
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.deferred = e; if (!this.standalone()) btn.classList.remove('hidden'); });
    window.addEventListener('appinstalled', () => { btn.classList.add('hidden'); UI.toast('📲 Naka-install na! Buksan mula sa home screen.'); });
    if (this.ios() && !this.standalone()) btn.classList.remove('hidden');
    btn.onclick = async () => {
      if (this.deferred) { this.deferred.prompt(); await this.deferred.userChoice.catch(() => { }); this.deferred = null; btn.classList.add('hidden'); }
      else if (this.ios()) alert('Pindutin ang ⎋ Share → "Add to Home Screen" para i-install.');
    };
  },
};
