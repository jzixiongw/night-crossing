import { mat, tp } from './camera';
import { pat, polyP } from './paint';
import { RS } from './surface';
import { lerp } from './util';

/* ================= 2.5D ROOM SHELL =================
   Back wall rect lives on a far layer, the opening on a near one; ceiling, side walls and floor are the quads between them,
   recomputed every frame so they shear as the camera drifts. */
export function P(k, x, y, o?){ return tp(mat(k, o), x, y); }
export function shell(c, cfg){
  const { kb, kf, b, f } = cfg;
  const BL = P(kb, b[0], b[3]), BR = P(kb, b[2], b[3]), TL = P(kb, b[0], b[1]), TR = P(kb, b[2], b[1]);
  const FL = P(kf, f[0], f[3]), FR = P(kf, f[2], f[3]), GL = P(kf, f[0], f[1]), GR = P(kf, f[2], f[1]);
  c.setTransform(1,0,0,1,0,0);
  const quad = (pts, fill) => { c.beginPath(); polyP(c, pts); c.fillStyle = fill; c.fill(); };
  const lg = (a, b2, stops) => { const g = c.createLinearGradient(a[0], a[1], b2[0], b2[1]); stops.forEach(([t,col]) => g.addColorStop(t, col)); return g; };
  quad([TL, TR, GR, GL], lg(TL, [TL[0], GL[1]], cfg.ceil));
  quad([BL, BR, FR, FL], lg(BL, [BL[0], FL[1]], cfg.floor));
  quad([TL, BL, FL, GL], lg(TL, [GL[0], TL[1]], cfg.side));
  quad([TR, BR, FR, GR], lg(TR, [GR[0], TR[1]], cfg.side));
  // painterly grain over the shell
  c.save(); c.globalAlpha = .28; c.globalCompositeOperation = 'soft-light'; c.fillStyle = pat(c); c.beginPath(); polyP(c, [GL, GR, FR, FL]); c.fill(); c.restore();
  // floor boards / seams converge toward the back wall
  if (cfg.seams){ const n = cfg.seams; c.fillStyle = cfg.seamCol || 'rgba(8,12,26,.28)';
    for (let i=1;i<n;i++){ const t = i/n, a = [lerp(BL[0],BR[0],t), lerp(BL[1],BR[1],t)], bb = [lerp(FL[0],FR[0],t), lerp(FL[1],FR[1],t)], w = RS*1.2, w2 = RS*3.2;
      c.beginPath(); c.moveTo(a[0]-w, a[1]); c.lineTo(a[0]+w, a[1]); c.lineTo(bb[0]+w2, bb[1]); c.lineTo(bb[0]-w2, bb[1]); c.closePath(); c.fill(); } }
  // contact shadow where the wall meets the floor + ambient occlusion in corners
  const ao = c.createLinearGradient(0, BL[1], 0, BL[1] + RS*70); ao.addColorStop(0, 'rgba(5,9,20,.5)'); ao.addColorStop(1, 'rgba(5,9,20,0)');
  c.fillStyle = ao; c.beginPath(); polyP(c, [BL, BR, [BR[0], BR[1]+RS*70], [BL[0], BL[1]+RS*70]]); c.fill();
  return { BL, BR, TL, TR, FL, FR, GL, GR };
}
