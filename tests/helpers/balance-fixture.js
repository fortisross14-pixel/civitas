import {makeCity,seedTown,addZone,zoneLand,advance,selectTurningPoint,placeConstruction,stats,W,H} from '../../src/sim.js';
import {emptyLegacy,startRunProfile,scoreCity} from '../../src/legacy.js';
// Zoning plans as rectangles. Since v1.2 surveying land costs treasury, so the
// fixture plays like a player: at the start and at every Turning Point it zones
// as many 6×6 blocks of its plan as it can afford, nearest the town first.
const plans={compact:[[11,14,29,35,'res'],[11,49,22,14,'trade'],[40,17,17,34,'craft']],balanced:[[4,4,52,55,'res'],[5,60,50,10,'trade'],[59,5,25,40,'craft'],[62,46,22,19,'farm']],sprawl:[[3,3,90,62,'res'],[3,64,75,7,'trade'],[10,4,15,10,'craft'],[65,10,25,14,'farm']],industrial:[[15,15,26,32,'res'],[8,52,45,14,'craft'],[54,8,29,42,'craft'],[13,5,22,8,'trade']]};
function blocks(plan){const out=[];for(const [x,y,w,h,type] of plan)for(let by=y;by<y+h;by+=6)for(let bx=x;bx<x+w;bx+=6)out.push({x:bx,y:by,w:Math.min(6,x+w-bx),h:Math.min(6,y+h-by),type});
  return out.sort((a,b)=>Math.hypot(a.x-45,a.y-35)-Math.hypot(b.x-45,b.y-35));}
function zoneAffordable(city,queue){while(queue.length){const b=queue[0];const r=zoneLand(city,b.x,b.y,b.w,b.h,b.type);if(r.error&&/costs/.test(r.error))break;if(!r.error)city=r.city;queue.shift();}return city;}
const focused={culture:['patron_arts','hire_artists','grand_workshops','cultural_renaissance','city_monuments','world_heritage'],industry:['industrial_expansion','master_craftsmen','factory_town','industrial_revolution','abundant_resources','trading_empire'],population:['fertile_families','urban_expansion','dense_living','housing_revolution','land_opportunity']};
const upgraded=emptyLegacy();upgraded.upgrades={admin:3,urban:3,merchant:3,patron:3,migration:3,civic:3,luck:3,rerolls:2};
function placePending(city){for(const p of [...city.projects]){outer:for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){const a=placeConstruction(city,p.id,x,y);if(!a.error){city=a.city;break outer;}}}return city;}
export function campaign(seed,plan='balanced',focus='default',boost=false,type='plain'){
 let city=seedTown(makeCity('Balance '+seed,type,seed));const queue=blocks(plans[plan]);
 if(boost){const r=startRunProfile(upgraded,[]);city.turning={...city.turning,cardPool:r.cardPool,figurePool:r.figurePool,featuredFigures:r.featuredFigures};city.legacyBonuses=r.legacyBonuses;}
 city=zoneAffordable(city,queue);
 let n=0;while(city.year<2030 && n++<45){city=advance(city,800);if(city.turning?.pending){let selection=city.turning.pending.options[0];const next=focused[focus]?.[city.turning.choices.length];if(next){selection=next;city.turning={...city.turning,pending:{...city.turning.pending,options:[next]}};}city=selectTurningPoint(city,selection);city=placePending(city);city=zoneAffordable(city,queue);}}
 const s=stats(city);return {population:s.population,gdpPC:s.gdpPerCapita,gdp:s.gdp,culture:s.culturalPrestige,religion:s.religiousInfluence,quality:s.prosperity,unemp:s.unemployment,pressure:s.housingPressure,efficiency:s.infrastructureEfficiency,treasury:s.treasury,buildings:s.buildings,choices:city.turning.choices.length,year:city.year,legacyReward:scoreCity(city,s).points,city};
}
