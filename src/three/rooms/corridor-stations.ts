import * as THREE from 'three';
import { tr } from '../../i18n';
import { SAMBER, SIND, SOFT, SPINK, SROSE, STEAL, SWARM, shadow, txt, txtFit, vol, rr, ell } from '../../core/paint';
import { MAT } from '../../core/materials';
import { hhmm, mixHex, ymd } from '../../core/util';
import { callPort, docked } from '../../rooms/hatch';
import { spr } from '../../core/paint';
import { PORTS } from '../../data/ports';
import { ROUTE_SKY } from '../../rooms/cabin';
import { OUT } from '../../rooms/outside';
import { buildLandmark } from '../landmarks';
import { liveTex } from '../kit';
import { dirOf } from './corridor-kit';
import { mulberry32 } from '../../core/util';
import { S } from '../../state/runtime';
import { G } from '../../state/store';
import { now } from '../../state/time';
import { logLines } from '../../ui/log';
import { drawSlip, slipH, voyageSlip, workSlip, type Slip } from '../../ui/sheet';
import { RING3 } from '../config/corridor';
import { FONT_GEN, pickable } from '../engine';
import { M, add as addTo, blot, canvasTex, flatMat, glow, mesh, noRay, rbox, slab, spriteTex, texOf, toon, tube } from '../kit';
import { D2R, L, X, Y, bend, dArch, dPlane, dRR, designTex, paperMat, tangent, wallFrame } from './corridor-kit';
import { mk } from '../../core/util';

/* ================= THE NINE STATIONS =================
   Each builder takes a RING entry and returns its group (in the station's
   frame on the outer wall) and a sync() for the state it paints. The 2D
   sprite numbers are kept as they were in rooms/corridor.ts (stationArt,
   ringStationLive, drawBigWindow), so a reader can hold the two side by side. */
const PAL = RING3.palette, H = RING3.ring.h;

export interface Mats { frame: THREE.Material; metal: THREE.Material; metalD: THREE.Material; brass: THREE.Material; paper: THREE.Material;
  woodD: THREE.Material; rose: THREE.Material; dark: THREE.Material; leaf: THREE.Material; cream: THREE.Material }
export interface Station { st: any; g: THREE.Group; sync(dt: number): void; dispose?(): void }
type Tick = { tick(force?: boolean): boolean };

const box = (dx: number, dy: number, dw: number, dh: number, depth: number, z: number, mat: THREE.Material, r = .012) =>
  mesh(rbox(L(dw), L(dh), depth, r), mat, [X(dx + dw/2), Y(dy + dh/2), z + depth/2]);
const at = (o: THREE.Object3D, dx: number, dy: number, z: number) => { o.position.set(X(dx), Y(dy), z); return o; };
const quadPts = (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, z: number, n = 10) => {
  const out: [number, number, number][] = [];
  for (let i = 0; i <= n; i++){ const t = i/n, a = (1 - t)*(1 - t), b = 2*(1 - t)*t, c = t*t; out.push([X(a*x0 + b*cx + c*x1), Y(a*y0 + b*cy + c*y1), z]); }
  return out;
};
const ellipsoid = (geo: THREE.BufferGeometry, mat: THREE.Material, dx: number, dy: number, rx: number, ry: number, rot: number, z: number) => {
  const m = mesh(geo, mat, [X(dx), Y(dy), z], { cast: false }); m.scale.set(L(rx), L(ry), .012); m.rotation.z = -rot; return m;
};

/* ---------------- the room doors ---------------- */
export function door(root: THREE.Object3D, st: any, m: Mats): Station {
  const g = wallFrame(root, st.ang), ticks: Tick[] = [];
  const band = new THREE.Shape();
  { /* the frame: an inverted U, outer arch r136 about (800,392), inner r110 about (800,402) */
    const ro = L(136), ri = L(110);
    band.moveTo(X(664), Y(780)); band.lineTo(X(690), Y(780)); band.lineTo(X(690), Y(402));
    band.absarc(X(800), Y(402), ri, Math.PI, 0, true); band.lineTo(X(910), Y(780)); band.lineTo(X(936), Y(780));
    band.lineTo(X(936), Y(392)); band.absarc(X(800), Y(392), ro, 0, Math.PI, false); band.lineTo(X(664), Y(780));
  }
  g.add(mesh(slab(band, .07, .014, 24), m.frame, [0, 0, .004]));
  g.add(noRay(mesh(new THREE.ShapeGeometry(dArch(690, 910, 780, 402), 20), flatMat('#0f1729', { opacity: .55 }), [0, 0, .006], { cast: false, receive: false })));
  const leafMat = M('wood', st.color, { grain: 1, rep: [1, 2], hl: .14, hlSize: .22 });
  g.add(mesh(slab(dArch(694, 906, 780, 406), .04, .012, 20), leafMat, [0, 0, .012]));
  const LF = .066;    // the leaf's face
  { const groove = new THREE.Shape(); groove.moveTo(X(716), Y(764)); groove.lineTo(X(722), Y(764)); groove.lineTo(X(722), Y(422));
    groove.absarc(X(800), Y(422), L(78), Math.PI, 0, true); groove.lineTo(X(878), Y(764)); groove.lineTo(X(884), Y(764)); groove.lineTo(X(884), Y(420));
    groove.absarc(X(800), Y(420), L(84), 0, Math.PI, false); groove.lineTo(X(716), Y(764));
    g.add(noRay(mesh(new THREE.ShapeGeometry(groove, 20), flatMat('#0b1222', { opacity: .22 }), [0, 0, LF + .001], { cast: false, receive: false }))); }
  g.add(box(716, 700, 168, 50, .014, LF - .004, M('wood', mixHex(st.color, '#1a2238', .22), { grain: 1, hl: .08 })));
  /* the round window, lit from the room behind */
  const win = new THREE.Group(); at(win, 800, 440, LF); g.add(win);
  win.add(mesh(new THREE.TorusGeometry(L(35.5), L(4.8), 10, 36), m.metalD, [0, 0, .006], { cast: false }));
  const glassMat = toon('#3a2a24', { grain: -1, emissive: '#f2a95b', ei: .7, ramp: 'crisp', hl: .5 });
  win.add(mesh(new THREE.CircleGeometry(L(31), 32), glassMat, [0, 0, .002], { cast: false }));
  const hl = noRay(mesh(new THREE.CircleGeometry(1, 16), flatMat('#ffffff', { opacity: .2 }), [L(-12), L(16), .004], { cast: false, receive: false }));
  hl.scale.set(L(12), L(6), 1); hl.rotation.z = .6; win.add(hl);
  const halo = glow(SWARM, L(150), .35); halo.position.set(0, 0, .06); win.add(halo);
  g.add(box(864, 572, 16, 48, .05, LF, m.brass, .008));
  /* the name plate */
  g.add(box(720, 300, 160, 56, .02, LF, m.paper, .01));
  const plate = designTex([720, 300, 160, 56], 5, () => st.name, (c) => {
    txtFit(c, st.name, 800, 332, 148, 25, PAL.ink); txt(c, st.en, 800, 348, 10, PAL.pencil, { mono: true, ls: 3 }); });
  ticks.push(plate);
  g.add(mesh(dPlane(160, 56), paperMat(plate.t, .35), [X(800), Y(328), LF + .021], { cast: false }));
  g.add(box(684, 770, 232, 16, .16, 0, m.woodD, .02));
  addTo(blot(L(170), .22, .5), g).position.set(0, .003, .2);

  let air: THREE.Sprite | null = null, airMat: THREE.Material | null = null, airTex: ReturnType<typeof designTex> | null = null;
  if (st.id === 'cabin'){
    g.add(box(768, 470, 64, 24, .012, LF, m.cream, .008));
    const t = designTex([768, 470, 64, 24], 6, () => '07', (c) => txt(c, '07', 800, 488, 15, PAL.pencil, { mono: true }));
    ticks.push(t); g.add(mesh(dPlane(64, 24), paperMat(t.t, .3), [X(800), Y(482), LF + .013], { cast: false }));
  }
  if (st.id === 'galley'){
    g.add(mesh(tube(quadPts(700, 360, 800, 276, 900, 360, LF + .03), L(2.4), 16, 5), M('leaf', PAL.leaf2), undefined, { cast: false }));
    const lg = new THREE.SphereGeometry(1, 10, 6);
    ([[714, 352, -.6], [742, 338, -.3], [772, 328, -.1], [828, 328, .1], [858, 338, .3], [886, 352, .6]] as const).forEach(([x, y, a]) => g.add(ellipsoid(lg, m.leaf, x, y, 12, 6, a, LF + .035)));
    g.add(at(mesh(new THREE.SphereGeometry(L(9), 14, 10), toon(PAL.amber, { grain: -1, emissive: '#f2a95b', ei: .35, ramp: 'crisp', hl: .5 }), undefined, { cast: false }), 800, 324, LF + .04));
  }
  if (st.id === 'green'){
    const vm = M('leaf', PAL.vine);
    g.add(mesh(tube(quadPts(676, 640, 660, 470, 720, 330, .09), L(2.2), 16, 5), vm, undefined, { cast: false }));
    g.add(mesh(tube(quadPts(930, 610, 948, 460, 880, 330, .09), L(2.2), 16, 5), vm, undefined, { cast: false }));
    const lg = new THREE.SphereGeometry(1, 10, 6);
    ([[672, 560, -.3], [664, 620, .3], [688, 450, -.6], [714, 360, -.9], [936, 520, .4], [940, 580, -.2], [920, 420, .6], [888, 350, .9]] as const).forEach(([x, y, a]) => g.add(ellipsoid(lg, m.leaf, x, y, 10, 20, a, .1)));
  }
  if (st.id === 'radio'){
    g.add(box(797, 214, 6, 44, .02, .02, m.metal, .004));
    g.add(mesh(tube(quadPts(800, 214, 784, 206, 768, 200, .03, 4), L(1.6), 6, 4), m.metal, undefined, { cast: false }));
    g.add(mesh(tube(quadPts(800, 214, 816, 206, 832, 200, .03, 4), L(1.6), 6, 4), m.metal, undefined, { cast: false }));
    g.add(at(mesh(new THREE.SphereGeometry(L(6), 12, 8), m.rose, undefined, { cast: false }), 800, 210, .03));
    g.add(box(842, 476, 70, 24, .02, LF, m.dark, .01));
    airTex = designTex([842, 476, 70, 24], 6, () => (G.radioOn || G.wind > 0) ? '1' : '0', (c) => {
      const on = G.radioOn || G.wind > 0; txt(c, 'ON AIR', 877, 493, 11, on ? '#ffb4a6' : '#5a4a5a', { mono: true, ls: 1 }); });
    ticks.push(airTex);
    airMat = new THREE.MeshBasicMaterial({ map: airTex.t, transparent: true, toneMapped: false });
    g.add(mesh(dPlane(70, 24), airMat, [X(877), Y(488), LF + .021], { cast: false, receive: false }));
    air = glow(SROSE, L(92), 0); air.position.set(X(877), Y(488), LF + .05); g.add(air);
  }
  pickable(g, { act: 'go:' + st.go, label: st.label, anchor: new THREE.Vector3(0, Y(470), .1), r: .5 });
  let lastGrow: boolean | null = null;
  return { st, g, sync(){
    for (const t of ticks) t.tick();
    if (st.id === 'green'){
      const grow = !!G.growLamp;
      if (grow !== lastGrow){ lastGrow = grow; const col = grow ? '#ff9fbf' : '#62b0a8';
        glassMat.emissive.set(col); halo.material.map = spriteTex(grow ? SPINK : STEAL); }
      halo.material.opacity = grow ? .55 : .35; glassMat.emissiveIntensity = grow ? 1.05 : .8;
    }
    if (air){ const on = G.radioOn || G.wind > 0; air.material.opacity = on ? .7 : 0; }
  } };
}

/* ---------------- the gangway: hull, not joinery ---------------- */
export function gangway(root: THREE.Object3D, st: any, m: Mats): Station {
  const g = wallFrame(root, st.ang), ticks: Tick[] = [];
  const fr = dRR(648, 330, 304, 452, 40); fr.holes.push(dRR(690, 372, 220, 368, 26));
  g.add(mesh(slab(fr, .09, .016, 12), m.frame, [0, 0, .004]));
  const DF = .07;
  g.add(mesh(slab(dRR(690, 372, 220, 368, 26), .05, .012, 10), M('metal', PAL.metal, { grain: 1, rep: 2, hl: .35 }), [0, 0, .006]));
  const bg = new THREE.SphereGeometry(L(9), 12, 8);
  for (let k = 0; k < 10; k++){ const a = k/10*Math.PI*2; g.add(at(mesh(bg, m.brass, undefined, { cast: false }), 800 + Math.sin(a)*128, 556 + Math.cos(a)*204, .1)); }
  const barM = M('metal', '#2c3f5e', { hl: .1 });
  g.add(box(716, 420, 168, 12, .012, DF, barM, .005)); g.add(box(716, 676, 168, 12, .012, DF, barM, .005));
  g.add(box(846, 528, 24, 92, .06, DF, m.brass, .01));
  /* the lamp over the door: dark the whole time the ship is under way */
  g.add(box(762, 268, 76, 28, .06, .004, m.metalD, .01));
  const lensMat = toon('#4a5570', { grain: -1, emissive: '#ffd9a3', ei: 0, ramp: 'crisp', hl: .6 });
  const lens = at(mesh(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI*2, 0, Math.PI/2), lensMat, undefined, { cast: false }), 800, 290, .05);
  lens.scale.set(L(24), L(12), L(14)); lens.rotation.x = Math.PI; g.add(lens);
  const lampGlow = glow(SWARM, L(160), 0); at(lampGlow, 800, 292, .14); g.add(lampGlow);
  g.add(box(696, 204, 208, 64, .02, .004, m.paper, .01));
  const name = designTex([696, 204, 208, 64], 5, () => st.name, (c) => {
    txtFit(c, st.name, 800, 240, 190, 25, PAL.ink); txt(c, st.en, 800, 256, 10, PAL.pencil, { mono: true, ls: 3 }); });
  ticks.push(name);
  g.add(mesh(dPlane(208, 64), paperMat(name.t, .35), [X(800), Y(236), .025], { cast: false }));
  /* the plate under the lamp, the one place in the ring that says where the ship is going */
  g.add(box(684, 664, 232, 62, .016, DF, m.paper, .008));
  const live = designTex([684, 664, 232, 62], 5, () => { const P = callPort(); return (P ? P.name : '') + ':' + (docked() ? 1 : 0); }, (c) => {
    const P = callPort(), on = docked();
    if (P){ txtFit(c, on ? tr('已靠上') : tr('下一站'), 800, 688, 200, 14, PAL.pencil); txtFit(c, tr(P.name), 800, 714, 210, 22, PAL.ink); }
    else txtFit(c, tr('没有下一站'), 800, 702, 210, 19, PAL.pencil);
  });
  ticks.push(live);
  g.add(mesh(dPlane(232, 62), paperMat(live.t, .4), [X(800), Y(695), DF + .017], { cast: false }));
  g.add(box(668, 770, 264, 16, .16, 0, m.metalD, .02));
  addTo(blot(L(190), .22, .5), g).position.set(0, .003, .2);
  pickable(g, { act: 'go:hatch', label: st.label, anchor: new THREE.Vector3(0, Y(520), .1), r: .55 });
  return { st, g, sync(){
    for (const t of ticks) t.tick();
    /* steady alongside; blinking while a place is coming in close */
    const on = docked(), near = OUT.list.some(x => x.phase === 'approach' && x.k > .45), blink = near && Math.sin(S.T*3) > 0, p = .5 + .12*Math.sin(S.T*1.6);
    lensMat.color.set(on || blink ? '#ffd9a3' : '#4a5570'); lensMat.emissiveIntensity = on ? 1.1 : blink ? .7 : 0;
    lampGlow.material.opacity = on ? p : blink ? .35 : 0;
  } };
}

/* ---------------- the big window, its bench, and what is out there ---------------- */
export function bigWindow(root: THREE.Object3D, st: any, m: Mats, glintTex: THREE.Texture): Station & { space: THREE.Group } {
  const g = wallFrame(root, st.ang), SP = RING3.space, SIT = RING3.cam.sit;
  /* the frame and the sill, bent round the wall */
  /* opened up from the first build (404/438 wide frame/glass): it takes in
     nearly a third more of the outside, and the frame still covers the
     stepped edge of the wall's one-degree columns */
  const fr = dRR(300, 204, 1000, 424, 112); fr.holes.push(dRR(336, 238, 928, 356, 90));
  g.add(mesh(bend(slab(fr, .26, .02, 14).translate(0, 0, -.2), 0, .2), m.frame));
  g.add(mesh(bend(rbox(L(960), L(26), .2, .02).translate(0, Y(612), .1), 0, .25), m.metalD));
  addTo(blot(L(520), .3, .4), g).position.set(0, .003, .5);
  /* the glass: a faint pane and two glints, and the tap that sits you down */
  const pane = (dz: number, mat: THREE.Material) => {
    const geo = bend(new THREE.PlaneGeometry(L(928), L(356), 28, 1).translate(0, Y(416), dz), 0, 1);
    return mesh(geo, mat, undefined, { cast: false, receive: false });
  };
  g.add(noRay(pane(-.12, flatMat('#9fb8d6', { opacity: .05 }))));
  g.add(noRay(pane(-.115, flatMat('#ffffff', { map: glintTex, opacity: 1 }))));
  /* hidden while seated, so a tap reaches the ship behind it */
  const sitPad = pane(-.11, new THREE.MeshBasicMaterial({ visible: false }));
  g.add(sitPad);
  pickable(sitPad, { act: 'ring:sit', label: tr('舷窗长椅'), key: 'ring:sit:win', on: () => !S.sitting, anchor: new THREE.Vector3(0, Y(412), .05), r: .7 });

  /* the bench, on the floor in front of it, curved with the wall */
  const B = RING3.bench, bz = B.z;
  const bench = new THREE.Group(); g.add(bench);
  const bb = (w: number, h: number, d: number, r: number, x: number, y: number, z: number) => bend(rbox(w, h, d, r).translate(x, y, z), bz, .22);
  const cush = M('cloth', PAL.cushion, { grain: 1, rep: [3, 1] });
  bench.add(mesh(bb(B.len, .16, B.depth, .06, 0, B.seat - .07, bz), cush));
  for (const sx of [-1, 1]) bench.add(mesh(bb(.07, B.seat - .14, .4, .02, sx*(B.len/2 - .25), (B.seat - .14)/2, bz), m.metalD));
  bench.add(mesh(bb(.55, .09, .4, .035, B.len*.28, B.seat + .05, bz - .02), M('cloth', PAL.blanket, { grain: 0, hl: .05 })));
  addTo(blot(B.len*.55, .4, .55), bench).position.set(0, .004, bz);
  pickable(bench, { act: 'ring:sit', label: tr('舷窗长椅'), key: 'ring:sit:bench', on: () => !S.sitting, anchor: new THREE.Vector3(0, B.seat + .1, bz), r: .6 });

  /* SPACE. Laid out so a design point (x, y) of the 2D window, seen from the
     seated eye, is where drawBigWindow painted it: each point is pushed back
     along the line from that eye through the glass. */
  const E = new THREE.Vector3(0, SIT.eye, SIT.d), s = (SIT.d + SP.depth)/SIT.d;
  const sp = (dx: number, dy: number, out = new THREE.Vector3()) => out.set(X(dx), Y(dy), 0).sub(E).multiplyScalar(s).add(E);
  const space = new THREE.Group(); g.add(space); noRay(space);
  const bgTex = canvasTex(8, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#080f20'); gr.addColorStop(.6, '#111d38'); gr.addColorStop(1, '#1d2e52'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const bgW = L(1160)*s, bgH = L(540)*s, bgC = sp(800, 416);
  const bgM = mesh(new THREE.PlaneGeometry(bgW, bgH), new THREE.MeshBasicMaterial({ map: bgTex.t, toneMapped: false, depthWrite: false }), [bgC.x, bgC.y, bgC.z - .2], { cast: false, receive: false });
  bgM.renderOrder = -3; space.add(noRay(bgM));
  const neb = (spr: HTMLCanvasElement, x: number, y: number, w: number, h: number, a: number) => {
    const c = sp(x + w/2, y + h/2), q = mesh(new THREE.PlaneGeometry(L(w)*s, L(h)*s), new THREE.MeshBasicMaterial({ map: spriteTex(spr), transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [c.x, c.y, c.z - .1], { cast: false, receive: false });
    q.renderOrder = -2; space.add(noRay(q));
  };
  neb(SIND, 600, 300, 600, 220, .7); neb(SROSE, 820, 330, 300, 140, .3);
  /* the stars of S.bw, which corridor.ts drifts across the window */
  const mkStars = (big: boolean) => {
    const list = S.bw.filter(b => (b.r > 1.4) === big), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(list.length*3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(list.length*3), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: big ? 5 : 3, sizeAttenuation: false, map: spriteTex(SOFT), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    pts.frustumCulled = false; pts.renderOrder = -1; space.add(noRay(pts));
    const base = list.map(b => new THREE.Color(b.c));
    return { list, geo, base };
  };
  const stars = [mkStars(false), mkStars(true)];
  const tv = new THREE.Vector3();
  /* the other ship: the 2D hull, blinking its windows when waved at */
  const ship = new THREE.Group(); space.add(ship); ship.visible = false;
  const hull = new THREE.Shape(); hull.moveTo(-92, 0); hull.bezierCurveTo(-82, 24, 70, 26, 98, 4); hull.lineTo(92, -10); hull.bezierCurveTo(40, -18, -60, -18, -92, 0);
  const shipS = L(1)*s*.85;
  const hullM = toon('#1c2a48', { grain: -1, emissive: '#16213a', ei: .9, rim: 2, ramp: 'soft' });
  ship.add(mesh(new THREE.ExtrudeGeometry(hull, { depth: 30, bevelEnabled: true, bevelThickness: 6, bevelSize: 5, bevelSegments: 3, curveSegments: 16 }), hullM, [0, 0, -15], { cast: false, receive: false }));
  ship.add(mesh(new THREE.BoxGeometry(6, 28, 6), hullM, [-31, 26, 0], { cast: false, receive: false }));
  ship.add(mesh(new THREE.BoxGeometry(5, 22, 5), hullM, [10.5, 23, 0], { cast: false, receive: false }));
  const winMats: THREE.MeshBasicMaterial[] = [], winGlows: THREE.Sprite[] = [];
  for (let k = 0; k < 6; k++){
    const wm = new THREE.MeshBasicMaterial({ color: '#ffd9a3', transparent: true, toneMapped: false });
    ship.add(mesh(new THREE.PlaneGeometry(10, 7), wm, [-53 + k*22, 4.5, 22], { cast: false, receive: false }));
    const gl = glow(SWARM, 26, .45); gl.position.set(-53 + k*22, 4.5, 24); ship.add(gl);
    winMats.push(wm); winGlows.push(gl);
  }
  ship.scale.setScalar(shipS);
  /* a generous invisible target round the ship, since it is small and far */
  const shipPad = new THREE.Mesh(new THREE.PlaneGeometry(220, 80), new THREE.MeshBasicMaterial({ visible: false })); shipPad.position.z = 26; ship.add(shipPad);
  ship.children.forEach(c => { if (c !== shipPad) noRay(c); });
  space.raycast = () => {};
  pickable(ship, { act: 'ring:ship', label: tr('那艘船'), on: () => !!S.otherShip, anchor: new THREE.Vector3(0, 0, 0), r: .5 });

  /* every place already given a lamp, as a small warm light in its own
     direction, low over the horizon */
  const TR: Record<string, [number, number]> = { dock: [470, 540], echo: [690, 372], bell: [1050, 520], ship: [1170, 318] };
  const traces = Object.keys(TR).map(id => { const gl = glow(spr(PORTS[id].look.lamp), L(30)*s, 0); sp(TR[id][0], TR[id][1], gl.position); space.add(noRay(gl)); return { id, gl }; });
  return { st, g, space, sync(){
    sitPad.visible = !S.sitting;
    for (const t of traces) t.gl.material.opacity = G.calls.some(c => c.id === t.id) ? .6 + .25*Math.sin(S.T*1.4 + t.id.length) : 0;
    for (const set of stars){
      const p = set.geo.attributes.position as THREE.BufferAttribute, c = set.geo.attributes.color as THREE.BufferAttribute;
      set.list.forEach((b, i) => {
        sp(b.x, b.y, tv); p.setXYZ(i, tv.x, tv.y, tv.z);
        const tw = .7 + .3*Math.sin(S.T*1.3 + b.tw), col = set.base[i];
        c.setXYZ(i, col.r*tw, col.g*tw, col.b*tw);
      });
      p.needsUpdate = true; c.needsUpdate = true;
    }
    const sh = S.otherShip;
    ship.visible = !!sh;
    if (sh){
      sp(sh.x, sh.y + Math.sin(sh.t*.6)*3, ship.position);
      for (let k = 0; k < 6; k++){ const on = S.shipBlink > 0 ? (Math.sin(S.T*10 + k) > 0 ? 1 : .2) : .9; winMats[k].opacity = on; winGlows[k].material.opacity = on*.5; }
    }
  } };
}

/* ---------------- the work board ---------------- */
/* A slip of paper pinned at design (x, y) (its top left), `w` wide, at an
   angle, redrawn when what it says changes. */
function pinnedSlip(parent: THREE.Object3D, x: number, y: number, w: number, rot: number, z: number, make: () => Slip, pick: { act: string; label: string; key: string }){
  const K = 3, c = mk(w*K, 600*K), gx = c.getContext('2d'), t = texOf(c);
  t.anisotropy = 4;
  const f = tangent(parent, x + w/2, L(w)/2);
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(.5, -.5, 0);
  const m = mesh(geo, paperMat(t, .45), [X(x) - X(x + w/2), Y(y), z], { cast: false });
  m.rotation.z = -rot; f.add(m);
  pickable(m, { ...pick, inspect: true });
  let sig = '';
  const redraw = (force = false) => {
    const s = make(), now = JSON.stringify(s.rows) + s.title + (s.head || '') + (s.foot || '') + FONT_GEN;
    if (now === sig && !force) return; sig = now;
    const hh = Math.ceil(slipH(s)); c.height = hh*K; gx.setTransform(K, 0, 0, K, 0, 0); gx.clearRect(0, 0, w, hh); drawSlip(gx, s);
    t.dispose(); t.needsUpdate = true; m.scale.set(L(w), L(hh), 1);
    (m.userData.pick as any).sphere = null;
  };
  return { mesh: m, redraw };
}
export function board(root: THREE.Object3D, st: any, m: Mats): Station {
  const g = wallFrame(root, st.ang);
  g.add(mesh(bend(slab(dRR(520, 252, 560, 360, 16), .045, .012, 6), 0, .22), m.woodD));
  g.add(mesh(bend(slab(dRR(536, 268, 528, 328, 10), .02, .004, 6), 0, .22), M('cloth', PAL.cork, { grain: 2, rep: [3, 2], hl: .03 }), [0, 0, .045]));
  addTo(blot(L(300), .25, .45), g).position.set(0, .003, .3);
  const CZ = .07;
  const work = pinnedSlip(g, 546, 278, 200, -.011, CZ, () => workSlip(200, false), { act: 'ui:work', label: tr('这一趟'), key: 'work' });
  const voy = pinnedSlip(g, 752, 292, 184, .016, CZ + .002, () => voyageSlip(184), { act: 'ring:voyage', label: tr('航程'), key: 'voyage' });
  /* the log column: the tag and the last two entries, as two pinned cards */
  const logTex = designTex([936, 268, 136, 306], 4, () => G.log.length + ':' + (G.log[0] ? G.log[0].t : 0) + ':' + (G.log[1] ? G.log[1].t : 0), (c) => {
    c.save(); c.translate(1004, 288); c.rotate(-.03);
    vol(c, cc => rr(cc, -60, -15, 120, 30, 5), MAT.paper, { k: 1.4, s: 3.5 });
    txtFit(c, tr('航行日志'), 0, 6, 104, 17, PAL.ink); c.restore();
    const items = G.log.slice(0, 2);
    items.forEach((e, i) => { const x = 944, y = 310 + i*140, rot = [-2.4, 2][i]*D2R, lines = logLines(e.text, 6);
      c.save(); c.translate(x + 60, y + 56); c.rotate(rot); c.translate(-x - 60, -y - 56);
      shadow(c, x + 62, y + 114, 58, 8, .35);
      vol(c, cc => rr(cc, x, y, 120, 112, 4), MAT.paper, { k: 1.4, s: 3, r: 1 });
      vol(c, cc => ell(cc, x + 60, y + 6, 5.5, 5.5), MAT.rose, { k: .8, s: 2, tex: 0 });
      txt(c, ymd(e.t).slice(5) + ' ' + hhmm(e.t), x + 9, y + 30, 9.5, PAL.pencil, { mono: true, align: 'left' });
      lines.forEach((l, k) => txt(c, l, x + 9, y + 56 + k*21, 13.5, PAL.ink, { align: 'left' }));
      c.restore(); });
    if (!items.length) txt(c, tr('还没有记录。'), 1004, 430, 16, '#3a2414');
  });
  const lf = tangent(g, 1004, L(68));
  const logM = mesh(dPlane(136, 306), paperMat(logTex.t, .45), [0, Y(421), CZ], { cast: false });
  lf.add(logM);
  pickable(logM, { act: 'ring:log', label: tr('航行日志'), inspect: true });
  /* the ship's notice, on the wall beside the board */
  const noteTex = designTex([1084, 284, 160, 240], 4, () => 'n', (c) => {
    c.translate(1163, 400); c.rotate(.035);
    shadow(c, 4, 118, 78, 10, .4);
    vol(c, cc => rr(cc, -74, -110, 148, 226, 6), MAT.paper, { k: 2, s: 5, r: 1.5 });
    txt(c, tr('本船须知'), 0, -76, 20, PAL.ink);
    c.fillStyle = '#c4b392'; c.fillRect(-60, -64, 120, 2);
    [tr('一　炉子用完关掉。'), tr('二　夜里走廊扶栏。'), tr('三　邮船每两钟头'), tr('　　靠一次舷。'), tr('四　穹顶熄灯轻声。')].forEach((l, i) => txt(c, l, -58, -36 + i*27, 14.5, PAL.ink, { align: 'left' }));
    vol(c, cc => ell(cc, 0, -100, 6, 6), MAT.rose, { k: .8, s: 2, tex: 0 });
  });
  const nf = tangent(g, 1164, L(80));
  const noteM = mesh(dPlane(160, 240), paperMat(noteTex.t, .4), [0, Y(404), .012], { cast: false }); nf.add(noteM);
  pickable(noteM, { act: 'inspect', label: tr('本船须知'), key: 'notice', inspect: true });
  let next = 0;
  return { st, g, sync(){
    logTex.tick(); noteTex.tick();
    if (S.T >= next){ next = S.T + .4; work.redraw(); voy.redraw(); }
  } };
}

/* ---------------- the mailbox and the ship's clock ---------------- */
export function mail(root: THREE.Object3D, st: any, m: Mats): Station {
  const g = wallFrame(root, st.ang), ticks: Tick[] = [];
  /* the clock */
  const clock = new THREE.Group(); at(clock, 800, 300, 0); g.add(clock);
  clock.add(mesh(new THREE.CylinderGeometry(L(100), L(100), .07, 48), m.brass, [0, 0, .035], { rot: [Math.PI/2, 0, 0] }));
  const faceTex = designTex([716, 216, 168, 168], 4, () => 'f', (c) => {
    c.fillStyle = MAT.cream.b; c.beginPath(); c.arc(800, 300, 84, 0, Math.PI*2); c.fill();
    const gr = c.createRadialGradient(780, 280, 10, 800, 300, 84); gr.addColorStop(0, 'rgba(255,250,240,.5)'); gr.addColorStop(1, 'rgba(180,161,129,.35)'); c.fillStyle = gr; c.fill();
    for (let k = 0; k < 12; k++){ const a = k*30*D2R, r0 = k%3 ? 70 : 64; c.save(); c.translate(800 + Math.sin(a)*r0, 300 - Math.cos(a)*r0); c.rotate(a); c.fillStyle = '#2a3550'; c.globalAlpha = .8; c.beginPath(); c.roundRect(-1.6, -2, 3.2, k%3 ? 7 : 11, 1.5); c.fill(); c.restore(); }
  });
  ticks.push(faceTex);
  clock.add(mesh(new THREE.CircleGeometry(L(82), 48), M('paper', '#ffffff', { map: faceTex.t, emissive: '#3c4866', ei: .25 }), [0, 0, .071], { cast: false }));
  const hand = (len: number, w: number, col: string, back: number, z: number) => {
    const p = new THREE.Group(); p.position.z = z; clock.add(p);
    p.add(mesh(rbox(L(w), L(len + back), .006, L(w)/2.1), toon(col, { grain: -1, ramp: 'crisp', hl: .3 }), [0, L(len - back)/2, 0], { cast: false }));
    return p;
  };
  const hh = hand(44, 7, '#2a3550', 0, .076), mm = hand(64, 4.5, '#2a3550', 0, .082), ss = hand(70, 2, '#c46a52', 10, .088);
  clock.add(mesh(new THREE.SphereGeometry(L(6), 12, 8), m.brass, [0, 0, .09], { cast: false }));
  pickable(clock, { act: 'ring:clock', label: tr('船钟'), inspect: true, anchor: new THREE.Vector3(0, 0, .08), r: .4 });
  /* the nights plate under it */
  g.add(box(700, 412, 200, 42, .018, .004, m.paper, .01));
  const nights = designTex([700, 412, 200, 42], 5, () => String(G.nights.length), (c) => txtFit(c, tr('航行第 {0} 夜', Math.max(1, G.nights.length)), 800, 441, 188, 21, PAL.ink));
  ticks.push(nights);
  g.add(mesh(dPlane(200, 42), paperMat(nights.t, .35), [X(800), Y(433), .023], { cast: false }));
  /* the mailbox on its post */
  const mb = new THREE.Group(); g.add(mb);
  mb.add(box(790, 600, 20, 190, .05, .12, m.metalD, .01));
  const bs = new THREE.Shape();
  bs.moveTo(X(690), Y(628)); bs.lineTo(X(910), Y(628)); bs.lineTo(X(910), Y(532));
  bs.bezierCurveTo(X(910), Y(492), X(880), Y(480), X(800), Y(480)); bs.bezierCurveTo(X(720), Y(480), X(690), Y(492), X(690), Y(532)); bs.lineTo(X(690), Y(628));
  const BZ = .06, BD = .3, BF = BZ + BD + .012;
  mb.add(mesh(slab(bs, BD, .014, 16), M('metal', PAL.teal, { hl: .35, grain: 1, rep: 2 }), [0, 0, BZ]));
  mb.add(box(730, 520, 140, 14, .01, BF - .004, m.dark, .006));
  mb.add(box(760, 606, 80, 8, .01, BF - .004, m.dark, .004));
  const lab = designTex([720, 548, 160, 56], 5, () => 'm', (c) => { txt(c, tr('信'), 800, 576, 26, '#eaf5f2'); txt(c, tr('MAIL · 寄出↓'), 800, 596, 10, '#cfe3e3', { mono: true, ls: 2 }); });
  ticks.push(lab);
  mb.add(mesh(dPlane(160, 56), new THREE.MeshBasicMaterial({ map: lab.t, transparent: true, toneMapped: false, color: '#c9d6d6' }), [X(800), Y(576), BF + .002], { cast: false, receive: false }));
  /* the flag: up when there is something in the box */
  const flag = new THREE.Group(); at(flag, 920, 600, BZ + BD*.5); mb.add(flag);
  flag.add(mesh(rbox(L(6), L(80), .012, .004), m.metal, [0, L(40), 0], { cast: false }));
  flag.add(mesh(rbox(L(40), L(24), .014, .006), m.rose, [L(20), L(68), 0], { cast: false }));
  /* letters standing up out of the slot, warm */
  const envG = new THREE.PlaneGeometry(L(9), L(13)), envM = toon(PAL.cream, { grain: -1, emissive: '#f2a95b', ei: .55, ramp: 'soft', rim: 0 });
  const letters = Array.from({ length: 6 }, () => { const e = mesh(envG, envM, [0, Y(512), BF + .004], { cast: false }); mb.add(e); const gl = glow(SAMBER, L(26), .9); gl.position.set(0, Y(506), BF + .02); mb.add(gl); return { e, gl }; });
  addTo(blot(L(70), .2, .5), g).position.set(0, .003, .2);
  pickable(mb, { act: 'ring:mail', label: () => tr('信箱') + (G.mail.box.length ? tr('（{0} 封）', G.mail.box.length) : ''), anchor: new THREE.Vector3(0, Y(554), BF), r: .45 });
  return { st, g, sync(){
    for (const t of ticks) t.tick();
    const d = new Date(now()), h12 = d.getHours()%12 + d.getMinutes()/60, mi = d.getMinutes() + d.getSeconds()/60;
    hh.rotation.z = -h12*30*D2R; mm.rotation.z = -mi*6*D2R; ss.rotation.z = -d.getSeconds()*6*D2R;
    const n = G.mail.box.length;
    flag.rotation.z = n ? 0 : -Math.PI/2;
    letters.forEach((l, i) => { const on = i < n; l.e.visible = l.gl.visible = on; if (!on) return;
      const x = 788 + i*12 - (n - 1)*6 + 12; l.e.position.x = X(x); l.gl.position.x = X(x); l.e.rotation.z = (i%2 ? 1 : -1)*.08; });
  } };
}

/* ---------------- the ladder up to the dome ---------------- */
export function dome(root: THREE.Object3D, st: any, m: Mats): Station & { hatchGlow: THREE.Sprite } {
  const g = wallFrame(root, st.ang), ticks: Tick[] = [];
  const lad = new THREE.Group(); g.add(lad);
  const LZ = .26, rail = new THREE.CylinderGeometry(L(8), L(8), H, 12);
  for (const x of [736, 864]){
    lad.add(mesh(rail, m.metal, [X(x), H/2, LZ]));
    for (const y of [.35, 1.35, 2.35]) lad.add(mesh(rbox(L(10), .05, LZ, .01), m.metalD, [X(x), y, LZ/2], { cast: false }));
  }
  const rung = new THREE.CylinderGeometry(L(5), L(5), L(128), 10);
  for (let k = 0; k < 9; k++) lad.add(mesh(rung, m.metal, [0, Y(286 + k*58), LZ], { rot: [0, 0, Math.PI/2] }));
  /* the hatch overhead, open on the dome's indigo */
  const HZ = .62, HR = L(140);
  lad.add(mesh(new THREE.TorusGeometry(HR, .045, 10, 40), m.metalD, [0, H - .03, HZ], { rot: [Math.PI/2, 0, 0] }));
  const well = canvasTex(128, 128, (c, w) => { const gr = c.createRadialGradient(w/2, w/2, 2, w/2, w/2, w/2); gr.addColorStop(0, '#0a0d26'); gr.addColorStop(.55, '#1d2160'); gr.addColorStop(1, '#3a3f9a'); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
  lad.add(mesh(new THREE.CircleGeometry(HR, 40), new THREE.MeshBasicMaterial({ map: well.t, toneMapped: false }), [0, H - .006, HZ], { rot: [Math.PI/2, 0, 0], cast: false, receive: false }));
  const hatchGlow = glow(SIND, L(400), .55); hatchGlow.position.set(0, H - .12, HZ); g.add(hatchGlow);
  const wallGlow = glow(SIND, L(320), .3); wallGlow.position.set(0, Y(260), .1); g.add(wallGlow);
  g.add(box(900, 380, 180, 66, .02, .004, m.paper, .01));
  const sign = designTex([900, 380, 180, 66], 5, () => 's', (c) => { txtFit(c, tr('观景穹顶 ↑'), 990, 414, 166, 23, PAL.ink); txt(c, 'DOME', 990, 434, 10, PAL.pencil, { mono: true, ls: 3 }); });
  ticks.push(sign);
  g.add(mesh(dPlane(180, 66), paperMat(sign.t, .35), [X(990), Y(413), .025], { cast: false }));
  addTo(blot(L(90), .25, .5), g).position.set(0, .003, LZ);
  pickable(g, { act: 'go:dome', label: tr('穹顶梯'), anchor: new THREE.Vector3(X(840), Y(480), .25), r: .5 });
  return { st, g, hatchGlow, sync(){
    for (const t of ticks) t.tick();
    const p = .55 + .15*Math.sin(S.T*.8);
    hatchGlow.material.opacity = p; wallGlow.material.opacity = p*.5;
  } };
}


/* ---------------- the window band beside the gangway door ----------------
   A run of glass in the outer wall between the gangway (160) and the galley
   (200), cut where a porthole, its lamp and a near pillar used to be. The
   ribs at 170 and 190 still stand across it, as mullions. It looks onto the
   outside built by buildOutside() below, which is in real ring space, so the
   view through it moves with the walk the way a real window's does. */
export function windowBand(root: THREE.Object3D, m: Mats){
  const BD = RING3.wall.band, g = wallFrame(root, BD.ang), hw = BD.a*RING3.ring.ppd;
  const gx0 = 800 - hw + 10, gw = 2*(hw - 10), gy0 = BD.y0 + 4, gh = BD.y1 - BD.y0 - 8;
  const fr = dRR(gx0 - 38, gy0 - 30, gw + 76, gh + 60, 40); fr.holes.push(dRR(gx0, gy0, gw, gh, 24));
  g.add(mesh(bend(slab(fr, .22, .02, 12).translate(0, 0, -.17), 0, .2), m.frame));
  g.add(mesh(bend(rbox(L(gw + 40), L(24), .18, .02).translate(0, Y(gy0 + gh + 14), .09), 0, .25), m.metalD));
  addTo(blot(L(gw*.55), .28, .35), g).position.set(0, .003, .45);
  const glint = canvasTex(256, 128, (c, w, h) => { c.fillStyle = 'rgba(255,255,255,.06)';
    for (const [a, b] of [[40, 70], [150, 162]]){ c.beginPath(); c.moveTo(a, h); c.lineTo(b, h); c.lineTo(b + 60, 0); c.lineTo(a + 60, 0); c.closePath(); c.fill(); } });
  const pane = (dz: number, mat: THREE.Material) => noRay(mesh(bend(new THREE.PlaneGeometry(L(gw), L(gh), 24, 1).translate(0, Y(gy0 + gh/2), dz), 0, 1), mat, undefined, { cast: false, receive: false }));
  g.add(pane(-.11, flatMat('#9fb8d6', { opacity: .05 }))); g.add(pane(-.105, flatMat('#ffffff', { map: glint.t, opacity: 1 })));
  return { g, sync(){} };
}

/* ---------------- what is outside the band ----------------
   A backdrop far out (the lane's sky, as the bridge colours it), and the
   place itself from three/landmarks.ts, set where state/voyage.ts says it is:
   against the hull at the gangway when alongside, swung out ahead and far off
   while coming in, sliding away astern when leaving. */
export function buildOutside(root: THREE.Object3D){
  const O = RING3.outside, PL = O.place, g = new THREE.Group(); g.name = 'outside'; root.add(g);
  const tex = liveTex(512, 256, () => G.route, (c, w, h) => {
    const [top, bot] = ROUTE_SKY[G.route] || ROUTE_SKY.harbor;
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(.62, bot); gr.addColorStop(.64, mixHex(bot, '#000000', .45)); gr.addColorStop(1, mixHex(top, '#000000', .6));
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const R = mulberry32(57); for (let i = 0; i < 260; i++){ c.globalAlpha = .3 + R()*.6; c.fillStyle = R() < .1 ? '#ffe3b8' : '#dfe9f3'; const sz = .6 + R()*1.2; c.fillRect(R()*w, R()*h*.6, sz, sz); }
  });
  const a0 = O.from*D2R, a1 = O.to*D2R;
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(O.r, O.r, 44, 48, 1, true, Math.PI - a1, a1 - a0),
    new THREE.MeshBasicMaterial({ map: tex.t, side: THREE.BackSide, toneMapped: false, depthWrite: false }));
  cyl.position.y = 1.5 + 44*(.5 - .62) + 0; cyl.renderOrder = -4; g.add(noRay(cyl));
  const LM = Object.fromEntries(Object.keys(PORTS).map(id => { const l = buildLandmark(id); l.g.visible = false; g.add(noRay(l.g)); return [id, l]; }));
  const fog = new THREE.Color(), d = new THREE.Vector3();
  return { g, sync(){
    tex.tick();
    fog.set((ROUTE_SKY[G.route] || ROUTE_SKY.harbor)[1]);
    const seen = new Set<string>();
    for (const sg of OUT.list){
      const L2 = LM[sg.id]; if (!L2) continue; seen.add(sg.id);
      const p = 1/(1 + 24*(1 - sg.k)), q = (p - 1/25)/(1 - 1/25);
      const swing = sg.phase === 'approach' ? (1 - q)*PL.swing : Math.min(1, sg.drift)*PL.swing + (1 - q)*PL.swing*.3;
      const ang = PL.ang + swing, dist = (RING3.ring.ro + .32) + (PL.near/p - PL.near), r = Math.min(dist, PL.cap), sc = r/dist;
      dirOf(ang, d); L2.g.position.set(d.x*r, PL.y[0] + (PL.y[1] - PL.y[0])*q, d.z*r);
      L2.g.rotation.y = -ang*D2R; L2.g.scale.setScalar(sc);
      L2.g.visible = sg.vis > .01;
      L2.sync({ fog: 1 - q, sky: fog, lit: sg.lit, t: S.T, vis: sg.vis, shrink: sc*p });
    }
    for (const id of Object.keys(LM)) if (!seen.has(id)) LM[id].g.visible = false;
  } };
}
