import * as THREE from 'three';
import { SWARM, spr } from '../core/paint';
import { mixHex } from '../core/util';
import { PORTS } from '../data/ports';
import { HAT } from './config/hatch';
import { glow, lathe, rbox } from './kit';

/* ================= THE FOUR PLACES, SEEN FROM OFF =================
   What the bridge windows and the ring's windows show of a place: the same
   shapes, in the same proportions and colours, as the place built behind the
   gangway door (rooms/hatch-port.ts) -- the long wharf with its pilings and
   the lamp post at the end, the buoy with three rings up its mast, the bell in
   its frame on the ice, the other ship's flank with the greenhouse window --
   but as night silhouettes with their own lights, because from a window they
   are lit by nothing in the room.

   Local metres, laid out as in hatch-port.ts: x to the right looking out from
   the gangway, z outward (negative), y up from the deck. A view places the
   group and scales it; `sync()` takes how far off it is (fog: 0 near, 1 lost
   in the sky), the sky's colour to fade into, and how lit it is by the lamp
   left there. The light of that lamp is a glow sprite that does not shrink
   with the place, so it is still a point of light when the place is a speck. */

export interface Landmark { g: THREE.Group; sync(o: { fog: number; sky: THREE.Color; lit: number; t: number; vis: number; shrink?: number }): void; dispose(): void }

const base = (c: string) => new THREE.Color(c);
export function buildLandmark(id: string): Landmark {
  const g = new THREE.Group(); g.name = 'landmark:' + id;
  const P = PORTS[id], lamp = P.look.lamp, W = HAT.port.walk[id];
  const mats: { m: THREE.MeshBasicMaterial; c: THREE.Color }[] = [];
  const mat = (c: string, o: { opacity?: number } = {}) => {
    const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o.opacity ?? 1, toneMapped: false, fog: false });
    mats.push({ m, c: base(c) }); return m;
  };
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(rbox(w, h, d, Math.min(w, h, d)*.2, 1), m); o.position.set(x, y, z); g.add(o); return o; };
  const cyl = (r: number, h: number, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), m); o.position.set(x, y, z); g.add(o); return o; };
  const lights: { s: THREE.Sprite; a: number; lit: boolean; size: number }[] = [];
  const light = (c: HTMLCanvasElement, size: number, a: number, x: number, y: number, z: number, lit = false) => {
    const s = glow(c, size, a); s.position.set(x, y, z); g.add(s); lights.push({ s, a, lit, size }); return s;
  };

  if (id === 'dock'){
    const wood = mat('#3a2822'), woodD = mat('#2a1c18'), metal = mat('#2a3348');
    box(3.4, .1, 4.2, wood, 0, -.05, -2.1);
    box(11, .14, 1.8, wood, .6, -.05, -4.95);
    for (let x = -4.6; x <= 5.8; x += 1.3) for (const z of [-4.1, -5.8]) cyl(.09, 1.4, woodD, x, -.7, z);
    for (const x of [-.66, .66]) cyl(.09, 1.5, woodD, x, .55, -2.9);
    cyl(.035, 2.5, metal, 2.28, 1.22, -4.42);
    box(.06, .06, .32, metal, 2.28, 2.08, -4.28);
    box(9.5, .06, .06, woodD, .9, .9, -5.72);
    for (let k = 0; k < 12; k++) box(.05, .9, .05, woodD, -3.8 + k*.85, .45, -5.72);
    box(1.7, 1.3, 1.1, woodD, 4.0, .65, -5.1);
    /* the old globe, dim, which is what the ship sees of the place from far off */
    light(spr('#c79a5a'), 1.4, .55, 2.28, 2.56, -4.42);
    /* lights floating on the water further out */
    for (const [x, z] of [[-4.2, -8], [-1.5, -11], [3.1, -9.5], [6.2, -12], [.4, -14]]) light(spr(lamp), .7, .5, x, -.1, z);
  } else if (id === 'echo'){
    const teal = mat('#23464a'), dark = mat('#1a2b38');
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.75, .12, 24), teal); deck.position.set(0, -.07, -2.6); deck.scale.z = .75; g.add(deck);
    box(1.0, 1.55, .9, teal, .6, .78, -2.9);
    cyl(.05, 2.0, dark, .6, 2.5, -2.9);
    for (const [y, r] of [[1.98, .36], [2.7, .3], [3.3, .22]] as const){ const t = new THREE.Mesh(new THREE.TorusGeometry(r, .06, 6, 24), dark); t.position.set(.6, y, -2.9); t.rotation.x = Math.PI/2*.15; g.add(t); }
    light(spr('#62b0a8'), 1.6, .5, .6, 3.35, -2.9);
  } else if (id === 'bell'){
    const ice = mat('#7fa6b4'), frame = mat('#2c2430'), brass = mat('#5a432c');
    const shelf = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, .3, 24), ice); shelf.position.set(0, -.15, -2.6); shelf.scale.z = .7; g.add(shelf);
    for (const x of [-.86, .86]) box(.12, 2.15, .12, frame, x, 1.07, -3.1);
    box(1.95, .14, .16, frame, 0, 2.12, -3.1);
    const bellP: [number, number][] = [[.62, 0], [.6, .04], [.51, .12], [.46, .34], [.44, .68], [.4, .98], [.31, 1.2], [.16, 1.32], [0, 1.35]];
    const bell = new THREE.Mesh(lathe(bellP, 20), brass); bell.position.set(0, .34, -3.1); g.add(bell);
    box(1.3, .16, .9, brass, 0, .08, -3.1);
    light(spr('#9fd2e0'), 2.2, .25, 0, .2, -2.6);
  } else {
    const navy = mat('#1c2a48'), frame = mat('#2c3a58');
    box(9, 4.2, 1.2, navy, 0, 1.0, -3.2);
    box(9.1, .12, .1, frame, 0, .05, -2.58);
    box(1.0, .6, .08, frame, .95, 1.5, -2.58);
    for (const x of [-2.4, -1.4, 2.4, 3.4, -3.4]) light(spr('#8fa4c8'), .5, .5, x, 1.7, -2.5);
  }

  /* the lamp that was left there: where it was set down, as a light */
  const at = W.dest ? new THREE.Vector3(W.dest[0], W.dest[1], W.dest[2]) : new THREE.Vector3(.95, 1.5, -2.5);
  const core = light(spr(lamp), .9, 1, at.x, at.y + .05, at.z + .05, true);
  const halo = light(SWARM, 4.5, .55, at.x, at.y, at.z + .1, true);
  /* the pool it throws on the place (the wharf's boards, the bell's foot) */
  const pool = id === 'ship' ? null : light(spr(lamp), 3.2, .35, at.x, Math.max(.05, at.y*.15), at.z + .2, true);
  if (pool) pool.scale.set(3.2, 1.1, 1);
  void core; void halo;

  const sky = new THREE.Color(), tmp = new THREE.Color();
  return {
    g,
    sync({ fog, sky: s, lit, t, vis, shrink = 1 }){
      sky.copy(s);
      /* moonlit a little, so a silhouette holds against a dark sky */
      for (const { m, c } of mats){ tmp.copy(c).multiplyScalar(1.35).lerp(sky, Math.min(.92, fog)); m.color.copy(tmp); m.opacity = vis; }
      for (const L of lights){
        const on = L.lit ? lit : 1;
        L.s.material.opacity = L.a*on*vis*(L.lit ? .9 + .1*Math.sin(t*2.3) : 1)*(L.lit ? 1 : 1 - fog*.5);
        /* a light does not shrink as fast as the place it is on */
        const grow = Math.min(5, Math.pow(Math.max(.002, shrink), -.55));
        L.s.scale.set(L.size*grow, L.size*grow*(L.s === pool ? .35 : 1), 1);
      }
    },
    dispose(){
      g.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mm = m.material as THREE.Material; if (mm && !(mm as any).map?.userData?.keep) mm.dispose(); });
    }
  };
}
/* A light-coloured version of the sky for fading the far ones into: what the
   rooms use as `sky` above. */
export const skyOf = (hex: string) => new THREE.Color(mixHex(hex, '#000000', .1));
