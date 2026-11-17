// CIVITAS v1.3 — where things are matters.
// Buildings radiate influence over nearby parcels:
//   pollution  workshops and factories (strongest 1750–1950)
//   prestige   monuments, museums, workshops, universities, old protected buildings
//   service    churches, schools, clinics, town halls and civic buildings
//   trade      markets, ports, stations and main-road frontage
// The fields shape where each kind of building chooses to grow, and the share of
// homes and jobs inside them moves prosperity and productivity.
import {W,H,CELLS,within,key,waterGrid,POP_SCALE} from './geo.js';
import {townCenterLevel} from './construction.js';
import {insideWall} from './growth.js';
import {doctrineFlags} from './doctrines.js';
const RELIGIOUS_KINDS=new Set(['chapel','monastery','shrine']);

const PRESTIGE={cathedral:1.2,great_foundry:.3,grand_exchange:.8,palace_muses:1.4,great_university:1,metropolis_tower:.6,monument:1,museum:1,workshop:.8,garden:.8,university:.7,shrine:.6,monastery:.5,guildhall:.4,town_hall:.4,library:.4,boulevard:.4,research_center:.4};
const SERVICE={cathedral:14,great_university:10,metropolis_tower:9,chapel:9,school:9,clinic:9,hospital:11,town_hall:9,library:9,civic_center:11,monastery:9,shrine:8,university:8,waterworks:10,research_center:8};
const TRADE={grand_exchange:12,market:7,port:9,station:9,transit_hub:10,guildhall:5};
// v1.6: gardens and parks clear the air for the homes around them.
const GREEN={garden:6,boulevard:4,palace_muses:6};
// v1.5 growth pull: what draws new homes and shops to a neighbourhood.
// Parishes, churches, schools and the Town Center draw homes; markets, guild
// halls, stations and ports draw shops, and shops draw more shops. The inside
// of a standing wall (safe, prestigious, close to the market) draws both.
const HOME_PULL={chapel:[6,.7],monastery:[6,.6],shrine:[6,.6],school:[6,.5],clinic:[6,.45],hospital:[7,.5],garden:[6,.5],waterworks:[6,.4],town_hall:[5,.35],library:[6,.35],civic_center:[7,.4],market:[5,.3],granary:[5,.35]};
const SHOP_PULL={market:[7,1],guildhall:[6,.7],station:[8,.8],transit_hub:[9,.9],port:[8,.8],town_hall:[5,.3]};
export const WALL_PULL=.9;
// v3.4 cars: the share of commuters who drive, by year (none before 1900). Stations and
// transit hubs take some of them off the roads.
export const carShare=year=>year<1900?0:year<1950?(year-1900)/50*.35:Math.min(.75,.35+(year-1950)/50*.4);
const TRANSIT={station:.08,transit_hub:.14,metropolis_charter:.06};
// Who can pay the land: these forms are built for the well-off.
const WELL_OFF=new Set(['fine','garden','suburb']);
export const pollutionStrength=year=>year<1750?.3:year<1950?1:.6;

// Stamp a linear-falloff disc of `strength` and `radius` onto a field.
function stamp(field,x0,y0,radius,strength){
  const r=Math.ceil(radius);
  for(let y=Math.max(0,y0-r);y<=Math.min(H-1,y0+r);y++)for(let x=Math.max(0,x0-r);x<=Math.min(W-1,x0+r);x++){
    const d=Math.hypot(x-x0,y-y0);if(d>radius)continue;field[key(x,y)]+=strength*(1-d/(radius+1));
  }
}
const cache=new WeakMap();
// Fields and summary shares. Normally exact (recomputed whenever the building
// list, streets, month or policies differ). During one month of growth the
// engine freezes the month-start fields, so the many statistics computed while
// it appends buildings reuse them instead of recomputing every time.
const frozen=new WeakMap();
export function freezeSpatial(city,value){frozen.set(city.buildings,value);}
export function thawSpatial(city){frozen.delete(city.buildings);}
export function spatial(city,effects={},policies={}){
  const ice=frozen.get(city.buildings);if(ice)return ice;
  // v4.1 (M6): fields are recomputed once a quarter (monthly cost most of a frame at MAX).
  const stampMonth=(city.year||0)*4+Math.floor((city.month||0)/3),hit=cache.get(city.buildings);
  if(hit&&hit.len===city.buildings.length&&hit.roads===city.roads.length&&hit.month===stampMonth&&hit.policyKey===policyKey(policies)&&hit.center===centerKey(city))return hit.value;
  const value=computeSpatial(city,effects,policies);
  cache.set(city.buildings,{len:city.buildings.length,month:stampMonth,roads:city.roads.length,policyKey:policyKey(policies),center:centerKey(city),value});
  return value;
}
const policyKey=p=>Object.keys(p||{}).sort().join(',');
// Upgrading the Town Center or raising a wall changes no building, so both are part of the cache key.
const centerKey=city=>(city.center?`${city.center.x},${city.center.y},${city.center.level}`:'')+'|'+(city.walls||[]).map(w=>`${w.id}:${w.state}`).join(',');
function computeSpatial(city,effects,policies){
  const jobsF=new Float32Array(CELLS),homesF=new Float32Array(CELLS),officeF=new Float32Array(CELLS),green=new Float32Array(CELLS),pollution=new Float32Array(CELLS),prestige=new Float32Array(CELLS),service=new Float32Array(CELLS),trade=new Float32Array(CELLS),homePull=new Float32Array(CELLS),shopPull=new Float32Array(CELLS);
  const water=waterGrid(city.type),year=city.year||1300;
  const dirty=pollutionStrength(year)*Math.max(.2,1+(effects.pollution||0));
  const df=doctrineFlags(city),faithReach=1+(df.faithReach||0),prestigeReach=df.prestigeReach||1;
  for(const b of city.buildings){
    if(b.vacant)continue;const x=Math.floor(b.x),y=Math.floor(b.y);if(!within(x,y))continue;
    if(b.type==='craft')stamp(pollution,x,y,4,dirty*.55);
    // Where the jobs and the homes are (for walking, driving and land value).
    {const k=key(x,y);if(b.type==='res')homesF[k]+=(b.capacity||8*POP_SCALE)/POP_SCALE;else if(b.jobs){jobsF[k]+=b.jobs/POP_SCALE;if(b.form==='offices'||b.form==='commerce')officeF[k]+=b.jobs/POP_SCALE*.06;}}
    if(b.special){
      if(PRESTIGE[b.special]){stamp(prestige,x,y,6*prestigeReach,PRESTIGE[b.special]);if(df.artsGreen)stamp(green,x,y,5,1);}
      if(SERVICE[b.special])stamp(service,x,y,SERVICE[b.special]*(RELIGIOUS_KINDS.has(b.special)?faithReach:1),1.4);
      if(TRADE[b.special])stamp(trade,x,y,TRADE[b.special],1.2);
      if(GREEN[b.special])stamp(green,x,y,GREEN[b.special],1);
      if(HOME_PULL[b.special])stamp(homePull,x,y,...HOME_PULL[b.special]);
      if(SHOP_PULL[b.special])stamp(shopPull,x,y,...SHOP_PULL[b.special]);
    }else if(b.type==='civic'){stamp(service,x,y,6,1.1);stamp(homePull,x,y,5,.35);}
    else if(b.type==='trade')stamp(shopPull,x,y,3,.14);
    if(b.protected&&year-(b.born||year)>=120)stamp(prestige,x,y,2,.15);
  }
  // The Town Center serves and lends prestige to the parcels around it, more at each level.
  const tc=townCenterLevel(city);
  if(tc&&within(city.center.x,city.center.y)){
    if(tc.serviceRadius)stamp(service,city.center.x,city.center.y,tc.serviceRadius,1.2);
    if(tc.prestige)stamp(prestige,city.center.x,city.center.y,tc.prestigeRadius,tc.prestige);
    stamp(homePull,city.center.x,city.center.y,4+tc.level,.15+.1*tc.level);
    stamp(shopPull,city.center.x,city.center.y,3+tc.level,.2+.1*tc.level);
  }
  for(const w of city.walls||[])if(w.state==='wall'){
    const r=Math.ceil(w.r+2),cx=Math.floor(w.cx),cy=Math.floor(w.cy);
    for(let y=Math.max(0,cy-r);y<=Math.min(H-1,cy+r);y++)for(let x=Math.max(0,cx-r);x<=Math.min(W-1,cx+r);x++)
      if(insideWall(w,x+.5,y+.5)){const k=key(x,y);homePull[k]+=WALL_PULL;shopPull[k]+=WALL_PULL;}
  }
  for(const r of city.roads||[])if(r.cls==='main'&&Number.isFinite(r.x))trade[key(r.x,r.y)]+=.6;
  // Sums over a neighbourhood (box sums: cheap on the 100 × 72 grid).
  {const J=boxSum(jobsF,6),Hm=boxSum(homesF,6),O=boxSum(officeF,5);jobsF.set(J);homesF.set(Hm);officeF.set(O);}
  // v3.4 land value: prestige, trade frontage and offices nearby, the well-off quarters themselves.
  const value=new Float32Array(CELLS);for(let k=0;k<CELLS;k++)value[k]=prestige[k]*1.1+trade[k]*.35+Math.min(2.5,officeF[k])+homePull[k]*.25;
  for(const b of city.buildings)if(WELL_OFF.has(b.form)){const x=Math.floor(b.x),y=Math.floor(b.y);if(within(x,y))value[key(x,y)]+=.6;}
  // v3.4 traffic: workers who cannot walk to a job drive (from 1900), and the streets carry them.
  // Narrow old streets carry little; main roads, rings and boulevards carry much.
  const cars=carShare(year)*(policies.public_transit?.hooks?.cars??1);
  // Stations and transit hubs: homes within reach take the train or tram instead.
  const transitF=new Float32Array(CELLS);for(const b of city.buildings)if(TRANSIT[b.special]&&!b.vacant)stamp(transitF,Math.floor(b.x),Math.floor(b.y),b.special==='transit_hub'?12:9,1.4);
  // The old town (its walls, or the first streets): closed to cars, or cut through by avenues.
  const ot=city.oldtown||((city.walls||[])[0]?{cx:city.walls[0].cx,cy:city.walls[0].cy,r:city.walls[0].r}:city.center?{cx:city.center.x+.5,cy:city.center.y+.5,r:9}:null);
  const inCore=(x,y)=>ot&&Math.hypot(x+.5-ot.cx,y+.5-ot.cy)<=ot.r,mode=city.oldtown?.mode;
  const traffic=new Float32Array(CELLS);let trips=0;
  if(cars>0)for(const b of city.buildings){if(b.type!=='res'||b.vacant)continue;const x=Math.floor(b.x),y=Math.floor(b.y);if(!within(x,y))continue;const k=key(x,y),workers=(b.capacity||8*POP_SCALE)/POP_SCALE*.44;
    const walk=Math.min(1,jobsF[k]/Math.max(1,homesF[k]*.44));const t=workers*(1-walk*.85)*cars*(1-.65*Math.min(1,transitF[k]))*(mode==='pedestrian'&&inCore(x,y)?.15:1);trips+=t;traffic[k]+=t*.2;}
  if(cars>0)traffic.set(boxSum(traffic,3));
  // Trips also crowd the streets where the jobs are.
  if(trips>0){let J=0;for(let k=0;k<CELLS;k++)J+=jobsF[k];if(J>0)for(let k=0;k<CELLS;k++)traffic[k]+=jobsF[k]/J*trips*6;}
  const cap=new Float32Array(CELLS);let capacity=0;
  for(const r of city.roads||[]){if(!Number.isFinite(r.x))continue;const old=(r.born||1300)<1700,c=r.cls==='ringroad'?6:r.cls==='main'||r.cls==='ring'||r.pattern==='boulevard'?4:r.cls==='bridge'?3:old&&(mode==='avenues'||mode==='rebuild')&&inCore(r.x,r.y)?3:old?.5:1.2;cap[key(r.x,r.y)]+=c;capacity+=c;}
  const capF=boxSum(cap,3);
  for(let k=0;k<CELLS;k++)traffic[k]=traffic[k]/Math.max(1.5,capF[k]*1.6);
  // Car-free streets stay calm; how jammed the old town is (it raises the old-town question).
  let coreSum=0,coreN=0;for(let k=0;k<CELLS;k++){const x=k%W,y=Math.floor(k/W);if(!inCore(x,y))continue;if(mode==='pedestrian')traffic[k]*=.25;if(cap[k]){coreSum+=traffic[k];coreN++;}}
  const coreJam=coreN?coreSum/coreN:0;
  const congestion=capacity?Math.min(2,trips/(capacity*1.1)):0;
  // v3.6 living, 0–100 per parcel: green and services nearby, prestige; minus smoke, jammed streets
  // and crowding. With land value (0–100) it is what the lenses show and what the city counts.
  const living=new Float32Array(CELLS),valueN=new Float32Array(CELLS);
  for(let k=0;k<CELLS;k++){const ppc=homesF[k]*POP_SCALE/169,crowd=Math.min(20,Math.max(0,ppc-60)/12);
    living[k]=Math.max(0,Math.min(100,52+11*Math.min(2,green[k])+9*Math.min(1.5,service[k])+5*Math.min(1,prestige[k])-16*Math.min(2,pollution[k])-12*Math.max(0,traffic[k]-.5)-crowd));
    valueN[k]=Math.max(0,Math.min(100,value[k]/2.6*100));}
  // Summary: shares of homes and jobs inside each field.
  const homeShield=policies.garden_city?.5:1;
  let livSum=0,valSum=0,unaffordable=0,jammed=0,homes=0,polluted=0,covered=0,prestigious=0,tradeJobs=0,tradeServed=0,craftJobs=0,riverCraft=0;
  for(const b of city.buildings){
    if(b.vacant)continue;const k=key(Math.floor(b.x),Math.floor(b.y));
    if(b.type==='res'){const c=b.capacity||8*POP_SCALE;homes+=c;if(pollution[k]*homeShield*(green[k]>=.3?.4:1)>=.8)polluted+=c;if(service[k]>=.35)covered+=c;if(prestige[k]>=.5)prestigious+=c;if(value[k]>=2.2&&!WELL_OFF.has(b.form))unaffordable+=c;livSum+=living[k]*c;valSum+=valueN[k]*c;if(traffic[k]>=1)jammed+=c;}
    else if(b.type==='trade'||b.type==='hotel'){const j=b.jobs||0;tradeJobs+=j;if(trade[k]>=.35)tradeServed+=j;}
    else if(b.type==='craft'){const j=b.jobs||0;craftJobs+=j;if(nearWater(water,Math.floor(b.x),Math.floor(b.y)))riverCraft+=j;}
  }
  return {green,pollution,prestige,service,trade,homePull,shopPull,homeShield,value:valueN,valueRaw:value,living,livingAvg:homes?livSum/homes:50,valueAvg:homes?valSum/homes:0,traffic,carShare:cars,congestion,coreJam,unaffordable:homes?unaffordable/homes*(policies.rent_control?.hooks?.rent??1):0,jammedShare:homes?jammed/homes:0,
    pollutedShare:homes?polluted/homes:0,coverage:homes?covered/homes:1,prestigeShare:homes?prestigious/homes:0,
    tradeAccess:tradeJobs?tradeServed/tradeJobs:0,riverIndustry:craftJobs?riverCraft/craftJobs:0};
}
function boxSum(a,r){const I=new Float64Array((W+1)*(H+1));for(let y=0;y<H;y++)for(let x=0;x<W;x++)I[(y+1)*(W+1)+x+1]=a[y*W+x]+I[y*(W+1)+x+1]+I[(y+1)*(W+1)+x]-I[y*(W+1)+x];
  const o=new Float32Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const x0=Math.max(0,x-r),y0=Math.max(0,y-r),x1=Math.min(W,x+r+1),y1=Math.min(H,y+r+1);o[y*W+x]=I[y1*(W+1)+x1]-I[y0*(W+1)+x1]-I[y1*(W+1)+x0]+I[y0*(W+1)+x0];}return o;}
function nearWater(water,x,y){for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const nx=x+dx,ny=y+dy;if(within(nx,ny)&&water[key(nx,ny)])return true;}return false;}
export {nearWater};
// How each field changes the city, in one place so the UI can explain it.
export function spatialEffects(sp,year){
  return {
    // v3.4: rents beyond ordinary families and jammed streets both cost prosperity.
    prosperity:-sp.pollutedShare*12+(sp.coverage-.6)*15+sp.prestigeShare*5-(sp.unaffordable||0)*10-Math.max(0,(sp.congestion||0)-.5)*10-(sp.jammedShare||0)*6,
    tradeProductivity:1+.2*sp.tradeAccess,
    craftProductivity:year<1850?1+.15*sp.riverIndustry:1,
    tourism:1+sp.prestigeShare*.3
  };
}
