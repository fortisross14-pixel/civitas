import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLegacy,legacyCityProgress,startRunProfile} from '../src/legacy.js';
import {makeCity,seedTown,stats,terrain,placeConstruction} from '../src/sim.js';
import {basicsForYear} from '../src/construction.js';

const completed=n=>({ ...emptyLegacy(), completed:Array.from({length:n},(_,i)=>`finished-${i}`) });

test('legacy city-count foundation is strictly stronger but has diminishing marginal returns',()=>{
 const p1=legacyCityProgress(1),p12=legacyCityProgress(12),p25=legacyCityProgress(25),p35=legacyCityProgress(35),p60=legacyCityProgress(60);
 assert.ok(p12.capacity>p1.capacity&&p25.capacity>p12.capacity&&p35.capacity>p25.capacity&&p60.capacity>p35.capacity);
 assert.ok(p12.productivity>p1.productivity&&p35.productivity>p25.productivity);
 assert.ok(legacyCityProgress(3).capacity-legacyCityProgress(2).capacity>legacyCityProgress(36).capacity-legacyCityProgress(35).capacity);
 assert.equal(p12.featuredSlots,6);assert.equal(p35.featuredSlots,7);assert.equal(p60.megacity,true);
});

test('later city profiles receive bounded real capacity and productivity advantages',()=>{
 const early=startRunProfile(completed(1),[]),late=startRunProfile(completed(60),[]);
 let a=seedTown(makeCity('Early','plain',91)),b=seedTown(makeCity('Late','plain',91));
 a.legacyBonuses=early.legacyBonuses;b.legacyBonuses=late.legacyBonuses;
 const sa=stats(a),sb=stats(b);
 assert.ok(sb.capacity>sa.capacity*1.35);assert.ok(sb.gdp>sa.gdp*1.20);
 assert.ok(late.legacyBonuses.legacyCapacity<.7&&late.legacyBonuses.legacyProductivity<.5,'the curve remains bounded');
});

test('new water starts are land-safe and the metropolis charter needs both Legacy and local success',()=>{
 for(const geography of ['estuary','lake']){const city=seedTown(makeCity('Start',geography,77));assert.ok(city.buildings.every(b=>terrain(geography,Math.floor(b.x),Math.floor(b.y))==='land'));}
 const charter=basicsForYear(2010).find(b=>b.id==='metropolis_charter');assert.ok(charter);
 let city=seedTown(makeCity('Charter','plain',88));city.year=2010;city.funds=9999;
 let site=null;for(let y=2;y<70&&!site;y++)for(let x=2;x<98;x++)if(terrain(city.type,x,y)==='land'){site={x,y};break;}
 assert.match(placeConstruction(city,charter.id,site.x,site.y).error,/50-city/);
 city.legacyBonuses={megacityCharter:1};assert.match(placeConstruction(city,charter.id,site.x,site.y).error,/12,000/);
});
