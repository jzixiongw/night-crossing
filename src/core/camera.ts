import { CH, CW, RS, VX, VY, cv } from './surface';
import { G } from '../state/store';

/* Camera state: pointer drift (px/py toward tx/ty), zoom about (zx,zy), roll and lift. */
export const CAM = { px:0, py:0, tx:0, ty:0, zoom:1, zx:800, zy:470, rot:0, lift:0, last:-10 };

export function mat(k, o?){
  const z = 1 + (CAM.zoom - 1)*(.35 + .65*Math.min(k, 1.7));
  const amp = (G && G.reduced) ? 7 : 30;
  const ox = -CAM.px*amp*k + (o && o.dx || 0), oy = -CAM.py*amp*.5*k + CAM.lift*Math.max(0,k-.5) + (o && o.dy || 0);
  const s = RS*z, ex = VX + RS*(CAM.zx*(1-z) + ox*z), ey = VY + RS*(CAM.zy*(1-z) + oy*z);
  const r = (o && o.noRot) || k < .3 ? 0 : CAM.rot;
  if (!r) return [s,0,0,s,ex,ey];
  const cs = Math.cos(r), sn = Math.sin(r), cx = VX + 800*RS, cy = VY + 450*RS;
  return [s*cs, s*sn, -s*sn, s*cs, cx + cs*(ex-cx) - sn*(ey-cy), cy + sn*(ex-cx) + cs*(ey-cy)];
}
export function setL(c, k, o?){ const m = mat(k, o); c.setTransform(m[0],m[1],m[2],m[3],m[4],m[5]); return m; }
export function tp(m, x, y){ return [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]]; }
export function inv(m, X, Y){ const det = m[0]*m[3] - m[1]*m[2], x = X - m[4], y = Y - m[5]; return { x:(m[3]*x - m[2]*y)/det, y:(-m[1]*x + m[0]*y)/det }; }
export function cpt(e){ const r = cv.getBoundingClientRect(); return { X:(e.clientX - r.left)/r.width*CW, Y:(e.clientY - r.top)/r.height*CH }; }
export function lp(k, e, o?){ const p = cpt(e); return inv(mat(k, o), p.X, p.Y); }
export function curM(c){ const t = c.getTransform(); return [t.a,t.b,t.c,t.d,t.e,t.f]; }
export function lpM(m, e){ const p = cpt(e); return inv(m, p.X, p.Y); }
