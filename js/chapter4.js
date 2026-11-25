'use strict';
// ===== KABANATA 4: DABAW — the forest, the eagles and the last name in the ledger =====
Object.assign(CHARS, {
  maya: { name: 'Ate Maya', look: { skin: '#a86b3c', shirt: '#4b5a32', pat: 'plain', outfit: 'npc', hair: 'cap_blue', hairCol: '#1b1410', pants: '#3b3b3b' } },
  islaw: { name: 'Mang Islaw', look: { skin: '#9a5f35', shirt: '#f1c40f', pat: 'sando', outfit: 'npc', hair: 'bucket', hairCol: '#222', pants: '#4a3b2a' } },
  ninong: { name: 'Ninong', look: { skin: '#e0b07a', shirt: '#2b211c', pat: 'barong', outfit: 'npc', hair: 'bald', hairCol: '#111', pants: '#111' } },
  lagari: { name: 'Tauhan ni Ninong', look: { skin: '#a86b3c', shirt: '#3c4f2a', pat: 'plain', outfit: 'npc', hair: 'cap_red', hairCol: '#111', pants: '#2b2b2b' } },
});
Object.assign(PORTRAIT.extras, { 'Ate Maya': { earrings: true }, 'Mang Islaw': { mustache: true, wrinkles: true }, 'Ninong': { shades: true, chain: true, mustache: true } });
VT.logtruck = { name: 'Trak ng Troso', L: 104, W: 38, max: 400, acc: 260, brake: 760, grip: 8, steer: 2.0, mass: 3, hp: 260, cruise: 200, value: 500, draw: 'logs', color: '#6b4a2b' };
const dw = () => MAP.dabaw;
const tookBribe = () => G.flags.ch3 === 'itago';
function dabawGoonCar(c, near, target, minD = 600, maxD = 1200) {
  for (let k = 0; k < 20; k++) {
    const p = U.choice(dw().pts), d = U.dist(p.x, p.y, near.x, near.y);
    if (d < minD || d > maxD || TRAFFIC.inView(p.x, p.y, 60)) continue;
    const v = new Vehicle('mayor', p.x, p.y, Math.atan2(near.y - p.y, near.x - p.x), { color: '#2b3a20' });
    v.driver = 'ai'; v.mission = true; v.goon = true; v.criminal = true; v.maxhp = v.hp = 150;
    v.ai = new GoonDriver(v, target); G.vehicles.push(v); (c.goons = c.goons || []).push(v); return v;
  }
  return null;
}
// keep a vehicle alive at low health so it can be "caught" instead of exploding
function holdAlive(v, frac = 0.08) { if (v.hp < v.maxhp * frac) { v.hp = v.maxhp * frac; v.dead = false; v.burn = 0; return true; } return false; }

MISSIONS.push(
  { // 23
    id: 'lipad-dabaw', title: 'Lipad sa Dabaw', giver: 'bebing', reward: 3000, chapter: 4,
    desc: 'Lumipad sa Dabaw at kilalanin si Ate Maya.',
    cp: { stage: 3, pos: () => MAP.pois.airport_d },
    stages: [
      comic([
        ['📒🔍', 'May isang pangalan sa ledger ni Tiburon na hindi pa nahuhuli... "NINONG".'],
        ['🌲🪓🦅', 'Sa Dabaw, unti-unting nauubos ang gubat ng Bundok Apo — at nawawala ang mga agila.'],
        ['🦅🏔️🍈', 'KABANATA 4: DABAW'],
      ]),
      talk(() => [
        ['Inday Bebing', 'Dong, may tumawag kay Dodong — si Ate Maya, ranger sa Sentro ng Agila sa Dabaw.'],
        ['Inday Bebing', 'May sindikato raw ng ilegal na pagtotroso doon. Ang amo nila? Isang tinatawag na "NINONG" — ang huling pangalan sa ledger ni Tiburon!'],
        ...(tookBribe() ? [[N, '(Tinanggap ko ang pera ni Tiburon... pero hindi pa huli para gumawa ng tama.)']] : [[N, 'Tapusin na natin ito. Para sa gubat, para sa mga agila.']]),
        ['Inday Bebing', 'Lumipad ka mula sa Paliparan ng Sugbo. Amping, Dong!'],
      ]),
      {
        obj: 'Pumunta sa ✈️ Paliparan ng Sugbo at lumipad papuntang Dabaw', target: () => MAP.pois.airport_s,
        update(c) {
          if (DABAW.in(G.player.x)) return true;
          if (c.flying) return false;
          if (near(MAP.pois.airport_s, 90) || near(MAP.pois.airport_m, 90)) {
            if (WANTED.stars > 0) { if (!c.w) { c.w = true; UI.toast('✈️ Iwala muna ang pulis bago pumasok sa paliparan!'); } return false; }
            c.flying = true; FLY.go(MAP.pois.airport_d);
          }
          return false;
        },
      },
      { obj: 'Puntahan si Ate Maya sa 🦅 Sentro ng Agila', target: () => MAP.pois.maya, update: () => near(MAP.pois.maya, 110) },
      talk([
        ['Ate Maya', 'Madayaw nga pag-abot! (Maligayang pagdating!) Ikaw si Nonoy? Kilala ka na ng buong Pilipinas!'],
        ['Ate Maya', 'Tingnan mo ang bundok — gabi-gabi may mga trak ng troso na bumababa. At may mga agila kaming nawawala.'],
        ['Ate Maya', 'Ang tawag nila sa amo nila: "Ninong". Walang nakakakita sa mukha niya. Tulungan mo kami, Nonoy.'],
      ]),
    ],
  },
  { // 24
    id: 'durian-express', title: 'Durian Express', giver: 'maya', reward: 3500, chapter: 4,
    desc: 'Mag-deliver ng durian para kumita ang Sentro — at makilala ang Dabaw.',
    cp: { stage: 1, pos: () => MAP.pois.maya },
    stages: [
      talk([
        ['Ate Maya', 'Kailangan namin ng pondo. Ihatid mo ang mga durian ng kooperatiba sa tatlong kostumer — gamit ang pickup.'],
        ['Ate Maya', 'Babala: matapang ang amoy. Huwag kang hihimatayin! At dahan-dahan — kapag nabangga, mababasag ang durian.'],
      ]),
      {
        obj: 'Sumakay sa pickup na may durian',
        enter(c) { const m = MAP.pois.maya; c.car = laneSpawn('pickup', m.x - 120, (dw().HY[1] + 1) * T, Math.PI, { color: '#7fb800' }); c.car.cargo = 3; c.car.maxhp = c.car.hp = 220; c.n = 0; c.stops = [MAP.pois.durian, MAP.pois.dw_hospital, { x: dw().cx(0) + 120, y: dw().cy(3) - LO }]; },
        target: (c) => c.car, update(c) { if (c.car.dead) return 'Nasira ang pickup — sayang ang durian!'; return G.player.vehicle === c.car; },
      },
      {
        obj: (c) => `Ihatid ang durian (${c.n}/3) · 🍈 ${c.car ? Math.max(0, Math.round(c.car.hp / c.car.maxhp * 100)) : 100}% buo`,
        enter(c) { c.time = 0; UI.toast('🍈 Grabe ang amoy! Bilisan na!'); },
        target: (c) => G.player.vehicle !== c.car ? c.car : Object.assign({ stop: true }, c.stops[c.n]),
        update(c) {
          if (c.car.dead || c.car.hp < c.car.maxhp * 0.3) return 'Nabasag ang mga durian!';
          if (G.player.vehicle !== c.car) return false;
          if (stopAt(c.car, c.stops[c.n], 110, c, 'h', 0.8)) {
            c.n++; c.car.cargo = 3 - c.n; G.addMoney(150, true); AUD.coin();
            UI.say([['Kostumer', U.choice(['Lami kaayo! (Ang sarap!) Salamat, Dong!', 'Amoy-impyerno, lasang-langit! Hahaha!', 'Ay, bakit ka nakatakip ng ilong? Hahaha!'])]]);
            return c.n >= 3;
          }
        },
      },
      talk([
        ['Ate Maya', 'Salamat! May sapat na kaming pondo para sa mga bagong camera sa gubat.'],
        ['Ate Maya', 'At... nakita ng camera ang mga trak ng troso ngayong gabi. Pababa sila ng bundok. Pigilan natin sila!'],
      ]),
    ],
  },
  { // 25
    id: 'bantay-gubat', title: 'Bantay Gubat', giver: 'maya', reward: 4500, chapter: 4,
    desc: 'Pigilan ang mga trak ng ilegal na troso bago sila makababa ng bundok.',
    cp: { stage: 1, pos: () => ({ x: dw().cx(1), y: dw().cy(0) + 60 }), car: 'pickup' },
    stages: [
      talk([
        ['Ate Maya', 'Tatlong trak ng troso — bababa sila sa trail papunta sa lungsod. Banggain o barilin mo hanggang tumigil. HUWAG mong hayaang makalampas!'],
      ]),
      {
        obj: (c) => `Pigilan ang mga trak ng troso! (${c.stopped || 0}/3)`,
        enter(c) {
          const h = WORLD.hour(); if (h > 5 && h < 19) { WORLD.clock = 20 * 60; UI.toast('🌙 Gabi na sa bundok...'); }
          c.trucks = []; c.stopped = 0; c.t = 0;
          const path = dw().trail.slice().reverse().concat([{ x: dw().cx(1) + LO, y: dw().cy(2) }]);
          for (let k = 0; k < 3; k++) {
            const st = path[Math.min(k, 1)];
            const v = laneSpawn('logtruck', st.x, st.y - k * 30, Math.PI / 2); v.driver = 'ai'; v.criminal = true; v.maxhp = v.hp = 200;
            v._ai = new PathDriver(v, path.slice(1), { cruise: 150, solid: true }); v.delay = k * 7; v.ai = k === 0 ? v._ai : null;
            c.trucks.push(v);
          }
        },
        target: (c) => { if (!c.trucks) return null; const live = c.trucks.filter(v => !v.caught && !v.delay); return live.length ? live.reduce((a, b) => U.d2(a.x, a.y, G.player.x, G.player.y) < U.d2(b.x, b.y, G.player.x, G.player.y) ? a : b) : (c.trucks.find(v => !v.caught) || null); },
        update(c, dt) {
          for (const v of c.trucks) {
            if (v.caught) continue;
            if (!v.ai && v.delay > 0) { v.delay -= dt; v.throttle = 0; v.vx = v.vy = 0; if (v.delay <= 0) { v.delay = 0; v.ai = v._ai; } continue; }
            if (holdAlive(v, 0.08) || v.hp <= v.maxhp * 0.08) { v.caught = true; v.ai = null; v.driver = null; v.throttle = 0; c.stopped++; UI.toast(`🪵 Napahinto ang trak! (${c.stopped}/3)`); AUD.success(); continue; }
            if (v.ai && v.ai.finished) return 'Nakababa ang isang trak ng troso!';
          }
          return c.stopped >= 3;
        },
      },
      talk([
        ['Ate Maya', 'Ang galing mo! Pero tingnan mo ito — may papel sa trak: "Ihatid sa bodega. — N." At may kulungan ng agila sa likod... walang laman.'],
        ['Ate Maya', 'Ang sisiw ng agila... dinala nila! Kailangan natin silang habulin!'],
      ]),
    ],
    done(c) { if (c.trucks) for (const v of c.trucks) { v.mission = false; v.criminal = false; } },
  },
  { // 26
    id: 'agila', title: 'Agila', giver: 'maya', reward: 5000, chapter: 4,
    desc: 'Habulin ang mga poacher at iligtas ang sisiw ng agila.',
    cp: { stage: 1, pos: () => MAP.pois.maya, car: 'suv' },
    stages: [
      talk([
        ['Ate Maya', 'Nakita ng camera ang van ng mga poacher sa lungsod! Nasa loob ang sisiw ng agila. Pahintuin mo ang van — pero DAHAN-DAHAN sa pagbaril, baka masaktan ang agila!'],
      ]),
      {
        obj: (c) => `Pahintuin ang van ng mga poacher! 🚐 ${c.v ? Math.max(0, Math.round(c.v.hp / c.v.maxhp * 100)) : 100}%`,
        enter(c) {
          const P = G.player; let best = null, bd = 1e18;
          for (const L of dw().loops) L.forEach((q, i) => { const d = Math.abs(U.dist(q.x, q.y, P.x, P.y) - 700); if (d < bd) { bd = d; best = [L, i]; } });
          const [L, i] = best, a = L[i], b = L[(i + 1) % L.length];
          c.v = laneSpawn('van', a.x, a.y, Math.atan2(b.y - a.y, b.x - a.x), { color: '#3c4f2a' }); c.v.driver = 'ai'; c.v.criminal = true; c.v.maxhp = c.v.hp = 240; c.v.ai = new PathDriver(c.v, L, { cruise: 250, loop: true, start: (i + 1) % L.length }); c.t0 = 0; UI.boss = { name: '🚐 Mga Poacher', v: c.v }; },
        target: (c) => c.v,
        update(c) {
          c.t0 += G.dt; if (c.t0 > 6 && U.dist(c.v.x, c.v.y, G.player.x, G.player.y) > 2800) return 'Nakatakas ang mga poacher!';
          if (holdAlive(c.v, 0.12) || c.v.hp <= c.v.maxhp * 0.12) { c.v.ai = null; c.v.driver = null; c.v.throttle = 0; UI.boss = null; UI.big('🚐 NAPAHINTO!', 'Kunin ang kulungan ng agila', 2, 'good'); return true; }
        },
      },
      {
        obj: 'Kunin ang kulungan ng agila sa van (lumabas at lumapit)', target: (c) => c.v,
        enter(c) { spawnPating(c, c.v.x, c.v.y, 2, 50, { hostile: true }); for (const p of c.pating) p.look = Object.assign({}, CHARS.lagari.look); },
        update(c) { const P = G.player; if (!P.vehicle && U.dist(P.x, P.y, c.v.x, c.v.y) < c.v.L / 2 + 30) { UI.toast('🦅 Nakuha ang sisiw ng agila!'); AUD.success(); return true; } },
      },
      {
        obj: (c) => `Dalhin ang agila sa 🦅 Sentro ng Agila ⏱ ${Math.max(0, Math.ceil(c.time || 0))}s`,
        enter(c) { c.time = 90; },
        target: () => Object.assign({ stop: true }, MAP.pois.eagle),
        update(c, dt) { c.time -= dt; if (c.time <= 0) return 'Nanghina ang sisiw ng agila...'; return near(MAP.pois.eagle, 140); },
      },
      talk(() => [
        ['Ate Maya', 'Ligtas siya! Tatawagin namin siyang... "Nonoy". Hahaha!'],
        ['Mang Islaw (sa telepono)', 'Ma\'am Maya! Hinaharangan ng mga tauhan ni Ninong ang mga trak ng saging namin! Sabi nila, kanila na raw ang plantasyon!'],
        ...(tookBribe() ? [['Ninong (sa telepono)', 'Nonoy... Akala ko kasosyo ka na namin. Kinuha mo ang pera ni Tiburon, di ba? Bakit mo kami ginugulo?']] : [['Ninong (sa telepono)', 'Ikaw pala ang batang nagpakulong kay Tiburon. Lumayo ka sa Dabaw kung ayaw mong mapahamak.']]),
      ]),
    ],
    done(c) { UI.boss = null; removePeds(c.pating); if (c.v) { c.v.mission = false; c.v.criminal = false; } },
  },
  { // 27
    id: 'saging', title: 'Saging ng Bayan', giver: 'islaw', reward: 6000, chapter: 4,
    desc: 'Protektahan ang mga trak ng saging hanggang sa pantalan.',
    cp: { stage: 1, pos: () => MAP.pois.islaw, car: 'pickup' },
    stages: [
      talk([
        ['Mang Islaw', 'Nonoy! Dalawang trak ng saging ang kailangang makarating sa pantalan — doon naghihintay ang barko papuntang Maynila.'],
        ['Mang Islaw', 'Kapag hindi nakarating ngayon, mabubulok ang ani at mapipilitan kaming ibenta ang lupa kay Ninong. Bantayan mo sila!'],
      ]),
      {
        obj: (c) => `Protektahan ang mga trak ng saging! 🍌 ${c.trucks ? c.trucks.map(j => Math.max(0, Math.round(j.hp / j.maxhp * 100)) + '%').join(' · ') : ''}`,
        enter(c) {
          const D = dw(), X = DX0;
          const path = [{ x: (MW - 8.5) * T, y: (D.HY[3] + 2) * T }, { x: D.cx(3) + LO, y: D.cy(3) + LO }, { x: D.cx(2), y: D.cy(3) + LO }, { x: D.cx(2) - LO, y: D.cy(2) + LO }, { x: D.cx(0), y: D.cy(2) + LO }, { x: (X + 3) * T, y: (D.HY[2] + 2) * T }];
          c.trucks = []; c.t = 0; c.spawned = 0;
          for (let k = 0; k < 2; k++) {
            const j = laneSpawn('pickup', (MW - 8.5) * T, (D.HY[3] + 10 + k * 5) * T, -Math.PI / 2, { color: k ? '#f1c40f' : '#e67e22' });
            j.driver = 'ai'; j.maxhp = j.hp = 380; j.cargo = 1;
            j.ai = new PathDriver(j, path, { cruise: 150, solid: true });
            c.trucks.push(j);
          }
          UI.toast('🍌 Umalis na ang mga trak!');
        },
        target: (c) => c.trucks ? c.trucks.find(j => !j.ai || !j.ai.finished) || c.trucks[0] : null,
        update(c, dt) {
          c.t += dt;
          for (const j of c.trucks) if (j.dead || j.hp <= 0) return 'Nasira ang isang trak ng saging!';
          const alive = (c.goons || []).filter(v => !v.dead && !v.remove);
          const max = tookBribe() ? 7 : 5;
          if (c.spawned < max && alive.length < 3 && c.t > 4 + c.spawned * 4) {
            const tgt = U.choice(c.trucks);
            if (dabawGoonCar(c, tgt, () => { const live = c.trucks.filter(j => !j.dead); return live.length ? live[0] : null; })) { c.spawned++; UI.toast('🚙 May SUV ni Ninong!'); }
          }
          if (c.trucks.every(j => j.ai && j.ai.finished)) { for (const v of (c.goons || [])) { v.ai = null; v.driver = null; } return true; }
        },
      },
      talk([
        ['Mang Islaw', 'Nakarating! Salamat, Nonoy — may kinabukasan pa ang plantasyon!'],
        ['Ate Maya', 'Nalaman na namin kung nasaan si Ninong — sa kampo ng mangangahoy sa bundok. Ito na ang huling laban.'],
      ]),
    ],
    done(c) { if (c.goons) for (const v of c.goons) { v.mission = false; v.criminal = false; } if (c.trucks) for (const j of c.trucks) j.mission = false; },
  },
  { // 28
    id: 'ang-ninong', title: 'Ang Ninong', giver: 'maya', reward: 25000, chapter: 4,
    desc: 'Lusubin ang kampo sa bundok at harapin si Ninong.',
    cp: { stage: 2, pos: () => ({ x: (DX0 + 28) * T, y: 39.5 * T }) },
    stages: [
      {
        obj: '', enter() {
          const P = G.player, lines = [['Ate Maya', 'Nasa kampo sa gitna ng bundok si Ninong at ang mga tauhan niya. Mag-ingat ka.']];
          if (!GUNS.owned('smg')) { P.weapons.smg = 120; P.mags.smg = 30; lines.push(['Ate Maya', 'Heto — SMG mula kay Kabo. Pinadala niya mula Maynila para sa iyo.']); }
          P.armor = 100;
          if (G.flags.ch2 !== 'pera') lines.push(['Lola Isyang (sa telepono)', 'Apo, ipinagdarasal ka namin dito sa San Isidro. Umuwi ka nang buo!']);
          if (!tookBribe()) lines.push(['Kapitana Luz (sa telepono)', 'Nonoy, nakausap ko ang NBI. Darating sila pagkatapos mong mabuksan ang kampo.']);
          else lines.push([N, 'Ibabalik ko ang pera ni Tiburon. Pagkatapos nito, malinis na ang pangalan ko.']);
          UI.say(lines);
        }, update: () => !UI.talking,
      },
      { obj: 'Umakyat sa bundok papunta sa kampo ng mga mangangahoy', target: () => ({ x: (DX0 + 28) * T, y: 39.5 * T }), update: () => near({ x: (DX0 + 28) * T, y: 39.5 * T }, 260) },
      {
        obj: (c) => `Talunin ang mga tauhan ni Ninong (${c.pating ? c.pating.filter(p => !p.ko).length : 0} natitira)`,
        enter(c) {
          c.noCops = true;
          const cp = dw().camp;
          spawnPating(c, cp.x, cp.y, tookBribe() ? 9 : 7, 200, { hostile: true });
          for (const p of c.pating) p.look = Object.assign({}, CHARS.lagari.look);
          c.boss = spawnBoss(c, cp.x + 40, cp.y - 120, 'Ninong', CHARS.ninong.look, 320);
          UI.boss = { name: '🕴 Ninong', p: c.boss, max: 320 }; UI.toast('🔫 Lusob sa kampo!');
        },
        target: (c) => { if (!c.pating) return null; const live = c.pating.filter(p => !p.ko); return live.length ? live.reduce((a, b) => U.d2(a.x, a.y, G.player.x, G.player.y) < U.d2(b.x, b.y, G.player.x, G.player.y) ? a : b) : null; },
        update(c) { if (c.pating && c.pating.every(p => p.ko)) { UI.boss = null; return true; } },
      },
      talk(() => [
        ['Ninong', 'Ugh... Hindi... hindi pa tapos ito! May trak ako — at ang pinakamalaking kargamento ng troso!'],
        [N, 'Tumatakas siya pababa ng bundok! Habulin!'],
      ]),
      {
        obj: (c) => `Pahintuin ang trak ni Ninong! 🪵 ${c.t ? Math.max(0, Math.round(c.t.hp / c.t.maxhp * 100)) : 100}%`,
        enter(c) {
          const path = dw().trail.slice(0, 3).reverse().concat([{ x: dw().cx(1) + LO, y: dw().cy(2) }, { x: dw().cx(0) + LO, y: dw().cy(4) }]);
          const st = { x: (DX0 + 36) * T, y: 53.5 * T };
          c.t = laneSpawn('logtruck', st.x, st.y, Math.PI, { color: '#2b211c' }); c.t.driver = 'ai'; c.t.criminal = true; c.t.maxhp = c.t.hp = 420;
          c.t.ai = new PathDriver(c.t, path, { cruise: 210, solid: true });
          const P = G.player; if (!P.vehicle) { c.car = laneSpawn('pickup', P.x + 40, P.y, 0, { color: '#4b5a32' }); UI.toast('🛻 May pickup sa tabi mo — sakay na!'); }
          UI.boss = { name: '🕴 Trak ni Ninong', v: c.t };
        },
        target: (c) => c.t,
        update(c) {
          if (c.t.ai && c.t.ai.finished) return 'Nakatakas si Ninong!';
          if (holdAlive(c.t, 0.1) || c.t.hp <= c.t.maxhp * 0.1) { c.t.ai = null; c.t.driver = null; c.t.throttle = 0; UI.boss = null; UI.big('🕴 NAHULI SI NINONG!', '', 2.4, 'good'); return true; }
        },
      },
      talk(() => [
        ['Ninong', 'Sige... hulihin niyo na ako. Pero tandaan mo, bata — hindi lang ako ang Ninong sa bansang ito.'],
        [N, 'Siguro. Pero ngayong araw, may isang Ninong na kulang.'],
        ['Ate Maya', 'Nonoy... nagawa mo. Ligtas na ang gubat ng Bundok Apo — at ang mga agila.'],
      ]),
      { obj: '', enter() { UI.comic(EPILOGUE.panels()); }, update: () => !UI.talking },
    ],
    done(c, ok) {
      UI.boss = null; removePeds(c.pating);
      if (c.t) { c.t.mission = false; c.t.criminal = false; }
      if (ok) { G.flags.ch4 = 'done'; setTimeout(() => UI.ending('epilogue'), 600); }
    },
  },
);
MISSIONS.forEach(m => { m.chapter = m.chapter || 1; });

const EPILOGUE = {
  panels() {
    const k = (G.flags.ch2 === 'pera' ? 'B' : 'A') + (tookBribe() ? 'D' : 'C');
    const last = {
      AC: ['👑🦅', 'EPILOGO: Ang Hari ng Kalsada — tagapagtanggol ng bayan, ng gubat at ng agila.'],
      AD: ['💸🦅', 'EPILOGO: Ibinigay mo ang pera ni Tiburon sa Sentro ng Agila. Ang dating "Bagong Tiburon" — bayani na ulit.'],
      BC: ['🙏🦅', 'EPILOGO: Mula sa pagkakamali hanggang sa pagbabalik-loob. Ipinagmamalaki ka na ni Lola.'],
      BD: ['🌱🦅', 'EPILOGO: Ibinalik mo ang lahat ng maruming pera. Hindi na "Hari ng Wala" — kundi isang taong nagbago.'],
    }[k];
    return [
      ['🚔🕴️📰', 'Inaresto si Ninong. Isinara ang lahat ng ilegal na pagtotroso sa Bundok Apo.'],
      ['🌲🌲🦅', 'Bumalik ang mga agila sa gubat. Ang sisiw na iniligtas mo — lumilipad na.'],
      ['🏙🌾🏝🏔', 'Maynila, San Isidro, Sugbo, Dabaw — apat na lugar, isang Nonoy.'],
      last,
    ];
  },
  text() {
    return G.flags.ch2 !== 'pera' && !tookBribe()
      ? 'Natapos mo ang lahat ng 4 na kabanata at ang Tunay na Wakas! Iniligtas mo ang gubat ng Bundok Apo at ang mga agila. Maraming salamat sa paglalaro — ikaw ang tunay na Hari ng Kalsada!'
      : 'Natapos mo ang lahat ng 4 na kabanata! Itinuwid mo ang mga pagkakamali at iniligtas ang gubat at ang mga agila. Subukan ang ibang mga pagpili para makita ang Tunay na Wakas.';
  },
};
