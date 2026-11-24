'use strict';
// ===== Vehicles =====
const VT = {
  sedan: { name: 'Sedan', L: 62, W: 30, max: 520, acc: 430, brake: 900, grip: 9, steer: 2.8, mass: 1, hp: 100, cruise: 230, value: 400, draw: 'car' },
  hatch: { name: 'Hatchback', L: 54, W: 28, max: 480, acc: 450, brake: 900, grip: 9, steer: 3.0, mass: 0.9, hp: 90, cruise: 220, value: 300, draw: 'car' },
  taxi: { name: 'Taxi', L: 62, W: 30, max: 500, acc: 420, brake: 900, grip: 9, steer: 2.8, mass: 1, hp: 100, cruise: 240, value: 350, draw: 'car', color: '#e9e9e4' },
  suv: { name: 'SUV', L: 68, W: 34, max: 500, acc: 400, brake: 850, grip: 8.5, steer: 2.5, mass: 1.4, hp: 140, cruise: 230, value: 700, draw: 'suv' },
  mayor: { name: 'Itim na SUV', L: 70, W: 35, max: 520, acc: 420, brake: 850, grip: 8.5, steer: 2.5, mass: 1.5, hp: 200, cruise: 250, value: 900, draw: 'suv', color: '#14161b' },
  van: { name: 'L-Van', L: 72, W: 34, max: 420, acc: 330, brake: 800, grip: 8, steer: 2.3, mass: 1.6, hp: 150, cruise: 200, value: 350, draw: 'van' },
  jeepney: { name: 'Jeepney', L: 96, W: 38, max: 380, acc: 290, brake: 750, grip: 8, steer: 2.1, mass: 2, hp: 180, cruise: 185, value: 600, draw: 'jeep' },
  tricycle: { name: 'Tricycle', L: 46, W: 34, max: 300, acc: 340, brake: 800, grip: 9, steer: 3.3, mass: 0.6, hp: 60, cruise: 150, value: 120, draw: 'trike' },
  motor: { name: 'Motorsiklo', L: 40, W: 14, max: 600, acc: 620, brake: 1000, grip: 12, steer: 3.6, mass: 0.4, hp: 50, cruise: 250, value: 250, draw: 'moto' },
  sports: { name: 'Sports Car', L: 62, W: 31, max: 720, acc: 720, brake: 1100, grip: 10.5, steer: 3.0, mass: 1, hp: 110, cruise: 260, value: 1500, draw: 'sports' },
  bus: { name: 'Provincial Bus', L: 150, W: 44, max: 340, acc: 220, brake: 650, grip: 8, steer: 1.6, mass: 4, hp: 300, cruise: 170, value: 800, draw: 'bus' },
  police: { name: 'Patrol Car', L: 64, W: 30, max: 610, acc: 560, brake: 1000, grip: 10, steer: 2.9, mass: 1.25, hp: 130, cruise: 250, value: 500, draw: 'police', cop: 1 },
  policemoto: { name: 'Police Motor', L: 42, W: 14, max: 630, acc: 650, brake: 1000, grip: 12, steer: 3.6, mass: 0.45, hp: 60, cruise: 250, value: 300, draw: 'moto', cop: 1, color: '#eef1f5' },
  swat: { name: 'SWAT Armored', L: 80, W: 38, max: 490, acc: 430, brake: 900, grip: 9, steer: 2.3, mass: 3, hp: 380, cruise: 230, value: 1000, draw: 'swat', cop: 1, armor: 2 },
  army: { name: 'Army Truck', L: 96, W: 40, max: 470, acc: 380, brake: 800, grip: 9, steer: 2.1, mass: 3.6, hp: 420, cruise: 230, value: 1000, draw: 'army', cop: 1, armor: 2 },
  armored: { name: 'Armored Van', L: 84, W: 40, max: 440, acc: 340, brake: 800, grip: 8.5, steer: 2.2, mass: 3, hp: 600, cruise: 200, value: 0, draw: 'armored', armor: 2 },
};
const CAR_COLORS = ['#e8e8e8', '#c0392b', '#2e86c1', '#1c1f26', '#7f8c8d', '#d35400', '#27ae60', '#f1c40f', '#8e44ad', '#16a085', '#bdc3c7', '#a0522d', '#f28c28', '#5b6ee1'];
const JEEP_COLORS = ['#c0392b', '#2e86c1', '#d4ac0d', '#27ae60', '#8e44ad', '#e67e22', '#e84393', '#16a085'];
let VID = 0;

class Vehicle {
  constructor(type, x, y, a, opt = {}) {
    const t = VT[type];
    this.type = type; this.t = t; this.id = ++VID; this.ident = this.id;
    this.x = x; this.y = y; this.a = a || 0; this.vx = 0; this.vy = 0; this.av = 0;
    this.L = t.L; this.W = t.W; this.r = t.W * 0.5; this.mass = t.mass;
    this.hp = t.hp; this.maxhp = t.hp;
    this.color = opt.color || t.color || U.choice(CAR_COLORS);
    this.color2 = U.choice(JEEP_COLORS); this.color3 = U.choice(JEEP_COLORS);
    this.driver = null; this.ai = null; this.siren = false;
    this.throttle = 0; this.steer = 0; this.hand = false; this.braking = false;
    this.dead = false; this.burn = 0; this.burnt = false; this.popped = false;
    this.plate = U.plate(); this.isCop = !!t.cop; this.seed = Math.random() * 1000 | 0;
    this.lastImpact = 0; this.passengers = 0; this.parked = !!opt.parked; this.mission = null;
    this.invuln = false; this.alarm = false; this.locked = false;
    const n = Math.max(2, Math.round(t.L / t.W));
    this.circ = [];
    for (let k = 0; k < n; k++) this.circ.push(-t.L / 2 + this.r + (t.L - 2 * this.r) * (n === 1 ? 0.5 : k / (n - 1)));
  }
  get speed() { return Math.hypot(this.vx, this.vy); }
  fwd() { return this.vx * Math.cos(this.a) + this.vy * Math.sin(this.a); }
  isBig() { return this.mass >= 2; }
  update(dt) {
    const t = this.t;
    if (this.burnt) { this.vx *= 0.9; this.vy *= 0.9; this.x += this.vx * dt; this.y += this.vy * dt; this.collideTiles(); return; }
    if (this.dead) {
      this.burn -= dt; this.throttle = 0; this.steer = 0;
      if (this.burn <= 0) this.explode();
    }
    let ca = Math.cos(this.a), sa = Math.sin(this.a);
    let vf = this.vx * ca + this.vy * sa, vr = -this.vx * sa + this.vy * ca;
    const tile = MAP.tileAt(this.x, this.y);
    const terrain = tile === TL.GRASS ? 0.72 : 1;
    const maxS = t.max * (this.speedMul || 1) * (this.popped ? 0.55 : 1) * terrain * (this.hp < this.maxhp * 0.2 ? 0.8 : 1);
    const th = this.throttle;
    this.braking = false;
    if (th > 0) {
      if (vf < -15) { vf += t.brake * th * dt; this.braking = true; }
      else if (vf < maxS) vf += t.acc * th * dt * (1 - 0.6 * (vf / maxS) * (vf / maxS));
    } else if (th < 0) {
      if (vf > 15) { vf += t.brake * th * dt; this.braking = true; if (vf < 0) vf = 0; }
      else if (vf > -maxS * 0.38) vf += t.acc * 0.65 * th * dt;
    } else {
      const roll = 70 * dt; vf = Math.abs(vf) < roll ? 0 : vf - Math.sign(vf) * roll;
    }
    if (vf > maxS) vf = U.lerp(vf, maxS, dt * 2);
    vf -= vf * 0.12 * dt;
    if (this.hand) { const b = Math.min(Math.abs(vf), 260 * dt); vf -= Math.sign(vf) * b; this.braking = true; }
    const grip = this.hand ? 1.4 : t.grip * (this.popped ? 0.55 : 1);
    vr *= Math.exp(-grip * dt);
    // steering
    const sf = U.clamp(vf / 150, -1, 1);
    const hiSpeed = 1 - Math.min(Math.abs(vf) / (t.max * 2.4), 0.32);
    const targetAv = this.steer * t.steer * sf * hiSpeed * (this.hand ? 1.45 : 1);
    this.av = U.lerp(this.av, targetAv, Math.min(1, dt * 9));
    this.a = U.wrap(this.a + this.av * dt);
    ca = Math.cos(this.a); sa = Math.sin(this.a);
    this.vx = ca * vf - sa * vr; this.vy = sa * vf + ca * vr;
    // skid marks
    if (Math.abs(vr) > 140 && G.frame % 2 === 0) G.addSkid(this);
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.collideTiles();
    if (this.lastImpact > 0) this.lastImpact -= dt;
    // smoke & fire
    if (!this.dead && this.hp < this.maxhp * 0.3 && Math.random() < 0.25) G.particle('smoke', this.x + ca * this.L * 0.35, this.y + sa * this.L * 0.35);
    if (this.dead && Math.random() < 0.6) G.particle('fire', this.x + U.rand(-12, 12), this.y + U.rand(-12, 12));
  }
  collideTiles() {
    const ca = Math.cos(this.a), sa = Math.sin(this.a);
    const r = this.r * 0.9;
    let hit = 0;
    for (const off of this.circ) {
      let cx = this.x + ca * off, cy = this.y + sa * off;
      const tx0 = Math.floor((cx - r) / T), tx1 = Math.floor((cx + r) / T), ty0 = Math.floor((cy - r) / T), ty1 = Math.floor((cy + r) / T);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (!MAP.solidT(tx, ty)) continue;
        const nx = U.clamp(cx, tx * T, tx * T + T), ny = U.clamp(cy, ty * T, ty * T + T);
        let dx = cx - nx, dy = cy - ny; const d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        let d = Math.sqrt(d2), pen;
        if (d < 0.01) {
          // inside tile: push toward tile edge nearest
          const l = cx - tx * T, rr = tx * T + T - cx, tp = cy - ty * T, bt = ty * T + T - cy;
          const m = Math.min(l, rr, tp, bt);
          dx = m === l ? -1 : m === rr ? 1 : 0; dy = m === tp ? -1 : m === bt ? 1 : 0; if (dx && dy) dy = 0;
          pen = m + r;
        } else { dx /= d; dy /= d; pen = r - d; }
        this.x += dx * pen; this.y += dy * pen; cx += dx * pen; cy += dy * pen;
        const vn = this.vx * dx + this.vy * dy;
        if (vn < 0) {
          this.vx -= dx * vn * 1.25; this.vy -= dy * vn * 1.25;
          this.vx *= 0.96; this.vy *= 0.96;
          hit = Math.max(hit, -vn);
          // rotate a bit away from wall
          const cross = off * (dx * sa - dy * ca);
          this.av += U.clamp(cross * 0.002 * -vn / 100, -2, 2);
        }
      }
    }
    if (hit > 0) this.impact(hit, null);
  }
  impact(sp, other) {
    if (sp < 130 || this.burnt) return;
    // damage once per impact: during the cooldown only a harder hit adds the difference
    let dmg;
    if (this.lastImpact > 0) { if (sp <= this.lastSp) return; dmg = (sp - this.lastSp) * 0.055; this.lastSp = sp; }
    else { dmg = (sp - 130) * 0.055; this.lastSp = sp; }
    dmg /= (this.t.armor || 1);
    if (this.driver === 'player') dmg *= D().carDmg;
    if (!this.invuln) this.hp -= dmg;
    if (this.lastImpact <= 0) {
      this.lastImpact = 0.35;
      const near = G.player && U.dist(this.x, this.y, G.cam.x, G.cam.y) < 900;
      if (near) AUD.crash(Math.min(1, sp / 600));
      if (this.driver === 'player') G.shake(Math.min(12, sp / 50));
      for (let k = 0; k < 4; k++) G.particle('spark', this.x + U.rand(-15, 15), this.y + U.rand(-15, 15));
    }
    if (this.hp <= 0 && !this.dead) this.wreck();
  }
  wreck() {
    if (this.invuln) { this.hp = 1; return; }
    this.dead = true; this.burn = 5; this.hp = 0; this.siren = false;
    if (this.driver === 'player') { UI.toast('🔥 Masusunog ang sasakyan! LUMABAS KA!'); }
    if (this.isCop && this.lastHitByPlayer) WANTED.crime(4, this.x, this.y, true);
    if (this.ai && this.driver !== 'player') { this.ai = null; if (this.driver) { G.ejectDriver(this); } }
  }
  explode() {
    this.burnt = true; this.dead = true;
    G.explosion(this.x, this.y);
    if (this.driver === 'player') G.player.knockout('explosion');
  }
}

// ---------- drawing ----------
function drawVehicle(g, v, now) {
  g.save(); g.translate(v.x, v.y); g.rotate(v.a);
  const L = v.L, W = v.W, hl = L / 2, hw = W / 2;
  g.fillStyle = 'rgba(0,0,0,0.38)'; U.rr(g, -hl + 4, -hw + 6, L, W, Math.min(W * 0.3, 10)); g.fill();
  const col = v.burnt ? '#2a2826' : v.color;
  switch (v.t.draw) {
    case 'car': case 'police': case 'sports': drawCar(g, v, col, hl, hw, now); break;
    case 'suv': drawSUV(g, v, col, hl, hw); break;
    case 'van': drawVan(g, v, col, hl, hw); break;
    case 'jeep': drawJeep(g, v, col, hl, hw); break;
    case 'trike': drawTrike(g, v, col, hl, hw); break;
    case 'moto': drawMoto(g, v, col, hl, hw); break;
    case 'bus': drawBus(g, v, col, hl, hw); break;
    case 'swat': drawBox(g, v, '#1f2a3a', hl, hw, now, true); break;
    case 'army': drawArmy(g, v, hl, hw); break;
    case 'armored': drawBox(g, v, '#5c6670', hl, hw, now, false); break;
  }
  if (v.burnt) { g.fillStyle = 'rgba(0,0,0,0.45)'; U.rr(g, -hl, -hw, L, W, 6); g.fill(); }
  g.restore();
}
function lightsFrontBack(g, v, hl, hw) {
  g.fillStyle = '#fff3c4';
  g.fillRect(hl - 5, -hw + 3, 4, 6); g.fillRect(hl - 5, hw - 9, 4, 6);
  g.fillStyle = v.braking ? '#ff3b3b' : '#a01e1e';
  g.fillRect(-hl + 1, -hw + 3, 3, 6); g.fillRect(-hl + 1, hw - 9, 3, 6);
}
function drawCar(g, v, col, hl, hw, now) {
  const sport = v.t.draw === 'sports', pol = v.t.draw === 'police';
  g.fillStyle = col; U.rr(g, -hl, -hw, hl * 2, hw * 2, hw * 0.75); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5; g.stroke();
  if (pol) { g.fillStyle = '#1d3f8f'; g.fillRect(-hl * 0.6, -hw, hl * 1.1, 4); g.fillRect(-hl * 0.6, hw - 4, hl * 1.1, 4); g.fillStyle = '#16181d'; g.fillRect(hl * 0.62, -hw + 2, hl * 0.3, hw * 2 - 4); }
  if (sport) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(-hl + 4, -3, hl * 2 - 8, 2); g.fillRect(-hl + 4, 1, hl * 2 - 8, 2); }
  // hood shading
  g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(hl * 0.45, -hw + 3, hl * 0.45, hw * 2 - 6);
  // windshield
  g.fillStyle = '#18202d';
  g.beginPath(); g.moveTo(hl * 0.42, -hw + 3); g.lineTo(hl * 0.12, -hw + 4); g.lineTo(hl * 0.12, hw - 4); g.lineTo(hl * 0.42, hw - 3); g.closePath(); g.fill();
  g.fillStyle = 'rgba(160,200,255,0.18)'; g.fillRect(hl * 0.22, -hw + 6, 3, hw - 2);
  // roof
  g.fillStyle = U.shade(col, sport ? -0.1 : 0.08); U.rr(g, -hl * 0.45, -hw + 4, hl * 0.57, hw * 2 - 8, 4); g.fill();
  // rear window
  g.fillStyle = '#18202d'; g.beginPath(); g.moveTo(-hl * 0.45, -hw + 4); g.lineTo(-hl * 0.68, -hw + 5); g.lineTo(-hl * 0.68, hw - 5); g.lineTo(-hl * 0.45, hw - 4); g.closePath(); g.fill();
  if (sport) { g.fillStyle = '#111'; g.fillRect(-hl + 1, -hw + 2, 5, hw * 2 - 4); }
  if (v.type === 'taxi') { g.fillStyle = '#f2c14e'; g.fillRect(-hl * 0.2, -5, 9, 10); g.fillStyle = '#2b2b2b'; g.fillRect(-hl * 0.2 + 3, -3, 3, 6); }
  if (pol) lightbar(g, v, -hl * 0.12, hw, now);
  lightsFrontBack(g, v, hl, hw);
  // mirrors
  g.fillStyle = col; g.fillRect(hl * 0.12, -hw - 2, 4, 3); g.fillRect(hl * 0.12, hw - 1, 4, 3);
}
function lightbar(g, v, x, hw, now) {
  const on = v.siren && !v.dead; const ph = Math.floor(now * 8) % 2;
  g.fillStyle = '#222'; g.fillRect(x - 3, -hw + 3, 7, hw * 2 - 6);
  g.fillStyle = on ? (ph ? '#ff3030' : '#601010') : '#7a1d1d'; g.fillRect(x - 2, -hw + 4, 5, hw - 5);
  g.fillStyle = on ? (ph ? '#102060' : '#3070ff') : '#1d3a7a'; g.fillRect(x - 2, 1, 5, hw - 5);
}
function drawSUV(g, v, col, hl, hw) {
  g.fillStyle = col; U.rr(g, -hl, -hw, hl * 2, hw * 2, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#18202d'; g.fillRect(hl * 0.18, -hw + 3, hl * 0.26, hw * 2 - 6);
  g.fillStyle = U.shade(col, 0.1); U.rr(g, -hl * 0.78, -hw + 4, hl * 0.95, hw * 2 - 8, 4); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-hl * 0.7, -hw + 7); g.lineTo(hl * 0.1, -hw + 7); g.moveTo(-hl * 0.7, hw - 7); g.lineTo(hl * 0.1, hw - 7); g.stroke();
  g.fillStyle = '#18202d'; g.fillRect(-hl * 0.92, -hw + 4, 4, hw * 2 - 8);
  if (v.type === 'mayor') { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(hl * 0.5, -1, hl * 0.4, 2); }
  lightsFrontBack(g, v, hl, hw);
}
function drawVan(g, v, col, hl, hw) {
  g.fillStyle = col; U.rr(g, -hl, -hw, hl * 2, hw * 2, 6); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#18202d'; g.fillRect(hl * 0.62, -hw + 3, hl * 0.2, hw * 2 - 6);
  g.fillStyle = U.shade(col, 0.12); U.rr(g, -hl + 3, -hw + 3, hl * 1.58, hw * 2 - 6, 4); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = -hl + 10; x < hl * 0.5; x += 10) g.fillRect(x, -hw + 4, 2, hw * 2 - 8);
  lightsFrontBack(g, v, hl, hw);
}
function drawJeep(g, v, col, hl, hw) {
  // chrome body
  g.fillStyle = '#b9c0c8'; U.rr(g, -hl, -hw, hl * 2, hw * 2, 6); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.5; g.stroke();
  // hood (front 22%)
  const hx = hl * 0.56;
  g.fillStyle = '#d3d8de'; U.rr(g, hx, -hw + 5, hl - hx - 2, hw * 2 - 10, 4); g.fill();
  g.fillStyle = '#8d949c'; for (let y = -hw + 9; y < hw - 6; y += 5) g.fillRect(hl - 5, y, 3, 2);
  // horse ornaments
  g.fillStyle = '#f5f5f5'; g.beginPath(); g.moveTo(hl - 8, -6); g.lineTo(hl - 1, -8); g.lineTo(hl - 6, -2); g.fill();
  g.beginPath(); g.moveTo(hl - 8, 6); g.lineTo(hl - 1, 8); g.lineTo(hl - 6, 2); g.fill();
  // windshield
  g.fillStyle = '#18202d'; g.fillRect(hx - 8, -hw + 4, 7, hw * 2 - 8);
  // roof painted
  const rx = -hl + 4, rw = hx - 10 - rx;
  g.fillStyle = v.burnt ? '#2a2826' : col; U.rr(g, rx, -hw + 3, rw, hw * 2 - 6, 4); g.fill();
  g.fillStyle = v.burnt ? '#222' : v.color2;
  g.fillRect(rx + 4, -hw + 6, rw - 8, 4); g.fillRect(rx + 4, hw - 10, rw - 8, 4);
  g.fillStyle = v.burnt ? '#222' : v.color3;
  for (let x = rx + 10; x < rx + rw - 10; x += 14) { g.beginPath(); g.arc(x, 0, 4, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(rx + 4, -1, rw - 8, 2);
  // open back
  g.fillStyle = '#1c2029'; g.fillRect(-hl + 1, -hw + 8, 4, hw * 2 - 16);
  // round lights
  g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(hl - 3, -hw + 5, 3, 0, TAU); g.arc(hl - 3, hw - 5, 3, 0, TAU); g.fill();
  g.fillStyle = v.braking ? '#ff3b3b' : '#a01e1e'; g.fillRect(-hl + 1, -hw + 2, 3, 5); g.fillRect(-hl + 1, hw - 7, 3, 5);
  if (v.passengers > 0) { g.fillStyle = '#f2c14e'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.save(); g.rotate(Math.PI / 2); g.restore(); }
}
function drawTrike(g, v, col, hl, hw) {
  // motorcycle on left (-y side), sidecar on right
  g.fillStyle = '#222'; U.rr(g, -hl, -hw + 2, hl * 2 - 4, 10, 4); g.fill();
  g.fillStyle = '#555'; g.fillRect(hl * 0.55, -hw - 1, 3, 16);
  // sidecar
  g.fillStyle = col; U.rr(g, -hl + 2, -hw + 10, hl * 2 - 6, hw * 2 - 10, 6); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = U.shade(col, -0.2); U.rr(g, -hl + 6, -hw + 13, hl * 1.4, hw * 2 - 16, 4); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-hl + 8, hw - 6, hl * 1.2, 2);
  // rider
  if (v.driver) { g.fillStyle = '#3a6ea5'; g.beginPath(); g.ellipse(-2, -hw + 7, 6, 8, 0, 0, TAU); g.fill(); g.fillStyle = '#1b1410'; g.beginPath(); g.arc(1, -hw + 7, 5, 0, TAU); g.fill(); }
  g.fillStyle = '#fff3c4'; g.fillRect(hl - 4, -hw + 4, 3, 5);
}
function drawMoto(g, v, col, hl, hw) {
  g.fillStyle = '#1a1a1a'; U.rr(g, -hl, -3, hl * 2, 6, 3); g.fill();
  g.fillStyle = col; U.rr(g, -hl * 0.5, -hw, hl * 1.2, hw * 2, 5); g.fill();
  if (v.isCop) { g.fillStyle = '#1d3f8f'; g.fillRect(-hl * 0.3, -2, hl * 0.6, 4); }
  g.fillStyle = '#666'; g.fillRect(hl * 0.45, -hw - 4, 3, hw * 2 + 8);
  if (v.driver) {
    g.fillStyle = v.isCop ? '#1f3b73' : (G.player && v.driver === 'player' ? G.player.look.shirt : '#7a3e3e');
    g.beginPath(); g.ellipse(-2, 0, 7, 10, 0, 0, TAU); g.fill();
    g.fillStyle = v.isCop ? '#e8e8e8' : '#222'; g.beginPath(); g.arc(2, 0, 6, 0, TAU); g.fill();
  }
  if (v.isCop && v.siren) { const ph = Math.floor(performance.now() / 120) % 2; g.fillStyle = ph ? '#ff3030' : '#3070ff'; g.fillRect(-hl + 2, -2, 4, 4); }
  g.fillStyle = '#fff3c4'; g.fillRect(hl - 3, -2, 3, 4);
}
function drawBus(g, v, col, hl, hw) {
  g.fillStyle = col; U.rr(g, -hl, -hw, hl * 2, hw * 2, 8); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#18202d'; g.fillRect(hl - 12, -hw + 4, 8, hw * 2 - 8);
  g.fillStyle = '#e8e8e8'; U.rr(g, -hl + 6, -hw + 5, hl * 2 - 22, hw * 2 - 10, 5); g.fill();
  g.fillStyle = col; g.fillRect(-hl + 6, -4, hl * 2 - 22, 8);
  g.fillStyle = '#9aa3ad'; for (let x = -hl + 20; x < hl - 30; x += 34) U.rr(g, x, -hw + 10, 18, 10, 2), g.fill();
  lightsFrontBack(g, v, hl, hw);
}
function drawBox(g, v, col, hl, hw, now, swat) {
  g.fillStyle = v.burnt ? '#2a2826' : col; U.rr(g, -hl, -hw, hl * 2, hw * 2, 5); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#10141b'; g.fillRect(hl * 0.55, -hw + 4, 6, hw * 2 - 8);
  g.fillStyle = U.shade(col, 0.1); U.rr(g, -hl + 4, -hw + 4, hl * 1.45, hw * 2 - 8, 3); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let x = -hl + 8; x < hl * 0.4; x += 12) { g.beginPath(); g.arc(x, -hw + 7, 1.6, 0, TAU); g.arc(x, hw - 7, 1.6, 0, TAU); g.fill(); }
  if (swat) { g.fillStyle = '#2b3a50'; g.beginPath(); g.arc(-hl * 0.2, 0, 9, 0, TAU); g.fill(); lightbar(g, v, hl * 0.35, hw, now); }
  else { g.fillStyle = '#d4ac0d'; g.fillRect(-hl + 4, -3, hl * 1.45, 6); g.fillStyle = '#2b2b2b'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₱', -hl * 0.3, 0.5); }
  lightsFrontBack(g, v, hl, hw);
}
function drawArmy(g, v, hl, hw) {
  const c = v.burnt ? '#2a2826' : '#4b5a32';
  g.fillStyle = c; U.rr(g, hl * 0.35, -hw + 2, hl * 0.65, hw * 2 - 4, 5); g.fill();
  g.fillStyle = '#10141b'; g.fillRect(hl * 0.42, -hw + 5, 6, hw * 2 - 10);
  g.fillStyle = v.burnt ? '#2a2826' : '#5c6b3e'; U.rr(g, -hl, -hw, hl * 1.32, hw * 2, 4); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2;
  for (let x = -hl + 10; x < hl * 0.3; x += 12) { g.beginPath(); g.moveTo(x, -hw + 2); g.lineTo(x, hw - 2); g.stroke(); }
  if (v.siren) { const ph = Math.floor(performance.now() / 120) % 2; g.fillStyle = ph ? '#ff3030' : '#3070ff'; g.fillRect(hl * 0.6, -4, 5, 8); }
  lightsFrontBack(g, v, hl, hw);
}

// light pass for vehicle (additive)
function drawVehicleLights(g, v, now, sprites) {
  if (v.burnt) return;
  const on = v.driver || v.mission;
  const ca = Math.cos(v.a), sa = Math.sin(v.a);
  if (on) {
    g.save(); g.translate(v.x + ca * v.L * 0.5, v.y + sa * v.L * 0.5); g.rotate(v.a);
    g.globalAlpha = v.W < 20 ? 0.35 : 0.55;
    const s = v.W < 20 ? 0.6 : 1;
    g.drawImage(sprites.cone, -6, -sprites.cone.height * s / 2, sprites.cone.width * s, sprites.cone.height * s);
    g.restore();
    if (v.braking) {
      g.globalAlpha = 0.5;
      g.drawImage(sprites.red, v.x - ca * v.L * 0.5 - 30, v.y - sa * v.L * 0.5 - 30, 60, 60);
    }
  }
  if (v.siren && !v.dead) {
    const ph = Math.floor(now * 8) % 2;
    g.globalAlpha = 0.65;
    const sp = ph ? sprites.red : sprites.blue;
    g.drawImage(sp, v.x - 70, v.y - 70, 140, 140);
  }
  g.globalAlpha = 1;
}
