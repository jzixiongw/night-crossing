---
name: night-crossing-voice
description: Load before writing, rewriting, translating or reviewing any player-facing copy in the Night Crossing game — English strings in src/i18n/en.ts, Chinese tr('…') strings anywhere in src/, UI labels and text in index.html, An's dialogue, letters, radio lines, room descriptions, button labels, or the door screen. Also use when asked to make the game's writing warmer, simpler, easier to read, less terse, less clipped, or less AI-sounding, and when checking copy before a commit or a build.
---

# Night Crossing voice

## Step 1 — read the contract

Read `docs/VOICE.md` in full before writing anything. It is short. Do not work
from the summary below; it exists only so you know what you are looking for.

It opens with two hard bans, because they are what the writing fails on:

**Text only says what the picture cannot (S2).** Every room is painted.
Listing what is in it has said nothing. Carry the smell, the temperature, the
sound, the history, or the rule the room runs on. And **never name more than
one object in a sentence** — a list is the writer refusing to choose.

**Never tell the player it's okay (S3).** No 也行 / 也可以 / 都行 / 不必, no
*or don't*, *you don't have to*, *nothing breaks*, *no countdown*. The ship is
forgiving and must never say so; a game that keeps reassuring you sounds like
it expects you to be worried. Say it with the mechanism instead: report the
forty minutes that passed, which is news rather than a promise.

Underneath those: when asked for concise, concrete, restrained prose, a model
counts words and assumes fewer words means easier reading. Those are different
axes. The fix is **spend words on grammar, save words on content** — keep
every subject, verb, article and auxiliary; cut adjectives, abstractions and
metaphors instead.

The nine tells it names, in the order they show up most:
verbless fragment - dropped subject - stripped function words - inversion for
cadence - contraction avoidance - the rarer shorter word - the closing aphorism -
antithesis and the rule of three - dashes and colons used as rhythm.

## Step 2 — know which voice you are writing

`docs/VOICE.md` §4 maps them. Briefly: **An** is a working cartographer and
always uses contractions; **narration** is complete present-tense sentences
that report the object and never the feeling; **UI labels** are lowercase nouns
or imperatives with no full stop; **letters** and **radio** are spoken, so they
contract too; only the **Harbour Authority, Ship's Office and noticeboard** are
allowed to be stiff.

## Step 3 — respect the i18n coupling

`src/i18n/en.ts` is keyed by the exact Chinese source string. A key that differs
by one character — including a curly quote where the source has a straight one —
falls through silently and renders as Chinese in the English build.

- Changing English only: edit the value in `src/i18n/en.ts`.
- Changing Chinese: write a `{"old":"new"}` mapping and run
  `node tools/retext.mjs mapping.json`. It rewrites the source string and the
  i18n key together, and refuses to run if either side would be orphaned.
- Never hand-edit a Chinese string in `src/` without doing the key.

## Step 4 — pass the gate

```sh
npm run voice
```

It reports fragments, missing contractions, banned register words, long
sentences, curly quotes, orphaned keys and unused keys. Errors must be zero.
Warnings are a reading list, not a pass/fail — judge each one.

Then read the changed lines out loud. Anything you stumble on is wrong, however
good it looks on the page.

## What not to do

- Do not "improve" copy by compressing it. That is the failure this skill exists
  to prevent.
- Do not add an adjective to add warmth, and never add reassurance. Warmth here
  is the world answering, somebody working nearby, and the report of what
  happened while the player was away. See §5.
- Do not touch `submission/` unless the user explicitly asks for a submission pass.
