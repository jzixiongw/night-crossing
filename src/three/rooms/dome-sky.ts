import * as THREE from 'three';
import { SIND, SROSE, txt, txtW } from '../../core/paint';
import { CH, CW, RS, cv } from '../../core/surface';
import { clamp, mk } from '../../core/util';
import { SKY_W, STARS, components, compName, endHidden, endPos, skyOff, starAlpha, wdx } from '../../rooms/dome';
import { PR, S } from '../../state/runtime';
import { G } from '../../state/store';
import { DOME } from '../config/dome';
import { FONT_GEN, camera, rayAt } from '../engine';
import { canvasTex, noRay, spriteTex } from '../kit';

/* ================= THE DOME'S SKY =================
   A sphere round the eye (it follows the camera, so it is infinitely far and
   lying down does not shift it). Inside it, `turn` is the rotating sky: every
   star, line, ring and name is laid out once in the sky's own design units
   and the group turns by skyOff(), exactly as the 2D strip slid by it.

   The one mapping, both ways:
     design (x, y) -> direction:  azimuth (x - 800)/SKY_W turns, elevation el(y)
     direction -> design (x, y):  the inverse, which is what a tap hands d:sky
   A tap's direction is world-space (no sky turn), so it comes back as the 2D
   handler wanted it: x *before* the sky offset. */
const SK = DOME.sky, PAL = DOME.palette, D2R = Math.PI/180, TAU = Math.PI*2;
/* elevation over the strip's height t = 0 (design y 686) .. 1 (y 46): el = EL0 + A t + B t^2,
   about conformal at the horizon (A) and opening up overhead (B); straight on below t = 0 */
const EL0 = SK.elBot*D2R, EL1 = SK.elTop*D2R, Y0 = SK.yBot, Y1 = SK.yTop, EA = SK.elRate0*D2R, EB = EL1 - EL0 - EA;
export const elOf = (y: number) => { const t = (Y0 - y)/(Y0 - Y1); return t < 0 ? EL0 + EA*t : EL0 + EA*t + EB*t*t; };
export const yOf = (el: number) => { const t = el < EL0 ? (el - EL0)/EA : (-EA + Math.sqrt(EA*EA + 4*EB*(el - EL0)))/(2*EB); return Y0 - t*(Y0 - Y1); };
export const azOf = (x: number) => (x - 800)/SKY_W*TAU;
export const xOf = (az: number) => 800 + az/TAU*SKY_W;
export function skyDir(x: number, y: number, out = new THREE.Vector3()){
  const a = azOf(x), e = elOf(y), c = Math.cos(e);
  return out.set(c*Math.sin(a), Math.sin(e), -c*Math.cos(a));
}
export function dirToSky(d: THREE.Vector3){
  const n = d.clone().normalize();
  return { x: xOf(Math.atan2(n.x, -n.z)), y: yOf(Math.asin(clamp(n.y, -1, 1))) };
}
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255)/255, (n >> 8 & 255)/255, (n & 255)/255]; };
const vec3 = (h: string) => new THREE.Vector3(...rgb(h));

/* ---------- the sky gradient, which is also what a tap on the sky hits ---------- */
function skyBall(R: number){
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uLo: { value: vec3(PAL.skyLo) }, uMid: { value: vec3(PAL.skyMid) }, uHi: { value: vec3(PAL.skyHi) }, uHull: { value: vec3(PAL.hull) }, uK: { value: 1 }, uWarm: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uLo, uMid, uHi, uHull; uniform float uK, uWarm; varying vec3 vP;
      void main(){
        float e = asin(clamp(normalize(vP).y, -1., 1.));
        vec3 c = e < 0. ? mix(uLo*.8, uHull, smoothstep(0., -.03, e)) : mix(mix(uLo, uMid, smoothstep(0., .62, e)), uHi, smoothstep(.62, 1.4, e));
        c = c*uK + vec3(1., .85, .64)*uWarm*.025;
        gl_FragColor = vec4(c, 1.);
      }`
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 16), m);
  ball.renderOrder = -10; ball.frustumCulled = false;
  return ball;
}

/* ---------- stars: one Points, the 2D's disc + glow per tier in one sprite ---------- */
function starField(R: number){
  const n = STARS.length, pos = new Float32Array(n*3), col = new Float32Array(n*3), gcol = new Float32Array(n*3);
  const size = new Float32Array(n), gR = new Float32Array(n), gA = new Float32Array(n), tw = new Float32Array(n), ph = new Float32Array(n), alpha = new Float32Array(n);
  const v = new THREE.Vector3(), cool = rgb('#b9d6ee'), amber = rgb('#f2a95b');
  STARS.forEach((st, i) => {
    skyDir(st.x, st.y, v).multiplyScalar(R); pos.set([v.x, v.y, v.z], i*3);
    col.set(rgb(st.col), i*3); size[i] = st.r; tw[i] = st.tw ? 1 : 0; ph[i] = st.ph || 0;
    /* tier 0: a cool glow of 5r at .35; tier 3 (the variables): amber, 18 units at .7 */
    if (st.tier === 3){ gcol.set(amber, i*3); gR[i] = 18; gA[i] = .7; }
    else if (st.tier === 0){ gcol.set(cool, i*3); gR[i] = st.r*5; gA[i] = .35; }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('gcol', new THREE.BufferAttribute(gcol, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1)); g.setAttribute('gR', new THREE.BufferAttribute(gR, 1)); g.setAttribute('gA', new THREE.BufferAttribute(gA, 1));
  g.setAttribute('tw', new THREE.BufferAttribute(tw, 1)); g.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
  const aAttr = new THREE.BufferAttribute(alpha, 1); aAttr.setUsage(THREE.DynamicDrawUsage); g.setAttribute('alpha', aAttr);
  const u = { uT: { value: 0 }, uPx: { value: 1 }, uTw: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
    vertexShader: `attribute vec3 color, gcol; attribute float size, gR, gA, tw, phase, alpha; uniform float uT, uPx, uTw;
      varying vec3 vC, vG; varying float vA, vR, vGR, vGA, vH;
      void main(){
        float t = tw > .5 ? 1. - uTw*(.35 - .35*sin(uT*1.1 + phase)) : 1.;
        vC = color; vG = gcol; vA = alpha; vGA = gA*t; vR = size*uPx; vGR = gR*uPx;
        vA *= t;
        vH = max(vR + 1.5, vGR);
        gl_PointSize = alpha < .005 ? 0. : 2.*vH;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.);
      }`,
    fragmentShader: `varying vec3 vC, vG; varying float vA, vR, vGR, vGA, vH;
      void main(){
        float d = length(gl_PointCoord - .5)*2.*vH;
        float core = clamp(vR + .5 - d, 0., 1.)*min(1., 4.*vR*vR);
        float g = 0.;
        if (vGR > 0.){ float q = d/vGR; g = q < .4 ? mix(1., .42, q/.4) : mix(.42, 0., clamp((q - .4)/.6, 0., 1.)); }
        gl_FragColor = vec4((vC*core + vG*g*vGA)*vA, 1.);
      }`
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = -8;
  return { pts, u, aAttr, alpha };
}

/* ---------- star lines: ribbons on the sphere ----------
   A line is straight in design (x, y), as in 2D; it is sampled every few units
   and each sample put on the sphere, so it curves the way the strip does. The
   ribbon is a soft wide stroke with a chalk core; dashes come from the arc
   length in the fragment shader, so a hanging line is dashed evenly. */
const ribbonVS = `attribute float aV, aS, aA, aG, aC, aD; varying float vV, vS, vA, vG, vC, vD;
  void main(){ vV = aV; vS = aS; vA = aA; vG = aG; vC = aC; vD = aD; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`;
const ribbonFS = `uniform vec3 uCol; uniform vec2 uDash; varying float vV, vS, vA, vG, vC, vD;
  void main(){
    if (vD > .5 && mod(vS, uDash.x + uDash.y) > uDash.x) discard;
    float d = abs(vV), fw = max(fwidth(vV), .02);
    float core = 1. - smoothstep(vC - fw, vC + fw, d);
    float glow = 1. - smoothstep(0., 1., d);
    float a = 1. - (1. - core*vA)*(1. - glow*glow*vG);
    if (a < .004) discard;
    gl_FragColor = vec4(uCol, a);
  }`;
function ribbonMat(col: string, dash: readonly [number, number]){
  return new THREE.ShaderMaterial({ vertexShader: ribbonVS, fragmentShader: ribbonFS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uCol: { value: vec3(col) }, uDash: { value: new THREE.Vector2(dash[0], dash[1]) } } });
}
interface Strip { pos: number[]; v: number[]; s: number[]; a: number[]; g: number[]; c: number[]; d: number[]; idx: number[] }
const strip = (): Strip => ({ pos: [], v: [], s: [], a: [], g: [], c: [], d: [], idx: [] });
/* one line into the strip: from (ax, ay) to (bx, by) in design units, half width hw (radians) */
function addRibbon(o: Strip, R: number, ax: number, ay: number, bx: number, by: number, hw: number, A: number, Gl: number, C: number, dashed: boolean){
  const len = Math.hypot(bx - ax, by - ay); if (len < .5) return;
  const n = Math.max(2, Math.ceil(len/8)), dirs: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++){ const t = i/n; dirs.push(skyDir(ax + (bx - ax)*t, ay + (by - ay)*t)); }
  const tan = new THREE.Vector3(), side = new THREE.Vector3(); let s = 0;
  const base = o.pos.length/3;
  for (let i = 0; i <= n; i++){
    const d = dirs[i];
    if (i) s += dirs[i - 1].angleTo(d)/D2R;
    tan.copy(dirs[Math.min(n, i + 1)]).sub(dirs[Math.max(0, i - 1)]);
    side.crossVectors(d, tan).normalize();
    for (const k of [1, -1]){
      o.pos.push((d.x + side.x*hw*k)*R, (d.y + side.y*hw*k)*R, (d.z + side.z*hw*k)*R);
      o.v.push(k); o.s.push(s); o.a.push(A); o.g.push(Gl); o.c.push(C); o.d.push(dashed ? 1 : 0);
    }
    if (i < n){ const q = base + i*2; o.idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
  }
}
function stripGeo(o: Strip){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
  for (const [k, arr] of [['aV', o.v], ['aS', o.s], ['aA', o.a], ['aG', o.g], ['aC', o.c], ['aD', o.d]] as const) g.setAttribute(k, new THREE.Float32BufferAttribute(arr, 1));
  g.setIndex(o.idx);
  return g;
}

/* ---------- rings: free ends, hidden ends, the picked star ---------- */
function ringPoints(){
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uPx: { value: 1 }, uLine: { value: vec3(PAL.line) }, uPick: { value: vec3(PAL.pick) } },
    vertexShader: `attribute float kind; uniform float uPx; varying float vK, vH;
      void main(){ vK = kind; float r = kind < .5 ? 5. : kind < 1.5 ? 7. : 11.; vH = r + 2.5;
        gl_PointSize = 2.*vH*uPx; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uLine, uPick; uniform float uPx; varying float vK, vH;
      void main(){
        vec2 p = (gl_PointCoord - .5)*2.*vH; float d = length(p), aa = .6/max(uPx, .3), a;
        vec3 c = uLine;
        if (vK < .5) a = .55*(smoothstep(3.4 - aa, 3.4 + aa, d) - smoothstep(5. - aa, 5. + aa, d));
        else if (vK < 1.5){ a = .35*(1. - smoothstep(.65, .65 + aa*1.5, abs(d - 7.)));
          float arc = (atan(p.y, p.x) + 3.14159265)*7.; if (mod(arc, 6.) > 2.) a = 0.; }
        else { a = .9*(1. - smoothstep(1., 1. + aa*1.5, abs(d - 11.))); c = uPick; }
        if (a < .004) discard;
        gl_FragColor = vec4(c, a);
      }`
  });
  return m;
}

export function buildDomeSky(){
  const R = SK.R;
  const root = new THREE.Group(); root.name = 'sky';
  const ball = skyBall(R); root.add(ball);
  const turn = new THREE.Group(); root.add(turn);

  /* nebulae, as the 2D drew them: the indigo band and the rose patch */
  const nebula = ([cv0, x, y, w, h]: [HTMLCanvasElement, number, number, number, number]) => {
    const el = elOf(y), aw = w*TAU/SKY_W*Math.cos(el), ah = Math.abs(elOf(y - h/2) - elOf(y + h/2)), Rn = R*.97;
    const m = noRay(new THREE.Mesh(new THREE.PlaneGeometry(2*Rn*Math.tan(Math.min(aw, 2.6)/2), 2*Rn*Math.tan(ah/2)),
      new THREE.MeshBasicMaterial({ map: spriteTex(cv0), transparent: true, depthWrite: false, opacity: 0, toneMapped: false })));
    const d = skyDir(x, y); m.position.copy(d).multiplyScalar(Rn);
    m.up.set(0, 1, 0); m.lookAt(0, 0, 0); m.renderOrder = -9; turn.add(m);
    return m;
  };
  const neb = [nebula([SIND, 1900, 330, 1400, 420]), nebula([SROSE, 3650, 240, 900, 360])];

  const stars = starField(R); turn.add(stars.pts);

  /* lines, rings, names: rebuilt only when what they show changes */
  const lineMat = ribbonMat(PAL.line, SK.dash);
  const lines = noRay(new THREE.Mesh(new THREE.BufferGeometry(), lineMat)); lines.frustumCulled = false; lines.renderOrder = -7; turn.add(lines);
  const ringMat = ringPoints();
  const rings = noRay(new THREE.Points(new THREE.BufferGeometry(), ringMat)); rings.frustumCulled = false; rings.renderOrder = -6; turn.add(rings);
  const labels: { s: THREE.Sprite; tex: THREE.CanvasTexture; w: number; h: number }[] = [];
  function clearLabels(){ for (const l of labels){ turn.remove(l.s); l.tex.dispose(); l.s.material.dispose(); } labels.length = 0; }
  function label(text: string, x: number, y: number){
    const fs = 64, g = mk(8, 8).getContext('2d');
    const w = Math.ceil(Math.max(64, txtW(g, text, fs)*1.1 + fs)), h = Math.ceil(fs*1.6);
    const ct = canvasTex(w, h, (gg, cw, chh) => { txt(gg, text, cw/2, chh*.68, fs, PAL.line, { a: .8 }); });
    const s = noRay(new THREE.Sprite(new THREE.SpriteMaterial({ map: ct.t, transparent: true, depthWrite: false, sizeAttenuation: false, toneMapped: false })));
    s.position.copy(skyDir(x, y)).multiplyScalar(R*.95); s.renderOrder = -5; turn.add(s);
    labels.push({ s, tex: ct.t, w, h });
  }
  const hwGlow = SK.line.glow/2*D2R;
  let sig = '';
  function rebuild(){
    const o = strip(), rp: number[] = [], kind: number[] = [], v = new THREE.Vector3(), Rr = R*.985;
    const ring = (x: number, y: number, k: number) => { skyDir(x, y, v).multiplyScalar(Rr); rp.push(v.x, v.y, v.z); kind.push(k); };
    for (const l of G.lines){
      const a = endPos(l.a), b = endPos(l.b), bx = a.x + wdx(b.x, a.x);
      const hid = endHidden(l.a) || endHidden(l.b), free = l.a.s == null || l.b.s == null, soft = hid || free;
      addRibbon(o, R*.99, a.x, a.y, bx, b.y, hwGlow, soft ? .5 : .82, soft ? .2 : .25, (soft ? SK.line.coreDash : SK.line.core)/SK.line.glow, soft);
      for (const e of [l.a, l.b]){
        if (e.s == null) ring(e.x, e.y, 0);
        else if (endHidden(e)) ring(STARS[e.s].x, STARS[e.s].y, 1);
      }
    }
    if (S.pick){ const p = endPos(S.pick); ring(p.x, p.y, 2); }
    lines.geometry.dispose(); lines.geometry = stripGeo(o);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('kind', new THREE.Float32BufferAttribute(kind, 1));
    rings.geometry.dispose(); rings.geometry = rg;
    clearLabels();
    components().forEach(comp => { const n = compName(comp); if (!n) return;
      const a0 = endPos(comp[0].a); let sx = 0, sy = 0, k = 0;
      comp.forEach(l => [l.a, l.b].forEach(e => { const p = endPos(e); sx += a0.x + wdx(p.x, a0.x); sy += p.y; k++; }));
      label(n, sx/k, sy/k + SK.label.dy); });
  }

  /* the dashed line from the picked star to the pointer: changes every frame,
     so it is its own small ribbon with buffers made once */
  const PN = 48;
  const prevMat = ribbonMat(PAL.line, SK.preview.dash);
  const prevGeo = (() => {
    const g = new THREE.BufferGeometry(), idx: number[] = [];
    for (let i = 0; i < PN; i++){ const q = i*2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    const f = (n: number, fill?: (i: number) => number) => { const a = new Float32Array((PN + 1)*2*n); if (fill) for (let i = 0; i < a.length; i++) a[i] = fill(i); return a; };
    g.setAttribute('position', new THREE.BufferAttribute(f(3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aS', new THREE.BufferAttribute(f(1), 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aV', new THREE.BufferAttribute(f(1, i => i % 2 ? -1 : 1), 1));
    g.setAttribute('aA', new THREE.BufferAttribute(f(1, () => SK.preview.alpha), 1));
    g.setAttribute('aG', new THREE.BufferAttribute(f(1, () => 0), 1));
    g.setAttribute('aC', new THREE.BufferAttribute(f(1, () => 1), 1));
    g.setAttribute('aD', new THREE.BufferAttribute(f(1, () => 1), 1));
    g.setIndex(idx); return g;
  })();
  const preview = noRay(new THREE.Mesh(prevGeo, prevMat)); preview.frustumCulled = false; preview.renderOrder = -6; preview.visible = false; turn.add(preview);
  const pd = Array.from({ length: PN + 1 }, () => new THREE.Vector3()), tanV = new THREE.Vector3(), sideV = new THREE.Vector3();
  function drawPreview(off: number){
    preview.visible = false;
    if (!S.pick) return;
    const r = cv.getBoundingClientRect();
    if (!(PR.cx >= r.left && PR.cx <= r.right && PR.cy >= r.top && PR.cy <= r.bottom)) return;
    const q = dirToSky(rayAt((PR.cx - r.left)/r.width*CW, (PR.cy - r.top)/r.height*CH).ray.direction);
    /* q is before the sky offset, as a tap would hand it; the sky's own x is q.x + off */
    const p = endPos(S.pick), qx = p.x + wdx(q.x + off, p.x), len = Math.hypot(qx - p.x, q.y - p.y);
    if (len < 4) return;
    const n = clamp(Math.ceil(len/10), 2, PN), hw = SK.preview.w/2*D2R, Rp = R*.98;
    const pos = prevGeo.attributes.position as THREE.BufferAttribute, as = prevGeo.attributes.aS as THREE.BufferAttribute;
    for (let i = 0; i <= n; i++) skyDir(p.x + (qx - p.x)*i/n, p.y + (q.y - p.y)*i/n, pd[i]);
    let s = 0;
    for (let i = 0; i <= n; i++){
      const d = pd[i];
      if (i) s += pd[i - 1].angleTo(d)/D2R;
      tanV.copy(pd[Math.min(n, i + 1)]).sub(pd[Math.max(0, i - 1)]); sideV.crossVectors(d, tanV).normalize();
      pos.setXYZ(i*2, (d.x + sideV.x*hw)*Rp, (d.y + sideV.y*hw)*Rp, (d.z + sideV.z*hw)*Rp);
      pos.setXYZ(i*2 + 1, (d.x - sideV.x*hw)*Rp, (d.y - sideV.y*hw)*Rp, (d.z - sideV.z*hw)*Rp);
      as.setX(i*2, s); as.setX(i*2 + 1, s);
    }
    pos.needsUpdate = true; as.needsUpdate = true;
    prevGeo.setDrawRange(0, n*6); preview.visible = true;
  }

  /* meteors: S.dMeteors is in the 2D's screen-design units (no sky turn),
     so they hang off `root`, not `turn` */
  const streak = canvasTex(256, 16, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(238,245,251,.95)'); gr.addColorStop(1, 'rgba(238,245,251,0)');
    g.fillStyle = gr; g.fillRect(0, h*.3, w, h*.4); g.globalAlpha = .4; g.fillRect(0, h*.15, w*.4, h*.7); });
  const meteors = [0, 1, 2, 3].map(() => { const m = noRay(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: streak.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
    m.visible = false; m.renderOrder = -6; m.frustumCulled = false; root.add(m); return m; });
  const mA = new THREE.Vector3(), mB = new THREE.Vector3(), bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3();
  function drawMeteors(dt: number){
    /* the 2D back() advanced these as it drew them; nothing else does */
    for (let i = S.dMeteors.length - 1; i >= 0; i--){ const m = S.dMeteors[i]; m.t += dt; if (m.t/1.2 >= 1) S.dMeteors.splice(i, 1); }
    meteors.forEach((o, i) => {
      const m = S.dMeteors[i]; o.visible = !!m; if (!m) return;
      const q = m.t/1.2, x = m.x - q*280, y = m.y + q*104, Rm = R*.96;
      skyDir(x, y, mA).multiplyScalar(Rm); skyDir(x + SK.meteor.len, y - SK.meteor.len*30/80, mB).multiplyScalar(Rm);
      o.position.copy(mA).add(mB).multiplyScalar(.5);
      bx.copy(mB).sub(mA); const len = bx.length(); bx.normalize();
      bz.copy(o.position).negate().normalize(); by.crossVectors(bz, bx).normalize(); bx.crossVectors(by, bz);
      o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(bx, by, bz));
      o.scale.set(len, Rm*SK.meteor.w*D2R*1.6, 1);
      (o.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI*q);
    });
  }

  function update(dt: number){
    root.position.copy(camera.position);
    const off = skyOff(); turn.rotation.y = off/SKY_W*TAU;
    const lamp = S.dLamp ?? (G.domeLight ? 1 : 0);
    /* the gradient: darker with the lamp off, as the 2D's heavier dark wash */
    (ball.material as THREE.ShaderMaterial).uniforms.uK.value = .8 + .12*lamp;
    (ball.material as THREE.ShaderMaterial).uniforms.uWarm.value = lamp;
    neb[0].material.opacity = .35*(1 - lamp*.5); neb[1].material.opacity = .18;
    for (let i = 0; i < STARS.length; i++) stars.alpha[i] = starAlpha(STARS[i]);
    stars.aAttr.needsUpdate = true;
    stars.u.uT.value = S.T; stars.u.uPx.value = RS; stars.u.uTw.value = G.reduced ? .3 : 1;
    ringMat.uniforms.uPx.value = RS;
    const pk = S.pick ? (S.pick.s != null ? 's' + S.pick.s : Math.round(S.pick.x) + ',' + Math.round(S.pick.y)) : '';
    const s2 = [G.lines.map(l => l.id).join(','), JSON.stringify(G.names), pk, JSON.stringify(S.varVis || {}), FONT_GEN].join('|');
    if (s2 !== sig){ sig = s2; rebuild(); }
    /* names stay the same size on screen: ~20 design units of type */
    if (labels.length){ const k = 2*Math.tan(camera.fov*D2R/2)/CH; for (const l of labels){ const hpx = SK.label.size*RS*l.h/64; l.s.scale.set(hpx*k*l.w/l.h, hpx*k, 1); } }
    drawPreview(off);
    drawMeteors(dt);
  }
  return { root, ball, update, reset: () => { sig = ''; }, dispose: clearLabels };
}
