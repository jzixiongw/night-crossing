import { $, mk, stage } from './util';

/* ================= CANVAS + 2.5D CAMERA =================
   Design space is 1600×900. Every layer has a depth k: k<1 is behind the play plane, k>1 in front.
   The pointer drifts the camera; nearer layers slide and dolly more, which is what reads as depth. */
export const VW = 1600, VH = 900;
export const cv = $('#scene'), ctx = cv.getContext('2d');
export const scn = mk(2,2), sctx = scn.getContext('2d');
export const lmc = mk(2,2), lctx = lmc.getContext('2d');
export let CW = 2, CH = 2, RS = 1, QUAL = 1;

/* The stage is no longer locked to 16:9. The canvas takes whatever aspect the
   viewport gives it and the 1600x900 design space is scaled to COVER it, so a
   portrait screen shows a tall centred slice of the room instead of a letterboxed
   strip. VX/VY are that crop offset in canvas pixels; mat() adds them, which is
   why every room, hit region and pointer mapping follows without changes.
   At exactly 16:9 the cover fit is the old fit and both offsets are 0. */
export let VX = 0, VY = 0;

/* Which design-space column to keep when the view is narrower than the room.
   Rooms already declare a zoom centre (`zc`); that is the composed focal point,
   so the crop is centred on it rather than on the geometric middle. */
let focusX = 800, focusY = 450;
export function setViewFocus(x: number, y: number){
  if (x === focusX && y === focusY) return;
  focusX = x; focusY = y; resize(true);
}

/* Anything that caches pixels at the current resolution registers here instead of being
   imported by resize(), which would make the low-level surface depend on its own consumers.
   This is the seam a different renderer's scale manager would drive. */
const resizers = [];
export function onResize(fn){ resizers.push(fn); }

/* Adaptive resolution: the loop lowers QUAL when frames run long. */
export function setQual(q){ QUAL = q; }

export function resize(force?){
  const r = stage.getBoundingClientRect(); if (!r.width) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(Math.min(r.width*dpr, 2240) * QUAL);
  const h = Math.round(w * r.height / r.width);
  if (w === CW && h === CH && !force) return;
  CW = w; CH = h;
  cv.width = scn.width = lmc.width = CW; cv.height = scn.height = lmc.height = CH;
  RS = Math.max(CW / VW, CH / VH);
  /* Centre the crop on the room's focal point, then clamp so the view never runs
     off the painted design space and expose bare background at an edge. */
  VX = Math.min(0, Math.max(CW - VW*RS, (CW - VW*RS)/2 - (focusX - VW/2)*RS));
  VY = Math.min(0, Math.max(CH - VH*RS, (CH - VH*RS)/2 - (focusY - VH/2)*RS));
  for (const fn of resizers) fn();
}
