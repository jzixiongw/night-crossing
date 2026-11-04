import { $ } from '../core/util';

/* Which overlays are open is asked by input (Escape), by the rooms, and by each panel
   itself, so it lives apart from any one of them. */
const PANELS = ['#routePanel','#seedPanel','#namePanel','#settingsPanel','#plantPanel'];
const SHEETS = ['#mailView','#logView','#awayView','#ticketView','#ending'];

export function closePanels(){
  const focused = PANELS.some(s => $(s).contains(document.activeElement));
  PANELS.forEach(s => $(s).hidden = true);
  if (focused) $('#scene').focus({ preventScroll:true });
}

// Keep native keyboard focus inside an open action panel.
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const panel = PANELS.map(s => $(s)).find(p => !p.hidden);
  if (!panel) return;
  const buttons = Array.from(panel.querySelectorAll('button:not(:disabled), input, textarea')) as HTMLElement[];
  if (!buttons.length) return;
  const index = buttons.indexOf(document.activeElement as HTMLElement);
  if (index < 0 || (!e.shiftKey && index === buttons.length-1) || (e.shiftKey && index === 0)) {
    e.preventDefault(); buttons[e.shiftKey ? buttons.length-1 : 0].focus();
  }
});
export function anyOpen(){ return [...PANELS, ...SHEETS].some(s => !$(s).hidden); }
