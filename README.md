# 夜航 · Night Crossing

An atmospheric web game: a ring-shaped night ship with six rooms and the ring
corridor between them. Every room is built at runtime -- no models, no sprite
sheets, no texture atlases. The ship is drawn in 3D with three.js
([The 3D ship](#the-3d-ship)); underneath it, the original painted Canvas2D
rooms still hold all of the game's logic, and still draw the ship when WebGL
is missing or `?render=2d` asks for them.

## Running it

```sh
npm install
npm run dev        # http://localhost:8000
npm run build      # typecheck, then build to dist/
npm run preview    # serve the built dist/
npm run typecheck  # tsc --noEmit on its own
```

`dist/` is a static bundle: serve it from any static host.

## How the rendering works

This section is about the painted Canvas2D rooms, which are still where every
room's logic lives and what `?render=2d` shows; the 3D renderer is described
in [The 3D ship](#the-3d-ship). Three ideas carry the whole look. They are worth knowing before changing anything.

**Depth layers.** Design space is a fixed 1600×900 window onto a room that is
wider than it. Every draw call names a depth
`k`: `k < 1` sits behind the play plane, `k > 1` in front. `mat(k)` in
[core/camera.ts](src/core/camera.ts) turns that depth into an affine matrix, scaling
pointer parallax, zoom and roll by `k`. That per-layer camera is what reads as
2.5D space. The shared depths live in [core/depth.ts](src/core/depth.ts).

**Painterly volumes.** `vol()` in [core/paint.ts](src/core/paint.ts) fakes volume by
stacking offset fills of the same path — light face, body, shadow, rim — then
finishing with a `soft-light` texture pass. There are no contour lines anywhere
in the game. Around 250 call sites depend on this, and on Canvas2D blend modes
that WebGL does not have natively.

The texture pass is what keeps the look from reading as flat vector art with a
sheet of grain laid over it. There are three brush tiles, not one: `vol()` picks
between them by the object's own core-shadow offset, so a kettle is not grained
at the same frequency as a hull plate, and it rotates and offsets the pattern
per draw call from a hash of that call's own numbers, so two objects side by
side never line their grain up. The whole-frame pass in
[core/shell.ts](src/core/shell.ts) is deliberately faint; the texture you see is
the one each object paints for itself.

**Light as a compositing pass.** A room paints onto its own buffer, then
[core/light.ts](src/core/light.ts) lays a dark wash over it and punches soft holes
at each light source with `destination-out`, re-applied with `source-atop`. Lamps
carve warm pools out of a cold room. Additive glows go on afterwards.

The pipeline that runs these in order is [core/render.ts](src/core/render.ts).

## Layout

```
src/
  main.ts            entry: styles, side-effect modules, boot
  boot.ts            load save, pick the room, start the loop
  core/
    surface.ts       canvas buffers, resolution, resize hooks
    camera.ts        CAM + mat(): depth -> transform
    depth.ts         shared layer depths
    paint.ts         vol/flat/duo/sphere/txt and the brush sprites
    pen.ts           handwritten marks: the ring, the tick, the arrow
    materials.ts     named material palettes
    shell.ts         the 2.5D room box
    light.ts         darkness wash + light holes
    cache.ts         static art cached per room, rebuilt on resize
    post.ts          vignette + grain
    fx.ts            flares and puffs shared by rooms
    hits.ts          hit regions, focus ring (canvas has no DOM targets)
    input.ts         pointer, drag, keyboard, wheel dispatch
    render.ts        the frame pipeline
    loop.ts          rAF loop, adaptive resolution, autosave
    presence.ts      focus/visibility handling
  rooms/
    registry.ts      ROOMS + ACT contracts, go(), HUD, the RING lattice
    corridor.ts      the ring, nine stations, big window
    hatch.ts         the gangway: the round, docking, the handover
    cabin.ts  galley.ts  green.ts  radio.ts  dome.ts
  characters/
    an.ts              cups, bread, pears -- props, not people
    visitor.ts         whoever is waiting at the gangway door
  data/
    index.ts         lanes, beacons, tea, seeds, stations, letters
    ports.ts         the four places the round calls at
  state/
    store.ts         the save shape (G) + migration
    save.ts          localStorage + optional cloud save
    time.ts          in-world clock
    runtime.ts       session-only state (S, PR)
    progress.ts      time passage while you are away
  ui/                captions, panels, mail, log, ticket, settings, away
    worksheet.ts     which step of the job you are on, and how far into it
    sheet.ts         that, painted as a slip of paper on the wall
    slots.ts         the three saves on the door screen
  i18n/              tr(), the language choice, and the English table
  audio/             Web Audio graph + the music director
  platform/          host.d.ts: the optional `window.claude` runtime
  three/             the 3D ship: engine, viewpoints, kit, one module per room
    engine.ts        renderer, room lifecycle, picking, hit regions, FX
    view.ts          viewpoints: head turn, lean, moving between places
    kit.ts           toon materials, grain, glow, small geometry, disposal
    props.ts         the work slip, portholes, the lamp piece (rig)
    config/          every tunable number, one file per room + shared.ts
    rooms/           one module per room; each registers over the painted room
public/fonts/        198 woff2 subsets + fonts.css
```

## Language

The game ships in English and Chinese. English is the default; `?lang=zh`, or the
toggle on the door screen and in settings, switches and reloads.

**Keys are the original Chinese strings.** `tr('灯熄了。')` looks the line up in
[i18n/en.ts](src/i18n/en.ts) and falls through to its own key when there is no
entry — so an untranslated string renders *as Chinese on screen*, which makes a
gap visible instead of silent. Interpolation is positional:

```ts
tr('面团鼓起来一些了。大概还要 {0} 分钟。', left)
```

That key scheme is also why `index.html` needs no markup changes: it is authored
in Chinese, so [i18n/index.ts](src/i18n/index.ts) localises the whole document in
one `TreeWalker` pass at boot. That pass runs as a side effect of importing the
module, not from a call in `main.ts` — ES imports are hoisted, so a call in main's
body would land after `ui/settings` and `boot` had already written their labels.

Switching language reloads rather than re-rendering. Rooms cache painted text into
layer buffers and a dozen DOM nodes are written once at boot; a reload is one line
instead of an invalidation path through all of them, and the voyage is persisted
continuously, so nothing is lost.

Two things the display face forces, both in [i18n/en.ts](src/i18n/en.ts)'s header:
ZCOOL XiaoWei maps `U+2019` and `U+201C/D` to full-width CJK glyphs (41px against
8.2px for the straight forms), so English copy uses straight quotes; and its
capital `I` has no serifs, so the door-screen title is set in title case.

`txtFit()` in [core/paint.ts](src/core/paint.ts) exists for the same reason: painted
labels sit in boxes sized for two to four Chinese glyphs, and the English for the
same thing is usually several words, so it shrinks to a floor and then wraps once
at a space.

## Aspect

Design space is 1600×900, but the canvas is not locked to 16:9. `resize()` in
[core/surface.ts](src/core/surface.ts) takes the stage's real shape and scales the
design space to **cover** it, exposing the crop offset as `VX/VY`; `mat()` adds that
offset, which is why every room, hit region and pointer mapping follows without
changes of its own. At exactly 16:9 the cover fit is the old fit and both offsets
are zero.

A portrait viewport therefore shows a tall centred slice of the real scene rather
than a letterboxed strip. `setViewFocus()` centres that slice on the room's `zc` —
the zoom centre each room already declares — so the crop keeps the composition, and
it is clamped so the view never runs past the painted design space.

### Two registries

Rooms and actions self-register, so nothing imports a room directly:

```ts
ROOMS.cabin = { back, room, light, over, update, enter, exit, zoom, zc };
ACT['cab:lamp'] = { tap(args, e, p, hit) { ... } };
```

Action ids are colon-paths; `resolveAct` walks them longest-first, so
`cab:lamp:pull` falls back to `cab:lamp`. Both contracts are typed in
[rooms/registry.ts](src/rooms/registry.ts).

## The free camera

The window is 1600×900; the rooms are about 2200 wide and are painted out to the
corners, so dragging anywhere empty swings the view across the room, dragging up
and down tilts it, and the wheel or a pinch pushes in to 1.9x. `CAM.panX/panY`
and `CAM.user` in [core/camera.ts](src/core/camera.ts) are the player's half of
the camera and ease toward their own targets; `zoom`, `rot` and `lift` stay the
game's. Both end up in one matrix, so hit regions, lighting and the pointer need
to know nothing about it.

Two numbers hold the whole thing together. `panLimit()` says how far the view
may swing, and `PAD_X`/`PAD_Y` in [core/cache.ts](src/core/cache.ts) size the
layer caches for the worst case of that limit, so no drag can pull a cached
layer's painted edge into frame. The pan is *damped* by depth rather than
multiplied by it (`panK` in camera.ts): true parallax would swing the near plane
half again as far as the wall and run its edge into view.

Changing either number means re-checking the other, and re-checking that each
room's `*_SHELL.b` box is still wider than what the view can reach.

A room may ask for more than the default swing. `ROOMS.x.pan` is
`[x, y, maxX]`, and `go()` hands it to `setPanRange()`; the greenhouse takes 900
with a cap of 1040, which makes it about three windows wide. Past roughly 400 a
room can no longer use `layerCache` -- one canvas that wide is more than a phone
will allocate -- so it calls `cacheGet` itself for a strip of tiles and blits
only the ones on screen. [rooms/green.ts](src/rooms/green.ts) has that in
`wideLayer()`, which is about ten lines.

## The 3D ship

`main.ts` loads [three/index.ts](src/three/index.ts) as its own chunk unless
WebGL is missing or the URL says `?render=2d`. Until it arrives (and for good
in those two cases) the painted rooms draw the ship. Each module in
`src/three/rooms/` registers itself over the painted room of the same name, so
a room that fails to load stays painted rather than taking the others with it;
`?rooms=cabin,radio` loads only the rooms named, which is handy when working
on one.

Only how a room is **drawn** and how a pointer **finds** things changes. Every
room's `update/enter/exit` and every `ACT[...]` handler still run from
`src/rooms/<room>.ts`, through the same loop, with the same save; the loop
calls `update(dt)` once per frame and the 3D room's `sync(dt)` only reads that
state (anything the painted rooms advanced while drawing -- particles,
meteors -- the 3D room advances instead, never both).

| Seam | Where | What the 3D rooms do with it |
|---|---|---|
| `register3D()` | [three/engine.ts](src/three/engine.ts) | wraps `ROOMS[id]`: builds the room's scene on enter, disposes all of it on exit (geometry, materials, textures, shadow maps), so walking the ring never piles up GPU memory |
| `Room.webgl` | [core/render.ts](src/core/render.ts) | the scene renders onto its own canvas under `#scene`; the 2D canvas keeps only the post pass and the focus ring |
| `setPicker()` | [core/hits.ts](src/core/hits.ts) | `hitAt()` asks the 3D room first, which raycasts; the first solid thing hit decides, so things occlude each other |
| `localPt(h, e)` | [core/hits.ts](src/core/hits.ts) | a raycast hit carries `local(e)`, so a drag keeps getting a point on the thing it started on, in that handler's own design units, from wherever the camera is |
| `HITS` | every frame | each pickable on screen, and not hidden behind something solid, is pushed as a screen-space circle, so Tab, Enter, the focus ring and "what's touchable" work unchanged |
| `CAM.*`, `VIEW` | [core/camera.ts](src/core/camera.ts) | the existing drag, wheel, pinch, arrow keys and reset write `panX/panY/user`; [three/view.ts](src/three/view.ts) turns them into a head turn and a lean, and `rot`/`lift`/`px`/`py` into roll, bob and parallax (halved under reduced motion) |
| `CABIN_SPACE` and kin | the room's 2D module | where a room's *logic* asked the 2D camera a question (which window is this beacon behind, where is the hand), it asks a hook the 3D room answers |

**Units.** Metres stay inside `src/three/`. Every ACT handler still receives
the design units it was written for, and every pickable says how it gets there:
`designMap()` lays a wall out from the 2D numbers (the cabin's windows *are*
`WIN`); `faceMap()` maps a face of an object -- the radio dial, the music-box
tape, the crank -- onto the design rect its handler expects; `screen: true`
is for a control turned by a sideways drag (the tuning knob, the dough), whose
handler only uses differences, so a full sweep is the same movement of the hand
from any viewpoint.

**Viewpoints.** You do not walk a room. Each has a main view and one or two
places to lean in:

| Room | Views (first is where you arrive) |
|---|---|
| bridge | desk · window (breathe and draw on the glass) · chart table |
| radio room | room · radio · music box |
| greenhouse | garden · nursery · work bench (opens here when building is the step) |
| gangway | bay · doorway (the handover) |
| galley | galley · sink and stove · board |
| dome | sitting · lying down (follows `G.lie`, so the bench and the pill move you too) |
| ring | one view driven by `S.phi`; sitting turns you to the big window |
 A view allows a small
head turn and a lean (wheel, pinch); a marker in the room, the bar under the
picture or Tab + Enter on a marker moves you, and Escape or a double-click goes
back. A short move flies, a long one (and every move under reduced motion)
fades through black, and the pointer is ignored while moving. While a hand is
on something -- the glass, a dial, the dough -- the camera holds completely
still, so a stroke cannot drift under the finger. The ring corridor's single
view is driven by `S.phi`: dragging, the arrow keys and the map dots walk a
fixed circular path, and tapping a station well off centre walks to it
(`ring3d:walk`) instead of going in. The 3D ring sets `PPD` from the camera
every frame (`setPPD` in rooms/corridor.ts), so the wall under the finger moves
with the finger; walking right moves you right, which the painted ring had the
other way round.

**Notices up close.** Anything pinned to a wall with something to read on it
-- the work slip in every room, the bridge's course sign, the radio's station
table, the greenhouse order boards, the gangway sign, and on the ring the work
and voyage slips, the log, the ship's notices and the clock -- is a pickable
with `inspect: true`. The first tap brings the camera square on to it
(`inspect()` in [three/view.ts](src/three/view.ts) works the framing out from
the thing's own size and facing), a tap on it while you are there does what it
always did, and the back button, Escape or a double-click put the camera back
exactly where it was, head turn included. While reading, the ring's drag and
arrow keys turn the head instead of walking; the map and the nav buttons walk,
and put the notice down.

Where a room's logic asked the 2D camera something, it now asks a hook the 3D
room answers and restores on exit: `CABIN_SPACE` (beacons, glass, sky),
`GREEN_SPACE` (where the hand is, which end of the greenhouse you are at).

Screenshots of every room and view are in [docs/three/](docs/three/).

**Look.** `MeshToonMaterial` on three ramps (soft for cloth and paper,
standard for wood and walls, crisp for metal, ceramic and glass), the game's
own brush tiles from `core/paint.ts` as a multiply grain, a cold fresnel rim,
a painted highlight blob from the upper left of the frame (the `hl` of
`vol()`), soft contact blots under things, the 2D glow sprites as additive
halos, no outlines. `M(kind, colour)` in [three/kit.ts](src/three/kit.ts)
names the combinations. One light per room casts shadows. Paper, dials and
signs are painted with the 2D kit onto canvases that redraw only when what
they say changes.

**Tuning.** Every number -- layout, palette, lights, viewpoints, limits --
is in [three/config/](src/three/config/), one file per room plus `shared.ts`
for the renderer, the ramps, the camera feel and the markers.

**Checking.** `node tools/three-check.mjs [dir]` drives the ship in Chrome
with real pointer, wheel, touch and keyboard input and checks the state after
each step, including the exact distance between the pointer and a stroke drawn
on the cabin glass. Its header says what it needs.

## The round

One crew, one job at a time, and the ring is laid out so that walking it one way
goes through that job in order. The first five stations in `RING`
([rooms/registry.ts](src/rooms/registry.ts)) are the work and the last four are
where you stop because you want to:

| | | |
|---|---|---|
| 0° | radio room | a request comes in over dispatch and prints as a slip |
| 40° | work board | the whole job pinned up, finished steps ringed in pen |
| 80° | greenhouse | seedlings, then the garden, then the bench, left to right |
| 120° | bridge | the slip goes on the course board and the ship turns |
| 160° | gangway | the door opens and the lamp changes hands |

[ui/worksheet.ts](src/ui/worksheet.ts) is the only thing that decides which step
you are on and how far into it, so every slip on the ship and the hints cannot
disagree. Nothing enforces the order: a step is done when the world says it is,
so setting course early and growing on the way simply lights two steps.

The job is never shown as an interface element. [ui/sheet.ts](src/ui/sheet.ts)
paints it as paper, in the room, at the room's scale and under the room's lamps:
five lines down a slip, the finished ones ringed, an arrow at the one you are on
and a box ticked under it for each thing that step is made of. `hangSlip()` puts
a copy on the wall of each room the job passes through, and `drawSlip()` draws
the big one on the cork board beside a second slip that carries the round -- one
line per place that has asked, with the lanes sketched under them. The marks are
made with [core/pen.ts](src/core/pen.ts), which strokes nothing: a pen mark is a
filled ribbon that swells in the middle, and every wobble comes from a seed, so
a tick is the same tick on every frame.

[data/ports.ts](src/data/ports.ts) holds the four places, each at the end of one
of the four lanes in [data/index.ts](src/data/index.ts). Four pieces of state
carry a job, all on the save:

| | |
|---|---|
| `G.printed` | the slip in the printer's tray, waiting to be torn off |
| `G.slips` | the slips in hand, which is what the course board offers |
| `G.call` | `{ to, eta, docked, gave }` — where the ship is headed and how far along |
| `G.rig` | the piece on the bench: `{ sp, glass, lit }`, finished when both are true |

Every one of those states is painted on the thing it belongs to — the three
marks on the bench plate, the indicator over the gangway door, the handle lying
flat while the ship is under way, the band scratched into the dial. A caption
should never be the only reason a player knows why something will not work yet.

Arriving is deliberately not something the player can miss. `advance()` in
[state/progress.ts](src/state/progress.ts) brings the ship alongside on its own
schedule, whether or not anyone is aboard to see it, and then it holds there
until the door is opened. Casting off again runs on a clock in the same place, so
a tab closed between the handover and the parting still ends the call.

The three beacon colours in `COL` were already named after three of these places,
so the lights the player answers with the lantern from the cabin window are the
places the ship is working toward.

## Saves

Three slots, `yehang-long-v2:s1..s3`, picked on the door screen before boarding
and fixed for the session; `:last` remembers which. A pre-slot save moves into
slot 1 on first run. The cloud copy, when the host provides one, is one document
per slot under `data/users/<id>/slot<n>`, merged at boot by whichever side was
written last. See [state/save.ts](src/state/save.ts) and
[ui/slots.ts](src/ui/slots.ts).

## If you later move to Phaser

The split was made with that in mind. Four seams are where an engine would attach,
and none of them has engine-specific code behind it today:

| Seam | File | What a Phaser version would replace it with |
|---|---|---|
| `onResize()` hooks | [core/surface.ts](src/core/surface.ts) | Scale Manager events |
| `ROOMS` + `go()` | [rooms/registry.ts](src/rooms/registry.ts) | `Scene` classes and the Scene Manager |
| pointer/keyboard dispatch | [core/input.ts](src/core/input.ts) | Phaser input plugin |
| `render(dt, R)` | [core/render.ts](src/core/render.ts) | the engine's render step |

Worth knowing before committing to that move: the renderer itself is the hard
part, not the shell. `vol()` ends every object with a `soft-light` pass, and the
lighting is `destination-out` compositing — Canvas2D has 27 blend modes, WebGL
has 4 natively. Phaser 4 is WebGL-first, so reproducing the current art direction
means writing shaders, not porting calls.

A realistic path is to adopt Phaser for scenes, input, audio and tweens while
keeping Canvas2D drawing inside a render hook, and only then decide whether the
look survives a move to WebGL.

## Known debt

- Types are permissive on purpose. `S` (session state), `G` (save) and `AU`
  (audio graph) are open shapes, because rooms extend them as they initialise.
  Tightening those is the next useful step; `npm run typecheck` is clean today,
  so any regression shows up immediately.
- Cloud save goes through `window.claude`, which only exists inside the Claude
  artifact host. Everywhere else it is absent, every call site is guarded, and
  the game falls back to `localStorage` silently. See
  [state/save.ts](src/state/save.ts).
