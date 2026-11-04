/* ================= THE CHART =================
   Where the four places are, in one set of numbers every view reads: the sea
   chart on the course board, the voyage record, and the outside of the ship.
   The 3D rooms do not get their own map of the world -- they ask this file
   where the ship is and how far along its lane, and place what they show from
   that.

   Chart units: a sheet 1000 wide and 640 tall, y down, the way the paper is
   drawn. The four lanes in data/index.ts run out from one junction in the
   middle, where the ship is on its first night; each place sits at the end of
   its own lane. Going from one place to another runs back to the junction and
   out again, which is how a chart with four spokes is read anyway.

   Lane lengths follow the crossing times in data/ports.ts (2, 4, 5 and 6
   minutes), so the nearest place on paper is the nearest by clock. */

export type Pt = [number, number];

export const CHART = { w: 1000, h: 640 };
export const HUB: Pt = [520, 352];

/* Each lane from the junction outward, ending on its port. */
export const LANES: Record<string, Pt[]> = {
  harbor: [HUB, [430, 420], [330, 480], [222, 500]],
  nebula: [HUB, [474, 262], [400, 196], [318, 164]],
  ring:   [HUB, [606, 452], [722, 524], [842, 540]],
  quiet:  [HUB, [628, 286], [740, 196], [858, 124]]
};
/* The port at the end of each lane. data/ports.ts says which lane is whose;
   this is only the other direction of that, kept here so the chart does not
   import the whole port table. */
export const LANE_OF: Record<string, string> = { dock: 'harbor', echo: 'nebula', bell: 'ring', ship: 'quiet' };
export const portPt = (id: string): Pt => { const L = LANES[LANE_OF[id]]; return L ? L[L.length - 1] : HUB; };

/* Things that are on the chart because the ship goes past them, not because
   anyone asked for anything there. `lane` is the one you have to have sailed
   to have seen it. */
export const SIGHTS: Record<string, { at: Pt; lane: string; r: number }> = {
  fog:    { at: [392, 214], lane: 'nebula', r: 92 },
  planet: { at: [684, 446], lane: 'ring',   r: 36 },
  stars:  { at: [742, 150], lane: 'quiet',  r: 70 }
};

/* The way from one place to another. `from` is a port id or 'hub'. */
export function routePath(from: string, to: string): Pt[] {
  const out = LANES[LANE_OF[to]];
  if (!out) return [HUB];
  if (!from || from === 'hub' || !LANE_OF[from]) return out.slice();
  if (from === to) return [portPt(to)];
  const back = LANES[LANE_OF[from]].slice().reverse();
  return [...back, ...out.slice(1)];
}

export function pathLen(p: Pt[]){ let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i-1][0], p[i][1] - p[i-1][1]); return L; }

/* The point `q` (0..1) of the way along a path, and which way it is facing. */
export function pathAt(p: Pt[], q: number): { x: number; y: number; dir: number } {
  if (p.length < 2) return { x: p[0][0], y: p[0][1], dir: 0 };
  const total = pathLen(p); let d = Math.max(0, Math.min(1, q))*total;
  for (let i = 1; i < p.length; i++){
    const a = p[i-1], b = p[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= L || i === p.length - 1){ const t = L ? Math.min(1, d/L) : 0; return { x: a[0] + (b[0] - a[0])*t, y: a[1] + (b[1] - a[1])*t, dir: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    d -= L;
  }
  const b = p[p.length - 1]; return { x: b[0], y: b[1], dir: 0 };
}

/* The first `q` of a path, as its own path: the part already sailed. */
export function pathHead(p: Pt[], q: number): Pt[] {
  if (p.length < 2) return p.slice();
  const total = pathLen(p); let d = Math.max(0, Math.min(1, q))*total; const out: Pt[] = [p[0]];
  for (let i = 1; i < p.length; i++){
    const a = p[i-1], b = p[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d >= L){ out.push(b); d -= L; continue; }
    const t = L ? d/L : 0; out.push([a[0] + (b[0] - a[0])*t, a[1] + (b[1] - a[1])*t]); break;
  }
  return out;
}

/* Real crossing time from the junction, in minutes. data/ports.ts reads its
   `mins` from here, so the clock and the paper cannot disagree. */
export const CROSSING: Record<string, number> = { dock: 2, echo: 4, bell: 5, ship: 6 };
