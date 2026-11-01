# Evidence Map — claim → implemented mechanic → medium

**Rule for this file:** every claim below names the file and the observable response that backs it, and was checked by playing the built bundle. A claim with no mechanic behind it is cut, not softened. Where something is an intention rather than a measured outcome, the "Status" column says so and the submission copy must use "designed to / aims to".

**Build audited:** English default, portrait layout, all six rooms. No console errors.

---

## A. Claims that are fully supported

| # | Claim to communicate | Gameplay evidence (verified) | Best medium | Verification |
|---|---|---|---|---|
| A1 | **Light is a trade, not a switch.** Brightening the cabin costs you the view out. | `rooms/cabin.ts` — the lamp cord steps `G.lamp` 0→1→2; `S.vis = [.1,.55,1][G.lamp]` drives how much of the outside the glass gives back. Caption: "The lamp drops a notch. Some of the stars outside come up." | Image 1 + video 0:10–0:30 | Pulled the cord twice; reflection recedes, starfield resolves. |
| A2 | **A signature micro-interaction: breathe on the glass, then draw in it.** | `rooms/cabin.ts` `fogAt()` / `S.breaths` / `S.strokes`. Press and hold ≥0.38 s on the left porthole → a fog disc grows to r=150. Dragging through fog with `fogAt(x,y) > .25` opens a stroke, and the stars show through the line you cut. | Images 2 + 3, video 0:30–0:50 | Held, then dragged; fog and stroke both captured. |
| A3 | **Plants respond to the speed of your hand, and only when you give up the easy option.** | `rooms/green.ts` + `state/progress.ts`. With the grow lamp ON growth is ×1.35 and `p.lean` decays. With it OFF, `p.lean` rises and the plant leans toward a slowly-moving pointer; move fast and the leaves shut. Taught by a letter, not a tutorial. | Image 4, video 0:50–1:05 | Lamp off, slow pointer → lean; fast pointer → close. |
| A4 | **Dark adaptation is a real rule.** Faint stars only appear after the lamp is off *and* the eye is held still. | `rooms/dome.ts` — the adaptation term advances only while the pointer is near-still; moving the cursor resets it. Caption: "Keep your hand still. If your eyes follow it, the faint ones go." | Video 1:05–1:20 | Lamp off + still pointer → fainter stars resolve. |
| A5 | **A line may be left unfinished on purpose.** | `rooms/dome.ts` — tapping empty sky leaves a line hanging with `s == null`; it later lands if a variable star brightens there. "The line stops on empty sky and hangs. A star may come up there later. It may not." | Video + PDF | Drew a line to empty sky; it persisted as hanging. |
| A6 | **Time passes whether or not you are present, and the game says so plainly.** | `state/progress.ts` `advance(ms, mode)` — dough, steeping, growth, mail and the music box all advance while away; `ui/away.ts` reports what changed. Growth is slower when away (1/120 min) than when watched (1/35), so presence matters without being required. | Video 1:20–1:35 + PDF | Closed and reopened after a gap; the away summary listed real changes. |
| A7 | **Nothing is lost and nothing can fail.** | No timer, no fail state, no score anywhere in `src/`. Over-proved dough bakes rounder (`G.dough.proof` caps at 1.25); dry soil pauses growth rather than killing the plant. | PDF + Function copy | Deliberately over-proved and let soil dry; both recoverable. |
| A8 | **Sensory control is offered before the work starts, not buried.** | `index.html` — "Board muted" sits beside "Board" on the door screen. `state/store.ts` seeds `reduced` from `prefers-reduced-motion`. Motion toggle narrows roll, parallax and turn amplitude. | Image + Function copy | Boarded muted; motion toggle verified to change `mat()` amplitude 30→7. |
| A9 | **Personal disclosure is optional everywhere it is invited.** | Only two surfaces invite it: the postcard (`ui/mail.ts` — "It will send blank", and a blank card really does send) and naming a constellation (`rooms/dome.ts` — "Leave it unnamed"). Full experience and ending are reachable without either. | PDF + Sustainability copy | Sent a blank card and skipped the name; ending unchanged in quality. |
| A10 | **The takeaway is a record, not a score.** | `ui/ticket.ts` — every row is read off save state: pots drawn at real growth, the punched tape, your star-lines, cups, loaves, letters read, stations found, nights. No rating, no total, no judgement. Blank note prints "(empty)" without comment. | Image 5 + video close | Opened the ticket on a fresh and a played save; rows tracked actual state. |
| A11 | **The whole thing is painted at runtime.** No sprite sheets or texture atlases; ~250 `vol()` call sites stack offset fills plus a `soft-light` pass, and lighting is `destination-out` holes punched in a darkness wash. | `core/paint.ts`, `core/light.ts`, `core/render.ts` (15 lines). 183 KB JS, no image assets. | PDF (this is otherwise invisible) | Build contains no bitmap art. |
| A12 | **It is bilingual, and portrait is a real layout.** | `src/i18n/` — English default, Chinese toggle, 661 keys. `core/surface.ts` cover-fits the 1600×900 design space to any aspect down to 3:4, cropping toward each room's focal point. | Image 6 (portrait) + PDF | Walkthrough asserts no CJK in the English build; portrait capture is live gameplay. |

## B. Claims to state as intention only

| # | Claim | Why it is not evidence | Required wording |
|---|---|---|---|
| B1 | Supports a brief loosening of tension (O1) | No human-participant study was run. This sprint had no research budget and the project documentation is explicit that none was conducted. | "designed to", "aims to", "intended to" — never "reduces", "proven", "helps users" |
| B2 | Renews a small willingness to care for oneself (O2) | Same. The ending's five invitations are offered and refused freely; nothing measures whether any is acted on. | as above |
| B3 | Informed by recovery-experience and self-determination research | The references are real (Sonnentag & Fritz; Ryan, Rigby & Przybylski) but inform the *design*; they do not validate this artefact. | "design draws on", never "clinically" or "validated" |

## C. Claims explicitly NOT to make

- Any therapeutic, clinical or wellbeing effect, measured or implied.
- Any user testing, interviews, playtest counts, downloads, ratings or awards.
- Any sustainability metric (energy, carbon, device lifetime). The honest sustainability content is design conduct — no accounts, no tracking, no ads, no dark patterns, works offline after load, ~240 KB with no bitmap assets — and must be phrased as what the work does, not as an impact figure.
- Launch status. The project is **not yet publicly launched**; an independent launch is intended. Never mark it as released.

## D. Medium coverage check

| Medium | Carries | Gap |
|---|---|---|
| Images (4–7) | A1, A2, A3, A10, A12 | Cannot show time passing (A6) or recoverability (A7) |
| Video (≤2 min) | A1–A6, A8 | Cannot show A11 (runtime painting) |
| PDF (≤8 pp) | A6, A7, A9, A10, A11, B1–B3 framing | — |
| Project URL | everything, if the judge plays it | Depends on the URL being live (owner action) |
