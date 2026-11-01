import { vol } from '../core/paint';
import { rand } from '../core/util';
import { PR } from '../state/runtime';

/* ================= AUDIO ================= */
export interface AudioBus { [key: string]: any }
export const AU: AudioBus = {
  ready:false, on:true, voices:[],
  init(){
    if (this.ready) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.out = c.createGain(); this.out.gain.value = 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3;
    this.out.connect(comp); comp.connect(c.destination);
    this.verb = c.createConvolver(); this.verb.buffer = this.ir(3.4);
    const vr = c.createGain(); vr.gain.value = .5; this.verb.connect(vr); vr.connect(this.out);
    this.music = c.createGain(); this.music.gain.value = .85;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 950; this.lp.Q.value = .3;
    this.music.connect(this.lp); this.lp.connect(this.out);
    const ms = c.createGain(); ms.gain.value = .6; this.lp.connect(ms); ms.connect(this.verb);
    this.bells = c.createGain(); this.bells.gain.value = 1; this.bells.connect(this.out);
    const bs = c.createGain(); bs.gain.value = .7; this.bells.connect(bs); bs.connect(this.verb);
    this.fx = c.createGain(); this.fx.gain.value = .9; this.fx.connect(this.out);
    const fs = c.createGain(); fs.gain.value = .22; this.fx.connect(fs); fs.connect(this.verb);
    const n = c.sampleRate*2, b = c.createBuffer(1,n,c.sampleRate), d = b.getChannelData(0);
    for (let i=0;i<n;i++) d[i] = Math.random()*2-1; this.noise = b;
    const hn = c.sampleRate*4, hb = c.createBuffer(1,hn,c.sampleRate), hd = hb.getChannelData(0); let last = 0;
    for (let i=0;i<hn;i++){ last = (last + .02*(Math.random()*2-1))/1.02; hd[i] = last*3.2; }
    this.brown = hb;
    const hs = c.createBufferSource(); hs.buffer = hb; hs.loop = true;
    const hf = c.createBiquadFilter(); hf.type='lowpass'; hf.frequency.value = 150;
    this.hum = c.createGain(); this.hum.gain.value = .18; hs.connect(hf); hf.connect(this.hum); this.hum.connect(this.out); hs.start();
    // room ambience bed
    const as = c.createBufferSource(); as.buffer = this.noise; as.loop = true;
    this.ambF = c.createBiquadFilter(); this.ambF.type = 'bandpass'; this.ambF.frequency.value = 400; this.ambF.Q.value = .6;
    this.amb = c.createGain(); this.amb.gain.value = 0; as.connect(this.ambF); this.ambF.connect(this.amb); this.amb.connect(this.out); as.start();
    // radio: static + voice through a narrow "speaker" filter
    const rs = c.createBufferSource(); rs.buffer = this.noise; rs.loop = true;
    const rf = c.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 2100; rf.Q.value = .8;
    this.rStatic = c.createGain(); this.rStatic.gain.value = 0; rs.connect(rf); rf.connect(this.rStatic); rs.start();
    this.rVoice = c.createGain(); this.rVoice.gain.value = 0;
    this.rBus = c.createGain(); this.rBus.gain.value = 1;
    const spk = c.createBiquadFilter(); spk.type = 'bandpass'; spk.frequency.value = 1100; spk.Q.value = .5;
    this.rStatic.connect(this.rBus); this.rVoice.connect(spk); spk.connect(this.rBus); this.rBus.connect(this.out);
    const rvs = c.createGain(); rvs.gain.value = .15; this.rBus.connect(rvs); rvs.connect(this.verb);
    // music box bus
    this.box = c.createGain(); this.box.gain.value = .5; this.box.connect(this.out);
    const bxs = c.createGain(); bxs.gain.value = .5; this.box.connect(bxs); bxs.connect(this.verb);
    this.ready = true; this.setOn(this.on);
  },
  ir(sec){ const c=this.ctx, n=Math.floor(c.sampleRate*sec), b=c.createBuffer(2,n,c.sampleRate);
    for (let ch=0; ch<2; ch++){ const d=b.getChannelData(ch); for (let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6); } return b; },
  level(){ return this.on && PR.visible ? .9 : 0; },
  setOn(v){ this.on = v; this.apply(); },
  apply(){ if (!this.ready) return; const t = this.ctx.currentTime, L = this.level();
    if (L > 0 && this.ctx.state === 'suspended') this.ctx.resume();
    this.out.gain.cancelScheduledValues(t); this.out.gain.setTargetAtTime(L, t, L ? .4 : .25); },
  set(param, v, tc=.6){ if (!this.ready) return; param.cancelScheduledValues(this.ctx.currentTime); param.setTargetAtTime(v, this.ctx.currentTime, tc); },
  mf: m => 440*Math.pow(2,(m-69)/12),
  chord(ms, amp){
    if (!this.ready) return; const c=this.ctx, t=c.currentTime;
    this.voices.forEach(v => { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 2.2); v.o.forEach(o => o.stop(t+10)); });
    this.voices = ms.map((m,i) => {
      const f = this.mf(m), g = c.createGain(); g.gain.value = 0;
      const o = ([['triangle',1],['sine',1.004],['sine',.997]] as [OscillatorType, number][]).map(([ty,r]) => { const os=c.createOscillator(); os.type=ty; os.frequency.value=f*r; os.connect(g); os.start(t); return os; });
      g.connect(this.music);
      g.gain.setTargetAtTime(amp*(m<48?1.25:1)/Math.sqrt(ms.length), t+.2+i*.3, 2.4);
      return { g, o };
    });
  },
  bell(m, vol=.1, delay=0, dest){
    if (!this.ready) return; const c=this.ctx, t=c.currentTime+delay, f=this.mf(m), g=c.createGain();
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.012); g.gain.exponentialRampToValueAtTime(.0006,t+3.2);
    [[1,1],[2,.25],[3.01,.07],[4.2,.03]].forEach(([r,a]) => { const o=c.createOscillator(), og=c.createGain(); o.type='sine'; o.frequency.value=f*r; og.gain.value=a; o.connect(og); og.connect(g); o.start(t); o.stop(t+3.3); });
    g.connect(dest || this.bells);
  },
  boxNote(m, vol=.08){
    if (!this.ready) return; const c=this.ctx, t=c.currentTime, f=this.mf(m+12), g=c.createGain();
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.004); g.gain.exponentialRampToValueAtTime(.0005,t+1.6);
    [[1,1],[3.9,.18],[6.8,.05]].forEach(([r,a],i) => { const o=c.createOscillator(), og=c.createGain(); o.type='sine'; o.frequency.value=f*r; og.gain.setValueAtTime(a,t); og.gain.exponentialRampToValueAtTime(.0005, t + (i ? .25 : 1.6)); o.connect(og); og.connect(g); o.start(t); o.stop(t+1.65); });
    g.connect(this.box);
  },
  nz(dur, o: any = {}){
    if (!this.ready) return; const { type='bandpass', f=1000, q=1, vol=.1, att=.01, f2=null, delay=0, dest=null } = o;
    const c=this.ctx, t=c.currentTime+delay, s=c.createBufferSource(); s.buffer=this.noise; s.loop=true;
    const fl=c.createBiquadFilter(); fl.type=type; fl.frequency.setValueAtTime(f,t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2,t+dur); fl.Q.value=q;
    const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+att); g.gain.exponentialRampToValueAtTime(.0005,t+dur);
    s.connect(fl); fl.connect(g); g.connect(dest || this.fx); s.start(t, Math.random()); s.stop(t+dur+.05);
  },
  tone(f, dur, o: any = {}){
    if (!this.ready) return; const { type='sine', vol=.08, f2=null, delay=0, att=.005, vib=0, dest=null } = o;
    const c=this.ctx, t=c.currentTime+delay, os=c.createOscillator(), g=c.createGain(); os.type=type;
    os.frequency.setValueAtTime(f,t); if (f2) os.frequency.exponentialRampToValueAtTime(f2,t+dur);
    if (vib){ const l=c.createOscillator(), lg=c.createGain(); l.frequency.value=5.5; lg.gain.value=vib; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t+dur+.05); }
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+att); g.gain.exponentialRampToValueAtTime(.0005,t+dur);
    os.connect(g); g.connect(dest || this.fx); os.start(t); os.stop(t+dur+.05);
  },
  loop(kind){ // continuous sounds that start/stop (tap water, flame, pour)
    if (!this.ready) return null; const c=this.ctx, s=c.createBufferSource(); s.buffer=this.noise; s.loop=true;
    const fl=c.createBiquadFilter(), g=c.createGain(); g.gain.value=0;
    if (kind==='water'){ fl.type='bandpass'; fl.frequency.value=900; fl.Q.value=.7; }
    else if (kind==='pour'){ fl.type='bandpass'; fl.frequency.value=1400; fl.Q.value=1.2; }
    else { fl.type='lowpass'; fl.frequency.value=420; fl.Q.value=.4; }
    s.connect(fl); fl.connect(g); g.connect(this.fx); s.start();
    const vol = kind==='flame' ? .05 : .06;
    g.gain.setTargetAtTime(vol, c.currentTime, .08);
    const lfo = setInterval(() => { if (kind!=='flame') fl.frequency.setTargetAtTime(rand(700,1500), c.currentTime, .05); }, 90);
    return { stop(){ g.gain.setTargetAtTime(0, c.currentTime, .08); clearInterval(lfo); s.stop(c.currentTime+.4); } };
  },
  chain(){ this.nz(.05,{f:3200,q:6,vol:.1}); this.tone(1700,.06,{vol:.025,delay:.06}); this.nz(.05,{f:2500,q:6,vol:.06,delay:.13}); },
  whistle(){ this.tone(1480,1.9,{vol:.022,att:.45,vib:7}); this.tone(1487,1.9,{vol:.016,att:.5,vib:6}); this.nz(2.2,{type:'highpass',f:2500,q:.5,vol:.03,att:.2}); },
  sip(){ this.nz(.16,{f:520,q:2,vol:.06}); this.tone(230,.12,{vol:.025,f2:170,delay:.1}); },
  wood(){ this.tone(540,.09,{type:'triangle',vol:.09,f2:420}); this.nz(.04,{f:1800,q:3,vol:.05}); },
  whoosh(){ this.nz(.6,{type:'highpass',f:400,f2:3200,q:.5,vol:.05,att:.25}); },
  nope(){ this.tone(330,.2,{vol:.045,att:.02}); this.tone(277,.24,{vol:.045,att:.02,delay:.2}); },
  paper(){ for (let i=0;i<4;i++) this.nz(.07,{type:'highpass',f:2600,q:.7,vol:.05,delay:i*.06}); },
  stamp(){ this.tone(90,.28,{vol:.22,f2:50}); this.nz(.08,{f:600,q:1,vol:.1}); },
  soft(){ this.nz(.55,{type:'lowpass',f:520,q:.5,vol:.07,att:.18}); },
  leaf(){ this.nz(.32,{type:'highpass',f:3600,q:.5,vol:.03,att:.05}); },
  tap(){ this.tone(1900,.1,{vol:.025}); this.tone(2850,.08,{vol:.012}); },
  tick(m, vol){ this.tone(this.mf(m), .35, {vol, att:.01}); },
  step(){ this.tone(rand(70,90),.12,{vol:.06,f2:50}); this.nz(.06,{type:'lowpass',f:500,q:.5,vol:.03}); },
  spray(){ this.nz(.28,{type:'highpass',f:4200,q:.4,vol:.07,att:.02}); },
  click(){ this.nz(.03,{f:3000,q:4,vol:.08}); this.tone(1200,.04,{vol:.02}); },
  ignite(){ this.click(); this.nz(.5,{type:'lowpass',f:300,f2:900,q:.5,vol:.08,att:.08,delay:.08}); },
  knead(v=1){ this.tone(rand(85,110),.18,{vol:.07*v,f2:60}); this.nz(.14,{type:'lowpass',f:700,q:.5,vol:.04*v}); },
  ding(){ this.bell(88,.06); this.bell(93,.035,.12); },
  crunch(){ for (let i=0;i<3;i++) this.nz(.06,{f:rand(1800,3600),q:2,vol:.07,delay:i*.05}); },
  ratchet(){ this.nz(.025,{f:4200,q:8,vol:.06}); },
  scratch(){ this.nz(.22,{type:'highpass',f:3000,f2:5000,q:.6,vol:.025,att:.03}); },
  chime(){ [86,90,93,98].forEach((m,i) => this.bell(m,.035,i*.13)); },
  murmur(n=5, base=700, vol=.12){ for (let i=0;i<n;i++) this.nz(rand(.07,.16),{f:base*rand(.7,1.5),q:4,vol:vol*rand(.5,1),delay:i*rand(.11,.2),dest:this.rVoice}); },
  rbeep(f, d, delay){ this.tone(f, d, {vol:.12, att:.005, delay, dest:this.rVoice}); },
  rglide(f1, f2, d){ this.tone(f1, d, {vol:.14, f2, att:d*.3, dest:this.rVoice}); },
  rbell(m, delay=0){ this.bell(m, .12, delay, this.rVoice); }
};
