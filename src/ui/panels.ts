import { $ } from '../core/util';

/* Which overlays are open is asked by input (Escape), by the rooms, and by each panel
   itself, so it lives apart from any one of them. */
const PANELS = ['#routePanel','#seedPanel','#namePanel','#settingsPanel'];
const SHEETS = ['#mailView','#logView','#awayView','#ticketView','#ending'];

export function closePanels(){ PANELS.forEach(s => $(s).hidden = true); }
export function anyOpen(){ return [...PANELS, ...SHEETS].some(s => !$(s).hidden); }
