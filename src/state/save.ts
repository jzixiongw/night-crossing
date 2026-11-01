import { S } from './runtime';
import { G } from './store';
import { now } from './time';

export const SAVE_KEY = 'yehang-long-v2';
export const SV = { ref:null, local:false, cloudOk:false, writing:false, lastCloud:0, dirty:false, lastLocal:0 };
export function markDirty(){ SV.dirty = true; }
export function readLocal(){ try { const s = localStorage.getItem(SAVE_KEY); if (!s) return null; const o = JSON.parse(s); return o && o.v === 2 ? o : null; } catch(e){ return null; } }
export function writeLocal(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); SV.local = true; } catch(e){ SV.local = false; } }
export function withTimeout(p, ms){ return Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]); }
export async function cloudInit(){
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return null;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return null;
    const id = await user.id(); if (!id) return null;
    const ref = db.doc('data/users/' + id + '/save');
    const snap = await ref.get();
    SV.ref = ref;
    if (snap.exists){ const d = snap.data(); if (d && d.v === 2) return JSON.parse(JSON.stringify(d)); }
    return null;
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
