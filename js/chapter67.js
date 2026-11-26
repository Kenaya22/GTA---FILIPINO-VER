'use strict';
// ===== KABANATA 6: BORACAY — "Paraiso" · KABANATA 7: PALAWAN — "Ang Huling Paraiso" =====
Object.assign(CHARS, {
  tomas: { name: 'Mang Tomas', look: { skin: '#8a5530', shirt: '#2e86c1', pat: 'plain', outfit: 'npc', hair: 'cap_blue', hairCol: '#222', pants: '#3b3b3b' } },
  coral: { name: 'Señora Coral', look: { skin: '#e8c39e', shirt: '#f5f5f5', pat: 'plain', outfit: 'npc', hair: 'long', hairCol: '#5a3a1a', pants: '#e84393' } },
  kanor: { name: 'Mang Kanor', look: { skin: '#7a4a28', shirt: '#4b5a32', pat: 'plain', outfit: 'npc', hair: 'short', hairCol: '#cfcfcf', pants: '#3b3b3b' } },
  facundo: { name: 'Don Facundo', look: { skin: '#d9a877', shirt: '#2b2b2b', pat: 'barong', outfit: 'npc', hair: 'short', hairCol: '#111', pants: '#111' } },
});
Object.assign(PORTRAIT.extras, { 'Señora Coral': { shades: true, earrings: true }, 'Mang Kanor': { wrinkles: true }, 'Don Facundo': { shades: true, mustache: true, chain: true }, 'Mang Tomas': { wrinkles: true } });
const bo = () => MAP.bora, pal = () => MAP.pal;
const COAST_GOON = { look: { skin: '#a86b3c', shirt: '#1d1d1d', pat: 'plain', outfit: 'goon', hair: 'cap_red', hairCol: '#111', pants: '#1f2633' } };
function seaGoon(c, pts, near, target) {
  for (let k = 0; k < 14; k++) {
    const p = U.choice(pts), d = U.dist(p.x, p.y, near.x, near.y);
    if (d < 450 || d > 1500 || TRAFFIC.inView(p.x, p.y, 60) || MAP.tileAt(p.x, p.y) !== TL.WATER) continue;
    const v = new Vehicle('lancha', p.x, p.y, Math.atan2(near.y - p.y, near.x - p.x), { color: '#1d2a3a' });
    v.driver = 'ai'; v.mission = true; v.goon = true; v.criminal = true; v.maxhp = v.hp = 110;
    v.ai = new GoonDriver(v, target); G.vehicles.push(v); (c.boats = c.boats || []).push(v); return v;
  }
  return null;
}
function landGoonCar(c, pts, near, target) {
  for (let k = 0; k < 16; k++) {
    const p = U.choice(pts), d = U.dist(p.x, p.y, near.x, near.y);
    if (d < 450 || d > 1300 || TRAFFIC.inView(p.x, p.y, 60)) continue;
    const v = new Vehicle('pickup', p.x, p.y, Math.atan2(near.y - p.y, near.x - p.x), { color: '#2b2b2b' });
    v.driver = 'ai'; v.mission = true; v.goon = true; v.criminal = true; v.maxhp = v.hp = 150;
    v.ai = new GoonDriver(v, target); G.vehicles.push(v); (c.goons = c.goons || []).push(v); return v;
  }
  return null;
}
function flyTo(key, inRegion) {
  return {
    obj: `Lumipad papuntang ✈️ ${key === 'airport_bo' ? 'Boracay' : 'Palawan'} (mula sa kahit anong paliparan)`,
    target: () => { const P = G.player; return Object.values(MAP.pois).filter(p => p.type === 'airport' && p.key !== key).reduce((a, b) => U.d2(a.x, a.y, P.x, P.y) < U.d2(b.x, b.y, P.x, P.y) ? a : b); },
    update(c) {
      if (inRegion(G.player.x)) return true;
      if (c.flying) return false;
      for (const p of Object.values(MAP.pois)) if (p.type === 'airport' && p.key !== key && near(p, 90)) {
        if (WANTED.stars > 0) { if (!c.w) { c.w = true; UI.toast('✈️ Iwala muna ang pulis bago pumasok sa paliparan!'); } return false; }
        c.flying = true; FLY.go(MAP.pois[key]); return false;
      }
    },
  };
}
// ram a fleeing vehicle until it gives up
function chaseStage(label, make, extra = {}) {
  return {
    obj: (c) => `${label} ${c.m ? Math.max(0, Math.round(c.m.hp / c.m.maxhp * 100)) : 100}%`,
    enter(c) { make(c); c.t = 0; c.spawned = 0; },
    target: (c) => c.m,
    update(c, dt) {
      c.t += dt;
      if (c.m.ai && c.m.ai.finished) return extra.escape || 'Nakatakas siya!';
      if (extra.goons) extra.goons(c, dt);
      if (holdAlive(c.m, 0.1)) { c.m.ai = null; c.m.driver = null; c.m.throttle = 0; UI.boss = null; for (const v of (c.boats || []).concat(c.goons || [])) { v.ai = null; v.driver = null; } UI.big(extra.win || '🚔 NAHULI!', '', 2.2, 'good'); return true; }
    },
  };
}

MISSIONS.push(
  // ---------------- KABANATA 6: BORACAY ----------------
  { // 34
    id: 'paraiso', title: 'Paraiso', giver: 'maya', reward: 5000, chapter: 6,
    desc: 'Lumipad sa Boracay at kausapin si Mang Tomas sa White Beach.',
    cp: { stage: 3, pos: () => MAP.pois.airport_bo },
    stages: [
      comic([
        ['🏖️☀️🌊', 'Pagkatapos ng lahat ng laban, sabi ni Ate Maya: "Magbakasyon ka naman, Nonoy!"'],
        ['🏨🚽🌊', 'Pero sa Boracay, may mga resort na nagtatapon ng dumi sa dagat — at may isang pangalan sa likod nito: SEÑORA CORAL.'],
        ['🏝️🐚🌅', 'KABANATA 6: BORACAY — PARAISO'],
      ]),
      talk([
        ['Ate Maya', 'Nonoy, magbakasyon ka muna! May kaibigan ako sa Boracay — si Mang Tomas, bangkero sa White Beach.'],
        ['Ate Maya', 'Pero... may naririnig akong balita na nadudumihan na raw ang dagat doon. Pakitingnan mo na rin, ha?'],
        [N, 'Bakasyon na may konting trabaho. Sige!'],
      ]),
      flyTo('airport_bo', (x) => BORA.in(x)),
      { obj: 'Puntahan si Mang Tomas sa 🏖 White Beach', target: () => MAP.pois.tomas, update: () => near(MAP.pois.tomas, 110) },
      talk([
        ['Mang Tomas', 'Ikaw pala ang sinasabi ni Maya! Maligayang pagdating sa Boracay, iho.'],
        ['Mang Tomas', 'Tingnan mo ang tubig — dati kristal, ngayon may lumot at mabaho. Ang mga resort ni Señora Coral, may mga lihim na tubo papunta sa dagat.'],
        ['Mang Tomas', 'Pero bago ang lahat — kailangan kong malaman kung marunong kang magmaneho ng bangka. Island hopping tayo!'],
      ]),
    ],
  },
  { // 35
    id: 'island-hopping', title: 'Island Hopping', giver: 'tomas', reward: 6000, chapter: 6,
    desc: 'Ikutin ang isla sakay ng bangka bago maubos ang oras.',
    cp: { stage: 1, pos: () => MAP.pois.tomas },
    stages: [
      talk([['Mang Tomas', 'Sakay sa bangka ko! Ikutin mo ang buong isla — sundan ang mga boya. Bilisan mo, may mga turistang naghihintay!']]),
      {
        obj: 'Sumakay sa bangka ni Mang Tomas',
        enter(c) { const p = MAP.pois.tomas; c.boat = laneSpawn('bangka', p.x - 3.5 * T, p.y + 40, Math.PI / 2, { color: '#2e86c1' }); },
        target: (c) => c.boat, update(c) { if (c.boat.dead) return 'Nasira ang bangka!'; return G.player.vehicle === c.boat; },
      },
      {
        obj: (c) => c.cps ? `🛶 Boya ${c.pi + 1}/${c.cps.length} · ⏱ ${Math.max(0, Math.ceil(c.time))}s` : '',
        enter(c) { const R = bo().ring; c.cps = R.slice(1).concat([R[0]]); c.pi = 0; c.time = 170; },
        target: (c) => c.cps ? Object.assign({ cp: true, n: c.pi + 1 }, c.cps[c.pi]) : null,
        update(c, dt) {
          if (!c.cps) return false;
          if (c.boat.dead) return 'Nasira ang bangka!';
          if (G.player.vehicle !== c.boat) return 'Bumaba ka sa bangka!';
          c.time -= dt; if (c.time <= 0) return 'Naubos ang oras!';
          if (U.dist(c.boat.x, c.boat.y, c.cps[c.pi].x, c.cps[c.pi].y) < 150) { c.pi++; AUD.checkpoint(); if (c.pi >= c.cps.length) { UI.big('🛶 NAIKOT ANG ISLA!', '', 2, 'good'); return true; } }
        },
      },
      talk([
        ['Mang Tomas', 'Magaling! Parang tunay na bangkero.'],
        ['Mang Tomas', 'Habang umiikot ka, may nakita akong mga tubo sa likod ng mga resort ni Coral. Ngayong gabi, kuhanan natin ng litrato ang mga iyon.'],
      ]),
    ],
    done(c) { if (c.boat) c.boat.mission = false; },
  },
  { // 36
    id: 'maruming-tubo', title: 'Maruming Tubo', giver: 'tomas', reward: 7000, chapter: 6,
    desc: 'Kuhanan ng litrato ang tatlong lihim na tubo ng dumi sa White Beach.',
    cp: { stage: 1, pos: () => MAP.pois.tomas },
    stages: [
      talk([['Mang Tomas', 'Tatlong tubo, iho. Lumapit ka at hintaying malinaw ang litrato. May mga guwardiya si Coral — mag-ingat!']]),
      {
        obj: (c) => `📸 Kuhanan ang mga lihim na tubo (${c.n || 0}/3)`,
        enter(c) { c.n = 0; c.done = []; const h = WORLD.hour(); if (h > 6 && h < 18) { WORLD.clock = 20 * 60; UI.toast('🌙 Gabi na sa White Beach...'); } },
        target: (c) => { if (!c.done) return null; const left = bo().pipes.filter((p, i) => !c.done.includes(i)); return left[0] || null; },
        update(c, dt) {
          if (!c.done) return false;
          bo().pipes.forEach((p, i) => {
            if (c.done.includes(i) || G.player.vehicle || U.dist(G.player.x, G.player.y, p.x, p.y) > 70) return;
            c.ht = (c.ht || 0) + dt;
            if (c.ht > 1.6) { c.ht = 0; c.done.push(i); c.n++; G.fadeFlash(); AUD.tone(1800, 0.05, 'square', 0.06); UI.toast(`📸 Tubo ${c.n}/3!`); if (c.n === 2) { spawnPating(c, bo().pipes[2].x + 120, bo().pipes[2].y, 3, 80, { hostile: false }); } }
          });
          return c.n >= 3;
        },
      },
      {
        obj: 'Takasan ang mga guwardiya ni Coral at bumalik kay Mang Tomas',
        enter(c) { spawnPating(c, G.player.x + 160, G.player.y, 3, 80, { hostile: true }); for (const p of c.pating || []) p.hostile = true; UI.toast('🔦 "Hoy! Sino ka?!"'); },
        target: () => MAP.pois.tomas, update: () => near(MAP.pois.tomas, 110),
      },
      talk([
        ['Mang Tomas', 'Kumpleto na! Ipapadala ko ito sa DENR.'],
        ['Mang Tomas', 'Pero tingnan mo — tumatakas si Señora Coral sa speedboat dala ang mga dokumento! Habulin mo!'],
      ]),
    ],
    done(c) { removePeds(c.pating); },
  },
  { // 37
    id: 'habulan-sa-dagat', title: 'Habulan sa Dagat', giver: 'tomas', reward: 9000, chapter: 6,
    desc: 'Habulin at pahintuin ang speedboat ni Señora Coral.',
    cp: { stage: 1, pos: () => MAP.pois.tomas },
    stages: [
      {
        obj: 'Sumakay sa speedboat',
        enter(c) { const p = MAP.pois.tomas; c.boat = laneSpawn('lancha', p.x - 4 * T, p.y + 60, Math.PI / 2, { color: '#c0392b' }); c.boat.maxhp = c.boat.hp = 220; },
        target: (c) => c.boat, update(c) { if (c.boat.dead) return 'Nasira ang speedboat!'; return G.player.vehicle === c.boat; },
      },
      chaseStage('Pahintuin ang speedboat ni Coral! 🚤', (c) => {
        const R = bo().ring, s = R[2];
        c.m = laneSpawn('lancha', s.x, s.y, 0, { color: '#f5f5f5' }); c.m.driver = 'ai'; c.m.criminal = true; c.m.maxhp = c.m.hp = 420;
        c.m.ai = new PathDriver(c.m, R.slice(3).concat(R.slice(0, 3)).concat(R.slice(3)), { cruise: 250, solid: true });
        UI.boss = { name: '👒 Señora Coral', v: c.m };
      }, {
        win: '🚤 HUMINTO SI CORAL!', escape: 'Nakatakas si Señora Coral!',
        goons(c) { const alive = (c.boats || []).filter(v => !v.dead && !v.remove); if (c.spawned < 4 && alive.length < 2 && c.t > 4 + c.spawned * 6 && seaGoon(c, bo().ring, G.player, () => G.player.vehicle || G.player)) { c.spawned++; UI.toast('🚤 Mga tauhan ni Coral!'); } },
      }),
      talk([
        ['Señora Coral', 'Hmp! Akala mo tapos na? Ang mga dokumento — nasa resort ko pa. At hindi ka makakapasok doon nang buhay!'],
        ['Mang Tomas (sa radyo)', 'Iho, nakatakas siya sa pampang! Pupunta siya sa resort niya sa Station 3. Tapusin na natin ito!'],
      ]),
    ],
    done(c) { UI.boss = null; if (c.boat) c.boat.mission = false; if (c.m) c.m.mission = false; for (const v of c.boats || []) { v.mission = false; v.criminal = false; } },
  },
  { // 38
    id: 'paraiso-ng-bayan', title: 'Paraiso ng Bayan', giver: 'tomas', reward: 15000, chapter: 6,
    desc: 'Pasukin ang resort ni Señora Coral at iligtas ang Boracay.',
    cp: { stage: 1, pos: () => ({ x: bo().resort.x + 260, y: bo().resort.y }) },
    stages: [
      talk([['Mang Tomas', 'Ang resort ni Coral — sa Station 3. Nandoon ang mga dokumento at ang mga tauhan niya. Ingat, iho!']]),
      { obj: 'Pumunta sa resort ni Señora Coral (Station 3)', target: () => bo().resort, update: () => near(bo().resort, 260) },
      {
        obj: (c) => { const l = (c.pating || []).filter(p => !p.ko && !p.remove).length; return `Talunin ang mga tauhan ni Coral (${l} natitira)`; },
        enter(c) { const r = bo().resort; spawnPating(c, r.x, r.y, 5, 140, { hostile: true }); c.boss = spawnBoss(c, r.x, r.y - 40, '👒 Señora Coral', CHARS.coral.look, 260); },
        target: (c) => { const l = (c.pating || []).filter(p => !p.ko && !p.remove); return l[0] || null; },
        update(c) { return (c.pating || []).every(p => p.ko || p.remove); },
      },
      talk([
        ['Señora Coral', 'Sige na... suko na ako. Kunin mo na ang mga dokumento.'],
        ['Mang Tomas', 'Isasara muna ang mga resort niya hanggang malinis ang dagat. Ibabalik natin ang Boracay sa mga taga-Boracay!'],
        ['Ate Maya (sa telepono)', 'Nonoy! Ang galing mo! Pero... sa mga dokumento ni Coral, may pangalang paulit-ulit: DON FACUNDO — ang may-ari ng mga barko ng sindikato sa Palawan.'],
        [N, 'Ang huling paraiso... Palawan. Pupunta ako.'],
      ]),
    ],
    done(c, ok) { removePeds(c.pating); if (ok) { G.flags.ch6 = 'done'; setTimeout(() => UI.ending('ch6'), 600); } },
  },
  // ---------------- KABANATA 7: PALAWAN ----------------
  { // 39
    id: 'huling-paraiso', title: 'Ang Huling Paraiso', giver: 'tomas', reward: 6000, chapter: 7,
    desc: 'Lumipad sa Palawan at kausapin si Mang Kanor.',
    cp: { stage: 3, pos: () => MAP.pois.airport_p },
    stages: [
      comic([
        ['🏝️🐢🌳', 'Ang Palawan — ang huling paraiso ng Pilipinas. Mga ilog sa ilalim ng lupa, mga lagoon, mga hayop na wala saan man.'],
        ['🚢💣🦎', 'Pero ang mga barko ni DON FACUNDO ay nagnanakaw ng mga hayop, sumasabog ng isda, at sumisira sa mga bahura.'],
        ['🌴🏞️🦇', 'KABANATA 7: PALAWAN — ANG HULING PARAISO'],
      ]),
      talk([['Mang Tomas', 'May kakilala ako sa Palawan — si Mang Kanor, isang gabay sa gubat. Siya ang tutulong sa iyo. Ingat, iho!']]),
      flyTo('airport_p', (x) => PALW.in(x)),
      { obj: 'Puntahan si Mang Kanor sa Puerto Princesa', target: () => MAP.pois.kanor, update: () => near(MAP.pois.kanor, 110) },
      talk([
        ['Mang Kanor', 'Ikaw ba ang Hari ng Kalsada? Narinig ko na ang tungkol sa iyo. Maligayang pagdating sa Palawan.'],
        ['Mang Kanor', 'Ang mga tauhan ni Don Facundo — nanghuhuli ng pawikan at pangolin, at nagpapasabog ng isda sa bahura.'],
        ['Mang Kanor', 'Una, kailangan nating makita ang kuta nila. Sabi ng mga bangkero, dumadaan sila sa Underground River. Tara!'],
      ]),
    ],
  },
  { // 40
    id: 'ilog-sa-ilalim', title: 'Ilog sa Ilalim ng Lupa', giver: 'kanor', reward: 7000, chapter: 7,
    desc: 'Dumaan sa Underground River sakay ng bangka.',
    cp: { stage: 1, pos: () => pal().riverDock },
    stages: [
      talk([['Mang Kanor', 'Sakay ka sa bangka sa pantalan ng Sabang. Dahan-dahan sa loob ng kweba — madilim at makitid!']]),
      {
        obj: 'Pumunta sa pantalan ng Sabang at sumakay sa bangka',
        enter(c) { const d = pal().riverDock; c.boat = laneSpawn('bangka', d.x - 2 * T, d.y + 2 * T, 0, { color: '#16a085' }); },
        target: (c) => c.boat, update(c) { if (c.boat.dead) return 'Nasira ang bangka!'; return G.player.vehicle === c.boat; },
      },
      {
        obj: (c) => c.cps ? `🦇 Underground River ${c.pi + 1}/${c.cps.length}` : '',
        enter(c) { c.cps = pal().river.slice(); c.pi = 0; },
        target: (c) => c.cps ? Object.assign({ cp: true, n: c.pi + 1 }, c.cps[c.pi]) : null,
        update(c) {
          if (!c.cps) return false;
          if (c.boat.dead) return 'Nasira ang bangka!';
          if (G.player.vehicle !== c.boat) return 'Bumaba ka sa bangka!';
          if (U.dist(c.boat.x, c.boat.y, c.cps[c.pi].x, c.cps[c.pi].y) < 90) { c.pi++; AUD.checkpoint(); if (c.pi >= c.cps.length) { UI.big('🦇 NAKITA MO ANG LIHIM NA DAAN!', 'May mga kahon ng hayop sa dulo ng kweba...', 2.4, 'good'); return true; } }
        },
      },
      talk([
        ['Mang Kanor', 'Mga hawla ng pangolin at mga itlog ng pawikan! Dito nila itinatago bago isakay sa barko.'],
        ['Mang Kanor', 'At tingnan mo — may van na umaalis papuntang timog. Mga mangangaso iyon! Habulin natin!'],
      ]),
    ],
    done(c) { if (c.boat) c.boat.mission = false; },
  },
  { // 41
    id: 'mangangaso', title: 'Mga Mangangaso', giver: 'kanor', reward: 8000, chapter: 7,
    desc: 'Pahintuin ang van ng mga mangangaso at iligtas ang mga hayop.',
    cp: { stage: 1, pos: () => ({ x: pal().cx(1), y: pal().cy(2) + 60 }), car: 'pickup' },
    stages: [
      talk([['Mang Kanor', 'Sumakay ka! Ang van nila — papuntang gubat sa timog. Huwag mong hayaang makarating sa kampo!']]),
      chaseStage('Pahintuin ang van ng mga mangangaso! 🚐', (c) => {
        const P = G.player, S = pal().south;
        if (!P.vehicle) c.car = laneSpawn('pickup', P.x + 40, P.y, 0, { color: '#16a085' });
        c.m = laneSpawn('van', S[0].x + 30, S[0].y + 120, Math.PI / 2, { color: '#5a4a3a' }); c.m.driver = 'ai'; c.m.criminal = true; c.m.maxhp = c.m.hp = 380;
        c.m.ai = new PathDriver(c.m, S.slice(1).concat([pal().camp]), { cruise: 200, solid: true });
        UI.boss = { name: '🚐 Van ng mga mangangaso', v: c.m };
      }, {
        win: '🐾 NAILIGTAS ANG MGA HAYOP!', escape: 'Nakarating ang van sa kampo!',
        goons(c) { const alive = (c.goons || []).filter(v => !v.dead && !v.remove); if (c.spawned < 3 && alive.length < 2 && c.t > 6 + c.spawned * 7 && landGoonCar(c, pal().pts.concat(pal().south), G.player, () => G.player.vehicle || G.player)) { c.spawned++; UI.toast('🛻 Mga tauhan ni Facundo!'); } },
      }),
      talk([
        ['Mang Kanor', 'Mga pangolin! Buhay pa sila. Ibabalik natin sila sa gubat.'],
        ['Mang Kanor', 'May balita ang mga mangingisda — nagpapasabog ng dinamita ang mga bangka ni Facundo sa bahura. Kailangan natin silang pigilan!'],
      ]),
    ],
    done(c) { UI.boss = null; if (c.m) c.m.mission = false; if (c.car) c.car.mission = false; for (const v of c.goons || []) { v.mission = false; v.criminal = false; } },
  },
  { // 42
    id: 'bantay-dagat', title: 'Bantay Dagat', giver: 'kanor', reward: 9000, chapter: 7,
    desc: 'Pigilan ang tatlong bangka na nagpapasabog ng isda sa bahura.',
    cp: { stage: 1, pos: () => pal().riverDock },
    stages: [
      {
        obj: 'Sumakay sa speedboat ng Bantay Dagat',
        enter(c) { const d = pal().riverDock; c.boat = laneSpawn('lancha', d.x - 3 * T, d.y + 4 * T, Math.PI / 2, { color: '#2e86c1' }); c.boat.maxhp = c.boat.hp = 220; c.boat.siren = false; },
        target: (c) => c.boat, update(c) { if (c.boat.dead) return 'Nasira ang speedboat!'; return G.player.vehicle === c.boat; },
      },
      {
        obj: (c) => `💣 Pigilan ang mga bangkang nagpapasabog (${c.stopped || 0}/3)`,
        enter(c) {
          c.stopped = 0; c.bad = [];
          for (const p of pal().reef) { const v = laneSpawn('bangka', p.x, p.y, U.rand(0, TAU), { color: '#3b3b3b' }); v.criminal = true; v.maxhp = v.hp = 90; v.driver = 'ai'; v.ai = new PathDriver(v, [p, { x: p.x - 160, y: p.y + 120 }, { x: p.x + 60, y: p.y + 220 }, { x: p.x + 80, y: p.y - 60 }], { cruise: 120, loop: true, solid: true }); c.bad.push(v); }
          c.boomT = 2;
        },
        target: (c) => { const l = (c.bad || []).filter(v => !v.stopped); const P = G.player; return l.length ? l.reduce((a, b) => U.d2(a.x, a.y, P.x, P.y) < U.d2(b.x, b.y, P.x, P.y) ? a : b) : null; },
        update(c, dt) {
          if (!c.bad) return false;
          if (c.boat.dead) return 'Nasira ang speedboat!';
          c.boomT -= dt;
          if (c.boomT <= 0) { c.boomT = U.rand(2.5, 4); const v = U.choice(c.bad.filter(b => !b.stopped)); if (v) { G.particle('boom', v.x + U.rand(-60, 60), v.y + U.rand(-60, 60)); if (U.dist(v.x, v.y, G.player.x, G.player.y) < 900) AUD.explosion(); } }
          for (const v of c.bad) if (!v.stopped && holdAlive(v, 0.15)) { v.stopped = true; v.ai = null; v.driver = null; v.throttle = 0; c.stopped++; UI.toast(`⚓ Nahuli ang bangka ${c.stopped}/3!`); AUD.success(); }
          return c.stopped >= 3;
        },
      },
      talk([
        ['Mang Kanor', 'Salamat! Ligtas na ang bahura — babalik ang mga isda.'],
        ['Mang Kanor', 'Sabi ng mga nahuli — nasa kampo sa gubat si Don Facundo mismo, naghahanda ng huling kargamento. Ito na ang huling laban.'],
      ]),
    ],
    done(c) { if (c.boat) c.boat.mission = false; for (const v of c.bad || []) { v.mission = false; v.criminal = false; } },
  },
  { // 43
    id: 'kampo-ni-facundo', title: 'Kampo ni Facundo', giver: 'kanor', reward: 60000, chapter: 7,
    desc: 'Pasukin ang kampo ni Don Facundo sa gubat — ang huling laban.',
    cp: { stage: 1, pos: () => ({ x: pal().camp.x + 260, y: pal().camp.y + 200 }) },
    stages: [
      talk(() => {
        const allies = [['Mang Kanor', 'Ang kampo ay nasa dulo ng daan sa timog. Sasamahan ka ng mga bantay-gubat!']];
        if (G.flags.ch6) allies.push(['Mang Tomas (sa telepono)', 'Iho! Kasama mo ang buong Boracay sa laban na ito!']);
        if (G.flags.fam && G.flags.fam.stage === 'married') allies.push([LOVERS[G.flags.fam.partner].name + ' (sa telepono)', 'Mag-ingat ka, mahal. Hinihintay ka namin sa bahay. 💗']);
        return allies;
      }),
      { obj: 'Pumunta sa kampo ni Don Facundo sa gubat', target: () => pal().camp, update: () => near(pal().camp, 320) },
      {
        obj: (c) => { const l = (c.pating || []).filter(p => !p.ko && !p.remove).length; return `Talunin si Don Facundo at ang mga tauhan niya (${l} natitira)`; },
        enter(c) { const k = pal().camp; spawnPating(c, k.x, k.y, 7, 180, { hostile: true }); c.boss = spawnBoss(c, k.x, k.y - 30, '🎩 Don Facundo', CHARS.facundo.look, 320); },
        target: (c) => { const l = (c.pating || []).filter(p => !p.ko && !p.remove); return l[0] || null; },
        update(c) { return (c.pating || []).every(p => p.ko || p.remove); },
      },
      talk([
        ['Don Facundo', 'Paano... paano mo ako natalo? Ang buong Pilipinas ay negosyo ko!'],
        [N, 'Hindi negosyo ang Pilipinas. Tahanan ito.'],
        ['Mang Kanor', 'Ang mga hayop, ang gubat, ang dagat — maliligtas na. Salamat, Hari ng Kalsada.'],
      ]),
      { obj: '', enter() { UI.comic(CH7.panels()); }, update: () => !UI.talking },
    ],
    done(c, ok) { removePeds(c.pating); if (ok) { G.flags.ch7 = 'done'; setTimeout(() => UI.ending('ch7'), 600); } },
  },
);
MISSIONS.forEach(m => { m.chapter = m.chapter || 1; });

const CH7 = {
  panels() {
    return [
      ['🐢🌊🏝️', 'Bumalik ang mga pawikan sa dalampasigan ng Palawan. Ang bahura, unti-unting nabubuhay muli.'],
      ['🏙🌾🏝🦅🌲🏖🌴', 'Manila, San Isidro, Cebu, Davao, Baguio, Boracay, Palawan — pitong lugar, iisang puso.'],
      ['👑🇵🇭🌅', 'WAKAS NG KABANATA 7: Ang Hari ng Kalsada ay hindi hari ng iisang lungsod — kundi tagapagtanggol ng buong bayan.'],
    ];
  },
};
var EXTRA_ENDINGS = {
  get ch6() { return ['🏖 TAPOS ANG KABANATA 6!', 'Malinis na muli ang dagat ng Boracay at nakulong si Señora Coral. Pero may isa pang pangalan sa mga dokumento... BUKAS NA ANG KABANATA 7 — kausapin si Mang Tomas!']; },
  get ch7() { const P = G.player, st = G.stats; return ['🌴 TAPOS ANG KABANATA 7!', `Iniligtas mo ang huling paraiso! Natapos mo ang lahat ng 7 kabanata at ${MISSIONS.length} misyon. Level ${P.level || 1} · ${st.escapes || 0} beses nakatakas. Maraming salamat sa paglalaro ng HARI NG KALSADA — abangan ang susunod na update!`]; },
};
