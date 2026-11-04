import { MAT } from '../../core/materials';

/* ================= THE OBSERVATION DOME: EVERY TUNABLE NUMBER =================
   Metres unless marked. The room is round: the dome's centre is the world
   origin on the floor, the glass is a hemisphere on a low rim wall, and you
   sit at the back end of a long cushioned bench that points at the glass.

   The sky is the room. STARS (rooms/dome.ts) live in design units on a strip
   SKY_W = 4800 wide and y 46..686 tall; here that strip is wrapped round the
   whole horizon -- x is azimuth, 4800 units to 360 degrees, design x 800 dead
   ahead of the bench -- and y is elevation, linear from `elBot` at design y 686
   to `elTop` at design y 46. Drawing and picking both go through the same two
   functions in ../rooms/dome-sky.ts, so a star is drawn exactly where a tap on
   it lands.

   Why it reaches 78 degrees: lying down you look straight up, so the strip
   has to reach well overhead. A conformal (Mercator) strip would stop at
   about 47 degrees and leave the zenith empty. So elevation is a gentle
   quadratic in the strip's height: about conformal at the horizon (`elRate0`
   degrees per 640 units there, the same 0.075 deg/unit as across), opening
   up overhead. That also keeps the stars about evenly dense from the rim to
   the top. The price is that the strip gets taller than it is wide as it
   rises, so the 26-unit pick radius is an upright ellipse: about 2.6 x 1.8
   degrees at 20 degrees up, 3.4 x 1.3 at 48, 3.9 x .75 at 68 -- from the
   bench at 1280x720 that is about 34 x 24 px where you look most. */
export const DOME = {
  room: {
    r: 3.6,           // the dome's radius, and the rim wall's
    rimH: .85,        // the rim wall's height; the glass starts here
    ribs: 12,         // meridian ribs
    ribR: .05,
    ringEl: 36,       // the ring rib, degrees above the rim
    apexEl: 84        // where the ribs meet the oculus ring at the top
  },

  sky: {
    R: 80,            // the sky's radius. It follows the eye, so it reads as infinitely far.
    elBot: 3, elTop: 78, elRate0: 48, yBot: 686, yTop: 46,
    /* star line ribbons, in degrees of arc: a soft wide stroke and a chalk core,
       as the 2D strokes of 6 and 2 (1.6 dashed) design units */
    line: { glow: .42, core: .13, coreDash: .1 },
    dash: [.36, .58] as const,        // the 2D dash [5, 8], in degrees along the line
    preview: { w: .11, dash: [.22, .44] as const, alpha: .45 },
    degPerUnit: .07,                  // for sizes the 2D gave in design units (rings, dashes)
    label: { size: 20, dy: 34 },      // design units, as the 2D txt()
    meteor: { len: 80, w: .2 }        // design units along, degrees across
  },

  /* the long bench you sit at the back of and lie down on */
  bench: { w: 1.3, z0: -1.1, z1: 1.95, seat: .46 },
  lamp: { x: -1.22, z: -.5, h: .78, shadeR: .14 },
  table: { x: 1.55, z: -1.45, w: 1.1, d: .62, h: .8, rot: -.6 },

  views: {
    /* seated at the back of the bench: the rim low in the frame, the sky over
       it, the lamp left and the chart table right; look up a long way */
    sit: { eye: [0, 1.18, 1.9] as const, look: [0, 1.78, -3.4] as const, fov: 56, yaw: 30, pitch: 8, pitchUp: 35, pitchDown: 9, dolly: .5,
           portrait: { eye: [0, 1.3, 3.3] as const, look: [-.5, 1.65, -3.4] as const } },
    /* lying on it: straight up, and the head turns a long way round */
    lie: { eye: [0, .74, 1.28] as const, look: [0, 3.5, .06] as const, fov: 60, yaw: 75, pitch: 10, pitchUp: 22, pitchDown: 30, dolly: .25 }
  },

  palette: {
    floor: '#1a2338', floorEdge: '#0c111e', seam: '#2a3858',
    rim: '#26354f', rimCap: MAT.frame.b, rib: '#34466c', ribHi: '#4a5f86',
    woodD: MAT.woodD.b, wood: MAT.wood.b, cushion: MAT.cushion.b, cushionD: MAT.cushion.d, blanket: MAT.blanket.b, stripe: '#f6dcbf',
    metalD: MAT.metalD.b, brass: MAT.brass.b, paper: MAT.paper.b,
    shadeOn: MAT.amber.b, shadeOff: MAT.tealD.b, chartInk: '#33466e',
    /* the sky: horizon, middle, zenith (the 2D gradient), and the hull below the rim */
    skyLo: '#16223f', skyMid: '#0a1226', skyHi: '#03060d', hull: '#05080f',
    line: '#ffd9a3', pick: '#ffe2b6'
  },

  light: {
    hemiSky: '#3a4a78', hemiGround: '#1c1828', hemi: { on: .5, off: .2 },
    /* starlight from straight up: the cool top edge on the ribs and the bench */
    star: { color: '#8fa6d6', on: .2, off: .32 },
    /* the small lamp: a warm point for the room, a spot down from the shade for the one shadow */
    lamp: { color: '#ffcf96', point: 4, distance: 6, decay: 1.5, spot: 14, angle: 1.15, penumbra: .9, spotDist: 4.5 },
    /* the glass: a cool sheen at grazing angles, the lamp's mirror image and its glow when on */
    glass: { cool: '#6f89b0', base: .05, warm: '#ffc98e', spec: .5, halo: .2, broad: .022 }
  }
};
