// CIVITAS v1.5 — the card economy.
// The treasury buys history cards in the Market Hall, which restocks every
// decade. The player holds a small hand and plays cards when it matters.
// Playing a card records it as a choice with `via:'hand'`, so the existing
// modifier, synergy and landmark-placement code applies it unchanged.
// Everything here is pure: each action returns {city, error}.
import {CARDS,CARD_INDEX,SYNERGIES} from './turningPoints.js';
import {eraCost,annualRevenue} from './economy.js';
import {DOMAIN_AXIS} from './character.js';

export const RARITIES=['common','uncommon','rare','epic'];
export const RARITY_LABEL={common:'Common',uncommon:'Uncommon',rare:'Rare',epic:'Epic'};
// Price in "units" (see priceUnit). Upkeep is a share of annual revenue per card in play.
export const RARITY_PRICE={common:2,uncommon:4,rare:8,epic:16};
export const RARITY_UPKEEP={common:.004,uncommon:.007,rare:.012,epic:.02};
export const SHOP_SIZE=3,PACK_SIZE=2,PACK_PRICE=2.5,MAX_COPIES=3,RESTOCK_YEARS=10;
export const SELL_SHARE=.5,REROLL_PRICE=.5,MERGE_COUNT=3;
// Temporary cards bought in the shop last this many years per Turning Point interval.
export const YEARS_PER_INTERVAL=20;

const hash=(...a)=>{let h=2166136261;for(const v of a){for(const ch of String(v)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}}return h>>>0;};
const rng=(n)=>()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};

export function emptyDeck(){return {hand:[],shop:null,nextUid:1,bought:0,sold:0,merged:0,played:0,spent:0};}
export function deckOf(city){
  const d=city?.deck;
  if(!d||!Array.isArray(d.hand))return emptyDeck();
  return d;
}
export function normalizeDeck(input){
  const d=input&&typeof input==='object'?input:{};
  const okCard=c=>c&&Number.isInteger(c.uid)&&CARD_INDEX[c.cardId];
  const hand=(Array.isArray(d.hand)?d.hand:[]).filter(okCard).map(c=>({uid:c.uid,cardId:c.cardId,paid:Math.max(0,Number(c.paid)||0)}));
  let shop=null;
  if(d.shop&&Number.isFinite(d.shop.year)&&Array.isArray(d.shop.offers)){
    shop={year:d.shop.year,offers:d.shop.offers.filter(okCard).map(o=>({uid:o.uid,cardId:o.cardId,price:Math.max(1,Math.round(Number(o.price)||1))})),
      packPrice:Math.max(1,Math.round(Number(d.shop.packPrice)||1)),packBought:!!d.shop.packBought,rerolls:Math.max(0,Math.floor(Number(d.shop.rerolls)||0)),unit:Math.max(1,Number(d.shop.unit)||1)};
  }
  const maxUid=Math.max(0,...hand.map(c=>c.uid),...(shop?.offers||[]).map(o=>o.uid));
  const num=k=>Math.max(0,Math.floor(Number(d[k])||0));
  return {hand,shop,nextUid:Math.max(maxUid+1,Math.floor(Number(d.nextUid)||1)),bought:num('bought'),sold:num('sold'),merged:num('merged'),played:num('played'),spent:num('spent')};
}

// Hand size grows with the Town Center: 5, 6 at level 3, 7 at level 5.
export function handLimit(city){const lvl=city?.center?.level||1;return 5+(lvl>=3?1:0)+(lvl>=5?1:0);}

// One price unit: a share of the city's income, never below an era floor.
export function priceUnit(city,s){
  const floor=40*eraCost(city.year);
  if(!s)return floor;
  return Math.max(floor,5*annualRevenue(city,s).total);
}
export const cardPrice=(card,unit)=>Math.max(1,Math.round(RARITY_PRICE[card.rarity]*unit));

// Rarity odds drift from 60/28/10/2 in 1300 to 40/32/20/8 by 2030.
export function rarityWeights(year){
  const t=Math.min(1,Math.max(0,(year-1300)/730));
  return {common:60-20*t,uncommon:28+4*t,rare:10+10*t,epic:2+6*t};
}

// Copies of a card the city holds or has played from the hand.
export function copiesOf(city,cardId){
  const inPlay=(city.turning?.choices||[]).filter(p=>p.cardId===cardId).length;
  return inPlay+deckOf(city).hand.filter(c=>c.cardId===cardId).length;
}
export function playedCopies(city,cardId){return (city.turning?.choices||[]).filter(p=>p.cardId===cardId&&p.via==='hand').length;}

// Cards the shop may offer now. Figures stay in Turning Points.
export function shopEligible(card,city){
  if(!card||card.kind==='figure')return false;
  if(city.year<(card.minYear??-Infinity)||city.year>(card.maxYear??Infinity))return false;
  if(Array.isArray(city.turning?.cardPool)&&!city.turning.cardPool.includes(card.id))return false;
  if(card.geographies&&!card.geographies.includes(city.type))return false;
  if(copiesOf(city,card.id)>=MAX_COPIES)return false;
  if(card.requiresAny){
    const owned=new Set([...(city.turning?.choices||[]).map(p=>p.cardId),...deckOf(city).hand.map(c=>c.cardId)]);
    if(!card.requiresAny.some(id=>owned.has(id)))return false;
  }
  return true;
}

function drawCard(city,roll,{minRarity='common',exclude=new Set()}={}){
  const w=rarityWeights(city.year),min=RARITIES.indexOf(minRarity);
  const pool=CARDS.filter(c=>shopEligible(c,city)&&!exclude.has(c.id)&&RARITIES.indexOf(c.rarity)>=min);
  if(!pool.length)return null;
  // Pick a rarity first (only among rarities present), then a card within it,
  // favouring the city's character and cards that advance a collection.
  const present=RARITIES.filter(r=>pool.some(c=>c.rarity===r));
  let total=present.reduce((n,r)=>n+w[r],0),t=roll()*total,rarity=present.at(-1);
  for(const r of present){t-=w[r];if(t<=0){rarity=r;break;}}
  const items=pool.filter(c=>c.rarity===rarity),owned=new Set((city.turning?.choices||[]).map(p=>p.cardId));
  const weight=c=>1+(SYNERGIES.some(s=>s.needs.includes(c.id)&&s.needs.some(id=>id!==c.id&&owned.has(id)))?1.5:0)+1.5*(city.character?.shares?.[DOMAIN_AXIS[c.domain]]||0);
  total=items.reduce((n,c)=>n+weight(c),0);t=roll()*total;
  for(const c of items){t-=weight(c);if(t<=0)return c;}
  return items.at(-1);
}

// Restock the Market Hall. Called at founding and every RESTOCK_YEARS.
export function restockShop(city,s,salt=0){
  const deck={...deckOf(city)},roll=rng(hash(city.seed,city.year,'shop',salt,deck.nextUid));
  const unit=priceUnit(city,s),offers=[],exclude=new Set();
  for(let i=0;i<SHOP_SIZE;i++){
    const c=drawCard({...city,deck},roll,{exclude});if(!c)break;
    exclude.add(c.id);offers.push({uid:deck.nextUid++,cardId:c.id,price:cardPrice(c,unit)});
  }
  deck.shop={year:city.year,offers,packPrice:Math.round(PACK_PRICE*unit),packBought:false,rerolls:salt?deck.shop?.rerolls||0:0,unit};
  return {...city,deck};
}
export function shopDue(city){const shop=deckOf(city).shop;return !shop||city.year-shop.year>=RESTOCK_YEARS;}
export function rerollPrice(city){const shop=deckOf(city).shop;if(!shop)return 0;return Math.round(REROLL_PRICE*shop.unit*(1+.5*shop.rerolls));}

const fail=(city,error)=>({city,error});
const spend=(city,amount)=>({...city,funds:(city.funds||0)-amount});
const log=(city,text,extra={})=>({...city,events:[...(city.events||[]),{year:city.year,type:'deck',text,...extra}]});
const blocked=city=>city.finished?'The chronicle is complete.':city.awaitingCenter?'Found the town first.':null;

export function buyCard(city,uid){
  const b=blocked(city);if(b)return fail(city,b);
  const deck=deckOf(city),offer=deck.shop?.offers.find(o=>o.uid===uid);
  if(!offer)return fail(city,'That card is no longer for sale.');
  if(deck.hand.length>=handLimit(city))return fail(city,`Your hand is full (${handLimit(city)}). Play, merge or sell a card first.`);
  if((city.funds||0)<offer.price)return fail(city,`${CARD_INDEX[offer.cardId].name} costs ${offer.price}; the treasury holds ${Math.floor(city.funds||0)}.`);
  const next={...deck,hand:[...deck.hand,{uid:offer.uid,cardId:offer.cardId,paid:offer.price}],shop:{...deck.shop,offers:deck.shop.offers.filter(o=>o.uid!==uid)},bought:deck.bought+1,spent:deck.spent+offer.price};
  return {city:log(spend({...city,deck:next},offer.price),`Bought ${CARD_INDEX[offer.cardId].name} at the Market Hall.`,{cardId:offer.cardId}),error:null};
}

export function buyPack(city){
  const b=blocked(city);if(b)return fail(city,b);
  const deck=deckOf(city),shop=deck.shop;
  if(!shop||shop.packBought)return fail(city,'No sealed pack until the next restock.');
  if(deck.hand.length+PACK_SIZE>handLimit(city))return fail(city,`A pack holds ${PACK_SIZE} cards; make room in your hand first.`);
  if((city.funds||0)<shop.packPrice)return fail(city,`The pack costs ${shop.packPrice}; the treasury holds ${Math.floor(city.funds||0)}.`);
  const roll=rng(hash(city.seed,city.year,'pack',deck.nextUid));
  const hand=[...deck.hand],got=[],exclude=new Set();let uid=deck.nextUid;
  for(let i=0;i<PACK_SIZE;i++){
    // The first card of every pack is uncommon or better.
    const c=drawCard({...city,deck:{...deck,hand}},roll,{minRarity:i===0?'uncommon':'common',exclude})||drawCard({...city,deck:{...deck,hand}},roll,{exclude});
    if(!c)break;exclude.add(c.id);
    const card={uid:uid++,cardId:c.id,paid:Math.round(shop.packPrice/PACK_SIZE)};hand.push(card);got.push(card);
  }
  if(!got.length)return fail(city,'The pack was empty: no cards are available in this era.');
  const next={...deck,hand,nextUid:uid,shop:{...shop,packBought:true},bought:deck.bought+got.length,spent:deck.spent+shop.packPrice};
  return {city:log(spend({...city,deck:next},shop.packPrice),`Opened a sealed pack: ${got.map(c=>CARD_INDEX[c.cardId].name).join(' and ')}.`),error:null,cards:got};
}

export function rerollShop(city,s){
  const b=blocked(city);if(b)return fail(city,b);
  const deck=deckOf(city);if(!deck.shop)return fail(city,'The Market Hall has not opened yet.');
  const price=rerollPrice(city);
  if((city.funds||0)<price)return fail(city,`A new selection costs ${price}.`);
  const rerolls=deck.shop.rerolls+1;
  const withCount={...city,deck:{...deck,shop:{...deck.shop,rerolls}}};
  const restocked=restockShop(withCount,s,rerolls);
  // Keep this decade's pack state and price unit; only the offers change.
  const shop={...restocked.deck.shop,packBought:deck.shop.packBought,packPrice:deck.shop.packPrice,rerolls,year:deck.shop.year};
  return {city:spend({...restocked,deck:{...restocked.deck,shop}},price),error:null};
}

export function sellCard(city,uid){
  const b=blocked(city);if(b)return fail(city,b);
  const deck=deckOf(city),card=deck.hand.find(c=>c.uid===uid);
  if(!card)return fail(city,'That card is not in your hand.');
  const refund=Math.round(card.paid*SELL_SHARE);
  const next={...deck,hand:deck.hand.filter(c=>c.uid!==uid),sold:deck.sold+1};
  return {city:log({...city,funds:(city.funds||0)+refund,deck:next},`Sold ${CARD_INDEX[card.cardId].name} for ${refund}.`),error:null,refund};
}

// Three cards of one rarity become one card of the next rarity, drawn from the
// domain most of them share. Epic cards cannot be merged.
export function mergeIssue(city,uids){
  const hand=deckOf(city).hand,cards=uids.map(u=>hand.find(c=>c.uid===u));
  if(new Set(uids).size!==MERGE_COUNT||cards.some(c=>!c))return `Choose ${MERGE_COUNT} different cards from your hand.`;
  const rarities=new Set(cards.map(c=>CARD_INDEX[c.cardId].rarity));
  if(rarities.size!==1)return 'Merged cards must share one rarity.';
  const r=[...rarities][0];if(r==='epic')return 'Epic cards are already the rarest.';
  return null;
}
export function mergeCards(city,uids){
  const b=blocked(city)||mergeIssue(city,uids);if(b)return fail(city,b);
  const deck=deckOf(city),cards=uids.map(u=>deck.hand.find(c=>c.uid===u)),defs=cards.map(c=>CARD_INDEX[c.cardId]);
  const target=RARITIES[RARITIES.indexOf(defs[0].rarity)+1];
  const count={};for(const d of defs)count[d.domain]=(count[d.domain]||0)+1;
  const domain=Object.keys(count).sort((a,b)=>count[b]-count[a]||a.localeCompare(b))[0];
  const remaining={...city,deck:{...deck,hand:deck.hand.filter(c=>!uids.includes(c.uid))}};
  const pool=CARDS.filter(c=>c.rarity===target&&shopEligible(c,remaining));
  const preferred=pool.filter(c=>c.domain===domain),options=preferred.length?preferred:pool;
  if(!options.length)return fail(city,`No ${target} card is available in this era yet.`);
  const roll=rng(hash(city.seed,city.year,'merge',uids.join(',')));
  const pick=options[Math.floor(roll()*options.length)];
  const made={uid:deck.nextUid,cardId:pick.id,paid:cards.reduce((n,c)=>n+c.paid,0)};
  const next={...remaining.deck,hand:[...remaining.deck.hand,made],nextUid:deck.nextUid+1,merged:deck.merged+1};
  return {city:log({...city,deck:next},`Merged ${defs.map(d=>d.name).join(', ')} into ${pick.name} (${RARITY_LABEL[target]}).`,{cardId:pick.id}),error:null,card:made};
}

// Annual upkeep of cards played from the hand: a share of revenue per card.
export function cardUpkeepShare(city){
  let share=0;
  for(const p of city?.turning?.choices||[]){
    if(p.via!=='hand')continue;
    if(Number.isFinite(p.until)&&city.year>p.until)continue;
    const c=CARD_INDEX[p.cardId];if(!c||c.kind==='instant')continue;
    share+=RARITY_UPKEEP[c.rarity]||0;
  }
  return share;
}

// Collection progress for a card: which synergies it belongs to, and how many
// of each set's cards the city already holds (in play or in hand).
export function collectionsFor(city,cardId){
  const have=new Set([...(city.turning?.choices||[]).map(p=>p.cardId),...deckOf(city).hand.map(c=>c.cardId)]);
  return SYNERGIES.filter(s=>s.needs.includes(cardId)).map(s=>({id:s.id,name:s.name,description:s.description,size:s.needs.length,have:s.needs.filter(id=>have.has(id)).length,complete:s.needs.every(id=>(city.turning?.choices||[]).some(p=>p.cardId===id))}));
}
