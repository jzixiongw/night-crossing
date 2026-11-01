import { blob, ell, flat, glowAt, rr, shadow, spr, stemPath, vol } from '../core/paint';
import { mixHex, mulberry32 } from '../core/util';
import { S } from '../state/runtime';

/* ================= THE ONE WAITING AT THE DOOR =================
   Residents are not people and not animals. Each is a soft stack of blobs with
   arms too long for it, no mouth, and a few slow lights where a face would be.
   Nothing about the silhouette is quick or pointed: the shapes lean, sway and
   take a moment to notice you.

   One painter serves every port. `look` in data/ports.ts sets height, width,
   how many arms hang and how many lights are on, which is enough for four
   clearly different bodies without four drawing routines. */
export function visMat(col){
  return { l:mixHex(col,'#ffffff',.3), b:col, d:mixHex(col,'#0e1528',.5), r:mixHex(col,'#ffe6c8',.22) };
}
/* Where the lights sit, in the creature's own space. The hatch room reads this
   back to lay additive glows over them after the light pass. */
export function eyePts(look){
  const n = look.eyes, out = [];
  for (let i=0;i<n;i++){
    const t = n === 1 ? 0 : i/(n-1) - .5;
    out.push([t*look.w*.42, -look.h + 34 + Math.abs(t)*14]);
  }
  return out;
}
export function drawVisitor(c, x, y, look, o: any = {}){
  const s = o.s ?? 1, t = S.T, R = mulberry32(look.h*7 + look.arms*131 + look.eyes);
  const M = visMat(look.body), MD = visMat(mixHex(look.body,'#121c30',.3));
  const H = look.h, W = look.w;
  const breath = Math.sin(t*.7)*.018 + 1;
  const lean = Math.sin(t*.19)*.035 + (R() - .5)*.1;
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(lean);
  shadow(c, -lean*H*.4, 6, W*.8, W*.16, .5);
  c.save(); c.scale(1/breath, breath);
  /* Arms go on first, so the body overlaps where they join. They hang well
     outside the body and end in a paddle of a hand, which is most of what makes
     the silhouette read as clumsy rather than as a hooded person. */
  const hold = o.hold ? Math.min(1, (o.hold as number)) : 0;
  for (let i=0;i<look.arms;i++){
    const side = i % 2 ? 1 : -1, rank = Math.floor(i/2);
    const sx = side*(W*.42 - rank*10), sy = -H*.6 + rank*24;
    const sw = Math.sin(t*.5 + i*1.7)*12 + Math.sin(t*.23 + i)*7;
    const reach = rank === 0 ? hold : 0;
    const ex = sx + side*(W*.46)*(1 - reach*.74) + sw*(1 - reach);
    const ey = (-H*.06 + rank*14)*(1 - reach) + (-H*1.02)*reach;
    vol(c, cc => stemPath(cc, sx, sy, sx + side*W*.52*(1-reach*.6), sy + H*(.3 - reach*.5), ex, ey, 12, 7.5), MD, { k:2, s:5, r:1.2, tex:.3 });
    vol(c, cc => ell(cc, ex, ey + 11*(1-reach), 15, 18 - 6*reach, side*(.26 - reach*.5)), MD, { k:1.4, s:3.5, tex:.25 });
  }
  /* body: a wide base with two narrower lumps stacked on it */
  vol(c, cc => blob(cc, [[-W*.56,0],[-W*.6,-H*.22],[-W*.4,-H*.4],[0,-H*.46],[W*.4,-H*.4],[W*.6,-H*.22],[W*.56,0]]),
    M, { k:4, s:10, r:2.4, hl:[-W*.22,-H*.26,W*.6,.16] });
  vol(c, cc => blob(cc, [[-W*.44,-H*.34],[-W*.5,-H*.56],[-W*.3,-H*.7],[0,-H*.74],[W*.3,-H*.7],[W*.5,-H*.56],[W*.44,-H*.34]]),
    M, { k:3.5, s:9, r:2 });
  /* head: a tilted lump, no features except the lights */
  const tilt = Math.sin(t*.41)*.06 + (R() - .5)*.12;
  c.save(); c.translate(0, -H*.7); c.rotate(tilt);
  vol(c, cc => blob(cc, [[-W*.36,0],[-W*.42,-H*.14],[-W*.24,-H*.28],[0,-H*.32],[W*.24,-H*.28],[W*.42,-H*.14],[W*.36,0]]),
    M, { k:3, s:8, r:1.8, hl:[-W*.14,-H*.2,W*.4,.2] });
  c.restore();
  /* folds, so the body reads as cloth rather than rubber */
  for (let i=0;i<4;i++){ const fx = (R()-.5)*W*.7, fy = -H*(.08 + R()*.3);
    flat(c, cc => stemPath(cc, fx, fy, fx + (R()-.5)*14, fy - H*.1, fx + (R()-.5)*20, fy - H*.2, 2.6, 1), mixHex(look.body,'#0e1528',.42), .5); }
  c.restore();
  if (hold > .02){
    /* the lamp, up where the text says it goes */
    const ly = -H*1.22 - 8*hold;
    c.save(); c.globalAlpha = hold;
    vol(c, cc => rr(cc, -30, ly + 54, 60, 12, 5), { l:'#e4c493', b:'#b98f5e', d:'#6d5134', r:'#d8b480' }, { k:1.2, s:3, tex:0 });
    vol(c, cc => { cc.moveTo(-28, ly + 56); cc.bezierCurveTo(-28, ly - 18, 28, ly - 18, 28, ly + 56); cc.closePath(); },
      { l:'#eef7fb', b:'#c3dceb', d:'#86a3b8', r:'#dcecf6' }, { k:1.6, s:4, r:1, tex:.18, ra:.4 });
    flat(c, cc => ell(cc, 0, ly + 26, 10, 13), look.lamp, .85);
    c.restore();
  }
  /* lights, in the unscaled frame so they do not swim with the breath */
  const blinkI = Math.floor(t*.5) % Math.max(1, look.eyes);
  const blink = (t*.5 % 1) < .08;
  eyePts(look).forEach(([ex,ey], i) => {
    const open = blink && i === blinkI ? .18 : 1;
    flat(c, cc => ell(cc, ex, ey, 6.5, 6.5*open), look.lamp, .95);
  });
  c.restore();
}
/* Additive pass: the lights read as light only once the darkness wash is down. */
export function visitorGlow(c, x, y, look, s = 1, a = 1, hold = 0){
  eyePts(look).forEach(([ex,ey]) => glowAt(c, spr(look.lamp), x + ex*s, y + ey*s, 26*s, .5*a));
  if (hold > .02) glowAt(c, spr(look.lamp), x, y - (look.h*1.22 + 8*hold - 26)*s, 120*s, .55*hold*a);
}
/* Where the raised lamp sits, so the room can punch a light hole at it. */
export function holdPt(look){ return [0, -look.h*1.22 + 26]; }
