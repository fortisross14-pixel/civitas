// v3.2: the old city as decisions — sites open in their Age, cost coins, change the city for good.
import test from 'node:test';
import assert from 'node:assert/strict';
import {HERITAGE,openSites,optionsFor,decideHeritage,heritageEffects,isOpen,MAX_OPEN} from '../src/heritage.js';
import {cityEffects,normalizeCity} from '../src/sim.js';
import {newCity} from './helpers/strategies.js';

const at=(year,extra={})=>({...newCity(3),center:{x:50,y:36},year,funds:5000,...extra});
const canal={id:'canal',kind:'canal',x:40,y:30,born:1310};

test('every kind offers two to four choices with a label and a short line',()=>{
  for(const [k,def] of Object.entries(HERITAGE))for(const y of [1800,1960]){const o=def.options(y);
    assert.ok(o.length>=2&&o.length<=4,k);for(const x of o){assert.ok(x.label&&x.detail&&Number.isFinite(x.cost),`${k}:${x.id}`);}}
});
test('a site is a question only from its Age on, and once',()=>{
  assert.equal(isOpen(at(1700),canal),false);
  const c=at(1800);assert.equal(isOpen(c,canal),true);
  const r=decideHeritage(c,canal,'street');assert.equal(r.error,null);
  assert.equal(r.city.funds,5000-320);assert.equal(r.city.heritage.canal.option,'street');
  assert.equal(isOpen(r.city,canal),false);assert.ok(decideHeritage(r.city,canal,'walk').error);
});
test('the chase waits until the town surrounds it',()=>{
  const c=at(1700);assert.equal(isOpen(c,{id:'chase',kind:'chase',born:1580,ripe:false}),false);assert.equal(isOpen(c,{id:'chase',kind:'chase',born:1580,ripe:true}),true);
});
test('a choice costs coins, can pay the city, and its effects last',()=>{
  const poor=at(1800,{funds:100});assert.ok(decideHeritage(poor,canal,'street').error);
  const chase={id:'chase',kind:'chase',born:1580,ripe:true};
  const sold=decideHeritage(at(1960),chase,'sell').city;assert.ok(sold.funds>5000);assert.ok((sold.unrest||0)>0);
  const before=cityEffects(at(1800)).transport||0,after=cityEffects(decideHeritage(at(1800),canal,'street').city).transport||0;assert.ok(after>before);
  assert.ok(heritageEffects(sold).prosperity<0);
});
test('the old bridge: keep for walking, widen, or build a new one',()=>{
  const c=at(1880,{bridges:[{id:'w1-1400',cells:[[60,30],[61,30],[62,30]],built:1400}]});
  const s=openSites(c).find(x=>x.kind==='bridge');assert.ok(s);
  assert.deepEqual(optionsFor(c,s).map(o=>o.id),['walk','widen','new']);
  assert.equal(openSites(at(1880,{bridges:[{id:'w2',cells:[[60,30]],built:1820}]})).filter(x=>x.kind==='bridge').length,0);
});
test('few questions at a time, one of each kind first',()=>{
  const many=[canal,...[0,1,2,3,4].map(i=>({id:`market:${i}`,kind:'market',x:i,y:i,born:1300+i})),{id:'chase',kind:'chase',born:1580,ripe:true}];
  const o=openSites(at(1900),many);assert.equal(o.length,MAX_OPEN);assert.deepEqual(new Set(o.slice(0,3).map(s=>s.kind)),new Set(['canal','market','chase']));
});
test('decisions survive a save',()=>{
  const c=decideHeritage(at(1800),canal,'walk').city,back=normalizeCity(JSON.parse(JSON.stringify(c)));
  assert.equal(back.heritage.canal.option,'walk');
});
