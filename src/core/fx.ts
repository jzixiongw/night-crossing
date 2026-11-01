import { setL } from './camera';
import { SFOG, spr } from './paint';
import { easeOut, lerp } from './util';

/* ================= EFFECTS shared by rooms ================= */
export const FX = [];
export function flare(k, x, y, color, r0=10, r1=70, dur=.9, o?){ FX.push({ k, x, y, color, r0, r1, dur, t:0, o }); }
export function drawFX(c, dt){
  c.globalCompositeOperation = 'lighter';
  for (let i=FX.length-1;i>=0;i--){ const f = FX[i]; f.t += dt; const q = f.t/f.dur; if (q >= 1){ FX.splice(i,1); continue; }
    setL(c, f.k, f.o); const r = lerp(f.r0, f.r1, easeOut(q)), a = (1-q);
    c.globalAlpha = a*.55; c.drawImage(spr(f.color), f.x - r, f.y - r, r*2, r*2);
    c.globalAlpha = a*.5; c.beginPath(); c.arc(f.x, f.y, r*.82, 0, Math.PI*2); c.arc(f.x, f.y, Math.max(0, r*.82 - 3 - 4*(1-q)), 0, Math.PI*2, true); c.fillStyle = f.color; c.fill(); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
export const PUFFS = [];
export function puff(k, x, y, o){ PUFFS.push({ k, x, y, vx:o.vx ?? 0, vy:o.vy ?? -30, r:o.r ?? 8, gr:o.gr ?? 26, a:o.a ?? .35, t:0, dur:o.dur ?? 2.4, col:o.col || SFOG, lo:o.lo }); }
export function drawPuffs(c, dt){
  for (let i=PUFFS.length-1;i>=0;i--){ const p = PUFFS[i]; p.t += dt; const q = p.t/p.dur; if (q >= 1){ PUFFS.splice(i,1); continue; }
    setL(c, p.k, p.lo); const x = p.x + p.vx*p.t, y = p.y + p.vy*p.t, r = p.r + p.gr*q; c.globalAlpha = p.a*Math.sin(Math.PI*Math.min(1, q*1.4 + .05)); c.drawImage(p.col, x - r, y - r, r*2, r*2); }
  c.globalAlpha = 1;
}
