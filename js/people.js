'use strict';
// ===== People: pedestrians, cops on foot, player =====
const SKINS = ['#c68b59', '#b87a4b', '#d9a066', '#a86b3c', '#e0b07a', '#9a5f35'];
const OUTFITS = [
  { id: 'floral_orange', name: 'Orange Floral Polo', shirt: '#f28c28', pat: 'floral' },
  { id: 'barong', name: 'Barong Tagalog', shirt: '#efe6cf', pat: 'barong' },
  { id: 'sando', name: 'Puting Sando', shirt: '#f0f0f0', pat: 'sando' },
  { id: 'jersey_blue', name: 'Blue Jersey #23', shirt: '#2e6fd1', pat: 'jersey' },
  { id: 'jersey_yellow', name: 'Yellow Jersey #7', shirt: '#f1c40f', pat: 'jersey' },
  { id: 'stripe_red', name: 'Red Stripes', shirt: '#c0392b', pat: 'stripe' },
  { id: 'hoodie', name: 'Gray Hoodie', shirt: '#6b7280', pat: 'hood' },
  { id: 'floral_teal', name: 'Teal Floral Polo', shirt: '#16a085', pat: 'floral' },
  { id: 'polo_pink', name: 'Pink Polo', shirt: '#e84393', pat: 'plain' },
  { id: 'army', name: 'Army Green Tee', shirt: '#4b5a32', pat: 'plain' },
  { id: 'black', name: 'Black Band Tee', shirt: '#24262b', pat: 'plain' },
  { id: 'purple', name: 'Purple Stripes', shirt: '#8e44ad', pat: 'stripe' },
];
const HAIRS = [
  { id: 'short', name: 'Gupit Binata' }, { id: 'buzz', name: 'Semi-kalbo' }, { id: 'long', name: 'Mahabang Buhok' },
  { id: 'cap_red', name: 'Pulang Cap' }, { id: 'cap_blue', name: 'Asul na Cap' }, { id: 'mohawk', name: 'Mohawk' },
  { id: 'curly', name: 'Kulot' }, { id: 'bald', name: 'Kalbo + Shades' }, { id: 'bucket', name: 'Bucket Hat' },
];
const HAIR_COLS = ['#1b1410', '#2b1d14', '#3a2a1c', '#141414', '#5a3b22'];

function randomLook() {
  const o = U.choice(OUTFITS), h = U.choice(HAIRS);
  return { skin: U.choice(SKINS), shirt: o.shirt, pat: o.pat, outfit: o.id, hair: h.id, hairCol: U.choice(HAIR_COLS), pants: U.choice(['#2b3a55', '#3b3b3b', '#4a3b2a', '#1f2633']) };
}
function copLook() { return { skin: U.choice(SKINS), shirt: '#1f3b73', pat: 'cop', outfit: 'cop', hair: 'copcap', hairCol: '#111', pants: '#1a2440' }; }

class Person {
  constructor(x, y, kind, look) {
    this.x = x; this.y = y; this.kind = kind; this.look = look || (kind === 'cop' ? copLook() : randomLook());
    this.a = Math.random() * TAU; this.vx = 0; this.vy = 0; this.r = 9;
    this.state = 'walk'; this.hp = 100; this.phase = Math.random() * 10; this.moveAmt = 0;
    this.speed = U.rand(50, 75); this.downT = 0; this.fleeT = 0; this.tx = 0; this.ty = 0;
    this.route = null; this.ri = 0; this.dir = Math.random() < 0.5 ? 1 : -1; this.punchT = 0; this.atkCd = 0;
    this.dead = false; this.fromCar = null; this.name = null; this.susp = 0; this.wave = 0;
    this.scale = 1; this.umb = Math.random() < 0.6 ? U.choice(['#c0392b', '#2e86c1', '#f1c40f', '#8e44ad', '#16a085', '#222']) : null;
  }
  knock(fromX, fromY, force) {
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.vx = Math.cos(a) * force; this.vy = Math.sin(a) * force;
    this.state = 'down'; this.downT = U.rand(4, 7); this.a = a;
    if (Math.random() < 0.55 && this.kind === 'ped') G.dropCash(this.x, this.y, U.randi(10, 80));
  }
  move(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    const r = this.r;
    const tx0 = Math.floor((this.x - r) / T), tx1 = Math.floor((this.x + r) / T), ty0 = Math.floor((this.y - r) / T), ty1 = Math.floor((this.y + r) / T);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (!MAP.solidT(tx, ty)) continue;
      const nx = U.clamp(this.x, tx * T, tx * T + T), ny = U.clamp(this.y, ty * T, ty * T + T);
      let dx = this.x - nx, dy = this.y - ny; const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      const d = Math.sqrt(d2);
      if (d < 0.01) { this.x -= this.vx * dt * 1.5; this.y -= this.vy * dt * 1.5; continue; }
      dx /= d; dy /= d; this.x += dx * (r - d); this.y += dy * (r - d);
      const vn = this.vx * dx + this.vy * dy; if (vn < 0) { this.vx -= dx * vn; this.vy -= dy * vn; }
      this.blocked = (this.blocked || 0) + dt;
    }
  }
  walkTo(tx, ty, sp, dt) {
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    if (d < 2) { this.vx = 0; this.vy = 0; this.moveAmt = 0; return d; }
    const ta = Math.atan2(dy, dx);
    this.a = this.a + U.angDiff(this.a, ta) * Math.min(1, dt * 10);
    this.vx = dx / d * sp; this.vy = dy / d * sp; this.moveAmt = Math.min(1, sp / 120);
    return d;
  }
  setupRing() {
    const [bi, bj] = MAP.blockOf(this.x, this.y);
    const [x0, y0, w, h] = MAP.blockRect(bi, bj);
    const l = (x0 + 0.5) * T, r = (x0 + w - 0.5) * T, t = (y0 + 0.5) * T, b = (y0 + h - 0.5) * T;
    this.route = [[l, t], [r, t], [r, b], [l, b]];
    // nearest corner index
    let best = 0, bd = 1e18;
    for (let k = 0; k < 4; k++) { const d = U.d2(this.x, this.y, this.route[k][0], this.route[k][1]); if (d < bd) { bd = d; best = k; } }
    this.ri = (best + (this.dir > 0 ? 1 : 3)) % 4;
  }
  updateAI(dt) {
    this.atkCd -= dt;
    if (this.state === 'down') {
      this.vx *= Math.pow(0.02, dt); this.vy *= Math.pow(0.02, dt); this.moveAmt = 0;
      this.move(dt); this.downT -= dt;
      if (this.downT <= 0) { this.state = this.kind === 'cop' ? 'chase' : 'flee'; this.fleeT = 4; this.tx = G.player.x; this.ty = G.player.y; }
      return;
    }
    if (this.kind === 'cop') { this.updateCop(dt); this.phase += dt * this.moveAmt * 12; this.move(dt); return; }
    if (this.state === 'hoop') {
      const c = this.court;
      if (!this.tgt || U.d2(this.x, this.y, this.tgt.x, this.tgt.y) < 64 || Math.random() < dt * 0.3) this.tgt = { x: c.x + 24 + Math.random() * (c.w - 48), y: c.y + 24 + Math.random() * (c.h - 48) };
      this.walkTo(this.tgt.x, this.tgt.y, this.speed, dt);
      const b = c.ball; if (b) this.a += U.angDiff(this.a, Math.atan2(b.y - this.y, b.x - this.x)) * Math.min(1, dt * 6);
      this.phase += dt * this.moveAmt * 14; this.move(dt); return;
    }
    if (this.state === 'pray') { this.vx = this.vy = 0; this.moveAmt = 0; this.a = this.faceA; return; }
    if (this.state === 'wander') {
      if (this.pause > 0) { this.pause -= dt; this.vx = this.vy = 0; this.moveAmt = 0; }
      else {
        if (!this.tgt || (this.blocked || 0) > 1.5) {
          this.blocked = 0;
          for (let k = 0; k < 6; k++) { const x = this.home.x + U.rand(-220, 220), y = this.home.y + U.rand(-220, 220); const tt = MAP.tileAt(x, y); if (tt === TL.GRASS || tt === TL.SAND || tt === TL.PIER) { this.tgt = { x, y }; break; } }
        }
        if (this.tgt && this.walkTo(this.tgt.x, this.tgt.y, this.speed, dt) < 8) { this.tgt = null; this.pause = U.rand(1, 4); }
      }
      this.phase += dt * this.moveAmt * 12; this.move(dt); return;
    }
    if (this.state === 'idle') {
      this.vx = 0; this.vy = 0; this.moveAmt = 0;
      const p = G.player; if (U.d2(this.x, this.y, p.x, p.y) < 200 * 200) this.a += U.angDiff(this.a, Math.atan2(p.y - this.y, p.x - this.x)) * Math.min(1, dt * 5);
      this.wave += dt;
      return;
    }
    if (this.state === 'flee') {
      this.fleeT -= dt;
      const a = Math.atan2(this.y - this.ty, this.x - this.tx) + Math.sin(this.phase * 0.3) * 0.3;
      this.walkTo(this.x + Math.cos(a) * 50, this.y + Math.sin(a) * 50, 190, dt);
      if (this.fleeT <= 0) { this.state = 'walk'; this.route = null; }
    } else if (this.state === 'walk') {
      if (!this.route) this.setupRing();
      const [tx, ty] = this.route[this.ri];
      const d = this.walkTo(tx, ty, this.speed, dt);
      if (d < 6) this.ri = (this.ri + (this.dir > 0 ? 1 : 3)) % 4;
      if ((this.blocked || 0) > 2) { this.route = null; this.blocked = 0; this.dir = -this.dir; }
    } else if (this.state === 'goto') {
      const d = this.walkTo(this.tx, this.ty, 120, dt);
      if (d < 8) { this.state = 'arrived'; this.vx = this.vy = 0; }
    } else if (this.state === 'arrived') { this.vx = this.vy = 0; this.moveAmt = 0; }
    this.phase += dt * this.moveAmt * 12;
    this.move(dt);
  }
  updateCop(dt) {
    const p = G.player;
    if (this.role === 'enforcer' && this.state !== 'chase') {
      this.vx = this.vy = 0; this.moveAmt = 0;
      if (this.post) this.a = Math.atan2(MAP.cy(this.post.j) - this.y, MAP.cx(this.post.i) - this.x) + Math.sin(G.time * 0.8 + this.x) * 0.6;
      return;
    }
    const tgt = p.vehicle || p;
    const d = U.dist(this.x, this.y, tgt.x, tgt.y);
    const active = WANTED.stars > 0 && (WANTED.mode === 'chase' || (d < 300 && WANTED.mode === 'search' && WANTED.recognized));
    if (active && d < 1400) {
      this.state = 'chase';
      let ax = tgt.x, ay = tgt.y;
      if (!(d < 200 && MAP.los(this.x, this.y, ax, ay))) {
        const n = MAP.fieldNext(G.walkField, this.x, this.y, 2);
        if (n) { ax = n.x; ay = n.y; }
      }
      const reach = p.vehicle ? p.vehicle.W / 2 + 14 : 22;
      if (d > reach) this.walkTo(ax, ay, 205, dt);
      else { this.vx = this.vy = 0; this.moveAmt = 0; this.a = Math.atan2(tgt.y - this.y, tgt.x - this.x); }
      if (d < reach + 10 && this.atkCd <= 0) {
        this.atkCd = 0.9; this.punchT = 0.25;
        if (!p.vehicle) { p.hurt(6, this.x, this.y); AUD.punch(); }
      }
      if (this.punchT > 0) this.punchT -= dt;
      ARMS.copFire(this, dt);
    } else if (this.fromCar) {
      // return to car / wander off
      this.state = 'walk';
      if (!this.route) this.setupRing();
      const [tx, ty] = this.route[this.ri];
      const dd = this.walkTo(tx, ty, 70, dt);
      if (dd < 6) this.ri = (this.ri + 1) % 4;
    } else {
      if (!this.route) this.setupRing();
      const [tx, ty] = this.route[this.ri];
      const dd = this.walkTo(tx, ty, 60, dt);
      if (dd < 6) this.ri = (this.ri + (this.dir > 0 ? 1 : 3)) % 4;
    }
  }
}

class Player extends Person {
  constructor(x, y) {
    super(x, y, 'player', { skin: '#c68b59', shirt: '#f28c28', pat: 'floral', outfit: 'floral_orange', hair: 'short', hairCol: '#1b1410', pants: '#2b3a55' });
    this.hp = 100; this.vehicle = null; this.punchCd = 0; this.arrest = 0; this.money = 0; this.r = 9;
    this.state = 'player'; this.outT = 0; this.hurtT = 0; this.downed = false;
    this.weapons = { fists: true }; this.weapon = 'fists'; this.swingT = 0;
  }
  faceId() { return this.look.hair; }
  hurt(n, fx, fy) {
    if (this.downed || G.cutscene) return;
    this.hp -= n * D().dmg; this.hurtT = 0.3;
    G.shake(3);
    if (this.hp <= 0) this.knockout('hp');
  }
  knockout(reason) {
    if (this.downed) return;
    this.downed = true; this.hp = 0;
    G.onWasted(reason);
  }
  update(dt, inp) {
    if (this.downed) return;
    this.punchCd -= dt; if (this.punchT > 0) this.punchT -= dt; if (this.hurtT > 0) this.hurtT -= dt;
    if (this.vehicle) {
      const v = this.vehicle;
      this.x = v.x; this.y = v.y; this.a = v.a;
      if (v.dead) { v.throttle = 0; v.steer = 0; v.hand = false; return; }
      this.turnQueued = false;
      if (inp.touchDrive) {
        const j = inp.joy;
        if (j.mag > 0.18) {
          let desired = Math.atan2(j.y, j.x);
          // easy mode "smart turn": if there's no road where you point, keep straight and turn at the next intersection
          this.turnQueued = false;
          if (SETTINGS.drive === 'madali' && !v.t.boat && MAP.tileAt(v.x, v.y) === TL.ROAD && v.speed > 40) {
            const Q = Math.PI / 2, cur = Math.round(v.a / Q) * Q, des = Math.round(desired / Q) * Q;
            const turn = Math.abs(U.angDiff(cur, des));
            if (turn > 0.5 && turn < 2.6) {
              const open = MAP.tileAt(v.x + Math.cos(des) * 90, v.y + Math.sin(des) * 90) === TL.ROAD && MAP.tileAt(v.x + Math.cos(des) * 150, v.y + Math.sin(des) * 150) === TL.ROAD;
              if (!open) {
                desired = cur; this.turnQueued = des; this.turnDes = des;
                // slow down when the side road is coming up
                const ax = v.x + Math.cos(cur) * 150, ay = v.y + Math.sin(cur) * 150;
                if (MAP.tileAt(ax + Math.cos(des) * 90, ay + Math.sin(des) * 90) === TL.ROAD) this.turnQueued = 'soon';
              } else desired = des;
            }
          }
          const diff = U.angDiff(v.a, desired);
          const fs = v.fwd();
          if (this.revMode) { if (Math.abs(diff) < 1.4) this.revMode = false; }
          else if (Math.abs(diff) > 2.3 && fs < 80) this.revMode = true;
          if (this.revMode) {
            const rd = U.angDiff(U.wrap(v.a + Math.PI), desired);
            v.throttle = -j.mag; v.steer = -U.clamp(rd * 2, -1, 1);
          } else {
            v.steer = U.clamp(diff * 2.2, -1, 1);
            v.throttle = j.mag * (Math.abs(diff) > 1.3 && fs > 260 ? 0.15 : 1);
            if (SETTINGS.drive === 'madali' && ((Math.abs(diff) > 0.5 && fs > 200) || (this.turnQueued === 'soon' && fs > 210))) v.throttle = -0.7;
          }
        } else { v.throttle = 0; v.steer = 0; this.revMode = false; }
        v.hand = inp.hand;
        if (inp.brake) v.throttle = -1;
      } else {
        v.throttle = inp.throttle; v.steer = inp.steer; v.hand = inp.hand;
      }
      v.assist = SETTINGS.drive === 'madali';
      if (v.assist && !v.t.boat) {
        const sp = v.speed, fs = v.fwd();
        // keep the car straight along the road grid when not steering
        if (Math.abs(v.steer) < 0.2 && sp > 80) {
          const ax = Math.round(v.a / (Math.PI / 2)) * (Math.PI / 2), d = U.angDiff(v.a, ax);
          if (Math.abs(d) < 0.3) v.a = U.wrap(v.a + d * Math.min(1, G.dt * 3));
        }
        // brake before hitting a wall
        if (fs > 160 && v.throttle >= 0) {
          const look = Math.min(170, fs * 0.32) + v.L / 2;
          if (MAP.solidAt(v.x + Math.cos(v.a) * look, v.y + Math.sin(v.a) * look)) v.throttle = -0.7;
        }
      }
      return;
    }
    // on foot
    let mx = inp.mx, my = inp.my;
    const m = Math.hypot(mx, my);
    const sp = (inp.run || m > 0.92 && inp.touch ? 235 : 140) * (m > 1 ? 1 / m : 1);
    if (m > 0.1) {
      this.vx = mx * sp; this.vy = my * sp;
      const ta = Math.atan2(my, mx);
      this.a = this.a + U.angDiff(this.a, ta) * Math.min(1, dt * 14);
      this.moveAmt = Math.min(1, sp * m / 130);
    } else { this.vx *= 0.7; this.vy *= 0.7; this.moveAmt = 0; }
    this.phase += dt * this.moveAmt * 13;
    if (this.swingT > 0) this.swingT -= dt;
    if (this.weapon === 'watergun' && (INPUT.keys.Space || INPUT.bHeld) && !UI.talking && !G.cutscene) ARMS.spray(dt);
    this.move(dt);
  }
  punch() {
    if (this.vehicle || this.punchCd > 0 || this.downed) return;
    this.punchCd = 0.38; this.punchT = 0.2;
    const hx = this.x + Math.cos(this.a) * 20, hy = this.y + Math.sin(this.a) * 20;
    let hit = false;
    for (const p of G.peds) {
      if (p.state === 'down' || p === this) continue;
      if (U.d2(hx, hy, p.x, p.y) < 22 * 22) {
        hit = true;
        p.hp -= 50;
        if (p.hp <= 0 || p.kind !== 'cop' || Math.random() < 0.5) { p.knock(this.x, this.y, 160); p.hp = 100; }
        else { p.vx = Math.cos(this.a) * 120; p.vy = Math.sin(this.a) * 120; }
        if (p.kind === 'cop') WANTED.crime(3, p.x, p.y, true);
        else if (!p.npc) { WANTED.crime(1, this.x, this.y); G.panic(this.x, this.y, 260); }
        G.particle('hit', hx, hy);
      }
    }
    if (hit) AUD.punch(); else AUD.whoosh();
  }
}

function drawPerson(g, p, now) {
  g.save(); g.translate(p.x, p.y);
  const L = p.look;
  if (p.state === 'down' || p.downed) {
    g.rotate(p.a);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(2, 3, 16, 9, 0, 0, TAU); g.fill();
    g.fillStyle = L.pants; g.fillRect(-16, -5, 10, 4); g.fillRect(-16, 1, 10, 4);
    g.fillStyle = L.shirt; U.rr(g, -8, -7, 14, 14, 4); g.fill();
    g.fillStyle = L.skin; g.beginPath(); g.arc(10, 0, 6, 0, TAU); g.fill();
    g.fillStyle = L.hairCol; g.beginPath(); g.arc(11, 0, 6, -1.2, 1.2); g.fill();
    // dizzy stars
    g.fillStyle = '#f2c14e';
    for (let k = 0; k < 3; k++) { const a = now * 4 + k * TAU / 3; g.fillRect(10 + Math.cos(a) * 10 - 1.5, Math.sin(a) * 10 - 1.5, 3, 3); }
    g.restore(); return;
  }
  g.rotate(p.a);
  if (p.scale !== 1 && p.scale) g.scale(p.scale, p.scale);
  const sw = Math.sin(p.phase) * p.moveAmt * 6;
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(3, 4, 11, 12, 0, 0, TAU); g.fill();
  // feet
  g.fillStyle = '#1a1a1a';
  g.beginPath(); g.ellipse(sw, -4.5, 4, 2.6, 0, 0, TAU); g.ellipse(-sw, 4.5, 4, 2.6, 0, 0, TAU); g.fill();
  // arms
  const pt = p.punchT > 0 ? 1 : 0;
  const sleeve = L.pat === 'sando' ? L.skin : L.shirt;
  g.fillStyle = sleeve;
  g.beginPath(); g.arc(-sw * 0.7, -9.5, 3.6, 0, TAU); g.arc(sw * 0.7 + pt * 12, 9.5 - pt * 3, 3.6, 0, TAU); g.fill();
  g.fillStyle = L.skin;
  g.beginPath(); g.arc(-sw * 0.7 + 2, -10, 2.4, 0, TAU); g.arc(sw * 0.7 + 2 + pt * 12, 10 - pt * 3, 2.4, 0, TAU); g.fill();
  if (p.weapon && p.weapon !== 'fists') {
    const hx = sw * 0.7 + 3 + pt * 10, hy = 10 - pt * 3;
    g.save(); g.translate(hx, hy);
    if (p.weapon === 'pamalo') { g.rotate(p.swingT > 0 ? -1.4 + (0.25 - p.swingT) * 9 : -0.5); g.fillStyle = '#8a5a2b'; U.rr(g, 0, -2, 22, 4, 2); g.fill(); }
    else if (p.weapon === 'tirador') { g.strokeStyle = '#7a4a22'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(6, 0); g.moveTo(6, 0); g.lineTo(10, -4); g.moveTo(6, 0); g.lineTo(10, 4); g.stroke(); }
    else if (p.weapon === 'watergun') { g.fillStyle = '#ff8c1a'; U.rr(g, 0, -3, 12, 6, 2); g.fill(); g.fillStyle = '#3aa0ff'; g.beginPath(); g.arc(4, 0, 3.5, 0, TAU); g.fill(); }
    g.restore();
  }
  // torso
  g.fillStyle = L.shirt; g.beginPath(); g.ellipse(0, 0, 7.5, 10.5, 0, 0, TAU); g.fill();
  if (L.pat === 'floral') {
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [fx, fy] of [[-3, -5], [2, 4], [-2, 6], [3, -2]]) { g.beginPath(); g.arc(fx, fy, 1.6, 0, TAU); g.fill(); }
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(-3, -5, 0.8, 0, TAU); g.arc(2, 4, 0.8, 0, TAU); g.fill();
  } else if (L.pat === 'stripe') {
    g.fillStyle = 'rgba(255,255,255,0.45)'; for (let y = -8; y < 9; y += 4) g.fillRect(-6, y, 12, 1.5);
  } else if (L.pat === 'barong') {
    g.strokeStyle = 'rgba(150,130,90,0.5)'; g.lineWidth = 0.8; for (let y = -7; y < 8; y += 2.5) { g.beginPath(); g.moveTo(-5, y); g.lineTo(5, y); g.stroke(); }
  } else if (L.pat === 'jersey') {
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(-3, -2.5, 2, 5); g.fillRect(0, -2.5, 2, 5);
  } else if (L.pat === 'hood') {
    g.fillStyle = U.shade(L.shirt, -0.25); g.beginPath(); g.ellipse(-5, 0, 3, 6, 0, 0, TAU); g.fill();
  } else if (L.pat === 'vest') {
    g.fillStyle = '#d4ff3a'; g.fillRect(-4, -10, 3, 20); g.fillRect(2, -10, 3, 20);
  } else if (L.pat === 'cop') {
    g.fillStyle = '#f2c14e'; g.fillRect(1, -6, 2, 2);
  }
  // head
  g.fillStyle = L.skin; g.beginPath(); g.arc(1, 0, 6.3, 0, TAU); g.fill();
  g.fillStyle = L.hairCol;
  switch (L.hair) {
    case 'short': g.beginPath(); g.arc(0.3, 0, 6.6, 1.0, TAU - 1.0); g.fill(); break;
    case 'buzz': g.globalAlpha = 0.55; g.beginPath(); g.arc(0.5, 0, 6.3, 1.2, TAU - 1.2); g.fill(); g.globalAlpha = 1; break;
    case 'long': g.beginPath(); g.arc(0, 0, 7.2, 0.9, TAU - 0.9); g.fill(); g.beginPath(); g.ellipse(-6, 0, 5, 6, 0, 0, TAU); g.fill(); break;
    case 'curly': for (let k = 0; k < 7; k++) { const a = 1.1 + k * (TAU - 2.2) / 6; g.beginPath(); g.arc(Math.cos(a) * 5, Math.sin(a) * 5, 3, 0, TAU); g.fill(); } break;
    case 'mohawk': g.fillRect(-6, -1.6, 10, 3.2); break;
    case 'cap_red': case 'cap_blue': case 'copcap': {
      g.fillStyle = L.hair === 'cap_red' ? '#c0392b' : L.hair === 'cap_blue' ? '#2e6fd1' : '#14203d';
      g.beginPath(); g.arc(0, 0, 6.8, 0, TAU); g.fill(); g.fillRect(3, -5, 7, 10);
      if (L.hair === 'copcap') { g.fillStyle = '#f2c14e'; g.fillRect(3, -1, 2, 2); }
      break;
    }
    case 'bucket': g.fillStyle = '#c9b48a'; g.beginPath(); g.arc(0.5, 0, 8.5, 0, TAU); g.fill(); g.fillStyle = '#b19c72'; g.beginPath(); g.arc(0.5, 0, 5.5, 0, TAU); g.fill(); break;
    case 'bald': g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(-1, -2, 2, 0, TAU); g.fill(); g.fillStyle = '#111'; g.fillRect(5, -5, 2.5, 10); break;
  }
  // vendor props
  if (p.vendor === 'taho') {
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -18); g.lineTo(0, 18); g.stroke();
    g.fillStyle = '#c9ced6'; g.beginPath(); g.arc(0, -20, 6, 0, TAU); g.arc(0, 20, 6, 0, TAU); g.fill();
  } else if (p.vendor === 'balut') {
    g.fillStyle = '#a0784a'; g.beginPath(); g.arc(9, 9, 7, 0, TAU); g.fill();
    g.fillStyle = '#efe6cf'; g.beginPath(); g.arc(8, 8, 2, 0, TAU); g.arc(11, 10, 2, 0, TAU); g.fill();
  }
  g.restore();
  // umbrella in the rain
  if (p.umb && WORLD.rain > 0.3 && p.kind === 'ped' && p.state !== 'hoop' && !p.npc) {
    g.save(); g.translate(p.x - 2, p.y - 2);
    g.fillStyle = p.umb; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); g.stroke(); }
    g.restore();
  }
  // name / suspicion marker
  if (p.susp > 0.05) {
    g.save(); g.translate(p.x, p.y - 26);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
    g.fillStyle = p.susp > 0.6 ? '#e74c3c' : '#f39c12'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 1);
    g.restore();
  }
}
