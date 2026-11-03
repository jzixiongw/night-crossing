import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BRUSH, SHADE } from '../core/paint';
import { mk } from '../core/util';
import { C3 } from './config';

/* ================= MATERIALS, TEXTURES, SMALL GEOMETRY =================
   The Canvas2D look is light face / body / core shadow / bounce rim, then the
   brush grain. Here that becomes: a three-band toon ramp with soft steps (the
   faces), a cold fresnel rim patched into the toon shader (the bounce light),
   and the game's own brush tiles from core/paint.ts as a multiply map (the
   grain). No outlines, as in the 2D rooms. */

let RAMP: THREE.DataTexture = null;
export function ramp(){
  if (RAMP) return RAMP;
  const n = 64, d = new Uint8Array(n), { levels, edges, soft } = C3.ramp;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a)/(b - a))); return t*t*(3 - 2*t); };
  for (let i = 0; i < n; i++){
    const t = i/(n - 1);
    let v = levels[0];
    v += (levels[1] - levels[0])*ss(edges[0] - soft, edges[0] + soft, t);
    v += (levels[2] - levels[1])*ss(edges[1] - soft, edges[1] + soft, t);
    d[i] = Math.round(v*255);
  }
  RAMP = new THREE.DataTexture(d, n, 1, THREE.RedFormat);
  RAMP.minFilter = RAMP.magFilter = THREE.LinearFilter; RAMP.generateMipmaps = false; RAMP.needsUpdate = true;
  return RAMP;
}

/* Shared, so one write retunes every material in the room. */
export const RIM = { color: { value: new THREE.Color(C3.rim.color) }, k: { value: C3.rim.k } };

function patchRim(m: THREE.Material, rim = 1){
  m.onBeforeCompile = sh => {
    sh.uniforms.uRim = RIM.color; sh.uniforms.uRimK = RIM.k; sh.uniforms.uRimS = { value: rim };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK; uniform float uRimS;')
      .replace('#include <opaque_fragment>',
        'float rimF = pow(1.0 - saturate(abs(dot(normalize(normal), normalize(vViewPosition)))), 3.0);\n' +
        'outgoingLight += uRim * rimF * uRimK * uRimS;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'nc-rim';
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
    GRAIN[kind] = t;
  }
  const t = GRAIN[kind].clone(); t.repeat.set(rx, ry); return t;
}

export interface ToonOpts { grain?: number; rep?: number | [number, number]; emissive?: string; ei?: number; side?: THREE.Side; rim?: number; map?: THREE.Texture; transparent?: boolean; opacity?: number }
export function toon(color: string, o: ToonOpts = {}){
  const rep = o.rep ?? 1, [rx, ry] = Array.isArray(rep) ? rep : [rep, rep];
  const m = new THREE.MeshToonMaterial({
    color, gradientMap: ramp(),
    map: o.map || (o.grain === -1 ? null : grain(o.grain ?? 1, rx, ry)),
    emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0),
    emissiveIntensity: o.ei ?? 1, side: o.side ?? THREE.FrontSide,
    transparent: !!o.transparent, opacity: o.opacity ?? 1
  });
  patchRim(m, o.rim ?? 1);
  return m;
}
export function flatMat(color: string, o: { opacity?: number; additive?: boolean; map?: THREE.Texture; side?: THREE.Side } = {}){
  return new THREE.MeshBasicMaterial({ color, map: o.map || null, transparent: o.opacity != null || !!o.additive || !!o.map, opacity: o.opacity ?? 1,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !(o.additive || o.opacity != null), side: o.side ?? THREE.FrontSide, toneMapped: false });
}

/* ---- canvases as textures ---- */
const CTEX = new WeakMap<HTMLCanvasElement, THREE.CanvasTexture>();
export function texOf(c: HTMLCanvasElement){
  let t = CTEX.get(c);
  if (!t){ t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; CTEX.set(c, t); }
  return t;
}
export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void){
  const c = mk(w, h), g = c.getContext('2d'), t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const redraw = () => { g.setTransform(1,0,0,1,0,0); g.clearRect(0, 0, c.width, c.height); draw(g, c.width, c.height); t.needsUpdate = true; };
  redraw();
  return { c, g, t, redraw };
}

/* ---- things the pointer should pass straight through ---- */
export const noRay = <T extends THREE.Object3D>(o: T): T => { o.traverse(x => { x.raycast = () => {}; }); return o; };

/* A soft additive glow, from the same sprites the 2D rooms use. */
export function glow(canvas: HTMLCanvasElement, size: number, opacity = 1){
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(canvas), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity, toneMapped: false }));
  s.scale.set(size, size, 1); return noRay(s);
}
/* The 2D `shadow()`: a soft dark blot under a thing, which reads as contact
   where a shadow map alone would leave the object floating. */
export function blot(rx: number, rz: number, a = .45){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(rx*2, rz*2), new THREE.MeshBasicMaterial({ map: texOf(SHADE), transparent: true, opacity: a, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI/2; m.renderOrder = 1; return noRay(m);
}

/* ---- geometry ---- */
export const rbox = (w: number, h: number, d: number, r = .02, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w/2 - .001, h/2 - .001, d/2 - .001));
export function rrPath(p: THREE.Path, x: number, y: number, w: number, h: number, r: number){
  r = Math.min(r, w/2, h/2);
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
  return p;
}
export const rrShape = (x: number, y: number, w: number, h: number, r: number) => rrPath(new THREE.Shape(), x, y, w, h, r) as THREE.Shape;
/* Normals follow the winding, so a profile listed top-down still shades as
   an outside surface instead of being lit from within. */
export function lathe(pts: [number, number][], seg = 32){ const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg); g.computeVertexNormals(); return g; }
/* Planar UVs, 0..1 over the shape's own bounding box, so a canvas maps on
   exactly and a hit's uv is a position on the thing. */
export function planarUV(g: THREE.BufferGeometry){
  g.computeBoundingBox(); const b = g.boundingBox, p = g.attributes.position, uv = new Float32Array(p.count*2);
  for (let i = 0; i < p.count; i++){ uv[i*2] = (p.getX(i) - b.min.x)/(b.max.x - b.min.x); uv[i*2+1] = (p.getY(i) - b.min.y)/(b.max.y - b.min.y); }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], at?: [number, number, number], o: { cast?: boolean; receive?: boolean; rot?: [number, number, number] } = {}){
  const m = new THREE.Mesh(geo, mat);
  if (at) m.position.set(at[0], at[1], at[2]);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true;
  return m;
}
