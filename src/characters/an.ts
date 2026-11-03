import { SFOG, ell, flat, leafPath, rr, shadow, stemPath, vol } from '../core/paint';
import { clamp, mixHex } from '../core/util';
import { TEA } from '../data/index';
import { S } from '../state/runtime';
import { G } from '../state/store';
import { MAT } from '../core/materials';

/* ================= THINGS YOU CAN PICK UP =================
   A cup, a loaf, a pear. There used to be a person painted here as well; the
   ship has one crew now, so what is left is only what that crew handles. */
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
