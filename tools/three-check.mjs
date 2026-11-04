/* Browser check for the 3D ship (src/three/). Drives real pointer, wheel,
   touch and keyboard input through Chrome and checks the game state after
   each step. Sections:

     cabin     lamp, lantern, breath + finger drawing on the glass (exact
               pointer-to-stroke error) at rest / head turned / leaning in /
               from the window viewpoint / portrait, the camera holding still
               under a hand, answering a beacon, Tab + Enter, Escape, hints
     radio     power, tuning by drag (incl. sliding off the knob), the dial,
               the printer, the station table, phones, desk lamp, punching and
               erasing the tape, winding the crank, keyboard paths
     flow      the job's first two steps: dispatch slip -> course set
     notices   every notice on a wall: up close on the first tap, centred,
               a second tap runs its action, back / Escape restore the view
     views     every room, every viewpoint, landscape and portrait: what is
               touchable, screenshots, console errors
     resources walking room to room does not pile up GPU memory

   Needs a running dev server and puppeteer-core, which is not a dependency:
     npm run dev -- --port 8123
     npm i --no-save puppeteer-core
     node tools/three-check.mjs [screenshot-dir]
   SECTIONS=cabin,radio limits the run; CHROME and URL override the browser
   path and the server. Exit code 1 if anything failed. */
import puppeteer from 'puppeteer-core';
const OUT = process.argv[2] || '.';
const ONLY = process.env.SECTIONS ? new Set(process.env.SECTIONS.split(',')) : null;
const URL0 = process.env.URL || 'http://localhost:8123/';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run']
});
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const logs = [];
const ok = (c, msg) => { (c ? pass++ : fail++); console.log((c ? 'PASS ' : 'FAIL ') + msg); };

async function fresh({ w = 1280, h = 720, touch = false } = {}){
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch });
  page.on('console', m => { if (['error', 'warn', 'warning'].includes(m.type()) && !/GPU stall|ReadPixels/.test(m.text())) logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => logs.push('pageerror: ' + e.message));
  await page.goto(URL0, { waitUntil: 'networkidle0' });
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('yehang')) localStorage.removeItem(k); });
  await page.goto(URL0, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !document.querySelector('#boardMute').disabled && window.__three, { timeout: 20000 });
  await page.click('#boardMute'); await wait(1800);
  const T = (fn, ...a) => page.evaluate(fn, ...a);
  const clientOf = (X, Y) => T((X, Y) => { const r = document.querySelector('#scene').getBoundingClientRect(), d = window.__three; return { x: r.left + X/d.CW()*r.width, y: r.top + Y/d.CH()*r.height }; }, X, Y);
  const hits = () => T(() => window.__three.hits());
  const hitPos = async key => { const h = (await hits()).find(h => h.key === key || h.act === key); return h ? clientOf(h.X, h.Y) : null; };
  const actAt = (x, y) => T((x, y) => { const r = document.querySelector('#scene').getBoundingClientRect(), d = window.__three; const h = d.pickAt((x - r.left)/r.width*d.CW(), (y - r.top)/r.height*d.CH()); return h ? h.h.act : null; }, x, y);
  const go = async room => { await T(r => window.__go(r), room); await wait(1800); };
  const view = async id => { await T(v => window.__three.views.go(v), id); await wait(1900); };
  const shot = name => page.screenshot({ path: `${OUT}/${name}.png` });
  const G = () => T(() => JSON.parse(JSON.stringify(window.__three.G())));
  return { page, T, clientOf, hits, hitPos, actAt, go, view, shot, G };
}
const section = async (name, fn) => { if (ONLY && !ONLY.has(name)) return; console.log(`\n== ${name}`); try { await fn(); } catch(e){ ok(false, `${name} threw: ${e.message}`); } };

/* ================= CABIN ================= */
await section('cabin', async () => {
  const P = await fresh(), { page, T, clientOf, hitPos, actAt, shot } = P;
  const st = () => T(() => window.__cabin3d.state());
  const glassClient = async (dx, dy) => { const p = await T((a, b) => window.__cabin3d.glassToScreen(a, b), dx, dy); return clientOf(p.X, p.Y); };
  await shot('cabin-01-desk');
  let s0 = await st();
  for (let i = 0; i < 2; i++){ const p = await hitPos('lamp'); await page.mouse.click(p.x, p.y); await wait(250); }
  ok((await st()).lamp === (s0.lamp + 2) % 3, `lamp pulled twice: ${s0.lamp} -> ${(await st()).lamp}`);
  await wait(1200);
  { const p = await hitPos('cab:lantern'); const a = (await st()).colorIdx; await page.mouse.click(p.x, p.y); await wait(200); ok((await st()).colorIdx === (a + 1) % 3, 'lantern turns to the next colour'); }

  async function strokeTest(label, start, pts, hold){
    const p0 = await glassClient(start[0], start[1]);
    ok(await actAt(p0.x, p0.y) === 'cab:glass:left', `${label}: pointer on the left glass`);
    await page.mouse.move(p0.x, p0.y); await page.mouse.down(); await wait(60);
    const cam0 = (await st()).camPos;
    if (hold){ await wait(1400); const s = await st(); const b = s.breaths[s.breaths.length - 1];
      ok(b && Math.hypot(b.x - start[0], b.y - start[1]) < 3 && b.r > 80, `${label}: breath at (${b && b.x.toFixed(1)}, ${b && b.y.toFixed(1)}) r=${b && b.r.toFixed(0)}, wanted (${start})`); }
    const n0 = (await st()).strokes.length, trail = [start];
    for (const [dx, dy] of pts){ const p = await glassClient(dx, dy); await page.mouse.move(p.x, p.y, { steps: 3 }); await wait(30); trail.push([dx, dy]); }
    const cam1 = (await st()).camPos;
    await page.mouse.up(); await wait(100);
    ok(cam0.every((v, i) => Math.abs(v - cam1[i]) < 1e-6), `${label}: the camera held still under the hand`);
    const s = await st();
    const seg = (q, a, b) => { const vx = b[0]-a[0], vy = b[1]-a[1], L = vx*vx + vy*vy || 1, t = Math.max(0, Math.min(1, ((q[0]-a[0])*vx + (q[1]-a[1])*vy)/L)); return Math.hypot(q[0]-a[0]-t*vx, q[1]-a[1]-t*vy); };
    const sk = s.strokes[s.strokes.length - 1] || [];
    const worst = Math.max(0, ...sk.map(q => Math.min(...trail.slice(1).map((b, i) => seg(q, trail[i], b)))));
    const exact = await page.evaluate(async (pts) => {
      const d = window.__cabin3d, cv = document.querySelector('#scene'), r = cv.getBoundingClientRect();
      const toClient = (dx, dy) => { const p = d.glassToScreen(dx, dy); return { x: r.left + p.X/d.CW()*r.width, y: r.top + p.Y/d.CH()*r.height }; };
      const ev = (type, c) => cv.dispatchEvent(new PointerEvent(type, { clientX: c.x, clientY: c.y, pointerId: 9, pointerType: 'pen', button: 0, buttons: 1, bubbles: true, isPrimary: true }));
      ev('pointerdown', toClient(...pts[0]));
      let worst = 0, n = 0;
      for (const [dx, dy] of pts.slice(1)){
        const c = toClient(dx, dy), before = (d.state().strokes.at(-1) || []).length, nS = d.state().strokes.length;
        ev('pointermove', c);
        const st = d.state(), sk = st.strokes.at(-1) || [];
        if (st.strokes.length > nS || sk.length > before){ const q = sk.at(-1), b = d.glassToScreen(q[0], q[1]); worst = Math.max(worst, Math.hypot(r.left + b.X/d.CW()*r.width - c.x, r.top + b.Y/d.CH()*r.height - c.y)); n++; }
        await new Promise(res => requestAnimationFrame(res));
      }
      ev('pointerup', toClient(...pts.at(-1)));
      return { worst, n };
    }, [start, ...pts.map(([x, y]) => [start[0] + (x - start[0])*.6 + 6, start[1] + (y - start[1])*.6 + 4])]);
    ok(exact.n > 4 && exact.worst < .5, `${label}: exact, ${exact.n} points, worst ${exact.worst.toFixed(3)} CSS px between pointer and stroke`);
    ok(s.strokes.length > n0, `${label}: a stroke was drawn (${sk.length} points)`);
    ok(worst < 3, `${label}: real mouse, worst ${worst.toFixed(2)} design units from the pointer's path (the glass is 534 wide)`);
  }
  const path = (cx, cy, r) => Array.from({ length: 14 }, (_, i) => [cx + Math.cos(i/13*Math.PI*1.6)*r, cy + Math.sin(i/13*Math.PI*1.6)*r*.6]);
  await strokeTest('desk view', [440, 330], path(440, 330, 60), true);
  await shot('cabin-02-drawn');

  /* answer a beacon */
  { let b = null; for (let i = 0; i < 60 && !b; i++){ const s = await st(); b = s.beacons.find(x => !x.answered && x.win); if (!b) await wait(500); }
    ok(!!b, `a beacon drifted into a window (${b && b.color}, ${b && b.win})`);
    if (b){ const ORDER = ['amber', 'teal', 'rose'];
      for (let i = 0; i < 3 && ORDER[(await st()).colorIdx] !== b.color; i++){ const p = await hitPos('cab:lantern'); await page.mouse.click(p.x, p.y); await wait(150); }
      const before = (await st()).bulbs.length, s = await st(), bb = s.beacons.find(x => x.color === b.color && !x.answered && x.win);
      if (bb){ const sp = await T((x, y) => window.__cabin3d.skyToScreen(x, y), bb.x, bb.y), c = await clientOf(sp.X, sp.Y);
        ok(await actAt(c.x, c.y) === 'cab:glass:' + bb.win, `beacon tap lands on the ${bb.win} glass`);
        await page.mouse.click(c.x, c.y); await wait(1700);
        const after = await st(); ok(after.bulbs.length === before + 1 || (before === 12 && after.bulbs.length === 12), `beacon answered: bulbs ${before} -> ${after.bulbs.length}`);
        await shot('cabin-03-answered'); } } }

  /* head turn: drag empty space */
  { let from = null;
    for (const [fx, fy] of [[.5, .07], [.3, .1], [.7, .1], [.5, .14], [.15, .5]]){ const x = 1280*fx, y = 720*fy; if (!(await actAt(x, y))){ from = { x, y }; break; } }
    ok(!!from, 'found empty background to drag');
    const before = await st();
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(from.x + 220, from.y + 60, { steps: 12 }); await page.mouse.up(); await wait(1200);
    const s = await st(); ok(s.cam.tpanX > 100 && s.cam.tpanY > 20 && s.lamp === before.lamp && s.strokes.length === before.strokes.length, `a drag on empty space only turns the head: pan ${s.cam.tpanX.toFixed(0)},${s.cam.tpanY.toFixed(0)}`);
    await shot('cabin-04-turned');
    await strokeTest('head turned', [420, 350], path(420, 350, 45), false); }

  /* lean in with the wheel */
  await page.mouse.move(640, 300); await page.mouse.wheel({ deltaY: -700 }); await wait(1600);
  ok((await st()).cam.user > 1.5, `wheel leans in: user ${(await st()).cam.user.toFixed(2)}`);
  await shot('cabin-05-leaning');
  await strokeTest('leaning in', [450, 340], path(450, 340, 40), true);

  /* keyboard */
  await page.focus('#scene');
  { const a = (await st()).lamp; let found = false;
    for (let i = 0; i < 24 && !found; i++){ await page.keyboard.press('Tab'); await wait(60); found = (await st()).focusKey === 'lamp'; }
    ok(found, 'Tab reaches the lamp cord'); await shot('cabin-06-focus');
    await page.keyboard.press('Enter'); await wait(200); ok((await st()).lamp === (a + 1) % 3, 'Enter pulls the lamp cord'); }
  for (let i = 0; i < 3; i++){ await page.keyboard.press('Escape'); await wait(150); }
  await wait(1200);
  { const s = await st(); ok(Math.abs(s.cam.tpanX) < 1 && s.cam.tuser < 1.01, `Escape resets the head turn (${s.cam.tpanX.toFixed(1)}, ${s.cam.tuser.toFixed(2)})`); }

  /* the window viewpoint: by its marker, then draw there */
  { let found = false;
    for (let i = 0; i < 30 && !found; i++){ await page.keyboard.press('Tab'); await wait(60); found = (await st()).focusKey === 'view:window'; }
    ok(found, 'Tab reaches the window marker');
    await page.keyboard.press('Enter'); await wait(2000);
    ok((await st()).view === 'window', 'Enter on the marker moves to the window');
    await shot('cabin-07-window');
    await strokeTest('window view', [430, 300], path(430, 300, 70), true);
    await page.keyboard.press('Escape'); await wait(2000);
    ok((await st()).view === 'desk', `Escape goes back to the desk (${(await st()).view})`); }

  /* chart table by clicking its marker */
  { const m = await hitPos('view:chart'); ok(!!m, 'chart table marker on screen');
    if (m){ await page.mouse.click(m.x, m.y); await wait(2000); ok((await st()).view === 'chart', 'clicking the marker moves to the chart table'); await shot('cabin-08-chart');
      const p = await hitPos('cab:chartlamp'); ok(!!p, 'chart lamp touchable from the chart view');
      if (p){ const r0 = (await st()).reading; await page.mouse.click(p.x, p.y); await wait(300); ok((await T(() => window.__three.G().chartLamp)) !== r0, 'chart lamp switches'); }
      await page.click('#views .pill'); await wait(2000); } }

  /* portrait */
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 }); await wait(1600);
  await shot('cabin-09-portrait');
  { const h = await P.hits(); ok(['lamp', 'cab:lantern', 'tea:cup', 'cab:route'].every(k => h.some(x => x.key === k || x.act === k)), `portrait desk view still shows lamp, lantern, cup, course sign (${h.length} touchable)`); }
  await strokeTest('portrait', [470, 320], path(470, 320, 45), true);
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 }); await wait(900);

  /* reduced motion, hints */
  await page.click('#bSettings'); await wait(200); await page.click('#sMotion'); await wait(100); await page.click('#settingsClose'); await wait(300);
  ok((await st()).reduced === true, 'reduced motion on from settings');
  { const m = await hitPos('view:window'); await page.mouse.click(m.x, m.y); await wait(200);
    ok(await T(() => document.getElementById('fade').classList.contains('on')), 'under reduced motion a viewpoint move fades instead of flying'); await wait(1500); await page.keyboard.press('Escape'); await wait(1500); }
  await page.click('#bHints'); await wait(700); await shot('cabin-10-hints');
  { const n = await T(() => document.querySelectorAll('#hints .hint').length); ok(n >= 10, `"what's touchable" rings ${n} things`); }
  await page.close();
});

/* ================= RADIO ================= */
await section('radio', async () => {
  const P = await fresh(), { page, T, hitPos, go, view, shot, G, actAt } = P;
  await go('radio'); await wait(600);
  await shot('radio-01-room');
  const click = async key => { const p = await hitPos(key); ok(!!p, `${key} on screen`); if (p){ await page.mouse.click(p.x, p.y); await wait(300); } return p; };
  await view('radio');
  await click('r:power'); ok((await G()).radioOn, 'power knob turns the radio on');
  { const f0 = (await G()).freq, p = await hitPos('r:tune');
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    for (let i = 1; i <= 12; i++){ await page.mouse.move(p.x + i*10, p.y + i*6); await wait(16); }   // slides well off the knob
    await page.mouse.up(); await wait(200);
    const f1 = (await G()).freq; ok(f1 > f0 + .08, `dragging the tuning knob (and off it) raises the frequency ${f0.toFixed(3)} -> ${f1.toFixed(3)}`); }
  { const pos = await T(() => { const B = window.__three.B(); let f = null; B.scene.traverse(o => { if (o.userData.pick && o.userData.pick.act === 'r:dial') f = o; });
      const THREE = window.__three.THREE, x = 500 + (1.09 - .5)/1.2*236, w = f.localToWorld(new THREE.Vector3(((x - 480)/276 - .5)*.6, 0, 0)); return window.__three.toScreen(w.x, w.y, w.z); });
    const c = await P.clientOf(pos.X, pos.Y); ok(await actAt(c.x, c.y) === 'r:dial', 'the dispatch mark is on the dial');
    await page.mouse.click(c.x, c.y); await wait(1500);
    const g = await G(); ok(Math.abs(g.freq - 1.09) < .015, `tapping the dial at the mark tunes to ${g.freq.toFixed(3)}`); ok(!!g.printed, `dispatch prints a slip (${g.printed})`); }
  await shot('radio-02-on');
  await view('room');
  { const n0 = (await G()).slips.length; await click('r:slip'); const g = await G(); ok(g.slips.length === n0 + 1, `slip torn off (${g.slips}); still on dispatch, so the next one prints: ${g.printed}`); }
  await click('r:table'); await wait(1500);
  ok(await T(() => window.__three.views.inspecting()), 'tapping the station table brings it up close');
  await page.keyboard.press('Escape'); await wait(1600);
  ok(!(await T(() => window.__three.views.inspecting())), 'Escape puts it back');
  await click('r:phones'); ok((await G()).phones, 'headphones on'); await click('r:phones'); ok(!(await G()).phones, 'headphones off');
  { const a = await T(() => !!window.__three.S().rLampOff); await click('r:lamp'); ok((await T(() => !!window.__three.S().rLampOff)) !== a, 'desk lamp switches'); await shot('radio-03-lamp-off'); await click('r:lamp'); }
  await view('tape');
  await shot('radio-04-tape');
  { const cell = async (c, r) => { const pos = await T((c, r) => { const B = window.__three.B(); let f = null; B.scene.traverse(o => { if (o.userData.pick && o.userData.pick.act === 'r:strip') f = o; });
      const THREE = window.__three.THREE, w = f.localToWorld(new THREE.Vector3(((c + .5)/16 - .5)*.76, (.5 - (r + .5)/6)*.3, 0)); return window.__three.toScreen(w.x, w.y, w.z); }, c, r); return P.clientOf(pos.X, pos.Y); };
    const a = await cell(2, 1), b = await cell(7, 1);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 20 }); await page.mouse.up(); await wait(200);
    let strip = (await G()).strip; const punched = [2, 3, 4, 5, 6, 7].filter(c => strip[c] & 2).length;
    ok(punched === 6, `a drag along row 1 punches cells 2..7 (${punched}/6)`);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 20 }); await page.mouse.up(); await wait(200);
    strip = (await G()).strip; ok([2, 3, 4, 5, 6, 7].every(c => !(strip[c] & 2)), 'dragging again from a punched cell erases them'); }
  { const p = await hitPos('r:crank'); const w0 = (await G()).wind;
    const c = await T(() => { const B = window.__three.B(); let f = null; B.scene.traverse(o => { if (o.userData.pick && o.userData.pick.act === 'r:crank') f = o; }); const v = f.getWorldPosition(new window.__three.THREE.Vector3()); return window.__three.toScreen(v.x, v.y, v.z); });
    const cc = await P.clientOf(c.X, c.Y), R = 60;
    await page.mouse.move(cc.x + R, cc.y); await page.mouse.down();
    for (let i = 1; i <= 48; i++){ const a = i/48*Math.PI*4; await page.mouse.move(cc.x + Math.cos(a)*R, cc.y + Math.sin(a)*R); await wait(12); }
    await page.mouse.up(); await wait(300);
    const w1 = (await G()).wind; ok(w1 > w0 + 1.5, `two clockwise circles on the crank wind the spring ${w0.toFixed(2)} -> ${w1.toFixed(2)}`); void p; }
  await page.focus('#scene');
  { let found = false; for (let i = 0; i < 30 && !found; i++){ await page.keyboard.press('Tab'); await wait(50); found = (await T(() => window.__three.S().focusKey)) === 'r:crank'; }
    ok(found, 'Tab reaches the crank'); const w0 = (await G()).wind; await page.keyboard.press('Enter'); await wait(150); ok((await G()).wind >= Math.min(12, w0 + .9), 'Enter winds one turn'); }
  await page.close();
});

/* ================= THE FIRST TWO STEPS OF A JOB ================= */
await section('flow', async () => {
  const P = await fresh(), { page, T, hitPos, go, G, shot } = P;
  await go('radio'); await wait(500);
  await T(() => { const g = window.__three.G(); g.radioOn = true; g.freq = 1.09; });
  await wait(1500);
  ok(!!(await G()).printed, 'dispatch printed a slip');
  { const p = await hitPos('r:slip'); await page.mouse.click(p.x, p.y); await wait(300); }
  const want = (await G()).slips.at(-1);
  await go('cabin'); await wait(500);
  { const p = await hitPos('cab:route'); await page.mouse.click(p.x, p.y); await wait(1600); }
  ok(await T(() => window.__three.views.inspecting()), 'the first tap on the sign brings it up close');
  { const p = await hitPos('cab:route'); await page.mouse.click(p.x, p.y); await wait(500); }
  ok(await T(() => !document.querySelector('#routePanel').hidden), 'the second opens the course board');
  const n = await T(() => document.querySelectorAll('#routeList button').length);
  await page.click(`#routeList button:nth-child(${n})`); await wait(900);
  const g = await G(); ok(!!g.call && g.call.to === want, `course set for the slip just torn off (${g.call && g.call.to})`);
  await wait(2500); await shot('flow-course-set');
  await page.close();
});

/* ================= NOTICES UP CLOSE =================
   Every notice on a wall: the first tap brings the camera square on to it
   (centred, high enough to clear a caption), the back button or Escape puts
   the camera back where it was, head turn included. */
await section('notices', async () => {
  const P = await fresh(), { page, T, hitPos, go, view, shot } = P;
  const cam = () => T(() => ({ pos: window.__three.camera.position.toArray(), rot: [window.__three.camera.rotation.x, window.__three.camera.rotation.y], insp: window.__three.views.inspecting(), v: window.__three.view() }));
  const plan = [['cabin', null, ['work', 'cab:route']], ['radio', null, ['work', 'r:table']], ['green', 'bench', ['work', 'boarddock']],
    ['hatch', null, ['work', 'hatSign']], ['corridor', 40, ['notice', 'work', 'voyage', 'ring:log']]];
  for (const [room, where, keys] of plan){
    if (room !== 'cabin') await go(room);
    if (typeof where === 'string') await view(where);
    if (typeof where === 'number'){ await T(a => { window.__three.S().phiTarget = a; }, where); await wait(2500); }
    for (const key of keys){
      if (room !== 'corridor'){ await page.keyboard.press('ArrowLeft'); await wait(700); }
      const before = await cam(), p = await hitPos(key); ok(!!p, `${room}: ${key} on screen`); if (!p) continue;
      await page.mouse.click(p.x, p.y); await wait(1700);
      const at = await cam(), h = (await P.hits()).find(x => x.key === key || x.act === key || x.act.startsWith('inspect'));
      const W = await T(() => window.__three.CW()), Hh = await T(() => window.__three.CH());
      const c = (await P.hits()).find(x => x.key === key);
      ok(at.insp && c && Math.abs(c.X/W - .5) < .12 && c.Y/Hh < .5, `${room}: ${key} up close, centred and above the caption line`);
      await shot(`notice-${room}-${key.replace(/:/g, '_')}`);
      if (key === 'ring:log'){ const q = await hitPos(key); await page.mouse.click(q.x, q.y); await wait(500);
        ok(await T(() => !document.querySelector('#logView').hidden), `${room}: a second tap does what it always did (the log opens)`); await page.click('#logClose'); await wait(300); }
      if (key === 'hatSign') await page.keyboard.press('Escape'); else await page.click('#inspectBack');
      await wait(1800);
      const after = await cam(), same = before.pos.every((v, i) => Math.abs(v - after.pos[i]) < .06) && before.rot.every((v, i) => Math.abs(v - after.rot[i]) < .01);
      ok(!after.insp && after.v === before.v && same, `${room}: back where it was, head turn included`);
      void h;
    }
  }
  await page.close();
});

/* ================= EVERY ROOM, EVERY VIEW ================= */
const ROOMS = ['cabin', 'radio', 'green', 'hatch', 'galley', 'dome', 'corridor'];
await section('views', async () => {
  for (const [w, h, tag] of [[1280, 720, 'land'], [390, 844, 'port']]){
    const P = await fresh({ w, h, touch: tag === 'port' }), { T, go, view, shot } = P;
    for (const room of ROOMS){
      await go(room); await wait(700);
      const is3d = await T(() => !!window.__three.B() && window.__three.room() === window.__three.S().room);
      ok(is3d, `${tag} ${room}: drawn in 3D`);
      const views = await T(() => window.__three.views.list());
      for (const v of views){
        if (views.length > 1) await view(v);
        const hs = await P.hits(), lab = hs.filter(x => x.label).length;
        ok(hs.length > 0, `${tag} ${room}/${v}: ${hs.length} touchable, ${lab} labelled`);
        await shot(`views-${tag}-${room}-${v}`);
      }
    }
    await P.page.close();
  }
});

/* ================= RESOURCES ================= */
await section('resources', async () => {
  const P = await fresh(), { T, go } = P;
  const info = () => T(() => window.__three.info());
  const seq = ['radio', 'green', 'hatch', 'galley', 'dome', 'corridor', 'cabin'];
  for (const r of seq) await go(r);
  const a = await info();
  for (let k = 0; k < 2; k++) for (const r of seq) await go(r);
  const b = await info();
  ok(b.geo <= a.geo + 2 && b.tex <= a.tex + 2, `after two more laps of every room: geometries ${a.geo} -> ${b.geo}, textures ${a.tex} -> ${b.tex}`);
  console.log(`   cabin: ${b.calls} draw calls, ${b.tris} triangles, ${b.progs} programs`);
  await P.page.close();
});

console.log(`\n${pass} passed, ${fail} failed`);
console.log(logs.length ? [...new Set(logs)].slice(0, 40).join('\n') : 'no console errors');
await browser.close();
process.exitCode = fail ? 1 : 0;
