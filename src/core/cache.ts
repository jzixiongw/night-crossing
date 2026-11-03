import { setL } from './camera';
import { onResize, RS, VH, VW } from './surface';
import { mk } from './util';

/* ================= CACHES (static art per room, re-rendered on resize) ================= */
export const CACHE = new Map();
onResize(() => CACHE.clear());
export function cacheGet(key, x0, y0, w, h, draw, sc=1){
  let e = CACHE.get(key); if (e && e.rs === RS) return e;
  const q = RS*sc, cvs = mk(w*q, h*q), g = cvs.getContext('2d'); g.setTransform(q,0,0,q,-x0*q,-y0*q);
  try { draw(g); } catch(err){ console.error(err); }
  e = { cvs, rs:RS, x0, y0, w, h }; CACHE.set(key, e); return e;
}
export function blit(c, e){ c.drawImage(e.cvs, e.x0, e.y0, e.w, e.h); }
/* The margin is what the free camera can reach. Horizontally the view can swing
   300 design units at rest and further once zoomed in, damped by depth to at
   most 1.24x on the near plane; vertically it tilts half as far. These numbers
   are the worst case of that, so no drag can ever pull a cached layer's painted
   edge into frame. See panLimit() in core/camera.ts.

   A room that declares a wider pan than that -- the greenhouse -- cannot use
   layerCache: one canvas that wide is past what a phone will allocate. It calls
   cacheGet directly for a strip of tiles and draws the ones on screen. */
export const PAD_X = 420, PAD_Y = 240;
export function layerCache(c, key, k, draw, o?){ const e = cacheGet(key, -PAD_X, -PAD_Y, VW+PAD_X*2, VH+PAD_Y*2, draw); setL(c, k, o); blit(c, e); }
export function dropCaches(keepPrefixes){ for (const k of [...CACHE.keys()]) if (!keepPrefixes.some(p => k.startsWith(p))) CACHE.delete(k); }
