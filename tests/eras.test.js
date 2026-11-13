// v1.7 era drafts: five Rare-or-better picks, one per new era, in player cities.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,advance,selectTurningPoint,normalizeCity} from '../src/sim.js';
import {CARD_INDEX,ERA_DRAFT_YEARS,PREMIUM_RARITIES,turningCount,turningSchedule,turningMode,currentTurningIndex,TURNING_POINTS} from '../src/turningPoints.js';
import {newCity,runStrategy} from './helpers/strategies.js';

test('player cities draft once as each era begins; engine runs keep 20 Turning Points',()=>{
  const era=newCity(7),classic=seedTown(makeCity('Classic','river',7));
  assert.equal(turningMode(era),'era');assert.equal(turningCount(era),5);
  assert.deepEqual(turningSchedule(era),[1500,1750,1850,1950,2000]);
  assert.equal(turningMode(classic),'classic');assert.equal(turningCount(classic),TURNING_POINTS);
});

test('the first era draft opens in 1500 and offers only Rare cards or better',()=>{
  let c=newCity(11);
  while(!c.turning.pending&&c.year<1510)c=advance(c,10);
  assert.ok(c.turning.pending,'a draft opened');assert.equal(c.turning.pending.year,ERA_DRAFT_YEARS[0]);
  assert.equal(c.turning.pending.options.length,3);
  for(const id of c.turning.pending.options){const card=CARD_INDEX[id]||{rarity:'rare'};assert.ok(PREMIUM_RARITIES.includes(card.rarity),`${id} is ${card.rarity}`);}
  const next=selectTurningPoint(c,c.turning.pending.options[0]);
  assert.equal(currentTurningIndex(next),1);assert.equal(next.turning.pending,null);
});

test('a campaign makes exactly five drafts and the mode survives save and load',()=>{
  let c=newCity(3),drafts=0;
  while(c.year<2030&&!c.finished){c=advance(c,50);if(c.turning.pending){drafts++;c=selectTurningPoint(c,c.turning.pending.options[0]);}}
  assert.equal(drafts,5);assert.equal(currentTurningIndex(c),5);
  const back=normalizeCity(JSON.parse(JSON.stringify(c)));
  assert.equal(turningMode(back),'era');assert.equal(currentTurningIndex(back),5);
});

test('exit test (Milestone C): at least 80% of decisions act on a place or a moment',()=>{
  const {city}=runStrategy('sensible',7,2030);
  const placed=(city.landmarks||[]).filter(l=>l.source==='basic').length;
  const cards=city.turning.choices.filter(p=>p.via==='hand').length;
  const history=city.events.filter(e=>e.type==='history'&&!e.undecided).length;
  const drafts=city.turning.choices.filter(p=>p.via!=='hand').length;
  const share=(placed+cards+history)/(placed+cards+history+drafts);
  assert.equal(drafts,5);assert.ok(share>=.8,`place-or-moment share ${share.toFixed(2)}`);
});
