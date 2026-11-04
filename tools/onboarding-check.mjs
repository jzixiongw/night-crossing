/* Run with Node 24+ after npm install. Install playwright separately for UI
   checks: npm i --no-save playwright && npx playwright install chromium.
   PLAYWRIGHT_MODULE and CHROME can point to an existing installation.
   Starts its own Vite server. UI actions complete the first delivery at normal
   speed; dev hooks only assert the resulting state in that flow. The recovery
   section explicitly seeds later-game fixtures for otherwise lengthy checks.
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
async function fresh(lang = 'en', viewport = { width:1440, height:900 }, touch = false){
  const context = await browser.newContext({ viewport, hasTouch:touch, reducedMotion:touch ? 'reduce' : 'no-preference' });
  const p = await context.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://127.0.0.1:8123/?lang=${lang}`);
  await p.locator('#boardMute').waitFor({state:'visible'});
  await p.waitForFunction(() => !document.querySelector('#boardMute').disabled && window.__three);
  await p.locator('#boardMute').click();
  await p.waitForFunction(() => window.__three.scene() && !window.__three.S().camMove);
  await p.locator('#voyageGuide').waitFor({state:'visible'});
  await p.locator('#intro').waitFor({state:'hidden'});
  await p.evaluate(() => document.fonts.ready);
  return { p, context };
}
const state = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__three.G())));
const waitTitle = (p, title, timeout = 20000) => p.locator('#voyageGuide h2').filter({hasText:title}).waitFor({state:'visible',timeout});
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
  await target(p, '打开舷门');
  await target(p, '把灯递过去'); await waitTitle(p, '这一趟送到了');
  g = await state(p);
  ok(g.calls.length === 1 && g.journey.delivered && g.journey.built && !g.rig, 'delivery completes durably after the physical lamp is handed over');
  await p.screenshot({path:`${out}/03-delivered.png`});
  await p.waitForTimeout(8000); await p.reload();
  await p.waitForFunction(() => !document.querySelector('#boardMute').disabled && window.__three);
  await p.locator('#boardMute').click(); await waitTitle(p, '这一趟送到了');
  ok((await state(p)).journey.delivered, 'save and reload retain the completed first delivery');
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
  ok(errors.length === 0, `no browser errors: ${errors.join('; ')}`);
  console.log(`${pass} checks passed. Screenshots: ${out}`);
} catch (error) {
  const page = browser.contexts().flatMap(c => c.pages()).at(-1);
  if (page) await page.screenshot({path:`${out}/failure.png`});
  throw error;
} finally { await browser.close(); await server.close(); }
