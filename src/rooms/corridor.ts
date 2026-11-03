import { tr } from '../i18n';
import { AU } from '../audio/index';
import { CACHE, blit, cacheGet } from '../core/cache';
import { CAM, mat, tp } from '../core/camera';
import { hit } from '../core/hits';
import { holeM, lightBegin } from '../core/light';
import { MAT } from '../core/materials';
import { PORT_ORDER } from '../data/ports';
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
import { orderState } from '../ui/worksheet';
import { drawSlip, voyageSlip, workSlip } from '../ui/sheet';
import { callPort, docked } from './hatch';
import { openMail, updateMailbox } from '../ui/mail';

/* ================= RING CORRIDOR =================
   The corridor is built like every other room: a flat ceiling and a flat wall
   across the frame, a floor that fans out toward the viewer, and the walk
   sliding the whole lattice sideways -- the far wall slowest, the near pillars
   fastest. The ceiling and the floor are the quads between the wall and a near
   edge off the top and the bottom of the frame, recomputed every frame, so they
   shear as the camera drifts. */
export const WINDOW_ANG = RING.find(s => s.id === 'window').ang;
export const K_RW = .62, K_RN = 1.32;        // the far wall, and the near pillars
export const PPD = 30;                        // design units of wall per degree walked
export const WT = 190, WB = 790;              // the wall's top rail, and its foot
export const FN = 1020, CN = -330;            // the near edge of the floor, and of the ceiling
export const SPREAD = 1.86;                   // how far the floor has fanned out by its near edge
export function mmul(A, B){ return [A[0]*B[0]+A[2]*B[1], A[1]*B[0]+A[3]*B[1], A[0]*B[2]+A[2]*B[3], A[1]*B[2]+A[3]*B[3], A[0]*B[4]+A[2]*B[5]+A[4], A[1]*B[4]+A[3]*B[5]+A[5]]; }
/* `rate` is how fast this layer slides past the walk, counted against the wall.
   It is kept apart from the depth `k` because the bench has to stay in its
   alcove while still sitting on a nearer plane than the wall behind it. */
export function ringM(k, rel, rate?){ return mmul(mat(k), [1, 0, 0, 1, -rel*PPD*(rate ?? k/K_RW), 0]); }
export function setM(c, m){ c.setTransform(m[0],m[1],m[2],m[3],m[4],m[5]); }
/* A point on the floor or the ceiling: t = 0 at the wall, 1 at the near edge,
   x in wall space. Both fan out by the same amount, so the seams overhead run
   away at the same rate as the ones underfoot. */
export function spt(t, x, yFar, yNear){ return tp(mat(lerp(K_RW, K_RN, t)), 800 + (x - 800)*lerp(1, SPREAD, t), lerp(yFar, yNear, t)); }
export function fpt(t, x){ return spt(t, x, WB, FN); }
export function cpt(t, x){ return spt(t, x, WT, CN); }
export function fquad(t0, t1, x0, x1){ return [fpt(t0,x0), fpt(t0,x1), fpt(t1,x1), fpt(t1,x0)]; }
export function cquad(t0, t1, x0, x1){ return [cpt(t0,x0), cpt(t0,x1), cpt(t1,x1), cpt(t1,x0)]; }

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
  vol(g, cc => rr(cc, 696, 204, 208, 64, 10), MAT.paper, { k:2, s:5, r:1.5 });
  txt(g, st.name, 800, 240, 25, '#2a3550');
  txt(g, st.en, 800, 256, 10, '#7d7a72', { mono:true, ls:3 });
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
    /* The cork carries three pinned things, and only one of them is static:
       the work slip and the voyage slip are written on as the round moves, so
       they are painted live in ringStationLive. What is cached here is the
       board, the log column and the ship's notice beside it. */
    shadow(g, 790, 614, 300, 24, .5);
    vol(g, cc => rr(cc, 520, 252, 560, 360, 16), MAT.woodD, { k:4, s:10, r:2.5 });
    vol(g, cc => rr(cc, 536, 268, 528, 328, 10), MAT.cork, { k:-2, s:-6, lx:.5, ly:.8, r:0, tex:.7 });
    g.save(); g.translate(1004, 288); g.rotate(-.03);
    vol(g, cc => rr(cc, -60, -15, 120, 30, 5), MAT.paper, { k:1.4, s:3.5 });
    txtFit(g, tr('航行日志'), 0, 6, 104, 17, '#2a3550'); g.restore();
    const items = G.log.slice(0,2);
    items.forEach((e,i) => { const x = 944, y = 310 + i*140, rot = [-2.4, 2][i]*D2R;
      const lines = logLines(e.text, 6);
      g.save(); g.translate(x+60, y+56); g.rotate(rot); g.translate(-x-60, -y-56);
      shadow(g, x+62, y+114, 58, 8, .35);
      vol(g, cc => rr(cc, x, y, 120, 112, 4), MAT.paper, { k:1.4, s:3, r:1 });
      vol(g, cc => ell(cc, x+60, y+6, 5.5, 5.5), MAT.rose, { k:.8, s:2, tex:0 });
      txt(g, ymd(e.t).slice(5) + ' ' + hhmm(e.t), x+9, y+30, 9.5, '#7d7a72', { mono:true, align:'left' });
      lines.forEach((l,k) => txt(g, l, x+9, y+56+k*21, 13.5, '#2a3550', { align:'left' }));
      g.restore(); });
    if (!items.length) txt(g, tr('还没有记录。'), 1004, 430, 16, '#3a2414');
    g.save(); g.translate(1163, 400); g.rotate(.035);
    shadow(g, 4, 118, 78, 10, .4);
    vol(g, cc => rr(cc, -74, -110, 148, 226, 6), MAT.paper, { k:2, s:5, r:1.5 });
    txt(g, tr('本船须知'), 0, -76, 20, '#2a3550');
    flat(g, cc => rr(cc, -60, -64, 120, 2, 1), '#c4b392');
    [tr('一　炉子用完关掉。'),tr('二　夜里走廊扶栏。'),tr('三　邮船每两钟头'),tr('　　靠一次舷。'),tr('四　穹顶熄灯轻声。')].forEach((l,i) => txt(g, l, -58, -36 + i*27, 14.5, '#2a3550', { align:'left' }));
    vol(g, cc => ell(cc, 0, -100, 6, 6), MAT.rose, { k:.8, s:2, tex:0 });
    g.restore();
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
    c.setTransform(1,0,0,1,0,0); c.fillStyle = '#0c1322'; c.fillRect(0,0,CW,CH);
    // the ceiling, running back over the viewer
    const ceil = cquad(0, 1, -2400, 4000);
    let gr = c.createLinearGradient(0, cpt(0,800)[1], 0, cpt(.45,800)[1]);
    gr.addColorStop(0, '#3a4d74'); gr.addColorStop(.5, '#2b3a5c'); gr.addColorStop(1, '#19233e');
    c.beginPath(); polyP(c, ceil); c.fillStyle = gr; c.fill();
    c.save(); c.beginPath(); polyP(c, ceil); c.clip(); c.globalAlpha = .3; c.globalCompositeOperation = 'soft-light'; c.fillStyle = pat(c, 2, 1.6, .3, 110); c.fill(); c.restore();
    /* Beams overhead on the same lattice as the ribs below, each with a lit
       edge on the side the lamps are. They are what makes walking read up
       there, where the ceiling itself has nothing else to go by. */
    for (let k=0;k<18;k++){ const ang = STEP/4 + k*(STEP/2), d = angDiff(ang, phi); if (Math.abs(d) > 46) continue; const x = 800 - d*PPD;
      c.beginPath(); polyP(c, [cpt(0, x-11), cpt(0, x+11), cpt(.62, x+18), cpt(.62, x-18)]); c.fillStyle = 'rgba(9,14,28,.42)'; c.fill();
      c.beginPath(); polyP(c, [cpt(0, x+6), cpt(0, x+11), cpt(.62, x+18), cpt(.62, x+10)]); c.fillStyle = 'rgba(146,174,208,.16)'; c.fill(); }
    // the light strip the whole corridor runs under
    c.beginPath(); polyP(c, cquad(.09, .18, -2400, 4000)); c.fillStyle = 'rgba(205,224,242,.16)'; c.fill();
    c.beginPath(); polyP(c, cquad(.115, .155, -2400, 4000)); c.fillStyle = 'rgba(228,240,252,.2)'; c.fill();
    c.beginPath(); polyP(c, cquad(0, .04, -2400, 4000)); c.fillStyle = 'rgba(5,9,20,.4)'; c.fill();
    // the far wall: the surface stands still, and only what is mounted on it walks past
    setM(c, mat(K_RW));
    gr = c.createLinearGradient(0, WT, 0, WB);
    gr.addColorStop(0, '#2e3f62'); gr.addColorStop(.12, '#4a6189'); gr.addColorStop(.6, '#3d527a'); gr.addColorStop(.88, '#33476c'); gr.addColorStop(1, '#253553');
    c.beginPath(); c.rect(-5000, WT, 10000, WB - WT); c.fillStyle = gr; c.fill();
    c.save(); c.clip(); c.globalAlpha = .35; c.globalCompositeOperation = 'soft-light'; c.fillStyle = pat(c, 2, 1.75, -.24, 90); c.fill(); c.restore();
    // the rails the wall is trimmed with, top and bottom
    flat(c, cc => cc.rect(-5000, WT, 10000, 26), '#2a3a5c');
    flat(c, cc => cc.rect(-5000, WT + 26, 10000, 7), '#6f8fbd', .8);
    flat(c, cc => cc.rect(-5000, WB - 66, 10000, 7), '#7da0cc', .5);
    flat(c, cc => cc.rect(-5000, WB - 59, 10000, 59), '#2b3c5e');
    // ribs + hull ports + stations, all on the wall, all sliding at the wall's rate
    for (let k=0;k<18;k++){ const ang = STEP/4 + k*(STEP/2), d = angDiff(ang, phi); if (Math.abs(d) > 44) continue; setM(c, ringM(K_RW, d, 1)); blit(c, RIB()); }
    for (let k=0;k<9;k++){ const ang = STEP/2 + k*STEP, d = angDiff(ang, phi); if (Math.abs(d) > 44) continue; const m = ringM(K_RW, d, 1); setM(c, m);
      c.save(); c.beginPath(); ell(c, 800, 430, 44, 44); c.clip();
      const sg = c.createLinearGradient(0, 386, 0, 474); sg.addColorStop(0, '#0a1226'); sg.addColorStop(1, '#1a2b4d'); c.fillStyle = sg; c.fillRect(740, 380, 120, 100);
      const sx = -mod(S.T*(S.sitting ? 9 : 14)*.6 + k*31, 120);
      S.portStars.forEach(s => { const x = 800 + mod(s.x + sx + 60, 120) - 60; c.fillStyle = '#e2ecf5'; c.globalAlpha = .9; c.fillRect(x, 430 + s.y, s.r, s.r); }); c.globalAlpha = 1;
      c.globalAlpha = .12; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(770,380); c.lineTo(790,380); c.lineTo(760,480); c.lineTo(740,480); c.closePath(); c.fill(); c.globalAlpha = 1;
      c.restore(); blit(c, PORT()); }
    RING.forEach(st => {
      const d = angDiff(st.ang, phi); if (Math.abs(d) > 48) return;
      const m = ringM(K_RW, d, 1); setM(c, m);
      if (st.id === 'window') drawBigWindow(c);
      blit(c, stationSprite(st));
      ringStationLive(c, st);
    });
    // the floor, fanning out toward the viewer
    c.setTransform(1,0,0,1,0,0);
    const floor = fquad(0, 1, -2400, 4000);
    gr = c.createLinearGradient(0, fpt(0,800)[1], 0, fpt(1,800)[1]);
    gr.addColorStop(0, '#1c2741'); gr.addColorStop(.3, '#2f3e60'); gr.addColorStop(1, '#3d4f75');
    c.beginPath(); polyP(c, floor); c.fillStyle = gr; c.fill();
    c.beginPath(); polyP(c, fquad(.3, .72, -2400, 4000)); c.fillStyle = '#5a3f4f'; c.fill();
    c.beginPath(); polyP(c, fquad(.36, .66, -2400, 4000)); c.fillStyle = '#7a5566'; c.fill();
    c.save(); c.beginPath(); polyP(c, floor); c.clip(); c.globalAlpha = .4; c.globalCompositeOperation = 'soft-light'; c.fillStyle = pat(c, 2, 1.4, .36, 150); c.fill(); c.restore();
    // the seams run away from the viewer and sweep past as you walk
    c.fillStyle = 'rgba(8,12,26,.34)';
    for (let k=0;k<72;k++){ const ang = k*5, d = angDiff(ang, phi); if (Math.abs(d) > 46) continue; const x = 800 - d*PPD;
      c.beginPath(); polyP(c, [fpt(0, x-2), fpt(0, x+2), fpt(1, x+6), fpt(1, x-6)]); c.fill(); }
    c.beginPath(); polyP(c, fquad(0, .11, -2400, 4000)); c.fillStyle = 'rgba(5,9,20,.45)'; c.fill();
    // the bench in front of the big window, on the play plane
    { const d = angDiff(WINDOW_ANG, phi); if (Math.abs(d) < 40){ setM(c, mmul(ringM(1, d, 1.2), [1,0,0,1,0,-26])); blit(c, BENCH()); if (!S.sitting) hit(c, 'ring:sit', ['r', 490, 730, 620, 140], { label:tr('舷窗长椅') }); } }
    // the near pillars, fastest
    for (let k=0;k<9;k++){ const ang = STEP/2 + k*STEP, d = angDiff(ang, phi); if (Math.abs(d) > 30) continue; setM(c, ringM(K_RN, d, 1.6)); blit(c, PILLAR()); }
  },
  light(){
    lightBegin('#050a1a', .5);
    for (let k=0;k<9;k++){ const ang = STEP/2 + k*STEP, d = angDiff(ang, S.phi); if (Math.abs(d) > 44) continue; const m = ringM(K_RW, d, 1); holeM(m, 800, 360, 340, .85, 300); }
    RING.forEach(st => { const d = angDiff(st.ang, S.phi); if (Math.abs(d) > 48) return; const m = ringM(K_RW, d, 1);
      if (st.id === 'gang') holeM(m, 800, 300, docked() ? 150 : 70, docked() ? .6 : .18);
      else if (st.go && st.id !== 'dome') holeM(m, 800, 440, 120, .55);
      if (st.id === 'window') holeM(m, 800, 420, 420, .35, 240);
      if (st.id === 'dome') holeM(m, 800, 240, 260, .6, 160);
      if (st.id === 'mail') holeM(m, 800, 300, 160, .2); });
  },
  over(c){
    for (let k=0;k<9;k++){ const ang = STEP/2 + k*STEP, d = angDiff(ang, S.phi); if (Math.abs(d) > 44) continue; const m = ringM(K_RW, d, 1); setM(c, m);
      c.globalCompositeOperation = 'lighter'; glowAt(c, SWARM, 800, 352, 110, .42); glowAt(c, SWARM, 800, 336, 26, .8); c.globalCompositeOperation = 'source-over'; }
    RING.forEach(st => { const d = angDiff(st.ang, S.phi); if (Math.abs(d) > 48) return; const m = ringM(K_RW, d, 1); setM(c, m);
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
export function ringStationLive(c, st){
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
    c.save(); c.beginPath(); ell(c, 800, 440, 31, 31); c.clip();
    const glowCol = st.id === 'green' ? (G.growLamp ? '#ff9fbf' : '#62b0a8') : '#f2a95b';
    const gg = c.createRadialGradient(800, 450, 2, 800, 440, 34); gg.addColorStop(0, rgba(glowCol, .9)); gg.addColorStop(1, rgba(glowCol, .25)); c.fillStyle = gg; c.fillRect(760, 400, 80, 80);
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
  if (st.id === 'board'){
    /* The whole job, written out by hand: five lines down the left of the
       cork, the one you are on arrowed and opened up into its parts, the ones
       behind you ringed. Beside it, the round the ship is working. Reading the
       two should make the next thing to do obvious without a word of
       narration. */
    c.save(); c.translate(546, 278); c.rotate(-.011);
    const ws = workSlip(200, false); const wh = drawSlip(c, ws);
    hit(c, 'ui:work', ['r', -8, -8, 216, wh + 16], { label:tr('这一趟'), key:'work' });
    c.restore();
    c.save(); c.translate(752, 292); c.rotate(.016);
    const vs = voyageSlip(184); const vh = drawSlip(c, vs);
    hit(c, 'ring:voyage', ['r', -8, -8, 200, vh + 16], { label:tr('航程'), key:'voyage' });
    c.restore();
    hit(c, 'ring:log', ['r', 938, 272, 132, 300], { label:tr('航行日志') });
    return;
  }
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
  say(tr('船钟指着 {0}。航行第 {1} 夜。', hhmm(now()), G.nights.length) + (h >= 22 || h < 6 ? tr('夜深了。外面的灯也少了。') : '')); } };
ACT['ring:mail'] = { tap(){ openMail(); } };
ACT['ring:log'] = { tap(){ openLog(); } };
ACT['ring:voyage'] = { tap(){ AU.paper();
  const P = callPort();
  if (P){ say(P.ask); return; }
  const left = PORT_ORDER.filter(id => orderState(id) !== 'done').length;
  say(left ? tr('还有 {0} 个地方在等灯。', left) : tr('四个地方的灯都送到了。'));
}};
