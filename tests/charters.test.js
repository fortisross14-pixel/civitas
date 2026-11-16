// v3.7 charters: each Age three directions; one signed gives buffs, Market priority and a growth goal.
import test from 'node:test';
import assert from 'node:assert/strict';
import {charterOptions,signCharter,charterYear,charterLine,charterEffects,DIRECTIONS} from '../src/charters.js';
import {cityEffects} from '../src/sim.js';
import {storeFavour} from '../src/cards.js';
import {makeCity,seedTown,stats,placeTownCenter,prepareFounding,advance,chartersOn} from '../src/sim.js';
import {foundRun} from '../src/runs.js';
import {emptyLegacy} from '../src/legacy.js';
import {runStrategy} from './helpers/strategies.js';

const founded=()=>foundRun(prepareFounding(makeCity('T','river',5)),emptyLegacy(),{}).city;
test('placing the Town Center offers three directions, each with a growth goal and a reward',()=>{
  const c=founded();assert.ok(c.awaitingCenter);
  const r=placeTownCenter(c,40,40);assert.ok(!r.error,r.error);
  const o=r.city.charterOffer;assert.equal(o.length,3);assert.equal(new Set(o.map(x=>x.direction)).size,3,'three different directions');
  for(const x of o){assert.equal(x.kind,'direction');assert.ok(DIRECTIONS[x.direction]);assert.equal(x.by,1499);assert.ok(x.target>x.start&&x.pct>0);assert.ok(x.reward.funds>0&&x.reward.card);assert.ok(charterLine(x).length<60);}
});
test('a signed direction buffs the city and steers the Market for its Age',()=>{
  const c=placeTownCenter(founded(),40,40).city,o=c.charterOffer[1],signed=signCharter(c,1).city,D=DIRECTIONS[o.direction];
  assert.deepEqual(charterEffects(signed),D.buffs);
  const [k,v]=Object.entries(D.buffs)[0];assert.ok((cityEffects(signed)[k]||0)>=(cityEffects(c)[k]||0)+v-1e-9);
  assert.equal(storeFavour(signed),o.direction);assert.equal(storeFavour({...signed,year:1600}),null,'until the Age ends');
  assert.deepEqual(charterEffects({...signed,year:1600}),{});
});
test('a met goal pays coins and a card; a missed one only lapses',()=>{
  let c=placeTownCenter(founded(),40,40).city;
  const signed=signCharter({...c,charterOffer:c.charterOffer.map((x,i)=>i===1?{...x,target:1}:x)},1).city;
  assert.ok(!signed.charterOffer);
  const met={...signed,events:[...signed.events]},funds=met.funds,hand=met.deck.hand.length;
  charterYear(met,1301,()=>stats(met),()=>.3);
  assert.equal(met.charter.met,1301);assert.ok(met.funds>funds);assert.equal(met.deck.hand.length,hand+1);
  const miss={...signCharter(c,0).city,events:[...c.events],unrest:0};miss.charter={...miss.charter,target:1e12};
  charterYear(miss,1400,()=>stats(miss));assert.ok(!miss.charter.failed);
  charterYear(miss,1499,()=>stats(miss));assert.ok(miss.charter.failed);assert.equal(miss.unrest,0,'no penalty');
});
test('every Age offers new charters in a Chronicle, none in a scenario; bots meet some',()=>{
  const r=runStrategy('opportunist',7,1720);
  assert.ok(r.city.charter&&r.city.charter.age!=='medieval','a later Age charter was signed');
  assert.ok(chartersOn(r.city));assert.ok(!chartersOn({...r.city,scenario:{id:'x'}}));
});
