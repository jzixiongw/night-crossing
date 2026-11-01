import { tr } from '../i18n';
import { AU } from '../audio/index';
import { anAsleep, anHere, anWhere } from '../characters/an-lines';
import { breadP, cupSteam, drawAn, drawCupP, pearP } from '../characters/an';
import { layerCache } from '../core/cache';
import { CAM, setL } from '../core/camera';
import { drawFX, drawPuffs, puff } from '../core/fx';
import { hit } from '../core/hits';
import { glowL, hole, lightBegin } from '../core/light';
import { MAT } from '../core/materials';
import { SAMBER, SBLUE, SIND, SOFT, SWARM, blob, ell, flat, glowAt, leafPath, rr, shadow, txt, vol, txtFit } from '../core/paint';
import { P, shell } from '../core/shell';

import { D2R, MIN, clamp, ease, lerp, mixHex, mulberry32, pick, rand } from '../core/util';
import { TEA } from '../data/index';
import { ACT, ROOMS, setCtx } from './registry';
import { S } from '../state/runtime';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { now } from '../state/time';
import { AN, addLog, once, onceS, say } from '../ui/captions';
import { K_NR, K_SP, K_WL } from '../core/depth';

/* ================= GALLEY: tea, bread, pears ================= */
export const KPOS = { sink:{ x:300, y:548, r:0 }, stove:{ x:566, y:548, r:0 }, pour:{ x:742, y:470, r:34 } };
export const GAL_SHELL = { kb:.62, kf:1.75, b:[80,40,1520,640], f:[-340,-280,1940,1180],
  ceil:[[0,'#3c4566'],[1,'#151b30']], floor:[[0,'#3a4a62'],[.4,'#4b5a73'],[1,'#252f45']], side:[[0,'#34405e'],[1,'#1b2238']], seams:12, seamCol:'rgba(10,14,28,.35)' };
export const TEA_X = { osm:190, mint:300, barley:410 };
export function buildGalley(){
  S.kp = { ...KPOS[G.kettle.pos === 'pour' ? 'stove' : G.kettle.pos] }; S.ut = [0,0,0].map(() => ({ a:0, v:0 })); S.jarBob = { osm:0, mint:0, barley:0 };
  const R = mulberry32(31); S.gStars = []; for (let i=0;i<60;i++) S.gStars.push({ x:R(), y:R(), r:.6 + R()*1.4, c:R() < .15 ? '#ffd9a3' : '#e2ecf5', ph:R()*6 });
}
export function renderDough(){ S.doughDirty = false; }
export function renderRack(){}
export function renderPears(){}
export function renderBreadPlate(){}
export function renderTea(){}

ACT['gal:jar'] = { tap(a){
  const k = a[0], T = TEA[k]; S.jarBob[k] = 1;
  if (G.tea.level > .05){ AU.tap(); say(tr('杯里还有茶。喝完再换一种。')); return; }
  G.tea = { kind:k, level:0, temp:0, steep:0, leaves:true }; AU.leaf(); AU.nz(.3,{type:'highpass',f:2000,q:.6,vol:.04,delay:.15});
  say(tr('你舀了一小勺{0}，放进杯里。', T.name));
  if (G.kettle.hot < .5 && once('teaHint')) say(tr('等水开了，按住水壶往杯里倒。'), null, 2600);
  markDirty();
}};
ACT['gal:tap'] = { press(){
  S.tapOn = true; S.tapSnd = AU.loop('water'); S.filledThisPress = false;
  return { up(){ S.tapOn = false; S.tapSnd && S.tapSnd.stop(); S.tapSnd = null;
    if (S.filledThisPress && G.kettle.pos === 'sink') say(G.kettle.water > .95 ? tr('壶接满了。') : G.kettle.water > .5 ? tr('接了大半壶。') : tr('接了一点水。'));
    else if (G.kettle.pos !== 'sink') say(tr('壶在炉子上，水直接流进了水槽。'));
    markDirty(); } };
}, key(){ say(tr('按住水龙头放水。')); } };
ACT['gal:kettle'] = {
  press(){
    const k = G.kettle;
    if (k.pos !== 'stove' || S.heating || S.kMove || k.hot < .5 || k.water < .04) return null;
    startPour(); return { up(){ stopPour(); } };
  },
  tap(){
    const k = G.kettle; if (S.kMove) return;
    if (k.pos === 'sink'){
      if (k.water < .15){ AU.tap(); say(once('kEmpty') ? tr('壶里没什么水。按住水龙头接一点。') : tr('壶里没什么水。')); return; }
      moveKettle('stove'); say(tr('你把水壶放上炉子。')); if (!S.flameOn && once('burnerHint')) say(tr('炉子的旋钮在下面。'), null, 2400);
    } else {
      if (S.heating && k.hot < 1){ say(tr('水还在烧。')); return; }
      if (k.hot >= .5 && k.water >= .04){ say(tr('按住水壶，往杯子里倒。')); return; }
      moveKettle('sink'); say(tr('水壶放回水槽边。'));
    }
  },
  key(){ const k = G.kettle; if (k.pos === 'stove' && k.hot >= .5 && k.water >= .04){ startPour(); setTimeout(stopPour, 1600); } else this.tap(); }
};
export function anim(dur, fn, done){ S.anims.push({ t:0, dur, fn, done }); }
export function moveKettle(to){
  const from = { ...S.kp }, dest = KPOS[to]; S.kMove = true; AU.wood();
  anim(.7, q => { const e = ease(q); S.kp.x = lerp(from.x, dest.x, e); S.kp.y = lerp(from.y, dest.y, e) - Math.sin(Math.PI*q)*60; S.kp.r = lerp(from.r, dest.r, e); },
    () => { S.kMove = false; G.kettle.pos = to === 'pour' ? 'stove' : to; AU.tap(); markDirty(); });
}
export function startPour(){
  if (S.pour) return;
  S.pour = { started:G.tea.level, snd:null }; S.kMove = true;
  const from = { ...S.kp }; anim(.45, q => { const e = ease(q); S.kp.x = lerp(from.x, KPOS.pour.x, e); S.kp.y = lerp(from.y, KPOS.pour.y, e); S.kp.r = lerp(from.r, KPOS.pour.r, e); }, () => { if (S.pour){ S.pour.flow = true; S.pour.snd = AU.loop('pour'); } });
  if (!G.tea.kind){ G.tea = { kind:'water', level:0, temp:0, steep:0, leaves:false }; }
}
export function stopPour(){
  const p = S.pour; if (!p) return; S.pour = null; p.snd && p.snd.stop();
  const from = { ...S.kp }; anim(.5, q => { const e = ease(q); S.kp.x = lerp(from.x, KPOS.stove.x, e); S.kp.y = lerp(from.y, KPOS.stove.y, e); S.kp.r = lerp(from.r, 0, e); }, () => { S.kMove = false; });
  const poured = G.tea.level - p.started;
  if (poured > .05){
    if (p.started < .05){ G.cups++; addLog(tr('泡了一杯{0}', TEA[G.tea.kind].name)); }
    say(G.tea.kind === 'water' ? tr('倒了一杯热水。') : (TEA[G.tea.kind].steep || tr('水倒进去了。')));
  } else if (!p.flow) say(tr('按住久一点，才倒得出来。'));
  markDirty();
}
ACT['gal:burner'] = { tap(){
  S.flameOn = !S.flameOn; S.knobT = { k:'burner', t:0 };
  if (S.flameOn){ AU.ignite(); S.flameSnd = AU.loop('flame');
    if (G.kettle.pos === 'stove' && G.kettle.water > .05){ if (G.kettle.hot >= 1){ say(tr('水还热着。')); } else { S.heating = true; say(tr('火点上了。水壶开始轻轻响。')); } }
    else say(tr('炉火开着，上面什么也没有。'));
  } else { AU.click(); S.flameSnd && S.flameSnd.stop(); S.flameSnd = null; S.heating = false; say(tr('火关了。')); }
}};
export function boilKettle(){
  S.heating = false; G.kettle.hot = 1; AU.whistle(); S.boilT = 0; S.gFog = 1;
  G.warmUntil = now() + 10*MIN;
  say(S.room === 'galley' ? tr('水开了。蒸汽扑上舷窗，起了一层雾。') : tr('厨房的水壶响了。'));
  setTimeout(() => { if (S.flameOn){ S.flameOn = false; S.flameSnd && S.flameSnd.stop(); S.flameSnd = null; AU.click(); } }, 1800);
  if (!G.tea.kind && once('jarHint')) say(tr('挑一罐。开罐的时候味道最冲。'), null, 2800);
  else if (once('pourHint')) say(tr('按住水壶，往杯子里倒。'), null, 2800);
  markDirty();
}
ACT['tea:cup'] = { tap(){
  const t = G.tea;
  if (t.level <= 0){ AU.tap(); say(t.leaves && t.kind !== 'water' ? tr('杯底剩几片茶叶。想换一种，就点茶叶罐。') : (S.room === 'galley' ? tr('杯子是空的。') : tr('杯子是空的。茶在小厨房泡。'))); return; }
  if (!S.held && t.temp > .55){ S.held = true; AU.soft(); say(tr('茶很烫，先捧在手里。')); return; }
  t.level = Math.max(0, +(t.level - 1/3).toFixed(3)); AU.sip(); S.sips = (S.sips||0) + 1;
  const K = TEA[t.kind] || TEA.water;
  if (t.level <= .01){ t.level = 0; S.held = false; say(t.kind === 'water' ? tr('喝完了。') : tr('喝完了。杯底剩几片叶子。')); }
  else if (t.temp < .3) say(tr('茶凉了一点，正好入口。'));
  else if (t.kind !== 'water' && t.steep < .4) say(tr('还淡，叶子才刚开始舒展。'));
  else say(pick(K.sip));
  markDirty();
}};
ACT['gal:flour'] = { tap(){
  const d = G.dough; AU.nz(.5,{type:'lowpass',f:900,q:.4,vol:.05,att:.08});
  if (d.st === 'none'){ G.dough = { st:'raw', strokes:0, shape:null, proof:0 }; for (let i=0;i<10;i++) puff(1, 1005, 520, { vx:rand(-60,60), vy:rand(-60,-20), r:4, gr:14, a:.6, dur:rand(.8,1.4), col:SOFT });
    say(tr('舀两勺面粉，加水，和成一团。')); if (once('kneadHint')) say(tr('在面团上左右来回拖，慢慢揉。'), null, 2600); markDirty(); return; }
  if (d.st === 'raw' || d.st === 'kneaded' || d.st === 'shaped') say(tr('面团已经在板上了。'));
  else say(tr('面粉袋还有大半袋。'));
}};
ACT['gal:dough'] = {
  press(a, e, P){
    if (G.dough.st !== 'raw') return null;
    const c: any = { lastX:P.x, dir:0, t0:S.T, off:0 };
    c.move = (ev, Q) => {
      const dx = Q.x - c.lastX; c.lastX = Q.x;
      c.off = clamp(c.off + dx, -60, 60);
      const dir = Math.sign(dx);
      if (dir && Math.abs(dx) > 1.5 && dir !== c.dir && Math.abs(c.off) > 14){ if (c.dir !== 0) kneadStroke(S.T - c.t0); c.dir = dir; c.t0 = S.T; }
      S.doughSquash = c.off / 60;
    };
    c.up = () => { S.doughSquash = 0; };
    return c;
  },
  tap(){
    const d = G.dough;
    if (d.st === 'none'){ say(tr('板上空着。面粉袋在右边。')); return; }
    if (d.st === 'kneaded'){ say(tr('揉好了。挑一个形状。')); showShapes(); return; }
    if (d.st === 'shaped'){ G.dough.st = 'proofing'; G.dough.proof = 0; AU.soft();
      say(tr('你把面团放进发酵箱，关上小门。它要自己待一阵，大约二十分钟。')); addLog(tr('揉好一团面，放进发酵箱')); markDirty(); return; }
    if (d.st === 'proofing' || d.st === 'proofed'){ say(tr('面团在上面的发酵箱里。')); return; }
    if (d.st === 'inOven' || d.st === 'baking'){ say(tr('面团在烤箱里。')); return; }
  },
  key(){ if (G.dough.st === 'raw') kneadStroke(.5); else this.tap(); }
};
export function kneadStroke(dur){
  const d = G.dough; if (d.st !== 'raw') return;
  const fast = dur < .16; d.strokes += fast ? .5 : 1; AU.knead(fast ? .6 : 1);
  if (fast && onceS('kneadFast')) say(tr('太急了，面团有点粘手。慢一点推。'));
  if (d.strokes >= 14){ d.st = 'kneaded'; AU.soft(); say(tr('面团光滑了，按一下会慢慢弹回来。')); showShapes(); markDirty(); }
  else if (Math.floor(d.strokes) === 6 && onceS('knead6')) say(tr('面团开始不粘手了。'));
}
export function showShapes(){
  if (S.room !== 'galley') return;
  const set = sh => () => { G.dough.shape = sh; G.dough.st = 'shaped'; AU.soft(); setCtx([]);
    say({ round:tr('团成一个圆面包。'), long:tr('搓成长长的一条。'), braid:tr('分成三股，编成辫子。') }[sh]); if (once('proofHint')) say(tr('再点一下面团，放进发酵箱。'), null, 2200); markDirty(); };
  setCtx([{ label:tr('团成圆的'), fn:set('round') }, { label:tr('搓成长的'), fn:set('long') }, { label:tr('编成辫子'), fn:set('braid') }]);
}
ACT['gal:proof'] = { tap(){
  const d = G.dough; AU.wood();
  if (d.st === 'proofing'){ const left = Math.max(1, Math.round((1 - d.proof) * 20 / (galleyWarm() ? 1.5 : 1)));
    say(tr('面团鼓起来一些了。大概还要 {0} 分钟。', left) + (galleyWarm() ? tr('厨房暖，发得快。') : '')); return; }
  if (d.st === 'proofed'){ d.st = 'inOven'; say(tr('面团发好了，胖胖的。你把它挪进烤箱。')); if (once('ovenHint')) say(tr('拧一下烤箱的旋钮。'), null, 2400); markDirty(); return; }
  say(tr('发酵箱空着，里面暖烘烘的。'));
}};
export function galleyWarm(){ return now() < G.warmUntil; }
ACT['gal:oven'] = { tap(){
  const d = G.dough;
  if (d.st === 'inOven'){ d.st = 'baking'; S.bakeT = 0; AU.click(); S.ovenSnd = AU.loop('flame'); S.knobT = { k:'oven', t:0 };
    say(tr('烤箱开了。玻璃后面亮起橙色的光。')); markDirty(); return; }
  if (d.st === 'baking'){ say(S.bakeT > 12 ? tr('闻到香味了。再等一下。') : tr('刚开始烤。')); return; }
  if (d.st === 'proofing' || d.st === 'proofed'){ say(tr('面团还在发酵箱里。')); return; }
  AU.tap(); say(tr('烤箱是空的。'));
}};
export function finishBake(){
  const d = G.dough; S.ovenSnd && S.ovenSnd.stop(); S.ovenSnd = null; AU.ding();
  G.breads.push({ shape:d.shape || 'round', at:now() }); if (G.breads.length > 6) G.breads.shift();
  G.baked++; G.warmUntil = now() + 10*MIN; G.dough = { st:'none', strokes:0, shape:null, proof:0 };
  addLog(tr('烤好一个面包'));
  if (S.room === 'galley'){ say(tr('叮。面包烤好了，放在左边的架子上晾着。')); if (anWhere() === 'galley') say(tr('好香。'), AN, 3000); }
  else say(tr('厨房那边"叮"了一声。面包烤好了。'));
  markDirty();
}
ACT['bread:take'] = { tap(){ breadEat(); } };
ACT['bread:eat'] = { tap(){ breadEat(); } };
export function breadEat(){
  if (!G.breads.length){ AU.tap(); say(S.room === 'galley' ? tr('架子上空着。面团烤好了会放在这里。') : tr('盘子空了。')); return; }
  const b = G.breads[0], warm = now() - b.at < 20*MIN;
  const anHereNow = anWhere() === S.room || (S.room === 'cabin' && anHere());
  if (anHereNow && !anAsleep() && !S.caps.gaveBread){
    S.caps.gaveBread = true; G.breads.shift(); G.gaveAn++; G.doodles++; AU.paper();
    say(tr('你掰了一半给岸。')); say(G.gaveAn === 1 ? tr('谢谢。我在图边上画个面包，记着。') : tr('又是你烤的。图边上的面包快排成一排了。'), AN, 2200);
    addLog(tr('分了半个面包给岸')); markDirty(); return;
  }
  G.breads.shift(); AU.crunch();
  say(warm ? tr('面包还是温的，外皮脆。') : tr('面包凉了，嚼起来有麦子的甜。')); markDirty();
}
ACT['gal:pear'] = { tap(){
  if (G.pears <= 0){ AU.tap(); say(tr('果盘空了。邻船下一班会再送一些。')); return; }
  G.bite++; AU.crunch();
  if (G.bite >= 3){ G.bite = 0; G.pears--; G.pearsEaten++; if (!G.pearAt) G.pearAt = now(); say(tr('吃完了。核放在碟子边上。')); }
  else say(G.bite === 1 ? (once('pear1') ? tr('咬了一口星梨。很酸，水很多。') : tr('咬了一口星梨。')) : tr('又一口。'));
  markDirty();
}};
ACT['gal:ut'] = { tap(a){ const i = +a[0]; S.ut[i].v += G.reduced ? 20 : 90; AU.tone([1320,1760,980][i], .5, { vol:.03 }); AU.tone([1320,1760,980][i]*2.7, .3, { vol:.008 }); } };

export function galleyTick(dt){
  const k = G.kettle;
  if (S.heating){ if (!S.flameOn || k.pos !== 'stove'){ S.heating = false; } else { k.hot = Math.min(1, k.hot + dt/(4 + 6*k.water)); if (k.hot >= 1) boilKettle(); } }
  if (G.dough.st === 'baking'){ S.bakeT = (S.bakeT < 0 ? 0 : S.bakeT) + dt; if (S.bakeT >= 25) finishBake(); }
}

/* ---- art ---- */
export function galWallArt(g){
  const [x0,y0,x1,y1] = GAL_SHELL.b;
  g.fillStyle = '#33405e'; g.fillRect(x0, y0, x1-x0, y1-y0);
  for (let y = y0; y < 470; y += 44) for (let x = x0; x < x1; x += 44){ const r = mulberry32((x*7 + y*13)|0)(); vol(g, cc => rr(cc, x+3, y+3, 38, 38, 9), { l:'#4d6087', b:r < .2 ? '#3d5078' : '#3a4a6c', d:'#2a3756', r:'#5a73a0' }, { k:1.2, s:3, r:.8, tex:.35 }); }
  vol(g, cc => rr(cc, x0, 470, x1-x0, y1-470, 0), MAT.wall2, { k:2, s:5, tex:.4 });
  vol(g, cc => rr(cc, x0, y0, x1-x0, 22, 0), MAT.wall2, { k:1, s:3 });
  // porthole cut + frame
  g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); ell(g, 1000, 190, 92, 92); g.fill(); g.beginPath(); rr(g, 1340, 150, 180, 330, 90); g.fill(); g.restore();
  vol(g, cc => { ell(cc, 1000, 190, 116, 116); ell(cc, 1000, 190, 92, 92); }, MAT.brass, { k:3, s:8, r:2, eo:true, hl:[960,110,80,.25] });
  for (let k=0;k<10;k++){ const a = k*36*D2R; vol(g, cc => ell(cc, 1000 + Math.cos(a)*104, 190 + Math.sin(a)*104, 3.5, 3.5), MAT.metal, { k:.5, s:1.2, tex:0 }); }
  vol(g, cc => { rr(cc, 1322, 132, 216, 366, 108); rr(cc, 1340, 150, 180, 330, 90); }, MAT.frame, { k:3, s:8, r:2, eo:true });
  vol(g, cc => rr(cc, 1316, 482, 228, 18, 8), MAT.metalD, { k:1.5, s:3.5 });
  // jar shelf + utensil rail
  shadow(g, 300, 414, 210, 12, .45);
  vol(g, cc => rr(cc, 112, 400, 380, 18, 6), MAT.wood, { k:1.5, s:4 });
  for (const x of [140, 460]) vol(g, cc => { cc.moveTo(x-6,418); cc.lineTo(x+6,418); cc.lineTo(x+2,446); cc.lineTo(x-2,446); cc.closePath(); }, MAT.woodD, { k:.8, s:2, tex:0 });
  vol(g, cc => rr(cc, 196, 160, 330, 10, 5), MAT.brass, { k:.8, s:2, tex:0 });
  // proof box housing on the wall
  shadow(g, 1040, 400, 90, 12, .4);
  vol(g, cc => rr(cc, 960, 284, 160, 116, 14), MAT.cream, { k:3, s:7, r:2 });
  flat(g, cc => rr(cc, 974, 298, 132, 88, 10), '#2a2420', .9);
  vol(g, cc => rr(cc, 1084, 300, 14, 50, 7), MAT.metal, { k:.6, s:1.5, tex:0 });
  // hanging lamp cord anchor
  vol(g, cc => ell(cc, 760, 46, 30, 8), MAT.metalD, { k:1, s:2.5, tex:0 });
}
export function galMidArt(g){
  // counter
  shadow(g, 680, 866, 640, 26, .6);
  vol(g, cc => rr(cc, 60, 586, 1240, 280, 10), { l:'#6e8fb3', b:'#4f6e93', d:'#304868', r:'#86a6c8' }, { k:4, s:10, r:2, tex:.45, g:[586, 866, 'rgba(0,0,0,0)', 'rgba(6,10,22,.35)'] });
  for (const [x,w] of [[80,130],[730,150],[900,190],[1110,170]]){ vol(g, cc => rr(cc, x, 616, w, 220, 10), { l:'#7c9cc0', b:'#5878a0', d:'#3a5578', r:'#93b2d4' }, { k:-2, s:-4, lx:.5, ly:.8, r:0, tex:.35 }); vol(g, cc => rr(cc, x + w/2 - 18, 632, 36, 8, 4), MAT.brass, { k:.6, s:1.5, tex:0 }); }
  vol(g, cc => rr(cc, 40, 548, 1280, 42, 12), { l:'#efe1c6', b:'#d6c3a0', d:'#9c8a6c', r:'#f6ecd8' }, { k:2, s:5, r:1.5, hl:[600,552,300,.25] });
  // sink
  flat(g, cc => rr(cc, 236, 552, 140, 22, 10), '#3b4a62');
  flat(g, cc => rr(cc, 244, 556, 124, 12, 6), '#22304a');
  // stove top
  vol(g, cc => rr(cc, 470, 540, 190, 18, 6), MAT.metalD, { k:1, s:3 });
  flat(g, cc => { ell(cc, 566, 548, 58, 8); }, '#1a2234');
  for (let k=0;k<6;k++){ const a = k*60*D2R; flat(g, cc => rr(cc, 564 + Math.cos(a)*40 - 8, 546, 16, 4, 2), '#4a5a74'); }
  // oven door
  vol(g, cc => rr(cc, 480, 640, 250, 196, 14), MAT.metalD, { k:3, s:7, r:2 });
  flat(g, cc => rr(cc, 506, 662, 198, 104, 22), '#160c08');
  vol(g, cc => rr(cc, 530, 786, 150, 14, 7), MAT.metal, { k:.8, s:2, tex:0 });
  // prep board
  shadow(g, 1005, 556, 120, 8, .4);
  vol(g, cc => rr(cc, 890, 530, 230, 24, 10), MAT.wood, { k:1.5, s:4, hl:[980,532,80,.2] });
  // flour sack
  shadow(g, 1210, 556, 60, 8, .5);
  vol(g, cc => blob(cc, [[1166,552],[1160,500],[1176,470],[1204,462],[1238,470],[1252,500],[1250,552]]), MAT.cream, { k:3, s:8, r:2, tex:.6 });
  flat(g, cc => blob(cc, [[1178,470],[1204,456],[1232,466],[1220,478],[1190,478]]), '#c9b38c');
  txt(g, tr('面粉'), 1208, 524, 17, '#7d6a50');
  // bread rack
  for (const x of [72, 188]) vol(g, cc => rr(cc, x-4, 490, 8, 60, 3), MAT.metal, { k:.6, s:1.5, tex:0 });
  vol(g, cc => rr(cc, 66, 502, 130, 6, 3), MAT.metal, { k:.6, s:1.5, tex:0 });
  // little window table
  shadow(g, 1384, 760, 110, 12, .55);
  vol(g, cc => rr(cc, 1376, 620, 16, 136, 6), MAT.woodD, { k:2, s:5 });
  vol(g, cc => ell(cc, 1384, 616, 104, 18), MAT.wood, { k:2, s:5, hl:[1350,610,70,.2] });
}
export function galNearArt(g){
  shadow(g, 260, 940, 260, 30, .5);
  vol(g, cc => ell(cc, 300, 930, 280, 50), { l:'#9a7058', b:'#7a4f3c', d:'#4a2c22', r:'#8a5e48' }, { k:3, s:8, tex:.7 });
  // herb bunch hanging in the foreground
  flat(g, cc => rr(cc, 1488, -20, 3, 90, 1.5), '#4a3a2c');
  for (let k=0;k<7;k++){ const a = (-.6 + k*.2); vol(g, cc => leafPath(cc, 1490, 70, 1490 + Math.sin(a)*60, 70 + Math.cos(a)*90, 10, a*6), k%2 ? MAT.leaf : MAT.leafD, { k:1.5, s:4, tex:.3 }); }
  vol(g, cc => rr(cc, 1476, 62, 30, 14, 6), MAT.rose, { k:.8, s:2, tex:0 });
}
export function drawKettle(c){
  const k = G.kettle, jit = S.heating && k.hot > .75 && !G.reduced ? rand(-1,1) : 0;
  setL(c, 1); c.save(); c.translate(S.kp.x + jit, S.kp.y); c.rotate(S.kp.r*D2R);
  shadow(c, 0, 0, 60, 8, .5);
  vol(c, cc => { cc.moveTo(30,-36); cc.quadraticCurveTo(52,-44, 62,-62); cc.lineTo(68,-60); cc.quadraticCurveTo(60,-32, 34,-20); cc.closePath(); }, MAT.teal, { k:1.5, s:4, tex:0 });
  vol(c, cc => { cc.moveTo(-48,0); cc.bezierCurveTo(-56,-40, -36,-66, 0,-66); cc.bezierCurveTo(36,-66, 56,-40, 48,0); cc.closePath(); }, MAT.teal, { k:4, s:10, r:2, hl:[-20,-46,30,.4] });
  flat(c, cc => rr(cc, -46, -18, 92, 6, 3), '#f2e6cf', .5);
  vol(c, cc => ell(cc, 0, -66, 24, 7), MAT.tealD, { k:1, s:2.5, tex:0 });
  vol(c, cc => ell(cc, 0, -74, 7, 6), MAT.wood, { k:.8, s:2, tex:0 });
  vol(c, cc => { cc.moveTo(-34,-64); cc.bezierCurveTo(-34,-104, 34,-104, 34,-64); cc.lineTo(26,-64); cc.bezierCurveTo(26,-94, -26,-94, -26,-64); cc.closePath(); }, MAT.woodD, { k:1.5, s:4, tex:0 });
  const lvl = Math.min(1, k.water);
  flat(c, cc => rr(cc, -42, -48, 8, 36, 4), '#1d3a44', .8); if (lvl > .02) flat(c, cc => rr(cc, -41, -13 - lvl*34, 6, lvl*34, 3), '#a9d6e6', .9);
  hit(c, 'gal:kettle', ['r', -60, -108, 136, 112], { label:tr('水壶') });
  c.restore();
}
export function drawGalleyLive(c){
  const k = G.kettle;
  setL(c, K_WL);
  // tea jars
  ['osm','mint','barley'].forEach(key => { const T = TEA[key], x = TEA_X[key], bob = -Math.sin(Math.PI*(S.jarBob[key]||0))*8;
    c.save(); c.translate(0, bob);
    shadow(c, x, 400, 40, 6, .4);
    vol(c, cc => rr(cc, x-38, 300, 76, 100, 18), MAT.glass, { k:2, s:5, hl:[x-16, 316, 20, .5] });
    vol(c, cc => rr(cc, x-32, 336, 64, 58, 12), { l:mixHex(T.jar,'#ffffff',.3), b:T.jar, d:mixHex(T.jar,'#1a2238',.4) }, { k:1.5, s:4, tex:.6 });
    vol(c, cc => rr(cc, x-34, 288, 68, 20, 7), { l:mixHex(T.lid,'#ffffff',.3), b:T.lid, d:mixHex(T.lid,'#1a2238',.4), r:'#fff' }, { k:1.2, s:3 });
    vol(c, cc => rr(cc, x-30, 344, 60, 26, 4), MAT.paper, { k:.6, s:1.5, tex:0 });
    txtFit(c, tr(T.name), x, 362, 56, T.name.length > 2 ? 13 : 16, '#2a3550');
    hit(c, 'gal:jar:' + key, ['r', x-40, 286, 80, 116], { label:key === 'osm' ? tr('茶叶罐') : null, key:'jar-' + key });
    c.restore(); });
  // utensils on the rail
  [[240,'ladle'],[344,'spat'],[480,'whisk']].forEach(([x,kind],i) => { const u = S.ut[i];
    c.save(); c.translate(x, 166); c.rotate(u.a*D2R);
    vol(c, cc => { cc.moveTo(-3,0); cc.lineTo(3,0); cc.lineTo(3,90); cc.lineTo(-3,90); cc.closePath(); }, MAT.metal, { k:.6, s:1.5, tex:0 });
    if (kind === 'ladle') vol(c, cc => { cc.moveTo(-20,90); cc.bezierCurveTo(-20,118, 20,118, 20,90); cc.closePath(); }, MAT.copper, { k:1.5, s:4, tex:0 });
    if (kind === 'spat') vol(c, cc => rr(cc, -14, 86, 28, 34, 6), MAT.wood, { k:1, s:3, tex:0 });
    if (kind === 'whisk') vol(c, cc => { for (const w of [-12,-4,4,12]) { cc.moveTo(0,84); cc.quadraticCurveTo(w*1.6, 104, 0, 124); cc.quadraticCurveTo(w*1.2, 104, 0, 84); } }, MAT.metal, { k:.5, s:1.2, tex:0 });
    hit(c, 'gal:ut:' + i, ['r', -24, 0, 48, 126], { label:i === 0 ? tr('挂着的厨具') : null, key:'ut' + i });
    c.restore(); });
  // proof box contents
  c.save(); c.beginPath(); rr(c, 974, 298, 132, 88, 10); c.clip();
  const warmB = c.createRadialGradient(1040, 360, 6, 1040, 360, 80); warmB.addColorStop(0, 'rgba(255,170,90,.55)'); warmB.addColorStop(1, 'rgba(120,60,30,.2)'); c.fillStyle = warmB; c.fillRect(974, 298, 132, 88);
  if (G.dough.st === 'proofing' || G.dough.st === 'proofed'){ const s = .7 + .32*Math.min(1.15, G.dough.proof); breadP(c, G.dough.shape, 1034, 382, s, true); }
  c.restore();
  vol(c, cc => rr(cc, 1088, galleyWarm() ? 304 : 322, 6, galleyWarm() ? 42 : 24, 3), MAT.rose, { k:.4, s:1, tex:0 });
  hit(c, 'gal:proof', ['r', 960, 284, 160, 116], { label:tr('发酵箱') });
  // mid
  setL(c, 1);
  // tap
  vol(c, cc => { rr(cc, 296, 440, 14, 112, 6); cc.moveTo(296,446); cc.quadraticCurveTo(296,416, 330,416); cc.lineTo(352,416); cc.lineTo(352,430); cc.lineTo(330,430); cc.quadraticCurveTo(310,430, 310,446); cc.closePath(); }, MAT.metal, { k:1.2, s:3, tex:0 });
  c.save(); c.translate(303, 448); c.rotate(S.tapOn ? -.5 : 0); vol(c, cc => rr(cc, -26, -6, 30, 10, 5), MAT.rose, { k:.6, s:1.5, tex:0 }); c.restore();
  if (S.tapOn){ const atSink = k.pos === 'sink' && !S.kMove; const h = atSink ? 26 : 120; c.globalAlpha = .85; const sg = c.createLinearGradient(344, 430, 344, 430 + h); sg.addColorStop(0, 'rgba(200,230,245,.95)'); sg.addColorStop(1, 'rgba(200,230,245,.4)'); c.fillStyle = sg; c.beginPath(); rr(c, 340, 430, 8, h, 4); c.fill(); c.globalAlpha = 1; }
  hit(c, 'gal:tap', ['r', 270, 400, 100, 70], { label:tr('水龙头（按住）') });
  // burner knob + oven knob
  const knob = (x, y, rot, act, label) => { c.save(); c.translate(x, y); vol(c, cc => ell(cc, 0, 0, 18, 18), MAT.cream, { k:1.2, s:3, r:1 }); c.rotate(rot); flat(c, cc => rr(cc, -2.5, -15, 5, 13, 2.5), '#2a3550'); c.restore(); hit(c, act, ['c', x, y, 26], { label }); };
  knob(520, 610, S.flameOn ? -Math.PI/2 : 0, 'gal:burner', tr('炉子'));
  knob(700, 610, G.dough.st === 'baking' ? Math.PI*.66 : 0, 'gal:oven', null);
  // flame
  if (S.flameOn){ c.globalCompositeOperation = 'lighter'; for (let i=0;i<10;i++){ const a = i*36*D2R, fl = .7 + .3*Math.sin(S.T*20 + i); glowAt(c, SBLUE, 566 + Math.cos(a)*40, 546 + Math.sin(a)*4, 10*fl, .9); } glowAt(c, SBLUE, 566, 546, 60, .35); c.globalCompositeOperation = 'source-over'; }
  // oven window contents
  c.save(); c.beginPath(); rr(c, 506, 662, 198, 104, 22); c.clip();
  if (G.dough.st === 'inOven' || G.dough.st === 'baking') breadP(c, G.dough.shape, 605, 750, .8, G.dough.st === 'inOven');
  if (G.dough.st === 'baking'){ c.globalCompositeOperation = 'lighter'; glowAt(c, SAMBER, 605, 714, 120, .55 + .1*Math.sin(S.T*3), 70); c.globalCompositeOperation = 'source-over'; }
  c.globalAlpha = .1; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(540,766); c.lineTo(560,766); c.lineTo(600,662); c.lineTo(580,662); c.closePath(); c.fill(); c.globalAlpha = 1;
  c.restore();
  hit(c, 'gal:oven', ['r', 480, 640, 250, 196], { label:tr('烤箱'), key:'ovenDoor' });
  // bread rack
  G.breads.slice(0,3).forEach((b,i) => breadP(c, b.shape, 96 + i*38, 500, .42));
  hit(c, 'bread:take', ['r', 60, 450, 140, 60], { label:tr('面包架') });
  // prep board dough
  const d = G.dough;
  if (d.st === 'raw' || d.st === 'kneaded' || d.st === 'shaped'){ const q = S.doughSquash || 0; c.save(); c.translate(1005 + q*16, 534); c.scale(1 + Math.abs(q)*.28, 1 - Math.abs(q)*.16); breadP(c, d.st === 'shaped' ? d.shape : null, 0, 0, 1, true); c.restore();
    if (d.st === 'raw') flat(c, cc => { ell(cc, 980, 512, 3, 3); ell(cc, 1026, 506, 2.5, 2.5); ell(cc, 1004, 520, 2, 2); }, '#ffffff', .7); }
  hit(c, 'gal:dough', ['r', 890, 470, 230, 86], { label:tr('面板') });
  hit(c, 'gal:flour', ['r', 1156, 456, 104, 100], { label:tr('面粉') });
  // cup on the counter
  drawCupP(c, 760, 552, .8); hit(c, 'tea:cup', ['r', 722, 500, 96, 56], { label:tr('茶杯'), key:'gCup' });
  // pour stream
  if (S.pour && S.pour.flow){ const sp = (() => { const a = S.kp.r*D2R; return [S.kp.x + Math.cos(a)*66 - Math.sin(a)*-60, S.kp.y + Math.sin(a)*66 + Math.cos(a)*-60]; })();
    c.globalAlpha = .85; const sg = c.createLinearGradient(sp[0], sp[1], 760, 516); sg.addColorStop(0, 'rgba(220,236,245,.9)'); sg.addColorStop(1, 'rgba(220,236,245,.5)'); c.fillStyle = sg;
    c.beginPath(); c.moveTo(sp[0]-3, sp[1]); c.quadraticCurveTo(sp[0] + 12, sp[1] + 20, 758, 516); c.lineTo(764, 516); c.quadraticCurveTo(sp[0] + 18, sp[1] + 16, sp[0]+3, sp[1]); c.closePath(); c.fill(); c.globalAlpha = 1; }
  drawKettle(c);
  setL(c, 1);
  // pears + 岸
  for (let i=0;i<G.pears;i++) pearP(c, 1330 + i*30, 600 - (i===1?8:0), 1, i === 0 ? G.bite : 0);
  vol(c, cc => { cc.moveTo(1300,598); cc.quadraticCurveTo(1360,632, 1420,598); cc.lineTo(1414,606); cc.quadraticCurveTo(1360,636, 1306,606); cc.closePath(); }, MAT.cream, { k:1, s:2.5, tex:0 });
  hit(c, 'gal:pear', ['r', 1300, 560, 130, 56], { label:tr('星梨') });
  if (anWhere() === 'galley'){ vol(c, cc => rr(cc, 1430, 660, 110, 30, 12), MAT.woodD, { k:2, s:5 }); vol(c, cc => rr(cc, 1478, 690, 14, 80, 6), MAT.woodD, { k:1.5, s:4 });
    drawAn(c, 1486, 650, { pose:'cup', s:.92, face:1 }); hit(c, 'an:talk', ['r', 1430, 420, 120, 230], { label:tr('岸'), key:'an' }); }
}
ROOMS.galley = {
  zc:[760, 470],
  enter(){
    setCtx([]);
    if (once('galleyFirst')) say(tr('小厨房里一直有点面包的味道。'));
    else if (G.dough.st === 'proofed') say(tr('发酵箱里的面团发好了。'));
    if (anWhere() === 'galley') say(once('anGalley') ? tr('早。我在这儿吃早饭。') : tr('早。'), AN, 1800);
    if (G.dough.st === 'kneaded') showShapes();
  },
  exit(){ if (S.pour) stopPour(); if (S.tapOn){ S.tapOn = false; S.tapSnd && S.tapSnd.stop(); } setCtx([]); },
  update(dt){
    const k = G.kettle;
    if (S.tapOn){ const atSink = k.pos === 'sink' && !S.kMove;
      if (atSink){ const before = k.water; k.water = Math.min(1.08, k.water + dt/2.6); S.filledThisPress = true; if (before < 1 && k.water >= 1 && onceS('overflow')) say(tr('满了，溢出来一点。你甩了甩手。')); } }
    if (S.boilT >= 0){ S.boilT += dt; if (Math.random() < dt*9) puff(1, S.kp.x + 64, S.kp.y - 62, { vx:rand(20,60), vy:rand(-90,-50), r:8, gr:34, a:.4, dur:rand(2,3) }); if (S.boilT > 4.5) S.boilT = -1; }
    if (S.pour && S.pour.flow){
      G.tea.level = Math.min(1.02, G.tea.level + dt/2.4); k.water = Math.max(0, k.water - dt*.14); G.tea.temp = Math.max(G.tea.temp, k.hot);
      if (G.tea.level >= 1){ G.tea.level = 1; if (onceS('cupFull')) say(tr('杯子满了。')); stopPour(); }
      else if (k.water <= 0){ say(tr('壶倒空了。')); stopPour(); }
    }
    S.gFog = Math.max(0, (S.gFog||0) - dt/90);
    for (const key in S.jarBob) S.jarBob[key] = Math.max(0, S.jarBob[key] - dt*2.8);
    S.ut.forEach(u => { u.v += (-24*u.a - 2.2*u.v)*dt; u.a += u.v*dt; });
    CAM.rot = Math.sin(S.T*.55)*.25*(G.reduced?.2:1)*D2R;
  },
  back(c){
    setL(c, K_SP); const g = c.createLinearGradient(0, 80, 0, 520); g.addColorStop(0, '#081024'); g.addColorStop(1, '#1b2c4e'); c.fillStyle = g; c.fillRect(-200, -100, 2000, 800);
    c.globalAlpha = .5; c.drawImage(SIND, 1200, 160, 500, 320); c.globalAlpha = 1;
    S.gStars.forEach(s => { c.globalAlpha = .6 + .4*Math.sin(S.T + s.ph); c.fillStyle = s.c; c.fillRect(880 + s.x*680, 60 + s.y*460, s.r*1.4, s.r*1.4); }); c.globalAlpha = 1;
  },
  room(c){
    shell(c, GAL_SHELL);
    layerCache(c, 'gal:wall', K_WL, galWallArt);
    // lamp
    setL(c, .82); flat(c, cc => rr(cc, 758, 40, 4, 110, 2), '#1c2742');
    vol(c, cc => { cc.moveTo(712,190); cc.bezierCurveTo(716,160, 740,148, 760,148); cc.bezierCurveTo(780,148, 804,160, 808,190); cc.quadraticCurveTo(760,182, 712,190); cc.closePath(); }, MAT.copper, { k:3, s:7, r:2, hl:[740,156,30,.35] });
    layerCache(c, 'gal:mid', 1, galMidArt);
    drawGalleyLive(c);
    layerCache(c, 'gal:near', K_NR, galNearArt);
  },
  light(){
    lightBegin('#060b1c', .4);
    hole(.82, 760, 300, 760, .95, null, 520);
    if (S.flameOn) hole(1, 566, 540, 220, .8);
    if (G.dough.st === 'baking') hole(1, 605, 714, 260, .7);
    hole(K_WL, 1000, 190, 240, .4); hole(K_WL, 1430, 320, 260, .35, null, 320);
    hole(K_WL, 1040, 342, 120, .45);
    if (anWhere() === 'galley') hole(1, 1480, 520, 200, .25);
  },
  over(c, dt){
    // porthole fog after boiling
    if ((S.gFog || 0) > .01){ setL(c, K_WL); c.save(); c.beginPath(); ell(c, 1000, 190, 92, 92); c.clip(); c.globalAlpha = S.gFog*.75; c.fillStyle = '#d9e6ee'; c.fillRect(900, 90, 200, 200); c.globalAlpha = S.gFog*.5; c.drawImage(SOFT, 920, 110, 160, 160); c.restore(); c.globalAlpha = 1; }
    setL(c, K_WL); c.save(); c.beginPath(); ell(c, 1000, 190, 92, 92); rr(c, 1340, 150, 180, 330, 90); c.clip(); c.globalAlpha = .07; c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(940,290); c.lineTo(970,290); c.lineTo(1030,90); c.lineTo(1000,90); c.closePath(); c.fill(); c.beginPath(); c.moveTo(1370,480); c.lineTo(1400,480); c.lineTo(1480,150); c.lineTo(1450,150); c.closePath(); c.fill(); c.restore(); c.globalAlpha = 1;
    glowL(c, .82, SWARM, 760, 210, 220, .5, null, 120); glowL(c, .82, SWARM, 760, 192, 40, .9);
    if (S.flameOn) glowL(c, 1, SBLUE, 566, 548, 120, .35, null, 40);
    glowL(c, K_WL, SAMBER, 1040, 342, 90, .25);
    setL(c, 1); cupSteam(c, 760, 512, .8);
    drawPuffs(c, dt); drawFX(c, dt);
  }
};
