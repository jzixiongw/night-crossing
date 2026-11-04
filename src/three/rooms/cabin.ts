import * as THREE from 'three';
import { tr } from '../../i18n';
import { BRUSH, SAMBER, SCOOL, SFOG, SOFT, SPR_OF, SWARM, txt, txtFit } from '../../core/paint';
import { clamp, mixHex, mk } from '../../core/util';
import { K_WL } from '../../core/depth';
import { COL, ORDER, ROUTES, TEA } from '../../data/index';
import { CABIN_SPACE, WIN, lampPos } from '../../rooms/cabin';
import { callPort } from '../../rooms/hatch';
import { S } from '../../state/runtime';
import { G } from '../../state/store';
import { C3, U, designX, designY, wallX, wallY } from '../config/cabin';
import { SHARED } from '../config/shared';
import { CAM } from '../../core/camera';
import { FONT_GEN, camera, designMap, pickable, rayOf, register3D, type Built } from '../engine';
import { M, RIM, blot, canvasTex, flatMat, glow, lathe, mesh, noRay, planarUV, rbox, rrPath, rrShape, spriteTex, texOf, toon, tube } from '../kit';
import { slipOnWall } from '../props';
import type { View } from '../view';
import { SKY_Z, buildSky, skyLocal } from './cabin-sky';

/* ================= THE BRIDGE, IN THREE.JS =================
   Everything the cabin *does* still runs in rooms/cabin.ts: its update()
   moves the lamp, the beacons, the fog and the turn; its ACT handlers answer
   the taps; G and S hold the state. This file draws it and says where a
   pointer lands:

     - the back wall is laid out from the 2D numbers through wallX/wallY, so
       the windows *are* WIN, the bulbs hang at S.slots, and S.breaths and
       S.strokes draw onto a canvas mapped across the glass by UV;
     - CABIN_SPACE answers "which window is this beacon behind" and "where in
       the sky / on the glass did I tap" from the real camera;
     - three places to be: the desk, leaning at the left window (where you
       breathe on the glass and draw), and over the chart table. */

const D2R = Math.PI/180;
const RM = C3.room, L = C3.layout, PAL = C3.palette, LT = C3.light, V = C3.views;
const HW = RM.halfW, H = RM.h, BACK = RM.back;
const GLASS_Z = BACK - C3.glass.recess;
const MAP = designMap(C3.map.unit, C3.map.x0, C3.map.floorY, BACK);

function build(): Built {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#070c17');
  const roomG = new THREE.Group(); roomG.name = 'room'; scene.add(roomG);
  const sky = buildSky(); scene.add(sky.group);
  const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = roomG): T => { parent.add(o); return o; };

  /* ================= TEXTURES PAINTED WITH THE 2D KIT ================= */
  const grainCanvas = (kind: number) => BRUSH[kind];
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
    g.fillStyle = PAL.desk; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++){ const x = i*w/7; g.fillStyle = i % 2 ? '#a46d48' : '#97623f'; g.fillRect(x, 0, w/7, h); g.fillStyle = '#5c3927'; g.globalAlpha = .4; g.fillRect(x, 0, 2, h); g.globalAlpha = 1; }
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,220,170,.12)'); gr.addColorStop(1, 'rgba(20,10,10,.22)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .6; g.fillStyle = g.createPattern(grainCanvas(1), 'repeat'); g.fillRect(0, 0, w, h);
  });
  const stripeTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = PAL.blanket; g.fillRect(0, 0, w, h); g.fillStyle = PAL.stripe; g.globalAlpha = .7;
    for (const x of [.22, .34, .66, .78]) g.fillRect(x*w, 0, w*.045, h);
    g.globalAlpha = 1; g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .5; g.fillStyle = g.createPattern(grainCanvas(0), 'repeat'); g.fillRect(0, 0, w, h);
  });

  /* ================= THE SHELL ================= */
  const wallShape = new THREE.Shape(); wallShape.moveTo(-HW, 0); wallShape.lineTo(HW, 0); wallShape.lineTo(HW, H); wallShape.lineTo(-HW, H); wallShape.closePath();
  const winRect = (side: string) => { const [x, y, w, h] = WIN[side]; return { X0: wallX(x), X1: wallX(x + w), Y0: wallY(y + h), Y1: wallY(y), r: U(70) }; };
  for (const s of ['left', 'right']){ const q = winRect(s); wallShape.holes.push(rrPath(new THREE.Path(), q.X0, q.Y0, q.X1 - q.X0, q.Y1 - q.Y0, q.r)); }
  {
    const g = new THREE.ExtrudeGeometry(wallShape, { depth: RM.wallT, bevelEnabled: false, curveSegments: 12 });
    const t = panelTex.t.clone(); t.repeat.set(1/BAY, 1/H); t.offset.set(HW/BAY % 1, 0); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    add(mesh(g, toon('#ffffff', { map: t, rim: 0, hl: 0, ramp: 'soft' }), [0, 0, BACK - RM.wallT], { cast: false }));
  }
  add(mesh(rbox(HW*2, .59, .05, .01), M('wall', PAL.wainscot, { rep: [10, 1] }), [0, .295, BACK + .025], { cast: false }));
  add(mesh(rbox(HW*2, .07, .08, .025), M('metal', PAL.rail, { hl: .25 }), [0, .61, BACK + .04], { cast: false }));
  add(mesh(rbox(HW*2, .12, .1, .02), M('wall', PAL.cornice, { rep: [10, 1] }), [0, H - .06, BACK + .05], { cast: false }));
  add(mesh(rbox(HW*2, .055, .06, .02), M('metal', PAL.metalD), [0, H - .15, BACK + .03], { cast: false }));
  /* repeated small parts go in as one instanced mesh each: two draw calls
     instead of seventy */
  const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, pts: [number, number, number][]) => {
    const im = new THREE.InstancedMesh(geo, mat, pts.length), m4 = new THREE.Matrix4();
    pts.forEach((p, i) => im.setMatrixAt(i, m4.makeTranslation(p[0], p[1], p[2]))); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    return add(im);
  };
  { const pts: [number, number, number][] = [];
    for (const [x0, n] of [[300, 10], [950, 14]] as const) for (let k = 0; k < n; k++) pts.push([wallX(x0 + k*28 + 6), wallY(626), BACK + .052]);
    inst(rbox(U(12), U(52), .012, .02), flatMat('#16213a', { opacity: .55 }), pts); }
  const boltPts: [number, number, number][] = [];

  for (const s of ['left', 'right']){
    const q = winRect(s), o = U(26);
    const ring = rrShape(q.X0 - o, q.Y0 - o, q.X1 - q.X0 + o*2, q.Y1 - q.Y0 + o*2, U(92));
    ring.holes.push(rrPath(new THREE.Path(), q.X0, q.Y0, q.X1 - q.X0, q.Y1 - q.Y0, q.r));
    const g = new THREE.ExtrudeGeometry(ring, { depth: .06, bevelEnabled: true, bevelThickness: .025, bevelSize: .018, bevelSegments: 3, curveSegments: 14 });
    add(mesh(g, M('metal', PAL.frame, { grain: 1, rep: 2, hl: .3, hlSize: .12 }), [0, 0, BACK + .005]));
    const [x, y, w, h] = WIN[s];
    for (let k = 0; k < 7; k++) for (const yy of [y - 14, y + h + 14]) boltPts.push([wallX(x + 90 + k*60), wallY(yy), BACK + .095]);
    for (let k = 0; k < 4; k++) for (const xx of [x - 14, x + w + 14]) boltPts.push([wallX(xx), wallY(y + 90 + k*67), BACK + .095]);
    add(mesh(rbox(U(w + 60), .07, .2, .03), M('metal', PAL.sill), [wallX(x + w/2), wallY(y + h + 32), BACK + .1]));
    add(blot(U(w)*.55, .12, .35)).position.set(wallX(x + w/2), .002, BACK + .5);
  }
  inst(new THREE.SphereGeometry(.016, 10, 8), M('metal', PAL.bolt), boltPts).receiveShadow = true;
  {
    const b = L.breaker, cx = (b.x0 + b.x1)/2, cy = (b.y0 + b.y1)/2, w = b.x1 - b.x0, h = b.y1 - b.y0;
    add(mesh(rbox(w, h, .07, .03), M('metal', PAL.metalD), [cx, cy, BACK + .035]));
    add(mesh(rbox(w*.84, h*.66, .02, .02), toon('#1a2640', { grain: 0 }), [cx, cy + h*.1, BACK + .065], { cast: false }));
    const sw = rbox(.05, .1, .03, .012), sm = M('ceramic', PAL.cream);
    for (let i = 0; i < 8; i++) add(mesh(sw, sm, [cx - w*.3 + (i % 4)*w*.2, cy + h*.27 - Math.floor(i/4)*h*.3, BACK + .085]));
    add(mesh(new THREE.BoxGeometry(w*.8, .006, .005), flatMat('#c4b392', { opacity: .4 }), [cx, b.y0 + .14, BACK + .072], { cast: false }));
  }
  {
    const depth = RM.front - BACK, zc = (RM.front + BACK)/2;
    const ft = floorTex.t.clone(); ft.repeat.set(HW*2/.9, depth/.9); ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
    const f = add(mesh(new THREE.PlaneGeometry(HW*2, depth), toon('#ffffff', { map: ft, rim: 0, hl: 0, ramp: 'soft' }), [0, 0, zc], { rot: [-Math.PI/2, 0, 0], cast: false }));
    f.renderOrder = -1;
    add(mesh(new THREE.PlaneGeometry(HW*2, depth), M('wall', PAL.ceiling, { grain: 1, rep: [6, 6] }), [0, H, zc], { rot: [Math.PI/2, 0, 0], cast: false }));
    for (const z of [-1.75, -.25, 1.25]) add(mesh(rbox(HW*2, .08, .12, .02), M('wall', PAL.beam, { grain: 1, rep: [8, 1] }), [0, H - .05, z], { cast: false }));
    for (const sx of [-1, 1]){
      const t = panelTex.t.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(depth/BAY, 1);
      add(mesh(new THREE.PlaneGeometry(depth, H), toon('#c8d0e0', { map: t, rim: 0, hl: 0, ramp: 'soft' }), [sx*HW, H/2, zc], { rot: [0, -sx*Math.PI/2, 0], cast: false }));
      add(mesh(rbox(.05, .59, depth, .01), M('wall', PAL.wainscot, { grain: 1, rep: [8, 1] }), [sx*(HW - .025), .295, zc], { cast: false }));
      add(mesh(rbox(.08, .07, depth, .025), M('metal', PAL.rail), [sx*(HW - .04), .61, zc], { cast: false }));
      add(mesh(rbox(.1, .12, depth, .02), M('wall', PAL.cornice), [sx*(HW - .05), H - .06, zc], { cast: false }));
      add(mesh(rbox(.12, H, .12, .03), M('metal', PAL.frame), [sx*(HW - .06), H/2, BACK + .06], { cast: false }));
    }
  }
  /* the door, on the left wall */
  {
    const g = add(new THREE.Group()); g.position.set(-HW + .004, 0, L.door.z); g.rotation.y = Math.PI/2;
    const { w, h } = L.door;
    add(mesh(rbox(w + .12, h + .08, .04, .02), M('wood', PAL.doorFrame), [0, (h + .08)/2, .02]), g);
    add(mesh(rbox(w, h, .05, .025), M('wood', PAL.door, { rep: [1, 2] }), [0, h/2, .045]), g);
    add(mesh(rbox(w*.9, .05, .02, .01), M('wood', '#e0b07e'), [0, .16, .075]), g);
    add(mesh(new THREE.CircleGeometry(.13, 32), toon(PAL.porthole, { grain: -1, emissive: '#22344f', ei: 1 }), [0, 1.45, .072]), g);
    add(mesh(new THREE.TorusGeometry(.135, .022, 10, 32), M('brass', PAL.brass), [0, 1.45, .074]), g);
    add(glow(SCOOL, .32, .35), g).position.set(0, 1.45, .09);
    add(mesh(new THREE.SphereGeometry(.035, 14, 10), M('brass', PAL.handle), [w/2 - .12, .98, .1]), g);
    pickable(g, { act: 'go:corridor', label: tr('舱门（回环廊）'), key: 'cabDoor' });
  }
  {
    const r = L.rug, g = add(new THREE.Group()); g.position.set(0, 0, r.z); g.scale.set(r.rx, 1, r.rz);
    add(mesh(new THREE.CylinderGeometry(1, 1, .014, 64), M('cloth', PAL.rug, { grain: 1, rep: 3 }), [0, .007, 0], { cast: false }), g);
    add(mesh(new THREE.RingGeometry(.86, .9, 64), toon(PAL.rugBorder, { grain: -1, side: THREE.DoubleSide, ramp: 'soft' }), [0, .0145, 0], { rot: [-Math.PI/2, 0, 0], cast: false }), g);
  }

  /* ---- the bench under the left window ---- */
  const blanketFolded = (() => {
    const b = L.bench, z = BACK + b.depth/2 + .02;
    add(blot(b.len*.6, .4, .55)).position.set(b.x, .003, z + .05);
    add(mesh(rbox(b.len, .3, b.depth, .03), M('woodD', PAL.woodD), [b.x, .15, z]));
    add(mesh(rbox(b.len - .04, .15, b.depth - .03, .06), M('cloth', PAL.cushion, { grain: 1, rep: [3, 1] }), [b.x, .37, z]));
    const back = add(mesh(rbox(b.len - .08, .46, .15, .07), M('cloth', PAL.cushion, { grain: 1, rep: [3, 1] }), [b.x, .66, BACK + .11]));
    back.rotation.x = -.12;
    for (const dx of [-.28, .28]) add(mesh(rbox(.012, .34, .01, .004), flatMat('#364d70', { opacity: .6 }), [b.x + dx, .66, BACK + .19], { cast: false, receive: false })).rotation.x = -.12;
    const bl = add(mesh(rbox(.58, .1, .38, .035), M('cloth', '#ffffff', { map: stripeTex.t }), [wallX(466), .5, z + .03]));
    bl.rotation.y = .06;
    return pickable(bl, { act: 'cab:blanket', label: tr('毯子') });
  })();

  /* ---- the plant ---- */
  const plantLeaves = (() => {
    const p = L.plant, g = add(new THREE.Group()); g.position.set(p.x, 0, p.z);
    add(blot(.3, .16, .55), g).position.y = .003;
    add(mesh(lathe([[0, 0], [.12, 0], [.155, .26], [.172, .262], [.172, .31], [.152, .31], [.15, .29], [0, .29]], 28), M('ceramic', PAL.pot, { hl: .3, grain: 1 })), g);
    add(mesh(new THREE.CircleGeometry(.15, 24), toon(PAL.soil, { grain: 0 }), [0, .292, 0], { rot: [-Math.PI/2, 0, 0] }), g);
    const leaves = add(new THREE.Group(), g); leaves.position.y = .29;
    const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(.5, .5, 0, 1); leafShape.quadraticCurveTo(-.5, .5, 0, 0);
    const leafGeo = new THREE.ShapeGeometry(leafShape, 10);
    const m1 = M('leaf', PAL.leaf), m2 = M('leaf', PAL.leafD);
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
    g.strokeStyle = 'rgba(51,70,110,.75)'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(40, 220); g.bezierCurveTo(140, 120, 240, 250, 360, 130); g.stroke();
    ORDER.filter(cl => G.answered[cl] > 0).forEach((cl, i) => { g.fillStyle = COL[cl].hex; g.beginPath(); g.arc(80 + i*80, 196 - i*22, 13, 0, Math.PI*2); g.fill(); });
  });
  const chartLampParts = (() => {
    const t = L.chartTable, g = add(new THREE.Group()); g.position.set(t.x, 0, t.z);
    add(blot(t.w*.65, t.d*.75, .55), g).position.y = .003;
    const leg = rbox(.06, t.h, .06, .015), lm = M('woodD', PAL.woodD);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(mesh(leg, lm, [sx*(t.w/2 - .07), t.h/2, sz*(t.d/2 - .07)]), g);
    add(mesh(rbox(t.w - .1, .04, .03, .01), lm, [0, .25, t.d/2 - .07]), g);
    add(mesh(rbox(t.w, .05, t.d, .02), M('wood', PAL.wood, { rep: [2, 1] }), [0, t.h + .025, 0]), g);
    add(mesh(new THREE.PlaneGeometry(t.w*.84, t.d*.78), M('paper', '#ffffff', { map: chartTex.t }), [0, t.h + .052, .02], { rot: [-Math.PI/2, 0, .06], cast: false }), g);
    add(mesh(new THREE.CylinderGeometry(.007, .007, .18, 8), toon('#8a5a44', { grain: -1 }), [t.w*.3, t.h + .06, .1], { rot: [0, 0, Math.PI/2 + .3] }), g);
    /* dividers and a pencil, for the close look */
    add(mesh(rbox(.012, .004, .16, .002), M('brass', PAL.brass), [-.25, t.h + .058, -.05], { rot: [0, .4, 0], cast: false }), g);
    add(mesh(rbox(.012, .004, .16, .002), M('brass', PAL.brass), [-.22, t.h + .058, -.05], { rot: [0, .7, 0], cast: false }), g);
    pickable(g, { act: 'cab:chart', label: tr('图桌') });
    const st = add(new THREE.Group()); st.position.set(t.x + .12, 0, t.z + .55);
    add(blot(.26, .18, .5), st).position.y = .003;
    add(mesh(new THREE.CylinderGeometry(.19, .19, .05, 24), M('woodD', PAL.woodD), [0, .52, 0]), st);
    for (let i = 0; i < 3; i++){ const a = i*2.094 + .4; add(mesh(new THREE.CylinderGeometry(.015, .015, .52, 8), M('metal', PAL.metalD), [Math.cos(a)*.12, .26, Math.sin(a)*.12]), st); }
    const s = L.sideTable, sg = add(new THREE.Group()); sg.position.set(s.x, 0, s.z);
    add(blot(.3, .2, .55), sg).position.y = .003;
    add(mesh(new THREE.CylinderGeometry(.17, .19, .03, 24), M('woodD', PAL.woodD), [0, .015, 0]), sg);
    add(mesh(new THREE.CylinderGeometry(.03, .03, .6, 12), M('woodD', PAL.woodD), [0, .31, 0]), sg);
    add(mesh(new THREE.CylinderGeometry(.27, .27, .04, 32), M('wood', PAL.wood), [0, .62, 0]), sg);
    const lamp = add(new THREE.Group(), sg); lamp.position.y = .64;
    add(mesh(new THREE.CylinderGeometry(.07, .08, .025, 20), M('brass', PAL.brass), [0, .012, 0]), lamp);
    add(mesh(new THREE.CylinderGeometry(.012, .012, .42, 8), M('brass', PAL.brass), [0, .23, 0]), lamp);
    const shadeMat = M('cloth', PAL.shadeOff, { side: THREE.DoubleSide });
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
    add(mesh(rbox(U(124), U(104), .03, .03), M('paper', PAL.paper)), g);
    add(mesh(new THREE.PlaneGeometry(U(124), U(104)), M('paper', '#ffffff', { map: signTex.t }), [0, 0, .0155], { cast: false }), g);
    for (const [x, y] of [[-50, 40], [50, 40], [-50, -40], [50, -40]]) add(mesh(new THREE.SphereGeometry(.011, 8, 6), M('brass', PAL.brass), [U(x), U(y), .02]), g);
    pickable(g, { act: 'cab:route', label: tr('设定航向'), inspect: true, activateOnInspect: true });
  }
  /* pinned over the edge of the window frame, so it sits in front of it */
  const slip = slipOnWall(roomG, MAP, { ...L.slip, rot: .014, z: BACK + .115 });

  /* ================= THE GLASS =================
     One pane per window, cut to the same rounded rect as the hole in the wall.
     A point on the pane converts to WIN's design units through the wall map,
     which is the space S.breaths and S.strokes already live in. */
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

  const lamp = (() => {
    const pivot = add(new THREE.Group()); pivot.position.set(0, H, L.lampZ);
    const rod = L.lampRod;
    add(mesh(new THREE.CylinderGeometry(.012, .012, rod, 8), M('metal', PAL.metalD), [0, -rod/2, 0]), pivot);
    add(mesh(new THREE.CylinderGeometry(.045, .055, .05, 16), M('brass', PAL.brass), [0, -rod, 0]), pivot);
    const hit = add(new THREE.Group(), pivot);
    const prof: [number, number][] = [[.305, -.31], [.3, -.3], [.27, -.22], [.23, -.14], [.17, -.07], [.1, -.02], [.04, 0]];
    const shadeGeo = lathe(prof, 40); shadeGeo.translate(0, -rod, 0);
    add(mesh(shadeGeo, M('ceramic', PAL.teal, { grain: 1, rep: [3, 1], hl: .45 })), hit);
    const inner = toon('#fff1d6', { grain: -1, side: THREE.BackSide, emissive: '#ffcf8f', ei: 1 });
    add(mesh(shadeGeo, inner, undefined, { cast: false }), hit);
    const bulbMat = toon('#fff6dc', { grain: -1, emissive: '#ffe2b0', ei: 1 });
    add(mesh(new THREE.SphereGeometry(.065, 16, 12), bulbMat, [0, -rod - .26, 0], { cast: false }), hit);
    const cord = add(mesh(new THREE.CylinderGeometry(.004, .004, 1, 6), toon('#c9a26a', { grain: -1 }), [.2, 0, .04], { cast: false }), hit);
    const bead = add(mesh(new THREE.SphereGeometry(.026, 12, 10), M('brass', PAL.brass), [.2, 0, .04]), hit);
    pickable(hit, { act: 'cab:lamp', label: tr('灯绳'), key: 'lamp' });
    const bulbY = -rod - .26;
    const point = add(new THREE.PointLight(LT.lamp.color, 0, LT.lamp.distance, LT.lamp.decay), pivot); point.position.y = bulbY - .02;
    const spot = add(new THREE.SpotLight(LT.lamp.color, 0, LT.lamp.distance, LT.lamp.angle, LT.lamp.penumbra, LT.lamp.decay), pivot);
    spot.position.y = bulbY; spot.target.position.set(0, -10, 0); pivot.add(spot.target);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0006; spot.shadow.normalBias = .02;
    spot.shadow.radius = LT.lamp.shadowRadius; spot.shadow.camera.near = .1; spot.shadow.camera.far = 8;
    const halo = add(glow(SWARM, 2.4, 0), pivot); halo.position.y = bulbY;
    const core = add(glow(SWARM, .36, 0), pivot); core.position.y = bulbY;
    return { pivot, inner, bulbMat, cord, bead, point, spot, halo, core, bulbY };
  })();
  /* the lamp's warmth on the desk: a second, shadowless light low over it */
  const deskWarm = add(new THREE.PointLight(LT.deskWarm.color, 0, LT.deskWarm.distance, LT.deskWarm.decay));
  deskWarm.position.set(0, L.desk.top + .9, (L.desk.z0 + L.desk.z1)/2 - .2);

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
      add(mesh(new THREE.CylinderGeometry(.011, .011, U(8), 10), M('metal', PAL.metalD), [0, -U(11), 0], { cast: false }), g);
      const mat = toon('#ffffff', { grain: -1, emissive: '#ffffff', ei: .7, ramp: 'crisp', hl: .6 });
      const b = add(mesh(bulbGeo, mat, [0, -U(13), 0], { cast: false }), g);
      const halo = add(glow(SWARM, U(92)), g); halo.position.y = -U(13) - .035;
      return { g, b, mat, halo, color: '' };
    });
    const light = add(new THREE.PointLight('#ffffff', 0, LT.bulbs.distance, LT.bulbs.decay));
    return { pool, light };
  })();

  /* ---- the near desk and what is on it ---- */
  const D = L.desk, DZ = L.deskItemsZ, TOP = D.top, IT = L.items, IS = L.itemScale;
  {
    const w = D.x1 - D.x0, d = D.z1 - D.z0, cx = (D.x0 + D.x1)/2, cz = (D.z0 + D.z1)/2;
    const bt = boardTex.t.clone(); bt.repeat.set(w/2.4, 1); bt.wrapS = bt.wrapT = THREE.RepeatWrapping;
    add(mesh(rbox(w, .06, d, .025), M('wood', '#ffffff', { map: bt, hl: .1, hlSize: .25 }), [cx, TOP - .03, cz]));
    add(mesh(rbox(w - .04, TOP - .06, .05, .02), M('woodD', PAL.woodD, { grain: 2, rep: [6, 1] }), [cx, (TOP - .06)/2, D.z1 - .05]));
    for (const sx of [-1, 1]) add(mesh(rbox(.05, TOP - .06, d - .1, .02), M('woodD', PAL.woodD), [cx + sx*(w/2 - .04), (TOP - .06)/2, cz]));
    add(mesh(rbox(w - .12, .035, .04, .015), M('wood', PAL.wood), [cx, TOP + .017, D.z0 + .03]));
    add(blot(w*.55, d*.7, .5)).position.set(cx, .003, cz);
  }
  const onDesk = (x: number, z = DZ) => { const g = add(new THREE.Group()); g.position.set(x, TOP, z); g.scale.setScalar(IS); return g; };

  const vase = (() => {
    const g = onDesk(IT.vase); g.scale.setScalar(IS*.8);
    add(blot(.11, .06, .45), g).position.y = .002;
    add(mesh(lathe([[0, 0], [.05, 0], [.085, .05], [.08, .11], [.042, .16], [.032, .19], [.04, .205], [.036, .21], [0, .21]], 28),
      M('glass', PAL.glassTint, { emissive: '#3c5c66', ei: .3 })), g);
    const flowers = add(new THREE.Group(), g); flowers.position.y = .2;
    pickable(g, { act: 'cab:vase', label: tr('花瓶') });
    let kind = '__';
    const stem = (pts: [number, number, number][], r = .004) => mesh(tube(pts, r), toon('#2f5f5a', { grain: -1 }), undefined, { cast: false });
    function sync(){
      if (G.vase === kind) return; kind = G.vase;
      flowers.children.slice().forEach(o => { flowers.remove(o); (o as THREE.Mesh).geometry?.dispose(); });
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
        const lg = new THREE.SphereGeometry(1, 10, 6), lm = M('leaf', PAL.leaf);
        for (let k = 0; k < 6; k++){ const y = .04 + k*.035, x = .004 + k*.008;
          for (const s of [-1, 1]){ const l = mesh(lg, lm, [x + s*.03, y, 0], { cast: false }); l.scale.set(.03, .01, .012); l.rotation.z = s*.35; add(l, flowers); } }
      }
    }
    return { sync };
  })();

  const cup = (() => {
    const g = onDesk(IT.cup);
    add(blot(.11, .07, .45), g).position.y = .002;
    const s = .95, prof: [number, number][] = [[0, 0], [.05, 0], [.066, .028], [.073, .1], [.066, .1], [.06, .034], [.046, .016], [0, .016]];
    add(mesh(lathe(prof.map(([x, y]) => [x*s, y*s]), 32), M('ceramic', PAL.cream, { side: THREE.DoubleSide })), g);
    add(mesh(new THREE.CylinderGeometry(.0715*s, .0705*s, .012*s, 32, 1, true), M('ceramic', '#7fa0bb'), [0, .07*s, 0], { cast: false }), g);
    const handle = add(mesh(new THREE.TorusGeometry(.026*s, .008*s, 8, 18, Math.PI), M('ceramic', PAL.cream), [.072*s, .058*s, 0]), g);
    handle.rotation.z = -Math.PI/2;
    const teaMat = toon('#c9853f', { grain: -1, emissive: '#000000', ramp: 'crisp', hl: .5 });
    const tea = add(mesh(new THREE.CircleGeometry(1, 28), teaMat, undefined, { cast: false, rot: [-Math.PI/2, 0, 0] }), g);
    const leafM = toon('#5b7a3a', { grain: -1 }), leaves = add(new THREE.Group(), g);
    for (const [x, z, r] of [[-.02, .005, .4], [.016, -.01, -.5], [.004, .014, 1.2]]){ const l = mesh(new THREE.CircleGeometry(1, 8), leafM, [x, 0, z], { cast: false, rot: [-Math.PI/2, 0, r] }); l.scale.set(.012, .004, 1); add(l, leaves); }
    const steam = [0, 1, 2].map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex(SFOG), transparent: true, depthWrite: false, opacity: 0, toneMapped: false })); add(noRay(sp), g); return sp; });
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

  const bread = (() => {
    const g = onDesk(IT.bread);
    add(blot(.17, .08, .4), g).position.y = .002;
    add(mesh(new THREE.CylinderGeometry(.16, .13, .016, 36), M('ceramic', PAL.cream), [0, .008, 0]), g);
    const loaf = add(new THREE.Group(), g); loaf.position.y = .016;
    const bm = M('wood', '#d98e48', { grain: 0, rep: 2, hl: .2, hlSize: .25 }), sph = new THREE.SphereGeometry(1, 20, 14);
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
    add(mesh(new THREE.BoxGeometry(TW, TH, .003), M('paper', PAL.paper), [0, TH/2, -.002]), card);
    add(mesh(new THREE.PlaneGeometry(TW, TH), M('paper', '#ffffff', { map: ticketTex.t }), [0, TH/2, 0], { cast: false }), card);
    add(mesh(rbox(.2, .025, .04, .008), M('woodD', PAL.woodD), [0, .0125, -.05]), g);
    pickable(g, { act: 'ui:ticket', label: tr('航行记录') });
  }

  const lantern = (() => {
    const g = onDesk(IT.lantern);
    add(blot(.16, .1, .5), g).position.y = .002;
    add(mesh(rbox(.2, .05, .15, .012), M('woodD', PAL.woodD), [0, .025, 0]), g);
    const notchGeo = rbox(.014, .03, .006, .004), notchMat = toon('#f2dfc0', { grain: -1 });
    const notches = [0, 1, 2].map(() => add(mesh(notchGeo, notchMat, [0, .025, .077], { cast: false }), g));
    const glassMat = toon('#ffffff', { grain: -1, emissive: '#ffffff', ei: .4, ramp: 'crisp', hl: .7, hlSize: .08 });
    add(mesh(rbox(.15, .2, .13, .03), glassMat, [0, .155, 0]), g);
    const brass = M('brass', PAL.brass);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(mesh(new THREE.CylinderGeometry(.006, .006, .22, 6), brass, [sx*.074, .16, sz*.064]), g);
    add(mesh(rbox(.17, .035, .15, .012), brass, [0, .275, 0]), g);
    add(mesh(new THREE.TorusGeometry(.05, .007, 8, 20, Math.PI), brass, [0, .292, 0]), g);
    const light = add(new THREE.PointLight('#ffffff', 0, LT.lantern.distance, LT.lantern.decay), g); light.position.set(0, .38, .6);
    const halo = add(glow(SAMBER, .8, 0), g); halo.position.set(0, .16, .05);
    pickable(g, { act: 'cab:lantern', label: tr('提灯') });
    return { glassMat, notches, light, halo };
  })();

  const strap = (() => {
    const s = L.strap, p = add(new THREE.Group()); p.position.set(s.x, H, s.z);
    add(mesh(rbox(.035, s.len, .012, .005), M('cloth', PAL.navy)), p).position.y = -s.len/2;
    add(mesh(new THREE.TorusGeometry(.07, .014, 10, 28), M('cloth', PAL.navy)), p).position.y = -s.len - .07;
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

  const lapBlanket = (() => {
    const g = new THREE.PlaneGeometry(1.4, 1.1, 24, 18), p = g.attributes.position;
    for (let i = 0; i < p.count; i++){
      const u = p.getX(i)/1.4 + .5, v = p.getY(i)/1.1 + .5;
      const along = v*1.1, edge = D.z1 - .02 - L.lap.z, folds = Math.sin(u*Math.PI*3.2 + v*2)*.012;
      const z = along < edge ? L.lap.z + along : D.z1 - .02 + Math.sin((along - edge)*2.2)*.06;
      const y = along < edge ? TOP + .014 + Math.max(0, folds) + (1 - Math.min(1, along/.12))*.03 : TOP + .01 - (along - edge)*1.2;
      p.setXYZ(i, L.lap.x0 + u*1.4 + Math.sin(v*5)*.02, y, z);
    }
    g.computeVertexNormals();
    const st = stripeTex.t.clone(); st.repeat.set(2, 2); st.wrapS = st.wrapT = THREE.RepeatWrapping;
    const m = add(mesh(g, M('cloth', '#ffffff', { map: st, side: THREE.DoubleSide }))); m.visible = false;
    return pickable(m, { act: 'cab:blanket', label: tr('毯子'), key: 'blanketFg', anchor: new THREE.Vector3(L.lap.x0 + .7, TOP + .02, L.lap.z + .1), r: .25 });
  })();

  /* ================= CABIN_SPACE, answered from the camera ================= */
  CABIN_SPACE.windowOf = (bx, by) => {
    const P = skyLocal(bx, by, SKY_Z + 2).add(sky.group.position), C = camera.position;
    const t = (GLASS_Z - C.z)/(P.z - C.z), x = designX(C.x + (P.x - C.x)*t), y = designY(C.y + (P.y - C.y)*t);
    for (const side of ['left', 'right']){ const [wx, wy, ww, wh] = WIN[side]; if (x > wx + 6 && x < wx + ww - 6 && y > wy + 6 && y < wy + wh - 6) return side; }
    return null;
  };
  const tmp = new THREE.Vector3(), skyPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(SKY_Z + 2));
  CABIN_SPACE.sky = (e) => rayOf(e).ray.intersectPlane(skyPlane, tmp) ? sky.toDesign(tmp) : { x: -9999, y: -9999 };
  CABIN_SPACE.wall = (e) => rayOf(e).ray.intersectPlane(glassPlane, tmp) ? toWin(tmp) : { x: -9999, y: -9999 };
  SKY_TO = (x, y) => skyLocal(x, y, SKY_Z + 2).add(sky.group.position);

  /* ================= PER FRAME ================= */
  const smooth = { hemi: LT.hemi[G.lamp ?? 0], moon: LT.moon.intensity[G.lamp ?? 0] };
  let lastSig = '';
  function sync(dt: number){
    const k = 1 - Math.exp(-dt*3), on = [1, .5, 0][G.lamp]*(S.lampFil ?? 1), reduced = !!G.reduced;
    smooth.hemi += (LT.hemi[G.lamp] - smooth.hemi)*k; smooth.moon += (LT.moon.intensity[G.lamp] - smooth.moon)*k;
    hemi.intensity = smooth.hemi*(1 + Math.min(.25, S.bulbs.length*.02)); moon.intensity = smooth.moon;
    RIM.k.value = SHARED.rim.k*(.6 + .8*S.vis);
    lamp.pivot.rotation.z = S.lampA*D2R;
    lamp.point.intensity = LT.lamp.point*on; lamp.spot.intensity = LT.lamp.spot*on;
    deskWarm.intensity = LT.deskWarm.intensity*on;
    lamp.inner.emissiveIntensity = .15 + .95*on; lamp.bulbMat.emissiveIntensity = .05 + 1.1*on; lamp.bulbMat.color.set(on > .3 ? '#ffe2b0' : '#9a8a72');
    lamp.halo.material.opacity = on*.5; lamp.core.material.opacity = on*.9;
    const by = S.beadT < .3 ? U(Math.sin(S.beadT/.3*Math.PI)*16) : 0, cordLen = U(70) + by;
    lamp.cord.scale.y = cordLen; lamp.cord.position.y = -L.lampRod - .28 - cordLen/2; lamp.bead.position.y = -L.lampRod - .28 - cordLen - .02;
    const rg = S.readGlow || 0;
    chartLampParts.shadeMat.color.set(S.reading ? PAL.shadeOn : PAL.shadeOff); chartLampParts.shadeMat.emissive.set(S.reading ? '#5a3a10' : '#000000');
    chartLampParts.bulbMat.emissiveIntensity = rg*1.2; chartLampParts.light.intensity = LT.chart.intensity*rg; chartLampParts.halo.material.opacity = rg*.6;
    let n = 0, cx = 0, cy = 0, cz = 0; const col = new THREE.Color(0, 0, 0);
    bulbs.pool.forEach((p, i) => {
      const b = S.bulbs[i]; p.g.visible = !!b; if (!b) return;
      const pop = Math.min(1, (S.T - b.born)/.6), C = COL[b.color];
      if (p.color !== b.color){ p.color = b.color; p.mat.color.set(mixHex(C.hex, '#ffffff', .3)); p.mat.emissive.set(C.hex); p.halo.material.map = spriteTex(SPR_OF[b.color]); }
      p.g.position.set(wallX(b.slot.x), wallY(b.slot.y), L.bulbZ);
      p.b.scale.setScalar(.4 + .6*pop); p.b.position.y = -U(13) - U(13)*(1 - pop);
      p.halo.material.opacity = (G.lamp ? .75 : .4)*pop*(.85 + .15*Math.sin(S.T*1.3 + i));
      n++; cx += p.g.position.x; cy += p.g.position.y; cz += p.g.position.z; col.add(new THREE.Color(C.hex));
    });
    /* never hidden: a light appearing or vanishing recompiles every material */
    bulbs.light.intensity = 0;
    if (n){ bulbs.light.position.set(cx/n, cy/n - .12, cz/n + .25); bulbs.light.color.copy(col.multiplyScalar(1/n)); bulbs.light.intensity = Math.min(LT.bulbs.max, n*LT.bulbs.per); }
    const LC = ORDER[G.colorIdx], C = COL[LC], pulse = S.lanternPulse || 0, ps = Math.sin(Math.PI*pulse);
    lantern.glassMat.color.set(C.hex); lantern.glassMat.emissive.set(C.hex); lantern.glassMat.emissiveIntensity = .22 + .6*ps;
    lantern.light.color.set(C.hex); lantern.light.intensity = LT.lantern.base + LT.lantern.pulse*ps;
    lantern.halo.material.map = spriteTex(SPR_OF[LC]); lantern.halo.material.opacity = .35 + .45*ps; lantern.halo.scale.setScalar(.7 + .5*ps);
    lantern.notches.forEach((m, i) => { m.visible = i < C.blinks; m.position.x = -(C.blinks - 1)*.022 + i*.044; });
    const refl = clamp(.72 - (S.vis - .1)/.9*.68, 0, 1), [lx] = lampPos();
    glass.forEach(gl => {
      (gl.refl.material as THREE.MeshBasicMaterial).opacity = refl*.55;
      gl.lampRefl.position.x = wallX(gl.side === 'left' ? 1600 - lx - 200 : 1600 - lx + 180); gl.lampRefl.material.opacity = .6*refl*on;
    });
    drawFog3();
    blanketFolded.visible = !G.blanket; lapBlanket.visible = !!G.blanket;
    plantLeaves.rotation.z = -S.plantA*D2R;
    strap.rotation.z = Math.sin(S.T*.55 - .6)*2.4*(reduced ? .2 : 1)*D2R;
    const w = .35 + .65*Math.abs(Math.sin(S.T*(reduced ? 4 : 17)));
    moth.g.position.set(wallX(S.mx ?? 440), wallY(S.my ?? 300), L.lampZ + .3); moth.wl.rotation.y = (1 - w)*1.2; moth.wr.rotation.y = -(1 - w)*1.2;
    vase.sync(); cup.sync(); bread.sync();
    const P = callPort(), sig = [G.no, G.route, P ? P.name : '', ORDER.map(c => G.answered[c] > 0 ? 1 : 0).join(''), FONT_GEN].join('|');
    if (sig !== lastSig){ lastSig = sig; signTex.redraw(); ticketTex.redraw(); chartTex.redraw(); }
    slip.redraw();
    sky.update(dt);
  }

  const views: View[] = [
    { id: 'desk', label: tr('桌前'), ...V.desk },
    { id: 'window', label: tr('窗边'), ...V.window },
    { id: 'chart', label: tr('图桌'), ...V.chart }
  ];
  return {
    scene, views, sync,
    fxAt(k, x, y){
      if (k < .3){ const p = skyLocal(x, y, SKY_Z + 2.5).add(sky.group.position); return [p, sky.SU(1)]; }
      if (Math.abs(k - K_WL) < .05) return [new THREE.Vector3(wallX(x), wallY(y), GLASS_Z + .02), U(1)];
      return [new THREE.Vector3(wallX(x), wallY(y), BACK + .4), U(1)];
    },
    enter(){ lastSig = ''; },
    dispose(){ CABIN_SPACE.windowOf = DEFAULT_SPACE.windowOf; CABIN_SPACE.sky = DEFAULT_SPACE.sky; CABIN_SPACE.wall = DEFAULT_SPACE.wall; }
  };
}
const DEFAULT_SPACE = { ...CABIN_SPACE };
/* dev only: where a beacon-space point is in the world, for the browser check */
let SKY_TO: ((x: number, y: number) => THREE.Vector3) | null = null;
const toScreenPx = (v: THREE.Vector3) => { const p = v.clone().project(camera); return { X: (p.x + 1)/2*(window as any).__three.CW(), Y: (1 - p.y)/2*(window as any).__three.CH() }; };

register3D({ id: 'cabin', build });

/* For tools/three-check.mjs: where a design point on the glass or in the
   sky is on screen right now. Dev builds only. */
if (import.meta.env.DEV) (window as any).__cabin3d = {
  glassToScreen(dx: number, dy: number){ return toScreenPx(new THREE.Vector3(wallX(dx), wallY(dy), GLASS_Z)); },
  skyToScreen(dx: number, dy: number){ return SKY_TO ? toScreenPx(SKY_TO(dx, dy)) : { X: -1, Y: -1 }; },
  CW: () => (window as any).__three.CW(), CH: () => (window as any).__three.CH(), pickAt: (X: number, Y: number) => (window as any).__three.pickAt(X, Y),
  state: () => ({ room: S.room, lamp: G.lamp, colorIdx: G.colorIdx, blanket: G.blanket, reading: S.reading, bulbs: G.bulbs.slice(), answered: { ...G.answered },
    breaths: S.breaths.map(b => ({ x: b.x, y: b.y, r: b.r })), strokes: S.strokes.map(s => s.pts.slice()), focusKey: S.focusKey, reduced: G.reduced,
    beacons: S.beacons.map(b => ({ color: b.color, x: b.x, y: b.y + Math.sin(b.t*.9)*4, answered: b.answered, win: CABIN_SPACE.windowOf(b.x, b.y) })),
    cam: { panX: CAM.panX, panY: CAM.panY, tpanX: CAM.tpanX, tpanY: CAM.tpanY, user: CAM.user, tuser: CAM.tuser, zoom: CAM.zoom },
    view: (window as any).__three.view(), camPos: camera.position.toArray(), camRot: [camera.rotation.x, camera.rotation.y, camera.rotation.z] })
};
