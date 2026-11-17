import {useEffect} from 'react';
// v4.1 (M5): dialogs take the focus when they open, keep Tab inside, and give it back on close.
const FOCUSABLE='button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
export function useDialogFocus(ref){
  useEffect(()=>{const el=ref.current;if(!el)return;const before=document.activeElement;
    if(!el.contains(document.activeElement))(el.querySelector('[autofocus]')||el.querySelector(FOCUSABLE)||el).focus({preventScroll:true});
    const trap=e=>{if(e.key!=='Tab')return;const f=[...el.querySelectorAll(FOCUSABLE)].filter(x=>x.offsetParent!==null);if(!f.length)return;
      if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus();}};
    el.addEventListener('keydown',trap);
    return()=>{el.removeEventListener('keydown',trap);if(before&&before.focus&&document.contains(before))before.focus({preventScroll:true});};},[]);
}
// Escape closes it.
export function useEscape(onClose){useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',k);return()=>document.removeEventListener('keydown',k);},[onClose]);}
