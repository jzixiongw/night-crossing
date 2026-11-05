/* Reproduce the candidate set using actual room renderers and ordinary save
   fixtures. No camera definitions, scene geometry, shaders or UI styles change.
   Run from repo root: CHROME=/path/to/chromium PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node submission/capture/capture-candidates.mjs
   Vite is a project dependency; Playwright and Chromium are capture-only tools. */
import { createServer } from 'vite';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out='submission/images/candidates'; mkdirSync(out,{recursive:true});
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const server=await createServer({server:{host:'127.0.0.1',port:8123,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const errors=[],frames=process.env.RESUME ? JSON.parse(readFileSync(out+'/capture-data.json','utf8')).frames : [];
const p=await browser.newPage({viewport:{width:1920,height:1200},deviceScaleFactor:1,reducedMotion:'reduce'});
p.on('pageerror',e=>errors.push(e.message));
const pause=ms=>p.waitForTimeout(ms);
const framesReady=()=>p.evaluate(async()=>{for(let i=0;i<5;i++)await new Promise(r=>requestAnimationFrame(r));});
const settle=()=>p.waitForFunction(()=>window.__three?.scene()&&!window.__three.S().trans&&!window.__three.S().camMove&&!window.__three.S().guideNavigating,null,{timeout:90000});
const go=async room=>{await p.evaluate(room=>window.__go(room),room);await settle();await pause(650);};
const view=async name=>{await p.evaluate(name=>window.__three.views.go(name,{instant:true}),name);await settle();await pause(550);};
const act=async (name,args=[])=>{await p.evaluate(async ([name,args])=>{const {ACT}=await import('/src/rooms/registry.ts');const parts=name.split(':');for(let n=parts.length;n>0;n--){const a=ACT[parts.slice(0,n).join(':')];if(a?.tap){a.tap([...parts.slice(n),...args]);return;}}throw Error('Unknown action: '+name);},[name,args]);await pause(500);};
const quiet=async()=>{await p.mouse.move(4,4);await p.evaluate(async()=>{(await import('/src/ui/captions.ts')).clearCaptions();(await import('/src/core/input.ts')).hideHints?.();});await pause(450);};
async function shot(id,title,recipe){await quiet();await framesReady();const file=id+'.jpg';await p.locator('#stage').screenshot({path:out+'/'+file,type:'jpeg',quality:95,animations:'disabled'});const state=await p.evaluate(()=>({room:window.__three.room(),view:window.__three.view(),viewport:[innerWidth,innerHeight],calls:window.__three.G().calls.map(x=>x.id),rig:window.__three.G().rig}));frames.push({id,file,title,recipe,...state});writeFileSync(out+'/capture-data.json',JSON.stringify({source,frames,errors},null,2)+'\n');console.log('CAPTURE',id,title);}
async function fixture(kind){await p.evaluate(async kind=>{const g=window.__three.G(),t=Date.now()+g.skew;
 if(kind==='plants'){const species=['vine','bell','fern','lamp','moss','tree','bell','vine'];g.pots=species.map(sp=>({sp,g:1,water:.9,lean:0,planted:t-3600000,bloomAt:0,stage:4}));g.rig=null;g.growLamp=true;}
 if(kind==='galley'){g.kettle={pos:'stove',water:.8,hot:1};g.tea={kind:'mint',level:.8,temp:.85,steep:1,leaves:true};g.dough={st:'proofed',strokes:12,shape:'round',proof:1};}
 if(kind==='radio'){g.radioOn=true;g.freq=1.09;g.found=['dispatch','weather','numbers'];g.strip=[1,0,4,0,16,0,4,0,2,0,8,0,32,0,8,0];g.wind=4;}
 },kind);await pause(1000);}
async function dock(port='dock'){await p.evaluate(port=>{const g=window.__three.G(),t=Date.now()+g.skew;g.call={to:port,from:'hub',dep:t-121000,eta:t-1000,docked:t-500};g.slips=[];g.rig={sp:'bell',glass:true,lit:true};g.journey={to:port,taken:true,course:true,grown:true,built:true,delivered:false,prepared:false};g.route={dock:'harbor',echo:'nebula',bell:'ring',ship:'quiet'}[port];},port);await go('hatch');await view('handover');await act('hat:door');await p.waitForFunction(()=>window.__three.S().doorK>=.99,null,{timeout:90000});}
try{
 await p.goto('http://127.0.0.1:8123/?lang=en');await p.waitForFunction(()=>window.__three&&!document.querySelector('#boardMute').disabled,null,{timeout:90000});await p.locator('#boardMute').click();await settle();await p.evaluate(()=>document.fonts.ready);
 await p.locator('.guide-skip').click();await pause(800);
 if(!process.env.RESUME){
 await act('cab:lamp');await shot('01-bridge','Bridge: a room aboard the night ship','Fresh voyage; choose Explore the ship; pull the lamp cord once.');
 await view('window');
 const client=async(dx,dy)=>p.evaluate(([dx,dy])=>{const d=window.__cabin3d,s=d.glassToScreen(dx,dy),r=document.querySelector('#scene').getBoundingClientRect();return{x:r.x+s.X/d.CW()*r.width,y:r.y+s.Y/d.CH()*r.height};},[dx,dy]);
 let q=await client(440,330);await p.mouse.move(q.x,q.y);await p.mouse.down();await p.waitForFunction(()=>window.__cabin3d.state().breaths.some(b=>b.r>=125),null,{timeout:90000});await p.mouse.up();
 await shot('02-window-condensation','Window: breath on the glass','Window viewpoint; press and hold on the left glass.');
 q=await client(440,330);await p.mouse.move(q.x,q.y);await p.mouse.down();await pause(600);
 for(let i=0;i<28;i++){const a=i/27*Math.PI*1.8,s=await client(440+Math.cos(a)*68,330+Math.sin(a)*55);await p.mouse.move(s.x,s.y);}
 await p.mouse.up();await p.waitForFunction(()=>window.__cabin3d.state().strokes.some(s=>s.length>=8),null,{timeout:20000});await shot('03-window-drawing','Window: drawing through condensation','The same glass; draw a curved stroke with pointer movement.');
 await view('desk');await p.evaluate(async()=>(await import('/src/rooms/cabin.ts')).openRoutes());await pause(700);await shot('04-sea-chart','Sea chart: choosing a destination','Open the normal destination panel from the bridge.');await p.keyboard.press('Escape');
 await fixture('plants');await go('green');await view('garden');await shot('05-greenhouse','Greenhouse: six species in bloom','Valid fully grown plant fixtures populate eight ordinary pots.');
 await act('gh:lamp');await shot('06-greenhouse-night','Greenhouse: grow light switched off','The same garden; switch off the grow light with its normal action.');
 await act('gh:plant',['1']);await p.locator('#plantBuild').click();await view('bench');await shot('07-lamp-workbench','Workbench: a flowering plant ready to assemble','Select the moonbell and move it using the normal plant panel.');
 await act('gh:work:glass');await act('gh:work:lamp');await go('hatch');await view('bay');await shot('08-lamp-assembled','Gangway: a finished plant lamp','Fit glass and attach the light using normal workbench actions, then visit the lamp on the gangway stand.');
 await fixture('radio');await go('radio');await view('room');await shot('09-radio-room','Radio room: the dispatch station','Valid radio frequency, punched strip and winding fixture; ordinary room view.');
 await view('tape');await shot('10-music-box','Music box: a punched paper tune','The same radio save; use the tape viewpoint.');
 await fixture('galley');await go('galley');await shot('11-galley','Galley: hot water and dough rising','Valid kettle, tea and risen-dough save values; no geometry edits.');
 }else{await fixture('plants');await act('gh:lamp');}
 await go('dome');await act('d:light');await p.mouse.move(4,4);await pause(4000);
 await p.evaluate(async()=>{const d=window.__three,{STARS,skyOff,SKY_W}=await import('/src/rooms/dome.ts'),{skyDir}=await import('/src/three/rooms/dome-sky.ts');const off=skyOff()/SKY_W*Math.PI*2,axis=new d.THREE.Vector3(0,1,0);const visible=STARS.map((s,i)=>{const v=skyDir(s.x,s.y).multiplyScalar(80).applyAxisAngle(axis,off).project(d.camera);return{i,x:v.x,y:v.y,z:v.z,t:s.tier};}).filter(s=>s.z<1&&s.x>-.65&&s.x<.65&&s.y>-.1&&s.y<.7&&s.t<2).sort((a,b)=>a.x-b.x);console.log('VISIBLE STARS',visible.length);const chosen=visible.filter((_,i)=>i%Math.max(1,Math.floor(visible.length/5))===0).slice(0,5);d.G().lines=chosen.slice(1).map((s,i)=>({id:i+1,a:{s:chosen[i].i},b:{s:s.i}}));d.G().lineSeq=chosen.length;if(chosen.length<4)throw Error('Too few visible stars');});
 await shot('12-observation-dome','Observation dome: connected stars','Switch off the lamp; save fixture connects real stars visible in the normal seated view.');
 await view('lie');await shot('13-dome-sky','Observation dome: lying under the stars','Use the existing lying viewpoint.');
 await dock('dock');await act('hat:give');await p.waitForFunction(async()=>{const h=await import('/src/rooms/hatch.ts');return h.gripped();},null,{timeout:90000});await shot('14-lamp-handover','Old Wharf: holding out a living lamp','Valid docked fixture; open the real door and offer the lamp with the normal action.');
 await act('hat:give');await p.waitForFunction(()=>window.__three.G().call?.gave,null,{timeout:90000});
 await p.evaluate(()=>{const g=window.__three.G(),t=Date.now()+g.skew;g.call.gave=t-18000;g.calls[0].at=t-18000;});await view('porthole');await shot('15-light-at-old-wharf','Old Wharf: the delivered lamp stays behind','After normal handover, advance its timestamp to the completed placement; porthole viewpoint.');
 await p.setViewportSize({width:1100,height:1500});await go('cabin');await view('desk');await shot('16-portrait-bridge','Portrait: the bridge','Actual portrait viewport and existing responsive camera.');
 await go('green');await view('garden');await act('gh:lamp');await shot('17-portrait-greenhouse','Portrait: the greenhouse','The same saved plants; actual portrait viewport and camera.');
 await dock('bell');await shot('18-portrait-evening-bell','Portrait: arriving at Evening Bell','Valid docked bell fixture; normal open door and portrait handover viewpoint.');
 if(errors.length)throw new Error('Page errors: '+errors.join('; '));
 console.log('DONE',frames.length,'frames, no page errors, source',source);
}finally{writeFileSync(out+'/capture-data.json',JSON.stringify({source,frames,errors},null,2)+'\n');await browser.close();await server.close();}
