// CIVITAS v2.0 — run setup, Unrest and the end-of-run summary (Milestone R3).
import React,{useEffect,useRef} from 'react';
import {Award,Coins,Flame,Gem,Landmark,Minus,PackageOpen,Plus,ScrollText,ShoppingBag,Skull,TrendingUp,Users,X} from 'lucide-react';
import {FOUNDER_INDEX,ARTIFACT_INDEX,BOOSTER_INDEX} from './legacy.js';
import {foundingOptions,eraCardPool,HARDSHIP_TEXT,hardshipLP,historicStanding,runStanding,doctrineName} from './runs.js';
import {ERA_CARDS,CARD_INDEX} from './turningPoints.js';
import {DOCTRINES} from './doctrines.js';
import {RUIN_AT,unrestLine} from './sim.js';
import './runs.css';

const number=n=>Math.round(n||0).toLocaleString('en-US');
const glyph=d=>d?DOCTRINES[d]?.glyph:'◇';

// The founding panel: Founder, artifacts, boosters and Hardship.
export function FoundingSetup({legacy,setup,setSetup}){
  const o=foundingOptions(legacy),pool=eraCardPool(legacy).length;
  const set=patch=>setSetup({...setup,...patch});
  const toggle=(key,id,limit)=>{const list=setup[key]||[];set({[key]:list.includes(id)?list.filter(x=>x!==id):list.length<limit?[...list,id]:list});};
  const founders=Object.values(FOUNDER_INDEX);
  return <div className="runSetup">
    <div className="setupBlock"><b><Landmark size={15}/> Founder</b>
      <div className="founderRow" role="radiogroup" aria-label="Founder">{founders.map(f=>{const open=o.founders.includes(f.id),sel=(setup.founder||'wanderer')===f.id;
        return <button key={f.id} role="radio" aria-checked={sel} className={`founderChip ${sel?'selected':''}`} disabled={!open} onClick={()=>set({founder:f.id})} title={open?f.description:`Reach tier 1 of ${doctrineName(f.doctrine)} in a run, or buy in the Legacy Market`} style={{'--doctrine':f.doctrine?DOCTRINES[f.doctrine].color:'#6f6a5c'}}>
          <span className="founderGlyph" aria-hidden="true">{glyph(f.doctrine)}</span><span>{f.name.replace('The ','')}</span><small>{open?doctrineName(f.doctrine):'Locked'}</small></button>;})}</div>
      {(()=>{const f=FOUNDER_INDEX[setup.founder||'wanderer'];return <p className="setupNote">{f.description}{f.cards.length>0&&<> Starting hand: {f.cards.map(id=>CARD_INDEX[id]?.name).join(', ')}.</>}{f.doctrine&&<> {doctrineName(f.doctrine)} cards are three times as likely in the Market Hall.</>}</p>;})()}
    </div>
    <div className="setupBlock"><b><Gem size={15}/> Artifacts ({(setup.artifacts||[]).length}/{o.slots})</b>
      {o.artifacts.length?<div className="figurePool">{o.artifacts.map(id=>{const a=ARTIFACT_INDEX[id],sel=(setup.artifacts||[]).includes(id);return <button key={id} className={sel?'selected':''} aria-pressed={sel} disabled={!sel&&(setup.artifacts||[]).length>=o.slots} onClick={()=>toggle('artifacts',id,o.slots)}><span>{a.name}</span><small>{a.description}</small></button>;})}</div>:<p className="muted">No artifacts yet. Buy them with Legacy Points in the Legacy Market.</p>}
    </div>
    <div className="setupBlock"><b><PackageOpen size={15}/> Boosters ({(setup.boosters||[]).length}/{o.boosterLimit}, used up at founding)</b>
      {o.boosters.length?<div className="figurePool">{o.boosters.map(({id,count})=>{const b=BOOSTER_INDEX[id],sel=(setup.boosters||[]).includes(id);return <button key={id} className={sel?'selected':''} aria-pressed={sel} disabled={!sel&&(setup.boosters||[]).length>=o.boosterLimit} onClick={()=>toggle('boosters',id,o.boosterLimit)}><span>{b.name} ×{count}</span><small>{b.description}</small></button>;})}</div>:<p className="muted">No boosters in your storeroom.</p>}
    </div>
    <div className="setupBlock"><b><Flame size={15}/> Hardship</b>
      <div className="hardshipRow"><button aria-label="Lower Hardship" disabled={!setup.hardship} onClick={()=>set({hardship:Math.max(0,(setup.hardship||0)-1)})}><Minus size={14}/></button>
        <strong aria-live="polite">{setup.hardship?`Hardship ${setup.hardship}`:'None'}</strong>
        <button aria-label="Raise Hardship" disabled={(setup.hardship||0)>=o.maxHardship} onClick={()=>set({hardship:Math.min(o.maxHardship,(setup.hardship||0)+1)})}><Plus size={14}/></button>
        <small>{o.maxHardship?`Up to ${o.maxHardship} open`:'Complete a city to open Hardship 1'}</small></div>
      <p className="setupNote">{HARDSHIP_TEXT(setup.hardship||0)}</p>
    </div>
    <p className="setupNote poolNote"><ScrollText size={14}/> <span>Card pool: <b>{pool}</b> of {ERA_CARDS.length} cards. Reach tier 1 of a doctrine in a run to open its Rares, tier 2 for its Epics and Patron.</span></p>
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
