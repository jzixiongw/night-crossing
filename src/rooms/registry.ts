import { tr, isEN } from '../i18n';
import { AU } from '../audio/index';
import { dropCaches } from '../core/cache';
import { render } from '../core/render';
import { setViewFocus } from '../core/surface';

import { $, mod, stage } from '../core/util';
import { S } from '../state/runtime';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { clearCaptions } from '../ui/captions';
import { closePanels } from '../ui/panels';
import { CAM, resetView, setPanRange } from '../core/camera';
import { showHints } from '../core/input';
import { STEPS, stepNow } from '../ui/worksheet';

/* ================= ROOMS, NAV, INPUT ================= */
/* A room is a set of optional draw/lifecycle hooks the pipeline calls in order:
   back -> room (onto the scene buffer) -> light (the darkness wash) -> over.
   This is the contract a different engine's Scene would have to satisfy. */
export interface Room {
  back?(c: CanvasRenderingContext2D, dt: number): void;   // layers behind the play plane
  room?(c: CanvasRenderingContext2D, dt: number): void;   // the lit room itself
  light?(): void;                                         // punch holes in the darkness
  over?(c: CanvasRenderingContext2D, dt: number): void;   // foreground + additive glows
  update?(dt: number): void;                              // simulation, no drawing
  enter?(from?: string): void;
  exit?(): void;
  zoom?(): number;                                        // camera zoom target
  zc?: [number, number];                                  // zoom centre in design space
  pan?: [number, number, number?];                        // how far the player may swing the view

  tapEmpty?(e: PointerEvent): void;                       // click that hit no region
  [key: string]: any;
}

/* Action ids are colon-paths ("gh:seeds"); resolveAct walks them longest-first. */
export interface Action { tap?(...a: any[]): void; key?(...a: any[]): void; [key: string]: any }

export const ROOMS: Record<string, Room> = {};
export const ACT: Record<string, Action> = {};
export const ROOM_NAMES = { corridor:tr('环廊'), cabin:tr('驾驶舱'), galley:tr('小厨房'), green:tr('温室'), radio:tr('电台室'), dome:tr('观景穹顶'), hatch:tr('舷梯') };
export const ROOM_EN = { corridor:'RING', cabin:'BRIDGE', galley:'GALLEY', green:'GREENHOUSE', radio:'RADIO ROOM', dome:'DOME', hatch:'GANGWAY' };
export const ROOM_KEY = { corridor:'ring:', cabin:'cab:', galley:'gal:', green:'gh:', radio:'rad:', dome:'dm:', hatch:'hat:' };
/* Nine stations at 40 degrees, not eight at 45: the gangway is where the round
   touches the ship, so it needed a wall of its own rather than a share of one.
   The ribs, hull ports and near pillars in corridor.ts step on the same lattice. */
export const STEP = 40;
/* The order is the work. Walking the ring one way takes you through a whole
   job in the order it has to happen -- the request comes in at the radio, the
   board shows where you are in it, the greenhouse grows and builds it, the
   bridge steers to the place that asked, and the gangway hands it over. The
   four stations after that are the ones you stop at because you want to. */
export const RING = [
  { ang:0,   id:'radio',  label:tr('电台室门'), go:'radio',  color:'#c47b7b', name:tr('电台室'), en:'RADIO', step:1 },
  { ang:40,  id:'board',  label:tr('工单板') },
  { ang:80,  id:'green',  label:tr('温室门'),   go:'green',  color:'#5ea39b', name:tr('温室'),   en:'GREENHOUSE', step:2 },
  { ang:120, id:'cabin',  label:tr('驾驶舱门'), go:'cabin',  color:'#c98a5a', name:tr('驾驶舱'), en:'BRIDGE', step:3 },
  { ang:160, id:'gang',   label:tr('舷门'),     go:'hatch',  color:'#9cbcd2', name:tr('舷梯'),   en:'GANGWAY', step:4 },
  { ang:200, id:'galley', label:tr('小厨房门'), go:'galley', color:'#d9a95c', name:tr('小厨房'), en:'GALLEY' },
  { ang:240, id:'window', label:tr('舷窗长椅') },
  { ang:280, id:'mail',   label:tr('信箱与船钟') },
  { ang:320, id:'dome',   label:tr('穹顶梯'),   go:'dome' }
];
export const angDiff = (a,b) => mod(a - b + 180, 360) - 180;
ACT['go'] = { tap(a){ go(a[0]); } };

export function go(room){
  if (S.trans || room === S.room || !ROOMS[room]) return;
  S.trans = true; closePanels(); S.focusKey = null;
  const from = S.room; AU.soft();
  S.zoomOverride = 1.34; CAM.zx = 800; CAM.zy = 500;
  $('#fade').classList.add('on');
  clearCaptions();
  setTimeout(() => {
    try { ROOMS[from] && ROOMS[from].exit && ROOMS[from].exit(); } catch(e){ console.error(e); }
    S.room = room; G.lastRoom = room;
    dropCaches(['ring:', ROOM_KEY[room], 'sh:']);
    if (room === 'corridor'){ const st = RING.find(s => s.go === from); if (st){ S.phi = st.ang; S.phiTarget = null; S.phiV = 0; } }
    S.zoomOverride = null; CAM.zoom = 1.12; CAM.lift = 0; CAM.rot = 0;
    resetView(); CAM.panX = 0; CAM.panY = 0; CAM.user = 1;
    const R = ROOMS[room];
    CAM.zx = (R.zc || [800,470])[0]; CAM.zy = (R.zc || [800,470])[1];
    /* How far this room lets the player swing the view. Most rooms are composed
       to fit the window; the greenhouse is wider than one. */
    setPanRange(...(R.pan || []));
    setViewFocus(CAM.zx, CAM.zy);
    try { R.enter && R.enter(from); } catch(e){ console.error(e); }
    /* Walking into the room the job is waiting in rings the touchable things
       once. It answers "what am I supposed to do here" with the room itself
       rather than with another sentence, and only the first time per step. */
    try {
      const i = stepNow();
      if (i >= 0 && STEPS[i].where === room && S.hintedStep !== STEPS[i].id){
        S.hintedStep = STEPS[i].id;
        setTimeout(() => { if (S.room === room) showHints(); }, 900);
      }
    } catch(e){ console.error(e); }
    updateHud(); setAmbience();
    try { render(0, ROOMS[room]); } catch(e){ console.error(e); }
    $('#fade').classList.remove('on');
    setTimeout(() => { S.trans = false; }, 380);
    markDirty();
  }, 480);
}
export function updateHud(){
  const inRing = S.room === 'corridor';
  $('#nav').hidden = !inRing || S.sitting; $('#back').hidden = inRing; stage.classList.toggle('ring', inRing && !S.sitting);
  /* Chinese pairs the room name with its romanised tag; in English that would
     only say the same thing twice. */
  if (!inRing) $('#where').textContent = isEN ? ROOM_NAMES[S.room] : ROOM_NAMES[S.room] + ' · ' + ROOM_EN[S.room];
  else S.ringLabel = '';
}
export function setCtx(list){
  const box = $('#ctx'); box.innerHTML = '';
  list.forEach(it => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill' + (it.on ? ' on' : ''); b.textContent = it.label; b.onclick = it.fn; box.appendChild(b); });
}
export function setAmbience(){
  if (!AU.ready) return;
  const r = S.room;
  const cfg = { corridor:[160,.05,.7], cabin:[300,0,.8], galley:[380,.03,.8], green:[3200,.014,.6], radio:[500,0,.8], dome:[180,.025,.5] }[r] || [300,0,.8];
  AU.ambF.frequency.setTargetAtTime(cfg[0], AU.ctx.currentTime, .6);
  AU.set(AU.amb.gain, cfg[1] * (G.phones && r==='radio' ? .3 : 1), .8);
  AU.set(AU.hum.gain, r === 'dome' ? .1 : r === 'corridor' ? .22 : .18, .8);
}
