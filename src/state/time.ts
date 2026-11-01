import { G } from './store';

/* ================= TIME ================= */
export function now(){ return Date.now() + (G.skew || 0); }
export function localHour(t?){ const d = new Date(t ?? now()); return d.getHours() + d.getMinutes()/60; }
export function inHours(h, [a,b]: number[]){ return a <= b ? (h >= a && h < b) : (h >= a || h < b); }
