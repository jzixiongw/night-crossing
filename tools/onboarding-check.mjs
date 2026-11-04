/* Run with Node 24+ after npm install. Install playwright separately for UI
   checks: npm i --no-save playwright && npx playwright install chromium.
   PLAYWRIGHT_MODULE and CHROME can point to an existing installation.
   Starts its own Vite server. UI actions complete the first delivery at normal
   speed; dev hooks only assert the resulting state in that flow. The recovery
   section explicitly seeds later-game fixtures for otherwise lengthy checks.
   `handover` seeds a ship alongside and leaves and reloads in the middle of the
   handover; `oldsave` boots a save written before the voyage clock existed;
   `fallback` runs the painted ship (?render=2d); `chart` marks the sea chart,
   in landscape and on a portrait phone.
   OUT controls screenshots (default /tmp/night-crossing-onboarding). */
import { mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = process.env.OUT || '/tmp/night-crossing-onboarding'; mkdirSync(out, { recursive:true });
const server = await createServer({ server:{ host:'127.0.0.1', port:8123, open:false, strictPort:true } });
await server.listen();
const browser = await chromium.launch({ headless:true, ...(process.env.CHROME ? { executablePath:process.env.CHROME } : {}),
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'] });
const only = process.env.SECTIONS ? new Set(process.env.SECTIONS.split(',')) : null;
let pass = 0;
const ok = (value, label) => { assert.ok(value, label); pass++; console.log('PASS', label); };
const errors = [];
async function fresh(lang = 'en', viewport = { width:1440, height:900 }, touch = false, o = {}){
  const context = await browser.newContext({ viewport, hasTouch:touch, reducedMotion:touch ? 'reduce' : 'no-preference' });
  const p = await context.newPage();
  p.on('pageerror', e => errors.push(e.message));
  if (o.save) await context.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')){ localStorage.setItem(k, v); localStorage.setItem('yehang-long-v2:last', '1'); sessionStorage.setItem('seeded', '1'); } }, ['yehang-long-v2:s1', JSON.stringify(o.save)]);
  await p.goto(`http://127.0.0.1:8123/?lang=${lang}${o.q || ''}`);
  await p.locator('#boardMute').waitFor({state:'visible'});
  await p.waitForFunction(() => !document.querySelector('#boardMute').disabled && (window.__three || location.search.includes('render=2d')));
  await p.locator('#boardMute').click();
  if (o.q && o.q.includes('render=2d')) { await p.locator('#intro').waitFor({state:'hidden'}); return { p, context }; }
  await p.waitForFunction(() => window.__three.scene() && !window.__three.S().camMove);
  await p.locator('#voyageGuide').waitFor({state:'visible'});
  await p.locator('#intro').waitFor({state:'hidden'});
  await p.evaluate(() => document.fonts.ready);
  return { p, context };
}
const state = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__three.G())));
/* the title is on the folded guide's heading too, and the first delivery folds it */
const waitTitle = (p, title, timeout = 20000) => p.locator('#voyageGuide h2, #voyageGuide .guide-now').filter({hasText:title}).filter({visible:true}).first().waitFor({state:'visible',timeout});
const unfold = async p => { if (await p.locator('#voyageGuide').evaluate(e => e.classList.contains('collapsed'))) await p.locator('.guide-heading').click(); };
const game = p => p.evaluate(() => ({ room: window.__three.room(), run: window.__three.S().run, doorK: window.__three.S().doorK, offer: !!window.__three.S().offer }));
/* game time, not wall time: a software-rendered page runs few frames a second */
const runFor = (p, sec) => p.evaluate(async sec => { const S = window.__three.S(), t0 = S.run; while (S.run - t0 < sec) await new Promise(r => setTimeout(r, 50)); }, sec);
const ACT = (p, a) => p.evaluate(async a => (await import('/src/rooms/registry.ts')).ACT[a].tap(), a);
const goRoom = (p, r) => p.evaluate(async r => (await import('/src/rooms/registry.ts')).go(r), r).then(() => p.waitForFunction(r => window.__three.room() === r && !window.__three.S().trans, r));
const seedDocked = (p, port = 'dock') => p.evaluate(port => { const g = window.__three.G(), t = Date.now() + g.skew;
  g.call = { to:port, eta:t - 1000, docked:t - 500, from:'hub', dep:t - 121000 }; g.slips = []; g.rig = { sp:'bell', glass:true, lit:true };
  g.journey = { to:port, taken:true, course:true, grown:true, built:true, delivered:false, prepared:true }; }, port);
const settle = p => p.waitForFunction(() => !window.__three.S().camMove && !window.__three.S().trans && !window.__three.S().guideNavigating);
async function target(p, name){
  await settle(p); const b = p.locator('#guideTarget');
  await b.filter({hasText:name}).waitFor({state:'visible'});
  const r = await b.boundingBox(); await p.mouse.click(r.x+r.width/2,r.y+r.height/2);
}
try {
  if (!only || only.has('flow')) {
  const { p, context } = await fresh('zh');
  await waitTitle(p, '选定目的地');
  ok(!(await p.locator('body').innerText()).includes('左上角那排点子'), 'first instruction matches the current interface');
  await p.screenshot({path:`${out}/01-first-step.png`});
  await target(p, '设定航向');
  await p.locator('#routePanel').waitFor({state:'visible'});
  ok(await p.locator('#routeSub').innerText() === '选择目的地后，船会自行航行。', 'one approach opens the actionable course board');
  await p.locator('#routeList button').filter({hasText:'旧码头'}).click();
  let g = await state(p);
  ok(g.call.eta - Date.now() <= 120000 && g.call.eta - Date.now() > 100000, 'first crossing takes two minutes at normal speed');
  await p.locator('.guide-go').click();
  await p.waitForFunction(() => window.__three.room() === 'green'); await settle(p);
  await target(p, '选择这盆植物');
  await p.locator('#plantPanel').waitFor({state:'visible'});
  ok((await state(p)).rig === null, 'tapping a flower first shows deliberate choices');
  await p.locator('#plantClip').click();
  g = await state(p); ok(g.vase === 'bell' && g.pots[0].bloomAt === 0, 'a first-night souvenir leaves a flower available for delivery');
  await target(p, '选择这盆植物'); await p.locator('#plantBuild').click();
  await waitTitle(p, '扣上玻璃罩'); await settle(p);
  await p.waitForFunction(() => window.__three.view() === 'bench');
  ok((await state(p)).journey.grown, 'moving the plant preserves the completed preparation');
  await p.screenshot({path:`${out}/02-fit-cover.png`});
  await target(p, '扣上玻璃罩'); await waitTitle(p, '安装灯头');
  await target(p, '安装灯头'); await waitTitle(p, '植物灯装好了');
  ok((await state(p)).journey.built, 'cover and cap complete the lamp through visible actions');
  await p.locator('.guide-skip').click(); await p.locator('#guideRestore').waitFor({state:'visible'});
  await p.locator('#guideRestore').click(); await p.locator('#voyageGuide').waitFor({state:'visible'}); ok(await p.locator('#voyageGuide').isVisible(), 'guide can be dismissed and restored');
  await p.locator('.guide-go').click();
  await p.waitForFunction(() => window.__three.room() === 'galley'); await settle(p);
  ok((await state(p)).journey.built, 'exploring another room preserves progress');
  console.log('Waiting for the real crossing to arrive (no time acceleration).');
  await waitTitle(p, '把灯送到门外', 150000);
  await p.locator('.guide-go').click();
  await p.waitForFunction(() => window.__three.room() === 'hatch'); await settle(p);
  ok((await game(p)).doorK === 0 && (await state(p)).call.docked, 'arriving holds the ship alongside with the door shut');
  await p.screenshot({path:`${out}/03a-alongside.png`});
  await target(p, '打开舷门');
  await p.waitForFunction(() => window.__three.S().doorK >= 1);
  await target(p, '把灯递过去'); await waitTitle(p, '松手');
  ok((await game(p)).offer && !(await state(p)).call.gave, 'the first tap holds the lamp out; nothing is handed over yet');
  await p.screenshot({path:`${out}/03b-held-out.png`});
  await target(p, '松手'); await waitTitle(p, '这一趟送到了');
  g = await state(p);
  ok(g.calls.length === 1 && g.journey.delivered && g.journey.built && !g.rig, 'delivery completes durably after the physical lamp is handed over');
  ok(g.guide.collapsed, 'the first delivery folds the guide away');
  await runFor(p, 4); await p.screenshot({path:`${out}/03c-carried-off.png`});
  /* close the door by hand: it takes its time, and the ship waits for the walk */
  const t0 = (await game(p)).run;
  await p.locator('#ctx .pill').filter({hasText:'关上舷门'}).click();
  await p.waitForFunction(() => window.__three.S().doorK === 0);
  ok((await game(p)).run - t0 >= 2, 'the gangway door takes seconds to close, not a frame');
  g = await state(p);
  const { castAt, handOf } = await p.evaluate(async () => { const v = await import('/src/state/voyage.ts'); return { castAt: v.castAt(window.__three.G().call), handOf: v.handOf('dock') }; });
  ok(g.call.docked < g.call.gave && g.call.gave < g.call.shut && castAt >= g.call.gave + handOf.arrive*1000, 'alongside, handed over, door shut, then casting off once the lamp is set');
  await p.evaluate(() => window.__three.views.go('porthole')); await runFor(p, 2);
  await p.screenshot({path:`${out}/03d-porthole.png`});
  await p.reload();
  await p.waitForFunction(() => !document.querySelector('#boardMute').disabled && window.__three);
  await p.locator('#boardMute').click(); await waitTitle(p, '这一趟送到了');
  ok((await state(p)).journey.delivered, 'save and reload retain the completed first delivery');
  console.log('Waiting for the ship to cast off and the place to fall astern.');
  await p.waitForFunction(() => !window.__three.G().call, null, { timeout:120000 });
  g = await state(p);
  ok(g.wake && g.wake.id === 'dock' && g.log.some(e => e.text.includes('离开旧码头')), 'the ship leaves on its own clock and keeps the place as a light astern');
  await unfold(p); await waitTitle(p, '这一趟送到了');
  await p.locator('.guide-go').click(); await p.waitForFunction(() => window.__three.room() === 'radio'); await settle(p);
  await target(p, '打开收音机'); await waitTitle(p, '调到调度台');
  // Actual knob drag, then collect the printed request through its visible prompt.
  const h = await p.evaluate(() => window.__three.hits().find(h => h.act === 'r:tune'));
  const rect = await p.locator('#scene').boundingBox();
  const size = await p.evaluate(() => ({w:window.__three.CW(),h:window.__three.CH()}));
  const x = rect.x + h.X/size.w*rect.width, y = rect.y + h.Y/size.h*rect.height;
  await p.mouse.move(x,y); await p.mouse.down(); await p.mouse.move(x + rect.width*0.077,y,{steps:20}); await p.mouse.up();
  await waitTitle(p, '取下打印出的委托'); await p.locator('.guide-go').click(); await settle(p); await target(p, '取下委托');
  ok((await state(p)).journey.to === 'echo' && !(await state(p)).journey.delivered, 'next radio request starts a separate journey');
  await context.close();
  }

  if (!only || only.has('portrait')) for (const lang of ['zh','en']) {
    const {p,context} = await fresh(lang,{width:390,height:844},true);
    await p.screenshot({path:`${out}/04-portrait-${lang}.png`});
    ok(await p.locator('#guideTarget').isVisible(), `${lang}: portrait exposes the next object`);
    ok(await p.evaluate(() => window.__three.G().reduced), `${lang}: system reduced motion is respected`);
    if(lang === 'en') ok(!/[一-鿿]/.test(await p.locator('#voyageGuide').innerText()), 'English guide has no untranslated Chinese');
    await p.locator('.guide-heading').click(); await p.waitForFunction(() => document.querySelector('#voyageGuide').classList.contains('collapsed')); ok(await p.locator('#voyageGuide').evaluate(e => e.classList.contains('collapsed')), `${lang}: guide collapses`);
    await p.locator('.guide-heading').click();
    await p.waitForFunction(() => !document.querySelector('#voyageGuide').classList.contains('collapsed'));
    await p.locator('.guide-go').focus(); await p.keyboard.press('Enter');
    ok(await p.locator('#routePanel').isVisible(), `${lang}: keyboard can open the next action`);
    await p.keyboard.press('Escape'); ok(!(await p.locator('#routePanel').isVisible()), `${lang}: Escape dismisses the panel`);
    await context.close();
  }
  if (!only || only.has('recovery')) {
    const {p,context} = await fresh('zh');
    await p.evaluate(() => {
      const g = window.__three.G();
      g.calls = [{id:'dock',at:Date.now()}]; g.slips = [];
      g.call = {to:'echo',eta:Date.now()+240000};
      g.journey = {to:'echo',taken:true,course:true,grown:false,built:false,delivered:false,prepared:false};
      g.pots.fill(null);
    });
    await waitTitle(p,'种下一盆植物');
    ok(await p.locator('.guide-detail').innerText() === '点种子盒，选一种种进空盆。', 'empty greenhouse explains how to start again');
    await p.evaluate(() => { window.__three.G().pots[0] = {sp:'bell',g:.2,water:0,lean:0,planted:Date.now(),bloomAt:0}; });
    await waitTitle(p,'土干了，浇一点水'); await p.locator('.guide-go').click(); await settle(p);
    await target(p,'拿起喷壶'); await target(p,'给这盆浇水');
    ok((await state(p)).pots[0].water > 0, 'dry-soil recovery can be completed using visible actions');
    await p.evaluate(() => { window.__three.G().growLamp = false; });
    await waitTitle(p,'打开生长灯'); await p.locator('.guide-go').click(); await settle(p);
    await target(p,'打开生长灯'); await waitTitle(p,'植物正在生长');
    ok((await state(p)).growLamp && /预计还需约/.test(await p.locator('.guide-detail').innerText()), 'growing plants get a time estimate and a place to wait');
    await p.evaluate(async () => { const {advance} = await import('/src/state/progress.ts'); advance(6*60000,'here'); });
    await waitTitle(p,'先放下喷壶');
    await target(p,'放下喷壶'); await waitTitle(p,'把开花植物装成灯');
    ok((await state(p)).pots[0].g === 1, 'normal lit growth completes within six minutes');
    await p.evaluate(() => { const g = window.__three.G(); g.pots[5] = g.pots[0]; g.pots[0] = null; });
    await p.locator('.guide-go').click(); await settle(p); await target(p,'选择这盆植物');
    ok(await p.locator('#plantPanel').isVisible(), 'a ready plant on the nursery shelf is reachable');
    await p.keyboard.press('Escape');
    await p.evaluate(() => { const g = window.__three.G(); g.calls = ['dock','echo','bell','ship'].map(id => ({id})); });
    await waitTitle(p,'四处都亮起灯了');
    const remaining = await p.evaluate(async () => (await import('/src/ui/worksheet.ts')).openRequest());
    ok(!remaining, 'completed ports do not generate repeat requests');
    await context.close();
  }
  if (!only || only.has('handover')) {
    /* walk off in the middle of it, come back, reload: nothing sticks */
    const {p,context} = await fresh('en');
    await seedDocked(p, 'bell'); await goRoom(p, 'hatch');
    await ACT(p, 'hat:door'); await p.waitForFunction(() => window.__three.S().doorK >= 1);
    await ACT(p, 'hat:give'); await ACT(p, 'hat:give');           // let go at once: early, and still caught
    await p.waitForFunction(() => !!window.__three.G().call.gave, null, { timeout:60000 });
    ok((await state(p)).call.wob > .1, 'letting go too early only makes the lamp swing more');
    await goRoom(p, 'corridor');
    ok(!!(await state(p)).call.shut, 'walking off mid-handover shuts the door behind you');
    await p.evaluate(() => window.__three.S().phi = 176); await runFor(p, 1.5);
    await p.screenshot({path:`${out}/05-ring-band.png`});
    await goRoom(p, 'hatch');
    let s2 = await game(p); ok(s2.doorK === 0 && !s2.offer, 'coming back finds the door shut and nothing held out');
    await p.reload(); await p.waitForFunction(() => !document.querySelector('#boardMute').disabled && window.__three); await p.locator('#boardMute').click();
    await p.waitForFunction(() => window.__three.room() === 'hatch');
    ok((await state(p)).call.gave && (await game(p)).doorK === 0, 'reloading mid-parting keeps the handover and the shut door');
    await p.waitForFunction(() => !window.__three.G().call, null, { timeout:120000 });
    ok((await state(p)).wake.id === 'bell', 'the parting finishes after a reload');
    await context.close();
  }
  if (!only || only.has('oldsave')) {
    /* a save from before the voyage clock: a handover with no shut, no from/dep, no wake or marks */
    const t = Date.now(), old = { v:2, no:'4321', created:t - 9e6, lastSeen:t - 3e6, savedAt:t - 3e6, nights:[], visits:1, speed:1, sound:false,
      pots:[null,null,null,null,null,null,null,null], calls:[{ id:'dock', at:t - 4e6, sp:'bell' }], call:{ to:'dock', eta:t - 5e6, docked:t - 5e6, gave:t - 4e6 },
      slips:[], rig:null, log:[], flags:{}, lastRoom:'hatch', mail:{ box:['welcome'], read:[], arrived:{}, nextAt:0, idx:1, out:[] } };
    const {p,context} = await fresh('en', undefined, false, { save: old });
    await p.waitForFunction(() => window.__three.G().no === '4321');
    const g2 = await state(p);
    ok(!g2.call && Array.isArray(g2.marks) && g2.journey?.delivered !== false, 'an old save mid-parting finishes the call at boot');
    await goRoom(p, 'cabin');
    await p.evaluate(async () => (await import('/src/rooms/cabin.ts')).openRoutes());
    ok(await p.locator('#seaChart svg').count() === 1, 'the old save opens the sea chart');
    await context.close();
  }
  if (!only || only.has('fallback')) {
    const {p,context} = await fresh('zh', undefined, false, { q:'&render=2d' });
    await p.evaluate(async () => { const { G } = await import('/src/state/store.ts'); const t = Date.now() + G.skew;
      G.call = { to:'echo', eta:t - 1000, docked:t - 500 }; G.slips = []; G.rig = { sp:'vine', glass:true, lit:true }; });
    await p.evaluate(async () => (await import('/src/rooms/registry.ts')).go('hatch'));
    await p.waitForTimeout(1200);
    for (const a of ['hat:door', 'hat:give', 'hat:give']) { await p.evaluate(async a => (await import('/src/rooms/registry.ts')).ACT[a].tap(), a); await p.waitForTimeout(2500); }
    await p.waitForFunction(async () => !!(await import('/src/state/store.ts')).G.call.gave, null, { timeout:60000 });
    await p.waitForTimeout(3000);
    for (const r of ['corridor', 'cabin']) { await p.evaluate(async r => (await import('/src/rooms/registry.ts')).go(r), r); await p.waitForTimeout(1500); }
    await p.evaluate(async () => (await import('/src/rooms/cabin.ts')).openRoutes()); await p.waitForTimeout(500);
    await p.screenshot({path:`${out}/06-painted-fallback.png`});
    ok(await p.locator('#seaChart svg').count() === 1, 'the painted ship runs the handover and the chart without WebGL');
    await context.close();
  }
  if (!only || only.has('chart')) {
    for (const [lang, vp, touch] of [['zh', { width:1440, height:900 }, false], ['en', { width:390, height:844 }, true]]) {
      const {p,context} = await fresh(lang, vp, touch);
      await p.evaluate(() => { const g = window.__three.G(), t = Date.now() + g.skew;
        g.calls = [{ id:'dock', at:t - 9e5, sp:'bell' }]; g.wake = { id:'dock', at:t - 6e5 }; g.slips = ['echo']; g.visited = ['harbor']; g.marks = []; g.journey = null; });
      await goRoom(p, 'cabin');
      await p.evaluate(async () => (await import('/src/rooms/cabin.ts')).openRoutes());
      const pin = p.locator('.chart-pin.mark[data-id="dock"]');
      await pin.click();
      ok((await state(p)).marks.includes('dock') && await p.locator('.chart-pin.mark[data-id="dock"]').getAttribute('aria-pressed') === 'true', `${lang}: a visited place takes a pencil mark`);
      const over = await p.evaluate(() => { const r = document.querySelector('#routePanel').getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; });
      ok(!over, `${lang}: the chart fits the screen`);
      await p.screenshot({path:`${out}/07-chart-${lang}.png`});
      await p.locator('.chart-pin.set[data-id="echo"]').click();
      ok((await state(p)).call?.to === 'echo' && (await state(p)).call.from === 'dock', `${lang}: setting course on the chart sails from the last place`);
      await context.close();
    }
  }
  ok(errors.length === 0, `no browser errors: ${errors.join('; ')}`);
  console.log(`${pass} checks passed. Screenshots: ${out}`);
} catch (error) {
  const page = browser.contexts().flatMap(c => c.pages()).at(-1);
  if (page) await page.screenshot({path:`${out}/failure.png`});
  throw error;
} finally { await browser.close(); await server.close(); }
