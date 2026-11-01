#!/usr/bin/env node
/* Voice and i18n integrity check for Night Crossing.
   Enforces what docs/VOICE.md can only ask for. Errors block a commit;
   warnings are a reading list.

     node tools/voice-check.mjs            report
     node tools/voice-check.mjs --quiet    errors only
     node tools/voice-check.mjs --all      do not truncate warning lists        */
import { readFileSync, existsSync } from 'node:fs';
import { CJK, CURLY, enTable, trStrings, htmlStrings, srcFiles } from './voice-lib.mjs';

const ALL = process.argv.includes('--all');
const QUIET = process.argv.includes('--quiet');
const CAP = ALL ? Infinity : 12;

const allow = existsSync('tools/voice-allow.json')
  ? JSON.parse(readFileSync('tools/voice-allow.json', 'utf8'))
  : { formal: [], fragments: [] };
const formalSet = new Set(allow.formal || []);
const fragSet = new Set(allow.fragments || []);
const listOk = new Set(allow.lists || []);
const permitOk = new Set(allow.permission || []);
/* Strings that stay Chinese in the English build by design -- the language toggle. */
const keepZh = new Set(allow.keepChinese || []);

const errors = [];
const warns = {};
const warn = (kind, msg) => (warns[kind] ||= []).push(msg);

/* ---------- 1. i18n integrity ---------- */
const { entries } = enTable();
const keys = new Map(entries.map(e => [e.key, e]));
const sources = [...trStrings(), ...htmlStrings()];
const seen = new Set();

for (const s of sources) {
  if (!CJK.test(s.raw) || keepZh.has(s.raw)) continue;
  seen.add(s.raw);
  if (!keys.has(s.raw)) {
    const near = [...keys.keys()].find(k => k.replace(/[‘’“”]/g, '"') === s.raw.replace(/[‘’“”]/g, '"'));
    errors.push(
      `orphaned key  ${s.file}${s.line ? ':' + s.line : ''}\n    source: ${JSON.stringify(s.raw.slice(0, 70))}` +
      (near ? `\n    table has a near-match that differs only in quote characters:\n            ${JSON.stringify(near.slice(0, 70))}` : '\n    no entry in src/i18n/en.ts -- it will render as Chinese in the English build')
    );
  }
}
for (const e of entries) if (CJK.test(e.key) && !seen.has(e.key)) warn('unused key', `en.ts:${e.line}  ${JSON.stringify(e.key.slice(0, 60))}`);

/* ---------- 2. straight quotes only ---------- */
/* The display face maps curly quotes to full-width CJK glyphs, which open a
   41px hole in the middle of an English word. */
for (const file of ['src/i18n/en.ts', 'index.html', ...srcFiles()]) {
  const text = readFileSync(file, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) return;
    if (CURLY.test(line)) errors.push(`curly quote  ${file}:${i + 1}\n    ${line.trim().slice(0, 100)}`);
  });
}

/* ---------- 3. English voice ---------- */
const AUX = `is are was were be been being am s re m ve ll d has have had do does did
  can could will would shall should may might must let`.split(/\s+/);
const VERBS = `go goes went gone come comes came take takes took put puts get gets got
  make makes made keep keeps kept hold holds held turn turns turned open opens opened
  close closes closed shut shuts fill fills filled pour pours poured boil boils boiled
  draw draws drew drawn ring rings rang rung grow grows grew grown water waters watered
  wait waits waited leave leaves left stop stops stopped start starts started
  look looks looked see sees saw seen hear hears heard smell smells smelled feel feels felt
  know knows knew sit sits sat stand stands stood lie lies lay sleep sleeps slept
  wake wakes woke read reads write writes wrote send sends sent arrive arrives arrived
  answer answers answered blink blinks blinked lean leans leaned
  rise rises rose risen bake bakes baked knead kneads kneaded spoon spoons spooned
  cut cuts plant plants planted press presses pressed drag drags dragged tap taps tapped
  click clicks clicked wind winds wound punch punches punched patch patches patched
  tune tunes tuned hang hangs hung join joins joined name names named cool cools cooled
  dry dries dried damp dampens dampened soak soaks soaked spread spreads
  pass passes passed cross crosses crossed carry carries carried bring brings brought
  give gives gave gave share shares shared break breaks broke drink drinks drank
  eat eats ate bite bites bit finish finishes finished steep steeps steeped
  catch catches caught light lights lit fade fades faded drift drifts drifted
  move moves moved walk walks walked run runs ran reach reaches reached
  need needs needed want wants wanted like likes liked mind minds minded
  sail sails sailed dock docks docked steer steers steered wave waves waved
  curl curls curled uncurl bend bends bent part parts parted sway sways swayed
  wipe wipes wiped clean cleans cleaned fold folds folded say says said tell tells told
  think thinks thought remember remembers remembered forget forgets forgot
  seem seems seemed belong belongs belonged stay stays stayed sink sinks sank
  float floats floated glow glows glowed shine shines shone fog fogs fogged
  change changes changed save saves saved lose loses lost find finds found
  show shows showed add adds added use uses used help helps helped
  hurry hurries hurried rest rests rested breathe breathes breathed
  enter enters entered taste tastes tasted climb climbs climbed stick sticks stuck
  set sets setting shake shakes shook round rounds rounded roll rolls rolled
  split splits braid braids braided dampen dampens dampened adjust adjusts adjusted
  reload reloads reloaded spoil spoils spoiled brighten brightens brightened
  pull pulls pulled push pushes pushed thank thanks thanked welcome welcomes
  receive receives receiving broadcast broadcasts broadcasting head heads heading
  bother bothers bothering touch touches touched check checks checked
  pick picks picked try tries trying hang hanging wind winding fill filling
  lean leaning drink drinking grow growing wait waiting steep steeps steeped
  close closing open opening turn turning watch watches watched
  isn aren wasn weren don doesn didn won haven hasn hadn couldn wouldn shouldn
  ain let s brew brews brewed brewing knead kneads sip sips sipped punch punching
  ask asks asked asking back backs backed lock locks locked finding
  build builds built deliver delivers delivered wipe wiping ring ringing`.split(/\s+/);
const VERBSET = new Set([...AUX, ...VERBS]);

const BANNED = [
  [/\bproof(ing|ed)?\b|\bprove[ds]?\b(?!\s+(it|that))/i, 'baking jargon -- use "rise/risen/rising box"'],
  [/\bquickness\b/i, 'use "being rushed" or "hurry"'],
  [/\bin spells\b/i, 'use "now and then"'],
  [/\bneed not\b/i, 'use "don\'t have to"'],
  [/\bmay be used\b/i, 'use "you can use"'],
  [/\bso it goes\b/i, 'closing aphorism'],
  [/\b(henceforth|whilst|amongst|hereby|thereof|whereupon|albeit)\b/i, 'archaic register'],
  [/\bshall\b/i, 'use "will"'],
  [/\bmind it\b/i, 'use "be careful" or "watch out"'],
  [/\bit is what it is\b|\bthat is that\b/i, 'closing aphorism'],
];
const CONTRACT = [
  [/\bit is\b/i, "it's"], [/\bthat is\b/i, "that's"], [/\bthere is\b/i, "there's"],
  [/\bI am\b/, "I'm"], [/\byou are\b/i, "you're"], [/\bthey are\b/i, "they're"],
  [/\bwe are\b/i, "we're"], [/\bdo not\b/i, "don't"], [/\bdoes not\b/i, "doesn't"],
  [/\bdid not\b/i, "didn't"], [/\bis not\b/i, "isn't"], [/\bare not\b/i, "aren't"],
  [/\bwas not\b/i, "wasn't"], [/\bcannot\b|\bcan not\b/i, "can't"],
  [/\bwill not\b/i, "won't"], [/\bhave not\b/i, "haven't"], [/\bhas not\b/i, "hasn't"],
  [/\bwould not\b/i, "wouldn't"], [/\bcould not\b/i, "couldn't"],
  [/\bshould not\b/i, "shouldn't"], [/\bI will\b/, "I'll"], [/\byou will\b/i, "you'll"],
  [/\blet us\b/i, "let's"], [/\bI have\b/, "I've"], [/\bI would\b/, "I'd"],
];

const isMarkup = v => /<[a-z/!]/i.test(v);
const isLabel = v => !/[.!?…]\s*$/.test(v.trim());
const isAside = v => /^\s*[(（]/.test(v);
const words = s => s.match(/[A-Za-z][A-Za-z'’-]*/g) || [];

for (const e of entries) {
  const v = e.value;
  if (!v || isMarkup(v) || !/[A-Za-z]/.test(v)) continue;
  const at = `en.ts:${e.line}`;

  for (const [re, why] of BANNED) if (re.test(v)) warn('banned wording', `${at}  ${why}\n    ${JSON.stringify(v.slice(0, 90))}`);
  if (/—/.test(v)) warn('em dash', `${at}  use a full stop, "and", or "so"\n    ${JSON.stringify(v.slice(0, 90))}`);

  if (isLabel(v) || formalSet.has(v)) continue;

  for (const [re, fix] of CONTRACT) {
    const m = v.match(re);
    if (m) { warn('no contraction', `${at}  "${m[0]}" -> "${fix}"\n    ${JSON.stringify(v.slice(0, 90))}`); break; }
  }

  for (const raw of v.split(/(?<=[.!?…])\s+|\n/)) {
    const sent = raw.trim();
    if (!sent || !/[A-Za-z]/.test(sent)) continue;
    const w = words(sent);
    if (w.length > 20) warn('long sentence', `${at}  ${w.length} words -- split it\n    ${JSON.stringify(sent.slice(0, 100))}`);
    if (fragSet.has(sent) || isAside(sent)) continue;
    if (w.length >= 1 && w.length <= 9 && !w.some(x => { const t = x.toLowerCase(); return VERBSET.has(t) || VERBSET.has(t.split(/['\u2019]/)[0]) || VERBSET.has(t.split(/['\u2019]/)[1] || ''); })) {
      warn('possible fragment', `${at}  no finite verb\n    ${JSON.stringify(sent.slice(0, 100))}`);
    }
  }
}

/* ---------- 3b. key/value sanity ---------- */
/* A patch applied by stale entry index writes a sentence onto an unrelated
   label and nothing complains, so compare the shape of the two sides: a
   three-character door label should not carry a ten-word sentence. */
for (const e of entries) {
  if (isMarkup(e.key) || !CJK.test(e.key)) continue;
  const zh = (e.key.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (e.value.match(/[A-Za-z]+/g) || []).length;
  if (!en || !zh) continue;
  /* Loose on purpose: English needs articles and auxiliaries that Chinese does
     not, so a five-character sentence fairly becomes eight words. Only a gap
     wide enough to mean a different sentence counts. */
  if ((zh <= 5 && en >= 10) || (zh >= 18 && en <= 3))
    errors.push(`mispaired  en.ts:${e.line}  ${zh} Chinese characters against ${en} English words -- did a patch land on the wrong entry?\n    ${JSON.stringify(e.key.slice(0, 40))}\n    ${JSON.stringify(e.value.slice(0, 80))}`);
}

/* ---------- 4. no lists, no permission ---------- */
/* Two hard rules from docs/VOICE.md sections 2 and 3. The picture already shows
   the room, so naming more than one object in a sentence is the writer refusing
   to choose; and the ship is forgiving without having to say so, so every
   "X, or not" is the designer leaning into frame to reassure the player. */
const PERMIT_ZH = /\u4e5f\u884c|\u4e5f\u53ef\u4ee5|\u4e5f\u633a\u597d|\u4e5f\u6ca1\u5173\u7cfb|\u90fd\u884c|\u4e0d\u5fc5\u5728|\u4e0d\u7528\u5728\u65c1\u8fb9|\u6ca1\u6709\u4ec0\u4e48\u4f1a|\u4e5f\u597d\u3002|\u4e0d\u7528\u56de|\u968f\u4fbf\u7528|\u5c31\u597d\u3002$|\u5982\u679c\u60f3\u7684\u8bdd/;
const PERMIT_EN = /\b(or don't|or not\b|also fine|is fine too|also a good day|don't have to|doesn't have to|do not have to|no need to|need not|nothing (breaks|spoils|to fail)|whatever you like|however you like|anywhere will do|will do\.|it's okay|that's fine too|you can go\b|if you want to)/i;

for (const e of entries) {
  const at = `en.ts:${e.line}`;
  if (isMarkup(e.key)) continue;

  /* Chinese enumerates with a dedicated mark, so this one is exact. */
  if (e.key.includes('\u3001') && !listOk.has(e.key))
    errors.push(`list  ${at}  names more than one thing -- pick the detail worth having, drop the rest (VOICE.md S2)\n    ${JSON.stringify(e.key.slice(0, 80))}`);
  else if (/[\u4e00-\u9fff](\u548c|\u4e0e)[\u4e00-\u9fff]/.test(e.key) && !listOk.has(e.key))
    warn('possible list', `${at}  joins two things with \u548c/\u4e0e\n    ${JSON.stringify(e.key.slice(0, 80))}`);

  for (const sent of e.value.split(/(?<=[.!?\u2026])\s+|\n/)) {
    if (/(?:[^,.!?]{1,30}, ){2,}/.test(sent) && !listOk.has(e.value) && !listOk.has(sent.trim()))
      warn('possible list', `${at}  comma-separated run -- name one thing\n    ${JSON.stringify(sent.slice(0, 90))}`);
  }

  if (PERMIT_ZH.test(e.key) && !permitOk.has(e.key))
    errors.push(`permission  ${at}  tells the player it is okay -- cut the line (VOICE.md S3)\n    ${JSON.stringify(e.key.slice(0, 80))}`);
  else if (PERMIT_EN.test(e.value) && !permitOk.has(e.value))
    errors.push(`permission  ${at}  tells the player it is okay -- cut the line (VOICE.md S3)\n    ${JSON.stringify(e.value.slice(0, 90))}`);
}

/* ---------- 5. Chinese voice ---------- */
const ZH_FORMAL = /[乃亦皆颇]|旨在|并非|之所以/;
for (const e of entries) {
  const k = e.key;
  if (!CJK.test(k) || isMarkup(k)) continue;
  if (ZH_FORMAL.test(k)) warn('书面语', `en.ts:${e.line}  ${JSON.stringify(k.slice(0, 50))}`);
  for (const clause of k.split(/[。，；？！…\n]/)) {
    if (clause.replace(/[^一-鿿]/g, '').length > 24) {
      warn('长分句', `en.ts:${e.line}  ${clause.length} 字\n    ${JSON.stringify(clause.slice(0, 50))}`);
    }
  }
}

/* ---------- report ---------- */
const out = [];
if (errors.length) {
  out.push(`\n\x1b[31m${errors.length} error${errors.length > 1 ? 's' : ''}\x1b[0m`);
  for (const e of errors) out.push('  ' + e.replace(/\n/g, '\n  '));
}
if (!QUIET) {
  const order = Object.keys(warns).sort((a, b) => warns[b].length - warns[a].length);
  for (const k of order) {
    const list = warns[k];
    out.push(`\n\x1b[33m${list.length} ${k}\x1b[0m`);
    for (const m of list.slice(0, CAP)) out.push('  ' + m.replace(/\n/g, '\n  '));
    if (list.length > CAP) out.push(`  ... and ${list.length - CAP} more (--all to see them)`);
  }
}
const totalWarn = Object.values(warns).reduce((n, l) => n + l.length, 0);
out.push(`\n${entries.length} strings checked -- ${errors.length} errors, ${totalWarn} warnings`);
if (!errors.length && !totalWarn) out.push('\x1b[32mclean\x1b[0m');
console.log(out.join('\n'));
process.exit(errors.length ? 1 : 0);
