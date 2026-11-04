import { tr } from '../i18n';
import { $, escapeHtml } from '../core/util';
import { S } from '../state/runtime';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { now } from '../state/time';

/* ================= CAPTIONS ================= */
export const cap = $('#caption');
export let capQ = [], capHide = 0, capShownAt = 0;
let captionEpoch = 0, capUntil = 0;

/* A room change invalidates delayed messages too, not just the current queue.
   Otherwise a tutorial from the previous room can arrive after the player left. */
export function clearCaptions(){
  captionEpoch++; capQ.length = 0; clearTimeout(capHide);
  capUntil = 0; cap.classList.remove('on');
}
export function say(text, who?, delay=0){
  const epoch = captionEpoch;
  setTimeout(() => {
    if (epoch !== captionEpoch) return;
    capQ.push({ text, who });
    if (capQ.length > 4) capQ.splice(0, capQ.length - 4);
    pumpCaption();
  }, delay);
}
export function pumpCaption(){
  if (!capQ.length || (cap.classList.contains('on') && performance.now() < capUntil)) return;
  const { text, who } = capQ.shift();
  cap.innerHTML = (who ? `<span class="who">${escapeHtml(who)}</span>` : '') + escapeHtml(text);
  cap.classList.add('on'); capShownAt = performance.now();
  const duration = Math.min(10000, Math.max(3200, 2200 + text.length*65));
  capUntil = capShownAt + duration;
  clearTimeout(capHide);
  capHide = setTimeout(() => { cap.classList.remove('on'); pumpCaption(); }, duration + 20) as any;
}
export function once(key){ if (G.flags[key]) return false; G.flags[key] = true; markDirty(); return true; }
export function onceS(key){ if (S.caps[key]) return false; S.caps[key] = true; return true; }
export function addLog(text){ G.log.unshift({ t:now(), text }); if (G.log.length > 80) G.log.length = 80; markDirty(); }
