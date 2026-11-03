/* Browser check for the Three.js cabin (?cabin=3d). Drives real pointer,
   wheel and keyboard input through Chrome and checks the game state after
   each step: lamp, lantern, answering a beacon, breath + finger drawing on the
   glass at rest / panned / zoomed / portrait, keyboard focus, reduced motion,
   and a round trip to the ring and back.

   The drawing checks are exact: each pointer event is dispatched and the
   recorded stroke point is projected back to the screen in the same
   synchronous step, so the reported error is the mapping alone.

   Needs a running dev server and puppeteer-core, which is not a dependency:
     npm run dev -- --port 8123
     npm i --no-save puppeteer-core
     node tools/cabin3d-check.mjs [screenshot-dir]
   CHROME and URL override the browser path and the server. */
import puppeteer from 'puppeteer-core';
const OUT = process.argv[2] || '.';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
const logs = [];
page.on('console', m => { if (['error', 'warn', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.goto((process.env.URL || 'http://localhost:8123/') + '?cabin=3d', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => !document.querySelector('#boardMute').disabled, { timeout: 15000 });
await page.click('#boardMute');
await page.waitForFunction(() => window.__cabin3d, { timeout: 15000 });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(1800);

let pass = 0, fail = 0;
const ok = (c, msg) => { (c ? pass++ : fail++); console.log((c ? 'PASS ' : 'FAIL ') + msg); };
const st = () => page.evaluate(() => window.__cabin3d.state());
const clientOf = (X, Y) => page.evaluate((X, Y) => { const r = document.querySelector('#scene').getBoundingClientRect(), d = window.__cabin3d; return { x: r.left + X/d.CW()*r.width, y: r.top + Y/d.CH()*r.height }; }, X, Y);
const hitPos = async key => { const hs = await page.evaluate(() => window.__cabin3d.hits()); const h = hs.find(h => h.key === key || h.act === key); return h ? clientOf(h.X, h.Y) : null; };
const glassClient = async (dx, dy) => { const p = await page.evaluate((a, b) => window.__cabin3d.glassToScreen(a, b), dx, dy); return clientOf(p.X, p.Y); };
const shot = name => page.screenshot({ path: `${OUT}/${name}.png` });
const ACT_AT = async (x, y) => page.evaluate((x, y) => { const r = document.querySelector('#scene').getBoundingClientRect(), d = window.__cabin3d; const h = d.pickAt((x - r.left)/r.width*d.CW(), (y - r.top)/r.height*d.CH()); return h ? h.h.act : null; }, x, y);

await shot('01-start');

/* 1. the lamp: two pulls, bright -> half -> off */
let s0 = await st();
for (let i = 0; i < 2; i++){ const p = await hitPos('lamp'); await page.mouse.click(p.x, p.y); await wait(250); }
let s1 = await st();
ok(s1.lamp === (s0.lamp + 2) % 3, `lamp pulled twice: ${s0.lamp} -> ${s1.lamp}`);
await wait(1500); await shot('02-lamp-off');

/* 2. the lantern changes colour */
{ const p = await hitPos('cab:lantern'); const a = (await st()).colorIdx; await page.mouse.click(p.x, p.y); await wait(200); const b = (await st()).colorIdx; ok(b === (a + 1) % 3, `lantern colour ${a} -> ${b}`); }

/* 3. fog + finger drawing, with every stroke point checked against where the pointer was */
async function strokeTest(label, start, pts, hold){
  const p0 = await glassClient(start[0], start[1]);
  ok(await ACT_AT(p0.x, p0.y) === 'cab:glass:left', `${label}: pointer on the left glass`);
  await page.mouse.move(p0.x, p0.y); await page.mouse.down();
  if (hold){ await wait(1400); const s = await st(); const b = s.breaths[s.breaths.length - 1];
    ok(b && Math.hypot(b.x - start[0], b.y - start[1]) < 3 && b.r > 80, `${label}: breath at (${b && b.x.toFixed(1)}, ${b && b.y.toFixed(1)}) r=${b && b.r.toFixed(0)}, wanted (${start})`); }
  const n0 = (await st()).strokes.length;
  /* the cabin records a point only after 4 units of travel, so measure each
     recorded point against the path the pointer actually took */
  const trail = [start];
  for (const [dx, dy] of pts){
    const p = await glassClient(dx, dy); await page.mouse.move(p.x, p.y, { steps: 3 }); await wait(30); trail.push([dx, dy]);
  }
  await page.mouse.up(); await wait(100);
  const s = await st();
  const seg = (q, a, b) => { const vx = b[0]-a[0], vy = b[1]-a[1], L = vx*vx + vy*vy || 1, t = Math.max(0, Math.min(1, ((q[0]-a[0])*vx + (q[1]-a[1])*vy)/L)); return Math.hypot(q[0]-a[0]-t*vx, q[1]-a[1]-t*vy); };
  const sk = s.strokes[s.strokes.length - 1] || [];
  const worst = Math.max(0, ...sk.map(q => Math.min(...trail.slice(1).map((b, i) => seg(q, trail[i], b)))));
  /* exact check: dispatch each move and re-project the recorded point in the
     same synchronous step, so camera drift cannot enter the measurement */
  const sync = await page.evaluate(async (pts) => {
    const d = window.__cabin3d, cv = document.querySelector('#scene'), r = cv.getBoundingClientRect();
    const toClient = (dx, dy) => { const p = d.glassToScreen(dx, dy); return { x: r.left + p.X/d.CW()*r.width, y: r.top + p.Y/d.CH()*r.height }; };
    const ev = (type, c) => cv.dispatchEvent(new PointerEvent(type, { clientX: c.x, clientY: c.y, pointerId: 9, pointerType: 'pen', button: 0, buttons: 1, bubbles: true, isPrimary: true }));
    ev('pointerdown', toClient(...pts[0]));
    let worst = 0, n = 0;
    for (const [dx, dy] of pts.slice(1)){
      const c = toClient(dx, dy), before = (d.state().strokes.at(-1) || []).length, nS = d.state().strokes.length;
      ev('pointermove', c);
      const st = d.state(), sk = st.strokes.at(-1) || [];
      if (st.strokes.length > nS || sk.length > before){ const q = sk.at(-1), b = d.glassToScreen(q[0], q[1]);
        worst = Math.max(worst, Math.hypot(r.left + b.X/d.CW()*r.width - c.x, r.top + b.Y/d.CH()*r.height - c.y)); n++; }
      await new Promise(res => requestAnimationFrame(res));
    }
    ev('pointerup', toClient(...pts.at(-1)));
    return { worst, n, scale: r.width/d.CW() };
  }, [start, ...pts.map(([x, y]) => [start[0] + (x - start[0])*.6 + 6, start[1] + (y - start[1])*.6 + 4])]);
  ok(sync.n > 4 && sync.worst < .5, `${label}: exact, ${sync.n} points, worst ${sync.worst.toFixed(3)} CSS px between pointer and stroke`);
  ok(s.strokes.length > n0, `${label}: a stroke was drawn (${s.strokes.length - n0} new, ${s.strokes[s.strokes.length - 1]?.length} points)`);
  ok(worst < 3, `${label}: real mouse, worst distance from pointer path ${worst.toFixed(2)} design units (glass is 534 wide)`);
}
const path = (cx, cy, r) => Array.from({ length: 14 }, (_, i) => [cx + Math.cos(i/13*Math.PI*1.6)*r, cy + Math.sin(i/13*Math.PI*1.6)*r*.6]);
await strokeTest('rest', [440, 330], path(440, 330, 60), true);
await shot('03-drawn');

/* 4. answer a beacon: wait for one behind glass, set the lantern to it, tap it */
{
  let b = null; for (let i = 0; i < 60 && !b; i++){ const s = await st(); b = s.beacons.find(x => !x.answered && x.win); if (!b) await wait(500); }
  ok(!!b, `a beacon drifted into a window (${b && b.color}, ${b && b.win})`);
  if (b){
    const ORDER = ['amber', 'teal', 'rose'];
    for (let i = 0; i < 3 && ORDER[(await st()).colorIdx] !== b.color; i++){ const p = await hitPos('cab:lantern'); await page.mouse.click(p.x, p.y); await wait(150); }
    const before = (await st()).bulbs.length;
    const s = await st(), bb = s.beacons.find(x => x.color === b.color && !x.answered && x.win);
    const sp = await page.evaluate((x, y) => window.__cabin3d.skyToScreen(x, y), bb.x, bb.y); const c = await clientOf(sp.X, sp.Y);
    ok(await ACT_AT(c.x, c.y) === 'cab:glass:' + bb.win, `beacon tap lands on ${bb.win} glass`);
    await page.mouse.click(c.x, c.y); await wait(1700);
    const after = await st();
    ok(after.bulbs.length === before + 1 || (before === 12 && after.bulbs.length === 12), `beacon answered: bulbs ${before} -> ${after.bulbs.length}, answered ${JSON.stringify(after.answered)}`);
    await shot('04-answered');
  }
}

/* 5. drag the empty background: the camera swings, nothing else happens */
{
  let from = null;
  for (const [fx, fy] of [[.5, .07], [.3, .06], [.7, .06], [.5, .12]]){ const x = 1280*fx, y = 720*fy; if (!(await ACT_AT(x, y))){ from = { x, y }; break; } }
  ok(!!from, `found empty background at ${from && from.x},${from && from.y}`);
  const before = await st();
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(from.x + 220, from.y + 60, { steps: 12 }); await page.mouse.up();
  await wait(1200);
  const s = await st();
  ok(s.cam.tpanX > 100 && s.cam.tpanY > 20 && s.lamp === before.lamp && s.strokes.length === before.strokes.length, `view drag moved the camera only: tpan ${s.cam.tpanX.toFixed(0)},${s.cam.tpanY.toFixed(0)}`);
  await shot('05-panned');
  await strokeTest('panned', [420, 350], path(420, 350, 45), false);
}

/* 6. zoom in with the wheel and draw again */
{
  const p = await glassClient(440, 330);
  await page.mouse.move(640, 300); await page.mouse.wheel({ deltaY: -700 }); await wait(1600);
  const s = await st(); ok(s.cam.user > 1.5, `wheel zoom: user ${s.cam.user.toFixed(2)}`);
  await shot('06-zoomed');
  await strokeTest('zoomed', [450, 340], path(450, 340, 40), true);
  void p;
}

/* 7. keyboard: Tab to the lamp cord, Enter pulls it */
{
  await page.focus('#scene');
  const a = (await st()).lamp; let found = false;
  for (let i = 0; i < 20 && !found; i++){ await page.keyboard.press('Tab'); await wait(60); found = (await st()).focusKey === 'lamp'; }
  ok(found, 'Tab reaches the lamp cord');
  await shot('07-focus');
  await page.keyboard.press('Enter'); await wait(200);
  ok((await st()).lamp === (a + 1) % 3, 'Enter pulls the lamp cord');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await wait(1200);
  const s = await st(); ok(Math.abs(s.cam.tpanX) < 1 && s.cam.tuser < 1.01, `Escape resets the view (${s.cam.tpanX.toFixed(1)}, ${s.cam.tuser.toFixed(2)})`);
  await page.keyboard.press('ArrowLeft'); await wait(100); ok((await st()).cam.tpanX > 50, 'ArrowLeft swings the view');
}

/* 8. portrait: resize, then draw again */
{
  await page.setViewport({ width: 600, height: 900, deviceScaleFactor: 1 }); await wait(1500);
  await page.keyboard.press('0'); await wait(1200);
  await shot('08-portrait');
  await strokeTest('portrait', [500, 320], path(500, 320, 45), true);
  await shot('09-portrait-drawn');
}
/* 9. reduced motion, hints, and a round trip to the ring and back */
{
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 }); await wait(800);
  await page.click('#bSettings'); await wait(200); await page.click('#sMotion'); await wait(100); await page.click('#settingsClose'); await wait(300);
  ok((await st()).reduced === true, 'reduced motion switched on from settings');
  await page.click('#bHints'); await wait(700); await shot('10-hints');
  const n = await page.evaluate(() => document.querySelectorAll('#hints .hint').length); ok(n >= 8, `hint overlay lists ${n} touchable things`);
  await wait(5000);
  await page.click('#back'); await wait(1400);
  const vis = await page.evaluate(() => getComputedStyle(document.querySelector('#scene3d')).visibility);
  ok((await st()).room === 'corridor' && vis === 'hidden', `back to the ring: room ${(await st()).room}, 3D canvas ${vis}`);
  await shot('11-corridor');
  let door = null;
  for (let i = 0; i < 4 && (await st()).room !== 'cabin'; i++){
    await wait(1200); door = await hitPos('go:cabin'); if (door){ await page.mouse.click(door.x, door.y); await wait(1600); }
  }
  ok(!!door, 'cabin door found on the ring');
  const vis2 = await page.evaluate(() => getComputedStyle(document.querySelector('#scene3d')).visibility);
  ok((await st()).room === "cabin" && vis2 === "visible", `back into the cabin: room ${(await st()).room}, 3D canvas ${vis2}`);
  const s = await st(); ok(s.bulbs.length >= 1, `the answered bulb is still on the string after the round trip (${s.bulbs.length})`);
  await shot('12-return');
}
console.log(`\n${pass} passed, ${fail} failed`);
console.log(logs.length ? logs.join('\n') : 'no console errors');
await browser.close();
process.exitCode = fail ? 1 : 0;
