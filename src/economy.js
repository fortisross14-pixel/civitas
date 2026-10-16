// CIVITAS v1.1 — municipal taxes by sector.
// Each sector (residents, commerce, industry) is taxed at one of four levels.
// Lower taxes cost revenue but raise that sector's demand; higher taxes raise
// revenue and suppress demand. Residential taxes also move prosperity and
// migration. All amounts are game currency per YEAR.
import {POP_SCALE} from './geo.js';
import {policyCosts} from './policies.js';
export const TAX_LEVELS=['none','low','average','high'];
export const TAX_LABELS={none:'None',low:'Low',average:'Average',high:'High'};
export const TAX_SECTORS=[
  {id:'res',label:'Residents',hint:'Households and their homes'},
  {id:'trade',label:'Commerce',hint:'Shops, markets, hotels'},
  {id:'craft',label:'Industry',hint:'Workshops, factories, farms'}
];
export const TAX_RATE={none:0,low:.6,average:1,high:1.45};
export const TAX_DEMAND={none:1.35,low:1.15,average:1,high:.72};
const RES_PROSPERITY={none:4,low:2,average:0,high:-5};
const BUSINESS_PROSPERITY={none:0,low:0,average:0,high:-1};
export const DEFAULT_TAXES={res:'average',trade:'average',craft:'average'};

export function taxesOf(city){
  const t=city?.taxes||{};
  return Object.fromEntries(TAX_SECTORS.map(({id})=>[id,TAX_LEVELS.includes(t[id])?t[id]:'average']));
}
// Growth-demand multiplier for one sector at its current tax level.
export function taxDemand(city,sector){return TAX_DEMAND[taxesOf(city)[sector]]??1;}
export function taxProsperity(city){const t=taxesOf(city);return RES_PROSPERITY[t.res]+BUSINESS_PROSPERITY[t.trade]+BUSINESS_PROSPERITY[t.craft];}

// Annual revenue split by who pays it. `s` is a stats() result.
// Civic and base employment ("other") is always taxed at the average rate.
export function annualRevenue(city,s,perks={}){
  const t=taxesOf(city),jobs=s.sectorJobs||{},total=Math.max(1,Object.values(jobs).reduce((a,v)=>a+v,0));
  const tradeShare=((jobs.trade||0)+(jobs.hotel||0))/total,craftShare=((jobs.craft||0)+(jobs.farm||0))/total,otherShare=Math.max(0,1-tradeShare-craftShare);
  const boost=1+(perks.treasury||0);
  // v1.2: per-resident taxes are ~47% higher than v1.0 because the city now pays
  // for public services and institutions. Half the per-resident part is paid by
  // employers in proportion to their jobs, so business taxes matter from 1300.
  const household=s.population*.055/5/POP_SCALE,business=(s.population*.055+s.gdp*.0000012)/5/POP_SCALE;
  const res=household*TAX_RATE[t.res]*boost,trade=business*tradeShare*TAX_RATE[t.trade]*boost,craft=business*craftShare*TAX_RATE[t.craft]*boost,other=(business*otherShare+1.2)*boost;
  return {res,trade,craft,other,total:res+trade+craft+other};
}
// Prices rise through the eras (labour, materials, expectations).
export const eraCost=year=>year<1500?1:year<1750?1.5:year<1850?2.4:year<1950?4:6;
// Share of the average per-resident tax that public services consume each era:
// watch, wells and alms in 1300; schools, sanitation and transit by 2000.
const SERVICE_SHARE=year=>year<1500?.3:year<1750?.34:year<1850?.4:year<1950?.46:year<2000?.52:.56;
// Upkeep of ordinary civic works (a share of their price) and of landmarks.
const BASIC_COST={market:130,chapel:160,granary:145,town_hall:290,school:240,guildhall:310,garden:400,clinic:420,waterworks:460,station:820,hospital:950,powerworks:910,library:1050,civic_center:1200,museum:1180,research_center:1750,transit_hub:1900,metropolis_charter:2800};
// Annual spending by item. Parcels, streets and idle zoned land as in v1.0;
// v1.2 adds public services, institutions and walls.
export function annualExpenses(city,s){
  const parcels=city.buildings.length,streets=city.roads.length;
  const zoned=Object.values(s.zoned||{}).reduce((a,v)=>a+v,0),idle=Math.max(0,zoned-parcels-streets);
  const maintenance=(parcels*.12+streets*.035+idle*(city.year>=1800?.006:.0015))/5;
  const walls=(city.walls||[]).reduce((a,w)=>a+w.r*(w.state==='wall'?.08:.05),0); // r = mean radius
  const policy=policyCosts(city);
  const services=s.population/POP_SCALE*.015*SERVICE_SHARE(city.year)*(1+policy.service);
  let institutions=0;
  for(const b of city.buildings)if(b.special&&!b.vacant)institutions+=BASIC_COST[b.special]?BASIC_COST[b.special]*.012:.8*eraCost(city.year);
  const policies=policy.cost*eraCost(city.year);
  return {maintenance,walls,services,institutions,policies,total:maintenance+walls+services+institutions+policies};
}
export function annualUpkeep(city,s){return annualExpenses(city,s).total;}
// Surveying, draining and staking out newly designated land, per parcel.
export const zoningPrice=year=>Math.round(.35*eraCost(year)*100)/100;
export function emptyBudget(year){return {year,income:{res:0,trade:0,craft:0,other:0},upkeep:0};}
