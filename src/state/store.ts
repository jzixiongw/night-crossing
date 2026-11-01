export const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export interface Save { [key: string]: any }
export function freshSave(): Save {
  return {
    v:2, no:String(1000 + Math.floor(Math.random()*9000)), created:Date.now(), lastSeen:0, savedAt:0, visits:0, nights:[], skew:0, speed:1,
    sound:true, reduced:prefersReduced, ang:0,
    lamp:0, colorIdx:0, route:'harbor', visited:['harbor'], bulbs:[], answered:{amber:0,teal:0,rose:0}, named:[], junction:false,
    blanket:false, passedLights:0, lampTime:[0,0,0], mapLen:0, doodles:0, draws:0,
    tea:{ kind:null, level:0, temp:0, steep:0, leaves:false }, cups:0, kettle:{ pos:'sink', water:0, hot:0 }, warmUntil:0,
    dough:{ st:'none', strokes:0, shape:null, proof:0 }, breads:[], baked:0, gaveAn:0, pears:3, pearAt:0, bite:0, pearsEaten:0,
    pots:[null,null,null,null,null], growLamp:true, vase:null, blooms:0,
    radioOn:false, freq:.82, found:[], strip:new Array(16).fill(0), ghost:false, wind:0, phones:false,
    lines:[], names:{}, landed:[], domeLight:true, lie:false, lineSeq:0,
    mail:{ box:['welcome'], read:[], arrived:{}, nextAt:0, idx:1, out:[] },
    shipsSeen:0, log:[], flags:{}, note:'', sessionsMin:0
  };
}
export let G: Save = freshSave();
/* Boot swaps the whole save object in once the best candidate is chosen. */
export function setG(next: Save){ G = next; }
export function migrate(o){
  const f = freshSave();
  for (const k in f) if (o[k] === undefined) o[k] = f[k];
  for (const k of ['tea','kettle','dough','mail']) for (const kk in f[k]) if (o[k][kk] === undefined) o[k][kk] = f[k][kk];
  if (!Array.isArray(o.strip) || o.strip.length !== 16) o.strip = f.strip;
  if (!Array.isArray(o.pots) || o.pots.length !== 5) o.pots = f.pots;
  return o;
}
