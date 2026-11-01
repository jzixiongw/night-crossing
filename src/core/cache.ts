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
export function layerCache(c, key, k, draw, o?){ const e = cacheGet(key, -170, -170, VW+340, VH+340, draw); setL(c, k, o); blit(c, e); }
export function dropCaches(keepPrefixes){ for (const k of [...CACHE.keys()]) if (!keepPrefixes.some(p => k.startsWith(p))) CACHE.delete(k); }
