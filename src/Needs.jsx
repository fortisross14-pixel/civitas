// CIVITAS v1.6 — the Needs panel: history ahead, district needs and the score.
import React from 'react';
import {Hammer,Hourglass,Check} from 'lucide-react';
import {NEEDS,NEED_YEARS,needAnswers,needsOf} from './needs.js';
import {omensOf,eventDefinition,undecidedText} from './events.js';
import {scoreOf,formatScore} from './score.js';
import {basicLimit} from './construction.js';
import {doctrinesOn} from './doctrines.js';
import {deckOf} from './cards.js';

const compact=n=>Number(n).toLocaleString('en-US');
const GLYPH={services:'✚',market:'⚖',air:'❦'};
export function yearsUntilDecline(n){return Math.max(1,Math.ceil((1-n.progress)*NEED_YEARS/(.5+(n.share||.5))));}
export function needAttention(city){return omensOf(city).some(o=>!Number.isInteger(o.choice))||needsOf(city).some(n=>!n.served&&n.progress>=.5);}

export function NeedsPanel({city,disabled,onAnswer,onBuild}){
  const omens=[...omensOf(city)].sort((a,b)=>a.due-b.due),needs=[...needsOf(city)].sort((a,b)=>(a.served-b.served)||b.progress-a.progress),score=scoreOf(city);
  return <div className="needsPanel">
    <section className="scoreCard" aria-label="Score"><span className="eyebrow">SCORE · PROSPERITY-YEARS</span><b>{formatScore(score.total)}</b>
      <small>+{formatScore(score.last)} a year{score.lost>0?` · ${formatScore(score.lost)} lost to decline and indecision`:''}</small></section>

    <div className="sidecaption first">HISTORY AHEAD</div>
    {omens.length===0?<p className="muted">No decisions are waiting. History will be announced here a few years before it arrives.</p>:
      omens.map(o=>{const def=eventDefinition(o.id),left=Math.max(0,o.due-city.year),disaster=o.id.startsWith('disaster:');
        return <article className={`omenCard ${Number.isInteger(o.choice)?'decided':''}`} key={o.id}>
          <div className="cardHead"><b>{o.title}</b><span><Hourglass size={13}/> {disaster?'respond by':'arrives'} {o.due}{left?` · ${left} yr${left===1?'':'s'}`:' · this year'}</span></div>
          <p>{o.text}</p>
          <div className="omenChoices" role="radiogroup" aria-label={`Response to ${o.title}`}>
            {def.choices.map((c,i)=><button key={c.label} role="radio" aria-checked={o.choice===i} className={o.choice===i?'sel':''} disabled={disabled} onClick={()=>onAnswer(o.id,i)}>
              <strong>{o.choice===i&&<Check size={14}/>}{c.label}</strong><span>{c.detail}</span></button>)}
          </div>
          <small className="omenFallback">{Number.isInteger(o.choice)?'You can change your mind until the deadline.':undecidedText(def)}</small>
        </article>;})}

    <div className="sidecaption">DISTRICT NEEDS</div>
    {needs.length===0?<p className="muted">Every district is served. Needs appear as rings on the map when a quarter outgrows its services, its market or its air.</p>:
      needs.map(n=>{const def=NEEDS[n.kind],answers=needAnswers(n.kind,city.year),limit=basicLimit(city);
        return <article className={`needCard ${n.served?'served':n.progress>=.66?'urgent':''}`} key={`${n.district}:${n.kind}`}>
          <div className="cardHead"><span className="needGlyph" aria-hidden="true">{GLYPH[n.kind]}</span><b>{n.name} {n.served?'is now served':`needs ${def.label.toLowerCase()}`}</b></div>
          <div className="needBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(n.progress*100)} aria-label="Time until decline"><i style={{width:`${Math.round(n.progress*100)}%`}}/></div>
          <small>{n.served?'The ring is draining; the need will fade.':`${def.why} Declines in about ${yearsUntilDecline(n)} years.`}</small>
          {!n.served&&doctrinesOn(city)&&<div className="needAnswers">{answers.map(b=>{const id=`b_${b.kind}`,held=deckOf(city).hand.find(h=>h.cardId===id),offer=(deckOf(city).shop?.offers||[]).find(o=>o.cardId===id);
            if(held)return <button key={b.id} className="primary" disabled={disabled} onClick={()=>onBuild(b,n,{uid:held.uid})}><Hammer size={14}/> Place {b.name}<small>card in hand</small></button>;
            if(offer)return <button key={b.id} disabled={disabled||city.funds<offer.price} onClick={()=>onBuild(b,n,{offer:offer.uid})}><Hammer size={14}/> Buy {b.name} card<small>{compact(offer.price)}</small></button>;
            return <span key={b.id} className="needWait">{b.name}: the Market Hall stocks its card at the next restock</span>;})}</div>}
          {!n.served&&!doctrinesOn(city)&&<div className="needAnswers">{answers.map(b=>{const full=city.buildings.filter(x=>x.special===b.kind).length>=limit;
            return <button key={b.id} disabled={disabled||city.funds<b.cost||full} title={full?`One ${b.name} per district (${limit})`:b.description} onClick={()=>onBuild(b,n)}><Hammer size={14}/> {b.name}<small>{compact(b.cost)}</small></button>;})}</div>}
        </article>;})}
    <p className="hint">Build the answer close to the ring: churches, schools and clinics serve homes within about 8 parcels, markets about 6, gardens clear the air within about 5.</p>
  </div>;
}

// A pill above the hand when history is waiting for a decision.
export function HistoryPill({city,onOpen}){
  const waiting=omensOf(city).filter(o=>!Number.isInteger(o.choice)).sort((a,b)=>a.due-b.due);
  if(!waiting.length)return null;const o=waiting[0];
  return <button className="historyPill" onClick={onOpen}><b>⚑ Decide:</b> {o.title} <span>by {o.due}</span>{waiting.length>1&&<em>+{waiting.length-1}</em>}</button>;
}
