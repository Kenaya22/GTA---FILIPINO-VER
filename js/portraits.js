'use strict';
// ===== Character portraits for dialogue (drawn procedurally from each character's look) =====
const PORTRAIT = {
  cache: {},
  extras: {
    'Tito Boy': { mustache: true, towel: true }, 'Mang Ben': { mustache: true, beard: true }, 'Boss Tikboy': { shades: true, chain: true },
    'Lola Isyang': { wrinkles: true, bun: true }, 'Don Severo': { mustache: true, shades: true, chain: true }, 'Kapitana Luz': { earrings: true },
    'Aling Nena': { earrings: true, curlers: true }, 'Kuya Paeng': { shades: false, earrings: false }, 'Mang Kanor (kiskisan)': { mustache: true, wrinkles: true },
  },
  lookFor(name) {
    const base = name.replace(/\s*\(.*\)\s*$/, '').trim();
    if (base === N || base === 'Nonoy') return { look: G.player ? G.player.look : null, base: 'Nonoy' };
    for (const k in CHARS) if (CHARS[k].name === base) return { look: CHARS[k].look, base };
    if (/Balita|TV|News/i.test(base)) return { tv: true, base };
    // generic townsfolk: stable look from the name
    const R = U.rng([...base].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
    return { base, look: { skin: U.pick(SKINS, R), shirt: U.pick(['#c0392b', '#2e86c1', '#27ae60', '#e67e22', '#8e44ad', '#6b7280'], R), hair: U.pick(['short', 'long', 'curly', 'cap_red', 'bucket', 'buzz'], R), hairCol: U.pick(HAIR_COLS, R) } };
  },
  get(name) {
    const info = this.lookFor(name);
    const key = info.base + '|' + JSON.stringify(info.look || 'tv');
    if (this.cache[key]) return this.cache[key];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    this.draw(c.getContext('2d'), info, this.extras[info.base] || {});
    return (this.cache[key] = c.toDataURL());
  },
  draw(g, info, ex) {
    const S = 128, cx = 64;
    g.fillStyle = '#2a3350'; g.beginPath(); g.arc(cx, cx, 64, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.arc(cx, 40, 50, 0, TAU); g.fill();
    if (info.tv) {
      g.fillStyle = '#1a1f2c'; U.rr(g, 22, 30, 84, 62, 10); g.fill(); g.fillStyle = '#5aa0c8'; U.rr(g, 30, 37, 68, 48, 6); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText('BALITA', cx, 66);
      g.strokeStyle = '#1a1f2c'; g.lineWidth = 4; g.beginPath(); g.moveTo(50, 30); g.lineTo(40, 16); g.moveTo(78, 30); g.lineTo(88, 16); g.stroke();
      return;
    }
    const L = info.look || {}, skin = L.skin || '#c68b59', hair = L.hairCol || '#1b1410', grey = ex.wrinkles ? '#cfcfcf' : hair;
    g.save(); g.beginPath(); g.arc(cx, cx, 64, 0, TAU); g.clip();
    // shoulders / shirt
    g.fillStyle = L.shirt || '#888'; g.beginPath(); g.ellipse(cx, 132, 54, 40, 0, 0, TAU); g.fill();
    if (L.pat === 'floral') { g.fillStyle = 'rgba(255,255,255,0.8)'; for (const [x, y] of [[40, 108], [86, 112], [60, 122], [96, 124], [28, 124]]) { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); } }
    if (L.pat === 'stripe') { g.fillStyle = 'rgba(255,255,255,0.35)'; for (let y = 100; y < 128; y += 7) g.fillRect(10, y, 108, 3); }
    if (L.pat === 'barong') { g.strokeStyle = 'rgba(140,120,80,0.45)'; g.lineWidth = 1; for (let x = 40; x < 90; x += 5) { g.beginPath(); g.moveTo(x, 100); g.lineTo(x, 128); g.stroke(); } }
    if (L.pat === 'sando') { g.fillStyle = skin; g.beginPath(); g.ellipse(26, 116, 12, 18, -0.3, 0, TAU); g.ellipse(102, 116, 12, 18, 0.3, 0, TAU); g.fill(); }
    if (L.pat === 'jersey') { g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText('23', cx, 124); }
    if (ex.towel) { g.fillStyle = '#f4efe4'; g.beginPath(); g.ellipse(cx - 26, 100, 14, 8, -0.5, 0, TAU); g.fill(); }
    if (ex.chain) { g.strokeStyle = '#f2c14e'; g.lineWidth = 3; g.beginPath(); g.arc(cx, 92, 20, 0.3, Math.PI - 0.3); g.stroke(); }
    // neck & head
    g.fillStyle = U.shade(skin, -0.12); g.fillRect(cx - 11, 74, 22, 22);
    if (L.hair === 'long' || ex.bun === false) { g.fillStyle = grey; g.beginPath(); g.ellipse(cx, 62, 34, 40, 0, 0, TAU); g.fill(); }
    g.fillStyle = skin; g.beginPath(); g.ellipse(cx, 56, 27, 31, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(cx - 27, 58, 5, 8, 0, 0, TAU); g.ellipse(cx + 27, 58, 5, 8, 0, 0, TAU); g.fill();
    if (ex.earrings) { g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(cx - 27, 68, 3, 0, TAU); g.arc(cx + 27, 68, 3, 0, TAU); g.fill(); }
    // hair / hats
    g.fillStyle = grey;
    const h = L.hair;
    if (h === 'short' || h === 'buzz' || !h) { g.globalAlpha = h === 'buzz' ? 0.6 : 1; g.beginPath(); g.ellipse(cx, 36, 28, 16, 0, Math.PI, TAU); g.fill(); g.fillRect(cx - 28, 34, 56, 6); g.globalAlpha = 1; }
    else if (h === 'long') { g.beginPath(); g.ellipse(cx, 36, 30, 18, 0, Math.PI, TAU); g.fill(); g.beginPath(); g.ellipse(cx - 12, 36, 18, 9, 0.4, 0, TAU); g.fill(); }
    else if (h === 'curly') { for (let k = 0; k < 9; k++) { const a = Math.PI + k * Math.PI / 8; g.beginPath(); g.arc(cx + Math.cos(a) * 26, 44 + Math.sin(a) * 20, 9, 0, TAU); g.fill(); } }
    else if (h === 'mohawk') { g.fillStyle = hair; g.fillRect(cx - 7, 12, 14, 28); }
    else if (h === 'bald') { g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(cx - 8, 34, 9, 5, -0.3, 0, TAU); g.fill(); }
    else if (h === 'cap_red' || h === 'cap_blue' || h === 'copcap') {
      g.fillStyle = h === 'cap_red' ? '#c0392b' : h === 'cap_blue' ? '#2e6fd1' : '#14203d';
      g.beginPath(); g.ellipse(cx, 36, 30, 20, 0, Math.PI, TAU); g.fill(); g.fillRect(cx - 30, 33, 60, 6);
      g.beginPath(); g.ellipse(cx + 4, 39, 30, 6, 0, 0, Math.PI); g.fill();
    } else if (h === 'bucket') { g.fillStyle = '#c9b48a'; g.beginPath(); g.ellipse(cx, 38, 40, 9, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(cx, 32, 26, 18, 0, Math.PI, TAU); g.fill(); }
    if (ex.bun) { g.fillStyle = grey; g.beginPath(); g.arc(cx, 20, 10, 0, TAU); g.fill(); }
    if (ex.curlers) { g.fillStyle = '#ff6fa8'; for (const x of [-16, 0, 16]) { g.beginPath(); g.ellipse(cx + x, 26, 6, 4, 0, 0, TAU); g.fill(); } }
    // face
    if (ex.shades) { g.fillStyle = '#111'; U.rr(g, cx - 22, 50, 18, 10, 4); g.fill(); U.rr(g, cx + 4, 50, 18, 10, 4); g.fill(); g.fillRect(cx - 4, 53, 8, 3); }
    else {
      g.fillStyle = '#1b1410'; g.beginPath(); g.ellipse(cx - 11, 55, 3.2, 4, 0, 0, TAU); g.ellipse(cx + 11, 55, 3.2, 4, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - 10, 54, 1.2, 0, TAU); g.arc(cx + 12, 54, 1.2, 0, TAU); g.fill();
      g.strokeStyle = grey; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 17, 46); g.lineTo(cx - 6, 45); g.moveTo(cx + 6, 45); g.lineTo(cx + 17, 46); g.stroke();
    }
    if (ex.wrinkles) { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 22, 62); g.lineTo(cx - 17, 64); g.moveTo(cx + 22, 62); g.lineTo(cx + 17, 64); g.stroke(); }
    g.fillStyle = U.shade(skin, -0.2); g.beginPath(); g.ellipse(cx, 64, 4, 3, 0, 0, TAU); g.fill();
    if (ex.mustache) { g.fillStyle = grey; g.beginPath(); g.ellipse(cx - 7, 71, 8, 3.5, 0.15, 0, TAU); g.ellipse(cx + 7, 71, 8, 3.5, -0.15, 0, TAU); g.fill(); }
    if (ex.beard) { g.fillStyle = grey; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(cx, 80, 18, 8, 0, 0, Math.PI); g.fill(); g.globalAlpha = 1; }
    g.strokeStyle = '#7a3b2e'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(cx, 72, 9, 0.25, Math.PI - 0.25); g.stroke();
    g.fillStyle = 'rgba(255,120,120,0.18)'; g.beginPath(); g.arc(cx - 18, 66, 6, 0, TAU); g.arc(cx + 18, 66, 6, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cx, 62, 0, TAU); g.stroke();
  },
};
