import { tr } from '../i18n';
import { AU } from '../audio/index';
import { anWhere } from '../characters/an-lines';
import { drawAn } from '../characters/an';
import { layerCache } from '../core/cache';
import { inv, mat, setL } from '../core/camera';
import { drawFX, drawPuffs, puff } from '../core/fx';
import { hit } from '../core/hits';
import { glowL, hole, lightBegin } from '../core/light';
import { MAT, POT_COL } from '../core/materials';
import { SAMBER, SCOOL, SIND, SOFT, SPINK, STEAL, SWARM, ell, flat, leafPath, rr, shadow, sphere, star5, stemPath, txt, vol } from '../core/paint';
import { P, shell } from '../core/shell';
import { CH, CW, RS, cv } from '../core/surface';
import { $, D2R, MIN, clamp, lerp, mixHex, mulberry32, pick, rand } from '../core/util';
import { SEEDS } from '../data/index';
import { ACT, ROOMS, setCtx } from './registry';
import { drawRig } from './hatch';
import { PR, S } from '../state/runtime';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { now } from '../state/time';
import { AN, addLog, once, onceS, say } from '../ui/captions';
import { K_NR, K_SP, K_WL } from '../core/depth';
import { closePanels } from '../ui/panels';

/* ================= GREENHOUSE ================= */
export const POT_X = [300,520,740,960,1180], POT_Y = 598;
export const BENCH_X = 1290;
export const WATER_MS = 60*MIN;
export const GH_SHELL = { kb:.62, kf:1.75, b:[80,40,1520,640], f:[-340,-280,1940,1180],
  ceil:[[0,'rgba(60,96,110,.28)'],[1,'rgba(10,22,30,.85)']], floor:[[0,'#2c3d3c'],[.4,'#3a4d48'],[1,'#1c2828']], side:[[0,'rgba(50,80,92,.4)'],[1,'rgba(12,24,32,.9)']], seams:10, seamCol:'rgba(6,14,16,.3)' };
export function buildGreen(){
  const R = mulberry32(77); S.ghStars = []; for (let i=0;i<180;i++) S.ghStars.push({ x:-200 + R()*2000, y:-120 + R()*760, r:.6 + R()*1.5, c:R() < .12 ? '#ffd9a3' : '#e2f2ee', ph:R()*6, tw:R() < .25 });
  S.drops = []; S.fold = [0,0,0,0,0]; S.curLean = [0,0,0,0,0]; S.bellTips = []; S.potWig = [0,0,0,0,0]; S.lampK = G.growLamp ? 1 : 0;
}
export function plantRand(i){ const p = G.pots[i]; return mulberry32((i+1)*7919 + Math.floor((p ? p.planted : 0) % 100000)); }
export function bloomReady(p){ return p && p.g >= 1 && now() >= (p.bloomAt || 0); }
export function drawPlantP(c, i){
  const p = G.pots[i]; if (!p) return;
  const R = plantRand(i), gr = clamp(p.g, 0, 1), bloom = bloomReady(p);
  const wet = p.water > 0, stem = wet ? '#2f5f5a' : '#3f5f55';
  const LF = [MAT.leaf, MAT.leafD, { l:'#a6d8bb', b:'#6bb29a', d:'#3b7064', r:'#5aa08a' }];
  if (gr < .04){ flat(c, cc => stemPath(cc, 0, -72, -3, -78, 2, -84, 1.6, 1), '#6bb2a8'); return; }
  if (p.sp === 'vine'){
    vol(c, cc => rr(cc, 3, -360, 6, 290, 3), MAT.woodD, { k:.8, s:2, tex:0 });
    const H = 14 + 280*gr, pts = [];
    for (let y=0; y<=H; y+=8){ pts.push([Math.sin(y/26 + R()*.2)*14, -72 - y]); }
    c.fillStyle = stem; c.beginPath(); pts.forEach(([x,y],k) => { k ? c.lineTo(x-2,y) : c.moveTo(x-2,y); }); for (let k=pts.length-1;k>=0;k--) c.lineTo(pts[k][0]+2, pts[k][1]); c.closePath(); c.fill();
    const n = Math.floor(gr*12);
    for (let k=0;k<n;k++){ const pt = pts[Math.min(pts.length-1, Math.floor((k+1)/(n+1)*pts.length))], side = k%2 ? 1 : -1;
      vol(c, cc => leafPath(cc, pt[0], pt[1], pt[0] + side*24, pt[1] - 8, 7, side*2), LF[k%3], { k:1, s:2.5, tex:.25 }); }
    const top = pts[pts.length-1];
    if (bloom) [[0,0],[-22,24],[18,46]].forEach(([dx,dy]) => vol(c, cc => star5(cc, top[0]+dx, top[1]+dy, 11), MAT.amber, { k:1, s:2.4, tex:0, hl:[top[0]+dx-3, top[1]+dy-3, 6, .6] }));
    else if (gr > .85) vol(c, cc => ell(cc, top[0], top[1], 5, 6), MAT.rose, { k:.6, s:1.5, tex:0 });
    S.bloomPts = S.bloomPts || {}; S.bloomPts[i] = bloom ? [[top[0], top[1]], [top[0]-22, top[1]+24], [top[0]+18, top[1]+46]] : null;
  } else if (p.sp === 'bell'){
    const lsz = 6 + 14*gr;
    vol(c, cc => { leafPath(cc, 0, -74, -26, -74 - lsz*1.4, lsz*.6, -2); leafPath(cc, 0, -74, 26, -74 - lsz*1.4, lsz*.6, 2); }, MAT.leaf, { k:1, s:2.5, tex:.25 });
    S.bellTips[i] = [];
    [0,1,2].forEach(j => {
      const hgt = (20 + 210*gr) * [.8,1,.9][j], ex = (j-1)*(26 + 70*gr), ey = -72 - hgt, cx = ex*.15, cy = -72 - hgt*1.15;
      flat(c, cc => stemPath(cc, (j-1)*6, -72, cx, cy, ex, ey, 3.4, 2.2), stem);
      if (gr > .45) vol(c, cc => leafPath(cc, ex*.5, (ey-72)*.5, ex*.5 + (j-1)*16 - 8, (ey-72)*.5 - 14, 6, 0), LF[j], { k:.8, s:2, tex:0 });
      if (bloom){ const bx = ex, by = ey + 4; flat(c, cc => rr(cc, bx-1.2, by, 2.4, 9, 1.2), stem);
        vol(c, cc => { cc.moveTo(bx-12, by+24); cc.bezierCurveTo(bx-12, by+7, bx+12, by+7, bx+12, by+24); cc.lineTo(bx+14, by+28); cc.lineTo(bx-14, by+28); cc.closePath(); }, { l:'#f4fbff', b:'#c6e2f2', d:'#7da4bd', r:'#e8f6ff' }, { k:1.4, s:3.5, tex:0, hl:[bx-5, by+12, 8, .5] });
        flat(c, cc => ell(cc, bx, by+29, 2.6, 2.6), '#ffd9a3'); }
      else if (gr > .8) vol(c, cc => ell(cc, ex, ey+6, 5, 5), MAT.teal, { k:.6, s:1.5, tex:0 });
      S.bellTips[i].push([ex, ey + 20]);
    });
  } else {
    for (let j=0;j<5;j++){
      const ang = (-56 + j*28)*D2R, L = 18 + 200*gr, u = clamp(gr*1.35 - j*.07, 0, 1), len = L*u;
      const ex = Math.sin(ang)*len, ey = -72 - Math.cos(ang)*len, cr = (1-u)*16 + 4;
      flat(c, cc => stemPath(cc, 0, -72, Math.sin(ang)*len*.5 + (j-2)*4, -72 - Math.cos(ang)*len*.6, ex, ey, 2.4, 1.2), stem);
      const pairs = Math.floor(len/15);
      for (let k=1;k<=pairs;k++){ const t = k/(pairs+1), px = Math.sin(ang)*len*t, py = -72 - Math.cos(ang)*len*t, sz = 4 + 8*(1-t)*gr, nx = Math.cos(ang), ny = Math.sin(ang);
        vol(c, cc => { leafPath(cc, px, py, px + nx*sz*2, py + ny*sz*2 - 3, 3.2, 0); leafPath(cc, px, py, px - nx*sz*2, py - ny*sz*2 - 3, 3.2, 0); }, LF[k%3], { k:.6, s:1.5, tex:0 }); }
      c.save(); c.translate(ex + Math.cos(ang)*cr*.4, ey - cr*.6); c.fillStyle = stem; c.beginPath(); c.arc(0, 0, cr, -.4, Math.PI*1.4); c.arc(0, 0, Math.max(0, cr - 2.6), Math.PI*1.4, -.4, true); c.closePath(); c.fill(); c.restore();
      if (bloom){ vol(c, cc => ell(cc, ex, ey-4, 4.5, 4.5), MAT.glass, { k:.6, s:1.5, tex:0 }); }
    }
    S.bloomPts = S.bloomPts || {}; S.bloomPts[i] = bloom ? [[0, -72 - 200*gr*.9]] : null;
  }
}
export function drawPotP(c, i){
  const p = G.pots[i], col = POT_COL[i], C = { l:mixHex(col,'#ffffff',.32), b:col, d:mixHex(col,'#141c30',.45), r:mixHex(col,'#ffe6c8',.25) };
  shadow(c, 0, 2, 52, 8, .55);
  vol(c, cc => { cc.moveTo(-40,-62); cc.lineTo(40,-62); cc.lineTo(31,0); cc.lineTo(-31,0); cc.closePath(); }, C, { k:3, s:8, r:2, hl:[-18,-44,22,.3] });
  vol(c, cc => rr(cc, -47, -78, 94, 18, 7), C, { k:1.5, s:4 });
  flat(c, cc => ell(cc, 0, -74, 40, 5.5), p && p.water > 0 ? '#2a1c18' : '#5a4232');
  if (p && p.water <= 0) flat(c, cc => { rr(cc, -30, -76, 10, 1.6, .8); rr(cc, 8, -74, 12, 1.6, .8); }, '#c9a27a', .9);
  if (p){ c.save(); c.translate(40, -99); c.rotate(8*D2R); vol(c, cc => rr(cc, -22, -11, 44, 22, 3), MAT.paper, { k:.8, s:2, tex:0 }); txt(c, SEEDS[p.sp].name, 0, 5, 13, '#2a3550'); c.restore(); flat(c, cc => rr(cc, 22, -90, 3, 24, 1.5), '#8a5a44'); }
}
export function setSpray(on){
  S.spray = on;
  if (on) setCtx([{ label:tr('放下喷壶'), fn:() => setSpray(false), on:true }]); else if (S.room === 'green') setCtx([]);
}
export function sprayPot(i){
  const p = G.pots[i]; AU.spray();
  const x = POT_X[i];
  for (let k=0;k<14;k++) puff(1, x + rand(-50,50), POT_Y - rand(90,260), { vx:rand(-6,6), vy:rand(10,40), r:2, gr:2, a:.8, dur:rand(.9,1.6), col:SOFT });
  if (!p){ say(tr('只喷湿了空盆里的土。')); return; }
  const was = p.water; p.water = 1; markDirty();
  if (p.sp === 'fern' && p.g > .3){ for (let k=0;k<8;k++) puff(1, x + rand(-60,60), POT_Y - rand(120,250), { vx:rand(-8,8), vy:rand(-6,6), r:rand(14,26), gr:30, a:.22, dur:rand(2.5,4) });
    if (onceS('fernMist')) say(tr('雾蕨冒出一小团雾，慢慢散开。')); return; }
  say(was <= 0 ? tr('干了的土一下子吸饱了水。') : (onceS('sprayOk') ? tr('叶子上挂满了细细的水珠。') : tr('又喷了一层水雾。')));
}
export function openSeeds(i?){
  if (i == null) i = G.pots.findIndex(p => !p);
  if (i < 0){ say(tr('五个盆都种上了。')); return; }
  closePanels(); S.seedPot = i;
  const list = $('#seedList'); list.innerHTML = '';
  Object.entries(SEEDS).forEach(([k,sd]) => { const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = `<span class="rname">${sd.name}</span><span class="rdots"><i style="background:${sd.color}"></i></span><span class="rdesc">${sd.desc}</span>`;
    b.onclick = () => plantSeed(S.seedPot, k); list.appendChild(b); });
  $('#seedSub').textContent = tr('种在第 {0} 个盆里。它们长得慢。', i+1);
  $('#seedPanel').hidden = false; AU.paper();
}
export function plantSeed(i, sp){
  closePanels();
  G.pots[i] = { sp, g:0, water:.7, lean:0, planted:now(), bloomAt:0, stage:0 }; AU.soft();
  say(tr('你把一颗{0}的种子按进土里，盖上一层。', SEEDS[sp].name));
  if (once('growHint')) say(tr('它会自己长。土干了就停一停，喷点水又接着长。'), null, 2800);
  addLog(tr('种下一颗{0}', SEEDS[sp].name)); markDirty();
}
$('#seedLater').onclick = () => { closePanels(); say(tr('盆先空着。')); };
/* ================= THE BENCH =================
   Three taps, one reply each, and the round has something to carry. The pot is
   emptied the moment the plant comes off it, so the greenhouse is the thing the
   whole round runs on: every call spends a flower that took a night to open. */
export function bloomedPot(){ return G.pots.findIndex(p => bloomReady(p)); }
export function rigStep(){ if (!G.rig) return 0; return G.rig.lit ? 3 : G.rig.glass ? 2 : 1; }
ACT['gh:bench'] = { tap(){
  AU.tap();
  if (!G.rig){
    const i = bloomedPot();
    if (i < 0){ say(once('benchEmpty') ? tr('台子上空着。要一株开了花的，才装得起来。') : tr('台子还空着。')); return; }
    const sp = G.pots[i].sp;
    G.rig = { sp, glass:false, lit:false }; G.pots[i] = null; G.blooms++;
    AU.wood(); markDirty();
    say(tr('你把开着花的{0}连根端上台子。', SEEDS[sp].name));
    if (once('benchHint')) say(tr('罩子在旁边。还要一盏小灯。'), null, 2400);
    return;
  }
  if (!G.rig.glass){ G.rig.glass = true; AU.soft(); markDirty(); say(tr('玻璃罩扣下来，里面一下子安静了。')); return; }
  if (!G.rig.lit){
    G.rig.lit = true; AU.chain(); AU.bell(78, .04); markDirty();
    say(tr('小灯卡进罩顶。叶子底下亮起来一点。'));
    addLog(tr('装好一盏灯'));
    say(tr('装好了。它在舷梯的架子上等着。'), null, 2600);
    return;
  }
  say(tr('装好的那盏已经搬到舷梯去了。'));
}};
ACT['gh:seeds'] = { tap(){ AU.paper(); openSeeds(); } };
ACT['gh:spray'] = { tap(){ setSpray(!S.spray); AU.tap(); if (S.spray && once('sprayHint')) say(tr('拿起喷壶。点哪一盆，就喷哪一盆。')); } };
ACT['gh:lamp'] = { tap(){
  G.growLamp = !G.growLamp; AU.chain(); markDirty();
  say(G.growLamp ? tr('生长灯亮了，粉色的光。植物在这种光下长得快一点。') : (once('lampOff') ? tr('生长灯关了。温室暗下来，只剩窗外的光，和你手边一点光。') : tr('生长灯关了。')));
}};
ACT['gh:pot'] = { tap(a){
  const i = +a[0];
  if (S.spray){ sprayPot(i); return; }
  const p = G.pots[i];
  if (!p){ openSeeds(i); return; }
  S.potWig[i] = 1; p.lean = -p.lean*.4; AU.wood(); markDirty();
  say(once('rotateHint') ? tr('你把花盆转了半圈。它原本朝窗那边歪，现在要重新长直。') : tr('花盆转了半圈。'));
}};
ACT['gh:plant'] = { tap(a){
  const i = +a[0], p = G.pots[i];
  if (S.spray){ sprayPot(i); return; }
  if (!p) return;
  if (bloomReady(p)){
    G.vase = p.sp; p.bloomAt = now() + 25*MIN; G.blooms++; AU.leaf(); AU.bell(86,.03);
    say(tr('你剪下一枝{0}，插到客舱桌上的小瓶里。这一株过一阵还会再开。', SEEDS[p.sp].name)); addLog(tr('剪了一枝{0}放进客舱的花瓶', SEEDS[p.sp].name)); markDirty(); return;
  }
  S.fold[i] = Math.min(1, S.fold[i] + .5); AU.leaf();
  const st = Math.floor(p.g*5);
  const lines = {
    vine:[tr('土里刚冒出一点绿。'),tr('一根细藤，往木棍上绕了半圈。'),tr('藤尖卷住了你的手指一下，又松开。'),tr('叶子一对一对的。顶上有个小花苞。')],
    bell:[tr('两片圆叶子贴着土。'),tr('三根细茎分开，各长各的方向。'),tr('茎有点软，摸起来凉。'),tr('茎尖垂下来，像要挂什么东西。')],
    fern:[tr('一个卷着的小拳头，从土里探出来。'),tr('嫩叶一圈一圈地打开。'),tr('叶背面有一排小点。'),tr('叶子展开了，边上是细细的锯齿。')]
  }[p.sp];
  say(p.water <= 0 ? tr('土是干的。它停着，在等水。') : lines[Math.min(3, st)]);
}};
export function cursorPlay(){ // cursor in play-plane coordinates, or null
  const r = cv.getBoundingClientRect(); if (PR.cx < r.left || PR.cx > r.right || PR.cy < r.top || PR.cy > r.bottom) return null;
  const X = (PR.cx - r.left)/r.width*CW, Y = (PR.cy - r.top)/r.height*CH; return inv(mat(1), X, Y);
}
export function ghWallArt(g){
  const [x0,y0,x1,y1] = GH_SHELL.b;
  g.fillStyle = 'rgba(120,180,190,.08)'; g.fillRect(x0, y0, x1-x0, y1-y0);
  const bar = (x, y, w, h) => vol(g, cc => rr(cc, x, y, w, h, Math.min(w,h)/2), { l:'#7fa6ad', b:'#4f7a80', d:'#2a474c', r:'#a8cfd4' }, { k:1.5, s:4, tex:.25 });
  for (let x = x0; x <= x1; x += 160) bar(x-5, y0, 10, 470);
  for (const y of [y0, 200, 360]) bar(x0, y-4, x1-x0, 8);
  // low wall under the glass
  vol(g, cc => rr(cc, x0, 500, x1-x0, y1-500, 0), { l:'#5a7a76', b:'#3f5c5a', d:'#26403e', r:'#6e908c' }, { k:2, s:5, tex:.6 });
  vol(g, cc => rr(cc, x0, 488, x1-x0, 18, 6), { l:'#9cc0b8', b:'#6e948c', d:'#3e5c56' }, { k:1.5, s:3.5 });
  // grow lamp mounts
  for (const x of [380, 1120]) flat(g, cc => rr(cc, x-1.5, y0, 3, 96, 1.5), '#1c3036');
}
export function ghMidArt(g){
  shadow(g, 740, 776, 640, 26, .6);
  vol(g, cc => rr(cc, 150, 598, 1180, 24, 8), MAT.wood, { k:2, s:5, hl:[500,600,300,.18] });
  vol(g, cc => rr(cc, 170, 618, 1140, 140, 10), MAT.woodD, { k:3, s:8, tex:.6, g:[618, 758, 'rgba(0,0,0,0)', 'rgba(6,10,14,.35)'] });
  for (let x=200;x<1300;x+=110) flat(g, cc => rr(cc, x, 622, 3, 132, 1.5), '#2c1a12', .5);
  // 岸's bench at the back right
  shadow(g, 1430, 760, 120, 12, .55);
  for (const x of [1370, 1490]) vol(g, cc => rr(cc, x-6, 690, 12, 70, 5), MAT.woodD, { k:1.5, s:4 });
  vol(g, cc => rr(cc, 1350, 664, 160, 30, 10), MAT.wood, { k:2, s:5 });
}
export function ghNearArt(g){
  shadow(g, 800, 960, 700, 40, .5);
  vol(g, cc => rr(cc, -60, 836, 1720, 160, 20), MAT.woodD, { k:-3, s:-7, lx:.4, ly:.9, r:0, tex:.6 });
  vol(g, cc => rr(cc, -60, 828, 1720, 16, 8), MAT.wood, { k:1.5, s:3.5 });
}
ROOMS.green = {
  zc:[740, 460],
  enter(){
    setCtx([]);
    if (once('greenFirst')) say(tr('温室比船上别处暖，玻璃内侧挂着一层水汽。'));
    else { const dry = G.pots.filter(p => p && p.water <= 0).length; if (dry) say(dry === 1 ? tr('有一盆土干了。') : tr('有 {0} 盆土干了。', dry)); }
    if (anWhere() === 'green') say(once('anGreen') ? tr('中午我在这儿看书。别管我，你忙你的。') : tr('你来了。'), AN, 1800);
  },
  exit(){ setSpray(false); setCtx([]); },
  update(dt){
    S.lampK += ((G.growLamp ? 1 : 0) - S.lampK)*(1-Math.exp(-dt*3));
    const dark = !G.growLamp, cp = cursorPlay(); S.ghCursor = cp;
    POT_X.forEach((x,i) => {
      const p = G.pots[i];
      if (p && cp && p.g > .1){ const d = Math.hypot(cp.x - x, cp.y - 430);
        if (PR.speed > 900 && d < 240){ S.fold[i] = Math.min(1, S.fold[i] + dt*5); if (S.fold[i] > .6 && once('shy')) say(tr('叶子一下子合上了。')); if (S.fold[i] > .6 && G.flags.shy && onceS('shy2') && S.T - (S.shyT||0) > 20) say(tr('它们怕快。手慢一点，它们会再打开。'), null, 2400); S.shyT = S.T; }
        const want = dark && PR.stillT > 2 && Math.abs(cp.x - x) < 340 && cp.y < 600 ? clamp((cp.x - x)/300, -1, 1)*14 : 0;
        S.curLean[i] += (want - S.curLean[i])*(1-Math.exp(-dt*.7));
        if (want && Math.abs(S.curLean[i]) > 8 && once('leanCursor')) say(tr('那盆植物慢慢朝你手边的光歪过来。'));
        if (p.sp === 'bell' && bloomReady(p) && S.bellTips[i] && PR.speed > 30 && PR.speed < 450 && S.T - S.lastBellT > .45){
          for (const [bx,by] of S.bellTips[i]){ if (Math.hypot(cp.x - (x+bx), cp.y - (POT_Y+by)) < 46){ S.lastBellT = S.T; S.bellSwing = { i, t:0 }; AU.bell(pick([86,88,91,93]), .035); if (once('bellRing')) say(tr('月铃响了一声。')); break; } }
        }
      } else S.curLean[i] *= Math.exp(-dt*.7);
      S.fold[i] = Math.max(0, S.fold[i] - dt/(PR.speed < 200 ? 4 : 12));
      S.potWig[i] = Math.max(0, S.potWig[i] - dt*1.7);
    });
    if (Math.random() < dt*.6 && S.drops.length < 10) S.drops.push({ x:rand(120,1480), y:rand(60,300), v:rand(8,20) });
    for (let k=S.drops.length-1;k>=0;k--){ const d = S.drops[k]; d.y += d.v*dt; if (d.y > 480) S.drops.splice(k,1); }
  },
  back(c){
    setL(c, K_SP); const g = c.createLinearGradient(0, -100, 0, 700); g.addColorStop(0, '#06101a'); g.addColorStop(.6, '#0f2430'); g.addColorStop(1, '#173643'); c.fillStyle = g; c.fillRect(-300, -300, 2200, 1200);
    c.globalAlpha = .5; c.drawImage(STEAL, 900, 40, 700, 420); c.globalAlpha = .3; c.drawImage(SIND, 100, -60, 800, 500); c.globalAlpha = 1;
    S.ghStars.forEach(s => { c.globalAlpha = s.tw ? .5 + .5*Math.sin(S.T*1.1 + s.ph) : .9; c.fillStyle = s.c; c.fillRect(s.x, s.y, s.r*1.4, s.r*1.4); }); c.globalAlpha = 1;
    sphere(c, 360, 150, 70, { l:'#f3e1c2', b:'#d1b48b', d:'#6e5a46', r:'#fff1d8' }, { lx:.6, ly:-.6 });
  },
  room(c){
    shell(c, GH_SHELL);
    // glass roof mullions converge into the ceiling
    c.setTransform(1,0,0,1,0,0); c.fillStyle = 'rgba(70,110,118,.85)';
    for (let i=0;i<=9;i++){ const t = i/9, a = P(.62, lerp(80,1520,t), 40), b = P(1.75, lerp(-340,1940,t), -280); c.beginPath(); c.moveTo(a[0]-2*RS, a[1]); c.lineTo(a[0]+2*RS, a[1]); c.lineTo(b[0]+6*RS, b[1]); c.lineTo(b[0]-6*RS, b[1]); c.closePath(); c.fill(); }
    layerCache(c, 'gh:wall', K_WL, ghWallArt);
    setL(c, K_WL); c.fillStyle = '#e6f4ff'; S.drops.forEach(d => { c.globalAlpha = .5; c.beginPath(); ell(c, d.x, d.y, 2.4, 3.4); c.fill(); }); c.globalAlpha = 1;
    // grow lamp bar
    setL(c, .85);
    for (const x of [380, 1120]) flat(c, cc => rr(cc, x-1.5, 40, 3, 110, 1.5), '#1c3036');
    vol(c, cc => rr(cc, 240, 146, 1020, 30, 15), MAT.metalD, { k:2, s:5 });
    c.globalAlpha = 1; flat(c, cc => rr(cc, 256, 168, 988, 8, 4), G.growLamp ? '#ffd3e0' : '#5a4a5a');
    hit(c, 'gh:lamp', ['r', 240, 140, 1020, 44], { label:tr('生长灯') });
    layerCache(c, 'gh:mid', 1, ghMidArt);
    setL(c, 1);
    if (anWhere() === 'green'){ drawAn(c, 1430, 664, { pose:'book', s:.9 }); hit(c, 'an:talk', ['r', 1370, 430, 120, 240], { label:tr('岸'), key:'an' }); }
    POT_X.forEach((x,i) => {
      const p = G.pots[i]; setL(c, 1); c.save(); c.translate(x, POT_Y); c.rotate(Math.sin(S.potWig[i]*Math.PI*3)*4*S.potWig[i]*D2R);
      if (p){
        const lean = p.lean*10 + S.curLean[i], f = S.fold[i], sway = Math.sin(S.T*.7 + i)*1.2*(G.reduced?.2:1);
        c.save(); c.translate(0, -72); c.rotate((lean + sway)*D2R); c.scale(1 - f*.16, 1 - f*.1); c.translate(0, 72);
        drawPlantP(c, i);
        hit(c, 'gh:plant:' + i, ['r', -100, -430, 200, 356], { label:i === 0 ? tr('植物') : null, key:'plant' + i });
        c.restore();
      }
      drawPotP(c, i);
      hit(c, 'gh:pot:' + i, ['r', -50, -80, 100, 82], { label:i === 0 || i === 4 ? tr('花盆') : null, key:'pot' + i, cur:S.spray ? 'crosshair' : 'pointer' });
      c.restore();
    });
    /* The work bench shares the potting counter, past the last pot. It stays out
       of the bottom strip, where the caption sits over anything you could tap. */
    setL(c, 1); c.save(); c.translate(BENCH_X, POT_Y);
    shadow(c, 0, 2, 76, 10, .5);
    vol(c, cc => rr(cc, -72, -22, 144, 22, 6), MAT.woodD, { k:2, s:5, r:1.5 });
    vol(c, cc => rr(cc, -72, -30, 144, 12, 5), MAT.wood, { k:1.5, s:3.5 });
    if (G.rig) drawRig(c, 6, -30, G.rig, .78);
    else { /* the glass cover waits on its side until something earns it */
      c.save(); c.translate(14, -34); c.rotate(.24);
      vol(c, cc => { cc.moveTo(-38,0); cc.bezierCurveTo(-38,-92, 38,-92, 38,0); cc.closePath(); }, MAT.glass, { k:1.8, s:4.5, r:1.2, tex:.2, ra:.4 });
      flat(c, cc => stemPath(cc, -24, -20, -29, -56, -14, -74, 4, 2.4), '#ffffff', .2);
      c.restore(); }
    if (!G.rig || !G.rig.lit){ vol(c, cc => rr(cc, -58, -56, 28, 20, 7), MAT.brass, { k:1, s:2.6, tex:0 }); flat(c, cc => ell(cc, -44, -38, 9, 4.5), '#ffe7bd', .85); }
    hit(c, 'gh:bench', ['r', -78, -180, 156, 182], { label:tr('装配台') });
    c.restore();
    layerCache(c, 'gh:near', K_NR, ghNearArt);
    setL(c, K_NR);
    // seed box
    c.save(); c.translate(260, 836);
    shadow(c, 0, 0, 90, 10, .5);
    vol(c, cc => rr(cc, -76, -56, 152, 56, 8), MAT.wood, { k:2, s:5, r:1.5 });
    for (const [k,sd] of Object.entries(SEEDS).map((e,i) => [i,e[1]] as [number, any])) vol(c, cc => rr(cc, -64 + k*44, -48, 36, 40, 5), { l:mixHex(sd.color,'#ffffff',.3), b:sd.color, d:mixHex(sd.color,'#1a2238',.45) }, { k:1, s:2.5, tex:.4 });
    txt(c, tr('种子'), 0, -66, 18, '#e8f2ee');
    hit(c, 'gh:seeds', ['r', -80, -90, 160, 94], { label:tr('种子盒') });
    c.restore();
    // sprayer
    if (!S.spray){ c.save(); c.translate(1300, 836);
      shadow(c, 0, 0, 50, 8, .5);
      vol(c, cc => { cc.moveTo(-30,0); cc.lineTo(-26,-70); cc.quadraticCurveTo(0,-82, 26,-70); cc.lineTo(30,0); cc.closePath(); }, MAT.rose, { k:2.5, s:6, r:1.5, hl:[-10,-50,14,.4] });
      vol(c, cc => { rr(cc, -8, -96, 16, 26, 4); rr(cc, 8, -96, 28, 9, 4); }, MAT.metal, { k:.8, s:2, tex:0 });
      vol(c, cc => { cc.moveTo(-26,-60); cc.bezierCurveTo(-56,-56, -56,-16, -28,-14); cc.lineTo(-28,-24); cc.bezierCurveTo(-44,-26, -44,-48, -26,-50); cc.closePath(); }, MAT.rose, { k:1, s:2.5, tex:0 });
      hit(c, 'gh:spray', ['r', -60, -100, 110, 104], { label:tr('喷壶') });
      c.restore(); }
    else { hit(c, 'gh:spray', ['r', 1240, 730, 110, 104], { label:tr('放下喷壶'), key:'sprayDrop' }); }
  },
  light(){
    const L = S.lampK;
    lightBegin('#04101a', .58 - .26*L);
    hole(.85, 750, 300, 760, .9*L, null, 360);
    if (L < .95 && S.ghCursor){ hole(1, S.ghCursor.x, S.ghCursor.y, 220, (1-L)*(.35 + .25*Math.min(1, PR.stillT/3))); }
    POT_X.forEach((x,i) => { const pts = S.bloomPts && S.bloomPts[i]; if (pts) pts.forEach(([bx,by]) => hole(1, x + bx, POT_Y + by, 90, .45)); });
    hole(K_WL, 800, 260, 700, .25, null, 260);
    if (G.rig && G.rig.lit) hole(1, BENCH_X, POT_Y - 140, 150, .45);
    if (anWhere() === 'green') hole(1, 1430, 520, 200, .25);
  },
  over(c, dt){
    const L = S.lampK;
    if (L > .02){ glowL(c, .85, SPINK, 750, 420, 680, .22*L, null, 300); glowL(c, .85, SPINK, 750, 172, 560, .55*L, null, 40); }
    if (L < .95 && S.ghCursor) glowL(c, 1, SWARM, S.ghCursor.x, S.ghCursor.y, 60, (1-L)*(.25 + .2*Math.min(1, PR.stillT/3)));
    POT_X.forEach((x,i) => { const p = G.pots[i], pts = S.bloomPts && S.bloomPts[i]; if (pts && p) pts.forEach(([bx,by]) => glowL(c, 1, p.sp === 'vine' ? SAMBER : SCOOL, x + bx, POT_Y + by, 30, .5)); });
    if (G.rig && G.rig.lit) glowL(c, 1, SWARM, BENCH_X + 6, POT_Y - 142, 46, .5);
    if (S.spray && S.ghCursor){ setL(c, 1); c.save(); c.translate(S.ghCursor.x + 30, S.ghCursor.y + 40); c.rotate(-.3);
      vol(c, cc => { cc.moveTo(-24,0); cc.lineTo(-20,-56); cc.quadraticCurveTo(0,-66, 20,-56); cc.lineTo(24,0); cc.closePath(); }, MAT.rose, { k:2, s:5, tex:0 }); c.restore(); }
    drawPuffs(c, dt); drawFX(c, dt);
  }
};
