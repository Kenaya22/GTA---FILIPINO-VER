'use strict';
// ===== Startup: loading page → K&A Studios page → home =====
const BOOT = {
  start() {
    if (navigator.webdriver) { for (const id of ['boot', 'studio']) { const e = document.getElementById(id); if (e) e.remove(); } return; }   // automated tests
    const fill = document.getElementById('bt-fill'), msg = document.getElementById('bt-msg'), t0 = performance.now();
    let p = 0, ready = false;
    const steps = ['Naglo-load ng mapa...', 'Inaayos ang mga kalsada...', 'Ginigising ang mga jeepney...', 'Halos tapos na...'];
    const done = () => { ready = true; };
    Promise.all([document.fonts ? document.fonts.ready.catch(() => { }) : 0, new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r))]).then(done);
    setTimeout(done, 4000);
    const iv = setInterval(() => {
      p = Math.min(ready && performance.now() - t0 > 1100 ? 100 : 92, p + (ready ? 9 : 3 + Math.random() * 5));
      fill.style.width = p + '%'; msg.textContent = I18N.t(steps[Math.min(3, Math.floor(p / 26))]);
      if (p >= 100) { clearInterval(iv); setTimeout(() => this.studio(), 250); }
    }, 90);
  },
  studio() {
    const b = document.getElementById('boot'), s = document.getElementById('studio');
    document.getElementById('st-ver').textContent = 'v' + GAME_VERSION;
    s.classList.remove('hidden'); b.classList.add('out'); setTimeout(() => b.remove(), 600);
    const go = () => { if (this.gone) return; this.gone = true; s.classList.add('out'); setTimeout(() => s.remove(), 600); };
    s.addEventListener('click', go); s.addEventListener('touchend', go);
    setTimeout(go, 4200);
  },
};
