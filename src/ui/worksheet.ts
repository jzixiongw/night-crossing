import { tr } from '../i18n';
import { durText } from '../core/util';
import { PORT_ORDER, portById } from '../data/ports';
import { S } from '../state/runtime';
import { journeyDone } from '../state/journey';
import { G } from '../state/store';

/* ================= THE LINE =================
   One job is five things in a fixed order, each of them somewhere different on
   the ring, and walking the ring one way takes you through them in that order.
   This module is the only thing that decides which of the five you are on and
   how far into it you are, so every slip pinned up around the ship agrees.

   Nothing here enforces the order. A step is done when the world says it is
   done, which means a player who wants to set course early and grow on the way
   can, and the line simply shows two steps lit instead of one.

   `parts` is the same job one level down. Only the step you are on shows them,
   so the slip stays five lines long and still answers "what, exactly, now". */
export interface Part { name: string; done(): boolean }
export interface Step { id: string; name: string; where: string; at: string; parts: Part[]; done(): boolean; todo(): string }

const call = () => G.call;
export const STEPS: Step[] = [
  { id:'take', name:tr('领取委托'), where:'radio', at:tr('电台室'),
    done: () => journeyDone(G, 'take'),
    parts: [
      { name:tr('开电台'),    done: () => G.radioOn || !!G.printed || G.slips.length > 0 || !!G.call },
      { name:tr('对上调度台'), done: () => !!G.printed || G.slips.length > 0 || !!G.call },
      { name:tr('撕下单子'),   done: () => G.slips.length > 0 || !!G.call }
    ],
    todo: () => tr('电台室：调到调度台，撕一张单子。') },
  { id:'course', name:tr('定航向'), where:'cabin', at:tr('驾驶舱'),
    done: () => journeyDone(G, 'course'),
    parts: [
      { name:tr('拿着单子'),   done: () => G.slips.length > 0 || !!G.call },
      { name:tr('选择目的地'), done: () => !!G.call }
    ],
    todo: () => tr('驾驶舱：点航向板，选择目的地。') },
  { id:'grow', name:tr('培育植物'), where:'green', at:tr('温室'),
    done: () => journeyDone(G, 'grow'),
    parts: [
      { name:tr('下一粒种'), done: () => !!G.rig || G.pots.some(p => p) },
      { name:tr('浇上水'),   done: () => !!G.rig || G.pots.some(p => p && (p.water > 0 || p.g >= 1)) },
      { name:tr('等它开花'), done: () => !!G.rig || G.pots.some(p => p && p.g >= 1) }
    ],
    todo: () => tr('温室：种一盆，浇上水，等它开花。') },
  { id:'build', name:tr('装配植物灯'), where:'green', at:tr('温室'),
    done: () => journeyDone(G, 'build'),
    parts: [
      { name:tr('端上转台'), done: () => !!G.rig },
      { name:tr('扣上罩子'), done: () => !!(G.rig && G.rig.glass) },
      { name:tr('装上灯'),   done: () => !!(G.rig && G.rig.lit) }
    ],
    todo: () => tr('温室：走近装配台。扣上玻璃罩。接着安装灯头。') },
  { id:'give', name:tr('交付植物灯'), where:'hatch', at:tr('舷梯'),
    done: () => journeyDone(G, 'give'),
    parts: [
      { name:tr('船靠上来'), done: () => !!(call() && call().docked) },
      { name:tr('开舷门'),   done: () => !!S.doorOpen || !!(call() && call().gave) },
      { name:tr('递过去'),   done: () => !!(call() && call().gave) }
    ],
    todo: () => tr('舷梯：靠上以后开门，把灯递过去。') }
];

/* The first step the world has not done yet. */
export function stepNow(){ return STEPS.findIndex(s => !s.done()); }
/* The one line of help the slips and the hint system share. */
export function stepHint(){ const i = stepNow(); return i < 0 ? '' : STEPS[i].todo(); }

/* ---------- the round, read off the save ---------- */
/* Where one place stands with the ship: it has asked, you have taken it on,
   the ship is on its way there, or its lamp is already burning. The order
   boards in the greenhouse and the slip on the cork board read this. */
export function orderState(id){
  if (G.call && G.call.to === id) return 'now';
  if (G.slips.includes(id)) return 'taken';
  if (G.calls.some(k => k.id === id)) return 'done';
  return 'open';
}
export function orderWord(id){
  const st = orderState(id);
  if (st === 'done') return tr('送到了');
  if (st === 'now') return G.call.docked ? tr('已靠上') : tr('在路上');
  if (st === 'taken') return tr('接了');
  return tr('还没叫到');
}
export function lastDelivered(id){ for (let k=G.calls.length-1;k>=0;k--) if (G.calls[k].id === id) return G.calls[k]; return null; }

/* The one line every slip carries at its foot: where the ship is going. */
export function voyageLine(){
  const P = G.call ? portById(G.call.to) : null;
  if (P && G.call.docked) return tr('靠在 {0}', tr(P.name));
  if (P) return tr('下一站 {0} · 还有 {1}', tr(P.name), durText(Math.max(0, G.call.eta - Date.now() - (G.skew||0))));
  if (G.slips.length) return tr('手上 {0} 张单子', G.slips.length);
  return tr('还没有单子');
}

/* The next place that has asked and has not been taken on yet. Dispatch reads
   these out in order and stops when there is nothing left to give out. */
export function openRequest(){
  return PORT_ORDER.find(id => !G.calls.some(c => c.id === id) && !G.slips.includes(id) && G.printed !== id && !(G.call && G.call.to === id)) || null;
}
