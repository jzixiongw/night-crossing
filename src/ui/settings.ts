import { tr, LANG, setLang } from '../i18n';
import { AU } from '../audio/index';
import { showHints } from '../core/input';
import { persist } from '../state/save';
import { $ } from '../core/util';
import { S } from '../state/runtime';
import { SV, clearSlot, markDirty } from '../state/save';
import { G } from '../state/store';
import { say } from './captions';
import { openTicket } from './ticket';
import { anyOpen, closePanels } from './panels';

/* ================= SETTINGS =================
   The ×20 time-speed control is a walkthrough aid, not a player feature: it is
   shown in dev, and in a production build only when the URL carries ?debug. A
   judge opening the public link must not meet a dev affordance. */
export const DEBUG = !import.meta.env.PROD || new URLSearchParams(location.search).has('debug');
$('#speedRow').hidden = !DEBUG;
export function saveText(){ return SV.ref ? (SV.cloudOk || !SV.lastCloud ? tr('存在你的账户里（只有你看得见）') : tr('暂时连不上你的账户，先存在这个浏览器里')) : (SV.local ? tr('存在这个浏览器里') : tr('这次不会保存')); }
export function renderSettings(){
  if (!DEBUG && G.speed !== 1){ G.speed = 1; markDirty(); }
  $('#sSound').textContent = AU.on ? tr('开') : tr('关'); $('#sMotion').textContent = G.reduced ? tr('减少') : tr('完整');
  $('#sSpeed').textContent = '×' + G.speed; $('#sSpeed').classList.toggle('on', G.speed > 1);
  $('#sSave').textContent = saveText();
}
export function openSettings(){ closePanels(); renderSettings(); $('#settingsPanel').hidden = false; AU.paper(); }
$('#bSettings').onclick = () => { if (!$('#settingsPanel').hidden) closePanels(); else openSettings(); };
$('#settingsClose').onclick = closePanels;
export function setSound(v){ G.sound = v; AU.setOn(v); $('#bSound').textContent = v ? tr('声音 开') : tr('声音 关'); renderSettings(); markDirty(); }
$('#bSound').onclick = () => setSound(!AU.on);
$('#sSound').onclick = () => setSound(!AU.on);
$('#sMotion').onclick = () => { G.reduced = !G.reduced; document.body.classList.toggle('reduced', G.reduced); renderSettings(); markDirty(); };
$('#sSpeed').onclick = () => { G.speed = G.speed > 1 ? 1 : 20; renderSettings(); markDirty(); say(G.speed > 1 ? tr('时间流速 ×20（测试用）。') : tr('时间流速恢复 ×1。')); };
$('#sReset').onclick = () => {
  const b = $('#sReset');
  if (!S.resetArm){ S.resetArm = true; b.textContent = tr('再点一次，确认清空'); b.classList.add('on'); setTimeout(() => { S.resetArm = false; b.textContent = tr('清空'); b.classList.remove('on'); }, 4000); return; }
  S.started = false; clearSlot(SV.slot); location.reload();
};
/* Back to the door, where the three slots are. The voyage is already saved. */
$('#sSwitch').onclick = () => { persist(true); location.reload(); };
/* The toggle always names the language you would switch TO, in that language,
   so it reads to someone who cannot read the current one. */
const OTHER = LANG === 'en' ? 'zh' : 'en', OTHER_LABEL = LANG === 'en' ? '\u4e2d\u6587' : 'English';
for (const id of ['#sLang', '#introLang']){
  const b = $(id); if (!b) continue;
  b.textContent = OTHER_LABEL;
  b.onclick = () => setLang(OTHER as any);
}

$('#bTicket').onclick = openTicket;
$('#bHints').onclick = showHints;
