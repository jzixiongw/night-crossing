/* ================= RUNTIME STATE =================
   Session-only state: cleared on reload, never persisted. Rooms add their own
   fields here as they initialise, so the shape stays open. */
export interface Runtime { [key: string]: any }
export const S: Runtime = {
  started:false, T:0, run:0, room:'intro', trans:false, drag:null,
  beacons:[], bulbs:[], slots:[], mismatch:0, vis:.1, pendingNames:[], quietT:0, asleepRoute:false, reading:false, readTimer:0,
  turn:null, routeVis:'harbor', harborT:0, ringX:1900, nextSpawn:4, nextMeteor:6, lampA:0, lampV:0, plantA:0, plantV:0, beadT:9,
  strokes:[], breaths:[], anims:[], phi:0, phiV:0, phiTarget:null, stepAcc:0, sitting:false, otherShip:null, shipCool:40,
  zoom:1, spray:false, fold:[0,0,0,0,0], curLean:[0,0,0,0,0], adapt:0, pick:null, lastComp:null, boxT:0, boxStep:0,
  stationId:null, subT:0, subI:0, kneadDir:0, pour:null, tapOn:false, heating:false, boilT:-1, flameOn:false, bakeT:-1,
  hiddenAt:null, blurAt:null, lastTouch:0, caps:{}, sessionStart:0, ringLabel:'', lastBellT:0, shipBlink:0
};
export const PR = { speed:0, stillT:0, idleT:0, lx:null, ly:null, lt:0, cx:-1, cy:-1, focused:document.hasFocus(), visible:document.visibilityState === 'visible' };
