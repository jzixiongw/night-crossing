# Deploy — prepared, NOT pushed

Per your instruction: everything below is ready locally and **nothing has been deployed**. No account of yours has been touched, nothing has been published, and no URL exists yet.

## What is ready

`npm run build` produces `dist/` — a plain static bundle, roughly 240 KB plus the self-hosted font subsets. It needs no server, no environment variables, no backend and no build step at the host. Any static host serves it as-is.

The one thing to get right is that **`public/fonts/` must ship**. `fonts.css` uses relative `url()` references, and Vite copies `public/` into `dist/` verbatim, so a plain upload of `dist/` works — but a host configured to serve only `index.html` plus hashed assets will silently drop the fonts and the whole typographic identity with it. After deploying, open the page and confirm the title is not rendering in a system serif.

## Three routes, any of which you can run yourself

**1. Netlify or Vercel, drag-and-drop.** Build locally, then drag the `dist/` folder into the site's deploy area. No CLI, no repo connection, no token. Fastest path to a URL and the one I would pick for a judged link, because nothing in the pipeline can change the artefact after you have checked it.

```sh
npm ci && npm run build        # then drag dist/ into the dashboard
```

**2. GitHub Pages.** Needs the repo pushed first. Add `base: '/<repo-name>/'` to `vite.config.ts` if the site is served from a subpath, otherwise asset URLs break. Config file prepared at `submission/deploy/gh-pages.yml` — copy it to `.github/workflows/` only if you choose this route.

**3. Any static host / your own domain.** Upload the contents of `dist/` to the web root. Nothing else required.

## Before you give the URL to iF

- [ ] Opens in a **fresh browser profile** with no extensions and no cache.
- [ ] Loads in **English** by default (no `?lang=` needed).
- [ ] The Settings panel does **not** show the "Testing: time speed" row (it must only appear with `?debug`).
- [ ] Fonts loaded — the title is the game's serif, not Times.
- [ ] Sound works after clicking Board; "Board muted" also works.
- [ ] Reachable **from Germany**. Ask someone there, or use a German VPN exit. A host behind a region-restricted CDN would fail judging silently.
- [ ] No staging banner, no password, no auth wall, no `noindex` placeholder page.
- [ ] HTTPS.
- [ ] It will stay up through the whole judging period — do not point it at a preview deployment that expires.

## A note on keeping it live

iF judges during a window after the deadline. The video is a frozen artefact once hosted, but the site can keep changing — so if you keep working on the game, **keep the live build consistent with what the entry claims**. Do not remove or alter the interactions the images and video show.
