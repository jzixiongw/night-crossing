import * as THREE from 'three';
import { tr } from '../../i18n';
import { BRUSH, STEAL, SWARM, star5, txt, txtFit } from '../../core/paint';
import { D2R, mixHex } from '../../core/util';
import { MUSIC_MOTIF, STATIONS } from '../../data/index';
import { PORTS } from '../../data/ports';
import { DISPATCH_F, FMAX, FMIN, SX0, SY0, fx } from '../../rooms/radio';
import { S } from '../../state/runtime';
import { G } from '../../state/store';
import { RAD } from '../config/radio';
import { FONT_GEN, designMap, faceMap, pickable, register3D, type Built } from '../engine';
import { M, add as addTo, blot, canvasTex, flatMat, glow, group, lathe, liveTex, mesh, noRay, rbox, slab, toon } from '../kit';
import { porthole, slipOnWall } from '../props';
import type { View } from '../view';

/* ================= THE RADIO ROOM, IN THREE.JS =================
   rooms/radio.ts still tunes, prints, punches and winds: radioTick() runs
   from the main loop whatever room you are in, and every ACT['r:*'] handler
   answers here unchanged. What each hand-worked face hands back is the design
   rect the handler was written for:

     dial        uv on the dial face   -> [480, 330, 276, 92]  (absolute: P.x picks a frequency)
     tape        point on the tape     -> [SX0, SY0, 378, 146] (absolute: a cell)
     crank       point on its face     -> centred on (1424, 470) (only the angle is used)
     tuning knob the pointer on screen -> 1600 across            (only differences are used)

   Three places: the room, the radio up close, the music box up close. */

const P = RAD.palette, LT = RAD.light, RM = RAD.room, CT = RAD.counter, R0 = RAD.radio, MB = RAD.musicBox;
const MAP = designMap(RAD.map.unit, RAD.map.x0, RAD.map.y0, RM.back);
const STW = 378/16, STH = 146/6;

function build(): Built {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#08060f');
  const root = new THREE.Group(); scene.add(root);
  const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = root): T => addTo(o, parent);
  const HW = RM.halfW, H = RM.h, BACK = RM.back;

  /* ================= SHELL ================= */
  const paper = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = P.wall; g.fillRect(0, 0, w, h);
    g.fillStyle = P.stripe; g.globalAlpha = .6; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 32, h);
    g.globalAlpha = .28; g.fillStyle = P.starDot;
    for (let y = 40; y < h; y += 96) for (let x = 16 + ((y/96 | 0) % 2)*64; x < w; x += 128){ g.beginPath(); star5(g, x, y, 7); g.fill(); }
    g.globalAlpha = .4; g.globalCompositeOperation = 'soft-light'; g.fillStyle = g.createPattern(BRUSH[2], 'repeat'); g.fillRect(0, 0, w, h);
  });
  paper.t.wrapS = paper.t.wrapT = THREE.RepeatWrapping;
  const wainY = MAP.Y(470);
  {
    const t = paper.t.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(HW*2/.9, (H - wainY)/1.8);
    add(mesh(new THREE.PlaneGeometry(HW*2, H - wainY), M('wall', '#ffffff', { map: t }), [0, (H + wainY)/2, BACK], { cast: false }));
    add(mesh(rbox(HW*2, wainY, .05, .01), M('woodD', P.wainscot, { rep: [8, 1] }), [0, wainY/2, BACK + .025], { cast: false }));
    add(mesh(rbox(HW*2, .06, .07, .02), M('wood', P.rail), [0, wainY, BACK + .035], { cast: false }));
    const depth = RM.front - BACK, zc = (RM.front + BACK)/2;
    const floor = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = P.floor; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++){ g.fillStyle = ['#4a3434', '#453031', '#4f3837', '#422e2f'][i]; g.fillRect(i*w/4 + 1, 0, w/4 - 2, h); g.fillStyle = P.floorSeam; g.globalAlpha = .55; g.fillRect(i*w/4 - 1, 0, 2.5, h); g.globalAlpha = 1; }
      g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .35; g.fillStyle = g.createPattern(BRUSH[1], 'repeat'); g.fillRect(0, 0, w, h);
    });
    floor.t.wrapS = floor.t.wrapT = THREE.RepeatWrapping; floor.t.repeat.set(HW*2/.9, depth/.9);
    add(mesh(new THREE.PlaneGeometry(HW*2, depth), M('wall', '#ffffff', { map: floor.t }), [0, 0, zc], { rot: [-Math.PI/2, 0, 0], cast: false })).renderOrder = -1;
    add(mesh(new THREE.PlaneGeometry(HW*2, depth), M('wall', P.ceiling, { grain: 1, rep: [6, 6] }), [0, H, zc], { rot: [Math.PI/2, 0, 0], cast: false }));
    for (const z of [-1.6, -.1, 1.4]) add(mesh(rbox(HW*2, .08, .12, .02), M('wall', '#3a2c3e', { grain: 1, rep: [8, 1] }), [0, H - .05, z], { cast: false }));
    for (const sx of [-1, 1]){
      const t2 = paper.t.clone(); t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.repeat.set(depth/.9, H/1.8);
      add(mesh(new THREE.PlaneGeometry(depth, H), M('wall', '#b8a8bc', { map: t2 }), [sx*HW, H/2, zc], { rot: [0, -sx*Math.PI/2, 0], cast: false }));
      add(mesh(rbox(.05, wainY, depth, .01), M('woodD', P.wainscot, { rep: [8, 1] }), [sx*(HW - .025), wainY/2, zc], { cast: false }));
      add(mesh(rbox(.12, H, .12, .03), M('woodD', P.wainscot), [sx*(HW - .06), H/2, BACK + .06], { cast: false }));
    }
    /* rug where the chair would be */
    const rug = add(new THREE.Group()); rug.position.set(0, 0, -.55); rug.scale.set(1.5, 1, .55);
    add(mesh(new THREE.CylinderGeometry(1, 1, .014, 56), M('cloth', P.rug, { grain: 1, rep: 3 }), [0, .007, 0], { cast: false }), rug);
  }
  add(porthole(root, [MAP.X(RAD.wall.porthole.x), MAP.Y(RAD.wall.porthole.y), BACK + .03], MAP.U(RAD.wall.porthole.r), { seed: 5, stars: 46 }));
  const slip = slipOnWall(root, MAP, { ...RAD.wall.slip, rot: .015 });

  /* ---- the counter everything stands on ---- */
  const CZ = BACK + CT.depth/2, TOP = CT.top;
  {
    const w = CT.x1 - CT.x0, cx = (CT.x0 + CT.x1)/2;
    add(mesh(rbox(w, .05, CT.depth + .04, .015), M('wood', P.counterTop, { rep: [6, 1], hl: .16 }), [cx, TOP - .025, CZ + .02]));
    add(mesh(rbox(w - .04, TOP - .05, CT.depth - .04, .02), M('woodD', P.counter, { rep: [6, 1] }), [cx, (TOP - .05)/2, CZ - .01]));
    for (const [x, ww] of [[-2.2, .9], [-.1, 1.1], [1.9, 1.2]] as const){
      add(mesh(rbox(ww, TOP - .22, .02, .02), M('woodD', '#5a3829'), [x, (TOP - .05)/2, CZ + CT.depth/2 - .01], { cast: false }));
      add(mesh(rbox(.11, .022, .025, .01), M('brass', P.brass), [x, TOP - .2, CZ + CT.depth/2 + .01], { cast: false }));
    }
    add(blot(w*.5, .5, .5)).position.set(cx, .003, CZ + .3);
  }

  /* ================= THE RADIO ================= */
  const radio = group(root, [R0.x, TOP, CZ - .02]);
  const FZ = R0.d/2;                                 // the front face, in the radio's local z
  {
    const s = new THREE.Shape(), w = R0.w, h = R0.h, a = R0.arch;
    s.moveTo(-w/2, 0); s.lineTo(w/2, 0); s.lineTo(w/2, h - a); s.quadraticCurveTo(w/2, h, w/2 - a*1.6, h); s.lineTo(-w/2 + a*1.6, h); s.quadraticCurveTo(-w/2, h, -w/2, h - a); s.closePath();
    const body = add(mesh(slab(s, R0.d - .03, .015, 16), M('wood', P.radio, { rep: [1.5, 1.5], hl: .22, hlSize: .2 }), [0, 0, -FZ + .015]), radio);
    body.castShadow = true;
    add(blot(w*.65, R0.d*.6, .55), radio).position.set(0, .002, 0);
    /* the grille: a dark recess with slats */
    add(mesh(rbox(w*.78, h*.32, .02, .03), M('woodD', P.grille), [0, h*.18, FZ + .002], { cast: false }), radio);
    for (let k = 0; k < 7; k++) add(mesh(rbox(.012, h*.28, .018, .004), M('woodD', P.radioD), [-w*.33 + k*w*.11, h*.18, FZ + .012]), radio);
  }
  /* the dial: a lit paper face behind glass, with the frequency scale */
  const DIAL: [number, number, number, number] = [480, 330, 276, 92];
  const dialTex = liveTex(1024, 342, () => [G.found.join(','), Math.round((S.dialGlow || 0)*12), FONT_GEN].join('|'), (g, w, h) => {
    const k = w/276; g.setTransform(k, 0, 0, k, -480*k, -330*k);
    const on = S.dialGlow || 0, dg = g.createLinearGradient(0, 330, 0, 422);
    dg.addColorStop(0, mixHex('#e7d6b2', '#ffe9b8', on)); dg.addColorStop(1, mixHex(P.dialLo, P.dialHi, on)); g.fillStyle = dg; g.fillRect(480, 330, 276, 92);
    for (let i = 0; i <= 24; i++){ const f = FMIN + i*.05, x = fx(f), major = i%2 === 0; g.fillStyle = '#5a382c'; g.fillRect(x - (major ? 1 : .6), major ? 396 : 402, major ? 2 : 1.2, major ? 18 : 12); if (i%4 === 0) txt(g, f.toFixed(1), x, 390, 11, '#5a382c', { mono: true }); }
    txt(g, tr('航频 · MHz'), 490, 350, 9, '#9a7a62', { mono: true, align: 'left', ls: 2 });
    STATIONS.filter(st => G.found.includes(st.id)).forEach(st => { g.fillStyle = P.mark; g.beginPath(); g.arc(fx(st.f), 418, 3, 0, Math.PI*2); g.fill(); });
    const dx = fx(DISPATCH_F), dw = fx(DISPATCH_F + .14) - dx;
    g.globalAlpha = .22; g.fillStyle = P.mark; g.beginPath(); g.roundRect(dx - dw, 332, dw*2, 10, 5); g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.moveTo(dx, 344); g.lineTo(dx - 5, 334); g.lineTo(dx + 5, 334); g.closePath(); g.fill();
    txt(g, tr('单'), dx, 366, 12, '#8a5a44');
  });
  const DW = R0.dial.w, DH = R0.dial.h;
  add(mesh(rbox(DW + .05, DH + .05, .03, .025), M('brass', P.brass), [0, R0.dial.y, FZ - .005]), radio);
  const dialFace = add(mesh(new THREE.PlaneGeometry(DW, DH), toon('#ffffff', { map: dialTex.t, grain: -1, emissive: '#ffcf8a', ei: 0, ramp: 'soft', rim: 0, hl: 0 }), [0, R0.dial.y, FZ + .012], { cast: false }), radio);
  const dialMap = faceMap(dialFace, DW, DH, DIAL);
  pickable(dialFace, { act: 'r:dial', label: tr('刻度盘'), plane: dialMap.plane, toLocal: dialMap.toLocal });
  add(noRay(mesh(new THREE.PlaneGeometry(DW, DH), flatMat('#ffffff', { opacity: .06 }), [0, R0.dial.y, FZ + .02], { cast: false, receive: false })), radio);
  const needle = add(noRay(mesh(rbox(.007, DH*.88, .006, .002), M('ceramic', P.rose), [0, R0.dial.y, FZ + .017], { cast: false })), radio);
  /* the magic eye: a green fan that closes as the station comes in */
  const eyeTex = liveTex(128, 128, () => {
    const res = S.lastRadio || { c: 0 }, c0 = G.radioOn ? res.c : 0, th = G.radioOn ? 22 + (1 - c0)*250 : 359.9;
    return (G.radioOn ? 1 : 0) + ':' + Math.round(th/3);
  }, (g, w) => {
    const res = S.lastRadio || { c: 0 }, c0 = G.radioOn ? res.c : 0, th = (G.radioOn ? 22 + (1 - c0)*250 : 359.9)*D2R, c = w/2, r = w*.47;
    const eg = g.createRadialGradient(c, c, 2, c, c, r); eg.addColorStop(0, G.radioOn ? '#d4fbf4' : '#3a5a58'); eg.addColorStop(.6, G.radioOn ? '#62b0a8' : '#2a4444'); eg.addColorStop(1, '#244a4a');
    g.fillStyle = eg; g.beginPath(); g.arc(c, c, r, 0, Math.PI*2); g.fill();
    g.fillStyle = '#0b1416'; g.beginPath(); g.moveTo(c, c); g.arc(c, c, r, -Math.PI/2 - th/2, -Math.PI/2 + th/2); g.closePath(); g.fill();
  });
  add(mesh(new THREE.CylinderGeometry(R0.eye.r*1.35, R0.eye.r*1.45, .03, 24), M('metal', P.metalD), [R0.eye.x, R0.eye.y, FZ], { rot: [Math.PI/2, 0, 0] }), radio);
  const eyeFace = add(mesh(new THREE.CircleGeometry(R0.eye.r, 32), toon('#ffffff', { map: eyeTex.t, grain: -1, emissive: '#7fd0c4', ei: 0, rim: 0, hl: 0 }), [R0.eye.x, R0.eye.y, FZ + .016], { cast: false }), radio);
  const eyeGlow = add(glow(STEAL, .16, 0), radio); eyeGlow.position.set(R0.eye.x, R0.eye.y, FZ + .03);
  /* knobs */
  const knob = (o: { x: number; y: number; r: number }, ridges: number) => {
    const g = group(radio, [o.x, o.y, FZ]);
    const spin = group(g); spin.rotation.x = Math.PI/2;
    add(mesh(new THREE.CylinderGeometry(o.r, o.r*1.06, .045, 32), M('ceramic', P.cream, { hl: .4 }), [0, .022, 0]), spin);
    add(mesh(new THREE.CylinderGeometry(o.r*.78, o.r*.9, .02, 32), M('ceramic', '#f2e4c8'), [0, .052, 0]), spin);
    const m = M('ceramic', '#b4a181'), rg = rbox(o.r*.12, .05, o.r*.24, .004);
    for (let k = 0; k < ridges; k++){ const a = k/ridges*Math.PI*2; add(mesh(rg, m, [Math.cos(a)*o.r*1.02, .022, Math.sin(a)*o.r*1.02], { rot: [0, -a, 0], cast: false }), spin); }
    add(mesh(rbox(o.r*.14, .012, o.r*.6, .004), M('plain', P.ink), [0, .064, -o.r*.42], { cast: false }), spin);
    return { g, spin };
  };
  const power = knob(R0.power, 0), tune = knob(R0.tune, 12);
  pickable(power.g, { act: 'r:power', label: tr('开关') });
  /* a generous grip around the tuning knob, so a drag that starts on its rim catches */
  add(new THREE.Mesh(new THREE.CircleGeometry(R0.tune.r*1.35, 24), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })), tune.g).position.z = .07;
  pickable(tune.g, { act: 'r:tune', label: tr('调频旋钮'), cur: 'ew-resize', screen: true });
  /* light from the dial, falling on the counter and the knobs */
  const dialLight = add(new THREE.PointLight(LT.dial.color, 0, LT.dial.distance, LT.dial.decay), radio); dialLight.position.set(0, R0.dial.y - .02, FZ + .22);
  const dialHalo = add(glow(SWARM, .9, 0), radio); dialHalo.position.set(0, R0.dial.y, FZ + .05);
  const eyeLight = add(new THREE.PointLight(LT.eye.color, 0, LT.eye.distance, LT.eye.decay), radio); eyeLight.position.set(R0.eye.x, R0.eye.y, FZ + .12);

  /* ---- the headphones on their stand ---- */
  const phones = (() => {
    const g = group(root, [RAD.phones.x, TOP, CZ + .05]);
    add(blot(.12, .08, .5), g).position.y = .002;
    add(mesh(new THREE.CylinderGeometry(.07, .08, .02, 20), M('metal', P.metalD), [0, .01, 0]), g);
    add(mesh(new THREE.CylinderGeometry(.008, .008, .46, 8), M('metal', P.metalD), [0, .24, 0]), g);
    const set = group(g, [0, .5, 0]);
    add(mesh(new THREE.TorusGeometry(.1, .014, 10, 28, Math.PI), M('cloth', P.navy)), set);
    for (const sx of [-1, 1]) add(mesh(new THREE.CylinderGeometry(.045, .045, .04, 20), M('cloth', P.rose, { hl: .1 }), [sx*.105, -.02, 0], { rot: [0, 0, Math.PI/2] }), set);
    pickable(g, { act: 'r:phones', label: () => G.phones ? tr('摘下耳机') : tr('耳机') });
    return set;
  })();

  /* ---- the desk lamp: the room's one shadow ---- */
  const deskLamp = (() => {
    const g = group(root, [RAD.lamp.x, TOP, RAD.lamp.z]);
    add(blot(.16, .1, .5), g).position.y = .002;
    add(mesh(new THREE.CylinderGeometry(.09, .1, .025, 24), M('metal', P.metalD), [0, .012, 0]), g);
    const arm1 = add(mesh(new THREE.CylinderGeometry(.01, .01, .44, 8), M('metal', P.metalD), [0, .23, 0]), g); arm1.rotation.z = .18;
    const head = group(g, [-.04, .44, 0]);
    head.rotation.set(0, -.6, -1.05);
    add(mesh(new THREE.CylinderGeometry(.01, .01, .3, 8), M('metal', P.metalD), [0, .15, 0]), head);
    const shade = group(head, [0, .3, 0]); shade.rotation.z = -1.0;
    const shadeOn = M('ceramic', P.teal, { hl: .5 }), shadeOff = M('ceramic', P.tealD, { hl: .4 });
    const sm = add(mesh(lathe([[.1, -.06], [.09, -.04], [.06, .0], [.03, .03], [.012, .04]], 28), shadeOn), shade);
    const inner = toon('#fff1d6', { grain: -1, side: THREE.BackSide, emissive: '#ffcf8f', ei: 1 });
    add(mesh(lathe([[.1, -.06], [.09, -.04], [.06, .0], [.03, .03], [.012, .04]], 28), inner, undefined, { cast: false }), shade);
    const bulb = add(mesh(new THREE.SphereGeometry(.028, 12, 10), toon('#fff6dc', { grain: -1, emissive: '#ffe2b0', ei: 1 }), [0, -.035, 0], { cast: false }), shade);
    const spot = add(new THREE.SpotLight(LT.lamp.color, 0, LT.lamp.distance, LT.lamp.angle, LT.lamp.penumbra, LT.lamp.decay), shade);
    spot.position.set(0, -.04, 0);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0008; spot.shadow.normalBias = .02; spot.shadow.radius = 5;
    spot.shadow.camera.near = .05; spot.shadow.camera.far = 6;
    root.add(spot.target); spot.target.position.set(R0.x - .15, TOP + .15, CZ + .1);
    const point = add(new THREE.PointLight(LT.lamp.color, 0, 3, 1.7), shade); point.position.set(0, -.12, 0);
    const halo = add(glow(SWARM, .55, 0), shade); halo.position.y = -.05;
    /* anchor the hint on the shade, not on the middle of the arm's bounding box */
    g.updateWorldMatrix(true, true);
    pickable(g, { act: 'r:lamp', label: tr('台灯'), anchor: g.worldToLocal(shade.getWorldPosition(new THREE.Vector3())), r: .12 });
    return { sm, shadeOn, shadeOff, inner, bulb, spot, point, halo };
  })();

  /* ================= THE PRINTER ON THE WALL ================= */
  const printer = (() => {
    const [px, py, pw, ph] = RAD.wall.printer, cx = MAP.X(px + pw/2), cy = MAP.Y(py + ph/2), w = MAP.U(pw), h = MAP.U(ph), d = .26;
    const g = group(root, [cx, cy, BACK + d/2 + .04]);
    for (const sx of [-1, 1]) add(mesh(rbox(.04, .12, .2, .01), M('metal', P.metalD), [sx*w*.36, -h/2 - .03, -.03]), g);
    add(mesh(rbox(w, h, d, .045), M('metal', P.metal, { rep: 2 }), [0, 0, 0]), g);
    add(mesh(rbox(w*.88, h*.46, .02, .02), M('plain', '#1a2640'), [0, h*.14, d/2], { cast: false }), g);
    add(mesh(new THREE.CylinderGeometry(h*.19, h*.19, w*.5, 24), M('paper', P.cream), [0, h*.14, d/2 - .05], { rot: [0, 0, Math.PI/2] }), g);
    add(mesh(new THREE.CylinderGeometry(h*.05, h*.05, w*.52, 12), M('wood', '#6d5c3a'), [0, h*.14, d/2 - .05], { rot: [0, 0, Math.PI/2] }), g);
    add(mesh(rbox(w*.8, .045, .05, .02), M('metal', P.metalD), [0, -h*.37, d/2]), g);
    add(mesh(rbox(w*.72, .016, .02, .006), flatMat('#0e1628'), [0, -h*.37, d/2 + .021], { cast: false }), g);
    const lampMat = toon('#4a5570', { grain: -1, emissive: '#ffd9a3', ei: 0, ramp: 'crisp', hl: .6 });
    add(mesh(new THREE.SphereGeometry(.022, 14, 10), lampMat, [w*.4, h*.4, d/2 + .005]), g);
    const lampGlow = add(glow(SWARM, .22, 0), g); lampGlow.position.set(w*.4, h*.4, d/2 + .03);
    const label = liveTex(256, 64, () => (G.printed ? 1 : 0) + ':' + FONT_GEN, (c, cw, chh) => { c.setTransform(cw/120, 0, 0, chh/30, 0, 0); txtFit(c, tr('调度'), 60, 22, 110, 17, G.printed ? '#ffe7c4' : '#8396ad'); });
    add(mesh(new THREE.PlaneGeometry(w*.5, w*.125), new THREE.MeshBasicMaterial({ map: label.t, transparent: true, toneMapped: false }), [0, -h*.2, d/2 + .002], { cast: false }), g);
    /* the slip hanging out of the slot once a job has printed */
    const slipTex = liveTex(344, 192, () => (G.printed || '') + ':' + FONT_GEN, (c, cw) => {
      const k = cw/172; c.setTransform(k, 0, 0, k, 86*k, 0);
      c.fillStyle = P.paper; c.beginPath(); c.roundRect(-86, 0, 172, 96, 3); c.fill();
      if (G.printed){ const port = PORTS[G.printed]; txtFit(c, tr(port.name), 0, 36, 150, 21, '#2a3550'); c.fillStyle = '#c4b392'; c.fillRect(-62, 50, 124, 1.6); txtFit(c, tr('要一盏灯'), 0, 74, 150, 14, '#7d7a72'); }
    });
    const sw = MAP.U(172), sh = MAP.U(96);
    const hang = add(mesh(new THREE.PlaneGeometry(sw, sh), M('paper', '#ffffff', { map: slipTex.t, side: THREE.DoubleSide }), [0, -h*.37 - sh/2 - .01, d/2 + .03], { cast: false }), g);
    hang.rotation.set(-.18, 0, .03);
    pickable(g, { act: 'r:slip', label: () => G.printed ? tr('撕下单子') : tr('调度打印机') });
    return { lampMat, lampGlow, label, slipTex, hang };
  })();

  /* ---- the station table card ---- */
  const table = (() => {
    const [tx, ty, tw, th] = RAD.wall.table, w = MAP.U(tw), h = MAP.U(th);
    const g = group(root, [MAP.X(tx + tw/2), MAP.Y(ty + th/2), BACK + .015]);
    const tex = liveTex(1284, 618, () => G.found.join(',') + ':' + FONT_GEN, (c, cw) => {
      const k = cw/428; c.setTransform(k, 0, 0, k, -296*k, -126*k);
      c.fillStyle = P.paper; c.beginPath(); c.roundRect(296, 126, 428, 206, 8); c.fill();
      c.globalCompositeOperation = 'soft-light'; c.globalAlpha = .45; c.fillStyle = c.createPattern(BRUSH[0], 'repeat'); c.fillRect(296, 126, 428, 206); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      txt(c, tr('台 表'), 510, 152, 19, '#2a3550'); c.fillStyle = '#c4b392'; c.fillRect(314, 158, 392, 2);
      [...STATIONS].sort((a, b) => a.f - b.f).forEach((st, i) => { const y = 184 + i*24, f = G.found.includes(st.id);
        if (f){ txt(c, st.f.toFixed(2), 320, y, 13, '#2a3550', { mono: true, align: 'left' }); txt(c, st.name, 384, y, 16, '#2a3550', { align: 'left' }); txt(c, st.desc, 704, y, 11, '#7d7a72', { align: 'right', sans: true }); }
        else { txt(c, '·.··', 320, y, 13, '#b5a888', { mono: true, align: 'left' }); txt(c, '· · · · · ·', 384, y, 14, '#b5a888', { align: 'left' }); } });
    });
    add(mesh(rbox(w, h, .012, .01), M('paper', P.paper), [0, 0, 0]), g);
    add(mesh(new THREE.PlaneGeometry(w, h), toon('#ffffff', { map: tex.t, grain: -1, ramp: 'soft', rim: 0, hl: 0, emissive: '#2c2433', ei: .5 }), [0, 0, .0075], { cast: false }), g);
    add(mesh(new THREE.SphereGeometry(.018, 10, 8), M('ceramic', P.rose), [0, h/2 - .02, .012]), g);
    pickable(g, { act: 'r:table', label: tr('台表'), inspect: true });
    return tex;
  })();

  /* ================= THE MUSIC BOX ================= */
  const box = group(root, [MB.x, TOP, CZ - .02]);
  const BZ = MB.d/2;
  add(mesh(rbox(MB.w, MB.h, MB.d, .035), M('wood', P.radio, { rep: [2, 1], hl: .2 }), [0, MB.h/2, 0]), box);
  add(blot(MB.w*.6, MB.d*.6, .55), box).position.y = .002;
  add(mesh(rbox(MB.w + .02, .03, MB.d + .02, .012), M('wood', '#b47c57'), [0, MB.h + .012, 0]), box);
  /* the tape, on a slanted desk in the left of the lid, facing you */
  const SW = MB.strip.w, SH = MB.strip.h, tilt = MB.strip.tilt*D2R;
  const stripG = group(box, [-MB.w/2 + SW/2 + .06, MB.h + .03 + Math.sin(tilt)*SH/2, BZ - .05 - Math.cos(tilt)*SH/2]);
  stripG.rotation.x = -(Math.PI/2 - tilt);
  add(mesh(rbox(SW + .05, SH + .05, .03, .012), M('woodD', P.radioD), [0, 0, -.017]), stripG);
  const stripTex = liveTex(1024, 396, () => G.strip.join(',') + ':' + FONT_GEN, (c, cw, chh) => {
    c.setTransform(cw/378, 0, 0, chh/146, 0, 0);
    c.fillStyle = P.paper; c.fillRect(0, 0, 378, 146);
    c.globalCompositeOperation = 'soft-light'; c.globalAlpha = .4; c.fillStyle = c.createPattern(BRUSH[0], 'repeat'); c.fillRect(0, 0, 378, 146); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.fillStyle = 'rgba(160,140,110,.55)';
    for (let i = 1; i < 16; i++) c.fillRect(i*STW - (i%4 === 0 ? 1 : .5), 0, i%4 === 0 ? 2 : 1, 146);
    for (let r = 1; r < 6; r++) c.fillRect(0, r*STH - .5, 378, 1);
    c.fillStyle = '#2a1e18';
    for (let col = 0; col < 16; col++) for (let r = 0; r < 6; r++) if (G.strip[col] & (1 << r)){ c.beginPath(); c.roundRect(col*STW + 4.5, r*STH + 5.5, STW - 9, STH - 11, 5); c.fill(); }
  });
  const stripFace = add(mesh(new THREE.PlaneGeometry(SW, SH), M('paper', '#ffffff', { map: stripTex.t, emissive: '#3a2e26', ei: .35 }), [0, 0, .001], { cast: false }), stripG);
  const stripMap = faceMap(stripFace, SW, SH, [SX0, SY0, 378, 146]);
  pickable(stripFace, { act: 'r:strip', label: tr('八音盒纸带'), cur: 'crosshair', plane: stripMap.plane, toLocal: stripMap.toLocal });
  const ghostG = noRay(group(stripG)); const ghostGeo = new THREE.CircleGeometry(MAP.U(7)*SW/MAP.U(378), 18);
  const ghosts = MUSIC_MOTIF.map(([col, r]) => { const m = add(mesh(ghostGeo, flatMat(P.mark, { opacity: .4 }), [((col + .5)/16 - .5)*SW, (.5 - (r + .5)/6)*SH, .004], { cast: false, receive: false }), ghostG); return { m, col, r }; });
  const playhead = add(noRay(mesh(new THREE.PlaneGeometry(SW/16, SH), flatMat(P.amber, { opacity: .3 }), [0, 0, .005], { cast: false, receive: false })), stripG);
  /* the comb and the drum, under glass on the right of the lid */
  const drum = group(box, [.28, MB.h + .07, -.02]);
  add(mesh(new THREE.CylinderGeometry(.05, .05, .36, 24), M('brass', P.brass), [0, 0, 0], { rot: [0, 0, Math.PI/2] }), drum);
  for (let k = 0; k < 12; k++) add(mesh(rbox(.012, .006, .09, .002), M('metal', P.metal), [.28 - .16 + k*.029, MB.h + .1, .05]), box);
  add(mesh(rbox(.42, .12, .22, .03), M('glass', '#cfe6f4', { transparent: true, opacity: .18, depthWrite: false }), [.28, MB.h + .08, -.02], { cast: false }), box);
  /* the crank on the front, and the wind gauge beside it */
  const crankC = group(box, [MB.crank.x, MB.crank.y, BZ + .015]);
  const crankArm = group(crankC);
  add(mesh(new THREE.CylinderGeometry(.026, .026, .02, 20), M('brass', P.brass), [0, 0, 0], { rot: [Math.PI/2, 0, 0] }), crankC);
  add(mesh(rbox(MB.crank.r + .02, .022, .016, .008), M('brass', P.brass), [MB.crank.r/2, 0, .014]), crankArm);
  add(mesh(new THREE.CylinderGeometry(.016, .016, .05, 12), M('woodD', P.radioD), [MB.crank.r, 0, .04], { rot: [Math.PI/2, 0, 0] }), crankArm);
  add(new THREE.Mesh(new THREE.CircleGeometry(MB.crank.r*1.5, 24), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })), crankC).position.z = .05;
  const crankMap = faceMap(crankC, .4, .4, [1424 - 80, 470 - 80, 160, 160]);
  pickable(crankC, { act: 'r:crank', label: tr('摇柄（画圈）'), cur: 'grab', plane: crankMap.plane, toLocal: crankMap.toLocal });
  const gaugeLabel = canvasTex(256, 64, (c, cw, chh) => { c.setTransform(cw/120, 0, 0, chh/30, 0, 0); txtFit(c, tr('发条'), 60, 22, 110, 15, '#f2dfc0'); });
  add(mesh(rbox(.36, .05, .012, .02), flatMat('#2a1810'), [-.02, .09, BZ + .004], { cast: false }), box);
  const gauge = add(mesh(rbox(1, .022, .01, .008), M('ceramic', P.amber, { emissive: '#f2a95b', ei: .4 }), [0, .09, BZ + .012], { cast: false }), box);
  add(mesh(new THREE.PlaneGeometry(.2, .05), new THREE.MeshBasicMaterial({ map: gaugeLabel.t, transparent: true, toneMapped: false }), [-.02, .16, BZ + .002], { cast: false }), box);
  /* notes that float up off the comb while it plays */
  const noteTex = canvasTex(64, 64, (c) => { txt(c, '♪', 32, 50, 48, '#ffd9a3'); });
  const notePool: THREE.Sprite[] = [];

  /* the sconce over the music box */
  {
    const sc = LT.sconce, g = group(root, [sc.x, sc.y, BACK + .02]);
    add(mesh(rbox(.1, .14, .04, .015), M('brass', P.brass), [0, 0, .02]), g);
    add(mesh(new THREE.CylinderGeometry(.02, .02, .14, 8), M('brass', P.brass), [0, .02, .09], { rot: [Math.PI/2, 0, 0] }), g);
    const cup = add(mesh(lathe([[.075, -.05], [.07, -.02], [.05, .02], [.02, .04]], 24), M('ceramic', '#f2dfc0', { emissive: '#ffcf8f', ei: .35 }), [0, .02, .17]), g);
    cup.rotation.x = Math.PI;
    add(mesh(new THREE.SphereGeometry(.025, 12, 10), toon('#fff6dc', { grain: -1, emissive: '#ffe2b0', ei: 1.1 }), [0, -.01, .17], { cast: false }), g);
    const l = add(new THREE.PointLight(sc.color, sc.intensity, sc.distance, sc.decay), g); l.position.set(0, -.1, .25);
    add(glow(SWARM, .5, .4), g).position.set(0, -.02, .19);
  }

  /* ================= LIGHT ================= */
  const hemi = add(new THREE.HemisphereLight(LT.hemiSky, LT.hemiGround, LT.hemi), scene);
  const moon = add(new THREE.DirectionalLight(LT.moon.color, LT.moon.intensity), scene);
  moon.position.set(MAP.X(1360), 2.4, BACK - 3); moon.target.position.set(.4, .6, 0); scene.add(moon.target);

  /* ================= PER FRAME ================= */
  function sync(dt: number){
    const on = !S.rLampOff, dg = S.dialGlow || 0;
    deskLamp.spot.intensity = on ? LT.lamp.spot : 0; deskLamp.point.intensity = on ? LT.lamp.point : 0;
    deskLamp.sm.material = on ? deskLamp.shadeOn : deskLamp.shadeOff;
    deskLamp.inner.emissiveIntensity = on ? 1 : .05; (deskLamp.bulb.material as THREE.MeshToonMaterial).emissiveIntensity = on ? 1.1 : .02;
    deskLamp.halo.material.opacity = on ? .55 : 0;
    hemi.intensity = LT.hemi*(on ? 1 : .72);
    dialTex.tick(); eyeTex.tick(); table.tick(); printer.label.tick(); printer.slipTex.tick(); stripTex.tick();
    (dialFace.material as THREE.MeshToonMaterial).emissiveIntensity = .06 + .28*dg;
    dialLight.intensity = LT.dial.intensity*dg; dialHalo.material.opacity = .18*dg;
    needle.position.x = ((fx(G.freq) - 480)/276 - .5)*DW;
    (eyeFace.material as THREE.MeshToonMaterial).emissiveIntensity = G.radioOn ? .55 : 0;
    eyeGlow.material.opacity = G.radioOn ? .7 : 0; eyeLight.intensity = G.radioOn ? LT.eye.intensity : 0;
    power.spin.rotation.y = G.radioOn ? -Math.PI/2 : 0;
    tune.spin.rotation.y = -G.freq*620*D2R;
    phones.visible = !G.phones;
    printer.hang.visible = !!G.printed;
    printer.lampMat.emissiveIntensity = G.printed ? 1 : 0; printer.lampMat.color.set(G.printed ? '#ffd9a3' : '#4a5570'); printer.lampGlow.material.opacity = G.printed ? .7 : 0;
    ghosts.forEach((g2, i) => { g2.m.visible = !!G.ghost && !(G.strip[g2.col] & (1 << g2.r)); (g2.m.material as THREE.MeshBasicMaterial).opacity = .35 + .15*Math.sin(S.T*2 + g2.col + i*0); });
    playhead.visible = G.wind > 0; playhead.position.x = ((((S.boxStep + 15) % 16) + .5)/16 - .5)*SW;
    crankArm.rotation.z = -S.crankA*D2R;
    gauge.visible = G.wind > 0; gauge.scale.x = Math.max(.001, G.wind/12*.3); gauge.position.x = -.18 + gauge.scale.x/2;
    /* the notes: S.notes is design units over the music box (x 1260..1340, y 390) */
    let n = 0;
    for (const nt of S.notes){
      const q = nt.t/1.8, s = notePool[n] || (notePool[n] = add(noRay(new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex.t, transparent: true, depthWrite: false, toneMapped: false }))), box));
      n++; s.visible = true;
      s.position.set(.12 + (nt.x - 1300)/400 + Math.sin(q*6)*.02, MB.h + .12 + q*.32 + nt.r*.012, -.02);
      s.scale.setScalar(.07); s.material.opacity = 1 - q;
    }
    for (let i = n; i < notePool.length; i++) notePool[i].visible = false;
    slip.redraw();
  }

  const views: View[] = [
    { id: 'room', label: tr('电台室'), ...RAD.views.room },
    { id: 'radio', label: tr('收音机'), ...RAD.views.radio },
    { id: 'printer', label: tr('打印机'), ...RAD.views.printer },
    { id: 'tape', label: tr('八音盒'), ...RAD.views.tape }
  ];
  return {
    scene, views, sync,
    fxAt(_k, x, y){
      if (x >= SX0 - 10 && x <= SX0 + 388 && y >= SY0 - 10 && y <= SY0 + 156) return [stripMap.at(x, y, .02), stripMap.unit];
      return [MAP.at(x, y, BACK + .3), 1/RAD.map.unit];
    }
  };
}

register3D({ id: 'radio', build });
