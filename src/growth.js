// CIVITAS v1.1 — organic urban growth.
// Main roads link the founding point to the outside world. Minor lanes sprout
// from existing streets, drawn toward zoned land but free to wander anywhere
// within the city's reach. Buildings need street access; zoned plots are
// preferred, while modest informal growth fills unzoned land beside streets.
// Pure functions over plain data. Callers pass a seeded `r()` for determinism.
import {W,H,CELLS,DIRS4,within,key,kx,ky,clamp,waterGrid,footprint,valueNoise} from './geo.js';

export const ROAD_CODE={minor:1,main:2,bridge:3,ring:4,boulevard:4};
export const roadClass=r=>r?.cls||(r?.pattern==='boulevard'?'boulevard':'minor');
export function patternFor(year){return year<1500?'organic':year<1800?'regular':year<1950?'industrial':'modern';}
// Street character by era: medieval lanes are short and wander; planned eras
// lay longer straight streets with wider blocks between parallel roads.
const LANE={organic:{min:3,span:5,spacing:2,jog:.2},regular:{min:5,span:7,spacing:3,jog:0},industrial:{min:6,span:8,spacing:3,jog:0},modern:{min:8,span:9,spacing:4,jog:0}};

// ───────────────────────── grids ─────────────────────────
// One pass builds every lookup the monthly growth step needs (typed arrays).
export function buildGrids(city){
  const water=waterGrid(city.type),occ=new Uint8Array(CELLS),road=new Uint8Array(CELLS),access=new Uint8Array(CELLS),near=new Uint8Array(CELLS),front=new Uint8Array(CELLS);
  // nearWater: within two cells of water (mills and dye works before steam).
  const nearWater=new Uint8Array(CELLS);for(let k=0;k<CELLS;k++)if(water[k])around(k,2,n=>{nearWater[n]=1;});
  const g={water,occ,road,access,near,front,nearWater,roadKeys:[]};
  for(const b of city.buildings||[]){const f=footprint(b);for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++)if(within(x,y))markBuilding(g,key(x,y));}
  for(const r of city.roads||[])if(Number.isFinite(r.x)&&Number.isFinite(r.y)&&within(r.x,r.y))markRoad(g,key(r.x,r.y),roadClass(r));
  return g;
}
function around(k,radius,fn){const x0=kx(k),y0=ky(k);for(let y=Math.max(0,y0-radius);y<=Math.min(H-1,y0+radius);y++)for(let x=Math.max(0,x0-radius);x<=Math.min(W-1,x0+radius);x++)fn(key(x,y));}
export function markRoad(g,k,cls='minor'){
  if(!g.road[k])g.roadKeys.push(k);
  g.road[k]=Math.max(g.road[k],ROAD_CODE[cls]||1);
  // Parcels up to two cells deep behind a street have access (a house plus yard).
  around(k,2,n=>{g.access[n]=1;});
  if(cls==='main')around(k,1,n=>{g.front[n]=1;});
}
export function markBuilding(g,k){g.occ[k]=1;around(k,2,n=>{g.near[n]=1;});}
const free=(g,k)=>!g.water[k]&&!g.occ[k]&&!g.road[k];

// ───────────────────────── parcels ─────────────────────────
// Returns the best parcel for a new building of `type`, or null when no parcel
// with street access exists (the caller then asks for more streets).
export function pickParcel(g,zoneGrid,type,r,o){
  // Informal growth: homes, shops and fields anywhere near town; parish churches
  // before 1850; small workshops in a city whose character leans to industry.
  const informalOK=o.allowInformal&&(type==='res'||type==='trade'||type==='farm'||(type==='civic'&&o.informalCivic)||(type==='craft'&&o.informalCraft));
  const f=o.fields;
  let best=null,bestScore=-Infinity;
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
    const k=key(x,y);
    if(!free(g,k)||!g.access[k])continue;
    const z=zoneGrid[k],d=Math.hypot(x-o.origin.x,y-o.origin.y);
    let base;
    if(z===type)base=3;
    else if(z==null&&informalOK){
      // Informal growth hugs existing development, or lines a main road near town.
      if(d>o.reach+4)continue;
      if(!g.near[k]&&!(g.front[k]&&d<=o.reach))continue;
      base=0;
    }else continue;
    let roads=0,touching=0;
    for(const [dx,dy] of DIRS4){const n=key(x+dx,y+dy);if(g.road[n])roads++;if(g.occ[n])touching++;}
    let score=base+roads*.28+touching*.11+(type==='farm'?d*.02:-d*.022)+r()*.23;
    if(type==='trade'&&g.front[k])score+=.5;
    // Freshly designated districts fill first: the player just asked for them.
    if(base===3&&o.zoneOrder){const i=o.zoneOrder[k];if(i)score+=Math.max(0,1.2-(o.year-(o.zoneYears?.[i-1]??o.year))*.03);}
    if((type==='res'||type==='trade')&&o.walls?.some(w=>insideWall(w,x+.5,y+.5)))score+=.3;
    // Location: homes seek prestige and services and shun smoke; shops seek
    // markets and main roads; workshops avoid fine quarters and like water
    // before steam; churches go where no parish reaches yet.
    if(f){
      const pol=Math.min(2,f.pollution[k]*(f.homeShield??1)),pre=Math.min(2,f.prestige[k]),ser=Math.min(2,f.service[k]),tra=Math.min(2,f.trade[k]);
      if(type==='res')score+=pre*.5-pol*.6+(ser>=.35?.15:0);
      else if(type==='trade')score+=tra*.4+pre*.2;
      else if(type==='hotel')score+=pre*.6+tra*.2;
      else if(type==='craft')score+=-pre*.4+(o.year<1850&&g.nearWater?.[k]?.3:0);
      else if(type==='civic')score+=-ser*.6;
    }
    if(score>bestScore){bestScore=score;best={x,y,informal:z!==type};}
  }
  return best;
}

// ───────────────────────── streets ─────────────────────────
export function laneStyle(pattern){return LANE[pattern]||LANE.organic;}
// Lay new minor streets. Returns the road records added (already pushed to city.roads).
export function growRoads(city,g,zoneGrid,r,actions,o){
  const added=[];
  for(let a=0;a<actions;a++){
    const reached=unreachedZones(g,zoneGrid)>0&&r()<.55?reachZone(city,g,zoneGrid,r,o,added):false;
    if(!reached)branchLane(city,g,zoneGrid,r,o,added);
  }
  return added;
}
function unreachedZones(g,zoneGrid){let n=0;for(let k=0;k<CELLS;k++)if(zoneGrid[k]!=null&&!g.access[k]&&free(g,k))n++;return n;}
function commit(city,g,keys,o,added,cls='minor'){
  for(const k of keys){if(g.road[k])continue;const road={x:kx(k),y:ky(k),born:o.year,pattern:o.pattern,cls};city.roads.push(road);added.push(road);markRoad(g,k,cls);}
}
// A street pushed out from the network toward the nearest unserved zoned land.
function reachZone(city,g,zoneGrid,r,o,added){
  if(!g.roadKeys.length)return false;
  const parent=new Int32Array(CELLS).fill(-2),dist=new Uint16Array(CELLS),queue=[];
  for(const k of g.roadKeys){parent[k]=-1;queue.push(k);}
  const targets=[];
  for(let i=0;i<queue.length&&targets.length<40;i++){
    const k=queue[i],x=kx(k),y=ky(k);
    if(dist[k]>=40)continue;
    for(const [dx,dy] of DIRS4){const nx=x+dx,ny=y+dy;if(nx<1||ny<1||nx>W-2||ny>H-2)continue;const n=key(nx,ny);
      if(parent[n]!==-2||!free(g,n))continue;
      parent[n]=k;dist[n]=dist[k]+1;queue.push(n);
      if(zoneGrid[n]!=null&&!g.access[n])targets.push(n);
    }
  }
  if(!targets.length)return false;
  // Head for the most recently zoned district among the nearest candidates.
  const newest=Math.max(...targets.map(k=>o.zoneOrder?.[k]||0)),pool=targets.filter(k=>(o.zoneOrder?.[k]||0)===newest).slice(0,6);
  const target=pool[Math.floor(r()*pool.length)],path=[];
  for(let k=target;parent[k]>=0;k=parent[k])path.push(k);
  path.reverse(); // network → target
  // Stop two cells short of the target: access reaches two cells deep.
  const keep=path.slice(0,Math.max(1,Math.min(10,path.length-2)));
  commit(city,g,keep,o,added);
  return keep.length>0;
}
function lure(g,zoneGrid,x0,y0,radius){let n=0;for(let y=Math.max(0,y0-radius);y<=Math.min(H-1,y0+radius);y++)for(let x=Math.max(0,x0-radius);x<=Math.min(W-1,x0+radius);x++){const k=key(x,y);if(zoneGrid[k]!=null&&!g.access[k]&&free(g,k))n++;}return n;}
function openBeyond(g,x0,y0){let n=0;for(let y=Math.max(0,y0-3);y<=Math.min(H-1,y0+3);y++)for(let x=Math.max(0,x0-3);x<=Math.min(W-1,x0+3);x++){const k=key(x,y);if(free(g,k)&&!g.access[k])n++;}return n;}
// A lane sprouting from a random point of the network, perpendicular to it.
function branchLane(city,g,zoneGrid,r,o,added){
  const n=g.roadKeys.length;if(!n)return false;
  const style=laneStyle(o.pattern);
  let seed=-1,bestScore=-Infinity;
  for(let i=0;i<18;i++){
    const k=g.roadKeys[Math.floor(r()*n)];if(g.road[k]===ROAD_CODE.bridge)continue;
    const x=kx(k),y=ky(k),d=Math.hypot(x-o.origin.x,y-o.origin.y);
    if(d>o.reach&&!lure(g,zoneGrid,x,y,3))continue;
    const score=lure(g,zoneGrid,x,y,5)*.5+openBeyond(g,x,y)*.15-d*.03+r()*1.2;
    if(score>bestScore){bestScore=score;seed=k;}
  }
  if(seed<0)return false;
  const sx=kx(seed),sy=ky(seed);
  const horizontal=g.road[key(sx+1,sy)]||g.road[key(sx-1,sy)],vertical=g.road[key(sx,sy+1)]||g.road[key(sx,sy-1)];
  const dirs=horizontal&&!vertical?[[0,1],[0,-1]]:vertical&&!horizontal?[[1,0],[-1,0]]:DIRS4;
  let dir=null,dirScore=-Infinity;
  for(const [dx,dy] of dirs){
    const fx=sx+dx,fy=sy+dy;if(fx<1||fy<1||fx>W-2||fy>H-2||!free(g,key(fx,fy)))continue;
    let ahead=0;for(let t=1;t<=8;t++)for(let s=-2;s<=2;s++){const x=sx+dx*t+dy*s,y=sy+dy*t+dx*s;if(!within(x,y))continue;const k=key(x,y);if(zoneGrid[k]!=null&&!g.access[k]&&free(g,k))ahead++;}
    const score=ahead+r()*2;
    if(score>dirScore){dirScore=score;dir=[dx,dy];}
  }
  if(!dir)return false;
  const length=style.min+Math.floor(r()*style.span),laid=[],laidSet=new Set();
  const ok=(x,y,mx,my)=>{
    if(x<1||y<1||x>W-2||y>H-2)return false;const k=key(x,y);
    if(!free(g,k)||laidSet.has(k))return false;
    if(Math.hypot(x-o.origin.x,y-o.origin.y)>o.reach&&zoneGrid[k]==null)return false;
    // Keep a block's depth between parallel streets; never double a street.
    for(let t=1;t<style.spacing;t++)for(const side of [1,-1]){const lx=x+my*t*side,ly=y+mx*t*side;if(within(lx,ly)&&(g.road[key(lx,ly)]||laidSet.has(key(lx,ly))))return false;}
    return true;
  };
  let cx=sx,cy=sy,connected=false;
  for(let step=0;step<length;step++){
    if(style.jog&&step>0&&r()<style.jog){
      const side=r()<.5?1:-1,jx=cx+dir[1]*side,jy=cy+dir[0]*side;
      if(ok(jx,jy,dir[1]*side,dir[0]*side)){const k=key(jx,jy);laid.push(k);laidSet.add(k);cx=jx;cy=jy;continue;}
    }
    const nx=cx+dir[0],ny=cy+dir[1];
    if(!within(nx,ny)||g.water[key(nx,ny)])break;
    if(g.road[key(nx,ny)]&&step>0){connected=true;break;}
    if(!ok(nx,ny,dir[0],dir[1]))break;
    const k=key(nx,ny);laid.push(k);laidSet.add(k);cx=nx;cy=ny;
  }
  if(laid.length<2&&!connected)return false;
  commit(city,g,laid,o,added);
  return true;
}

// ───────────────────────── main roads ─────────────────────────
class Heap{constructor(){this.a=[];}push(k,p){const a=this.a;a.push([p,k]);let i=a.length-1;while(i){const j=(i-1)>>1;if(a[j][0]<=a[i][0])break;[a[i],a[j]]=[a[j],a[i]];i=j;}}
  pop(){const a=this.a,top=a[0],last=a.pop();if(a.length){a[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<a.length&&a[l][0]<a[m][0])m=l;if(r<a.length&&a[r][0]<a[m][0])m=r;if(m===i)break;[a[i],a[m]]=[a[m],a[i]];i=m;}}return top[1];}
  get size(){return this.a.length;}}
// Meandering least-cost route over dry land. Eight-directional, so country
// roads run diagonally and curve instead of forming a right-angled cross;
// broad value noise makes them wander, and they hug riverbanks slightly.
const DIRS8=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]];
export function routeBetween(type,seed,from,to,avoid=null){
  const water=waterGrid(type),cost=new Float64Array(CELLS).fill(Infinity),prev=new Int32Array(CELLS).fill(-1),heap=new Heap();
  const start=key(from.x,from.y),goal=key(to.x,to.y);
  if(water[start]||water[goal])return null;
  const terrainCost=k=>{const x=kx(k),y=ky(k);let c=1+2.6*valueNoise(seed,x,y,13)+.8*valueNoise(seed+1,x,y,5);
    for(const [dx,dy] of DIRS4){if(within(x+dx*2,y+dy*2)&&water[key(x+dx*2,y+dy*2)]){c-=.6;break;}}
    if(avoid?.[k])c+=4;return Math.max(.4,c);};
  cost[start]=0;heap.push(start,0);
  while(heap.size){
    const k=heap.pop();if(k===goal)break;const x=kx(k),y=ky(k);
    for(const [dx,dy,len] of DIRS8){const nx=x+dx,ny=y+dy;if(!within(nx,ny))continue;const n=key(nx,ny);if(water[n])continue;
      // No cutting diagonally between two water cells.
      if(dx&&dy&&(water[key(x+dx,y)]||water[key(x,y+dy)]))continue;
      const c=cost[k]+terrainCost(n)*len;if(c<cost[n]){cost[n]=c;prev[n]=k;heap.push(n,c+Math.hypot(nx-to.x,ny-to.y));}}
  }
  if(cost[goal]===Infinity)return null;
  const path=[];for(let k=goal;k!==-1;k=prev[k])path.push(k);
  return path.reverse();
}
// Street cells for a path: a diagonal step also claims a corner cell so the
// street network stays connected cell-to-cell.
export function pathCells(type,path){
  const water=waterGrid(type),out=[];
  for(let i=0;i<path.length;i++){
    if(i){const a=path[i-1],b=path[i],ax=kx(a),ay=ky(a),bx=kx(b),by=ky(b);
      if(ax!==bx&&ay!==by){const c1=key(bx,ay),c2=key(ax,by);out.push(!water[c1]?c1:c2);}}
    out.push(path[i]);
  }
  return out;
}
function edgeLand(type,side,along){
  const water=waterGrid(type);
  for(let off=0;off<40;off++)for(const s of [1,-1]){
    const v=along+off*s;
    const p=side==='N'?{x:v,y:0}:side==='S'?{x:v,y:H-1}:side==='W'?{x:0,y:v}:{x:W-1,y:v};
    if(within(p.x,p.y)&&p.x>=0&&!water[key(p.x,p.y)]&&(side==='N'||side==='S'?v>2&&v<W-3:v>2&&v<H-3))return p;
  }
  return null;
}
// Country roads from the founding point to the edges of the map: the routes
// along which a medieval town first grows. Up to three, at least two.
export function layMainRoads(city,r){
  const o=city.origin,sides=['N','S','W','E'];
  for(let i=sides.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[sides[i],sides[j]]=[sides[j],sides[i]];}
  const routes=[];
  for(const side of sides){
    if(routes.length>=3)break;
    const along=side==='N'||side==='S'?clamp(Math.round(o.x+(r()-.5)*36),3,W-4):clamp(Math.round(o.y+(r()-.5)*30),3,H-4);
    const target=edgeLand(city.type,side,along);if(!target)continue;
    const path=routeBetween(city.type,city.seed+routes.length*7919,o,target);
    if(path&&path.length>4)routes.push({side,path});
  }
  return routes;
}
export function addRoute(city,path,year,cls='main'){
  const index=new Map(city.roads.map((r,i)=>[Number.isFinite(r.x)?key(r.x,r.y):-1,i]));
  for(const k of pathCells(city.type,path)){const i=index.get(k);
    if(i===undefined){city.roads.push({x:kx(k),y:ky(k),born:year,pattern:cls,cls});index.set(k,city.roads.length-1);}
    else if(cls==='main'&&roadClass(city.roads[i])==='minor')city.roads[i]={...city.roads[i],cls:'main'};
  }
  city.routes=[...(city.routes||[]),{cls,born:year,cells:path.map(k=>[kx(k),ky(k)])}];
}

// ───────────────────────── public works ─────────────────────────
// The dry land reachable from the founding point without crossing water: the
// side of the river (or lake) the old town stands on. Walls stay on this side.
const componentCache=new Map();
export function homeLand(type,origin){
  const id=`${type}:${origin.x},${origin.y}`;if(componentCache.has(id))return componentCache.get(id);
  const water=waterGrid(type),seen=new Uint8Array(CELLS),start=key(origin.x,origin.y),queue=[start];seen[start]=1;
  for(let i=0;i<queue.length;i++){const k=queue[i];for(const [dx,dy] of DIRS4){const x=kx(k)+dx,y=ky(k)+dy;if(!within(x,y))continue;const n=key(x,y);if(!seen[n]&&!water[n]){seen[n]=1;queue.push(n);}}}
  componentCache.set(id,seen);return seen;
}
// v1.4 organic walls. A wall follows the outline of the built-up town: for
// each of 40 bearings from the founding point it reaches past 85% of the
// non-farm buildings in that direction, the outline is smoothed, and where it
// meets water it stops at the shore (an open waterfront, as at Amsterdam).
const WALL_RAYS=40;
export function fitWall(city,origin){
  const home=homeLand(city.type,origin),water=waterGrid(city.type),cx=origin.x+.5,cy=origin.y+.5;
  const sectors=Array.from({length:WALL_RAYS},()=>[]);
  for(const b of city.buildings||[]){if(b.type==='farm'||!home[key(Math.floor(b.x),Math.floor(b.y))])continue;
    const dx=b.x+.4-cx,dy=b.y+.4-cy,a=(Math.atan2(dy,dx)+Math.PI*2)%(Math.PI*2);sectors[Math.floor(a/(Math.PI*2)*WALL_RAYS)%WALL_RAYS].push(Math.hypot(dx,dy));}
  let radii=sectors.map(d=>{if(!d.length)return null;d.sort((a,b)=>a-b);return d[Math.min(d.length-1,Math.floor(d.length*.85))]+1.6;});
  const known=radii.filter(v=>v!=null),fallback=known.length?known.reduce((a,v)=>a+v,0)/known.length:5;
  radii=radii.map((v,i)=>{if(v!=null)return v;for(let o=1;o<WALL_RAYS;o++){const a=radii[(i+o)%WALL_RAYS],b=radii[(i-o+WALL_RAYS)%WALL_RAYS];if(a!=null||b!=null)return ((a??b)+(b??a))/2;}return fallback;});
  for(let pass=0;pass<3;pass++)radii=radii.map((v,i)=>(radii[(i+WALL_RAYS-1)%WALL_RAYS]+2*v+radii[(i+1)%WALL_RAYS])/4);
  radii=radii.map(v=>clamp(v,4,32));
  const points=radii.map((r,i)=>{
    const a=(i+.5)/WALL_RAYS*Math.PI*2,ux=Math.cos(a),uy=Math.sin(a);
    // Walk out along the bearing; stop at the shore.
    for(let t=.5;t<=r;t+=.35){const x=cx+ux*t,y=cy+uy*t,k=key(Math.floor(x),Math.floor(y));if(!within(Math.floor(x),Math.floor(y))||water[k]){const s=Math.max(1.5,t-.35);return [Math.round((cx+ux*s)*100)/100,Math.round((cy+uy*s)*100)/100,1];}}
    return [Math.round((cx+ux*r)*100)/100,Math.round((cy+uy*r)*100)/100,0];
  });
  const r=Math.round(radii.reduce((a,v)=>a+v,0)/radii.length*10)/10;
  return {cx,cy,r,points};
}
// Outline of a wall or ring; walls saved before v1.4 were circles.
export function wallPolygon(w){
  if(Array.isArray(w?.points)&&w.points.length>=3)return w.points;
  const n=WALL_RAYS;return Array.from({length:n},(_,i)=>{const a=(i+.5)/n*Math.PI*2;return [w.cx+w.r*Math.cos(a),w.cy+w.r*Math.sin(a),0];});
}
export function insideWall(w,x,y){
  const p=wallPolygon(w);let inside=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}
  return inside;
}
// Built segments of the outline: everything except shore-to-shore stretches.
export function wallSegments(w){
  const p=wallPolygon(w),out=[];
  for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(a[2]&&b[2])continue;out.push([a,b]);}
  return out;
}
export function wallLength(w){return wallSegments(w).reduce((s,[a,b])=>s+Math.hypot(b[0]-a[0],b[1]-a[1]),0);}
// Cells crossed by the built outline (4-connected).
export function wallCells(w){
  const out=new Set();
  for(const [a,b] of wallSegments(w)){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*3)+1;let last=null;
    for(let i=0;i<=n;i++){const x=Math.floor(a[0]+(b[0]-a[0])*i/n),y=Math.floor(a[1]+(b[1]-a[1])*i/n);if(!within(x,y))continue;
      if(last&&last.x!==x&&last.y!==y&&within(x,last.y))out.add(key(x,last.y));out.add(key(x,y));last={x,y};}}
  return out;
}
// Cells along a ring (4-connected), skipping water and existing buildings.
export function ringCells(city,g,ring,home=null){
  const out=[];
  for(const k of wallCells(ring))if(!g.water[k]&&!g.occ[k]&&(!home||home[k]))out.push(k);
  return out;
}
// A straight crossing over water from a clicked bank or water cell.
export function findBridge(type,g,x,y,maxSpan=12){
  const water=waterGrid(type);let best=null;
  for(const [dx,dy] of [[1,0],[0,1]]){
    let sx=x,sy=y;
    if(!within(x,y))continue;
    if(!water[key(x,y)]){
      // Clicked on a bank: step onto adjacent water along this axis.
      if(within(x+dx,y+dy)&&water[key(x+dx,y+dy)]){sx=x+dx;sy=y+dy;}
      else if(within(x-dx,y-dy)&&water[key(x-dx,y-dy)]){sx=x-dx;sy=y-dy;}
      else continue;
    }
    let ax=sx,ay=sy;while(within(ax-dx,ay-dy)&&water[key(ax-dx,ay-dy)]){ax-=dx;ay-=dy;}
    let bx=sx,by=sy;while(within(bx+dx,by+dy)&&water[key(bx+dx,by+dy)]){bx+=dx;by+=dy;}
    const a={x:ax-dx,y:ay-dy},b={x:bx+dx,y:by+dy};
    if(!within(a.x,a.y)||!within(b.x,b.y))continue;
    const cells=[];for(let cx=ax,cy=ay;;cx+=dx,cy+=dy){cells.push(key(cx,cy));if(cx===bx&&cy===by)break;}
    if(cells.length>maxSpan)continue;
    if(!best||cells.length<best.cells.length)best={cells,ends:[a,b],axis:dx?'h':'v'};
  }
  return best;
}
