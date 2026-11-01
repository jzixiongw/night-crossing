import { tr } from '../i18n';
import { $, escapeHtml, hhmm, ymd } from '../core/util';
import { G } from '../state/store';
import { closePanels } from './panels';
import { AU } from '../audio/index';

/* ================= LOG + BOARD ================= */
export function wrapCJK(s, n){ const out = []; let cur = ''; for (const ch of s){ cur += ch; if (cur.length >= n){ out.push(cur); cur = ''; } } if (cur) out.push(cur); return out; }
/* Chinese wraps on a fixed character count. English has to wrap on spaces, or a
   card reads "brewed a / cup of / Osmanthu...". Latin fits about twice the
   characters in the same column, so the limit doubles. */
export function wrapWords(s, n){ const out = []; let cur = ''; for (const w of s.split(/\s+/)){ if (!cur) cur = w; else if (cur.length + 1 + w.length <= n) cur += ' ' + w; else { out.push(cur); cur = w; } } if (cur) out.push(cur); return out; }
/* The lines one log card shows, already cut to `max` with an ellipsis. */
export function logLines(s, n = 8, max = 3){ const latin = !/[\u4e00-\u9fff]/.test(s) && /\s/.test(s), w = latin ? n*2 : n;
  const all = latin ? wrapWords(s, w) : wrapCJK(s, w), out = all.slice(0, max);
  if (all.length > max) out[max-1] = out[max-1].slice(0, w-1).replace(/\s+$/, '') + '\u2026';
  return out; }
export function renderBoard(){
  const g = $('#boardCards'); if (!g) return; let h = '';
  const items = G.log.slice(0,6);
  items.forEach((e,i) => { const col = i % 3, row = Math.floor(i/3), x = 552 + col*160, y = 350 + row*134, rot = [-3,2,-1,3,-2,1][i];
    const lines = logLines(e.text);
    h += `<g transform="rotate(${rot} ${x+70} ${y+56})"><rect x="${x}" y="${y}" width="140" height="112" rx="4" fill="#efe4cf" stroke="#16213a" stroke-width="2.5"/><circle cx="${x+70}" cy="${y+6}" r="5" fill="#c46a52" stroke="#16213a" stroke-width="2"/>
      <text x="${x+12}" y="${y+30}" font-family="DM Mono, monospace" font-size="11" fill="#7d7a72">${ymd(e.t).slice(5)} ${hhmm(e.t)}</text>
      ${lines.map((l,k) => `<text x="${x+12}" y="${y+56+k*22}" font-family="ZCOOL XiaoWei, serif" font-size="16" fill="#2a3550">${escapeHtml(l)}</text>`).join('')}</g>`; });
  if (!items.length) h = tr('<text x="780" y="480" text-anchor="middle" font-family="ZCOOL XiaoWei, serif" font-size="20" fill="#2a1a10">还没有记录。</text>');
  g.innerHTML = h;
}
export function openLog(){
  closePanels(); AU.paper();
  $('#logCards').innerHTML = G.log.length ? G.log.map(e => `<div><time>${ymd(e.t)} ${hhmm(e.t)}</time>${escapeHtml(e.text)}</div>`).join('') : tr('<div>还没有记录。</div>');
  $('#logView').hidden = false;
}
$('#logClose').onclick = () => { $('#logView').hidden = true; };
