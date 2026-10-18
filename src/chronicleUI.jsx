import React,{useEffect,useMemo,useRef,useState} from 'react';
import {drawCity} from './render.js';
import {BookOpen,Landmark,Clock3,ChartNoAxesCombined,Trophy,ArrowLeft,Layers3,Share2,Users,Filter,GitCompareArrows,ExternalLink} from 'lucide-react';
import {W,H,terrain,ZONES,snapshotCity,stats} from './sim.js';
import {METRICS,numberText,metricSeries,cityRecords,identityOf,timelineItems,periodSummary,comparisonSeries,historyAt,shareSummary} from './chronicle.js';

const MAIN_METRICS=['economyScore','technologyScore','cultureScore','faithScore','infrastructureScore','attractionScore','population','gdp','gdpPerCapita','culturalPrestige','tourismAppeal','religiousInfluence','educationIndex','densityPerZone','heritage','prosperity','infrastructureEfficiency','unemployment'];
function Selector({value,onChange,options,label}){return <label className="chronSelect">{label&&<span>{label}</span>}<select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;}
export function HistoricalChart({city,metric='population',height=125}){
 const rows=metricSeries(city,metric),shown=rows.filter((_,i)=>i%Math.max(1,Math.ceil(rows.length/160))===0||i===rows.length-1);
 if(!shown.length)return <p className="muted">No archived values for this metric yet.</p>;
 const lowYear=shown[0].year,highYear=shown.at(-1).year,minY=Math.min(0,...shown.map(v=>v.value)),maxY=Math.max(1,...shown.map(v=>v.value));
 const X=v=>12+(v-lowYear)/Math.max(1,highYear-lowYear)*336;
 const Y=v=>height-15-(v-minY)/Math.max(1,maxY-minY)*(height-30);
 const points=shown.map(v=>`${X(v.year).toFixed(2)},${Y(v.value).toFixed(2)}`).join(' ');
 return <div className="cLineWrap"><svg viewBox={`0 0 360 ${height}`} preserveAspectRatio="none" role="img" aria-label={`${METRICS[metric]?.name}: ${numberText(shown[0].value)} in ${lowYear}, ${numberText(shown.at(-1).value)} in ${highYear}`}>
  {[0,.25,.5,.75,1].map(t=><line key={t} x1="12" x2="348" y1={15+(height-30)*t} y2={15+(height-30)*t} stroke="#d9d1c0" strokeWidth=".7" strokeDasharray="2 4"/>)}
  <polygon points={`12,${height-15} ${points} 348,${height-15}`} fill="#aab9a6" opacity=".2"/>
  <polyline points={points} fill="none" stroke="#4d7562" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
  <circle cx={X(shown.at(-1).year)} cy={Y(shown.at(-1).value)} r="3" fill="#4d7562"/>
 </svg><div className="cLineLabels"><span>{lowYear}</span><span>Peak {numberText(maxY)} {METRICS[metric]?.unit}</span><span>{highYear}</span></div></div>;
}
function HistoryRecords({city}){
 const r=cityRecords(city);
 const cards=(city.turning?.choices||[]).length;
 const values=[['Peak population',r.population],['Peak modeled GDP',r.gdp],['Highest GDP per capita',r.gdpPerCapita],['Most cultural prestige',r.culturalPrestige],['Most religious influence',r.religiousInfluence],['Best tourism appeal',r.tourismAppeal],['Highest prosperity',r.prosperity],['Best infrastructure efficiency',r.infrastructureEfficiency],['Historic buildings peak',r.heritage]];
 return <div className="chronRecords"><div className="eyebrow">CITY RECORD BOOK</div>{values.map(([label,rec])=><div className="chronRecord" key={label}><span>{label}</span><b>{numberText(rec?.value)}</b><small>{rec?.year??'—'}</small></div>)}
 <div className="chronRecord"><span>Oldest surviving building</span><b>{r.oldestSurvivor?.born??'—'}</b><small>{r.oldestSurvivor?.special||r.oldestSurvivor?.type||''}</small></div>
 <div className="chronRecord"><span>Strongest 5-year population gain</span><b>{r.mostGrowth?`+${numberText(r.mostGrowth.gain)}`:'—'}</b><small>{r.mostGrowth?.year??'—'}</small></div>
 <div className="chronRecord"><span>Decisions / people / events</span><b>{cards} / {r.figures} / {r.events}</b><small>Recorded</small></div>
 <div className="chronRecord"><span>Lost / redeveloped buildings</span><b>{numberText(r.lost)}</b><small>Tracked sites</small></div>
 </div>;
}
export function ChroniclePanel({city,archiveYear,onArchiveYear,onOpenBuild,onTimelapse}){
 const [view,setView]=useState('overview'),[metric,setMetric]=useState('population'),[eventFilter,setEventFilter]=useState('all'),[showEvents,setShowEvents]=useState(30);
 const records=useMemo(()=>cityRecords(city),[city]);const timeline=useMemo(()=>timelineItems(city),[city]);
 const snapshots=city.snapshots||[];
 const archived=archiveYear!==null&&archiveYear!==undefined;
 const selectedIndex=archived?snapshots.findIndex(s=>s.year===archiveYear):snapshots.length-1;
 const visible=timeline.filter(item=>eventFilter==='all'||item.category===eventFilter).slice().reverse();
 const archivedSnapshot=archived?snapshots.find(s=>s.year===archiveYear):null;
 const periods=useMemo(()=>periodSummary(city),[city]);
 const copy=()=>{const summary=shareSummary(city);if(navigator.clipboard?.writeText)navigator.clipboard.writeText(summary).catch(()=>window.prompt('Copy your Chronicle:',summary));else window.prompt('Copy your Chronicle:',summary);};
 return <div className="sidecontent chroniclePanel">
  <div className="eyebrow">THE GREAT CHRONICLE</div><h2>{city.name}</h2><p className="chronEpithet">{identityOf(city)} · 1300–{city.year} · {city.type}</p>
  <div className="chronPills"><span>{city.finished?'COMPLETE':'IN PROGRESS'}</span><span>{records.turningPoints} / 20 decisions</span><span>{records.snapshots} survey maps</span></div>
  <div className="chronTabs">{[['overview','Overview'],['timeline','Timeline'],['records','Records']].map(([key,title])=><button key={key} className={view===key?'sel':''} onClick={()=>setView(key)}>{title}</button>)}</div>
  {view==='overview'&&<>
   {onTimelapse&&<button className="primary wide timelapseLaunch" onClick={onTimelapse} disabled={(city.snapshots||[]).length<1}>▶ Play timelapse · one map every 50 years</button>}<h3>HISTORICAL MAP SURVEYS</h3><p className="muted">Inspect the actual archived streets and footprints. Earlier maps are read-only; the present is editable.</p>
   <select className="archiveSelect" value={archiveYear??''} onChange={e=>onArchiveYear(e.target.value===''?null:Number(e.target.value))}>
     <option value="">Present · {city.year}</option>{snapshots.slice().reverse().map(snap=><option key={snap.year} value={snap.year}>{snap.year} · {numberText(snap.population)} residents</option>)}
   </select>
   {snapshots.length>1&&<div className="archiveRange"><div><span>{snapshots[0].year}</span><span>{archived?`Survey ${archiveYear}`:'Present'}</span><span>{snapshots.at(-1).year}</span></div><input aria-label="Historical map timeline" type="range" min="0" max={snapshots.length-1} value={Math.max(0,selectedIndex)} onChange={e=>{const snap=snapshots[Number(e.target.value)];onArchiveYear(snap.year===city.year?null:snap.year);}}/></div>}
   <div className="chronArchiveButtons"><button disabled={selectedIndex<=0} onClick={()=>{const s=snapshots[selectedIndex-1];onArchiveYear(s.year===city.year?null:s.year);}}>← Earlier</button><button onClick={()=>onArchiveYear(null)} disabled={!archived}><Clock3 size={13}/> Present</button><button disabled={selectedIndex>=snapshots.length-1} onClick={()=>{const s=snapshots[selectedIndex+1];onArchiveYear(s.year===city.year?null:s.year);}}>Later →</button></div>
   {archivedSnapshot&&<div className="chronNote">Archived survey: {numberText(archivedSnapshot.buildings?.length)} buildings and {numberText(archivedSnapshot.roads?.length)} street tiles. Statistics are taken from that historical year.</div>}
   {snapshots[0]?.year>1300&&<p className="muted">Imported save: map surveys only exist from {snapshots[0].year}. Earlier footprints cannot be reconstructed.</p>}
   <h3>GROWTH THROUGH TIME</h3>
   <Selector value={metric} onChange={setMetric} options={MAIN_METRICS.map(k=>({value:k,label:METRICS[k].name}))}/>
   <HistoricalChart city={city} metric={metric}/>
   <div className="chronHighlights"><div><small>Peak</small><strong>{numberText(records[metric]?.value)}</strong><span>Year {records[metric]?.year??'—'}</span></div><div><small>Latest</small><strong>{numberText(metricSeries(city,metric).at(-1)?.value)}</strong><span>Year {city.year}</span></div></div>
   <h3>CHAPTERS OF HISTORY</h3>{periods.map(p=><div className="chronChapter" key={p.name}><div><strong>{p.name}</strong><small>{p.start}–{Math.min(p.end,city.year)}</small></div><span>{numberText(p.from)} → {numberText(p.to)}</span><small>{p.eventCount} recorded milestones</small></div>)}
   <h3>THE STRATEGIC BUILD</h3><p className="muted">{records.turningPoints} Turning Points, {records.figures} historical figures, {city.landmarks?.length||0} landmark commissions recorded.</p><button className="wide" onClick={onOpenBuild}><Landmark size={14}/> See cards, people and synergies</button>
   <button className="wide" onClick={copy}><Share2 size={14}/> Copy Chronicle summary</button>
  </>}
  {view==='timeline'&&<>
   <h3>{timeline.length} HISTORICAL ENTRIES</h3>
   <Selector value={eventFilter} onChange={v=>{setEventFilter(v);setShowEvents(30);}} options={[{label:'All historical events',value:'all'},{label:'Turning Points & figures',value:'decision'},{label:'Crises',value:'crisis'},{label:'Urban developments',value:'development'},{label:'Population milestones',value:'milestone'}]} label="Filter history"/>
   {visible.slice(0,showEvents).map((item,i)=><div className={`chronEvent ${item.category}`} key={`${item.year}-${item.type}-${i}`}><div><b>{item.year}</b><strong>{item.title}</strong></div><p>{item.text}</p></div>)}
   {!visible.length&&<p className="muted">No entries of this type have occurred.</p>}
   {visible.length>showEvents&&<button className="wide" onClick={()=>setShowEvents(v=>v+30)}>Show 30 more events ({visible.length-showEvents} left)</button>}
  </>}
  {view==='records'&&<HistoryRecords city={city}/>}
  <p className="chronDisclaimer">GDP, GDP per capita, and cultural indices are simulated game metrics, not historical economic datasets.</p>
 </div>;
}

const CITY_COLORS=['#42674f','#ad6851','#547f95','#957644','#807092','#577c75','#9b5570','#6c7443'];
const PERIOD_OPTIONS=[['all','All recorded years',1300,2030],['medieval','Medieval',1300,1499],['early','Early modern',1500,1749],['industrial','Industrial transition',1750,1899],['modern','Modern city',1900,2030]];
function YearInput({label,ariaLabel,value,min,max,onCommit}){
 const [draft,setDraft]=useState(String(value));
 useEffect(()=>setDraft(String(value)),[value]);
 const commit=()=>{const n=Number(draft),next=draft.trim()&&Number.isFinite(n)?Math.round(Math.max(min,Math.min(max,n))):value;setDraft(String(next));onCommit(next);};
 return <label className="comparisonYear"><span>{label}</span><input type="number" aria-label={ariaLabel} min={min} max={max} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){setDraft(String(value));}}}/></label>;
}
function AtlasThumbnail({city,year,width=560,height=345}){
 const cv=useRef(null);
 const snap=(city.snapshots||[]).filter(s=>s.year<=year).sort((a,b)=>a.year-b.year).at(-1);
 const map=year>city.year?null:year===city.year?city:snap?snapshotCity(city,snap):null;
 useEffect(()=>{
  const canvas=cv.current;if(!canvas||!map)return;
  const ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=width*ratio;canvas.height=height*ratio;
  const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);
  drawCity(ctx,map,width,height,{layer:'urban',population:historyAt(city,map.year)?.population||0,archiveYear:map.year});
 },[city,year,width,height]);
 if(!map)return <div className="comparisonMapEmpty">{year>city.year?`Reached ${city.year}; no map for ${year} yet.`:'No survey saved for this date.'}</div>;
 return <div className="surveyMap"><canvas ref={cv} style={{width:'100%',height:'auto',aspectRatio:`${width}/${height}`}} aria-label={`${city.name}, actual map survey from ${map.year}`}/><small>{year===city.year?'Present map':`Saved survey · ${map.year}`}{map.year!==year?` · last available before ${year}`:''}</small></div>;
}
export function ComparisonChart({series,metric,from,to,year,colors}){
 const values=series.flatMap(s=>s.points.map(p=>p.value)),minimum=Math.min(0,...values),maximum=Math.max(1,...values);
 const x=v=>76+(v-from)/Math.max(1,to-from)*890;
 const y=v=>286-(v-minimum)/(maximum-minimum)*250;
 const years=[...new Set(Array.from({length:5},(_,i)=>Math.round(from+(to-from)*i/4)))];
 const label=v=>Math.abs(v)>=1e9?`${(v/1e9).toFixed(1)}b`:Math.abs(v)>=1e6?`${(v/1e6).toFixed(1)}m`:Math.abs(v)>=1e3?`${(v/1e3).toFixed(1)}k`:numberText(v);
 if(!values.length)return <div className="comparisonEmpty">No recorded {METRICS[metric].name.toLowerCase()} in this period. Choose another period or city.</div>;
 return <div className="comparisonPlot"><svg viewBox="0 0 1000 330" role="img" aria-label={`${METRICS[metric].name} comparison from ${from} to ${to} for ${series.map(s=>s.name).join(', ')}`}>
  <title>{`${METRICS[metric].name} · ${from}–${to}`}</title>
  {Array.from({length:5},(_,i)=>{const value=minimum+(maximum-minimum)*i/4;return <g key={i}><line x1="76" x2="966" y1={y(value)} y2={y(value)} stroke="#d7ccba" strokeWidth="1" strokeDasharray={i?'3 5':undefined}/><text x="63" y={y(value)+4} textAnchor="end">{label(value)}</text></g>;})}
  {years.map(value=><g key={value}><line x1={x(value)} x2={x(value)} y1="286" y2="292" stroke="#9d947f"/><text x={x(value)} y="314" textAnchor="middle">{value}</text></g>)}
  <line x1={x(year)} x2={x(year)} y1="25" y2="286" stroke="#9d947f" strokeDasharray="4 5"/>
  {series.map((s,index)=><g key={s.id} style={{color:colors.get(s.id)||CITY_COLORS[index%CITY_COLORS.length]}}><polyline points={s.points.map(p=>`${x(p.year)},${y(p.value)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>{s.points.map(p=><circle key={p.year} cx={x(p.year)} cy={y(p.value)} r={s.points.length===1?4:2.5} fill="currentColor"><title>{`${s.name} · ${p.year}: ${numberText(p.value)}`}</title></circle>)}</g>)}
 </svg></div>;
}
export function UrbanAtlas({cities,onBack,onOpen,backLabel='Home',activeCityId}){
 const latest=Math.max(1300,...cities.map(c=>c.year));
 const [metric,setMetric]=useState('population'),[from,setFrom]=useState(1300),[to,setTo]=useState(latest),[selected,setSelected]=useState(null),[surveyYear,setSurveyYear]=useState(latest);
 const samples=useMemo(()=>new Map(cities.map(c=>[c.id,stats(c)])),[cities]);
 const chosen=useMemo(()=>cities.filter(c=>selected===null||selected.includes(c.id)),[cities,selected]);
 const colors=useMemo(()=>new Map(cities.map((c,i)=>[c.id,CITY_COLORS[i%CITY_COLORS.length]])),[cities]);
 const series=useMemo(()=>comparisonSeries(chosen,metric,from,to,samples),[chosen,metric,from,to,samples]);
 const year=Math.max(from,Math.min(to,surveyYear));
 const period=PERIOD_OPTIONS.find(([, ,a,b])=>a===from&&Math.min(b,latest)===to)?.[0]||'custom';
 const changePeriod=id=>{const p=PERIOD_OPTIONS.find(p=>p[0]===id);if(p){setFrom(p[2]);setTo(Math.max(p[2],Math.min(p[3],latest)));setSurveyYear(Math.max(p[2],Math.min(p[3],latest)));}};
 const toggleCity=id=>setSelected(prev=>{const ids=prev===null?cities.map(c=>c.id):prev;return ids.includes(id)?ids.filter(i=>i!==id):[...ids,id];});
 return <main className="atlasPage comparisonPage">
  <div className="comparisonHead"><button onClick={onBack}><ArrowLeft size={15}/> {backLabel}</button><div className="eyebrow">THE URBAN ATLAS</div><h1>Compare cities</h1><p>One measure, a shared period, and the maps that tell the story.</p></div>
  {!cities.length?<div className="comparisonEmpty"><BookOpen size={28}/><h2>Your atlas is waiting</h2><p>Found a city to begin recording its growth and map surveys.</p><button onClick={onBack}>Return</button></div>:<>
   <section className="comparisonControls" aria-label="Comparison controls">
    <Selector label="Measure" value={metric} onChange={setMetric} options={MAIN_METRICS.map(k=>({value:k,label:METRICS[k].name}))}/>
    <Selector label="Period" value={period} onChange={changePeriod} options={[...PERIOD_OPTIONS.map(([id,label])=>({value:id,label})),{value:'custom',label:'Custom period'}]}/>
    <YearInput label="From" ariaLabel="Period start year" value={from} min={1300} max={to} onCommit={setFrom}/>
    <YearInput label="To" ariaLabel="Period end year" value={to} min={from} max={2030} onCommit={setTo}/>
   </section>
   <fieldset className="comparisonCities"><legend>Cities to compare</legend>{cities.map(c=><label key={c.id} style={{'--city-color':colors.get(c.id)}}><input type="checkbox" checked={selected===null||selected.includes(c.id)} onChange={()=>toggleCity(c.id)}/><i/>{c.name}{c.id===activeCityId&&<small>current</small>}</label>)}<button onClick={()=>setSelected(null)}>Select all</button></fieldset>
   <section className="comparisonChartPanel"><div className="comparisonPanelHead"><div><span className="eyebrow">GROWTH THROUGH TIME</span><h2>{METRICS[metric].name}</h2></div><span>{from}–{to} · {METRICS[metric].unit}</span></div>
    {!chosen.length?<div className="comparisonEmpty">Select a city above to show its chart and map.</div>:<ComparisonChart series={series} metric={metric} from={from} to={to} year={year} colors={colors}/>}
    <div className="comparisonLegend">{series.map(row=>{const point=row.points.filter(p=>p.year<=year).at(-1);return <div key={row.id}><i style={{background:colors.get(row.id)}}/><span>{row.name}</span><b>{point?numberText(point.value):'No record'}</b><small>{point?point.year:''}</small></div>;})}</div>
   </section>
   {chosen.length>0&&<section className="comparisonMaps"><div className="comparisonPanelHead"><div><span className="eyebrow">MAP SURVEYS</span><h2>The cities in {year}</h2></div><YearInput label="Survey year" ariaLabel="Map survey year" value={year} min={from} max={to} onCommit={setSurveyYear}/></div>
    <input className="surveyRange" aria-label="Map survey timeline" type="range" min={from} max={to} value={year} onChange={e=>setSurveyYear(Number(e.target.value))}/>
    <div className="comparisonMapGrid">{chosen.map(c=><article key={c.id}><div className="comparisonMapTitle"><h3><i style={{background:colors.get(c.id)}}/>{c.name}</h3><button onClick={()=>onOpen(c.id)} aria-label={`Open ${c.name}`}>Open <ExternalLink size={12}/></button></div><AtlasThumbnail city={c} year={year}/></article>)}</div>
   </section>}
   <p className="chronDisclaimer">Charts use recorded game values and the current city endpoint. Lines stop where a city’s records stop. Maps show the latest saved survey at or before your selected year; its actual date is shown below each map.</p>
  </>}
 </main>;
}
