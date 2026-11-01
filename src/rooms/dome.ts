import { tr } from '../i18n';
import { AU } from '../audio/index';
import { anWhere } from '../characters/an-lines';
import { drawAn } from '../characters/an';
import { layerCache } from '../core/cache';
import { inv, mat, setL } from '../core/camera';
import { drawFX } from '../core/fx';
import { hit } from '../core/hits';
import { glowL, hole, lightBegin } from '../core/light';
import { MAT } from '../core/materials';
import { SAMBER, SCOOL, SIND, SROSE, SWARM, ell, flat, glowAt, polyP, rr, shadow, txt, vol } from '../core/paint';
import { P } from '../core/shell';
import { CH, CW, cv } from '../core/surface';
import { $, HOUR, clamp, mod, mulberry32, rand } from '../core/util';
import { ACT, ROOMS, setCtx } from './registry';
import { PR, S } from '../state/runtime';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { now } from '../state/time';
import { AN, addLog, once, onceS, say } from '../ui/captions';
import { closePanels } from '../ui/panels';

/* ================= OBSERVATION DOME: star lines ================= */
export const SKY_W = 4800, K_SKY = .22;
export let STARS = [];
export function buildDome(){
  const R = mulberry32(20261027); STARS = [];
  [[70,2,3.3],[180,1.1,2],[280,.6,1.2]].forEach(([n,a,b],t) => { for (let i=0;i<n;i++) STARS.push({ id:STARS.length, x:R()*SKY_W, y:46 + R()*640, r:a + R()*(b-a), tier:t }); });
  for (let i=0;i<12;i++) STARS.push({ id:STARS.length, x:R()*SKY_W, y:80 + R()*560, r:2.8, tier:3, period:(2 + R()*3)*HOUR, phase:R() });
  STARS.forEach(st => { st.col = st.tier === 3 ? '#ffe6c4' : (R() < .08 ? '#ffd9a3' : R() < .2 ? '#b4cde0' : '#e9f1f8'); st.tw = st.tier === 0 && R() < .3; st.ph = R()*6.3; });
  S.lieK = G.lie ? 1 : 0; S.varVis = {}; S.dMeteors = [];
}
export const skyOff = () => mod((now()/HOUR) * (SKY_W/24), SKY_W);
export function varB(st, t?){ return clamp(Math.sin(2*Math.PI*((t ?? now())/st.period + st.phase))*1.3 + .1, 0, 1); }
export function tierAlpha(t){ const on = G.domeLight; return [on ? .75 : .95, on ? .22 : .82, on ? 0 : S.adapt*.88][t]; }
export function starAlpha(st){ return st.tier === 3 ? varB(st) * (G.domeLight ? .6 : 1) : tierAlpha(st.tier); }
export function wdx(a, b){ return mod(a - b + SKY_W/2, SKY_W) - SKY_W/2; }
export function skyO(){ return { dy:(S.lieK || 0)*90, noRot:true }; }
export function nearestStar(x, y, maxD=26, needVisible=true){
  let best = null, bd = maxD;
  STARS.forEach(st => { if (needVisible && starAlpha(st) < .3) return; const d = Math.hypot(wdx(st.x, x), st.y - y); if (d < bd){ bd = d; best = st; } });
  return best;
}
export function endPos(e){ return e.s != null ? { x:STARS[e.s].x, y:STARS[e.s].y } : { x:e.x, y:e.y }; }
export function endKey(e){ return e.s != null ? 's' + e.s : 'p' + Math.round(e.x) + ',' + Math.round(e.y); }
export function endHidden(e){ return e.s != null && STARS[e.s].tier === 3 && varB(STARS[e.s]) < .3; }
export function components(){
  const parent = {}; const find = k => parent[k] === k ? k : (parent[k] = find(parent[k]));
  const join = (a,b) => { parent[a] ??= a; parent[b] ??= b; parent[find(a)] = find(b); };
  G.lines.forEach(l => join(endKey(l.a), endKey(l.b)));
  const comps: Record<string, any[]> = {}; G.lines.forEach(l => { const r = find(endKey(l.a)); (comps[r] ||= []).push(l); });
  return Object.values(comps);
}
export function compName(lines){ for (const l of lines){ const n = G.names['L' + l.id]; if (n) return n; } return null; }
export function drawDomeLines(){ domeCtx(); }
export function addLine(a, b){
  const l = { id:++G.lineSeq, a:{ ...a }, b:{ ...b }, t:now() };
  G.lines.push(l); if (G.lines.length > 160) G.lines.shift();
  [l.a, l.b].forEach(e => { if (e.s != null && STARS[e.s].tier === 3 && varB(STARS[e.s]) >= .3 && !G.landed.includes(l.id)) G.landed.push(l.id); });
  S.lastComp = l.id; AU.scratch();
  if (G.lines.length === 1) addLog(tr('在穹顶连了第一笔星线'));
  markDirty();
}
ACT['d:sky'] = { tap(a, e, P){
  if (!P) return;
  const off = skyOff(), p = { x:mod(P.x + off, SKY_W), y:P.y }, st = nearestStar(p.x, p.y);
  if (st){
    if (!S.pick){ S.pick = { s:st.id }; AU.tap(); if (once('pick')) say(tr('选中了一颗星。再点另一颗，连一条线。点空处，线就悬在那儿。')); }
    else if (S.pick.s === st.id){ S.pick = null; AU.tap(); say(tr('这一笔先到这里。')); }
    else { addLine(S.pick, { s:st.id }); S.pick = { s:st.id }; if (once('line1')) say(tr('连上了。再点一下这颗星就停笔。')); }
  } else if (S.pick){
    const hid = STARS.filter(s => s.tier === 3 && starAlpha(s) < .3).find(s => Math.hypot(wdx(s.x, p.x), s.y - p.y) < 30);
    addLine(S.pick, hid ? { s:hid.id } : { x:p.x, y:p.y }); S.pick = null;
    say(once('dangle') ? tr('线停在了空处，悬着。也许那里以后会亮起一颗星，也许不会。') : tr('这一笔悬在那儿。'));
  } else {
    const fe = []; G.lines.forEach(l => [l.a,l.b].forEach(en => { if (en.s == null) fe.push(en); }));
    const f = fe.find(en => Math.hypot(wdx(en.x, p.x), en.y - p.y) < 18);
    if (f){ S.pick = { x:f.x, y:f.y }; AU.tap(); say(tr('从悬着的那一头接着画。')); }
    else if (onceS('skyEmpty')) say(G.domeLight ? tr('那里看不见星星。小灯开着，暗的星都藏起来了。') : tr('先点一颗星。'));
  }
  domeCtx();
}, key(){ say(tr('用鼠标在星空里点星，连线。')); } };
ACT['d:light'] = { tap(){ G.domeLight = !G.domeLight; AU.chain(); markDirty(); domeCtx();
  say(G.domeLight ? tr('小灯亮了。玻璃上又有了倒影。') : (once('domeDark') ? tr('小灯熄了。先别急，眼睛要一会儿才适应。') : tr('小灯熄了。'))); } };
ACT['d:lie'] = { tap(){ G.lie = !G.lie; AU.soft(); markDirty(); domeCtx(); say(G.lie ? tr('你在长椅上躺下来。整片穹顶都在眼睛上面。') : tr('你坐起来。')); } };
export function domeCtx(){
  if (S.room !== 'dome') return;
  const list = [
    { label: G.domeLight ? tr('关掉小灯') : tr('打开小灯'), fn: () => ACT['d:light'].tap() },
    { label: G.lie ? tr('坐起来') : tr('躺下'), fn: () => ACT['d:lie'].tap() }
  ];
  if (S.pick) list.push({ label:tr('停笔'), fn:() => { S.pick = null; domeCtx(); } });
  if (G.lines.length) list.push({ label:tr('擦掉最后一笔'), fn:() => { const l = G.lines.pop(); if (l) delete G.names['L'+l.id]; S.pick = null; AU.scratch(); markDirty(); domeCtx(); } });
  if (S.lastComp && G.lines.some(l => l.id === S.lastComp)) list.push({ label:tr('给这组起名'), fn:openName });
  setCtx(list);
}
export function openName(){
  const comp = components().find(c => c.some(l => l.id === S.lastComp)); if (!comp) return;
  closePanels(); S.nameComp = comp; $('#nameInput').value = compName(comp) || ''; $('#namePanel').hidden = false; AU.paper();
  setTimeout(() => $('#nameInput').focus(), 50);
}
$('#nameOk').onclick = () => { const v = $('#nameInput').value.trim(); const c = S.nameComp; if (!c) return closePanels();
  c.forEach(l => delete G.names['L'+l.id]);
  if (v){ G.names['L' + Math.min(...c.map(l => l.id))] = v; addLog(tr('给一组星线起名「{0}」', v)); say(tr('星图上写了一行小字：「{0}」。', v)); } else say(tr('就让它没名字。'));
  closePanels(); markDirty(); domeCtx(); };
$('#nameSkip').onclick = () => { closePanels(); say(tr('就让它没名字。')); };
$('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); $('#nameOk').click(); } });

export function domeFrameArt(g){
  // meridian ribs of the dome converge above the frame
  const band = (x0, x1, w) => vol(g, cc => { cc.moveTo(x0 - w, 700); cc.quadraticCurveTo((x0+x1)/2 - w*.6, 120, x1 - w*.3, -260); cc.lineTo(x1 + w*.3, -260); cc.quadraticCurveTo((x0+x1)/2 + w*.6, 120, x0 + w, 700); cc.closePath(); },
    { l:'#4a5f86', b:'#28385a', d:'#121c33', r:'#6a87b4' }, { k:3, s:8, r:2, ra:.6, tex:.4 });
  [[-180,520,26],[260,660,18],[800,800,16],[1340,940,18],[1780,1080,26]].forEach(([a,b,w]) => band(a, b, w));
  vol(g, cc => { cc.moveTo(-200,260); cc.quadraticCurveTo(800,40, 1800,260); cc.lineTo(1800,276); cc.quadraticCurveTo(800,58, -200,276); cc.closePath(); }, { l:'#4a5f86', b:'#2a3a5c', d:'#141e36', r:'#6a87b4' }, { k:2, s:5, tex:.3 });
  // dome rim + floor
  vol(g, cc => rr(cc, -220, 640, 2040, 60, 0), { l:'#3e5278', b:'#26354f', d:'#141d33', r:'#58729c' }, { k:4, s:10, tex:.5 });
  vol(g, cc => rr(cc, -220, 628, 2040, 18, 9), MAT.frame, { k:1.5, s:3.5 });
  const fg = g.createLinearGradient(0, 700, 0, 1000); fg.addColorStop(0, '#1a2338'); fg.addColorStop(1, '#0c111e'); g.fillStyle = fg; g.fillRect(-220, 700, 2040, 400);
}
export function domeMidArt(g){
  // chart table (right)
  shadow(g, 1300, 812, 170, 16, .6);
  for (const x of [1170, 1430]) vol(g, cc => rr(cc, x-7, 690, 14, 120, 5), MAT.woodD, { k:1.5, s:4 });
  vol(g, cc => polyP(cc, [[1140,664],[1460,664],[1480,700],[1120,700]]), MAT.wood, { k:2, s:5, hl:[1250,668,100,.2] });
  vol(g, cc => polyP(cc, [[1170,660],[1340,654],[1352,674],[1176,680]]), MAT.paper, { k:.8, s:2, tex:.3 });
  flat(g, cc => { for (let i=0;i<9;i++) ell(cc, 1190 + i*17, 668 - Math.sin(i)*4, 1.8, 1.8); }, '#33466e', .7);
  // lamp stand (left)
  shadow(g, 300, 812, 60, 9, .55);
  vol(g, cc => { rr(cc, 296, 690, 8, 120, 4); ell(cc, 300, 810, 30, 7); }, MAT.metalD, { k:.8, s:2, tex:0 });
}
export function domeNearArt(g){
  shadow(g, 800, 950, 420, 30, .6);
  vol(g, cc => rr(cc, 360, 820, 880, 110, 40), MAT.cushion, { k:5, s:12, r:3, hl:[560,830,220,.18] });
  vol(g, cc => rr(cc, 380, 880, 840, 80, 30), MAT.cushion, { k:4, s:10, r:2 });
  vol(g, cc => rr(cc, 980, 812, 170, 46, 18), MAT.blanket, { k:2, s:5, r:1.5 });
}
ROOMS.dome = {
  zc:[800, 420],
  enter(){
    S.pick = null; domeCtx();
    if (once('domeFirst')) say(tr('小灯开着的时候，头顶只看得见最亮的那几颗。'));
    else if (G.lines.length){ const off = skyOff(); const vis = G.lines.some(l => { const p = endPos(l.a); const sx = mod(p.x - off, SKY_W); return sx > 0 && sx < 1600; });
      say(vis ? tr('你连过的星线还在头顶。') : tr('你连过的星线这会儿转到别处去了。过一阵，它们会转回来。')); }
    if (anWhere() === 'dome') say(once('anDome') ? tr('晚上我在这儿对图。把灯关了，眼睛别动，等一会儿。') : tr('来了。'), AN, 2000);
  },
  exit(){ S.pick = null; setCtx([]); },
  update(dt){
    if (!G.domeLight){ if (PR.speed < 60) S.adapt = Math.min(1, S.adapt + dt/14); else if (PR.speed > 600) S.adapt = Math.max(0, S.adapt - dt/2.5); }
    else S.adapt = Math.max(0, S.adapt - dt*1.5);
    if (S.adapt > .6 && once('adapted')) say(tr('眼睛慢慢适应了。更暗的星浮出来了。'));
    S.domeT = (S.domeT||0) + dt;
    if (!G.domeLight && S.adapt < .15 && PR.speed > 600 && S.domeT > 20 && onceS('adaptHint')) say(anWhere() === 'dome' ? tr('手别动。眼睛跟着手跑，就看不见暗的了。') : tr('光标一晃，眼睛就跟着动。停一停试试。'), anWhere() === 'dome' ? AN : null);
    let changed = false; const t = now();
    STARS.forEach(st => { if (st.tier !== 3) return; const v = varB(st, t) >= .3; if (S.varVis[st.id] !== v){ S.varVis[st.id] = v; changed = true; } });
    if (changed){
      G.lines.forEach(l => { [l.a, l.b].forEach(e => { if (e.s != null && STARS[e.s].tier === 3 && varB(STARS[e.s], t) >= .3 && !G.landed.includes(l.id)){
        G.landed.push(l.id); markDirty(); setTimeout(() => AU.chime(), 600); say(tr('那根悬着的线，落在了一颗刚亮起来的星上。'), null, 600); addLog(tr('一根悬着的星线落在了一颗变星上')); } }); });
    }
    S.lieK += ((G.lie ? 1 : 0) - S.lieK)*(1-Math.exp(-dt*2.2));
    S.dLamp = (S.dLamp ?? (G.domeLight ? 1 : 0)) + ((G.domeLight ? 1 : 0) - (S.dLamp ?? 0))*(1-Math.exp(-dt*5));
    if (!G.domeLight && S.adapt > .5 && Math.random() < dt/22) S.dMeteors.push({ x:rand(200,1500), y:rand(80,300), t:0 });
  },
  back(c, dt){
    const o = skyO(), off = skyOff();
    setL(c, K_SKY, o);
    const g = c.createLinearGradient(0, -200, 0, 760); g.addColorStop(0, '#03060d'); g.addColorStop(.6, '#0a1226'); g.addColorStop(1, '#16223f'); c.fillStyle = g; c.fillRect(-400, -400, 2400, 1400);
    c.globalAlpha = .35*(1 - S.dLamp*.5); c.drawImage(SIND, mod(1800 - off, SKY_W) - 600, 120, 1400, 420); c.globalAlpha = .18; c.drawImage(SROSE, mod(3600 - off, SKY_W) - 400, 60, 900, 360); c.globalAlpha = 1;
    const ta = [tierAlpha(0), tierAlpha(1), tierAlpha(2)];
    const sx = st => mod(st.x - off + 300, SKY_W) - 300;
    STARS.forEach(st => { const x = sx(st); if (x > 1900) return; const a = starAlpha(st); if (a < .01) return;
      const tw = st.tw ? .65 + .35*Math.sin(S.T*1.1 + st.ph) : 1;
      if (st.tier === 3){ c.globalCompositeOperation = 'lighter'; glowAt(c, SAMBER, x, st.y, 18, a*.7); c.globalCompositeOperation = 'source-over'; }
      if (st.tier === 0){ c.globalCompositeOperation = 'lighter'; glowAt(c, SCOOL, x, st.y, st.r*5, a*.35*tw); c.globalCompositeOperation = 'source-over'; }
      c.globalAlpha = a*tw; c.fillStyle = st.col;
      if (st.r > 1.2){ c.beginPath(); c.arc(x, st.y, st.r, 0, Math.PI*2); c.fill(); } else c.fillRect(x - st.r*.7, st.y - st.r*.7, st.r*1.4, st.r*1.4); });
    c.globalAlpha = 1;
    // star lines: soft chalk, dashed while a line hangs or waits on a dark star
    const lx = p => mod(p.x - off + 300, SKY_W) - 300;
    G.lines.forEach(l => {
      const a = endPos(l.a), b = endPos(l.b), ax = lx(a), bx = ax + wdx(b.x, a.x);
      if (Math.max(ax, bx) < -300 || Math.min(ax, bx) > 1900) return;
      const hid = endHidden(l.a) || endHidden(l.b), free = l.a.s == null || l.b.s == null;
      c.lineCap = 'round';
      if (hid || free) c.setLineDash([5, 8]);
      c.globalAlpha = hid || free ? .2 : .25; c.strokeStyle = '#ffd9a3'; c.lineWidth = 6; c.beginPath(); c.moveTo(ax, a.y); c.lineTo(bx, b.y); c.stroke();
      c.globalAlpha = hid || free ? .5 : .82; c.lineWidth = hid || free ? 1.6 : 2; c.beginPath(); c.moveTo(ax, a.y); c.lineTo(bx, b.y); c.stroke();
      c.setLineDash([]); c.globalAlpha = 1;
      [[l.a, ax], [l.b, bx]].forEach(([e, ex]) => { if (e.s == null){ c.globalAlpha = .55; c.fillStyle = '#ffd9a3'; c.beginPath(); c.arc(ex, e.y, 5, 0, Math.PI*2); c.arc(ex, e.y, 3.4, 0, Math.PI*2, true); c.fill('evenodd'); c.globalAlpha = 1; }
        else if (endHidden(e)){ c.globalAlpha = .35; c.setLineDash([2,4]); c.strokeStyle = '#ffd9a3'; c.lineWidth = 1.3; c.beginPath(); c.arc(ex, STARS[e.s].y, 7, 0, Math.PI*2); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; } });
    });
    components().forEach(comp => { const n = compName(comp); if (!n) return;
      const a0 = endPos(comp[0].a); let sxx = 0, syy = 0, k = 0; comp.forEach(l => [l.a, l.b].forEach(e => { const p = endPos(e); sxx += a0.x + wdx(p.x, a0.x); syy += p.y; k++; }));
      const x = lx({ x:sxx/k }); if (x < -300 || x > 1900) return; txt(c, n, x, syy/k + 34, 20, '#ffd9a3', { a:.8 }); });
    if (S.pick){ const p = endPos(S.pick), x = lx(p); c.globalAlpha = .9; c.strokeStyle = '#ffe2b6'; c.lineWidth = 2; c.beginPath(); c.arc(x, p.y, 11, 0, Math.PI*2); c.stroke(); c.globalAlpha = 1;
      const r = cv.getBoundingClientRect();
      if (PR.cx >= r.left && PR.cx <= r.right && PR.cy >= r.top && PR.cy <= r.bottom){ const q = inv(mat(K_SKY, o), (PR.cx - r.left)/r.width*CW, (PR.cy - r.top)/r.height*CH);
        c.globalAlpha = .35; c.setLineDash([3,6]); c.strokeStyle = '#ffd9a3'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, p.y); c.lineTo(q.x, q.y); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; } }
    for (let i=S.dMeteors.length-1;i>=0;i--){ const m = S.dMeteors[i]; m.t += dt; const q = m.t/1.2; if (q >= 1){ S.dMeteors.splice(i,1); continue; }
      const x = m.x - q*280, y = m.y + q*104; const gr = c.createLinearGradient(x, y, x + 80, y - 30); gr.addColorStop(0, 'rgba(238,245,251,.9)'); gr.addColorStop(1, 'rgba(238,245,251,0)');
      c.globalAlpha = Math.sin(Math.PI*q); c.strokeStyle = gr; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 80, y - 30); c.stroke(); c.globalAlpha = 1; }
    hit(c, 'd:sky', ['r', -400, -400, 2400, 1400], { label:tr('星空：点星连线'), key:'sky', cur:'crosshair' });
  },
  room(c){
    const o = { dy:(S.lieK || 0)*60 };
    layerCache(c, 'dm:frame', .5, domeFrameArt, o);
    layerCache(c, 'dm:mid', 1, domeMidArt, { dy:(S.lieK || 0)*160 });
    setL(c, 1, { dy:(S.lieK || 0)*160 });
    vol(c, cc => { cc.moveTo(270,694); cc.bezierCurveTo(272,664, 290,656, 300,656); cc.bezierCurveTo(310,656, 328,664, 330,694); cc.closePath(); }, G.domeLight ? MAT.amber : MAT.tealD, { k:1.5, s:4, r:1 });
    flat(c, cc => ell(cc, 300, 694, 30, 5), G.domeLight ? '#ffe2b0' : '#1c2a2a');
    hit(c, 'd:light', ['r', 250, 640, 100, 180], { label:tr('小灯') });
    if (anWhere() === 'dome'){ drawAn(c, 1480, 680, { pose:'map', s:.82, face:-1 }); hit(c, 'an:talk', ['r', 1420, 460, 120, 230], { label:tr('岸'), key:'an' }); }
    layerCache(c, 'dm:near', 1.25, domeNearArt, { dy:(S.lieK || 0)*300 });
    setL(c, 1.25, { dy:(S.lieK || 0)*300 });
    hit(c, 'd:lie', ['r', 360, 812, 880, 140], { label:G.lie ? tr('坐起来') : tr('长椅（躺下）') });
  },
  light(){
    lightBegin('#04070f', .42 + .34*(1 - S.dLamp));
    hole(1, 300, 690, 360, .9*S.dLamp, { dy:(S.lieK || 0)*160 }, 260);
    if (anWhere() === 'dome') hole(1, 1300, 640, 260, .2, { dy:(S.lieK || 0)*160 });
    hole(.5, 800, 300, 900, .3*(1 - S.dLamp*.4), null, 500);
  },
  over(c, dt){
    if (S.dLamp > .02){ c.setTransform(1,0,0,1,0,0); c.globalAlpha = .05*S.dLamp; c.fillStyle = '#ffd9a3'; c.fillRect(0,0,CW,CH); c.globalAlpha = 1;
      glowL(c, 1, SWARM, 300, 690, 150, .55*S.dLamp, { dy:(S.lieK || 0)*160 }, 90); }
    drawFX(c, dt);
  }
};
