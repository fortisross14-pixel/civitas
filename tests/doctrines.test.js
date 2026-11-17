// v1.8 R1: the doctrine engine and pacing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,advance,selectTurningPoint,playCard,retireCard,cityEffects,normalizeCity,cityOrigin} from '../src/sim.js';
import {CARDS,CARD_INDEX,modifiers} from '../src/turningPoints.js';
import {DOCTRINE_IDS,DOCTRINES,cardDoctrines,cardType,doctrineState,doctrineFlags,decreeSlots,decreesInPlay,cardLevel,tierOf,scoreBonus,PATRONS,TIER_POWER,DOCTRINE_POWER} from '../src/doctrines.js';
import {deckOf,mergeCards,banishOffer,lockOffer,restockShop,cardPrice,BANISHES_PER_RUN} from '../src/cards.js';
import {assessNeeds} from '../src/needs.js';
import {cityFields} from '../src/sim.js';
import {SPEEDS,NORMAL_SPEED,runMinutes,paceFactor} from '../src/pacing.js';
import {newCity} from './helpers/strategies.js';
import {stats} from '../src/sim.js';

const rich=c=>({...c,funds:1e7});
const give=(c,cardId)=>({...c,deck:{...deckOf(c),hand:[...deckOf(c).hand,{uid:deckOf(c).nextUid,cardId,paid:100}],nextUid:deckOf(c).nextUid+1}});
const play=(c,cardId)=>{const g=give(c,cardId);const r=playCard(g,deckOf(g).hand.at(-1).uid);assert.equal(r.error,null,`${cardId}: ${r.error}`);return r.city;};
const ofDoctrine=(d,type)=>CARDS.filter(c=>cardDoctrines(c).length===1&&cardDoctrines(c)[0]===d&&(!type||cardType(c)===type)&&!c.minYear);

test('every card has a doctrine (or is Civic), with three hybrids and four Patrons',()=>{
  const civic=CARDS.filter(c=>!cardDoctrines(c).length).map(c=>c.id).sort();
  assert.deepEqual(civic,['civic_reform','grand_patronage','monumental_ambition','urban_renewal','world_exposition']);
  assert.equal(CARDS.filter(c=>cardDoctrines(c).length===2).length,3);
  for(const id of PATRONS)assert.equal(cardType(CARD_INDEX[id]),'patron');
  for(const c of CARDS)for(const d of cardDoctrines(c))assert.ok(DOCTRINES[d],`${c.id} → ${d}`);
});

test('doctrines only run in player (era) cities; engine runs are unchanged',()=>{
  const classic=seedTown(makeCity('Classic','river',7));
  assert.equal(doctrineState(classic).on,false);assert.deepEqual(doctrineState(classic).effects,{});
});

test('playing a card again levels it up (Lv3 = 2×) instead of adding a weaker copy',()=>{
  let c=rich(newCity(7));const id='master_craftsmen',v=CARD_INDEX[id].effects.industry;
  const base=modifiers(c).industry||0;c=play(c,id);const one=modifiers(c).industry-base;c=play(c,id);c=play(c,id);
  assert.equal(cardLevel(c,id),3);assert.ok(one>0&&v>0);
  assert.ok(Math.abs(modifiers(c).industry-base-2*one)<1e-9,'Lv3 is worth twice Lv1');
  const g=give(c,id);assert.match(playCard(g,deckOf(g).hand.at(-1).uid).error,/level 3/);
  assert.equal(doctrineState(c).counts.industry,1,'levels count once toward the doctrine');
});

test('merging three cards of one doctrine gives the next rarity of that doctrine',()=>{
  let c=rich(newCity(7));const commons=ofDoctrine('faith').filter(x=>x.rarity==='common');
  const three=[commons[0],commons[0],commons[0]];for(const x of three)c=give(c,x.id);
  const r=mergeCards(c,deckOf(c).hand.map(h=>h.uid));assert.equal(r.error,null,r.error);
  const made=CARD_INDEX[deckOf(r.city).hand[0].cardId];assert.equal(made.rarity,'uncommon');assert.ok(cardDoctrines(made).includes('faith'),made.id);
});

test('pacing (M4): each Age keeps its own pace; at 1× a run is about 25 minutes on the clock',()=>{
  assert.equal(NORMAL_SPEED,8);assert.deepEqual(SPEEDS.map(s=>s[0]),[4,8,16,36]);
  const m=runMinutes(NORMAL_SPEED);assert.ok(m>=22&&m<=28,`${m.toFixed(1)} min on the clock (M4: 30–45 with decisions)`);
  assert.ok(runMinutes(NORMAL_SPEED,.4)<m,'quiet decades shorten the run');
  const c=newCity(7);assert.ok(Math.abs(paceFactor(c,NORMAL_SPEED,true)-.25*.95)<1e-9);assert.equal(paceFactor(c,36,true),1,'MAX is never slowed');
});

// v1.9 R2: content, evolutions and the focus perk.
import {ERA_CARDS} from '../src/turningPoints.js';
import {DOCTRINE_ONLY_CARDS,HYBRID_CARDS} from '../src/doctrineCards.js';
import {WONDERS,wondersDue,FOCUS_DISCOUNT} from '../src/doctrines.js';
import {placeConstruction} from '../src/sim.js';
import {shopEligible} from '../src/cards.js';
import {buildNear} from './helpers/strategies.js';

test('the doctrine pool has 106 cards: the 54 classic ones, 18 building cards, 26 new, 8 urban works; classic games keep 54',()=>{
  assert.equal(ERA_CARDS.length,106);assert.equal(DOCTRINE_ONLY_CARDS.length,52);assert.equal(HYBRID_CARDS.length,7);
  assert.equal(new Set(ERA_CARDS.map(c=>c.id)).size,106,'ids are unique');
  for(const c of HYBRID_CARDS)assert.equal(cardDoctrines(c).length,2,`${c.id} counts for two doctrines`);
  const classic=seedTown(makeCity('Classic','river',7));
  assert.ok(DOCTRINE_ONLY_CARDS.every(c=>!shopEligible(c,classic)),'never sold in classic cities');
  assert.ok(DOCTRINE_ONLY_CARDS.some(c=>shopEligible(c,newCity(7))),'sold in doctrine cities');
  for(const d of DOCTRINE_IDS)assert.equal(ERA_CARDS.filter(c=>PATRONS.has(c.id)&&cardDoctrines(c).includes(d)).length,1,`one Patron for ${d}`);
});

test('focus perk: a doctrine with 2 cards in play sells its cards 20% cheaper',()=>{
  let c=rich(newCity(7));const faith=ofDoctrine('faith').filter(x=>cardType(x)!=='building'&&x.kind!=='instant');
  const before=cardPrice(faith[2],100,c);c=play(c,faith[0].id);c=play(c,faith[1].id);
  assert.equal(cardPrice(faith[2],100,c),Math.round(before*FOCUS_DISCOUNT));
});
