# Entry Fields — paste-ready portal values

**Single source of truth for the portal.** Every free-text value below is the exact string to paste; the count is `len()` of that string including spaces and punctuation, which is what iF counts. Limit is 650; all six sit in the 500–620 paste-safe band.

**Entry ID:** 830003 · **Award:** iF DESIGN AWARD 2027 · **Deadline:** 2026-11-04 23:59 PST

> **Nothing below claims a measured effect, a test, a user count, a launch, or a sustainability figure.** Every assertion traces to a mechanic in `submission/01_evidence_map.md`.

---

## 1. Fields still needing the owner

| Field | Value | Status |
|---|---|---|
| **Entry Name** (≤50) | `A Little Voyage` (15) **or** `Night Crossing` (14) | **OWNER INPUT.** The live build says *Night Crossing* everywhere — brand, door screen, ticket, title. Whichever is chosen, the build and the portal must match; changing the build is a ~20-minute job. |
| **Designing Company** | `OWNER INPUT — pending iF confirmation` | iF marks it mandatory. Self-initiated individual project; an email asking whether Zixiong Wei may appear in both company fields is unanswered. **Do not invent a studio.** |
| **Client / Manufacturer** | `OWNER INPUT — pending iF confirmation` | As above. |
| **Designer credit** | `Zixiong Wei` | Independent designer, sole author. |
| **Project web URL** | `OWNER INPUT` | Nothing is deployed. Must be live and reachable from Germany for the whole judging period. |
| **Video URL** | `OWNER INPUT` | Optional. Only fill in once genuinely public (YouTube or similar reachable in Germany). |
| **Launch date / realization** | `Functional prototype; independent public launch intended by end of 2027` | **Not launched.** Never mark as released. |

## 2. Fixed selections

| Field | Value |
|---|---|
| Discipline | User Experience (UX) |
| Category | 8.03 Entertainment / Gaming UX |
| Entry type | Digital product / interactive web experience |
| Degree of realization | Functional prototype, publicly playable build |
| Target group | Adults who want a short, low-pressure interactive experience; no age gate, no prior gaming skill assumed |
| Market region | Global; interface in English and Chinese |
| Price | Free, no account, no in-app purchase |
| Eco-labels | **Leave blank** — none apply |
| Sustainability questionnaire | Optional; answer only what is demonstrable (see §3 Sustainability) |

## 3. Free-text fields

Paste exactly as given.

### Design Statement — 534 / 650

```text
A short web experience aboard a ring-shaped night ship. You walk a corridor between six rooms and use ordinary things: pull a lamp cord, boil a kettle, breathe on a porthole and draw in the condensation, punch a music-box tape, join stars into lines. Every room runs on a rule you can find rather than be told. There is no timer, no score and nothing to fail; dough, seeds and letters go on without you and are waiting when you return. Designed to make room for a quiet half hour, it offers rest as a real ending rather than a reward.
```

*Why this: What it is, who it is for, what it does, and the design value that is not visible in a screenshot (persistence, no-fail, rest as an ending).*

### Idea — 550 / 650

```text
People reach for their phone when they are wound up, and are handed feeds built to keep them there. This is the opposite proposition: a small world that is finished with you when you want to leave. The premise is that attention recovers through doing something understandable, not through being soothed at. So the ship is made of chores - heating water, watering a plant, tuning a radio - placed somewhere strange enough that a familiar action becomes worth looking at again. Nothing asks the player to report a mood, and nothing claims to treat one.
```

*Why this: Problem and relevance without a prevalence statistic or a health claim. States the opposite-of-a-feed premise and closes by naming two things the work deliberately does not do.*

### Form — 575 / 650

```text
Every frame is painted at runtime on a 2D canvas. There are no sprite sheets and no bitmap art: objects are built from stacked offset fills - light face, body, shadow, rim - finished with a soft-light pass, so nothing carries an outline. Light is composited, not drawn: a cold wash covers the room and each lamp punches a soft hole in it, which is why a warm pool reads as warm. Rooms sit in depth layers that drift at different rates under the pointer, giving 2.5D space from flat shapes. Audio is synthesised live; there are no sound files. The whole build is about 240 KB.
```

*Why this: Spends its characters on what the images cannot show: that there is no bitmap art at all, and that light is a compositing pass rather than a painted glow.*

### Function — 587 / 650

```text
Canvas has no DOM targets, so hit regions, a drawn focus ring and Tab-and-Enter traversal are implemented directly; a "what's touchable" control labels everything on request. Sound can be declined at the door, before the work begins, and reduced motion is honoured from the system setting. Every input answers in the world - the glass fogs, a leaf closes, a dial's magic eye shuts on station. Progress saves continuously and survives closing the tab. The layout adapts from 16:9 to portrait by cropping toward each room's focal point rather than shrinking the scene. English and Chinese.
```

*Why this: Usability, accessibility and reliability, each tied to a concrete implementation rather than an adjective.*

### Differentiation — 519 / 650

```text
Ambient pages are watched; casual loops pay out on a schedule. This does neither. Its rules are discoverable and have costs: brighten the cabin and the window stops showing you the stars; turn the grow lamp off and the plants lean toward a slow hand instead, closing if you hurry; faint stars appear only once the lamp is off and your eye stays still. A star-line may be left hanging on empty sky, waiting for a variable star that may never brighten. The ticket you leave with records what you did and rates none of it.
```

*Why this: Three named rules with real costs, plus the hanging star-line and the non-rating ticket. No competitor is named and no superiority is claimed beyond the stated mechanics.*

### Sustainability — 546 / 650

```text
Social design conduct rather than measured impact. There are no accounts, no analytics, no advertising and no notifications; the voyage is stored in the browser and never leaves it. There is no streak, no daily login, no completion meter and no mechanic that penalises stopping - the ending offers five small suggestions including doing nothing. Personal disclosure is invited twice and declinable both times, with no penalty in content or ending. Technically it is light: around 240 KB, no bitmap or audio files, and it runs offline once loaded.
```

*Why this: Opens by refusing the impact framing, then lists only verifiable conduct: no accounts, no analytics, no coercive retention, declinable disclosure, light build.*

---

## 4. 中文说明 — 这六段是怎么写的

**不放进提交文本，仅供你审阅取舍。**

- **分工，不重复。** iF 六个字段最常见的失败是六段都在说"沉浸、治愈、温柔"。这里每段只负责一件事：Design Statement 说"是什么"，Idea 说"为什么值得做"，Form 说"看不见的技术与美学决定"，Function 说"可用性与可靠性"，Differentiation 说"规则上的不同"，Sustainability 说"可验证的行为"。

- **把字符花在图片看不见的地方。** 评委能看见画面好看，所以 Form 不描述"温暖的灯光"，而是说**全程无位图资产、光是合成通道**——这是截图无法传达、却决定了整套美术的事实。

- **规则优先于形容词。** Differentiation 写了三条有代价的规则（开灯就看不见星星／关掉生长灯植物才找你的手／暗适应需要手不动），因为"可发现且有取舍的规则"正是这个作品区别于氛围网页和休闲循环的地方，也对应 Kickstart 里的 G1/G2/M5。

- **严格区分意图与效果。** 全文没有一句"降低焦虑""帮助用户放松"。Design Statement 用的是 "Designed to make room for"，这是设计意图，不是疗效声明。没有做真人研究，就一个字都不提测试、访谈、用户数。

- **Sustainability 不编数字。** 没有碳排、没有能耗、没有"提升福祉 X%"。第一句就主动声明这是 **design conduct rather than measured impact**，然后只列可查证的事实：无账号、无分析、无广告、无推送、无连续登录、无完成度条、个人披露可拒绝两次、约 240 KB、离线可用。诚实本身在这一项上比编造更有说服力。

- **未发布就说未发布。** Launch 一栏明确写 functional prototype + 计划 2027 年底前独立上线。iF 允许功能原型参赛；谎报已发布则是实质性风险。

- **留白处是真的留白。** 公司名、网址、视频链接全部标 `OWNER INPUT`，因为它们要么等 iF 回复，要么等你授权部署。我没有替你填任何一个。
