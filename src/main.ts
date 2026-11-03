import './styles/game.css';

/* Language first. Importing i18n sets <html lang> and rewrites the Chinese
   static markup; it must stay above the modules that write their own labels. */
import './i18n';

/* Side-effect modules: these install DOM handlers and must be in place before boot
   starts the loop. Everything else is pulled in through the dependency graph. */
import './ui/settings';
import './core/presence';

import './boot';

/* ?cabin=3d swaps the Canvas2D cabin for the experimental Three.js one in
   src/three/. It is its own chunk, so the default game never downloads three;
   it replaces ROOMS.cabin when it arrives and the loop picks it up next frame. */
if (new URLSearchParams(location.search).get('cabin') === '3d') import('./three/cabin3d').catch(err => console.error(err));
