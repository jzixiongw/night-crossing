import { tr } from '../i18n';
import { AU } from '../audio/index';
import { $, durText, escapeHtml, ymd } from '../core/util';
import { portById } from '../data/ports';
import { SLOTS, SV, clearSlot, readSlot, setSlot } from '../state/save';
import { G, freshSave, migrate, setG } from '../state/store';
import { now } from '../state/time';

/* ================= THE DOOR =================
   Three ships, and you pick one before you get on. The card says enough to tell
   them apart without opening any of them: the number on the hull, how many
   nights it has run, when it was last out, and where it was headed. */
export let cloudSlots: Record<number, any> = {};
export function setCloudSlots(o){ cloudSlots = o || {}; renderSlots(); }

/* Whichever copy was written last, local or cloud. */
export function slotSave(n){
  const a = readSlot(n), b = cloudSlots[n];
  const best = [a, b].filter(Boolean).sort((x, y) => (y.savedAt||0) - (x.savedAt||0))[0];
  return best || null;
}
function card(n){
  const s = slotSave(n), on = SV.slot === n;
  if (!s) return `<button type="button" class="slot${on ? ' cur' : ''}" data-s="${n}">
    <b>${tr('空位 {0}', n)}</b><span>${tr('新的一艘')}</span></button>`;
  const P = s.call ? portById(s.call.to) : null;
  const nights = Math.max(1, (s.nights || []).length);
  const gap = s.lastSeen ? Math.max(0, now() - s.lastSeen) : 0;
  const ago = gap >= 60000;
  return `<button type="button" class="slot${on ? ' cur' : ''}" data-s="${n}">
    <b>${tr('夜航 No.{0}', escapeHtml(String(s.no)))}</b>
    <span>${tr('第 {0} 夜', nights)}${P ? ' · ' + escapeHtml(tr(P.name)) : ''}</span>
    <small>${ago ? tr('{0}前下的船', durText(gap)) : ymd(s.created)}</small>
    <i class="slot-x" data-x="${n}" role="button" tabindex="0" aria-label="${tr('删掉这一位的航程')}">×</i>
  </button>`;
}
export function renderSlots(){
  const box = $('#slots'); if (!box) return;
  box.innerHTML = SLOTS.map(card).join('');
  box.querySelectorAll('button.slot').forEach(b => {
    (b as HTMLElement).onclick = e => {
      const x = (e.target as HTMLElement).closest('.slot-x');
      if (x){ e.preventDefault(); e.stopPropagation(); askDelete(+(x as HTMLElement).dataset.x); return; }
      pickSlot(+(b as HTMLElement).dataset.s);
    };
  });
}
export let onPicked: (() => void) | null = null;
export function setOnPicked(fn){ onPicked = fn; }
export function pickSlot(n){
  if (SV.slot === n){ renderSlots(); return; }
  AU.paper();
  setSlot(n);
  const s = slotSave(n);
  setG(s ? migrate(JSON.parse(JSON.stringify(s))) : freshSave());
  renderSlots();
  onPicked && onPicked();
}
let armed = 0, armT = 0;
function askDelete(n){
  const box = $('#slots');
  if (armed !== n){
    armed = n; clearTimeout(armT);
    box.querySelectorAll('.slot-x').forEach(i => i.classList.toggle('arm', +(i as HTMLElement).dataset.x === n));
    $('#introFine').textContent = tr('再点一次那个叉，{0} 号位就清空了。', n);
    armT = setTimeout(() => { armed = 0; renderSlots(); $('#introFine').textContent = tr('航程存在这艘船上。下次打开，船还在原处。'); }, 4000) as any;
    return;
  }
  armed = 0; clearTimeout(armT);
  clearSlot(n); delete cloudSlots[n];
  if (SV.slot === n) setG(freshSave());
  renderSlots();
  $('#introFine').textContent = tr('航程存在这艘船上。下次打开，船还在原处。');
  onPicked && onPicked();
}
