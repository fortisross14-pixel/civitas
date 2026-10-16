import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Play,Pause,SkipBack,SkipForward,X,Video,Square} from 'lucide-react';
import {eraAt,HISTORICAL_INTERVAL} from './sim';
import {timelapseFrames,timelapseView} from './timelapse.js';
import {drawCity} from './render.js';

// CIVITAS v1.4 timelapse: one map every fifty years plus the present, cross-
// faded, each annotated with the most memorable event of its half-century.
const HOLD=2600,FADE=900;
export function Timelapse({city,onClose}){
  const frames=useMemo(()=>timelapseFrames(city),[city]);
  const box=useRef(null),canvas=useRef(null),cache=useRef(new Map()),clock=useRef({t:0,last:0});
  const [index,setIndex]=useState(0),[playing,setPlaying]=useState(true),[size,setSize]=useState({w:800,h:576}),[recording,setRecording]=useState(false);
  const recorder=useRef(null);
  useEffect(()=>{const el=box.current;if(!el)return;const fit=()=>{const r=el.getBoundingClientRect();setSize({w:Math.max(260,Math.round(r.width)),h:Math.max(260,Math.round(r.height))});};fit();const obs=new ResizeObserver(fit);obs.observe(el);return()=>obs.disconnect();},[]);
  const view=useMemo(()=>timelapseView(frames,size.w,size.h),[frames,size.w,size.h]);
  useEffect(()=>{cache.current=new Map();},[view,frames]);
  const frameImage=i=>{
    const key=i;if(cache.current.has(key))return cache.current.get(key);
    const f=frames[i],dpr=Math.min(2,window.devicePixelRatio||1),c=document.createElement('canvas');c.width=size.w*dpr;c.height=size.h*dpr;
    const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
    drawCity(ctx,f.city,size.w,size.h,{view,layer:'urban',now:0,population:f.population,archiveYear:f.year,
      captions:f.caption?[{...f.caption,alpha:1,size:size.w<520?12:15}]:[]});
    cache.current.set(key,c);return c;
  };
  // Playback loop.
  useEffect(()=>{
    let raf;const c=canvas.current;if(!c)return;const dpr=Math.min(2,window.devicePixelRatio||1);c.width=size.w*dpr;c.height=size.h*dpr;
    const ctx=c.getContext('2d');clock.current.last=performance.now();
    const paint=()=>{
      const now=performance.now();if(playing)clock.current.t+=now-clock.current.last;clock.current.last=now;
      let i=index,t=clock.current.t;
      if(t>=HOLD+FADE){if(i<frames.length-1){clock.current.t=0;setIndex(i+1);return;}t=HOLD;clock.current.t=HOLD;if(playing){setPlaying(false);if(recorder.current)stopRecording();}}
      ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.drawImage(frameImage(i),0,0);
      if(t>HOLD&&i<frames.length-1){ctx.globalAlpha=Math.min(1,(t-HOLD)/FADE);ctx.drawImage(frameImage(i+1),0,0);ctx.globalAlpha=1;}
      raf=requestAnimationFrame(paint);
    };
    paint();return()=>cancelAnimationFrame(raf);
  },[index,playing,size,frames]);
  const go=i=>{clock.current.t=0;setIndex(Math.max(0,Math.min(frames.length-1,i)));};
  useEffect(()=>{const onKey=e=>{if(e.key==='Escape')onClose();else if(e.key===' '){e.preventDefault();setPlaying(p=>!p);}else if(e.key==='ArrowRight')go(index+1);else if(e.key==='ArrowLeft')go(index-1);};window.addEventListener('keydown',onKey,true);return()=>window.removeEventListener('keydown',onKey,true);},[index]);
  const canRecord=typeof MediaRecorder!=='undefined'&&!!HTMLCanvasElement.prototype.captureStream;
  const startRecording=()=>{
    const c=canvas.current;if(!c||!canRecord)return;
    const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported?.(t))||'';
    const rec=new MediaRecorder(c.captureStream(30),type?{mimeType:type,videoBitsPerSecond:6e6}:undefined),chunks=[];
    rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    rec.onstop=()=>{const blob=new Blob(chunks,{type:'video/webm'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${city.name.replace(/[^\w-]+/g,'_')}_timelapse.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);setRecording(false);recorder.current=null;};
    recorder.current=rec;rec.start();setRecording(true);go(0);setPlaying(true);
  };
  const stopRecording=()=>{recorder.current?.state==='recording'&&recorder.current.stop();};
  useEffect(()=>()=>{if(recorder.current?.state==='recording'){recorder.current.onstop=null;recorder.current.stop();}},[]);
  const f=frames[index];
  return <div className="timelapseBackdrop" role="dialog" aria-modal="true" aria-label={`Timelapse of ${city.name}`}>
    <div className="timelapseWindow">
      <div className="timelapseHead"><div><span className="eyebrow">TIMELAPSE · ONE MAP EVERY {HISTORICAL_INTERVAL} YEARS</span><h2>{city.name}</h2></div><button className="iconbutton" aria-label="Close timelapse" onClick={onClose}><X size={18}/></button></div>
      <div className="timelapseStage" ref={box}><canvas ref={canvas} style={{width:size.w,height:size.h}}/></div>
      <div className="timelapseInfo"><b>{f.year}</b><span>{eraAt(f.year).n} · pop. c. {Math.round(f.population).toLocaleString('en-US')}</span>{f.caption&&<em>{f.caption.text}</em>}</div>
      <div className="timelapseYears">{frames.map((v,i)=><button key={v.year} className={i===index?'sel':i<index?'past':''} onClick={()=>go(i)} aria-label={`Show ${v.year}`}><i/><small>{v.present&&v.year%HISTORICAL_INTERVAL?'Now':v.year}</small></button>)}</div>
      <div className="timelapseControls">
        <button onClick={()=>go(index-1)} disabled={index===0||recording} aria-label="Previous map"><SkipBack size={16}/></button>
        <button className="primary" onClick={()=>{if(!playing&&index===frames.length-1)go(0);setPlaying(p=>!p);}} disabled={recording}>{playing?<><Pause size={16}/> Pause</>:<><Play size={16}/> {index===frames.length-1?'Replay':'Play'}</>}</button>
        <button onClick={()=>go(index+1)} disabled={index===frames.length-1||recording} aria-label="Next map"><SkipForward size={16}/></button>
        {canRecord&&(recording?<button className="recording" onClick={stopRecording}><Square size={14}/> Stop &amp; save</button>:<button onClick={startRecording} title="Plays the whole timelapse and saves it as a .webm video"><Video size={16}/> Save video</button>)}
      </div>
    </div>
  </div>;
}
