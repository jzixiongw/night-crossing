import { MAT } from '../../core/materials';

/* ================= THE RING CORRIDOR: EVERY TUNABLE NUMBER =================
   Metres unless marked. The world origin is the ship's centre, y up; a ring
   angle `a` (degrees, the same angles as RING and S.phi) points along
   (sin a, 0, -cos a), so a larger angle is further to the RIGHT. (The 2D
   corridor slid the other way; see the header of ../rooms/corridor.ts for why
   the 3D ring is mirrored.)

   DESIGN UNITS ON THE WALL. The 2D corridor laid every station out on a
   1600x900 sprite whose x ran along the wall at PPD = 30 design units per
   degree of ring. The 3D ring keeps that: on the outer wall one design unit
   along x is 1/30 of a degree, so `unit` (design units per metre) follows
   from the radius, and every station is built from its 2D numbers through
   the station's own frame (x along the wall, y up from the floor at design
   y = floorY, z out of the wall toward the centre). */
const RO = 7.5;
export const RING3 = {
  ring: {
    ro: RO,             // the outer wall, the one you face
    ri: .95,            // the inner wall, behind the camera (the ship's spine)
    h: 2.78,            // floor to ceiling
    floorY: 790,        // design y of the floor on every station sprite (the 2D WB)
    ppd: 30,            // design units per degree along the outer wall, as in 2D
    seg: 1              // degrees per column of the wall/floor/ceiling meshes
  },

  /* The walk: one eye on a fixed circle, always facing the outer wall. */
  cam: {
    rc: 2.3, eye: 1.48, lookY: 1.12, fov: 44, yaw: 14, pitch: 7, dolly: .9,
    /* a phone held upright: a narrow lens (the engine widens it to keep
       44 degrees across), so step a little back to keep a station whole */
    portrait: { rc: 1.7, eye: 1.5, lookY: 1.25, fov: 62 },
    /* seated on the bench, facing the big window */
    sit: { d: 3.45, eye: 1.17, lookY: 1.55, rate: 2.2 },
    /* extra walking bob on top of the engine's CAM.lift, metres per unit */
    bob: .007,
    /* `offCentre`: a station further than this (degrees) from straight ahead
       is walked to by a tap rather than entered */
    offCentre: 7
  },

  /* The wall's trims (design y), and the band of the big window cut out of it. */
  /* `hole` is the big window, opened up from the first 13 degrees; `band` is
     the run of glass beside the gangway door (between the gangway at 160 and
     the galley at 200), where the place alongside can be seen from the ring.
     The ribs at 170 and 190 stay and stand across it as mullions. */
  wall: { top: 190, railH: 26, base: 59, hole: { a: 16, y0: 226, y1: 604 }, band: { ang: 180, a: 11.6, y0: 232, y1: 646 } },
  /* the outside the band looks onto: a backdrop this far out, and where the
     place alongside lies (ring angle, and its distance alongside and far off) */
  outside: { r: 78, from: 128, to: 232,
    /* alongside, the place lies against the hull at the gangway itself, as it
       does through the gangway door; coming in and falling astern it swings
       out ahead of the gangway by up to `swing` degrees, into the band */
    place: { ang: 160, swing: 24, near: 13, far: 320, cap: 60, y: [1.3, 0] as const } },

  floor: { runner: [4.35, 5.75] as const, seamDeg: 5 },
  ceiling: { strip: [6.25, 6.6] as const, beamFrom: 2.4 },

  /* On the half-steps (STEP/2 + k*STEP): a porthole with a lamp over it, and
     a near pillar between you and the wall. Ribs on the quarter steps. */
  port: { y: 430, r: 51, glass: 44, lampY: 334 },
  pillar: { r: 4.7, w: .3 },
  rib: { y0: 276, y1: 792, w: 24 },

  /* the bench in front of the big window, metres from the wall */
  bench: { z: 3.05, len: 2.6, seat: .46, depth: .6 },
  /* the space behind the big window: how far past the wall, and the eye the
     2D picture is matched from (the seated eye) */
  space: { depth: 9 },

  /* Warm, as a lived-in passage should be after the cold rooms either side
     of it: a dusty rose-taupe wall lit from above, brass trim lines, a warm
     plank floor under a terracotta runner. */
  palette: {
    wall: '#77696f', wallHi: '#9c8d8c', wallTop: '#5a4e58', wallLo: '#4a4048', wallMid: '#82747a', wallLow: '#665a62',
    rib: '#5a4852', rail: '#4e3f4a', railLine: '#d9b07a', base: '#4a3a42', baseLine: '#e0b884',
    ceiling: '#5a4a56', ceilingHi: '#76626a', ceilingLo: '#3e323e', beam: '#4a3a40', beamEdge: '#b08a6e', strip: '#f4e2c8', stripGlow: '#d9a878',
    floor: '#6a5048', floorFar: '#4e3c3a', floorNear: '#7a5c50', floorIn: '#4a3834', runner: '#a8604f', runnerEdge: '#74423a',
    inner: '#4a3c46', /* the corridor's metal is warm bronze-grey, not the blue-grey of the hull */
    frame: '#7d6c70', metal: '#ab9d96', metalD: '#5f5058', dark: '#3a2e37',
    brass: MAT.brass.b, paper: MAT.paper.b, cream: MAT.cream.b, wood: MAT.wood.b, woodD: MAT.woodD.b,
    cork: MAT.cork.b, teal: MAT.teal.b, rose: MAT.rose.b, leaf: MAT.leaf.b, amber: MAT.amber.b,
    cushion: MAT.cushion.b, blanket: MAT.blanket.b, ink: '#2a3550', pencil: '#7d7a72', leaf2: '#35605a', vine: '#2f5f5a'
  },

  light: {
    hemiSky: '#d9d2d6', hemiGround: '#55443f', hemi: 1.5,
    /* the lamps over the portholes: a pool of `n` lights that follows the
       walk, each fading out before it is handed to the next lamp along */
    lamp: { n: 4, color: '#ffe0bf', intensity: 6.5, distance: 4.6, decay: 1.4, out: .55, y: 1.9, reach: 78 },
    /* the two stations nearest straight ahead each get a light of their own */
    station: { n: 2, distance: 3, decay: 1.6, reach: 38,
      door: { color: '#f2a95b', i: 1.3, y: 1.45, out: .7 },
      grow: { color: '#ff9fbf', i: 3.2 }, green: { color: '#62b0a8', i: 2 },
      window: { color: '#9fb8e6', i: 5, y: 1.6, out: 1.4 },
      gang: { color: '#ffd9a3', on: 5.5, off: .5, y: 2.25, out: .7 },
      dome: { color: '#8a8fe6', i: 2.4, y: 2.6, out: .7 },
      mail: { color: '#ffe6c8', i: .8, y: 2.0, out: .8 },
      board: { color: '#ffe6c8', i: .9, y: 2.1, out: 1.1 } }
  }
};
/* design units per metre on the outer wall */
export const RU = RING3.ring.ppd*180/(Math.PI*RO);
