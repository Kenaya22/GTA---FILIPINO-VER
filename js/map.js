'use strict';
// ===== City map: generation, rendering, path-finding =====
const T = 32;          // tile size (px)
const NR = 9;          // roads per axis
const PER = 20;        // tiles between road starts
const RW = 4;          // road width (tiles)
const OX = 72, OY = 16;   // OX leaves room for Manila Bay + Isla Maligaya on the west
const CITY_W = OX + (NR - 1) * PER + RW + 16;   // city width in tiles
const PROV_W = 72;                                // province (San Isidro) to the east
const PROV_END = CITY_W + PROV_W;
const STRAIT_W = 26;                              // sea between the province and Cebu
const SX0 = PROV_END + STRAIT_W;                  // Cebu (Chapter 3 city) starts here
const SUGBO_W = 112;
const SUGBO_END = SX0 + SUGBO_W;
const STRAIT2_W = 26;                             // sea between Cebu and Davao
const DX0 = SUGBO_END + STRAIT2_W;                // Davao (Chapter 4 city)
const DABAW_W = 104;
const DABAW_END = DX0 + DABAW_W;
const BX0 = DABAW_END + 6;                         // Baguio (Chapter 5 mountain city), behind a pine ridge
const BAGIW_W = 100;
const BAGIW_END = BX0 + BAGIW_W;
const STRAIT3_W = 24;                              // sea between Baguio and Boracay
const BRX0 = BAGIW_END + STRAIT3_W;                // Boracay (island resort) starts here
const BORA_W = 64;
const STRAIT5_W = 20;                              // sea between Boracay and Palawan
const PX0 = BRX0 + BORA_W + STRAIT5_W;             // Palawan (Chapter 7) starts here
const PAL_W = 96;
const MW = PX0 + PAL_W;
const MH = OY + (NR - 1) * PER + RW + 16;
const WORLD_W = MW * T, WORLD_H = MH * T;
const LO = 32;         // lane offset from road centre
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // E S W N

const TL = { WATER: 0, ROAD: 1, SIDE: 2, BLD: 3, GRASS: 4, PLAZA: 5, PIER: 6, WALL: 7, ALLEY: 8, TREE: 9, PROM: 10, LOT: 11, SAND: 12, PADDY: 13, DIRT: 14 };
const SOLID = new Uint8Array(256); SOLID[0] = 1; SOLID[3] = 1; SOLID[7] = 1; SOLID[9] = 1; SOLID[255] = 1;
const DRIVE_COST = new Uint8Array(256); [0, 1, 3, 0, 4, 2, 2, 0, 0, 0, 2, 2, 4, 4, 1].forEach((v, i) => DRIVE_COST[i] = v);
const WALK_COST = new Uint8Array(256); [0, 2, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1].forEach((v, i) => WALK_COST[i] = v);
const GROUND = ['#132a42', '#232937', '#313849', '#2a303e', '#2a4231', '#363c4b', '#4d3d2c', '#4a4640', '#2a303e', '#2a4231', '#3c3b45', '#2b3140', '#6b5e44', '#2b4628', '#4a3c2a'];

const PAL = {
  comm: ['#5f6347', '#454c5c', '#4d4562', '#5e4636', '#3b5556', '#4f5361', '#584a5a'],
  resid: ['#6a5a48', '#56614a', '#5a5068', '#4a5a64', '#6b5650', '#57604f', '#5d5a3f'],
  slum: ['#5c6c72', '#7a5a44', '#4f6a52', '#6b4f5c', '#6f6a55', '#4c5f78', '#7b4a3e', '#5f5f5f'],
  china: ['#6e3b36', '#7a5a2e', '#5e3540', '#6a4a2a', '#743f2f'],
  towers: ['#3f5266', '#4a5a70', '#33445a', '#4b5568', '#3c4f5f', '#45506a'],
  intra: ['#6b5e4c', '#5f5446', '#73654f', '#665a48'],
  container: ['#a8463b', '#2f6b8a', '#c48a2c', '#3e7a4a', '#7a3e6e', '#b8552e', '#356b6b'],
  stall: ['#c0392b', '#2e86c1', '#d4ac0d', '#27ae60', '#8e44ad', '#e67e22', '#e84393'],
};

// district per block, rows bj=-1..8, cols bi=0..8
const DIST_GRID = [
  ['port', 'slum', 'slum', 'market', 'china', 'china', 'resid', 'resid', 'resid'],
  ['port', 'slum', 'slum', 'market', 'china', 'china', 'resid', 'resid', 'resid'],
  ['slum', 'slum', 'terminal', 'comm', 'china', 'comm', 'church', 'resid', 'resid'],
  ['intra', 'comm', 'comm', 'comm', 'comm', 'comm', 'comm', 'resid', 'mansion'],
  ['intra', 'comm', 'comm', 'hospital', 'comm', 'police', 'comm', 'resid', 'resid'],
  ['park', 'park', 'comm', 'comm', 'comm', 'comm', 'comm', 'towers', 'towers'],
  ['comm', 'comm', 'resid', 'resid', 'slum', 'resid', 'towers', 'towers', 'towers'],
  ['comm', 'resid', 'resid', 'comm', 'resid', 'comm', 'towers', 'towers', 'towers'],
  ['comm', 'resid', 'slum', 'comm', 'resid', 'resid', 'comm', 'towers', 'towers'],
  ['comm', 'resid', 'slum', 'busterm', 'resid', 'resid', 'comm', 'comm', 'comm'],
];

const MAP = {
  tiles: new Uint8Array(MW * MH),
  bldAt: new Int16Array(MW * MH),
  buildings: [], trees: [], lamps: [], cctv: [], pois: {}, spots: [], labels: [], tsinelas: [], decor: [], lots: [], courts: [], floods: [], lights: [], boatSpots: [],
  hSeg: [], vSeg: [],
  chunks: new Map(), chunkQueue: 0,
  rs(i) { return OX + i * PER; },
  rsy(j) { return OY + j * PER; },
  cx(i) { return (OX + i * PER + RW / 2) * T; },
  cy(j) { return (OY + j * PER + RW / 2) * T; },
  laneX(i, d) { return this.cx(i) + (d === 1 ? -LO : LO); },     // d S:west side, N:east side
  laneY(j, d) { return this.cy(j) + (d === 0 ? LO : -LO); },     // d E:south side, W:north side
  get(tx, ty) { if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return 255; return this.tiles[ty * MW + tx]; },
  set(tx, ty, v) { if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return; this.tiles[ty * MW + tx] = v; },
  tileAt(px, py) { return this.get(Math.floor(px / T), Math.floor(py / T)); },
  solidT(tx, ty) { return SOLID[this.get(tx, ty)] === 1; },
  solidAt(px, py) { return SOLID[this.tileAt(px, py)] === 1; },
  segOK(i, j, d) {
    const ni = i + DIRS[d][0], nj = j + DIRS[d][1];
    if (ni < 0 || nj < 0 || ni >= NR || nj >= NR) return false;
    if (d === 0) return this.hSeg[j][i];
    if (d === 2) return this.hSeg[j][ni];
    if (d === 1) return this.vSeg[i][j];
    return this.vSeg[i][nj];
  },
  nodeExists(i, j) { for (let d = 0; d < 4; d++) if (this.segOK(i, j, d)) return true; return false; },
  blockRect(bi, bj) {
    const x0 = bi < 0 ? 0 : this.rs(bi) + RW;
    const x1 = bi >= NR - 1 ? CITY_W - 1 : this.rs(bi + 1) - 1;
    const y0 = bj < 0 ? 0 : this.rsy(bj) + RW;
    const y1 = bj >= NR - 1 ? MH - 1 : this.rsy(bj + 1) - 1;
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
  },
  blockOf(px, py) {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    const bi = Math.floor((tx - OX - RW) / PER), bj = Math.floor((ty - OY - RW) / PER);
    return [U.clamp(bi, 0, NR - 1), U.clamp(bj, -1, NR - 1)];
  },
  // a door point on block side: S,N,E,W
  door(bi, bj, side, off = 0) {
    const [x0, y0, w, h] = this.blockRect(bi, bj);
    if (side === 'S') return { x: (x0 + w / 2 + off) * T, y: (y0 + h - 0.5) * T };
    if (side === 'N') return { x: (x0 + w / 2 + off) * T, y: (y0 + 0.5) * T };
    if (side === 'E') return { x: (x0 + w - 0.5) * T, y: (y0 + h / 2 + off) * T };
    return { x: (x0 + 0.5) * T, y: (y0 + h / 2 + off) * T };
  },

  // ---------- generation ----------
  gen() {
    const R = U.rng(20261124); this.rnd = R;
    const t = this.tiles; t.fill(255); this.bldAt.fill(-1);
    for (let j = 0; j < NR; j++) { this.hSeg[j] = []; for (let i = 0; i < NR - 1; i++) this.hSeg[j][i] = true; }
    for (let i = 0; i < NR; i++) { this.vSeg[i] = []; for (let j = 0; j < NR - 1; j++) this.vSeg[i][j] = true; }
    this.hSeg[3][0] = false;  // Intramuros merge
    this.vSeg[1][4] = false;  // Luneta merge
    // water + promenade
    for (let y = 0; y < MH; y++) for (let x = 0; x < OX; x++) this.set(x, y, x < OX - 3 ? TL.WATER : TL.PROM);
    // roads
    const fill = (x0, y0, w, h, v) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, v); };
    for (let i = 0; i < NR; i++) for (let j = 0; j < NR - 1; j++) if (this.vSeg[i][j]) fill(this.rs(i), this.rsy(j), RW, PER + RW, TL.ROAD);
    for (let j = 0; j < NR; j++) for (let i = 0; i < NR - 1; i++) if (this.hSeg[j][i]) fill(this.rs(i), this.rsy(j), PER + RW, RW, TL.ROAD);
    this.fill = fill;
    // blocks
    const merged = { '0,2': 1, '0,3': 1, '0,4': 1, '1,4': 1 };
    for (let bj = -1; bj < NR; bj++) for (let bi = 0; bi < NR; bi++) {
      if (merged[bi + ',' + bj]) continue;
      const [x0, y0, w, h] = this.blockRect(bi, bj);
      this.fillBlock(x0, y0, w, h, DIST_GRID[bj + 1][bi], bi, bj);
    }
    { // Intramuros
      const x0 = this.rs(0) + RW, y0 = this.rsy(2) + RW;
      this.fillBlock(x0, y0, 16, this.rsy(4) - y0, 'intra', 0, 2);
    }
    { // Luneta
      const x0 = this.rs(0) + RW, y0 = this.rsy(4) + RW;
      this.fillBlock(x0, y0, this.rs(2) - x0, 16, 'park', 0, 4);
    }
    // piers
    for (const py of [6, 26]) fill(OX - 14, py, 11, 3, TL.PIER);
    this.makeIsland(fill);
    for (let i = 0; i < t.length; i++) if (t[i] === 255) t[i] = TL.GRASS;
    // lamps
    for (let i = 0; i < NR; i++) for (let j = 0; j < NR; j++) {
      if (!this.nodeExists(i, j)) continue;
      const cx = this.cx(i), cy = this.cy(j);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const lx = cx + sx * 80, ly = cy + sy * 80;
        if (this.tileAt(lx, ly) === TL.SIDE) this.lamps.push({ x: lx, y: ly });
      }
    }
    for (let y = 2; y < MH; y += 7) this.lamps.push({ x: (OX - 2.5) * T, y: y * T });
    // CCTV
    const nodes = [];
    for (let i = 0; i < NR; i++) for (let j = 0; j < NR; j++) if (this.nodeExists(i, j)) nodes.push([i, j]);
    for (let k = nodes.length - 1; k > 0; k--) { const r = Math.floor(R() * (k + 1)); [nodes[k], nodes[r]] = [nodes[r], nodes[k]]; }
    for (let k = 0; k < 18; k++) {
      const [i, j] = nodes[k];
      const sx = R() < 0.5 ? -1 : 1, sy = R() < 0.5 ? -1 : 1;
      const x = this.cx(i) + sx * 78, y = this.cy(j) + sy * 78;
      this.cctv.push({ x, y, base: Math.atan2(-sy, -sx), a: 0, ph: R() * TAU });
    }
    this.makePOIs();
    this.makeTsinelas(R);
    this.makeCourts();
    this.makeDepots();
    this.makeLights();
    this.makeFloods();
    this.makeProvince();
    this.makeSugbo();
    this.makeDabaw();
    this.makeBagiw();
    this.makeBora();
    this.makePal();
    this.makeLandmarks();
    this.makeCoast();
    this.makeLabels();
    this.makeMini();
  },

  subdiv(x, y, w, h, mn, mx, out, R) {
    if (w <= mx && h <= mx) { out.push([x, y, w, h]); return; }
    const vert = w > h || (w === h && R() < 0.5);
    const len = vert ? w : h;
    if (len < mn * 2 + 1) { out.push([x, y, w, h]); return; }
    const s = mn + Math.floor(R() * (len - 2 * mn));
    if (vert) { this.subdiv(x, y, s, h, mn, mx, out, R); this.subdiv(x + s + 1, y, w - s - 1, h, mn, mx, out, R); }
    else { this.subdiv(x, y, w, s, mn, mx, out, R); this.subdiv(x, y + s + 1, w, h - s - 1, mn, mx, out, R); }
  },
  addBld(tx, ty, tw, th, color, kind, extra) {
    const b = { x: tx * T, y: ty * T, w: tw * T, h: th * T, tx, ty, tw, th, color, kind, seed: (tx * 131 + ty * 977) | 0 };
    if (extra) Object.assign(b, extra);
    const id = this.buildings.length; this.buildings.push(b);
    for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) { this.set(x, y, TL.BLD); this.bldAt[y * MW + x] = id; }
    return b;
  },
  addTree(tx, ty) { this.set(tx, ty, TL.TREE); this.trees.push({ x: (tx + 0.5) * T, y: (ty + 0.5) * T, r: 13 + (U.hash(tx, ty) * 6) }); },
  makeLot(L, type) {
    const [x, y, w, h] = L;
    this.lots.push({ x, y, w, h, type });
    this.fill(x, y, w, h, TL.LOT);
    if (w >= h) {
      const n = Math.floor((w * T - 16) / 46);
      for (let k = 0; k < n; k++) this.spots.push({ x: x * T + 8 + 23 + k * 46, y: (y + h / 2) * T, a: (k % 2 ? 1 : -1) * Math.PI / 2, type });
    } else {
      const n = Math.floor((h * T - 16) / 46);
      for (let k = 0; k < n; k++) this.spots.push({ x: (x + w / 2) * T, y: y * T + 8 + 23 + k * 46, a: k % 2 ? 0 : Math.PI, type });
    }
  },
  fillBlock(x0, y0, w, h, kind, bi, bj) {
    const R = this.rnd;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1;
      this.set(x, y, edge ? TL.SIDE : TL.ALLEY);
    }
    const ix = x0 + 1, iy = y0 + 1, iw = w - 2, ih = h - 2;
    const touches = (L) => L[0] === ix || L[1] === iy || L[0] + L[2] === ix + iw || L[1] + L[3] === iy + ih;
    switch (kind) {
      case 'comm': case 'resid': case 'slum': case 'china': {
        const cfg = { comm: [3, 6], resid: [3, 5], slum: [2, 3], china: [3, 5] }[kind];
        const lots = []; this.subdiv(ix, iy, iw, ih, cfg[0], cfg[1], lots, R);
        for (const L of lots) {
          const r = R();
          if (kind === 'resid' && r < 0.18) {
            this.fill(L[0], L[1], L[2], L[3], TL.GRASS);
            if (L[2] >= 2 && L[3] >= 2) this.addTree(L[0] + (L[2] >> 1), L[1] + (L[3] >> 1));
          } else if ((kind === 'comm' || kind === 'resid') && r < 0.34 && L[2] >= 3 && L[3] >= 3 && touches(L)) {
            this.makeLot(L, 'car');
          } else this.addBld(L[0], L[1], L[2], L[3], U.pick(PAL[kind], R), kind);
        }
        break;
      }
      case 'towers': {
        this.fill(ix, iy, iw, ih, TL.PLAZA);
        const lots = []; this.subdiv(ix, iy, iw, ih, 4, 7, lots, R);
        for (const L of lots) {
          if (R() < 0.15 && touches(L)) { this.makeLot(L, 'car'); continue; }
          this.addBld(L[0], L[1], L[2], L[3], U.pick(PAL.towers, R), 'tower');
        }
        break;
      }
      case 'market': {
        this.fill(ix, iy, iw, ih, TL.PLAZA);
        for (let yy = iy + 1; yy + 1 < iy + ih; yy += 3) for (let xx = ix + 1; xx + 2 <= ix + iw - 1; xx += 3)
          this.addBld(xx, yy, 2, 1, U.pick(PAL.stall, R), 'stall');
        break;
      }
      case 'park': {
        this.fill(ix, iy, iw, ih, TL.GRASS);
        const my = iy + (ih >> 1) - 1, mx = ix + (iw >> 1) - 1;
        this.fill(ix, my, iw, 2, TL.PLAZA); this.fill(mx, iy, 2, ih, TL.PLAZA);
        if (iw > 20) { this.fill(ix + 5, iy, 2, ih, TL.PLAZA); this.fill(ix + iw - 7, iy, 2, ih, TL.PLAZA); }
        this.fill(mx - 2, my - 2, 6, 6, TL.PLAZA);
        this.addBld(mx, my, 2, 2, '#9aa3ad', 'monument');
        for (let y = iy; y < iy + ih; y++) for (let x = ix; x < ix + iw; x++) {
          if (this.get(x, y) !== TL.GRASS) continue;
          let ok = true;
          for (let k = 0; k < 4 && ok; k++) { const g = this.get(x + DIRS[k][0], y + DIRS[k][1]); if (g !== TL.GRASS) ok = false; }
          if (ok && R() < 0.16) this.addTree(x, y);
        }
        break;
      }
      case 'terminal': case 'busterm': {
        this.fill(ix, iy, iw, ih, TL.PLAZA);
        this.addBld(ix, iy, 5, 3, kind === 'terminal' ? '#5a6b7a' : '#6a5f7a', 'office');
        this.addBld(ix + iw - 4, iy, 4, 3, '#6b5650', 'office');
        const type = kind === 'terminal' ? 'jeep' : 'bus';
        const sp = type === 'jeep' ? 48 : 64;
        for (let k = 0; k < Math.floor((iw * T - 40) / sp); k++)
          this.spots.push({ x: ix * T + 30 + k * sp, y: (iy + 6.5) * T, a: -Math.PI / 2, type, lane: true });
        break;
      }
      case 'church': {
        this.fill(ix, iy, iw, ih, TL.PLAZA);
        const cxp = ix + ((iw - 6) >> 1);
        this.addBld(cxp, iy + 1, 6, 10, '#7a6a58', 'church');
        this.addBld(cxp - 2, iy + 3, 10, 3, '#7a6a58', 'church');
        this.addTree(ix + 1, iy + ih - 2); this.addTree(ix + iw - 2, iy + ih - 2); this.addTree(ix + 1, iy + 1); this.addTree(ix + iw - 2, iy + 1);
        break;
      }
      case 'hospital': {
        this.fill(ix, iy, iw, ih, TL.PLAZA);
        this.addBld(ix + 1, iy + 1, iw - 2, 7, '#c3cad2', 'hospital');
        this.makeLot([ix, iy + 9, iw, 4], 'car');
        break;
      }
      case 'police': {
        this.fill(ix, iy, iw, ih, TL.PLAZA);
        this.addBld(ix + 1, iy + 1, 9, 6, '#3d5a8a', 'police');
        this.addBld(ix + 11, iy + 1, 3, 4, '#33496f', 'police');
        this.makeLot([ix, iy + 9, iw, 4], 'police');
        break;
      }
      case 'mansion': {
        this.fill(ix, iy, iw, ih, TL.GRASS);
        for (let y = iy; y < iy + ih; y++) for (let x = ix; x < ix + iw; x++)
          if (x === ix || y === iy || x === ix + iw - 1 || y === iy + ih - 1) this.set(x, y, TL.WALL);
        const gy = iy + (ih >> 1) - 1;
        this.fill(ix, gy, 6, 3, TL.PLAZA);
        this.addBld(ix + 6, iy + 2, 6, 10, '#d8cdb0', 'mansion');
        this.addBld(ix + 2, iy + 2, 2, 2, '#4f88a8', 'fountain');
        this.addTree(ix + 2, iy + ih - 3); this.addTree(ix + 4, iy + ih - 3); this.addTree(ix + 13, iy + 2); this.addTree(ix + 13, iy + ih - 3);
        break;
      }
      case 'port': {
        this.fill(ix, iy, iw, ih, TL.PLAZA);
        if (bj < 0) {
          this.addBld(ix + 1, iy + 1, 8, 5, '#5b5f66', 'bodega');
          for (let yy = iy + 8; yy + 2 <= iy + ih; yy += 3) for (let xx = ix + 1; xx + 4 <= ix + iw; xx += 5)
            if (R() < 0.8) this.addBld(xx, yy, 4, 2, U.pick(PAL.container, R), 'container');
        } else {
          for (let yy = iy + 1; yy + 2 <= iy + ih; yy += 3) for (let xx = ix + 1; xx + 4 <= ix + iw; xx += 5)
            if (R() < 0.75) this.addBld(xx, yy, 4, 2, U.pick(PAL.container, R), 'container');
        }
        break;
      }
      case 'intra': {
        this.fill(ix, iy, iw, ih, TL.GRASS);
        for (let y = iy; y < iy + ih; y++) for (let x = ix; x < ix + iw; x++)
          if (x === ix || y === iy || x === ix + iw - 1 || y === iy + ih - 1) this.set(x, y, TL.WALL);
        const gx = ix + (iw >> 1) - 1, gy = iy + (ih >> 1) - 1;
        this.fill(gx, iy, 3, 1, TL.PLAZA); this.fill(gx, iy + ih - 1, 3, 1, TL.PLAZA);
        this.fill(ix, gy, 1, 3, TL.PLAZA); this.fill(ix + iw - 1, gy, 1, 3, TL.PLAZA);
        this.fill(ix + 1, iy + 1, iw - 2, ih - 2, TL.PLAZA);
        this.addBld(ix + 3, iy + 3, 8, 11, '#8a7a62', 'church');
        const lots = []; this.subdiv(ix + 2, iy + 16, iw - 4, ih - 18, 3, 5, lots, R);
        for (const L of lots) {
          if (R() < 0.3) { this.fill(L[0], L[1], L[2], L[3], TL.GRASS); if (L[2] >= 2 && L[3] >= 2) this.addTree(L[0] + 1, L[1] + 1); }
          else this.addBld(L[0], L[1], L[2], L[3], U.pick(PAL.intra, R), 'intra');
        }
        break;
      }
    }
  },

  // ---------- Isla Maligaya (island in the bay) ----------
  makeIsland(fill) {
    const R = U.rng(777), cx = 22, cy = 88;
    this.island = { cx, cy };
    for (let y = cy - 34; y <= cy + 34; y++) for (let x = 3; x <= 42; x++) {
      const dx = (x - cx) / 14, dy = (y - cy) / 30;
      const r = dx * dx + dy * dy + (U.hash(x >> 1, y >> 1) - 0.5) * 0.18;
      if (r < 1) this.set(x, y, r > 0.66 ? TL.SAND : TL.GRASS);
    }
    // sand paths
    fill(cx, cy - 20, 2, 38, TL.SAND); fill(cx - 10, cy, 30, 2, TL.SAND);
    // dock on the east shore
    let sx = cx; while (this.get(sx, cy) !== TL.WATER && sx < 50) sx++;
    fill(sx, cy - 1, 6, 3, TL.PIER);
    this.island.dock = { x: (sx + 4.5) * T, y: (cy + 0.5) * T };
    this.boatSpots.push({ x: (sx + 3) * T, y: (cy + 3.2) * T, a: 0 });
    this.decor.push({ type: 'boat', x: (sx + 4) * T, y: (cy - 2.6) * T });
    // lighthouse on the north tip
    let ty = cy - 34; while (this.get(cx, ty) === TL.WATER && ty < cy) ty++;
    this.addBld(cx - 1, ty + 2, 3, 3, '#d8d2c4', 'lighthouse');
    this.island.lighthouse = { x: (cx + 0.5) * T, y: (ty + 3.5) * T };
    // resort + nipa huts
    this.addBld(cx - 5, cy + 14, 7, 4, '#8a6a4a', 'resort');
    const ok = (x, y, w, h) => { for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) if (this.get(xx, yy) !== TL.GRASS) return false; return true; };
    for (let y = cy - 18; y < cy + 12; y += 4) for (let x = cx - 11; x < cx + 10; x += 5) {
      if (R() < 0.75 && ok(x, y, 3, 2)) this.addBld(x, y, 3, 2, U.pick(['#7a6440', '#86704a', '#6e5a3a'], R), 'nipa');
    }
    // palms on sand & grass edges
    for (let y = cy - 34; y <= cy + 34; y++) for (let x = 3; x <= 42; x++) {
      const tt = this.get(x, y);
      if ((tt === TL.SAND && R() < 0.07) || (tt === TL.GRASS && R() < 0.03)) {
        let free = true;
        for (let k = 0; k < 4; k++) { const n = this.get(x + DIRS[k][0], y + DIRS[k][1]); if (n === TL.PIER || n === TL.BLD) free = false; }
        if (free && !(x >= cx - 1 && x <= cx + 2) && !(y >= cy - 1 && y <= cy + 2)) { this.set(x, y, TL.TREE); this.trees.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, r: 16, palm: true }); }
      }
    }
    // boats near city piers
    this.boatSpots.push({ x: (OX - 9) * T, y: 30.2 * T, a: Math.PI }, { x: (OX - 8) * T, y: 10.2 * T, a: Math.PI });
  },
  makeCourts() {
    const R = U.rng(4242);
    const cands = this.lots.filter(l => l.type === 'car' && l.w >= 4 && l.h >= 3 && l.w * l.h >= 15);
    for (let k = cands.length - 1; k > 0; k--) { const r = Math.floor(R() * (k + 1)); [cands[k], cands[r]] = [cands[r], cands[k]]; }
    for (const l of cands) {
      if (this.courts.length >= 7) break;
      const px = (l.x + l.w / 2) * T, py = (l.y + l.h / 2) * T;
      if (this.courts.some(c => U.dist(c.px, c.py, px, py) < 1400)) continue;
      this.fill(l.x, l.y, l.w, l.h, TL.PLAZA);
      this.spots = this.spots.filter(s => !(s.x > l.x * T && s.x < (l.x + l.w) * T && s.y > l.y * T && s.y < (l.y + l.h) * T));
      this.courts.push({ x: l.x * T, y: l.y * T, w: l.w * T, h: l.h * T, px, py, horiz: l.w >= l.h });
    }
  },
  makeDepots() {
    // depots: a parking spot reserved for city vehicles (they respawn there)
    const depot = (key, pt, label, icon) => {
      let best = null, bd = 1e18;
      for (const s of this.spots) { if (s.type !== 'car' || s.depot) continue; const d = U.d2(s.x, s.y, pt.x, pt.y); if (d < bd) { bd = d; best = s; } }
      if (!best) return;
      for (const s of this.spots) if (U.d2(s.x, s.y, best.x, best.y) < 60 * 60) s.depot = true;
      this.pois[key] = { key, x: best.x, y: best.y, type: 'depot', label, icon, vx: best.x, vy: best.y, va: best.a };
    };
    depot('depot_amb', this.pois.hospital, 'Ambulansya', '🚑');
    depot('depot_fire', this.door(6, 2, 'S'), 'Istasyon ng Bumbero', '🚒');
    depot('dump', this.door(4, 6, 'N'), 'Tambakan ng Basura', '🗑');
    // basketball courts open for the 3-point shootout + videoke bar
    this.courts.slice(0, 4).forEach((c, k) => { this.pois['court' + k] = { key: 'court' + k, x: c.horiz ? c.x + 40 : c.x + c.w / 2, y: c.horiz ? c.y + c.h / 2 : c.y + 40, type: 'court', label: 'Basketball Court', icon: '🏀', court: c }; });
  },
  makeLights() {
    for (let i = 0; i < NR; i++) for (let j = 0; j < NR; j++) {
      if (!this.nodeExists(i, j)) continue;
      let deg = 0; for (let d = 0; d < 4; d++) if (this.segOK(i, j, d)) deg++;
      if (deg >= 3 && ((i + j) % 2 === 0 || i === 4 || j === 4)) this.lights.push({ i, j, off: (i * 3.7 + j * 5.3) % 16 });
    }
    this.lightMap = {};
    for (const L of this.lights) this.lightMap[L.i + ',' + L.j] = L;
  },
  // axis: 'h' (east/west traffic) or 'v' (north/south). returns 'g' | 'y' | 'r'
  lightState(L, axis, time) {
    const t = (time + L.off) % 16;
    if (axis === 'h') return t < 6.5 ? 'g' : t < 8 ? 'y' : 'r';
    return t < 8 ? 'r' : t < 14.5 ? 'g' : 'y';
  },
  makeFloods() {
    const list = [['v', 1, 0], ['h', 1, 1], ['v', 6, 0], ['h', 0, 6], ['v', 3, 7], ['h', 8, 2], ['h', 6, 4], ['v', 2, 2], ['h', 2, 6]];
    // extra streets that only flood during a typhoon
    this.tfloods = [];
    for (const [ax, i, j] of [['v', 0, 5], ['h', 3, 0], ['v', 4, 1], ['h', 4, 3], ['v', 5, 5], ['h', 1, 7], ['v', 7, 3], ['h', 5, 8], ['v', 2, 6], ['h', 6, 6], ['v', 8, 1], ['h', 0, 2]]) {
      if (ax === 'v' && (i >= NR || j >= NR - 1 || !this.vSeg[i][j])) continue;
      if (ax === 'h' && (j >= NR || i >= NR - 1 || !this.hSeg[j][i])) continue;
      if (ax === 'v') this.tfloods.push({ x: (this.rs(i) - 1) * T, y: (this.rsy(j) + RW) * T, w: (RW + 2) * T, h: (PER - RW) * T });
      else this.tfloods.push({ x: (this.rs(i) + RW) * T, y: (this.rsy(j) - 1) * T, w: (PER - RW) * T, h: (RW + 2) * T });
    }
    for (const [ax, i, j] of list) {
      if (ax === 'v' && !this.vSeg[i][j]) continue;
      if (ax === 'h' && !this.hSeg[j][i]) continue;
      if (ax === 'v') this.floods.push({ x: (this.rs(i) - 1) * T, y: (this.rsy(j) + RW) * T, w: (RW + 2) * T, h: (PER - RW) * T });
      else this.floods.push({ x: (this.rs(i) + RW) * T, y: (this.rsy(j) - 1) * T, w: (PER - RW) * T, h: (RW + 2) * T });
    }
  },
  // ---------- San Isidro (province, Chapter 2) ----------
  makeProvince() {
    const fill = this.fill, R = U.rng(555), P0 = CITY_W, hy = this.rsy(4);
    const tcx = P0 + 34, tcy = hy + 2;
    this.prov = { x0: P0, hy, tcx, tcy };
    // base: rice paddies with grass borders
    for (let y = 1; y < MH - 1; y++) for (let x = P0; x < PROV_END - 1; x++) this.set(x, y, (x % 9 === 0 || y % 11 === 0) ? TL.GRASS : TL.PADDY);
    for (let y = 0; y < MH; y++) { this.set(PROV_END - 1, y, TL.TREE); this.set(P0, y, TL.GRASS); }
    // highway from the city out to the province
    fill(this.rs(8) + RW, hy, PROV_END - 1 - (this.rs(8) + RW), RW, TL.ROAD);
    // town streets
    fill(tcx - 12, tcy - 16, 4, 34, TL.ROAD); fill(tcx + 10, tcy - 16, 4, 34, TL.ROAD);
    fill(tcx - 12, tcy - 16, 26, 4, TL.ROAD); fill(tcx - 12, tcy + 14, 26, 4, TL.ROAD);
    const ring = (x0, y0, w, h, inner) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, (x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1) ? TL.SIDE : inner); };
    // north block: church plaza
    ring(tcx - 8, tcy - 12, 18, 10, TL.PLAZA);
    this.addBld(tcx - 3, tcy - 11, 8, 5, '#8a7a62', 'church');
    this.addTree(tcx - 6, tcy - 10); this.addTree(tcx + 7, tcy - 10);
    this.addBld(tcx, tcy - 5, 2, 2, '#9aa3ad', 'monument');
    // south block: municipal hall, market, sari-sari
    ring(tcx - 8, tcy + 2, 18, 12, TL.PLAZA);
    this.addBld(tcx - 6, tcy + 3, 10, 5, '#d8d2c4', 'hall');
    for (let k = 0; k < 4; k++) this.addBld(tcx - 6 + k * 3, tcy + 10, 2, 1, U.pick(PAL.stall, R), 'stall');
    this.addBld(tcx + 6, tcy + 3, 3, 4, '#6b5650', 'resid');
    // rice mill west of town
    ring(P0 + 4, tcy + 2, 14, 9, TL.PLAZA);
    this.addBld(P0 + 6, tcy + 3, 8, 4, '#7a6a52', 'mill');
    // dirt road north to the hacienda
    fill(tcx - 1, 44, 3, tcy - 16 - 44, TL.DIRT);
    // Hacienda Severo (walled)
    const hx0 = tcx - 14, hy0 = 12, hw = 31, hh = 32;
    for (let y = hy0; y < hy0 + hh; y++) for (let x = hx0; x < hx0 + hw; x++) this.set(x, y, (x === hx0 || y === hy0 || x === hx0 + hw - 1 || y === hy0 + hh - 1) ? TL.WALL : TL.GRASS);
    fill(tcx - 1, hy0 + hh - 1, 3, 1, TL.PLAZA); fill(tcx - 1, hy0 + 12, 3, hh - 13, TL.PLAZA); fill(hx0 + 2, hy0 + 26, hw - 4, 3, TL.PLAZA);
    this.addBld(tcx - 5, hy0 + 3, 11, 8, '#d8cdb0', 'mansion');
    this.addBld(tcx + 6, hy0 + 18, 5, 4, '#5b5f66', 'hoffice');
    this.addBld(hx0 + 3, hy0 + 20, 4, 4, '#4a4f58', 'hoffice');
    this.addBld(hx0 + 3, hy0 + 4, 6, 3, '#5b5f66', 'container');
    this.addBld(tcx + 10, hy0 + 4, 2, 2, '#4f88a8', 'fountain');
    for (const [x, y] of [[hx0 + 2, hy0 + 2], [hx0 + hw - 3, hy0 + 2], [hx0 + 12, hy0 + 15], [hx0 + hw - 4, hy0 + 14]]) this.addTree(x, y);
    this.prov.hacienda = { x0: hx0 * T, y0: hy0 * T, x1: (hx0 + hw) * T, y1: (hy0 + hh) * T };
    // farm loop (dirt) south of town
    fill(tcx - 1, tcy + 18, 3, 128 - (tcy + 18), TL.DIRT);
    const fx0 = P0 + 6, fx1 = PROV_END - 8, fy0 = 128, fy1 = 168;
    fill(fx0, fy0, fx1 - fx0 + 3, 3, TL.DIRT); fill(fx0, fy1, fx1 - fx0 + 3, 3, TL.DIRT);
    fill(fx0, fy0, 3, fy1 - fy0 + 3, TL.DIRT); fill(fx1, fy0, 3, fy1 - fy0 + 3, TL.DIRT);
    this.prov.loop = [[tcx + 0.5, fy0 + 1.5], [fx1 + 1.5, fy0 + 1.5], [fx1 + 1.5, fy1 + 1.5], [fx0 + 1.5, fy1 + 1.5], [fx0 + 1.5, fy0 + 1.5]].map(([x, y]) => ({ x: x * T, y: y * T }));
    // farmhouses
    const huts = [[P0 + 12, fy0 - 4], [fx1 - 8, fy0 + 4], [P0 + 22, fy1 - 4], [fx1 - 16, fy1 + 4], [tcx + 8, fy0 + 5]];
    this.prov.farms = [];
    for (const [x, y] of huts) {
      fill(x - 1, y - 1, 5, 4, TL.GRASS);
      this.addBld(x, y, 3, 2, U.pick(['#7a6440', '#86704a'], R), 'nipa');
      this.prov.farms.push({ x: (x + 1.5) * T, y: (y + 2.6) * T });
    }
    // Lola Isyang's house east on the highway
    fill(PROV_END - 16, hy - 6, 8, 6, TL.GRASS);
    this.addBld(PROV_END - 14, hy - 5, 4, 3, '#86704a', 'nipa');
    this.addTree(PROV_END - 9, hy - 5);
    // coconut palms
    for (let y = 2; y < MH - 2; y++) for (let x = P0 + 1; x < PROV_END - 2; x++) {
      const t = this.get(x, y);
      if ((t === TL.GRASS && R() < 0.06) || (t === TL.PADDY && R() < 0.004)) {
        let free = true;
        for (let k = 0; k < 4; k++) { const n = this.get(x + DIRS[k][0], y + DIRS[k][1]); if (n !== TL.GRASS && n !== TL.PADDY) free = false; }
        if (free) { this.set(x, y, TL.TREE); this.trees.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, r: 16, palm: true }); }
      }
    }
    // lamps along the highway & in town
    for (let x = this.rs(8) + RW + 4; x < PROV_END - 2; x += 9) { this.lamps.push({ x: x * T, y: (hy - 0.5) * T }); this.lamps.push({ x: x * T, y: (hy + RW + 0.5) * T }); }
    // spawn points for police / traffic in the province
    this.prov.pts = [];
    for (let x = P0 + 4; x < PROV_END - 6; x += 8) this.prov.pts.push({ x: x * T, y: (hy + 1) * T, a: Math.PI }, { x: x * T, y: (hy + 3) * T, a: 0 });
    for (const p of this.prov.loop) this.prov.pts.push(Object.assign({ a: 0 }, p));
    // places
    const add = (key, x, y, type, label, icon) => { this.pois[key] = { key, x: x * T, y: y * T, type, label, icon }; };
    add('plaza', tcx + 0.5, tcy - 2.5, 'spot', 'Plaza ng San Isidro', '⛪');
    add('lola', PROV_END - 12, hy - 1.2, 'npc', 'Lola Isyang', 'L');
    add('mill', P0 + 10, tcy + 8.5, 'spot', 'Kiskisan (Rice Mill)', '🌾');
    add('munhall', tcx - 1, tcy + 8.5, 'spot', 'Munisipyo', '🏛');
    add('luz', tcx + 3, tcy + 8.5, 'npc', 'Kapitana Luz', 'K');
    add('ditas', tcx + 5, tcy - 2.5, 'npc', 'Mang Ditas', 'D');
    add('hacgate', tcx + 0.5, hy0 + hh + 1.5, 'spot', 'Hacienda Severo', '🏰');
    add('office', tcx + 8.5, hy0 + 22.5, 'spot', 'Opisina ni Don Severo', '📁');
    add('provsari', tcx + 7.5, tcy + 8.5, 'sari', 'Tindahan sa Bayan', '🏪');
    this.decor.push({ type: 'sign', x: this.pois.provsari.x, y: this.pois.provsari.y, color: '#27ae60', text: 'SARI-SARI' });
    this.decor.push({ type: 'flags', x0: (tcx - 9) * T, y0: (tcy - 13.5) * T, x1: (tcx + 11) * T, y1: (tcy - 13.5) * T });
  },
  inProvince(x) { return x > (CITY_W - 2) * T && x < PROV_END * T; },
  floodAt(x, y) {
    for (const f of this.floods) if (x > f.x && x < f.x + f.w && y > f.y && y < f.y + f.h) return f;
    if (TYPHOON.flooded()) for (const f of this.tfloods) if (x > f.x && x < f.x + f.w && y > f.y && y < f.y + f.h) return f;
    return null;
  },

  makePOIs() {
    const P = this.pois;
    const add = (key, pt, type, label, icon, extra) => { P[key] = Object.assign({ key, x: pt.x, y: pt.y, type, label, icon }, extra || {}); };
    add('home', this.door(2, 1, 'S', -3), 'home', 'Terminal ni Tito Boy', '🏠');
    add('tito', this.door(2, 1, 'S', 2), 'npc', 'Tito Boy', 'B');
    add('busterm', this.door(3, 8, 'N'), 'spot', 'Bus Terminal', '🚌');
    add('mangben', this.door(3, 6, 'N'), 'chop', 'Talyer ni Mang Ben', '🔧');
    add('nena', this.door(1, 0, 'S'), 'sari', 'Sari-Sari ni Aling Nena', '🏪');
    add('paeng', { x: (OX - 1.5) * T, y: this.cy(5) - 3 * T }, 'npc', 'Kuya Paeng', 'P');
    add('tikboy', this.door(5, 0, 'S'), 'npc', 'Boss Tikboy', 'T');
    add('ukay1', this.door(3, 1, 'S'), 'ukay', 'Ukay-Ukay', '👕');
    add('ukay2', this.door(5, 6, 'N'), 'ukay', 'Ukay-Ukay', '👕');
    add('barber1', this.door(2, 3, 'E'), 'barber', 'Barberya', '💈');
    add('barber2', this.door(7, 5, 'W'), 'barber', 'Barberya', '💈');
    add('pintura', this.door(4, 4, 'S'), 'paint', 'Pintura (Repaint)', '🎨');
    add('sari2', this.door(6, 3, 'S'), 'sari', 'Sari-Sari Store', '🏪');
    add('sari3', this.door(4, 7, 'N'), 'sari', 'Sari-Sari Store', '🏪');
    add('sari4', this.door(0, 6, 'E'), 'sari', 'Sari-Sari Store', '🏪');
    add('hospital', this.door(3, 3, 'S'), 'hospital', 'Ospital', '🏥');
    add('presinto', this.door(5, 3, 'S'), 'police', 'Presinto', '🚓');
    add('lechonan', this.door(6, -1, 'S'), 'spot', 'Lechonan', '🐷');
    add('fiesta', this.door(1, 1, 'E'), 'spot', 'Pista sa Tondo', '🎉');
    add('mansion', { x: (this.rs(8) + RW + 1.5) * T, y: (this.rsy(2) + RW + 8.5) * T }, 'spot', 'Mansyon ni Mayor', '🏛');
    add('ferry1', { x: (OX - 13) * T, y: 27.5 * T }, 'ferry', 'Ferry papuntang Isla Maligaya', '⛴');
    add('ferry2', this.island.dock, 'ferry', 'Ferry pabalik sa Manila', '⛴');
    add('hardware1', this.door(3, 0, 'N', 3), 'weapon', 'Hardware ni Mang Tonyo', '🔨');
    add('hardware2', this.door(5, 5, 'E'), 'weapon', 'Hardware ni Mang Tonyo', '🔨');
    add('gunshop1', this.door(2, 2, 'N'), 'gunshop', 'Armas ni Kabo', '🔫');
    add('gunshop2', this.door(6, 5, 'S'), 'gunshop', 'Armas ni Kabo', '🔫');
    add('evac', this.door(6, 1, 'S'), 'evac', 'Evacuation Center', '⛺');
    add('videoke', this.door(2, 6, 'N'), 'videoke', 'Videoke ni Aling Puring', '🎤');
    add('prop_sari', this.door(1, 2, 'S'), 'property', 'Sari-sari Store (Ibinebenta)', '🔑');
    add('prop_carin', this.door(4, 2, 'S'), 'property', 'Carinderia (Ibinebenta)', '🔑');
    add('prop_talyer', this.door(4, 5, 'N'), 'property', 'Talyer sa Paco (Ibinebenta)', '🔑');
    add('prop_resort', { x: (this.island.cx - 1.5) * T, y: (this.island.cy + 18.5) * T }, 'property', 'Beach Resort (Ibinebenta)', '🔑');
    add('prop_condo', this.door(7, 7, 'N'), 'property', 'Condo sa Makati (Ibinebenta)', '🔑');
    add('garage_home', this.door(2, 1, 'S', 6), 'garage', 'Garahe ni Tito Boy', '🅿️');
    add('riderhub', this.door(2, 5, 'N'), 'rider', 'Food Rider Hub', '🛵');
    add('towyard', this.door(5, 7, 'S'), 'tow', 'Impound Lot (Tow Truck)', '🛻');
    add('racespot', { x: (OX - 1.5) * T, y: this.cy(7) - 2 * T }, 'race', 'Underground Race', '🏁');
    add('islandstore', { x: (this.island.cx + 3.5) * T, y: (this.island.cy + 1) * T }, 'sari', 'Tindahan sa Isla', '🏪');
    add('bodega', { x: (this.rs(0) + RW + 5.5) * T, y: 8 * T }, 'spot', 'Bodega ni Mayor', '📦');
    // signs (awnings) for shops
    const awn = { ukay: ['#e84393', 'UKAY-UKAY'], barber: ['#2e86c1', 'BARBERYA'], paint: ['#e67e22', 'PINTURA'], sari: ['#27ae60', 'SARI-SARI'], chop: ['#c0392b', 'TALYER'], hospital: ['#c0392b', 'OSPITAL'], police: ['#2c5aa0', 'PRESINTO'], home: ['#d4ac0d', 'JEEPNEY TERMINAL'], weapon: ['#6c7a89', 'HARDWARE'], gunshop: ['#3b3b3b', 'ARMAS'], videoke: ['#8e44ad', 'VIDEOKE'], rider: ['#e8641e', 'RIDER HUB'], tow: ['#b7950b', 'IMPOUND LOT'], garage: ['#5d6d7e', 'GARAHE'] };
    for (const k in P) {
      const p = P[k];
      const a = awn[p.type];
      if (a) this.decor.push({ type: 'sign', x: p.x, y: p.y, color: a[0], text: a[1] });
    }
    // fiesta banderitas over Tondo streets
    this.decor.push({ type: 'flags', x0: this.cx(1) - 70, y0: this.cy(1) - 260, x1: this.cx(1) + 70, y1: this.cy(1) - 260 });
    this.decor.push({ type: 'flags', x0: this.cx(1) - 70, y0: this.cy(1) - 420, x1: this.cx(1) + 70, y1: this.cy(1) - 420 });
    this.decor.push({ type: 'flags', x0: this.cx(2) - 70, y0: this.cy(1) - 340, x1: this.cx(2) + 70, y1: this.cy(1) - 340 });
    this.decor.push({ type: 'flags', x0: this.cx(1) + 150, y0: this.cy(1) - 70, x1: this.cx(1) + 150, y1: this.cy(1) + 70 });
    this.decor.push({ type: 'boat', x: (OX - 13) * T, y: 24.4 * T });
    this.decor.push({ type: 'boat', x: (OX - 12) * T, y: 4.6 * T });
  },
  makeTsinelas(R) {
    const cands = [];
    for (let y = 2; y < MH - 2; y++) for (let x = OX; x < CITY_W - 2; x++) {
      const t = this.get(x, y);
      if ((t === TL.ALLEY || t === TL.GRASS || t === TL.PLAZA) && R() < 0.05) cands.push([x, y]);
    }
    for (let k = cands.length - 1; k > 0; k--) { const r = Math.floor(R() * (k + 1)); [cands[k], cands[r]] = [cands[r], cands[k]]; }
    for (const [x, y] of cands) {
      if (this.tsinelas.length >= 20) break;
      const px = (x + 0.5) * T, py = (y + 0.5) * T;
      if (this.tsinelas.every(s => U.dist(s.x, s.y, px, py) > 900)) this.tsinelas.push({ id: this.tsinelas.length, x: px, y: py });
    }
    // add a pier one
    if (this.tsinelas.length < 20) this.tsinelas.push({ id: this.tsinelas.length, x: (OX - 13) * T, y: 7.5 * T });
  },
  // ===== Chapter 3: Cebu — a Visayan port city across the strait =====
  makeSugbo() {
    const fill = this.fill, R = U.rng(7777), X = SX0, hy = this.prov.hy;
    // the strait
    fill(PROV_END, 0, STRAIT_W, MH, TL.WATER);
    // San Isidro pier at the end of the highway (ferry to Cebu)
    fill(PROV_END - 1, hy, 1, RW, TL.ROAD);
    fill(PROV_END, hy, 9, RW, TL.PIER);
    // Cebu base: grass, tree border on the far east
    fill(X, 0, SUGBO_W, MH, TL.GRASS);
    for (let y = 0; y < MH; y++) this.set(SUGBO_END - 1, y, TL.TREE);
    const VX = [X + 12, X + 34, X + 56, X + 78, X + 100], HY = [26, 48, 70, 92, 114, 136, 158];
    const sg = this.sugbo = { x0: X, VX, HY, pts: [], loops: [], blocks: [] };
    sg.cx = (i) => (VX[i] + RW / 2) * T; sg.cy = (j) => (HY[j] + RW / 2) * T;
    // roads
    for (const x of VX) fill(x, HY[0], RW, HY[HY.length - 1] - HY[0] + RW, TL.ROAD);
    for (const y of HY) fill(X + 2, y, VX[VX.length - 1] - X + 2, RW, TL.ROAD);
    // blocks
    const KIND = [
      ['slum', 'resid', 'resid', 'towers'],
      ['market', 'china', 'church', 'towers'],
      ['comm', 'comm', 'comm', 'resid'],
      ['slum', 'comm', 'hospital', 'police'],
      ['resid', 'market', 'comm', 'resid'],
      ['slum', 'resid', 'resid', 'resid'],
    ];
    for (let j = 0; j < HY.length - 1; j++) for (let i = 0; i < VX.length - 1; i++) {
      const x0 = VX[i] + RW, y0 = HY[j] + RW, w = VX[i + 1] - x0, h = HY[j + 1] - y0;
      this.fillBlock(x0, y0, w, h, KIND[j][i], 100 + i, 100 + j);
      sg.blocks.push({ i, j, x0, y0, w, h, kind: KIND[j][i] });
    }
    // waterfront / port strip on the west
    fill(X, HY[0], 2, HY[HY.length - 1] - HY[0] + RW, TL.PROM);
    fill(X + 2, HY[0] + RW, 10, HY[HY.length - 1] - HY[0] - RW, TL.PLAZA);
    const by0 = HY[3] + RW, by1 = by0 + 18;
    for (let y = HY[0] + 6; y < HY[HY.length - 1] - 2; y += 4) if (!HY.some(h => y + 2 >= h && y <= h + RW) && !(y + 2 >= by0 && y <= by1)) { if (R() < 0.7) this.addBld(X + 3, y, 3, 2, U.pick(PAL.container, R), 'container'); if (R() < 0.7) this.addBld(X + 7, y, 3, 2, U.pick(PAL.container, R), 'container'); }
    // Tiburon's warehouse on the port (Chapter 3 hideout)
    fill(X + 2, HY[3] + RW + 1, 10, 16, TL.PLAZA);
    this.addBld(X + 3, HY[3] + RW + 3, 8, 7, '#4f545c', 'bodega');
    sg.bodega = { x: (X + 7) * T, y: (HY[3] + RW + 13) * T };
    // piers into the strait
    sg.piers = [];
    for (const py of [HY[1] + 9, HY[4] + 9]) { fill(X - 9, py, 11, 3, TL.PIER); sg.piers.push({ x: (X - 7) * T, y: (py + 1.5) * T }); this.boatSpots.push({ x: (X - 5) * T, y: (py + 4.6) * T, a: Math.PI }); }
    this.boatSpots.push({ x: (PROV_END + 5) * T, y: (hy + RW + 2) * T, a: 0 });
    // northern hills (Busay) with a winding dirt road up to the lookout
    for (let y = 2; y < HY[0] - 1; y++) for (let x = X + 1; x < SUGBO_END - 2; x++) if (R() < 0.07) { const t = this.get(x, y); if (t === TL.GRASS) this.addTree(x, y); }
    const path = [[VX[3] + 1, HY[0]], [VX[3] + 1, 19], [X + 64, 19], [X + 64, 11], [X + 86, 11], [X + 86, 5]];
    for (let k = 0; k < path.length - 1; k++) {
      const [ax, ay] = path[k], [bx, by] = path[k + 1];
      fill(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax) + 3, Math.abs(by - ay) + 3, TL.DIRT);
    }
    fill(X + 82, 2, 12, 7, TL.PLAZA);
    this.addBld(X + 86, 3, 3, 2, '#9aa3ad', 'monument');
    sg.tops = { x: (X + 88) * T, y: (7.5) * T };
    // airport in the south
    const ay = HY[HY.length - 1] + RW;
    fill(X + 2, ay, SUGBO_W - 4, MH - ay - 1, TL.GRASS);
    fill(VX[1], ay, RW, 8, TL.ROAD);
    fill(X + 20, ay + 8, 60, 6, TL.PLAZA);
    this.addBld(X + 40, ay + 2, 16, 5, '#c9ced6', 'hall');
    fill(X + 8, ay + 16, SUGBO_W - 16, 6, TL.ROAD);   // runway
    sg.runway = { x0: (X + 8) * T, x1: (SUGBO_END - 8) * T, y: (ay + 19) * T };
    this.decor.push({ type: 'plane', x: (X + 64) * T, y: (ay + 11) * T, a: 0 });
    this.decor.push({ type: 'plane', x: (X + 30) * T, y: (ay + 11) * T, a: Math.PI });
    // a few more planes/boats for life
    this.decor.push({ type: 'boat', x: (X - 21) * T, y: 150 * T });
    // lamps
    for (const y of HY) for (let x = X + 4; x < VX[VX.length - 1]; x += 8) { this.lamps.push({ x: x * T, y: (y - 0.5) * T }); this.lamps.push({ x: x * T, y: (y + RW + 0.5) * T }); }
    for (let k = 0; k < 6; k++) this.lamps.push({ x: (PROV_END + 1 + k * 1.5) * T, y: (hy - 0.4) * T });
    // traffic / police points (lane positions at intersections)
    for (let i = 0; i < VX.length; i++) for (let j = 0; j < HY.length; j++) {
      const cx = sg.cx(i), cy = sg.cy(j);
      sg.pts.push({ x: cx + LO, y: cy - 90, a: Math.PI / 2 }, { x: cx - LO, y: cy + 90, a: -Math.PI / 2 });
    }
    // car loops (clockwise rectangles: lane offset towards the inside)
    const loop = (i0, j0, i1, j1) => {
      const o = LO, c = [[sg.cx(i0) + o, sg.cy(j0) + o], [sg.cx(i1) - o, sg.cy(j0) + o], [sg.cx(i1) - o, sg.cy(j1) - o], [sg.cx(i0) + o, sg.cy(j1) - o]];
      sg.loops.push(c.map(([x, y]) => ({ x, y })));
    };
    loop(0, 0, 4, 6); loop(0, 0, 2, 3); loop(2, 0, 4, 3); loop(0, 3, 2, 6); loop(2, 3, 4, 6); loop(1, 1, 3, 5); loop(0, 2, 4, 4);
    // floods (only during a typhoon) in the low port streets
    for (const j of [3, 4, 5]) this.tfloods.push({ x: (X + 2) * T, y: (HY[j] - 1) * T, w: (VX[2] - X) * T, h: (RW + 2) * T });
    // places
    const add = (key, x, y, type, label, icon, extra) => { this.pois[key] = Object.assign({ key, x: x * T, y: y * T, type, label, icon }, extra || {}); };
    const door = (b, side, off = 0) => side === 'S' ? [b.x0 + b.w / 2 + off, b.y0 + b.h - 0.5] : side === 'N' ? [b.x0 + b.w / 2 + off, b.y0 + 0.5] : side === 'E' ? [b.x0 + b.w - 0.5, b.y0 + b.h / 2 + off] : [b.x0 + 0.5, b.y0 + b.h / 2 + off];
    const B = (i, j) => sg.blocks.find(b => b.i === i && b.j === j);
    add('ferry_si', PROV_END + 7, hy + 2, 'ferry', 'Ferry papuntang Cebu', '⛴');
    add('ferry_sg', X - 7, HY[4] + 10.5, 'ferry', 'Ferry pabalik sa San Isidro', '⛴');
    add('airport_s', X + 48, ay + 7.6, 'airport', 'Paliparan ng Cebu', '✈️');
    add('bebing', ...door(B(1, 1), 'S', 4), 'npc', 'Inday Bebing', 'I');
    add('lechon_sg', ...door(B(1, 1), 'S', -2), 'spot', 'Lechonan ni Inday Bebing', '🐷');
    add('dodong', ...door(B(0, 2), 'E'), 'npc', 'Dodong', 'D');
    add('plazakrus', ...door(B(2, 1), 'S'), 'spot', 'Plaza Krus', '✝️');
    add('evac_sg', ...door(B(2, 1), 'E'), 'evac', 'Evacuation Center (Plaza Krus)', '⛺');
    add('sg_hospital', ...door(B(2, 3), 'S'), 'hospital', 'Ospital ng Cebu', '🏥');
    add('sg_presinto', ...door(B(3, 3), 'S'), 'police', 'Presinto ng Cebu', '🚓');
    add('sg_ukay', ...door(B(1, 2), 'S'), 'ukay', 'Ukay-Ukay sa Kolon', '👕');
    add('sg_sari', ...door(B(2, 4), 'N'), 'sari', 'Sari-sari ni Nang Pacing', '🏪');
    add('sg_gun', ...door(B(1, 4), 'E'), 'gunshop', 'Armas ni Kabo (Cebu)', '🔫');
    add('sg_paint', ...door(B(3, 2), 'S'), 'paint', 'Pintura sa IT Park', '🎨');
    add('sg_barber', ...door(B(0, 4), 'E'), 'barber', 'Barberya ni Toto', '💈');
    add('tops', X + 88, 9, 'spot', 'Tops Lookout', '⛰');
    add('sg_bodega', X + 7, HY[3] + RW + 14, 'spot', 'Bodega ni Kapitan Tiburon', '📦');
    for (const k of ['sg_ukay', 'sg_sari', 'sg_gun', 'sg_paint', 'sg_barber']) {
      const pp = this.pois[k], a = { ukay: ['#e84393', 'UKAY-UKAY'], sari: ['#27ae60', 'SARI-SARI'], gunshop: ['#3b3b3b', 'ARMAS'], paint: ['#e67e22', 'PINTURA'], barber: ['#2e86c1', 'BARBERYA'] }[pp.type];
      this.decor.push({ type: 'sign', x: pp.x, y: pp.y, color: a[0], text: a[1] });
    }
    this.decor.push({ type: 'sign', x: this.pois.lechon_sg.x, y: this.pois.lechon_sg.y, color: '#c0392b', text: 'LECHON' });
    // Manila airport (fly to Cebu) at the south edge of Pasay
    const [mx0, my0, mw, mh] = this.blockRect(5, 8);
    add('airport_m', mx0 + mw / 2, my0 + mh - 0.5, 'airport', 'Paliparan ng Manila', '✈️');
    this.decor.push({ type: 'sign', x: this.pois.airport_m.x, y: this.pois.airport_m.y, color: '#2c5aa0', text: 'PALIPARAN' });
  },
  // ===== Chapter 4: Davao — mountain, eagles, bananas and durian =====
  makeDabaw() {
    const fill = this.fill, R = U.rng(4242), X = DX0, sg = this.sugbo;
    fill(SUGBO_END, 0, STRAIT2_W, MH, TL.WATER);
    // Cebu east pier (ferry to Davao)
    const py = sg.HY[3];
    fill(sg.VX[4] + RW, py, SUGBO_END - sg.VX[4] - RW, RW, TL.ROAD);
    fill(SUGBO_END, py, 9, RW, TL.PIER);
    fill(X, 0, DABAW_W, MH, TL.GRASS);
    for (let y = 0; y < MH; y++) this.set(DABAW_END - 1, y, TL.TREE);
    const VX = [X + 10, X + 32, X + 54, X + 76], HY = [66, 88, 110, 132, 154];
    const dw = this.dabaw = { x0: X, VX, HY, pts: [], loops: [], blocks: [] };
    dw.cx = (i) => (VX[i] + RW / 2) * T; dw.cy = (j) => (HY[j] + RW / 2) * T;
    for (const x of VX) fill(x, HY[0], RW, HY[4] - HY[0] + RW, TL.ROAD);
    for (const y of HY) fill(X + 2, y, VX[3] - X + 2, RW, TL.ROAD);
    const KIND = [['resid', 'market', 'comm'], ['comm', 'china', 'towers'], ['resid', 'church', 'comm'], ['slum', 'resid', 'hospital']];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) {
      const x0 = VX[i] + RW, y0 = HY[j] + RW, w = VX[i + 1] - x0, h = HY[j + 1] - y0;
      this.fillBlock(x0, y0, w, h, KIND[j][i], 200 + i, 200 + j);
      dw.blocks.push({ i, j, x0, y0, w, h, kind: KIND[j][i] });
    }
    // west waterfront + pier
    fill(X, HY[0], 2, HY[4] - HY[0] + RW, TL.PROM);
    fill(X - 9, HY[2] + 8, 11, 3, TL.PIER);
    dw.pier = { x: (X - 7) * T, y: (HY[2] + 9.5) * T };
    this.boatSpots.push({ x: (X - 5) * T, y: (HY[2] + 12.6) * T, a: Math.PI }, { x: (SUGBO_END + 5) * T, y: (py + RW + 2) * T, a: 0 });
    // the mountain (Bundok Apo) in the north: forest, a winding trail, the logging camp and the summit
    for (let y = 2; y < HY[0] - 1; y++) for (let x = X + 1; x < DABAW_END - 2; x++) if (R() < 0.16) this.addTree(x, y);
    const trail = [[VX[1] + 1, HY[0]], [VX[1] + 1, 52], [X + 70, 52], [X + 70, 38], [X + 26, 38], [X + 26, 24], [X + 80, 24], [X + 80, 10]];
    for (let k = 0; k < trail.length - 1; k++) { const [ax, ay] = trail[k], [bx, by] = trail[k + 1]; fill(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax) + 3, Math.abs(by - ay) + 3, TL.DIRT); }
    dw.trail = trail.map(([x, y]) => ({ x: (x + 1.5) * T, y: (y + 1.5) * T }));
    // logging camp
    fill(X + 8, 14, 18, 14, TL.DIRT);
    this.addBld(X + 10, 15, 6, 4, '#5b4a36', 'bodega'); this.addBld(X + 18, 16, 5, 2, '#7a5a2e', 'container'); this.addBld(X + 18, 21, 5, 2, '#7a5a2e', 'container');
    dw.camp = { x: (X + 16) * T, y: (24) * T };
    // summit
    fill(X + 76, 3, 12, 8, TL.PLAZA); this.addBld(X + 80, 4, 3, 2, '#9aa3ad', 'monument');
    dw.summit = { x: (X + 82) * T, y: (9) * T };
    // eagle sanctuary (east of the city)
    fill(VX[3] + RW, HY[0], DABAW_END - VX[3] - RW - 2, HY[2] - HY[0], TL.GRASS);
    fill(VX[3] + RW, HY[1], DABAW_END - VX[3] - RW - 2, RW, TL.ROAD);
    for (let y = HY[0] + 1; y < HY[2] - 1; y++) for (let x = VX[3] + RW + 1; x < DABAW_END - 3; x++) if (R() < 0.12 && Math.abs(y - HY[1] - 2) > 3) this.addTree(x, y);
    this.addBld(VX[3] + 10, HY[1] + 6, 8, 4, '#6b8f5a', 'hall');
    // banana plantation (south-east)
    for (let y = HY[2] + 1; y < MH - 4; y++) for (let x = VX[3] + RW + 1; x < DABAW_END - 3; x++) this.set(x, y, (x % 4 === 0) ? TL.GRASS : TL.PADDY);
    fill(VX[3] + RW, HY[3], DABAW_END - VX[3] - RW - 2, RW, TL.DIRT);
    fill(DABAW_END - 10, HY[2], 3, MH - HY[2] - 6, TL.DIRT);
    dw.farm = { x: (DABAW_END - 9) * T, y: (MH - 12) * T };
    // airport (south-west)
    const ay = HY[4] + RW;
    fill(X + 2, ay, VX[3] - X, MH - ay - 1, TL.GRASS);
    fill(VX[1], ay, RW, 8, TL.ROAD); fill(X + 16, ay + 8, 46, 6, TL.PLAZA);
    this.addBld(X + 30, ay + 2, 14, 5, '#c9ced6', 'hall');
    fill(X + 6, ay + 16, VX[3] - X - 4, 6, TL.ROAD);
    this.decor.push({ type: 'plane', x: (X + 52) * T, y: (ay + 11) * T, a: 0 });
    // lamps, traffic points & loops
    for (const y of HY) for (let x = X + 4; x < VX[3]; x += 8) { this.lamps.push({ x: x * T, y: (y - 0.5) * T }); this.lamps.push({ x: x * T, y: (y + RW + 0.5) * T }); }
    for (let i = 0; i < VX.length; i++) for (let j = 0; j < HY.length; j++) { const cx = dw.cx(i), cy = dw.cy(j); dw.pts.push({ x: cx + LO, y: cy - 90, a: Math.PI / 2 }, { x: cx - LO, y: cy + 90, a: -Math.PI / 2 }); }
    const loop = (i0, j0, i1, j1) => { const o = LO, c = [[dw.cx(i0) + o, dw.cy(j0) + o], [dw.cx(i1) - o, dw.cy(j0) + o], [dw.cx(i1) - o, dw.cy(j1) - o], [dw.cx(i0) + o, dw.cy(j1) - o]]; dw.loops.push(c.map(([x, y]) => ({ x, y }))); };
    loop(0, 0, 3, 4); loop(0, 0, 2, 2); loop(1, 2, 3, 4); loop(0, 1, 3, 3);
    // places
    const add = (key, x, y, type, label, icon, extra) => { this.pois[key] = Object.assign({ key, x: x * T, y: y * T, type, label, icon }, extra || {}); };
    const B = (i, j) => dw.blocks.find(b => b.i === i && b.j === j);
    const door = (b, side, off = 0) => side === 'S' ? [b.x0 + b.w / 2 + off, b.y0 + b.h - 0.5] : side === 'N' ? [b.x0 + b.w / 2 + off, b.y0 + 0.5] : side === 'E' ? [b.x0 + b.w - 0.5, b.y0 + b.h / 2 + off] : [b.x0 + 0.5, b.y0 + b.h / 2 + off];
    add('ferry_sg2', SUGBO_END + 7, py + 2, 'ferry', 'Ferry papuntang Davao', '⛴');
    add('ferry_dw', X - 7, HY[2] + 10.5, 'ferry', 'Ferry pabalik sa Cebu', '⛴');
    add('airport_d', X + 37, ay + 7.6, 'airport', 'Paliparan ng Davao', '✈️');
    add('maya', VX[3] + 14, HY[1] + 11, 'npc', 'Ate Maya', 'M');
    add('islaw', DABAW_END - 14, HY[3] - 1, 'npc', 'Mang Islaw', 'I');
    add('eagle', VX[3] + 14, HY[1] + 10.4, 'spot', 'Sentro ng Agila', '🦅', { landmark: true });
    add('durian', ...door(B(1, 0), 'S'), 'sari', 'Durian Market', '🍈');
    add('dw_hospital', ...door(B(2, 3), 'N'), 'hospital', 'Ospital ng Davao', '🏥');
    add('dw_presinto', ...door(B(1, 3), 'N'), 'police', 'Presinto ng Davao', '🚓');
    add('dw_gun', ...door(B(0, 1), 'E'), 'gunshop', 'Armas ni Kabo (Davao)', '🔫');
    add('dw_ukay', ...door(B(2, 1), 'S'), 'ukay', 'Ukay-Ukay sa Davao', '👕');
    add('dw_paint', ...door(B(0, 2), 'E'), 'paint', 'Pintura sa Davao', '🎨');
    add('summit', X + 82, 7, 'spot', 'Tuktok ng Bundok Apo', '⛰', { landmark: true });
    add('camp', X + 16, 24.5, 'spot', 'Kampo ng mga Ilegal na Mangangahoy', '🪓');
    add('banana', DABAW_END - 9, MH - 12, 'spot', 'Saging na Plantasyon', '🍌', { landmark: true });
    for (const k of ['durian', 'dw_gun', 'dw_ukay', 'dw_paint']) { const pp = this.pois[k], a = { sari: ['#7fb800', 'DURIAN'], gunshop: ['#3b3b3b', 'ARMAS'], ukay: ['#e84393', 'UKAY-UKAY'], paint: ['#e67e22', 'PINTURA'] }[pp.type]; this.decor.push({ type: 'sign', x: pp.x, y: pp.y, color: a[0], text: a[1] }); }
  },
  // photo spots / tourist landmarks (map category "Pasyalan")
  // ===== Chapter 5: Baguio — the cool mountain city of pines, fog and strawberries =====
  makeBagiw() {
    const fill = this.fill, R = U.rng(5151), X = BX0;
    fill(DABAW_END, 0, BX0 - DABAW_END, MH, TL.GRASS);
    for (let y = 0; y < MH; y++) for (let x = DABAW_END; x < BX0; x++) this.addTree(x, y);
    fill(X, 0, BAGIW_W, MH, TL.GRASS);
    for (let y = 0; y < MH; y++) this.set(BAGIW_END - 1, y, TL.TREE);
    const VX = [X + 22, X + 42, X + 62], HY = [56, 76, 96, 116];
    const bg = this.bagiw = { x0: X, VX, HY, pts: [], loops: [], blocks: [] };
    bg.cx = (i) => (VX[i] + RW / 2) * T; bg.cy = (j) => (HY[j] + RW / 2) * T;
    for (const x of VX) fill(x, HY[0], RW, HY[3] - HY[0] + RW, TL.ROAD);
    for (const y of HY) fill(VX[0], y, VX[2] - VX[0] + RW, RW, TL.ROAD);
    const KIND = [['comm', 'market'], ['church', 'comm'], ['resid', 'resid']];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) {
      const x0 = VX[i] + RW, y0 = HY[j] + RW, w = VX[i + 1] - x0, h = HY[j + 1] - y0;
      this.fillBlock(x0, y0, w, h, KIND[j][i], 300 + i, 300 + j);
      bg.blocks.push({ i, j, x0, y0, w, h, kind: KIND[j][i] });
    }
    // park with a lake (east of the city)
    const px0 = VX[2] + RW + 2, py0 = HY[0], pw = BAGIW_END - px0 - 4, ph = HY[2] - HY[0] + RW;
    fill(px0, py0, pw, ph, TL.GRASS);
    fill(VX[2] + RW, HY[1], px0 - VX[2] - RW + 2, RW, TL.ROAD);
    const lcx = px0 + pw / 2, lcy = py0 + ph / 2 + 4;
    for (let y = py0; y < py0 + ph; y++) for (let x = px0; x < px0 + pw; x++) { const d = ((x - lcx) / 11) ** 2 + ((y - lcy) / 7) ** 2; if (d < 1) this.set(x, y, TL.WATER); else if (d < 1.35) this.set(x, y, TL.PROM); }
    bg.lake = { x: lcx * T, y: lcy * T };
    for (let k = 0; k < 3; k++) this.boatSpots.push({ x: (lcx - 5 + k * 5) * T, y: (lcy + 2) * T, a: 0, swan: true });
    // strawberry farms (west)
    for (let y = HY[0]; y < HY[3] + RW; y++) for (let x = X + 2; x < VX[0] - 2; x++) this.set(x, y, x % 3 === 0 ? TL.DIRT : TL.PADDY);
    fill(X + 2, HY[2], VX[0] - X - 2, RW, TL.DIRT);
    bg.farm = { x: (X + 10) * T, y: (HY[2] - 2) * T };
    this.addBld(X + 6, HY[2] - 6, 4, 3, '#8a5a3a', 'nipa');
    // walled mansion + Mines View lookout up north
    fill(VX[2] + 1, 26, RW, HY[0] - 26, TL.ROAD); fill(VX[2] + 1, 26, X + 92 - VX[2], RW, TL.ROAD);
    const mx0 = X + 34, my0 = 4, mw = 24, mh = 18;
    for (let y = my0; y < my0 + mh; y++) for (let x = mx0; x < mx0 + mw; x++) this.set(x, y, (x === mx0 || y === my0 || x === mx0 + mw - 1 || y === my0 + mh - 1) ? TL.WALL : TL.GRASS);
    fill(mx0 + 10, my0 + mh - 1, 4, 1, TL.PLAZA); fill(mx0 + 10, my0 + mh, 4, 26 - my0 - mh, TL.ROAD);
    fill(mx0 + 10, my0 + 9, 4, 8, TL.PLAZA);
    this.addBld(mx0 + 6, my0 + 3, 12, 6, '#d8cdb0', 'mansion');
    for (const [x, y] of [[mx0 + 2, my0 + 2], [mx0 + mw - 3, my0 + 2], [mx0 + 3, my0 + 13], [mx0 + mw - 4, my0 + 13]]) this.addTree(x, y);
    bg.mansion = { x0: mx0 * T, y0: my0 * T, x1: (mx0 + mw) * T, y1: (my0 + mh) * T, gate: { x: (mx0 + 12) * T, y: (my0 + mh + 2) * T }, office: { x: (mx0 + 12) * T, y: (my0 + 10) * T } };
    fill(X + 84, 16, 12, 10, TL.PLAZA); this.addBld(X + 88, 17, 3, 2, '#9aa3ad', 'monument');
    // winding road down to the airport
    const sw = [[VX[1] + 1, HY[3] + RW], [VX[1] + 1, 134], [X + 74, 134], [X + 74, 146], [X + 26, 146], [X + 26, 158], [X + 62, 158], [X + 62, 168]];
    for (let k = 0; k < sw.length - 1; k++) { const [ax, ay] = sw[k], [bx, by] = sw[k + 1]; fill(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax) + RW, Math.abs(by - ay) + RW, TL.ROAD); }
    bg.down = sw.map(([x, y]) => ({ x: (x + 2) * T, y: (y + 2) * T }));
    const ay = 168;
    fill(X + 20, ay + 2, 60, 6, TL.PLAZA); this.addBld(X + 38, ay - 4, 14, 5, '#c9ced6', 'hall');
    fill(X + 6, ay + 12, BAGIW_W - 12, 6, TL.ROAD);
    this.decor.push({ type: 'plane', x: (X + 70) * T, y: (ay + 5) * T, a: Math.PI });
    // illegal mining scars in the forest (Chapter 5)
    bg.mines = [];
    for (const [mx, my] of [[X + 8, 22], [X + 84, 42], [X + 12, 152], [X + 88, 152]]) { for (let y = my - 3; y <= my + 3; y++) for (let x = mx - 4; x <= mx + 4; x++) if (this.get(x, y) === TL.GRASS && R() < 0.85) this.set(x, y, TL.DIRT); bg.mines.push({ x: mx * T, y: my * T }); }
    // pines everywhere else
    for (let y = 2; y < MH - 2; y++) for (let x = X + 1; x < BAGIW_END - 2; x++) if (this.get(x, y) === TL.GRASS && R() < 0.1) { let free = true; for (let k = 0; k < 4; k++) { const n = this.get(x + DIRS[k][0], y + DIRS[k][1]); if (n !== TL.GRASS && n !== TL.TREE) free = false; } if (free) this.addTree(x, y); }
    // lamps, traffic
    for (const y of HY) for (let x = VX[0] + 2; x < VX[2] + 2; x += 8) { this.lamps.push({ x: x * T, y: (y - 0.5) * T }); this.lamps.push({ x: x * T, y: (y + RW + 0.5) * T }); }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { const cx = bg.cx(i), cy = bg.cy(j); bg.pts.push({ x: cx + LO, y: cy - 90, a: Math.PI / 2 }, { x: cx - LO, y: cy + 90, a: -Math.PI / 2 }); }
    const loop = (i0, j0, i1, j1) => { const o = LO, c = [[bg.cx(i0) + o, bg.cy(j0) + o], [bg.cx(i1) - o, bg.cy(j0) + o], [bg.cx(i1) - o, bg.cy(j1) - o], [bg.cx(i0) + o, bg.cy(j1) - o]]; bg.loops.push(c.map(([x, y]) => ({ x, y }))); };
    loop(0, 0, 2, 3); loop(0, 0, 1, 2); loop(1, 1, 2, 3);
    // places
    const add = (key, x, y, type, label, icon, extra) => { this.pois[key] = Object.assign({ key, x: x * T, y: y * T, type, label, icon }, extra || {}); };
    const B = (i, j) => bg.blocks.find(b => b.i === i && b.j === j);
    const door = (b, side, off = 0) => side === 'S' ? [b.x0 + b.w / 2 + off, b.y0 + b.h - 0.5] : side === 'N' ? [b.x0 + b.w / 2 + off, b.y0 + 0.5] : side === 'E' ? [b.x0 + b.w - 0.5, b.y0 + b.h / 2 + off] : [b.x0 + 0.5, b.y0 + b.h / 2 + off];
    add('airport_b', X + 45, ay + 3.5, 'airport', 'Paliparan ng Baguio', '✈️');
    add('pining', X + 8, HY[2] - 1.5, 'npc', 'Lola Pining', 'P');
    add('bg_ukay', ...door(B(1, 0), 'W'), 'ukay', 'Ukay-Ukay sa Baguio', '👕');
    add('bg_sari', ...door(B(0, 0), 'S'), 'sari', 'Strawberry Taho', '🍓');
    add('bg_gun', ...door(B(1, 1), 'S'), 'gunshop', 'Armas ni Kabo (Baguio)', '🔫');
    add('bg_hospital', ...door(B(0, 2), 'N'), 'hospital', 'Ospital ng Baguio', '🏥');
    add('bg_presinto', ...door(B(1, 2), 'N'), 'police', 'Presinto ng Baguio', '🚓');
    add('bg_church', ...door(B(0, 1), 'E'), 'church', 'Katedral ng Baguio', '⛪');
    add('bg_kainan', ...door(B(1, 2), 'W'), 'kainan', 'Manukan sa Kanto (Baguio)', '🍗');
    add('bg_heli', X + 72, HY[1] + 2, 'heli', 'Helicopter Tour', '🚁');
    add('heli_m', this.door(8, 6, 'N').x / T, this.door(8, 6, 'N').y / T, 'heli', 'Helipad ng Makati', '🚁');
    add('lm_mines', X + 90, 24.5, 'spot', 'Mines View Lookout', '🏔', { landmark: true });
    add('lm_lake', lcx, lcy + 8.5, 'spot', 'Liwasang Baguio (Lawa)', '🦢', { landmark: true });
    add('lm_farm', X + 12, HY[1] + 2, 'spot', 'Presahan (Strawberry Farm)', '🍓', { landmark: true });
    add('magno_gate', bg.mansion.gate.x / T, bg.mansion.gate.y / T, 'spot', 'Mansyon ni Don Magno', '🏰');
    for (const k of ['bg_ukay', 'bg_sari', 'bg_gun', 'bg_church', 'bg_kainan']) { const pp = this.pois[k], a = { ukay: ['#e84393', 'UKAY-UKAY'], sari: ['#c0392b', 'STRAWBERRY'], gunshop: ['#3b3b3b', 'ARMAS'], church: ['#7a6a58', 'SIMBAHAN'], kainan: ['#c0392b', 'MANUKAN'] }[pp.type]; this.decor.push({ type: 'sign', x: pp.x, y: pp.y, color: a[0], text: a[1] }); }
    this.decor.push({ type: 'sign', x: this.pois.heli_m.x, y: this.pois.heli_m.y, color: '#16a085', text: 'HELIPAD' });
  },
  // ---------- Boracay: a long, narrow island with White Beach on the west ----------
  makeBora() {
    const fill = this.fill, R = U.rng(7272), X = BRX0;
    fill(BAGIW_END, 0, BRX0 + BORA_W - BAGIW_END, MH, TL.WATER);
    const ix0 = X + 14, ix1 = X + 52, iy0 = 26, iy1 = 176;
    // island outline (wider in the middle, narrow at the tips)
    for (let y = iy0; y < iy1; y++) {
      const t = (y - iy0) / (iy1 - iy0), w = Math.sin(Math.PI * Math.min(1, t * 1.25)) ;
      const l = Math.round(ix0 + (1 - w) * 10), r = Math.round(ix1 - (1 - w) * 8 + Math.sin(y * 0.15) * 2);
      for (let x = l; x < r; x++) this.set(x, y, x < l + 5 ? TL.SAND : TL.GRASS);
    }
    const VX = [X + 24, X + 36], HY = [40, 70, 100, 130, 160];
    const bo = this.bora = { x0: X, VX, HY, pts: [], loops: [], blocks: [] };
    bo.cx = (i) => (VX[i] + RW / 2) * T; bo.cy = (j) => (HY[j] + RW / 2) * T;
    for (const x of VX) fill(x, HY[0], RW, HY[4] - HY[0] + RW, TL.ROAD);
    for (const y of HY) fill(VX[0], y, VX[1] - VX[0] + RW, RW, TL.ROAD);
    // beach path (sand) along White Beach, linked to the main road
    for (const y of HY) for (let x = X + 18; x < VX[0]; x++) if (this.get(x, y) !== TL.WATER) this.set(x, y + 1, TL.PLAZA);
    const KIND = [['resort', 'comm'], ['comm', 'market'], ['resort', 'comm'], ['resid', 'church']];
    for (let j = 0; j < 4; j++) {
      const x0 = VX[0] + RW, y0 = HY[j] + RW, w = VX[1] - x0, h = HY[j + 1] - y0;
      this.fillBlock(x0, y0, w, h, KIND[j][1] === 'church' ? 'comm' : KIND[j][1], 400, 400 + j);
      bo.blocks.push({ i: 0, j, x0, y0, w, h, kind: KIND[j][1] });
    }
    // beach resorts (west of the main road) with palms
    for (let j = 0; j < 4; j++) {
      const y0 = HY[j] + RW + 2, y1 = HY[j + 1] - 2;
      for (let y = y0; y < y1 - 3; y += 6) { const x = X + 21 + (y % 2); if (this.get(x, y) === TL.GRASS && this.get(x + 1, y + 3) === TL.GRASS) this.addBld(x, y, 3, 4, U.choice(['#f4e3c1', '#e8d3a8', '#f7f0de', '#d9c49a']), 'resort'); }
    }
    for (let y = iy0 + 4; y < iy1 - 4; y++) for (let x = X + 19; x < X + 21; x++) if (this.get(x, y) === TL.SAND && R() < 0.18) { this.addTree(x, y); this.trees[this.trees.length - 1].palm = true; }
    // Mt. Luho viewpoint (east) and Puka beach (north tip)
    fill(VX[1] + RW, HY[1] + 6, 8, RW, TL.ROAD); fill(VX[1] + RW + 7, HY[1] + 2, 6, 6, TL.PLAZA); this.addBld(VX[1] + RW + 9, HY[1] + 3, 2, 2, '#9aa3ad', 'monument');
    fill(VX[0], 30, RW, HY[0] - 30, TL.ROAD); fill(VX[0] - 6, 28, 12, 3, TL.SAND);
    // airport + jetty at the south end
    const ay = 165;
    fill(VX[0] + 4, ay, 14, 6, TL.PLAZA); this.addBld(VX[0] + 7, ay - 4, 8, 4, '#c9ced6', 'hall');
    this.decor.push({ type: 'plane', x: (VX[1] + 8) * T, y: (ay + 3) * T, a: Math.PI });
    fill(X + 14, iy1 - 8, 6, 2, TL.PIER);
    // boats on White Beach (paraw sailboats & bangka for island hopping)
    for (let k = 0; k < 6; k++) this.boatSpots.push({ x: (X + 15.5) * T, y: (HY[0] + 8 + k * 20) * T, a: Math.PI / 2 });
    // lamps + traffic loops
    for (const y of HY) for (let x = VX[0] + 2; x < VX[1] + 2; x += 6) this.lamps.push({ x: x * T, y: (y - 0.5) * T });
    for (let i = 0; i < 2; i++) for (let j = 0; j < 5; j++) { const cx = bo.cx(i), cy = bo.cy(j); bo.pts.push({ x: cx + LO, y: cy - 90, a: Math.PI / 2 }, { x: cx - LO, y: cy + 90, a: -Math.PI / 2 }); }
    const loop = (i0, j0, i1, j1) => { const o = LO, c = [[bo.cx(i0) + o, bo.cy(j0) + o], [bo.cx(i1) - o, bo.cy(j0) + o], [bo.cx(i1) - o, bo.cy(j1) - o], [bo.cx(i0) + o, bo.cy(j1) - o]]; bo.loops.push(c.map(([x, y]) => ({ x, y }))); };
    loop(0, 0, 1, 4); loop(0, 1, 1, 3);
    // places
    const add = (key, x, y, type, label, icon, extra) => { this.pois[key] = Object.assign({ key, x: x * T, y: y * T, type, label, icon }, extra || {}); };
    const B = (j) => bo.blocks.find(b => b.j === j);
    const door = (b, side, off = 0) => side === 'S' ? [b.x0 + b.w / 2 + off, b.y0 + b.h - 0.5] : side === 'N' ? [b.x0 + b.w / 2 + off, b.y0 + 0.5] : side === 'E' ? [b.x0 + b.w - 0.5, b.y0 + b.h / 2 + off] : [b.x0 + 0.5, b.y0 + b.h / 2 + off];
    add('airport_bo', VX[0] + 11, ay + 3.5, 'airport', 'Paliparan ng Boracay', '✈️');
    add('tomas', X + 19, HY[1] + 5, 'npc', 'Mang Tomas', 'T');
    bo.resort = { x: (X + 22) * T, y: (HY[3] + 8) * T }; bo.pipes = [[X + 18, HY[0] + 14], [X + 18, HY[2] + 6], [X + 18, HY[3] + 14]].map(([x, y]) => ({ x: x * T, y: y * T }));
    bo.ring = [[X + 9, 40], [X + 8, 100], [X + 9, 160], [X + 30, 184], [X + 58, 160], [X + 59, 100], [X + 58, 40], [X + 30, 18]].map(([x, y]) => ({ x: x * T, y: y * T }));
    add('bo_mall', ...door(B(1), 'W', -4), 'mall', "D'Mall Boracay", '🏬');
    add('bo_kainan', ...door(B(0), 'W'), 'kainan', 'Manukan sa Kanto (Boracay)', '🍗');
    add('bo_sari', ...door(B(2), 'W', 4), 'sari', 'Halo-Halo sa Dalampasigan', '🍧');
    add('bo_ukay', ...door(B(1), 'W', 5), 'ukay', 'Beachwear sa Boracay', '👙');
    add('bo_hospital', ...door(B(3), 'W', -4), 'hospital', 'Klinika ng Boracay', '🏥');
    add('bo_presinto', ...door(B(3), 'W', 4), 'police', 'Presinto ng Boracay', '🚓');
    add('bo_church', ...door(B(2), 'E'), 'church', 'Kapilya ng Boracay', '⛪');
    add('lm_whitebeach', X + 17, HY[1] + 10, 'spot', 'White Beach (Paglubog ng Araw)', '🏖', { landmark: true });
    add('lm_puka', VX[0] + 2, 29.5, 'spot', 'Puka Beach', '🐚', { landmark: true });
    add('lm_luho', VX[1] + RW + 10, HY[1] + 7.5, 'spot', 'Mt. Luho Viewpoint', '⛰', { landmark: true });
    add('lm_willy', X + 16, HY[2] + 12, 'spot', "Willy's Rock", '🗿', { landmark: true });
    for (const k of ['bo_mall', 'bo_kainan', 'bo_sari', 'bo_ukay']) { const pp = this.pois[k], a = { mall: ['#16a085', "D'MALL"], kainan: ['#c0392b', 'MANUKAN'], sari: ['#e84393', 'HALO-HALO'], ukay: ['#2e86c1', 'BEACHWEAR'] }[pp.type]; if (a) this.decor.push({ type: 'sign', x: pp.x, y: pp.y, color: a[0], text: a[1] }); }
  },
  // ---------- Palawan: Puerto Princesa, the Underground River, El Nido lagoons, forest and reef ----------
  makePal() {
    const fill = this.fill, R = U.rng(8383), X = PX0;
    fill(BRX0 + BORA_W, 0, MW - BRX0 - BORA_W, MH, TL.WATER);
    // the island: a long diagonal-ish strip
    for (let y = 8; y < MH - 8; y++) {
      const t = y / MH, cxl = X + 16 + t * 34 + Math.sin(y * 0.07) * 4, half = 22 + Math.sin(t * Math.PI) * 14;
      for (let x = Math.round(cxl - half); x < Math.round(cxl + half); x++) if (x > X && x < MW - 2) this.set(x, y, TL.GRASS);
    }
    // Puerto Princesa city grid (middle-east)
    const VX = [X + 46, X + 62, X + 78], HY = [88, 106, 124];
    const pl = this.pal = { x0: X, VX, HY, pts: [], loops: [], blocks: [] };
    pl.cx = (i) => (VX[i] + RW / 2) * T; pl.cy = (j) => (HY[j] + RW / 2) * T;
    for (const x of VX) fill(x, HY[0], RW, HY[2] - HY[0] + RW, TL.ROAD);
    for (const y of HY) fill(VX[0], y, VX[2] - VX[0] + RW, RW, TL.ROAD);
    const KIND = [['comm', 'market'], ['resid', 'comm']];
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const x0 = VX[i] + RW, y0 = HY[j] + RW, w = VX[i + 1] - x0, h = HY[j + 1] - y0;
      this.fillBlock(x0, y0, w, h, KIND[j][i], 500 + i, 500 + j);
      pl.blocks.push({ i, j, x0, y0, w, h });
    }
    // highway north to the river and El Nido, south to the forest
    const hw = [[VX[0], HY[0]], [VX[0], 60], [X + 30, 60], [X + 30, 22]];
    for (let k = 0; k < hw.length - 1; k++) { const [ax, ay] = hw[k], [bx, by] = hw[k + 1]; fill(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax) + RW, Math.abs(by - ay) + RW, TL.DIRT); }
    const south = [[VX[1], HY[2]], [VX[1], 158], [X + 56, 158], [X + 56, 176]];
    for (let k = 0; k < south.length - 1; k++) { const [ax, ay] = south[k], [bx, by] = south[k + 1]; fill(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax) + RW, Math.abs(by - ay) + RW, TL.DIRT); }
    pl.north = hw.map(([x, y]) => ({ x: (x + 2) * T, y: (y + 2) * T }));
    pl.south = south.map(([x, y]) => ({ x: (x + 2) * T, y: (y + 2) * T }));
    // the Underground River: a winding channel from the west coast into a cave (rock walls)
    pl.river = [];
    let rx = X + 8, ry = 52;
    for (let k = 0; k < 9; k++) {
      const nx = X + 10 + k * 3, ny = 52 + Math.round(Math.sin(k * 1.3) * 7);
      for (let t = 0; t <= 1; t += 0.05) { const x = Math.round(U.lerp(rx, nx, t)), y = Math.round(U.lerp(ry, ny, t)); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.set(x + dx, y + dy, TL.WATER); }
      rx = nx; ry = ny; pl.river.push({ x: (nx + 0.5) * T, y: (ny + 0.5) * T });
    }
    for (let y = 40; y < 66; y++) for (let x = X + 22; x < X + 40; x++) if (this.get(x, y) === TL.GRASS && R() < 0.5) this.set(x, y, TL.WALL);   // limestone cave
    fill(X + 4, 52, 6, 3, TL.PIER);
    pl.riverDock = { x: (X + 7) * T, y: (50) * T };
    // El Nido lagoons + cliffs (north tip)
    for (let y = 12; y < 30; y++) for (let x = X + 14; x < X + 40; x++) { const d = ((x - (X + 26)) / 9) ** 2 + ((y - 20) / 6) ** 2; if (d < 1) this.set(x, y, TL.WATER); else if (d < 1.5 && R() < 0.6) this.set(x, y, TL.WALL); }
    pl.lagoon = { x: (X + 26) * T, y: 20 * T };
    // poachers' camp in the southern forest
    const cx0 = X + 34, cy0 = 150;
    fill(cx0, cy0, 14, 10, TL.DIRT); this.addBld(cx0 + 2, cy0 + 1, 4, 3, '#5a4a3a', 'hut'); this.addBld(cx0 + 8, cy0 + 1, 4, 3, '#5a4a3a', 'hut');
    fill(cx0 + 4, cy0 + 10, RW, 158 - cy0 - 10 + RW, TL.DIRT); fill(cx0 + 4, 158, X + 56 - cx0 - 4, RW, TL.DIRT);
    pl.camp = { x: (cx0 + 7) * T, y: (cy0 + 5) * T };
    // reef offshore (west) for the dynamite-fishing mission
    pl.reef = [[X + 4, 100], [X + 2, 126], [X + 8, 140]].map(([x, y]) => ({ x: x * T, y: y * T }));
    // airport south of the city
    const ay = 136;
    fill(VX[0], ay, 30, 6, TL.PLAZA); this.addBld(VX[0] + 8, ay - 4, 10, 4, '#c9ced6', 'hall');
    this.decor.push({ type: 'plane', x: (VX[0] + 24) * T, y: (ay + 3) * T, a: Math.PI });
    // forest
    for (let y = 4; y < MH - 4; y++) for (let x = X + 1; x < MW - 2; x++) if (this.get(x, y) === TL.GRASS && R() < 0.12) { let free = true; for (let k = 0; k < 4; k++) { const n = this.get(x + DIRS[k][0], y + DIRS[k][1]); if (n !== TL.GRASS && n !== TL.TREE) free = false; } if (free) this.addTree(x, y); }
    for (const y of HY) for (let x = VX[0] + 2; x < VX[2] + 2; x += 7) this.lamps.push({ x: x * T, y: (y - 0.5) * T });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const cx = pl.cx(i), cy = pl.cy(j); pl.pts.push({ x: cx + LO, y: cy - 90, a: Math.PI / 2 }, { x: cx - LO, y: cy + 90, a: -Math.PI / 2 }); }
    const loop = (i0, j0, i1, j1) => { const o = LO, c = [[pl.cx(i0) + o, pl.cy(j0) + o], [pl.cx(i1) - o, pl.cy(j0) + o], [pl.cx(i1) - o, pl.cy(j1) - o], [pl.cx(i0) + o, pl.cy(j1) - o]]; pl.loops.push(c.map(([x, y]) => ({ x, y }))); };
    loop(0, 0, 2, 2); loop(0, 0, 1, 1); loop(1, 1, 2, 2);
    for (let k = 0; k < 3; k++) this.boatSpots.push({ x: (X + 6) * T, y: (56 + k * 4) * T, a: 0 });
    const add = (key, x, y, type, label, icon, extra) => { this.pois[key] = Object.assign({ key, x: x * T, y: y * T, type, label, icon }, extra || {}); };
    const B = (i, j) => pl.blocks.find(b => b.i === i && b.j === j);
    const door = (b, side, off = 0) => side === 'S' ? [b.x0 + b.w / 2 + off, b.y0 + b.h - 0.5] : side === 'N' ? [b.x0 + b.w / 2 + off, b.y0 + 0.5] : side === 'E' ? [b.x0 + b.w - 0.5, b.y0 + b.h / 2 + off] : [b.x0 + 0.5, b.y0 + b.h / 2 + off];
    add('airport_p', VX[0] + 13, ay + 3.5, 'airport', 'Paliparan ng Puerto Princesa', '✈️');
    add('kanor', VX[0] - 4, HY[0] + 6, 'npc', 'Mang Kanor', 'K');
    add('pp_kainan', ...door(B(0, 0), 'S'), 'kainan', 'Manukan sa Kanto (Palawan)', '🍗');
    add('pp_sari', ...door(B(1, 0), 'S'), 'sari', 'Tindahan ng Kasoy', '🥜');
    add('pp_hospital', ...door(B(0, 1), 'N'), 'hospital', 'Ospital ng Puerto Princesa', '🏥');
    add('pp_presinto', ...door(B(1, 1), 'N'), 'police', 'Presinto ng Puerto Princesa', '🚓');
    add('pp_church', ...door(B(1, 1), 'E'), 'church', 'Katedral ng Puerto Princesa', '⛪');
    add('pp_gun', ...door(B(0, 1), 'W'), 'gunshop', 'Armas ni Kabo (Palawan)', '🔫');
    add('lm_ilog', X + 12, 47.5, 'spot', 'Underground River', '🦇', { landmark: true });
    add('lm_elnido', X + 27, 29.5, 'spot', 'El Nido Lagoon', '🏝', { landmark: true });
    add('lm_baywalk_p', VX[2] + 6, HY[1] + 2, 'spot', 'Puerto Princesa Baywalk', '🌅', { landmark: true });
    for (const k of ['pp_kainan', 'pp_sari', 'pp_gun']) { const pp = this.pois[k], a = { kainan: ['#c0392b', 'MANUKAN'], sari: ['#8a5a2b', 'KASOY'], gunshop: ['#3b3b3b', 'ARMAS'] }[pp.type]; if (a) this.decor.push({ type: 'sign', x: pp.x, y: pp.y, color: a[0], text: a[1] }); }
  },
  makeLandmarks() {
    const add = (key, x, y, label, icon) => { this.pois[key] = { key, x, y, type: 'spot', label, icon, landmark: true }; };
    const [lx, ly, lw, lh] = this.blockRect(0, 4); add('lm_luneta', (lx + 9) * T, (ly + 8) * T, 'Rizal Park (Luneta)', '🗽');
    const [ix, iy] = this.blockRect(0, 2); add('lm_intra', (ix + 8) * T, (iy + 6) * T, 'Fort Santiago (Intramuros)', '🏰');
    add('lm_quiapo', this.door(6, 1, 'N').x, this.door(6, 1, 'N').y, 'Simbahan ng Quiapo', '⛪');
    add('lm_baywalk', (OX - 1.5) * T, this.cy(6), 'Baywalk (Paglubog ng Araw)', '🌅');
    for (const k of ['plaza', 'plazakrus', 'tops']) if (this.pois[k]) this.pois[k].landmark = true;
    // places you can walk into
    const ins = (key, pt, type, label, icon, sign, col) => { if (!pt) return; this.pois[key] = { key, x: pt.x, y: pt.y, type, label, icon }; this.decor.push({ type: 'sign', x: pt.x, y: pt.y, color: col, text: sign }); };
    const sdoor = (reg, i, j, side) => { const b = reg.blocks.find(q => q.i === i && q.j === j); if (!b) return null; const [x, y] = side === 'S' ? [b.x0 + b.w / 2 + 3, b.y0 + b.h - 0.5] : side === 'N' ? [b.x0 + b.w / 2 + 3, b.y0 + 0.5] : side === 'E' ? [b.x0 + b.w - 0.5, b.y0 + b.h / 2 + 3] : [b.x0 + 0.5, b.y0 + b.h / 2 + 3]; return { x: x * T, y: y * T }; };
    ins('kainan_m', this.door(3, 4, 'N', 3), 'kainan', 'Manukan sa Kanto', '🍗', 'MANUKAN', '#c0392b');
    ins('kainan_s', sdoor(this.sugbo, 2, 2, 'N'), 'kainan', 'Manukan sa Kanto (Cebu)', '🍗', 'MANUKAN', '#c0392b');
    ins('kainan_d', sdoor(this.dabaw, 0, 0, 'S'), 'kainan', 'Manukan sa Kanto (Davao)', '🍗', 'MANUKAN', '#c0392b');
    ins('mall_m', this.door(7, 6, 'N'), 'mall', 'Mall ng Bayan', '🏬', 'MALL', '#2c5aa0');
    ins('mall_s', sdoor(this.sugbo, 3, 1, 'W'), 'mall', 'IT Park Mall', '🏬', 'MALL', '#2c5aa0');
    ins('church_m', this.door(6, 1, 'W'), 'church', 'Simbahan ng Quiapo', '⛪', 'SIMBAHAN', '#7a6a58');
    ins('church_s', sdoor(this.sugbo, 2, 1, 'W'), 'church', 'Basilika sa Plaza Krus', '⛪', 'SIMBAHAN', '#7a6a58');
    ins('church_d', sdoor(this.dabaw, 1, 2, 'N'), 'church', 'Katedral ng Davao', '⛪', 'SIMBAHAN', '#7a6a58');
    if (this.prov) ins('church_p', { x: (this.prov.tcx + 0.5) * T, y: (this.prov.tcy - 4.5) * T }, 'church', 'Simbahan ng San Isidro', '⛪', 'SIMBAHAN', '#7a6a58');
  },
  // ---------- irregular coastline: noisy bays carved into open land along the sea, edges and straits ----------
  makeCoast() {
    const N = MW * MH, t = this.tiles, R = U.rng(777);
    // smooth value noise (2 octaves)
    const G1 = 14, gw = Math.ceil(MW / G1) + 2, gh = Math.ceil(MH / G1) + 2, grid = new Float32Array(gw * gh).map(() => R());
    const G2 = 5, gw2 = Math.ceil(MW / G2) + 2, gh2 = Math.ceil(MH / G2) + 2, grid2 = new Float32Array(gw2 * gh2).map(() => R());
    const vn = (gr, gwid, sc, x, y) => { const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, s1 = u * u * (3 - 2 * u), s2 = v * v * (3 - 2 * v);
      const a = gr[iy * gwid + ix], b = gr[iy * gwid + ix + 1], c = gr[(iy + 1) * gwid + ix], d = gr[(iy + 1) * gwid + ix + 1];
      return a + (b - a) * s1 + (c - a) * s2 + (a - b - c + d) * s1 * s2; };
    const depth = (x, y) => { const n = vn(grid, gw, G1, x, y) * 0.75 + vn(grid2, gw2, G2, x, y) * 0.25; return Math.max(0, (n - 0.24) * 38); };
    // protected: anything people use, plus a margin around it
    const KEEP = new Set([TL.ROAD, TL.SIDE, TL.PIER, TL.PLAZA, TL.LOT, TL.PROM, TL.WALL, TL.SAND, TL.DIRT]);
    const prot = new Uint8Array(N);
    const mark = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (x >= 0 && y >= 0 && x < MW && y < MH) prot[y * MW + x] = 1; };
    const nearRoad = (x, y) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (this.get(x + dx, y + dy) === TL.ROAD) return true; return false; };
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const v = t[y * MW + x]; if (KEEP.has(v) && (v !== TL.SIDE || nearRoad(x, y))) mark(x, y, v === TL.SIDE ? 1 : 2); }
    const pt = (o, r) => mark(Math.floor(o.x / T), Math.floor(o.y / T), r);
    for (const k in this.pois) pt(this.pois[k], 5);
    for (const a of [this.spots, this.tsinelas, this.lamps, this.courts, this.boatSpots]) for (const o of a) if (o && o.x != null) pt(o, 3);
    for (const d of this.decor) if (d.x != null) pt(d, 3);
    for (const b of this.buildings) if (b.kind && !/^(comm|resid|slum|china|towers|house|shop|hut|farm|warehouse|bld|market|container|stall|nipa|port)$/.test(b.kind)) mark(b.tx + (b.tw >> 1), b.ty + (b.th >> 1), Math.max(b.tw, b.th));
    const open = (i) => !prot[i] && (t[i] === TL.GRASS || t[i] === TL.TREE || t[i] === TL.BLD || t[i] === TL.ALLEY || t[i] === TL.PADDY || t[i] === TL.SIDE);
    // flood from the sea / map edge / straits through open land, carving while within the local depth
    const dist = new Int16Array(N).fill(-1), q = [];
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      if (t[i] === TL.WATER) { dist[i] = 0; q.push(i); }
      else if ((x === MW - 1 || y === 0 || y === MH - 1 || (x >= DABAW_END && x < BX0)) && open(i)) { dist[i] = 1; q.push(i); }
    }
    const carve = new Uint8Array(N);
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % MW, y = (i / MW) | 0;
      if (t[i] !== TL.WATER) { if (dist[i] > depth(x, y) && !(x >= DABAW_END && x < BX0)) continue; carve[i] = 1; }
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue; const j = ny * MW + nx; if (dist[j] < 0 && open(j)) { dist[j] = dist[i] + 1; q.push(j); } }
    }
    // buildings go only if the sea takes all of them
    for (const b of this.buildings) {
      let all = true, any = false;
      for (let y = b.ty; y < b.ty + b.th; y++) for (let x = b.tx; x < b.tx + b.tw; x++) { const c = carve[y * MW + x]; all = all && c; any = any || c; }
      if (!any) continue;
      const generic = !b.kind || /^(comm|resid|slum|china|towers|house|shop|hut|farm|warehouse|bld|market|container|stall|nipa|port)$/.test(b.kind);
      let cnt = 0; for (let y = b.ty; y < b.ty + b.th; y++) for (let x = b.tx; x < b.tx + b.tw; x++) cnt += carve[y * MW + x];
      if (generic && cnt * 3 >= b.tw * b.th) { all = true; for (let y = b.ty; y < b.ty + b.th; y++) for (let x = b.tx; x < b.tx + b.tw; x++) if (!prot[y * MW + x]) carve[y * MW + x] = 1; else all = false; }
      if (all) { b.gone = true; for (let y = b.ty; y < b.ty + b.th; y++) for (let x = b.tx; x < b.tx + b.tw; x++) this.bldAt[y * MW + x] = -1; }
      else for (let y = b.ty; y < b.ty + b.th; y++) for (let x = b.tx; x < b.tx + b.tw; x++) carve[y * MW + x] = 0;
    }
    for (let i = 0; i < N; i++) if (carve[i]) t[i] = TL.WATER;
    // beaches where the new shore meets grass
    for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
      const i = y * MW + x; if (t[i] !== TL.GRASS || prot[i]) continue;
      if (DIRS.some(([dx, dy]) => carve[(y + dy) * MW + x + dx]) && vn(grid2, gw2, G2, x * 1.7, y * 1.7) > 0.45) t[i] = TL.SAND;
    }
    this.buildings = this.buildings.filter(b => !b.gone);
    for (let i = 0; i < N; i++) this.bldAt[i] = -1;
    this.buildings.forEach((b, id) => { for (let y = b.ty; y < b.ty + b.th; y++) for (let x = b.tx; x < b.tx + b.tw; x++) this.bldAt[y * MW + x] = id; });
    const dry = (o) => this.get(Math.floor(o.x / T), Math.floor(o.y / T)) !== TL.WATER;
    this.trees = this.trees.filter(dry); this.lamps = this.lamps.filter(dry);
    this.decor = this.decor.filter(d => d.type === 'boat' || d.x == null || dry(d));
  },
  makeLabels() {
    const L = [['PANTALAN', 0, -0.5], ['TONDO', 1.5, 0], ['DIVISORIA', 3, -0.5], ['BINONDO', 4.5, 0], ['SAMPALOC', 7, -0.5], ['QUIAPO', 6, 1],
      ['INTRAMUROS', 0, 2.5], ['LUNETA', 0.5, 4], ['ERMITA', 1, 6], ['MALATE', 1, 7.5], ['STA. CRUZ', 3, 2], ['PACO', 4, 5.5],
      ['MAKATI', 7.3, 6.5], ['MANDALUYONG', 7.5, 3], ['PASAY', 3.5, 8], ['SAN ANDRES', 3, 4.5]];
    for (const [n, bi, bj] of L) {
      const i0 = Math.floor(bi), j0 = Math.floor(bj);
      const [x0, y0, w, h] = this.blockRect(i0, j0);
      const fx = bi - i0, fy = bj - j0;
      this.labels.push({ name: n, x: (x0 + w / 2) * T + fx * PER * T, y: (y0 + h / 2) * T + fy * PER * T });
    }
    if (this.prov) { this.labels.push({ name: 'SAN ISIDRO', x: (this.prov.tcx + 0.5) * T, y: (this.prov.tcy + 20) * T }, { name: 'HACIENDA SEVERO', x: (this.prov.tcx + 0.5) * T, y: 10 * T }, { name: 'PALAYAN', x: (this.prov.tcx + 0.5) * T, y: 150 * T }); }
    this.regions = [{ name: 'MANILA', x: this.cx(4), y: this.cy(4) }, { name: 'SAN ISIDRO', x: (this.prov.tcx + 0.5) * T, y: (this.prov.tcy + 6) * T }, { name: 'ISLA MALIGAYA', x: this.island.cx * T, y: this.island.cy * T }];
    if (this.sugbo) this.regions.push({ name: 'CEBU', x: (SX0 + 56) * T, y: 90 * T });
    if (this.dabaw) this.regions.push({ name: 'DAVAO', x: (DX0 + 50) * T, y: 100 * T });
    if (this.bagiw) this.regions.push({ name: 'BAGUIO', x: (BX0 + 50) * T, y: 90 * T });
    if (this.bora) this.regions.push({ name: 'BORACAY', x: (BRX0 + 32) * T, y: 100 * T });
    if (this.pal) this.regions.push({ name: 'PALAWAN', x: (PX0 + 50) * T, y: 100 * T });
    this.labels.push({ name: 'MANILA BAY', x: (OX - 8) * T, y: this.cy(5), vert: true });
    if (this.sugbo) {
      const sg = this.sugbo, bc = (i, j) => ({ x: (sg.VX[i] + RW + 9) * T, y: (sg.HY[j] + RW + 9) * T });
      for (const [n, i, j] of [['KOLON', 1, 1], ['PLAZA KRUS', 2, 1.75], ['IT PARK', 3, 0.5], ['MERKADO', 0, 0.3], ['LAHUG', 2, 2.6], ['MABOLO', 3, 4.6], ['PARDO', 0.5, 5.4], ['TEJERO', 1, 4]]) { const c = bc(Math.floor(i), Math.floor(j)); this.labels.push({ name: n, x: c.x + (i % 1) * 22 * T, y: c.y + (j % 1) * 22 * T }); }
      this.labels.push({ name: 'CEBU', x: (SX0 + 56) * T, y: 22 * T }, { name: 'BUSAY', x: (SX0 + 60) * T, y: 8 * T }, { name: 'PANTALAN NG CEBU', x: (SX0 + 7) * T, y: (sg.HY[2] + 4) * T, vert: true }, { name: 'PALIPARAN', x: (SX0 + 48) * T, y: (sg.HY[6] + 20) * T });
      if (this.dabaw) { const d = this.dabaw; this.labels.push({ name: 'DAVAO', x: (DX0 + 40) * T, y: (d.HY[0] - 3) * T }, { name: 'BUNDOK APO', x: (DX0 + 50) * T, y: 30 * T }, { name: 'SENTRO NG AGILA', x: (d.VX[3] + 14) * T, y: (d.HY[0] + 4) * T }, { name: 'SAGINGAN', x: (DX0 + 92) * T, y: (d.HY[3] + 12) * T }, { name: 'BANKEROHAN', x: (d.VX[1] + 13) * T, y: (d.HY[1] + 13) * T }, { name: 'KIPOT NG DAVAO', x: (SUGBO_END + STRAIT2_W / 2) * T, y: this.cy(6), vert: true }); }
      if (this.pal) { const b = this.pal; this.labels.push({ name: 'PUERTO PRINCESA', x: (b.VX[1] + 2) * T, y: (b.HY[0] - 5) * T }, { name: 'EL NIDO', x: (PX0 + 27) * T, y: 9 * T }, { name: 'SABANG', x: (PX0 + 14) * T, y: 62 * T }); }
      if (this.bora) { const b = this.bora; this.labels.push({ name: 'BORACAY', x: (b.VX[1] + 2) * T, y: (b.HY[0] - 6) * T }, { name: 'WHITE BEACH', x: (BRX0 + 17) * T, y: (b.HY[2] + 2) * T, vert: true }, { name: 'STATION 1', x: (b.VX[0] + 8) * T, y: (b.HY[0] + 12) * T }, { name: 'STATION 2', x: (b.VX[0] + 8) * T, y: (b.HY[1] + 14) * T }, { name: 'STATION 3', x: (b.VX[0] + 8) * T, y: (b.HY[3] + 12) * T }, { name: 'BULABOG', x: (b.VX[1] + 10) * T, y: (b.HY[2] + 14) * T }); }
      if (this.bagiw) { const b = this.bagiw; this.labels.push({ name: 'BAGUIO', x: (BX0 + 42) * T, y: (b.HY[0] - 4) * T }, { name: 'KALYE SESYON', x: (b.VX[1] + 2) * T, y: (b.HY[1] + 10) * T }, { name: 'LIWASANG BAGUIO', x: b.lake.x, y: b.lake.y - 9 * T }, { name: 'PRESAHAN', x: (BX0 + 11) * T, y: (b.HY[0] - 3) * T }, { name: 'MINES VIEW', x: (BX0 + 90) * T, y: 13 * T }, { name: 'KENNON', x: (BX0 + 48) * T, y: 152 * T }); }
      this.labels.push({ name: 'KIPOT NG CEBU', x: (PROV_END + STRAIT_W / 2) * T, y: this.cy(6), vert: true });
    }
    this.labels.push({ name: 'ISLA MALIGAYA', x: (this.island.cx + 5) * T, y: (this.island.cy - 38) * T });
  },

  // ---------- minimap image ----------
  makeMini() {
    const c = document.createElement('canvas'); c.width = MW; c.height = MH;
    const g = c.getContext('2d');
    const img = g.createImageData(MW, MH);
    const col = { 0: [22, 52, 84], 1: [98, 106, 128], 2: [64, 72, 90], 4: [40, 74, 52], 5: [70, 76, 92], 6: [96, 78, 56], 7: [96, 88, 76], 8: [44, 50, 64], 9: [36, 70, 46], 10: [80, 78, 88], 11: [52, 58, 74], 12: [138, 122, 86], 13: [52, 92, 46], 14: [112, 90, 60] };
    for (let i = 0; i < MW * MH; i++) {
      let c3;
      const t = this.tiles[i];
      if (t === TL.BLD) {
        const b = this.buildings[this.bldAt[i]];
        const h = U.shade(b.color, -0.15).replace('#', '');
        const n = parseInt(h, 16); c3 = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      } else c3 = col[t] || [40, 40, 40];
      img.data[i * 4] = c3[0]; img.data[i * 4 + 1] = c3[1]; img.data[i * 4 + 2] = c3[2]; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.mini = c;
  },

  // ---------- chunk rendering ----------
  CH: 512,
  getChunk(cx, cy, allowNew) {
    const key = cx + ',' + cy;
    let c = this.chunks.get(key);
    if (c) { this.chunks.delete(key); this.chunks.set(key, c); return c; }
    if (!allowNew) return null;
    c = this.renderChunk(cx, cy);
    this.chunks.set(key, c);
    if (this.chunks.size > (SETTINGS.quality === 'low' ? 30 : 44)) { const first = this.chunks.keys().next().value; this.chunks.delete(first); }
    return c;
  },
  // build chunks around a point ahead of time (during the flight / ferry fade), a couple per tick
  prewarm(x, y, ms = 1500) {
    const CS = this.CH, r = 2, todo = [];
    const cx0 = Math.floor(x / CS), cy0 = Math.floor(y / CS);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const cx = cx0 + dx, cy = cy0 + dy; if (cx >= 0 && cy >= 0 && cx * CS < WORLD_W && cy * CS < WORLD_H && !this.chunks.has(cx + ',' + cy)) todo.push([cx, cy, dx * dx + dy * dy]); }
    todo.sort((a, b) => a[2] - b[2]);
    const step = Math.max(1, Math.ceil(todo.length / (ms / 60)));
    const iv = setInterval(() => { for (let k = 0; k < step && todo.length; k++) { const [cx, cy] = todo.shift(); this.getChunk(cx, cy, true); } if (!todo.length) clearInterval(iv); }, 60);
  },
  // nearest walkable point (used when arriving by plane / ferry)
  safeNear(x, y) {
    for (const [dx, dy] of [[0, 0], [0, -40], [0, 40], [40, 0], [-40, 0], [0, -90], [60, -60], [-60, -60]]) { const px = x + dx, py = y + dy; if (py > T && py < WORLD_H - T && !this.solidAt(px, py)) return { x: px, y: py }; }
    return { x, y: Math.min(y, WORLD_H - 2 * T) };
  },
  renderChunk(cx, cy) {
    const S = this.CH, c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d');
    const ox = cx * S, oy = cy * S;
    g.translate(-ox, -oy);
    const tx0 = Math.floor(ox / T), ty0 = Math.floor(oy / T), n = S / T;
    // ground
    for (let ty = ty0 - 1; ty < ty0 + n + 1; ty++) for (let tx = tx0 - 1; tx < tx0 + n + 1; tx++) {
      const t = this.get(tx, ty); if (t === 255) { g.fillStyle = GROUND[0]; g.fillRect(tx * T, ty * T, T, T); continue; }
      const x = tx * T, y = ty * T;
      g.fillStyle = GROUND[t]; g.fillRect(x, y, T + 0.5, T + 0.5);
      const h = U.hash(tx, ty);
      if (t === TL.WATER) {
        g.strokeStyle = 'rgba(120,170,220,0.10)'; g.lineWidth = 2;
        if (h < 0.35) { g.beginPath(); g.moveTo(x + 4, y + 12 + h * 20); g.quadraticCurveTo(x + 12, y + 6 + h * 20, x + 22, y + 12 + h * 20); g.stroke(); }
        // shoreline foam
        for (let k = 0; k < 4; k++) {
          const nt = this.get(tx + DIRS[k][0], ty + DIRS[k][1]);
          if (nt === TL.SAND || nt === TL.TREE && tx < OX - 3) {
            g.fillStyle = 'rgba(200,225,240,0.22)';
            if (k === 0) g.fillRect(x + T - 5, y, 5, T); else if (k === 1) g.fillRect(x, y + T - 5, T, 5);
            else if (k === 2) g.fillRect(x, y, 5, T); else g.fillRect(x, y, T, 5);
          }
        }
      } else if (t === TL.PADDY) {
        g.fillStyle = 'rgba(120,180,90,0.16)'; for (let k = 4; k < T; k += 8) g.fillRect(x + 2, y + k, T - 4, 2);
        g.fillStyle = 'rgba(80,140,170,0.10)'; if (h < 0.3) g.fillRect(x + 4, y + 6, 10, 4);
      } else if (t === TL.DIRT) {
        g.fillStyle = 'rgba(0,0,0,0.12)'; if (h < 0.5) g.fillRect(x + h * 24, y + (1 - h) * 22, 4, 3);
        g.fillStyle = 'rgba(255,230,190,0.06)'; if (h > 0.6) g.fillRect(x + (1 - h) * 20, y + h * 18, 6, 2);
      } else if (t === TL.SAND) {
        g.fillStyle = 'rgba(255,240,200,0.08)'; if (h < 0.6) g.fillRect(x + h * 26, y + (1 - h) * 26, 2, 2);
        g.fillStyle = 'rgba(0,0,0,0.06)'; if (h > 0.5) g.fillRect(x + (1 - h) * 24, y + h * 20, 3, 2);
      } else if (t === TL.SIDE) {
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, y, 1, T); g.fillRect(x, y, T, 1);
        for (let k = 0; k < 4; k++) {
          const nt = this.get(tx + DIRS[k][0], ty + DIRS[k][1]);
          if (nt === TL.ROAD) {
            g.fillStyle = 'rgba(180,190,210,0.16)';
            if (k === 0) g.fillRect(x + T - 3, y, 3, T); else if (k === 1) g.fillRect(x, y + T - 3, T, 3);
            else if (k === 2) g.fillRect(x, y, 3, T); else g.fillRect(x, y, T, 3);
          }
        }
      } else if (t === TL.GRASS || t === TL.TREE) {
        if (h < 0.5) { g.fillStyle = 'rgba(90,140,80,0.12)'; g.fillRect(x + h * 24, y + (1 - h) * 24, 3, 3); }
      } else if (t === TL.PROM) {
        g.fillStyle = 'rgba(255,255,255,0.05)';
        if ((tx + ty) % 2 === 0) g.fillRect(x, y, T, T);
        if (tx === OX - 4 + 1 && true) { /* railing below */ }
      } else if (t === TL.PIER) {
        g.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 4; k++) g.fillRect(x, y + k * 8, T, 1);
      } else if (t === TL.PLAZA) {
        g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(x + 1, y + 1, T - 2, T - 2);
      } else if (t === TL.WALL) {
        g.fillStyle = '#5d564c'; g.fillRect(x, y, T, T);
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x + (ty % 2) * 16, y, 1, T); g.fillRect(x, y + 16, T, 1);
      }
    }
    // promenade railing
    if ((OX - 3) * T > ox && (OX - 3) * T < ox + S + 4) { g.fillStyle = 'rgba(200,200,210,0.35)'; g.fillRect((OX - 3) * T - 2, oy, 3, S); }
    // basketball courts
    for (const c of this.courts) {
      if (c.x > ox + S || c.x + c.w < ox || c.y > oy + S || c.y + c.h < oy) continue;
      const m = 6, x = c.x + m, y = c.y + m, w = c.w - m * 2, h = c.h - m * 2;
      g.fillStyle = '#7a4a32'; g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.strokeRect(x + 4, y + 4, w - 8, h - 8);
      g.beginPath();
      if (c.horiz) { g.moveTo(x + w / 2, y + 4); g.lineTo(x + w / 2, y + h - 4); } else { g.moveTo(x + 4, y + h / 2); g.lineTo(x + w - 4, y + h / 2); }
      g.stroke();
      g.beginPath(); g.arc(x + w / 2, y + h / 2, 16, 0, TAU); g.stroke();
      // keys + hoops
      for (const e of [0, 1]) {
        g.strokeStyle = 'rgba(255,255,255,0.45)';
        if (c.horiz) { const kx = e ? x + w - 4 - 34 : x + 4; g.strokeRect(kx, y + h / 2 - 18, 34, 36); }
        else { const ky = e ? y + h - 4 - 34 : y + 4; g.strokeRect(x + w / 2 - 18, ky, 36, 34); }
        const hx = c.horiz ? (e ? x + w - 10 : x + 10) : x + w / 2, hy = c.horiz ? y + h / 2 : (e ? y + h - 10 : y + 10);
        g.fillStyle = '#ddd'; g.fillRect(hx - (c.horiz ? 2 : 10), hy - (c.horiz ? 10 : 2), c.horiz ? 4 : 20, c.horiz ? 20 : 4);
        g.strokeStyle = '#e8641e'; g.lineWidth = 2.5; g.beginPath(); g.arc(hx + (c.horiz ? (e ? -7 : 7) : 0), hy + (c.horiz ? 0 : (e ? -7 : 7)), 5, 0, TAU); g.stroke();
      }
    }
    // road markings
    this.drawMarkings(g, ox, oy, S);
    // parking lines
    g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 2;
    for (const s of this.spots) {
      if (s.x < ox - 80 || s.x > ox + S + 80 || s.y < oy - 80 || s.y > oy + S + 80) continue;
      g.save(); g.translate(s.x, s.y); g.rotate(s.a);
      const L = s.type === 'bus' ? 80 : s.type === 'jeep' ? 56 : 40, Wd = s.type === 'bus' ? 32 : 24;
      g.beginPath(); g.moveTo(-L, -Wd); g.lineTo(L, -Wd); g.moveTo(-L, Wd); g.lineTo(L, Wd); g.stroke();
      g.restore();
    }
    // buildings (shadows first)
    const near = this.buildings.filter(b => b.x < ox + S + 20 && b.x + b.w > ox - 20 && b.y < oy + S + 20 && b.y + b.h > oy - 20);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (const b of near) { U.rr(g, b.x + 3 + 7, b.y + 3 + 9, b.w - 6, b.h - 6, 6); g.fill(); }
    for (const b of near) this.drawBuilding(g, b);
    // trees
    for (const tr of this.trees) {
      if (tr.x < ox - 40 || tr.x > ox + S + 40 || tr.y < oy - 40 || tr.y > oy + S + 40) continue;
      if (tr.palm) { this.drawPalm(g, tr.x, tr.y); continue; }
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(tr.x + 5, tr.y + 7, tr.r, 0, TAU); g.fill();
      g.fillStyle = '#2d5a3a'; g.beginPath(); g.arc(tr.x, tr.y, tr.r, 0, TAU); g.fill();
      g.fillStyle = '#3a6e48'; g.beginPath(); g.arc(tr.x - 3, tr.y - 3, tr.r * 0.6, 0, TAU); g.fill();
    }
    // palm trees on promenade
    for (let y = 3; y < MH; y += 5) {
      const px = (OX - 1.5) * T + 10, py = y * T + 10;
      if (py < oy - 40 || py > oy + S + 40 || px < ox - 40 || px > ox + S + 40) continue;
      this.drawPalm(g, px, py);
    }
    // decor
    for (const d of this.decor) this.drawDecor(g, d, ox, oy, S);
    return c;
  },
  drawPalm(g, x, y) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x + 6, y + 8, 16, 0, TAU); g.fill();
    g.strokeStyle = '#3f7a43'; g.lineWidth = 5; g.lineCap = 'round';
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18); g.stroke(); }
    g.fillStyle = '#6b4f2e'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
  },
  drawMarkings(g, ox, oy, S) {
    const inView = (x0, y0, x1, y1) => x1 > ox - 10 && x0 < ox + S + 10 && y1 > oy - 10 && y0 < oy + S + 10;
    const dashCol = 'rgba(214,200,160,0.55)';
    for (let i = 0; i < NR; i++) for (let j = 0; j < NR - 1; j++) {
      if (!this.vSeg[i][j]) continue;
      const cx = this.cx(i), top = (this.rsy(j) + RW) * T, bot = this.rsy(j + 1) * T, x0 = this.rs(i) * T;
      if (!inView(x0, top, x0 + RW * T, bot)) continue;
      this.drawCenter(g, cx, top + 34, cx, bot - 34, i === 4, dashCol);
      this.crosswalk(g, x0, top + 4, true); this.crosswalk(g, x0, bot - 26, true);
    }
    for (let j = 0; j < NR; j++) for (let i = 0; i < NR - 1; i++) {
      if (!this.hSeg[j][i]) continue;
      const cy = this.cy(j), l = (this.rs(i) + RW) * T, r = this.rs(i + 1) * T, y0 = this.rsy(j) * T;
      if (!inView(l, y0, r, y0 + RW * T)) continue;
      this.drawCenter(g, l + 34, cy, r - 34, cy, j === 4, dashCol);
      this.crosswalk(g, l + 4, y0, false); this.crosswalk(g, r - 26, y0, false);
    }
  },
  drawCenter(g, x0, y0, x1, y1, avenue, col) {
    if (avenue) {
      g.fillStyle = 'rgba(230,190,70,0.65)';
      if (x0 === x1) { g.fillRect(x0 - 5, y0, 3, y1 - y0); g.fillRect(x0 + 2, y0, 3, y1 - y0); }
      else { g.fillRect(x0, y0 - 5, x1 - x0, 3); g.fillRect(x0, y0 + 2, x1 - x0, 3); }
      return;
    }
    g.fillStyle = col;
    if (x0 === x1) for (let y = y0; y < y1; y += 40) g.fillRect(x0 - 1.5, y, 3, Math.min(22, y1 - y));
    else for (let x = x0; x < x1; x += 40) g.fillRect(x, y0 - 1.5, Math.min(22, x1 - x), 3);
  },
  crosswalk(g, x, y, vertRoad) {
    g.fillStyle = 'rgba(220,220,225,0.42)';
    if (vertRoad) for (let k = 0; k < 10; k++) g.fillRect(x + 6 + k * 12, y, 6, 22);
    else for (let k = 0; k < 10; k++) g.fillRect(x, y + 6 + k * 12, 22, 6);
  },
  drawBuilding(g, b) {
    const x = b.x + 3, y = b.y + 3, w = b.w - 6, h = b.h - 6;
    const R = U.rng(b.seed + 7);
    g.fillStyle = b.color; U.rr(g, x, y, w, h, b.kind === 'stall' ? 3 : 6); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 2; U.rr(g, x + 1, y + 1, w - 2, h - 2, 5); g.stroke();
    const dark = 'rgba(0,0,0,0.18)';
    switch (b.kind) {
      case 'slum': {
        g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1.5;
        const horiz = w > h;
        if (horiz) for (let yy = y + 5; yy < y + h - 2; yy += 5) { g.beginPath(); g.moveTo(x + 3, yy); g.lineTo(x + w - 3, yy); g.stroke(); }
        else for (let xx = x + 5; xx < x + w - 2; xx += 5) { g.beginPath(); g.moveTo(xx, y + 3); g.lineTo(xx, y + h - 3); g.stroke(); }
        if (R() < 0.4) { g.fillStyle = 'rgba(160,80,50,0.35)'; g.fillRect(x + R() * w * 0.5, y + R() * h * 0.5, w * 0.4, h * 0.3); }
        if (R() < 0.5) { g.fillStyle = '#e9c46a'; g.fillRect(x + 4 + R() * (w - 12), y + 4 + R() * (h - 12), 5, 5); }
        break;
      }
      case 'tower': {
        g.fillStyle = 'rgba(255,255,255,0.05)'; U.rr(g, x + 8, y + 8, w - 16, h - 16, 4); g.fill();
        g.fillStyle = dark; U.rr(g, x + w * 0.3, y + h * 0.3, w * 0.4, h * 0.4, 4); g.fill();
        g.fillStyle = 'rgba(140,200,255,0.35)';
        for (let k = 0; k < 4; k++) g.fillRect(x + 6 + R() * (w - 16), y + 6 + R() * (h - 16), 4, 4);
        g.fillStyle = '#f2c14e'; for (let k = 0; k < 2; k++) g.fillRect(x + 6 + R() * (w - 16), y + 6 + R() * (h - 16), 5, 5);
        if (R() < 0.3) { g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.15, 0, TAU); g.stroke(); }
        break;
      }
      case 'stall': {
        g.fillStyle = 'rgba(255,255,255,0.25)'; for (let xx = x + 4; xx < x + w; xx += 8) g.fillRect(xx, y + 2, 4, h - 4);
        break;
      }
      case 'container': {
        g.fillStyle = 'rgba(0,0,0,0.2)'; for (let xx = x + 4; xx < x + w - 2; xx += 6) g.fillRect(xx, y + 2, 2, h - 4);
        break;
      }
      case 'church': {
        g.fillStyle = 'rgba(255,255,255,0.08)'; U.rr(g, x + 6, y + 6, w - 12, h - 12, 4); g.fill();
        if (w < h) { g.fillStyle = '#e8d9a8'; g.fillRect(x + w / 2 - 3, y + 12, 6, 26); g.fillRect(x + w / 2 - 11, y + 20, 22, 6); }
        g.fillStyle = '#f2c14e'; g.fillRect(x + 6, y + h - 12, 5, 5); g.fillRect(x + w - 11, y + h - 12, 5, 5);
        break;
      }
      case 'hospital': {
        g.fillStyle = '#d43c3c'; const cx = x + w / 2, cy = y + h / 2;
        g.fillRect(cx - 7, cy - 22, 14, 44); g.fillRect(cx - 22, cy - 7, 44, 14);
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 10, y + 10, 30, 20); g.fillRect(x + w - 40, y + h - 30, 30, 20);
        break;
      }
      case 'police': {
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 6, y + 6, w - 12, 8);
        g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 10, 0, TAU); g.fill();
        g.fillStyle = '#3d5a8a'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 6, 0, TAU); g.fill();
        break;
      }
      case 'mansion': {
        g.fillStyle = '#a3372f'; U.rr(g, x + 6, y + 6, w - 12, h - 12, 4); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + 6, y + h / 2); g.lineTo(x + w - 6, y + h / 2); g.stroke();
        g.fillStyle = '#f2c14e'; g.fillRect(x + 12, y + 14, 6, 6); g.fillRect(x + w - 18, y + h - 20, 6, 6);
        break;
      }
      case 'fountain': {
        g.fillStyle = '#8fc6e8'; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2 - 6, 0, TAU); g.fill();
        g.fillStyle = '#dfe9ef'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 5, 0, TAU); g.fill();
        break;
      }
      case 'monument': {
        g.fillStyle = '#c9ced6'; g.fillRect(x + w / 2 - 8, y + h / 2 - 8, 16, 16);
        g.fillStyle = '#6d7480'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 5, 0, TAU); g.fill();
        break;
      }
      case 'bodega': {
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
        for (let xx = x + 12; xx < x + w; xx += 12) { g.beginPath(); g.moveTo(xx, y + 4); g.lineTo(xx, y + h - 4); g.stroke(); }
        g.fillStyle = '#c0392b'; g.fillRect(x + w / 2 - 30, y + h - 8, 60, 6);
        break;
      }
      case 'nipa': {
        g.strokeStyle = 'rgba(40,25,10,0.35)'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x + 2, y + h / 2); g.lineTo(x + w - 2, y + h / 2); g.stroke();
        for (let xx = x + 4; xx < x + w - 2; xx += 4) { g.beginPath(); g.moveTo(xx, y + 2); g.lineTo(xx + 2, y + h / 2); g.moveTo(xx, y + h - 2); g.lineTo(xx + 2, y + h / 2); g.stroke(); }
        if (R() < 0.6) { g.fillStyle = '#f2c14e'; g.fillRect(x + w - 10, y + h - 9, 4, 4); }
        break;
      }
      case 'lighthouse': {
        const cx = x + w / 2, cy = y + h / 2;
        g.fillStyle = '#c94a3a'; g.beginPath(); g.arc(cx, cy, w / 2 - 6, 0, TAU); g.fill();
        g.fillStyle = '#f4efe4'; g.beginPath(); g.arc(cx, cy, w / 2 - 14, 0, TAU); g.fill();
        g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(cx, cy, 6, 0, TAU); g.fill();
        break;
      }
      case 'resort': {
        g.fillStyle = '#5aa0c8'; U.rr(g, x + w * 0.55, y + 8, w * 0.38, h - 16, 6); g.fill();
        g.strokeStyle = 'rgba(40,25,10,0.3)'; g.lineWidth = 1.5;
        for (let yy = y + 6; yy < y + h - 4; yy += 5) { g.beginPath(); g.moveTo(x + 4, yy); g.lineTo(x + w * 0.5, yy); g.stroke(); }
        g.fillStyle = '#f2c14e'; g.fillRect(x + 8, y + h - 12, 5, 5);
        break;
      }
      default: {
        const n = 1 + Math.floor(R() * 3);
        g.fillStyle = dark;
        for (let k = 0; k < n; k++) {
          const ww = w * (0.18 + R() * 0.3), hh = h * (0.18 + R() * 0.3);
          U.rr(g, x + 6 + R() * (w - ww - 12), y + 6 + R() * (h - hh - 12), ww, hh, 3); g.fill();
        }
        if (b.kind === 'china') { g.fillStyle = 'rgba(230,180,60,0.35)'; g.fillRect(x + 3, y + 3, w - 6, 4); g.fillRect(x + 3, y + h - 7, w - 6, 4); }
        if (b.kind === 'intra') { g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1; for (let yy = y + 8; yy < y + h; yy += 8) { g.beginPath(); g.moveTo(x + 2, yy); g.lineTo(x + w - 2, yy); g.stroke(); } }
        g.fillStyle = '#f2c14e';
        const lights = Math.floor(R() * 3);
        for (let k = 0; k < lights; k++) g.fillRect(x + 6 + R() * (w - 18), y + 6 + R() * (h - 18), 6, 6);
      }
    }
  },
  drawDecor(g, d, ox, oy, S) {
    if (d.type === 'sign') {
      if (d.x < ox - 100 || d.x > ox + S + 100 || d.y < oy - 100 || d.y > oy + S + 100) return;
      // find adjacent building direction: awning drawn on block interior side of the door
      let ax = 0, ay = 0;
      for (let k = 0; k < 4; k++) { const t = this.tileAt(d.x + DIRS[k][0] * T * 1.5, d.y + DIRS[k][1] * T * 1.5); if (t === TL.BLD || t === TL.ALLEY || t === TL.PLAZA || t === TL.LOT) { ax = DIRS[k][0]; ay = DIRS[k][1]; if (t === TL.BLD) break; } }
      const cx = d.x + ax * 26, cy = d.y + ay * 26;
      g.save(); g.translate(cx, cy); if (ay === 0) g.rotate(Math.PI / 2);
      g.fillStyle = d.color; U.rr(g, -40, -9, 80, 18, 3); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.85)'; for (let k = -36; k < 40; k += 12) g.fillRect(k, -9, 6, 4);
      g.fillStyle = '#fff'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(d.text, 0, 2);
      g.restore();
    } else if (d.type === 'flags') {
      const minx = Math.min(d.x0, d.x1), maxx = Math.max(d.x0, d.x1), miny = Math.min(d.y0, d.y1), maxy = Math.max(d.y0, d.y1);
      if (maxx < ox - 20 || minx > ox + S + 20 || maxy < oy - 20 || miny > oy + S + 20) return;
      g.strokeStyle = 'rgba(220,220,220,0.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(d.x0, d.y0); g.lineTo(d.x1, d.y1); g.stroke();
      const len = Math.hypot(d.x1 - d.x0, d.y1 - d.y0), n = Math.floor(len / 12);
      const cols = PAL.stall;
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = U.lerp(d.x0, d.x1, t), y = U.lerp(d.y0, d.y1, t);
        g.fillStyle = cols[k % cols.length];
        g.beginPath();
        if (d.x0 === d.x1) { g.moveTo(x, y - 4); g.lineTo(x + 9, y); g.lineTo(x, y + 4); }
        else { g.moveTo(x - 4, y); g.lineTo(x, y + 9); g.lineTo(x + 4, y); }
        g.fill();
      }
    } else if (d.type === 'plane') {
      if (d.x < ox - 200 || d.x > ox + S + 200 || d.y < oy - 200 || d.y > oy + S + 200) return;
      g.save(); g.translate(d.x, d.y); g.rotate(d.a || 0);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(10, 14, 110, 18, 0, 0, TAU); g.fill();
      g.fillStyle = '#e9edf2'; g.beginPath(); g.moveTo(-90, 0); g.lineTo(80, -12); g.quadraticCurveTo(110, 0, 80, 12); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(10, -6); g.lineTo(-20, -70); g.lineTo(-38, -70); g.lineTo(-18, -6); g.closePath(); g.moveTo(10, 6); g.lineTo(-20, 70); g.lineTo(-38, 70); g.lineTo(-18, 6); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-70, -2); g.lineTo(-90, -28); g.lineTo(-98, -28); g.lineTo(-86, 0); g.lineTo(-98, 28); g.lineTo(-90, 28); g.lineTo(-70, 2); g.closePath(); g.fill();
      g.fillStyle = '#2c5aa0'; g.fillRect(-80, -2, 150, 4); g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(-86, 0); g.lineTo(-98, -28); g.lineTo(-92, -28); g.closePath(); g.fill();
      g.fillStyle = '#18202d'; for (let x = -60; x < 70; x += 10) { g.fillRect(x, -8, 4, 2); g.fillRect(x, 6, 4, 2); }
      g.restore();
    } else if (d.type === 'boat') {
      if (d.x < ox - 150 || d.x > ox + S + 150 || d.y < oy - 150 || d.y > oy + S + 150) return;
      g.save(); g.translate(d.x, d.y);
      g.fillStyle = 'rgba(0,0,0,0.3)'; U.rr(g, -66, -12, 140, 30, 14); g.fill();
      g.strokeStyle = '#c9b48a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-60, -20); g.lineTo(60, -20); g.moveTo(-60, 22); g.lineTo(60, 22); g.stroke();
      g.fillStyle = '#e8e2d0'; g.beginPath(); g.moveTo(-60, -10); g.lineTo(50, -10); g.lineTo(72, 0); g.lineTo(50, 10); g.lineTo(-60, 10); g.closePath(); g.fill();
      g.fillStyle = '#2e86c1'; g.fillRect(-55, -10, 100, 4); g.fillStyle = '#c0392b'; g.fillRect(-55, 6, 100, 4);
      g.fillStyle = '#d4ac0d'; g.fillRect(-30, -6, 40, 12);
      g.restore();
    }
  },

  // ---------- path finding (flow fields) ----------
  computeField(out, px, py, costTab) {
    out.fill(0xFFFF);
    let tx = Math.floor(px / T), ty = Math.floor(py / T);
    tx = U.clamp(tx, 0, MW - 1); ty = U.clamp(ty, 0, MH - 1);
    const tiles = this.tiles;
    const B = 8; const buckets = []; for (let i = 0; i < B; i++) buckets.push([]);
    let pending = 0;
    const seed = (x, y, d) => { if (x < 0 || y < 0 || x >= MW || y >= MH) return; const idx = y * MW + x; if (d < out[idx]) { out[idx] = d; buckets[d % B].push(idx); pending++; } };
    if (costTab[tiles[ty * MW + tx]]) seed(tx, ty, 0);
    else for (let r = 1; r <= 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x >= 0 && y >= 0 && x < MW && y < MH && costTab[tiles[y * MW + x]]) seed(x, y, Math.abs(dx) + Math.abs(dy));
    }
    let cur = 0, guard = 0;
    while (pending > 0 && guard < 200000) {
      const bk = buckets[cur % B];
      while (bk.length) {
        const idx = bk.pop(); pending--;
        const d = out[idx]; if (d !== cur) continue;
        const x = idx % MW, y = (idx / MW) | 0;
        if (x > 0) this._relax(out, idx - 1, d, costTab, buckets, B) && pending++;
        if (x < MW - 1) this._relax(out, idx + 1, d, costTab, buckets, B) && pending++;
        if (y > 0) this._relax(out, idx - MW, d, costTab, buckets, B) && pending++;
        if (y < MH - 1) this._relax(out, idx + MW, d, costTab, buckets, B) && pending++;
      }
      cur++; guard++;
    }
  },
  _relax(out, n, d, costTab, buckets, B) {
    const c = costTab[this.tiles[n]]; if (!c) return false;
    const nd = d + c;
    if (nd < out[n]) { out[n] = nd; buckets[nd % B].push(n); return true; }
    return false;
  },
  fieldNext(field, px, py, steps) {
    let tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return null;
    if (field[ty * MW + tx] === 0xFFFF) {
      // find nearest reachable neighbour
      let best = null, bv = 0xFFFF;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
        const v = field[y * MW + x]; if (v < bv) { bv = v; best = [x, y]; }
      }
      if (!best) return null;
      return { x: (best[0] + 0.5) * T, y: (best[1] + 0.5) * T, d: bv };
    }
    for (let s = 0; s < steps; s++) {
      const cur = field[ty * MW + tx]; if (cur === 0) break;
      let bx = tx, by = ty, bv = cur;
      for (let k = 0; k < 8; k++) {
        const dx = k < 4 ? DIRS[k][0] : (k === 4 || k === 7 ? 1 : -1);
        const dy = k < 4 ? DIRS[k][1] : (k === 4 || k === 5 ? 1 : -1);
        const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
        if (k >= 4 && (field[ty * MW + x] === 0xFFFF || field[y * MW + tx] === 0xFFFF)) continue;
        const v = field[y * MW + x] + (k >= 4 ? 0.4 : 0);
        if (v < bv) { bv = v; bx = x; by = y; }
      }
      if (bx === tx && by === ty) break;
      tx = bx; ty = by;
    }
    return { x: (tx + 0.5) * T, y: (ty + 0.5) * T, d: field[ty * MW + tx] };
  },
  pathFrom(field, px, py, maxSteps = 600) {
    const pts = [];
    let tx = Math.floor(px / T), ty = Math.floor(py / T);
    for (let s = 0; s < maxSteps; s++) {
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) break;
      pts.push([tx, ty]);
      const cur = field[ty * MW + tx]; if (cur === 0 || cur === 0xFFFF) break;
      let bx = tx, by = ty, bv = cur;
      for (let k = 0; k < 4; k++) {
        const x = tx + DIRS[k][0], y = ty + DIRS[k][1]; if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
        const v = field[y * MW + x]; if (v < bv) { bv = v; bx = x; by = y; }
      }
      if (bx === tx && by === ty) break;
      tx = bx; ty = by;
    }
    return pts;
  },
  los(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 14);
    for (let k = 1; k < n; k++) {
      const t = this.tileAt(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n);
      if (t === TL.BLD || t === TL.WALL || t === 255) return false;
    }
    return true;
  },
  nearestNode(px, py) {
    let best = null, bd = 1e18;
    for (let i = 0; i < NR; i++) for (let j = 0; j < NR; j++) {
      if (!this.nodeExists(i, j)) continue;
      const d = U.d2(px, py, this.cx(i), this.cy(j));
      if (d < bd) { bd = d; best = [i, j]; }
    }
    return best;
  },
};
