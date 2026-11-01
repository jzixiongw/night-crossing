import { tr } from '../i18n';
import { $, escapeHtml } from '../core/util';
import { S } from '../state/runtime';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { now } from '../state/time';

/* ================= CAPTIONS ================= */
export const cap = $('#caption');
export let capQ = [], capHide = 0, capShownAt = 0;

/* Changing room drops anything queued but not yet shown. */
export function clearCaptions(){ capQ.length = 0; cap.classList.remove('on'); }
export function say(text, who?, delay=0){ setTimeout(() => { capQ.push({ text, who }); if (capQ.length > 4) capQ.splice(0, capQ.length - 4); pumpCaption(); }, delay); }
export function pumpCaption(){
  if (!capQ.length) return;
  const t = performance.now();
  if (t - capShownAt < 2300 && cap.classList.contains('on')) { setTimeout(pumpCaption, 2300 - (t - capShownAt) + 30); return; }
  const { text, who } = capQ.shift();
  cap.innerHTML = (who ? `<span class="who">${escapeHtml(who)}</span>` : '') + escapeHtml(text);
  cap.classList.add('on'); capShownAt = t;
  clearTimeout(capHide); capHide = setTimeout(() => { if (!capQ.length) cap.classList.remove('on'); else pumpCaption(); }, 2600 + text.length*105);
}
export const AN = tr('岸');
export function once(key){ if (G.flags[key]) return false; G.flags[key] = true; markDirty(); return true; }
export function onceS(key){ if (S.caps[key]) return false; S.caps[key] = true; return true; }
export function addLog(text){ G.log.unshift({ t:now(), text }); if (G.log.length > 80) G.log.length = 80; markDirty(); }
