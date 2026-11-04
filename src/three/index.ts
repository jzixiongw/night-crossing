import './engine';
import './view';
import { wrapPainted } from './engine';

/* ================= THE 3D SHIP =================
   Loaded as its own chunk by main.ts. The engine and the viewpoint controller
   come first; then each room module registers itself over the painted room of
   the same name. They are loaded one by one and a room that fails to load is
   left painted rather than taking the others down with it -- the 2D rooms are
   still all there underneath. ?rooms=cabin,radio loads only those, which is
   handy when working on one. */
const only = new URLSearchParams(location.search).get('rooms');
const want = only ? new Set(only.split(',')) : null;
const MODS = import.meta.glob(['./rooms/*.ts', '!./rooms/*-*.ts']);
export const ready = Promise.all(Object.entries(MODS).map(([path, load]) => {
  const id = path.replace(/^.*\/(\w+)\.ts$/, '$1');
  if (want && !want.has(id)) return null;
  return load().catch(err => console.error(`[3d] ${id} failed to load; it stays painted`, err));
})).then(() => wrapPainted());
