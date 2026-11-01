import { tr } from '../i18n';
import { AU } from '../audio/index';
import { layerCache } from '../core/cache';
import { setL } from '../core/camera';
import { drawFX, flare } from '../core/fx';
import { hit } from '../core/hits';
import { glowL, hole, lightBegin } from '../core/light';
import { MAT } from '../core/materials';
import { STEAL, SWARM, ell, flat, pat, rr, shadow, star5, stemPath, txt, vol } from '../core/paint';
import { P, shell } from '../core/shell';
import { D2R, clamp, hhmm, mixHex, mulberry32, rand } from '../core/util';
import { MUSIC_MOTIF, NOTE_MIDI, STATIONS } from '../data/index';
import { ACT, ROOMS, setAmbience, setCtx } from './registry';
import { S } from '../state/runtime';
import { markDirty } from '../state/save';
import { G } from '../state/store';
import { inHours, localHour } from '../state/time';
import { addLog, once, onceS, say } from '../ui/captions';
import { K_SP, K_WL } from '../core/depth';

/* ================= RADIO ROOM: receiver + music box ================= */
export const FMIN = .5, FMAX = 1.7;
export const fx = f => 500 + (f - FMIN)/(FMAX - FMIN)*236;
export const SX0 = 806, SY0 = 404, STW = 378/16, STH = 146/6;
export const RAD_SHELL = { kb:.62, kf:1.75, b:[80,40,1520,640], f:[-340,-280,1940,1180],
  ceil:[[0,'#3d2f40'],[1,'#141019']], floor:[[0,'#3a2a2c'],[.4,'#4a3434'],[1,'#21181b']], side:[[0,'#35283a'],[1,'#191320']], seams:8, seamCol:'rgba(16,6,10,.35)' };
export function buildRadio(){ S.crankA = 0; S.rGains = { st:-1, v:-1 }; S.notes = []; const R = mulberry32(5); S.rStars = []; for (let i=0;i<40;i++) S.rStars.push({ x:R(), y:R(), r:.6 + R()*1.4 }); }
export function renderStrip(){} function renderTable(){}
export function stationNow(){
  const h = localHour(); let best = null, bc = 0, near = null;
  STATIONS.forEach(st => { const d = Math.abs(G.freq - st.f); const c = clamp(1 - d/.045, 0, 1);
    if (!inHours(h, st.hours)){ if (d < .03) near = st; return; }
    if (c > bc){ bc = c; best = st; } });
  return { st:best, c:bc, near };
}
ACT['r:power'] = { tap(){
  G.radioOn = !G.radioOn; AU.click(); markDirty();
  if (G.radioOn){ say(once('radioOn') ? tr('收音机亮了，先是一阵沙沙声。') : tr('收音机开了。')); if (once('tuneHint')) say(tr('左右拖动右边的大旋钮调频。那只绿色的小眼睛合上，就是调准了。'), null, 2600); }
  else { say(tr('收音机关了。')); S.stationId = null; }
}};
export function tuneTo(f){
  const before = G.freq; G.freq = clamp(f, FMIN, FMAX);
  if (Math.floor(before*100) !== Math.floor(G.freq*100)) AU.ratchet();
  if (!G.radioOn && onceS('radioOffTune')) say(tr('旋钮转了，但收音机还没开。'));
}
ACT['r:tune'] = {
  press(a, e, P){ const c: any = { lx:P.x, ly:P.y };
    c.move = (ev, Q) => { const dx = (Q.x - c.lx) - (Q.y - c.ly)*.5; c.lx = Q.x; c.ly = Q.y; tuneTo(G.freq + dx*.0022); };
    c.up = () => { markDirty(); };
    return c; },
  key(){ tuneTo(G.freq + .01 > FMAX ? FMIN : G.freq + .01); if (onceS('tuneKey')) say(tr('用鼠标拖动旋钮会快很多。')); }
};
ACT['r:dial'] = { tap(a, e, P){ if (!e || !P) return; tuneTo(FMIN + (P.x - 500)/236*(FMAX - FMIN)); AU.tap(); markDirty(); } };
ACT['r:table'] = { tap(){
  AU.paper(); const n = G.found.length;
  say(n ? tr('台表上记了 {0} 个台，一共 {1} 行。有的台只在某些钟点出来。', n, STATIONS.length) : tr('台表还是空的。调到一个台，它会自己记上。'));
}};
ACT['r:phones'] = { tap(){
  G.phones = !G.phones; AU.soft(); setAmbience();
  say(G.phones ? tr('你戴上耳机。别的声音一下子远了。') : tr('耳机挂回钩子上。'));
}};
ACT['r:lamp'] = { tap(){ S.rLampOff = !S.rLampOff; AU.chain(); say(S.rLampOff ? tr('台灯关了。收音机的刻度盘成了屋里最亮的东西。') : tr('台灯亮了。')); } };
ACT['r:strip'] = {
  press(a, e, P){
    const cell = Q => { const c = Math.floor((Q.x - SX0)/STW), r = Math.floor((Q.y - SY0)/STH); return (c >= 0 && c < 16 && r >= 0 && r < 6) ? [c,r] : null; };
    const first = cell(P); if (!first) return null;
    const mode = (G.strip[first[0]] & (1<<first[1])) ? 'erase' : 'punch';
    const done = new Set();
    const apply = cr => { if (!cr) return; const key = cr.join(','); if (done.has(key)) return; done.add(key);
      const [c,r] = cr, has = !!(G.strip[c] & (1<<r));
      if (mode === 'punch' && !has){ G.strip[c] |= (1<<r); AU.boxNote(NOTE_MIDI[r], .07); AU.nz(.04,{f:2600,q:3,vol:.05}); flare(1, SX0 + (c+.5)*STW, SY0 + (r+.5)*STH, '#ffe2b6', 4, 22, .5); }
      else if (mode === 'erase' && has){ G.strip[c] &= ~(1<<r); AU.nz(.06,{type:'highpass',f:3000,q:.6,vol:.03}); } };
    apply(first);
    if (once('stripFirst')) say(mode === 'punch' ? tr('纸带上打了一个孔。上紧发条，它就会响。') : tr('这个孔被你用纸片糊上了。'));
    return { move(ev, Q){ apply(cell(Q)); }, up(){ markDirty(); if (G.ghost && MUSIC_MOTIF.every(([c,r]) => G.strip[c] & (1<<r)) && onceS('ghostDone')){ say(tr('淡淡的格子都打上了。这段曲子现在是你纸带上的了。')); addLog(tr('把「星港夜曲」的一段抄在了八音盒纸带上')); } } };
  },
  key(){ say(tr('用鼠标点纸带上的格子打孔。再点一次，就把孔糊上。')); }
};
ACT['r:crank'] = {
  press(a, e, P){
    const cen = { x:1424, y:470 }, ang = Q => Math.atan2(Q.y - cen.y, Q.x - cen.x);
    const c: any = { a:ang(P), tick:0, start:G.wind };
    c.move = (ev, Q) => { const na = ang(Q); let d = na - c.a; if (d > Math.PI) d -= 2*Math.PI; if (d < -Math.PI) d += 2*Math.PI; c.a = na;
      if (d > 0){ G.wind = Math.min(12, G.wind + d/(2*Math.PI)); S.crankA += d*180/Math.PI; c.tick += d; if (c.tick > Math.PI/6){ c.tick = 0; AU.ratchet(); } if (G.wind >= 12 && onceS('windFull')) say(tr('发条上满了。')); }
      else if (d < -.05 && onceS('windBack')) say(tr('发条只能往一个方向拧。顺着钟表走的方向转。'));
    };
    c.up = () => { const turns = G.wind - c.start; if (turns > .25){ say(tr('发条上了 {0} 圈。八音盒开始转。', Math.max(1, Math.round(turns)))); if (!G.strip.some(v => v) && onceS('emptyStrip')) say(tr('纸带上还没有孔，只听见齿轮在转。'), null, 2400); } else if (onceS('crankHint')) say(tr('按住摇柄，绕着它画圈。')); markDirty(); };
    return c;
  },
  key(){ G.wind = Math.min(12, G.wind + 1); S.crankA += 360; AU.ratchet(); say(tr('发条上了一圈。')); markDirty(); }
};
export function radioTick(dt){
  if (G.wind > 0){
    S.boxT += dt;
    if (S.boxT >= .36){ S.boxT = 0;
      const col = S.boxStep % 16, bits = G.strip[col];
      const vol = S.room === 'radio' ? .085 : S.room === 'corridor' ? .03 : .016;
      for (let r=0;r<6;r++) if (bits & (1<<r)){ AU.boxNote(NOTE_MIDI[r], vol); if (S.room === 'radio') S.notes.push({ x:1300 + rand(-40,40), y:390, r, t:0 }); }
      S.boxStep++; G.wind = Math.max(0, G.wind - 1/16);
      if (G.wind <= 0){ S.boxStep = 0; if (S.room === 'radio') say(tr('发条走完了，八音盒停下来。')); markDirty(); }
    }
  }
  const inRoom = S.room === 'radio' && G.radioOn;
  const { st, c, near } = stationNow();
  const ph = G.phones ? 1.7 : 1;
  const stat = inRoom ? (.055 + (1-c)*.09) * (1 - c*.85) * ph : 0, voice = inRoom ? c*.9*ph : 0;
  if (Math.abs(stat - S.rGains.st) > .004){ S.rGains.st = stat; AU.ready && AU.set(AU.rStatic.gain, stat, .15); }
  if (Math.abs(voice - S.rGains.v) > .01){ S.rGains.v = voice; AU.ready && AU.set(AU.rVoice.gain, voice, .2); }
  if (!inRoom){ S.stationId = null; return { st:null, c:0 }; }
  if (near && !st && onceS('far-'+near.id)) say(G.found.includes(near.id) ? tr('「{0}」这会儿不播（{1}）。只有很远的沙沙声。', near.name, near.desc) : tr('这个频率上只有很远的沙沙声。也许现在不是时候。'));
  if (st && c > .55){
    if (S.stationId !== st.id){ S.stationId = st.id; S.subT = 1.2; S.subI = 0; S.radioBeat = 0; S.motifI = 0; }
    if (c > .75 && !G.found.includes(st.id)){ G.found.push(st.id); AU.chime(); addLog(tr('在 {0} 收到「{1}」', st.f.toFixed(2), st.name)); say(tr('收到了：「{0}」。台表上多了一行。', st.name)); markDirty(); }
    if (st.id === 'music' && c > .7 && !G.ghost){ G.ghost = true; say(tr('纸带上浮出几个淡淡的格子，跟着曲子的拍子。'), null, 1500); markDirty(); }
    S.subT -= dt;
    if (S.subT <= 0){ S.subT = 7.5; let line = st.lines[S.subI % st.lines.length]; S.subI++;
      if (line === '@MAIL') line = tr('下一班邮船大约 {0} 靠舷。', hhmm(G.mail.nextAt)) + (G.mail.box.length ? tr('信箱里现在有 {0} 封。', G.mail.box.length) : '');
      say(line, st.name); }
    S.radioBeat = (S.radioBeat || 0) - dt;
    if (S.radioBeat <= 0){
      if (st.kind === 'murmur'){ AU.murmur(Math.floor(rand(4,8)), st.id === 'lighthouse' ? 520 : 760, .12); S.radioBeat = rand(1.1,2.2);
        if (st.id === 'lighthouse' && Math.random() < .25) AU.tone(110, 2.4, { vol:.08, att:.4, dest:AU.rVoice }); }
      else if (st.kind === 'beeps'){ const n = Math.floor(rand(1,6)); for (let k=0;k<n;k++) AU.rbeep(880, .12, k*.26); S.radioBeat = 1.2 + n*.26 + rand(.8,1.6); }
      else if (st.kind === 'whale'){ AU.rglide(rand(140,240), rand(180,360), rand(2.4,3.8)); S.radioBeat = rand(3,5); }
      else if (st.kind === 'music'){ const [col,row] = MUSIC_MOTIF[S.motifI % MUSIC_MOTIF.length]; AU.rbell(NOTE_MIDI[row]); S.motifI++; S.radioBeat = S.motifI % MUSIC_MOTIF.length === 0 ? 2.2 : .5; }
    }
  } else S.stationId = null;
  return { st, c };
}
export function radWallArt(g){
  const [x0,y0,x1,y1] = RAD_SHELL.b;
  g.fillStyle = '#4a3446'; g.fillRect(x0, y0, x1-x0, y1-y0);
  for (let x = x0; x < x1; x += 34) flat(g, cc => rr(cc, x, y0, 17, 470, 0), '#553c50', .6);
  for (let y = 70; y < 470; y += 70) for (let x = x0 + 20 + (y/70 % 2)*34; x < x1; x += 68) flat(g, cc => star5(cc, x, y, 4), '#c99aa8', .25);
  g.save(); g.globalAlpha = .45; g.globalCompositeOperation = 'soft-light'; g.fillStyle = pat(g, 2, 1.6, -.11, 20); g.fillRect(x0, y0, x1-x0, 470); g.restore();
  vol(g, cc => rr(cc, x0, 470, x1-x0, y1-470, 0), MAT.woodD, { k:2, s:5, tex:.6 });
  vol(g, cc => rr(cc, x0, 460, x1-x0, 18, 6), MAT.wood, { k:1.5, s:3.5 });
  g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); ell(g, 1360, 200, 78, 78); g.fill(); g.restore();
  vol(g, cc => { ell(cc, 1360, 200, 100, 100); ell(cc, 1360, 200, 78, 78); }, MAT.brass, { k:3, s:8, r:2, eo:true });
  // station table card
  shadow(g, 510, 340, 230, 16, .45);
  vol(g, cc => rr(cc, 296, 126, 428, 206, 8), MAT.paper, { k:2, s:5, r:1.5 });
  txt(g, tr('台 表'), 510, 152, 19, '#2a3550');
  flat(g, cc => rr(cc, 314, 158, 392, 2, 1), '#c4b392');
  vol(g, cc => ell(cc, 510, 132, 6, 6), MAT.rose, { k:.6, s:1.5, tex:0 });
}
export function radMidArt(g){
  shadow(g, 830, 790, 720, 26, .6);
  for (const x of [190, 1470]) vol(g, cc => rr(cc, x-14, 680, 28, 110, 8), MAT.woodD, { k:2, s:5 });
  vol(g, cc => rr(cc, 150, 576, 1360, 120, 10), MAT.woodD, { k:4, s:10, tex:.6, g:[576, 696, 'rgba(0,0,0,0)', 'rgba(6,4,8,.4)'] });
  for (const [x,w] of [[220,280],[1110,340]]) vol(g, cc => rr(cc, x, 600, w, 80, 8), MAT.woodD, { k:-2, s:-5, lx:.5, ly:.8, r:0, tex:.5 });
  for (const x of [360, 1280]) vol(g, cc => rr(cc, x-18, 634, 36, 8, 4), MAT.brass, { k:.6, s:1.5, tex:0 });
  // rug under the chair space
  vol(g, cc => ell(cc, 800, 840, 420, 40), { l:'#8a6070', b:'#6b4757', d:'#43293a' }, { k:2, s:5, tex:.7 });
  vol(g, cc => rr(cc, 130, 552, 1400, 30, 10), MAT.wood, { k:2, s:5, hl:[700,556,400,.2] });
  // radio cabinet
  shadow(g, 618, 566, 190, 12, .6);
  vol(g, cc => { cc.moveTo(456,560); cc.lineTo(456,340); cc.bezierCurveTo(456,300, 480,292, 618,292); cc.bezierCurveTo(756,292, 780,300, 780,340); cc.lineTo(780,560); cc.closePath(); }, MAT.wood, { k:5, s:12, r:3, hl:[520,320,120,.22] });
  flat(g, cc => rr(cc, 472, 322, 292, 108, 16), '#2a1810');
  vol(g, cc => rr(cc, 476, 440, 284, 104, 14), MAT.woodD, { k:-2, s:-4, lx:.5, ly:.8, r:0, tex:.5 });
  // headphone stand
  vol(g, cc => { rr(cc, 372, 400, 8, 156, 4); ell(cc, 376, 556, 26, 6); }, MAT.metalD, { k:.8, s:2, tex:0 });
  // music box body
  shadow(g, 1130, 566, 360, 14, .6);
  vol(g, cc => rr(cc, 790, 380, 680, 182, 16), MAT.wood, { k:5, s:12, r:3, hl:[900,390,200,.18] });
  vol(g, cc => rr(cc, 800, 398, 392, 158, 8), MAT.paper, { k:-1.5, s:-3, lx:.5, ly:.8, r:0, tex:.3 });
  g.fillStyle = 'rgba(160,140,110,.55)';
  for (let c=1;c<16;c++) g.fillRect(SX0 + c*STW - (c%4===0 ? 1 : .5), SY0, c%4===0 ? 2 : 1, 146);
  for (let r=1;r<6;r++) g.fillRect(SX0, SY0 + r*STH - .5, 378, 1);
  vol(g, cc => ell(cc, 1424, 470, 46, 46), MAT.brass, { k:3, s:7, r:2 });
  flat(g, cc => rr(cc, 1246, 524, 156, 14, 7), '#2a1810');
  txt(g, tr('发条'), 1218, 536, 14, '#f2dfc0');
  // desk lamp base
  vol(g, cc => ell(cc, 236, 556, 46, 10), MAT.metalD, { k:1, s:3 });
}
ROOMS.radio = {
  zc:[800, 450],
  enter(){
    setCtx([]);
    if (once('radioFirst')) say(tr('电台室里很安静，只有机器自己的底噪。'));
  },
  exit(){ if (G.phones){ G.phones = false; setAmbience(); } setCtx([]); },
  update(dt){
    if (G.wind > 0) S.crankA -= dt*20;
    S.dialGlow = (S.dialGlow||0) + ((G.radioOn ? 1 : 0) - (S.dialGlow||0))*(1-Math.exp(-dt*4));
    for (let i=S.notes.length-1;i>=0;i--){ const n = S.notes[i]; n.t += dt; if (n.t > 1.8) S.notes.splice(i,1); }
  },
  back(c){ setL(c, K_SP); c.fillStyle = '#0a1226'; c.fillRect(1100, -60, 600, 500); S.rStars.forEach(s => { c.fillStyle = '#e2ecf5'; c.globalAlpha = .8; c.fillRect(1240 + s.x*240, 100 + s.y*200, s.r*1.4, s.r*1.4); }); c.globalAlpha = 1; },
  room(c){
    shell(c, RAD_SHELL);
    layerCache(c, 'rad:wall', K_WL, radWallArt);
    setL(c, K_WL);
    const sorted = [...STATIONS].sort((a,b) => a.f - b.f);
    sorted.forEach((st,k) => { const y = 184 + k*24, f = G.found.includes(st.id);
      if (f){ txt(c, st.f.toFixed(2), 320, y, 13, '#2a3550', { mono:true, align:'left' }); txt(c, st.name, 384, y, 16, '#2a3550', { align:'left' }); txt(c, st.desc, 704, y, 11, '#7d7a72', { align:'right', sans:true }); }
      else { txt(c, '·.··', 320, y, 13, '#b5a888', { mono:true, align:'left' }); txt(c, '· · · · · ·', 384, y, 14, '#b5a888', { align:'left' }); } });
    hit(c, 'r:table', ['r', 296, 126, 428, 206], { label:tr('台表') });
    layerCache(c, 'rad:mid', 1, radMidArt);
    setL(c, 1);
    // dial window
    c.save(); c.beginPath(); rr(c, 480, 330, 276, 92, 12); c.clip();
    const dg = c.createLinearGradient(0, 330, 0, 422); const on = S.dialGlow || 0;
    dg.addColorStop(0, mixHex('#e7d6b2', '#ffe9b8', on)); dg.addColorStop(1, mixHex('#c9b48c', '#f5c87a', on)); c.fillStyle = dg; c.fillRect(480, 330, 276, 92);
    for (let k=0;k<=24;k++){ const f = FMIN + k*.05, x = fx(f), major = k%2 === 0; c.fillStyle = '#5a382c'; c.fillRect(x - (major ? 1 : .6), major ? 396 : 402, major ? 2 : 1.2, major ? 18 : 12); if (k%4 === 0) txt(c, f.toFixed(1), x, 390, 11, '#5a382c', { mono:true }); }
    txt(c, tr('航频 · MHz'), 490, 350, 9, '#9a7a62', { mono:true, align:'left', ls:2 });
    STATIONS.filter(st => G.found.includes(st.id)).forEach(st => flat(c, cc => ell(cc, fx(st.f), 418, 3, 3), '#c46a52'));
    vol(c, cc => rr(cc, fx(G.freq) - 2, 336, 4, 82, 2), MAT.rose, { k:.4, s:1, tex:0 });
    c.restore();
    hit(c, 'r:dial', ['r', 480, 330, 276, 92], { label:tr('刻度盘') });
    // magic eye
    const res = S.lastRadio || { c:0 }, cc0 = G.radioOn ? res.c : 0, th = (G.radioOn ? 22 + (1-cc0)*250 : 359.9)*D2R;
    vol(c, cc => ell(cc, 618, 480, 22, 22), MAT.metalD, { k:1, s:3, tex:0 });
    const eg = c.createRadialGradient(618, 480, 2, 618, 480, 16); eg.addColorStop(0, G.radioOn ? '#d4fbf4' : '#3a5a58'); eg.addColorStop(.6, G.radioOn ? '#62b0a8' : '#2a4444'); eg.addColorStop(1, '#244a4a');
    c.fillStyle = eg; c.beginPath(); ell(c, 618, 480, 15, 15); c.fill();
    c.fillStyle = '#0b1416'; c.beginPath(); c.moveTo(618, 480); c.arc(618, 480, 15, -Math.PI/2 - th/2, -Math.PI/2 + th/2); c.closePath(); c.fill();
    // knobs
    c.save(); c.translate(530, 490); vol(c, cc => ell(cc, 0, 0, 22, 22), MAT.cream, { k:1.5, s:4, r:1 }); c.rotate(G.radioOn ? Math.PI/2 : 0); flat(c, cc => rr(cc, -2.5, -19, 5, 14, 2.5), '#2a3550'); c.restore();
    hit(c, 'r:power', ['c', 530, 490, 28], { label:tr('开关') });
    c.save(); c.translate(704, 488); vol(c, cc => ell(cc, 0, 0, 34, 34), MAT.cream, { k:2, s:5, r:1.5 }); c.rotate(G.freq*620*D2R);
    for (let k=0;k<12;k++){ c.save(); c.rotate(k*Math.PI/6); flat(c, cc => rr(cc, -2, -33, 4, 7, 2), '#b4a181'); c.restore(); }
    flat(c, cc => rr(cc, -3, -28, 6, 16, 3), '#2a3550'); c.restore();
    hit(c, 'r:tune', ['c', 704, 488, 42], { label:tr('调频旋钮'), cur:'ew-resize' });
    // headphones
    if (!G.phones){ c.save(); c.translate(376, 398);
      vol(c, cc => { cc.moveTo(-34,30); cc.bezierCurveTo(-34,-30, 34,-30, 34,30); cc.lineTo(26,30); cc.bezierCurveTo(26,-18, -26,-18, -26,30); cc.closePath(); }, MAT.navy, { k:1.2, s:3, tex:0 });
      vol(c, cc => { rr(cc, -44, 22, 20, 36, 9); rr(cc, 24, 22, 20, 36, 9); }, MAT.rose, { k:1.5, s:4, tex:0 }); c.restore(); }
    hit(c, 'r:phones', ['r', 330, 370, 92, 100], { label:G.phones ? tr('摘下耳机') : tr('耳机') });
    // desk lamp
    vol(c, cc => { stemPath(cc, 236, 552, 222, 480, 244, 420, 4, 3); stemPath(cc, 244, 420, 270, 398, 300, 404, 3, 3); }, MAT.metalD, { k:.8, s:2, tex:0 });
    c.save(); c.translate(306, 410); c.rotate(.5);
    vol(c, cc => { cc.moveTo(-34,0); cc.bezierCurveTo(-30,-30, 30,-30, 34,0); cc.closePath(); }, S.rLampOff ? MAT.tealD : MAT.teal, { k:2, s:5, r:1.5 });
    flat(c, cc => ell(cc, 0, 0, 34, 6), S.rLampOff ? '#20302c' : '#ffe2b0'); c.restore();
    hit(c, 'r:lamp', ['r', 200, 360, 150, 200], { label:tr('台灯') });
    // music box: holes, ghost holes, playhead, crank, wind gauge
    c.fillStyle = '#2a1e18';
    for (let col=0;col<16;col++) for (let r=0;r<6;r++) if (G.strip[col] & (1<<r)){ c.beginPath(); rr(c, SX0 + col*STW + 4.5, SY0 + r*STH + 5.5, STW - 9, STH - 11, 5); c.fill(); }
    if (G.ghost) MUSIC_MOTIF.forEach(([col,r]) => { if (!(G.strip[col] & (1<<r))){ c.globalAlpha = .35 + .15*Math.sin(S.T*2 + col); c.fillStyle = '#c46a52'; c.beginPath(); ell(c, SX0 + (col+.5)*STW, SY0 + (r+.5)*STH, 7, 7); c.fill(); c.globalAlpha = 1; } });
    if (G.wind > 0){ c.globalAlpha = .3; c.fillStyle = '#f2a95b'; c.fillRect(SX0 + ((S.boxStep+15)%16)*STW, SY0, STW, 146); c.globalAlpha = 1; }
    hit(c, 'r:strip', ['r', SX0, SY0, 378, 146], { label:tr('八音盒纸带'), cur:'crosshair' });
    c.save(); c.translate(1424, 470); c.rotate(S.crankA*D2R);
    vol(c, cc => rr(cc, -6, -6, 62, 12, 6), MAT.brass, { k:1, s:2.5, tex:0 }); vol(c, cc => ell(cc, 56, 0, 11, 11), MAT.woodD, { k:1, s:2.5, tex:0 }); vol(c, cc => ell(cc, 0, 0, 12, 12), MAT.brass, { k:1, s:2.5, tex:0 });
    c.restore();
    hit(c, 'r:crank', ['c', 1424, 470, 84], { label:tr('摇柄（画圈）'), cur:'grab' });
    if (G.wind > 0) vol(c, cc => rr(cc, 1250, 527, G.wind/12*148, 8, 4), MAT.amber, { k:.4, s:1, tex:0 });
    // floating notes
    S.notes.forEach(n => { const q = n.t/1.8; txt(c, '♪', n.x + Math.sin(q*6)*8, n.y - q*90 - n.r*4, 20, '#ffd9a3', { a:1-q }); });
  },
  light(){
    lightBegin('#08060f', .56);
    if (!S.rLampOff) hole(1, 320, 470, 420, .95, null, 300);
    hole(1, 618, 376, 260, .55*(S.dialGlow||0), null, 140);
    hole(K_WL, 1360, 200, 220, .4);
    hole(K_WL, 510, 230, 300, .2, null, 160);
  },
  over(c, dt){
    if (!S.rLampOff){ glowL(c, 1, SWARM, 330, 440, 200, .45, null, 110); glowL(c, 1, SWARM, 306, 412, 40, .8); }
    glowL(c, 1, SWARM, 618, 376, 170, .4*(S.dialGlow||0), null, 70);
    if (G.radioOn) glowL(c, 1, STEAL, 618, 480, 34, .85);
    drawFX(c, dt);
  }
};
