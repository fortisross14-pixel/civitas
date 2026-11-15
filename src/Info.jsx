// v2.2: details live behind an (i). Short labels stay on screen; the button
// opens a small note (tap again, tap elsewhere or Escape to close).
import React,{useEffect,useRef,useState} from 'react';

export function Info({label='More details',children,align='start'}){
  const [open,setOpen]=useState(false),ref=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const away=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    const key=e=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('pointerdown',away);document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('pointerdown',away);document.removeEventListener('keydown',key);};
  },[open]);
  return <span className="info" ref={ref}>
    <button type="button" className={`infoButton ${open?'on':''}`} aria-label={label} aria-expanded={open} onClick={e=>{e.stopPropagation();setOpen(v=>!v);}}>i</button>
    {open&&<span className={`infoNote info-${align}`} role="note">{children}</span>}
  </span>;
}
