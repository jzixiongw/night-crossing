# Night Crossing · 夜航

An atmospheric 2D web game, painted at runtime onto a canvas.
[README.md](README.md) has the rendering architecture, the layer order and the
camera. Read it before touching `src/core/` or `src/rooms/`.

## Commands

```sh
npm run dev
npm run typecheck
npm run build
```

## If you change a string

Only two things here break silently; everything else about the writing is the
user's call, asked for when they want it.

`src/i18n/en.ts` is keyed by the exact Chinese source string, so a Chinese edit
must carry its key along or the line renders as Chinese in the English build.
Run `node tools/retext.mjs mapping.json` with a `{"old":"new"}` mapping and it
rewrites both sides. English-only edits are just the value.

Straight quotes and apostrophes, both languages: the display font renders curly
ones as full-width CJK glyphs.

`npm run voice` checks both, plus the house style. Run it when the user asks
for a copy pass, not on your own.

## Searching the repo

The code is all under `src/`. Three directories swamp a plain `find` or
`grep -r` and hold nothing worth reading: `public/fonts/` and `dist/` are a few
hundred subset woff2 files, and `index.html.backup` is the 273 KB pre-refactor
monolith, kept only as a safety net. Scope searches to `src/`, `tools/` and the
root `*.md`.

## Scope

`submission/` is a finished export pack, pinned to a baseline commit and
character-counted against portal limits. Leave it out of searches and reviews
unless the user asks for a submission or export pass.
