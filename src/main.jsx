import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Landmark,Play,FastForward,Plus,ArrowLeft,Save,MousePointer2,BarChart3,BookOpen,Trash2,Map as MapIcon,Download,Upload,Info,Check,RotateCcw,Maximize2}from'lucide-react';
import{W,H,END_YEAR,ZONES,terrain,makeCity,seedTown,stats,advance,addZone,eraAt,zoneCell,normalizeCity}from'./sim';
import './style.css';

const SAVE_KEY='civitas-v02-reviewed-saves';
const oldKeys=['civitas-v02-saves','civitas-v01-saves'];
function safeJson(k){try{const v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:[];}catch{return [];}}
function loadCities(){let current;try{current=localStorage.getItem(SAVE_KEY);}catch{current=null;}const saved=current!==null?safeJson(SAVE_KEY):oldKeys.flatMap(safeJson);const ids=new Set();return saved.map(normalizeCity).filter(c=>{if(!c||ids.has(c.id))return false;ids.add(c.id);return true;});}
function compact(n){return Number(n).toLocaleString('en-US');}
function downloadBackup(cities){const blob=new Blob([JSON.stringify({format:'civitas-cities-v2',cities},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='civitas-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function CityMap({city,tool,layer,onZone}){
  const canvas=useRef(null),drag=useRef(null),view=useRef({zoom:1,dx:0,dy:0});
  const [dimensions,setDimensions]=useState({width:600,height:500}),[frame,setFrame]=useState(0),[selection,setSelection]=useState(null),[hover,setHover]=useState(null);
  const redraw=()=>setFrame(x=>x+1);
  useEffect(()=>{const el=canvas.current;if(!el)return;const obs=new ResizeObserver(entries=>{const r=entries[0]?.contentRect;if(r?.width&&r.height)setDimensions({width:r.width,height:r.height});});obs.observe(el);return()=>obs.disconnect();},[]);
  const transform=()=>{const {width,height}=dimensions;const scale=Math.min(width/W,height/H)*view.current.zoom;return {scale,ox:(width-W*scale)/2+view.current.dx,oy:(height-H*scale)/2+view.current.dy};};
  const toMap=(e)=>{const r=canvas.current.getBoundingClientRect(),{scale,ox,oy}=transform();return {x:Math.floor((e.clientX-r.left-ox)/scale),y:Math.floor((e.clientY-r.top-oy)/scale)};};
  const zoom=(ratio,cx=dimensions.width/2,cy=dimensions.height/2)=>{const old=transform(),next=Math.max(.65,Math.min(7,view.current.zoom*ratio));if(next===view.current.zoom)return;const newScale=old.scale*next/view.current.zoom;const wx=(cx-old.ox)/old.scale,wy=(cy-old.oy)/old.scale;view.current={zoom:next,dx:cx-wx*newScale-(dimensions.width-W*newScale)/2,dy:cy-wy*newScale-(dimensions.height-H*newScale)/2};redraw();};
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    const wheel=e=>{e.preventDefault();const r=el.getBoundingClientRect();zoom(e.deltaY>0?.86:1.16,e.clientX-r.left,e.clientY-r.top);};
    el.addEventListener('wheel',wheel,{passive:false});
    return()=>el.removeEventListener('wheel',wheel);
  },[dimensions]);
  useEffect(()=>{
    const c=canvas.current;if(!c)return;const {width,height}=dimensions,dpr=Math.min(2,window.devicePixelRatio||1);
    c.width=Math.max(1,Math.round(width*dpr));c.height=Math.max(1,Math.round(height*dpr));
    const ctx=c.getContext('2d');if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#e1dbc6';ctx.fillRect(0,0,width,height);
    const {scale,ox,oy}=transform();ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
    ctx.fillStyle='#ded5b9';ctx.fillRect(0,0,W,H);
    // Historical parcel field texture, deliberately subtle and grid-aligned.
    ctx.lineWidth=.035;ctx.strokeStyle='#b7b39a40';for(let x=0;x<W;x+=4){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    // Color only dry zoned parcels; rivers and coast are never painted over.
    if(layer==='zones'||layer==='urban')for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const type=zoneCell(city,x,y);if(type){ctx.fillStyle=ZONES[type].color+(layer==='zones'?'63':'1d');ctx.fillRect(x,y,1,1);}
    }
    // Tiled water provides continuous silhouettes even at different zoom levels.
    ctx.fillStyle='#a6c5c8';for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(terrain(city.type,x,y)==='water')ctx.fillRect(x,y,1.03,1.03);
    // Waterway edge and small land boundary line.
    ctx.lineWidth=.1;ctx.strokeStyle='#81a8a9';for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(terrain(city.type,x,y)==='water'){
      if(x&&terrain(city.type,x-1,y)==='land'){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+1);ctx.stroke();}
      if(x<W-1&&terrain(city.type,x+1,y)==='land'){ctx.beginPath();ctx.moveTo(x+1,y);ctx.lineTo(x+1,y+1);ctx.stroke();}
    }
    // Street segments are narrow cartographic paths, not entire painted grid cells.
    const streets=new Set(city.roads.filter(r=>Number.isFinite(r.x)).map(r=>`${r.x},${r.y}`));
    ctx.strokeStyle='#f5ecd9';ctx.lineWidth=.38;ctx.lineCap='round';ctx.beginPath();
    for(const road of city.roads)if(Number.isFinite(road.x)){
      const {x,y}=road;
      if(streets.has(`${x+1},${y}`)){ctx.moveTo(x+.5,y+.5);ctx.lineTo(x+1.5,y+.5);}
      if(streets.has(`${x},${y+1}`)){ctx.moveTo(x+.5,y+.5);ctx.lineTo(x+.5,y+1.5);}
    }
    ctx.stroke();ctx.fillStyle='#f5ecd9';
    for(const road of city.roads)if(Number.isFinite(road.x))ctx.fillRect(road.x+.35,road.y+.35,.30,.30);
    for(const road of city.roads)if(road.orientation){
      ctx.lineCap='round';ctx.beginPath();ctx.strokeStyle='#faf1df';ctx.lineWidth=.42;
      if(road.orientation==='h'){ctx.moveTo(road.from,road.v);ctx.lineTo(road.to,road.v);}else{ctx.moveTo(road.v,road.from);ctx.lineTo(road.v,road.to);}ctx.stroke();
    }
    const ageColor=year=>year<1500?'#6d6252':year<1750?'#9c7d5c':year<1850?'#b29272':year<1950?'#ad806a':year<2000?'#788d87':'#5f858e';
    for(const b of city.buildings){
      let color=ZONES[b.type]?.color||'#a98762';
      if(layer==='age')color=ageColor(b.born);
      if(layer==='services')color=b.type==='civic'?'#538773':'#b9b4a3';
      if(layer==='economy')color=b.type==='trade'?'#d09e52':b.type==='craft'?'#9c8272':b.type==='farm'?'#b5bf79':'#b5aea1';
      const footprint=b.w&&b.h?[b.w,b.h]:[.7,.7];
      ctx.fillStyle='#5a4a3c33';ctx.fillRect(b.x+.08,b.y+.1,footprint[0],footprint[1]);
      ctx.fillStyle=color;ctx.fillRect(b.x,b.y,footprint[0],footprint[1]);
      ctx.strokeStyle='#ede1ca';ctx.lineWidth=.075;ctx.strokeRect(b.x,b.y,footprint[0],footprint[1]);
      // Add a secondary border to tall, dense residential footprints.
      if(b.type==='res'&&(b.level||1)>=4){ctx.strokeStyle='#3d565b';ctx.lineWidth=.075;ctx.strokeRect(b.x+.12,b.y+.12,footprint[0]-.24,footprint[1]-.24);}
      if(b.type==='civic'){ctx.fillStyle='#f4e7c6';ctx.fillRect(b.x+footprint[0]*.35,b.y+footprint[1]*.27,footprint[0]*.3,footprint[1]*.45);}
    }
    if(selection){ctx.lineWidth=.21;ctx.strokeStyle='#3c6d57';ctx.fillStyle='#3c895231';ctx.fillRect(selection.x,selection.y,selection.w,selection.h);ctx.strokeRect(selection.x,selection.y,selection.w,selection.h);}
    ctx.restore();
    // Fixed screen-space historical annotations.
    ctx.fillStyle='#544c3c';ctx.font='12px Georgia,serif';ctx.fillText('N',18,height-65);
    ctx.beginPath();ctx.moveTo(22,height-59);ctx.lineTo(16,height-43);ctx.lineTo(28,height-43);ctx.closePath();ctx.fill();
    ctx.font='11px Georgia,serif';ctx.fillText(`${city.name}  ·  ${city.year}`,16,height-28);
    ctx.fillStyle='#6d6353';ctx.fillRect(17,height-19,70,1.7);
    ctx.font='10px Georgia,serif';ctx.fillText('CIVITAS CARTOGRAPHIC SURVEY',16,19);
  },[city,layer,selection,dimensions,frame]);
  const down=e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);const p=toMap(e);drag.current={start:p,cx:e.clientX,cy:e.clientY,dx:view.current.dx,dy:view.current.dy};if(tool!=='inspect')setSelection({x:p.x,y:p.y,w:1,h:1});};
  const move=e=>{const p=toMap(e);if(hover?.x!==p.x||hover?.y!==p.y)setHover(p);if(!drag.current)return;
    if(tool==='inspect'){view.current.dx=drag.current.dx+e.clientX-drag.current.cx;view.current.dy=drag.current.dy+e.clientY-drag.current.cy;redraw();}
    else{const a=drag.current.start,x=Math.min(a.x,p.x),y=Math.min(a.y,p.y);setSelection({x,y,w:Math.abs(a.x-p.x)+1,h:Math.abs(a.y-p.y)+1});}
  };
  const up=e=>{const d=drag.current;if(!d)return;drag.current=null;if(tool!=='inspect'){
    const p=toMap(e);const x=Math.max(0,Math.min(W-1,Math.min(d.start.x,p.x))),y=Math.max(0,Math.min(H-1,Math.min(d.start.y,p.y)));
    const mx=Math.max(0,Math.min(W-1,Math.max(d.start.x,p.x))),my=Math.max(0,Math.min(H-1,Math.max(d.start.y,p.y)));
    if(mx>=x&&my>=y)onZone({x,y,w:mx-x+1,h:my-y+1},tool);
  }setSelection(null);};
  return <div className="mapwrap">
    <canvas ref={canvas} aria-label="Geometric map. Drag to zone land or use the Explore tool to pan." onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null;setSelection(null)}} style={{touchAction:'none',cursor:tool==='inspect'?'grab':'crosshair'}}/>
    <div className="mapzoom"><button aria-label="Zoom in" onClick={()=>zoom(1.3)}>+</button><button aria-label="Zoom out" onClick={()=>zoom(1/1.3)}>−</button><button aria-label="Reset map view" onClick={()=>{view.current={zoom:1,dx:0,dy:0};redraw();}}><Maximize2 size={14}/></button></div>
    {hover&&<div className="coord">{hover.x}, {hover.y} · {zoneCell(city,hover.x,hover.y)|| (terrain(city.type,hover.x,hover.y)==='water'?'Water':'Unzoned')}</div>}
  </div>;
}

function PopulationChart({history}){const points=history.filter((_,i)=>i%Math.max(1,Math.floor(history.length/90))===0||i===history.length-1);const max=Math.max(1,...points.map(x=>x.population));return <div className="historygraph" role="img" aria-label={`Population from ${history[0]?.year||1300} to ${history.at(-1)?.year||1300}`}>
  {points.map((h,i)=><div key={`${h.year}-${i}`} title={`${h.year}: ${compact(h.population)} residents`} style={{height:`${Math.max(2,h.population/max*100)}%`}}/>)}
</div>;}

function App(){
 const [saves,setSaves]=useState(loadCities),[activeId,setActiveId]=useState(null),[page,setPage]=useState('home'),[preview,setPreview]=useState(null),[simulating,setSimulating]=useState(false);
 const simulation=useRef(null);
 const [name,setName]=useState('New Valdoria'),[geo,setGeo]=useState('river'),[tool,setTool]=useState('inspect'),[layer,setLayer]=useState('urban'),[tab,setTab]=useState('stats'),[message,setMessage]=useState(''),[showMobileStats,setShowMobileStats]=useState(false),[storageError,setStorageError]=useState(false);
 const fileInput=useRef(null);const city=saves.find(c=>c.id===activeId)||null;const playCity=preview||city;const s=useMemo(()=>playCity?stats(playCity):null,[playCity]);
 useEffect(()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(saves));setStorageError(false);}catch{setStorageError(true);}},[saves]);
 const persist=useCallback(c=>{setSaves(prev=>[c,...prev.filter(v=>v.id!==c.id)]);setActiveId(c.id);},[]);
 const start=()=>{const city=seedTown(makeCity(name,geo,Math.floor(Math.random()*0x7fffffff)));persist(city);setPage('game');setTab('stats');setMessage('A settlement has been founded. Choose a zone and drag over the map.');};
 const stopSimulation=()=>{if(simulation.current){clearTimeout(simulation.current.timer);if(simulation.current.current)persist(simulation.current.current);simulation.current=null;}setPreview(null);setSimulating(false);};
 const goHome=()=>{stopSimulation();setPage('home');};
 const step=n=>{
   if(!city||city.finished||simulating)return;
   const remaining=Math.min(n,END_YEAR-city.year);
   if(remaining<=0)return;
   setSimulating(true);setMessage(`Watching ${remaining} years of urban evolution...`);
   const run={current:city,remaining,timer:null};simulation.current=run;
   const frame=()=>{
     if(simulation.current!==run)return;
     const delta=Math.min(5,run.remaining);
     run.current=advance(run.current,delta);run.remaining-=delta;
     setPreview(run.current);
     if(run.remaining>0){run.timer=setTimeout(frame,85);}
     else{persist(run.current);simulation.current=null;setPreview(null);setSimulating(false);setMessage(run.current.finished?'Chronicle complete — explore its historical record.':`Advanced to ${run.current.year}.`);}
   };
   run.timer=setTimeout(frame,40);
 };
 const onZone=(rect,type)=>{if(!city||city.finished||simulating)return;const next=addZone(city,rect.x,rect.y,rect.w,rect.h,type);if(next===city){setMessage('No buildable land was selected. Try a dry part of the map.');return;}persist(next);setMessage(`${ZONES[type].label} designated · ${rect.w} × ${rect.h} parcels. Existing historic buildings remain in place.`);};
 const remove=id=>{const item=saves.find(x=>x.id===id);if(!item||!window.confirm(`Delete ${item.name} and its chronicle? This cannot be undone without a backup.`))return;setSaves(v=>v.filter(x=>x.id!==id));if(activeId===id){setActiveId(null);setPage('home');}};
 const importSaves=async e=>{const f=e.target.files?.[0];if(!f)return;try{const contents=JSON.parse(await f.text());const rows=Array.isArray(contents)?contents:contents?.cities;if(!Array.isArray(rows))throw Error('Invalid save format');const imported=rows.map(normalizeCity).filter(Boolean);if(!imported.length)throw Error('No valid cities in file');setSaves(prev=>{const map=new Map(prev.map(c=>[c.id,c]));for(const c of imported)map.set(c.id,c);return [...map.values()];});setMessage(`Imported ${imported.length} cities.`);}catch(err){window.alert(`Unable to import: ${err.message}`);}finally{e.target.value='';}};
 return <div className="app">
  <header><button className="brand" onClick={goHome} aria-label="Return to CIVITAS home"><Landmark size={22}/><span>CIVITAS</span><small>CHRONICLE OF CITIES</small></button><div className="headerRight"><span>GEOMETRIC HISTORY SIMULATOR</span><span className="version">v0.2.1 · reviewed</span></div></header>
  {page==='home'||!city?<main className="home"><div className="eyebrow">THE URBAN ATLAS</div><h1>Every city has a story.</h1><p className="intro">Found a settlement. Shape its streets. Watch centuries unfold.</p>
    {storageError&&<p className="warning">Browser storage is full or unavailable. Export your cities to preserve them.</p>}
    <div className="homegrid"><section className="panel"><h2>Found a new city</h2><label>City name<input value={name} onChange={e=>setName(e.target.value)} maxLength={40}/></label><label>Geography<select value={geo} onChange={e=>setGeo(e.target.value)}><option value="river">Winding river</option><option value="coast">Coastal bay</option><option value="plain">Open plain</option></select></label><p className="muted">European medieval settlement · Founded 1300 · Campaign ends in 2030</p><button className="primary wide" onClick={start}><Plus size={16}/> Begin Chronicle</button></section>
    <section className="panel"><div className="panelhead"><h2>Your city atlas <span className="count">{saves.length}</span></h2><div className="inlinebuttons"><button title="Export backup" onClick={()=>downloadBackup(saves)}><Download size={16}/></button><button title="Import backup" onClick={()=>fileInput.current?.click()}><Upload size={16}/></button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importSaves}/></div></div>
      {saves.length===0?<p className="muted">No cities yet. Your first settlement awaits.</p>:<div className="savelist">{saves.map(c=><div className="saveitem" key={c.id}><button className="saveopen" onClick={()=>{setActiveId(c.id);setPage('game');setMessage('');setShowMobileStats(false);}}><strong>{c.name}</strong><small>{c.type} · {c.year} · {compact(stats(c).population)} residents</small></button><span className="savestatus">{c.finished?'Complete':'Resume'}</span><button className="delete" title={`Delete ${c.name}`} aria-label={`Delete ${c.name}`} onClick={()=>remove(c.id)}><Trash2 size={15}/></button></div>)}</div>}
    </section></div><p className="footnote">v0.2.1: Audited zoning, streets, housing, employment, GDP, historical snapshots and local saves. The economy remains a prototype model; historical figures and Legacy Points arrive in future passes.</p></main>:
    <div className="workspace"><div className="topbar"><button className="textbutton" onClick={goHome}><ArrowLeft size={16}/> Atlas</button><div className="cityheading"><strong>{city.name}</strong><span>{eraAt(playCity.year).n} · {playCity.year}</span></div><div className="topstats"><span>POPULATION <b>{compact(s.population)}</b></span><span>GDP <b>{compact(s.gdp)}</b></span><span>GDP / PERSON <b>{compact(s.gdpPerCapita)}</b></span></div><div className="controls"><button disabled={playCity.finished||simulating} onClick={()=>step(5)}><Play size={15}/> +5y</button><button disabled={playCity.finished||simulating} onClick={()=>step(25)}><FastForward size={15}/> +25y</button><button className="primary" disabled={playCity.finished||simulating} onClick={()=>step(100)}>+100y</button></div><button className="mobileInfo" onClick={()=>setShowMobileStats(v=>!v)} aria-label="Toggle city statistics"><BarChart3 size={16}/></button></div>
    <div className="gamebody"><aside className="sidebar"><h3>TOOLS</h3><button className={tool==='inspect'?'active':''} onClick={()=>setTool('inspect')}><MousePointer2 size={16}/> Explore / pan</button><div className="sidecaption">DESIGNATE LAND</div>{Object.entries(ZONES).map(([k,v])=><button key={k} className={tool===k?'active':''} onClick={()=>setTool(k)}><i style={{background:v.color}}/>{v.label}</button>)}<div className="sidecaption">MAP LAYERS</div><select value={layer} onChange={e=>setLayer(e.target.value)}><option value="urban">Urban map</option><option value="zones">Zoning</option><option value="age">Historical building age</option><option value="services">Civic / services</option><option value="economy">Economic land use</option></select><p className="hint">Choose a zone and drag to designate land. Roads form with new districts. Buildings gradually develop as you advance time. Use Explore to pan.</p></aside>
    <div className="center"><CityMap city={playCity} tool={simulating?'inspect':tool} layer={layer} onZone={onZone}/><div className="bottom"><span><span className="dot"/>{playCity.finished?'Chronicle complete':simulating?'City evolving...':'Simulation paused'}</span><span className="message">{message||`${playCity.zones.length} districts · ${playCity.roads.length} street tiles`}</span><span>Local save <Save size={13}/></span></div></div>
    <aside className={`inspector ${showMobileStats?'showMobile':''}`}><div className="tabs"><button className={tab==='stats'?'sel':''} onClick={()=>setTab('stats')}><BarChart3 size={13}/> Statistics</button><button className={tab==='history'?'sel':''} onClick={()=>setTab('history')}><BookOpen size={13}/> Chronicle</button></div>
      {tab==='stats'?<div className="sidecontent"><div className="eyebrow">CITY OVERVIEW</div><h2>{playCity.year}</h2>
        {[["Population",compact(s.population)],["GDP · modeled",compact(s.gdp)],["GDP per capita",compact(s.gdpPerCapita)],["Prosperity",`${s.prosperity}/100`],["Housing capacity",compact(s.capacity)],["Housing occupancy",`${s.housingPressure}%`],["Overcrowding",`${s.overcrowding}%`],["Employment",compact(s.employment)],["Unemployment",`${s.unemployment}%`],["Jobs available",compact(s.jobs)],["Residents / residential cell",compact(s.densityPerZone)],["Treasury",compact(s.treasury)],["Buildings",compact(s.buildings)]].map(([k,v])=><div className="stat" key={k}><span>{k}</span><b>{v}</b></div>)}
        <h3>ZONED LAND</h3>{Object.entries(ZONES).map(([k,v])=><div className="stat" key={k}><span>{v.label}</span><b>{compact(s.zoned[k])} cells</b></div>)}<p className="hint">The GDP model is an internal game estimate, not comparable to real historical GDP yet. Land pressure affects housing, and unemployment changes city prosperity.</p></div>:
      <div className="sidecontent"><div className="eyebrow">CITY CHRONICLE</div><h2>{city.name}</h2><p className="muted">Founded 1300 · {playCity.type}</p><h3>POPULATION HISTORY</h3><PopulationChart history={playCity.history}/><div className="historylabels"><span>1300</span><span>{playCity.year}</span></div><div className="stat"><span>Peak population</span><b>{compact(Math.max(s.population,...playCity.history.map(x=>x.population||0)))}</b></div><div className="stat"><span>Years elapsed</span><b>{playCity.year-1300}</b></div><div className="stat"><span>Recorded milestones</span><b>{playCity.events.length}</b></div><h3>HISTORICAL EVENTS</h3>{playCity.events.length?playCity.events.slice().reverse().map((evt,i)=><div className="event" key={`${evt.year}-${i}`}><strong>{evt.year}</strong><p>{evt.text}</p></div>):<p className="muted">Advance time to experience historical changes.</p>}{playCity.finished&&<p className="complete"><Check size={16}/> Chronicle complete. Return to the Atlas at any time.</p>}</div>}
      </aside></div></div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
