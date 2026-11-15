// v2.1: landmarks only from cards, a store of Commons and Uncommons that
// always stocks the answer to the pressing need, and plain-number card impacts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,advance,placeConstruction,stats,selectTurningPoint} from '../src/sim.js';
import {BASIC_BUILDINGS} from '../src/construction.js';
import {CARD_INDEX} from '../src/turningPoints.js';
import {deckOf,restockShop,shopEligible,STORE_RARITIES} from '../src/cards.js';
import {needsOf} from '../src/needs.js';
import {cardSummary,previewImpact,formatEffect} from '../src/impact.js';
import {newCity} from './helpers/strategies.js';

test('every landmark has a building card, sold in the same years as the building',()=>{
  for(const b of BASIC_BUILDINGS){const c=CARD_INDEX[`b_${b.kind}`];assert.ok(c,b.kind);assert.equal(c.building,b.kind);assert.equal(c.minYear,b.start);assert.equal(c.maxYear,b.end);}
});
test('doctrine cities build landmarks only from cards; classic cities still pay the treasury',()=>{
  const era={...newCity(7),funds:1e6},classic={...seedTown(makeCity('Classic','river',7)),funds:1e6};
  const o=era.center||{x:50,y:36};
  const r=placeConstruction(era,'market',o.x+3,o.y+3);assert.match(r.error||'',/building card/);
  let placed=false;for(let d=2;d<9&&!placed;d++)placed=!placeConstruction(classic,'market',(classic.center?.x||50)+d,(classic.center?.y||36)+d).error;
  assert.ok(placed,'classic cities still build basics');
});
test('the Market Hall sells only Commons and Uncommons in doctrine cities',()=>{
  let c=newCity(11);
  for(let i=0;i<20;i++){c=restockShop({...c,deck:{...deckOf(c),shop:null}},stats(c),i);
    for(const o of deckOf(c).shop.offers)assert.ok(STORE_RARITIES.includes(CARD_INDEX[o.cardId].rarity),o.cardId);}
  assert.ok(!shopEligible(CARD_INDEX.sacred_city,newCity(3)),'Epics come only from card events');
});
test('the Market Hall always stocks the building card for the most pressing need',()=>{
  let c=newCity(7),guard=0;
  while(!needsOf(c).some(n=>!n.served)&&guard++<60){c=advance(c,5);if(c.turning.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);}
  const need=needsOf(c).filter(n=>!n.served).sort((a,b)=>b.progress-a.progress)[0];assert.ok(need,'a need appeared');
  while(c.year%10!==9){c=advance(c,1);if(c.turning.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);}
  c=advance(c,1);if(c.turning.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);
  const offers=deckOf(c).shop.offers;
  if(needsOf(c).some(n=>!n.served))assert.ok(offers.some(o=>o.need&&CARD_INDEX[o.cardId].building),`offers: ${offers.map(o=>o.cardId)}`);
});
test('cards state their effects in plain numbers and show what changes now',()=>{
  const s=cardSummary(CARD_INDEX.tithe_barn,newCity(7));
  assert.ok(s.lines.some(l=>l.label==='Faith output'&&l.good&&/^\+\d+%$/.test(l.text)));
  assert.equal(s.duration,'for the rest of the run');
  const b=cardSummary(CARD_INDEX.b_market,newCity(7));assert.equal(b.building.name,'Market Square');assert.ok(b.needs.includes('A market'));
  assert.equal(formatEffect('pollution',.1).good,false,'more smoke is bad');
  let c=newCity(7);c=advance(c,20);
  const now=previewImpact(c,CARD_INDEX.tithe_barn);assert.ok(now.rows.some(r=>r.label==='Faith influence'&&r.good),JSON.stringify(now));
  assert.equal(previewImpact(c,CARD_INDEX.water_mill).slow,true,'growth cards say they act slowly');
  assert.equal(previewImpact(c,CARD_INDEX.b_market),null,'building cards list their building instead');
});
