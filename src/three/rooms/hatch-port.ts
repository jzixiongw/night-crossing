import * as THREE from 'three';
import { BRUSH, SFOG, spr } from '../../core/paint';
import { mixHex, mulberry32 } from '../../core/util';
import type { Port } from '../../data/ports';
import { HAT } from '../config/hatch';
import { M, add, canvasTex, flatMat, glow, lathe, mesh, noRay, rbox, spriteTex, toon } from '../kit';

/* ================= WHAT THE DOOR OPENS ONTO =================
   portBack() in rooms/hatch.ts, set out in depth past the hull. Two parts:

     sky    a painted backdrop far behind everything (gradient, the haze of
            the place's own light, stars, dark water), which stays put;
     body   the place itself, which is what comes in from the distance as
            the ship approaches and falls astern as it leaves -- the room
            slides it along z (HAT.port.far) and lets perspective do the rest.

   Each place is the same few shapes wherever it is seen from (three/
   landmarks.ts draws the far-off versions for the bridge and the ring from
   the same proportions): the wharf, its pilings and its old lamp post; the
   buoy with its rings; the bell in its frame on the ice; the other ship's
   flank with its greenhouse window.

   `sync()` takes how lit the place is by the lamp left there, so the dark
   parts of it come up when the lamp is set down. `z0` is the outer face of
   the hull; the visitor walks on `body` too, so they leave with the place. */

const PAL = HAT.palette, SK = HAT.port.sky;

export interface Port3D {
  g: THREE.Group; body: THREE.Group; sky: THREE.Mesh; skyMat: THREE.MeshBasicMaterial; amb: string;
  door: THREE.Object3D | null;
  sync(o: { lit: number; t: number; vis: number }): void;
}

function skyBackdrop(g: THREE.Group, P: Port, z0: number){
  const sky = PAL.sky[P.id] || PAL.sky.dock, W = SK.w, Hh = SK.h, lamp = P.look.lamp;
  const tex = canvasTex(1024, Math.round(1024*Hh/W), (c, w, h) => {
    const k = w/W, row = (y: number) => (SK.y + Hh/2 - y)*k, hz = row(SK.horizon);
    const gr = c.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, mixHex(sky[0], '#000000', .25)); gr.addColorStop(.7, sky[0]); gr.addColorStop(1, sky[1]);
    c.fillStyle = gr; c.fillRect(0, 0, w, hz);
    /* below the horizon, dark water with the place's light lying on it */
    const wg = c.createLinearGradient(0, hz, 0, h); wg.addColorStop(0, mixHex(sky[1], '#000000', .45)); wg.addColorStop(1, mixHex(sky[0], '#000000', .6));
    c.fillStyle = wg; c.fillRect(0, hz, w, h - hz);
    const R = mulberry32(P.look.h);
    c.fillStyle = lamp;
    for (let i = 0; i < 26; i++){ const y = hz + 3 + Math.pow(R(), 1.6)*(h - hz)*.5, len = (8 + R()*30)*(1 + (y - hz)/60); c.globalAlpha = .08 + R()*.14; c.fillRect(w/2 + (R() - .5)*w*.22 - len/2, y, len, 1.2); }
    c.globalAlpha = .28; c.drawImage(spr(lamp), w/2 - w*.18, hz - w*.13, w*.36, w*.26);
    for (let i = 0; i < 160; i++){ const y = R()*(hz - 6); c.globalAlpha = (.3 + R()*.6)*(1 - y/hz*.5); c.fillStyle = R() < .1 ? '#ffe3b8' : '#dfe9f3'; const s = .7 + R()*1.1; c.fillRect(R()*w, y, s, s); }
    c.globalAlpha = .12; c.globalCompositeOperation = 'soft-light'; c.fillStyle = c.createPattern(BRUSH[2], 'repeat'); c.fillRect(0, 0, w, h);
  });
  const mat = flatMat('#c8ccd8', { map: tex.t, opacity: 1 });
  const m = add(noRay(mesh(new THREE.PlaneGeometry(W, Hh), mat, [0, SK.y, z0 - SK.z], { cast: false, receive: false })), g);
  m.renderOrder = -5;
  return { m, mat: mat as THREE.MeshBasicMaterial };
}

/* a ring of light on a sprite, for the buoy's pulses */
let RING_TEX: THREE.Texture | null = null;
function ringTex(){
  if (RING_TEX) return RING_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 40, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.7, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return (RING_TEX = spriteTex(c));
}

export function buildPort(parent: THREE.Object3D, P: Port, z0: number): Port3D {
  const g = new THREE.Group(); g.name = 'port:' + P.id; parent.add(g);
  const { m: sky, mat: skyMat } = skyBackdrop(g, P, z0);
  const body = new THREE.Group(); g.add(body);
  const lamp = P.look.lamp, vz = z0 - HAT.port.visZ;
  let sync: (o: { lit: number; t: number; vis: number }) => void = () => {};
  let door: THREE.Object3D | null = null;

  if (P.id === 'dock'){
    /* the jetty from the hull out to the wharf, the long wharf itself, its
       pilings, and the old lamp post at the end the keeper has been wiping */
    const plank = () => canvasTex(256, 512, (c, cw, ch) => {
      c.fillStyle = PAL.woodD; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 8; i++){ c.fillStyle = ['#6c4331', '#644030', '#71473a', '#5f3b2b'][i % 4]; c.fillRect(i*cw/8 + 1, 0, cw/8 - 2, ch); c.fillStyle = '#2a1810'; c.globalAlpha = .6; c.fillRect(i*cw/8 - 1.5, 0, 3, ch); c.globalAlpha = 1; }
      c.globalCompositeOperation = 'soft-light'; c.globalAlpha = .5; c.fillStyle = c.createPattern(BRUSH[1], 'repeat'); c.fillRect(0, 0, cw, ch);
    });
    const jetty = plank();
    add(mesh(new THREE.PlaneGeometry(3.4, 4.2), M('woodD', '#ffffff', { map: jetty.t, rim: 0, hl: 0 }), [0, -.03, z0 - 2.1], { rot: [-Math.PI/2, 0, 0], cast: false }), body);
    const wharfT = plank(); wharfT.t.wrapS = wharfT.t.wrapT = THREE.RepeatWrapping; wharfT.t.repeat.set(1, 3.2);
    add(mesh(new THREE.PlaneGeometry(1.7, 11), M('woodD', '#ffffff', { map: wharfT.t, rim: 0, hl: 0 }), [.6, -.02, z0 - 4.95], { rot: [-Math.PI/2, 0, Math.PI/2], cast: false }), body);
    add(mesh(rbox(11, .16, .14, .03), M('woodD', PAL.woodD), [.6, -.1, z0 - 4.1]), body);
    add(mesh(rbox(11, .16, .14, .03), M('woodD', PAL.woodD), [.6, -.1, z0 - 5.8]), body);
    const pile = new THREE.CylinderGeometry(.085, .095, 1.5, 12), pm = M('woodD', PAL.woodD, { rep: [1, 3] });
    for (const x of [-.66, .66]){
      add(mesh(pile, pm, [x, .55, z0 - 2.9]), body);
      add(mesh(new THREE.TorusGeometry(.1, .022, 8, 20), M('cloth', '#8a7558'), [x, .95, z0 - 2.9], { rot: [Math.PI/2, 0, 0] }), body);
    }
    for (let x = -4.6; x <= 5.8; x += 1.3) for (const z of [4.1, 5.8]) add(mesh(pile, pm, [x, .02, z0 - z], { scale: [1, .62, 1] }), body);
    /* the old post: tall, with an arm and a hook for a lamp, and the old dim globe on top */
    const PX = 2.28, PZ = z0 - 4.42;
    add(mesh(new THREE.CylinderGeometry(.03, .04, 2.5, 10), M('metal', PAL.metalD), [PX, 1.22, PZ]), body);
    add(mesh(rbox(.05, .05, .32, .01), M('metal', PAL.metalD), [PX, 2.08, PZ + .14]), body);
    add(mesh(new THREE.TorusGeometry(.03, .008, 6, 12), M('metal', PAL.metalD), [PX, 2.03, PZ + .2]), body);
    add(mesh(new THREE.SphereGeometry(.1, 16, 12), M('glass', PAL.glass, { transparent: true, opacity: .45, depthWrite: false }), [PX, 2.56, PZ], { cast: false }), body);
    const oldCore = toon('#6d5c3a', { grain: -1, emissive: '#6d5c3a', ei: .5 });
    add(mesh(new THREE.SphereGeometry(.05, 12, 10), oldCore, [PX, 2.56, PZ], { cast: false }), body);
    const oldHalo = add(glow(spr(lamp), .9, .18), body); oldHalo.position.set(PX, 2.56, PZ + .05);
    /* What the new lamp finds when it is hung: the railing along the back of
       the wharf and a shed nobody could see from the ship. They are there all
       along, in the dark; the lamp's light is what shows them. */
    const railM = M('woodD', mixHex(PAL.woodD, '#000000', .2));
    add(mesh(rbox(9.5, .05, .06, .02), railM, [.9, .9, z0 - 5.72]), body);
    for (let k = 0; k < 12; k++) add(mesh(rbox(.05, .9, .05, .015), railM, [-3.8 + k*.85, .45, z0 - 5.72]), body);
    const shedM = M('wood', '#5d4636', { rep: [2, 2] });
    add(mesh(rbox(1.7, 1.3, 1.1, .04), shedM, [4.0, .65, z0 - 5.1]), body);
    add(mesh(rbox(1.9, .1, 1.3, .03), M('woodD', PAL.woodD), [4.0, 1.34, z0 - 5.1], { rot: [0, 0, .08] }), body);
    const shedWin = toon('#1a2236', { grain: -1, emissive: lamp, ei: 0, ramp: 'soft', rim: 0, hl: 0 });
    add(mesh(new THREE.PlaneGeometry(.32, .28), shedWin, [3.6, .78, z0 - 4.54], { cast: false }), body);
    /* lights floating on the water, further out: nets, or someone's buoys */
    const R = mulberry32(5), floats: THREE.Sprite[] = [];
    for (let i = 0; i < 6; i++){ const f = add(glow(spr(lamp), .28 + R()*.2, .55), body); f.position.set(-5 + R()*12, -.12, z0 - 7 - R()*9); f.userData.ph = R()*6; floats.push(f); }
    sync = ({ lit, t }) => {
      oldHalo.material.opacity = .18*(1 - lit*.6);
      shedWin.emissiveIntensity = .5*lit;
      floats.forEach(f => { f.position.y = -.12 + Math.sin(t*.8 + f.userData.ph)*.03; f.material.opacity = .4 + .2*Math.sin(t*1.3 + f.userData.ph); });
    };
  } else if (P.id === 'echo'){
    /* a buoy's wet deck, the buoy, and the rings on its mast it hangs its sound from */
    const deck = add(mesh(new THREE.CylinderGeometry(1.7, 1.75, .12, 40), M('metal', PAL.tealD, { grain: 1, rep: 2, hl: .35 }), [0, -.07, vz - .3], { cast: false }), body);
    deck.scale.z = .75;
    const BX = .6;
    add(mesh(rbox(1.0, 1.55, .9, .32), M('metal', PAL.tealD, { grain: 1, rep: [1, 2], hl: .3 }), [BX, .78, z0 - 2.9]), body);
    add(mesh(new THREE.CylinderGeometry(.04, .05, 2.0, 10), M('metal', PAL.metalD), [BX, 2.5, z0 - 2.9]), body);
    for (const [y, r] of [[1.98, .36], [2.7, .3], [3.3, .22]] as const) add(mesh(new THREE.TorusGeometry(r, .05, 12, 40), M('metal', PAL.metalD), [BX, y, z0 - 2.9]), body);
    /* a porthole in the buoy, and the sill under it the lamp goes on */
    const winM = toon('#1d2a3a', { grain: -1, emissive: lamp, ei: 0, ramp: 'crisp', hl: .6 });
    add(mesh(new THREE.CircleGeometry(.11, 24), winM, [BX + .26, 1.36, z0 - 2.44], { cast: false }), body);
    add(mesh(new THREE.TorusGeometry(.12, .02, 8, 24), M('brass', PAL.brass), [BX + .26, 1.36, z0 - 2.44]), body);
    add(mesh(rbox(.36, .04, .14, .01), M('metal', PAL.metalD), [BX + .26, 1.17, z0 - 2.38]), body);
    const fog = add(glow(SFOG, 5, .34), body); fog.position.set(0, .35, z0 - 2.2); fog.scale.set(6, 1.8, 1);
    fog.material.blending = THREE.NormalBlending;
    /* what it is named for: rings of the place's colour going out from the top, slowly */
    const pulses = [0, 1, 2].map(i => { const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(), color: lamp, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })), body);
      s.position.set(BX, 3.3, z0 - 2.9); s.userData.i = i; return s; });
    sync = ({ lit, t }) => {
      winM.emissiveIntensity = .9*lit;
      pulses.forEach(s => { const q = ((t*.18 + s.userData.i/3) % 1); s.scale.setScalar(.4 + q*3.2); s.material.opacity = .32*(1 - q)*Math.min(1, q*6); });
    };
  } else if (P.id === 'bell'){
    /* ice, the frame, and the bell hanging in it filling most of the doorway */
    const ice = M('glass', PAL.glass, { emissive: '#3e6e80', ei: .25, hl: .5 });
    add(mesh(new THREE.CylinderGeometry(2.4, 2.5, .1, 40), ice, [0, -.07, z0 - 2.2], { cast: false }), body).scale.z = .9;
    for (const [x, z, s] of [[-1.1, -1.4, .35], [1.25, -1.9, .28], [-.6, -3.1, .3], [.9, -3.4, .4]] as const){
      const l = add(mesh(new THREE.SphereGeometry(1, 14, 10), ice, [x, 0, z0 + z]), body); l.scale.set(s*1.6, s*.5, s);
    }
    const frameM = M('woodD', mixHex(PAL.woodD, '#2a2030', .3));
    for (const x of [-.86, .86]) add(mesh(rbox(.12, 2.15, .12, .02), frameM, [x, 1.07, z0 - 3.1]), body);
    add(mesh(rbox(1.95, .14, .16, .03), frameM, [0, 2.12, z0 - 3.1]), body);
    const bellP: [number, number][] = [[.62, 0], [.6, .04], [.51, .12], [.46, .34], [.44, .68], [.4, .98], [.31, 1.2], [.16, 1.32], [0, 1.35]];
    const bellG = new THREE.Group(); bellG.position.set(0, .34, z0 - 3.1); body.add(bellG);
    add(mesh(lathe(bellP, 40), M('brass', mixHex(PAL.brass, '#4a2c14', .5), { hl: .45, hlSize: .12 }), undefined, { rot: [0, Math.PI, 0] }), bellG);
    const inner = toon(mixHex(PAL.brass, '#3a2410', .5), { grain: -1, side: THREE.BackSide, emissive: lamp, ei: 0, ramp: 'soft' });
    add(mesh(lathe(bellP.map(([r, y]) => [r*.96, y*.97] as [number, number]), 40), inner, undefined, { cast: false, rot: [0, Math.PI, 0] }), bellG);
    add(mesh(new THREE.TorusGeometry(.09, .03, 10, 20), M('brass', mixHex(PAL.brass, '#5a3a1a', .35)), [0, 1.4, 0]), bellG);
    add(mesh(rbox(.04, .4, .04, .01), M('metal', PAL.metalD), [0, 1.62, 0]), bellG);
    add(mesh(rbox(1.3, .16, .9, .05), M('brass', mixHex(PAL.brass, '#5a3a1a', .25)), [0, .08, z0 - 3.1]), body);
    sync = ({ lit, t }) => { inner.emissiveIntensity = .75*lit*(.92 + .08*Math.sin(t*1.7)); bellG.rotation.z = Math.sin(t*.6)*.008*lit; };
  } else {
    /* the other ship, close enough that one window reads as a room, the
       plank laid across to it, and the door the one who came over goes back through */
    add(mesh(rbox(1.3, .06, 2.6, .02), M('metal', PAL.metalD, { grain: 1, rep: [1, 3] }), [0, -.04, z0 - 1.3]), body);
    for (const sx of [-1, 1]){
      add(mesh(rbox(.04, .04, 2.6, .015), M('metal', PAL.metal), [sx*.62, .82, z0 - 1.3]), body);
      for (let k = 0; k < 4; k++) add(mesh(rbox(.035, .82, .035, .01), M('metal', PAL.metalD), [sx*.62, .41, z0 - .25 - k*.7]), body);
    }
    add(mesh(rbox(9, 4.2, 1.2, .5), M('metal', PAL.navy, { grain: 1, rep: [4, 2], hl: .2, hlSize: .25 }), [0, 1.0, z0 - 3.2]), body);
    add(mesh(rbox(9.1, .12, .1, .04), M('metal', PAL.frame), [0, .05, z0 - 2.58]), body);
    /* their door: a dark opening once the leaf slides aside */
    add(mesh(rbox(.62, 1.22, .06, .05), M('metal', PAL.frame), [-.56, .66, z0 - 2.6]), body);
    add(mesh(new THREE.PlaneGeometry(.5, 1.1), flatMat('#0b0f1a', { opacity: 1 }), [-.56, .62, z0 - 2.565], { cast: false }), body);
    const leaf = add(mesh(rbox(.5, 1.1, .04, .04), M('metal', mixHex(PAL.navy, '#ffffff', .12)), [-.56, .62, z0 - 2.54]), body);
    door = leaf;
    /* the greenhouse window: an empty shelf until the lamp is on it */
    const fw = .86, fh = .46, WX = .95, WY = 1.5;
    add(mesh(rbox(fw + .14, fh + .14, .08, .1), M('metal', PAL.frame, { hl: .3 }), [WX, WY, z0 - 2.58]), body);
    const winM = toon('#2a3550', { grain: -1, emissive: mixHex(lamp, '#2a3550', .35), ei: .4, ramp: 'soft', rim: 0, hl: 0 });
    add(mesh(rbox(fw, fh, .02, .08), winM, [WX, WY, z0 - 2.535], { cast: false }), body);
    const leafM = flatMat('#16211c', { opacity: 1 });
    for (const [x, h] of [[-.28, .16], [-.05, .22], [.2, .13]] as const) add(mesh(new THREE.CircleGeometry(h*.5, 10), leafM, [WX + x, WY - fh/2 + .08 + h*.4, z0 - 2.52], { cast: false }), body);
    add(mesh(rbox(fw - .06, .02, .01, .005), leafM, [WX, WY - fh/2 + .07, z0 - 2.52], { cast: false }), body);
    const halo = add(glow(spr(lamp), 1.4, .1), body); halo.position.set(WX, WY, z0 - 2.45);
    for (const x of [-2.4, -1.4, 2.4]){ const p = add(mesh(new THREE.CircleGeometry(.13, 20), toon('#141d33', { grain: -1, emissive: '#26344f', ei: .5 }), [x, 1.7, z0 - 2.575], { cast: false }), body); p.renderOrder = 1; }
    sync = ({ lit }) => { winM.emissiveIntensity = .4 + .6*lit; winM.emissive.set(mixHex(mixHex(lamp, '#2a3550', .35), '#ffc27a', lit)); halo.material.opacity = .1 + .4*lit; };
  }
  return { g, body, sky, skyMat, door, amb: mixHex(lamp, '#9fb2d6', .45), sync };
}
