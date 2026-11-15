// v2.3: from 1650 new streets follow a city-wide lattice, so later quarters
// grow as grids beside the winding medieval core.
import test from 'node:test';
import assert from 'node:assert/strict';
import {LATTICE} from '../src/growth.js';
import {runStrategy} from './helpers/strategies.js';

test('streets laid after 1650 mostly run on the lattice; medieval lanes do not',()=>{
  const c=runStrategy('sensible',7,1850).city;
  const on=(v,off,step)=>((v-off)%step+step)%step===0;
  const share=(roads,step)=>{const ox=Math.abs(c.seed|0)%step,oy=Math.abs((c.seed|0)>>3)%step;return roads.filter(r=>on(r.x,ox,step)||on(r.y,oy,step)).length/Math.max(1,roads.length);};
  const late=c.roads.filter(r=>r.born>=1650&&r.born<1800&&r.cls!=='main'),early=c.roads.filter(r=>r.born<1500&&r.cls!=='main');
  assert.ok(late.length>30,`${late.length} new streets`);
  const lateShare=share(late,LATTICE.regular.step),earlyShare=share(early,LATTICE.regular.step);
  assert.ok(lateShare>=.85,`lattice share after 1650: ${lateShare.toFixed(2)}`);
  assert.ok(earlyShare<lateShare-.2,`medieval ${earlyShare.toFixed(2)} vs planned ${lateShare.toFixed(2)}`);
});
