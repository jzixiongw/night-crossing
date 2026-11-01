import { AU } from './index';
import { pick, rand } from '../core/util';
import { COL, ROUTES } from '../data/index';
import { bloomReady } from '../rooms/green';
import { PR, S } from '../state/runtime';
import { G } from '../state/store';

/* ================= MUSIC DIRECTOR ================= */
export const M = { next:0, idx:0, note:4, arp:2, gainT:-1 };
export const ROOM_BRIGHT = { corridor:1000, galley:1250, green:1400, radio:900, dome:1700 };
export function updateMusic(dt){
  if (!AU.ready || !S.started) return;
  const R = ROUTES[G.route];
  const bright = S.room === 'cabin' ? [950,1200,1550][G.lamp] : (ROOM_BRIGHT[S.room] || 1000);
  M.next -= dt; if (M.next <= 0){ AU.chord(R.chords[M.idx % R.chords.length], R.amp); M.idx++; M.next = R.dur; AU.lp.frequency.setTargetAtTime(bright*R.bright, AU.ctx.currentTime, 1.5); }
  const mg = (G.phones && S.room === 'radio' ? .3 : 1) * (PR.focused ? 1 : .7) * (G.radioOn && S.room === 'radio' ? .6 : 1);
  if (Math.abs(mg - M.gainT) > .01){ M.gainT = mg; AU.set(AU.music.gain, .85*mg, 1); AU.set(AU.bells.gain, mg, 1); }
  M.note -= dt; if (M.note <= 0){ if (R.scale.length) AU.bell(pick(R.scale), .035*(S.room === 'cabin' ? 1 : .6)); M.note = rand(R.gap[0], R.gap[1]); }
  if (G.bulbs.length){ M.arp -= dt; if (M.arp <= 0){ AU.bell(COL[pick(G.bulbs)].midi + pick([0,0,-12,12]), S.room === 'cabin' ? .04 : .02); M.arp = R.arp * rand(.8,1.2) * (1 + 2.5/(G.bulbs.length+1)); } }
  // blooming moon bells add a soft tone in the greenhouse
  if (S.room === 'green' && Math.random() < dt/9 && G.pots.some(p => p && p.sp === 'bell' && bloomReady(p))) AU.bell(pick([86,88,93]), .015);
}
