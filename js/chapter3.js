'use strict';
// ===== KABANATA 3: CEBU — the smuggling syndicate of Kapitan Tiburon =====
Object.assign(CHARS, {
  bebing: { name: 'Inday Bebing', look: { skin: '#c68b59', shirt: '#e67e22', pat: 'floral', outfit: 'npc', hair: 'long', hairCol: '#2b1d14', pants: '#3b3b3b' } },
  dodong: { name: 'Dodong', look: { skin: '#a86b3c', shirt: '#2e86c1', pat: 'jersey', outfit: 'npc', hair: 'cap_blue', hairCol: '#111', pants: '#1f2633' } },
  tiburon: { name: 'Kapitan Tiburon', look: { skin: '#d9a066', shirt: '#f0f0f0', pat: 'plain', outfit: 'npc', hair: 'bald', hairCol: '#111', pants: '#1d2a3a' } },
  pating: { name: 'Tauhan ni Tiburon', look: { skin: '#9a5f35', shirt: '#1d2a3a', pat: 'plain', outfit: 'npc', hair: 'buzz', hairCol: '#111', pants: '#1f2633' } },
});
Object.assign(PORTRAIT.extras, { 'Inday Bebing': { earrings: true }, 'Dodong': {}, 'Kapitan Tiburon': { shades: true, chain: true, mustache: true } });
const sg = () => MAP.sugbo;
const tp = (tx, ty) => ({ x: tx * T, y: ty * T });   // tile → world point
const STRAIT = () => { const x = PROV_END; return [[x + 11, 15], [x + 7, 45], [x + 12, 75], [x + 13, 98], [x + 7, 128], [x + 12, 160], [x + 12, 186]].map(([a, b]) => tp(a, b)); };

// armed syndicate members (use the gang AI from guns.js); hostile right away during missions
function spawnPating(c, cx, cy, n, spread, opt = {}) {
  c.pating = c.pating || [];
  for (let k = 0; k < n; k++) {
    let x, y, tries = 0;
    do { x = cx + U.rand(-spread, spread); y = cy + U.rand(-spread, spread); tries++; } while (MAP.solidAt(x, y) && tries < 40);
    const p = new Person(x, y, 'goon', Object.assign({}, CHARS.pating.look));
    p.keep = true; p.home = { x, y }; p.hp = 100; p.gunCd = U.rand(0.8, 2); p.mgoon = true; p.hostile = !!opt.hostile; p.umb = null;
    p.weapon = k % 3 === 0 ? 'shotgun' : k % 3 === 1 ? 'smg' : 'pistola';
    G.peds.push(p); c.pating.push(p);
  }
  return c.pating;
}
function spawnBoss(c, x, y, name, look, hp) {
  const p = new Person(x, y, 'goon', Object.assign({}, look));
  p.keep = true; p.home = { x, y }; p.hp = hp; p.gunCd = 1; p.mgoon = true; p.hostile = true; p.umb = null; p.toughness = 5; p.weapon = 'shotgun'; p.name = name; p.boss = true;
  G.peds.push(p); (c.pating = c.pating || []).push(p);
  return p;
}
function boatGoon(c, near, target) {
  const pts = STRAIT();
  for (let k = 0; k < 12; k++) {
    const p = U.choice(pts), d = U.dist(p.x, p.y, near.x, near.y);
    if (d < 500 || d > 1500 || TRAFFIC.inView(p.x, p.y, 60)) continue;
    const v = new Vehicle('lancha', p.x, p.y, Math.atan2(near.y - p.y, near.x - p.x), { color: '#1d2a3a' });
    v.driver = 'ai'; v.mission = true; v.goon = true; v.criminal = true; v.maxhp = v.hp = 120;
    v.ai = new GoonDriver(v, target); G.vehicles.push(v); (c.boats = c.boats || []).push(v); return v;
  }
  return null;
}
const ch2pera = () => G.flags.ch2 === 'pera';

MISSIONS.push(
  { // 15
    id: 'biyahe-sugbo', title: 'Biyahe sa Cebu', giver: 'tito', reward: 2000, chapter: 3,
    desc: 'Lumipad papuntang Cebu at hanapin si Inday Bebing.',
    cp: { stage: 3, pos: () => MAP.pois.airport_s },
    stages: [
      comic([
        ['🌊🚢📦', 'Sa daungan ng Cebu, gabi-gabi may dumarating na mga bangkang walang ilaw...'],
        ['🦈🕶️💰', 'Si KAPITAN TIBURON — ang hari ng smuggling sa Kabisayaan. Sa kanya dumadaan ang maruming pera ng mga kurakot.'],
        ['✈️🏝️🔥', 'KABANATA 3: CEBU'],
      ]),
      {
        obj: '', enter() {
          UI.say(ch2pera() ? [
            ['Tito Boy', 'Nonoy... alam ko ang ginawa mo sa probinsya. Hindi ako galit — pero may pagkakataon kang ituwid ito.'],
            ['Tito Boy', 'Ang pinsan kong si Inday Bebing sa Cebu, ginigipit ng sindikato ni Kapitan Tiburon. Sa kanya rin dumaan ang pera ni Don Severo.'],
            [N, 'Kung ganoon... baka ako ang makapagpabagsak sa kanila. Pupunta ako.'],
            ['Tito Boy', 'Heto ang tiket ng eroplano. Nasa Paliparan sa timog ng Pasay. Ingat, pamangkin.'],
          ] : [
            ['Tito Boy', 'Nonoy! Bayani ka ng San Isidro! Pero may tumawag sa akin — ang pinsan kong si Inday Bebing sa Cebu.'],
            ['Tito Boy', 'Ginigipit daw ang lechonan niya ng sindikato ni Kapitan Tiburon. Sa kanya rin dumaan ang pera nina Mayor Kurakot at Don Severo!'],
            [N, 'Kung ganoon, siya ang ugat ng lahat. Pupunta ako sa Cebu.'],
            ['Tito Boy', 'Heto ang tiket ng eroplano — libre, regalo ko. Nasa Paliparan sa timog ng Pasay.'],
          ]);
        }, update: () => !UI.talking,
      },
      {
        obj: 'Pumunta sa ✈️ Paliparan ng Manila (timog ng Pasay)', target: () => MAP.pois.airport_m,
        update(c) {
          if (SUGBO.in(G.player.x)) return true;
          if (!near(MAP.pois.airport_m, 90) || c.flying) return false;
          if (WANTED.stars > 0) { if (!c.warned) { c.warned = true; UI.toast('✈️ Iwala muna ang pulis bago pumasok sa paliparan!'); } return false; }
          c.flying = true; FLY.go(MAP.pois.airport_s, () => { c.landed = true; });
          return false;
        },
      },
      { obj: 'Hanapin ang lechonan ni Inday Bebing sa Kolon', target: () => MAP.pois.bebing, update: () => near(MAP.pois.bebing, 110) },
      talk([
        ['Inday Bebing', 'Ikaw na ba si Nonoy? Maayong pag-abot, Dong! (Maligayang pagdating!) Ang gwapo mo pala, parang si Tito Boy noong bata pa.'],
        ['Inday Bebing', 'Kaon sa ta! (Kain muna tayo!) Lechon ng Cebu — walang sarsa, kasi lami na! (masarap na!)'],
        ['Inday Bebing', 'Pero seryoso, Dong... Ang mga tauhan ni Kapitan Tiburon, pinagbabayad ako ng "proteksyon" linggo-linggo. Kung hindi, susunugin daw ang tindahan ko.'],
        [N, 'Hindi ako papayag, Tiya. Tutulungan kita.'],
        ['Inday Bebing', 'Salamat kaayo! (Maraming salamat!) Kausapin mo muna ang pamangkin kong si Dodong — habal-habal driver siya, kilala niya ang buong Cebu.'],
      ]),
    ],
  },
  { // 16
    id: 'habal-habal', title: 'Habal-Habal', giver: 'dodong', reward: 2500, chapter: 3,
    desc: 'Mag-habal-habal kasama si Dodong para makilala ang Cebu.',
    cp: { stage: 1, pos: () => MAP.pois.dodong },
    stages: [
      talk([
        ['Dodong', 'Uy, ikaw si Nonoy! Taga-Manila, ha? Diri sa Cebu, motor ang hari — habal-habal ang tawag namo! (namin!)'],
        ['Dodong', 'Sakay ka sa motor ko. Ihatid mo ang tatlong pasahero. Para makabisado mo ang lungsod — pati ang daan paakyat sa Busay!'],
      ]),
      {
        obj: 'Sumakay sa habal-habal ni Dodong',
        enter(c) { const d = MAP.pois.dodong; c.m = laneSpawn('motor', d.x + 60, d.y, 0, { color: '#2e86c1' }); c.n = 0; c.trips = [[MAP.pois.plazakrus, { x: MAP.pois.tops.x, y: MAP.pois.tops.y + 40 }], [MAP.pois.sg_sari, MAP.pois.airport_s], [{ x: MAP.pois.ferry_sg.x + 230, y: MAP.pois.ferry_sg.y }, { x: (sg().VX[3] + 2) * T, y: (sg().HY[1] + 2) * T }]]; },
        target: (c) => c.m, update(c) { if (c.m.dead) return 'Nasira ang motor ni Dodong!'; return G.player.vehicle === c.m; },
      },
      {
        obj: (c) => c.stage === 'drop' ? `Ihatid ang pasahero ⏱ ${Math.max(0, Math.ceil(c.time))}s (${c.n}/3)` : `Sunduin ang pasahero (${c.n}/3)`,
        target: (c) => G.player.vehicle !== c.m ? c.m : Object.assign({ stop: true }, c.trips[c.n][c.stage === 'drop' ? 1 : 0]),
        update(c, dt) {
          if (c.m.dead) return 'Nasira ang motor ni Dodong!';
          if (G.player.vehicle !== c.m) return false;
          const [a, b] = c.trips[c.n];
          if (c.stage !== 'drop') {
            if (!c.waiting) waitingPeds(c, a, 1);
            if (stopAt(c.m, a, 90, c, 'h', 0.6)) { removePeds(c.waiting); c.waiting = null; c.stage = 'drop'; c.time = Math.round(U.dist(a.x, a.y, b.x, b.y) / 260 + 25); AUD.door(); UI.say([['Pasahero', U.choice(['Bai, paspas lang ha! (Bilisan mo lang, ha!)', 'Dong, sa Tops ta! Ang ganda ng view doon!', 'Amping sa pagdrive! (Ingat sa pagmamaneho!)'])]]); }
            return false;
          }
          c.time -= dt;
          if (c.time <= 0) return 'Na-late ka — bumaba ang pasahero!';
          if (stopAt(c.m, b, 100, c, 'h', 0.6)) { c.n++; c.stage = null; G.addMoney(80, true); UI.toast('🛵 Salamat kaayo! +₱80'); return c.n >= 3; }
        },
      },
      talk([
        ['Dodong', 'Maayo kaayo! (Ang galing!) Kabisado mo na ang Cebu, Nonoy!'],
        ['Dodong', 'May sasabihin ako... tuwing gabi, may mga bangkang walang ilaw sa pantalan. Diretso sa bodega ni Tiburon. Walang pulis na pumapansin.'],
        ['Dodong', 'Kung may litrato tayo, may maipapakita tayo sa media. Kausapin mo si Tiya Bebing.'],
      ]),
    ],
  },
  { // 17
    id: 'mata-sa-pantalan', title: 'Mata sa Pantalan', giver: 'bebing', reward: 3500, chapter: 3,
    desc: 'Pumasok sa pantalan sa gabi at kuhanan ng litrato ang kontrabando.',
    cp: { stage: 1, pos: () => ({ x: (SX0 + 18) * T, y: (sg().HY[3] + 2) * T }) },
    stages: [
      talk([
        ['Inday Bebing', 'Delikado ito, Dong. Pero kailangan natin ng ebidensya. Kuhanan mo ng litrato ang tatlong kargamento sa labas ng bodega ni Tiburon.'],
        ['Inday Bebing', 'Gabi ka pumunta. May mga bantay — tingnan mo ang dilaw nilang tingin, huwag kang magpapakita.'],
      ]),
      {
        obj: 'Pumunta sa pantalan malapit sa bodega ni Tiburon (gabi)', target: () => ({ x: (SX0 + 18) * T, y: (sg().HY[3] + 2) * T }),
        enter() { const h = WORLD.hour(); if (h > 5 && h < 20.5) { WORLD.clock = 21.5 * 60; UI.toast('🌙 Hinintay mo ang gabi...'); } },
        update: () => near({ x: (SX0 + 18) * T, y: (sg().HY[3] + 2) * T }, 260),
      },
      {
        obj: (c) => WANTED.stars > 0 ? 'Nakita ka! Tumakas o magtago — tapos bumalik' : `📸 Kuhanan ng litrato ang kontrabando (${c.n || 0}/3) — tumigil sa tabi ng marker`,
        enter(c) {
          const X = SX0, y0 = sg().HY[3] + RW;
          c.n = 0; c.shots = [tp(X + 2.6, y0 + 15), tp(X + 10.6, y0 + 15.2), tp(X + 11.4, y0 + 1.6)];
          c.guards = [];
          for (const r of [[[X + 4, y0 + 11.5], [X + 9, y0 + 11.5]], [[X + 12.6, y0 + 4], [X + 12.6, y0 + 9]], [[X + 2.4, y0 + 2], [X + 2.4, y0 + 8]]]) {
            const p = new Person(r[0][0] * T, r[0][1] * T, 'cop', Object.assign({}, CHARS.pating.look)); p.role = 'guard'; p.keep = true; p.boss = 'Kapitan Tiburon'; p.sight = 200;
            p.patrol = r.map(([x, y]) => tp(x, y)); G.peds.push(p); c.guards.push(p);
          }
          for (const s of c.shots) { const b = new Vehicle('van', s.x + 30, s.y, 0, { color: '#5b5f66', parked: true }); b.mission = true; b.locked = true; (c.props = c.props || []).push(b); }
        },
        target: (c) => WANTED.stars > 0 || !c.shots ? null : Object.assign({ stop: true }, c.shots[c.n]),
        update(c, dt) {
          const P = G.player, s = c.shots[c.n];
          if (WANTED.stars > 0 || P.vehicle) { c.h = 0; return false; }
          if (U.dist(P.x, P.y, s.x, s.y) < 55 && P.moveAmt < 0.15) {
            c.h = (c.h || 0) + dt;
            if (c.h > 1.2) {
              c.h = 0; c.n++; G.fadeFlash(); AUD.tone(1800, 0.05, 'square', 0.06); AUD.noise(0.12, 0.15, 3000, 0.05, 'highpass');
              UI.toast(`📸 Click! (${c.n}/3)`);
              if (c.n >= 3) { UI.big('📸 MAY EBIDENSYA NA!', 'Umalis sa pantalan nang tahimik', 2, 'good'); return true; }
            }
          } else c.h = 0;
        },
      },
      {
        obj: () => WANTED.stars > 0 ? 'Takasan ang mga bantay at pulis!' : 'Lumayo sa pantalan', target: () => WANTED.stars > 0 ? null : MAP.pois.bebing,
        update: () => WANTED.stars === 0 && !near({ x: (SX0 + 7) * T, y: (sg().HY[3] + 12) * T }, 900),
      },
      talk([
        ['Inday Bebing', 'Kitang-kita! Mga kahon ng bigas na may tatak ng ayuda... at mga baril! Ito pala ang negosyo ni Tiburon.'],
        ['Dodong', 'May balita ako — ngayong gabi, may ihahatid silang kargamento sakay ng speedboat. Kung mahahabol natin...'],
      ]),
    ],
    done(c) { removePeds(c.guards); if (c.props) for (const v of c.props) v.remove = true; },
  },
  { // 18
    id: 'habol-sa-dagat', title: 'Habol sa Dagat', giver: 'dodong', reward: 4000, chapter: 3,
    desc: 'Habulin ang speedboat ng mga smuggler sa kipot.',
    cp: { stage: 1, pos: () => MAP.pois.ferry_sg },
    stages: [
      talk([
        ['Dodong', 'Nasa pier ang speedboat ng tiyo ko. Sakay na! Ang bangka ng smuggler — itim, walang ilaw. Banggain mo o barilin hanggang tumigil!'],
      ]),
      {
        obj: 'Sumakay sa speedboat sa pier', enter(c) { const s = sg().piers[1]; c.boat = laneSpawn('lancha', s.x + 30, s.y - 100, Math.PI); },
        target: (c) => c.boat, update(c) { if (c.boat.dead) return 'Nasira ang speedboat!'; return G.player.vehicle === c.boat; },
      },
      {
        obj: (c) => `Pahintuin ang bangka ng smuggler! 🚤 ${c.t ? Math.max(0, Math.round(c.t.hp / c.t.maxhp * 100)) : 100}%`,
        enter(c) {
          const pts = STRAIT(), st = pts[1];
          c.t = laneSpawn('lancha', st.x, st.y, Math.PI / 2, { color: '#14161b' }); c.t.driver = 'ai'; c.t.criminal = true; c.t.maxhp = c.t.hp = 260;
          c.t.ai = new PathDriver(c.t, pts.slice(2).concat(pts.slice(0, 2)), { cruise: 320, loop: true, solid: true });
          UI.boss = { name: '🚤 Smuggler', v: c.t }; UI.toast('🚤 Ayun sila! Habulin!');
        },
        target: (c) => G.player.vehicle === c.boat ? c.t : c.boat,
        update(c) {
          if (c.boat.dead) return 'Nasira ang speedboat mo!';
          if (c.t.dead || c.t.hp <= 0) { UI.boss = null; UI.big('🚤 NAPAHINTO!', 'Nakuha ang kargamento', 2, 'good'); return true; }
          if (U.dist(c.t.x, c.t.y, G.player.x, G.player.y) > 2600) return 'Nakatakas ang smuggler!';
        },
      },
      talk([
        ['Dodong', 'Tan-awa! (Tingnan mo!) May mga kahon ng pera at isang listahan — mga pangalan ng mga pulitikong binabayaran ni Tiburon!'],
        [N, 'Ito ang kailangan natin. Pero siguradong galit na galit na si Tiburon.'],
      ]),
    ],
    done(c) { UI.boss = null; if (c.t) { c.t.mission = false; c.t.criminal = false; } if (c.boat) c.boat.mission = false; },
  },
  { // 19
    id: 'bagyong-agila', title: 'Bagyong Agila', giver: 'bebing', reward: 4500, chapter: 3,
    desc: 'Sagipin ang mga tao sa baha habang may bagyo sa Cebu.',
    cp: { stage: 1, pos: () => MAP.pois.bebing },
    stages: [
      talk([
        ['Inday Bebing', 'Dong! Signal No. 4 — Bagyong Agila! Binaha ang mga kalye malapit sa pantalan!'],
        ['Inday Bebing', 'Gamitin mo ang multicab ko. Dalhin mo ang mga tao sa Evacuation Center sa Plaza Krus!'],
      ]),
      {
        obj: 'Sumakay sa multicab ni Inday Bebing',
        enter(c) {
          if (!TYPHOON.s) TYPHOON.start(true);
          TYPHOON.s.phase = 'storm'; TYPHOON.s.t = 320; TYPHOON.s.signal = 4; TYPHOON.s.name = 'Bagyong Agila'; WORLD.flood = Math.max(WORLD.flood, 0.6);
          const b = MAP.pois.bebing; c.car = laneSpawn('multicab', b.x + 90, (sg().HY[2] + 1) * T, 0, { color: '#16a085' }); c.car.maxhp = c.car.hp = 240;
          const X = SX0, H = sg().HY;
          c.groups = [tp(X + 14, H[3] + 2), tp(X + 30, H[4] + 2), tp(X + 46, H[5] + 2), tp(X + 24, H[5] + 2)].map(pt => { const g = {}; waitingPeds(g, pt, 3); for (const p of g.waiting) p.umb = null; return { pt, peds: g.waiting }; });
          c.load = 0; c.saved = 0;
        },
        target: (c) => c.car, update(c) { if (c.car.dead) return 'Nasira ang multicab!'; return G.player.vehicle === c.car; },
      },
      {
        obj: (c) => !c.groups ? '' : c.load >= 6 || (c.load > 0 && !c.groups.some(g => g.peds.length)) ? `Dalhin sa ⛺ Evacuation Center (sakay: ${c.load}/6) · Ligtas: ${c.saved}/12` : `Sagipin ang mga nasa baha (sakay: ${c.load}/6) · Ligtas: ${c.saved}/12`,
        target: (c) => {
          if (!c.groups) return null;
          if (G.player.vehicle !== c.car) return c.car;
          const left = c.groups.filter(g => g.peds.length);
          if (c.load >= 6 || (c.load > 0 && !left.length)) return Object.assign({ stop: true }, MAP.pois.evac_sg);
          const P = G.player; return left.length ? Object.assign({ stop: true }, left.reduce((a, b) => U.d2(a.pt.x, a.pt.y, P.x, P.y) < U.d2(b.pt.x, b.pt.y, P.x, P.y) ? a : b).pt) : null;
        },
        update(c, dt) {
          if (c.car.dead) return 'Nasira ang multicab!';
          if (G.player.vehicle !== c.car) return false;
          for (const g of c.groups) for (const p of g.peds) p.wave += dt * 3;
          for (const g of c.groups) {
            if (!g.peds.length || c.load >= 6) continue;
            if (stopAt(c.car, g.pt, 110, g, 'h', 0.8)) { const n = Math.min(6 - c.load, g.peds.length); removePeds(g.peds.splice(0, n)); c.load += n; AUD.door(); UI.toast(`🛟 ${n} ang naisakay! (${c.load}/6)`); }
          }
          if (c.load > 0 && stopAt(c.car, MAP.pois.evac_sg, 160, c, 'he', 0.8)) { c.saved += c.load; G.stats.rescued = (G.stats.rescued || 0) + c.load; UI.toast(`⛺ ${c.load} ang ligtas na!`); c.load = 0; AUD.success(); }
          return c.saved >= 12;
        },
      },
      talk([
        ['Inday Bebing', 'Ligtas silang lahat! Salamat kaayo, Dong!'],
        ['Dodong', 'Pero tingnan mo ito — ang mga relief goods para sa mga nasalanta, nakita kong isinasakay ng mga tauhan ni Tiburon sa armored van! Ibebenta nila!'],
        ['Inday Bebing', 'Walang hiya! Bukas ang Pista sa Cebu. Siguradong gagamitin nila ang parada para itago ang van...'],
      ]),
    ],
    done(c) { if (c.groups) for (const g of c.groups) removePeds(g.peds); if (c.car) c.car.mission = false; if (TYPHOON.s) TYPHOON.s.t = Math.min(TYPHOON.s.t, 20); },
  },
  { // 20
    id: 'pista-sugbo', title: 'Pista sa Cebu', giver: 'bebing', reward: 5000, chapter: 3,
    desc: 'Sundan ang armored van sa gitna ng parada at agawin ito.',
    cp: { stage: 1, pos: () => MAP.pois.plazakrus },
    stages: [
      talk([
        ['Inday Bebing', 'Pista Señor na! Sayaw, tambol, karosa... at sa gitna ng parada, ang armored van ni Tiburon.'],
        ['Inday Bebing', 'Sundan mo — pero HUWAG kang lalapit nang husto, mahahalata ka. At huwag mo ring mawala sa paningin.'],
      ]),
      {
        obj: (c) => `Sundan ang armored van ${c.v && U.dist(c.v.x, c.v.y, G.player.x, G.player.y) < 150 ? '· ⚠ MASYADONG MALAPIT!' : '· ✓ Tamang layo'}`,
        enter(c) {
          const s = sg(), X = SX0;
          FIESTA.spawnParade([{ x: s.cx(1), y: s.cy(1) }, { x: s.cx(3), y: s.cy(1) }, { x: s.cx(3), y: s.cy(2) }, { x: s.cx(1), y: s.cy(2) }], MAP.pois.plazakrus);
          const path = [{ x: s.cx(2) + LO, y: s.cy(2) + 120 }, { x: s.cx(2) + LO, y: s.cy(3) - LO }, { x: s.cx(1) + LO, y: s.cy(3) - LO }, { x: s.cx(1) - LO, y: s.cy(4) - LO }, { x: s.cx(0) + LO, y: s.cy(4) + LO }, { x: (X + 6) * T, y: s.cy(4) + LO }, { x: (X + 7) * T, y: (s.HY[3] + RW + 14) * T }];
          c.v = laneSpawn('armored', s.cx(2) + LO, s.cy(2) + 40, Math.PI / 2); c.v.driver = 'ai'; c.v.criminal = true;
          c.v.ai = new PathDriver(c.v, path, { cruise: 130, solid: true }); c.v.maxhp = c.v.hp = 900;
          c.close = 0;
        },
        target: (c) => c.v,
        update(c, dt) {
          const P = G.player, me = P.vehicle || P, d = U.dist(c.v.x, c.v.y, me.x, me.y);
          c.close = d < 150 ? c.close + dt : Math.max(0, c.close - dt);
          if (c.close > 3) return 'Nahalata ka ng mga tauhan ni Tiburon!';
          if (d > 1100) return 'Nawala ang armored van!';
          if (c.v.dead) return 'Nasira ang van — nasunog ang ebidensya!';
          return c.v.ai.finished && U.dist(c.v.x, c.v.y, c.v.ai.pts[c.v.ai.pts.length - 1].x, c.v.ai.pts[c.v.ai.pts.length - 1].y) < 120;
        },
      },
      {
        obj: 'Agawin ang armored van!',
        enter(c) { FIESTA.endParade(); c.v.driver = null; c.v.ai = null; spawnPating(c, c.v.x, c.v.y - 40, 3, 60, { hostile: true }); UI.toast('🔫 May mga bantay ang van!'); },
        target: (c) => c.v, update(c) { if (c.v.dead) return 'Nasira ang van!'; return G.player.vehicle === c.v; },
      },
      {
        obj: () => 'Dalhin ang van sa lechonan ni Inday Bebing!',
        enter() { WANTED.setStars(3); WANTED.spotted('cop', 100); },
        target: () => Object.assign({ stop: true }, MAP.pois.lechon_sg),
        update(c) { if (c.v.dead) return 'Nasira ang van!'; if (G.player.vehicle === c.v && stopAt(c.v, MAP.pois.lechon_sg, 150, c, 'h')) { WANTED.clear(false); return true; } },
      },
      talk([
        ['Inday Bebing', 'Ang mga relief goods! Ibabalik natin ito sa mga nasalanta. Ikaw talaga, Dong!'],
        ['Dodong', 'Nag-text si Tiburon: "Bukas ng gabi, sa bodega. Pumunta ka kung matapang ka, taga-Manila."'],
      ]),
    ],
    done(c) { FIESTA.endParade(); removePeds(c.pating); if (c.v) { c.v.mission = false; c.v.criminal = false; } },
  },
  { // 21
    id: 'kuta-ni-tiburon', title: 'Kuta ni Tiburon', giver: 'dodong', reward: 6000, chapter: 3,
    desc: 'Lusubin ang bodega ni Tiburon at kunin ang ledger.',
    cp: { stage: 2, pos: () => ({ x: (SX0 + 18) * T, y: (sg().HY[4] + 2) * T }) },
    stages: [
      {
        obj: '', enter() {
          const P = G.player, lines = [['Dodong', 'Ito na, Nonoy. Nasa loob ng bodega ang LEDGER — ang listahan ng lahat ng binayaran ni Tiburon.']];
          if (!GUNS.owned('pistola')) { P.weapons.pistola = 48; P.mags.pistola = 12; lines.push(['Dodong', 'Wala kang baril? Heto — pinadala ni Kabo mula Manila. Pistola at bala.']); }
          if ((P.armor || 0) < 100) { P.armor = 100; lines.push(['Dodong', 'At isuot mo itong bulletproof vest. Amping! (Ingat!)']); }
          if (ch2pera()) lines.push(['Inday Bebing (sa telepono)', 'Dong! Nakita ko si Don Severo na pumasok sa bodega! Magkasosyo pala sila ni Tiburon — mas maraming bantay ngayon!']);
          else { P.weapons.granada = (P.weapons.granada || 0) + 3; lines.push(['Lola Isyang (sa telepono)', 'Apo! Pinadalhan ka ng mga magsasaka ng San Isidro ng "pasalubong" — tatlong granada! At tumawag si Kapitana Luz sa NBI: naka-abang sila sa labas.']); }
          UI.say(lines);
        }, update: () => !UI.talking,
      },
      { obj: 'Pumunta sa bodega ni Tiburon sa pantalan', target: () => ({ x: (SX0 + 18) * T, y: (sg().HY[4] + 2) * T }), update: () => near({ x: (SX0 + 18) * T, y: (sg().HY[4] + 2) * T }, 300) },
      {
        obj: (c) => `Talunin ang mga tauhan ni Tiburon (${c.pating ? c.pating.filter(p => !p.ko).length : 0} natitira)`,
        enter(c) {
          const X = SX0, y0 = sg().HY[3] + RW;
          c.noCops = true;
          spawnPating(c, (X + 7) * T, (y0 + 12) * T, ch2pera() ? 8 : 6, 190, { hostile: true });
          if (ch2pera()) { c.don = spawnBoss(c, (X + 7) * T, (y0 + 15) * T, 'Don Severo', CHARS.severo.look, 260); UI.boss = { name: '👔 Don Severo', p: c.don, max: 260 }; }
          UI.toast('🔫 Lusob!');
        },
        target: (c) => { if (!c.pating) return null; const live = c.pating.filter(p => !p.ko); return live.length ? live.reduce((a, b) => U.d2(a.x, a.y, G.player.x, G.player.y) < U.d2(b.x, b.y, G.player.x, G.player.y) ? a : b) : null; },
        update(c) { if (c.pating && c.pating.every(p => p.ko)) { UI.boss = null; return true; } },
      },
      { obj: 'Pumasok sa bodega at kunin ang LEDGER', target: () => MAP.pois.sg_bodega, update() { if (!G.player.vehicle && near(MAP.pois.sg_bodega, 60)) { UI.big('📒 NAKUHA ANG LEDGER!', '', 2, 'good'); AUD.cash(); return true; } } },
      talk(() => ch2pera() ? [
        ['Don Severo', 'Ugh... ikaw... na binayaran ko ng ₱30,000... ngayon ako ang ibinagsak mo...'],
        [N, 'Ang perang iyon, ibabalik ko sa San Isidro. Tapos na ang mga araw mo, Don.'],
        ['Dodong', 'NONOY! Si Tiburon — tumatakas sakay ng yate niya! Dala ang lahat ng pera!'],
      ] : [
        ['Dodong', 'Ang daming pangalan sa ledger... Mayor Kurakot, Don Severo, mga konsehal, mga hepe...'],
        ['Dodong', 'NONOY! Si Tiburon — tumatakas sakay ng yate niya! Dala ang lahat ng pera!'],
      ]),
    ],
    done(c) { UI.boss = null; removePeds(c.pating); },
  },
  { // 22
    id: 'hari-ng-dagat', title: 'Hari ng Dagat', giver: 'bebing', reward: 20000, chapter: 3,
    desc: 'Ang huling habulan: pabagsakin ang yate ni Kapitan Tiburon.',
    cp: { stage: 1, pos: () => MAP.pois.ferry_sg },
    stages: [
      talk([
        ['Inday Bebing', 'Dong, nasa pier ang pinakamabilis na speedboat sa Cebu. Habulin mo si Tiburon bago siya makalabas ng kipot!'],
        ['Kapitan Tiburon (sa radyo)', 'Hahaha! Taga-Manila, akala mo kaya mo ako? Ako ang HARI NG DAGAT! Mga bata — lunurin siya!'],
      ]),
      {
        obj: 'Sumakay sa speedboat', enter(c) { const s = sg().piers[1]; c.boat = laneSpawn('lancha', s.x + 30, s.y - 100, Math.PI, { color: '#c0392b' }); c.boat.maxhp = c.boat.hp = 200; },
        target: (c) => c.boat, update(c) { if (c.boat.dead) return 'Nasira ang speedboat!'; return G.player.vehicle === c.boat; },
      },
      {
        obj: (c) => `Pabagsakin ang yate ni Tiburon! 🛥 ${c.y ? Math.max(0, Math.round(c.y.hp / c.y.maxhp * 100)) : 100}%`,
        enter(c) {
          const pts = STRAIT(), st = pts[3];
          c.y = laneSpawn('yate', st.x, st.y, Math.PI / 2, { color: '#1d2a3a' }); c.y.driver = 'ai'; c.y.criminal = true; c.y.maxhp = c.y.hp = 600;
          c.y.ai = new PathDriver(c.y, pts.slice(4).concat(pts.slice(0, 4)), { cruise: 290, loop: true, solid: true });
          UI.boss = { name: '🦈 Kapitan Tiburon', v: c.y }; c.t = 0; c.spawned = 0;
        },
        target: (c) => G.player.vehicle === c.boat ? c.y : c.boat,
        update(c, dt) {
          c.t += dt;
          if (c.boat.dead) return 'Nalunod ang speedboat mo!';
          const alive = (c.boats || []).filter(v => !v.dead && !v.remove);
          if (c.spawned < (ch2pera() ? 6 : 4) && alive.length < 2 && c.t > 3 + c.spawned * 6) { if (boatGoon(c, G.player, () => G.player.vehicle || G.player)) { c.spawned++; UI.toast('🚤 Mga tauhan ni Tiburon!'); } }
          if (c.y.hp < c.y.maxhp * 0.1 && !c.y.invuln) { c.y.invuln = true; c.y.hp = c.y.maxhp * 0.1; c.y.ai = null; c.y.driver = null; c.y.throttle = 0; UI.boss = null; UI.big('🛥 SUMUKO SI TIBURON!', '', 2.2, 'good'); for (const v of alive) { v.ai = null; v.driver = null; } return true; }
          if (c.y.dead) { c.y.dead = false; c.y.burn = 0; c.y.hp = c.y.maxhp * 0.1; }
        },
      },
      talk([
        ['Kapitan Tiburon', 'Sige na, sige na! Suko na ako! Pero bata... may alok ako. Ang ledger na hawak mo — ibigay mo sa akin, at sa iyo ang kalahati ng yaman ko. ₱100,000!'],
        ['Kapitan Tiburon', 'Isipin mo — kasama ka na sa listahan ng mga makapangyarihan. Ikaw na ang tunay na Hari ng Kalsada... at ng Dagat.'],
      ]),
      {
        obj: 'Magpasya...', target: () => null,
        update(c) {
          if (c.picked) return !UI.talking;
          if (c.asked) return false;
          c.asked = true;
          UI.choice('Ano ang gagawin mo sa ledger ni Tiburon?', [
            { label: '📰 Ilantad sa publiko', desc: 'Ibigay sa media at sa NBI. Lahat ng kurakot sa listahan — mananagot. Walang pera para sa iyo.' },
            { label: '💰 Tanggapin ang alok (₱100,000)', desc: 'Itago ang ledger at maging bahagi ng sindikato. Mayaman — pero ikaw na ang bagong Tiburon.' },
          ], (k) => {
            G.flags.ch3 = k === 0 ? 'ilantad' : 'itago';
            if (k === 1) { G.addMoney(100000, true); UI.say([['Kapitan Tiburon', 'Hahaha! Matalino ka, bata. Maligayang pagdating sa pamilya.']]); }
            else UI.say([['Inday Bebing', 'Dong... salamat. Ngayong gabi, malaya na ang Cebu. At sa wakas, mananagot ang lahat.']]);
            c.picked = true;
          });
        },
      },
      { obj: '', enter() { UI.comic(FINAL.panels()); }, update: () => !UI.talking },
    ],
    done(c, ok) {
      UI.boss = null;
      if (c.boats) for (const v of c.boats) { v.mission = false; v.criminal = false; }
      if (c.y) { c.y.mission = false; c.y.invuln = false; }
      if (ok) { G.flags.final = (G.flags.ch2 === 'pera' ? 'B' : 'A') + (G.flags.ch3 === 'itago' ? 'D' : 'C'); setTimeout(() => UI.ending('final'), 600); }
    },
  },
);
MISSIONS.forEach(m => { m.chapter = m.chapter || 1; });

// the final ending brings together the choices from Chapter 2 and Chapter 3
const FINAL = {
  ending() {
    return {
      AC: ['👑 ANG TUNAY NA HARI NG KALSADA', 'Ibinigay mo ang lupa sa bayan at inilantad mo ang mga kurakot. Ito ang TUNAY NA WAKAS — ang Hari ng Kalsada ay naglilingkod sa bayan. Pero may isa pang pangalan sa ledger... BUKAS NA ANG KABANATA 4 — puntahan si Inday Bebing sa Cebu!'],
      AD: ['🦈 ANG BAGONG TIBURON', 'Bayani ka ng San Isidro, pero pinili mo ang pera ng sindikato. Maglaro ulit (Developer Mode o ibang Slot) para makita ang ibang wakas.'],
      BC: ['🙏 PAGBABALIK-LOOB', 'Nagkamali ka sa probinsya, pero itinuwid mo sa Cebu. Hindi pa huli ang lahat para maging tama. Subukan din ang ibang mga pagpili!'],
      BD: ['💰 HARI NG WALA', 'Ikaw na ang pinakamayaman sa tatlong lungsod — pero nawala ang lahat ng nagmamahal sa iyo. Maglaro ulit para makita ang ibang wakas.'],
    }[this.key()];
  },
  summary() {
    const a = G.flags.ch2 === 'pera' ? '💰 Ibinenta ang titulo' : '🤝 Ibinigay sa bayan', b = G.flags.ch3 === 'itago' ? '💰 Tinanggap ang alok' : '📰 Inilantad ang ledger';
    return `<div><span>KABANATA 2</span>${a}</div><div><span>KABANATA 3</span>${b}</div><div><span>WAKAS</span>${{ AC: '👑 Tunay na Wakas', AD: '🦈 Ang Bagong Tiburon', BC: '🙏 Pagbabalik-loob', BD: '💰 Hari ng Wala' }[this.key()]}</div>`;
  },
  key() { return (G.flags.ch2 === 'pera' ? 'B' : 'A') + (G.flags.ch3 === 'itago' ? 'D' : 'C'); },
  panels() {
    const k = this.key();
    const P = {
      AC: [['📰📒⚖️', 'Lumabas sa balita ang ledger ni Tiburon. Isa-isang inaresto ang mga nasa listahan.'], ['🏙️🌾🏝', 'Manila, San Isidro, Cebu — malaya na sa mga kurakot. Pista sa tatlong lugar!'], ['👵👨‍🦳🧑‍🍳🛵', 'Lola Isyang, Tito Boy, Inday Bebing at Dodong — iisang pamilya, iisang mesa.'], ['👑', 'TUNAY NA WAKAS: "Ang Hari ng Kalsada ay naglilingkod sa bayan."']],
      AD: [['💰🛥️', 'Tinanggap mo ang alok ni Tiburon. Bayani ng San Isidro... na ngayon ay may lihim.'], ['👵📞', '"Apo, bakit hindi ka na tumatawag?" — Lola Isyang'], ['🦈👑', 'WAKAS: "Ang Bagong Tiburon." Mayaman, makapangyarihan... at mag-isa.']],
      BC: [['📰📒⚖️', 'Inilantad mo ang ledger — pati ang sarili mong pangalan, ang bayad ni Don Severo.'], ['🌾🔙', 'Ibinalik mo ang ₱30,000 sa mga magsasaka ng San Isidro. Unti-unti, pinatawad ka ni Lola.'], ['👵❤️', 'WAKAS: "Pagbabalik-loob." Hindi pa huli ang lahat para maging tama.']],
      BD: [['💰💰🛥️', 'Pera ni Don Severo, pera ni Tiburon... ikaw na ang pinakamayaman sa tatlong lungsod.'], ['🏚️😶', 'Pero wala nang tumatawag sa iyo ng "apo", "pamangkin" o "Dong".'], ['🦈', 'WAKAS: "Hari ng Wala." Nabili mo ang lahat — maliban sa pamilya.']],
    };
    return P[k];
  },
};
