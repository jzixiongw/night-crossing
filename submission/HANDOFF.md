# Handoff — A Little Voyage / Night Crossing, iF DESIGN AWARD 2027

**Written for:** Zixiong Wei, finishing the portal submission alone.
**Date:** 2026-11-01 · **Deadline:** 2026-11-04 23:59 **PST** (~3.5 days)
**Entry ID:** 830003 · UX / 8.03 Entertainment / Gaming UX

---

## 1. What changed in the game

Four changes, all verified by running the built bundle through a scripted walkthrough, not by type-checking alone.

**The experience is now English by default, with Chinese on a toggle.** This was the one thing that would have sunk the entry: the jury is international, iF asks for an English project URL, and a judge opening a Chinese-only link could see that it was beautiful but could not discover a single rule the entry is built on. `src/i18n/` now holds 661 keys. The design detail that matters: **keys are the original Chinese strings**, so anything untranslated falls through and renders *as Chinese on screen* — a gap announces itself rather than failing silently. 644 literals across 20 files were wrapped, and `index.html` is localised by one DOM walk at boot instead of an attribute per node.

Three things fell out of doing it properly:
- **No new font was needed.** ZCOOL XiaoWei self-hosts its own Latin, and it is good — measurably distinct from the generic fallback. The English build keeps the exact typographic identity and adds zero bytes.
- **Straight quotes only.** That font maps the curly apostrophe to a full-width CJK glyph — 41px against 8.2px — which opened a hole mid-word (*"What' s touchable"*). All English copy uses straight quotes.
- **Title case on the door screen,** because the font's capital `I` has no serifs and all-caps read as "NlGHT CROSSlNG".

**Portrait is a real layout now, not a "rotate your device" note.** The stage was hard-locked to 16:9. It now takes the viewport's own shape down to 3:4, and the renderer scales the 1600×900 design space to **cover** rather than letterbox, cropping toward each room's existing focal point. So the portrait entry image is genuine gameplay, correctly composed — not a composition assembled from assets, which is what the brief would otherwise have forced. Landscape was re-measured afterwards at exactly 1.778 with zero crop offset: **the composed 16:9 frame is untouched.**

**A dev control no longer ships to judges.** Settings used to show "Testing: time speed ×20". It is now hidden unless the URL carries `?debug`, and a save carrying ×20 into a build without the control is pulled back to ×1 so nobody gets stranded.

**The favicon 404 is gone** — it was the only network error in the build.

## 2. What was already good, and should not be touched

The audit found the design work in strong shape. **B1–B10 all pass**, and they passed before I changed anything:

- Rules are discoverable and have costs — brighten the cabin and the window stops showing you the stars; turn the grow lamp off and the plants lean toward a slow hand instead; faint stars need the lamp off *and* your eye still.
- No timer, no score, no fail state, no irreversible loss anywhere in `src/`. Over-proved dough bakes rounder. Dry soil pauses growth rather than killing the plant.
- Personal disclosure is invited exactly twice — the postcard and naming a constellation — and both are declinable in the copy itself, with the full experience and an identical ending reachable without either.
- The copy describes what the world did, never what the player feels. I spot-checked roughly 640 strings for this and found no breach; the English translations hold the same line.

**The writing is the work.** That is why the translation was done line by line rather than mechanically, and why I would ask you to read `src/i18n/en.ts` before you ship the URL.

## 3. Where the files are

```
submission/
  STATUS.md              audit, ranked gaps, every fix with its verification
  01_evidence_map.md     each claim -> the mechanic that backs it -> medium
  entry-fields.md        paste-ready portal text + character counts + 中文说明
  images/                the entry images + manifest.md
  video/                 shotlist.md, narration_or_subtitles.md
  pdf/editable_source/   outline.md (7 pages, production route)
  deploy/                README.md + gh-pages.yml  — PREPARED, NOTHING PUSHED
  SUBMISSION_CHECKLIST.md
  HANDOFF.md             this file
  _audit/                every screenshot the audit was based on (git-ignored:
                         75 MB, regenerable; local copy only)
```

## 4. What only you can do

**P0 — the entry fails without these**

1. **Decide the entry name.** The build says *Night Crossing* everywhere; the brief says *A Little Voyage*. They must match. Tell me which and I will change the build in about twenty minutes — it is `src/i18n/en.ts`, `index.html` and the brand string.
2. **Deploy and give iF the URL.** `dist/` is a plain static bundle; `submission/deploy/README.md` has three routes and a pre-flight list. **I have deployed nothing and touched no account of yours.** The one trap: confirm it loads from **Germany**.
3. **Register and pay in the portal.** A saved draft is not a submission.
4. **Resolve credits.** iF marks both company fields mandatory and this is a self-initiated solo project. Until they reply, both stay `OWNER INPUT`. Do not invent a studio.
5. **Upload 4–7 images including the portrait one.** See `images/manifest.md`.

**P1 — strongly worth doing**

6. **Record the video.** `video/shotlist.md` is shot-by-shot with timings and the subtitle file is written. Record without `?debug` so the time control never appears on screen.
7. ~~**Make a baseline commit.**~~ **Done 2026-11-01** on your authorization — `3417c3a`, the repository's first commit, 272 files.

**P2 — only if the above are done**

8. The PDF. `pdf/editable_source/outline.md` has the 7-page structure and a production route that reuses the game's own CSS.

## 5. The one thing I would not let slip

Everything in `entry-fields.md` is written to be defensible line by line. **No measured effect, no user research, no launch, no sustainability figure** — because none of those exist, and an entry that invents them is worse than one that does not have them. The Sustainability field opens by saying outright that it describes design conduct rather than measured impact, then lists only things that can be checked in the build: no accounts, no analytics, no advertising, no notifications, no streaks, declinable disclosure, ~240 KB, runs offline.

If you add anything to the portal that I have not written, check it against `01_evidence_map.md` §C first.

## 6. Build state

- `npm run build` clean: `tsc --noEmit` then vite. 240 KB JS / 98 KB gzip, 16 KB CSS, plus self-hosted font subsets.
- All six rooms reachable and interactive; console error list empty in every walkthrough.
- English verified by an automated assertion that no CJK appears in visible DOM text or attributes across the whole walkthrough.
- Chinese still correct at `?lang=zh`.
- Portrait verified at 3:4 and 9:16; landscape regression at exactly 1.778.
- **Version marker:** `3417c3a` on `main`. Quote it if iF asks what was submitted.
