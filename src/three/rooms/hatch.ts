import * as THREE from 'three';
import { tr, isEN } from '../../i18n';
import { MAT } from '../../core/materials';
import { BRUSH, SOFT, SWARM, rr, txt, txtFit, vol } from '../../core/paint';
import { K_WL } from '../../core/depth';
import { mixHex } from '../../core/util';
import { PORTS } from '../../data/ports';
import { DOOR, STAND, callPort, docked, gave, handView } from '../../rooms/hatch';
import { ROUTE_SKY } from '../../rooms/cabin';
import { OUT } from '../../rooms/outside';
import { S } from '../../state/runtime';
import { G } from '../../state/store';
import { HAT } from '../config/hatch';
import { FONT_GEN, designMap, pickable, register3D, type Built } from '../engine';
import { M, add as addTo, blot, canvasTex, flatMat, glow, group, lathe, liveTex, mesh, noRay, rbox, rrPath, rrShape, slab, spriteTex, toon } from '../kit';
import { mulberry32 } from '../../core/util';
import { porthole, rig3d, slipOnWall } from '../props';
import type { View } from '../view';
import { buildPort, type Port3D } from './hatch-port';
import { buildVisitor, type Visitor3D } from './hatch-visitor';

/* ================= THE GANGWAY, IN THREE.JS =================
   rooms/hatch.ts still opens the door, hands the lamp over and casts off:
   its enter/exit/update and ACT['hat:*'] run unchanged, and the context pills
   (hatCtx/setCtx) are still DOM. This file draws the bay and says where a
   pointer lands. No handler here takes a point, so every pickable is a plain
   tap; the wall is laid out from the 2D numbers through MAP all the same.

   What the 2D room did, and where it is here:
     hat:door   tap, on the closed door (doorK < .5); label 开舷门 when docked,
                舷门 when not ............................... the two leaves
     hat:give   tap on the visitor, label tr(P.who), key 'visitor', only while
                the door is open (doorK > .01) ................. the visitor
     hat:rig    tap on the stand and the space above it; label 那盏灯 with a
                piece on it, 架子 without ...................... the stand
     ui:work    tap the work slip ............................. slipOnWall
     context pills (关上舷门 / 把灯递过去), captions on enter  ... unchanged (DOM)
     Tab / Enter on each of the above ......................... HITS, from the engine
   Painted state:
     the leaves sliding apart with S.doorK; the handle flat under way and
     upright when docked(); three lamps over the door -- amber: docked and not
     yet given; rose: under way; green: given; the lamp over the door and its
     pool; the sign (舷梯 + GANGWAY, or the hull number in English); the
     port per P.id, veiled while the door is still nearly shut; the visitor
     (breath, lean, sway, tilt, blink, lights) and the lamp raised over its
     head as S.holdK rises, with its light; the dock railing that light finds;
     the rig on the stand following G.rig and its light when lit; the dust
     motes in the doorway (S.hatMotes, advanced by update()); FX and puffs. */

const RM = HAT.room, PAL = HAT.palette, LT = HAT.light, CL = HAT.collar;
const HW = RM.halfW, H = RM.h, BACK = RM.back, WT = RM.wallT;
const MAP = designMap(HAT.map.unit, HAT.map.x0, HAT.map.y0, BACK);
const U = MAP.U, PZ0 = BACK - WT;               // the outer face of the hull

function build(): Built {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#060b16');
  const root = new THREE.Group(); scene.add(root);
  const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = root): T => addTo(o, parent);
  const DX0 = MAP.X(DOOR.x0), DX1 = MAP.X(DOOR.x1), DY0 = MAP.Y(DOOR.y1), DY1 = MAP.Y(DOOR.y0);

  /* ================= THE HULL =================
     The back wall is the 2D wall art -- the gradient and the seven bulkhead
     panels, painted with vol() -- on a plate extruded WT thick with the door
     cut through it, so the leaves can slide into the plating and the far side
     is really behind it. */
  const wallTex = canvasTex(1700, Math.round(1700*H/(HW*2)), (g, w) => {
    const k = w*U(1)/(HW*2), x0 = MAP.dx(-HW), y0 = MAP.dy(H);
    g.setTransform(k, 0, 0, k, -x0*k, -y0*k);
    const wg = g.createLinearGradient(0, y0, 0, HAT.map.y0); wg.addColorStop(0, PAL.wallTop); wg.addColorStop(.5, PAL.wallMid); wg.addColorStop(1, PAL.wallBot);
    g.fillStyle = wg; g.fillRect(x0, y0, HW*2/U(1), H/U(1));
    const n = 7, X0 = -140, X1 = 1740, pw = (X1 - X0 - 28)/n;
    for (let i = 0; i < n; i++){ const px = X0 + 14 + i*pw; vol(g, cc => rr(cc, px, 90, pw - 12, 600, 10), MAT.wall, { k: 2.5, s: 6, r: 1.5, tex: .5 }); }
    for (const px of [-260, 1860]) vol(g, cc => rr(cc, px, 90, pw - 12, 600, 10), MAT.wall, { k: 2.5, s: 6, r: 1.5, tex: .5 });
  });
  {
    const shape = rrShape(-HW, 0, HW*2, H, .001);
    shape.holes.push(rrPath(new THREE.Path(), DX0, DY0, DX1 - DX0, DY1 - DY0, U(26)));
    /* the porthole to the right of the door goes right through */
    shape.holes.push(new THREE.Path().absarc(MAP.X(HAT.porthole.x), MAP.Y(HAT.porthole.y), U(HAT.porthole.r), 0, Math.PI*2, true));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: WT, bevelEnabled: false, curveSegments: 14 });
    const t = wallTex.t; t.repeat.set(1/(HW*2), 1/H); t.offset.set(.5, 0);
    add(mesh(geo, [toon('#ffffff', { map: t, rim: 0, hl: 0, ramp: 'soft' }), M('metal', PAL.metalDD, { grain: 1, hl: .2 })], [0, 0, PZ0], { cast: false }));
  }
  /* the collar: a heavy ring bolted into the hull round the door */
  {
    const b = U(CL.band), ring = rrShape(DX0 - b, DY0 - b, DX1 - DX0 + b*2, DY1 - DY0 + b*2, U(CL.r));
    ring.holes.push(rrPath(new THREE.Path(), DX0, DY0, DX1 - DX0, DY1 - DY0, U(26)));
    const geo = new THREE.ExtrudeGeometry(ring, { depth: CL.depth, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: 3, curveSegments: 16 });
    add(mesh(geo, [M('metal', PAL.metalD, { grain: 1, rep: 1.5, hl: .35, hlSize: .12 }), M('metal', PAL.metalDD, { grain: 1, hl: .2 })], [0, 0, BACK]));
    /* 22 bolts, evenly round the middle of the band */
    const m = b/2, ex = DX0 - m, ey = DY0 - m, ew = DX1 - DX0 + m*2, eh = DY1 - DY0 + m*2, cr = U((26 + CL.r)/2);
    const path = rrPath(new THREE.Path(), ex, ey, ew, eh, cr);
    const bolts = new THREE.InstancedMesh(new THREE.SphereGeometry(CL.boltR, 12, 8), M('metal', PAL.metal, { hl: .6 }), CL.bolts);
    const o = new THREE.Object3D();
    for (let k = 0; k < CL.bolts; k++){
      const p = path.getPointAt((k + .5)/CL.bolts); o.position.set(p.x, p.y, BACK + CL.depth + .02); o.scale.set(1, 1, .6); o.updateMatrix(); bolts.setMatrixAt(k, o.matrix);
    }
    bolts.castShadow = false; bolts.receiveShadow = true; add(bolts);
  }
  /* the sill: a raised plate under the door, its front edge painted yellow */
  {
    const w = U(520), sd = HAT.sill.d;
    add(mesh(rbox(w, HAT.sill.h, sd, .015), M('metal', PAL.metalD, { grain: 1, rep: [3, 1], hl: .3 }), [0, HAT.sill.h/2, BACK + sd/2 - .02]));
    add(mesh(rbox(w - .02, .012, .05, .005), M('plain', PAL.sill, { hl: .1 }), [0, HAT.sill.h + .001, BACK + sd - .05], { cast: false }));
    add(mesh(rbox(DX1 - DX0, HAT.sill.h, WT, .01), M('metal', PAL.metalDD), [0, HAT.sill.h/2 - .002, BACK - WT/2], { cast: false }));
  }

  /* floor: deck plates, the worn band the gangway crew stands on, hazard dashes */
  {
    const depth = RM.front - BACK, zc = (RM.front + BACK)/2, px = 1024/(HW*2);
    const floor = canvasTex(1024, Math.round(depth*px), (g, w, h) => {
      const Z = (z: number) => (z - BACK)*px, X = (x: number) => (x + HW)*px;
      const gr = g.createLinearGradient(0, 0, 0, Z(BACK + 5));
      gr.addColorStop(0, PAL.floor); gr.addColorStop(.3, PAL.floorMid); gr.addColorStop(1, PAL.floorNear);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = PAL.floorSeam; g.globalAlpha = .6;
      for (let x = -HW; x <= HW; x += .82) g.fillRect(X(x) - 1, 0, 2, h);
      for (let z = BACK + 1.15; z < RM.front; z += 1.15) g.fillRect(0, Z(z) - 1, w, 2);
      g.globalAlpha = .35; g.fillStyle = '#5c6e94';
      for (let x = -HW; x <= HW; x += .82) for (let z = BACK; z < RM.front; z += 1.15) for (const [ox, oz] of [[.06, .06], [.76, .06], [.06, 1.09], [.76, 1.09]]){ g.beginPath(); g.arc(X(x + ox), Z(z + oz), 1.6, 0, Math.PI*2); g.fill(); }
      g.globalAlpha = .55; g.fillStyle = PAL.worn; g.beginPath(); g.roundRect(X(-1.22), Z(BACK) - 20, X(1.22) - X(-1.22), Z(BACK + 1.7) - Z(BACK) + 20, 22); g.fill();
      g.globalAlpha = .4; g.fillStyle = PAL.worn; g.fillRect(0, Z(BACK + 2.6), w, 4);
      g.globalAlpha = .26; g.fillStyle = PAL.sill;
      for (let i = 0; i < 9; i++){ g.beginPath(); g.roundRect(X(U(556 + i*56 - 800)), Z(BACK + .42), U(30)*px, .045*px, 4); g.fill(); }
      g.globalAlpha = .35; g.globalCompositeOperation = 'soft-light'; g.fillStyle = g.createPattern(BRUSH[1], 'repeat'); g.fillRect(0, 0, w, h);
    });
    add(mesh(new THREE.PlaneGeometry(HW*2, depth), toon('#ffffff', { map: floor.t, rim: 0, hl: 0, ramp: 'soft' }), [0, 0, zc], { rot: [-Math.PI/2, 0, 0], cast: false })).renderOrder = -1;
    add(mesh(new THREE.PlaneGeometry(HW*2, depth), M('wall', PAL.ceiling, { grain: 1, rep: [6, 6] }), [0, H, zc], { rot: [Math.PI/2, 0, 0], cast: false }));
    for (const z of [-1.3, .4, 2.1]) add(mesh(rbox(HW*2, .1, .14, .02), M('metal', PAL.beam, { grain: 1, rep: [8, 1], hl: .1 }), [0, H - .06, z], { cast: false }));
    for (const sx of [-1, 1]){
      add(mesh(new THREE.PlaneGeometry(depth, H), M('wall', PAL.side, { grain: 2, rep: [6, 2] }), [sx*HW, H/2, zc], { rot: [0, -sx*Math.PI/2, 0], cast: false }));
      add(mesh(rbox(.14, H, .14, .03), M('metal', PAL.metalD), [sx*(HW - .07), H/2, BACK + .07], { cast: false }));
    }
    /* a pipe run along the top of the hull, on brackets */
    add(mesh(new THREE.CylinderGeometry(.045, .045, HW*2, 14), M('metal', PAL.metalD, { hl: .4 }), [0, H - .26, BACK + .14], { rot: [0, 0, Math.PI/2] }));
    for (let x = -3.6; x <= 3.6; x += 1.2) add(mesh(rbox(.05, .12, .16, .01), M('metal', PAL.metalDD), [x, H - .23, BACK + .08], { cast: false }));
  }

  /* ================= THE DOOR =================
     Two leaves, each a rounded slab, riding inside the plating; they slide
     apart into it with S.doorK, as the 2D leaves slid into the collar. */
  const half = (DOOR.x1 - DOOR.x0)/2, LF = HAT.leaf, LZ = BACK + LF.z;
  const leafM = M('metal', mixHex(PAL.metal, PAL.metalD, .5), { grain: 0, rep: [1, 2], hl: .3, hlSize: .14 });
  const dogM = M('metal', PAL.dogs, { hl: .2 });
  const doorG = group(root);
  const leaves = [-1, 1].map(side => {
    const g = group(doorG), x0 = side < 0 ? DX0 : 0, w = U(half);
    add(mesh(slab(rrShape(x0, DY0, w, DY1 - DY0, U(24)), LF.t - .024, .012, 12), leafM, [0, 0, LZ - LF.t/2 + .012]), g);
    for (let k = 0; k < 4; k++){
      const y = MAP.Y(DOOR.y0 + 70 + k*110 + 5), xc = x0 + w/2;
      add(mesh(rbox(w - U(48), U(10), .02, .004), dogM, [xc, y, LZ + LF.t/2 + .008]), g);
    }
    /* the seam where the leaves meet */
    add(mesh(rbox(.012, DY1 - DY0 - U(30), .01, .003), flatMat('#18233a'), [side*.006, (DY0 + DY1)/2, LZ + LF.t/2 + .004], { cast: false }), g);
    return g;
  });
  /* the handle: flat across the dogs under way, upright when it can turn */
  const handle = group(leaves[1], [MAP.X(LF.handle.x), MAP.Y(LF.handle.y), LZ + LF.t/2 + .01]);
  {
    const bm = M('brass', PAL.brass);
    add(mesh(new THREE.CylinderGeometry(U(15), U(17), .03, 20), M('metal', PAL.metalD), [0, 0, .006], { rot: [Math.PI/2, 0, 0] }), handle);
    add(mesh(rbox(U(22), U(108), .026, U(10)), bm, [0, U(2), .035]), handle);
    add(mesh(new THREE.SphereGeometry(U(16), 16, 12), bm, [0, U(34), .05]), handle).scale.z = .7;
  }
  pickable(doorG, { act: 'hat:door', label: () => docked() ? tr('开舷门') : tr('舷门'), on: () => S.doorK < .5,
    anchor: new THREE.Vector3(0, (DY0 + DY1)/2, LZ), r: .55 });

  /* the three lamps over the door, and their housing */
  const lampsDef = HAT.lamps, [bx, by, bw, bh] = lampsDef.box, LAMPZ = BACK + CL.depth + .045;
  add(mesh(rbox(U(bw), U(bh), .06, U(10)), M('metal', PAL.metalD, { hl: .3 }), [MAP.X(bx + bw/2), MAP.Y(by + bh/2), LAMPZ - .01]));
  const ind = lampsDef.x.map((x, i) => {
    const on = [PAL.lampAmber, PAL.lampRose, PAL.lampGreen][i];
    const mat = toon(PAL.lampOff, { grain: -1, emissive: on, ei: 0, ramp: 'crisp', hl: .7, hlSize: .1 });
    const m = add(mesh(new THREE.SphereGeometry(U(lampsDef.r), 16, 12), mat, [MAP.X(x), MAP.Y(lampsDef.y), LAMPZ + .02], { cast: false }));
    m.scale.z = .6;
    const halo = add(glow(SOFT, .18, 0)); halo.position.set(MAP.X(x), MAP.Y(lampsDef.y), LAMPZ + .05);
    halo.material.color.set(on);
    return { mat, halo, on };
  });

  /* the lamp over the door: a caged bulkhead light, the room's one shadow */
  const LX = MAP.X(HAT.lamp.x), LY = MAP.Y(HAT.lamp.y);
  (() => {
    const g = group(root, [LX, LY, BACK]);
    add(mesh(rbox(U(76), U(30), .05, .015), M('metal', PAL.metalD), [0, .02, .025]), g);
    add(mesh(rbox(.05, .05, .2, .012), M('metal', PAL.metalD), [0, 0, .12]), g);
    const hood = add(mesh(lathe([[.13, -.02], [.12, .02], [.08, .05], [0, .06]], 24), M('metal', PAL.metalD, { hl: .4 })), g); hood.position.set(0, -.01, .22);
    add(mesh(lathe([[.12, -.02], [.11, -.08], [.07, -.12], [0, -.13]], 24), M('glass', '#e8d9bd', { transparent: true, opacity: .45, depthWrite: false, emissive: '#ffcf8f', ei: .7 }), [0, -.01, .22], { cast: false }), g);
    for (let k = 0; k < 4; k++){ const a = k*Math.PI/2 + Math.PI/4; add(mesh(new THREE.TorusGeometry(.115, .006, 6, 16, Math.PI/2), M('metal', PAL.metalD), [0, -.03, .22], { rot: [Math.PI/2, 0, a], cast: false }), g); }
    add(mesh(new THREE.SphereGeometry(.04, 12, 10), toon('#fff6dc', { grain: -1, emissive: '#ffe2b0', ei: 1.2 }), [0, -.06, .22], { cast: false }), g);
    const spot = add(new THREE.SpotLight(LT.lamp.color, LT.lamp.spot, LT.lamp.distance, LT.lamp.angle, LT.lamp.penumbra, LT.lamp.decay), g);
    spot.position.set(0, -.08, .26);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0008; spot.shadow.normalBias = .02; spot.shadow.radius = 5;
    spot.shadow.camera.near = .1; spot.shadow.camera.far = 7;
    root.add(spot.target); spot.target.position.set(0, 0, BACK + 1.25);
    const point = add(new THREE.PointLight(LT.lamp.color, LT.lamp.point, 4.5, 1.6), g); point.position.set(0, -.12, .4);
    add(glow(SWARM, U(260), .4), g).position.set(0, -.06, .26);
    add(glow(SWARM, .3, .8), g).position.set(0, -.06, .27);
    void point;
  })();

  /* ================= THE FAR WALL: SIGN, BOLLARD, PORTHOLE, SLIP ================= */
  const [sx, sy, sw, sh] = HAT.sign;
  const signTex = liveTex(570, 216, () => (isEN ? G.no : '') + ':' + FONT_GEN, (g, w) => {
    const k = w/sw; g.setTransform(k, 0, 0, k, -sx*k, -sy*k);
    g.fillStyle = PAL.paper; g.beginPath(); g.roundRect(sx, sy, sw, sh, 10); g.fill();
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .4; g.fillStyle = g.createPattern(BRUSH[0], 'repeat'); g.fillRect(sx, sy, sw, sh); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    /* Chinese pairs the name with its romanised tag; in English that is the
       same word twice, so the sign carries the hull number instead. */
    txtFit(g, tr('舷梯'), sx + sw/2, 338, 150, 28, PAL.ink);
    txt(g, isEN ? 'No.' + G.no : 'GANGWAY', sx + sw/2, 358, 11, PAL.inkSoft, { mono: true, ls: 2 });
  });
  {
    const g = group(root, [MAP.X(sx + sw/2), MAP.Y(sy + sh/2), BACK + .012]);
    add(mesh(rbox(U(sw), U(sh), .02, U(10)), M('paper', PAL.paper)), g);
    add(mesh(new THREE.PlaneGeometry(U(sw), U(sh)), toon('#ffffff', { map: signTex.t, grain: -1, ramp: 'soft', rim: 0, hl: 0, emissive: '#2a3046', ei: .45 }), [0, 0, .0105], { cast: false }), g);
    for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) add(mesh(new THREE.SphereGeometry(.01, 8, 6), M('metal', PAL.metal), [x*(U(sw)/2 - .025), y*(U(sh)/2 - .025), .014], { cast: false }), g);
    pickable(g, { act: 'inspect', label: tr('舷梯'), key: 'hatSign', inspect: true });
  }
  /* the bollard the gangway lines come off, with the line coiled on it */
  {
    const B = HAT.bollard, g = group(root, [MAP.X(B.x), 0, BACK + .17]);
    const y0 = MAP.Y(B.y1), y1 = MAP.Y(B.y0 + 18), mD = M('metal', PAL.metalD, { hl: .35 });
    add(mesh(new THREE.CylinderGeometry(U(B.r), U(B.r), y1 - y0, 16), mD, [0, (y0 + y1)/2, 0]), g);
    add(mesh(new THREE.CylinderGeometry(U(B.cap), U(B.cap), U(24), 24), mD, [0, y1 + U(8), 0]), g);
    for (const y of [y0 + .08, y1 - .1]) add(mesh(rbox(.06, .07, .17, .015), M('metal', PAL.metalDD), [0, y, -.085]), g);
    const cm = M('metal', PAL.copper, { grain: 1, rep: 2, hl: .45, hlSize: .12 });
    for (let k = 0; k < B.coils; k++){
      const c = add(mesh(new THREE.TorusGeometry(U(24), .017, 8, 32), cm, [k % 2 ? .006 : -.006, MAP.Y(330 + k*26), 0], { rot: [Math.PI/2 + (k % 2 ? .1 : -.08), 0, 0] }), g);
      c.scale.set(1, 1.05, 1);
    }
  }
  porthole(root, [MAP.X(HAT.porthole.x), MAP.Y(HAT.porthole.y), BACK + .03], U(HAT.porthole.r), { open: true, bolts: 10 });
  const slip = slipOnWall(root, MAP, { ...HAT.slip });

  /* ================= THE STAND, AND THE PIECE ON IT ================= */
  const ST = HAT.stand, standG = group(root, [MAP.X(STAND.x), 0, BACK + ST.z]);
  {
    add(blot(ST.w*.75, ST.d*.8, .55), standG).position.y = .003;
    for (const x of [-1, 1]) add(mesh(rbox(.05, ST.h - .05, .05, .015), M('metal', PAL.metalD), [x*(ST.w/2 - .08), (ST.h - .05)/2, 0]), standG);
    for (const x of [-1, 1]) add(mesh(rbox(.11, .025, ST.d - .04, .01), M('metal', PAL.metalDD), [x*(ST.w/2 - .08), .012, 0]), standG);
    add(mesh(rbox(ST.w - .14, .035, .035, .01), M('metal', PAL.metalD), [0, ST.h*.42, 0]), standG);
    add(mesh(rbox(ST.w, .06, ST.d, .02), M('wood', PAL.wood, { hl: .2, rep: [2, 1] }), [0, ST.h - .03, 0]), standG);
  }
  const rigSpot = group(standG, [0, ST.h, 0]);
  const rig = rig3d(rigSpot);
  /* The same lamp held out through the doorway: it leaves the stand on the
     first tap and travels to where the one outside can get their hands on it.
     A tap on it while it is held out is the second tap: let go. */
  const carryG = group(root), carry = rig3d(carryG); carryG.name = 'carry';
  const HP = new THREE.Vector3(0, 1.0, PZ0 - .32);            // where it changes hands
  const standTop = new THREE.Vector3(MAP.X(STAND.x), ST.h, BACK + ST.z);
  pickable(carryG, { act: 'hat:give', label: () => tr('松手'), key: 'carried', on: () => !!S.offer && !S.offer.letGo, anchor: new THREE.Vector3(0, .15, 0), r: .22 });
  {
    const hitM = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }); hitM.colorWrite = false;
    add(new THREE.Mesh(new THREE.BoxGeometry(ST.w + .06, .5, ST.d), hitM), standG).position.y = ST.h + .25;
  }
  pickable(standG, { act: 'hat:rig', label: () => G.rig ? tr('那盏灯') : tr('架子'), anchor: new THREE.Vector3(0, ST.h + .1, 0), r: .3 });

  /* ================= THE FAR SIDE ================= */
  const far = group(root);
  const ports: Record<string, Port3D> = {}, visitors: Record<string, Visitor3D> = {}, lamps: Record<string, ReturnType<typeof rig3d>> = {}, farGlow: Record<string, THREE.Sprite> = {};
  const VS = HAT.port.visScale/HAT.map.unit;
  for (const id of Object.keys(PORTS)){
    const P = PORTS[id], pt = buildPort(far, P, PZ0);
    const v = buildVisitor(pt.body, P, VS);
    v.root.position.set(0, 0, PZ0 - HAT.port.visZ);
    pickable(v.root, { act: 'hat:give', label: tr(P.who), key: 'visitor', on: () => S.doorK > .5 && !gave(),
      anchor: new THREE.Vector3(0, P.look.h*.55, 0), r: P.look.h*.45*VS });
    pt.g.visible = false;
    ports[id] = pt; visitors[id] = v;
    /* the lamp once it is theirs, which leaves with the place, and the glow
       that keeps it a point of light once the place is far off */
    lamps[id] = rig3d(pt.body);
    farGlow[id] = addTo(glow(SWARM, 1, 0), pt.body);
  }
  /* Under way, or with nothing alongside, the porthole shows the lane the
     ship is on: its sky colours (ROUTE_SKY, as the bridge has them) and stars. */
  const voidTex = liveTex(256, 192, () => G.route, (g, w, h) => {
    const [top, bot] = ROUTE_SKY[G.route] || ROUTE_SKY.harbor;
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const R = mulberry32(31); for (let i = 0; i < 90; i++){ g.globalAlpha = .3 + R()*.6; g.fillStyle = R() < .1 ? '#ffe3b8' : '#dfe9f3'; const s2 = .6 + R()*1.1; g.fillRect(R()*w, R()*h*.8, s2, s2); }
  });
  const voidMat = flatMat('#ffffff', { map: voidTex.t, opacity: 1 });
  const SKC = HAT.port.sky;
  const voidSky = add(noRay(mesh(new THREE.PlaneGeometry(SKC.w, SKC.h), voidMat, [0, SKC.y, PZ0 - SKC.z + 1], { cast: false, receive: false })));
  voidSky.renderOrder = -6;
  /* the dark the eye has not adjusted to yet: a veil just past the opening */
  const veilM = flatMat('#05080f', { opacity: 0 });
  add(noRay(mesh(new THREE.PlaneGeometry(DX1 - DX0, DY1 - DY0), veilM, [0, (DY0 + DY1)/2, PZ0 - .03], { cast: false, receive: false })));

  /* dust in the doorway light (S.hatMotes, design units, moved by update()) */
  const NM = S.hatMotes.length, mp = new Float32Array(NM*3), mc = new Float32Array(NM*3);
  const motesGeo = new THREE.BufferGeometry();
  motesGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3)); motesGeo.setAttribute('color', new THREE.BufferAttribute(mc, 3));
  const motes = add(noRay(new THREE.Points(motesGeo, new THREE.PointsMaterial({ size: .022, map: spriteTex(SOFT), vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))));
  motes.frustumCulled = false;
  const moteCol = new THREE.Color('#ffe2bd');

  /* ================= LIGHT ================= */
  const hemi = add(new THREE.HemisphereLight(LT.hemiSky, LT.hemiGround, LT.hemi), scene);
  const fill = add(new THREE.PointLight(LT.fill.color, LT.fill.intensity, LT.fill.distance, LT.fill.decay));
  fill.position.set(MAP.X(STAND.x) - .1, 2.0, BACK + 1.1);
  /* the port, spilling in through the door, and lighting its own side */
  const spill = add(new THREE.SpotLight('#ffffff', 0, LT.spill.distance, LT.spill.angle, LT.spill.penumbra, LT.spill.decay));
  spill.position.set(0, 2.3, PZ0 - 2.2); root.add(spill.target); spill.target.position.set(0, 0, BACK + 2.2);
  const portAmb = add(new THREE.PointLight('#ffffff', 0, LT.portAmb.distance, LT.portAmb.decay));
  portAmb.position.set(0, 2.4, PZ0 - 1.6);
  /* the lamp in the visitor's hands */
  const holdLight = add(new THREE.PointLight('#ffffff', 0, LT.hold.distance, LT.hold.decay));
  const holdPt = new THREE.Vector3(), tmp = new THREE.Vector3();
  const ease = (x: number) => { x = Math.max(0, Math.min(1, x)); return x*x*(3 - 2*x); };

  /* ================= PER FRAME ================= */
  let curId = '';
  function sync(_dt: number){
    const P = callPort(), open = S.doorK || 0, can = docked(), given = gave();
    /* The door, from S.doorK, which runs at the door's own pace: for the
       first fifth the handle turns and the dogs come off, then the leaves run
       apart; closing is the same backwards, ending on the seal. */
    const u = open, slideK = (x => x*x*(3 - 2*x))(Math.max(0, Math.min(1, (u - .2)/.8)));
    const moving = u > 0 && u < 1, judder = moving && slideK > 0 && slideK < 1 ? U(Math.sin(S.T*38)*1.2) : 0;
    const slide = U(slideK*(half - 10)) + judder;
    leaves[0].position.x = -slide; leaves[1].position.x = slide;
    handle.rotation.z = can ? Math.min(1, u/.2)*Math.PI/2 : -Math.PI/2;
    /* the three lamps */
    const lit = [can && !given, !can, given];
    ind.forEach((l, i) => { l.mat.emissiveIntensity = lit[i] ? .5 : 0; l.mat.color.set(lit[i] ? l.on : PAL.lampOff); l.halo.material.opacity = lit[i] ? .75 : 0; });
    /* while it comes alongside, the amber lamp blinks: something is out there */
    const near = OUT.list.find(x => x.phase === 'approach');
    if (near && near.k > .45){ const b = Math.sin(S.T*3) > 0 ? .9 : .15; ind[0].mat.emissiveIntensity = .5*b; ind[0].mat.color.set(ind[0].on); ind[0].halo.material.opacity = .75*b; }

    /* ---- what is outside: every place near enough, from state/voyage.ts ---- */
    const hv = handView(), id = P ? P.id : '';
    if (id !== curId){ curId = id; }
    let portSkyK = 0;
    for (const k of Object.keys(ports)){
      const pt = ports[k], sight = OUT.list.find(x => x.id === k), v = visitors[k], W = HAT.port.walk[k];
      pt.g.visible = !!sight && sight.vis > .01;
      if (!pt.g.visible){ lamps[k].sync(null); continue; }
      /* in from the distance, out to the side as it falls astern */
      const away = 1 - sight.k;
      pt.body.position.set(sight.phase === 'parting' || sight.phase === 'wake' ? Math.min(1, sight.drift)*HAT.port.drift : 0,
        -U(Math.sin(S.T*.6)*HAT.port.bob)*OUT.sway, -away*HAT.port.far);
      const sk = sight.phase === 'docked' || sight.phase === 'parting' ? Math.max(0, Math.min(1, (sight.k - .55)/.4)) : 0;
      pt.skyMat.opacity = sk; pt.sky.visible = sk > .01; portSkyK = Math.max(portSkyK, sk);
      pt.sync({ lit: sight.lit, t: S.T, vis: sight.vis });
      const here = k === id && docked();
      /* the one who came to the door: waiting, coming over, taking it, carrying it off */
      const showV = here && !(k === 'ship' && hv.place > .55);
      v.root.visible = showV;
      if (showV) farGlow[k].material.opacity = 0;
      const sp = (G.calls.filter(c => c.id === k).pop() || {}).sp;
      if (!showV){
        const set = sight.lit > .5 && W.dest;
        lamps[k].sync(set ? { sp: sp || 'bell', glass: true, lit: true } : null);
        if (set){ lamps[k].g.position.set(W.dest[0], W.dest[1] - .03, PZ0 + W.dest[2]); lamps[k].g.rotation.set(0, 0, 0); }
        farGlow[k].material.opacity = set || (k === 'ship' && sight.lit > .5) ? .8*sight.vis : 0;
        if (set) farGlow[k].position.set(W.dest[0], W.dest[1] + .2, PZ0 + W.dest[2]);
        else if (k === 'ship') farGlow[k].position.set(.95, 1.5, PZ0 - 2.4);
        farGlow[k].scale.setScalar(.5 + away*4);
        continue;
      }
      const Hh = P.look.h, Ww = P.look.w, path = W.path.map(([x, z]) => new THREE.Vector2(x, PZ0 + z));
      let x = 0, z = 0, face = 0, step = 0, reach = hv.reach, bend = 0;
      let handY = Hh*.55, handZ = Ww*.62;
      if (!given){
        const c = ease(hv.come);
        x = W.wait[0] + (path[0].x - W.wait[0])*c; z = PZ0 + W.wait[1] + (path[0].y - PZ0 - W.wait[1])*c;
        step = hv.come*3.2; face = 0;
        /* hands out to the lamp where it is held, as far as the arms go */
        tmp.copy(HP); v.root.worldToLocal(tmp);
        handY = tmp.y; handZ = Math.min(Ww*1.7, tmp.z);
      } else {
        /* steady -> turn -> walk -> set it down */
        const L = path.reduce((acc, p2, i) => i ? acc + p2.distanceTo(path[i - 1]) : 0, 0);
        let d = ease(hv.walk)*L, at = path[0].clone(), dir = new THREE.Vector2(0, -1);
        for (let i = 1; i < path.length; i++){ const seg = path[i].distanceTo(path[i - 1]); if (d <= seg || i === path.length - 1){ dir = path[i].clone().sub(path[i - 1]).normalize(); at = path[i - 1].clone().add(dir.clone().multiplyScalar(Math.min(d, seg))); break; } d -= seg; }
        x = at.x; z = at.y; step = hv.walk*L/.32;
        const head = Math.atan2(dir.x, dir.y);
        face = head*ease(hv.turn);
        if (W.dest && hv.place > 0){ const toD = Math.atan2(W.dest[0] - x, PZ0 + W.dest[2] - z); face = face + (toD - face)*ease(Math.min(1, hv.place*3)); }
        tmp.copy(HP); v.root.worldToLocal(tmp);
        const carryY = Hh*.58, carryZ = Ww*.62, st = ease(hv.steady);
        handY = tmp.y + (carryY - tmp.y)*st; handZ = Math.min(Ww*1.7, tmp.z) + (carryZ - Math.min(Ww*1.7, tmp.z))*st;
        if (hv.place > 0){
          const pl = ease(hv.place);
          if (W.lift > 0) handY += (Hh*1.25 - handY)*Math.min(1, pl*1.8)*W.lift;
          if (W.lift < 0){ handY += (Hh*.12 - handY)*pl; }
          bend = W.bend*Math.sin(Math.PI*Math.min(1, hv.place*1.15));
          if (k === 'ship') z -= pl*.5;                         // in through their own door
          /* once it is set down, the hands come back to their sides */
          if (hv.place > .8) reach = 1 - (hv.place - .8)/.2;
        }
      }
      v.root.position.set(x, 0, z); v.root.rotation.y = face;
      v.update(S.T, reach, open > .01 || given ? 1 : .6, { handY, handZ, bend, step });
      /* the lamp: in their hands, swinging a little, then where it goes */
      if (given){
        v.holdWorld(tmp); pt.body.worldToLocal(tmp);
        if (W.dest){ const q = W.lift > 0 ? Math.max(0, (hv.place - .45)/.55) : Math.max(0, (hv.place - .25)/.75), e = ease(q);
          tmp.set(tmp.x + (W.dest[0] - tmp.x)*e, tmp.y + (W.dest[1] - .03 - tmp.y)*e, tmp.z + (PZ0 + W.dest[2] - tmp.z)*e); }
        lamps[k].g.position.copy(tmp); lamps[k].g.position.y -= .14*(1 - (W.dest ? ease(Math.max(0, (hv.place - .45)/.55)) : 0));
        lamps[k].g.rotation.set(hv.wob*.5, face, hv.wob);
        lamps[k].sync({ sp: sp || 'bell', glass: true, lit: true });
      } else lamps[k].sync(null);
      if (k === 'ship' && pt.door) pt.door.position.x = -.56 - .48*Math.sin(Math.PI*Math.min(1, Math.max(0, (hv.place - .1)/.8)));
    }
    voidMat.opacity = 1 - portSkyK; voidSky.visible = portSkyK < .99; voidTex.tick();

    /* the lamp being held out, between the stand and the doorway */
    const out = hv.lamp === 'out';
    carryG.visible = out;
    if (out){
      const e = ease(hv.out); tmp.copy(standTop).lerp(HP, e); tmp.y += Math.sin(Math.PI*e)*.35 - .14*e;
      carryG.position.copy(tmp); carryG.rotation.set(0, 0, hv.wob);
      carry.sync(G.rig);
    } else carry.sync(null);

    const pt = P ? ports[P.id] : null, show = !!pt && open > .01;
    veilM.opacity = (1 - open)*.92;
    const lampCol = P ? P.look.lamp : '#ffd9a3';
    spill.color.set(pt ? mixHex(lampCol, '#9fb2d6', .55) : '#9fb2d6'); spill.intensity = show ? LT.spill.intensity*open : 0;
    /* The place keeps a little light of its own while it is alongside, so the
       porthole shows it with the door shut; the open door lets the rest in. */
    const along = !!pt && can && ports[P.id].g.visible;
    portAmb.color.set(pt ? pt.amb : '#9fb2d6'); portAmb.intensity = along ? LT.portAmb.intensity*(.55 + .45*open) : 0;
    /* the lamp's own light follows it: into their hands, then where it is set */
    const theirs = P && given ? lamps[P.id] : null;
    if (theirs && ports[P.id].g.visible){
      theirs.g.updateWorldMatrix(true, false); theirs.g.getWorldPosition(holdPt); holdLight.position.copy(holdPt); holdLight.position.y += .22;
      const setK = hv.place;
      holdLight.color.set(lampCol); holdLight.distance = LT.hold.distance + (LT.set.distance - LT.hold.distance)*setK;
      holdLight.intensity = LT.hold.intensity + (LT.set.intensity - LT.hold.intensity)*setK;
    } else holdLight.intensity = 0;
    /* the piece on the stand */
    rig.sync(G.rig);
    /* the motes: faint in the lamp's pool, brighter once the door lets the port in */
    const ma = .18 + .55*open;
    S.hatMotes.forEach((m, i) => {
      const p = MAP.at(m.x, m.y, BACK + .2 + (i % 7)*.11);
      mp[i*3] = p.x; mp[i*3 + 1] = p.y; mp[i*3 + 2] = p.z;
      const tw = ma*(.55 + .45*Math.sin(S.T*.8 + m.ph))*(m.r/1.8);
      mc[i*3] = moteCol.r*tw; mc[i*3 + 1] = moteCol.g*tw; mc[i*3 + 2] = moteCol.b*tw;
    });
    motesGeo.attributes.position.needsUpdate = true; motesGeo.attributes.color.needsUpdate = true;
    hemi.intensity = LT.hemi*(1 + .15*open);
    signTex.tick(); slip.redraw();
  }

  /* The porthole view aims through the hole at the place alongside, or
     straight out when there is nothing near: the eye stands back from the
     hole on the line from the place through its centre. */
  const HOLE = new THREE.Vector3(MAP.X(HAT.porthole.x), MAP.Y(HAT.porthole.y), BACK), LK = HAT.port.look;
  const aimT = new THREE.Vector3(), aimN = new THREE.Vector3(), aimE = new THREE.Vector3(), aimS = new THREE.Vector3().fromArray(LK.far);
  aimS.z += PZ0;
  function portholeEye(){
    const sg = OUT.near || OUT.list[0], k = sg ? Math.max(0, Math.min(1, (sg.k - .5)/.5)) : 0, L = sg && LK[sg.id];
    aimT.set(LK.far[0], LK.far[1], PZ0 + LK.far[2]);
    if (L){ aimN.set(L[0], L[1], PZ0 + L[2]); aimT.lerp(aimN, k*k*(3 - 2*k)); }
    aimS.lerp(aimT, .04);                      // the eye drifts over, it does not jump
    aimE.copy(HOLE).sub(aimS).normalize().multiplyScalar(LK.eyeD).add(HOLE);
    aimE.x = Math.min(LK.eyeMaxX, aimE.x);
    return { eye: [aimE.x, aimE.y, aimE.z] as [number, number, number], look: [aimS.x, aimS.y, aimS.z] as [number, number, number] };
  }
  const views: View[] = [
    { id: 'bay', label: tr('舷梯'), ...HAT.views.bay },
    { id: 'handover', label: tr('门口'), ...HAT.views.handover },
    { id: 'porthole', label: tr('舷窗边'), ...HAT.views.porthole, dyn: portholeEye }
  ];
  return {
    scene, views, sync,
    fxAt(k, x, y){
      if (k < K_WL - .05) return [MAP.at(x, y, PZ0 - HAT.port.visZ), 1/HAT.map.unit];
      return [MAP.at(x, y, BACK + .3), 1/HAT.map.unit];
    },
    enter(){ curId = '\u0000'; signTex.reset(); voidTex.reset(); }
  };
}

register3D({ id: 'hatch', build });
