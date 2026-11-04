import { curM, inv, lpM, tp } from './camera';
import { txt } from './paint';
import { penRing } from './pen';
import { CH, CW, RS } from './surface';
import { clamp } from './util';
import { S } from '../state/runtime';

/* ================= HIT REGIONS (canvas has no DOM targets) ================= */
export let HITS = [], HITS_PREV = [];

/* The renderer opens a frame, every draw call appends its touchable regions, and the frame
   closes by promoting them to the set the pointer and keyboard test against. */
export function beginHits(){ HITS = []; }
export function commitHits(){ HITS_PREV = HITS; }
export function hit(c, act, shape, o){ HITS.push({ act, m:curM(c), shape, label:o && o.label, key:(o && o.key) || act, cur:(o && o.cur) || 'pointer' }); }
export function inShape(sh, x, y){
  switch (sh[0]){
    case 'r': return x >= sh[1] && x <= sh[1]+sh[3] && y >= sh[2] && y <= sh[2]+sh[4];
    case 'c': return Math.hypot(x - sh[1], y - sh[2]) <= sh[3];
    case 'e': { const dx = (x - sh[1])/sh[3], dy = (y - sh[2])/sh[4]; return dx*dx + dy*dy <= 1; }
    case 'p': { const p = sh[1]; let ins = false; for (let i=0, j=p.length-1; i<p.length; j=i++){ const [xi,yi] = p[i], [xj,yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj-xi)*(y-yi)/(yj-yi) + xi) ins = !ins; } return ins; }
  }
  return false;
}
export function shapeCenter(sh){
  if (sh[0] === 'r') return [sh[1]+sh[3]/2, sh[2]+sh[4]/2];
  if (sh[0] === 'c' || sh[0] === 'e') return [sh[1], sh[2]];
  const p = sh[1]; return [p.reduce((s,q) => s+q[0], 0)/p.length, p.reduce((s,q) => s+q[1], 0)/p.length];
}
export function shapeRadius(h){ const sh = h.shape, s = Math.hypot(h.m[0], h.m[1]);
  if (sh[0] === 'r') return Math.min(sh[3], sh[4])*.5*s; if (sh[0] === 'c') return sh[3]*s; if (sh[0] === 'e') return Math.min(sh[3], sh[4])*s; return 40*s; }
/* A room that is not painted with these matrices (the Three.js cabin) answers
   the pointer itself, by raycast. It returns undefined when it is not the room
   on screen, so the painted regions take over again. */
let PICK: ((X: number, Y: number) => { h: any; p: { x: number; y: number } } | null | undefined) | null = null;
export function setPicker(fn: typeof PICK){ PICK = fn; }
/* Where a pointer event lands in a hit's own coordinates. Painted regions
   invert their draw matrix; a raycast hit carries a `local` of its own (a
   point on the glass, say) because no 2D matrix describes a 3D surface. */
export function localPt(h, e){ return h.local ? h.local(e) : lpM(h.m, e); }
export function hitAt(X, Y){
  if (PICK){ const r = PICK(X, Y); if (r !== undefined) return r; }
  for (let i=HITS_PREV.length-1; i>=0; i--){ const h = HITS_PREV[i], p = inv(h.m, X, Y); if (inShape(h.shape, p.x, p.y)) return { h, p }; } return null; }
export function hitCanvasCenter(h){ const c = shapeCenter(h.shape); return tp(h.m, c[0], c[1]); }

export function focusables(){ const seen = new Set(), out = []; HITS_PREV.forEach(h => { if (!h.label || seen.has(h.key)) return; const [X,Y] = hitCanvasCenter(h); if (X < 0 || X > CW || Y < 0 || Y > CH) return; seen.add(h.key); out.push({ h, X, Y }); }); return out.sort((a,b) => a.X - b.X); }
export function drawFocus(c){
  if (!S.focusKey) return; const h = HITS_PREV.find(x => x.key === S.focusKey); if (!h) return;
  const [X,Y] = hitCanvasCenter(h), r = clamp(shapeRadius(h), 18*RS, 90*RS) + 6*RS;
  /* the same pen ring the HTML overlays use (ui/paper.ts), warm on a dark underlay
     so it holds on a pale wall; seeded by the key, so it never boils */
  c.setTransform(1,0,0,1,0,0);
  const seed = [...S.focusKey].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  penRing(c, X, Y, r, r*.96, '#0b1222', seed, 6*RS, .4);
  penRing(c, X, Y, r, r*.96, '#f3c977', seed, 2.8*RS, .95);
  c.globalAlpha = 1;
  if (h.label){ txt(c, h.label, X, Y + r + 20*RS, 15*RS, '#ffe7c4', { sans:true }); }
}
