import { tr } from './i18n';
import { AU } from './audio/index';
import { M } from './audio/music';
import { CACHE, dropCaches } from './core/cache';
import { frame } from './core/loop';
import { cv, resize, setViewFocus } from './core/surface';
import { $, MIN, dayKey, durText, stage } from './core/util';
import { buildCabin, restoreCabin } from './rooms/cabin';
import { buildCorridor, nearestStation } from './rooms/corridor';
import { buildDome } from './rooms/dome';
import { KPOS, buildGalley } from './rooms/galley';
import { buildGreen } from './rooms/green';
import { buildHatch, callPort, docked } from './rooms/hatch';
import { buildRadio } from './rooms/radio';
import { ROOMS, ROOM_KEY, setAmbience, updateHud } from './rooms/registry';
import { advance } from './state/progress';
import { S } from './state/runtime';
import { SV, cloudInit, lastSlot, migrateLegacyLocal, persist, readLocal, setSlot, withTimeout } from './state/save';
import { syncJourney } from './state/journey';
import { G, setG, migrate, freshSave } from './state/store';
import { renderSlots, setCloudSlots, setOnPicked, slotSave } from './ui/slots';
import { now } from './state/time';
import { showAway } from './ui/away';
import { addLog, say } from './ui/captions';
import { updateMailbox } from './ui/mail';
import { CAM, resetView, setPanRange } from './core/camera';

/* ================= BOOT ================= */
export function applyLoaded(){
  document.body.classList.toggle('reduced', !!G.reduced);
  syncJourney(G, now());
  restoreCabin(); updateMailbox();
  S.phi = G.ang || 0; S.kp = { ...KPOS[G.kettle.pos === 'pour' ? 'stove' : G.kettle.pos] };
  S.vis = [.1,.55,1][G.lamp]; S.lieK = G.lie ? 1 : 0; S.lampK = G.growLamp ? 1 : 0; S.dLamp = G.domeLight ? 1 : 0;
  $('#bSound').textContent = G.sound ? tr('声音 开') : tr('声音 关');
  CACHE.clear();
  const returning = G.visits > 0;
  if (returning){
    const gap = Math.max(0, now() - (G.lastSeen || now()));
    $('#introLead').textContent = tr('欢迎回来。船一直在走。');
    $('#introBody').textContent = (gap > MIN ? tr('上次下船是 {0}前。', durText(gap)) : '') + tr('东西都在你离开时的地方，只是多走了一段时间。');
    $('#board').textContent = tr('回到船上');
    $('#introFine').textContent = tr('夜航 No.{0} · 第 {1} 夜。', G.no, Math.max(1,G.nights.length));
  } else {
    $('#introLead').textContent = tr('登上一艘夜航船，为沿途的人送去一盏灯。');
    $('#introBody').textContent = tr('选一个目的地，把开花植物装成灯。第一张委托和一盆月铃已经备好。');
    $('#board').textContent = tr('登船');
    $('#introFine').textContent = tr('航程存在这艘船上。下次打开，船还在原处。');
  }
  renderSlots();
}
export let saveReady = null;
export function start(hot){
  S.room = 'cabin'; S.vis = .1; S.mx = 440; S.my = 300; S.lampFil = 1; S.readGlow = 0; S.turnX = 0;
  buildCorridor(); buildCabin(); buildGalley(); buildGreen(); buildRadio(); buildDome(); buildHatch();
  resize(true);
  new ResizeObserver(() => resize()).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { CACHE.clear(); });
  /* Pick up the slot that was last open, show the three cards, and only then go
     looking for the cloud: the door has to be usable before any network does. */
  migrateLegacyLocal();
  setSlot(lastSlot());
  setOnPicked(applyLoaded);
  const hotG = hot && hot.G && hot.G.v === 2 ? hot.G : null;
  const local = hotG && (!readLocal() || (hotG.savedAt||0) > (readLocal().savedAt||0)) ? hotG : readLocal();
  setG(local ? migrate(JSON.parse(JSON.stringify(local))) : freshSave());
  applyLoaded();
  $('#board').disabled = true; $('#boardMute').disabled = true; const label = $('#board').textContent; $('#board').textContent = tr('正在找这艘船…');
  saveReady = withTimeout(cloudInit(), 4000).then(cloud => {
    setCloudSlots(cloud || {});
    const best = slotSave(SV.slot);
    const cands = [hotG, best].filter(Boolean).sort((a,b) => (b.savedAt||0) - (a.savedAt||0));
    if (cands.length) setG(migrate(JSON.parse(JSON.stringify(cands[0]))));
    applyLoaded();
  }).catch(err => { console.error(err); applyLoaded(); }).finally(() => {
    $('#board').disabled = false; $('#boardMute').disabled = false; if ($('#board').textContent === tr('正在找这艘船…')) $('#board').textContent = label;
  });
  requestAnimationFrame(frame);
}
export function board(withSound){
  if (S.started) return;
  G.sound = withSound; AU.on = withSound; AU.init(); AU.setOn(withSound);
  $('#bSound').textContent = withSound ? tr('声音 开') : tr('声音 关');
  const t = now(), first = G.visits === 0, gap = G.lastSeen ? t - G.lastSeen : 0;
  G.visits++; const dk = dayKey(t); if (!G.nights.includes(dk)){ G.nights.push(dk); if (G.nights.length > 400) G.nights.shift(); }
  if (!G.mail.nextAt) G.mail.nextAt = t + 30*MIN;
  S.started = true; S.sessionStart = t;
  const ev = gap > 0 ? advance(gap, 'away') : [];
  addLog(first ? tr('登船') : tr('再次登船'));
  $('#intro').classList.add('out'); setTimeout(() => $('#intro').hidden = true, 900);
  $('#hud').hidden = false; $('#status').hidden = false;
  const room = first ? 'cabin' : (ROOMS[G.lastRoom] ? G.lastRoom : 'corridor');
  S.room = room; dropCaches(['ring:', ROOM_KEY[room], 'sh:']);
  const RR = ROOMS[room]; CAM.zx = (RR.zc || [800,470])[0]; CAM.zy = (RR.zc || [800,470])[1]; CAM.zoom = 1.1;
  setPanRange(...(RR.pan || []));
  resetView(); CAM.panX = 0; CAM.panY = 0; CAM.user = 1;
  setViewFocus(CAM.zx, CAM.zy);
  if (room === 'corridor'){ S.phi = G.ang || 0; S.phiTarget = nearestStation().ang; }
  RR.enter('intro');
  if (first){
    say(tr('第一张委托来自旧码头。点窗间的航向板，选择目的地。'), null, 1100);
  } else if (docked()){ const P = callPort(); if (P) say(tr('船还靠在{0}。舷门那边有人在等。', P.name), null, 1400); }
  updateHud(); setAmbience(); updateMailbox();
  if (!first && gap > 10*MIN) setTimeout(() => showAway(gap, ev), 700);
  else if (!first) say(tr('回到船上了。'), null, 600);
  M.next = 0; persist(true);
  try { cv.focus({ preventScroll:true }); } catch(e){}
}
$('#board').onclick = () => board(true);
$('#boardMute').onclick = () => board(false);
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ G:JSON.parse(JSON.stringify(G)) })); } catch(e){}
export const HOT = window.claude && window.claude.hot;
if (HOT && HOT.ready) HOT.ready(start); else start((HOT && HOT.data) || {});
