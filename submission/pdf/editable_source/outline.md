# Project PDF — 7 pages, landscape

**Optional per iF, ≤8 pages, English.** Its one job is to carry what the 4–7 images and the ≤2-minute video structurally cannot. It must not restate the video.

**Design rules:** one idea per page, one large authentic screenshot per page, body text under 70 words, 16:9 landscape to match the captures. Use the game's own palette (`--page #070c17`, `--ink #16213a`, `--ice #b4cde0`, `--amber #f2a95b`, `--paper #efe4cf`) and its own typeface (ZCOOL XiaoWei for headings — it self-hosts good Latin — DM Mono for labels). No stock photography, no device mock-ups, no icon sets, no "user persona" page.

---

### p1 — The project in one view
Full-bleed `01_world_establishing`. Title, one line: *A short web experience aboard a ring-shaped night ship.* Below, four facts in mono: ~240 KB · no bitmap art · English / 中文 · no account, no tracking.

### p2 — Why this, and what it refuses
Two columns. Left: the premise — a small world that is finished with you when you want to leave. Right, set as a list, the refusals, because they are the design: no timer, no score, no streak, no completion meter, no notification, no mood questionnaire. Close with one line in a lighter weight: *Designed to make room for a quiet half hour. No claim is made about what it achieves.*
**This page is where the honesty of the entry is established. Do not soften it.**

### p3 — The loop, annotated on real states
A horizontal strip of five actual captures: approach → try → the world answers → notice → linger or leave. Each gets a four-word label. No arrows-and-boxes diagram; the screenshots are the diagram.

### p4 — The signature interaction
Four frames of the porthole: clean glass → hold → fog → the line drawn through it with stars behind. Caption explains the threshold that makes it feel physical: the hold must pass 0.38 s before fog starts, the fog disc grows while held, and a stroke only opens where fog density is above 0.25. **One sentence on why subtlety matters: nothing announces this interaction; it is found.**

### p5 — Three rules with a cost
Three stacked rows, each one before/after pair plus one line:
1. Brighten the cabin → the window stops showing you the stars.
2. Turn the grow lamp off → growth slows, but the plants lean toward a slow hand.
3. Keep still with the dome lamp off → faint stars resolve; move, and they go.
Footer: *Each is discoverable, reversible, and taught by a letter rather than a tutorial.*

### p6 — Atmosphere is a renderer, not a filter
The page the images cannot carry. Show one object at four stages of `vol()` — light face, body, shadow, rim, soft-light pass — and one room with the darkness wash shown separately from the `destination-out` holes punched by its lamps. One line: *~250 objects are built this way at runtime. There are no sprite sheets, no texture atlases, and no image files in the build.*

### p7 — What you leave with, and where it stands
Left: the ticket, full height, with three callouts to rows that come straight from save state. One line: *It records. It does not rate.*
Right, small and plain:
- Playable build, English and Chinese, 16:9 and portrait.
- Functional prototype. **Independent public launch intended by end of 2027. Not yet launched.**
- Known limits, stated: no human-participant research has been conducted; effects on the player are design intent, not findings. Single author. Desktop and tablet are the tested targets; phone portrait is supported but less tested.

---

## Production

No layout tool is assumed to be installed. Two routes, in order of preference:

1. **HTML → print to PDF.** Build the seven pages as one HTML file at 1920×1080 per page with `@page { size: 1920px 1080px; margin: 0 }`, then print to PDF from the browser. This reuses the game's own CSS variables and fonts, so the deck matches the work exactly. Keep the `.html` beside the export as the editable source.
2. Keynote / PowerPoint / Figma at 16:9, exporting `.pdf` plus the editable file.

**Verify after export, every time:** page count ≤8, opens cleanly, all text is English, nothing overflows a page edge, images are not stretched, and the file actually renders in a plain PDF viewer rather than only in the tool that made it.
