import { MAT } from '../../core/materials';

/* ================= THE RADIO ROOM: EVERY TUNABLE NUMBER =================
   Metres unless marked. The wall carries what the 2D room hung on it -- the
   station table, the printer, the porthole, the work slip -- laid out from
   its design numbers through `map`. The radio and the music box stand on the
   counter at their own, smaller scale: each face that a hand works (the dial,
   the paper tape, the crank) is mapped to the design rect its ACT handler was
   written for, through faceMap() in ../engine.ts. */
export const RAD = {
  /* the back wall: design (x0, y0) is world (0, 0); 330 design units a metre */
  map: { unit: 330, x0: 800, y0: 809 },
  room: { halfW: 3.0, h: 2.6, back: -2.2, front: 6, wallT: .2 },

  counter: { top: .78, depth: .62, x0: -2.95, x1: 2.95, front: -1.56 },

  radio: { x: -.5, w: .78, h: .7, d: .38, arch: .12,
    /* faces, in metres on the radio's front, centred on the cabinet */
    dial: { y: .5, w: .6, h: .2 }, eye: { x: 0, y: .3, r: .045 },
    power: { x: -.22, y: .3, r: .048 }, tune: { x: .22, y: .3, r: .072 } },
  phones: { x: -1.08 },
  lamp: { x: -1.5, z: -1.8 },
  musicBox: { x: .98, w: 1.3, h: .3, d: .5,
    strip: { w: .76, h: .3, tilt: 38 },        // the paper tape on the slanted top, degrees from flat
    crank: { x: .5, y: .15, r: .1 } },          // on the right of the front face

  /* Places to be. */
  views: {
    room:  { eye: [0, 1.42, 2.0] as const, look: [0, 1.2, -2.2] as const, fov: 44, yaw: 14, pitch: 7, dolly: 1.3,
             portrait: { eye: [0, 1.48, 2.9] as const } },
    radio: { eye: [-.5, 1.3, -.42] as const, look: [-.5, 1.1, -1.9] as const, fov: 46, yaw: 22, pitch: 10, dolly: .4,
             hot: [-.5, .786, -1.42] as const, portrait: { eye: [-.5, 1.32, -.1] as const } },
    tape:  { eye: [.9, 1.5, -.25] as const, look: [.95, .86, -1.9] as const, fov: 46, yaw: 20, pitch: 10, dolly: .4,
             hot: [.98, .786, -1.42] as const, portrait: { eye: [.9, 1.6, .2] as const } }
  },

  palette: {
    wall: '#4a3446', stripe: '#553c50', starDot: '#c99aa8', wainscot: MAT.woodD.b, rail: MAT.wood.b,
    ceiling: '#2d2232', floor: '#4a3434', floorSeam: '#21181b', side: '#35283a',
    counter: MAT.woodD.b, counterTop: MAT.wood.b, radio: MAT.wood.b, radioD: MAT.woodD.b, grille: '#2a1810',
    dialLo: '#c9b48c', dialHi: '#f5c87a', cream: MAT.cream.b, ink: '#2a3550', mark: '#c46a52',
    brass: MAT.brass.b, metal: MAT.metal.b, metalD: MAT.metalD.b, paper: MAT.paper.b, navy: MAT.navy.b, rose: MAT.rose.b,
    teal: MAT.teal.b, tealD: MAT.tealD.b, rug: '#6b4757', amber: MAT.amber.b
  },

  light: {
    hemiSky: '#6a5a86', hemiGround: '#3a2a30', hemi: .62,
    /* the desk lamp: the one shadow in the room, aimed across the radio */
    lamp: { color: '#ffd9a8', spot: 26, point: 2.2, distance: 6, angle: .95, penumbra: .8, decay: 1.6 },
    dial: { color: '#ffc982', intensity: .9, distance: 1.6, decay: 1.8 },
    eye: { color: '#7fd0c4', intensity: .8, distance: 1, decay: 2 },
    moon: { color: '#8fa6d6', intensity: .35 },
    /* a small sconce on the wall over the music box, always on, so the tape
       can be read with the desk lamp off */
    sconce: { color: '#ffd2a0', intensity: 3.2, distance: 3, decay: 1.7, x: 1.0, y: 1.95 }
  },
  /* Where the printer, the station table and the slip hang, in design units. */
  wall: { printer: [62, 188, 232, 158] as const, table: [296, 126, 428, 206] as const, slip: { dx: 800, dy: 118, dw: 158 },
    porthole: { x: 1360, y: 200, r: 78 } }
};
