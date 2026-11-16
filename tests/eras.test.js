// v2.1 card events: every 25 years (1325 … 2025) a player city chooses one of
// three cards that are never sold in the Market Hall. The card goes to the hand.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,advance,selectTurningPoint,normalizeCity} from '../src/sim.js';
import {CARD_INDEX,ERA_DRAFT_YEARS,CARD_EVENT_YEARS,PREMIUM_RARITIES,turningCount,turningSchedule,turningMode,currentTurningIndex,TURNING_POINTS} from '../src/turningPoints.js';
import {deckOf,storeFavour} from '../src/cards.js';
import {cardDoctrines} from '../src/doctrines.js';
import {newCity,runStrategy} from './helpers/strategies.js';

test('player cities have a card event every 25 years; engine runs keep 20 Turning Points',()=>{
  const era=newCity(7),classic=seedTown(makeCity('Classic','river',7));
  assert.equal(turningMode(era),'era');assert.equal(turningCount(era),29);
  assert.deepEqual(turningSchedule(era),CARD_EVENT_YEARS);assert.equal(CARD_EVENT_YEARS[0],1325);assert.equal(CARD_EVENT_YEARS.at(-1),2025);
  assert.equal(ERA_DRAFT_YEARS,CARD_EVENT_YEARS);
  assert.equal(turningMode(classic),'classic');assert.equal(turningCount(classic),TURNING_POINTS);
});

test('the first card event opens in 1325, offers Rare cards or better, and its pick goes to the hand',()=>{
  let c=newCity(11);
  while(!c.turning.pending&&c.year<1330)c=advance(c,5);
  assert.ok(c.turning.pending,'an event opened');assert.equal(c.turning.pending.year,1325);
  assert.equal(c.turning.pending.options.length,3);
  for(const id of c.turning.pending.options){const card=CARD_INDEX[id]||{rarity:'rare'};assert.ok(PREMIUM_RARITIES.includes(card.rarity),`${id} is ${card.rarity}`);}
  const pick=c.turning.pending.options.find(id=>CARD_INDEX[id]&&CARD_INDEX[id].kind!=='figure')||c.turning.pending.options[0];
  const before=deckOf(c).hand.length,next=selectTurningPoint(c,pick);
  assert.equal(currentTurningIndex(next),1);assert.equal(next.turning.pending,null);
  if(CARD_INDEX[pick].kind!=='figure'){
    const held=deckOf(next).hand.at(-1);assert.equal(deckOf(next).hand.length,before+1);assert.equal(held.cardId,pick);assert.ok(held.gift);
    assert.ok(!next.turning.choices.some(p=>p.cardId===pick),'not played yet');
    // v3.7: the Market Hall follows the charter's direction, not the card event's pick.
    assert.equal(storeFavour(next),storeFavour(c));
  }
});

test('a campaign has exactly 29 card events and the count survives save and load',()=>{
  let c=newCity(3),events=0;
  while(c.year<2030&&!c.finished){c=advance(c,50);if(c.turning.pending){events++;c=selectTurningPoint(c,c.turning.pending.options[0]);}}
  assert.equal(events,29);assert.equal(currentTurningIndex(c),29);
  const back=normalizeCity(JSON.parse(JSON.stringify(c)));
  assert.equal(turningMode(back),'era');assert.equal(currentTurningIndex(back),29);
});

test('a save from before card events catches up instead of opening every past event',()=>{
  let c=newCity(5);c=advance(c,5);
  const old={...JSON.parse(JSON.stringify(c)),year:1600,turning:{...c.turning,pending:null,eventsTaken:undefined,skipped:0}};
  const back=normalizeCity(old);
  assert.ok(turningSchedule(back)[currentTurningIndex(back)+back.turning.skipped]>=1600);
});

test('exit test (Milestone C): most decisions act on a place or a moment',()=>{
  const {city}=runStrategy('sensible',7,2030);
  const placed=(city.landmarks||[]).length;
  const cards=city.turning.choices.filter(p=>p.via==='hand').length;
  const history=city.events.filter(e=>e.type==='history'&&!e.undecided).length;
  const events=currentTurningIndex(city);
  assert.equal(events,29);
  assert.ok(placed+cards+history>=events,`placed ${placed} + played ${cards} + history ${history} vs ${events} card events`);
});
