// v2.5: "Welcome to the … Age". Shown once when an Age begins; the clock waits.
import React,{useEffect,useRef} from 'react';
import {Building2,Route,Home,Layers3,ArrowRight} from 'lucide-react';
import {AGES} from './ages.js';
import {ageChanges} from './ageChanges.js';
import {Info} from './Info.jsx';

export function AgeWelcome({city,onContinue}){
  const w=city?.ageWelcome,age=w&&AGES.find(a=>a.id===w.id),ref=useRef(null);
  useEffect(()=>{ref.current?.querySelector('.primary')?.focus();},[w?.id]);
  if(!age)return null;
  const ch=ageChanges(age);
  return <div className="turningBackdrop"><section ref={ref} className="ageWelcome" role="dialog" aria-modal="true" aria-labelledby="ageTitle">
    <div className="eyebrow">A NEW AGE · {age.from}</div>
    <h2 id="ageTitle">Welcome to {age.title}</h2>
    <p className="ageTagline">{age.tagline}</p>
    <ul className="ageChanges">
      {ch.landmarks.length>0&&<li><Building2 size={18}/><span><b>New landmarks</b>{ch.landmarks.join(' · ')}</span></li>}
      <li><Route size={18}/><span><b>Streets</b>{age.streetText}{ch.works.length>0&&<> · {ch.works.map(c=>c.name).join(', ')}</>}</span></li>
      <li><Home size={18}/><span><b>Houses</b>{age.styleText}</span></li>
      <li><Layers3 size={18}/><span><b>Market Hall</b>{ch.arrive.length} new cards{ch.retire.length>0?` · ${ch.retire.length} retire`:''}
        <Info label="Cards this Age" align="end"><span><b>Arrive:</b> {ch.arrive.map(c=>c.name).join(', ')||'none'}.</span>{ch.retire.length>0&&<span><b>Retire:</b> {ch.retire.map(c=>c.name).join(', ')}.</span>}</Info></span></li>
    </ul>
    <button className="primary wide" onClick={onContinue}>Enter {age.name==='Modern'?'the Modern Age':age.name==='Contemporary'?'the Contemporary Age':`the ${age.name}`} <ArrowRight size={16}/></button>
  </section></div>;
}
