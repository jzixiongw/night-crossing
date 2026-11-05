# Night Crossing — current claim and evidence map

Source: main `41d8e91e607775152d59d7cf0a8ab0e4a6c105bf`. This map replaces the early Canvas2D baseline. Source inspection and staged captures establish the mechanisms below; they do not establish player outcomes.

| Submission claim | Current implementation | Candidate evidence | Limit |
|---|---|---|---|
| A living-lamp delivery gives the visit a reason to begin | `src/state/journey.ts`, `src/ui/guide.ts`, `src/rooms/green.ts`, `src/rooms/hatch.ts` | 07, 08, 14, 15 | Staged fixtures make later states quickly available; no continuous-flow claim |
| A delivery changes the world outside | `src/state/voyage.ts`, `src/three/rooms/hatch-port.ts`, `src/three/rooms/hatch-visitor.ts` | 14, 15, 18 | A still cannot communicate the whole timed handover; use video or live play |
| Small physical actions reveal local rules | `src/rooms/cabin.ts`, `src/three/rooms/cabin.ts` | 02, 03 | Actual held-pointer and drawing actions; captures must show fog/stroke visibly |
| Light affects what can be seen | `src/three/rooms/cabin.ts`, `src/three/rooms/green.ts`, `src/rooms/dome.ts` | 01, 05, 06, 12 | Screenshots show states, not a measured emotional effect |
| The chart and voyage share one geography | `src/data/chart.ts`, `src/state/voyage.ts`, `src/ui/chart.ts` | 04 | Destination order and voyage persistence are implemented; full regression remains separate |
| Players can linger in other activities | `src/rooms/galley.ts`, `src/rooms/radio.ts`, `src/rooms/dome.ts` | 09–13 | Mature dough, tune and star-line fixtures are documented in capture metadata |
| Spatial material language extends into the UI | `src/three/view.ts`, `src/ui/paper.ts`, `src/ui/sheet.ts` | 01, 04, 07, 09 | No claim that it uses scanned or handmade physical assets |
| Actual portrait layouts exist | Per-room `portrait` camera definitions and responsive CSS | 16–18 | These are actual portrait viewports, without device mockups |
| Sensory controls are available | `src/boot.ts`, `src/ui/settings.ts`, `src/state/store.ts` | Controls visible in screenshots; source inspection | Do not claim comprehensive accessibility certification |
| Progress is saved | `src/state/save.ts` | Source inspection; existing test scripts | Standalone local storage; optional host storage means do not claim all saves never leave the device |
| A quiet break and renewed interest in small acts of care | Experience rationale | Portal Idea and Design Statement | Design intention only; no measured wellbeing benefit |

Do not reuse the obsolete claims of a 240 KB build, pure 2D rendering, six rooms, no voyage timing, or guaranteed offline operation. Do not invent research, user numbers, environmental metrics or launch facts.
