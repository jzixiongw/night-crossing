import { grainA } from './paint';
import { CH, CW, ctx, onResize } from './surface';
import { mk } from './util';

/* ================= POST ================= */
export let postC = null;
export function buildPost(){
  postC = mk(CW, CH); const g = postC.getContext('2d');
  const v = g.createRadialGradient(CW/2, CH*.52, CH*.38, CW/2, CH*.52, CH*1.02); v.addColorStop(0, 'rgba(4,8,18,0)'); v.addColorStop(1, 'rgba(4,8,18,.55)');
  g.fillStyle = v; g.fillRect(0,0,CW,CH); g.fillStyle = g.createPattern(grainA, 'repeat'); g.fillRect(0,0,CW,CH);
}
export function drawPost(){ ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; if (postC) ctx.drawImage(postC, 0, 0); }
onResize(buildPost);
