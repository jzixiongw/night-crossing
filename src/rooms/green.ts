import { tr } from '../i18n';
import { AU } from '../audio/index';
import { blit, cacheGet } from '../core/cache';
import { CAM, cpt, inv, mat, setL, tp } from '../core/camera';
import { drawFX, drawPuffs, puff } from '../core/fx';
import { hit, hitAt } from '../core/hits';
import { glowL, hole, lightBegin } from '../core/light';
import { MAT, POT_COL } from '../core/materials';
import { SAMBER, SCOOL, SFOG, SIND, SOFT, SPINK, STEAL, SWARM, blob, duo, ell, flat, leafPath, rr, shadow, sphere, star5, stemPath, txt, txtFit, vol } from '../core/paint';
import { P, shell } from '../core/shell';
import { CH, CW, RS, cv } from '../core/surface';
import { $, D2R, MIN, clamp, lerp, mixHex, mulberry32, pick, rand } from '../core/util';
import { SEEDS } from '../data/index';
import { PORTS, PORT_ORDER } from '../data/ports';
import { ACT, ROOMS, setCtx } from './registry';
import { drawRig } from './hatch';
import { PR, S } from '../state/runtime';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { now } from '../state/time';
import { addLog, once, onceS, say } from '../ui/captions';
import { K_NR, K_SP, K_WL } from '../core/depth';
import { closePanels } from '../ui/panels';
import { STEPS, lastDelivered, orderState, stepNow } from '../ui/worksheet';
import { hangSlip } from '../ui/sheet';

/* ================= GREENHOUSE =================
   The one room that is wider than the window it is composed for. The garden
   fills the frame when you walk in; the seedling shelf is off the left edge and
   the work bench is off the right, and the drag is how you get to either. That
   is the whole reason the room is long: growing and building are two different
   jobs, so they happen in two different places and you have to go there.

   Everything here is laid out against three x bands, and nothing crosses them:
     the nursery   -1000 .. 60    shelf of young pots, against the back wall
     the garden      150 .. 1330  the long bench, five pots, the seed box
     the workshop   1370 .. 2070  bench, board rack, cover shelf, lamp tray  */
export const GH = { x0:-1140, x1:2740 };                 // what the layer caches cover
export const POT_Y = 598, SHELF_Y = 500, BENCH_X = 1700;
/* Eight pots in two ranks. The shelf rank sits a little behind the play plane
   and is painted smaller, so the room has depth of its own before the camera
   adds any. */
export const POTS = [
  { x:300,  y:POT_Y,   k:1,   s:1 },
  { x:520,  y:POT_Y,   k:1,   s:1 },
  { x:740,  y:POT_Y,   k:1,   s:1 },
  { x:960,  y:POT_Y,   k:1,   s:1 },
  { x:1180, y:POT_Y,   k:1,   s:1 },
  { x:-560, y:SHELF_Y, k:.92, s:.72 },
  { x:-330, y:SHELF_Y, k:.92, s:.72 },
  { x:-100, y:SHELF_Y, k:.92, s:.72 }
];
export const WATER_MS = 60*MIN;
export const GROW_BAR = [{ x:750, w:1020 }, { x:-330, w:640 }];
export const GH_SHELL = { kb:.62, kf:1.75, b:[-1060,40,2640,640], f:[-1700,-420,3300,1340],
  ceil:[[0,'rgba(60,96,110,.28)'],[1,'rgba(10,22,30,.85)']], floor:[[0,'#2c3d3c'],[.4,'#3a4d48'],[1,'#1c2828']], side:[[0,'rgba(50,80,92,.4)'],[1,'rgba(12,24,32,.9)']], seams:18, seamCol:'rgba(6,14,16,.3)' };
export function buildGreen(){
  const R = mulberry32(77); S.ghStars = []; for (let i=0;i<300;i++) S.ghStars.push({ x:-1100 + R()*3800, y:-120 + R()*760, r:.6 + R()*1.5, c:R() < .12 ? '#ffd9a3' : '#e2f2ee', ph:R()*6, tw:R() < .25 });
  S.drops = []; S.bellTips = []; S.lampK = G.growLamp ? 1 : 0; S.bellSwing = null;
  const n = POTS.length;
  S.fold = new Array(n).fill(0); S.curLean = new Array(n).fill(0); S.potWig = new Array(n).fill(0);
  S.potSpin = new Array(n).fill(0); S.foldPt = new Array(n).fill(0); S.bloomPts = {};
}
export function plantRand(i){ const p = G.pots[i]; return mulberry32((i+1)*7919 + Math.floor((p ? p.planted : 0) % 100000)); }
export function bloomReady(p){ return p && p.g >= 1 && now() >= (p.bloomAt || 0); }

/* ================= PLANTS =================
   Each species is painted in passes, back to front: what is behind the stem,
   the stem, what is in front of it, then whatever it is carrying. That is what
   gives a plant an inside -- a leaf that overlaps another leaf and is darker
   for it -- rather than a flat fan of shapes around a line.

   Big leaves go through vol(), small ones through duo(): two planes instead of
   five. A mature fern is forty leaflets, and at that count the difference is
   the frame rate. */
const LF3 = [MAT.leaf, MAT.leafD, { l:'#a6d8bb', b:'#6bb29a', d:'#3b7064', r:'#5aa08a' }];
const LF_PALE = { l:'#cfe6c4', b:'#9dc49e', d:'#5d8470', r:'#b6d6b4' };
function midrib(c, x0, y0, x1, y1, bend, a = .16){
  const dx = x1-x0, dy = y1-y0, L = Math.hypot(dx,dy) || 1, nx = -dy/L, ny = dx/L;
  flat(c, cc => stemPath(cc, x0, y0, (x0+x1)/2 + nx*bend*.3, (y0+y1)/2 + ny*bend*.3, x1, y1, 1.1, .3), '#dff0e4', a);
}
/* A leaf with a vein in it. `big` picks the five-plane volume over the two. */
function leafV(c, x0, y0, x1, y1, w, bend, M, big = true, o?){
  if (big) vol(c, cc => leafPath(cc, x0, y0, x1, y1, w, bend), M, o || { k:1, s:2.5, tex:.25 });
  else duo(c, cc => leafPath(cc, x0, y0, x1, y1, w, bend), M.b, M.l);
  if (w > 4) midrib(c, x0, y0, lerp(x0,x1,.9), lerp(y0,y1,.9), bend, big ? .18 : .12);
}
/* A curl of tendril: five shortening segments, each turned on from the last. */
function tendril(c, x, y, dir, len, col){
  let a = -.5, px = x, py = y;
  for (let s=0;s<5;s++){
    const L = len*(1 - s*.15), qx = px + Math.cos(a)*L*dir, qy = py + Math.sin(a)*L;
    flat(c, cc => stemPath(cc, px, py, (px+qx)/2, (py+qy)/2 - 2, qx, qy, 1.9 - s*.28, 1.6 - s*.28), col, .9);
    px = qx; py = qy; a += 1.15;
  }
}
/* A paper husk hanging off its stalk, lit from inside once the seed is ripe. */
function lantern(c, x, y, s, lit, dry){
  flat(c, cc => stemPath(cc, x, y, x + s*.1, y + s*.3, x, y + s*.52, 1.8, 1.2), '#3f5f55');
  const husk = cc => { cc.moveTo(x, y + s*.5); cc.bezierCurveTo(x - s*.76, y + s*.64, x - s*.62, y + s*1.52, x, y + s*1.76);
    cc.bezierCurveTo(x + s*.62, y + s*1.52, x + s*.76, y + s*.64, x, y + s*.5); cc.closePath(); };
  const M = lit ? { l:'#ffe6ae', b:'#f2c46b', d:'#a97a36', r:'#ffd79a' } : dry ? { l:'#e8ddbe', b:'#c6b68f', d:'#8a7b5c', r:'#dccfae' } : LF_PALE;
  vol(c, husk, M, { k:1.2, s:3, r:1, tex:.3, ra:.5 });
  for (const d of [-.46, 0, .46]) flat(c, cc => stemPath(cc, x + d*s*.12, y + s*.58, x + d*s*1.3, y + s*1.08, x, y + s*1.7, 1, .4), '#ffffff', .18);
  if (lit){ flat(c, cc => ell(cc, x, y + s*1.14, s*.3, s*.36), '#fff1cf', .9); flat(c, cc => ell(cc, x, y + s*1.14, s*.14, s*.18), '#ffffff', .8); }
}
function seedling(c, A){
  const { stem } = A;
  flat(c, cc => stemPath(cc, 0, -72, -2, -78, 1, -86, 2.4, 1.6), stem);
  leafV(c, 0, -84, -13, -92, 5, -2, LF3[0], false);
  leafV(c, 0, -84, 13, -92, 5, 2, LF3[2], false);
}
const PLANT = {
  /* A climber: the stake it is tied to is part of the plant's picture, and the
     leaves alternate around the stem rather than lying flat against it. */
  vine(c, A){
    const { R, gr, bloom, stem, lod, i } = A;
    vol(c, cc => rr(cc, 3, -360, 6, 290, 3), MAT.woodD, { k:.8, s:2, tex:0 });
    const H = 14 + 280*gr, pts = [];
    for (let y=0; y<=H; y+=8) pts.push([Math.sin(y/26 + R()*.2)*14, -72 - y]);
    const n = Math.max(1, Math.floor(gr*(lod ? 8 : 13)));
    const at = k => pts[Math.min(pts.length-1, Math.floor((k+1)/(n+1)*pts.length))];
    for (let k=0;k<n;k+=2){ const pt = at(k), side = k%2 ? 1 : -1;
      leafV(c, pt[0], pt[1], pt[0] + side*34, pt[1] - 15, 11, side*3.5, MAT.leafD, false); }
    c.fillStyle = stem; c.beginPath(); pts.forEach(([x,y],k) => { k ? c.lineTo(x-2,y) : c.moveTo(x-2,y); });
    for (let k=pts.length-1;k>=0;k--) c.lineTo(pts[k][0]+2, pts[k][1]); c.closePath(); c.fill();
    for (let k=1;k<n;k+=2){ const pt = at(k), side = k%2 ? 1 : -1;
      leafV(c, pt[0], pt[1], pt[0] + side*32, pt[1] - 11, 11, side*3, LF3[k%3], true, { k:1, s:2.5, tex:.25 });
      if (gr > .6) leafV(c, pt[0], pt[1], pt[0] + side*17, pt[1] + 13, 7, side*2, MAT.leafD, false);
      if (!lod && k%4 === 1 && gr > .5) tendril(c, pt[0] + side*8, pt[1] - 4, side, 9, '#6bb2a8'); }
    const top = pts[pts.length-1];
    if (bloom) [[0,0],[-22,24],[18,46]].forEach(([dx,dy]) => vol(c, cc => star5(cc, top[0]+dx, top[1]+dy, 11), MAT.amber, { k:1, s:2.4, tex:0, hl:[top[0]+dx-3, top[1]+dy-3, 6, .6] }));
    else if (gr > .85) vol(c, cc => ell(cc, top[0], top[1], 5, 6), MAT.rose, { k:.6, s:1.5, tex:0 });
    S.bloomPts[i] = bloom ? [[top[0], top[1]], [top[0]-22, top[1]+24], [top[0]+18, top[1]+46]] : null;
  },
  /* Three stems out of a rosette, each with its own height and its own hang.
     The bells keep swinging for a second after one is rung. */
  bell(c, A){
    const { gr, bloom, stem, lod, i } = A;
    const lsz = 6 + 14*gr;
    for (const d of [-1, 1]) leafV(c, 0, -74, d*(20 + lsz*1.1), -74 - lsz*.5, lsz*.62, d*2, MAT.leafD, true, { k:1, s:2.4, tex:.25 });
    leafV(c, 0, -74, -26, -74 - lsz*1.4, lsz*.6, -2, MAT.leaf, true, { k:1, s:2.5, tex:.25 });
    leafV(c, 0, -74, 26, -74 - lsz*1.4, lsz*.6, 2, MAT.leaf, true, { k:1, s:2.5, tex:.25 });
    const sw = S.bellSwing && S.bellSwing.i === i ? Math.sin(S.bellSwing.t*9)*Math.exp(-S.bellSwing.t*2.3)*13 : 0;
    S.bellTips[i] = [];
    [0,1,2].forEach(j => {
      const hgt = (20 + 210*gr) * [.8,1,.9][j], ex = (j-1)*(26 + 70*gr), ey = -72 - hgt, cx = ex*.15, cy = -72 - hgt*1.15;
      flat(c, cc => stemPath(cc, (j-1)*6, -72, cx, cy, ex, ey, 3.4, 2.2), stem);
      if (gr > .3 && !lod) for (const t of [.45, .72]){ const lx = lerp((j-1)*6, ex, t), ly = lerp(-72, ey, t), d = j === 1 ? (t > .6 ? 1 : -1) : (j-1);
        leafV(c, lx, ly, lx + d*15, ly - 9, 4.5, d*1.5, LF3[(j+t*10)%3 | 0], false); }
      if (gr > .45) leafV(c, ex*.5, (ey-72)*.5, ex*.5 + (j-1)*16 - 8, (ey-72)*.5 - 14, 6, 0, LF3[j], true, { k:.8, s:2, tex:0 });
      if (bloom){ const bx = ex, by = ey + 4;
        c.save(); c.translate(bx, by); c.rotate((sw*[1,.8,1.1][j])*D2R); c.translate(-bx, -by);
        flat(c, cc => rr(cc, bx-1.2, by, 2.4, 9, 1.2), stem);
        vol(c, cc => { cc.moveTo(bx-12, by+24); cc.bezierCurveTo(bx-12, by+7, bx+12, by+7, bx+12, by+24); cc.lineTo(bx+14, by+28); cc.lineTo(bx-14, by+28); cc.closePath(); },
          { l:'#f4fbff', b:'#c6e2f2', d:'#7da4bd', r:'#e8f6ff' }, { k:1.4, s:3.5, tex:0, hl:[bx-5, by+12, 8, .5] });
        flat(c, cc => ell(cc, bx, by+29, 2.6, 2.6), '#ffd9a3');
        c.restore(); }
      else if (gr > .8) vol(c, cc => ell(cc, ex, ey+6, 5, 5), MAT.teal, { k:.6, s:1.5, tex:0 });
      S.bellTips[i].push([ex, ey + 20]);
    });
    S.bloomPts[i] = bloom ? S.bellTips[i].map(([bx,by]) => [bx, by + 10]) : null;
  },
  /* Fronds that unroll: the tip stays a crosier until the frond behind it has
     finished opening, so a young plant is all spirals and an old one is none. */
  fern(c, A){
    const { R, gr, bloom, stem, lod, i } = A;
    const fronds = lod ? 4 : 6;
    for (let j=0;j<fronds;j++){
      const ang = (-58 + j*23)*D2R, L = 18 + 205*gr, u = clamp(gr*1.4 - j*.08, 0, 1), len = L*u;
      if (len < 6) continue;
      const ex = Math.sin(ang)*len, ey = -72 - Math.cos(ang)*len, cr = (1-u)*16 + 4;
      flat(c, cc => stemPath(cc, 0, -72, Math.sin(ang)*len*.5 + (j-2)*4, -72 - Math.cos(ang)*len*.6, ex, ey, 2.6, 1.2), stem);
      /* Leaflets sit close along the rachis and lean toward its tip: spaced out
         and square on, a frond paints as a row of spines instead of a leaf. */
      const pairs = Math.min(lod ? 6 : 11, Math.max(2, Math.floor(len/11)));
      for (let k=1;k<=pairs;k++){
        const t = k/(pairs+1), px = Math.sin(ang)*len*t, py = -72 - Math.cos(ang)*len*t,
          bellc = Math.sin(Math.PI*Math.min(1, t*1.15))*.75 + .25,
          sz = (6 + 13*gr)*bellc, nx = Math.cos(ang), ny = Math.sin(ang),
          tx = Math.sin(ang)*.55, ty = -Math.cos(ang)*.55, M = LF3[k%3];
        duo(c, cc => { leafPath(cc, px, py, px + (nx + tx)*sz, py + (ny + ty)*sz, sz*.42, 1.6);
                       leafPath(cc, px, py, px + (-nx + tx)*sz, py + (-ny + ty)*sz, sz*.42, -1.6); }, M.b, M.l);
        if (!lod && gr > .85 && k%3 === 0) flat(c, cc => { ell(cc, px + nx*sz*.6, py + ny*sz*.6, 1.4, 1.1); ell(cc, px - nx*sz*.6, py - ny*sz*.6, 1.4, 1.1); }, '#8a6534', .45);
      }
      /* the tip stays rolled until the frond behind it has finished opening */
      if (u < .97){ c.save(); c.translate(ex, ey); c.rotate(ang);
        for (let q=0;q<14;q++){ const a = q*.52, rr2 = cr*(1 - q*.055);
          flat(c, cc => ell(cc, Math.cos(a)*rr2*.9, -Math.sin(a)*rr2*.9 - cr*.2, 2.6 - q*.1, 2.6 - q*.1), q < 6 ? stem : '#7fc0a6', .95); }
        c.restore(); }
      if (bloom) vol(c, cc => ell(cc, ex, ey-4, 4.5, 4.5), MAT.glass, { k:.6, s:1.5, tex:0 });
    }
    S.bloomPts[i] = bloom ? [[0, -72 - 200*gr*.9]] : null;
  },
  /* Upright, jointed, and hung with husks. Dry soil shows here first: the paper
     goes from green to straw a long time before the leaves give anything away. */
  lamp(c, A){
    const { gr, bloom, wet, stem, lod, i } = A;
    const H = 30 + 250*gr, nodes = Math.min(4, 1 + Math.floor(gr*4)), pts = [];
    for (let j=0;j<=nodes;j++){ const t = j/nodes; pts.push([Math.sin(t*2.4)*6, -72 - H*t]); }
    flat(c, cc => stemPath(cc, 0, -72, pts[Math.max(0, nodes-1)][0]*.6, -72 - H*.55, pts[nodes][0], -72 - H, 5.5, 3), stem);
    const lit: number[][] = [];
    for (let j=1;j<=nodes;j++){
      const [x, y] = pts[j], sz = 9 + 10*gr;
      leafV(c, x, y, x - 26 - 14*gr, y + 12, sz*.7, -3, MAT.leafD, !lod);
      leafV(c, x, y, x + 26 + 14*gr, y + 12, sz*.7, 3, LF3[j%3], !lod);
      flat(c, cc => rr(cc, x-6, y-1.5, 12, 3, 1.5), '#2f5f5a', .6);
      if (gr > .42 && j < nodes){ const lx = x + (j%2 ? 13 : -13), s = 9 + 15*gr;
        lantern(c, lx, y + 4, s, bloom, !wet);
        if (bloom) lit.push([lx, y + 4 + s*1.14]); }
    }
    const top = pts[nodes];
    for (const d of [-1, 1]) leafV(c, top[0], top[1], top[0] + d*(16 + 8*gr), top[1] - 10, 6, d*2, LF3[0], false);
    S.bloomPts[i] = bloom && lit.length ? lit : null;
  },
  /* No stem at all. A cushion in three bands, each band a little in front of
     and a little lighter than the one behind, which is the only depth a thing
     this flat can have. */
  moss(c, A){
    const { R, gr, bloom, wet, lod, i } = A;
    const w = 32 + 54*gr, h = 8 + 26*gr;
    const dome = (t, band) => -74 - h*Math.sin(Math.PI*clamp(t,0,1))*(.6 + band*.2);
    /* One mound, built out of small tufts in three bands. Each band is a little
       in front of and a little lighter than the one behind, which is the only
       depth something this flat can have. */
    for (let band=0; band<3; band++){
      const M = [MAT.leafD, MAT.leaf, LF3[2]][band], lobes = (lod ? 7 : 13) - band;
      for (let j=0;j<lobes;j++){
        const t = (j + .5)/lobes, lx = -w + 2*w*t + (R()-.5)*5, rx = w/lobes*1.5, ry = (4 + 4.5*gr)*(1 - band*.06),
          ly = dome(t, band) + band*3.5 - ry*.2;
        duo(c, cc => ell(cc, lx, ly, rx, ry), M.b, M.l);
        if (band === 2 && !lod) flat(c, cc => ell(cc, lx - rx*.2, ly - ry*.4, rx*.5, ry*.4), '#cbe8cf', .25);
      }
    }
    vol(c, cc => ell(cc, 0, -72, w*1.02, h*.42 + 5), MAT.leafD, { k:.6, s:1.6, tex:.4, ra:.3 });
    const tips: number[][] = [], nt = lod ? 5 : 11;
    for (let j=0;j<nt;j++){
      const t = (j + .5)/nt, tx = -w*.86 + 2*w*.86*t + (R()-.5)*5, base = dome(t, 2) + 2,
        len = (7 + 20*gr)*(.6 + R()*.8), ty = base - len;
      flat(c, cc => stemPath(cc, tx, base, tx + (R()-.5)*4, (base+ty)/2, tx + (R()-.5)*6, ty, 1.4, .6), wet ? '#79b89a' : '#8aa88d');
      if (gr > .45) flat(c, cc => ell(cc, tx, ty, 2.1, 2.3), bloom ? '#ffffff' : '#bcd8c2', bloom ? .95 : .7);
      if (bloom && j%4 === 1) tips.push([tx, ty]);
    }
    S.bloomPts[i] = bloom && tips.length ? tips : null;
  },
  /* The slow one. Tiers of flat canopy, each smaller than the one under it,
     painted from the back tier forward so the shade reads between them. */
  tree(c, A){
    const { R, gr, bloom, lod, i } = A;
    const H = 40 + 175*gr, tiers = Math.min(3, 1 + Math.floor(gr*2.7));
    for (const d of [-1, 1]) vol(c, cc => stemPath(cc, d*6, -68, d*14, -74, d*20, -72, 5, 2), MAT.woodD, { k:.8, s:2, tex:.3 });
    vol(c, cc => stemPath(cc, -2, -68, 3, -68 - H*.5, 0, -68 - H, 5 + 5*gr, 3.5), MAT.woodD, { k:1.3, s:3.2, tex:.45 });
    const pads: number[][] = [];
    for (let t=0;t<tiers;t++){
      const y = -68 - H*(.44 + t*.26), w = (46 + 44*gr)*(1 - t*.2), d = t%2 ? 1 : -1;
      flat(c, cc => stemPath(cc, 0, y + 10, w*.3*d, y + 5, w*.58*d, y + 1, 3.6, 2), '#5c3927');
      const pad = (ox, oy, sx, M, big) => { const f = cc => blob(cc, [[ox-w*sx, oy+3],[ox-w*sx*.5, oy-7],[ox, oy-9],[ox+w*sx*.5, oy-7],[ox+w*sx, oy+3],[ox, oy+9]]);
        big ? vol(c, f, M, { k:1.2, s:3, r:1, tex:.3 }) : duo(c, f, M.b, M.l); };
      pad(w*.1*d, y + 4, .62, MAT.leafD, false);
      if (!lod) pad(-w*.34*d, y + 1, .5, LF3[2], false);
      pad(0, y, 1, MAT.leaf, true);
      pads.push([0, y]);
    }
    if (bloom){ const [, by] = pads[0];
      const out = [[-26, by + 26], [4, by + 34], [30, by + 24]];
      out.forEach(([bx, byy]) => { flat(c, cc => stemPath(cc, bx*.5, by + 6, bx*.8, byy - 12, bx, byy - 7, 1.6, 1), '#5c3927');
        vol(c, cc => ell(cc, bx, byy, 9, 7), { l:'#f0e2f6', b:'#c9a9e0', d:'#8a6ea8', r:'#e4d2f0' }, { k:1, s:2.4, tex:0, hl:[bx-3, byy-2, 5, .5] }); });
      S.bloomPts[i] = out;
    } else S.bloomPts[i] = null;
  }
};
export function drawPlantP(c, i){
  const p = G.pots[i]; if (!p) return;
  const R = plantRand(i), gr = clamp(p.g, 0, 1), bloom = bloomReady(p);
  const A = { p, i, R, gr, bloom, wet: p.water > 0, stem: p.water > 0 ? '#2f5f5a' : '#3f5f55', lod: POTS[i].s < .8 ? 1 : 0 };
  if (gr < .04){ seedling(c, A); S.bloomPts[i] = null; return; }
  (PLANT[p.sp] || PLANT.vine)(c, A);
}
export function drawPotP(c, i){
  const p = G.pots[i], col = POT_COL[i], C = { l:mixHex(col,'#ffffff',.32), b:col, d:mixHex(col,'#141c30',.45), r:mixHex(col,'#ffe6c8',.25) };
  const spin = S.potSpin[i] || 0, cs = Math.cos(spin);
  shadow(c, 0, 2, 52, 8, .55);
  vol(c, cc => { cc.moveTo(-40,-62); cc.lineTo(40,-62); cc.lineTo(31,0); cc.lineTo(-31,0); cc.closePath(); }, C, { k:3, s:8, r:2, hl:[-18,-44,22,.3] });
  /* a band around the belly, so a turned pot has something to turn */
  flat(c, cc => rr(cc, -36 + 4*(1-cs), -42, 72, 7, 3), mixHex(col,'#1a2238',.3), .45);
  vol(c, cc => rr(cc, -47, -78, 94, 18, 7), C, { k:1.5, s:4 });
  flat(c, cc => ell(cc, 0, -74, 40, 5.5), p && p.water > 0 ? '#2a1c18' : '#5a4232');
  if (p){ const R = plantRand(i);
    for (let k=0;k<5;k++){ const px = -30 + R()*60, py = -77 + R()*6; flat(c, cc => ell(cc, px, py, 2.6 + R()*2, 1.6), p.water > 0 ? '#3b2a22' : '#6b5140', .7); } }
  if (p && p.water <= 0) flat(c, cc => { rr(cc, -30, -76, 10, 1.6, .8); rr(cc, 8, -74, 12, 1.6, .8); }, '#c9a27a', .9);
  if (p){ const lx = 40*cs, back = cs < 0;
    c.save(); c.translate(lx, -99); c.rotate(8*D2R*cs); c.scale(Math.max(.12, Math.abs(cs)), 1);
    vol(c, cc => rr(cc, -22, -11, 44, 22, 3), back ? MAT.cork : MAT.paper, { k:.8, s:2, tex:0 });
    if (!back) txt(c, SEEDS[p.sp].name, 0, 5, 13, '#2a3550');
    c.restore(); flat(c, cc => rr(cc, 22*cs, -90, 3, 24, 1.5), '#8a5a44'); }
}
export function setSpray(on){
  S.spray = on;
  if (on) setCtx([{ label:tr('放下喷壶'), fn:() => setSpray(false), on:true }]); else if (S.room === 'green') setCtx([]);
}
export function sprayPot(i){
  const p = G.pots[i], pot = POTS[i]; AU.spray();
  for (let k=0;k<14;k++) puff(pot.k, pot.x + rand(-50,50), pot.y - rand(90,260)*pot.s, { vx:rand(-6,6), vy:rand(10,40), r:2, gr:2, a:.8, dur:rand(.9,1.6), col:SOFT });
  if (!p){ say(tr('只喷湿了空盆里的土。')); return; }
  const was = p.water; p.water = 1; markDirty();
  if (p.sp === 'fern' && p.g > .3){ for (let k=0;k<8;k++) puff(pot.k, pot.x + rand(-60,60), pot.y - rand(120,250)*pot.s, { vx:rand(-8,8), vy:rand(-6,6), r:rand(14,26), gr:30, a:.22, dur:rand(2.5,4) });
    if (onceS('fernMist')) say(tr('雾蕨冒出一小团雾，慢慢散开。')); return; }
  if (p.sp === 'moss' && p.g > .3 && onceS('mossDrink')){ say(tr('潮苔吸饱水，鼓起来一点。')); return; }
  say(was <= 0 ? tr('干了的土一下子吸饱了水。') : (onceS('sprayOk') ? tr('叶子上挂满了细细的水珠。') : tr('又喷了一层水雾。')));
}
export function openSeeds(i?){
  /* The box stands at the garden end, so a seed taken from it goes into a pot
     you can see. Only when the bench is full does it reach the shelf behind. */
  if (i == null){ i = G.pots.findIndex((p,k) => !p && POTS[k].k === 1); if (i < 0) i = G.pots.findIndex(p => !p); }
  if (i < 0){ say(tr('盆都种上了。')); return; }
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

/* ================= THE WORK BENCH =================
   Growing is the left of the room and building is the right, and the two look
   nothing alike: the garden is wet and green under a pink bar, the bench is dry
   wood under one warm lamp. Walking between them is how you change jobs.

   The rack over the bench is the whole round, hung up. One board per place that
   has asked, each with the name of the place and three marks on it -- a plant,
   a cover, a lamp -- so what is built, what is half built and what has already
   gone out is a thing you look at rather than a thing you are told. */
export function bloomedPot(){ return G.pots.findIndex(p => bloomReady(p)); }
export function rigStep(){ if (!G.rig) return 0; return G.rig.lit ? 3 : G.rig.glass ? 2 : 1; }
const BOARD_X = [-244, -122, 0, 122];
function markIcon(c, x, kind, col){
  vol(c, cc => ell(cc, x, 0, 13, 13), MAT.dark, { k:.8, s:2, tex:0 });
  if (kind === 0) flat(c, cc => leafPath(cc, x, 7, x, -7, 4, 0), col);
  if (kind === 1) flat(c, cc => { cc.moveTo(x-8, 7); cc.bezierCurveTo(x-8, -6, x+8, -6, x+8, 7); cc.closePath(); }, col);
  if (kind === 2) flat(c, cc => { rr(cc, x-5, -7, 10, 7, 2.5); ell(cc, x, 3, 4, 4); }, col);
}
function drawBoard(c, x, id, st, labelled){
  const P = PORTS[id], done = st === 'done', open = st === 'open', nowB = st === 'now';
  const have = nowB ? [!!G.rig, !!(G.rig && G.rig.glass), !!(G.rig && G.rig.lit)] : done ? [true,true,true] : [false,false,false];
  c.save(); c.translate(x, -398); c.rotate(nowB ? 0 : (open ? .055 : -.03));
  flat(c, cc => { rr(cc, -32, -26, 5, 26, 2.5); rr(cc, 27, -26, 5, 26, 2.5); }, '#2a3a46');
  shadow(c, 0, 128, 44, 7, .45);
  vol(c, cc => rr(cc, -54, -4, 108, 130, 6), open ? MAT.woodD : MAT.wood, { k:1.6, s:4, r:1.2, tex:.55 });
  vol(c, cc => rr(cc, -48, 2, 96, 118, 4), open ? { l:'#9c8d74', b:'#82755f', d:'#5a5141', r:'#a79880' } : MAT.cream, { k:.8, s:2, r:.8, tex:.4 });
  if (open) for (let k=0;k<4;k++) flat(c, cc => rr(cc, -36, 30 + k*22, 72, 2.4, 1.2), '#6b6150', .5);
  if (!open){
    flat(c, cc => rr(cc, -40, 10, 80, 7, 3.5), P.look.lamp, .95);
    txtFit(c, P.name, 0, 46, 80, 21, '#36301f');
    c.save(); c.translate(0, 86); have.forEach((on,k) => markIcon(c, -28 + k*28, k, on ? '#ffd9a3' : '#49423a')); c.restore();
    if (done){ const d = lastDelivered(id);
      c.save(); c.globalAlpha = .45; vol(c, cc => rr(cc, -48, 2, 96, 118, 4), MAT.dark, { k:.5, s:1.4, tex:0 }); c.restore();
      if (d && SEEDS[d.sp]){ flat(c, cc => stemPath(cc, 30, 40, 32, 32, 30, 24, 1.4, .8), '#4f8f7a');
        flat(c, cc => leafPath(cc, 30, 38, 42, 26, 5, 2.5), SEEDS[d.sp].color, .95);
        flat(c, cc => leafPath(cc, 30, 34, 19, 23, 4.4, -2.2), SEEDS[d.sp].color, .75); } }
  }
  hit(c, 'gh:board:' + id, ['r', -58, -30, 116, 160], { label: labelled ? tr('订单板') : null, key:'board' + id });
  c.restore();
}
function drawWork(c){
  setL(c, 1); c.save(); c.translate(BENCH_X, POT_Y);
  /* the rack: a rail across the bay with one board per place that has asked */
  vol(c, cc => rr(cc, -308, -436, 500, 14, 6), MAT.metalD, { k:1.5, s:4 });
  for (const x of [-288, 172]) vol(c, cc => rr(cc, x-5, -520, 10, 90, 4), MAT.metalD, { k:1.2, s:3, tex:0 });
  vol(c, cc => rr(cc, -118, -472, 120, 20, 8), MAT.brass, { k:1.4, s:3.4, tex:0 });
  const act = PORT_ORDER.findIndex(id => orderState(id) === 'now');
  PORT_ORDER.forEach((id, k) => drawBoard(c, BOARD_X[k], id, orderState(id), k === (act < 0 ? 0 : act)));
  /* the bench */
  shadow(c, 0, 182, 250, 18, .55);
  for (const lx of [-196, 160]){ vol(c, cc => rr(cc, lx, 0, 36, 176, 7), MAT.woodD, { k:2.4, s:6 });
    vol(c, cc => rr(cc, lx-14, 96, 64, 13, 5), MAT.woodD, { k:1.2, s:3 }); }
  vol(c, cc => rr(cc, -226, 104, 452, 12, 4), MAT.woodD, { k:1.4, s:3.5, tex:.6 });
  for (let k=0;k<3;k++) vol(c, cc => { cc.moveTo(-150 + k*110, 104); cc.lineTo(-120 + k*110, 104); cc.lineTo(-126 + k*110, 76); cc.lineTo(-144 + k*110, 76); cc.closePath(); }, MAT.pot, { k:1, s:2.6, tex:.4 });
  vol(c, cc => rr(cc, -250, -24, 500, 26, 5), MAT.woodD, { k:3, s:8, tex:.6, g:[-24, 2, 'rgba(255,240,210,.1)', 'rgba(6,10,14,.3)'] });
  vol(c, cc => rr(cc, -250, -34, 500, 13, 5), MAT.wood, { k:1.6, s:4 });
  for (let x=-230;x<230;x+=46) flat(c, cc => rr(cc, x, -33, 2, 11, 1), '#2c1a12', .35);
  /* the turntable the build stands on */
  vol(c, cc => ell(cc, 0, -36, 74, 17), MAT.brass, { k:1.4, s:3.6, tex:.3 });
  flat(c, cc => ell(cc, 0, -38, 62, 13), '#6b4a2a', .5);
  /* the cover shelf: two blown covers waiting on their side */
  c.save(); c.translate(-176, -34);
  vol(c, cc => rr(cc, -46, -8, 92, 10, 4), MAT.metalD, { k:1.2, s:3 });
  for (const [dx, sc, a] of [[-18, .62, .22], [16, .78, .3]]){
    c.save(); c.translate(dx, -8); c.scale(sc, sc); c.globalAlpha = a;
    vol(c, cc => { cc.moveTo(-38,0); cc.bezierCurveTo(-38,-92, 38,-92, 38,0); cc.closePath(); }, MAT.glass, { k:1.8, s:4.5, r:1.2, tex:.2, ra:.4 });
    c.restore();
    flat(c, cc => stemPath(cc, dx - 16*sc, -26*sc - 8, dx - 20*sc, -52*sc - 8, dx - 9*sc, -66*sc - 8, 3.4*sc, 2*sc), '#ffffff', .2);
  }
  hit(c, 'gh:work:glass', ['r', -56, -84, 112, 86], { label:tr('罩子架') });
  c.restore();
  /* the lamp tray: three caps in their slots */
  c.save(); c.translate(146, -36);
  vol(c, cc => rr(cc, -48, -14, 96, 20, 5), MAT.metalD, { k:1.4, s:3.5, tex:.3 });
  for (let k=0;k<3;k++){ const x = -30 + k*30;
    vol(c, cc => rr(cc, x-11, -26, 22, 14, 6), MAT.brass, { k:1, s:2.6, tex:0 });
    flat(c, cc => ell(cc, x, -13, 7, 3.4), '#ffe7bd', .8); }
  hit(c, 'gh:work:lamp', ['r', -54, -34, 108, 46], { label:tr('灯盘') });
  c.restore();
  /* what the bench has on it besides the build: a coil of twine, a dish of
     soil, the brush that keeps the glass clear */
  vol(c, cc => { ell(cc, -120, -44, 20, 9); ell(cc, -120, -44, 7, 3.2); }, MAT.cream, { k:1, s:2.5, tex:.4, eo:true });
  vol(c, cc => ell(cc, 106, -42, 26, 11), MAT.pot, { k:1.2, s:3, tex:.4 });
  flat(c, cc => ell(cc, 106, -43, 20, 7), '#3b2a22', .9);
  vol(c, cc => rr(cc, -74, -44, 44, 9, 4), MAT.wood, { k:.8, s:2, tex:.3 });
  flat(c, cc => rr(cc, -36, -46, 16, 13, 3), '#cfae7a', .9);
  /* the bench lamp, on its arm, always burning */
  vol(c, cc => rr(cc, 230, -230, 12, 206, 5), MAT.metalD, { k:1.4, s:3.5, tex:0 });
  vol(c, cc => stemPath(cc, 236, -226, 150, -266, 56, -238, 7, 5), MAT.metalD, { k:1.2, s:3, tex:0 });
  vol(c, cc => { cc.moveTo(22,-228); cc.lineTo(88,-228); cc.lineTo(72,-186); cc.lineTo(40,-186); cc.closePath(); }, MAT.copper, { k:1.8, s:4.5, r:1.2, tex:.3 });
  flat(c, cc => ell(cc, 56, -188, 15, 5), '#ffe7bd', .95);
  /* what is on the turntable right now, and nothing once it has gone forward */
  if (G.rig && !G.rig.lit) drawRig(c, 0, -40, G.rig, .98);
  hit(c, 'gh:work:plant', ['r', -88, -200, 176, 168], { label:tr('装配台') });
  c.restore();
}
ACT['gh:board'] = { tap(a){
  const id = a[0], P = PORTS[id]; if (!P) return; AU.tap();
  const st = orderState(id);
  if (st === 'done'){ const d = lastDelivered(id); say(d && SEEDS[d.sp] ? tr('送到那儿的是一株{0}。', SEEDS[d.sp].name) : P.ask); return; }
  if (st === 'open'){ say(tr('这一块还空着。调度台还没叫到它。')); return; }
  say(P.ask);
}};
ACT['gh:work'] = { tap(a){
  const part = a[0]; AU.tap();
  if (part === 'plant'){
    if (G.rig){ say(G.rig.lit ? tr('那盏装好了，在舷梯的架子上。') : tr('台子上这一株还没装完。')); return; }
    const i = bloomedPot();
    if (i < 0){ say(once('benchEmpty') ? tr('台子上空着。要一株开了花的，才装得起来。') : tr('台子还空着。')); return; }
    const sp = G.pots[i].sp;
    G.rig = { sp, glass:false, lit:false }; G.pots[i] = null; G.blooms++;
    AU.wood(); markDirty();
    say(tr('你把开着花的{0}连根端上台子。', SEEDS[sp].name));
    if (once('benchHint')) say(tr('罩子在左手边的架子上。灯在右手边。'), null, 2400);
    return;
  }
  if (part === 'glass'){
    if (!G.rig){ say(tr('罩子要扣在一株植物上。')); return; }
    if (G.rig.glass){ say(tr('罩子已经扣上了。')); return; }
    G.rig.glass = true; AU.soft(); markDirty(); say(tr('玻璃罩扣下来，里面一下子安静了。')); return;
  }
  if (!G.rig || !G.rig.glass){ say(tr('灯卡在罩子顶上。先有罩子。')); return; }
  if (G.rig.lit){ say(tr('灯已经装好了。')); return; }
  G.rig.lit = true; AU.chain(); AU.bell(78, .04); markDirty();
  say(tr('小灯卡进罩顶。叶子底下亮起来一点。'));
  addLog(tr('装好一盏灯'));
  say(tr('装好了。它在舷梯的架子上等着。'), null, 2600);
}};
ACT['gh:seeds'] = { tap(){ AU.paper(); openSeeds(); } };
ACT['gh:spray'] = { tap(){ setSpray(!S.spray); AU.tap(); if (S.spray && once('sprayHint')) say(tr('拿起喷壶。拖过哪几盆，就浇哪几盆。')); } };
ACT['gh:lamp'] = { tap(){
  G.growLamp = !G.growLamp; AU.chain(); markDirty();
  say(G.growLamp ? tr('生长灯亮了，粉色的光。植物在这种光下长得快一点。') : (once('lampOff') ? tr('生长灯关了。温室暗下来，只剩窗外的光，和你手边一点光。') : tr('生长灯关了。')));
}};
/* A pot takes a drag as well as a tap: with the can in hand the drag waters
   every pot it crosses, and with an empty hand it turns the pot under it. */
ACT['gh:pot'] = {
  press(a){
    const i = +a[0];
    if (S.spray){ const done = new Set([i]); sprayPot(i);
      return { move(e){ const q = cpt(e), f = hitAt(q.X, q.Y); if (!f) return;
          const m = /^gh:(?:pot|plant):(\d+)$/.exec(f.h.act); if (!m) return;
          const j = +m[1]; if (done.has(j)) return; done.add(j); sprayPot(j); } };
    }
    if (!G.pots[i]) return null;
    let turned = 0, lx = null;
    return {
      move(e, p){ if (lx != null){ const d = (p.x - lx)/58; S.potSpin[i] += d; turned += Math.abs(d); } lx = p.x; },
      up(e, moved){ if (!moved){ turnPot(i); return; }
        if (turned > .45) turnPot(i, true); else S.potSpin[i] = 0; }
    };
  },
  tap(a){ const i = +a[0];
    if (S.spray){ sprayPot(i); return; }
    if (!G.pots[i]){ openSeeds(i); return; }
    turnPot(i); }
};
export function turnPot(i, quiet?){
  const p = G.pots[i]; if (!p) return;
  S.potWig[i] = 1; S.potSpin[i] = 0; p.lean = -p.lean*.4; AU.wood(); markDirty();
  if (quiet) return;
  say(once('rotateHint') ? tr('你把花盆转了半圈。它原本朝窗那边歪，现在要重新长直。') : tr('花盆转了半圈。'));
}
ACT['gh:plant'] = { tap(a, e, pt){
  const i = +a[0], p = G.pots[i];
  if (S.spray){ sprayPot(i); return; }
  if (!p) return;
  if (bloomReady(p)){
    G.vase = p.sp; p.bloomAt = now() + 25*MIN; G.blooms++; AU.leaf(); AU.bell(86,.03);
    say(tr('你剪下一枝{0}，插到客舱桌上的小瓶里。这一株过一阵还会再开。', SEEDS[p.sp].name)); addLog(tr('剪了一枝{0}放进客舱的花瓶', SEEDS[p.sp].name)); markDirty(); return;
  }
  S.fold[i] = Math.min(1, S.fold[i] + .5); S.foldPt[i] = pt ? clamp(pt.x/90, -1, 1) : 0; AU.leaf();
  const st = Math.floor(p.g*5);
  const lines = {
    vine:[tr('土里刚冒出一点绿。'),tr('一根细藤，往木棍上绕了半圈。'),tr('藤尖卷住了你的手指一下，又松开。'),tr('叶子一对一对的。顶上有个小花苞。')],
    bell:[tr('两片圆叶子贴着土。'),tr('三根细茎分开，各长各的方向。'),tr('茎有点软，摸起来凉。'),tr('茎尖垂下来，像要挂什么东西。')],
    fern:[tr('一个卷着的小拳头，从土里探出来。'),tr('嫩叶一圈一圈地打开。'),tr('叶背面有一排小点。'),tr('叶子展开了，边上是细细的锯齿。')],
    lamp:[tr('土面上支起两片厚叶子。'),tr('茎是方的，捏着有棱。'),tr('一个空灯笼挂下来，还是绿的。'),tr('灯笼薄得像纸，对着光能看见里面的籽。')],
    moss:[tr('土上有一层薄薄的绿。'),tr('按下去是软的，手一松又弹回来。'),tr('细丝都立起来，朝着亮的那边。'),tr('丝尖上的白点，一碰就飘起来。')],
    tree:[tr('一根小木茎立起来了，皮是灰的。'),tr('第一层叶子摊平了，底下有一小块阴影。'),tr('每一层都比底下那层小一点。'),tr('花挂在最下面一层底下，要蹲下来才看得见。')]
  }[p.sp] || [];
  say(p.water <= 0 ? tr('土是干的。它停着，在等水。') : (lines[Math.min(3, st)] || tr('它在长。')));
}};
export function cursorPlay(){ // cursor in play-plane coordinates, or null
  const r = cv.getBoundingClientRect(); if (PR.cx < r.left || PR.cx > r.right || PR.cy < r.top || PR.cy > r.bottom) return null;
  const X = (PR.cx - r.left)/r.width*CW, Y = (PR.cy - r.top)/r.height*CH; return inv(mat(1), X, Y);
}
/* What the room's logic asks the camera: where the hand is over the plants (in
   play-plane design units), which end of the house the player has walked to,
   and how the room turns to the bench when building is the job. The 3D
   greenhouse (three/rooms/green.ts) swaps these for answers from its own
   camera and puts these back when it is left. */
export const GREEN_SPACE = {
  cursor: (): { x: number; y: number } | null => cursorPlay(),
  end: (): 'nursery' | 'bench' | null => CAM.panX > 560 ? 'nursery' : CAM.panX < -560 ? 'bench' : null,
  toBench: () => { CAM.tpanX = -880; }
};

/* ---- static art ----
   The room is three times as wide as the window, so each cached layer is cut
   into three tiles and only the ones on screen are drawn. One canvas the whole
   width of the greenhouse would be past what a phone will allocate. */
const TILES = 3;
function wideLayer(c, key, k, y0, h, draw){
  const w = (GH.x1 - GH.x0)/TILES;
  for (let t=0;t<TILES;t++){
    const x0 = GH.x0 + t*w;
    const e = cacheGet(key + t, x0, y0, w, h, g => { g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); draw(g); g.restore(); });
    const m = setL(c, k), a = tp(m, x0, y0), b = tp(m, x0 + w, y0);
    if (Math.max(a[0], b[0]) < -4 || Math.min(a[0], b[0]) > CW + 4) continue;
    blit(c, e);
  }
}
/* A planting that is not in a pot: the troughs and baskets the greenhouse was
   already full of before anybody started growing to order. */
function wallGreen(g, R){
  for (const [x0, x1, y] of [[-980, -680, 416], [1180, 1420, 430]]){
    vol(g, cc => rr(cc, x0, y, x1-x0, 46, 6), MAT.woodD, { k:2, s:5, tex:.6 });
    vol(g, cc => rr(cc, x0, y-8, x1-x0, 12, 5), MAT.wood, { k:1.2, s:3 });
    for (let x = x0 + 18; x < x1 - 10; x += 26){
      for (let j=0;j<3;j++){ const h = 28 + R()*44, d = j - 1;
        flat(g, cc => stemPath(cc, x, y, x + d*8, y - h*.6, x + d*18, y - h, 2.4, 1), '#3f6f62');
        duo(g, cc => leafPath(cc, x + d*9, y - h*.55, x + d*22, y - h - 8, 4, d*2), MAT.leaf.b, MAT.leaf.l); }
      duo(g, cc => ell(cc, x, y - 4, 10, 6), MAT.leafD.b, MAT.leafD.l);
    }
  }
  /* baskets off the roof trusses, trailing far enough to break the glass up */
  for (const x of [-420, 180, 980, 1560]){
    flat(g, cc => rr(cc, x-1, 40, 2, 108, 1), '#1c3036');
    vol(g, cc => { cc.moveTo(x-34, 148); cc.lineTo(x+34, 148); cc.lineTo(x+26, 186); cc.lineTo(x-26, 186); cc.closePath(); }, MAT.cork, { k:1.6, s:4, tex:.5 });
    for (let j=0;j<5;j++){ const d = -1 + j*.5, L = 50 + R()*120;
      flat(g, cc => stemPath(cc, x + d*20, 180, x + d*30, 180 + L*.5, x + d*22, 180 + L, 2.6, 1.4), '#3f6f62');
      for (let q=1;q<=3;q++){ const t = q/3.6, lx = lerp(x + d*20, x + d*22, t), ly = lerp(180, 180 + L, t);
        duo(g, cc => leafPath(cc, lx, ly, lx + (q%2?10:-10), ly + 9, 3.4, 0), MAT.leafD.b, MAT.leafD.l); } }
  }
}
export function ghWallArt(g){
  const R = mulberry32(331);
  const [x0,y0,x1,y1] = GH_SHELL.b;
  g.fillStyle = 'rgba(120,180,190,.08)'; g.fillRect(x0, y0, x1-x0, y1-y0);
  const bar = (x, y, w, h) => vol(g, cc => rr(cc, x, y, w, h, Math.min(w,h)/2), { l:'#7fa6ad', b:'#4f7a80', d:'#2a474c', r:'#a8cfd4' }, { k:1.5, s:4, tex:.25 });
  for (let x = x0; x <= x1; x += 160) bar(x-5, y0, 10, 470);
  for (const y of [y0, 200, 360]) bar(x0, y-4, x1-x0, 8);
  // low wall under the glass
  vol(g, cc => rr(cc, x0, 500, x1-x0, y1-500, 0), { l:'#5a7a76', b:'#3f5c5a', d:'#26403e', r:'#6e908c' }, { k:2, s:5, tex:.6 });
  vol(g, cc => rr(cc, x0, 488, x1-x0, 18, 6), { l:'#9cc0b8', b:'#6e948c', d:'#3e5c56' }, { k:1.5, s:3.5 });
  // grow lamp mounts
  for (const x of [380, 1120, -600, -60]) flat(g, cc => rr(cc, x-1.5, y0, 3, 96, 1.5), '#1c3036');
  wallGreen(g, R);
  /* the workshop end: a board of tools over the bench, and a shelf of cuttings */
  const bx = BENCH_X;
  vol(g, cc => rr(cc, bx-328, 142, 696, 316, 10), MAT.woodD, { k:2.5, s:6, tex:.7 });
  vol(g, cc => rr(cc, bx-312, 156, 664, 288, 6), MAT.wood, { k:1.6, s:4, tex:.7, g:[156, 444, 'rgba(255,240,210,.12)', 'rgba(6,10,14,.28)'] });
  for (let x = bx-300; x < bx+340; x += 34) for (let y = 170; y < 440; y += 34) flat(g, cc => ell(cc, x, y, 3, 3), '#241a15', .5);
  vol(g, cc => { rr(cc, bx+204, 190, 16, 86, 7); rr(cc, bx+192, 180, 40, 16, 7); }, MAT.metal, { k:1.2, s:3, tex:0 });
  vol(g, cc => { cc.moveTo(bx+276, 200); cc.lineTo(bx+300, 272); cc.lineTo(bx+288, 278); cc.closePath(); cc.moveTo(bx+300, 200); cc.lineTo(bx+276, 272); cc.lineTo(bx+288, 278); cc.closePath(); }, MAT.metal, { k:1.4, s:3.4, tex:0 });
  vol(g, cc => ell(cc, bx+330, 226, 26, 26), MAT.cream, { k:1.6, s:4, tex:.5 });
  flat(g, cc => ell(cc, bx+330, 226, 9, 9), '#6c4331');
  vol(g, cc => rr(cc, bx+248, 300, 14, 96, 6), MAT.wood, { k:1.2, s:3, tex:.4 });
  vol(g, cc => rr(cc, bx+190, 352, 160, 12, 4), MAT.woodD, { k:1.4, s:3.5 });
  for (let k=0;k<4;k++){ const x = bx+206 + k*36;
    vol(g, cc => rr(cc, x-14, 310, 28, 42, 6), MAT.glass, { k:1.4, s:3.5, r:1, tex:.2, ra:.4 });
    flat(g, cc => rr(cc, x-12, 334, 24, 16, 4), '#2f5f5a', .5);
    flat(g, cc => stemPath(cc, x, 334, x + 3, 318, x - 2, 304, 2, 1.2), '#4f8f7a');
    duo(g, cc => leafPath(cc, x-1, 314, x-12, 304, 3.4, -1), MAT.leaf.b, MAT.leaf.l); }
  /* the nursery end: the frame the seedling shelf is bolted to, the hose that
     reaches the far pots, and the small tools that live at that end */
  for (const x of [-660, -40]) vol(g, cc => rr(cc, x-8, 300, 16, 240, 5), MAT.metalD, { k:1.6, s:4, tex:.3 });
  vol(g, cc => rr(cc, -566, 244, 10, 26, 5), MAT.metalD, { k:1, s:2.5, tex:0 });
  for (let k=0;k<3;k++) vol(g, cc => { ell(cc, -560, 320 + k*7, 54 - k*5, 46 - k*4); ell(cc, -560, 320 + k*7, 20, 17); },
    { l:'#6e8e86', b:'#4c6a64', d:'#2c443f', r:'#7fa49a' }, { k:1.2, s:3, tex:.3, eo:true });
  for (let k=0;k<2;k++){ const x = -200 + k*48;
    vol(g, cc => rr(cc, x-4, 260, 8, 62, 4), MAT.wood, { k:1, s:2.5, tex:.3 });
    vol(g, cc => { cc.moveTo(x-11, 318); cc.bezierCurveTo(x-11, 356, x+11, 356, x+11, 318); cc.closePath(); }, MAT.metal, { k:1.4, s:3.4, tex:.2 }); }
}
export function ghMidArt(g){
  shadow(g, 740, 776, 640, 26, .6);
  vol(g, cc => rr(cc, 150, 598, 1180, 24, 8), MAT.wood, { k:2, s:5, hl:[500,600,300,.18] });
  vol(g, cc => rr(cc, 170, 618, 1140, 140, 10), MAT.woodD, { k:3, s:8, tex:.6, g:[618, 758, 'rgba(0,0,0,0)', 'rgba(6,10,14,.35)'] });
  for (let x=200;x<1300;x+=110) flat(g, cc => rr(cc, x, 622, 3, 132, 1.5), '#2c1a12', .5);
  /* what the nursery end keeps on its floor: a stack of empty trays, a sack of
     soil open at the neck, and the bucket that goes round with it */
  for (let k=0;k<5;k++) vol(g, cc => rr(cc, -624, 776 - k*13, 150, 18, 4), k%2 ? MAT.cork : MAT.woodD, { k:1.2, s:3, tex:.5 });
  vol(g, cc => blob(cc, [[-420,794],[-452,742],[-444,690],[-412,678],[-376,690],[-368,744],[-392,794]]),
    { l:'#cbb795', b:'#a28a66', d:'#64543c', r:'#b8a383' }, { k:2.4, s:6, tex:.8 });
  flat(g, cc => stemPath(cc, -432, 700, -424, 740, -404, 788, 2.6, 2), '#6d5b43', .5);
  flat(g, cc => blob(cc, [[-412,688],[-432,676],[-412,664],[-392,674]]), '#4a3726', .85);
  flat(g, cc => rr(cc, -424, 684, 28, 7, 3), '#7a6648', .9);
  vol(g, cc => { cc.moveTo(-320,700); cc.lineTo(-250,700); cc.lineTo(-262,792); cc.lineTo(-308,792); cc.closePath(); }, MAT.metalD, { k:2, s:5, tex:.4 });
  flat(g, cc => ell(cc, -285, 702, 35, 9), '#1c2a2e', .7);
  /* trays of spare pots under the bench, so the garden has a store behind it */
  for (let k=0;k<4;k++){ const x = 260 + k*270;
    vol(g, cc => rr(cc, x-70, 690, 140, 14, 4), MAT.woodD, { k:1.2, s:3, tex:.5 });
    for (let j=0;j<3;j++) vol(g, cc => { cc.moveTo(x-54+j*40, 690); cc.lineTo(x-26+j*40, 690); cc.lineTo(x-31+j*40, 654); cc.lineTo(x-49+j*40, 654); cc.closePath(); }, MAT.pot, { k:1, s:2.6, tex:.4 }); }
}
export function ghShelfArt(g){
  /* the seedling shelf: two boards across the nursery frame, and a tray on each */
  shadow(g, -330, SHELF_Y + 10, 340, 14, .5);
  vol(g, cc => rr(cc, -690, SHELF_Y, 700, 18, 5), MAT.wood, { k:1.8, s:4.5, hl:[-500, SHELF_Y+4, 180, .16] });
  vol(g, cc => rr(cc, -684, SHELF_Y + 16, 688, 10, 4), MAT.woodD, { k:1.2, s:3, tex:.5 });
  vol(g, cc => rr(cc, -690, 644, 700, 16, 5), MAT.wood, { k:1.6, s:4 });
  for (let k=0;k<3;k++){ const x = -600 + k*230;
    vol(g, cc => rr(cc, x-66, 594, 132, 46, 5), MAT.cork, { k:1.6, s:4, tex:.6 });
    for (let j=0;j<8;j++){ const px = x - 54 + (j%4)*36, py = 606 + Math.floor(j/4)*20;
      flat(g, cc => ell(cc, px, py, 12, 7), '#3b2a22', .8);
      flat(g, cc => stemPath(cc, px, py-2, px+1, py-10, px-2, py-16, 1.6, .9), '#4f8f7a');
      duo(g, cc => leafPath(cc, px-1, py-12, px-8, py-18, 2.6, -1), MAT.leaf.b, MAT.leaf.l); } }
}
export function ghNearArt(g){
  shadow(g, 800, 960, 700, 40, .5);
  vol(g, cc => rr(cc, -1200, 836, 4000, 160, 20), MAT.woodD, { k:-3, s:-7, lx:.4, ly:.9, r:0, tex:.6 });
  vol(g, cc => rr(cc, -1200, 828, 4000, 16, 8), MAT.wood, { k:1.5, s:3.5 });
}
ROOMS.green = {
  zc:[740, 460],
  /* Wide enough that the two ends are off screen, and capped so that zooming in
     cannot swing the view off the painted room. */
  pan:[900, 150, 1040],
  enter(){
    setCtx([]);
    /* Building happens at the far right, so when that is the step the room opens
       looking at it. Turning your head is how you change jobs in here. */
    const st = STEPS[stepNow()];
    if (st && st.id === 'build') GREEN_SPACE.toBench();
    if (once('greenFirst')) say(tr('温室比船上别处暖，玻璃内侧挂着一层水汽。'));
    else { const dry = G.pots.filter(p => p && p.water <= 0).length; if (dry) say(dry === 1 ? tr('有一盆土干了。') : tr('有 {0} 盆土干了。', dry)); }
    if (once('ghDrag')) say(tr('温室比你看见的长。按住不放，可以往两边走。'), null, 2600);
  },
  exit(){ setSpray(false); setCtx([]); },
  update(dt){
    S.lampK += ((G.growLamp ? 1 : 0) - S.lampK)*(1-Math.exp(-dt*3));
    const dark = !G.growLamp, cp = GREEN_SPACE.cursor(); S.ghCursor = cp;
    if (S.bellSwing){ S.bellSwing.t += dt; if (S.bellSwing.t > 2.4) S.bellSwing = null; }
    /* The two ends of the room, found by walking to them. */
    const end = GREEN_SPACE.end();
    if (end === 'nursery' && once('ghNursery')) say(tr('育苗架这头冷一些，玻璃上结着一层水。'));
    if (end === 'bench' && once('ghWork')) say(tr('台子这头烤得暖，木头有一点香味。'));
    POTS.forEach((pot,i) => {
      const p = G.pots[i];
      if (p && cp && p.g > .1){ const d = Math.hypot(cp.x - pot.x, cp.y - (pot.y - 170*pot.s));
        if (PR.speed > 900 && d < 240*pot.s + 60){ S.fold[i] = Math.min(1, S.fold[i] + dt*5); if (S.fold[i] > .6 && once('shy')) say(tr('叶子一下子合上了。')); if (S.fold[i] > .6 && G.flags.shy && onceS('shy2') && S.T - (S.shyT||0) > 20) say(tr('它们怕快。手慢一点，它们会再打开。'), null, 2400); S.shyT = S.T; }
        const want = dark && PR.stillT > 2 && Math.abs(cp.x - pot.x) < 340 && cp.y < pot.y ? clamp((cp.x - pot.x)/300, -1, 1)*14 : 0;
        S.curLean[i] += (want - S.curLean[i])*(1-Math.exp(-dt*.7));
        if (want && Math.abs(S.curLean[i]) > 8 && once('leanCursor')) say(tr('那盆植物慢慢朝你手边的光歪过来。'));
        if (p.sp === 'bell' && bloomReady(p) && S.bellTips[i] && PR.speed > 30 && PR.speed < 450 && S.T - S.lastBellT > .45){
          for (const [bx,by] of S.bellTips[i]){ if (Math.hypot(cp.x - (pot.x + bx*pot.s), cp.y - (pot.y + by*pot.s)) < 46){ S.lastBellT = S.T; S.bellSwing = { i, t:0 }; AU.bell(pick([86,88,91,93]), .035); if (once('bellRing')) say(tr('月铃响了一声。')); break; } }
        }
      } else S.curLean[i] *= Math.exp(-dt*.7);
      S.fold[i] = Math.max(0, S.fold[i] - dt/(PR.speed < 200 ? 4 : 12));
      S.potWig[i] = Math.max(0, S.potWig[i] - dt*1.7);
    });
    if (Math.random() < dt*.6 && S.drops.length < 14) S.drops.push({ x:rand(-900,2400), y:rand(60,300), v:rand(8,20) });
    for (let k=S.drops.length-1;k>=0;k--){ const d = S.drops[k]; d.y += d.v*dt; if (d.y > 480) S.drops.splice(k,1); }
  },
  back(c){
    setL(c, K_SP); const g = c.createLinearGradient(0, -100, 0, 700); g.addColorStop(0, '#06101a'); g.addColorStop(.6, '#0f2430'); g.addColorStop(1, '#173643'); c.fillStyle = g; c.fillRect(-1400, -300, 4400, 1200);
    c.globalAlpha = .5; c.drawImage(STEAL, 900, 40, 700, 420); c.globalAlpha = .3; c.drawImage(SIND, 100, -60, 800, 500);
    c.globalAlpha = .26; c.drawImage(SFOG, -900, 60, 900, 460); c.globalAlpha = 1;
    S.ghStars.forEach(s => { c.globalAlpha = s.tw ? .5 + .5*Math.sin(S.T*1.1 + s.ph) : .9; c.fillStyle = s.c; c.fillRect(s.x, s.y, s.r*1.4, s.r*1.4); }); c.globalAlpha = 1;
    sphere(c, 360, 150, 70, { l:'#f3e1c2', b:'#d1b48b', d:'#6e5a46', r:'#fff1d8' }, { lx:.6, ly:-.6 });
  },
  room(c){
    shell(c, GH_SHELL);
    // glass roof mullions converge into the ceiling
    c.setTransform(1,0,0,1,0,0); c.fillStyle = 'rgba(70,110,118,.85)';
    for (let i=0;i<=20;i++){ const t = i/20, a = P(.62, lerp(-1000,2580,t), 40), b = P(1.75, lerp(-1640,3220,t), -280); c.beginPath(); c.moveTo(a[0]-2*RS, a[1]); c.lineTo(a[0]+2*RS, a[1]); c.lineTo(b[0]+6*RS, b[1]); c.lineTo(b[0]-6*RS, b[1]); c.closePath(); c.fill(); }
    wideLayer(c, 'gh:wall', K_WL, -340, 1120, ghWallArt);
    /* the work slip, hung on the glass where growing ends and building begins */
    setL(c, K_WL); hangSlip(c, 1016, 166, 150, .012);
    setL(c, K_WL); c.fillStyle = '#e6f4ff'; S.drops.forEach(d => { c.globalAlpha = .5; c.beginPath(); ell(c, d.x, d.y, 2.4, 3.4); c.fill(); }); c.globalAlpha = 1;
    // grow lamp bars
    setL(c, .85);
    for (const x of [380, 1120, -600, -60]) flat(c, cc => rr(cc, x-1.5, 40, 3, 110, 1.5), '#1c3036');
    GROW_BAR.forEach((b, k) => {
      vol(c, cc => rr(cc, b.x - b.w/2, 146, b.w, 30, 15), MAT.metalD, { k:2, s:5 });
      flat(c, cc => rr(cc, b.x - b.w/2 + 16, 168, b.w - 32, 8, 4), G.growLamp ? '#ffd3e0' : '#5a4a5a');
      hit(c, 'gh:lamp', ['r', b.x - b.w/2, 140, b.w, 44], { label:k ? null : tr('生长灯'), key:'lamp' + k });
    });
    // the seedling shelf and its rank of pots, behind the garden
    wideLayer(c, 'gh:shelf', .92, 440, 300, ghShelfArt);
    drawRank(c, 5, 8);
    wideLayer(c, 'gh:mid', 1, 560, 320, ghMidArt);
    drawRank(c, 0, 5);
    drawWork(c);
    wideLayer(c, 'gh:near', K_NR, 790, 360, ghNearArt);
    setL(c, K_NR);
    // seed box
    c.save(); c.translate(260, 836);
    shadow(c, 0, 0, 100, 10, .5);
    vol(c, cc => rr(cc, -86, -74, 172, 74, 8), MAT.wood, { k:2, s:5, r:1.5 });
    Object.entries(SEEDS).forEach(([k, sd]: [string, any], j) => {
      const x = -72 + (j%3)*48, y = -66 + Math.floor(j/3)*34;
      vol(c, cc => rr(cc, x, y, 40, 28, 5), { l:mixHex(sd.color,'#ffffff',.3), b:sd.color, d:mixHex(sd.color,'#1a2238',.45) }, { k:1, s:2.5, tex:.4 });
    });
    txt(c, tr('种子'), 0, -84, 18, '#e8f2ee');
    hit(c, 'gh:seeds', ['r', -90, -108, 180, 112], { label:tr('种子盒') });
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
    GROW_BAR.forEach(b => { hole(.85, b.x, 300, b.w*.74, .9*L, null, 360); });
    if (L < .95 && S.ghCursor){ hole(1, S.ghCursor.x, S.ghCursor.y, 220, (1-L)*(.35 + .25*Math.min(1, PR.stillT/3))); }
    POTS.forEach((pot,i) => { const pts = S.bloomPts && S.bloomPts[i]; if (pts) pts.forEach(([bx,by]) => hole(pot.k, pot.x + bx*pot.s, pot.y + by*pot.s, 90*pot.s, .45)); });
    hole(K_WL, 800, 260, 700, .25, null, 260);
    hole(K_WL, -330, 300, 420, .16, null, 240);
    /* the bench lamp: the workshop end is lit whether or not the garden is */
    hole(K_WL, BENCH_X - 20, 300, 620, .34, null, 330);
    hole(1, BENCH_X + 30, POT_Y - 150, 320, .72, null, 260);
    hole(1, BENCH_X - 60, POT_Y - 400, 340, .46, null, 190);
    if (G.rig && G.rig.lit) hole(1, BENCH_X, POT_Y - 150, 170, .45);
  },
  over(c, dt){
    const L = S.lampK;
    if (L > .02) GROW_BAR.forEach(b => { glowL(c, .85, SPINK, b.x, 420, b.w*.66, .22*L, null, 300); glowL(c, .85, SPINK, b.x, 172, b.w*.55, .55*L, null, 40); });
    if (L < .95 && S.ghCursor) glowL(c, 1, SWARM, S.ghCursor.x, S.ghCursor.y, 60, (1-L)*(.25 + .2*Math.min(1, PR.stillT/3)));
    POTS.forEach((pot,i) => { const p = G.pots[i], pts = S.bloomPts && S.bloomPts[i]; if (pts && p) pts.forEach(([bx,by]) => glowL(c, pot.k, p.sp === 'vine' ? SAMBER : p.sp === 'lamp' ? SAMBER : SCOOL, pot.x + bx*pot.s, pot.y + by*pot.s, 30*pot.s, .5)); });
    glowL(c, 1, SWARM, BENCH_X + 56, POT_Y - 188, 56, .55);
    glowL(c, 1, SWARM, BENCH_X + 40, POT_Y - 90, 150, .1, null, 70);
    if (G.rig && G.rig.lit) glowL(c, 1, SWARM, BENCH_X, POT_Y - 152, 46, .5);
    if (S.spray && S.ghCursor){ setL(c, 1); c.save(); c.translate(S.ghCursor.x + 30, S.ghCursor.y + 40); c.rotate(-.3);
      vol(c, cc => { cc.moveTo(-24,0); cc.lineTo(-20,-56); cc.quadraticCurveTo(0,-66, 20,-56); cc.lineTo(24,0); cc.closePath(); }, MAT.rose, { k:2, s:5, tex:0 }); c.restore(); }
    drawPuffs(c, dt); drawFX(c, dt);
  }
};
/* One rank of pots, drawn in place. The fold the plant takes when it is touched
   leans away from where it was touched, so a tap reads as a tap on that side
   rather than as the whole plant flinching. */
function drawRank(c, from, to){
  for (let i=from;i<to;i++){
    const pot = POTS[i], p = G.pots[i];
    setL(c, pot.k); c.save(); c.translate(pot.x, pot.y); c.scale(pot.s, pot.s);
    c.rotate(Math.sin(S.potWig[i]*Math.PI*3)*4*S.potWig[i]*D2R);
    if (p){
      const lean = p.lean*10 + S.curLean[i] + (S.potSpin[i] || 0)*14, f = S.fold[i], sway = Math.sin(S.T*.7 + i)*1.2*(G.reduced?.2:1);
      c.save(); c.translate(0, -72); c.rotate((lean + sway - f*6*(S.foldPt[i]||0))*D2R); c.scale(1 - f*.16, 1 - f*.1); c.translate(0, 72);
      drawPlantP(c, i);
      hit(c, 'gh:plant:' + i, ['r', -110, -440, 220, 366], { label:i === 0 ? tr('植物') : null, key:'plant' + i });
      c.restore();
    }
    else S.bloomPts[i] = null;
    drawPotP(c, i);
    hit(c, 'gh:pot:' + i, ['r', -50, -80, 100, 82], { label:i === 0 || i === 5 ? tr('花盆') : null, key:'pot' + i, cur:S.spray ? 'crosshair' : 'pointer' });
    c.restore();
  }
}
