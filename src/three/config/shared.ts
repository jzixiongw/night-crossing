/* ================= THREE.JS: WHAT EVERY ROOM SHARES =================
   Each room has its own file beside this one (cabin.ts, radio.ts, ...) with
   its layout, palette, lights, viewpoints and interaction numbers. This file
   holds what is the same everywhere: the renderer, the toon ramps, the camera
   feel and the viewpoint markers.

   Units: metres in the world, degrees for angles, seconds for time. "Design
   units" are the 1600x900 space the game's logic was written in; every room
   maps between the two through a DesignMap (see ../engine.ts) and nothing
   else, so an ACT handler never sees a metre. */
export const SHARED = {
  render: { exposure: 1.06, antialias: true, shadowMap: 1024, maxPixelRatio: 1.5, clear: '#070c17' },

  /* Toon ramps over N.L*0.5+0.5 for direct light: dark, a terminator band,
     lit. The dark band must stay 0 or a light wraps round to the far side of
     every object; the hemisphere light, which bypasses the ramp, is the fill.
     Three ramps are what keep materials from all reading the same:
       soft  -- cloth, cushions, paper, plants: a wide, gentle terminator
       std   -- wood, painted walls, most props
       crisp -- metal, glazed ceramic, glass: a narrow terminator, a hard edge */
  ramps: {
    soft:  { levels: [0, .62, 1], edges: [.40, .66], soft: .09 },
    std:   { levels: [0, .58, 1], edges: [.46, .63], soft: .05 },
    crisp: { levels: [0, .5, 1],  edges: [.50, .60], soft: .02 }
  },
  rim: { color: '#6f89b0', k: .2 },
  /* A painted highlight: a soft blob where a key light from the upper left of
     the frame would catch the surface, like the `hl` option of the 2D vol().
     It is in view space on purpose -- the 2D rooms always lit from the top
     left of the picture -- and it scales with how lit the surface already is,
     so it disappears in the dark instead of glowing. */
  highlight: { dir: [-.42, .62, .66] as const, color: '#fff3df' },

  camera: {
    near: .05, far: 200,
    fov: 42,              // vertical, degrees, at 16:9 and wider (a view may override)
    minHFov: 44,          // narrower screens widen the vertical FOV to keep this much across
    maxFov: 66,           // ...up to here
    /* The drag is in design units (core/camera.ts); these turn it into a head
       turn. 1600 units (one screen) is about 54 degrees, which is close to the
       horizontal field of view, so the room follows the finger. */
    yawPerUnit: .034, pitchPerUnit: .03,
    truckPerUnit: .0009,  // metres of sideways step per design unit of pan
    parallax: .045,       // metres of pointer parallax (halved under reduced motion)
    lift: .0035,          // metres per design unit of CAM.lift (the ship's bob)
    roll: 1,              // CAM.rot is applied as camera roll, scaled by this
    /* How much further a head turn may go when the screen is narrower than
       16:9, as a share of the field of view it lost, so a phone held upright
       can still turn far enough to see what a laptop sees at its edges. */
    portraitYaw: .85
  },

  /* Moving between viewpoints. A short move flies; a long one, or any move
     under reduced motion, fades through black instead. */
  move: { speed: 1.7, minDur: .55, maxDur: 1.25, fadeOver: 2.4, fadeMs: 430 },

  /* Reading a notice up close: the lens, how much margin round it (1 = edge
     to edge), how near or far the camera may come, and how much head turn and
     lean are left while reading. `lift` moves the notice up the picture, as
     a share of its half-height, so a caption along the bottom does not cover
     its last lines. */
  inspect: { fov: 40, pad: 1.45, min: .32, max: 2.2, yaw: 9, pitch: 6, dolly: .35, lift: .22 },

  /* The marker a viewpoint leaves where you would stand or lean to use it. */
  marker: { color: '#ffd9a3', r: .13, opacity: .5, hover: .95, pulse: .18 }
};
