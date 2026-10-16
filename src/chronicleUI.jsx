import React,{useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Landmark,Clock3,ChartNoAxesCombined,Trophy,ArrowLeft,Layers3,Share2,Users,Filter,GitCompareArrows,ExternalLink} from 'lucide-react';
import {W,H,terrain,ZONES,snapshotCity,stats} from './sim.js';
import {METRICS,numberText,metricSeries,cityRecords,identityOf,timelineItems,periodSummary,atlasRecords,compareAt,HISTORICAL_CITIES,shareSummary} from './chronicle.js';

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
function AtlasThumbnail({city,year,width=280,height=165}){
 const cv=useRef(null);
 useEffect(()=>{
  const canvas=cv.current;if(!canvas)return;const ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=width*ratio;canvas.height=height*ratio;
  const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.fillStyle='#e0d5bc';ctx.fillRect(0,0,width,height);
  const snap=(city.snapshots||[]).filter(s=>s.year<=year).at(-1);const map=year>city.year?null:(year===city.year?city:(snap?snapshotCity(city,snap):null));
  const sx=width/W,sy=height/H;
  ctx.fillStyle='#a7c5c8';for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(terrain(city.type,x,y)==='water')ctx.fillRect(x*sx,y*sy,sx+.2,sy+.2);
  ctx.fillStyle='#fbf2dd';for(const r of map?.roads||[])if(Number.isFinite(r.x)&&Number.isFinite(r.y))ctx.fillRect((r.x+.32)*sx,(r.y+.32)*sy,sx*.39,sy*.39);
  for(const b of map?.buildings||[]){ctx.fillStyle=ZONES[b.type]?.color||'#a88768';ctx.fillRect(b.x*sx,b.y*sy,Math.max(1,(b.w||.7)*sx),Math.max(1,(b.h||.7)*sy));}
  ctx.fillStyle='#f6f0e4d9';ctx.fillRect(6,height-25,66,18);ctx.fillStyle='#554938';ctx.font='11px Georgia';ctx.fillText(map?String(map.year):year>city.year?'Not yet':'No survey',12,height-12);
 },[city,year,width,height]);
 return <canvas className="atlasMiniMap" ref={cv} style={{width:'100%',height:'auto',aspectRatio:`${width}/${height}`}} aria-label={`${city.name} map archive for selected year ${year}, showing the last available survey when present`}/>;
}
const COMPARE_YEARS=[1300,1400,1500,1600,1700,1800,1850,1900,1950,2000,2030];
export function UrbanAtlas({cities,onBack,onOpen}){
 const [metric,setMetric]=useState('population'),[year,setYear]=useState(1900),[selected,setSelected]=useState(null),[onlyFinished,setOnlyFinished]=useState(false),[historical,setHistorical]=useState(true),[mapPair,setMapPair]=useState([null,null]);
 const chosen=useMemo(()=>cities.filter(c=>(selected===null||selected.includes(c.id))&&(!onlyFinished||c.finished)),[cities,selected,onlyFinished]);
 const rows=useMemo(()=>compareAt(chosen,year,metric,{includeHistorical:historical}),[chosen,year,metric,historical]);
 const max=Math.max(1,...rows.map(r=>r.value));
 const records=useMemo(()=>atlasRecords(cities),[cities]);
 const cards=[['Largest population','largest','population'],['Wealthiest per person','richest','gdpPerCapita'],['Cultural champion','cultural','culturalPrestige'],['Religious center','religious','religiousInfluence'],['Tourism leader','tourism','tourismAppeal'],['Historic preservation','heritage','heritage']];
 return <main className="atlasPage">
 <div className="atlasHead"><button onClick={onBack}><ArrowLeft size={16}/> Home</button><div className="eyebrow">YOUR WORLD OF CITIES</div><h1>Urban Atlas</h1><p>Compare your own civilizations across the centuries and measure their population against selected historical benchmarks.</p></div>
 <div className="atlasSummary"><span><b>{cities.length}</b> cities founded</span><span><b>{cities.filter(c=>c.finished).length}</b> completed chronicles</span><span><b>{cities.reduce((n,c)=>n+(c.turning?.choices?.length||0),0)}</b> strategic decisions</span><span><b>{cities.reduce((n,c)=>n+(c.figures?.length||0),0)}</b> historical figures</span></div>
 {cities.length===0?<p className="muted">You haven't founded any cities yet. Begin a new city on the home screen; its history will appear here.</p>:<>
 <h2>Your cities</h2><div className="atlasCities">{cities.map(c=><article className="atlasCity" key={c.id}><AtlasThumbnail city={c} year={year}/><div className="atlasCityInfo"><span className="eyebrow">{c.finished?'COMPLETE':'IN PROGRESS'} · {c.year}</span><h3>{c.name}</h3><small>{identityOf(c)} · {c.type}</small><p>{numberText(cityRecords(c).population?.value)} peak residents</p><button onClick={()=>onOpen(c.id)}><BookOpen size={14}/> Open Chronicle</button></div></article>)}</div>
 {cities.length>=2&&<><h2>Two-city map comparison</h2><p className="muted">Same year, different histories. The thumbnails display actual saved surveys, not recreated past buildings. Change the year in the comparison controls below to synchronize both maps.</p><div className="atlasCompareBar"><Selector value={String(year)} onChange={v=>setYear(Number(v))} label="Compare maps in" options={COMPARE_YEARS.map(y=>({value:String(y),label:String(y)}))}/>{[0,1].map(index=><Selector key={index} label={`City ${index+1}`} value={mapPair[index]||cities[index%cities.length].id} onChange={id=>setMapPair(p=>p.map((old,i)=>i===index?id:old))} options={cities.map(c=>({value:c.id,label:c.name}))}/>)}</div><div className="atlasMapPair">{[0,1].map(index=>{const c=cities.find(v=>v.id===(mapPair[index]||cities[index%cities.length].id))||cities[index];const h=c.year>=year?c.history.filter(r=>r.year<=year).at(-1):null;return <div key={index}><strong>{c.name}</strong><AtlasThumbnail city={c} year={year}/><small>{h?`${numberText(h.population)} residents · modeled GDP/person ${numberText(h.gdpPerCapita)}`:c.year<year?'City has not reached the selected year.':'No historical survey for this date.'}</small></div>;})}</div></>}
 <h2>Personal records</h2><div className="atlasRecordGrid">{cards.map(([label,key,metricId])=>{const r=records[key];return <div className="atlasRecordCard" key={key}><small>{label}</small><strong>{numberText(r?.peak?.value)}</strong><span>{r?.city?.name||'No data yet'} · {r?.peak?.year||'—'}</span></div>;})}</div>
 </>}
 <h2>Compare cities by year</h2>
 <div className="atlasCompareBar">
  <Selector label="Historical year" value={String(year)} onChange={v=>setYear(Number(v))} options={COMPARE_YEARS.map(y=>({label:String(y),value:String(y)}))}/>
  <Selector label="Measure" value={metric} onChange={setMetric} options={MAIN_METRICS.map(k=>({label:METRICS[k].name,value:k}))}/>
  <label className="atlasToggle"><input type="checkbox" checked={historical} onChange={e=>setHistorical(e.target.checked)}/> Historical population benchmarks</label>
  <label className="atlasToggle"><input type="checkbox" checked={onlyFinished} onChange={e=>setOnlyFinished(e.target.checked)}/> Completed cities only</label>
 </div>
 {cities.length>1&&<div className="atlasChips"><span>Choose cities:</span>{cities.map(c=><label key={c.id}><input type="checkbox" checked={selected===null||selected.includes(c.id)} onChange={e=>setSelected(prev=>{const current=prev===null?cities.map(q=>q.id):prev;const next=e.target.checked?[...new Set([...current,c.id])]:current.filter(x=>x!==c.id);return next.length===cities.length?null:next;})}/>{c.name}</label>)}<button onClick={()=>setSelected(null)}>All</button></div>}
 <div className="atlasGraph"><div className="eyebrow">{METRICS[metric].name.toUpperCase()} · {year}</div>{rows.length?rows.map((r,i)=><div className="atlasBarRow" key={r.id}><div className="atlasBarTop"><span><b>{i+1}.</b> {r.name} {r.kind==='historical'&&<small>Historical · {r.year}</small>}{r.kind==='player'&&<small>Simulation · as of {r.year}</small>}</span><strong>{numberText(r.value)}</strong></div><div className="atlasBarTrack"><div className={r.kind==='historical'?'historicBar':'cityBar'} style={{width:`${Math.max(.5,r.value/max*100)}%`}}/></div></div>):<p className="muted">No comparable records for this year. Select a different year, metric, or set of cities.</p>}
 <p className="chronDisclaimer">Simulated-city values are game model outputs (and may reflect the last recorded year before {year}). Historical values are census or official estimates for the stated observation year, within 13 years of your selection; they are not interpolated. Historical populations refer to differing administrative boundaries. No real-world GDP values are inferred. {metric!=='population'?'Only your cities are ranked for this metric.':''}</p></div>
 <h2>Historical data sources</h2><div className="atlasSources">{HISTORICAL_CITIES.map(c=><div key={c.id}><strong>{c.name}</strong><small>{c.definition}</small><a href={c.url} target="_blank" rel="noreferrer">{c.source} <ExternalLink size={12}/></a></div>)}</div>
 </main>;
}
