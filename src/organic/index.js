// CIVITAS v3.1 — the organic map for a game city: one engine per city, grown in
// the background a few milliseconds per frame until it reaches the city's year.
import {createOrganic} from './engine.js';
import {W,H,terrain,cityOrigin,cityFields} from '../sim.js';

export const K=4.2; // world units per grid cell
const engines=new Map();
function keyOf(city){return `${city.id}|${city.seed}|${city.type}|${city.center?`${city.center.x},${city.center.y}`:'none'}`;}
// v3.6 fast open: the grown map is saved with the city (IndexedDB) and restored on open, when
// the city's history up to the saved year is unchanged (its fingerprint matches).
const stored=new Map(); // city id → {state:'loading'|'ready'|'none', data}
function fingerprint(city,y){const h=JSON.stringify([city.seed,city.type,city.center&&[city.center.x,city.center.y],
  (city.zones||[]).filter(z=>(Number(z.year)||1300)<=y).map(z=>[z.x,z.y,z.w,z.h,z.type,z.form||'',z.year,(z.formHist||[]).filter(f=>f[0]<=y)]),
  (city.walls||[]).filter(w=>(w.built||0)<=y).map(w=>[w.id,w.built,w.state]),(city.bridges||[]).filter(b=>(b.built||0)<=y).map(b=>b.id),
  (city.routes||[]).filter(r=>(r.born||1300)<=y).length,Object.entries(city.heritage||{}).filter(([,d])=>d.year<=y).map(([k,d])=>[k,d.option,d.year])]);
  let n=2166136261;for(let i=0;i<h.length;i++){n^=h.charCodeAt(i);n=Math.imul(n,16777619);}return (n>>>0).toString(36);}
function loadStored(city){if(stored.has(city.id)||typeof indexedDB==='undefined')return;stored.set(city.id,{state:'loading'});
  import('../storage.js').then(m=>m.readMap(city.id)).then(d=>stored.set(city.id,{state:d?'ready':'none',data:d})).catch(()=>stored.set(city.id,{state:'none'}));}
export function organicFor(city){
  const key=keyOf(city);let e=engines.get(city.id);
  // A different city under the same id (a new founding, an undo past the founding) starts again.
  if(!e||e.key!==key){
    const c=city.center||cityOrigin(city),water=(x,y)=>{const cx=Math.floor(x/K),cy=Math.floor(y/K);return cx>=0&&cy>=0&&cx<W&&cy<H&&terrain(city.type,cx,cy)==='water';};
    e={key,engine:createOrganic({seed:city.seed,W:W*K,H:H*K,K,center:[(c.x+.5)*K,(c.y+.5)*K],water}),saved:0,savedAt:0};engines.set(city.id,e);
    const st=stored.get(city.id);if(st?.state==='ready'&&st.data?.key===key&&st.data.year<=city.year&&st.data.fp===fingerprint(city,st.data.year)){try{if(e.engine.restore(st.data.snap))e.saved=st.data.year;}catch{}}
    if(engines.size>4)engines.delete(engines.keys().next().value);}
  return e.engine;}
// Save the grown map now and then (every 15 game years once caught up), off the busy path.
function maybeSave(city){const e=engines.get(city.id);if(!e||typeof indexedDB==='undefined')return;const y=e.engine.year,now=Date.now();if(y-e.saved<15||now-e.savedAt<20000)return;e.saved=y;e.savedAt=now;
  const go=()=>{try{const snap=structuredClone(e.engine.snapshot());import('../storage.js').then(m=>m.writeMap(city.id,{key:e.key,year:y,fp:fingerprint(city,y),snap})).catch(()=>{});}catch{}};
  (typeof requestIdleCallback!=='undefined'?requestIdleCallback:setTimeout)(go);}
// Grow toward the city's year (within a time budget). Returns true when caught up.
export function organicSync(city,ms=14){if(!city.center)return true;
  if(!engines.has(city.id)||engines.get(city.id).key!==keyOf(city)){loadStored(city);if(stored.get(city.id)?.state==='loading')return false;}
  const done=organicFor(city).sync(city,ms);if(done){maybeSave(city);globalThis.__civitasMap={id:city.id,year:city.year};}return done;}
// Draw in grid-cell coordinates (the caller's transform): the engine works in world units.
// While a saved map is being read, draw nothing rather than start a new one.
const waiting=city=>{const e=engines.get(city.id);return (!e||e.key!==keyOf(city))&&stored.get(city.id)?.state==='loading';};
export function organicDraw(ctx,city,year=city.year,part='all',opts=null){if(waiting(city))return;const e=organicFor(city);ctx.save();ctx.scale(1/K,1/K);e.draw(ctx,Math.min(year,e.year),part,opts?.lens?{tint:fieldTint(city,opts.lens)}:null);ctx.restore();}
// v3.6 lenses: the game's own fields (traffic, land value, living) as a colour for the paved streets.
const RAMPS={
  traffic:v=>v<.2?[232,224,198,200]:(t=>[...(t<.45?[236,206,110]:t<.8?[228,146,58]:[196,58,40]),Math.round(150+t*90)])(Math.min(1,(v-.2)/1.1)),
  value:v=>{const t=Math.min(1,v/100);return [Math.round(226-t*34),Math.round(214-t*150),Math.round(186-t*150),Math.round(150+t*90)];},
  sol:v=>v>=50?[Math.round(214-(v-50)*2.2),Math.round(222-(v-50)*.6),Math.round(190-(v-50)*1.8),Math.round(140+(v-50)*1.8)]:[Math.round(200-(50-v)*.6),Math.round(186-(50-v)*2),Math.round(206-(50-v)*.4),Math.round(140+(50-v)*1.8)]};
function fieldTint(city,lens){const F=cityFields(city),f=lens==='traffic'?F.traffic:lens==='value'?F.value:F.living,ramp=RAMPS[lens]||RAMPS.traffic,key=`${lens}|${city.year}|${city.month}|${city.buildings.length}|${city.roads.length}`;
  return {key,at:(x,y)=>{const cx=Math.floor(x/K),cy=Math.floor(y/K);if(cx<0||cy<0||cx>=W||cy>=H||!f)return null;return ramp(f[cy*W+cx]);}};}
export const organicVersion=city=>{const e=engines.get(city.id)?.engine;return e?`${e.year}|${e.stats().houses}|${e.version}`:'0';};
export function organicLens(ctx,city,kind){if(waiting(city))return;const e=organicFor(city);ctx.save();ctx.scale(1/K,1/K);e.lens(ctx,kind);ctx.restore();}
// Place names (plazas, parks, museums) in grid-cell coordinates.
export function organicLabels(city,year=city.year){const e=engines.get(city.id)?.engine;return e?e.labels(Math.min(year,e.year)).map(l=>({...l,x:l.x/K,y:l.y/K})):[];}
export function organicLiving(city){const e=engines.get(city.id)?.engine;return e?e.living():null;}
// Sites on the map the player may decide on (canal, chase, squares, palaces), in grid cells.
// Cached per map year and decision count: markers are drawn every frame.
const siteCache=new Map();
export function organicSites(city){const e=engines.get(city.id)?.engine;if(!e)return [];const k=`${e.year}|${e.version}|${e.stats().houses}`,hit=siteCache.get(city.id);if(hit?.k===k)return hit.v;
  const v=e.sites().map(s=>({...s,x:s.x/K,y:s.y/K}));siteCache.set(city.id,{k,v});if(siteCache.size>4)siteCache.delete(siteCache.keys().next().value);return v;}
// What is drawn at a point given in grid cells (fractions allowed).
export function organicPick(city,x,y){const e=engines.get(city.id)?.engine;return e?e.pick(x*K,y*K,city.year):null;}
export function organicOutline(ctx,city,x,y,lw){const e=engines.get(city.id)?.engine;if(!e)return false;ctx.save();ctx.scale(1/K,1/K);const r=e.outline(ctx,x*K,y*K,city.year,lw*K);ctx.restore();return r;}
export const organicYear=city=>engines.get(city.id)?.engine.year??1300;
