import { MAT } from '../../core/materials';

/* ================= THE GREENHOUSE: EVERY TUNABLE NUMBER =================
   Metres unless marked. The 2D room is three windows wide and laid out in
   design units along one x axis -- the nursery shelf at the left (-1000..60),
   the garden bench in the middle (150..1330), the workshop at the right
   (1370..2070) -- so the 3D house is one long glasshouse along x, and every
   position the logic addresses (POTS, GROW_BAR, BENCH_X, the drops, the slip)
   goes through `map`: 260 design units a metre, design x 740 (the middle of
   the garden) at world x 0, design y 780 (the floor under the bench) at world
   y 0. Depth (z) is free: the garden pots stand on one plane, the seedling
   shelf a little further back on another. */
export const GH3 = {
  map: { unit: 260, x0: 740, y0: 780 },

  /* the house: the back wall of low wall + glass runs along z = back; the
     roof rises from the back eave to the ridge and comes down past the
     camera, so no edge of it swings into frame */
  house: { x0: -7.1, x1: 5.35, back: -2.1, front: 5.2, wallTop: 1.08, eave: 2.85, ridge: 4.3, ridgeZ: 1.4, wallT: .22, bay: 160 /* design units between mullions */ },

  /* depth of each working plane */
  z: { garden: -1.62, nursery: -1.84, bench: -1.66 },

  /* the garden bench; its top is POT_Y. It runs a little past the 2D bench
     (150..1330) so the seed box and the can stand on its two ends, where the
     2D room had them at the bottom corners of the garden. Design x. */
  bench: { depth: .6, shelfY: .2, x0: 70, x1: 1362, seeds: 162, spray: 1296 },
  shelf: { depth: .44 },                        // the seedling shelf; its top is SHELF_Y
  work: { depth: .7 },                          // the workshop bench

  /* the plant cards: a canvas per pot painted with the 2D drawPlantP, over this
     design rect of the pot's own frame, at this many pixels per design unit */
  card: { rect: [-230, -425, 460, 375] as const, res: 1.5, mask: 10 /* design units per mask cell */, grow: 1/200 },

  views: {
    garden:  { eye: [0, 1.56, 2.35] as const, look: [0, 1.22, -2.1] as const, fov: 44, yaw: 16, pitch: 7, pitchUp: 11, pitchDown: 7, dolly: 1.3,
               portrait: { eye: [0, 1.62, 4.25] as const, look: [0, 1.25, -2.1] as const } },
    nursery: { eye: [-3.0, 1.62, .55] as const, look: [-4.3, 1.42, -1.95] as const, fov: 46, yaw: 20, pitch: 9, dolly: .5,
               hot: [-2.75, .01, -.55] as const, portrait: { eye: [-3.3, 1.7, .85] as const, look: [-4.15, 1.25, -1.95] as const } },
    bench:   { eye: [3.62, 1.98, 1.15] as const, look: [3.69, 1.08, -2.1] as const, fov: 44, yaw: 18, pitch: 9, dolly: .7,
               hot: [2.55, .01, -.6] as const, portrait: { eye: [3.62, 2.1, 2.4] as const, look: [3.69, 1.05, -2.1] as const } }
  },

  palette: {
    skyTop: '#06101a', skyMid: '#0f2430', skyLow: '#173643',
    mullion: '#4f7a80', mullionL: '#7fa6ad', glass: '#a9d4dc',
    lowWall: '#3f5c5a', lowCap: '#6e948c', floor: '#33463f', floorSeam: '#1c2828', duck: '#5c3927',
    wood: MAT.wood.b, woodD: MAT.woodD.b, cork: MAT.cork.b, metal: MAT.metal.b, metalD: MAT.metalD.b, brass: MAT.brass.b, copper: MAT.copper.b,
    cream: MAT.cream.b, paper: MAT.paper.b, potClay: MAT.pot.b, rose: MAT.rose.b, glassTint: MAT.glass.b,
    leaf: MAT.leaf.b, leafD: MAT.leafD.b, stem: '#3f6f62', soilWet: '#2a1c18', soilDry: '#5a4232', sack: '#a28a66', hose: '#4c6a64',
    barOn: '#ffd3e0', barOff: '#5a4a5a', moon: '#e8d2ad'
  },

  light: {
    hemiSky: '#6c93a8', hemiGround: '#2c3d3c', hemi: [.55, .8] as const,      // [lamp off, lamp on]
    moon: { color: '#9fb8e6', intensity: [.55, .35] as const },
    /* the grow lamps: the garden bar has the room's one shadow */
    grow: { color: '#ffd0e0', spot: 13, angle: 1.05, penumbra: .8, decay: 1.5, distance: 7, point: 1.6, pointDist: 4.2, nursery: 2.6 },
    /* the bench lamp, always burning */
    bench: { color: '#ffcf96', spot: 12, angle: .95, penumbra: .75, decay: 1.6, distance: 4, point: 1.3, pointDist: 3.4 },
    /* the small warm light that goes where the hand goes when the bars are off */
    hand: { color: '#ffbf7a', intensity: 1.7, distance: 1.6, decay: 1.6 },
    bloom: { color: '#ffd59a', per: .35, max: 1.6, distance: 1.8, decay: 1.8 }
  }
};

const MP = GH3.map;
export const gx = (dx: number) => (dx - MP.x0)/MP.unit;          // design x -> world x
export const gy = (dy: number) => (MP.y0 - dy)/MP.unit;          // design y -> world y
export const GU = (d: number) => d/MP.unit;                        // a design length in metres
