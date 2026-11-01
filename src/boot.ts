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
import { buildRadio } from './rooms/radio';
import { ROOMS, ROOM_KEY, setAmbience, updateHud } from './rooms/registry';
import { advance } from './state/progress';
import { S } from './state/runtime';
import { cloudInit, persist, readLocal, withTimeout } from './state/save';
import { G, setG, migrate } from './state/store';
import { now } from './state/time';
import { showAway } from './ui/away';
import { addLog, say } from './ui/captions';
import { updateMailbox } from './ui/mail';
import { CAM } from './core/camera';

/* ================= BOOT ================= */
export function applyLoaded(){
  document.body.classList.toggle('reduced', !!G.reduced);
  restoreCabin(); updateMailbox();
  S.phi = G.ang || 0; S.kp = { ...KPOS[G.kettle.pos === 'pour' ? 'stove' : G.kettle.pos] };
  S.vis = [.1,.55,1][G.lamp]; S.lieK = G.lie ? 1 : 0; S.lampK = G.growLamp ? 1 : 0; S.dLamp = G.domeLight ? 1 : 0;
  $('#bSound').textContent = G.sound ? tr('声音 开') : tr('声音 关');
  CACHE.clear();
  const returning = G.visits > 0;
  if (returning){
    const gap = Math.max(0, now() - (G.lastSeen || now()));
    $('#introLead').textContent = tr('欢迎回来。船一直在走。');
    $('#introBody').textContent = (gap > MIN ? tr('上次下船是 {0}前。', durText(gap)) : '') + tr('面团、种子、信件和星线，都在你离开时的地方，只是多走了一段时间。');
    $('#board').textContent = tr('回到船上');
    $('#introFine').textContent = tr('夜航 No.{0} · 第 {1} 夜。东西不会因为你没来而坏掉。', G.no, Math.max(1,G.nights.length));
  }
}
export let saveReady = null;
export function start(hot){
  S.room = 'cabin'; S.vis = .1; S.mx = 440; S.my = 300; S.lampFil = 1; S.readGlow = 0; S.turnX = 0;
  buildCorridor(); buildCabin(); buildGalley(); buildGreen(); buildRadio(); buildDome();
  resize(true);
  new ResizeObserver(() => resize()).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { CACHE.clear(); });
  const local = readLocal();
  const hotG = hot && hot.G && hot.G.v === 2 ? hot.G : null;
  $('#board').disabled = true; $('#boardMute').disabled = true; const label = $('#board').textContent; $('#board').textContent = tr('正在找你的船票…');
  saveReady = withTimeout(cloudInit(), 4000).then(cloud => {
    const cands = [hotG, local, cloud].filter(Boolean).sort((a,b) => (b.savedAt||0) - (a.savedAt||0));
    if (cands.length) setG(migrate(JSON.parse(JSON.stringify(cands[0]))));
    applyLoaded();
  }).catch(err => { console.error(err); applyLoaded(); }).finally(() => {
    $('#board').disabled = false; $('#boardMute').disabled = false; if ($('#board').textContent === tr('正在找你的船票…')) $('#board').textContent = label;
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
  setViewFocus(CAM.zx, CAM.zy);
  if (room === 'corridor'){ S.phi = G.ang || 0; S.phiTarget = nearestStation().ang; }
  RR.enter('intro');
  if (first) say(tr('末班船离港了。下一站很远，船会自己开。'), null, 900);
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
