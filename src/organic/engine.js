// CIVITAS v3.1 — the organic map. Grown year by year from what the player does
// (zones, landmark cards, walls, bridges) on a heightfield made from the game's
// own water, it draws the town in place of the old grid map. The economy still
// runs on the grid (src/sim.js); this module only reads the city.
// Engine code comes from prototypes/ages.html (one unit ≈ 4 m; K units per grid cell).
/* eslint-disable */
export function createOrganic(cfg){
'use strict';
const SEED=cfg.seed|0,WW=cfg.W,WH=cfg.H,K=cfg.K,Y0=1300;
let rs=((SEED+7)*2654435761>>>0)||1;const rnd=()=>{rs^=rs<<13;rs^=rs>>>17;rs^=rs<<5;return (rs>>>0)/4294967296;};
const hsh=(...v)=>{let n=SEED^0x9e3779b9;for(const x of v){n=Math.imul(n^(x|0),0x85ebca6b);n^=n>>>13;}return (n>>>0)/4294967296;};
const noise=(x,y,s,c=0)=>{const fx=x/s,fy=y/s,x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0,sm=t=>t*t*(3-2*t);
  const a=hsh(x0,y0,c)+(hsh(x0+1,y0,c)-hsh(x0,y0,c))*sm(tx),b=hsh(x0,y0+1,c)+(hsh(x0+1,y0+1,c)-hsh(x0,y0+1,c))*sm(tx);return a+(b-a)*sm(ty);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},lerp=(a,b,t)=>a+(b-a)*t;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// ── the ground: the game's water, a distance field from it, a valley and hills ──
const GS=2,GW=Math.ceil(WW/GS)+1,GH=Math.ceil(WH/GS)+1,WM=new Uint8Array(GW*GH),WD=new Float32Array(GW*GH).fill(1e9),HG=new Float32Array(GW*GH);
for(let j=0;j<GH;j++)for(let i=0;i<GW;i++)if(cfg.water(i*GS,j*GS)){WM[j*GW+i]=1;WD[j*GW+i]=0;}
for(let pass=0;pass<2;pass++){for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const k=j*GW+i;if(i>0)WD[k]=Math.min(WD[k],WD[k-1]+GS);if(j>0)WD[k]=Math.min(WD[k],WD[k-GW]+GS);if(i>0&&j>0)WD[k]=Math.min(WD[k],WD[k-GW-1]+GS*1.41);if(i<GW-1&&j>0)WD[k]=Math.min(WD[k],WD[k-GW+1]+GS*1.41);}
  for(let j=GH-1;j>=0;j--)for(let i=GW-1;i>=0;i--){const k=j*GW+i;if(i<GW-1)WD[k]=Math.min(WD[k],WD[k+1]+GS);if(j<GH-1)WD[k]=Math.min(WD[k],WD[k+GW]+GS);if(i<GW-1&&j<GH-1)WD[k]=Math.min(WD[k],WD[k+GW+1]+GS*1.41);if(i>0&&j<GH-1)WD[k]=Math.min(WD[k],WD[k+GW-1]+GS*1.41);}}
const anyWater=WM.some(v=>v);
const BUMPS=Array.from({length:6},(_,i)=>[hsh(i,1,3)*WW,hsh(i,2,3)*WH,26+hsh(i,3,3)*40,.08+hsh(i,4,3)*.26]);
for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const x=i*GS,y=j*GS,k=j*GW+i,d=anyWater?WD[k]:60;
  let h=.02+.2*smooth((d-10)/150)+.04*smooth((d-3)/14)+.035*(noise(x,y,70,1)-.5)+.02*(noise(x,y,23,2)-.5);
  for(const [bx,by,r,a] of BUMPS){const c=[cfg.center[0],cfg.center[1]];if(Math.hypot(bx-c[0],by-c[1])<28)continue;h+=a*Math.exp(-((x-bx)**2+(y-by)**2)/(r*r));}
  HG[k]=h*(.25+.75*smooth((d-1)/12));}
function Hh(x,y){const fx=clamp(x/GS,0,GW-1.001),fy=clamp(y/GS,0,GH-1.001),i=Math.floor(fx),j=Math.floor(fy),tx=fx-i,ty=fy-j,k=j*GW+i;return (HG[k]*(1-tx)+HG[k+1]*tx)*(1-ty)+(HG[k+GW]*(1-tx)+HG[k+GW+1]*tx)*ty;}
const wdAt=(x,y)=>{const fx=clamp(x/GS,0,GW-1.001),fy=clamp(y/GS,0,GH-1.001),i=Math.floor(fx),j=Math.floor(fy),tx=fx-i,ty=fy-j,k=j*GW+i;return (WD[k]*(1-tx)+WD[k+1]*tx)*(1-ty)+(WD[k+GW]*(1-tx)+WD[k+GW+1]*tx)*ty;};
const grad=(x,y)=>[(Hh(x+1.5,y)-Hh(x-1.5,y))/3,(Hh(x,y+1.5)-Hh(x,y-1.5))/3];
const slopeAt=(x,y)=>Math.hypot(...grad(x,y));
const water=(x,y)=>cfg.water(x,y);
const flood=(x,y)=>anyWater&&wdAt(x,y)<6;
const toLand=(x,y,cx,cy)=>{for(let k=0;k<30&&flood(x,y);k++){x+=(cx-x)*.08;y+=(cy-y)*.08;}return [x,y];};
const STEEP=.0042;
// ───────────── spatial index ─────────────
class Bins{constructor(c){this.c=c;this.m=new Map();}
  key(i,j){return i*4096+j;}
  add(o,x0,y0,x1,y1){const c=this.c;for(let i=Math.floor(x0/c);i<=Math.floor(x1/c);i++)for(let j=Math.floor(y0/c);j<=Math.floor(y1/c);j++){const k=this.key(i,j);let a=this.m.get(k);if(!a)this.m.set(k,a=[]);a.push(o);}}
  near(x0,y0,x1,y1,fn){const c=this.c,st=++BIN_STAMP;for(let i=Math.floor(x0/c);i<=Math.floor(x1/c);i++)for(let j=Math.floor(y0/c);j<=Math.floor(y1/c);j++){const a=this.m.get(this.key(i,j));if(!a)continue;for(const o of a){if(o._bs===st)continue;o._bs=st;if(fn(o)===false)return;}}}}
let BIN_STAMP=0;
// ───────────── state ─────────────
let Y=Y0;
const stubs=[],paths=[],plots=[],places=[],landmarks=[],zones=[],walls=[],labels=[],pathBins=new Bins(6),plotBins=new Bins(8),placeBins=new Bins(10);
const KIND={canal:{hw:.6},walk:{hw:.35},promenade:{hw:.8},edge:{hw:.05},path:{hw:.32},road:{hw:.75},lane:{hw:.45},street:{hw:.6},avenue:{hw:1.4},boulevard:{hw:1.9},rail:{hw:.5}};
function addPath(pts,kind,o={}){const L=[0];for(let i=1;i<pts.length;i++)L.push(L[i-1]+dist(pts[i],pts[i-1]));
  const p={id:paths.length,pts,L,len:L.at(-1),kind,born:Y,died:null,hw:o.hw??KIND[kind].hw,name:o.name||null,open:!!o.open};paths.push(p);
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],m=p.hw+.5;pathBins.add({p,a,b},Math.min(a[0],b[0])-m,Math.min(a[1],b[1])-m,Math.max(a[0],b[0])+m,Math.max(a[1],b[1])+m);}
  return p;}
const aliveP=p=>p.born<=Y&&(p.died==null||p.died>Y);
function at(p,s){s=clamp(s,0,p.len);let lo=1,hi=p.L.length-1;while(lo<hi){const m=(lo+hi)>>1;if(p.L[m]<s)lo=m+1;else hi=m;}const i=lo,a=p.pts[i-1],b=p.pts[i],l=p.L[i]-p.L[i-1]||1,t=(s-p.L[i-1])/l;return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,tx:(b[0]-a[0])/l,ty:(b[1]-a[1])/l};}
// Distance from (x,y) to the nearest street edge (negative inside a street).
function nearPath(x,y,r=6,skip=null,solid=false){let best={d:1e9,p:null,x:0,y:0};pathBins.near(x-r,y-r,x+r,y+r,({p,a,b})=>{if(p===skip||!aliveP(p)||solid&&(p.kind==='path'||p.kind==='edge'))return;const vx=b[0]-a[0],vy=b[1]-a[1],t=clamp(((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy||1),0,1),px=a[0]+vx*t,py=a[1]+vy*t,d=Math.hypot(px-x,py-y)-p.hw;if(d<best.d)best={d,p,x:px,y:py};});return best;}
// Point in polygon.
function inPoly(x,y,pts){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;}
const aliveO=o=>o.born<=Y&&(o.died==null||o.died>Y);
// Zones are indexed by their bounding boxes; the latest zone containing a point wins.
let zoneBins=new Bins(16),zoneVer=-1;
function indexZones(){zoneBins=new Bins(16);zones.forEach((o,i)=>{o.i=i;const xs=o.poly.map(p=>p[0]),ys=o.poly.map(p=>p[1]);zoneBins.add(o,Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys));});zoneVer=zones.length+(zones.polyVer||0);}
function zoneAt(x,y){if(zoneVer!==zones.length+(zones.polyVer||0))indexZones();let z=null;zoneBins.near(x,y,x,y,o=>{if(aliveO(o)&&(!z||o.i>z.i)&&inPoly(x,y,o.poly))z=o;});return z;}
function inPlace(x,y,m=0){let hit=false;placeBins.near(x-m,y-m,x+m,y+m,o=>{if(aliveO(o)&&(inPoly(x,y,o.poly)||m>0&&o.poly.some(p=>Math.hypot(p[0]-x,p[1]-y)<m))){hit=true;return false;}});return hit;}
function addPlace(poly,kind,o={}){const pl={poly,kind,born:Y,died:null,...o};places.push(pl);const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);placeBins.add(pl,Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys));return pl;}
// ───────────── least-cost routes over the ground ─────────────
// Dijkstra on the 2-unit height grid, eight directions. Climbing is expensive,
// the floodplain is avoided, water is closed except at a named crossing.
function route(a,b,{climb=60000,floodCost=3,crossing=null,avoid=null}={}){
  const N=GW*GH,cost=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),idx=(x,y)=>clamp(Math.round(y/GS),0,GH-1)*GW+clamp(Math.round(x/GS),0,GW-1);
  const s=idx(...a),t=idx(...b),heap=[[0,s]];cost[s]=0;
  const push=(c,k)=>{heap.push([c,k]);let i=heap.length-1;while(i){const j=(i-1)>>1;if(heap[j][0]<=heap[i][0])break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[i],heap[m]]=[heap[m],heap[i]];i=m;}}return top;};
  const D=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1],[2,1],[1,2],[-2,1],[-1,2],[2,-1],[1,-2],[-2,-1],[-1,-2]];
  while(heap.length){const [c,k]=pop();if(k===t)break;if(c>cost[k])continue;const i=k%GW,j=(k-i)/GW,x=i*GS,y=j*GS,h=HG[k];
    for(const [di,dj] of D){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=GW||nj>=GH)continue;const nk=nj*GW+ni,nx=ni*GS,ny=nj*GS,len=Math.hypot(di,dj)*GS;
      if(water(nx,ny)&&!(crossing&&Math.hypot(nx-crossing[0],ny-crossing[1])<9))continue;
      const sl=(HG[nk]-h)/len;let w=len*(1+sl*sl*climb)+(flood(nx,ny)?len*floodCost:0);if(avoid)w+=len*avoid(nx,ny);
      if(c+w<cost[nk]){cost[nk]=c+w;prev[nk]=k;push(c+w,nk);}}}
  const out=[];for(let k=t;k>=0;k=prev[k]){const i=k%GW;out.push([i*GS,(k-i)/GW*GS]);if(k===s)break;}
  out.reverse();out[0]=[...a];out[out.length-1]=[...b];return chaikin(simplify(out,1.2),3);}
function simplify(pts,tol){if(pts.length<3)return pts;const keep=[pts[0]];let last=pts[0];for(let i=1;i<pts.length-1;i++){if(dist(pts[i],last)>=tol*2.2){keep.push(pts[i]);last=pts[i];}}keep.push(pts.at(-1));return keep;}
function chaikin(pts,n){for(let k=0;k<n;k++){const o=[pts[0]];for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];o.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}o.push(pts.at(-1));pts=o;}return pts;}
// ───────────── land value ─────────────
// Old roads and the crossing; every landmark the player places weighs more.
function value(x,y){let v=0;for(const m of landmarks)if(aliveO(m))v+=m.pull*Math.exp(-Math.hypot(x-m.x,y-m.y)/m.reach);
  const np=nearPath(x,y,8);if(np.p&&(np.p.kind==='road'||np.p.kind==='street'||np.p.kind==='avenue'||np.p.kind==='boulevard'))v+=(np.p.high?.7:.25)*Math.exp(-Math.max(0,np.d)/(np.p.high?2.5:3));
  // A park or a plaza raises the value of the land that faces it.
  for(const pl of places)if(aliveO(pl)&&(pl.kind==='park'||pl.kind==='plaza'||pl.kind==='chase')){const [cx,cy]=pl.c||(pl.c=centre(pl.poly)),r=pl.r||(pl.r=Math.max(...pl.poly.map(q=>Math.hypot(q[0]-cx,q[1]-cy))));const d=Math.max(0,Math.hypot(x-cx,y-cy)-r);if(d<30)v+=(pl.kind==='chase'?.12:.38)*Math.exp(-d/10);}
  // Inside the walls land is dear: the town packs in before it spills out.
  for(const w of walls)if(aliveO(w)&&w.kind!=='bastion'&&inPoly(x,y,w.poly)){v+=.5;break;}
  return v;}
// ───────────── plots ─────────────
// A plot is a four-sided strip: two front corners on the street edge, sides
// along the street's normals, a back line. Neighbours share their side lines.
function addPlot(pts,o){const pl={id:plots.length,pts,born:Y,died:null,ev:[],...o};const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);plotBins.add(pl,Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys));plots.push(pl);return pl;}
function inQuad(x,y,q){let s=0;for(let i=0;i<q.length;i++){const a=q[i],b=q[(i+1)%q.length],c=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);if(c>0)s|=1;else if(c<0)s|=2;if(s===3)return false;}return true;}
function edgeDist(x,y,q){let b=1e9;for(let i=0;i<q.length;i++){const a=q[i],c=q[(i+1)%q.length],vx=c[0]-a[0],vy=c[1]-a[1],t=clamp(((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy||1),0,1),dx=a[0]+vx*t-x,dy=a[1]+vy*t-y,d=dx*dx+dy*dy;if(d<b)b=d;}return Math.sqrt(b);}
function inPlot(x,y,m=0){let hit=null;plotBins.near(x-1-m,y-1-m,x+1+m,y+1+m,o=>{if(!aliveO(o))return;if(inQuad(x,y,o.pts)||m>0&&edgeDist(x,y,o.pts)<m){hit=o;return false;}});return hit;}
function grow(q,m){const cx=q.reduce((a,p)=>a+p[0],0)/q.length,cy=q.reduce((a,p)=>a+p[1],0)/q.length;return q.map(([x,y])=>{const d=Math.hypot(x-cx,y-cy)||1;return [x+(x-cx)/d*m,y+(y-cy)/d*m];});}
function quadFree(q){const cx=q.reduce((a,p)=>a+p[0],0)/4,cy=q.reduce((a,p)=>a+p[1],0)/4,sm=grow(q,-.25);
  for(const pt of [...sm,[cx,cy],[(sm[0][0]+sm[1][0])/2,(sm[0][1]+sm[1][1])/2],[(sm[2][0]+sm[3][0])/2,(sm[2][1]+sm[3][1])/2]])if(inPlot(pt[0],pt[1]))return false;
  let clash=false;plotBins.near(cx-12,cy-12,cx+12,cy+12,o=>{if(!aliveO(o))return;for(const p of grow(o.pts,-.25))if(inQuad(p[0],p[1],q)){clash=true;return false;}});return !clash;}
// How deep a plot can go from the street edge before it meets something.
function depthAlong(x,y,nx,ny,max,own,z,wall){let t=0;
  for(;t<max;t+=.5){const px=x+nx*(t+.5),py=y+ny*(t+.5);
    if(flood(px,py)||slopeAt(px,py)>STEEP*1.6||inPlace(px,py)||onWall(px,py))break;
    if(zoneAt(px,py)!==z)break;
    if(wall&&!wallOK(px,py,wall))break;
    if(t>.8){const np=nearPath(px,py,3,own,true);if(np.d<.35)break;}
    if(inPlot(px,py,.1))break;}
  return t;}
// Lay out a row of strip plots along one side of a street, from s0 forward.
function layRow(p,side,s0,s1,z,o={}){
  const a0=at(p,(s0+s1)/2),v0=value(a0.x,a0.y),dear=v0>.95,mid=v0>.5;
  const made=[];let s=s0;const back=o.depth??(dear?6.5+rnd()*2:mid?8+rnd()*3:9.5+rnd()*4),row={id:hsh(p.id,side,s0*10)};
  let prevB=null;p.gaps=p.gaps||{};const gk=side>0?'r':'l';if(p.gaps[gk]==null)p.gaps[gk]=6+rnd()*14;
  const every=()=>o.gapEvery??(16+rnd()*18);
  while(s<s1-1.5){
    // Every so often the row leaves an opening: a lane will go in there.
    while(p.gaps[gk]<s-2)p.gaps[gk]+=every();
    {const st=stubs.find(t=>t.p===p&&t.side===side&&t.s>s-1.3&&t.s<s+(o.width?3.5:3.8)+1.2);if(st){s=st.s+1.45;prevB=null;continue;}}
    if(s>=p.gaps[gk]&&s<p.len-6&&!o.noGaps){const a=at(p,s+1.1),nx=-a.ty*side,ny=a.tx*side;stubs.push({p,s:s+1.1,side,x:a.x,y:a.y,hx:nx,hy:ny,z,born:Y});s+=2.4;prevB=null;p.gaps[gk]=s+every();continue;}
    const w=o.width?o.width():dear?1.6+rnd()*.8:mid?2+rnd()*1.2:2.6+rnd()*1.6,sA=s,sB=Math.min(s1,s+w);if(sB-sA<1.4)break;
    const A=prevB&&Math.abs(prevB.s-sA)<1e-6?prevB:corner(p,sA,side,back,z,o.wall),B=corner(p,sB,side,back,z,o.wall);
    if(!A||!B){deadAt(z,p,side,s);prevB=null;s+=.8;continue;}
    // On the outside of a bend the sides splay: shorten the plot so its back is at most 1.7× its front.
    {const fw=dist(A.f,B.f),bw=dist(A.b,B.b);if(bw>fw*1.7&&A.d>0&&B.d>0){const k=clamp((fw*.7)/(bw-fw),0,1),sh=(c)=>({...c,d:c.d*k,b:[c.f[0]+(c.b[0]-c.f[0])*k,c.f[1]+(c.b[1]-c.f[1])*k]});if(A!==prevB)Object.assign(A,sh(A));Object.assign(B,sh(B));}}
    const q=[A.f,B.f,B.b,A.b];
    if(A.d<3||B.d<3||!quadFree(q)||!zoneAt((A.f[0]+B.b[0])/2,(A.f[1]+B.b[1])/2)){deadAt(z,p,side,s);prevB=null;s+=.8;continue;}
    const np=addPlot(q,{p,side,s0:sA,s1:sB,zone:z,row:row.id,kind:'croft',w:sB-sA,d:(A.d+B.d)/2,A,B});if(A===prevB&&made.length){np.prev=made.at(-1);made.at(-1).next=np;}made.push(np);prevB=B;s=sB;
    if(p.kind==='path'){p.kind='lane';p.hw=KIND.lane.hw;p.settled=Y;}}
  return made;}
const deadAt=(z,p,side,s)=>{(z.dead=z.dead||new Set()).add(p.id*4096+(side>0?2048:0)+Math.round(s));};
const isDead=(z,p,side,s)=>z.dead?.has(p.id*4096+(side>0?2048:0)+Math.round(s));
function corner(p,s,side,back,z,wall){const a=at(p,s),nx=-a.ty*side,ny=a.tx*side,off=p.hw+(p.kind==='edge'?.4:.12),fx=a.x+nx*off,fy=a.y+ny*off;
  if(inPlace(fx,fy)||zoneAt(fx,fy)!==z||flood(fx,fy)||onWall(fx,fy))return null;if(wall&&!wallOK(fx,fy,wall))return null;
  const d=depthAlong(fx,fy,nx,ny,back+(hsh(p.id,side,Math.round(s*4))-.5)*1.6,p,z,wall);return {s,f:[fx,fy],b:[fx+nx*d,fy+ny*d],d};}
// Unused frontage along streets in a zone: runs of free street edge, each with the land value at its start.
function frontageRuns(z){const ver=plots.length+'/'+paths.length+'/'+(z.dead?.size||0)+'/'+stubs.length;if(z.fr&&z.frv===ver)return z.fr;const runs=[];z.frv=ver;z.fr=runs;
  for(const p of zonePaths(z)){if(p.kind==='rail')continue;
    for(const side of [1,-1]){let run=null;if(p.deadSide===side)continue;
      for(let s=1;s<=p.len-1;s+=1){const a=at(p,s),nx=-a.ty*side,ny=a.tx*side,x=a.x+nx*(p.hw+1.2),y=a.y+ny*(p.hw+1.2);
        const free=!isDead(z,p,side,s)&&!stubs.some(t=>t.p===p&&t.side===side&&Math.abs(t.s-s)<1.4)&&zoneAt(x,y)===z&&!inPlot(x,y,.2)&&!inPlace(x,y)&&!flood(x,y)&&slopeAt(x,y)<STEEP*1.6&&(!z.wall||wallOK(x,y,z.wall));
        if(free){if(run==null)run=s;}else{if(run!=null&&s-run>3)runs.push({p,side,s0:run,s1:s});run=null;}}
      if(run!=null&&p.len-1-run>3)runs.push({p,side,s0:run,s1:p.len-1});}}
  for(const r of runs){const best=[r.s0+1,r.s1-1].map(s=>{const a=at(r.p,s);return value(a.x,a.y);});r.v=Math.max(...best);
    // Lay from the dear end: if the far end is worth more, flip.
    r.fromEnd=best[1]>best[0];}
  return runs;}
// A back lane: the line along the backs of a fresh row, parallel to its street. Houses will face it from the far side.
function backLane(p,side,s0,s1,D,z){if(s1-s0<10||p.kind==='edge')return null;const seg=[];let best=[];
  for(let s=s0;s<=s1;s+=1.5){const a=at(p,s),nx=-a.ty*side,ny=a.tx*side,o=p.hw+D+1.5,x=a.x+nx*o,y=a.y+ny*o;
    const ok=zoneAt(x,y)===z&&!flood(x,y)&&slopeAt(x,y)<STEEP*1.7&&!inPlot(x,y,.2)&&!inPlace(x,y)&&nearPath(x,y,3,p,true).d>1.2&&(!z.wall||wallOK(x,y,z.wall));
    if(ok)seg.push([x,y]);else{if(seg.length>best.length)best=seg.slice();seg.length=0;}}
  if(seg.length>best.length)best=seg;if(best.length<7)return null;
  const np=addPath(chaikin(best,1),'lane',{open:true});
  // Which side of the new lane faces the old street: the one pointing back toward p.
  const a=at(np,np.len/2),nx=-a.ty,ny=a.tx,q=at(p,nearestS(p,[a.x,a.y]));np.deadSide=((q.x-a.x)*nx+(q.y-a.y)*ny)>0?1:-1;return np;}
function layRun(r,z){const len=r.s1-r.s0,cut=Math.min(len,14+rnd()*18),a=r.fromEnd?r.s1-cut:r.s0,b=r.fromEnd?r.s1:Math.min(r.s1,r.s0+cut);
  const made=layRow(r.p,r.side,a,b,z,z.lay||{});
  if(made.length>=3&&!z.lay?.noBack){const D=made.reduce((m,pl)=>m+pl.d,0)/made.length;backLane(r.p,r.side,made[0].s0,made.at(-1).s1,D,z);}
  return made.length;}
function zonePaths(z){z.pc=z.pc||new Map();for(const p of paths)if(!z.pc.has(p))z.pc.set(p,nearZone(p,z));return [...z.pc].filter(([p,ok])=>ok&&aliveP(p)).map(([p])=>p);}
// ───────────── lanes ─────────────
// A street that passes through or near a zone (within 6 units).
function nearZone(p,z){for(let s=0;s<=p.len;s+=2){const a=at(p,s);if(inPoly(a.x,a.y,z.poly)||z.poly.some(q=>Math.hypot(q[0]-a.x,q[1]-a.y)<6))return true;}return false;}
// Zoned land no street reaches gets a track from the nearest street, laid over the easiest ground.
// A street along the level line through (x,y), traced both ways until it leaves
// the zone, meets plots or water, or runs into another street (then it joins it).
function traceContour(x0,y0,z,max=26){const half=dir=>{const out=[];let x=x0,y=y0,[gx,gy]=grad(x,y),sl=Math.hypot(gx,gy)||1,hx=-gy/sl*dir,hy=gx/sl*dir;
    for(let i=0;i<max/1.3;i++){[gx,gy]=grad(x,y);sl=Math.hypot(gx,gy);if(sl>1e-6){let cx=-gy/sl,cy=gx/sl;if(cx*hx+cy*hy<0){cx=-cx;cy=-cy;}hx=hx*.35+cx*.65;hy=hy*.35+cy*.65;}
      const wob=(noise(x,y,13,23)-.5)*.3*(1-STREETS(Y).straight);hx+=-hy*wob;hy+=hx*wob;const l=Math.hypot(hx,hy);hx/=l;hy/=l;
      const nx=x+hx*1.3,ny=y+hy*1.3;if(zoneAt(nx,ny)!==z||flood(nx,ny)||onWall(nx,ny)||inPlot(nx,ny,.3)||inPlace(nx,ny))break;
      const dn=nearPath(nx,ny,4,null,true);if(dn.d<1.4){out.push([dn.x,dn.y]);break;}out.push([nx,ny]);x=nx;y=ny;}return out;};
  return [...half(-1).reverse(),[x0,y0],...half(1)];}
// When no opening leads anywhere: the best open spot in the zone gets a street
// along its level line, tied to the network by a short connector.
function reachLane(z){let xs=z.poly.map(p=>p[0]),ys=z.poly.map(p=>p[1]),best=null,bs=-1e9;
  for(let t=0;t<90;t++){const x=lerp(Math.min(...xs),Math.max(...xs),rnd()),y=lerp(Math.min(...ys),Math.max(...ys),rnd());
    if(zoneAt(x,y)!==z||flood(x,y)||slopeAt(x,y)>STEEP*1.3||inPlot(x,y,1.5)||inPlace(x,y,1)||onWall(x,y))continue;if(z.wall&&!wallOK(x,y,z.wall))continue;
    const np=nearPath(x,y,30,null,true);if(np.d<7)continue;const sc=value(x,y)-np.d*.012+rnd()*.25;if(sc>bs){bs=sc;best={x,y,np};}}
  if(!best||!best.np.p)return false;
  const line=traceContour(best.x,best.y,z);if(line.length<8)return false;
  const c=addPath(line,STREETS(Y).kind,{open:true});
  // The connector: from the nearest street to the nearest point of the new line, over easy ground.
  let bi=0,bd=1e9;for(let i=0;i<line.length;i++){const d=nearPath(...line[i],30,c,true).d;if(d<bd){bd=d;bi=i;}}
  const np=nearPath(...line[bi],30,c,true);if(np.p&&np.d>1.5&&np.d<14){const link=route([np.x,np.y],line[bi],{climb:30000,avoid:(x,y)=>inPlot(x,y,.4)||onWall(x,y)?60:0});if(link.length>=2)addPath(link,'lane');}
  return true;}
function trackTo(z){if(paths.some(p=>aliveP(p)&&p.kind!=='rail'&&p.pts.some(([x,y])=>inPoly(x,y,z.poly))))return;
  let best=null,bd=1e9;for(const p of paths)if(aliveP(p)&&p.kind!=='rail')for(let s=0;s<=p.len;s+=2){const a=at(p,s),d=Math.hypot(a.x-z.cx,a.y-z.cy);if(d<bd&&!flood(a.x,a.y)){bd=d;best=[a.x,a.y];}}
  if(best)addPath(route(best,[z.cx,z.cy],{climb:60000}),'lane',{open:true});}
// A lane leaves a street; on a slope it swings to follow the level line; it ends
// where it meets another street.
function growLane(z,o={}){
  let bq=null,bs=-1e9;const live=paths.filter(p=>aliveP(p)&&p.kind!=='rail'&&nearZone(p,z));
  for(let t=0;t<60;t++){const p=live[Math.floor(rnd()*live.length)];if(!p)return false;const tip=p.open&&rnd()<.35,s=tip?p.len:2+rnd()*(p.len-4),side=rnd()<.5?1:-1,a=at(p,s);
    const hx=tip?a.tx:-a.ty*side,hy=tip?a.ty:a.tx*side;
    const sx=a.x+hx*(p.hw+.6),sy=a.y+hy*(p.hw+.6),ix=a.x+hx*4,iy=a.y+hy*4;if(zoneAt(ix,iy)!==z||inPlot(sx,sy,.6)||inPlace(sx,sy))continue;
    let room=0;for(const r of [6,10,14,18]){const x=a.x+hx*r,y=a.y+hy*r;if(zoneAt(x,y)===z&&!flood(x,y)&&slopeAt(x,y)<STEEP*1.4&&nearPath(x,y,9,p,true).d>6.5&&!inPlot(x,y,.5))room++;}
    if(room<2)continue;const sc=room*.9+value(a.x,a.y)*1.2+(tip?.6:0)+rnd()*.8;if(sc>bs){bs=sc;bq={p,a,hx,hy,tip};}}
  // An opening left in a row of plots comes first.
  const open=stubs.filter(t=>t.z===z&&!t.used);if(open.length&&(rnd()<.8||!bq)){const t=open[Math.floor(rnd()*open.length)];t.tries=(t.tries||0)+1;if(t.tries>=3)t.used=true;bq={p:t.p,a:{x:t.x,y:t.y},hx:t.hx,hy:t.hy,tip:false};}
  if(!bq)return false;
  // Most lanes swing onto the level line at once; one in four is a short connector straight up or down the slope.
  const connector=rnd()<.25;
  let x=bq.a.x,y=bq.a.y,hx=bq.hx,hy=bq.hy;const pts=[[x,y]],L=o.len??(connector?7+rnd()*7:16+rnd()*22),ST=1.25,straight=connector?.85:(o.straight??0);let joined=false;
  for(let i=0;i<L/ST;i++){const [gx,gy]=grad(x,y),sl=Math.hypot(gx,gy);
    if(i>=1&&sl>1e-5&&straight<1){let cx=-gy/sl,cy=gx/sl;if(cx*hx+cy*hy<0){cx=-cx;cy=-cy;}const wc=clamp(sl/(STEEP*.25),0,1)*.72*(1-straight);hx=hx*(1-wc)+cx*wc;hy=hy*(1-wc)+cy*wc;}
    const wob=(noise(x,y,11,21)-.5)*.42*(1-straight);hx+=-hy*wob;hy+=hx*wob;const hl=Math.hypot(hx,hy);hx/=hl;hy/=hl;
    const nx=x+hx*ST,ny=y+hy*ST;if(i>3&&zoneAt(nx,ny)!==z||flood(nx,ny)||slopeAt(nx,ny)>STEEP*1.7||inPlot(nx,ny,i<8?0:.3)||inPlace(nx,ny))break;
    if(z.wall&&!wallOK(nx,ny,z.wall)||onWall(nx,ny))break;
    if(i>=3){const dn=nearPath(nx,ny,6,null,true);if(dn.d<1.6){pts.push([dn.x,dn.y]);joined=true;break;}
      // Running alongside another street, too close for plots between: stop.
      if(dn.d<5.5&&dn.p){const ex=dn.x-nx,ey=dn.y-ny,el=Math.hypot(ex,ey)||1;if(Math.abs((ex*hx+ey*hy)/el)<.5)break;}}
    pts.push([nx,ny]);x=nx;y=ny;}
  if(!joined&&pts.length>=6){for(let r=2;r<=8;r+=1.5){const ex=x+hx*r,ey=y+hy*r;if(flood(ex,ey)||inPlot(ex,ey,0))break;const dn=nearPath(ex,ey,2,null,true);if(dn.d<.6){pts.push([dn.x,dn.y]);joined=true;break;}}}
  if(pts.length<6)return false;if(bq.tip)bq.p.open=false;for(const t of stubs)if(!t.used&&Math.hypot(t.x-bq.a.x,t.y-bq.a.y)<.5)t.used=true;
  addPath(pts,o.kind||'lane',{open:!joined,hw:o.kind==='street'?.6:undefined});return true;}
// ───────────── houses ─────────────
// Each plot keeps a list of events: [year, state]. state: {b:'house'|'farm'|..., dv: depth share, style, plan}.
const STYLE_BY_YEAR=y=>y<1500?'timber':y<1700?'stone':y<1850?'classical':y<1950?'brick':y<2000?'modernist':'contemporary';
function setState(pl,st){pl.ev.push([Y,{...(pl.ev.at(-1)?.[1]||{}),...st}]);}
function stateAt(pl,y){let s=null;for(const e of pl.ev){if(e[0]<=y)s=e[1];else break;}return s;}
function buildOn(pl){const use=pl.zone.use||'res';
  if(use==='craft'&&!pl.zone.uniform){setState(pl,{b:'works',style:STYLE_BY_YEAR(Y),dv:clamp(5.5/pl.d,.4,.85),gap:.05,plan:0,built:Y});pl.built=Y;return;}
  if(pl.zone.uniform){setState(pl,{b:use==='trade'?'shop':'house',style:pl.zone.uniform,dv:clamp(4.2/pl.d,.3,.8),gap:0,plan:0,built:Y,terrace:1});pl.built=Y;return;}
  const v=value(...centre(pl.pts)),dense=v>.85;if(dense)pl.dense=1;const mid=v>.45;setState(pl,{b:pl.zone.kind==='village'&&pl.w>3.4?'farm':use==='trade'?'shop':'house',style:STYLE_BY_YEAR(Y),dv:clamp((dense?5+rnd():mid?4+rnd()*.8:3.2+rnd()*.8)/pl.d,.28,.75),gap:dense?0:mid?.02:.06+rnd()*.08,plan:Math.floor(hsh(pl.id,3)*6),built:Y});pl.built=Y;}
const centre=q=>[q.reduce((a,p)=>a+p[0],0)/q.length,q.reduce((a,p)=>a+p[1],0)/q.length];
// Pick the plot the next household takes: dear land, beside neighbours, near the street that is already built up.
function nextPlot(z){let best=null,bs=-1e9;const empty=plots.filter(p=>aliveO(p)&&!p.built&&p.zone===z);if(!empty.length)return null;
  // A terrace is built in runs: the plot next to the last one built.
  if(z.uniform){const run=empty.find(p=>p.prev&&p.prev.built);if(run&&rnd()<.85)return run;}
  for(let t=0;t<Math.min(40,empty.length);t++){const pl=empty.length<=40?empty[t]:empty[Math.floor(rnd()*empty.length)],[cx,cy]=centre(pl.pts);let nb=0;
    plotBins.near(cx-5,cy-5,cx+5,cy+5,o=>{if(o!==pl&&aliveO(o)&&o.built)nb++;});
    // Ordinary families: the best living they can afford. The wealthy: living and prestige.
    const S=solAt(cx,cy),V=valAt(cx,cy),sc=1.3*value(cx,cy)+(HH==='wealthy'?S/22+V/35:S/26-V/70)+Math.min(nb,6)*.35-slopeAt(cx,cy)/STEEP*.4+rnd()*.6;if(sc>bs){bs=sc;best=pl;}}
  return best;}
// ───────────── walls ─────────────
// Thrown round what exists: a ring that hugs the built town, closed along the
// river bank, with gates where the old roads leave.
// Any standing wall is a barrier: nothing is laid within 1.6 of its line except at a gate.
function onWall(x,y){for(const w of walls)if(aliveO(w)&&ringDist(x,y,w.poly)<1.6&&!w.gates.some(g=>Math.hypot(g.x-x,g.y-y)<2.6))return true;return false;}
function wallOK(x,y,w){return w.inside?inPoly(x,y,w.poly):!inPoly(x,y,w.poly)&&ringDist(x,y,w.poly)>2.2;}
function ringDist(x,y,poly){let b=1e9;for(let i=0;i<poly.length;i++){const a=poly[i],c=poly[(i+1)%poly.length],vx=c[0]-a[0],vy=c[1]-a[1],t=clamp(((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy||1),0,1);b=Math.min(b,Math.hypot(a[0]+vx*t-x,a[1]+vy*t-y));}return b;}
function throwWall(cx,cy,zs,margin){
  // Each of 48 sectors reaches as far as its built houses (or a landmark), plus a margin; the ring is then softened.
  const n=48,r=new Array(n).fill(0);
  const reach=(x,y,add=0)=>{const a=Math.atan2(y-cy,x-cx),k=((Math.round(a/(2*Math.PI)*n)%n)+n)%n;r[k]=Math.max(r[k],Math.hypot(x-cx,y-cy)+add);};
  for(const pl of plots)if(aliveO(pl)&&pl.built&&zs.includes(pl.zone))for(const [x,y] of pl.pts)reach(x,y);
  for(const l of landmarks)if(aliveO(l)&&l.inWall)reach(l.x,l.y,7);
  const mean=r.reduce((a,b)=>a+b,0)/n;let q=r.map(v=>v||mean*.6);
  for(let k=0;k<4;k++)q=q.map((v,i)=>Math.max(v,(q[(i+1)%n]+q[(i+n-1)%n])/2*.92));
  for(let k=0;k<2;k++)q=q.map((v,i)=>(q[(i+1)%n]+q[(i+n-1)%n]+v*2)/4);
  let poly=q.map((v,i)=>{const a=i/n*2*Math.PI,m=margin*(.8+.5*noise(i*3,0,7,41));let x=cx+Math.cos(a)*(v+m),y=cy+Math.sin(a)*(v+m);
    [x,y]=toLand(x,y,cx,cy);return [x,y];});
  poly=chaikin([...poly,poly[0]],2).slice(0,-1);
  const w={poly,born:Y,died:null,gates:[],towers:[]};walls.push(w);
  for(const p of paths)if(aliveP(p)&&(p.kind==='road'))for(let i=1;i<p.pts.length;i++){const a=p.pts[i-1],b=p.pts[i];if(inPoly(...a,poly)!==inPoly(...b,poly))w.gates.push({x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,a:Math.atan2(b[1]-a[1],b[0]-a[0]),road:p});}
  let acc=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];acc+=dist(a,b);if(acc>11&&!w.gates.some(g=>Math.hypot(g.x-a[0],g.y-a[1])<5)&&!flood(a[0],a[1])){w.towers.push(a);acc=0;}}
  // Houses in the wall's way come down.
  for(const pl of plots)if(aliveO(pl)&&pl.pts.some(([x,y])=>ringDist(x,y,poly)<1.2))pl.died=Y;
  mainGate(w);
  return w;}
// The main gate: the one on the longest road (the way to the wider world). Just inside it a gate
// square opens where carts were checked and goods sold; the road from it to the market is the high street.
function mainGate(w){if(!w.gates.length)return;const gt=w.gates.slice().sort((a,b)=>b.road.len-a.road.len)[0];w.main=gt;
  const p=gt.road,s0=nearestS(p,[gt.x,gt.y]),[wx,wy]=centre(w.poly),f=at(p,Math.min(p.len,s0+4)),dir=Math.hypot(f.x-wx,f.y-wy)<Math.hypot(gt.x-wx,gt.y-wy)?1:-1;
  const side=[],other=[];for(const [t,hw] of [[2,1.8],[5,3.6],[9,4.6],[13,3.2],[16,1.6]]){const a=at(p,clamp(s0+dir*t,0,p.len)),nx=-a.ty,ny=a.tx;side.push([a.x+nx*hw,a.y+ny*hw]);other.push([a.x-nx*hw,a.y-ny*hw]);}
  const sq=[...side,...other.reverse()];
  for(const pl of plots)if(aliveO(pl)&&(inPoly(...centre(pl.pts),sq)||pl.pts.some(([x,y])=>inPoly(x,y,sq))))pl.died=Y;
  addPlace(sq,'market',{name:'Gate market'});const ep=addPath([...sq,sq[0]],'edge',{hw:.05});const z=zoneAt(...centre(sq));if(z)for(const sd of [1,-1])layRow(ep,sd,.5,ep.len-.5,z,{width:()=>1.6+rnd()*.6,depth:6,noGaps:true});
  // The high street: that road, from the gate to the market, wider and dearer.
  p.high=true;p.hw=1.05;}
// ───────────── landmarks ─────────────
// A landmark is a building plan (parts in its own frame) at x,y turned by `a`, with a pull on land value.
function addLandmark(kind,x,y,a,o={}){const m={kind,x,y,a,born:Y,died:null,pull:o.pull??1,reach:o.reach??12,name:o.name||null,parts:o.parts||[],inWall:o.inWall??true};landmarks.push(m);
  if(o.clear){for(const pl of plots)if(aliveO(pl)&&pl.pts.some(([px,py])=>inPoly(px,py,o.clear))||aliveO(pl)&&inPoly(...centre(pl.pts),o.clear))pl.died=Y;addPlace(o.clear,o.placeKind||'yard',{owner:m});}
  return m;}
const R=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
function churchParts(L){const h=L/2;return [{poly:[[-h,-1.9],[h-2.2,-1.9],[h-2.2,1.9],[-h,1.9]],ridge:[[-h+.2,0],[h-2.3,0]],tone:'stone'},{poly:R(h*.18-1.5,-4.2,h*.18+1.5,4.2),ridge:[[h*.18,-4],[h*.18,4]],tone:'stone'},
  {poly:Array.from({length:9},(_,i)=>{const t=-Math.PI/2+i/8*Math.PI;return [h-2.3+Math.cos(t)*1.9,Math.sin(t)*1.9];}),tone:'stone'},{poly:R(-h-3,-1.6,-h,1.6),tone:'tower'}];}
function marketPlace(c,roads,r){const pts=[];for(let k=0;k<16;k++){const a=k/16*2*Math.PI;pts.push([c[0]+Math.cos(a)*r*(.85+hsh(k,51)*.3),c[1]+Math.sin(a)*r*(.85+hsh(k,52)*.3)]);}
  for(const p of roads){const sAt=nearestS(p,c);for(const dir of [-1,1]){const a=at(p,sAt+dir*r*1.9),nx=-a.ty,ny=a.tx;pts.push([a.x+nx*2.2,a.y+ny*2.2],[a.x-nx*2.2,a.y-ny*2.2]);}}
  return hull(pts);}
function nearestS(p,c){let bs=0,bd=1e9;for(let s=0;s<=p.len;s+=.5){const a=at(p,s),d=Math.hypot(a.x-c[0],a.y-c[1]);if(d<bd){bd=d;bs=s;}}return bs;}
function hull(P){P=[...P].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];for(const p of P){while(lo.length>=2&&cr(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}for(const p of P.slice().reverse()){while(up.length>=2&&cr(up.at(-2),up.at(-1),p)<=0)up.pop();up.push(p);}return lo.slice(0,-1).concat(up.slice(0,-1));}
function blob(cx,cy,rx,ry,k=14,salt=0){return Array.from({length:k},(_,i)=>{const a=i/k*2*Math.PI,f=.86+hsh(i,salt,61)*.28;return [cx+Math.cos(a)*rx*f,cy+Math.sin(a)*ry*f];});}
// ───────────── the game's player, read from the city ─────────────
let C0=[...cfg.center];const town=[];
const STREETS=y=>y<1500?{kind:'lane',straight:0}:y<1700?{kind:'street',straight:.55}:{kind:'street',straight:.8};
function addZone(poly,kind,name,o={}){const z={poly,kind,name,born:Y,died:null,rate:o.rate??1,lay:o.lay||{},wall:o.wall||null,use:o.use||'res',cx:centre(poly)[0],cy:centre(poly)[1]};zones.push(z);trackTo(z);if(name)labels.push({text:name,x:z.cx,y:Math.min(...poly.map(p=>p[1]))+3,born:Y,kind:'zone'});return z;}
let carry=0,FAILS=0;const census=[];
// ───────────── Renaissance processes ─────────────
// Stone replaces timber from the centre outward; dense houses grow back over their gardens.
function rebuildWave(){const r=(Y-1500)*.32+10;
  for(let k=0;k<6;k++){const live=plots.filter(p=>aliveO(p)&&p.built);const pl=live[Math.floor(rnd()*live.length)];if(!pl)return;const st=stateAt(pl,Y);if(!st||st.b==='farm')continue;
    const [cx,cy]=centre(pl.pts),d=Math.hypot(cx-C0[0],cy-C0[1]),v=value(cx,cy);
    if(Y>=1700&&st.style==='stone'&&v>.8&&rnd()<.15)setState(pl,{style:'classical',dv:clamp(st.dv+.08,.3,.88),gap:0});
    else if(st.style==='timber'&&d<r&&rnd()<.6)setState(pl,{style:'stone',dv:clamp(st.dv+(v>.6?.12:.05),.3,.85),plan:v>.6?1:st.plan,gap:v>.55?0:st.gap});
    else if(st.style!=='timber'&&v>.7&&st.dv<.8&&rnd()<.3)setState(pl,{dv:clamp(st.dv+.1,.3,.85),plan:1});}}
// Neighbouring plots in a dear street merge into a courtyard palace.
function mergePalace(){const live=plots.filter(p=>aliveO(p)&&p.built&&p.next&&aliveO(p.next)&&p.next.built&&stateAt(p,Y)?.b==='house');
  for(let t=0;t<12;t++){const a=live[Math.floor(rnd()*live.length)];if(!a)return;const v=value(...centre(a.pts));if(v<.75)continue;
    const run=[a];while(run.length<3&&run.at(-1).next&&aliveO(run.at(-1).next)&&run.at(-1).next.built&&stateAt(run.at(-1).next,Y)?.b==='house')run.push(run.at(-1).next);
    const w=run.reduce((m,p)=>m+p.w,0);if(run.length<2||w<4.4)continue;
    const A=run[0].A,B=run.at(-1).B,q=[A.f,B.f,B.b,A.b];for(const r of run)r.died=Y;
    const pl=addPlot(q,{p:a.p,side:a.side,s0:run[0].s0,s1:run.at(-1).s1,zone:a.zone,kind:'palace',w,d:(A.d+B.d)/2,A,B,prev:run[0].prev,next:run.at(-1).next,built:Y});
    if(pl.prev)pl.prev.next=pl;if(pl.next)pl.next.prev=pl;
    setState(pl,{b:'palace',style:'stone',dv:clamp(9/pl.d,.5,.95),gap:0,plan:0});return;}}
// A planned square cut into the old fabric, with the player's town hall on it.
function cutSquare(cx,cy,w,h,name){const road=nearPath(cx,cy,20,null,true),a=road.p?at(road.p,nearestS(road.p,[cx,cy])):{tx:1,ty:0},ang=Math.atan2(a.ty,a.tx);
  const c=Math.cos(ang),sn=Math.sin(ang),Pt=(u,v)=>[cx+u*c-v*sn,cy+u*sn+v*c],sq=[Pt(-w/2,-h/2),Pt(w/2,-h/2),Pt(w/2,h/2),Pt(-w/2,h/2)];
  const big=[Pt(-w/2-.4,-h/2-.4),Pt(w/2+.4,-h/2-.4),Pt(w/2+.4,h/2+.4),Pt(-w/2-.4,h/2+.4)];
  for(const pl of plots)if(aliveO(pl)&&(pl.pts.some(([x,y])=>inQuad(x,y,big))||inQuad(...centre(pl.pts),big)||big.some(([x,y])=>inQuad(x,y,pl.pts))))pl.died=Y;
  for(const p of paths)if(aliveP(p)&&p.kind==='lane'&&p.pts.filter(([x,y])=>inQuad(x,y,big)).length>p.pts.length*.4)p.died=Y;
  addPlace(sq,'square',{name});const ep=addPath([...sq,sq[0]],'edge',{hw:.05});
  // The town hall stands on the far side, facing the square; stone fronts line the rest.
  const th=addLandmark('townhall',...Pt(0,-h/2-3.4),ang,{pull:1.4,reach:15,name,parts:[{poly:R(-6,-2.8,6,2.8),ridge:[[-5.6,0],[5.6,0]],tone:'stone'},{poly:R(-1.4,2.8,1.4,4.2),tone:'tower'},{poly:R(-3.4,-1.2,3.4,1.2),tone:'court'}]});
  for(const pl of plots)if(aliveO(pl)&&pl.pts.some(([x,y])=>Math.hypot(x-th.x,y-th.y)<6.5))pl.died=Y;
  const z=zoneAt(cx,cy);if(z)for(const sd of [1,-1])for(const np of layRow(ep,sd,.5,ep.len-.5,z,{width:()=>2.6+rnd()*1.6,depth:7.5,noGaps:true})){setState(np,{b:'house',style:'stone',dv:.7,gap:0,plan:1});np.built=Y;}
  return th;}
// The bastioned trace: an angular ring with arrow-head bastions, wrapping the town and its gate suburbs.
function bastions(){const old=walls[0],zs=zones.filter(z=>aliveO(z)&&(z.kind==='town'||z.kind==='suburb'));
  const tc=centre(old.poly),n=40,r=new Array(n).fill(0);
  for(const pl of plots)if(aliveO(pl)&&pl.built&&zs.includes(pl.zone))for(const [x,y] of pl.pts){const a=Math.atan2(y-tc[1],x-tc[0]),k=((Math.round(a/(2*Math.PI)*n)%n)+n)%n;r[k]=Math.max(r[k],Math.hypot(x-tc[0],y-tc[1]));}
  for(const [x,y] of old.poly){const a=Math.atan2(y-tc[1],x-tc[0]),k=((Math.round(a/(2*Math.PI)*n)%n)+n)%n;r[k]=Math.max(r[k],Math.hypot(x-tc[0],y-tc[1])+4);}
  const ring=r.map((v,i)=>{const a=i/n*2*Math.PI;return [tc[0]+Math.cos(a)*(v+7),tc[1]+Math.sin(a)*(v+7)];}).filter(([x,y])=>!flood(x,y));
  // Corners: the hull, cut down to about seven; each land corner becomes an arrow-head bastion.
  let H=hull(ring);while(H.length>7){let bi=0,bl=1e9;for(let i=0;i<H.length;i++){const l=dist(H[i],H[(i+1)%H.length]);if(l<bl){bl=l;bi=i;}}const a=H[bi],b=H[(bi+1)%H.length];H.splice(bi,2,[(a[0]+b[0])/2,(a[1]+b[1])/2]);if(bi===H.length)H.shift();}
  const bank=(x)=>1e9;const poly=[];
  for(let i=0;i<H.length;i++){const [x,y]=H[i],[px,py]=H[(i+H.length-1)%H.length],[nx,ny]=H[(i+1)%H.length];
    if(atBank){poly.push(toLand(x,y,tc[0],tc[1]));
      // Along the river the trace follows the bank to the next corner.
      continue;}
    const ux1=(x-px),uy1=(y-py),l1=Math.hypot(ux1,uy1)||1,ux2=(nx-x),uy2=(ny-y),l2=Math.hypot(ux2,uy2)||1;
    const ox=(ux1/l1-ux2/l2),oy=(uy1/l1-uy2/l2),ol=Math.hypot(ox,oy)||1,bx=ox/ol,by=oy/ol;
    // Flanks back along each curtain, then the faces meet at the point.
    poly.push([x-ux1/l1*6,y-uy1/l1*6],[x-ux1/l1*6+bx*3,y-uy1/l1*6+by*3],[x+bx*8,y+by*8],[x+ux2/l2*6+bx*3,y+uy2/l2*6+by*3],[x+ux2/l2*6,y+uy2/l2*6]);}
  for(let i=0;i<poly.length;i++)poly[i]=toLand(poly[i][0],poly[i][1],tc[0],tc[1]);
  const w={poly,born:Y,died:null,gates:[],towers:[],kind:'bastion'};walls.push(w);
  for(const p of paths)if(aliveP(p)&&p.kind==='road')for(let i=1;i<p.pts.length;i++){const a=p.pts[i-1],b=p.pts[i];if(inPoly(...a,poly)!==inPoly(...b,poly))w.gates.push({x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,a:Math.atan2(b[1]-a[1],b[0]-a[0]),road:p});}
  // The glacis: a clear band outside the trace.
  for(const pl of plots)if(aliveO(pl)&&pl.pts.some(([x,y])=>ringDist(x,y,poly)<2.2))pl.died=Y;
  // Suburbs now inside the trace belong to the town.
  for(const z of zones)if(aliveO(z)&&z.kind==='suburb'&&inPoly(z.cx,z.cy,poly)){z.kind='town';z.wall={poly,inside:true};}
  for(const z of zones)if(aliveO(z)&&z.kind==='town')z.wall=inPoly(z.cx,z.cy,poly)?{poly,inside:true}:null;
  return w;}
// ───────────── Enlightenment ─────────────
// A surveyed grid on new land beside the town, aligned to an existing road at (ox,oy).
// nx×ny blocks of bw×bh; one block (gi,gj) is a garden square. Streets are laid at once.
function surveyGrid(ox,oy,ang,nx,ny,bw,bh,name,o={}){const c=Math.cos(ang),sn=Math.sin(ang),Pt=(u,v)=>[ox+u*c-v*sn,oy+u*sn+v*c];
  const W=nx*bw,Hh_=ny*bh,dir=o.dir??-1;// dir -1: the grid extends to the left of the road (away from the river)
  const corners=[Pt(0,0),Pt(W,0),Pt(W,dir*Hh_),Pt(0,dir*Hh_)];
  const z=addZone(corners,'grid',name,{rate:o.rate??3,lay:{width:()=>o.plotW??1.7,depth:bh/2-.9,noGaps:true,noBack:true}});z.uniform=o.style||'classical';z.grid={Pt,bw,bh,nx,ny,dir};
  const okLine=pts=>{const seg=[],out=[];for(const p of pts){if(water(...p)||slopeAt(...p)>STEEP*2.2||inPlace(...p)){if(seg.length>2)out.push(seg.slice());seg.length=0;continue;}seg.push(p);}if(seg.length>2)out.push(seg);return out;};
  const streets=[];
  for(let j=0;j<=ny;j++){const pts=[];for(let u=0;u<=W;u+=1.5)pts.push(Pt(u,dir*j*bh));for(const sg of okLine(pts))streets.push(addPath(sg,'street',{hw:o.hw??.7}));}
  for(let i=0;i<=nx;i++){const pts=[];for(let v=0;v<=Hh_;v+=1.5)pts.push(Pt(i*bw,dir*v));for(const sg of okLine(pts))streets.push(addPath(sg,'street',{hw:o.hw??.7}));}
  if(o.square){const [gi,gj]=o.square,sq=[Pt(gi*bw+1.4,dir*(gj*bh+1.4)),Pt((gi+1)*bw-1.4,dir*(gj*bh+1.4)),Pt((gi+1)*bw-1.4,dir*((gj+1)*bh-1.4)),Pt(gi*bw+1.4,dir*((gj+1)*bh-1.4))];addPlace(sq,'garden',{name:o.squareName||null,formal:true});}
  return z;}
// A tree-lined walk on the glacis, just outside the bastions.
function promenade(){const bw=walls.find(w=>w.kind==='bastion');if(!bw)return;const [cx,cy]=centre(bw.poly);
  const pts=bw.poly.map(([x,y])=>{const d=Math.hypot(x-cx,y-cy)||1;return [x+(x-cx)/d*4.2,y+(y-cy)/d*4.2];}).filter(([x,y])=>!flood(x,y));
  const p=addPath(chaikin(pts,2),'promenade',{hw:.8,name:'the promenade'});return p;}
// A formal public garden: a rectangle with cross walks and a basin.
function publicGarden(cx,cy,w,h,ang,name){const c=Math.cos(ang),sn=Math.sin(ang),Pt=(u,v)=>[cx+u*c-v*sn,cy+u*sn+v*c];
  const pl=addPlace([Pt(-w/2,-h/2),Pt(w/2,-h/2),Pt(w/2,h/2),Pt(-w/2,h/2)],'garden',{name,formal:true});
  for(const o of plots)if(aliveO(o)&&inPoly(...centre(o.pts),pl.poly))o.died=Y;return pl;}

// A home for one household in zone z: the best empty plot, unless new plots on
// dearer frontage (or a new lane into dear land) would beat it.
function findHome(z){
  for(let k=0;k<6;k++){const pl=nextPlot(z),pv=pl?value(...centre(pl.pts)):-1;
    const runs=frontageRuns(z).sort((a,b)=>b.v-a.v),fr=runs[0];
    if(pl&&(!fr||pv>=fr.v*.8))return pl;
    if(fr){layRun(fr,z);continue;}
    if(pl)return pl;
    if(!growLane(z,STREETS(Y))&&!reachLane(z))return null;}
  return nextPlot(z);}
const ROOF={brick:['#9a5f48','#a3664c','#8d5642'],modernist:['#8e918c','#9a9c96'],contemporary:['#7f8f93','#8c9a9c'],works:['#6c665e','#77706a'],shop:['#a07a4c','#aa8452'],timber:['#8a6a52','#93725a','#7f6450','#8c5d48'],stone:['#a3866a','#9b8064','#ad9174','#94785e'],palace:['#b8a27f','#c0aa86'],classical:['#9d958a','#a69e90','#948c80'],farm:['#857557','#8f7d5d']};
function Qf(pl){if(pl.Q)return pl.Q;const [FL,FR,RR,RL]=pl.pts;return pl.Q=(u,v)=>{const ax=FL[0]+(FR[0]-FL[0])*u,ay=FL[1]+(FR[1]-FL[1])*u,bx=RL[0]+(RR[0]-RL[0])*u,by=RL[1]+(RR[1]-RL[1])*u;return [ax+(bx-ax)*v,ay+(by-ay)*v];};}
// A house plan inside its plot (u along the front, v from front to back). dv: share of the plot it covers.
function housePlan(pl,st){if(st.b==='works'){const dv=st.dv;return [{uv:[[.05,0],[.95,0],[.95,dv],[.05,dv]],ridge:[[.5,.03],[.5,dv*.97]]},{uv:[[.2,dv],[.5,dv],[.5,dv*1.12],[.2,dv*1.12]],col:'#5e5850'}];}
  if(st.b==='palace'){const dv=Math.min(st.dv,10/Math.max(1,pl.d)),c0=.28,c1=.72;return [{uv:[[0,0],[1,0],[1,dv],[c1,dv],[c1,dv*.32],[c0,dv*.32],[c0,dv],[0,dv]],ridge:[[.04,dv*.16],[.96,dv*.16]]},{uv:[[c0,dv*.32],[c1,dv*.32],[c1,dv],[c0,dv]],col:'#ddd0b0'}];}
  // A house keeps to the front of its plot: at most ~8 units (32 m) deep, whatever the plot.
  const k=st.plan,dv=Math.min(st.dv,8/Math.max(1,pl.d)),g0=st.gap,a=.38+hsh(pl.id,4)*.25,mir=hsh(pl.id,5)<.5,M=uv=>mir?uv.map(([u,v])=>[1-u,v]).reverse():uv;
  const u0=g0,u1=1-g0,F=dv*.62,uv=(u,v)=>[u0+(u1-u0)*u,v];
  if(st.b==='farm')return [{uv:M([[0,0],[.62,0],[.62,dv*.6],[0,dv*.6]].map(([u,v])=>uv(u,v))),ridge:[uv(.04,dv*.3),uv(.58,dv*.3)]},{uv:M([[.7,.1],[1,.1],[1,dv*1.25],[.7,dv*1.25]].map(([u,v])=>uv(u,v))),ridge:[uv(.85,.14),uv(.85,dv*1.2)],col:'#75684f'}];
  const box=[{uv:[[0,0],[1,0],[1,dv],[0,dv]].map(([u,v])=>uv(u,v)),ridge:[uv(.5,.04),uv(.5,dv*.96)]}];
  if(k===0||pl.w<2.1)return [{uv:[[0,0],[1,0],[1,dv],[0,dv]].map(([u,v])=>uv(u,v)),ridge:pl.w>dv*pl.d?[uv(.02,dv/2),uv(.98,dv/2)]:[uv(.5,.03),uv(.5,dv*.97)]}];
  if(k===1)return [{uv:M([[0,0],[1,0],[1,F],[a,F],[a,dv*1.35],[0,dv*1.35]].map(([u,v])=>uv(u,v))),ridge:[uv(.03,F/2),uv(.97,F/2)]}];       // rear wing
  if(k===2)return [{uv:M([[0,0],[1,0],[1,dv*.8],[a,dv*.8],[a,dv],[0,dv]].map(([u,v])=>uv(u,v))),ridge:[uv(.03,dv*.4),uv(.97,dv*.4)]}];   // stepped back
  if(k===3)return [...box,{uv:M([[.15,dv*1.25],[.6,dv*1.25],[.6,dv*1.6],[.15,dv*1.6]].map(([u,v])=>uv(u,v))),col:'#7a6a52'}];           // outhouse
  return [{uv:[[0,0],[1,0],[1,dv],[0,dv]].map(([u,v])=>uv(u,v)),ridge:[uv(.5,.04),uv(.5,dv*.96)]}];}
function lmPoint(m,x,y){const c=Math.cos(m.a),s=Math.sin(m.a);return [m.x+x*c-y*s,m.y+x*s+y*c];}
// ───────────── adapter: one year of the game city ─────────────
const fed={zones:new Map(),lms:new Set(),walls:new Set(),bridges:new Set(),routes:0,implicit:null};
const cellPoly=(z)=>{const x0=z.x*K,y0=z.y*K,x1=(z.x+z.w)*K,y1=(z.y+z.h)*K,pts=[];
  // A painted rectangle, softened at the corners so quarters are not boxes.
  const r=Math.min(6,(x1-x0)/4,(y1-y0)/4);for(const [cx,cy,a0] of [[x1-r,y0+r,-Math.PI/2],[x1-r,y1-r,0],[x0+r,y1-r,Math.PI/2],[x0+r,y0+r,Math.PI]])for(let k=0;k<=3;k++){const a=a0+k/3*Math.PI/2;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return pts;};
const isChurch=k=>['chapel','monastery','shrine','cathedral','church'].includes(k),isHall=k=>['town_hall','guildhall','guild_hall','civic_center'].includes(k);
function gridZone(z,poly){const [cx,cy]=centre(poly),road=nearPath(cx,cy,80,null,true),a=road.p?at(road.p,nearestS(road.p,[cx,cy])):{tx:1,ty:0};
  const big=Y>=1850,bw=big?26:20,bh=big?22:13,ang=Math.atan2(a.ty,a.tx),xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);
  const nx=Math.max(1,Math.round(w/bw)),ny=Math.max(1,Math.round(h/bh)),c=Math.cos(ang),s=Math.sin(ang);
  const ox=cx-(nx*bw/2)*c+(ny*bh/2)*-s*-1,oy=cy-(nx*bw/2)*s-(ny*bh/2)*c*-1;
  const g=surveyGrid(cx-(nx*bw/2)*c-(ny*bh/2)*s,cy-(nx*bw/2)*s+(ny*bh/2)*c,ang,nx,ny,bw,bh,null,{dir:-1,rate:1.4,style:big?'brick':'classical',square:nx>=3&&ny>=2&&!big?[1,1]:null});g.use=z.type;return g;}
function feed(city){
  // Roads first: the game's main roads, smoothed.
  const routes=city.routes||[];for(;fed.routes<routes.length;fed.routes++){const r=routes[fed.routes];if(!r.cells?.length)continue;const pts=chaikin(r.cells.map(([x,y])=>[(x+.5)*K,(y+.5)*K]),3);if(pts.length>=2)addPath(pts,'road');}
  // Zones painted by this year.
  (city.zones||[]).forEach((z,i)=>{const born=Number(z.year)||Y0;if(born>Y||fed.zones.has(i))return;fed.zones.set(i,null);
    if(z.type==='clear'){const x0=z.x*K,y0=z.y*K,x1=(z.x+z.w)*K,y1=(z.y+z.h)*K;for(const o of zones)if(aliveO(o)&&o.cx>=x0&&o.cx<=x1&&o.cy>=y0&&o.cy<=y1)o.died=Y;return;}
    const poly=cellPoly(z);let o;
    if(z.type!=='farm'&&Y>=1700&&z.w*z.h>=30)o=gridZone(z,poly);
    else o=addZone(poly,z.type==='farm'?'village':'town',null,{use:z.type,rate:z.type==='farm'?.4:1,lay:z.type==='farm'?{width:()=>3.6+rnd()*2.4,depth:11,gapEvery:22}:z.type==='craft'?{width:()=>3+rnd()*2,depth:8}:{}});
    if(o.kind==='town')town.push(o);const w=walls.find(w=>aliveO(w));if(w&&o.kind==='town'&&inPoly(o.cx,o.cy,w.poly))o.wall={poly:w.poly,inside:true};fed.zones.set(i,o);});
  // Before anyone zones, the town grows around its centre (as the game's informal growth does).
  const tgt=target(city,Y);
  if(!fed.implicit||Y%10===0){const r=clamp(10+Math.sqrt(tgt)*2.1,12,70),pp=blob(C0[0],C0[1]-2,r*1.15,r*.85,16,7);
    if(!fed.implicit){fed.implicit=addZone(pp,'town',null,{rate:.9});town.push(fed.implicit);}
    else if(Math.abs((fed.implicit.r||0)-r)>2){fed.implicit.poly=pp;fed.implicit.pc=null;fed.implicit.fr=null;fed.implicit.full=0;zones.polyVer=(zones.polyVer||0)+1;}
    fed.implicit.r=r;const w=walls.find(w=>aliveO(w));if(w&&inPoly(C0[0],C0[1],w.poly))fed.implicit.wall={poly:w.poly,inside:true};}
  // Landmarks from building cards: where the player put them, when they did.
  for(const b of city.buildings||[]){if(!b.special||fed.lms.has(b.id)||(b.born||Y0)>Y)continue;fed.lms.add(b.id);
    const x=(Math.floor(b.x)+1)*K,y=(Math.floor(b.y)+1)*K,k=b.special;
    if(isChurch(k))addLandmark('church',x,y,0,{pull:.9,reach:12,name:b.label||null,parts:churchParts(k==='chapel'?9:14),clear:blob(x,y+.5,k==='chapel'?6:10,k==='chapel'?4.5:7,14,b.id),placeKind:'churchyard'});
    else if(isHall(k)&&Y>=1500)cutSquare(x,y,15,10,b.label||'Town Hall');
    else if(k==='market'||k==='market_hall')addLandmark('market',x,y,0,{pull:1.1,reach:14,name:b.label||null,clear:blob(x,y,5,4,12,b.id),placeKind:'market'});
    else addLandmark(k,x,y,hsh(b.id,9)*.6-.3,{pull:.8,reach:10,name:b.label||null,parts:[{poly:R(-4,-2.6,4,2.6),ridge:[[-3.6,0],[3.6,0]],tone:'stone'},...(['school','university','hospital','clinic','museum','library'].includes(k)?[{poly:R(-2,-1,2,1),tone:'court'}]:[])],clear:blob(x,y,5.5,4,12,b.id)});}
  // Walls the player raised: thrown round the town that stands then; later ones are bastioned.
  (city.walls||[]).forEach((w,i)=>{if(fed.walls.has(i)||(w.built||Y0)>Y)return;fed.walls.add(i);
    if(!walls.length){const pts=plots.filter(p=>aliveO(p)&&p.built&&town.includes(p.zone));if(!pts.length)return;const tc=centre(pts.flatMap(p=>p.pts));const ww=throwWall(tc[0],tc[1],town,2.6);for(const z of town)if(inPoly(z.cx,z.cy,ww.poly))z.wall={poly:ww.poly,inside:true};if((w.built||0)>=1550)bastions();}
    else if((w.built||0)>=1550&&!walls.some(x=>x.kind==='bastion'))bastions();});
  // A wall turned into a boulevard, park or canal: it comes down and its line becomes a ring street.
  for(const w of city.walls||[])if(w.state&&w.state!=='wall'){const yr=conversionYear(city,w);if(yr<=Y)for(const ow of walls)if(aliveO(ow)){ow.died=Y;addPath(chaikin([...ow.poly,ow.poly[0]],1),w.state==='canal'?'street':'boulevard',{hw:w.state==='boulevard'?1.9:1.2});for(const z of zones)if(z.wall?.poly===ow.poly)z.wall=null;}}
  // Bridges.
  for(const b of city.bridges||[]){if(fed.bridges.has(b.id)||(b.built||Y0)>Y||!b.cells?.length)continue;fed.bridges.add(b.id);const a=b.cells[0],c=b.cells.at(-1);const p=addPath([[(a[0]+.5)*K,(a[1]+.5)*K],[(c[0]+.5)*K,(c[1]+.5)*K]],'road',{hw:.9});p.bridge=true;}
  return tgt;}
function conversionYear(city,w){const ev=(city.events||[]).find(e=>e.type==='works'&&/became|ring boulevard|linear park|canal ring/i.test(e.text||''));return ev?ev.year:city.year;}
// How many houses the town should have in a year: the game's buildings then (from its yearly record), in plot terms.
// How many houses the town should have in a year: its people (from the city's yearly record) over
// the people a house holds in that Age. Later Ages build bigger houses, so the count stays drawable.
const PER_HOUSE=y=>y<1500?5.5:y<1700?7:y<1850?10:y<1950?26:40;
function target(city,y){const h=city.history||[];let pop;
  if(!h.length||y>=h.at(-1).year)pop=Number(city.residents)||0;
  else{let a=null,b=null;for(const e of h){if(e.year<=y)a=e;if(e.year>=y&&!b)b=e;}const va=a?a.population:0,vb=b?b.population:va;pop=a&&b&&b.year>a.year?va+(vb-va)*(y-a.year)/(b.year-a.year):va;}
  return Math.round(Math.min(3400,pop/PER_HOUSE(y)));}
// Inside the walls houses grow back over their gardens and wide plots are split.
function infill(){const inside=walls.filter(w=>aliveO(w)&&w.kind!=='bastion');if(!inside.length)return;
  const live=plots.filter(p=>aliveO(p)&&p.built);
  for(let k=0;k<8;k++){const pl=live[Math.floor(rnd()*live.length)];if(!pl)return;const [cx,cy]=centre(pl.pts);if(!inside.some(w=>inPoly(cx,cy,w.poly)))continue;
    const st=stateAt(pl,Y);if(!st||st.b==='palace'||st.b==='works')continue;
    if(st.dv<.78&&rnd()<.6){setState(pl,{dv:clamp(st.dv+.07,.3,.82),plan:st.plan===3?1:st.plan,gap:0});continue;}
    if(pl.w>3.1&&value(cx,cy)>.7&&rnd()<.5){const [FL,FR,RR,RL]=pl.pts,mf=[(FL[0]+FR[0])/2,(FL[1]+FR[1])/2],mb=[(RL[0]+RR[0])/2,(RL[1]+RR[1])/2];pl.died=Y;
      for(const q of [[FL,mf,mb,RL],[mf,FR,RR,mb]]){const np=addPlot(q,{p:pl.p,side:pl.side,zone:pl.zone,kind:'croft',w:pl.w/2,d:pl.d,built:Y});setState(np,{...st,gap:0,plan:Math.floor(hsh(np.id,3)*6)});}}}}

// ───────────── land value and standard of living ─────────────
// Two fields on a 4-unit grid, refreshed every five years. Value: what a plot is worth
// (walls, market, high street, landmarks, parks). Living: what life is like there
// (green space, services within reach, clean air, the riverside, minus crowding).
const FC=4,FW=Math.ceil(WW/FC)+1,FH=Math.ceil(WH/FC)+1;let FV=new Float32Array(FW*FH),FS=new Float32Array(FW*FH).fill(50),fieldYear=-99;
let TG=null;
function boxSum(a,r){const I=new Float64Array((FW+1)*(FH+1));for(let j=0;j<FH;j++)for(let i=0;i<FW;i++)I[(j+1)*(FW+1)+i+1]=a[j*FW+i]+I[j*(FW+1)+i+1]+I[(j+1)*(FW+1)+i]-I[j*(FW+1)+i];
  const o=new Float32Array(FW*FH);for(let j=0;j<FH;j++)for(let i=0;i<FW;i++){const x0=Math.max(0,i-r),y0=Math.max(0,j-r),x1=Math.min(FW,i+r+1),y1=Math.min(FH,j+r+1);o[j*FW+i]=I[y1*(FW+1)+x1]-I[y0*(FW+1)+x1]-I[y1*(FW+1)+x0]+I[y0*(FW+1)+x0];}return o;}
function computeFields(){fieldYear=Y;if(!TG){TG=new Float32Array(FW*FH);for(const [x,y] of trees){const i=clamp(Math.floor(x/FC),0,FW-1),j=clamp(Math.floor(y/FC),0,FH-1);TG[j*FW+i]+=.5;}}const built=new Float32Array(FW*FH),works=new Float32Array(FW*FH),green=Float32Array.from(TG),serv=new Float32Array(FW*FH),river=new Float32Array(FW*FH);
  const cell=(x,y)=>clamp(Math.floor(y/FC),0,FH-1)*FW+clamp(Math.floor(x/FC),0,FW-1);
  for(const pl of plots){if(!aliveO(pl))continue;const [x,y]=centre(pl.pts),k=cell(x,y),st=pl.built?stateAt(pl,Y):null;if(!st){green[k]+=.25;continue;}
    if(st.b==='works')works[k]+=1;else built[k]+=1;green[k]+=clamp(1-st.dv,0,1)*.35;}
  for(const pl of places){if(!aliveO(pl))continue;const xs=pl.poly.map(q=>q[0]),ys=pl.poly.map(q=>q[1]),w=pl.kind==='park'?2.4:pl.kind==='chase'?1.2:pl.kind==='garden'?1.6:pl.kind==='plaza'?.8:pl.kind==='churchyard'?.5:0;
    for(let y=Math.min(...ys);y<=Math.max(...ys);y+=FC)for(let x=Math.min(...xs);x<=Math.max(...xs);x+=FC)if(inPoly(x,y,pl.poly)){green[cell(x,y)]+=w;if(pl.kind==='plaza'||pl.kind==='market')serv[cell(x,y)]+=.6;}}
  for(const m of landmarks)if(aliveO(m))serv[cell(m.x,m.y)]+=m.kind==='museum'?3:2;
  for(let j=0;j<FH;j++)for(let i=0;i<FW;i++){const d=wdAt(i*FC,j*FC);if(anyWater&&d>5&&d<16)river[j*FW+i]=1;}
  const G=boxSum(green,3),D=boxSum(built,2),M=boxSum(works,3),Sv=boxSum(serv,5),Rv=boxSum(river,1);
  const raw=new Float32Array(FW*FH);let vals=[];
  for(let j=0;j<FH;j++)for(let i=0;i<FW;i++){const k=j*FW+i;
    FS[k]=clamp(44+8.5*Math.sqrt(G[k])+5.5*Math.min(5,Sv[k])-8*Math.sqrt(M[k])-Math.max(0,D[k]-16)*1.1+(Rv[k]>2?6:0),0,100);
    if(D[k]+M[k]>0||G[k]>3){raw[k]=value(i*FC+2,j*FC+2);vals.push(raw[k]);}}
  vals.sort((a,b)=>a-b);const top=vals[Math.floor(vals.length*.95)]||1;for(let k=0;k<FW*FH;k++)FV[k]=clamp(raw[k]/top*100,0,100);}
const fAt=(F,x,y)=>F[clamp(Math.floor(y/FC),0,FH-1)*FW+clamp(Math.floor(x/FC),0,FW-1)];
const solAt=(x,y)=>fAt(FS,x,y),valAt=(x,y)=>fAt(FV,x,y);
// Who is looking for a home: most are ordinary families (the best living they can afford), some are wealthy.
let HH='ordinary';
// ───────────── the city evolves ─────────────
// An irrigation canal: water led off the river along the level of the land to the fields; covered over in the 1870s.
function digCanal(){if(!anyWater)return;let best=null,bd=1e9;for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){if(!WM[j*GW+i])continue;const x=i*GS,y=j*GS,d=Math.hypot(x-C0[0],y-C0[1]);if(d>55&&d<95&&Math.abs(d-70)<bd){bd=Math.abs(d-70);best=[x,y];}}
  if(!best)return;const [x0,y0]=toLand(best[0],best[1],C0[0],C0[1]);const a=Math.atan2(C0[1]-y0,C0[0]-x0),tx=C0[0]-Math.cos(a)*18+Math.sin(a)*22,ty=C0[1]-Math.sin(a)*18-Math.cos(a)*22;
  if(flood(tx,ty))return;const pts=route([x0,y0],[tx,ty],{climb:400000,floodCost:0});if(pts.length<4)return;const c=addPath(pts,'canal',{hw:.6,name:'the canal'});c.canal=true;}
// A royal chase: woods and meadow kept for the hunt, well outside the town. When the city surrounds it, it becomes a park.
function makeChase(){let best=null,bs=-1e9;for(let t=0;t<500;t++){const a=hsh(t,1,77)*Math.PI*2,r=55+hsh(t,2,77)*45,x=C0[0]+Math.cos(a)*r,y=C0[1]+Math.sin(a)*r;
    if(x<30||y<30||x>WW-30||y>WH-30||flood(x,y)||inPlot(x,y,18)||inPlace(x,y,20))continue;let tr=0;for(const [tx,ty] of trees)if(Math.abs(tx-x)<20&&Math.abs(ty-y)<14)tr++;const sc=tr*.05-slopeAt(x,y)/STEEP+hsh(t,3,77)*.5;if(sc>bs){bs=sc;best=[x,y];}}
  if(!best)return;const pl=addPlace(blob(best[0],best[1],22,15,18,91),'chase',{name:'the Royal Chase'});for(const o of plots)if(aliveO(o)&&inPoly(...centre(o.pts),pl.poly))o.died=Y;}
function parkWhenSurrounded(){for(const pl of places){if(!aliveO(pl)||pl.kind!=='chase')continue;const [cx,cy]=centre(pl.poly);let n=0,hit=0;
  for(const [x,y] of pl.poly){const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy)||1;n++;if(inPlot(x+dx/d*8,y+dy/d*8,3))hit++;}
  if(hit/n>=.35){pl.kind='park';pl.name=pl.name.replace('the Royal Chase','Chase Park');pl.parked=Y;
    // Walks across the new park.
    const a=pl.poly[0],b=pl.poly[Math.floor(pl.poly.length/2)],c2=pl.poly[Math.floor(pl.poly.length/4)],d2=pl.poly[Math.floor(pl.poly.length*3/4)];addPath(chaikin([a,[cx,cy],b],2),'walk',{hw:.35});addPath(chaikin([c2,[cx,cy],d2],2),'walk',{hw:.35});}}}
// The old market place becomes a plaza (trees, a fountain) once trade has moved to market halls.
function plazas(){let first=true;for(const pl of places)if(aliveO(pl)&&pl.kind==='market'){pl.kind='plaza';pl.name=pl.name==='Gate market'?'Gate Plaza':first?'Plaza Mayor':null;if(pl.name==='Plaza Mayor')first=false;}}
// An abandoned palace becomes a museum.
const MUSEUMS=['the Museum','the Gallery','the Library'];let museums=0;
function museum(){if(museums>=MUSEUMS.length)return;const pals=plots.filter(p=>aliveO(p)&&p.built&&stateAt(p,Y)?.b==='palace');if(!pals.length)return;
  const pl=pals.sort((a,b)=>valAt(...centre(a.pts))-valAt(...centre(b.pts)))[Math.floor(rnd()*Math.min(3,pals.length))];pl.died=Y;
  const [cx,cy]=centre(pl.pts),m=addLandmark('museum',cx,cy,0,{pull:1,reach:12,name:MUSEUMS[museums++],parts:[{abs:true,poly:grow(pl.pts,-.3)},{abs:true,poly:grow(pl.pts,-1.6),tone:'court'}]});}
// Dear land changes use: the street front of the high street and the squares turns to shops; old dear houses are rebuilt.
function marketChange(){for(const pl of plots){if(!aliveO(pl)||!pl.built)continue;const st=stateAt(pl,Y);if(!st||st.b==='palace'||st.b==='works')continue;const [cx,cy]=centre(pl.pts),v=valAt(cx,cy);
  if(st.b==='house'&&v>70&&(pl.p?.high||pl.p?.kind==='edge')&&rnd()<.25)setState(pl,{b:'shop'});
  else if(v>80&&Y-(st.built||Y)>90&&STYLE_BY_YEAR(Y)!==st.style&&rnd()<.15)setState(pl,{style:STYLE_BY_YEAR(Y),dv:clamp(st.dv+.1,.3,.85),built:Y,gap:0});}}
function evolve(){
  if(Y===1310)digCanal();
  if(Y===1580)makeChase();
  if(Y>=1650&&Y%10===0)parkWhenSurrounded();
  if(Y===1865)plazas();
  if(Y>=1830&&Y<=1910&&Y%40===10)museum();
  if(Y===1872)for(const p of paths)if(aliveP(p)&&p.canal&&!p.covered){p.covered=Y;p.kind='street';p.hw=.9;p.name='Canal Street';}
  if(Y%5===0){computeFields();if(Y>=1500)marketChange();}}
function yearStep(city){
  const tgt=feed(city);
  evolve();
  infill();
  if(Y>=1500){rebuildWave();if(Y>=1520&&rnd()<.35)mergePalace();}
  const built=plots.filter(p=>aliveO(p)&&p.built).length;carry=Math.min(60,Math.max(0,tgt-built));
  const live=zones.filter(z=>aliveO(z));
  while(carry>=1){carry-=1;HH=Y>=1500&&rnd()<.22?'wealthy':'ordinary';
    const open=live.filter(o=>!(o.full>Y)),osum=open.reduce((a,o)=>a+o.rate,0);if(!open.length){FAILS++;break;}
    let t=rnd()*osum,z=open[0];for(const o of open){t-=o.rate;if(t<=0){z=o;break;}}
    let pl=findHome(z);if(!pl)z.full=Y+4;
    for(const o of open.slice().sort(()=>rnd()-.5)){if(pl)break;if(o!==z&&!(o.full>Y)){pl=findHome(o);if(!pl)o.full=Y+4;}}
    if(pl)buildOn(pl);else{FAILS++;break;}}
  census.push({y:Y,houses:plots.filter(p=>aliveO(p)&&p.built).length});}
// ───────────── drawing (world units; the caller sets the transform) ─────────────
let g=null;
const trees=[];for(let y=2;y<WH;y+=2.6)for(let x=2;x<WW;x+=2.6){const jx=x+hsh(x*10,y*10,5)*2,jy=y+hsh(x*10,y*10,6)*2;if(slopeAt(jx,jy)>STEEP*1.1&&noise(jx,jy,34,9)>.5&&hsh(x*10,y*10,7)<.8&&!flood(jx,jy)&&!water(jx,jy))trees.push([jx,jy,.7+hsh(x*10,y*10,8)*.6]);}
const poly=pts=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();};
const line=(pts,w,col)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.lineWidth=w;g.strokeStyle=col;g.stroke();};
let ground=null;
function paintGround(){if(typeof document==='undefined')return null;const GR=3,c=document.createElement('canvas');c.width=WW*GR;c.height=WH*GR;const gg=c.getContext('2d'),img=gg.createImageData(c.width,c.height),d=img.data;
  for(let py=0;py<c.height;py++)for(let px=0;px<c.width;px++){const x=px/GR,y=py/GR,h=Hh(x,y),[gx,gy]=grad(x,y),lit=clamp((gx+gy)*-190,-1,1),k=(py*c.width+px)*4;
    let col=[228,220,184];col=col.map((v,i)=>v+([206,194,150][i]-v)*clamp(h*2.4,0,1));const sh=lit>0?[250,245,226]:[128,110,80];col=col.map((v,i)=>v+(sh[i]-v)*Math.abs(lit)*.38);
    if(anyWater){const f=1-smooth((wdAt(x,y)-3)/6);if(f>0)col=col.map((v,i)=>v+([196,208,166][i]-v)*.55*f);}
    d[k]=col[0];d[k+1]=col[1];d[k+2]=col[2];d[k+3]=255;}
  gg.putImageData(img,0,0);gg.scale(GR,GR);
  gg.lineWidth=.18;gg.strokeStyle='rgba(120,92,60,.3)';gg.beginPath();
  for(let j=0;j<GH-1;j++)for(let i=0;i<GW-1;i++){const k=j*GW+i,v=[HG[k],HG[k+1],HG[k+GW+1],HG[k+GW]],lo=Math.min(...v),hi=Math.max(...v),cc=[[i*GS,j*GS],[i*GS+GS,j*GS],[i*GS+GS,j*GS+GS],[i*GS,j*GS+GS]];
    for(let lv=Math.ceil(lo/.02)*.02;lv<hi;lv+=.02){if(lv<.05)continue;const pts=[];for(let e=0;e<4;e++){const a=v[e],b=v[(e+1)%4];if((a<lv)!==(b<lv)){const t=(lv-a)/(b-a);pts.push([cc[e][0]+(cc[(e+1)%4][0]-cc[e][0])*t,cc[e][1]+(cc[(e+1)%4][1]-cc[e][1])*t]);}}if(pts.length>=2){gg.moveTo(...pts[0]);gg.lineTo(...pts[1]);}}}
  gg.stroke();return c;}
// The plan style of an old town survey: buildings are solid ink, public buildings
// solid blue, gardens green, streets and squares the bare paper between them.
const INK={house:'#3b2f27',timber:'#3d3029',stone:'#433730',classical:'#463b34',brick:'#4a3029',modernist:'#43403d',contemporary:'#3f4446',works:'#2e2a28',shop:'#47362a',palace:'#3a2c25',farm:'#5a4c3b'};
const PUBLIC='#3e5a78',GARDEN='#c3c99a',GARDEN_EDGE='rgba(110,118,78,.35)',PAPER='#efe6cf',SQUARE='#f3ecda';
function drawWorld(ctx,year,part='all'){g=ctx;const saveY=Y;Y=year;g.lineJoin='round';g.lineCap='round';
  if(part!=='features'){if(!ground)ground=paintGround();if(ground){g.imageSmoothingEnabled=true;g.drawImage(ground,0,0,WW,WH);}if(part==='ground'){Y=saveY;return;}}
  const live=plots.filter(p=>p.born<=year&&(p.died==null||p.died>year));
  // The built-up ground: the paper the streets and squares are left in.
  g.fillStyle=PAPER;for(const pl of live){poly(grow(pl.pts,1.3));g.fill();}
  for(const pl of places)if(aliveO(pl)){poly(grow(pl.poly,1));g.fill();}
  // Woods outside the town.
  g.fillStyle='rgba(98,122,80,.42)';for(const [x,y,r] of trees){if(inPlot(x,y,1.5)||inPlace(x,y,1))continue;g.beginPath();g.arc(x,y,r,0,7);g.fill();}
  // Country roads: two fine edges; inside the town the street is only the gap between blocks.
  for(const p of paths){if(!aliveP(p)||p.kind==='edge')continue;
    if(p.kind==='path'){g.setLineDash([1,.9]);line(p.pts,.28,'rgba(120,96,66,.7)');g.setLineDash([]);continue;}
    if(p.kind==='canal'){line(p.pts,1.3,'#8fb0ad');line(p.pts,.5,'#a9c6c4');continue;}
    if(p.kind==='walk'){line(p.pts,.6,'#ece4cc');continue;}
    if(p.kind==='rail'){line(p.pts,.9,'#3b2f27');g.setLineDash([.6,.6]);line(p.pts,.45,'#efe6cf');g.setLineDash([]);continue;}
    const w=p.hw*2;line(p.pts,w+.32,'rgba(92,74,52,.55)');line(p.pts,w,PAPER);}
  // Gardens and crofts behind the houses.
  for(const pl of live){poly(pl.pts);g.fillStyle=GARDEN;g.fill();g.lineWidth=.1;g.strokeStyle=GARDEN_EDGE;g.stroke();}
  // Squares, the market, churchyards, public gardens.
  for(const pl of places){if(!aliveO(pl))continue;poly(pl.poly);
    g.fillStyle=pl.kind==='garden'||pl.kind==='park'?'#b4c38a':pl.kind==='chase'?'#c4caa0':pl.kind==='churchyard'?'#cdd2a8':SQUARE;g.fill();
    if(pl.kind==='park'||pl.kind==='chase'){g.fillStyle=pl.kind==='park'?'rgba(78,104,64,.7)':'rgba(98,122,80,.6)';const [cx,cy]=pl.c||centre(pl.poly);for(let i=0;i<90;i++){const x=cx+(hsh(i,7,pl.born)-.5)*46,y=cy+(hsh(i,8,pl.born)-.5)*32;if(inPoly(x,y,pl.poly)){g.beginPath();g.arc(x,y,.7+hsh(i,9)*.5,0,7);g.fill();}}}
    if(pl.kind==='plaza'){const [cx,cy]=centre(pl.poly);g.fillStyle='rgba(78,104,64,.75)';for(const [x,y] of pl.poly){g.beginPath();g.arc(x+(cx-x)*.18,y+(cy-y)*.18,.55,0,7);g.fill();}g.beginPath();g.arc(cx,cy,.9,0,7);g.fillStyle='#8fb0ad';g.fill();}
    if(pl.kind==='garden'){g.fillStyle='rgba(78,104,64,.75)';for(const [x,y] of pl.poly.map((q,i)=>{const r=pl.poly[(i+1)%pl.poly.length];return [(q[0]+r[0])/2,(q[1]+r[1])/2];})){g.beginPath();g.arc(x,y,.6,0,7);g.fill();}}}
  // Promenades and boulevards: rows of trees.
  for(const p of paths)if(aliveP(p)&&(p.kind==='promenade'||p.kind==='boulevard')){g.fillStyle='rgba(78,104,64,.8)';for(let s2=0;s2<p.len;s2+=2.2){const a=at(p,s2);for(const sd of [1,-1]){g.beginPath();g.arc(a.x-a.ty*sd*(p.hw-.3),a.y+a.tx*sd*(p.hw-.3),.5,0,7);g.fill();}}}
  // Walls: a heavy ink line with towers; gates as breaks with two towers.
  for(const w of walls){if(!aliveO(w))continue;poly(w.poly);
    if(w.kind==='bastion'){g.lineWidth=5;g.strokeStyle='rgba(150,165,118,.35)';g.stroke();g.lineWidth=1.5;g.strokeStyle='#2f2620';g.stroke();}
    else{g.lineWidth=1.25;g.strokeStyle='#2f2620';g.stroke();g.fillStyle='#2f2620';for(const [x,y] of w.towers){g.beginPath();g.arc(x,y,1.05,0,7);g.fill();}}
    for(const gt of w.gates){const big=gt===w.main;g.save();g.translate(gt.x,gt.y);g.rotate(gt.a);g.fillStyle=PAPER;g.fillRect(-1.4,-1.5,2.8,3);g.fillStyle='#2f2620';
      g.fillRect(-1.6,-(big?2.9:2.4),3.2,big?1.6:1.2);g.fillRect(-1.6,big?1.3:1.2,3.2,big?1.6:1.2);g.restore();}}
  // Buildings: solid ink, no outline, so neighbours read as one block.
  for(const pl of live){const st=stateAt(pl,year);if(!st)continue;const Q=Qf(pl);g.fillStyle=INK[st.b==='house'?st.style:st.b]||INK.house;
    for(const part of housePlan(pl,st)){if(part.col&&st.b==='palace'){poly(part.uv.map(([u,v])=>Q(u,v)));g.fillStyle=SQUARE;g.fill();g.fillStyle=INK.palace;continue;}poly(part.uv.map(([u,v])=>Q(u,v)));g.fill();}}
  // Public buildings and churches in blue.
  for(const m of landmarks){if(!aliveO(m)||!m.parts.length)continue;for(const part of m.parts){poly(part.abs?part.poly:part.poly.map(([x,y])=>lmPoint(m,x,y)));g.fillStyle=part.tone==='court'?SQUARE:PUBLIC;g.fill();}}
  Y=saveY;}
// A lens over the town: land value (sepia to red) or standard of living (purple to green).
function drawLens(ctx,kind){g=ctx;if(fieldYear<0)computeFields();const F=kind==='value'?FV:FS;
  for(let j=0;j<FH;j++)for(let i=0;i<FW;i++){const x=i*FC,y=j*FC,v=F[j*FW+i];if(!inPlot(x+2,y+2,2)&&!inPlace(x+2,y+2,1))continue;
    g.fillStyle=kind==='value'?`rgba(${150+v},${110-v*.6},${70-v*.4},${.18+v/220})`:v>=50?`rgba(60,140,80,${(v-50)/90})`:`rgba(120,60,130,${(50-v)/80})`;g.fillRect(x,y,FC,FC);}}
// ───────────── public ─────────────
let started=false;
return {
  get year(){return Y;},
  // Advance the map to the city's year, at most `budget` years in this call. Returns true when caught up.
  sync(city,ms=14){if(!started){Y=Y0;started=true;if(!city.center)return true;C0=[(city.center.x+.5)*K,(city.center.y+.5)*K];feed(city);
      const m=addLandmark('market',C0[0],C0[1],0,{pull:1.25,reach:16,name:null,clear:marketPlace(C0,paths.filter(p=>p.kind==='road'&&Math.hypot(at(p,nearestS(p,C0)).x-C0[0],at(p,nearestS(p,C0)).y-C0[1])<4),4.2),placeKind:'market'});
      const mp=places.at(-1).poly,ep=addPath([...mp,mp[0]],'edge',{hw:.05});const z0=zoneAt(C0[0],C0[1]-6)||fed.implicit;if(z0)for(const sd of [1,-1])layRow(ep,sd,.5,ep.len-.5,z0,{width:()=>1.7+rnd()*.7,depth:6,noGaps:true});}
    const end=city.year,t0=(typeof performance!=='undefined'?performance:Date).now();while(Y<end){yearStep(city);Y++;if((typeof performance!=='undefined'?performance:Date).now()-t0>ms)break;}return Y>=end;},
  draw(ctx,year,part){drawWorld(ctx,year,part);},
  lens(ctx,kind){drawLens(ctx,kind);},
  labels(year){const out=[];const sy=Y;Y=year;for(const pl of places)if(aliveO(pl)&&pl.name){const [x,y]=centre(pl.poly);out.push({text:pl.name,x,y,kind:pl.kind});}for(const m of landmarks)if(aliveO(m)&&m.kind==='museum')out.push({text:m.name,x:m.x,y:m.y-3,kind:'museum'});Y=sy;
    // One name per spot: overlapping places (a plaza on an older square) keep the first.
    return out.filter((l,i)=>!out.slice(0,i).some(o=>Math.hypot(o.x-l.x,o.y-l.y)<14));},
  living(){if(fieldYear<0)computeFields();let s=0,n=0,v=0;for(const pl of plots)if(aliveO(pl)&&pl.built){const [x,y]=centre(pl.pts);s+=solAt(x,y);v+=valAt(x,y);n++;}return {sol:n?Math.round(s/n):50,value:n?Math.round(v/n):0};},
  stats(){return {houses:plots.filter(p=>aliveO(p)&&p.built).length,plots:plots.length,paths:paths.length,fails:FAILS};}
};
}
