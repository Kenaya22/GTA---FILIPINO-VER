'use strict';
// ===== Story missions, shops, side jobs =====
const CHARS = {
  tito: { name: 'Tito Boy', look: { skin: '#a86b3c', shirt: '#f0f0f0', pat: 'sando', outfit: 'npc', hair: 'cap_blue', hairCol: '#222', pants: '#3b3b3b' } },
  nena: { name: 'Aling Nena', look: { skin: '#d9a066', shirt: '#e84393', pat: 'floral', outfit: 'npc', hair: 'long', hairCol: '#2b1d14', pants: '#4a3b2a' } },
  ben: { name: 'Mang Ben', look: { skin: '#9a5f35', shirt: '#4b5a32', pat: 'plain', outfit: 'npc', hair: 'buzz', hairCol: '#222', pants: '#2b3a55' } },
  paeng: { name: 'Kuya Paeng', look: { skin: '#c68b59', shirt: '#24262b', pat: 'plain', outfit: 'npc', hair: 'mohawk', hairCol: '#c0392b', pants: '#1f2633' } },
  tikboy: { name: 'Boss Tikboy', look: { skin: '#e0b07a', shirt: '#efe6cf', pat: 'barong', outfit: 'npc', hair: 'bald', hairCol: '#111', pants: '#1f2633' } },
  lola: { name: 'Lola Isyang', look: { skin: '#c68b59', shirt: '#8e2b3a', pat: 'floral', outfit: 'npc', hair: 'long', hairCol: '#cfcfcf', pants: '#3b3b3b' } },
  ditas: { name: 'Mang Ditas', look: { skin: '#9a5f35', shirt: '#f0f0f0', pat: 'sando', outfit: 'npc', hair: 'bucket', hairCol: '#222', pants: '#4a3b2a' } },
  luz: { name: 'Kapitana Luz', look: { skin: '#d9a066', shirt: '#2e6fd1', pat: 'barong', outfit: 'npc', hair: 'long', hairCol: '#1b1410', pants: '#1f2633' } },
  severo: { name: 'Don Severo', look: { skin: '#e0b07a', shirt: '#efe6cf', pat: 'barong', outfit: 'npc', hair: 'cap_red', hairCol: '#666', pants: '#1f2633' } },
  goon: { name: 'Tauhan ni Don', look: { skin: '#a86b3c', shirt: '#24262b', pat: 'plain', outfit: 'npc', hair: 'buzz', hairCol: '#111', pants: '#1f2633' } },
  kulas: { name: 'Kulas', look: { skin: '#b87a4b', shirt: '#6b7280', pat: 'hood', outfit: 'npc', hair: 'curly', hairCol: '#1b1410', pants: '#3b3b3b' } },
};
const N = 'Nonoy';

function laneSpawn(type, x, y, a, opt) {
  const v = new Vehicle(type, x, y, a, opt); v.mission = true; G.vehicles.push(v); return v;
}
function stopAt(v, pt, r, c, key, hold = 0.8) {
  if (!v || U.dist(v.x, v.y, pt.x, pt.y) > r) { c[key] = 0; return false; }
  if (v.speed > 60) return false;
  c[key] = (c[key] || 0) + G.dt;
  return c[key] > hold;
}
function talk(lines) {
  return { obj: '', enter() { UI.say(typeof lines === 'function' ? lines() : lines); }, update() { return !UI.talking; } };
}
function waitingPeds(c, pt, n) {
  c.waiting = [];
  for (let k = 0; k < n; k++) {
    const p = new Person(pt.x + U.rand(-30, 30), pt.y + U.rand(-8, 8), 'ped'); p.npc = true; p.state = 'idle'; p.keep = true;
    G.peds.push(p); c.waiting.push(p);
  }
}
function removePeds(list) { if (list) for (const p of list) p.remove = true; }
function comic(panels) { return { obj: '', enter() { UI.comic(panels); }, update() { return !UI.talking; } }; }
function near(pt, r) { const P = G.player, me = P.vehicle || P; return U.dist(me.x, me.y, pt.x, pt.y) < r; }
function spawnGoonCar(near, target, minD = 700, maxD = 1300) {
  const pts = MAP.prov.pts.concat(MAP.prov.loop);
  for (let k = 0; k < 20; k++) {
    const p = U.choice(pts), d = U.dist(p.x, p.y, near.x, near.y);
    if (d < minD || d > maxD || TRAFFIC.inView(p.x, p.y, 60)) continue;
    const v = new Vehicle('mayor', p.x, p.y, Math.atan2(near.y - p.y, near.x - p.x), { color: '#14161b' });
    v.driver = 'ai'; v.mission = true; v.goon = true; v.criminal = true; v.maxhp = v.hp = 150;
    v.ai = new GoonDriver(v, target); G.vehicles.push(v); return v;
  }
  return null;
}

const MISSIONS = [
  { // 1
    id: 'bagong-salta', title: 'Bagong Salta', giver: 'tito', reward: 800,
    cp: { stage: 2, pos: () => MAP.pois.tito },
    desc: 'Dumating sa Manila at tulungan si Tito Boy sa pamamasada.',
    stages: [
      {
        obj: 'Puntahan si Tito Boy sa jeepney terminal (Tondo). Tip: hiramin ang tricycle!',
        target: () => MAP.pois.tito,
        enter(c) {
          UI.say([
            [N, 'Grabe, Manila na talaga! Ang daming jeep, ang daming tao...'],
            [N, 'Kailangan kong mahanap si Tito Boy. Siya raw ang tutulong sa amin para mabawi ang lupa namin sa probinsya.'],
            [N, 'Nasa terminal daw siya ng jeep sa Tondo. Medyo malayo... may tricycle dito oh.'],
          ]);
        },
        update(c) { const t = MAP.pois.tito; return U.dist(G.player.x, G.player.y, t.x, t.y) < 110; },
      },
      talk([
        ['Tito Boy', 'Nonoy! Pamangkin ko! Ang laki mo na ah! Kumusta ang Samar?'],
        [N, 'Tito, hindi po maganda. Kinuha ni Boss Tikboy yung lupa namin. Sangla raw, may utang daw si Itay.'],
        ['Tito Boy', 'Si Tikboy... tauhan ni Mayor Kurakot yan. Lahat ng masama dito, sila ang may pakana.'],
        ['Tito Boy', 'O siya, dito ka muna. Kailangan mong kumita. Marunong ka bang mag-drive ng jeep?'],
        [N, 'Opo naman! Sa probinsya, kalabaw lang ang medyo mahirap i-park.'],
        ['Tito Boy', 'Hahaha! Sige, gamitin mo ang jeep ko. Pasadahin mo — Divisoria papuntang Quiapo.'],
      ]),
      {
        obj: 'Sumakay sa jeepney ni Tito Boy',
        enter(c) {
          const t = MAP.pois.tito;
          c.jeep = laneSpawn('jeepney', t.x + 160, MAP.laneY(2, 0), 0, { color: '#c0392b' });
          c.jeep.color2 = '#f1c40f'; c.jeep.color3 = '#2e86c1';
        },
        target: (c) => c.jeep,
        update(c) { if (c.jeep.dead) return 'Nasira ang jeepney ni Tito Boy!'; return G.player.vehicle === c.jeep; },
      },
      {
        obj: 'Sunduin ang mga pasahero sa Divisoria (huminto sa marker)',
        enter(c) { c.stopA = MAP.door(3, 0, 'S', 2); waitingPeds(c, c.stopA, 4); UI.toast('Sakay na! Bayad po, bayad!'); },
        target: (c) => G.player.vehicle === c.jeep ? Object.assign({ stop: true }, c.stopA) : c.jeep,
        update(c) {
          if (c.jeep.dead) return 'Nasira ang jeepney ni Tito Boy!';
          if (G.player.vehicle !== c.jeep) return false;
          if (stopAt(c.jeep, c.stopA, 100, c, 'h')) { removePeds(c.waiting); c.jeep.passengers = 4; AUD.coin(); UI.toast('🧍🧍🧍🧍 Sumakay ang 4 na pasahero'); return true; }
        },
      },
      {
        obj: 'Ihatid ang mga pasahero sa Simbahan ng Quiapo',
        enter(c) { c.stopB = MAP.door(6, 1, 'S'); c.h = 0; UI.say([['Pasahero', 'Kuya, sa Quiapo lang po. Para po sa tapat ng simbahan!']]); },
        target: (c) => G.player.vehicle === c.jeep ? Object.assign({ stop: true }, c.stopB) : c.jeep,
        update(c) {
          if (c.jeep.dead) return 'Nasira ang jeepney ni Tito Boy!';
          if (G.player.vehicle !== c.jeep) return false;
          if (stopAt(c.jeep, c.stopB, 100, c, 'h')) { c.jeep.passengers = 0; G.addMoney(52); UI.toast('Salamat po, Kuya! (+₱52 pamasahe)'); return true; }
        },
      },
      {
        obj: 'Ibalik ang jeepney sa terminal ni Tito Boy',
        target: (c) => G.player.vehicle === c.jeep ? Object.assign({ stop: true }, MAP.pois.home) : c.jeep,
        update(c) {
          if (c.jeep.dead) return 'Nasira ang jeepney ni Tito Boy!';
          return G.player.vehicle === c.jeep && stopAt(c.jeep, MAP.pois.home, 140, c, 'h2');
        },
      },
      talk([
        ['Tito Boy', 'Ayos! Buo pa ang jeep ko. Magaling ka, Nonoy!'],
        ['Tito Boy', 'Pero hindi sapat ang pamamasada para mabawi ang lupa ninyo. Puntahan mo si Mang Ben sa talyer niya sa Paco.'],
        ['Tito Boy', 'Tip: kapag nakasakay ka sa kahit anong jeepney, pwede kang mag-PASADA para kumita.'],
      ]),
    ],
    done(c) { if (c.jeep) { c.jeep.mission = false; } },
  },
  { // 2
    id: 'hiram-muna', title: 'Hiram Muna', giver: 'ben', reward: 1500,
    cp: { stage: 1, pos: () => { const d = MAP.door(7, 6, 'N'); return { x: d.x - 260, y: d.y }; } },
    desc: 'Kunin ang pulang SUV sa Makati para kay Mang Ben.',
    stages: [
      talk([
        ['Mang Ben', 'Ikaw ba yung pamangkin ni Boy? Sakto. May "customer" ako na gusto ng pulang SUV.'],
        ['Mang Ben', 'May nakaparada sa Makati. Hiramin mo lang... habambuhay. Hehe.'],
        ['Mang Ben', 'Pero ingat — may alarma yan. Kapag may humabol na pulis, iwala mo muna bago ka bumalik dito.'],
        ['Mang Ben', 'Ayokong may pulis na sumunod sa talyer ko!'],
      ]),
      {
        obj: 'Kunin ang pulang SUV sa Makati',
        enter(c) { const d = MAP.door(7, 6, 'N'); c.suv = laneSpawn('suv', d.x, d.y, 0, { color: '#c0392b' }); },
        target: (c) => c.suv,
        update(c) {
          if (c.suv.dead) return 'Nasira ang SUV!';
          if (G.player.vehicle === c.suv) {
            AUD.tone(1400, 0.15, 'square', 0.1); AUD.tone(1000, 0.15, 'square', 0.1, 0, 0.18); AUD.tone(1400, 0.15, 'square', 0.1, 0, 0.36);
            UI.toast('🚨 WEE-WOO! Nag-alarma ang SUV! May tumawag ng pulis!');
            WANTED.setStars(2); WANTED.spotted('cop', 100);
            return true;
          }
        },
      },
      {
        obj: (c) => G.player.vehicle !== c.suv ? 'Bumalik sa pulang SUV' : WANTED.stars > 0 ? 'Iwala muna ang mga pulis! (lumabas sa search zone)' : 'Dalhin ang SUV sa talyer ni Mang Ben',
        target: (c) => G.player.vehicle !== c.suv ? c.suv : WANTED.stars > 0 ? null : Object.assign({ stop: true }, MAP.pois.mangben),
        update(c) {
          if (c.suv.dead) return 'Nasira ang SUV!';
          return G.player.vehicle === c.suv && WANTED.stars === 0 && stopAt(c.suv, MAP.pois.mangben, 110, c, 'h');
        },
      },
      {
        obj: '', enter(c) { G.exitVehicle(true); c.suv.remove = true; G.player.x = MAP.pois.mangben.x; G.player.y = MAP.pois.mangben.y + 10; },
        update() { return true; },
      },
      talk([
        ['Mang Ben', 'Wow, ganda! Walang gasgas... halos. Heto ang bayad mo.'],
        ['Mang Ben', 'Simula ngayon, pwede mo nang ibenta sa akin ang kahit anong sasakyan na "mahiram" mo. Dalhin mo lang dito.'],
        ['Mang Ben', 'Si Aling Nena sa sari-sari sa Tondo, may trabaho raw para sa iyo.'],
      ]),
    ],
  },
  { // 3
    id: 'mainit-pa', title: 'Mainit Pa!', giver: 'nena', reward: 1200,
    cp: { stage: 1, pos: () => ({ x: MAP.pois.lechonan.x - 500, y: MAP.laneY(0, 0) }), car: 'sedan' },
    desc: 'Ihatid ang lechon sa pista bago lumamig.',
    stages: [
      talk([
        ['Aling Nena', 'Ay, ikaw si Nonoy! Ang pogi pala, kamukha ng tatay mo nung bata pa. Ehem.'],
        ['Aling Nena', 'Fiesta ngayon sa Tondo pero na-late ang lechon! Nasa Lechonan pa sa Sampaloc.'],
        ['Aling Nena', 'Kunin mo at ihatid sa pista HABANG MAINIT PA. At huwag mong ibabangga — madudurog ang balat!'],
      ]),
      {
        obj: 'Sumakay sa sasakyan at pumunta sa Lechonan sa Sampaloc',
        target: () => G.player.vehicle ? Object.assign({ stop: true }, MAP.pois.lechonan) : MAP.pois.lechonan,
        update(c) {
          const v = G.player.vehicle;
          if (v && stopAt(v, MAP.pois.lechonan, 110, c, 'h', 1.2)) { c.v = v; c.hp0 = v.hp; c.time = Math.round(50 * D().timer); AUD.coin(); UI.toast('🐷 Naikarga ang lechon! Bilisan mo!'); return true; }
        },
      },
      {
        obj: (c) => `Ihatid ang lechon sa Pista sa Tondo! ⏱ ${Math.ceil(c.time)}s · Lechon ${Math.max(0, Math.round(100 - (c.hp0 - c.v.hp) / 45 * 100))}%`,
        target: () => Object.assign({ stop: true }, MAP.pois.fiesta),
        update(c, dt) {
          c.time -= dt;
          if (c.time <= 0) return 'Lumamig na ang lechon!';
          if (c.v.hp < c.hp0 - 45 || c.v.dead) return 'Nadurog ang lechon!';
          if (G.player.vehicle !== c.v) { c.out = (c.out || 0) + dt; if (c.out > 3) return 'Iniwan mo ang lechon!'; } else c.out = 0;
          return stopAt(c.v, MAP.pois.fiesta, 120, c, 'h');
        },
      },
      talk([
        ['Taga-Tondo', 'DUMATING NA ANG LECHON!!! 🎉'],
        ['Aling Nena', 'Ang galing mo, iho! Heto, para sa iyo. Bumalik ka sa tindahan ko mamaya ha, may sasabihin ako.'],
      ]),
    ],
  },
  { // 4
    id: 'bagong-itsura', title: 'Bagong Itsura', giver: 'nena', reward: 1000,
    cp: { stage: 1, pos: () => MAP.pois.nena },
    desc: 'Hinahanap ka ng pulis. Magbagong-anyo at tumakas.',
    stages: [
      talk([
        ['Aling Nena', 'Nonoy! Psst! Kalat na sa barangay — may CCTV kuha ka raw nung kinuha mo yung pulang SUV!'],
        ['Aling Nena', 'Alam na ng pulis ang mukha mo, damit mo, at sasakyan mo. Paparating na sila!'],
        ['Aling Nena', 'Makinig ka: ang pulis, kinikilala ka lang sa nakikita nila. Magpalit ka ng damit sa Ukay-Ukay, magpagupit sa Barberya, at magpalit ng sasakyan!'],
        ['Aling Nena', 'Libre na yan, sagot ko na. Takbo na!'],
      ]),
      {
        obj: () => WANTED.mode === 'chase' ? 'TUMAKAS! Mawala sa paningin ng pulis' : 'Magpalit ng itsura: 👕 Ukay-Ukay · 💈 Barberya · 🚗 ibang sasakyan — at lumayo!',
        enter(c) {
          MS.freeShops = true;
          WANTED.setStars(3); WANTED.spotted('cctv', 0);
          WANTED.prof = Object.assign(WANTED.current(), { car: G.player.vehicle ? G.player.vehicle.ident : 'old-suv' });
          WANTED.cctvT = 10;
        },
        target: () => null,
        update() { return WANTED.stars === 0; },
      },
      talk([
        ['Aling Nena', 'Hay salamat, ligtas ka! Tandaan mo yan: ang pulis, hindi ka makikilala kung iba na ang itsura mo.'],
        ['Aling Nena', 'Si Kuya Paeng sa Baywalk, naghahanap daw ng mabilis na driver. Puntahan mo.'],
      ]),
    ],
    done() { MS.freeShops = false; },
  },
  { // 5
    id: 'karera', title: 'Karera sa Baywalk', giver: 'paeng', reward: 2500,
    cp: { stage: 1, pos: () => MAP.pois.paeng },
    desc: 'Talunin ang mga karerista ng Manila.',
    stages: [
      talk([
        ['Kuya Paeng', 'Ikaw yung probinsyanong mabilis daw mag-drive? Patunayan mo.'],
        ['Kuya Paeng', 'Karera tayo, 10 checkpoints, ikot sa buong Manila. Pahihiramin kita ng kotse ko.'],
        ['Kuya Paeng', 'Pag nanalo ka, sa iyo na ang kotse. Pag natalo ka... ikaw ang maghuhugas nito buong taon.'],
      ]),
      {
        obj: 'Sumakay sa kotseng pangkarera',
        enter(c) {
          const x = MAP.cx(0), y0 = MAP.cy(5) - 260;
          c.car = laneSpawn('sports', MAP.laneX(0, 1), y0, Math.PI / 2, { color: '#f28c28' });
          c.r1 = laneSpawn('sports', MAP.laneX(0, 3), y0 - 30, Math.PI / 2, { color: '#2e86c1' });
          c.r2 = laneSpawn('sports', MAP.laneX(0, 1), y0 - 110, Math.PI / 2, { color: '#8e44ad' });
          for (const r of [c.r1, c.r2]) { r.driver = 'ai'; r.name = r === c.r1 ? 'Kuya Paeng' : 'Bryan'; }
          c.cps = [[0, 7], [2, 7], [2, 8], [5, 8], [5, 6], [7, 6], [7, 4], [4, 4], [4, 5], [0, 5]].map(([i, j]) => ({ x: MAP.cx(i), y: MAP.cy(j) }));
        },
        target: (c) => c.car,
        update(c) { if (c.car.dead) return 'Nasira ang kotse ni Paeng!'; return G.player.vehicle === c.car; },
      },
      {
        obj: 'Humanda...', target: () => null,
        enter(c) { c.cd = 3.5; c.last = 4; },
        update(c, dt) {
          c.cd -= dt;
          for (const v of [c.car, c.r1, c.r2]) { v.vx = 0; v.vy = 0; }
          const n = Math.ceil(c.cd);
          if (n !== c.last && n > 0) { c.last = n; UI.big(String(n), '', 0.8); AUD.beep(); }
          if (c.cd <= 0) { UI.big('GO!', '', 0.8); AUD.tone(1600, 0.4, 'square', 0.1); c.pi = 0; c.ri = [0, 0]; c.rt = [0, 0]; return true; }
        },
      },
      {
        obj: (c) => `KARERA! Checkpoint ${c.pi + 1}/${c.cps.length} · Posisyon: ${c.pos || 1}/3`,
        target: (c) => Object.assign({ cp: true, n: c.pi + 1 }, c.cps[c.pi]),
        update(c, dt) {
          if (c.car.dead) return 'Nasira ang kotse ni Paeng!';
          if (G.player.vehicle !== c.car) { c.out = (c.out || 0) + dt; if (c.out > 5) return 'Bumaba ka sa karera!'; } else c.out = 0;
          const p = c.cps[c.pi];
          if (U.dist(c.car.x, c.car.y, p.x, p.y) < 120) { c.pi++; AUD.checkpoint(); if (c.pi >= c.cps.length) return true; }
          // rivals
          const prog = (idx, v) => idx * 10000 - U.dist(v.x, v.y, c.cps[Math.min(idx, c.cps.length - 1)].x, c.cps[Math.min(idx, c.cps.length - 1)].y);
          const pp = prog(c.pi, c.car);
          let pos = 1;
          [c.r1, c.r2].forEach((r, k) => {
            if (r.dead) return;
            const idx = c.ri[k];
            if (idx >= c.cps.length) { pos++; return; }
            const cp = c.cps[idx];
            const nx = c.cps[Math.min(idx + 1, c.cps.length - 1)];
            const d = U.dist(r.x, r.y, cp.x, cp.y);
            if (d < 110) c.ri[k]++;
            const rp = prog(idx, r);
            if (rp > pp) pos++;
            const desired = Math.atan2(cp.y - r.y, cp.x - r.x);
            const diff = U.angDiff(r.a, desired);
            const turn = Math.abs(U.angDiff(desired, Math.atan2(nx.y - cp.y, nx.x - cp.x)));
            const fs = r.fwd();
            let tgt = 640 * (k === 0 ? 0.93 : 0.86);
            if (rp > pp + 600) tgt *= 0.85; else if (rp < pp - 900) tgt *= 1.06;
            if (turn > 0.8 && d < 300) tgt = 300;
            if (Math.abs(diff) > 0.6) tgt = Math.min(tgt, 240);
            r.steer = U.clamp(diff * 2.5, -1, 1);
            r.throttle = fs < tgt ? 1 : -0.6;
            r.hand = Math.abs(diff) > 1.2 && fs > 280;
            c.rt[k] = Math.abs(fs) < 20 ? c.rt[k] + dt : 0;
            if (c.rt[k] > 1.5) { r.throttle = -1; r.steer = -Math.sign(diff); if (c.rt[k] > 2.4) c.rt[k] = 0; }
          });
          c.pos = pos;
          if (c.ri[0] >= c.cps.length) return 'Nauna si Kuya Paeng! Natalo ka.';
          if (c.ri[1] >= c.cps.length) return 'Nauna si Bryan! Natalo ka.';
        },
      },
      talk([
        ['Kuya Paeng', 'ANO?! Tinalo mo ako?! ...Respeto, pare. Sa iyo na ang kotse.'],
        ['Kuya Paeng', 'Iparada mo lang sa terminal ni Tito Boy, lagi mong makukuha doon.'],
        ['Kuya Paeng', 'Ay, at si Boss Tikboy sa Binondo... hinahanap ka. Mag-ingat ka sa taong yun.'],
      ]),
    ],
    done(c, ok) { if (ok) G.unlock.sports = true; for (const v of [c.r1, c.r2]) if (v) { v.mission = false; v.driver = 'ai'; v.ai = new RoadDriver(v); } if (c.car) c.car.mission = false; },
  },
  { // 6
    id: 'singilan', title: 'Singilan', giver: 'tikboy', reward: 2000,
    cp: { stage: 1, pos: () => ({ x: MAP.cx(4) - 400, y: MAP.laneY(1, 0) }), car: 'sedan' },
    desc: 'Singilin si Kulas para kay Boss Tikboy.',
    stages: [
      talk([
        ['Boss Tikboy', 'Ikaw ang anak ni Dela Cruz. Yung may utang sa akin. Hehehe.'],
        ['Boss Tikboy', 'Gusto mong mabawasan ang utang ng pamilya mo? May trabaho ako. Si Kulas, tatlong buwan nang hindi nagbabayad ng 5-6.'],
        ['Boss Tikboy', 'Nasa Binondo ang van niya. Singilin mo. Kung tumakbo... alam mo na.'],
        [N, '(Gagawin ko muna ito... para malaman ko kung paano kumikilos si Tikboy at si Mayor.)'],
      ]),
      {
        obj: 'Hanapin ang van ni Kulas sa Binondo',
        enter(c) {
          c.van = laneSpawn('van', MAP.cx(4) + 220, MAP.laneY(1, 0), 0, { color: '#7f8c8d' });
          c.van.driver = 'ai'; c.van.ai = new RoadDriver(c.van, { cruise: 0 }); c.van.ai.stopT = 9999;
        },
        target: (c) => c.van,
        update(c) {
          if (U.dist(G.player.x, G.player.y, c.van.x, c.van.y) < 380) {
            c.van.ai = new RoadDriver(c.van, { cruise: 400, ignoreLights: true }); c.van.maxhp = 220; c.van.hp = 220;
            UI.say([['Kulas', 'Hala! Tauhan ni Tikboy! TAKBOOO!']]); return true;
          }
        },
      },
      {
        obj: (c) => `Habulin at banggain ang van ni Kulas! (Van: ${Math.max(0, Math.round((c.van.hp - 55) / 165 * 100))}%)`,
        target: (c) => c.van,
        update(c, dt) {
          if (c.van.hp <= 55) {
            c.van.invuln = true; c.van.hp = Math.max(c.van.hp, 20); c.van.ai = null; c.van.driver = null; c.van.throttle = 0; c.van.hand = true;
            return true;
          }
          if (c.van.hp < 80) c.van.invuln = true;
          const d = U.dist(G.player.x, G.player.y, c.van.x, c.van.y);
          if (d > 1500) { c.far = (c.far || 0) + dt; if (c.far > 6) return 'Nakatakas si Kulas!'; } else c.far = 0;
        },
      },
      {
        obj: 'Bumaba at kausapin si Kulas',
        enter(c) {
          const v = c.van; let px = v.x - Math.sin(v.a) * 40, py = v.y + Math.cos(v.a) * 40;
          if (MAP.solidAt(px, py)) { px = v.x + Math.sin(v.a) * 40; py = v.y - Math.cos(v.a) * 40; }
          c.k = new Person(px, py, 'ped', CHARS.kulas.look); c.k.npc = true; c.k.state = 'idle'; c.k.keep = true; G.peds.push(c.k);
          UI.say([['Kulas', 'Suko na ako! Suko na! Ito na ang bayad, huwag mo akong saktan!']]);
        },
        target: (c) => c.k,
        update(c) { return !G.player.vehicle && U.dist(G.player.x, G.player.y, c.k.x, c.k.y) < 60; },
      },
      talk([
        ['Kulas', 'Heto ang ₱3,000... Alam mo ba, hindi naman ako talaga nangutang ng ganito kalaki. Pinalaki ni Tikboy ang tubo!'],
        ['Kulas', 'At lahat ng nakokolekta niya, napupunta kay Mayor Kurakot. Pati yung ayuda ng mga tao!'],
        [N, '(Kaya pala... Si Mayor ang nasa likod ng lahat.)'],
        [N, 'Sige Kulas, itago mo yung kalahati. Ako na bahala kay Tikboy.'],
      ]),
    ],
    done(c) { if (c.k) c.k.remove = true; if (c.van) { c.van.mission = false; c.van.invuln = false; } },
  },
  { // 7
    id: 'buntot', title: 'Buntot', giver: 'tito', reward: 1500,
    cp: { stage: 1, pos: () => ({ x: MAP.cx(7) - 300, y: MAP.laneY(2, 0) }), car: 'sedan' },
    desc: 'Sundan ang itim na SUV ni Mayor Kurakot.',
    stages: [
      talk([
        ['Tito Boy', 'Nonoy, totoo ang sinabi ni Kulas. Ang ayuda ng buong lungsod, kinukurakot ni Mayor.'],
        ['Tito Boy', 'Tuwing gabi, may itim na SUV na umaalis sa mansyon niya sa Mandaluyong. Saan kaya dinadala ang pera?'],
        ['Tito Boy', 'Sundan mo. Pero huwag masyadong malapit — mapapansin ka. Huwag ding masyadong malayo — mawawala.'],
      ]),
      {
        obj: 'Pumunta malapit sa mansyon ni Mayor Kurakot (Mandaluyong)',
        target: () => MAP.pois.mansion,
        update() { return U.dist(G.player.x, G.player.y, MAP.pois.mansion.x, MAP.pois.mansion.y) < 700; },
      },
      {
        obj: (c) => `Sundan ang itim na SUV ni Mayor · ${c.state || ''}`,
        enter(c) {
          const m = MAP.pois.mansion;
          c.suv = laneSpawn('mayor', MAP.laneX(8, 1), m.y + 40, Math.PI / 2);
          c.suv.driver = 'ai'; c.suv.ai = new RoadDriver(c.suv, { cruise: 230, route: [[8, 3], [6, 3], [6, 1], [3, 1], [3, 0], [0, 0]] });
          c.close = 0; c.far = 0;
          UI.toast('Ayan na ang itim na SUV!');
        },
        target: (c) => c.suv,
        update(c, dt) {
          const d = U.dist(G.player.x, G.player.y, c.suv.x, c.suv.y);
          if (c.suv.dead) return 'Nasira mo ang SUV ni Mayor! Nabuko ka.';
          if (d < 170) { c.close += dt; c.state = '⚠ MASYADONG MALAPIT!'; } else { c.close = Math.max(0, c.close - dt * 0.5); }
          if (d > 900) { c.far += dt; c.state = '⚠ MALAYO NA! Habulin!'; } else c.far = 0;
          if (d >= 170 && d <= 900) c.state = '✓ Tamang layo';
          if (c.close > 3) return 'Napansin ka ng mga bodyguard ni Mayor!';
          if (c.far > 7) return 'Nawala ang SUV!';
          if (c.suv.ai && c.suv.ai.finished) return true;
        },
      },
      {
        obj: '', enter(c) { c.suv.remove = true; }, update() { return true; },
      },
      talk([
        [N, 'Pumasok ang SUV sa pantalan... sa isang malaking bodega!'],
        [N, 'May nakita akong ARMORED VAN sa loob. Puno ng pera — ang ayuda ng buong Manila!'],
        ['Tito Boy (sa telepono)', 'Yan na ang pagkakataon natin, Nonoy. Bumalik ka dito sa terminal, magplano tayo.'],
      ]),
    ],
  },
  { // 8
    id: 'hari-ng-kalsada', title: 'Hari ng Kalsada', giver: 'tito', reward: 10000,
    cp: { stage: 1, pos: () => ({ x: MAP.pois.bodega.x + 130, y: MAP.pois.bodega.y + 230 }) },
    desc: 'Nakawin ang armored van ni Mayor at ibalik ang pera sa bayan.',
    stages: [
      talk([
        ['Tito Boy', 'Ito na, Nonoy. Nakausap ko si Mang Ben — bubuksan niya ang garahe ng talyer para sa iyo.'],
        ['Aling Nena', 'At ako na ang bahala sa media. Kapag nasa talyer na ang van, ilalabas namin ang ebidensya sa TV!'],
        ['Tito Boy', 'Pero mag-ingat ka. Pag kinuha mo ang van, buong pulis ni Mayor ang hahabol sa iyo. Pati sundalo.'],
        [N, 'Para sa Samar. Para sa Manila. Tara na.'],
      ]),
      {
        obj: 'Pumunta sa bodega ni Mayor sa pantalan at nakawin ang armored van',
        enter(c) {
          const b = MAP.pois.bodega;
          c.van = laneSpawn('armored', b.x + 130, b.y + 4, 0);
        },
        target: (c) => c.van,
        update(c) { if (c.van.dead) return 'Nasira ang armored van!'; return G.player.vehicle === c.van; },
      },
      {
        obj: (c) => `Dalhin ang armored van sa talyer ni Mang Ben — bukas ang garahe! (Van ${Math.round(c.van.hp / c.van.maxhp * 100)}%)`,
        enter(c) {
          WANTED.setStars(5); WANTED.spotted('cop', 50); WANTED.lock = true; WANTED.minStars = 5; c.t = 0;
          UI.big('5 BITUIN!', 'Buong Manila ang humahabol!', 2);
        },
        target: (c) => G.player.vehicle === c.van ? MAP.pois.mangben : c.van,
        update(c, dt) {
          c.t += dt;
          if (c.t > 25 && WANTED.stars < 6) { WANTED.setStars(6); WANTED.minStars = 6; }
          if (c.van.dead) return 'Nasira ang armored van!';
          return G.player.vehicle === c.van && U.dist(c.van.x, c.van.y, MAP.pois.mangben.x, MAP.pois.mangben.y) < 130;
        },
      },
      {
        obj: '', enter(c) {
          WANTED.lock = false; WANTED.minStars = 0; WANTED.clear(false);
          for (const v of G.vehicles) if (v.unit) { v.siren = false; }
          G.exitVehicle(true); c.van.remove = true;
          G.player.x = MAP.pois.mangben.x; G.player.y = MAP.pois.mangben.y + 10;
        }, update() { return true; },
      },
      talk([
        ['Mang Ben', 'SARADO ANG GARAHE! Ligtas ka na, bata!'],
        ['Balita sa TV', 'BREAKING NEWS: Bilyon-bilyong ayuda, natagpuan sa armored van ni Mayor Kurakot! Ang Mayor at si Boss Tikboy, INARESTO!'],
        ['Balita sa TV', 'Ang pera ay ibabalik sa mga tao. Ang mga lupang kinuha ni Tikboy, ibabalik sa mga may-ari!'],
        ['Tito Boy', 'NONOY! Nabawi na ang lupa ninyo sa Samar! Ikaw na talaga ang HARI NG KALSADA!'],
        [N, 'Salamat, Tito. Pero... parang gusto ko pang mag-stay sa Manila. Ang dami pang pwedeng gawin.'],
      ]),
    ],
    done(c, ok) { WANTED.lock = false; WANTED.minStars = 0; if (ok) setTimeout(() => UI.ending('ch1'), 600); },
  },
];

MISSIONS.forEach(m => { m.chapter = m.chapter || 1; });
const pr = () => MAP.prov;
MISSIONS.push(
  { // 9
    id: 'pauwi', title: 'Pauwi sa Probinsya', giver: 'tito', reward: 1500, chapter: 2,
    desc: 'Umuwi sa San Isidro at hanapin si Lola Isyang.',
    cp: { stage: 2, pos: () => ({ x: (MAP.rs(8) + RW + 6) * T, y: (pr().hy + 3) * T }), car: 'sedan' },
    stages: [
      comic([
        ['🏙️👑🚔', 'Nakulong na si Mayor Kurakot. Payapa na ulit ang Manila...'],
        ['✉️👵🌾', '"Apo, bumalik ka. May bagong panginoon dito sa San Isidro — si DON SEVERO. Inaagaw niya ang mga bukid."'],
        ['🛣️🚙🌅', 'KABANATA 2: PROBINSYA'],
      ]),
      talk([
        ['Tito Boy', 'Nonoy, bago makulong si Tikboy, naibenta na pala niya ang mga titulo ng lupa sa isang haciendero — si Don Severo.'],
        ['Tito Boy', 'Umuwi ka muna sa San Isidro. Sundan mo lang ang malaking highway pa-silangan. Ingat sa daan!'],
      ]),
      { obj: 'Mag-drive pa-silangan sa highway papuntang San Isidro', target: () => MAP.pois.plaza, update: () => near(MAP.pois.plaza, 260) },
      talk([
        ['Kapitana Luz', 'Ikaw ba si Nonoy, ang apo ni Lola Isyang? Salamat sa Diyos at nakauwi ka!'],
        ['Kapitana Luz', 'Hinihintay ka ng lola mo sa bahay niya — sa dulo ng highway, sa silangan.'],
      ]),
      { obj: 'Puntahan si Lola Isyang sa silangan ng bayan', target: () => MAP.pois.lola, update: () => near(MAP.pois.lola, 110) },
      talk([
        ['Lola Isyang', 'NONOY! Apo ko! Ang laki mo na... at ang payat mo! Kumain ka na ba?'],
        ['Lola Isyang', 'Si Don Severo... binabakuran ang mga bukid. Sabi niya, sa kanya na raw ang lupa dahil may titulo siya.'],
        [N, 'Lola, hindi ako papayag. Tutulungan ko kayo.'],
      ]),
    ],
  },
  { // 10
    id: 'ani', title: 'Ani ng Bayan', giver: 'lola', reward: 2000, chapter: 2,
    desc: 'Kolektahin ang palay gamit ang kuliglig ni Lolo.',
    cp: { stage: 1, pos: () => MAP.pois.lola },
    stages: [
      talk([
        ['Lola Isyang', 'Anihan na, pero kinuha ng mga tauhan ni Don ang mga trak ng magsasaka.'],
        ['Lola Isyang', 'Gamitin mo ang kuliglig ng Lolo mo. Kunin ang palay sa tatlong bukid at dalhin sa kiskisan sa kanluran ng bayan.'],
      ]),
      {
        obj: 'Sumakay sa kuliglig ni Lolo',
        enter(c) { const l = MAP.pois.lola; c.k = laneSpawn('kuliglig', l.x - 80, (pr().hy + 1) * T, Math.PI); c.k.cargo = 0; c.n = 0; c.farms = pr().farms.slice(0, 3); },
        target: (c) => c.k, update(c) { if (c.k.dead) return 'Nasira ang kuliglig!'; return G.player.vehicle === c.k; },
      },
      {
        obj: (c) => `Kunin ang palay sa mga bukid (${c.n}/3)`,
        target: (c) => G.player.vehicle === c.k ? Object.assign({ stop: true }, c.farms[c.n]) : c.k,
        update(c) {
          if (c.k.dead) return 'Nasira ang kuliglig!';
          if (G.player.vehicle === c.k && stopAt(c.k, c.farms[c.n], 110, c, 'h', 1)) {
            c.n++; c.k.cargo = c.n * 2; AUD.coin(); UI.toast(`🌾 Naikarga ang palay (${c.n}/3)`);
            if (c.n >= 3) return true;
          }
        },
      },
      {
        obj: 'Dalhin ang palay sa kiskisan (rice mill)',
        target: (c) => G.player.vehicle === c.k ? Object.assign({ stop: true }, MAP.pois.mill) : c.k,
        update(c) { if (c.k.dead) return 'Nasira ang kuliglig!'; return G.player.vehicle === c.k && stopAt(c.k, MAP.pois.mill, 140, c, 'h2', 1); },
      },
      talk([
        ['Mang Kanor (kiskisan)', 'Ang dami nito! Salamat, iho. Ngayon lang ulit may naghatid simula nang dumating si Don Severo.'],
        ['Mang Kanor (kiskisan)', 'Sabi ni Don, siya lang daw ang pwedeng bumili ng palay — sa kalahating presyo! Pero ngayon, may bigas na ang bayan.'],
      ]),
    ],
    done(c) { if (c.k) { c.k.mission = false; c.k.cargo = 0; } },
  },
  { // 11
    id: 'karera-kuliglig', title: 'Karera ng Kuliglig', giver: 'ditas', reward: 2500, chapter: 2,
    desc: 'Talunin ang mga kampeon sa taunang karera ng kuliglig.',
    cp: { stage: 1, pos: () => MAP.pois.ditas },
    stages: [
      talk([
        ['Mang Ditas', 'Pista na! At ang pinakaabangan — ang Karera ng Kuliglig sa palayan!'],
        ['Mang Ditas', 'Isang ikot sa daan ng bukid. Kung mananalo ka, sa iyo ang premyo. Hindi pa natatalo si Bebang ng tatlong taon!'],
      ]),
      {
        obj: 'Pumunta sa simula ng karera sa palayan', target: () => pr().loop[0],
        enter(c) {
          const s0 = pr().loop[0];
          c.car = laneSpawn('kuliglig', s0.x - 40, s0.y, 0, { color: '#f28c28' });
          c.r1 = laneSpawn('kuliglig', s0.x - 110, s0.y - 30, 0); c.r2 = laneSpawn('kuliglig', s0.x - 180, s0.y + 25, 0);
          for (const [r, sk] of [[c.r1, 0.98], [c.r2, 0.95]]) { r.driver = 'ai'; r.skill = sk; r.ri = 0; r.st = { t: 0 }; }
          const L = pr().loop; c.cps = [L[1], L[2], L[3], L[4], L[0]];
        },
        update(c) { return G.player.vehicle === c.car || (near(pr().loop[0], 160) && !G.player.vehicle && (G.player.x = c.car.x, G.player.y = c.car.y, G.enterVehicle(c.car), true)); },
      },
      {
        obj: 'Humanda...', target: () => null, enter(c) { c.cd = 3.5; c.last = 4; },
        update(c, dt) {
          c.cd -= dt; for (const v of [c.car, c.r1, c.r2]) { v.vx = 0; v.vy = 0; }
          const n = Math.ceil(c.cd); if (n !== c.last && n > 0) { c.last = n; UI.big(String(n), '', 0.8); AUD.beep(); }
          if (c.cd <= 0) { UI.big('GO!', '', 0.8); AUD.tone(1600, 0.4, 'square', 0.1); c.pi = 0; return true; }
        },
      },
      {
        obj: (c) => `KARERA! Checkpoint ${c.pi + 1}/${c.cps.length}`,
        target: (c) => Object.assign({ cp: true, n: c.pi + 1 }, c.cps[c.pi]),
        update(c, dt) {
          if (c.car.dead) return 'Nasira ang kuliglig mo!';
          if (G.player.vehicle !== c.car) { c.out = (c.out || 0) + dt; if (c.out > 5) return 'Bumaba ka sa karera!'; } else c.out = 0;
          if (U.dist(c.car.x, c.car.y, c.cps[c.pi].x, c.cps[c.pi].y) < 110) { c.pi++; AUD.checkpoint(); if (c.pi >= c.cps.length) return true; }
          for (const r of [c.r1, c.r2]) {
            if (r.ri >= c.cps.length) continue;
            if (driveRacer(r, c.cps[r.ri], c.cps[r.ri + 1], 0, dt, r.st) < 100) r.ri++;
            if (r.ri >= c.cps.length) return 'Naunahan ka sa karera!';
          }
        },
      },
      talk([['Mang Ditas', 'HINDI KAPANI-PANIWALA! May bagong kampeon ang San Isidro!'], ['Bebang', 'Hmp. Sa susunod na taon, babawi ako!']]),
    ],
    done(c) { for (const v of [c.r1, c.r2, c.car]) if (v) { v.mission = false; if (v !== c.car) v.remove = true; } },
  },
  { // 12
    id: 'bantay', title: 'Mga Bantay ni Don Severo', giver: 'lola', reward: 3000, chapter: 2,
    desc: 'Pigilan ang pagbabakod sa bukid ni Mang Pedring.',
    cp: { stage: 1, pos: () => MAP.pois.lola, car: 'sedan' },
    stages: [
      talk([
        ['Lola Isyang', 'Nonoy! Nagbabakod na ang mga tauhan ni Don sa bukid ni Mang Pedring!'],
        ['Lola Isyang', 'Pigilan mo sila... pero mag-ingat ka. Pati ang mga pulis dito, binabayaran ni Don.'],
      ]),
      {
        obj: 'Pumunta sa bukid ni Mang Pedring', target: () => pr().farms[1],
        enter(c) { const f = pr().farms[1]; c.goons = []; for (let k = 0; k < 3; k++) { const p = new Person(f.x + U.rand(-60, 60), f.y + 40 + U.rand(-20, 20), 'ped', Object.assign({}, CHARS.goon.look)); p.npc = true; p.state = 'idle'; p.keep = true; G.peds.push(p); c.goons.push(p); } },
        update: () => near(pr().farms[1], 200),
      },
      talk([
        ['Tauhan ni Don', 'Hoy! Pag-aari na ni Don Severo ang lupang ito! May titulo kami!'],
        [N, 'Peke ang titulo niyo! Umalis kayo!'],
        ['Tauhan ni Don', 'Matapang ka ha. PULIS! May nanggugulo dito! Hulihin niyo siya!'],
      ]),
      {
        obj: () => WANTED.mode === 'chase' ? 'Takasan ang mga pulis ni Don Severo!' : 'Lumayo at magtago hanggang mawala ang mga bituin',
        enter(c) { removePeds(c.goons); WANTED.setStars(3); WANTED.spotted('cop', 100); },
        target: () => null, update: () => WANTED.stars === 0,
      },
      talk([['Lola Isyang (sa telepono)', 'Ligtas ka? Salamat sa Diyos. Nonoy, kailangan natin ng patunay na peke ang titulo ni Don. Kausapin mo si Kapitana Luz sa munisipyo.']]),
    ],
  },
  { // 13
    id: 'titulo', title: 'Ang Titulo', giver: 'luz', reward: 3000, chapter: 2,
    desc: 'Pasukin ang hacienda at kunin ang mga orihinal na titulo.',
    cp: { stage: 1, pos: () => ({ x: MAP.pois.hacgate.x, y: MAP.pois.hacgate.y + 260 }) },
    stages: [
      talk([
        ['Kapitana Luz', 'Nasa opisina sa loob ng hacienda ang mga ORIHINAL na titulo ng mga magsasaka. Kapag nakuha mo, mapapatunayan nating peke ang kay Don.'],
        ['Kapitana Luz', 'May mga bantay. Tingnan mo ang dilaw na tingin nila — huwag kang papasok doon. Mas madali sa gabi.'],
      ]),
      {
        obj: 'Pumunta sa Hacienda Severo (hilaga ng bayan)', target: () => MAP.pois.hacgate,
        update: () => near(MAP.pois.hacgate, 220),
      },
      {
        obj: () => WANTED.stars > 0 ? 'Nakita ka! Kunin pa rin ang titulo — o tumakas muna' : 'Pumasok nang palihim at kunin ang titulo sa opisina (iwas sa dilaw na tingin)',
        enter(c) {
          const h = pr().hacienda, cx = (h.x0 + h.x1) / 2;
          c.guards = [];
          const routes = [[[h.x0 + 80, h.y0 + 520], [h.x1 - 80, h.y0 + 520]], [[cx - 60, h.y0 + 420], [cx - 60, h.y1 - 90]], [[h.x1 - 120, h.y0 + 120], [h.x1 - 120, h.y0 + 440]], [[h.x0 + 100, h.y0 + 120], [cx - 200, h.y0 + 120]]];
          for (const r of routes) { const p = new Person(r[0][0], r[0][1], 'cop', Object.assign({}, CHARS.goon.look)); p.role = 'guard'; p.keep = true; p.patrol = r.map(([x, y]) => ({ x, y })); G.peds.push(p); c.guards.push(p); }
        },
        target: () => MAP.pois.office,
        update(c) { if (!G.player.vehicle && near(MAP.pois.office, 50)) { AUD.cash(); UI.big('📁 NAKUHA ANG TITULO!', 'Lumabas ng hacienda', 2, 'good'); return true; } },
      },
      {
        obj: () => WANTED.stars > 0 ? 'Takasan ang mga bantay at pulis!' : 'Lumabas ng hacienda at lumayo',
        target: () => WANTED.stars > 0 ? null : { x: MAP.pois.hacgate.x, y: MAP.pois.hacgate.y + 160 },
        update() { const h = pr().hacienda, P = G.player; const out = P.x < h.x0 - 60 || P.x > h.x1 + 60 || P.y < h.y0 - 60 || P.y > h.y1 + 100; return out && WANTED.stars === 0; },
      },
      {
        obj: 'Magpasya...', target: () => null,
        enter(c) {
          UI.say([['Don Severo (sa telepono)', 'Alam kong ikaw ang kumuha ng mga titulo, bata. Matalino ka. Ibenta mo sa akin — ₱30,000. Cash. Walang tanong.']]);
          c.wait = true;
        },
        update(c) {
          if (UI.talking || !c.wait) return c.picked;
          c.wait = false;
          UI.choice('Ano ang gagawin mo sa mga titulo?', [
            { label: '🤝 Ibigay kay Kapitana Luz', desc: 'Para sa mga magsasaka at sa bayan. Walang pera — pero tama.' },
            { label: '💰 Ibenta kay Don Severo (₱30,000)', desc: 'Mabilis na pera. Pero mawawalan ng lupa ang mga kababayan mo.' },
          ], (k) => {
            G.flags.ch2 = k === 0 ? 'bayan' : 'pera';
            if (k === 1) { G.addMoney(30000, true); UI.say([['Don Severo', 'Hehehe. Alam kong maiintindihan mo, iho. Ang mundo ay para sa matatalino.']]); }
            else UI.say([['Kapitana Luz', 'Nonoy... salamat. Bukas, dadalhin namin ito sa korte kasama ang lahat ng magsasaka. Ito na ang pag-asa ng San Isidro.']]);
            c.picked = true;
          });
        },
      },
      { obj: '', update: () => !UI.talking },
    ],
    done(c) { removePeds(c.guards); },
  },
  { // 14
    id: 'lupa-ng-bayan', title: 'Lupa ng Bayan', giver: 'lola', reward: 15000, chapter: 2,
    desc: 'Ang huling laban para sa San Isidro.',
    cp: { stage: 1, pos: () => MAP.pois.lola, car: 'suv' },
    stages: [
      {
        obj: '', enter() {
          if (G.flags.ch2 === 'pera') UI.say([
            ['Lola Isyang', 'Nonoy... totoo ba? Ibinenta mo ang mga titulo kay Don Severo?'],
            ['Lola Isyang', 'Ang mga Pedring, ang mga Kanor... wala na silang lupa. Hindi kita pinalaki para diyan, apo.'],
            ['Tito Boy (sa telepono)', 'NONOY! Tumakbo ka! Si Don Severo — ayaw niya ng saksi. Pinapahabol ka niya! Bumalik ka sa Manila, sa terminal ko!'],
          ]);
          else UI.say([
            ['Lola Isyang', 'Ngayong araw dadalhin ng mga magsasaka ang mga titulo sa munisipyo, sakay ng dalawang jeep.'],
            ['Lola Isyang', 'Pero nag-aabang ang mga itim na SUV ni Don. Bantayan mo ang convoy, apo — at banggain mo ang sinumang haharang!'],
          ]);
        }, update: () => !UI.talking,
      },
      {
        obj: (c) => G.flags.ch2 === 'pera'
          ? `Tumakas papuntang Manila — sa terminal ni Tito Boy! ${c.goons ? '· Mga SUV ni Don: ' + c.goons.filter(v => !v.dead).length : ''}`
          : `Protektahan ang convoy ng magsasaka! 🚌 ${c.jeeps ? c.jeeps.map(j => Math.max(0, Math.round(j.hp / j.maxhp * 100)) + '%').join(' · ') : ''} · 🚙 Kalaban: ${c.goons ? c.goons.filter(v => !v.dead).length : 0}`,
        enter(c) {
          c.goons = []; c.t = 0; c.spawned = 0;
          if (G.flags.ch2 === 'pera') { WANTED.setStars(4); WANTED.spotted('cop', 100); return; }
          const L = pr().loop, tcx = (pr().tcx + 0.5) * T, tcy = pr().tcy;
          const path = [L[0], { x: tcx, y: (tcy + 22) * T }, { x: tcx, y: (tcy + 15.5) * T }, { x: tcx - 40, y: (tcy + 11) * T }];
          c.jeeps = [];
          for (let k = 0; k < 2; k++) {
            const j = laneSpawn('jeepney', L[4].x + 200 - k * 130, L[4].y, 0, { color: k ? '#27ae60' : '#c0392b' });
            j.driver = 'ai'; j.maxhp = j.hp = 420; j.passengers = 6;
            j.ai = new PathDriver(j, path, { cruise: 170, solid: true });
            c.jeeps.push(j);
          }
          UI.toast('🚌 Umalis na ang convoy! Bantayan sila!');
        },
        target: (c) => G.flags.ch2 === 'pera' ? MAP.pois.home : (c.jeeps ? c.jeeps[0] : null),
        update(c, dt) {
          c.t += dt;
          const alive = c.goons.filter(v => !v.dead && !v.remove);
          if (G.flags.ch2 === 'pera') {
            if (c.spawned < 4 && c.t > 2 + c.spawned * 5 && MAP.inProvince(G.player.x)) { const v = spawnGoonCar(G.player, () => G.player.vehicle || G.player); if (v) { c.goons.push(v); c.spawned++; } }
            if (near(MAP.pois.home, 220)) { WANTED.clear(false); for (const v of c.goons) v.remove = true; return true; }
            return;
          }
          for (const j of c.jeeps) if (j.dead || j.hp <= 0) return 'Nasira ang jeep ng convoy!';
          if (c.spawned < 6 && alive.length < 3 && c.t > 3 + c.spawned * 4) {
            const tgt = U.choice(c.jeeps.filter(j => !j.dead));
            const v = spawnGoonCar(tgt, () => { const live = c.jeeps.filter(j => !j.dead); return live.length ? live.reduce((a, b) => U.d2(a.x, a.y, v.x, v.y) < U.d2(b.x, b.y, v.x, v.y) ? a : b) : null; }, 600, 1100);
            if (v) { c.goons.push(v); c.spawned++; UI.toast('🚙 May paparating na SUV ni Don!'); }
          }
          if (c.jeeps.every(j => j.ai && j.ai.finished)) { for (const v of c.goons) { v.ai = null; v.driver = null; } return true; }
        },
      },
      { obj: '', enter() {
          if (G.flags.ch2 === 'pera') UI.comic([
            ['🚙💨🌃', 'Nakatakas ka pabalik ng Manila. Mayaman ka na...'],
            ['🏚️🌾😢', '...pero ang mga bukid ng San Isidro, nabakuran ni Don Severo.'],
            ['👵💔', '"Ang tunay na hari ng kalsada, hindi nagbebenta ng sariling bayan." — Lola Isyang'],
            ['🔚', 'WAKAS (Ending B: Ang Presyo)'],
          ]);
          else UI.comic([
            ['🏛️📁⚖️', 'Naiharap ang mga orihinal na titulo sa korte. PEKE ang kay Don Severo!'],
            ['🚔👔🔒', 'Inaresto si Don Severo dahil sa pandaraya at pang-aagaw ng lupa.'],
            ['🌾👨‍🌾🎉', 'Nabawi ng mga magsasaka ang kanilang mga bukid. Pista ulit sa San Isidro!'],
            ['👵❤️👑', '"Ipinagmamalaki kita, apo. Ikaw ang tunay na Hari ng Kalsada." — WAKAS (Ending A: Lupa ng Bayan)'],
          ]);
        }, update: () => !UI.talking },
    ],
    done(c, ok) {
      if (c.goons) for (const v of c.goons) { v.mission = false; v.criminal = false; }
      if (c.jeeps) for (const j of c.jeeps) j.mission = false;
      if (ok) { G.flags.ending2 = G.flags.ch2 === 'pera' ? 'B' : 'A'; setTimeout(() => UI.ending(G.flags.ending2 === 'A' ? 'ch2a' : 'ch2b'), 600); }
    },
  },
);

const MS = {
  idx: 0, active: null, stage: 0, c: null, entered: false, freeShops: false, failCd: 0, giverNPC: null, retryInfo: null, retryT: 0,
  reset() { this.retryInfo = null; this.idx = 0; this.active = null; this.stage = 0; this.c = null; this.freeShops = false; if (this.giverNPC) this.giverNPC.remove = true; this.giverNPC = null; },
  giverPOI(m) { return MAP.pois[{ tito: 'tito', ben: 'mangben', nena: 'nena', paeng: 'paeng', tikboy: 'tikboy', lola: 'lola', ditas: 'ditas', luz: 'luz' }[m.giver] || m.giver]; },
  start(i) {
    if (this.giverNPC && i !== 0) { /* keep */ }
    this.active = MISSIONS[i]; this.stage = 0; this.c = {}; this.entered = false;
    UI.big(this.active.title.toUpperCase(), `Kabanata ${this.active.chapter} · Misyon ${i + 1} ng ${MISSIONS.length}`, 2.2);
    AUD.tone(523, 0.2, 'triangle', 0.1); AUD.tone(784, 0.3, 'triangle', 0.1, 0, 0.15);
  },
  objText() {
    if (!this.active) return '';
    const st = this.active.stages[this.stage]; if (!st) return '';
    return typeof st.obj === 'function' ? st.obj(this.c) : st.obj;
  },
  target() {
    if (!this.active) {
      if (this.idx < MISSIONS.length) { const p = this.giverPOI(MISSIONS[this.idx]); return Object.assign({ giver: true, letter: CHARS[MISSIONS[this.idx].giver].name[0] }, p); }
      return null;
    }
    const st = this.active.stages[this.stage];
    if (!st || !st.target) return null;
    const t = st.target(this.c);
    return t;
  },
  update(dt) {
    this.failCd -= dt;
    if (this.retryT > 0) { this.retryT -= dt; if (this.retryT <= 0) this.retryInfo = null; }
    // giver NPC
    if (this.idx < MISSIONS.length) {
      const m = MISSIONS[this.idx], p = this.giverPOI(m), ch = CHARS[m.giver];
      const want = !this.active || this.active === m;
      if (want && (!this.giverNPC || this.giverNPC.remove || this.giverNPC.giver !== m.giver)) {
        if (this.giverNPC) this.giverNPC.remove = true;
        const n = new Person(p.x, p.y - 4, 'ped', ch.look); n.npc = true; n.state = 'idle'; n.keep = true; n.giver = m.giver; n.name = ch.name;
        this.giverNPC = n; G.peds.push(n);
      }
    } else if (this.giverNPC) { this.giverNPC.remove = true; this.giverNPC = null; }
    const m = this.active; if (!m) return;
    const st = m.stages[this.stage];
    if (!st) return;
    if (!this.entered) { this.entered = true; if (st.enter) st.enter(this.c); }
    const r = st.update ? st.update(this.c, dt) : true;
    if (r === true) { this.stage++; this.entered = false; if (this.stage >= m.stages.length) this.complete(); }
    else if (typeof r === 'string') this.fail(r);
  },
  complete() {
    const m = this.active;
    if (m.done) m.done(this.c, true);
    const pay = Math.round(m.reward * (REPLAY.on ? 0.25 : NGPLUS.mult()));
    G.addMoney(pay, true);
    AUD.success();
    UI.big('MISYON TAPOS!', `${m.title} · +${U.money(pay)}`, 3);
    PROG.xp(REPLAY.on ? 0 : 40 + m.reward / 25, 'Misyon');
    if (REPLAY.on) REPLAY.complete(m);
    this.idx = Math.max(this.idx, MISSIONS.indexOf(m) + 1);
    this.active = null; this.c = null;
    G.save();
  },
  fail(reason) {
    const m = this.active; if (!m) return;
    if (m.done) m.done(this.c || {}, false);
    if (this.c) for (const k in this.c) { const o = this.c[k]; if (o instanceof Vehicle && o !== G.player.vehicle) { o.mission = false; if (!o.driver) o.remove = true; } if (o instanceof Person) o.remove = true; if (k === 'waiting') removePeds(o); }
    if (this.c && this.c.car && G.player.vehicle === this.c.car) this.c.car.mission = false;
    WANTED.lock = false; WANTED.minStars = 0;
    UI.say([]); UI.talking = false;
    AUD.fail();
    UI.big('BIGO ANG MISYON', reason, 3);
    this.active = null; this.c = null; this.freeShops = false;
    this.failCd = 3;
    if (m.cp) { this.retryInfo = { m }; this.retryT = 20; setTimeout(() => TIP.show('retry'), 3500); }
  },
  canRetry() { return !!(this.retryInfo && this.retryT > 0 && !this.active && !G.cutscene); },
  retry() {
    const m = this.retryInfo.m; this.retryInfo = null;
    const P = G.player, pos = m.cp.pos();
    const f = document.getElementById('fade'); f.classList.add('on');
    G.cutscene = true;
    setTimeout(() => {
      if (P.vehicle) G.exitVehicle(true);
      WANTED.clear(false);
      for (const v of G.vehicles) if (v.unit) v.remove = true;
      for (const p of G.peds) if (p.fromCar) p.remove = true;
      P.x = pos.x; P.y = pos.y; P.hp = Math.max(P.hp, 100); P.vx = P.vy = 0;
      if (m.cp.car) { const v = new Vehicle(m.cp.car, pos.x, pos.y, 0); G.vehicles.push(v); G.enterVehicle(v); }
      G.cam.x = P.x; G.cam.y = P.y;
      this.active = m; this.stage = m.cp.stage; this.c = {}; this.entered = false;
      UI.big(m.title.toUpperCase(), 'Mula sa checkpoint', 1.8);
      f.classList.remove('on'); G.cutscene = false;
    }, 600);
  },
  canStart() {
    if (this.active || this.idx >= MISSIONS.length || this.failCd > 0) return null;
    const m = MISSIONS[this.idx], p = this.giverPOI(m);
    if (U.dist(G.player.x, G.player.y, p.x, p.y) < 70 && !G.player.vehicle) return m;
    return null;
  },
};

// ===== Shops & places =====
const SHOP = {
  near() {
    const P = G.player;
    let best = null, bd = 1e9;
    for (const k in MAP.pois) {
      const p = MAP.pois[k];
      if (!['ukay', 'barber', 'paint', 'sari', 'hospital', 'chop', 'home', 'ferry', 'airport', 'heli', 'kainan', 'mall', 'church', 'weapon', 'gunshop', 'videoke', 'court', 'property', 'garage', 'rider', 'tow', 'race', 'famhome', 'carshow'].includes(p.type)) continue;
      const r = (P.vehicle ? 110 : 60);
      const me = P.vehicle || P;
      const d = U.dist(me.x, me.y, p.x, p.y);
      if (d < r && d < bd) { bd = d; best = p; }
    }
    return best;
  },
  label(p) {
    const P = G.player, free = MS.freeShops;
    const c = (n) => free ? 'LIBRE' : U.money(n);
    switch (p.type) {
      case 'ukay': return P.vehicle ? null : `Ukay-Ukay — Bagong damit (${c(150)})`;
      case 'barber': return P.vehicle ? null : `Barberya — Bagong gupit (${c(100)})`;
      case 'paint': return P.vehicle ? `Pintura — kulay, makina, armor, sticker, busina` : null;
      case 'weapon': return P.vehicle ? null : ARMS.shopLabel();
      case 'heli': return P.vehicle ? null : `🚁 Umarkila ng helicopter (${c(1500)})`;
      case 'kainan': return P.vehicle ? null : `🍗 Pumasok sa ${p.label}`;
      case 'mall': return P.vehicle ? null : `🏬 Pumasok sa ${p.label}`;
      case 'church': return P.vehicle ? null : `⛪ Pumasok sa ${p.label}`;
      case 'videoke': return P.vehicle ? null : 'Videoke — kumanta para sa premyo (₱20 kada kanta)';
      case 'court': return P.vehicle ? null : 'Laro sa korte — 3-Point Shootout, Tumbang Preso, Sipa';
      case 'gunshop': return P.vehicle ? null : (GUNS.unlocked() ? 'Armas ni Kabo — baril, bala, vest at shooting range' : '🔒 Armas — bukas pagkatapos ng Misyon 2');
      case 'property': return ECON.propLabel(p);
      case 'garage': return P.vehicle ? 'I-park ang sasakyan sa garahe' : `Buksan ang garahe (${ECON.garage.length} sasakyan)`;
      case 'rider': return P.vehicle ? null : 'Food Rider — kumuha ng delivery motor at magsimula';
      case 'tow': return P.vehicle ? (P.vehicle.type === 'tow' ? null : null) : 'Impound — kumuha ng tow truck at magsimula';
      case 'race': return JOBS.active ? null : JOBS.raceLabel();
      case 'sari': return P.vehicle ? null : `Sari-sari — Tinapay at softdrinks +40 buhay (${c(30)})`;
      case 'hospital': return P.vehicle ? null : `Ospital — Full heal (${c(100)})`;
      case 'chop': return P.vehicle && MS.idx >= 2 && !(MS.active && MS.active.giver === 'ben') ? `Ibenta kay Mang Ben (~${U.money(this.value(P.vehicle))})` : null;
      case 'home': return P.vehicle ? null : 'I-save ang laro at magpahinga';
      case 'famhome': return P.vehicle ? null : FAMILY.homeLabel();
      case 'carshow': return P.vehicle ? CARMOD.showLabel() : null;
      case 'ferry': return P.vehicle ? null : `${p.label} (${c(['ferry1', 'ferry2'].includes(p.key) ? 50 : 150)})`;
      case 'airport': return P.vehicle ? null : `✈️ ${p.label} — pumili ng lilipadan (${c(500)})`;
    }
    return null;
  },
  value(v) { return Math.round((v.t.value || 300) * (0.4 + 0.6 * Math.max(0, v.hp) / v.maxhp) * (v.isCop ? 1.6 : 1)); },
  watched() {
    const P = G.player;
    if (WANTED.stars === 0) return false;
    for (const v of G.vehicles) if (v.isCop && v.driver && !v.dead && U.dist(v.x, v.y, P.x, P.y) < 520 && MAP.los(v.x, v.y, P.x, P.y)) return true;
    for (const p of G.peds) if (p.kind === 'cop' && p.state !== 'down' && U.dist(p.x, p.y, P.x, P.y) < 400 && MAP.los(p.x, p.y, P.x, P.y)) return true;
    for (const h of WANTED.helis) if (!h.leaving && U.dist(h.sx, h.sy, P.x, P.y) < 130) return true;
    return false;
  },
  pay(n) {
    if (MS.freeShops) return true;
    if (G.player.money < n) { UI.toast('Kulang ang pera mo!'); AUD.fail(); return false; }
    G.addMoney(-n); return true;
  },
  use(p) {
    const P = G.player;
    if (['ukay', 'barber', 'paint'].includes(p.type) && this.watched()) { UI.toast('👀 May pulis na nakatingin! Mawala ka muna sa paningin nila.'); return; }
    switch (p.type) {
      case 'ukay': WARDROBE.open(); break;
      case 'barber': {
        if (!this.pay(100)) return;
        let h; do { h = U.choice(HAIRS); } while (h.id === P.look.hair);
        P.look.hair = h.id; P.look.hairCol = U.choice(HAIR_COLS);
        AUD.snip(); UI.toast(`💈 Bagong itsura: ${h.name}`); G.fadeFlash(); break;
      }
      case 'paint': { if (P.vehicle) ECON.openCustom(); break; }
      case 'weapon': ARMS.openShop(); break;
      case 'gunshop': GUNS.openShop(); break;
      case 'videoke': VIDEOKE.pick(); break;
      case 'kainan': case 'mall': case 'church': INTERIOR.open(p); break;
      case 'heli': {
        if (WANTED.stars > 0) { UI.toast('🚁 "Bawal umarkila habang hinahabol ka ng pulis!"'); return; }
        if (!this.pay(1500)) return;
        const pt = MAP.safeNear(p.x, p.y - 70), hv = new Vehicle('heli', pt.x, pt.y, -Math.PI / 2); hv.keep = true; G.vehicles.push(hv); G.enterVehicle(hv);
        AUD.success(); UI.toast('🚁 Lipad! Lumapag sa patag na lupa para bumaba.'); TIP.show('heli'); G.stats.heli = (G.stats.heli || 0) + 1; ACH.check(); break;
      }
      case 'court': COURTGAMES.open(); break;
      case 'property': ECON.propUse(p); break;
      case 'garage': if (P.vehicle) ECON.store(P.vehicle); else ECON.openGarage(p); break;
      case 'race': JOBS.raceStart(); break;
      case 'rider': case 'tow': {
        if (JOBS.active || MS.active) { UI.toast('Tapusin muna ang ginagawa mo.'); return; }
        let x = p.x, y = p.y;
        for (const [ox, oy] of [[0, -70], [0, 70], [70, 0], [-70, 0]]) if (!MAP.solidAt(p.x + ox, p.y + oy) && !MAP.solidAt(p.x + ox * 1.4, p.y + oy * 1.4)) { x = p.x + ox; y = p.y + oy; break; }
        const v = new Vehicle(p.type === 'rider' ? 'motor' : 'tow', x, y, 0, { color: p.type === 'rider' ? '#c0392b' : undefined });
        if (p.type === 'rider') v.rider = true;
        G.vehicles.push(v); P.x = x; P.y = y; G.enterVehicle(v);
        JOBS.start(p.type === 'rider' ? 'rider' : 'tow'); break;
      }
      case 'sari': {
        if (P.hp >= 100) { UI.toast('Busog ka pa!'); return; }
        if (!this.pay(30)) return;
        P.hp = Math.min(100, P.hp + 40); AUD.coin(); UI.toast('🍞🥤 Pandesal at softdrinks! +40 buhay'); break;
      }
      case 'hospital': {
        if (P.hp >= 100) { UI.toast('Malakas ka pa!'); return; }
        if (!this.pay(100)) return;
        P.hp = 100; AUD.coin(); UI.toast('🏥 Gumaling ka na!'); break;
      }
      case 'chop': {
        const v = P.vehicle; if (!v || v.mission) return;
        if (WANTED.stars > 0) { UI.toast('Mang Ben: "Hoy! May pulis na sumusunod sa iyo! Iwala mo muna!"'); return; }
        const val = this.value(v);
        G.exitVehicle(true); v.remove = true;
        G.addMoney(val, true); G.stats.sold++;
        UI.toast(`🔧 Nabenta ang ${v.t.name} sa halagang ${U.money(val)}`); break;
      }
      case 'airport': {
        if (WANTED.stars > 0) { UI.toast('✈️ "Hindi ka makakalusot sa security habang hinahabol ka ng pulis!"'); return; }
        G.paused = true;
        document.getElementById('shop-title').textContent = '✈️ ' + p.label.toUpperCase();
        const el = document.getElementById('shop-list');
        const dests = [['airport_m', '🏙', 'Manila'], ['airport_s', '🏝', 'Cebu'], ['airport_d', '🦅', 'Davao'], ['airport_b', '🌲', 'Baguio'], ['airport_bo', '🏖', 'Boracay']].filter(d => d[0] !== p.key && MAP.pois[d[0]]);
        el.innerHTML = dests.map(([k, ic, n]) => `<div class="shoprow"><span class="ic">${ic}</span><div><b>${n}</b><small>${MAP.pois[k].label}</small></div><button data-to="${k}">LIPAD · ${MS.freeShops ? 'LIBRE' : U.money(500)}</button></div>`).join('');
        el.querySelectorAll('button[data-to]').forEach(b => b.onclick = () => { if (!this.pay(500)) return; UI.hide('shop'); G.paused = false; FLY.go(MAP.pois[b.dataset.to]); });
        UI.show('shop');
        break;
      }
      case 'ferry': {
        if (WANTED.stars > 0) { UI.toast('⛴ "Bawal sumakay ng ferry ang may humahabol na pulis!"'); return; }
        const far = !['ferry1', 'ferry2'].includes(p.key);
        if (!this.pay(far ? 150 : 50)) return;
        const dest = MAP.pois[{ ferry1: 'ferry2', ferry2: 'ferry1', ferry_si: 'ferry_sg', ferry_sg: 'ferry_si', ferry_sg2: 'ferry_dw', ferry_dw: 'ferry_sg2' }[p.key]];
        MAP.prewarm(dest.x, dest.y, 800);
        const f = document.getElementById('fade'); f.classList.add('on'); G.cutscene = true; AUD.horn(true);
        setTimeout(() => {
          P.x = dest.x; P.y = dest.y + (p.key === 'ferry1' ? 0 : 8); P.vx = P.vy = 0; G.cam.x = P.x; G.cam.y = P.y;
          WORLD.clock = (WORLD.clock + (far ? 90 : 40)) % 1440;
          f.classList.remove('on'); G.cutscene = false;
          const nm = { ferry1: ['ISLA MALIGAYA', 'Maligayang pagdating sa isla!'], ferry2: ['MANILA', 'Balik sa lungsod'], ferry_si: ['CEBU', 'Maayong pag-abot! (Maligayang pagdating!)'], ferry_sg: ['SAN ISIDRO', 'Balik sa probinsya'], ferry_sg2: ['DAVAO', 'Madayaw nga pag-abot! (Maligayang pagdating!)'], ferry_dw: ['CEBU', 'Balik sa Cebu'] }[p.key];
          UI.big(nm[0], nm[1], 2);
          if (!far) TIP.show('island'); else TIP.show('sugbo');
        }, 900);
        break;
      }
      case 'famhome': FAMILY.openHome(); break;
      case 'carshow': CARMOD.enter(); break;
      case 'home': {
        P.hp = 100; G.save(); AUD.success(); UI.toast('💾 Na-save ang laro. Busog at pahinga!');
        G.spawnHomeCars(); break;
      }
    }
  },
};

// ===== Jeepney pasada side job =====
const PASADA = {
  pt: null, mode: null, pax: 0, hold: 0, startX: 0, startY: 0,
  reset() { this.pt = null; this.mode = null; this.pax = 0; removePeds(this.waiting); this.waiting = null; },
  randomStop(minD, maxD) {
    const P = G.player;
    for (let k = 0; k < 40; k++) {
      const bi = U.randi(0, NR - 2), bj = U.randi(0, NR - 2);
      if ((bi <= 1 && bj >= 2 && bj <= 4)) continue;
      const side = U.choice(['N', 'S', 'E', 'W']);
      const p = MAP.door(bi, bj, side, U.randi(-5, 5));
      const d = U.dist(P.x, P.y, p.x, p.y);
      if (d > minD && d < maxD && !MAP.solidAt(p.x, p.y)) return p;
    }
    return null;
  },
  active() { const v = G.player.vehicle; return v && v.type === 'jeepney' && !MS.active && !JOBS.active && !v.dead; },
  update(dt) {
    if (!this.active()) { if (this.mode) this.reset(); return; }
    const v = G.player.vehicle;
    if (!this.mode) {
      this.pt = this.randomStop(500, 1500); if (!this.pt) return;
      this.mode = 'pick'; this.hold = 0;
      this.waiting = []; const n = U.randi(2, 6);
      for (let k = 0; k < n; k++) { const p = new Person(this.pt.x + U.rand(-30, 30), this.pt.y + U.rand(-8, 8), 'ped'); p.npc = true; p.state = 'idle'; p.keep = true; G.peds.push(p); this.waiting.push(p); }
    }
    if (U.dist(v.x, v.y, this.pt.x, this.pt.y) < 100 && v.speed < 60) this.hold += dt; else this.hold = 0;
    if (this.hold > 0.8) {
      this.hold = 0;
      if (this.mode === 'pick') {
        this.pax = this.waiting.length; removePeds(this.waiting); this.waiting = null; v.passengers = this.pax;
        this.startX = v.x; this.startY = v.y;
        this.pt = this.randomStop(1200, 2800) || this.randomStop(600, 4000);
        this.mode = 'drop'; AUD.coin(); UI.toast(`🧍 ${this.pax} pasahero ang sumakay. "Bayad po!"`);
      } else {
        const d = U.dist(this.startX, this.startY, v.x, v.y);
        const pay = Math.round(this.pax * (13 + d / 120));
        G.addMoney(pay, true); G.stats.pasada++; v.passengers = 0;
        UI.toast(`"Para po!" — Kumita ka ng ${U.money(pay)} sa pasada`);
        this.mode = null;
      }
    }
  },
  objText() { if (!this.mode) return ''; return this.mode === 'pick' ? 'PASADA: Sunduin ang mga pasahero (PARA)' : `PASADA: Ihatid ang ${this.pax} pasahero`; },
};
