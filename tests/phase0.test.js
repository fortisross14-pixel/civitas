import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,addZone,advance,selectTurningPoint,demand,stats,cityOrigin,tourismUnlocked,W} from '../src/sim.js';

// v1.0.1 Phase 0 regression tests.
function grow(type,seed,until=1800){
 let c=seedTown(makeCity('Phase0',type,seed));
 c=addZone(addZone(c,10,10,45,45,'res'),12,56,40,10,'trade');
 let n=0;while(c.year<until&&n++<60){c=advance(c,until-c.year);if(c.turning?.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);}
 return c;
}
function largestNetworkShare(city){
 const roads=new Set(city.roads.filter(r=>Number.isFinite(r.x)).map(r=>r.y*W+r.x));const seen=new Set();let best=0;
 for(const k of roads){if(seen.has(k))continue;const q=[k];seen.add(k);let size=0;
  while(q.length){const x=q.pop();size++;const cx=x%W,cy=Math.floor(x/W);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx;if(nx<0||nx>=W)continue;const nk=(cy+dy)*W+nx;if(roads.has(nk)&&!seen.has(nk)){seen.add(nk);q.push(nk);}}}
  best=Math.max(best,size);}
 return best/Math.max(1,roads.size);
}
test('streets form one main connected network rather than isolated fragments',()=>{
 for(const [type,seed] of [['plain',5],['coast',12]]){
  const c=grow(type,seed);
  assert.ok(largestNetworkShare(c)>=.8,`${type}: largest street network is only ${(largestNetworkShare(c)*100).toFixed(0)}%`);
 }
});
test('growth gravitates to the founding point recorded for each geography',()=>{
 for(const type of ['river','plain','coast','estuary','lake']){
  const c=seedTown(makeCity('Origin',type,9));
  assert.ok(c.origin&&Number.isFinite(c.origin.x),type);
  const res=c.buildings.filter(b=>b.type==='res');
  const cx=res.reduce((n,b)=>n+b.x,0)/res.length,cy=res.reduce((n,b)=>n+b.y,0)/res.length;
  assert.ok(Math.hypot(cx-c.origin.x,cy-c.origin.y)<9,`${type}: houses centred ${cx.toFixed(1)},${cy.toFixed(1)} vs origin ${c.origin.x},${c.origin.y}`);
 }
 const legacy={...makeCity('Old','plain',1)};delete legacy.origin;
 assert.deepEqual(cityOrigin(legacy),{x:43,y:34});
});
test('demand explanations always agree with the level shown',()=>{
 const okText=/keeping pace|keeping up|enough|balanced/;
 for(const c of [seedTown(makeCity('D','river',3)),grow('river',3,1600),grow('plain',4,1900)]){
  for(const [k,row] of Object.entries(demand(c))){
   if(row.level==='stable')assert.ok(okText.test(row.reason)||/No .* yet/.test(row.reason),`${k}: stable but "${row.reason}"`);
   else assert.ok(!okText.test(row.reason),`${k}: ${row.level} but "${row.reason}"`);
  }
 }
});
test('tourism zoning opens only after Tourist Paradise is chosen in the run',()=>{
 const c=seedTown(makeCity('T','plain',2));
 c.turning={...c.turning,cardPool:['tourist_paradise']};
 assert.equal(tourismUnlocked(c),false);
 assert.equal(addZone(c,10,10,5,5,'hotel'),c);
 const chosen={...c,turning:{...c.turning,choices:[{index:0,year:1300,cardId:'tourist_paradise'}]}};
 assert.equal(tourismUnlocked(chosen),true);
 assert.notEqual(addZone(chosen,10,10,5,5,'hotel'),chosen);
});
test('GDP per person is a per-resident figure, not total GDP',()=>{
 const s=stats(grow('river',8,1500));
 assert.ok(s.gdpPerCapita<s.gdp/10);
 assert.equal(s.gdpPerCapita,Math.round(s.gdp/s.population));
});
