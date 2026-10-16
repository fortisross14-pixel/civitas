import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Maximize2} from 'lucide-react';
import {W,H,ZONES,terrain,zoneCell,STYLE_NAMES,cityOrigin,tourismUnlocked,bridgeAt,publicWorkCost} from './sim';
import {drawCity,mapTransform,DISTRICT_COLORS} from './render.js';
export {DISTRICT_COLORS};

// CIVITAS v1.4 interactive map: drawing lives in render.js; this component
// handles view (pan/zoom), pointer tools, hover text and animation.
const DRAG_TOOLS=new Set([...Object.keys(ZONES),'erase','demolish']);
const SELECTION_STYLE={erase:['#7a7464','#7a746426'],demolish:['#a2513f','#b8604a2e']};
export const CAPTION_MS=7000;

export function CityMap({city,tool,layer,onZone,onPlace,onInspect,selectedId=null,readOnly=false,previewRing=null,describeSelection=null,captions=[],animate=false,population=0,archiveYear=null}){
  const canvas=useRef(null),drag=useRef(null),view=useRef({zoom:1,dx:0,dy:0});
  const [dimensions,setDimensions]=useState({width:600,height:500}),[frame,setFrame]=useState(0),[selection,setSelection]=useState(null),[hover,setHover]=useState(null),[tick,setTick]=useState(0);
  const [showLegend,setShowLegend]=useState(()=>typeof window==='undefined'||window.innerWidth>760);
  const redraw=()=>setFrame(x=>x+1);
  const fitted=useRef(false);
  useEffect(()=>{const el=canvas.current;if(!el)return;const obs=new ResizeObserver(entries=>{const r=entries[0]?.contentRect;if(r?.width&&r.height)setDimensions({width:r.width,height:r.height});});obs.observe(el);return()=>obs.disconnect();},[]);
  // On tall, narrow screens zoom to fill the height and centre on the town.
  useEffect(()=>{
    if(fitted.current||dimensions.width===600&&dimensions.height===500)return;fitted.current=true;
    const {width,height}=dimensions,base=Math.min(width/W,height/H),fill=height/H/base;
    if(fill<1.25)return;
    const zoom=Math.min(4,fill),scale=base*zoom,o=cityOrigin(city);
    const dx=Math.max(width-W*scale,Math.min(0,width/2-(o.x+.5)*scale))-(width-W*scale)/2;
    view.current={zoom,dx,dy:0};redraw();
  },[dimensions]);
  const transform=()=>mapTransform(dimensions.width,dimensions.height,view.current);
  const toMap=e=>{const r=canvas.current.getBoundingClientRect(),{scale,ox,oy}=transform();return {x:Math.floor((e.clientX-r.left-ox)/scale),y:Math.floor((e.clientY-r.top-oy)/scale)};};
  const zoom=(ratio,cx=dimensions.width/2,cy=dimensions.height/2)=>{const old=transform(),next=Math.max(.65,Math.min(7,view.current.zoom*ratio));if(next===view.current.zoom)return;const newScale=old.scale*next/view.current.zoom;const wx=(cx-old.ox)/old.scale,wy=(cy-old.oy)/old.scale;view.current={zoom:next,dx:cx-wx*newScale-(dimensions.width-W*newScale)/2,dy:cy-wy*newScale-(dimensions.height-H*newScale)/2};redraw();};
  useEffect(()=>{const el=canvas.current;if(!el)return;const wheel=e=>{e.preventDefault();const r=el.getBoundingClientRect();zoom(e.deltaY>0?.86:1.16,e.clientX-r.left,e.clientY-r.top);};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[dimensions]);
  const bridgePreview=useMemo(()=>tool==='place:bridge'&&hover&&!readOnly?bridgeAt(city,hover.x,hover.y):null,[tool,hover?.x,hover?.y,city.roads,city.buildings,readOnly]);
  // Gentle animation (windmills, boats, caption fades) while time runs or captions show.
  const liveCaptions=captions.filter(c=>performance.now()-c.t0<CAPTION_MS);
  useEffect(()=>{if(!animate&&!liveCaptions.length)return;const id=setInterval(()=>setTick(t=>t+1),110);return()=>clearInterval(id);},[animate,liveCaptions.length]);
  useEffect(()=>{
    const c=canvas.current;if(!c)return;const {width,height}=dimensions,dpr=Math.min(2,window.devicePixelRatio||1);
    c.width=Math.max(1,Math.round(width*dpr));c.height=Math.max(1,Math.round(height*dpr));
    const ctx=c.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);
    const now=performance.now();
    const caps=liveCaptions.map(cap=>{const age=now-cap.t0;return {...cap,alpha:age<600?age/600:age>CAPTION_MS-1500?(CAPTION_MS-age)/1500:1};});
    const [line,fill]=SELECTION_STYLE[tool]||['#3c6d57','#3c895231'];
    drawCity(ctx,city,width,height,{view:view.current,layer,selectedId,previewRing:readOnly?null:previewRing,bridgePreview,
      selection:selection?{...selection,line,fill}:null,hover,placing:tool.startsWith('place:')&&!readOnly,captions:caps,now,population,archiveYear});
  },[city,layer,selection,dimensions,frame,hover,tool,readOnly,previewRing,bridgePreview,selectedId,tick,captions,population,archiveYear]);

  const dragTool=DRAG_TOOLS.has(tool);
  const down=e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);const p=toMap(e);drag.current={start:p,cx:e.clientX,cy:e.clientY,dx:view.current.dx,dy:view.current.dy};if(dragTool&&!readOnly)setSelection({x:p.x,y:p.y,w:1,h:1});};
  const move=e=>{const p=toMap(e);if(hover?.x!==p.x||hover?.y!==p.y)setHover(p);if(!drag.current)return;
    if(tool==='inspect'||readOnly&&!tool.startsWith('place:')){view.current.dx=drag.current.dx+e.clientX-drag.current.cx;view.current.dy=drag.current.dy+e.clientY-drag.current.cy;redraw();}
    else if(dragTool){const a=drag.current.start,x=Math.min(a.x,p.x),y=Math.min(a.y,p.y);setSelection({x,y,w:Math.abs(a.x-p.x)+1,h:Math.abs(a.y-p.y)+1});}
  };
  const up=e=>{const d=drag.current;if(!d)return;drag.current=null;const p=toMap(e),still=Math.hypot(e.clientX-d.cx,e.clientY-d.cy)<9;
    if(tool==='inspect'||readOnly){if(still){const b=city.buildings.find(b=>p.x===Math.floor(b.x)&&p.y===Math.floor(b.y));onInspect?.(b||null);}}
    else if(tool.startsWith('place:')){if(still)onPlace?.(tool.slice(6),p.x,p.y);}
    else if(dragTool){const x=Math.max(0,Math.min(W-1,Math.min(d.start.x,p.x))),y=Math.max(0,Math.min(H-1,Math.min(d.start.y,p.y)));
      const mx=Math.max(0,Math.min(W-1,Math.max(d.start.x,p.x))),my=Math.max(0,Math.min(H-1,Math.max(d.start.y,p.y)));
      if(mx>=x&&my>=y)onZone?.({x,y,w:mx-x+1,h:my-y+1},tool);}
    setSelection(null);};
  const selectionText=selection&&describeSelection?describeSelection(selection,tool):null;
  const hoverText=selectionText||(hover&&hover.x>=0&&hover.x<W&&hover.y>=0&&hover.y<H?`${hover.x}, ${hover.y} · ${zoneCell(city,hover.x,hover.y)?ZONES[zoneCell(city,hover.x,hover.y)].label:terrain(city.type,hover.x,hover.y)==='water'?'Water':'Unzoned'}${tool==='place:bridge'?bridgePreview?` · ${bridgePreview.cells.length}-cell bridge · ${publicWorkCost(city,'bridge',bridgePreview.cells.length).toLocaleString('en-US')}`:' · no straight crossing here':''}`:null);
  const zones=Object.entries(ZONES).filter(([key])=>key!=='hotel'||tourismUnlocked(city));
  return <div className="mapwrap">
    <canvas ref={canvas} aria-label="City map. Drag to zone, erase or demolish; click to place a building or bridge." onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={()=>setHover(null)} onPointerCancel={()=>{drag.current=null;setSelection(null)}} style={{touchAction:'none',cursor:tool==='inspect'||readOnly?'grab':'crosshair'}}/>
    {showLegend&&<div className="maplegend">{layer==='value'?<><b>LAND VALUE</b><span><i style={{background:'rgba(92,140,96,.55)'}}/>Prestige nearby</span><span><i style={{background:'rgba(150,95,70,.55)'}}/>Smoke and industry</span></>:layer==='pollution'?<><b>POLLUTION</b><span><i style={{background:'#5f5468'}}/>Workshop / factory</span><span><i style={{background:'#a2513f'}}/>Homes in smoke</span></>:layer==='coverage'?<><b>PUBLIC SERVICES</b><span><i style={{background:'#3f7462'}}/>Church, school, clinic…</span><span><i style={{background:'#9fb7a5'}}/>Homes served</span><span><i style={{background:'#c0806b'}}/>Homes without services</span></>:layer==='districts'?<><b>DISTRICTS</b><span>Named quarters form between main roads, walls and water.</span></>:layer==='age'?<><b>BUILDING ERAS</b>{Object.entries(STYLE_NAMES).map(([key,label])=><span key={key}><i className={`legend-${key}`}/>{label}</span>)}</>:layer==='heritage'?<><b>HERITAGE</b><span><i className="legend-protected"/>Protected</span><span><i className="legend-old"/>120+ years old</span></>:<><b>MAP KEY</b><span><i className="legend-main"/>Main road</span><span><i className="legend-road"/>Street</span><span><i className="legend-wall"/>City wall</span><span><i className="legend-landmark"/>Church, hall or landmark</span><span><i className="legend-water"/>Water</span><span><i className="legend-redroof"/>Houses (roofs)</span>{layer==='zones'&&zones.map(([key,value])=><span key={key}><i style={{background:value.color}}/>{value.label}</span>)}<span><i className="legend-vacant"/>Vacant</span></>}</div>}
    <div className="mapzoom"><button aria-label={showLegend?'Hide map key':'Show map key'} aria-pressed={showLegend} className={showLegend?'keyToggle on':'keyToggle'} onClick={()=>setShowLegend(v=>!v)}>Key</button><button aria-label="Zoom in" onClick={()=>zoom(1.3)}>+</button><button aria-label="Zoom out" onClick={()=>zoom(1/1.3)}>−</button><button aria-label="Reset map view" onClick={()=>{view.current={zoom:1,dx:0,dy:0};redraw();}}><Maximize2 size={14}/></button></div>
    {hoverText&&<div className="coord">{hoverText}</div>}
  </div>;
}
