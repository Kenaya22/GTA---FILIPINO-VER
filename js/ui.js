'use strict';
// ===== UI: HUD, minimap, dialog, menus, input =====
const $ = (id) => document.getElementById(id);
const STAR_SVG = '<svg class="star" viewBox="0 0 24 24"><path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.5L12 16.9l-5.8 3.3 1.4-6.5L2.7 9.3l6.5-.7z"/></svg>';
const ICONS = {
  cam: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7h12l3 2v5l-3 2H3z" transform="rotate(-12 12 12)"/><circle cx="16" cy="11" r="2" fill="#e74c3c"/><rect x="3" y="15" width="2.5" height="7" rx="1"/></svg>',
  clothes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7a2 2 0 1 1 2-2"/><path d="M12 7v2L3 16h18l-9-7"/></svg>',
  face: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.5"/><path d="M3.5 21c0-4.6 3.8-7.5 8.5-7.5s8.5 2.9 8.5 7.5z"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 11l1.8-4.6A2 2 0 0 1 8.7 5h6.6a2 2 0 0 1 1.9 1.4L19 11a2 2 0 0 1 2 2v4h-2v2h-3v-2H8v2H5v-2H3v-4a2 2 0 0 1 2-2zm2.2 0h9.6l-1.3-3.6H8.5z"/><circle cx="7" cy="14" r="1.5" fill="#1a2030"/><circle cx="17" cy="14" r="1.5" fill="#1a2030"/></svg>',
};

// what's new in each version (newest first)
const PLACES = [
  ['gunshop', '🔫', 'Baril (Armas)'], ['weapon', '🔨', 'Hardware'], ['ukay', '👕', 'Ukay-Ukay'], ['barber', '💈', 'Barberya'], ['paint', '🎨', 'Pintura'],
  ['chop', '🔧', 'Talyer'], ['sari', '🏪', 'Sari-sari'], ['hospital', '🏥', 'Ospital'], ['home', '🏠', 'Bahay / Save'], ['garage', '🅿️', 'Garahe'],
  ['property', '🔑', 'Ibinebenta'], ['videoke', '🎤', 'Videoke'], ['court', '🏀', 'Basketball'], ['rider', '🛵', 'Rider Hub'], ['tow', '🛻', 'Impound'],
  ['race', '🏁', 'Karera'], ['ferry', '⛴', 'Ferry'], ['airport', '✈️', 'Paliparan'], ['depot', '🚑', 'Ambulansya / Bumbero'], ['evac', '⛺', 'Evacuation'], ['police', '🚓', 'Presinto'],
];
const CHANGES = [
  { v: '1.7.1', title: 'Mga Ayos', date: 'Nobyembre 2026', items: [
    '🔊 <b>May tunog na sa iPhone</b> — kahit naka-silent at kahit sa loob ng Messenger',
    '📲 Laging may <b>I-INSTALL</b> na button — may sunod-sunod na gabay para sa iPhone, Android at Messenger',
    '🔫 <b>Bukas na agad ang Armas ni Kabo</b> — makakabili ng baril kahit sa simula ng laro',
    '📍 <b>HANAPIN</b> sa mapa — piliin ang lugar (baril, ukay, ospital...) at gagabayan ka ng GPS. Pwede ring i-tap ang mapa',
    '📱 Hindi na natatakpan ng speedometer ang mga button sa phone',
  ] },
  { v: '1.7', title: 'Baril, Bagyo at Pista', date: 'Nobyembre 2026', items: [
    '🔫 <b>Mga baril</b>: Pistola, Shotgun, SMG, Riple at Granada — may bala, reload, tracer at <b>drive-by</b>. Sa PC: tumutok gamit ang mouse',
    '🦺 <b>Bulletproof vest</b> (asul na bar) at <b>🔫 Armas ni Kabo</b> — 2 tindahan ng baril na may stats ng bawat armas',
    '☠️ <b>3 Kuta ng Sindikato</b> na may armadong kalaban — linisin para sa ₱3,000 · 🥫 <b>Shooting range</b>',
    '🚓 Sa mataas na bituin, <b>totoong baril</b> na ang gamit ng pulis (depende sa hirap)',
    '🚑 <b>Bagong sasakyan</b>: Ambulansya, Fire Truck, Trak ng Basura, Padyak at Pickup — may sirena (H)',
    '💼 <b>Bagong side jobs</b>: 🚑 Paramedic, 🚒 Bumbero (patayin ang sunog), 🗑 Basurero',
    '🌀 <b>BAGYO!</b> — hangin na nagtutulak ng sasakyan, lumilipad na yero, baha sa buong lungsod at 🛟 <b>Rescue</b> papuntang ⛺ Evacuation Center',
    '🎉 <b>Pista sa Tondo</b> na may parada, banda at karosa · 🎄 <b>Parol</b> tuwing "ber months" · 🕯 <b>Undas</b>',
    '🎤 <b>Videoke</b> (rhythm game, 3 kanta) at 🏀 <b>3-Point Shootout</b> sa mga basketball court',
    '👗 <b>Ukay-Ukay na may pagpipilian</b>: 8 bagong damit at 7 aksesorya (salakot, shades, bandana...) — ang nasa ulo ay nagbabago ng "mukha" mo para sa pulis',
    '📷 <b>Photo Mode</b> (O o ☰) — may filters, zoom at frame; i-save bilang larawan',
    '🏆 <b>15 bagong tagumpay</b>',
  ] },
  { v: '1.6', title: 'Polish at Release', date: 'Nobyembre 2026', items: [
    '🌐 <b>English</b> — pwede nang laruin sa English (🌐 sa home page o sa Settings)',
    '🖼 <b>Mukha ng mga tauhan</b> sa bawat usapan — si Nonoy, Tito Boy, Lola Isyang, Don Severo at iba pa',
    '📲 <b>I-install bilang app</b> — gumagana kahit walang internet at full screen',
    '💾 <b>Backup ng save</b> — I-EXPORT / I-IMPORT para ilipat ang save sa ibang phone',
    '⚡ <b>Mas magaan sa lumang phone</b> — kusang lilipat sa MABILIS na graphics kapag mabagal; mas tipid sa baterya',
    '🎬 Trailer, screenshots at gabay sa pag-publish sa itch.io',
  ] },
  { v: '1.5', title: 'Kabanata 2: Probinsya', date: 'Nobyembre 2026', items: [
    '🌾 <b>KABANATA 2</b> — bagong lugar: ang bayan ng <b>San Isidro</b> sa silangan (highway, palayan, plaza, hacienda)',
    '📖 <b>6 na bagong misyon</b>: Pauwi sa Probinsya, Ani ng Bayan, Karera ng Kuliglig, Mga Bantay ni Don Severo, Ang Titulo, Lupa ng Bayan',
    '⚖️ <b>Ikaw ang magpapasya</b> — may pagpipilian sa kuwento at <b>2 magkaibang wakas</b>',
    '🎞 <b>Comic cutscenes</b> sa simula at dulo ng kabanata',
    '🚜 Bagong sasakyan: <b>Kuliglig</b> · 🕵️ <b>stealth</b> — iwasan ang dilaw na tingin ng mga bantay',
    '🎓 <b>Tutorial</b> para sa bagong laro (pwedeng ulitin sa ❓ Paano)',
    '⬆️ <b>Arrow buttons</b> ▲▼◀▶ — pumili ng Joystick o Arrows sa Settings',
    '🛠 <b>Developer Mode</b> (may password) — simulan ang kahit anong misyon',
    '🧹 Mas malinis na home page',
  ] },
  { v: '1.4', title: 'Bagong Home Page at Madaling Laro', date: 'Nobyembre 2026', items: [
    '🏠 <b>Bagong home page</b> — may live na habulan sa likod, card ng huling laro (misyon, pera, % kumpleto) at mabilis na ITULOY',
    '💪 <b>Pumili ng hirap</b> bago maglaro: 😎 Madali, 🙂 Normal, 🔥 Mahirap',
    '😎 <b>Mas madaling tumakas</b> — sa Madali: mas mabagal at kaunti ang pulis, mas maikli ang tingin nila, mas maliit ang search zone, mas mabilis kang makalimutan',
    '🧭 <b>Madaling Pagmamaneho</b> — ituro lang kung SAAN pupunta (pati sa keyboard). Kung walang daan, didiretso at liliko sa susunod na kanto (dilaw na arrow)',
    '🛟 <b>Tulong sa manibela</b> — mas makapit ang gulong, kusang dumidiretso sa kalsada, at pumipreno bago bumangga',
    '🏎 Pwede pa ring piliin ang <b>Classic</b> na pagmamaneho sa Settings',
  ] },
  { v: '1.3', title: 'Negosyo, Trabaho at Save', date: 'Nobyembre 2026', items: [
    '💾 <b>Save at Load</b> — 3 save slot + Auto-save. Pwede kang umalis anumang oras; nase-save ang lugar, sasakyan at misyon mo',
    '🔨 <b>Armas</b> sa Hardware: 🏏 pamalo, 🎯 tirador (auto-aim) at 💦 water gun. Q / 🔄 para magpalit',
    '🔑 <b>Ari-arian</b> — bumili ng Sari-sari, Carinderia, Talyer, Beach Resort at Condo. May kita tuwing 6 AM at safehouse',
    '🅿️ <b>Garahe</b> — mag-imbak ng hanggang 6 na sasakyan',
    '🎨 <b>Pintura upgrades</b> — kulay, makina, armor, sticker (apoy, araw, bulaklak...) at busina (kalabaw! tandang!)',
    '🛵 <b>Food Rider</b>, 🚕 <b>Taxi</b>, 🛻 <b>Tow Truck</b>, 🚨 <b>Pulis Vigilante</b> — side jobs (J / 💼)',
    '🏁 <b>Underground Race</b> sa Baywalk tuwing gabi — pumusta at manalo x2',
    '🏆 <b>20 Tagumpay</b> at <b>% Kumpleto</b> — tingnan sa ☰ → MGA TAGUMPAY',
    '🚔 Sa 5–6 na bituin, nagpapaputok na ang pulis ng rubber pellets',
  ] },
  { v: '1.2', title: 'Buhay na Lungsod', date: 'Nobyembre 2026', items: [
    '🌅 <b>Araw at gabi</b> — umiikot na ang oras (orasan sa itaas). Maliwanag sa umaga, may takipsilim, at gabi na may ilaw ng poste',
    '🌧 <b>Tag-ulan</b> — ulan, kidlat at kulog. Madulas ang daan at mas mahirap kang makita ng pulis',
    '🌊 <b>Baha</b> — lumalalim ang baha sa ilang kalye kapag malakas ang ulan; bumabagal ang sasakyan',
    '🚦 <b>Traffic lights</b> — humihinto na ang mga sasakyan sa pula',
    '🚗 <b>Rush hour</b> — mas maraming sasakyan tuwing 7–9 AM at 5–7 PM',
    '🥣 <b>Magtataho</b> sa umaga at 🥚 <b>magbabalut</b> sa gabi — bumili para dagdag buhay',
    '🏀 <b>Basketball courts</b> — may mga batang naglalaro sa araw',
    '🙏 <b>Simbahan ng Quiapo</b> — may mga nagdarasal sa plaza',
    '👮 <b>Traffic enforcers</b> sa malalaking kanto (nakakakita rin sila ng krimen!)',
    '🏝 <b>Isla Maligaya</b> — bagong isla sa Manila Bay na may baryo, resort, parola at dalampasigan',
    '⛴ <b>Ferry</b> papunta at pabalik sa isla (₱50) at 🛶 <b>bangka</b> na pwedeng i-drive',
    '🚤 <b>Police boats</b> — humahabol sa dagat kapag wanted ka',
    '☂️ Payong ng mga tao kapag umuulan, at 4 na bagong tip',
  ] },
  { v: '1.1', title: 'Musika at Mas Madaling Laruin', date: 'Nobyembre 2026', items: [
    '🎵 <b>Musika!</b> Title theme, lo-fi habang naglalakad, at habulan music na lumalakas habang dumarami ang bituin',
    '📻 <b>Radyo sa sasakyan</b> — HIMIG FM (OPM), BUDOTS 101 at KALYE RAP. Pindutin ang R o 📻 para magpalit',
    '🔁 <b>Checkpoint</b> — ULITIN ang misyon nang hindi inuulit ang usapan',
    '⚙️ <b>Mga Setting</b> — volume, hirap (Madali / Normal / Mahirap), graphics, laki ng joystick, kaliwete',
    '💡 <b>Mga tip</b> para sa mga bagong manlalaro',
    '🐞 Ayos: ang pagkabigo sa huling misyon ay hindi na nagpapakita ng ending',
  ] },
  { v: '1.0', title: 'Unang Labas', date: 'Nobyembre 2026', items: [
    '🏙 Ang lungsod ng Maynila — 16 na distrito, trapiko, jeepney, tricycle',
    '⭐ 6-star wanted system na may suspect clues at search zone',
    '📖 8 story missions, pasada, pagbebenta ng kotse, 20 Gintong Tsinelas',
  ] },
];

const UI = {
  talking: false, lines: [], lineT: 0, toasts: [], bigT: 0, last: {},
  init() {
    this.el = {};
    for (const id of ['weapon', 'tb-weap', 'tb-job', 'radio', 'tip', 'tip-title', 'tip-body', 'tb-radio', 'hud', 'objective', 'sidejob', 'stars', 'clues', 'wanted-note', 'money', 'vehname', 'minimap', 'hpbar', 'carbar', 'carbarwrap', 'speedo', 'kmh', 'arrest', 'arrestbar', 'prompt', 'subtitle', 'sub-name', 'sub-text', 'toasts', 'bigmsg', 'big-title', 'big-sub', 'touch', 'tb-b', 'tb-horn', 'tb-act', 'tb-fire', 'armorbar', 'armorwrap'])
      this.el[id] = $(id);
    this.el.stars.innerHTML = STAR_SVG.repeat(6);
    this.starEls = [...this.el.stars.querySelectorAll('.star')];
    this.el.clues.innerHTML = ['cam', 'clothes', 'face', 'car'].map(k => `<div class="clue unknown" data-k="${k}">?</div>`).join('');
    this.clueEls = [...this.el.clues.querySelectorAll('.clue')];
    this.mctx = this.el.minimap.getContext('2d');
    this.el.subtitle.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.nextLine(); });
    // menu buttons
    $('btn-new').onclick = () => { AUD.init(); AUD.resume(); this.openNewGame(); };
    $('ng-back').onclick = () => this.hide('newgame');
    $('ng-go').onclick = () => {
      if (G.hasSave() && !confirm('Magsisimula ng bagong laro. Papalitan ang Auto-save (ligtas ang Slot 1–3). Sigurado ka?')) return;
      SETTINGS.save(); this.hide('newgame'); G.newGame();
    };
    $('btn-load').onclick = () => { AUD.init(); SAVE.open('load'); };
    $('btn-psave').onclick = () => SAVE.open('save');
    $('btn-pload').onclick = () => SAVE.open('load');
    $('btn-slotclose').onclick = () => this.hide('slots');
    $('btn-pach').onclick = () => ACH.open();
    $('btn-mapall').onclick = () => { this.mapAll = !this.mapAll; AUD.click(); this.openMap(); };
    $('btn-photo').onclick = () => PHOTO.open();
    $('ph-close').onclick = () => PHOTO.close();
    $('ph-snap').onclick = () => PHOTO.snap();
    $('ph-frame').onclick = () => { PHOTO.frame = !PHOTO.frame; PHOTO.render(); AUD.click(); };
    $('ph-zoom').oninput = (e) => PHOTO.setZoom(+e.target.value);
    $('btn-achclose').onclick = () => this.hide('achievements');
    $('btn-shopclose').onclick = () => { this.hide('shop'); if ($('pause').classList.contains('hidden')) G.paused = false; };
    $('btn-continue').onclick = () => { AUD.init(); AUD.resume(); G.continueGame(); };
    $('btn-howto').onclick = () => this.show('help');
    $('t-lang').textContent = SETTINGS.lang === 'en' ? '🌐 Filipino' : '🌐 English';
    $('t-lang').onclick = () => I18N.set(SETTINGS.lang === 'en' ? 'fil' : 'en');
    $('set-dev').onclick = () => DEV.open();
    $('tut-ok').addEventListener('pointerdown', (e) => { e.stopPropagation(); TUT.next(); });
    $('tut-skip').addEventListener('pointerdown', (e) => { e.stopPropagation(); TUT.end(true); });
    $('btn-tut').onclick = () => { this.hide('help'); if (G.started) { this.hide('pause'); G.paused = false; TUT.start(); } else { this.hide('help'); this.openNewGame(); } };
    $('btn-version').onclick = () => this.openWhatsNew();
    $('btn-pnew').onclick = () => this.openWhatsNew();
    $('t-ver').textContent = `v${GAME_VERSION}`;
    $('btn-wnclose').onclick = () => { this.hide('whatsnew'); try { localStorage.setItem('harinkalsada_seenver', GAME_VERSION); } catch (e) { } };
    try { if (G.hasSave() && localStorage.getItem('harinkalsada_seenver') !== GAME_VERSION) this.openWhatsNew(); } catch (e) { }
    $('btn-settings').onclick = () => this.openSettings();
    $('btn-psettings').onclick = () => this.openSettings();
    $('btn-setclose').onclick = () => { this.hide('settings'); SETTINGS.save(); this.refreshTitle(); };
    $('set-resettips').onclick = () => { SETTINGS.seen = {}; SETTINGS.save(); AUD.click(); this.toast('Ipapakita ulit ang mga tip'); };
    $('tip-ok').addEventListener('pointerdown', (e) => { e.stopPropagation(); TIP.close(); });
    const bindRange = (id, key) => { const el = $(id); el.oninput = () => { SETTINGS[key] = el.value / 100; SETTINGS.apply(); }; };
    bindRange('set-music', 'music'); bindRange('set-sfx', 'sfx');
    document.querySelectorAll('#settings .seg').forEach(seg => {
      seg.querySelectorAll('button').forEach(b => b.onclick = () => {
        const key = seg.dataset.key; let v = b.dataset.v;
        if (key === 'lang') { I18N.set(v); this.syncSettings(); return; }
        if (key === 'walkMusic' || key === 'lefty' || key === 'tipsOn') v = v === '1';
        else if (key === 'joy') v = parseFloat(v);
        SETTINGS[key] = v; SETTINGS.apply(); SETTINGS.save(); AUD.click(); this.syncSettings();
      });
    });
    $('btn-hclose').onclick = () => { this.hide('help'); };
    $('btn-pause').onclick = () => G.pause(true);
    $('btn-map').onclick = () => this.openMap();
    $('btn-resume').onclick = () => G.pause(false);
    $('btn-pmap').onclick = () => this.openMap();
    $('btn-missions').onclick = () => this.openMissions();
    $('btn-phelp').onclick = () => this.show('help');
    $('btn-sound').onclick = () => { AUD.setOn(!AUD.on); $('btn-sound').textContent = 'TUNOG: ' + (AUD.on ? 'ON' : 'OFF'); };
    $('btn-quit').onclick = () => { G.save(); location.reload(); };
    $('btn-mapclose').onclick = () => { this.hide('mapscreen'); if (!$('pause').classList.contains('hidden')) return; G.paused = false; };
    $('btn-mclose').onclick = () => this.hide('missions');
    $('btn-endclose').onclick = () => { this.hide('ending'); G.paused = false; };
    this.refreshTitle();
    INPUT.init();
  },
  openWhatsNew(v) {
    v = v || CHANGES[0].v;
    $('vtabs').innerHTML = CHANGES.map((c, i) => `<button data-v="${c.v}" class="${c.v === v ? 'on' : ''}">v${c.v}${i === 0 ? '<span class="new">BAGO</span>' : ''}</button>`).join('');
    $('vtabs').querySelectorAll('button').forEach(b => b.onclick = () => { AUD.click(); this.openWhatsNew(b.dataset.v); });
    const c = CHANGES.find(x => x.v === v);
    $('vbody').innerHTML = `<h3>v${c.v} — ${c.title} <small>${c.date}</small></h3><ul>${c.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    this.show('whatsnew');
  },
  refreshTitle() {
    const l = SAVE.latest();
    $('btn-continue').classList.toggle('hidden', !l); $('btn-load').classList.toggle('hidden', !l); $('t-save').classList.toggle('hidden', !l);
    $('btn-new').classList.toggle('primary', !l); $('btn-new').classList.toggle('t-big', !l);
    if (l) {
      const d = SAVE.describe(l.data), pct = ACH.percentOf(l.data);
      $('t-save-l1').textContent = d.line1.replace(/ · \d+%$/, '');
      $('t-save-l2').textContent = `${pct}% kumpleto · ${d.line2}`;
      $('t-save-bar').style.width = pct + '%';
    }
  },
  openNewGame() {
    const opt = (key, val, ic, name, desc, rec) => `<button class="ng-opt ${SETTINGS[key] === val ? 'on' : ''}" data-k="${key}" data-v="${val}"><span class="ic">${ic}</span><b>${name}</b><small>${desc}</small>${rec ? '<span class="rec">REKOMENDADO</span>' : ''}</button>`;
    $('ng-diff').innerHTML = Object.entries(DIFFS).map(([k, d]) => opt('diff', k, d.icon, d.name, d.desc, k === 'madali')).join('');
    $('ng-drive').innerHTML = opt('drive', 'madali', '🧭', 'Madali', 'Ituro lang kung SAAN pupunta — kusang liliko, may tulong sa manibela at preno.', true)
      + opt('drive', 'classic', '🏎', 'Classic', 'Gas, preno at liko mismo (W/S/A/D). Para sa sanay na.');
    $('ng-ctl').innerHTML = opt('touchCtl', 'joystick', '🕹', 'Joystick', 'I-drag ang daliri kahit saan sa kaliwa ng screen.')
      + opt('touchCtl', 'dpad', '⬆️', 'Arrows', 'Apat na button ▲▼◀▶ — pindutin o i-slide.');
    document.querySelectorAll('#newgame .ctlrow').forEach(e => e.classList.toggle('hidden', !INPUT.touch));
    document.querySelectorAll('#newgame .ng-opt').forEach(b => b.onclick = () => { SETTINGS[b.dataset.k] = b.dataset.v; SETTINGS.apply(); AUD.click(); this.openNewGame(); });
    this.show('newgame');
  },
  // comic-strip cutscene: panels = [[art, caption], ...]
  comic(panels, done) {
    this.talking = true; G.paused = true;
    let i = 0;
    const strip = $('comic-strip');
    strip.innerHTML = panels.map(([art, cap], k) => `<div class="cpanel" style="--d:${k}"><div class="cart">${art}</div><div class="ccap">${cap}</div></div>`).join('');
    const cells = [...strip.children];
    const show = () => { cells.forEach((c, k) => c.classList.toggle('on', k <= i)); $('comic-next').textContent = i >= cells.length - 1 ? 'SIGE ▶' : 'TULOY ▶'; };
    $('comic-next').onclick = () => {
      AUD.click();
      if (i < cells.length - 1) { i++; show(); return; }
      this.hide('comic'); this.talking = false; G.paused = false; if (done) done();
    };
    show(); this.show('comic');
    AUD.tone(523, 0.2, 'triangle', 0.08); AUD.tone(659, 0.3, 'triangle', 0.08, 0, 0.15);
  },
  // story choice: opts = [{ label, desc }]
  choice(q, opts, cb) {
    G.paused = true;
    $('choice-q').textContent = q;
    $('choice-opts').innerHTML = opts.map((o, k) => `<button class="copt" data-k="${k}"><b>${o.label}</b><small>${o.desc}</small></button>`).join('');
    $('choice-opts').querySelectorAll('.copt').forEach(b => b.onclick = () => { this.hide('choice'); G.paused = false; AUD.success(); cb(+b.dataset.k); });
    this.show('choice');
  },
  openSettings() { this.syncSettings(); this.show('settings'); },
  syncSettings() {
    $('set-music').value = Math.round(SETTINGS.music * 100); $('set-sfx').value = Math.round(SETTINGS.sfx * 100);
    document.querySelectorAll('#settings .seg').forEach(seg => {
      const cur = SETTINGS[seg.dataset.key];
      seg.querySelectorAll('button').forEach(b => {
        const v = b.dataset.v;
        const on = typeof cur === 'boolean' ? (v === '1') === cur : String(cur) === v;
        b.classList.toggle('on', on);
      });
    });
  },
  radio(text, dur = 3) {
    if (!this.el) return;
    this.el.radio.textContent = text; this.el.radio.classList.remove('hidden');
    this.el.radio.style.animation = 'none'; void this.el.radio.offsetWidth; this.el.radio.style.animation = '';
    this.radioT = dur;
  },
  tip(title, body) {
    if (!title) { this.el.tip.classList.add('hidden'); return; }
    this.el['tip-title'].textContent = title; this.el['tip-body'].textContent = body;
    this.el.tip.classList.remove('hidden'); AUD.tone(880, 0.1, 'triangle', 0.08); AUD.tone(1320, 0.15, 'triangle', 0.08, 0, 0.1);
  },
  show(id) { $(id).classList.remove('hidden'); },
  hide(id) { $(id).classList.add('hidden'); },
  say(lines) {
    this.lines = lines.slice(); this.talking = this.lines.length > 0; this.lineT = 0;
    this.showLine();
  },
  showLine() {
    if (!this.lines.length) { this.talking = false; this.el.subtitle.classList.add('hidden'); return; }
    const [n, t] = this.lines[0];
    this.el['sub-name'].textContent = n; this.el['sub-text'].textContent = t;
    try { $('sub-face').src = PORTRAIT.get(n); $('sub-face').classList.remove('hidden'); } catch (e) { $('sub-face').classList.add('hidden'); }
    this.el.subtitle.classList.remove('hidden');
    this.lineT = 2.2 + t.length * 0.05;
  },
  nextLine() { if (!this.talking) return; this.lines.shift(); AUD.click(); this.showLine(); },
  toast(t) {
    if (this.toasts.some(x => x.t === t && x.life > 1)) return;
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = t;
    this.el.toasts.appendChild(d);
    this.toasts.push({ el: d, life: 3.2, t });
    if (this.toasts.length > 3) { const o = this.toasts.shift(); o.el.remove(); }
  },
  big(title, sub, dur = 2, cls) {
    const b = this.el.bigmsg;
    b.className = cls || (/BIGO|HULI|NAHIMATAY/.test(title) ? 'bad' : /TAPOS|NAKATAKAS/.test(title) ? 'good' : '');
    this.el['big-title'].textContent = title; this.el['big-sub'].textContent = sub || '';
    b.classList.remove('hidden');
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    this.bigT = dur;
  },
  flashStars() { const s = this.el.stars; s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash'); },
  set(key, el, prop, val) { if (this.last[key] !== val) { this.last[key] = val; el[prop] = val; } },
  update(dt) {
    const P = G.player;
    // dialog timing
    if (this.talking) { this.lineT -= dt; if (this.lineT <= 0) this.nextLine(); }
    // toasts
    for (const t of this.toasts) { t.life -= dt; if (t.life < 0.4) t.el.classList.add('out'); }
    this.toasts = this.toasts.filter(t => { if (t.life <= 0) { t.el.remove(); return false; } return true; });
    if (this.radioT > 0) { this.radioT -= dt; if (this.radioT <= 0) this.el.radio.classList.add('hidden'); }
    if (this.bigT > 0) { this.bigT -= dt; if (this.bigT <= 0) this.el.bigmsg.classList.add('hidden'); }
    // stars
    const W = WANTED;
    const cls = [];
    for (let i = 0; i < 6; i++) {
      let c = 'off';
      if (i < W.stars) c = W.mode === 'chase' ? 'on' : W.escaping ? 'escape' : 'search';
      cls.push(c);
    }
    const ck = cls.join();
    if (this.last.stars !== ck) { this.last.stars = ck; this.starEls.forEach((e, i) => e.setAttribute('class', 'star ' + cls[i])); }
    this.el.stars.classList.toggle('blink', W.mode === 'search');
    // clues
    const showClues = W.stars > 0;
    this.el.clues.classList.toggle('hidden', !showClues);
    if (showClues) {
      const cur = W.current();
      const states = [W.cctvT > 0 ? 'known' : 'unknown'];
      for (const k of ['clothes', 'face', 'car']) states.push(W.prof[k] === null ? 'unknown' : W.prof[k] === cur[k] ? 'known' : 'changed');
      const sk = states.join();
      if (this.last.clues !== sk) {
        this.last.clues = sk;
        this.clueEls.forEach((e, i) => {
          const k = e.dataset.k;
          e.className = 'clue ' + states[i] + (k === 'cam' ? ' cam' : '');
          e.innerHTML = states[i] === 'unknown' ? '?' : ICONS[k];
        });
      }
    }
    const note = W.stars === 0 ? '' : W.mode === 'chase' ? '' : W.escaping ? 'NAKAKALIMUTAN KA NA...' : 'NAGHAHANAP ANG PULIS — lumabas sa search zone';
    this.set('note', this.el['wanted-note'], 'textContent', note);
    // money + clock
    this.set('money', this.el.money, 'textContent', U.money(P.money));
    this.set('clock', $('clock'), 'textContent', `${WORLD.icon()} ${WORLD.timeStr()}`);
    const B = this.boss;
    $('bossbar').classList.toggle('hidden', !B);
    if (B) { const o = B.v || B.p, pct = B.v ? o.hp / o.maxhp : (B.p.ko ? 0 : o.hp / B.max); this.set('bossn', $('boss-name'), 'textContent', B.name); $('boss-hp').style.width = Math.max(0, Math.min(1, pct)) * 100 + '%'; }
    const evt = TYPHOON.banner() || FIESTA.banner();
    $('event').classList.toggle('hidden', !evt);
    this.set('evt', $('event'), 'textContent', evt);
    this.el.hpbar.style.width = Math.max(0, P.hp) + '%';
    this.el.hpbar.style.background = P.hp < 30 ? 'linear-gradient(90deg,#c0392b,#ff6b5a)' : '';
    const v = P.vehicle;
    this.el.carbarwrap.classList.toggle('hidden', !v);
    this.el.speedo.classList.toggle('hidden', !v);
    if (v) {
      this.el.carbar.style.width = Math.max(0, v.hp / v.maxhp * 100) + '%';
      this.set('kmh', this.el.kmh, 'textContent', String(Math.round(Math.abs(v.fwd()) / 14 * 3.6)));
      this.set('vn', this.el.vehname, 'textContent', `${v.t.name} · ${v.plate}${v.popped ? ' · 💥 butas' : ''}`);
    } else this.set('vn', this.el.vehname, 'textContent', '');
    // objective
    const obj = MS.objText();
    this.el.objective.classList.toggle('hidden', !obj);
    this.set('obj', this.el.objective, 'textContent', obj);
    this.set('weap', this.el.weapon, 'textContent', v ? (GUNS.driveGun() ? ARMS.label() : '') : ARMS.label());
    this.el.armorwrap.classList.toggle('hidden', !(P.armor > 0));
    if (P.armor > 0) this.el.armorbar.style.width = P.armor + '%';
    let side = JOBS.objText() || PASADA.objText();
    if (!side && JOBS.avail()) side = `💼 Pindutin ang ${INPUT.touch ? '💼' : 'J'} para sa side job: ${JOB_NAMES[JOBS.avail()]}`;
    if (!MS.active && !side && MS.idx < MISSIONS.length) {
      side = `Susunod na misyon: ${MISSIONS[MS.idx].title} — puntahan si ${CHARS[MISSIONS[MS.idx].giver].name} (${CHARS[MISSIONS[MS.idx].giver].name[0]} sa mapa)`;
      const gp = MS.giverPOI(MISSIONS[MS.idx]);
      if (gp && SUGBO.in(gp.x) && !SUGBO.in(P.x)) side += ' · ✈️ Sumakay ng eroplano sa Paliparan (Pasay)';
    }
    this.el.sidejob.classList.toggle('hidden', !side);
    this.set('side', this.el.sidejob, 'textContent', side);
    // arrest meter
    this.el.arrest.classList.toggle('hidden', P.arrest < 0.05);
    this.el.arrestbar.style.width = (P.arrest * 100) + '%';
    // prompt
    const pr = G.promptText();
    this.el.prompt.classList.toggle('hidden', !pr);
    if (pr) this.set('prompt', this.el.prompt, 'innerHTML', (INPUT.touch ? '' : '<kbd>E</kbd>') + pr);
    // touch button labels
    if (INPUT.touch) {
      this.set('tbb', this.el['tb-b'], 'textContent', v ? 'PRENO' : ({ fists: 'SUNTOK', pamalo: 'PALO', tirador: 'TIRA', watergun: 'BASA', pistola: 'BARIL', shotgun: 'BARIL', smg: 'BARIL', riple: 'BARIL', granada: 'HAGIS' })[P.weapon] || 'SUNTOK');
      this.el['tb-horn'].classList.toggle('hidden', !v);
      this.el['tb-fire'].classList.toggle('hidden', !(v && GUNS.driveGun()));
      this.el['tb-radio'].classList.toggle('hidden', !v);
      const owned = Object.keys(P.weapons || {}).length;
      this.el['tb-weap'].classList.toggle('hidden', !!v || owned < 2);
      this.el['tb-job'].classList.toggle('hidden', !(JOBS.active || JOBS.avail()));
      this.set('tba', this.el['tb-act'], 'textContent', MS.canRetry() ? 'ULITIN' : pr ? (v && !G.shopNear ? 'BABA' : 'GAMIT') : v ? 'BABA' : 'SAKAY');
    }
    this.drawMinimap();
  },
  drawMinimap() {
    const g = this.mctx, S = 200, R = 100, P = G.player;
    const range = P.vehicle ? 1500 : 1000;
    const k = R / range;
    g.save();
    g.clearRect(0, 0, S, S);
    g.beginPath(); g.arc(R, R, R, 0, TAU); g.clip();
    g.fillStyle = '#0d111b'; g.fillRect(0, 0, S, S);
    g.translate(R, R);
    g.imageSmoothingEnabled = false;
    g.drawImage(MAP.mini, -P.x * k, -P.y * k, MW * T * k, MH * T * k);
    const W = WANTED;
    if (W.stars > 0 && W.mode === 'search') {
      g.fillStyle = W.escaping ? 'rgba(255,90,60,0.12)' : 'rgba(140,110,255,0.22)';
      g.strokeStyle = W.escaping ? 'rgba(255,90,60,0.7)' : 'rgba(170,140,255,0.9)'; g.lineWidth = 2;
      g.fillRect((W.lastX - W.zone - P.x) * k, (W.lastY - W.zone - P.y) * k, W.zone * 2 * k, W.zone * 2 * k);
      g.strokeRect((W.lastX - W.zone - P.x) * k, (W.lastY - W.zone - P.y) * k, W.zone * 2 * k, W.zone * 2 * k);
    }
    // GPS
    if (G.gpsPath && G.gpsPath.length > 1) {
      g.strokeStyle = '#c86bff'; g.lineWidth = 4; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      G.gpsPath.forEach(([tx, ty], i) => { const x = ((tx + 0.5) * T - P.x) * k, y = ((ty + 0.5) * T - P.y) * k; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke();
    }
    // POIs
    g.font = '13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const key in MAP.pois) {
      const p = MAP.pois[key]; if (p.type === 'npc' || p.type === 'spot') continue;
      const x = (p.x - P.x) * k, y = (p.y - P.y) * k;
      if (x * x + y * y > (R - 8) * (R - 8)) continue;
      if (MS.freeShops && !['ukay', 'barber', 'paint'].includes(p.type)) continue;
      g.fillText(p.icon, x, y);
    }
    if (KUTA.on()) for (const kt of KUTA.defs()) {
      if (KUTA.cleared(kt.key)) continue;
      const x = (kt.x - P.x) * k, y = (kt.y - P.y) * k;
      if (x * x + y * y < (R - 8) * (R - 8)) g.fillText('☠️', x, y);
    }
    for (const p of G.peds) if (p.kind === 'goon' && !p.ko && p.hostile) {
      const x = (p.x - P.x) * k, y = (p.y - P.y) * k;
      if (x * x + y * y < (R - 6) * (R - 6)) { g.fillStyle = '#ff4040'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
    }
    // cops
    const blink = Math.floor(G.time * 4) % 2;
    for (const v of G.vehicles) {
      if (!v.isCop || !v.driver || v.dead) continue;
      const x = (v.x - P.x) * k, y = (v.y - P.y) * k;
      if (x * x + y * y > R * R) continue;
      g.fillStyle = v.siren ? (blink ? '#ff4040' : '#4080ff') : '#7aa0ff';
      g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill();
    }
    for (const h of W.helis) { const x = (h.x - P.x) * k, y = (h.y - P.y) * k; g.fillStyle = blink ? '#ff4040' : '#4080ff'; g.fillRect(x - 4, y - 4, 8, 8); }
    // target
    const t = G.target;
    if (t) {
      let x = (t.x - P.x) * k, y = (t.y - P.y) * k;
      const d = Math.hypot(x, y);
      if (d > R - 10) { x = x / d * (R - 10); y = y / d * (R - 10); }
      g.fillStyle = '#ffd23f'; g.strokeStyle = '#000'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.stroke();
      if (t.letter) { g.fillStyle = '#000'; g.font = 'bold 10px sans-serif'; g.fillText(t.letter, x, y + 0.5); }
    }
    // north + player
    g.rotate(P.a);
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(9, 0); g.lineTo(-6, -6); g.lineTo(-3, 0); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText('N', R, 12);
  },
  openMap() {
    G.paused = true;
    this.show('mapscreen');
    const c = $('bigmap'), g = c.getContext('2d');
    const pr = Math.min(2, devicePixelRatio || 1);
    // show the region you're in (Luzon or Sugbo) unless "whole map" is on
    const inS = G.player.x > (PROV_END + 6) * T, all = this.mapAll;
    const cx0 = all ? 0 : inS ? PROV_END - 30 : 0, cw = all ? MW : inS ? MW - cx0 : PROV_END + 6;
    this.mapView = { cx0, cw };
    $('btn-mapall').textContent = all ? '🔍 Rehiyon ko' : '🗺 Buong mapa';
    const cssW = Math.min(innerWidth * 0.96, innerHeight * 0.74 * cw / MH);
    const sz = cssW * pr, szH = sz * MH / cw;
    c.width = sz; c.height = szH;
    c.style.width = cssW + 'px'; c.style.height = (cssW * MH / cw) + 'px';
    const k = sz / (cw * T);
    g.imageSmoothingEnabled = false;
    g.drawImage(MAP.mini, cx0, 0, cw, MH, 0, 0, sz, szH);
    g.save(); g.translate(-cx0 * T * k, 0);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${Math.round(sz / 48)}px Nunito, sans-serif`;
    for (const l of MAP.labels) {
      g.save(); g.translate(l.x * k, l.y * k); if (l.vert) g.rotate(-Math.PI / 2);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(l.name, 1, 1); g.fillStyle = l.vert ? 'rgba(140,190,255,0.8)' : 'rgba(255,255,255,0.75)'; g.fillText(l.name, 0, 0);
      g.restore();
    }
    g.font = `${Math.round(sz / 36)}px sans-serif`;
    for (const key in MAP.pois) { const p = MAP.pois[key]; if (p.type === 'npc' || p.type === 'spot') continue; g.fillText(p.icon, p.x * k, p.y * k); }
    if (KUTA.on()) for (const kt of KUTA.defs()) if (!KUTA.cleared(kt.key)) g.fillText('☠️', kt.x * k, kt.y * k);
    for (const s of MAP.tsinelas) if (!G.tsinelas.has(s.id)) {
      g.fillStyle = '#ffd23f'; g.strokeStyle = '#5a4300'; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(s.x * k, s.y * k, sz / 260, sz / 150, 0.4, 0, TAU); g.fill(); g.stroke();
    }
    const W = WANTED;
    if (W.stars > 0 && W.mode === 'search') { g.strokeStyle = 'rgba(170,140,255,0.9)'; g.lineWidth = 2; g.strokeRect((W.lastX - W.zone) * k, (W.lastY - W.zone) * k, W.zone * 2 * k, W.zone * 2 * k); }
    if (G.gpsPath && G.gpsPath.length > 1) {
      g.strokeStyle = '#c86bff'; g.lineWidth = 3; g.beginPath();
      G.gpsPath.forEach(([tx, ty], i) => { const x = (tx + 0.5) * T * k, y = (ty + 0.5) * T * k; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    }
    const t = G.target;
    if (t) { g.fillStyle = '#ffd23f'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(t.x * k, t.y * k, sz / 70, 0, TAU); g.fill(); g.stroke(); if (t.letter) { g.fillStyle = '#000'; g.font = `bold ${Math.round(sz / 70)}px sans-serif`; g.fillText(t.letter, t.x * k, t.y * k); } }
    const P = G.player;
    g.save(); g.translate(P.x * k, P.y * k); g.rotate(P.a); const s = sz / 60;
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(s, 0); g.lineTo(-s * 0.7, -s * 0.7); g.lineTo(-s * 0.3, 0); g.lineTo(-s * 0.7, s * 0.7); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.restore();
    // tap the map to set a GPS waypoint
    c.onclick = (e) => {
      const r = c.getBoundingClientRect(), wx = (cx0 + (e.clientX - r.left) / r.width * cw) * T, wy = (e.clientY - r.top) / r.height * MH * T;
      G.setWaypoint({ x: wx, y: wy }, '📍 Napiling lugar');
    };
    this.renderPlaces();
  },
  // place finder under the big map: tap → GPS to the nearest one
  renderPlaces() {
    const P = G.player, el = $('places');
    const have = new Set(Object.values(MAP.pois).map(p => p.type));
    const rows = PLACES.filter(([t]) => have.has(t)).map(([t, ic, name]) => `<button data-t="${t}">${ic} ${name}</button>`);
    el.innerHTML = `<b>📍 HANAPIN:</b>` + rows.join('') + (G.waypoint ? `<button data-t="clear" class="clr">✕ Alisin ang GPS</button>` : '');
    el.querySelectorAll('button').forEach(b => b.onclick = () => {
      AUD.click();
      if (b.dataset.t === 'clear') { G.waypoint = null; UI.toast('📍 Inalis ang GPS'); this.hide('mapscreen'); G.paused = false; return; }
      let best = null, bd = 1e18;
      for (const k in MAP.pois) { const p = MAP.pois[k]; if (p.type !== b.dataset.t) continue; const d = U.d2(p.x, p.y, P.x, P.y); if (d < bd) { bd = d; best = p; } }
      if (best) G.setWaypoint(best, `${best.icon} ${best.label}`);
    });
  },
  openPause() {
    this.show('pause');
    const done = Math.min(MS.idx, MISSIONS.length);
    $('pause-stats').innerHTML = [
      ['MISYON', `${done} / ${MISSIONS.length}`], ['PERA', U.money(G.player.money)],
      ['GINTONG TSINELAS', `${G.tsinelas.size} / ${MAP.tsinelas.length}`], ['NABENTANG KOTSE', G.stats.sold],
      ['PASADA', G.stats.pasada], ['NAKATAKAS SA PULIS', G.stats.escapes],
      ['ARI-ARIAN', `${ECON.owned.size} / ${PROPS.length}`], ['KUMPLETO', `${ACH.percent()}%`],
    ].map(([a, b]) => `<div><span>${a}</span>${b}</div>`).join('');
    const W = WANTED, cur = W.current();
    const card = (k, ic, label) => {
      if (k === 'cam') return `<div class="card ${W.cctvT > 0 ? '' : 'q'}"><span class="ic">${W.cctvT > 0 ? '📹' : '?'}</span>${label}</div>`;
      const v = W.prof[k];
      if (v === null) return `<div class="card q"><span class="ic">?</span>${label}</div>`;
      return `<div class="card ${v === cur[k] ? '' : 'x'}"><span class="ic">${ic}</span>${label}</div>`;
    };
    $('suspect-board').innerHTML = W.stars > 0
      ? `<div class="tag">SUSPECT</div><div class="row">${card('cam', '📹', 'CCTV')}${card('clothes', '👕', 'DAMIT')}${card('face', '🙂', 'MUKHA')}${card('car', '🚗', 'SASAKYAN')}</div>`
      : `<div class="tag">SUSPECT</div><div style="font-weight:800;font-size:13px">Malinis ka. Walang naghahanap sa iyo.</div>`;
  },
  openMissions() {
    this.show('missions');
    let ch = 0;
    $('mission-list').innerHTML = MISSIONS.map((m, i) => {
      let head = '';
      if (m.chapter !== ch) { ch = m.chapter; head = `<div class="dev-ch">KABANATA ${ch}: ${ch === 1 ? 'MAYNILA' : ch === 2 ? 'PROBINSYA (SAN ISIDRO)' : 'SUGBO'}</div>`; }
      const st = i < MS.idx ? 'done' : i === MS.idx ? 'next' : 'locked';
      const label = st === 'done' ? '✓ TAPOS' : st === 'next' ? (MS.active === m ? 'GINAGAWA' : 'SUSUNOD') : '🔒';
      return head + `<div class="mrow ${st}"><div class="num">${i + 1}</div><div class="info"><b>${m.title}</b><small>${st === 'locked' ? '???' : m.desc + ' · ' + CHARS[m.giver].name + ' · ' + U.money(m.reward)}</small></div><div class="st">${label}</div></div>`;
    }).join('');
  },
  ending(kind = 'ch1') {
    G.paused = true;
    const E = {
      ch1: ['TAPOS ANG KABANATA 1!', 'Naibalik ang ayuda sa mga tao. Nakulong si Mayor Kurakot at si Boss Tikboy. Pero may sulat mula sa probinsya... BUKAS NA ANG KABANATA 2 — puntahan si Tito Boy!'],
      ch2a: ['🌾 BAYANI NG SAN ISIDRO!', 'Nakulong si Don Severo at nabawi ng mga magsasaka ang kanilang lupa (Ending A). Pero may tawag mula sa Sugbo... BUKAS NA ANG KABANATA 3 — puntahan si Tito Boy!'],
      ch2b: ['💰 ANG PRESYO', 'Mayaman ka na, pero nawalan ng lupa ang San Isidro (Ending B). May pagkakataon ka pang ituwid ito... BUKAS NA ANG KABANATA 3 — puntahan si Tito Boy!'],
      final: FINAL.ending(),
    }[kind] || [];
    $('end-title').textContent = E[0]; $('end-text').textContent = E[1];
    $('end-choices').innerHTML = kind === 'final' ? FINAL.summary() : '';
    $('end-stats').innerHTML = [
      ['PERA', U.money(G.player.money)], ['TSINELAS', `${G.tsinelas.size}/${MAP.tsinelas.length}`], ['NAKATAKAS', G.stats.escapes], ['NABENTA', G.stats.sold],
    ].map(([a, b]) => `<div><span>${a}</span>${b}</div>`).join('');
    this.show('ending');
  },
};

// ===== Input =====
const INPUT = {
  keys: {}, joy: { x: 0, y: 0, mag: 0, active: false, id: null, cx: 0, cy: 0 }, bHeld: false, touch: false,
  init() {
    addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
      this.keys[e.code] = true;
      if (this.touch && !e.repeat) this.setTouch(false);
      if (e.repeat) return;
      AUD.resume();
      G.onKey(e.code);
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch && matchMedia('(pointer: coarse)').matches) this.setTouch(true);
    addEventListener('touchstart', () => { if (!this.touch) this.setTouch(true); AUD.resume(); }, { passive: true });
    // joystick
    const zone = $('joyzone'), base = $('joybase'), knob = $('joyknob');
    const R = 55;
    const move = (x, y) => {
      let dx = x - this.joy.cx, dy = y - this.joy.cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      this.joy.x = dx / R; this.joy.y = dy / R; this.joy.mag = Math.min(1, d / R);
    };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault(); AUD.init(); AUD.resume();
      this.joy.active = true; this.joy.id = e.pointerId;
      const r = zone.getBoundingClientRect();
      this.joy.cx = e.clientX; this.joy.cy = e.clientY;
      base.style.left = (e.clientX - r.left) + 'px'; base.style.top = (e.clientY - r.top) + 'px';
      base.classList.add('active'); zone.setPointerCapture(e.pointerId);
      move(e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', (e) => { if (this.joy.active && e.pointerId === this.joy.id) move(e.clientX, e.clientY); });
    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.active = false; this.joy.x = this.joy.y = this.joy.mag = 0; knob.style.transform = '';
      base.classList.remove('active');
    };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    // D-pad (arrow buttons): slide your thumb around; diagonals allowed
    const dp = $('dpad');
    const dpMove = (e) => {
      const r = dp.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const t = r.width * 0.14, k = this.keys;
      k.ArrowLeft = dx < -t; k.ArrowRight = dx > t; k.ArrowUp = dy < -t; k.ArrowDown = dy > t;
      dp.querySelector('.up').classList.toggle('on', k.ArrowUp); dp.querySelector('.down').classList.toggle('on', k.ArrowDown);
      dp.querySelector('.left').classList.toggle('on', k.ArrowLeft); dp.querySelector('.right').classList.toggle('on', k.ArrowRight);
    };
    dp.addEventListener('pointerdown', (e) => { e.preventDefault(); AUD.init(); AUD.resume(); this.dpId = e.pointerId; dp.setPointerCapture(e.pointerId); dpMove(e); });
    dp.addEventListener('pointermove', (e) => { if (e.pointerId === this.dpId) dpMove(e); });
    const dpEnd = (e) => { if (e.pointerId === this.dpId) this.releaseDpad(); };
    dp.addEventListener('pointerup', dpEnd); dp.addEventListener('pointercancel', dpEnd);
    const btn = (id, down, up) => {
      const b = $(id);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); AUD.init(); AUD.resume(); b.classList.add('pressed'); down(); b.setPointerCapture(e.pointerId); });
      const u = (e) => { b.classList.remove('pressed'); if (up) up(); };
      b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u);
    };
    btn('tb-act', () => G.action());
    btn('tb-b', () => { this.bHeld = true; if (!G.player.vehicle) ARMS.attack(); }, () => { this.bHeld = false; });
    btn('tb-horn', () => G.horn());
    btn('tb-fire', () => { this.fireHeld = true; GUNS.trigger(false); }, () => { this.fireHeld = false; });
    btn('tb-radio', () => MUSIC.nextStation());
    btn('tb-weap', () => ARMS.cycle());
    btn('tb-job', () => JOBS.toggle());
    // desktop click on canvas resumes audio
    addEventListener('pointerdown', () => { AUD.init(); AUD.resume(); });
    for (const ev of ['touchend', 'click', 'keydown']) addEventListener(ev, () => AUD.unlock(), { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') AUD.resume(); });
  },
  releaseDpad() {
    this.dpId = null;
    for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) this.keys[k] = false;
    document.querySelectorAll('#dpad .dp').forEach(d => d.classList.remove('on'));
  },
  setTouch(v) { this.touch = v; document.body.classList.toggle('touch', v); if (G.started) $('touch').classList.toggle('hidden', !v); },
  state() {
    const k = this.keys;
    const up = k.KeyW || k.ArrowUp, dn = k.KeyS || k.ArrowDown, lf = k.KeyA || k.ArrowLeft, rt = k.KeyD || k.ArrowRight;
    const anyKey = up || dn || lf || rt;
    const s = { mx: 0, my: 0, run: !!(k.ShiftLeft || k.ShiftRight), throttle: 0, steer: 0, hand: !!k.Space || this.bHeld, brake: false, joy: this.joy, touchDrive: false, touch: this.touch };
    if (this.joy.active && !anyKey) { s.mx = this.joy.x; s.my = this.joy.y; s.touchDrive = true; }
    else { s.mx = (rt ? 1 : 0) - (lf ? 1 : 0); s.my = (dn ? 1 : 0) - (up ? 1 : 0); const m = Math.hypot(s.mx, s.my); if (m > 1) { s.mx /= m; s.my /= m; } }
    if (!anyKey && this.touch) s.touchDrive = true;
    // easy driving on keyboard: keys point where you want to go (screen direction)
    if (anyKey && SETTINGS.drive === 'madali' && G.player && G.player.vehicle) {
      const m = Math.hypot(s.mx, s.my) || 1;
      s.touchDrive = true; s.joy = { x: s.mx / m, y: s.my / m, mag: 1 };
    }
    s.throttle = (up ? 1 : 0) - (dn ? 1 : 0);
    s.steer = (rt ? 1 : 0) - (lf ? 1 : 0);
    return s;
  },
};
