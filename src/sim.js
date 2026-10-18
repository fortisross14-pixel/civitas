import {FIGURES,FIGURE_INDEX} from './legacy.js';
import {INITIAL_DEVELOPMENT,developmentOf,applyPulse,advanceDevelopment,accumulateDevelopment,productivityGrowth,developmentCapacity} from './development.js';
import {BASIC_INDEX,BASIC_BUILDINGS,BUILDING_EFFECTS,SPECIAL_BUILDINGS,basicsForYear,TOWN_CENTER_LEVELS,TOWN_CENTER_MAX,townCenterLevel} from './construction.js';
export {TOWN_CENTER_LEVELS,TOWN_CENTER_MAX,townCenterLevel};
import {maybeEvent,disasterEvent,eventDefinition,eventScale,timedEffects,fireproofed,eventSpot} from './events.js';
import {CARD_INDEX,TURNING_POINTS,turningYears,generateOffers,modifiers,activeSynergies,resolvedCards,currentTurningIndex} from './turningPoints.js';
import {W,H,CELLS,DIRS4,clamp,within,key,kx,ky,rand,hash,terrain,waterGrid,footprint,POP_SCALE} from './geo.js';
const K=POP_SCALE;
import {buildGrids,markRoad,markBuilding,pickParcel,growRoads,patternFor,layMainRoads,addRoute,routeBetween,fitWall,ringCells,findBridge,roadClass,homeLand,wallPolygon,insideWall,wallSegments,wallLength} from './growth.js';
export {wallPolygon,insideWall,wallSegments};
export {homeLand};
import {spatial,spatialEffects,freezeSpatial,thawSpatial} from './spatial.js';
import {POLICIES,POLICY_INDEX,activePolicies,policyIssue,policyEffects,policyHook} from './policies.js';
import {updateDistricts,districtDetails} from './districts.js';
import {characterOf} from './character.js';
export {POLICIES,POLICY_INDEX,activePolicies,policyIssue,districtDetails};
// Influence fields for the map layers and the building inspector.
export function cityFields(city){return spatial(city,cityEffects(city),activePolicies(city));}
import {DEFAULT_TAXES,TAX_LEVELS,taxesOf,taxDemand,taxProsperity,annualRevenue,annualUpkeep,annualExpenses,emptyBudget,zoningPrice} from './economy.js';
// CIVITAS v1.1 "Living City": a monthly simulation. Streets and buildings grow
// every month; population and treasury move every month; development momentum
// settles yearly; the archive records a survey every five years.
// Pure functions: no React, browser globals, or nondeterministic random state.
export {W,H,within,rand,terrain,patternFor,POP_SCALE};
export const END_YEAR=2030, FIRST_YEAR=1300;
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

export function makeCity(name='New Valdoria',type='river',seed=23451){return {schema:10,taxes:{...DEFAULT_TAXES},budget:{current:emptyBudget(FIRST_YEAR),last:null},growthCarry:0,roadNeed:0,walls:[],bridges:[],routes:[],month:0,development:{...INITIAL_DEVELOPMENT},productivityStock:720,culturalCapital:0,sacredCapital:0,knowledgeCapital:0,projects:[],nextProjectId:1,turning:{choices:[],pending:null,skipped:0,rerollsUsed:0},figures:[],legacyBonuses:{},landmarks:[],id:`${Date.now()}-${(seed>>>0).toString(36)}`,name:String(name).trim().slice(0,40)||'Unnamed City',type:['river','plain','coast','estuary','lake'].includes(type)?type:'river',seed:seed|0,year:FIRST_YEAR,turns:0,zones:[],buildings:[],roads:[],history:[],events:[],sites:[],snapshots:[],nextBuildingId:1,policies:{},momentumUntil:0,momentum:0,funds:400,residents:120*K,finished:false};}
// A zone plan is immutable between player edits: cache its raster and area counts.
// Full campaigns previously rebuilt 7,200 tile lookups for every single stats call.
const zoningCache=new WeakMap();
function zonedGrid(city){
  const cached=zoningCache.get(city.zones);
  if(cached&&cached.type===city.type)return cached;
  // `order` records which designation (by position) last touched each cell, so
  // new streets can head for the player's most recent zoning first.
  const grid=new Array(W*H).fill(null),order=new Int16Array(W*H),counts=Object.fromEntries(Object.keys(ZONES).map(t=>[t,0]));
  city.zones.forEach((z,i)=>{for(let y=Math.max(0,z.y);y<Math.min(H,z.y+z.h);y++)for(let x=Math.max(0,z.x);x<Math.min(W,z.x+z.w);x++){
    if(terrain(city.type,x,y)==='land'){grid[key(x,y)]=z.type==='clear'?null:z.type;order[key(x,y)]=i+1;}
  }});
  for(const value of grid)if(value&&counts[value]!==undefined)counts[value]++;
  const result={type:city.type,grid,order,counts};zoningCache.set(city.zones,result);return result;
}
export function zoneCell(city,x,y){if(!within(x,y))return null;return zonedGrid(city).grid[key(x,y)];}
export function density(city){return {...zonedGrid(city).counts};}

function occupiedMap(city){let taken=new Set();for(const b of city.buildings){const f=footprint(b);for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++)if(within(x,y))taken.add(key(x,y));}return taken;}
const roadMap=city=>new Set(city.roads.filter(r=>Number.isFinite(r.x)&&Number.isFinite(r.y)).map(r=>key(r.x,r.y)));
// Tourism districts open only once Tourist Paradise has actually been CHOSEN in
// this run. Owning the card in the Legacy Market only makes it eligible to appear.
export function tourismUnlocked(city){return (city?.turning?.choices||[]).some(p=>p?.cardId==='tourist_paradise');}
const insideRect=(z,r)=>z.x>=r.x&&z.y>=r.y&&z.x+z.w<=r.x+r.w&&z.y+z.h<=r.y+r.h;
function zoneRect(city,x,y,w,h){
  const rx=clamp(Math.floor(x),0,W-1),ry=clamp(Math.floor(y),0,H-1);
  const rw=clamp(Math.ceil(w),0,W-rx),rh=clamp(Math.ceil(h),0,H-ry);
  if(!rw||!rh)return null;
  let hasLand=false;for(let yy=ry;yy<ry+rh&&!hasLand;yy++)for(let xx=rx;xx<rx+rw;xx++)if(terrain(city.type,xx,yy)==='land'){hasLand=true;break;}
  return hasLand?{x:rx,y:ry,w:rw,h:rh}:null;
}
// Price of designating a rectangle: only parcels not already zoned are charged.
export function zoningCost(city,x,y,w,h){
  const rect=zoneRect(city,x,y,w,h);if(!rect)return {cells:0,cost:0};
  let cells=0;for(let yy=rect.y;yy<rect.y+rect.h;yy++)for(let xx=rect.x;xx<rect.x+rect.w;xx++)if(terrain(city.type,xx,yy)==='land'&&zoneCell(city,xx,yy)==null)cells++;
  return {cells,cost:Math.round(cells*zoningPrice(city.year))};
}
// The player's zoning action: surveying new land costs treasury; rezoning is free.
export function zoneLand(city,x,y,w,h,type){
  const next=addZone(city,x,y,w,h,type);
  if(next===city)return {city,undo:null,error:type==='hotel'&&!tourismUnlocked(city)?'Tourism districts need the Tourist Paradise card':'no buildable land was selected'};
  const {cells,cost}=zoningCost(city,x,y,w,h);
  if(cost>(Number(city.funds)||0))return {city,undo:null,error:`surveying ${cells} new parcels costs ${cost.toLocaleString('en-US')}, but the treasury holds ${Math.floor(city.funds).toLocaleString('en-US')}`};
  return {city:{...next,funds:city.funds-cost},undo:{kind:'zones',zones:city.zones,refund:cost},error:null,cost,cells};
}
// Remove zoning from an area. Existing buildings stay; nothing new is planned there.
export function clearZone(city,x,y,w,h){
  if(city.finished)return city;
  const rect=zoneRect(city,x,y,w,h);if(!rect)return city;
  if(!city.zones.some(z=>z.type!=='clear'&&z.x<rect.x+rect.w&&rect.x<z.x+z.w&&z.y<rect.y+rect.h&&rect.y<z.y+z.h))return city;
  return {...city,zones:[...city.zones.filter(z=>!insideRect(z,rect)),{...rect,type:'clear',year:city.year}]};
}
export function addZone(city,x,y,w,h,type){
  if(!ZONES[type]||city.finished)return city;
  if(type==='hotel'&&!tourismUnlocked(city))return city;
  const rect=zoneRect(city,x,y,w,h);if(!rect)return city;
  // Zoning designates land; streets grow toward it over the following months.
  // Earlier designations fully covered by this one are dropped (latest wins anyway).
  return {...city,zones:[...city.zones.filter(z=>!insideRect(z,rect)),{...rect,type,year:city.year,pattern:patternFor(city.year)}]};
}
const ageCapacity=year=>(year<1750?8:year<1850?14:year<1950?27:year<2000?45:58)*K;
const ageJobs=(year,type)=>K*ageJobsBase(year,type);
const ageJobsBase=(year,type)=>type==='hotel'?(year<1900?15:year<1950?28:48):type==='farm'?6: type==='civic'?10:type==='trade'?year<1850?11:year<1950?22:38:year<1850?16:year<1950?32:52;
export function stats(city){
  const m=cityEffects(city);
  const legacyCapacity=Math.max(0,Number(m.legacyCapacity)||0);const z=density(city);let housing=120*K*(1+(m.housing||0))*(1+legacyCapacity),jobs=55*K,civic=0,farms=0,commerce=0,industry=0,developedHousing=0;
  const sectorJobs={base:55*K,farm:0,trade:0,craft:0,civic:0,hotel:0};let heritage=0,protectedCount=0,oldest=Infinity,hotels=0;
  let vacant=0;
  for(const b of city.buildings){
    if(city.year-(b.born||city.year)>=120)heritage++;
    if(b.protected)protectedCount++;
    oldest=Math.min(oldest,b.born||city.year);
    // Empty homes and closed businesses stand, but house and employ nobody.
    if(b.vacant){vacant++;continue;}
    if(b.type==='res'){housing+=(b.capacity||8*K)*(1+(m.housing||0))*(1+legacyCapacity);developedHousing++;}
    if(b.type!=='res'){const work=b.jobs||4*K;jobs+=work;sectorJobs[b.type]+=work;}
    if(b.type==='trade')commerce++;
    if(b.type==='craft')industry++;
    if(b.type==='farm')farms++;
    if(b.type==='civic')civic++;
    if(b.type==='hotel')hotels++;
  }
  housing=Math.round(housing);
  const population=clamp(Math.round(Number(city.residents)||120*K),40*K,Math.max(housing*1.65,120*K));
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
  // Where things are: pollution near homes, service coverage, prestige, trade access.
  const sp=spatial(city,m,activePolicies(city)),place=spatialEffects(sp,city.year);
  const tourismAppeal=Math.round(clamp((10+culturalPrestige*.45+religiousInfluence*.30+monumentCount*2)*place.tourism*yearTourismFactor*(1+(m.pilgrimage||0)*sacredCount*.12+(m.tourismPerMonument||0)*monumentCount),0,1000));
  const pollution=Math.round(clamp(industry*.4*(city.year>=1800?1.4:.4)*(1+(m.pollution||0)),0,1000));
  const industryFactor=(1+softStack(Math.max(-.8,(m.industry||0))*(1+(m.industrialMultiplier||0)))+(m.industryPerThousand||0)*industrialJobs/(1000*K))*place.craftProductivity;
  const tradeFactor=(1+softStack(Math.max(-.8,m.trade||0)))*place.tradeProductivity;
  const innovationFactor=1+Math.max(0,m.innovation||0);
  const educationGDP=1+Math.min(1.8,(educationIndex/100)*.07*innovationFactor+universityCount*((m.universityProductivity||0)+(m.knowledgePerUniversity||0)));
  const sectorProductivity=(sectorJobs.base*.86+sectorJobs.farm*.70+sectorJobs.trade*tradeValue*tradeFactor+sectorJobs.craft*craftValue*industryFactor+sectorJobs.hotel*1.17*(1+(m.tourismIncome||0)*.35)+sectorJobs.civic*1.03)/Math.max(1,jobs);
  const civicBoost=1+Math.min(.25,(civic/Math.max(1,population/(900*K)))*.035*(1+(m.services||0)));
  const cycle=businessCycle(city);
  const marketGDP=employment*productPerWorker*sectorProductivity*civicBoost*educationGDP*(1+Math.max(-.6,m.gdp||0))*(1+cycle*.3)*(city.momentumUntil>=city.year?1+(city.momentum||0):1);
  // A spectacular monument by itself cannot create an unlimited tourism economy.
  // Visitor spending needs hotels, local commerce, jobs and transport capacity.
  // Day-trippers contribute modestly; tourism districts unlock the biggest gains.
  const visitorInfrastructure=Math.min(1.75,.08+hotels*.24+commerce*.008+(currentLandmarks.some(v=>v.kind==='port')?.12:0));
  const visitorJobs=Math.max(0,sectorJobs.hotel+sectorJobs.trade*.28);
  const tourismGDP=city.year<1800?0:yearTourismFactor*tourismAppeal*productPerWorker*
    (.16+(m.tourismIncome||0)*.24)*visitorInfrastructure*
    Math.min(1.8,.20+visitorJobs/(190*K));
  const gdp=Math.round(marketGDP+tourismGDP);
  const touristVisits=Math.round(yearTourismFactor*Math.max(0,tourismAppeal)*(1+Math.min(4,Math.sqrt(Math.max(0,population)/(500*K)))))*25;
  const gdpPerCapita=Math.round(gdp/Math.max(1,population));
  const residentialLand=z.res||0;
  // Zoned but undeveloped land is a long-term spatial liability, not free
  // population capacity. Compact, appropriately zoned cities avoid this burden.
  const excessResidential=Math.max(0,residentialLand-developedHousing*1.65-100);
  const sprawlPressure=clamp(excessResidential/Math.max(120,developedHousing*2),0,2);
  const sparseLand=sprawlPressure;
  const overcrowding=Math.max(0,occupancy-1);
  // Crowding cards cost livability; an empty treasury cuts public services.
  const shortfall=clamp(Number(city.shortfall)||0,0,1);
  const prosperity=Math.round(clamp(56+(m.prosperity||0)+place.prosperity+taxProsperity(city)-(m.crowding||0)-Math.min(15,shortfall*30)+Math.min(11,educationIndex*.025)+Math.min(7,culturalPrestige*.016)+Math.min(5,religiousInfluence*.015)-Math.min(22,pollution*.08)+Math.min(7,heritage*.035)+Math.min(12,civic*.65)+Math.min(9,commerce*.20)-unemployment*31-overcrowding*33-Math.min(16,sparseLand*8),5,98));
  // 0–100 local infrastructure efficiency incorporates footprint and land waste.
  const infrastructureEfficiency=Math.round(clamp(95-12*sprawlPressure-Math.min(18,overcrowding*22)+Math.min(5,(m.transport||0)*10),35,99));
  return {development:momentum,productivityGrowthPct:Math.round(productivityGrowth(city.year,momentum,unemployment*100)*10000)/100,infrastructureEfficiency,population,buildings:city.buildings.length,capacity:housing,jobs,employment:Math.round(employment),unemployment:Math.round(unemployment*100),jobCoverage:Math.round(jobs/Math.max(1,workerPopulation)*100),prosperity,zoned:z,year:city.year,gdp,gdpPerCapita,housingPressure:Math.round(occupancy*100),overcrowding:Math.round(overcrowding*100),densityPerZone:Math.round(population/Math.max(1,residentialLand)),treasury:Math.round(city.funds??0),commerce,industry,farms,civic,developedHousing,heritage,protectedCount,oldestBuilding:Number.isFinite(oldest)?oldest:null,lostBuildings:(city.sites||[]).length,culturalPrestige,religiousInfluence,educationIndex,tourismAppeal,touristVisits,pollution,hotels,monuments:monumentCount,universities:universityCount,artWorkshops:artistCount,activeSynergies:activeSynergies(city).map(v=>v.name),cardsSelected:currentTurningIndex(city),sectorJobs,informal:city.buildings.filter(b=>b.informal).length,vacant,cycle:Math.round(cycle*1000)/1000,shortfall:Math.round(shortfall*100),pollutedHomes:Math.round(sp.pollutedShare*100),serviceCoverage:Math.round(sp.coverage*100),prestigeHomes:Math.round(sp.prestigeShare*100),tradeAccess:Math.round(sp.tradeAccess*100),riverIndustry:Math.round(sp.riverIndustry*100),placeProsperity:Math.round(place.prosperity*10)/10};
}
export function demand(city){
  const s=stats(city);
  const level=value=>value>=72?'urgent':value>=38?'needed':'stable';
  // The explanation is chosen from the same level shown to the player.
  const make=(value,text,missing=false)=>{const v=Math.round(clamp(value,0,100)),l=level(value);return {value:v,level:l,reason:missing?text.none:l==='stable'?text.ok:text.short};};
  return {
    residential:make((s.housingPressure-84)*1.6,{ok:'Housing stock is keeping pace.',short:'Housing pressure is limiting migration.'}),
    commercial:make((s.population/Math.max(1,s.commerce*260*K)-.8)*48,{none:'No commercial district has developed yet.',ok:'Shops and services are keeping up.',short:'Shops and services are scarce for the population.'},!s.commerce),
    industrial:make((s.population/Math.max(1,s.industry*360*K)-.75)*42,{none:'No workshop district has developed yet.',ok:'Workshops supply enough productive jobs.',short:'The city needs more productive jobs.'},!s.industry),
    civic:make((s.population/Math.max(1,s.civic*820*K)-.72)*48,{none:'No civic district has developed yet.',ok:'Public institutions are keeping up.',short:'Public institutions are thin for this population.'},!s.civic),
    jobs:make((s.unemployment-4)*4+(s.jobCoverage<102?(102-s.jobCoverage)*1.6:0),{ok:'The labour market is balanced.',short:'Employment demand is outpacing available work.'})
  };
}
// Growth gravitates toward the player's Town Center once it is placed, else
// toward where the town was founded. Saves from before v1.0.1 have no
// recorded origin and keep their original reference point.
export function cityOrigin(city){
  const c=city?.center;
  if(c&&Number.isFinite(c.x)&&Number.isFinite(c.y))return {x:c.x,y:c.y};
  const o=city?.origin;
  if(o&&Number.isFinite(o.x)&&Number.isFinite(o.y))return o;
  return {x:city?.type==='river'?35:43,y:34};
}
function createBuilding(city,type,p,year,r,context=null){
  // Building footprints remain inside an individual parcel; no overlapping tiles.
  // Callers inside a growth tick pass the tick's running totals; otherwise the
  // city statistics are computed once here (previously twice per building).
  const ctx=context||(()=>{const s=stats(city);return {housingPressure:s.housingPressure,resZoned:s.zoned.res};})();
  let occupancyPressure=ctx.housingPressure;
  const room=ctx.resZoned;
  const spaceFactor=room<45?1.25:room>600?.7:1;
  const densityFactor=type==='res'&&occupancyPressure>105?1.45:1;
  const perks=cityEffects(city);
  const eraCapacity=developmentCapacity(city);
  const capacity=type==='res'?Math.max(4*K,Math.round(ageCapacity(year)*spaceFactor*densityFactor*eraCapacity*(1+(perks.newHousing||0))*(.8+r()*.4))):0;
  const jobs=type==='res'?0:Math.round(ageJobs(year,type)*(.65+eraCapacity*.35)*(.8+r()*.4));
  // Varied but parcel-contained footprints make neighborhoods read as places,
  // while collision and capacity logic continue to use the same parcel.
  const w=.48+r()*.42,h=.48+r()*.42;
  const id=`b${city.nextBuildingId++}`;
  // Informal (unzoned) growth is smaller and humbler than planned districts.
  const informal=!!p.informal,shrink=informal?.75:1;
  return {id,x:p.x+.08,y:p.y+.08,w,h,born:year,type,capacity:Math.round(capacity*shrink),jobs:Math.round(jobs*shrink),level:1,style:styleAt(year),protected:false,renovations:[],...(informal?{informal:true}:{})};
}
function densify(city,year,r){
  const houses=city.buildings.filter(b=>b.type==='res');if(!houses.length)return false;
  const eligible=houses.filter(b=>(b.level||1)<(year<1750?2:year<1850?3:year<1950?5:year<2000?9:12));
  if(!eligible.length)return false;
  const b=eligible[Math.floor(r()*eligible.length)];
  const upgrade=Math.round((year<1850?5:year<1950?12:year<2000?24:35)*K*developmentCapacity(city));
  const idx=city.buildings.indexOf(b);
  city.buildings[idx]={...b,level:(b.level||1)+1,capacity:(b.capacity||8*K)+upgrade,modified:year,
    renovations:[...(b.renovations||[]),{year,action:'Expanded residential floors'}]};
  return true;
}

// v1.3: stacked sector bonuses have diminishing returns (+100% → +74%, +200% → +118%),
// so a city leaning hard into one identity stays strong without running away.
const softStack=x=>x>0?x/(1+.35*x):x;
// A slow boom-and-bust rhythm unique to each city (period 18–30 years).
// Positive values are expansions: more business growth and a little more GDP.
export function businessCycle(city){
  const seed=(city?.seed|0)>>>0,period=18+(seed>>>3)%13,phase=((seed>>>7)%1000)/1000;
  const t=(Number(city?.year)||FIRST_YEAR)+(Number(city?.month)||0)/12;
  return Math.sin(2*Math.PI*((t-FIRST_YEAR)/period+phase))*.12;
}
// Passive building effects only count structures that actually exist.
export function cityEffects(city){
  const effects={...modifiers(city)};
  for(const [k,v] of Object.entries(policyEffects(city)))effects[k]=(effects[k]||0)+v;
  for(const [k,v] of Object.entries(timedEffects(city)))effects[k]=(effects[k]||0)+v;
  for(const b of city.buildings||[]){if(!b.special)continue;
    for(const [name,value] of Object.entries(BUILDING_EFFECTS[b.special]||{}))effects[name]=(effects[name]||0)+value;
  }
  const add=(k,v)=>{effects[k]=(effects[k]||0)+v;};
  for(const w of city.walls||[]){
    if(w.state==='wall'){add('prosperity',2);add('migration',.03);}
    else if(w.state==='canal'){add('trade',.06);add('transport',.05);add('heritage',.05);}
    else if(w.state==='boulevard'){add('transport',.10);add('prosperity',2);}
  }
  add('transport',Math.min(4,(city.bridges||[]).length)*.03);
  for(const [k,v] of Object.entries(townCenterLevel(city)?.effects||{}))add(k,v);
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
    const heritageAge=policyHook(city,'heritage');
    const possible=city.buildings.filter(b=>!b.protected&&!(heritageAge&&year-b.born>=heritageAge)&&year-b.born>=Math.max(70,year<1850?130:85)&&
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
    const fireCode=kind==='fire'?(policyHook(city,'fire')??1)*(fireproofed(city)?.5:1):1;
    const removed=city.buildings.filter(b=>Math.hypot(b.x-center.x,b.y-center.y)<radius&&r()<(b.protected?.12:.40)*fireCode);
    if(removed.length===0)return;
    const gone=new Set(removed.map(b=>b.id));
    city.buildings=city.buildings.filter(b=>!gone.has(b.id));
    city.landmarks=(city.landmarks||[]).filter(l=>!gone.has(l.id));
    for(const b of removed)rememberLoss(city,b,year,kind==='fire'?'Urban fire':'Local flooding');
    city.residents=Math.round(city.residents*(kind==='fire'?.975:.965));
    city.event=disasterEvent(city,kind,year,{x:center.x+.5,y:center.y+.5});
    city.events.push({year,type:kind,impact:removed.length,x:center.x+.5,y:center.y+.5,text:`${kind==='fire'?'A destructive urban fire':'Severe flooding'} damaged ${removed.length} buildings. Streets remain, but reconstruction will take time.`});
  }else if(kind==='epidemic'){
    const lost=Math.max(5*K,Math.round(city.residents*(.035+r()*.06)*(policyHook(city,'epidemic')??1)));
    city.residents=Math.max(40*K,city.residents-lost);
    const spot=eventSpot(city,'res',r);city.event=disasterEvent(city,kind,year,spot);
    city.events.push({year,type:kind,impact:lost,x:spot.x,y:spot.y,text:`An epidemic took approximately ${lost.toLocaleString('en-US')} lives and temporarily disrupted urban growth.`});
  }else{
    city.momentumUntil=year+25;city.momentum=.12;
    city.funds+=Math.round(Math.max(10,stats(city).gdp*.00002/K));
    city.events.push({year,type:kind,text:'A wave of investment and enterprise boosted productivity for the next 25 years.'});
  }
}
export function captureSnapshot(city){
  return {year:city.year,population:stats(city).population,
    buildings:city.buildings.map(b=>[b.id,b.x,b.y,b.w,b.h,ZONE_CODES.indexOf(b.type),b.born,b.level||1,b.protected?1:0,b.modified||0,(b.renovations||[]).map(v=>[v.year,v.action]),b.special||'',b.label||'']),
    roads:city.roads.filter(r=>Number.isFinite(r.x)&&Number.isFinite(r.y)).map(r=>key(r.x,r.y)),
    legacyRoads:city.roads.filter(r=>r.orientation).map(r=>({...r})),
    // v1.1: street classes, public works and how many main roads existed then.
    mainRoads:city.roads.filter(r=>Number.isFinite(r.x)&&r.cls==='main').map(r=>key(r.x,r.y)),
    bridgeRoads:city.roads.filter(r=>Number.isFinite(r.x)&&r.cls==='bridge').map(r=>key(r.x,r.y)),
    walls:(city.walls||[]).map(w=>({...w})),bridges:(city.bridges||[]).map(b=>({...b})),routes:(city.routes||[]).length,
    zones:city.zones.map(z=>({...z})),center:city.center?{...city.center}:null};
}
export function snapshotCity(base,snap){
  if(!snap)return base;
  const main=new Set(snap.mainRoads||[]),bridge=new Set(snap.bridgeRoads||[]);
  return {...base,year:snap.year,
    buildings:snap.buildings.map(a=>({id:a[0],x:a[1],y:a[2],w:a[3],h:a[4],type:ZONE_CODES[a[5]]||'res',born:a[6],level:a[7],protected:!!a[8],modified:a[9],style:styleAt(a[6]),renovations:(a[10]||[]).map(v=>({year:v[0],action:v[1]})),special:a[11]||undefined,label:a[12]||undefined})),
    roads:[...(snap.roads||[]).map(v=>({x:v%W,y:Math.floor(v/W),...(main.has(v)?{cls:'main'}:bridge.has(v)?{cls:'bridge'}:{})})),...(snap.legacyRoads||[])],zones:snap.zones||[],
    walls:Array.isArray(snap.walls)?snap.walls:[],bridges:Array.isArray(snap.bridges)?snap.bridges:[],routes:Number.isFinite(snap.routes)?(base.routes||[]).slice(0,snap.routes):[],
    // Surveys from before v1.5 did not record the Town Center: show it as it is now.
    center:snap.center===undefined?base.center:snap.center};
}
export function setProtection(city,id,value){
  if(city.finished)return city;
  const b=city.buildings.find(b=>b.id===id);if(!b||!!b.protected===!!value)return city;
  return {...city,buildings:city.buildings.map(item=>item.id===id?{...item,protected:!!value}:item),
    events:[...city.events,{year:city.year,type:'preservation',text:`${value?'Protected':'Released'} a ${styleAt(b.born)==='timber'?'medieval ':''}${ZONES[b.type].label.toLowerCase()} building dating to ${b.born}.`}]};
}
// ───────────────────────── monthly simulation ─────────────────────────
// Unzoned land counted toward the growth pace, so a town with little zoning
// still grows (informally) instead of stalling once its districts fill.
const INFORMAL_LAND=220;
// v1.1: early centuries build faster so a medieval town visibly grows from the start.
function eraPaceOf(year){return year>=2000?12:year>=1950?10:year>=1850?7:year>=1750?5:year>=1500?4:3;}
// How far from the founding point streets and informal building may wander.
export function cityReach(city,population){return Math.round(9+Math.sqrt(Math.max(0,population)/K)*.32+(city.walls||[]).reduce((m,w)=>Math.max(m,w.r*.6),0)+(townCenterLevel(city)?.reach||0));}
function growthOptions(city,s){return {origin:cityOrigin(city),reach:cityReach(city,s.population),pattern:patternFor(city.year),year:city.year,walls:(city.walls||[]).filter(w=>w.state==='wall'),allowInformal:true,fields:spatial(city,cityEffects(city),activePolicies(city)),informalCivic:city.year<1850,informalCraft:(city.character?.shares?.industry||0)>=.3};}
// True when laying streets would open plots for `type`: zoned land of that type
// without street access, or (for informal types) unzoned land within reach.
function streetsCouldServe(g,zg,type,o){
  const informal=type==='res'||type==='trade'||type==='farm';
  for(let k=0;k<CELLS;k++){
    if(g.access[k]||g.water[k]||g.occ[k]||g.road[k])continue;
    if(zg[k]===type)return true;
    if(informal&&zg[k]==null&&Math.hypot(kx(k)-o.origin.x,ky(k)-o.origin.y)<=o.reach)return true;
  }
  return false;
}
// Growth grids are reused from month to month while only this engine has added
// buildings and streets (it marks them as it goes). Any other change replaces
// the arrays (fires, demolition, edits), which forces a fresh build.
const gridCache=new WeakMap();
function growthGrids(city){
  const hit=gridCache.get(city.buildings);
  if(hit&&hit.roads===city.roads&&hit.b===city.buildings.length&&hit.r===city.roads.length&&hit.type===city.type)return hit;
  const entry={roads:city.roads,b:city.buildings.length,r:city.roads.length,type:city.type,g:buildGrids(city)};
  gridCache.set(city.buildings,entry);return entry;
}
// v1.5: what the city has built shifts the mix of what grows next. Markets,
// guild halls, stations and ports raise demand for shops; parishes and
// churches raise demand for homes; a standing wall raises both.
const SHOP_ANCHORS=new Set(['market','guildhall','station','transit_hub','port']),HOME_ANCHORS=new Set(['chapel','monastery','shrine']);
export function growthPull(city){
  let shops=0,homes=0;for(const b of city.buildings)if(b.special&&!b.vacant){if(SHOP_ANCHORS.has(b.special))shops++;else if(HOME_ANCHORS.has(b.special))homes++;}
  const walled=(city.walls||[]).some(w=>w.state==='wall')?1.2:1;
  return {res:(1+.1*Math.min(3,homes))*walled,trade:(1+.15*Math.min(3,shops))*walled};
}
// One month of growth: new streets, new buildings, migration and cash flow.
function monthTick(city){
  const year=city.year,month=city.month||0;
  const r=rand(hash(city.seed,year,month,24601));
  const perks=cityEffects(city);
  freezeSpatial(city,spatial(city,perks,activePolicies(city)));
  try{monthGrowth(city,year,r,perks);}finally{thawSpatial(city);}
}
function monthGrowth(city,year,r,perks){
  let s=stats(city);
  const cache=growthGrids(city),zoning=zonedGrid(city),zg=zoning.grid,g=cache.g,o={...growthOptions(city,s),zoneOrder:zoning.order,zoneYears:city.zones.map(z=>Number(z.year)||FIRST_YEAR)};
  // Pace: the v1.0 five-year build count, delivered a month at a time.
  const supply=Object.values(s.zoned).reduce((a,b)=>a+b,0)+INFORMAL_LAND;
  const landPace=clamp(Math.sqrt(supply/450),.65,2.25);
  const perFive=eraPaceOf(year)*landPace*(.70+developmentOf(city).infrastructure/90)*Math.min(2.8,Math.pow(developmentCapacity(city),.32))*(1+(perks.development||0)+Math.min(.25,perks.transport||0));
  city.growthCarry=(Number(city.growthCarry)||0)+perFive/60;
  const builds=Math.floor(city.growthCarry);city.growthCarry-=builds;
  // Streets first, so this month's buildings can use them. Unmet demand last
  // month (no reachable parcel) pushes more streets out this month.
  // Streets are laid when they are needed: when last month's buildings found
  // no reachable plot, or when the stock of open, reachable plots runs low.
  // Freshly zoned land that no street reaches yet also draws streets toward it.
  let open=0,unserved=0;
  for(let k=0;k<CELLS;k++){if(g.water[k]||g.occ[k]||g.road[k])continue;if(g.access[k]){if(zg[k]!=null||g.near[k])open++;}else if(zg[k]!=null)unserved++;}
  const need=Math.min(4,Number(city.roadNeed)||0),wanted=6+perFive*1.5;
  const roadActions=need+(r()<(open<wanted?.45:unserved>0?.22:.03)?1:0);
  if(roadActions)growRoads(city,g,zg,r,roadActions,o);
  city.roadNeed=0;
  const workforceDemand=s.population*.44,cycle=businessCycle(city),pull=growthPull(city);
  for(let i=0;i<builds;i++){
    const needsHousing=s.population/Math.max(1,s.capacity)>=.83,needsJobs=s.jobs<workforceDemand*1.1;
    const weights=[
      ['res',needsHousing?5*taxDemand(city,'res')*pull.res:0],
      ['trade',needsJobs?2.1*taxDemand(city,'trade')*(1+cycle*2)*(1+.5*(city.character?.shares?.trade||0))*pull.trade:0],
      ['craft',needsJobs?1.75*Math.max(.2,1+(perks.industrialDevelopment||0))*taxDemand(city,'craft')*(1+cycle*2)*(1+.5*(city.character?.shares?.industry||0)):0],
      ['farm',s.farms<Math.max(2,Math.floor(s.population/(900*K)))?1:0],
      // Civic buildings follow population, and parishes spring up where homes lack services.
      ['civic',s.civic<Math.max(1,Math.floor(s.population/(1800*K)))?.9:s.serviceCoverage<60?.5+(60-s.serviceCoverage)/60:0],
      ['hotel',year>=1800&&needsJobs&&s.tourismAppeal>=20?1.7*taxDemand(city,'trade'):0]
    ].filter(([,w])=>w>0);
    // Draw a type by demand; if it has no reachable plot, ask for streets (when
    // streets could help) and redraw among the remaining types.
    if(!weights.length){if(needsHousing&&r()<1/60)densify(city,year,r);break;}
    let type=null,p=null;
    // Empty buildings of a wanted type are reoccupied before anything new is built.
    {let draw=r()*weights.reduce((a,[,w])=>a+w,0),want=weights[0][0];for(const [t,w] of weights){draw-=w;if(draw<=0){want=t;break;}}
     const idx=s.vacant>0?city.buildings.findIndex(b=>b.vacant&&b.type===want):-1;
     if(idx>=0){const {vacant:_wasVacant,...b}=city.buildings[idx];city.buildings[idx]={...b,renovations:[...(b.renovations||[]),{year,action:want==='res'?'Reoccupied':'Reopened'}]};
       if(want==='res')s.capacity+=Math.round((b.capacity||0)*(1+(perks.housing||0)));else s.jobs+=b.jobs||0;continue;}}
    while(weights.length&&!p){
      let draw=r()*weights.reduce((a,[,w])=>a+w,0),pick=0;
      for(let j=0;j<weights.length;j++){draw-=weights[j][1];if(draw<=0){pick=j;break;}}
      type=weights[pick][0];p=pickParcel(g,zg,type,r,o);
      if(!p){if(streetsCouldServe(g,zg,type,o))city.roadNeed=(city.roadNeed||0)+1;weights.splice(pick,1);}
    }
    // Out of land: build upward instead, at the v1.0 pace (about once per five years).
    if(!p){if(needsHousing&&r()<1/60)densify(city,year,r);break;}
    const b=createBuilding(city,type,p,year,r,{housingPressure:Math.round(s.population/Math.max(1,s.capacity)*100),resZoned:s.zoned.res});
    city.buildings.push(b);markBuilding(g,key(p.x,p.y));
    if(type==='res')s.capacity+=Math.round(b.capacity*(1+(perks.housing||0)));else s.jobs+=b.jobs;
    if(type==='farm')s.farms++;if(type==='civic')s.civic++;if(type==='hotel')s.hotels++;
  }
  cache.b=city.buildings.length;cache.r=city.roads.length;
  s=stats(city);
  if(s.housingPressure>104&&r()<.8/60){densify(city,year,r);s=stats(city);}
  settlePopulation(city,s,perks,1/60);
  // Municipal cash flow, one month at a time, recorded by who paid it.
  const income=annualRevenue(city,s,perks),upkeep=annualUpkeep(city,s);
  const balance=(Number(city.funds)||0)+(income.total-upkeep)/12;
  // When the treasury is empty, the unpaid share of spending becomes a service
  // shortfall that eases back slowly once the books balance again.
  const target=balance<0?clamp((upkeep-income.total)/Math.max(1,upkeep),0,1):0,before=Number(city.shortfall)||0;
  city.shortfall=Math.round((before+(target-before)*(target>before?.15:.05))*1000)/1000;
  if(city.shortfall>=.08&&before<.08&&!city.events.some(e=>e.type==='crisis'&&e.year>year-10))city.events.push({year,type:'crisis',text:'The treasury is empty. Public services are being cut until the budget balances: raise taxes or cut costs.'});
  city.funds=Math.max(0,balance);
  const b=city.budget?.current?.year===year?city.budget.current:emptyBudget(year);
  city.budget={last:city.budget?.last||null,current:{year,income:{res:b.income.res+income.res/12,trade:b.income.trade+income.trade/12,craft:b.income.craft+income.craft/12,other:b.income.other+income.other/12},upkeep:b.upkeep+upkeep/12}};
}
// Births, migration and out-migration. `fraction` is the share of the v1.0
// five-year flows applied in this step (1/60 for a month).
function settlePopulation(city,s,perks,fraction){
  const year=city.year,old=Number(city.residents)||120*K;
  const naturalRate=year<1750?.02:year<1900?.028:year<2000?.045:.02;
  const capacityGap=s.capacity-old,jobGap=s.jobs/.44-old;
  // Sustained unemployment causes gradual outmigration and slows family growth.
  const joblessness=Math.max(0,s.unemployment-18)/100;
  const spontaneous=old*naturalRate*5/10*(1+(perks.births||0))*(1-joblessness*.52);
  const housingMigration=clamp(capacityGap*.065,-old*.012,Math.max(10*K,old*.045));
  const workMigration=clamp(jobGap*.018,-old*.018,Math.max(4*K,old*.02));
  const plannedGrowth=clamp(Math.sqrt(Math.max(1,s.zoned.res)/260),.7,2.6);
  // Attractive cities keep drawing newcomers a little past full occupancy:
  // a migration magnet overcrowds, an ordinary town settles just under full.
  const allowance=1+Math.min(.12,.03+(perks.migration||0)*.1+developmentOf(city).attraction/1000);
  const vacancies=clamp((s.capacity*allowance-old)/Math.max(1,old),0,1);
  const jobAccess=clamp(s.jobs/Math.max(1,old*.44),0,1);
  const standing=new Set(city.buildings.map(b=>b.id));
  const landmarkMigration=(city.landmarks||[]).filter(l=>standing.has(l.id)).length*(perks.migrationPerLandmark||0);
  const faithPull=(perks.faithMigration||0)*Math.min(3,(city.landmarks||[]).filter(l=>['shrine','monastery'].includes(l.kind)).length);
  const merchantPull=(perks.merchantMigration||0)*Math.min(2,s.commerce/20);
  // Residential taxes make the city more or less attractive to newcomers.
  const cityPull=old*(year>=1800?.035:.05)*plannedGrowth*vacancies*jobAccess*(.50+Math.min(2.2,developmentOf(city).attraction/50))*(1+(perks.migration||0)+landmarkMigration+faithPull+merchantPull)*taxDemand(city,'res')*clamp((s.prosperity-30)/35,.25,1.35)*(1-(Number(city.shortfall)||0)*.5);
  // Misery drives people away: poor prosperity or cut services.
  const misery=Math.max(0,38-s.prosperity)/100;
  const employmentExodus=old*joblessness*(year<1750?.0015:.006)+old*misery*.04;
  city.residents=clamp(old+(spontaneous+housingMigration+workMigration+cityPull-employmentExodus)*fraction,40*K,Math.max(40*K,s.capacity*1.55));
}
// Shrinking demand empties buildings a quarter of the excess at a time; a
// building empty for twelve years is torn down and its plot freed.
function settleVacancy(city,year,s){
  const r=rand(hash(city.seed,year,55511));
  const empty=(type,excess)=>{
    let freed=0;const pool=city.buildings.map((b,i)=>[b,i]).filter(([b])=>b.type===type&&!b.vacant&&!b.protected&&!b.special);
    pool.sort((a,b)=>(b[0].informal?1:0)-(a[0].informal?1:0)||a[0].born-b[0].born||r()-.5);
    let n=0;for(const [b,i] of pool){if(freed>=excess)break;city.buildings[i]={...b,vacant:year};freed+=type==='res'?b.capacity||0:b.jobs||0;n++;}
    return n;
  };
  let emptied=0;
  if(s.housingPressure<75&&city.buildings.length>30)emptied+=empty('res',(s.capacity*.8-s.population)*.25);
  const workers=s.population*.44;
  if(s.jobs>workers*1.4&&city.buildings.length>30)for(const t of ['craft','trade','hotel'])emptied+=empty(t,(s.jobs-workers*1.4)*.25/3);
  if(emptied>=5)city.events.push({year,type:'vacancy',impact:emptied,text:`${emptied} buildings stand empty as demand falls away.`});
  const abandoned=city.buildings.filter(b=>b.vacant&&!b.protected&&year-b.vacant>=12);
  if(abandoned.length){const gone=new Set(abandoned.map(b=>b.id));city.buildings=city.buildings.filter(b=>!gone.has(b.id));for(const b of abandoned)rememberLoss(city,b,year,'Abandoned');
    city.events.push({year,type:'abandonment',impact:abandoned.length,text:`${abandoned.length} long-abandoned ${abandoned.length===1?'building was':'buildings were'} torn down.`});}
}
// January: momentum settles, the budget year rolls over; every five years the
// survey is recorded and local crises, redevelopment and commissions occur.
function yearTick(city,prevYear){
  const year=city.year;
  for(const era of eras)if(era.y>prevYear&&era.y<=year)city.events.push({year:era.y,text:`The ${era.n.toLowerCase()} era begins. New districts reflect changing planning traditions.`});
  let s=stats(city);
  const enriched=accumulateDevelopment(city,1,s.unemployment);
  city.productivityStock=enriched.productivityStock;
  city.culturalCapital=enriched.culturalCapital;
  city.sacredCapital=enriched.sacredCapital;
  city.knowledgeCapital=enriched.knowledgeCapital;
  city.development=advanceDevelopment(city,1).development;
  if(city.budget?.current)city.budget={current:emptyBudget(year),last:city.budget.current};
  settleVacancy(city,year,s);
  // Districts are re-surveyed every five years (and when the first one forms).
  if(year%5===0||!(city.districts||[]).length)city.districts=updateDistricts(city,cityOrigin(city));
  city.character=characterOf(stats(city),year);
  const knock=maybeEvent(city,year,nextMilestoneOf(city)===year);if(knock)city.event=knock;
  if(year%5!==0&&year!==END_YEAR)return;
  localEvent(city,year);
  redevelopment(city,year,rand(hash(city.seed,year,12345)));
  // Grand Workshops generate commissions, never magically construct monuments.
  if(year%30===0&&resolvedCards(city).some(c=>c.id==='grand_workshops')&&(city.landmarks||[]).some(v=>v.kind==='workshop')){
    // Every thirty years while a workshop stands (v1.1: reliable, no dice roll).
    const finished=(city.landmarks||[]).filter(l=>l.kind==='monument').length;
    const awaiting=(city.projects||[]).filter(p=>p.kind==='monument').length;
    if(finished+awaiting<8){
      enqueueProject(city,'monument','masterpiece','Grand Workshops');
      city.events.push({year,type:'project',text:'Grand Workshops commissioned a new masterpiece monument. Choose its location on the map.'});
    }
  }
  const after=stats(city);
  city.history.push({year,population:after.population,buildings:after.buildings,prosperity:after.prosperity,gdp:after.gdp,gdpPerCapita:after.gdpPerCapita,housingPressure:after.housingPressure,infrastructureEfficiency:after.infrastructureEfficiency,unemployment:after.unemployment,treasury:Math.round(city.funds),densityPerZone:after.densityPerZone,heritage:after.heritage,development:{...city.development},...Object.fromEntries(Object.entries(city.development).map(([k,v])=>[`${k}Score`,v])),productivityStock:city.productivityStock,culturalCapital:city.culturalCapital,sacredCapital:city.sacredCapital,knowledgeCapital:city.knowledgeCapital,culturalPrestige:after.culturalPrestige,tourismAppeal:after.tourismAppeal,religiousInfluence:after.religiousInfluence,educationIndex:after.educationIndex,pollution:after.pollution,turningPoints:currentTurningIndex(city)});
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
// v1.5: civic works and landmarks take a 2×2 site, so a market square or a
// parish church reads larger than a block of houses. The clicked parcel is
// part of the site; when no 2×2 site around it is free, the building is
// squeezed into that one parcel instead (as in a crowded medieval core).
const SINGLE_PARCEL=new Set(['boulevard']);
const siteCells=(x0,y0,size)=>{const out=[];for(let dy=0;dy<size;dy++)for(let dx=0;dx<size;dx++)out.push([x0+dx,y0+dy]);return out;};
export function constructionSite(city,kindOrProject,x,y){
 const kind=(city.projects||[]).find(p=>p.id===kindOrProject)?.kind||BASIC_INDEX[kindOrProject]?.kind||kindOrProject;
 const xx=Math.floor(Number(x)),yy=Math.floor(Number(y));
 const single=placementIssue(city,kind,xx,yy);
 if(single||SINGLE_PARCEL.has(kind))return {x:xx,y:yy,size:1,error:single};
 const taken=occupiedMap(city),streets=roadMap(city);
 const free=([cx,cy])=>within(cx,cy)&&terrain(city.type,cx,cy)==='land'&&!taken.has(key(cx,cy))&&!streets.has(key(cx,cy));
 for(const [ox,oy] of [[0,0],[-1,0],[0,-1],[-1,-1]]){
  const cells=siteCells(xx+ox,yy+oy,2);if(!cells.every(free))continue;
  if(kind==='port'&&!cells.some(([cx,cy])=>DIRS4.some(([dx,dy])=>terrain(city.type,cx+dx,cy+dy)==='water')))continue;
  return {x:xx+ox,y:yy+oy,size:2,error:null};
 }
 return {x:xx,y:yy,size:1,error:null};
}
function constructAt(city,kind,x,y,source='basic',label=null,size=1){
 const definition=BASIC_INDEX[kind]||SPECIAL_BUILDINGS[kind];
 const name=label||definition?.name||'Civic Building';
 const [xx,yy]=[Math.floor(x),Math.floor(y)];
 const b={id:`b${city.nextBuildingId++}`,x:xx+.07,y:yy+.07,w:size-.14,h:size-.14,born:city.year,
  type:kind==='port'||kind==='market'||kind==='station'||kind==='transit_hub'?'trade':'civic',
  jobs:K*(kind==='university'||kind==='research_center'?38:kind==='port'?50:kind==='workshop'?15:kind==='market'?18:10),
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
 city.events.push({year:city.year,type:'landmark',x:xx+size/2,y:yy+size/2,text:`${name} constructed at parcel ${xx}, ${yy} — ${source==='basic'?'a civic investment': 'a Turning Point commission'}.`});
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
 if(basic?.requiresMegacity&&!city.legacyBonuses?.megacityCharter)return {city,error:'Requires the Metropolitan Charter upgrade in the Legacy Market'};
 if(basic?.requiresPopulation&&stats(city).population<basic.requiresPopulation)return {city,error:`Requires a thriving city of ${basic.requiresPopulation.toLocaleString()} residents`};
 const site=constructionSite(city,kind,x,y);
 if(site.error)return {city,error:site.error};
 const next={...city,buildings:[...city.buildings],landmarks:[...(city.landmarks||[])],roads:[...city.roads],events:[...city.events],projects:[...(city.projects||[])]};
 if(project)next.projects=next.projects.filter(p=>p.id!==project.id);
 else next.funds-=basic.cost;
 const placed=constructAt(next,kind,site.x,site.y,project?.source||'basic',project?.kind?null:basic.name,site.size);
 const projectPulse={university:{education:.48,innovation:.25},research_center:{innovation:.38,education:.20},port:{trade:.35,transport:.16},workshop:{arts:.43},monument:{arts:.27,heritage:.18},monastery:{faith:.50,education:.10},shrine:{faith:.45},boulevard:{transport:.36},school:{education:.20},chapel:{faith:.22},hospital:{services:.25,prosperity:4}}[kind];
 if(projectPulse)next.development=applyPulse(next,projectPulse,'uncommon').development;
 const last=next.history.at(-1);
 if(last?.year===next.year){const updated=stats(next);next.history=[...next.history.slice(0,-1),{...last,population:updated.population,buildings:updated.buildings,gdp:updated.gdp,gdpPerCapita:updated.gdpPerCapita,prosperity:updated.prosperity,unemployment:updated.unemployment,infrastructureEfficiency:updated.infrastructureEfficiency,treasury:updated.treasury,development:{...next.development},...Object.fromEntries(Object.entries(next.development).map(([k,v])=>[`${k}Score`,v])),culturalPrestige:updated.culturalPrestige,religiousInfluence:updated.religiousInfluence,educationIndex:updated.educationIndex,tourismAppeal:updated.tourismAppeal}];}
 const index=next.snapshots.findIndex(v=>v.year===next.year);
 if(index>=0){next.snapshots=[...next.snapshots];next.snapshots[index]=captureSnapshot(next);}
 return {city:next,placed,error:null};
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
function nextMilestoneOf(city){return turningYears()[currentTurningIndex(city)+(city.turning?.skipped||0)];}
function openTurningPoint(city){
  const index=currentTurningIndex(city)+(city.turning?.skipped||0);
  city.turning.pending={index,year:city.year,options:generateOffers(city,index,0,eligibleFigures(city))};
  city.events.push({year:city.year,type:'turning_point',text:`Turning Point ${index+1}: three futures await your choice.`});
}
function finishCity(city){
  city.finished=true;
  if(!city.events.some(e=>e.year===END_YEAR&&e.text.includes('Chronicle closes')))city.events.push({year:END_YEAR,text:'The Chronicle closes. Your city is preserved in the Urban Atlas.'});
}
// Advance month by month. Stops early at a Turning Point or the end of 2029.
function runMonths(city,months){
  const next={...city,turns:(city.turns||0)+1,buildings:[...city.buildings],roads:[...city.roads],history:[...city.history],events:[...city.events],sites:[...(city.sites||[])],snapshots:[...(city.snapshots||[])],projects:[...(city.projects||[])],nextProjectId:city.nextProjectId||1,landmarks:[...(city.landmarks||[])],walls:[...(city.walls||[])],bridges:[...(city.bridges||[])],routes:[...(city.routes||[])],month:Math.max(0,Math.min(11,Math.floor(Number(city.month)||0))),turning:{...city.turning,choices:[...(city.turning?.choices||[])],pending:null,skipped:city.turning?.skipped||0}};
  if(months<=0){const m=nextMilestoneOf(next);if(m!==undefined&&next.year>=m)openTurningPoint(next);return next;}
  for(let i=0;i<months;i++){
    const prevYear=next.year,month=next.month+1;
    if(month>=12){
      next.month=0;next.year=prevYear+1;yearTick(next,prevYear);
      if(next.year>=END_YEAR){finishCity(next);break;}
      const milestone=nextMilestoneOf(next);
      if(milestone!==undefined&&next.year>=milestone){monthTick(next);openTurningPoint(next);break;}
      if(next.event){monthTick(next);break;}
    }else next.month=month;
    monthTick(next);
  }
  return next;
}
export function advance(city,years=5){
  if(city.finished||!Number.isFinite(years)||years<=0||city.year>=END_YEAR)return city;
  if(city.turning?.pending||city.event||city.awaitingCenter)return city;
  const milestone=nextMilestoneOf(city);
  const target=Math.min(END_YEAR,city.year+Math.floor(years),milestone??END_YEAR);
  return runMonths(city,(target-city.year)*12-Math.floor(Number(city.month)||0));
}
export function advanceMonths(city,months=1){
  if(city.finished||city.turning?.pending||city.event||city.awaitingCenter||!Number.isFinite(months)||months<=0)return city;
  return runMonths(city,Math.floor(months));
}
export function seedTown(city,at=null){
  // A crossroads settlement: country roads meet at the founding point, a few
  // lanes branch off, and the first houses, shops, farms and a church follow.
  // `at` is the player's Town Center; without one the geography picks the spot.
  const sx=at?at.x-9:city.type==='plain'?39:city.type==='coast'?39:city.type==='estuary'?31:city.type==='lake'?33:26,sy=at?at.y-8:27;
  const origin={x:sx+9,y:sy+8};
  let c=addZone({...city,origin},sx,sy,19,16,'res');
  c=addZone(c,sx+5,sy+5,7,5,'trade');
  c=addZone(c,sx-9,sy-3,9,18,'farm');
  c=addZone(c,sx+10,sy+9,4,4,'civic');
  c={...c,roads:[...c.roads],buildings:[...c.buildings],routes:[]};
  const r=rand(hash(city.seed,1300));
  for(const route of layMainRoads(c,r))addRoute(c,route.path,1300,'main');
  const zg=zonedGrid(c).grid,g=buildGrids(c),o={origin,reach:14,pattern:'organic',year:1300,walls:[],allowInformal:false};
  growRoads(c,g,zg,r,10,o);
  for(const [type,count] of [['res',14],['trade',3],['farm',3],['civic',1]])for(let i=0;i<count;i++){
    let p=pickParcel(g,zg,type,r,o);
    if(!p){growRoads(c,g,zg,r,3,o);p=pickParcel(g,zg,type,r,o);}
    if(!p)continue;
    c.buildings.push(createBuilding(c,type,p,1300,r));markBuilding(g,key(p.x,p.y));
  }
  c.residents=120*K;
  const s=stats(c);
  c.history=[{year:1300,development:{...c.development},...Object.fromEntries(Object.entries(c.development).map(([k,v])=>[`${k}Score`,v])),productivityStock:c.productivityStock,population:s.population,buildings:s.buildings,prosperity:s.prosperity,gdp:s.gdp,gdpPerCapita:s.gdpPerCapita,housingPressure:s.housingPressure,infrastructureEfficiency:s.infrastructureEfficiency,unemployment:s.unemployment,treasury:s.treasury,densityPerZone:s.densityPerZone,heritage:s.heritage,culturalPrestige:s.culturalPrestige,religiousInfluence:s.religiousInfluence,tourismAppeal:s.tourismAppeal}];
  c.snapshots=[captureSnapshot(c)];
  return c;
}
// ───────────────────────── player edits (all usable while time runs) ─────────────────────────
// Every edit returns {city, undo, error}. `undo` is a small record that
// revertEdit() can apply later, even after months of further growth.
// Adopt or repeal a policy (inside its historical window).
// Answer the historical event that paused the clock.
export function resolveEvent(city,index){
  const ev=city.event,def=eventDefinition(ev?.id);if(!ev||!def)return city;
  const choice=def.choices[index];if(!choice)return city;
  const scale=eventScale(city),next={...city,event:null,events:[...city.events],effectsTimed:[...(city.effectsTimed||[])].filter(t=>t.until>city.year),seenEvents:[...(city.seenEvents||[])]};
  if(choice.residents)next.residents=Math.max(40*K,Math.round(city.residents*(1+choice.residents)));
  if(choice.funds)next.funds=choice.funds>0?city.funds+Math.round(choice.funds*scale*4):city.funds-Math.min(Math.max(0,city.funds),Math.round(-choice.funds*scale*4));
  if(choice.effects&&choice.years)next.effectsTimed.push({source:ev.id,label:`${def.title}: ${choice.label}`,until:city.year+choice.years,effects:choice.effects,...(choice.fireproof?{fireproof:true}:{})});
  if(!ev.id.startsWith('disaster:')){next.seenEvents.push(ev.id);next.lastEventYear=city.year;}
  next.events.push({year:city.year,type:'history',eventId:ev.id,x:ev.x,y:ev.y,title:def.title,choice:choice.label,text:`${def.text} The council chose: ${choice.label.toLowerCase()}.`});
  return next;
}
export function setPolicy(city,id,on){
  const issue=policyIssue(city,id);if(on&&issue)return {city,undo:null,error:issue};
  const policies={...(city.policies||{})},had=id in policies;
  if(on===had)return {city,undo:null,error:null};
  if(on)policies[id]=city.year;else delete policies[id];
  return {city:{...city,policies,events:[...city.events,{year:city.year,type:'policy',text:`${on?'Adopted':'Repealed'}: ${POLICY_INDEX[id].name}.`}]},undo:{kind:'policy',policies:city.policies||{}},error:null};
}
// Rename a district. Districts keep their stored record (and so this name)
// through every later re-survey, exactly as a generated name is kept.
export const DISTRICT_NAME_MAX=32;
export function renameDistrict(city,id,name){
  const list=city.districts||[],d=list.find(v=>v.id===id),clean=String(name??'').replace(/\s+/g,' ').trim();
  if(!d)return {city,undo:null,error:'That district no longer exists'};
  if(!clean)return {city,undo:null,error:'A district needs a name'};
  if(clean.length>DISTRICT_NAME_MAX)return {city,undo:null,error:`Names are at most ${DISTRICT_NAME_MAX} characters`};
  if(clean===d.name)return {city,undo:null,error:null};
  if(list.some(v=>v.id!==id&&v.name.toLowerCase()===clean.toLowerCase()))return {city,undo:null,error:`another district is already called ${clean}`};
  return {city:{...city,districts:list.map(v=>v.id===id?{...v,name:clean,renamed:true}:v),events:[...city.events,{year:city.year,type:'district',text:`${d.name} was renamed ${clean}.`}]},undo:{kind:'districts',districts:list},error:null};
}
export function setTax(city,sector,level){
  const taxes=taxesOf(city);
  if(city.finished||!(sector in taxes)||!TAX_LEVELS.includes(level)||taxes[sector]===level)return {city,undo:null,error:null};
  return {city:{...city,taxes:{...taxes,[sector]:level}},undo:{kind:'taxes',taxes},error:null};
}
// Remove buildings (and, by default, minor streets) inside a rectangle.
// Protected buildings and landmarks stay unless their protection is removed.
export function demolishArea(city,x,y,w,h,{streets=true}={}){
  if(city.finished)return {city,undo:null,error:'This chronicle is complete'};
  const x0=Math.floor(x),y0=Math.floor(y),x1=x0+Math.max(1,Math.floor(w)),y1=y0+Math.max(1,Math.floor(h));
  const inside=(px,py)=>px>=x0&&px<x1&&py>=y0&&py<y1;
  const hits=city.buildings.filter(b=>inside(Math.floor(b.x),Math.floor(b.y)));
  const removed=hits.filter(b=>!b.protected),kept=hits.length-removed.length;
  const roads=streets?city.roads.filter(r=>Number.isFinite(r.x)&&inside(r.x,r.y)&&roadClass(r)==='minor'):[];
  if(!removed.length&&!roads.length)return {city,undo:null,error:kept?'Protected buildings must be released before demolition':'Nothing to demolish here'};
  const gone=new Set(removed.map(b=>b.id)),roadGone=new Set(roads);
  const landmarks=(city.landmarks||[]).filter(l=>gone.has(l.id));
  const next={...city,buildings:city.buildings.filter(b=>!gone.has(b.id)),roads:city.roads.filter(r=>!roadGone.has(r)),landmarks:(city.landmarks||[]).filter(l=>!gone.has(l.id)),sites:[...(city.sites||[])],events:[...city.events]};
  for(const b of removed)rememberLoss(next,b,city.year,'Demolished');
  if(removed.length)next.events.push({year:city.year,type:'demolition',text:`${removed.length} ${removed.length===1?'building was':'buildings were'} demolished by order of the city.`});
  return {city:next,undo:{kind:'demolish',buildings:removed,landmarks,roads},error:null,removed:removed.length,kept};
}
export const PUBLIC_WORKS={
  wall:{name:'City Wall',from:1300,to:1749,description:'Encloses the dense core. Safer, more attractive, and new homes cluster inside it.'},
  canal:{name:'Canal Ring',from:1580,to:2030,water:true,description:'Replaces the innermost wall with a canal and quay street: trade, transport and heritage.'},
  boulevard:{name:'Boulevard Ring',from:1750,to:2030,description:'Replaces the innermost wall with a ring boulevard: transport and prosperity.'},
  bridge:{name:'Bridge',from:1300,to:2030,water:true,description:'Click a riverbank or the water. Streets can then grow on the far bank.'}
};
const eraCost=year=>year<1500?1:year<1750?1.5:year<1850?2.4:year<1950?4:6;
export function wallTarget(city){return fitWall(city,cityOrigin(city));}
export function publicWorkCost(city,kind,span=0){
  if(kind==='wall'){const w=wallTarget(city);return Math.round(wallLength(w)*4*eraCost(city.year));}
  const inner=innermostWall(city);
  if(kind==='canal'||kind==='boulevard')return inner?Math.round(wallLength(inner)*(kind==='canal'?6:7)*eraCost(city.year)):Infinity;
  if(kind==='bridge')return Math.round((80+Math.max(1,span)*14)*eraCost(city.year));
  return Infinity;
}
function innermostWall(city){return (city.walls||[]).filter(w=>w.state==='wall').sort((a,b)=>a.r-b.r)[0]||null;}
const hasWater=city=>['river','coast','estuary','lake'].includes(city.type);
// Why a public work cannot be built right now (null when it can).
export function publicWorkIssue(city,kind){
  const work=PUBLIC_WORKS[kind];if(!work)return 'Unknown public work';
  if(city.finished)return 'This chronicle is complete';
  if(city.turning?.pending)return 'Resolve your current Turning Point first';
  if(city.year<work.from)return `Available from ${work.from}`;
  if(city.year>work.to)return `No longer built after ${work.to}`;
  if(work.water&&!hasWater(city))return 'This geography has no water to work with';
  if(kind==='wall'&&(city.walls||[]).filter(w=>w.state==='wall').length>=2)return 'At most two standing walls';
  if(kind==='wall'&&city.buildings.filter(b=>b.type!=='farm').length<15)return 'The town is too small to wall';
  if((kind==='canal'||kind==='boulevard')&&!innermostWall(city))return 'Needs a standing city wall to replace';
  if(kind!=='bridge'&&city.funds<publicWorkCost(city,kind))return `Needs ${publicWorkCost(city,kind).toLocaleString('en-US')} treasury`;
  return null;
}
function nextWorkId(city){return `w${1+(city.walls||[]).length+(city.bridges||[]).length}-${city.year}`;}
export function buildWall(city){
  const issue=publicWorkIssue(city,'wall');if(issue)return {city,undo:null,error:issue};
  const cost=publicWorkCost(city,'wall'),ring=wallTarget(city),id=nextWorkId(city);
  const next={...city,funds:city.funds-cost,walls:[...(city.walls||[]),{id,...ring,state:'wall',built:city.year}],events:[...city.events,{year:city.year,type:'works',x:(ring.points.find(q=>!q[2])||[ring.cx])[0],y:(ring.points.find(q=>!q[2])||[0,ring.cy])[1],text:`A city wall was raised around the core (${Math.round(wallLength(ring)*40).toLocaleString("en-US")} yards of masonry).`}]};
  return {city:next,undo:{kind:'wall',id,refund:cost},error:null};
}
export function convertWall(city,kind){
  const issue=publicWorkIssue(city,kind);if(issue)return {city,undo:null,error:issue};
  const wall=innermostWall(city),cost=publicWorkCost(city,kind),g=buildGrids(city);
  const cells=ringCells(city,g,wall,homeLand(city.type,cityOrigin(city))).filter(k=>!g.road[k]);
  const next={...city,funds:city.funds-cost,roads:[...city.roads],walls:city.walls.map(w=>w.id===wall.id?{...w,state:kind,converted:city.year}:w),events:[...city.events]};
  for(const k of cells)next.roads.push({x:kx(k),y:ky(k),born:city.year,pattern:kind==='canal'?'regular':'boulevard',cls:'ring'});
  next.events.push({year:city.year,type:'works',text:kind==='canal'?'The old wall came down; a canal ring with quays now circles the historic core.':'The old wall came down; a ring boulevard now circles the historic core.'});
  return {city:next,undo:{kind:'convert',id:wall.id,roads:cells,refund:cost},error:null};
}
export function bridgeAt(city,x,y){return findBridge(city.type,buildGrids(city),Math.floor(x),Math.floor(y));}
export function buildBridge(city,x,y){
  const issue=publicWorkIssue(city,'bridge');if(issue)return {city,undo:null,error:issue};
  const g=buildGrids(city),span=findBridge(city.type,g,Math.floor(x),Math.floor(y));
  if(!span)return {city,undo:null,error:'Click a riverbank or the water where a short straight crossing fits (up to 12 cells)'};
  if(span.cells.some(k=>g.road[k]))return {city,undo:null,error:'A bridge already crosses here'};
  if(span.ends.some(e=>g.occ[key(e.x,e.y)]))return {city,undo:null,error:'A building blocks the bridgehead'};
  const cost=publicWorkCost(city,'bridge',span.cells.length);
  if(city.funds<cost)return {city,undo:null,error:`Needs ${cost.toLocaleString('en-US')} treasury`};
  const id=nextWorkId(city),next={...city,funds:city.funds-cost,roads:[...city.roads],routes:[...(city.routes||[])],bridges:[...(city.bridges||[]),{id,cells:span.cells.map(k=>[kx(k),ky(k)]),axis:span.axis,built:city.year}],events:[...city.events]};
  const added=[];
  for(const k of span.cells){next.roads.push({x:kx(k),y:ky(k),born:city.year,pattern:'bridge',cls:'bridge'});added.push(k);}
  for(const e of span.ends){const k=key(e.x,e.y);if(!g.road[k]){next.roads.push({x:e.x,y:e.y,born:city.year,pattern:'main',cls:'main'});added.push(k);}}
  // A new country road leads away from the far bridgehead to the edge of the map.
  const o=cityOrigin(city),far=span.ends.slice().sort((a,b)=>Math.hypot(b.x-o.x,b.y-o.y)-Math.hypot(a.x-o.x,a.y-o.y))[0];
  const target=span.axis==='h'?{x:far.x>o.x?W-1:0,y:far.y}:{x:far.x,y:far.y>o.y?H-1:0};
  const edge=nearestLandOnEdge(city.type,target);
  const roadsBefore=next.roads.length;
  if(edge){const path=routeBetween(city.type,city.seed+next.bridges.length*104729,far,edge);if(path&&path.length>2)addRoute(next,path,city.year,'main');}
  // Link the near bridgehead to the existing street network.
  const near=span.ends.find(e=>e!==far),link=linkToNetwork(city,g,near);
  for(const k of link){if(!g.road[k]){next.roads.push({x:kx(k),y:ky(k),born:city.year,pattern:patternFor(city.year),cls:'minor'});}}
  for(const r of next.roads.slice(roadsBefore))added.push(key(r.x,r.y));
  const mid=span.cells[span.cells.length>>1];next.events.push({year:city.year,type:'works',x:kx(mid)+.5,y:ky(mid)+.5,text:`A ${span.cells.length}-span bridge now crosses the water; a new road leads beyond it.`});
  return {city:next,undo:{kind:'bridge',id,roads:added,routes:next.routes.length-(city.routes||[]).length,refund:cost},error:null};
}
// Shortest free-land path (≤ 20 cells) from a point to the nearest street.
function linkToNetwork(city,g,p){
  const start=key(p.x,p.y),prev=new Map([[start,-1]]),queue=[start];
  for(let i=0;i<queue.length&&i<4000;i++){const k=queue[i];
    for(const [dx,dy] of DIRS4){const x=kx(k)+dx,y=ky(k)+dy;if(!within(x,y))continue;const n=key(x,y);if(prev.has(n))continue;
      if(g.road[n]&&n!==start){const path=[];for(let c=k;c!==-1&&c!==start;c=prev.get(c))path.push(c);return path.length<=20?path:[];}
      if(g.water[n]||g.occ[n])continue;prev.set(n,k);queue.push(n);}}
  return [];
}
function nearestLandOnEdge(type,p){const water=waterGrid(type);for(let off=0;off<30;off++)for(const s of [1,-1]){const q=p.x===0||p.x===W-1?{x:p.x,y:clamp(p.y+off*s,1,H-2)}:{x:clamp(p.x+off*s,1,W-2),y:p.y};if(!water[key(q.x,q.y)])return q;}return null;}
// ───────────────────────── Town Center ─────────────────────────
// A new run starts unfounded: the player places the Town Center, the town is
// seeded around it, and only then can the clock run. Once placed it never moves;
// afterwards it is upgraded in place (see TOWN_CENTER_LEVELS).
export function prepareFounding(city){return {...city,awaitingCenter:true};}
// Founding needs room for the first crossroads town: dry land, away from the
// map edge, with mostly land around it.
const FOUND_MARGIN=6;
function foundingIssue(city,x,y){
  if(x<FOUND_MARGIN||y<FOUND_MARGIN||x>=W-FOUND_MARGIN||y>=H-FOUND_MARGIN)return 'Too close to the edge of the map to found a town';
  let land=0;for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++)if(Math.hypot(dx,dy)<=5&&terrain(city.type,x+dx,y+dy)==='land')land++;
  return land<55?'Too much water here to found a town':null;
}
// Why the Town Center cannot be placed at x, y ('place') or upgraded ('upgrade') now; null when it can.
export function townCenterIssue(city,action='upgrade',x=0,y=0){
  if(!city||city.finished)return 'This chronicle is complete';
  if(action==='place'){
    if(city.center)return 'The Town Center is already placed and cannot be moved';
    const xx=Math.floor(Number(x)),yy=Math.floor(Number(y));
    if(!Number.isFinite(xx)||!Number.isFinite(yy)||!within(xx,yy))return 'Outside the map';
    if(terrain(city.type,xx,yy)!=='land')return 'The Town Center must stand on dry land';
    return city.awaitingCenter?foundingIssue(city,xx,yy):null;
  }
  if(city.awaitingCenter)return 'Found the town first by placing its Town Center';
  const now=townCenterLevel(city);if(!now)return 'Place a Town Center first';
  if(city.turning?.pending)return 'Resolve your current Turning Point first';
  const next=TOWN_CENTER_LEVELS[now.level];if(!next)return 'The Town Center is fully developed';
  if(city.year<next.from)return `${next.name} is available from ${next.from}`;
  if(stats(city).population<next.minPopulation)return `${next.name} needs ${next.minPopulation.toLocaleString('en-US')} residents`;
  if(city.funds<next.cost)return `Needs ${next.cost.toLocaleString('en-US')} treasury`;
  return null;
}
// Place the Town Center. In a new run this founds the town around it; in an
// older save it re-anchors future growth. Permanent, so there is no undo.
export function placeTownCenter(city,x,y){
  const issue=townCenterIssue(city,'place',x,y);if(issue)return {city,undo:null,error:issue};
  const xx=Math.floor(x),yy=Math.floor(y),first=TOWN_CENTER_LEVELS[0],center={x:xx,y:yy,level:1,founded:city.year};
  const event={year:city.year,type:'works',x:xx+.5,y:yy+.5,text:city.awaitingCenter?`${city.name} was founded around its ${first.name} at parcel ${xx}, ${yy}.`:`A ${first.name} now marks the town center at parcel ${xx}, ${yy}; the city will grow around it.`};
  if(!city.awaitingCenter)return {city:{...city,center,events:[...city.events,event]},undo:null,error:null};
  const {awaitingCenter:_a,...rest}=city;
  const next=seedTown({...rest,center},center);
  next.events=[...next.events,event];
  return {city:next,undo:null,error:null};
}
export function upgradeTownCenter(city){
  const issue=townCenterIssue(city,'upgrade');if(issue)return {city,undo:null,error:issue};
  const now=townCenterLevel(city),next=TOWN_CENTER_LEVELS[now.level],{x,y}=city.center;
  return {city:{...city,funds:city.funds-next.cost,center:{...city.center,level:next.level},
    events:[...city.events,{year:city.year,type:'works',x:x+.5,y:y+.5,text:`The ${now.name} was rebuilt as the ${next.name}. ${next.description}`}]},
    undo:{kind:'center',level:now.level,refund:next.cost},error:null,level:next};
}
// Undo one edit. Things the city has since built over are left in place.
export function revertEdit(city,undo){
  if(!undo||city.finished)return city;
  switch(undo.kind){
    case 'zones':return {...city,zones:undo.zones,funds:city.funds+(undo.refund||0)};
    case 'taxes':return {...city,taxes:undo.taxes};
    case 'districts':{const names=new Map(undo.districts.map(d=>[d.id,d]));return {...city,districts:(city.districts||[]).map(d=>names.has(d.id)?{...d,name:names.get(d.id).name,renamed:names.get(d.id).renamed}:d)};}
    case 'policy':return {...city,policies:undo.policies};
    case 'protect':return setProtection(city,undo.id,undo.value);
    case 'place':{
      const b=city.buildings.find(v=>v.id===undo.buildingId);if(!b)return city;
      const next={...city,buildings:city.buildings.filter(v=>v.id!==b.id),landmarks:(city.landmarks||[]).filter(l=>l.id!==b.id),funds:city.funds+(undo.refund||0),projects:[...(city.projects||[])]};
      if(undo.project)next.projects.push(undo.project);
      if(b.special==='boulevard')next.roads=city.roads.filter(r=>!(r.pattern==='boulevard'&&r.born===b.born&&r.y===Math.floor(b.y)));
      return next;
    }
    case 'demolish':{
      const g=buildGrids(city),restored=undo.buildings.filter(b=>!g.occ[key(Math.floor(b.x),Math.floor(b.y))]&&!g.road[key(Math.floor(b.x),Math.floor(b.y))]);
      const ids=new Set(restored.map(b=>b.id)),roads=undo.roads.filter(r=>!g.road[key(r.x,r.y)]&&!g.occ[key(r.x,r.y)]&&!restored.some(b=>Math.floor(b.x)===r.x&&Math.floor(b.y)===r.y));
      return {...city,buildings:[...city.buildings,...restored],landmarks:[...(city.landmarks||[]),...undo.landmarks.filter(l=>ids.has(l.id))],roads:[...city.roads,...roads],sites:(city.sites||[]).filter(s=>!(ids.has(s.id)&&s.reason==='Demolished'))};
    }
    case 'wall':return {...city,walls:(city.walls||[]).filter(w=>w.id!==undo.id),funds:city.funds+undo.refund};
    case 'center':return city.center?{...city,center:{...city.center,level:undo.level},funds:city.funds+undo.refund}:city;
    case 'convert':{const drop=new Set(undo.roads);return {...city,walls:(city.walls||[]).map(w=>{if(w.id!==undo.id)return w;const {converted:_c,...rest}=w;return {...rest,state:'wall'};}),roads:city.roads.filter(r=>!(roadClass(r)==='ring'&&drop.has(key(r.x,r.y)))),funds:city.funds+undo.refund};}
    case 'bridge':{const drop=new Set(undo.roads);return {...city,bridges:(city.bridges||[]).filter(b=>b.id!==undo.id),roads:city.roads.filter(r=>!(Number.isFinite(r.x)&&drop.has(key(r.x,r.y))&&r.born>=0&&(roadClass(r)==='bridge'||roadClass(r)==='main'))),routes:(city.routes||[]).slice(0,Math.max(0,(city.routes||[]).length-(undo.routes||0))),funds:city.funds+undo.refund};}
    default:return city;
  }
}
// Legacy 0.1/0.2 saves remain playable. Old free-form roads are kept for drawing;
// new streets are represented as tiles. Missing fields are filled, not discarded.
export function normalizeCity(input){
  if(!input||!Array.isArray(input.zones)||!Array.isArray(input.buildings))return null;
  const c={...makeCity(input.name,input.type,input.seed),...input};
  c.year=clamp(Number(c.year)||FIRST_YEAR,FIRST_YEAR,END_YEAR);c.month=Math.max(0,Math.min(11,Math.floor(Number(input.month)||0)));
  c.zones=input.zones.filter(z=>z&&(ZONES[z.type]||z.type==='clear')&&Number.isFinite(z.x)&&Number.isFinite(z.w));
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
  c.residents=Number.isFinite(Number(input.residents))?Number(input.residents):120*K;
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
  // v1.1 monthly engine and live-city fields.
  c.taxes=taxesOf(input);
  const validBudget=v=>v&&Number.isFinite(v.year)&&v.income&&Number.isFinite(v.upkeep);
  c.budget={current:validBudget(input.budget?.current)?input.budget.current:emptyBudget(c.year),last:validBudget(input.budget?.last)?input.budget.last:null};
  c.growthCarry=Number.isFinite(Number(input.growthCarry))?Number(input.growthCarry):0;
  c.roadNeed=Math.max(0,Math.floor(Number(input.roadNeed)||0));
  c.shortfall=clamp(Number(input.shortfall)||0,0,1);
  c.policies=Object.fromEntries(Object.entries(input.policies&&typeof input.policies==='object'?input.policies:{}).filter(([id,y])=>POLICY_INDEX[id]&&Number.isFinite(Number(y))));
  c.districts=Array.isArray(input.districts)?input.districts.filter(d=>d&&typeof d.name==='string'&&Array.isArray(d.anchor)):[];
  c.character=input.character&&input.character.shares?input.character:null;
  c.walls=Array.isArray(input.walls)?input.walls.filter(w=>w&&Number.isFinite(w.cx)&&Number.isFinite(w.cy)&&Number.isFinite(w.r)&&['wall','canal','boulevard'].includes(w.state)):[];
  c.bridges=Array.isArray(input.bridges)?input.bridges.filter(b=>b&&Array.isArray(b.cells)):[];
  c.routes=Array.isArray(input.routes)?input.routes.filter(r=>r&&Array.isArray(r.cells)):[];
  // v1.2 population scale: older saves counted people 12× smaller.
  if((Number(input.schema)||0)<10){
    c.residents*=K;
    c.buildings=c.buildings.map(b=>({...b,...(Number.isFinite(b.capacity)?{capacity:b.capacity*K}:{}),...(Number.isFinite(b.jobs)?{jobs:b.jobs*K}:{})}));
    c.history=c.history.map(h=>({...h,...(Number.isFinite(h.population)?{population:h.population*K}:{}),...(Number.isFinite(h.gdp)?{gdp:h.gdp*K}:{}),...(Number.isFinite(h.densityPerZone)?{densityPerZone:h.densityPerZone*K}:{})}));
    c.snapshots=c.snapshots.map(v=>Number.isFinite(v.population)?{...v,population:v.population*K}:v);
  }
  // v1.4 historical events.
  c.eventsOn=!!input.eventsOn;
  c.seenEvents=Array.isArray(input.seenEvents)?input.seenEvents.filter(v=>typeof v==='string'):[];
  c.lastEventYear=Number(input.lastEventYear)||0;
  c.effectsTimed=Array.isArray(input.effectsTimed)?input.effectsTimed.filter(t=>t&&Number.isFinite(t.until)&&t.effects):[];
  c.event=input.event&&eventDefinition(input.event.id)&&Array.isArray(input.event.options)&&!c.finished?input.event:null;
  // v1.5 Town Center.
  const tc=input.center;
  c.center=tc&&Number.isInteger(tc.x)&&Number.isInteger(tc.y)&&within(tc.x,tc.y)?{x:tc.x,y:tc.y,level:clamp(Math.floor(Number(tc.level)||1),1,TOWN_CENTER_MAX),founded:Number(tc.founded)||c.year}:null;
  c.awaitingCenter=!!input.awaitingCenter&&!c.center&&!c.finished;
  c.schema=10;
  return c;
}
