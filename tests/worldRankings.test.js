// v2.6 World Cities and trinkets.
import test from 'node:test';
import assert from 'node:assert/strict';
import {RANK_CATEGORIES,historicTable,worldTable,worldEntry,addWorldEntry,placingsOf,cityAgeRecords,formatRankValue,WORLD_ENTRIES_KEPT} from '../src/worldRankings.js';
import {AGES} from '../src/ages.js';
import {TRINKETS,TRINKET_INDEX,trinketEffects} from '../src/trinkets.js';
import {normalizeLegacy,emptyLegacy} from '../src/legacy.js';
import {recordRun,foundRun} from '../src/runs.js';
import {makeCity,seedTown,stats,advance} from '../src/sim.js';

const fakeCity=(id,pop)=>({id,name:'Town '+id,history:AGES.map(a=>({year:a.to,population:pop,industryJobs:pop/3,gdp:pop*100,religiousInfluence:50,culturalPrestige:50,educationIndex:50}))});

test('every Age and category has at least 20 historical cities, best first',()=>{
  for(const a of AGES)for(const c of RANK_CATEGORIES){
    const t=historicTable(a.id,c.id);assert.ok(t.length>=20,`${a.id}/${c.id}`);
    for(let i=1;i<t.length;i++)assert.ok(t[i-1].value>=t[i].value);
    assert.ok(t[19].value>0);
  }
});
test('the Top 20 slots your city in and flags it; a small town only shows as your best',()=>{
  const big=worldEntry(fakeCity('a',3e6),1),small=worldEntry(fakeCity('b',2000),2);
  const t=worldTable('modern','population',[big,small]);
  assert.equal(t.rows.length,20);
  const mine=t.rows.filter(r=>r.mine);assert.equal(mine.length,1);assert.equal(mine[0].entry.id,'a');
  assert.ok(mine[0].rank<=5);
  assert.ok(t.best===null);
  const t2=worldTable('modern','population',[small]);assert.ok(t2.rows.every(r=>!r.mine));assert.equal(t2.best.entry.id,'b');assert.ok(t2.best.rank>20);
  assert.ok(placingsOf(big).length>0);assert.equal(placingsOf(small).length,0);
});
test('a city records each Age it lived through, at the last year inside it',()=>{
  const r=cityAgeRecords({history:[{year:1450,population:5000},{year:1499,population:7000},{year:1510,population:8000}]});
  assert.equal(r.medieval.population,7000);assert.equal(r.medieval.year,1499);assert.equal(r.renaissance.year,1510);assert.ok(!r.modern);
});
test('the entry list is capped and keeps the record holders',()=>{
  let list=[];for(let i=0;i<WORLD_ENTRIES_KEPT+30;i++)list=addWorldEntry(list,worldEntry(fakeCity('c'+i,i===3?9e6:1000+i),i));
  assert.ok(list.length<=WORLD_ENTRIES_KEPT);assert.ok(list.some(e=>e.id==='c3'));
});
test('value formatting is short',()=>{
  assert.equal(formatRankValue('population',2320000),'2.3M');assert.equal(formatRankValue('population',45000),'45k');assert.equal(formatRankValue('wealth',4.2e12),'4.2T');
});
test('legacy keeps world entries, owned trinkets and only owned ones equipped',()=>{
  const l=normalizeLegacy({...emptyLegacy(),trinkets:['steam_governor','nope'],equipped:['steam_governor','pilgrim_shell'],worldEntries:[{id:'x',ages:{}}],scenarios:{ford_market:{stars:5,best:1}}});
  assert.deepEqual(l.trinkets,['steam_governor']);assert.deepEqual(l.equipped,['steam_governor']);assert.equal(l.worldEntries.length,1);assert.equal(l.scenarios.ford_market.stars,3);
});
test('trinkets: two of one theme stack, and founding carries only owned ones',()=>{
  assert.ok(TRINKETS.length>=8);for(const t of TRINKETS){assert.ok(t.short&&t.name&&t.scenario);}
  assert.equal(TRINKETS.filter(t=>t.theme==='industry').length,2);
  const e=trinketEffects({trinkets:['steam_governor','phoenix_furnace']});assert.ok(e.craftDemand>3.5);assert.ok(e.industry>1.5);
  const legacy={...emptyLegacy(),trinkets:['steam_governor']};
  const out=foundRun(seedTown(makeCity('T','river',5)),legacy,{trinkets:['steam_governor','phoenix_furnace']});
  assert.deepEqual(out.city.trinkets,['steam_governor']);assert.deepEqual(out.legacy.equipped,['steam_governor']);
});
test('a finished run enters the World Cities list with its placings',()=>{
  let c=foundRun(seedTown(makeCity('T','river',7)),emptyLegacy(),{}).city;
  c=advance(c,30);c={...c,finished:true};
  const r=recordRun(emptyLegacy(),c,stats(c));
  assert.equal(r.legacy.worldEntries.length,1);assert.ok(r.legacy.worldEntries[0].ages.medieval);assert.ok(Array.isArray(r.run.placings));
});
