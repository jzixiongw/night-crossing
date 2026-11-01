# Night Crossing — Voice Contract

The single source of truth for every word a player reads. If this file and a
habit disagree, this file wins.

Companion files: [CLAUDE.md](../CLAUDE.md) loads the hard rules into every
session; `npm run voice` checks the build mechanically; the skill in
`.claude/skills/night-crossing-voice/` loads this document before any copy work.

---

## 中文速查

**一、文字只写画面给不了的东西。**
船舱、炉子、花盆都画在屏幕上了。再用文字数一遍，等于什么都没说。文字要给的是
画面装不下的：气味、温度、声音、刚才发生过什么、看不见的规则。

**二、禁止列举。一句话里只出现一样东西。**
不写"水龙头、炉子、三罐茶叶，还有一袋面粉"。挑一样最值得说的，或者一样都不说。

**三、不准向玩家解释这个游戏有多宽容。**
"没有什么会坏""不做也可以""等的时候你不必在""不喷也行"——全部删掉。
玩家不是来读说明书的，也不是三岁小孩。船本来就不会罚你，不用它自己说出来。
该让玩家知道的，用事情本身说：船自己走了四十分钟，就报这四十分钟。

**四、句子要短，但不能"省"。**
省掉的是形容词、抽象词、比喻；留下的是主语、动词、"的""了""会"这些让句子
站得住的字。英文尤其：丢了主语和动词就变成电报体。口语句必须用缩写（it's /
don't / you'll）。

---

## 1. Why this file exists

An LLM asked for "concise, concrete, restrained" prose optimises the wrong
number. It counts words and assumes that fewer words means easier reading.
Those are two different axes:

```
                  easy to read
                       ^
   plain long          |          THE TARGET
   "You can leave it   |   "The lamp is on, so the
    there and come     |    window only shows the room."
    back later."       |
  ---------------------+---------------------> few words
                       |
   verbose, abstract   |   "Afterwards, only the light."
   "The affordance     |   "Few beacons, amber and teal."
    persists across    |   "Most of a kettle."
    sessions."         |
                       v
                  hard to read
```

The bottom-right quadrant is where a compression-seeking model lands. The copy
looks disciplined. It reads as a telegram: cold, effortful, and worst for the
people least able to absorb the cost — anyone reading in a second language.

**The correcting principle:**

> **Spend words on grammar. Save words on content.**
>
> Grammar words — the subject, the verb, articles, auxiliaries, *that*, *and*,
> *so* — are nearly free to read. The eye passes over them. Keep them all.
>
> Content words — adjectives, abstractions, metaphors, rare nouns — are what
> cost the reader. Cut those instead.

A sentence is allowed to get longer if the added words are grammar. It is not
allowed to get longer by one adjective.

---

## 2. What the text is for

Every room is painted. The player can see the tap, the stove, the pots, the
bench. **Text that names what is already on screen has said nothing.** It is
the single most common way to waste a line.

A line earns its place only by carrying what the picture cannot:

| The picture cannot show | So the text can say |
|---|---|
| smell | The galley always smells faintly of bread. |
| temperature | The greenhouse is warmer than the rest of the ship. |
| sound, or its absence | The radio room is quiet, apart from the hum the machines make. |
| a rule you would otherwise learn by failing | With the lamp on, the glass only shows the room behind you. |
| what happened here before | There really was a wharf there once. |
| what is about to happen | It needs about twenty minutes. |
| what someone else thinks | I'm in no hurry with the chart. |

**The model line in this game** is the cabin: *"With the lamp on, the glass
only shows the room behind you."* It names nothing you can see. It teaches the
one rule the room runs on. Write every room description against that line.

### No lists. One thing per sentence.

> **Hard rule: never name more than one object in a sentence.**

Not "a tap, a stove, three jars of tea and a sack of flour". Not "the cabin,
the galley, the greenhouse and the radio room". Not "shoulders, neck, whatever
is tight". Not "a chair, a pillow, the floor".

A list is the writer refusing to choose. Pick the one detail worth having and
drop the rest — the picture is already holding the others. This applies
everywhere: room descriptions, letters, dialogue, settings, menus, notices.

Counts are not lists: *three jars of tea* is fine, *beacons in all three
colours* is fine. Naming the three is not.

---

## 3. What the text is not for

### Do not explain the design to the player.

The ship is forgiving. It should never say so. The moment the copy announces
its own kindness it turns into a product page, and it starts addressing the
player as someone who needs reassuring.

| Delete | Why |
|---|---|
| Nothing breaks. | The player will find that out by touching things. |
| There's no countdown and nothing to fail. | Marketing copy wearing a diegetic hat. |
| You don't have to be here while they take it. | Nobody asked. |
| Nothing spoils because you weren't here. | Says the quiet part loudly. |
| Sleep if you're tired. | Not the game's business. |

Say it with the mechanism instead. When the player comes back after forty
minutes, report the forty minutes: *"You looked in. For those 40 minutes, the
ship kept going."* That is the same idea, delivered as news rather than as a
promise, and it only appears to someone it actually happened to.

### Do not hand out permission.

> **Hard rule: no "X, or not" construction. Anywhere.**

The pattern is *you may do this, and you may equally not*. In Chinese it wears
也行 / 也可以 / 也挺好 / 不…也行 / 都行; in English it wears *or don't*, *or
not*, *is also fine*, *you don't have to*, *no need to*, *whatever you like*,
*anywhere will do*.

| Don't | Do |
|---|---|
| 架子上有三罐茶叶，挑一罐。不挑也行，就喝白水。 | 挑一罐。开罐的时候味道最冲。 |
| 适合晾衣服，也适合不晾。 | *(cut the line)* |
| 好。看见什么都行，看不见也行。 | 好。灯一暗，窗外就清楚了。 |
| 想写就写，不想写就留着，夹在哪里都行。 | 背面还没写过字。 |
| It doesn't have to be boiling. Warm will do. | Drink it slowly. |

Every one of these is the designer leaning into frame to say *it's okay*. It
reads as anxious, and it is the opposite of restful: a game that keeps
reassuring you sounds like it expects you to be worried.

An option is offered by **existing**, not by being blessed. The button that
says *do nothing* is a choice; the line that says *doing nothing is also fine*
is an apology for it.

---

## 4. The nine tells

Specific moves to catch. Naming them is the point: "write more warmly" changes
nothing; "you dropped the verb in line 4" does.

### 1. The verbless fragment
A noun phrase standing where a sentence belongs. The reader has to supply the
predicate.

| Don't | Do |
|---|---|
| Through a pink-green fog. | The ship goes through a pale blue-green fog. |
| Most of a kettle. | The kettle is nearly full. |
| Still heating. | The water is still heating. |

Fragments are not banned outright. One, placed deliberately, lands. Six in a
row is a style, and this is not that style. **Cap: at most one fragment per
screen of text, and never two in a row.**

### 2. The dropped subject
| Don't | Do |
|---|---|
| Cooled a little. About right. | It's cooled a little. About right to drink now. |
| Saw your ship out the porthole. | I saw your ship out the porthole. |

Exception: imperative UI labels keep their implied *you* — `turn the lamp off`
is correct.

### 3. Stripped function words
| Don't | Do |
|---|---|
| Lane conditions as follows. | Here is how the lanes are tonight. |
| No knowing whose. | Nobody knows whose it was. |

### 4. Inversion for cadence
| Don't | Do |
|---|---|
| Afterwards, only the light. | Now there's only the light. |
| Reaching them is enough. | *(cut — see §3, this is permission in a wig)* |

### 5. Contraction avoidance
The single largest source of coldness in English. A character who never says
*I'm* is not a person; they're a notice board.

Contractions are **required** in spoken lines (An, letters from people, the
radio) and **allowed** in narration. They may be dropped only in the
deliberately official register — the Harbour Authority, the Ship's Office, the
noticeboard — where the stiffness is the joke.

### 6. The rarer shorter word
| Don't | Do |
|---|---|
| The dough has proved. / proofing box | The dough has risen. / rising box |
| They are afraid of quickness. | They don't like being rushed. |
| A few of them brighten in spells. | A few of them brighten now and then. |

Test: would a fifteen-year-old reading English as a second language know this
word? If not, and a common word exists, use the common word.

### 7. The closing aphorism
Ending a paragraph on a portable little truth. It reads as the writer stepping
forward to be admired — and it is usually permission (§3) in disguise.

| Don't | Do |
|---|---|
| So it goes. | *(cut)* |
| It can live anywhere. | *(cut)* |
| 到了就好。 | *(cut)* |

### 8. Antithesis and the rule of three
*Not X, but Y.* *A, B, and C.* Both are rhetorical furniture, and the rule of
three is also a list, which §2 already bans. 面团要等，种子要等，信也要等 went
for exactly that reason.

### 9. Dashes and colons as rhythm
An em dash is a pause the writer asks for. Use a full stop, or *and*, or *so*.

> **Font note, not style:** ZCOOL XiaoWei maps `'` `"` `"` to full-width CJK
> glyphs, which blow a 41px hole through an English word. **Straight quotes and
> straight apostrophes only, in both languages, in keys and in values.**

---

## 5. Where the warmth actually comes from

Not from adjectives, not from reassurance, and never from telling the player
how they feel. Three places only:

**The world answers.** Every action gets a reply from an object, in a complete
sentence, in the same breath. The glass fogs. A leaf closes. The dial's eye
shuts. The reply is news about the object, not approval of the player.

**Somebody is working nearby.** An is drawing a chart she will never deliver.
The lighthouse keeper reads out ship names at night. Letters arrive from people
the player will never meet, who are busy with their own small thing. Warmth is
company, and company is other people being occupied — not other people
attending to you.

**The report, not the promise.** The ship kept going for forty minutes; the
dough rose a size; a light went past the window while you were busy. Telling
someone what happened while they were away is warm. Telling them in advance
that it would be all right if they left is not.

And the rule that was always right: **never name the feeling.** The copy says
what the lamp did. It never says you feel less alone.

---

## 6. Register map

| Voice | Where | Sentence | Contractions | Notes |
|---|---|---|---|---|
| **An** | her dialogue | short, spoken | **required** | A working cartographer, not a sage. She answers and goes back to her chart. She never comments on you, and never gives you permission. |
| **Narration** | room descriptions, action results | complete, 8–16 words | allowed | Present tense. One object per sentence. Reports what the picture cannot show. |
| **UI label** | buttons, hit targets | noun or imperative, lowercase | n/a | `lamp cord`, `turn the lamp off`. No full stops. |
| **Letters** | mail | 2–3 short paragraphs | required, except official senders | Each is a person busy with their own thing. |
| **Official** | Harbour Authority, Ship's Office, noticeboard | clipped on purpose | dropped on purpose | Real ship's business — stove, rail, mail times. Not the design philosophy. |
| **Radio** | station lines | spoken aloud, plain | required | Written to be heard, not read. |

---

## 7. Numbers

Targets, not laws. `npm run voice` reports against these.

- **Objects named per sentence:** 1. Never 2.
- **Sentence length:** 8–16 words. Over 20, split it.
- **Fragments:** under 5% of sentences in the English table.
- **Permission constructions:** 0.
- **Contraction coverage:** every uncontracted `it is` / `do not` / `I am` in a
  spoken line is a defect.
- **Chinese:** clauses under about 20 characters between punctuation. No 书面语
  connectives (之 / 其 / 乃 / 并非…而是 / 亦 / 则 / 皆 / 旨在).

---

## 8. The gate

Before any copy change lands:

1. `npm run voice` passes with no errors.
2. For each line, ask: **is any of this already on screen?** Cut that part.
3. Then ask: **am I telling the player it's okay?** Cut the whole line.
4. Read it out loud. Anything you stumble on is wrong, however good it looks.
5. Check the line didn't acquire a feeling. If it names what the player feels,
   cut back to the object.

---

## 9. How the i18n table works

`src/i18n/en.ts` is keyed by the **exact Chinese source string**. A key that
doesn't match character-for-character silently falls through and renders as
Chinese in the English build.

So: **changing a Chinese string means changing its English key in the same
commit.** Use `tools/retext.mjs` with a mapping file — it rewrites the source
and the key together and refuses to run if either side would be left orphaned.
`npm run voice` fails on any orphan.
