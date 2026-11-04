import * as THREE from 'three';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { RING3, RU } from '../config/corridor';
import { FONT_GEN } from '../engine';
import { liveTex, rrShape, toon } from '../kit';

/* ================= THE RING'S OWN GEOMETRY HELPERS =================
   A station is built in its own frame on the outer wall: x along the wall
   toward larger ring angles, y up from the floor, z out of the wall toward the
   ship's centre. Its 2D numbers come in through X()/Y(), so a door is the
   door rr(...) and arc(...) the 2D sprite painted. Things wider than about a
   metre are bent round the wall with bend(), so the big window and the cork
   board hug the curve instead of standing off it at the ends. */
export const D2R = Math.PI/180;
const RO = RING3.ring.ro, FY = RING3.ring.floorY;

/* design -> metres in a station's frame (x relative to the sprite's centre, 800) */
export const X = (dx: number) => (dx - 800)/RU;
export const Y = (dy: number) => (FY - dy)/RU;
export const L = (d: number) => d/RU;

/* the direction of ring angle `deg` from the centre */
export const dirOf = (deg: number, out = new THREE.Vector3()) => out.set(Math.sin(deg*D2R), 0, -Math.cos(deg*D2R));
/* where (radius r, height y) at ring angle deg is */
export const ringPt = (deg: number, r: number, y = 0, out = new THREE.Vector3()) => dirOf(deg, out).multiplyScalar(r).setY(y);

/* A station's frame on the outer wall at ring angle `deg`. */
export function wallFrame(parent: THREE.Object3D, deg: number, r = RO){
  const g = new THREE.Group(); ringPt(deg, r, 0, g.position); g.rotation.y = -deg*D2R; parent.add(g); return g;
}
/* A flat sub-frame tangent to the wall at design x `dx` of a station frame,
   pushed out by `lift` so something `halfW` wide does not sink in at its ends. */
export function tangent(parent: THREE.Object3D, dx: number, halfW = 0, lift = 0){
  const s = X(dx), th = s/RO, g = new THREE.Group();
  g.position.set(RO*Math.sin(th), 0, RO - RO*Math.cos(th) + halfW*halfW/(2*RO) + lift);
  g.rotation.y = -th; parent.add(g); return g;
}
/* Bend a geometry built flat in a station frame round the ring: x is arc
   length at radius (RO - zRef), z is distance in from the wall. */
export function bend(geo: THREE.BufferGeometry, zRef = 0, maxEdge = .14){
  let g = new TessellateModifier(maxEdge, 7).modify(geo); geo.dispose();
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, R0 = RO - zRef;
  for (let i = 0; i < p.count; i++){
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = x/R0, r = RO - z, c = Math.cos(th), s = Math.sin(th);
    p.setXYZ(i, r*s, y, RO - r*c);
    const nx = n.getX(i), nz = n.getZ(i); n.setXYZ(i, nx*c - nz*s, n.getY(i), nx*s + nz*c);
  }
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}
/* A rounded rect from design numbers [x, y, w, h, r] as a shape in metres. */
export const dRR = (x: number, y: number, w: number, h: number, r: number) => rrShape(X(x), Y(y + h), L(w), L(h), L(r));
/* An arch: straight sides from the floor line `y0` up to `yc`, a half circle on top. */
export function dArch<T extends THREE.Path = THREE.Shape>(x0: number, x1: number, y0: number, yc: number, path: T = new THREE.Shape() as unknown as T): T {
  const r = L((x1 - x0)/2), cx = X((x0 + x1)/2);
  path.moveTo(X(x0), Y(y0)); path.lineTo(X(x1), Y(y0)); path.lineTo(X(x1), Y(yc));
  path.absarc(cx, Y(yc), r, 0, Math.PI, false); path.lineTo(X(x0), Y(y0));
  return path;
}

/* ---- painted text and paper ----
   A canvas covering design rect [x, y, w, h] at `k` pixels per design unit,
   painted with the 2D kit in design units, redrawn when `sig` changes (and
   when the fonts arrive). The plane is w x h design units in metres. */
export function designTex(rect: [number, number, number, number], k: number, sig: () => string, draw: (g: CanvasRenderingContext2D) => void){
  const [x, y, w, h] = rect;
  return liveTex(Math.round(w*k), Math.round(h*k), () => sig() + '|' + FONT_GEN, (g) => { g.setTransform(k, 0, 0, k, -x*k, -y*k); draw(g); });
}
/* Paper under the room's light, with a little light of its own so it reads in
   a dark corridor (as the 2D light pass kept a hole over each plate). */
export const paperMat = (map: THREE.Texture, glow = .4, transparent = true) =>
  toon('#ffffff', { map, grain: -1, ramp: 'soft', rim: 0, hl: 0, emissive: '#3c4866', ei: glow, transparent });
/* a plane w x h design units, origin at its centre */
export const dPlane = (w: number, h: number) => new THREE.PlaneGeometry(L(w), L(h));
