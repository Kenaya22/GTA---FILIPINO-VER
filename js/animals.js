'use strict';
// ===== Animals: chickens, cats, goats and carabao wander around (different mix in each region) =====
const ANIMAL_T = {
  manok: { name: 'Manok', speed: 55, r: 6, tiles: [TL.SIDE, TL.ALLEY, TL.GRASS, TL.PLAZA, TL.DIRT, TL.PADDY], cols: ['#c0392b', '#f5f0e6', '#8a5a2b', '#2b2b2b'] },
  pusa: { name: 'Pusa', speed: 65, r: 6, tiles: [TL.SIDE, TL.ALLEY, TL.PLAZA, TL.LOT], cols: ['#f39c2b', '#2b2b2b', '#e8e2d6', '#7f7f7f'] },
  kambing: { name: 'Kambing', speed: 38, r: 9, tiles: [TL.GRASS, TL.DIRT, TL.PADDY], cols: ['#efeae0', '#5a3d2b', '#2b2b2b'] },
  kalabaw: { name: 'Kalabaw', speed: 24, r: 15, tiles: [TL.GRASS, TL.PADDY, TL.DIRT], cols: ['#3d3a3a', '#4a4040'] },
};
const ANIMALS = {
  list: [], t: 0,
  mix(x) {
    const tx = x / T;
    if (tx >= BRX0 - 6) return ['manok', 'pusa', 'pusa', 'manok'];
    if (tx >= BX0) return ['kambing', 'pusa', 'manok', 'manok'];
    if (tx >= DX0 - 12) return ['manok', 'kambing', 'kalabaw', 'pusa'];
    if (tx >= SX0 - 12) return ['manok', 'pusa', 'kambing', 'manok'];
    if (tx >= CITY_W) return ['manok', 'manok', 'kalabaw', 'kambing'];
    return ['pusa', 'pusa', 'manok', 'manok'];
  },
  reset() { this.list = []; },
  update(dt) {
    if (!G.started) return;
    const P = G.player;
    this.list = this.list.filter(a => !a.remove && G.peds.includes(a));
    for (const a of this.list) if (U.d2(a.x, a.y, P.x, P.y) > 1300 * 1300) a.remove = true;
    // little noises when you're close
    for (const a of this.list) if (a.state !== 'down' && Math.random() < dt * 0.06 && U.d2(a.x, a.y, P.x, P.y) < 260 * 260) this.sound(a);
    this.t -= dt; if (this.t > 0) return; this.t = 1.4;
    const max = SETTINGS.density === 'low' ? 4 : 8;
    if (this.list.length >= max) return;
    const kind = U.choice(this.mix(P.x)), A = ANIMAL_T[kind];
    for (let k = 0; k < 10; k++) {
      const ang = U.rand(0, TAU), d = U.rand(380, 820), x = P.x + Math.cos(ang) * d, y = P.y + Math.sin(ang) * d;
      if (x < 0 || y < 0 || x > WORLD_W || y > WORLD_H || !A.tiles.includes(MAP.tileAt(x, y))) continue;
      const n = kind === 'manok' ? 1 + Math.floor(Math.random() * 3) : 1;      // chickens come in little flocks
      for (let i = 0; i < n; i++) {
        const a = new Person(x + i * 14, y + (i % 2) * 10, 'animal');
        a.animal = kind; a.npc = true; a.keep = true; a.umb = null; a.r = A.r; a.speed = A.speed; a.state = 'wander';
        a.home = { x, y }; a.wtiles = A.tiles; a.col = U.choice(A.cols); a.name = null;
        G.peds.push(a); this.list.push(a); TIP.show('animals');
      }
      return;
    }
  },
  sound(a) {
    const k = a.animal;
    if (k === 'manok') { AUD.tone(900, 0.06, 'square', 0.025); AUD.tone(760, 0.08, 'square', 0.025, 0, 0.09); }
    else if (k === 'pusa') AUD.tone(700, 0.4, 'triangle', 0.04, 480);
    else if (k === 'kambing') { AUD.tone(420, 0.45, 'sawtooth', 0.025, 380); AUD.tone(430, 0.45, 'sawtooth', 0.02, 390, 0.02); }
    else if (k === 'kalabaw') AUD.tone(130, 0.9, 'sawtooth', 0.05, 95);
  },
};
function drawAnimal(g, p) {
  if (p.hidden) return;
  const k = p.animal, c = p.col, leg = Math.sin(p.phase || 0) * 2.5, down = p.state === 'down';
  g.save(); g.translate(p.x, p.y); g.rotate(p.a + (down ? 1.4 : 0)); if (k !== 'kalabaw') g.scale(1.35, 1.35);
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(2, 3, p.r * 1.4, p.r * 0.9, 0, 0, TAU); g.fill();
  if (k === 'manok') {
    g.fillStyle = c; g.beginPath(); g.ellipse(-1, 0, 7, 5, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-6, 0); g.lineTo(-11, -4); g.lineTo(-10, 3); g.closePath(); g.fill();                 // tail
    g.beginPath(); g.arc(6, 0, 3.4, 0, TAU); g.fill();
    g.fillStyle = '#e74c3c'; g.fillRect(5, -1.5, 3, 3);                                                                    // comb
    g.fillStyle = '#f1c40f'; g.beginPath(); g.moveTo(9, -1); g.lineTo(12, 0); g.lineTo(9, 1); g.fill();                 // beak
  } else if (k === 'pusa') {
    g.fillStyle = '#222'; for (const [x, y] of [[4, -3], [4, 3], [-4, -3], [-4, 3]]) g.fillRect(x + (y > 0 ? leg : -leg) - 1, y - 1, 2, 2);
    g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, 7, 3.6, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(7, 0, 3.4, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(7, -2); g.lineTo(9, -5); g.lineTo(9.5, -1); g.fill(); g.beginPath(); g.moveTo(7, 2); g.lineTo(9, 5); g.lineTo(9.5, 1); g.fill();
    g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(-7, 0); g.quadraticCurveTo(-12, -4 + leg, -14, 1); g.stroke();
  } else if (k === 'kambing') {
    g.fillStyle = '#2b2b2b'; for (const [x, y] of [[6, -4], [6, 4], [-6, -4], [-6, 4]]) g.fillRect(x + (y > 0 ? leg : -leg) - 1, y - 1, 3, 2);
    g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, 10, 5.5, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(11, 0, 4.5, 3.4, 0, 0, TAU); g.fill();
    g.strokeStyle = '#6b5a43'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(11, -2); g.lineTo(8, -6); g.moveTo(11, 2); g.lineTo(8, 6); g.stroke();   // horns
  } else if (k === 'kalabaw') {
    g.fillStyle = '#1e1c1c'; for (const [x, y] of [[10, -7], [10, 7], [-10, -7], [-10, 7]]) g.fillRect(x + (y > 0 ? leg : -leg) - 2, y - 2, 4, 3);
    g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, 17, 10, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(18, 0, 6.5, 5.5, 0, 0, TAU); g.fill();
    g.strokeStyle = '#8a8277'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(17, -4); g.quadraticCurveTo(13, -14, 6, -13); g.moveTo(17, 4); g.quadraticCurveTo(13, 14, 6, 13); g.stroke();   // big curved horns
  }
  g.restore();
}
