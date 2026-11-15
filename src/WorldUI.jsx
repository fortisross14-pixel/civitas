// CIVITAS v2.6 — Scenarios, Trinkets and World Cities screens. Critical facts
// on the face of every card; the story and the numbers behind a tap or (i).
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,Lock,Star,Users,Factory,Coins,Church,Palette,GraduationCap,Trophy,Globe2,X,Play,Target} from 'lucide-react';
import {SCENARIOS,SCENARIO_INDEX,scenarioOpen,goalText,goalTarget,GOAL_STATS} from './scenarios.js';
import {TRINKETS,TRINKET_INDEX,TRINKET_SLOTS} from './trinkets.js';
import {RANK_CATEGORIES,RANK_INDEX,worldTable,formatRankValue,placingsOf} from './worldRankings.js';
import {AGES} from './ages.js';
import {stats} from './sim.js';
import {Info} from './Info.jsx';
import './world.css';

const CAT_ICON={population:Users,industry:Factory,wealth:Coins,faith:Church,culture:Palette,learning:GraduationCap};
const AGE_YEAR={medieval:1500,renaissance:1700,enlightenment:1850,modern:1950,contemporary:2025};
const dateOf=t=>new Date(t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
export const Stars=({n=0,of=3,size=14})=><span className="stars" aria-label={`${n} of ${of} stars`}>{Array.from({length:of},(_,i)=><Star key={i} size={size} className={i<n?'on':''} fill={i<n?'currentColor':'none'}/>)}</span>;
export const TrinketGlyph=({id,owned=true,size='md'})=>{const t=TRINKET_INDEX[id];if(!t)return null;return <span className={`trinketGlyph ${size} ${t.theme} ${owned?'':'unowned'}`} aria-hidden="true">{t.glyph}</span>;};

// Choose up to two owned trinkets. Short effect on the chip; the scenario that gives it behind (i).
export function TrinketPicker({legacy,value=[],onChange}){
  const owned=TRINKETS.filter(t=>(legacy.trinkets||[]).includes(t.id));
  const toggle=id=>onChange(value.includes(id)?value.filter(x=>x!==id):value.length<TRINKET_SLOTS?[...value,id]:[value[1],id]);
  return <div className="setupBlock trinketBlock"><b>Trinkets {value.length}/{TRINKET_SLOTS} <Info label="About trinkets"><span>Relics won by completing scenarios. Take up to two into any run.</span><span>Two of one kind build a world city.</span></Info></b>
    {owned.length?<div className="trinketRow">{owned.map(t=>{const sel=value.includes(t.id);return <button key={t.id} className={`trinketChip ${sel?'selected':''}`} aria-pressed={sel} onClick={()=>toggle(t.id)}><TrinketGlyph id={t.id}/><span><b>{t.name.replace('The ','')}</b><small>{t.short}</small></span></button>;})}</div>
      :<p className="muted trinketEmpty">Win a scenario to earn your first trinket.</p>}
  </div>;
}

// Home: three doors (Scenarios, World Cities) above the founding panel.
export function HubTiles({legacy,onScenarios,onWorld}){
  const stars=SCENARIOS.reduce((a,s)=>a+(legacy.scenarios?.[s.id]?.stars||0),0);
  const best=useMemo(()=>{let b=null;for(const e of legacy.worldEntries||[])for(const p of placingsOf(e,legacy.worldEntries))if(!b||p.rank<b.rank)b={...p,name:e.name};return b;},[legacy.worldEntries]);
  return <div className="hubTiles">
    <button className="hubTile scen" onClick={onScenarios}><span className="hubIcon"><Target size={22}/></span><span className="hubText"><b>Scenarios</b><small>{SCENARIOS.length} moments in history</small></span><span className="hubMeta"><Star size={14} fill="currentColor"/> {stars}/{SCENARIOS.length*3}</span></button>
    <button className="hubTile world" onClick={onWorld}><span className="hubIcon"><Globe2 size={22}/></span><span className="hubText"><b>World Cities</b><small>{best?`${best.name} · #${best.rank} ${RANK_INDEX[best.category].name}`:'The Top 20 of every Age'}</small></span><span className="hubMeta"><Trophy size={14}/> {best?`#${best.rank}`:'—'}</span></button>
  </div>;
}

function PageHead({title,onBack,right}){return <div className="worldHead"><button className="backChip" onClick={onBack}><ChevronLeft size={18}/> Home</button><h1>{title}</h1>{right}</div>;}

export function ScenariosPage({legacy,onBack,onStart,busy}){
  const [open,setOpen]=useState(null),rec=legacy.scenarios||{};
  const stars=SCENARIOS.reduce((a,s)=>a+(rec[s.id]?.stars||0),0);
  return <main className="worldPage">
    <PageHead title="Scenarios" onBack={onBack} right={<span className="headMeta"><Star size={15} fill="currentColor"/> {stars}/{SCENARIOS.length*3}</span>}/>
    <div className="scenarioGrid">{SCENARIOS.map((s,i)=>{const ok=scenarioOpen(rec,s.id),r=rec[s.id],won=(legacy.trinkets||[]).includes(s.reward);
      return <button key={s.id} className={`scenarioCard ${ok?'':'locked'}`} disabled={!ok} onClick={()=>setOpen(s.id)} style={{animationDelay:`${i*40}ms`}}>
        <span className="scenYears">{s.from}–{s.to}</span>
        <span className="scenName">{s.name}</span>
        <span className="scenBlurb">{ok?s.blurb:`Win a star in ${SCENARIOS[i-1].name} to open`}</span>
        <span className="scenFoot">{ok?<Stars n={r?.stars||0}/>:<Lock size={14}/>}<span className="scenReward"><TrinketGlyph id={s.reward} owned={won} size="sm"/>{TRINKET_INDEX[s.reward].name.replace('The ','')}</span></span>
      </button>;})}</div>
    {open&&<ScenarioSheet legacy={legacy} id={open} busy={busy} onClose={()=>setOpen(null)} onStart={onStart}/>}
  </main>;
}

function ScenarioSheet({legacy,id,onClose,onStart,busy}){
  const s=SCENARIO_INDEX[id],r=legacy.scenarios?.[id],t=TRINKET_INDEX[s.reward],won=(legacy.trinkets||[]).includes(s.reward);
  const [trinkets,setTrinkets]=useState(()=>(legacy.equipped||[]).filter(x=>(legacy.trinkets||[]).includes(x)));
  const ref=useRef(null);
  useEffect(()=>{ref.current?.querySelector('.primary')?.focus();const k=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',k);return()=>document.removeEventListener('keydown',k);},[onClose]);
  const goalLine=g=>{const L=GOAL_STATS[g.stat].label,base=g.min==='start'?(g.factor>1?`${L} ${Math.round((g.factor-1)*100)}% above the start`:`${L} back to the start`):goalText(g,null).replace(/ (at the end|by \d+)$/,'');return base+(g.keep?' at the end':g.by?` by ${g.by}`:'');};
  return <div className="sheetBackdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={ref} className="scenarioSheet" role="dialog" aria-modal="true" aria-labelledby="scenTitle">
    <button className="revealClose" aria-label="Close" onClick={onClose}><X size={18}/></button>
    <div className="eyebrow">{s.from}–{s.to}{r?.plays?` · played ${r.plays}`:''}</div>
    <h2 id="scenTitle">{s.name}</h2>
    <p className="scenSheetBlurb">{s.blurb} <Info label="The story" align="start"><span>{s.story}</span></Info></p>
    <ol className="goalList">{s.goals.map((g,i)=><li key={i}><Stars n={i+1<=(r?.stars||0)?i+1:0} of={i+1} size={13}/><span>{goalLine(g)}</span></li>)}</ol>
    <div className="rewardRow"><TrinketGlyph id={t.id} owned={won}/><span><small>{won?'WON':'REWARD · FIRST STAR'}</small><b>{t.name}</b><em>{t.short}</em></span></div>
    <TrinketPicker legacy={legacy} value={trinkets} onChange={setTrinkets}/>
    <button className="primary wide" disabled={busy} onClick={()=>onStart(id,trinkets)}><Play size={16}/> {busy?'Opening the city…':'Begin'}</button>
  </section></div>;
}

// In the game: the scenario objective as a pill, details behind (i).
export function ScenarioPill({city}){
  const st=city?.scenario,def=st&&SCENARIO_INDEX[st.id];if(!def)return null;
  const s=stats(city),g=def.goals[0],v=GOAL_STATS[g.stat].read(s),target=goalTarget(g,st),pct=Math.min(100,v/Math.max(1,target)*100);
  const short=n=>n>=1e4?`${Math.round(n/1000)}k`:Math.round(n).toLocaleString('en-US');
  return <div className="scenarioPill" role="status"><Stars n={st.stars} size={12}/><span className="pillGoal">{GOAL_STATS[g.stat].label} {short(v)}/{short(target)}</span><i style={{'--p':`${pct}%`}}/><span className="pillYear">to {def.to}</span>
    <Info label="Objectives" align="end">{def.goals.map((x,i)=><span key={i}>{st.met[i]!=null?'★':'☆'} {goalText(x,st)}{st.met[i]!=null?` (met ${st.met[i]})`:''}</span>)}</Info></div>;
}

// World Cities: Age × category, Top 20, your cities highlighted.
export function WorldCitiesPage({legacy,onBack}){
  const entries=legacy.worldEntries||[];
  const [age,setAge]=useState(()=>{const last=[...entries].sort((a,b)=>b.playedAt-a.playedAt)[0];const ids=last?AGES.map(a=>a.id).filter(id=>last.ages[id]):[];return ids.at(-1)||'enlightenment';});
  const [cat,setCat]=useState('population'),[expanded,setExpanded]=useState(null);
  const table=useMemo(()=>worldTable(age,cat,entries),[age,cat,entries]);
  const a=AGES.find(x=>x.id===age),c=RANK_INDEX[cat];
  const Row=({r})=>{return <li className={`rankRow ${r.mine?'mine':''} ${r.rank<=3?'podium p'+r.rank:''}`}>
    <button disabled={!r.mine} onClick={()=>setExpanded(expanded===r.entry?.id?null:r.entry?.id)} aria-expanded={r.mine?expanded===r.entry.id:undefined}>
      <span className="rankNo">{r.rank}</span>
      <span className="rankName"><b>{r.name}</b>{r.mine&&<small>Your city · {r.year} · played {dateOf(r.entry.playedAt)}</small>}</span>
      <span className="rankValue">{formatRankValue(cat,r.value)}</span>
    </button>
    {r.mine&&expanded===r.entry.id&&<div className="rankDetail">{RANK_CATEGORIES.map(k=>{const I=CAT_ICON[k.id];return <span key={k.id}><I size={13}/>{k.name} <b>{formatRankValue(k.id,r.entry.ages[age][k.id])}</b></span>;})}{r.entry.trinkets?.length>0&&<span className="rankTrinkets">{r.entry.trinkets.map(id=><TrinketGlyph key={id} id={id} size="sm"/>)}</span>}</div>}
  </li>;};
  return <main className="worldPage">
    <PageHead title="World Cities" onBack={onBack} right={<Info label="About World Cities" align="end"><span>Europe and the Mediterranean at the end of each Age. Population figures are approximate; the other tables are the game’s own indexes.</span><span>Every finished city joins the table for each Age it lived through.</span></Info>}/>
    <div className="segmented ages" role="tablist" aria-label="Age">{AGES.map(x=><button key={x.id} role="tab" aria-selected={age===x.id} className={age===x.id?'sel':''} onClick={()=>setAge(x.id)}><b>{x.name}</b><small>{AGE_YEAR[x.id]}</small></button>)}</div>
    <div className="catChips" role="tablist" aria-label="Category">{RANK_CATEGORIES.map(k=>{const I=CAT_ICON[k.id];return <button key={k.id} role="tab" aria-selected={cat===k.id} className={cat===k.id?'sel':''} onClick={()=>setCat(k.id)}><I size={15}/>{k.name}</button>;})}</div>
    <div className="rankCaption"><span>{c.name} · {a.title.replace(/^the /,'')}, c. {AGE_YEAR[age]}</span><Info label={`About ${c.name}`} align="end"><span>{c.note}</span></Info></div>
    <ol className="rankList" key={age+cat}>{table.rows.map(r=><Row key={(r.mine?'m:'+r.entry.id:'h:'+r.name)} r={r}/>)}</ol>
    {table.best&&<ol className="rankList below"><li className="rankGap">⋯</li><Row r={table.best}/></ol>}
    {!entries.length&&<p className="muted worldEmpty">Finish a Chronicle or a scenario: your city joins this table for every Age it lived through.</p>}
  </main>;
}
