'use strict';
// ===== KABANATA 5: BAGUIO — "Ang Huling Ninong" (grand finale) =====
Object.assign(CHARS, {
  pining: { name: 'Lola Pining', look: { skin: '#c68b59', shirt: '#7a2e4a', pat: 'stripe', outfit: 'npc', hair: 'long', hairCol: '#d8d8d8', pants: '#3b3b3b' } },
  magno: { name: 'Don Magno', look: { skin: '#e0b07a', shirt: '#1d2a3a', pat: 'barong', outfit: 'npc', hair: 'short', hairCol: '#9a9a9a', pants: '#111' } },
  bantay: { name: 'Bantay ni Don Magno', look: { skin: '#a86b3c', shirt: '#22303f', pat: 'plain', outfit: 'npc', hair: 'buzz', hairCol: '#111', pants: '#1a2230' } },
});
Object.assign(PORTRAIT.extras, { 'Lola Pining': { wrinkles: true, bun: true, earrings: true }, 'Don Magno': { shades: true, mustache: true, chain: true } });
const bgw = () => MAP.bagiw;
function bagiwGoonCar(c, near, target) {
  for (let k = 0; k < 20; k++) {
    const p = U.choice(bgw().pts.concat(bgw().down)), d = U.dist(p.x, p.y, near.x, near.y);
    if (d < 500 || d > 1200 || TRAFFIC.inView(p.x, p.y, 60)) continue;
    const v = new Vehicle('mayor', p.x, p.y, Math.atan2(near.y - p.y, near.x - p.x), { color: '#1d2a3a' });
    v.driver = 'ai'; v.mission = true; v.goon = true; v.criminal = true; v.maxhp = v.hp = 160;
    v.ai = new GoonDriver(v, target); G.vehicles.push(v); (c.goons = c.goons || []).push(v); return v;
  }
  return null;
}

MISSIONS.push(
  { // 29
    id: 'akyat-bagiw', title: 'Akyat Baguio', giver: 'maya', reward: 4000, chapter: 5,
    desc: 'Lumipad sa Baguio at puntahan si Lola Pining.',
    cp: { stage: 3, pos: () => MAP.pois.airport_b },
    stages: [
      comic([
        ['🕴️📞', '"Hindi lang ako ang Ninong..." — ang huling sinabi ni Ninong bago makulong.'],
        ['🏔️🌲⛏️', 'Sa malamig na kabundukan ng Baguio, may nagmimina nang ilegal sa ilalim ng mga pine... at may iisang pangalan sa likod nito: DON MAGNO.'],
        ['🌲🍓🌫️', 'KABANATA 5: BAGUIO — ANG HULING NINONG'],
      ]),
      talk(() => [
        ['Ate Maya', 'Nonoy, may tumawag mula sa Baguio — si Lola Pining, kapatid ni Lola Isyang! Ang strawberry farm niya, nasisira ng ilegal na minahan.'],
        ['Ate Maya', 'At hulaan mo kung sino ang may-ari ng minahan... si DON MAGNO. Siya raw ang "Ninong ng mga Ninong" — ang nasa itaas nina Mayor, Don Severo, Tiburon at Ninong.'],
        [N, 'Ito na ang huli. Pupunta ako sa Baguio.'],
        ['Ate Maya', 'Lumipad ka mula sa kahit anong paliparan. Magdala ka ng jacket — malamig doon!'],
      ]),
      {
        obj: 'Lumipad papuntang ✈️ Baguio (mula sa kahit anong paliparan)',
        target: () => { const P = G.player; return ['airport_d', 'airport_s', 'airport_m'].map(k => MAP.pois[k]).reduce((a, b) => U.d2(a.x, a.y, P.x, P.y) < U.d2(b.x, b.y, P.x, P.y) ? a : b); },
        update(c) {
          if (BAGIW.in(G.player.x)) return true;
          if (c.flying) return false;
          for (const k of ['airport_d', 'airport_s', 'airport_m']) if (near(MAP.pois[k], 90)) {
            if (WANTED.stars > 0) { if (!c.w) { c.w = true; UI.toast('✈️ Iwala muna ang pulis bago pumasok sa paliparan!'); } return false; }
            c.flying = true; FLY.go(MAP.pois.airport_b); return false;
          }
        },
      },
      { obj: 'Puntahan si Lola Pining sa 🍓 Presahan (strawberry farm)', target: () => MAP.pois.pining, update: () => near(MAP.pois.pining, 110) },
      talk(() => [
        ['Lola Pining', 'Ikaw na ba ang apo ni Isyang? Ang tangkad mo! Halika, kain ka muna ng strawberry taho.'],
        ['Lola Pining', 'Tingnan mo ang bundok — kalbo na sa ilang bahagi. Ang minahan ni Don Magno ang dahilan. Ang putik, napupunta sa mga bukid namin.'],
        ...(G.flags.ch2 === 'pera' ? [['Lola Pining', 'Sinabi sa akin ni Isyang ang nangyari sa San Isidro... pero pinatawad ka na niya. Ipakita mo sa akin na tama siya.']] : [['Lola Pining', 'Ipinagmamalaki ka ni Isyang. Sabi niya, ikaw ang tunay na Hari ng Kalsada.']]),
        ['Lola Pining', 'Una — kailangan nating makuha ang tiwala ng mga taga-Baguio. May karera ng bisikleta pababa ng bundok bukas. Sumali ka!'],
      ]),
    ],
  },
  { // 30
    id: 'karera-bisikleta', title: 'Karera Pababa', giver: 'pining', reward: 5000, chapter: 5,
    desc: 'Manalo sa karera ng bisikleta pababa ng paliko-likong daan.',
    cp: { stage: 1, pos: () => bgw().down[0] },
    stages: [
      talk([['Lola Pining', 'Ito ang bisikleta ng Lolo mo! Pababa sa paliko-likong daan hanggang sa paliparan. Ingat sa mga kurbada — at talunin ang mga taga-Baguio!']]),
      {
        obj: 'Sumakay sa bisikleta sa simula ng karera',
        enter(c) { const s = bgw().down[0]; c.bike = laneSpawn('bisikleta', s.x - 20, s.y - 60, Math.PI / 2, { color: '#c0392b' }); },
        target: (c) => c.bike, update(c) { if (c.bike.dead) return 'Nasira ang bisikleta!'; return G.player.vehicle === c.bike; },
      },
      {
        obj: (c) => !c.cps || c.cd > 0 ? 'Humanda...' : `Checkpoint ${(c.pi || 0) + 1}/${c.cps ? c.cps.length : 0} · Posisyon ${c.pos || 1}/4`,
        enter(c) {
          const D = bgw().down;
          c.cps = D.slice(1).concat([{ x: D[D.length - 1].x, y: D[D.length - 1].y + 6 * T }]); c.pi = 0; c.cd = 3.5; c.last = 4;
          c.rivals = [];
          for (let k = 0; k < 3; k++) { const r = laneSpawn('bisikleta', D[0].x + (k - 1) * 26, D[0].y - 30 - k * 20, Math.PI / 2, { color: ['#2e86c1', '#27ae60', '#f1c40f'][k] }); r.driver = 'ai'; r.rcol = ['#2e86c1', '#27ae60', '#f1c40f'][k]; r.skill = [0.9, 0.95, 1.0][k]; r.ri = 0; r.st = { t: 0 }; c.rivals.push(r); }
        },
        target: (c) => !c.cps || c.cd > 0 ? null : Object.assign({ cp: true, n: c.pi + 1 }, c.cps[c.pi]),
        update(c, dt) {
          const v = c.bike;
          if (c.cd > 0) {
            c.cd -= dt; for (const r of [v, ...c.rivals]) { r.vx = r.vy = 0; }
            const n = Math.ceil(c.cd); if (n !== c.last && n > 0) { c.last = n; UI.big(String(n), '', 0.8); AUD.beep(); }
            if (c.cd <= 0) { UI.big('ARANGKADA!', '', 0.8); AUD.tone(1600, 0.4, 'square', 0.1); }
            return false;
          }
          if (G.player.vehicle !== v) return 'Bumaba ka sa bisikleta — talo!';
          if (U.dist(v.x, v.y, c.cps[c.pi].x, c.cps[c.pi].y) < 110) { c.pi++; AUD.checkpoint(); if (c.pi >= c.cps.length) { UI.big('🚲 PANALO!', 'Ikaw ang pinakamabilis sa Baguio!', 2.2, 'good'); return true; } }
          const prog = (i, o) => i * 10000 - U.dist(o.x, o.y, c.cps[Math.min(i, c.cps.length - 1)].x, c.cps[Math.min(i, c.cps.length - 1)].y);
          const pp = prog(c.pi, v); let pos = 1;
          for (const r of c.rivals) {
            if (r.ri >= c.cps.length) { pos++; continue; }
            const rp = prog(r.ri, r); if (rp > pp) pos++;
            if (driveRacer(r, c.cps[r.ri], c.cps[r.ri + 1], rp - pp, dt, r.st) < 100) r.ri++;
            if (r.ri >= c.cps.length) return 'Naunahan ka sa finish line!';
          }
          c.pos = pos;
        },
      },
      talk([
        ['Lola Pining', 'Ang bilis mo! Ngayon, kilala ka na ng buong Baguio. May nagbigay sa akin ng impormasyon: nasa mansyon ni Don Magno sa Mines View ang mga PEKENG permit ng minahan.'],
        ['Lola Pining', 'Mahamog ngayong gabi — mahirap kang makita ng mga bantay. Ito na ang pagkakataon mo.'],
      ]),
    ],
    done(c) { if (c.rivals) for (const r of c.rivals) { r.mission = false; r.driver = null; } if (c.bike) c.bike.mission = false; },
  },
  { // 31
    id: 'hamog', title: 'Hamog', giver: 'pining', reward: 6000, chapter: 5,
    desc: 'Pasukin ang mansyon ni Don Magno sa hamog at kunin ang mga pekeng permit.',
    cp: { stage: 1, pos: () => ({ x: bgw().mansion.gate.x, y: bgw().mansion.gate.y + 240 }) },
    stages: [
      talk([['Lola Pining', 'Nasa opisina sa gitna ng mansyon ang mga permit. Iwasan ang dilaw na tingin ng mga bantay. Nakakatulong ang hamog — hindi sila gaanong nakakakita ng malayo.']]),
      { obj: 'Pumunta sa mansyon ni Don Magno (malapit sa Mines View)', enter() { const h = WORLD.hour(); if (h > 6 && h < 19) { WORLD.clock = 4.8 * 60; UI.toast('🌫 Madaling-araw — makapal ang hamog...'); } }, target: () => bgw().mansion.gate, update: () => near(bgw().mansion.gate, 220) },
      {
        obj: () => WANTED.stars > 0 ? 'Nakita ka! Kunin pa rin ang permit — o tumakas muna' : 'Pumasok nang palihim at kunin ang mga permit sa opisina',
        enter(c) {
          const m = bgw().mansion, cx = (m.x0 + m.x1) / 2;
          c.guards = [];
          const routes = [[[m.x0 + 80, m.y1 - 90], [m.x1 - 80, m.y1 - 90]], [[m.x0 + 70, m.y0 + 90], [m.x0 + 70, m.y1 - 140]], [[m.x1 - 70, m.y0 + 90], [m.x1 - 70, m.y1 - 140]], [[cx - 150, m.y0 + 330], [cx + 150, m.y0 + 330]]];
          for (const r of routes) { const p = new Person(r[0][0], r[0][1], 'cop', Object.assign({}, CHARS.bantay.look)); p.role = 'guard'; p.keep = true; p.boss = 'Don Magno'; p.sight = 175; p.patrol = r.map(([x, y]) => ({ x, y })); G.peds.push(p); c.guards.push(p); }
        },
        target: () => bgw().mansion.office,
        update() { if (!G.player.vehicle && near(bgw().mansion.office, 55)) { AUD.cash(); UI.big('📁 NAKUHA ANG MGA PERMIT!', 'Lumabas ng mansyon', 2, 'good'); return true; } },
      },
      {
        obj: () => WANTED.stars > 0 ? 'Takasan ang mga bantay at pulis!' : 'Lumabas ng mansyon at lumayo',
        target: () => WANTED.stars > 0 ? null : MAP.pois.pining,
        update() { const m = bgw().mansion, P = G.player; const out = P.x < m.x0 - 80 || P.x > m.x1 + 80 || P.y < m.y0 - 80 || P.y > m.y1 + 160; return out && WANTED.stars === 0; },
      },
      talk([
        ['Lola Pining', 'Peke nga! Walang pirma ng DENR, at ang lupa — nakapangalan sa mga taong patay na!'],
        ['Lola Pining', 'Pero kailangan pa natin ng mga litrato ng minahan mismo. May helicopter tour sa may lawa — kayang-kaya mo iyan, apo.'],
      ]),
    ],
    done(c) { removePeds(c.guards); },
  },
  { // 32
    id: 'himpapawid', title: 'Himpapawid', giver: 'pining', reward: 7000, chapter: 5,
    desc: 'Lumipad sa ibabaw ng gubat at kuhanan ng litrato ang mga ilegal na minahan.',
    cp: { stage: 1, pos: () => MAP.pois.bg_heli },
    stages: [
      talk([['Lola Pining', 'May apat na minahan sa gubat sa paligid ng Baguio. Lumipad ka sa ibabaw ng bawat isa at bagalan para makakuha ng malinaw na litrato!']]),
      {
        obj: 'Sumakay sa helicopter sa may lawa',
        enter(c) { const p = MAP.safeNear(MAP.pois.bg_heli.x, MAP.pois.bg_heli.y - 80); c.h = laneSpawn('heli', p.x, p.y, -Math.PI / 2); TIP.show('heli'); },
        target: (c) => c.h, update(c) { if (c.h.dead) return 'Nasira ang helicopter!'; return G.player.vehicle === c.h; },
      },
      {
        obj: (c) => `📸 Kuhanan ang mga ilegal na minahan (${c.n || 0}/4) — bagalan sa ibabaw`,
        enter(c) { c.n = 0; c.done = []; },
        target: (c) => { if (!c.done) return null; const left = bgw().mines.filter((m, i) => !c.done.includes(i)); if (!left.length) return null; const P = G.player; return left.reduce((a, b) => U.d2(a.x, a.y, P.x, P.y) < U.d2(b.x, b.y, P.x, P.y) ? a : b); },
        update(c, dt) {
          if (c.h.dead) return 'Nasira ang helicopter!';
          if (G.player.vehicle !== c.h) return false;
          bgw().mines.forEach((m, i) => {
            if (c.done.includes(i)) return;
            if (U.dist(c.h.x, c.h.y, m.x, m.y) < 150 && c.h.speed < 120) { c.ht = (c.ht || 0) + dt; if (c.ht > 1.5) { c.ht = 0; c.done.push(i); c.n++; G.fadeFlash(); AUD.tone(1800, 0.05, 'square', 0.06); UI.toast(`📸 Minahan ${c.n}/4!`); } }
          });
          return c.n >= 4;
        },
      },
      { obj: 'Lumapag malapit kay Lola Pining at bumaba', target: () => MAP.pois.pining, update: () => !G.player.vehicle && near(MAP.pois.pining, 260) },
      talk([
        ['Lola Pining', 'Kumpleto na ang ebidensya! Ipinadala ko na sa media at sa korte.'],
        ['Ate Maya (sa telepono)', 'Nonoy! Nalaman ni Don Magno! Tumatakas siya papuntang paliparan dala ang "Pambansang Ledger" — ang listahan ng lahat ng kurakot sa bansa!'],
        [N, 'Hindi siya makakalipad. Hindi ngayon.'],
      ]),
    ],
    done(c) { if (c.h) c.h.mission = false; },
  },
  { // 33
    id: 'huling-ninong', title: 'Ang Huling Ninong', giver: 'pining', reward: 50000, chapter: 5,
    desc: 'Pigilan si Don Magno bago siya makalipad — ang huling laban.',
    cp: { stage: 1, pos: () => ({ x: bgw().cx(1), y: bgw().cy(3) - 80 }), car: 'suv' },
    stages: [
      talk(() => {
        const allies = [];
        if (G.flags.ch2 !== 'pera') allies.push(['Lola Isyang (sa telepono)', 'Apo! Narito ang mga jeep ng San Isidro sa daan pababa — haharangan namin ang mga tauhan niya!']);
        if (G.flags.ch3 !== 'itago') allies.push(['Dodong (sa telepono)', 'Nonoy! Nandito kami ni Tiya Bebing — sasamahan ka namin hanggang dulo!']);
        return [['Lola Pining', 'Sumakay ka, apo! Ang armored SUV ni Don Magno — pababa na sa Kennon! Pigilan mo bago umabot sa paliparan!'], ...allies];
      }),
      {
        obj: (c) => `Pigilan ang SUV ni Don Magno! 🚙 ${c.m ? Math.max(0, Math.round(c.m.hp / c.m.maxhp * 100)) : 100}%`,
        enter(c) {
          const D = bgw().down, P = G.player;
          if (!P.vehicle) { c.car = laneSpawn('suv', P.x + 40, P.y, 0, { color: '#c0392b' }); }
          c.m = laneSpawn('armored', D[0].x + 40, D[0].y + 80, Math.PI / 2, { color: '#14161b' }); c.m.driver = 'ai'; c.m.criminal = true; c.m.maxhp = c.m.hp = 700;
          c.m.ai = new PathDriver(c.m, D.slice(1).concat([{ x: (BX0 + 45) * T, y: 182 * T }]), { cruise: 210, solid: true });
          UI.boss = { name: '🕴 Don Magno', v: c.m }; c.t = 0; c.spawned = 0;
          const fewer = (G.flags.ch2 !== 'pera') + (G.flags.ch3 !== 'itago');
          c.maxGoons = 6 - fewer * 2;
        },
        target: (c) => c.m,
        update(c, dt) {
          c.t += dt;
          if (c.m.ai && c.m.ai.finished) return 'Nakarating si Don Magno sa eroplano!';
          const alive = (c.goons || []).filter(v => !v.dead && !v.remove);
          if (c.spawned < c.maxGoons && alive.length < 2 && c.t > 4 + c.spawned * 5) { if (bagiwGoonCar(c, G.player, () => G.player.vehicle || G.player)) { c.spawned++; UI.toast('🚙 Mga tauhan ni Don Magno!'); } }
          if (c.m.hp <= c.m.maxhp * 0.08 || c.m.dead) { c.m.hp = c.m.maxhp * 0.08; c.m.dead = false; c.m.burn = 0; c.m.ai = null; c.m.driver = null; c.m.throttle = 0; UI.boss = null; for (const v of alive) { v.ai = null; v.driver = null; } UI.big('🕴 NAHULI SI DON MAGNO!', '', 2.6, 'good'); return true; }
        },
      },
      talk([
        ['Don Magno', 'Bata... alam mo ba kung sino ako? Ako ang nagpondo sa lahat — kay Mayor, kay Don Severo, kay Tiburon, kay Ninong!'],
        [N, 'Alam ko. Kaya ka nga namin hinabol mula Manila hanggang Baguio.'],
        ['Lola Pining', 'Ang Pambansang Ledger... ipapasa natin sa Senado at sa media. Ito na ang katapusan ng mga Ninong.'],
      ]),
      { obj: '', enter() { UI.comic(GRAND.panels()); }, update: () => !UI.talking },
    ],
    done(c, ok) {
      UI.boss = null;
      if (c.goons) for (const v of c.goons) { v.mission = false; v.criminal = false; }
      if (c.m) c.m.mission = false;
      if (ok) { G.flags.ch5 = 'done'; setTimeout(() => UI.ending('grand'), 600); }
    },
  },
);
MISSIONS.forEach(m => { m.chapter = m.chapter || 1; });

const GRAND = {
  panels() {
    const good = G.flags.ch2 !== 'pera' && G.flags.ch3 !== 'itago';
    return [
      ['📒⚖️🏛️', 'Naipasa ang Pambansang Ledger. Isa-isang bumagsak ang mga Ninong sa buong bansa.'],
      ['🏙🌾🏝🦅🌲', 'Manila, San Isidro, Cebu, Davao, Baguio — limang lugar na naging mas malaya.'],
      ['👵👵🧓🧑‍🍳🛵🦅🐕', 'Si Lola Isyang at Lola Pining, magkasama ulit. Si Tito Boy, Inday Bebing, Dodong, Ate Maya — isang malaking pamilya.'],
      good ? ['👑🛣️🌅', 'WAKAS NG SERYE: Ang Hari ng Kalsada — hindi dahil sa yaman o takot, kundi dahil sa puso para sa bayan.']
        : ['🌅🛣️🙏', 'WAKAS NG SERYE: Nagkamali ka sa daan, pero pinili mong bumalik. Iyan ang tunay na Hari ng Kalsada.'],
    ];
  },
  text() {
    const st = G.stats, P = G.player;
    return `Natalo mo si Don Magno at naipasa ang Pambansang Ledger! Level ${P.level || 1} · ${st.escapes || 0} beses nakatakas · ${(st.rescued || 0)} nailigtas. Pero oras na para magbakasyon... BUKAS NA ANG KABANATA 6: BORACAY — kausapin si Ate Maya!`;
  },
};
