import { tr, isEN } from '../i18n';
import { AU } from '../audio/index';
import { drawVisitor, holdPt, visitorGlow } from '../characters/visitor';
import { layerCache } from '../core/cache';
import { setL } from '../core/camera';
import { K_NR, K_SP, K_WL } from '../core/depth';
import { drawFX, drawPuffs } from '../core/fx';
import { hit } from '../core/hits';
import { glowL, hole, lightBegin } from '../core/light';
import { MAT } from '../core/materials';
import { SFOG, SWARM, blob, ell, flat, glowAt, leafPath, rr, shadow, spr, stemPath, txt, txtFit, vol } from '../core/paint';
import { shell } from '../core/shell';
import { MIN, mixHex, mulberry32 } from '../core/util';
import { portById } from '../data/ports';
import { SEEDS } from '../data/index';
import { ACT, ROOMS, setCtx } from './registry';
import { S } from '../state/runtime';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { now } from '../state/time';
import { addLog, once, say } from '../ui/captions';

/* ================= THE GANGWAY =================
   Where the round becomes visible. Every other room is the ship talking to
   itself; this is the one place the ship opens onto somebody else's.

   The door only opens alongside, and the ship holds alongside until it is
   opened, so arriving is never something the player can miss by being away.
   What is on the far side is painted per port: a few shapes and one light,
   which is as much of anyone's home as a doorway ever shows. */
export const HAT_SHELL = { kb:.62, kf:1.75, b:[200,60,1400,680], f:[-340,-280,1940,1180],
  ceil:[[0,'rgba(58,78,112,.3)'],[1,'rgba(10,16,30,.85)']], floor:[[0,'#2b3752'],[.4,'#3a4868'],[1,'#1c2538']],
  side:[[0,'rgba(50,68,102,.4)'],[1,'rgba(10,16,30,.9)']], seams:8, seamCol:'rgba(6,10,22,.32)' };
export const DOOR = { x0:612, x1:988, y0:214, y1:688 };
export const STAND = { x:386, y:734 };

export function buildHatch(){
  const R = mulberry32(911); S.hatMotes = [];
  for (let i=0;i<40;i++) S.hatMotes.push({ x:620 + R()*360, y:240 + R()*420, v:4 + R()*10, r:.6 + R()*1.2, ph:R()*6 });
  S.doorK = 0; S.portK = 0; S.holdK = 0;
}
/* ---- the round, read off the save ---- */
export function callPort(){ return G.call ? portById(G.call.to) : null; }
export function docked(){ return !!(G.call && G.call.docked); }
export function rigDone(){ return !!(G.rig && G.rig.glass && G.rig.lit); }
export function gave(){ return !!(G.call && G.call.gave); }
/* How long the ship stays alongside after the lamp changes hands. The room runs
   the parting on a timer; advance() clears the call on the same clock, so a tab
   closed in those few seconds does not leave the ship docked for ever. */
export const LINGER = 20000;
export function visits(id){ return G.calls.filter(c => c.id === id).length; }
export function etaLeft(){ return G.call && G.call.eta ? Math.max(0, G.call.eta - now()) : 0; }

/* ---- what the door opens onto ---- */
export function portBack(c, P, lit = 0){
  const hazy = spr(P.look.lamp);
  const g = c.createLinearGradient(0, 120, 0, 760);
  const sky = { dock:['#131d33','#2b3450'], echo:['#1a1430','#33264c'], bell:['#07202b','#154050'], ship:['#06090f','#101728'] }[P.id] || ['#131d33','#2b3450'];
  g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); c.fillStyle = g; c.fillRect(560, 120, 480, 660);
  c.globalAlpha = .4; c.drawImage(hazy, 600, 300, 420, 320); c.globalAlpha = 1;
  const R = mulberry32(P.look.h);
  for (let i=0;i<26;i++){ c.globalAlpha = .4 + R()*.5; c.fillStyle = '#dfe9f3'; c.fillRect(580 + R()*440, 150 + R()*300, 1.4, 1.4); }
  c.globalAlpha = 1;
  if (P.id === 'dock'){
    /* decking, two pilings and the old lamp the keeper has been wiping */
    vol(c, cc => rr(cc, 540, 630, 520, 150, 0), MAT.woodD, { k:3, s:8, tex:.7 });
    for (let x=560;x<1060;x+=46) flat(c, cc => rr(cc, x, 632, 5, 148, 2), '#2a1810', .55);
    for (const x of [648, 952]) vol(c, cc => rr(cc, x-17, 430, 34, 210, 6), MAT.woodD, { k:2.5, s:6, tex:.6 });
    vol(c, cc => rr(cc, 930, 300, 9, 150, 4), MAT.metalD, { k:1.5, s:4 });
    vol(c, cc => ell(cc, 934, 292, 19, 22), MAT.glass, { k:1.5, s:4, tex:0 });
    flat(c, cc => ell(cc, 934, 292, 11, 13), '#6d5c3a', .9);
    if (lit > .02){
      /* the railing the ring of light finds, and the ring itself */
      c.globalAlpha = lit;
      vol(c, cc => rr(cc, 560, 596, 480, 9, 4), MAT.woodD, { k:1.4, s:3.5, tex:.4 });
      for (let x=580;x<1040;x+=76) vol(c, cc => rr(cc, x, 600, 10, 40, 4), MAT.woodD, { k:1, s:2.5, tex:.4 });
      c.globalAlpha = 1;
    }
  } else if (P.id === 'echo'){
    /* a buoy's wet deck, and the ring it hangs its sound from */
    vol(c, cc => ell(cc, 800, 740, 280, 70), MAT.tealD, { k:3, s:8, tex:.6 });
    vol(c, cc => rr(cc, 700, 420, 200, 300, 40), MAT.tealD, { k:3.5, s:9, r:2, hl:[730,460,90,.18] });
    vol(c, cc => { ell(cc, 800, 392, 86, 86); ell(cc, 800, 392, 58, 58); }, MAT.metalD, { k:2, s:5, eo:true });
    c.globalAlpha = .34; c.drawImage(SFOG, 560, 480, 480, 300); c.globalAlpha = 1;
  } else if (P.id === 'bell'){
    /* ice, and the bell itself filling most of the doorway */
    vol(c, cc => blob(cc, [[520,780],[600,700],[760,724],[900,688],[1060,760],[1060,800],[520,800]]), MAT.glass, { k:3, s:8, tex:.5 });
    vol(c, cc => { cc.moveTo(690,640); cc.bezierCurveTo(690,440, 740,300, 800,290); cc.bezierCurveTo(860,300, 910,440, 910,640); cc.closePath(); },
      MAT.brass, { k:4, s:11, r:2.5, hl:[740,380,120,.22] });
    vol(c, cc => rr(cc, 672, 630, 256, 34, 14), MAT.brass, { k:2, s:5 });
  } else {
    /* the other ship, close enough that one window reads as a room */
    vol(c, cc => blob(cc, [[500,560],[640,470],[900,460],[1080,540],[1080,800],[500,800]]), MAT.navy, { k:4, s:10, r:2.5 });
    vol(c, cc => rr(cc, 700, 510, 180, 96, 26), MAT.frame, { k:2.5, s:6, r:1.5 });
    flat(c, cc => rr(cc, 714, 524, 152, 68, 18), '#2a3550');
    flat(c, cc => rr(cc, 714, 524, 152, 68, 18), P.look.lamp, .55);
  }
}
/* ---- static art ---- */
export function hatWallArt(g){
  const [x0,y0,x1,y1] = HAT_SHELL.b;
  const wg = g.createLinearGradient(0, y0, 0, y1); wg.addColorStop(0, '#36486e'); wg.addColorStop(.5, '#405581'); wg.addColorStop(1, '#2a3a5c');
  g.fillStyle = wg; g.fillRect(x0, y0, x1-x0, y1-y0);
  for (let i=0;i<7;i++){ const px = x0 + 14 + i*((x1-x0-28)/7); vol(g, cc => rr(cc, px, y0+30, (x1-x0-28)/7 - 12, 600, 10), MAT.wall, { k:2.5, s:6, r:1.5, tex:.5 }); }
  /* the door frame: a heavy collar bolted into the hull */
  vol(g, cc => { rr(cc, DOOR.x0-54, DOOR.y0-54, DOOR.x1-DOOR.x0+108, DOOR.y1-DOOR.y0+108, 56); rr(cc, DOOR.x0, DOOR.y0, DOOR.x1-DOOR.x0, DOOR.y1-DOOR.y0, 26); },
    MAT.metalD, { k:5, s:12, r:3, eo:true });
  for (let k=0;k<22;k++){ const a = k/22*Math.PI*2, cx = 800 + Math.sin(a)*(DOOR.x1-DOOR.x0)*.62, cy = 451 + Math.cos(a)*(DOOR.y1-DOOR.y0)*.56;
    vol(g, cc => ell(cc, cx, cy, 7, 7), MAT.metal, { k:.8, s:2, tex:0 }); }
  /* the lamp over the door, and the sign nobody has repainted */
  vol(g, cc => rr(cc, 762, 128, 76, 30, 10), MAT.metalD, { k:2, s:5 });
  vol(g, cc => rr(cc, 1060, 300, 190, 72, 10), MAT.paper, { k:2, s:5, r:1.5 });
  /* Chinese pairs the name with its romanised tag; in English that is the same
     word twice, so the sign carries the hull number instead. */
  txtFit(g, tr('舷梯'), 1155, 338, 150, 28, '#2a3550');
  txt(g, isEN ? 'No.' + G.no : 'GANGWAY', 1155, 358, 11, '#7d7a72', { mono:true, ls:2 });
}
export function hatFloorArt(g){
  /* the worn band the gangway crew stands on, and the yellow edge of the sill */
  flat(g, cc => rr(cc, 520, 700, 560, 180, 14), '#1b2742', .55);
  flat(g, cc => rr(cc, 540, 712, 520, 14, 7), '#c8a45e', .5);
  for (let i=0;i<9;i++) flat(g, cc => rr(cc, 556 + i*56, 736, 30, 9, 4), '#c8a45e', .22);
}
export function hatNearArt(g){
  shadow(g, 800, 980, 760, 40, .5);
  vol(g, cc => rr(cc, -60, 880, 1720, 160, 20), MAT.metalD, { k:-3, s:-7, lx:.4, ly:.9, r:0, tex:.6 });
  vol(g, cc => rr(cc, -60, 872, 1720, 16, 8), MAT.metal, { k:1.5, s:3.5 });
}
/* ---- the piece, on its stand by the door ---- */
export function drawRig(c, x, y, rig, s = 1){
  if (!rig) return;
  const col = SEEDS[rig.sp].color;
  c.save(); c.translate(x, y); c.scale(s, s);
  shadow(c, 0, 4, 54, 10, .5);
  vol(c, cc => rr(cc, -46, -22, 92, 24, 8), MAT.wood, { k:2, s:5, r:1.5 });
  /* The plant has to carry the picture: without it this is a lamp in a jar.
     A stem, two leaves and one open flower, in the colour of the seed it grew
     from, so the thing being handed over is visibly the thing that was grown. */
  flat(c, cc => ell(cc, 0, -24, 26, 7), '#30211a');
  flat(c, cc => stemPath(cc, 0, -26, -5, -66, 1, -98, 3.4, 2), '#2f6257');
  vol(c, cc => { leafPath(cc, -1, -58, -26, -72, 7, -2); leafPath(cc, 1, -50, 25, -64, 7, 2); }, MAT.leaf, { k:1, s:2.6, tex:.2 });
  vol(c, cc => ell(cc, 1, -104, 15, 13, .2), { l:mixHex(col,'#ffffff',.5), b:col, d:mixHex(col,'#1a2238',.4), r:mixHex(col,'#ffe6c8',.35) }, { k:1.4, s:3.4, tex:0, hl:[-4,-108,9,.5] });
  if (rig.glass){
    /* The cover has to be see-through or the plant it was built around stops
       existing. vol() paints solid, so the whole volume pass runs under a low
       alpha and only the brass collar stays opaque. */
    const dome = cc => { cc.moveTo(-50,-20); cc.bezierCurveTo(-50,-142, 50,-142, 50,-20); cc.closePath(); };
    c.save(); c.globalAlpha = .26;
    vol(c, dome, MAT.glass, { k:2, s:5, r:1.2, tex:.18, ra:.4 });
    c.restore();
    flat(c, dome, '#cfe6f4', .1);
    flat(c, cc => stemPath(cc, -34, -40, -40, -86, -22, -116, 5, 3), '#ffffff', .24);
    vol(c, cc => rr(cc, -54, -26, 108, 14, 6), MAT.brass, { k:1.2, s:3, tex:0 });
  }
  if (rig.lit){
    /* the cap sits down onto the apex, so it reads as fitted rather than afloat */
    vol(c, cc => rr(cc, -15, -128, 30, 18, 8), MAT.brass, { k:1.2, s:3, tex:0 });
    flat(c, cc => ell(cc, 0, -112, 10, 5), '#ffe7bd');
  }
  c.restore();
}
/* ---- actions ---- */
export function openDoor(){
  const P = callPort();
  if (!docked() || !P){ say(tr('门锁着。船还在走。')); return; }
  if (S.doorOpen){ closeDoor(); return; }
  S.doorOpen = true; AU.chain(); AU.soft();
  say(P.near);
  if (once('gangFirst')) say(tr('门外站着一位。你站在门里，船就停在这儿等。'), null, 2600);
  setCtx([{ label:tr('关上舷门'), fn:closeDoor }]);
  hatCtx();
}
export function closeDoor(){ if (!S.doorOpen) return; S.doorOpen = false; AU.chain(); setCtx([]); say(tr('门合上了。外面的声音一下子远了。')); }
export function hatCtx(){
  if (!S.doorOpen){ setCtx([]); return; }
  const acts = [{ label:tr('关上舷门'), fn:closeDoor }];
  if (rigDone()) acts.unshift({ label:tr('把灯递过去'), fn:() => ACT['hat:give'].tap() });
  setCtx(acts);
}
ACT['hat:door'] = { tap(){ openDoor(); } };
ACT['hat:rig'] = { tap(){
  AU.tap();
  if (!G.rig){ say(tr('架子空着。温室的台子上才装得起来。')); return; }
  if (!rigDone()){ say(tr('还差一道。装配台上接着做。')); return; }
  say(tr('玻璃罩里那朵花还开着，灯在它上面一点。'));
}};
ACT['hat:give'] = { tap(){
  const P = callPort();
  if (!P || !docked()){ say(tr('门锁着。船还在走。')); return; }
  if (!S.doorOpen){ openDoor(); return; }
  if (!rigDone()){ say(G.rig ? tr('还差一道。装配台上接着做。') : tr('手上空着。温室的台子上装得起来一盏。')); return; }
  const sp = G.rig.sp;
  AU.soft(); AU.bell(74, .05); AU.bell(81, .035, .22);
  G.calls.push({ id:P.id, at:now(), sp }); G.rig = null; G.call.gave = now();
  say(P.take); say(P.after, null, 2600);
  addLog(tr('在{0}留下一盏灯', P.name));
  markDirty(); hatCtx();
  setTimeout(() => leave(P), 6400);
}};
/* The parting always tidies the room, even when the call has already been
   cleared from under it -- the clock that clears it runs on in-world time,
   which the dev speed control can run twenty times faster than this timer. */
export function leave(P){
  const mine = G.call && G.call.to === P.id;
  S.doorOpen = false; setCtx([]);
  if (mine){ G.call = null; markDirty(); }
  if (S.room === 'hatch'){ AU.chain(); say(P.part); say(tr('航程单上没有下一站了。客舱的牌子上能挑一个。'), null, 2800); }
}
/* ---- the room ---- */
ROOMS.hatch = {
  zc:[800, 470],
  enter(){
    setCtx([]); S.doorOpen = false; S.doorK = 0; S.holdK = gave() ? 1 : 0;
    const P = callPort();
    /* Walked back in on a call that was already handed over: the ship finishes
       casting off now rather than staying tied to a port it is done with. */
    if (P && gave()){ leave(P); return; }
    if (!docked()){
      if (P){ const m = Math.ceil(etaLeft()/MIN);
        say(once('gangWait') ? tr('舷门从里面锁着。船在走的时候它打不开。') : tr('门还锁着。'));
        say(m > 0 ? tr('到{0}还有大约 {1} 分钟。', P.name, m) : tr('快到{0}了。', P.name), null, 2200);
      } else say(tr('舷门锁着。航程单上还没有下一站。'));
      return;
    }
    say(tr('船停住了。门外有脚步声，不快。'));
    if (!rigDone()) say(G.rig ? tr('那盏灯还差一道。') : tr('温室的台子上还空着。'), null, 2600);
  },
  exit(){ S.doorOpen = false; setCtx([]); },
  update(dt){
    S.doorK += ((S.doorOpen ? 1 : 0) - S.doorK)*(1 - Math.exp(-dt*2.6));
    S.portK += ((docked() ? 1 : 0) - S.portK)*(1 - Math.exp(-dt*1.4));
    S.holdK += ((gave() ? 1 : 0) - S.holdK)*(1 - Math.exp(-dt*1.1));
    S.hatMotes.forEach(m => { m.y -= m.v*dt*.3; if (m.y < 230) m.y = 660; });
  },
  back(c){
    setL(c, K_SP);
    c.fillStyle = '#060b16'; c.fillRect(-400, -400, 2400, 1700);
  },
  room(c){
    shell(c, HAT_SHELL);
    const P = callPort(), open = S.doorK;
    layerCache(c, 'hat:floor', 1, hatFloorArt);
    layerCache(c, 'hat:wall', K_WL, hatWallArt);
    /* What is through the door goes on after the wall, because the wall is one
       cached rect with no hole in it, and is clipped to the opening and set on a
       deeper layer so it drifts slower than the hull around it. */
    S.visPt = null;
    if (P && open > .01){
      setL(c, K_WL*.8);
      c.save(); c.beginPath(); rr(c, DOOR.x0+8, DOOR.y0+8, DOOR.x1-DOOR.x0-16, DOOR.y1-DOOR.y0-16, 20); c.clip();
      portBack(c, P, S.holdK);
      const bob = Math.sin(S.T*.6)*4, vy = DOOR.y1 - 60 + bob;
      drawVisitor(c, 800, vy, P.look, { s:1, hold:S.holdK });
      hit(c, 'hat:give', ['r', 800 - P.look.w*.8, vy - P.look.h, P.look.w*1.6, P.look.h], { label:tr(P.who), key:'visitor' });
      c.globalAlpha = (1 - open)*.92; c.fillStyle = '#05080f'; c.fillRect(540, 100, 520, 700); c.globalAlpha = 1;
      c.restore();
      S.visPt = [800, vy];
    }
    /* the two leaves, sliding into the collar */
    setL(c, K_WL);
    const half = (DOOR.x1 - DOOR.x0)/2, slide = open*(half - 10);
    for (const side of [-1, 1]){
      c.save(); c.translate(side*slide, 0);
      vol(c, cc => rr(cc, side < 0 ? DOOR.x0 : 800, DOOR.y0, half, DOOR.y1-DOOR.y0, side < 0 ? 24 : 24), MAT.metal,
        { k:3.5, s:9, r:2, tex:.45, hl:[side < 0 ? DOOR.x0+70 : 860, DOOR.y0+120, 150, .14] });
      for (let k=0;k<4;k++) flat(c, cc => rr(cc, DOOR.x0 + 24 + (side < 0 ? 0 : half), DOOR.y0 + 70 + k*110, half - 48, 10, 5), '#2c3f5e', .5);
      if (side > 0){
        vol(c, cc => rr(cc, 820, 430, 22, 94, 11), MAT.brass, { k:1.4, s:3.5 });
        vol(c, cc => ell(cc, 831, 430, 16, 16), MAT.brass, { k:1.2, s:3, tex:0 });
      }
      c.restore();
    }
    if (open < .5) hit(c, 'hat:door', ['r', DOOR.x0, DOOR.y0, DOOR.x1-DOOR.x0, DOOR.y1-DOOR.y0], { label:docked() ? tr('开舷门') : tr('舷门') });
    /* the stand, and whatever is standing on it */
    setL(c, 1);
    c.save(); c.translate(STAND.x, STAND.y);
    shadow(c, 0, 12, 92, 15, .55);
    for (const x of [-52, 52]) vol(c, cc => rr(cc, x-9, -84, 18, 92, 7), MAT.metalD, { k:1.8, s:4.5 });
    vol(c, cc => rr(cc, -80, -36, 160, 12, 5), MAT.metalD, { k:1.2, s:3 });
    vol(c, cc => rr(cc, -82, -104, 164, 26, 9), MAT.wood, { k:2.4, s:6, r:1.6, hl:[-40,-98,60,.2] });
    if (G.rig) drawRig(c, 0, -104, G.rig, .95);
    hit(c, 'hat:rig', ['r', -92, -290, 184, 290], { label:G.rig ? tr('那盏灯') : tr('架子') });
    c.restore();
    layerCache(c, 'hat:near', K_NR, hatNearArt);
  },
  light(){
    lightBegin('#050a1a', .62);
    hole(K_WL, 800, 150, 340, .62, null, 230);
    hole(1, STAND.x, STAND.y - 140, 250, .34);
    if (S.doorK > .02) hole(K_WL*.8, 800, 450, 300*S.doorK, .7*S.doorK, null, 340*S.doorK);
    if (S.holdK > .02 && S.visPt){ const [hx,hy] = holdPt(callPort().look);
      hole(K_WL*.8, S.visPt[0] + hx, S.visPt[1] + hy, 300*S.holdK, .75*S.holdK); }
    if (G.rig && G.rig.lit) hole(1, STAND.x, STAND.y - 210, 180, .5);
  },
  over(c, dt){
    setL(c, K_WL);
    c.globalCompositeOperation = 'lighter';
    glowAt(c, SWARM, 800, 150, 130, .4);
    c.globalCompositeOperation = 'source-over';
    const P = callPort();
    if (P && S.doorK > .02 && S.visPt){
      setL(c, K_WL*.8);
      c.save(); c.beginPath(); rr(c, DOOR.x0+6, DOOR.y0+6, DOOR.x1-DOOR.x0-12, DOOR.y1-DOOR.y0-12, 22); c.clip();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = S.doorK;
      visitorGlow(c, S.visPt[0], S.visPt[1], P.look, 1, S.doorK, S.holdK);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.restore();
    }
    if (G.rig && G.rig.lit) glowL(c, 1, SWARM, STAND.x, STAND.y - 212, 54, .55);
    drawPuffs(c, dt); drawFX(c, dt);
  }
};
