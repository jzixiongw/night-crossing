import { MAT } from '../core/materials';
import { SFOG, blob, ell, flat, leafPath, polyP, rr, shadow, stemPath, vol } from '../core/paint';
import { clamp, mixHex } from '../core/util';
import { TEA } from '../data/index';
import { S } from '../state/runtime';
import { G } from '../state/store';

/* ================= 岸 (painted, seated) =================
   Local origin = top of the seat under her hips. ~250 units from seat to crown at s=1. */
export function drawAn(c, x, y, o: any = {}){
  const s = o.s || 1, t = S.T, asleep = !!o.asleep, face = o.face || 1;
  const br = asleep ? .7 : 1.1, by = Math.sin(t*br)*1.3, hy = Math.sin(t*br - .4)*1.7;
  const L = { lx:-.5*face, ly:-.85 };
  c.save(); c.translate(x, y); c.scale(s*face, s);
  // feet + shins
  shadow(c, 0, 116, 70, 12, .45);
  vol(c, cc => { ell(cc, -26, 111, 21, 10); ell(cc, 26, 111, 21, 10); }, MAT.navy, { ...L, k:1.5, s:3.5, tex:0 });
  vol(c, cc => { rr(cc, -40, 14, 28, 96, 13); rr(cc, 12, 14, 28, 96, 13); }, MAT.pants, { ...L, k:2.5, s:6, g:[14, 60, 'rgba(8,12,26,.35)', 'rgba(8,12,26,0)'] });
  c.translate(0, by);
  // lap
  vol(c, cc => rr(cc, -54, -14, 108, 40, 18), MAT.pants, { ...L, k:2.5, s:6 });
  // coat
  const coat = cc => blob(cc, [[-54,-2],[-62,-60],[-48,-120],[0,-136],[48,-120],[62,-60],[54,-2],[0,8]]);
  vol(c, coat, MAT.coat, { ...L, k:4, s:10, r:2, hl:[-30*face,-100,70,.12] });
  flat(c, cc => rr(cc, -3, -112, 6, 104, 3), '#2c4752', .45);
  flat(c, cc => { ell(cc, 0, -84, 3.2, 3.2); ell(cc, 0, -58, 3.2, 3.2); }, '#2c4752', .7);
  // arms + prop
  const arm = (sx, sy, ex, ey, hx, hy2) => {
    vol(c, cc => stemPath(cc, sx, sy, ex, ey, hx, hy2, 14, 10), MAT.coat, { ...L, k:2, s:5, r:1.2 });
    vol(c, cc => ell(cc, hx, hy2 + 2, 9, 7.5), MAT.skin, { ...L, k:1, s:2.6, tex:0 });
  };
  const pose = o.pose || 'map';
  if (pose === 'map'){
    vol(c, cc => polyP(cc, [[-66,-24],[60,-32],[68,6],[-58,14]]), MAT.paper, { ...L, k:1.2, s:3, tex:.3, g:[-30, 14, 'rgba(255,255,255,0)', 'rgba(120,90,60,.12)'] });
    flat(c, cc => { cc.moveTo(-50,-4); cc.bezierCurveTo(-24,-26, 6,4, 44,-18); cc.lineTo(44,-15); cc.bezierCurveTo(6,8, -24,-22, -50,-1); cc.closePath(); }, '#33466e', .75);
    (o.dots || []).forEach((col, i) => flat(c, cc => ell(cc, -44 + i*9, -6 - Math.sin(i*.9)*8, 3, 3), col));
    arm(-46, -112, -58, -44, -34, -14); arm(46, -112, 58, -44, 36, -18);
  } else if (pose === 'book'){
    arm(-46, -112, -52, -56, -24, -52); arm(46, -112, 52, -56, 26, -54);
    vol(c, cc => polyP(cc, [[-36,-82],[0,-76],[0,-34],[-38,-40]]), MAT.paper, { ...L, k:1, s:2.4, tex:.25 });
    vol(c, cc => polyP(cc, [[0,-76],[36,-82],[38,-40],[0,-34]]), MAT.cream, { ...L, k:1, s:2.4, tex:.25 });
    flat(c, cc => rr(cc, -1.5, -78, 3, 44, 1), '#9a8a6c', .7);
    arm(-46, -112, -52, -56, -30, -46);
  } else if (pose === 'cup'){
    arm(-46, -112, -56, -56, -12, -40); arm(46, -112, 56, -56, 14, -40);
    vol(c, cc => rr(cc, -14, -64, 28, 30, 8), MAT.cream, { ...L, k:1.2, s:3 });
    arm(-46, -112, -56, -56, -12, -40);
  }
  // scarf
  vol(c, cc => blob(cc, [[-34,-132],[0,-124],[34,-132],[36,-112],[0,-102],[-36,-112]]), MAT.scarf, { ...L, k:2, s:5 });
  vol(c, cc => { cc.save(); cc.translate(16, -112); cc.rotate(-.12); rr(cc, 0, 0, 16, 50, 7); cc.restore(); }, MAT.scarf, { ...L, k:1.5, s:4 });
  // head
  c.save(); c.translate(0, hy + (asleep ? 6 : 0)); if (asleep){ c.translate(0, -140); c.rotate(.15); c.translate(0, 140); }
  vol(c, cc => rr(cc, -10, -150, 20, 20, 6), MAT.skin, { ...L, k:1, s:3, tex:0 });
  vol(c, cc => blob(cc, [[-44,-150],[-48,-200],[0,-226],[48,-200],[44,-150],[0,-158]]), MAT.hair, { ...L, k:3, s:7 });
  vol(c, cc => ell(cc, 0, -180, 37, 40), MAT.skin, { ...L, k:2, s:6, r:1.5, tex:.25 });
  vol(c, cc => blob(cc, [[-42,-172],[-42,-212],[0,-228],[42,-212],[40,-176],[30,-194],[10,-200],[-10,-194],[-28,-186]]), MAT.hair, { ...L, k:2, s:5, hl:[-16*face,-212,26,.18] });
  flat(c, cc => { ell(cc, -22, -164, 9, 6); ell(cc, 22, -164, 9, 6); }, '#e98f8c', .32);
  const blink = !asleep && S.T % 5.3 < .12;
  if (asleep || blink) flat(c, cc => { ell(cc, -15, -176, 6.5, 1.5); ell(cc, 15, -176, 6.5, 1.5); }, '#1f2a45', .85);
  else flat(c, cc => { ell(cc, -15, -177, 2.8, 3.6); ell(cc, 15, -177, 2.8, 3.6); }, '#1a2440');
  flat(c, cc => ell(cc, 0, -159, 4, 1.6), '#9a5a5c', .7);
  // glasses: tinted lens planes and a highlight, no rims
  flat(c, cc => { ell(cc, -15, -176, 12.5, 11.5); ell(cc, 15, -176, 12.5, 11.5); }, '#c8e0f0', .16);
  flat(c, cc => rr(cc, -3, -178, 6, 2.4, 1.2), '#2b3656', .7);
  flat(c, cc => { ell(cc, -20, -182, 3.5, 2, -.5); ell(cc, 10, -182, 3.5, 2, -.5); }, '#ffffff', asleep ? .2 : .45);
  c.restore();
  c.restore();
}
export function drawAnSilhouette(c, x, y, s, col, a){ // seen through a small door window
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= a; c.fillStyle = col;
  c.beginPath(); ell(c, 0, -14, 11, 12); c.fill(); c.beginPath(); c.moveTo(-20, 18); c.quadraticCurveTo(-20, 0, 0, 0); c.quadraticCurveTo(20, 0, 20, 18); c.closePath(); c.fill(); c.restore();
}
export function drawCupP(c, x, y, s, tea?, o: any = {}){
  const t = tea || G.tea, K = TEA[t.kind] || TEA.water;
  const col = t.kind && t.kind !== 'water' ? mixHex('#e8dcc0', K.hex, .25 + .75*t.steep) : '#d6e6f0';
  c.save(); c.translate(x, y); c.scale(s, s);
  shadow(c, 0, 2, 44, 9, .45);
  vol(c, cc => { cc.moveTo(34,-34); cc.bezierCurveTo(62,-34, 62,-6, 30,-8); cc.lineTo(30,-16); cc.bezierCurveTo(48,-16, 48,-26, 34,-26); cc.closePath(); }, MAT.cream, { k:1.4, s:3, tex:0 });
  vol(c, cc => { cc.moveTo(-36,-46); cc.lineTo(36,-46); cc.bezierCurveTo(36,-10, 26,0, 0,0); cc.bezierCurveTo(-26,0, -36,-10, -36,-46); cc.closePath(); }, MAT.cream, { k:2.4, s:7, r:1.6, hl:[-16,-36,26,.35] });
  flat(c, cc => rr(cc, -36, -30, 72, 6, 3), '#7fa0bb', .55);
  flat(c, cc => ell(cc, 0, -46, 36, 7), '#c7b493');
  if (t.level > 0){ const ry = 6, yy = -46 + (1-t.level)*14, rx = 33 - (1-t.level)*5;
    flat(c, cc => ell(cc, 0, yy, rx, ry*.85), col);
    flat(c, cc => ell(cc, -10, yy - 1.5, rx*.4, 1.6), '#ffffff', .35);
    if (t.leaves && t.kind !== 'water') flat(c, cc => { ell(cc, -10, yy, 6, 2.2, .4); ell(cc, 8, yy+1, 5, 2, -.5); ell(cc, 2, yy-1.5, 4, 1.6, 1.2); }, '#5b7a3a', .8);
  } else if (t.leaves && t.kind !== 'water') flat(c, cc => { ell(cc, -6, -42, 6, 2, .4); ell(cc, 8, -41, 5, 2, -.5); }, '#5b7a3a', .7);
  c.restore();
}
export function cupSteam(c, x, y, s){
  const t = G.tea; const so = t.level > 0 ? clamp(t.temp*1.2 - .2, 0, .6) : 0; if (so < .02) return;
  c.save(); for (let i=0;i<3;i++){ const ph = (S.T*.35 + i/3) % 1; const r = (10 + ph*26)*s;
    c.globalAlpha = so*.6*Math.sin(Math.PI*ph); c.drawImage(SFOG, x + Math.sin(S.T*1.3 + i*2)*8*s - r, y - ph*70*s - r, r*2, r*2); } c.restore();
}
export function breadP(c, shape, x, y, s=1, raw=false){
  const col = raw ? {l:'#fff4dc',b:'#f1dfb9',d:'#cdb58c',r:'#f8ead0'} : {l:'#f5c07c',b:'#d98e48',d:'#93562a',r:'#eba25e'};
  c.save(); c.translate(x, y); c.scale(s, s);
  shadow(c, 0, 1, 52, 9, .4);
  const o = { k:2.5, s:7, r:1.5, hl:[-12,-26,30,raw ? .25 : .3] };
  if (shape === 'long'){ vol(c, cc => ell(cc, 0, -15, 54, 17), col, o); if (!raw) flat(c, cc => { for (const x0 of [-30,-6,18]) leafPath(cc, x0, -26, x0+10, -8, 3); }, '#f5d39a', .8); }
  else if (shape === 'braid'){ vol(c, cc => { ell(cc, -30, -16, 22, 15); ell(cc, 30, -16, 22, 15); }, col, o); vol(c, cc => ell(cc, 0, -20, 24, 17), col, o); }
  else if (shape === 'round'){ vol(c, cc => { cc.moveTo(-36,0); cc.bezierCurveTo(-38,-34, 38,-34, 36,0); cc.closePath(); }, col, o); if (!raw) flat(c, cc => { rr(cc, -14,-24, 28, 4, 2); rr(cc, -2, -32, 4, 20, 2); }, '#f5d39a', .8); }
  else vol(c, cc => { cc.moveTo(-40,0); cc.bezierCurveTo(-44,-30,-20,-38,0,-38); cc.bezierCurveTo(24,-38,44,-30,40,0); cc.closePath(); }, col, { ...o, tex:.5 });
  c.restore();
}
export function pearP(c, x, y, s, bite){
  c.save(); c.translate(x, y); c.scale(s, s);
  shadow(c, 0, 18, 20, 5, .35);
  vol(c, cc => { cc.moveTo(0,-24); cc.bezierCurveTo(8,-24, 9,-13, 11,-6); cc.bezierCurveTo(19,2, 17,17, 0,19); cc.bezierCurveTo(-17,17, -19,2, -11,-6); cc.bezierCurveTo(-9,-13, -8,-24, 0,-24); cc.closePath(); },
    {l:'#f0f7c2',b:'#cfe091',d:'#8aa257',r:'#e6efa8'}, { k:1.6, s:4.5, hl:[-6,-6,10,.45] });
  if (bite >= 1) flat(c, cc => ell(cc, 12, -4, 6, 6), '#f5f0d8');
  if (bite >= 2) flat(c, cc => ell(cc, 13, 7, 6, 6), '#f5f0d8');
  flat(c, cc => stemPath(cc, 0, -24, 2, -30, 6, -33, 1.6, 1), '#5c4632');
  vol(c, cc => ell(cc, 8, -30, 6, 3, -.3), MAT.leaf, { k:.6, s:1.5, tex:0 });
  c.restore();
}
