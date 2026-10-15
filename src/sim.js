// CIVITAS v0.2.1: deterministic, parcel-based historical city simulation.
// Pure functions: no React, browser globals, or nondeterministic random state.
export const W=100, H=72, END_YEAR=2030, FIRST_YEAR=1300;
export const ZONES={
  res:{label:'Residential',color:'#977b60'},
  trade:{label:'Commerce',color:'#c2a064'},
  craft:{label:'Workshops',color:'#8c8c84'},
  farm:{label:'Agriculture',color:'#97aa77'},
  civic:{label:'Civic',color:'#ad8174'}
};
export const eras=[{y:1300,n:'Medieval'},{y:1500,n:'Early modern'},{y:1750,n:'Enlightenment'},{y:1850,n:'Industrial'},{y:1950,n:'Metropolitan'},{y:2000,n:'Contemporary'}];
export const eraAt=y=>eras.reduce((v,e)=>y>=e.y?e:v,eras[0]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const within=(x,y)=>x>=0&&x<W&&y>=0&&y<H;
export function rand(seed){let x=(seed|0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function hash(seed,...values){let n=(seed|0)^0x9e3779b9;for(const v of values){n=Math.imul(n^v,0x85ebca6b);n^=n>>>13;}return n|0;}
export function terrain(type,x,y){
  if(!within(x,y))return 'outside';
  if(type==='river'){const center=53+Math.sin(y*.095)*8+Math.sin(y*.033)*5;return Math.abs(x-center)<2.8?'water':'land';}
  if(type==='coast')return x>75+Math.sin(y*.1)*4.5+Math.sin(y*.039)*3.5?'water':'land';
  return 'land';
}
export function makeCity(name='New Valdoria',type='river',seed=23451){return {schema:2,id:`${Date.now()}-${(seed>>>0).toString(36)}`,name:String(name).trim().slice(0,40)||'Unnamed City',type:['river','plain','coast'].includes(type)?type:'river',seed:seed|0,year:FIRST_YEAR,turns:0,zones:[],buildings:[],roads:[],history:[],events:[],funds:400,residents:120,finished:false};}
export function zoneCell(city,x,y){if(!within(x,y)||terrain(city.type,x,y)!=='land')return null;for(let i=city.zones.length-1;i>=0;i--){let z=city.zones[i];if(x>=z.x&&y>=z.y&&x<z.x+z.w&&y<z.y+z.h)return z.type;}return null;}
export function density(city){const out=Object.fromEntries(Object.keys(ZONES).map(t=>[t,0]));for(let y=0;y<H;y++)for(let x=0;x<W;x++){let type=zoneCell(city,x,y);if(type)out[type]++;}return out;}
const footprint=b=>({x:Math.floor(b.x),y:Math.floor(b.y),w:Math.max(1,Math.ceil((b.x+b.w)-Math.floor(b.x))),h:Math.max(1,Math.ceil((b.y+b.h)-Math.floor(b.y)))});
const key=(x,y)=>y*W+x;
function occupiedMap(city){let taken=new Set();for(const b of city.buildings){const f=footprint(b);for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++)if(within(x,y))taken.add(key(x,y));}return taken;}
const roadMap=city=>new Set(city.roads.filter(r=>Number.isFinite(r.x)&&Number.isFinite(r.y)).map(r=>key(r.x,r.y)));
function patternFor(year){return year<1500?'organic':year<1800?'regular':year<1950?'industrial':'modern';}
// Streets occupy narrow, full-sized cells. Street style is fixed when land is zoned.
function streetTiles(rect,pattern,seed){const positions=[];const spacing=pattern==='organic'?6:pattern==='modern'?8:5;
  const ox=pattern==='organic'?Math.abs(seed%3):0;const oy=pattern==='organic'?Math.abs((seed>>>3)%3):0;
  for(let y=rect.y;y<rect.y+rect.h;y++)for(let x=rect.x;x<rect.x+rect.w;x++){
    const bendX=pattern==='organic'?Math.round(1.2*Math.sin((y+seed%19)*.31)):0;
    const bendY=pattern==='organic'?Math.round(1.2*Math.sin((x+seed%23)*.29)):0;
    if((x-rect.x+ox+bendX)%spacing===0||(y-rect.y+oy+bendY)%spacing===0){
      if(pattern==='organic'&&((x+y+seed)%29===0))continue;
      positions.push({x,y});
    }
  }return positions;
}
function streetPlan(city){
  const plan=new Set();
  for(const z of city.zones){const layout=z.pattern||patternFor(z.year||1300);
    for(const p of streetTiles(z,layout,hash(city.seed,z.x,z.y))){
      if(terrain(city.type,p.x,p.y)==='land')plan.add(key(p.x,p.y));
    }
  }
  return plan;
}
function extendStreet(city,p,plan,roads,blocked){
  for(let y=Math.max(0,p.y-3);y<=Math.min(H-1,p.y+3);y++)
    for(let x=Math.max(0,p.x-3);x<=Math.min(W-1,p.x+3);x++){
      const k=key(x,y);if(!plan.has(k)||roads.has(k)||blocked.has(k))continue;
      if(Math.abs(p.x-x)+Math.abs(p.y-y)>4)continue;
      city.roads.push({x,y,born:city.year,pattern:patternFor(city.year)});
      roads.add(k);
    }
}
export function addZone(city,x,y,w,h,type){
  if(!ZONES[type]||city.finished)return city;
  const rx=clamp(Math.floor(x),0,W-1),ry=clamp(Math.floor(y),0,H-1);
  const rw=clamp(Math.ceil(w),0,W-rx),rh=clamp(Math.ceil(h),0,H-ry);
  if(!rw||!rh)return city;
  const rect={x:rx,y:ry,w:rw,h:rh,type,year:city.year,pattern:patternFor(city.year)};
  let hasLand=false;for(let yy=ry;yy<ry+rh&&!hasLand;yy++)for(let xx=rx;xx<rx+rw;xx++)if(terrain(city.type,xx,yy)==='land'){hasLand=true;break;}
  if(!hasLand)return city;
  // Zoning only declares a future street plan; it does NOT instantly pave empty land.
  // Existing structures and their historic street patterns are retained on rezoning.
  return {...city,zones:[...city.zones,rect]};
}
const ageCapacity=year=>year<1750?8:year<1850?14:year<1950?27:year<2000?45:58;
const ageJobs=(year,type)=>type==='farm'?6: type==='civic'?10:type==='trade'?year<1850?11:year<1950?22:38:year<1850?16:year<1950?32:52;
export function stats(city){
  const z=density(city);let housing=120,jobs=55,civic=0,farms=0,commerce=0,industry=0,developedHousing=0;
  const sectorJobs={base:55,farm:0,trade:0,craft:0,civic:0};
  for(const b of city.buildings){
    if(b.type==='res'){housing+=b.capacity||8;developedHousing++;}
    if(b.type!=='res'){const work=b.jobs||4;jobs+=work;sectorJobs[b.type]+=work;}
    if(b.type==='trade')commerce++;
    if(b.type==='craft')industry++;
    if(b.type==='farm')farms++;
    if(b.type==='civic')civic++;
  }
  const population=clamp(Math.round(Number(city.residents)||120),40,Math.max(housing*1.65,120));
  const occupancy=population/Math.max(1,housing);
  const workerPopulation=population*.44;
  const employment=Math.min(jobs,workerPopulation);
  const unemployment=workerPopulation>0?Math.max(0,1-employment/workerPopulation):0;
  // Per-worker productivity is a game model, not a historical GDP estimate.
  const productPerWorker=650+Math.pow(Math.max(0,city.year-1300)/730,1.35)*62000;
  const tradeValue=city.year<1850?1.16:city.year<1950?1.24:1.38;
  const craftValue=city.year>=1850&&city.year<1950?1.30:1.09;
  const sectorProductivity=(sectorJobs.base*.86+sectorJobs.farm*.70+sectorJobs.trade*tradeValue+sectorJobs.craft*craftValue+sectorJobs.civic*1.03)/Math.max(1,jobs);
  const civicBoost=1+Math.min(.14,(civic/Math.max(1,population/900))*.035);
  const gdp=Math.round(employment*productPerWorker*sectorProductivity*civicBoost);
  const gdpPerCapita=Math.round(gdp/Math.max(1,population));
  const residentialLand=z.res||0;
  const sparseLand=Math.max(0,residentialLand/Math.max(1,population)-.18);
  const overcrowding=Math.max(0,occupancy-1);
  const prosperity=Math.round(clamp(56+Math.min(12,civic*.65)+Math.min(9,commerce*.20)-unemployment*31-overcrowding*33-Math.min(15,sparseLand*12),5,98));
  return {population,buildings:city.buildings.length,capacity:housing,jobs,employment:Math.round(employment),unemployment:Math.round(unemployment*100),jobCoverage:Math.round(jobs/Math.max(1,workerPopulation)*100),prosperity,zoned:z,year:city.year,gdp,gdpPerCapita,housingPressure:Math.round(occupancy*100),overcrowding:Math.round(overcrowding*100),densityPerZone:Math.round(population/Math.max(1,residentialLand)),treasury:Math.round(city.funds??0),commerce,industry,farms,civic,developedHousing};
}
function candidateCells(city,type,blocked,streets,plan,r){
  let items=[];
  // One pass through the city grid, no nested building collision scans.
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
    if(zoneCell(city,x,y)!==type||blocked.has(key(x,y))||plan.has(key(x,y))||streets.has(key(x,y)))continue;
    // Prefer connecting to existing development and roads, then spreading outward.
    const nearby=[[1,0],[-1,0],[0,1],[0,-1]].reduce((a,[dx,dy])=>a+(streets.has(key(x+dx,y+dy))?1:0),0);
    const center=Math.hypot(x-(city.type==='river'?35:43),y-34);
    const touching=[[1,0],[-1,0],[0,1],[0,-1]].reduce((a,[dx,dy])=>a+(blocked.has(key(x+dx,y+dy))?1:0),0);
    items.push({x,y,score:nearby*.28+touching*.11-center*.022+r()*.23});
  }
  items.sort((a,b)=>b.score-a.score);
  return items;
}
function createBuilding(city,type,p,year,r){
  // Building footprints remain inside an individual parcel; no overlapping tiles.
  let occupancyPressure=stats(city).housingPressure;
  const room=stats(city).zoned.res;
  const spaceFactor=room<45?1.25:room>600?.7:1;
  const densityFactor=type==='res'&&occupancyPressure>105?1.45:1;
  const capacity=type==='res'?Math.max(4,Math.round(ageCapacity(year)*spaceFactor*densityFactor*(.8+r()*.4))):0;
  const jobs=type==='res'?0:Math.round(ageJobs(year,type)*(.8+r()*.4));
  const size=.55+r()*.36;
  return {id:`b${year}-${city.buildings.length}`,x:p.x+.08,y:p.y+.08,w:size,h:size,born:year,type,capacity,jobs,level:1};
}
function densify(city,year,r){
  const houses=city.buildings.filter(b=>b.type==='res');if(!houses.length)return false;
  const eligible=houses.filter(b=>(b.level||1)<(year<1750?2:year<1850?3:year<1950?5:year<2000?9:12));
  if(!eligible.length)return false;
  const b=eligible[Math.floor(r()*eligible.length)];
  const upgrade=year<1850?5:year<1950?12:year<2000?24:35;
  const idx=city.buildings.indexOf(b);
  city.buildings[idx]={...b,level:(b.level||1)+1,capacity:(b.capacity||8)+upgrade,modified:year};
  return true;
}
function tick(city,year){
  city.year=year;
  const r=rand(hash(city.seed,year,12345));
  const roadCells=roadMap(city),blocked=occupiedMap(city),plan=streetPlan(city);
  let s=stats(city);const workforceDemand=s.population*.44;
  // Underzoning encourages vertical growth once land becomes scarce.
  const available={};for(const type of Object.keys(ZONES))available[type]=null;
  const supply=Object.values(s.zoned).reduce((a,b)=>a+b,0);
  const eraPace=year>=2000?12:year>=1950?10:year>=1850?7:year>=1750?5:year>=1500?3:1;
  const landPace=clamp(Math.sqrt(Math.max(1,supply)/450),.65,2.25);
  const additions=Math.max(1,Math.round(eraPace*landPace));
  // Re-evaluate local supply after *each* new building, avoiding empty ghost districts.
  for(let attempt=0;attempt<additions;attempt++){
    const housingRatio=s.population/Math.max(1,s.capacity);
    const needsHousing=housingRatio>=.83;
    const needsJobs=s.jobs<workforceDemand*1.1;
    const typeWeights=[
      ['res',needsHousing?5:0],
      ['trade',needsJobs?2.1:0],
      ['craft',needsJobs?1.75:0],
      ['farm',s.farms<Math.max(2,Math.floor(s.population/900))?1:0],
      ['civic',s.civic<Math.max(1,Math.floor(s.population/1800))?.9:0]
    ];
    let picks=[];for(const [type,weight] of typeWeights){if(weight<=0)continue;if(!available[type])available[type]=candidateCells(city,type,blocked,roadCells,plan,r);if(available[type].length)picks.push({type,weight});}
    if(!picks.length){if(needsHousing)densify(city,year,r);break;}
    const sum=picks.reduce((n,p)=>n+p.weight,0);let draw=r()*sum,selected=picks[0].type;
    for(const p of picks){draw-=p.weight;if(draw<=0){selected=p.type;break;}}
    const p=available[selected].shift();if(!p)continue;
    const building=createBuilding(city,selected,p,year,r);
    city.buildings.push(building);blocked.add(key(p.x,p.y));
    extendStreet(city,p,plan,roadCells,blocked);
    if(selected==='res')s.capacity+=building.capacity;
    else s.jobs+=building.jobs;
    if(selected==='farm')s.farms++;
    if(selected==='civic')s.civic++;
    // Avoid re-checking a just-built cell when considering other categories.
    for(const t of Object.keys(available))if(available[t])available[t]=available[t].filter(q=>q.x!==p.x||q.y!==p.y);
  }
  s=stats(city);
  if(s.housingPressure>1.04&&r()<.8)densify(city,year,r);
  s=stats(city);
  const old=city.residents;
  const naturalRate=year<1750?.015:year<1900?.028:year<2000?.045:.02;
  const capacityGap=s.capacity-old;
  const jobGap=s.jobs/.44-old;
  const spontaneous=old*naturalRate*5/10;
  const housingMigration=clamp(capacityGap*.065,-old*.012,Math.max(10,old*.045));
  const workMigration=clamp(jobGap*.018,-old*.018,Math.max(4,old*.02));
  const plannedGrowth=clamp(Math.sqrt(Math.max(1,s.zoned.res)/260),.7,2.6);
  const vacancies=clamp((s.capacity-old)/Math.max(1,old),0,1);
  const jobAccess=clamp(s.jobs/Math.max(1,old*.44),0,1);
  const cityPull=old*(year>=1800?.035:.012)*plannedGrowth*vacancies*jobAccess;
  city.residents=Math.round(clamp(old+spontaneous+housingMigration+workMigration+cityPull,40,s.capacity*1.55));
  const after=stats(city);
  city.funds=Math.round(Math.max(0,city.funds+Math.max(2,after.gdp*.000008)));
  city.history.push({year,population:after.population,buildings:after.buildings,prosperity:after.prosperity,gdp:after.gdp,gdpPerCapita:after.gdpPerCapita,housingPressure:after.housingPressure,densityPerZone:after.densityPerZone});
}
export function advance(city,years=5){
  if(city.finished||!Number.isFinite(years)||years<=0||city.year>=END_YEAR)return city;
  const target=Math.min(END_YEAR,city.year+Math.floor(years));
  const next={...city,turns:(city.turns||0)+1,buildings:[...city.buildings],roads:[...city.roads],zones:[...city.zones],history:[...city.history],events:[...city.events]};
  // Absolute-year seeds and fixed five-year ticks make +25 equivalent to five +5 actions.
  // A small final partial interval is only used when needed at campaign completion.
  while(next.year<target){const prev=next.year;const year=Math.min(target,Math.floor((next.year-FIRST_YEAR)/5+1)*5+FIRST_YEAR);tick(next,year);
    for(const era of eras)if(era.y>prev&&era.y<=year)next.events.push({year:era.y,text:`The ${era.n.toLowerCase()} era begins. New districts reflect changing planning traditions.`});
  }
  if(next.year>=END_YEAR){next.finished=true;if(!next.events.some(e=>e.year===END_YEAR&&e.text.includes('Chronicle closes')))next.events.push({year:END_YEAR,text:'The Chronicle closes. Your city is preserved in the Urban Atlas.'});}
  return next;
}
export function seedTown(city){
  // A coherent starting neighborhood on the western shore of a winding river.
  // Different layouts are chosen on coastal and plain terrain.
  const sx=city.type==='plain'?39:city.type==='coast'?39:26,sy=27;
  let c=addZone(city,sx,sy,19,16,'res');
  c=addZone(c,sx+5,sy+5,7,5,'trade');
  c=addZone(c,sx-9,sy-3,9,18,'farm');
  c=addZone(c,sx+10,sy+9,4,4,'civic');
  const r=rand(hash(city.seed,1300));
  const blocked=occupiedMap(c),streets=roadMap(c),plan=streetPlan(c);
  for(const [type,count] of [['res',14],['trade',3],['farm',3],['civic',1]]){
    const options=candidateCells(c,type,blocked,streets,plan,r);
    for(const p of options.slice(0,count)){
      c.buildings.push(createBuilding(c,type,p,1300,r));blocked.add(key(p.x,p.y));
      extendStreet(c,p,plan,streets,blocked);
    }
  }
  c.residents=120;
  const s=stats(c);
  c.history=[{year:1300,population:s.population,buildings:s.buildings,prosperity:s.prosperity,gdp:s.gdp,gdpPerCapita:s.gdpPerCapita,housingPressure:s.housingPressure,densityPerZone:s.densityPerZone}];
  return c;
}
// Legacy 0.1/0.2 saves remain playable. Old free-form roads are kept for drawing;
// new streets are represented as tiles. Missing fields are filled, not discarded.
export function normalizeCity(input){
  if(!input||!Array.isArray(input.zones)||!Array.isArray(input.buildings))return null;
  const c={...makeCity(input.name,input.type,input.seed),...input};
  c.year=clamp(Number(c.year)||FIRST_YEAR,FIRST_YEAR,END_YEAR);
  c.zones=input.zones.filter(z=>z&&ZONES[z.type]&&Number.isFinite(z.x)&&Number.isFinite(z.w));
  c.buildings=input.buildings.filter(b=>b&&ZONES[b.type]&&Number.isFinite(b.x)&&Number.isFinite(b.y));
  c.roads=Array.isArray(input.roads)?input.roads.filter(r=>r&&(Number.isFinite(r.x)&&Number.isFinite(r.y)||r.orientation)):[];
  c.history=Array.isArray(input.history)?input.history:[];
  c.events=Array.isArray(input.events)?input.events:[];
  c.residents=Number.isFinite(Number(c.residents))?Number(c.residents):120;
  c.funds=Number.isFinite(Number(c.funds))?Number(c.funds):400;
  c.finished=c.year>=END_YEAR;
  c.schema=2;
  return c;
}
