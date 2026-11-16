// v2.4: the city evolves. Walls come down when the town outgrows them, can
// become a linear park, and ensanche blocks widen with each era.
import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,buildWall,convertWall,PUBLIC_WORKS,WALL_TEARDOWN_FROM} from '../src/sim.js';
import {buildGrids,LATTICE} from '../src/growth.js';
import {newCity,takeTurn} from './helpers/strategies.js';

const until=(c,y)=>{let n=0;while(c.year<y&&n++<600){c=advance(c,Math.min(5,y-c.year));c=takeTurn('sensible',c);}return c;};
const walled=(()=>{let c;return()=>{if(c)return c;c=until(newCity(7),1450);const r=buildWall({...c,funds:c.funds+5000});assert.equal(r.error,null);return c=r.city;};})();

// v3.4: the walls are the player's decision; they stand until turned into a boulevard, park or canal.
test('walls stand until the player turns them into something else',()=>{
  const c=until(walled(),1900),w=c.walls[0];
  assert.equal(w.state,'wall');assert.ok(!c.events.some(e=>/outgrown its walls/.test(e.text)));
  const r=convertWall({...c,funds:c.funds+50000},'boulevard');assert.equal(r.error,null);assert.equal(r.city.walls[0].state,'boulevard');
});
test('the wall can become a linear park instead: open land, no street, prosperity',()=>{
  const c=until(walled(),1805);assert.equal(c.walls[0].state,'wall');
  const r=convertWall({...c,funds:c.funds+20000},'park');assert.equal(r.error,null);
  const w=r.city.walls[0];assert.equal(w.state,'park');assert.ok(w.parkCells.length>10);
  const g=buildGrids(r.city);assert.ok(w.parkCells.every(k=>g.occ[k]),'nothing is built on the park');
  assert.ok(!r.city.roads.some(x=>x.cls==='ring'),'no ring street');
  assert.ok(PUBLIC_WORKS.park.from<=1805);
});
test('ensanche blocks widen with each era',()=>{
  assert.ok(LATTICE.regular.step<LATTICE.industrial.step&&LATTICE.industrial.step<LATTICE.modern.step);
  assert.ok(LATTICE.modern.step>=8,'modern blocks are wide enough to keep a courtyard');
});
