# 夜航 · Night Crossing

An atmospheric 2D web game: a ring-shaped night ship with six rooms, painted
entirely at runtime onto a 2D canvas. No sprite sheets, no texture atlases —
every object is drawn from path commands each frame.

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

Three ideas carry the whole look. They are worth knowing before changing anything.

**Depth layers.** Design space is a fixed 1600×900. Every draw call names a depth
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

The pipeline that runs these in order is [core/render.ts](src/core/render.ts), all
15 lines of it.

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
    an.ts an-lines.ts  岸: pose, drawing, idle lines
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
  i18n/              tr(), the language choice, and the English table
  audio/             Web Audio graph + the music director
  platform/          host.d.ts: the optional `window.claude` runtime
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

## The round

The visible main line is a delivery round. [data/ports.ts](src/data/ports.ts) holds
four places, each sitting at the end of one of the four lanes in
[data/index.ts](src/data/index.ts), each with somebody at it who asked the ship for
one lit plant. The cabin's sign opens the run sheet, which picks the next call and
takes the lane with it; the greenhouse's work bench turns a flowered pot into the
thing being carried; `ROOMS.hatch` is the one place on the ship that opens onto
somebody else's.

Three pieces of state carry it, all on the save:

| | |
|---|---|
| `G.call` | `{ to, eta, docked, gave }` — where the ship is headed and how far along |
| `G.calls` | what has been delivered, which the record in the cabin reads back |
| `G.rig` | the piece on the bench: `{ sp, glass, lit }`, finished when both are true |

Arriving is deliberately not something the player can miss. `advance()` in
[state/progress.ts](src/state/progress.ts) brings the ship alongside on its own
schedule, whether or not anyone is aboard to see it, and then it holds there
until the door is opened. Casting off again runs on a clock in the same place, so
a tab closed between the handover and the parting still ends the call.

The three beacon colours in `COL` were already named after three of these places,
so the lights the player answers with the lantern from the cabin window are the
places the ship is working toward.

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
means writing shaders, not porting calls. The ring corridor is also not an affine
transform: `ringM()` composes the camera with a rotation about a point 1300px
off-screen, and the floor and ceiling bands are sampled point by point.

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
