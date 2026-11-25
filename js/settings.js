'use strict';
// ===== Settings, difficulty & tutorial tips =====
const SETTINGS_KEY = 'harinkalsada_settings_v1';
const SETTINGS = {
  music: 0.6, sfx: 0.8, walkMusic: true, diff: 'madali', drive: 'madali', touchCtl: 'joystick', lang: 'fil', quality: 'high', joy: 1, lefty: false, tipsOn: true, seen: {}, density: 'normal', aim: 'auto',
  dens() { return { kaunti: 0.55, normal: 1, marami: 1.3 }[this.density] || 1; },
  load() {
    try { Object.assign(this, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch (e) { }
    if (!this.seen) this.seen = {};
  },
  save() {
    try {
      const { autoLowDone, music, sfx, walkMusic, diff, drive, touchCtl, lang, quality, joy, lefty, tipsOn, seen, density, aim } = this;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ autoLowDone, music, sfx, walkMusic, diff, drive, touchCtl, lang, quality, joy, lefty, tipsOn, seen, density, aim }));
    } catch (e) { }
  },
  apply() {
    AUD.setVolumes();
    MUSIC.applyGain();
    document.body.classList.toggle('lefty', !!this.lefty);
    document.body.classList.toggle('dpadmode', this.touchCtl === 'dpad');
    if (typeof INPUT !== 'undefined' && INPUT.keys) INPUT.releaseDpad();
    document.documentElement.style.setProperty('--joy', this.joy);
    TRAFFIC.maxCars = this.quality === 'low' ? 16 : 26;
    TRAFFIC.maxPeds = this.quality === 'low' ? 20 : 34;
    if (G.canvas) G.resize();
  },
};

// difficulty multipliers
// vision: how far cops see · lost: secs out of sight before they lose you · zone: search-zone size
// heat: how fast crimes add stars · decay: time per star to forget you (lower = faster)
// heliMin/roadblock/spikes/pellet: minimum stars before each kind of response
const DIFFS = {
  madali: { name: 'Madali', icon: '😎', desc: 'Para mag-enjoy. Mabagal at kaunti ang pulis, madaling tumakas, mas matibay ka.',
    copSpeed: 0.8, units: 0.5, arrest: 2.5, dmg: 0.5, carDmg: 0.6, decay: 0.5, timer: 1.4, vision: 0.7, lost: 1.8, zone: 0.65, heat: 0.65, inZone: 0.55, heliMin: 6, roadblock: 4, spikes: 6, pellet: 6, copGuns: 7, boxIn: 2, ramMin: 230, stopSpd: 20 },
  normal: { name: 'Normal', icon: '🙂', desc: 'Balanse. Kaya mong tumakas kung magtatago ka at magpapalit ng itsura.',
    copSpeed: 0.94, units: 0.85, arrest: 1.2, dmg: 0.9, carDmg: 0.9, decay: 0.8, timer: 1.1, vision: 0.88, lost: 2.5, zone: 0.85, heat: 0.9, inZone: 0.3, heliMin: 5, roadblock: 3, spikes: 5, pellet: 5, copGuns: 5 },
  mahirap: { name: 'Mahirap', icon: '🔥', desc: 'Para sa mga beterano. Mabilis, marami at matalas ang mata ng pulis.',
    copSpeed: 1.06, units: 1.3, arrest: 0.8, dmg: 1.3, carDmg: 1.25, decay: 1.3, timer: 0.85, vision: 1.1, lost: 3.6, zone: 1.1, heat: 1.2, inZone: 0.15, heliMin: 5, roadblock: 3, spikes: 5, pellet: 5, copGuns: 4 },
};
const D = () => DIFFS[SETTINGS.diff] || DIFFS.normal;

// one-time tutorial tips
const TIPS = {
  car: () => INPUT.touch
    ? ['🚗 Pagmamaneho', 'Ituro ang joystick kung saan mo gustong pumunta — kusang liliko ang sasakyan. Ituro sa likod para umatras. PRENO = handbrake para mag-drift. 📻 = palit istasyon ng radyo.']
    : SETTINGS.drive === 'madali'
      ? ['🚗 Madaling Pagmamaneho', 'Pindutin ang arrow / WASD kung SAAN mo gustong pumunta sa screen — kusang liliko ang sasakyan. Space = preno, H = busina, R = radyo, E = bumaba. (Palitan sa Settings → Pagmamaneho)']
      : ['🚗 Pagmamaneho (Classic)', 'W = gas, S = preno/atras, A/D = liko, Space = handbrake (drift), H = busina, R = radyo, E = bumaba.'],
  wanted: () => ['⭐ Hinahabol ka!', 'Ang krimeng NAKITA ng pulis o ng CCTV ay nagdadagdag ng bituin. Mas maraming bituin, mas maraming pulis. Mawala ka sa paningin nila para makatakas.'],
  search: () => ['🟪 Search Zone', 'Nawala ka sa paningin nila — kaya naka-outline ang bituin. Lumabas sa purple na zone: magiging PULA ang bituin at unti-unti ka nilang makakalimutan.'],
  clues: () => ['🕵️ Suspect Clues', 'Kinikilala ka ng pulis sa 4 na clue: CCTV, damit, mukha at sasakyan. Kapag binago mo ang alam nila (may ekis na pula), HINDI ka nila makikilala kahit makita ka pa.'],
  cctv: () => ['📹 CCTV Camera', 'May mga camera sa ilang kanto (yung may pulang cone). Kapag nakunan ka habang wanted ka, malalaman ng pulis ang buong itsura mo.'],
  shop: () => ['👕 💈 🎨 Pagbabagong-anyo', 'Ukay-Ukay = bagong damit. Barberya = bagong gupit. Pintura = bagong kulay at plaka ng kotse. Hindi pwede kapag may pulis na nakatingin!'],
  jeep: () => ['🚌 Pasada', 'Nakasakay ka sa jeepney! Sunduin ang mga pasahero sa PARA marker, huminto, tapos ihatid sila para kumita.'],
  damage: () => ['🔥 Sira na ang sasakyan', 'Kapag umusok at nagliyab, LUMABAS KA AGAD — sasabog yan! Ipaayos sa Pintura o lumipat ng ibang sasakyan.'],
  tsinelas: () => ['✨ Gintong Tsinelas', 'May 20 Gintong Tsinelas na nakatago sa buong Maynila (makikita sa mapa). Kapag nakuha mo lahat, may espesyal na premyo!'],
  rain: () => ['🌧 Tag-ulan', 'Kapag umuulan: madulas ang daan, BAHA sa ilang kalye (mabagal ang sasakyan), at mas mahirap kang makita ng pulis — magandang pagkakataon para tumakas!'],
  island: () => ['🏝 Isla Maligaya', 'May isla sa Manila Bay! Sumakay ng ferry (₱50) sa pantalan o mag-drive ng BANGKA. Walang kotse ng pulis sa isla — pero may police boat.'],
  vendor: () => ['🥣 Taho at Balut', 'May naglalakong taho sa umaga at balut sa gabi. Lapitan at bumili para sa dagdag na buhay (₱20).'],
  daynight: () => ['🌅 Araw at Gabi', 'Umiikot ang oras (tingnan ang orasan sa itaas). May rush hour (7–9 AM, 5–7 PM) na mas trapik, at iba-iba ang tao sa kalye depende sa oras.'],
  save: () => ['💾 Save at Load', 'Awtomatikong nase-save ang laro kapag umalis ka. Pwede ring mag-save sa 3 slot: ☰ → I-SAVE. Ang mga ari-arian mo ay safehouse din.'],
  jobs: () => ['💼 Side Jobs', 'Sa taxi, police car, ambulansya (🚑), fire truck (🚒), trak ng basura (🗑), delivery motor (🛵 Rider Hub) o tow truck (🛻 Impound), pindutin ang J / 💼 para kumita. Sa gabi, may 🏁 underground race sa Baywalk.'],
  minigames: () => ['🎤 Mini-games', 'May 🎤 Videoke (₱20 kada kanta, premyo sa 90+) at 🏀 3-Point Shootout sa mga basketball court. May 🥫 shooting range din sa Armas ni Kabo.'],
  dabaw: () => ['🦅 Dabaw', 'Madayaw nga pag-abot sa Dabaw! May Bundok Apo sa hilaga, Sentro ng Agila sa silangan at saging na plantasyon sa timog-silangan. Bawal ang mabilis dito — mag-ingat sa pulis!'],
  sugbo: () => ['🏝 Sugbo', 'Maayong pag-abot sa Sugbo! Bisaya ang salita dito: "Maayong buntag" = magandang umaga, "Salamat kaayo" = maraming salamat, "Lami!" = sarap! Bumalik sa Maynila gamit ang ✈️ Paliparan o ⛴ Ferry papuntang San Isidro.'],
  typhoon: () => ['🌀 Bagyo!', 'Itutulak ng hangin ang sasakyan mo at may lumilipad na yero — ingat! Maraming kalye ang baha. Sumakay sa jeepney, van, bus o bangka at pindutin ang J / 💼 para sa 🌀 Rescue: dalhin ang mga tao sa ⛺ Evacuation Center.'],
  guns: () => ['🔫 Baril', 'Kaliwang click / Space para bumaril (hawakan para sa SMG at Riple), G para mag-reload. Sa sasakyan: click, X o 🔫 para sa drive-by (Pistola o SMG). Sa phone, kusang tumututok. Mag-ingat — naririnig ng pulis ang putok!'],
  kuta: () => ['☠️ Kuta ng Sindikato', 'May mga kuta ng armadong sindikato (☠️ sa mapa). Talunin silang lahat para sa ₱3,000 — hindi krimen ang labanan sila, pero huwag tamaan ang inosente!'],
  weapons: () => ['🔨 Armas', 'Sa Hardware may pamalo, tirador at water gun. Q / 🔄 para magpalit. Krimen pa rin ang pagtama sa tao!'],
  property: () => ['🔑 Ari-arian', 'May mga ibinebentang lugar (🔑). Kapag nabili mo, may kita ka tuwing 6 AM, at nagiging safehouse ito.'],
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
    if (this.queue.length && this.cd <= 0 && !UI.talking && !TUT.active && !TUT.pending) {
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
    if (G.frame > 2400) this.show('daynight');
    if (P.vehicle && P.vehicle.t.boat) this.show('island');
    if (G.frame % 20 === 0) {
      const sh = SHOP.near();
      if (G.frame > 600) this.show('save');
      if (JOBS.avail()) this.show('jobs');
      if (sh && sh.type === 'weapon') this.show('weapons');
      if (sh && sh.type === 'gunshop' && GUNS.unlocked()) this.show('guns');
      if (KUTA.on() && KUTA.near()) this.show('kuta');
      if (sh && sh.type === 'property') this.show('property');
      if (sh && (sh.type === 'videoke' || sh.type === 'court')) this.show('minigames');
      if (WORLD.nearVendor() || WORLD.vendors.some(v => U.d2(v.x, v.y, P.x, P.y) < 250 * 250)) this.show('vendor');
      for (const c of MAP.cctv) if (U.d2(c.x, c.y, P.x, P.y) < 300 * 300) { this.show('cctv'); break; }
      for (const s of MAP.tsinelas) if (!G.tsinelas.has(s.id) && U.d2(s.x, s.y, P.x, P.y) < 450 * 450) { this.show('tsinelas'); break; }
      if (sh && ['ukay', 'barber', 'paint'].includes(sh.type)) this.show('shop');
    }
  },
};
