# A Little Voyage — iF DESIGN AWARD 2027 Submission Agent Brief

> **Current-build update — 4 November 2026:** The project is now **Night Crossing**, with a three.js ship and a living-lamp delivery loop. Use `entry-fields.md` / `entry-fields.json` for current portal copy, `STATUS.md` for current facts, and `images/manifest.md` for the new 18-image candidate set. Both company credit fields may use **Zixiong Wei**, as confirmed by the organizer. The older baseline assumptions, pending-credit wording and filenames below are historical planning guidance; they do not override these current files. Public launch date, price and project URL remain owner inputs.

**Document status:** Actionable project-specific operating brief  
**Last checked:** 2026-11-01  
**Entry ID:** 830003 (from the current my iF application; re-check in portal)  
**Entry title:** A Little Voyage  
**Award:** iF DESIGN AWARD 2027  
**Discipline / Category:** User Experience (UX) / 8.03 Entertainment / Gaming UX  
**Submission & editing deadline:** **2026-11-04, 23:59 PST**, per iF deadline policy. Do not assume the local computer time zone.  
**Submission owner:** Independent designer, Zixiong Wei. Credits formatting is **pending official confirmation**.

> **Agent mission:** Inspect the actual game, make carefully scoped improvements that support the established experience vision and iF evaluation, and produce a coherent, truthful, technically compliant submission package. **Work in the project; deliver tangible outputs rather than a generic audit.**

## 0. Startup instruction — read this first

1. Inspect the repository and the current deployed experience, if available. Identify how to run, build, test, and capture the game. Do not assume the tech stack merely because one was discussed earlier. The recent proposed stack was Phaser 4 + Vite + TypeScript, with generated and manually refined 2D art, environmental audio, tweened interactions, and sparse text/UI. The repository is the source of truth about what is actually implemented.
2. Read the existing project context before touching gameplay or art. Prioritize `IF_Game_Project_Kickstart.md` (confirmed goals, mechanisms, safety boundaries, B1–B10 acceptance tests) and then `IF_Game_Idea_Log.md` (exploratory ideas, **not** a to-do list). Search for these documents in the repo or provided project context. If absent, follow the essential summary in §1 and record that limitation.
3. Inventory real features: scenes, interactions, branching, state, audio, controls, progress, ending, mobile support, tests, deployment, and screenshot/video tools. Distinguish **implemented / partially implemented / proposed / absent**. Never describe proposed mechanics as shipped.
4. Create or update `submission/STATUS.md` with a ranked gap list and artifact checklist. Then **implement high-priority, reversible fixes without waiting for a full redesign approval**. Present major creative scope changes as proposals for the owner, rather than silently changing the creative direction.
5. Produce all possible deliverables under `submission/`. Keep editable sources beside exports, log exact provenance, and report blockers truthfully.
6. Run the experience and verify outputs, not just type-check. Finish with a precise owner-facing handoff of what is ready, what needs review, and what remains to be entered/uploaded manually.

**Operating rule:** Treat this as a product + submission delivery sprint, not an opportunity to redesign the game from scratch. Prioritize a complete, understandable, memorable interaction over new scenes or feature breadth. No invented research results, gameplay footage, testimonials, awards, launch status, treatment claims, or sustainability metrics.

---

## 1. Non-negotiable project intent

### 1.1 What we are making

*A Little Voyage* is an independent, short-form, atmospheric web experience/game built around a slightly fantastical environment, small-scale exploration, and satisfying environmental micro-interactions. Mundane activities in an unfamiliar world (for example, heating water and drawing on condensation on a window **if those interactions actually exist**) can create curiosity, gentle surprise, emotional distance from immediate pressures, and moments of agency.

**Intended player outcomes** (design hypotheses, **not proven effects**):
- **O1 (primary):** support a temporary reduction in tension; allow a moment of calm and unhurried presence.
- **O2 (secondary):** invite a small renewed willingness to do something or care for oneself, without commanding or scoring it.

**Core experiential principles:**
- Interactions must have understandable cause and effect, sometimes including discoverable relationships, not just decorative click animations.
- Small obstacles, choices, or experiments are welcome if retrying/recovering is easy and progress is not arbitrarily lost.
- Give players genuine choice over activity, pace, sensory intensity, and emotional participation. Different choices should produce perceptible responses; avoid a hidden “healthy” path.
- Familiar daily actions may acquire special meaning through an uncanny, imaginative setting. Protect the world's coherence and aesthetic distance.
- Sound, text, graphics, and timing must work **together**, with meaningful mute/reduced-motion controls where practicable.
- Provide natural opportunities to linger, pause, finish, or leave. Rest is a valid endpoint; avoid streaks, timers, completion guilt, and forced productivity.
- Personal memories or sensitive self-reflection must be optional, predictable, skippable, reversible, and free of punishment. A complete fictional experience must be possible without disclosure.
- Respond to what the player does and what the world changes. Do not assert the player's feelings (“you are healed now”).

**Non-goals / claims boundaries:**
- Not psychotherapy, diagnosis, crisis support, trauma processing, or a medically validated digital therapeutic.
- Do not claim demonstrated reductions in anxiety/stress or behavior change without real evidence.
- Do not add mental-health questionnaires, biometric tracking, forced journaling, or emotionally invasive prompts to improve an award narrative.
- Real human participant research is **not an entry prerequisite for this sprint**. Test implementation and flow with reproducible walkthroughs; identify any untested experience effects as hypotheses.

### 1.2 Positioning for judges

Formal category: **8.03 Entertainment / Gaming UX**. The portal's subcategory/tag may use **Casual Gaming UX** or a user-approved **Cozy Gaming UX** if the platform permits. Terms such as **Restorative Play** describe the *design intention*; they are not evidence of therapeutic efficacy or a reason to reposition into healthcare.

**Potential central design thesis — refine after inspecting the actual game:**
> A gentle, explorative web experience in which meaningful micro-interactions, player agency, and sensory feedback make room for brief emotional restoration.

This is a provisional positioning sentence, **not** a final submission claim. Anchor each specific assertion to what the game truly implements.

---

## 2. Verified iF requirements (official, 2027)

Treat the following as **external constraints**, not creative suggestions. Re-check if the actual portal presents stricter or category-specific fields. When there is conflict, record the exact portal wording and flag it.

| Deliverable / field | Official rule | Submission implications |
|---|---|---|
| Registration & data edit | Final date **4 Nov 2026**, deadline policy **23:59 PST** | Owner must complete payment/registration; working on a draft alone is not submission. |
| Entry name | Max **50 characters** | `A Little Voyage` (verify in portal). |
| Discipline/category | One official category | UX / 8.03 Entertainment / Gaming UX. |
| Entry type, degree of realization, launch date | Must accurately describe project | Project is **intended for independent public launch by the end of 2027**, not a Concept entry. Never mark as already launched if it is not. |
| Images | **Minimum 4, maximum 7**; JPG/PNG; **max 5 MB each**; **max 15 megapixels**; at least **one portrait**; **no captions overlaid on the images** | Real, compelling visual evidence of actual experience. RGB. |
| Project PDF | Optional; **max 8 pages**, English; **additional information** | Prefer concise 6–8-page landscape slide-style PDF that clarifies mechanics and rationale not obvious from images/video. No unverified file-size restriction. |
| Video | Optional, **max 2 minutes**, English or English subtitles; hosted on a service accessible in Germany (e.g., YouTube); no downloadable-file links; avoid pure advertising | Strongly recommended for interactive UX; show genuine interaction and readable outcomes, not only a mood reel. |
| Project web URL | Optional; English; must be accessible during registration and judging; provide credentials if required | A stable, public, usable build is strategically valuable for this web experience. |
| Design Statement | **Max 650 characters** including spaces/punctuation | State what it is, whom it is for, what it does, and the less-visible design value. |
| Idea | **Max 650 characters** | Problem/relevance, fit for purpose, why this experience makes sense. |
| Form | **Max 650 characters** | Art direction, sound, spatial language, aesthetic rationale, execution. |
| Function | **Max 650 characters** | Usability, interaction feedback, player agency, accessible pacing, reliability. |
| Differentiation | **Max 650 characters** | Concrete interaction principles unlike passive ambience or conventional reward loops; no sweeping unsupported competitor claims. |
| Sustainability | **Max 650 characters** | Only demonstrable social/environmental design considerations. No invented energy/carbon or wellbeing impact metrics. |
| Sustainability questions / eco labels | Questions optional; labels only if actually applicable | Leave claims/labels blank when unsupported. |
| Details | Target group, market region, development time / launch and other relevant dropdowns | Prepare answers but do not invent dates, regions, prices, or audience research. |
| Credits | At least one Designer and one Client / Manufacturer entry in portal | Individual designer / self-initiated project. **Await iF confirmation** before finalizing names in fields labelled “Company Name”. Do not invent a company or credit an unrelated employer/university. |

**Important:** The official guide calls the video/PDF/website **optional**. They are still valuable; prioritize the website + real gameplay footage for this interactive work. iF says functional prototypes are acceptable, while final products have the best chance. A non-Concept entry should have a genuine plan to launch by the end of 2027.

**Official references:**
- 2027 Registration Guide PDF: https://assets.ctfassets.net/9el74s703hin/3LisaU32dIdDzCjhL4V8r2/9c007f552f1cbbfa1dc9ecaea88b84a5/iF_DESIGN_AWARD_2027_-_Registration_Guide_-_English.pdf
- 2027 award overview / deadlines / criteria: https://ifdesign.com/en/if-design-award-and-jury
- FAQ: https://ifdesign.com/en/faqs
- Support: award@ifdesign.com

---

## 3. Interpret the five iF criteria without distorting the work

| Criterion | Show using real evidence | What to inspect or improve |
|---|---|---|
| **Idea** | Experience goal, target situation, why explorative play may offer a momentary shift | Is the premise immediately legible? Is there a coherent player need and core loop? |
| **Form** | Art, audio, rhythm, transitions, typography, sensory hierarchy | Does the visual/audio identity hold together? Do transitions support, rather than interrupt, immersion? |
| **Function** | Interaction discoverability, clear feedback, choice, state, recovery, load/performance | Are controls discoverable? Does every meaningful input yield interpretable feedback? Can players recover and finish? |
| **Differentiation** | A concrete signature micro-interaction and the connected experience system | What is the game doing through interaction that a static ambient page or ordinary casual-game loop would not? |
| **Sustainability** | Honest social-value design intent and concrete inclusion/privacy/accessibility choices if implemented | Is there an actual basis for each claim? Do not equate intent with demonstrated emotional/health benefit. |

**Principle:** Optimize the work to make its existing strengths evaluable. Do **not** manufacture five disconnected features for five score categories.

---

## 4. Execution sequence and decision gates

### Phase A — Repo audit + targeted design triage

1. Run the project. Capture one baseline screenshot and describe the current main path in `submission/STATUS.md`.
2. Identify current start → discovery → meaningful response → sense of progression/change → optional conclusion/exit. Walk through alternative choices and failure/retry paths.
3. Rate each gap **P0** (blocks play/submission), **P1** (weakens judged experience or footage), **P2** (polish), and estimate change risk. Cite file/component/scene names and visible evidence.
4. Match the current experience against the **B1–B10** checklist in `IF_Game_Project_Kickstart.md`:
   - B1 meaningful game behavior/discoverable relationships
   - B2 real agency and consequences
   - B3 recoverable challenges
   - B4 optional personal-content paths
   - B5 no reward penalty for boundaries
   - B6 sensory controls
   - B7 copy avoids speaking for player feelings
   - B8 feedback for small actions; non-coercive ending
   - B9 complete and runnable experience
   - B10 traceable optional takeaway artifact, **only if implemented**
5. Implement **P0 then highest-leverage P1** changes. Prefer local improvements to a few strong interactions over adding many weak interactions. Preserve existing gameplay, visual assets, and internal APIs unless a change is needed and tested.
6. Re-run/check both normal path and at least one alternative path. Test sound muted, reduced motion if supported, reset/replay, basic keyboard/pointer support, viewport overflow, and load errors. Fix crashes, dead ends, unreadable contrast, and blocked exits.

**Mandatory owner review before**: major story/theme rewrite, new therapy-like mechanic, removal of core interactions, irreversible asset replacement, changing release/category facts, paid services, publishing as the owner, or changing submitted public URLs. For ordinary reversible code fixes and submission drafts, proceed.

### Phase B — Storyboard the *submission*, using what is actually playable

Create `submission/01_evidence_map.md`: each core claim → exact mechanic/scene/observed state → target submission medium → supported/uncertain. Use a matrix such as:

| Claim to communicate | Gameplay evidence | Best medium | Verification |
|---|---|---|---|
| Player can discover meaningful environmental consequences | Actual scene + input + visible response | Video clip + image | Test interaction end to end |
| Player can choose their pace | Actual pause/linger/branch behavior | Video + PDF | Demonstrate distinct paths |
| Sound/light/timing create atmosphere | Real runtime audio/visual transition | Video | Record from build |
| Brief restoration is an **intended** outcome | Coherent player flow and rationale; no measured outcome claim | Design Statement + PDF | Use “designed to / aims to” |

Do not write polished claims first and then invent footage to match. If an intended signature interaction is missing, decide whether a small implementation is feasible; otherwise cut the claim.

### Phase C — Export 4–7 entry images

Output `submission/images/` with **ideally six** intentionally sequenced images, but only 4–7 final uploads. Suggested shot plan, adapted to actual game:

1. `01_world_establishing.png` — world identity, focal composition, emotional promise.
2. `02_interaction_before.png` — meaningful affordance in context, no overlay explanation.
3. `03_interaction_response.png` — visible physical or spatial consequence of player input.
4. `04_discovery_or_choice.png` — agency, surprise, or a new relationship in the system.
5. `05_world_after_change.png` — accumulated state or natural ending, if implemented.
6. `06_portrait.png` — **portrait** composition showing the world effectively, not an ugly stretched desktop capture.

**Image acceptance:** capture real game states (screenshot, or accurately composed from actual game assets); preserve the art direction; JPG/PNG, RGB, ≤5 MB each, ≤15,000,000 pixels, portrait count ≥1; **no editorial caption text or explanatory callouts** on the upload images. Ordinary UI text naturally present in the game is fine. Do not depict interactions that cannot occur. Image 1 must work as a strong thumbnail.

Create `submission/images/manifest.md` with filenames, dimensions, bytes, real source scene, ordering, and capture/processing details. If portrait capture requires special responsive framing, implement/test the view or build a truthful composed visual from owned actual assets and flag that it is a composition, not gameplay capture. Do not fabricate a device mockup as evidence of an untested mobile experience.

### Phase D — Create 2-minute-max explanatory video

Create `submission/video/shotlist.md`, `submission/video/narration_or_subtitles.md`, and (if capture/edit tooling is available) a **finished playable MP4** in `submission/video/`. If actual video production is unavailable, provide a precise executable edit package (clips, clip timings, EDL/script, title cards, subtitle file) and mark export as incomplete.

**Recommended storytelling order, 80–110 seconds target, hard cap 120:**

1. **0:00–0:10 — The premise:** real establishing footage + one succinct line describing player situation and intent.
2. **0:10–0:30 — Enter & discover:** show basic interaction literacy and why the environment invites attention.
3. **0:30–1:05 — Signature interactions:** two or three actual before → action → after sequences, held long enough to understand physical feedback. Feature the strongest implemented moment.
4. **1:05–1:25 — Agency and recovery:** show a choice, a gentle surprise, or non-punitive adjustment where present.
5. **1:25–1:45 — The larger arc:** show how a small interaction connects to a changed world, quieter pause, or ending (only if shipped).
6. **1:45–1:55 — Plain-language positioning:** short closing frame, no unverifiable therapeutic claims.

These are flexible editorial suggestions, not iF rules. If the game has a different natural narrative, follow the game. Prefer real-time or moderately edited gameplay, with authentic sound and captions/voiceover that explain the **design**, not a cinematic trailer. English spoken words or subtitles. Keep text readable and music licensed/owned. Use standard 16:9 1080p/30fps only if convenient; this format is **our recommendation**, not an official iF spec. Verify duration and audio. Do not auto-upload to YouTube/Vimeo or pretend a local file is a public URL. Record the final hosted URL only after owner approval.

**Important future editability:** Treat the uploaded/hosted video as a frozen review artifact. Keep project files, edit decision list, source clips, and exact game version/commit. Do not assume a video platform can replace the underlying file while keeping the same public URL. The website may continue to iterate, but ensure the live build remains consistent with core submitted claims.

### Phase E — Optional PDF as concise slide-style design explainer

Create `submission/pdf/A_Little_Voyage_iF_2027.pdf` (≤8 English-language pages) **if production tooling exists**, plus editable source (`.pptx`, `.html`, `.md`, etc.). Landscape slides are a practical design recommendation, **not** an iF requirement. The PDF should add material that the 4–7 images or video cannot convey by themselves.

Suggested **7-page storyboard** (cut or adapt if unsupported):

1. **Project in one view:** purpose, core experience, and one excellent visual.
2. **Why this experience:** momentary pressure/tension → intended space for exploration and calm; avoid unsupported prevalence or measured impact.
3. **Core play loop:** approach → try → sensory/world response → notice → choose → continue/linger/leave; annotate real states.
4. **Signature micro-interaction:** 3–5 real frames of one interaction and why its subtlety matters.
5. **Agency & recoverability:** examples of actual choices, low-stakes consequences, alternate paths.
6. **Atmosphere as interaction:** spatial, visual, audio, rhythm, and feedback relationships; concrete art-direction choices.
7. **What makes it distinctive + delivery state:** explain differentiator, actual playability, public URL/launch plan if confirmed, and honest limitations.

Each page should be quickly scannable. Use consistent layout, generous type, beautiful authentic screenshots, limited text, and meaningful diagrams. Avoid bloated case-study sections, invented user interviews, vanity metrics, generic UI mockups, excessive theoretical citations, or repeating the entire video. Export and visually inspect every slide; verify **actual PDF page count ≤8**. Preserve editable source. No unverified environmental impact data.

### Phase F — Produce all portal text and metadata

Create **one source of truth**: `submission/entry-fields.md`, containing copy-ready **English** values and the measured character count for each field:

- Entry Name (≤50)
- Short category/entry-type rationale, actual realization stage, expected launch date (unconfirmed dates marked `OWNER INPUT`)
- **Design Statement (≤650)**
- **Idea (≤650)**
- **Form (≤650)**
- **Function (≤650)**
- **Differentiation (≤650)**
- **Sustainability (≤650)**
- Target group, market regions, free/paid/retail price if applicable; note which are controlled selections rather than free text.
- Project URL and video URL **only if genuinely live**.
- Designer and Client / Manufacturer credits **pending written clarification**; draft a conditional entry but do not hardcode a made-up legal entity.
- Optional sustainability questions: only when supported. Eco-labels blank unless valid.

**Writing rules:**
- Each field serves a different purpose; avoid repeating the same generic “immersive and soothing experience” across all six.
- Prefer concrete user action → perceptible response → intended benefit. Distinguish intention from demonstrated outcomes.
- The jury can see images; use scarce characters for otherwise invisible structure and design reasoning.
- Do not announce awards, compare to named competitors without evidence, or invent testing, collaborators, market uptake, technical achievements, clinical effects, sustainability numbers, or release status.
- Verify length **including spaces and punctuation** using a small script (`len(text)` for simple English ASCII; handle Unicode explicitly if needed). Aim for ~500–620 characters for paste safety; hard fail over 650.
- Deliver final English copy plus a short Chinese explanation of your editorial choices in a separate section, not inside the submission text.

### Phase G — Validate and package

Under `submission/`, deliver these paths (or mark them clearly blocked; never fake files):

```text
submission/
  STATUS.md                      # audit, implemented fixes, risk, remaining blockers
  01_evidence_map.md            # claims -> real proof -> medium
  entry-fields.md               # paste-ready portal fields + character counts
  images/
    01_world_establishing.png
    02_interaction_before.png
    03_interaction_response.png
    04_discovery_or_choice.png
    05_world_after_change.png
    06_portrait.png
    manifest.md
  video/
    shotlist.md
    narration_or_subtitles.md
    source_clips/               # if captured
    A_Little_Voyage_iF_2027.mp4 # if actually exported
    project_source/             # EDL / editing source / scripts
  pdf/
    A_Little_Voyage_iF_2027.pdf # if actually exported
    editable_source/            # if created
  SUBMISSION_CHECKLIST.md
  HANDOFF.md
```

File names above are an **organizational target**, not evidence that they already exist. Remove unused placeholder paths from the actual final manifest; do not create empty `.mp4` or `.pdf` files merely to satisfy a checklist.

Run automated checks where available:
- Build succeeds; browser opens; main experience fully playable; key scenes/branches and reset/exit checked.
- Images: 4–7 valid files, RGB, ≤5 MB/file, ≤15 MP/file, ≥1 portrait, no added captions.
- PDF: English, opens, ≤8 pages, renders without overflow; adds information.
- Video: finished file only if genuinely exported, plays, ≤120 seconds, English spoken/subtitles, authentic footage, audio levels sensible. Public URL independently confirmed once provided.
- Written fields: six entries under 650 characters, name under 50; no unsupported claims.
- Web: public/reliable page if deployed; no accidental auth wall; functional on target browser; English; link remains available for evaluation.
- Credits and launch status explicitly marked as owner-dependent if not confirmed.
- At least one strong end-to-end capture showing an **actual interaction** and the resulting **world change**.

**Final deliverable:** `submission/HANDOFF.md` with (1) summary of code changes and actual functionality, (2) screenshots/video/PDF paths and previews, (3) requirements validation results, (4) paste-ready links and character counts, (5) blockers/owner decisions, (6) portal steps remaining. Use a short P0/P1/P2 list. Include current commit hash or reliable version marker if available.

---

## 5. Deadlines and priority logic

Work in this order when time is limited:

**P0 — Absolutely critical:** accessible/playable experience; no critical bugs or misleading claims; accurate registration fields; at least four compliant real images including one portrait; required portal fields & truthful credits resolution; actual owner registration/payment before deadline.

**P1 — Highest-value supporting material:** one complete gameplay video demonstrating meaningful interaction; concise descriptions aligned to iF criteria; public URL consistency; a few carefully chosen polish improvements.

**P2 — Optional enrichment:** PDF (≤8 pages), extra screenshots, extended alternative-flow demonstrations, visual refinements that do not risk stable functionality.

**Decision policy:** If a P2 deliverable competes with finishing a robust playable experience or the required portal materials, stop P2. If the video cannot be exported correctly, produce ready-to-use shotlist/clips rather than compromising the core experience. Report trade-offs, but make a reasonable default choice on local, reversible improvements and continue working.

---

## 6. Issues the owner must verify (do not decide silently)

- **Credits:** iF form calls both “Designing Company” and “Client / Manufacturer Company” mandatory. An email has been drafted to ask whether an independent, self-initiated, individually launched digital project may list **Zixiong Wei** in both fields. Until answered, label both values as **pending iF confirmation**. Do not create an imaginary studio or claim an employer/university as sponsor.
- **Launch:** independent public launch is intended; use the real anticipated release date / realization status. Official guide distinguishes non-Concept work expected to launch by end of 2027.
- **Tag/subcategory:** formal 8.03 is fixed for this brief; narrower tag should be selected based on actual interaction and owner preference. Do not self-reclassify as medical treatment.
- **Public URLs:** must be actual and usable. Never invent a project URL or video link; never publish to owner's accounts or pay without explicit authorization.
- **Evidence:** only completed mechanics belong in submitted visuals and claims; never present sample mockups, unimplemented interactions, or proposed research as launched functionality.

---

## 7. Completion standard

You are done when you have **actually improved and verified the playable work**, delivered all required and realistically feasible supporting submission assets, and produced a handoff an independent designer can follow to finish the portal without guessing. If blocked by absent tooling or permissions, deliver the most complete authentic package possible and state exactly what could not be finished.

**Start now:** inspect project docs + repository → run game → produce evidence-based gap list → implement P0/P1 fixes → capture authentic artifacts → draft and validate portal content → hand off. Keep progress documented under `submission/STATUS.md` throughout.
