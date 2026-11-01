import { tr } from '../i18n';
import { AU } from '../audio/index';
import { renderDough } from '../rooms/galley';
import { advance, liveEvents } from '../state/progress';
import { PR, S } from '../state/runtime';
import { persist } from '../state/save';
import { now } from '../state/time';
import { returnNotice } from '../ui/away';
import { say } from '../ui/captions';
import { updateMailbox } from '../ui/mail';

/* ================= PRESENCE ================= */
document.addEventListener('pointermove', e => {
  const t = performance.now();
  if (PR.lx != null){ const d = Math.hypot(e.clientX - PR.lx, e.clientY - PR.ly), dts = Math.max(8, t - PR.lt)/1000; PR.speed = PR.speed*.6 + (d/dts)*.4; }
  PR.lx = e.clientX; PR.ly = e.clientY; PR.lt = t; PR.cx = e.clientX; PR.cy = e.clientY;
  if (PR.speed > 25) PR.stillT = 0;
  PR.idleT = 0;
}, { passive:true });
document.addEventListener('keydown', () => { PR.idleT = 0; });
document.addEventListener('visibilitychange', () => {
  PR.visible = document.visibilityState === 'visible'; AU.apply();
  if (!S.started) return;
  if (!PR.visible){ S.hiddenAt = now(); persist(true); }
  else if (S.hiddenAt){ const gap = now() - S.hiddenAt; S.hiddenAt = null; const ev = advance(gap, 'hidden'); liveEvents([]); updateMailbox(); renderDough(); returnNotice(gap, ev); }
});
window.addEventListener('blur', () => { PR.focused = false; S.blurAt = S.T; });
window.addEventListener('focus', () => {
  PR.focused = true;
  if (S.started && S.blurAt != null && S.T - S.blurAt > 90){ const mins = Math.round((S.T - S.blurAt)/60);
    say(mins >= 2 ? tr('你回来看了一眼。刚才的 {0} 分钟里，船一直在走。', mins) : tr('你回来看了一眼。')); }
  S.blurAt = null;
});
window.addEventListener('pagehide', () => persist(true));
