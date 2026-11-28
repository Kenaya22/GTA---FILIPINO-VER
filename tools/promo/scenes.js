const drive = (x, y) => `{ const st = INPUT._st || (INPUT._st = INPUT.state.bind(INPUT)); INPUT.state = () => { const s = st(); s.touchDrive = true; s.joy = { x: ${x}, y: ${y}, mag: 1 }; return s; }; }`;
const undrive = () => { if (INPUT._st) INPUT.state = INPUT._st; };
module.exports = [
  { name: 'chase', frames: 90, warm: 30, setup: new Function(`
    WORLD.clock = 17.6 * 60; WORLD.rain = WORLD.rainTarget = 0; const P = G.player; if (P.vehicle) G.exitVehicle(true);
    G.vehicles.filter(v => v.isCop).forEach(v => v.remove = true);
    P.x = MAP.cx(1); P.y = MAP.cy(5) + 40; G.cam.x = P.x; G.cam.y = P.y;
    const v = new Vehicle('supercar', P.x, P.y, 0, { color: '#ff7a1a' }); G.vehicles.push(v); G.enterVehicle(v); v.upg = { eng: 0, arm: 3, sticker: 'flame', neon: '#ff2bd6', rims: '#ffd400', kit: 'wide' }; v.speedMul = 0.62; v.vx = 300;
    WANTED.setStars(4); WANTED.mode = 'chase';
    for (const [dx, dy] of [[-170, -30], [-290, 40], [-420, -40]]) { const c = new Vehicle('police', v.x + dx, v.y + dy, 0); c.driver = 'cop'; c.unit = true; c.siren = true; c.ai = new CopDriver(c); c.vx = 300; c.speedMul = 1.25; G.vehicles.push(c); }
    ${drive(1, 0)}`), each: new Function('f', `WANTED.mode = 'chase'; WANTED.unseenT = 0; const P = G.player, v = P.vehicle; WANTED.lastX = P.x; WANTED.lastY = P.y;
    const ca = Math.cos(v.a), sa = Math.sin(v.a); let i = 0;
    for (const c of G.vehicles) { if (!c.isCop || c.remove) continue; const back = 75 + i * 60 + Math.sin(f / 9 + i) * 18, lat = (i % 2 ? 22 : -22);
      const tx = v.x - ca * back - sa * lat, ty = v.y - sa * back + ca * lat;
      c.x += (tx - c.x) * 0.25; c.y += (ty - c.y) * 0.25; c.a = v.a + Math.sin(f / 7 + i) * 0.08; c.vx = v.vx; c.vy = v.vy; c.siren = true; if (++i >= 3) break; }`), teardown: new Function(`(${undrive})(); WANTED.stars = 0; WANTED.mode = 'none'; G.vehicles.filter(v => v.isCop).forEach(v => v.remove = true);`) },
  { name: 'jeep', frames: 150, warm: 10, setup: new Function(`
    WORLD.clock = 8.6 * 60; const P = G.player; if (P.vehicle) G.exitVehicle(true); for (const v of G.vehicles) if (v.isCop) v.remove = true;
    P.x = MAP.cx(3) + 10; P.y = MAP.cy(3); const j = new Vehicle('jeepney', P.x, P.y, 0); G.vehicles.push(j); G.enterVehicle(j); JOBS.toggle();
    window.__jstop = () => JOBS.c && JOBS.c.stops ? JOBS.c.stops[JOBS.c.si] : null;
    const s0 = JOBS.c.stops ? JOBS.c.stops[0] : null;`),
    each: new Function('f', `const P = G.player, v = P.vehicle, s = JOBS.c && JOBS.c.stops && JOBS.c.stops[JOBS.c.si];
      if (f === 0 && s) { const a = Math.atan2(s.y - v.y, s.x - v.x); const d = Math.hypot(s.x - v.x, s.y - v.y); if (d > 330) { v.x = s.x - Math.cos(a) * 300; v.y = s.y - Math.sin(a) * 300; } v.a = Math.round(a / (Math.PI / 2)) * (Math.PI / 2); }
      const st = INPUT._st || (INPUT._st = INPUT.state.bind(INPUT));
      INPUT.state = () => { const o = st(); if (!s) return o; const dx = s.x - v.x, dy = s.y - v.y, d = Math.hypot(dx, dy); o.touchDrive = true; o.joy = d > 95 ? { x: dx / d, y: dy / d, mag: 1 } : { x: 0, y: 0, mag: 0 }; if (d <= 95) o.brake = true; return o; };
      if (f === 112 && !document.getElementById('sukli') && JOBS.c) SUKLI.ask(JOBS.c);`),
    teardown: new Function(`if (INPUT._st) INPUT.state = INPUT._st; const s = document.getElementById('sukli'); if (s) s.remove(); if (JOBS.active) JOBS.stop('');`) },
  { name: 'heli', frames: 105, warm: 25, setup: new Function(`
    WORLD.clock = 9.5 * 60; const P = G.player; if (P.vehicle) G.exitVehicle(true);
    const h = new Vehicle('heli', (BX0 + 86) * T, 84 * T, Math.PI); G.vehicles.push(h); P.x = h.x; P.y = h.y; G.enterVehicle(h); h.vx = -200; G.cam.x = h.x; G.cam.y = h.y;
    ${drive(-1, -0.25)}`), teardown: new Function(`(${undrive})();`) },
  { name: 'boracay', frames: 105, warm: 25, setup: new Function(`
    WORLD.clock = 17.75 * 60; const P = G.player; if (P.vehicle) G.exitVehicle(true);
    const bo = MAP.bora; const b = new Vehicle('bangka', (BRX0 + 9) * T, (bo.HY[3] + 10) * T, -Math.PI / 2, { color: '#2e86c1' }); window.__zoomMul = 1.5; G.vehicles.push(b); P.x = b.x; P.y = b.y; G.enterVehicle(b); G.cam.x = b.x; G.cam.y = b.y;
    ${drive(0, -1)}`), teardown: new Function(`(${undrive})(); window.__zoomMul = 1.35;`) },
  { name: 'fight', frames: 100, warm: 8, setup: new Function(`
    WORLD.clock = 12.5 * 60; const P = G.player; if (P.vehicle) G.exitVehicle(true);
    P.weapons.smg = 400; P.mags = Object.assign(P.mags || {}, { smg: 30 }); P.weapon = 'smg';
    P.x = MAP.cx(5) - 130; P.y = MAP.cy(5); P.a = 0; G.cam.x = P.x + 60; G.cam.y = P.y;
    for (let k = 0; k < 7; k++) { const x = P.x + 150 + (k % 3) * 60, y = P.y - 80 + Math.floor(k / 3) * 80; const g = new Person(x, y, 'goon', { skin: '#a86b3c', shirt: '#24262b', pat: 'plain', outfit: 'goon', hair: 'cap_red', hairCol: '#111', pants: '#1f2633' }); g.keep = true; g.home = { x, y }; g.state = 'guard'; g.hp = 100; g.gunCd = 1.2; g.weapon = 'pistola'; g.hostile = true; g.umb = null; G.peds.push(g); }`),
    each: new Function('f', `const P = G.player; P.hp = 100; if (f > 6 && f % 3 === 0) { P.fireCd = 0; GUNS.trigger(false); P.mags.smg = 30; }`),
    teardown: new Function(`for (const g of G.peds) if (g.kind === 'goon') g.remove = true;`) },
  { name: 'wedding', frames: 110, warm: 5, keepBig: true, setup: new Function(`
    WORLD.clock = 15.5 * 60; const P = G.player; if (P.vehicle) G.exitVehicle(true);
    G.flags.fam = { aff: { ligaya: 100 }, day: {}, partner: 'ligaya', stage: 'engaged', house: 0, kids: [], wedDay: 0 };
    const ch = MAP.pois.church_m || FAMILY.nearest('church'); window.__ch = ch; P.x = ch.x; P.y = ch.y + 210; P.a = -Math.PI / 2; G.cam.x = P.x; G.cam.y = P.y - 60;
    const L = new Person(P.x + 26, P.y + 20, 'ped'); L.npc = true; L.keep = true; L.look.shirt = '#e84393'; L.look.hair = 'long'; L.name = '💗 Ligaya'; L.umb = null; L.state = 'idle'; G.peds.push(L); window.__lig = L;`),
    each: new Function('f', `const P = G.player, ch = window.__ch, L = window.__lig; const st = INPUT._st || (INPUT._st = INPUT.state.bind(INPUT));
      INPUT.state = () => { const o = st(); const dy = ch.y - P.y, dx = ch.x - P.x, d = Math.hypot(dx, dy); if (d > 40) { o.mx = dx / d * 0.8; o.my = dy / d * 0.8; } return o; };
      if (L) { L.walkTo(P.x + 26, P.y + 18, 120, 1 / 30); L.phase += 0.35; L.move(1 / 30); }`),
    teardown: new Function(`if (INPUT._st) INPUT.state = INPUT._st; if (window.__lig) window.__lig.remove = true;`) },
  { name: 'carshow', frames: 100, warm: 5, keepBig: true, setup: new Function(`
    WORLD.clock = 21 * 60; const P = G.player; if (P.vehicle) G.exitVehicle(true); CARMOD.ensurePoi(); const cs = MAP.pois.carshow; window.__cs = cs;
    const v = new Vehicle('supercar', cs.x, cs.y + 260, -Math.PI / 2, { color: '#a044ff' }); v.upg = { eng: 3, arm: 2, sticker: 'flame', neon: '#00e5ff', rims: '#ffd400', kit: 'wide' }; G.vehicles.push(v); P.x = v.x; P.y = v.y; G.enterVehicle(v); G.cam.x = v.x; G.cam.y = v.y - 100; G.flags.fam = G.flags.fam || {}; G.flags.fam.day = {};`),
    each: new Function('f', `const P = G.player, v = P.vehicle, cs = window.__cs; const st = INPUT._st || (INPUT._st = INPUT.state.bind(INPUT));
      INPUT.state = () => { const o = st(); const dx = cs.x - v.x, dy = cs.y - v.y, d = Math.hypot(dx, dy); o.touchDrive = true; o.joy = d > 50 ? { x: dx / d, y: dy / d, mag: 0.7 } : { x: 0, y: 0, mag: 0 }; if (d <= 50) o.brake = true; return o; };
      if (f === 55) CARMOD.enter();`),
    teardown: new Function(`if (INPUT._st) INPUT.state = INPUT._st;`) },
  { name: 'angkas', frames: 150, warm: 5, keepUI: true, setup: new Function(`
    WORLD.clock = 18.6 * 60; const P = G.player; if (P.vehicle) G.exitVehicle(true); P.x = MAP.cx(4) + 70; P.y = MAP.cy(4) + 70; G.cam.x = P.x; G.cam.y = P.y;
    PHONE.msg('💍 Ligaya', 'Come home early, I made sinigang 😘'); document.querySelectorAll('#toasts > *').forEach(e => e.remove()); PHONE.open();`),
    each: new Function('f', `if (f === 28) PHONE.open('ride');
      if (f === 58) { document.querySelector('#phone-body [data-ang="1"]').click(); }
      if (f === 60 && ANGKAS.ride) { const v = ANGKAS.ride.v, P = G.player; v.x = P.x + 140; v.y = P.y + 50; }
      if (f > 60) G.paused = false;`),
    teardown: new Function(`if (ANGKAS.ride) ANGKAS.cancel(''); G.player.hidden = false; PHONE.close();`) },
  { name: 'map', frames: 90, warm: 2, keepUI: true, setup: new Function(`
    const P = G.player; P.x = MAP.cx(4); P.y = MAP.cy(4); UI.openMap(); MAPVIEW.setS(MAPVIEW.s0() * 2.2); MAPVIEW.draw();`),
    each: new Function('f', `if (f < 60) { MAPVIEW.setS(MAPVIEW.s * 0.955); MAPVIEW.draw(); } if (f === 62) { PHMAP.open(); }`),
    teardown: new Function(`PHMAP.close(); MAPVIEW.close();`) },
  { name: 'story', frames: 75, warm: 3, keepUI: true, setup: new Function(`
    const P = G.player; if (P.vehicle) G.exitVehicle(true); MS.idx = 0; const g = MS.giverPOI(MISSIONS[0]); P.x = g.x; P.y = g.y + 30; G.cam.x = P.x; G.cam.y = P.y; MS.start(0);`),
    each: new Function('f', `if (f === 25 || f === 50) { const b = document.getElementById('comic-next'); if (b) b.click(); }`),
    teardown: new Function(`UI.say([]); document.getElementById('comic').classList.add('hidden'); UI.talking = false; MS.active = null; MS.idx = 8; G.cutscene = false; G.paused = false;`) },
];
