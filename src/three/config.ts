import { MAT } from '../core/materials';

/* ================= THREE.JS CABIN: EVERY TUNABLE NUMBER =================
   Units are metres unless a line says otherwise. "Design units" are the
   1600x900 space the Canvas2D rooms are drawn in.

   The rest of the game still addresses the cabin in design units -- WIN, the
   bulb slots, the beacons, the strokes on the glass -- so the back wall is laid
   out from those numbers through `map`, and everything that touches game state
   goes through wallX/wallY and their inverses below. Change `map.unit` and the
   windows, the bulbs and the beacons all move together. */
export const C3 = {
  /* design units -> metres on the back wall: x = (dx - x0)/unit, y = (floorY - dy)/unit */
  map: { unit: 250, x0: 800, floorY: 700 },

  /* The room box. The front is open past the camera, like a stage set, so the
     side walls, floor and ceiling run on behind the lens and no edge of the box
     can swing into frame. */
  room: { halfW: 3.25, h: 2.64, back: -2.4, wallT: .24, front: 6.5 },

  camera: {
    eye: [0, 1.27, 3.5] as const,   // seated at the desk
    look: [0, 1.3, -2.4] as const,
    fov: 41,             // vertical, degrees, at 16:9 and wider
    minHFov: 42,         // narrower screens widen the vertical FOV to keep at least this much across
    maxFov: 62,          // ...up to here, so a phone held upright still sees the lamp and the desk
    near: .05, far: 160,
    /* CAM.panX/panY are the drag, in design units (core/camera.ts). They turn
       into a yaw/pitch plus a small sideways step, so a drag reads as turning
       your head inside the room rather than sliding a picture. */
    yawPerUnit: .034, yawMax: 13,      // degrees
    pitchPerUnit: .03, pitchMax: 6,    // degrees
    truckPerUnit: .0011,               // metres of sideways step per design unit
    /* CAM.user (wheel/pinch, 1..1.9) and CAM.zoom (the game's dolly) */
    dolly: 1.45,                       // metres forward at full zoom
    zoomFov: .14,                      // and this much narrower
    parallax: .05,                     // metres of pointer parallax (halved under reduced motion)
    lift: .0035,                       // metres per design unit of CAM.lift (the ship's bob)
    roll: 1                            // CAM.rot is applied as camera roll, scaled by this
  },

  /* The sky is a backdrop this far behind the glass. It is laid out so that
     from the resting eye a beacon sits where the 2D cabin drew it. */
  sky: { depth: 30, bgPad: 1.6 },

  render: { exposure: 1.06, shadowMap: 1024, antialias: true },

  /* Toon ramp over N.L*0.5+0.5 for direct light: dark, a terminator band, lit.
     The dark band must be 0 or a light wraps round to the far side of every
     object; the hemisphere light, which bypasses the ramp, is the fill.
     `soft` is the width of each step. */
  ramp: { levels: [0, .58, 1], edges: [.46, .63], soft: .05 },
  rim: { color: '#6f89b0', k: .2 },   // props only; the room shell gets none

  palette: {
    wall: MAT.wall.b, wallHi: MAT.wall.l, wallLo: MAT.wall.d,
    wainscot: MAT.wall2.b, rail: MAT.frame.b, cornice: MAT.wall2.l,
    frame: MAT.frame.b, bolt: MAT.metal.b, sill: MAT.metalD.b,
    ceiling: '#33456c', beam: '#3b4e76',
    floor: '#4b3a48', floorSeam: '#2a1f2b',
    side: '#2f3f62',
    door: '#c98a5a', doorFrame: '#a8704f', handle: '#f0c27a', porthole: '#16213a',
    rug: '#6b4757', rugBorder: '#c99a6a',
    wood: MAT.wood.b, woodD: MAT.woodD.b,
    cushion: MAT.cushion.b, blanket: MAT.blanket.b, stripe: '#f6dcbf',
    pot: MAT.pot.b, soil: '#3b2a26', leaf: MAT.leaf.b, leafD: MAT.leafD.b,
    metalD: MAT.metalD.b, brass: MAT.brass.b, cream: MAT.cream.b, paper: MAT.paper.b,
    teal: MAT.teal.b, navy: MAT.navy.b, glassTint: '#9cc4c8',
    shadeOff: '#7fa0bb', shadeOn: '#f2c27f'
  },

  /* Lights. Intensities are three.js physical units (candela for point and
     spot lights); each array is indexed by G.lamp: 0 bright, 1 half, 2 off. */
  light: {
    hemiSky: '#5f7cb8', hemiGround: '#46364e', hemi: [1.05, .85, .62],
    /* near-white, so it shows the room's own colours the way the 2D light map
       did; the warmth comes from the halo sprites laid over it */
    lamp: { color: '#ffe6c4', point: 9, spot: 30, distance: 11, decay: 1.7, angle: 1.1, penumbra: .9, shadowRadius: 6 },
    chart: { color: '#ffc27a', intensity: 4.2, distance: 4.5, decay: 1.6 },
    lantern: { base: .55, pulse: 2, distance: 3, decay: 1.8 },
    bulbs: { per: .55, max: 4.5, distance: 6, decay: 1.5 },
    moon: { color: '#9fb8e6', intensity: [.18, .4, .7] }
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
    desk: { x0: -2.4, x1: 2.4, z0: 1.55, z1: 2.6, top: .78 },
    deskItemsZ: 1.88,
    items: { vase: -.95, cup: -.5, bread: -.04, ticket: .42, lantern: .9 },
    door: { z: -1.72, w: .86, h: 2.0 },
    lap: { x0: -1.42, z: 2.0 },              // the blanket over your knees
    strap: { x: 1.15, z: 2.35, len: .52 },
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
