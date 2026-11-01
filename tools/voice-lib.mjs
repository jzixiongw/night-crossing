/* Shared extraction for the voice tools.
   The i18n table is keyed by the exact Chinese source string, so both tools
   need the same idea of "where a source string can live". */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const CJK = /[\u4e00-\u9fff]/;
export const CURLY = /[\u2018\u2019\u201c\u201d]/;

export function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

export function srcFiles() {
  return walk('src').filter(p => !p.includes('i18n'));
}

/* A single-quoted JS string literal, honouring backslash escapes. */
const LITERAL = /'((?:[^'\\\n]|\\.)*)'/g;

export function unescape(s) {
  return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\(['"\\])/g, '$1');
}
export function escape(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

/* Every string handed to tr(). These are the keys the English table must hold. */
export function trStrings() {
  const hits = [];
  for (const file of srcFiles()) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\btr\(\s*'((?:[^'\\\n]|\\.)*)'/g)) {
      const raw = unescape(m[1]);
      hits.push({ file, raw, line: text.slice(0, m.index).split('\n').length });
    }
  }
  return hits;
}

/* Chinese text and attributes in index.html, which i18n/index.ts localises by
   walking the DOM. Comments and <script> are skipped: neither is localised. */
export function htmlStrings(file = 'index.html') {
  const text = readFileSync(file, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '');
  const hits = [];
  const add = raw => {
    const body = raw.trim();
    if (body && CJK.test(body)) hits.push({ file, raw: body });
  };
  for (const m of text.matchAll(/>([^<>]+)</g)) add(m[1]);
  for (const m of text.matchAll(/\b(?:aria-label|placeholder|title|data-r)="([^"]*)"/g)) add(m[1]);
  for (const m of text.matchAll(/<title>([^<]*)<\/title>/g)) add(m[1]);
  return hits;
}

/* Keys and values of the EN table, with the line each one starts on. */
export function enTable(file = 'src/i18n/en.ts') {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const entries = [];
  const body = text.replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' '));
  /* Values may be single- or double-quoted: a value full of contractions is
     cleaner in double quotes. */
  const re = /'((?:[^'\\\n]|\\.)*)':\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")/g;
  for (const m of body.matchAll(re)) {
    entries.push({
      key: unescape(m[1]),
      value: unescape(m[2] ?? m[3]),
      line: body.slice(0, m.index).split('\n').length,
    });
  }
  return { entries, text, lines };
}
