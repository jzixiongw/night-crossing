import * as THREE from 'three';
import { tr } from '../i18n';
import { CAM, USER_MAX, cpt } from '../core/camera';
import { FX } from '../core/fx';
import { HITS, HITS_PREV, hitCanvasCenter, setPicker } from '../core/hits';
import { BRUSH, SAMBER, SCOOL, SFOG, SOFT, SPR_OF, SWARM, spr, txt, txtFit } from '../core/paint';
import { CH, CW, cv, onResize } from '../core/surface';
import { clamp, mixHex, mk, stage } from '../core/util';
import { K_WL } from '../core/depth';
import { COL, ORDER, ROUTES, TEA } from '../data/index';
import { CABIN_SPACE, WIN, lampPos } from '../rooms/cabin';
import { callPort } from '../rooms/hatch';
import { ROOMS, type Room } from '../rooms/registry';
import { S } from '../state/runtime';
import { G } from '../state/store';
import { drawSlip, slipH, workSlip } from '../ui/sheet';
import { C3, U, designX, designY, wallX, wallY } from './config';
import { RIM, blot, canvasTex, flatMat, glow, lathe, mesh, noRay, planarUV, rbox, rrPath, rrShape, texOf, toon } from './kit';
import { SKY_Z, buildSky, skyLocal } from './sky';

/* ================= THE CABIN, IN THREE.JS =================
   Opened with ?cabin=3d. It replaces only how the cabin is drawn and how a
   pointer finds things in it. Everything the cabin *does* still runs in
   rooms/cabin.ts: its update() moves the lamp, the beacons, the fog and the
   turn; its ACT handlers answer the taps; G and S hold the state; the main
   loop in core/loop.ts drives both, once per frame, and saves as before.

   What changes:
     - the picture is a lit 3D room on a WebGL canvas under the 2D one, which
       now only carries the vignette/grain pass and the keyboard focus ring;
     - hitAt() asks this module first, which raycasts (core/hits.ts setPicker);
     - a hit carries `local(e)`, so a drag on the glass gets a point on the
       glass's own plane, in WIN's design units, wherever the camera is;
     - CABIN_SPACE answers "which window is this beacon behind" and "where in
       the sky did I tap" from the real camera instead of the 2D matrices;
     - CAM.panX/panY/user/zoom/rot/lift, which the existing drag, wheel, pinch,
       keyboard and reduced-motion code already write, steer a 3D camera. */

const D2R = Math.PI/180;
const base: Room = ROOMS.cabin;
const RM = C3.room, CC = C3.camera, L = C3.layout, PAL = C3.palette, LT = C3.light;
const HW = RM.halfW, H = RM.h, BACK = RM.back;
const GLASS_Z = BACK - C3.glass.recess;

/* ---------- renderer, on its own canvas under the 2D one ---------- */
const glCanvas = document.createElement('canvas');
glCanvas.id = 'scene3d'; glCanvas.setAttribute('aria-hidden', 'true');
Object.assign(glCanvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none', visibility: 'hidden' });
stage.insertBefore(glCanvas, cv);
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: C3.render.antialias, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = C3.render.exposure;

const scene = new THREE.Scene(); scene.background = new THREE.Color('#070c17');
const camera = new THREE.PerspectiveCamera(CC.fov, 16/9, CC.near, CC.far);
const roomG = new THREE.Group(); roomG.name = 'room'; scene.add(roomG);
const sky = buildSky(); scene.add(sky.group);
const fxG = new THREE.Group(); scene.add(fxG);

function sizeRenderer(){ renderer.setSize(CW, CH, false); camera.aspect = CW/CH; }
sizeRenderer(); onResize(sizeRenderer);

/* ================= PICKING =================
   A pickable is any object carrying userData.pick. A ray goes through the
   whole room; the first solid thing it meets decides, so a lamp in front of
   the window takes the tap and a wall behind the desk blocks one. */
interface Pick {
  act: string; label?: string | (() => string); key?: string; cur?: string;
  on?: () => boolean;
  plane?: THREE.Plane; toLocal?: (pt: THREE.Vector3) => { x: number; y: number };
  sphere?: { c: THREE.Vector3; r: number };
}
const PICKS: { obj: THREE.Object3D; p: Pick }[] = [];
function pickable<T extends THREE.Object3D>(obj: T, p: Pick): T { obj.userData.pick = p; PICKS.push({ obj, p }); return obj; }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmp = new THREE.Vector3();
function rayAt(X: number, Y: number){ ndc.set(X/CW*2 - 1, -(Y/CH*2 - 1)); ray.setFromCamera(ndc, camera); return ray; }
const rayOf = (e) => { const p = cpt(e); return rayAt(p.X, p.Y); };
const shown = (o: THREE.Object3D) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
const labelOf = (p: Pick) => typeof p.label === 'function' ? p.label() : p.label;

/* A point on a pickable, in the units its action expects. */
function localFrom(obj: THREE.Object3D, p: Pick, pt: THREE.Vector3){ return p.toLocal ? p.toLocal(pt) : (() => { const l = obj.worldToLocal(pt.clone()); return { x: l.x, y: l.y }; })(); }
function record(obj: THREE.Object3D, p: Pick, X: number, Y: number, r: number){
  return {
    act: p.act, m: [1, 0, 0, 1, 0, 0], shape: ['c', X, Y, r], label: labelOf(p), key: p.key || p.act, cur: p.cur || 'pointer',
    /* a drag keeps asking where the pointer is on this same thing; a plane
       answers even when the pointer has slid off its edge */
    local: (e) => {
      const r2 = rayOf(e);
      if (p.plane){ if (r2.ray.intersectPlane(p.plane, tmp)) return localFrom(obj, p, tmp); return { x: NaN, y: NaN }; }
      const it = r2.intersectObject(obj, true)[0]; return it ? localFrom(obj, p, it.point) : { x: 0, y: 0 };
    }
  };
}
function pickAt(X: number, Y: number){
  if (ROOMS[S.room] !== R3) return undefined;
  for (const it of rayAt(X, Y).intersectObject(roomG, true)){
    if (!shown(it.object)) continue;
    let o: THREE.Object3D = it.object; while (o && o !== roomG && !o.userData.pick) o = o.parent;
    const p: Pick = o && o.userData.pick;
    if (!p || (p.on && !p.on())) return null;   // something solid with nothing to do is in the way
    return { h: record(o, p, X, Y, 0), p: localFrom(o, p, it.point) };
  }
  return null;
}
setPicker(pickAt);

/* Each frame every pickable on screen also goes into HITS as a circle in
   canvas pixels, so Tab, Enter, the focus ring and "what can I touch" work
   from the same list the painted rooms fill. */
const sph = new THREE.Box3(), sTmp = new THREE.Sphere();
function pushHits(){
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  for (const { obj, p } of PICKS){
    if (!shown(obj) || (p.on && !p.on())) continue;
    if (!p.sphere){ sph.setFromObject(obj); sph.getBoundingSphere(sTmp); p.sphere = { c: obj.worldToLocal(sTmp.center.clone()), r: sTmp.radius }; }
    const c = obj.localToWorld(p.sphere.c.clone()), e = c.clone().addScaledVector(right, p.sphere.r*.7);
    c.project(camera); e.project(camera);
    if (c.z > 1) continue;
    const X = (c.x + 1)/2*CW, Y = (1 - c.y)/2*CH, r = Math.hypot((e.x - c.x)/2*CW, (e.y - c.y)/2*CH);
    HITS.push(record(obj, p, X, Y, r));
  }
}

/* ================= TEXTURES PAINTED WITH THE 2D KIT ================= */
/* the raw 2D brush tile, mid-grey centred, for soft-light passes inside canvases */
const grainCanvas = (kind: number) => BRUSH[kind];
/* the wall panels, one bay 0.62 m wide, laid along the wall by its UVs (metres) */
const BAY = .62;
const panelTex = canvasTex(128, 544, (g, w, h) => {
  const y = (Y: number) => (1 - Y/H)*h;
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3e537c'); gr.addColorStop(.5, '#4a618b'); gr.addColorStop(1, '#33466c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const top = y(2.46), bot = y(.66);
  g.fillStyle = '#293858'; g.globalAlpha = .55; g.beginPath(); g.roundRect(7, top + 3, w - 10, bot - top, 10); g.fill();
  g.globalAlpha = 1; g.fillStyle = PAL.wall; g.beginPath(); g.roundRect(5, top, w - 10, bot - top - 2, 10); g.fill();
  const lg = g.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, 'rgba(91,120,166,.55)'); lg.addColorStop(.25, 'rgba(91,120,166,0)'); lg.addColorStop(1, 'rgba(20,28,48,.3)');
  g.fillStyle = lg; g.beginPath(); g.roundRect(5, top, w - 10, bot - top - 2, 10); g.fill();
  g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .3; g.fillStyle = g.createPattern(grainCanvas(1), 'repeat'); g.fillRect(0, 0, w, h);
});
panelTex.t.wrapS = panelTex.t.wrapT = THREE.RepeatWrapping;
const floorTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = PAL.floor; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++){ g.fillStyle = ['#4b3a48', '#46364a', '#503e4b', '#433343'][i]; g.fillRect(i*w/4 + 1, 0, w/4 - 2, h); g.fillStyle = PAL.floorSeam; g.globalAlpha = .55; g.fillRect(i*w/4 - 1, 0, 2.5, h); g.fillRect(i*w/4, (i*97 % h), w/4, 2); g.globalAlpha = 1; }
  g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .35; g.fillStyle = g.createPattern(grainCanvas(1), 'repeat'); g.fillRect(0, 0, w, h);
});
floorTex.t.wrapS = floorTex.t.wrapT = THREE.RepeatWrapping;
const boardTex = canvasTex(512, 128, (g, w, h) => {
  g.fillStyle = PAL.wood; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 7; i++){ const x = i*w/7; g.fillStyle = i % 2 ? '#9c6646' : '#8f5c3d'; g.fillRect(x, 0, w/7, h); g.fillStyle = '#5c3927'; g.globalAlpha = .35; g.fillRect(x, 0, 2, h); g.globalAlpha = 1; }
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,220,170,.14)'); gr.addColorStop(1, 'rgba(20,10,10,.25)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .6; g.fillStyle = g.createPattern(grainCanvas(1), 'repeat'); g.fillRect(0, 0, w, h);
});
const stripeTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = PAL.blanket; g.fillRect(0, 0, w, h); g.fillStyle = PAL.stripe; g.globalAlpha = .7;
  for (const x of [.22, .34, .66, .78]) g.fillRect(x*w, 0, w*.045, h);
  g.globalAlpha = 1; g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .5; g.fillStyle = g.createPattern(grainCanvas(0), 'repeat'); g.fillRect(0, 0, w, h);
});

/* ================= THE ROOM =================
   Static shell first: walls, windows, floor, ceiling. */
const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = roomG): T => { parent.add(o); return o; };
const shellMat = (map: THREE.Texture, rep: [number, number]) => { const t = map.clone(); t.repeat.set(rep[0], rep[1]); t.wrapS = t.wrapT = THREE.RepeatWrapping; return toon('#ffffff', { map: t, rim: 0 }); };

/* back wall, with the two windows cut through it */
const wallShape = new THREE.Shape(); wallShape.moveTo(-HW, 0); wallShape.lineTo(HW, 0); wallShape.lineTo(HW, H); wallShape.lineTo(-HW, H); wallShape.closePath();
const winRect = (side: string) => { const [x, y, w, h] = WIN[side]; return { X0: wallX(x), X1: wallX(x + w), Y0: wallY(y + h), Y1: wallY(y), r: U(70) }; };
for (const s of ['left', 'right']){ const q = winRect(s); wallShape.holes.push(rrPath(new THREE.Path(), q.X0, q.Y0, q.X1 - q.X0, q.Y1 - q.Y0, q.r)); }
{
  const g = new THREE.ExtrudeGeometry(wallShape, { depth: RM.wallT, bevelEnabled: false, curveSegments: 12 });
  const t = panelTex.t.clone(); t.repeat.set(1/BAY, 1/H); t.offset.set(HW/BAY % 1, 0); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  add(mesh(g, toon('#ffffff', { map: t, rim: 0 }), [0, 0, BACK - RM.wallT], { cast: false }));
}
/* wainscot, rail, cornice */
add(mesh(rbox(HW*2, .59, .05, .01), toon(PAL.wainscot, { grain: 1, rep: [10, 1], rim: 0 }), [0, .295, BACK + .025], { cast: false }));
add(mesh(rbox(HW*2, .07, .08, .025), toon(PAL.rail), [0, .61, BACK + .04], { cast: false }));
add(mesh(rbox(HW*2, .12, .1, .02), toon(PAL.cornice, { grain: 1, rep: [10, 1], rim: 0 }), [0, H - .06, BACK + .05], { cast: false }));
add(mesh(rbox(HW*2, .055, .06, .02), toon(PAL.metalD), [0, H - .15, BACK + .03], { cast: false }));
for (const [x0, n] of [[300, 10], [950, 14]] as const) for (let k = 0; k < n; k++)
  add(mesh(rbox(U(12), U(52), .012, .02), flatMat('#16213a', { opacity: .55 }), [wallX(x0 + k*28 + 6), wallY(626), BACK + .052], { cast: false, receive: false }));

/* window frames, bolts, sills; the glass comes later because it is live */
for (const s of ['left', 'right']){
  const q = winRect(s), o = U(26);
  const ring = rrShape(q.X0 - o, q.Y0 - o, q.X1 - q.X0 + o*2, q.Y1 - q.Y0 + o*2, U(92));
  ring.holes.push(rrPath(new THREE.Path(), q.X0, q.Y0, q.X1 - q.X0, q.Y1 - q.Y0, q.r));
  const g = new THREE.ExtrudeGeometry(ring, { depth: .06, bevelEnabled: true, bevelThickness: .025, bevelSize: .018, bevelSegments: 3, curveSegments: 14 });
  add(mesh(g, toon(PAL.frame, { grain: 1, rep: 2 }), [0, 0, BACK + .005]));
  const [x, y, w, h] = WIN[s], bolt = new THREE.SphereGeometry(.016, 10, 8), bm = toon(PAL.bolt, { grain: -1 });
  for (let k = 0; k < 7; k++) for (const yy of [y - 14, y + h + 14]) add(mesh(bolt, bm, [wallX(x + 90 + k*60), wallY(yy), BACK + .095], { cast: false }));
  for (let k = 0; k < 4; k++) for (const xx of [x - 14, x + w + 14]) add(mesh(bolt, bm, [wallX(xx), wallY(y + 90 + k*67), BACK + .095], { cast: false }));
  add(mesh(rbox(U(w + 60), .07, .2, .03), toon(PAL.sill), [wallX(x + w/2), wallY(y + h + 32), BACK + .1]));
  add(blot(U(w)*.55, .12, .35)).position.set(wallX(x + w/2), .002, BACK + .5);
}
/* breaker panel */
{
  const b = L.breaker, cx = (b.x0 + b.x1)/2, cy = (b.y0 + b.y1)/2, w = b.x1 - b.x0, h = b.y1 - b.y0;
  add(mesh(rbox(w, h, .07, .03), toon(PAL.metalD), [cx, cy, BACK + .035]));
  add(mesh(rbox(w*.84, h*.66, .02, .02), toon('#1a2640', { grain: 0 }), [cx, cy + h*.1, BACK + .065], { cast: false }));
  const sw = rbox(.05, .1, .03, .012), sm = toon(PAL.cream, { grain: 0 });
  for (let i = 0; i < 8; i++) add(mesh(sw, sm, [cx - w*.3 + (i % 4)*w*.2, cy + h*.27 - Math.floor(i/4)*h*.3, BACK + .085]));
  add(mesh(new THREE.BoxGeometry(w*.8, .006, .005), flatMat('#c4b392', { opacity: .4 }), [cx, b.y0 + .14, BACK + .072], { cast: false }));
}
/* floor, ceiling, side walls */
{
  const depth = RM.front - BACK, zc = (RM.front + BACK)/2;
  const f = add(mesh(new THREE.PlaneGeometry(HW*2, depth), shellMat(floorTex.t, [HW*2/.9, depth/.9]), [0, 0, zc], { rot: [-Math.PI/2, 0, 0], cast: false }));
  f.renderOrder = -1;
  add(mesh(new THREE.PlaneGeometry(HW*2, depth), toon(PAL.ceiling, { grain: 1, rep: [6, 6], rim: 0 }), [0, H, zc], { rot: [Math.PI/2, 0, 0], cast: false }));
  for (const z of [-1.75, -.25, 1.25]) add(mesh(rbox(HW*2, .08, .12, .02), toon(PAL.beam, { grain: 1, rep: [8, 1], rim: 0 }), [0, H - .05, z], { cast: false }));
  for (const sx of [-1, 1]){
    const t = panelTex.t.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(depth/BAY, 1);
    add(mesh(new THREE.PlaneGeometry(depth, H), toon('#c8d0e0', { map: t, rim: 0 }), [sx*HW, H/2, zc], { rot: [0, -sx*Math.PI/2, 0], cast: false }));
    add(mesh(rbox(.05, .59, depth, .01), toon(PAL.wainscot, { grain: 1, rep: [8, 1], rim: 0 }), [sx*(HW - .025), .295, zc], { cast: false }));
    add(mesh(rbox(.08, .07, depth, .025), toon(PAL.rail), [sx*(HW - .04), .61, zc], { cast: false }));
    add(mesh(rbox(.1, .12, depth, .02), toon(PAL.cornice, { rim: 0 }), [sx*(HW - .05), H - .06, zc], { cast: false }));
    add(mesh(rbox(.12, H, .12, .03), toon(PAL.frame), [sx*(HW - .06), H/2, BACK + .06], { cast: false }));
  }
}
/* the door, on the left wall */
{
  const g = add(new THREE.Group()); g.position.set(-HW + .004, 0, L.door.z); g.rotation.y = Math.PI/2;
  const { w, h } = L.door;
  add(mesh(rbox(w + .12, h + .08, .04, .02), toon(PAL.doorFrame), [0, (h + .08)/2, .02]), g);
  add(mesh(rbox(w, h, .05, .025), toon(PAL.door, { grain: 1, rep: [1, 2] }), [0, h/2, .045]), g);
  add(mesh(rbox(w*.9, .05, .02, .01), toon('#e0b07e'), [0, .16, .075]), g);
  add(mesh(new THREE.CircleGeometry(.13, 32), toon(PAL.porthole, { grain: -1, emissive: '#22344f', ei: 1 }), [0, 1.45, .072]), g);
  add(mesh(new THREE.TorusGeometry(.135, .022, 10, 32), toon(PAL.brass, { grain: -1 }), [0, 1.45, .074]), g);
  add(glow(SCOOL, .32, .35), g).position.set(0, 1.45, .09);
  add(mesh(new THREE.SphereGeometry(.035, 14, 10), toon(PAL.handle, { grain: -1 }), [w/2 - .12, .98, .1]), g);
  pickable(g, { act: 'go:corridor', label: tr('舱门（回环廊）'), key: 'cabDoor' });
}
/* rug */
{
  const r = L.rug, g = add(new THREE.Group()); g.position.set(0, 0, r.z); g.scale.set(r.rx, 1, r.rz);
  add(mesh(new THREE.CylinderGeometry(1, 1, .014, 64), toon(PAL.rug, { grain: 1, rep: 3, rim: 0 }), [0, .007, 0], { cast: false }), g);
  add(mesh(new THREE.RingGeometry(.86, .9, 64), toon(PAL.rugBorder, { grain: -1, side: THREE.DoubleSide }), [0, .0145, 0], { rot: [-Math.PI/2, 0, 0], cast: false }), g);
}

/* ---- the bench under the left window ---- */
const blanketFolded = (() => {
  const b = L.bench, z = BACK + b.depth/2 + .02;
  add(blot(b.len*.6, .4, .55)).position.set(b.x, .003, z + .05);
  add(mesh(rbox(b.len, .3, b.depth, .03), toon(PAL.woodD), [b.x, .15, z]));
  add(mesh(rbox(b.len - .04, .15, b.depth - .03, .06), toon(PAL.cushion, { grain: 1, rep: [3, 1] }), [b.x, .37, z]));
  const back = add(mesh(rbox(b.len - .08, .46, .15, .07), toon(PAL.cushion, { grain: 1, rep: [3, 1] }), [b.x, .66, BACK + .11]));
  back.rotation.x = -.12;
  for (const dx of [-.28, .28]) add(mesh(rbox(.012, .34, .01, .004), flatMat('#364d70', { opacity: .6 }), [b.x + dx, .66, BACK + .19], { cast: false, receive: false })).rotation.x = -.12;
  const bl = add(mesh(rbox(.58, .1, .38, .035), toon('#ffffff', { map: stripeTex.t }), [wallX(466), .5, z + .03]));
  bl.rotation.y = .06;
  return pickable(bl, { act: 'cab:blanket', label: tr('毯子') });
})();

/* ---- the plant ---- */
const plantLeaves = (() => {
  const p = L.plant, g = add(new THREE.Group()); g.position.set(p.x, 0, p.z);
  add(blot(.3, .16, .55), g).position.y = .003;
  add(mesh(lathe([[0, 0], [.12, 0], [.155, .26], [.172, .262], [.172, .31], [.152, .31], [.15, .29], [0, .29]], 28), toon(PAL.pot, { grain: 1 })), g);
  add(mesh(new THREE.CircleGeometry(.15, 24), toon(PAL.soil, { grain: 0 }), [0, .292, 0], { rot: [-Math.PI/2, 0, 0] }), g);
  const leaves = add(new THREE.Group(), g); leaves.position.y = .29;
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(.5, .5, 0, 1); leafShape.quadraticCurveTo(-.5, .5, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 10);
  const m1 = toon(PAL.leaf, { grain: 0, side: THREE.DoubleSide }), m2 = toon(PAL.leafD, { grain: 0, side: THREE.DoubleSide });
  ([[-.95, 62], [-.55, 78], [-.2, 88], [.15, 84], [.5, 76], [.9, 60], [-1.25, 50], [1.2, 52]] as const).forEach(([a, len], i) => {
    const l = mesh(leafGeo, i % 2 ? m1 : m2); const s = U(len)*1.55;
    l.scale.set(s*(.36 + (i % 3)*.05), s, s); l.rotation.set(0, (i % 2 ? .5 : -.5) + i*.3, -a*.9, 'YXZ');
    add(l, leaves);
  });
  pickable(g, { act: 'cab:plant', label: tr('盆栽') });
  return leaves;
})();

/* ---- chart table, stool, side table and its lamp ---- */
const chartTex = canvasTex(512, 300, (g, w, h) => {
  g.fillStyle = PAL.paper; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .5; g.fillStyle = g.createPattern(grainCanvas(0), 'repeat'); g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.strokeStyle = 'rgba(42,53,80,.12)'; g.lineWidth = 1; for (let i = 1; i < 8; i++){ g.beginPath(); g.moveTo(i*w/8, 0); g.lineTo(i*w/8, h); g.stroke(); } for (let i = 1; i < 5; i++){ g.beginPath(); g.moveTo(0, i*h/5); g.lineTo(w, i*h/5); g.stroke(); }
  /* the unfinished line, and a dot for every colour that has answered */
  g.strokeStyle = 'rgba(51,70,110,.75)'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(40, 220); g.bezierCurveTo(140, 120, 240, 250, 360, 130); g.stroke();
  ORDER.filter(cl => G.answered[cl] > 0).forEach((cl, i) => { g.fillStyle = COL[cl].hex; g.beginPath(); g.arc(80 + i*80, 196 - i*22, 13, 0, Math.PI*2); g.fill(); });
});
const chartLampParts = (() => {
  const t = L.chartTable, g = add(new THREE.Group()); g.position.set(t.x, 0, t.z);
  add(blot(t.w*.65, t.d*.75, .55), g).position.y = .003;
  const leg = rbox(.06, t.h, .06, .015), lm = toon(PAL.woodD);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(mesh(leg, lm, [sx*(t.w/2 - .07), t.h/2, sz*(t.d/2 - .07)]), g);
  add(mesh(rbox(t.w - .1, .04, .03, .01), lm, [0, .25, t.d/2 - .07]), g);
  add(mesh(rbox(t.w, .05, t.d, .02), toon(PAL.wood, { grain: 1, rep: [2, 1] }), [0, t.h + .025, 0]), g);
  add(mesh(new THREE.PlaneGeometry(t.w*.84, t.d*.78), toon('#ffffff', { map: chartTex.t, grain: -1 }), [0, t.h + .052, .02], { rot: [-Math.PI/2, 0, .06], cast: false }), g);
  add(mesh(new THREE.CylinderGeometry(.007, .007, .18, 8), toon('#8a5a44', { grain: -1 }), [t.w*.3, t.h + .06, .1], { rot: [0, 0, Math.PI/2 + .3] }), g);
  pickable(g, { act: 'cab:chart', label: tr('图桌') });
  /* the stool pushed under it */
  const st = add(new THREE.Group()); st.position.set(t.x + .12, 0, t.z + .55);
  add(blot(.26, .18, .5), st).position.y = .003;
  add(mesh(new THREE.CylinderGeometry(.19, .19, .05, 24), toon(PAL.woodD), [0, .52, 0]), st);
  for (let i = 0; i < 3; i++){ const a = i*2.094 + .4; add(mesh(new THREE.CylinderGeometry(.015, .015, .52, 8), toon(PAL.metalD, { grain: -1 }), [Math.cos(a)*.12, .26, Math.sin(a)*.12]), st); }
  /* side table and the reading lamp on it */
  const s = L.sideTable, sg = add(new THREE.Group()); sg.position.set(s.x, 0, s.z);
  add(blot(.3, .2, .55), sg).position.y = .003;
  add(mesh(new THREE.CylinderGeometry(.17, .19, .03, 24), toon(PAL.woodD), [0, .015, 0]), sg);
  add(mesh(new THREE.CylinderGeometry(.03, .03, .6, 12), toon(PAL.woodD), [0, .31, 0]), sg);
  add(mesh(new THREE.CylinderGeometry(.27, .27, .04, 32), toon(PAL.wood), [0, .62, 0]), sg);
  const lamp = add(new THREE.Group(), sg); lamp.position.y = .64;
  add(mesh(new THREE.CylinderGeometry(.07, .08, .025, 20), toon(PAL.brass, { grain: -1 }), [0, .012, 0]), lamp);
  add(mesh(new THREE.CylinderGeometry(.012, .012, .42, 8), toon(PAL.brass, { grain: -1 }), [0, .23, 0]), lamp);
  const shadeMat = toon(PAL.shadeOff, { grain: 0, side: THREE.DoubleSide });
  add(mesh(new THREE.CylinderGeometry(.06, .15, .17, 28, 1, true), shadeMat, [0, .46, 0]), lamp);
  const bulbMat = toon('#fff6dc', { grain: -1, emissive: '#ffd59a', ei: 0 });
  add(mesh(new THREE.SphereGeometry(.035, 12, 10), bulbMat, [0, .41, 0], { cast: false }), lamp);
  const light = add(new THREE.PointLight(LT.chart.color, 0, LT.chart.distance, LT.chart.decay), lamp); light.position.y = .38;
  const halo = add(glow(SWARM, 1.1, 0), lamp); halo.position.y = .38;
  pickable(lamp, { act: 'cab:chartlamp', label: () => S.reading ? tr('关掉图桌的灯') : tr('打开图桌的灯') });
  return { shadeMat, bulbMat, light, halo };
})();

/* ---- route sign between the windows ---- */
const signTex = canvasTex(372, 312, (g) => {
  g.setTransform(3, 0, 0, 3, 0, 0);
  g.fillStyle = PAL.paper; g.beginPath(); g.roundRect(0, 0, 124, 104, 12); g.fill();
  txt(g, tr('下 一 站'), 62, 32, 14, '#7d7a72');
  g.fillStyle = '#c4b392'; g.fillRect(18, 40, 88, 2);
  const P = callPort();
  if (P){ txtFit(g, tr(P.name), 62, 66, 104, 19, '#2a3550'); txtFit(g, tr(ROUTES[G.route].name), 62, 88, 104, 12, '#7d7a72'); }
  else txtFit(g, tr('还没定'), 62, 76, 104, 18, '#9a9384');
});
{
  const g = add(new THREE.Group()); g.position.set(wallX(800), wallY(438), BACK + .02);
  add(blot(U(80), .06, .4)).position.set(0, .002, BACK + .5);
  add(mesh(rbox(U(124), U(104), .03, .03), toon(PAL.paper)), g);
  add(mesh(new THREE.PlaneGeometry(U(124), U(104)), toon('#ffffff', { map: signTex.t, grain: -1 }), [0, 0, .0155], { cast: false }), g);
  for (const [x, y] of [[-50, 40], [50, 40], [-50, -40], [50, -40]]) add(mesh(new THREE.SphereGeometry(.011, 8, 6), toon(PAL.brass, { grain: -1 }), [U(x), U(y), .02]), g);
  pickable(g, { act: 'cab:route', label: tr('航程单') });
}
/* ---- the work slip pinned on the pier left of the window ---- */
const slip = (() => {
  const S3 = 3, { dx, dy, dw } = L.slip;
  const c = mk(dw*S3, 600*S3), g = c.getContext('2d'), t = texOf(c);
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(.5, -.5, 0);
  /* a little starlight on the paper, as the 2D cabin kept a light hole here,
     so the slip stays readable with the lamp off */
  const m = add(mesh(geo, toon('#ffffff', { map: t, grain: -1, transparent: true, emissive: '#3c4866', ei: .55 }), [wallX(dx), wallY(dy), BACK + .012], { cast: false }));
  m.rotation.z = .014;
  pickable(m, { act: 'ui:work', label: tr('这一趟'), key: 'work' });
  let sig = '', next = 0;
  const redraw = () => {
    if (S.T < next) return; next = S.T + .5;
    const s = workSlip(dw), now = JSON.stringify(s.rows) + s.title + (s.head || '') + (s.foot || '');
    if (now === sig) return; sig = now;
    const hh = Math.ceil(slipH(s)); c.height = hh*S3; g.setTransform(S3, 0, 0, S3, 0, 0); g.clearRect(0, 0, dw, hh); drawSlip(g, s);
    t.dispose(); t.needsUpdate = true; m.scale.set(U(dw), U(hh), 1);
    const p = m.userData.pick as Pick; p.sphere = null;
  };
  return { redraw, reset: () => { sig = ''; next = 0; } };
})();

/* ================= THE GLASS =================
   One pane per window, cut to the same rounded rect as the hole in the wall.
   Its UVs run 0..1 across WIN[side], so a point on the pane converts to WIN's
   design units by a plain lerp -- and that is the space S.breaths and
   S.strokes already live in, so the fog the 2D cabin keeps is drawn here. */
const glassPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -GLASS_Z);
const toWin = (pt: THREE.Vector3) => ({ x: designX(pt.x), y: designY(pt.y) });
const streakTex = canvasTex(256, 180, (g, w, h) => {
  g.fillStyle = 'rgba(255,255,255,.07)';
  for (const [a, b] of [[120, 170], [200, 214]]){ const k = w/534; g.beginPath(); g.moveTo(a*k, h); g.lineTo(b*k, h); g.lineTo((b + 150)*k, 0); g.lineTo((a + 150)*k, 0); g.closePath(); g.fill(); }
});
const reflTex = canvasTex(4, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,214,160,.32)'); gr.addColorStop(1, 'rgba(120,80,60,.55)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const [FWX, FWY, FWW, FWH] = WIN.left, FR = C3.glass.fogRes;
const fogC = mk(FWW*FR, FWH*FR), fogG = fogC.getContext('2d'), fogT = texOf(fogC);
const glass = ['left', 'right'].map(side => {
  const q = winRect(side), shape = rrShape(q.X0, q.Y0, q.X1 - q.X0, q.Y1 - q.Y0, q.r);
  const geo = planarUV(new THREE.ShapeGeometry(shape, 14));
  const pane = add(mesh(geo, flatMat('#9fb8d6', { opacity: .05 }), [0, 0, GLASS_Z], { cast: false, receive: false }));
  pickable(pane, {
    act: 'cab:glass:' + side, label: side === 'left' ? tr('舷窗（长按哈气）') : tr('舷窗'), cur: 'crosshair', key: 'cab:glass:' + side,
    plane: glassPlane, toLocal: toWin
  });
  const refl = add(noRay(mesh(geo, flatMat('#ffffff', { opacity: 0, map: reflTex.t }), [0, 0, GLASS_Z + .002], { cast: false, receive: false })));
  add(noRay(mesh(geo, flatMat('#ffffff', { opacity: 1, map: streakTex.t }), [0, 0, GLASS_Z + .003], { cast: false, receive: false })));
  const lampRefl = add(glow(SWARM, U(180), 0)); lampRefl.position.set(0, wallY(WIN[side][1] + 120), GLASS_Z + .004);
  const fog = side === 'left' ? add(noRay(mesh(geo, flatMat('#ffffff', { opacity: C3.glass.fogOpacity, map: fogT }), [0, 0, GLASS_Z + .005], { cast: false, receive: false }))) : null;
  return { side, refl, lampRefl, fog };
});
let fogWasLive = false;
/* The 2D cabin's drawFog, onto a canvas that belongs to the glass instead of
   the screen: same breaths, same strokes, same design units. */
function drawFog3(){
  const live = S.breaths.length > 0 || S.strokes.length > 0;
  glass[0].fog.visible = live;
  if (!live && !fogWasLive) return; fogWasLive = live;
  const f = fogG; f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.globalAlpha = 1; f.clearRect(0, 0, fogC.width, fogC.height);
  f.setTransform(FR, 0, 0, FR, -FWX*FR, -FWY*FR);
  S.breaths.forEach(b => { f.globalAlpha = Math.min(1, b.life*1.3); const r = b.r*1.3; f.drawImage(SOFT, b.x - r, b.y - r, r*2, r*2); f.drawImage(SOFT, b.x - r*.7, b.y - r*.7, r*1.4, r*1.4); });
  f.globalAlpha = 1; f.globalCompositeOperation = 'destination-out'; f.lineCap = 'round'; f.lineJoin = 'round';
  S.strokes.forEach(s => { if (s.pts.length < 2) return; for (const [lw, a] of [[34, .35], [22, 1]]){ f.globalAlpha = Math.min(1, s.life*1.4)*a; f.lineWidth = lw; f.beginPath(); s.pts.forEach(([x, y], i) => i ? f.lineTo(x, y) : f.moveTo(x, y)); f.stroke(); } });
  f.globalCompositeOperation = 'source-in'; f.globalAlpha = 1; f.fillStyle = G.lamp === 2 ? '#a9bccc' : '#dde8f0'; f.fillRect(FWX, FWY, FWW, FWH); f.globalCompositeOperation = 'source-over';
  fogT.needsUpdate = true;
}

/* ================= LIGHTS ================= */
const hemi = add(new THREE.HemisphereLight(LT.hemiSky, LT.hemiGround, LT.hemi[0]), scene);
const moon = add(new THREE.DirectionalLight(LT.moon.color, LT.moon.intensity[0]), scene);
moon.position.set(-1.2, 3.2, BACK - 4); moon.target.position.set(.4, .4, 1.5); scene.add(moon.target);

/* ---- the hanging lamp: swings from the ceiling, carries its own lights ---- */
const lamp = (() => {
  const pivot = add(new THREE.Group()); pivot.position.set(0, H, L.lampZ);
  const rod = L.lampRod;
  add(mesh(new THREE.CylinderGeometry(.012, .012, rod, 8), toon(PAL.metalD, { grain: -1 }), [0, -rod/2, 0]), pivot);
  add(mesh(new THREE.CylinderGeometry(.045, .055, .05, 16), toon(PAL.brass, { grain: -1 }), [0, -rod, 0]), pivot);
  const hit = add(new THREE.Group(), pivot);
  /* bottom to top, so the lathe's front faces point outward */
  const prof: [number, number][] = [[.305, -.31], [.3, -.3], [.27, -.22], [.23, -.14], [.17, -.07], [.1, -.02], [.04, 0]];
  const shadeGeo = lathe(prof, 40); shadeGeo.translate(0, -rod, 0);
  add(mesh(shadeGeo, toon(PAL.teal, { grain: 1, rep: [3, 1] })), hit);
  const inner = toon('#fff1d6', { grain: -1, side: THREE.BackSide, emissive: '#ffcf8f', ei: 1 });
  add(mesh(shadeGeo, inner, undefined, { cast: false }), hit);
  const bulbMat = toon('#fff6dc', { grain: -1, emissive: '#ffe2b0', ei: 1 });
  add(mesh(new THREE.SphereGeometry(.065, 16, 12), bulbMat, [0, -rod - .26, 0], { cast: false }), hit);
  const cord = add(mesh(new THREE.CylinderGeometry(.004, .004, 1, 6), toon('#c9a26a', { grain: -1 }), [.2, 0, .04], { cast: false }), hit);
  const bead = add(mesh(new THREE.SphereGeometry(.026, 12, 10), toon(PAL.brass, { grain: -1 }), [.2, 0, .04]), hit);
  pickable(hit, { act: 'cab:lamp', label: tr('灯绳'), key: 'lamp' });
  const bulbY = -rod - .26;
  const point = add(new THREE.PointLight(LT.lamp.color, 0, LT.lamp.distance, LT.lamp.decay), pivot); point.position.y = bulbY - .02;
  const spot = add(new THREE.SpotLight(LT.lamp.color, 0, LT.lamp.distance, LT.lamp.angle, LT.lamp.penumbra, LT.lamp.decay), pivot);
  spot.position.y = bulbY; spot.target.position.set(0, -10, 0); pivot.add(spot.target);
  spot.castShadow = true; spot.shadow.mapSize.set(C3.render.shadowMap, C3.render.shadowMap); spot.shadow.bias = -.0006; spot.shadow.normalBias = .02;
  spot.shadow.radius = LT.lamp.shadowRadius; spot.shadow.camera.near = .1; spot.shadow.camera.far = 8;
  const halo = add(glow(SWARM, 2.4, 0), pivot); halo.position.y = bulbY;
  const core = add(glow(SWARM, .36, 0), pivot); core.position.y = bulbY;
  return { pivot, inner, bulbMat, cord, bead, point, spot, halo, core, bulbY };
})();

/* ---- the strings of bulbs, one bulb per beacon answered ---- */
const bulbs = (() => {
  const wire = toon('#1c2742', { grain: -1 });
  S.cat.forEach(f => {
    const pts = []; for (let i = 0; i <= 24; i++){ const [x, y] = f(i/24); pts.push(new THREE.Vector3(wallX(x), wallY(y), L.bulbZ)); }
    add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .006, 5), wire, undefined, { cast: false }));
    for (const p of [pts[0], pts[pts.length - 1]]) add(mesh(new THREE.CylinderGeometry(.005, .005, H - p.y, 5), wire, [p.x, (H + p.y)/2, p.z], { cast: false }));
  });
  const bulbGeo = lathe([[0, -.064], [.012, -.062], [.024, -.05], [.027, -.03], [.012, -.004], [0, 0]], 16);
  const pool = Array.from({ length: 12 }, () => {
    const g = add(new THREE.Group()); g.visible = false;
    add(mesh(new THREE.CylinderGeometry(.002, .002, U(9), 4), wire, [0, -U(4.5), 0], { cast: false }), g);
    add(mesh(new THREE.CylinderGeometry(.011, .011, U(8), 10), toon(PAL.metalD, { grain: -1 }), [0, -U(11), 0], { cast: false }), g);
    const mat = toon('#ffffff', { grain: -1, emissive: '#ffffff', ei: .7 });
    const b = add(mesh(bulbGeo, mat, [0, -U(13), 0], { cast: false }), g);
    const halo = add(glow(SWARM, U(92)), g); halo.position.y = -U(13) - .035;
    return { g, b, mat, halo, color: '' };
  });
  const light = add(new THREE.PointLight('#ffffff', 0, LT.bulbs.distance, LT.bulbs.decay));
  return { pool, light };
})();

/* ---- the near desk and what is on it ---- */
const D = L.desk, DZ = L.deskItemsZ, TOP = D.top, IT = L.items;
{
  const w = D.x1 - D.x0, d = D.z1 - D.z0, cx = (D.x0 + D.x1)/2, cz = (D.z0 + D.z1)/2;
  const bt = boardTex.t.clone(); bt.repeat.set(w/2.4, 1); bt.wrapS = bt.wrapT = THREE.RepeatWrapping;
  add(mesh(rbox(w, .06, d, .025), toon('#ffffff', { map: bt }), [cx, TOP - .03, cz]));
  add(mesh(rbox(w - .04, TOP - .06, .05, .02), toon(PAL.woodD, { grain: 2, rep: [6, 1] }), [cx, (TOP - .06)/2, D.z1 - .05]));
  add(mesh(rbox(w - .12, .035, .04, .015), toon(PAL.wood), [cx, TOP + .017, D.z0 + .03]));
}
const onDesk = (x: number, z = DZ) => { const g = add(new THREE.Group()); g.position.set(x, TOP, z); return g; };

/* the vase, and whatever is in it */
const vase = (() => {
  const g = onDesk(IT.vase); g.scale.setScalar(.8);
  add(blot(.11, .06, .45), g).position.y = .002;
  add(mesh(lathe([[0, 0], [.05, 0], [.085, .05], [.08, .11], [.042, .16], [.032, .19], [.04, .205], [.036, .21], [0, .21]], 28),
    toon(PAL.glassTint, { grain: -1, emissive: '#3c5c66', ei: .3 })), g);
  const flowers = add(new THREE.Group(), g); flowers.position.y = .2;
  pickable(g, { act: 'cab:vase', label: tr('花瓶') });
  let kind = '__';
  const stem = (pts: [number, number, number][], r = .004) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 16, r, 5), toon('#2f5f5a', { grain: -1 }), undefined, { cast: false });
  function sync(){
    if (G.vase === kind) return; kind = G.vase;
    flowers.clear();
    if (G.vase === 'vine'){
      add(stem([[0, 0, 0], [-.02, .1, 0], [0, .2, 0]]), flowers);
      const star = new THREE.Shape(); for (let k = 0; k < 10; k++){ const a = Math.PI/2 + k*Math.PI/5, r = k % 2 ? .46 : 1; const x = Math.cos(a)*r, y = Math.sin(a)*r; k ? star.lineTo(x, y) : star.moveTo(x, y); }
      const sg = new THREE.ShapeGeometry(star).scale(.03, .03, .03), sm = toon('#f2a95b', { grain: -1, emissive: '#f2a95b', ei: .7, side: THREE.DoubleSide });
      for (const [x, y] of [[0, .2], [-.05, .15], [.045, .13]]){ add(mesh(sg, sm, [x, y, .01], { cast: false }), flowers); add(glow(SAMBER, .14, .5), flowers).position.set(x, y, .02); }
    } else if (G.vase === 'bell'){
      add(stem([[0, 0, 0], [.03, .12, 0], [.09, .15, 0]]), flowers); add(stem([[0, 0, 0], [-.03, .1, 0], [-.08, .13, 0]]), flowers);
      const bg = new THREE.CylinderGeometry(.006, .03, .045, 16, 1, true), bm = toon('#b5cddc', { grain: -1, side: THREE.DoubleSide, emissive: '#7894ab', ei: .25 });
      for (const x of [.09, -.08]) add(mesh(bg, bm, [x, .11, 0], { cast: false }), flowers);
    } else if (G.vase === 'fern'){
      add(stem([[0, 0, 0], [.01, .12, 0], [.05, .24, 0]], .003), flowers);
      const lg = new THREE.SphereGeometry(1, 10, 6), lm = toon(PAL.leaf, { grain: -1 });
      for (let k = 0; k < 6; k++){ const y = .04 + k*.035, x = .004 + k*.008;
        for (const s of [-1, 1]){ const l = mesh(lg, lm, [x + s*.03, y, 0], { cast: false }); l.scale.set(.03, .01, .012); l.rotation.z = s*.35; add(l, flowers); } }
    }
  }
  return { sync };
})();

/* the cup: a real cup, so the tea is a surface that drops as you drink */
const cup = (() => {
  const g = onDesk(IT.cup);
  add(blot(.11, .07, .45), g).position.y = .002;
  const s = .95, prof: [number, number][] = [[0, 0], [.05, 0], [.066, .028], [.073, .1], [.066, .1], [.06, .034], [.046, .016], [0, .016]];
  add(mesh(lathe(prof.map(([x, y]) => [x*s, y*s]), 32), toon(PAL.cream, { grain: -1, side: THREE.DoubleSide })), g);
  add(mesh(new THREE.CylinderGeometry(.0715*s, .0705*s, .012*s, 32, 1, true), toon('#7fa0bb', { grain: -1 }), [0, .07*s, 0], { cast: false }), g);
  const handle = add(mesh(new THREE.TorusGeometry(.026*s, .008*s, 8, 18, Math.PI), toon(PAL.cream, { grain: -1 }), [.072*s, .058*s, 0]), g);
  handle.rotation.z = -Math.PI/2;
  const teaMat = toon('#c9853f', { grain: -1, emissive: '#000000' });
  const tea = add(mesh(new THREE.CircleGeometry(1, 28), teaMat, undefined, { cast: false, rot: [-Math.PI/2, 0, 0] }), g);
  const leafM = toon('#5b7a3a', { grain: -1 }), leaves = add(new THREE.Group(), g);
  for (const [x, z, r] of [[-.02, .005, .4], [.016, -.01, -.5], [.004, .014, 1.2]]){ const l = mesh(new THREE.CircleGeometry(1, 8), leafM, [x, 0, z], { cast: false, rot: [-Math.PI/2, 0, r] }); l.scale.set(.012, .004, 1); add(l, leaves); }
  const steam = [0, 1, 2].map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(SFOG), transparent: true, depthWrite: false, opacity: 0, toneMapped: false })); add(noRay(sp), g); return sp; });
  pickable(g, { act: 'tea:cup', label: tr('茶杯') });
  function sync(){
    const t = G.tea, K = TEA[t.kind] || TEA.water, lvl = clamp(t.level, 0, 1);
    tea.visible = lvl > 0; leaves.visible = !!(t.leaves && t.kind !== 'water');
    const y = (.018 + .074*(lvl > 0 ? lvl : 0))*s, rIn = (.046 + (.066 - .046)*clamp((y/s - .016)/.084, 0, 1))*s;
    tea.position.y = y; tea.scale.set(rIn*.98, rIn*.98, 1); leaves.position.y = (lvl > 0 ? y : .018*s) + .001;
    teaMat.color.set(t.kind && t.kind !== 'water' ? mixHex('#e8dcc0', K.hex, .25 + .75*t.steep) : '#d6e6f0');
    const so = t.level > 0 ? clamp(t.temp*1.2 - .2, 0, .6) : 0;
    steam.forEach((sp, i) => { const ph = (S.T*.35 + i/3) % 1, r = .04 + ph*.1; sp.visible = so > .02;
      sp.position.set(Math.sin(S.T*1.3 + i*2)*.02, .14 + ph*.26, 0); sp.scale.set(r*2, r*2, 1); sp.material.opacity = so*.6*Math.sin(Math.PI*ph); });
  }
  return { sync };
})();

/* the bread plate */
const bread = (() => {
  const g = onDesk(IT.bread);
  add(blot(.17, .08, .4), g).position.y = .002;
  add(mesh(new THREE.CylinderGeometry(.16, .13, .016, 36), toon(PAL.cream, { grain: -1 }), [0, .008, 0]), g);
  const loaf = add(new THREE.Group(), g); loaf.position.y = .016;
  const bm = toon('#d98e48', { grain: 0, rep: 2 }), sph = new THREE.SphereGeometry(1, 20, 14);
  const lump = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => { const m = mesh(sph, bm, [x, y, z]); m.scale.set(sx, sy, sz); add(m, loaf); };
  let shape = '__';
  pickable(g, { act: 'bread:eat', label: tr('面包'), on: () => G.breads.length > 0 });
  function sync(){
    const now = G.breads.length ? G.breads[0].shape : null; loaf.visible = !!now;
    if (now === shape) return; shape = now; loaf.clear();
    if (now === 'long') lump(0, .03, 0, .11, .04, .045);
    else if (now === 'braid'){ lump(-.055, .028, 0, .05, .032, .04); lump(.055, .028, 0, .05, .032, .04); lump(0, .036, 0, .055, .036, .045); }
    else if (now === 'round') lump(0, 0, 0, .07, .07, .07);
    else if (now) lump(0, .02, 0, .085, .05, .065);
  }
  return { sync };
})();

/* the voyage ticket, propped up so it can be read */
const ticketTex = canvasTex(704, 248, (g) => {
  g.setTransform(4, 0, 0, 4, 0, 0); g.translate(88, 38);
  g.fillStyle = PAL.paper; g.beginPath(); g.roundRect(-88, -38, 176, 62, 6); g.fill();
  g.fillStyle = '#b4a181'; for (let i = 0; i < 8; i++){ g.beginPath(); g.arc(44, -32 + i*8, 1.4, 0, Math.PI*2); g.fill(); }
  txtFit(g, tr('夜航'), -38, -6, 150*.48, 21, '#2a3550');
  txt(g, 'NIGHT · No.' + G.no, -38, 12, 8, '#7d7a72', { mono: true, ls: 1 });
  ORDER.filter(cl => G.answered[cl] > 0).forEach((cl, i) => { g.fillStyle = COL[cl].hex; g.beginPath(); g.arc(66, -22 + i*16, 5.5, 0, Math.PI*2); g.fill(); });
});
{
  const g = onDesk(IT.ticket); g.rotation.y = -.05;
  add(blot(.2, .05, .35), g).position.set(0, .002, -.02);
  const card = add(new THREE.Group(), g); card.rotation.x = -.95;
  const TW = .3, TH = TW*62/176;
  add(mesh(new THREE.BoxGeometry(TW, TH, .003), toon(PAL.paper, { grain: 0 }), [0, TH/2, -.002]), card);
  add(mesh(new THREE.PlaneGeometry(TW, TH), toon('#ffffff', { map: ticketTex.t, grain: -1 }), [0, TH/2, 0], { cast: false }), card);
  add(mesh(rbox(.2, .025, .04, .008), toon(PAL.woodD), [0, .0125, -.05]), g);
  pickable(g, { act: 'ui:ticket', label: tr('航行记录') });
}

/* the lantern: its glass is the colour it is set to, its base carries the notches */
const lantern = (() => {
  const g = onDesk(IT.lantern);
  add(blot(.16, .1, .5), g).position.y = .002;
  add(mesh(rbox(.2, .05, .15, .012), toon(PAL.woodD), [0, .025, 0]), g);
  const notchGeo = rbox(.014, .03, .006, .004), notchMat = toon('#f2dfc0', { grain: -1 });
  const notches = [0, 1, 2].map(() => add(mesh(notchGeo, notchMat, [0, .025, .077], { cast: false }), g));
  const glassMat = toon('#ffffff', { grain: -1, emissive: '#ffffff', ei: .4 });
  add(mesh(rbox(.15, .2, .13, .03), glassMat, [0, .155, 0]), g);
  const brass = toon(PAL.brass, { grain: -1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(mesh(new THREE.CylinderGeometry(.006, .006, .22, 6), brass, [sx*.074, .16, sz*.064]), g);
  add(mesh(rbox(.17, .035, .15, .012), brass, [0, .275, 0]), g);
  add(mesh(new THREE.TorusGeometry(.05, .007, 8, 20, Math.PI), brass, [0, .292, 0]), g);
  /* the light sits in front of the glass, not in it, or it burns the glass white */
  const light = add(new THREE.PointLight('#ffffff', 0, LT.lantern.distance, LT.lantern.decay), g); light.position.set(0, .38, .6);
  const halo = add(glow(SAMBER, .8, 0), g); halo.position.set(0, .16, .05);
  pickable(g, { act: 'cab:lantern', label: tr('提灯') });
  return { glassMat, notches, light, halo };
})();

/* a hand strap hanging into the top of the frame, and the moth */
const strap = (() => {
  const s = L.strap, p = add(new THREE.Group()); p.position.set(s.x, H, s.z);
  add(mesh(rbox(.035, s.len, .012, .005), toon(PAL.navy)), p).position.y = -s.len/2;
  add(mesh(new THREE.TorusGeometry(.07, .014, 10, 28), toon(PAL.navy)), p).position.y = -s.len - .07;
  return noRay(p);
})();
const moth = (() => {
  const g = add(new THREE.Group()), wm = toon('#cfc3ad', { grain: -1, side: THREE.DoubleSide, emissive: '#5a5040', ei: .4 });
  const wing = new THREE.CircleGeometry(1, 12);
  const wl = add(new THREE.Group(), g), wr = add(new THREE.Group(), g);
  add(mesh(wing, wm, [-.028, 0, 0], { cast: false }), wl).scale.set(.028, .018, 1);
  add(mesh(wing, wm, [.028, 0, 0], { cast: false }), wr).scale.set(.028, .018, 1);
  add(mesh(new THREE.SphereGeometry(.007, 8, 6), toon('#6a5e4c', { grain: -1 }), undefined, { cast: false }), g).scale.set(1, 2.4, 1);
  return { g: noRay(g), wl, wr };
})();

/* ================= FX: the flares rooms/cabin.ts already pushes ================= */
const ringTex = canvasTex(128, 128, (g, w) => { g.strokeStyle = '#fff'; g.lineWidth = w*.035; g.beginPath(); g.arc(w/2, w/2, w*.41, 0, Math.PI*2); g.stroke(); });
const fxPool: { glow: THREE.Sprite; ring: THREE.Sprite }[] = [];
function fxPoint(f): [THREE.Vector3, number] {
  if (f.k < .3){ const p = skyLocal(f.x, f.y, SKY_Z + 2.5).add(sky.group.position); return [p, sky.SU(1)]; }
  if (Math.abs(f.k - K_WL) < .05) return [new THREE.Vector3(wallX(f.x), wallY(f.y), GLASS_Z + .02), U(1)];
  return [new THREE.Vector3(wallX(f.x), wallY(f.y), BACK + .4), U(1)];
}
/* the same timing and shape as core/fx.ts drawFX, which this room no longer calls */
function drawFX3(dt: number){
  let n = 0;
  for (let i = FX.length - 1; i >= 0; i--){
    const f = FX[i]; f.t += dt; const q = f.t/f.dur; if (q >= 1){ FX.splice(i, 1); continue; }
    const s = fxPool[n] || (fxPool[n] = {
      glow: add(glow(SOFT, 1), fxG),
      ring: add(noRay(new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))), fxG)
    });
    n++;
    const [p, u] = fxPoint(f), r = (f.r0 + (f.r1 - f.r0)*(1 - Math.pow(1 - q, 3)))*u, a = 1 - q;
    s.glow.visible = s.ring.visible = true;
    s.glow.material.map = texOf(spr(f.color)); s.glow.position.copy(p); s.glow.scale.set(r*2, r*2, 1); s.glow.material.opacity = a*.55;
    s.ring.material.color.set(f.color); s.ring.position.copy(p); s.ring.scale.set(r*2, r*2, 1); s.ring.material.opacity = a*.5;
  }
  for (let i = n; i < fxPool.length; i++) fxPool[i].glow.visible = fxPool[i].ring.visible = false;
}

/* ================= CAMERA ================= */
const eye0 = new THREE.Vector3(...CC.eye), look0 = new THREE.Vector3(...CC.look);
const dir0 = look0.clone().sub(eye0).normalize();
const yaw0 = Math.atan2(-dir0.x, -dir0.z), pitch0 = Math.asin(dir0.y);
function fovFor(a: number){
  const v = CC.fov*D2R, need = 2*Math.atan(Math.tan(CC.minHFov*D2R/2)/a);
  return Math.min(CC.maxFov*D2R, Math.max(v, need))/D2R;
}
function placeCamera(){
  const red = !!(G && G.reduced), zz = CAM.zoom*CAM.user, u = clamp((zz - 1)/(USER_MAX - 1), -.4, 1.3);
  const yaw = yaw0 + clamp(CAM.panX*CC.yawPerUnit, -CC.yawMax, CC.yawMax)*D2R;
  const pitch = pitch0 + clamp(CAM.panY*CC.pitchPerUnit, -CC.pitchMax, CC.pitchMax)*D2R;
  const par = CC.parallax*(red ? .5 : 1);
  camera.position.copy(eye0);
  camera.position.x += -CAM.panX*CC.truckPerUnit + CAM.px*par;
  camera.position.y += -CAM.py*par*.5 + CAM.lift*CC.lift;
  camera.position.addScaledVector(new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch)), u*CC.dolly);
  camera.rotation.set(pitch, yaw, CAM.rot*CC.roll, 'YXZ');
  camera.fov = fovFor(camera.aspect)*(1 - Math.max(0, u)*CC.zoomFov);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}

/* ================= CABIN_SPACE, answered from the camera ================= */
CABIN_SPACE.windowOf = (bx, by) => {
  const P = skyLocal(bx, by, SKY_Z + 2).add(sky.group.position), C = camera.position;
  const t = (GLASS_Z - C.z)/(P.z - C.z), x = designX(C.x + (P.x - C.x)*t), y = designY(C.y + (P.y - C.y)*t);
  for (const side of ['left', 'right']){ const [wx, wy, ww, wh] = WIN[side]; if (x > wx + 6 && x < wx + ww - 6 && y > wy + 6 && y < wy + wh - 6) return side; }
  return null;
};
const skyPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(SKY_Z + 2));
CABIN_SPACE.sky = (e) => rayOf(e).ray.intersectPlane(skyPlane, tmp) ? sky.toDesign(tmp) : { x: -9999, y: -9999 };
CABIN_SPACE.wall = (e) => rayOf(e).ray.intersectPlane(glassPlane, tmp) ? toWin(tmp) : { x: -9999, y: -9999 };

/* ================= PER FRAME ================= */
const smooth = { hemi: LT.hemi[G.lamp ?? 0], moon: LT.moon.intensity[G.lamp ?? 0] };
let lastSig = '';
function sync(dt: number){
  const k = 1 - Math.exp(-dt*3), on = [1, .5, 0][G.lamp]*(S.lampFil ?? 1), reduced = !!G.reduced;
  /* room light: the wash the 2D cabin laid over everything, as real light */
  smooth.hemi += (LT.hemi[G.lamp] - smooth.hemi)*k; smooth.moon += (LT.moon.intensity[G.lamp] - smooth.moon)*k;
  hemi.intensity = smooth.hemi*(1 + Math.min(.25, S.bulbs.length*.02)); moon.intensity = smooth.moon;
  RIM.k.value = C3.rim.k*(.6 + .8*S.vis);
  /* the lamp */
  lamp.pivot.rotation.z = S.lampA*D2R;
  lamp.point.intensity = LT.lamp.point*on; lamp.spot.intensity = LT.lamp.spot*on;
  lamp.inner.emissiveIntensity = .15 + .95*on; lamp.bulbMat.emissiveIntensity = .05 + 1.1*on; lamp.bulbMat.color.set(on > .3 ? '#ffe2b0' : '#9a8a72');
  lamp.halo.material.opacity = on*.5; lamp.core.material.opacity = on*.9;
  const by = S.beadT < .3 ? U(Math.sin(S.beadT/.3*Math.PI)*16) : 0, cordLen = U(70) + by;
  lamp.cord.scale.y = cordLen; lamp.cord.position.y = -L.lampRod - .28 - cordLen/2; lamp.bead.position.y = -L.lampRod - .28 - cordLen - .02;
  /* chart lamp */
  const rg = S.readGlow || 0;
  chartLampParts.shadeMat.color.set(S.reading ? PAL.shadeOn : PAL.shadeOff); chartLampParts.shadeMat.emissive.set(S.reading ? '#5a3a10' : '#000000');
  chartLampParts.bulbMat.emissiveIntensity = rg*1.2; chartLampParts.light.intensity = LT.chart.intensity*rg; chartLampParts.halo.material.opacity = rg*.6;
  /* bulbs */
  let n = 0, cx = 0, cy = 0, cz = 0; const col = new THREE.Color(0, 0, 0);
  bulbs.pool.forEach((p, i) => {
    const b = S.bulbs[i]; p.g.visible = !!b; if (!b) return;
    const pop = Math.min(1, (S.T - b.born)/.6), C = COL[b.color];
    if (p.color !== b.color){ p.color = b.color; p.mat.color.set(mixHex(C.hex, '#ffffff', .3)); p.mat.emissive.set(C.hex); p.halo.material.map = texOf(SPR_OF[b.color]); }
    p.g.position.set(wallX(b.slot.x), wallY(b.slot.y), L.bulbZ);
    p.b.scale.setScalar(.4 + .6*pop); p.b.position.y = -U(13) - U(13)*(1 - pop);
    p.halo.material.opacity = (G.lamp ? .75 : .4)*pop*(.85 + .15*Math.sin(S.T*1.3 + i));
    n++; cx += p.g.position.x; cy += p.g.position.y; cz += p.g.position.z; col.add(new THREE.Color(C.hex));
  });
  /* never hidden: a light appearing or vanishing recompiles every material */
  bulbs.light.intensity = 0;
  if (n){ bulbs.light.position.set(cx/n, cy/n - .12, cz/n + .25); bulbs.light.color.copy(col.multiplyScalar(1/n)); bulbs.light.intensity = Math.min(LT.bulbs.max, n*LT.bulbs.per); }
  /* lantern */
  const LC = ORDER[G.colorIdx], C = COL[LC], pulse = S.lanternPulse || 0, ps = Math.sin(Math.PI*pulse);
  lantern.glassMat.color.set(C.hex); lantern.glassMat.emissive.set(C.hex); lantern.glassMat.emissiveIntensity = .22 + .6*ps;
  lantern.light.color.set(C.hex); lantern.light.intensity = LT.lantern.base + LT.lantern.pulse*ps;
  lantern.halo.material.map = texOf(SPR_OF[LC]); lantern.halo.material.opacity = .35 + .45*ps; lantern.halo.scale.setScalar(.7 + .5*ps);
  lantern.notches.forEach((m, i) => { m.visible = i < C.blinks; m.position.x = -(C.blinks - 1)*.022 + i*.044; });
  /* glass: the warm reflection of the room fades as the lamp goes down */
  const refl = clamp(.72 - (S.vis - .1)/.9*.68, 0, 1), [lx] = lampPos();
  glass.forEach(gl => {
    (gl.refl.material as THREE.MeshBasicMaterial).opacity = refl*.55;
    gl.lampRefl.position.x = wallX(gl.side === 'left' ? 1600 - lx - 200 : 1600 - lx + 180); gl.lampRefl.material.opacity = .6*refl*on;
  });
  drawFog3();
  /* blanket: folded on the bench, or over your knees at the desk */
  blanketFolded.visible = !G.blanket; lapBlanket.visible = !!G.blanket;
  plantLeaves.rotation.z = -S.plantA*D2R;
  strap.rotation.z = Math.sin(S.T*.55 - .6)*2.4*(reduced ? .2 : 1)*D2R;
  const w = .35 + .65*Math.abs(Math.sin(S.T*(reduced ? 4 : 17)));
  moth.g.position.set(wallX(S.mx ?? 440), wallY(S.my ?? 300), L.lampZ + .3); moth.wl.rotation.y = (1 - w)*1.2; moth.wr.rotation.y = -(1 - w)*1.2;
  vase.sync(); cup.sync(); bread.sync();
  /* paper that shows state: redrawn only when what it says has changed */
  const P = callPort(), sig = [G.no, G.route, P ? P.name : '', ORDER.map(c => G.answered[c] > 0 ? 1 : 0).join('')].join('|');
  if (sig !== lastSig){ lastSig = sig; signTex.redraw(); ticketTex.redraw(); chartTex.redraw(); }
  slip.redraw();
}
/* the blanket over your knees: a cloth that drapes over the near edge of the desk */
const lapBlanket = (() => {
  const g = new THREE.PlaneGeometry(1.5, 1.1, 24, 18), p = g.attributes.position;
  for (let i = 0; i < p.count; i++){
    const u = p.getX(i)/1.5 + .5, v = p.getY(i)/1.1 + .5;
    /* the first part lies on the desk in front of the cup, the rest falls
       over the near edge toward your knees */
    const along = v*1.1, edge = D.z1 - .02 - L.lap.z, folds = Math.sin(u*Math.PI*3.2 + v*2)*.012;
    const z = along < edge ? L.lap.z + along : D.z1 - .02 + Math.sin((along - edge)*2.2)*.06;
    const y = along < edge ? TOP + .014 + Math.max(0, folds) + (1 - Math.min(1, along/.12))*.03 : TOP + .01 - (along - edge)*1.2;
    p.setXYZ(i, L.lap.x0 + u*1.5 + Math.sin(v*5)*.02, y, z);
  }
  g.computeVertexNormals();
  const st = stripeTex.t.clone(); st.repeat.set(2, 2); st.wrapS = st.wrapT = THREE.RepeatWrapping;
  const m = add(mesh(g, toon('#ffffff', { map: st, side: THREE.DoubleSide }))); m.visible = false;
  /* most of the cloth hangs below the frame, so focus and hints anchor on the
     part lying on the desk rather than on the whole cloth's centre */
  return pickable(m, { act: 'cab:blanket', label: tr('毯子'), key: 'blanketFg', sphere: { c: new THREE.Vector3(L.lap.x0 + .8, TOP + .02, L.lap.z + .12), r: .3 } });
})();

/* ================= THE ROOM DESCRIPTOR ================= */
let visible = false;
function show(v: boolean){ if (v === visible) return; visible = v; glCanvas.style.visibility = v ? 'visible' : 'hidden'; }
const R3: Room = {
  webgl: true,
  zc: base.zc, pan: base.pan,
  enter(from){ base.enter && base.enter(from); slip.reset(); lastSig = ''; },
  exit(){ base.exit && base.exit(); show(false); },
  update(dt){ base.update && base.update(dt); },
  room(_c, dt){
    show(true);
    placeCamera();
    sync(dt); sky.update(dt); drawFX3(dt);
    renderer.render(scene, camera);
    pushHits();
  }
};
ROOMS.cabin = R3;
/* Any other room drawing means this canvas is not on screen. */
for (const k of Object.keys(ROOMS)) if (k !== 'cabin'){ const r = ROOMS[k], orig = r.room; r.room = function(c, dt){ show(false); return orig && orig.call(this, c, dt); }; }
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { lastSig = ''; slip.reset(); });

/* For tools/cabin3d-check.mjs: where a design point on the glass or in the
   sky is on screen right now, and a read-only view of the state it checks.
   Dev builds only. */
if (import.meta.env.DEV) (window as any).__cabin3d = {
  camera, renderer, scene,
  glassToScreen(dx: number, dy: number){ const v = new THREE.Vector3(wallX(dx), wallY(dy), GLASS_Z).project(camera); return { X: (v.x + 1)/2*CW, Y: (1 - v.y)/2*CH }; },
  skyToScreen(dx: number, dy: number){ const v = skyLocal(dx, dy, SKY_Z + 2).add(sky.group.position).project(camera); return { X: (v.x + 1)/2*CW, Y: (1 - v.y)/2*CH }; },
  pickAt, CW: () => CW, CH: () => CH,
  hits: () => HITS_PREV.map(h => { const [X, Y] = hitCanvasCenter(h); return { act: h.act, key: h.key, label: h.label, X, Y }; }),
  state: () => ({ room: S.room, lamp: G.lamp, colorIdx: G.colorIdx, blanket: G.blanket, reading: S.reading, bulbs: G.bulbs.slice(), answered: { ...G.answered },
    breaths: S.breaths.map(b => ({ x: b.x, y: b.y, r: b.r })), strokes: S.strokes.map(s => s.pts.slice()), focusKey: S.focusKey, reduced: G.reduced,
    beacons: S.beacons.map(b => ({ color: b.color, x: b.x, y: b.y + Math.sin(b.t*.9)*4, answered: b.answered, win: CABIN_SPACE.windowOf(b.x, b.y) })),
    cam: { panX: CAM.panX, panY: CAM.panY, tpanX: CAM.tpanX, tpanY: CAM.tpanY, user: CAM.user, tuser: CAM.tuser, zoom: CAM.zoom } })
};
