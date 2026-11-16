// CIVITAS v3.1 — the organic map for a game city: one engine per city, grown in
// the background a few milliseconds per frame until it reaches the city's year.
import {createOrganic} from './engine.js';
import {W,H,terrain,cityOrigin} from '../sim.js';

export const K=4.2; // world units per grid cell
const engines=new Map();
function keyOf(city){return `${city.id}|${city.seed}|${city.type}|${city.center?`${city.center.x},${city.center.y}`:'none'}`;}
export function organicFor(city){
  const key=keyOf(city);let e=engines.get(city.id);
  // A different city under the same id (a new founding, an undo past the founding) starts again.
  if(!e||e.key!==key){
    const c=city.center||cityOrigin(city),water=(x,y)=>{const cx=Math.floor(x/K),cy=Math.floor(y/K);return cx>=0&&cy>=0&&cx<W&&cy<H&&terrain(city.type,cx,cy)==='water';};
    e={key,engine:createOrganic({seed:city.seed,W:W*K,H:H*K,K,center:[(c.x+.5)*K,(c.y+.5)*K],water})};engines.set(city.id,e);
    if(engines.size>4)engines.delete(engines.keys().next().value);}
  return e.engine;}
// Grow toward the city's year (within a time budget). Returns true when caught up.
export function organicSync(city,ms=14){if(!city.center)return true;return organicFor(city).sync(city,ms);}
// Draw in grid-cell coordinates (the caller's transform): the engine works in world units.
export function organicDraw(ctx,city,year=city.year,part='all'){const e=organicFor(city);ctx.save();ctx.scale(1/K,1/K);e.draw(ctx,Math.min(year,e.year),part);ctx.restore();}
export const organicVersion=city=>{const e=engines.get(city.id)?.engine;return e?`${e.year}|${e.stats().houses}|${e.version}`:'0';};
export function organicLens(ctx,city,kind){const e=organicFor(city);ctx.save();ctx.scale(1/K,1/K);e.lens(ctx,kind);ctx.restore();}
// Place names (plazas, parks, museums) in grid-cell coordinates.
export function organicLabels(city,year=city.year){const e=engines.get(city.id)?.engine;return e?e.labels(Math.min(year,e.year)).map(l=>({...l,x:l.x/K,y:l.y/K})):[];}
export function organicLiving(city){const e=engines.get(city.id)?.engine;return e?e.living():null;}
// Sites on the map the player may decide on (canal, chase, squares, palaces), in grid cells.
// Cached per map year and decision count: markers are drawn every frame.
const siteCache=new Map();
export function organicSites(city){const e=engines.get(city.id)?.engine;if(!e)return [];const k=`${e.year}|${e.version}|${e.stats().houses}`,hit=siteCache.get(city.id);if(hit?.k===k)return hit.v;
  const v=e.sites().map(s=>({...s,x:s.x/K,y:s.y/K}));siteCache.set(city.id,{k,v});if(siteCache.size>4)siteCache.delete(siteCache.keys().next().value);return v;}
