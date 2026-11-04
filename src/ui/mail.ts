import { tr } from '../i18n';
import { AU } from '../audio/index';
import { $, escapeHtml, hhmm, ymd } from '../core/util';
import { LETTERS } from '../data/index';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { now } from '../state/time';
import { addLog, say } from './captions';
import { closePanels } from './panels';

/* ================= MAIL ================= */
export function updateMailbox(){
  const n = G.mail.box.length;
  const f = $('#mbFlag'); if (f) f.setAttribute('transform', n ? '' : 'rotate(90 912 640)');
  const c = $('#mbCount'); if (c) c.textContent = n ? '● '.repeat(n).trim() : '';
  if ($('#clkNight')) $('#clkNight').textContent = tr('航行第 {0} 夜', Math.max(1, G.nights.length));
}
export function letterById(id){ return LETTERS.find(l => l.id === id); }
export function openMail(sel?){
  closePanels(); AU.paper();
  if (!sel) sel = G.mail.box[0] || (G.mail.read[0] ? 'r:' + G.mail.read[0] : 'write');
  renderMail(sel); $('#mailView').hidden = false;
}
export function renderMail(sel){
  const side = $('#mailSide'); let h = '';
  h += `<h3>${tr('信箱')}</h3>`;
  if (G.mail.box.length) G.mail.box.forEach(id => { const L = letterById(id); h += `<button type="button" data-m="${id}" class="${sel===id?'cur':''}"><span class="new">${tr('新到')}</span>${escapeHtml(tr(L.from))}<small>${tr('{0} 靠舷', hhmm(G.mail.arrived[id] || now()))}</small></button>`; });
  else h += `<p class="sub">${tr('空着。下一班邮船大约 {0} 靠舷。', hhmm(G.mail.nextAt))}</p>`;
  if (G.mail.read.length){ h += `<h3>${tr('读过的')}</h3>`; G.mail.read.slice(0,10).forEach(id => { const L = letterById(id); h += `<button type="button" data-m="r:${id}" class="${sel==='r:'+id?'cur':''}">${escapeHtml(tr(L.from))}<small>${ymd(G.mail.arrived[id] || G.created)}</small></button>`; }); }
  h += `<h3>${tr('寄出')}</h3><button type="button" data-m="write" class="${sel==='write'?'cur':''}">${tr('写一张明信片')}<small>${tr('下一班邮船带走')}</small></button>`;
  G.mail.out.slice(-4).reverse().forEach((o,i) => { h += `<button type="button" data-m="o:${G.mail.out.length-1-i}" class="${sel==='o:'+(G.mail.out.length-1-i)?'cur':''}">${tr('明信片')}<small>${o.sent ? tr('已随 {0} 的邮船离开', hhmm(o.sent)) : tr('在寄出口，等下一班邮船')}</small></button>`; });
  side.innerHTML = h;
  side.querySelectorAll('button[data-m]').forEach(b => b.onclick = () => { AU.paper(); renderMail((b as HTMLElement).dataset.m); });
  const main = $('#mailMain');
  if (sel === 'write'){
    /* Writing is optional all the way down: the card sends blank, and the copy
       says so before the player has typed anything. */
    main.innerHTML = `<div class="letter"><div class="from">${tr('明信片')}</div><div class="meta">${tr('寄出口不看收信人。')}</div>
      <textarea id="pcText" maxlength="160" placeholder="${tr('窗外今天……')}"></textarea>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="pcSend" type="button">${tr('投进寄出口')}</button></div></div>`;
    $('#pcSend').onclick = () => { const t = ($('#pcText') as HTMLTextAreaElement).value.trim(); G.mail.out.push({ text:t, at:now(), sent:0 }); if (G.mail.out.length > 20) G.mail.out.shift();
      AU.paper(); addLog(t ? tr('写了一张明信片，投进寄出口') : tr('寄出一张空白明信片')); markDirty(); renderMail('o:' + (G.mail.out.length-1)); say(tr('明信片投进寄出口了。下一班邮船会带走它。')); };
    return;
  }
  if (sel.startsWith('o:')){ const o = G.mail.out[+sel.slice(2)]; if (!o) return renderMail('write');
    main.innerHTML = `<div class="letter"><div class="pm">${o.sent ? tr('已寄出<br>{0}', ymd(o.sent)) : tr('待寄')}</div><div class="from">${tr('你的明信片')}</div><div class="meta">${tr('{0} {1} 写', ymd(o.at), hhmm(o.at))}</div><p>${o.text ? escapeHtml(o.text) : tr('（空白）')}</p></div>`; return; }
  const id = sel.startsWith('r:') ? sel.slice(2) : sel; const L = letterById(id); if (!L){ main.innerHTML = ''; return; }
  if (!sel.startsWith('r:') && G.mail.box.includes(id)){ G.mail.box = G.mail.box.filter(x => x !== id); G.mail.read.unshift(id); markDirty(); updateMailbox(); setTimeout(() => renderMail('r:' + id), 0); }
  const at = G.mail.arrived[id] || G.created;
  main.innerHTML = `<div class="letter"><div class="pm">${tr('邮戳<br>{0}<br>{1}', ymd(at), hhmm(at))}</div><div class="from">${escapeHtml(tr(L.from))}</div><div class="meta">${tr('寄 夜航 No.{0}', G.no)}</div><p>${escapeHtml(tr(L.body))}</p><div class="sig">\u2014\u2014 ${escapeHtml(tr(L.sig))}</div></div>`;
}
$('#mailClose').onclick = () => { $('#mailView').hidden = true; AU.paper(); };
