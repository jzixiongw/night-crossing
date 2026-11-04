import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tr } from '../../i18n';
import { BRUSH, SWARM } from '../../core/paint';
import { CAM } from '../../core/camera';
import { clamp, ease } from '../../core/util';
import { setPPD, walkTo, WINDOW_ANG } from '../../rooms/corridor';
import { ACT, RING, STEP, angDiff } from '../../rooms/registry';
import { docked } from '../../rooms/hatch';
import { S } from '../../state/runtime';
import { G } from '../../state/store';
import { RING3, RU } from '../config/corridor';
import { camera, pickable, register3D, type Built } from '../engine';
import { M, canvasTex, flatMat, glow, lathe, mesh, noRay, rbox, toon } from '../kit';
import type { View } from '../view';
import { D2R, L, X, Y, dirOf, ringPt, wallFrame } from './corridor-kit';
import { bigWindow, board, door, dome, gangway, mail, type Mats, type Station } from './corridor-stations';

/* ================= THE RING CORRIDOR, IN THREE.JS =================
   rooms/corridor.ts still walks the ring: its update() eases S.phi toward
   S.phiTarget, carries the drag's momentum, bobs the walk (CAM.lift), counts
   the footsteps, drifts the stars in the big window (S.bw) and brings the
   other ship past; every ACT['ring:*'] / 'go:*' handler answers unchanged.
   This file builds the ring for real -- an annulus round the ship's centre,
   the nine stations of RING on the outer wall at their angles -- and puts one
   eye on a fixed circle inside it, placed from S.phi every frame.

   THE RING IS MIRRORED against the painted one. In 2D a larger angle slid off
   to the left, so a drag to the right turned the wall against the finger and
   the right arrow brought the left-hand station in. Here a larger angle is to
   the right: the same input.ts makes the floor follow the finger, the right
   arrow walks right, and the dot on the minimap moves the way you walk. The
   stations' own art is not mirrored.

   INTERACTION CHECKLIST (2D -> here)
     go:radio/green/cabin/galley  door (arch frame, leaf, window, plate)       [door()]
     go:hatch                     gangway pressure door, label st.label        [gangway()]
     go:dome                      ladder + hatch + sign, label 穹顶梯           [dome()]
     ring:sit                     the window glass and the bench, not while seated [bigWindow()]
     ring:ship                    the other ship in the window (S.otherShip)   [bigWindow()]
     ui:work  (key work)          work slip on the cork, painted by drawSlip   [board()]
     ring:voyage (key voyage)     voyage slip beside it                        [board()]
     ring:log                     the log column (G.log[0..1])                 [board()]
     ring:clock                   clock with real hands from now()             [mail()]
     ring:mail                    mailbox, label with the count                [mail()]
     ring3d:walk:<i> (new)        a station well off-centre is walked to, not entered
     drag sideways                walks (input.ts writes S.phi; PPD set here so the floor follows)
     drag up/down, ArrowUp/Down   tilt (view pitch)        ArrowLeft/Right, #navL/#navR, minimap: walkStep/walkTo
     seated                       zoom() 1.22 dollies in; the eye sits down and turns to the window;
                                  a drag turns the head; the 站起来 pill / Escape stand up
   PAINTED STATE
     door windows glow (greenhouse pink under G.growLamp, teal otherwise), ON AIR lit by
     G.radioOn || G.wind > 0, the gangway lamp + LIVE plate (callPort/docked), the dome
     hatch's indigo pulse, clock hands, 航行第 N 夜, the mail flag and the letters (n),
     the slips and the log, stars drifting in the portholes and the big window, the other
     ship blinking (S.shipBlink), station name plates, garland, vines, cabin 07. */

const R = RING3.ring, C = RING3.cam, PAL = RING3.palette, LT = RING3.light;
const RO = R.ro, RI = R.ri, H = R.h;

ACT['ring3d:walk'] = { tap(a){ const st = RING[+a[0]]; if (st) walkTo(st.ang); } };

/* ---- ring meshes ----
   A band of the cylinder round the centre at radius r, from height y0 to y1,
   one column per `seg` degrees, minus any columns `skip` says to leave open. */
function wallBand(r: number, y0: number, y1: number, inward: boolean, skip?: (a: number) => boolean, uPerM = 1){
  const cols = Math.round(360/R.seg), pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let c = 0; c <= cols; c++){
    const a = c*R.seg, d = dirOf(a), s = inward ? -1 : 1;
    for (const y of [y0, y1]){ pos.push(d.x*r, y, d.z*r); nor.push(d.x*s, 0, d.z*s); uv.push(a*D2R*r*uPerM, (y - 0)/H); }
  }
  for (let c = 0; c < cols; c++){
    if (skip && skip(c*R.seg + R.seg/2)) continue;
    const i = c*2;
    if (inward) idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); else idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
/* A flat annulus at height y between radii r0 and r1, facing up or down;
   u counts `uDeg`-degree tiles round the ring, v runs r0 -> r1. */
function annulus(r0: number, r1: number, y: number, up: boolean, uDeg: number){
  const cols = Math.round(360/R.seg), pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let c = 0; c <= cols; c++){
    const a = c*R.seg, d = dirOf(a);
    for (const [r, v] of [[r0, 0], [r1, 1]]){ pos.push(d.x*r, y, d.z*r); nor.push(0, up ? 1 : -1, 0); uv.push(a/uDeg, v); }
  }
  for (let c = 0; c < cols; c++){ const i = c*2; if (!up) idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); else idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
/* Everything under `temp` merged into one mesh per material: the ribs, the
   portholes, the lamps and the pillars repeat round the whole ring and are
   static, so they cost a handful of draw calls instead of a few hundred. */
function flatten(temp: THREE.Object3D, parent: THREE.Object3D){
  temp.updateMatrixWorld(true);
  const by = new Map<THREE.Material, THREE.BufferGeometry[]>(), src = new Set<THREE.BufferGeometry>();
  temp.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    src.add(m.geometry);
    let g = m.geometry.clone().applyMatrix4(m.matrixWorld); if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const mat = m.material as THREE.Material; if (!by.has(mat)) by.set(mat, []); by.get(mat).push(g);
  });
  for (const [mat, list] of by){ const g = mergeGeometries(list); list.forEach(x => x.dispose()); parent.add(mesh(g, mat, undefined, { cast: false })); }
  src.forEach(g => g.dispose());
}

function build(): Built {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#070c17');
  const root = new THREE.Group(); root.name = 'ring'; scene.add(root);
  const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = root): T => { parent.add(o); return o; };

  const m: Mats = {
    frame: M('metal', PAL.frame, { grain: 1, rep: 2, hl: .3, hlSize: .12 }), metal: M('metal', PAL.metal), metalD: M('metal', PAL.metalD, { hl: .3 }),
    brass: M('brass', PAL.brass), paper: M('paper', PAL.paper), woodD: M('woodD', PAL.woodD), rose: M('ceramic', PAL.rose),
    dark: M('plain', PAL.dark), leaf: M('leaf', PAL.leaf), cream: M('ceramic', PAL.cream)
  };

  /* ================= THE SHELL ================= */
  const FY = R.floorY, topD = FY - H*RU;              // design y of the ceiling line
  const wallTex = canvasTex(32, 512, (g, w, h) => {
    const k = h/(FY - topD); g.setTransform(1, 0, 0, k, 0, -topD*k);
    const W = RING3.wall, gr = g.createLinearGradient(0, W.top, 0, FY);
    gr.addColorStop(0, PAL.wallTop); gr.addColorStop(.12, PAL.wallHi); gr.addColorStop(.6, PAL.wallMid); gr.addColorStop(.88, PAL.wallLow); gr.addColorStop(1, PAL.wallLo);
    g.fillStyle = PAL.rail; g.fillRect(0, topD, w, W.top - topD + 1);
    g.fillStyle = gr; g.fillRect(0, W.top, w, FY - W.top);
    g.fillStyle = PAL.rail; g.fillRect(0, W.top, w, W.railH);
    g.globalAlpha = .8; g.fillStyle = PAL.railLine; g.fillRect(0, W.top + W.railH, w, 7);
    g.globalAlpha = .5; g.fillStyle = PAL.baseLine; g.fillRect(0, FY - W.base - 7, w, 7);
    g.globalAlpha = 1; g.fillStyle = PAL.base; g.fillRect(0, FY - W.base, w, W.base);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "soft-light"; g.globalAlpha = .18; g.fillStyle = g.createPattern(BRUSH[2], 'repeat'); g.fillRect(0, 0, w, h);
  });
  wallTex.t.wrapS = THREE.RepeatWrapping;
  const wallMat = toon('#ffffff', { map: wallTex.t, ramp: 'soft', rim: 0, hl: 0 });
  /* the outer wall, open where the big window is */
  const HO = RING3.wall.hole, hy0 = Y(HO.y1), hy1 = Y(HO.y0);
  const inHole = (a: number) => Math.abs(angDiff(a, WINDOW_ANG)) < HO.a;
  const WU = 512/H/32;
  add(mesh(wallBand(RO, 0, hy0, true, undefined, WU), wallMat, undefined, { cast: false }));
  add(mesh(wallBand(RO, hy0, hy1, true, inHole, WU), wallMat, undefined, { cast: false }));
  add(mesh(wallBand(RO, hy1, H, true, undefined, WU), wallMat, undefined, { cast: false }));
  /* the trims as real rails: the top rail and the kick plate */
  add(mesh(wallBand(RO - .025, Y(RING3.wall.top + RING3.wall.railH + 7), Y(RING3.wall.top), true), M('metal', PAL.rail, { side: THREE.DoubleSide, hl: .2 }), undefined, { cast: false }));
  add(mesh(wallBand(RO - .018, 0, L(RING3.wall.base), true), M('wall', PAL.base, { grain: 1, rep: [1, H], side: THREE.DoubleSide }), undefined, { cast: false }));
  /* the inner wall, the ship's spine, behind you */
  add(mesh(new THREE.CylinderGeometry(RI, RI, H, 64, 1, true), M('wall', PAL.inner, { grain: 2, rep: [8, 2] }), [0, H/2, 0], { cast: false }));

  /* the floor: seams every few degrees running out to the wall, a runner down the middle */
  const FW = RO - RI, rv = (r: number) => (r - RI)/FW;
  const floorTex = canvasTex(64, 512, (g, w, h) => {
    const y = (r: number) => (1 - rv(r))*h;            // canvas rows run from the wall (top) inward
    const gr = g.createLinearGradient(0, y(RO), 0, y(RI)); gr.addColorStop(0, PAL.floorFar); gr.addColorStop(.12, PAL.floor); gr.addColorStop(.55, PAL.floorNear); gr.addColorStop(1, PAL.floorIn);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const [r0, r1] = RING3.floor.runner;
    g.fillStyle = PAL.runnerEdge; g.fillRect(0, y(r1), w, y(r0) - y(r1));
    g.fillStyle = PAL.runner; g.fillRect(0, y(r1 - .1), w, y(r0 + .1) - y(r1 - .1));
    g.fillStyle = 'rgba(8,12,26,.38)'; g.fillRect(0, 0, 2.5, h);
    const sh = g.createLinearGradient(0, y(RO), 0, y(RO - .5)); sh.addColorStop(0, 'rgba(5,9,20,.55)'); sh.addColorStop(1, 'rgba(5,9,20,0)'); g.fillStyle = sh; g.fillRect(0, y(RO), w, y(RO - .5) - y(RO));
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .4; g.setTransform(1, 0, 0, .55, 0, 0); g.fillStyle = g.createPattern(BRUSH[1], 'repeat'); g.fillRect(0, 0, w, h/.55);
  });
  floorTex.t.wrapS = THREE.RepeatWrapping;
  const floor = add(mesh(annulus(RI, RO, 0, true, RING3.floor.seamDeg), toon('#ffffff', { map: floorTex.t, ramp: 'soft', rim: 0, hl: 0 }), undefined, { cast: false }));
  floor.renderOrder = -1;

  /* the ceiling, its light strip, and the beams over the ribs */
  const ceilTex = canvasTex(32, 512, (g, w, h) => {
    const y = (r: number) => (1 - rv(r))*h;
    const gr = g.createLinearGradient(0, y(RO), 0, y(RI)); gr.addColorStop(0, PAL.ceilingHi); gr.addColorStop(.3, PAL.ceiling); gr.addColorStop(.8, PAL.ceilingLo); gr.addColorStop(1, PAL.ceilingLo);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(5,9,20,.4)'; g.fillRect(0, y(RO), w, y(RO - .3) - y(RO));
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .3; g.setTransform(1, 0, 0, .3, 0, 0); g.fillStyle = g.createPattern(BRUSH[2], 'repeat'); g.fillRect(0, 0, w, h/.3);
  });
  ceilTex.t.wrapS = THREE.RepeatWrapping;
  add(mesh(annulus(RI, RO, H, false, 4), toon('#ffffff', { map: ceilTex.t, ramp: 'soft', rim: 0, hl: 0 }), undefined, { cast: false }));
  const [s0, s1] = RING3.ceiling.strip;
  add(noRay(mesh(annulus(s0, s1, H - .012, false, 4), new THREE.MeshBasicMaterial({ color: PAL.strip, toneMapped: false }), undefined, { cast: false, receive: false })));
  add(noRay(mesh(annulus(s0 - .12, s1 + .12, H - .008, false, 4), flatMat(PAL.stripGlow, { opacity: .35 }), undefined, { cast: false, receive: false })));

  /* ================= THE LATTICE: ribs, portholes + lamps, pillars, beams ================= */
  const temp = new THREE.Group();
  const ribBar = M('wall', PAL.rib, { grain: 1, rep: [1, 4], rim: .4 }), ribGeo = { bar: rbox(L(24), L(440), .07, .015, 2), foot: rbox(L(40), L(92), .12, .02, 2), cap: rbox(L(48), L(26), .1, .015, 2) };
  const beamGeo = rbox(.2, .13, RO - RING3.ceiling.beamFrom, .03, 2), beamMat = M('woodD', PAL.beam, { hl: .15, rim: .5 });
  for (let k = 0; k < 18; k++){
    const ang = STEP/4 + k*STEP/2;
    const b = mesh(beamGeo, beamMat); ringPt(ang, (RO + RING3.ceiling.beamFrom)/2, H - .065, b.position); b.rotation.y = -ang*D2R; temp.add(b);
    if (Math.abs(angDiff(ang, WINDOW_ANG)) < HO.a || ang === 50) continue;   // the big window; the notice beside the board
    const f = wallFrame(temp, ang);
    f.add(mesh(ribGeo.bar, ribBar, [0, Y(504), .035])); f.add(mesh(ribGeo.foot, m.metalD, [0, Y(746), .06])); f.add(mesh(ribGeo.cap, m.metalD, [0, Y(289), .05]));
  }
  const P = RING3.port, portSky = canvasTex(240, 176, (g) => {
    g.setTransform(2, 0, 0, 2, 0, 0);
    const gr = g.createLinearGradient(0, 0, 0, 88); gr.addColorStop(0, '#0a1226'); gr.addColorStop(1, '#1a2b4d'); g.fillStyle = gr; g.fillRect(0, 0, 120, 88);
    g.fillStyle = '#e2ecf5'; g.globalAlpha = .9;
    for (const s of S.portStars || []) for (const dx of [-120, 0, 120]){ g.beginPath(); g.arc(s.x + 60 + dx, s.y + 44, s.r*.8, 0, Math.PI*2); g.fill(); }
  });
  portSky.t.wrapS = THREE.RepeatWrapping;
  const streak = canvasTex(64, 64, (g) => { g.setTransform(64/88, 0, 0, 64/88, -756*64/88, -386*64/88); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(770, 380); g.lineTo(790, 380); g.lineTo(760, 480); g.lineTo(740, 480); g.closePath(); g.fill(); });
  const streakMat = flatMat('#ffffff', { map: streak.t, opacity: 1 });
  const torus = new THREE.TorusGeometry(L(P.r), L(7), 10, 36), bolt = new THREE.SphereGeometry(L(3.2), 8, 6), disc = new THREE.CircleGeometry(L(P.glass), 32);
  const shadeGeo = lathe([[L(4), L(24)], [L(9), L(20)], [L(17), L(10)], [L(23), 0]], 20), bulbGeo = new THREE.SphereGeometry(L(7), 12, 8);
  const shadeIn = toon('#fff1d6', { grain: -1, side: THREE.BackSide, emissive: '#ffcf8f', ei: .9 }), bulbMat = toon('#fff6dc', { grain: -1, emissive: '#ffe2b0', ei: 1.2 });
  const pillarMat = M('woodD', PAL.dark, { hl: .14, rim: .5, grain: 1, rep: [1, 4] }), PW = RING3.pillar.w;
  const pillarGeo = { col: rbox(PW, H, PW, .07, 2), foot: rbox(PW + .12, .3, PW + .12, .05, 2), cap: rbox(PW + .12, .26, PW + .12, .05, 2) };
  const portGlass: { mat: THREE.MeshBasicMaterial; k: number }[] = [];
  for (let k = 0; k < 9; k++){
    const ang = STEP/2 + k*STEP, f = wallFrame(temp, ang);
    const ring = new THREE.Group(); ring.position.set(0, Y(P.y), .02); f.add(ring);
    ring.add(mesh(torus, m.frame));
    for (let b = 0; b < 8; b++){ const a = b*Math.PI/4; ring.add(mesh(bolt, m.metal, [Math.cos(a)*L(P.r), Math.sin(a)*L(P.r), L(6)])); }
    ring.add(mesh(disc, streakMat, [0, 0, .003]));
    /* the lamp over it: a bracket off the wall, a brass shade, a bulb */
    f.add(mesh(rbox(L(8), L(8), .16, .004, 1), m.metalD, [0, Y(300), .08]));
    f.add(mesh(rbox(L(10), L(30), .02, .004, 1), m.metalD, [0, Y(300), .012]));
    f.add(mesh(shadeGeo, m.brass, [0, Y(P.lampY), .16]));
    f.add(mesh(shadeGeo, shadeIn, [0, Y(P.lampY), .16]));
    f.add(mesh(bulbGeo, bulbMat, [0, Y(P.lampY) + L(2), .16]));
    /* the glass with its own star field, sliding (not merged: each has its own offset) */
    const gm = new THREE.MeshBasicMaterial({ map: portSky.t.clone(), toneMapped: false }); gm.map.repeat.set(88/120, 1);
    const real = wallFrame(root, ang); real.add(mesh(disc, gm, [0, Y(P.y), .018], { cast: false, receive: false }));
    portGlass.push({ mat: gm, k });
    /* the glows of the lamp, and the near pillar */
    const halo = glow(SWARM, L(220), .42); halo.position.set(0, Y(352), .22); real.add(halo);
    const core = glow(SWARM, L(60), .8); core.position.set(0, Y(P.lampY) - L(4), .2); real.add(core);
    const pf = wallFrame(temp, ang, RING3.pillar.r);
    pf.add(mesh(pillarGeo.col, pillarMat, [0, H/2, 0])); pf.add(mesh(pillarGeo.foot, pillarMat, [0, .15, 0])); pf.add(mesh(pillarGeo.cap, pillarMat, [0, H - .13, 0]));
  }
  flatten(temp, root);
  for (const g of [torus, bolt, disc, shadeGeo, bulbGeo, beamGeo, ...Object.values(ribGeo), ...Object.values(pillarGeo)]) g.dispose();
  /* ================= THE STATIONS ================= */
  const glintTex = canvasTex(362, 144, (g) => {
    g.setTransform(.5, 0, 0, .5, -438*.5, -268*.5); g.fillStyle = 'rgba(255,255,255,.06)';
    g.beginPath(); g.moveTo(520, 556); g.lineTo(560, 556); g.lineTo(680, 268); g.lineTo(640, 268); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(590, 556); g.lineTo(604, 556); g.lineTo(724, 268); g.lineTo(710, 268); g.closePath(); g.fill();
  });
  const stations: Station[] = RING.map(st => {
    if (st.id === 'gang') return gangway(root, st, m);
    if (st.id === 'window') return bigWindow(root, st, m, glintTex.t);
    if (st.id === 'board') return board(root, st, m);
    if (st.id === 'mail') return mail(root, st, m);
    if (st.id === 'dome') return dome(root, st, m);
    return door(root, st, m);
  });

  /* "Tap where you are going": a station well off to the side is walked to
     rather than entered. A box in front of it takes the tap while it is off
     centre and is hidden (so the ray passes) once it is straight ahead. */
  const PROXY: Record<string, [number, number, number, number, number]> = {
    door: [664, 200, 272, 590, .5], gang: [648, 200, 304, 590, .5], window: [404, 236, 792, 554, RING3.bench.z + .45],
    board: [520, 252, 724, 360, .3], mail: [690, 196, 240, 594, .55], dome: [700, 196, 390, 594, .6]
  };
  const offCentre = (st: any) => Math.abs(angDiff(st.ang, S.phi)) > C.offCentre;
  /* ...and only while some of it is on screen, so Tab does not stop on a door round the curve */
  const onScreen = new Map<any, boolean>(), pv = new THREE.Vector3();
  const hideMat = new THREE.MeshBasicMaterial({ visible: false });
  const proxies = RING.map((st, i) => {
    const [x, y, w, h, d] = PROXY[st.id] || PROXY.door, f = wallFrame(root, st.ang);
    const b = mesh(new THREE.BoxGeometry(L(w), L(h), d), hideMat, [X(x + w/2), Y(y + h/2), d/2], { cast: false, receive: false });
    f.add(b);
    pickable(b, { act: 'ring3d:walk:' + i, label: st.label, key: 'walk:' + st.id, on: () => offCentre(st) && !!onScreen.get(st), anchor: new THREE.Vector3(0, L(h*.05), d/2), r: .5 });
    return { st, b };
  });

  /* ================= LIGHT =================
     A cold fill, the lamps over the portholes (a pool of lights that follows
     the walk), and the two stations nearest straight ahead (door windows, the
     big window's cold light, the gangway lamp when docked, the dome's indigo).
     The lights are never added or removed, only moved and dimmed. */
  add(new THREE.HemisphereLight(LT.hemiSky, LT.hemiGround, LT.hemi), scene);
  const lamps = Array.from({ length: LT.lamp.n }, () => add(new THREE.PointLight(LT.lamp.color, 0, LT.lamp.distance, LT.lamp.decay)));
  const stLights = Array.from({ length: LT.station.n }, () => add(new THREE.PointLight('#ffffff', 0, LT.station.distance, LT.station.decay)));
  const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a)/(b - a), 0, 1); return t*t*(3 - 2*t); };
  const SL = LT.station;
  function stationLight(st: any): { color: string; i: number; y: number; out: number } {
    if (st.id === 'gang') return { color: SL.gang.color, i: docked() ? SL.gang.on : SL.gang.off, y: SL.gang.y, out: SL.gang.out };
    if (st.id === 'window') return { color: SL.window.color, i: SL.window.i, y: SL.window.y, out: SL.window.out };
    if (st.id === 'dome') return { color: SL.dome.color, i: SL.dome.i*(.85 + .15*Math.sin(S.T*.8)), y: SL.dome.y, out: SL.dome.out };
    if (st.id === 'mail') return { color: SL.mail.color, i: SL.mail.i, y: SL.mail.y, out: SL.mail.out };
    if (st.id === 'board') return { color: SL.board.color, i: SL.board.i, y: SL.board.y, out: SL.board.out };
    if (st.id === 'green') return { color: G.growLamp ? SL.grow.color : SL.green.color, i: G.growLamp ? SL.grow.i : SL.green.i, y: SL.door.y, out: SL.door.out };
    return { color: SL.door.color, i: SL.door.i, y: SL.door.y, out: SL.door.out };
  }

  /* ================= THE WALK ================= */
  let sitK = S.sitting ? 1 : 0;
  const dv = new THREE.Vector3(), eye = new THREE.Vector3(), look = new THREE.Vector3(), e2 = new THREE.Vector3(), l2 = new THREE.Vector3();
  const view: View = {
    id: 'ring', label: tr('环廊'), eye: [0, C.eye, -C.rc], look: [0, C.lookY, -RO], fov: C.fov, yaw: C.yaw, pitch: C.pitch, dolly: C.dolly, bar: false,
    portrait: { fov: C.portrait.fov },
    dyn(){
      const port = camera.aspect < 1, rc = port ? C.portrait.rc : C.rc;
      dirOf(S.phi, dv);
      eye.copy(dv).multiplyScalar(rc).setY(port ? C.portrait.eye : C.eye);
      look.copy(dv).multiplyScalar(RO).setY(port ? C.portrait.lookY : C.lookY);
      const k = ease(clamp(sitK, 0, 1));
      if (k > 0){
        e2.copy(dv).multiplyScalar(RO - C.sit.d - (port ? .5 : 0)).setY(C.sit.eye); l2.copy(dv).multiplyScalar(RO).setY(C.sit.lookY);
        eye.lerp(e2, k); look.lerp(l2, k);
      }
      eye.y += CAM.lift*C.bob;
      return { eye: [eye.x, eye.y, eye.z], look: [look.x, look.y, look.z] };
    }
  };

  function sync(dt: number){
    sitK += ((S.sitting ? 1 : 0) - sitK)*(1 - Math.exp(-dt*C.sit.rate));
    const phi = S.phi;
    /* a drag walks the ring at the rate the wall a metre in front of it slides
       past on screen, so the floor stays under the finger */
    const c = Math.max(-2, camera.position.x*dv.x + camera.position.z*dv.z), D = Math.max(.5, RO - 1 - c);
    const hf = 2*Math.atan(Math.tan(camera.fov*D2R/2)*camera.aspect), f = 800/Math.tan(hf/2);
    setPPD(clamp(f*(RO - 1)/D*D2R, 8, 120));

    for (const s of stations) if (Math.abs(angDiff(s.st.ang, phi)) < 75) s.sync(dt);
    for (const p of proxies){
      const near = offCentre(p.st) && Math.abs(angDiff(p.st.ang, phi)) < 60;
      p.b.visible = near;
      if (near){ p.b.getWorldPosition(pv).project(camera); onScreen.set(p.st, pv.z < 1 && Math.abs(pv.x) < 1.02); } else onScreen.set(p.st, false);
    }
    const spin = S.sitting ? 9 : 14;
    for (const p of portGlass) p.mat.map.offset.x = ((S.T*spin*.6 + p.k*31) % 120)/120;

    /* the lamp pool: the n lamps nearest straight ahead, each fading out before it is handed on */
    const lampAngs = Array.from({ length: 9 }, (_, k) => STEP/2 + k*STEP).sort((a, b) => Math.abs(angDiff(a, phi)) - Math.abs(angDiff(b, phi)));
    lamps.forEach((l, i) => { const a = lampAngs[i], d = Math.abs(angDiff(a, phi));
      ringPt(a, RO - LT.lamp.out, LT.lamp.y, l.position); l.intensity = LT.lamp.intensity*smooth(LT.lamp.reach, LT.lamp.reach - 26, d); });
    const near = [...RING].sort((a, b) => Math.abs(angDiff(a.ang, phi)) - Math.abs(angDiff(b.ang, phi)));
    stLights.forEach((l, i) => { const st = near[i], d = Math.abs(angDiff(st.ang, phi)), q = stationLight(st);
      ringPt(st.ang, RO - q.out, q.y, l.position); l.color.set(q.color); l.intensity = q.i*smooth(SL.reach, SL.reach - 22, d); });
  }

  return {
    scene, views: [view], sync,
    /* flares and puffs: the 2D corridor put them in screen design units over the wall */
    fxAt(_k, x, y){ return [ringPt(S.phi + (x - 800)/R.ppd, RO - .35, Y(y)), 1/RU]; },
    enter(){ sitK = S.sitting ? 1 : 0; },
    dispose(){ setPPD(); }
  };
}

register3D({ id: 'corridor', build });
