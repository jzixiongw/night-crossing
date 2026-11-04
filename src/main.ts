import './styles/game.css';

/* Language first. Importing i18n sets <html lang> and rewrites the Chinese
   static markup; it must stay above the modules that write their own labels. */
import './i18n';

/* The paper fibre and the pen marks every overlay is drawn with; see ui/paper.ts. */
import './ui/paper';

/* Side-effect modules: these install DOM handlers and must be in place before boot
   starts the loop. Everything else is pulled in through the dependency graph. */
import './ui/settings';
import './core/presence';

import './boot';

/* The ship is drawn in 3D (src/three/), loaded as its own chunk; until it
   arrives -- and for good if WebGL is missing or ?render=2d asks -- the
   painted Canvas2D rooms draw it, which are still what every room's logic
   lives in. The 3D rooms replace only how a room is drawn and how a pointer
   finds things in it, so switching mid-voyage changes nothing in the save. */
function webglOK(){
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch(e){ return false; }
}
if (new URLSearchParams(location.search).get('render') !== '2d' && webglOK()) import('./three/index').catch(err => console.error(err));
