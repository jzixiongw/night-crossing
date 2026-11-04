import { MAT } from '../../core/materials';

/* ================= THE GANGWAY (hatch): EVERY TUNABLE NUMBER =================
   Metres unless marked. The back wall is the 2D hull laid out through `map`:
   the door is DOOR, the stand is STAND, the sign, the bollard, the porthole
   and the slip hang at their design numbers. What is on the far side of the
   door -- the port and the one waiting in it -- is set out from the outer
   face of the hull, in metres, because the 2D room only ever showed it as a
   picture clipped to the opening. */
export const HAT = {
  /* the back wall: design (x0, y0) is world (0, 0); `unit` design units a metre */
  map: { unit: 230, x0: 800, y0: 700 },
  room: { halfW: 4.1, h: 2.95, back: -2.2, front: 6, wallT: .32 },

  /* the collar round the door: a band `band` design units wide, its corner
     radius, how far it stands off the hull, and the bolts in it */
  collar: { band: 54, r: 56, depth: .09, bolts: 22, boltR: .024 },
  /* the two leaves ride inside the hull plating, this far behind its face */
  leaf: { t: .07, z: -.13, handle: { x: 831, y: 452 } },
  sill: { h: .05, d: .26 },

  /* design units, as the 2D room placed them */
  lamp: { x: 800, y: 108 },
  lamps: { x: [752, 800, 848], y: 167, r: 10, box: [718, 150, 164, 34] as const },
  sign: [1060, 300, 190, 72] as const,
  bollard: { x: 1429, y0: 282, y1: 450, r: 11, cap: 27, coils: 5 },
  porthole: { x: 1600, y: 330, r: 76 },
  slip: { dx: 280, dy: 186, dw: 158, rot: .014 },

  /* the stand by the door; x in design units, z metres out from the wall */
  stand: { z: 1.05, h: .8, w: .5, d: .34 },

  /* the far side, measured outward from the outer face of the hull */
  port: {
    sky: { z: 7.5, w: 18, h: 13.5, y: 1.9, horizon: -.35 },
    visZ: 1.05,           // where the visitor stands, past the hull
    visScale: 1.2,        // the 2D creature, a little larger than its design units
    bob: 4                // design units of rise and fall, as the 2D room bobbed it
  },

  views: {
    bay:      { eye: [0, 1.55, 2.55] as const, look: [0, 1.1, -2.2] as const, fov: 44, yaw: 22, pitch: 8, dolly: 1.4,
                portrait: { eye: [-.35, 1.6, 3.9] as const, look: [-.35, 1.1, -2.2] as const } },
    handover: { eye: [0, 1.62, -.25] as const, look: [0, .78, -4.4] as const, fov: 48, yaw: 16, pitch: 9, dolly: .5,
                hot: [0, .012, -1.45] as const, portrait: { eye: [0, 1.66, .35] as const } }
  },

  palette: {
    wallTop: '#36486e', wallMid: '#405581', wallBot: '#2a3a5c',
    side: '#2c3b5c', ceiling: '#151e34', beam: '#24314f',
    floor: '#2b3752', floorMid: '#3a4868', floorNear: '#1c2538', floorSeam: '#141b2c', worn: '#1b2742', sill: '#c8a45e',
    metal: MAT.metal.b, metalD: MAT.metalD.b, metalDD: '#2a3a56', brass: MAT.brass.b, copper: MAT.copper.b,
    wood: MAT.wood.b, woodD: MAT.woodD.b, paper: MAT.paper.b, ink: '#2a3550', inkSoft: '#7d7a72',
    dogs: '#2c3f5e', lampOff: '#3c4a63', lampAmber: '#ffd9a3', lampRose: '#c47b7b', lampGreen: '#7fb0a0',
    navy: MAT.navy.b, frame: MAT.frame.b, teal: MAT.teal.b, tealD: MAT.tealD.b, glass: MAT.glass.b,
    /* the far side, per port, from portBack() */
    sky: { dock: ['#131d33', '#2b3450'], echo: ['#1a1430', '#33264c'], bell: ['#07202b', '#154050'], ship: ['#06090f', '#101728'] } as Record<string, [string, string]>
  },

  light: {
    hemiSky: '#5a70a6', hemiGround: '#1a2236', hemi: .62,
    /* the lamp over the door: the room's one shadow, aimed down at the sill */
    lamp: { color: '#ffd6a2', spot: 22, point: 2.4, distance: 7, angle: .78, penumbra: .75, decay: 1.6 },
    /* a dim pool over the stand and the slip, as the 2D light pass left one */
    fill: { color: '#c9b8a6', intensity: 1.5, distance: 3.6, decay: 1.6 },
    /* the port, spilling in through the open door (x doorK) */
    spill: { intensity: 22, distance: 9, angle: .5, penumbra: .9, decay: 1.4 },
    portAmb: { intensity: 2.4, distance: 5.5, decay: 1.4 },
    /* the lamp the visitor holds up, once it has changed hands (x holdK) */
    hold: { intensity: 2.6, distance: 4.5, decay: 1.6 }
  }
};
