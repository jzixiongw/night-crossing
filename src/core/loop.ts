import { tr } from '../i18n';
import { updateMusic } from '../audio/music';
import { render } from './render';
import { QUAL, resize, setQual } from './surface';
import { $, hhmm } from './util';
import { galleyTick } from '../rooms/galley';
import { radioTick } from '../rooms/radio';
import { ROOMS } from '../rooms/registry';
import { advance, liveEvents } from '../state/progress';
import { PR, S } from '../state/runtime';
import { SV, persist } from '../state/save';
import { G } from '../state/store';
import { now } from '../state/time';
import { CAM, clampPan } from './camera';

/* ================= MAIN LOOP ================= */
export let lastT = performance.now(), statusT = 0, saveT = 0;
export const PERF = { acc:0, n:0, t:0, cool:0 };
export function frame(tnow){
  const raw = (tnow - lastT)/1000, dt = Math.min(.05, raw); lastT = tnow; S.T += dt;
  PR.speed *= Math.exp(-dt*5); PR.stillT += dt; PR.idleT += dt;
  // adaptive resolution: if frames are slow for a while, render fewer pixels
  if (PR.visible && raw < .5){ PERF.acc += raw; PERF.n++; PERF.t += raw;
    if (PERF.t > 2.5){ const avg = PERF.acc/PERF.n; PERF.acc = PERF.n = PERF.t = 0; PERF.cool -= 1;
      if (avg > .028 && QUAL > .5 && PERF.cool <= 0){ setQual(Math.max(.5, QUAL*.84)); PERF.cool = 2; resize(true); } } }
  const R = ROOMS[S.room];
  if (S.started){
    S.run += dt;
    if (G.speed > 1) G.skew += dt*1000*(G.speed - 1);
    try {
      liveEvents(advance(dt*1000*G.speed, PR.focused ? 'here' : 'companion'));
      galleyTick(dt); S.lastRadio = radioTick(dt);
      R && R.update && R.update(dt);
    } catch(err){ console.error(err); }
    statusT -= dt; if (statusT <= 0){ statusT = 1;
      $('#stNight').textContent = tr('第 {0} 夜', Math.max(1,G.nights.length));
      $('#stClock').textContent = tr('舱时 ') + hhmm(now()) + (G.speed > 1 ? tr(' · 时间 ×') + G.speed : '');
      $('#stPresence').innerHTML = PR.focused ? '' : tr('<i>你在忙，船在走</i>');
      G.sessionsMin += 1/60;
    }
    saveT -= dt; if (saveT <= 0 || (SV.dirty && Date.now() - SV.lastLocal > 4000)){ saveT = 15; persist(false); }
  } else {
    S.lampV += (-7*S.lampA - 1.1*S.lampV + Math.cos(S.T*.55)*.6)*dt; S.lampA += S.lampV*dt;
  }
  // camera: pointer parallax, slow idle drift, zoom easing
  if (S.T - CAM.last > 4){ CAM.tx = Math.sin(S.T*.07)*.35; CAM.ty = Math.cos(S.T*.05)*.2; }
  const f = 1 - Math.exp(-dt*2.2); CAM.px += (CAM.tx - CAM.px)*f; CAM.py += (CAM.ty - CAM.py)*f;
  const zt = S.zoomOverride ?? (R && R.zoom ? R.zoom() : 1); CAM.zoom += (zt - CAM.zoom)*(1 - Math.exp(-dt*(S.zoomOverride ? 4 : 2.4)));
  /* The player's own view. A drag writes the target and lets go; this is what
     makes a flick settle instead of stopping where the finger stopped. */
  if (!(S.drag && S.drag.view)) clampPan();
  const vf = 1 - Math.exp(-dt*(S.drag && S.drag.view ? 22 : 7));
  CAM.panX += (CAM.tpanX - CAM.panX)*vf; CAM.panY += (CAM.tpanY - CAM.panY)*vf;
  CAM.user += (CAM.tuser - CAM.user)*(1 - Math.exp(-dt*9));
  for (let i=S.anims.length-1;i>=0;i--){ const a = S.anims[i]; a.t += dt; const q = Math.min(1, a.t/a.dur); try { a.fn(q); } catch(e){} if (q >= 1){ S.anims.splice(i,1); a.done && a.done(); } }
  updateMusic(dt);
  if (PR.visible){ try { render(dt, R); } catch(err){ console.error(err); } }
  requestAnimationFrame(frame);
}
