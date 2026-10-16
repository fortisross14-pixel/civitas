import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLegacy,legacyInvestmentProgress,startRunProfile} from '../src/legacy.js';
import {makeCity,seedTown,stats,terrain,placeConstruction} from '../src/sim.js';
import {basicsForYear} from '../src/construction.js';

const invested=(ranks={})=>({ ...emptyLegacy(), upgrades:ranks });

test('completed-city count earns currency but does not create automatic power',()=>{
 const empty=legacyInvestmentProgress(invested()),manyCompleted=legacyInvestmentProgress({...invested(),completed:Array.from({length:70},(_,i)=>`city-${i}`)});
 assert.deepEqual(manyCompleted,empty);
 const strong=legacyInvestmentProgress(invested({infrastructure:6,innovation:6,reputation:2,metropolis:1}));
 assert.equal(strong.capacity,.48);assert.equal(strong.productivity,.42);assert.equal(strong.featuredSlots,7);assert.equal(strong.megacity,true);
});

test('currency investments make later city profiles substantially stronger',()=>{
 const early=startRunProfile(invested(),[]),late=startRunProfile(invested({infrastructure:6,innovation:6}),[]);
 let a=seedTown(makeCity('Early','plain',91)),b=seedTown(makeCity('Late','plain',91));
 a.legacyBonuses=early.legacyBonuses;b.legacyBonuses=late.legacyBonuses;
 const sa=stats(a),sb=stats(b);
 assert.ok(sb.capacity>sa.capacity*1.40);assert.ok(sb.gdp>sa.gdp*1.25);
 assert.ok(late.legacyBonuses.legacyCapacity<.49&&late.legacyBonuses.legacyProductivity<.43,'investment remains bounded');
});

test('new water starts are land-safe and the metropolis charter needs both Legacy and local success',()=>{
 for(const geography of ['estuary','lake']){const city=seedTown(makeCity('Start',geography,77));assert.ok(city.buildings.every(b=>terrain(geography,Math.floor(b.x),Math.floor(b.y))==='land'));}
 const charter=basicsForYear(2010).find(b=>b.id==='metropolis_charter');assert.ok(charter);
 let city=seedTown(makeCity('Charter','plain',88));city.year=2010;city.funds=9999;
 let site=null;for(let y=2;y<70&&!site;y++)for(let x=2;x<98;x++)if(terrain(city.type,x,y)==='land'){site={x,y};break;}
 assert.match(placeConstruction(city,charter.id,site.x,site.y).error,/Metropolitan Charter/);
 city.legacyBonuses={megacityCharter:1};assert.match(placeConstruction(city,charter.id,site.x,site.y).error,/144,000/);
});
