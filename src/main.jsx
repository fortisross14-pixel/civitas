import {AXIS_LABELS,opportunityPulse,developmentOf} from './development.js';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Landmark,Play,FastForward,Plus,ArrowLeft,Save,MousePointer2,BarChart3,BookOpen,Trash2,Map as MapIcon,Download,Upload,Info,Check,RotateCcw,Maximize2,ShieldCheck,ShieldOff,Clock3,Building2,Sparkles,Layers3,Compass,Crown,ChevronRight,Star,History,TrendingUp,Hourglass,Coins,Lock,RefreshCw,UserRound,ShoppingBag,Medal,GitCompareArrows,Eraser,Hammer,Undo2,Castle,Waves,Route,Pause,Wallet,Flag,LandPlot,Construction,Layers,Pencil}from'lucide-react';
import{W,H,END_YEAR,ZONES,terrain,makeCity,seedTown,stats,demand,advance,advanceMonths,addZone,eraAt,zoneCell,normalizeCity,snapshotCity,setProtection,placeConstruction,cityEffects,STYLE_NAMES,styleAt,selectTurningPoint,rerollTurningPoint,getOpportunity,tourismUnlocked,cityOrigin,clearZone,zoneLand,zoningCost,setTax,demolishArea,buildWall,convertWall,buildBridge,publicWorkIssue,publicWorkCost,PUBLIC_WORKS,wallTarget,revertEdit,POLICIES,policyIssue,setPolicy,activePolicies,districtDetails,cityFields,resolveEvent,renameDistrict,DISTRICT_NAME_MAX,prepareFounding,placeTownCenter,upgradeTownCenter,townCenterIssue,townCenterLevel,TOWN_CENTER_LEVELS}from'./sim';
import {CAPTION_MS} from './CityMap.jsx';
import {Timelapse} from './Timelapse.jsx';
import {eventDefinition} from './events.js';
import {AXIS_NAMES,CHARACTER_AXES,characterOf} from './character.js';
import {DISTRICT_COLORS} from './CityMap.jsx';
import {CityMap} from './CityMap.jsx';
import {TAX_SECTORS,TAX_LEVELS,TAX_LABELS,taxesOf,annualRevenue,annualUpkeep,annualExpenses} from './economy.js';
import {CARD_INDEX,CARDS,DOMAINS,RARITY_COLORS,SYNERGIES,activeSynergies,resolvedCards,turningYears,modifiers} from './turningPoints';
import{readAtlas,writeAtlas,readLegacy,writeLegacy}from'./storage';
import {BASIC_BUILDINGS,basicsForYear,SPECIAL_BUILDINGS,BUILDING_EFFECTS,projectLabel} from './construction.js';
import {FIGURE_INDEX,emptyLegacy,normalizeLegacy,buyLegacy,openFigurePack,startRunProfile,awardCompletedCity,awardCityMilestones,legacyInvestmentProgress} from './legacy';
import {Market,AchievementLedger} from './Market.jsx';
import {ACHIEVEMENT_INDEX} from './achievements.js';
import {auxiliaryOrigin,auxiliaryDestination} from './navigation.js';
import {ChroniclePanel,UrbanAtlas,HistoricalChart} from './chronicleUI.jsx';
import './style.css';
import './progression.css';

const SAVE_KEY='civitas-v05-eras-saves'; // Preserve existing v0.5 save key for seamless upgrade.
const oldKeys=['civitas-v04-turning-saves','civitas-v03-historical-saves','civitas-v02-reviewed-saves','civitas-v02-saves','civitas-v01-saves'];
function safeJson(k){try{const v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:[];}catch{return [];}}
function loadCities(){let current;try{current=localStorage.getItem(SAVE_KEY);}catch{current=null;}const saved=current!==null?safeJson(SAVE_KEY):oldKeys.flatMap(safeJson);const ids=new Set();return saved.map(normalizeCity).filter(c=>{if(!c||ids.has(c.id))return false;ids.add(c.id);return true;});}
function compact(n){return Number(n).toLocaleString('en-US');}
function downloadBackup(cities,legacy){const blob=new Blob([JSON.stringify({format:'civitas-cities-v7',cities,legacy},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='civitas-v07-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

const AUTOSAVE_MS=4000,FRAME_MS=66;
// Left sidebar: an icon rail of sections; the active one opens beside it.
const SIDE_SECTIONS=[['zone','Zoning',LandPlot],['build','Build',Construction],['taxes','Taxes',Wallet],['layers','Layers',Layers]];
const MAP_LAYERS=[['urban','Urban map','The city as a surveyor drew it'],['districts','Districts','Named quarters'],['zones','Zoning','Designated land uses'],['value','Land value','Prestige versus smoke'],['pull','Growth pull','Where homes and shops want to grow'],['pollution','Pollution','Workshop and factory smoke'],['coverage','Public services','Which homes are served'],['economy','Economic land use','Jobs by sector'],['age','Building age','Construction era of each block'],['heritage','Historic preservation','Protected and 120+ year old'],['influence','Landmarks','Cultural and civic influence']];
// Calendar speeds in months per second.
const SPEEDS=[[3,'1×'],[6,'2×'],[12,'4×'],[36,'MAX']];
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

 return <button className="turncard" onClick={()=>onChoose(c.id)} style={{'--card-color':domain.color}}>
   <span className="turncardtop"><span className="carddomain">{domain.symbol} {domain.name}</span><span className="rarity" style={{color:RARITY_COLORS[c.rarity]}}>{c.rarity.toUpperCase()}</span></span>
   <span className="cardart" aria-hidden="true"><span>{domain.symbol}</span><i/><i/><i/></span>
   <span className="cardname">{c.name}</span>
   <span className="carddescription">{c.description}{scoreChanges.length>0&&<em className="momentumHint">{c.building&&c.kind!=='figure'?'After placement: ':'Immediate momentum: '}{scoreChanges.map(x=>`${AXIS_LABELS[x.k]} +${x.amount}`).join(' · ')}</em>}{impact.length>0&&<em className="impactHint">Right now: {impact.map(x=>`${x.label} ${x.text}`).join(' · ')}</em>}{c.durationPoints&&<em className="durationHint">Lasts {c.durationPoints} Turning Points, then expires.</em>}{c.effects?.crowding&&<em className="crowdingHint">Costs {c.effects.crowding} prosperity while active.</em>}{c.building&&<em className="projectHint">Construction commission — choose its map location after selection.</em>}{c.kind==='figure'&&<em className="figureCost">Treasury cost: {compact(c.cost||0)}</em>}{completing&&<em className="synergyHint">✦ Completes {completing.name}</em>}{!completing&&buildingOn&&<em className="synergyHint">✦ Supports your existing build</em>}{featured&&<em className="synergyHint">✦ Featured historical figure</em>}</span>
   <span className="cardbottom"><span>{c.kind.replace('_',' ').toUpperCase()}</span><span>Choose <ChevronRight size={14}/></span></span>
 </button>;
}
const CAPTIONED=new Set(['history','fire','flood','epidemic','landmark','works','crisis','boom']);
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
  <div className="turningHeading"><div className="eyebrow"><Sparkles size={15}/> A MOMENT THAT CHANGES HISTORY · {String(pending.index+1).padStart(2,'0')} / 20</div><h2 id="turningTitle">A Turning Point · {pending.year}</h2><p>The course of {city.name} is yours to influence. Choose one opportunity; the others will disappear.</p></div>
  <div className="turningCards">{pending.options.map(id=><CardOption key={id} cardId={id} city={city} onChoose={onChoose}/>)}</div>
  <div className="turningFooter"><div><b>YOUR BUILD SO FAR</b><span>{picked.length?picked.slice(-4).map(c=>c.name).join(' · '):'A blank page of history'}</span></div><div><b>ACTIVE COMBINATIONS</b><span>{active.length?active.map(a=>a.name).join(' · '):'Discover combinations as you grow'}</span></div><div><b>CITY CHARACTER</b><span>{city.character?.title||'A young town'}{city.character?.lead?' · matching cards appear more often':''}</span></div></div>
  <div className="turningActions"><span><RefreshCw size={15}/> Rerolls remaining: {Math.max(0,2+(city.legacyBonuses?.extraRerolls||0)-(city.turning.rerollsUsed||0))}</span><button onClick={onReroll} disabled={(city.turning.rerollsUsed||0)>=2+(city.legacyBonuses?.extraRerolls||0)}><RefreshCw size={15}/> Reroll all three</button></div>
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
 const picks=city.turning?.choices||[],active=activeSynergies(city),m=modifiers(city),yearNext=turningYears()[picks.length+(city.turning?.skipped||0)];
 return <div className="sidecontent buildpanel"><TownCenterPanel city={city} chosenTool={chosenTool} onPlace={onPlaceCenter} onUpgrade={onCenterUpgrade} readOnly={readOnly}/><div className="eyebrow">YOUR STRATEGIC BUILD</div><h2>Turning Points</h2><div className="progresslabel"><b>{picks.length}</b> choices made <span>{Math.max(0,20-picks.length-(city.turning?.skipped||0))} ahead</span></div><div className="milestones">{Array.from({length:20},(_,i)=><i key={i} className={i<(city.turning?.skipped||0)?'skipped':i<(picks.length+(city.turning?.skipped||0))?'chosen':i===(picks.length+(city.turning?.skipped||0))?'next':''}/>)}</div>
 {city.turning?.pending?<p className="turnnotice">A Turning Point awaits your decision.</p>:!city.finished&&yearNext?<p className="muted">Next opportunity: year {yearNext}</p>:<p className="muted">All Turning Points have been resolved.</p>}
 <h3>ACTIVE COMBINATIONS</h3>{active.length?active.map(a=><div className="buildsynergy" key={a.id} style={{borderLeftColor:DOMAINS[a.domain].color}}><strong>✦ {a.name}</strong><p>{a.description}</p></div>):<p className="muted">Combine related cards to unlock powerful city identities. Your first synergy is still waiting to emerge.</p>}
 <h3>RUN BONUSES</h3>{Object.entries(m).filter(([,v])=>v!==0).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,16).map(([k,v])=><div className="stat" key={k}><span>{k==='crowding'?'Crowding (prosperity)':k==='prosperity'?'Prosperity (points)':k.replace(/([A-Z])/g,' $1').replace(/^./,v=>v.toUpperCase())}</span><b>{k==='crowding'?`−${v}`:k==='prosperity'?`${v>=0?'+':''}${v}`:`${v>=0?'+':''}${Math.round(v*100)}%`}</b></div>)}
 <h3>AWAITING CONSTRUCTION ({city.projects?.length||0})</h3>{city.projects?.length?city.projects.map(p=><div className="queuedProject" key={p.id}><b>{projectLabel(p)}</b><small>From {p.origin||"Turning Point"} · Awarded {p.issuedYear} · Free commission</small><button className={chosenTool===`place:${p.id}`?'active':''} disabled={city.finished||!!city.turning?.pending} onClick={()=>onSelectProject(p.id)}><Landmark size={13}/> {chosenTool===`place:${p.id}`?'Click map to place':'Choose location'}</button></div>):<p className="muted">No unplaced projects. Special buildings unlock through cards and historical figures.</p>}
 <h3>HISTORICAL FIGURES</h3>{city.figures?.length?city.figures.map((f,i)=><div className="buildchoice" key={`${f.id}-${i}`}><span style={{color:RARITY_COLORS[f.rarity]}}>♛</span><div><b>{f.year} · {f.name}</b><small>{f.rarity.toUpperCase()} · Permanent historical influence</small></div></div>):<p className="muted">No figures recruited yet. Figure cards can appear among Turning Points.</p>}<h3>DECISION HISTORY</h3>{picks.length?picks.slice().reverse().map((pick,i)=>{const c=getOpportunity(pick.cardId);return c?<div className="buildchoice" key={`${pick.year}-${i}`}><span style={{color:DOMAINS[c.domain].color}}>{DOMAINS[c.domain].symbol}</span><div><b>{pick.year} · {c.name}</b><small>{c.description}</small>{c.durationPoints?(()=>{const index=picks.length-1-i,left=index+c.durationPoints-picks.length+1;return <small className={left>0?'tempActive':'tempExpired'}>{left>0?`Active · ends after ${left} more Turning Point${left===1?'':'s'}`:'Expired'}</small>;})():null}</div></div>:null;}):<p className="muted">Advance to the first Turning Point to choose your first city-shaping advantage.</p>}
 <p className="hint">Card effects and recruited figures stack across centuries. The Legacy Market strengthens future runs; historical crises remain independent.</p></div>;
}
function App(){
 const [legacy,setLegacy]=useState(emptyLegacy),[featured,setFeatured]=useState([]),[marketTab,setMarketTab]=useState('people');
 const auxiliaryReturn=useRef({atlas:'home',market:'home'}),rewardSeen=useRef(null),legacyCurrent=useRef(legacy);
 legacyCurrent.current=legacy;
 const [milestoneToast,setMilestoneToast]=useState(null);
 const [saves,setSaves]=useState(loadCities),[storageReady,setStorageReady]=useState(false),[activeId,setActiveId]=useState(null),[page,setPage]=useState('home'),[preview,setPreview]=useState(null),[simulating,setSimulating]=useState(false),[selectedId,setSelectedId]=useState(null),[historicYear,setHistoricYear]=useState(null);
 const simulation=useRef(null),saveQueue=useRef(Promise.resolve()),legacyQueue=useRef(Promise.resolve());
 const [name,setName]=useState('New Valdoria'),[geo,setGeo]=useState('river'),[tool,setTool]=useState('inspect'),[layer,setLayer]=useState('urban'),[tab,setTab]=useState('stats'),[statMetric,setStatMetric]=useState('population'),[clockSpeed,setClockSpeed]=useState(3),[message,setMessage]=useState(''),[showMobileStats,setShowMobileStats]=useState(false),[storageError,setStorageError]=useState(false);const legacyProgress=legacyInvestmentProgress(legacy);
 const [captions,setCaptions]=useState([]),[showTimelapse,setShowTimelapse]=useState(false),resumeAfterEvent=useRef(false),seenEvents=useRef({id:null,n:0});
 const [sideTab,setSideTab]=useState('zone'),[sideOpen,setSideOpen]=useState(true);
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
     for(const savedCity of cities){const sample=stats(savedCity);l=awardCityMilestones(l,savedCity,sample);l=awardCompletedCity(l,savedCity,sample);}
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
   setLegacy(previous=>{const next=awardCityMilestones(previous,playCity,s);return next.claimedAchievements.length===previous.claimedAchievements.length?previous:next;});
 },[storageReady,playCity,s]);
 // Also reconcile records when cities are imported or recovered.
 useEffect(()=>{
   if(!storageReady)return;
   setLegacy(previous=>{let next=previous;for(const savedCity of saves){const sample=stats(savedCity);next=awardCityMilestones(next,savedCity,sample);if(savedCity.finished)next=awardCompletedCity(next,savedCity,sample);}return next.claimedAchievements.length===previous.claimedAchievements.length&&next.completed.length===previous.completed.length?previous:next;});
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
 const start=()=>{if(!storageReady)return;setHistoricYear(null);setSelectedId(null);const city=prepareFounding(makeCity(name,geo,Math.floor(Math.random()*0x7fffffff)));const profile=startRunProfile(legacy,featured);city.turning={...city.turning,cardPool:profile.cardPool,figurePool:profile.figurePool,featuredFigures:profile.featuredFigures};city.legacyBonuses=profile.legacyBonuses;city.eventsOn=true;persist(city);setPage('game');setTab('build');setMessage('Choose where your town begins: click dry land on the map to place its Town Center.');setTool('place:center');};
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
   if(!city||city.finished||city.turning?.pending||city.event)return;setClockSpeed(rate);setSimulating(true);setMessage(`Calendar running at ${label}. You can keep zoning and building.`);
   const run={current:city,rate,timer:null,savedAt:Date.now(),acc:0,last:performance.now()};simulation.current=run;
   const frame=()=>{if(simulation.current!==run)return;
    const now=performance.now();run.acc+=Math.min(.5,(now-run.last)/1000)*run.rate;run.last=now;
    const months=Math.min(4,Math.floor(run.acc));run.acc-=months;
    if(months>0){const countBefore=run.current.events.length;run.current=advanceMonths(run.current,months);
     const events=run.current.events.slice(countBefore).filter(e=>['fire','flood','epidemic','boom','works','crisis','vacancy','abandonment'].includes(e.type));if(events.length){const event=events.at(-1);setMessage(`${event.year} · ${event.text}`);}
     setPreview(run.current);}
    if(run.current.event){persist(run.current);simulation.current=null;setPreview(null);setSimulating(false);resumeAfterEvent.current=true;setMessage(`${MONTHS[run.current.month]} ${run.current.year}: ${run.current.event.title}. Decide how the city responds.`);}
    else if(run.current.turning?.pending){persist(run.current);simulation.current=null;setPreview(null);setSimulating(false);setMessage(`${MONTHS[run.current.month]} ${run.current.year}: choose a Turning Point to continue.`);setTab('build');}
    else if(run.current.finished){persist(run.current);setLegacy(l=>awardCompletedCity(l,run.current,stats(run.current)));simulation.current=null;setPreview(null);setSimulating(false);setMessage('Chronicle complete — explore its historical record.');}
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
 useEffect(()=>{const id=tool.startsWith('place:')?'build':ZONES[tool]||tool==='erase'||tool==='demolish'?'zone':null;if(id){setSideTab(id);setSideOpen(true);}},[tool]);
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
 const answerEvent=i=>{if(!city?.event)return;const next=resolveEvent(city,i);if(next===city)return;persist(next);setMessage(`${next.year} · ${next.events.at(-1).title}: ${next.events.at(-1).choice}.`);};
 // After answering, the clock resumes at the same speed if it was running.
 useEffect(()=>{if(page==='game'&&city&&!city.event&&resumeAfterEvent.current&&!simulation.current){resumeAfterEvent.current=false;if(!city.turning?.pending&&!city.finished)runClock(clockSpeed);}},[city,page]);
 // New events with a place on the map become captions that fade after a few seconds.
 useEffect(()=>{if(!playCity){return;}const seen=seenEvents.current,n=playCity.events.length;
   if(seen.id!==playCity.id||n<seen.n){seenEvents.current={id:playCity.id,n};return;}
   if(n===seen.n)return;const fresh=playCity.events.slice(seen.n).filter(e=>CAPTIONED.has(e.type)||/era begins/.test(e.text||''));seenEvents.current={id:playCity.id,n};
   if(!fresh.length)return;const o=cityOrigin(playCity),t0=performance.now();
   setCaptions(list=>[...list.filter(c=>t0-c.t0<CAPTION_MS),...fresh.slice(-3).map((e,i)=>({text:captionText(e,playCity),x:Number.isFinite(e.x)?e.x:o.x+.5,y:Number.isFinite(e.y)?e.y:o.y-2+i*3,t0:t0+i*500}))].slice(-4));},[playCity]);
 const pickCard=cardId=>{if(!city?.turning?.pending)return;const next=selectTurningPoint(city,cardId);if(next===city)return;persist(next);setTab('build');const card=getOpportunity(cardId);setMessage(card.building?`${card.name}: construction project awarded. Select a location under Projects and Buildings.`:`${next.year} · ${card.name} added to your city's history.`);};
 const reroll=()=>{if(!city?.turning?.pending)return;const next=rerollTurningPoint(city);if(next!==city){persist(next);setMessage('Three new possible futures have been drawn.');}};
 const purchase=(type,id)=>{if(!storageReady)return;const previous=legacyCurrent.current,next=buyLegacy(previous,type,id);if(next.points===previous.points)return;legacyCurrent.current=next;setLegacy(next);};
 const purchasePack=id=>{if(!storageReady)return null;const result=openFigurePack(legacyCurrent.current,id);if(result.figure){legacyCurrent.current=result.legacy;setLegacy(result.legacy);}return result;};
 const onZone=(rect,type)=>{
   if(type==='demolish'){applyEdit(c=>demolishArea(c,rect.x,rect.y,rect.w,rect.h),`Demolished buildings and lanes in ${rect.w} × ${rect.h} parcels`);return;}
   if(type==='erase'){applyEdit(c=>{const next=clearZone(c,rect.x,rect.y,rect.w,rect.h);return next===c?{city:c,error:'there is no zoning there to clear'}:{city:next,undo:{kind:'zones',zones:c.zones}};},`Zoning cleared · ${rect.w} × ${rect.h} parcels. Existing buildings stay`);return;}
   applyEdit(c=>{const out=zoneLand(c,rect.x,rect.y,rect.w,rect.h,type);return out.error?out:{...out,message:`${ZONES[type].label} designated · ${out.cells?`${out.cells} new parcels surveyed for ${compact(out.cost)}`:'rezoned at no cost'}. Streets will grow toward it.`};},'Zoned');
 };
 const onPlace=(id,x,y)=>{
   if(id==='center'){const r=applyEdit(c=>placeTownCenter(c,x,y),'Town Center placed',{founding:true,record:false});if(r){setTool('inspect');setTab('build');setMessage(`${r.city.name} is founded around its Town Center. Draw zones, or press a speed to begin.`);}return;}
   if(id==='bridge'){const r=applyEdit(c=>buildBridge(c,x,y),'Bridge built');if(r)setTool('inspect');return;}
   const r=applyEdit(c=>{const project=(c.projects||[]).find(p=>p.id===id),basic=BASIC_BUILDINGS.find(b=>b.id===id);const out=placeConstruction(c,id,x,y);if(out.error)return out;return {...out,undo:{kind:'place',buildingId:out.placed.id,refund:project?0:basic?.cost||0,project:project||null},message:`${out.placed.label} constructed at ${Math.floor(x)}, ${Math.floor(y)}.`};},'Constructed');
   if(r){setTool('inspect');setTab('build');}
 };
 const onInspect=building=>{setSelectedId(building?.id||null);if(building){setTab('building');setShowMobileStats(true);}};
 const protectSelected=value=>{if(!selectedId)return;applyEdit(c=>{const next=setProtection(c,selectedId,value);return {city:next,undo:{kind:'protect',id:selectedId,value:!value}};},value?'Building protected from redevelopment and demolition':'Building may now be redeveloped or demolished');};
 const remove=id=>{const item=saves.find(x=>x.id===id);if(!storageReady||!item||!window.confirm(`Delete ${item.name} and its chronicle? This cannot be undone without a backup.`))return;setSaves(v=>v.filter(x=>x.id!==id));if(activeId===id){setActiveId(null);setPage('home');}};
 const importSaves=async e=>{const f=e.target.files?.[0];if(!f)return;try{const contents=JSON.parse(await f.text());const rows=Array.isArray(contents)?contents:contents?.cities;if(!Array.isArray(rows))throw Error('Invalid save format');const imported=rows.map(normalizeCity).filter(Boolean);if(!imported.length)throw Error('No valid cities in file');if(contents?.legacy){const importedProfile=normalizeLegacy(contents.legacy);if(window.confirm('This backup includes a Legacy Market profile. Restore its unlocks and currency as well?'))setLegacy(importedProfile);}
 setSaves(prev=>{const map=new Map(prev.map(c=>[c.id,c]));for(const c of imported)map.set(c.id,c);return [...map.values()];});setMessage(`Imported ${imported.length} cities.`);}catch(err){window.alert(`Unable to import: ${err.message}`);}finally{e.target.value='';}};
 return <div className="app">
  <header><button className="brand" onClick={goHome} aria-label="Return to CIVITAS home"><Landmark size={22}/><span>CIVITAS</span><small>CHRONICLE OF CITIES</small></button><div className="headerRight"><span>GEOMETRIC HISTORY SIMULATOR</span><span className="version">v1.4 · Living Map</span></div></header>
  {page==='market'?<Market legacy={legacy} onPurchase={purchase} onOpenPack={purchasePack} onBack={()=>backFromAuxiliary('market')} backLabel={auxiliaryReturn.current.market==='game'&&city?`Return to ${city.name}`:'Home'} tab={marketTab} setTab={setMarketTab} cities={saves} samples={marketSamples} ready={storageReady}/>:page==='atlas'?<UrbanAtlas cities={saves} onBack={()=>backFromAuxiliary('atlas')} backLabel={auxiliaryReturn.current.atlas==='game'&&city?`Return to ${city.name}`:'Home'} activeCityId={activeId} onOpen={openCityFromAtlas}/>:page==='home'||!city?<main className="home"><div className="eyebrow">THE URBAN ATLAS</div><h1>Every city has a story.</h1><p className="intro">Shape centuries of growth. Choose 20 turning points. Compare your civilizations through time.</p><div className="atlasLaunch"><div><strong>THE GREAT URBAN ATLAS</strong><span>Explore your city collection, historical records, population rankings and saved map surveys.</span></div><button className="primary" onClick={()=>openAuxiliary('atlas')}><BookOpen size={16}/> Open Urban Atlas</button></div>
    {!storageReady&&<p className="muted">Loading your city library…</p>}{storageError&&<p className="warning">Browser storage is unavailable or full. Export your cities as a backup and check browser storage permissions.</p>}
    <div className="legacyBanner"><div><span className="eyebrow">YOUR INVESTED LEGACY · {legacyProgress.ranks} RANKS</span><strong><Coins size={19}/>{compact(legacy.points)} Legacy Points</strong><small>{legacy.claimedAchievements.length} milestones earned · next run: +{Math.round(legacyProgress.capacity*100)}% capacity, +{Math.round(legacyProgress.productivity*100)}% productive know-how</small></div><button className="primary" onClick={()=>openAuxiliary('market')}><ShoppingBag size={16}/> Open Legacy Market</button></div><div className="homegrid"><section className="panel"><h2>Found a new city</h2><label>City name<input value={name} onChange={e=>setName(e.target.value)} maxLength={40}/></label><label>Geography<select value={geo} onChange={e=>setGeo(e.target.value)}><option value="river">Winding river</option><option value="coast">Coastal bay</option><option value="estuary">Tidal estuary</option><option value="lake">Lakeside basin</option><option value="plain">Open plain</option></select></label><p className="muted">European medieval settlement · 1300–2030 · 20 Turning Points · era buildings, landmarks and famous people</p><div className="loadout"><b><Crown size={15}/> Featured historical figures ({featured.length}/{legacyProgress.featuredSlots})</b><p className="muted">Invest in Civic Reputation for more featured candidates. Currency choices—not city-count milestones—shape your next campaign.</p><div className="figurePool">{legacy.unlockedFigures.length?legacy.unlockedFigures.map(id=>{const f=FIGURE_INDEX[id];return <button key={id} className={featured.includes(id)?'selected':''} disabled={!featured.includes(id)&&featured.length>=legacyProgress.featuredSlots} onClick={()=>setFeatured(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}><span>{f?.name}</span><small>{f?.rarity} · {f?.minYear}–{f?.maxYear}</small></button>;}):<span className="muted">No named figures unlocked yet. Generic specialists can still appear in every run.</span>}</div></div><button className="primary wide" disabled={!storageReady} onClick={start}><Plus size={16}/> Begin Chronicle</button></section>
    <section className="panel"><div className="panelhead"><h2>Continue or review cities <span className="count">{saves.length}</span></h2><div className="inlinebuttons"><button title="Export backup" onClick={()=>downloadBackup(saves,legacy)}><Download size={16}/></button><button title="Import backup" onClick={()=>fileInput.current?.click()}><Upload size={16}/></button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importSaves}/></div></div>
      {saves.length===0?<p className="muted">No cities yet. Your first settlement awaits.</p>:<div className="savelist">{saves.map(c=><div className="saveitem" key={c.id}><button className="saveopen" onClick={()=>{setActiveId(c.id);setPage('game');setHistoricYear(null);setSelectedId(null);setMessage('');setShowMobileStats(false);}}><strong>{c.name}</strong><small>{c.type} · {c.year} · {compact(savePopulations.get(c.id)??0)} residents · {c.turning?.choices?.length||0} cards</small></button><span className="savestatus">{c.finished?'Complete':'Resume'}</span><button className="delete" title={`Delete ${c.name}`} aria-label={`Delete ${c.name}`} onClick={()=>remove(c.id)}><Trash2 size={15}/></button></div>)}</div>}
    </section></div><p className="footnote">v1.4: a living map. Lanes curve, walls follow the town, row houses face their streets, history knocks with events to answer, captions are written onto the map, and every city can be replayed as a timelapse.</p></main>:
    <div className="workspace"><div className="topbar"><button className="textbutton" onClick={()=>openAuxiliary('atlas')} title="Urban Atlas" aria-label="Back to the Urban Atlas"><ArrowLeft size={16}/> <span className="backLabel">Urban Atlas</span></button><div className="cityheading"><strong title={city.name}>{city.name}</strong><span>{MONTHS[playCity.month||0]} {playCity.year} · {eraAt(playCity.year).n}{historicalSnapshot?' · HISTORIC MAP':''}</span></div><div className="topstats"><span>POPULATION <b>{compact(archiveMetrics?.population??historicalSnapshot?.population??s.population)}</b></span><span className="ts-gdp">GDP <b>{compact(archiveMetrics?.gdp??s.gdp)}</b></span><span className="ts-gdppc">GDP / PERSON <b>{compact(archiveMetrics?.gdpPerCapita??s.gdpPerCapita)}</b></span><span className={!archiveMetrics&&(playCity.shortfall||0)>=.05?'crisis':''}>TREASURY <b>{compact(Math.round(archiveMetrics?.treasury??playCity.funds))}</b>{!archiveMetrics&&(playCity.shortfall||0)>=.05&&<em>Services cut {Math.round(playCity.shortfall*100)}%</em>}</span></div><button className="legacyQuick" onClick={()=>openAuxiliary('market')} title="Permanent upgrades for future cities"><Coins size={14}/><span>{compact(legacy.points)} LP</span><small>Rank {legacyProgress.ranks}</small></button><div className="controls"><button className="timelapseQuick" onClick={()=>{stopSimulation();setShowTimelapse(true);}} title="Replay the city: one map every 50 years"><Hourglass size={15}/><span>Timelapse</span></button>{historicalSnapshot&&<button className="archiveExit" onClick={()=>{setHistoricYear(null);setSelectedId(null);}}>Return to present</button>}{simulating?<button className="pauseButton" onClick={()=>{stopSimulation();setMessage('Paused. Edits still apply; press a speed or Space to continue.');}} title="Pause (Space)"><Pause size={13}/> Pause</button>:null}{SPEEDS.map(([rate,label])=><button key={rate} className={simulating&&clockSpeed===rate?'speedActive':''} disabled={playCity.finished||!!playCity.turning?.pending||historicYear!==null} onClick={()=>runClock(rate)} title={`${label}: ${rate} months per second`}><Play size={13}/>{label}</button>)}<button className="undoButton" disabled={!undoCount||historicYear!==null} onClick={undo} title="Undo last edit (Ctrl/Cmd+Z)" aria-label="Undo last edit"><Undo2 size={14}/></button></div><button className="mobileInfo" onClick={()=>setShowMobileStats(v=>!v)} aria-label="Toggle city statistics"><BarChart3 size={16}/></button></div>
    <div className={`gamebody ${sideOpen?'':'sideCollapsed'}`}><aside className={`sidebar ${sideOpen?'':'collapsed'}`}>
      <nav className="rail" aria-label="City tools">
        <button className={tool==='inspect'?'tool active':'tool'} onClick={()=>setTool('inspect')} title="Explore / pan (Esc)" aria-label="Explore and pan"><MousePointer2 size={17}/><span>Explore</span></button>
        <i className="railRule"/>
        {SIDE_SECTIONS.map(([id,label,Icon])=>{const badge=id==='build'?(playCity.awaitingCenter||(playCity.projects||[]).length>0):id==='zone'?Object.values(demand(playCity)).some(r=>r.level==='urgent'):id==='taxes'?(playCity.shortfall||0)>=.05:false;
          return <button key={id} className={`rail-${id} ${sideOpen&&sideTab===id?'sel':''}`} aria-pressed={sideOpen&&sideTab===id} title={label} onClick={()=>{if(sideTab===id)setSideOpen(v=>!v);else{setSideTab(id);setSideOpen(true);}}}><Icon size={17}/><span>{label}</span>{badge&&<b className="railBadge"/>}</button>;})}
      </nav>
      {sideOpen&&<div className="sidepanel">
      {sideTab==='zone'&&<><h3>ZONING & DEMAND</h3><div className="sidecaption first">TOOLS</div><button className={tool==='erase'?'active':''} onClick={()=>setTool('erase')} title="Drag to remove zoning; buildings stay"><Eraser size={15}/> Erase zoning</button><button className={tool==='demolish'?'active':''} onClick={()=>setTool('demolish')} title="Drag to demolish unprotected buildings and lanes"><Hammer size={15}/> Demolish</button><div className="sidecaption">DESIGNATE LAND</div>{Object.entries(ZONES).filter(([k])=>k!=='hotel'||tourismUnlocked(city)).map(([k,v])=><button key={k} className={tool===k?'active':''} onClick={()=>setTool(k)}><i style={{background:v.color}}/>{v.label}</button>)}<DemandPanel city={playCity}/><p className="hint">The town grows by itself along its streets. Drag a zone to steer it: new streets reach for zoned land first. Everything works while time runs. Space pauses, Ctrl/Cmd+Z undoes.</p></>}
      {sideTab==='build'&&<><h3>BUILD</h3><div className="sidecaption first">TOWN CENTER</div>
      {(()=>{const tc=townCenterLevel(playCity);if(!tc)return <button className={tool==='place:center'?'active':''} disabled={playCity.finished||historicYear!==null} title="Choose where the town grows from. Permanent once placed." onClick={()=>{setTool('place:center');setTab('build');}}><Crown size={14}/>{playCity.awaitingCenter?'Found the town':'Place Town Center'}</button>;
        const next=TOWN_CENTER_LEVELS[tc.level],issue=townCenterIssue(playCity);
        return next?<button disabled={!!issue||historicYear!==null} title={issue||next.description} onClick={onCenterUpgrade}><Crown size={14}/>{next.name}<small>{compact(next.cost)}</small></button>:<button disabled title="Fully developed"><Crown size={14}/>{tc.name}<small>MAX</small></button>;})()}
      <div className="sidecaption">CONSTRUCTION · {eraAt(playCity.year).n.toUpperCase()}</div>
      {(playCity.projects||[]).length>0&&<><div className="sidebarProjectCount">{playCity.projects.length} unplaced card {playCity.projects.length===1?'project':'projects'}</div>{playCity.projects.map(p=><button key={p.id} className={tool===`place:${p.id}`?'active':''} disabled={playCity.finished||historicYear!==null||!!playCity.turning?.pending} onClick={()=>{setTool(`place:${p.id}`);setTab('build');}}><Landmark size={14}/>{projectLabel(p)} <small>FREE</small></button>)}</>}
      {basicsForYear(playCity.year).map(b=><button key={b.id} className={tool===`place:${b.id}`?'active':''} title={b.description} disabled={playCity.finished||historicYear!==null||!!playCity.turning?.pending||playCity.funds<b.cost||playCity.buildings.filter(x=>x.special===b.kind).length>=2} onClick={()=>setTool(`place:${b.id}`)}><Building2 size={14}/>{b.name}<small>{compact(b.cost)}</small></button>)}
      <div className="sidecaption">PUBLIC WORKS</div>
      {(()=>{const issue=publicWorkIssue(playCity,'wall');const cost=publicWorkCost(playCity,'wall');return playCity.year<=PUBLIC_WORKS.wall.to?<button title={issue||PUBLIC_WORKS.wall.description} disabled={!!issue||historicYear!==null} onMouseEnter={()=>setPreviewRing(wallTarget(playCity))} onMouseLeave={()=>setPreviewRing(null)} onFocus={()=>setPreviewRing(wallTarget(playCity))} onBlur={()=>setPreviewRing(null)} onClick={onWall}><Castle size={14}/>City wall<small>{issue&&!/treasury/.test(issue)?'—':compact(cost)}</small></button>:null;})()}
      {(playCity.walls||[]).some(w=>w.state==='wall')&&['canal','boulevard'].map(kind=>{const issue=publicWorkIssue(playCity,kind);if(issue&&/Available from|geography/.test(issue))return null;return <button key={kind} title={issue||PUBLIC_WORKS[kind].description} disabled={!!issue||historicYear!==null} onClick={()=>onRing(kind)}>{kind==='canal'?<Waves size={14}/>:<Route size={14}/>}{PUBLIC_WORKS[kind].name}<small>{compact(publicWorkCost(playCity,kind))}</small></button>;})}
      {['river','coast','estuary','lake'].includes(playCity.type)&&<button className={tool==='place:bridge'?'active':''} title={PUBLIC_WORKS.bridge.description} disabled={!!publicWorkIssue(playCity,'bridge')||historicYear!==null} onClick={()=>setTool('place:bridge')}><Route size={14}/>Bridge<small>from {compact(publicWorkCost(playCity,'bridge',3))}</small></button>}
      <p className="constructionHint">Select a building, then click an empty land parcel. Basic buildings cost treasury. Card-awarded projects are free but require placement.</p><BuildingPreview building={selectedBasic}/></>}
      {sideTab==='taxes'&&<><h3>TAXES & BUDGET</h3><TaxPanel city={playCity} s={s} onTax={onTax} disabled={playCity.finished||historicYear!==null}/></>}
      {sideTab==='layers'&&<><h3>MAP LAYERS</h3><div className="layerList" role="radiogroup" aria-label="Map layer">{MAP_LAYERS.map(([id,label,note])=><button key={id} role="radio" aria-checked={layer===id} className={layer===id?'active':''} onClick={()=>setLayer(id)}><b>{label}</b><small>{note}</small></button>)}</div></>}
      </div>}</aside>
    <div className="center"><CityMap city={displayCity} captions={historicYear===null?captions:[]} selectedId={selectedId} readOnly={historicYear!==null} onInspect={onInspect} onPlace={onPlace} tool={historicYear!==null?'inspect':tool} layer={layer} onZone={onZone} previewRing={previewRing} animate={simulating} population={archiveMetrics?.population??historicalSnapshot?.population??s.population} archiveYear={historicYear} describeSelection={(r,t)=>{if(!ZONES[t])return null;const {cells,cost}=zoningCost(playCity,r.x,r.y,r.w,r.h);return `${r.w} × ${r.h} · ${cells?`${cells} new parcels · ${compact(cost)}${cost>playCity.funds?' (not enough treasury)':''}`:'rezoning is free'}`;}}/><div className="bottom"><span><span className="dot"/>{historicalSnapshot?`Archive view · ${historicYear}`:playCity.finished?'Chronicle complete':simulating?'City evolving...':'Simulation paused'}</span><span className="message">{message||(tool==='place:center'?'Click dry land to place the Town Center: the town is laid out around it':tool==='place:bridge'?'Click a riverbank or the water to bridge it':tool.startsWith('place:')?'Tap an empty land parcel to place the selected building':tool==='erase'?'Drag over zoned land to remove its designation':tool==='demolish'?'Drag over buildings to demolish them (protected ones stay)':`${playCity.buildings.length} buildings · ${playCity.roads.length} street tiles`)}</span><span>Local save <Save size={13}/></span></div></div>
    <aside className={`inspector ${showMobileStats?'showMobile':''}`}><div className="tabs"><button className={tab==='stats'?'sel':''} onClick={()=>setTab('stats')}><BarChart3 size={13}/> Stats</button><button className={tab==='history'?'sel':''} onClick={()=>setTab('history')}><BookOpen size={13}/> Chronicle</button><button className={tab==='building'?'sel':''} onClick={()=>setTab('building')}><Building2 size={13}/> Building</button><button className={tab==='build'?'sel':''} onClick={()=>setTab('build')}><Sparkles size={13}/> Build</button><button className={tab==='identity'?'sel':''} onClick={()=>setTab('identity')}><Flag size={13}/> Identity</button></div>
      {tab==='identity'?<IdentityPanel city={playCity} s={s} onPolicy={onPolicy} readOnly={playCity.finished||historicYear!==null} onDistrict={()=>setLayer('districts')} onRenameDistrict={(id,name)=>applyEdit(c=>renameDistrict(c,id,name),`District renamed ${name.trim()}`)}/>:tab==='build'?<BuildPanel city={playCity} chosenTool={tool} readOnly={playCity.finished||historicYear!==null} onPlaceCenter={()=>{setTool('place:center');setMessage('Click dry land on the map to place the Town Center.');}} onCenterUpgrade={onCenterUpgrade} onSelectProject={id=>{setTool(`place:${id}`);setMessage("Click an empty map parcel to construct the awarded building.");}}/>:tab==='stats'?<div className="sidecontent"><div className="eyebrow">{historicalSnapshot?'HISTORICAL SURVEY':'CITY OVERVIEW'}</div><h2>{historicalSnapshot?.year||playCity.year}</h2>
        {historicalSnapshot&&<><p className="muted">Archived economic and population indicators for this year. Return to the present to see current city statistics.</p>{[['Population',compact(archiveMetrics?.population??historicalSnapshot.population)],['GDP · modeled',compact(archiveMetrics?.gdp??0)],['GDP per capita',compact(archiveMetrics?.gdpPerCapita??0)],['Economic momentum',archiveMetrics?.economyScore==null?'Not recorded':`${Math.round(archiveMetrics.economyScore)}/100`],['Technology momentum',archiveMetrics?.technologyScore==null?'Not recorded':`${Math.round(archiveMetrics.technologyScore)}/100`],['Infrastructure efficiency',archiveMetrics?.infrastructureEfficiency==null?'Not recorded':`${archiveMetrics.infrastructureEfficiency}/100`],['Cultural prestige',compact(archiveMetrics?.culturalPrestige??0)],['Tourism appeal',compact(archiveMetrics?.tourismAppeal??0)],['Religious influence',compact(archiveMetrics?.religiousInfluence??0)],['Buildings',compact(historicalSnapshot.buildings.length)]].map(([k,v])=><div className="stat" key={k}><span>{k}</span><b>{v}</b></div>)}</>}
        {!historicalSnapshot&&<>
        <div className="mobileOnly"><TaxPanel city={playCity} s={s} onTax={onTax} disabled={playCity.finished||historicYear!==null}/></div>
        <AchievementLedger legacy={legacy} cities={liveMilestoneCities} samples={liveMilestoneSamples} compact onOpen={()=>openAuxiliary('market','achievements')}/><div className="liveHistory"><div className="panelMiniHead"><span>CITY EVOLUTION</span><button onClick={()=>openAuxiliary('atlas')}><GitCompareArrows size={13}/> Compare</button></div><select value={statMetric} onChange={e=>setStatMetric(e.target.value)}>{[['population','Population'],['gdp','Modeled GDP'],['gdpPerCapita','GDP per person'],['prosperity','Prosperity'],['culturalPrestige','Cultural prestige'],['infrastructureEfficiency','Infrastructure efficiency']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><HistoricalChart city={playCity} metric={statMetric} height={110}/><small>Open Urban Atlas to compare your saved cities and historical population records.</small></div>
        <h3>DEVELOPMENT MOMENTUM · 0–100</h3>
        <p className="hint">Cards and recruited people can create golden ages. Conditions naturally fade without new investments, while prosperity accumulated during those years remains. Annual modeled productivity growth: <b>{s.productivityGrowthPct}%</b>.</p>
        {Object.entries(s.development).map(([k,v])=><div key={k} className="momentumMetric"><div className="momentumName"><span>{AXIS_LABELS[k]||k}</span><strong>{Math.round(v)}/100</strong></div><div className="momentumTrack"><div style={{width:`${v}%`,background:v>=75?'#6b9880':v>=40?'#b59b68':'#ba826f'}}/></div></div>)}
        {[["Population",compact(s.population)],["GDP · modeled",compact(s.gdp)],["GDP per capita",compact(s.gdpPerCapita)],["Cultural prestige",compact(s.culturalPrestige)],["Tourism appeal",compact(s.tourismAppeal)],["Tourist visits / year",compact(s.touristVisits)],["Hotels",compact(s.hotels)],["Religious influence",compact(s.religiousInfluence)],["Education",compact(s.educationIndex)],["Pollution",compact(s.pollution)],["Prosperity",`${s.prosperity}/100`],["Infrastructure efficiency",`${s.infrastructureEfficiency}/100`],["Housing capacity",compact(s.capacity)],["Housing occupancy",`${s.housingPressure}%`],["Overcrowding",`${s.overcrowding}%`],["Employment",compact(s.employment)],["Unemployment",`${s.unemployment}%`],["Jobs available",compact(s.jobs)],["Residents / residential cell",compact(s.densityPerZone)],["Treasury",compact(s.treasury)],["Business cycle",s.cycle>.04?'Expansion':s.cycle<-.04?'Recession':'Steady'],["Service shortfall",`${s.shortfall}%`],["Vacant buildings",compact(s.vacant)],["Homes with public services",`${s.serviceCoverage}%`],["Homes in industrial smoke",`${s.pollutedHomes}%`],["Homes near prestige",`${s.prestigeHomes}%`],["Shops with trade access",`${s.tradeAccess}%`],["Prosperity from location",`${s.placeProsperity>=0?'+':''}${s.placeProsperity}`],["Informal buildings",compact(s.informal)],["Unplaced projects",compact(playCity.projects?.length||0)],["Buildings",compact(s.buildings)],["Historic buildings (120y+)",compact(s.heritage)],["Protected buildings",compact(s.protectedCount)],["Buildings replaced / lost",compact(s.lostBuildings)]].map(([k,v])=><div className="stat" key={k}><span>{k}</span><b>{v}</b></div>)}
        <h3>ZONED LAND</h3>{Object.entries(ZONES).filter(([k])=>k!=='hotel'||tourismUnlocked(city)).map(([k,v])=><div className="stat" key={k}><span>{v.label}</span><b>{compact(s.zoned[k])} cells</b></div>)}<p className="hint">The GDP model is an internal game estimate, not comparable to real historical GDP yet. Land pressure affects housing, unemployment reduces prosperity and migration, and sprawling infrastructure has a recurring treasury cost.</p></>}</div>:
      tab==='history'?<ChroniclePanel city={playCity} onTimelapse={()=>{stopSimulation();setShowTimelapse(true);}} archiveYear={historicYear} onArchiveYear={y=>{setHistoricYear(y);setSelectedId(null);}} onOpenBuild={()=>setTab('build')}/>:
      <div className="sidecontent"><div className="eyebrow">BUILDING INSPECTOR</div>{selectedBuilding?<>
        <h2>{selectedBuilding.label||ZONES[selectedBuilding.type]?.label||'Building'}</h2>
        <p className="muted">{[selectedBuilding.label&&ZONES[selectedBuilding.type]?.label,STYLE_NAMES[selectedBuilding.style||styleAt(selectedBuilding.born)],`Parcel ${Math.floor(selectedBuilding.x)}, ${Math.floor(selectedBuilding.y)}`].filter(Boolean).join(' · ')}</p>
        <div className="stat"><span>Constructed</span><b>{selectedBuilding.born}</b></div>
        <div className="stat"><span>Age in map year</span><b>{displayCity.year-selectedBuilding.born} years</b></div>
        <div className="stat"><span>Development level</span><b>{selectedBuilding.level||1}</b></div>
        <div className="stat"><span>Last modified</span><b>{selectedBuilding.modified||'Not renovated'}</b></div>
        <div className="stat"><span>Heritage designation</span><b>{selectedBuilding.protected?'Protected':'Unprotected'}</b></div>
        {(()=>{const k=Math.floor(selectedBuilding.y)*W+Math.floor(selectedBuilding.x),f=cityFields(displayCity),d=districtDetails(displayCity,cityOrigin(displayCity)),di=d.grid[k];const v=f.prestige[k]*.7-f.pollution[k]*f.homeShield*.6;
          return <>{di>=0&&<div className="stat"><span>District</span><b>{d.list[di].name}</b></div>}
          <div className="stat"><span>Land value</span><b>{v>.35?'Prestigious':v>.1?'Good':v<-.35?'Smoky':v<-.1?'Industrial edge':'Ordinary'}</b></div>
          <div className="stat"><span>Public services</span><b>{f.service[k]>=.35?'Within reach':'Out of reach'}</b></div>
          {selectedBuilding.vacant&&<div className="stat"><span>Status</span><b>Vacant since {selectedBuilding.vacant}</b></div>}
          {selectedBuilding.informal&&<div className="stat"><span>Origin</span><b>Informal (unzoned)</b></div>}</>;})()}
        {historicYear===null&&!city.finished?<button className="primary wide heritageButton" onClick={()=>protectSelected(!selectedBuilding.protected)}>{selectedBuilding.protected?<ShieldOff size={15}/>:<ShieldCheck size={15}/>} {selectedBuilding.protected?'Remove protection':'Preserve this building'}</button>:<p className="muted">Historical maps are read-only. Return to the current city to change protection.</p>}
        <h3>BUILDING HISTORY</h3><div className="event"><strong>{selectedBuilding.born}</strong><p>Building constructed in the {eraAt(selectedBuilding.born).n.toLowerCase()} era.</p></div>
        {(selectedBuilding.renovations||[]).slice(-12).map((r,i)=><div className="event" key={i}><strong>{r.year}</strong><p>{r.action}</p></div>)}
        <p className="hint">Preservation prevents automated redevelopment of this building. Protection reduces redevelopment pressure, not disaster risk: important buildings can still be lost to fires or floods.</p>
      </>:<><h2>Select a building</h2><p className="muted">Choose Explore / pan, then tap a building footprint on the map to inspect its age, style, and renovation history. You can designate individual buildings for preservation.</p></>}</div>}
      </aside></div>{city.turning?.pending&&!simulating&&historicYear===null&&<TurningModal city={city} onChoose={pickCard} onReroll={reroll}/>}{city.event&&!simulating&&historicYear===null&&<EventModal city={city} onChoose={answerEvent}/>}{showTimelapse&&<Timelapse city={city} onClose={()=>setShowTimelapse(false)}/>}</div>}
 {milestoneToast&&<div className="milestoneToast" role="status"><Medal size={22}/><div><b>{milestoneToast.name}</b><span>+{milestoneToast.points} Legacy Points</span></div><button onClick={()=>{setMilestoneToast(null);openAuxiliary('market','achievements');}}>View</button><button aria-label="Dismiss milestone" onClick={()=>setMilestoneToast(null)}>×</button></div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
