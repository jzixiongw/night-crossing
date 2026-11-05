# Current image candidates — Night Crossing

Source main `41d8e91e607775152d59d7cf0a8ab0e4a6c105bf`. This replaces the old seven-image upload recommendation. The old root-level JPEGs are historical 2D captures; use the 18 files in `candidates/` for this review.

Open [review.html](review.html) for an interactive, self-contained preview gallery, or inspect the two contact sheets. Those review aids have labels outside their thumbnails and are **not** portal upload images. Gallery previews are resized; full-size originals are separate JPEGs.

## Provenance

Captured from the actual current three.js rooms in English. No generated scenery, device mockup, colour grading, retouching, scene-geometry change or editorial caption was added to an original. Capture is cropped to the actual game stage using the browser's screenshot operation. Native game UI remains visible. The guide is dismissed through Explore the ship. Transient narration is cleared through the caption module before taking each still; this is a presentation choice, not a different gameplay state.

Mature plants, radio settings, star lines and docked ships are staged using valid save-state fixtures. The window fog and drawing, assembly and offering/letting go use the actual game actions. A post-handover timestamp is advanced to show the lamp after placement. This is a candidate-image shoot, not evidence that one player reached every frame in one continuous playthrough. Per-frame state and recipes are recorded in `candidates/capture-data.json` and `candidates/manifest.json`.

The capture machine uses software WebGL; the game's normal adaptive resolution may lower the rendered scene resolution. The screenshots include that actual output; no detail has been invented or sharpened afterwards. These are initial candidates for owner review.

## Validation

18 RGB JPEGs; 15 landscape and 3 portrait. Each is below 5 MB and 15 megapixels. The final portal selection must be 4–7 images and include at least one portrait. No final sequence has been chosen.

## Candidate inventory

| ID | Scene / purpose | Dimensions | Bytes | Staging / action |
|---|---|---:|---:|---|
| [01-bridge](candidates/01-bridge.jpg) | Bridge: a room aboard the night ship | 1888 × 1062 | 500,210 | Fresh voyage; choose Explore the ship; pull the lamp cord once. |
| [02-window-condensation](candidates/02-window-condensation.jpg) | Window: breath on the glass | 1888 × 1062 | 424,752 | Window viewpoint; press and hold on the left glass. |
| [03-window-drawing](candidates/03-window-drawing.jpg) | Window: drawing through condensation | 1888 × 1062 | 377,860 | The same glass; draw a curved stroke with pointer movement. |
| [04-sea-chart](candidates/04-sea-chart.jpg) | Sea chart: choosing a destination | 1888 × 1062 | 437,781 | Open the normal destination panel from the bridge. |
| [05-greenhouse](candidates/05-greenhouse.jpg) | Greenhouse: six species in bloom | 1888 × 1062 | 464,285 | Valid fully grown plant fixtures populate eight ordinary pots. |
| [06-greenhouse-night](candidates/06-greenhouse-night.jpg) | Greenhouse: grow light switched off | 1888 × 1062 | 428,257 | The same garden; switch off the grow light with its normal action. |
| [07-lamp-workbench](candidates/07-lamp-workbench.jpg) | Workbench: a flowering plant ready to assemble | 1888 × 1062 | 426,459 | Select the moonbell and move it using the normal plant panel. |
| [08-lamp-assembled](candidates/08-lamp-assembled.jpg) | Gangway: a finished plant lamp | 1888 × 1062 | 385,295 | Fit glass and attach the light using normal workbench actions, then visit the lamp on the gangway stand. |
| [09-radio-room](candidates/09-radio-room.jpg) | Radio room: the dispatch station | 1888 × 1062 | 418,362 | Valid radio frequency, punched strip and winding fixture; ordinary room view. |
| [10-music-box](candidates/10-music-box.jpg) | Music box: a punched paper tune | 1888 × 1062 | 394,311 | The same radio save; use the tape viewpoint. |
| [11-galley](candidates/11-galley.jpg) | Galley: hot water and dough rising | 1888 × 1062 | 436,967 | Valid kettle, tea and risen-dough save values; no geometry edits. |
| [12-observation-dome](candidates/12-observation-dome.jpg) | Observation dome: connected stars | 1888 × 1062 | 444,637 | Switch off the lamp; save fixture connects real stars visible in the normal seated view. |
| [13-dome-sky](candidates/13-dome-sky.jpg) | Observation dome: lying under the stars | 1888 × 1062 | 444,104 | Use the existing lying viewpoint. |
| [14-lamp-handover](candidates/14-lamp-handover.jpg) | Old Wharf: holding out a living lamp | 1888 × 1062 | 383,976 | Valid docked fixture; open the real door and offer the lamp with the normal action. |
| [15-light-at-old-wharf](candidates/15-light-at-old-wharf.jpg) | Old Wharf: the delivered lamp stays behind | 1888 × 1062 | 379,331 | After normal handover, advance its timestamp to the completed placement; porthole viewpoint. |
| [16-portrait-bridge](candidates/16-portrait-bridge.jpg) | Portrait: the bridge | 1068 × 1468 | 338,059 | Actual portrait viewport and existing responsive camera. |
| [17-portrait-greenhouse](candidates/17-portrait-greenhouse.jpg) | Portrait: the greenhouse | 1068 × 1468 | 349,606 | The same saved plants; actual portrait viewport and camera. |
| [18-portrait-evening-bell](candidates/18-portrait-evening-bell.jpg) | Portrait: arriving at Evening Bell | 1068 × 1468 | 328,838 | Valid docked bell fixture; normal open door and portrait handover viewpoint. |

## First-pass selection guidance

01 and 05 are the strongest starting points for the first gallery image. 07 → 08 → 14 → 15 tells the delivery story; a final selection can omit 08 if that leaves too many images. 02 and 03 are a before/after pair and should stay together if that interaction is the focus. 09, 10 and 11 provide alternate room activities. 12 shows a visible constellation; 13 is a quieter sky composition. Choose at least one of 16–18 for the portrait slot. These are editorial suggestions for review, not a final upload order.

## Reproduction

From the repository root, install project dependencies. Install Playwright separately as a capture-only tool and supply its module path in `PLAYWRIGHT_MODULE` when it is not locally resolvable. Supply a compatible Chromium executable in `CHROME`.

```sh
CHROME=/path/to/chromium PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node submission/capture/capture-candidates.mjs
python3 submission/capture/build-review.py
```

The builder needs Pillow. It validates originals and regenerates the contact sheets, embedded preview gallery and machine-readable manifest. No capture dependency was added to the game package.

Requirements: official [2027 Registration Guide](https://assets.ctfassets.net/9el74s703hin/3LisaU32dIdDzCjhL4V8r2/9c007f552f1cbbfa1dc9ecaea88b84a5/iF_DESIGN_AWARD_2027_-_Registration_Guide_-_English.pdf), checked 4 November 2026.
