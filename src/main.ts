import './styles/game.css';

/* Language first. Importing i18n sets <html lang> and rewrites the Chinese
   static markup; it must stay above the modules that write their own labels. */
import './i18n';

/* Side-effect modules: these install DOM handlers and must be in place before boot
   starts the loop. Everything else is pulled in through the dependency graph. */
import './ui/settings';
import './core/presence';

import './boot';
