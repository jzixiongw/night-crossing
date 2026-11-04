import { tr } from '../i18n';
import { AU } from '../audio/index';
import { hit } from '../core/hits';
import { MAT } from '../core/materials';
import { ell, flat, rr, shadow, txt, txtFit, txtW, vol } from '../core/paint';
import { CW } from '../core/surface';
import { penArrow, penBox, penLine, penRing, penTick } from '../core/pen';
import { PORT_ORDER, PORTS } from '../data/ports';
import { G } from '../state/store';
import { ACT } from '../rooms/registry';
import { say } from './captions';
import { STEPS, orderState, orderWord, stepHint, stepNow, voyageLine } from './worksheet';

/* ================= THE WORK SLIP =================
   The job, written out by hand and pinned up where the work is. It is paper in
   the room, painted at the room's scale and lit by the room's lamps, so it
   reads as something the last keeper wrote rather than as a layer over the
   picture.

   The marks carry the state, and they are the marks a person makes: a ring
   round a line that is finished, an arrow at the line you are on, a box ticked
   under it for each thing that line is made of. One function paints every slip
   on the ship, so the one in the greenhouse and the big one on the cork board
   cannot drift apart. */
export const INK = '#2a3550', PENCIL = '#7d7a72', MARK = '#b4553f', FADE = '#a79d8a';

export interface SlipPart { name: string; done: boolean }
export interface SlipRow { name: string; state: 'done' | 'now' | 'todo'; tag?: string; tagBelow?: boolean; parts?: SlipPart[] }
export interface Slip { w: number; title: string; head?: string; rows: SlipRow[]; foot?: string; seed?: number;
  /* a drawing the writer added under the lines, in the same pen */
  sketch?: { h: number; draw(c: CanvasRenderingContext2D, x: number, y: number, w: number): void } }

/* Where every line lands, worked out once so that measuring a slip and
   painting it cannot disagree. */
function layout(s: Slip){
  const w = s.w, pad = Math.round(w*.085), ts = w*.105, rs = w*.082, ps = rs*.8;
  const L = { w, pad, ts, rs, ps, title:0, rule:0, head:0, rows:[] as any[], sketch:0, footRule:0, foot:0, h:0 };
  let y = pad + ts;
  L.title = y; y += ts*.44; L.rule = y;
  if (s.head){ y += ps*1.45; L.head = y; }
  y += rs*1.4;
  s.rows.forEach(r => {
    const row = { y, tagY:0, parts:[] as number[] }; L.rows.push(row);
    const has = !!(r.parts && r.parts.length);
    y += has ? rs*1.22 : rs*1.62;
    if (r.tag && r.tagBelow){ row.tagY = y - rs*.2; y += ps*1.3; }
    if (has){ r.parts.forEach(() => { y += ps*1.45; row.parts.push(y); }); y += rs*1.45; }
  });
  if (s.sketch){ L.sketch = y + rs*.15; y = L.sketch + s.sketch.h; }
  if (s.foot){ y += rs*.3; L.footRule = y; L.foot = y + rs*1.05; y = L.foot + rs*.2; }
  L.h = y + pad*.7;
  return L;
}
export function slipH(s: Slip){ return layout(s).h; }

/* A hand writes smaller when the line is long, rather than running off the
   edge of the paper. */
function fit(c, str, size, maxW, o: any = {}){ let px = size; while (px > size*.58 && txtW(c, str, px, o) > maxW) px -= .4; return px; }

/* Paints the slip with its top left corner at the origin, so the caller owns
   where it hangs and how far off square it is. Returns its height. */
export function drawSlip(c, s: Slip){
  const L = layout(s), w = s.w, h = L.h, sd = (s.seed || 3) | 0;
  shadow(c, w*.52, h + 3, w*.46, 8, .34);
  vol(c, cc => rr(cc, 0, 0, w, h, 3), MAT.paper, { k:1.6, s:3.6, r:1.2 });
  vol(c, cc => ell(cc, w/2, 8, 5.4, 5.4), MAT.rose, { k:.8, s:2, tex:0 });
  txt(c, s.title, L.pad, L.title, fit(c, s.title, L.ts, w - L.pad*2), INK, { align:'left' });
  penLine(c, L.pad, L.rule, w - L.pad, L.rule, L.rs*.13, PENCIL, sd + 11, .005);
  if (s.head) txt(c, s.head, L.pad, L.head, fit(c, s.head, L.ps, w - L.pad*2), PENCIL, { align:'left' });

  s.rows.forEach((r, i) => {
    const y = L.rows[i].y, x = L.pad + L.rs*.95, done = r.state === 'done', now = r.state === 'now';
    const col = done ? INK : now ? INK : FADE;
    /* a hand never sets two lines at the same height, or quite level */
    const dy = ((sd + i*7) % 5 - 2)*.5, rot = ((sd + i*13) % 7 - 3)*.0022;
    let tagW = 0, tagS = 0;
    if (r.tag){ tagS = fit(c, r.tag, L.ps*.98, r.tagBelow ? w - x - L.pad : w*.42); tagW = r.tagBelow ? 0 : txtW(c, r.tag, tagS); }
    /* a ring runs wider than the words it goes round, so leave it the room */
    const nameW = w - x - L.pad - (tagW ? tagW + L.rs*(done ? .95 : .35) : 0);
    const ns = fit(c, r.name, L.rs*(now ? 1.06 : 1), done ? (nameW - L.rs*.46)/1.06 : nameW);
    const tw = txtW(c, r.name, ns);
    c.save(); c.translate(x, y + dy); c.rotate(rot);
    txt(c, r.name, 0, 0, ns, col, { align:'left' });
    if (done) penRing(c, tw/2, -L.rs*.33, tw*.56 + L.rs*.46, L.rs*.72, MARK, sd + i*17, L.rs*.14);
    if (now){
      penArrow(c, L.pad*.3 - x, -L.rs*.3, L.rs*.82, MARK, sd + i*31, L.rs*.12);
      penLine(c, 0, L.rs*.3, tw, L.rs*.3, L.rs*.12, MARK, sd + i*5, .014);
    }
    c.restore();
    if (r.tag) txt(c, r.tag, r.tagBelow ? x : w - L.pad, (r.tagBelow ? L.rows[i].tagY : y) + dy, tagS, done ? PENCIL : FADE, { align:r.tagBelow ? 'left' : 'right' });
    r.parts && r.parts.forEach((p, k) => {
      const py = L.rows[i].parts[k], bx = x + L.rs*.55, bs = L.ps*.78;
      c.save(); c.translate(bx, py); c.rotate(((sd + i*5 + k*11) % 7 - 3)*.0026);
      penBox(c, 0, -bs*.84, bs, PENCIL, sd + i*13 + k*5, L.ps*.11);
      if (p.done) penTick(c, bs*.5, -bs*.4, bs*1.25, MARK, sd + i*23 + k*3, L.ps*.15);
      txt(c, p.name, bs*1.8, 0, fit(c, p.name, L.ps, w - bx - bs*1.8 - L.pad), p.done ? PENCIL : INK, { align:'left' });
      c.restore();
    });
  });
  if (s.sketch) s.sketch.draw(c, L.pad*.6, L.sketch, w - L.pad*1.2);
  if (s.foot){
    penLine(c, L.pad, L.footRule, w - L.pad, L.footRule, L.rs*.1, PENCIL, sd + 23, .004);
    txtFit(c, s.foot, w/2, L.foot, w - L.pad*1.6, L.ps*1.05, PENCIL);
  }
  return h;
}

/* ---------- what the slips say ---------- */
/* The five steps, with the one you are on opened up into its parts. Rooms ask
   for this and hang it on their own wall. */
export function workSlip(w: number, foot = true): Slip {
  const nowI = stepNow();
  return {
    w, title:tr('这一趟'), seed:5, foot: foot ? voyageLine() : undefined,
    rows: STEPS.map((s, i) => ({
      name: s.name,
      state: (s.done() ? 'done' : i === nowI ? 'now' : 'todo') as SlipRow['state'],
      tag: i === nowI ? s.at : undefined,
      tagBelow: true,
      parts: i === nowI ? s.parts.map(p => ({ name:p.name, done:p.done() })) : undefined
    }))
  };
}
/* The round drawn out: the four places on one lane, the ones whose lamp is
   burning ringed, and an arrow down at wherever the ship is headed. */
function roundSketch(c, x, y, w){
  const n = PORT_ORDER.length, pad = w*.12, step = (w - pad*2)/(n - 1), ly = y + w*.1;
  penLine(c, x + pad*.5, ly, x + w - pad*.5, ly, 1.5, PENCIL, 41, .022);
  PORT_ORDER.forEach((id, i) => {
    const px = x + pad + i*step, st = orderState(id);
    if (st === 'done'){ flat(c, cc => ell(cc, px, ly, 3.2, 3.2), MARK); penRing(c, px, ly, 7.4, 6.6, MARK, 60 + i*9, 1.4); return; }
    if (st === 'now'){
      flat(c, cc => ell(cc, px, ly, 3.4, 3.4), INK);
      c.save(); c.translate(px, ly - 17); c.rotate(Math.PI/2); penArrow(c, 0, 0, 10, MARK, 70 + i, 1.5); c.restore(); return;
    }
    flat(c, cc => ell(cc, px, ly, 2.6, 2.6), st === 'taken' ? PENCIL : FADE);
  });
}
/* The round: one line per place that has asked, and what the ship owes it. */
export function voyageSlip(w: number): Slip {
  return {
    w, title:tr('目的地'), seed:19,
    head: tr('第 {0} 夜', Math.max(1, G.nights.length)),
    rows: PORT_ORDER.map(id => {
      const st = orderState(id);
      return { name: tr(PORTS[id].name), state: (st === 'done' ? 'done' : st === 'now' ? 'now' : 'todo') as SlipRow['state'], tag: orderWord(id), tagBelow: true };
    }),
    sketch: { h: w*.2, draw: roundSketch },
    foot: G.calls.length ? tr('送出 {0} 盏灯', G.calls.length) : undefined
  };
}

/* Hangs the work slip on the wall of whatever room is painting, with its hit
   region, so a room asks for it in one line. The caller sets the layer. */
export function hangSlip(c, x, y, w, rot = 0){
  const s = workSlip(w);
  c.save(); c.translate(x, y); c.rotate(rot);
  /* a long room can have the slip well off the side of the window */
  const t = (c as any).getTransform ? (c as any).getTransform() : null;
  if (t && (Math.max(t.e, t.e + t.a*w) < -40 || Math.min(t.e, t.e + t.a*w) > CW + 40)){ c.restore(); return 0; }
  const h = drawSlip(c, s);
  hit(c, 'ui:work', ['r', -7, -7, w + 14, h + 14], { label:tr('这一趟'), key:'work' });
  c.restore();
  return h;
}
ACT['ui:work'] = { tap(){ AU.paper(); const h = stepHint(); say(h || tr('这一趟做完了。电台室会有下一张单子。')); } };
