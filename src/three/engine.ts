import * as THREE from 'three';
import { FX, PUFFS } from '../core/fx';
import { HITS, HITS_PREV, hitCanvasCenter, setPicker } from '../core/hits';
import { SOFT, spr } from '../core/paint';
import { CH, CW, QUAL, cv, onResize } from '../core/surface';
import { stage } from '../core/util';
import { ROOMS, go, type Room } from '../rooms/registry';
import { PR, S } from '../state/runtime';
import { G } from '../state/store';
import { SHARED } from './config/shared';
import { canvasTex, disposeTree, glow, noRay, spriteTex } from './kit';
import { activeView, buildMarkers, enterViews, inspectedObj, placeCamera, syncMarkers, type View, VIEWS_API } from './view';

/* ================= THE 3D ROOMS: ONE RENDERER, ONE ROOM AT A TIME =================
   Every room still *does* what it did: rooms/<room>.ts keeps its update(),
   enter(), exit() and every ACT handler, G and S hold the state, and the main
   loop in core/loop.ts drives the simulation once per frame and saves as
   before. What a 3D room replaces is how the room is drawn and how a pointer
   finds things in it:

     - the picture is a lit scene on a WebGL canvas under the 2D one, which
       now only carries the vignette/grain pass and the keyboard focus ring;
     - hitAt() asks this module first, which raycasts (core/hits.ts setPicker);
     - a hit carries `local(e)`, so a drag keeps getting a point on the thing
       it started on, in that thing's own design units, from wherever the
       camera is;
     - each pickable on screen is pushed into HITS as a circle every frame, so
       Tab, Enter, the focus ring and "what can I touch" work unchanged.

   A room module calls register3D({ id, build }). build() runs when the room
   is entered and returns the scene, the viewpoints and a sync(dt); leaving
   the room disposes all of it, so walking the ring never piles up GPU memory.

   UNITS. Metres stay in here. Every ACT handler receives the units it was
   written for -- design units, the 1600x900 space -- and each pickable says
   how to get there: `plane` + `toLocal` for a surface a drag slides across,
   `uvRect` for a canvas-mapped face. A DesignMap is the one conversion a room
   uses for both, so a number in config is never metres in one place and
   design units in another. */

/* ---------- renderer, on its own canvas under the 2D one ---------- */
export const glCanvas = document.createElement('canvas');
glCanvas.id = 'scene3d'; glCanvas.setAttribute('aria-hidden', 'true');
Object.assign(glCanvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none', visibility: 'hidden' });
stage.insertBefore(glCanvas, cv);
export const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: SHARED.render.antialias, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = SHARED.render.exposure;
renderer.setClearColor(SHARED.render.clear);

export const camera = new THREE.PerspectiveCamera(SHARED.camera.fov, 16/9, SHARED.camera.near, SHARED.camera.far);
/* The 2D canvas is sized by core/surface.ts, which already scales with the
   device and the adaptive quality; the GL canvas follows it exactly so a
   canvas pixel means the same thing to both. */
function sizeRenderer(){ renderer.setSize(CW, CH, false); camera.aspect = CW/CH; camera.updateProjectionMatrix(); VIEWS_API.onAspect(); }
sizeRenderer(); onResize(sizeRenderer);

/* ================= DESIGN MAPS =================
   A vertical plane at depth z on which design units lie: x to the right,
   y down, `unit` design units per metre, design (x0, y0) at world (0, 0).
   Rooms lay out what the game addresses in design units -- WIN, the slots,
   the strip cells, the kettle positions -- through one of these, and map hits
   back through the same one. */
export interface DesignMap {
  unit: number; x0: number; y0: number; z: number;
  X(dx: number): number; Y(dy: number): number; dx(X: number): number; dy(Y: number): number;
  U(d: number): number;                                       // a design length in metres
  at(dx: number, dy: number, z?: number): THREE.Vector3;
  plane(dz?: number): THREE.Plane;                            // the plane itself, or one dz in front of it
  toDesign(p: THREE.Vector3): { x: number; y: number };
}
export function designMap(unit: number, x0: number, y0: number, z: number): DesignMap {
  const m: DesignMap = {
    unit, x0, y0, z,
    X: dx => (dx - x0)/unit, Y: dy => (y0 - dy)/unit, dx: X => X*unit + x0, dy: Y => y0 - Y*unit, U: d => d/unit,
    at: (dx, dy, zz = z) => new THREE.Vector3((dx - x0)/unit, (y0 - dy)/unit, zz),
    plane: (dz = 0) => new THREE.Plane(new THREE.Vector3(0, 0, 1), -(z + dz)),
    toDesign: p => ({ x: p.x*unit + x0, y: y0 - p.y*unit })
  };
  return m;
}

/* ================= PICKING =================
   A pickable is any object carrying userData.pick. A ray goes through the
   whole room; the first solid thing it meets decides, so a lamp in front of
   the window takes the tap and a wall behind the desk blocks one. */
export interface Pick {
  activateOnInspect?: boolean;                 // actionable boards open once approached
  act: string; label?: string | null | (() => string | null); key?: string; cur?: string | (() => string);
  on?: () => boolean;                         // false: present but not touchable right now
  /* where a point on this thing is, in its action's units */
  plane?: THREE.Plane | (() => THREE.Plane);
  screen?: boolean;                           // local = the pointer in screen design units (see screenDesign)
  toLocal?: (pt: THREE.Vector3, hit?: THREE.Intersection) => { x: number; y: number };
  /* focus/hint anchor, in the object's local space, and its screen radius in metres */
  anchor?: THREE.Vector3; r?: number;
  focus?: boolean;                            // false: never a Tab stop (e.g. the sky)
  /* a notice with something to read: the first tap brings the camera to it
     (view.ts inspect()); a tap while there runs `act`. A notice with nothing
     else to do uses act 'inspect'. */
  inspect?: boolean;
  sphere?: { c: THREE.Vector3; r: number };
}
/* UV -> a design rect: (u, v) over the face lands on (x .. x+w, y+h .. y). */
export const uvRect = (x: number, y: number, w: number, h: number) =>
  (_pt: THREE.Vector3, hit?: THREE.Intersection) => hit && hit.uv ? { x: x + hit.uv.x*w, y: y + (1 - hit.uv.y)*h } : { x: x + w/2, y: y + h/2 };

/* A flat face on an object (a dial, a strip of paper, the front of a box),
   w x h metres in the object's local x/y, centred on its origin, mapped onto
   a design rect [x, y, w, h]. `plane`/`toLocal` go straight into a Pick, so a
   drag that slides off the edge still gets a point; `at` goes the other way,
   for flares and floating notes placed in design units. */
export function faceMap(obj: THREE.Object3D, w: number, h: number, rect: [number, number, number, number]){
  const [rx, ry, rw, rh] = rect, n = new THREE.Vector3(), o = new THREE.Vector3(), q = new THREE.Quaternion();
  return {
    plane: () => { obj.updateWorldMatrix(true, false); obj.getWorldPosition(o); obj.getWorldQuaternion(q); n.set(0, 0, 1).applyQuaternion(q); return new THREE.Plane().setFromNormalAndCoplanarPoint(n, o); },
    toLocal: (pt: THREE.Vector3) => { const l = obj.worldToLocal(pt.clone()); return { x: rx + (l.x/w + .5)*rw, y: ry + (.5 - l.y/h)*rh }; },
    at: (x: number, y: number, dz = .01) => obj.localToWorld(new THREE.Vector3(((x - rx)/rw - .5)*w, (.5 - (y - ry)/rh)*h, dz)),
    unit: w/rw    // metres per design unit on this face
  };
}
/* For a control turned by a linear drag (the tuning knob): the pointer in
   design units of the *screen*, 1600 across, so a full sweep is the same
   movement of the hand from any viewpoint, as it was in 2D. The handler only
   ever uses differences of these, never positions. */
export function screenDesign(e: { clientX: number; clientY: number }){ const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left)/r.width*1600, y: (e.clientY - r.top)/r.height*1600*r.height/r.width }; }

let PICKS: { obj: THREE.Object3D; p: Pick }[] = [];
export const INSPECTABLES = new Map<string, THREE.Object3D>();
export function pickable<T extends THREE.Object3D>(obj: T, p: Pick): T {
  obj.userData.pick = p; PICKS.push({ obj, p });
  if (p.inspect){ const id = 'n' + INSPECTABLES.size; obj.userData.inspectId = id; INSPECTABLES.set(id, obj); }
  return obj;
}
/* The act a tap on this thing runs right now: a notice not yet being read is
   read first. */
function actOf(obj: THREE.Object3D, p: Pick){
  if (!p.inspect) return p.act;
  if (inspectedObj() !== obj) return 'inspect:' + obj.userData.inspectId;
  return p.act === 'inspect' ? 'inspect:back' : p.act;
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmp = new THREE.Vector3();
export function rayAt(X: number, Y: number){ ndc.set(X/CW*2 - 1, -(Y/CH*2 - 1)); ray.setFromCamera(ndc, camera); return ray; }
export const rayOf = (e: { clientX: number; clientY: number }) => { const r = cv.getBoundingClientRect(); return rayAt((e.clientX - r.left)/r.width*CW, (e.clientY - r.top)/r.height*CH); };
const shown = (o: THREE.Object3D) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
const labelOf = (p: Pick) => typeof p.label === 'function' ? p.label() : p.label;
const planeOf = (p: Pick) => typeof p.plane === 'function' ? p.plane() : p.plane;

function localFrom(obj: THREE.Object3D, p: Pick, pt: THREE.Vector3, hit?: THREE.Intersection){
  if (p.toLocal) return p.toLocal(pt, hit);
  const l = obj.worldToLocal(pt.clone()); return { x: l.x, y: l.y };
}
function record(obj: THREE.Object3D, p: Pick, X: number, Y: number, r: number){
  return {
    act: actOf(obj, p), m: [1, 0, 0, 1, 0, 0], shape: ['c', X, Y, r], label: labelOf(p), key: p.key || p.act,
    /* Enter on a focused thing: its anchor, in the units its handler expects,
       rather than the focus ring's centre in canvas pixels */
    keyPt: () => { const s = anchorOf(obj, p); return p.screen ? { x: NaN, y: NaN } : localFrom(obj, p, obj.localToWorld(s.c.clone())); },
    cur: (typeof p.cur === 'function' ? p.cur() : p.cur) || 'pointer',
    /* a drag keeps asking where the pointer is on this same thing; a plane
       answers even when the pointer has slid off its edge */
    local: (e: any) => {
      if (!e) return { x: NaN, y: NaN };
      if (p.screen) return screenDesign(e);
      const r2 = rayOf(e), pl = planeOf(p);
      if (pl){ if (r2.ray.intersectPlane(pl, tmp)) return localFrom(obj, p, tmp.clone()); return { x: NaN, y: NaN }; }
      const it = r2.intersectObject(obj, true)[0]; return it ? localFrom(obj, p, it.point, it) : { x: NaN, y: NaN };
    }
  };
}
/* The first thing the ray meets decides; a solid thing with nothing to do is
   in the way. Returns undefined when no 3D room is on screen, so the painted
   regions in core/hits.ts take over. */
export function pickAt(X: number, Y: number){
  if (!B || !ROOMS[S.room] || !ROOMS[S.room].webgl) return undefined;
  for (const it of rayAt(X, Y).intersectObject(B.scene, true)){
    if (!shown(it.object)) continue;
    let o: THREE.Object3D = it.object; while (o && !o.userData.pick) o = o.parent;
    const p: Pick = o && o.userData.pick;
    if (!p || (p.on && !p.on())) return null;
    const r = cv.getBoundingClientRect();
    return { h: record(o, p, X, Y, 0), p: p.screen ? screenDesign({ clientX: r.left + X/CW*r.width, clientY: r.top + Y/CH*r.height }) : localFrom(o, p, it.point, it) };
  }
  return null;
}
setPicker(pickAt);

/* Each frame every pickable on screen also goes into HITS as a circle in
   canvas pixels. Occlusion is checked every few frames with a ray to the
   anchor: a thing hidden behind something solid is not a Tab stop and does
   not get a hint ring, because pressing Enter on it would be a surprise. */
const sph = new THREE.Box3(), sTmp = new THREE.Sphere();
let occFrame = 0;
const occluded = new WeakMap<object, boolean>();
function anchorOf(obj: THREE.Object3D, p: Pick){
  if (!p.sphere){
    if (p.anchor) p.sphere = { c: p.anchor.clone(), r: p.r ?? .15 };
    else { sph.setFromObject(obj); sph.getBoundingSphere(sTmp); p.sphere = { c: obj.worldToLocal(sTmp.center.clone()), r: p.r ?? sTmp.radius }; }
  }
  return p.sphere;
}
function isOccluded(obj: THREE.Object3D, c: THREE.Vector3){
  const dir = c.clone().sub(camera.position), d = dir.length(); dir.normalize();
  ray.set(camera.position, dir); ray.camera = camera; ray.far = d - .02;
  const hits = ray.intersectObject(B.scene, true); ray.far = Infinity;
  for (const it of hits){
    if (!shown(it.object)) continue;
    for (let o: THREE.Object3D = it.object; o; o = o.parent) if (o === obj) return false;
    return true;
  }
  return false;
}
function pushHits(){
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), check = (occFrame++ % 5) === 0;
  for (const { obj, p } of PICKS){
    if (p.focus === false || !shown(obj) || (p.on && !p.on())) continue;
    const s = anchorOf(obj, p);
    const c = obj.localToWorld(s.c.clone()), e = c.clone().addScaledVector(right, Math.min(s.r, .6)*.7);
    if (check) occluded.set(p, isOccluded(obj, c));
    if (occluded.get(p)) continue;
    const cw = c.clone(); c.project(camera); e.project(camera);
    if (c.z > 1 || cw.clone().sub(camera.position).dot(camera.getWorldDirection(tmp)) < 0) continue;
    const X = (c.x + 1)/2*CW, Y = (1 - c.y)/2*CH, r = Math.hypot((e.x - c.x)/2*CW, (e.y - c.y)/2*CH);
    if (X < -r || X > CW + r || Y < -r || Y > CH + r) continue;   // off the edge of the picture
    HITS.push(record(obj, p, X, Y, r));
  }
}
/* What the mouse is over right now, for markers that brighten on hover. */
export let HOVER: string | null = null;
function updateHover(){
  HOVER = null;
  if (S.drag || PR.cx < 0) return;
  const r = cv.getBoundingClientRect(); if (PR.cx < r.left || PR.cx > r.right || PR.cy < r.top || PR.cy > r.bottom) return;
  const f = pickAt((PR.cx - r.left)/r.width*CW, (PR.cy - r.top)/r.height*CH);
  HOVER = f ? f.h.key : null;
}
/* Where the pointer is on a plane right now, or null: the greenhouse asks
   this for the hand its plants lean toward and the bells it rings. */
export function pointerOn(plane: THREE.Plane){
  const r = cv.getBoundingClientRect(); if (PR.cx < r.left || PR.cx > r.right || PR.cy < r.top || PR.cy > r.bottom) return null;
  const rr = rayAt((PR.cx - r.left)/r.width*CW, (PR.cy - r.top)/r.height*CH);
  return rr.ray.intersectPlane(plane, new THREE.Vector3());
}
export function toScreen(p: THREE.Vector3){ const v = p.clone().project(camera); return { X: (v.x + 1)/2*CW, Y: (1 - v.y)/2*CH, behind: v.z > 1 }; }

/* ================= FLARES AND PUFFS =================
   core/fx.ts keeps them in design units at a layer depth k; the room says
   where that is in the world and how many metres one design unit is there. */
const ringTex = canvasTex(128, 128, (g, w) => { g.strokeStyle = '#fff'; g.lineWidth = w*.035; g.beginPath(); g.arc(w/2, w/2, w*.41, 0, Math.PI*2); g.stroke(); });
ringTex.t.userData.keep = true;
let fxPool: { glow: THREE.Sprite; ring: THREE.Sprite }[] = [], puffPool: THREE.Sprite[] = [];
let fxG: THREE.Group = null;
function drawFX3(dt: number){
  let n = 0;
  for (let i = FX.length - 1; i >= 0; i--){
    const f = FX[i]; f.t += dt; const q = f.t/f.dur; if (q >= 1){ FX.splice(i, 1); continue; }
    const at = B.fxAt ? B.fxAt(f.k, f.x, f.y, f.o) : null; if (!at) continue;
    const s = fxPool[n] || (fxPool[n] = {
      glow: fxG.add(glow(SOFT, 1)).children.at(-1) as THREE.Sprite,
      ring: fxG.add(noRay(new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })))).children.at(-1) as THREE.Sprite
    });
    n++;
    const [p, u] = at, r = (f.r0 + (f.r1 - f.r0)*(1 - Math.pow(1 - q, 3)))*u, a = 1 - q;
    s.glow.visible = s.ring.visible = true;
    s.glow.material.map = spriteTex(spr(f.color)); s.glow.position.copy(p); s.glow.scale.set(r*2, r*2, 1); s.glow.material.opacity = a*.55;
    s.ring.material.color.set(f.color); s.ring.position.copy(p); s.ring.scale.set(r*2, r*2, 1); s.ring.material.opacity = a*.5;
  }
  for (let i = n; i < fxPool.length; i++) fxPool[i].glow.visible = fxPool[i].ring.visible = false;
}
function drawPuffs3(dt: number){
  let n = 0;
  for (let i = PUFFS.length - 1; i >= 0; i--){
    const p = PUFFS[i]; p.t += dt; const q = p.t/p.dur; if (q >= 1){ PUFFS.splice(i, 1); continue; }
    const x = p.x + p.vx*p.t, y = p.y + p.vy*p.t, r = p.r + p.gr*q;
    const at = B.fxAt ? B.fxAt(p.k, x, y, p.lo) : null; if (!at) continue;
    const s = puffPool[n] || (puffPool[n] = fxG.add(noRay(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false })))).children.at(-1) as THREE.Sprite);
    n++;
    s.visible = true; s.material.map = spriteTex(p.col); s.position.copy(at[0]); s.scale.set(r*2*at[1], r*2*at[1], 1);
    s.material.opacity = p.a*Math.sin(Math.PI*Math.min(1, q*1.4 + .05));
  }
  for (let i = n; i < puffPool.length; i++) puffPool[i].visible = false;
}

/* ================= ROOMS ================= */
export interface Built {
  scene: THREE.Scene;
  views: View[];
  sync(dt: number): void;
  /* a design point at layer depth k -> [world point, metres per design unit] */
  fxAt?(k: number, x: number, y: number, o?: any): [THREE.Vector3, number] | null;
  enter?(from?: string): void;                // after the room's own enter()
  dispose?(): void;
  [k: string]: any;
}
export interface Room3D { id: string; build(): Built }

let B: Built | null = null, CUR: Room3D | null = null;
export const built = () => B;
const DEFS: Record<string, Room3D> = {};

function teardown(){
  if (!B) return;
  try { B.dispose && B.dispose(); } catch(e){ console.error(e); }
  disposeTree(B.scene);
  renderer.renderLists.dispose();
  B = null; CUR = null; PICKS = []; INSPECTABLES.clear(); fxPool = []; puffPool = []; fxG = null;
}
function ensure(def: Room3D){
  if (B && CUR === def) return;
  teardown();
  PICKS = []; INSPECTABLES.clear();
  const t0 = performance.now();
  B = def.build(); CUR = def;
  fxG = new THREE.Group(); fxG.name = 'fx'; B.scene.add(fxG);
  buildMarkers(B);
  enterViews(B);
  if (import.meta.env.DEV) console.debug(`[3d] built ${def.id} in ${(performance.now() - t0).toFixed(0)} ms`);
}

let visible = false;
function show(v: boolean){ if (v === visible) return; visible = v; glCanvas.style.visibility = v ? 'visible' : 'hidden'; }

export function register3D(def: Room3D){
  DEFS[def.id] = def;
  const base: Room = ROOMS[def.id];
  const R: Room = {
    ...base,
    webgl: true, back: undefined, light: undefined, over: undefined,
    enter(from){ ensure(def); try { base.enter && base.enter.call(base, from); } finally { enterViews(B, true); B && B.enter && B.enter(from); } },
    exit(){ try { base.exit && base.exit.call(base); } finally { teardown(); show(false); } },
    update(dt){ base.update && base.update.call(base, dt); },
    room(_c, dt){
      ensure(def); show(true);
      /* While a hand is on something -- a dial, the glass, the dough -- the
         camera holds still: no parallax, no drift, no ship roll. A drag maps
         through the camera, so a camera that moved under it would move the
         stroke. */
      const manip = !!(S.drag && S.drag.ctrl);
      placeCamera(dt, manip);
      updateHover();
      B.sync(dt);
      drawFX3(dt); drawPuffs3(dt);
      syncMarkers(dt);
      renderer.render(B.scene, camera);
      pushHits();
    }
  };
  if (base.zoom) R.zoom = () => base.zoom.call(base);
  ROOMS[def.id] = R;
  /* the room on screen before this module arrived picks it up next frame */
}
/* A room not (or not yet) in 3D still paints; its frames hide this canvas. */
export function wrapPainted(){
  for (const k of Object.keys(ROOMS)) if (!ROOMS[k].webgl){ const r = ROOMS[k], orig = r.room; if (orig && !(orig as any).__wrapped){ r.room = function(c, dt){ show(false); return orig.call(this, c, dt); }; (r.room as any).__wrapped = true; } }
}

/* Fonts arrive after the first paint; every room's text textures watch this. */
export let FONT_GEN = 0;
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { FONT_GEN++; });

/* For tools/three-check.mjs: where things are on screen and what the state
   is, read-only. Dev builds only. */
if (import.meta.env.DEV) (window as any).__go = go;
if (import.meta.env.DEV) (window as any).__three = {
  camera, renderer, THREE,
  scene: () => B && B.scene, room: () => S.room, view: () => activeView(),
  pickAt, CW: () => CW, CH: () => CH, QUAL: () => QUAL,
  toScreen: (x: number, y: number, z: number) => toScreen(new THREE.Vector3(x, y, z)),
  hits: () => HITS_PREV.map(h => { const [X, Y] = hitCanvasCenter(h); return { act: h.act, key: h.key, label: h.label, X, Y, r: h.shape[3] }; }),
  info: () => ({ geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, progs: renderer.info.programs?.length }),
  views: VIEWS_API, B: () => B, G: () => G, S: () => S
};
