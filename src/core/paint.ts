import { hex, mk, mulberry32, rgba } from './util';

/* ================= PAINTERLY PRIMITIVES (no contour lines) =================
   vol(): light plane → base offset away from the light → core-shadow crescent → bounce-light rim → brush grain.
   Edges come from value changes between planes, never from a stroked outline. */
/* ---- brush tiles ----
   One tile at one scale and one stroke angle, laid over every object in the
   game, reads as a sheet of texture stretched across the picture rather than as
   paint. Three things break that up, and all three are free:

     - three tiles, each with its own stroke length, width, density and angle;
     - the tile a volume gets is chosen by how big the volume is, so a kettle is
       not grained at the same frequency as a wall;
     - the pattern is rotated and offset per draw call, from a hash of the call's
       own numbers, so neighbouring objects never line their grain up.

   The tiles stay tileable: every stroke is drawn nine times, at each wrap. */
function brushTile(seed, n, lenA, lenB, wA, wB, ang, spread, alpha, blots){
  const cvs = mk(192,192), b = cvs.getContext('2d'), r = mulberry32(seed);
  b.fillStyle = 'rgb(128,128,128)'; b.fillRect(0,0,192,192); b.lineCap = 'round';
  const nine = draw => { for (const ox of [-192,0,192]) for (const oy of [-192,0,192]) draw(ox, oy); };
  /* soft loaded marks first: broad, low contrast, they give the grain a second
     and much lower frequency so it does not read as uniform noise */
  for (let i=0;i<blots;i++){
    const x = r()*192, y = r()*192, rx = 14 + r()*34, ry = 8 + r()*18, a = r()*Math.PI, v = r() < .5 ? 255 : 0;
    b.fillStyle = `rgba(${v},${v},${v},${.03 + r()*.05})`;
    nine((ox,oy) => { b.beginPath(); b.ellipse(x+ox, y+oy, rx, ry, a, 0, Math.PI*2); b.fill(); });
  }
  for (let i=0;i<n;i++){
    const x = r()*192, y = r()*192, l = lenA + r()*(lenB-lenA), a = ang + (r()-.5)*spread,
      w = wA + r()*(wB-wA), v = r() < .5 ? 255 : 0, al = alpha*(.35 + r());
    b.strokeStyle = `rgba(${v},${v},${v},${al})`; b.lineWidth = w;
    /* a slight bow in each stroke, so none of them is a straight line */
    const bow = (r()-.5)*l*.3, nx = -Math.sin(a), ny = Math.cos(a);
    nine((ox,oy) => { b.beginPath(); b.moveTo(x+ox, y+oy);
      b.quadraticCurveTo(x+ox+Math.cos(a)*l*.5 + nx*bow, y+oy+Math.sin(a)*l*.5 + ny*bow, x+ox+Math.cos(a)*l, y+oy+Math.sin(a)*l);
      b.stroke(); });
  }
  return cvs;
}
export const BRUSH = [
  brushTile(7,  1150, 3, 9,  .8, 2.0, -.5,  1.5, .11, 10),   // fine: small objects
  brushTile(23,  820, 6, 20, 1.2, 3.4, -.62, 1.1, .15,  8),  // mid: the old look, looser
  brushTile(91,  380, 16, 48, 2.6, 7.5, -.78, .85, .17,  6)  // coarse: walls, floors, hulls
];
export const brush = BRUSH[1];
export const TEX_A = [1, 1, .84];
/* A tile index from how large the volume is: `s` is the core-shadow offset, so
   it already tracks object size across all ~250 call sites without new args. */
export function brushOf(sa){ return sa > 7.5 ? 2 : sa > 3 ? 1 : 0; }
export function brushScale(sa){ return Math.max(.45, Math.min(1.9, .44 + sa*.12)); }
export const grainA = mk(128,128);
(() => { const g = grainA.getContext('2d'), d = g.createImageData(128,128), r = mulberry32(37); for (let i=0;i<d.data.length;i+=4){ const v = r() < .5 ? 255 : 0; d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = (r()*10)|0; } g.putImageData(d,0,0); })();
export function softSprite(col, mid=.42){ const c = mk(128,128), g = c.getContext('2d'), gr = g.createRadialGradient(64,64,0,64,64,64); const A = hex(col);
  gr.addColorStop(0, `rgba(${A},1)`); gr.addColorStop(.4, `rgba(${A},${mid})`); gr.addColorStop(1, `rgba(${A},0)`); g.fillStyle = gr; g.fillRect(0,0,128,128); return c; }
export const SOFT = softSprite('#ffffff'), SWARM = softSprite('#ffbf6e'), SCOOL = softSprite('#b9d6ee'), SFOG = softSprite('#c9d8e4', .3),
  SPINK = softSprite('#ff9fbf'), STEAL = softSprite('#7fd0c4'), SROSE = softSprite('#ec9a96'), SIND = softSprite('#7f84d9'), SAMBER = softSprite('#f2a95b'), SBLUE = softSprite('#5a8fe0');
export const SPR_OF = { amber:SAMBER, teal:STEAL, rose:SROSE };
export const SPC = {};
export function spr(col){ return SPC[col] || (SPC[col] = softSprite(col)); }
export const pats = new WeakMap();
/* `kind` picks a tile, `sc` scales the grain and `rot` turns it. The pattern
   object is shared per context, so its transform is set on every use rather
   than once; a browser without CanvasPattern.setTransform just gets the tile
   at its natural size, which is where this started. */
export function pat(c, kind = 1, sc = 1, rot = 0, ph = 0){
  let a = pats.get(c); if (!a){ a = []; pats.set(c, a); }
  const p = a[kind] || (a[kind] = c.createPattern(BRUSH[kind], 'repeat'));
  try { p.setTransform(new DOMMatrix().translateSelf(ph, ph*.7).rotateSelf(rot*57.29577951308232).scaleSelf(sc, sc)); } catch(e){}
  return p;
}
/* A repeatable number in [0,1) from the numbers a draw call already carries. */
export function jit(a, b, c2, d){ const v = Math.sin(a*12.9898 + b*78.233 + c2*37.719 + d*4.137)*43758.5453; return v - Math.floor(v); }
export function rr(c,x,y,w,h,r){ r = Math.max(0, Math.min(r, w/2, h/2)); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
export function ell(c,x,y,rx,ry,rot=0){ c.moveTo(x + rx*Math.cos(rot), y + rx*Math.sin(rot)); c.ellipse(x, y, Math.max(.01,rx), Math.max(.01,ry), rot, 0, Math.PI*2); c.closePath(); }
export function blob(c, pts){ const n = pts.length; c.moveTo((pts[n-1][0]+pts[0][0])/2, (pts[n-1][1]+pts[0][1])/2);
  for (let i=0;i<n;i++){ const p = pts[i], q = pts[(i+1)%n]; c.quadraticCurveTo(p[0], p[1], (p[0]+q[0])/2, (p[1]+q[1])/2); } c.closePath(); }
export function polyP(c, pts){ c.moveTo(pts[0][0], pts[0][1]); for (let i=1;i<pts.length;i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
export function stemPath(c,x0,y0,cx,cy,x1,y1,w0,w1){ const dx = x1-x0, dy = y1-y0, L = Math.hypot(dx,dy) || 1, nx = -dy/L, ny = dx/L, wm = (w0+w1)/2;
  c.moveTo(x0+nx*w0, y0+ny*w0); c.quadraticCurveTo(cx+nx*wm, cy+ny*wm, x1+nx*w1, y1+ny*w1); c.lineTo(x1-nx*w1, y1-ny*w1); c.quadraticCurveTo(cx-nx*wm, cy-ny*wm, x0-nx*w0, y0-ny*w0); c.closePath(); }
export function leafPath(c,x0,y0,x1,y1,w,bend=0){ const mx = (x0+x1)/2, my = (y0+y1)/2, dx = x1-x0, dy = y1-y0, L = Math.hypot(dx,dy) || 1, nx = -dy/L, ny = dx/L;
  c.moveTo(x0,y0); c.quadraticCurveTo(mx+nx*(w+bend), my+ny*(w+bend), x1, y1); c.quadraticCurveTo(mx-nx*(w-bend), my-ny*(w-bend), x0, y0); c.closePath(); }
export function star5(c, x, y, r){ for (let k=0;k<10;k++){ const a = -Math.PI/2 + k*Math.PI/5, rr2 = k%2 ? r*.46 : r; const px = x + Math.cos(a)*rr2, py = y + Math.sin(a)*rr2; k ? c.lineTo(px,py) : c.moveTo(px,py); } c.closePath(); }
export function vol(c, fn, col, o: any = {}){
  const lx = o.lx ?? -.55, ly = o.ly ?? -.85, k = o.k ?? 3, s = o.s ?? k*2.4;
  const rule = o.eo ? 'evenodd' : 'nonzero';
  c.save(); c.beginPath(); fn(c); c.clip(rule);
  c.fillStyle = col.l || col.b; c.fill(rule);
  c.fillStyle = col.b; c.beginPath(); c.save(); c.translate(-lx*k, -ly*k); fn(c); c.restore(); c.fill(rule);
  if (col.d){ c.fillStyle = col.d; c.beginPath(); c.rect(-1e5,-1e5,2e5,2e5); c.save(); c.translate(lx*s, ly*s); fn(c); c.restore(); c.fill('evenodd'); }
  if (col.r && o.r !== 0){ const r = o.r ?? Math.max(.8, s*.36); c.globalAlpha = o.ra ?? .7; c.fillStyle = col.r; c.beginPath(); c.rect(-1e5,-1e5,2e5,2e5); c.save(); c.translate(lx*r, ly*r); fn(c); c.restore(); c.fill('evenodd'); c.globalAlpha = 1; }
  if (o.g){ const [y0,y1,a0,a1] = o.g, gr = c.createLinearGradient(0,y0,0,y1); gr.addColorStop(0,a0); gr.addColorStop(1,a1); c.fillStyle = gr; c.beginPath(); fn(c); c.fill(rule); }
  if (o.gx){ const [x0,x1,a0,a1] = o.gx, gr = c.createLinearGradient(x0,0,x1,0); gr.addColorStop(0,a0); gr.addColorStop(1,a1); c.fillStyle = gr; c.beginPath(); fn(c); c.fill(rule); }
  if (o.hl){ const [hx,hy,hr,ha,hc] = o.hl, gr = c.createRadialGradient(hx,hy,0,hx,hy,hr); gr.addColorStop(0, hc ? rgba(hc,ha) : `rgba(255,246,228,${ha})`); gr.addColorStop(1, hc ? rgba(hc,0) : 'rgba(255,246,228,0)'); c.fillStyle = gr; c.fillRect(hx-hr, hy-hr, hr*2, hr*2); }
  if (o.tex !== 0){
    const sa = Math.abs(s), bi = o.bi ?? brushOf(sa), h = jit(lx, ly, s, k), h2 = jit(k, s, lx*3.1, ly*7.3);
    c.globalAlpha = (o.tex ?? .42) * TEX_A[bi];
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = pat(c, bi, brushScale(sa), (h - .5)*1.1, h2*192);
    c.beginPath(); fn(c); c.fill(rule);
  }
  c.restore();
}
export function flat(c, fn, col, a=1){ c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath(); fn(c); c.fill(); c.restore(); }
export function duo(c, fn, base, light, dx=-.8, dy=-.9){ c.save(); c.beginPath(); fn(c); c.fillStyle = base; c.fill(); c.clip(); c.translate(dx,dy); c.beginPath(); c.rect(-1e5,-1e5,2e5,2e5); c.translate(-dx*2.2,-dy*2.2); fn(c); c.fillStyle = light; c.fill('evenodd'); c.restore(); }
export function shadow(c, x, y, rx, ry, a=.35){ c.save(); c.globalAlpha *= a; c.drawImage(SHADE, x-rx, y-ry, rx*2, ry*2); c.restore(); }
export const SHADE = softSprite('#050a16', .55);
export function glowAt(c, spr, x, y, r, a, ry?){ if (a < .005) return; c.globalAlpha = a; c.drawImage(spr, x-r, y-(ry||r), r*2, (ry||r)*2); c.globalAlpha = 1; }
export function sphere(c, x, y, r, col, o: any = {}){
  vol(c, cc => ell(cc, x, y, r, r), col, { k:r*.06, s:r*.32, r:r*.05, ra:.8, lx:o.lx ?? -.6, ly:o.ly ?? -.7, tex:.35 });
  if (o.bands){ c.save(); c.beginPath(); ell(c, x, y, r, r); c.clip(); c.globalAlpha = .18; c.fillStyle = o.bands;
    for (let i=-3;i<=3;i++){ c.beginPath(); ell(c, x, y + i*r*.26, r*1.1, r*.06, -.08); c.fill(); } c.restore(); }
}
/* Painted labels sit in boxes sized for 2-4 Chinese glyphs. The English for the
   same thing is usually several words, so a label that must stay inside its box
   asks for txtFit: it shrinks to a floor, then wraps once at a space. Chinese has
   no spaces to wrap at and rarely overflows, so it simply keeps its size. */
export function txtFit(c, s, x, y, maxW, size, color, o: any = {}){
  const measure = (str, px) => { c.save(); c.font = `${o.w || 400} ${px}px ${o.mono ? '"DM Mono", ui-monospace, monospace' : o.sans ? '"Noto Sans SC", "PingFang SC", sans-serif' : '"ZCOOL XiaoWei", "Songti SC", "STSong", serif'}`; const w = c.measureText(str).width; c.restore(); return w; };
  const floor = o.floor ?? size * 0.72;
  let px = size;
  while (px > floor && measure(s, px) > maxW) px -= .5;
  if (measure(s, px) <= maxW){ txt(c, s, x, y, px, color, o); return; }
  /* Still over: split at the space nearest the middle and set two lines. */
  const sp = s.indexOf(' ') < 0 ? -1 : [...s].reduce((best, ch, i) => ch === ' ' && Math.abs(i - s.length/2) < Math.abs(best - s.length/2) ? i : best, -1);
  if (sp < 0){ while (px > 4 && measure(s, px) > maxW) px -= .5; txt(c, s, x, y, px, color, o); return; }
  const a = s.slice(0, sp), b = s.slice(sp + 1);
  let p2 = Math.min(size, px);
  while (p2 > 4 && Math.max(measure(a, p2), measure(b, p2)) > maxW) p2 -= .5;
  txt(c, a, x, y - p2 * .58, p2, color, o);
  txt(c, b, x, y + p2 * .58, p2, color, o);
}
export function txt(c, s, x, y, size, color, o: any = {}){
  c.save(); c.font = `${o.w || 400} ${size}px ${o.mono ? '"DM Mono", ui-monospace, monospace' : o.sans ? '"Noto Sans SC", "PingFang SC", sans-serif' : '"ZCOOL XiaoWei", "Songti SC", "STSong", serif'}`;
  c.textAlign = o.align || 'center'; c.textBaseline = o.base || 'alphabetic'; c.fillStyle = color; c.globalAlpha *= (o.a ?? 1);
  if (o.ls){ try { c.letterSpacing = o.ls + 'px'; } catch(e){} }
  c.fillText(s, x, y); c.restore();
}
