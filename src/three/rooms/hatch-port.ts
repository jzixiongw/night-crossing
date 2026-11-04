import * as THREE from 'three';
import { BRUSH, SFOG, spr } from '../../core/paint';
import { mixHex, mulberry32 } from '../../core/util';
import type { Port } from '../../data/ports';
import { HAT } from '../config/hatch';
import { M, add, canvasTex, flatMat, glow, lathe, mesh, noRay, rbox, toon } from '../kit';

/* ================= WHAT THE DOOR OPENS ONTO =================
   portBack() in rooms/hatch.ts, set out in depth past the hull: a painted sky
   far back (gradient, the haze of the port's own light, a few stars), and in
   front of it the few shapes the 2D picture had -- decking and pilings and
   the old lamp at the dock, the buoy and its ring, the bell on the ice, the
   other ship's flank with one lit window. `z0` is the outer face of the hull;
   everything here is further out than that. None of it is touchable: the
   only thing on the far side a hand can reach is the visitor. */

const PAL = HAT.palette, SK = HAT.port.sky;

export interface Port3D { g: THREE.Group; amb: string; sync(hold: number): void }

function skyBackdrop(g: THREE.Group, P: Port, z0: number){
  const sky = PAL.sky[P.id] || PAL.sky.dock, W = SK.w, Hh = SK.h, lamp = P.look.lamp;
  const tex = canvasTex(1024, Math.round(1024*Hh/W), (c, w, h) => {
    const k = w/W, row = (y: number) => (SK.y + Hh/2 - y)*k, hz = row(SK.horizon);
    const gr = c.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, mixHex(sky[0], '#000000', .25)); gr.addColorStop(.7, sky[0]); gr.addColorStop(1, sky[1]);
    c.fillStyle = gr; c.fillRect(0, 0, w, hz);
    /* below the horizon, dark water with the port's light lying on it */
    const wg = c.createLinearGradient(0, hz, 0, h); wg.addColorStop(0, mixHex(sky[1], '#000000', .45)); wg.addColorStop(1, mixHex(sky[0], '#000000', .6));
    c.fillStyle = wg; c.fillRect(0, hz, w, h - hz);
    const R = mulberry32(P.look.h);
    c.fillStyle = lamp;
    for (let i = 0; i < 26; i++){ const y = hz + 3 + Math.pow(R(), 1.6)*(h - hz)*.5, len = (8 + R()*30)*(1 + (y - hz)/60); c.globalAlpha = .08 + R()*.14; c.fillRect(w/2 + (R() - .5)*w*.22 - len/2, y, len, 1.2); }
    /* the haze of the port's lamp, low behind the doorway */
    c.globalAlpha = .28; c.drawImage(spr(lamp), w/2 - 3*k, row(1.1) - 2.2*k, 6*k, 4.4*k);
    for (let i = 0; i < 160; i++){ const y = R()*row(SK.horizon + 1.2); c.globalAlpha = (.3 + R()*.6)*(1 - y/hz*.5); c.fillStyle = R() < .1 ? '#ffe3b8' : '#dfe9f3'; const s = .7 + R()*1.1; c.fillRect(R()*w, y, s, s); }
    c.globalAlpha = .12; c.globalCompositeOperation = 'soft-light'; c.fillStyle = c.createPattern(BRUSH[2], 'repeat'); c.fillRect(0, 0, w, h);
  });
  add(noRay(mesh(new THREE.PlaneGeometry(W, Hh), flatMat('#c8ccd8', { map: tex.t }), [0, SK.y, z0 - SK.z], { cast: false, receive: false })), g);
}

export function buildPort(parent: THREE.Object3D, P: Port, z0: number): Port3D {
  const g = new THREE.Group(); g.name = 'port:' + P.id; parent.add(g);
  skyBackdrop(g, P, z0);
  const lamp = P.look.lamp, vz = z0 - HAT.port.visZ;
  let sync: (hold: number) => void = () => {};

  if (P.id === 'dock'){
    /* decking, two pilings, and the old lamp the keeper has been wiping */
    const deck = canvasTex(256, 512, (c, w, h) => {
      c.fillStyle = PAL.woodD; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++){ c.fillStyle = ['#6c4331', '#644030', '#71473a', '#5f3b2b'][i % 4]; c.fillRect(i*w/8 + 1, 0, w/8 - 2, h); c.fillStyle = '#2a1810'; c.globalAlpha = .6; c.fillRect(i*w/8 - 1.5, 0, 3, h); c.globalAlpha = 1; }
      c.globalCompositeOperation = 'soft-light'; c.globalAlpha = .5; c.fillStyle = c.createPattern(BRUSH[1], 'repeat'); c.fillRect(0, 0, w, h);
    });
    add(mesh(new THREE.PlaneGeometry(3.4, 4.2), M('woodD', '#ffffff', { map: deck.t, rim: 0, hl: 0 }), [0, -.03, z0 - 2.1], { rot: [-Math.PI/2, 0, 0], cast: false }), g);
    add(mesh(rbox(3.4, .14, .12, .03), M('woodD', PAL.woodD), [0, -.1, z0 - 4.2]), g);
    const pile = new THREE.CylinderGeometry(.085, .095, 1.5, 16), pm = M('woodD', PAL.woodD, { rep: [1, 3] });
    for (const x of [-.66, .66]){
      add(mesh(pile, pm, [x, .55, z0 - 2.9]), g);
      add(mesh(new THREE.TorusGeometry(.1, .022, 8, 20), M('cloth', '#8a7558'), [x, .95, z0 - 2.9], { rot: [Math.PI/2, 0, 0] }), g);
    }
    /* the old lamp: a post, a globe, a dim core */
    add(mesh(new THREE.CylinderGeometry(.022, .03, 2.1, 10), M('metal', PAL.metalD), [.95, 1.02, z0 - 3.3]), g);
    add(mesh(new THREE.SphereGeometry(.1, 16, 12), M('glass', PAL.glass, { transparent: true, opacity: .45, depthWrite: false }), [.95, 2.16, z0 - 3.3], { cast: false }), g);
    add(mesh(new THREE.SphereGeometry(.05, 12, 10), toon('#6d5c3a', { grain: -1, emissive: '#6d5c3a', ei: .5 }), [.95, 2.16, z0 - 3.3], { cast: false }), g);
    /* the railing the ring of light finds, once the new lamp is up */
    const railM = M('woodD', PAL.woodD, { transparent: true, opacity: 0 });
    const rail = new THREE.Group(); g.add(rail);
    add(mesh(rbox(3.2, .05, .06, .02), railM, [0, .86, z0 - 3.95]), rail);
    for (let k = 0; k < 8; k++) add(mesh(rbox(.05, .86, .05, .015), railM, [-1.5 + k*3/7, .43, z0 - 3.95]), rail);
    sync = (hold) => { rail.visible = hold > .02; railM.opacity = Math.min(1, hold); };
  } else if (P.id === 'echo'){
    /* a buoy's wet deck, and the ring it hangs its sound from */
    const deck = add(mesh(new THREE.CylinderGeometry(1.7, 1.75, .12, 40), M('metal', PAL.tealD, { grain: 1, rep: 2, hl: .35 }), [0, -.07, vz - .3], { cast: false }), g);
    deck.scale.z = .75;
    add(mesh(rbox(1.0, 1.55, .9, .32), M('metal', PAL.tealD, { grain: 1, rep: [1, 2], hl: .3 }), [0, .78, z0 - 2.9]), g);
    add(mesh(new THREE.TorusGeometry(.36, .06, 12, 40), M('metal', PAL.metalD), [0, 1.98, z0 - 2.9]), g);
    add(mesh(new THREE.TorusGeometry(.24, .03, 10, 32), M('metal', PAL.metalD), [0, 1.98, z0 - 2.88]), g);
    /* a porthole in the buoy: where the new lamp ends up, warm once it is there */
    const winM = toon('#1d2a3a', { grain: -1, emissive: lamp, ei: 0, ramp: 'crisp', hl: .6 });
    add(mesh(new THREE.CircleGeometry(.11, 24), winM, [.26, 1.36, z0 - 2.44], { cast: false }), g);
    add(mesh(new THREE.TorusGeometry(.12, .02, 8, 24), M('brass', PAL.brass), [.26, 1.36, z0 - 2.44]), g);
    const fog = add(glow(SFOG, 5, .34), g); fog.position.set(0, .35, z0 - 2.2); fog.scale.set(6, 1.8, 1);
    fog.material.blending = THREE.NormalBlending;
    sync = (hold) => { winM.emissiveIntensity = .9*hold; };
  } else if (P.id === 'bell'){
    /* ice, and the bell itself filling most of the doorway */
    const ice = M('glass', PAL.glass, { emissive: '#3e6e80', ei: .25, hl: .5 });
    add(mesh(new THREE.CylinderGeometry(2.4, 2.5, .1, 40), ice, [0, -.07, z0 - 2.2], { cast: false }), g).scale.z = .9;
    for (const [x, z, s] of [[-1.1, -1.4, .35], [1.25, -1.9, .28], [-.6, -3.1, .3], [.9, -3.4, .4]] as const){
      const l = add(mesh(new THREE.SphereGeometry(1, 14, 10), ice, [x, 0, z0 + z]), g); l.scale.set(s*1.6, s*.5, s);
    }
    const bellP: [number, number][] = [[.62, 0], [.6, .04], [.51, .12], [.46, .34], [.44, .68], [.4, .98], [.31, 1.2], [.16, 1.32], [0, 1.35]];
    const bellG = new THREE.Group(); bellG.position.set(0, .2, z0 - 3.1); g.add(bellG);
    add(mesh(lathe(bellP, 40), M('brass', mixHex(PAL.brass, '#4a2c14', .5), { hl: .45, hlSize: .12 }), undefined, { rot: [0, Math.PI, 0] }), bellG);
    const inner = toon(mixHex(PAL.brass, '#3a2410', .5), { grain: -1, side: THREE.BackSide, emissive: lamp, ei: 0, ramp: 'soft' });
    add(mesh(lathe(bellP.map(([r, y]) => [r*.96, y*.97] as [number, number]), 40), inner, undefined, { cast: false, rot: [0, Math.PI, 0] }), bellG);
    add(mesh(new THREE.TorusGeometry(.09, .03, 10, 20), M('brass', mixHex(PAL.brass, '#5a3a1a', .35)), [0, 1.4, 0]), bellG);
    add(mesh(rbox(1.3, .16, .9, .05), M('brass', mixHex(PAL.brass, '#5a3a1a', .25)), [0, .08, z0 - 3.1]), g);
    sync = (hold) => { inner.emissiveIntensity = .7*hold; };
  } else {
    /* the other ship, close enough that one window reads as a room, and the
       plank laid across to it */
    add(mesh(rbox(1.3, .06, 2.6, .02), M('metal', PAL.metalD, { grain: 1, rep: [1, 3] }), [0, -.04, z0 - 1.3]), g);
    for (const sx of [-1, 1]){
      add(mesh(rbox(.04, .04, 2.6, .015), M('metal', PAL.metal), [sx*.62, .82, z0 - 1.3]), g);
      for (let k = 0; k < 4; k++) add(mesh(rbox(.035, .82, .035, .01), M('metal', PAL.metalD), [sx*.62, .41, z0 - .25 - k*.7]), g);
    }
    add(mesh(rbox(9, 4.2, 1.2, .5), M('metal', PAL.navy, { grain: 1, rep: [4, 2], hl: .2, hlSize: .25 }), [0, 1.0, z0 - 3.2]), g);
    add(mesh(rbox(9.1, .12, .1, .04), M('metal', PAL.frame), [0, .05, z0 - 2.58]), g);
    const fw = .86, fh = .46;
    const WX = .95, WY = 1.5;
    add(mesh(rbox(fw + .14, fh + .14, .08, .1), M('metal', PAL.frame, { hl: .3 }), [WX, WY, z0 - 2.58]), g);
    const winM = toon('#2a3550', { grain: -1, emissive: mixHex(lamp, '#2a3550', .35), ei: .4, ramp: 'soft', rim: 0, hl: 0 });
    add(mesh(rbox(fw, fh, .02, .08), winM, [WX, WY, z0 - 2.535], { cast: false }), g);
    const halo = add(glow(spr(lamp), 1.4, .1), g); halo.position.set(WX, WY, z0 - 2.45);
    for (const x of [-2.4, -1.2, 2.4]){ const p = add(mesh(new THREE.CircleGeometry(.13, 20), toon('#141d33', { grain: -1, emissive: '#26344f', ei: .5 }), [x, 1.7, z0 - 2.575], { cast: false }), g); p.renderOrder = 1; }
    sync = (hold) => { winM.emissiveIntensity = .4 + .5*hold; winM.emissive.set(mixHex(mixHex(lamp, '#2a3550', .35), '#ffc27a', hold)); halo.material.opacity = .1 + .3*hold; };
  }
  return { g, amb: mixHex(lamp, '#9fb2d6', .45), sync };
}
