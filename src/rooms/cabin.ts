import { tr } from '../i18n';
import { AU } from '../audio/index';
import { M } from '../audio/music';
import { anAsleep, anHere, anWhere } from '../characters/an-lines';
import { breadP, cupSteam, drawAn, drawCupP } from '../characters/an';
import { layerCache } from '../core/cache';
import { CAM, inv, lp, mat, setL, tp } from '../core/camera';
import { drawFX, flare } from '../core/fx';
import { HITS, hit } from '../core/hits';
import { glowL, hole, lightBegin } from '../core/light';
import { MAT } from '../core/materials';
import { SAMBER, SCOOL, SIND, SOFT, SPR_OF, SROSE, STEAL, SWARM, blob, ell, flat, glowAt, leafPath, pat, polyP, rr, shadow, sphere, star5, stemPath, txt, vol, txtFit } from '../core/paint';
import { P, shell } from '../core/shell';
import { RS } from '../core/surface';
import { $, D2R, clamp, hex, lerp, mixHex, mk, mulberry32, pick, rand } from '../core/util';
import { CN, COL, ORDER, ROUTES } from '../data/index';
import { fx } from './radio';
import { ACT, ROOMS, setCtx } from './registry';
import { PR, S } from '../state/runtime';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { AN, addLog, once, onceS, say } from '../ui/captions';
import { K_BS, K_LP, K_NR, K_SP, K_WL } from '../core/depth';
import { anyOpen, closePanels } from '../ui/panels';

/* ================= CABIN ================= */

export const WIN = { left:[176,140,534,374], right:[890,140,534,374] };
export const CAB_SHELL = { kb:K_WL, kf:1.75, b:[96,44,1504,700], f:[-340,-280,1940,1180],
  ceil:[[0,'#3a4c72'],[1,'#141c31']], floor:[[0,'#3a3043'],[.35,'#4b3a48'],[1,'#2a2131']], side:[[0,'#2f3f62'],[1,'#1a2440']], seams:9, seamCol:'rgba(20,10,20,.32)' };
export const spo = () => ({ dx:S.turnX || 0, noRot:true });
export const ROUTE_SKY = { harbor:['#0b1428','#1a2b4d'], nebula:['#140f28','#2c2347'], ring:['#081a24','#16323f'], quiet:['#05080f','#0c1426'] };
export function buildCabin(){
  const R = mulberry32(911);
  S.cStars = []; for (let i=0;i<260;i++){ const big = R() < .12; S.cStars.push({ x:-260 + R()*2100, y:90 + R()*500, r:big ? 1.6 + R()*1.2 : .6 + R()*1, c:R() < .06 ? '#ffd9a3' : R() < .2 ? '#b4cde0' : '#e2ecf5', tw:R() < .2, ph:R()*6.3, sp:R() < .04 }); }
  S.qStars = []; for (let i=0;i<340;i++) S.qStars.push({ x:-260 + R()*2100, y:90 + R()*500, r:.4 + R()*.9, a:.4 + R()*.6 });
  S.dust = []; for (let i=0;i<34;i++) S.dust.push({ x:rand(-200,1800), y:rand(140,540), v:rand(10,32), r:rand(.8,1.6), a:rand(.25,.6) });
  S.slots = [];
  const cat = (x0,y0,x1,y1,sag) => t => [lerp(x0,x1,t), lerp(y0,y1,t) + sag*4*t*(1-t)];
  const c1 = cat(150,96,790,104,120), c2 = cat(810,104,1450,96,120);
  for (let k=0;k<6;k++){ S.slots.push(c1(.12 + k*.152)); } for (let k=0;k<6;k++){ S.slots.push(c2(.12 + k*.152)); }
  S.slots = [0,6,1,7,2,8,3,9,4,10,5,11].map(i => ({ x:S.slots[i][0], y:S.slots[i][1] }));
  S.cat = [c1, c2]; S.meteors = []; S.rw = { harbor:1, nebula:0, ring:0, quiet:0 };
  S.lampA = S.lampA || 0; S.lampV = S.lampV || 0; S.plantA = 0; S.plantV = 0; S.strapA = 0;
}
export function restoreCabin(){ S.bulbs = G.bulbs.map((c,i) => ({ color:c, born:-99, slot:S.slots[i % S.slots.length] })); S.routeVis = G.route; Object.keys(S.rw).forEach(k => S.rw[k] = k === G.route ? 1 : 0); }
export function windowOf(bx, by){
  const [X,Y] = tp(mat(K_SP, spo()), bx, by), q = inv(mat(K_WL), X, Y);
  for (const side of ['left','right']){ const [x,y,w,h] = WIN[side]; if (q.x > x+6 && q.x < x+w-6 && q.y > y+6 && q.y < y+h-6) return side; }
  return null;
}
/* beacons */
export function spawnBeacon(){
  const cols = ROUTES[G.route].colors; if (!cols.length) return;
  const weighted = cols.flatMap(c => (G.answered[c]||0) < 1 ? [c,c] : [c]);
  S.beacons.push({ color:pick(weighted), x:1560, y:rand(210,460), v:rand(20,27), t:rand(0,3), answered:false, hint:0, on:false, fade:1 });
}
export function beaconIntensity(b){
  if (b.answered) return .78 + .12*Math.sin(S.T*1.4 + b.y);
  const cyc = 2.8, tc = b.t % cyc, n = COL[b.color].blinks; let on = false;
  for (let k=0;k<n;k++) if (tc >= k*.44 && tc < k*.44+.24) on = true;
  return on ? 1 : .16;
}
export function updateBeacons(dt){
  S.nextSpawn -= dt; if (S.nextSpawn <= 0){ if (S.beacons.length < 3) spawnBeacon(); const r = ROUTES[G.route].spawn; S.nextSpawn = rand(r[0], r[1]); }
  for (let i=S.beacons.length-1;i>=0;i--){
    const b = S.beacons[i]; b.x -= b.v*dt; b.t += dt; b.hint = Math.max(0, b.hint-dt);
    if (!ROUTES[S.routeVis].colors.includes(b.color) && !b.answered) b.fade = Math.max(0, b.fade - dt*.5);
    if (b.x < -180 || b.fade <= 0){
      if (!b.answered && b.fade > 0 && !PR.focused){ G.passedLights++; markDirty(); }
      S.beacons.splice(i,1); continue;
    }
    const I = beaconIntensity(b), on = I > .5 && !b.answered, w = windowOf(b.x, b.y);
    if (on && !b.on && w && G.lamp > 0) AU.tick(COL[b.color].midi-12, G.lamp===2 ? .018 : .009);
    b.on = on;
    if (w && G.lamp > 0 && !b.answered && once('seen')) say(tr('窗外有一盏灯在闪。闪{0}下，停一停。', CN[COL[b.color].blinks]), null, 300);
  }
}
export function nearestBeacon(p){ let best=null, bd=1e9; S.beacons.forEach(b => { const d = Math.hypot(b.x-p.x, b.y-p.y); if (d < bd){ bd=d; best=b; } }); return bd < 90 ? best : null; }
export function lanternPulse(){ S.lanternPulse = 1; }
export function shine(b){
  const c = ORDER[G.colorIdx];
  AU.whoosh(); lanternPulse();
  flare(K_SP, b.x, b.y-22, COL[c].hex, 8, 60, .7, spo());
  setTimeout(() => (c === b.color ? answer(b) : miss(b)), 520);
}
export function answer(b){
  if (b.answered) return;
  b.answered = true; S.mismatch = 0;
  const C = COL[b.color];
  AU.bell(C.midi, .16); AU.bell(C.midi+7, .07, .32); AU.bell(C.midi-12, .06, .6);
  flare(K_SP, b.x, b.y-22, C.hex, 10, 110, 1.6, spo());
  setTimeout(() => flare(K_SP, b.x, b.y-22, C.hex, 10, 150, 1.8, spo()), 350);
  G.answered[b.color] = (G.answered[b.color]||0) + 1;
  if (!S.firstAnswerAt) S.firstAnswerAt = S.run;
  say(tr('那盏灯亮了一下，回了一声。舱顶的灯串上多了一颗{0}的灯。', C.name));
  G.bulbs.push(b.color); if (G.bulbs.length > 12) G.bulbs.shift();
  setTimeout(() => { S.bulbs = G.bulbs.map((c,i) => ({ color:c, born: i < G.bulbs.length-1 ? -99 : S.T, slot:S.slots[i % S.slots.length] })); AU.bell(C.midi+12, .05); }, 900);
  G.mapDots = (G.mapDots || []).concat([b.color]).slice(-10);
  if (onceS('log-ans-'+b.color)) addLog(tr('回应了一盏「{0}」', C.beacon));
  const asleep = anAsleep();
  if (!G.named.includes(b.color)){ G.named.push(b.color); if (anHere() && !asleep) say(C.line, AN, 3200); else S.pendingNames.push(b.color); }
  else if (anHere() && !asleep && Math.random() < .5) say(tr('又一盏“{0}”。我在图上点了个点。', C.beacon), AN, 3000);
  markDirty();
}
export function miss(b){
  S.mismatch++; b.hint = 3.2; AU.nope();
  if (S.mismatch >= 2) say(tr('它每轮闪{0}下。提灯底座上也有刻痕。', CN[COL[b.color].blinks]));
  else say(tr('那盏灯照着自己的节奏，又闪了几下。'));
}

/* interactions */
export const LAMP_LINES = [[tr('灯亮了。倒影又回到玻璃上。'),tr('灯亮了。')],[tr('灯暗了一档。窗外的星星浮出来一些。'),tr('灯调到中间那档。')],[tr('灯熄了。窗外的东西一下子清楚了。'),tr('灯熄了。')]];
ACT['cab:lamp'] = { tap(){
  G.lamp = (G.lamp+1) % 3; AU.chain();
  S.lampV += G.reduced ? 3 : 14; S.beadT = 0; if (G.lamp === 0) S.filT = 0;
  say(once('lamp'+G.lamp) ? LAMP_LINES[G.lamp][0] : LAMP_LINES[G.lamp][1]);
  markDirty();
}};
ACT['cab:lantern'] = { tap(){
  G.colorIdx = (G.colorIdx+1) % 3; AU.wood(); lanternPulse();
  const C = COL[ORDER[G.colorIdx]];
  say(tr('提灯转到{0}那一格。底座上有{1}道刻痕。', C.name, CN[C.blinks])); markDirty();
}};
export function glassClick(side, e){
  const p = e ? lp(K_SP, e, spo()) : null;
  let b = p ? nearestBeacon(p) : S.beacons.filter(x => windowOf(x.x,x.y)===side).sort((a,c) => a.answered-c.answered)[0] || null;
  const q = e ? lp(K_WL, e) : null;
  if (G.lamp === 0){
    AU.tap(); if (q) flare(K_WL, q.x, q.y, '#f5e6d0', 6, 36, .6);
    say(S.caps.refl ? tr('玻璃上只有舱里的倒影。') : tr('玻璃上只有舱里的倒影，看不清外面。')); S.caps.refl = true; return;
  }
  if (b){ if (b.answered){ AU.bell(COL[b.color].midi, .05); say(tr('这盏已经回过你了。它的光现在是稳的。')); } else shine(b); return; }
  AU.tap(); if (q) flare(K_WL, q.x, q.y, '#dfe9f1', 6, 40, .7);
  if (once('onlyStars')) say(tr('那里只有星星。航标隔一阵会从右边漂过来。'));
}
export function fogAt(x, y){ let f = 0; S.breaths.forEach(b => { const d = Math.hypot(b.x-x, b.y-y); if (d < b.r) f = Math.max(f, b.life*(1 - d/b.r*.6)); }); return f; }
ACT['cab:glass'] = {
  press(args, e, P){
    const side = args[0];
    const ctrl: any = { side, t0:S.T, x:P.x, y:P.y, cx:e.clientX, cy:e.clientY, breath:null, drawing:false, stroke:null, moved:false };
    S.glassHold = ctrl;
    ctrl.move = (ev, Q) => {
      if (Math.hypot(ev.clientX-ctrl.cx, ev.clientY-ctrl.cy) > 7) ctrl.moved = true;
      if (side !== 'left') return;
      const [wx,wy,ww,wh] = WIN.left, x = clamp(Q.x, wx, wx+ww), y = clamp(Q.y, wy, wy+wh);
      if (!ctrl.drawing && ctrl.moved && fogAt(x,y) > .25){
        ctrl.drawing = true; ctrl.stroke = { pts:[], life:1 }; S.strokes.push(ctrl.stroke);
        if (once('draw')) say(tr('指尖在雾上划过。划开的地方透出外面的星星。'));
      }
      if (ctrl.drawing){ const pts = ctrl.stroke.pts, last = pts[pts.length-1]; if (!last || Math.hypot(last[0]-x, last[1]-y) > 4){ pts.push([x,y]); ctrl.stroke.life = 1; } }
    };
    ctrl.up = (ev, moved, cancel) => {
      S.glassHold = null;
      if (ctrl.breath) ctrl.breath.holding = false;
      if (ctrl.drawing){ if (ctrl.stroke.pts.length > 1){ G.draws++; S.sessionDraws = (S.sessionDraws||0)+1; markDirty(); } return; }
      if (cancel || ctrl.breath || ctrl.moved) return;
      glassClick(side, ev);
    };
    return ctrl;
  },
  key(args){ glassClick(args[0], null); }
};
export function updateGlass(dt){
  const h = S.glassHold;
  if (h && h.side === 'left' && !h.moved && S.T - h.t0 > .38 && !h.breath){
    const [wx,wy,ww,wh] = WIN.left;
    h.breath = { x:clamp(h.x, wx+14, wx+ww-14), y:clamp(h.y, wy+14, wy+wh-14), r:20, life:1, holding:true };
    S.breaths.push(h.breath); AU.nz(1.4,{type:'lowpass',f:700,q:.4,vol:.05,att:.5});
    if (once('breath')) say(tr('你对着玻璃哈了一口气。起雾的地方可以画。'));
  }
  for (let i=S.breaths.length-1;i>=0;i--){ const b = S.breaths[i]; if (b.holding) b.r = Math.min(150, b.r + dt*110); else b.life -= dt/50; if (b.life <= 0) S.breaths.splice(i,1); }
  for (let i=S.strokes.length-1;i>=0;i--){ const s = S.strokes[i]; s.life -= dt/45; if (s.life <= 0) S.strokes.splice(i,1); }
}
ACT['cab:blanket'] = { tap(){
  G.blanket = !G.blanket; AU.soft();
  say(G.blanket ? tr('你把毯子拿过来，搭在腿上。毯子有点旧，很厚。') : tr('毯子叠好，放回长椅上。'));
  if (G.blanket && once('blanketTalk') && anHere() && !anAsleep()) say(tr('那条毯子是船上的，随便用。'), AN, 3400);
  markDirty();
}};
export const PLANT = [tr('叶子晃了晃。'),tr('叶子背面有一层细绒毛。'),tr('盆土是湿的，有人浇过水。'),tr('一片新叶还卷着。')];
export let plantI = 0;
ACT['cab:plant'] = { tap(){ S.plantV += G.reduced ? 4 : 16; AU.leaf(); say(PLANT[plantI++ % PLANT.length]); } };
ACT['cab:route'] = { tap(){ openRoutes(); } };
ACT['cab:vase'] = { tap(){
  AU.tap();
  if (!G.vase){ say(once('vaseEmpty') ? tr('一只空的小花瓶。温室里的花开了，可以剪一枝来。') : tr('瓶子还空着。')); return; }
  say({ vine:tr('星藤的花在瓶里亮着，五个尖。'), bell:tr('月铃垂在瓶口。碰一下，它轻轻响了。'), fern:tr('一枝雾蕨，叶尖上挂着水珠。') }[G.vase]);
  if (G.vase === 'bell') AU.bell(86,.04);
}};
/* routes */
export function renderRoutes(){
  const list = $('#routeList'); list.innerHTML = '';
  ['nebula','ring','quiet','harbor'].forEach(r => {
    const R = ROUTES[r], b = document.createElement('button'); b.type='button'; if (r===G.route) b.classList.add('cur');
    const dots = [...new Set<string>(R.colors)].map(c => `<i style="background:${COL[c].hex}"></i>`).join('') || '<i style="background:transparent;border:1px solid #97a9bf"></i>';
    b.innerHTML = tr('<span class="rname">{0}{1}</span><span class="rdots">{2}</span><span class="rdesc">{3}</span>', R.name, r===G.route?tr('<span class="rcur">当前</span>'):'', dots, R.desc);
    b.addEventListener('click', () => setRoute(r));
    list.appendChild(b);
  });
}
export function openRoutes(){ closePanels(); renderRoutes(); $('#routePanel').hidden = false; AU.paper(); }
export function setRoute(r){
  closePanels();
  if (r === G.route){ say(tr('照现在这样走。')); return; }
  G.route = r; if (!G.visited.includes(r)) G.visited.push(r);
  S.turn = { t:0, dur:4.5, to:r, swapped:false };
  say(tr('船身微微一斜，开始转弯。')); M.next = .5;
  addLog(tr('航道改为「') + tr(ROUTES[r].name) + tr('」')); markDirty();
}
export function finishTurn(r){
  const R = ROUTES[r];
  if (r === 'ring') S.ringX = 1900;
  if (S.room === 'cabin'){
    say(R.arrive);
    if (anHere()){ if (r !== 'quiet' && S.asleepRoute){ S.asleepRoute = false; say(tr('岸醒了，揉了揉眼睛。')); } else if (!anAsleep()) say(R.say, AN, 3400); }
  }
  S.nextSpawn = rand(4,8);
}
$('#routeLater').onclick = () => { closePanels(); say(tr('照现在这样走。')); };

/* ---- static art ---- */
export function cabWallArt(g){
  const [x0,y0,x1,y1] = CAB_SHELL.b;
  const wg = g.createLinearGradient(0, y0, 0, y1); wg.addColorStop(0, '#3e537c'); wg.addColorStop(.5, '#4a618b'); wg.addColorStop(1, '#33466c');
  g.fillStyle = wg; g.fillRect(x0, y0, x1-x0, y1-y0);
  const pw = (x1-x0)/12;
  for (let i=0;i<12;i++){ const px = x0 + i*pw; vol(g, cc => rr(cc, px+5, y0+46, pw-10, 488, 12), MAT.wall, { k:2.5, s:6, r:1.5, tex:.5 }); }
  vol(g, cc => rr(cc, x0, 552, x1-x0, 148, 0), MAT.wall2, { k:2, s:5, tex:.5, g:[552, 700, 'rgba(0,0,0,0)', 'rgba(6,10,22,.35)'] });
  vol(g, cc => rr(cc, x0, 540, x1-x0, 18, 6), MAT.frame, { k:1.5, s:3.5 });
  for (const [x,n] of [[300,10],[950,14]]) for (let k=0;k<n;k++) flat(g, cc => rr(cc, x + k*28, 600, 12, 52, 6), '#16213a', .55);
  vol(g, cc => rr(cc, x0, y0, x1-x0, 30, 0), MAT.wall2, { k:1.5, s:4 });
  vol(g, cc => rr(cc, x0, y0+30, x1-x0, 14, 7), MAT.metalD, { k:1, s:3 });
  // cut the windows, then frame them
  g.save(); g.globalCompositeOperation = 'destination-out';
  for (const s of ['left','right']){ const [x,y,w,h] = WIN[s]; g.beginPath(); rr(g, x, y, w, h, 70); g.fill(); } g.restore();
  for (const s of ['left','right']){ const [x,y,w,h] = WIN[s];
    shadow(g, x + w/2, y + h + 40, w*.55, 18, .5);
    vol(g, cc => { rr(cc, x-26, y-26, w+52, h+52, 92); rr(cc, x, y, w, h, 70); }, MAT.frame, { k:4, s:10, r:2.5, eo:true, hl:[x+60, y-10, 160, .2] });
    for (let k=0;k<7;k++){ const xx = x + 90 + k*60; for (const yy of [y-14, y+h+14]) vol(g, cc => ell(cc, xx, yy, 4, 4), MAT.metal, { k:.6, s:1.4, tex:0 }); }
    for (let k=0;k<4;k++){ const yy = y + 90 + k*67; for (const xx of [x-14, x+w+14]) vol(g, cc => ell(cc, xx, yy, 4, 4), MAT.metal, { k:.6, s:1.4, tex:0 }); }
    vol(g, cc => rr(cc, x-30, y+h+22, w+60, 20, 8), MAT.metalD, { k:1.5, s:4 }); }
  // route sign plate
  shadow(g, 800, 498, 70, 10, .4);
  vol(g, cc => rr(cc, 738, 386, 124, 104, 14), MAT.paper, { k:2, s:5, r:1.5 });
  for (const [x,y] of [[750,398],[850,398],[750,478],[850,478]]) vol(g, cc => ell(cc, x, y, 3.5, 3.5), MAT.brass, { k:.5, s:1.2, tex:0 });
  txt(g, tr('航 道'), 800, 418, 15, '#7d7a72');
  flat(g, cc => rr(cc, 756, 426, 88, 2, 1), '#c4b392');
}
export function cabMidArt(g){
  // rug
  shadow(g, 800, 812, 560, 50, .45);
  vol(g, cc => ell(cc, 800, 806, 520, 52), { l:'#8a6070', b:'#6b4757', d:'#43293a', r:'#7d5466' }, { k:2, s:6, tex:.7 });
  flat(g, cc => { ell(cc, 800, 806, 470, 40); ell(cc, 800, 806, 450, 34); }, '#c99a6a', .35);
  // bench (left) + cushions
  shadow(g, 350, 706, 260, 22, .6);
  for (const x of [176, 520]) vol(g, cc => rr(cc, x-9, 640, 18, 64, 6), MAT.woodD, { k:2, s:5 });
  vol(g, cc => rr(cc, 148, 520, 424, 98, 30), MAT.cushion, { k:5, s:12, r:3, hl:[240,530,140,.15] });
  vol(g, cc => rr(cc, 156, 596, 410, 56, 22), MAT.cushion, { k:4, s:10, r:2.5, hl:[260,600,160,.2] });
  flat(g, cc => { rr(cc, 290, 528, 4, 84, 2); rr(cc, 430, 528, 4, 84, 2); }, '#364d70', .5);
  // plant pot
  shadow(g, 640, 760, 70, 12, .55);
  vol(g, cc => { cc.moveTo(598,694); cc.lineTo(682,694); cc.lineTo(670,758); cc.lineTo(610,758); cc.closePath(); }, MAT.pot, { k:3, s:8, r:2, hl:[620,710,40,.25] });
  vol(g, cc => rr(cc, 590, 682, 100, 20, 8), MAT.pot, { k:1.5, s:4 });
  flat(g, cc => ell(cc, 640, 684, 44, 6), '#3b2a26');
  // armchair (right)
  shadow(g, 1222, 760, 160, 20, .6);
  for (const x of [1136, 1306]) vol(g, cc => rr(cc, x-8, 700, 16, 58, 6), MAT.woodD, { k:2, s:5 });
  vol(g, cc => rr(cc, 1112, 446, 220, 230, 60), MAT.plum, { k:6, s:14, r:3, hl:[1170,470,120,.18] });
  vol(g, cc => rr(cc, 1096, 600, 54, 112, 24), MAT.plum, { k:4, s:9, r:2 });
  vol(g, cc => rr(cc, 1294, 600, 54, 112, 24), MAT.plum, { k:4, s:9, r:2 });
  vol(g, cc => rr(cc, 1140, 632, 164, 70, 22), MAT.plum, { k:3, s:8, r:2, hl:[1200,640,90,.18] });
  // side table
  shadow(g, 1420, 762, 70, 12, .55);
  vol(g, cc => rr(cc, 1412, 610, 16, 148, 6), MAT.woodD, { k:2, s:5 });
  vol(g, cc => ell(cc, 1420, 756, 44, 8), MAT.woodD, { k:1.5, s:4 });
  vol(g, cc => ell(cc, 1420, 606, 66, 14), MAT.wood, { k:2, s:5, hl:[1400,600,50,.2] });
}
export function cabNearArt(g){
  shadow(g, 800, 820, 620, 40, .5);
  const top = cc => { cc.moveTo(330,792); cc.lineTo(1270,792); cc.quadraticCurveTo(1310,792, 1330,830); cc.lineTo(1400,980); cc.lineTo(200,980); cc.lineTo(270,830); cc.quadraticCurveTo(290,792, 330,792); cc.closePath(); };
  vol(g, top, MAT.wood, { k:-3, s:-6, lx:.4, ly:.9, r:0, tex:.6, g:[792, 900, 'rgba(255,220,170,.12)', 'rgba(20,10,10,.3)'] });
  flat(g, cc => { for (let i=1;i<6;i++){ const t = i/6; cc.moveTo(lerp(330,200,0) + t*940 - 2, 794); cc.lineTo(330 + t*940 + 2, 794); cc.lineTo(200 + t*1200 + 3, 980); cc.lineTo(200 + t*1200 - 3, 980); cc.closePath(); } }, '#5c3927', .3);
  vol(g, cc => rr(cc, 300, 786, 1000, 14, 7), MAT.wood, { k:1.5, s:3.5 });
  // seat back, lower right
  vol(g, cc => rr(cc, 1430, 700, 300, 300, 80), MAT.navy, { k:6, s:14, r:3, ra:.5 });
}
/* ---- live drawing ---- */
export function drawSpace(c, dt){
  const w = S.rw, o = spo();
  setL(c, K_SP, o);
  const mix = (i) => { let r=0,g2=0,b=0; for (const k in w){ const A = hex(ROUTE_SKY[k][i]); r += A[0]*w[k]; g2 += A[1]*w[k]; b += A[2]*w[k]; } return `rgb(${r|0},${g2|0},${b|0})`; };
  const sg = c.createLinearGradient(0, 80, 0, 620); sg.addColorStop(0, mix(0)); sg.addColorStop(1, mix(1)); c.fillStyle = sg; c.fillRect(-400, -100, 2400, 900);
  const vis = .2 + S.vis*.8;
  // nebula
  if (w.nebula > .01){ const nx = Math.sin(S.T*.03)*40; c.globalAlpha = w.nebula*.55; c.drawImage(SROSE, 200+nx, 120, 760, 420); c.drawImage(STEAL, 760+nx, 180, 820, 380); c.globalAlpha = w.nebula*.4; c.drawImage(SIND, 400+nx, 60, 900, 520); c.globalAlpha = 1; }
  // far planet
  c.globalAlpha = w.nebula > .5 ? .45 : 1; sphere(c, 1262, 232, 44, { l:'#a9c7e6', b:'#5f80ad', d:'#2b4068', r:'#8fb0d4' }, { bands:'#dfe9f3' }); c.globalAlpha = 1;
  // stars
  S.cStars.forEach(s => { const tw = s.tw ? .55 + .45*Math.sin(S.T*1.1 + s.ph) : 1; c.globalAlpha = vis*tw; c.fillStyle = s.c;
    if (s.r > 1.5){ c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI*2); c.fill(); if (s.sp){ c.globalAlpha = vis*tw*.7; c.fillRect(s.x - 7, s.y - .6, 14, 1.2); c.fillRect(s.x - .6, s.y - 7, 1.2, 14); } }
    else c.fillRect(s.x, s.y, s.r*1.5, s.r*1.5); });
  if (w.quiet > .01){ c.fillStyle = '#dfe9f3'; S.qStars.forEach(s => { c.globalAlpha = w.quiet*s.a*vis; c.fillRect(s.x, s.y, s.r*1.5, s.r*1.5); }); }
  c.globalAlpha = 1;
  // ring planet
  if (w.ring > .01){ c.save(); c.globalAlpha = w.ring; c.translate(S.ringX, 400); c.rotate(-12*D2R);
    const ringP = (front) => { c.save(); c.beginPath(); c.rect(-500, front ? 0 : -200, 1000, 200); c.clip();
      const rg = c.createLinearGradient(-420, 0, 420, 0); rg.addColorStop(0, 'rgba(180,215,210,.1)'); rg.addColorStop(.5, 'rgba(220,240,232,.75)'); rg.addColorStop(1, 'rgba(150,190,190,.15)');
      c.beginPath(); ell(c, 0, 0, 430, 78); ell(c, 0, 0, 320, 50); c.fillStyle = rg; c.fill('evenodd');
      c.globalAlpha *= .5; c.beginPath(); ell(c, 0, 0, 380, 66); ell(c, 0, 0, 372, 64); c.fillStyle = '#0b1a24'; c.fill('evenodd'); c.restore(); };
    ringP(false); sphere(c, 0, 0, 210, { l:'#b9e4d6', b:'#5f9e98', d:'#20484f', r:'#7ec0b4' }, { bands:'#e7f6ef', lx:-.8, ly:-.4 }); ringP(true); c.restore(); }
  // harbor
  if (w.harbor > .01){ const hx = -Math.min(S.harborT, 180)*.4, a = w.harbor*Math.max(.08, 1 - S.harborT/180);
    c.save(); c.translate(hx, 0); c.globalAlpha = a;
    flat(c, cc => blob(cc, [[60,560],[120,512],[260,500],[420,508],[560,530],[600,580],[60,590]]), '#0a1222');
    for (let i=0;i<16;i++){ const x = 120 + i*28 + (i%3)*6, y = 520 + (i%4)*9; c.globalCompositeOperation = 'lighter'; glowAt(c, SWARM, x, y, 10, a*.8); c.fillStyle = '#ffd9a3'; c.globalAlpha = a; c.fillRect(x-1.2, y-1.2, 2.4, 2.4); c.globalCompositeOperation = 'source-over'; }
    flat(c, cc => rr(cc, 414, 430, 12, 84, 4), '#0d1729');
    if (S.T % 4 < .5){ c.globalCompositeOperation = 'lighter'; glowAt(c, SWARM, 420, 428, 50, a); c.globalCompositeOperation = 'source-over'; }
    c.restore(); }
  // dust + meteors
  c.fillStyle = '#b4cde0';
  S.dust.forEach(d => { d.x -= d.v*dt*(S.routeVis==='quiet'?.6:1); if (d.x < -220) d.x = 1820; c.globalAlpha = d.a*vis; c.beginPath(); c.arc(d.x, d.y, d.r, 0, Math.PI*2); c.fill(); });
  for (let i=S.meteors.length-1;i>=0;i--){ const m = S.meteors[i]; m.t += dt; const q = m.t/1.3; if (q >= 1){ S.meteors.splice(i,1); continue; }
    const x = m.x - q*260, y = m.y + q*96; const gr = c.createLinearGradient(x, y, x + 80, y - 30); gr.addColorStop(0, 'rgba(238,245,251,.9)'); gr.addColorStop(1, 'rgba(238,245,251,0)');
    c.globalAlpha = Math.sin(Math.PI*q); c.strokeStyle = gr; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 80, y - 30); c.stroke(); }
  c.globalAlpha = 1;
  // beacons
  S.beacons.forEach(b => {
    const I = beaconIntensity(b), vis2 = S.vis * b.fade, boost = b.hint > 0 ? 1.35 : 1, C = COL[b.color];
    c.save(); c.translate(b.x, b.y + Math.sin(b.t*.9)*4); c.globalAlpha = Math.max(.25, b.fade);
    vol(c, cc => { cc.moveTo(-12,16); cc.lineTo(0,-10); cc.lineTo(12,16); cc.quadraticCurveTo(0,22,-12,16); cc.closePath(); }, { l:'#4a6188', b:'#1c2a48', d:'#0b1222', r:C.hex }, { k:1, s:3, ra:.6*I, tex:0 });
    flat(c, cc => rr(cc, -1.3, -22, 2.6, 13, 1.3), '#5f7899');
    c.globalAlpha = (.3 + .7*I)*Math.max(vis2, .12); c.fillStyle = C.hex; c.beginPath(); c.arc(0, -23, 5.5, 0, Math.PI*2); c.fill();
    c.globalCompositeOperation = 'lighter'; glowAt(c, SPR_OF[b.color], 0, -23, 64, Math.min(1, I*boost)*vis2*.95);
    c.restore(); });
}
export function drawBulbs(c){
  setL(c, K_BS);
  c.strokeStyle = '#1c2742'; c.lineWidth = 2.6; c.lineCap = 'round';
  S.cat.forEach(f => { c.beginPath(); for (let t=0;t<=1.0001;t+=.05){ const [x,y] = f(t); t ? c.lineTo(x,y) : c.moveTo(x,y); } c.stroke(); });
  S.bulbs.forEach((b,i) => { const pop = Math.min(1, (S.T - b.born)/.6), C = COL[b.color]; const { x, y } = b.slot;
    c.save(); c.translate(x, y);
    flat(c, cc => rr(cc, -1, 0, 2, 9, 1), '#8fa7c4');
    vol(c, cc => rr(cc, -5, 7, 10, 8, 2), MAT.metalD, { k:.6, s:1.5, tex:0 });
    c.translate(0, 13*(1-pop)); c.scale(.4 + .6*pop, .4 + .6*pop);
    vol(c, cc => { cc.moveTo(0,13); cc.bezierCurveTo(10,16,11,30,0,36); cc.bezierCurveTo(-11,30,-10,16,0,13); cc.closePath(); }, { l:mixHex(C.hex,'#ffffff',.55), b:C.hex, d:mixHex(C.hex,'#1a2238',.35), r:'#fff4e0' }, { k:1.2, s:3, tex:0 });
    c.restore(); });
}
export function lampPos(){ const a = S.lampA*D2R; return [800 + Math.sin(a)*230, 44 + Math.cos(a)*230]; }
export function drawLamp(c){
  setL(c, K_LP);
  c.save(); c.translate(800, 44); c.rotate(-S.lampA*D2R); c.translate(-800, -44);
  vol(c, cc => rr(cc, 796, 30, 8, 166, 4), MAT.metalD, { k:.8, s:2, tex:0 });
  const fil = S.lampFil ?? 1, on = [1,.5,0][G.lamp]*fil;
  vol(c, cc => ell(cc, 800, 270, 17, 14), { l:'#fff6dc', b:on > .3 ? '#ffe2b0' : '#9a8a72', d:on > .3 ? '#e8b878' : '#5a4a3a', r:'#fff' }, { k:1, s:3, tex:0 });
  vol(c, cc => { cc.moveTo(724,266); cc.bezierCurveTo(730,214, 760,192, 800,190); cc.bezierCurveTo(840,192, 870,214, 876,266); cc.quadraticCurveTo(800,256,724,266); cc.closePath(); }, MAT.teal, { k:4, s:10, r:2, hl:[770,206,50,.3] });
  flat(c, cc => ell(cc, 800, 263, 76, 9), '#0e1b24', .55);
  if (on > .1){ c.globalCompositeOperation = 'lighter'; c.globalAlpha = on*.55; c.beginPath(); ell(c, 800, 264, 66, 6); c.fillStyle = '#ffd59a'; c.fill(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
  vol(c, cc => rr(cc, 788, 182, 24, 14, 5), MAT.brass, { k:.8, s:2, tex:0 });
  const by = S.beadT < .3 ? Math.sin(S.beadT/.3*Math.PI)*16 : 0;
  flat(c, cc => rr(cc, 841, 262, 2, 70 + by, 1), '#c9a26a');
  vol(c, cc => ell(cc, 842, 336 + by, 7, 7), MAT.brass, { k:.8, s:2, tex:0 });
  hit(c, 'cab:lamp', ['r', 720, 180, 160, 100], { label:tr('灯绳'), key:'lamp' });
  hit(c, 'cab:lamp', ['r', 822, 260, 40, 96 + by], { key:'lamp2' });
  c.restore();
}
export function drawLantern(c, x, y){
  const C = COL[ORDER[G.colorIdx]];
  c.save(); c.translate(x, y);
  shadow(c, 0, 4, 54, 9, .5);
  vol(c, cc => rr(cc, -38, -16, 76, 20, 6), MAT.woodD, { k:1.5, s:4 });
  for (let k=0;k<C.blinks;k++) flat(c, cc => rr(cc, -(C.blinks-1)*9 + k*18 - 3, -12, 6, 12, 3), '#f2dfc0', .85);
  vol(c, cc => rr(cc, -30, -94, 60, 80, 14), { l:mixHex(C.hex,'#ffffff',.5), b:C.hex, d:mixHex(C.hex,'#1a2238',.4), r:'#fff4e0' }, { k:2, s:6, hl:[-10,-70,30,.4] });
  for (const xx of [-30, 26]) vol(c, cc => rr(cc, xx, -98, 4, 86, 2), MAT.brass, { k:.6, s:1.5, tex:0 });
  vol(c, cc => rr(cc, -34, -104, 68, 14, 6), MAT.brass, { k:1, s:3, tex:0 });
  vol(c, cc => { cc.moveTo(-22,-104); cc.bezierCurveTo(-22,-140, 22,-140, 22,-104); cc.lineTo(16,-104); cc.bezierCurveTo(16,-132, -16,-132, -16,-104); cc.closePath(); }, MAT.brass, { k:1, s:3, tex:0 });
  hit(c, 'cab:lantern', ['r', -44, -140, 88, 150], { label:tr('提灯') });
  c.restore();
}
export function drawTicketObj(c, x, y){
  c.save(); c.translate(x, y); c.rotate(-.05);
  shadow(c, 4, 6, 92, 12, .4);
  vol(c, cc => rr(cc, -88, -38, 176, 62, 6), MAT.paper, { k:1.4, s:3, r:1 });
  flat(c, cc => { for (let i=0;i<8;i++) ell(cc, 44, -32 + i*8, 1.4, 1.4); }, '#b4a181', .9);
  txt(c, tr('夜航'), -50, -6, 21, '#2a3550');
  txt(c, 'NIGHT · No.' + G.no, -50, 12, 8, '#7d7a72', { mono:true, ls:1 });
  ORDER.filter(cl => G.answered[cl] > 0).forEach((cl,i) => flat(c, cc => ell(cc, 66, -22 + i*16, 5.5, 5.5), COL[cl].hex));
  hit(c, 'ui:ticket', ['r', -90, -40, 180, 66], { label:tr('船票') });
  c.restore();
}
export function drawVase(c, x, y){
  c.save(); c.translate(x, y);
  shadow(c, 0, 2, 30, 6, .45);
  const v = G.vase;
  if (v === 'vine'){ flat(c, cc => stemPath(cc, 0,-40, -6,-70, 0,-96, 2.4, 1.6), '#2f5f5a'); vol(c, cc => ell(cc, -10, -66, 10, 5, -.5), MAT.leaf, { k:.8, s:2, tex:0 });
    [[0,-98],[-18,-82],[16,-76]].forEach(([fx,fy]) => { c.globalCompositeOperation = 'lighter'; glowAt(c, SAMBER, fx, fy, 22, .5); c.globalCompositeOperation = 'source-over'; vol(c, cc => star5(cc, fx, fy, 10), MAT.amber, { k:.8, s:2, tex:0 }); }); }
  else if (v === 'bell'){ flat(c, cc => { stemPath(cc, 0,-40, 8,-80, 34,-84, 2, 1.4); stemPath(cc, 0,-40, -10,-74, -30,-78, 2, 1.4); }, '#2f5f5a');
    [[34,-80],[-30,-74]].forEach(([bx,by]) => vol(c, cc => { cc.moveTo(bx-10, by+20); cc.bezierCurveTo(bx-10, by+4, bx+10, by+4, bx+10, by+20); cc.lineTo(bx+12, by+24); cc.lineTo(bx-12, by+24); cc.closePath(); }, MAT.glass, { k:1, s:2.5, tex:0 })); }
  else if (v === 'fern'){ flat(c, cc => stemPath(cc, 0,-40, 4,-70, 16,-100, 2, 1.2), '#2f5f5a');
    for (let k=0;k<6;k++){ const yy = -50 - k*9, xx = 1 + k*2.6; vol(c, cc => { ell(cc, xx-8, yy, 8, 3, -.35); ell(cc, xx+8, yy-2, 8, 3, .35); }, MAT.leaf, { k:.6, s:1.5, tex:0 }); } }
  vol(c, cc => { cc.moveTo(-8,-46); cc.lineTo(8,-46); cc.lineTo(9,-34); cc.bezierCurveTo(26,-26, 24,0, 0,0); cc.bezierCurveTo(-24,0, -26,-26, -9,-34); cc.closePath(); }, { l:'#d9eef0', b:'#9cc4c8', d:'#5f8a92', r:'#e8f6f6' }, { k:1.5, s:4, hl:[-8,-22,12,.5] });
  hit(c, 'cab:vase', ['r', -30, -110, 60, 112], { label:tr('花瓶') });
  c.restore();
}
export function drawBreadPlate(c, x, y){
  c.save(); c.translate(x, y);
  vol(c, cc => ell(cc, 0, 0, 62, 14), MAT.cream, { k:-1.5, s:-3, lx:.4, ly:.9, r:0, tex:0 });
  flat(c, cc => ell(cc, 0, -1, 46, 9), '#d8c7a6', .6);
  if (G.breads.length) breadP(c, G.breads[0].shape, 0, 2, .7);
  if (G.breads.length) hit(c, 'bread:eat', ['r', -64, -40, 128, 56], { label:tr('面包') });
  c.restore();
}
export function drawMoth(c){
  setL(c, 1); c.save(); c.translate(S.mx, S.my);
  const w = .35 + .65*Math.abs(Math.sin(S.T*(G.reduced?4:17)));
  c.save(); c.scale(w, 1); vol(c, cc => { ell(cc, -7, -1, 7, 4.5, -.3); ell(cc, 7, -1, 7, 4.5, .3); }, { l:'#efe6d6', b:'#cfc3ad', d:'#9a8f7c' }, { k:.6, s:1.4, tex:0 }); c.restore();
  flat(c, cc => ell(cc, 0, 0, 1.6, 4), '#6a5e4c');
  c.restore();
}
export function drawFog(c){
  const [wx,wy,ww,wh] = WIN.left;
  if (!S.breaths.length && !S.strokes.length) return;
  if (!S.fogC || S.fogRS !== RS){ S.fogC = mk(ww*RS, wh*RS); S.fogRS = RS; }
  const f = S.fogC.getContext('2d'); f.setTransform(1,0,0,1,0,0); f.clearRect(0,0,S.fogC.width,S.fogC.height); f.setTransform(RS,0,0,RS,-wx*RS,-wy*RS);
  S.breaths.forEach(b => { f.globalAlpha = Math.min(1, b.life*1.3); const r = b.r*1.3; f.drawImage(SOFT, b.x - r, b.y - r, r*2, r*2); f.drawImage(SOFT, b.x - r*.7, b.y - r*.7, r*1.4, r*1.4); });
  f.globalAlpha = 1; f.globalCompositeOperation = 'destination-out'; f.lineCap = 'round'; f.lineJoin = 'round';
  S.strokes.forEach(s => { if (s.pts.length < 2) return; for (const [lw,a] of [[34,.35],[22,1]]){ f.globalAlpha = Math.min(1, s.life*1.4)*a; f.lineWidth = lw; f.beginPath(); s.pts.forEach(([x,y],i) => i ? f.lineTo(x,y) : f.moveTo(x,y)); f.stroke(); } });
  f.globalCompositeOperation = 'source-in'; f.globalAlpha = 1; f.fillStyle = G.lamp === 2 ? '#a9bccc' : '#dde8f0'; f.fillRect(wx, wy, ww, wh); f.globalCompositeOperation = 'source-over';
  setL(c, K_WL); c.save(); c.beginPath(); rr(c, wx, wy, ww, wh, 70); c.clip(); c.globalAlpha = .62; c.drawImage(S.fogC, wx, wy, ww, wh); c.restore(); c.globalAlpha = 1;
}

ROOMS.cabin = {
  zc:[800, 450],
  enter(){
    setCtx([]); S.nextSpawn = 3; S.vis = [.1,.55,1][G.lamp];
    const where = anWhere();
    if (once('cabinFirst')) say(tr('客舱。舱灯开着，窗玻璃上映着舱里的东西。'), null, 300);
    else if (where === 'cabinSleep') say(tr('客舱里很静。岸已经睡了。'), null, 300);
    if (S.pendingNames.length && anHere() && !anAsleep()) say(tr('刚才你回应的那盏灯，我认得。点我一下，我跟你说。'), AN, 2400);
  },
  exit(){ S.beacons = []; S.glassHold = null; CAM.rot = 0; },
  update(dt){
    const k = G.reduced ? .2 : 1;
    G.lampTime[G.lamp] += dt;
    let turnX = 0;
    if (S.turn){ S.turn.t += dt; const q = clamp(S.turn.t/S.turn.dur, 0, 1); turnX = -Math.sin(Math.PI*q)*220*(G.reduced?.3:1);
      if (q > .5 && !S.turn.swapped){ S.turn.swapped = true; S.routeVis = S.turn.to; }
      if (q >= 1){ const r = S.turn.to; S.turn = null; finishTurn(r); } }
    S.turnX = turnX;
    for (const r in S.rw) S.rw[r] += ((r === S.routeVis ? 1 : 0) - S.rw[r])*(1-Math.exp(-dt*.9));
    CAM.rot = (Math.sin(S.T*.55)*.35*k + (S.turn ? Math.sin(Math.PI*clamp(S.turn.t/S.turn.dur,0,1))*1.1*k : 0))*D2R;
    CAM.lift = Math.sin(S.T*.8)*2*k;
    const visT = [.1,.55,1][G.lamp]; S.vis += (visT - S.vis)*(1-Math.exp(-dt*2.5));
    S.filT = (S.filT ?? 1) + dt; S.lampFil = G.lamp === 0 ? Math.min(1, S.filT/.6) * (S.filT < .25 ? (Math.random() < .5 ? .4 : 1) : 1) : 1;
    const here = anHere(), asleep = anAsleep();
    const wantRead = here && G.lamp === 2 && !asleep;
    if (wantRead !== S.reading){ S.readTimer += dt; if (S.readTimer > (wantRead ? 1.3 : .6)){ S.reading = wantRead; S.readTimer = 0; if (wantRead){ AU.tap(); if (onceS('readLamp')) say(tr('岸拧亮了自己的小灯。')); } } } else S.readTimer = 0;
    S.readGlow = (S.readGlow || 0) + ((S.reading ? 1 : 0) - (S.readGlow || 0))*(1-Math.exp(-dt*4));
    if (S.routeVis === 'harbor') S.harborT += dt;
    if (S.routeVis === 'ring'){ S.ringX -= dt*7; if (S.ringX < -650) S.ringX = 2000; }
    if (G.route === 'quiet' && !S.turn){ S.quietT += dt; if (S.quietT > 18 && !S.asleepRoute && here){ S.asleepRoute = true; say(tr('岸把航图盖在腿上，睡着了。')); } } else { S.quietT = 0; }
    if (S.routeVis === 'quiet'){ S.nextMeteor -= dt; if (S.nextMeteor <= 0){ S.nextMeteor = rand(5,11); S.meteors.push({ x:rand(300,1500), y:rand(150,300), t:0 }); } }
    updateBeacons(dt); updateGlass(dt);
    S.lampV += (-7*S.lampA - 1.1*S.lampV + Math.cos(S.T*.55)*.6*k)*dt; S.lampA += S.lampV*dt;
    S.beadT += dt;
    S.plantV += (-30*S.plantA - 3*S.plantV)*dt; S.plantA += S.plantV*dt;
    S.lanternPulse = Math.max(0, (S.lanternPulse || 0) - dt*1.2);
    let mx, my;
    const lpz = lampPos();
    if (G.lamp < 2){ mx = lpz[0] + Math.cos(S.T*1.3)*70; my = lpz[1] + 10 + Math.sin(S.T*1.9)*30; }
    else if (S.reading){ mx = 1398 + Math.cos(S.T*1.6)*42; my = 470 + Math.sin(S.T*2.1)*24; }
    else if (S.bulbs.length){ const s = S.bulbs[S.bulbs.length-1].slot; mx = s.x + Math.cos(S.T*1.5)*30; my = s.y + 50 + Math.sin(S.T*2)*16; }
    else { mx = 440 + Math.cos(S.T*.9)*60; my = 300 + Math.sin(S.T*1.2)*40; }
    S.mx = S.mx ?? mx; S.my = S.my ?? my; S.mx += (mx - S.mx)*(1-Math.exp(-dt*1.5)); S.my += (my - S.my)*(1-Math.exp(-dt*1.5));
    S.cabinT = (S.cabinT || 0) + dt;
    if (S.cabinT > 9 && G.flags.lamp1 === undefined && G.flags.lamp2 === undefined && onceS('lampHint')) say(tr('灯罩下面垂着一根灯绳。'));
    const ready = (S.firstAnswerAt && S.run - S.firstAnswerAt > 7) || S.cabinT > 110;
    if (ready && !G.junction && !S.turn && !anyOpen()){ G.junction = true; markDirty();
      if (anHere() && !asleep) say(tr('前面要分岔了。往哪边走都行，我都画。'), AN); setTimeout(() => { if (S.room === 'cabin') openRoutes(); }, 1800); }
    if (PR.idleT > 150 && here && !asleep && !G.blanket && onceS('anBlanket')){ G.blanket = true; AU.soft(); say(tr('你好一会儿没动。岸把毯子拿过来，搭在你腿上。')); markDirty(); }
    if (S.cabinT > 45 && once('doorHint')) say(tr('左边是舱门。出去是环廊，沿着它能走到别的舱。'));
  },
  back(c, dt){ drawSpace(c, dt); },
  room(c){
    const sh = shell(c, CAB_SHELL);
    // door on the left side wall
    const d0 = P(K_WL, 96, 700), d1 = P(K_WL, 96, 250), d2 = P(1.35, -40, 120), d3 = P(1.35, -40, 980);
    const dp = (u, v) => [lerp(lerp(d0[0], d3[0], u), lerp(d1[0], d2[0], u), v), lerp(lerp(d0[1], d3[1], u), lerp(d1[1], d2[1], u), v)];
    c.setTransform(1,0,0,1,0,0);
    c.beginPath(); polyP(c, [dp(.18,0), dp(.18,.95), dp(.62,.98), dp(.62,0)]); c.fillStyle = '#a8704f'; c.fill();
    c.beginPath(); polyP(c, [dp(.22,.02), dp(.22,.9), dp(.58,.92), dp(.58,.02)]); c.fillStyle = '#c98a5a'; c.fill();
    c.beginPath(); polyP(c, [dp(.2,.92), dp(.2,.97), dp(.6,1), dp(.6,.95)]); c.fillStyle = '#e0b07e'; c.globalAlpha = .6; c.fill(); c.globalAlpha = 1;
    const dw = dp(.4, .72); c.beginPath(); c.ellipse(dw[0], dw[1], 22*RS, 30*RS, 0, 0, Math.PI*2); c.fillStyle = '#16213a'; c.fill();
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = .35; c.drawImage(SCOOL, dw[0]-24*RS, dw[1]-30*RS, 48*RS, 60*RS); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    const dh = dp(.55, .45); c.beginPath(); c.ellipse(dh[0], dh[1], 6*RS, 14*RS, 0, 0, Math.PI*2); c.fillStyle = '#f0c27a'; c.fill();
    c.save(); c.globalAlpha = .3; c.globalCompositeOperation = 'soft-light'; c.fillStyle = pat(c); c.beginPath(); polyP(c, [dp(.18,0), dp(.18,.95), dp(.62,.98), dp(.62,0)]); c.fill(); c.restore();
    HITS.push({ act:'go:corridor', m:[1,0,0,1,0,0], shape:['p', [dp(.18,0), dp(.18,.96), dp(.62,.98), dp(.62,0)]], label:tr('舱门（回环廊）'), key:'cabDoor', cur:'pointer' });
    // wall + windows
    layerCache(c, 'cab:wall', K_WL, cabWallArt);
    txtFit(c, tr(ROUTES[G.route].name), 800, 458, 104, ROUTES[G.route].name.length > 4 ? 18 : 20, '#2a3550');
    hit(c, 'cab:route', ['r', 738, 386, 124, 104], { label:tr('航道牌') });
    for (const s of ['left','right']){ const [x,y,w,h] = WIN[s]; hit(c, 'cab:glass:' + s, ['r', x, y, w, h], { label:s === 'left' ? tr('舷窗（长按哈气）') : tr('舷窗'), cur:'crosshair' }); }
    drawBulbs(c);
    // mid plane
    layerCache(c, 'cab:mid', 1, cabMidArt);
    setL(c, 1);
    c.save(); c.translate(640, 690); c.rotate(S.plantA*D2R);
    [[-.95,62],[-.55,78],[-.2,88],[.15,84],[.5,76],[.9,60],[-1.25,50],[1.2,52]].forEach(([a,L],i) => { const ex = Math.sin(a)*L, ey = -Math.cos(a)*L*.95;
      vol(c, cc => leafPath(cc, 0, 0, ex, ey, 12 + (i%3)*2, a*4), i%2 ? MAT.leaf : MAT.leafD, { k:1.5, s:4, tex:.3 }); });
    c.restore(); hit(c, 'cab:plant', ['r', 570, 590, 140, 110], { label:tr('盆栽') });
    if (!G.blanket){ setL(c, 1); vol(c, cc => rr(cc, 392, 568, 148, 44, 14), MAT.blanket, { k:2, s:5, r:1.5 }); flat(c, cc => { rr(cc, 420, 570, 7, 40, 3); rr(cc, 470, 570, 7, 40, 3); }, '#f6dcbf', .7); hit(c, 'cab:blanket', ['r', 392, 560, 148, 56], { label:tr('毯子') }); }
    const here = anHere(), asleep = anAsleep();
    // reading lamp on the side table
    setL(c, 1);
    vol(c, cc => { rr(cc, 1416, 500, 8, 104, 4); ell(cc, 1420, 604, 20, 5); }, MAT.brass, { k:.8, s:2, tex:0 });
    vol(c, cc => { cc.moveTo(1384,512); cc.lineTo(1456,512); cc.lineTo(1440,470); cc.lineTo(1400,470); cc.closePath(); }, S.reading ? { l:'#ffe0a8', b:'#f2c27f', d:'#c28a4e', r:'#fff' } : { l:'#a8c2d6', b:'#7fa0bb', d:'#4b6a83', r:'#c4d8e6' }, { k:1.5, s:4 });
    if (here){
      drawAn(c, 1222, 640, { pose:'map', asleep, dots:(G.mapDots || []).map(x => COL[x].hex) });
      hit(c, 'an:talk', ['r', 1150, 400, 150, 214], { label:tr('岸'), key:'an' });
      hit(c, 'cab:route', ['r', 1150, 600, 150, 60], { key:'anmap' });
    } else {
      vol(c, cc => polyP(cc, [[1366,600],[1452,594],[1458,606],[1372,612]]), MAT.paper, { k:.6, s:1.5, tex:0 });
    }
    drawLamp(c);
    drawMoth(c);
    // near plane
    layerCache(c, 'cab:near', K_NR, cabNearArt);
    setL(c, K_NR);
    drawVase(c, 430, 812);
    drawCupP(c, 610, 820, .95); hit(c, 'tea:cup', ['r', 566, 760, 110, 64], { label:tr('茶杯') });
    drawBreadPlate(c, 790, 842);
    drawTicketObj(c, 990, 846);
    drawLantern(c, 1168, 812);
    if (G.blanket){ setL(c, 1.45); vol(c, cc => blob(cc, [[-60,760],[180,738],[420,780],[560,880],[600,1000],[-60,1000]]), MAT.blanket, { k:6, s:14, r:3, hl:[200,780,200,.2] });
      flat(c, cc => { for (const x of [60, 150, 240]) stemPath(cc, x, 760, x+40, 860, x+70, 1000, 6, 8); }, '#f6dcbf', .55);
      hit(c, 'cab:blanket', ['p', [[-60,760],[180,738],[420,780],[560,880],[600,1000],[-60,1000]]], { label:tr('毯子'), key:'blanketFg' }); }
    setL(c, 1.5); c.save(); c.translate(1511, -40); c.rotate(Math.sin(S.T*.55 - .6)*2.4*(G.reduced?.2:1)*D2R);
    vol(c, cc => rr(cc, -7, 0, 14, 150, 7), MAT.navy, { k:2, s:5 });
    vol(c, cc => { ell(cc, 0, 176, 28, 28); ell(cc, 0, 176, 18, 18); }, MAT.navy, { k:2, s:5, eo:true });
    c.restore();
  },
  light(){
    const on = [1,.5,0][G.lamp]*(S.lampFil ?? 1);
    lightBegin('#050b1d', [.16,.44,.7][G.lamp] - Math.min(.14, S.bulbs.length*.016));
    const [lx, ly] = lampPos();
    hole(K_LP, lx, ly + 60, 820, on*.95, null, 640);
    hole(1, 1420, 520, 440, (S.readGlow||0)*.95, null, 380);
    S.bulbs.forEach(b => hole(K_BS, b.slot.x, b.slot.y + 28, 150, .55*Math.min(1, (S.T - b.born)/.6)));
    hole(K_NR, 1168, 740, 260, .45 + .3*(S.lanternPulse||0));
    hole(K_WL, 443, 400, 420, .12 + .2*S.vis, null, 320); hole(K_WL, 1157, 400, 420, .12 + .2*S.vis, null, 320);
  },
  over(c, dt){
    const refl = clamp(.72 - (S.vis-.1)/.9*.68, 0, 1);
    for (const s of ['left','right']){ const [x,y,w,h] = WIN[s];
      setL(c, K_WL); c.save(); c.beginPath(); rr(c, x, y, w, h, 70); c.clip();
      if (refl > .02){ c.globalAlpha = refl*.55; const g = c.createLinearGradient(0, y, 0, y+h); g.addColorStop(0, 'rgba(255,214,160,.32)'); g.addColorStop(1, 'rgba(120,80,60,.55)'); c.fillStyle = g; c.fillRect(x, y, w, h);
        c.globalAlpha = refl; c.globalCompositeOperation = 'lighter'; const [lx] = lampPos(); glowAt(c, SWARM, s === 'left' ? 1600 - lx - 200 : 1600 - lx + 180, y + 120, 90, .6*refl);
        c.globalCompositeOperation = 'source-over';
        if (s === 'left' && anHere()){ c.globalAlpha = refl*.35; flat(c, cc => { ell(cc, 300, 330, 26, 30); rr(cc, 262, 360, 76, 120, 30); }, '#2a1c22'); }
        c.globalAlpha = refl*.5; flat(c, cc => rr(cc, x, y + h - 60, w, 60, 0), '#3a2620');
        c.globalAlpha = 1; }
      c.globalAlpha = .07; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x+120, y+h); c.lineTo(x+170, y+h); c.lineTo(x+320, y); c.lineTo(x+270, y); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x+200, y+h); c.lineTo(x+214, y+h); c.lineTo(x+364, y); c.lineTo(x+350, y); c.closePath(); c.fill(); c.globalAlpha = 1;
      c.restore(); }
    drawFog(c);
    const on = [1,.5,0][G.lamp]*(S.lampFil ?? 1), [lx, ly] = lampPos();
    glowL(c, K_LP, SWARM, lx, ly + 40, 300, on*.5, null, 220);
    glowL(c, K_LP, SWARM, lx, ly, 44, on*.9);
    glowL(c, 1, SWARM, 1420, 520, 160, (S.readGlow||0)*.6);
    S.bulbs.forEach((b,i) => glowL(c, K_BS, SPR_OF[b.color], b.slot.x, b.slot.y + 28, 46, (G.lamp ? .75 : .4)*Math.min(1, (S.T - b.born)/.6)*(.85 + .15*Math.sin(S.T*1.3 + i))));
    const LC = ORDER[G.colorIdx], pulse = S.lanternPulse || 0;
    glowL(c, K_NR, SPR_OF[LC], 1168, 760, 120 + 90*Math.sin(Math.PI*pulse), .4 + .45*Math.sin(Math.PI*pulse));
    setL(c, K_NR); cupSteam(c, 610, 768, .95);
    drawFX(c, dt);
  }
};
