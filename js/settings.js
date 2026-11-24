'use strict';
// ===== Settings, difficulty & tutorial tips =====
const SETTINGS_KEY = 'harinkalsada_settings_v1';
const SETTINGS = {
  music: 0.6, sfx: 0.8, walkMusic: true, diff: 'normal', quality: 'high', joy: 1, lefty: false, tipsOn: true, seen: {},
  load() {
    try { Object.assign(this, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch (e) { }
    if (!this.seen) this.seen = {};
  },
  save() {
    try {
      const { music, sfx, walkMusic, diff, quality, joy, lefty, tipsOn, seen } = this;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ music, sfx, walkMusic, diff, quality, joy, lefty, tipsOn, seen }));
    } catch (e) { }
  },
  apply() {
    AUD.setVolumes();
    MUSIC.applyGain();
    document.body.classList.toggle('lefty', !!this.lefty);
    document.documentElement.style.setProperty('--joy', this.joy);
    TRAFFIC.maxCars = this.quality === 'low' ? 16 : 26;
    TRAFFIC.maxPeds = this.quality === 'low' ? 20 : 34;
    if (G.canvas) G.resize();
  },
};

// difficulty multipliers
const DIFFS = {
  madali: { name: 'Madali', copSpeed: 0.88, units: 0.6, arrest: 1.6, dmg: 0.6, carDmg: 0.7, decay: 0.7, timer: 1.35 },
  normal: { name: 'Normal', copSpeed: 1, units: 1, arrest: 1, dmg: 1, carDmg: 1, decay: 1, timer: 1 },
  mahirap: { name: 'Mahirap', copSpeed: 1.06, units: 1.35, arrest: 0.8, dmg: 1.3, carDmg: 1.25, decay: 1.35, timer: 0.85 },
};
const D = () => DIFFS[SETTINGS.diff] || DIFFS.normal;

// one-time tutorial tips
const TIPS = {
  car: () => INPUT.touch
    ? ['🚗 Pagmamaneho', 'Ituro ang joystick kung saan mo gustong pumunta — kusang liliko ang sasakyan. Ituro sa likod para umatras. PRENO = handbrake para mag-drift. 📻 = palit istasyon ng radyo.']
    : ['🚗 Pagmamaneho', 'W = gas, S = preno/atras, A/D = liko, Space = handbrake (drift), H = busina, R = palit istasyon ng radyo, E = bumaba.'],
  wanted: () => ['⭐ Hinahabol ka!', 'Ang krimeng NAKITA ng pulis o ng CCTV ay nagdadagdag ng bituin. Mas maraming bituin, mas maraming pulis. Mawala ka sa paningin nila para makatakas.'],
  search: () => ['🟪 Search Zone', 'Nawala ka sa paningin nila — kaya naka-outline ang bituin. Lumabas sa purple na zone: magiging PULA ang bituin at unti-unti ka nilang makakalimutan.'],
  clues: () => ['🕵️ Suspect Clues', 'Kinikilala ka ng pulis sa 4 na clue: CCTV, damit, mukha at sasakyan. Kapag binago mo ang alam nila (may ekis na pula), HINDI ka nila makikilala kahit makita ka pa.'],
  cctv: () => ['📹 CCTV Camera', 'May mga camera sa ilang kanto (yung may pulang cone). Kapag nakunan ka habang wanted ka, malalaman ng pulis ang buong itsura mo.'],
  shop: () => ['👕 💈 🎨 Pagbabagong-anyo', 'Ukay-Ukay = bagong damit. Barberya = bagong gupit. Pintura = bagong kulay at plaka ng kotse. Hindi pwede kapag may pulis na nakatingin!'],
  jeep: () => ['🚌 Pasada', 'Nakasakay ka sa jeepney! Sunduin ang mga pasahero sa PARA marker, huminto, tapos ihatid sila para kumita.'],
  damage: () => ['🔥 Sira na ang sasakyan', 'Kapag umusok at nagliyab, LUMABAS KA AGAD — sasabog yan! Ipaayos sa Pintura o lumipat ng ibang sasakyan.'],
  tsinelas: () => ['✨ Gintong Tsinelas', 'May 20 Gintong Tsinelas na nakatago sa buong Maynila (makikita sa mapa). Kapag nakuha mo lahat, may espesyal na premyo!'],
  retry: () => ['🔁 Checkpoint', 'Nabigo ang misyon? Pindutin ang ULITIN para bumalik sa checkpoint — hindi na kailangang ulitin ang usapan.'],
};
const TIP = {
  queue: [], cur: null, t: 0, cd: 0,
  show(key) {
    if (!SETTINGS.tipsOn || SETTINGS.seen[key] || this.queue.includes(key) || (this.cur === key)) return;
    if (['car', 'wanted', 'search', 'clues', 'damage'].includes(key)) this.queue.unshift(key); else this.queue.push(key);
  },
  update(dt) {
    this.cd -= dt;
    if (this.cur) {
      this.t -= dt;
      if (this.t <= 0) this.close();
      return;
    }
    if (this.queue.length && this.cd <= 0 && !UI.talking) {
      const key = this.queue.shift();
      const [title, body] = TIPS[key]();
      SETTINGS.seen[key] = true; SETTINGS.save();
      this.cur = key; this.t = 9;
      UI.tip(title, body);
    }
  },
  close() { this.cur = null; this.cd = 2.5; UI.tip(null); },
  check(dt) {
    const P = G.player, W = WANTED;
    if (P.vehicle) {
      this.show('car');
      if (P.vehicle.type === 'jeepney' && !MS.active) this.show('jeep');
      if (P.vehicle.hp < P.vehicle.maxhp * 0.35 && !P.vehicle.dead) this.show('damage');
    }
    if (W.stars > 0) this.show('wanted');
    if (W.mode === 'search') this.show('search');
    if (W.stars > 0 && (W.prof.car || W.prof.clothes || W.prof.face)) this.show('clues');
    if (G.frame % 20 === 0) {
      for (const c of MAP.cctv) if (U.d2(c.x, c.y, P.x, P.y) < 300 * 300) { this.show('cctv'); break; }
      for (const s of MAP.tsinelas) if (!G.tsinelas.has(s.id) && U.d2(s.x, s.y, P.x, P.y) < 450 * 450) { this.show('tsinelas'); break; }
      const sh = SHOP.near(); if (sh && ['ukay', 'barber', 'paint'].includes(sh.type)) this.show('shop');
    }
  },
};
