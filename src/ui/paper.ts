import { mk, mulberry32 } from '../core/util';
import { penArrow, penBox, penLine, penRing, penStroke, penTick } from '../core/pen';

/* ================= THE SHIP'S STATIONERY =================
   Everything the DOM puts over the picture -- the guide, the labels, the
   menus, the tabs, the ticket -- is cut from the same few papers and marked
   with the same pens as the work slips on the walls (ui/sheet.ts). This file
   makes the two shared things the stylesheet cannot: the fibre in the paper
   and the pen marks. Both are made once, here, and handed to CSS as custom
   properties; nothing is drawn per frame or per panel.

   The pen marks are not redrawn in CSS. core/pen.ts is run against a small
   recorder that turns its filled ribbons into SVG paths, so a ring on a menu
   is the same seeded ring a slip would get, and the house rule still holds:
   every mark is a filled ribbon, never a stroked line.

   What each ink is for, everywhere (game.css repeats this at the top):
     ink    blue-black  text, outlines, a choice circled in a menu
     pencil grey        secondary text, rules, empty boxes, hover
     ochre  red         now: the step you are on, the thing to touch next
     teal   green       done / on: ticks, the finished stamp
     amber  yellow      highlighter: where you are (tab, view, slot)
     rose   grey-pink   take away: delete, clear, armed
   A state is never carried by colour alone: ochre comes as an arrow or an
   underline, teal as a tick, rose as a cross, amber with the tab raised. */

export const PEN = {
  ink: '#24304b', pencil: '#5b554c', ochre: '#a8452f', teal: '#2b6e66',
  amber: '#e9b25c', rose: '#a5636a', cream: '#f3e9d3', night: '#e9774f'
};

/* Just enough of a 2D context for core/pen.ts: it only ever fills paths of
   straight segments under save/restore and globalAlpha. */
class Rec {
  parts: string[] = []; d = ''; globalAlpha = 1; fillStyle = '#000'; private st: [number, string][] = [];
  save(){ this.st.push([this.globalAlpha, this.fillStyle]); }
  restore(){ const s = this.st.pop(); if (s) [this.globalAlpha, this.fillStyle] = s; }
  beginPath(){ this.d = ''; }
  moveTo(x: number, y: number){ this.d += 'M' + x.toFixed(2) + ' ' + y.toFixed(2); }
  lineTo(x: number, y: number){ this.d += 'L' + x.toFixed(2) + ' ' + y.toFixed(2); }
  closePath(){ this.d += 'Z'; }
  fill(){ this.parts.push(`<path d="${this.d}" fill="${this.fillStyle}"${this.globalAlpha < 1 ? ` fill-opacity="${+this.globalAlpha.toFixed(3)}"` : ''}/>`); }
}

/* Ink is not flat: a little turbulence frays the edge of every ribbon and
   thins it in places, so a mark reads as pressed into paper. The seed is
   fixed, so the fray is the same on every redraw and never shimmers. */
function svg(w: number, h: number, draw: (c: any) => void, o: { fray?: number; dry?: number; seed?: number; fit?: boolean } = {}){
  const r = new Rec(); draw(r);
  const fray = o.fray ?? .9, dry = o.dry ?? 1.5, seed = o.seed ?? 7;
  const filter = `<filter id="f" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${seed}" result="n"/>`
    + `<feDisplacementMap in="SourceGraphic" in2="n" scale="${fray}" xChannelSelector="R" yChannelSelector="G" result="d"/>`
    + `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -${dry} ${(dry*.5 + 1.05).toFixed(2)}" result="m"/>`
    + `<feComposite in="d" in2="m" operator="in"/></filter>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"${o.fit ? '' : ' preserveAspectRatio="none"'}>${filter}<g filter="url(#f)">${r.parts.join('')}</g></svg>`;
}
const url = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

/* A highlighter pass: broad, blunt at the ends, laid twice so the overlap
   is darker where the hand went back over it. */
function swipe(c: any, w: number, h: number, col: string, seed: number){
  const r = mulberry32(seed), y = h*.55, line = (dy: number) => Array.from({ length: 9 }, (_, i) =>
    [w*.03 + i*(w*.94)/8, y + dy + Math.sin(i*.8 + r()*2)*h*.03] as [number, number]);
  penStroke(c, line(-h*.04), h*.62, col, .5, .82);
  penStroke(c, line(h*.06).slice(1, 8), h*.5, col, .32, .7);
}

/* The marks, by name. Wide ones stretch to their element; fitted ones keep
   their shape. */
const MARKS: Record<string, string> = {
  /* a choice circled; the round one goes round a dot or a number */
  'ring-ink': svg(120, 44, c => penRing(c, 60, 22, 53, 16.5, PEN.ink, 11, 2.1, .9)),
  'ring-ochre': svg(120, 44, c => penRing(c, 60, 22, 53, 16.5, PEN.ochre, 4, 2.4)),
  'ring-ochre-o': svg(64, 64, c => penRing(c, 32, 32, 24, 24, PEN.ochre, 8, 2.6), { fit: true }),
  /* every touchable thing, when you ask: pale, so it never reads as "now" */
  'ring-cream': svg(64, 64, c => { penRing(c, 32, 32, 24, 23, '#0b1222', 15, 5, .35); penRing(c, 32, 32, 24, 23, PEN.cream, 15, 2.2, .95); }, { fit: true }),
  'ring-teal': svg(64, 64, c => penRing(c, 32, 32, 25, 25, PEN.teal, 9, 2.6), { fit: true }),
  /* the target in the room: a cream underlay so the ochre holds on a dark wall */
  'target': svg(100, 100, c => { penRing(c, 50, 50, 39, 37, PEN.cream, 21, 7, .5); penRing(c, 50, 50, 39, 37, PEN.night, 21, 3.4); }, { fit: true, fray: 1.2 }),
  /* underlines: ochre for the step you are on, pencil for hover */
  'under-ochre': svg(200, 12, c => penLine(c, 4, 6, 196, 6.5, 2.4, PEN.ochre, 3, .012)),
  'under-pencil': svg(200, 12, c => penLine(c, 4, 6.5, 196, 6, 1.5, PEN.pencil, 8, .01, .85)),
  'under-ink': svg(200, 12, c => penLine(c, 4, 6, 196, 6, 2.2, PEN.ink, 5, .008)),
  /* a ruled line between entries in a book */
  'rule': svg(400, 6, c => penLine(c, 2, 3, 398, 3, 1.1, PEN.pencil, 9, .002, .5), { dry: 2.2 }),
  'hl': svg(200, 30, c => swipe(c, 200, 30, PEN.amber, 13), { dry: .8, fray: 1.4 }),
  'tick': svg(24, 24, c => penTick(c, 10, 16, 17, PEN.teal, 5, 2.6), { fit: true }),
  'tick-ink': svg(24, 24, c => penTick(c, 10, 16, 17, PEN.ink, 6, 2.2), { fit: true }),
  'box': svg(24, 24, c => penBox(c, 4.5, 4.5, 15, PEN.pencil, 3, 1.4), { fit: true }),
  'arrow': svg(28, 20, c => penArrow(c, 2, 10, 22, PEN.ochre, 1, 2.4), { fit: true }),
  'arrow-ink': svg(28, 20, c => penArrow(c, 2, 10, 22, PEN.ink, 2, 2.1), { fit: true }),
  'cross': svg(20, 20, c => { penLine(c, 4, 4, 16, 16, 2, PEN.rose, 1, .02); penLine(c, 16, 4, 4.5, 16, 2, PEN.rose, 2, .02); }, { fit: true }),
  /* the pencil line from a label down to the thing it names */
  'leader': svg(8, 40, c => penLine(c, 4, 2, 4.3, 38, 1.6, PEN.cream, 4, .02, .85), { dry: .6 })
};

/* Gesture glyphs for the labels: what your hand does, drawn in the same pen. */
const GLYPHS: Record<string, string> = {
  tap: svg(20, 20, c => { penRing(c, 10, 10, 7, 7, PEN.ink, 3, 1.1, .55); penRing(c, 10, 10, 1.4, 1.4, PEN.ink, 4, 3.4); }, { fit: true, fray: .4 }),
  drag: svg(20, 20, c => { penStroke(c, [[3, 10], [10, 10.3], [17, 10]], 1.6, PEN.ink, 1, .5);
    for (const [x0, x1] of [[6.4, 3], [13.6, 17]]){ penStroke(c, [[x0, 6.4], [(x0 + x1)/2, 8.4], [x1, 10]], 1.4, PEN.ink, 1, .5); penStroke(c, [[x0, 13.6], [(x0 + x1)/2, 11.6], [x1, 10]], 1.4, PEN.ink, 1, .5); } }, { fit: true, fray: .5 }),
  hold: svg(20, 20, c => { penRing(c, 10, 10, 7.5, 7.5, PEN.ink, 5, 1.2, .7); penRing(c, 10, 10, 3.6, 3.6, PEN.ink, 6, 2.2); }, { fit: true, fray: .5 }),
  circle: svg(20, 20, c => { penStroke(c, Array.from({ length: 14 }, (_, i) => { const a = -2.2 + i/13*Math.PI*1.6; return [10 + Math.cos(a)*6.5, 10 + Math.sin(a)*6.5] as [number, number]; }), 1.6, PEN.ink, 1, .5);
    penStroke(c, [[13.2, 3], [16.4, 5.4], [13.8, 8.4]], 1.4, PEN.ink, 1, .5); }, { fit: true, fray: .5 }),
  near: svg(20, 20, c => { penStroke(c, [[3, 10], [10, 5], [17, 10], [10, 15], [3, 10]], 1.4, PEN.ink, 1, .6); penRing(c, 10, 10, 2.6, 2.6, PEN.ink, 2, 2.2); }, { fit: true, fray: .5 })
};
/* The gesture words in ui/guide.ts, by their Chinese source string. */
export const GESTURE_GLYPH: Record<string, string> = {
  '点按': 'tap', '拖动': 'drag', '左右拖动': 'drag', '按住 · 拖画': 'hold', '顺时针画圈': 'circle',
  '点按 · 拖动': 'drag', '点按 · 按住': 'hold', '走近': 'near', '走近查看': 'near'
};

/* ---------- the paper ----------
   One fibre tile, transparent, laid over whichever paper colour an element
   is. Three things are in it, all cheap: broad faint blots so the colour is
   never quite even, short bowed fibres in both a darker and a lighter tone,
   and a few specks. It tiles: every mark is drawn at each wrap. */
function fibre(seed: number, S = 256){
  const cv = mk(S, S), g = cv.getContext('2d')!, r = mulberry32(seed);
  const nine = (fn: (ox: number, oy: number) => void) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
  for (let i = 0; i < 16; i++){
    const x = r()*S, y = r()*S, rad = 30 + r()*70, warm = r() < .6;
    nine((ox, oy) => { const gr = g.createRadialGradient(x+ox, y+oy, 0, x+ox, y+oy, rad);
      gr.addColorStop(0, warm ? `rgba(128,92,48,${.035 + r()*.03})` : `rgba(255,252,240,${.05 + r()*.04})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x+ox-rad, y+oy-rad, rad*2, rad*2); });
  }
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++){
    const x = r()*S, y = r()*S, l = 2 + r()*r()*16, a = r()*Math.PI, bow = (r()-.5)*l*.5, dark = r() < .55;
    g.strokeStyle = dark ? `rgba(92,70,42,${.035 + r()*.055})` : `rgba(255,253,244,${.06 + r()*.09})`; g.lineWidth = .5 + r()*.7;
    nine((ox, oy) => { g.beginPath(); g.moveTo(x+ox, y+oy);
      g.quadraticCurveTo(x+ox + Math.cos(a)*l*.5 - Math.sin(a)*bow, y+oy + Math.sin(a)*l*.5 + Math.cos(a)*bow, x+ox + Math.cos(a)*l, y+oy + Math.sin(a)*l); g.stroke(); });
  }
  for (let i = 0; i < 46; i++){
    const x = r()*S, y = r()*S, s = .4 + r()*.9;
    g.fillStyle = `rgba(70,52,34,${.1 + r()*.16})`; nine((ox, oy) => { g.beginPath(); g.arc(x+ox, y+oy, s, 0, Math.PI*2); g.fill(); });
  }
  return cv.toDataURL('image/png');
}

/* Installed once, at import. */
const root = document.documentElement.style;
try { root.setProperty('--fiber', `url(${fibre(29)})`); } catch(e){ /* the papers are flat colour without it */ }
for (const [k, v] of Object.entries(MARKS)) root.setProperty('--mk-' + k, url(v));
for (const [k, v] of Object.entries(GLYPHS)) root.setProperty('--gl-' + k, url(v));
