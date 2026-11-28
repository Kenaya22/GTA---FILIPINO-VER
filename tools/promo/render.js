const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const D = __dirname + '/';
(async () => {
  const V2 = process.env.V2 === '1'; const TL = JSON.parse(fs.readFileSync(D + (V2 ? 'timeline2.json' : 'timeline.json')));
  const counts = {}; for (const c of (V2 ? TL.segs.map(s => [s.name]).filter(c => fs.existsSync(D + 'clips/' + c[0])) : TL.clips)) counts[c[0]] = fs.readdirSync(D + 'clips/' + c[0]).length;
  const html = fs.readFileSync(D + (V2 ? 'comp2.html' : 'comp.html'), 'utf8').replace('__TL__', JSON.stringify(TL)).replace("'__CLIPS__'", JSON.stringify('file://' + D + 'clips/')).replace('__COUNTS__', JSON.stringify(counts));
  fs.writeFileSync(D + 'comp_built.html', html);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + D + 'comp_built.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  const test = process.argv[2] === 'test';
  const times = test ? process.argv.slice(3).map(Number) : null;
  const out = D + (test ? 'test/' : (V2 ? 'frames2/' : 'frames/')); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
  const N = Math.round(TL.end * TL.fps);
  const list = test ? times : Array.from({ length: N }, (_, i) => i / TL.fps);
  let i = 0;
  for (const t of list) {
    await p.evaluate((t) => render(t), t);
    await p.screenshot({ path: out + (test ? `t_${t}.jpg` : String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 });
    i++; if (!test && i % 150 === 0) console.log('frame', i, '/', N);
  }
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
