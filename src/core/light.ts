import { setL } from './camera';
import { SOFT, glowAt } from './paint';
import { CH, CW, lctx, lmc, sctx } from './surface';
import { clamp } from './util';

/* ================= LIGHT MAP =================
   The room is painted onto its own canvas, then a dark wash with soft holes at every light source is laid on top (source-atop),
   so lamps carve warm pools out of a cold room. Additive glows go on afterwards. */
export function lightBegin(col, a){
  lctx.setTransform(1,0,0,1,0,0); lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1; lctx.clearRect(0,0,CW,CH);
  lctx.globalAlpha = clamp(a,0,1); lctx.fillStyle = col; lctx.fillRect(0,0,CW,CH); lctx.globalAlpha = 1; lctx.globalCompositeOperation = 'destination-out';
}
export function hole(k, x, y, r, a, o?, ry?){ if (a < .01) return; setL(lctx, k, o); lctx.globalAlpha = clamp(a,0,1); lctx.drawImage(SOFT, x-r, y-(ry||r), r*2, (ry||r)*2); }
export function holeM(m, x, y, r, a, ry?){ if (a < .01) return; lctx.setTransform(m[0],m[1],m[2],m[3],m[4],m[5]); lctx.globalAlpha = clamp(a,0,1); lctx.drawImage(SOFT, x-r, y-(ry||r), r*2, (ry||r)*2); }
export function lightApply(){
  lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1;
  sctx.setTransform(1,0,0,1,0,0); sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-atop'; sctx.drawImage(lmc,0,0); sctx.globalCompositeOperation = 'source-over';
}
export function glowL(c, k, spr, x, y, r, a, o?, ry?){ if (a < .005) return; setL(c, k, o); c.globalCompositeOperation = 'lighter'; glowAt(c, spr, x, y, r, a, ry); c.globalCompositeOperation = 'source-over'; }
