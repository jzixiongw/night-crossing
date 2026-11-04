import { CROSSING, HUB, LANES, LANE_OF, pathAt, routePath, type Pt } from '../data/chart.ts';

/* ================= THE VOYAGE, READ OFF THE SAVE =================
   One answer to "where is the ship, and what is outside it", for everything
   that shows it: the sea chart, the course sign, the windows on the bridge
   and the ring, the porthole by the gangway door, the voyage record. Nothing
   here keeps its own clock. It reads G.call, G.calls and G.wake against the
   time it is given, so a reload, a closed tab or a sped-up dev clock land on
   the same picture.

   Like state/journey.ts it takes the save and the time as arguments and
   imports no DOM, so tools/voyage.test.mjs can run it under Node.

   A call goes through these, in order:
     under way    eta in the future; the place grows from a speck to a shape
     alongside    docked; the door can be opened
     handed over  call.gave; the one at the door takes the lamp somewhere
     door shut    call.shut; the gangway door has been closed behind it
     casting off  castAt(); the place falls astern over PART_MS
     wake         the call is gone; G.wake keeps the place as a light behind
                  the ship for WAKE_MS more */

const MIN = 60000;
export const DOOR_S = 3.2;          // seconds the gangway door takes to close
export const PART_MS = 36000;       // from casting off until the call is finished
export const WAKE_MS = 6*MIN;       // how long the place stays a light astern

/* How each of the four takes the lamp and carries it off, in seconds. The
   timeline after the handover is steady -> turn -> walk -> place; `wait` and
   `come` are before it, once the door is open; `ready` is how long they take
   to get a grip after you hold it out. */
export interface Hand { wait: number; come: number; ready: number; steady: number; turn: number; walk: number; place: number; wobble: number }
export const HAND: Record<string, Hand> = {
  /* slow, and says so: a long reach, a wobble, a long walk to the old post */
  dock: { wait: .8, come: 4.4, ready: 1.8, steady: 2.4, turn: 1.8, walk: 9.5, place: 3.4, wobble: .2 },
  /* hears you late: stands still a while before coming over */
  echo: { wait: 2.6, come: 3.0, ready: 1.2, steady: 1.2, turn: 1.4, walk: 5.5, place: 2.6, wobble: .12 },
  /* short, and quick about it; then a long bend down to the foot of the bell */
  bell: { wait: .9, come: 2.6, ready: .8, steady: 1.0, turn: 1.0, walk: 4.6, place: 4.4, wobble: .08 },
  /* steady hands; walks straight back through their own door */
  ship: { wait: .6, come: 2.2, ready: .6, steady: .8, turn: .9, walk: 6.4, place: 3.4, wobble: .05 }
};
export function handOf(id: string){
  const h = HAND[id] || HAND.dock, a = h.steady, b = a + h.turn, c = b + h.walk, d = c + h.place;
  return { ...h, tSteady: a, tTurn: b, tWalk: c, arrive: d, auto: d + 8 };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { x = clamp01(x); return x*x*(3 - 2*x); };

/* ---------- the crossing ---------- */
/* Where a call set out from: a port id, or 'hub' on the first night. Saves
   from before `from` existed infer it from the last place a lamp was left. */
export function callFrom(save: any, call = save.call): string {
  if (!call) return 'hub';
  if (call.from) return call.from;
  const prev = (save.calls || []).filter((c: any) => c.id !== call.to);
  return prev.length ? prev[prev.length - 1].id : 'hub';
}
export function callDep(call: any): number {
  if (call.dep) return call.dep;
  return (call.eta || 0) - (CROSSING[call.to] || 2)*MIN;
}
/* 0 at the moment the course was set, 1 alongside. */
export function progress(save: any, t: number, call = save.call): number {
  if (!call) return 0;
  if (call.docked) return 1;
  if (!call.eta) return 0;
  const d = callDep(call);
  return clamp01((t - d)/Math.max(1, call.eta - d));
}

/* ---------- after the handover ---------- */
/* When the ship actually casts off: once the door is shut and the one who
   took the lamp has got where they were going. 0 while either is pending. */
export function castAt(call: any): number {
  if (!call || !call.gave || !call.shut) return 0;
  return Math.max(call.shut + DOOR_S*1000, call.gave + handOf(call.to).arrive*1000 + 1500);
}
/* Where the one at the door is in carrying the lamp off, each part 0..1. */
export function aftermath(call: any, t: number){
  if (!call || !call.gave) return null;
  const h = handOf(call.to), s = Math.max(0, (t - call.gave)/1000);
  return { s, h,
    steady: clamp01(s/h.tSteady), turn: clamp01((s - h.tSteady)/h.turn),
    walk: clamp01((s - h.tTurn)/h.walk), place: clamp01((s - h.tWalk)/h.place), arrived: s >= h.arrive };
}
/* How lit a place is by the lamp left there: 0 before, 1 once it is set
   down; the place where it is being set down right now comes up with it. */
export function litK(save: any, id: string, t: number): number {
  const c = save.call;
  if (c && c.to === id && c.gave){ const a = aftermath(c, t); return a ? ease(a.place) : 0; }
  return (save.calls || []).some((k: any) => k.id === id) ? 1 : 0;
}

/* The last place the ship left, for the light it keeps astern. Older saves
   have no G.wake; their last delivery stands in for it. */
export function wakeOf(save: any): { id: string; at: number } | null {
  if (save.wake && save.wake.id) return save.wake;
  const last = (save.calls || [])[save.calls.length - 1];
  return last && last.id ? { id: last.id, at: (last.at || 0) + 60000 } : null;
}

/* ---------- what is outside ---------- */
/* Every place near enough to show. `k` is nearness: 0 a speck on the horizon,
   1 alongside. `vis` fades a speck in as it first rises. `drift` grows as a
   place falls astern, so a view can let it slide back as well as shrink. */
export interface Sight { id: string; k: number; vis: number; phase: 'approach' | 'docked' | 'parting' | 'wake'; lit: number; drift: number }
export function sights(save: any, t: number): Sight[] {
  const out: Sight[] = [], c = save.call;
  if (c && LANE_OF[c.to]){
    if (!c.docked){
      const q = progress(save, t, c);
      out.push({ id: c.to, k: Math.pow(q, 2.4), vis: ease((q - .03)/.15), phase: 'approach', lit: litK(save, c.to, t), drift: 0 });
    } else {
      const cast = castAt(c), p = cast ? clamp01((t - cast)/PART_MS) : 0;
      out.push({ id: c.to, k: 1 - .84*ease(p), vis: 1, phase: p > 0 ? 'parting' : 'docked', lit: litK(save, c.to, t), drift: p });
    }
  }
  const w = wakeOf(save);
  if (w && (!c || c.to !== w.id)){
    const p = (t - w.at - PART_MS)/WAKE_MS;
    if (p < 1) out.push({ id: w.id, k: .16*(1 - clamp01(p)), vis: 1 - ease(p*1.1 - .1), phase: 'wake', lit: 1, drift: 1 + clamp01(p) });
  }
  return out;
}

/* ---------- on the chart ---------- */
/* Where the ship is on the paper, which way it points, and the path it is on. */
export function shipOnChart(save: any, t: number): { x: number; y: number; dir: number; path: Pt[] | null; q: number; at: string | null } {
  const c = save.call;
  if (c && LANE_OF[c.to]){
    const path = routePath(callFrom(save, c), c.to), q = progress(save, t, c), a = pathAt(path, q);
    return { ...a, path, q, at: c.docked ? c.to : null };
  }
  const w = wakeOf(save);
  if (!w || !LANES[LANE_OF[w.id]]) return { x: HUB[0], y: HUB[1], dir: 0, path: null, q: 0, at: null };
  /* lying a little off the last place, back toward the junction */
  const back = LANES[LANE_OF[w.id]].slice().reverse(), a = pathAt(back, .1);
  return { ...a, path: null, q: 0, at: null };
}
/* The legs already sailed, oldest first: junction -> first place -> next... */
export function pastLegs(save: any): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = []; let at = 'hub';
  for (const k of save.calls || []){
    if (!k || !LANE_OF[k.id]) continue;
    if (save.call && save.call.to === k.id) break;       // the leg being finished now is drawn as the current one
    out.push({ from: at, to: k.id }); at = k.id;
  }
  return out;
}
/* Places the ship has been alongside, delivered or not. */
export function visited(save: any): Set<string> {
  const s = new Set<string>((save.calls || []).map((k: any) => k.id));
  if (save.call && save.call.docked) s.add(save.call.to);
  return s;
}
