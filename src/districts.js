// CIVITAS v1.3 — districts that emerge from the city's own geography.
// Main roads, walls, canal/boulevard rings and water cut the land into
// pieces; any piece holding enough buildings becomes a district. A district is
// named once, from its character and era at that moment, and keeps its name
// even as it changes: a "Mill Quarter" can turn residential, as in real cities.
import {W,H,CELLS,DIRS4,key,kx,ky,within,waterGrid,rand,hash,POP_SCALE} from './geo.js';
import {wallCells} from './growth.js';

const MIN_BUILDINGS=10;
const SAINTS=['St. Agnes','St. Olaf','St. Nicholas','St. Margaret','St. Brigid','St. Martin','St. Anne','St. Lawrence','St. Giles','St. Ursula','St. Peter','St. Clement'];
function circleCells(cx,cy,r){
  const out=new Set(),steps=Math.ceil(r*2*Math.PI*3);let last=null;
  for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2,x=Math.floor(cx+r*Math.cos(a)),y=Math.floor(cy+r*Math.sin(a));
    if(last&&last.x!==x&&last.y!==y&&within(x,last.y))out.add(key(x,last.y));
    if(within(x,y))out.add(key(x,y));last={x,y};}
  return out;
}
// Partition the land and gather each piece's buildings.
export function districtPieces(city){
  const water=waterGrid(city.type),edge=new Uint8Array(CELLS);
  for(let k=0;k<CELLS;k++)if(water[k])edge[k]=1;
  for(const r of city.roads||[])if(Number.isFinite(r.x)&&(r.cls==='main'||r.cls==='ring'||r.cls==='bridge'))edge[key(r.x,r.y)]=1;
  for(const w of city.walls||[])if(w.state==='wall')for(const k of wallCells(w))edge[k]=1;
  const piece=new Int16Array(CELLS).fill(-1),pieces=[];
  for(let start=0;start<CELLS;start++){
    if(edge[start]||piece[start]>=0)continue;
    const id=pieces.length,queue=[start];piece[start]=id;
    for(let i=0;i<queue.length;i++){const k=queue[i];for(const [dx,dy] of DIRS4){const x=kx(k)+dx,y=ky(k)+dy;if(!within(x,y))continue;const n=key(x,y);if(!edge[n]&&piece[n]<0){piece[n]=id;queue.push(n);}}}
    pieces.push({id,size:queue.length,buildings:[]});
  }
  for(const b of city.buildings||[]){
    let k=key(Math.floor(b.x),Math.floor(b.y));
    if(piece[k]<0){for(const [dx,dy] of DIRS4){const x=Math.floor(b.x)+dx,y=Math.floor(b.y)+dy;if(within(x,y)&&piece[key(x,y)]>=0){k=key(x,y);break;}}}
    if(piece[k]>=0)pieces[piece[k]].buildings.push(b);
  }
  return {piece,pieces};
}
function describe(city,buildings,origin){
  const mix={res:0,trade:0,craft:0,farm:0,civic:0,hotel:0};let cx=0,cy=0,born=0,vacant=0,homes=0,jobs=0;const landmarks=[];
  for(const b of buildings){
    cx+=b.x;cy+=b.y;born+=b.born||city.year;
    if(b.vacant){vacant++;continue;}
    mix[b.type]=(mix[b.type]||0)+1;
    if(b.type==='res')homes+=b.capacity||8*POP_SCALE;else jobs+=b.jobs||0;
    if(b.special)landmarks.push(b.special);
  }
  const n=Math.max(1,buildings.length),active=Math.max(1,n-vacant);
  const shares=Object.fromEntries(Object.entries(mix).map(([k,v])=>[k,v/active]));
  const dominant=Object.entries(shares).sort((a,b)=>b[1]-a[1])[0][0];
  const centroid={x:cx/n+.4,y:cy/n+.4};
  const angle=Math.atan2(centroid.y-origin.y,centroid.x-origin.x);
  const dir=Math.abs(angle)<Math.PI/4?'East':Math.abs(angle)>Math.PI*3/4?'West':angle>0?'South':'North';
  return {mix,shares,dominant,centroid,averageBorn:Math.round(born/n),vacant,homes,jobs,landmarks,direction:dir,count:buildings.length,
    specialised:shares[dominant]>=.6&&dominant!=='res'?dominant:null};
}
function touchesWater(city,buildings){const water=waterGrid(city.type);for(const b of buildings){const x=Math.floor(b.x),y=Math.floor(b.y);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(within(x+dx,y+dy)&&water[key(x+dx,y+dy)])return true;}return false;}
function nameFor(city,info,buildings,taken,containsOrigin,r){
  const y=city.year,has=k=>info.landmarks.includes(k);
  const waterWord={river:'Riverside',estuary:'Waterfront',coast:'Harbourside',lake:'Lakeside'}[city.type];
  const options=[];
  if(containsOrigin)options.push(y<1550?'Old Town':'Old Centre');
  if(has('university'))options.push('University Quarter');
  if(has('port'))options.push('Harbour Quarter');
  if(has('shrine')||has('monastery'))options.push(has('monastery')?'Abbey Close':'Cathedral Close');
  if(info.landmarks.filter(k=>['monument','museum','workshop'].includes(k)).length>=2)options.push('Arts Quarter');
  if(info.dominant==='craft')options.push(...(y<1750?["Mill Quarter","Tanners' Row","Dyers' Quarter"]:y<1950?['Foundry District','The Works','Ironworks']:['Tech Park','Business Park']));
  if(info.dominant==='trade')options.push(...(y<1750?['Market Quarter',"Merchants' Row"]:['Exchange District','Commercial District']));
  if(info.dominant==='hotel')options.push('The Promenade');
  if(info.dominant==='farm')options.push(`${info.direction} Fields`);
  if(waterWord&&touchesWater(city,buildings)&&info.dominant==='res')options.push(waterWord);
  if(info.dominant==='res'||!options.length){
    if(y<1600)options.push(SAINTS[Math.floor(r()*SAINTS.length)],SAINTS[Math.floor(r()*SAINTS.length)]);
    else if(y<1850)options.push(`${info.direction}gate`,'New Town',`${info.direction} Ward`);
    else options.push(`${info.direction} End`,'Garden Suburb','Park District');
  }
  for(const o of options)if(!taken.has(o))return o;
  for(const prefix of ['Upper','Lower','New','Little','Greater'])for(const o of options)if(!taken.has(`${prefix} ${o}`))return `${prefix} ${o}`;
  return `${info.direction} District ${taken.size+1}`;
}
// Recompute districts, keeping existing names. Returns the stored list
// ({id,name,anchor:[x,y],founded}) — details are derived by districtDetails().
export function updateDistricts(city,origin){
  const {piece,pieces}=districtPieces(city),previous=Array.isArray(city.districts)?city.districts:[];
  const qualifying=pieces.filter(p=>p.buildings.length>=MIN_BUILDINGS);
  const owner=new Map();
  for(const d of previous){const [x,y]=d.anchor||[];if(!within(x,y))continue;let p=piece[key(x,y)];
    if(p<0)for(const [dx,dy] of DIRS4){if(within(x+dx,y+dy)&&piece[key(x+dx,y+dy)]>=0){p=piece[key(x+dx,y+dy)];break;}}
    if(p<0)continue;const cur=owner.get(p);if(!cur||d.founded<cur.founded)owner.set(p,d);}
  const taken=new Set([...owner.values()].map(d=>d.name)),out=[];
  // The founding crossroads sits on main roads; take the nearest piece to it.
  let originPiece=-1,best=Infinity;
  for(let y=Math.max(0,origin.y-4);y<=Math.min(H-1,origin.y+4);y++)for(let x=Math.max(0,origin.x-4);x<=Math.min(W-1,origin.x+4);x++){const p=piece[key(x,y)];if(p<0||pieces[p].buildings.length<MIN_BUILDINGS)continue;const d=Math.hypot(x-origin.x,y-origin.y)-pieces[p].buildings.length*.001;if(d<best){best=d;originPiece=p;}}
  for(const p of qualifying){
    const kept=owner.get(p.id);if(kept){out.push(kept);continue;}
    const oldest=p.buildings.reduce((a,b)=>(b.born||9999)<(a.born||9999)?b:a,p.buildings[0]);
    const anchor=[Math.floor(oldest.x),Math.floor(oldest.y)];
    const r=rand(hash(city.seed,anchor[0],anchor[1],7717));
    const info=describe(city,p.buildings,origin);
    const name=nameFor(city,info,p.buildings,taken,p.id===originPiece&&!taken.has('Old Town')&&!taken.has('Old Centre'),r);taken.add(name);
    out.push({id:`d${anchor[0]}-${anchor[1]}-${city.year}`,name,anchor,founded:city.year});
  }
  return out;
}
const detailCache=new WeakMap();
// Live details for each named district (cached per building list and year).
export function districtDetails(city,origin){
  const hit=detailCache.get(city.buildings);
  if(hit&&hit.len===city.buildings.length&&hit.year===city.year&&hit.districts===city.districts&&hit.roads===city.roads.length)return hit.value;
  const {piece,pieces}=districtPieces(city),grid=new Int16Array(CELLS).fill(-1),list=[];
  for(const d of city.districts||[]){
    const [x,y]=d.anchor||[];if(!within(x,y))continue;let p=piece[key(x,y)];
    if(p<0)for(const [dx,dy] of DIRS4){if(within(x+dx,y+dy)&&piece[key(x+dx,y+dy)]>=0){p=piece[key(x+dx,y+dy)];break;}}
    if(p<0||list.some(v=>v.piece===p))continue;
    list.push({...d,piece:p,...describe(city,pieces[p].buildings,origin)});
  }
  for(let k=0;k<CELLS;k++){const i=list.findIndex(v=>v.piece===piece[k]);if(i>=0)grid[k]=i;}
  const value={list,grid};
  detailCache.set(city.buildings,{len:city.buildings.length,year:city.year,districts:city.districts,roads:city.roads.length,value});
  return value;
}
