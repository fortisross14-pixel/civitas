// CIVITAS v3 — the home screen: Continue first, then a new Chronicle,
// Scenarios, World Cities, the Legacy and your cities. Founding options open
// in a sheet so the page stays short.
import React,{useState} from 'react';
import {Play,Plus,Target,Globe2,Coins,BookOpen,Trash2,X,ChevronRight,Star,Download,Upload} from 'lucide-react';
import {SCENARIOS} from '../scenarios.js';
import './home.css';

const fmt=n=>Math.round(Number(n)||0).toLocaleString('en-US');
const GEOS=[['river','Winding river'],['coast','Coastal bay'],['estuary','Tidal estuary'],['lake','Lakeside basin'],['plain','Open plain']];

export function Home({legacy,saves,populations,ready,onContinue,onDelete,onStart,name,setName,geo,setGeo,setup,onScenarios,onWorld,onLegacy,onAtlas,onExport,onImport,warning}){
  const [founding,setFounding]=useState(false);
  const live=saves.find(c=>!c.finished),stars=SCENARIOS.reduce((a,s)=>a+(legacy.scenarios?.[s.id]?.stars||0),0);
  return <main className="h3">
    <div className="h-hero"><small>CIVITAS</small><h1>Every city has a story.</h1><p>Found a town in 1300. Shape it for seven centuries.</p></div>
    {warning}
    {live&&<button className="h-continue" onClick={()=>onContinue(live.id)}>
      <span className="h-play"><Play size={22} fill="currentColor"/></span>
      <span className="h-cText"><small>CONTINUE</small><b>{live.name}</b><em>{live.year} · {fmt(populations.get(live.id))} people{live.scenario?' · scenario':''}</em></span><ChevronRight size={20}/></button>}
    <button className={`h-new ${live?'':'solo'}`} disabled={!ready} onClick={()=>setFounding(true)}><Plus size={20}/><span><b>New Chronicle</b><small>1300 – 2030 · a charter every Age</small></span><ChevronRight size={18}/></button>
    <div className="h-grid">
      <button className="h-tile" onClick={onScenarios}><Target size={22}/><b>Scenarios</b><small><Star size={12} fill="currentColor"/> {stars}/{SCENARIOS.length*3}</small></button>
      <button className="h-tile red" onClick={onWorld}><Globe2 size={22}/><b>World Cities</b><small>Top 20 by Age</small></button>
      <button className="h-tile" onClick={onLegacy}><Coins size={22}/><b>Legacy</b><small>{fmt(legacy.points)} points</small></button>
      <button className="h-tile" onClick={onAtlas}><BookOpen size={22}/><b>Atlas</b><small>Compare your cities</small></button>
    </div>
    {saves.length>0&&<section className="h-saves"><div className="h-savesHead"><h2>Your cities</h2><span><button aria-label="Export backup" onClick={onExport}><Download size={16}/></button><button aria-label="Import backup" onClick={onImport}><Upload size={16}/></button></span></div>
      {saves.slice(0,8).map(c=><div key={c.id} className="h-save"><button className="h-saveOpen" onClick={()=>onContinue(c.id)}><b>{c.name}</b><small>{c.year} · {fmt(populations.get(c.id))} people · {c.finished?(c.ruined?'Ruined':'Complete'):'In progress'}</small></button><button className="h-del" aria-label={`Delete ${c.name}`} onClick={()=>onDelete(c.id)}><Trash2 size={15}/></button></div>)}
    </section>}
    {founding&&<div className="h-back" onPointerDown={e=>{if(e.target===e.currentTarget)setFounding(false);}}><section className="h-sheet" role="dialog" aria-modal="true" aria-label="New Chronicle">
      <div className="h-sheetHead"><h2>New Chronicle</h2><button className="h-x" aria-label="Close" onClick={()=>setFounding(false)}><X size={20}/></button></div>
      <label className="h-field"><span>City name</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={40}/></label>
      <div className="h-field"><span>Geography</span><div className="h-geos">{GEOS.map(([id,l])=><button key={id} className={geo===id?'on':''} onClick={()=>setGeo(id)}>{l}</button>)}</div></div>
      {setup}
      <button className="h-go" disabled={!ready} onClick={()=>{setFounding(false);onStart();}}><Play size={18} fill="currentColor"/> Found the town</button>
    </section></div>}
  </main>;
}
