import { tr, isEN } from '../i18n';
import { AU } from '../audio/index';
import { $, HOUR, durText, escapeHtml, hhmm, ymd } from '../core/util';
import { COL, ORDER, ROUTES, SEEDS, STATIONS } from '../data/index';
import { PORTS } from '../data/ports';
import { endHidden, endPos, wdx } from '../rooms/dome';
import { bloomReady } from '../rooms/green';
import { ACT } from '../rooms/registry';
import { markDirty, persist } from '../state/save';
import { G } from '../state/store';
import { addLog, say } from './captions';
import { POT_COL } from '../core/materials';
import { S } from '../state/runtime';
import { now } from '../state/time';
import { closePanels } from './panels';
import { chartSVG } from './chart';

/* ================= TICKET + ENDING ================= */
export function miniPots(){
  let h = `<svg viewBox="0 0 150 64" aria-hidden="true"><rect width="150" height="64" rx="8" fill="#1c2f38"/>`;
  const sp = 150/G.pots.length, w = Math.min(9, sp*.42);
  G.pots.forEach((p,i) => { const x = sp/2 + i*sp; h += `<path d="M${x-w},56 L${x+w},56 L${x+w-2},44 L${x-w+2},44Z" fill="${POT_COL[i]}"/>`;
    if (p){ const hgt = 4 + 30*p.g; h += `<path d="M${x},44 V${44-hgt}" stroke="#6bb2a8" stroke-width="2.5"/>`; if (bloomReady(p)) h += `<circle cx="${x}" cy="${44-hgt}" r="3.4" fill="${SEEDS[p.sp].color}"/>`; } });
  return h + '</svg>';
}
export function miniStrip(){
  let h = `<svg viewBox="0 0 168 64" aria-hidden="true"><rect width="168" height="64" rx="6" fill="#e4d6bb"/>`;
  for (let c=0;c<16;c++) for (let r=0;r<6;r++){ const on = G.strip[c] & (1<<r); h += `<circle cx="${8 + c*10.2}" cy="${8 + r*9.6}" r="${on ? 3.4 : 1.2}" fill="${on ? '#2a3550' : '#c4b392'}"/>`; }
  return h + '</svg>';
}
export function miniSky(){
  let h = `<svg viewBox="0 0 150 64" aria-hidden="true"><rect width="150" height="64" rx="8" fill="#0d1631"/>`;
  if (G.lines.length){
    const pts = []; const a0 = endPos(G.lines[0].a);
    const segs = G.lines.map(l => { const a = endPos(l.a), b = endPos(l.b); const ax = a0.x + wdx(a.x, a0.x), bx = ax + wdx(b.x, a.x); pts.push([ax,a.y],[bx,b.y]); return [ax,a.y,bx,b.y, l.a.s == null || l.b.s == null]; });
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sc = Math.min(130/Math.max(1, x1-x0), 48/Math.max(1, y1-y0), .5);
    const tx = v => 75 + (v - (x0+x1)/2)*sc, ty = v => 32 + (v - (y0+y1)/2)*sc;
    segs.forEach(([ax,ay,bx,by,free]) => { h += `<line x1="${tx(ax).toFixed(1)}" y1="${ty(ay).toFixed(1)}" x2="${tx(bx).toFixed(1)}" y2="${ty(by).toFixed(1)}" stroke="#ffd9a3" stroke-width="1.4" ${free ? 'stroke-dasharray="2 3"' : ''}/>`; });
    pts.forEach(([x,y]) => { h += `<circle cx="${tx(x).toFixed(1)}" cy="${ty(y).toFixed(1)}" r="1.6" fill="#fff"/>`; });
  } else h += `<g fill="#dfe9f3"><circle cx="30" cy="20" r="1.2"/><circle cx="70" cy="40" r="1.4"/><circle cx="110" cy="18" r="1"/><circle cx="128" cy="48" r="1.2"/></g>`;
  return h + '</svg>';
}
export function ticketMarkup(stub){
  const chips = ORDER.filter(c => G.answered[c]).map(c => `<span class="chip"><i style="background:${COL[c].hex}"></i>${tr(COL[c].beacon)} \u00d7 ${G.answered[c]}</span>`).join('');
  const names = [...new Set(Object.values(G.names))].slice(0,4);
  const route = G.visited.slice(-4).map(r => tr(ROUTES[r].name)).join(' \u2192 ');
  /* The round, read back as a list of people rather than a score. One line per
     call, newest first, each naming the place and the flower that was left. */
  const calls = G.calls.length
    ? `<div class="chips">` + G.calls.slice(-6).reverse().map(c => {
        const P = PORTS[c.id];
        return P ? `<span class="chip"><i style="background:${SEEDS[c.sp] ? SEEDS[c.sp].color : '#ffd9a3'}"></i>${tr(P.name)}</span>` : '';
      }).join('') + `</div>`
    : tr('还没有送到过。');
  const nights = Math.max(1, G.nights.length);
  /* Every row is read off the save, so the stub is a record of this voyage and
     nothing else. The note stays whatever the player left, including nothing. */
  const note = stub
    ? `<div class="t-note"><label>${tr('卡片背面')}</label><div>${G.note ? escapeHtml(G.note) : tr('（空着）')}</div></div>`
    : `<div class="t-note"><label for="ticketNote">${tr('卡片背面')}</label><textarea id="ticketNote" maxlength="80" placeholder="${tr('写一件窗外看见的东西。')}">${escapeHtml(G.note)}</textarea></div>`;
  return `
  <div class="t-main">
    <div class="t-head"><b>${tr('夜航')}</b><span class="mono">NIGHT CROSSING \u00b7 No.${G.no}</span></div>
    <dl class="t-grid">
      <dt>${tr('首次登船')}</dt><dd class="mono">${ymd(G.created)}</dd>
      <dt>${tr('这次')}</dt><dd class="mono">${tr('{0} 登船', hhmm(S.sessionStart || now()))}</dd>
      <dt>${tr('航程')}</dt><dd>${tr('第 {0} 夜 · 共航行 {1}', nights, durText(G.mapLen*HOUR))}</dd>
      <dt>${tr('航道')}</dt><dd>${route}</dd>
      <dt>${tr('航海图')}</dt><dd class="wide"><div class="seachart t-chart">${chartSVG({ mini:true })}</div></dd>
      <dt>${tr('到访')}</dt><dd class="wide">${calls}</dd>
      <dt>${tr('灯串')}</dt><dd class="wide">${chips ? `<div class="chips">${chips}</div>` : tr('还没有。窗外的灯会一直经过。')}${G.passedLights ? tr('　你忙的时候，窗外经过了 {0} 盏灯。', G.passedLights) : ''}</dd>
      <dt>${tr('厨房')}</dt><dd>${tr('茶 {0} 杯 · 面包 {1} 个', G.cups, G.baked)}</dd>
      <dt>${tr('信')}</dt><dd>${tr('读过 {0} 封 · 寄出 {1} 张', G.mail.read.length, G.mail.out.length)}</dd>
      <dt>${tr('电台')}</dt><dd>${tr('台表记了 {0} / {1}', G.found.length, STATIONS.length)}</dd>
      <dt>${tr('穹顶')}</dt><dd>${tr('星线 {0} 笔', G.lines.length)}${names.length ? tr('：') + names.map(n => tr('「{0}」', escapeHtml(n))).join('') : ''}</dd>
      <dt>${tr('留下的')}</dt><dd class="wide"><div class="t-minis"><figure>${miniPots()}<figcaption>${tr('温室')}</figcaption></figure><figure>${miniStrip()}<figcaption>${tr('八音盒纸带')}</figcaption></figure><figure>${miniSky()}<figcaption>${tr('星线')}</figcaption></figure></div></dd>
    </dl>
    ${note}
  </div>
  <div class="t-stub">${STUB_V()}<div class="stamp" id="${stub ? 'stamp' : 'stampX'}">${tr('第{0}夜', nights)}</div><span class="mono" style="font-size:.8em;color:var(--paper-dim)">${G.no}</span></div>`;
}
/* The stub reads vertically in Chinese, one glyph per line. English cannot be
   set that way and stay legible, so it gets two short stacked words instead. */
function STUB_V(){
  return isEN
    ? '<span class="v v-en"><span>LONG</span><span>HAUL</span><span>\u00b7</span><span>LAMP</span><span>RUN</span></span>'
    : '<span class="v"><span>\u957f</span><span>\u822a</span><span>\u00b7</span><span>\u9001</span><span>\u706f</span></span>';
}
export function openTicket(){
  closePanels(); AU.paper();
  $('#ticketCard').innerHTML = ticketMarkup(false); $('#ticketView').hidden = false;
  const ta = $('#ticketNote'); ta.addEventListener('input', () => { G.note = ta.value; markDirty(); });
}
export function openEnding(){
  $('#ticketView').hidden = true;
  $('#endTicket').innerHTML = ticketMarkup(true); $('#ending').hidden = false; $('#endReply').textContent = '';
  document.querySelectorAll('#endActs button').forEach(b => b.classList.remove('sel'));
  const waits = [];
  if (G.dough.st === 'proofing' || G.dough.st === 'proofed') waits.push(tr('面团在发酵箱里慢慢发着。'));
  const grow = G.pots.filter(p => p && p.g < 1).length; if (grow) waits.push(tr('有 {0} 个盆里的植物还在长。', grow));
  if (G.lines.some(l => l.a.s == null || l.b.s == null || endHidden(l.a) || endHidden(l.b))) waits.push(tr('有一笔星线还悬着。'));
  if (G.mail.out.some(o => !o.sent)) waits.push(tr('明信片还在寄出口。'));
  if (G.call && !G.call.docked && PORTS[G.call.to]) waits.unshift(tr('船正往{0}去。', tr(PORTS[G.call.to].name)));
  if (G.call && G.call.docked && !G.call.gave && PORTS[G.call.to]) waits.unshift(tr('船还靠在{0}，门外有人在等。', tr(PORTS[G.call.to].name)));
  if (G.call && G.call.gave && PORTS[G.call.to]) waits.unshift(tr('船正离开{0}。', tr(PORTS[G.call.to].name)));
  /* One wait, not a list of them: naming the dough is a detail, naming all
     four is an inventory the player just walked away from. */
  $('#endNote').textContent = tr('船会继续航行。') + (waits[0] || '') + tr('航程已经存好了。下次打开，船还在原处。');
  addLog(tr('今天就到这里')); persist(true);
  setTimeout(() => { const s = $('#stamp'); s && s.classList.add('on'); AU.stamp(); }, 700);
}
$('#endActs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  document.querySelectorAll('#endActs button').forEach(x => x.classList.toggle('sel', x===b)); $('#endReply').textContent = b.dataset.r; AU.bell(69, .06); });
$('#tBack').onclick = () => { $('#ticketView').hidden = true; AU.paper(); };
$('#tEnd').onclick = openEnding;
$('#eStay').onclick = () => { $('#ending').hidden = true; say(tr('船还在走。')); };
ACT['ui:ticket'] = { tap(){ openTicket(); } };
