import {AXIS_LABELS,opportunityPulse,developmentOf} from './development.js';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Landmark,Play,FastForward,Plus,ArrowLeft,Save,MousePointer2,BarChart3,BookOpen,Trash2,Map as MapIcon,Download,Upload,Info,Check,RotateCcw,Maximize2,ShieldCheck,ShieldOff,Clock3,Building2,Sparkles,Layers3,Compass,Crown,ChevronRight,Star,History,TrendingUp,Hourglass,Coins,Lock,RefreshCw,UserRound,ShoppingBag,Medal}from'lucide-react';
import{W,H,END_YEAR,ZONES,terrain,makeCity,seedTown,stats,advance,addZone,eraAt,zoneCell,normalizeCity,snapshotCity,setProtection,placeConstruction,cityEffects,STYLE_NAMES,styleAt,selectTurningPoint,rerollTurningPoint,getOpportunity}from'./sim';
import {CARD_INDEX,CARDS,DOMAINS,RARITY_COLORS,SYNERGIES,activeSynergies,resolvedCards,turningYears,modifiers} from './turningPoints';
import{readAtlas,writeAtlas,readLegacy,writeLegacy}from'./storage';
import {BASIC_BUILDINGS,basicsForYear,SPECIAL_BUILDINGS,projectLabel} from './construction.js';
import {FIGURES,FIGURE_INDEX,LOCKED_CARDS,MARKET_UPGRADES,emptyLegacy,normalizeLegacy,canBuy,buyLegacy,marketCost,startRunProfile,awardCompletedCity,scoreCity,ACHIEVEMENT_REQUIREMENTS} from './legacy';
import {ChroniclePanel,UrbanAtlas} from './chronicleUI.jsx';
import './style.css';

const SAVE_KEY='civitas-v05-eras-saves'; // Preserve existing v0.5 save key for seamless upgrade.
const oldKeys=['civitas-v04-turning-saves','civitas-v03-historical-saves','civitas-v02-reviewed-saves','civitas-v02-saves','civitas-v01-saves'];
function safeJson(k){try{const v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:[];}catch{return [];}}
function loadCities(){let current;try{current=localStorage.getItem(SAVE_KEY);}catch{current=null;}const saved=current!==null?safeJson(SAVE_KEY):oldKeys.flatMap(safeJson);const ids=new Set();return saved.map(normalizeCity).filter(c=>{if(!c||ids.has(c.id))return false;ids.add(c.id);return true;});}
function compact(n){return Number(n).toLocaleString('en-US');}
function downloadBackup(cities,legacy){const blob=new Blob([JSON.stringify({format:'civitas-cities-v7',cities,legacy},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='civitas-v07-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function CityMap({city,tool,layer,onZone,onPlace,onInspect,selectedId=null,readOnly=false}){
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
    const historicColors={timber:'#6d6252',stone:'#967d61',classical:'#c0a887',brick:'#ab765e',modernist:'#7c8d8b',contemporary:'#597f8b'};
    for(const b of city.buildings){
      const sty=b.style||styleAt(b.born||1300);
      let color=ZONES[b.type]?.color||'#a98762';
      if(layer==='age')color=historicColors[sty]||historicColors.timber;
      if(layer==='services')color=b.type==='civic'?'#538773':'#b9b4a3';
      if(layer==='economy')color=b.type==='hotel'?'#ba7b9e':b.type==='trade'?'#d09e52':b.type==='craft'?'#9c8272':b.type==='farm'?'#b5bf79':'#b5aea1';
      if(layer==='heritage')color=b.protected?'#9a7149':city.year-(b.born||city.year)>=120?'#c09a67':'#c7c0ad';
      if(layer==='influence')color=b.special?(['workshop','monument'].includes(b.special)?'#a27aa1':['monastery','shrine'].includes(b.special)?'#b6a16c':b.special==='university'?'#6d9aa4':'#7d9a7e'):b.type==='civic'?'#c0ac8a':'#c8c1b2';
      if(layer==='urban'&&b.type==='res')color=historicColors[sty]||color;
      const [w,h]=b.w&&b.h?[b.w,b.h]:[.7,.7];
      ctx.fillStyle='#5a4a3c22';ctx.fillRect(b.x+.08,b.y+.1,w,h);
      ctx.fillStyle=color;ctx.fillRect(b.x,b.y,w,h);
      ctx.strokeStyle='#eee4d0';ctx.lineWidth=.065;ctx.strokeRect(b.x,b.y,w,h);
      // Era-specific cartographic grammar, without 3D or pictorial sprites.
      if(sty==='timber'){ctx.strokeStyle='#463f36a0';ctx.lineWidth=.055;ctx.beginPath();ctx.moveTo(b.x+.10,b.y+.13);ctx.lineTo(b.x+w-.10,b.y+h-.13);ctx.stroke();}
      if(sty==='stone'||sty==='classical'){ctx.strokeStyle='#f0dabc';ctx.lineWidth=.06;ctx.strokeRect(b.x+.13,b.y+.13,Math.max(.08,w-.26),Math.max(.08,h-.26));}
      if(sty==='brick'){ctx.strokeStyle='#634b3f88';ctx.lineWidth=.065;ctx.beginPath();ctx.moveTo(b.x+.08,b.y+h*.5);ctx.lineTo(b.x+w-.08,b.y+h*.5);ctx.stroke();}
      if(sty==='modernist'||sty==='contemporary'){ctx.fillStyle='#d4d8c5a5';ctx.fillRect(b.x+w*.36,b.y+h*.33,w*.28,h*.34);}
      if(b.type==='res'&&(b.level||1)>=4){ctx.strokeStyle='#3d565b';ctx.lineWidth=.07;ctx.strokeRect(b.x+.12,b.y+.12,Math.max(.05,w-.24),Math.max(.05,h-.24));}
      if(b.type==='civic'){ctx.fillStyle='#f3e5c4';ctx.fillRect(b.x+w*.37,b.y+h*.24,w*.26,h*.52);}
      if(b.special){
        // Distinctive cartographic symbols remain purely top-down: courtyards,
        // colonnades, crosses, dock piers, garden beds, not 3D sprites.
        ctx.strokeStyle='#fff0ce';ctx.lineWidth=.12;
        ctx.strokeRect(b.x-.07,b.y-.07,w+.14,h+.14);
        const cx=b.x+w/2,cy=b.y+h/2,k=b.special;
        if(['university','school','research_center','town_hall','library','civic_center'].includes(k)){
          ctx.fillStyle='#efe8d0';ctx.fillRect(b.x+w*.18,b.y+h*.18,w*.64,h*.64);
          ctx.fillStyle=color;ctx.fillRect(b.x+w*.34,b.y+h*.34,w*.32,h*.32);
        }else if(['shrine','monastery','chapel','hospital','clinic'].includes(k)){
          ctx.fillStyle='#f5e9cc';ctx.fillRect(cx-w*.08,b.y+h*.2,w*.16,h*.6);
          ctx.fillRect(b.x+w*.22,cy-h*.08,w*.56,h*.16);
        }else if(['port','station','transit_hub','boulevard'].includes(k)){
          ctx.strokeStyle='#fff0ce';ctx.lineWidth=.10;
          for(let t=-1;t<=1;t++){ctx.beginPath();ctx.moveTo(b.x+w*.18,b.y+h*(.5+t*.18));ctx.lineTo(b.x+w*.82,b.y+h*(.5+t*.18));ctx.stroke();}
        }else if(['garden','monument'].includes(k)){
          ctx.strokeStyle='#fff2d7';ctx.lineWidth=.12;ctx.beginPath();ctx.arc(cx,cy,w*.25,0,Math.PI*2);ctx.stroke();
          ctx.fillStyle='#f7eccf';ctx.fillRect(cx-w*.075,cy-h*.075,w*.15,h*.15);
        }else if(['market','workshop'].includes(k)){
          ctx.fillStyle='#f1e5cb';for(let t=0;t<3;t++)ctx.fillRect(b.x+w*(.18+t*.24),b.y+h*.22,w*.13,h*.55);
        }else{ctx.fillStyle='#fff8de';ctx.beginPath();ctx.arc(cx,cy,Math.max(.09,w*.18),0,Math.PI*2);ctx.fill();}
      }
      if(b.protected){ctx.strokeStyle='#dfb55d';ctx.lineWidth=.12;ctx.strokeRect(b.x-.07,b.y-.07,w+.14,h+.14);}
      if(selectedId===b.id){ctx.strokeStyle='#235e4c';ctx.lineWidth=.17;ctx.strokeRect(b.x-.12,b.y-.12,w+.24,h+.24);}
    }
    if(tool.startsWith('place:') && hover && !readOnly && hover.x>=0 && hover.x<W && hover.y>=0 && hover.y<H){
      ctx.strokeStyle='#547b5c';ctx.lineWidth=.14;ctx.setLineDash([.15,.13]);
      ctx.strokeRect(hover.x+.05,hover.y+.05,.9,.9);ctx.setLineDash([]);
    }
    if(selection){ctx.lineWidth=.21;ctx.strokeStyle='#3c6d57';ctx.fillStyle='#3c895231';ctx.fillRect(selection.x,selection.y,selection.w,selection.h);ctx.strokeRect(selection.x,selection.y,selection.w,selection.h);}
    ctx.restore();
    // Fixed screen-space historical annotations.
    ctx.fillStyle='#544c3c';ctx.font='12px Georgia,serif';ctx.fillText('N',18,height-65);
    ctx.beginPath();ctx.moveTo(22,height-59);ctx.lineTo(16,height-43);ctx.lineTo(28,height-43);ctx.closePath();ctx.fill();
    ctx.font='11px Georgia,serif';ctx.fillText(`${city.name}  ·  ${city.year}`,16,height-28);
    ctx.fillStyle='#6d6353';ctx.fillRect(17,height-19,70,1.7);
    ctx.font='10px Georgia,serif';ctx.fillText('CIVITAS CARTOGRAPHIC SURVEY',16,19);
  },[city,layer,selection,dimensions,frame,hover,tool,readOnly]);
  const down=e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);const p=toMap(e);drag.current={start:p,cx:e.clientX,cy:e.clientY,dx:view.current.dx,dy:view.current.dy};if(tool!=='inspect'&&!tool.startsWith('place:'))setSelection({x:p.x,y:p.y,w:1,h:1});};
  const move=e=>{const p=toMap(e);if(hover?.x!==p.x||hover?.y!==p.y)setHover(p);if(!drag.current)return;
    if(tool==='inspect'){view.current.dx=drag.current.dx+e.clientX-drag.current.cx;view.current.dy=drag.current.dy+e.clientY-drag.current.cy;redraw();}
    else if(!tool.startsWith('place:')){const a=drag.current.start,x=Math.min(a.x,p.x),y=Math.min(a.y,p.y);setSelection({x,y,w:Math.abs(a.x-p.x)+1,h:Math.abs(a.y-p.y)+1});}
  };
  const up=e=>{const d=drag.current;if(!d)return;drag.current=null;if(tool==='inspect'&&Math.hypot(e.clientX-d.cx,e.clientY-d.cy)<7){const p=toMap(e);const b=city.buildings.find(b=>p.x===Math.floor(b.x)&&p.y===Math.floor(b.y));onInspect?.(b||null);}if(tool!=='inspect'&&!readOnly){
    const p=toMap(e);const x=Math.max(0,Math.min(W-1,Math.min(d.start.x,p.x))),y=Math.max(0,Math.min(H-1,Math.min(d.start.y,p.y)));
    const mx=Math.max(0,Math.min(W-1,Math.max(d.start.x,p.x))),my=Math.max(0,Math.min(H-1,Math.max(d.start.y,p.y)));
    if(tool.startsWith('place:')){if(Math.hypot(e.clientX-d.cx,e.clientY-d.cy)<12)onPlace?.(tool.slice(6),p.x,p.y);}else if(mx>=x&&my>=y)onZone({x,y,w:mx-x+1,h:my-y+1},tool);
  }setSelection(null);};
  return <div className="mapwrap">
    <canvas ref={canvas} aria-label="Geometric map. Drag to zone land, or click once to place a building project." onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null;setSelection(null)}} style={{touchAction:'none',cursor:tool==='inspect'?'grab':'crosshair'}}/>
    {layer==='age'&&<div className="maplegend"><b>BUILDING ERAS</b>{Object.entries(STYLE_NAMES).map(([key,label])=><span key={key}><i className={`legend-${key}`}/>{label}</span>)}</div>}{layer==='heritage'&&<div className="maplegend"><b>HERITAGE</b><span><i className="legend-protected"/>Protected</span><span><i className="legend-old"/>120+ years old</span></div>}<div className="mapzoom"><button aria-label="Zoom in" onClick={()=>zoom(1.3)}>+</button><button aria-label="Zoom out" onClick={()=>zoom(1/1.3)}>−</button><button aria-label="Reset map view" onClick={()=>{view.current={zoom:1,dx:0,dy:0};redraw();}}><Maximize2 size={14}/></button></div>
    {hover&&<div className="coord">{hover.x}, {hover.y} · {zoneCell(city,hover.x,hover.y)|| (terrain(city.type,hover.x,hover.y)==='water'?'Water':'Unzoned')}</div>}
  </div>;
}

function PopulationChart({history}){const points=history.filter((_,i)=>i%Math.max(1,Math.floor(history.length/90))===0||i===history.length-1);const max=Math.max(1,...points.map(x=>x.population));return <div className="historygraph" role="img" aria-label={`Population from ${history[0]?.year||1300} to ${history.at(-1)?.year||1300}`}>
  {points.map((h,i)=><div key={`${h.year}-${i}`} title={`${h.year}: ${compact(h.population)} residents`} style={{height:`${Math.max(2,h.population/max*100)}%`}}/>)}
</div>;}

function CardOption({cardId,city,onChoose}){
 const c=getOpportunity(cardId);if(!c)return null;
 const domain=DOMAINS[c.domain];
 const owned=new Set((city.turning?.choices||[]).map(p=>p.cardId));
 const completing=SYNERGIES.find(combo=>combo.needs.includes(c.id)&&combo.needs.every(id=>id===c.id||owned.has(id)));
 const buildingOn=!!c.requiresAny?.some(id=>owned.has(id));
 const featured=c.kind==='figure'&&city.turning?.featuredFigures?.includes(c.figureId);
 const pulse=opportunityPulse(c.effects||{},c.rarity,c.kind==='figure'?'figure':'card');
 const scoreChanges=Object.entries(developmentOf(city)).map(([k,v])=>({k,amount:Math.round(Math.max(pulse[k]||0,c.scorePulse?.[k]||0)*(1-Math.max(0,v-70)/100))})).filter(x=>x.amount>=8).sort((a,b)=>b.amount-a.amount).slice(0,2);

 return <button className="turncard" onClick={()=>onChoose(c.id)} style={{'--card-color':domain.color}}>
   <span className="turncardtop"><span className="carddomain">{domain.symbol} {domain.name}</span><span className="rarity" style={{color:RARITY_COLORS[c.rarity]}}>{c.rarity.toUpperCase()}</span></span>
   <span className="cardart" aria-hidden="true"><span>{domain.symbol}</span><i/><i/><i/></span>
   <span className="cardname">{c.name}</span>
   <span className="carddescription">{c.description}{scoreChanges.length>0&&<em className="momentumHint">{c.building&&c.kind!=='figure'?'After placement: ':'Immediate momentum: '}{scoreChanges.map(x=>`${AXIS_LABELS[x.k]} +${x.amount}`).join(' · ')}</em>}{c.building&&<em className="projectHint">Construction commission — choose its map location after selection.</em>}{c.kind==='figure'&&<em className="figureCost">Treasury cost: {compact(c.cost||0)}</em>}{completing&&<em className="synergyHint">✦ Completes {completing.name}</em>}{!completing&&buildingOn&&<em className="synergyHint">✦ Supports your existing build</em>}{featured&&<em className="synergyHint">✦ Featured historical figure</em>}</span>
   <span className="cardbottom"><span>{c.kind.replace('_',' ').toUpperCase()}</span><span>Choose <ChevronRight size={14}/></span></span>
 </button>;
}
function TurningModal({city,onChoose,onReroll}){
 const pending=city?.turning?.pending;if(!pending)return null;
 const active=activeSynergies(city),picked=resolvedCards(city);
 return <div className="turningBackdrop"><section className="turningWindow" role="dialog" aria-modal="true" aria-labelledby="turningTitle">
  <div className="turningHeading"><div className="eyebrow"><Sparkles size={15}/> A MOMENT THAT CHANGES HISTORY · {String(pending.index+1).padStart(2,'0')} / 20</div><h2 id="turningTitle">A Turning Point · {pending.year}</h2><p>The course of {city.name} is yours to influence. Choose one opportunity; the others will disappear.</p></div>
  <div className="turningCards">{pending.options.map(id=><CardOption key={id} cardId={id} city={city} onChoose={onChoose}/>)}</div>
  <div className="turningFooter"><div><b>YOUR BUILD SO FAR</b><span>{picked.length?picked.slice(-4).map(c=>c.name).join(' · '):'A blank page of history'}</span></div><div><b>ACTIVE COMBINATIONS</b><span>{active.length?active.map(a=>a.name).join(' · '):'Discover combinations as you grow'}</span></div></div>
  <div className="turningActions"><span><RefreshCw size={15}/> Rerolls remaining: {Math.max(0,2+(city.legacyBonuses?.extraRerolls||0)-(city.turning.rerollsUsed||0))}</span><button onClick={onReroll} disabled={(city.turning.rerollsUsed||0)>=2+(city.legacyBonuses?.extraRerolls||0)}><RefreshCw size={15}/> Reroll all three</button></div>
 </section></div>;
}
function BuildPanel({city,onSelectProject,chosenTool}){
 const picks=city.turning?.choices||[],active=activeSynergies(city),m=modifiers(city),yearNext=turningYears()[picks.length+(city.turning?.skipped||0)];
 return <div className="sidecontent buildpanel"><div className="eyebrow">YOUR STRATEGIC BUILD</div><h2>Turning Points</h2><div className="progresslabel"><b>{picks.length}</b> choices made <span>{Math.max(0,20-picks.length-(city.turning?.skipped||0))} ahead</span></div><div className="milestones">{Array.from({length:20},(_,i)=><i key={i} className={i<(city.turning?.skipped||0)?'skipped':i<(picks.length+(city.turning?.skipped||0))?'chosen':i===(picks.length+(city.turning?.skipped||0))?'next':''}/>)}</div>
 {city.turning?.pending?<p className="turnnotice">A Turning Point awaits your decision.</p>:!city.finished&&yearNext?<p className="muted">Next opportunity: year {yearNext}</p>:<p className="muted">All Turning Points have been resolved.</p>}
 <h3>ACTIVE COMBINATIONS</h3>{active.length?active.map(a=><div className="buildsynergy" key={a.id} style={{borderLeftColor:DOMAINS[a.domain].color}}><strong>✦ {a.name}</strong><p>{a.description}</p></div>):<p className="muted">Combine related cards to unlock powerful city identities. Your first synergy is still waiting to emerge.</p>}
 <h3>RUN BONUSES</h3>{Object.entries(m).filter(([,v])=>v!==0).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,16).map(([k,v])=><div className="stat" key={k}><span>{k.replace(/([A-Z])/g,' $1').replace(/^./,v=>v.toUpperCase())}</span><b>{v>=0?'+':''}{Math.round(v*100)}%</b></div>)}
 <h3>AWAITING CONSTRUCTION ({city.projects?.length||0})</h3>{city.projects?.length?city.projects.map(p=><div className="queuedProject" key={p.id}><b>{projectLabel(p)}</b><small>From {p.origin||"Turning Point"} · Awarded {p.issuedYear} · Free commission</small><button className={chosenTool===`place:${p.id}`?'active':''} disabled={city.finished||!!city.turning?.pending} onClick={()=>onSelectProject(p.id)}><Landmark size={13}/> {chosenTool===`place:${p.id}`?'Click map to place':'Choose location'}</button></div>):<p className="muted">No unplaced projects. Special buildings unlock through cards and historical figures.</p>}
 <h3>HISTORICAL FIGURES</h3>{city.figures?.length?city.figures.map((f,i)=><div className="buildchoice" key={`${f.id}-${i}`}><span style={{color:RARITY_COLORS[f.rarity]}}>♛</span><div><b>{f.year} · {f.name}</b><small>{f.rarity.toUpperCase()} · Permanent historical influence</small></div></div>):<p className="muted">No figures recruited yet. Figure cards can appear among Turning Points.</p>}<h3>DECISION HISTORY</h3>{picks.length?picks.slice().reverse().map((pick,i)=>{const c=getOpportunity(pick.cardId);return c?<div className="buildchoice" key={`${pick.year}-${i}`}><span style={{color:DOMAINS[c.domain].color}}>{DOMAINS[c.domain].symbol}</span><div><b>{pick.year} · {c.name}</b><small>{c.description}</small></div></div>:null;}):<p className="muted">Advance to the first Turning Point to choose your first city-shaping advantage.</p>}
 <p className="hint">Card effects and recruited figures stack across centuries. The Legacy Market strengthens future runs; historical crises remain independent.</p></div>;
}
function Market({legacy,onPurchase,onBack,tab,setTab}){
 const chosen=tab==='cards'?LOCKED_CARDS.map(id=>({type:'card',id,card:CARD_INDEX[id]})):tab==='people'?FIGURES.filter(f=>!f.generic).map(f=>({type:'figure',id:f.id,card:f})):MARKET_UPGRADES.map(u=>({type:'upgrade',id:u.id,card:u}));
 return <main className="legacyPage"><div className="marketHeader"><button onClick={onBack}><ArrowLeft size={15}/> Atlas</button><div><div className="eyebrow">PERMANENT PROGRESSION</div><h1>Legacy Market</h1><p>Build a collection of cards, recruit famous people and strengthen every future civilization.</p></div><span className="legacyPoints"><Coins size={18}/>{compact(legacy.points)} LP</span></div>
 <div className="marketTabs">{[['cards','Upgrade Cards',Layers3],['people','Historical Figures',Crown],['upgrades','Permanent Bonuses',TrendingUp]].map(([id,name,Icon])=><button key={id} className={tab===id?'sel':''} onClick={()=>setTab(id)}><Icon size={16}/>{name}</button>)}</div>
 {tab==='people'&&<p className="marketNote">Unlock famous people here, then select up to five as featured candidates before each run. Broad historical eras and rarities still govern whether they appear. Generic specialists remain free.</p>}
 {tab==='cards'&&<p className="marketNote">The base deck already includes {CARDS.length-LOCKED_CARDS.length} cards. Some advanced purchases also require achievements in completed cities. Purchasing a card permanently makes it eligible for future Turning Point offers; cards are not guaranteed to appear.</p>}
 {tab==='upgrades'&&<p className="marketNote">These bonuses apply when you found a new city. Progression can make later runs genuinely stronger; it does not rewrite older cities.</p>}
 <div className="marketGrid">{chosen.map(({type,id,card})=>{const cost=marketCost(type,id,legacy.upgrades?.[id]||0),status=canBuy(legacy,type,id),owned=type==='card'?legacy.unlockedCards.includes(id):type==='figure'?legacy.unlockedFigures.includes(id):(legacy.upgrades[id]||0)>=card.max,domain=DOMAINS[card.domain],rank=legacy.upgrades?.[id]||0;
 return <article className="marketItem" key={id} style={{'--card-color':domain.color}}><div className="marketMeta"><span style={{color:domain.color}}>{domain.symbol} {domain.name}</span><b>{type==='upgrade'?`RANK ${rank}/${card.max}`:(card.rarity||'UPGRADE').toUpperCase()}</b></div><h3>{card.name}</h3><p>{card.description}</p>{type==='figure'&&<small>Era eligibility {card.minYear}–{card.maxYear} · In-city treasury: {compact(card.cost||0)}</small>}
 {owned?<button className="owned" disabled><Check size={15}/> {type==='upgrade'?'MAX RANK':'OWNED'}</button>:<button disabled={!status.ok} onClick={()=>onPurchase(type,id)} title={!status.ok?status.reason:undefined}><Coins size={14}/>{status.ok?`Unlock · ${cost} LP`:status.reason.startsWith('Requires')?status.reason:legacy.points<cost?`${cost} LP required`:status.reason}</button>}
 </article>;})}</div></main>;
}
function App(){
 const [legacy,setLegacy]=useState(emptyLegacy),[featured,setFeatured]=useState([]),[marketTab,setMarketTab]=useState('cards');
 const [saves,setSaves]=useState(loadCities),[storageReady,setStorageReady]=useState(false),[activeId,setActiveId]=useState(null),[page,setPage]=useState('home'),[preview,setPreview]=useState(null),[simulating,setSimulating]=useState(false),[selectedId,setSelectedId]=useState(null),[historicYear,setHistoricYear]=useState(null);
 const simulation=useRef(null),saveQueue=useRef(Promise.resolve()),legacyQueue=useRef(Promise.resolve());
 const [name,setName]=useState('New Valdoria'),[geo,setGeo]=useState('river'),[tool,setTool]=useState('inspect'),[layer,setLayer]=useState('urban'),[tab,setTab]=useState('stats'),[message,setMessage]=useState(''),[showMobileStats,setShowMobileStats]=useState(false),[storageError,setStorageError]=useState(false);
 const fileInput=useRef(null);const city=saves.find(c=>c.id===activeId)||null;const playCity=preview||city;const s=useMemo(()=>playCity?stats(playCity):null,[playCity]);
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
     for(const completedCity of cities.filter(c=>c.finished))l=awardCompletedCity(l,completedCity,stats(completedCity));
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
 const persist=useCallback(c=>{setSaves(prev=>[c,...prev.filter(v=>v.id!==c.id)]);setActiveId(c.id);},[]);
 const start=()=>{if(!storageReady)return;setHistoricYear(null);setSelectedId(null);const city=seedTown(makeCity(name,geo,Math.floor(Math.random()*0x7fffffff)));const profile=startRunProfile(legacy,featured);city.turning={...city.turning,cardPool:profile.cardPool,figurePool:profile.figurePool,featuredFigures:profile.featuredFigures};city.legacyBonuses=profile.legacyBonuses;persist(city);setPage('game');setTab('stats');setMessage('New city founded. Draw zones or place the current era’s basic buildings.');setTool('inspect');};
 const stopSimulation=()=>{if(simulation.current){clearTimeout(simulation.current.timer);if(simulation.current.current)persist(simulation.current.current);simulation.current=null;}setPreview(null);setSimulating(false);};
 const goHome=()=>{stopSimulation();setHistoricYear(null);setSelectedId(null);setPage('home');};
 const openCityFromAtlas=id=>{setActiveId(id);setPage('game');setHistoricYear(null);setSelectedId(null);setTab('history');setMessage('Viewing the selected city Chronicle.');setShowMobileStats(false);};
 const step=n=>{
   if(!city||city.finished||city.turning?.pending||simulating||historicYear!==null)return;
   const remaining=Math.min(n,END_YEAR-city.year);
   if(remaining<=0)return;
   setSimulating(true);setMessage(`Watching ${remaining} years of urban evolution...`);
   const run={current:city,remaining,timer:null};simulation.current=run;
   const frame=()=>{
     if(simulation.current!==run)return;
     const delta=Math.min(5,run.remaining);
     const countBefore=run.current.events.length;
     run.current=advance(run.current,delta);run.remaining-=delta;
     const newEvents=run.current.events.slice(countBefore).filter(e=>['fire','flood','epidemic','boom'].includes(e.type));
     if(newEvents.length){const event=newEvents.at(-1);run.lastEvent=event;setMessage(`${event.year} · ${event.text}`);}
     setPreview(run.current);
     if(run.current.turning?.pending){persist(run.current);simulation.current=null;setPreview(null);setSimulating(false);setMessage(`Year ${run.current.year}: choose a Turning Point to continue.`);setTab('build');}
     else if(run.remaining>0){run.timer=setTimeout(frame,85);}
     else{persist(run.current);if(run.current.finished)setLegacy(l=>awardCompletedCity(l,run.current,stats(run.current)));simulation.current=null;setPreview(null);setSimulating(false);setMessage(run.current.finished?'Chronicle complete — explore its historical record.':run.lastEvent?`${run.lastEvent.year}: ${run.lastEvent.text}`:`Advanced to ${run.current.year}.`);}
   };
   run.timer=setTimeout(frame,40);
 };
 const pickCard=cardId=>{if(!city?.turning?.pending)return;const next=selectTurningPoint(city,cardId);if(next===city)return;persist(next);setTab('build');const card=getOpportunity(cardId);setMessage(card.building?`${card.name}: construction project awarded. Select a location under Projects and Buildings.`:`${next.year} · ${card.name} added to your city's history.`);};
 const reroll=()=>{if(!city?.turning?.pending)return;const next=rerollTurningPoint(city);if(next!==city){persist(next);setMessage('Three new possible futures have been drawn.');}};
 const purchase=(type,id)=>{const next=buyLegacy(legacy,type,id);if(next.points===legacy.points)return;setLegacy(next);setMessage(`Permanent unlock purchased: ${type==='card'?CARD_INDEX[id]?.name:type==='figure'?FIGURE_INDEX[id]?.name:id}.`);};
 const onZone=(rect,type)=>{if(!city||city.finished||simulating||historicYear!==null)return;const next=addZone(city,rect.x,rect.y,rect.w,rect.h,type);if(next===city){setMessage('No buildable land was selected. Try a dry part of the map.');return;}persist(next);setMessage(`${ZONES[type].label} designated · ${rect.w} × ${rect.h} parcels. Existing historic buildings remain in place.`);};
 const onPlace=(id,x,y)=>{if(!city||city.finished||simulating||historicYear!==null)return;const {city:next,error,placed}=placeConstruction(city,id,x,y);if(error){setMessage(`Cannot build here: ${error}.`);return;}persist(next);setMessage(`${placed.label} constructed in ${next.year} at ${Math.floor(x)}, ${Math.floor(y)}.`);setTool('inspect');setTab('build');};
 const onInspect=building=>{setSelectedId(building?.id||null);if(building){setTab('building');setShowMobileStats(true);}};
 const protectSelected=value=>{if(!selectedId||!city||historicYear!==null)return;const next=setProtection(city,selectedId,value);if(next!==city){persist(next);setMessage(value?'Historic building protected from future redevelopment.':'Building may now be redeveloped.');}};
 const remove=id=>{const item=saves.find(x=>x.id===id);if(!storageReady||!item||!window.confirm(`Delete ${item.name} and its chronicle? This cannot be undone without a backup.`))return;setSaves(v=>v.filter(x=>x.id!==id));if(activeId===id){setActiveId(null);setPage('home');}};
 const importSaves=async e=>{const f=e.target.files?.[0];if(!f)return;try{const contents=JSON.parse(await f.text());const rows=Array.isArray(contents)?contents:contents?.cities;if(!Array.isArray(rows))throw Error('Invalid save format');const imported=rows.map(normalizeCity).filter(Boolean);if(!imported.length)throw Error('No valid cities in file');if(contents?.legacy){const importedProfile=normalizeLegacy(contents.legacy);if(window.confirm('This backup includes a Legacy Market profile. Restore its unlocks and currency as well?'))setLegacy(importedProfile);}
 setSaves(prev=>{const map=new Map(prev.map(c=>[c.id,c]));for(const c of imported)map.set(c.id,c);return [...map.values()];});setMessage(`Imported ${imported.length} cities.`);}catch(err){window.alert(`Unable to import: ${err.message}`);}finally{e.target.value='';}};
 return <div className="app">
  <header><button className="brand" onClick={goHome} aria-label="Return to CIVITAS home"><Landmark size={22}/><span>CIVITAS</span><small>CHRONICLE OF CITIES</small></button><div className="headerRight"><span>GEOMETRIC HISTORY SIMULATOR</span><span className="version">v0.7 · Living Balance</span></div></header>
  {page==='market'?<Market legacy={legacy} onPurchase={purchase} onBack={()=>setPage('home')} tab={marketTab} setTab={setMarketTab}/>:page==='atlas'?<UrbanAtlas cities={saves} onBack={goHome} onOpen={openCityFromAtlas}/>:page==='home'||!city?<main className="home"><div className="eyebrow">THE URBAN ATLAS</div><h1>Every city has a story.</h1><p className="intro">Shape centuries of growth. Choose 20 turning points. Compare your civilizations through time.</p><div className="atlasLaunch"><div><strong>THE GREAT URBAN ATLAS</strong><span>Explore your city collection, historical records, population rankings and saved map surveys.</span></div><button className="primary" onClick={()=>setPage('atlas')}><BookOpen size={16}/> Open Urban Atlas</button></div>
    {!storageReady&&<p className="muted">Loading your city library…</p>}{storageError&&<p className="warning">Browser storage is unavailable or full. Export your cities as a backup and check browser storage permissions.</p>}
    <div className="legacyBanner"><div><span className="eyebrow">YOUR CIVILIZATION LEGACY</span><strong><Coins size={19}/>{compact(legacy.points)} Legacy Points</strong><small>{legacy.completed.length} completed cities · {legacy.achievements.length} achievements · {legacy.unlockedCards.length} new cards · {legacy.unlockedFigures.length} figures</small></div><button className="primary" onClick={()=>setPage('market')}><ShoppingBag size={16}/> Open Legacy Market</button></div><div className="homegrid"><section className="panel"><h2>Found a new city</h2><label>City name<input value={name} onChange={e=>setName(e.target.value)} maxLength={40}/></label><label>Geography<select value={geo} onChange={e=>setGeo(e.target.value)}><option value="river">Winding river</option><option value="coast">Coastal bay</option><option value="plain">Open plain</option></select></label><p className="muted">European medieval settlement · 1300–2030 · 20 Turning Points · Era-based buildings and legendary people</p><div className="loadout"><b><Crown size={15}/> Featured historical figures ({featured.length}/5)</b><p className="muted">Select up to five unlocked figures with increased appearance odds. Leave slots open for unpredictable encounters.</p><div className="figurePool">{legacy.unlockedFigures.length?legacy.unlockedFigures.map(id=>{const f=FIGURE_INDEX[id];return <button key={id} className={featured.includes(id)?'selected':''} disabled={!featured.includes(id)&&featured.length>=5} onClick={()=>setFeatured(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}><span>{f?.name}</span><small>{f?.rarity} · {f?.minYear}–{f?.maxYear}</small></button>;}):<span className="muted">No named figures unlocked yet. Generic specialists can still appear in every run.</span>}</div></div><button className="primary wide" disabled={!storageReady} onClick={start}><Plus size={16}/> Begin Chronicle</button></section>
    <section className="panel"><div className="panelhead"><h2>Continue or review cities <span className="count">{saves.length}</span></h2><div className="inlinebuttons"><button title="Export backup" onClick={()=>downloadBackup(saves,legacy)}><Download size={16}/></button><button title="Import backup" onClick={()=>fileInput.current?.click()}><Upload size={16}/></button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importSaves}/></div></div>
      {saves.length===0?<p className="muted">No cities yet. Your first settlement awaits.</p>:<div className="savelist">{saves.map(c=><div className="saveitem" key={c.id}><button className="saveopen" onClick={()=>{setActiveId(c.id);setPage('game');setHistoricYear(null);setSelectedId(null);setMessage('');setShowMobileStats(false);}}><strong>{c.name}</strong><small>{c.type} · {c.year} · {compact(stats(c).population)} residents · {c.turning?.choices?.length||0} cards</small></button><span className="savestatus">{c.finished?'Complete':'Resume'}</span><button className="delete" title={`Delete ${c.name}`} aria-label={`Delete ${c.name}`} onClick={()=>remove(c.id)}><Trash2 size={15}/></button></div>)}</div>}
    </section></div><p className="footnote">v0.7.1: Six decaying development scores, compounding productivity, and long-term Legacy progression. Exceptional buildings remain player-placed.</p></main>:
    <div className="workspace"><div className="topbar"><button className="textbutton" onClick={goHome}><ArrowLeft size={16}/> Atlas</button><div className="cityheading"><strong>{city.name}</strong><span>{eraAt(playCity.year).n} · {playCity.year}{historicalSnapshot?' · HISTORIC MAP':''}</span></div><div className="topstats"><span>POPULATION <b>{compact(archiveMetrics?.population??historicalSnapshot?.population??s.population)}</b></span><span>GDP <b>{compact(archiveMetrics?.gdp??s.gdp)}</b></span><span>GDP / PERSON <b>{compact(archiveMetrics?.gdpPerCapita??s.gdpPerCapita)}</b></span></div><div className="controls">{historicalSnapshot&&<button className="archiveExit" onClick={()=>{setHistoricYear(null);setSelectedId(null);}}>Return to present</button>}<button disabled={playCity.finished||!!playCity.turning?.pending||simulating||historicYear!==null} onClick={()=>step(5)}><Play size={15}/> +5y</button><button disabled={playCity.finished||!!playCity.turning?.pending||simulating||historicYear!==null} onClick={()=>step(25)}><FastForward size={15}/> +25y</button><button className="primary" disabled={playCity.finished||!!playCity.turning?.pending||simulating||historicYear!==null} onClick={()=>step(100)}>+100y</button></div><button className="mobileInfo" onClick={()=>setShowMobileStats(v=>!v)} aria-label="Toggle city statistics"><BarChart3 size={16}/></button></div>
    <div className="gamebody"><aside className="sidebar"><h3>TOOLS</h3><button className={tool==='inspect'?'active':''} onClick={()=>setTool('inspect')}><MousePointer2 size={16}/> Explore / pan</button><div className="sidecaption">DESIGNATE LAND</div>{Object.entries(ZONES).filter(([k])=>k!=='hotel'||city.turning?.cardPool?.includes('tourist_paradise')).map(([k,v])=><button key={k} className={tool===k?'active':''} onClick={()=>setTool(k)}><i style={{background:v.color}}/>{v.label}</button>)}<div className="sidecaption">CONSTRUCTION · {eraAt(playCity.year).n.toUpperCase()}</div>
      {(playCity.projects||[]).length>0&&<><div className="sidebarProjectCount">{playCity.projects.length} unplaced card {playCity.projects.length===1?'project':'projects'}</div>{playCity.projects.map(p=><button key={p.id} className={tool===`place:${p.id}`?'active':''} disabled={playCity.finished||simulating||historicYear!==null||!!city.turning?.pending} onClick={()=>{setTool(`place:${p.id}`);setTab('build');}}><Landmark size={14}/>{projectLabel(p)} <small>FREE</small></button>)}</>}
      {basicsForYear(playCity.year).map(b=><button key={b.id} className={tool===`place:${b.id}`?'active':''} title={b.description} disabled={playCity.finished||simulating||historicYear!==null||!!city.turning?.pending||playCity.funds<b.cost||playCity.buildings.filter(x=>x.special===b.kind).length>=2} onClick={()=>setTool(`place:${b.id}`)}><Building2 size={14}/>{b.name}<small>{compact(b.cost)}</small></button>)}
      <p className="constructionHint">Select a building, then click an empty land parcel. Basic buildings cost treasury. Card-awarded projects are free but require placement.</p>
      <div className="sidecaption">MAP LAYERS</div><select value={layer} onChange={e=>setLayer(e.target.value)}><option value="urban">Urban map</option><option value="zones">Zoning</option><option value="age">Historical building age</option><option value="services">Civic / services</option><option value="economy">Economic land use</option><option value="heritage">Historic preservation</option><option value="influence">Cultural & civic landmarks</option></select><p className="hint">Choose a zone and drag to designate land. Roads form with new districts. Buildings gradually develop as you advance time. In Explore mode tap a building to inspect its history and protect it.</p></aside>
    <div className="center"><CityMap city={displayCity} selectedId={selectedId} readOnly={historicYear!==null} onInspect={onInspect} onPlace={onPlace} tool={simulating||historicYear!==null?'inspect':tool} layer={layer} onZone={onZone}/><div className="bottom"><span><span className="dot"/>{historicalSnapshot?`Archive view · ${historicYear}`:playCity.finished?'Chronicle complete':simulating?'City evolving...':'Simulation paused'}</span><span className="message">{message||(tool.startsWith('place:')?'Tap an empty land parcel to place the selected building':`${playCity.zones.length} districts · ${playCity.roads.length} street tiles`)}</span><span>Local save <Save size={13}/></span></div></div>
    <aside className={`inspector ${showMobileStats?'showMobile':''}`}><div className="tabs"><button className={tab==='stats'?'sel':''} onClick={()=>setTab('stats')}><BarChart3 size={13}/> Statistics</button><button className={tab==='history'?'sel':''} onClick={()=>setTab('history')}><BookOpen size={13}/> Chronicle</button><button className={tab==='building'?'sel':''} onClick={()=>setTab('building')}><Building2 size={13}/> Building</button><button className={tab==='build'?'sel':''} onClick={()=>setTab('build')}><Sparkles size={13}/> Build</button></div>
      {tab==='build'?<BuildPanel city={playCity} chosenTool={tool} onSelectProject={id=>{setTool(`place:${id}`);setMessage("Click an empty map parcel to construct the awarded building.");}}/>:tab==='stats'?<div className="sidecontent"><div className="eyebrow">{historicalSnapshot?'HISTORICAL SURVEY':'CITY OVERVIEW'}</div><h2>{historicalSnapshot?.year||playCity.year}</h2>
        {historicalSnapshot&&<><p className="muted">Archived economic and population indicators for this year. Return to the present to see current city statistics.</p>{[['Population',compact(archiveMetrics?.population??historicalSnapshot.population)],['GDP · modeled',compact(archiveMetrics?.gdp??0)],['GDP per capita',compact(archiveMetrics?.gdpPerCapita??0)],['Economic momentum',archiveMetrics?.economyScore==null?'Not recorded':`${Math.round(archiveMetrics.economyScore)}/100`],['Technology momentum',archiveMetrics?.technologyScore==null?'Not recorded':`${Math.round(archiveMetrics.technologyScore)}/100`],['Infrastructure efficiency',archiveMetrics?.infrastructureEfficiency==null?'Not recorded':`${archiveMetrics.infrastructureEfficiency}/100`],['Cultural prestige',compact(archiveMetrics?.culturalPrestige??0)],['Tourism appeal',compact(archiveMetrics?.tourismAppeal??0)],['Religious influence',compact(archiveMetrics?.religiousInfluence??0)],['Buildings',compact(historicalSnapshot.buildings.length)]].map(([k,v])=><div className="stat" key={k}><span>{k}</span><b>{v}</b></div>)}</>}
        {!historicalSnapshot&&<>
        <h3>DEVELOPMENT MOMENTUM · 0–100</h3>
        <p className="hint">Cards and recruited people can create golden ages. Conditions naturally fade without new investments, while prosperity accumulated during those years remains. Annual modeled productivity growth: <b>{s.productivityGrowthPct}%</b>.</p>
        {Object.entries(s.development).map(([k,v])=><div key={k} className="momentumMetric"><div className="momentumName"><span>{AXIS_LABELS[k]||k}</span><strong>{Math.round(v)}/100</strong></div><div className="momentumTrack"><div style={{width:`${v}%`,background:v>=75?'#6b9880':v>=40?'#b59b68':'#ba826f'}}/></div></div>)}
        {[["Population",compact(s.population)],["GDP · modeled",compact(s.gdp)],["GDP per capita",compact(s.gdpPerCapita)],["Cultural prestige",compact(s.culturalPrestige)],["Tourism appeal",compact(s.tourismAppeal)],["Tourist visits / year",compact(s.touristVisits)],["Hotels",compact(s.hotels)],["Religious influence",compact(s.religiousInfluence)],["Education",compact(s.educationIndex)],["Pollution",compact(s.pollution)],["Prosperity",`${s.prosperity}/100`],["Infrastructure efficiency",`${s.infrastructureEfficiency}/100`],["Housing capacity",compact(s.capacity)],["Housing occupancy",`${s.housingPressure}%`],["Overcrowding",`${s.overcrowding}%`],["Employment",compact(s.employment)],["Unemployment",`${s.unemployment}%`],["Jobs available",compact(s.jobs)],["Residents / residential cell",compact(s.densityPerZone)],["Treasury",compact(s.treasury)],["Unplaced projects",compact(playCity.projects?.length||0)],["Buildings",compact(s.buildings)],["Historic buildings (120y+)",compact(s.heritage)],["Protected buildings",compact(s.protectedCount)],["Buildings replaced / lost",compact(s.lostBuildings)]].map(([k,v])=><div className="stat" key={k}><span>{k}</span><b>{v}</b></div>)}
        <h3>ZONED LAND</h3>{Object.entries(ZONES).filter(([k])=>k!=='hotel'||city.turning?.cardPool?.includes('tourist_paradise')).map(([k,v])=><div className="stat" key={k}><span>{v.label}</span><b>{compact(s.zoned[k])} cells</b></div>)}<p className="hint">The GDP model is an internal game estimate, not comparable to real historical GDP yet. Land pressure affects housing, unemployment reduces prosperity and migration, and sprawling infrastructure has a recurring treasury cost.</p></>}</div>:
      tab==='history'?<ChroniclePanel city={playCity} archiveYear={historicYear} onArchiveYear={y=>{setHistoricYear(y);setSelectedId(null);}} onOpenBuild={()=>setTab('build')}/>:
      <div className="sidecontent"><div className="eyebrow">BUILDING INSPECTOR</div>{selectedBuilding?<>
        <h2>{selectedBuilding.label||STYLE_NAMES[selectedBuilding.style||styleAt(selectedBuilding.born)]}</h2>
        <p className="muted">{ZONES[selectedBuilding.type]?.label||'Building'} · Parcel {Math.floor(selectedBuilding.x)}, {Math.floor(selectedBuilding.y)}</p>
        <div className="stat"><span>Constructed</span><b>{selectedBuilding.born}</b></div>
        <div className="stat"><span>Age in map year</span><b>{displayCity.year-selectedBuilding.born} years</b></div>
        <div className="stat"><span>Development level</span><b>{selectedBuilding.level||1}</b></div>
        <div className="stat"><span>Last modified</span><b>{selectedBuilding.modified||'Not renovated'}</b></div>
        <div className="stat"><span>Heritage designation</span><b>{selectedBuilding.protected?'Protected':'Unprotected'}</b></div>
        {historicYear===null&&!city.finished?<button className="primary wide heritageButton" onClick={()=>protectSelected(!selectedBuilding.protected)}>{selectedBuilding.protected?<ShieldOff size={15}/>:<ShieldCheck size={15}/>} {selectedBuilding.protected?'Remove protection':'Preserve this building'}</button>:<p className="muted">Historical maps are read-only. Return to the current city to change protection.</p>}
        <h3>BUILDING HISTORY</h3><div className="event"><strong>{selectedBuilding.born}</strong><p>Building constructed in the {eraAt(selectedBuilding.born).n.toLowerCase()} era.</p></div>
        {(selectedBuilding.renovations||[]).slice(-12).map((r,i)=><div className="event" key={i}><strong>{r.year}</strong><p>{r.action}</p></div>)}
        <p className="hint">Preservation prevents automated redevelopment of this building. Protection reduces redevelopment pressure, not disaster risk: important buildings can still be lost to fires or floods.</p>
      </>:<><h2>Select a building</h2><p className="muted">Choose Explore / pan, then tap a building footprint on the map to inspect its age, style, and renovation history. You can designate individual buildings for preservation.</p></>}</div>}
      </aside></div>{city.turning?.pending&&!simulating&&historicYear===null&&<TurningModal city={city} onChoose={pickCard} onReroll={reroll}/>}</div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
