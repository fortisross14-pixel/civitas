// CIVITAS v1.5 — the hand of history cards and the Market Hall.
import React,{useMemo,useState} from 'react';
import {Store,X,Layers,Coins,RefreshCw,Package,Play,Tag,Combine,Check} from 'lucide-react';
import {CARD_INDEX,DOMAINS,RARITY_COLORS,STACK_FACTORS} from './turningPoints.js';
import {deckOf,handLimit,collectionsFor,rerollPrice,rarityWeights,RARITY_LABEL,RARITIES,mergeIssue,MERGE_COUNT,SELL_SHARE,RESTOCK_YEARS,PACK_SIZE,MAX_COPIES,playedCopies,RARITY_UPKEEP} from './cards.js';
import './cards.css';

const compact=n=>Number(n).toLocaleString('en-US');
const KIND_LABEL={instant:'Instant',permanent:'Permanent',scaling:'Scaling',synergy:'Combo',landmark:'Building',temporary:'Timed'};
export function cardKind(card){return card.building?'Building':KIND_LABEL[card.kind]||'Card';}

// One card face. `size` is 'hand' (compact) or 'shop' (full text).
export function CardFace({city,cardId,size='hand',selected=false,dim=false,onClick,footer,badge}){
  const card=CARD_INDEX[cardId];if(!card)return null;
  const domain=DOMAINS[card.domain]||DOMAINS.wildcard,stack=playedCopies(city,cardId);
  const sets=size==='shop'?collectionsFor(city,cardId):[];
  return <div role={onClick?'button':undefined} tabIndex={onClick?0:undefined} onClick={onClick} onKeyDown={e=>{if(onClick&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onClick();}}}
    className={`hcard ${size} rarity-${card.rarity} ${selected?'selected':''} ${dim?'dim':''}`} style={{'--rarity':RARITY_COLORS[card.rarity],'--domain':domain.color}} aria-pressed={onClick?selected:undefined} aria-label={`${card.name}, ${RARITY_LABEL[card.rarity]} ${domain.name} card`}>
    <div className="hcardTop"><span className="hcardDomain">{domain.symbol}</span><span className="hcardRarity">{RARITY_LABEL[card.rarity]}</span></div>
    <b className="hcardName">{card.name}</b>
    {size==='shop'&&<p className="hcardText">{card.description}</p>}
    <div className="hcardMeta"><span>{cardKind(card)}</span>{stack>0&&<span className="hcardStack" title={`Already in play ${stack}×. The next copy counts at ${Math.round((STACK_FACTORS[stack]??0)*100)}%.`}>×{stack}</span>}{badge}</div>
    {sets.length>0&&<div className="hcardSets">{sets.map(s=><span key={s.id} className={s.complete?'done':''} title={s.description}>{s.name} {s.have}/{s.size}</span>)}</div>}
    {footer}
  </div>;
}

// The hand: a row of cards under the map, with the Market Hall door.
export function HandTray({city,disabled,onPlay,onSell,onMerge,onOpenShop,shopFresh}){
  const deck=deckOf(city),limit=handLimit(city);
  const [sel,setSel]=useState(null),[merging,setMerging]=useState([]);
  const selected=deck.hand.find(c=>c.uid===sel);
  const card=selected&&CARD_INDEX[selected.cardId];
  const mergeMode=merging.length>0;
  const toggleMerge=uid=>setMerging(m=>m.includes(uid)?m.filter(u=>u!==uid):m.length>=MERGE_COUNT?m:[...m,uid]);
  const issue=mergeMode&&merging.length===MERGE_COUNT?mergeIssue(city,merging):null;
  const stack=card?playedCopies(city,card.id):0;
  return <section className="handTray" aria-label="Your hand of cards">
    <button className={`shopDoor ${shopFresh?'fresh':''}`} onClick={onOpenShop} disabled={disabled} aria-label="Open the Market Hall"><Store size={20}/><span>Market</span>{shopFresh&&<b className="railBadge"/>}</button>
    <div className="handCards">
      {deck.hand.length===0&&<p className="handEmpty">Your hand is empty. Buy history cards in the Market Hall, then play them when the moment is right.</p>}
      {deck.hand.map(h=><CardFace key={h.uid} city={city} cardId={h.cardId} selected={mergeMode?merging.includes(h.uid):sel===h.uid}
        onClick={()=>{if(mergeMode)toggleMerge(h.uid);else setSel(s=>s===h.uid?null:h.uid);}}/>)}
      {Array.from({length:Math.max(0,limit-deck.hand.length)},(_,i)=><div key={`slot${i}`} className="hcard slot" aria-hidden="true"/>)}
    </div>
    <span className="handCount">{deck.hand.length}/{limit}</span>
    {mergeMode&&<div className="handSheet" role="dialog" aria-label="Merge cards">
      <div className="handSheetHead"><b><Combine size={16}/> Merge {merging.length}/{MERGE_COUNT}</b><button aria-label="Cancel merge" onClick={()=>setMerging([])}><X size={18}/></button></div>
      <p>Pick {MERGE_COUNT} cards of the same rarity. They become one card of the next rarity, usually from the domain most of them share.</p>
      {issue&&<p className="handIssue">{issue}</p>}
      <div className="handActions"><button className="primary" disabled={merging.length!==MERGE_COUNT||!!issue||disabled} onClick={()=>{onMerge(merging);setMerging([]);setSel(null);}}><Check size={16}/> Merge cards</button></div>
    </div>}
    {!mergeMode&&card&&<div className="handSheet" role="dialog" aria-label={card.name}>
      <div className="handSheetHead"><b style={{color:RARITY_COLORS[card.rarity]}}>{RARITY_LABEL[card.rarity]} · {cardKind(card)}</b><button aria-label="Close card" onClick={()=>setSel(null)}><X size={18}/></button></div>
      <h3>{card.name}</h3><p>{card.description}</p>
      {card.durationPoints&&<p className="handNote">Lasts {card.durationPoints*20} years once played.</p>}
      {card.building&&<p className="handNote">Playing it awards a construction project: you then choose where it stands on the map.</p>}
      {stack>0&&<p className="handNote">Already in play ×{stack}. This copy counts at {Math.round((STACK_FACTORS[stack]??0)*100)}%{stack>=MAX_COPIES?' — the stack is full':''}.</p>}
      {card.kind!=='instant'&&<p className="handNote">Upkeep while in play: {Math.round((RARITY_UPKEEP[card.rarity]||0)*1000)/10}% of yearly revenue.</p>}
      <CollectionLine city={city} cardId={card.id}/>
      <div className="handActions">
        <button className="primary" disabled={disabled||stack>=MAX_COPIES} onClick={()=>{onPlay(selected.uid);setSel(null);}}><Play size={16}/> {card.building?'Play & place':'Play card'}</button>
        <button disabled={disabled} onClick={()=>{onSell(selected.uid);setSel(null);}}><Tag size={16}/> Sell {compact(Math.round(selected.paid*SELL_SHARE))}</button>
        {card.rarity!=='epic'&&<button disabled={disabled} onClick={()=>{setMerging([selected.uid]);setSel(null);}}><Combine size={16}/> Merge…</button>}
      </div>
    </div>}
  </section>;
}

function CollectionLine({city,cardId}){
  const sets=collectionsFor(city,cardId);if(!sets.length)return null;
  return <div className="hcardSets wide">{sets.map(s=><span key={s.id} className={s.complete?'done':''} title={s.description}><Layers size={12}/> {s.name} {s.have}/{s.size}{s.complete?' · complete':''}</span>)}</div>;
}

// The Market Hall: this decade's offers, a sealed pack and a reroll. Time keeps
// running while it is open.
export function MarketHall({city,disabled,onBuy,onPack,onReroll,onClose}){
  const deck=deckOf(city),shop=deck.shop,limit=handLimit(city),full=deck.hand.length>=limit;
  const odds=useMemo(()=>{const w=rarityWeights(city.year),t=Object.values(w).reduce((a,b)=>a+b,0);return RARITIES.map(r=>[r,Math.round(w[r]/t*100)]);},[city.year]);
  const next=shop?shop.year+RESTOCK_YEARS:city.year,funds=Math.floor(city.funds||0);
  return <div className="marketSheet" role="dialog" aria-modal="false" aria-labelledby="marketTitle">
    <div className="marketSheetHead">
      <div><span className="eyebrow">THE MARKET HALL · {shop?.year??city.year}</span><h2 id="marketTitle">Cards for sale</h2></div>
      <span className="marketFunds"><Coins size={15}/> {compact(funds)}</span>
      <button className="marketClose" aria-label="Close the Market Hall" onClick={onClose}><X size={20}/></button>
    </div>
    <p className="marketNote">Restocks in {Math.max(0,next-city.year)} {next-city.year===1?'year':'years'} ({next}). Hand {deck.hand.length}/{limit}. The clock keeps running.</p>
    {!shop||!shop.offers.length?<p className="handEmpty">Sold out until the next restock.</p>:
    <div className="marketOffers">{shop.offers.map(o=>{const short=funds<o.price;return <CardFace key={o.uid} city={city} cardId={o.cardId} size="shop" dim={short}
      footer={<button className="buyButton" disabled={disabled||short||full} onClick={()=>onBuy(o.uid)} aria-label={`Buy ${CARD_INDEX[o.cardId].name} for ${o.price}`}><Coins size={14}/> {compact(o.price)}</button>}/>;})}</div>}
    <div className="marketExtras">
      <button className="packButton" disabled={disabled||!shop||shop.packBought||funds<(shop?.packPrice||0)||deck.hand.length+PACK_SIZE>limit} onClick={onPack}>
        <Package size={18}/><span><b>Sealed pack</b><small>{shop?.packBought?'Opened this decade':`${PACK_SIZE} cards · first is Uncommon or better`}</small></span><em>{compact(shop?.packPrice||0)}</em></button>
      <button className="rerollButton" disabled={disabled||!shop||funds<rerollPrice(city)} onClick={onReroll}><RefreshCw size={16}/><span>New selection</span><em>{compact(rerollPrice(city))}</em></button>
    </div>
    <div className="marketOdds" aria-label="Rarity odds this era">{odds.map(([r,p])=><span key={r} style={{'--rarity':RARITY_COLORS[r]}}><i/>{RARITY_LABEL[r]} {p}%</span>)}</div>
    <p className="marketHint">Same card again = stack (each copy counts less). Three of one rarity = merge up. For each effect, your strongest card counts fully and the rest at 35%. Cards in play cost a little upkeep every year.</p>
  </div>;
}
