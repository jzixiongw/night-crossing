# A Little Voyage / 夜航 — iF 2027 Submission Status

**Updated:** 2026-11-01
**Deadline:** 2026-11-04 23:59 **PST** (~3.5 days)
**Version marker:** no git commits exist yet (`git log` empty, working tree untracked). **Needs a baseline commit** so submitted claims are pinned to a build.
**Build:** `npm run build` clean (`tsc --noEmit` + vite). 46 modules, 183 KB JS / 74 KB gzip, 15.7 KB CSS.
**Audited by:** running the built `dist/` on a local static server, driven through Chrome DevTools Protocol (no stubs, no mockups). Captures in `submission/_audit/` (local only — git-ignored, 75 MB of regenerable PNGs).

---

## 1. What is actually implemented

Verified by playing the built bundle end to end. Nothing below is proposed or partial unless marked.

**Shell.** Vite + TypeScript, **no engine** — the whole game is procedural Canvas2D painted at 1600×900 design resolution every frame. No sprite sheets, no texture atlases. ~250 call sites use `vol()` (stacked offset fills + a `soft-light` pass) for painterly volume with no contour lines anywhere. Lighting is a compositing pass: dark wash, then `destination-out` holes at each light source. This is the technical basis of the art direction and it is genuinely unusual.

**Six rooms, all reachable and all interactive.**

| Room | Verified interactions |
|---|---|
| Ring corridor | drag/wheel/arrow-key walk around a ring (`ringM()` composes the camera with a rotation about a point 1300 px off-screen), 8 stations, sit at the window bench, mailbox, ship's bell, noticeboard, a passing ship |
| Cabin | lamp cord (3 levels), **breathe on the porthole and draw in the condensation**, blanket, tea cup, route card, potted plant, vase, lantern used to signal passing beacons, the ticket, 岸 (An) the cartographer |
| Galley | tap (press-and-hold), kettle (fill → stove → boil → pour), 3 tea jars + plain water, steeping over real time, flour → knead → shape (round / long / braided) → proof box → oven → bread, star-pears |
| Greenhouse | seed box (3 species), 5 pots, watering can with a spray mode, grow lamp — **with the lamp off, plants lean toward a slowly-moving pointer; move fast and they close up** |
| Radio room | power, tuning dial with a magic-eye that closes on station lock, 6 stations gated by in-world clock hours, station log that fills itself in, headphones, music-box paper tape you punch (6-row D-major pentatonic) and a crank you wind by drawing circles |
| Dome | dim the lamp and wait for your eyes to adapt before faint stars appear, connect stars into lines, name a constellation (optional), lie on the bench, sky rotates once per day so your lines come back overhead |

**Systems.** In-world clock; growth/proofing/steeping/mail that advance while you are away (`advance(ms, mode)`) with an honest "while you were gone" summary; four routes that change sky, beacon colours and the generative music; 16 letters arriving on a mail boat every 2 in-world hours; writable postcards; a voyage log; localStorage save with migration (+ optional cloud save behind `window.claude`, guarded everywhere and absent off-host).

**Audio.** Web Audio graph built in-browser — no audio files. Per-room ambience filters, a music director that follows the route, bells, paper, stamp.

**Takeaway artifact (B10).** The ticket is generated from real save state: pots drawn from actual growth, the punched tape, your star-lines, cups, loaves, letters read, stations found, nights sailed, and a free-text note you may leave blank.

---

## 2. Benchmark check (B1–B10 from IF_Game_Project_Kickstart.md)

| ID | Verdict | Evidence |
|---|---|---|
| B1 meaningful behaviour / discoverable relationships | **Pass** | Plants lean toward a *slow* hand only when the grow lamp is off (taught by a letter, not a tutorial); dark-adaptation gates faint stars; proofing is faster in a galley that was recently used. These are real rules with visible consequences. |
| B2 agency + consequences | **Pass** | Four routes change sky, beacons and music and persist; tea kind/steep, bread shape, plant species, star-lines and constellation names all survive into the ticket. |
| B3 recoverable | **Pass** | No timers, no fail state, no irreversible loss. Over-proofed dough just bakes fatter ("发过头也没关系"). Dry soil pauses growth rather than killing the plant. |
| B4 personal content opt-out | **Pass** | The only personal-disclosure surfaces are the postcard and the constellation name. Both are explicitly skippable in copy ("不写也能寄", "就让它没名字") and the full experience is reachable without either. |
| B5 no reward for disclosure | **Pass** | Ticket and ending are identical in quality whether or not you write anything; a blank note prints "（空着）" without comment. |
| B6 sensory controls | **Pass** | Sound on/off at the door *before* boarding ("静音登船") and in-session; motion toggle honoured, and `prefers-reduced-motion` seeds the default. |
| B7 copy does not speak for the player | **Pass** | Spot-checked ~640 strings. Copy describes world change ("划开的地方透出外面的星星"), never player state. No "you feel calm now". |
| B8 small actions get feedback; non-coercive ending | **Pass** | Ending offers five real-world invitations including "什么也不做" (do nothing), with no scoring. |
| B9 complete loop | **Pass** | Enter → understand → explore → change → end is fully playable. |
| B10 traceable takeaway | **Pass** | Ticket derives wholly from save state; requires no personal disclosure. |

**The design work is in good shape. The gaps below are about reaching the jury, not about the game's integrity.**

---

## 3. Ranked gaps

### P0 — blocks submission

**P0-1 · The entire experience is Chinese-only.** `index.html` is `lang="zh-CN"`; every caption, label, letter, HUD control, panel and the intro is Chinese. Measured: **580 CJK string literals in `src/`, 64 more in `index.html`, ~5,800 CJK characters total.** The iF Registration Guide requires the project URL to be in English, and the jury is international and Germany-based. As it stands a judge opens the link and can see that it is beautiful but cannot read a single affordance, cannot discover any of the rules in §2, and cannot evaluate Function at all.
*This is the dominant work item and it touches the authored voice, so it is **an owner decision, not a reversible code fix**. See §5 Q1.*
Risk: a flat translation would hurt more than it helps — the restraint of the prose is a large part of what makes the piece good.

**P0-2 · No public URL.** Runs only on localhost. iF requires the URL to be reachable throughout registration and judging. `dist/` is a plain static bundle and will deploy anywhere; needs an owner-authorised host + domain. See §5 Q3.

**P0-3 · Name conflict.** Code, title tag, intro, ticket and brand all say **夜航 / NIGHT CROSSING**. The submission brief says the entry title is **A Little Voyage** (entry 830003). Submitting one name while the live build shows another reads as a mismatch to a judge. See §5 Q2.

**P0-4 · No portrait asset yet.** iF requires ≥1 portrait image among the 4–7. The stage is hard-locked to 16:9 and portrait viewports get a "rotate your device" note, so there is no honest portrait *gameplay* capture today. Options: compose a truthful portrait from real captures (must be declared a composition in the manifest), or add a genuine portrait layout. See §5 Q4.

**P0-5 · Credits unresolved.** iF marks both "Designing Company" and "Client / Manufacturer" mandatory; this is a self-initiated individual project. Pending written iF confirmation per the brief. Must not be invented.

### P1 — weakens the judged experience

**P1-1 · A debug control ships to judges.** Settings shows **"测试用：时间流速 ×20"** (test-only time speed). A judge will see a dev affordance in a finished product. Should be gated to non-production builds.
**P1-2 · `favicon.ico` 404s** on every load — the only network error in the build. A blank tab icon on a judged URL.
**P1-3 · No baseline commit.** Nothing is pinned; claims cannot be tied to a build.
**P1-4 · Canvas `aria-label` and all control labels are Chinese** — the accessibility story is real (Tab cycles hit regions, Enter activates, focus ring is drawn on canvas) but is invisible to an English-speaking judge or screen reader.
**P1-5 · The establishing view is weak as a thumbnail.** The ring corridor at a door is dark and dominated by one door. The strongest compositions are cabin, galley and dome. Image 1 must carry the gallery thumbnail.

### P2 — polish, only if P0/P1 land

P2-1 `index.html.backup` (273 KB) sits in the repo root. P2-2 No `README` note on how to capture. P2-3 Music-box tape and station log are rich but hard to show in a still.

---

## 4. Fixes applied so far

Both reversible, both verified by re-running the built bundle through CDP (console error list now empty).

**F1 · P1-2 — favicon.** Added `public/favicon.svg` (porthole + warm lamp, drawn from the game's own palette tokens `--page / --ink / --amber / --amber-lt / --ice`) and linked it in `index.html`. The `favicon.ico` 404 was the only network error in the build; the build now loads clean.

**F2 · P1-1 — debug control gated.** The "测试用：时间流速 ×20" row is now `id="speedRow"`, hidden by default, and shown only when `!import.meta.env.PROD || location.search` has `?debug` (`DEBUG` in `src/ui/settings.ts`). `renderSettings()` also forces `G.speed` back to 1 if a save carries ×20 into a build where the control is unavailable, so no one can get stranded at 20× with no way back. Verified: production build shows 声音 / 动态 / 存档 / 清空 only; `?debug` restores the row, so it stays available for capture work.

**F3 · P0-1 — English localisation (owner-approved 2026-11-01: English default, Chinese toggle).**
New `src/i18n/`. `tr()` is keyed by the original Chinese string, so an untranslated line falls through and renders *as Chinese on screen* — a gap is visible, never silent. 644 literals across 20 files were wrapped (template literals became `tr('… {0} …', expr)`), and `index.html` is localised by one DOM walk at boot rather than a `data-i18n` attribute per node, which the key scheme makes possible. **661 keys written.**
- English is the default; `?lang=` or the toggle (settings, and on the door screen so a Chinese reader needs no English to find it) switches and reloads. The voyage is persisted continuously, so a reload costs nothing.
- **No new font.** ZCOOL XiaoWei self-hosts its own Latin, measurably distinct from the generic fallback — so the English build keeps the exact typographic identity and adds zero bytes.
- **Straight quotes only.** ZCOOL maps U+2019 and U+201C/D to full-width CJK glyphs (41px vs 8.2px), which opened a hole mid-word — "What' s touchable". All English copy uses straight quotes.
- **Title case on the door screen.** ZCOOL's capital `I` has no serifs, so all-caps read as "NlGHT CROSSlNG".
- `txtFit()` added to `core/paint.ts`: painted labels sit in boxes sized for 2–4 Chinese glyphs, so English shrinks to a floor then wraps once at a space. Used for the tea jars and the route card, both of which overflowed.
- `durText()` now has real English grammar rather than keyed fragments.
- Verified: a scripted walkthrough of all six rooms asserts **no CJK in any visible DOM text or attribute** (the one hit is the "中文" toggle, which is meant to be Chinese), console error list empty, and the Chinese build still correct at `?lang=zh`.

**F4 · P0-4 — real portrait layout (owner-approved: "做一个真实的竖版布局").**
The stage was hard-locked to 16:9 with a "rotate your device" note. It now takes the viewport's own shape down to 3:4, and the renderer scales the 1600×900 design space to **cover** rather than letterbox, cropping toward each room's existing `zc` focal point — so a portrait screen shows a tall slice of the real scene, correctly composed, and the portrait entry image is genuine gameplay rather than a composition.
- `surface.ts` derives `CH` from the stage instead of forcing `w*9/16`, computes `RS` as a cover fit, and exposes the crop offset `VX/VY`; `mat()` adds it, which is why every room, hit region and pointer mapping follows with no further changes. `setViewFocus()` is called on room change.
- The crop is clamped so the view never runs past the painted design space.
- HUD reflows in portrait: controls move to the bottom centre, captions clear the nav, panels become full-width sheets, the mail/log/ticket layouts go single-column, the door screen stacks.
- **Landscape regression checked: the stage still measures exactly 1.778 and `VX/VY` are 0, so the composed 16:9 frame is untouched.**

_Deliberately not touched: the entry name (owner undecided — code still says 夜航 / Night Crossing throughout), deployment (owner will authorise before any push), and the art itself._

---

## 5. Owner decisions

| # | Decision | Status |
|---|---|---|
| 1 | Language | **Answered 2026-11-01:** English default + Chinese toggle. Done (F3). |
| 2 | Entry title | **Open — owner undecided.** Build still says 夜航 / Night Crossing. Blocks `entry-fields.md` Entry Name and the on-screen brand. |
| 3 | Public URL | **Answered:** prepare locally, owner authorises before any push. Nothing has been deployed. |
| 4 | Portrait image | **Answered:** real portrait layout. Done (F4). |
| 5 | Credits | **Open — awaiting iF.** Both company fields stay `OWNER INPUT` until they reply. |

## 6. Artifact checklist

| Path | State |
|---|---|
| `STATUS.md` | this file |
| `01_evidence_map.md` | **done** — 12 supported claims each tied to a file and an observed response; 3 marked intention-only; a "do not claim" list |
| `entry-fields.md` | **done** — six fields at 519–587 / 650 chars, counted with `len()`; owner-dependent values marked `OWNER INPUT`; 中文 editorial notes |
| `images/` | **captured from live play**, manifest validated against the iF constraints |
| `video/shotlist.md` | **done** — 10 shots with timings, capture rules, title card |
| `video/narration_or_subtitles.md` | **done** — full `.srt`, English |
| `video/*.mp4` | **blocked: no capture or editing tooling on this machine.** No ffmpeg, no screen recorder. The shot list and subtitles are executable as written; the owner records. No placeholder file created. |
| `pdf/editable_source/outline.md` | **done** — 7 pages, production route that reuses the game's own CSS |
| `pdf/*.pdf` | **not exported** (P2, and it competes with P0 work). No placeholder created. |
| `deploy/` | **prepared, nothing pushed** — three routes + a pre-flight list including the reachable-from-Germany check |
| `SUBMISSION_CHECKLIST.md` | **done** |
| `HANDOFF.md` | **done** |

## 7. Final verification

Run against the production build (`npm run build`, served static), scripted over the DevTools protocol. **13 checks, 13 pass, console error list empty.**

| Check | Result |
|---|---|
| Defaults to English | pass |
| Mute offered **before** boarding | pass |
| Language toggle on the door screen | pass |
| Debug time control hidden in production | pass (`?debug` restores it) |
| Canvas keeps keyboard focus through Tab | pass |
| Reduced motion applies and persists to the save | pass |
| Sound toggles and relabels | pass (`Sound on` → `Sound off`) |
| Voyage survives a reload | pass |
| Returning player gets a different door screen | pass (`Back aboard`) |
| Chinese renders at `?lang=zh`, with its own title | pass |
| Back to English | pass |

**Images:** 7 files, 1 portrait, all RGB JPEG, largest 0.70 MB against the 5 MB limit, largest 3.48 MP against the 15 MP limit. Validated programmatically; see `images/manifest.md` for how each was captured.

**Also re-checked after the English and portrait work:** all six rooms reachable and interactive, no CJK anywhere in the English build's visible DOM text or attributes (the one hit is the "中文" toggle, which is meant to be Chinese), landscape stage still exactly 1.778.

## 8. Honest blockers

- **Video export.** This machine has no ffmpeg and no screen-capture tool, so a finished MP4 cannot be produced here. Delivered instead: a shot-by-shot list with timings and a complete subtitle file. Deliberately **no empty `.mp4`** was created to tick a box.
- **PDF export.** Same reasoning — it is P2, and the brief says to stop P2 when it competes with P0. The outline is executable.
- **Entry name.** Unresolved by the owner, so the build still says *Night Crossing* and `entry-fields.md` carries both options with counts.
- **No commits.** The repository has no history at all, so no version marker can be quoted. Flagged in the handoff; not done unprompted.
