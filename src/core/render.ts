import { beginHits, commitHits, drawFocus } from './hits';
import { lightApply } from './light';
import { drawPost } from './post';
import { CH, CW, ctx, scn, sctx } from './surface';

/* ================= RENDER PIPELINE ================= */
/* `R` is the active room descriptor; the caller owns room lookup so the pipeline
   stays independent of the room registry. */
export function render(dt, R){
  if (!R) return;
  beginHits();
  ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (R.webgl){
    /* A WebGL room renders onto its own canvas under this one and registers
       its hit regions from `room`; this canvas keeps only what lies over the
       picture -- the post pass and the keyboard focus ring. */
    ctx.clearRect(0,0,CW,CH);
    if (R.room) R.room(sctx, dt);
  } else {
    ctx.fillStyle = '#070c17'; ctx.fillRect(0,0,CW,CH);
    if (R.back) R.back(ctx, dt);
    sctx.setTransform(1,0,0,1,0,0); sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over'; sctx.clearRect(0,0,CW,CH);
    if (R.room) R.room(sctx, dt);
    if (R.light){ R.light(); lightApply(); }
    ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(scn, 0, 0);
  }
  if (R.over) R.over(ctx, dt);
  ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawPost(); drawFocus(ctx);
  commitHits();
}
