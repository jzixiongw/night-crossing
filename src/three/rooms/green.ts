import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tr } from '../../i18n';
import { BRUSH, SFOG, SHADE, SIND, SOFT, SPINK, STEAL, SWARM, ell, flat, leafPath, rr, sphere, stemPath, txt, txtFit, vol } from '../../core/paint';
import { MAT, POT_COL } from '../../core/materials';
import { D2R, clamp, mixHex, mk, mulberry32 } from '../../core/util';
import { SEEDS } from '../../data/index';
import { PORTS, PORT_ORDER } from '../../data/ports';
import { BENCH_X, GREEN_SPACE, GROW_BAR, POTS, POT_Y, SHELF_Y, bloomReady, drawPlantP, plantRand } from '../../rooms/green';
import { lastDelivered, orderState } from '../../ui/worksheet';
import { PR, S } from '../../state/runtime';
import { G } from '../../state/store';
import { GH3, GU, gx, gy } from '../config/green';
import { FONT_GEN, camera, designMap, pickable, pointerOn, register3D, type Built } from '../engine';
import { M, blot, canvasTex, flatMat, glow, lathe, liveTex, mesh, noRay, rbox, spriteTex, toon, tube } from '../kit';
import { rig3d, slipOnWall } from '../props';
import { activeView, goView, type View } from '../view';

/* ================= THE GREENHOUSE, IN THREE.JS =================
   rooms/green.ts still grows, waters, turns, cuts and builds: its update()
   folds, leans and rings the plants from where the hand is, every ACT['gh:*']
   handler answers unchanged, and G/S hold the state. This file draws one long
   glasshouse -- the seedling shelf at the cold left end, the garden bench in
   the middle, the workshop at the warm right end -- and says where a pointer
   lands. Positions the logic addresses (POTS, GROW_BAR, BENCH_X, the drops,
   the slip) are laid out from their design numbers through GH3.map.

   INTERACTION CHECKLIST (2D -> here)
     gh:plant:i  tap, 8 plants        card per pot; pt = the pot's own design
                                       frame (lean/fold applied, as 2D's
                                       translate+scale+rotate), via a plane
                                       through the card. Label 植物 on 0.
                                       Empty card cells let the tap through.
     gh:pot:i    tap / press-drag      real pot; pt = pot's design frame on a
                                       plane through it, so the empty-hand
                                       drag turns it by p.x deltas (/58) and
                                       the can drag waters what hitAt() finds
                                       (pots and plants both match). Labels
                                       花盆 on 0 and 5; cursor crosshair with
                                       the can.
     gh:seeds    tap                   seed box on the potting ledge (种子盒)
     gh:spray    tap                   the can on the ledge (喷壶); while it
                                       is in hand the can follows the pointer
                                       and its spot takes 放下喷壶 (sprayDrop)
     gh:lamp     tap, 2 bars           lamp0 (生长灯) garden, lamp1 nursery
     gh:board:id tap, 4 boards         painted like drawBoard(); 订单板 on
                                       the active one
     gh:work:glass / lamp / plant      cover shelf 罩子架, lamp tray 灯盘,
                                       turntable 装配台 (rig3d while
                                       G.rig && !G.rig.lit)
     ui:work     tap                   the slip on the glass (slipOnWall)
     cursor      lean / fold / bells   GREEN_SPACE.cursor() = the pointer on
                                       the garden plane (or the shelf plane
                                       over the nursery), in design units
     captions    the two ends          GREEN_SPACE.end() = the current view
     enter       step 'build'          GREEN_SPACE.toBench() -> bench view
     painted     lamp bars on/off and S.lampK fade, hand light when dark,
                 soil wet/dry + cracks, pot band + seed tag turning with
                 S.potSpin, pot wiggle, plant lean/sway/fold, bell swing,
                 bloom glows (S.bloomPts), boards (state, three marks,
                 delivered sprig), rig, drops on the glass, stars, puffs.

   Three places: the garden (main), the seedling shelf, the work bench. */

const P = GH3.palette, HS = GH3.house, Z = GH3.z, LT = GH3.light, CARD = GH3.card;
const UNIT = GH3.map.unit;
const GMAP = designMap(UNIT, GH3.map.x0, GH3.map.y0, Z.garden);
const NMAP = designMap(UNIT, GH3.map.x0, GH3.map.y0, Z.nursery);
const BACK = HS.back;
const potZ = (i: number) => POTS[i].k < .97 ? Z.nursery : Z.garden;
const DEFAULT_SPACE = { ...GREEN_SPACE };

/* merge many small static pieces into one mesh, so decoration costs one call */
function merged(geos: THREE.BufferGeometry[]){
  const flat = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); return n; });
  const out = mergeGeometries(flat, false); flat.forEach(g => g.dispose()); return out;
}
const placed = (g: THREE.BufferGeometry, at: [number, number, number], rot: [number, number, number] = [0, 0, 0], sc: number | [number, number, number] = 1) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot, 'YXZ')),
    typeof sc === 'number' ? new THREE.Vector3(sc, sc, sc) : new THREE.Vector3(...sc));
  return g.applyMatrix4(m);
};
const box = (w: number, h: number, d: number, at: [number, number, number], rot?: [number, number, number]) => placed(new THREE.BoxGeometry(w, h, d), at, rot);

function build(): Built {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(P.skyTop);
  const root = new THREE.Group(); scene.add(root);
  const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = root): T => { parent.add(o); return o; };
  const grp = (parent: THREE.Object3D, at?: [number, number, number]) => { const g = new THREE.Group(); if (at) g.position.set(...at); parent.add(g); return g; };
  const X0 = HS.x0, X1 = HS.x1, XC = (X0 + X1)/2, LEN = X1 - X0;

  /* shared materials */
  const MT = {
    wood: M('wood', P.wood, { rep: 2 }), woodD: M('woodD', P.woodD, { rep: 2 }), cork: M('wood', P.cork, { grain: 2 }),
    metal: M('metal', P.metal), metalD: M('metal', P.metalD), brass: M('brass', P.brass), copper: M('brass', P.copper),
    mullion: M('metal', P.mullion, { grain: 1, rep: 4, hl: .25 }), clay: M('ceramic', P.potClay, { grain: 1, hl: .3 }),
    leaf: M('leaf', '#ffffff'), stem: M('leaf', P.stem, { hl: 0 }),
    glassDome: M('glass', P.glassTint, { transparent: true, opacity: .26, depthWrite: false, side: THREE.DoubleSide })
  };

  /* ---- decoration: every loose leaf in the room is one instanced mesh, every
     stem one merged tube, so the troughs, baskets and trays cost two calls ---- */
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(.44, .46, 0, 1); leafShape.quadraticCurveTo(-.44, .46, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 6);
  const leaves: { m: THREE.Matrix4; c: THREE.Color }[] = [], stems: THREE.BufferGeometry[] = [];
  const LEAFC = [MAT.leaf.b, MAT.leafD.b, '#6bb29a', MAT.leaf.l, '#4f8f7a'];
  const leaf = (x: number, y: number, z: number, len: number, angZ: number, rotY = 0, ci = 0, tilt = .25) => {
    leaves.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, rotY, angZ, 'YXZ')), new THREE.Vector3(len, len, len)),
      c: new THREE.Color(LEAFC[ci % LEAFC.length]) });
  };
  const stem = (pts: [number, number, number][], r = .006) => stems.push(tube(pts, r, 10, 4));

  /* ================= SKY ================= */
  {
    const sky = canvasTex(2048, 1024, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#02060c'); gr.addColorStop(.32, P.skyTop); gr.addColorStop(.47, P.skyMid); gr.addColorStop(.52, P.skyLow); gr.addColorStop(1, '#0a161c');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      /* the teal and indigo haze the 2D sky had, low over the horizon */
      g.globalAlpha = .45; g.drawImage(STEAL, w*.62, h*.3, w*.22, h*.24); g.globalAlpha = .3; g.drawImage(SIND, w*.36, h*.22, w*.26, h*.3);
      g.globalAlpha = .25; g.drawImage(SFOG, w*.2, h*.34, w*.3, h*.2); g.globalAlpha = 1;
      const R = mulberry32(77);
      for (let i = 0; i < 1600; i++){ const y = Math.pow(R(), 1.3)*h*.53, x = R()*w, r = .45 + R()*.75;
        g.globalAlpha = .3 + R()*.55; g.fillStyle = R() < .12 ? '#ffd9a3' : '#e2f2ee'; g.fillRect(x, y, r, r); }
      g.globalAlpha = 1;
    });
    add(noRay(mesh(new THREE.SphereGeometry(80, 48, 24), new THREE.MeshBasicMaterial({ map: sky.t, side: THREE.BackSide, toneMapped: false, depthWrite: false }), [0, 0, 0], { cast: false, receive: false })), scene).renderOrder = -10;
  }
  /* twinkling stars: three clouds whose brightness breathes out of step */
  const starTex = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(230,245,240,.6)'); gr.addColorStop(1, 'rgba(230,245,240,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  const twinkle = [0, 1, 2].map(k => {
    const R = mulberry32(331 + k), n = 40, pos = new Float32Array(n*3);
    for (let i = 0; i < n; i++){ const a = (R()*1.4 - .2)*Math.PI, el = .06 + R()*.9, r = 70;
      pos[i*3] = Math.sin(a)*Math.cos(el)*r*-1; pos[i*3 + 1] = Math.sin(el)*r; pos[i*3 + 2] = -Math.cos(a)*Math.cos(el)*r; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ map: starTex.t, size: 3 + k, sizeAttenuation: false, transparent: true, depthWrite: false, color: k === 1 ? '#ffe2b8' : '#e2f2ee', toneMapped: false });
    const p = add(noRay(new THREE.Points(geo, m)), scene); p.renderOrder = -9;
    return m;
  });
  /* the moon, up and to the left through the back glass, as the 2D sky had it */
  {
    const mc = canvasTex(256, 256, (g) => { sphere(g, 128, 128, 112, { l: '#f3e1c2', b: '#d1b48b', d: '#6e5a46', r: '#fff1d8' }, { lx: .6, ly: -.6 }); });
    const dir = new THREE.Vector3(-.43, .13, -1).normalize(), at = dir.clone().multiplyScalar(60).add(new THREE.Vector3(0, 1.56, 2.35));
    const moon = add(noRay(new THREE.Sprite(new THREE.SpriteMaterial({ map: mc.t, transparent: true, depthWrite: false, toneMapped: false }))), scene);
    moon.position.copy(at); moon.scale.setScalar(4.4); moon.renderOrder = -8;
    const halo = add(glow(SWARM, 16, .12), scene); halo.position.copy(at); halo.renderOrder = -8;
  }

  /* ================= THE HOUSE ================= */
  const H = HS;
  /* floor: stone flags, and a slatted walk along the benches */
  {
    const ft = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = P.floor; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++){ g.fillStyle = ['#34473f', '#2f423b', '#384b43', '#314540'][i*2 + j]; g.fillRect(i*w/2 + 2, j*h/2 + 2, w/2 - 4, h/2 - 4); }
      g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .45; g.fillStyle = g.createPattern(BRUSH[1], 'repeat'); g.fillRect(0, 0, w, h);
    });
    const depth = H.front - BACK; ft.t.wrapS = ft.t.wrapT = THREE.RepeatWrapping; ft.t.repeat.set(LEN/1.2, depth/1.2);
    add(mesh(new THREE.PlaneGeometry(LEN, depth), toon('#ffffff', { map: ft.t, ramp: 'soft', rim: 0, hl: 0 }), [XC, 0, (H.front + BACK)/2], { rot: [-Math.PI/2, 0, 0], cast: false })).renderOrder = -1;
    const dt = canvasTex(64, 256, (g, w, h) => {
      g.fillStyle = '#2a1a12'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 4; k++){ g.fillStyle = ['#6c4331', '#634030', '#704634', '#5e3b2b'][k]; g.fillRect(2, k*h/4 + 3, w - 4, h/4 - 8); }
      g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .5; g.fillStyle = g.createPattern(BRUSH[2], 'repeat'); g.fillRect(0, 0, w, h);
    });
    dt.t.wrapS = dt.t.wrapT = THREE.RepeatWrapping; dt.t.repeat.set(1, LEN/.6);
    add(mesh(new THREE.PlaneGeometry(.78, LEN - .4), toon('#ffffff', { map: dt.t, ramp: 'std', rim: 0, hl: .05 }), [XC, .012, -.98], { rot: [-Math.PI/2, 0, Math.PI/2], cast: false }));
  }
  /* the low wall the glass stands on, and its cap */
  {
    const lw = M('wall', P.lowWall, { grain: 2, rep: [LEN/1.4, 1] });
    add(mesh(rbox(LEN, H.wallTop, H.wallT, .02), lw, [XC, H.wallTop/2, BACK - H.wallT/2 + .02], { cast: false }));
    add(mesh(rbox(LEN, .07, H.wallT + .1, .025), M('wall', P.lowCap, { grain: 1, rep: [LEN, 1], hl: .1 }), [XC, H.wallTop + .03, BACK - H.wallT/2 + .05], { cast: false }));
    /* the end walls: glass at the cold nursery end, planks at the workshop */
    const ew = H.front - BACK;
    add(mesh(rbox(H.wallT, H.wallTop, ew, .02), lw, [X0 - H.wallT/2, H.wallTop/2, (H.front + BACK)/2], { cast: false }));
    const plank = canvasTex(256, 256, (g, w, h) => {
      for (let k = 0; k < 8; k++){ g.fillStyle = ['#5c3927', '#653f2c', '#583626', '#6c4331'][k % 4]; g.fillRect(k*w/8, 0, w/8, h); g.fillStyle = '#2a1a12'; g.fillRect(k*w/8, 0, 2, h); }
      g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .5; g.fillStyle = g.createPattern(BRUSH[2], 'repeat'); g.fillRect(0, 0, w, h);
    });
    plank.t.wrapS = plank.t.wrapT = THREE.RepeatWrapping; plank.t.repeat.set(ew/1.6, 2);
    add(mesh(new THREE.PlaneGeometry(ew, H.eave), toon('#ffffff', { map: plank.t, ramp: 'soft', rim: 0, hl: 0 }), [X1, H.eave/2, (H.front + BACK)/2], { rot: [0, -Math.PI/2, 0], cast: false }));
  }
  /* glass: the back wall, the two roof slopes, the nursery gable. Mist sits
     low on the inside of the glass and thickest at the cold end. */
  const glassH = H.eave - H.wallTop;
  {
    const mist = canvasTex(2048, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(190,225,230,0)'); gr.addColorStop(.55, 'rgba(190,225,230,.05)'); gr.addColorStop(1, 'rgba(200,232,236,.2)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const gx2 = g.createLinearGradient(0, 0, w, 0); gx2.addColorStop(0, 'rgba(210,236,240,.16)'); gx2.addColorStop(.35, 'rgba(210,236,240,.03)'); gx2.addColorStop(1, 'rgba(210,236,240,0)');
      g.fillStyle = gx2; g.fillRect(0, 0, w, h);
      const R = mulberry32(5);
      for (let i = 0; i < 1100; i++){ const x = R()*w, y = h*(.35 + .65*Math.pow(R(), .5)), r = .5 + R()*.9; g.globalAlpha = .05 + R()*.12; g.fillStyle = '#e6f4ff'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      g.globalAlpha = .05; g.fillStyle = '#ffffff';
      for (let k = 0; k < 9; k++){ const x = R()*w; g.beginPath(); g.moveTo(x, h); g.lineTo(x + 40, h); g.lineTo(x + 140, 0); g.lineTo(x + 100, 0); g.closePath(); g.fill(); }
      g.globalAlpha = 1;
    });
    add(noRay(mesh(new THREE.PlaneGeometry(LEN, glassH), flatMat('#ffffff', { map: mist.t, opacity: 1 }), [XC, H.wallTop + glassH/2, BACK - .03], { cast: false, receive: false })));
    const tint = flatMat(P.glass, { opacity: .045, side: THREE.DoubleSide });
    const slope = (z0: number, y0: number, z1: number, y1: number) => {
      const L = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z1 - z0);
      add(noRay(mesh(new THREE.PlaneGeometry(LEN, L), tint, [XC, (y0 + y1)/2, (z0 + z1)/2], { rot: [-Math.PI/2 + a, 0, 0], cast: false, receive: false })));
    };
    slope(BACK, H.eave, H.ridgeZ, H.ridge); slope(H.ridgeZ, H.ridge, H.front, H.eave);
    const gable = new THREE.Shape(); gable.moveTo(BACK, H.wallTop); gable.lineTo(H.front, H.wallTop); gable.lineTo(H.front, H.eave); gable.lineTo(H.ridgeZ, H.ridge); gable.lineTo(BACK, H.eave); gable.closePath();
    const gg = new THREE.ShapeGeometry(gable); gg.rotateY(-Math.PI/2);
    add(noRay(mesh(gg, flatMat('#cfe8ee', { opacity: .07, side: THREE.DoubleSide }), [X0, 0, 0], { cast: false, receive: false })));
    const gg2 = gg.clone(); add(noRay(mesh(gg2, tint, [X1 - .01, 0, 0], { cast: false, receive: false })));
  }
  /* the frame: mullions every bay of the back wall, rafters over the roof,
     purlins along it, bars on the gable -- one merged mesh */
  {
    const bars: THREE.BufferGeometry[] = [], w = .05;
    const bay = GU(H.bay);
    for (let x = X0; x <= X1 + .001; x += bay){
      bars.push(box(w, glassH, w*1.4, [x, H.wallTop + glassH/2, BACK - .02]));
      const L1 = Math.hypot(H.ridgeZ - BACK, H.ridge - H.eave), a1 = Math.atan2(H.ridge - H.eave, H.ridgeZ - BACK);
      bars.push(box(w, w*1.6, L1, [x, (H.eave + H.ridge)/2, (BACK + H.ridgeZ)/2], [-a1, 0, 0]));
      const L2 = Math.hypot(H.front - H.ridgeZ, H.ridge - H.eave), a2 = Math.atan2(H.eave - H.ridge, H.front - H.ridgeZ);
      bars.push(box(w, w*1.6, L2, [x, (H.eave + H.ridge)/2, (H.front + H.ridgeZ)/2], [-a2, 0, 0]));
    }
    for (const dy of [200, 360]) bars.push(box(LEN, w*.8, w*1.2, [XC, gy(dy), BACK - .02]));
    bars.push(box(LEN, .1, .14, [XC, H.eave, BACK - .02]));
    bars.push(box(LEN, .08, .1, [XC, H.ridge + .02, H.ridgeZ]));
    for (const t of [.33, .66]){ for (const [z0, y0, z1, y1] of [[BACK, H.eave, H.ridgeZ, H.ridge], [H.ridgeZ, H.ridge, H.front, H.eave]]) bars.push(box(LEN, w, w, [XC, y0 + (y1 - y0)*t, z0 + (z1 - z0)*t])); }
    for (let z = BACK; z <= H.front; z += .62){ const top = z < H.ridgeZ ? H.eave + (H.ridge - H.eave)*(z - BACK)/(H.ridgeZ - BACK) : H.ridge - (H.ridge - H.eave)*(z - H.ridgeZ)/(H.front - H.ridgeZ);
      bars.push(box(w, top - H.wallTop, w, [X0, (top + H.wallTop)/2, z])); }
    bars.push(box(w, w, H.front - BACK, [X0, gy(360), (BACK + H.front)/2]));
    add(noRay(mesh(merged(bars), MT.mullion, undefined, { cast: false })));
  }

  /* ================= THE GARDEN BENCH ================= */
  const benchTop = gy(POT_Y), BZ = Z.garden, BD = GH3.bench.depth;
  {
    const x0 = gx(GH3.bench.x0), x1 = gx(GH3.bench.x1), w = x1 - x0, cx = (x0 + x1)/2;
    add(mesh(rbox(w, .06, BD, .02), M('wood', P.wood, { rep: [8, 1], hl: .16 }), [cx, benchTop - .03, BZ]));
    add(mesh(rbox(w - .06, .16, .03, .012), MT.woodD, [cx, benchTop - .13, BZ + BD/2 - .03]));
    const legs: THREE.BufferGeometry[] = [];
    for (const x of [x0 + .08, cx - w/6, cx + w/6, x1 - .08]) for (const dz of [-1, 1]) legs.push(placed(rbox(.07, benchTop - .06, .07, .015), [x, (benchTop - .06)/2, BZ + dz*(BD/2 - .06)]));
    legs.push(placed(rbox(w - .1, .035, BD - .08, .01), [cx, GH3.bench.shelfY, BZ]));
    add(mesh(merged(legs), MT.woodD));
    add(blot(w*.55, .5, .55)).position.set(cx, .003, BZ + .05);
    /* trays of spare pots on the shelf under it */
    const trays: THREE.BufferGeometry[] = [], spare: THREE.BufferGeometry[] = [];
    const spareProf: [number, number][] = [[0, 0], [.045, 0], [.06, .1], [.066, .1], [.066, .112], [.055, .112], [.05, .02], [0, .02]];
    for (let k = 0; k < 4; k++){ const x = gx(260 + k*270);
      trays.push(placed(rbox(.54, .04, .36, .01), [x, GH3.bench.shelfY + .037, BZ]));
      for (let j = 0; j < 3; j++) for (const dz of [-.08, .08]) spare.push(placed(lathe(spareProf, 14), [x - .16 + j*.16, GH3.bench.shelfY + .057, BZ + dz]));
    }
    add(mesh(merged(trays), MT.woodD, undefined, { cast: false }));
    add(mesh(merged(spare), MT.clay, undefined, { cast: false }));
  }

  /* ================= THE SEEDLING SHELF ================= */
  const shelfTop = gy(SHELF_Y), NZ = Z.nursery, SD = GH3.shelf.depth;
  {
    const x0 = gx(-690), x1 = gx(10), cx = (x0 + x1)/2, w = x1 - x0;
    const parts: THREE.BufferGeometry[] = [];
    for (const dx of [-660, -40]) parts.push(placed(rbox(.06, gy(300), .06, .015), [gx(dx), gy(300)/2, BACK + .04]));
    for (const dx of [-660, -40]) for (const y of [shelfTop - .05, gy(644) - .05]) parts.push(placed(rbox(.04, .04, SD - .04, .01), [gx(dx), y, NZ]));
    add(mesh(merged(parts), MT.metalD));
    add(mesh(rbox(w, .06, SD, .02), M('wood', P.wood, { rep: [5, 1], hl: .16 }), [cx, shelfTop - .03, NZ]));
    add(mesh(rbox(w, .05, SD, .02), MT.wood, [cx, gy(644) - .025, NZ]));
    /* three trays of seedlings on the lower board */
    const trayG: THREE.BufferGeometry[] = [], soil: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 3; k++){ const x = gx(-600 + k*230);
      trayG.push(placed(rbox(.5, .07, SD - .1, .012), [x, gy(644) + .035, NZ]));
      for (let j = 0; j < 8; j++){ const px = x - .18 + (j % 4)*.12, pz = NZ - .07 + Math.floor(j/4)*.14, py = gy(644) + .072;
        soil.push(placed(new THREE.CircleGeometry(.04, 10), [px, py, pz], [-Math.PI/2, 0, 0]));
        stem([[px, py, pz], [px + .004, py + .03, pz], [px - .006, py + .06, pz]], .003);
        leaf(px - .006, py + .055, pz, .035, .9, j, j); leaf(px - .006, py + .055, pz, .03, -.9, j, j + 2); }
    }
    add(mesh(merged(trayG), MT.cork, undefined, { cast: false }));
    add(noRay(mesh(merged(soil), toon('#3b2a22', { grain: 0 }), undefined, { cast: false })));
    add(blot(w*.5, .35, .5)).position.set(cx, .003, NZ + .1);
    /* the hose on its reel and two trowels, on the wall behind */
    const reel = grp(root, [gx(-560), gy(320), BACK + .07]);
    for (let k = 0; k < 3; k++) add(mesh(new THREE.TorusGeometry(GU(46) - k*.012, .022, 8, 28), M('cloth', P.hose, { hl: .1 }), [0, -k*.02, .02 + k*.03], { cast: false }), reel);
    add(mesh(rbox(.04, .1, .06, .01), MT.metalD, [0, GU(70), 0], { cast: false }), reel);
    for (let k = 0; k < 2; k++){ const t = grp(root, [gx(-200 + k*48), gy(290), BACK + .05]);
      add(mesh(rbox(.03, .24, .03, .012), MT.wood, [0, 0, 0], { cast: false }), t);
      add(mesh(new THREE.SphereGeometry(.045, 12, 8, 0, Math.PI*2, Math.PI/2, Math.PI/2), MT.metal, [0, -.12, 0], { cast: false }), t).scale.set(1, 1.6, .5); }
    /* on the floor: a stack of trays, a sack of soil open at the neck, the bucket */
    const fz = NZ + .5;
    const st: THREE.BufferGeometry[] = []; for (let k = 0; k < 5; k++) st.push(placed(rbox(.56, .06, .4, .01), [gx(-549), .03 + k*.05, fz], [0, (k%2 - .5)*.06, 0]));
    add(mesh(merged(st), MT.cork));
    const sack = add(mesh(lathe([[0, 0], [.17, 0], [.2, .08], [.2, .3], [.15, .4], [.1, .44], [.12, .47], [0, .47]], 18), M('cloth', P.sack, { grain: 1, rep: 2 }), [gx(-410), 0, fz]));
    sack.scale.set(1, 1, .75);
    add(mesh(new THREE.CircleGeometry(.1, 14), toon('#4a3726', { grain: 0 }), [gx(-410), .471, fz], { rot: [-Math.PI/2, 0, 0], cast: false }));
    add(mesh(lathe([[0, 0], [.11, 0], [.135, .34], [.14, .35], [.13, .35], [.105, .02], [0, .02]], 22), M('metal', P.metalD, { side: THREE.DoubleSide }), [gx(-285), 0, fz + .05]));
    add(blot(.9, .35, .5)).position.set(gx(-420), .003, fz);
  }

  /* ================= GREENERY THAT WAS HERE BEFORE ANYONE GREW TO ORDER ================= */
  {
    const R = mulberry32(331);
    /* troughs on the wall */
    for (const [dx0, dx1, dy] of [[-980, -680, 416], [1180, 1420, 430]]){
      const x0 = gx(dx0), x1 = gx(dx1), y = gy(dy), z = BACK + .14;
      add(mesh(rbox(x1 - x0, .17, .2, .02), MT.woodD, [(x0 + x1)/2, y - .085, z], { cast: false }));
      add(mesh(rbox(x1 - x0 + .02, .04, .22, .015), MT.wood, [(x0 + x1)/2, y, z], { cast: false }));
      for (let x = x0 + .07; x < x1 - .04; x += .1){
        for (let j = 0; j < 3; j++){ const h = GU(28 + R()*44), d = j - 1;
          stem([[x, y, z], [x + d*.03, y + h*.6, z + (R() - .5)*.06], [x + d*.07, y + h, z]], .005);
          leaf(x + d*.035, y + h*.55, z, GU(22), -d*.6, R()*2, j); }
        leaf(x, y, z + .05, GU(16), (R() - .5)*.5, 0, 1, 1.2);
      }
    }
    /* baskets off the rafters, trailing far enough to break the glass up */
    const basket = lathe([[0, -.1], [.08, -.1], [.12, -.05], [.135, .02], [.13, .03], [.11, -.04], [0, -.06]], 18);
    const bm = M('wood', P.cork, { grain: 2 });
    for (const [dx, z, drop] of [[-420, BACK + .25, 1], [180, BACK + .22, 1], [980, BACK + .22, 1], [1340, BACK + .3, .55]] as const){
      const x = gx(dx), y = gy(170);
      add(noRay(mesh(basket, bm, [x, y, z], { cast: false })));
      stems.push(placed(new THREE.CylinderGeometry(.004, .004, H.eave + .25 - y, 4), [x, (H.eave + .25 + y)/2, z]));
      for (let j = 0; j < 5; j++){ const a = j/5*Math.PI*2, L = GU(50 + R()*120)*drop, sx = Math.cos(a)*.1, sz = Math.sin(a)*.07;
        stem([[x + sx, y + .02, z + sz], [x + sx*1.6, y - L*.5, z + sz*1.3], [x + sx*1.2, y - L, z + sz]], .005);
        for (let q = 1; q <= 3; q++){ const t = q/3.6; leaf(x + sx*(1 + .5*t), y - L*t, z + sz*1.2, GU(18), (q % 2 ? 2.2 : -2.2), a, q + j); } }
      for (let j = 0; j < 7; j++){ const a = j/7*Math.PI*2; leaf(x + Math.cos(a)*.08, y + .01, z + Math.sin(a)*.06, GU(26), Math.cos(a)*.7, a, j, .5); }
    }
  }

  /* ================= THE WORKSHOP ================= */
  const WX = gx(BENCH_X), WZ = Z.bench, WD = GH3.work.depth, wTop = gy(POT_Y + 34);
  const W = (dx: number) => WX + GU(dx);
  /* the tool board over the bench and the shelf of cuttings */
  {
    const bw = GU(696), bh = GU(316), by = gy(142 + 158);
    const peg = canvasTex(512, 232, (g, w, h) => {
      g.fillStyle = mixHex(MAT.wood.b, MAT.woodD.b, .45); g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,240,210,.08)'); gr.addColorStop(1, 'rgba(6,10,14,.34)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#241a15'; g.globalAlpha = .55; for (let x = 12; x < w; x += 25) for (let y = 10; y < h; y += 25){ g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
      g.globalAlpha = .5; g.globalCompositeOperation = 'soft-light'; g.fillStyle = g.createPattern(BRUSH[2], 'repeat'); g.fillRect(0, 0, w, h);
    });
    add(mesh(rbox(bw, bh, .04, .015), MT.woodD, [W(20), by, BACK + .05], { cast: false }));
    add(mesh(new THREE.PlaneGeometry(bw - .06, bh - .06), M('wood', '#ffffff', { map: peg.t, hl: .04 }), [W(20), by, BACK + .072], { cast: false }));
    /* a wrench, shears, a reel of twine, a trowel, and the cuttings in their
       jars -- merged by material, since none of it moves */
    const tz = BACK + .085, metal: THREE.BufferGeometry[] = [], wood: THREE.BufferGeometry[] = [], glassG: THREE.BufferGeometry[] = [], waterG: THREE.BufferGeometry[] = [];
    metal.push(placed(rbox(GU(16), GU(86), .015, .006), [W(212), gy(233), tz]));
    metal.push(placed(new THREE.TorusGeometry(GU(14), .01, 8, 16, Math.PI*1.4), [W(212), gy(186), tz], [0, 0, -.5]));
    for (const sgn of [-1, 1]) metal.push(placed(rbox(GU(8), GU(80), .012, .004), [W(288), gy(238), tz + .004*sgn], [0, 0, sgn*.32]));
    metal.push(placed(new THREE.SphereGeometry(GU(20), 12, 8, 0, Math.PI*2, Math.PI/2, Math.PI/2), [W(255), gy(372), tz + .01], [0, 0, 0], [1, 1.5, .4]));
    wood.push(placed(rbox(GU(14), GU(70), .03, .01), [W(255), gy(330), tz + .01]));
    wood.push(placed(rbox(GU(160), .025, .12, .008), [W(270), gy(358), tz + .05]));
    wood.push(placed(new THREE.TorusGeometry(GU(13), .009, 8, 16), [W(288), gy(282), tz + .006]));
    add(noRay(mesh(merged(metal), MT.metal, undefined, { cast: false })));
    add(noRay(mesh(merged(wood), MT.woodD, undefined, { cast: false })));
    add(noRay(mesh(new THREE.CylinderGeometry(GU(26), GU(26), .05, 20), M('cloth', P.cream, { grain: 1 }), [W(330), gy(226), tz + .02], { rot: [Math.PI/2, 0, 0], cast: false })));
    add(noRay(mesh(new THREE.CylinderGeometry(GU(9), GU(9), .052, 12), toon('#6c4331', { grain: -1 }), [W(330), gy(226), tz + .021], { rot: [Math.PI/2, 0, 0], cast: false })));
    for (let k = 0; k < 4; k++){ const x = W(206 + k*36), y = gy(352);
      glassG.push(placed(lathe([[0, 0], [GU(13), 0], [GU(14), GU(36)], [GU(11), GU(42)], [GU(12), GU(44)], [0, GU(44)]], 14), [x, y, tz + .06]));
      waterG.push(placed(new THREE.CylinderGeometry(GU(12), GU(12.5), GU(16), 12), [x, y + GU(8), tz + .06]));
      stem([[x, y + GU(10), tz + .06], [x + .006, y + GU(30), tz + .06], [x - .005, y + GU(50), tz + .06]], .003);
      leaf(x - .004, y + GU(46), tz + .06, GU(14), .9, 0, k); leaf(x - .004, y + GU(40), tz + .06, GU(12), -1, 0, k + 2);
    }
    add(noRay(mesh(merged(waterG), toon('#2f5f5a', { grain: -1, transparent: true, opacity: .55 }), undefined, { cast: false })));
    add(noRay(mesh(merged(glassG), MT.glassDome, undefined, { cast: false })));
  }
  /* the bench itself, with planks over the low wall behind it: this end is a workshop, not a garden */
  {
    const x0 = gx(1372), x1 = HS.x1;
    const pl = canvasTex(256, 64, (g, w, h) => { for (let k = 0; k < 4; k++){ g.fillStyle = ['#5c3927', '#653f2c', '#583626', '#6c4331'][k]; g.fillRect(0, k*h/4, w, h/4); g.fillStyle = '#2a1a12'; g.fillRect(0, k*h/4, w, 1.5); }
      g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .5; g.fillStyle = g.createPattern(BRUSH[2], 'repeat'); g.fillRect(0, 0, w, h); });
    pl.t.wrapS = pl.t.wrapT = THREE.RepeatWrapping; pl.t.repeat.set((x1 - x0)/1.6, 2);
    add(mesh(new THREE.PlaneGeometry(x1 - x0, HS.wallTop), toon('#ffffff', { map: pl.t, ramp: 'soft', rim: 0, hl: 0 }), [(x0 + x1)/2, HS.wallTop/2, BACK + .025], { cast: false }));

    const legs: THREE.BufferGeometry[] = [];
    for (const lx of [-196, 160]){ legs.push(placed(rbox(GU(36), wTop - .04, .07, .015), [W(lx + 18), (wTop - .04)/2, WZ - WD/2 + .07]));
      legs.push(placed(rbox(GU(36), wTop - .04, .07, .015), [W(lx + 18), (wTop - .04)/2, WZ + WD/2 - .07])); }
    legs.push(placed(rbox(GU(452), .04, WD - .12, .01), [WX, gy(POT_Y + 108), WZ]));
    add(mesh(merged(legs), MT.woodD));
    add(mesh(rbox(GU(500), .1, WD, .02), M('woodD', P.woodD, { rep: [6, 1] }), [WX, wTop - .07, WZ]));
    add(mesh(rbox(GU(500), .05, WD + .02, .02), M('wood', P.wood, { rep: [6, 1], hl: .18 }), [WX, wTop - .025, WZ]));
    const under: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 3; k++) under.push(placed(lathe([[0, 0], [.035, 0], [.05, .1], [.056, .1], [.056, .11], [0, .11]], 14), [W(-135 + k*110), gy(POT_Y + 108) + .02, WZ]));
    add(mesh(merged(under), MT.clay, undefined, { cast: false }));
    add(blot(GU(260), .5, .55)).position.set(WX, .003, WZ + .05);
    /* twine, a dish of soil, a brush */
    add(mesh(new THREE.TorusGeometry(GU(14), GU(6), 8, 18), M('cloth', P.cream, { grain: 1 }), [W(-120), wTop + GU(6), WZ + .12], { rot: [Math.PI/2, 0, 0] }));
    add(mesh(lathe([[0, 0], [GU(20), 0], [GU(27), GU(11)], [GU(24), GU(11)], [0, GU(5)]], 18), MT.clay, [W(106), wTop, WZ + .15]));
    add(mesh(new THREE.CircleGeometry(GU(22), 16), toon('#3b2a22', { grain: 0 }), [W(106), wTop + GU(8), WZ + .15], { rot: [-Math.PI/2, 0, 0], cast: false }));
    add(mesh(rbox(GU(44), GU(9), GU(16), .006), MT.wood, [W(-52), wTop + GU(4.5), WZ + .17], { rot: [0, .2, 0] }));
    add(mesh(rbox(GU(16), GU(12), GU(14), .005), toon('#cfae7a', { grain: 1 }), [W(-28), wTop + GU(6), WZ + .18]));
  }
  /* the rack: a rail across the bay, one board per place that has asked */
  const RAIL_Y = gy(POT_Y - 436), RZ = BACK + .2;
  {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(placed(rbox(GU(500), GU(14), .04, .01), [W(-58), RAIL_Y, RZ]));
    for (const x of [-288, 172]) parts.push(placed(rbox(GU(10), H.eave + .1 - RAIL_Y, .03, .008), [W(x), (H.eave + .1 + RAIL_Y)/2, RZ]));
    add(mesh(merged(parts), MT.metalD, undefined, { cast: false }));
    add(mesh(rbox(GU(120), GU(20), .05, .015), MT.brass, [W(-58), RAIL_Y + GU(26), RZ + .01], { cast: false }));
  }
  const BOARD_X = [-244, -122, 0, 122];
  const boards = PORT_ORDER.map((id, k) => {
    /* the group hangs from the top of the board, which is where the 2D room turned it */
    const g = grp(root, [W(BOARD_X[k]), gy(POT_Y - 398), RZ + .03]);
    const hangers: THREE.BufferGeometry[] = [];
    for (const x of [-30, 30]) hangers.push(placed(rbox(GU(5), GU(28), .01, .003), [GU(x), GU(12), -.005]));
    add(mesh(merged(hangers), MT.metalD, undefined, { cast: false }), g);
    const frame = add(mesh(rbox(GU(108), GU(130), .025, .012), MT.wood, [0, -GU(61), 0], { cast: false }), g);
    const tex = liveTex(256, 316, () => {
      const st = orderState(id), d = lastDelivered(id);
      return [st, G.rig ? 1 : 0, G.rig && G.rig.glass ? 1 : 0, G.rig && G.rig.lit ? 1 : 0, d ? d.sp : '', FONT_GEN].join('|');
    }, (c, w) => paintBoard(c, w, id, orderState(id)));
    const face = add(mesh(new THREE.PlaneGeometry(GU(96), GU(118)), toon('#ffffff', { map: tex.t, grain: -1, ramp: 'soft', rim: 0, hl: 0, emissive: '#3a3020', ei: .25 }), [0, -GU(61), .014], { cast: false }), g);
    const labelled = () => { const act = PORT_ORDER.findIndex(x => orderState(x) === 'now'); return k === (act < 0 ? 0 : act); };
    pickable(g, { act: 'gh:board:' + id, key: 'board' + id, inspect: true, label: () => labelled() ? tr('订单板') : null, anchor: new THREE.Vector3(0, -GU(61), .02), r: GU(66) });
    return { id, g, tex, frame, face };
  });
  /* the turntable, the cover shelf, the lamp tray */
  const turn = grp(root, [WX, wTop, WZ + .02]);
  {
    add(mesh(new THREE.CylinderGeometry(GU(74), GU(76), GU(12), 40), MT.brass, [0, GU(6), 0]), turn).scale.z = .9;
    add(mesh(new THREE.CylinderGeometry(GU(62), GU(62), GU(3), 40), M('wood', '#6b4a2a'), [0, GU(13), 0]), turn).scale.z = .9;
    /* a generous grip over the turntable, so the empty table is easy to hit */
    add(new THREE.Mesh(new THREE.CylinderGeometry(GU(88), GU(88), GU(150), 16), new THREE.MeshBasicMaterial({ visible: false })), turn).position.y = GU(80);
    pickable(turn, { act: 'gh:work:plant', label: tr('装配台'), anchor: new THREE.Vector3(0, GU(40), 0), r: GU(80) });
  }
  const rigHold = grp(turn, [0, GU(14), 0]); rigHold.scale.setScalar(1.45);
  const rig = rig3d(rigHold);
  {
    const sh = grp(root, [W(-176), wTop, WZ + .02]);
    add(mesh(rbox(GU(92), GU(10), .22, .01), MT.metalD, [0, GU(5), 0]), sh);
    for (const [dx, sc] of [[-18, .62], [16, .78]] as const){
      const dome = lathe([[GU(38)*sc, 0], [GU(38)*sc, GU(20)*sc], [GU(32)*sc, GU(52)*sc], [GU(20)*sc, GU(72)*sc], [0, GU(78)*sc]], 24);
      add(mesh(dome, MT.glassDome, [GU(dx), GU(10), dx < 0 ? -.04 : .03], { cast: false }), sh);
      add(mesh(new THREE.TorusGeometry(GU(38)*sc, .006, 8, 24), MT.brass, [GU(dx), GU(11), dx < 0 ? -.04 : .03], { rot: [Math.PI/2, 0, 0], cast: false }), sh);
    }
    pickable(sh, { act: 'gh:work:glass', label: tr('罩子架'), anchor: new THREE.Vector3(0, GU(36), 0), r: GU(56) });
    const tr2 = grp(root, [W(146), wTop, WZ + .04]);
    add(mesh(rbox(GU(96), GU(20), .2, .015), MT.metalD, [0, GU(10), 0]), tr2);
    for (let k = 0; k < 3; k++){ const x = GU(-30 + k*30);
      add(mesh(new THREE.CylinderGeometry(GU(9), GU(11), GU(14), 16), MT.brass, [x, GU(26), 0]), tr2);
      add(mesh(new THREE.SphereGeometry(GU(6), 10, 8), toon('#ffe7bd', { grain: -1, emissive: '#ffd59a', ei: .5 }), [x, GU(19), 0], { cast: false }), tr2); }
    pickable(tr2, { act: 'gh:work:lamp', label: tr('灯盘'), anchor: new THREE.Vector3(0, GU(20), 0), r: GU(54) });
  }
  /* the bench lamp on its arm, always burning */
  const benchLamp = (() => {
    const g = grp(root, [0, 0, WZ - .08]);
    add(mesh(new THREE.CylinderGeometry(.05, .06, .02, 16), MT.metalD, [W(236), wTop + .01, 0]), g);
    add(mesh(new THREE.CylinderGeometry(.012, .012, GU(206), 8), MT.metalD, [W(236), wTop + GU(103), 0]), g);
    add(mesh(tube([[W(236), wTop + GU(204), 0], [W(150), wTop + GU(236), .02], [W(56), wTop + GU(210), .04]], .011, 14, 6), MT.metalD), g);
    const shade = grp(g, [W(56), wTop + GU(196), .04]);
    const prof: [number, number][] = [[GU(34), -GU(22)], [GU(30), -GU(12)], [GU(22), GU(2)], [GU(12), GU(12)], [GU(6), GU(18)]];
    add(mesh(lathe(prof, 26), M('brass', MAT.copper.d, { hl: .5, side: THREE.DoubleSide })), shade);
    const inner = toon('#fff1d6', { grain: -1, side: THREE.BackSide, emissive: '#ffcf8f', ei: 1 });
    add(mesh(lathe(prof, 26), inner, undefined, { cast: false }), shade).scale.setScalar(.97);
    add(mesh(new THREE.SphereGeometry(GU(10), 12, 10), toon('#fff6dc', { grain: -1, emissive: '#ffe2b0', ei: 1.1 }), [0, -GU(12), 0], { cast: false }), shade);
    add(glow(SWARM, .55, .55), shade).position.y = -GU(16);
    const spot = add(new THREE.SpotLight(LT.bench.color, LT.bench.spot, LT.bench.distance, LT.bench.angle, LT.bench.penumbra, LT.bench.decay), shade);
    spot.position.y = -GU(14); root.add(spot.target); spot.target.position.set(WX, wTop, WZ + .05);
    const point = add(new THREE.PointLight(LT.bench.color, LT.bench.point, LT.bench.pointDist, LT.bench.decay), root);
    point.position.set(WX + .1, wTop + .75, WZ + .45);
    noRay(g);
    return { spot, point };
  })();
  const slip = slipOnWall(root, GMAP, { dx: 1016, dy: 166, dw: 150, rot: .012, z: BACK + .02, glow: .45 });

  /* ================= THE GROW LAMPS ================= */
  const barMats: THREE.MeshToonMaterial[] = [], barGlows: THREE.Sprite[] = [];
  GROW_BAR.forEach((b, k) => {
    const z = k ? NZ + .3 : BZ + .28, y = gy(161);
    const g = grp(root, [gx(b.x), y, z]);
    const w = GU(b.w);
    add(mesh(rbox(w, GU(30), .11, .03), MT.metalD, [0, 0, 0], { cast: false }), g);
    const tm = toon(P.barOff, { grain: -1, emissive: P.barOn, ei: 0, ramp: 'crisp', hl: .3 }); barMats.push(tm);
    add(mesh(rbox(w - GU(32), GU(8), .06, .02), tm, [0, -GU(13), .01], { cast: false }), g);
    const rod = H.eave + (H.ridge - H.eave)*(z - BACK)/(H.ridgeZ - BACK) - y;
    for (const dx of k ? [-600, -60] : [380, 1120]) add(mesh(new THREE.CylinderGeometry(.006, .006, rod, 5), MT.metalD, [gx(dx) - gx(b.x), rod/2, 0], { cast: false }), g);
    const streak = add(glow(SPINK, 1, 0), g); streak.position.set(0, -GU(16), .06); streak.scale.set(w*1.1, .32, 1); barGlows.push(streak);
    const haze = add(glow(SPINK, 1, 0), g); haze.position.set(0, -.55, .12); haze.scale.set(w*1.05, 1.3, 1); barGlows.push(haze);
    pickable(g, { act: 'gh:lamp', key: 'lamp' + k, label: k ? null : tr('生长灯'), anchor: new THREE.Vector3(0, 0, 0), r: .14 });
  });

  /* ================= THE POTS AND THEIR PLANTS ================= */
  const potProf: [number, number][] = [[0, 0], [31, 0], [32.5, 3], [34.6, 30], [35.4, 35], [36.2, 42], [38.5, 58], [40, 60], [46.5, 60.5], [48, 66], [48, 73], [46.5, 78], [42, 78], [41, 75]];
  const potGeo = lathe(potProf, 36);
  const cardGeo = new THREE.PlaneGeometry(CARD.rect[2], CARD.rect[3]);
  {
    /* a card's normal leans up toward the lamps over it, so the grow bars
       light the plant's face instead of grazing it */
    const n = cardGeo.attributes.normal, v = new THREE.Vector3(0, .42, .9).normalize();
    for (let i = 0; i < n.count; i++) n.setXYZ(i, v.x, v.y, v.z);
  }
  cardGeo.translate(CARD.rect[0] + CARD.rect[2]/2, -(CARD.rect[1] + CARD.rect[3]/2), 0);
  const tagGeo = new THREE.BoxGeometry(44, 22, 1.6); let tagGeoM: THREE.BufferGeometry = tagGeo;
  {
    /* front face (+z) shows the left half of the tag canvas, everything else the cork right half */
    const uv = tagGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++){ const face = Math.floor(i/4); uv.setX(i, face === 4 ? uv.getX(i)*.5 : .5 + uv.getX(i)*.5); }
  }
  /* the stake shares the tag's mesh, its UVs on the cork half */
  {
    const st = new THREE.BoxGeometry(3, 26, 3); placed(st, [-18, -22, 0], [0, 0, 8*D2R]);
    const uv = st.attributes.uv; for (let i = 0; i < uv.count; i++){ uv.setX(i, .9); uv.setY(i, .5); }
    const both = merged([tagGeo.clone(), st]); tagGeo.dispose(); tagGeoM = both;
  }
  const soilGeo = new THREE.CircleGeometry(41.6, 28); soilGeo.rotateX(-Math.PI/2);
  const baseRay = THREE.Mesh.prototype.raycast;
  const RES = CARD.res, CW_ = Math.round(CARD.rect[2]*RES), CH_ = Math.round(CARD.rect[3]*RES);
  const MC = CARD.mask, MW = Math.ceil(CARD.rect[2]/MC), MH = Math.ceil(CARD.rect[3]/MC);
  const maskC = mk(MW*3, MH*3), maskG = maskC.getContext('2d', { willReadFrequently: true });

  const pots = POTS.map((pot, i) => {
    const s = pot.s, sc = s/UNIT, map = pot.k < .97 ? NMAP : GMAP;
    const g = grp(root, [gx(pot.x), gy(pot.y), potZ(i)]); g.scale.setScalar(sc);
    const wig = grp(g);
    const spin = grp(wig);
    /* the pot: one lathe, painted with its colour band and three marks so a turn shows */
    const col = POT_COL[i];
    const potTex = canvasTex(256, 112, (c, w, h) => {
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      const N = potProf.length - 1, row = (k: number) => h*(1 - k/N);
      c.fillStyle = mixHex(col, '#ffffff', .18); c.fillRect(0, row(11), w, row(7) - row(11));
      c.fillStyle = mixHex(col, '#1a2238', .3); c.globalAlpha = .55; c.fillRect(0, row(5), w, row(4) - row(5)); c.globalAlpha = 1;
      c.fillStyle = mixHex(col, '#fff4e0', .45); for (const u of [.08, .41, .74]){ c.beginPath(); c.roundRect(u*w, row(5) + 1, w*.05, row(4) - row(5) - 2, 2); c.fill(); }
      c.fillStyle = mixHex(col, '#141c30', .35); c.fillRect(0, row(1), w, row(0) - row(1));
      c.globalCompositeOperation = 'soft-light'; c.globalAlpha = .5; c.fillStyle = c.createPattern(BRUSH[1], 'repeat'); c.fillRect(0, 0, w, h);
    });
    add(mesh(potGeo, M('ceramic', '#ffffff', { map: potTex.t, hl: .32, hlSize: .1 })), spin);
    /* soil: wet or dry, with the crumbs plantRand() scatters and the cracks of dry earth */
    const soilTex = liveTex(128, 128, () => { const p = G.pots[i]; return p ? (p.water > 0 ? 'w' : 'd') + p.planted : 'e'; }, (c, w) => {
      const p = G.pots[i], k = w/84; c.setTransform(k, 0, 0, k, w/2, w/2);
      c.fillStyle = p && p.water > 0 ? P.soilWet : P.soilDry; c.beginPath(); c.arc(0, 0, 42, 0, 7); c.fill();
      if (p){ const R = plantRand(i);
        for (let q = 0; q < 5; q++){ const px = -30 + R()*60, py = (R() - .5)*40; c.globalAlpha = .7; c.fillStyle = p.water > 0 ? '#3b2a22' : '#6b5140'; c.beginPath(); c.ellipse(px, py, 2.6 + R()*2, 1.6 + R(), 0, 0, 7); c.fill(); }
        c.globalAlpha = 1;
        if (p.water <= 0){ c.fillStyle = '#c9a27a'; c.globalAlpha = .9; c.beginPath(); rr(c, -30, -8, 22, 2.2, 1); rr(c, 6, 10, 24, 2.2, 1); rr(c, -6, 20, 14, 2, 1); c.fill(); c.globalAlpha = 1; } }
    });
    add(mesh(soilGeo, toon('#ffffff', { map: soilTex.t, grain: -1, ramp: 'soft', rim: 0, hl: 0 }), [0, 74.6, 0], { cast: false }), spin);
    /* the seed's tag on its stake */
    const tagTex = liveTex(256, 64, () => (G.pots[i] ? G.pots[i].sp : '') + ':' + FONT_GEN, (c, w, h) => {
      const p = G.pots[i];
      c.fillStyle = MAT.paper.b; c.fillRect(0, 0, w/2, h); c.fillStyle = MAT.cork.b; c.fillRect(w/2, 0, w/2, h); c.fillStyle = '#8a5a44'; c.fillRect(w*.86, 0, w*.08, h);
      c.globalCompositeOperation = 'soft-light'; c.globalAlpha = .4; c.fillStyle = c.createPattern(BRUSH[0], 'repeat'); c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      if (p){ c.save(); c.setTransform(w/2/44, 0, 0, h/22, w/4, h/2); txtFit(c, SEEDS[p.sp].name, 0, 4.5, 40, 12, '#2a3550'); c.restore(); }
    });
    const tagG = grp(spin, [40, 99, 0]); tagG.rotation.z = -8*D2R;
    add(mesh(tagGeoM, toon('#ffffff', { map: tagTex.t, grain: -1, ramp: 'soft', rim: .2, hl: 0 }), [0, 0, 0], { cast: false }), tagG);
    /* the plant: the 2D painting on a card standing in the pot. It turns to
       face the eye about its own stem, and leans, sways and folds about the
       point the 2D room rotated it about (0, -72). */
    const yaw = grp(wig);
    const pivot = grp(yaw, [0, 72, 0]);
    const frame = grp(pivot, [0, -72, 0]);
    const ct = canvasTex(CW_, CH_, () => {});
    ct.t.anisotropy = 2;
    const cardMat = toon('#ffffff', { map: ct.t, grain: -1, ramp: 'soft', rim: .35, hl: 0, transparent: true, side: THREE.DoubleSide, emissive: '#000000' });
    cardMat.alphaTest = .08; cardMat.emissiveMap = ct.t; cardMat.emissive.set('#ffffff'); cardMat.emissiveIntensity = .08;
    const card = add(mesh(cardGeo, cardMat, [0, 0, 0], { cast: true, receive: false }), frame);
    card.renderOrder = 2;
    /* the parts of the card with nothing painted on them let a tap through */
    const mask = new Uint8Array(MW*MH);
    card.raycast = function(rc, out){ const tmp: THREE.Intersection[] = []; baseRay.call(this, rc, tmp);
      for (const it of tmp){ if (!it.uv) continue; const mx = Math.min(MW - 1, Math.floor(it.uv.x*MW)), my = Math.min(MH - 1, Math.floor((1 - it.uv.y)*MH)); if (mask[my*MW + mx]) out.push(it); } };
    const cardPlane = () => { card.updateWorldMatrix(true, false); const n = new THREE.Vector3(0, 0, 1).transformDirection(card.matrixWorld), o = new THREE.Vector3().setFromMatrixPosition(frame.matrixWorld); return new THREE.Plane().setFromNormalAndCoplanarPoint(n, o); };
    const toFrame = (pt: THREE.Vector3) => { const l = frame.worldToLocal(pt.clone()); return { x: l.x, y: -l.y }; };
    pickable(card, { act: 'gh:plant:' + i, key: 'plant' + i, label: i === 0 ? tr('植物') : null, plane: cardPlane, toLocal: toFrame,
      cur: () => S.spray ? 'crosshair' : 'pointer', anchor: new THREE.Vector3(0, 115, 0), r: .16*s });
    /* the pot's own pick: a plane through its axis facing the room */
    const potHit = add(new THREE.Mesh(new THREE.CylinderGeometry(50, 40, 84, 12), new THREE.MeshBasicMaterial({ visible: false })), wig);
    potHit.position.y = 40;
    const potPlane = () => { g.updateWorldMatrix(true, false); const o = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld); return new THREE.Plane(new THREE.Vector3(0, 0, 1), -o.z); };
    const toPot = (pt: THREE.Vector3) => { const l = g.worldToLocal(pt.clone()); return { x: l.x, y: -l.y }; };
    pickable(wig, { act: 'gh:pot:' + i, key: 'pot' + i, label: i === 0 || i === 5 ? tr('花盆') : null, plane: potPlane, toLocal: toPot,
      cur: () => S.spray ? 'crosshair' : 'pointer', anchor: new THREE.Vector3(0, 40, 0), r: .17*s });
    return { i, g, wig, spin, yaw, pivot, frame, card, ct, mask, soilTex, tagTex, tagG, map, sig: '', shape: '' };
  });
  /* the pots' contact shadows, one mesh */
  {
    const q: THREE.BufferGeometry[] = POTS.map((pot, i) => placed(new THREE.PlaneGeometry(GU(112*pot.s), GU(60*pot.s)), [gx(pot.x), gy(pot.y) + .002, potZ(i)], [-Math.PI/2, 0, 0]));
    const m = add(noRay(mesh(merged(q), new THREE.MeshBasicMaterial({ map: spriteTex(SHADE), transparent: true, opacity: .55, depthWrite: false, toneMapped: false }), undefined, { cast: false, receive: false })));
    m.renderOrder = 1;
  }
  /* bloom glows: every lit flower in the house is a point in one of two clouds
     (a small coloured core and a soft white halo), placed each frame from
     S.bloomPts through its pot's leaning frame */
  const MAXB = 40;
  const bloomCloud = (size: number, opacity: number, tex: HTMLCanvasElement) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXB*3), 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAXB*3), 3));
    geo.setDrawRange(0, 0);
    const m = new THREE.PointsMaterial({ map: spriteTex(tex), size, sizeAttenuation: true, vertexColors: true, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const pts = add(noRay(new THREE.Points(geo, m))); pts.frustumCulled = false; pts.renderOrder = 3;
    return pts;
  };
  const bloomCore = bloomCloud(GU(64), .8, SOFT), bloomHalo = bloomCloud(GU(190), .16, SOFT);
  const C_WARM = new THREE.Color('#f2a95b'), C_COOL = new THREE.Color('#b9d6ee'), C_HALO = new THREE.Color('#fff1d8');

  /* paint a plant card: the 2D drawPlantP into the pot's frame */
  function paintCard(P0: typeof pots[number], withMask: boolean){
    const g = P0.ct.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CW_, CH_);
    g.setTransform(RES, 0, 0, RES, -CARD.rect[0]*RES, -CARD.rect[1]*RES);
    drawPlantP(g, P0.i);
    g.setTransform(1, 0, 0, 1, 0, 0); P0.ct.t.needsUpdate = true;
    if (!withMask) return;
    /* read the painting back at mask resolution (x3), from a small canvas made for reading */
    maskG.setTransform(1, 0, 0, 1, 0, 0); maskG.clearRect(0, 0, MW*3, MH*3); maskG.drawImage(P0.ct.c, 0, 0, MW*3, MH*3);
    const im = maskG.getImageData(0, 0, MW*3, MH*3).data, m = P0.mask, raw = new Uint8Array(MW*MH);
    for (let y = 0; y < MH*3; y++) for (let x = 0; x < MW*3; x++) if (im[(y*MW*3 + x)*4 + 3] > 24) raw[Math.floor(y/3)*MW + Math.floor(x/3)] = 1;
    /* grown a little, so a tap that lands between two leaves still finds the plant */
    m.fill(0);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (raw[y*MW + x]) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++){ const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < MW && yy < MH) m[yy*MW + xx] = 1; }
    /* and the stem's foot is always there, for a seedling */
    for (let y = Math.floor((-150 - CARD.rect[1])/MC); y < MH; y++) for (let x = Math.floor((-40 - CARD.rect[0])/MC); x <= Math.floor((40 - CARD.rect[0])/MC); x++) m[y*MW + x] = 1;
  }

  /* ================= THE SEED BOX AND THE CAN, ON THE BENCH ENDS ================= */
  const seedBox = (() => {
    const g = grp(root, [gx(GH3.bench.seeds), benchTop, BZ + .08]); g.rotation.y = .18;
    const bw = .34, bd = .24, bh = .11;
    add(mesh(rbox(bw, .02, bd, .006), MT.wood, [0, .01, 0]), g);
    for (const [x, z, w, d] of [[0, bd/2, bw, .02], [0, -bd/2, bw, .02], [bw/2, 0, .02, bd], [-bw/2, 0, .02, bd]] as const)
      add(mesh(rbox(w, bh, d, .006), MT.wood, [x, bh/2, z]), g);
    const label = canvasTex(256, 64, (c, w, h) => { c.fillStyle = MAT.woodD.b; c.fillRect(0, 0, w, h); c.globalAlpha = .4; c.globalCompositeOperation = 'soft-light'; c.fillStyle = c.createPattern(BRUSH[2], 'repeat'); c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; txtFit(c, tr('种子'), w/2, h*.7, w*.85, 36, '#e8f2ee'); });
    add(mesh(new THREE.PlaneGeometry(.18, .045), M('wood', '#ffffff', { map: label.t }), [0, bh*.55, bd/2 + .012], { cast: false }), g);
    const packets = new THREE.InstancedMesh(rbox(.085, .12, .012, .004), M('paper', '#ffffff', { hl: .1 }), 6);
    Object.values(SEEDS).forEach((sd: any, j) => {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(-.1 + (j % 3)*.1, .08, -.055 + Math.floor(j/3)*.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(-.35, 0, (j - 2.5)*.04)), new THREE.Vector3(1, 1, 1));
      packets.setMatrixAt(j, m); packets.setColorAt(j, new THREE.Color(sd.color));
    });
    packets.castShadow = true; add(packets, g);
    add(blot(.24, .17, .5), g).position.y = .002;
    pickable(g, { act: 'gh:seeds', label: tr('种子盒'), anchor: new THREE.Vector3(0, .07, 0), r: .17 });
    return g;
  })();
  /* the can, standing on the ledge, or in your hand */
  const makeCan = (parent: THREE.Object3D, s: number) => {
    const g = grp(parent); g.scale.setScalar(s);
    add(mesh(lathe([[0, 0], [GU(30), 0], [GU(28), GU(50)], [GU(26), GU(68)], [GU(14), GU(80)], [0, GU(82)]], 24), M('ceramic', P.rose, { hl: .45 })), g);
    add(mesh(rbox(GU(16), GU(26), GU(16), .006), MT.metal, [0, GU(92), 0]), g);
    add(mesh(rbox(GU(30), GU(9), GU(9), .004), MT.metal, [GU(18), GU(100), 0]), g);
    add(mesh(new THREE.TorusGeometry(GU(20), GU(5), 8, 16, Math.PI), M('ceramic', P.rose), [-GU(28), GU(38), 0], { rot: [0, 0, Math.PI/2] }), g);
    return g;
  };
  const canSpot = grp(root, [gx(GH3.bench.spray), benchTop, BZ + .06]);
  const can = makeCan(canSpot, .9); can.rotation.y = -.5;
  add(blot(.16, .1, .5), can).position.y = .002;
  pickable(can, { act: 'gh:spray', label: tr('喷壶'), anchor: new THREE.Vector3(0, GU(50), 0), r: .16 });
  /* while the can is in hand its spot on the ledge is where it goes back */
  const dropPad = grp(canSpot);
  add(mesh(new THREE.RingGeometry(.1, .125, 32), flatMat('#ffd9a3', { opacity: .45 }), [0, .004, 0], { rot: [-Math.PI/2, 0, 0], cast: false, receive: false }), dropPad);
  add(new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .3, 12), new THREE.MeshBasicMaterial({ visible: false })), dropPad).position.y = .15;
  pickable(dropPad, { act: 'gh:spray', key: 'sprayDrop', label: tr('放下喷壶'), anchor: new THREE.Vector3(0, .1, 0), r: .16 });
  const handCan = noRay(makeCan(root, .62)); handCan.visible = false;

  /* ---- the decoration, now that everything has added its leaves and stems ---- */
  {
    const im = add(noRay(new THREE.InstancedMesh(leafGeo, MT.leaf, leaves.length)));
    leaves.forEach((l, k) => { im.setMatrixAt(k, l.m); im.setColorAt(k, l.c); });
    im.castShadow = false; im.receiveShadow = true;
    add(noRay(mesh(merged(stems), MT.stem, undefined, { cast: false })));
  }

  /* ================= DROPS ON THE GLASS ================= */
  /* S.drops, in design units on the glass: one point cloud */
  const dropTex = canvasTex(64, 64, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 44); gr.addColorStop(0, 'rgba(230,244,255,0)'); gr.addColorStop(1, 'rgba(230,244,255,.35)'); g.fillStyle = gr; g.fillRect(31, 0, 2.5, 46);
    g.fillStyle = 'rgba(230,244,255,.9)'; g.beginPath(); g.ellipse(32, 52, 5, 7, 0, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(30.5, 49.5, 1.8, 0, 7); g.fill();
  });
  const MAXD = 20;
  const drops = (() => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXD*3), 3)); geo.setDrawRange(0, 0);
    const pts = add(noRay(new THREE.Points(geo, new THREE.PointsMaterial({ map: dropTex.t, size: GU(26), sizeAttenuation: true, transparent: true, opacity: .6, depthWrite: false, toneMapped: false }))));
    pts.frustumCulled = false; return pts;
  })();

  /* ================= LIGHT ================= */
  const hemi = add(new THREE.HemisphereLight(LT.hemiSky, LT.hemiGround, LT.hemi[1]), scene);
  const moon = add(new THREE.DirectionalLight(LT.moon.color, LT.moon.intensity[1]), scene);
  moon.position.set(-3.5, 6, -8); moon.target.position.set(0, .8, -1); scene.add(moon.target);
  const growSpot = add(new THREE.SpotLight(LT.grow.color, 0, LT.grow.distance, LT.grow.angle, LT.grow.penumbra, LT.grow.decay));
  growSpot.position.set(gx(750), gy(150), BZ + .55); growSpot.target.position.set(gx(750), benchTop, BZ - .25); root.add(growSpot.target);
  growSpot.castShadow = true; growSpot.shadow.mapSize.set(1024, 1024); growSpot.shadow.bias = -.0008; growSpot.shadow.normalBias = .02; growSpot.shadow.radius = 5;
  growSpot.shadow.camera.near = .2; growSpot.shadow.camera.far = 6;
  const growPts = [gx(750) - 1.35, gx(750) + 1.35].map(x => { const l = add(new THREE.PointLight(LT.grow.color, 0, LT.grow.pointDist, LT.grow.decay)); l.position.set(x, gy(175), BZ + .35); return l; });
  const nurseryPt = add(new THREE.PointLight(LT.grow.color, 0, LT.grow.pointDist, LT.grow.decay)); nurseryPt.position.set(gx(-330), gy(180), NZ + .55);
  const hand = add(new THREE.PointLight(LT.hand.color, 0, LT.hand.distance, LT.hand.decay));
  const handGlow = add(glow(SWARM, GU(120), 0));

  /* ================= GREEN_SPACE, answered from the camera ================= */
  const gPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -Z.garden), nPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -Z.nursery);
  let handPt: THREE.Vector3 | null = null, wantBench = false;
  GREEN_SPACE.cursor = () => {
    let p = pointerOn(gPlane); if (!p){ handPt = null; return null; }
    let d = GMAP.toDesign(p);
    if (d.x < 100){ const q = pointerOn(nPlane); if (q){ p = q; d = NMAP.toDesign(q); } }
    handPt = p; return d;
  };
  GREEN_SPACE.end = () => { const v = activeView(); return v === 'nursery' ? 'nursery' : v === 'bench' ? 'bench' : null; };
  GREEN_SPACE.toBench = () => { wantBench = true; };

  /* ================= PER FRAME ================= */
  const tmpV = new THREE.Vector3(), tmpW = new THREE.Vector3();
  function sync(dt: number){
    const L = S.lampK ?? (G.growLamp ? 1 : 0), red = !!G.reduced;
    hemi.intensity = LT.hemi[0] + (LT.hemi[1] - LT.hemi[0])*L;
    moon.intensity = LT.moon.intensity[0] + (LT.moon.intensity[1] - LT.moon.intensity[0])*L;
    growSpot.intensity = LT.grow.spot*L; growPts.forEach(l => { l.intensity = LT.grow.point*L; }); nurseryPt.intensity = LT.grow.nursery*L;
    barMats.forEach(m => { m.emissiveIntensity = .15 + 1.1*L; m.color.set(L > .5 ? P.barOn : P.barOff); });
    barGlows.forEach(s => { s.visible = L > .01; s.material.opacity = (s.scale.y > 1 ? .1 : .55)*L; });
    twinkle.forEach((m, k) => { m.opacity = .45 + .45*Math.sin(S.T*(.9 + k*.37) + k*2.1); });

    /* the hand: a small warm light where the pointer is over the plants, when the bars are off */
    const still = Math.min(1, PR.stillT/3);
    if (handPt && L < .95 && !S.drag){
      const toCam = tmpV.copy(camera.position).sub(handPt).normalize();
      hand.position.copy(handPt).addScaledVector(toCam, .3);
      hand.intensity = LT.hand.intensity*(1 - L)*(.55 + .45*still);
      handGlow.position.copy(handPt).addScaledVector(toCam, .05); handGlow.material.opacity = (1 - L)*(.25 + .2*still);
    } else { hand.intensity = 0; handGlow.material.opacity = 0; }
    hand.intensity = Math.max(0, hand.intensity);
    /* the can in hand follows the pointer */
    handCan.visible = !!(S.spray && handPt);
    if (handCan.visible){ tmpV.copy(camera.position).sub(handPt).normalize(); handCan.position.copy(handPt).addScaledVector(tmpV, .45).add(tmpW.set(GU(26), -GU(34), 0)); handCan.rotation.set(0, -.4, -.3); }
    can.visible = !S.spray; dropPad.visible = !!S.spray;

    /* the pots */
    let nb = 0;
    const corePos = bloomCore.geometry.attributes.position as THREE.BufferAttribute, haloPos = bloomHalo.geometry.attributes.position as THREE.BufferAttribute;
    const coreCol = bloomCore.geometry.attributes.color as THREE.BufferAttribute, haloCol = bloomHalo.geometry.attributes.color as THREE.BufferAttribute;
    for (const pv of pots){
      const i = pv.i, pot = POTS[i], p = G.pots[i];
      pv.soilTex.tick(); pv.tagTex.tick();
      const wg = S.potWig[i] || 0;
      pv.wig.rotation.z = -Math.sin(wg*Math.PI*3)*4*wg*D2R;
      pv.spin.rotation.y = S.potSpin[i] || 0;
      pv.tagG.visible = !!p;
      pv.yaw.visible = !!p;
      if (!p){ S.bloomPts[i] = null; pv.sig = ''; continue; }
      /* turn the card about its stem to face the eye */
      pv.g.getWorldPosition(tmpV);
      pv.yaw.rotation.y = Math.atan2(camera.position.x - tmpV.x, camera.position.z - tmpV.z);
      const f = S.fold[i] || 0, sway = Math.sin(S.T*.7 + i)*1.2*(red ? .2 : 1);
      const lean = p.lean*10 + (S.curLean[i] || 0) + (S.potSpin[i] || 0)*14;
      pv.pivot.rotation.z = -(lean + sway - f*6*(S.foldPt[i] || 0))*D2R;
      pv.pivot.scale.set(1 - f*.16, 1 - f*.1, 1);
      /* repaint only when the plant itself changes: its growth (in steps),
         its water, its bloom, a fresh planting -- or while a bell swings */
      const gq = Math.round(clamp(p.g, 0, 1)/CARD.grow), shape = [p.sp, gq, p.water > 0 ? 1 : 0, bloomReady(p) ? 1 : 0, p.planted].join('|');
      const sw = S.bellSwing && S.bellSwing.i === i ? Math.round(S.bellSwing.t*30) : -1;
      const sig = shape + '|' + sw;
      if (sig !== pv.sig){ pv.sig = sig; const newShape = shape !== pv.shape; pv.shape = shape; paintCard(pv, newShape); }
      const pts = S.bloomPts[i], warm = p.sp === 'vine' || p.sp === 'lamp';
      if (pts) for (const [bx, by] of pts){
        if (nb >= MAXB) break;
        tmpW.set(bx, -by, 4); pv.frame.localToWorld(tmpW);
        const tw = .85 + .15*Math.sin(S.T*1.7 + nb);
        corePos.setXYZ(nb, tmpW.x, tmpW.y, tmpW.z); haloPos.setXYZ(nb, tmpW.x, tmpW.y, tmpW.z);
        const c = warm ? C_WARM : C_COOL; coreCol.setXYZ(nb, c.r*tw, c.g*tw, c.b*tw); haloCol.setXYZ(nb, C_HALO.r*tw, C_HALO.g*tw, C_HALO.b*tw);
        nb++;
      }
    }
    bloomCore.geometry.setDrawRange(0, nb); bloomHalo.geometry.setDrawRange(0, nb);
    for (const a of [corePos, haloPos, coreCol, haloCol]) a.needsUpdate = true;
    /* the drops running down the glass */
    const dn = Math.min(MAXD, S.drops.length), dp = drops.geometry.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < dn; k++){ const d = S.drops[k]; dp.setXYZ(k, gx(d.x), gy(d.y) + GU(8), BACK - .005); }
    dp.needsUpdate = true; drops.geometry.setDrawRange(0, dn);

    /* the workshop */
    boards.forEach(b => {
      b.tex.tick();
      const st = orderState(b.id);
      b.g.rotation.z = -(st === 'now' ? 0 : st === 'open' ? .055 : -.03);
      b.frame.material = st === 'open' ? MT.woodD : MT.wood;
    });
    rig.sync(G.rig && !G.rig.lit ? G.rig : null);
    benchLamp.spot.intensity = LT.bench.spot; benchLamp.point.intensity = LT.bench.point;
    slip.redraw();

  }

  const V = GH3.views;
  const views: View[] = [
    { id: 'garden', label: tr('种植区'), ...V.garden },
    { id: 'nursery', label: tr('育苗区'), ...V.nursery },
    { id: 'bench', label: tr('装配台'), ...V.bench }
  ];
  return {
    scene, views, sync,
    fxAt(k, x, y){ const z = k < .97 ? Z.nursery : Z.garden; return [new THREE.Vector3(gx(x), gy(y), z + .18), 1/UNIT]; },
    enter(){
      for (const pv of pots){ pv.sig = ''; pv.shape = ''; }
      boards.forEach(b => b.tex.reset());
      /* rooms/green.ts asked for the bench (the job is building): go there now,
         before the first frame, rather than flying across the house */
      if (wantBench){ wantBench = false; const t = S.trans; S.trans = false; try { goView('bench', { instant: true }); } finally { S.trans = t; } }
    },
    dispose(){ GREEN_SPACE.cursor = DEFAULT_SPACE.cursor; GREEN_SPACE.end = DEFAULT_SPACE.end; GREEN_SPACE.toBench = DEFAULT_SPACE.toBench; }
  };
}

/* ---- an order board's face, as drawBoard() in rooms/green.ts paints it ----
   The canvas covers the cream panel, design rect [-48, 2, 96, 118]. */
function markIcon(c: CanvasRenderingContext2D, x: number, kind: number, col: string){
  vol(c, cc => ell(cc, x, 0, 13, 13), MAT.dark, { k: .8, s: 2, tex: 0 });
  if (kind === 0) flat(c, cc => leafPath(cc, x, 7, x, -7, 4, 0), col);
  if (kind === 1) flat(c, cc => { cc.moveTo(x - 8, 7); cc.bezierCurveTo(x - 8, -6, x + 8, -6, x + 8, 7); cc.closePath(); }, col);
  if (kind === 2) flat(c, cc => { rr(cc, x - 5, -7, 10, 7, 2.5); ell(cc, x, 3, 4, 4); }, col);
}
function paintBoard(c: CanvasRenderingContext2D, w: number, id: string, st: string){
  const Pt = PORTS[id], done = st === 'done', open = st === 'open', nowB = st === 'now';
  const have = nowB ? [!!G.rig, !!(G.rig && G.rig.glass), !!(G.rig && G.rig.lit)] : done ? [true, true, true] : [false, false, false];
  const k = w/96; c.setTransform(k, 0, 0, k, 48*k, -2*k);
  vol(c, cc => rr(cc, -48, 2, 96, 118, 4), open ? { l: '#9c8d74', b: '#82755f', d: '#5a5141', r: '#a79880' } : MAT.cream, { k: .8, s: 2, r: .8, tex: .4 });
  if (open){ for (let q = 0; q < 4; q++) flat(c, cc => rr(cc, -36, 30 + q*22, 72, 2.4, 1.2), '#6b6150', .5); return; }
  flat(c, cc => rr(cc, -40, 10, 80, 7, 3.5), Pt.look.lamp, .95);
  txtFit(c, Pt.name, 0, 46, 80, 21, '#36301f');
  c.save(); c.translate(0, 86); have.forEach((on, q) => markIcon(c, -28 + q*28, q, on ? '#ffd9a3' : '#49423a')); c.restore();
  if (done){ const d = lastDelivered(id);
    c.save(); c.globalAlpha = .45; vol(c, cc => rr(cc, -48, 2, 96, 118, 4), MAT.dark, { k: .5, s: 1.4, tex: 0 }); c.restore();
    if (d && SEEDS[d.sp]){ flat(c, cc => stemPath(cc, 30, 40, 32, 32, 30, 24, 1.4, .8), '#4f8f7a');
      flat(c, cc => leafPath(cc, 30, 38, 42, 26, 5, 2.5), SEEDS[d.sp].color, .95);
      flat(c, cc => leafPath(cc, 30, 34, 19, 23, 4.4, -2.2), SEEDS[d.sp].color, .75); } }
}

register3D({ id: 'green', build });

/* For checking scripts: where a pot or a design point is on screen. Dev builds only. */
if (import.meta.env.DEV) (window as any).__green3d = {
  potScreen(i: number, dy = -40){
    const pot = POTS[i], v = new THREE.Vector3(gx(pot.x), gy(pot.y + dy*pot.s), potZ(i)).project(camera);
    return { X: (v.x + 1)/2*(window as any).__three.CW(), Y: (1 - v.y)/2*(window as any).__three.CH() };
  }
};
