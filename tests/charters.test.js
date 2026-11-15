// v3 charters: three goals each Age, one signed, paid or penalised.
import test from 'node:test';
import assert from 'node:assert/strict';
import {charterOptions,signCharter,charterYear,UNREST_ON_FAIL,charterLine} from '../src/charters.js';
import {makeCity,seedTown,stats,placeTownCenter,prepareFounding,advance,chartersOn} from '../src/sim.js';
import {foundRun} from '../src/runs.js';
import {emptyLegacy} from '../src/legacy.js';
import {runStrategy} from './helpers/strategies.js';

const founded=()=>foundRun(prepareFounding(makeCity('T','river',5)),emptyLegacy(),{}).city;
test('placing the Town Center offers three charters: steady, calling and World Top 20',()=>{
  const c=founded();assert.ok(c.awaitingCenter);
  const r=placeTownCenter(c,40,40);assert.ok(!r.error,r.error);
  const o=r.city.charterOffer;assert.equal(o.length,3);assert.deepEqual(o.map(x=>x.kind),['growth','calling','world']);
  for(const x of o){assert.equal(x.by,1499);assert.ok(x.target>0);assert.ok(x.reward.funds>0);assert.ok(charterLine(x).length<60);}
  assert.ok(o[2].reward.lp>0&&o[2].reward.card==='epic');
});
test('a met charter pays coins and a card; a missed one raises Unrest at the Age end',()=>{
  let c=placeTownCenter(founded(),40,40).city;
  const signed=signCharter({...c,charterOffer:c.charterOffer.map((x,i)=>i===1?{...x,target:1}:x)},1).city;
  assert.ok(!signed.charterOffer);
  const met={...signed,events:[...signed.events]},funds=met.funds,hand=met.deck.hand.length;
  charterYear(met,1301,()=>stats(met),()=>.3);
  assert.equal(met.charter.met,1301);assert.ok(met.funds>funds);assert.equal(met.deck.hand.length,hand+1);
  const miss={...signCharter(c,0).city,events:[...c.events],unrest:0};miss.charter={...miss.charter,target:1e9};
  charterYear(miss,1400,()=>stats(miss));assert.ok(!miss.charter.failed);
  charterYear(miss,1499,()=>stats(miss));assert.ok(miss.charter.failed);assert.equal(miss.unrest,UNREST_ON_FAIL);
});
test('every Age offers new charters in a Chronicle, none in a scenario; bots meet some',()=>{
  const r=runStrategy('opportunist',7,1720);
  assert.ok(r.city.charter&&r.city.charter.age!=='medieval','a later Age charter was signed');
  assert.ok(chartersOn(r.city));assert.ok(!chartersOn({...r.city,scenario:{id:'x'}}));
});
