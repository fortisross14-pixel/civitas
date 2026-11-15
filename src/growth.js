// CIVITAS v1.1 — organic urban growth.
// Main roads link the founding point to the outside world. Minor lanes sprout
// from existing streets, drawn toward zoned land but free to wander anywhere
// within the city's reach. Buildings need street access; zoned plots are
// preferred, while modest informal growth fills unzoned land beside streets.
// Pure functions over plain data. Callers pass a seeded `r()` for determinism.
import {agePattern} from './ages.js';
import {W,H,CELLS,DIRS4,within,key,kx,ky,clamp,waterGrid,footprint,valueNoise,relief,STEEP,FLOOD_UNTIL} from './geo.js';

export const ROAD_CODE={minor:1,square:1,main:2,bridge:3,ring:4,boulevard:4};
export const roadClass=r=>r?.cls||(r?.pattern==='boulevard'?'boulevard':'minor');
export function patternFor(year){return agePattern(year);}
// Street character by era: medieval lanes are short and wander; planned eras
// lay longer straight streets with wider blocks between parallel roads.
//   slope/climb  how strongly a street shuns steep ground and changes of level
//                (a high climb cost makes a lane follow the contour)
//   turn         cost of a bend: low for winding lanes, high for surveyed streets
const LANE={
  organic:{min:4,span:5,spacing:2,slope:1.6,climb:2.6,turn:.55,wobble:.7},
  regular:{min:5,span:7,spacing:3,slope:1.1,climb:1.2,turn:2.4,wobble:0},
  industrial:{min:6,span:8,spacing:3,slope:1,climb:1,turn:4,wobble:0},
  modern:{min:8,span:9,spacing:4,slope:1,climb:1,turn:3,wobble:0}};
// v2.7 block depth: the clear ground kept between two parallel streets of an
// Age (parcels). Medieval blocks are two plots deep, back to back; planned
// blocks widen, and their middles stay open as courts.
export const BLOCK_GAP={organic:2,regular:3,industrial:5,modern:7};
const RD_MAX=8;
// Landmarks that open a square before their door; the grand ones get a deeper square and four streets.
const SQUARE_KINDS=new Set(['chapel','shrine','monastery','cathedral','town_hall','guildhall','station','transit_hub','grand_exchange','palace_muses','museum','library','great_university','university','civic_center','monument']);
const GRAND_KINDS=new Set(['cathedral','town_hall','station','transit_hub','grand_exchange','market','great_university']);
const NO_NUCLEUS=new Set(['boulevard','garden','waterworks','powerworks']);

// ───────────────────────── grids ─────────────────────────
// One pass builds every lookup the monthly growth step needs (typed arrays).
export function buildGrids(city){
  const water=waterGrid(city.type),occ=new Uint8Array(CELLS),road=new Uint8Array(CELLS),access=new Uint8Array(CELLS),near=new Uint8Array(CELLS),front=new Uint8Array(CELLS),town=new Uint8Array(CELLS);
  // nearWater: within two cells of water (mills and dye works before steam).
  const nearWater=new Uint8Array(CELLS);for(let k=0;k<CELLS;k++)if(water[k])around(k,2,n=>{nearWater[n]=1;});
  const rl=relief(city.type,city.seed);
  // rd: distance (in parcels, either axis) to the nearest street, capped. square: paved open cells.
  // pull: 1 beside a landmark, fading to 0 six parcels away (the nucleus effect).
  const g={water,occ,road,access,near,town,front,nearWater,roadKeys:[],slope:rl.slope,height:rl.height,flood:rl.flood,steep:rl.steep,
    rd:new Uint8Array(CELLS).fill(RD_MAX),square:new Uint8Array(CELLS),pull:new Float32Array(CELLS),landmarks:[],seed:city.seed|0};
  for(const b of city.buildings||[]){const f=footprint(b);for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++)if(within(x,y))markBuilding(g,key(x,y),b.type==='farm');
    if(b.special&&!b.vacant&&!NO_NUCLEUS.has(b.special)&&within(f.x,f.y))addLandmark(g,{id:b.id,kind:b.special,x:f.x,y:f.y,size:Math.max(f.w,f.h)});}
  for(const r of city.roads||[])if(Number.isFinite(r.x)&&Number.isFinite(r.y)&&within(r.x,r.y))markRoad(g,key(r.x,r.y),roadClass(r));
  // v2.4: a linear park on an old wall line stays open land.
  for(const w of city.walls||[])if(w.state==='park')for(const k of w.parkCells||[])g.occ[k]=1;
  return g;
}
function addLandmark(g,lm){
  g.landmarks.push(lm);const cx=lm.x+lm.size/2-.5,cy=lm.y+lm.size/2-.5,rad=6+lm.size;
  for(let y=Math.max(0,Math.floor(cy-rad));y<=Math.min(H-1,Math.ceil(cy+rad));y++)for(let x=Math.max(0,Math.floor(cx-rad));x<=Math.min(W-1,Math.ceil(cx+rad));x++){
    const v=1-Math.max(0,Math.hypot(x-cx,y-cy)-lm.size/2)/rad,k=key(x,y);if(v>g.pull[k])g.pull[k]=v;}
}
function around(k,radius,fn){const x0=kx(k),y0=ky(k);for(let y=Math.max(0,y0-radius);y<=Math.min(H-1,y0+radius);y++)for(let x=Math.max(0,x0-radius);x<=Math.min(W-1,x0+radius);x++)fn(key(x,y));}
export function markRoad(g,k,cls='minor'){
  if(!g.road[k]){g.roadKeys.push(k);
    const x0=kx(k),y0=ky(k);
    for(let y=Math.max(0,y0-RD_MAX+1);y<=Math.min(H-1,y0+RD_MAX-1);y++)for(let x=Math.max(0,x0-RD_MAX+1);x<=Math.min(W-1,x0+RD_MAX-1);x++){
      const d=Math.max(Math.abs(x-x0),Math.abs(y-y0)),n=key(x,y);if(d<g.rd[n])g.rd[n]=d;}}
  g.road[k]=Math.max(g.road[k],ROAD_CODE[cls]||1);
  if(cls==='square')g.square[k]=1;
  // Parcels up to two cells deep behind a street have access (a house plus yard).
  around(k,2,n=>{g.access[n]=1;});
  if(cls==='main')around(k,1,n=>{g.front[n]=1;});
}
// near: within two parcels of any building; town: of a building that is not a farm (farms do not ask for streets).
export function markBuilding(g,k,farm=false){g.occ[k]=1;around(k,2,n=>{g.near[n]=1;if(!farm)g.town[n]=1;});}
const free=(g,k)=>!g.water[k]&&!g.occ[k]&&!g.road[k];
// Zoned land no street serves yet. Town plots need a street within two parcels;
// farmland only a track within five, so fields are not cut up into blocks.
const FARM_REACH=5;
const unserved=(g,zoneGrid,k)=>zoneGrid[k]!=null&&free(g,k)&&!g.steep[k]&&(zoneGrid[k]==='farm'?g.rd[k]>FARM_REACH:!g.access[k]);

// ───────────────────────── parcels ─────────────────────────
// Returns the best parcel for a new building of `type`, or null when no parcel
// with street access exists (the caller then asks for more streets).
export function pickParcel(g,zoneGrid,type,r,o){
  // Informal growth: homes, shops and fields anywhere near town; parish churches
  // before 1850; small workshops in a city whose character leans to industry.
  const informalOK=o.allowInformal&&(type==='res'||type==='trade'||type==='farm'||(type==='civic'&&o.informalCivic)||(type==='craft'&&o.informalCraft));
  const f=o.fields,wet=(o.year||0)<FLOOD_UNTIL,urban=type==='res'||type==='trade'||type==='hotel';
  let best=null,bestScore=-Infinity;
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
    const k=key(x,y);
    if(!free(g,k)||!(g.access[k]||(type==='farm'&&g.rd[k]<=FARM_REACH)))continue;
    const z=zoneGrid[k],d=Math.hypot(x-o.origin.x,y-o.origin.y),pull=g.pull[k];
    let base;
    if(z===type)base=3;
    else if(z==null&&informalOK){
      // Informal growth hugs existing development, or lines a main road near town.
      // A landmark is a nucleus of its own, however far from the old town it stands.
      if(d>o.reach+4&&pull<.35)continue;
      if(!g.near[k]&&!(g.front[k]&&d<=o.reach))continue;
      // v2.7: the floodplain stays meadow and field until the river is embanked;
      // nobody builds unbidden on a steep bank (farms never do).
      if(g.flood[k]&&wet&&type!=='farm')continue;
      if(g.steep[k]&&type!=='res')continue;
      base=0;
    }else continue;
    let roads=0,touching=0,onSquare=0;
    for(const [dx,dy] of DIRS4){const n=key(x+dx,y+dy);if(g.road[n]){roads++;if(g.square[n])onSquare=1;}if(g.occ[n])touching++;}
    // Plots on a street come first, so blocks line their streets; backlots fill later.
    let score=base+roads*.28+touching*.11+(type==='farm'?d*.02:-d*.022)+r()*.23-(roads?0:.45);
    if(type==='trade'&&g.front[k])score+=.5;
    // Freshly designated districts fill first: the player just asked for them.
    if(base===3&&o.zoneOrder){const i=o.zoneOrder[k];if(i)score+=Math.max(0,1.2-(o.year-(o.zoneYears?.[i-1]??o.year))*.03);}
    if((type==='res'||type==='trade')&&o.walls?.some(w=>insideWall(w,x+.5,y+.5)))score+=.3;
    // v2.7 nucleus: frontage near a landmark fills first, its square first of all.
    if(urban)score+=pull*pull*1.3+onSquare*.6;
    // v2.7 terrain: steep ground is built last; farms and (before steam) mills
    // like the valley floor; from the Renaissance the rich climb the hill.
    const sl=Math.min(2,g.slope[k]/STEEP);
    if(type==='farm')score+=(g.flood[k]?.5:0)-sl*.5;
    else{score-=sl*(type==='craft'?.7:.35)+(g.flood[k]&&wet?.8:0);
      if(type==='res'&&o.year>=1500)score+=Math.min(.35,g.height[k]*.6);
      else if(type==='civic')score+=Math.min(.4,g.height[k]*.8);}
    // Location: homes seek prestige and services and shun smoke; shops seek
    // markets and main roads; workshops avoid fine quarters and like water
    // before steam; churches go where no parish reaches yet.
    if(f){
      const pol=Math.min(2,f.pollution[k]*(f.homeShield??1)),pre=Math.min(2,f.prestige[k]),ser=Math.min(2,f.service[k]),tra=Math.min(2,f.trade[k]);
      // Growth pull: parishes, schools and walls draw homes; markets and shops draw shops.
      const hp=Math.min(2,f.homePull?.[k]||0),sp=Math.min(2,f.shopPull?.[k]||0);
      if(type==='res')score+=pre*.5-pol*.6+(ser>=.35?.15:0)+hp*.85;
      else if(type==='trade')score+=tra*.4+pre*.2+sp*1.1;
      else if(type==='hotel')score+=pre*.6+tra*.2+sp*.3;
      else if(type==='craft')score+=-pre*.4+(o.year<1850&&g.nearWater?.[k]?.3:0);
      else if(type==='civic')score+=-ser*.6;
    }
    if(score>bestScore){bestScore=score;best={x,y,informal:z!==type};}
  }
  return best;
}

// ───────────────────────── streets ─────────────────────────
// v2.7 How streets grow. Every new street is a least-cost path over the
// ground (see trace): it shuns steep cells, pays for every change of level
// (so medieval lanes follow the contour), pays to run close beside another
// street (so blocks keep their depth) and, in surveyed Ages, pays to bend or
// to leave the city-wide lattice. Three kinds of work, in this order:
//   1. landmarks  a landmark gets a square before its door, a street to the
//                 network, then streets out of its other sides (a nucleus);
//   2. zones      a street into the heart of the newest zoned land no street serves;
//   3. lanes      where frontage is running out beside existing buildings, a
//                 lane continues a dead end or leaves a street at right angles,
//                 and joins the first street it meets (blocks, not stubs).
// No street is laid where nobody builds: lanes start only beside buildings or
// beside zoned land.
export function laneStyle(pattern){return LANE[pattern]||LANE.organic;}
// v2.3 planned streets. From 1700 new streets snap to a city-wide lattice
// (lines every `step` cells, offset by the city seed): each new lane runs
// straight along a lattice line, so later quarters grow as grids of parallel
// streets beside the winding medieval core. Larger blocks in later eras.
// v2.4: ensanche blocks widen with time; the middle of a deep block stays open (a courtyard).
export const LATTICE={regular:{step:4,from:1700,span:10},industrial:{step:6,span:14,avenue:3},modern:{step:8,span:16,avenue:2}};
export function latticeFor(o){const l=LATTICE[o.pattern];if(!l||o.year<(l.from??0))return null;return l;}
const onLine=(v,off,step)=>((v-off)%step+step)%step===0;
const latticeOf=(city,o)=>{const lat=o.lattice===false?null:latticeFor(o);return lat?{...lat,ox:Math.abs(city.seed|0)%lat.step,oy:Math.abs((city.seed|0)>>3)%lat.step}:null;};
export function growRoads(city,g,zoneGrid,r,actions,o){
  const added=[];
  // A landmark is served as soon as it stands, whether or not the town asked for streets this month.
  let budget=actions;
  if(serveLandmark(city,g,zoneGrid,r,o,added))budget--;
  for(let a=0;a<budget;a++){
    const zs=zoneState(g,zoneGrid);g.hungry=zs.ready<READY_FRONTAGE;
    const reached=zs.waiting>0&&r()<.65?reachZone(city,g,zoneGrid,r,o,added):false;
    if(reached)continue;
    // A rejected lane (it would crowd another street) is retried from another point.
    if(o.lanes!==false||zs.waiting>0&&g.hungry)for(let t=0;t<3;t++)if(branchLane(city,g,zoneGrid,r,o,added))break;
  }
  return added;
}
// Zoned land waiting for streets, and how much street frontage already stands ready in zones.
function zoneState(g,zoneGrid){let waiting=0,ready=0;
  for(let k=0;k<CELLS;k++){const z=zoneGrid[k];if(z==null||!free(g,k))continue;
    if(unserved(g,zoneGrid,k))waiting++;else if(z!=='farm'&&g.rd[k]===1)ready++;}
  return {waiting,ready};}
// With this much open frontage in zones, new streets wait for the builders
// (a zone no street touches yet still gets its first street at once).
const READY_FRONTAGE=18;
function commit(city,g,keys,o,added,cls='minor',rank=null){
  for(const k of keys){if(g.road[k])continue;const road={x:kx(k),y:ky(k),born:o.year,pattern:o.pattern,cls};if(rank)road.rank=rank;city.roads.push(road);added.push(road);markRoad(g,k,cls);}
}
const roadSides=(g,k)=>{const x=kx(k),y=ky(k);let n=0;for(const [dx,dy] of DIRS4)if(within(x+dx,y+dy)&&g.road[key(x+dx,y+dy)])n++;return n;};

// Least-cost street over open ground. Starts on the free cells `sources`
// and ends at the first cell for which goal(k) is true: a street cell (the
// path stops beside it) or an open cell (the path ends on it, a dead end).
// The state is (cell, heading), so bends can be priced. Returns the cells to
// pave, source first, or null.
const T_COST=new Float32Array(CELLS*4),T_PREV=new Int32Array(CELLS*4),T_STAMP=new Uint32Array(CELLS*4);let traceRun=0;
function trace(g,zoneGrid,o,sources,goal,opt={}){
  const style=laneStyle(o.pattern),gap=BLOCK_GAP[o.pattern]||2,lat=opt.lat||null,box=opt.box,wet=(o.year||0)<FLOOD_UNTIL;
  const run=++traceRun,heap=new Heap(),limit=opt.limit||60;
  for(const k of sources){if(!free(g,k)||g.steep[k])continue;for(let d=0;d<4;d++){const s=k*4+d;T_COST[s]=0;T_PREV[s]=-1;T_STAMP[s]=run;heap.push(s,0);}}
  let end=-1;
  while(heap.size){
    const s=heap.pop(),k=s>>2,pd=s&3,c0=T_COST[s];if(c0>limit)break;
    if(goal(k)&&T_PREV[s]!==-1){end=s;break;}
    const x=kx(k),y=ky(k);
    for(let d=0;d<4;d++){
      const nx=x+DIRS4[d][0],ny=y+DIRS4[d][1];if(nx<1||ny<1||nx>W-2||ny>H-2)continue;
      if(box&&(nx<box.x0||ny<box.y0||nx>box.x1||ny>box.y1))continue;
      if(opt.ahead&&(nx-opt.ahead.x)*opt.ahead.dx+(ny-opt.ahead.y)*opt.ahead.dy<1)continue;
      const n=key(nx,ny);
      if(g.road[n]){ // a street ends the path, if it is one the caller accepts
        if(g.road[n]===ROAD_CODE.bridge||!goal(n))continue;
        const c=c0+(d===pd?0:style.turn*.5);
        const t=n*4+d;if(T_STAMP[t]!==run||c<T_COST[t]){T_STAMP[t]=run;T_COST[t]=c;T_PREV[t]=s;heap.push(t,c);}
        continue;
      }
      if(g.water[n]||g.occ[n]||g.steep[n])continue;
      const z=zoneGrid[n];
      if(!opt.anywhere&&z==null&&g.pull[n]<.3&&Math.hypot(nx-o.origin.x,ny-o.origin.y)>o.reach)continue;
      let c=1+style.slope*g.slope[n]/STEEP+style.climb*Math.abs(g.height[n]-g.height[k])/STEEP;
      if(g.rd[n]<=gap){c+=1.3*(gap+1-g.rd[n]);
        // A street running alongside (not one being left or met head-on) costs much more.
        if(beside(g,nx,ny,d,gap))c+=4;}
      if(d!==pd)c+=style.turn;
      if(lat&&!onLine(nx,lat.ox,lat.step)&&!onLine(ny,lat.oy,lat.step))c+=6;
      if(g.flood[n]&&wet)c+=z==null?3:1;
      if(z!=null)c-=.25;
      // A street on the bank itself becomes a quay.
      if(rl1(g,n))c-=.5;
      if(style.wobble)c+=style.wobble*valueNoise(g.seed+31,nx,ny,4);
      if(opt.tip===n)c+=opt.tipCost||0;
      c=c0+Math.max(.2,c);
      const t=n*4+d;if(T_STAMP[t]!==run||c<T_COST[t]){T_STAMP[t]=run;T_COST[t]=c;T_PREV[t]=s;heap.push(t,c);}
    }
  }
  if(end<0)return null;
  const path=[];for(let s=end;s!==-1;s=T_PREV[s])path.push(s>>2);
  path.reverse();const endRoad=!!g.road[path.at(-1)];
  return {cells:endRoad?path.slice(0,-1):path,joined:endRoad};
}
const rl1=(g,k)=>g.nearWater[k]&&(g.water[k+1]||g.water[k-1]||g.water[k+W]||g.water[k-W]);
// Would this street crowd another? Cells past its first `gap` (and, when it
// joins a street, before its last `gap`) must keep the Age's block depth.
function crowded(g,cells,joined,gap,allow=1){
  let n=0;const last=joined?cells.length-gap:cells.length;
  for(let i=gap;i<last;i++)if(g.rd[cells[i]]<=gap)n++;
  // …and no cell at all may have a street running alongside within that depth.
  for(let i=0;i<cells.length;i++){const a=cells[Math.max(0,i-1)],b=cells[Math.min(cells.length-1,i+1)];
    const d=kx(b)!==kx(a)?0:2;if(a!==b&&beside(g,kx(cells[i]),ky(cells[i]),d,gap))n++;}
  return n>allow;
}
// Is there a street within `gap` parcels to either side of a street heading in direction d (0,1: along x; 2,3: along y)?
function beside(g,x,y,d,gap){
  const px=d<2?0:1,py=d<2?1:0;
  for(let t=1;t<=gap;t++)for(const s of [1,-1]){const lx=x+px*t*s,ly=y+py*t*s;if(within(lx,ly)&&g.road[key(lx,ly)]&&!g.square[key(lx,ly)])return true;}
  return false;
}

// ── 1. landmarks ──
// The cells of a landmark, its square, and the ring of cells around both.
function landmarkPlace(g,lm){
  const cells=[];for(let y=lm.y;y<lm.y+lm.size;y++)for(let x=lm.x;x<lm.x+lm.size;x++)cells.push(key(x,y));
  // Its square: paved cells touching it.
  const sq=[],seen=new Set(cells);
  for(const k of cells)for(const [dx,dy] of DIRS4){const x=kx(k)+dx,y=ky(k)+dy;if(!within(x,y))continue;const n=key(x,y);if(g.square[n]&&!seen.has(n)){seen.add(n);sq.push(n);}}
  for(let i=0;i<sq.length;i++)for(const [dx,dy] of DIRS4){const x=kx(sq[i])+dx,y=ky(sq[i])+dy;if(!within(x,y))continue;const n=key(x,y);if(g.square[n]&&!seen.has(n)&&sq.length<8){seen.add(n);sq.push(n);}}
  let x0=W,y0=H,x1=0,y1=0;for(const k of seen){x0=Math.min(x0,kx(k));x1=Math.max(x1,kx(k));y0=Math.min(y0,ky(k));y1=Math.max(y1,ky(k));}
  return {cells,square:sq,all:seen,x0,y0,x1,y1};
}
// Where the square goes: the side that is open ground and nearest a street,
// facing the town when sides tie.
function squareFor(g,lm,o){
  const depth=GRAND_KINDS.has(lm.kind)?2:1;let best=null,bestScore=-Infinity;
  for(const [dx,dy] of DIRS4){
    const cells=[];let street=false;
    for(let d=1;d<=depth;d++){const row=[];let ok=true;
      for(let i=0;i<lm.size&&ok;i++){const x=dx?(dx>0?lm.x+lm.size-1+d:lm.x-d):lm.x+i,y=dy?(dy>0?lm.y+lm.size-1+d:lm.y-d):lm.y+i;
        if(x<1||y<1||x>W-2||y>H-2){ok=false;break;}const k=key(x,y);
        if(g.water[k]||g.occ[k]||g.steep[k])ok=false;else if(g.road[k])street=true;else row.push(k);}
      // A blocked row ends the square; a row that is already street means the square has reached one.
      if(!ok||(d>1&&!row.length))break;
      cells.push(...row);}
    if(!cells.length)continue;
    const mx=lm.x+lm.size/2-.5+dx*(lm.size/2+.5),my=lm.y+lm.size/2-.5+dy*(lm.size/2+.5);
    const score=(street?3:0)-g.rd[cells[0]]*.4-Math.hypot(mx-o.origin.x,my-o.origin.y)*.05+cells.length*.2;
    if(score>bestScore){bestScore=score;best=cells;}
  }
  return best||[];
}
function serveLandmark(city,g,zoneGrid,r,o,added){
  for(const lm of g.landmarks){
    if(lm.done)continue;
    let place=landmarkPlace(g,lm);
    // a. The square.
    if(!lm.squared){lm.squared=true;
      if(SQUARE_KINDS.has(lm.kind)&&!place.square.length){const cells=squareFor(g,lm,o);if(cells.length){commit(city,g,cells,o,added,'square');return true;}}}
    // Streets touching the landmark or its square, by side of their bounding box.
    const sides=[0,0,0,0],ring=[];let touching=false;
    for(let y=place.y0-1;y<=place.y1+1;y++)for(let x=place.x0-1;x<=place.x1+1;x++){
      if(!within(x,y))continue;const k=key(x,y);if(place.all.has(k))continue;
      const edge=[x>place.x1,x<place.x0,y>place.y1,y<place.y0];
      if(g.road[k]&&!g.square[k]){edge.forEach((e,i)=>{if(e)sides[i]=1;});
        if(DIRS4.some(([dx,dy])=>within(x+dx,y+dy)&&place.all.has(key(x+dx,y+dy))))touching=true;}
      else if(free(g,k)&&edge.filter(Boolean).length===1&&DIRS4.some(([dx,dy])=>within(x+dx,y+dy)&&place.all.has(key(x+dx,y+dy))))ring.push({k,side:edge.indexOf(true)});
    }
    // b. A street from the door (the square, when there is one) to the network.
    if(!touching){
      const doors=ring.filter(c=>!place.square.length||DIRS4.some(([dx,dy])=>g.square[key(kx(c.k)+dx,ky(c.k)+dy)])).map(c=>c.k);
      const out=g.roadKeys.length?trace(g,zoneGrid,o,doors.length?doors:ring.map(c=>c.k),k=>!!g.road[k]&&!place.all.has(k),{anywhere:true,limit:140,lat:latticeOf(city,o)}):null;
      if(out&&out.cells.length){commit(city,g,out.cells,o,added,'minor','street');return true;}
      if(!out){lm.done=true;continue;}
    }
    // c. Streets out of the other sides, toward the nearest street that way (or open ground).
    const want=GRAND_KINDS.has(lm.kind)?4:3;
    if(sides.reduce((a,b)=>a+b,0)<want){
      const tried=lm.tried||(lm.tried=[0,0,0,0]);let laid=false;
      for(let side=0;side<4&&!laid;side++){
        if(sides[side]||tried[side])continue;tried[side]=1;
        const starts=ring.filter(c=>c.side===side).map(c=>c.k);if(!starts.length)continue;
        const [dx,dy]=DIRS4[side],sx=kx(starts[starts.length>>1]),sy=ky(starts[starts.length>>1]);
        // Aim for open ground five parcels out; any street met on the way ends the radial sooner.
        let tip=-1;for(let t=5;t>=2;t--){const x=sx+dx*t,y=sy+dy*t;if(x<1||y<1||x>W-2||y>H-2)continue;const k=key(x,y);if(free(g,k)&&!g.steep[k]){tip=k;break;}}
        const ahead={x:sx-dx,y:sy-dy,dx,dy};
        const out=trace(g,zoneGrid,o,[starts[starts.length>>1]],k=>k===tip||(!!g.road[k]&&!g.square[k]&&!place.all.has(k)&&Math.max(Math.abs(kx(k)-sx),Math.abs(ky(k)-sy))>=2),
          {anywhere:true,limit:30,ahead,tip,tipCost:4,box:{x0:sx-9,y0:sy-9,x1:sx+9,y1:sy+9}});
        if(out&&out.cells.length>=2&&!crowded(g,out.cells,out.joined,Math.min(2,BLOCK_GAP[o.pattern]||2),2)){commit(city,g,out.cells,o,added,'minor','street');laid=true;}
      }
      if(laid)return true;
    }
    lm.done=true;
  }
  return false;
}

// ── 2. zoned land ──
// A street into the densest pocket of unserved land in the newest zone that has any.
function reachZone(city,g,zoneGrid,r,o,added){
  if(!g.roadKeys.length)return false;
  let newest=-1;const pool=[];
  for(let k=0;k<CELLS;k++){if(!unserved(g,zoneGrid,k))continue;
    const i=o.zoneOrder?.[k]||0;if(i>newest){newest=i;pool.length=0;}if(i===newest)pool.push(k);}
  if(!pool.length)return false;
  // Enough frontage stands open: only a zone no street has reached yet is served now.
  if(!g.hungry){let touched=false;for(let k=0;k<CELLS&&!touched;k++)if(zoneGrid[k]!=null&&(o.zoneOrder?.[k]||0)===newest&&g.rd[k]<=2)touched=true;if(touched)return false;}
  const lat=latticeOf(city,o);
  // Sample the pool; the best target has the most unserved zoned land around it and, in a grid Age, lies on a lattice line.
  let target=-1,bestScore=-Infinity;const stride=Math.max(1,Math.floor(pool.length/36)),start=Math.floor(r()*stride);
  for(let i=start;i<pool.length;i+=stride){const k=pool[i],x=kx(k),y=ky(k);
    if(lat&&!onLine(x,lat.ox,lat.step)&&!onLine(y,lat.oy,lat.step))continue;
    const score=lure(g,zoneGrid,x,y,3)-g.rd[k]*.3-g.slope[k]/STEEP*2+r()*2;
    if(score>bestScore){bestScore=score;target=k;}}
  if(target<0)target=pool[start];
  const out=trace(g,zoneGrid,o,[target],k=>!!g.road[k],{anywhere:true,limit:160,lat});
  if(!out||!out.cells.length)return false;
  const gap=BLOCK_GAP[o.pattern]||2;
  // Network → target; a long approach is laid a stretch at a time.
  const cells=out.cells.reverse(),keep=cells.slice(0,Math.min(cells.length,lat?lat.span+8:16));
  if(crowded(g,keep,false,gap,lat?2:1))return false;
  commit(city,g,keep,o,added,'minor','street');
  return keep.length>0;
}
function lure(g,zoneGrid,x0,y0,radius){let n=0;for(let y=Math.max(0,y0-radius);y<=Math.min(H-1,y0+radius);y++)for(let x=Math.max(0,x0-radius);x<=Math.min(W-1,x0+radius);x++)if(unserved(g,zoneGrid,key(x,y)))n++;return n;}
// Open plots on a street within three parcels: where they are plentiful, no new lane is wanted yet.
function frontage(g,x0,y0){let n=0;for(let y=Math.max(0,y0-3);y<=Math.min(H-1,y0+3);y++)for(let x=Math.max(0,x0-3);x<=Math.min(W-1,x0+3);x++){const k=key(x,y);if(g.rd[k]===1&&free(g,k))n++;}return n;}
function openBeyond(g,x0,y0){let n=0;for(let y=Math.max(0,y0-3);y<=Math.min(H-1,y0+3);y++)for(let x=Math.max(0,x0-3);x<=Math.min(W-1,x0+3);x++){const k=key(x,y);if(free(g,k)&&!g.access[k]&&!g.steep[k])n++;}return n;}

// ── 3. lanes ──
// A lane continuing a dead end, or leaving a street at right angles, where
// buildings (or zoned land) want more frontage.
function branchLane(city,g,zoneGrid,r,o,added){
  const n=g.roadKeys.length;if(!n)return false;
  const style=laneStyle(o.pattern),lat=latticeOf(city,o),gap=BLOCK_GAP[o.pattern]||2;
  let seed=-1,bestScore=-Infinity,seedTip=false;
  // Every street cell is a candidate (cheap tests first), so the frontier is never missed in a large town.
  for(let i=0;i<n;i++){
    const k=g.roadKeys[i];if(g.road[k]===ROAD_CODE.bridge)continue;
    if(!g.town[k]&&g.hungry===false)continue;
    const x=kx(k),y=ky(k),d=Math.hypot(x-o.origin.x,y-o.origin.y);
    if(lat&&!onLine(x,lat.ox,lat.step)&&!onLine(y,lat.oy,lat.step))continue;
    const l3=g.hungry===false?0:lure(g,zoneGrid,x,y,3);
    if(d>o.reach&&!l3&&g.pull[k]<.3)continue;
    // No streets to nowhere: someone must be building here, or the land must be zoned.
    const l5=g.hungry===false?0:lure(g,zoneGrid,x,y,5);
    if(!g.town[k]&&!l5)continue;
    const open=openBeyond(g,x,y);if(!open)continue;
    const tip=roadSides(g,k)===1;
    const score=l5*.5+open*.12-d*.03+g.pull[k]*1.5+(tip?1.2:0)+(g.town[k]?.6:0)-frontage(g,x,y)*.3+r()*.7;
    if(score>bestScore){bestScore=score;seed=k;seedTip=tip;}
  }
  if(seed<0)return false;
  const sx=kx(seed),sy=ky(seed);
  const horizontal=g.road[key(sx+1,sy)]||g.road[key(sx-1,sy)],vertical=g.road[key(sx,sy+1)]||g.road[key(sx,sy-1)];
  let dirs=horizontal&&!vertical?[[0,1],[0,-1]]:vertical&&!horizontal?[[1,0],[-1,0]]:DIRS4;
  // A dead end runs on the way it was going.
  let straight=null;
  if(seedTip)for(const [dx,dy] of DIRS4)if(g.road[key(sx-dx,sy-dy)]){straight=[dx,dy];dirs=DIRS4.filter(([a,b])=>!(a===-dx&&b===-dy));}
  // On the lattice: run along the lattice line through the seed.
  if(lat){const v=onLine(sx,lat.ox,lat.step),h=onLine(sy,lat.oy,lat.step);dirs=[...(v?[[0,1],[0,-1]]:[]),...(h?[[1,0],[-1,0]]:[])];}
  let dir=null,dirScore=-Infinity;
  for(const [dx,dy] of dirs){
    const fx=sx+dx,fy=sy+dy;if(fx<1||fy<1||fx>W-2||fy>H-2)continue;const fk=key(fx,fy);if(!free(g,fk)||g.steep[fk])continue;
    let ahead=0;for(let t=1;t<=8;t++)for(let s=-2;s<=2;s++){const x=sx+dx*t+dy*s,y=sy+dy*t+dx*s;if(!within(x,y))continue;const k=key(x,y);if(!free(g,k)||g.access[k])continue;
      ahead+=unserved(g,zoneGrid,k)?1:zoneGrid[k]==='farm'?0:.25+g.pull[k]*.3;if(g.steep[k])ahead-=.5;}
    const score=ahead+(straight&&straight[0]===dx&&straight[1]===dy?1.5:0)+r()*1.2;
    if(score>dirScore){dirScore=score;dir=[dx,dy];}
  }
  if(!dir||dirScore<.5)return false;
  const length=lat?style.min+Math.floor(r()*lat.span):style.min+Math.floor(r()*style.span);
  const usable=(x,y)=>{if(x<1||y<1||x>W-2||y>H-2)return false;const k=key(x,y);return free(g,k)&&!g.steep[k]&&(zoneGrid[k]!=null||g.pull[k]>=.3||Math.hypot(x-o.origin.x,y-o.origin.y)<=o.reach);};
  let cells=null,joined=false;
  if(lat){
    // A surveyed street: dead straight along its lattice line, to the first street it meets.
    cells=[];let x=sx,y=sy;
    for(let step=0;step<length+lat.step;step++){
      x+=dir[0];y+=dir[1];if(!within(x,y))break;const k=key(x,y);
      if(g.road[k]){joined=g.road[k]!==ROAD_CODE.bridge&&step>0;break;}
      if(!usable(x,y))break;
      // Past its length it only runs on if a street lies close ahead to join.
      if(step>=length){let meets=false;for(let t=1;t<=lat.step;t++){const ax=x+dir[0]*t,ay=y+dir[1]*t;if(!within(ax,ay))break;const a=key(ax,ay);if(g.road[a]){meets=true;break;}if(!free(g,a))break;}if(!meets)break;}
      // Keep a block's depth between parallel streets; never double a street.
      let side=false;for(let t=1;t<style.spacing&&!side;t++)for(const s of [1,-1]){const lx=x+dir[1]*t*s,ly=y+dir[0]*t*s;if(within(lx,ly)&&g.road[key(lx,ly)])side=true;}
      if(side)break;
      cells.push(k);
    }
    if(cells.length<2&&!(joined&&cells.length))return false;
  }else{
    // A lane: the cheapest way to a point `length` parcels on, ending early at any street it meets.
    let tip=-1;for(let t=length;t>=2;t--){if(usable(sx+dir[0]*t,sy+dir[1]*t)){tip=key(sx+dir[0]*t,sy+dir[1]*t);break;}}
    const far=k=>Math.max(Math.abs(kx(k)-sx),Math.abs(ky(k)-sy))>=gap+2;
    const out=trace(g,zoneGrid,o,[key(sx+dir[0],sy+dir[1])],k=>k===tip||(!!g.road[k]&&far(k)),
      {ahead:{x:sx,y:sy,dx:dir[0],dy:dir[1]},tip,tipCost:3.5,limit:length*4+12,box:{x0:sx-length-4,y0:sy-length-4,x1:sx+length+4,y1:sy+length+4}});
    if(!out||(out.cells.length<2&&!out.joined)||!out.cells.length)return false;
    if(crowded(g,out.cells,out.joined,gap,1))return false;
    cells=out.cells;joined=out.joined;
  }
  // Industrial and modern grids: every `avenue`-th lattice line is a wide avenue.
  const avenue=lat?.avenue&&(dir[0]===0?onLine(sx,lat.ox,lat.step*lat.avenue):onLine(sy,lat.oy,lat.step*lat.avenue));
  commit(city,g,cells,o,added,avenue?'main':'minor',avenue?null:cells.length<=2&&!joined?'alley':'lane');
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
export function routeBetween(type,seed,from,to,avoid=null,reliefSeed=seed){
  const water=waterGrid(type),cost=new Float64Array(CELLS).fill(Infinity),prev=new Int32Array(CELLS).fill(-1),heap=new Heap();
  const start=key(from.x,from.y),goal=key(to.x,to.y);
  if(water[start]||water[goal])return null;
  // v2.7: the ground decides. A road pays dearly for steep cells and for every
  // climb, so it keeps to valleys and saddles; it skirts the floodplain on the
  // first dry ground instead of crossing it.
  const rl=relief(type,reliefSeed);
  const terrainCost=(k,from)=>{const x=kx(k),y=ky(k),s=Math.min(3,rl.slope[k]/STEEP);
    let c=1+1.3*valueNoise(seed,x,y,13)+.5*valueNoise(seed+1,x,y,5)+2.2*s*s+3*Math.abs(rl.height[k]-rl.height[from])/STEEP;
    if(rl.flood[k])c+=1.4;else if(rl.shore[k]<=5)c-=.5;
    if(avoid?.[k])c+=4;return Math.max(.4,c);};
  cost[start]=0;heap.push(start,0);
  while(heap.size){
    const k=heap.pop();if(k===goal)break;const x=kx(k),y=ky(k);
    for(const [dx,dy,len] of DIRS8){const nx=x+dx,ny=y+dy;if(!within(nx,ny))continue;const n=key(nx,ny);if(water[n])continue;
      // No cutting diagonally between two water cells.
      if(dx&&dy&&(water[key(x+dx,y)]||water[key(x,y+dy)]))continue;
      const c=cost[k]+terrainCost(n,k)*len;if(c<cost[n]){cost[n]=c;prev[n]=k;heap.push(n,c+.4*Math.hypot(nx-to.x,ny-to.y));}}
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
    const path=routeBetween(city.type,city.seed+routes.length*7919,o,target,null,city.seed);
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
