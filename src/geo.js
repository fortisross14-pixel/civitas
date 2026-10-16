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
