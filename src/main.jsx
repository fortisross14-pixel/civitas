import {FORMS} from './zoning.js';
import {rezonedOf,decideSite,buildRingRoad} from './sim.js';
import {HERITAGE} from './heritage.js';
import {AXIS_LABELS,opportunityPulse,developmentOf} from './development.js';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Landmark,Play,FastForward,Plus,ArrowLeft,Save,MousePointer2,BarChart3,BookOpen,Trash2,Map as MapIcon,Download,Upload,Info,Check,RotateCcw,Maximize2,ShieldCheck,ShieldOff,Clock3,Bell,Building2,Sparkles,Layers3,Compass,Crown,ChevronRight,Star,History,TrendingUp,Hourglass,Coins,Lock,RefreshCw,UserRound,ShoppingBag,Medal,GitCompareArrows,Eraser,Hammer,Undo2,Castle,Waves,Route,Pause,Wallet,Flag,LandPlot,Construction,Layers,Pencil,X,Users}from'lucide-react';
import{W,H,END_YEAR,ZONES,terrain,makeCity,seedTown,stats,demand,advance,advanceMonths,addZone,eraAt,zoneCell,normalizeCity,snapshotCity,setProtection,placeConstruction,cityEffects,STYLE_NAMES,styleAt,selectTurningPoint,rerollTurningPoint,getOpportunity,tourismUnlocked,cityOrigin,clearZone,zoneLand,zoningCost,setTax,demolishArea,buildWall,convertWall,buildBridge,publicWorkIssue,publicWorkCost,PUBLIC_WORKS,wallTarget,revertEdit,POLICIES,policyIssue,setPolicy,activePolicies,districtDetails,cityFields,resolveEvent,renameDistrict,DISTRICT_NAME_MAX,prepareFounding,placeTownCenter,upgradeTownCenter,townCenterIssue,townCenterLevel,TOWN_CENTER_LEVELS,playCard,retireCard,playUrbanCard}from'./sim';
import {CAPTION_MS} from './CityMap.jsx';
import {Timelapse} from './Timelapse.jsx';
import {HandTray,MarketHall,DoctrinePanel,CardDetails} from './Cards.jsx';
import {Info as InfoTip} from './Info.jsx';
import {AgeWelcome} from './AgeWelcome.jsx';
import {doctrinesOn,doctrineState,DOCTRINES,cardDoctrines} from './doctrines.js';
import {NeedsPanel,HistoryPill,needAttention} from './Needs.jsx';
import {answerOmen,omensOf} from './events.js';
import {scoreOf,formatScore} from './score.js';
import {NEEDS} from './needs.js';
import {SPEEDS,NORMAL_SPEED,paceFactor,paceLabel} from './pacing.js';
import {buyCard,buyPack,sellCard,mergeCards,rerollShop,deckOf,banishOffer,lockOffer} from './cards.js';
import {eventDefinition} from './events.js';
import {AXIS_NAMES,CHARACTER_AXES,characterOf} from './character.js';
import {DISTRICT_COLORS} from './CityMap.jsx';
import {CityMap} from './CityMap.jsx';
import {TAX_SECTORS,TAX_LEVELS,TAX_LABELS,taxesOf,annualRevenue,annualUpkeep,annualExpenses} from './economy.js';
import {CARD_INDEX,CARDS,DOMAINS,RARITY_COLORS,SYNERGIES,activeSynergies,resolvedCards,turningYears,turningSchedule,turningCount,turningMode,modifiers} from './turningPoints';
import{readAtlas,writeAtlas,readLegacy,writeLegacy}from'./storage';
import {BASIC_BUILDINGS,basicsForYear,SPECIAL_BUILDINGS,BUILDING_EFFECTS,projectLabel} from './construction.js';
import {FIGURE_INDEX,emptyLegacy,normalizeLegacy,buyLegacy,openFigurePack,startRunProfile,awardCompletedCity,awardCityMilestones,legacyInvestmentProgress} from './legacy';
import {Market,AchievementLedger} from './Market.jsx';
import {HubTiles,ScenariosPage,WorldCitiesPage,ScenarioPill} from './WorldUI.jsx';
import {startScenario,scenarioUrl} from './scenarioStart.js';
import {SCENARIO_INDEX} from './scenarios.js';
import {GameScreen} from './game/GameScreen.jsx';
import {Home} from './game/Home.jsx';
import {signCharter,charterLine} from './charters.js';
import {FoundingSetup,RunSummary,UnrestMeter} from './RunUI.jsx';
import {foundRun,recordRun} from './runs.js';
import {cardSummary} from './impact.js';
// v2.0: doctrine cities are runs (recorded with mastery); older cities keep the v0.5 completion award.
const settleCity=(l,c,sample)=>c?.turning?.mode==='era'?recordRun(l,c,sample).legacy:awardCompletedCity(l,c,sample);
import {ACHIEVEMENT_INDEX} from './achievements.js';
import {auxiliaryOrigin,auxiliaryDestination} from './navigation.js';
import {ChroniclePanel,UrbanAtlas,HistoricalChart} from './chronicleUI.jsx';
import './style.css';
import './progression.css';
import './needs.css';
import './mobile.css';
import './playfield.css';
import './almanac.css';

const SAVE_KEY='civitas-v05-eras-saves'; // Preserve existing v0.5 save key for seamless upgrade.
const oldKeys=['civitas-v04-turning-saves','civitas-v03-historical-saves','civitas-v02-reviewed-saves','civitas-v02-saves','civitas-v01-saves'];
function safeJson(k){try{const v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:[];}catch{return [];}}
function loadCities(){let current;try{current=localStorage.getItem(SAVE_KEY);}catch{current=null;}const saved=current!==null?safeJson(SAVE_KEY):oldKeys.flatMap(safeJson);const ids=new Set();return saved.map(normalizeCity).filter(c=>{if(!c||ids.has(c.id))return false;ids.add(c.id);return true;});}
function compact(n){return Number(n).toLocaleString('en-US');}
function downloadBackup(cities,legacy){const blob=new Blob([JSON.stringify({format:'civitas-cities-v7',cities,legacy},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='civitas-v07-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

const AUTOSAVE_MS=4000,FRAME_MS=66;
// Phone layout (matches the 760px breakpoint in mobile.css).
const isPhone=()=>typeof window!=='undefined'&&window.matchMedia?.('(max-width:760px)').matches;
// Left sidebar: an icon rail of sections; the active one opens beside it.
// v2.1: City and Chronicle open the right-hand drawer; the others the left one.
const SIDE_SECTIONS=[['zone','Zoning',LandPlot],['build','Works',Construction],['needs','Needs',Bell],['doctrine','Doctrine',Sparkles],['taxes','Taxes',Wallet],['city','City',BarChart3],['chronicle','Chronicle',BookOpen]];
const DRAWER_TAB={city:'stats',chronicle:'history'};
// v1.6: three lenses. Zoning shows itself while a zoning tool is held.
// v2.1: three map layers, each with its own legend.
const MAP_LAYERS=[['urban','Buildings','What stands where, by use'],['zones','Zones','The land you have designated'],['geography','Roads & land','Streets, water, walls and fields']];
// Calendar speeds in months per second.
// v1.8: speeds and pacing live in src/pacing.js (Normal = 1 year per 1.5 s).
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const effectNames={housing:'Housing capacity',migration:'Migration attraction',trade:'Commerce output',industry:'Industry output',arts:'Cultural prestige',faith:'Religious influence',education:'Education',services:'Public services',transport:'Transport access',innovation:'Innovation',treasury:'Treasury income',heritage:'Heritage appeal',prosperity:'Prosperity'};
function BuildingPreview({building}){if(!building)return null;const effects=BUILDING_EFFECTS[building.kind]||{};return <div className="buildPreview"><div><span className="eyebrow">PLANNED INVESTMENT</span><b>{building.name}</b></div><p>{building.description}</p><div className="buildEffects">{Object.entries(effects).map(([key,value])=><span key={key}>{value>=0?'+':''}{typeof value==='number'&&Math.abs(value)<1?`${Math.round(value*100)}%`:value} {effectNames[key]||key}</span>)}</div><small><Coins size={12}/>{compact(building.cost)} treasury · maximum two per city</small></div>;}
function DemandPanel({city}){const rows=demand(city);return <section className="demandPanel"><div className="panelMiniHead"><span>URBAN DEMAND</span><small>What to zone next</small></div>{[['residential','Residential'],['commercial','Commercial'],['industrial','Industrial'],['civic','Civic']].map(([key,label])=>{const row=rows[key];return <div className="demandRow" key={key}><div><b>{label}</b><span>{row.level}</span></div><div className="demandTrack"><i className={row.level} style={{width:`${Math.max(4,row.value)}%`}}/></div><small>{row.reason}</small></div>})}</section>;}

// How each tax level changes a sector, in words the player can act on.
function taxNote(sector,level){
  const base={none:'No revenue · demand +35%',low:'Revenue −40% · demand +15%',average:'Standard rate',high:'Revenue +45% · demand −28%'}[level];
  if(sector!=='res')return level==='high'?`${base} · prosperity −1`:base;
  return {none:`${base} · prosperity +4`,low:`${base} · prosperity +2`,average:base,high:`${base} · prosperity −5`}[level];
}
function TaxPanel({city,s,onTax,disabled}){
  const taxes=taxesOf(city),revenue=annualRevenue(city,s,cityEffects(city)),costs=annualExpenses(city,s),upkeep=costs.total,net=revenue.total-upkeep;
  return <section className="taxPanel"><div className="panelMiniHead"><span>TAXES & BUDGET</span><small>per year</small></div>
    {TAX_SECTORS.map(sector=><div className="taxRow" key={sector.id}>
      <div className="taxHead"><b>{sector.label}</b><span>+{compact(Math.round(revenue[sector.id]))}</span></div>
      <div className="taxLevels" role="radiogroup" aria-label={`${sector.label} tax`}>{TAX_LEVELS.map(level=><button key={level} role="radio" aria-checked={taxes[sector.id]===level} className={taxes[sector.id]===level?'sel':''} disabled={disabled} onClick={()=>onTax(sector.id,level)}>{TAX_LABELS[level]}</button>)}</div>
      <small>{taxNote(sector.id,taxes[sector.id])}</small>
    </div>)}
    <div className="budgetLine"><span>Civic & other income</span><b>+{compact(Math.round(revenue.other))}</b></div>
    <div className="budgetLine"><span>Public services</span><b>−{compact(Math.round(costs.services))}</b></div>
    <div className="budgetLine"><span>Institutions & landmarks</span><b>−{compact(Math.round(costs.institutions))}</b></div>
    <div className="budgetLine"><span>Streets, buildings, walls</span><b>−{compact(Math.round(costs.maintenance+costs.walls))}</b></div>
    <div className={`budgetLine net ${net<0?'neg':''}`}><span>Net</span><b>{net>=0?'+':'−'}{compact(Math.abs(Math.round(net)))}</b></div>
    {(city.shortfall||0)>=.05?<p className="budgetWarning">Treasury empty: services are {Math.round(city.shortfall*100)}% underfunded (−{Math.min(15,Math.round(city.shortfall*30))} prosperity, fewer newcomers).</p>:net<0?<p className="budgetWarning soft">Spending exceeds income; the treasury will run dry.</p>:null}
  </section>;
}
// A district name that the player can rename in place.
function DistrictName({district,readOnly,onRename}){
  const [editing,setEditing]=useState(false),[draft,setDraft]=useState(district.name);
  const save=()=>{setEditing(false);if(draft.trim()&&draft.trim()!==district.name)onRename(district.id,draft);else setDraft(district.name);};
  if(editing)return <input className="districtInput" autoFocus value={draft} maxLength={DISTRICT_NAME_MAX} aria-label={`New name for ${district.name}`} onChange={e=>setDraft(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==='Enter')save();else if(e.key==='Escape'){setDraft(district.name);setEditing(false);}}}/>;
  return <span className="districtName"><b>{district.name}</b>{!readOnly&&<button className="renameButton" title="Rename district" aria-label={`Rename ${district.name}`} onClick={()=>{setDraft(district.name);setEditing(true);}}><Pencil size={11}/></button>}</span>;
}
// The city's identity: character compass, named districts and policies.
function IdentityPanel({city,s,onPolicy,readOnly,onDistrict,onRenameDistrict}){
  const character=characterOf(s,city.year),districts=districtDetails(city,cityOrigin(city)).list.slice().sort((a,b)=>b.count-a.count),active=activePolicies(city);
  const useName={res:'Residential',trade:'Commercial',craft:'Industrial',farm:'Farmland',civic:'Civic',hotel:'Tourism'};
  return <div className="sidecontent identityPanel">
    <div className="eyebrow">CITY CHARACTER</div><h2>{character.title}</h2>
    <p className="muted">What the city is, read from its jobs, prestige, faith and learning. Turning Points that match its character are offered more often; a strongly industrial city grows small workshops on its own.</p>
    {CHARACTER_AXES.map(k=><div key={k} className="momentumMetric"><div className="momentumName"><span>{AXIS_NAMES[k]}</span><strong>{Math.round(character.shares[k]*100)}%</strong></div><div className="momentumTrack"><div style={{width:`${Math.min(100,character.shares[k]*200)}%`,background:character.lead===k?'#6b9880':'#b59b68'}}/></div></div>)}
    <h3>DISTRICTS ({districts.length})</h3>
    {districts.length?districts.map(d=>{const i=districtDetails(city,cityOrigin(city)).list.indexOf(d);return <div className="districtRow" key={d.id}>
      <i style={{background:DISTRICT_COLORS[i%DISTRICT_COLORS.length]}}/>
      <div><DistrictName district={d} readOnly={readOnly} onRename={onRenameDistrict}/><small>{useName[d.dominant]}{d.specialised?' · specialised':''} · {compact(d.count)} buildings · since {d.founded}</small>
      <small>{compact(Math.round(d.homes))} home places · {compact(Math.round(d.jobs))} jobs{d.vacant?` · ${d.vacant} empty`:''}{d.landmarks.length?` · ${d.landmarks.length} landmark${d.landmarks.length>1?'s':''}`:''}</small></div></div>;}):<p className="muted">Districts appear once at least ten buildings stand between main roads, walls or water.</p>}
    {districts.length>0&&<button className="linkButton" onClick={onDistrict}>Show districts on the map</button>}
    <h3>POLICIES</h3>
    {POLICIES.map(p=>{const on=!!active[p.id],adopted=!!city.policies?.[p.id],issue=policyIssue(city,p.id);
      return <div className={`policyRow ${on?'on':''}`} key={p.id}>
        <div><b>{p.name}</b><small>{p.description}</small><small className="policyMeta">{p.from}–{p.to}{adopted&&!on?' · adopted, outside its era':''}{issue&&!adopted?` · ${issue}`:''}</small></div>
        <button role="switch" aria-checked={adopted} aria-label={`${p.name}: ${adopted?'adopted':'not adopted'}`} disabled={readOnly||(!adopted&&!!issue)} className={adopted?'switch on':'switch'} onClick={()=>onPolicy(p.id,!adopted)}><span/></button>
      </div>;})}
  </div>;
}
function CardOption({cardId,city,onChoose}){
 const c=getOpportunity(cardId);if(!c)return null;
 const domain=DOMAINS[c.domain];
 const owned=new Set((city.turning?.choices||[]).map(p=>p.cardId));
 const completing=SYNERGIES.find(combo=>combo.needs.includes(c.id)&&combo.needs.every(id=>id===c.id||owned.has(id)));
 const buildingOn=!!c.requiresAny?.some(id=>owned.has(id));
 const featured=c.kind==='figure'&&city.turning?.featuredFigures?.includes(c.figureId);
 const pulse=opportunityPulse(c.effects||{},c.rarity,c.kind==='figure'?'figure':'card');
 // Measured impact: the city's statistics now, with and without this card.
 const impact=useMemo(()=>{
   if(c.building&&c.kind!=='figure')return [];
   const next=selectTurningPoint(city,c.id);if(next===city)return [];
   const a=stats(city),b=stats(next),out=[];
   const pct=(k,label)=>{const d=a[k]?(b[k]-a[k])/a[k]*100:0;if(Math.abs(d)>=1)out.push({label,text:`${d>0?'+':''}${Math.round(d)}%`,weight:Math.abs(d)});};
   const pts=(k,label,scale=1)=>{const d=b[k]-a[k];if(Math.abs(d)>=scale)out.push({label,text:`${d>0?'+':''}${compact(Math.round(d))}`,weight:Math.abs(d)/scale*2});};
   pct('population','Residents');pct('gdp','GDP');pts('prosperity','Prosperity');pts('culturalPrestige','Culture',5);pts('religiousInfluence','Religion',5);pts('educationIndex','Education',5);pts('tourismAppeal','Tourism',5);
   return out.sort((x,y)=>y.weight-x.weight).slice(0,3);
 },[city,c.id]);
 const scoreChanges=Object.entries(developmentOf(city)).map(([k,v])=>({k,amount:Math.round(Math.max(pulse[k]||0,c.scorePulse?.[k]||0)*(1-Math.max(0,v-70)/100))})).filter(x=>x.amount>=8).sort((a,b)=>b.amount-a.amount).slice(0,2);

 if(turningMode(city)==='era'){
  // v2.1 card event: doctrine colour, plain effects, and what the pick steers.
  const tags=cardDoctrines(c),doc=tags.length?DOCTRINES[tags[0]]:null;
  return <button className="turncard almanacCard" onClick={()=>onChoose(c.id)} style={{'--card-color':doc?doc.color:domain.color}}>
   <span className="turncardtop"><span className="carddomain">{doc?`${doc.glyph} ${tags.map(t=>DOCTRINES[t].name).join(' + ')}`:c.kind==='figure'?'Historical figure':'Civic'}</span><span className="rarity" style={{color:RARITY_COLORS[c.rarity]}}>{c.rarity.toUpperCase()}</span></span>
   <span className="cardname">{c.name}</span>
   <span className="eventEffects">{c.kind==='figure'?<span>Joins now · {compact(c.cost||0)}</span>:cardSummary(c,city).lines.slice(0,2).map(l=><span key={l.key} className={l.good?'good':'bad'}>{l.text} {l.label}</span>)}</span>
   <span className="cardbottom"><InfoTip label={`About ${c.name}`} align="start">{c.kind==='figure'?c.description:<CardDetails city={city} card={c}/>}{doc&&<span>Taking it: the Market Hall favours {doc.name} cards for 25 years.</span>}</InfoTip><span>Choose <ChevronRight size={14}/></span></span>
  </button>;
 }
 return <button className="turncard" onClick={()=>onChoose(c.id)} style={{'--card-color':domain.color}}>
   <span className="turncardtop"><span className="carddomain">{domain.symbol} {domain.name}</span><span className="rarity" style={{color:RARITY_COLORS[c.rarity]}}>{c.rarity.toUpperCase()}</span></span>
   <span className="cardart" aria-hidden="true"><span>{domain.symbol}</span><i/><i/><i/></span>
   <span className="cardname">{c.name}</span>
   <span className="carddescription">{c.description}{scoreChanges.length>0&&<em className="momentumHint">{c.building&&c.kind!=='figure'?'After placement: ':'Immediate momentum: '}{scoreChanges.map(x=>`${AXIS_LABELS[x.k]} +${x.amount}`).join(' · ')}</em>}{impact.length>0&&<em className="impactHint">Right now: {impact.map(x=>`${x.label} ${x.text}`).join(' · ')}</em>}{c.durationPoints&&<em className="durationHint">Lasts {c.durationPoints} Turning Points, then expires.</em>}{c.effects?.crowding&&<em className="crowdingHint">Costs {c.effects.crowding} prosperity while active.</em>}{c.building&&<em className="projectHint">Construction commission — choose its map location after selection.</em>}{c.kind==='figure'&&<em className="figureCost">Treasury cost: {compact(c.cost||0)}</em>}{completing&&<em className="synergyHint">✦ Completes {completing.name}</em>}{!completing&&buildingOn&&<em className="synergyHint">✦ Supports your existing build</em>}{featured&&<em className="synergyHint">✦ Featured historical figure</em>}</span>
   <span className="cardbottom"><span>{c.kind.replace('_',' ').toUpperCase()}</span><span>Choose <ChevronRight size={14}/></span></span>
 </button>;
}
const CAPTIONED=new Set(['history','fire','flood','epidemic','landmark','works','crisis','boom','decline','omen']);
function captionText(e,city){let body=String(e.text||'').replace(/ at parcel [\d, ]+/,'').match(/^[^.!?—]*/)[0].trim();if(e.type==='history')body=body.charAt(0).toLowerCase()+body.slice(1);return `${MONTHS[city.month||0]} ${e.year}: ${body}`;}
function EventModal({city,onChoose}){
 const ev=city?.event;const def=eventDefinition(ev?.id);if(!ev||!def)return null;
 const disaster=ev.id.startsWith('disaster:');
 return <div className="turningBackdrop eventBackdrop"><section className="eventWindow" role="dialog" aria-modal="true" aria-labelledby="eventTitle">
  <div className="eyebrow">{disaster?'CALAMITY':'HISTORY KNOCKS'} · {MONTHS[city.month||0].toUpperCase()} {ev.year}</div>
  <h2 id="eventTitle">{ev.title}</h2><p className="eventText">{ev.text}</p>
  <div className="eventChoices">{ev.options.map((o,i)=><button key={o.label} onClick={()=>onChoose(i)}><strong>{o.label}</strong><span>{o.detail}</span></button>)}</div>
  <p className="muted">Your answer is written into the Chronicle and onto the map.</p>
 </section></div>;
}
function TurningModal({city,onChoose,onReroll}){
 const pending=city?.turning?.pending;if(!pending)return null;
 const active=activeSynergies(city),picked=resolvedCards(city);
 return <div className="turningBackdrop"><section className="turningWindow" role="dialog" aria-modal="true" aria-labelledby="turningTitle">
  <div className="turningHeading"><div className="eyebrow"><Sparkles size={15}/> {turningMode(city)==='era'?'A CARD EVENT · EVERY 25 YEARS':'A MOMENT THAT CHANGES HISTORY'} · {String(pending.index+1).padStart(2,'0')} / {turningCount(city)}</div><h2 id="turningTitle">{turningMode(city)==='era'?`The Almanac of ${pending.year}`:`A Turning Point · ${pending.year}`}</h2><p>{turningMode(city)==='era'?<>Pick one card for your hand <InfoTip label="About card events">These cards are never sold. Your pick is free, and the Market Hall favours its doctrine for 25 years.</InfoTip></>:`The course of ${city.name} is yours to influence. Choose one opportunity; the others will disappear.`}</p></div>
  <div className="turningCards">{pending.options.map(id=><CardOption key={id} cardId={id} city={city} onChoose={onChoose}/>)}</div>
  {turningMode(city)!=='era'&&<div className="turningFooter"><div><b>YOUR BUILD SO FAR</b><span>{picked.length?picked.slice(-4).map(c=>c.name).join(' · '):'A blank page of history'}</span></div><div><b>ACTIVE COMBINATIONS</b><span>{active.length?active.map(a=>a.name).join(' · '):'Discover combinations as you grow'}</span></div><div><b>CITY CHARACTER</b><span>{city.character?.title||'A young town'}{city.character?.lead?' · matching cards appear more often':''}</span></div></div>}
  <div className="turningActions"><span/><button onClick={onReroll} disabled={(city.turning.rerollsUsed||0)>=2+(city.legacyBonuses?.extraRerolls||0)}><RefreshCw size={15}/> Reroll · {Math.max(0,2+(city.legacyBonuses?.extraRerolls||0)-(city.turning.rerollsUsed||0))}</button></div>
 </section></div>;
}
// The Town Center card: where the city grows from, and its next upgrade.
const CENTER_EFFECTS={prosperity:v=>`+${v} prosperity`,migration:v=>`+${Math.round(v*100)}% migration`,trade:v=>`+${Math.round(v*100)}% commerce`,services:v=>`+${Math.round(v*100)}% public services`,transport:v=>`+${Math.round(v*100)}% transport`};
function centerBenefits(l){return [l.serviceRadius&&`serves homes within ${l.serviceRadius} parcels`,l.prestige&&`raises land value within ${l.prestigeRadius} parcels`,l.reach&&`town spreads ${l.reach} parcels further`,...Object.entries(l.effects).map(([k,v])=>CENTER_EFFECTS[k]?.(v))].filter(Boolean);}
function TownCenterPanel({city,chosenTool,onPlace,onUpgrade,readOnly}){
 const tc=townCenterLevel(city);
 if(!tc)return <section className="townCenter"><div className="eyebrow">TOWN CENTER</div><h3>{city.awaitingCenter?'Found your town':'No Town Center yet'}</h3>
  <p className="muted">{city.awaitingCenter?'Click dry land on the map to place the Town Center. The first streets, homes, market and church are laid out around it, and the city keeps growing from it. It cannot be moved afterwards. Time starts once it is placed.':'Place a Town Center to anchor where the city grows from. It cannot be moved afterwards.'}</p>
  <button className={chosenTool==='place:center'?'active primary':'primary'} disabled={readOnly} onClick={onPlace}><Crown size={14}/> {chosenTool==='place:center'?'Click the map to place':'Choose location'}</button></section>;
 const next=TOWN_CENTER_LEVELS[tc.level],issue=townCenterIssue(city),now=centerBenefits(tc);
 return <section className="townCenter"><div className="eyebrow">TOWN CENTER · LEVEL {tc.level}/{TOWN_CENTER_LEVELS.length}</div><h3>{tc.name}</h3>
  <p className="muted">{tc.description} Parcel {city.center.x}, {city.center.y}.</p>
  {now.length>0&&<div className="buildEffects">{now.map(t=><span key={t}>{t}</span>)}</div>}
  {next?<div className="centerNext"><b>Next: {next.name}</b><small>{next.description}</small><div className="buildEffects">{centerBenefits(next).map(t=><span key={t}>{t}</span>)}</div>
   <small>From {next.from} · {compact(next.minPopulation)} residents · {compact(next.cost)} treasury</small>
   <button disabled={readOnly||!!issue} title={issue||undefined} onClick={onUpgrade}><Crown size={14}/> {issue||`Upgrade · ${compact(next.cost)}`}</button></div>:<p className="muted">The Town Center is fully developed.</p>}
 </section>;
}
function BuildPanel({city,onSelectProject,chosenTool,onPlaceCenter,onCenterUpgrade,readOnly}){
 const allPicks=city.turning?.choices||[],picks=allPicks.filter(p=>p.via!=='hand'),active=activeSynergies(city),m=modifiers(city),yearNext=turningSchedule(city)[picks.length+(city.turning?.skipped||0)],total=turningCount(city),era=turningMode(city)==='era';
 return <div className="sidecontent buildpanel"><TownCenterPanel city={city} chosenTool={chosenTool} onPlace={onPlaceCenter} onUpgrade={onCenterUpgrade} readOnly={readOnly}/><div className="eyebrow">YOUR STRATEGIC BUILD</div><h2>{era?'Era drafts':'Turning Points'}</h2><div className="progresslabel"><b>{picks.length}</b> choices made <span>{Math.max(0,total-picks.length-(city.turning?.skipped||0))} ahead</span></div><div className="milestones">{Array.from({length:total},(_,i)=><i key={i} className={i<(city.turning?.skipped||0)?'skipped':i<(picks.length+(city.turning?.skipped||0))?'chosen':i===(picks.length+(city.turning?.skipped||0))?'next':''}/>)}</div>
 {city.turning?.pending?<p className="turnnotice">A Turning Point awaits your decision.</p>:!city.finished&&yearNext?<p className="muted">Next opportunity: year {yearNext}</p>:<p className="muted">All Turning Points have been resolved.</p>}
 {era?<><h3>DOCTRINE</h3><p className="muted">Combinations are now doctrines: cards of one doctrine reinforce each other at 2, 4, 6 and 8. See the Doctrine section.</p></>:<><h3>ACTIVE COMBINATIONS</h3>{active.length?active.map(a=><div className="buildsynergy" key={a.id} style={{borderLeftColor:DOMAINS[a.domain].color}}><strong>✦ {a.name}</strong><p>{a.description}</p></div>):<p className="muted">Combine related cards to unlock powerful city identities. Your first synergy is still waiting to emerge.</p>}</>}
 <h3>RUN BONUSES</h3>{Object.entries(m).filter(([,v])=>v!==0).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,16).map(([k,v])=><div className="stat" key={k}><span>{k==='crowding'?'Crowding (prosperity)':k==='prosperity'?'Prosperity (points)':k.replace(/([A-Z])/g,' $1').replace(/^./,v=>v.toUpperCase())}</span><b>{k==='crowding'?`−${v}`:k==='prosperity'?`${v>=0?'+':''}${v}`:`${v>=0?'+':''}${Math.round(v*100)}%`}</b></div>)}
 <h3>AWAITING CONSTRUCTION ({city.projects?.length||0})</h3>{city.projects?.length?city.projects.map(p=><div className="queuedProject" key={p.id}><b>{projectLabel(p)}</b><small>From {p.origin||"Turning Point"} · Awarded {p.issuedYear} · Free commission</small><button className={chosenTool===`place:${p.id}`?'active':''} disabled={city.finished||!!city.turning?.pending} onClick={()=>onSelectProject(p.id)}><Landmark size={13}/> {chosenTool===`place:${p.id}`?'Click map to place':'Choose location'}</button></div>):<p className="muted">No unplaced projects. Special buildings unlock through cards and historical figures.</p>}
 <h3>HISTORICAL FIGURES</h3>{city.figures?.length?city.figures.map((f,i)=><div className="buildchoice" key={`${f.id}-${i}`}><span style={{color:RARITY_COLORS[f.rarity]}}>♛</span><div><b>{f.year} · {f.name}</b><small>{f.rarity.toUpperCase()} · Permanent historical influence</small></div></div>):<p className="muted">No figures recruited yet. Figure cards can appear among Turning Points.</p>}<h3>DECISION HISTORY</h3>{allPicks.length?allPicks.slice().reverse().map((pick,i)=>{const c=getOpportunity(pick.cardId);return c?<div className="buildchoice" key={`${pick.year}-${i}`}><span style={{color:DOMAINS[c.domain].color}}>{DOMAINS[c.domain].symbol}</span><div><b>{pick.year} · {c.name}</b><small>{c.description}</small>{pick.via==='hand'?<small className={Number.isFinite(pick.until)&&city.year>pick.until?'tempExpired':'tempActive'}>{Number.isFinite(pick.until)?(city.year>pick.until?'Played from the hand · expired':`Played from the hand · active until ${pick.until}`):'Played from the hand'}</small>:c.durationPoints?(()=>{const index=picks.indexOf(pick),left=index+c.durationPoints-picks.length+1;return <small className={left>0?'tempActive':'tempExpired'}>{left>0?`Active · ends after ${left} more Turning Point${left===1?'':'s'}`:'Expired'}</small>;})():null}</div></div>:null;}):<p className="muted">Advance to the first Turning Point to choose your first city-shaping advantage.</p>}
 <p className="hint">Card effects and recruited figures stack across centuries. The Legacy Market strengthens future runs; historical crises remain independent.</p></div>;
}
function App(){
 const [legacy,setLegacy]=useState(emptyLegacy),[featured,setFeatured]=useState([]),[marketTab,setMarketTab]=useState('runs');
 const [runSetup,setRunSetup]=useState({founder:'wanderer',artifacts:[],boosters:[],hardship:0}),[summary,setSummary]=useState(null);
 const auxiliaryReturn=useRef({atlas:'home',market:'home'}),rewardSeen=useRef(null),legacyCurrent=useRef(legacy);
 legacyCurrent.current=legacy;
 const [milestoneToast,setMilestoneToast]=useState(null);
 const [saves,setSaves]=useState(loadCities),[storageReady,setStorageReady]=useState(false),[activeId,setActiveId]=useState(null),[page,setPage]=useState('home'),[preview,setPreview]=useState(null),[simulating,setSimulating]=useState(false),[selectedId,setSelectedId]=useState(null),[historicYear,setHistoricYear]=useState(null);
 const simulation=useRef(null),saveQueue=useRef(Promise.resolve()),legacyQueue=useRef(Promise.resolve());
 const [name,setName]=useState('New Valdoria'),[geo,setGeo]=useState('river'),[tool,setTool]=useState('inspect'),[layer,setLayer]=useState('urban'),[tab,setTab]=useState('stats'),[statMetric,setStatMetric]=useState('population'),[clockSpeed,setClockSpeed]=useState(NORMAL_SPEED),[message,setMessage]=useState(''),[showMobileStats,setShowMobileStats]=useState(false),[storageError,setStorageError]=useState(false);const legacyProgress=legacyInvestmentProgress(legacy);
 const [captions,setCaptions]=useState([]),[showTimelapse,setShowTimelapse]=useState(false),resumeAfterEvent=useRef(false),seenEvents=useRef({id:null,n:0});
 const [sideTab,setSideTab]=useState('zone'),[sideOpen,setSideOpen]=useState(false);
 const [showShop,setShowShop]=useState(false),[seenShop,setSeenShop]=useState({});
 const deciding=useRef(false);
 // PWA: keep the browser's install prompt so the home screen can offer it.
 const [installPrompt,setInstallPrompt]=useState(null);
 useEffect(()=>{const onPrompt=e=>{e.preventDefault();setInstallPrompt(e);};const onInstalled=()=>setInstallPrompt(null);
   window.addEventListener('beforeinstallprompt',onPrompt);window.addEventListener('appinstalled',onInstalled);
   return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled);};},[]);
 const installApp=async()=>{if(!installPrompt)return;installPrompt.prompt();try{await installPrompt.userChoice;}finally{setInstallPrompt(null);}};
 const [previewRing,setPreviewRing]=useState(null),[undoCount,setUndoCount]=useState(0),undoStack=useRef([]),undoCity=useRef(null);
 const fileInput=useRef(null);const city=saves.find(c=>c.id===activeId)||null;const playCity=preview||city;const s=useMemo(()=>playCity?stats(playCity):null,[playCity]);const selectedBasic=tool.startsWith('place:')?BASIC_BUILDINGS.find(b=>b.id===tool.slice(6))||null:null;
 const marketSamples=useMemo(()=>page==='market'||page==='home'?new Map(saves.map(c=>[c.id,stats(c)])):new Map(),[saves,page]);
 const savePopulations=useMemo(()=>new Map([...marketSamples].map(([id,sample])=>[id,sample.population])),[marketSamples]);
 const liveMilestoneCities=useMemo(()=>playCity?[playCity]:[],[playCity]);
 const liveMilestoneSamples=useMemo(()=>playCity?new Map([[playCity.id,s]]):new Map(),[playCity,s]);
 const historicalSnapshot=historicYear!==null?playCity?.snapshots?.find(v=>v.year===historicYear):null;
 const displayCity=useMemo(()=>historicalSnapshot?snapshotCity(playCity,historicalSnapshot):playCity,[playCity,historicalSnapshot]);
 const selectedBuilding=displayCity?.buildings.find(b=>b.id===selectedId)||null;
 const archiveMetrics=historicalSnapshot?playCity.history.find(h=>h.year===historicalSnapshot.year):null;
 useEffect(()=>{
   let alive=true;
   Promise.allSettled([readAtlas(),readLegacy()]).then(([cityResult,legacyResult])=>{
     if(!alive)return;
     const rows=cityResult.status==='fulfilled'?cityResult.value:null;
     const profile=legacyResult.status==='fulfilled'?legacyResult.value:(()=>{try{return JSON.parse(localStorage.getItem('civitas-v04-legacy')||'null');}catch{return null;}})();
     const cities=Array.isArray(rows)?rows.map(normalizeCity).filter(Boolean):loadCities();
     setSaves(cities);
     let l=normalizeLegacy(profile||(()=>{try{return JSON.parse(localStorage.getItem('civitas-v04-legacy')||'null');}catch{return null;}})());
     // If a city was saved at completion just before progression was written,
     // award it once during recovery; imported historic completed cities also count.
     for(const savedCity of cities){const sample=stats(savedCity);if(!savedCity.scenario)l=awardCityMilestones(l,savedCity,sample);l=settleCity(l,savedCity,sample);}
     setLegacy(l);
   }).catch(()=>{if(alive)setStorageError(true);}).finally(()=>{if(alive)setStorageReady(true);});
   return()=>{alive=false;};
 },[]);
 useEffect(()=>{
   if(!storageReady)return;
   const snapshot=saves;
   saveQueue.current=saveQueue.current.catch(()=>{}).then(()=>writeAtlas(snapshot)).then(()=>{try{localStorage.removeItem(SAVE_KEY);}catch{}setStorageError(false);}).catch(()=>{
     try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot));setStorageError(false);}catch{setStorageError(true);}
   });
 },[storageReady,saves]);
 useEffect(()=>{
   if(!storageReady)return;
   const value=legacy;
   legacyQueue.current=legacyQueue.current.catch(()=>{}).then(()=>writeLegacy(value)).catch(()=>{try{localStorage.setItem('civitas-v04-legacy',JSON.stringify(value));}catch{setStorageError(true);}});
 },[storageReady,legacy]);
 // Live milestones arrive while the clock runs, not at campaign completion.
 useEffect(()=>{
   if(!storageReady||!playCity||!s)return;
   setLegacy(previous=>{const next=playCity.scenario?previous:awardCityMilestones(previous,playCity,s);return next.claimedAchievements.length===previous.claimedAchievements.length?previous:next;});
 },[storageReady,playCity,s]);
 // Also reconcile records when cities are imported or recovered.
 useEffect(()=>{
   if(!storageReady)return;
   setLegacy(previous=>{let next=previous;for(const savedCity of saves){const sample=stats(savedCity);if(!savedCity.scenario)next=awardCityMilestones(next,savedCity,sample);if(savedCity.finished)next=settleCity(next,savedCity,sample);}return next.claimedAchievements.length===previous.claimedAchievements.length&&next.completed.length===previous.completed.length?previous:next;});
 },[storageReady,saves]);
 useEffect(()=>{
   if(!storageReady)return;
   const ids=legacy.claimedAchievements;
   if(rewardSeen.current!==null){const added=ids.filter(id=>!rewardSeen.current.has(id)).map(id=>ACHIEVEMENT_INDEX[id]).filter(Boolean);if(added.length)setMilestoneToast({name:added.length===1?added[0].name:`${added.length} milestones earned`,points:added.reduce((sum,a)=>sum+a.points,0)});}
   rewardSeen.current=new Set(ids);
 },[storageReady,legacy.claimedAchievements]);
 useEffect(()=>{if(!milestoneToast)return;const timer=setTimeout(()=>setMilestoneToast(null),8000);return()=>clearTimeout(timer);},[milestoneToast]);
 const persist=useCallback(c=>{setSaves(prev=>[c,...prev.filter(v=>v.id!==c.id)]);setActiveId(c.id);},[]);
 // Save immediately when the tab is hidden or closed while the clock is running.
 useEffect(()=>{const flush=()=>{const run=simulation.current;if(run?.current&&document.visibilityState==='hidden'){run.savedAt=Date.now();persist(run.current);}};document.addEventListener('visibilitychange',flush);window.addEventListener('pagehide',flush);return()=>{document.removeEventListener('visibilitychange',flush);window.removeEventListener('pagehide',flush);};},[persist]);
 const start=()=>{if(!storageReady)return;setHistoricYear(null);setSelectedId(null);const founded=foundRun(prepareFounding(makeCity(name,geo,Math.floor(Math.random()*0x7fffffff))),legacyCurrent.current,runSetup,featured);const city=founded.city;legacyCurrent.current=founded.legacy;setLegacy(founded.legacy);setRunSetup(v=>({...v,boosters:[]}));setSummary(null);persist(city);setPage('game');setTab('build');setMessage('');setTool('place:center');};
 const [scenarioBusy,setScenarioBusy]=useState(false);
 const beginScenario=async(id,trinkets)=>{if(!storageReady||scenarioBusy)return;const def=SCENARIO_INDEX[id];setScenarioBusy(true);
   try{let pre=null;if(def.start.from!=='fresh'){const r=await fetch(scenarioUrl(id));if(!r.ok)throw Error('missing');pre=await r.json();}
     const out=startScenario(id,legacyCurrent.current,{trinkets},pre);if(out.error)throw Error(out.error);
     setHistoricYear(null);setSelectedId(null);legacyCurrent.current=out.legacy;setLegacy(out.legacy);setSummary(null);persist(out.city);setPage('game');setTab('build');setTool('inspect');setMessage(`${def.name}: ${def.blurb}`);
   }catch(e){window.alert('The scenario could not be opened. Check your connection and try again.');}
   finally{setScenarioBusy(false);}};
 const stopSimulation=()=>{if(simulation.current){clearTimeout(simulation.current.timer);if(simulation.current.current)persist(simulation.current.current);simulation.current=null;}setPreview(null);setSimulating(false);};
 const goHome=()=>{stopSimulation();setHistoricYear(null);setSelectedId(null);setPage('home');};
 const openAuxiliary=(destination,section)=>{
   stopSimulation();
   if(page!==destination)auxiliaryReturn.current[destination]=auxiliaryOrigin(page,!!city,auxiliaryReturn.current);
   if(section)setMarketTab(section);
   setPage(destination);
 };
 const backFromAuxiliary=destination=>setPage(auxiliaryDestination(auxiliaryReturn.current[destination],!!city));
 const openCityFromAtlas=id=>{setActiveId(id);setPage('game');setHistoricYear(null);setSelectedId(null);setTab('history');setMessage('Viewing the selected city Chronicle.');setShowMobileStats(false);};
 // The clock runs on a steady ~15 fps timer; each tick advances however many
 // months the chosen speed has accumulated (capped so a slow device catches up
 // gracefully). Edits made meanwhile are applied straight to the running city.
 const runClock=rate=>{
   if(historicYear!==null)return;
   const label=(SPEEDS.find(([r])=>r===rate)||[])[1]||`${rate}`;
   if(simulation.current){simulation.current.rate=rate;setClockSpeed(rate);setMessage(`Calendar speed ${label}.`);return;}
   if(city?.awaitingCenter){setTool('place:center');setTab('build');setMessage('Place the Town Center first: click dry land on the map where the town should begin.');return;}
   if(!city||city.finished||city.turning?.pending||city.event||city.charterOffer||city.ageWelcome)return;setClockSpeed(rate);setSimulating(true);setMessage(`Calendar running at ${label}. You can keep zoning and building.`);
   const run={current:city,rate,timer:null,savedAt:Date.now(),acc:0,last:performance.now()};simulation.current=run;
   const frame=()=>{if(simulation.current!==run)return;
    const now=performance.now();run.acc+=Math.min(.5,(now-run.last)/1000)*run.rate*paceFactor(run.current,run.rate,deciding.current);run.last=now;
    const months=Math.min(4,Math.floor(run.acc));run.acc-=months;
    if(months>0){const countBefore=run.current.events.length;run.current=advanceMonths(run.current,months);
     const events=run.current.events.slice(countBefore).filter(e=>['fire','flood','epidemic','boom','works','crisis','vacancy','abandonment','shop','need','decline','omen','history','need_met'].includes(e.type));if(events.length){const event=events.at(-1);setMessage(`${event.year} · ${event.text}`);}
     setPreview(run.current);}
    if(run.current.ageWelcome){persist(run.current);simulation.current=null;setPreview(null);setSimulating(false);resumeAfterEvent.current=true;setMessage(`${run.current.year}: a new Age begins.`);}
    else if(run.current.event){persist(run.current);simulation.current=null;setPreview(null);setSimulating(false);resumeAfterEvent.current=true;setMessage(`${MONTHS[run.current.month]} ${run.current.year}: ${run.current.event.title}.`);}
    else if(run.current.turning?.pending){persist(run.current);simulation.current=null;setPreview(null);setSimulating(false);resumeAfterEvent.current=true;setMessage(`${MONTHS[run.current.month]} ${run.current.year}: a card event.`);}
    else if(run.current.finished){const done=run.current,result=recordRun(legacyCurrent.current,done,stats(done));legacyCurrent.current=result.legacy;setLegacy(result.legacy);if(result.run)setSummary({cityId:done.id,run:result.run,unlocked:result.unlocked});persist(done);simulation.current=null;setPreview(null);setSimulating(false);setMessage(done.ruined?`${done.year}: ${done.name} has fallen into Ruin. The Chronicle closes early.`:'Chronicle complete — explore its historical record.');}
    else{
     // Autosave the running city every few seconds of real time.
     if(Date.now()-run.savedAt>=AUTOSAVE_MS){run.savedAt=Date.now();persist(run.current);}
     run.timer=setTimeout(frame,FRAME_MS);
    }
   };run.timer=setTimeout(frame,FRAME_MS);
 };
 // Every player edit goes through here: it lands on the running city when the
 // clock is going, or on the saved city when paused, and is recorded for undo.
 const applyEdit=(fn,label,{record=true,founding=false}={})=>{
   const base=simulation.current?.current||city;
   if(!base||base.finished||historicYear!==null)return null;
   if(base.awaitingCenter&&!founding){setTool('place:center');setMessage('Found the town first: click dry land on the map to place its Town Center.');return null;}
   const result=fn(base);
   if(result?.error){setMessage(`Cannot do that: ${result.error}.`);return null;}
   if(!result?.city||result.city===base)return null;
   if(simulation.current){simulation.current.current=result.city;setPreview(result.city);}else persist(result.city);
   if(record&&result.undo){if(undoCity.current!==base.id){undoStack.current=[];undoCity.current=base.id;}undoStack.current.push({label,undo:result.undo});if(undoStack.current.length>40)undoStack.current.shift();setUndoCount(undoStack.current.length);}
   if(label)setMessage(result.message||label);
   return result;
 };
 const undo=()=>{
   if(undoCity.current!==(city?.id)){undoStack.current=[];setUndoCount(0);return;}
   const entry=undoStack.current.pop();setUndoCount(undoStack.current.length);if(!entry)return;
   applyEdit(c=>({city:revertEdit(c,entry.undo)}),`Undone: ${entry.label}.`,{record:false});
 };
 useEffect(()=>{undoStack.current=[];undoCity.current=activeId;setUndoCount(0);},[activeId]);
 // Picking a tool anywhere (Build tab, keyboard, a new run) shows its section.
 useEffect(()=>{const id=tool.startsWith('place:')?null:ZONES[tool]||FORMS[tool]||tool==='erase'||tool==='demolish'?'zone':null;if(id){setSideTab(id);setSideOpen(!isPhone());}},[tool]);
 // Keyboard: Ctrl/Cmd+Z undo, Space pause/resume, Escape back to Explore.
 const keys=useRef({});keys.current={undo,runClock,stopSimulation,clockSpeed};
 useEffect(()=>{const onKey=e=>{if(page!=='game'||e.target.closest?.('input,select,textarea'))return;
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();keys.current.undo();}
   else if(e.key===' '){e.preventDefault();if(simulation.current){keys.current.stopSimulation();setMessage('Paused. Edits still apply; press a speed or Space to continue.');}else keys.current.runClock(keys.current.clockSpeed);}
   else if(e.key==='Escape'){setTool('inspect');setPreviewRing(null);}};
   window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[page]);
 const onPolicy=(id,on)=>applyEdit(c=>setPolicy(c,id,on),`${on?'Adopted':'Repealed'}: ${POLICIES.find(p=>p.id===id).name}`);
 const onTax=(sector,level)=>applyEdit(c=>setTax(c,sector,level),`${TAX_SECTORS.find(v=>v.id===sector).label} tax set to ${TAX_LABELS[level].toLowerCase()}`);
 const onWall=()=>{setPreviewRing(null);applyEdit(c=>buildWall(c),'City wall raised around the core');};
 const onCenterUpgrade=()=>{const r=applyEdit(c=>upgradeTownCenter(c),'Town Center upgraded');if(r?.level)setMessage(`The Town Center is now the ${r.level.name}.`);};
 const onRing=kind=>applyEdit(c=>convertWall(c,kind),kind==='canal'?'The innermost wall became a canal ring':'The innermost wall became a ring boulevard');
 // v1.5 cards: every deck action is an edit, so it works while the clock runs.
 const deckEdit=(fn,label)=>applyEdit(c=>{const r=fn(c);return r.error?{...r,error:r.error.replace(/\.$/,'')}:{...r,message:r.message||label};},label,{record:false});
 const onBuyCard=uid=>deckEdit(c=>buyCard(c,uid),'Card added to your hand');
 const onBuyPack=()=>deckEdit(c=>{const r=buyPack(c);return r.error?r:{...r,message:`Pack opened: ${r.city.events.at(-1).text.replace(/^Opened a sealed pack: /,'').replace(/\.$/,'')}.`};},'Pack opened');
 const onReroll=()=>deckEdit(c=>rerollShop(c,stats(c)),'The Market Hall laid out a new selection');
 const onSellCard=uid=>deckEdit(c=>{const r=sellCard(c,uid);return r.error?r:{...r,message:`Card sold for ${compact(r.refund)}.`};},'Card sold');
 const onMergeCards=uids=>deckEdit(c=>{const r=mergeCards(c,uids);return r.error?r:{...r,message:r.city.events.at(-1).text};},'Cards merged');
 const onPlayCard=uid=>{const held=deckOf(simulation.current?.current||city).hand.find(h=>h.uid===uid),hc=held&&CARD_INDEX[held.cardId];
   if(hc?.urban){setTool(`place:urban:${uid}`);setMessage(`${hc.name}: tap the map where it goes. The dashed streets show the plan.`);return;}
   const r=deckEdit(c=>{const out=playCard(c,uid);if(out.error)return out;const card=getOpportunity(deckOf(c).hand.find(h=>h.uid===uid)?.cardId);const lines=cardSummary(card,c).lines.slice(0,3).map(l=>`${l.text} ${l.label.toLowerCase()}`).join(', ');return {...out,card,message:card.building?`${card.name}: tap a free parcel on the map to build it.`:`${card.name} played${lines?`: ${lines}`:''}.`};},'Card played');
   if(r?.card?.building){const project=(r.city.projects||[]).at(-1);if(project){setTool(`place:${project.id}`);setMessage(`${r.card.name}: tap an empty parcel on the map to place it.`);}}};
 useEffect(()=>{deciding.current=showShop||(sideOpen&&sideTab==='needs');},[showShop,sideOpen,sideTab]);
 const onBanish=uid=>deckEdit(c=>banishOffer(c,uid),'Card banished for this run');
 const onLock=uid=>deckEdit(c=>{const r=lockOffer(c,uid);return r.error?r:{...r,message:r.locked?'Offer locked: it stays for sale after the next restock.':'Offer unlocked.'};},'Offer lock changed');
 const onRetire=id=>deckEdit(c=>retireCard(c,id),'Decree retired');
 const openShop=()=>{setShowShop(true);const y=deckOf(playCity).shop?.year;if(playCity&&y!=null)setSeenShop(m=>({...m,[playCity.id]:y}));};
 // v1.6: answer history ahead and build what a district needs, while time runs.
 const onRingRoad=()=>applyEdit(c=>buildRingRoad(c),'Ring road built');
 const onHeritage=(site,opt)=>applyEdit(c=>{const r=decideSite(c,site,opt);if(r.error)return r;return {...r,message:`${HERITAGE[site.kind].title}: ${r.option.label.toLowerCase()}.`};},'Decision taken',{record:false});
 const onAnswerOmen=(id,i)=>applyEdit(c=>{const r=answerOmen(c,id,i);if(r.error)return r;const o=omensOf(r.city).find(x=>x.id===id);return {...r,message:`${o.title}: the council will ${o.options[i].label.toLowerCase()} (${o.due}).`};},'Decision recorded',{record:false});
 const openNeeds=()=>{setSideTab('needs');setSideOpen(true);};
 const onBuildForNeed=(b,n,via={})=>{
   // v2.1 doctrine cities: the need is answered with the building's card (buy it first if needed).
   if(via.offer){const r=deckEdit(c=>{const b=buyCard(c,via.offer);if(b.error)return b;const p=playCard(b.city,via.offer);if(p.error)return p;return {...p,message:`${CARD_INDEX[deckOf(c).shop.offers.find(o=>o.uid===via.offer).cardId].name} bought: tap a free parcel inside the ring on the map.`};},'Card bought');
     const project=(r?.city.projects||[]).at(-1);if(project){setTool(`place:${project.id}`);}return;}
   if(via.uid){onPlayCard(via.uid);return;}
   setTool(`place:${b.id}`);setMessage(`Place the ${b.name} in ${n.name}: tap a free parcel inside the ring on the map.`);};
 const onMarker=m=>{openNeeds();setMessage(m.type==='need'?`${m.item.name} needs ${NEEDS[m.item.kind].label.toLowerCase()}. ${NEEDS[m.item.kind].why}`:`${m.item.title} · ${m.item.due}: choose a response in Needs.`);};
 const answerEvent=i=>{if(!city?.event)return;const next=resolveEvent(city,i);if(next===city)return;persist(next);setMessage(`${next.year} · ${next.events.at(-1).title}: ${next.events.at(-1).choice}.`);};
 // After answering, the clock resumes at the same speed if it was running.
 // It waits while an event or a Turning Point is still open.
 useEffect(()=>{if(page==='game'&&city&&!city.event&&!city.ageWelcome&&!city.charterOffer&&!city.turning?.pending&&resumeAfterEvent.current&&!simulation.current){resumeAfterEvent.current=false;if(!city.finished)runClock(clockSpeed);}},[city,page]);
 // New events with a place on the map become captions that fade after a few seconds.
 useEffect(()=>{if(!playCity){return;}const seen=seenEvents.current,n=playCity.events.length;
   if(seen.id!==playCity.id||n<seen.n){seenEvents.current={id:playCity.id,n};return;}
   if(n===seen.n)return;const fresh=playCity.events.slice(seen.n).filter(e=>CAPTIONED.has(e.type)||/era begins/.test(e.text||''));seenEvents.current={id:playCity.id,n};
   if(!fresh.length)return;const o=cityOrigin(playCity),t0=performance.now();
   setCaptions(list=>[...list.filter(c=>t0-c.t0<CAPTION_MS),...fresh.slice(-3).map((e,i)=>({text:captionText(e,playCity),x:Number.isFinite(e.x)?e.x:o.x+.5,y:Number.isFinite(e.y)?e.y:o.y-2+i*3,t0:t0+i*500}))].slice(-4));},[playCity]);
 const pickCard=cardId=>{if(!city?.turning?.pending)return;const next=selectTurningPoint(city,cardId);if(next===city)return;persist(next);setTab('build');const card=getOpportunity(cardId);setMessage(card.building?`${card.name}: construction project awarded. Select a location under Projects and Buildings.`:`${next.year} · ${card.name} added to your city's history.`);};
 const reroll=()=>{if(!city?.turning?.pending)return;const next=rerollTurningPoint(city);if(next!==city){persist(next);setMessage('Three new possible futures have been drawn.');}};
 const onSignCharter=i=>{const r=applyEdit(c=>{const out=signCharter(c,i);return out.error?out:{city:{...out.city,ageWelcome:null},message:`Charter signed: ${charterLine(c.charterOffer[i])} by ${c.charterOffer[i].by}.`};},'Charter signed',{record:false});if(r)resumeAfterEvent.current=true;};
 const onContinueAge=()=>{applyEdit(c=>({city:{...c,ageWelcome:null}}),'',{record:false});resumeAfterEvent.current=true;};
 const purchase=(type,id)=>{if(!storageReady)return;const previous=legacyCurrent.current,next=buyLegacy(previous,type,id);if(next.points===previous.points)return;legacyCurrent.current=next;setLegacy(next);};
 const purchasePack=id=>{if(!storageReady)return null;const result=openFigurePack(legacyCurrent.current,id);if(result.figure){legacyCurrent.current=result.legacy;setLegacy(result.legacy);}return result;};
 const onZone=(rect,type)=>{
   if(type==='demolish'){applyEdit(c=>demolishArea(c,rect.x,rect.y,rect.w,rect.h),`Demolished buildings and lanes in ${rect.w} × ${rect.h} parcels`);return;}
   if(type==='erase'){applyEdit(c=>{const next=clearZone(c,rect.x,rect.y,rect.w,rect.h);return next===c?{city:c,error:'there is no zoning there to clear'}:{city:next,undo:{kind:'zones',zones:c.zones}};},`Zoning cleared · ${rect.w} × ${rect.h} parcels. Existing buildings stay`);return;}
   applyEdit(c=>{const out=zoneLand(c,rect.x,rect.y,rect.w,rect.h,type);if(out.error)return out;const turn=rezonedOf(out.city).length-rezonedOf(c).length;return {...out,message:`${(FORMS[type]||ZONES[type]).label} designated · ${out.cells?`${out.cells} new parcels surveyed for ${compact(out.cost)}`:'rezoned at no cost'}.${turn>0?` ${turn} building${turn===1?'':'s'} there will change over the next twenty years.`:' Streets will grow toward it.'}`};},'Zoned');
 };
 const onPlace=(id,x,y)=>{
   if(id==='center'){const r=applyEdit(c=>placeTownCenter(c,x,y),'Town Center placed',{founding:true,record:false});if(r){setTool('inspect');setTab('build');setMessage(`${r.city.name} is founded around its Town Center. Draw zones, or press a speed to begin.`);}return;}
   if(id==='bridge'){const r=applyEdit(c=>buildBridge(c,x,y),'Bridge built');if(r)setTool('inspect');return;}
   if(id.startsWith('urban:')){const uid=Number(id.slice(6));const r=applyEdit(c=>{const out=playUrbanCard(c,uid,x,y);return out.error?out:{...out,message:out.city.events.at(-1).text};},'Laid out',{record:false});if(r)setTool('inspect');return;}
   const r=applyEdit(c=>{const project=(c.projects||[]).find(p=>p.id===id),basic=BASIC_BUILDINGS.find(b=>b.id===id);const out=placeConstruction(c,id,x,y);if(out.error)return out;return {...out,undo:{kind:'place',buildingId:out.placed.id,refund:project?0:basic?.cost||0,project:project||null},message:`${out.placed.label} constructed at ${Math.floor(x)}, ${Math.floor(y)}.`};},'Constructed');
   if(r){setTool('inspect');setTab('build');}
 };
 const onInspect=building=>{setSelectedId(building?.id||null);if(building){setTab('building');setShowMobileStats(true);}};
 const protectSelected=value=>{if(!selectedId)return;applyEdit(c=>{const next=setProtection(c,selectedId,value);return {city:next,undo:{kind:'protect',id:selectedId,value:!value}};},value?'Building protected from redevelopment and demolition':'Building may now be redeveloped or demolished');};
 const remove=id=>{const item=saves.find(x=>x.id===id);if(!storageReady||!item||!window.confirm(`Delete ${item.name} and its chronicle? This cannot be undone without a backup.`))return;setSaves(v=>v.filter(x=>x.id!==id));if(activeId===id){setActiveId(null);setPage('home');}};
 const importSaves=async e=>{const f=e.target.files?.[0];if(!f)return;try{const contents=JSON.parse(await f.text());const rows=Array.isArray(contents)?contents:contents?.cities;if(!Array.isArray(rows))throw Error('Invalid save format');const imported=rows.map(normalizeCity).filter(Boolean);if(!imported.length)throw Error('No valid cities in file');if(contents?.legacy){const importedProfile=normalizeLegacy(contents.legacy);if(window.confirm('This backup includes a Legacy Market profile. Restore its unlocks and currency as well?'))setLegacy(importedProfile);}
 setSaves(prev=>{const map=new Map(prev.map(c=>[c.id,c]));for(const c of imported)map.set(c.id,c);return [...map.values()];});setMessage(`Imported ${imported.length} cities.`);}catch(err){window.alert(`Unable to import: ${err.message}`);}finally{e.target.value='';}};
 return <div className={`app ${page==='game'&&city?'inGame':''}`}>
  {!(page==='game'&&city)&&<header><button className="brand" onClick={goHome} aria-label="Return to CIVITAS home"><Landmark size={22}/><span>CIVITAS</span><small>CHRONICLE OF CITIES</small></button><div className="headerRight"><span>GEOMETRIC HISTORY SIMULATOR</span>{installPrompt&&page!=='game'&&<button className="installApp" onClick={installApp}><Download size={15}/> Install app</button>}<span className="version">v3.1</span></div></header>}
  {page==='scenarios'?<ScenariosPage legacy={legacy} busy={scenarioBusy} onBack={()=>setPage('home')} onStart={beginScenario}/>:page==='world'?<WorldCitiesPage legacy={legacy} onBack={()=>setPage('home')}/>:page==='market'?<Market legacy={legacy} onPurchase={purchase} onOpenPack={purchasePack} onBack={()=>backFromAuxiliary('market')} backLabel={auxiliaryReturn.current.market==='game'&&city?`Return to ${city.name}`:'Home'} tab={marketTab} setTab={setMarketTab} cities={saves} samples={marketSamples} ready={storageReady}/>:page==='atlas'?<UrbanAtlas cities={saves} onBack={()=>backFromAuxiliary('atlas')} backLabel={auxiliaryReturn.current.atlas==='game'&&city?`Return to ${city.name}`:'Home'} activeCityId={activeId} onOpen={openCityFromAtlas}/>:page==='home'||!city?<Home legacy={legacy} saves={saves} populations={savePopulations} ready={storageReady}
      warning={<>{!storageReady&&<p className="muted">Loading your cities…</p>}{storageError&&<p className="warning">Browser storage is unavailable or full. Export your cities as a backup.</p>}<input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importSaves}/></>}
      onContinue={id=>{setActiveId(id);setPage('game');setHistoricYear(null);setSelectedId(null);setMessage('');}} onDelete={remove} onStart={start}
      name={name} setName={setName} geo={geo} setGeo={setGeo} setup={<FoundingSetup legacy={legacy} setup={runSetup} setSetup={setRunSetup}/>}
      onScenarios={()=>{stopSimulation();setPage('scenarios');}} onWorld={()=>{stopSimulation();setPage('world');}} onLegacy={()=>openAuxiliary('market')} onAtlas={()=>openAuxiliary('atlas')}
      onExport={()=>downloadBackup(saves,legacy)} onImport={()=>fileInput.current?.click()}/>:
    <GameScreen city={playCity} s={s} legacy={legacy} simulating={simulating} clockSpeed={clockSpeed} runClock={runClock} stopSimulation={()=>{stopSimulation();setMessage('Paused');}}
      tool={tool} setTool={setTool} message={message} captions={captions} undo={undo} undoCount={undoCount} goHome={goHome}
      onZone={onZone} onPlace={onPlace} onInspect={b=>setSelectedId(b?.id||null)} selectedBuilding={selectedBuilding} protect={protectSelected}
      onPlayCard={onPlayCard} onBuyCard={onBuyCard} onBuyPack={onBuyPack} onReroll={onReroll} onSellCard={onSellCard} onRetire={onRetire} shopFresh={deckOf(playCity).shop!=null&&seenShop[playCity.id]!==deckOf(playCity).shop.year}
      onTax={onTax} onAnswerOmen={onAnswerOmen} onHeritage={onHeritage} onRingRoad={onRingRoad} onBuildForNeed={onBuildForNeed} onWall={onWall} onRing={onRing} onCenterUpgrade={onCenterUpgrade}
      pickCard={pickCard} answerEvent={answerEvent} onSignCharter={onSignCharter} onContinueAge={onContinueAge}
      onSummary={legacy.runs.some(r=>r.id===playCity.id)?()=>setSummary({cityId:playCity.id,run:legacy.runs.find(r=>r.id===playCity.id),unlocked:[]}):null}/>}
 {summary&&page==='game'&&city?.id===summary.cityId&&<RunSummary run={summary.run} unlocked={summary.unlocked} legacy={legacy} onClose={()=>setSummary(null)} onMarket={()=>{setSummary(null);setMarketTab('runs');openAuxiliary('market');}}/>}
 {milestoneToast&&<div className="milestoneToast" role="status"><Medal size={22}/><div><b>{milestoneToast.name}</b><span>+{milestoneToast.points} Legacy Points</span></div><button onClick={()=>{setMilestoneToast(null);openAuxiliary('market','achievements');}}>View</button><button aria-label="Dismiss milestone" onClick={()=>setMilestoneToast(null)}>×</button></div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
// PWA: offline play and home-screen install (production builds only).
if(import.meta.env.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL}).catch(()=>{});});
