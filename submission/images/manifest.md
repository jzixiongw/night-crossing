# Image Manifest

**7 images, 1 portrait. All iF constraints verified programmatically** (`4 <= count <= 7`, JPG/PNG, RGB, <=5 MB each, <=15,000,000 px each, >=1 portrait).

## Provenance

**Every image is an unretouched screen capture of the built game running in a browser.** Nothing is composed, mocked up, re-rendered, upscaled or painted over. No interaction shown is one the player cannot perform.

How they were made, exactly:
1. `npm run build`, served as a static bundle, opened at **2272x1290** (landscape) and **1632x2200** (portrait) so the canvas renders at its native 2240 px cap with no upscaling.
2. The game was **played** through a scripted session driving real pointer and keyboard events over the DevTools protocol — the same events a hand produces. Objects were located by the labels the game prints in its own "What's touchable" overlay, and the dome's stars by finding bright points in a capture, which is how a player finds them too.
3. The plants in image 5 were grown using the project's **own `?debug` time control at x20**, which is the walkthrough aid already in the codebase. No save file was hand-edited. The `?debug` UI is not visible in any image.
4. Captures were cropped to the game stage (dropping the browser page gutter) and written as **RGB JPEG, quality 92, 4:4:4 chroma**. No colour grading, no sharpening, no retouching.

**No caption, callout, arrow, label or logo has been added to any image.** All text visible is the game's own interface, rendered live.

## Files

| # | File | Dimensions | Pixels | Size | Orientation | Mode |
|---|---|---|---|---|---|---|
| 1 | `01_world_establishing.jpg` | 2242x1262 | 2.83 MP | 0.57 MB | landscape | RGB |
| 2 | `02_interaction_before.jpg` | 2242x1262 | 2.83 MP | 0.57 MB | landscape | RGB |
| 3 | `03_interaction_response.jpg` | 2242x1262 | 2.83 MP | 0.58 MB | landscape | RGB |
| 4 | `04_discovery_or_choice.jpg` | 2242x1262 | 2.83 MP | 0.51 MB | landscape | RGB |
| 5 | `05_world_after_change.jpg` | 2242x1262 | 2.83 MP | 0.56 MB | landscape | RGB |
| 6 | `06_portrait.jpg` | 1602x2174 | 3.48 MP | 0.70 MB | portrait | RGB |
| 7 | `07_ticket.jpg` | 2242x1262 | 2.83 MP | 0.16 MB | landscape | RGB |

## Sequence and what each one is for

**1. `01_world_establishing.jpg` — Cabin**  
Lamp cord pulled once to the middle notch, so the room stays warm while the stars outside come up. The lantern on the table is lit; the route card reads Near-Harbour Lane. Chosen as image 1 because it carries the world, the light trade and the lamp pool at thumbnail size.

**2. `02_interaction_before.jpg` — Cabin, left porthole**  
Pressed and held on the glass for ~2.5 s. The fog disc has grown but nothing has been drawn in it yet. This is the "before" half of the signature interaction.

**3. `03_interaction_response.jpg` — Cabin, left porthole**  
A single slow drag through the fog. The stars outside show through the stroke where the condensation has been cleared. This is the "after" half, and the single most important image in the set.

**4. `04_discovery_or_choice.jpg` — Observation dome**  
Small lamp off, pointer held still until the eye adapted and the fainter stars resolved, then five stars joined. Two lines are left hanging into empty sky and render dashed — the game is waiting to see whether a variable star brightens there. An is at the chart table on the right.

**5. `05_world_after_change.jpg` — Greenhouse**  
All five pots planted, watered and grown to full over a single session: two Starvines in flower (five-pointed, self-lit), two Moonbells hung with bells, one Mistfern fully unrolled. The grow lamp is off and the watering can is back on the floor.

**6. `06_portrait.jpg` — Cabin, portrait layout**  
The same voyage in the portrait layout. The renderer crops the 1600x900 design space toward the room focal point rather than letterboxing it, so this is live gameplay at 3:4, not a composition. Satisfies the iF portrait requirement.

**7. `07_ticket.jpg` — Ticket overlay**  
The takeaway artefact, opened on the voyage shown in images 1-6. Every row is read from save state: lane, cups, loaves, letters, stations logged, star-lines, and thumbnails of the actual pots, punched tape and sky. Nothing on it is a score.

## Upload order

Upload in the numbered order. **Image 1 is the gallery thumbnail** and was chosen for that job: it reads at small size, shows the world and the lamp pool, and gives away none of the interactions the later images carry.

If fewer than seven are wanted, drop 7 then 5 — the three cabin images and the dome must stay, because 2 and 3 are the signature interaction as a before/after pair and must never be separated, and 6 is the only portrait.

## Re-shooting

`submission/_audit/` holds the wider capture set the audit was based on. The capture scripts live in the session scratchpad and are not part of the repository; the method above is written out in full so it can be reproduced from the description alone.