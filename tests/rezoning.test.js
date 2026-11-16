// v3.4: building only on zoned land, demand, rezoning that changes the city over the years, cars and rents.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,addZone,demandOf,rezonedOf,stats,zoneCell} from '../src/sim.js';
import {takeTurn} from './helpers/strategies.js';
import {advance as step} from '../src/sim.js';
// Years pass with card events answered (the passive player zones nothing itself).
const advance=(c,n)=>{const end=c.year+n;let k=0;while(c.year<end&&k++<400){c=step(c,Math.min(5,end-c.year));c=takeTurn('passive',c);}return c;};
import {carShare} from '../src/spatial.js';

const town=()=>seedTown(makeCity('Rezone','plain',31));
test('demand names each use, how much is wanted and the zoned land left',()=>{
  const d=demandOf(advance(town(),40));for(const t of ['res','trade','craft','farm','civic']){assert.ok(d[t].level>=0&&d[t].level<=1,t);assert.ok(Number.isInteger(d[t].free),t);}
});
test('repainting homes as workshops changes them over the years, not at once',()=>{
  let c=advance(town(),60);const homes=c.buildings.filter(b=>b.type==='res'&&!b.special);assert.ok(homes.length>5);
  const xs=homes.map(b=>Math.floor(b.x)),ys=homes.map(b=>Math.floor(b.y)),x0=Math.min(...xs),y0=Math.min(...ys);
  c=addZone(c,x0,y0,Math.max(...xs)-x0+1,Math.max(...ys)-y0+1,'craft');const due=rezonedOf(c).length;assert.ok(due>5,`${due} to change`);
  const later=advance(c,5);assert.ok(rezonedOf(later).length>0,'still changing after five years');
  const much=advance(c,60);assert.ok(rezonedOf(much).length<due*.6,`${rezonedOf(much).length} of ${due} left after sixty years`);
  assert.ok(much.buildings.filter(b=>b.type==='craft').length>c.buildings.filter(b=>b.type==='craft').length,'workshops took their place');
});
test('cars come with the twentieth century',()=>{assert.equal(carShare(1850),0);assert.ok(carShare(1925)>0&&carShare(1925)<carShare(1990));assert.ok(carShare(2030)<=.75);});
test('before cars there is no traffic',()=>{const s=stats(advance(town(),100));assert.equal(s.traffic,0);assert.equal(s.carShare,0);});
