import * as THREE from 'three';
import { tr } from '../i18n';
import { CAM, USER_MAX, VIEW, resetView, setPanRange } from '../core/camera';
import { clamp, ease, stage } from '../core/util';
import { ACT } from '../rooms/registry';
import { S } from '../state/runtime';
import { G } from '../state/store';
import { SHARED } from './config/shared';
import { HOVER, INSPECTABLES, camera, pickable, type Built } from './engine';
import { flatMat, glow, noRay } from './kit';
import { SWARM } from '../core/paint';
import { AU } from '../audio/index';

/* ================= VIEWPOINTS =================
   You do not walk a room; you sit or stand at one of a few places in it, each
   with a composed view, and you can turn your head a little and lean in. A
   room lists its places as Views; [0] is the main one, the one you arrive at.

   The player's half of the camera is still CAM.panX/panY/user in
   core/camera.ts, which the existing drag, arrow keys, wheel and pinch write.
   Here they become a head turn (yaw/pitch, limited per view) and a lean
   (dolly + a slightly narrower lens). The game's half -- CAM.zoom, rot, lift,
   px/py -- becomes a small dolly, the ship's roll, its bob and the parallax.

   Moving between views: tap a marker in the room, a button in the bar under
   the picture, or Tab to a marker and press Enter; Escape or a double-click
   goes back to the main view. A short move flies, a long one fades; under
   reduced motion every move fades. The pointer is ignored while moving. */
export type V3 = readonly [number, number, number];
export interface View {
  id: string; label: string;
  eye: V3; look: V3;
  fov?: number;          // vertical, degrees at 16:9
  yaw?: number;          // how far the head may turn either way, degrees
  pitch?: number;        // ...and up or down
  pitchUp?: number;      // asymmetric limits, when looking up matters more (the dome)
  pitchDown?: number;
  dolly?: number;        // metres of lean at full zoom
  /* where the marker for this view sits, and which way its face points */
  hot?: V3; hotN?: V3; hotR?: number;
  /* a phone held upright: a different eye, look or lens */
  portrait?: { eye?: V3; look?: V3; fov?: number; yaw?: number; pitch?: number };
  /* a view that moves on its own (the ring corridor): evaluated every frame */
  dyn?: () => { eye: V3; look: V3 };
  /* called when this view becomes the current one (the dome lies you down) */
  onEnter?: () => void;
  bar?: boolean;         // false: no button in the bar
}
interface Pose { eye: THREE.Vector3; yaw: number; pitch: number; fov: number; yawLim: number; up: number; down: number; dolly: number }

const C = SHARED.camera, D2R = Math.PI/180;
const st = {
  B: null as Built | null, views: [] as View[], i: 0,
  from: null as Pose | null, t: 1, dur: 1, fading: false,
  panSig: '',
  temp: null as View | null, tempObj: null as THREE.Object3D | null,   // a notice being read
  ret: null as { x: number; y: number } | null, retPan: null as { x: number; y: number } | null,
  arrive: null as (() => void) | null
};
export const activeView = () => st.temp ? 'inspect' : st.views[st.i] ? st.views[st.i].id : null;

function hfovOf(vfov: number, aspect: number){ return 2*Math.atan(Math.tan(vfov*D2R/2)*aspect)/D2R; }
function fovFor(base: number, aspect: number){
  const v = base*D2R, need = 2*Math.atan(Math.tan(C.minHFov*D2R/2)/aspect);
  return Math.min(C.maxFov*D2R, Math.max(v, need))/D2R;
}
function poseOf(v: View): Pose {
  const port = camera.aspect < 1 && v.portrait ? v.portrait : null;
  const e = v.dyn ? v.dyn() : { eye: (port && port.eye) || v.eye, look: (port && port.look) || v.look };
  const eye = new THREE.Vector3(...e.eye), d = new THREE.Vector3(...e.look).sub(eye).normalize();
  const pitch = (port && port.pitch) ?? v.pitch ?? 6;
  return { eye, yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(clamp(d.y, -1, 1)), fov: (port && port.fov) ?? v.fov ?? C.fov,
    yawLim: (port && port.yaw) ?? v.yaw ?? 12, up: v.pitchUp ?? pitch, down: v.pitchDown ?? pitch, dolly: v.dolly ?? .9 };
}
const lerpA = (a: number, b: number, t: number) => { let d = b - a; while (d > Math.PI) d -= 2*Math.PI; while (d < -Math.PI) d += 2*Math.PI; return a + d*t; };
function mix(a: Pose, b: Pose, t: number): Pose {
  return { eye: a.eye.clone().lerp(b.eye, t), yaw: lerpA(a.yaw, b.yaw, t), pitch: a.pitch + (b.pitch - a.pitch)*t, fov: a.fov + (b.fov - a.fov)*t,
    yawLim: b.yawLim, up: b.up, down: b.down, dolly: b.dolly };
}
/* A narrower screen may turn further, so the edges a 16:9 screen shows are
   still reachable. */
function yawLimOf(P: Pose){
  const fov = fovFor(P.fov, camera.aspect), wide = hfovOf(fovFor(P.fov, 16/9), 16/9), now = hfovOf(fov, camera.aspect);
  return P.yawLim + Math.max(0, (wide - now)/2)*C.portraitYaw;
}
function applyPan(P: Pose){
  const yl = yawLimOf(P), sig = [yl.toFixed(2), P.up, P.down].join('|');
  if (sig === st.panSig) return; st.panSig = sig;
  /* core/camera.ts clamps symmetrically; up/down asymmetry is clamped here */
  const py = Math.max(P.up, P.down)/C.pitchPerUnit;
  setPanRange(yl/C.yawPerUnit, py, yl/C.yawPerUnit*1.15, .2);
}

/* ---------- placing the camera, once per frame ---------- */
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), upV = new THREE.Vector3();
let lastPose: Pose | null = null;
export function placeCamera(dt: number, manip: boolean){
  if (!st.views.length) return;
  if (manip && lastPose) return;                      // hold still under a hand
  /* walking the ring (arrows, the map) while reading a notice puts the notice down */
  if (st.temp && !st.from && S.room === 'corridor' && S.phiTarget != null) uninspect();
  if (st.from && !st.fading){ st.t = Math.min(1, st.t + dt/st.dur); if (st.t >= 1) finishMove(); }
  const to = poseOf(curView());
  if (st.from && st.retPan){ to.yaw += clamp(st.retPan.x*C.yawPerUnit, -yawLimOf(to), yawLimOf(to))*D2R; to.pitch += clamp(st.retPan.y*C.pitchPerUnit, -to.down, to.up)*D2R; }
  if (!st.from) st.retPan = null;
  const P = st.from && !st.fading ? mix(st.from, to, ease(st.t)) : to;
  lastPose = P;
  if (!st.from) applyPan(P);
  const red = !!(G && G.reduced), zz = CAM.zoom*CAM.user, u = clamp((zz - 1)/(USER_MAX - 1), -.4, 1.3);
  const yl = yawLimOf(P);
  const yaw = P.yaw + clamp(CAM.panX*C.yawPerUnit, -yl, yl)*D2R;
  const pitch = P.pitch + clamp(CAM.panY*C.pitchPerUnit, -P.down, P.up)*D2R;
  const par = C.parallax*(red ? .5 : 1);
  fwd.set(-Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch));
  right.set(Math.cos(yaw), 0, -Math.sin(yaw)); upV.set(0, 1, 0);
  camera.position.copy(P.eye)
    .addScaledVector(right, -CAM.panX*C.truckPerUnit + CAM.px*par)
    .addScaledVector(upV, -CAM.py*par*.5 + CAM.lift*C.lift)
    .addScaledVector(fwd, u*P.dolly);
  camera.rotation.set(pitch, yaw, CAM.rot*C.roll, 'YXZ');
  camera.fov = fovFor(P.fov, camera.aspect)*(1 - Math.max(0, u)*.12);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}

/* ---------- moving between views ---------- */
const fadeEl = () => document.getElementById('fade');
const curView = () => st.temp || st.views[st.i];
/* Start a move from wherever the camera is now to `to`. A short move flies;
   a long one, or any move under reduced motion, fades. `arrive` runs once the
   camera is there. */
function moveTo(to: Pose, o: { instant?: boolean; arrive?: () => void } = {}){
  const cur: Pose = lastPose ? { ...lastPose, eye: camera.position.clone(), yaw: camera.rotation.y, pitch: camera.rotation.x } : to;
  const dist = cur.eye.distanceTo(to.eye);
  st.panSig = ''; st.arrive = o.arrive || null;
  resetView(); CAM.panX = CAM.panY = 0; CAM.user = 1;
  S.camMove = true;
  syncBar();
  if (o.instant){ st.from = null; arrived(); return; }
  AU.ready && AU.soft && AU.soft();
  if (G.reduced || dist > SHARED.move.fadeOver){
    st.fading = true; st.from = cur;
    const f = fadeEl(); f && f.classList.add('on');
    setTimeout(() => { st.from = null; st.fading = false; st.t = 1; f && f.classList.remove('on'); arrived(true);
      setTimeout(() => { S.camMove = false; }, SHARED.move.fadeMs*.6); }, SHARED.move.fadeMs);
    return;
  }
  st.from = cur; st.t = 0; st.fading = false;
  st.dur = clamp(dist/SHARED.move.speed + Math.abs(lerpA(cur.yaw, to.yaw, 1) - cur.yaw)*.25, SHARED.move.minDur, SHARED.move.maxDur);
}
function arrived(keepBusy = false){
  const f = st.arrive; st.arrive = null;
  st.panSig = ''; if (!keepBusy) S.camMove = false;
  try { f && f(); } catch(e){ console.error(e); }
}
export function goView(target: string | number, o: { instant?: boolean } = {}){
  const i = typeof target === 'number' ? target : st.views.findIndex(v => v.id === target);
  if (i < 0 || !st.views[i] || S.trans) return;
  if (i === st.i && !st.from && !st.temp){ resetView(); return; }
  st.temp = null; st.tempObj = null; st.ret = null; S.inspecting = false;
  st.i = i;
  try { st.views[i].onEnter && st.views[i].onEnter(); } catch(e){ console.error(e); }
  moveTo(poseOf(st.views[i]), o);
}
function finishMove(){ st.from = null; st.t = 1; arrived(); }
export function goMain(){ if (st.i !== 0 || st.temp) goView(0); }

/* ---------- looking closely at a notice ----------
   Anything pinned up with something to read on it -- the work slip in every
   room, the course sign, the station table, the order boards, the cork board
   in the ring -- is a pickable with `inspect: true`. The first tap brings the
   camera square on to it, close enough to read; a tap on it while you are
   there does what it always did (the hint, the log, the course board); the
   back button under the picture, Escape or a double-click take you back to
   exactly where you were standing, head turn included. */
const box3 = new THREE.Box3(), vTmp = new THREE.Vector3(), qTmp = new THREE.Quaternion();
function inspectView(obj: THREE.Object3D): View {
  obj.updateWorldMatrix(true, true);
  box3.setFromObject(obj, true);
  const c = box3.getCenter(new THREE.Vector3());
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(obj.getWorldQuaternion(qTmp)).normalize();
  const toCam = camera.position.clone().sub(c).normalize();
  if (n.dot(toCam) < 0) n.negate();
  if (Math.abs(n.dot(toCam)) < .25) n.copy(toCam);
  /* how far the notice reaches from its centre across the picture plane */
  let s = 0;
  for (const x of [box3.min.x, box3.max.x]) for (const y of [box3.min.y, box3.max.y]) for (const z of [box3.min.z, box3.max.z]){
    vTmp.set(x, y, z).sub(c); vTmp.addScaledVector(n, -vTmp.dot(n)); s = Math.max(s, vTmp.length());
  }
  const IN = SHARED.inspect, fov = IN.fov, half = Math.min(fov/2, hfovOf(fovFor(fov, camera.aspect), camera.aspect)/2)*D2R;
  const dist = clamp(s*IN.pad/Math.tan(half), IN.min, IN.max);
  /* lower the eye and the aim together, which lifts the notice up the frame */
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  if (up.lengthSq() > .01) c.addScaledVector(up, -s*IN.lift);
  const eye = c.clone().addScaledVector(n, dist);
  return { id: '__inspect', label: '', eye: [eye.x, eye.y, eye.z], look: [c.x, c.y, c.z], fov, yaw: IN.yaw, pitch: IN.pitch, dolly: dist*IN.dolly, bar: false };
}
export function inspect(obj: THREE.Object3D){
  if (!obj || S.trans || st.tempObj === obj) return;
  if (!st.temp) st.ret = { x: CAM.tpanX, y: CAM.tpanY };   // where to put the head back
  st.temp = inspectView(obj); st.tempObj = obj; S.inspecting = true;
  AU.ready && AU.paper && AU.paper();
  moveTo(poseOf(st.temp), { arrive: () => {
    const pick = obj.userData.pick;
    if (!pick?.activateOnInspect || st.tempObj !== obj) return;
    const parts = pick.act.split(':');
    const action = ACT[parts.slice(0, 2).join(':')];
    action?.tap?.(parts.slice(2));
  } });
}
export function uninspect(){
  if (!st.temp) return;
  const ret = st.ret; st.temp = null; st.tempObj = null; st.ret = null; S.inspecting = false;
  const base = poseOf(st.views[st.i]);
  /* fly to the base view with the old head turn already in it, then hand the
     turn back to CAM so nothing jumps when the flight ends */
  if (ret){ base.yaw += clamp(ret.x*C.yawPerUnit, -yawLimOf(base), yawLimOf(base))*D2R; base.pitch += clamp(ret.y*C.pitchPerUnit, -base.down, base.up)*D2R; }
  moveTo(base, { arrive: () => { if (ret){ CAM.tpanX = CAM.panX = ret.x; CAM.tpanY = CAM.panY = ret.y; } } });
  st.retPan = ret;
}
export const inspectedObj = () => st.tempObj;
VIEW.away = () => !!st.B && (!!st.temp || (st.i !== 0 && st.views.length > 1 && st.views[0].bar !== false));
VIEW.focus = (act, view) => {
  if (view) goView(view);
  if (!act) return;
  const o = [...INSPECTABLES.values()].find(o => o.userData.pick?.act === act);
  if (o) inspect(o);
};
VIEW.back = () => { if (st.temp) uninspect(); else goMain(); };
ACT['view'] = { tap(a){ goView(a[0]); }, key(a){ goView(a[0]); } };
ACT['inspect'] = {
  tap(a){ if (a[0] === 'back') uninspect(); else inspect(INSPECTABLES.get(a[0])); },
  key(a){ if (a[0] === 'back') uninspect(); else inspect(INSPECTABLES.get(a[0])); }
};
const backBtn = document.createElement('button');
backBtn.type = 'button'; backBtn.id = 'inspectBack'; backBtn.className = 'pill'; backBtn.textContent = tr('‹ 返回'); backBtn.hidden = true;
backBtn.onclick = () => { uninspect(); try { (document.getElementById('scene') as HTMLCanvasElement).focus({ preventScroll: true }); } catch(e){} };
stage.appendChild(backBtn);

/* ---------- entering a room ---------- */
export function enterViews(B: Built, reset = false){
  if (st.B === B && !reset) return;
  st.B = B; st.views = B.views || []; st.i = 0; st.from = null; st.fading = false; st.t = 1; st.panSig = ''; lastPose = null;
  st.temp = null; st.tempObj = null; st.ret = null; st.retPan = null; st.arrive = null; S.inspecting = false;
  S.camMove = false;
  syncBar();
}
export const VIEWS_API = {
  go: goView, main: goMain, list: () => st.views.map(v => v.id), current: activeView,
  moving: () => !!st.from,
  inspect: (key: string) => { for (const [, o] of INSPECTABLES) if ((o.userData.pick || {}).key === key || (o.userData.pick || {}).act === key){ inspect(o); return true; } return false; },
  uninspect, inspecting: () => !!st.temp,
  onAspect(){ st.panSig = ''; }
};

/* ---------- the markers ----------
   A soft ring where you would stand or lean, brighter under the pointer. It
   is a pickable like anything else, so it has a hint ring, a Tab stop and a
   focus label, and it hides while you are at that view or moving. */
interface Marker { i: number; g: THREE.Group; ring: THREE.Mesh; halo: THREE.Sprite; key: string }
let markers: Marker[] = [];
export function buildMarkers(B: Built){
  markers = [];
  const MK = SHARED.marker;
  (B.views || []).forEach((v, i) => {
    if (!v.hot) return;
    const g = new THREE.Group(); g.position.set(...v.hot);
    const n = new THREE.Vector3(...(v.hotN || [0, 1, 0])).normalize();
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    const r = v.hotR ?? MK.r;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r*.72, r, 40), flatMat(MK.color, { opacity: MK.opacity, side: THREE.DoubleSide }));
    const dot = noRay(new THREE.Mesh(new THREE.CircleGeometry(r*.22, 20), flatMat(MK.color, { opacity: .8, side: THREE.DoubleSide })));
    /* a generous invisible disc, so a finger does not have to land on a thin ring */
    const pad = new THREE.Mesh(new THREE.CircleGeometry(r*1.25, 20), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    ring.renderOrder = dot.renderOrder = 3;
    const halo = glow(SWARM, r*4.5, .25); halo.position.z = .01;
    g.add(pad, ring, dot, halo);
    const key = 'view:' + v.id;
    pickable(g, { act: 'view:' + v.id, key, label: () => i === 0 ? tr('回到{0}', v.label) : tr('走近看：{0}', v.label), anchor: new THREE.Vector3(), r });
    B.scene.add(g);
    markers.push({ i, g, ring, halo, key });
  });
}
export function syncMarkers(_dt: number){
  const MK = SHARED.marker, moving = !!st.from || S.camMove;
  for (const m of markers){
    m.g.visible = m.i !== st.i && !moving && !st.temp;
    if (!m.g.visible) continue;
    const hov = HOVER === m.key || S.focusKey === m.key, pulse = G.reduced ? 0 : Math.sin(S.T*2.2 + m.i)*MK.pulse;
    (m.ring.material as THREE.MeshBasicMaterial).opacity = (hov ? MK.hover : MK.opacity) + pulse*.5;
    m.halo.material.opacity = (hov ? .55 : .2) + pulse*.3;
    const s = hov ? 1.12 : 1; m.g.scale.setScalar(s);
  }
}

/* ---------- the bar under the picture ---------- */
const bar = document.createElement('div');
bar.id = 'views'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', tr('观察点')); bar.hidden = true;
stage.appendChild(bar);
export function syncBar(){
  const vs = st.views.filter(v => v.bar !== false);
  bar.innerHTML = '';
  bar.hidden = vs.length < 2 || !S.started || !!st.temp;
  backBtn.hidden = !st.temp || !S.started;
  vs.forEach(v => {
    const i = st.views.indexOf(v), b = document.createElement('button');
    b.type = 'button'; b.className = 'pill' + (i === st.i ? ' on' : ''); b.textContent = v.label;
    b.setAttribute('aria-pressed', i === st.i ? 'true' : 'false');
    b.onclick = () => { goView(i); try { (document.getElementById('scene') as HTMLCanvasElement).focus({ preventScroll: true }); } catch(e){} };
    bar.appendChild(b);
  });
}
/* the bar appears once the door screen is gone */
const showBarWhenAboard = () => { if (S.started){ syncBar(); return; } setTimeout(showBarWhenAboard, 400); };
showBarWhenAboard();
