import * as THREE from 'three';
import { tr } from '../i18n';
import { mixHex, mk } from '../core/util';
import { SWARM } from '../core/paint';
import { SEEDS } from '../data/index';
import { S } from '../state/runtime';
import { drawSlip, slipH, workSlip } from '../ui/sheet';
import { FONT_GEN, pickable, type DesignMap, type Pick } from './engine';
import { M, add, blot, glow, lathe, mesh, rbox, texOf, toon, tube } from './kit';

/* ================= PROPS MORE THAN ONE ROOM HANGS UP ================= */

/* The work slip, pinned flat to a wall. It is the same paper the 2D rooms
   painted with hangSlip() -- ui/sheet.ts draws it -- on a canvas mapped across
   a plane, redrawn only when what it says changes. `dx, dy, dw` are the
   design units hangSlip() took; `map` puts them on the wall. */
export function slipOnWall(parent: THREE.Object3D, map: DesignMap, o: { dx: number; dy: number; dw: number; rot?: number; z?: number; glow?: number; normal?: 'z' }){
  const S3 = 3, { dx, dy, dw } = o;
  const c = mk(dw*S3, 600*S3), g = c.getContext('2d'), t = texOf(c);
  t.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(.5, -.5, 0);
  /* a little light on the paper of its own, so the slip stays readable in a
     dark room the way the 2D rooms kept a light hole over it */
  const m = add(mesh(geo, toon('#ffffff', { map: t, grain: -1, transparent: true, emissive: '#3c4866', ei: o.glow ?? .55, ramp: 'soft', rim: 0, hl: 0 }),
    [map.X(dx), map.Y(dy), o.z ?? map.z + .012], { cast: false }), parent);
  m.rotation.z = -(o.rot ?? 0);
  pickable(m, { act: 'ui:work', label: tr('这一趟'), key: 'work', inspect: true });
  let sig = '', next = 0;
  const redraw = () => {
    if (S.T < next) return; next = S.T + .5;
    const s = workSlip(dw), now = JSON.stringify(s.rows) + s.title + (s.head || '') + (s.foot || '') + FONT_GEN;
    if (now === sig) return; sig = now;
    const hh = Math.ceil(slipH(s)); c.height = hh*S3; g.setTransform(S3, 0, 0, S3, 0, 0); g.clearRect(0, 0, dw, hh); drawSlip(g, s);
    t.dispose(); t.needsUpdate = true; m.scale.set(map.U(dw), map.U(hh), 1);
    (m.userData.pick as Pick).sphere = null;
  };
  return { mesh: m, redraw };
}

/* A wall porthole with a little sky in it: a brass ring, a dark disc of
   space with stars painted on, and a pane catching a streak of light. */
export function porthole(parent: THREE.Object3D, at: [number, number, number], r: number, o: { brass?: string; sky?: [string, string]; stars?: number; seed?: number; bolts?: number } = {}){
  const g = new THREE.Group(); g.position.set(...at); parent.add(g);
  const c = mk(256, 256), x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, (o.sky || ['#0a1226', '#1a2b4d'])[0]); gr.addColorStop(1, (o.sky || ['#0a1226', '#1a2b4d'])[1]);
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  let s = o.seed ?? 7; const rnd = () => (s = (s*16807) % 2147483647)/2147483647;
  for (let i = 0; i < (o.stars ?? 40); i++){ x.globalAlpha = .5 + rnd()*.5; x.fillStyle = rnd() < .15 ? '#ffd9a3' : '#e2ecf5'; const rr = .8 + rnd()*1.8; x.beginPath(); x.arc(rnd()*256, rnd()*256, rr, 0, Math.PI*2); x.fill(); }
  x.globalAlpha = .08; x.fillStyle = '#fff'; x.beginPath(); x.moveTo(70, 256); x.lineTo(110, 256); x.lineTo(170, 0); x.lineTo(130, 0); x.closePath(); x.fill();
  const t = texOf(c);
  add(mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), [0, 0, -.01], { cast: false, receive: false }), g);
  add(mesh(new THREE.TorusGeometry(r*1.06, r*.14, 12, 40), M('brass', o.brass || '#d69d58'), [0, 0, 0]), g);
  const nb = o.bolts ?? 8, bm = M('metal', '#7489a8'), bg = new THREE.SphereGeometry(r*.05, 8, 6);
  for (let k = 0; k < nb; k++){ const a = k/nb*Math.PI*2; add(mesh(bg, bm, [Math.cos(a)*r*1.32, Math.sin(a)*r*1.32, .01], { cast: false }), g); }
  return g;
}

/* ================= THE PIECE: a plant, its cover, its lamp =================
   G.rig = { sp, glass, lit }. It is built on the greenhouse bench and handed
   over at the gangway, so both rooms stand the same object: a wooden base, a
   stem with two leaves and one open flower in the seed's colour, a glass
   cover once `glass`, a brass cap with a warm light once `lit`. About 30 cm
   tall; `sync()` follows G.rig (or any rig passed in) every frame. */
export function rig3d(parent: THREE.Object3D){
  const g = new THREE.Group(); parent.add(g);
  add(blot(.13, .09, .5), g).position.y = .002;
  add(mesh(rbox(.24, .055, .17, .018), M('wood', '#966141', { hl: .18 }), [0, .028, 0]), g);
  add(mesh(new THREE.CylinderGeometry(.075, .075, .012, 24), toon('#30211a', { grain: 0 }), [0, .061, 0], { cast: false }), g);
  const plant = new THREE.Group(); plant.position.y = .066; g.add(plant);
  add(mesh(tube([[0, 0, 0], [-.012, .07, .004], [.003, .15, 0]], .0055, 14, 6), M('leaf', '#2f6257')), plant);
  const leafS = new THREE.Shape(); leafS.moveTo(0, 0); leafS.quadraticCurveTo(.45, .5, 0, 1); leafS.quadraticCurveTo(-.45, .5, 0, 0);
  const leafG = new THREE.ShapeGeometry(leafS, 8), leafM = M('leaf', '#5f9e85');
  for (const [y, a, s] of [[.07, 1.1, .07], [.095, -1.0, .065]] as const){ const l = add(mesh(leafG, leafM, [0, y, 0], { cast: false }), plant); l.scale.setScalar(s); l.rotation.set(.3, 0, a); }
  const petalM = M('cloth', '#ffffff', { hl: .2, emissive: '#000000', ei: .25 });
  const flower = new THREE.Group(); flower.position.set(.003, .155, 0); plant.add(flower);
  const petalG = new THREE.SphereGeometry(1, 12, 8);
  for (let k = 0; k < 5; k++){ const a = k/5*Math.PI*2, p = add(mesh(petalG, petalM, [Math.cos(a)*.016, .006, Math.sin(a)*.016], { cast: false }), flower); p.scale.set(.018, .008, .012); p.rotation.y = -a; }
  add(mesh(new THREE.SphereGeometry(.009, 10, 8), toon('#ffe7bd', { grain: -1, emissive: '#ffd59a', ei: .4 }), [0, .012, 0], { cast: false }), flower);
  /* the cover: see-through, or the plant it was built around stops existing */
  const cover = new THREE.Group(); g.add(cover);
  add(mesh(lathe([[.105, .058], [.104, .12], [.095, .19], [.07, .24], [.035, .27], [0, .278]], 32),
    M('glass', '#cfe6f4', { transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide }), undefined, { cast: false }), cover);
  add(mesh(new THREE.TorusGeometry(.106, .012, 10, 36), M('brass', '#d69d58'), [0, .062, 0], { rot: [Math.PI/2, 0, 0] }), cover);
  /* the lamp: a cap that sits down on the apex, and its light */
  const lamp = new THREE.Group(); g.add(lamp);
  add(mesh(new THREE.CylinderGeometry(.028, .036, .04, 20), M('brass', '#d69d58'), [0, .29, 0]), lamp);
  const bulb = add(mesh(new THREE.SphereGeometry(.017, 12, 10), toon('#ffe7bd', { grain: -1, emissive: '#ffd59a', ei: 1.2 }), [0, .262, 0], { cast: false }), lamp);
  const halo = add(glow(SWARM, .42, .55), lamp); halo.position.y = .25;
  /* The light hangs off the parent, not the rig, and is never hidden: a light
     appearing or vanishing makes three.js recompile every material in view. */
  const light = new THREE.PointLight('#ffd59a', 0, 1.6, 1.8); parent.add(light);
  const lp = new THREE.Vector3();
  let sp = '';
  function sync(rig: { sp: string; glass?: boolean; lit?: boolean } | null){
    g.visible = !!rig;
    g.updateWorldMatrix(true, false); lp.set(0, .2, 0); g.localToWorld(lp); parent.worldToLocal(lp); light.position.copy(lp);
    if (!rig){ light.intensity = 0; return; }
    if (rig.sp !== sp){ sp = rig.sp; const col = (SEEDS[sp] || { color: '#e98f8c' }).color; petalM.color.set(col); petalM.emissive.set(mixHex(col, '#000000', .5)); }
    cover.visible = !!rig.glass; lamp.visible = !!rig.lit;
    light.intensity = rig.lit ? 1.4 : 0; bulb.visible = !!rig.lit; halo.visible = !!rig.lit;
  }
  return { g, sync, light };
}
