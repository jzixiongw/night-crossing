import { tr } from '../i18n';
import { AU } from '../audio/index';
import { pick } from '../core/util';
import { COL } from '../data/index';
import { ACT } from '../rooms/registry';
import { S } from '../state/runtime';
import { G } from '../state/store';
import { localHour } from '../state/time';
import { AN, once, say } from '../ui/captions';

/* ================= 岸 ================= */
export function anWhere(){ const h = localHour(); if (h >= 6 && h < 11) return 'galley'; if (h >= 11 && h < 17) return 'green'; if (h >= 17 && h < 22) return 'cabin'; if (h >= 22 || h < 2) return 'dome'; return 'cabinSleep'; }
export function anHere(){ const w = anWhere(); return w === 'cabin' || w === 'cabinSleep'; }
export function anAsleep(){ return anWhere() === 'cabinSleep' || S.asleepRoute; }
export const AN_LINES = {
  cabin:[tr('我画图不急。航线自己会长出来。'),tr('困了就睡。下船前我会叫你。'),tr('这张图画完，我也不知道要寄给谁。先画着。')],
  galley:[tr('早上的厨房最暖。面团放这儿发得快。'),tr('星梨是邻船送的。酸，配茶正好。'),tr('水壶把手烫，拿的时候小心。'),tr('我早上就吃一片面包。你烤的话，分我一点。')],
  green:[tr('这几盆怕快。你手慢一点，它们会朝你歪。'),tr('生长灯开着长得快。关了，它们就找别的光。'),tr('我只是在这儿看书。浇水的事归你。'),tr('花开了可以剪一枝，插到客舱的小瓶里。')],
  dome:[tr('把灯关了，眼睛别动，等一会儿。暗的星要等。'),tr('有几颗星一阵一阵亮的。线可以先连过去，悬着。'),tr('这些星一天转一圈。你连的线，明天这个时候又会转回头顶。'),tr('我在对图。你连你的。')]
};
export const ROUTE_IDLE = { harbor:[tr('港口的灯还看得见，再过一会儿就没了。'),tr('这条船的舵是自己转的。我们只管坐着。')], nebula:[tr('星云里的声音好像传得远一些。至少看起来是这样。'),tr('这片雾每次经过都不太一样。')], ring:[tr('环带上的碎冰，被灯一照就亮。'),tr('绕完这半圈要很久。不着急。')], quiet:['……'] };
ACT['an:talk'] = { tap(){
  AU.tap(); const room = S.room;
  if (room === 'cabin' && anAsleep()){ say(tr('她睡着了，呼吸很慢。航图从膝盖上滑下来一点。')); return; }
  if (room === 'cabin'){
    if (S.pendingNames.length){ say(COL[S.pendingNames.shift()].line, AN); return; }
    if (once('hello')){ say(tr('这趟船走得慢。我在画这一段的航图，你忙你的就好。'), AN); return; }
    if (G.lamp === 0 && !G.bulbs.length && once('t-refl')){ say(tr('舱里亮着的时候，窗户只照得出我们自己。'), AN); return; }
    if (G.lamp > 0 && !G.bulbs.length && once('t-lantern')){ say(tr('外面那些是航标。拿桌上的提灯照它一下，颜色对上了，它会回你。'), AN); return; }
    if (once('t-map')){ say(tr('想换航道，点一下航道牌，或者我腿上的图。'), AN); return; }
    if (once('t-ring')){ say(tr('我一天里会到处走。早上在厨房，中午在温室，夜深了上穹顶。'), AN); return; }
    say(pick(Math.random() < .5 ? (ROUTE_IDLE[G.route] || AN_LINES.cabin) : AN_LINES.cabin), AN); return;
  }
  const L = AN_LINES[room]; if (!L) return; S.anI = (S.anI || 0) + 1; say(L[S.anI % L.length], AN);
}};
