// CIVITAS v1.4 timelapse frames: one map every fifty years plus the present,
// each annotated with the most memorable event of its half-century.
import {W,H,snapshotCity,stats,HISTORICAL_INTERVAL} from './sim.js';
const PRIORITY={history:6,fire:5,flood:5,epidemic:5,landmark:4,works:3,card:2,crisis:2,boom:1};
function firstSentence(t){const m=String(t||'').match(/^[^.!?]*[.!?]/);return (m?m[0]:String(t||'')).trim();}
export function periodCaption(city,from,to){
  const pool=(city.events||[]).filter(e=>e.year>from&&e.year<=to&&PRIORITY[e.type]&&Number.isFinite(e.x));
  if(!pool.length)return null;
  pool.sort((a,b)=>PRIORITY[b.type]-PRIORITY[a.type]||(b.impact||0)-(a.impact||0)||a.year-b.year);
  const e=pool[0],body=firstSentence(e.text).replace(/\.$/,'');
  return {text:`${e.year}: ${body.charAt(0).toLowerCase()+body.slice(1)}`,x:e.x,y:e.y};
}
export function timelapseFrames(city){
  const snaps=[...(city.snapshots||[])].filter(s=>s.year%HISTORICAL_INTERVAL===0||s.year===city.year).sort((a,b)=>a.year-b.year);
  const frames=[];let prev=-Infinity;
  for(const snap of snaps){if(snap.year===prev)continue;frames.push({year:snap.year,population:snap.population,city:snapshotCity(city,snap),caption:periodCaption(city,prev===-Infinity?0:prev,snap.year)});prev=snap.year;}
  if(!frames.length||city.year>prev)frames.push({year:city.year,population:stats(city).population,city,caption:periodCaption(city,prev===-Infinity?0:prev,city.year),present:true});
  return frames;
}

// One fixed view for every frame: the final town's extent with a margin of
// countryside, so the city grows into the frame.
export function timelapseView(frames,width,height){
  const last=frames.at(-1)?.city;const pts=(last?.buildings||[]).filter(b=>b.type!=='farm');
  if(pts.length<4){const base=Math.min(width/W,height/H),s=Math.max(width/W,height/H);return {zoom:s/base,dx:0,dy:0};}
  const xs=pts.map(b=>b.x).sort((a,b)=>a-b),ys=pts.map(b=>b.y).sort((a,b)=>a-b),q=(a,f)=>a[Math.floor((a.length-1)*f)];
  const x0=Math.max(0,q(xs,.02)-6),x1=Math.min(W,q(xs,.98)+7),y0=Math.max(0,q(ys,.02)-6),y1=Math.min(H,q(ys,.98)+7);
  const base=Math.min(width/W,height/H),scale=Math.max(width/W,height/H,Math.min(width/(x1-x0),height/(y1-y0)));
  const cx=(x0+x1)/2,cy=(y0+y1)/2;
  // Keep the map edge out of view.
  const ox=Math.min(0,Math.max(width-W*scale,width/2-cx*scale)),oy=Math.min(0,Math.max(height-H*scale,height/2-cy*scale));
  return {zoom:scale/base,dx:ox-(width-W*scale)/2,dy:oy-(height-H*scale)/2};
}
