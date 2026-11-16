// CIVITAS v3 — the game screen. The map is the game; around it only:
//   · a top bar: back, year, population, treasury, and the speed bubble;
//   · one goal chip (the Age's charter or the scenario objective);
//   · a dock of four verbs: Zone, Build, Govern, Details.
// Everything else opens in one bottom sheet at a time (✕, tap outside or
// swipe down to close). Decisions that stop the clock are centred cards.
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,LandPlot,Hammer,Landmark,ScrollText,Play,Pause,X,Users,Coins,Target,Undo2,Eraser,Store,Package,RefreshCw,Crown,Castle,Waves,Route,Check,Trophy,Star,ShieldCheck,ShieldOff,Bomb,Flame,Hourglass,ArrowRight,Sparkles} from 'lucide-react';
import {CityMap} from '../CityMap.jsx';
import {demandOf,rezonedOf,ZONES,stats,zoningCost,constructionSite,tourismUnlocked,publicWorkIssue,publicWorkCost,PUBLIC_WORKS,townCenterIssue,STYLE_NAMES,styleAt,getOpportunity,unrestLine,RUIN_AT} from '../sim.js';
import {TOWN_CENTER_LEVELS,townCenterLevel} from '../construction.js';
import {CARD_INDEX,RARITY_COLORS} from '../turningPoints.js';
import {deckOf,handLimit,rerollPrice,PACK_SIZE,SELL_SHARE,RESTOCK_YEARS} from '../cards.js';
import {cardSummary,previewImpact} from '../impact.js';
import {cardDoctrines,DOCTRINES,doctrineState,decreesInPlay,decreeSlots,cardLevel,TYPE_LABEL,cardType} from '../doctrines.js';
import {NEEDS,needsOf,needAnswers} from '../needs.js';
import {omensOf,eventDefinition} from '../events.js';
import {TAX_SECTORS,TAX_LEVELS,TAX_LABELS,taxesOf,annualRevenue,annualExpenses} from '../economy.js';
import {cityEffects} from '../sim.js';
import {SPEEDS} from '../pacing.js';
import {AGES,ageAt} from '../ages.js';
import {ageChanges} from '../ageChanges.js';
import {charterLine,charterProgress,CHARTER_STATS} from '../charters.js';
import {SCENARIO_INDEX,GOAL_STATS,goalTarget,goalText} from '../scenarios.js';
import {RANK_CATEGORIES,worldTable,formatRankValue} from '../worldRankings.js';
import {HistoricalChart} from '../chronicleUI.jsx';
import {organicLiving,organicSites} from '../organic/index.js';
import {HERITAGE,optionsFor,openSites} from '../heritage.js';
import {FORMS,formsAt,resolveZone} from '../zoning.js';
import {RARITY_LABEL} from '../cards.js';
import './game.css';

const fmt=n=>{n=Math.round(Number(n)||0);const a=Math.abs(n);return a>=1e9?`${(n/1e9).toFixed(1)}B`:a>=1e6?`${(n/1e6).toFixed(a>=1e7?0:1)}M`:a>=1e4?`${Math.round(n/1000)}k`:n.toLocaleString('en-US');};
const full=n=>Math.round(Number(n)||0).toLocaleString('en-US');
const ZONE_ICON={res:'⌂',trade:'⚖',craft:'⚒',farm:'❦',civic:'✚',hotel:'✦'};
const ZONE_SHORT={res:'Homes',trade:'Shops',craft:'Works',farm:'Farms',civic:'Civic',hotel:'Hotels'};
const docOf=card=>{const t=cardDoctrines(card||{});return t.length?{glyph:t.map(x=>DOCTRINES[x].glyph).join(''),color:DOCTRINES[t[0]].color,name:t.map(x=>DOCTRINES[x].name).join(' + ')}:{glyph:'⌂',color:'#7d7466',name:'Civic'};};
const cardLine=(card,city)=>{const s=cardSummary(card,city);if(s.building)return `${s.building.urban?'Lays out':'Builds'} ${s.building.name}`;const l=s.lines[0];return l?`${l.text} ${l.label}`:card.description;};

// ───────────── Bottom sheet ─────────────
function Sheet({title,eyebrow,tabs,tab,onTab,onClose,children,tall=false}){
  const ref=useRef(null),start=useRef(null),[dy,setDy]=useState(0);
  useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',k);return()=>document.removeEventListener('keydown',k);},[onClose]);
  const down=e=>{start.current=e.clientY;};
  const move=e=>{if(start.current==null)return;setDy(Math.max(0,e.clientY-start.current));};
  const up=()=>{if(start.current==null)return;start.current=null;if(dy>90)onClose();setDy(0);};
  return <div className="g-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section ref={ref} className={`g-sheet ${tall?'tall':''}`} role="dialog" aria-modal="true" aria-label={title} style={dy?{transform:`translateY(${dy}px)`,transition:'none'}:null}>
      <div className="g-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{touchAction:'none'}}><i/></div>
      <div className="g-sheetHead">
        <div>{eyebrow&&<small>{eyebrow}</small>}<h2>{title}</h2></div>
        <button className="g-close" aria-label="Close" onClick={onClose}><X size={20}/></button>
      </div>
      {tabs&&<nav className="g-tabs" role="tablist">{tabs.map(([id,label,badge])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'on':''} onClick={()=>onTab(id)}>{label}{badge?<b className="g-dot"/>:null}</button>)}</nav>}
      <div className="g-sheetBody">{children}</div>
    </section>
  </div>;
}

// ───────────── Speed bubble ─────────────
function SpeedBubble({running,speed,disabled,onPause,onRun}){
  const [open,setOpen]=useState(false);
  const label=(SPEEDS.find(([r])=>r===speed)||[])[1]||'1×';
  const tap=()=>{if(disabled)return;if(running)onPause();setOpen(v=>!v);};
  return <div className="g-speed">
    <button className={`g-speedBubble ${running?'run':'paused'}`} onClick={tap} aria-label={running?`Running at ${label}. Tap to pause and change speed`:'Paused. Tap to choose a speed'} aria-expanded={open}>
      {running?<><Play size={15} fill="currentColor"/><b>{label}</b></>:<><Pause size={15} fill="currentColor"/><b>Paused</b></>}
    </button>
    {open&&<><div className="g-veil" onPointerDown={()=>setOpen(false)}/><div className="g-speedMenu" role="menu">
      {SPEEDS.map(([r,l])=><button key={r} role="menuitem" className={speed===r?'on':''} onClick={()=>{setOpen(false);onRun(r);}}><Play size={13} fill="currentColor"/>{l}</button>)}
      <button role="menuitem" className="stay" onClick={()=>setOpen(false)}><Pause size={13}/>Stay paused</button>
    </div></>}
  </div>;
}

// ───────────── The goal chip ─────────────
function GoalChip({city,s,onOpen}){
  const sc=city.scenario&&SCENARIO_INDEX[city.scenario.id];
  if(sc){const g=sc.goals[0],v=GOAL_STATS[g.stat].read(s),t=goalTarget(g,city.scenario);
    return <button className="g-goal" onClick={onOpen}><Target size={14}/><span>{GOAL_STATS[g.stat].label} <b>{fmt(v)}</b>/{fmt(t)}</span><i style={{'--p':`${Math.min(100,v/t*100)}%`}}/><em>{'★'.repeat(city.scenario.stars)}{'☆'.repeat(3-city.scenario.stars)}</em></button>;}
  const ch=city.charter;if(!ch)return null;
  const p=charterProgress(city,s);
  return <button className={`g-goal ${ch.met?'met':ch.failed?'failed':''}`} onClick={onOpen}><Target size={14}/>
    <span>{ch.met?'Charter fulfilled':ch.failed?'Charter missed':<>{CHARTER_STATS[ch.stat].label} <b>{fmt(p.value)}</b>/{fmt(ch.target)}</>}</span>
    {!ch.met&&!ch.failed&&<><i style={{'--p':`${p.share*100}%`}}/><em>by {ch.by}</em></>}</button>;
}

// ───────────── Cards ─────────────
function CardTile({city,cardId,onClick,price,badge,dim,selected}){
  const card=CARD_INDEX[cardId];if(!card)return null;const d=docOf(card),lvl=cardLevel(city,cardId);
  return <button className={`g-card ${dim?'dim':''} ${selected?'sel':''}`} style={{'--doc':d.color,'--rar':RARITY_COLORS[card.rarity]}} onClick={onClick}>
    <span className="g-cardTop"><span className="g-glyph">{d.glyph}</span><span className="g-rar">{RARITY_LABEL[card.rarity]}</span>{lvl>0&&<span className="g-lvl">Lv{lvl}</span>}</span>
    <b className="g-cardName">{card.name}</b>
    <span className="g-cardLine">{cardLine(card,city)}</span>
    {(price!=null||badge)&&<span className="g-cardFoot">{badge}{price!=null&&<em><Coins size={12}/>{fmt(price)}</em>}</span>}
  </button>;
}
function CardDetail({city,cardId,onBack,actions,note}){
  const card=CARD_INDEX[cardId],s=cardSummary(card,city),now=previewImpact(city,card),d=docOf(card);
  return <div className="g-cardDetail" style={{'--doc':d.color}}>
    <button className="g-back" onClick={onBack}><ChevronLeft size={16}/> All cards</button>
    <div className="g-cdHead"><span className="g-glyph big">{d.glyph}</span><div><small>{RARITY_LABEL[card.rarity]} · {TYPE_LABEL[cardType(card)]||'Card'} · {d.name}</small><h3>{card.name}</h3></div></div>
    <ul className="g-effects">
      {s.building&&<li className="build">{s.building.urban?'Lays out':'Builds'} <b>{s.building.name}</b> where you tap</li>}
      {s.lines.slice(0,4).map(l=><li key={l.key} className={l.good?'good':'bad'}><b>{l.text}</b> {l.label}</li>)}
      {s.needs.length>0&&<li className="good">Answers the need for <b>{s.needs.join(', ').toLowerCase()}</b></li>}
    </ul>
    {now&&!now.slow&&now.rows[0]&&<p className="g-now">Now: {now.rows[0].label} {now.rows[0].before} → <b>{now.rows[0].after}</b></p>}
    {now?.slow&&<p className="g-now slow">Acts over the decades · lasts {s.duration}</p>}
    <p className="g-desc">{card.description}</p>
    {note&&<p className="g-note">{note}</p>}
    <div className="g-actions">{actions}</div>
  </div>;
}

function BuildSheet({city,c,tab,setTab,onClose}){
  const deck=deckOf(city),shop=deck.shop,[sel,setSel]=useState(null),limit=handLimit(city),funds=Math.floor(city.funds||0);
  useEffect(()=>setSel(null),[tab]);
  const tabs=[['hand',`Hand ${deck.hand.length}/${limit}`],['market','Market',shop&&c.shopFresh],['works','Works']];
  let body;
  if(tab==='hand'){
    const held=sel&&deck.hand.find(h=>h.uid===sel);
    body=held?<CardDetail city={city} cardId={held.cardId} onBack={()=>setSel(null)} note={held.gift?'A card event gift: it cannot be bought.':null}
      actions={<><button className="g-primary" onClick={()=>{c.onPlayCard(held.uid);onClose();}}><Play size={16}/>{CARD_INDEX[held.cardId].building||CARD_INDEX[held.cardId].urban?'Place on the map':'Play'}</button>
        <button className="g-ghost" onClick={()=>{c.onSellCard(held.uid);setSel(null);}}>Sell {fmt(held.paid*SELL_SHARE)}</button></>}/>
    :deck.hand.length?<div className="g-cardGrid">{deck.hand.map(h=><CardTile key={h.uid} city={city} cardId={h.cardId} badge={h.gift?<span className="g-tag">Gift</span>:null} onClick={()=>setSel(h.uid)}/>)}</div>
    :<div className="g-empty"><Store size={28}/><p>No cards in hand.</p><button className="g-primary" onClick={()=>setTab('market')}>Open the Market</button></div>;
  }else if(tab==='market'){
    const offer=sel&&shop?.offers.find(o=>o.uid===sel);
    body=offer?<CardDetail city={city} cardId={offer.cardId} onBack={()=>setSel(null)} note={offer.need?'Stocked because a district needs it.':null}
      actions={<button className="g-primary" disabled={funds<offer.price||deck.hand.length>=limit} onClick={()=>{c.onBuyCard(offer.uid);setSel(null);setTab('hand');}}><Coins size={16}/>{deck.hand.length>=limit?'Hand is full':`Buy for ${full(offer.price)}`}</button>}/>
    :<>
      <div className="g-row g-marketHead"><span><Coins size={14}/> <b>{full(funds)}</b></span><small>Restocks in {Math.max(0,(shop?.year??city.year)+RESTOCK_YEARS-city.year)} y</small></div>
      {!shop||!shop.offers.length?<p className="g-muted">Sold out until the next restock.</p>:
        <div className="g-cardGrid">{shop.offers.map(o=><CardTile key={o.uid} city={city} cardId={o.cardId} price={o.price} dim={funds<o.price} badge={o.need?<span className="g-tag need">Need</span>:null} onClick={()=>setSel(o.uid)}/>)}</div>}
      <div className="g-row2">
        <button className="g-tile" disabled={!shop||shop.packBought||funds<(shop?.packPrice||0)||deck.hand.length+PACK_SIZE>limit} onClick={c.onBuyPack}><Package size={20}/><span><b>Pack of {PACK_SIZE}</b><small>{shop?.packBought?'Opened':`${full(shop?.packPrice||0)}`}</small></span></button>
        <button className="g-tile" disabled={!shop||funds<rerollPrice(city)} onClick={c.onReroll}><RefreshCw size={20}/><span><b>New selection</b><small>{rerollPrice(city)?full(rerollPrice(city)):'Free'}</small></span></button>
      </div>
    </>;
  }else body=<WorksView city={city} c={c} onClose={onClose}/>;
  return <Sheet title="Build" eyebrow={`${city.year} · ${ageAt(city.year).name}`} tabs={tabs} tab={tab} onTab={setTab} onClose={onClose}>{body}</Sheet>;
}
function WorkRow({icon,name,detail,cost,issue,onClick,label='Build'}){
  return <div className={`g-work ${issue?'off':''}`}><span className="g-workIcon">{icon}</span><div><b>{name}</b><small>{issue||detail}</small></div><button className="g-small" disabled={!!issue} onClick={onClick}>{cost!=null?<><Coins size={12}/>{fmt(cost)}</>:label}</button></div>;
}
function WorksView({city,c,onClose}){
  const tc=townCenterLevel(city),next=tc&&TOWN_CENTER_LEVELS[tc.level],rows=[];
  if(tc&&next)rows.push(<WorkRow key="tc" icon={<Crown size={18}/>} name={next.name} detail={next.description} cost={next.cost} issue={townCenterIssue(city)} onClick={c.onCenterUpgrade}/>);
  if(city.year<=PUBLIC_WORKS.wall.to)rows.push(<WorkRow key="wall" icon={<Castle size={18}/>} name="City wall" detail="Rings the core: safety and a little prosperity" cost={publicWorkCost(city,'wall')} issue={publicWorkIssue(city,'wall')} onClick={c.onWall}/>);
  if((city.walls||[]).some(w=>w.state==='wall'))for(const kind of ['boulevard','park','canal']){const issue=publicWorkIssue(city,kind);if(issue&&/Available from|geography/.test(issue))continue;
    rows.push(<WorkRow key={kind} icon={kind==='canal'?<Waves size={18}/>:<Route size={18}/>} name={PUBLIC_WORKS[kind].name} detail={PUBLIC_WORKS[kind].description} cost={publicWorkCost(city,kind)} issue={issue} onClick={()=>c.onRing(kind)}/>);}
  if(city.year>=PUBLIC_WORKS.ring_road.from){const issue=publicWorkIssue(city,'ring_road');rows.push(<WorkRow key="ring" icon={<Route size={18}/>} name={PUBLIC_WORKS.ring_road.name} detail={PUBLIC_WORKS.ring_road.description} cost={issue?null:publicWorkCost(city,'ring_road')} issue={issue} onClick={c.onRingRoad}/>);}
  if(['river','coast','estuary','lake'].includes(city.type))rows.push(<WorkRow key="bridge" icon={<Route size={18}/>} name="Bridge" detail="Tap a riverbank to cross" issue={publicWorkIssue(city,'bridge')} label="Place" onClick={()=>{c.setTool('place:bridge');onClose();}}/>);
  return <div className="g-list">{rows.length?rows:<p className="g-muted">No public works this Age.</p>}<p className="g-hint">Landmarks come from building cards (Hand and Market).</p></div>;
}

// ───────────── Govern ─────────────
function GovernSheet({city,s,c,tab,setTab,onClose}){
  const needs=needsOf(city).filter(n=>!n.served).sort((a,b)=>b.progress-a.progress),omens=omensOf(city).sort((a,b)=>a.due-b.due),open=omens.filter(o=>!Number.isInteger(o.choice));
  const nd=open.length+c.sites.length,tabs=[['needs',`Needs${needs.length?` ${needs.length}`:''}`,needs.some(n=>n.progress>=.5)],['decisions',`Decisions${nd?` ${nd}`:''}`,nd>0],['taxes','Taxes',(city.shortfall||0)>=.05],['path','Path']];
  let body;
  if(tab==='needs')body=needs.length?<div className="g-list">{needs.map(n=>{const def=NEEDS[n.kind],answers=needAnswers(n.kind,city.year),deck=deckOf(city);
    return <article key={`${n.district}:${n.kind}`} className={`g-need ${n.progress>=.66?'urgent':''}`}>
      <div className="g-needHead"><b>{n.name}</b><span>needs {def.label.toLowerCase()}</span></div>
      <div className="g-bar"><i style={{width:`${Math.round(n.progress*100)}%`}}/></div>
      <div className="g-needActions">{answers.map(b=>{const id=`b_${b.kind}`,held=deck.hand.find(h=>h.cardId===id),offer=(deck.shop?.offers||[]).find(o=>o.cardId===id);
        if(held)return <button key={b.id} className="g-small primary" onClick={()=>{c.onBuildForNeed(b,n,{uid:held.uid});onClose();}}><Hammer size={13}/>Place {b.name}</button>;
        if(offer)return <button key={b.id} className="g-small" disabled={city.funds<offer.price} onClick={()=>{c.onBuildForNeed(b,n,{offer:offer.uid});onClose();}}><Coins size={12}/>{b.name} {fmt(offer.price)}</button>;
        return <span key={b.id} className="g-wait">{b.name}: next restock</span>;})}</div>
    </article>;})}<p className="g-hint">Unserved districts decline when the bar fills. Build the answer inside the ring shown on the map.</p></div>
    :<div className="g-empty"><Check size={28}/><p>Every district is served.</p></div>;
  else if(tab==='decisions')body=omens.length||c.sites.length?<div className="g-list">{c.sites.map(st=><div key={st.id} className="g-work"><span className="g-workIcon"><Landmark size={18}/></span><div><b>{HERITAGE[st.kind].title}</b><small>{sinceText(st)} · {optionsFor(city,st).length} choices</small></div><button className="g-small" onClick={()=>c.onSite(st)}>Decide</button></div>)}{omens.map(o=>{const def=eventDefinition(o.id);return <article key={o.id} className="g-omen">
      <div className="g-needHead"><b>{o.title}</b><span><Hourglass size={12}/> {o.due}</span></div><p className="g-desc">{o.text}</p>
      <div className="g-choices">{def.choices.map((ch,i)=><button key={ch.label} className={o.choice===i?'on':''} onClick={()=>c.onAnswerOmen(o.id,i)}><b>{o.choice===i&&<Check size={13}/>}{ch.label}</b><small>{ch.detail}</small></button>)}</div>
    </article>;})}</div>:<div className="g-empty"><Check size={28}/><p>Nothing to decide.</p></div>;
  else if(tab==='taxes'){const t=taxesOf(city),rev=annualRevenue(city,s,cityEffects(city)),cost=annualExpenses(city,s),net=rev.total-cost.total;
    body=<div className="g-list">
      <div className={`g-net ${net<0?'neg':''}`}><span>Net per year</span><b>{net>=0?'+':'−'}{full(Math.abs(net))}</b></div>
      {TAX_SECTORS.map(sec=><div key={sec.id} className="g-tax"><div className="g-needHead"><b>{sec.label}</b><span>+{fmt(rev[sec.id])}/yr</span></div>
        <div className="g-seg">{TAX_LEVELS.map(l=><button key={l} className={t[sec.id]===l?'on':''} onClick={()=>c.onTax(sec.id,l)}>{TAX_LABELS[l]}</button>)}</div></div>)}
      <p className="g-hint">Lower taxes draw people and business; higher ones fill the treasury.</p>
      {(city.shortfall||0)>=.05&&<p className="g-warn">The treasury is empty: services are cut {Math.round(city.shortfall*100)}%.</p>}
    </div>;}
  else{const st=doctrineState(city),rows=Object.entries(DOCTRINES).map(([id,d])=>({id,d,n:st.counts[id]||0,tier:st.tiers[id]||0})).sort((a,b)=>b.n-a.n),decrees=decreesInPlay(city);
    body=<div className="g-list">
      <p className="g-hint">Each card you play adds to a doctrine. At 2, 4, 6 and 8 cards the doctrine unlocks a power. Focus beats spread.</p>
      {rows.map(({id,d,n,tier})=><div key={id} className={`g-path ${n?'':'off'}`} style={{'--doc':d.color}}><span className="g-glyph">{d.glyph}</span><div><b>{d.name}</b><small>{tier<4?`${[2,4,6,8][tier]} cards: ${d.tiers[tier]}`:'All powers unlocked'}</small></div><span className="g-pips">{[2,4,6,8].map(x=><i key={x} className={n>=x?'on':''}/>)}</span><em>{n}</em></div>)}
      <h4>Decrees {decrees.length}/{decreeSlots(city)}</h4>
      {decrees.length?decrees.map(id=><div key={id} className="g-work"><span className="g-workIcon">{docOf(CARD_INDEX[id]).glyph}</span><div><b>{CARD_INDEX[id].name}</b><small>Lv{cardLevel(city,id)}</small></div><button className="g-small" onClick={()=>c.onRetire(id)}>Retire</button></div>):<p className="g-muted">Decree cards you play take a slot here.</p>}
    </div>;}
  return <Sheet title="Govern" eyebrow={`Unrest ${Math.round(city.unrest||0)}/${RUIN_AT}`} tabs={tabs} tab={tab} onTab={setTab} onClose={onClose}>{body}</Sheet>;
}

// ───────────── What the city wants built ─────────────
// Building happens only on zoned land: the bars say what is wanted, and a red one that land is short.
const DEMAND=[['res','Homes'],['trade','Shops'],['craft','Work'],['farm','Farms']];
function DemandRow({city}){const d=useMemo(()=>demandOf(city),[city.year,city.month,city.zones,city.buildings.length]);
  return <div className="g-demand">{DEMAND.map(([t,l])=><span key={t} className={d[t].short?'short':''} title={d[t].why}><b>{l}</b><i><em style={{width:`${Math.round(d[t].level*100)}%`}}/></i>{d[t].short?<small>zone more</small>:null}</span>)}</div>;}

// ───────────── The old city: one site, its choices ─────────────
const sinceText=s=>s.born&&s.born>1300?`since ${s.born}`:'since the founding';
function HeritageSheet({city,site,c,onClose}){
  const def=HERITAGE[site.kind],funds=Math.floor(city.funds||0);
  return <Sheet title={def.title} eyebrow={`${site.name&&!/market/i.test(site.name)?`${site.name} · `:''}${sinceText(site)}`} onClose={onClose}>
    <div className="g-list"><p className="g-lead">{def.lead}</p>
      <div className="g-choices">{optionsFor(city,site).map(o=>{const short=o.cost>funds;return <button key={o.id} disabled={short} onClick={()=>{c.onHeritage(site,o.id);onClose();}}>
        <b>{o.label}<em className="g-cost">{o.cost>0?<><Coins size={12}/>{fmt(o.cost)}</>:o.cost<0?<>+<Coins size={12}/>{fmt(-o.cost)}</>:'Free'}</em></b><small>{short?'Not enough coins':o.detail}</small></button>;})}</div>
      <p className="g-hint">A decision for good. Check the Land value and Living lenses to see what is at stake here.</p></div>
  </Sheet>;
}

// ───────────── Details ─────────────
function standing(city,s){
  const age=ageAt(city.year).id,row={year:city.year,population:s.population,industry:s.sectorJobs?.craft||0,wealth:s.gdp,faith:s.religiousInfluence,culture:s.culturalPrestige,learning:s.educationIndex};
  const entry={id:'now',name:city.name,playedAt:Date.now(),ages:{[age]:row}};
  return RANK_CATEGORIES.map(k=>{const t=worldTable(age,k.id,[entry],20),me=t.rows.find(r=>r.mine)||t.best;return {k,rank:me?.rank,value:row[k.id],cut:t.cutoff};});
}
function DetailsSheet({city,s,tab,setTab,onClose,legacy,onGuide}){
  const tabs=[['mission','Mission'],['city','City'],['history','History']];
  let body;
  if(tab==='mission'){
    const sc=city.scenario&&SCENARIO_INDEX[city.scenario.id],ch=city.charter,rank=standing(city,s),age=ageAt(city.year);
    body=<div className="g-list">
      {sc&&<article className="g-mission"><small>SCENARIO · {sc.from}–{sc.to}</small><h3>{sc.name}</h3>
        <ol className="g-goals">{sc.goals.map((g,i)=><li key={i} className={city.scenario.met[i]!=null?'done':''}><Star size={14} fill={city.scenario.met[i]!=null?'currentColor':'none'}/>{goalText(g,city.scenario)}</li>)}</ol></article>}
      {ch&&<article className={`g-mission ${ch.met?'met':ch.failed?'failed':''}`}><small>CHARTER · {AGES.find(a=>a.id===ch.age)?.name.toUpperCase()}</small><h3>{charterLine(ch)}</h3>
        <div className="g-bar big"><i style={{width:`${(charterProgress(city,s)?.share||0)*100}%`}}/></div>
        <p className="g-desc">{ch.met?`Fulfilled in ${ch.met}.`:ch.failed?`Missed in ${ch.failed}: Unrest rose.`:`By ${ch.by}. Reward: ${[ch.reward.funds&&`${full(ch.reward.funds)} coins`,ch.reward.card&&`a ${ch.reward.card} card`,ch.reward.lp&&`${ch.reward.lp} Legacy Points`].filter(Boolean).join(', ')}.`}</p></article>}
      <h4>World Cities now · {age.name}</h4>
      <div className="g-ranks">{rank.map(r=>{const inTop=r.rank&&r.rank<=20;return <div key={r.k.id} className={inTop?'in':''}><span>{r.k.name}</span><b>{inTop?`#${r.rank}`:'Outside'}</b><small>{inTop?`${fmt(r.value)} now`:`${fmt(r.value)} · Top 20 needs ${formatRankValue(r.k.id,r.cut)}`}</small></div>;})}</div>
      <p className="g-hint">At the end of each Age your city enters the World Cities table where it stands.</p>
      <button className="g-ghost" onClick={onGuide}>How to play</button>
    </div>;
  }else if(tab==='city'){
    const rev=annualRevenue(city,s,cityEffects(city)),cost=annualExpenses(city,s);
    const liv=organicLiving(city);
    const rows=[['Population',full(s.population)],...(liv?[['Standard of living',`${liv.sol}/100`],['Land value',`${liv.value}/100`]]:[]),...(s.carShare?[['Commuters by car',`${s.carShare}%`],['Traffic',`${s.traffic}% of road capacity`]]:[]),['Homes priced out',`${s.unaffordable}%`],['Prosperity',`${s.prosperity}/100`],['Unemployment',`${s.unemployment}%`],['Homes full',`${s.housingPressure}%`],['Treasury',full(city.funds)],['Net per year',`${rev.total-cost.total>=0?'+':'−'}${full(Math.abs(rev.total-cost.total))}`],['Industry jobs',full(s.sectorJobs?.craft||0)],['Faith',full(s.religiousInfluence)],['Culture',full(s.culturalPrestige)],['Learning',full(s.educationIndex)],['Unrest',`${Math.round(city.unrest||0)}/${RUIN_AT}`],['Buildings',full(s.buildings)]];
    body=<div className="g-list"><div className="g-chart"><HistoricalChart city={city} metric="population" height={120}/></div><div className="g-stats">{rows.map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}</div></div>;
  }else{
    const ev=[...city.events].filter(e=>e.text&&!['shop'].includes(e.type)).slice(-60).reverse();
    body=<ol className="g-history">{ev.map((e,i)=><li key={i} className={e.type||''}><b>{e.year}</b><span>{String(e.text).replace(/ at parcel [\d, ]+/,'')}</span></li>)}</ol>;
  }
  return <Sheet title={city.name} eyebrow={`${city.year} · ${ageAt(city.year).name}`} tabs={tabs} tab={tab} onTab={setTab} onClose={onClose} tall={tab==='history'}>{body}</Sheet>;
}

// ───────────── Decisions that stop the clock ─────────────
function Modal({children,label}){return <div className="g-modalBack"><section className="g-modal" role="dialog" aria-modal="true" aria-label={label}>{children}</section></div>;}
function CharterModal({city,onSign}){
  const age=city.ageWelcome&&AGES.find(a=>a.id===city.ageWelcome.id),offers=city.charterOffer||[];
  const ch=age?ageChanges(age):null;
  return <Modal label="Choose a charter">
    {age?<><small className="g-eyebrow">A NEW AGE · {age.from}</small><h2>Welcome to {age.title}</h2><p className="g-lead">{age.tagline}</p>
      {ch&&<div className="g-ageChips">{ch.landmarks.slice(0,3).map(l=><span key={l}>{l}</span>)}<span>{age.styleText.replace(/\.$/,'')}</span></div>}</>
      :<><small className="g-eyebrow">THE TOWN IS FOUNDED · {city.year}</small><h2>Sign your first charter</h2><p className="g-lead">A goal for this Age. Meet it for a reward; miss it and Unrest rises.</p></>}
    <h4>{age?'Choose this Age’s charter':'Choose one'}</h4>
    <div className="g-charters">{offers.map((o,i)=><button key={i} className={`g-charter ${o.kind}`} onClick={()=>onSign(i)}>
      <span className="g-charterTag">{o.kind==='world'?<Trophy size={13}/>:o.kind==='calling'?<Sparkles size={13}/>:<Users size={13}/>}{o.tag}</span>
      <b>{charterLine(o)}</b><small>by {o.by}</small>
      <span className="g-reward">{[o.reward.funds&&<span key="f"><Coins size={12}/>{fmt(o.reward.funds)}</span>,o.reward.card&&<span key="c">+ {o.reward.card} card</span>,o.reward.lp&&<span key="l">+{o.reward.lp} LP</span>]}</span>
      <ArrowRight className="g-go" size={18}/></button>)}</div>
  </Modal>;
}
function CardEventModal({city,onPick}){
  const p=city.turning.pending;
  return <Modal label="Card event"><small className="g-eyebrow">CARD EVENT · {p.year}</small><h2>Choose one card</h2><p className="g-lead">Free, and never sold in the Market. It goes to your hand.</p>
    <div className="g-pick">{p.options.map(id=>{const card=CARD_INDEX[id]||getOpportunity(id);if(!card)return null;const d=docOf(card);
      return <button key={id} className="g-pickCard" style={{'--doc':d.color,'--rar':RARITY_COLORS[card.rarity]}} onClick={()=>onPick(id)}>
        <span className="g-glyph big">{d.glyph}</span><span><small>{RARITY_LABEL[card.rarity]||''} · {d.name}</small><b>{card.name}</b><em>{CARD_INDEX[id]?cardLine(card,city):card.description}</em></span><ArrowRight size={18}/></button>;})}</div>
  </Modal>;
}
function EventModal({city,onChoose}){
  const ev=city.event;if(!ev)return null;const disaster=ev.id?.startsWith('disaster:');
  return <Modal label={ev.title}><small className="g-eyebrow">{disaster?'CALAMITY':'HISTORY'} · {ev.year}</small><h2>{ev.title}</h2><p className="g-lead">{ev.text}</p>
    <div className="g-choices big">{ev.options.map((o,i)=><button key={o.label} onClick={()=>onChoose(i)}><b>{o.label}</b><small>{o.detail}</small></button>)}</div></Modal>;
}


// First game: the four verbs and the goal, once. Reopened from Details.
const GUIDE_KEY='civitas-v3-guide';
const guideSeen=()=>{try{return localStorage.getItem(GUIDE_KEY)==='1';}catch{return true;}};
function Guide({onClose}){
  const rows=[[<LandPlot size={20}/>,'Zone','Drag land for homes, shops, workshops or farms. Streets and houses grow there by themselves.'],
    [<Hammer size={20}/>,'Build','Buy cards in the Market. Building cards put a landmark where you tap; others change the whole city.'],
    [<Landmark size={20}/>,'Govern','Districts ask for churches, markets or schools: answer before their bar fills. Set taxes, decide history.'],
    [<Target size={20}/>,'Your charter','Each Age you sign one goal. Meet it for coins and cards; miss it and Unrest rises. At 100 the city falls.']];
  return <Modal label="How to play"><small className="g-eyebrow">HOW TO PLAY</small><h2>Grow a city through seven centuries</h2>
    <ul className="g-guide">{rows.map(([i,t,d])=><li key={t}><span>{i}</span><div><b>{t}</b><small>{d}</small></div></li>)}</ul>
    <p className="g-hint">Tap the speed bubble to pause or change speed. Every Age ends in the World Cities table.</p>
    <button className="g-primary wide" onClick={()=>{try{localStorage.setItem(GUIDE_KEY,'1');}catch{}onClose();}}>Start <ArrowRight size={16}/></button></Modal>;
}

// ───────────── The screen ─────────────
export function GameScreen(c){
  const {city,s}=c;
  const [sheet,setSheet]=useState(null),[tabs,setTabs]=useState({build:'hand',govern:'needs',details:'mission'}),[zone,setZone]=useState(null);
  const tab=k=>tabs[k],setTab=k=>v=>setTabs(t=>({...t,[k]:v}));
  const open=(k,t)=>{setSheet(k);if(t)setTabs(x=>({...x,[k]:t}));};
  const [site,setSite]=useState(null),sites=city.center&&!city.finished?openSites(city,organicSites(city)):[];
  const [toast,setToast]=useState(null),[guide,setGuide]=useState(false),[lens,setLens]=useState(null);
  const LENSES=[[null,'Plan'],['value','Land value'],['sol','Living'],...(city.year>=1900?[['traffic','Traffic']]:[])];
  useEffect(()=>{if(city.charter&&!city.scenario?.id&&!guideSeen())setGuide(true);},[!!city.charter]);
  useEffect(()=>{if(!c.message)return;setToast(c.message);const id=setTimeout(()=>setToast(null),4200);return()=>clearTimeout(id);},[c.message]);
  const tool=c.tool,placing=tool.startsWith('place:'),zoning=!!zone;
  // The brush: a drag or tap makes a pending shape; ✓ applies it.
  const [pend,setPend]=useState(null);
  useEffect(()=>setPend(null),[tool]);
  const confirm=()=>{if(!pend)return;if(pend.rect)c.onZone(pend.rect,pend.type);else c.onPlace(pend.id,pend.x,pend.y);setPend(null);};
  // The zone bar drives the map tool.
  useEffect(()=>{if(zone)c.setTool(zone);else if(!placing&&tool!=='inspect')c.setTool('inspect');},[zone]);
  const blocking=!!(city.charterOffer||city.ageWelcome||city.turning?.pending||city.event);
  const finished=city.finished,ro=finished||c.readOnly;
  const needsBadge=needsOf(city).some(n=>!n.served&&n.progress>=.5)||omensOf(city).some(o=>!Number.isInteger(o.choice));
  const buildBadge=deckOf(city).hand.length>0||c.shopFresh||(city.projects||[]).length>0;
  const placeName=placing?(tool==='place:center'?'Town Center':tool==='place:bridge'?'Bridge':tool.startsWith('place:urban:')?CARD_INDEX[deckOf(city).hand.find(h=>h.uid===Number(tool.slice(12)))?.cardId]?.name:(city.projects||[]).find(p=>`place:${p.id}`===tool)?.label||'Building'):null;
  // v3.3 the Age's urban forms (zoning.js) are the zone tools.
  const zones=formsAt(city.year,{tourism:tourismUnlocked(city)}).map(id=>[id,{...FORMS[id],color:ZONES[FORMS[id].type].color}]);
  const zoneLabel=t=>FORMS[t]?.short||ZONE_SHORT[t]||t;
  const zoneShort=useMemo(()=>{try{const d=demandOf(city);return Object.values(d).some(x=>x.short);}catch{return false;}},[city.year,city.zones,city.buildings.length]);
  const b=c.selectedBuilding;
  return <div className="g3">
    <div className="g-map"><CityMap minimal lens={zoning?null:lens} city={city} tool={ro?'inspect':tool} layer={zoning?'zones':sheet==='govern'&&tab('govern')==='needs'?'needs':'urban'} onZone={(rect,type)=>setPend({rect,type})} onPlace={(id,x,y)=>setPend({id,x,y})} pendingRect={pend?.rect||null} pendingPoint={pend&&!pend.rect?{x:pend.x,y:pend.y}:null} onInspect={c.onInspect} onMarker={m=>{if(m.type==='heritage'){setSheet(null);setSite(m.item);}else open('govern','needs');}} selectedId={b?.id} animate={c.simulating} captions={c.captions} population={s.population}
      describeSelection={(r,t)=>{if(!ZONES[t]&&!FORMS[t])return t==='erase'?'Erase zoning':t==='demolish'?'Demolish':null;const {cells,cost}=zoningCost(city,r.x,r.y,r.w,r.h);return cells?`${cells} parcels · ${full(cost)}${cost>city.funds?' · not enough coins':''}`:'Rezoning is free';}}/></div>

    <div className="g-top">
      <button className="g-round" aria-label="Home" onClick={c.goHome}><ChevronLeft size={20}/></button>
      <div className="g-hud">
        <span className="g-year"><b>{city.year}</b><small>{ageAt(city.year).name}</small></span>
        <span><Users size={14}/><b>{fmt(s.population)}</b></span>
        <span className={(city.shortfall||0)>=.05?'warn':''}><Coins size={14}/><b>{fmt(city.funds)}</b></span>
        {(city.unrest||0)>=30&&<span className="warn"><Flame size={14}/><b>{Math.round(city.unrest)}</b></span>}
      </div>
      <SpeedBubble running={c.simulating} speed={c.clockSpeed} disabled={ro||blocking||city.awaitingCenter} onPause={c.stopSimulation} onRun={c.runClock}/>
    </div>
    {!placing&&!zoning&&<button className={`g-lens ${lens?'on':''}`} onClick={()=>setLens(l=>LENSES[(LENSES.findIndex(x=>x[0]===l)+1)%LENSES.length][0])} aria-label="Change map lens"><span className="g-lensDot" data-l={lens||'plan'}/>{LENSES.find(x=>x[0]===lens)[1]}</button>}
    {lens&&!placing&&!zoning&&<div className="g-lensKey">{lens==='traffic'?<><i style={{background:'rgba(220,150,40,.45)'}}/>busy<i style={{background:'rgba(190,40,30,.6)'}}/>jammed</>:lens==='value'?<><i style={{background:'rgba(170,100,60,.35)'}}/>cheap<i style={{background:'rgba(250,50,30,.65)'}}/>dear</>:<><i style={{background:'rgba(120,60,130,.55)'}}/>poor<i style={{background:'rgba(60,140,80,.6)'}}/>good</>}</div>}
    {!placing&&!zoning&&<div className="g-chips"><GoalChip city={city} s={s} onOpen={()=>open('details','mission')}/></div>}

    {toast&&!placing&&!blocking&&!sheet&&!zoning&&<div className="g-toast" role="status" onClick={()=>setToast(null)}>{toast}</div>}

    {placing&&!ro&&<div className="g-modeBar top"><div><small>{tool==='place:center'?'FOUND THE TOWN':'PLACE'}</small><b>{placeName}</b><span>{tool==='place:center'?'Tap dry land where the town begins':tool==='place:bridge'?'Tap a riverbank':'Tap a free parcel, then confirm'}</span></div>{tool!=='place:center'&&<button className="g-close dark" aria-label="Close" onClick={()=>c.setTool('inspect')}><X size={18}/></button>}</div>}
    {placing&&!ro&&<div className="g-brush">{(()=>{const issue=pend&&!pend.rect&&!['center','bridge'].includes(pend.id)&&!pend.id.startsWith('urban:')?constructionSite(city,pend.id,pend.x,pend.y)?.error:null;
      return pend?<><span className={issue?'bad':''}>{issue||`${placeName} here`}</span><button className="g-ghost" onClick={()=>setPend(null)}>Move</button><button className="g-primary" disabled={!!issue} onClick={confirm}><Check size={16}/>{tool==='place:center'?'Found here':'Build'}</button></>
      :<><span>Tap the map to choose the spot</span><button className="g-ghost" disabled={!c.undoCount} onClick={c.undo}><Undo2 size={16}/>Undo</button></>;})()}</div>}

    {zoning&&!ro?<div className="g-zoneBar">
      <div className="g-zoneTop"><span>{pend?.rect?(()=>{const {cells,cost}=zoningCost(city,pend.rect.x,pend.rect.y,pend.rect.w,pend.rect.h);return ZONES[pend.type]||FORMS[pend.type]?`${zoneLabel(pend.type)} · ${cells?`${cells} parcels · ${full(cost)} coins`:'rezoning is free'}`:pend.type==='erase'?'Erase this zoning':'Demolish these buildings';})():FORMS[zone]?`${FORMS[zone].label}: ${FORMS[zone].note.toLowerCase()}`:`Drag on the map · two fingers to pan`}</span>
        <button className="g-close" aria-label="Close the brush" onClick={()=>setZone(null)}><X size={18}/></button></div>
      <DemandRow city={city}/>
      <div className="g-zoneTools">{zones.map(([k,v])=><button key={k} className={zone===k?'on':''} style={{'--z':v.color}} title={v.note} onClick={()=>{setZone(k);setPend(null);}}><i>{v.icon}</i><span>{v.short}</span></button>)}
        <button className={zone==='erase'?'on':''} onClick={()=>{setZone('erase');setPend(null);}}><i><Eraser size={16}/></i><span>Erase</span></button>
        <button className={zone==='demolish'?'on':''} onClick={()=>{setZone('demolish');setPend(null);}}><i><Bomb size={16}/></i><span>Clear</span></button></div>
      <div className="g-zoneEnd"><button className="g-ghost" disabled={!c.undoCount} onClick={c.undo}><Undo2 size={16}/>Undo</button>
        {pend?.rect?<><button className="g-ghost" onClick={()=>setPend(null)}><X size={16}/>Discard</button><button className="g-primary" disabled={(ZONES[pend.type]||FORMS[pend.type])&&zoningCost(city,pend.rect.x,pend.rect.y,pend.rect.w,pend.rect.h).cost>city.funds} onClick={confirm}><Check size={16}/>Confirm</button></>:null}</div>
    </div>
    :!placing&&<nav className="g-dock" aria-label="Actions">
      <button disabled={ro||city.awaitingCenter} onClick={()=>{setSheet(null);setZone(formsAt(city.year)[0]);}}><LandPlot size={22}/><span>Zone</span>{zoneShort&&<b className="g-dot red"/>}</button>
      <button disabled={ro||city.awaitingCenter} onClick={()=>open('build')}><Hammer size={22}/><span>Build</span>{buildBadge&&<b className="g-dot"/>}</button>
      <button disabled={ro||city.awaitingCenter} onClick={()=>open('govern')}><Landmark size={22}/><span>Govern</span>{needsBadge&&<b className="g-dot red"/>}</button>
      <button onClick={()=>open('details')}><ScrollText size={22}/><span>Details</span></button>
    </nav>}

    {b&&!sheet&&!placing&&!zoning&&<div className="g-peek" role="dialog" aria-label="Building">
      <div><small>{STYLE_NAMES[b.style||styleAt(b.born)]} · built {b.born}</small><b>{b.label||ZONES[b.type]?.label||'Building'}</b></div>
      {!ro&&<button className="g-small" onClick={()=>c.protect(!b.protected)}>{b.protected?<><ShieldOff size={13}/>Unprotect</>:<><ShieldCheck size={13}/>Protect</>}</button>}
      <button className="g-close" aria-label="Close" onClick={()=>c.onInspect(null)}><X size={18}/></button></div>}

    {finished&&<div className="g-finished"><b>{city.ruined?`Fell into Ruin in ${city.ruined}`:'The Chronicle is complete'}</b>{c.onSummary&&<button className="g-primary" onClick={c.onSummary}><Trophy size={15}/>Results</button>}</div>}

    {sheet==='build'&&<BuildSheet city={city} c={c} tab={tab('build')} setTab={setTab('build')} onClose={()=>setSheet(null)}/>}
    {site&&!sheet&&<HeritageSheet city={city} site={site} c={c} onClose={()=>setSite(null)}/>}
    {sheet==='govern'&&<GovernSheet city={city} s={s} c={{...c,sites,onSite:st=>{setSheet(null);setSite(st);}}} tab={tab('govern')} setTab={setTab('govern')} onClose={()=>setSheet(null)}/>}
    {sheet==='details'&&<DetailsSheet city={city} s={s} tab={tab('details')} setTab={setTab('details')} onClose={()=>setSheet(null)} legacy={c.legacy} onGuide={()=>{setSheet(null);setGuide(true);}}/>}

    {guide&&!city.charterOffer&&<Guide onClose={()=>setGuide(false)}/>}
    {!c.simulating&&!ro&&(city.charterOffer?<CharterModal city={city} onSign={c.onSignCharter}/>
      :city.ageWelcome?<AgeOnly city={city} onContinue={c.onContinueAge}/>
      :city.turning?.pending?<CardEventModal city={city} onPick={c.pickCard}/>
      :city.event?<EventModal city={city} onChoose={c.answerEvent}/>:null)}
  </div>;
}
// A new Age in a city without charters (scenarios).
function AgeOnly({city,onContinue}){
  const age=AGES.find(a=>a.id===city.ageWelcome.id);if(!age)return null;const ch=ageChanges(age);
  return <Modal label={age.title}><small className="g-eyebrow">A NEW AGE · {age.from}</small><h2>Welcome to {age.title}</h2><p className="g-lead">{age.tagline}</p>
    <div className="g-ageChips">{ch.landmarks.slice(0,3).map(l=><span key={l}>{l}</span>)}<span>{age.styleText.replace(/\.$/,'')}</span></div>
    <button className="g-primary wide" onClick={onContinue}>Continue <ArrowRight size={16}/></button></Modal>;
}
