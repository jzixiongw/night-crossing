import { MAT } from '../../core/materials';

/* ================= THE GALLEY: EVERY TUNABLE NUMBER =================
   Metres unless marked. The back wall and the counter are laid out from the
   2D room's design numbers through `map`: design y 548 is the worktop
   surface, so S.kp -- the kettle's base, which rooms/galley.ts animates
   between KPOS.sink, .stove and .pour -- maps straight onto it, and the 2D
   rects (the jar shelf, the proof box, the oven door, the board) mean the
   same thing here. Sizes of the small things (kettle, jars, cup, loaves) are
   their own, in metres: the 2D painting drew them about a third too big. */
export const GAL = {
  /* design (x0, y0) is world (0, 0): y0 is the floor line of the 2D room */
  map: { unit: 340, x0: 780, y0: 866 },
  room: { halfW: 2.75, h: 2.5, back: -1.8, front: 6, wallT: .2 },

  /* the counter, design units across, metres deep */
  counter: { x0: 40, x1: 1320, body0: 60, body1: 1300, top: 548, slab: .045, depth: .64, lip: .03,
    strip: 640,                                   // design y where the knob strip ends and the doors begin
    toe: .07,                                     // toe-kick height
    doors: [[80, 130], [222, 118], [352, 118], [730, 150], [900, 190], [1110, 170]] as const,
    doorY: [616, 836] as const, pullY: 632 },
  itemZ: .33,                                     // the line things stand on, from the back wall

  sink: { x0: 236, x1: 376, z0: .1, z1: .5, depth: .17 },
  tap: { x: 300, height: .34, reach: .22, lever: { y: .26 } },
  stove: { x0: 470, x1: 660, burner: 566, r: .085, z0: .07, z1: .58 },
  knobs: { y: 610, burner: 520, oven: 700, r: .04 },
  oven: { x0: 480, x1: 730, y0: 640, y1: 836, win: [506, 662, 198, 104] as const, handleY: 786, depth: .5 },
  board: { x0: 890, x1: 1120, h: .028, d: .34 },
  flour: { x: 1206, w: .26, h: .26 },
  rack: { x0: 66, x1: 196, h: .13 },
  /* the kettle: metres, its base on the worktop at S.kp */
  kettle: { r: .1, h: .15, spout: [.175, .16] as const, handle: .11, scale: 1 },
  cup: { x: 0, scale: .95 },                      // x is set from the kettle's pouring pose at build time
  shelf: { x0: 112, x1: 492, y: 400, d: .2, jarW: .15, jarH: .22 },
  rail: { x0: 196, x1: 526, y: 166, len: .36 },
  proof: { x: 960, y: 284, w: 160, h: 116, depth: .22, win: [974, 298, 132, 88] as const },
  porthole: { x: 1000, y: 190, r: 92 },
  window: { x: 1340, y: 150, w: 180, h: 330 },
  table: { x: 1443, z: -1.33, r: .27, top: 616 },
  lamp: { x: 760, z: -1.0, cordTop: 40, shadeY: 190 },
  herbs: { x: 1490, z: -.35 },
  rug: { x: 320, z: -.72, rx: .7, rz: .32 },

  views: {
    room:  { eye: [.15, 1.8, 2.05] as const, look: [.15, 1.1, -1.8] as const, fov: 44, yaw: 15, pitch: 7, dolly: 1.2,
             portrait: { eye: [.1, 1.66, 3.1] as const, look: [.1, 1.2, -1.8] as const } },
    stove: { eye: [-.78, 1.66, .85] as const, look: [-.78, .8, -1.8] as const, fov: 44, yaw: 18, pitch: 8, dolly: .45,
             hot: [-1.085, .56, -1.128] as const, hotN: [0, 0, 1] as const, hotR: .1, portrait: { eye: [-.62, 1.76, 1.35] as const, look: [-.62, .86, -1.8] as const } },
    board: { eye: [.48, 1.68, .8] as const, look: [.48, .85, -1.8] as const, fov: 44, yaw: 18, pitch: 8, dolly: .4,
             hot: [.632, .56, -1.128] as const, hotN: [0, 0, 1] as const, hotR: .1, portrait: { eye: [.38, 1.76, 1.3] as const, look: [.38, .9, -1.8] as const } }
  },

  palette: {
    grout: '#2c3956', tile: '#3a4a6c', tileHi: '#4d6087', tileAlt: '#3d5078',
    wall2: MAT.wall2.b, side: '#2b3756', ceiling: '#232b46', beam: '#2f3a5a',
    floor: '#3e4d66', floorSeam: '#222b3f',
    cabinet: '#4f6e93', cabinetDoor: '#5878a0', worktop: '#cbbfa8', sinkIn: '#26344e', grate: MAT.metal.b,
    metal: MAT.metal.b, metalD: MAT.metalD.b, brass: MAT.brass.b, copper: MAT.copper.b, frame: MAT.frame.b,
    cream: MAT.cream.b, paper: MAT.paper.b, rose: MAT.rose.b, wood: MAT.wood.b, woodD: MAT.woodD.b,
    teal: MAT.teal.b, tealD: MAT.tealD.b, glass: MAT.glass.b, leaf: MAT.leaf.b, leafD: MAT.leafD.b,
    rug: '#5e3e36', rugBorder: '#8a6050', board: '#9a6844',
    dough: '#f1dfb9', crust: '#d98e48', score: '#f5d39a', pear: '#cfe091', pearCut: '#f5f0d8',
    ovenIn: '#1c120c', proofIn: '#5a3420', water: '#a9d6e6', sky0: '#081024', sky1: '#1b2c4e', fog: '#d9e6ee'
  },

  light: {
    hemiSky: '#5f74ad', hemiGround: '#3a3f55', hemi: .78,
    /* the hanging copper lamp: the one shadow in the room */
    lamp: { color: '#ffd9a8', spot: 22, point: 3.2, distance: 7, angle: 1.12, penumbra: .85, decay: 1.6, shadowRadius: 5 },
    flame: { color: '#6f9cf0', intensity: 1.3, distance: 1.6, decay: 1.8 },
    oven: { color: '#ffa04a', intensity: 2.4, distance: 1.6, decay: 1.8 },
    proof: { color: '#ffb070', intensity: .5, distance: 1.0, decay: 1.8 },
    window: { color: '#8fb0e6', intensity: 1.1, distance: 3.2, decay: 1.6 },
    moon: { color: '#8fa6d6', intensity: .3 }
  }
};
