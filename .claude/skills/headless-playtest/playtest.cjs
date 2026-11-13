// Headless CIVITAS playtest. Usage:
//   node playtest.cjs desk|phone [stopYear=2030] [outDir=.] [--throttle]
// Requires the dev server on http://127.0.0.1:5173 (npx vite --host 127.0.0.1 --port 5173).
const {chromium,devices}=require('playwright');
const path=require('path');
const args=process.argv.slice(2).filter(a=>!a.startsWith('--'));
const throttle=process.argv.includes('--throttle');
const mode=args[0]||'desk',stopYear=+args[1]||2030,out=args[2]||'.';
const mobile=mode==='phone';
const URL=process.env.CIVITAS_URL||'http://127.0.0.1:5173/';
const MARKS=[1400,1550,1700,1850,1950,2030];

(async()=>{
  const browser=await chromium.launch();
  const ctx=await browser.newContext(mobile?{...devices['Pixel 7']}:{viewport:{width:1440,height:900}});
  const p=await ctx.newPage();
  p.on('pageerror',e=>console.log('PAGE ERROR',e.message));
  await p.goto(URL);await p.waitForTimeout(800);
  await p.getByText('BEGIN CHRONICLE').click();await p.waitForTimeout(800);
  const bb=await (await p.$('canvas')).boundingBox();const cx=bb.x+bb.width/2,cy=bb.y+bb.height/2;
  await p.mouse.click(cx,cy);await p.waitForTimeout(400);
  await p.locator('button',{hasText:/zoning/i}).first().click();
  const s=mobile?0.45:1;
  const drag=async(type,dx,dy,w,h)=>{await p.locator('button',{hasText:type}).first().click();await p.mouse.move(cx+dx*s,cy+dy*s);await p.mouse.down();await p.mouse.move(cx+(dx+w)*s,cy+(dy+h)*s,{steps:8});await p.mouse.up();await p.waitForTimeout(200);};
  await drag('Residential',-200,-160,150,120);
  await drag('Commerce',-40,-40,60,60);
  await drag('Workshops',60,60,90,90);
  if(throttle){
    await p.evaluate(()=>{window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(e.duration))).observe({entryTypes:['longtask']});});
    await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate',{rate:4});
  }
  const resume=()=>p.locator('button',{hasText:'MAX'}).first().click().catch(()=>{});
  await resume();
  const t0=Date.now();let decisions=0,mi=0;
  while(Date.now()-t0<600000){
    await p.waitForTimeout(500);
    const choice=await p.$('.turningCards button, .eventChoices button');
    if(choice){decisions++;await choice.click();await p.waitForTimeout(300);await resume();continue;}
    const body=await p.innerText('body');
    const y=+(body.match(/[A-Z]+ (\d{4}) ·/)?.[1]||0);
    if(/Simulation paused/.test(body)&&y<stopYear)await resume();
    if(mi<MARKS.length&&y>=MARKS[mi]){
      await p.screenshot({path:path.join(out,`${mode}-y${MARKS[mi]}.png`)});
      const pop=body.match(/POPULATION\s+([\d,]+)/)?.[1],tre=body.match(/TREASURY\s+(-?[\d,]+)/)?.[1];
      console.log(`year ${y}  t=${Math.round((Date.now()-t0)/1000)}s  pop=${pop??'-'}  treasury=${tre??'-'}  decisions=${decisions}`);
      mi++;
    }
    if(y>=stopYear)break;
  }
  await p.screenshot({path:path.join(out,`${mode}-end.png`)});
  if(throttle){
    const r=await p.evaluate(()=>{const a=window.__lt;const t=a.reduce((x,y)=>x+y,0);return {count:a.length,max:Math.round(Math.max(0,...a)),avg:Math.round(t/Math.max(1,a.length)),totalMs:Math.round(t)};});
    console.log('long tasks',JSON.stringify(r));
  }
  console.log(`decisions answered: ${decisions}`);
  await browser.close();
})();
