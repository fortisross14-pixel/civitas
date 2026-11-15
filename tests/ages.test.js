// v2.5: five Ages drive building style, street pattern, landmarks, urban works and the welcome.
import test from 'node:test';
import assert from 'node:assert/strict';
import {AGES,ageAt,ageStyle,agePattern} from '../src/ages.js';
import {BASIC_BUILDINGS} from '../src/construction.js';
import {URBAN_CARDS} from '../src/doctrineCards.js';
import {styleAt,advance,selectTurningPoint} from '../src/sim.js';
import {patternFor} from '../src/growth.js';
import {ageChanges} from '../src/ageChanges.js';
import {newCity} from './helpers/strategies.js';

test('five contiguous Ages from 1300 to 2030',()=>{
  assert.deepEqual(AGES.map(a=>a.name),['Medieval','Renaissance','Enlightenment','Modern','Contemporary']);
  for(let i=1;i<AGES.length;i++)assert.equal(AGES[i].from,AGES[i-1].to+1);
  assert.equal(AGES[0].from,1300);assert.equal(AGES.at(-1).to,2030);
  assert.equal(ageAt(1499).id,'medieval');assert.equal(ageAt(1500).id,'renaissance');
});
test('style, streets, landmarks and urban works change with the Age',()=>{
  for(const y of [1300,1500,1700,1850,1950,2010]){assert.equal(styleAt(y),ageStyle(y));assert.equal(patternFor(y),agePattern(y));}
  assert.equal(styleAt(1600),'stone');assert.equal(styleAt(1720),'classical');
  for(const b of BASIC_BUILDINGS)if(b.id!=='market'&&b.start<2000)assert.ok(AGES.some(a=>a.from===b.start),`${b.id} starts with an Age`);
  for(const a of AGES)assert.ok(URBAN_CARDS.some(c=>c.minYear===a.from),`an urban work opens with ${a.name}`);
  const r=ageChanges(AGES[1]);assert.deepEqual(r.landmarks.sort(),['Guild Hall','Public School','Town Hall']);assert.ok(r.works.some(c=>c.id==='urb_piazza'));
});
test('a new Age is announced and greeted once',()=>{
  let c=newCity(7);while(c.year<1501){c=advance(c,25);if(c.turning.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);}
  assert.equal(c.ageWelcome?.id,'renaissance');
  assert.ok(c.events.some(e=>e.type==='age'&&e.age==='renaissance'));
  assert.equal(c.events.filter(e=>e.type==='age').length,1);
});
