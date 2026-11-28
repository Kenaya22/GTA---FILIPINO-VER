// Deterministic gameplay capture: virtual clock, one screenshot per 1/30 s, 1080x1920
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = __dirname + '/clips/';
const VIRT = () => {
  let vt = 0, q = [], virtual = false; const realNow = performance.now.bind(performance), rRAF = window.requestAnimationFrame.bind(window);
  window.__virt = () => { virtual = true; vt = realNow(); };
  performance.now = () => virtual ? vt : realNow();
  window.requestAnimationFrame = (cb) => { if (virtual) { q.push(cb); return 1; } return rRAF(cb); };
  window.__step = (ms) => { vt += ms; const c = q; q = []; c.forEach(f => f(vt)); };
};
module.exports = async function capture(scenes, only) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 732 }, deviceScaleFactor: 1080 / 412, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(VIRT);
  await p.addInitScript(() => { localStorage.setItem('harinkalsada_seenver', '9.9'); localStorage.setItem('harinkalsada_settings_v1', JSON.stringify({ lang: 'en', tipsOn: false, newsVoice: 'off' })); });
  await p.goto('file:///home/user/GTA---FILIPINO-VER/index.html'); await p.waitForTimeout(900);
  await p.tap('#btn-new'); await p.waitForTimeout(300); await p.tap('#ng-go'); await p.waitForTimeout(1200);
  await p.evaluate(() => { TUT.pending = false; TUT.end(true); SETTINGS.tipsOn = false; MS.active = null; MS.idx = 8; ACH.check = () => { }; PROG.xp = () => { }; G.player.money = 250000; STREAK.check = () => { }; ERRAND.update = () => { }; });
  await p.waitForTimeout(6000);
  await p.evaluate(() => { window.__virt(); window.__zoomMul = 1.35; });
  const step = (n) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__step(1000 / 30); }, n);
  const clean = () => p.evaluate(() => { TIP.close(); UI.bq = []; document.querySelectorAll('#toasts > *').forEach(e => e.remove()); UI.tq = []; UI.toasts = []; const r = document.getElementById('radio'); if (r) r.classList.add('hidden'); document.getElementById('sidejob').style.visibility = 'hidden'; });
  for (const s of scenes) {
    if (only && !only.includes(s.name)) continue;
    const dir = OUT + s.name + '/'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    await p.evaluate(() => { G.paused = false; for (const id of ['shop','phone','mapscreen','comic']) { const e = document.getElementById(id); if (e) e.classList.add('hidden'); } UI.bigT = 0; UI.bigCur = null; document.getElementById('bigmsg').classList.add('hidden'); UI.say([]); });
    await p.evaluate(s.setup);
    await step(s.warm || 20); if (!s.keepToasts) await clean();
    for (let f = 0; f < s.frames; f++) {
      if (s.each) await p.evaluate(s.each, f);
      await step(1);
      if (!s.keepToasts && f % 10 === 0) await clean();
      if (!s.keepBig && !s.keepUI) await p.evaluate(() => { UI.bq = []; });
      await p.screenshot({ path: dir + String(f).padStart(4, '0') + '.jpg', type: 'jpeg', quality: 88 });
    }
    if (s.teardown) await p.evaluate(s.teardown);
    console.log('captured', s.name, s.frames);
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
};
