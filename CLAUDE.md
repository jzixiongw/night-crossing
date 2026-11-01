# Night Crossing · 夜航

An atmospheric 2D web game, painted at runtime onto a canvas. See
[README.md](README.md) for the rendering architecture.

## Before you write a single word a player reads

Read [docs/VOICE.md](docs/VOICE.md) first. Not a summary of it — the file.
It governs `src/i18n/en.ts`, every `tr('…')` string, and the copy in
`index.html`.

The rules below are the ones that get broken most. They are not the whole
contract. The first three are hard bans.

1. **Text only says what the picture cannot.** Every room is painted. Naming
   the tap, the stove and the pots has said nothing. Say the smell, the
   temperature, the sound, the rule you would otherwise learn by failing. The
   model line is the cabin: *"With the lamp on, the glass only shows the room
   behind you."*
2. **Never name more than one object in a sentence.** No "a tap, a stove, three
   jars of tea and a sack of flour". No "the cabin, the galley, the greenhouse
   and the radio room". A list is the writer refusing to choose. Counts are
   fine; naming the items is not.
3. **Never tell the player it's okay.** Cut every 也行 / 也可以 / 都行 / 不必 /
   *or don't* / *you don't have to* / *nothing breaks* / *no countdown*. The
   ship is forgiving; it must never say so. Report what happened instead — "the
   ship kept going for 40 minutes" — which is news, not a promise.
4. **Spend words on grammar, save words on content.** Keep the subject, the
   verb, the articles, the auxiliaries. Cut adjectives, abstractions and
   metaphors instead. A longer sentence of ordinary grammar beats a short one
   with the verb dropped.
5. **No verbless fragments.** Not "Through a pale fog." — "The ship goes
   through a pale fog." At most one per screen, never two in a row.
6. **Contractions are required in anything spoken.** `I'm`, `don't`, `you'll`.
   An, the letters and the radio are people. Only the Harbour Authority, the
   Ship's Office and the noticeboard may be stiff.
7. **Common word over rare short word.** `rise` not `prove`. `now and then`
   not `in spells`.
8. **No closing aphorism**, and **never name what the player feels.** Report
   the lamp, the leaf, the water.
9. **Straight quotes and apostrophes only**, both languages, keys and values.
   The display font turns curly ones into full-width CJK glyphs.

## Editing copy safely

`src/i18n/en.ts` is keyed by the exact Chinese source string. Change a Chinese
string and its English key must change in the same edit, or the line falls
through and renders as Chinese in the English build.

```sh
npm run voice     # voice + i18n integrity check — must pass before committing
npm run typecheck
npm run build
```

Use `node tools/retext.mjs <mapping.json>` to change Chinese strings; it
rewrites the source and the i18n key together and refuses to orphan either side.

## Scope

Do not edit anything under `submission/` unless the user explicitly asks for a
submission or export pass. That pack is pinned to a baseline commit and
character-counted against portal limits.
