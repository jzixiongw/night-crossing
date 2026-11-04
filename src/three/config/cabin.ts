import { MAT } from '../../core/materials';

/* ================= THE BRIDGE (cabin): EVERY TUNABLE NUMBER =================
   Units are metres unless a line says otherwise. "Design units" are the
   1600x900 space the game's logic addresses the cabin in -- WIN, the bulb
   slots, the beacons, the strokes on the glass -- so the back wall is laid
   out from those numbers through `map`, and everything that touches game
   state goes through wallX/wallY and their inverses below. Change `map.unit`
   and the windows, the bulbs and the beacons all move together. */
export const C3 = {
  /* design units -> metres on the back wall: x = (dx - x0)/unit, y = (floorY - dy)/unit */
  map: { unit: 250, x0: 800, floorY: 700 },

  /* The room box. The front is open past the camera, like a stage set, so the
     side walls, floor and ceiling run on behind the lens and no edge of the box
     can swing into frame. */
  room: { halfW: 3.25, h: 2.64, back: -2.4, wallT: .24, front: 6.5 },

  /* The sky backdrop is laid out so a beacon seen from this eye sits where
     the 2D cabin painted it. It is the desk view's eye, and stays put when
     the player moves to another view: the parallax that follows is real. */
  skyEye: [0, 1.3, 3.3] as const,

  /* Viewpoints. [0] is where you sit; the others are where you lean in. */
  views: {
    desk:   { eye: [0, 1.3, 3.3] as const, look: [0, 1.17, -2.4] as const, fov: 43, yaw: 13, pitch: 7, dolly: 1.35,
              portrait: { eye: [0, 1.36, 3.55] as const, look: [0, 1.2, -2.4] as const } },
    window: { eye: [-1.05, 1.36, -.05] as const, look: [-1.5, 1.3, -2.5] as const, fov: 46, yaw: 20, pitch: 9, dolly: .9,
              hot: [-2.2, .455, -1.98] as const, hotR: .15, portrait: { eye: [-1.35, 1.38, .25] as const } },
    chart:  { eye: [1.28, 1.62, -.3] as const, look: [1.98, .78, -1.6] as const, fov: 48, yaw: 18, pitch: 10, dolly: .45,
              hot: [1.84, .548, -1.0] as const, hotR: .13, portrait: { eye: [1.6, 1.75, -.1] as const } }
  },

  sky: { depth: 30, bgPad: 1.6 },

  palette: {
    wall: MAT.wall.b, wallHi: MAT.wall.l, wallLo: MAT.wall.d,
    wainscot: MAT.wall2.b, rail: MAT.frame.b, cornice: MAT.wall2.l,
    frame: MAT.frame.b, bolt: MAT.metal.b, sill: MAT.metalD.b,
    ceiling: '#33456c', beam: '#3b4e76',
    floor: '#4b3a48', floorSeam: '#2a1f2b',
    side: '#2f3f62',
    door: '#c98a5a', doorFrame: '#a8704f', handle: '#f0c27a', porthole: '#16213a',
    rug: '#6b4757', rugBorder: '#c99a6a',
    wood: MAT.wood.b, woodD: MAT.woodD.b, desk: '#a16a45',
    cushion: MAT.cushion.b, blanket: MAT.blanket.b, stripe: '#f6dcbf',
    pot: MAT.pot.b, soil: '#3b2a26', leaf: MAT.leaf.b, leafD: MAT.leafD.b,
    metalD: MAT.metalD.b, brass: MAT.brass.b, cream: MAT.cream.b, paper: MAT.paper.b,
    teal: MAT.teal.b, navy: MAT.navy.b, glassTint: '#9cc4c8',
    shadeOff: '#7fa0bb', shadeOn: '#f2c27f'
  },

  /* Lights. Intensities are three.js physical units (candela for point and
     spot lights); each array is indexed by G.lamp: 0 bright, 1 half, 2 off.
     One light casts shadows: the spot under the hanging lamp. */
  light: {
    hemiSky: '#5f7cb8', hemiGround: '#46364e', hemi: [.95, .78, .58],
    lamp: { color: '#ffe2bd', point: 7, spot: 34, distance: 11, decay: 1.7, angle: 1.05, penumbra: .85, shadowRadius: 6 },
    /* a warm pool on the desk from the same lamp, so the near plane reads as
       lit by it rather than by the room's fill */
    deskWarm: { color: '#ffcf96', intensity: 2.4, distance: 3.2, decay: 1.6 },
    chart: { color: '#ffc27a', intensity: 4.2, distance: 4.5, decay: 1.6 },
    lantern: { base: .5, pulse: 2, distance: 2.4, decay: 1.8 },
    bulbs: { per: .55, max: 4.5, distance: 6, decay: 1.5 },
    moon: { color: '#9fb8e6', intensity: [.22, .45, .75] }
  },

  glass: {
    fogRes: 1.5,        // fog canvas texels per design unit
    fogOpacity: .62,
    reflWarm: '#ffd6a0',
    recess: .1          // how far the glass sits back inside the wall
  },

  /* where things stand; x/z in metres, picked to echo the 2D composition */
  layout: {
    lampZ: -.85, lampRod: .6,
    bench: { x: -1.76, len: 1.7, depth: .55 },
    plant: { x: -.66, z: -1.95 },
    chartTable: { x: 1.72, z: -1.55, w: 1.2, d: .72, h: .82 },
    sideTable: { x: 2.5, z: -1.0 },
    rug: { z: -.75, rx: 2.0, rz: .8 },
    /* The desk you sit at. It used to run the whole width of the room right
       under the lens, and its props filled the bottom third of the picture;
       now it is a narrower top a little further off, so it reads as the near
       edge of the room the way the 2D desk did. */
    desk: { x0: -1.55, x1: 1.55, z0: 1.42, z1: 2.3, top: .74 },
    deskItemsZ: 1.66, itemScale: .8,
    items: { vase: -.86, cup: -.45, bread: .02, ticket: .44, lantern: .86 },
    door: { z: -1.72, w: .86, h: 2.0 },
    lap: { x0: -1.3, z: 1.85 },              // the blanket over your knees
    strap: { x: 1.15, z: 2.25, len: .52 },
    breaker: { x0: 2.62, x1: 3.12, y0: .93, y1: 1.86 },
    slip: { dx: 26, dy: 152, dw: 132 },      // design units, as hangSlip() takes them
    bulbZ: -2.02
  }
};

const M = C3.map;
export const wallX = (dx: number) => (dx - M.x0)/M.unit;
export const wallY = (dy: number) => (M.floorY - dy)/M.unit;
export const designX = (X: number) => X*M.unit + M.x0;
export const designY = (Y: number) => M.floorY - Y*M.unit;
export const U = (d: number) => d/M.unit;   // a design-unit length in metres
