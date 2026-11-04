import { tr } from '../i18n';
import { $, escapeHtml, mulberry32, ymd } from '../core/util';
import { penLine, penRing, penStroke } from '../core/pen';
import { CHART, HUB, LANES, SIGHTS, pathAt, pathHead, portPt, routePath, type Pt } from '../data/chart';
import { COL, ROUTES, SEEDS } from '../data/index';
import { PORTS, PORT_ORDER } from '../data/ports';
import { G } from '../state/store';
import { now } from '../state/time';
import { markDirty } from '../state/save';
import { pastLegs, shipOnChart, visited } from '../state/voyage';
import { AU } from '../audio/index';
import { PEN, penPaths } from './paper';

/* ================= THE SEA CHART =================
   The course board, drawn out as the chart it always stood for: the four
   places at the ends of their four lanes, the water each lane runs through,
   the line the ship has already drawn across it and the one it is drawing
   now. It is the same paper and the same pens as the slips on the walls
   (core/pen.ts, recorded by ui/paper.ts), so every line is a filled ribbon.

   Not to be confused with #ringMap, the little ellipse in the HUD, which is
   the ship's own corridor. This is the world outside it.

   Read-only except for one thing: a place you have been to (or a thing you
   have sailed past) takes a pencil mark when tapped, and gives it back when
   tapped again. The marks are G.marks, so the chart keeps them.

   Everything is read off the save through state/voyage.ts, the same numbers
   the windows use, so the chart and the view outside cannot disagree. */

const W = CHART.w, H = CHART.h;
const C = { ink: PEN.ink, pencil: PEN.pencil, ochre: PEN.ochre, teal: PEN.teal, amber: PEN.amber, rose: PEN.rose, paper: '#e8dcc2', wash: '#d9cba9' };

/* A path through points, as one filled pen ribbon, seeded so it never boils. */
function inkPath(c: any, pts: Pt[], w: number, col: string, seed: number, a = 1, wob = 1.2){
  if (pts.length < 2) return;
  const r = mulberry32(seed), out: Pt[] = [];
  for (let i = 1; i < pts.length; i++){
    const [x0, y0] = pts[i-1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(L/14));
    for (let k = i === 1 ? 0 : 1; k <= n; k++){ const t = k/n; out.push([x0 + (x1 - x0)*t + (r() - .5)*wob, y0 + (y1 - y0)*t + (r() - .5)*wob]); }
  }
  penStroke(c, out, w, col, a, .7);
}
/* The same, broken into dashes: the part of the way not sailed yet. */
function dashPath(c: any, pts: Pt[], w: number, col: string, seed: number, a = 1){
  const r = mulberry32(seed); let carry = 0, on = true;
  for (let i = 1; i < pts.length; i++){
    const [x0, y0] = pts[i-1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0);
    let d = 0;
    while (d < L){
      const seg = Math.min(L - d, (on ? 13 : 9) - carry), t0 = d/L, t1 = (d + seg)/L;
      if (on && seg > 2) penStroke(c, [[x0 + (x1 - x0)*t0, y0 + (y1 - y0)*t0], [x0 + (x1 - x0)*(t0 + t1)/2 + (r() - .5), y0 + (y1 - y0)*(t0 + t1)/2 + (r() - .5)], [x0 + (x1 - x0)*t1, y0 + (y1 - y0)*t1]], w, col, a, .5);
      d += seg; carry += seg; if (carry >= (on ? 13 : 9) - .01){ carry = 0; on = !on; }
    }
  }
}
/* A pencil star: the mark a hand leaves on a chart to say "this one". */
function penStar(c: any, x: number, y: number, s: number, col: string, seed: number){
  const r = mulberry32(seed + 31);
  for (let k = 0; k < 3; k++){ const a = k*Math.PI/3 + (r() - .5)*.25 + .2, dx = Math.cos(a)*s, dy = Math.sin(a)*s;
    penLine(c, x - dx, y - dy, x + dx, y + dy, 1.9, col, seed + k, .02); }
}
const txt = (x: number, y: number, s: string, cls: string, o: { anchor?: string; rot?: number } = {}) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${cls}" text-anchor="${o.anchor || 'middle'}"${o.rot ? ` transform="rotate(${o.rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''}>${escapeHtml(s)}</text>`;

/* Who has asked: a place is inked once it has asked, pencilled before. */
function asked(id: string){ return G.slips.includes(id) || G.printed === id || (G.call && G.call.to === id) || G.calls.some(k => k.id === id); }
export function markable(id: string){
  if (PORTS[id]) return visited(G).has(id);
  const s = SIGHTS[id]; return !!s && (G.visited || []).includes(s.lane) && (G.calls.length > 0 || (G.call && G.call.dep && now() - G.call.dep > 30000));
}
export function etaText(ms: number){ const m = Math.ceil(ms/60000); return m <= 1 ? tr('快到了') : tr('还有 {0} 分钟', m); }

/* ---------- the sheet ---------- */
export function chartSVG(o: { mini?: boolean } = {}): string {
  const t = now(), mini = !!o.mini, ship = shipOnChart(G, t), seen = visited(G), u = mini ? 'm' : 'p';
  const parts: string[] = [];
  const pen = (draw: (c: any) => void) => parts.push(penPaths(draw));

  /* the grid, faint, the way a printed chart carries one under the ink */
  pen(c => { for (let x = 100; x < W; x += 100) penLine(c, x, 14, x + 2, H - 14, .7, C.pencil, x, .002, .22);
             for (let y = 80; y < H; y += 80) penLine(c, 14, y, W - 14, y + 1.5, .7, C.pencil, y + 7, .002, .22); });

  /* the water each lane runs through */
  parts.push(`<ellipse cx="${SIGHTS.fog.at[0]}" cy="${SIGHTS.fog.at[1]}" rx="150" ry="96" fill="url(#${u}Fog)"/>`);
  parts.push(`<ellipse cx="${SIGHTS.fog.at[0] + 40}" cy="${SIGHTS.fog.at[1] + 30}" rx="90" ry="54" fill="url(#${u}FogR)"/>`);
  /* the coast the harbour lane comes off, hatched on the land side */
  const coast: Pt[] = [[14, 392], [70, 420], [112, 470], [160, 516], [214, 540], [290, 556], [370, 588], [432, 626]];
  parts.push(`<path d="M14 392 ${coast.map(p => 'L' + p[0] + ' ' + p[1]).join(' ')} L432 640 L14 640 Z" fill="${C.wash}" fill-opacity=".55"/>`);
  pen(c => { inkPath(c, coast, 2.2, C.ink, 4, .75, 1.6);
    const r = mulberry32(12); for (let i = 0; i < 22; i++){ const q = pathAt(coast, i/22), L = 8 + r()*8; penLine(c, q.x, q.y + 6, q.x - L*.6, q.y + 6 + L, .9, C.pencil, i + 40, .01, .5); } });
  /* the ringed planet nobody named: An drew a circle round it, and so does this */
  pen(c => { const [x, y] = SIGHTS.planet.at; penRing(c, x, y, 30, 30, C.pencil, 17, 1.4, .8);
    const pts: Pt[] = []; for (let i = 0; i <= 40; i++){ const a = Math.PI*.06 + i/40*Math.PI*1.88; pts.push([x + Math.cos(a)*58, y + Math.sin(a)*13]); }
    const rot = -.2, cs = Math.cos(rot), sn = Math.sin(rot); penStroke(c, pts.map(([px, py]) => [x + (px - x)*cs - (py - y)*sn, y + (px - x)*sn + (py - y)*cs] as Pt), 1.2, C.pencil, .7, .4); });
  /* the quiet stretch: no beacons, and more stars than anywhere */
  { const r = mulberry32(77), [sx, sy] = SIGHTS.stars.at;
    for (let i = 0; i < (mini ? 26 : 46); i++){ const a = r()*Math.PI*2, d = Math.sqrt(r())*SIGHTS.stars.r;
      parts.push(`<circle cx="${(sx + Math.cos(a)*d*1.3).toFixed(1)}" cy="${(sy + Math.sin(a)*d*.8).toFixed(1)}" r="${(.7 + r()*1.3).toFixed(2)}" fill="${C.pencil}" fill-opacity="${(.35 + r()*.4).toFixed(2)}"/>`); } }

  /* the four lanes, in ink, and the beacons on them in their own colours */
  for (const [lane, pts] of Object.entries(LANES)){
    pen(c => inkPath(c, pts, 2.2, C.ink, lane.length*13, .55));
    const cols = ROUTES[lane].colors;
    cols.forEach((cl: string, i: number) => { const p = pathAt(pts, (i + 1)/(cols.length + 1));
      parts.push(`<circle cx="${(p.x + 8).toFixed(1)}" cy="${(p.y - 7).toFixed(1)}" r="3.6" fill="${COL[cl].hex}" stroke="${C.ink}" stroke-opacity=".5" stroke-width="1"/>`); });
    if (!mini){ const m = pathAt(pts, .42), deg = m.dir*180/Math.PI, up = deg > 90 || deg < -90 ? deg + 180 : deg;
      parts.push(txt(m.x - Math.sin(m.dir)*14, m.y + Math.cos(m.dir)*14 + 4, tr(ROUTES[lane].name), 'c-lane', { rot: up })); }
  }
  /* the junction */
  pen(c => { penRing(c, HUB[0], HUB[1], 7, 7, C.ink, 5, 1.6); penLine(c, HUB[0] - 13, HUB[1], HUB[0] + 13, HUB[1], 1, C.ink, 6, .01, .6); penLine(c, HUB[0], HUB[1] - 13, HUB[0], HUB[1] + 13, 1, C.ink, 7, .01, .6); });

  /* where the ship has been: each finished leg in pencil, a hair apart */
  pastLegs(G).forEach((leg, i) => {
    const p = routePath(leg.from, leg.to).map(([x, y]) => [x + (i % 3 - 1)*2.4, y + (i % 2 ? 2 : -2)] as Pt);
    pen(c => inkPath(c, p, 3.4, C.pencil, 90 + i*7, .7, 2));
  });
  /* where it is going: sailed in red pencil, the rest dashed */
  if (ship.path){
    const head = pathHead(ship.path, ship.q), tail = [[ship.x, ship.y] as Pt, ...ship.path.slice(head.length)];
    pen(c => { if (head.length > 1 && ship.q > .005) inkPath(c, [...head.slice(0, -1), [ship.x, ship.y]], 4, C.ochre, 141, .95, 1.4);
               if (ship.q < .995) dashPath(c, tail, 3, C.ochre, 142, .75); });
  }

  /* the places */
  for (const id of PORT_ORDER){
    const P = PORTS[id], [x, y] = portPt(id), on = asked(id), been = seen.has(id), gave = G.calls.filter(k => k.id === id);
    const col = on ? C.ink : C.pencil, a = on ? .95 : .55;
    if (gave.length){
      /* the lamp that was left there, still burning */
      const sp = SEEDS[gave[gave.length - 1].sp], hue = sp ? sp.color : '#ffd9a3';
      parts.push(`<circle cx="${x}" cy="${y}" r="26" fill="url(#${u}Lamp-${id})"/><defs><radialGradient id="${u}Lamp-${id}"><stop offset="0" stop-color="${hue}" stop-opacity=".95"/><stop offset=".35" stop-color="${C.amber}" stop-opacity=".45"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient></defs>`);
      parts.push(`<circle cx="${x}" cy="${y}" r="4.2" fill="#fff4d8" stroke="${C.ochre}" stroke-width="1"/>`);
    }
    pen(c => {
      if (id === 'dock'){ penLine(c, x - 14, y + 4, x + 12, y + 4, 2.2, col, 51, .01, a); for (const dx of [-9, 0, 9]) penLine(c, x + dx, y + 4, x + dx, y + 13, 1.5, col, 52 + dx, .01, a);
                          penLine(c, x + 9, y + 4, x + 9, y - 14, 1.4, col, 55, .01, a); penRing(c, x + 9, y - 17, 3, 3, col, 56, 1.2, a); }
      else if (id === 'echo'){ penRing(c, x, y, 9, 9, col, 61, 1.8, a); penRing(c, x, y, 15, 15, col, 62, 1, a*.6); }
      else if (id === 'bell'){ penStroke(c, [[x - 10, y + 8], [x - 8, y - 2], [x - 5, y - 9], [x, y - 11], [x + 5, y - 9], [x + 8, y - 2], [x + 10, y + 8]], 1.8, col, a, .5);
                               penLine(c, x - 12, y + 8, x + 12, y + 8, 1.6, col, 71, .01, a); }
      else { penStroke(c, [[x - 15, y + 2], [x - 10, y + 7], [x + 10, y + 7], [x + 16, y]], 1.9, col, a, .5); penLine(c, x - 12, y + 1, x + 13, y, 1.3, col, 81, .01, a);
             penLine(c, x - 2, y, x - 2, y - 11, 1.3, col, 82, .01, a); }
      if (been && !gave.length) penRing(c, x, y, 21, 19, C.teal, 91 + id.length, 1.8);
    });
    /* names sit away from the edge of the sheet: under the two low places,
       beside the high ones */
    const [lx, ly, anchor] = ({ dock: [x, y + 44, 'middle'], echo: [x - 24, y + 14, 'end'], bell: [x - 4, y + 44, 'middle'], ship: [x + 14, y + 44, 'end'] } as Record<string, [number, number, string]>)[id];
    parts.push(txt(lx, ly, tr(P.name), on ? 'c-port' : 'c-port c-dim', { anchor }));
    if (gave.length && !mini){ const k = gave[gave.length - 1], sp = SEEDS[k.sp];
      parts.push(txt(lx, ly + 27, (sp ? tr(sp.name) : '') + (k.at ? ' · ' + ymd(k.at).slice(5) : ''), 'c-note', { anchor })); }
  }
  /* sights, labelled only by being there */
  /* the player's own marks */
  for (const id of G.marks || []){
    const at = PORTS[id] ? portPt(id) : SIGHTS[id] ? SIGHTS[id].at : null; if (!at) continue;
    const dx = PORTS[id] ? 22 : SIGHTS[id].r*.55, dy = PORTS[id] ? -18 : -SIGHTS[id].r*.45;
    pen(c => penStar(c, at[0] + dx, at[1] + dy, 7.5, C.ink, id.length*19 + id.charCodeAt(0)));
  }

  /* the ship: a ring, because it is one, with a tick the way it is pointed */
  { const { x, y, dir } = ship;
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="17" fill="${C.paper}" fill-opacity=".85"/>`);
    pen(c => { penRing(c, x, y, 11, 11, C.ink, 3, 3.2); penRing(c, x, y, 2.6, 2.6, C.ink, 4, 4);
      if (ship.path && !ship.at) penStroke(c, [[x + Math.cos(dir)*14, y + Math.sin(dir)*14], [x + Math.cos(dir)*26, y + Math.sin(dir)*26]], 3, C.ink, 1, .5); });
    if (!mini && G.call && PORTS[G.call.to]){
      const label = G.call.docked ? tr('靠在 {0}', tr(PORTS[G.call.to].name)) : etaText(G.call.eta - t);
      const right = x < W - 260, bx = right ? x + 26 : x - 26;
      parts.push(`<g class="c-eta">${txt(bx, y - 18, label, 'c-ship', { anchor: right ? 'start' : 'end' })}</g>`);
    }
  }

  /* north, and the record taped to the corner */
  if (!mini){
    pen(c => { const x = 956, y = 600; penLine(c, x, y + 18, x, y - 20, 1.6, C.ink, 201, .01); penStroke(c, [[x - 6, y - 10], [x, y - 22], [x + 6, y - 10]], 1.6, C.ink, 1, .5); });
    parts.push(txt(956, 566, tr('北'), 'c-lane'));
    const rows = G.calls.slice(-4);
    if (rows.length){
      const x0 = 18, y0 = 22, w = 262, h = 44 + rows.length*28;
      parts.push(`<g class="c-tape" transform="rotate(-1.2 ${x0} ${y0})"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="2" fill="#f1e7cf" stroke="${C.pencil}" stroke-opacity=".25"/>`
        + `<rect x="${x0 + w/2 - 26}" y="${y0 - 9}" width="52" height="17" fill="#e6d7a8" fill-opacity=".72" transform="rotate(3 ${x0 + w/2} ${y0})"/>`
        + txt(x0 + 14, y0 + 30, tr('送出去的灯'), 'c-tape-h', { anchor: 'start' })
        + rows.map((k, i) => { const P = PORTS[k.id], sp = SEEDS[k.sp];
            return txt(x0 + 14, y0 + 60 + i*28, (P ? tr(P.name) : '') + (sp ? ' · ' + tr(sp.name) : '') + (k.at ? ' · ' + ymd(k.at).slice(5) : ''), 'c-tape-r', { anchor: 'start' }); }).join('')
        + `</g>`);
    }
  }

  const label = G.call && PORTS[G.call.to]
    ? (G.call.docked ? tr('航海图上，船靠在{0}。', tr(PORTS[G.call.to].name))
       : Math.ceil((G.call.eta - t)/60000) <= 1 ? tr('航海图上，船快到{0}了。', tr(PORTS[G.call.to].name))
       : tr('航海图上，船正往{0}去，还要大约 {1} 分钟。', tr(PORTS[G.call.to].name), Math.ceil((G.call.eta - t)/60000)))
    : tr('航海图上，船停在两段航程之间。');
  return `<svg class="seachart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(label)}" preserveAspectRatio="xMidYMid meet">`
    + `<defs><radialGradient id="${u}Fog"><stop offset="0" stop-color="#7fb6ae" stop-opacity=".42"/><stop offset="1" stop-color="#7fb6ae" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${u}FogR"><stop offset="0" stop-color="#d79a9a" stop-opacity=".3"/><stop offset="1" stop-color="#d79a9a" stop-opacity="0"/></radialGradient>`
    + `<filter id="${u}Fray" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5" result="n"/>`
    + `<feDisplacementMap in="SourceGraphic" in2="n" scale="1.1" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`
    + `<g filter="url(#${u}Fray)">${parts.join('')}</g></svg>`;
}

/* ---------- the panel ---------- */
let timer = 0;
/* `onSet` is the course board's own takeCall, passed in so this file does not
   reach back into rooms/cabin.ts. */
export function renderChart(onSet: (id: string) => void){
  const box = $('#seaChart'); if (!box) return;
  const paint = () => {
    box.querySelector('.seachart-svg')?.remove();
    box.insertAdjacentHTML('afterbegin', chartSVG());
  };
  paint();
  box.querySelectorAll('.chart-pin').forEach(b => b.remove());
  const offered = new Set<string>(G.slips);
  const pins: { id: string; at: Pt; r: number; label: string; kind: 'set' | 'mark' }[] = [];
  for (const id of PORT_ORDER){
    const P = PORTS[id];
    if (offered.has(id) && !(G.call && G.call.docked)) pins.push({ id, at: portPt(id), r: 30, label: tr('设定航向：{0}', tr(P.name)), kind: 'set' });
    else if (markable(id)) pins.push({ id, at: portPt(id), r: 30, label: (G.marks || []).includes(id) ? tr('擦掉{0}的记号', tr(P.name)) : tr('在{0}画个记号', tr(P.name)), kind: 'mark' });
  }
  const SIGHT_NAME: Record<string, string> = { fog: tr('粉青色的雾'), planet: tr('那颗带环的行星'), stars: tr('最密的那片星') };
  for (const id of Object.keys(SIGHTS)) if (markable(id))
    pins.push({ id, at: SIGHTS[id].at, r: SIGHTS[id].r*.7, label: (G.marks || []).includes(id) ? tr('擦掉{0}的记号', SIGHT_NAME[id]) : tr('在{0}画个记号', SIGHT_NAME[id]), kind: 'mark' });
  for (const p of pins){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chart-pin ' + p.kind; b.dataset.id = p.id;
    b.style.left = (p.at[0]/W*100) + '%'; b.style.top = (p.at[1]/H*100) + '%';
    b.style.setProperty('--r', (p.r/W*100*2) + '%');
    b.setAttribute('aria-label', p.label); b.title = p.label;
    if (p.kind === 'mark') b.setAttribute('aria-pressed', String((G.marks || []).includes(p.id)));
    b.addEventListener('click', () => {
      if (p.kind === 'set'){ onSet(p.id); return; }
      const m = G.marks || (G.marks = []), i = m.indexOf(p.id);
      if (i >= 0) m.splice(i, 1); else m.push(p.id);
      AU.scratch(); markDirty(); renderChart(onSet);
      (box.querySelector(`.chart-pin[data-id="${p.id}"]`) as HTMLElement)?.focus();
    });
    box.appendChild(b);
  }
  const hint = $('#chartHint');
  if (hint) hint.hidden = !pins.some(p => p.kind === 'mark');
  clearInterval(timer);
  timer = setInterval(() => { if (!document.contains(box) || box.closest('[hidden]')){ clearInterval(timer); timer = 0; return; } paint(); }, 1000) as any;
}
