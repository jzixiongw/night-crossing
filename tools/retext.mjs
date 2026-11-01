#!/usr/bin/env node
/* Change a Chinese source string and its i18n key together.

     node tools/retext.mjs mapping.json          apply
     node tools/retext.mjs mapping.json --dry    show what would change

   mapping.json is { "old Chinese string": "new Chinese string", ... }.

   The English table is keyed by the exact Chinese source, so editing one side
   alone silently drops the line back to Chinese in the English build. This
   rewrites every call site, the HTML, and the key, then refuses to write
   anything if the result would orphan a string. */
import { readFileSync, writeFileSync } from 'node:fs';
import { escape, srcFiles } from './voice-lib.mjs';

const [, , mapPath, ...rest] = process.argv;
if (!mapPath) { console.error('usage: node tools/retext.mjs mapping.json [--dry]'); process.exit(2); }
const DRY = rest.includes('--dry');
const map = JSON.parse(readFileSync(mapPath, 'utf8'));
const pairs = Object.entries(map).filter(([a, b]) => a !== b);
if (!pairs.length) { console.log('nothing to do'); process.exit(0); }

/* Longest first, so a string that contains another is replaced before its part. */
pairs.sort((a, b) => b[0].length - a[0].length);

const files = [...srcFiles(), 'src/i18n/en.ts', 'index.html'];
const edits = new Map();
const hits = Object.fromEntries(pairs.map(([a]) => [a, 0]));

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  let after = before;
  for (const [oldZh, newZh] of pairs) {
    /* Source files hold the string escaped inside a JS literal; the HTML holds
       it raw. Try both forms. */
    for (const [from, to] of [[escape(oldZh), escape(newZh)], [oldZh, newZh]]) {
      if (from === to || !after.includes(from)) continue;
      const n = after.split(from).length - 1;
      hits[oldZh] += n;
      after = after.split(from).join(to);
      break;
    }
  }
  if (after !== before) edits.set(file, after);
}

const missed = pairs.filter(([a]) => !hits[a]);
if (missed.length) {
  console.error(`\n${missed.length} mapping entr${missed.length > 1 ? 'ies' : 'y'} matched nothing -- refusing to write:`);
  for (const [a] of missed) console.error('  ' + JSON.stringify(a.slice(0, 70)));
  console.error('\nCheck for a typo, or for curly quotes where the source has straight ones.');
  process.exit(1);
}

for (const [f, text] of edits) {
  console.log(`${DRY ? 'would write' : 'wrote'}  ${f}`);
  if (!DRY) writeFileSync(f, text);
}
console.log(`\n${pairs.length} string${pairs.length > 1 ? 's' : ''} rewritten across ${edits.size} file${edits.size > 1 ? 's' : ''}` +
            (DRY ? ' (dry run)' : '\nnow run: npm run voice'));
