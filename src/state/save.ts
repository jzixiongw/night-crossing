import { S } from './runtime';
import { G } from './store';
import { now } from './time';

/* ================= SAVE =================
   Three slots, each a whole ship with its own number and its own nights. The
   slot is chosen on the door screen before boarding and never changes after,
   so everything below this line only ever touches one of them at a time.

   Local storage is the source of truth; the cloud, when the host provides one,
   is a copy per slot that is merged in at boot by whichever side was written
   last. A single-slot save from before this existed is moved into slot 1 the
   first time the game starts. */
export const SAVE_BASE = 'yehang-long-v2';
export const SLOTS = [1, 2, 3];
export const slotKey = n => `${SAVE_BASE}:s${n}`;
const LAST_KEY = `${SAVE_BASE}:last`;

export const SV = { ref:null, refs:{}, slot:1, local:false, cloudOk:false, writing:false, lastCloud:0, dirty:false, lastLocal:0 };
export function markDirty(){ SV.dirty = true; }

function parse(raw){ try { const o = JSON.parse(raw); return o && o.v === 2 ? o : null; } catch(e){ return null; } }
export function readSlot(n){ try { return parse(localStorage.getItem(slotKey(n))); } catch(e){ return null; } }
export function readLocal(){ return readSlot(SV.slot); }
export function writeLocal(){ try { localStorage.setItem(slotKey(SV.slot), JSON.stringify(G)); SV.local = true; } catch(e){ SV.local = false; } }
export function setSlot(n){ SV.slot = n; SV.ref = SV.refs[n] || null; try { localStorage.setItem(LAST_KEY, String(n)); } catch(e){} }
export function lastSlot(){ try { const n = +localStorage.getItem(LAST_KEY); return SLOTS.includes(n) ? n : 1; } catch(e){ return 1; } }
export function clearSlot(n){
  try { localStorage.removeItem(slotKey(n)); } catch(e){}
  const ref = SV.refs[n];
  if (ref) try { ref.delete ? ref.delete() : ref.set(null); } catch(e){}
}
/* One pass, at the very first start, so nobody loses a voyage to this change. */
export function migrateLegacyLocal(){
  try {
    const old = localStorage.getItem(SAVE_BASE);
    if (!old) return;
    if (!localStorage.getItem(slotKey(1))) localStorage.setItem(slotKey(1), old);
    localStorage.removeItem(SAVE_BASE);
  } catch(e){}
}

export function withTimeout(p, ms){ return Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]); }
export async function cloudInit(){
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return null;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return null;
    const id = await user.id(); if (!id) return null;
    const base = 'data/users/' + id;
    const out = {};
    SV.refs = {};
    for (const n of SLOTS) SV.refs[n] = db.doc(`${base}/slot${n}`);
    const snaps = await Promise.all(SLOTS.map(n => SV.refs[n].get().catch(() => null)));
    SLOTS.forEach((n, i) => { const sn = snaps[i]; if (sn && sn.exists){ const d = sn.data(); if (d && d.v === 2) out[n] = JSON.parse(JSON.stringify(d)); } });
    /* the old single-document save becomes slot 1 if slot 1 is still empty */
    if (!out[1]){
      try { const legacy = await db.doc(base + '/save').get();
        if (legacy && legacy.exists){ const d = legacy.data(); if (d && d.v === 2) out[1] = JSON.parse(JSON.stringify(d)); } } catch(e){}
    }
    SV.ref = SV.refs[SV.slot] || null;
    return out;
  } catch(e){ return null; }
}
export async function writeCloud(){
  if (!SV.ref || SV.writing) return;
  SV.writing = true;
  try { await SV.ref.set(JSON.parse(JSON.stringify(G))); SV.cloudOk = true; SV.lastCloud = Date.now(); }
  catch(e){ SV.cloudOk = false; if (e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted')) SV.ref = null; }
  SV.writing = false;
}
export function persist(force){
  if (!S.started) return;
  G.lastSeen = now(); G.savedAt = Date.now();
  writeLocal(); SV.lastLocal = Date.now();
  if (SV.ref && (force || (SV.dirty && Date.now() - SV.lastCloud > 30000))){ SV.dirty = false; writeCloud(); }
  else if (!SV.ref) SV.dirty = false;
}
