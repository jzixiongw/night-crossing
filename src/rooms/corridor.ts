import { tr } from '../i18n';
import { AU } from '../audio/index';
import { anWhere } from '../characters/an-lines';
import { drawAnSilhouette } from '../characters/an';
import { CACHE, blit, cacheGet } from '../core/cache';
import { CAM, mat, tp } from '../core/camera';
import { hit } from '../core/hits';
import { holeM, lightBegin } from '../core/light';
import { MAT } from '../core/materials';
import { SAMBER, SIND, SPINK, SROSE, STEAL, SWARM, ell, flat, glowAt, pat, polyP, rr, shadow, stemPath, txt, txtFit, vol } from '../core/paint';
import { CH, CW, RS } from '../core/surface';
import { $, D2R, hex, hhmm, lerp, mixHex, mod, mulberry32, rand, rgba, ymd } from '../core/util';
import { ACT, RING, ROOMS, STEP, angDiff, setCtx, updateHud } from './registry';
import { PR, S } from '../state/runtime';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { localHour, now } from '../state/time';
import { addLog, once, onceS, say } from '../ui/captions';
import { logLines, openLog } from '../ui/log';
import { callPort, docked } from './hatch';
import { openMail, updateMailbox } from '../ui/mail';

/* ================= RING CORRIDOR =================
   The ship is a spinning ring whose centre sits far above the frame. Each depth layer rotates about that centre:
   the far wall (stations), the floor band and the near pillars sweep at different screen speeds, so walking reads in depth. */
export const RC = { x:800, y:-1300 };
export const WINDOW_ANG = RING.find(s => s.id === 'window').ang;
export const K_RW = .7, K_RN = 1.5;
export const R_WB = 2080, R_WT = 1590, R_FN = 2290, R_CN = 1450;
export function mmul(A, B){ return [A[0]*B[0]+A[2]*B[1], A[1]*B[0]+A[3]*B[1], A[0]*B[2]+A[2]*B[3], A[1]*B[2]+A[3]*B[3], A[0]*B[4]+A[2]*B[5]+A[4], A[1]*B[4]+A[3]*B[5]+A[5]]; }
export function rotAbout(cx, cy, a){ const cs = Math.cos(a), sn = Math.sin(a); return [cs, sn, -sn, cs, cx - cs*cx + sn*cy, cy - sn*cx - cs*cy]; }
export function ringM(k, rel){ return mmul(mat(k), rotAbout(RC.x, RC.y, -rel*D2R)); }
export function setM(c, m){ c.setTransform(m[0],m[1],m[2],m[3],m[4],m[5]); }
export function ringPt(k, R, deg){ return tp(mat(k), RC.x + R*Math.sin(deg*D2R), RC.y + R*Math.cos(deg*D2R)); }
export function bandPts(k0, R0, k1, R1, a0, a1, step=1.5){
  const pts = []; for (let a=a0; a<=a1+1e-6; a+=step) pts.push(ringPt(k0, R0, a)); for (let a=a1; a>=a0-1e-6; a-=step) pts.push(ringPt(k1, R1, a)); return pts;
}
export function surf(t, kind){ // a point on the floor (or ceiling) band, t = 0 at the wall, 1 at the near edge
  return kind === 'floor' ? [lerp(K_RW, K_RN, t), lerp(R_WB, R_FN, t)] : [lerp(K_RW, K_RN, t), lerp(R_WT, R_CN, t)];
}

/* ---- station art (cached sprites in station-local coords: x≈800 centre, base on y=780) ---- */
export const ST_BOX = [400, 140, 840, 680];
export function doorArt(g, st){
  const fr = cc => { cc.moveTo(664,780); cc.lineTo(664,392); cc.arc(800,392,136,Math.PI,0); cc.lineTo(936,780); cc.closePath(); };
  const leaf = cc => { cc.moveTo(690,780); cc.lineTo(690,402); cc.arc(800,402,110,Math.PI,0); cc.lineTo(910,780); cc.closePath(); };
  shadow(g, 800, 782, 170, 16, .6);
  vol(g, fr, MAT.frame, { k:5, s:12, r:3, tex:.4 });
  flat(g, leaf, '#0f1729', .5);
  const base = hex(st.color), C = { l:mixHex(st.color, '#fff4e0', .3), b:st.color, d:mixHex(st.color, '#1a2238', .5), r:mixHex(st.color, '#ffd9a3', .2) };
  g.save(); g.translate(0, 0); vol(g, cc => { cc.moveTo(694,780); cc.lineTo(694,406); cc.arc(800,406,106,Math.PI,0); cc.lineTo(906,780); cc.closePath(); }, C, { k:4, s:10, r:2.5, hl:[740,470,140,.18] }); g.restore();
  flat(g, cc => { cc.moveTo(716,764); cc.lineTo(716,420); cc.arc(800,420,84,Math.PI,0); cc.lineTo(884,764); cc.lineTo(878,764); cc.lineTo(878,422); cc.arc(800,422,78,0,Math.PI,true); cc.lineTo(722,764); cc.closePath(); }, '#0b1222', .16);
  vol(g, cc => rr(cc, 716, 700, 168, 50, 10), C, { k:-2, s:-4, r:0, tex:.3, lx:.5, ly:.8 });
  vol(g, cc => ell(cc, 800, 440, 40, 40), MAT.metalD, { k:3, s:7, r:2 });
  flat(g, cc => ell(cc, 800, 440, 31, 31), '#0e1628');
  vol(g, cc => rr(cc, 864, 572, 16, 48, 8), MAT.brass, { k:1.5, s:4, tex:0 });
  vol(g, cc => rr(cc, 720, 300, 160, 56, 12), MAT.paper, { k:2, s:5, r:1.5 });
  txt(g, st.name, 800, 332, 25, '#2a3550');
  txt(g, st.en, 800, 348, 10, '#7d7a72', { mono:true, ls:3 });
  vol(g, cc => rr(cc, 684, 770, 232, 16, 8), MAT.woodD, { k:1.5, s:3.5 });
  if (st.id === 'cabin'){ vol(g, cc => rr(cc, 768, 470, 64, 24, 7), MAT.cream, { k:1, s:2.5, tex:0 }); txt(g, '07', 800, 488, 15, '#7d7a72', { mono:true }); }
  if (st.id === 'galley'){
    flat(g, cc => stemPath(cc, 700, 360, 800, 318, 900, 360, 3, 3), '#35605a');
    [[714,352,-.6],[742,338,-.3],[772,328,-.1],[828,328,.1],[858,338,.3],[886,352,.6]].forEach(([x,y,a]) => vol(g, cc => ell(cc, x, y, 12, 6, a), MAT.leaf, { k:1, s:2.4, tex:0 }));
    vol(g, cc => ell(cc, 800, 324, 9, 9), MAT.amber, { k:1, s:2.5, tex:0 });
  }
  if (st.id === 'green'){
    flat(g, cc => { stemPath(cc, 676, 640, 660, 470, 720, 330, 3.5, 2.5); stemPath(cc, 930, 610, 948, 460, 880, 330, 3.5, 2.5); }, '#2f5f5a');
    [[672,560,-.3],[664,620,.3],[688,450,-.6],[714,360,-.9],[936,520,.4],[940,580,-.2],[920,420,.6],[888,350,.9]].forEach(([x,y,a]) => vol(g, cc => ell(cc, x, y, 10, 20, a), MAT.leaf, { k:1.2, s:3, tex:0 }));
  }
  if (st.id === 'radio'){
    vol(g, cc => { rr(cc, 797, 214, 6, 44, 3); stemPath(cc, 800, 214, 784, 206, 768, 200, 2, 1.5); stemPath(cc, 800, 214, 816, 206, 832, 200, 2, 1.5); }, MAT.metal, { k:.6, s:1.5, tex:0 });
    vol(g, cc => ell(cc, 800, 210, 6, 6), MAT.rose, { k:.6, s:1.5, tex:0 });
    vol(g, cc => rr(cc, 842, 476, 70, 24, 12), MAT.dark, { k:1, s:2.5, tex:0 });
  }
}
/* The gangway is hull, not joinery: a pressure door with its dogs showing and a
   lamp over it that is dark the whole time the ship is under way. */
export function gangArt(g, st){
  shadow(g, 800, 782, 190, 16, .6);
  vol(g, cc => { rr(cc, 648, 330, 304, 452, 40); rr(cc, 690, 372, 220, 368, 26); }, MAT.metalD, { k:5, s:12, r:3, eo:true });
  vol(g, cc => rr(cc, 690, 372, 220, 368, 26), MAT.metal, { k:4, s:10, r:2.5, tex:.45, hl:[740,430,120,.16] });
  for (let k=0;k<10;k++){ const a = k/10*Math.PI*2; vol(g, cc => ell(cc, 800 + Math.sin(a)*128, 556 + Math.cos(a)*204, 9, 9), MAT.brass, { k:1, s:2.5, tex:0 }); }
  flat(g, cc => { rr(cc, 716, 420, 168, 12, 6); rr(cc, 716, 676, 168, 12, 6); }, '#2c3f5e', .6);
  vol(g, cc => rr(cc, 846, 528, 24, 92, 12), MAT.brass, { k:1.6, s:4 });
  vol(g, cc => rr(cc, 762, 268, 76, 28, 9), MAT.metalD, { k:2, s:5 });
  vol(g, cc => rr(cc, 696, 180, 208, 64, 10), MAT.paper, { k:2, s:5, r:1.5 });
  txt(g, st.name, 800, 216, 25, '#2a3550');
  txt(g, st.en, 800, 232, 10, '#7d7a72', { mono:true, ls:3 });
  vol(g, cc => rr(cc, 668, 770, 264, 16, 8), MAT.metalD, { k:1.5, s:3.5 });
}
export function stationArt(g, st){
  if (st.id === 'gang') return gangArt(g, st);
  if (st.go && st.id !== 'dome') return doorArt(g, st);
  if (st.id === 'window'){
    shadow(g, 800, 600, 420, 30, .5);
    vol(g, cc => { rr(cc, 404, 236, 792, 352, 98); rr(cc, 438, 268, 724, 288, 76); }, MAT.frame, { k:5, s:12, r:3, eo:true });
    vol(g, cc => rr(cc, 420, 580, 760, 26, 12), MAT.metalD, { k:2, s:5 });
    return;
  }
  if (st.id === 'mail'){
    shadow(g, 800, 420, 120, 20, .4);
    vol(g, cc => ell(cc, 800, 300, 100, 100), MAT.brass, { k:5, s:12, r:3, hl:[760,260,90,.25] });
    vol(g, cc => ell(cc, 800, 300, 82, 82), MAT.cream, { k:-2, s:-5, lx:.5, ly:.8, r:0, tex:.25 });
    for (let k=0;k<12;k++){ const a = k*30*D2R, r0 = k%3 ? 70 : 64; g.save(); g.translate(800 + Math.sin(a)*r0, 300 - Math.cos(a)*r0); g.rotate(a); flat(g, cc => rr(cc, -1.6, -2, 3.2, k%3 ? 7 : 11, 1.5), '#2a3550', .8); g.restore(); }
    vol(g, cc => rr(cc, 700, 412, 200, 42, 12), MAT.paper, { k:2, s:5, r:1.5 });
    vol(g, cc => rr(cc, 790, 600, 20, 180, 6), MAT.metalD, { k:2, s:5 });
    shadow(g, 800, 782, 60, 8, .5);
    vol(g, cc => { cc.moveTo(690,628); cc.lineTo(690,532); cc.bezierCurveTo(690,492, 720,480, 800,480); cc.bezierCurveTo(880,480, 910,492, 910,532); cc.lineTo(910,628); cc.closePath(); }, MAT.teal, { k:5, s:12, r:3, hl:[740,520,120,.18] });
    flat(g, cc => rr(cc, 730, 520, 140, 14, 7), '#16213a', .85);
    txt(g, tr('信'), 800, 576, 26, '#eaf5f2');
    txt(g, tr('MAIL · 寄出↓'), 800, 596, 10, '#cfe3e3', { mono:true, ls:2 });
    flat(g, cc => rr(cc, 760, 606, 80, 8, 4), '#16213a', .8);
    return;
  }
  if (st.id === 'board'){
    shadow(g, 780, 600, 300, 24, .5);
    vol(g, cc => rr(cc, 516, 266, 528, 338, 16), MAT.woodD, { k:4, s:10, r:2.5 });
    vol(g, cc => rr(cc, 532, 282, 496, 306, 10), MAT.cork, { k:-2, s:-6, lx:.5, ly:.8, r:0, tex:.7 });
    g.save(); g.translate(780, 276); g.rotate(-.035); vol(g, cc => rr(cc, -90, -20, 180, 40, 6), MAT.paper, { k:1.5, s:3.5 }); txt(g, tr('航行日志'), 0, 8, 22, '#2a3550'); g.restore();
    g.save(); g.translate(1155, 400); g.rotate(.035);
    shadow(g, 4, 118, 90, 10, .4);
    vol(g, cc => rr(cc, -85, -110, 170, 226, 6), MAT.paper, { k:2, s:5, r:1.5 });
    txt(g, tr('本船须知'), 0, -76, 21, '#2a3550');
    flat(g, cc => rr(cc, -68, -64, 136, 2, 1), '#c4b392');
    [tr('一　炉子用完关掉。'),tr('二　夜里走廊扶栏。'),tr('三　邮船每两钟头'),tr('　　靠一次舷。'),tr('四　穹顶熄灯轻声。')].forEach((l,i) => txt(g, l, -66, -36 + i*27, 15, '#2a3550', { align:'left' }));
    vol(g, cc => ell(cc, 0, -100, 6, 6), MAT.rose, { k:.8, s:2, tex:0 });
    g.restore();
    const items = G.log.slice(0,6);
    items.forEach((e,i) => { const col = i % 3, row = Math.floor(i/3), x = 552 + col*160, y = 306 + row*138, rot = [-3,2,-1,3,-2,1][i]*D2R;
      const lines = logLines(e.text);
      g.save(); g.translate(x+70, y+56); g.rotate(rot); g.translate(-x-70, -y-56);
      shadow(g, x+74, y+114, 70, 8, .35);
      vol(g, cc => rr(cc, x, y, 140, 112, 4), MAT.paper, { k:1.4, s:3, r:1 });
      vol(g, cc => ell(cc, x+70, y+6, 5.5, 5.5), MAT.rose, { k:.8, s:2, tex:0 });
      txt(g, ymd(e.t).slice(5) + ' ' + hhmm(e.t), x+12, y+30, 11, '#7d7a72', { mono:true, align:'left' });
      lines.forEach((l,k) => txt(g, l, x+12, y+56+k*22, 16, '#2a3550', { align:'left' }));
      g.restore(); });
    if (!items.length) txt(g, tr('还没有记录。'), 780, 440, 20, '#3a2414');
    return;
  }
  if (st.id === 'dome'){
    vol(g, cc => ell(cc, 800, 226, 140, 28), MAT.metalD, { k:3, s:7 });
    flat(g, cc => ell(cc, 800, 228, 118, 20), '#060b18');
    for (const x of [736, 864]) vol(g, cc => rr(cc, x-8, 226, 16, 556, 8), MAT.metal, { k:2.5, s:6, r:1.5 });
    for (let k=0;k<9;k++){ const y = 286 + k*58; vol(g, cc => rr(cc, 736, y-5, 128, 10, 5), MAT.metal, { k:1.5, s:3.5, tex:.25 }); }
    shadow(g, 800, 782, 90, 10, .5);
    vol(g, cc => rr(cc, 900, 380, 180, 66, 12), MAT.paper, { k:2, s:5, r:1.5 });
    txt(g, tr('观景穹顶 ↑'), 990, 414, 23, '#2a3550');
    txt(g, 'DOME', 990, 434, 10, '#7d7a72', { mono:true, ls:3 });
  }
}
export function stationSprite(st){
  const key = 'ring:st:' + st.id + (st.id === 'board' ? ':' + G.log.length + ':' + (G.log[0] ? G.log[0].t : 0) : '');
  if (st.id === 'board'){ for (const k of CACHE.keys()) if (k.startsWith('ring:st:board') && k !== key) CACHE.delete(k); }
  return cacheGet(key, ST_BOX[0], ST_BOX[1], ST_BOX[2], ST_BOX[3], g => stationArt(g, st), Math.max(1, 1.25/RS));
}
export const RIB = () => cacheGet('ring:rib', 760, 270, 80, 530, g => {
  vol(g, cc => rr(cc, 788, 284, 24, 440, 8), MAT.wall2, { k:3, s:7, r:2 });
  vol(g, cc => rr(cc, 780, 700, 40, 92, 8), MAT.metalD, { k:3, s:7, r:2 });
  vol(g, cc => rr(cc, 776, 276, 48, 26, 8), MAT.metalD, { k:2, s:5 });
});
export const PORT = () => cacheGet('ring:port', 640, 270, 320, 330, g => {
  vol(g, cc => { ell(cc, 800, 430, 58, 58); ell(cc, 800, 430, 44, 44); }, MAT.frame, { k:3, s:8, r:2, eo:true });
  for (let k=0;k<8;k++){ const a = k*45*D2R; vol(g, cc => ell(cc, 800 + Math.cos(a)*51, 430 + Math.sin(a)*51, 3, 3), MAT.metal, { k:.5, s:1, tex:0 }); }
  vol(g, cc => rr(cc, 796, 290, 8, 36, 4), MAT.metalD, { k:1, s:2, tex:0 });
  vol(g, cc => { cc.moveTo(778,326); cc.lineTo(822,326); cc.lineTo(812,344); cc.lineTo(788,344); cc.closePath(); }, MAT.brass, { k:1, s:3, tex:0 });
});
export const PILLAR = () => cacheGet('ring:pillar', 730, 120, 140, 900, g => {
  vol(g, cc => rr(cc, 768, 150, 64, 860, 22), MAT.dark, { k:5, s:12, r:3, ra:.6 });
  vol(g, cc => rr(cc, 756, 940, 88, 70, 14), MAT.dark, { k:4, s:9 });
  vol(g, cc => rr(cc, 756, 130, 88, 60, 14), MAT.dark, { k:4, s:9 });
});
export const BENCH = () => cacheGet('ring:bench', 460, 700, 680, 200, g => {
  shadow(g, 800, 880, 330, 22, .6);
  for (const x of [560, 1040]) vol(g, cc => rr(cc, x-10, 800, 20, 80, 6), MAT.metalD, { k:2, s:5 });
  vol(g, cc => rr(cc, 510, 790, 580, 58, 22), MAT.cushion, { k:4, s:10, r:2.5, hl:[640,800,160,.2] });
  vol(g, cc => rr(cc, 490, 736, 620, 64, 26), MAT.cushion, { k:4, s:10, r:2.5 });
  vol(g, cc => rr(cc, 934, 760, 124, 44, 16), MAT.blanket, { k:2, s:5, r:1.5 });
  flat(g, cc => { rr(cc, 960, 762, 6, 40, 3); rr(cc, 1010, 762, 6, 40, 3); }, '#f6dcbf', .7);
});

/* ---- build ---- */
export function buildCorridor(){
  const R = mulberry32(4711);
  S.bw = []; for (let i=0;i<90;i++) S.bw.push({ x:440 + R()*720, y:276 + R()*272, v:.6 + R()*.8, r:.7 + R()*1.4, c:R() < .1 ? '#ffd9a3' : '#e2ecf5', tw:R()*6 });
  S.portStars = []; for (let i=0;i<14;i++) S.portStars.push({ x:R()*120 - 60, y:R()*80 - 40, r:.7 + R()*1.2 });
  const map = $('#ringMap'); let m = `<ellipse cx="110" cy="32" rx="96" ry="22" fill="none" stroke="rgba(180,205,224,.28)" stroke-width="5"/>`;
  RING.forEach((st,i) => { const a = st.ang*D2R, x = 110 + Math.sin(a)*96, y = 32 + Math.cos(a)*22;
    m += tr('<g class="st" data-i="{0}" tabindex="0" role="button" aria-label="走到{1}"><circle cx="{2}" cy="{3}" r="{4}" fill="{5}"/><circle cx="{6}" cy="{7}" r="12" fill="transparent"/></g>', i, st.label, x.toFixed(1), y.toFixed(1), st.go?6:4, st.go ? (st.color || '#9cbcd2') : '#97a9bf', x.toFixed(1), y.toFixed(1)); });
  m += `<circle id="rmYou" r="4" fill="#ffd9a3"/>`;
  map.innerHTML = m;
  map.addEventListener('click', e => { const g = e.target.closest('.st'); if (g) walkTo(RING[+g.dataset.i].ang); });
  map.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('.st'); if (g){ e.preventDefault(); walkTo(RING[+g.dataset.i].ang); } });
}
export function walkTo(ang){ if (S.room !== 'corridor') return; standUp(); S.phiV = 0; S.phiTarget = S.phi + angDiff(ang, S.phi); }
export function walkStep(dir){ if (S.room !== 'corridor') return; standUp(); const base = S.phiTarget ?? Math.round(S.phi/STEP)*STEP; S.phiV = 0; S.phiTarget = Math.round(base/STEP)*STEP + dir*STEP; }
export function nearestStation(){ let best = RING[0], bd = 999; RING.forEach(st => { const d = Math.abs(angDiff(st.ang, S.phi)); if (d < bd){ bd = d; best = st; } }); return best; }
export function standUp(){ if (!S.sitting) return; S.sitting = false; setCtx([]); say(tr('你从长椅上站起来。')); updateHud(); }

ROOMS.corridor = {
  zoom(){ return S.sitting ? 1.22 : 1; }, zc:[800, 450],
  enter(){ setCtx([]); updateMailbox(); },
  exit(){ S.sitting = false; },
  update(dt){
    const prev = S.phi;
    if (!(S.drag && S.drag.ring)){
      if (S.phiTarget != null){ const d = angDiff(S.phiTarget, S.phi); S.phi += d*(1-Math.exp(-dt*3.2)); if (Math.abs(d) < .05){ S.phi = S.phiTarget; S.phiTarget = null; } }
      else if (Math.abs(S.phiV) > .5){ S.phi += S.phiV*dt; S.phiV *= Math.exp(-dt*2.6); if (Math.abs(S.phiV) < 6){ S.phiV = 0; S.phiTarget = nearestStation().ang; } }
    }
    S.phi = mod(S.phi, 360);
    const moved = Math.abs(angDiff(S.phi, prev));
    S.stepAcc += moved; if (S.stepAcc > 5.5){ S.stepAcc = 0; AU.step(); }
    if (moved > .01) G.ang = S.phi;
    S.walkBob = moved > .02 ? Math.min(1, (S.walkBob||0) + dt*4) : Math.max(0, (S.walkBob||0) - dt*3);
    CAM.lift = Math.sin(S.T*7.5)*3*S.walkBob*(G.reduced ? .2 : 1);
    const ns = nearestStation(); if (S.ringLabel !== ns.label){ S.ringLabel = ns.label; $('#navLabel').textContent = ns.label; $('#where').textContent = tr('环廊 · ') + ns.label; }
    const a = S.phi*D2R, you = $('#rmYou'); you.setAttribute('cx', (110 + Math.sin(a)*96).toFixed(1)); you.setAttribute('cy', (32 + Math.cos(a)*22).toFixed(1));
    const spin = S.sitting ? 9 : 14;
    S.bw.forEach(s => { s.x -= s.v*spin*dt; if (s.x < 430) s.x = 1170; });
    updateOtherShip(dt);
  },
  room(c){
    const phi = S.phi;
    // backdrop: the near ceiling and what lies beyond the near floor edge
    c.setTransform(1,0,0,1,0,0); c.fillStyle = '#121a2e'; c.fillRect(0,0,CW,CH);
    // ceiling band
    const ceil = bandPts(K_RW, R_WT, K_RN, R_CN, -42, 42);
    let g0 = ringPt(K_RW, R_WT, 0), g1 = ringPt(K_RN, R_CN, 0);
    let gr = c.createLinearGradient(0, g1[1], 0, g0[1]); gr.addColorStop(0, '#1a2440'); gr.addColorStop(.7, '#2b3a5c'); gr.addColorStop(1, '#3a4d74');
    c.beginPath(); polyP(c, ceil); c.fillStyle = gr; c.fill();
    // light strip running along the ceiling
    const strip = []; for (let a=-42;a<=42;a+=2){ const [k,R] = surf(.32,'ceil'); strip.push(ringPt(k, R, a)); } for (let a=42;a>=-42;a-=2){ const [k,R] = surf(.4,'ceil'); strip.push(ringPt(k, R, a)); }
    c.beginPath(); polyP(c, strip); c.fillStyle = 'rgba(200,220,240,.12)'; c.fill();
    // far wall annulus
    const wall = bandPts(K_RW, R_WT, K_RW, R_WB, -36, 36);
    g0 = ringPt(K_RW, R_WT, 0); g1 = ringPt(K_RW, R_WB, 0);
    gr = c.createLinearGradient(0, g0[1], 0, g1[1]); gr.addColorStop(0, '#2e3f62'); gr.addColorStop(.12, '#4a6189'); gr.addColorStop(.6, '#3d527a'); gr.addColorStop(.88, '#33476c'); gr.addColorStop(1, '#253553');
    c.beginPath(); polyP(c, wall); c.fillStyle = gr; c.fill();
    c.save(); c.beginPath(); polyP(c, wall); c.clip(); c.globalAlpha = .35; c.globalCompositeOperation = 'soft-light'; c.fillStyle = pat(c, 2, 1.75, -.24, 90); c.fill(); c.restore();
    // trim rails (painted bands, top and bottom of the wall)
    const band = (k, R0, R1, col, a=1) => { c.setTransform(1,0,0,1,0,0); c.beginPath(); polyP(c, bandPts(k, R0, k, R1, -36, 36)); c.globalAlpha = a; c.fillStyle = col; c.fill(); c.globalAlpha = 1; };
    band(K_RW, R_WT, R_WT + 26, '#2a3a5c'); band(K_RW, R_WT + 26, R_WT + 32, '#6f8fbd', .8);
    band(K_RW, R_WB - 64, R_WB - 58, '#7da0cc', .5); band(K_RW, R_WB - 58, R_WB, '#2b3c5e');
    // ribs + ports + stations (far wall, rotated about the ring centre)
    for (let k=0;k<18;k++){ const ang = STEP/4 + k*(STEP/2), d = angDiff(ang, phi); if (Math.abs(d) > 30) continue; setM(c, ringM(K_RW, d)); blit(c, RIB()); }
    for (let k=0;k<9;k++){ const ang = STEP/2 + k*STEP, d = angDiff(ang, phi); if (Math.abs(d) > 30) continue; const m = ringM(K_RW, d); setM(c, m);
      c.save(); c.beginPath(); ell(c, 800, 430, 44, 44); c.clip();
      const sg = c.createLinearGradient(0, 386, 0, 474); sg.addColorStop(0, '#0a1226'); sg.addColorStop(1, '#1a2b4d'); c.fillStyle = sg; c.fillRect(740, 380, 120, 100);
      const sx = -mod(S.T*(S.sitting ? 9 : 14)*.6 + k*31, 120);
      S.portStars.forEach(s => { const x = 800 + mod(s.x + sx + 60, 120) - 60; c.fillStyle = '#e2ecf5'; c.globalAlpha = .9; c.fillRect(x, 430 + s.y, s.r, s.r); }); c.globalAlpha = 1;
      c.globalAlpha = .12; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(770,380); c.lineTo(790,380); c.lineTo(760,480); c.lineTo(740,480); c.closePath(); c.fill(); c.globalAlpha = 1;
      c.restore(); blit(c, PORT()); }
    const where = anWhere();
    RING.forEach(st => {
      const d = angDiff(st.ang, phi); if (Math.abs(d) > 34) return;
      const m = ringM(K_RW, d); setM(c, m);
      if (st.id === 'window') drawBigWindow(c);
      blit(c, stationSprite(st));
      ringStationLive(c, st, where);
    });
    // floor band
    c.setTransform(1,0,0,1,0,0);
    const floor = bandPts(K_RW, R_WB, K_RN, R_FN, -42, 42);
    g0 = ringPt(K_RW, R_WB, 0); g1 = ringPt(K_RN, R_FN, 0);
    gr = c.createLinearGradient(0, g0[1], 0, g1[1]); gr.addColorStop(0, '#1c2741'); gr.addColorStop(.3, '#2f3e60'); gr.addColorStop(1, '#3d4f75');
    c.beginPath(); polyP(c, floor); c.fillStyle = gr; c.fill();
    const runner = []; for (let a=-42;a<=42;a+=1.5){ const [k,R] = surf(.32,'floor'); runner.push(ringPt(k, R, a)); } for (let a=42;a>=-42;a-=1.5){ const [k,R] = surf(.7,'floor'); runner.push(ringPt(k, R, a)); }
    c.beginPath(); polyP(c, runner); c.fillStyle = '#5a3f4f'; c.fill();
    const runIn = []; for (let a=-42;a<=42;a+=1.5){ const [k,R] = surf(.38,'floor'); runIn.push(ringPt(k, R, a)); } for (let a=42;a>=-42;a-=1.5){ const [k,R] = surf(.64,'floor'); runIn.push(ringPt(k, R, a)); }
    c.beginPath(); polyP(c, runIn); c.fillStyle = '#7a5566'; c.fill();
    c.save(); c.beginPath(); polyP(c, floor); c.clip(); c.globalAlpha = .4; c.globalCompositeOperation = 'soft-light'; c.fillStyle = pat(c, 2, 1.4, .36, 150); c.fill(); c.restore();
    // seams sweep with the spin
    c.fillStyle = 'rgba(8,12,26,.34)';
    for (let k=0;k<72;k++){ const ang = k*5, d = angDiff(ang, phi); if (Math.abs(d) > 40) continue;
      const a0 = ringPt(K_RW, R_WB, d - .05), a1 = ringPt(K_RW, R_WB, d + .05), b0 = ringPt(K_RN, R_FN, d - .18), b1 = ringPt(K_RN, R_FN, d + .18);
      c.beginPath(); polyP(c, [a0, a1, b1, b0]); c.fill(); }
    const ao = []; for (let a=-42;a<=42;a+=2) ao.push(ringPt(K_RW, R_WB, a)); for (let a=42;a>=-42;a-=2){ const [k,R] = surf(.12,'floor'); ao.push(ringPt(k, R, a)); }
    c.beginPath(); polyP(c, ao); c.fillStyle = 'rgba(5,9,20,.45)'; c.fill();
    // bench in front of the big window (play plane)
    { const d = angDiff(WINDOW_ANG, phi); if (Math.abs(d) < 34){ const m = mmul(ringM(1, d), [1,0,0,1,0,-34]); setM(c, m); blit(c, BENCH()); if (!S.sitting) hit(c, 'ring:sit', ['r', 490, 730, 620, 140], { label:tr('舷窗长椅') }); } }
    // near pillars, fastest
    for (let k=0;k<9;k++){ const ang = STEP/2 + k*STEP, d = angDiff(ang, phi); if (Math.abs(d) > 26) continue; setM(c, ringM(K_RN, d)); blit(c, PILLAR()); }
  },
  light(){
    lightBegin('#050a1a', .5);
    for (let k=0;k<9;k++){ const ang = STEP/2 + k*STEP, d = angDiff(ang, S.phi); if (Math.abs(d) > 34) continue; const m = ringM(K_RW, d); holeM(m, 800, 360, 340, .85, 300); }
    const where = anWhere();
    RING.forEach(st => { const d = angDiff(st.ang, S.phi); if (Math.abs(d) > 34) return; const m = ringM(K_RW, d);
      if (st.id === 'gang') holeM(m, 800, 300, docked() ? 150 : 70, docked() ? .6 : .18);
      else if (st.go && st.id !== 'dome') holeM(m, 800, 440, 120, .55);
      if (st.id === 'window') holeM(m, 800, 420, 420, .35, 240);
      if (st.id === 'dome') holeM(m, 800, 240, 260, .6, 160);
      if (st.id === 'mail') holeM(m, 800, 300, 160, .2); });
  },
  over(c){
    for (let k=0;k<9;k++){ const ang = STEP/2 + k*STEP, d = angDiff(ang, S.phi); if (Math.abs(d) > 34) continue; const m = ringM(K_RW, d); setM(c, m);
      c.globalCompositeOperation = 'lighter'; glowAt(c, SWARM, 800, 352, 110, .42); glowAt(c, SWARM, 800, 336, 26, .8); c.globalCompositeOperation = 'source-over'; }
    const where = anWhere();
    RING.forEach(st => { const d = angDiff(st.ang, S.phi); if (Math.abs(d) > 34) return; const m = ringM(K_RW, d); setM(c, m);
      c.globalCompositeOperation = 'lighter';
      if (st.id === 'gang'){ if (docked()) glowAt(c, SWARM, 800, 284, 74, .5 + .12*Math.sin(S.T*1.6)); }
      else if (st.go && st.id !== 'dome'){ const spr = st.id === 'green' ? (G.growLamp ? SPINK : STEAL) : SWARM; glowAt(c, spr, 800, 440, 70, st.id === 'green' && G.growLamp ? .55 : .35); }
      if (st.id === 'radio' && (G.radioOn || G.wind > 0)) glowAt(c, SROSE, 877, 488, 46, .7);
      if (st.id === 'dome') glowAt(c, SIND, 800, 236, 190, .55 + .15*Math.sin(S.T*.8), 70);
      c.globalCompositeOperation = 'source-over'; });
  }
};
export function drawBigWindow(c){
  c.save(); c.beginPath(); rr(c, 438, 268, 724, 288, 76); c.clip();
  const g = c.createLinearGradient(0, 268, 0, 556); g.addColorStop(0, '#080f20'); g.addColorStop(.6, '#111d38'); g.addColorStop(1, '#1d2e52'); c.fillStyle = g; c.fillRect(430, 260, 740, 300);
  c.globalAlpha = .7; c.drawImage(SIND, 600, 300, 600, 220); c.globalAlpha = .3; c.drawImage(SROSE, 820, 330, 300, 140); c.globalAlpha = 1;
  S.bw.forEach(s => { const tw = .7 + .3*Math.sin(S.T*1.3 + s.tw); c.globalAlpha = tw; c.fillStyle = s.c; if (s.r > 1.4){ c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI*2); c.fill(); } else c.fillRect(s.x, s.y, s.r*1.4, s.r*1.4); });
  c.globalAlpha = 1;
  const sh = S.otherShip;
  if (sh){ c.save(); c.translate(sh.x, sh.y + Math.sin(sh.t*.6)*3); c.scale(.85, .85);
    vol(c, cc => { cc.moveTo(-92,0); cc.bezierCurveTo(-82,-24, 70,-26, 98,-4); cc.lineTo(92,10); cc.bezierCurveTo(40,18, -60,18, -92,0); cc.closePath(); }, { l:'#3a4f78', b:'#1c2a48', d:'#0d1528', r:'#5f7899' }, { k:3, s:8, r:2, ra:.9, tex:.3 });
    vol(c, cc => { rr(cc, -34, -40, 6, 28, 3); rr(cc, 8, -34, 5, 22, 2.5); }, MAT.dark, { k:1, s:2, tex:0 });
    for (let k=0;k<6;k++){ const on = S.shipBlink > 0 ? (Math.sin(S.T*10 + k) > 0 ? 1 : .2) : .9; c.globalAlpha = on; c.fillStyle = '#ffd9a3'; c.beginPath(); rr(c, -58 + k*22, -8, 10, 7, 2); c.fill();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = on*.5; c.drawImage(SWARM, -63 + k*22, -14, 20, 20); c.globalCompositeOperation = 'source-over'; }
    c.globalAlpha = 1;
    hit(c, 'ring:ship', ['r', -110, -50, 220, 80], { label:tr('那艘船') });
    c.restore(); }
  c.globalAlpha = .06; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(520,556); c.lineTo(560,556); c.lineTo(680,268); c.lineTo(640,268); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(590,556); c.lineTo(604,556); c.lineTo(724,268); c.lineTo(710,268); c.closePath(); c.fill(); c.globalAlpha = 1;
  c.restore();
}
export function ringStationLive(c, st, where){
  if (st.id === 'gang'){
    /* The plate under the lamp is the one place in the ring that says where the
       ship is going, so it is painted live rather than cached with the door. */
    const P = callPort(), on = docked();
    flat(c, cc => ell(cc, 800, 282, 22, 11), on ? '#ffd9a3' : '#4a5570', on ? 1 : .8);
    vol(c, cc => rr(cc, 684, 664, 232, 62, 8), MAT.paper, { k:1.5, s:3.5, r:1 });
    if (P){
      txtFit(c, on ? tr('已靠上') : tr('下一站'), 800, 688, 200, 14, '#7d7a72');
      txtFit(c, tr(P.name), 800, 714, 210, 22, '#2a3550');
    } else txtFit(c, tr('没有下一站'), 800, 702, 210, 19, '#7d7a72');
    hit(c, 'go:hatch', ['r', 648, 330, 304, 452], { label:st.label });
    return;
  }
  if (st.go && st.id !== 'dome'){
    const there = where === st.id || (st.id === 'cabin' && where === 'cabinSleep');
    c.save(); c.beginPath(); ell(c, 800, 440, 31, 31); c.clip();
    const glowCol = st.id === 'green' ? (G.growLamp ? '#ff9fbf' : '#62b0a8') : '#f2a95b';
    const gg = c.createRadialGradient(800, 450, 2, 800, 440, 34); gg.addColorStop(0, rgba(glowCol, .9)); gg.addColorStop(1, rgba(glowCol, .25)); c.fillStyle = gg; c.fillRect(760, 400, 80, 80);
    if (there) drawAnSilhouette(c, 798, 452, 1, '#16213a', .88);
    c.restore();
    flat(c, cc => { ell(cc, 788, 424, 12, 6, -.6); }, '#ffffff', .18);
    if (st.id === 'radio'){ const air = G.radioOn || G.wind > 0; txt(c, 'ON AIR', 877, 493, 11, air ? '#ffb4a6' : '#5a4a5a', { mono:true, ls:1 }); }
    hit(c, 'go:' + st.go, ['p', [[664,780],[664,392],[700,300],[800,256],[900,300],[936,392],[936,780]]], { label:st.label });
    return;
  }
  if (st.id === 'window'){ if (!S.sitting) hit(c, 'ring:sit', ['r', 438, 268, 724, 288], { label:tr('舷窗长椅') }); return; }
  if (st.id === 'mail'){
    const t = new Date(now()); const hh = t.getHours()%12 + t.getMinutes()/60, mm = t.getMinutes() + t.getSeconds()/60;
    const hand = (deg, len, w, col, back=0) => { c.save(); c.translate(800, 300); c.rotate(deg*D2R); flat(c, cc => rr(cc, -w/2, -len, w, len + back, w/2), col); c.restore(); };
    hand(hh*30, 44, 7, '#2a3550'); hand(mm*6, 64, 4.5, '#2a3550'); hand(t.getSeconds()*6, 70, 2, '#c46a52', 10);
    vol(c, cc => ell(cc, 800, 300, 6, 6), MAT.brass, { k:.6, s:1.5, tex:0 });
    txt(c, tr('航行第 {0} 夜', Math.max(1, G.nights.length)), 800, 441, 21, '#2a3550');
    hit(c, 'ring:clock', ['c', 800, 300, 100], { label:tr('船钟') });
    const n = G.mail.box.length;
    c.save(); c.translate(912, 600); c.rotate(n ? 0 : Math.PI/2);
    vol(c, cc => rr(cc, -3, -80, 6, 80, 3), MAT.metal, { k:.6, s:1.5, tex:0 });
    vol(c, cc => rr(cc, 0, -80, 40, 24, 3), MAT.rose, { k:1, s:2.5, tex:0 });
    c.restore();
    if (n) for (let i=0;i<n;i++){ c.globalCompositeOperation = 'lighter'; glowAt(c, SAMBER, 788 + i*12 - (n-1)*6 + 12, 506, 9, .9); c.globalCompositeOperation = 'source-over'; }
    hit(c, 'ring:mail', ['r', 690, 480, 220, 150], { label:tr('信箱') + (n ? tr('（{0} 封）', n) : '') });
    return;
  }
  if (st.id === 'board'){ hit(c, 'ring:log', ['r', 516, 266, 528, 338], { label:tr('布告板') }); return; }
  if (st.id === 'dome'){ hit(c, 'go:dome', ['r', 700, 196, 390, 590], { label:tr('穹顶梯') }); }
}
export function updateOtherShip(dt){
  S.shipCool -= dt;
  if (!S.otherShip && S.sitting && PR.stillT > 14 && S.shipCool <= 0){
    S.otherShip = { x:1240, y:rand(340,480), t:0 };
    if (onceS('shipSeen')) say(tr('窗外远处，有另一艘船的灯慢慢移过来。'));
  }
  const sh = S.otherShip; if (!sh) return;
  sh.t += dt; sh.x -= 16*dt; if (S.shipBlink > 0) S.shipBlink -= dt;
  if (sh.x < 340){ S.otherShip = null; S.shipCool = 160; }
}
ACT['ring:sit'] = { tap(){
  if (S.sitting){ standUp(); return; }
  S.sitting = true; S.phiTarget = WINDOW_ANG; AU.soft(); updateHud();
  say(once('sitFirst') ? tr('你在长椅上坐下。星星从窗的一边转到另一边：这艘船在自己转。') : tr('你在长椅上坐下。'));
  if (once('sitHint')) say(tr('坐着别动，窗外有时会经过别的东西。'), null, 5200);
  setCtx([{ label:tr('站起来'), fn:standUp }]);
}};
ACT['ring:ship'] = { tap(){
  if (!S.otherShip) return; AU.bell(76,.06); AU.bell(81,.04,.25);
  S.shipBlink = 2.4; G.shipsSeen++; addLog(tr('在舷窗看见另一艘夜航船，它眨了眨窗灯')); markDirty();
  say(G.shipsSeen === 1 ? tr('你朝那艘船挥了挥手。它的窗灯一盏盏眨了一下。') : tr('那艘船的窗灯又眨了一下。'));
}};
ACT['ring:clock'] = { tap(){ AU.tap(); const h = localHour();
  say(tr('船钟指着 {0}。航行第 {1} 夜。', hhmm(now()), G.nights.length) + (h >= 22 || h < 6 ? tr('夜深了，岸多半在上面的穹顶，或者睡了。') : '')); } };
ACT['ring:mail'] = { tap(){ openMail(); } };
ACT['ring:log'] = { tap(){ openLog(); } };
