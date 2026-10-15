import {FIGURES,FIGURE_INDEX} from './legacy.js';
import {INITIAL_DEVELOPMENT,developmentOf,applyPulse,advanceDevelopment,accumulateDevelopment,productivityGrowth,developmentCapacity} from './development.js';
import {BASIC_INDEX,BASIC_BUILDINGS,BUILDING_EFFECTS,SPECIAL_BUILDINGS,basicsForYear} from './construction.js';
import {CARD_INDEX,TURNING_POINTS,turningYears,generateOffers,modifiers,activeSynergies,resolvedCards,currentTurningIndex} from './turningPoints.js';
// CIVITAS v0.7: balanced growth, cached zoning maps and reproducible historical campaigns.
// Pure functions: no React, browser globals, or nondeterministic random state.
export const W=100, H=72, END_YEAR=2030, FIRST_YEAR=1300;
export const ZONES={
  res:{label:'Residential',color:'#977b60'},
  trade:{label:'Commerce',color:'#c2a064'},
  craft:{label:'Workshops',color:'#8c8c84'},
  farm:{label:'Agriculture',color:'#97aa77'},
  civic:{label:'Civic',color:'#ad8174'},
  hotel:{label:'Tourism',color:'#ae86a5'}
};
export const eras=[{y:1300,n:'Medieval'},{y:1500,n:'Early modern'},{y:1750,n:'Enlightenment'},{y:1850,n:'Industrial'},{y:1950,n:'Metropolitan'},{y:2000,n:'Contemporary'}];
export const eraAt=y=>eras.reduce((v,e)=>y>=e.y?e:v,eras[0]);
export const STYLE_NAMES={timber:'Medieval timber',stone:'Early-modern stone',classical:'Classical masonry',brick:'Industrial brick',modernist:'Metropolitan concrete',contemporary:'Contemporary'};
export function styleAt(year){return year<1500?'timber':year<1750?'stone':year<1850?'classical':year<1950?'brick':year<2000?'modernist':'contemporary';}
export const HISTORICAL_INTERVAL=50;
const ZONE_CODES=Object.keys(ZONES);

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const within=(x,y)=>x>=0&&x<W&&y>=0&&y<H;
export function rand(seed){let x=(seed|0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function hash(seed,...values){let n=(seed|0)^0x9e3779b9;for(const v of values){n=Math.imul(n^v,0x85ebca6b);n^=n>>>13;}return n|0;}
export function terrain(type,x,y){
  if(!within(x,y))return 'outside';
  if(type==='river'){const center=53+Math.sin(y*.095)*8+Math.sin(y*.033)*5;return Math.abs(x-center)<2.8?'water':'land';}
  if(type==='coast')return x>75+Math.sin(y*.1)*4.5+Math.sin(y*.039)*3.5?'water':'land';
  if(type==='estuary'){const coast=x>77+Math.sin(y*.09)*3?'water':'land',mouth=47+Math.sin(y*.12)*7;return coast==='water'||(y>36&&Math.abs(x-mouth)<Math.max(3,(y-32)*.13))?'water':'land';}
  if(type==='lake'){const dx=x-64,dy=y-36;return dx*dx/150+dy*dy/105<1?'water':'land';}
  return 'land';
}
export function makeCity(name='New Valdoria',type='river',seed=23451){return {schema:8,development:{...INITIAL_DEVELOPMENT},productivityStock:720,culturalCapital:0,sacredCapital:0,knowledgeCapital:0,projects:[],nextProjectId:1,turning:{choices:[],pending:null,skipped:0,rerollsUsed:0},figures:[],legacyBonuses:{},landmarks:[],id:`${Date.now()}-${(seed>>>0).toString(36)}`,name:String(name).trim().slice(0,40)||'Unnamed City',type:['river','plain','coast','estuary','lake'].includes(type)?type:'river',seed:seed|0,year:FIRST_YEAR,turns:0,zones:[],buildings:[],roads:[],history:[],events:[],sites:[],snapshots:[],nextBuildingId:1,policies:{},momentumUntil:0,momentum:0,funds:400,residents:120,finished:false};}
// A zone plan is immutable between player edits: cache its raster and area counts.
// Full campaigns previously rebuilt 7,200 tile lookups for every single stats call.
const zoningCache=new WeakMap();
function zonedGrid(city){
  const cached=zoningCache.get(city.zones);
  if(cached&&cached.type===city.type)return cached;
  const grid=new Array(W*H).fill(null),counts=Object.fromEntries(Object.keys(ZONES).map(t=>[t,0]));
  for(const z of city.zones){for(let y=Math.max(0,z.y);y<Math.min(H,z.y+z.h);y++)for(let x=Math.max(0,z.x);x<Math.min(W,z.x+z.w);x++){
    if(terrain(city.type,x,y)==='land')grid[key(x,y)]=z.type;
  }}
  for(const value of grid)if(value&&counts[value]!==undefined)counts[value]++;
  const result={type:city.type,grid,counts};zoningCache.set(city.zones,result);return result;
}
export function zoneCell(city,x,y){if(!within(x,y))return null;return zonedGrid(city).grid[key(x,y)];}
export function density(city){return {...zonedGrid(city).counts};}

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
const streetCache=new WeakMap();
function streetPlan(city){
  const cached=streetCache.get(city.zones);if(cached&&cached.type===city.type&&cached.seed===city.seed)return cached.plan;
  const plan=new Set();
  for(const z of city.zones){const layout=z.pattern||patternFor(z.year||1300);
    for(const p of streetTiles(z,layout,hash(city.seed,z.x,z.y))){
      if(terrain(city.type,p.x,p.y)==='land')plan.add(key(p.x,p.y));
    }
  }
  streetCache.set(city.zones,{type:city.type,seed:city.seed,plan});return plan;
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
  if(type==='hotel'&&!city.turning?.cardPool?.includes('tourist_paradise'))return city;
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
const ageJobs=(year,type)=>type==='hotel'?(year<1900?15:year<1950?28:48):type==='farm'?6: type==='civic'?10:type==='trade'?year<1850?11:year<1950?22:38:year<1850?16:year<1950?32:52;
export function stats(city){
  const m=cityEffects(city);
  const legacyCapacity=Math.max(0,Number(m.legacyCapacity)||0);const z=density(city);let housing=120*(1+(m.housing||0))*(1+legacyCapacity),jobs=55,civic=0,farms=0,commerce=0,industry=0,developedHousing=0;
  const sectorJobs={base:55,farm:0,trade:0,craft:0,civic:0,hotel:0};let heritage=0,protectedCount=0,oldest=Infinity,hotels=0;
  for(const b of city.buildings){
    if(city.year-(b.born||city.year)>=120)heritage++;
    if(b.protected)protectedCount++;
    oldest=Math.min(oldest,b.born||city.year);
    if(b.type==='res'){housing+=(b.capacity||8)*(1+(m.housing||0))*(1+legacyCapacity);developedHousing++;}
    if(b.type!=='res'){const work=b.jobs||4;jobs+=work;sectorJobs[b.type]+=work;}
    if(b.type==='trade')commerce++;
    if(b.type==='craft')industry++;
    if(b.type==='farm')farms++;
    if(b.type==='civic')civic++;
    if(b.type==='hotel')hotels++;
  }
  housing=Math.round(housing);
  const population=clamp(Math.round(Number(city.residents)||120),40,Math.max(housing*1.65,120));
  const occupancy=population/Math.max(1,housing);
  const workerPopulation=population*.44;
  // Not every theoretical job vacancy is filled: unemployment includes friction,
  // economic mismatch and the accessibility consequences of insufficient commerce.
  // The previous model saturated at precisely 0% unemployment in almost all cities.
  const diversity=(sectorJobs.craft>0?1:0)+(sectorJobs.trade>0?1:0)+(sectorJobs.farm>0?1:0);
  const laborFriction=clamp(.085-(diversity-1)*.012-(m.services||0)*.012, .025, .17);
  const employment=Math.min(jobs,workerPopulation*(1-laborFriction));
  const unemployment=workerPopulation>0?Math.max(0,1-employment/workerPopulation):0;
  // Per-worker productivity is a game model, not a historical GDP estimate.
  // Actual productivity is a durable city-specific stock, not a calendar lookup.
  // Earlier eras are approximated only for migrated v0.7 save files.
  const productPerWorker=Math.max(200,(Number(city.productivityStock)||720)*(1+Math.max(0,Number(m.legacyProductivity)||0)));
  const momentum=developmentOf(city);
  const tradeValue=city.year<1850?1.16:city.year<1950?1.24:1.38;
  const craftValue=city.year>=1850&&city.year<1950?1.30:1.09;
  const industrialJobs=sectorJobs.craft;
  const universityCount=(city.landmarks||[]).filter(v=>v.kind==='university'&&city.buildings.some(b=>b.id===v.id)).length;
  const standingIds=new Set(city.buildings.map(b=>b.id));
  const currentLandmarks=(city.landmarks||[]).filter(v=>standingIds.has(v.id));
  const monumentCount=currentLandmarks.filter(v=>['monument','shrine'].includes(v.kind)).length;
  const sacredCount=currentLandmarks.filter(v=>['monastery','shrine'].includes(v.kind)).length;
  const artistCount=currentLandmarks.filter(v=>v.kind==='workshop').length;
  const artisticPower=(1+Math.max(-.7,m.arts||0))*(1+(m.artsMultiplier||0));
  const faithPower=(1+Math.max(-.7,m.faith||0))*(1+(m.faithMultiplier||0));
  const educationPower=1+Math.max(-.7,m.education||0)+(m.faithEducation||0)*sacredCount;
  const culturalPrestige=Math.round(clamp(((heritage*0.18*(1+(m.heritage||0)))+artistCount*12+monumentCount*9+Math.min(45,civic*.5))*artisticPower+(Number(city.culturalCapital)||0)*.45+momentum.culture*.45,0,10000));
  const religiousInfluence=Math.round(clamp((10+sacredCount*25+civic*.33)*faithPower+(Number(city.sacredCapital)||0)*.40+momentum.faith*.36,0,10000));
  const educationIndex=Math.round(clamp((10+universityCount*30+civic*.45)*educationPower+(Number(city.knowledgeCapital)||0)*.32+momentum.technology*.50,0,10000));
  const yearTourismFactor=city.year<1750?.08:city.year<1850?.18:city.year<1950?.55:1;
  const tourismAppeal=Math.round(clamp((10+culturalPrestige*.45+religiousInfluence*.30+monumentCount*2)*yearTourismFactor*(1+(m.pilgrimage||0)*sacredCount*.12+(m.tourismPerMonument||0)*monumentCount),0,1000));
  const pollution=Math.round(clamp(industry*.4*(city.year>=1800?1.4:.4)*(1+(m.pollution||0)),0,1000));
  const industryFactor=1+Math.max(-.8,(m.industry||0))*(1+(m.industrialMultiplier||0))+(m.industryPerThousand||0)*industrialJobs/1000;
  const tradeFactor=1+Math.max(-.8,m.trade||0);
  const innovationFactor=1+Math.max(0,m.innovation||0);
  const educationGDP=1+Math.min(1.8,(educationIndex/100)*.07*innovationFactor+universityCount*((m.universityProductivity||0)+(m.knowledgePerUniversity||0)));
  const sectorProductivity=(sectorJobs.base*.86+sectorJobs.farm*.70+sectorJobs.trade*tradeValue*tradeFactor+sectorJobs.craft*craftValue*industryFactor+sectorJobs.hotel*1.17*(1+(m.tourismIncome||0)*.35)+sectorJobs.civic*1.03)/Math.max(1,jobs);
  const civicBoost=1+Math.min(.25,(civic/Math.max(1,population/900))*.035*(1+(m.services||0)));
  const marketGDP=employment*productPerWorker*sectorProductivity*civicBoost*educationGDP*(1+Math.max(-.6,m.gdp||0))*(city.momentumUntil>=city.year?1+(city.momentum||0):1);
  // A spectacular monument by itself cannot create an unlimited tourism economy.
  // Visitor spending needs hotels, local commerce, jobs and transport capacity.
  // Day-trippers contribute modestly; tourism districts unlock the biggest gains.
  const visitorInfrastructure=Math.min(1.75,.08+hotels*.24+commerce*.008+(currentLandmarks.some(v=>v.kind==='port')?.12:0));
  const visitorJobs=Math.max(0,sectorJobs.hotel+sectorJobs.trade*.28);
  const tourismGDP=city.year<1800?0:yearTourismFactor*tourismAppeal*productPerWorker*
    (.16+(m.tourismIncome||0)*.24)*visitorInfrastructure*
    Math.min(1.8,.20+visitorJobs/190);
  const gdp=Math.round(marketGDP+tourismGDP);
  const touristVisits=Math.round(yearTourismFactor*Math.max(0,tourismAppeal)*(1+Math.min(4,Math.sqrt(Math.max(0,population)/500))))*25;
  const gdpPerCapita=Math.round(gdp/Math.max(1,population));
  const residentialLand=z.res||0;
  // Zoned but undeveloped land is a long-term spatial liability, not free
  // population capacity. Compact, appropriately zoned cities avoid this burden.
  const excessResidential=Math.max(0,residentialLand-developedHousing*1.65-100);
  const sprawlPressure=clamp(excessResidential/Math.max(120,developedHousing*2),0,2);
  const sparseLand=sprawlPressure;
  const overcrowding=Math.max(0,occupancy-1);
  const prosperity=Math.round(clamp(56+(m.prosperity||0)+Math.min(11,educationIndex*.025)+Math.min(7,culturalPrestige*.016)+Math.min(5,religiousInfluence*.015)-Math.min(22,pollution*.08)+Math.min(7,heritage*.035)+Math.min(12,civic*.65)+Math.min(9,commerce*.20)-unemployment*31-overcrowding*33-Math.min(16,sparseLand*8),5,98));
  // 0–100 local infrastructure efficiency incorporates footprint and land waste.
  const infrastructureEfficiency=Math.round(clamp(95-12*sprawlPressure-Math.min(18,overcrowding*22)+Math.min(5,(m.transport||0)*10),35,99));
  return {development:momentum,productivityGrowthPct:Math.round(productivityGrowth(city.year,momentum,unemployment*100)*10000)/100,infrastructureEfficiency,population,buildings:city.buildings.length,capacity:housing,jobs,employment:Math.round(employment),unemployment:Math.round(unemployment*100),jobCoverage:Math.round(jobs/Math.max(1,workerPopulation)*100),prosperity,zoned:z,year:city.year,gdp,gdpPerCapita,housingPressure:Math.round(occupancy*100),overcrowding:Math.round(overcrowding*100),densityPerZone:Math.round(population/Math.max(1,residentialLand)),treasury:Math.round(city.funds??0),commerce,industry,farms,civic,developedHousing,heritage,protectedCount,oldestBuilding:Number.isFinite(oldest)?oldest:null,lostBuildings:(city.sites||[]).length,culturalPrestige,religiousInfluence,educationIndex,tourismAppeal,touristVisits,pollution,hotels,monuments:monumentCount,universities:universityCount,artWorkshops:artistCount,activeSynergies:activeSynergies(city).map(v=>v.name),cardsSelected:currentTurningIndex(city)};
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
  const perks=cityEffects(city);
  const eraCapacity=developmentCapacity(city);
  const capacity=type==='res'?Math.max(4,Math.round(ageCapacity(year)*spaceFactor*densityFactor*eraCapacity*(1+(perks.newHousing||0))*(.8+r()*.4))):0;
  const jobs=type==='res'?0:Math.round(ageJobs(year,type)*(.65+eraCapacity*.35)*(.8+r()*.4));
  const size=.55+r()*.36;
  const id=`b${city.nextBuildingId++}`;
  return {id,x:p.x+.08,y:p.y+.08,w:size,h:size,born:year,type,capacity,jobs,level:1,style:styleAt(year),protected:false,renovations:[]};
}
function densify(city,year,r){
  const houses=city.buildings.filter(b=>b.type==='res');if(!houses.length)return false;
  const eligible=houses.filter(b=>(b.level||1)<(year<1750?2:year<1850?3:year<1950?5:year<2000?9:12));
  if(!eligible.length)return false;
  const b=eligible[Math.floor(r()*eligible.length)];
  const upgrade=Math.round((year<1850?5:year<1950?12:year<2000?24:35)*developmentCapacity(city));
  const idx=city.buildings.indexOf(b);
  city.buildings[idx]={...b,level:(b.level||1)+1,capacity:(b.capacity||8)+upgrade,modified:year,
    renovations:[...(b.renovations||[]),{year,action:'Expanded residential floors'}]};
  return true;
}

// Passive building effects only count structures that actually exist.
export function cityEffects(city){
  const effects={...modifiers(city)};
  for(const b of city.buildings||[]){if(!b.special)continue;
    for(const [name,value] of Object.entries(BUILDING_EFFECTS[b.special]||{}))effects[name]=(effects[name]||0)+value;
  }
  return effects;
}
function rememberLoss(city,b,year,reason){
  city.sites.push({id:b.id,type:b.type,style:b.style||styleAt(b.born),born:b.born,ended:year,x:b.x,y:b.y,reason,protected:!!b.protected});
}
// Plot identity survives renovation; replacement creates a NEW building identity.
function redevelopment(city,year,r){
  if(year<1650||city.buildings.length<25)return;
  const s=stats(city);
  const pressure=(s.housingPressure>87||s.unemployment>14);
  const attempts=year>=1950?2:1;
  for(let i=0;i<attempts;i++){
    const bonus=cityEffects(city).renewal||0;
    if(r()>(pressure?.55:.24)*Math.min(2,1+bonus))continue;
    const possible=city.buildings.filter(b=>!b.protected&&year-b.born>=Math.max(70,year<1850?130:85)&&
      terrain(city.type,Math.floor(b.x),Math.floor(b.y))==='land');
    if(!possible.length)break;
    const old=possible[Math.floor(r()*possible.length)];
    const x=Math.floor(old.x),y=Math.floor(old.y);
    const designated=zoneCell(city,x,y);
    let newType=designated||old.type;
    // A rezoning request can progressively change a historic neighborhood, never instantly.
    if(newType==='farm'&&year>=1900&&r()<.45)newType=old.type;
    const p={x,y};const replacement=createBuilding(city,newType,p,year,r);
    if(old.type==='res'&&newType==='res'&&s.housingPressure>95)replacement.capacity=Math.max(replacement.capacity,Math.round((old.capacity||8)*1.18));
    // No geometry changes in streets, and replacement remains within the original cell.
    replacement.x=old.x;replacement.y=old.y;
    replacement.w=Math.min(.92,Math.max(old.w||.65,replacement.w));
    replacement.h=Math.min(.92,Math.max(old.h||.65,replacement.h));
    rememberLoss(city,old,year,newType!==old.type?'Land-use conversion':'Urban redevelopment');
    const index=city.buildings.findIndex(b=>b.id===old.id);city.buildings[index]=replacement;
    if(newType!==old.type||year%50===0)city.events.push({year,type:'redevelopment',text:`An older ${ZONES[old.type].label.toLowerCase()} building was replaced by ${ZONES[newType].label.toLowerCase()} development.`});
  }
}
function localEvent(city,year){
  if(year<1450||year>2015||city.buildings.length<18)return;
  const r=rand(hash(city.seed,year,93421));
  if(r()>=.028)return;
  const possible=['fire','epidemic','boom'];
  if(['river','coast','estuary','lake'].includes(city.type))possible.push('flood');
  const kind=possible[Math.floor(r()*possible.length)];
  if(kind==='fire'||kind==='flood'){
    const center=city.buildings[Math.floor(r()*city.buildings.length)];
    const radius=kind==='fire'?3.6:4.1;
    const removed=city.buildings.filter(b=>Math.hypot(b.x-center.x,b.y-center.y)<radius&&r()<(b.protected?.12:.40));
    if(removed.length===0)return;
    const gone=new Set(removed.map(b=>b.id));
    city.buildings=city.buildings.filter(b=>!gone.has(b.id));
    city.landmarks=(city.landmarks||[]).filter(l=>!gone.has(l.id));
    for(const b of removed)rememberLoss(city,b,year,kind==='fire'?'Urban fire':'Local flooding');
    city.residents=Math.round(city.residents*(kind==='fire'?.975:.965));
    city.events.push({year,type:kind,impact:removed.length,text:`${kind==='fire'?'A destructive urban fire':'Severe flooding'} damaged ${removed.length} buildings. Streets remain, but reconstruction will take time.`});
  }else if(kind==='epidemic'){
    const lost=Math.max(5,Math.round(city.residents*(.035+r()*.06)));
    city.residents=Math.max(40,city.residents-lost);
    city.events.push({year,type:kind,impact:lost,text:`An epidemic took approximately ${lost.toLocaleString('en-US')} lives and temporarily disrupted urban growth.`});
  }else{
    city.momentumUntil=year+25;city.momentum=.12;
    city.funds+=Math.round(Math.max(10,stats(city).gdp*.00002));
    city.events.push({year,type:kind,text:'A wave of investment and enterprise boosted productivity for the next 25 years.'});
  }
}
export function captureSnapshot(city){
  return {year:city.year,population:stats(city).population,
    buildings:city.buildings.map(b=>[b.id,b.x,b.y,b.w,b.h,ZONE_CODES.indexOf(b.type),b.born,b.level||1,b.protected?1:0,b.modified||0,(b.renovations||[]).map(v=>[v.year,v.action]),b.special||'',b.label||'']),
    roads:city.roads.filter(r=>Number.isFinite(r.x)&&Number.isFinite(r.y)).map(r=>key(r.x,r.y)),
    legacyRoads:city.roads.filter(r=>r.orientation).map(r=>({...r})),
    zones:city.zones.map(z=>({...z}))};
}
export function snapshotCity(base,snap){
  if(!snap)return base;
  return {...base,year:snap.year,
    buildings:snap.buildings.map(a=>({id:a[0],x:a[1],y:a[2],w:a[3],h:a[4],type:ZONE_CODES[a[5]]||'res',born:a[6],level:a[7],protected:!!a[8],modified:a[9],style:styleAt(a[6]),renovations:(a[10]||[]).map(v=>({year:v[0],action:v[1]})),special:a[11]||undefined,label:a[12]||undefined})),
    roads:[...(snap.roads||[]).map(v=>({x:v%W,y:Math.floor(v/W)})),...(snap.legacyRoads||[])],zones:snap.zones||[]};
}
export function setProtection(city,id,value){
  if(city.finished)return city;
  const b=city.buildings.find(b=>b.id===id);if(!b||!!b.protected===!!value)return city;
  return {...city,buildings:city.buildings.map(item=>item.id===id?{...item,protected:!!value}:item),
    events:[...city.events,{year:city.year,type:'preservation',text:`${value?'Protected':'Released'} a ${styleAt(b.born)==='timber'?'medieval ':''}${ZONES[b.type].label.toLowerCase()} building dating to ${b.born}.`}]};
}
function tick(city,year){
  city.year=year;
  const r=rand(hash(city.seed,year,12345));
  localEvent(city,year);
  redevelopment(city,year,r);
  const roadCells=roadMap(city),blocked=occupiedMap(city),plan=streetPlan(city);
  let s=stats(city);const workforceDemand=s.population*.44;
  // Underzoning encourages vertical growth once land becomes scarce.
  const available={};for(const type of Object.keys(ZONES))available[type]=null;
  const supply=Object.values(s.zoned).reduce((a,b)=>a+b,0);
  const perks=cityEffects(city);
  const eraPace=year>=2000?12:year>=1950?10:year>=1850?7:year>=1750?5:year>=1500?3:1;
  const landPace=clamp(Math.sqrt(Math.max(1,supply)/450),.65,2.25);
  const additions=Math.max(1,Math.round(eraPace*landPace*(.70+developmentOf(city).infrastructure/90)*Math.min(2.8,Math.pow(developmentCapacity(city),.32))*(1+(perks.development||0)+Math.min(.25,perks.transport||0))));
  // Re-evaluate local supply after *each* new building, avoiding empty ghost districts.
  for(let attempt=0;attempt<additions;attempt++){
    const housingRatio=s.population/Math.max(1,s.capacity);
    const needsHousing=housingRatio>=.83;
    const needsJobs=s.jobs<workforceDemand*1.1;
    const typeWeights=[
      ['res',needsHousing?5:0],
      ['trade',needsJobs?2.1:0],
      ['craft',needsJobs?1.75*(1+(perks.industrialDevelopment||0)):0],
      ['farm',s.farms<Math.max(2,Math.floor(s.population/900))?1:0],
      ['civic',s.civic<Math.max(1,Math.floor(s.population/1800))?.9:0],
      ['hotel',year>=1800&&needsJobs&&s.tourismAppeal>=20?1.7:0]
    ];
    let picks=[];for(const [type,weight] of typeWeights){if(weight<=0)continue;if(!available[type])available[type]=candidateCells(city,type,blocked,roadCells,plan,r);if(available[type].length)picks.push({type,weight});}
    if(!picks.length){if(needsHousing)densify(city,year,r);break;}
    const sum=picks.reduce((n,p)=>n+p.weight,0);let draw=r()*sum,selected=picks[0].type;
    for(const p of picks){draw-=p.weight;if(draw<=0){selected=p.type;break;}}
    const p=available[selected].shift();if(!p)continue;
    const building=createBuilding(city,selected,p,year,r);
    city.buildings.push(building);blocked.add(key(p.x,p.y));
    extendStreet(city,p,plan,roadCells,blocked);
    if(selected==='res')s.capacity+=Math.round(building.capacity*(1+(perks.housing||0)));
    else s.jobs+=building.jobs;
    if(selected==='farm')s.farms++;
    if(selected==='civic')s.civic++;
    if(selected==='hotel')s.hotels++;
    // Avoid re-checking a just-built cell when considering other categories.
    for(const t of Object.keys(available))if(available[t])available[t]=available[t].filter(q=>q.x!==p.x||q.y!==p.y);
  }
  s=stats(city);
  if(s.housingPressure>104&&r()<.8)densify(city,year,r);
  s=stats(city);
  // Five-year dividends are BANKED before the development scores cool off.
  // The score can fall without erasing the wealth generated in earlier centuries.
  const enriched=accumulateDevelopment(city,5,s.unemployment);
  city.productivityStock=enriched.productivityStock;
  city.culturalCapital=enriched.culturalCapital;
  city.sacredCapital=enriched.sacredCapital;
  city.knowledgeCapital=enriched.knowledgeCapital;
  const cooled=advanceDevelopment(city,5);
  city.development=cooled.development;
  s=stats(city);
  const old=city.residents;
  const naturalRate=year<1750?.015:year<1900?.028:year<2000?.045:.02;
  const capacityGap=s.capacity-old;
  const jobGap=s.jobs/.44-old;
  // Sustained unemployment causes gradual outmigration and slows family growth.
  // It is not an instant punishment for a one-off migration card.
  const joblessness=Math.max(0,s.unemployment-18)/100;
  const spontaneous=old*naturalRate*5/10*(1+(perks.births||0))*(1-joblessness*.52);
  const housingMigration=clamp(capacityGap*.065,-old*.012,Math.max(10,old*.045));
  const workMigration=clamp(jobGap*.018,-old*.018,Math.max(4,old*.02));
  const plannedGrowth=clamp(Math.sqrt(Math.max(1,s.zoned.res)/260),.7,2.6);
  const vacancies=clamp((s.capacity-old)/Math.max(1,old),0,1);
  const jobAccess=clamp(s.jobs/Math.max(1,old*.44),0,1);
  const standing=new Set(city.buildings.map(b=>b.id));
  const landmarkMigration=(city.landmarks||[]).filter(l=>standing.has(l.id)).length*(perks.migrationPerLandmark||0);
  const faithPull=(perks.faithMigration||0)*Math.min(3,(city.landmarks||[]).filter(l=>['shrine','monastery'].includes(l.kind)).length);
  const merchantPull=(perks.merchantMigration||0)*Math.min(2,s.commerce/20);
  const cityPull=old*(year>=1800?.035:.012)*plannedGrowth*vacancies*jobAccess*(.50+Math.min(2.2,developmentOf(city).attraction/50))*(1+(perks.migration||0)+landmarkMigration+faithPull+merchantPull);
  const employmentExodus=old*joblessness*(year<1750?.0015:.006);
  city.residents=Math.round(clamp(old+spontaneous+housingMigration+workMigration+cityPull-employmentExodus,40,s.capacity*1.55));
  const after=stats(city);
  // Five-year municipal cash flow: revenue depends on the taxable economy,
  // upkeep scales with occupied parcels, streets and excess serviced land.
  // This replaces effectively unlimited treasuries in mature cities.
  const occupiedParcels=city.buildings.length;
  const undevelopedZoned=Math.max(0,Object.values(after.zoned).reduce((a,v)=>a+v,0)-occupiedParcels-city.roads.length);
  const taxIncome=Math.max(18,after.population*.075+after.gdp*.0000012)*(1+(perks.treasury||0));
  const upkeep=occupiedParcels*.12+city.roads.length*.035+undevelopedZoned*(year>=1800?.006:.0015);
  city.funds=Math.round(Math.max(0,city.funds+taxIncome-upkeep));
  // Grand Workshops generate commissions, never magically construct monuments.
  // The player chooses where every exceptional structure is placed.
  if(resolvedCards(city).some(c=>c.id==='grand_workshops')&&(city.landmarks||[]).some(v=>v.kind==='workshop')&&year%30===0){
    const count=Math.max(1,(city.landmarks||[]).filter(l=>l.kind==='workshop').length);
    const finished=(city.landmarks||[]).filter(l=>l.kind==='monument').length;
    const awaiting=(city.projects||[]).filter(p=>p.kind==='monument').length;
    if(finished+awaiting<8&&r()<Math.min(.85,.20+count*.18)){
      enqueueProject(city,'monument','masterpiece','Grand Workshops');
      city.events.push({year,type:'project',text:'Grand Workshops commissioned a new masterpiece monument. Choose its location on the map.'});
    }
  }
  city.history.push({year,population:after.population,buildings:after.buildings,prosperity:after.prosperity,gdp:after.gdp,gdpPerCapita:after.gdpPerCapita,housingPressure:after.housingPressure,infrastructureEfficiency:after.infrastructureEfficiency,unemployment:after.unemployment,treasury:city.funds,densityPerZone:after.densityPerZone,heritage:after.heritage,development:{...city.development},...Object.fromEntries(Object.entries(city.development).map(([k,v])=>[`${k}Score`,v])),productivityStock:city.productivityStock,culturalCapital:city.culturalCapital,sacredCapital:city.sacredCapital,knowledgeCapital:city.knowledgeCapital,culturalPrestige:after.culturalPrestige,tourismAppeal:after.tourismAppeal,religiousInfluence:after.religiousInfluence,educationIndex:after.educationIndex,pollution:after.pollution,turningPoints:currentTurningIndex(city)});
  if(year%HISTORICAL_INTERVAL===0||year===END_YEAR)city.snapshots.push(captureSnapshot(city));
}
// A Turning Point awards a commission, NEVER instant construction. This is also
// used for historical figures with a building commission.
export function enqueueProject(city,kind,source,label){
 if(!SPECIAL_BUILDINGS[kind])return false;
 const project={id:`p${city.nextProjectId++}`,kind,source,label:SPECIAL_BUILDINGS[kind].name,origin:label||'Turning Point',issuedYear:city.year,free:true};
 city.projects.push(project);return true;
}
export function placementIssue(city,kind,x,y){
 const xx=Math.floor(Number(x)),yy=Math.floor(Number(y));
 if(!Number.isFinite(xx)||!Number.isFinite(yy)||!within(xx,yy))return 'Outside the map';
 if(terrain(city.type,xx,yy)!=='land')return 'You must build on dry land';
 if(occupiedMap(city).has(key(xx,yy)))return 'A building already occupies this parcel';
 if(roadMap(city).has(key(xx,yy)))return 'This parcel is occupied by a street';
 if(kind==='port'&&![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>terrain(city.type,xx+dx,yy+dy)==='water'))return 'Ports need a parcel directly beside water';
 return null;
}
function constructAt(city,kind,x,y,source='basic',label=null){
 const definition=BASIC_INDEX[kind]||SPECIAL_BUILDINGS[kind];
 const name=label||definition?.name||'Civic Building';
 const [xx,yy]=[Math.floor(x),Math.floor(y)];
 const b={id:`b${city.nextBuildingId++}`,x:xx+.07,y:yy+.07,w:.86,h:.86,born:city.year,
  type:kind==='port'||kind==='market'||kind==='station'||kind==='transit_hub'?'trade':'civic',
  jobs:kind==='university'||kind==='research_center'?38:kind==='port'?50:kind==='workshop'?15:kind==='market'?18:10,
  capacity:0,level:1,style:styleAt(city.year),protected:true,renovations:[],special:kind,label:name};
 city.buildings.push(b);city.landmarks.push({id:b.id,x:xx,y:yy,kind,year:city.year,label:name,source});
 if(kind==='boulevard'){
  const blocked=occupiedMap(city),streets=roadMap(city);
  for(let offset=-11;offset<=11;offset++){
   const rx=xx+offset,ry=yy;
   if(!within(rx,ry)||terrain(city.type,rx,ry)!=='land'||blocked.has(key(rx,ry))||streets.has(key(rx,ry)))continue;
   city.roads.push({x:rx,y:ry,born:city.year,pattern:'boulevard'});streets.add(key(rx,ry));
  }
 }
 city.events.push({year:city.year,type:'landmark',text:`${name} constructed at parcel ${xx}, ${yy} — ${source==='basic'?'a civic investment': 'a Turning Point commission'}.`});
 return b;
}
// Return explicit errors so the player can choose a different site without losing a project.
export function placeConstruction(city,kindOrProject,x,y){
 if(!city||city.finished||city.turning?.pending)return {city,error:'Resolve your current Turning Point first'};
 const project=(city.projects||[]).find(p=>p.id===kindOrProject);
 const basic=project?null:BASIC_INDEX[kindOrProject];
 if(!project&&!basic)return {city,error:'Unknown or locked construction'};
 if(basic){
  if(city.year<basic.start||city.year>basic.end)return {city,error:`${basic.name} is available only during the ${basic.era} age`};
  if(city.buildings.filter(b=>b.special===basic.kind).length>=2)return {city,error:`Maximum of two ${basic.name} buildings per city`};
  if(city.funds<basic.cost)return {city,error:`Need ${basic.cost.toLocaleString()} treasury to build ${basic.name}`};
 }
 const kind=project?.kind||basic.kind;
 if(kind==='port'&&!['river','coast','estuary','lake'].includes(city.type))return {city,error:'This geography has no navigable shore'};
 if(basic?.requiresMegacity&&!city.legacyBonuses?.megacityCharter)return {city,error:'Requires the 50-city Megacity Charter Legacy tier'};
 if(basic?.requiresPopulation&&stats(city).population<basic.requiresPopulation)return {city,error:`Requires a thriving city of ${basic.requiresPopulation.toLocaleString()} residents`};
 const issue=placementIssue(city,kind,x,y);
 if(issue)return {city,error:issue};
 const next={...city,buildings:[...city.buildings],landmarks:[...(city.landmarks||[])],roads:[...city.roads],events:[...city.events],projects:[...(city.projects||[])]};
 if(project)next.projects=next.projects.filter(p=>p.id!==project.id);
 else next.funds-=basic.cost;
 const placed=constructAt(next,kind,x,y,project?.source||'basic',project?.kind?null:basic.name);
 const projectPulse={university:{education:.48,innovation:.25},research_center:{innovation:.38,education:.20},port:{trade:.35,transport:.16},workshop:{arts:.43},monument:{arts:.27,heritage:.18},monastery:{faith:.50,education:.10},shrine:{faith:.45},boulevard:{transport:.36},school:{education:.20},chapel:{faith:.22},hospital:{services:.25,prosperity:4}}[kind];
 if(projectPulse)next.development=applyPulse(next,projectPulse,'uncommon').development;
 const last=next.history.at(-1);
 if(last?.year===next.year){const updated=stats(next);next.history=[...next.history.slice(0,-1),{...last,population:updated.population,buildings:updated.buildings,gdp:updated.gdp,gdpPerCapita:updated.gdpPerCapita,prosperity:updated.prosperity,unemployment:updated.unemployment,infrastructureEfficiency:updated.infrastructureEfficiency,treasury:updated.treasury,development:{...next.development},...Object.fromEntries(Object.entries(next.development).map(([k,v])=>[`${k}Score`,v])),culturalPrestige:updated.culturalPrestige,religiousInfluence:updated.religiousInfluence,educationIndex:updated.educationIndex,tourismAppeal:updated.tourismAppeal}];}
 const index=next.snapshots.findIndex(v=>v.year===next.year);
 if(index>=0){next.snapshots=[...next.snapshots];next.snapshots[index]=captureSnapshot(next);}
 return {city:next,placed,error:null};
}
// Distinct civic footprints are added on free land near the city, or on waterfront for ports.
// Special buildings share the same persistent identity/heritage engine as other structures.
export function placeLandmark(city,kind,year=city.year){
  const occupied=occupiedMap(city),streets=roadMap(city);
  const focus=city.buildings.filter(b=>b.type==='civic'||b.special).at(-1)||city.buildings[0];
  const cx=focus?Math.floor(focus.x):35,cy=focus?Math.floor(focus.y):35;
  let spots=[];
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
    if(terrain(city.type,x,y)!=='land'||occupied.has(key(x,y))||streets.has(key(x,y)))continue;
    const shore=kind==='port';
    if(shore&&![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>terrain(city.type,x+dx,y+dy)==='water'))continue;
    spots.push({x,y,d:Math.hypot(x-cx,y-cy)+(zoneCell(city,x,y)?-.5:0)});
  }
  spots.sort((a,b)=>a.d-b.d||a.y-b.y||a.x-b.x);
  if(!spots.length)return false;
  const {x,y}=spots[0];const names=Object.fromEntries(Object.entries(SPECIAL_BUILDINGS).map(([k,v])=>[k,v.name]));
  const label=names[kind]||'Civic Landmark';
  const b={id:`b${city.nextBuildingId++}`,x:x+.07,y:y+.07,w:.86,h:.86,born:year,type:kind==='port'?'trade':'civic',jobs:kind==='university'?38:kind==='port'?50:kind==='workshop'?15:8,capacity:0,level:1,style:styleAt(year),protected:true,renovations:[],special:kind,label};
  city.buildings.push(b);city.landmarks.push({id:b.id,x,y,kind,year,label});
  if(kind==='boulevard'){
    const blocked=occupiedMap(city),streets=roadMap(city);
    for(let offset=-11;offset<=11;offset++){const rx=x+offset,ry=y;if(!within(rx,ry)||terrain(city.type,rx,ry)!=='land'||blocked.has(key(rx,ry))||streets.has(key(rx,ry)))continue;city.roads.push({x:rx,y:ry,born:year,pattern:'boulevard'});streets.add(key(rx,ry));}
  }
  city.events.push({year,type:'landmark',text:`${label} founded — a permanent new feature of the city.`});
  return true;
}
export function getOpportunity(id){if(typeof id!=='string')return null;if(CARD_INDEX[id])return CARD_INDEX[id];if(!id.startsWith('figure:'))return null;
 const figure=FIGURE_INDEX[id.slice(7)];return figure?{...figure,id,figureId:figure.id}:null;}
export function eligibleFigures(city){return FIGURES.map(f=>({...f,id:`figure:${f.id}`,figureId:f.id}));}
export function rerollTurningPoint(city){
 const pending=city.turning?.pending,used=city.turning?.rerollsUsed||0,limit=2+Math.round(city.legacyBonuses?.extraRerolls||0);
 if(!pending||used>=limit||city.finished)return city;
 const reroll=used+1,options=generateOffers(city,pending.index,reroll,eligibleFigures(city));
 if(options.length!==3)return city;
 return {...city,turning:{...city.turning,rerollsUsed:reroll,pending:{...pending,options}},events:[...city.events,{year:city.year,type:'reroll',text:`Turning Point options were reconsidered (${reroll}/${limit} rerolls used).`}]};
}
export function selectTurningPoint(city,cardId){
  const pending=city?.turning?.pending,card=getOpportunity(cardId);
  if(!pending||!card||!pending.options.includes(cardId)||city.finished||(card.cost||0)>(city.funds||0))return city;
  // Snapshot collections are copied and the choice can only be made once.
  const next={...city,buildings:[...city.buildings],landmarks:[...(city.landmarks||[])],figures:[...(city.figures||[])],events:[...city.events],history:[...city.history],snapshots:[...city.snapshots],projects:[...(city.projects||[])],nextProjectId:city.nextProjectId||1,turning:{...city.turning,choices:[...city.turning.choices,{index:pending.index,year:pending.year,cardId}],pending:null}};
  // The choice's short-lived development pulse is separate from its permanent
  // modifier. Physical-building rewards only activate when their site is placed.
  if(!card.building||card.kind==='figure'){next.development=applyPulse(next,card.effects||{},card.rarity,card.kind==='figure'?'figure':'card',card.scorePulse||{}).development;}
  if(card.kind==='figure'){next.funds=Math.max(0,next.funds-(card.cost||0));next.figures.push({id:card.figureId,year:city.year,effects:card.effects||{},rarity:card.rarity,name:card.name,domain:card.domain});}
  if(card.effects.popInstant){
    const before=next.residents;
    next.residents=Math.min(Math.round(before*(1+card.effects.popInstant)),Math.round(stats(next).capacity*1.65));
    next.events.push({year:next.year,type:'migration',text:`${card.name}: ${Math.max(0,next.residents-before).toLocaleString('en-US')} residents arrived, increasing housing demand.`});
  }
  if(card.building){
    const kinds=card.building==='double_monument'?['monument','monument']:[card.building];
    const newChoice=next.turning.choices.length-1;
    for(const kind of kinds)enqueueProject(next,kind,`choice:${newChoice}`,card.name);
    next.events.push({year:next.year,type:'project',text:`${kinds.length} ${kinds.length===1?'construction project is':'construction projects are'} ready to place on the map.`});
  }
  const combosBefore=activeSynergies(city),combosAfter=activeSynergies(next),newCombos=combosAfter.filter(s=>!combosBefore.some(x=>x.id===s.id));
  next.events.push({year:next.year,type:'card',cardId,text:`Turning Point ${pending.index+1}: ${card.name} chosen. ${card.description}`});
  for(const synergy of newCombos)next.events.push({year:next.year,type:'synergy',text:`New strategic combination unlocked: ${synergy.name}. ${synergy.description}`});
  // Store exact post-choice stats without rewriting already recorded historic surveys.
  const s=stats(next);const last=next.history[next.history.length-1];
  if(last?.year===next.year)next.history[next.history.length-1]={...last,population:s.population,gdp:s.gdp,gdpPerCapita:s.gdpPerCapita,prosperity:s.prosperity,unemployment:s.unemployment,infrastructureEfficiency:s.infrastructureEfficiency,treasury:s.treasury,development:{...next.development},...Object.fromEntries(Object.entries(next.development).map(([k,v])=>[`${k}Score`,v])),productivityStock:next.productivityStock,culturalCapital:next.culturalCapital,sacredCapital:next.sacredCapital,knowledgeCapital:next.knowledgeCapital,culturalPrestige:s.culturalPrestige,religiousInfluence:s.religiousInfluence,educationIndex:s.educationIndex,tourismAppeal:s.tourismAppeal};
  // Refresh an existing survey at this same year if one happens to coincide with an event.
  const pos=next.snapshots.findIndex(x=>x.year===next.year);
  if(pos!==-1)next.snapshots[pos]=captureSnapshot(next);
  return next;
}
export function advance(city,years=5){
  if(city.finished||!Number.isFinite(years)||years<=0||city.year>=END_YEAR)return city;
  if(city.turning?.pending)return city;
  const nextMilestone=turningYears()[currentTurningIndex(city)+(city.turning?.skipped||0)];
  const target=Math.min(END_YEAR,city.year+Math.floor(years),nextMilestone??END_YEAR);
  const next={...city,turns:(city.turns||0)+1,buildings:[...city.buildings],roads:[...city.roads],zones:[...city.zones],history:[...city.history],events:[...city.events],sites:[...(city.sites||[])],snapshots:[...(city.snapshots||[])],projects:[...(city.projects||[])],nextProjectId:city.nextProjectId||1,landmarks:[...(city.landmarks||[])],turning:{...city.turning,choices:[...(city.turning?.choices||[])],pending:null,skipped:city.turning?.skipped||0}};
  // Absolute-year seeds and fixed five-year ticks make +25 equivalent to five +5 actions.
  // A small final partial interval is only used when needed at campaign completion.
  while(next.year<target){const prev=next.year;const year=Math.min(target,Math.floor((next.year-FIRST_YEAR)/5+1)*5+FIRST_YEAR);tick(next,year);
    for(const era of eras)if(era.y>prev&&era.y<=year)next.events.push({year:era.y,text:`The ${era.n.toLowerCase()} era begins. New districts reflect changing planning traditions.`});
  }
  if(nextMilestone!==undefined&&next.year>=nextMilestone&&!next.finished){
    const index=currentTurningIndex(next)+(next.turning?.skipped||0);
    next.turning.pending={index,year:next.year,options:generateOffers(next,index,0,eligibleFigures(next))};
    next.events.push({year:next.year,type:'turning_point',text:`Turning Point ${index+1}: three futures await your choice.`});
  }
  if(next.year>=END_YEAR){next.finished=true;if(!next.events.some(e=>e.year===END_YEAR&&e.text.includes('Chronicle closes')))next.events.push({year:END_YEAR,text:'The Chronicle closes. Your city is preserved in the Urban Atlas.'});}
  return next;
}
export function seedTown(city){
  // A coherent starting neighborhood on the western shore of a winding river.
  // Different layouts are chosen on coastal and plain terrain.
  const sx=city.type==='plain'?39:city.type==='coast'?39:city.type==='estuary'?31:city.type==='lake'?33:26,sy=27;
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
  c.history=[{year:1300,development:{...c.development},...Object.fromEntries(Object.entries(c.development).map(([k,v])=>[`${k}Score`,v])),productivityStock:c.productivityStock,population:s.population,buildings:s.buildings,prosperity:s.prosperity,gdp:s.gdp,gdpPerCapita:s.gdpPerCapita,housingPressure:s.housingPressure,infrastructureEfficiency:s.infrastructureEfficiency,unemployment:s.unemployment,treasury:s.treasury,densityPerZone:s.densityPerZone,heritage:s.heritage,culturalPrestige:s.culturalPrestige,religiousInfluence:s.religiousInfluence,tourismAppeal:s.tourismAppeal}];
  c.snapshots=[captureSnapshot(c)];
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
  c.sites=Array.isArray(input.sites)?input.sites:[];
  c.snapshots=Array.isArray(input.snapshots)?input.snapshots:[];
  c.nextBuildingId=Number.isSafeInteger(input.nextBuildingId)&&input.nextBuildingId>0?input.nextBuildingId:1+Math.max(0,...c.buildings.map(b=>/^b\d+$/.test(b.id||'')?Number(b.id.slice(1)):0));
  // v0.2.1 building IDs were year-index strings; avoid collisions with those identifiers.
  c.buildings=c.buildings.map(b=>({...b,style:b.style||styleAt(b.born||1300),protected:!!b.protected,renovations:b.renovations||[]}));
  if(!c.snapshots.length)c.snapshots=[captureSnapshot(c)];
  c.residents=Number.isFinite(Number(c.residents))?Number(c.residents):120;
  c.funds=Number.isFinite(Number(c.funds))?Number(c.funds):400;
  c.projects=Array.isArray(input.projects)?input.projects.filter(v=>v&&typeof v.id==='string'&&SPECIAL_BUILDINGS[v.kind]):[];
  c.nextProjectId=Number.isSafeInteger(input.nextProjectId)&&input.nextProjectId>0?input.nextProjectId:1+Math.max(0,...c.projects.map(v=>/^p\d+$/.test(v.id)?Number(v.id.slice(1)):0));
  c.figures=Array.isArray(input.figures)?input.figures.filter(v=>v&&FIGURE_INDEX[v.id]).map(v=>({...v,domain:FIGURE_INDEX[v.id].domain,effects:FIGURE_INDEX[v.id].effects})):[];
  c.legacyBonuses=input.legacyBonuses&&typeof input.legacyBonuses==='object'?input.legacyBonuses:{};
  c.landmarks=Array.isArray(input.landmarks)?input.landmarks.filter(v=>v&&typeof v.kind==='string'&&Number.isFinite(v.x)&&Number.isFinite(v.y)).map(v=>({...v})):[];
  // v0.4 placed landmark rewards automatically. Preserve those physical buildings,
  // and attribute them to their original choice so their modifiers remain active.
  if((input.schema||0)<5 && Array.isArray(input.turning?.choices)){
    const used=new Set();
    input.turning.choices.forEach((choice,i)=>{
      const reward=getOpportunity(choice.cardId);
      if(!reward?.building)return;
      const candidates=reward.building==='double_monument'?['monument','monument']:[reward.building];
      for(const kind of candidates){
        const match=c.landmarks.findIndex((l,j)=>l.kind===kind&&!used.has(j));
        if(match<0)continue;
        used.add(match);c.landmarks[match].source=`choice:${i}`;
      }
    });
  }
  const choices=Array.isArray(input.turning?.choices)?input.turning.choices.filter(v=>getOpportunity(v?.cardId)).slice(0,TURNING_POINTS):[];
  let pending=input.turning?.pending;
  if(pending&&(!Array.isArray(pending.options)||pending.options.length!==3||pending.options.some(id=>!getOpportunity(id))))pending=null;
  // Old saves resume at the next future checkpoint; past opportunities are not granted retroactively.
  const campaignYears=turningYears();
  const skipped=Math.max(0,campaignYears.filter(y=>y<=c.year).length-choices.length-(pending?1:0));
  c.turning={choices,pending:pending||null,skipped:Math.max(Number(input.turning?.skipped)||0,skipped),rerollsUsed:Math.max(0,Number(input.turning?.rerollsUsed)||0),cardPool:Array.isArray(input.turning?.cardPool)?input.turning.cardPool:undefined,figurePool:Array.isArray(input.turning?.figurePool)?input.turning.figurePool:[],featuredFigures:Array.isArray(input.turning?.featuredFigures)?input.turning.featuredFigures:[]};
  c.finished=c.year>=END_YEAR;
  if(c.finished)c.turning.pending=null;
  c.development=developmentOf(input);
  c.productivityStock=Number(input.productivityStock)>0?Number(input.productivityStock):Math.max(720,Number(c.history.at(-1)?.gdpPerCapita||0)/.46||720);
  c.culturalCapital=Math.max(0,Number(input.culturalCapital)||0);
  c.sacredCapital=Math.max(0,Number(input.sacredCapital)||0);
  c.knowledgeCapital=Math.max(0,Number(input.knowledgeCapital)||0);
  c.schema=8;
  return c;
}
