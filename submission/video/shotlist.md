# Video Shot List — ≤120 s

**Target 104 s. Hard cap 120 s (iF).** 16:9, 1920×1080, 30 fps. English subtitles burned in **and** supplied as `.srt`.

**Capture rule:** every frame is live screen capture of the built game at `?lang=en`. No mock-ups, no composited UI, no stock footage, no stand-in interactions. Record with the game's own audio (synthesised at runtime — there are no sound files to licence, which is also why the music question is moot).

**Before recording:** run `npm run build && npm run preview`, open at 1920×1080, **and do not pass `?debug`** — the time-speed control must not appear on screen. Play at ×1 throughout; where a shot needs grown plants, grow them in a prior session and reuse that save.

| # | In | Dur | Shot | What must be legible | Evidence |
|---|---|---|---|---|---|
| 1 | 0:00 | 10 s | Door screen, then Board. Hold on the cabin as it resolves. | The title, and that boarding is a choice with a muted option beside it. | A8 |
| 2 | 0:10 | 12 s | Cabin. Pull the lamp cord twice, slowly, one beat between. | The reflection receding and the starfield coming up *as the room darkens* — the trade, not just a dimmer. | A1 |
| 3 | 0:22 | 16 s | Porthole. Press and hold; the fog disc grows. Release. Then drag a slow line through it. | The hold → fog → drag → stars-through-the-stroke chain, held long enough to read as cause and effect. **This is the shot the entry turns on. Do not cut it short.** | A2 |
| 4 | 0:38 | 10 s | Galley. Fill the kettle, set it on the stove, light it, pour into the cup. | That these are separate, ordered physical steps, not one "make tea" button. | — |
| 5 | 0:48 | 14 s | Greenhouse, plants already grown. Turn the grow lamp OFF. Move the pointer slowly beside a plant, hold. Then move it sharply. | The lean toward a slow hand, then the leaves shutting on a fast one. Let the lean complete before moving fast. | A3 |
| 6 | 1:02 | 14 s | Dome. Turn the small lamp off. Hold still — faint stars resolve. Join three stars, then run a line out to empty sky and leave it. | That stillness is the input, and that the last line is *left hanging on purpose*. | A4, A5 |
| 7 | 1:16 | 10 s | Close the tab. Reopen. The "while you were away" sheet. | That the ship ran on without the player, and reports it plainly. | A6 |
| 8 | 1:26 | 10 s | Open the ticket. Scroll the rows. | That every row is this voyage's own state — and that nothing is scored. | A10 |
| 9 | 1:36 | 8 s | The ending card. Hover the five invitations; rest on "Do nothing". | Rest is a listed, equal option. | A7 |
| 10 | 1:44 | 8 s | Hold on the cabin, lamp low, then fade. Title card. | Closing frame, no claim. | — |

**Total 1:52.** If it runs long, cut shot 4 to 6 s and shot 10 to 5 s — never shot 3, 5 or 6.

## Title card (final frame, 6 s)

```
A Little Voyage  /  Night Crossing          ← use the chosen entry name only
A short web experience. Painted at runtime, no bitmap art.
English and Chinese.  No account, no tracking, nothing to finish.
```

Do **not** add: awards, "award-winning", a studio name, a release date, download counts, or any wellbeing claim.

## Audio

Use the game's own output. Keep speech peaks around −12 dBFS and the game bed around −24 dBFS if a voiceover is added; the subtitle track alone satisfies iF, and the piece is quiet by design — a voiceover competing with it would misrepresent it.

## Editing source to keep

`submission/video/project_source/` should end up holding the EDL or project file, the raw clips, and the exact build identifier used. **The hosted video is a frozen artefact:** platforms do not let you replace the file behind a URL, so the site may keep iterating but the submitted video must stay true to the submitted claims.
