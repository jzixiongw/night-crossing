import { tr } from '../i18n';
import { HOUR, MIN } from '../core/util';
import { LETTERS, SEEDS } from '../data/index';
import { portById } from '../data/ports';
import { LINGER } from '../rooms/hatch';
import { galleyWarm, renderDough, renderPears } from '../rooms/galley';
import { WATER_MS, bloomReady } from '../rooms/green';
import { S } from './runtime';
import { markDirty } from './save';
import { G } from './store';
import { now } from './time';
import { addLog, say } from '../ui/captions';
import { updateMailbox } from '../ui/mail';

/* ================= TIME SYSTEMS ================= */
export const STAGE_TXT = {
  vine:[tr('星藤冒芽了'),tr('星藤往木棍上爬了一截'),tr('星藤的叶子长满了'),tr('星藤开花了，花是五个尖的')],
  bell:[tr('月铃冒出两片圆叶'),tr('月铃的细茎分开了'),tr('月铃的茎尖垂下来'),tr('月铃挂上了铃')],
  fern:[tr('雾蕨探出一个卷着的嫩芽'),tr('雾蕨打开了第一片叶'),tr('雾蕨的叶子一圈圈展开'),tr('雾蕨全展开了，叶尖挂着水珠')],
  lamp:[tr('纸灯果顶出两片厚叶'),tr('纸灯果的茎上分出了节'),tr('纸灯果挂出了第一个灯笼'),tr('纸灯果的灯笼亮起来了')],
  moss:[tr('潮苔在土上铺开一小片'),tr('潮苔鼓成了一个小丘'),tr('潮苔长出了细丝'),tr('潮苔的丝尖上结了白点')],
  tree:[tr('伞木立起了一根小木茎'),tr('伞木摊开了第一层叶'),tr('伞木又摊开了一层'),tr('伞木的伞底下挂出了花')]
};
export function advance(ms, mode){
  const ev = [];
  if (!(ms > 0)) return ev;
  const tnow = now();
  G.mapLen += ms/HOUR;
  G.tea.temp = Math.max(0, G.tea.temp - ms/(15*MIN));
  if (!S.heating) G.kettle.hot = Math.max(0, G.kettle.hot - ms/(10*MIN));
  if (G.tea.leaves && G.tea.level > 0 && G.tea.steep < 1){ const b = G.tea.steep; G.tea.steep = Math.min(1, G.tea.steep + ms/40000); if (b < 1 && G.tea.steep >= 1 && G.tea.kind !== 'water') ev.push({ room:'galley', text:tr('杯里的茶泡开了。') }); }
  // dough
  if (G.dough.st === 'proofing'){
    const warm = (mode === 'here' || mode === 'companion') && galleyWarm() ? 1.5 : 1;
    G.dough.proof += ms/(20*MIN)*warm;
    if (G.dough.proof >= 1){ G.dough.st = 'proofed'; S.doughDirty = true; ev.push({ room:'galley', text:tr('发酵箱里的面团发好了，胖了一圈。'), any:true }); }
  } else if (G.dough.st === 'proofed') G.dough.proof = Math.min(1.25, G.dough.proof + ms/(60*MIN));
  // pears refill
  if (G.pears < 3){ if (!G.pearAt) G.pearAt = tnow; let added = 0; while (G.pears < 3 && tnow - G.pearAt >= 45*MIN){ G.pears++; added++; G.pearAt += 45*MIN; } if (G.pears >= 3) G.pearAt = 0; if (added) ev.push({ room:'galley', text:tr('邻船又送来几个星梨，果盘满了一些。') }); }
  // plants
  const rate = ({ here:1/(35*MIN), companion:1/(25*MIN), hidden:1/(120*MIN), away:1/(120*MIN) })[mode] * (G.growLamp ? 1.35 : 1);
  G.pots.forEach((p,i) => {
    if (!p) return;
    const before = p.g, wasWet = p.water > 0, wasBloom = bloomReady(p);
    if (p.water > 0){ const eff = Math.min(ms, p.water*WATER_MS); p.g = Math.min(1, p.g + eff*rate); }
    p.water = Math.max(0, p.water - ms/WATER_MS);
    if (p.g > .2){ if (!G.growLamp) p.lean = Math.min(1, p.lean + ms/(60*MIN)*(1 - p.lean)); else p.lean *= Math.exp(-ms/(30*MIN)); }
    const s0 = Math.floor(before*4 + 1e-9), s1 = Math.floor(p.g*4 + 1e-9);
    if (s1 > s0 && s1 >= 1){ ev.push({ room:'green', text:STAGE_TXT[p.sp][Math.min(3, s1-1)] + '。', any:s1 === 4 }); if (s1 === 4) addLog(STAGE_TXT[p.sp][3]); }
    else if (before < .02 && p.g >= .02) ev.push({ room:'green', text:STAGE_TXT[p.sp][0] + '。' });
    if (wasWet && p.water <= 0) ev.push({ room:'green', text:tr('{0}的土干了，它停下来等水。', SEEDS[p.sp].name) });
    if (!wasBloom && bloomReady(p) && before >= 1) ev.push({ room:'green', text:tr('{0}又开了。', SEEDS[p.sp].name) });
  });
  // music box plays out while nobody is listening
  if (mode === 'hidden' || mode === 'away'){ if (G.wind > 0){ G.wind = Math.max(0, G.wind - ms/(360*16)); if (G.wind <= 0) ev.push({ room:'radio', text:tr('八音盒转完了，停在那儿。') }); } }
  /* The round. The ship comes alongside on its own schedule and then holds
     there, so an arrival is news waiting at the door rather than a thing that
     can be missed. Nothing about the call advances until the door is opened. */
  if (G.call && !G.call.docked && G.call.eta && tnow >= G.call.eta){
    G.call.docked = tnow;
    const P = portById(G.call.to);
    if (P){ ev.push({ room:'corridor', text:tr('船靠上了{0}。舷门那边有人在等。', P.name), any:true, dock:true });
      addLog(tr('靠上{0}', P.name)); }
  }
  /* The ship casts off again on a clock, not on the player still being in the
     room, so a tab closed between the handover and the parting still ends the
     call instead of leaving the ship tied up at a port it has finished with. */
  if (G.call && G.call.gave && tnow - G.call.gave > LINGER && S.room !== 'hatch'){ G.call = null; markDirty(); }
  // mail boat
  let guard = 0;
  while (G.mail.nextAt && tnow >= G.mail.nextAt && guard++ < 60){
    const at = G.mail.nextAt;
    if (G.mail.box.length < 3 && G.mail.idx < LETTERS.length){ const L = LETTERS[G.mail.idx++]; G.mail.box.push(L.id); G.mail.arrived[L.id] = at; ev.push({ room:'corridor', text:tr('邮船靠了一次舷。信箱里多了一封信。'), any:true, mail:true }); addLog(tr('收到一封信：{0}', L.from)); }
    G.mail.out.forEach(o => { if (!o.sent){ o.sent = at; ev.push({ room:'corridor', text:tr('你写的明信片随邮船走了。') }); addLog(tr('明信片随邮船寄出')); } });
    G.mail.nextAt += 2*HOUR;
  }
  if (ev.length) markDirty();
  return ev;
}
export function liveEvents(ev){
  ev.forEach(e => { if (e.room === S.room || e.any) say(e.text); });
  if (ev.some(e => e.mail)) updateMailbox();
  if (S.doughDirty) renderDough();
  if (ev.some(e => e.room === 'galley')) renderPears();
}
