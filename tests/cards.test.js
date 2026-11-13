// v1.5 card economy: Market Hall, hand, play, stack, merge, sell, upkeep.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,advance,selectTurningPoint,stats,playCard,normalizeCity} from '../src/sim.js';
import {buyCard,buyPack,sellCard,mergeCards,mergeIssue,rerollShop,deckOf,handLimit,priceUnit,rarityWeights,collectionsFor,shopEligible,MAX_COPIES,RESTOCK_YEARS,SELL_SHARE,PACK_SIZE} from '../src/cards.js';
import {CARD_INDEX,CARDS,modifiers,currentTurningIndex,STACK_FACTORS,HAND_EXTRA,handTotal} from '../src/turningPoints.js';
import {annualExpenses} from '../src/economy.js';

const town=(seed=7,type='river')=>seedTown(makeCity('Cards',type,seed));
const rich=(c,funds=100000)=>({...c,funds});
const inHand=(c,cardId)=>({...c,deck:{...deckOf(c),hand:[...deckOf(c).hand,{uid:deckOf(c).nextUid,cardId,paid:100}],nextUid:deckOf(c).nextUid+1}});
const lastUid=c=>deckOf(c).hand.at(-1).uid;

// Every card instance (uid) is in exactly one zone: shop, hand or in play.
function assertZones(c){
  const d=deckOf(c),seen=new Map();
  const add=(uid,zone)=>{assert.ok(!seen.has(uid),`uid ${uid} is in ${seen.get(uid)} and ${zone}`);seen.set(uid,zone);};
  for(const o of d.shop?.offers||[])add(o.uid,'shop');
  for(const h of d.hand)add(h.uid,'hand');
  for(const p of c.turning.choices)if(p.via==='hand')add(p.uid,'play');
  for(const uid of seen.keys())assert.ok(uid<d.nextUid,'uids are issued below nextUid');
}

test('a new town opens the Market Hall with three priced offers and a pack',()=>{
  const c=town(),d=deckOf(c);
  assert.equal(d.shop.year,1300);assert.equal(d.shop.offers.length,3);
  assert.equal(new Set(d.shop.offers.map(o=>o.cardId)).size,3,'offers are distinct');
  for(const o of d.shop.offers){assert.ok(CARD_INDEX[o.cardId]);assert.ok(o.price>=1);}
  assert.ok(d.shop.packPrice>0);assert.equal(d.hand.length,0);assertZones(c);
});

test('the shop restocks every decade and prices follow the price unit and rarity',()=>{
  let c=advance(town(),RESTOCK_YEARS);if(c.turning.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);
  const d=deckOf(c);assert.equal(d.shop.year,1300+RESTOCK_YEARS);
  const unit=priceUnit(c,stats(c));
  for(const o of d.shop.offers){const mult={common:2,uncommon:4,rare:8,epic:16}[CARD_INDEX[o.cardId].rarity];assert.ok(Math.abs(o.price-mult*d.shop.unit)<=1);}
  assert.ok(unit>0);
});

test('same seed, same shop: offers are deterministic',()=>{
  assert.deepEqual(deckOf(town(11)).shop.offers,deckOf(town(11)).shop.offers);
});

test('buying moves a card from the shop to the hand and charges the treasury',()=>{
  const c=rich(town()),offer=deckOf(c).shop.offers[0];
  const r=buyCard(c,offer.uid);assert.equal(r.error,null);
  assert.equal(r.city.funds,c.funds-offer.price);
  assert.deepEqual(deckOf(r.city).hand.map(h=>h.uid),[offer.uid]);
  assert.ok(!deckOf(r.city).shop.offers.some(o=>o.uid===offer.uid));assertZones(r.city);
  assert.match(buyCard({...c,funds:0},offer.uid).error,/costs/);
  assert.match(buyCard(r.city,offer.uid).error,/no longer for sale/);
});

test('the hand has a limit that grows with the Town Center',()=>{
  let c=rich(town());
  for(let i=0;i<5;i++)c=inHand(c,'new_settlers');
  assert.equal(handLimit(c),5);
  assert.match(buyCard(c,deckOf(c).shop.offers[0].uid).error,/hand is full/);
  assert.equal(handLimit({...c,center:{level:3}}),6);assert.equal(handLimit({...c,center:{level:5}}),7);
});

test('a pack adds two cards, the first uncommon or better, once per restock',()=>{
  const c=rich(town()),r=buyPack(c);assert.equal(r.error,null);
  assert.equal(r.cards.length,PACK_SIZE);assert.notEqual(CARD_INDEX[r.cards[0].cardId].rarity,'common');
  assert.equal(r.city.funds,c.funds-deckOf(c).shop.packPrice);
  assert.match(buyPack(r.city).error,/next restock/);assertZones(r.city);
});

test('rerolling replaces the offers for a rising fee and keeps the decade',()=>{
  const c=rich(town()),r=rerollShop(c,stats(c));assert.equal(r.error,null);
  const before=deckOf(c).shop,after=deckOf(r.city).shop;
  assert.equal(after.year,before.year);assert.equal(after.rerolls,1);
  assert.notDeepEqual(after.offers.map(o=>o.uid),before.offers.map(o=>o.uid));
  const r2=rerollShop(r.city,stats(r.city));
  assert.ok(c.funds-r.city.funds<r.city.funds-r2.city.funds,'each reroll costs more');assertZones(r2.city);
});

test('selling refunds half of what was paid',()=>{
  const c=inHand(rich(town()),'fertile_families'),uid=lastUid(c);
  const r=sellCard(c,uid);assert.equal(r.error,null);
  assert.equal(r.city.funds,c.funds+Math.round(100*SELL_SHARE));assert.equal(deckOf(r.city).hand.length,0);
});

test('merging three cards of one rarity makes one card of the next rarity',()=>{
  let c=rich(town());const commons=CARDS.filter(x=>x.rarity==='common'&&shopEligible(x,c)).slice(0,3);
  for(const x of commons)c=inHand(c,x.id);
  const uids=deckOf(c).hand.map(h=>h.uid),r=mergeCards(c,uids);assert.equal(r.error,null);
  const hand=deckOf(r.city).hand;assert.equal(hand.length,1);assert.equal(CARD_INDEX[hand[0].cardId].rarity,'uncommon');
  assertZones(r.city);
  let mixed=inHand(inHand(inHand(rich(town()),commons[0].id),commons[1].id),'land_opportunity');
  assert.match(mergeIssue(mixed,deckOf(mixed).hand.map(h=>h.uid)),/share one rarity/);
});

test('playing a card applies it like a Turning Point without using one up',()=>{
  const c=inHand(rich(town()),'trading_empire'),uid=lastUid(c);
  const r=playCard(c,uid);assert.equal(r.error,null);
  assert.equal(deckOf(r.city).hand.length,0);
  const pick=r.city.turning.choices.at(-1);assert.equal(pick.via,'hand');assert.equal(pick.uid,uid);
  assert.ok(Math.abs(modifiers(r.city).trade-CARD_INDEX.trading_empire.effects.trade)<1e-9);
  assert.equal(currentTurningIndex(r.city),currentTurningIndex(c),'Turning Point count unchanged');assertZones(r.city);
});

test('building cards played from the hand award a project to place',()=>{
  const c=inHand(rich(town()),'hire_artists'),r=playCard(c,lastUid(c));
  assert.equal(r.error,null);assert.equal(r.city.projects.length,c.projects.length+1);
  assert.equal(modifiers(r.city).arts||0,0,'inactive until placed');
});

test('copies stack with diminishing strength, up to three',()=>{
  let c=rich(town());
  for(let i=0;i<MAX_COPIES;i++){c=inHand(c,'master_craftsmen');c=playCard(c,lastUid(c)).city;}
  const v=CARD_INDEX.master_craftsmen.effects.industry;
  const expected=handTotal([v*STACK_FACTORS[0],v*STACK_FACTORS[1],v*STACK_FACTORS[2]]);
  assert.ok(Math.abs(modifiers(c).industry-expected)<1e-9);
  c=inHand(c,'master_craftsmen');assert.match(playCard(c,lastUid(c)).error,/stacked/);
});

test('for one effect, extra hand cards beyond the strongest count at a reduced rate',()=>{
  assert.equal(handTotal([.3]),.3);
  assert.ok(Math.abs(handTotal([.2,.4])-(.4+.2*HAND_EXTRA))<1e-9);
  assert.ok(Math.abs(handTotal([.3,-.1])-.2)<1e-9,'drawbacks count fully');
});

test('timed cards from the hand expire by year',()=>{
  const c=inHand(rich(town()),'economic_miracle'),r=playCard(c,lastUid(c));
  const pick=r.city.turning.choices.at(-1);assert.ok(pick.until>r.city.year);
  assert.ok(modifiers(r.city).gdp>0);
  assert.equal(modifiers({...r.city,year:pick.until+1}).gdp||0,0);
});

test('cards in play cost upkeep every year',()=>{
  const c=rich(town()),s=stats(c);
  const played=playCard(inHand(c,'trading_empire'),lastUid(inHand(c,'trading_empire'))).city;
  assert.equal(annualExpenses(c,s).cards,0);assert.ok(annualExpenses(played,stats(played)).cards>0);
});

test('collections show progress toward each set a card belongs to',()=>{
  let c=inHand(rich(town()),'hire_artists');
  const sets=collectionsFor(c,'grand_workshops');const ren=sets.find(s=>s.id==='renaissance');
  assert.ok(ren);assert.equal(ren.have,1);assert.equal(ren.size,3);assert.equal(ren.complete,false);
});

test('rarity odds shift toward rare cards over the centuries',()=>{
  const a=rarityWeights(1300),b=rarityWeights(2030);
  assert.ok(b.rare>a.rare&&b.epic>a.epic&&b.common<a.common);
});

test('deck and hand-played cards survive save and load; old saves get an empty hand',()=>{
  let c=inHand(rich(town()),'fertile_families');c=playCard(inHand(c,'trading_empire'),lastUid(inHand(c,'trading_empire'))).city;
  const back=normalizeCity(JSON.parse(JSON.stringify(c)));
  assert.deepEqual(deckOf(back).hand,deckOf(c).hand);
  assert.deepEqual(back.turning.choices.filter(p=>p.via==='hand'),c.turning.choices.filter(p=>p.via==='hand'));
  assert.deepEqual(deckOf(back).shop.offers,deckOf(c).shop.offers);assertZones(back);
  const {deck:_d,...old}=JSON.parse(JSON.stringify(town()));
  const migrated=normalizeCity(old);assert.equal(deckOf(migrated).hand.length,0);
});

test('a campaign that buys and plays cards keeps 20 Turning Points and valid zones',()=>{
  let c=town(3),played=0;
  while(c.year<1700){
    c=advance(c,10);if(c.turning.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);
    const o=[...deckOf(c).shop?.offers||[]].sort((a,b)=>a.price-b.price)[0];
    if(o){const b=buyCard(c,o.uid);if(!b.error){c=b.city;const p=playCard(c,o.uid);if(!p.error){c=p.city;played++;}}}
    assertZones(c);
  }
  assert.ok(played>5,`played ${played} cards`);
  assert.equal(c.turning.choices.filter(p=>p.via!=='hand').length,currentTurningIndex(c));
  assert.ok(currentTurningIndex(c)<=20);
});
