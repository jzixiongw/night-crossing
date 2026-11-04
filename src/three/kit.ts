import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BRUSH, SHADE } from '../core/paint';
import { mk } from '../core/util';
import { SHARED } from './config/shared';

/* ================= MATERIALS, TEXTURES, SMALL GEOMETRY =================
   The Canvas2D look is light face / body / core shadow / bounce rim, then the
   brush grain. Here that becomes: a three-band toon ramp with soft steps (the
   faces), a cold fresnel rim patched into the toon shader (the bounce light),
   a painted highlight blob (the `hl` of vol()), and the game's own brush tiles
   as a multiply map (the grain). No outlines, as in the 2D rooms.

   Materials differ by four knobs, not by shader: which ramp, how strong the
   highlight and how big, how much rim, which grain at what scale. KIND names
   the combinations the rooms use, so "metal" means the same thing in the
   galley and on the bridge. */

export type RampKind = 'soft' | 'std' | 'crisp';
const RAMPS: Partial<Record<RampKind, THREE.DataTexture>> = {};
export function ramp(kind: RampKind = 'std'){
  if (RAMPS[kind]) return RAMPS[kind];
  const n = 64, d = new Uint8Array(n), { levels, edges, soft } = SHARED.ramps[kind];
  const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a)/(b - a))); return t*t*(3 - 2*t); };
  for (let i = 0; i < n; i++){
    const t = i/(n - 1);
    let v = levels[0];
    v += (levels[1] - levels[0])*ss(edges[0] - soft, edges[0] + soft, t);
    v += (levels[2] - levels[1])*ss(edges[1] - soft, edges[1] + soft, t);
    d[i] = Math.round(v*255);
  }
  const t = new THREE.DataTexture(d, n, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  t.userData.keep = true;
  return (RAMPS[kind] = t);
}

/* Shared, so one write retunes every material in the room. */
export const RIM = { color: { value: new THREE.Color(SHARED.rim.color) }, k: { value: SHARED.rim.k } };
const HL = { dir: { value: new THREE.Vector3(...SHARED.highlight.dir).normalize() }, color: { value: new THREE.Color(SHARED.highlight.color) } };

function patch(m: THREE.Material, rim: number, hl: number, hlSize: number){
  m.onBeforeCompile = sh => {
    sh.uniforms.uRim = RIM.color; sh.uniforms.uRimK = RIM.k; sh.uniforms.uRimS = { value: rim };
    sh.uniforms.uHlDir = HL.dir; sh.uniforms.uHlCol = HL.color; sh.uniforms.uHl = { value: hl }; sh.uniforms.uHlSize = { value: hlSize };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK; uniform float uRimS; uniform vec3 uHlDir; uniform vec3 uHlCol; uniform float uHl; uniform float uHlSize;')
      .replace('#include <opaque_fragment>',
        'vec3 nN = normalize(normal); vec3 vV = normalize(vViewPosition);\n' +
        'float rimF = pow(1.0 - saturate(abs(dot(nN, vV))), 3.0);\n' +
        'outgoingLight += uRim * rimF * uRimK * uRimS;\n' +
        'float hlD = dot(nN, normalize(uHlDir + vV));\n' +
        'float hlF = smoothstep(1.0 - uHlSize, 1.0 - uHlSize*.35, hlD);\n' +
        'float lit = clamp(dot(outgoingLight, vec3(.4)) * 1.6, 0.0, 1.0);\n' +
        'outgoingLight += uHlCol * hlF * uHl * lit;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'nc-toon';
}

/* ---- brush grain: the 2D game's brush tiles, re-centred to multiply ---- */
const GRAIN: THREE.Texture[] = [];
export function grain(kind = 1, rx = 1, ry = rx){
  if (!GRAIN[kind]){
    const src = BRUSH[kind], c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    const im = g.getImageData(0, 0, c.width, c.height), p = im.data;
    for (let i = 0; i < p.length; i += 4){ const v = Math.max(0, Math.min(255, 238 + (p[i] - 128)*.75)); p[i] = p[i+1] = p[i+2] = v; p[i+3] = 255; }
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    t.userData.keep = true;
    GRAIN[kind] = t;
  }
  const t = GRAIN[kind].clone(); t.userData = {}; t.repeat.set(rx, ry); return t;
}

export interface ToonOpts {
  grain?: number; rep?: number | [number, number]; emissive?: string; ei?: number; side?: THREE.Side;
  rim?: number; hl?: number; hlSize?: number; ramp?: RampKind;
  map?: THREE.Texture; transparent?: boolean; opacity?: number; depthWrite?: boolean
}
export function toon(color: string, o: ToonOpts = {}){
  const rep = o.rep ?? 1, [rx, ry] = Array.isArray(rep) ? rep : [rep, rep];
  const m = new THREE.MeshToonMaterial({
    color, gradientMap: ramp(o.ramp ?? 'std'),
    map: o.map || (o.grain === -1 ? null : grain(o.grain ?? 1, rx, ry)),
    emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0),
    emissiveIntensity: o.ei ?? 1, side: o.side ?? THREE.FrontSide,
    transparent: !!o.transparent, opacity: o.opacity ?? 1
  });
  if (o.depthWrite === false) m.depthWrite = false;
  patch(m, o.rim ?? 1, o.hl ?? .12, o.hlSize ?? .16);
  return m;
}
/* The kinds the rooms are built from. Each is a preset over toon(); any
   option can still be passed on top. */
export const KIND: Record<string, ToonOpts> = {
  wall:    { ramp: 'soft', rim: 0, hl: 0, grain: 2 },
  wood:    { ramp: 'std', rim: .6, hl: .14, hlSize: .2, grain: 1 },
  woodD:   { ramp: 'std', rim: .5, hl: .08, hlSize: .2, grain: 2 },
  cloth:   { ramp: 'soft', rim: .45, hl: .04, hlSize: .3, grain: 0 },
  paper:   { ramp: 'soft', rim: .25, hl: .05, hlSize: .3, grain: 0 },
  metal:   { ramp: 'crisp', rim: 1.25, hl: .5, hlSize: .1, grain: 0 },
  brass:   { ramp: 'crisp', rim: 1.1, hl: .65, hlSize: .09, grain: -1 },
  ceramic: { ramp: 'crisp', rim: .9, hl: .55, hlSize: .07, grain: -1 },
  glass:   { ramp: 'crisp', rim: 1.6, hl: .8, hlSize: .06, grain: -1 },
  leaf:    { ramp: 'soft', rim: .8, hl: .1, hlSize: .2, grain: 0, side: THREE.DoubleSide },
  plain:   { ramp: 'std', rim: 1, hl: .12, hlSize: .16, grain: -1 }
};
export const M = (kind: keyof typeof KIND | string, color: string, o: ToonOpts = {}) => toon(color, { ...(KIND[kind] || {}), ...o });

export function flatMat(color: string, o: { opacity?: number; additive?: boolean; map?: THREE.Texture; side?: THREE.Side; depthTest?: boolean } = {}){
  return new THREE.MeshBasicMaterial({ color, map: o.map || null, transparent: o.opacity != null || !!o.additive || !!o.map, opacity: o.opacity ?? 1,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !(o.additive || o.opacity != null), depthTest: o.depthTest ?? true,
    side: o.side ?? THREE.FrontSide, toneMapped: false });
}

/* ---- canvases as textures ---- */
const CTEX = new WeakMap<HTMLCanvasElement, THREE.CanvasTexture>();
/* For canvases that live for the whole session (the glow sprites). The
   texture survives a room's disposal, which only frees its GPU copy. */
export function texOf(c: HTMLCanvasElement){
  let t = CTEX.get(c);
  if (!t){ t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; CTEX.set(c, t); }
  return t;
}
/* The glow and shade sprites from core/paint.ts are module constants, so
   their textures are kept across rooms rather than re-uploaded each visit. */
export function spriteTex(c: HTMLCanvasElement){ const t = texOf(c); t.userData.keep = true; return t; }
export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void){
  const c = mk(w, h), g = c.getContext('2d'), t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const redraw = () => { g.setTransform(1,0,0,1,0,0); g.clearRect(0, 0, c.width, c.height); draw(g, c.width, c.height); t.needsUpdate = true; };
  redraw();
  return { c, g, t, redraw };
}
/* A canvas texture that redraws only when `sig()` changes. Text and paper
   that show state go through this, so nothing is uploaded on a frame where
   what it says is the same as last frame. */
export function liveTex(w: number, h: number, sig: () => string, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void){
  let last = '\u0000';
  const ct = canvasTex(w, h, () => {});
  const tick = (force = false) => { const s = sig(); if (!force && s === last) return false; last = s; ct.redraw(); draw(ct.g, ct.c.width, ct.c.height); ct.t.needsUpdate = true; return true; };
  return { ...ct, tick, reset: () => { last = '\u0000'; } };
}

/* ---- things the pointer should pass straight through ---- */
export const noRay = <T extends THREE.Object3D>(o: T): T => { o.traverse(x => { x.raycast = () => {}; }); return o; };

/* A soft additive glow, from the same sprites the 2D rooms use. */
export function glow(canvas: HTMLCanvasElement, size: number, opacity = 1){
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex(canvas), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity, toneMapped: false }));
  s.scale.set(size, size, 1); return noRay(s);
}
/* The 2D `shadow()`: a soft dark blot under a thing, which reads as contact
   where a shadow map alone would leave the object floating. */
export function blot(rx: number, rz: number, a = .45){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(rx*2, rz*2), new THREE.MeshBasicMaterial({ map: spriteTex(SHADE), transparent: true, opacity: a, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI/2; m.renderOrder = 1; return noRay(m);
}

/* ---- geometry ---- */
export const rbox = (w: number, h: number, d: number, r = .02, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.max(.0005, Math.min(r, w/2 - .001, h/2 - .001, d/2 - .001)));
export function rrPath(p: THREE.Path, x: number, y: number, w: number, h: number, r: number){
  r = Math.min(r, w/2, h/2);
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
  return p;
}
export const rrShape = (x: number, y: number, w: number, h: number, r: number) => rrPath(new THREE.Shape(), x, y, w, h, r) as THREE.Shape;
/* A rounded slab with a bevel, from a 2D outline: frames, plaques, doors. */
export function slab(shape: THREE.Shape, depth: number, bevel = .012, curve = 10){
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel*.8, bevelSegments: 3, curveSegments: curve });
}
/* Normals follow the winding, so a profile listed bottom-up shades as an
   outside surface instead of being lit from within. */
export function lathe(pts: [number, number][], seg = 32){ const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg); g.computeVertexNormals(); return g; }
/* Planar UVs, 0..1 over the shape's own bounding box, so a canvas maps on
   exactly and a hit's uv is a position on the thing. */
export function planarUV(g: THREE.BufferGeometry){
  g.computeBoundingBox(); const b = g.boundingBox, p = g.attributes.position, uv = new Float32Array(p.count*2);
  for (let i = 0; i < p.count; i++){ uv[i*2] = (p.getX(i) - b.min.x)/(b.max.x - b.min.x); uv[i*2+1] = (p.getY(i) - b.min.y)/(b.max.y - b.min.y); }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
export function tube(pts: [number, number, number][], r: number, seg = 16, rs = 6){
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, rs);
}

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], at?: [number, number, number], o: { cast?: boolean; receive?: boolean; rot?: [number, number, number]; scale?: number | [number, number, number] } = {}){
  const m = new THREE.Mesh(geo, mat);
  if (at) m.position.set(at[0], at[1], at[2]);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  if (o.scale != null){ if (typeof o.scale === 'number') m.scale.setScalar(o.scale); else m.scale.set(...o.scale); }
  m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true;
  return m;
}
export const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D): T => { parent.add(o); return o; };
export const group = (parent: THREE.Object3D, at?: [number, number, number], rotY = 0) => { const g = new THREE.Group(); if (at) g.position.set(...at); g.rotation.y = rotY; parent.add(g); return g; };

/* ---- freeing a room ----
   Everything a room built goes when it is left: geometry, materials, their
   textures and the shadow maps of its lights. Textures marked `keep` (the
   ramps and the shared grain tiles) stay, because every room uses them. */
export function disposeTree(root: THREE.Object3D){
  const geos = new Set<THREE.BufferGeometry>(), mats = new Set<THREE.Material>(), texs = new Set<THREE.Texture>();
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.geometry) geos.add(m.geometry);
    const mm = m.material; if (mm) (Array.isArray(mm) ? mm : [mm]).forEach(x => mats.add(x));
    const l = o as any; if (l.isLight && l.shadow && l.shadow.map){ l.shadow.map.dispose(); l.shadow.map = null; }
  });
  mats.forEach(m => { for (const k of Object.keys(m)){ const v = (m as any)[k]; if (v && v.isTexture) texs.add(v); } m.dispose(); });
  geos.forEach(g => g.dispose());
  texs.forEach(t => { if (!t.userData.keep) t.dispose(); });
}
