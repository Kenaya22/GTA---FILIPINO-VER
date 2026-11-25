'use strict';
// ===== Guided tutorial for new players & developer mode =====
const TUT = {
  active: false, pending: false, i: 0, sx: 0, sy: 0, steps: null,
  ctlText() {
    if (!INPUT.touch) return 'Gamitin ang <b>WASD</b> o <b>arrow keys</b> para lumakad. Hawakan ang <b>Shift</b> para tumakbo.';
    return SETTINGS.touchCtl === 'dpad'
      ? 'Pindutin ang mga <b>ARROW ▲▼◀▶</b> sa kaliwa para lumakad. Isagad para tumakbo.'
      : 'I-drag ang daliri sa <b>kaliwang bahagi</b> ng screen (joystick) para lumakad. Isagad para tumakbo.';
  },
  makeSteps() {
    const P = () => G.player;
    return [
      { t: () => '👋 <b>Maligayang pagdating sa Maynila!</b> Ituturo ko kung paano maglaro. Pwede mo itong laktawan anumang oras.', ok: true },
      { t: () => '🚶 ' + this.ctlText(), hl: () => (INPUT.touch ? (SETTINGS.touchCtl === 'dpad' ? 'dpad' : 'joyzone') : null),
        enter: () => { this.sx = P().x; this.sy = P().y; }, done: () => U.dist(this.sx, this.sy, P().x, P().y) > 120 },
      { t: () => '🗺 Ito ang <b>minimap</b>. Ang <b>DILAW</b> na tuldok ang pupuntahan mo, at ang <b>LILANG linya</b> ang daan.', hl: () => 'minimap', ok: true },
      { t: () => '📋 Dito nakasulat ang <b>misyon</b> mo ngayon.', hl: () => 'objective', ok: true },
      { t: () => `🛺 May <b>tricycle</b> sa tabi mo. Lumapit at pindutin ang <b>${INPUT.touch ? 'SAKAY' : 'E'}</b>.`, hl: () => (INPUT.touch ? 'tb-act' : 'prompt'), done: () => !!P().vehicle },
      { t: () => SETTINGS.drive === 'madali'
          ? `🚗 Ituro lang kung <b>SAAN</b> pupunta — kusang liliko ang sasakyan. Kung walang daan doon, liliko ito sa susunod na kanto. <b>${INPUT.touch ? 'PRENO' : 'Space'}</b> para huminto.`
          : '🚗 <b>W</b> = gas, <b>S</b> = preno/atras, <b>A/D</b> = liko, <b>Space</b> = handbrake.',
        hl: () => (INPUT.touch ? (SETTINGS.touchCtl === 'dpad' ? 'dpad' : 'joyzone') : null),
        enter: () => { const v = P().vehicle || P(); this.sx = v.x; this.sy = v.y; }, done: () => { const v = P().vehicle; return !!v && U.dist(this.sx, this.sy, v.x, v.y) > 400; } },
      { t: () => '⭐ Kapag may krimen kang <b>nakita ng pulis o CCTV</b>, hahabulin ka. Lumiko sa mga kanto at lumabas sa <b>purple na zone</b> para makatakas.', hl: () => 'stars', ok: true },
      { t: () => '☰ Nandito ang <b>Mapa, Save, at Settings</b>. Ngayon, sundan ang lilang linya papunta kay <b>Tito Boy</b>. Kaya mo yan!', hl: () => 'btn-pause', ok: true },
    ];
  },
  start() {
    this.steps = this.makeSteps(); this.active = true; this.pending = false; this.i = -1;
    TIP.queue = []; if (TIP.cur) TIP.close();
    SETTINGS.seen.car = true; SETTINGS.seen.save = true;
    this.next();
  },
  next() {
    this.hl(null);
    this.i++;
    if (this.i >= this.steps.length) { this.end(); return; }
    const st = this.steps[this.i];
    if (st.enter) st.enter();
    document.getElementById('tut-n').textContent = `${this.i + 1} / ${this.steps.length}`;
    document.getElementById('tut-text').innerHTML = st.t();
    document.getElementById('tut-ok').classList.toggle('hidden', !st.ok);
    document.getElementById('tut-wait').classList.toggle('hidden', !!st.ok);
    document.getElementById('tut').classList.remove('hidden');
    this.hl(st.hl ? st.hl() : null);
    AUD.tone(880, 0.08, 'triangle', 0.07); AUD.tone(1175, 0.12, 'triangle', 0.07, 0, 0.08);
  },
  hl(id) {
    document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl'));
    if (id) { const e = document.getElementById(id); if (e) e.classList.add('tut-hl'); }
  },
  end(skipped) {
    this.active = false; this.hl(null);
    document.getElementById('tut').classList.add('hidden');
    SETTINGS.tutorialDone = true; SETTINGS.save();
    if (!skipped) { UI.toast('🎓 Tapos ang tutorial! Good luck, Nonoy!'); AUD.success(); }
  },
  update(dt) {
    if (this.pending && !UI.talking && G.started && !G.cutscene) this.start();
    if (!this.active) return;
    const st = this.steps[this.i];
    if (st && st.done && st.done()) { AUD.checkpoint(); this.next(); }
  },
};

// ===== Developer mode (password protected) =====
const DEV = {
  HASH: '9a8d5c3e', god: false,
  hash(s) {
    let h = 0x811c9dc5;
    for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    for (let r = 0; r < 1000; r++) { h ^= r; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16);
  },
  unlocked() { try { return sessionStorage.getItem('hnk_dev') === '1'; } catch (e) { return !!this._u; } },
  open() {
    if (!this.unlocked()) {
      const pw = prompt('🛠 Developer Mode\nIlagay ang password:');
      if (pw === null) return;
      if (this.hash(pw.trim()) !== this.HASH) { alert('Mali ang password.'); AUD.fail(); return; }
      try { sessionStorage.setItem('hnk_dev', '1'); } catch (e) { this._u = true; }
      AUD.success();
    }
    this.render();
    UI.show('devpanel');
  },
  lock() { try { sessionStorage.removeItem('hnk_dev'); } catch (e) { } this._u = false; this.god = false; UI.hide('devpanel'); UI.toast('🔒 Naka-lock ang Developer Mode'); },
  render() {
    const list = document.getElementById('dev-missions');
    let ch = 0;
    list.innerHTML = MISSIONS.map((m, i) => {
      let head = '';
      if (m.chapter !== ch) { ch = m.chapter; head = `<div class="dev-ch">KABANATA ${ch}${ch === 1 ? ': MAYNILA' : ch === 2 ? ': PROBINSYA' : ch === 3 ? ': SUGBO' : ch === 4 ? ': DABAW' : ': BAGIW'}</div>`; }
      const st = i < MS.idx ? '✓' : i === MS.idx ? '▶' : '';
      return `${head}<button class="dev-m" data-i="${i}"><span class="n">${i + 1}</span><span class="t"><b>${m.title}</b><small>${CHARS[m.giver].name} · ${U.money(m.reward)}</small></span><span class="s">${st}</span></button>`;
    }).join('');
    list.querySelectorAll('.dev-m').forEach(b => b.onclick = () => this.jump(+b.dataset.i));
    const tp = document.getElementById('dev-tp');
    tp.innerHTML = '<option value="">— Teleport sa... —</option>' + Object.values(MAP.pois).map(p => `<option value="${p.key}">${p.icon} ${p.label}</option>`).join('');
    document.getElementById('dev-god').textContent = `🛡 God mode: ${this.god ? 'ON' : 'OFF'}`;
  },
  ensureGame() {
    if (G.started) return;
    G.newGame(true);
  },
  jump(i) {
    UI.hide('devpanel'); UI.hide('settings'); UI.hide('pause'); UI.hide('title'); UI.hide('newgame');
    AUD.init(); AUD.resume();
    this.ensureGame();
    G.paused = false;
    const P = G.player;
    if (MS.active) { MS.active = null; MS.c = null; }
    TUT.active = false; TUT.pending = false; document.getElementById('tut').classList.add('hidden');
    UI.say([]); WANTED.clear(false); JOBS.active = null; JOBS.c = null;
    if (P.vehicle) G.exitVehicle(true);
    MS.idx = i; MS.retryInfo = null; MS.failCd = 0;
    if (i > 4) G.unlock.sports = true;
    const m = MISSIONS[i], g = MS.giverPOI(m);
    P.x = g.x; P.y = g.y + 30; P.hp = 100; G.cam.x = P.x; G.cam.y = P.y;
    MS.start(i);
    UI.toast(`🛠 DEV: Misyon ${i + 1} — ${m.title}`);
  },
  money() { G.player.money += 100000; UI.toast('🛠 +₱100,000'); },
  setTime(h) { WORLD.clock = h * 60; UI.toast('🛠 Oras: ' + WORLD.timeStr()); },
  rain() { const on = WORLD.rainTarget > 0; WORLD.rainTarget = on ? 0 : 1; if (!on) WORLD.rain = 0.8; UI.toast(on ? '🛠 Tigil ulan' : '🛠 Ulan!'); },
  teleport(key) {
    const p = MAP.pois[key]; if (!p) return;
    this.ensureGame(); const P = G.player;
    if (P.vehicle) { P.vehicle.x = p.x; P.vehicle.y = p.y + 60; P.vehicle.vx = P.vehicle.vy = 0; }
    P.x = p.x; P.y = p.y + (P.vehicle ? 60 : 20); G.cam.x = P.x; G.cam.y = P.y;
    UI.hide('devpanel'); UI.hide('settings'); UI.hide('pause'); G.paused = false;
    UI.toast('🛠 Teleport: ' + p.label);
  },
};
