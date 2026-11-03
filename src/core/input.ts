import { tr } from '../i18n';
import { CAM, clampPan, cpt, resetView, scaleAt, setUserZoom, viewMoved } from './camera';
import { HITS_PREV, focusables, hitAt, localPt, shapeCenter } from './hits';
import { P } from './shell';
import { CH, CW, cv } from './surface';
import { $, D2R, clamp, escapeHtml, lerp, mod, stage } from './util';
import { PPD, nearestStation, standUp, walkStep } from '../rooms/corridor';
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

/* ================= FREE LOOK =================
   Dragging anywhere that is not a touchable thing swings the view across the
   room and tilts it; the wheel and a two-finger pinch push in. In the ring
   corridor the horizontal half of that drag still walks the ring, because
   walking is what horizontal means there, and only the tilt is new. */
export const PTS = new Map<number, { X: number; Y: number }>();
let pinch = null;

export function startViewDrag(e){
  const p = cpt(e);
  S.drag = { view:true, ring:S.room === 'corridor' && !S.sitting,
    x0:e.clientX, y0:e.clientY, lcx:e.clientX, lX:p.X, lY:p.Y,
    lt:performance.now(), moved:false, id:e.pointerId };
  if (S.drag.ring){ S.phiTarget = null; S.phiV = 0; }
  try { cv.setPointerCapture(e.pointerId); } catch(_){}
  cv.style.cursor = 'grabbing';
}
export function moveViewDrag(e){
  const d = S.drag, p = cpt(e), sc = scaleAt(1);
  if (d.ring){
    const r = cv.getBoundingClientRect(), k = (1600 / r.width) / PPD;
    const dx = e.clientX - d.lcx, tnow = performance.now(), dts = Math.max(.008, (tnow - d.lt)/1000);
    S.phi = mod(S.phi - dx*k, 360); S.phiV = lerp(S.phiV, -dx*k/dts, .35); d.lcx = e.clientX; d.lt = tnow;
  } else {
    /* A wide room is walked by dragging, so the drag keeps its speed: the
       release throws the target a little further and the loop eases into it,
       which is what turns a flick into a glide across the greenhouse. */
    const tnow = performance.now(), dts = Math.max(.008, (tnow - d.lt)/1000);
    d.vx = lerp(d.vx || 0, (p.X - d.lX)*sc/dts, .4);
    d.vy = lerp(d.vy || 0, (p.Y - d.lY)*sc/dts, .4);
    d.lt = tnow;
    CAM.tpanX += (p.X - d.lX)*sc;
  }
  CAM.tpanY += (p.Y - d.lY)*sc;
  clampPan();
  d.lX = p.X; d.lY = p.Y;
}
/* Two fingers: the distance between them is the zoom, the midpoint is the pan. */
function pinchStep(){
  const [a, b] = [...PTS.values()];
  const dist = Math.hypot(a.X - b.X, a.Y - b.Y), mx = (a.X + b.X)/2, my = (a.Y + b.Y)/2;
  if (!pinch){ pinch = { dist, mx, my, user:CAM.tuser }; return; }
  if (pinch.dist > 8) setUserZoom(pinch.user * (dist/pinch.dist));
  const sc = scaleAt(1);
  CAM.tpanX += (mx - pinch.mx)*sc; CAM.tpanY += (my - pinch.my)*sc;
  clampPan();
  pinch.mx = mx; pinch.my = my;
}

cv.addEventListener('pointerdown', e => {
  if (!S.started) return;
  PTS.set(e.pointerId, cpt(e));
  if (PTS.size === 2){ // a second finger turns whatever is happening into a pinch
    if (S.drag && S.drag.ctrl && S.drag.ctrl.up) S.drag.ctrl.up(e, true, true, null);
    S.drag = null; pinch = null; pinchStep(); return;
  }
  if (S.trans || S.drag) return;
  if (e.button !== undefined && e.button !== 0) return;
  PR.idleT = 0; S.lastTouch = S.T; S.focusKey = null;
  const p = cpt(e), f = hitAt(p.X, p.Y);
  if (f){
    const r = resolveAct(f.h.act); if (!r){ startViewDrag(e); return; }
    let ctrl = null;
    if (r.h.press) ctrl = r.h.press(r.args, e, f.p, f.h) || null;
    S.drag = { ctrl, r, x0:e.clientX, y0:e.clientY, lX:p.X, lY:p.Y, lcx:e.clientX, lt:performance.now(), moved:false, id:e.pointerId, h:f.h };
    try { cv.setPointerCapture(e.pointerId); } catch(_){}
    if (ctrl) e.preventDefault();
  } else startViewDrag(e);
});
cv.addEventListener('pointermove', e => {
  if (PTS.has(e.pointerId)) PTS.set(e.pointerId, cpt(e));
  if (PTS.size === 2){ pinchStep(); return; }
  const d = S.drag;
  if (!d){
    if (e.pointerType === 'mouse' && S.started){ const p = cpt(e), f = hitAt(p.X, p.Y);
      cv.style.cursor = (S.spray && S.room === 'green') ? 'crosshair' : f ? f.h.cur : 'grab'; }
    return;
  }
  if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 7) d.moved = true;
  /* A drag that started on something touchable, but on something with no drag
     of its own, becomes a view drag rather than nothing at all. */
  if (!d.view && !d.ctrl && d.moved){
    const p = cpt(e);
    S.drag = { view:true, ring:S.room === 'corridor' && !S.sitting, x0:d.x0, y0:d.y0,
      lcx:e.clientX, lX:p.X, lY:p.Y, lt:performance.now(), moved:true, id:d.id };
    if (S.drag.ring){ S.phiTarget = null; S.phiV = 0; }
    cv.style.cursor = 'grabbing';
    return;
  }
  if (d.view){ moveViewDrag(e); return; }
  if (d.ctrl && d.ctrl.move) d.ctrl.move(e, localPt(d.h, e));
});
export function endDrag(e, cancel){
  const d = S.drag; if (!d) return; S.drag = null;
  if (d.view){
    cv.style.cursor = 'grab';
    if (!d.ring && d.moved && !cancel){
      CAM.tpanX += clamp((d.vx || 0)*.14, -520, 520);
      CAM.tpanY += clamp((d.vy || 0)*.14, -240, 240);
      clampPan();
    }
    if (d.ring){
      if (!d.moved){ S.phiV = 0; S.phiTarget = nearestStation().ang; }
      else if (Math.abs(S.phiV) < 6){ S.phiTarget = nearestStation().ang; }
      S.phiV = clamp(S.phiV, -160, 160);
    }
    if (!d.moved && !cancel && ROOMS[S.room] && ROOMS[S.room].tapEmpty) ROOMS[S.room].tapEmpty(e);
    return;
  }
  const P = d.h ? localPt(d.h, e) : null;
  if (d.ctrl){ d.ctrl.up && d.ctrl.up(e, d.moved, cancel, P); return; }
  if (!cancel && !d.moved && d.r.h.tap){ try { d.r.h.tap(d.r.args, e, P, d.h); } catch(err){ console.error(err); } }
}
const liftPointer = e => { PTS.delete(e.pointerId); if (PTS.size < 2) pinch = null; };
cv.addEventListener('pointerup', e => { liftPointer(e); endDrag(e, false); });
cv.addEventListener('pointercancel', e => { liftPointer(e); endDrag(e, true); });
cv.addEventListener('lostpointercapture', e => { if (S.drag && S.drag.id === e.pointerId) endDrag(e, true); });
cv.addEventListener('pointerleave', () => { CAM.tx = 0; CAM.ty = 0; });
/* Double-click puts the view back where the room composed it. */
cv.addEventListener('dblclick', () => { if (S.started) resetView(); });
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
  if (e.key === 'Escape'){ if (anyOpen()) closePanels(); else if (S.spray) setSpray(false); else if (S.pick){ S.pick = null; domeCtx(); } else if (viewMoved()) resetView(); else if (S.sitting) standUp(); return; }
  if (anyOpen()) return;
  /* Arrow keys walk the ring where walking is the thing, and swing the view
     everywhere else, so the free camera is reachable without a pointer. */
  if (S.room === 'corridor'){
    if (e.key === 'ArrowLeft'){ e.preventDefault(); walkStep(-1); return; }
    if (e.key === 'ArrowRight'){ e.preventDefault(); walkStep(1); return; }
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight'){
    e.preventDefault(); CAM.tpanX += (e.key === 'ArrowLeft' ? 1 : -1)*90; clampPan(); return;
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown'){ e.preventDefault(); CAM.tpanY += (e.key === 'ArrowUp' ? 1 : -1)*60; clampPan(); }
  if (e.key === '0'){ resetView(); }
});
/* The wheel pushes in and out everywhere. It used to spin the ring, which the
   drag now does, and which no other room had any use for. */
stage.addEventListener('wheel', e => {
  if (!S.started || anyOpen()) return;
  e.preventDefault();
  const dv = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY);
  setUserZoom(CAM.tuser * Math.exp(-dv*(e.ctrlKey ? .006 : .0017)));
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
