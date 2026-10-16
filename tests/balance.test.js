import test from 'node:test';
import assert from 'node:assert/strict';
import {campaign} from './helpers/balance-fixture.js';
import {stats,makeCity,seedTown,normalizeCity} from '../src/sim.js';
import {scoreCity} from '../src/legacy.js';

// Gameplay acceptance tests: use real 1300–2030 simulations rather than mocked
// score changes. These numeric thresholds deliberately leave room for RNG variation.
const balanced=campaign(410,'balanced','default',false);
const compact=campaign(410,'compact','default',false);
const spread=campaign(410,'sprawl','default',false);
const cultural=campaign(410,'compact','culture',false);
const industrial=campaign(410,'compact','industry',false);
const population=campaign(410,'compact','population',false);
const upgraded=campaign(410,'balanced','default',true);

test('campaign always finishes with twenty choices, legitimate maps and finite economic indicators',()=>{
 for(const run of [balanced,compact,spread,cultural,industrial,population,upgraded]){
  assert.equal(run.year,2030);assert.equal(run.choices,20);
  assert.ok(run.population>=40);assert.ok(run.treasury>=0);
  for(const metric of ['gdpPC','gdp','culture','quality','unemp','efficiency','legacyReward'])assert.ok(Number.isFinite(run[metric]),metric);
  assert.ok(run.unemp>=0&&run.unemp<=100);
  assert.equal(run.city.snapshots.length,16);
 }
});
test('resident-focused city can exceed an industrial build in population',()=>{
 // v1.3: industrial cities now also draw workers (jobs, informal workshops),
 // so the gap narrowed from 1.4× to about 1.3×.
 assert.ok(population.population>industrial.population*1.2,`population ${population.population} vs industrial ${industrial.population}`);
});
// v1.2: density cards (Dense Living, Housing Revolution, Vertical Metropolis)
// carry an explicit crowding cost to prosperity.
test('resident-focused city loses livability compared with an industrial build',()=>{
 assert.ok(population.quality<industrial.quality,`population ${population.quality} vs industrial ${industrial.quality}`);
});
test('an industry-oriented card build substantially improves productivity',()=>{
 assert.ok(industrial.gdpPC>compact.gdpPC*1.20);
});
test('cultural synergies can create dramatically higher artistic prestige',()=>{
 assert.ok(cultural.culture>industrial.culture*1.8);
});
// v1.2: zoning the whole map no longer buys a bigger city. Idle zoned land and
// far-flung streets cost upkeep, and the budget squeeze slows growth.
test('sprawl sacrifices efficiency and treasury without buying a bigger city',()=>{
 assert.ok(spread.population<compact.population*1.1,`sprawl ${spread.population} vs compact ${compact.population}`);
 assert.ok(spread.efficiency<compact.efficiency-7);
 assert.ok(spread.treasury/spread.population<compact.treasury/compact.population);
});
test('permanent Legacy upgrades enable materially larger, wealthier cities',()=>{
 assert.ok(upgraded.population>balanced.population*1.10);
 assert.ok(upgraded.gdp>balanced.gdp*1.15);
 assert.ok(upgraded.legacyReward>balanced.legacyReward);
});
test('campaign outcomes remain stable across serialization and different map eras',()=>{
 const snapshot=JSON.parse(JSON.stringify(cultural.city));
 const restored=normalizeCity(snapshot);
 assert.equal(stats(restored).population,stats(cultural.city).population);
 assert.equal(scoreCity(restored,stats(restored)).points,cultural.legacyReward);
 assert.ok(restored.history.some(h=>h.infrastructureEfficiency>=0));
 assert.ok(restored.history.some(h=>h.unemployment>=0));
 assert.ok(restored.history.some(h=>h.treasury>=0));
});
test('repeat campaigns across different seeds produce variety, without broken outputs',()=>{
 const seeds=[101,313,793];
 const runs=seeds.map(seed=>campaign(seed,'compact','default',false,'river'));
 assert.equal(new Set(runs.map(r=>r.population)).size,3);
 for(const r of runs){assert.equal(r.choices,20);assert.ok(r.gdpPC>1000);assert.ok(r.treasury>=0);}
});
test('same seed and zoning with upgraded Legacy has higher potential on average',()=>{
 const seeds=[101,313,793];
 const base=seeds.map(seed=>campaign(seed,'balanced','default',false));
 const better=seeds.map(seed=>campaign(seed,'balanced','default',true));
 const avg=(arr,k)=>arr.reduce((sum,v)=>sum+v[k],0)/arr.length;
 assert.ok(avg(better,'population')>avg(base,'population')*1.08);
 assert.ok(avg(better,'gdp')>avg(base,'gdp')*1.12);
 assert.ok(avg(better,'legacyReward')>avg(base,'legacyReward'));
});
