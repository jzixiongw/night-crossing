import { tr } from '../i18n';
import { VIEW, cpt } from '../core/camera';
import { HITS_PREV, focusables, hitAt, hitCanvasCenter, shapeRadius } from '../core/hits';
import { CW, CH, cv } from '../core/surface';
import { $, escapeHtml, stage } from '../core/util';
import { ACT, go } from '../rooms/registry';
import { G } from '../state/store';
import { S } from '../state/runtime';
import { markDirty } from '../state/save';
import { now } from '../state/time';
import { flowering } from '../state/journey';
import { PORTS } from '../data/ports';
import { say } from './captions';
import { anyOpen } from './panels';
import { GESTURE_GLYPH } from './paper';

interface Next {
  id: string; phase: number; room: string; act: string; view?: string;
  title: string; detail: string; button: string; action: string;
  waiting?: boolean; complete?: boolean;
}

/* The card, projected target, and accessible action all read this same state.
   Visiting a room or losing a caption never advances the tutorial. */
export function nextStep(): Next {
  const base = { phase: 0, room: 'cabin', act: 'cab:route', view: '', waiting: false, complete: false };
  const step = (o: Partial<Next>): Next => ({ ...base, id: '', title: '', detail: '', button: '', action: '', ...o });
  const j = G.journey;
  if (Object.keys(PORTS).every(id => G.calls.some(c => c.id === id))) return step({ id:'all-done', phase:3, complete:true, title:tr('四处都亮起灯了'), detail:tr('送过的灯都记在航行记录里。船上还有地方可以坐坐。'), button:tr('看看航行记录') });
  if ((!j || j.delivered) && S.room === 'radio') {
    if (G.printed) return step({ id:'collect', room:'radio', view:'printer', act:'r:slip', title:tr('取下打印出的委托'), detail:tr('打印机里已有单子。点它取下，再到驾驶舱设定航向。'), button:tr('走近打印机'), action:tr('取下委托') });
    if (!G.radioOn) return step({ id:'radio', room:'radio', view:'radio', act:'r:power', title:tr('打开收音机'), detail:tr('点收音机左侧开关，再左右拖动右侧旋钮。'), button:tr('走近收音机'), action:tr('打开收音机') });
    return step({ id:'tune', room:'radio', view:'radio', act:'r:tune', title:tr('调到调度台'), detail:tr('左右拖动右侧旋钮，调到 1.09。委托会从打印机出来。'), button:tr('走近收音机'), action:tr('左右拖动 · 调到 1.09') });
  }
  /* Handed over and still alongside: the next request can wait. The guide
     points at the porthole by the door, where the parting can be watched. */
  if (j?.delivered && G.call?.gave && G.call.to === j.to)
    return step({ id: 'parting', phase: 3, room: 'hatch', act: '', view: 'porthole', complete: true,
      title: tr('这一趟送到了'), detail: tr('舷门右边有一扇舷窗，看得见外面。'), button: tr('走到舷窗边'), action: '' });
  if (!j || j.delivered) {
    return step({ id: 'complete', phase: 3, room: 'radio', act: 'r:power', view: 'radio', complete: true,
      title: j ? tr('这一趟送到了') : tr('领取下一张委托'),
      detail: j ? tr('{0}的灯亮了。下一张委托在电台室。', PORTS[j.to]?.name || '') : tr('打开收音机，调到 1.09 的调度台。'),
      button: tr('去电台室'), action: tr('打开收音机') });
  }
  if (!j.course) return step({ id: 'course', title: tr('选定目的地'),
    detail: tr('委托已经备好。点窗间的航向板，选择{0}。', PORTS[j.to]?.name || ''),
    button: tr('查看航向板'), action: tr('设定航向') });
  if (!G.rig) {
    const grown = G.pots.findIndex(p => flowering(p, now()));
    if (grown >= 0 && S.spray) return step({ id:'put-can-down', phase:1, room:'green', view:'garden', act:'gh:spray',
      title:tr('先放下喷壶'), detail:tr('植物已经开花。点喷壶原来的位置放下它，再选择植物。'),
      button:tr('去种植区'), action:tr('放下喷壶') });
    if (grown >= 0) return step({ id: 'plant', phase: 1, room: 'green', act: 'gh:plant:' + grown, view: grown >= 5 ? 'nursery' : 'garden',
      title: tr('把开花植物装成灯'), detail: tr('已有一盆开花植物。点它，选择移到装配台。'),
      button: tr('去温室'), action: tr('选择这盆植物') });
    const planted = G.pots.findIndex(Boolean);
    if (planted < 0) return step({ id:'seed', phase:1, room:'green', view:'garden', act:'gh:seeds',
      title:tr('种下一盆植物'), detail:tr('点种子盒，选一种种进空盆。'), button:tr('去种植区'), action:tr('选择种子') });
    const dry = G.pots.findIndex(p => p && p.water <= 0);
    if (dry >= 0) return step({ id:S.spray ? 'water' : 'can', phase:1, room:'green', view:dry >= 5 ? 'nursery' : 'garden',
      act:S.spray ? 'gh:pot:' + dry : 'gh:spray', title:tr('土干了，浇一点水'),
      detail:tr('点喷壶拿起来，再点干土的花盆。'), button:tr('去种植区'), action:S.spray ? tr('给这盆浇水') : tr('拿起喷壶') });
    if (!G.growLamp) return step({ id:'grow-light', phase:1, room:'green', view:'garden', act:'gh:lamp',
      title:tr('打开生长灯'), detail:tr('点上方的生长灯，花苞会长得快一些。'), button:tr('去种植区'), action:tr('打开生长灯') });
    const minutes = Math.max(1, Math.ceil(Math.min(...G.pots.filter(Boolean).map(p => Math.max((1 - p.g)*8/1.35, ((p.bloomAt || 0) - now())/60000)))));
    return step({ id:'growing', phase:1, room:'galley', act:'', waiting:true,
      title:tr('植物正在生长'), detail:tr('花苞正在长大，预计还需约 {0} 分钟。', minutes), button:tr('去厨房坐坐') });
  }
  if (!G.rig.glass) return step({ id: 'glass', phase: 1, room: 'green', act: 'gh:work:glass', view: 'bench',
    title: tr('扣上玻璃罩'), detail: tr('植物已经放好。点装配台左边的玻璃罩。'),
    button: tr('走近装配台'), action: tr('扣上玻璃罩') });
  if (!G.rig.lit) return step({ id: 'lamp', phase: 1, room: 'green', act: 'gh:work:lamp', view: 'bench',
    title: tr('安装灯头'), detail: tr('玻璃罩已经扣好。点右边灯盘上的灯头。'),
    button: tr('走近装配台'), action: tr('安装灯头') });
  if (!G.call?.docked) return step({ id: 'sailing', phase: 2, room: 'galley', act: '', view: '', waiting: true,
    title: tr('植物灯装好了'), detail: tr('船正在前往目的地。到港时，这里会亮起提示。'),
    button: tr('去厨房坐坐'), action: '' });
  if (S.offer && S.room === 'hatch') return step({ id: 'let-go', phase: 2, room: 'hatch', view: 'handover', act: 'hat:give',
    title: tr('松手'), detail: tr('灯已经在{0}手里了。再点一下，松开手。', PORTS[G.call.to]?.who || ''),
    button: tr('去舷梯'), action: tr('松手') });
  return step({ id: S.doorOpen ? 'give' : 'door', phase: 2, room: 'hatch', view: 'handover',
    act: S.doorOpen ? 'hat:give' : 'hat:door', title: tr('把灯送到门外'),
    detail: S.doorOpen ? tr('门外有人正在等。点他，把植物灯递过去。') : tr('船已经靠好。点舷门把手，打开门。'),
    button: tr('去舷梯'), action: S.doorOpen ? tr('把灯递过去') : tr('打开舷门') });
}

const guide = document.createElement('section');
guide.id = 'voyageGuide'; guide.hidden = true; guide.setAttribute('aria-label', tr('当前步骤'));
guide.innerHTML = `<button type="button" class="guide-heading" aria-expanded="true"><span class="guide-sigil" aria-hidden="true">✦</span><span class="guide-kicker"></span><span class="guide-now"></span><span class="guide-fold" aria-hidden="true">−</span></button><div class="guide-body"><ol class="guide-track"></ol><h2></h2><p class="guide-detail"></p><div class="guide-supplies"></div><div class="guide-travel"><span></span><progress max="1"></progress></div><button class="guide-go" type="button"></button><div class="guide-controls"><button type="button" class="guide-replay"></button><button type="button" class="guide-skip"></button></div></div>`;
stage.appendChild(guide);
const q = <T extends HTMLElement>(s: string) => guide.querySelector<T>(s)!;
const heading = q<HTMLButtonElement>('.guide-heading');
const target = document.createElement('button');
target.type = 'button'; target.id = 'guideTarget'; target.hidden = true;
target.innerHTML = '<span class="target-ring" aria-hidden="true"></span><span class="target-label"></span>';
stage.appendChild(target);
let targetPinned = false, targetId = '', tuckedFor = '';
target.addEventListener('pointerenter', () => { targetPinned = true; });
target.addEventListener('pointerleave', () => { targetPinned = false; });
target.addEventListener('focus', () => { targetPinned = true; });
target.addEventListener('blur', () => { targetPinned = false; });
const hover = document.createElement('div'); hover.id = 'actionHint'; hover.hidden = true;
stage.appendChild(hover);
const help = document.createElement('button');
help.type = 'button'; help.id = 'guideRestore'; help.className = 'pill'; help.textContent = tr('下一步'); help.hidden = true;
stage.appendChild(help);

function setGuide(enabled: boolean){
  G.guide ||= { enabled:true, collapsed:false };
  G.guide.enabled = enabled; markDirty();
}
heading.onclick = () => { G.guide.collapsed = !G.guide.collapsed; markDirty(); };
q<HTMLButtonElement>('.guide-skip').textContent = tr('自由探索');
q<HTMLButtonElement>('.guide-skip').onclick = () => setGuide(false);
q<HTMLButtonElement>('.guide-replay').textContent = tr('重看提示');
q<HTMLButtonElement>('.guide-replay').onclick = () => say(nextStep().detail);
help.onclick = () => { setGuide(true); G.guide.collapsed = false; };

function useHit(h: any){
  if (S.trans || S.camMove || S.guideNavigating || anyOpen()) return;
  const parts = h.act.split(':');
  for (let n = parts.length; n > 0; n--) {
    const a = ACT[parts.slice(0, n).join(':')];
    if (!a) continue;
    const args = parts.slice(n);
    if (a.tap) a.tap(args, null, h.keyPt?.(), h);
    else if (a.key) a.key(args);
    break;
  }
}
target.onclick = () => {
  const n = nextStep();
  const h = HITS_PREV.find(h => h.key === n.act || h.act === n.act || (n.act === 'cab:route' && h.key === 'cab:route'));
  if (h) useHit(h);
};

// Navigation locates the work; only an explicit object action changes it.
let navigation = 0;
function locate(){
  const n = nextStep(), ticket = ++navigation;
  if (anyOpen()) return;
  if (n.id === 'all-done') { ACT['ui:ticket'].tap(); return; }
  S.guideNavigating = true;
  if (S.room !== n.room) go(n.room);
  let attempts = 0;
  const arrive = () => {
    if (ticket !== navigation || !S.started) { S.guideNavigating = false; return; }
    if ((S.trans || S.camMove || S.room !== n.room) && attempts++ < 30) { setTimeout(arrive, 100); return; }
    if (S.room !== n.room || S.trans || S.camMove) { S.guideNavigating = false; return; }
    S.guideNavigating = false;
    if (n.act === 'cab:route') { ACT['cab:route'].tap(); return; }
    VIEW.focus('', n.view || undefined);
  };
  arrive();
}
q<HTMLButtonElement>('.guide-go').onclick = locate;

let pointer: { X: number; Y: number } | null = null;
cv.addEventListener('pointermove', e => { pointer = cpt(e); });
cv.addEventListener('pointerleave', () => { pointer = null; hover.hidden = true; });
cv.addEventListener('pointerdown', () => { hover.hidden = true; });

const ACTIONS: Record<string, [string, string]> = {
  'cab:route': ['设定航向', '点按'], 'cab:lamp': ['调节吊灯', '点按'],
  'cab:lantern': ['切换提灯颜色', '点按'], 'cab:glass': ['哈气，再在雾上画画', '按住 · 拖画'],
  'gh:work:plant': ['把开花植物移到装配台', '点按'], 'gh:work:glass': ['扣上玻璃罩', '点按'],
  'gh:work:lamp': ['安装灯头', '点按'], 'gh:plant': ['查看植物的用途', '点按'],
  'gh:pot': ['转动花盆', '拖动'], 'gh:spray': ['拿起或放下喷壶', '点按'],
  'r:tune': ['调到 1.09 的调度台', '左右拖动'], 'r:power': ['开关收音机', '点按'],
  'r:crank': ['给八音盒上发条', '顺时针画圈'], 'r:strip': ['在纸带上打孔', '点按 · 拖动'],
  'gal:dough': ['揉面团', '左右拖动'], 'gal:kettle': ['移动水壶，热水烧好后按住倒水', '点按 · 按住'],
  'hat:door': ['打开舷门', '点按'], 'hat:give': ['把灯递过去', '点按']
};
/* [what it does, translated; the gesture's source string, for its glyph] */
function actionFor(h: any): [string, string] {
  if (h.act.startsWith('view:')) return [h.label, '走近'];
  if (h.act.startsWith('inspect:')) return [h.label, '走近查看'];
  let id = h.act;
  while (id) {
    if (ACTIONS[id]) return [tr(ACTIONS[id][0]), ACTIONS[id][1]];
    id = id.split(':').slice(0, -1).join(':');
  }
  return [h.label || '', '点按'];
}
/* The hover label keeps clear of the other paper on screen: below the pointer
   if it can, above it if that would land on the guide or the target's label. */
function avoid(el: HTMLElement){
  el.classList.remove('above');
  const hit = (r: DOMRect) => ['#voyageGuide', '#guideTarget .target-label', '#caption.on', '#views', '#hud', '#nav'].some(s => {
    const o = stage.querySelector(s) as HTMLElement | null; if (!o || o.offsetParent === null) return false;
    const b = o.getBoundingClientRect(); return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top; });
  if (hit(el.getBoundingClientRect())) el.classList.add('above');
}
function position(el: HTMLElement, X: number, Y: number){
  el.style.left = Math.min(90, Math.max(10, X/CW*100)) + '%';
  el.style.top = Math.min(77, Math.max(25, Y/CH*100)) + '%';
}

let last = '', lastSpeech = '', lastHover = '', hoverHtml = '';
const spoken = document.createElement('div'); spoken.className = 'sr-only'; spoken.setAttribute('role', 'status'); spoken.setAttribute('aria-live', 'polite'); guide.appendChild(spoken);
export function updateGuide(){
  if (!S.started) { guide.hidden = target.hidden = help.hidden = hover.hidden = true; return; }
  G.guide ||= { enabled:true, collapsed:false };
  const enabled = G.guide.enabled, blocked = anyOpen() || S.trans || S.camMove || S.guideNavigating;
  q<HTMLButtonElement>('.guide-go').disabled = !!(S.trans || S.camMove || S.guideNavigating);
  guide.hidden = !enabled || anyOpen(); help.hidden = enabled || anyOpen();
  guide.classList.toggle('collapsed', !!G.guide.collapsed);
  heading.setAttribute('aria-expanded', String(!G.guide.collapsed));
  q('.guide-fold').textContent = G.guide.collapsed ? '+' : '−';
  const n = nextStep(), P = G.call ? PORTS[G.call.to] : null;
  const destination = PORTS[G.journey?.to]?.name || tr('下一趟');
  const supplies = !G.calls.length && n.id === 'course' && G.pots.some(p => flowering(p, now()));
  const signature = JSON.stringify([supplies, n.id, n.title, n.detail, n.button, destination, G.calls.length, G.guide.collapsed]);
  if (signature !== last) {
    last = signature;
    q('.guide-kicker').textContent = G.calls.length ? tr('航程指引') : tr('第一趟 · {0}', destination);
    q('h2').textContent = n.title; q('.guide-detail').textContent = n.detail; q('.guide-now').textContent = n.title;
    q('.guide-go').textContent = n.button;
    q('.guide-track').innerHTML = ['航向', '装灯', '交付'].map((s, i) => `<li class="${i < n.phase ? 'done' : i === n.phase ? 'current' : ''}"><span>${i < n.phase ? '✓' : i + 1}</span>${tr(s)}</li>`).join('');
    q('.guide-supplies').textContent = supplies ? tr('委托已备好 · 月铃已开花') : '';
    guide.classList.toggle('complete', !!n.complete);
    if (lastSpeech !== n.id) { spoken.textContent = n.title + '。' + n.detail; lastSpeech = n.id; }
  }
  const travel = q('.guide-travel'); travel.hidden = !P;
  if (P) {
    const left = Math.max(0, Math.ceil((G.call.eta - now())/1000));
    travel.querySelector('span')!.textContent = G.call.docked ? tr('已到港 · {0}', P.name) : tr('前往{0} · {1}:{2}', P.name, Math.floor(left/60), String(left%60).padStart(2, '0'));
    (travel.querySelector('progress') as HTMLProgressElement).value = G.call.docked ? 1 : Math.min(1, Math.max(0, 1 - left/(P.mins*60)));
  }
  target.hidden = true;
  let ringed = false;
  if (enabled && !blocked && !n.complete && n.room === S.room && n.act) {
    const match = focusables().find(({ h }) => h.act === n.act || h.key === n.act);
    if (match) {
      target.hidden = false; target.disabled = n.act === 'r:tune';
      target.style.pointerEvents = n.act === 'r:tune' ? 'none' : '';
      if (!targetPinned || targetId !== n.id) position(target, Math.round(match.X/2)*2, Math.round(match.Y/2)*2);
      /* the ring goes round the thing, not a fixed size; the button stays a fingertip */
      const ring = Math.round(Math.min(170, Math.max(58, shapeRadius(match.h)*2*stage.clientWidth/CW + 18))/4)*4 + 'px';
      if (target.style.getPropertyValue('--ring') !== ring) target.style.setProperty('--ring', ring);
      targetId = n.id;
      target.querySelector('.target-label')!.textContent = n.action;
      target.setAttribute('aria-label', n.action);
      ringed = true;
      /* A guide that lands on the thing it points at folds its secondary lines
         away (the step title stays) until the step changes; measured only while
         untucked, so it cannot flicker between the two. */
      if (tuckedFor !== n.id && !G.guide.collapsed) {
        const a = guide.getBoundingClientRect(), r = target.querySelector('.target-ring')!.getBoundingClientRect();
        if (r.width && r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top) tuckedFor = n.id;
      }
    }
  }
  if (!ringed) tuckedFor = '';
  guide.classList.toggle('tuck', ringed && tuckedFor === n.id);
  hover.hidden = true;
  if (!blocked && !S.drag) {
    const found = S.focusKey ? HITS_PREV.find(h => h.key === S.focusKey) : pointer ? hitAt(pointer.X, pointer.Y)?.h : null;
    if (found?.label) {
      const [label, gesture] = actionFor(found);
      if (label) {
        const [X, Y] = hitCanvasCenter(found), at = pointer && !S.focusKey ? pointer : { X, Y };
        const html = `<b>${escapeHtml(label)}</b><span class="g"><i style="--gl:var(--gl-${GESTURE_GLYPH[gesture] || 'tap'})" aria-hidden="true"></i>${escapeHtml(tr(gesture))}</span>`;
        hover.hidden = false;
        if (hoverHtml !== html) { hoverHtml = html; hover.innerHTML = html; }
        position(hover, at.X, at.Y);
        const sig = html + (at.X|0) + ',' + (at.Y|0);
        if (sig !== lastHover) { lastHover = sig; avoid(hover); }
      }
    }
  }
}
