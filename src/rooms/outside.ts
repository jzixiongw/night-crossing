import { AU } from '../audio/index';
import { S } from '../state/runtime';
import { G } from '../state/store';
import { now } from '../state/time';
import { sights, type Sight } from '../state/voyage';

/* ================= OUTSIDE THE HULL, THIS FRAME =================
   state/voyage.ts says what is out there from the save; this keeps the few
   things that have to ease rather than jump -- how settled the ship is
   against a place (dockK), and so how much it still rolls (sway) -- and
   plays what the ship sounds like from inside while it happens: the engines
   dropping to a murmur alongside, the place's own sound coming through the
   hull, the bump of coming alongside. Runs from the main loop, every room.

   The windows on the bridge, the ring and by the gangway door all read
   OUT.list, so the same place is in the same state in each of them. */

export const OUT = { list: [] as Sight[], dockK: 0, sway: 1, near: null as Sight | null };

/* what each place sounds like through the hull: filter, frequency, Q, level, and how it breathes */
const BED: Record<string, { type: BiquadFilterType; f: number; q: number; v: number; rate: number; depth: number }> = {
  dock: { type: 'lowpass', f: 420, q: .7, v: .05, rate: 1.1, depth: .7 },      // water against the pilings
  echo: { type: 'bandpass', f: 900, q: 2.5, v: .02, rate: .35, depth: .4 },    // a thin ringing, far off
  bell: { type: 'highpass', f: 2200, q: .3, v: .025, rate: .22, depth: .6 },   // wind across the ice
  ship: { type: 'lowpass', f: 120, q: .5, v: .07, rate: .1, depth: .15 }       // someone else's engines
};
const HUM = (r: string) => r === 'dome' ? .1 : r === 'corridor' ? .22 : .18;
const NEAR = (r: string) => r === 'hatch' ? .45 + .55*(S.doorK || 0) : r === 'corridor' ? .3 : r === 'cabin' ? .22 : .1;

let acc = 0, wasDocked: boolean | null = null, nextPing = 0, bedId = '';
export function outsideTick(dt: number){
  const t = now();
  OUT.list = sights(G, t);
  OUT.near = OUT.list.find(s => s.phase === 'docked' || s.phase === 'parting') || null;
  const target = OUT.near ? OUT.near.k : 0;
  OUT.dockK += (target - OUT.dockK)*(1 - Math.exp(-dt*.7));
  OUT.sway = 1 - .78*OUT.dockK;

  const d = !!(G.call && G.call.docked);
  if (wasDocked === false && d) AU.berth();
  wasDocked = d;

  acc += dt; if (acc < .2) return; acc = 0;
  if (!AU.ready) return;
  const room = S.room, ct = AU.ctx.currentTime;
  /* the engines: a murmur while alongside, back up as the place falls astern */
  AU.hum.gain.setTargetAtTime(HUM(room)*(1 - .6*OUT.dockK), ct, 1.2);
  const n = OUT.near, B = n ? BED[n.id] : null;
  if (B){
    if (bedId !== n.id){ bedId = n.id; AU.portF.type = B.type; AU.portF.frequency.setTargetAtTime(B.f, ct, .5); AU.portF.Q.value = B.q; }
    const breath = 1 - B.depth*.5 + B.depth*.5*Math.sin(S.T*B.rate*Math.PI*2);
    AU.portG.gain.setTargetAtTime(B.v*NEAR(room)*OUT.dockK*breath, ct, .3);
    /* the buoy gives back what it hears, a while later */
    if (n.id === 'echo' && S.T > nextPing && OUT.dockK > .5){ nextPing = S.T + 9 + Math.random()*6; const v = .02*NEAR(room);
      AU.bell(93, v); AU.bell(93, v*.5, 1.6); AU.bell(93, v*.25, 3.2); }
  } else AU.portG.gain.setTargetAtTime(0, ct, .6);
}
