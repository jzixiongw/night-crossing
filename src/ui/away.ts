import { tr } from '../i18n';
import { AU } from '../audio/index';
import { anWhere } from '../characters/an-lines';
import { $, MIN, durText, escapeHtml } from '../core/util';
import { G } from '../state/store';
import { say } from './captions';

/* ================= AWAY SUMMARY ================= */
export function showAway(gap, ev, title?){
  const items = [];
  items.push(tr('船走了 {0}。岸的航图又长了一段。', durText(gap)));
  const seen = new Set(); ev.forEach(e => { if (!seen.has(e.text)){ seen.add(e.text); items.push(e.text); } });
  if (G.tea.level > 0 && G.tea.temp < .1) items.push(tr('杯里的茶凉了。'));
  const w = anWhere(); items.push({ galley:tr('岸这会儿在小厨房。'), green:tr('岸这会儿在温室。'), cabin:tr('岸这会儿在客舱。'), dome:tr('岸这会儿在穹顶上。'), cabinSleep:tr('岸在客舱里睡着了。') }[w]);
  if (G.lines.length) items.push(tr('星空转过去了一些。你连的星线，每天这个钟点会回到头顶。'));
  $('#awayTitle').textContent = title || tr('你不在的时候');
  $('#awayList').innerHTML = items.slice(0,8).map(t => `<li>${escapeHtml(t)}</li>`).join('');
  $('#awayFoot').textContent = tr('这些都不用急着处理。');
  $('#awayView').hidden = false;
}
$('#awayOk').onclick = () => { $('#awayView').hidden = true; AU.paper(); };
export function returnNotice(gap, ev){
  if (gap > 20*MIN){ showAway(gap, ev, tr('你回来了')); return; }
  if (gap < 60000) return;
  say(tr('你回来了。') + (ev[0] ? ev[0].text : tr('船还在走。')));
  if (ev[1]) say(ev[1].text);
}
