import { tr } from '../i18n';
import { AU } from '../audio/index';
import { $, MIN, durText, escapeHtml } from '../core/util';
import { G } from '../state/store';
import { callPort, docked, etaLeft } from '../rooms/hatch';
import { say } from './captions';

/* ================= AWAY SUMMARY ================= */
export function showAway(gap, ev, title?){
  const items = [];
  items.push(tr('船自己走了 {0}。', durText(gap)));
  /* An arrival that happened while nobody was aboard is the one piece of news
     that is still waiting to be acted on, so it goes near the top. */
  const P = callPort();
  if (P && docked()) items.push(tr('船靠上了{0}。舷门那边有人在等。', P.name));
  else if (P) items.push(tr('船还在往{0}去，剩 {1}。', P.name, durText(etaLeft())));
  const seen = new Set(); ev.forEach(e => { if (!seen.has(e.text)){ seen.add(e.text); items.push(e.text); } });
  if (G.tea.level > 0 && G.tea.temp < .1) items.push(tr('杯里的茶凉了。'));
  if (G.lines.length) items.push(tr('星空转过去了一些。你连的星线，每天这个钟点会回到头顶。'));
  $('#awayTitle').textContent = title || tr('你不在的时候');
  $('#awayList').innerHTML = items.slice(0,8).map(t => `<li>${escapeHtml(t)}</li>`).join('');
  $('#awayFoot').textContent = '';
  $('#awayView').hidden = false;
}
$('#awayOk').onclick = () => { $('#awayView').hidden = true; AU.paper(); };
export function returnNotice(gap, ev){
  if (gap > 20*MIN){ showAway(gap, ev, tr('你回来了')); return; }
  if (gap < 60000) return;
  say(tr('你回来了。') + (ev[0] ? ev[0].text : tr('船还在走。')));
  if (ev[1]) say(ev[1].text);
}
