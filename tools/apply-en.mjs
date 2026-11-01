#!/usr/bin/env node
/* Replace English values in src/i18n/en.ts by entry index, leaving every key,
   comment and blank line exactly where it was.
     node tools/apply-en.mjs patch.json

   patch.json maps either the Chinese source key or the entry index to its new
   English value. PREFER THE KEY. Indices shift the moment an entry is added or
   removed, and a stale index writes a sentence onto some unrelated label
   without any error -- which is exactly how 'radio room door' once came to say
   "This ship goes slowly." A key either matches or the tool refuses. */
import { readFileSync, writeFileSync } from 'node:fs';
import { escape, unescape } from './voice-lib.mjs';

const patch = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const file = 'src/i18n/en.ts';
const text = readFileSync(file, 'utf8');
const masked = text.replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' '));
const re = /'((?:[^'\\\n]|\\.)*)':\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")/g;

const spans = [];
const byKey = new Map();
for (const m of masked.matchAll(re)) {
  const whole = m[0];
  const valStart = m.index + whole.lastIndexOf(m[2] !== undefined ? "'" + m[2] + "'" : '"' + m[3] + '"');
  const span = { start: valStart, end: m.index + whole.length, key: unescape(m[1]) };
  spans.push(span);
  if (!byKey.has(span.key)) byKey.set(span.key, span);
}

/* Resolve every target before writing anything, then apply back to front so
   earlier offsets stay valid. */
const edits = [], missing = [];
for (const [k, value] of Object.entries(patch)) {
  const span = /^\d+$/.test(k) ? spans[Number(k)] : byKey.get(k);
  if (!span) { missing.push(k); continue; }
  edits.push({ span, value });
}
if (missing.length) {
  console.error('no entry for: ' + missing.map(k => JSON.stringify(k)).join(', '));
  process.exit(1);
}

let out = text, applied = 0;
for (const { span, value } of edits.sort((a, b) => b.span.start - a.span.start)) {
  out = out.slice(0, span.start) + '"' + escape(value).replace(/"/g, '\\"').replace(/\\'/g, "'") + '"' + out.slice(span.end);
  applied++;
}
writeFileSync(file, out);
console.log(`${applied} value${applied > 1 ? 's' : ''} replaced in ${file} (of ${spans.length})`);
