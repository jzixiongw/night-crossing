# Submission Checklist

Tick only what has been **verified**, not what has been produced. `[!]` marks something only the owner can do.

## Registration
- [!] Registration completed and **paid** in the my iF portal. A saved draft is not a submission.
- [!] Submitted before **2026-11-04 23:59 PST**. Do not trust the local clock — confirm the portal's own stated deadline and time zone.
- [x] Entry ID 830003 confirmed against the current application.
- [!] **Entry Name decided** and made identical in the portal and the live build. Currently the build says *Night Crossing* and the brief says *A Little Voyage*.
- [x] Discipline / category: UX / 8.03 Entertainment / Gaming UX.
- [!] Entry type, degree of realization and launch date set to **functional prototype, not launched**.

## Credits
- [!] Reply received from iF about an individual in both mandatory company fields.
- [!] Designing Company and Client / Manufacturer filled only once that reply exists.
- [ ] **No invented studio, employer or university anywhere in the entry.**

## Images — 4 to 7
- [ ] Between 4 and 7 uploaded.
- [ ] JPG or PNG, **RGB** (not CMYK, not greyscale-tagged).
- [ ] Each ≤5 MB.
- [ ] Each ≤15,000,000 pixels.
- [ ] **At least one portrait.**
- [ ] **No caption, callout, arrow, logo or explanatory text added onto any image.** The game's own on-screen UI is fine; editorial overlay is not.
- [ ] Image 1 works as a gallery thumbnail at small size.
- [ ] Every image is a real game state. Nothing depicts an interaction that cannot occur.
- [ ] `images/manifest.md` records filename, dimensions, bytes, source scene and how each was produced.

## Project PDF — optional, ≤8 pages
- [ ] Actual page count ≤8 (open it and count).
- [ ] English throughout.
- [ ] Opens in a plain PDF viewer, nothing overflowing or stretched.
- [ ] Adds material the images and video cannot carry.
- [ ] Editable source kept beside the export.

## Video — optional, ≤2 min
- [ ] Duration ≤120 s (check the exported file, not the timeline).
- [ ] English subtitles present and legible.
- [ ] Authentic gameplay only.
- [ ] **No `?debug` UI visible in any frame** (the ×20 time control must not appear).
- [ ] Audio present, not clipping.
- [!] Hosted somewhere reachable from Germany (e.g. YouTube). Not a file-download link.
- [!] URL opened from a clean browser session to confirm it is public.
- [ ] Edit source, clips and the exact build identifier archived.

## Project URL — optional but valuable here
- [!] Deployed and public.
- [!] No auth wall, no password, no staging banner.
- [!] Opens and plays in a fresh browser with no extensions.
- [!] Reachable from Germany.
- [!] Will stay up for the whole judging period.
- [ ] Defaults to **English**.
- [ ] `?debug` is not the default and the time-speed control is hidden.

## Written fields
- [ ] Six fields each ≤650 characters including spaces (counts in `entry-fields.md`).
- [ ] Entry Name ≤50.
- [ ] Each field does a different job; none repeats another.
- [ ] **No claim of therapeutic, clinical or wellbeing effect.**
- [ ] **No user research, testing, interviews, downloads, ratings or awards.**
- [ ] **No sustainability metric.** Eco-labels left blank.
- [ ] Launch status truthful.

## The work itself
- [x] `npm run build` clean (`tsc --noEmit` + vite).
- [x] All six rooms reachable and interactive; console error list empty.
- [x] B1–B10 re-checked after the English and portrait work.
- [x] English default verified with an automated no-CJK assertion across the walkthrough.
- [x] Chinese still correct at `?lang=zh`.
- [x] Portrait layout real; landscape regression confirmed at exactly 1.778.
- [x] Sound can be declined before boarding; reduced motion honoured.
- [x] Save survives reload; reset works.
- [x] **Baseline commit made** so the submitted claims are pinned to a build — `3417c3a`.
