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

const PRESTIGE={monument:1,museum:1,workshop:.8,garden:.8,university:.7,shrine:.6,monastery:.5,guildhall:.4,town_hall:.4,library:.4,boulevard:.4,research_center:.4};
const SERVICE={chapel:9,school:9,clinic:9,hospital:11,town_hall:9,library:9,civic_center:11,monastery:9,shrine:8,university:8,waterworks:10,research_center:8};
const TRADE={market:7,port:9,station:9,transit_hub:10,guildhall:5};
// v1.5 growth pull: what draws new homes and shops to a neighbourhood.
// Parishes, churches, schools and the Town Center draw homes; markets, guild
// halls, stations and ports draw shops, and shops draw more shops. The inside
// of a standing wall (safe, prestigious, close to the market) draws both.
const HOME_PULL={chapel:[6,.7],monastery:[6,.6],shrine:[6,.6],school:[6,.5],clinic:[6,.45],hospital:[7,.5],garden:[6,.5],waterworks:[6,.4],town_hall:[5,.35],library:[6,.35],civic_center:[7,.4],market:[5,.3],granary:[5,.35]};
const SHOP_PULL={market:[7,1],guildhall:[6,.7],station:[8,.8],transit_hub:[9,.9],port:[8,.8],town_hall:[5,.3]};
export const WALL_PULL=.9;
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
  const stampMonth=(city.year||0)*12+(city.month||0),hit=cache.get(city.buildings);
  if(hit&&hit.len===city.buildings.length&&hit.roads===city.roads.length&&hit.month===stampMonth&&hit.policyKey===policyKey(policies)&&hit.center===centerKey(city))return hit.value;
  const value=computeSpatial(city,effects,policies);
  cache.set(city.buildings,{len:city.buildings.length,month:stampMonth,roads:city.roads.length,policyKey:policyKey(policies),center:centerKey(city),value});
  return value;
}
const policyKey=p=>Object.keys(p||{}).sort().join(',');
// Upgrading the Town Center or raising a wall changes no building, so both are part of the cache key.
const centerKey=city=>(city.center?`${city.center.x},${city.center.y},${city.center.level}`:'')+'|'+(city.walls||[]).map(w=>`${w.id}:${w.state}`).join(',');
function computeSpatial(city,effects,policies){
  const pollution=new Float32Array(CELLS),prestige=new Float32Array(CELLS),service=new Float32Array(CELLS),trade=new Float32Array(CELLS),homePull=new Float32Array(CELLS),shopPull=new Float32Array(CELLS);
  const water=waterGrid(city.type),year=city.year||1300;
  const dirty=pollutionStrength(year)*Math.max(.2,1+(effects.pollution||0));
  for(const b of city.buildings){
    if(b.vacant)continue;const x=Math.floor(b.x),y=Math.floor(b.y);if(!within(x,y))continue;
    if(b.type==='craft')stamp(pollution,x,y,4,dirty*.55);
    if(b.special){
      if(PRESTIGE[b.special])stamp(prestige,x,y,6,PRESTIGE[b.special]);
      if(SERVICE[b.special])stamp(service,x,y,SERVICE[b.special],1.4);
      if(TRADE[b.special])stamp(trade,x,y,TRADE[b.special],1.2);
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
  // Summary: shares of homes and jobs inside each field.
  const homeShield=policies.garden_city?.5:1;
  let homes=0,polluted=0,covered=0,prestigious=0,tradeJobs=0,tradeServed=0,craftJobs=0,riverCraft=0;
  for(const b of city.buildings){
    if(b.vacant)continue;const k=key(Math.floor(b.x),Math.floor(b.y));
    if(b.type==='res'){const c=b.capacity||8*POP_SCALE;homes+=c;if(pollution[k]*homeShield>=.8)polluted+=c;if(service[k]>=.35)covered+=c;if(prestige[k]>=.5)prestigious+=c;}
    else if(b.type==='trade'||b.type==='hotel'){const j=b.jobs||0;tradeJobs+=j;if(trade[k]>=.35)tradeServed+=j;}
    else if(b.type==='craft'){const j=b.jobs||0;craftJobs+=j;if(nearWater(water,Math.floor(b.x),Math.floor(b.y)))riverCraft+=j;}
  }
  return {pollution,prestige,service,trade,homePull,shopPull,homeShield,
    pollutedShare:homes?polluted/homes:0,coverage:homes?covered/homes:1,prestigeShare:homes?prestigious/homes:0,
    tradeAccess:tradeJobs?tradeServed/tradeJobs:0,riverIndustry:craftJobs?riverCraft/craftJobs:0};
}
function nearWater(water,x,y){for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const nx=x+dx,ny=y+dy;if(within(nx,ny)&&water[key(nx,ny)])return true;}return false;}
export {nearWater};
// How each field changes the city, in one place so the UI can explain it.
export function spatialEffects(sp,year){
  return {
    prosperity:-sp.pollutedShare*12+(sp.coverage-.6)*15+sp.prestigeShare*5,
    tradeProductivity:1+.2*sp.tradeAccess,
    craftProductivity:year<1850?1+.15*sp.riverIndustry:1,
    tourism:1+sp.prestigeShare*.3
  };
}
