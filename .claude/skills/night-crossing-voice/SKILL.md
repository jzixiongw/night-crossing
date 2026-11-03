---
name: night-crossing-voice
description: Explicit request only. Load when the user asks in so many words for a voice pass, a copy rewrite, a translation pass or a review of Night Crossing's writing — or invokes /night-crossing-voice. Do not load for ordinary feature work, bug fixes, or one-off string edits, and do not apply these rules or run `npm run voice` unasked.
---

# Night Crossing voice

You are here because the user asked for a copy pass. Outside one, none of this
applies.

## The gate comes first

```sh
npm run voice
```

Run it on what you wrote before you read anything. It flags lists, permission
clauses, verbless fragments, missing contractions, em dashes, long sentences,
formal Chinese, curly quotes, orphaned and unused keys. Errors must be zero.
Warnings are a reading list — judge each one, and record a deliberate
exception in `tools/voice-allow.json`.

Then read the changed lines out loud. Anything you stumble on is wrong,
however good it looks on the page.

## The four the checker cannot see

1. **Text says only what the picture cannot.** Every room is painted. Listing
   what is in it has said nothing. Carry the smell, the temperature, the
   sound, the history, or the rule the room runs on.
2. **One object per sentence.** A list is the writer refusing to choose.
   Counts are fine; naming the items is not.
3. **Never tell the player it's okay.** The ship is forgiving and must never
   say so; a game that keeps reassuring you sounds like it expects you to be
   worried. Say it with the mechanism — report the forty minutes that passed.
4. **Spend words on grammar, save words on content.** Asked for concise and
   restrained, a model counts words and assumes fewer means easier reading.
   Those are different axes. Keep every subject, verb, article and auxiliary;
   cut adjectives, abstractions and metaphors instead.

## Which voice you are writing

`docs/VOICE.md` §4 is the register map. Briefly: **An** is a working
cartographer and always uses contractions; **narration** is complete
present-tense sentences that report the object and never the feeling; **UI
labels** are lowercase nouns or imperatives with no full stop; **letters** and
**radio** are spoken, so they contract too; only the **Harbour Authority,
Ship's Office and noticeboard** are allowed to be stiff.

## Reach into docs/VOICE.md when you need it

Reference, by section — not required reading end to end.

- §2–3 what the text is for, and the two hard bans in full
- §4 the nine tells, in the order they show up
- §5 where the warmth actually comes from
- §6 register map · §7 numbers · §9 the i18n table

## The i18n coupling

`src/i18n/en.ts` is keyed by the exact Chinese source string. A key off by one
character — a curly quote where the source has a straight one — falls through
silently and renders as Chinese in the English build. Change Chinese with
`node tools/retext.mjs mapping.json`, which rewrites the source and the key
together. Never hand-edit a Chinese string in `src/` without doing the key.

## What not to do

- Do not "improve" copy by compressing it. That is the failure this skill
  exists to prevent.
- Do not add an adjective to add warmth, and never add reassurance.
- Do not touch `submission/` unless the user asks for a submission pass.
