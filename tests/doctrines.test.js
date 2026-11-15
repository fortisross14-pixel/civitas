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

test('tiers come from counting a doctrine\'s cards in play (2/4/6/8)',()=>{
  assert.deepEqual([0,1,2,3,4,5,6,7,8,9].map(tierOf),[0,0,1,1,2,2,3,3,4,4]);
  let c=rich(newCity(7));const faith=ofDoctrine('faith','decree').slice(0,2);
  for(const card of faith)c=play(c,card.id);
  assert.equal(doctrineState(c).counts.faith,2);assert.equal(doctrineState(c).tiers.faith,1);
  assert.equal(doctrineFlags(c).faithReach,.3,'tier 2 bonus active');
});

test('playing a card again levels it up (Lv3 = 2×) instead of adding a weaker copy',()=>{
  let c=rich(newCity(7));const id='master_craftsmen',v=CARD_INDEX[id].effects.industry;
  const base=modifiers(c).industry||0;c=play(c,id);const one=modifiers(c).industry-base;c=play(c,id);c=play(c,id);
  assert.equal(cardLevel(c,id),3);assert.ok(one>0&&v>0);
  assert.ok(Math.abs(modifiers(c).industry-base-2*one)<1e-9,'Lv3 is worth twice Lv1');
  const g=give(c,id);assert.match(playCard(g,deckOf(g).hand.at(-1).uid).error,/level 3/);
  assert.equal(doctrineState(c).counts.industry,1,'levels count once toward the doctrine');
});

test('Decrees take slots; retiring one frees it',()=>{
  let c=rich(newCity(7));const decrees=CARDS.filter(x=>cardType(x)==='decree'&&!x.minYear&&!x.requiresAny).slice(0,decreeSlots(c)+1);
  for(const d of decrees.slice(0,decreeSlots(c)))c=play(c,d.id);
  assert.equal(decreesInPlay(c).length,8);
  const g=give(c,decrees.at(-1).id);assert.match(playCard(g,deckOf(g).hand.at(-1).uid).error,/slots are full/);
  const r=retireCard(c,decrees[0].id);assert.equal(r.error,null);
  assert.equal(decreesInPlay(r.city).length,7);assert.equal(cardLevel(r.city,decrees[0].id),0);
  const after=play(r.city,decrees.at(-1).id);assert.equal(decreesInPlay(after).length,8);
  const back=normalizeCity(JSON.parse(JSON.stringify(r.city)));assert.equal(decreesInPlay(back).length,7,'retirement is saved');
});

test('merging three cards of one doctrine gives the next rarity of that doctrine',()=>{
  let c=rich(newCity(7));const commons=ofDoctrine('faith').filter(x=>x.rarity==='common');
  const three=[commons[0],commons[0],commons[0]];for(const x of three)c=give(c,x.id);
  const r=mergeCards(c,deckOf(c).hand.map(h=>h.uid));assert.equal(r.error,null,r.error);
  const made=CARD_INDEX[deckOf(r.city).hand[0].cardId];assert.equal(made.rarity,'uncommon');assert.ok(cardDoctrines(made).includes('faith'),made.id);
});

test('banish removes an offer for the rest of the run; Trade 4 can lock an offer through a restock',()=>{
  let c=rich(newCity(7));const first=deckOf(c).shop.offers[0];
  const b=banishOffer(c,first.uid);assert.equal(b.error,null);assert.ok(deckOf(b.city).banished.includes(first.cardId));
  let d=b.city;for(let i=0;i<20;i++){d=restockShop({...d,year:d.year+10},stats(d));assert.ok(!deckOf(d).shop.offers.some(o=>o.cardId===first.cardId));}
  for(let i=1;i<BANISHES_PER_RUN;i++){d=banishOffer(d,deckOf(d).shop.offers[0].uid).city;}
  assert.match(banishOffer(d,deckOf(d).shop.offers[0].uid).error,/all 3/);
  assert.match(lockOffer(c,first.uid).error,/Trade tier 4/);
  let t=rich(newCity(7));for(const x of ofDoctrine('trade').filter(x=>cardType(x)!=='building'&&x.kind!=='instant').slice(0,4))t=play(t,x.id);
  assert.ok(doctrineState(t).tiers.trade>=2,'Trade 4');
  const keep=deckOf(t).shop.offers[0];t=lockOffer(t,keep.uid).city;
  const restocked=restockShop({...t,year:t.year+10},stats(t));
  assert.ok(deckOf(restocked).shop.offers.some(o=>o.uid===keep.uid),'the locked offer survives the restock');
  assert.equal(deckOf(restocked).shop.offers.length,4,'Trade 4 adds an offer');
  assert.ok(cardPrice(CARD_INDEX[keep.cardId],100,t)<cardPrice(CARD_INDEX[keep.cardId],100,null),'Trade 2 discount');
});

test('rule-benders: Learning foresight, cheaper history and four-card drafts; Faith churches serve as markets',()=>{
  // Learning has only three Decrees open in 1300 (a content gap for R2), so this uses the hybrid and later cards.
  let l=rich(newCity(11));for(const x of ERA_CARDS.filter(x=>cardDoctrines(x).includes('learning')&&cardType(x)!=='building'&&x.kind!=='instant'&&!PATRONS.has(x.id)).slice(0,6))l=play(l,x.id);
  assert.ok(doctrineState(l).tiers.learning>=3);assert.equal(doctrineFlags(l).omenLead,10);assert.equal(doctrineFlags(l).draftOptions,4);assert.equal(doctrineFlags(l).eventFundsMult,.5,'tier 2: history costs half');
  while(!l.turning.pending&&l.year<1510)l=advance(l,10);
  assert.equal(l.turning.pending.options.length,4,'era draft offers four');
  let f=rich(newCity(7));while(f.year<1400){f=advance(f,10);if(f.turning.pending)f=selectTurningPoint(f,f.turning.pending.options[0]);}
  const before=assessNeeds(f,cityFields(f)).filter(n=>n.kind==='market').length;
  for(const x of ofDoctrine('faith').filter(x=>cardType(x)!=='building'&&x.kind!=='instant').slice(0,4))f=play(f,x.id);
  assert.ok(doctrineFlags(f).churchMarket);
  const after=assessNeeds(f,cityFields(f)).filter(n=>n.kind==='market').length;
  assert.ok(after<=before,`market needs ${before} → ${after}`);
});

test('tier-8 payoffs feed the score; doctrine effects reach the city',()=>{
  let c=rich(newCity(7));for(const x of ofDoctrine('people').filter(x=>cardType(x)!=='building'&&x.kind!=='instant').slice(0,8))c=play(c,x.id);
  const st=doctrineState(c);assert.ok(st.counts.people>=6,`people ${st.counts.people}`);
  // v1.9: tier power lifts prosperity; People's crowding takes one point per tier back.
  assert.equal(st.effects.prosperity,TIER_POWER[st.tiers.people]*DOCTRINE_POWER.people-st.tiers.people,'tier power minus crowding');
  const bonus=scoreBonus({...c},{population:150000,prosperity:70,jobs:0});if(st.tiers.people>=4)assert.ok(bonus.mult>1);
});

test('pacing: Normal speed is a year every 1.5 s, so a run takes about 18 minutes',()=>{
  assert.equal(NORMAL_SPEED,8);assert.deepEqual(SPEEDS.map(s=>s[0]),[4,8,16,36]);
  const m=runMinutes(NORMAL_SPEED);assert.ok(m>=15&&m<=22,`${m.toFixed(1)} min`);
  assert.ok(runMinutes(NORMAL_SPEED,.4)<m,'quiet decades shorten the run');
  const c=newCity(7);assert.equal(paceFactor(c,NORMAL_SPEED,true),.25);assert.equal(paceFactor(c,36,true),1,'MAX is never slowed');
});

// v1.9 R2: content, evolutions and the focus perk.
import {ERA_CARDS} from '../src/turningPoints.js';
import {DOCTRINE_ONLY_CARDS,HYBRID_CARDS} from '../src/doctrineCards.js';
import {WONDERS,wondersDue,FOCUS_DISCOUNT} from '../src/doctrines.js';
import {placeConstruction} from '../src/sim.js';
import {shopEligible} from '../src/cards.js';
import {buildNear} from './helpers/strategies.js';

test('the doctrine pool has 98 cards: the 54 classic ones, 18 building cards (one per landmark), 26 new; classic games keep 54',()=>{
  assert.equal(ERA_CARDS.length,98);assert.equal(DOCTRINE_ONLY_CARDS.length,44);assert.equal(HYBRID_CARDS.length,7);
  assert.equal(new Set(ERA_CARDS.map(c=>c.id)).size,98,'ids are unique');
  for(const c of HYBRID_CARDS)assert.equal(cardDoctrines(c).length,2,`${c.id} counts for two doctrines`);
  const classic=seedTown(makeCity('Classic','river',7));
  assert.ok(DOCTRINE_ONLY_CARDS.every(c=>!shopEligible(c,classic)),'never sold in classic cities');
  assert.ok(DOCTRINE_ONLY_CARDS.some(c=>shopEligible(c,newCity(7))),'sold in doctrine cities');
  for(const d of DOCTRINE_IDS)assert.equal(ERA_CARDS.filter(c=>PATRONS.has(c.id)&&cardDoctrines(c).includes(d)).length,1,`one Patron for ${d}`);
});

test('a Lv3 card plus its Patron evolves into a Wonder to place on the map',()=>{
  const w=WONDERS.find(x=>x.id==='cathedral');let c=rich(newCity(7));
  for(let i=0;i<3;i++){c=play(c,w.card);const p=c.projects.at(-1);c=buildNear(c,p.id,cityOrigin(c).x,cityOrigin(c).y,14);assert.ok(c,'chapel placed');}
  assert.equal(cardLevel(c,w.card),3);assert.equal(wondersDue(c).length,0,'needs its Patron too');
  c=play(c,w.patron);
  assert.ok((c.wonders||[]).includes('cathedral'),'awarded');const proj=c.projects.find(p=>p.kind==='cathedral');assert.ok(proj,'a project to place');
  const placed=buildNear(c,proj.id,cityOrigin(c).x,cityOrigin(c).y,16);assert.ok(placed,'the cathedral stands');
  assert.ok(placed.buildings.some(b=>b.special==='cathedral'));
  assert.ok(cityEffects(placed).faith>cityEffects(c).faith,'and it works');
  assert.equal(wondersDue(placed).length,0,'awarded once');
});

test('focus perk: a doctrine with 2 cards in play sells its cards 20% cheaper',()=>{
  let c=rich(newCity(7));const faith=ofDoctrine('faith').filter(x=>cardType(x)!=='building'&&x.kind!=='instant');
  const before=cardPrice(faith[2],100,c);c=play(c,faith[0].id);c=play(c,faith[1].id);
  assert.equal(cardPrice(faith[2],100,c),Math.round(before*FOCUS_DISCOUNT));
});
