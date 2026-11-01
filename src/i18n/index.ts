/* ================= LANGUAGE =================
   The public build is judged by an international jury, so English is the default
   and Chinese is a toggle. Keys are the original Chinese strings: a string that
   has not been translated yet falls through and renders as Chinese, which makes
   a gap visible on screen instead of silent.

   Switching language reloads. Every room caches painted text into layer buffers
   and a dozen DOM nodes are written once at boot; a reload is one line instead of
   a re-render path through all of them, and the voyage is already persisted
   continuously, so nothing is lost. */
import { EN } from './en';

export type Lang = 'en' | 'zh';
const LANG_KEY = 'yehang-lang';

function initial(): Lang {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'zh') return q;
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch (e) {}
  /* Default English. A Chinese-reading visitor is offered the toggle on the
     door screen, so defaulting away from their language costs them one click. */
  return 'en';
}

export const LANG: Lang = initial();
export const isEN = LANG === 'en';

/* t('信箱里多了 {0} 封信。', n) -- {0}, {1}... are filled from the arguments. */
export function tr(zh: string, ...a: (string | number)[]): string {
  let s = (isEN && EN[zh]) || zh;
  if (a.length) s = s.replace(/\{(\d)\}/g, (m, i) => String(a[+i] ?? m));
  return s;
}

export function setLang(l: Lang){
  try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
  const u = new URL(location.href); u.searchParams.delete('lang');
  location.replace(u.toString());
}

/* Applied to <html> so CSS and the canvas can both ask. */
export function applyLangAttrs(){
  document.documentElement.lang = isEN ? 'en' : 'zh-CN';
  document.documentElement.dataset.lang = LANG;
}

/* ---------- static markup ----------
   index.html is authored in Chinese and the table is keyed by exactly those
   strings, so the whole document can be localised by one walk instead of a
   data-i18n attribute on every node. Runs before any module writes text. */
const ATTRS = ['aria-label', 'placeholder', 'title', 'data-r'];
const CJK = /[一-鿿]/;

export function localizeDOM(root: ParentNode = document){
  if (!isEN) return;
  const w = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) if (CJK.test(n.nodeValue || '')) texts.push(n as Text);
  for (const n of texts){
    const raw = n.nodeValue || '', body = raw.trim();
    const hit = EN[body];
    /* Keep the surrounding whitespace: some of these sit inline between tags. */
    if (hit) n.nodeValue = raw.replace(body, hit);
  }
  for (const el of (root as Element).querySelectorAll('*')){
    for (const a of ATTRS){
      const v = el.getAttribute(a);
      if (v && CJK.test(v) && EN[v]) el.setAttribute(a, EN[v]);
    }
  }
  if (EN[document.title]) document.title = EN[document.title];
}

/* Done here, not in main.ts: ES imports are hoisted, so a call in main's body
   would run after ui/settings and boot had already written their labels. This
   module has no game dependencies, so it is the first thing evaluated. Module
   scripts are deferred, so the document is parsed by now. */
applyLangAttrs();
localizeDOM();
