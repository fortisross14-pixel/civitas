// CIVITAS v1.1 — shared map geometry. No imports, so every simulation module
// (sim, growth, economy) can depend on it without circular-import hazards.
export const W=100, H=72, CELLS=W*H;
// v1.2: one map building stands for a block of homes or workplaces. Every
// capacity, job count and population threshold is multiplied by POP_SCALE so
// a thriving city reaches historical sizes (Amsterdam ~30,000 by 1570).
// Per-person figures (GDP per capita, tax per resident) are unchanged.
export const POP_SCALE=12;
export const DIRS4=[[1,0],[-1,0],[0,1],[0,-1]];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const within=(x,y)=>x>=0&&x<W&&y>=0&&y<H;
export const key=(x,y)=>y*W+x;
export const kx=k=>k%W, ky=k=>Math.floor(k/W);
export function rand(seed){let x=(seed|0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
export function hash(seed,...values){let n=(seed|0)^0x9e3779b9;for(const v of values){n=Math.imul(n^v,0x85ebca6b);n^=n>>>13;}return n|0;}
export function terrain(type,x,y){
  if(!within(x,y))return 'outside';
  if(type==='river'){const center=53+Math.sin(y*.095)*8+Math.sin(y*.033)*5;return Math.abs(x-center)<2.8?'water':'land';}
  if(type==='coast')return x>75+Math.sin(y*.1)*4.5+Math.sin(y*.039)*3.5?'water':'land';
  if(type==='estuary'){const coast=x>77+Math.sin(y*.09)*3?'water':'land',mouth=47+Math.sin(y*.12)*7;return coast==='water'||(y>36&&Math.abs(x-mouth)<Math.max(3,(y-32)*.13))?'water':'land';}
  if(type==='lake'){const dx=x-64,dy=y-36;return dx*dx/150+dy*dy/105<1?'water':'land';}
  return 'land';
}
// 1 = water, 0 = land. Terrain is fixed per geography, so it is computed once.
const waterCache=new Map();
export function waterGrid(type){
  let grid=waterCache.get(type);if(grid)return grid;
  grid=new Uint8Array(CELLS);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(terrain(type,x,y)==='water')grid[key(x,y)]=1;
  waterCache.set(type,grid);return grid;
}
export const footprint=b=>({x:Math.floor(b.x),y:Math.floor(b.y),w:Math.max(1,Math.ceil((b.x+b.w)-Math.floor(b.x))),h:Math.max(1,Math.ceil((b.y+b.h)-Math.floor(b.y)))});
// Smooth deterministic value noise in [0,1], used to make main roads meander.
export function valueNoise(seed,x,y,scale=9){
  const fx=x/scale,fy=y/scale,x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0;
  const v=(i,j)=>((hash(seed,i,j)>>>0)%10000)/10000;
  const s=t=>t*t*(3-2*t);
  const a=v(x0,y0)+(v(x0+1,y0)-v(x0,y0))*s(tx),b=v(x0,y0+1)+(v(x0+1,y0+1)-v(x0,y0+1))*s(tx);
  return a+(b-a)*s(ty);
}

// ───────────────────────── relief ─────────────────────────
// v2.7: a cheap heightfield per city (geography + seed): rolling ground, one
// ridge, two or three hills, and valleys along the water. Everything that
// grows reads it: country roads keep to gentle ground, lanes follow contours,
// floodplains stay farmland until the age of embankments, hills draw villas.
//   height  0 (water level) … 1 (hilltop)
//   slope   height difference per parcel; cells above STEEP take no streets
//   flood   1 on low ground beside water
//   shore   distance to water in parcels (capped)
export const STEEP=.05,FLOOD_UNTIL=1850;
const reliefCache=new Map();
export function relief(type,seed){
  const id=`${type}:${seed|0}`;let hit=reliefCache.get(id);if(hit)return hit;
  if(reliefCache.size>12)reliefCache.clear();
  const water=waterGrid(type),shore=new Uint8Array(CELLS).fill(60),queue=[];
  for(let k=0;k<CELLS;k++)if(water[k]){shore[k]=0;queue.push(k);}
  for(let i=0;i<queue.length;i++){const k=queue[i],x=kx(k),y=ky(k);for(const [dx,dy] of DIRS4){const nx=x+dx,ny=y+dy;if(!within(nx,ny))continue;const n=key(nx,ny);if(shore[n]>shore[k]+1){shore[n]=shore[k]+1;queue.push(n);}}}
  const r=rand(hash(seed,type.length,4177)),s=seed|0;
  // A ridge: a line across the map at a seeded bearing, broken into saddles by noise.
  const ra=r()*Math.PI,rx=18+r()*64,ry=12+r()*48,ux=Math.cos(ra),uy=Math.sin(ra);
  const hills=Array.from({length:2+Math.floor(r()*2)},()=>({x:8+r()*84,y:6+r()*60,rad:5+r()*5,h:.35+r()*.3}));
  const height=new Float32Array(CELLS),slope=new Float32Array(CELLS),flood=new Uint8Array(CELLS),steep=new Uint8Array(CELLS);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const k=key(x,y);if(water[k])continue;
    const rolling=.5*valueNoise(s+101,x,y,24)+.3*valueNoise(s+102,x,y,11)+.2*valueNoise(s+103,x,y,5);
    const across=(x-rx)*-uy+(y-ry)*ux,along=(x-rx)*ux+(y-ry)*uy;
    const ridge=Math.exp(-(across*across)/38)*(.25+.75*valueNoise(s+104,along,0,9));
    let bumps=0;for(const h of hills){const d2=((x-h.x)**2+(y-h.y)**2)/(h.rad*h.rad);if(d2<4)bumps+=h.h*Math.exp(-d2*1.4);}
    // Valleys: the ground falls toward the water over about ten parcels.
    const t=Math.min(1,shore[k]/10),valley=t*t*(3-2*t);
    height[k]=clamp((rolling*.34+ridge*.42+bumps)*(.12+.88*valley)+.02*valley,0,1);
  }
  const at=(x,y)=>height[key(clamp(x,0,W-1),clamp(y,0,H-1))];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const k=key(x,y);if(water[k])continue;
    slope[k]=Math.hypot(at(x+1,y)-at(x-1,y),at(x,y+1)-at(x,y-1))/2;
    steep[k]=slope[k]>STEEP?1:0;
    // Water meadows: wide on some reaches, absent on others (firm banks where a town can meet its river).
    const meadow=Math.round((valueNoise(s+105,x,y,12)-.38)*13);
    flood[k]=shore[k]<=Math.min(6,meadow)&&height[k]<.09?1:0;
  }
  hit={height,slope,flood,steep,shore,water};reliefCache.set(id,hit);return hit;
}
