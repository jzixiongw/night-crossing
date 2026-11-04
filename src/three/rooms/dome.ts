import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tr } from '../../i18n';
import { VIEW } from '../../core/camera';
import { BRUSH, SWARM } from '../../core/paint';
import { mixHex } from '../../core/util';
import { ACT } from '../../rooms/registry';
import * as DM from '../../rooms/dome';
import { S } from '../../state/runtime';
import { G } from '../../state/store';
import { DOME } from '../config/dome';
import { SHARED } from '../config/shared';
import { camera, designMap, pickable, register3D, type Built, type Pick } from '../engine';
import { M, RIM, blot, canvasTex, glow, group, lathe, mesh, noRay, rbox, toon, tube } from '../kit';
import { activeView, goView, type View } from '../view';
import { buildDomeSky, dirToSky, skyDir } from './dome-sky';

/* ================= THE OBSERVATION DOME, IN THREE.JS =================
   rooms/dome.ts still keeps the sky: buildDome() made STARS, its update()
   adapts the eye (S.adapt from the pointer's speed), fades the lamp (S.dLamp),
   watches the variable stars land hanging lines and spawns meteors, and every
   ACT['d:*'] handler answers here unchanged. This file draws the room and the
   sky and says where on the sky a tap lands (dome-sky.ts has the mapping).

   What the 2D room did, and where it is here:
     d:sky   tap a star: pick / join / stop; tap empty sky with a pick: a
             hanging line (or onto a dark variable); tap a hanging end: carry
             on from it. P is design (x, y) BEFORE the sky offset, from the ray
             through the sky sphere (dirToSky) .................... sky ball, toLocal
             Enter on it: the hint (its key()) .................... focus stop 'sky'
     d:light the small lamp: amber shade on, teal off, S.dLamp fade, warm
             light, dim stars hidden, warm reflections on the glass ... lamp, glass shader
     d:lie   the bench: lie down / sit up, label follows G.lie ....... bench; views follow G.lie
     ctx pills (lamp, lie, stop, erase last, name the group) and the name
     panel ........................................................ DOM, unchanged
     Escape cancels a pick ......................................... core/input.ts, unchanged
     painted state: STARS by tier (starAlpha: tier 2 only as the eye adapts,
             tier 3 variables with an amber glow), twinkle, two nebulae, the
             slow turn (skyOff), meteors (S.dMeteors, advanced and spliced in
             sync as back() did), G.lines solid / dashed+dimmer when an end is
             free or hidden, free ends as rings, hidden ends as dashed circles,
             component names, the picked star ringed, a dashed line from it to
             the pointer ...................................... dome-sky.ts
     lie offsets (S.lieK) ........................................... the two views
   Two places: sitting at the back of the bench (main), lying on it. Choosing
   one in the bar sets G.lie through ACT['d:lie']; tapping the bench or the
   pill moves the view. */

const RM = DOME.room, PAL = DOME.palette, LT = DOME.light, B0 = DOME.bench, LP = DOME.lamp, TB = DOME.table, V = DOME.views;
const D2R = Math.PI/180, RD = RM.r, RH = RM.rimH;
/* for flares on the room itself (the 2D frame layer): a plane across the rim */
const MAP = designMap(300, 800, 940, -2.4);

function build(): Built {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(PAL.skyHi);
  const root = new THREE.Group(); scene.add(root);
  const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = root): T => { parent.add(o); return o; };
  const sky = buildDomeSky(); scene.add(sky.root);

  /* ================= FLOOR, RIM, GLASS, RIBS ================= */
  {
    const floorTex = canvasTex(512, 512, (g, w) => {
      const c = w/2, gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, PAL.floor); gr.addColorStop(1, PAL.floorEdge);
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
      g.strokeStyle = PAL.seam; g.globalAlpha = .55; g.lineWidth = 2;
      for (const r of [.3, .62, .94]){ g.beginPath(); g.arc(c, c, c*r, 0, Math.PI*2); g.stroke(); }
      for (let k = 0; k < 16; k++){ const a = k/16*Math.PI*2; g.beginPath(); g.moveTo(c + Math.cos(a)*c*.3, c + Math.sin(a)*c*.3); g.lineTo(c + Math.cos(a)*c, c + Math.sin(a)*c); g.stroke(); }
      g.globalAlpha = .35; g.globalCompositeOperation = 'soft-light'; g.fillStyle = g.createPattern(BRUSH[1], 'repeat'); g.fillRect(0, 0, w, w);
    });
    add(mesh(new THREE.CircleGeometry(RD + .05, 72), toon('#ffffff', { map: floorTex.t, rim: 0, hl: 0, ramp: 'soft' }), [0, 0, 0], { rot: [-Math.PI/2, 0, 0], cast: false })).renderOrder = -1;
    /* the rim wall, with a sill the glass sits on */
    const prof: [number, number][] = [[RD + .02, 0], [RD, .08], [RD, RH - .16], [RD - .18, RH - .12], [RD - .24, RH - .08], [RD - .24, RH - .03], [RD - .2, RH], [RD + .02, RH + .02]];
    add(mesh(lathe(prof, 96), M('wall', PAL.rim, { side: THREE.DoubleSide, grain: 2, rep: [24, 1] }), undefined, { cast: false }));
    add(mesh(new THREE.TorusGeometry(RD - .06, .03, 8, 120), M('metal', PAL.rimCap, { hl: .3 }), [0, RH + .005, 0], { rot: [Math.PI/2, 0, 0], cast: false }));
    add(mesh(new THREE.TorusGeometry(RD - .02, .022, 6, 120), M('metal', PAL.rib), [0, .1, 0], { rot: [Math.PI/2, 0, 0], cast: false }));
    /* bolts round the sill */
    const bolts = new THREE.InstancedMesh(new THREE.SphereGeometry(.018, 8, 6), M('metal', PAL.ribHi), 48);
    for (let k = 0; k < 48; k++){ const a = k/48*Math.PI*2, r = RD - .22; bolts.setMatrixAt(k, new THREE.Matrix4().makeTranslation(Math.sin(a)*r, RH - .055, -Math.cos(a)*r)); }
    bolts.castShadow = false; add(bolts);

    /* the ribs: meridians from the rim to the oculus, the ring rib, the oculus */
    const parts: THREE.BufferGeometry[] = [], Rr = RD - .03;
    for (let k = 0; k < RM.ribs; k++){
      const az = k/RM.ribs*Math.PI*2, pts: [number, number, number][] = [];
      for (let i = 0; i <= 18; i++){ const el = i/18*RM.apexEl*D2R; pts.push([Math.sin(az)*Math.cos(el)*Rr, RH + Math.sin(el)*Rr, -Math.cos(az)*Math.cos(el)*Rr]); }
      parts.push(tube(pts, RM.ribR, 40, 6));
    }
    const ring = new THREE.TorusGeometry(Rr*Math.cos(RM.ringEl*D2R), RM.ribR*.85, 6, 160); ring.rotateX(Math.PI/2); ring.translate(0, RH + Rr*Math.sin(RM.ringEl*D2R), 0); parts.push(ring);
    const ocR = Rr*Math.cos(RM.apexEl*D2R), oc = new THREE.TorusGeometry(ocR, .07, 8, 48); oc.rotateX(Math.PI/2); oc.translate(0, RH + Rr*Math.sin(RM.apexEl*D2R), 0); parts.push(oc);
    for (const g of parts) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const ribs = add(noRay(mesh(mergeGeometries(parts), M('metal', PAL.rib, { hl: .35, hlSize: .1, rim: 1.4 }), undefined, { cast: false, receive: false })));
    ribs.frustumCulled = false;
    const cap = add(noRay(mesh(new THREE.CircleGeometry(ocR, 32), M('metal', '#1c2740', { side: THREE.DoubleSide }), [0, RH + Rr*Math.sin(RM.apexEl*D2R) + .02, 0], { rot: [Math.PI/2, 0, 0], cast: false })));
    cap.renderOrder = 0;
  }
  /* the glass: nearly nothing with the lamp off. With it on, the lamp shows
     in the panes the way a dome of flat panes really shows it -- each pane
     between two ribs is its own little mirror, so the lamp turns up in several
     of them at once, a warm point with a soft bloom -- plus a faint warm haze:
     the 2D's warm wash and "玻璃上又有了倒影" */
  const glassU = { uC: { value: new THREE.Vector3(0, RH, 0) }, uLamp: { value: new THREE.Vector3() }, uOn: { value: 0 },
    uCool: { value: new THREE.Color(LT.glass.cool) }, uWarm: { value: new THREE.Color(LT.glass.warm) },
    uPanes: { value: new THREE.Vector3(RM.ribs, RM.ringEl*D2R, RM.apexEl*D2R) },
    uBase: { value: LT.glass.base }, uSpec: { value: LT.glass.spec }, uHalo: { value: LT.glass.halo }, uBroad: { value: LT.glass.broad } };
  {
    const g = new THREE.SphereGeometry(RD, 72, 24, 0, Math.PI*2, 0, Math.PI/2);
    const m = new THREE.ShaderMaterial({ uniforms: glassU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform vec3 uLamp, uCool, uWarm, uC, uPanes; uniform float uOn, uBase, uSpec, uHalo, uBroad; varying vec3 vW;
        void main(){
          vec3 q = normalize(vW - uC);
          float az = atan(q.x, -q.z), el = asin(clamp(q.y, -1., 1.)), sec = 6.2831853/uPanes.x;
          float azc = (floor(az/sec) + .5)*sec, elc = el < uPanes.y ? uPanes.y*.5 : (uPanes.y + uPanes.z)*.5;
          vec3 N = vec3(sin(azc)*cos(elc), sin(elc), -cos(azc)*cos(elc));     /* this pane's own normal */
          vec3 Vd = normalize(vW - cameraPosition);
          float fres = pow(1. - abs(dot(Vd, normalize(vW - uC))), 3.);
          vec3 L = normalize(uLamp - vW);
          float c = max(dot(reflect(Vd, N), L), 0.), dist = length(uLamp - vW);
          float warm = uSpec*pow(c, 2600.) + uHalo*pow(c, 160.) + uBroad/(1. + dist*dist*.25) + fres*.035;
          gl_FragColor = vec4(uCool*fres*uBase + uWarm*warm*uOn, 1.);
        }` });
    m.premultipliedAlpha = true;
    const gl = add(noRay(new THREE.Mesh(g, m))); gl.position.y = RH; gl.renderOrder = 2;
  }

  /* ================= THE BENCH ================= */
  const stripeTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = PAL.blanket; g.fillRect(0, 0, w, h); g.fillStyle = PAL.stripe; g.globalAlpha = .7;
    for (const x of [.2, .32, .68, .8]) g.fillRect(x*w, 0, w*.045, h);
    g.globalAlpha = .5; g.globalCompositeOperation = 'soft-light'; g.fillStyle = g.createPattern(BRUSH[0], 'repeat'); g.fillRect(0, 0, w, h);
  });
  {
    const len = B0.z1 - B0.z0, zc = (B0.z0 + B0.z1)/2, g = group(root);
    add(blot(B0.w*.75, len*.58, .6), g).position.set(0, .003, zc);
    add(mesh(rbox(B0.w, .26, len, .04), M('woodD', PAL.woodD, { rep: [1, 3] }), [0, .13, zc]), g);
    for (const sx of [-1, 1]) for (const z of [B0.z0 + .12, B0.z1 - .12]) add(mesh(new THREE.CylinderGeometry(.035, .03, .04, 12), M('brass', PAL.brass), [sx*(B0.w/2 - .1), .02, z], { cast: false }), g);
    add(mesh(rbox(B0.w - .03, .17, len - .03, .075), M('cloth', PAL.cushion, { grain: 1, rep: [2, 3], hl: .12 }), [0, .26 + .085, zc]), g);
    add(mesh(rbox(B0.w - .16, .05, len - .2, .025), M('cloth', '#6584ad', { grain: 0, rep: [2, 3] }), [0, B0.seat - .01, zc], { cast: false }), g);
    /* a bolster and a pillow at the head end, where you sit and where you lie */
    add(mesh(new THREE.CylinderGeometry(.11, .11, B0.w - .12, 24), M('cloth', PAL.cushion, { grain: 0, rep: [3, 1] }), [0, B0.seat + .1, B0.z1 - .14], { rot: [0, 0, Math.PI/2] }), g);
    const pillow = add(mesh(rbox(.62, .1, .34, .05), M('cloth', '#d9cbb4', { grain: 0 }), [0, B0.seat + .06, B0.z1 - .42]), g); pillow.rotation.x = -.18;
    /* the blanket, folded at the foot on the right */
    const bl = add(mesh(rbox(.56, .08, .4, .035), M('cloth', '#ffffff', { map: stripeTex.t }), [.26, B0.seat + .04, B0.z0 + .34]), g); bl.rotation.y = .12;
    pickable(g, { act: 'd:lie', label: () => G.lie ? tr('坐起来') : tr('长椅（躺下）'), anchor: new THREE.Vector3(.2, B0.seat + .05, B0.z0 + .14), r: .3 });
  }

  /* ================= THE SMALL LAMP ================= */
  const lamp = (() => {
    const g = group(root, [LP.x, 0, LP.z]);
    add(blot(.2, .2, .55), g).position.y = .003;
    add(mesh(new THREE.CylinderGeometry(.12, .14, .03, 28), M('metal', PAL.metalD), [0, .015, 0]), g);
    add(mesh(new THREE.CylinderGeometry(.012, .012, LP.h - .1, 8), M('metal', PAL.metalD), [0, (LP.h - .1)/2 + .03, 0]), g);
    const sr = LP.shadeR, prof: [number, number][] = [[sr, 0], [sr*.97, sr*.25], [sr*.82, sr*.6], [sr*.5, sr*.85], [sr*.12, sr*.95], [0, sr*.96]];
    const sy = LP.h - sr*.7;
    const shadeMat = M('ceramic', PAL.shadeOn, { hl: .5, emissive: '#000000' });
    add(mesh(lathe(prof, 32), shadeMat, [0, sy, 0]), g);
    const inner = toon('#fff1d6', { grain: -1, side: THREE.BackSide, emissive: '#ffcf8f', ei: 1 });
    add(mesh(lathe(prof, 32), inner, [0, sy, 0], { cast: false }), g);
    const lip = add(mesh(new THREE.CircleGeometry(sr*.96, 28), flatMat0(), [0, sy + .004, 0], { rot: [Math.PI/2, 0, 0], cast: false }), g);
    const bulb = add(mesh(new THREE.SphereGeometry(.03, 12, 10), toon('#fff6dc', { grain: -1, emissive: '#ffe2b0', ei: 1 }), [0, sy + .03, 0], { cast: false }), g);
    const halo = add(glow(SWARM, 1.3, 0), g); halo.position.y = sy - .02;
    const core = add(glow(SWARM, .4, 0), g); core.position.y = sy;
    /* a generous grip round the thin stand */
    add(new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, LP.h, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })), g).position.y = LP.h/2;
    const point = add(new THREE.PointLight(LT.lamp.color, 0, LT.lamp.distance, LT.lamp.decay), g); point.position.y = sy - .05;
    const spot = add(new THREE.SpotLight(LT.lamp.color, 0, LT.lamp.spotDist, LT.lamp.angle, LT.lamp.penumbra, LT.lamp.decay), g);
    spot.position.y = sy - .02; spot.castShadow = true; spot.shadow.mapSize.set(SHARED.render.shadowMap, SHARED.render.shadowMap);
    spot.shadow.bias = -.0008; spot.shadow.normalBias = .02; spot.shadow.radius = 5; spot.shadow.camera.near = .05; spot.shadow.camera.far = 5;
    g.add(spot.target); spot.target.position.set(.35, -1, .25);
    pickable(g, { act: 'd:light', label: tr('小灯'), anchor: new THREE.Vector3(0, LP.h*.7, 0), r: .16 });
    return { g, shadeMat, inner, lip, bulb, halo, core, point, spot, sy };
  })();
  function flatMat0(){ return new THREE.MeshBasicMaterial({ color: '#ffe2b0', transparent: true, opacity: 1, side: THREE.DoubleSide, toneMapped: false }); }

  /* ================= THE CHART TABLE (decor) ================= */
  {
    const g = group(root, [TB.x, 0, TB.z], TB.rot);
    add(blot(TB.w*.62, TB.d*.7, .55), g).position.y = .003;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(mesh(rbox(.05, TB.h - .03, .05, .012), M('woodD', PAL.woodD), [sx*(TB.w/2 - .08), (TB.h - .03)/2, sz*(TB.d/2 - .07)]), g);
    add(mesh(rbox(TB.w - .1, .04, .03, .01), M('woodD', PAL.woodD), [0, .22, TB.d/2 - .07]), g);
    const top = group(g, [0, TB.h, 0]); top.rotation.x = .1;
    add(mesh(rbox(TB.w, .04, TB.d, .012), M('wood', PAL.wood, { rep: [2, 1], hl: .18 }), [0, 0, 0]), top);
    add(mesh(rbox(TB.w + .02, .03, .025, .01), M('wood', '#b47c57'), [0, .03, TB.d/2 + .005]), top);
    const chart = canvasTex(512, 320, (c, w, h) => {
      c.fillStyle = PAL.paper; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'soft-light'; c.globalAlpha = .45; c.fillStyle = c.createPattern(BRUSH[0], 'repeat'); c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = .25; c.strokeStyle = PAL.chartInk; c.lineWidth = 1.2;
      for (let x = 32; x < w; x += 48){ c.beginPath(); c.moveTo(x, 16); c.lineTo(x, h - 16); c.stroke(); }
      for (let y = 28; y < h; y += 48){ c.beginPath(); c.moveTo(16, y); c.lineTo(w - 16, y); c.stroke(); }
      c.globalAlpha = .7; c.fillStyle = PAL.chartInk;
      const dots: [number, number][] = [];
      for (let i = 0; i < 9; i++) dots.push([70 + i*46, 150 - Math.sin(i)*34]);
      for (const [x, y] of [[120, 70], [170, 96], [380, 250], [430, 220], [300, 260]] as const) dots.push([x, y]);
      for (const [x, y] of dots){ c.beginPath(); c.arc(x, y, 5, 0, Math.PI*2); c.fill(); }
      c.globalAlpha = .45; c.setLineDash([6, 8]); c.lineWidth = 2; c.beginPath(); dots.slice(0, 9).forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    });
    const paper = add(mesh(new THREE.PlaneGeometry(TB.w*.7, TB.d*.72), M('paper', '#ffffff', { map: chart.t }), [-.04, .022, .01], { rot: [-Math.PI/2, 0, .04], cast: false }), top);
    paper.receiveShadow = true;
    add(mesh(new THREE.CylinderGeometry(.006, .006, .17, 8), M('wood', '#c9a26a'), [.4, .03, .05], { rot: [Math.PI/2, 0, .6] }), top);
  }

  /* ================= LIGHT ================= */
  const hemi = add(new THREE.HemisphereLight(LT.hemiSky, LT.hemiGround, LT.hemi.on), scene);
  const star = add(new THREE.DirectionalLight(LT.star.color, LT.star.on), scene);
  star.position.set(-.8, 8, -2); star.target.position.set(0, 0, .5); scene.add(star.target);

  /* ================= THE SKY, AS A THING TO TAP ================= */
  const skyPick: Pick = {
    act: 'd:sky', label: tr('星空：点星连线'), key: 'sky', cur: 'crosshair',
    /* the ray from the eye through the sky sphere, as design (x, y) before the
       sky offset: the 2D handler adds skyOff() itself */
    toLocal: (pt) => dirToSky(pt.clone().sub(camera.position)),
    anchor: new THREE.Vector3(0, 0, -2), r: .22
  };
  pickable(sky.ball, skyPick);
  const fwd = new THREE.Vector3(), up = new THREE.Vector3();

  /* ================= PER FRAME ================= */
  const lampW = new THREE.Vector3();
  let arrive = false;
  function followLie(){
    const want = G.lie ? 'lie' : 'sit';
    if (activeView() === want) return;
    if (arrive){ const t = S.trans; S.trans = false; try { goView(want, { instant: true }); } finally { S.trans = t; } return; }
    if (!S.trans) goView(want);
  }
  function sync(dt: number){
    if (arrive){ followLie(); arrive = false; } else followLie();
    const k = Math.max(0, Math.min(1, S.dLamp ?? (G.domeLight ? 1 : 0)));
    lamp.shadeMat.color.set(mixHex(PAL.shadeOff, PAL.shadeOn, k)); lamp.shadeMat.emissive.set(mixHex('#000000', '#5a3410', k));
    lamp.inner.emissiveIntensity = .04 + 1.1*k; lamp.inner.color.set(mixHex('#2a4444', '#fff1d6', k));
    (lamp.lip.material as THREE.MeshBasicMaterial).color.set(mixHex('#1c2a2a', '#ffe2b0', k));
    (lamp.bulb.material as THREE.MeshToonMaterial).emissiveIntensity = .02 + 1.1*k;
    lamp.halo.material.opacity = .42*k; lamp.core.material.opacity = .85*k;
    lamp.point.intensity = LT.lamp.point*k; lamp.spot.intensity = LT.lamp.spot*k;
    hemi.intensity = LT.hemi.off + (LT.hemi.on - LT.hemi.off)*k;
    star.intensity = LT.star.off + (LT.star.on - LT.star.off)*k;
    RIM.k.value = SHARED.rim.k*(1.5 - .5*k);
    lamp.g.updateWorldMatrix(true, false); lampW.set(0, lamp.sy + .02, 0); lamp.g.localToWorld(lampW);
    glassU.uLamp.value.copy(lampW); glassU.uOn.value = k;
    sky.update(dt);
    /* the sky's focus stop sits a little above the middle of whatever you are looking at */
    camera.getWorldDirection(fwd); up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    skyPick.sphere = { c: fwd.multiplyScalar(2).addScaledVector(up, .35), r: skyPick.r };
  }

  const views: View[] = [
    { id: 'sit', label: tr('坐着'), ...V.sit, onEnter: () => { if (G.lie) ACT['d:lie'].tap(); } },
    { id: 'lie', label: tr('躺着'), ...V.lie, onEnter: () => { if (!G.lie) ACT['d:lie'].tap(); } }
  ];
  /* A double-click on the sky while lying down should not sit you up: two
     quick taps on a star are a pick and a stop. Escape and the bar still do. */
  const away0 = VIEW.away;
  VIEW.away = () => { const ev = (window as any).event; if (ev && ev.type === 'dblclick' && activeView() === 'lie') return false; return away0(); };
  return {
    scene, views, sync,
    fxAt(k, x, y){
      if (k < .5){ const d = skyDir(x, y).multiplyScalar(DOME.sky.R*.9); return [d.add(camera.position), DOME.sky.R*.9*DOME.sky.degPerUnit*D2R]; }
      return [MAP.at(x, y), 1/300];
    },
    enter(){ arrive = true; sky.reset(); },
    dispose(){ VIEW.away = away0; RIM.k.value = SHARED.rim.k; sky.dispose(); }
  };
}

register3D({ id: 'dome', build });

/* For the browser check: where a point of the sky (its own design units, after
   the offset, as STARS are kept) is on the canvas right now. Dev builds only. */
if (import.meta.env.DEV) (window as any).__dome3d = {
  skyToCanvas(x: number, y: number){
    const sk = (window as any).__three.B()?.scene.getObjectByName('sky'); if (!sk) return null;
    const turn = sk.children[1] as THREE.Object3D;
    const p = skyDir(x, y).multiplyScalar(DOME.sky.R); turn.localToWorld(p);
    const v = p.project(camera); return { X: (v.x + 1)/2*(window as any).__three.CW(), Y: (1 - v.y)/2*(window as any).__three.CH(), behind: v.z > 1 };
  },
  dirToSky, dm: DM
};
