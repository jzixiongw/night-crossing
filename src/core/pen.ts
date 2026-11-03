import { mulberry32 } from './util';
import { flat } from './paint';

/* ================= THE PEN =================
   Marks a hand makes: the ring round a job that is finished, the tick in a
   box, the arrow at the line you are on. Writing is the one place in this
   game where a line is the right shape, and even here it is not a stroked
   path -- every mark is a filled ribbon that swells in the middle and tapers
   at both ends, the way a nib leaves ink. The house rule holds: value, never
   contour.

   Every mark takes a seed and wobbles from it, so a tick is the same tick on
   every frame instead of boiling. Pass the row index, not Math.random. */

/* A ribbon through a run of points, `wf(t)` wide along the way. */
export function ribbon(c, pts, wf){
  const n = pts.length; if (n < 2) return;
  const L = [], R = [];
  for (let i=0;i<n;i++){
    const p = pts[i], a = pts[Math.max(0,i-1)], b = pts[Math.min(n-1,i+1)];
    const dx = b[0]-a[0], dy = b[1]-a[1], d = Math.hypot(dx,dy) || 1;
    const w = Math.max(.12, wf(i/(n-1))/2), nx = -dy/d*w, ny = dx/d*w;
    L.push([p[0]+nx, p[1]+ny]); R.push([p[0]-nx, p[1]-ny]);
  }
  c.moveTo(L[0][0], L[0][1]);
  for (let i=1;i<n;i++) c.lineTo(L[i][0], L[i][1]);
  for (let i=n-1;i>=0;i--) c.lineTo(R[i][0], R[i][1]);
  c.closePath();
}
/* The default weight: light where the nib lands and lifts, full in between. */
export const nib = (w, e=.42) => t => w*(e + (1-e)*Math.sin(Math.PI*Math.min(1, Math.max(0, t)))**.5);
export function penStroke(c, pts, w, col, a=1, e?){ flat(c, cc => ribbon(cc, pts, nib(w, e)), col, a); }

/* A written line: bowed a little, and never quite straight along its length. */
export function penLine(c, x0, y0, x1, y1, w, col, seed, bow=.004, a=1){
  const r = mulberry32((seed|0) + 1), dx = x1-x0, dy = y1-y0, L = Math.hypot(dx,dy) || 1;
  const nx = -dy/L, ny = dx/L, bw = bow*L + (r()-.5)*w, pts = [];
  for (let i=0;i<=10;i++){ const t = i/10, s = Math.sin(t*Math.PI)*bw + (r()-.5)*w*.6;
    pts.push([x0 + dx*t + nx*s, y0 + dy*t + ny*s]); }
  penStroke(c, pts, w, col, a);
}
/* The mark that says a job is finished: one loop round it, overshot, the way
   a pen comes back past where it started. */
export function penRing(c, cx, cy, rx, ry, col, seed, w=2.4, a=1){
  const r = mulberry32((seed|0) + 3), a0 = -2.4 + r()*.8, turns = 1.04 + r()*.16;
  const p1 = 1.6 + r()*2, p2 = 2.4 + r()*2, d1 = r()*6, d2 = r()*6, pts = [];
  for (let i=0;i<=44;i++){ const t = i/44, ang = a0 + t*Math.PI*2*turns;
    const k = 1 + Math.sin(ang*p1 + d1)*.045 + Math.sin(ang*p2 + d2)*.03;
    pts.push([cx + Math.cos(ang)*rx*k, cy + Math.sin(ang)*ry*k*(1 + t*.04)]); }
  penStroke(c, pts, w, col, a, .3);
}
/* A box to tick, drawn in one go, so its corners never quite meet. */
export function penBox(c, x, y, s, col, seed, w=1.6){
  const r = mulberry32((seed|0) + 5), j = () => (r()-.5)*s*.09;
  penStroke(c, [[x+j(),y+j()],[x+s*.5,y+j()*.6],[x+s+j(),y+j()],[x+s+j(),y+s*.5],
    [x+s+j(),y+s+j()],[x+s*.5,y+s+j()*.6],[x+j(),y+s+j()],[x+j(),y+s*.5],[x+j()*.6,y+j()*.6]], w, col, 1, .55);
}
export function penTick(c, x, y, s, col, seed, w=2){
  const r = mulberry32((seed|0) + 7), j = (r()-.5)*s*.12;
  penStroke(c, [[x - s*.34, y - s*.06], [x - s*.1, y + s*.3 + j], [x + s*.18, y - s*.16],
    [x + s*.42, y - s*.64 + j]], w, col);
}
/* The arrow in the margin: this is the line you are on. */
export function penArrow(c, x, y, s, col, seed, w=2){
  penStroke(c, [[x, y], [x + s*.5, y], [x + s, y]], w, col, 1, .5);
  penStroke(c, [[x + s*.48, y - s*.34], [x + s*.78, y - s*.14], [x + s, y]], w*.85, col, 1, .5);
  penStroke(c, [[x + s*.48, y + s*.34], [x + s*.78, y + s*.14], [x + s, y]], w*.85, col, 1, .5);
}
export function penStrike(c, x0, x1, y, col, seed, w=1.8){ penLine(c, x0, y, x1, y, w, col, seed, .006); }
