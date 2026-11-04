import { CH, CW, RS, VX, VY, cv } from './surface';
import { G } from '../state/store';

/* ================= CAMERA =================
   Two different things move the view and they are kept apart on purpose.

   `zoom` / `zx` / `zy` / `rot` / `lift` belong to the game: room transitions
   dolly in, sitting down leans closer, walking the ring bobs. Nothing the
   player does directly touches them.

   `panX` / `panY` / `user` belong to the player: drag anywhere empty to swing
   the view across the room or tilt it up and down, wheel or pinch to push in.
   They ease toward `tpanX` / `tpanY` / `tuser`, which is what the gesture
   writes, so a flick settles instead of stopping dead.

   Both end up in the same matrix, so hit regions, lighting and the pointer
   follow without any of them knowing a free camera exists. */
export const CAM = {
  px:0, py:0, tx:0, ty:0, zoom:1, zx:800, zy:470, rot:0, lift:0, last:-10,
  panX:0, panY:0, tpanX:0, tpanY:0, user:1, tuser:1
};

/* How far the view may swing at rest, in design units. Zooming in narrows the
   window onto the room, so it also buys back room to pan: the limit grows with
   `user`, and core/cache.ts sizes the layer caches for the worst case. */
export const PAN_X = 300, PAN_Y = 150;
/* A room may be wider than the window it is composed for. The greenhouse is:
   the garden fills the frame, and the nursery and the work bench are off either
   edge, so the drag is how you get to them. `max` caps what zooming in buys
   back, which is what keeps a zoomed-in swing inside the painted room. */
/* `grow` is how much of the zoom-in is bought back as extra swing. The painted
   rooms need it (a zoomed window shows less of the room); the 3D rooms turn
   the head instead, and keep it small so a close look stays composed. */
export const PAN = { x:PAN_X, y:PAN_Y, max:Infinity, grow:1.25 };
export function setPanRange(x = PAN_X, y = PAN_Y, max = Infinity, grow = 1.25){ PAN.x = x; PAN.y = y; PAN.max = max; PAN.grow = grow; clampPan(); }
export function panLimit(){ const g = 1 + (CAM.user - 1)*PAN.grow; return [Math.min(PAN.x*g, PAN.max), PAN.y*g]; }
export function clampPan(){
  const [lx, ly] = panLimit();
  CAM.tpanX = Math.max(-lx, Math.min(lx, CAM.tpanX));
  CAM.tpanY = Math.max(-ly, Math.min(ly, CAM.tpanY));
}
export const USER_MIN = 1, USER_MAX = 1.9;
export function setUserZoom(z){ CAM.tuser = Math.max(USER_MIN, Math.min(USER_MAX, z)); clampPan(); }
export function resetView(){ CAM.tpanX = 0; CAM.tpanY = 0; CAM.tuser = 1; }
/* Viewpoints belong to the 3D rooms (src/three/view.ts). Input only needs to
   ask whether the player has moved away from a room's main view and to send
   them back, so the 3D side fills these in and the painted rooms never do. */
export const VIEW = { away: () => false, back: () => {} };
export function viewMoved(){ return Math.abs(CAM.tpanX) > 2 || Math.abs(CAM.tpanY) > 2 || CAM.tuser > 1.02; }

/* The pan is damped by depth rather than multiplied by it. True parallax would
   swing the near plane half again as far as the wall and run its painted edge
   into frame; this keeps the layers separating without any of them leaving. */
const panK = k => .6 + .4*Math.min(k, 1.6);

export function mat(k, o?){
  const zz = CAM.zoom * CAM.user;
  const z = 1 + (zz - 1)*(.35 + .65*Math.min(k, 1.7));
  const amp = (G && G.reduced) ? 4 : 8;
  const kp = panK(k);
  const ox = CAM.panX*kp - CAM.px*amp*k + (o && o.dx || 0);
  const oy = CAM.panY*kp*.9 - CAM.py*amp*.5*k + CAM.lift*Math.max(0,k-.5) + (o && o.dy || 0);
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
/* Design units per canvas pixel on the play plane, so a drag in screen space
   can be turned into the pan it should produce. */
export function scaleAt(k = 1){ const m = mat(k); return 1/Math.hypot(m[0], m[1]); }
