import * as THREE from 'three';
import { spr } from '../../core/paint';
import { mixHex, mulberry32 } from '../../core/util';
import type { Port } from '../../data/ports';
import { M, add, blot, flatMat, glow, lathe, mesh, rbox, toon, tube } from '../kit';

/* ================= THE ONE WAITING AT THE DOOR, IN THREE.JS =================
   characters/visitor.ts, stood up: a soft stack of lathed blobs (a wide base,
   a narrower lump, a tilted head), arms too long for it ending in paddles,
   and no face but a few slow lights. Everything is built in the creature's
   own design units with y up -- the numbers are drawVisitor()'s, negated --
   and the root is scaled to metres, so `look` (h, w, arms, eyes, body, lamp)
   means here what it meant there.

   update() is drawVisitor()'s motion: breath, lean, the arms' sway, the head's
   tilt, the blink, and the arms coming up with the lamp as `hold` rises. */

type P2 = [number, number];
/* a smooth profile through a few points, for lathe() */
function soft(pts: P2[], n = 20): P2[] {
  const c = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return c.getPoints(n).map(v => [Math.max(0, v.x), v.y] as P2);
}
/* the radius of a profile at height y */
function radiusAt(pr: P2[], y: number){
  for (let i = 1; i < pr.length; i++){
    const [r0, y0] = pr[i - 1], [r1, y1] = pr[i];
    if ((y >= y0 && y <= y1) || (y <= y0 && y >= y1)){ const t = y1 === y0 ? 0 : (y - y0)/(y1 - y0); return r0 + (r1 - r0)*t; }
  }
  return 0;
}

export interface Visitor3D {
  root: THREE.Group; hit: THREE.Mesh; H: number; W: number;
  update(t: number, hold: number, a: number): void;
  holdWorld(out: THREE.Vector3): THREE.Vector3;
}

export function buildVisitor(parent: THREE.Object3D, P: Port, metresPerUnit: number): Visitor3D {
  const L = P.look, H = L.h, W = L.w, DZ = .84;
  const R = mulberry32(L.h*7 + L.arms*131 + L.eyes);
  const leanOff = (R() - .5)*.1, tiltOff = (R() - .5)*.12;

  const root = new THREE.Group(); parent.add(root); root.scale.setScalar(metresPerUnit);
  add(blot(W*.85, W*.42, .55), root).position.y = .5;
  const leanG = new THREE.Group(); root.add(leanG);
  const breathG = new THREE.Group(); leanG.add(breathG);

  const body = M('cloth', L.body, { grain: 0, rep: 2, rim: .75, hl: .14, hlSize: .32 });
  const bodyD = M('cloth', mixHex(L.body, '#121c30', .3), { grain: 0, rep: 2, rim: .7, hl: .08, hlSize: .3 });
  const foldM = toon(mixHex(L.body, '#0e1528', .28), { grain: -1, ramp: 'soft', rim: .3, hl: 0 });

  /* body: a wide base with a narrower lump stacked on it */
  const baseP = soft([[0, 0], [W*.5, 0], [W*.58, H*.07], [W*.6, H*.2], [W*.5, H*.34], [W*.3, H*.44], [0, H*.48]]);
  const lumpP = soft([[0, H*.28], [W*.44, H*.32], [W*.5, H*.46], [W*.46, H*.6], [W*.36, H*.7], [0, H*.76]]);
  const headP = soft([[0, -H*.02], [W*.34, 0], [W*.42, H*.11], [W*.36, H*.22], [W*.2, H*.3], [0, H*.32]]);
  for (const pr of [baseP, lumpP]){ const m = add(mesh(lathe(pr, 28), body), breathG); m.scale.z = DZ; m.rotation.y = Math.PI; }   // the lathe seam to the back
  /* folds, so it reads as cloth rather than rubber */
  for (let i = 0; i < 4; i++){
    const fx = (R() - .5)*W*.7, fy = H*(.08 + R()*.3), x1 = fx + (R() - .5)*14, x2 = fx + (R() - .5)*20;
    const on = (x: number, y: number): [number, number, number] => {
      const r = Math.max(radiusAt(baseP, y), y > H*.3 ? radiusAt(lumpP, y) : 0);
      return [x, y, Math.sqrt(Math.max(0, r*r - x*x))*DZ - .6];
    };
    add(mesh(tube([on(fx, fy), on(x1, fy + H*.1), on(x2, fy + H*.2)], 1.2, 10, 5), foldM, undefined, { cast: false }), breathG);
  }
  /* head: a tilted lump, no features but the lights */
  const HY = H*.67, headG = new THREE.Group(); headG.position.y = HY; breathG.add(headG);
  { const m = add(mesh(lathe(headP, 28), body), headG); m.scale.z = DZ; m.rotation.y = Math.PI; }
  const eyeM = flatMat(mixHex(L.lamp, '#ffffff', .2)), eyeG = new THREE.SphereGeometry(6.5, 14, 10);
  const eyes: { m: THREE.Mesh; halo: THREE.Sprite }[] = [];
  for (let i = 0; i < L.eyes; i++){
    const t = L.eyes === 1 ? 0 : i/(L.eyes - 1) - .5, x = t*W*.42, y = H - 34 - Math.abs(t)*14 - HY;
    const r = radiusAt(headP, y), z = Math.sqrt(Math.max(0, r*r - x*x))*DZ;
    const m = add(mesh(eyeG, eyeM, [x, y, z - 1.5], { cast: false }), headG); m.scale.z = .45;
    const halo = add(glow(spr(L.lamp), 64, 0), headG); halo.position.set(x, y, z + 4);
    eyes.push({ m, halo });
  }

  /* arms: two cylinders and a paddle, laid along drawVisitor()'s curve */
  const upG = new THREE.CylinderGeometry(9.75/12, 1, 1, 12), loG = new THREE.CylinderGeometry(7.5/9.75, 1, 1, 12), ball = new THREE.SphereGeometry(1, 14, 10);
  const arms = Array.from({ length: L.arms }, (_, i) => {
    const side = i % 2 ? 1 : -1, rank = Math.floor(i/2);
    const up = add(mesh(upG, bodyD), breathG), lo = add(mesh(loG, bodyD), breathG);
    const sh = add(mesh(ball, bodyD), breathG), el = add(mesh(ball, bodyD), breathG), hand = add(mesh(ball, bodyD), breathG);
    sh.scale.setScalar(12); el.scale.setScalar(9.75);
    return { i, side, rank, up, lo, sh, el, hand };
  });
  const Y = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), S0 = new THREE.Vector3(), C0 = new THREE.Vector3(), E0 = new THREE.Vector3(), M0 = new THREE.Vector3();
  const seg = (m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    d.subVectors(b, a); const len = Math.max(.001, d.length());
    m.position.addVectors(a, b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(Y, d.multiplyScalar(1/len)); m.scale.set(r, len, r);
  };

  /* the lamp, once it has changed hands: up over the head, where the text says */
  const lampG = new THREE.Group(); leanG.add(lampG);
  const brassM = M('brass', '#d69d58', { transparent: true });
  add(mesh(rbox(60, 12, 40, 5), brassM, [0, -60, 0]), lampG);
  const domeM = M('glass', '#c3dceb', { transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide });
  add(mesh(lathe([[28, -56], [28.5, -40], [25, -20], [16, -6], [0, 0]], 28), domeM, undefined, { cast: false, rot: [0, Math.PI, 0] }), lampG);
  const coreM = flatMat(mixHex(L.lamp, '#ffffff', .3), { opacity: 1 });
  add(mesh(new THREE.SphereGeometry(11, 14, 10), coreM, [0, -26, 0], { cast: false }), lampG).scale.y = 1.2;
  const lampHalo = add(glow(spr(L.lamp), 240, 0), lampG); lampHalo.position.set(0, -26, 6);
  const corePt = new THREE.Vector3(0, -26, 0);

  /* a generous, invisible target the size of the 2D hit box */
  const hitM = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }); hitM.colorWrite = false;
  const hit = add(new THREE.Mesh(new THREE.BoxGeometry(W*1.6, H, W*1.1), hitM), root); hit.position.y = H/2;

  function update(t: number, hold: number, a: number){
    hold = Math.min(1, Math.max(0, hold));
    const breath = Math.sin(t*.7)*.018 + 1, lean = Math.sin(t*.19)*.035 + leanOff;
    leanG.rotation.z = -lean; breathG.scale.set(1/breath, breath, 1/breath);
    headG.rotation.z = -(Math.sin(t*.41)*.06 + tiltOff);
    for (const A of arms){
      const { side, rank, i } = A;
      const sx = side*(W*.42 - rank*10), sy = H*.6 - rank*24, z = W*(rank ? .04 : .1);
      const sw = Math.sin(t*.5 + i*1.7)*12 + Math.sin(t*.23 + i)*7, reach = rank === 0 ? hold : 0;
      const ex = sx + side*(W*.46)*(1 - reach*.74) + sw*(1 - reach);
      const ey = -((-H*.06 + rank*14)*(1 - reach) + (-H*1.02)*reach);
      S0.set(sx, sy, z); C0.set(sx + side*W*.52*(1 - reach*.6), sy - H*(.3 - reach*.5), z + W*.06); E0.set(ex, ey, z + W*.04);
      M0.set(0, 0, 0).addScaledVector(S0, .25).addScaledVector(C0, .5).addScaledVector(E0, .25);
      seg(A.up, S0, M0, 12); seg(A.lo, M0, E0, 9.75);
      A.sh.position.copy(S0); A.el.position.copy(M0);
      A.hand.position.set(ex, ey - 11*(1 - reach), E0.z); A.hand.scale.set(15, 18 - 6*reach, 9);
      A.hand.rotation.z = -side*(.26 - reach*.5);
    }
    const blinkI = Math.floor(t*.5) % Math.max(1, L.eyes), blink = (t*.5 % 1) < .08;
    eyes.forEach((e, i) => { e.m.scale.y = blink && i === blinkI ? .18 : 1; e.halo.material.opacity = .5*a*(blink && i === blinkI ? .3 : 1); });
    lampG.visible = hold > .02;
    lampG.position.y = H*1.22 + 8*hold;
    brassM.opacity = hold; domeM.opacity = .3*hold; coreM.opacity = hold;
    lampHalo.material.opacity = .55*hold*a;
  }
  return { root, hit, H, W, update, holdWorld: (out) => { lampG.updateWorldMatrix(true, false); return lampG.localToWorld(out.copy(corePt)); } };
}
