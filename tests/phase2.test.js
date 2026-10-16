import test from 'node:test';
import assert from 'node:assert/strict';
import {POP_SCALE,makeCity,seedTown,addZone,zoneLand,zoningCost,advance,selectTurningPoint,stats,setTax,demolishArea,revertEdit,normalizeCity,businessCycle} from '../src/sim.js';
import {annualRevenue,annualExpenses} from '../src/economy.js';

// v1.2 (Phase 2) economy, scale and decline.
const town=(type='plain',seed=42)=>seedTown(makeCity('Ledger',type,seed));
function run(c,years,pick=0){let n=0;const target=Math.min(2030,c.year+years);while(c.year<target&&n++<80){c=advance(c,target-c.year);if(c.turning?.pending)c=selectTurningPoint(c,c.turning.pending.options[pick]);}return c;}

test('a well-run town reaches historical sizes (thousands by 1500, tens of thousands by 1600)',()=>{
  let c=addZone(addZone(town('plain',7),20,14,24,20,'res'),46,40,14,10,'craft');
  assert.equal(stats(c).population,120*POP_SCALE);
  c=run(c,200);const s1500=stats(c).population;
  c=run(c,100);const s1600=stats(c).population;
  assert.ok(s1500>=4000&&s1500<=40000,`1500: ${s1500}`);
  assert.ok(s1600>=10000&&s1600<=120000,`1600: ${s1600}`);
});
test('surveying new land costs treasury, rezoning is free, and undo refunds',()=>{
  const c=town('plain',3),before=c.funds;
  const {cells,cost}=zoningCost(c,10,10,10,10);
  assert.equal(cells,100);assert.ok(cost>0);
  const zoned=zoneLand(c,10,10,10,10,'res');
  assert.equal(zoned.error,null);assert.equal(zoned.city.funds,before-cost);
  const rezoned=zoneLand(zoned.city,10,10,10,10,'craft');assert.equal(rezoned.city.funds,zoned.city.funds,'rezoning already-zoned land is free');
  assert.equal(revertEdit(zoned.city,zoned.undo).funds,before);
  assert.match(zoneLand(c,0,0,100,72,'res').error,/costs/,'the whole map is unaffordable at the start');
});
test('public services and institutions are paid for, so the budget is tight but positive at average taxes',()=>{
  const c=run(addZone(town('plain',11),20,14,24,20,'res'),300);
  const s=stats(c),income=annualRevenue(c,s),costs=annualExpenses(c,s);
  assert.ok(costs.services>0&&costs.maintenance>0);
  assert.ok(income.total>costs.total*.95,`income ${income.total.toFixed(1)} vs spending ${costs.total.toFixed(1)}`);
  assert.ok(income.total<costs.total*1.8,'money should not pile up without limit');
});
test('abolishing taxes empties the treasury, cuts services and drives people away',()=>{
  const base=run(addZone(town('plain',13),20,14,24,20,'res'),250);
  let free=base;for(const sector of ['res','trade','craft'])free=setTax(free,sector,'none').city;
  const a=run(base,160),b=run(free,160);
  assert.ok(b.funds<a.funds,`treasury ${Math.round(b.funds)} vs ${Math.round(a.funds)}`);
  assert.ok(b.shortfall>.05,`service shortfall ${b.shortfall}`);
  assert.ok(b.events.some(e=>e.type==='crisis'));
  assert.ok(stats(b).prosperity<stats(a).prosperity+4,'tax-free euphoria is eaten by the service cuts');
});
test('when jobs disappear, homes empty and are eventually abandoned',()=>{
  let c=run(addZone(addZone(town('plain',17),20,14,24,20,'res'),46,40,14,10,'craft'),250);
  // Close every workplace in the city.
  const razed=demolishArea(c,0,0,100,72,{streets:false}).city;
  const keepHomes={...razed,buildings:[...razed.buildings,...c.buildings.filter(b=>b.type==='res'&&!razed.buildings.some(x=>x.id===b.id))]};
  let later=run({...keepHomes,taxes:{res:'high',trade:'high',craft:'high'}},40);
  assert.ok(later.buildings.some(b=>b.vacant)||later.sites.some(s=>s.reason==='Abandoned'),'some homes should stand empty');
  later=run(later,30);
  assert.ok(later.sites.some(s=>s.reason==='Abandoned'),'long-empty buildings are torn down');
});
test('density cards cost livability',()=>{
  const c=run(town('plain',19),100);
  const dense=selectTurningPoint({...c,turning:{...c.turning,pending:{index:c.turning.choices.length,year:c.year,options:['dense_living']}}},'dense_living');
  assert.equal(stats(c).prosperity-stats(dense).prosperity,3);
});
test('each city has its own slow business cycle',()=>{
  const c=town('plain',23),values=[];
  for(let y=1300;y<1400;y+=2)values.push(businessCycle({...c,year:y}));
  assert.ok(Math.max(...values)>.08&&Math.min(...values)<-.08);
  assert.notDeepEqual(values,Array.from({length:50},(_,i)=>businessCycle({...town('plain',99),year:1300+i*2})));
});
test('v1.1 saves are migrated to the new population scale',()=>{
  const c=run(town('plain',5),60);
  const old={...JSON.parse(JSON.stringify(c)),schema:9,residents:c.residents/POP_SCALE,buildings:c.buildings.map(b=>({...b,capacity:b.capacity/POP_SCALE,jobs:b.jobs/POP_SCALE})),history:c.history.map(h=>({...h,population:h.population/POP_SCALE}))};
  const migrated=normalizeCity(old);
  assert.equal(migrated.schema,10);
  assert.equal(stats(migrated).population,stats(c).population);
  assert.equal(migrated.history.at(-1).population,c.history.at(-1).population);
});
