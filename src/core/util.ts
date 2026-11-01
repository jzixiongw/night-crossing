import { isEN } from '../i18n';
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const stage = $('#stage');
export const rand = (a,b) => a + Math.random()*(b-a);
export const pick = a => a[Math.floor(Math.random()*a.length)];
export const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
export const lerp = (a,b,t) => a + (b-a)*t;
export const ease = k => k<.5 ? 2*k*k : 1 - Math.pow(-2*k+2,2)/2;
export const easeOut = k => 1 - Math.pow(1-k, 3);
export const mod = (a,n) => ((a % n) + n) % n;
export const D2R = Math.PI/180;
export const MIN = 60000, HOUR = 3600000;
export function mulberry32(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
export const pad2 = n => String(n).padStart(2,'0');
export function hhmm(t){ const d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
export function ymd(t){ const d = new Date(t); return d.getFullYear() + '.' + pad2(d.getMonth()+1) + '.' + pad2(d.getDate()); }
export function dayKey(t){ const d = new Date(t); return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); }
export function durText(ms){ const m = Math.round(ms/MIN); if (m < 60) return isEN ? m + (m === 1 ? ' minute' : ' minutes') : m + ' \u5206\u949f';
  const h = Math.floor(m/60), r = m % 60;
  return isEN ? h + (h === 1 ? ' hour' : ' hours') + (r ? ' ' + r + (r === 1 ? ' minute' : ' minutes') : '')
              : h + ' \u5c0f\u65f6' + (r ? ' ' + r + ' \u5206' : ''); }
export function hex(h){ const n = parseInt(h.slice(1),16); return [n>>16 & 255, n>>8 & 255, n & 255]; }
export function rgba(h, a){ const A = hex(h); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; }
export function mixHex(a, b, t){ const A = hex(a), B = hex(b); return '#' + A.map((v,i) => Math.round(lerp(v, B[i], clamp(t,0,1))).toString(16).padStart(2,'0')).join(''); }
export function mk(w,h){ const c = document.createElement('canvas'); c.width = Math.max(1, w|0); c.height = Math.max(1, h|0); return c; }
