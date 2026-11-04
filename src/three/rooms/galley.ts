import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tr } from '../../i18n';
import { BRUSH, SAMBER, SBLUE, SFOG, SIND, SWARM, txtFit } from '../../core/paint';
import { clamp, mixHex } from '../../core/util';
import { TEA } from '../../data/index';
import { KPOS, TEA_X, galleyWarm } from '../../rooms/galley';
import { S } from '../../state/runtime';
import { G } from '../../state/store';
import { GAL } from '../config/galley';
import { FONT_GEN, designMap, pickable, register3D, type Built } from '../engine';
import { M, add as addTo, blot, canvasTex, flatMat, glow, group, lathe, liveTex, mesh, noRay, rbox, rrPath, rrShape, spriteTex, toon, tube } from '../kit';
import type { View } from '../view';

/* ================= THE GALLEY, IN THREE.JS =================
   rooms/galley.ts still boils, pours, kneads, proofs and bakes: its update()
   fills the kettle under the tap and the cup under the spout, galleyTick()
   runs the burner and the oven from the main loop, every ACT['gal:*'] handler
   answers here unchanged, and S.anims (core/loop.ts) carries the kettle
   between its places. This file draws it and says where a pointer lands.

   The counter is laid out through one DesignMap (config/galley.ts): design y
   548 is the worktop surface, so S.kp -- the kettle's base in design units,
   KPOS.sink 300 / .stove 566 / .pour 742,470 tilted 34 degrees -- is placed
   with MAP.at() every frame, and the cup stands where that pouring pose puts
   the spout. Puffs (steam off the kettle, flour off the sack) are design
   points at k=1 and land on the line things stand on.

   INTERACTIONS (2D room -> here), all present:
     [x] gal:tap         press-and-hold; water runs while held, into the kettle
                         when it is at the sink and still, else into the sink;
                         lever turns; key() hint                         label 水龙头（按住）
     [x] gal:kettle      tap: sink <-> stove; press-and-hold at the stove when
                         hot: tilt to the pour pose and pour; key()       label 水壶
     [x] gal:burner      knob on the counter front; turns, blue flame ring,
                         flame light                                     label 炉子
     [x] gal:oven        knob (no label, key gal:oven) + door (key ovenDoor,
                         label 烤箱); window shows raw dough (inOven) or the
                         loaf with an amber glow and light (baking)
     [x] gal:proof       wall box, warm inside; dough grows with G.dough.proof;
                         rose indicator taller when galleyWarm()          label 发酵箱
     [x] gal:jar:<k>     three jars, painted name labels, bob with S.jarBob;
                         only osm labelled, keys jar-<k>                  label 茶叶罐
     [x] gal:ut:<i>      ladle / spatula / whisk swing with S.ut[i].a; keys
                         ut<i>, only ut0 labelled                         label 挂着的厨具
     [x] bread:take      wire rack, up to three loaves of G.breads shapes label 面包架
     [x] gal:dough       the board; press-and-drag left/right kneads (screen
                         units, only P.x deltas are used); squash with
                         S.doughSquash; shaped dough shows its shape; flour
                         dots while raw; tap advances; key() kneads       label 面板
     [x] gal:flour       sack with its painted name; flour puffs (PUFFS)  label 面粉
     [x] tea:cup         key gCup; tea level/colour/leaves/steam from G.tea label 茶杯
     [x] gal:pear        dish of G.pears pears, bite marks from G.bite    label 星梨
     [x] context pills   showShapes() -> setCtx, unchanged (DOM)
     [x] captions        say()/addLog unchanged
   PAINTED STATE:
     kettle pose S.kp (+ jitter while heating near the boil), water window
     G.kettle.water, pour stream S.pour.flow, tap stream S.tapOn, flame
     S.flameOn, knob angles, oven contents/glow, proof dough + indicator,
     board dough + squash + flour dots, jar bob, utensil swing, loaves on the
     rack, cup tea, pears + bites, porthole fog S.gFog, twinkling S.gStars,
     steam/flour puffs via fxAt. Ship roll is CAM.rot, applied by the camera. */

const D2R = Math.PI/180;
const P = GAL.palette, LT = GAL.light, RM = GAL.room, CT = GAL.counter;
const MAP = designMap(GAL.map.unit, GAL.map.x0, GAL.map.y0, RM.back);
const X = MAP.X, Y = MAP.Y, U = MAP.U;
const BACK = RM.back, HW = RM.halfW, H = RM.h;
const TOP = Y(CT.top);                 // the worktop surface
const KZ = BACK + GAL.itemZ;           // the line things stand on
const CF = BACK + CT.depth;            // the counter's front face

type Loaf = { g: THREE.Group; set(shape: string | null, raw: boolean): void };

function build(): Built {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#070c17');
  const root = new THREE.Group(); scene.add(root);
  const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = root): T => addTo(o, parent);
  /* a generous invisible grip: never drawn, but a ray still finds it */
  const pad = (geo: THREE.BufferGeometry, parent: THREE.Object3D, at: [number, number, number]) =>
    add(mesh(geo, new THREE.MeshBasicMaterial({ visible: false }), at, { cast: false, receive: false }), parent);
  /* Fold a group's plain meshes into one mesh per material, so a run of
     bolts, bars or doors is one draw call. Shared geometries (the loaves'
     sphere) are never put through this. */
  const bake = (g: THREE.Object3D) => {
    const B = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; rec: boolean }>();
    for (const c of [...g.children]){
      const m = c as THREE.Mesh; if (!m.isMesh || Array.isArray(m.material)) continue;
      m.updateMatrix(); const geo = m.geometry.clone().applyMatrix4(m.matrix);
      const key = m.material.uuid + (geo.index ? 'i' : 'n') + (m.receiveShadow ? 'r' : '');
      if (!B.has(key)) B.set(key, { mat: m.material, geos: [], rec: m.receiveShadow });
      B.get(key).geos.push(geo); g.remove(m);
    }
    for (const { mat, geos, rec } of B.values()){ const mg = geos.length === 1 ? geos[0] : mergeGeometries(geos); if (geos.length > 1) geos.forEach(x => x.dispose()); add(mesh(mg, mat, undefined, { cast: false, receive: rec }), g); }
    return g;
  };

  /* ================= TEXTURES ================= */
  const TILE = U(44), TN = 8;
  const tileTex = canvasTex(352, 352, (g, w) => {
    const t = w/TN;
    g.fillStyle = P.grout; g.fillRect(0, 0, w, w);
    let s = 31; const rnd = () => (s = (s*16807) % 2147483647)/2147483647;
    for (let j = 0; j < TN; j++) for (let i = 0; i < TN; i++){
      const x = i*t + 3, y = j*t + 3, ww = t - 6, r = rnd();
      g.fillStyle = r < .2 ? P.tileAlt : P.tile; g.beginPath(); g.roundRect(x, y, ww, ww, 8); g.fill();
      const lg = g.createLinearGradient(x, y, x + ww, y + ww); lg.addColorStop(0, 'rgba(110,140,190,.45)'); lg.addColorStop(.35, 'rgba(110,140,190,0)'); lg.addColorStop(1, 'rgba(10,16,34,.35)');
      g.fillStyle = lg; g.beginPath(); g.roundRect(x, y, ww, ww, 8); g.fill();
    }
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .35; g.fillStyle = g.createPattern(BRUSH[2], 'repeat'); g.fillRect(0, 0, w, w);
  });
  tileTex.t.wrapS = tileTex.t.wrapT = THREE.RepeatWrapping;
  const floorTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = P.floor; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++){ g.fillStyle = ['#3e4d66', '#43536d', '#3a485f', '#46566f'][i]; g.fillRect(i*w/4 + 1, 0, w/4 - 2, h); g.fillStyle = P.floorSeam; g.globalAlpha = .6; g.fillRect(i*w/4 - 1, 0, 2.5, h); g.fillRect(i*w/4, (i*97) % h, w/4, 2); g.globalAlpha = 1; }
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .35; g.fillStyle = g.createPattern(BRUSH[1], 'repeat'); g.fillRect(0, 0, w, h);
  });
  floorTex.t.wrapS = floorTex.t.wrapT = THREE.RepeatWrapping;
  const streakTex = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = 'rgba(255,255,255,.09)';
    g.beginPath(); g.moveTo(w*.2, h); g.lineTo(w*.38, h); g.lineTo(w*.78, 0); g.lineTo(w*.6, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(w*.45, h); g.lineTo(w*.5, h); g.lineTo(w*.9, 0); g.lineTo(w*.85, 0); g.closePath(); g.fill();
  });

  /* ================= LOAVES =================
     One set of shapes per place a loaf can be (the rack, the board, the
     proof box, the oven), each variant built once and shown or hidden, so
     nothing is created while you play. */
  const sphGeo = new THREE.SphereGeometry(1, 20, 14);
  const doughMat = M('cloth', P.dough, { grain: 0, rep: 2, hl: .15, hlSize: .25 }), crustMat = M('wood', P.crust, { grain: 0, rep: 2, hl: .2, hlSize: .25 });
  const scoreMat = toon(P.score, { grain: -1 });
  function loafSet(parent: THREE.Object3D, scale: number): Loaf {
    const g = group(parent); g.scale.setScalar(scale);
    const V: Record<string, { g: THREE.Group; lumps: THREE.Mesh[]; scores: THREE.Mesh[] }> = {};
    const lump = (v, x: number, z: number, sx: number, sy: number, sz: number, lift = 0) => { const m = add(mesh(sphGeo, doughMat, [x, sy*.55 + lift, z]), v.g); m.scale.set(sx, sy, sz); v.lumps.push(m); };
    const score = (v, x: number, y: number, z: number, rz: number, len: number) => { const m = add(mesh(sphGeo, scoreMat, [x, y, z], { cast: false }), v.g); m.scale.set(len, .004, .006); m.rotation.y = rz; v.scores.push(m); };
    for (const k of ['blob', 'round', 'long', 'braid']){
      const v = { g: group(g), lumps: [], scores: [] }; V[k] = v; v.g.visible = false;
      if (k === 'blob') lump(v, 0, 0, .08, .05, .068);
      if (k === 'round'){ lump(v, 0, 0, .066, .062, .066); score(v, 0, .096, 0, 0, .03); score(v, 0, .096, 0, Math.PI/2, .03); }
      if (k === 'long'){ lump(v, 0, 0, .115, .044, .05); for (const x of [-.05, 0, .05]) score(v, x, .068, 0, .9, .025); }
      if (k === 'braid'){ lump(v, -.058, 0, .046, .036, .044); lump(v, .058, 0, .046, .036, .044); lump(v, 0, 0, .05, .042, .048, .004); }
    }
    let cur = '', wasRaw: boolean | null = null;
    return { g, set(shape, raw){
      const k = shape && V[shape] ? shape : 'blob';
      if (k !== cur){ if (V[cur]) V[cur].g.visible = false; V[k].g.visible = true; cur = k; wasRaw = null; }
      if (raw !== wasRaw){ wasRaw = raw; V[k].lumps.forEach(m => { m.material = raw ? doughMat : crustMat; }); V[k].scores.forEach(m => { m.visible = !raw; }); }
    } };
  }

  /* ================= THE SHELL ================= */
  const PH = GAL.porthole, WN = GAL.window;
  const phC = new THREE.Vector2(X(PH.x), Y(PH.y)), phR = U(PH.r);
  const win = { x0: X(WN.x), x1: X(WN.x + WN.w), y0: Y(WN.y + WN.h), y1: Y(WN.y), r: U(90) };
  {
    const s = new THREE.Shape(); s.moveTo(-HW, 0); s.lineTo(HW, 0); s.lineTo(HW, H); s.lineTo(-HW, H); s.closePath();
    s.holes.push(new THREE.Path().absarc(phC.x, phC.y, phR, 0, Math.PI*2, true));
    s.holes.push(rrPath(new THREE.Path(), win.x0, win.y0, win.x1 - win.x0, win.y1 - win.y0, win.r));
    const geo = new THREE.ExtrudeGeometry(s, { depth: RM.wallT, bevelEnabled: false, curveSegments: 24 });
    const t = tileTex.t.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1/(TILE*TN), 1/(TILE*TN)); t.offset.set(.37, .12);
    add(mesh(geo, toon('#ffffff', { map: t, rim: 0, hl: 0, ramp: 'soft' }), [0, 0, BACK - RM.wallT], { cast: false }));
  }
  const shell = group(root);
  const splashY = Y(470);
  add(mesh(rbox(HW*2, splashY, .04, .01), M('wall', P.wall2, { rep: [10, 1] }), [0, splashY/2, BACK + .02], { cast: false }));
  add(mesh(rbox(HW*2, .035, .05, .012), M('metal', P.frame, { hl: .2 }), [0, splashY, BACK + .03], { cast: false }), shell);
  add(mesh(rbox(HW*2, U(22), .06, .01), M('wall', P.wall2, { rep: [10, 1] }), [0, Y(51), BACK + .03], { cast: false }), shell);
  {
    const depth = RM.front - BACK, zc = (RM.front + BACK)/2;
    const ft = floorTex.t.clone(); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(HW*2/.9, depth/.9);
    add(mesh(new THREE.PlaneGeometry(HW*2, depth), toon('#ffffff', { map: ft, rim: 0, hl: 0, ramp: 'soft' }), [0, 0, zc], { rot: [-Math.PI/2, 0, 0], cast: false })).renderOrder = -1;
    add(mesh(new THREE.PlaneGeometry(HW*2, depth), M('wall', P.ceiling, { grain: 1, rep: [6, 6] }), [0, H, zc], { rot: [Math.PI/2, 0, 0], cast: false }));
    const beamM = M('wall', P.beam, { grain: 1, rep: [8, 1] }), postM = M('metal', P.frame), sideW = M('wall', P.wall2, { rep: [8, 1] });
    for (const z of [-1.3, .1, 1.5]) add(mesh(rbox(HW*2, .08, .12, .02), beamM, [0, H - .05, z], { cast: false }), shell);
    for (const sx of [-1, 1]){
      const t = tileTex.t.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(depth/(TILE*TN), H/(TILE*TN));
      add(mesh(new THREE.PlaneGeometry(depth, H), toon('#aab4c8', { map: t, rim: 0, hl: 0, ramp: 'soft' }), [sx*HW, H/2, zc], { rot: [0, -sx*Math.PI/2, 0], cast: false }));
      add(mesh(rbox(.05, splashY, depth, .01), sideW, [sx*(HW - .025), splashY/2, zc], { cast: false }), shell);
      add(mesh(rbox(.12, H, .12, .03), postM, [sx*(HW - .06), H/2, BACK + .06], { cast: false }), shell);
    }
    bake(shell);
    /* the rug in front of the sink */
    const r = GAL.rug, rg = group(root, [X(r.x), 0, r.z]); rg.scale.set(r.rx, 1, r.rz);
    add(mesh(new THREE.CylinderGeometry(1, 1, .014, 56), M('cloth', P.rug, { grain: 1, rep: 3 }), [0, .007, 0], { cast: false }), rg);
    add(mesh(new THREE.RingGeometry(.84, .9, 56), toon(P.rugBorder, { grain: -1, side: THREE.DoubleSide, ramp: 'soft' }), [0, .0145, 0], { rot: [-Math.PI/2, 0, 0], cast: false }), rg);
  }

  /* ---- the sky behind the porthole and the tall window ---- */
  const VE = GAL.views.room.eye, SKYZ = BACK - 1.6;
  const skyTex = canvasTex(512, 384, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, P.sky0); gr.addColorStop(1, P.sky1); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.globalAlpha = .5; g.drawImage(SIND, w*.55, h*.2, w*.5, h*.6); g.globalAlpha = .35; g.drawImage(SIND, w*.15, h*.05, w*.3, h*.35);
    let s = 11; const rnd = () => (s = (s*16807) % 2147483647)/2147483647;
    for (let i = 0; i < 140; i++){ g.globalAlpha = .2 + rnd()*.4; g.fillStyle = rnd() < .15 ? '#ffd9a3' : '#e2ecf5'; g.fillRect(rnd()*w, rnd()*h, 1.2, 1.2); }
  });
  add(noRay(mesh(new THREE.PlaneGeometry(7, 4.6), new THREE.MeshBasicMaterial({ map: skyTex.t, toneMapped: false }), [1.2, 1.7, SKYZ], { cast: false, receive: false })));
  /* S.gStars, the 2D room's twinkling stars (design 880..1560 x 60..520 on
     the wall), pushed back onto the sky along the line from the main eye */
  const stars = (() => {
    const n = S.gStars.length, pos = new Float32Array(n*3), col = new Float32Array(n*3), base: THREE.Color[] = [];
    const E = new THREE.Vector3(...VE);
    S.gStars.forEach((s, i) => {
      const W = MAP.at(880 + s.x*680, 60 + s.y*460, BACK), t = (SKYZ + .05 - E.z)/(W.z - E.z), p = E.clone().lerp(W, t);
      pos.set([p.x, p.y, p.z], i*3); base.push(new THREE.Color(s.c));
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const dot = canvasTex(32, 32, (g, w) => { const rg = g.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(.4, 'rgba(255,255,255,.6)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, w); });
    const pts = add(noRay(new THREE.Points(geo, new THREE.PointsMaterial({ size: .045, map: dot.t, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true }))));
    return { pts, col, base, geo };
  })();

  /* ---- the porthole: brass ring, glass, and the fog a boil leaves ---- */
  const fog = (() => {
    const g = group(root, [phC.x, phC.y, BACK]);
    add(mesh(new THREE.TorusGeometry(U(104), U(12), 12, 48), M('brass', P.brass, { hl: .5 }), [0, 0, .015]), g);
    const bg = new THREE.SphereGeometry(.012, 8, 6), bm = M('metal', P.metal), bolts = group(g);
    for (let k = 0; k < 10; k++){ const a = k*36*D2R; add(mesh(bg, bm, [Math.cos(a)*U(104), Math.sin(a)*U(104), .05], { cast: false }), bolts); }
    bake(bolts);
    add(noRay(mesh(new THREE.CircleGeometry(phR, 40), flatMat('#9fb8d6', { opacity: .05 }), [0, 0, -.08], { cast: false, receive: false })), g);
    add(noRay(mesh(new THREE.CircleGeometry(phR, 40), flatMat('#ffffff', { map: streakTex.t, opacity: 1 }), [0, 0, -.078], { cast: false, receive: false })), g);
    const f = add(noRay(mesh(new THREE.CircleGeometry(phR, 40), flatMat(P.fog, { opacity: 0 }), [0, 0, -.075], { cast: false, receive: false })), g);
    const soft = add(glow(SFOG, phR*1.7, 0), g); soft.position.z = -.07;
    (soft.material as THREE.SpriteMaterial).blending = THREE.NormalBlending;
    return { f, soft };
  })();

  /* ---- the tall window ---- */
  {
    const o = U(18), ring = rrShape(win.x0 - o, win.y0 - o, win.x1 - win.x0 + o*2, win.y1 - win.y0 + o*2, win.r + o);
    ring.holes.push(rrPath(new THREE.Path(), win.x0, win.y0, win.x1 - win.x0, win.y1 - win.y0, win.r));
    add(mesh(new THREE.ExtrudeGeometry(ring, { depth: .05, bevelEnabled: true, bevelThickness: .02, bevelSize: .014, bevelSegments: 3, curveSegments: 18 }), M('metal', P.frame, { grain: 1, rep: 2, hl: .3 }), [0, 0, BACK + .005]));
    const pane = rrShape(win.x0, win.y0, win.x1 - win.x0, win.y1 - win.y0, win.r), pg = new THREE.ShapeGeometry(pane, 18);
    add(noRay(mesh(pg, flatMat('#9fb8d6', { opacity: .05 }), [0, 0, BACK - .09], { cast: false, receive: false })));
    /* the streak, mapped over the pane's own box */
    const sg = pg.clone(); sg.computeBoundingBox(); const b = sg.boundingBox, p = sg.attributes.position, uv = new Float32Array(p.count*2);
    for (let i = 0; i < p.count; i++){ uv[i*2] = (p.getX(i) - b.min.x)/(b.max.x - b.min.x); uv[i*2 + 1] = (p.getY(i) - b.min.y)/(b.max.y - b.min.y); }
    sg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    add(noRay(mesh(sg, flatMat('#ffffff', { map: streakTex.t, opacity: 1 }), [0, 0, BACK - .088], { cast: false, receive: false })));
    add(mesh(rbox(U(228), U(18), .14, .02), M('metal', P.metalD), [X(WN.x + WN.w/2), Y(491), BACK + .07]));
  }

  /* ================= THE COUNTER ================= */
  const OV = GAL.oven, bodyH = TOP - CT.slab, cabMat = M('wood', P.cabinet, { grain: 0, rep: [10, 4], hl: .08, rim: .5 });
  const cab = group(root);
  const bodyBox = (x0: number, x1: number, y0: number, y1: number) =>
    add(mesh(rbox(U(x1 - x0), y1 - y0, CT.depth, .012), cabMat, [X((x0 + x1)/2), (y0 + y1)/2, BACK + CT.depth/2], { cast: false }), cab);
  bodyBox(CT.body0, OV.x0, CT.toe, bodyH);
  bodyBox(OV.x1, CT.body1, CT.toe, bodyH);
  bodyBox(OV.x0, OV.x1, Y(OV.y0) - .01, bodyH);                 // the knob strip over the oven
  add(mesh(rbox(U(CT.body1 - CT.body0) - .02, CT.toe, CT.depth - .08, .01), M('wall', '#1c2538'), [X((CT.body0 + CT.body1)/2), CT.toe/2, BACK + (CT.depth - .08)/2], { cast: false }));
  add(blot(U(CT.body1 - CT.body0)*.52, .4, .55)).position.set(X((CT.body0 + CT.body1)/2), .003, CF + .12);
  {
    const dm = M('wood', P.cabinetDoor, { grain: 0, rep: [2, 3], hl: .1 }), pm = M('brass', P.brass), pg = rbox(U(36), U(8), .022, .008);
    const [dy0, dy1] = CT.doorY;
    for (const [x, w] of CT.doors){
      add(mesh(rbox(U(w), U(dy1 - dy0), .02, .012), dm, [X(x + w/2), Y((dy0 + dy1)/2), CF + .008], { cast: false }), cab);
      add(mesh(pg, pm, [X(x + w/2), Y(CT.pullY), CF + .025], { cast: false }), cab);
    }
    bake(cab);
  }
  /* the worktop, with the sink and the stove cut out of it */
  const SK = GAL.sink, ST = GAL.stove;
  {
    const zf = CF + CT.lip, s = rrShape(X(CT.x0), -zf, U(CT.x1 - CT.x0), zf - BACK, .02);
    s.holes.push(rrPath(new THREE.Path(), X(SK.x0), -(BACK + SK.z1), U(SK.x1 - SK.x0), SK.z1 - SK.z0, .03));
    s.holes.push(rrPath(new THREE.Path(), X(ST.x0), -(BACK + ST.z1), U(ST.x1 - ST.x0), ST.z1 - ST.z0, .015));
    const bt = .005, geo = new THREE.ExtrudeGeometry(s, { depth: CT.slab - bt*2, bevelEnabled: true, bevelThickness: bt, bevelSize: .004, bevelSegments: 2, curveSegments: 8 });
    geo.rotateX(-Math.PI/2);
    add(mesh(geo, M('wood', P.worktop, { grain: 0, rep: [3, 3], hl: .2, hlSize: .2, rim: .4 }), [0, TOP - CT.slab + bt, 0]));
  }
  /* the sink: a basin under a grate the kettle stands on */
  {
    const w = U(SK.x1 - SK.x0) - .004, d = SK.z1 - SK.z0 - .004, cx = X((SK.x0 + SK.x1)/2), cz = BACK + (SK.z0 + SK.z1)/2;
    add(mesh(rbox(w, SK.depth, d, .03), M('metal', P.sinkIn, { side: THREE.BackSide, hl: .3 }), [cx, TOP - SK.depth/2 - .001, cz], { cast: false }));
    add(mesh(new THREE.CircleGeometry(.02, 16), M('metal', '#151d2e'), [cx, TOP - SK.depth + .002, cz], { rot: [-Math.PI/2, 0, 0], cast: false }));
    const gm = M('metal', P.grate), bar = rbox(.012, .012, d - .02, .004), gr = group(root);
    for (let k = 0; k < 5; k++) add(mesh(bar, gm, [cx - w*.32 + k*w*.16, TOP - .006, cz], { cast: false }), gr);
    for (const dz of [-.1, .1]) add(mesh(rbox(w - .03, .01, .012, .004), gm, [cx, TOP - .011, cz + dz], { cast: false }), gr);
    bake(gr);
  }
  /* the stove plate, its burner and pan support; the flame ring */
  const burnerX = X(ST.burner);
  const flame = (() => {
    const w = U(ST.x1 - ST.x0) - .004, d = ST.z1 - ST.z0 - .004, cx = X((ST.x0 + ST.x1)/2), cz = BACK + (ST.z0 + ST.z1)/2;
    add(mesh(rbox(w, .03, d, .01), M('metal', P.metalD, { hl: .3 }), [cx, TOP - .03, cz]));
    add(mesh(new THREE.CylinderGeometry(ST.r*1.25, ST.r*1.3, .006, 32), M('metal', '#1a2234'), [burnerX, TOP - .013, KZ], { cast: false }));
    add(mesh(new THREE.CylinderGeometry(ST.r*.55, ST.r*.6, .012, 24), M('metal', '#2a3550', { hl: .4 }), [burnerX, TOP - .009, KZ], { cast: false }));
    const pm = M('metal', '#4a5a74'), pg = rbox(.06, .012, .012, .004), pr = group(root);
    for (let k = 0; k < 6; k++){ const a = k*60*D2R; add(mesh(pg, pm, [burnerX + Math.cos(a)*ST.r*.95, TOP - .006, KZ + Math.sin(a)*ST.r*.95], { rot: [0, -a, 0], cast: false }), pr); }
    bake(pr);
    const ft = canvasTex(256, 64, (g, w2, h) => {
      for (let i = 0; i < 24; i++){ const x = (i + .5)*w2/24, gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(120,170,255,1)'); gr.addColorStop(.6, 'rgba(70,120,240,.7)'); gr.addColorStop(1, 'rgba(70,120,240,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - w2/56, h); g.quadraticCurveTo(x - w2/80, h*.4, x, h*.05); g.quadraticCurveTo(x + w2/80, h*.4, x + w2/56, h); g.closePath(); g.fill(); }
    });
    const ring = add(noRay(mesh(new THREE.CylinderGeometry(ST.r*.62, ST.r*.6, .028, 32, 1, true), flatMat('#ffffff', { map: ft.t, additive: true, side: THREE.DoubleSide }), [burnerX, TOP - .002, KZ], { cast: false, receive: false })));
    const halo = add(glow(SBLUE, .5, 0)); halo.position.set(burnerX, TOP + .01, KZ + .05);
    const light = add(new THREE.PointLight(LT.flame.color, 0, LT.flame.distance, LT.flame.decay)); light.position.set(burnerX, TOP + .08, KZ + .12);
    return { ring, halo, light };
  })();
  /* knobs on the strip under the worktop */
  const KN = GAL.knobs;
  const knob = (x: number) => {
    const g = group(root, [X(x), Y(KN.y), CF]), spin = group(g);
    const body = add(mesh(new THREE.CylinderGeometry(KN.r, KN.r*1.08, .035, 28), M('ceramic', P.cream, { hl: .45 }), [0, 0, .018], { rot: [Math.PI/2, 0, 0] }), spin);
    body.castShadow = false;
    add(mesh(rbox(.008, KN.r*.75, .006, .003), M('plain', '#2a3550'), [0, KN.r*.42, .037], { cast: false }), spin);
    pad(new THREE.CircleGeometry(KN.r*1.6, 20), g, [0, 0, .045]);
    return { g, spin };
  };
  const burnerKnob = knob(KN.burner), ovenKnob = knob(KN.oven);
  pickable(burnerKnob.g, { act: 'gal:burner', label: tr('炉子') });
  pickable(ovenKnob.g, { act: 'gal:oven', label: null, key: 'gal:oven' });

  /* ---- the oven: a cavity behind a door with a window ---- */
  const ovenParts = (() => {
    const [wx, wy, ww, wh] = OV.win, x0 = X(OV.x0), x1 = X(OV.x1), y0 = Y(OV.y1), y1 = Y(OV.y0);
    const cav = add(mesh(rbox(x1 - x0 - .03, y1 - y0 - .03, OV.depth, .03), toon(P.ovenIn, { grain: 1, side: THREE.BackSide, emissive: '#ff8a3a', ei: 0, rim: 0 }), [(x0 + x1)/2, (y0 + y1)/2, CF - OV.depth/2 - .01], { cast: false }));
    const g = group(root, [0, 0, CF - .008]);
    const door = rrShape(x0, y0, x1 - x0, y1 - y0, U(14));
    door.holes.push(rrPath(new THREE.Path(), X(wx), Y(wy + wh), U(ww), U(wh), U(22)));
    add(mesh(new THREE.ExtrudeGeometry(door, { depth: .02, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 2, curveSegments: 10 }), M('metal', P.metalD, { hl: .25 })), g);
    const pane = new THREE.ShapeGeometry(rrShape(X(wx), Y(wy + wh), U(ww), U(wh), U(22)), 10);
    add(mesh(pane, toon('#1e1410', { grain: -1, transparent: true, opacity: .32, ramp: 'crisp', hl: .7, hlSize: .06, depthWrite: false }), [0, 0, .012], { cast: false, receive: false }), g);
    add(mesh(rbox(U(150), U(14), .02, .007), M('metal', P.metal, { hl: .5 }), [X(605), Y(OV.handleY + 7), .065]), g);
    for (const dx of [-60, 60]) add(mesh(rbox(.016, .016, .04, .004), M('metal', P.metal), [X(605 + dx), Y(OV.handleY + 7), .045]), g);
    /* the rack inside, and what is on it */
    const rackY = Y(wy + wh) + .03;
    const orack = group(root), om = M('metal', '#3a3330', { rim: .3, hl: .2 }), og = new THREE.CylinderGeometry(.003, .003, OV.depth - .06, 6);
    for (let k = 0; k < 4; k++) add(mesh(og, om, [X(545 + k*40), rackY - .004, CF - OV.depth/2 - .01], { rot: [Math.PI/2, 0, 0], cast: false }), orack);
    bake(orack);
    const loaf = loafSet(root, .8); loaf.g.position.set(X(605), rackY, CF - .2);
    const glowS = add(glow(SAMBER, .75, 0)); glowS.position.set(X(605), Y(714), CF + .04);
    const light = add(new THREE.PointLight(LT.oven.color, 0, LT.oven.distance, LT.oven.decay)); light.position.set(X(605), Y(714), CF + .18);
    pickable(g, { act: 'gal:oven', label: tr('烤箱'), key: 'ovenDoor' });
    return { cav, loaf, glowS, light };
  })();

  /* ================= THE TAP ================= */
  const TP = GAL.tap, tapBase = new THREE.Vector3(X(TP.x), TOP, BACK + .07);
  const tap = (() => {
    const g = group(root, [tapBase.x, tapBase.y, tapBase.z]);
    const mm = M('metal', P.metal, { hl: .6 });
    add(mesh(new THREE.CylinderGeometry(.03, .036, .03, 20), mm, [0, .015, 0]), g);
    add(mesh(tube([[0, .02, 0], [0, TP.height - .05, 0], [0, TP.height, .05], [0, TP.height - .015, TP.reach - .03], [0, TP.height - .06, TP.reach]], .012, 24, 8), mm), g);
    add(mesh(new THREE.CylinderGeometry(.016, .014, .02, 12), mm, [0, TP.height - .065, TP.reach]), g);
    const lever = group(g, [0, TP.lever.y, 0]);
    add(mesh(new THREE.CylinderGeometry(.02, .02, .03, 14), mm, [0, 0, .0], { rot: [0, 0, Math.PI/2] }), lever);
    add(mesh(rbox(.09, .022, .026, .01), M('ceramic', P.rose, { hl: .4 }), [-.055, 0, 0]), lever);
    pad(new THREE.SphereGeometry(.09, 10, 8), g, [-.02, TP.lever.y, .04]);
    pickable(g, { act: 'gal:tap', label: tr('水龙头（按住）'), anchor: new THREE.Vector3(-.03, TP.lever.y, .03), r: .08 });
    const mouth = new THREE.Vector3(tapBase.x, tapBase.y + TP.height - .075, tapBase.z + TP.reach);
    return { g, lever, mouth };
  })();
  const waterMat = flatMat('#dcecf5', { opacity: .78 });
  const tapStream = add(noRay(mesh(new THREE.CylinderGeometry(.006, .008, 1, 10, 1, true), waterMat, undefined, { cast: false, receive: false })));
  const tapSplash = add(glow(SFOG, .09, 0));

  /* ================= THE KETTLE ================= */
  const KT = GAL.kettle;
  const kettle = (() => {
    const g = group(root);
    const body = add(mesh(lathe([[0, 0], [KT.r*.92, 0], [KT.r, .012], [KT.r, .05], [KT.r*.93, .095], [KT.r*.72, .128], [KT.r*.45, KT.h], [0, KT.h]], 36), M('ceramic', P.teal, { hl: .5, grain: 1, rep: 2 })), g);
    add(mesh(new THREE.CylinderGeometry(KT.r + .002, KT.r + .002, .012, 36, 1, true), M('ceramic', '#f2e6cf', { hl: .3 }), [0, .053, 0], { cast: false }), g);
    add(mesh(new THREE.CylinderGeometry(KT.r*.5, KT.r*.52, .012, 28), M('ceramic', P.tealD), [0, KT.h + .004, 0]), g);
    add(mesh(new THREE.SphereGeometry(.016, 12, 10), M('wood', P.wood), [0, KT.h + .02, 0]), g);
    const [sx, sy] = KT.spout;
    add(mesh(tube([[.07, .045, 0], [.11, .07, 0], [.145, .11, 0], [sx, sy, 0]], .014, 16, 10), M('ceramic', P.teal, { hl: .4 })), g);
    add(mesh(new THREE.TorusGeometry(.012, .004, 6, 14), M('ceramic', P.tealD), [sx, sy, 0], { rot: [0, Math.PI/2, -.9], cast: false }), g);
    const hm = M('wood', P.woodD, { hl: .2 });
    add(mesh(new THREE.TorusGeometry(KT.handle*.72, .011, 8, 24, Math.PI), hm, [0, KT.h + .025, 0]), g);
    for (const s of [-1, 1]) add(mesh(new THREE.CylinderGeometry(.007, .007, .05, 8), M('metal', P.metalD), [s*KT.handle*.72, KT.h, 0], { rot: [0, 0, s*.5] }), g);
    /* the water window on the front, a little to the left */
    const a = Math.asin(-.45), wg = group(g, [Math.sin(a)*KT.r, .028, Math.cos(a)*KT.r]); wg.rotation.y = a;
    add(mesh(rbox(.022, .085, .006, .004), M('plain', '#1d3a44'), [0, .0425, .001], { cast: false }), wg);
    const fillGeo = new THREE.PlaneGeometry(.014, .075); fillGeo.translate(0, .0375, 0);
    const fill = add(mesh(fillGeo, flatMat(P.water), [0, .005, .0045], { cast: false, receive: false }), wg);
    const tip = new THREE.Object3D(); tip.position.set(sx + .008, sy + .004, 0); g.add(tip);
    pickable(g, { act: 'gal:kettle', label: tr('水壶'), anchor: new THREE.Vector3(0, .1, 0), r: .14 });
    void body;
    return { g, fill, tip };
  })();
  const kettleBlot = add(blot(.13, .1, .5));
  /* where the spout is at the pouring pose: the cup stands there */
  const pourTip = (() => {
    const r = KPOS.pour.r*D2R, [sx, sy] = KT.spout;
    return { x: X(KPOS.pour.x) + sx*Math.cos(r) + sy*Math.sin(r), y: Y(KPOS.pour.y) - sx*Math.sin(r) + sy*Math.cos(r) };
  })();
  const pourStream = add(noRay(mesh(new THREE.BufferGeometry(), waterMat, undefined, { cast: false, receive: false })));
  let pourSig = '';

  /* ================= THE CUP ================= */
  const cupS = GAL.cup.scale*.78, cupX = pourTip.x + .02, cupZ = KZ;
  const cup = (() => {
    const g = group(root, [cupX, TOP, cupZ]); g.scale.setScalar(cupS);
    add(blot(.11, .08, .45), g).position.y = .002;
    const prof: [number, number][] = [[0, 0], [.05, 0], [.066, .028], [.073, .1], [.066, .1], [.06, .034], [.046, .016], [0, .016]];
    add(mesh(lathe(prof, 32), M('ceramic', P.cream, { side: THREE.DoubleSide })), g);
    add(mesh(new THREE.CylinderGeometry(.0715, .0705, .012, 32, 1, true), M('ceramic', '#7fa0bb'), [0, .07, 0], { cast: false }), g);
    const handle = add(mesh(new THREE.TorusGeometry(.026, .008, 8, 18, Math.PI), M('ceramic', P.cream), [.072, .058, 0]), g);
    handle.rotation.z = -Math.PI/2;
    const teaMat = toon('#c9853f', { grain: -1, ramp: 'crisp', hl: .5 });
    const tea = add(mesh(new THREE.CircleGeometry(1, 28), teaMat, undefined, { cast: false, rot: [-Math.PI/2, 0, 0] }), g);
    const leafM = toon('#5b7a3a', { grain: -1 }), leaves = add(new THREE.Group(), g);
    for (const [x, z, r] of [[-.02, .005, .4], [.016, -.01, -.5], [.004, .014, 1.2]]){ const l = mesh(new THREE.CircleGeometry(1, 8), leafM, [x, 0, z], { cast: false, rot: [-Math.PI/2, 0, r] }); l.scale.set(.012, .004, 1); add(l, leaves); }
    const steam = [0, 1, 2].map(() => add(noRay(new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex(SFOG), transparent: true, depthWrite: false, opacity: 0, toneMapped: false }))), g));
    pad(new THREE.CylinderGeometry(.1, .1, .12, 12), g, [0, .06, 0]);
    pickable(g, { act: 'tea:cup', label: tr('茶杯'), key: 'gCup', anchor: new THREE.Vector3(0, .05, 0), r: .07 });
    function sync(){
      const t = G.tea, K = TEA[t.kind] || TEA.water, lvl = clamp(t.level, 0, 1);
      tea.visible = lvl > 0; leaves.visible = !!(t.leaves && t.kind !== 'water');
      const y = .018 + .074*(lvl > 0 ? lvl : 0), rIn = .046 + (.066 - .046)*clamp((y - .016)/.084, 0, 1);
      tea.position.y = y; tea.scale.set(rIn*.98, rIn*.98, 1); leaves.position.y = (lvl > 0 ? y : .018) + .001;
      teaMat.color.set(t.kind && t.kind !== 'water' ? mixHex('#e8dcc0', K.hex, .25 + .75*t.steep) : '#d6e6f0');
      const so = t.level > 0 ? clamp(t.temp*1.2 - .2, 0, .6) : 0;
      steam.forEach((sp, i) => { const ph = (S.T*.35 + i/3) % 1, r = .04 + ph*.1; sp.visible = so > .02;
        sp.position.set(Math.sin(S.T*1.3 + i*2)*.02, .14 + ph*.26, 0); sp.scale.set(r*2, r*2, 1); sp.material.opacity = so*.6*Math.sin(Math.PI*ph); });
    }
    return { g, sync, surface: () => new THREE.Vector3(cupX, TOP + (.018 + .074*clamp(G.tea.level, 0, 1))*cupS, cupZ) };
  })();

  /* ---- the bread rack at the left end ---- */
  const RK = GAL.rack;
  const rack = (() => {
    const g = group(root, [X((RK.x0 + RK.x1)/2), TOP, KZ]), w = U(RK.x1 - RK.x0), wm = M('metal', P.metal, { hl: .5 });
    add(blot(w*.6, .12, .4), g).position.y = .002;
    const wire = group(g);
    for (const sx of [-1, 1]) add(mesh(tube([[sx*w*.42, 0, -.09], [sx*w*.42, RK.h, -.09], [sx*w*.42, RK.h, .09], [sx*w*.42, 0, .09]], .004, 12, 6), wm), wire);
    for (let k = 0; k < 5; k++) add(mesh(new THREE.CylinderGeometry(.003, .003, w, 6), wm, [0, RK.h, -.08 + k*.04], { rot: [0, 0, Math.PI/2], cast: false }), wire);
    bake(wire);
    const loaves = [0, 1, 2].map(i => { const l = loafSet(g, .55); l.g.position.set(-w*.33 + i*w*.33, RK.h + .003, 0); return l; });
    pad(rbox(w + .02, .16, .22, .01), g, [0, .1, 0]);
    pickable(g, { act: 'bread:take', label: tr('面包架'), anchor: new THREE.Vector3(0, RK.h, 0), r: .14 });
    return { loaves };
  })();

  /* ---- the prep board and the dough ---- */
  const BD = GAL.board;
  const board = (() => {
    const g = group(root, [X((BD.x0 + BD.x1)/2), TOP, KZ]), w = U(BD.x1 - BD.x0);
    add(blot(w*.55, BD.d*.6, .45), g).position.y = .002;
    add(mesh(rbox(w, BD.h, BD.d, .01), M('wood', P.board, { rep: [2, 1], hl: .16 }), [0, BD.h/2, 0]), g);
    add(mesh(new THREE.TorusGeometry(.016, .005, 6, 14), M('wood', P.woodD), [w/2 - .03, BD.h + .002, -BD.d/2 + .05], { rot: [Math.PI/2, 0, 0], cast: false }), g);
    const dust = add(noRay(blot(.14, .1, 0)), g); dust.position.y = BD.h + .002; (dust.material as THREE.MeshBasicMaterial).color.set('#ffffff');
    const dough = group(g, [X(1005) - X((BD.x0 + BD.x1)/2), BD.h, 0]);
    const loaf = loafSet(dough, 1);
    const dots = [[-.025, .043, .02, .006], [.02, .045, -.01, .005], [0, .049, .005, .004]].map(([x, y, z, r]) => { const m = add(mesh(sphGeo, toon('#ffffff', { grain: -1, emissive: '#ffffff', ei: .3 }), [x, y, z], { cast: false }), dough); m.scale.set(r, r*.5, r); return m; });
    pad(rbox(w, .16, BD.d, .01), g, [0, .08, 0]);
    pickable(g, { act: 'gal:dough', label: tr('面板'), screen: true, anchor: new THREE.Vector3(0, .05, 0), r: .16 });
    return { g, dough, loaf, dots, dust };
  })();

  /* ---- the flour sack ---- */
  const FL = GAL.flour;
  const flourLabel = liveTex(256, 128, () => String(FONT_GEN), (c, w, h) => { c.setTransform(w/100, 0, 0, h/50, 0, 0); txtFit(c, tr('面粉'), 50, 33, 92, 26, '#7d6a50'); });
  const flourG = (() => {
    const g = group(root, [X(FL.x), TOP, KZ + .02]);
    add(blot(.17, .12, .5), g).position.y = .002;
    const body = add(mesh(lathe([[0, 0], [FL.w*.46, 0], [FL.w*.5, .03], [FL.w*.5, FL.h*.55], [FL.w*.44, FL.h*.8], [FL.w*.3, FL.h*.92], [FL.w*.16, FL.h], [0, FL.h]], 28), M('cloth', P.cream, { grain: 0, rep: 2, hl: .12 })), g);
    body.scale.z = .78;
    add(mesh(new THREE.CylinderGeometry(FL.w*.18, FL.w*.12, .05, 16), M('cloth', '#c9b38c'), [0, FL.h + .015, 0]), g);
    add(mesh(new THREE.TorusGeometry(FL.w*.15, .006, 6, 20), M('cloth', P.rose), [0, FL.h - .005, 0], { rot: [Math.PI/2, 0, 0], cast: false }), g);
    add(mesh(new THREE.PlaneGeometry(.15, .075), new THREE.MeshBasicMaterial({ map: flourLabel.t, transparent: true, toneMapped: false, depthWrite: false }), [0, FL.h*.42, FL.w*.5*.78 + .004], { cast: false, receive: false }), g);
    const spill = add(noRay(blot(.08, .05, .5)), g); spill.position.set(-.13, .003, .08); (spill.material as THREE.MeshBasicMaterial).color.set('#ffffff');
    pickable(g, { act: 'gal:flour', label: tr('面粉') });
    return g;
  })();

  /* ================= THE WALL: jars, utensils, proof box ================= */
  const SH = GAL.shelf;
  {
    const w = U(SH.x1 - SH.x0), cx = X((SH.x0 + SH.x1)/2), y = Y(SH.y);
    add(mesh(rbox(w, .045, SH.d, .012), M('wood', P.wood, { rep: [3, 1], hl: .15 }), [cx, y - .0225, BACK + SH.d/2]));
    for (const x of [140, 460]) add(mesh(rbox(.025, .08, SH.d*.8, .006), M('woodD', P.woodD), [X(x), y - .085, BACK + SH.d*.4]));
  }
  const jars = (['osm', 'mint', 'barley'] as const).map(k => {
    const T = TEA[k], base = Y(SH.y), g = group(root, [X(TEA_X[k]), base, BACK + SH.d/2]);
    add(blot(SH.jarW*.6, .07, .4), g).position.y = .002;
    const w = SH.jarW, h = SH.jarH;
    add(mesh(rbox(w*.86, h*.55, w*.72, .02), M('cloth', T.jar, { grain: 0, rep: 2, hl: .08 }), [0, h*.3, 0], { cast: false }), g);
    add(mesh(rbox(w, h*.88, w*.85, .03), M('glass', P.glass, { transparent: true, opacity: .26, depthWrite: false }), [0, h*.44, 0], { cast: false }), g);
    add(mesh(rbox(w*1.04, h*.16, w*.89, .014), M('ceramic', T.lid, { hl: .45 }), [0, h*.95, 0]), g);
    const label = liveTex(256, 112, () => String(FONT_GEN), (c, cw, chh) => {
      c.setTransform(cw/60, 0, 0, chh/26, 0, 0);
      c.fillStyle = P.paper; c.beginPath(); c.roundRect(0, 0, 60, 26, 3); c.fill();
      c.globalCompositeOperation = 'soft-light'; c.globalAlpha = .4; c.fillStyle = c.createPattern(BRUSH[0], 'repeat'); c.fillRect(0, 0, 60, 26); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      txtFit(c, tr(T.name), 30, 17, 56, T.name.length > 2 ? 11 : 14, '#2a3550');
    });
    add(mesh(new THREE.PlaneGeometry(w*.8, w*.8*26/60), toon('#ffffff', { map: label.t, grain: -1, ramp: 'soft', rim: 0, hl: 0, emissive: '#2a2a36', ei: .4 }), [0, h*.42, w*.425 + .003], { cast: false }), g);
    pickable(g, { act: 'gal:jar:' + k, label: k === 'osm' ? tr('茶叶罐') : null, key: 'jar-' + k, anchor: new THREE.Vector3(0, h*.5, 0), r: .1 });
    return { k, g, base, label };
  });

  const RL = GAL.rail;
  {
    const y = Y(RL.y), x0 = X(RL.x0), x1 = X(RL.x1);
    add(mesh(new THREE.CylinderGeometry(.008, .008, x1 - x0, 10), M('brass', P.brass), [(x0 + x1)/2, y, BACK + .06], { rot: [0, 0, Math.PI/2] }));
    for (const x of [x0 + .02, x1 - .02]) add(mesh(new THREE.CylinderGeometry(.006, .006, .06, 8), M('brass', P.brass), [x, y, BACK + .03], { rot: [Math.PI/2, 0, 0] }));
  }
  const utensils = ([[240, 'ladle'], [344, 'spat'], [480, 'whisk']] as const).map(([x, kind], i) => {
    const g = group(root, [X(x), Y(RL.y), BACK + .06]), L = RL.len, mm = M('metal', P.metal, { hl: .5 });
    add(mesh(new THREE.TorusGeometry(.012, .003, 6, 12), mm, [0, -.006, 0], { cast: false }), g);
    add(mesh(new THREE.CylinderGeometry(.005, .005, L*.72, 8), mm, [0, -.018 - L*.36, 0]), g);
    if (kind === 'ladle'){ add(mesh(new THREE.SphereGeometry(.045, 18, 10, 0, Math.PI*2, Math.PI/2, Math.PI/2), M('metal', P.copper, { side: THREE.DoubleSide, hl: .6 }), [0, -L*.75, 0]), g); }
    if (kind === 'spat') add(mesh(rbox(.07, .09, .012, .01), M('wood', P.wood), [0, -L*.78, 0]), g);
    if (kind === 'whisk'){ const wg = new THREE.TorusGeometry(.04, .002, 4, 20), wk = group(g); for (let k = 0; k < 4; k++){ const m = add(mesh(wg, mm, [0, -L*.78, 0], { cast: false }), wk); m.scale.set(.5, 1.25, 1); m.rotation.y = k*Math.PI/4; } bake(wk); }
    pad(new THREE.BoxGeometry(.11, L + .02, .08), g, [0, -L/2, 0]);
    pickable(g, { act: 'gal:ut:' + i, label: i === 0 ? tr('挂着的厨具') : null, key: 'ut' + i, anchor: new THREE.Vector3(0, -L*.6, 0), r: .08 });
    return g;
  });

  const PF = GAL.proof;
  const proof = (() => {
    const x0 = X(PF.x), x1 = X(PF.x + PF.w), y0 = Y(PF.y + PF.h), y1 = Y(PF.y), [wx, wy, ww, wh] = PF.win;
    const g = group(root, [0, 0, BACK]);
    add(blot((x1 - x0)*.55, .1, .4), g).position.set((x0 + x1)/2, y0 - .015 - .002, .14);
    const s = rrShape(x0, y0, x1 - x0, y1 - y0, U(14));
    s.holes.push(rrPath(new THREE.Path(), X(wx), Y(wy + wh), U(ww), U(wh), U(10)));
    add(mesh(new THREE.ExtrudeGeometry(s, { depth: PF.depth - .02, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 2, curveSegments: 8 }), M('ceramic', P.cream, { hl: .4 })), g);
    const warm = canvasTex(256, 192, (c, w, h) => { const rg = c.createRadialGradient(w/2, h*.7, 6, w/2, h*.7, w*.6); rg.addColorStop(0, '#ffb066'); rg.addColorStop(1, '#6a3420'); c.fillStyle = rg; c.fillRect(0, 0, w, h); });
    add(mesh(new THREE.PlaneGeometry(U(ww), U(wh)), toon('#ffffff', { map: warm.t, grain: -1, emissive: '#ff9a50', ei: .12, rim: 0, hl: 0, ramp: 'soft' }), [X(wx + ww/2), Y(wy + wh/2), .012], { cast: false }), g);
    add(mesh(new THREE.ShapeGeometry(rrShape(X(wx), Y(wy + wh), U(ww), U(wh), U(10)), 8), toon('#2a2420', { grain: -1, transparent: true, opacity: .16, ramp: 'crisp', hl: .8, hlSize: .06, depthWrite: false }), [0, 0, PF.depth - .006], { cast: false, receive: false }), g);
    /* the warmth indicator: a slot and a rose bar that stands taller when the galley is warm */
    add(mesh(rbox(U(14), U(50), .008, .004), M('metal', P.metal), [X(1091), Y(325), .02], { cast: false }), g);
    const barGeo = rbox(U(6), 1, .006, .002); barGeo.translate(0, .5, 0);
    const bar = add(mesh(barGeo, toon(P.rose, { grain: -1, emissive: P.rose, ei: .3 }), [X(1091), Y(346), .026], { cast: false }), g);
    add(mesh(new THREE.SphereGeometry(.012, 10, 8), M('metal', P.metal), [x1 - .04, (y0 + y1)/2 + .05, PF.depth + .008]), g);
    const dough = group(g, [X(1034), Y(386) + .004, PF.depth*.45]);
    const loaf = loafSet(dough, 1);
    const halo = add(glow(SAMBER, U(180), .14), g); halo.position.set(X(1040), Y(342), PF.depth + .02);
    const light = add(new THREE.PointLight(LT.proof.color, LT.proof.intensity, LT.proof.distance, LT.proof.decay), g); light.position.set(X(1040), Y(342), PF.depth + .15);
    pickable(g, { act: 'gal:proof', label: tr('发酵箱'), anchor: new THREE.Vector3((x0 + x1)/2, (y0 + y1)/2, PF.depth/2), r: .2 });
    return { bar, dough, loaf };
  })();

  /* ================= THE WINDOW TABLE AND THE PEARS ================= */
  const TB = GAL.table;
  const pears = (() => {
    const tt = Y(TB.top), g = group(root, [X(TB.x), 0, TB.z]), wm = M('woodD', P.woodD);
    add(blot(TB.r*1.1, TB.r*.8, .5), g).position.y = .003;
    add(mesh(new THREE.CylinderGeometry(TB.r*.45, TB.r*.5, .025, 24), wm, [0, .0125, 0]), g);
    add(mesh(new THREE.CylinderGeometry(.025, .03, tt - .05, 12), wm, [0, (tt - .05)/2 + .02, 0]), g);
    add(mesh(new THREE.CylinderGeometry(TB.r, TB.r*.97, .03, 36), M('wood', P.wood, { hl: .2 }), [0, tt - .015, 0]), g);
    const dish = group(g, [-.02, tt, .02]);
    add(blot(.15, .1, .4), dish).position.y = .001;
    add(mesh(lathe([[0, 0], [.07, 0], [.12, .02], [.14, .032], [.135, .034], [.1, .02], [0, .012]], 32), M('ceramic', P.cream, { side: THREE.DoubleSide, hl: .4 })), dish);
    const pg = lathe([[0, 0], [.02, .002], [.034, .016], [.037, .032], [.03, .05], [.019, .064], [.014, .078], [.006, .088], [0, .09]], 20);
    const pm = M('ceramic', P.pear, { grain: 1, hl: .35, hlSize: .2, rim: .9 }), cutM = toon(P.pearCut, { grain: -1 }), stemM = toon('#5c4632', { grain: -1 }), leafM = M('leaf', P.leaf);
    const SPOTS = [[-.055, .0, .0], [.0, -.035, .3], [.055, .005, -.4], [-.02, .05, 1], [.035, .05, 2]] as const;
    const list = SPOTS.map(([x, z, ry]) => {
      const p = group(dish, [x, .012, z]); p.rotation.y = ry;
      add(mesh(pg, pm), p);
      add(mesh(new THREE.CylinderGeometry(.002, .003, .022, 6), stemM, [.002, .097, 0], { rot: [0, 0, -.25], cast: false }), p);
      const lf = add(mesh(sphGeo, leafM, [.012, .1, 0], { cast: false }), p); lf.scale.set(.012, .003, .006); lf.rotation.z = .4;
      const bites = [[.026, .036, .022], [.03, .022, .01]].map(([bx, by, bz]) => { const m = add(mesh(sphGeo, cutM, [bx, by, bz], { cast: false }), p); m.scale.set(.012, .013, .012); m.visible = false; return m; });
      return { p, bites };
    });
    list[0].p.rotation.y = -.5;
    pad(new THREE.CylinderGeometry(.16, .16, .12, 16), dish, [0, .06, 0]);
    pickable(dish, { act: 'gal:pear', label: tr('星梨'), anchor: new THREE.Vector3(0, .05, 0), r: .13 });
    return list;
  })();

  /* ================= THE LAMP, THE HERBS ================= */
  const LP = GAL.lamp;
  const lamp = (() => {
    const shadeY = Y(LP.shadeY), g = group(root, [X(LP.x), 0, LP.z]);
    add(mesh(new THREE.CylinderGeometry(.04, .05, .02, 16), M('metal', P.metalD), [0, H - .01, 0], { cast: false }), g);
    add(mesh(new THREE.CylinderGeometry(.004, .004, H - shadeY - .1, 6), toon('#1c2742', { grain: -1 }), [0, (H + shadeY + .1)/2, 0], { cast: false }), g);
    const prof: [number, number][] = [[.16, 0], [.155, .01], [.14, .04], [.11, .08], [.07, .11], [.03, .125], [.015, .13]];
    add(mesh(lathe(prof, 36), M('metal', P.copper, { hl: .6, grain: 1, rep: [3, 1], emissive: '#5a2a14', ei: .55 }), [0, shadeY, 0]), g);
    add(mesh(lathe(prof, 36), toon('#fff1d6', { grain: -1, side: THREE.BackSide, emissive: '#ffcf8f', ei: 1 }), [0, shadeY, 0], { cast: false }), g);
    add(mesh(new THREE.CylinderGeometry(.02, .02, .03, 12), M('brass', P.brass), [0, shadeY + .135, 0], { cast: false }), g);
    add(mesh(new THREE.SphereGeometry(.045, 16, 12), toon('#fff6dc', { grain: -1, emissive: '#ffe2b0', ei: 1.1 }), [0, shadeY + .02, 0], { cast: false }), g);
    const spot = add(new THREE.SpotLight(LT.lamp.color, LT.lamp.spot, LT.lamp.distance, LT.lamp.angle, LT.lamp.penumbra, LT.lamp.decay), g);
    spot.position.set(0, shadeY, 0);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0006; spot.shadow.normalBias = .02; spot.shadow.radius = LT.lamp.shadowRadius;
    spot.shadow.camera.near = .1; spot.shadow.camera.far = 5;
    root.add(spot.target); spot.target.position.set(X(LP.x) - .1, TOP - .2, KZ - .25);
    const point = add(new THREE.PointLight(LT.lamp.color, LT.lamp.point, 4, 1.7), g); point.position.set(0, shadeY - .05, 0);
    add(glow(SWARM, 1.6, .4), g).position.set(0, shadeY - .02, 0);
    add(glow(SWARM, .3, .85), g).position.set(0, shadeY + .01, 0);
    return noRay(g);
  })();
  void lamp;
  {
    const hb = GAL.herbs, g = group(root, [X(hb.x), H, hb.z]);
    add(mesh(new THREE.CylinderGeometry(.003, .003, .28, 5), toon('#4a3a2c', { grain: -1 }), [0, -.14, 0], { cast: false }), g);
    const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.quadraticCurveTo(.4, .5, 0, 1); ls.quadraticCurveTo(-.4, .5, 0, 0);
    const lg = new THREE.ShapeGeometry(ls, 8), m1 = M('leaf', P.leaf), m2 = M('leaf', P.leafD);
    for (let k = 0; k < 9; k++){ const a = -.7 + k*.175, l = add(mesh(lg, k % 2 ? m1 : m2, [0, -.27, 0], { cast: false }), g); l.scale.set(.09, .26, .09); l.rotation.set(0, k*.6, Math.PI + a, 'YXZ'); }
    add(mesh(rbox(.06, .03, .06, .012), M('cloth', P.rose), [0, -.27, 0]), g);
    bake(g); noRay(g);
  }

  /* ================= LIGHT ================= */
  add(new THREE.HemisphereLight(LT.hemiSky, LT.hemiGround, LT.hemi), scene);
  const winLight = add(new THREE.PointLight(LT.window.color, LT.window.intensity, LT.window.distance, LT.window.decay)); winLight.position.set(X(1430), Y(360), BACK + .65);
  const moon = add(new THREE.DirectionalLight(LT.moon.color, LT.moon.intensity), scene);
  moon.position.set(X(1430), 2.6, BACK - 2); moon.target.position.set(X(1200), .4, 0); scene.add(moon.target);

  /* ================= PER FRAME ================= */
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  const stretch = (m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) => {
    dir.subVectors(b, a); const len = dir.length(); m.position.copy(a).add(b).multiplyScalar(.5);
    m.scale.set(1, Math.max(.001, len), 1); m.quaternion.setFromUnitVectors(up, dir.normalize());
  };
  const knobA = { burner: 0, oven: 0 };
  function sync(dt: number){
    const k = G.kettle, d = G.dough, red = !!G.reduced;
    /* the kettle, wherever rooms/galley.ts has put it */
    const jit = S.heating && k.hot > .75 && !red ? (Math.random()*2 - 1) : 0;
    kettle.g.position.copy(MAP.at(S.kp.x + jit, S.kp.y, KZ));
    kettle.g.rotation.z = -S.kp.r*D2R;
    kettle.fill.scale.y = Math.max(.001, Math.min(1, k.water));
    kettle.fill.visible = k.water > .02;
    const lift = Math.max(0, kettle.g.position.y - TOP);
    kettleBlot.position.set(kettle.g.position.x, TOP + .002, KZ); (kettleBlot.material as THREE.MeshBasicMaterial).opacity = .5*Math.max(0, 1 - lift*4);
    /* the tap and its water */
    tap.lever.rotation.z = S.tapOn ? .5 : 0;
    tapStream.visible = !!S.tapOn;
    if (S.tapOn){
      const atSink = k.pos === 'sink' && !S.kMove;
      v1.copy(tap.mouth); v2.set(tap.mouth.x, atSink ? kettle.g.position.y + KT.h + .012 : TOP - GAL.sink.depth + .01, tap.mouth.z);
      stretch(tapStream, v1, v2); tapSplash.position.copy(v2).y += .01; tapSplash.material.opacity = .5;
    }
    tapSplash.visible = !!S.tapOn;
    /* the pour: spout to the tea in the cup */
    const flow = !!(S.pour && S.pour.flow);
    pourStream.visible = flow;
    if (flow){
      kettle.g.updateMatrixWorld(true); kettle.tip.getWorldPosition(v1); v2.copy(cup.surface());
      const sig = [v1.x, v1.y, v2.y].map(n => Math.round(n*400)).join(',');
      if (sig !== pourSig){
        pourSig = sig;
        const mid = new THREE.Vector3((v1.x*.35 + v2.x*.65) + .01, v1.y + .01, (v1.z + v2.z)/2);
        pourStream.geometry.dispose();
        pourStream.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(v1.clone(), mid, v2.clone()), 14, .006, 8);
      }
    }
    /* the burner */
    const fl = S.flameOn ? 1 : 0;
    flame.ring.visible = !!S.flameOn;
    if (S.flameOn) flame.ring.scale.y = .8 + .25*Math.sin(S.T*20) + .1*Math.sin(S.T*33);
    flame.light.intensity = LT.flame.intensity*fl*(.9 + .1*Math.sin(S.T*17));
    flame.halo.material.opacity = .45*fl; flame.halo.visible = fl > 0;
    knobA.burner += ((S.flameOn ? Math.PI/2 : 0) - knobA.burner)*Math.min(1, dt*12);
    knobA.oven += ((d.st === 'baking' ? -Math.PI*.66 : 0) - knobA.oven)*Math.min(1, dt*12);
    burnerKnob.spin.rotation.z = knobA.burner; ovenKnob.spin.rotation.z = knobA.oven;
    /* the oven */
    const inOven = d.st === 'inOven' || d.st === 'baking', baking = d.st === 'baking', gl = baking ? .55 + .1*Math.sin(S.T*3) : 0;
    ovenParts.loaf.g.visible = inOven; if (inOven) ovenParts.loaf.set(d.shape, d.st === 'inOven');
    (ovenParts.cav.material as THREE.MeshToonMaterial).emissiveIntensity = gl*.9;
    ovenParts.glowS.material.opacity = gl*.8; ovenParts.glowS.visible = gl > 0; ovenParts.light.intensity = LT.oven.intensity*gl/.6;
    /* the proof box */
    const proofing = d.st === 'proofing' || d.st === 'proofed';
    proof.dough.visible = proofing;
    if (proofing){ proof.loaf.set(d.shape, true); proof.dough.scale.setScalar(.7 + .32*Math.min(1.15, d.proof)); }
    proof.bar.scale.y = U(galleyWarm() ? 42 : 24);
    /* the dough on the board */
    const onBoard = d.st === 'raw' || d.st === 'kneaded' || d.st === 'shaped', q = S.doughSquash || 0;
    board.dough.visible = onBoard;
    if (onBoard){
      board.loaf.set(d.st === 'shaped' ? d.shape : null, true);
      board.dough.position.x = X(1005) - X((GAL.board.x0 + GAL.board.x1)/2) + U(q*16);
      board.dough.scale.set(1 + Math.abs(q)*.28, 1 - Math.abs(q)*.16, 1 + Math.abs(q)*.1);
    }
    board.dots.forEach(m => { m.visible = d.st === 'raw'; });
    (board.dust.material as THREE.MeshBasicMaterial).opacity = d.st === 'none' ? 0 : .35;
    /* the jars, the utensils */
    jars.forEach(j => { j.g.position.y = j.base + U(8)*Math.sin(Math.PI*((S.jarBob && S.jarBob[j.k]) || 0)); j.label.tick(); });
    utensils.forEach((g, i) => { g.rotation.z = -((S.ut && S.ut[i]) ? S.ut[i].a : 0)*D2R; });
    /* the rack */
    rack.loaves.forEach((l, i) => { const b = G.breads[i]; l.g.visible = !!b; if (b){ l.set(b.shape || 'round', false); l.g.rotation.y = b.shape === 'long' ? Math.PI/2 : 0; } });
    cup.sync();
    /* pears and bites */
    pears.forEach((p, i) => { p.p.visible = i < G.pears; p.bites[0].visible = i === 0 && G.bite >= 1; p.bites[1].visible = i === 0 && G.bite >= 2; });
    /* the porthole fogs after a boil */
    const fg = S.gFog || 0;
    (fog.f.material as THREE.MeshBasicMaterial).opacity = fg*.75; fog.f.visible = fg > .01;
    fog.soft.material.opacity = fg*.5; fog.soft.visible = fg > .01;
    /* twinkling */
    const c = stars.col;
    S.gStars.forEach((s, i) => { const a = (.6 + .4*Math.sin(S.T + s.ph))*.9, b = stars.base[i]; c[i*3] = b.r*a; c[i*3 + 1] = b.g*a; c[i*3 + 2] = b.b*a; });
    stars.geo.attributes.color.needsUpdate = true;
    flourLabel.tick();
  }

  /* One shadow, from the lamp: only the things standing on the worktop and
     hanging on the wall cast into it; the room's shell and the small fittings
     only receive. */
  root.traverse(o => { o.castShadow = false; });
  [kettle.g, cup.g, tap.g, flourG, board.g, ...jars.map(j => j.g), ...utensils, ...rack.loaves.map(l => l.g)].forEach(c => c.traverse(o => {
    const m = o as THREE.Mesh; if (m.isMesh && !Array.isArray(m.material) && m.material.visible && !m.material.transparent) m.castShadow = true;
  }));

  const views: View[] = [
    { id: 'room', label: tr('小厨房'), ...GAL.views.room },
    { id: 'stove', label: tr('水槽和炉子'), ...GAL.views.stove },
    { id: 'board', label: tr('面板'), ...GAL.views.board }
  ];
  return {
    scene, views, sync,
    /* steam off the kettle and flour off the sack are design points at k=1:
       they sit on the line things stand on; anything else lands just off the wall */
    fxAt(k, x, y){
      if (Math.abs(k - 1) < .05) return [MAP.at(x, y, KZ + .04), 1/GAL.map.unit];
      return [MAP.at(x, y, BACK + .25), 1/GAL.map.unit];
    }
  };
}

register3D({ id: 'galley', build });
