import * as THREE from 'three';
import { SIND, SPR_OF, SROSE, STEAL, SWARM } from '../core/paint';
import { RS } from '../core/surface';
import { hex } from '../core/util';
import { COL } from '../data/index';
import { S } from '../state/runtime';
import { beaconIntensity, ROUTE_SKY } from '../rooms/cabin';
import { C3, U, designX, designY, wallX, wallY } from './config';
import { canvasTex, glow, texOf } from './kit';

/* ================= THE SKY BEYOND THE GLASS =================
   A backdrop C3.sky.depth metres behind the back wall. Everything the game
   keeps in "beacon space" (S.beacons, S.cStars, the planets, the dust) is in
   design units at the 2D cabin's K_SP layer; skyPt() puts a design point on
   the backdrop so that, seen from the resting eye, it lands exactly where the
   2D cabin painted it. Moving the camera then gives real parallax against the
   window frames, and windowOf() asks the real question: is the line from the
   eye to this beacon passing through glass? */
const EYE = C3.camera.eye, ZW = C3.room.back, ZS = C3.room.back - C3.sky.depth;
export const SKY_R = (EYE[2] - ZS)/(EYE[2] - ZW);
export const SKY_Z = ZS;
export const skyLocal = (x: number, y: number, z = ZS) => new THREE.Vector3(EYE[0] + (wallX(x) - EYE[0])*SKY_R, EYE[1] + (wallY(y) - EYE[1])*SKY_R, z);
const SU = (d: number) => U(d)*SKY_R;   // a design length on the backdrop

const vtxPlain = `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;

function planetMat(c: { l: string; b: string; d: string; r: string }, bands: string){
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uL: { value: new THREE.Color(c.l) }, uB: { value: new THREE.Color(c.b) }, uD: { value: new THREE.Color(c.d) }, uR: { value: new THREE.Color(c.r) },
      uBand: { value: new THREE.Color(bands) }, uA: { value: 1 }, uLight: { value: new THREE.Vector3(-.62, .62, .48).normalize() } },
    vertexShader: `varying vec3 vN; varying vec3 vO; varying vec3 vV;
      void main(){ vN = normalize(mat3(modelMatrix)*normal); vO = position; vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uL, uB, uD, uR, uBand, uLight; uniform float uA; varying vec3 vN; varying vec3 vO; varying vec3 vV;
      void main(){
        float d = dot(normalize(vN), uLight);
        vec3 c = mix(uD, uB, smoothstep(-.25, -.05, d)); c = mix(c, uL, smoothstep(.45, .62, d));
        float r = length(vO); float b = smoothstep(.55, .9, sin(vO.y/r*24.0 + vO.x/r*1.6)*.5 + .5);
        c = mix(c, uBand, b*.18);
        float rim = pow(1. - abs(dot(normalize(vN), vec3(0.,0.,1.))), 3.); c += uR*rim*.35;
        gl_FragColor = vec4(c, uA);
        #include <colorspace_fragment>
      }`
  });
}

export function buildSky(){
  const group = new THREE.Group(); group.name = 'sky';
  const mix = (i: number) => { const w = S.rw, out = [0, 0, 0]; for (const k in w){ const A = hex(ROUTE_SKY[k][i]); for (let j = 0; j < 3; j++) out[j] += A[j]*w[k]; } return new THREE.Color().setRGB(out[0]/255, out[1]/255, out[2]/255, THREE.SRGBColorSpace); };

  /* the gradient */
  const pad = C3.sky.bgPad, bgW = SU(2600)*pad, bgH = SU(1100)*pad;
  const bgU = { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uY0: { value: skyLocal(0, 620).y }, uY1: { value: skyLocal(0, 80).y } };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(bgW, bgH), new THREE.ShaderMaterial({ uniforms: bgU, depthWrite: false, vertexShader: vtxPlain,
    fragmentShader: `uniform vec3 uTop, uBot; uniform float uY0, uY1; varying vec3 vW;
      void main(){ gl_FragColor = vec4(mix(uBot, uTop, clamp((vW.y - uY0)/(uY1 - uY0), 0., 1.)), 1.);
        #include <colorspace_fragment>
      }` }));
  bg.position.copy(skyLocal(800, 350, ZS - 1)); bg.renderOrder = -10; group.add(bg);

  /* stars, from the same seeded list the 2D cabin draws */
  const starU = { uT: { value: 0 }, uVis: { value: 1 }, uPx: { value: 1 }, uA: { value: 1 } };
  const starMat = (u) => new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false,
    vertexShader: `attribute float size; attribute float phase; attribute float tw; attribute float sp; attribute vec3 color;
      uniform float uT, uPx; varying vec3 vC; varying float vA; varying float vSp;
      void main(){ vC = color; vA = tw > .5 ? .55 + .45*sin(uT*1.1 + phase) : 1.; vSp = sp;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_PointSize = max(1.5, size*uPx*(sp > .5 ? 9. : 2.6)); }`,
    fragmentShader: `uniform float uVis, uA; varying vec3 vC; varying float vA; varying float vSp;
      void main(){ vec2 p = gl_PointCoord*2. - 1.; float r = length(p); float a;
        if (vSp > .5){ float cr = max(smoothstep(.12, 0., abs(p.x))*(1. - abs(p.y)), smoothstep(.12, 0., abs(p.y))*(1. - abs(p.x))); a = max(smoothstep(.3, .05, r), cr*.7); }
        else a = smoothstep(1., .25, r);
        gl_FragColor = vec4(vC, a*vA*uVis*uA);
        #include <colorspace_fragment>
      }` });
  function starPoints(list, colOf, sizeOf, u){
    const n = list.length, pos = new Float32Array(n*3), col = new Float32Array(n*3), size = new Float32Array(n), ph = new Float32Array(n), tw = new Float32Array(n), sp = new Float32Array(n);
    list.forEach((s, i) => { const p = skyLocal(s.x, s.y); pos.set([p.x, p.y, p.z], i*3); const c = new THREE.Color(colOf(s)); col.set([c.r, c.g, c.b], i*3);
      size[i] = sizeOf(s); ph[i] = s.ph || 0; tw[i] = s.tw ? 1 : 0; sp[i] = s.sp ? 1 : 0; });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1)); g.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
    g.setAttribute('tw', new THREE.BufferAttribute(tw, 1)); g.setAttribute('sp', new THREE.BufferAttribute(sp, 1));
    const pts = new THREE.Points(g, starMat(u)); pts.frustumCulled = false; return pts;
  }
  const stars = starPoints(S.cStars, s => s.c, s => s.r, starU); group.add(stars);
  const qU = { uT: starU.uT, uVis: starU.uVis, uPx: starU.uPx, uA: { value: 0 } };
  const qStars = starPoints(S.qStars, () => '#dfe9f3', s => s.r*.8, qU); group.add(qStars);

  /* nebula, the far planet, the ring planet, the harbour */
  const neb = [[SROSE, 580, 330, 760, 420, .55], [STEAL, 1170, 370, 820, 380, .55], [SIND, 850, 320, 900, 520, .4]].map(([cv, x, y, w, h, a]: any) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(cv), transparent: true, depthWrite: false, opacity: 0, toneMapped: false }));
    s.position.copy(skyLocal(x, y, ZS + .5)); s.scale.set(SU(w), SU(h), 1); s.userData = { x, a }; group.add(s); return s;
  });
  const farMat = planetMat({ l: '#a9c7e6', b: '#5f80ad', d: '#2b4068', r: '#8fb0d4' }, '#dfe9f3');
  const far = new THREE.Mesh(new THREE.SphereGeometry(SU(44), 40, 24), farMat); far.position.copy(skyLocal(1262, 232, ZS + 2)); group.add(far);

  const ring = new THREE.Group();
  const ringMat = planetMat({ l: '#b9e4d6', b: '#5f9e98', d: '#20484f', r: '#7ec0b4' }, '#e7f6ef');
  (ringMat.uniforms.uLight.value as THREE.Vector3).set(-.8, .4, .45).normalize();
  ring.add(new THREE.Mesh(new THREE.SphereGeometry(SU(210), 56, 32), ringMat));
  const band = canvasTex(512, 512, (g, w) => {
    const c = w/2, gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(180,215,210,.1)'); gr.addColorStop(.5, 'rgba(220,240,232,.75)'); gr.addColorStop(1, 'rgba(150,190,190,.15)');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, Math.PI*2); g.arc(c, c, c*320/430, 0, Math.PI*2, true); g.fill('evenodd');
    g.globalCompositeOperation = 'destination-out'; g.lineWidth = c*8/430; g.strokeStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(c, c, c*376/430, 0, Math.PI*2); g.stroke();
  });
  const ringBandMat = new THREE.MeshBasicMaterial({ map: band.t, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const bandMesh = new THREE.Mesh(new THREE.RingGeometry(SU(320), SU(430), 96, 1), ringBandMat);
  /* tilted so the near half crosses in front of the planet and the far half
     goes behind it: the 2D cabin drew that in two passes, here depth does it */
  bandMesh.rotation.x = -Math.acos(78/430);
  ring.add(bandMesh); ring.rotation.z = 12*Math.PI/180; group.add(ring);

  const harbor = new THREE.Group();
  const hShape = new THREE.Shape(); [[60,560],[120,512],[260,500],[420,508],[560,530],[600,580],[60,590]].forEach(([x, y], i) => { const p = skyLocal(x, y); i ? hShape.lineTo(p.x, p.y) : hShape.moveTo(p.x, p.y); });
  const hMat = new THREE.MeshBasicMaterial({ color: '#0a1222', transparent: true, toneMapped: false });
  const hMesh = new THREE.Mesh(new THREE.ShapeGeometry(hShape), hMat); hMesh.position.z = ZS + 1; harbor.add(hMesh);
  const tower = new THREE.Mesh(new THREE.PlaneGeometry(SU(12), SU(84)), hMat); tower.position.copy(skyLocal(420, 472, ZS + 1.01)); harbor.add(tower);
  const hLights = []; for (let i = 0; i < 16; i++){ const x = 120 + i*28 + (i%3)*6, y = 520 + (i%4)*9; const g = glow(SWARM, SU(20)); g.position.copy(skyLocal(x, y, ZS + 1.1)); harbor.add(g); hLights.push(g); }
  const hBeam = glow(SWARM, SU(100)); hBeam.position.copy(skyLocal(420, 428, ZS + 1.1)); harbor.add(hBeam);
  group.add(harbor);

  /* dust, drifting past */
  const dustG = new THREE.BufferGeometry(), dustPos = new Float32Array(S.dust.length*3); dustG.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: '#b4cde0', size: 2, sizeAttenuation: false, transparent: true, opacity: .5, depthWrite: false, toneMapped: false });
  const dust = new THREE.Points(dustG, dustMat); dust.frustumCulled = false; group.add(dust);

  /* meteors on the quiet lane */
  const streak = canvasTex(128, 16, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(238,245,251,.95)'); gr.addColorStop(1, 'rgba(238,245,251,0)'); g.fillStyle = gr; g.fillRect(0, h*.35, w, h*.3); });
  const meteors = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(SU(86), SU(4)), new THREE.MeshBasicMaterial({ map: streak.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.visible = false; group.add(m); return m; });

  /* beacons */
  const pool = new Map<any, THREE.Group>();
  const bodyShape = new THREE.Shape(); bodyShape.moveTo(-12, -16); bodyShape.lineTo(0, 10); bodyShape.lineTo(12, -16); bodyShape.quadraticCurveTo(0, -22, -12, -16);
  const bodyGeo = new THREE.ShapeGeometry(bodyShape).scale(SU(1), SU(1), 1);
  function beaconObj(b){
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ color: '#1c2a48', transparent: true, toneMapped: false }));
    const mast = new THREE.Mesh(new THREE.PlaneGeometry(SU(2.6), SU(13)), new THREE.MeshBasicMaterial({ color: '#5f7899', transparent: true, toneMapped: false })); mast.position.y = SU(15.5);
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(SU(5.5), 20), new THREE.MeshBasicMaterial({ color: COL[b.color].hex, transparent: true, toneMapped: false })); lamp.position.set(0, SU(23), .01);
    const halo = glow(SPR_OF[b.color], SU(128)); halo.position.set(0, SU(23), .05);
    g.add(body, mast, lamp, halo); g.userData = { body, mast, lamp, halo };
    group.add(g); return g;
  }

  function update(dt: number){
    const w = S.rw, vis = .2 + S.vis*.8;
    group.position.x = SU(S.turnX || 0);
    bgU.uTop.value.copy(mix(0)); bgU.uBot.value.copy(mix(1));
    starU.uT.value = S.T; starU.uVis.value = vis; starU.uPx.value = RS; qU.uA.value = w.quiet;
    const nx = Math.sin(S.T*.03)*40;
    neb.forEach(s => { s.material.opacity = w.nebula*s.userData.a; s.position.x = skyLocal(s.userData.x + nx, 0).x; s.visible = w.nebula > .01; });
    farMat.uniforms.uA.value = w.nebula > .5 ? .45 : 1;
    ring.visible = w.ring > .01; if (ring.visible){ ring.position.copy(skyLocal(S.ringX, 400, ZS + 3)); ringMat.uniforms.uA.value = w.ring; ringBandMat.opacity = w.ring; }
    harbor.visible = w.harbor > .01;
    if (harbor.visible){ const a = w.harbor*Math.max(.08, 1 - S.harborT/180); harbor.position.x = SU(-Math.min(S.harborT, 180)*.4); hMat.opacity = a;
      hLights.forEach(g => { g.material.opacity = a*.8; }); hBeam.material.opacity = S.T % 4 < .5 ? a : 0; }
    /* the 2D cabin moved these while drawing them; nothing else does */
    const dp = dustG.attributes.position as THREE.BufferAttribute;
    S.dust.forEach((d, i) => { d.x -= d.v*dt*(S.routeVis === 'quiet' ? .6 : 1); if (d.x < -220) d.x = 1820; const p = skyLocal(d.x, d.y, ZS + 4); dp.setXYZ(i, p.x, p.y, p.z); });
    dp.needsUpdate = true; dustMat.opacity = .45*vis;
    for (let i = S.meteors.length - 1; i >= 0; i--){ const m = S.meteors[i]; m.t += dt; if (m.t/1.3 >= 1) S.meteors.splice(i, 1); }
    meteors.forEach((o, i) => { const m = S.meteors[i]; o.visible = !!m; if (!m) return; const q = m.t/1.3;
      o.position.copy(skyLocal(m.x - q*260 + 40, m.y + q*96 - 15, ZS + 3)); o.rotation.z = Math.atan2(30, 80); (o.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI*q); });
    /* beacons */
    const live = new Set(S.beacons);
    for (const [b, g] of pool) if (!live.has(b)){
      group.remove(g); pool.delete(b);
      g.traverse(o => { const m = (o as THREE.Mesh).material as THREE.Material; if (m) m.dispose(); });
    }
    S.beacons.forEach(b => {
      const g = pool.get(b) || (pool.set(b, beaconObj(b)), pool.get(b)), u = g.userData;
      g.position.copy(skyLocal(b.x, b.y + Math.sin(b.t*.9)*4, ZS + 2));
      const I = beaconIntensity(b), vis2 = S.vis*b.fade, boost = b.hint > 0 ? 1.35 : 1, a = Math.max(.25, b.fade);
      u.body.material.opacity = a; u.mast.material.opacity = a;
      u.lamp.material.opacity = a*(.3 + .7*I)*Math.max(vis2, .12);
      u.halo.material.opacity = Math.min(1, I*boost)*vis2*.95;
    });
  }
  /* world point on the backdrop -> beacon-space design point */
  function toDesign(p: THREE.Vector3){
    const X = p.x - group.position.x;
    return { x: designX(EYE[0] + (X - EYE[0])/SKY_R), y: designY(EYE[1] + (p.y - EYE[1])/SKY_R) };
  }
  return { group, update, toDesign, SU };
}
