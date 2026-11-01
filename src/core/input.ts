import { tr } from '../i18n';
import { CAM, cpt, lpM } from './camera';
import { HITS_PREV, focusables, hitAt, shapeCenter } from './hits';
import { P } from './shell';
import { CH, CW, cv } from './surface';
import { $, D2R, clamp, escapeHtml, lerp, mod, stage } from './util';
import { R_WB, nearestStation, standUp, walkStep } from '../rooms/corridor';
import { domeCtx } from '../rooms/dome';
import { setSpray } from '../rooms/green';
import { ACT, ROOMS, go } from '../rooms/registry';
import { PR, S } from '../state/runtime';
import { once, say } from '../ui/captions';
import { anyOpen, closePanels } from '../ui/panels';

/* ---------- pointer / keyboard dispatch over the canvas ---------- */
export function resolveAct(str){
  const parts = str.split(':');
  for (let n = parts.length; n >= 1; n--){ const key = parts.slice(0,n).join(':'); if (ACT[key]) return { h:ACT[key], args:parts.slice(n) }; }
  return null;
}
cv.addEventListener('pointerdown', e => {
  if (!S.started || S.trans || S.drag) return;
  if (e.button !== undefined && e.button !== 0) return;
  PR.idleT = 0; S.lastTouch = S.T; S.focusKey = null;
  const p = cpt(e), f = hitAt(p.X, p.Y);
  if (f){
    const r = resolveAct(f.h.act); if (!r) return;
    let ctrl = null;
    if (r.h.press) ctrl = r.h.press(r.args, e, f.p, f.h) || null;
    S.drag = { ctrl, r, x0:e.clientX, y0:e.clientY, moved:false, id:e.pointerId, h:f.h };
    try { cv.setPointerCapture(e.pointerId); } catch(_){}
    if (ctrl) e.preventDefault();
  } else if (S.room === 'corridor' && !S.sitting){
    S.drag = { ring:true, x0:e.clientX, y0:e.clientY, lx:e.clientX, lt:performance.now(), moved:false, id:e.pointerId };
    S.phiTarget = null; S.phiV = 0;
    try { cv.setPointerCapture(e.pointerId); } catch(_){}
    cv.style.cursor = 'grabbing';
  } else if (ROOMS[S.room].tapEmpty){ ROOMS[S.room].tapEmpty(e); }
});
cv.addEventListener('pointermove', e => {
  const d = S.drag;
  if (!d){ if (e.pointerType === 'mouse' && S.started){ const p = cpt(e), f = hitAt(p.X, p.Y); cv.style.cursor = (S.spray && S.room === 'green') ? 'crosshair' : f ? f.h.cur : (S.room === 'corridor' && !S.sitting ? 'grab' : 'default'); } return; }
  if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 7) d.moved = true;
  if (!d.ring && !d.ctrl && d.moved && S.room === 'corridor' && !S.sitting){ d.ring = true; d.lx = e.clientX; d.lt = performance.now(); S.phiTarget = null; S.phiV = 0; cv.style.cursor = 'grabbing'; }
  if (d.ring){
    const r = cv.getBoundingClientRect(), k = (1600 / r.width) / (R_WB*D2R);
    const dx = e.clientX - d.lx, tnow = performance.now(), dts = Math.max(.008, (tnow - d.lt)/1000);
    S.phi = mod(S.phi - dx*k, 360); S.phiV = lerp(S.phiV, -dx*k/dts, .35); d.lx = e.clientX; d.lt = tnow;
    return;
  }
  if (d.ctrl && d.ctrl.move) d.ctrl.move(e, lpM(d.h.m, e));
});
export function endDrag(e, cancel){
  const d = S.drag; if (!d) return; S.drag = null;
  if (d.ring){ cv.style.cursor = 'grab'; if (!d.moved){ S.phiV = 0; S.phiTarget = nearestStation().ang; } else if (Math.abs(S.phiV) < 6){ S.phiTarget = nearestStation().ang; } S.phiV = clamp(S.phiV, -160, 160); return; }
  const P = d.h ? lpM(d.h.m, e) : null;
  if (d.ctrl){ d.ctrl.up && d.ctrl.up(e, d.moved, cancel, P); return; }
  if (!cancel && !d.moved && d.r.h.tap){ try { d.r.h.tap(d.r.args, e, P, d.h); } catch(err){ console.error(err); } }
}
cv.addEventListener('pointerup', e => endDrag(e, false));
cv.addEventListener('pointercancel', e => endDrag(e, true));
cv.addEventListener('lostpointercapture', e => { if (S.drag && S.drag.id === e.pointerId) endDrag(e, true); });
cv.addEventListener('pointerleave', () => { CAM.tx = 0; CAM.ty = 0; });
stage.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = stage.getBoundingClientRect(); CAM.tx = ((e.clientX - r.left)/r.width - .5)*2; CAM.ty = ((e.clientY - r.top)/r.height - .5)*2; CAM.last = S.T; });

/* keyboard: Tab walks the touchable things in the current view, Enter uses them */
cv.addEventListener('keydown', e => {
  if (!S.started) return;
  if (e.key === 'Tab'){ const list = focusables(); if (!list.length) return; e.preventDefault();
    let i = list.findIndex(f => f.h.key === S.focusKey); i = i < 0 ? (e.shiftKey ? list.length-1 : 0) : mod(i + (e.shiftKey ? -1 : 1), list.length);
    S.focusKey = list[i].h.key; return; }
  if ((e.key === 'Enter' || e.key === ' ') && S.focusKey){ e.preventDefault();
    const h = HITS_PREV.find(x => x.key === S.focusKey); if (!h) return; const r = resolveAct(h.act); if (!r) return;
    const c0 = shapeCenter(h.shape); if (r.h.key) r.h.key(r.args); else if (r.h.tap) r.h.tap(r.args, null, { x:c0[0], y:c0[1] }, h); }
});
cv.addEventListener('blur', () => { S.focusKey = null; });
document.addEventListener('keydown', e => {
  if (!S.started) return;
  const tag = ((e.target as HTMLElement)?.tagName || '').toLowerCase(); if (tag === 'textarea' || tag === 'input') return;
  if (e.key === 'Escape'){ if (anyOpen()) closePanels(); else if (S.spray) setSpray(false); else if (S.pick){ S.pick = null; domeCtx(); } else if (S.sitting) standUp(); return; }
  if (S.room === 'corridor' && !anyOpen()){
    if (e.key === 'ArrowLeft'){ e.preventDefault(); walkStep(-1); }
    if (e.key === 'ArrowRight'){ e.preventDefault(); walkStep(1); }
  }
});
stage.addEventListener('wheel', e => {
  if (!S.started || S.room !== 'corridor' || anyOpen() || S.sitting) return;
  e.preventDefault(); const dv = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY);
  S.phiTarget = null; S.phi = mod(S.phi + dv*.03, 360); S.phiV = 0; clearTimeout(S.wheelT); S.wheelT = setTimeout(() => { S.phiTarget = nearestStation().ang; }, 260);
}, { passive:false });
$('#navL').onclick = () => walkStep(-1);
$('#navR').onclick = () => walkStep(1);
$('#back').onclick = () => go('corridor');

export function showHints(){
  const box = $('#hints'); box.innerHTML = '';
  if (S.room === 'corridor' && once('dragHint')) say(tr('按住环廊也能左右拖。'));
  const seen = new Set();
  focusables().forEach(({ h, X, Y }) => {
    if (seen.has(h.label)) return; seen.add(h.label);
    const d = document.createElement('div'); d.className = 'hint';
    d.style.left = (X/CW*100) + '%'; d.style.top = (Y/CH*100) + '%';
    d.innerHTML = `<i></i><span>${escapeHtml(h.label)}</span>`; box.appendChild(d);
  });
  if (S.room === 'corridor' && !S.sitting){ const d = document.createElement('div'); d.className = 'hint'; d.style.left = '50%'; d.style.top = '84%'; d.innerHTML = tr('<i></i><span>沿环走 · 点圆点直达</span>'); box.appendChild(d); }
  setTimeout(() => box.querySelectorAll('.hint').forEach(h => h.classList.add('out')), 4200);
  setTimeout(() => { box.innerHTML = ''; }, 5200);
}
