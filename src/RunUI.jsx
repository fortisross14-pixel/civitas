// CIVITAS v2.0 — run setup, Unrest and the end-of-run summary (Milestone R3).
import React,{useEffect,useRef} from 'react';
import {Award,Coins,Flame,Gem,Landmark,Minus,PackageOpen,Plus,ScrollText,ShoppingBag,Skull,TrendingUp,Users,X} from 'lucide-react';
import {FOUNDER_INDEX,ARTIFACT_INDEX,BOOSTER_INDEX} from './legacy.js';
import {foundingOptions,eraCardPool,HARDSHIP_TEXT,hardshipLP,historicStanding,runStanding,doctrineName} from './runs.js';
import {ERA_CARDS,CARD_INDEX} from './turningPoints.js';
import {DOCTRINES} from './doctrines.js';
import {RUIN_AT,unrestLine} from './sim.js';
import {Info} from './Info.jsx';
import './runs.css';

const number=n=>Math.round(n||0).toLocaleString('en-US');
const glyph=d=>d?DOCTRINES[d]?.glyph:'◇';

// The founding panel: Founder, artifacts, boosters and Hardship. Short labels;
// details behind (i); empty sections are hidden.
export function FoundingSetup({legacy,setup,setSetup}){
  const o=foundingOptions(legacy),pool=eraCardPool(legacy).length;
  const set=patch=>setSetup({...setup,...patch});
  const toggle=(key,id,limit)=>{const list=setup[key]||[];set({[key]:list.includes(id)?list.filter(x=>x!==id):list.length<limit?[...list,id]:list});};
  const founders=Object.values(FOUNDER_INDEX),f=FOUNDER_INDEX[setup.founder||'wanderer'];
  return <div className="runSetup">
    <div className="setupBlock"><b>Founder <Info label="About founders"><span>{f.description}</span>{f.cards.length>0&&<span>Starts with {f.cards.map(id=>CARD_INDEX[id]?.name).join(' and ')}.</span>}{f.doctrine&&<span>{doctrineName(f.doctrine)} cards are 3× as likely in the Market Hall.</span>}<span>Locked founders join when you reach tier 1 of their doctrine, or for Legacy Points. Card pool: {pool} of {ERA_CARDS.length}.</span></Info></b>
      <div className="founderRow" role="radiogroup" aria-label="Founder">{founders.map(x=>{const open=o.founders.includes(x.id),sel=(setup.founder||'wanderer')===x.id;
        return <button key={x.id} role="radio" aria-checked={sel} className={`founderChip ${sel?'selected':''}`} disabled={!open} onClick={()=>set({founder:x.id})} title={open?x.name:'Locked'} style={{'--doctrine':x.doctrine?DOCTRINES[x.doctrine].color:'#6f6a5c'}}>
          <span className="founderGlyph" aria-hidden="true">{glyph(x.doctrine)}</span><span>{x.name.replace('The ','')}</span></button>;})}</div>
    </div>
    {o.artifacts.length>0&&<div className="setupBlock"><b>Artifacts {(setup.artifacts||[]).length}/{o.slots}</b>
      <div className="chipRow">{o.artifacts.map(id=>{const a=ARTIFACT_INDEX[id],sel=(setup.artifacts||[]).includes(id);return <span key={id} className="chipWrap"><button className={`chip ${sel?'selected':''}`} aria-pressed={sel} disabled={!sel&&(setup.artifacts||[]).length>=o.slots} onClick={()=>toggle('artifacts',id,o.slots)}>{a.name}</button><Info label={`About ${a.name}`} align="start">{a.description}</Info></span>;})}</div></div>}
    {o.boosters.length>0&&<div className="setupBlock"><b>Boosters {(setup.boosters||[]).length}/{o.boosterLimit}</b>
      <div className="chipRow">{o.boosters.map(({id,count})=>{const b=BOOSTER_INDEX[id],sel=(setup.boosters||[]).includes(id);return <span key={id} className="chipWrap"><button className={`chip ${sel?'selected':''}`} aria-pressed={sel} disabled={!sel&&(setup.boosters||[]).length>=o.boosterLimit} onClick={()=>toggle('boosters',id,o.boosterLimit)}>{b.name} ×{count}</button><Info label={`About ${b.name}`} align="start">{b.description} Used up at founding.</Info></span>;})}</div></div>}
    <div className="setupBlock hardshipBlock"><b>Hardship <Info label="About Hardship">{HARDSHIP_TEXT(setup.hardship||0)}{!o.maxHardship&&' Complete a city to open Hardship 1.'}</Info></b>
      <div className="hardshipRow"><button aria-label="Lower Hardship" disabled={!setup.hardship} onClick={()=>set({hardship:Math.max(0,(setup.hardship||0)-1)})}><Minus size={14}/></button>
        <strong aria-live="polite">{setup.hardship||0}</strong>
        <button aria-label="Raise Hardship" disabled={(setup.hardship||0)>=o.maxHardship} onClick={()=>set({hardship:Math.min(o.maxHardship,(setup.hardship||0)+1)})}><Plus size={14}/></button></div>
    </div>
  </div>;
}

// A thin meter shown once Unrest starts building.
export function UnrestMeter({city}){
  const u=city?.unrest||0;if(u<=0||city.finished)return null;
  const level=u>=80?'danger':u>=50?'warn':'calm';
  return <div className={`unrestMeter ${level}`} role="meter" aria-valuemin={0} aria-valuemax={RUIN_AT} aria-valuenow={Math.round(u)} aria-label="Unrest" title={`Unrest ${Math.round(u)}/${RUIN_AT}. It rises while prosperity is below ${unrestLine(city)}, and with unanswered history and declining districts. At ${RUIN_AT} the city falls into Ruin.`}>
    <Flame size={13}/><span>Unrest</span><i style={{width:`${Math.min(100,u/RUIN_AT*100)}%`}}/><b>{Math.round(u)}</b></div>;
}

// End of run: score against past runs, size against historical cities, LP and unlocks.
export function RunSummary({run,legacy,unlocked=[],onClose,onMarket}){
  const ref=useRef(null);
  useEffect(()=>{const d=ref.current;d?.querySelector('button')?.focus();const k=e=>{if(e.key==='Escape'){e.preventDefault();onClose();}};document.addEventListener('keydown',k);return()=>document.removeEventListener('keydown',k);},[onClose]);
  if(!run)return null;
  const standing=runStanding(legacy,run),hist=historicStanding(run.population,run.year);
  const top=Math.max(run.population,...hist.rows.map(r=>r.population));
  const founder=FOUNDER_INDEX[run.founder]||FOUNDER_INDEX.wanderer;
  const recent=legacy.runs.slice(-8),maxScore=Math.max(1,...recent.map(r=>r.score));
  return <div className="turningBackdrop"><section ref={ref} className="runSummary" role="dialog" aria-modal="true" aria-labelledby="runSummaryTitle">
    <button className="revealClose" aria-label="Close run summary" onClick={onClose}><X size={18}/></button>
    <div className="eyebrow">{run.ruined?`FELL INTO RUIN IN ${run.ruined}`:'THE CHRONICLE CLOSES'}</div>
    <h2 id="runSummaryTitle">{run.ruined?<Skull size={22}/>:<Award size={22}/>} {run.name}</h2>
    <p className="summaryLine">{founder.name} · {run.doctrine?`${DOCTRINES[run.doctrine].build} (${doctrineName(run.doctrine)} tier ${run.tier})`:'No doctrine'}{run.hardship?` · Hardship ${run.hardship}`:''}</p>
    <div className="summaryStats">
      <div><span>Score</span><strong>{number(run.score)}</strong><small>{standing.first?'Your first recorded run':standing.record?'A new personal record':`#${standing.rank} of ${standing.count} runs · best ${number(standing.best)}`}</small></div>
      <div><span>Population</span><strong>{number(run.population)}</strong><small>Prosperity {run.prosperity}</small></div>
      <div><span>Legacy Points</span><strong><Coins size={16}/> +{number(run.lp)}</strong><small>{run.ruined?'Half pay for a ruined city':''}{run.hardship?`${run.ruined?' · ':''}×${hardshipLP(run.hardship).toFixed(2)} for Hardship`:''}</small></div>
    </div>
    {standing.previous&&<p className="summaryDelta"><TrendingUp size={14}/> {run.score>=standing.previous.score?'Up':'Down'} {Math.abs(Math.round((run.score/Math.max(1,standing.previous.score)-1)*100))}% on your last run ({standing.previous.name}, {number(standing.previous.score)}).</p>}
    <h3><Users size={15}/> Against history, {run.year}</h3>
    <p className="muted">{!hist.passed?`Smaller than all of them in ${run.year}: the smallest, ${hist.next.name}, had about ${number(hist.next.population)}.`:hist.next?`Larger than ${hist.passed.name} was in ${run.year}; ${hist.next.name} had about ${number(hist.next.population)}.`:`Larger than all of them in ${run.year}.`}</p>
    <ul className="historyBars">{[...hist.rows,{id:'you',name:run.name,population:run.population,you:true}].sort((a,b)=>b.population-a.population).map(r=><li key={r.id} className={r.you?'you':''}><span>{r.name}</span><i style={{width:`${Math.max(1.5,Math.sqrt(r.population/top)*100)}%`}}/><b>{number(r.population)}</b></li>)}</ul>
    <small className="muted">Historical figures are approximate city populations; the bar length uses a square-root scale.</small>
    {recent.length>1&&<><h3><ScrollText size={15}/> Your recent runs</h3><ol className="runBars">{recent.map(r=><li key={r.id} className={r.id===run.id?'you':''} title={`${r.name}: ${number(r.score)}`}><i style={{height:`${Math.max(4,r.score/maxScore*100)}%`}} className={r.ruined?'ruined':''}/><small>{number(r.score/1000)}k</small></li>)}</ol></>}
    {unlocked.length>0&&<><h3><Gem size={15}/> Mastery opened {unlocked.length} new {unlocked.length===1?'card':'cards'}</h3><p className="muted">{unlocked.map(id=>CARD_INDEX[id]?.name).filter(Boolean).join(', ')}.</p></>}
    <div className="summaryActions"><button className="primary" onClick={onMarket}><ShoppingBag size={15}/> Spend Legacy Points</button><button onClick={onClose}>Explore the city</button></div>
  </section></div>;
}
