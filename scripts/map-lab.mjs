// Map lab: grow one city headless with a fixed script of player actions, then
// render it with the real renderer in headless Chromium. Used to review the
// map engine (streets, terrain, landmarks, footprints) before and after a change.
//
//   node scripts/map-lab.mjs --out shots [--root .] [--seed 7] [--type river]
//        [--years 1400,1500,1600,1800,1900,2030] [--tag after] [--metrics]
//
// --root points at another checkout (e.g. a git worktree of an older commit),
// so the same script renders "before" and "after" with identical actions.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const arg=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i>0?process.argv[i+1]:fallback;};
const root=path.resolve(arg('root','.')),out=path.resolve(arg('out','map-lab-out')),seed=Number(arg('seed',7)),type=arg('type','river');
const years=arg('years','1400,1500,1600,1800,1900,2030').split(',').map(Number),tag=arg('tag','shot');
const from=p=>import(pathToFileURL(path.join(root,p)).href);
const {newCity,takeTurn,buildNear}=await from('tests/helpers/strategies.js');
const sim=await from('src/sim.js');

// The scripted player: the "sensible" strategy, plus a fixed zoning plan (new
// land every 30 years, spiralling out from the town) and a few landmarks set
// in the middle of freshly zoned land. Identical for every engine version.
export function labPlan(o){
  const types=['res','res','craft','res','trade','res'],plan=[];
  for(let i=0,year=1330;year<2030;i++,year+=30){
    const a=i*2.39996,rad=9+i*1.5,size=Math.round(8+i*.45);
    plan.push({year,type:types[i%types.length],x:Math.round(o.x+Math.cos(a)*rad-size/2),y:Math.round(o.y+Math.sin(a)*rad*.8-size/2),w:size,h:Math.round(size*.8)});
  }
  return plan;
}
const LANDMARKS={1360:'chapel',1450:'market',1560:'chapel',1690:'school',1870:'school'};
export function growLab(seed,type,years,hooks={}){
  let c=newCity(seed,type);const o=sim.cityOrigin(c),plan=labPlan(o),shots={};
  const last=Math.max(...years);
  while(c.year<last&&!c.finished){
    const next=Math.min(c.year+5-(c.year%5||0)||c.year+5,last);
    c=sim.advance(c,Math.max(1,Math.min(5,next-c.year)));
    c=takeTurn('sensible',c);
    for(const z of plan)if(z.year===c.year){
      c=sim.addZone(c,z.x,z.y,z.w,z.h,z.type);
      // A landmark in the middle of the new zone, when the script has one near this year.
      const kind=Object.entries(LANDMARKS).find(([y])=>Math.abs(Number(y)-z.year)<=15)?.[1];
      if(kind){const before=c.funds;c={...c,funds:1e7};const built=buildNear(c,kind,z.x+z.w/2,z.y+z.h/2,6);c={...(built||c),funds:before};}
    }
    hooks.turn?.(c);
    if(years.includes(c.year))shots[c.year]=JSON.parse(JSON.stringify(c));
  }
  return {shots,plan,origin:o};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  const t0=Date.now(),{shots,origin}=growLab(seed,type,years);
  console.log(`grown ${type} seed ${seed} to ${Math.max(...years)} in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  mkdirSync(out,{recursive:true});
  for(const [year,c] of Object.entries(shots)){
    const s=sim.stats(c);
    console.log(`${year}: pop ${s.population} buildings ${c.buildings.length} roads ${c.roads.length}`);
  }
  if(process.argv.includes('--metrics')){writeFileSync(path.join(out,`${tag}-cities.json`),JSON.stringify(shots));}
  // Render with the checkout's own renderer through its Vite dev server.
  const port=5300+Math.floor(Math.random()*400);
  const vite=spawn(path.join(root,'node_modules/.bin/vite'),['--port',String(port),'--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{vite.stdout.on('data',d=>{if(String(d).includes('Local'))resolve();});vite.on('exit',()=>reject(new Error('vite exited')));setTimeout(resolve,8000);});
  const {chromium}=createRequire(import.meta.url)('playwright'); // resolved from NODE_PATH or a global install
  const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1500,height:1080},deviceScaleFactor:1});
  page.on('pageerror',e=>console.error('page error',e.message));
  await page.route('**/lab.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0;background:#fff"><canvas id="c"></canvas></body>'}));
  await page.goto(`http://localhost:${port}/lab.html`);
  try{
    for(const [year,city] of Object.entries(shots))for(const view of ['map','close']){
      await page.evaluate(async({city,view,origin})=>{
        const {drawCity}=await import('/src/render.js');
        const W=100,H=72,width=1400,height=1008,c=document.getElementById('c');c.width=width;c.height=height;
        const zoom=view==='map'?1:3.2,scale=Math.min(width/W,height/H)*zoom;
        const v={zoom,dx:view==='map'?0:-(origin.x+.5-W/2)*scale,dy:view==='map'?0:-(origin.y+.5-H/2)*scale};
        drawCity(c.getContext('2d'),city,width,height,{view:v,markers:false,cartouche:false,now:0});
      },{city,view,origin});
      await page.locator('#c').screenshot({path:path.join(out,`${tag}-${type}${seed}-${year}-${view}.png`)});
    }
  }finally{await browser.close();vite.kill();}
  console.log('rendered to',out);
}
