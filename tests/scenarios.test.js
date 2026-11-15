// v2.6 scenarios: start cities, scripted history, goals, stars and the trinket reward.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {SCENARIOS,SCENARIO_INDEX,scenarioOpen,starsOf,goalTarget} from '../src/scenarios.js';
import {startScenario} from '../src/scenarioStart.js';
import {TRINKET_INDEX} from '../src/trinkets.js';
import {advance,stats} from '../src/sim.js';
import {emptyLegacy} from '../src/legacy.js';
import {recordRun} from '../src/runs.js';
import {takeTurn} from './helpers/strategies.js';

const pre=id=>JSON.parse(readFileSync(new URL(`../public/scenarios/${id}.json`,import.meta.url),'utf8'));

test('eight scenarios, each with a fictional name, a real inspiration, three goals and its own trinket',()=>{
  assert.equal(SCENARIOS.length,8);
  const rewards=new Set();
  for(const s of SCENARIOS){
    assert.ok(s.name&&s.blurb.length<=60,s.id);assert.match(s.story,/Inspired by/);assert.equal(s.goals.length,3);
    assert.ok(TRINKET_INDEX[s.reward]);assert.equal(TRINKET_INDEX[s.reward].scenario,s.id);rewards.add(s.reward);
    if(s.start.from!=='fresh')assert.ok(existsSync(new URL(`../public/scenarios/${s.id}.json`,import.meta.url)),`${s.id} start city`);
  }
  assert.equal(rewards.size,8);
});
test('scenarios open in order',()=>{
  assert.ok(scenarioOpen({},'ford_market'));assert.ok(!scenarioOpen({},'black_year'));
  assert.ok(scenarioOpen({ford_market:{stars:1}},'black_year'));
});
test('stars need the goals in order',()=>{
  const d=SCENARIO_INDEX.ford_market;
  assert.equal(starsOf(d,{met:[null,1400,1400]}),0);assert.equal(starsOf(d,{met:[1400,null,1400]}),1);assert.equal(starsOf(d,{met:[1400,1419,null]}),2);assert.equal(starsOf(d,{met:[1400,1419,1390]}),3);
});
test('a prebuilt scenario starts in its year with the scenario founder, your trinkets and a fresh hand',()=>{
  const legacy={...emptyLegacy(),trinkets:['plague_bell']};
  const {city}=startScenario('ensanche',legacy,{trinkets:['plague_bell','steam_governor']},pre('ensanche'),()=>.3);
  assert.equal(city.year,1850);assert.equal(city.name,SCENARIO_INDEX.ensanche.name);assert.deepEqual(city.trinkets,['plague_bell']);
  assert.equal(city.founder,'wanderer');assert.ok(!city.finished);assert.ok(city.buildings.length>200);assert.ok(city.deck.shop);
  assert.ok((city.walls||[]).some(w=>w.state==='wall'));assert.equal(city.scenario.id,'ensanche');
});
test('the plague strikes on schedule, recovery counts only after it, and the run ends on the last year',()=>{
  let {city}=startScenario('black_year',emptyLegacy(),{},pre('black_year'),()=>.3);
  const before=stats(city).population;
  for(let n=0;n<40&&city.year<1350;n++){city=takeTurn('sensible',advance(city,5));}
  assert.ok(city.events.some(e=>e.text.includes('Great Mortality')));
  assert.ok(stats(city).population<before*.8,'the town shrank');
  assert.equal(city.scenario.met[0],null);
  assert.equal(goalTarget(SCENARIO_INDEX.black_year.goals[0],city.scenario),Math.round(before*1.05));
  for(let n=0;n<60&&!city.finished;n++){city=takeTurn('sensible',advance(city,5));}
  assert.ok(city.finished);assert.ok(city.year<=1420);assert.ok(city.scenario.done);
});
test('a star wins the trinket once; the scenario record keeps the best stars',()=>{
  let {city}=startScenario('ford_market',emptyLegacy(),{},null,()=>.3);
  city={...city,finished:true,scenario:{...city.scenario,stars:2,met:[1400,1419,null]}};
  const r=recordRun(emptyLegacy(),city,stats(city));
  assert.deepEqual(r.legacy.trinkets,['market_cross']);assert.equal(r.run.trinketWon,'market_cross');assert.equal(r.legacy.scenarios.ford_market.stars,2);
  assert.equal(r.legacy.hardship,0,'scenarios do not raise Hardship');
  const again=recordRun(r.legacy,{...city,id:city.id+'b',scenario:{...city.scenario,stars:1}},stats(city));
  assert.equal(again.legacy.scenarios.ford_market.stars,2);assert.equal(again.legacy.scenarios.ford_market.plays,2);assert.equal(again.run.trinketWon,undefined);
});
