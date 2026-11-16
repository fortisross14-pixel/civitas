// CIVITAS v3.1 — the organic map. Grown year by year from what the player does
// (zones, landmark cards, walls, bridges) on a heightfield made from the game's
// own water, it draws the town in place of the old grid map. The economy still
// runs on the grid (src/sim.js); this module only reads the city.
// Engine code comes from prototypes/ages.html (one unit ≈ 4 m; K units per grid cell).
/* eslint-disable */
import {FORMS,formOf,formAtYear} from '../zoning.js';
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
let placeSeq=0;
function addPlace(poly,kind,o={}){const pl={id:placeSeq++,poly,kind,born:Y,died:null,...o};places.push(pl);const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);placeBins.add(pl,Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys));return pl;}
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
// Land value, remembered on a 2-unit grid for the rest of the year (it is asked thousands of times).
let vMemo=new Map(),vMemoY=-1;
function valueC(x,y){if(vMemoY!==Y){vMemo.clear();vMemoY=Y;}const k=Math.floor(x/2)*8192+Math.floor(y/2);let v=vMemo.get(k);if(v===undefined){v=value(Math.floor(x/2)*2+1,Math.floor(y/2)*2+1);vMemo.set(k,v);}return v;}
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
function addPlot(pts,o){const pl={id:plots.length,pts,born:Y,died:null,ev:[],...o};const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);plotBins.add(pl,Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys));plots.push(pl);if(rasterOn)rasterPlot(pl);return pl;}
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
    {const st=stubs.find(t=>t.p===p&&t.side===side&&t.s>s-1.3&&t.s<s+(o.width||o.widthR?3.5:3.8)+1.2);if(st){s=st.s+1.45;prevB=null;continue;}}
    if(s>=p.gaps[gk]&&s<p.len-6&&!o.noGaps){const a=at(p,s+1.1),nx=-a.ty*side,ny=a.tx*side;stubs.push({p,s:s+1.1,side,x:a.x,y:a.y,hx:nx,hy:ny,z,born:Y});s+=2.4;prevB=null;p.gaps[gk]=s+every();continue;}
    const w=o.widthR?o.widthR[0]+rnd()*(o.widthR[1]-o.widthR[0]):o.width?o.width():dear?1.6+rnd()*.8:mid?2+rnd()*1.2:2.6+rnd()*1.6,sA=s,sB=Math.min(s1,s+w);if(sB-sA<1.4)break;
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
function zonePaths(z){z.pc=z.pc||new Map();if(z.pcN===paths.length&&z.pcY===Y)return z.pcL;for(const p of paths)if(!z.pc.has(p))z.pc.set(p,nearZone(p,z));z.pcN=paths.length;z.pcY=Y;return z.pcL=[...z.pc].filter(([p,ok])=>ok&&aliveP(p)).map(([p])=>p);}
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
function buildOn(pl){const use=pl.zone.use||'res',fb=pl.zone.b;
  // A planned plot builds what the plan drew there.
  if(pl.slot){const k=pl.slot.plan;setState(pl,{b:k==='villa'?'house':k,style:STYLE_BY_YEAR(Y),dv:k==='villa'?.5:k==='block'?.74+hsh(pl.id,81)*.14:.9,gap:0,plan:k==='villa'?0:-1,built:Y,inset:pl.slot.inset??0,tall:!!pl.slot.tall,villa:k==='villa'});pl.built=Y;return;}
  if(fb&&fb!=='house'){const dvr=pl.zone.dvr,dv=dvr?lerp(dvr[0],dvr[1],rnd()):fb==='palace'?clamp(9/pl.d,.6,.95):fb==='shed'?.82:fb==='tower'?.62:fb==='works'?clamp(5.5/pl.d,.45,.85):clamp(4.5/pl.d,.4,.8);
    setState(pl,{b:fb==='shed'?'shed':fb,style:STYLE_BY_YEAR(Y),dv,gap:fb==='palace'||fb==='shop'?0:.06,plan:0,built:Y});pl.built=Y;return;}
  if(pl.zone.dvr){const [a,b]=pl.zone.dvr;setState(pl,{b:'house',style:STYLE_BY_YEAR(Y),dv:lerp(a,b,rnd()),gap:.1,plan:Math.floor(hsh(pl.id,3)*3),built:Y});pl.built=Y;return;}
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
function addLandmark(kind,x,y,a,o={}){const m={kind,x,y,a,born:Y,died:null,pull:o.pull??1,reach:o.reach??12,name:o.name||null,parts:o.parts||[],inWall:o.inWall??true,bid:o.bid??null};landmarks.push(m);
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
    const A=run[0].A,B=run.at(-1).B;if(!A||!B)continue;const q=[A.f,B.f,B.b,A.b];for(const r of run)r.died=Y;
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
  const z=addZone(corners,'grid',name,{rate:o.rate??3,lay:{widthR:[o.plotW??1.7,o.plotW??1.7],depth:bh/2-.9,noGaps:true,noBack:true}});z.uniform=o.style||'classical';z.grid={Pt,bw,bh,nx,ny,dir};
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

// ───────────── streets as the space between buildings ─────────────
// In the unplanned town there are no street lines: each new house is set beside,
// across from or behind one that stands, and the streets are what is left open.
// Two rules keep that open space a street network: every house keeps its front on
// open ground that is connected to the centre, and two houses either share a wall
// or stand a street apart (no slivers). Planned grids still lay their streets first.
const RC=.8,RW=Math.ceil(WW/RC)+1,RH=Math.ceil(WH/RC)+1;
// OCC: 0 open, -1 a wall, -4 water or steep ground (a road or bridge may cross it), -2 open but never built on (roads, squares, parks),
// -3 a public building, >0 a plot (id+1). REACH: open and connected to the centre.
const OCC=new Int32Array(RW*RH),REACH=new Uint8Array(RW*RH);
var rasterOn=false;let reachDirty=true,rPaths=0,rPlaces=0,rLms=0,rPlots=0,rWalls=0;const rLive=[];
const ri=(x,y)=>clamp(Math.floor(y/RC),0,RH-1)*RW+clamp(Math.floor(x/RC),0,RW-1);
const openC=k=>OCC[k]===0||OCC[k]===-2;
function cellsIn(poly,fn,quad=false){const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),i0=Math.max(0,Math.floor(Math.min(...xs)/RC)),i1=Math.min(RW-1,Math.floor(Math.max(...xs)/RC)),j0=Math.max(0,Math.floor(Math.min(...ys)/RC)),j1=Math.min(RH-1,Math.floor(Math.max(...ys)/RC));
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=(i+.5)*RC,y=(j+.5)*RC;if(quad?inQuad(x,y,poly):inPoly(x,y,poly))fn(j*RW+i);}}
function markDisc(x,y,r,val,list){const i0=Math.max(0,Math.floor((x-r)/RC)),i1=Math.min(RW-1,Math.floor((x+r)/RC)),j0=Math.max(0,Math.floor((y-r)/RC)),j1=Math.min(RH-1,Math.floor((y+r)/RC));
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*RW+i;if(Math.hypot((i+.5)*RC-x,(j+.5)*RC-y)<=r&&(OCC[k]===0||val===-1&&OCC[k]===-2||val===-2&&OCC[k]===-4)){OCC[k]=val;list?.push(k);}}}
function rasterPlot(pl){if(pl.cells)return;pl.cells=[];cellsIn(pl.pts,k=>{const o=OCC[k];if(o===0||o===-2||o>0&&!aliveO(plots[o-1])){OCC[k]=pl.id+1;pl.cells.push(k);}},true);rLive.push(pl);}
function syncRaster(){
  if(!rasterOn){rasterOn=true;for(let j=0;j<RH;j++)for(let i=0;i<RW;i++){const x=(i+.5)*RC,y=(j+.5)*RC;if(flood(x,y)||slopeAt(x,y)>STEEP*1.6)OCC[j*RW+i]=-4;}}
  // What has gone: plots, places, public buildings, walls.
  for(let i=rLive.length-1;i>=0;i--){const pl=rLive[i];if(aliveO(pl))continue;for(const k of pl.cells)if(OCC[k]===pl.id+1)OCC[k]=0;pl.cells=null;rLive.splice(i,1);reachDirty=true;}
  for(const o of [...places,...landmarks,...walls])if(o.cells&&!aliveO(o)){const v=o.cv;for(const k of o.cells)if(OCC[k]===v)OCC[k]=0;o.cells=null;reachDirty=true;}
  // Widened streets claim their new width once the houses in the way are gone.
  for(const p of paths)if(p.rerast){p.rerast=false;for(let s2=0;s2<=p.len;s2+=.4){const a=at(p,s2);markDisc(a.x,a.y,p.hw+.25,-2);}reachDirty=true;}
  // What is new.
  for(;rPaths<paths.length;rPaths++){const p=paths[rPaths];if(!aliveP(p)||p.kind==='edge')continue;const r=p.hw+.25,v=p.kind==='rail'?-1:-2;for(let s=0;s<=p.len;s+=.4){const a=at(p,s);markDisc(a.x,a.y,r,v);}reachDirty=true;}
  for(;rPlaces<places.length;rPlaces++){const pl=places[rPlaces];if(!aliveO(pl))continue;pl.cells=[];pl.cv=-2;cellsIn(pl.poly,k=>{if(OCC[k]===0){OCC[k]=-2;pl.cells.push(k);}});}
  for(;rLms<landmarks.length;rLms++){const m=landmarks[rLms];if(!aliveO(m))continue;m.cells=[];m.cv=-3;for(const part of m.parts)cellsIn(part.abs?part.poly:part.poly.map(([x,y])=>lmPoint(m,x,y)),k=>{if(OCC[k]===0||OCC[k]===-2){OCC[k]=-3;m.cells.push(k);}});reachDirty=true;}
  for(;rWalls<walls.length;rWalls++){const w=walls[rWalls];if(!aliveO(w))continue;w.cells=[];w.cv=-1;const P=[...w.poly,w.poly[0]];
    for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],l=dist(a,b);for(let t=0;t<=l;t+=.4){const x=a[0]+(b[0]-a[0])*t/l,y=a[1]+(b[1]-a[1])*t/l;if(!w.gates.some(g=>Math.hypot(g.x-x,g.y-y)<2.6))markDisc(x,y,.9,-1,w.cells);}}reachDirty=true;}
  for(;rPlots<plots.length;rPlots++){const pl=plots[rPlots];if(aliveO(pl))rasterPlot(pl);}
  if(reachDirty)computeReach();}
function computeReach(){reachDirty=false;REACH.fill(0);let k0=ri(C0[0],C0[1]);
  if(!openC(k0)){let best=-1,bd=1e9;const ci=k0%RW,cj=(k0/RW)|0;for(let j=Math.max(0,cj-30);j<Math.min(RH,cj+30);j++)for(let i=Math.max(0,ci-30);i<Math.min(RW,ci+30);i++){const k=j*RW+i,d=(i-ci)**2+(j-cj)**2;if(openC(k)&&d<bd){bd=d;best=k;}}if(best<0)return;k0=best;}
  const Q=new Int32Array(RW*RH);let h=0,t=0;Q[t++]=k0;REACH[k0]=1;
  while(h<t){const k=Q[h++],i=k%RW;for(const n of [i>0?k-1:-1,i<RW-1?k+1:-1,k-RW,k+RW]){if(n<0||n>=RW*RH||REACH[n]||!openC(n))continue;REACH[n]=1;Q[t++]=n;}}}
// Streets by Age: the narrowest gap allowed between two houses that do not touch, and how wide a new street is.
const STREET_GAP=y=>y<1500?1.2:y<1700?1.6:2.4;
const STREET_W=y=>y<1500?1.9+rnd()*.9:y<1700?2.3+rnd()*1.1:y<1850?2.9+rnd()*1.2:3.4+rnd()*1.6;
// Its front must face open ground connected to the centre (cells in `skip` no longer count).
function frontOpen(q,skip){const [FL,FR,,RL]=q,dl=dist(FL,RL)||1,ox=(FL[0]-RL[0])/dl*.6,oy=(FL[1]-RL[1])/dl*.6;let n=0;
  for(const t of [.15,.32,.5,.68,.85]){const k=ri(FL[0]+(FR[0]-FL[0])*t+ox,FL[1]+(FR[1]-FL[1])*t+oy);if(openC(k)&&REACH[k]&&!skip?.has(k))n++;}return n>=3;}
// Can a plot go here? (zone, free land, the gap rule, its own front, neighbours' fronts, the network stays whole)
function canPlace(q,z){const c=centre(q);if(zoneAt(c[0],c[1])!==z)return false;
  for(const [x,y] of q){const zz=zoneAt(x,y);if(!zz||!accreting(zz)||onWall(x,y))return false;if(z.wall&&!wallOK(x,y,z.wall))return false;}
  const F=[];let bad=false;cellsIn(q,k=>{if(OCC[k]!==0)bad=true;F.push(k);},true);if(bad||F.length<4)return false;
  const FS=new Set(F);if(!frontOpen(q,FS))return false;
  let i0=1e9,i1=-1,j0=1e9,j1=-1;for(const k of F){const i=k%RW,j=(k/RW)|0;i0=Math.min(i0,i);i1=Math.max(i1,i);j0=Math.min(j0,j);j1=Math.max(j1,j);}
  // The gap rule: a house within the forbidden band must also touch.
  const gd=z.detached?2:Math.ceil(STREET_GAP(Y)/RC)+1,E=14,wi0=Math.max(0,i0-E),wi1=Math.min(RW-1,i1+E),wj0=Math.max(0,j0-E),wj1=Math.min(RH-1,j1+E),ww=wi1-wi0+1,wh=wj1-wj0+1;
  const L=(k)=>((((k/RW)|0)-wj0)*ww+(k%RW-wi0)),D=new Uint8Array(ww*wh).fill(255),Qd=[];for(const k of F){D[L(k)]=0;Qd.push(k);}
  const touch=new Set(),near=new Set();
  for(let h=0;h<Qd.length;h++){const k=Qd[h],d=D[L(k)];if(d>=gd-1)continue;const i=k%RW,j=(k/RW)|0;
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const ni=i+di,nj=j+dj;if(ni<wi0||ni>wi1||nj<wj0||nj>wj1)continue;const n=nj*RW+ni,ln=L(n);if(D[ln]<=d+1)continue;D[ln]=d+1;
      const o=OCC[n];if(o>0||o===-3){(d+1===1?touch:near).add(o);continue;}Qd.push(n);}}
  for(const o of near)if(!touch.has(o))return false;
  // Neighbours that touch keep a front on the street.
  for(const o of touch)if(o>0){const b=plots[o-1];if(b&&aliveO(b)&&!frontOpen(b.pts,FS))return false;}
  // The open ground round the plot must not be shut in: each piece of it either joins the others
  // or runs out of the neighbourhood (toward the rest of the town). No pockets, no cut-off fronts.
  const ring=[];for(const k of F){const i=k%RW;for(const n of [i>0?k-1:-1,i<RW-1?k+1:-1,k-RW,k+RW])if(n>=0&&n<RW*RH&&!FS.has(n)&&openC(n)&&REACH[n])ring.push(n);}
  if(!ring.length)return false;const seen=new Uint8Array(ww*wh);
  for(const r0 of ring){if(seen[L(r0)])continue;const Q=[r0];seen[L(r0)]=1;let out=false;
    for(let h=0;h<Q.length&&!out;h++){const k=Q[h],i=k%RW,j=(k/RW)|0;for(const [ni,nj] of [[i-1,j],[i+1,j],[i,j-1],[i,j+1]]){if(ni<wi0||ni>wi1||nj<wj0||nj>wj1){out=true;break;}const n=nj*RW+ni,ln=L(n);if(seen[ln]||FS.has(n)||!openC(n))continue;seen[ln]=1;Q.push(n);}}
    if(!out&&ring.some(k=>!seen[L(k)]))return false;if(!out&&Q.length<ring.length)return false;}
  return true;}
const nrm=v=>{const l=Math.hypot(v[0],v[1])||1;return [v[0]/l,v[1]/l];};
const quadAt=(FL,u,v,w,d)=>[FL,[FL[0]+u[0]*w,FL[1]+u[1]*w],[FL[0]+u[0]*w+v[0]*d,FL[1]+u[1]*w+v[1]*d],[FL[0]+v[0]*d,FL[1]+v[1]*d]];
// Plot sizes by land value and Age (front width, depth with the garden).
function plotSize(x,y,z){const v=valueC(x,y);
  if(z?.lot){const L=z.lot;return {w:lerp(L.w[0],L.w[1],rnd()),d:lerp(L.d[0],L.d[1],rnd())};}
  // Planned quarters: terraces on narrow, shallow plots (a block is two rows back to back).
  if(z?.regular)return Y>=1850?{w:3+rnd()*1.2,d:9+rnd()*1.2}:{w:1.7+rnd()*.5,d:5.6+rnd()*.6};
  if(Y>=1950)return {w:5+rnd()*4,d:9+rnd()*4};if(Y>=1850)return {w:3.6+rnd()*2.6,d:7.5+rnd()*3.5};
  // A house and a small yard: 5–10 m of frontage, 14–28 m deep in all (not the long medieval strip croft).
  if(Y>=1850)return {w:3.6+rnd()*2.4,d:6+rnd()*2.5};
  return v>.95?{w:1.5+rnd()*.8,d:3.4+rnd()*1.2}:v>.5?{w:1.9+rnd()*1.1,d:3.8+rnd()*1.6}:{w:2.3+rnd()*1.5,d:4.2+rnd()*2.4};}
// Where the next house in zone z could go: beside, across the street from, or behind a house that stands; or on a road.
function accrete(z){const xs=z.poly.map(p=>p[0]),ys=z.poly.map(p=>p[1]),built=[];
  // Any house near the zone can start the next one (a new quarter grows out of the old town).
  // Houses of this zone first; houses just over its edge let a new quarter grow out of the old town.
  let edge=[];if(z.acY!==Y){z.acY=Y;z.acB=[];z.acE=[];plotBins.near(Math.min(...xs)-8,Math.min(...ys)-8,Math.max(...xs)+8,Math.max(...ys)+8,o=>{if(!aliveO(o)||!o.built)return;if(o.zone===z||zoneAt(...centre(o.pts))===z)z.acB.push(o);else z.acE.push(o);});z.acB.sort((a,b)=>a.id-b.id);}
  // Only houses with a side still free can start the next one.
  for(const o of z.acB)if(o.mv!==0&&o.built&&aliveO(o))built.push(o);edge=z.acE.filter(o=>o.mv!==0&&aliveO(o));const roadShare=built.length<3?.7:.12;
  const cand=[],regular=Y>=1800,quick=q=>{const c=centre(q),zc=zoneC(c[0],c[1]);if(zc!==z)return false;for(const [x,y] of [c,...grow(q,-.7)])if(OCC[ri(x,y)]!==0)return false;return true;};
  for(let t=0;t<60&&cand.length<14;t++){
    if((built.length||edge.length)&&rnd()>roadShare){const P=!built.length||edge.length&&rnd()<.15?edge[Math.floor(rnd()*edge.length)]:rnd()<.6?built[Math.max(0,built.length-1-Math.floor(rnd()*Math.min(80,built.length)))]:built[Math.floor(rnd()*built.length)];
      const [FL,FR,RR,RL]=P.pts,u=nrm([FR[0]-FL[0],FR[1]-FL[1]]),v=nrm([RL[0]-FL[0],RL[1]-FL[1]]),{w,d}=plotSize(...centre(P.pts),P.zone?.regular||P.zone?.lot?P.zone:z);
      // Sides still free: 1 right, 2 left, 4 across the street, 8 behind.
      if(P.mv==null)P.mv=15;if(P.next&&aliveO(P.next))P.mv&=~1;if(P.prev&&aliveO(P.prev))P.mv&=~2;if(!P.mv)continue;
      const opts=[[1,.34],[2,.34],[4,.2],[8,.12]].filter(([b])=>P.mv&b),tot=opts.reduce((a,[,w])=>a+w,0);let rr=rnd()*tot,bit=opts[0][0];for(const [b,w] of opts){rr-=w;if(rr<=0){bit=b;break;}}
      const r=bit===1?.1:bit===2?.5:bit===4?.75:.95;
      // Rows bend to follow the level of the land, a little; later Ages keep them straight.
      const R=P.zone?.regular||z.regular;let u2=u;
      if(R){let best=null,bd=-2;for(let k=0;k<4;k++){const an=R.ang+k*Math.PI/2,cu=[Math.cos(an),Math.sin(an)],dd=cu[0]*u[0]+cu[1]*u[1];if(dd>bd){bd=dd;best=cu;}}u2=best;}
      else if(!regular){const [gx,gy]=grad(FR[0],FR[1]),sl=Math.hypot(gx,gy);if(sl>1e-6){let tx=-gy/sl,ty=gx/sl;if(tx*u[0]+ty*u[1]<0){tx=-tx;ty=-ty;}const k=clamp(sl/(STEEP*.45),0,1)*.65;u2=nrm([u[0]*(1-k)+tx*k,u[1]*(1-k)+ty*k]);}
        const a=(rnd()-.5)*(Y<1500?.14:.06),c=Math.cos(a),sn=Math.sin(a);u2=[u2[0]*c-u2[1]*sn,u2[0]*sn+u2[1]*c];}
      let v2=[-u2[1],u2[0]];if(v2[0]*v[0]+v2[1]*v[1]<0)v2=[-v2[0],-v2[1]];let c;
      // A row is broken by a cross street: in a planned quarter every few houses, in the old town now and then.
      const runLen=(o,k)=>{let n=0;while(o&&n<16){o=o[k];n++;}return n;};
      const det=(P.zone?.detached||z.detached||0),brk=m=>{const n=runLen(P,m==='right'?'prev':'next');return (R?(n%R.block===R.block-1?R.S:0):(n>=3&&rnd()<.08?STREET_W(Y)*.8:0))+det;};
      if((P.zone?.curve||z.curve)&&!R){const a=(noise(FR[0],FR[1],30,61)-.5)*.5,c=Math.cos(a),sn=Math.sin(a);u2=[u2[0]*c-u2[1]*sn,u2[0]*sn+u2[1]*c];v2=[-u2[1],u2[0]];if(v2[0]*v[0]+v2[1]*v[1]<0)v2=[-v2[0],-v2[1]];}
      if(r<.34){const g=brk('right');c={q:quadAt([FR[0]+u2[0]*g,FR[1]+u2[1]*g],u2,v2,w,d),P,m:g?'gapR':'right',w,d,bias:.45};}
      else if(r<.68){const g=brk('left');c={q:quadAt([FL[0]-u2[0]*(w+g),FL[1]-u2[1]*(w+g)],u2,v2,w,d),P,m:g?'gapL':'left',w,d,bias:.45};}
      else if(r<.88){const S=R?R.S:STREET_W(Y),fc=[(FL[0]+FR[0])/2-v[0]*S,(FL[1]+FR[1])/2-v[1]*S],uu=[-u[0],-u[1]],vv=[-v[0],-v[1]],sh=regular?0:(rnd()-.5)*w;
        c={q:quadAt([fc[0]-uu[0]*(w/2+sh),fc[1]-uu[1]*(w/2+sh)],uu,vv,w,d),P,m:'across',w,d,bias:.2};}
      else{const bc=[(RL[0]+RR[0])/2+v[0]*d,(RL[1]+RR[1])/2+v[1]*d],uu=[-u[0],-u[1]],vv=[-v[0],-v[1]];c={q:quadAt([bc[0]-uu[0]*w/2,bc[1]-uu[1]*w/2],uu,vv,w,d),P,m:'behind',w,d,bias:0};}
      c.bit=bit;if(quick(c.q))cand.push(c);else P.mv&=~bit;}
    else if(built.length<2&&rnd()<.6){
      // A first house in an empty quarter: on open land in it, facing the nearest way in (a road, or the town).
      const x=lerp(Math.min(...xs),Math.max(...xs),rnd()),y=lerp(Math.min(...ys),Math.max(...ys),rnd());if(zoneC(x,y)!==z||OCC[ri(x,y)]!==0)continue;
      const np=nearPath(x,y,40,null,true),tx=np.p?np.x:C0[0],ty=np.p?np.y:C0[1],toward=nrm([tx-x,ty-y]),R=z.regular;let v=[-toward[0],-toward[1]];
      if(R){let best=null,bd=-2;for(let k=0;k<4;k++){const an=R.ang+k*Math.PI/2,cu=[Math.cos(an),Math.sin(an)],dd=cu[0]*v[0]+cu[1]*v[1];if(dd>bd){bd=dd;best=cu;}}v=best;}
      if(!R){const [gx,gy]=grad(x,y),sl=Math.hypot(gx,gy);if(sl>STEEP*.3){let nv=[gx/sl,gy/sl];if(nv[0]*v[0]+nv[1]*v[1]<0)nv=[-nv[0],-nv[1]];v=nv;}}
      const u=[v[1],-v[0]],{w,d}=plotSize(x,y,z),c={q:quadAt([x-u[0]*w/2,y-u[1]*w/2],u,v,w,d),m:'seed',w,d,bias:-.2-(np.p?np.d*.02:1)};if(quick(c.q))cand.push(c);}
    else{const ps=zonePaths(z).filter(p=>p.kind!=='edge'&&p.kind!=='rail'&&p.kind!=='canal');const p=ps[Math.floor(rnd()*ps.length)];if(!p||p.len<3)continue;
      let s=1+rnd()*(p.len-2);for(let k=0;k<8;k++){const t=at(p,s);if(zoneC(t.x,t.y)===z)break;s=1+rnd()*(p.len-2);}
      const side=rnd()<.5?1:-1,a0=at(p,s),R=z.regular,sq=R?(()=>{let best=null,bd=-2;for(let k=0;k<4;k++){const an=R.ang+k*Math.PI/2,cu=[Math.cos(an),Math.sin(an)],dd=cu[0]*a0.tx*side+cu[1]*a0.ty*side;if(dd>bd){bd=dd;best=cu;}}return best;})():null,
        a=sq?{...a0,tx:sq[0]*side,ty:sq[1]*side}:a0,n=[-a.ty*side,a.tx*side],u=[a.tx*side,a.ty*side],f=[a.x+n[0]*(p.hw+.3),a.y+n[1]*(p.hw+.3)],{w,d}=plotSize(f[0],f[1],z);
      const c={q:quadAt([f[0]-u[0]*w/2,f[1]-u[1]*w/2],u,n,w,d),road:p,m:'road',w,d,bias:.1};if(quick(c.q))cand.push(c);}}
  // Households choose as before: dear land, the living they can afford, neighbours.
  for(const c of cand){const [cx,cy]=centre(c.q),S=solAt(cx,cy),V=valAt(cx,cy);let nb=0;plotBins.near(cx-6,cy-6,cx+6,cy+6,o=>{if(aliveO(o)&&o.built)nb++;});
    // Households like neighbours: the town stays compact and rows fill before new ones start.
    let lev=0;if(!(zoneC(cx,cy)?.regular)){const [gx,gy]=grad(cx,cy),sl=Math.hypot(gx,gy);if(sl>1e-6){const [FL,FR]=c.q,ux=FR[0]-FL[0],uy=FR[1]-FL[1],ul=Math.hypot(ux,uy)||1;lev=(1-Math.abs((ux*gx+uy*gy)/(ul*sl)))*clamp(sl/(STEEP*.5),0,1)-.5*clamp(sl/(STEEP*.5),0,1);}}
    c.sc=1.3*valueC(cx,cy)+(HH==='wealthy'?S/22+V/35:S/26-V/70)+c.bias+Math.min(nb,8)*.3+lev*1.2-slopeAt(cx,cy)/STEEP*.4+rnd()*.6;}
  cand.sort((a,b)=>b.sc-a.sc);
  for(const c of cand.slice(0,7)){const zc=zoneAt(...centre(c.q));if(!zc||!canPlace(c.q,zc)){if(c.P&&c.bit&&rnd()<.5)c.P.mv&=~c.bit;continue;}const [FL,FR,RR,RL]=c.q;
    let road=c.road||null;if(!road){const np=nearPath((FL[0]+FR[0])/2,(FL[1]+FR[1])/2,2.5,null,true);if(np.p&&np.d<1.2)road=np.p;}
    const pl=addPlot(c.q,{p:road,side:1,zone:zc,kind:'croft',w:c.w,d:c.d,A:{f:FL,b:RL,d:c.d},B:{f:FR,b:RR,d:c.d},acc:true});
    if(c.m==='right'&&!c.P.next){c.P.next=pl;pl.prev=c.P;}else if(c.m==='left'&&!c.P.prev){c.P.prev=pl;pl.next=c.P;}
    rasterPlot(pl);if(zc.acY===Y)zc.acB.push(pl);return pl;}
  return null;}
let zMemo=new Map(),zMemoV=-1;
function zoneC(x,y){const v=zones.length+(zones.polyVer||0)+Y*1e5;if(zMemoV!==v){zMemo.clear();zMemoV=v;}const k=Math.floor(x)*8192+Math.floor(y);let z=zMemo.get(k);if(z===undefined){z=zoneAt(Math.floor(x)+.5,Math.floor(y)+.5);zMemo.set(k,z);}return z;}
const accreting=z=>(z.kind==='town'||z.kind==='suburb')&&!z.grid&&!z.plan;

// ───────────── planned districts (Modern and Contemporary) ─────────────
// A planned form lays its streets and its building plots across the whole zone at once,
// squared to the nearest road; the game's buildings then fill the plots (nextSlot).
//   ues     High-density grid: long narrow blocks between wide avenues and close cross
//           streets, walls of tall apartment buildings back to back (Upper East Side).
//   pudong  High-density free: superblocks between wide roads, towers and slabs set apart
//           on lawns, each block turned its own way.
//   linear  Medium-density linear city: one long tree-lined spine, short cross streets,
//           villas in gardens (Arturo Soria).
//   suburb  Low density: a loop road, cul-de-sacs, detached houses in gardens.
//   cbd     Offices: square blocks, towers lined up with the streets.
//   estate  Industry: a road grid of big sheds and yards.
const PLAN={
  ues:{block:[44,18],gapU:5,gapV:3,hwU:2.4,hwV:1.4,b:'block'},
  cbd:{block:[22,22],gapU:4,gapV:4,hwU:1.9,hwV:1.9,b:'tower'},
  estate:{block:[40,30],gapU:4,gapV:4,hwU:1.6,hwV:1.6,b:'shed'},
  pudong:{block:[44,44],gapU:6,gapV:6,hwU:2.8,hwV:2.8,b:'tower',fit:true},
  linear:{},suburb:{}};
function frameFor(z,o){const x0=z.x*K,y0=z.y*K,x1=(z.x+z.w)*K,y1=(z.y+z.h)*K,cx=(x0+x1)/2,cy=(y0+y1)/2;
  const road=nearPath(cx,cy,90,null,true),a=road.p?at(road.p,nearestS(road.p,[cx,cy])):{tx:1,ty:0};let ang=Math.atan2(a.ty,a.tx);
  // Lay the long side of the blocks along the zone's long side when the road gives no strong lead.
  const W=x1-x0,H=y1-y0,c=Math.cos(ang),s0=Math.sin(ang);if(Math.abs(c)>Math.abs(s0)!==(W>=H)&&Math.min(W,H)<40)ang+=Math.PI/2;
  const u=[Math.cos(ang),Math.sin(ang)],v=[-u[1],u[0]],cr=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const pu=cr.map(([x,y])=>(x-cx)*u[0]+(y-cy)*u[1]),pv=cr.map(([x,y])=>(x-cx)*v[0]+(y-cy)*v[1]);
  return {cx,cy,u,v,u0:Math.min(...pu),u1:Math.max(...pu),v0:Math.min(...pv),v1:Math.max(...pv),W:(z.w)*K,H:(z.h)*K,P:(a,b)=>[cx+u[0]*a+v[0]*b,cy+u[1]*a+v[1]*b],rect:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]]};}
const inRect=(x,y,r)=>x>=r[0][0]&&x<=r[2][0]&&y>=r[0][1]&&y<=r[2][1];
const dry=(x,y)=>!flood(x,y)&&slopeAt(x,y)<STEEP*2.2;
// A street from local a to b, kept to the zone and dry land (in runs).
function planStreet(F,a,b,kind,hw,o,name){{const L0=Math.hypot(b[0]-a[0],b[1]-a[1])||1,ux=(b[0]-a[0])/L0,uy=(b[1]-a[1])/L0;a=[a[0]+ux*hw,a[1]+uy*hw];b=[b[0]-ux*hw,b[1]-uy*hw];}const L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(2,Math.ceil(L/1.5)),run=[];let made=0;
  const flush=()=>{if(run.length>=3){const p=addPath(run.slice(),kind,{hw,name});p.planned=o;made++;
    // Older houses in the new street's way are rebuilt out of it over the years.
    for(let s2=0;s2<=p.len;s2+=1.5){const q=at(p,s2);plotBins.near(q.x-hw-1,q.y-hw-1,q.x+hw+1,q.y+hw+1,pl=>{if(aliveO(pl)&&pl.zone!==o&&(inQuad(q.x,q.y,pl.pts)||edgeDist(q.x,q.y,pl.pts)<hw))pl.conv=o;});}}run.length=0;};
  for(let i=0;i<=n;i++){const t=i/n,[x,y]=F.P(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);if(inRect(x,y,F.rect)&&dry(x,y))run.push([x,y]);else flush();}flush();return made;}
// A building plot from local quad corners (front-left, front-right, back-right, back-left).
function planSlot(F,o,q,opt={}){const w=q.map(([a,b])=>F.P(a,b));for(const [x,y] of w)if(!inRect(x,y,F.rect)||!dry(x,y))return null;const [cx,cy]=centre(w);if(!dry(cx,cy))return null;
  const pl=addPlot(w,{zone:o,kind:'slot',w:Math.hypot(w[1][0]-w[0][0],w[1][1]-w[0][1]),d:Math.hypot(w[3][0]-w[0][0],w[3][1]-w[0][1]),A:{f:w[0],b:w[3]},B:{f:w[1],b:w[2]},slot:opt});o.slotN++;return pl;}
const rot=(a,b,ang)=>[a*Math.cos(ang)-b*Math.sin(ang),a*Math.sin(ang)+b*Math.cos(ang)];
function planDistrict(o,F,z){const kind=F.plan,G=PLAN[kind]||{},Fr=frameFor(z,o);o.plan=kind;o.slotN=0;o.cellN=z.w*z.h;o.regular=null;
  const {u0,u1,v0,v1}=Fr;
  if(G.block){let [bu,bv]=G.block;if(G.fit){bu=Math.min(bu,u1-u0-G.gapU);bv=Math.min(bv,v1-v0-G.gapV);}const su=bu+G.gapU,sv=bv+G.gapV;
    // Streets: avenues across u, cross streets across v, on the block lines (offset so blocks sit whole).
    const nu=Math.max(1,Math.floor((u1-u0+G.gapU)/su)),nv=Math.max(1,Math.floor((v1-v0+G.gapV)/sv));
    const ou=u0+((u1-u0)-(nu*su-G.gapU))/2,ov=v0+((v1-v0)-(nv*sv-G.gapV))/2;
    for(let i=0;i<=nu;i++){const uu=ou+i*su-G.gapU/2;planStreet(Fr,[uu,v0],[uu,v1],'avenue',G.hwU/1.1,o);}
    for(let j=0;j<=nv;j++){const vv=ov+j*sv-G.gapV/2;planStreet(Fr,[u0,vv],[u1,vv],'street',G.hwV/1.1,o);}
    for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a0=ou+i*su,b0=ov+j*sv,h=hsh(z.x+i,z.y+j,71);
      if(kind==='ues'){// two rows back to back along the long sides; corner buildings
        const d=bv/2;let a=a0;while(a<a0+bu-2.5){const w=Math.min(a0+bu-a,3.2+hsh(Math.round(a*7),j,72)*1.4);if(w<2.4)break;
          planSlot(Fr,o,[[a,b0],[a+w,b0],[a+w,b0+d],[a,b0+d]],{plan:'block'});planSlot(Fr,o,[[a+w,b0+bv],[a,b0+bv],[a,b0+bv-d],[a+w,b0+bv-d]],{plan:'block'});a+=w;}}
      else if(kind==='cbd'){const n=h<.4?1:h<.75?2:4,m=n===4?2:n,k=n===4?2:1,tw=(bu-2)/m,tv=(bv-2)/k;for(let p=0;p<m;p++)for(let q=0;q<k;q++){const a=a0+1+p*tw,b=b0+1+q*tv;planSlot(Fr,o,[[a,b],[a+tw-1,b],[a+tw-1,b+tv-1],[a,b+tv-1]],{plan:'tower',inset:n===1?.18:.12});}}
      else if(kind==='estate'){const n=h<.5?2:3,tw=bu/n;for(let p=0;p<n;p++){const a=a0+p*tw;planSlot(Fr,o,[[a+.6,b0+.6],[a+tw-.6,b0+.6],[a+tw-.6,b0+bv-.6],[a+.6,b0+bv-.6]],{plan:'shed'});}}
      else if(kind==='pudong'){// a lawn, towers and slabs on it, the whole block turned its own way
        const lawn=[[a0+1,b0+1],[a0+bu-1,b0+1],[a0+bu-1,b0+bv-1],[a0+1,b0+bv-1]].map(([a,b])=>Fr.P(a,b));if(lawn.every(([x,y])=>inRect(x,y,Fr.rect)&&dry(x,y)))addPlace(lawn,'lawn',{});
        const ang=(h-.5)*.9,cu=a0+bu/2,cv=b0+bv/2,step=13,nu2=Math.max(1,Math.floor((bu-4)/step)),nv2=Math.max(1,Math.floor((bv-4)/step));
        for(let p2=0;p2<nu2;p2++)for(let q2=0;q2<nv2;q2++){const t=p2*7+q2,hh=hsh(i,j,t,73);if(hh<.12)continue;const slab=hh<.36,hw=slab?7:4,hd=slab?2.6:4;
          const lu=(p2-(nu2-1)/2)*step+(hsh(i,j,t,74)-.5)*2.5,lv=(q2-(nv2-1)/2)*step+(hsh(i,j,t,75)-.5)*2.5,[du,dv]=rot(lu,lv,ang);
          const q=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([a,b])=>{const [ra,rb]=rot(a,b,ang);return [cu+du+ra,cv+dv+rb];});planSlot(Fr,o,q,{plan:'tower',inset:.02,tall:!slab});}}}
    return;}
  if(kind==='linear'){// the spine down the long axis, cross streets every 22 units, villas both sides
    const L=u1-u0,Wd=v1-v0;planStreet(Fr,[u0,0],[u1,0],'boulevard',2.3,o,'the Avenue');
    for(let a=u0+11;a<u1-4;a+=22)planStreet(Fr,[a,v0],[a,v1],'street',.8,o);
    const lot=(a,b,side)=>planSlot(Fr,o,side>0?[[a,b],[a+6,b],[a+6,b+side*9],[a,b+side*9]]:[[a+6,b],[a,b],[a,b+side*9],[a+6,b+side*9]],{plan:'villa'});
    for(const side of [1,-1])for(let a=u0+1;a<u1-6;a+=7.2){if(((a-u0-11)%22+22)%22<2.2||((a-u0-11)%22+22)%22>20.4)continue;lot(a,side*3.2,side);if(Wd>34)lot(a,side*(3.2+9+3),side);}
    return;}
  if(kind==='suburb'){// a winding collector down the long axis, curving cul-de-sacs off it, houses along every street
    const L=u1-u0,Wd=v1-v0,mid=[],amp=Math.min(6,Wd*.12);for(let a=u0+2;a<=u1-2;a+=3)mid.push([a,Math.sin((a-u0)/Math.max(20,L)*Math.PI*1.6+hsh(z.x,z.y,90)*6)*amp]);
    const roads=[];const mk=(pts,hw)=>{const w=chaikin(pts.map(([a,b])=>Fr.P(a,b)),2).filter(([x,y])=>inRect(x,y,Fr.rect)&&dry(x,y));if(w.length<4)return null;const p=addPath(w,'street',{hw});p.planned=o;roads.push(p);return p;};
    mk(mid,.85);
    // Cul-de-sacs: every 24 units, alternating sides, bending as they go, a turning circle at the end.
    let side=1;for(let a=u0+10;a<u1-8;a+=24){for(const sd of Wd>30?[1,-1]:[side]){const base=mid.reduce((b2,q)=>Math.abs(q[0]-a)<Math.abs(b2[0]-a)?q:b2,mid[0]),len=Wd/2-4-Math.abs(base[1]);if(len<8)continue;
      const bend=(hsh(a|0,sd,91)-.5)*8,pts=[];for(let t=0;t<=1.001;t+=.2)pts.push([a+bend*t*t,base[1]+sd*(1.2+t*len)]);const p=mk(pts,.7);
      if(p){const e=p.pts.at(-1);addPlace(blob(e[0],e[1],2.6,2.6,10,a|0),'turn',{});}}side=-side;}
    // Houses along each street, both sides, turned to face it.
    for(const p of roads)for(const sd of [1,-1])for(let s2=4;s2<p.len-3;s2+=6.4){const a=at(p,s2),nx=-a.ty*sd,ny=a.tx*sd,tx=a.tx*sd,ty=a.ty*sd,off=p.hw+1.4,w=5,d=8.5,
        fl=[a.x+nx*off-tx*w/2,a.y+ny*off-ty*w/2],q=[fl,[fl[0]+tx*w,fl[1]+ty*w],[fl[0]+tx*w+nx*d,fl[1]+ty*w+ny*d],[fl[0]+nx*d,fl[1]+ny*d]];
      if(q.some(([x,y])=>!inRect(x,y,Fr.rect)||!dry(x,y)||inPlot(x,y,.2)||inPlace(x,y)))continue;const c2=centre(q);if(nearPath(c2[0],c2[1],6,p,true).d<1)continue;
      addPlot(q,{zone:o,kind:'slot',w,d,A:{f:q[0],b:q[3]},B:{f:q[1],b:q[2]},slot:{plan:'villa'}});o.slotN++;}
    return;}
}
// The next plot of a planned district to build: the one nearest what is already built, free of older houses.
function nextSlot(z){const empty=plots.filter(p=>aliveO(p)&&!p.built&&p.zone===z);if(!empty.length)return null;
  const built=plots.filter(p=>aliveO(p)&&p.built&&p.zone===z);let best=null,bs=-1e9;
  for(let t=0;t<Math.min(30,empty.length);t++){const pl=empty.length<=30?empty[t]:empty[Math.floor(rnd()*empty.length)],[cx,cy]=centre(pl.pts);
    let blocked=false;for(const [x,y] of [[cx,cy],...grow(pl.pts,-.4)]){const o=inPlot(x,y,0);if(o&&o!==pl&&o.built){blocked=true;break;}}if(blocked)continue;
    let near=1e9;for(const b of built.length>60?built.slice(-60):built){const [bx,by]=centre(b.pts);near=Math.min(near,Math.hypot(bx-cx,by-cy));}
    const d=built.length?near:Math.hypot(cx-C0[0],cy-C0[1])*.2,sc=-d*.15+valueC(cx,cy)+rnd()*.8;if(sc>bs){bs=sc;best=pl;}}
  if(best&&best.cells){for(const k of best.cells)if(OCC[k]===best.id+1)OCC[k]=0;best.cells=null;const i=rLive.indexOf(best);if(i>=0)rLive.splice(i,1);rasterPlot(best);}
  return best;}
// A home for one household in zone z: the best empty plot, unless new plots on
// dearer frontage (or a new lane into dear land) would beat it.
function findHome(z){
  if(z.plan)return nextSlot(z);
  if(accreting(z)){const pl=nextPlot(z);if(pl&&rnd()<.7)return pl;for(let k=0;k<3;k++){const a=accrete(z);if(a)return a;}return pl;}
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
function housePlan(pl,st){
  if(st.villa)return [{uv:[[.2,.14],[.8,.14],[.8,.56],[.2,.56]]}];
  if(st.b==='block')return [{uv:[[.01,0],[.99,0],[.99,st.dv],[.01,st.dv]]}];
  if(st.b==='tower'&&pl.slot){const m=st.inset||0;return [{uv:[[m,m],[1-m,m],[1-m,1-m],[m,1-m]]}];}
  if(st.b==='shed'&&pl.slot)return [{uv:[[.04,.06],[.96,.06],[.96,.7],[.04,.7]]}];
  if(st.b==='tower'||st.b==='shed'){const dv=st.dv,m=st.b==='tower'?.12:.04;return [{uv:[[m,.04],[1-m,.04],[1-m,dv],[m,dv]]}];}
  if(st.b==='works'){const dv=st.dv;return [{uv:[[.05,0],[.95,0],[.95,dv],[.05,dv]],ridge:[[.5,.03],[.5,dv*.97]]},{uv:[[.2,dv],[.5,dv],[.5,dv*1.12],[.2,dv*1.12]],col:'#5e5850'}];}
  if(st.b==='palace'&&pl.d<7)return [{uv:[[0,0],[1,0],[1,.92],[0,.92]],ridge:[[.04,.46],[.96,.46]]}];
  if(st.b==='palace'){const dv=Math.min(st.dv,10/Math.max(1,pl.d)),c0=.28,c1=.72;return [{uv:[[0,0],[1,0],[1,dv],[c1,dv],[c1,dv*.32],[c0,dv*.32],[c0,dv],[0,dv]],ridge:[[.04,dv*.16],[.96,dv*.16]]},{uv:[[c0,dv*.32],[c1,dv*.32],[c1,dv],[c0,dv]],col:'#ddd0b0'}];}
  // A house keeps to the front of its plot: at most ~8 units (32 m) deep, whatever the plot.
  const k=st.plan,dv=Math.min(st.dv,8/Math.max(1,pl.d)),g0=st.gap,a=.38+hsh(pl.id,4)*.25,mir=hsh(pl.id,5)<.5,M=uv=>mir?uv.map(([u,v])=>[1-u,v]).reverse():uv;
  const u0=g0,u1=1-g0,F=dv*.62,uv=(u,v)=>[u0+(u1-u0)*u,v];
  if(st.b==='farm')return [{uv:M([[0,0],[.62,0],[.62,dv*.6],[0,dv*.6]].map(([u,v])=>uv(u,v))),ridge:[uv(.04,dv*.3),uv(.58,dv*.3)]},{uv:M([[.7,.1],[1,.1],[1,dv*1.25],[.7,dv*1.25]].map(([u,v])=>uv(u,v))),ridge:[uv(.85,.14),uv(.85,dv*1.2)],col:'#75684f'}];
  const box=[{uv:[[0,0],[1,0],[1,dv],[0,dv]].map(([u,v])=>uv(u,v)),ridge:[uv(.5,.04),uv(.5,dv*.96)]}];
  if(k===0||pl.w<2.1||pl.d<7&&k>=3)return [{uv:[[0,0],[1,0],[1,dv],[0,dv]].map(([u,v])=>uv(u,v)),ridge:pl.w>dv*pl.d?[uv(.02,dv/2),uv(.98,dv/2)]:[uv(.5,.03),uv(.5,dv*.97)]}];
  if(k===1)return [{uv:M([[0,0],[1,0],[1,F],[a,F],[a,Math.min(.97,dv*1.35)],[0,Math.min(.97,dv*1.35)]].map(([u,v])=>uv(u,v))),ridge:[uv(.03,F/2),uv(.97,F/2)]}];       // rear wing
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
// A planned quarter: the same house-by-house growth, but every house squared to one
// direction (the nearest road's) and a cross street left every few houses: the grid
// comes out of the buildings, not the other way round.
function regularZone(z,poly,F={}){const [cx,cy]=centre(poly),road=nearPath(cx,cy,80,null,true),a=road.p?at(road.p,nearestS(road.p,[cx,cy])):{tx:1,ty:0};
  const big=Y>=1850,R=F.regular||{},o=addZone(poly,'town',null,{rate:big?2.2:1.8,use:z.type});o.regular={ang:Math.atan2(a.ty,a.tx),block:R.block??(big?7:10),S:R.S??(big?3.8:3.1)};
  if(!F.b||F.b==='house')o.uniform=STYLE_BY_YEAR(Y);return o;}
// What a form asks of the map: plot sizes, what is built, a spine avenue, a green, pits.
// Rezoning: houses of another use or form inside a newly painted zone change over the years
// (one in twenty a year comes down; the new zone builds on the land).
function markRezoned(o){const xs=o.poly.map(p=>p[0]),ys=o.poly.map(p=>p[1]);plotBins.near(Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys),pl=>{
  if(!aliveO(pl)||pl.zone===o||!inPoly(...centre(pl.pts),o.poly))return;const z=pl.zone;if(z&&z.use===o.use&&(z.b||'house')===(o.b||'house'))return;if(!pl.built){pl.died=Y;return;}pl.conv=o;});}
function rezoneStep(){for(const pl of rLive)if(pl.conv&&aliveO(pl)&&rnd()<.05)pl.died=Y;}
function formZone(o,fid,F){o.form=fid;o.lot=F.lot||null;o.b=F.b||null;o.detached=F.detached||0;o.dvr=F.dv||null;o.curve=!!F.curve;
  const xs=o.poly.map(p=>p[0]),ys=o.poly.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),[cx,cy]=centre(o.poly);
  // A linear city: a tree-lined tram avenue down the zone's long axis, houses face it.
  if(F.spine){const ang=o.regular?.ang??0,c=Math.cos(ang),sn=Math.sin(ang),L=Math.max(x1-x0,y1-y0);const along=Math.abs(c)*(x1-x0)+Math.abs(sn)*(y1-y0)>=Math.abs(sn)*(x1-x0)+Math.abs(c)*(y1-y0);
    const ux=along?c:-sn,uy=along?sn:c,pts=[];for(let t=-L/2;t<=L/2;t+=2){const x=cx+ux*t,y=cy+uy*t;if(inPoly(x,y,o.poly)&&!flood(x,y))pts.push([x,y]);}
    if(pts.length>4){addPath(pts,'boulevard',{hw:1.7,name:'the Avenue'});if(o.regular){o.regular.ang=Math.atan2(uy,ux);}}}
  // A garden city: a green in the middle, cottages round it.
  if(F.green){const r=Math.sqrt((x1-x0)*(y1-y0)*F.green/Math.PI);if(r>3&&!flood(cx,cy))addPlace(blob(cx,cy,r*1.2,r*.85,14,o.cx|0),'garden',{name:'the Green'});}
  // Mines and quarries: a pit and a spoil heap.
  if(F.pits){const r=Math.min(x1-x0,y1-y0)*.22;if(r>3){addPlace(blob(cx-r*.4,cy,r*1.2,r,16,7),'pit',{name:null});addPlace(blob(cx+r*1.3,cy+r*.6,r*.55,r*.45,12,8),'spoil',{name:null});}}}
function gridZone(z,poly){const [cx,cy]=centre(poly),road=nearPath(cx,cy,80,null,true),a=road.p?at(road.p,nearestS(road.p,[cx,cy])):{tx:1,ty:0};
  const big=Y>=1850,bw=big?26:20,bh=big?22:13,ang=Math.atan2(a.ty,a.tx),xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);
  const nx=Math.max(1,Math.round(w/bw)),ny=Math.max(1,Math.round(h/bh)),c=Math.cos(ang),s=Math.sin(ang);
  const ox=cx-(nx*bw/2)*c+(ny*bh/2)*-s*-1,oy=cy-(nx*bw/2)*s-(ny*bh/2)*c*-1;
  const g=surveyGrid(cx-(nx*bw/2)*c-(ny*bh/2)*s,cy-(nx*bw/2)*s+(ny*bh/2)*c,ang,nx,ny,bw,bh,null,{dir:-1,rate:1.4,style:big?'brick':'classical',square:nx>=3&&ny>=2&&!big?[1,1]:null});g.use=z.type;return g;}
function feed(city){
  // Roads first: the game's main roads, smoothed.
  const routes=city.routes||[];for(;fed.routes<routes.length;fed.routes++){const r=routes[fed.routes];if(!r.cells?.length)continue;const pts=chaikin(r.cells.map(([x,y])=>[(x+.5)*K,(y+.5)*K]),3);if(pts.length>=2){const p=addPath(pts,r.cls==='ringroad'?'avenue':'road',r.cls==='ringroad'?{hw:1.6,name:'the Ring Road'}:{});if(r.cls==='ringroad')p.ringroad=true;}}
  // Zones painted by this year.
  (city.zones||[]).forEach((z,i)=>{const born=Number(z.year)||Y0;if(born>Y||fed.zones.has(i))return;fed.zones.set(i,null);
    if(z.type==='clear'){const x0=z.x*K,y0=z.y*K,x1=(z.x+z.w)*K,y1=(z.y+z.h)*K;for(const o of zones)if(aliveO(o)&&o.cx>=x0&&o.cx<=x1&&o.cy>=y0&&o.cy<=y1)o.died=Y;return;}
    const poly=cellPoly(z),fid=formAtYear(z,Y),F=FORMS[fid]||{};let o;
    if(z.type==='farm')o=addZone(poly,'village',null,{use:z.type,rate:.4,lay:{widthR:[3.6,6],depth:11,gapEvery:22}});
    else if(F.regular)o=regularZone(z,poly,F);
    else o=addZone(poly,'town',null,{use:z.type,rate:1});
    formZone(o,fid,F);if(F.plan)planDistrict(o,F,z);markRezoned(o);
    if(o.kind==='town')town.push(o);const w=walls.find(w=>aliveO(w));if(w&&o.kind==='town'&&inPoly(o.cx,o.cy,w.poly))o.wall={poly:w.poly,inside:true};fed.zones.set(i,o);});
  // A zone that changed form with a new Age: new plots follow the new form, old ones turn over.
  (city.zones||[]).forEach((z,i)=>{if(!z.formHist)return;const o=fed.zones.get(i);if(!o)return;const f=formAtYear(z,Y);if(f===o.form)return;const F=FORMS[f]||{};
    const oldB=o.b||'house';o.form=f;o.lot=F.lot||null;o.b=F.b||null;o.detached=F.detached||0;o.dvr=F.dv||null;o.curve=!!F.curve;o.use=F.type||o.use;
    if(F.regular&&!o.regular){const a=nearPath(o.cx,o.cy,80,null,true),t=a.p?at(a.p,nearestS(a.p,[o.cx,o.cy])):{tx:1,ty:0};o.regular={ang:Math.atan2(t.ty,t.tx),block:F.regular.block,S:F.regular.S};}
    if((F.b||'house')!==oldB)for(const pl of plots)if(pl.zone===o&&aliveO(pl)){if(pl.built)pl.conv=o;else pl.died=Y;}});
  // Before anyone zones, the town grows around its centre (as the game's informal growth does).
  const tgt=target(city,Y);
  // The founding hamlet round the centre; after that the town grows only on zoned land.
  if(!fed.implicit){const r=14,pp=blob(C0[0],C0[1]-2,r*1.15,r*.85,16,7);
    if(!fed.implicit){fed.implicit=addZone(pp,'town',null,{rate:.9});town.push(fed.implicit);}
    else if(Math.abs((fed.implicit.r||0)-r)>2){fed.implicit.poly=pp;fed.implicit.pc=null;fed.implicit.fr=null;fed.implicit.full=0;zones.polyVer=(zones.polyVer||0)+1;}
    fed.implicit.r=r;const w=walls.find(w=>aliveO(w));if(w&&inPoly(C0[0],C0[1],w.poly))fed.implicit.wall={poly:w.poly,inside:true};}
  // Landmarks from building cards: where the player put them, when they did.
  for(const b of city.buildings||[]){if(!b.special||fed.lms.has(b.id)||(b.born||Y0)>Y)continue;fed.lms.add(b.id);
    const x=(Math.floor(b.x)+1)*K,y=(Math.floor(b.y)+1)*K,k=b.special;
    if(isChurch(k))addLandmark('church',x,y,0,{bid:b.id,pull:.9,reach:12,name:b.label||null,parts:churchParts(k==='chapel'?9:14),clear:blob(x,y+.5,k==='chapel'?6:10,k==='chapel'?4.5:7,14,b.id),placeKind:'churchyard'});
    else if(isHall(k)&&Y>=1500)cutSquare(x,y,15,10,b.label||'Town Hall');
    else if(k==='market'||k==='market_hall')addLandmark('market',x,y,0,{bid:b.id,pull:1.1,reach:14,name:b.label||null,clear:blob(x,y,5,4,12,b.id),placeKind:'market'});
    else addLandmark(k,x,y,hsh(b.id,9)*.6-.3,{bid:b.id,pull:.8,reach:10,name:b.label||null,parts:[{poly:R(-4,-2.6,4,2.6),ridge:[[-3.6,0],[3.6,0]],tone:'stone'},...(['school','university','hospital','clinic','museum','library'].includes(k)?[{poly:R(-2,-1,2,1),tone:'court'}]:[])],clear:blob(x,y,5.5,4,12,b.id)});}
  // Walls the player raised: thrown round the town that stands then; later ones are bastioned.
  (city.walls||[]).forEach((w,i)=>{if(fed.walls.has(i)||(w.built||Y0)>Y)return;fed.walls.add(i);
    if(!walls.length){const pts=plots.filter(p=>aliveO(p)&&p.built&&town.includes(p.zone));if(!pts.length)return;const tc=centre(pts.flatMap(p=>p.pts));const ww=throwWall(tc[0],tc[1],town,2.6);for(const z of town)if(inPoly(z.cx,z.cy,ww.poly))z.wall={poly:ww.poly,inside:true};if((w.built||0)>=1550)bastions();}
    else if((w.built||0)>=1550&&!walls.some(x=>x.kind==='bastion'))bastions();});
  // A wall turned into a boulevard, park or canal: it comes down and its line becomes a ring street.
  for(const w of city.walls||[])if(w.state&&w.state!=='wall'){const yr=conversionYear(city,w);if(yr<=Y)for(const ow of walls)if(aliveO(ow)){ow.died=Y;addPath(chaikin([...ow.poly,ow.poly[0]],1),w.state==='canal'?'street':'boulevard',{hw:w.state==='boulevard'?1.9:1.2});for(const z of zones)if(z.wall?.poly===ow.poly)z.wall=null;}}
  // Bridges.
  for(const b of city.bridges||[]){if(fed.bridges.has(b.id)||(b.built||Y0)>Y||!b.cells?.length)continue;fed.bridges.add(b.id);const a=b.cells[0],c=b.cells.at(-1);const p=addPath([[(a[0]+.5)*K,(a[1]+.5)*K],[(c[0]+.5)*K,(c[1]+.5)*K]],'road',{hw:.9});p.bridge=true;p.wid=String(b.id);}
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
// ───────────── how many houses each zone should have ─────────────
// The map follows the game's own buildings, zone by zone: every building the game has
// standing in a zone in year Y asks for as many drawn houses as fit its parcel of land
// in that zone's form (small medieval houses: about one per parcel; garden cities and
// suburbs: fewer; terraces: more). So houses appear where the game builds, as many as it builds.
const CELL_AREA=K*K;
function perParcel(o){if(o.kind==='village')return .35;if(o.plan)return o.slotN/Math.max(1,o.cellN);const lot=o.lot?((o.lot.w[0]+o.lot.w[1])/2)*((o.lot.d[0]+o.lot.d[1])/2):Y>=1850?4.8*7.2:2.4*4.6;
  const street=o.detached?2.3:o.regular?1.7:1.6;return clamp(CELL_AREA/(lot*street),.2,3);}
let zgKey='',ZG=null;
function zoneGridAt(city){const zs=city.zones||[];let n=0;for(const z of zs)if((Number(z.year)||Y0)<=Y)n++;const key=n+'|'+zs.length;if(ZG&&zgKey===key)return ZG;zgKey=key;
  const GWc=Math.ceil(WW/K),GHc=Math.ceil(WH/K);ZG=new Int32Array(GWc*GHc).fill(-1);ZG.w=GWc;
  zs.forEach((z,i)=>{if((Number(z.year)||Y0)>Y)return;for(let y=Math.max(0,z.y);y<Math.min(GHc,z.y+z.h);y++)for(let x=Math.max(0,z.x);x<Math.min(GWc,z.x+z.w);x++)ZG[y*GWc+x]=z.type==='clear'?-1:i;});return ZG;}
function zoneTargets(city){const G=zoneGridAt(city),T=new Map(),add=(b)=>{const x=Math.floor(b.x),y=Math.floor(b.y);if(x<0||y<0)return;const zi=G[y*G.w+x];const o=zi>=0?fed.zones.get(zi):fed.implicit;if(!o)return;T.set(o,(T.get(o)||0)+perParcel(o));};
  for(const b of city.buildings||[])if((b.born||Y0)<=Y&&!b.special)add(b);
  for(const st of city.sites||[])if((st.born||Y0)<=Y&&st.ended>Y)add(st);
  return T;}
// Inside the walls houses grow back over their gardens and wide plots are split.
function infill(){const inside=walls.filter(w=>aliveO(w)&&w.kind!=='bastion');if(!inside.length)return;
  const live=plots.filter(p=>aliveO(p)&&p.built);
  for(let k=0;k<8;k++){const pl=live[Math.floor(rnd()*live.length)];if(!pl)return;const [cx,cy]=centre(pl.pts);if(!inside.some(w=>inPoly(cx,cy,w.poly)))continue;
    const st=stateAt(pl,Y);if(!st||st.b!=='house'&&st.b!=='shop')continue;
    if(st.dv<.78&&rnd()<.6){setState(pl,{dv:clamp(st.dv+.07,.3,.82),plan:st.plan===3?1:st.plan,gap:0});continue;}
    if(pl.w>3.1&&value(cx,cy)>.7&&rnd()<.5){const [FL,FR,RR,RL]=pl.pts,mf=[(FL[0]+FR[0])/2,(FL[1]+FR[1])/2],mb=[(RL[0]+RR[0])/2,(RL[1]+RR[1])/2];pl.died=Y;
      for(const q of [[FL,mf,mb,RL],[mf,FR,RR,mb]]){const np=addPlot(q,{p:pl.p,side:pl.side,zone:pl.zone,kind:'croft',w:pl.w/2,d:pl.d,built:Y,A:{f:q[0],b:q[3],d:pl.d},B:{f:q[1],b:q[2],d:pl.d}});setState(np,{...st,gap:0,plan:Math.floor(hsh(np.id,3)*6)});}}}}

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
    if(st.b==='works'||st.b==='shed')works[k]+=st.b==='shed'?2.5:1;else built[k]+=st.b==='tower'?2:1;green[k]+=clamp(1-st.dv,0,1)*.35;}
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
// Is the chase surrounded by the town? Then it is a question for the player (heritage.js).
function surrounded(pl){const [cx,cy]=centre(pl.poly);let n=0,hit=0;
  for(const [x,y] of pl.poly){const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy)||1;n++;if(inPlot(x+dx/d*8,y+dy/d*8,3))hit++;}return hit/n>=.35;}
function walksAcross(pl){const [cx,cy]=centre(pl.poly),P=pl.poly,a=P[0],b=P[Math.floor(P.length/2)],c2=P[Math.floor(P.length/4)],d2=P[Math.floor(P.length*3/4)];
  addPath(chaikin([a,[cx,cy],b],2),'walk',{hw:.35});addPath(chaikin([c2,[cx,cy],d2],2),'walk',{hw:.35});}
// ───────────── the player's decisions on the old city ─────────────
// city.heritage: {siteId:{kind,option,year,name}}. Applied after the year's growth,
// so a replay from the start lands in the same place as the live decision.
const applied=new Set();
const lmOf=bid=>landmarks.find(m=>aliveO(m)&&m.bid!=null&&String(m.bid)===bid);
const mainCanal=()=>paths.find(p=>aliveP(p)&&p.canal);
function applyHeritage(city){const H=city.heritage||{};let any=false;
  for(const [id,d] of Object.entries(H)){if(applied.has(id)||d.year>Y)continue;applied.add(id);any=true;
    const [k,ref]=id.split(':'),o=d.option,nm=d.name;
    if(k==='canal'){const c=mainCanal();if(!c)continue;if(o==='street'){c.covered=Y;c.kind='street';c.hw=.95;c.high=true;c.name=nm;}else if(o==='walk'){c.prom=true;c.name=nm;}}
    else if(k==='chase'){const pl=places.find(q=>aliveO(q)&&q.kind==='chase');if(!pl)continue;
      if(o==='park'){pl.kind='park';pl.name=nm;walksAcross(pl);}
      else if(o==='sell'){pl.died=Y;const z=addZone(pl.poly,'town',null,{rate:1.6,use:Y>=1950?'trade':'res'});town.push(z);if(Y>=1950)z.offices=true;}}
    else if(k==='market'){const pl=places.find(q=>q.id===+ref&&aliveO(q));if(!pl)continue;
      if(o==='plaza'){pl.kind='plaza';pl.name=pl.name==='Gate market'?'Gate Plaza':plazaName();}
      else if(o==='hall'){const [cx,cy]=centre(pl.poly),xs=pl.poly.map(q=>q[0]),ys=pl.poly.map(q=>q[1]),w=Math.min(14,(Math.max(...xs)-Math.min(...xs))*.62),h=Math.min(10,(Math.max(...ys)-Math.min(...ys))*.55);
        addLandmark('market_hall',cx,cy,0,{pull:1.2,reach:14,name:nm,parts:[{poly:R(-w/2,-h/2,w/2,h/2),tone:'stone'},...(nm==='the Mall'?[]:[{poly:R(-w/2+1.2,-.5,w/2-1.2,.5),tone:'court'}])]});}}
    else if(k==='bridge'){const p=paths.find(q=>aliveP(q)&&q.bridge&&q.wid===ref);if(!p)continue;
      if(o==='walk'){p.walkOnly=true;p.hw=.6;p.name=nm;}else if(o==='widen')p.hw=1.5;
      else if(o==='new'){const a=at(p,0),b=at(p,p.len),nx=-a.ty*9,ny=a.tx*9;const q=addPath([[a.x+nx,a.y+ny],[b.x+nx,b.y+ny]],'road',{hw:1.4});q.bridge=true;p.walkOnly=true;p.name='the Old Bridge';
        for(const e of [a,b]){const near=nearPath(e.x+nx,e.y+ny,14,null,true);if(near.p){const t=at(near.p,nearestS(near.p,[e.x+nx,e.y+ny]));addPath([[e.x+nx,e.y+ny],[t.x,t.y]],'road',{hw:1.1});}}}}
    else if(k==='b'){const m=lmOf(ref);if(!m)continue;
      if(o==='campus'){m.kind='library';m.name=nm;campus();}
      else if(o==='grow'){m.name='the University';for(const pl of plots)if(aliveO(pl)&&pl.built&&Math.hypot(...centre(pl.pts).map((v,i)=>v-[m.x,m.y][i]))<16&&rnd()<.6){pl.died=Y;}
        for(let i=0;i<4;i++){const a=i*1.57+.4,x=m.x+Math.cos(a)*10,y=m.y+Math.sin(a)*8;if(!flood(x,y))addLandmark('college',x,y,a,{pull:.3,reach:6,parts:[{poly:R(-3,-2.2,3,2.2),tone:'stone'},{poly:R(-1.6,-1,1.6,1),tone:'court'}]});}}
      else if(o==='culture'){m.kind='arts';m.name=nm;}
      else if(o==='sell'){m.died=Y;}
      else if(o==='front'){m.name=nm;const pl=addPath([[m.x-14,m.y],[m.x+14,m.y]],'promenade',{hw:.8});pl.name=null;}
      else if(nm)m.name=nm;}
    else if(k==='oldtown'){const ot=city.oldtown;if(!ot||o==='pedestrian')continue;const cx=ot.cx*K,cy=ot.cy*K,R=ot.r*K;
      // Avenues cut through the old town along its old roads: wider, and the houses in the way come down.
      for(const p of paths){if(!aliveP(p)||(p.kind!=='road'&&p.kind!=='street')||!p.pts.some(([x,y])=>Math.hypot(x-cx,y-cy)<R))continue;p.hw=1.7;p.kind='avenue';p.name=p.name||'the New Avenue';
        for(let s2=0;s2<=p.len;s2+=1){const a=at(p,s2);if(Math.hypot(a.x-cx,a.y-cy)>R+4)continue;plotBins.near(a.x-3,a.y-3,a.x+3,a.y+3,pl=>{if(aliveO(pl)&&(inQuad(a.x,a.y,pl.pts)||edgeDist(a.x,a.y,pl.pts)<2.1))pl.died=Y;});}p.rerast=true;}}
    else if(k==='palace'){const pl=plots.find(q=>q.id===+ref&&aliveO(q));if(!pl)continue;
      if(o==='museum'||o==='offices'){pl.died=Y;const [cx,cy]=centre(pl.pts);addLandmark(o==='museum'?'museum':'ministry',cx,cy,0,{pull:1,reach:12,name:nm,parts:[{abs:true,poly:grow(pl.pts,-.3)},{abs:true,poly:grow(pl.pts,-1.6),tone:'court'}]});}
      else if(o==='flats'){setState(pl,{b:'house',style:STYLE_BY_YEAR(Y),dv:.85,built:Y,gap:0,plan:1});}}}
  if(any){computeFields();ver++;}}
let ver=0,plazaN=0;
const plazaName=()=>['Plaza Mayor','Plaza Nueva','Plaza del Carmen','Plaza Real'][plazaN++%4];
// A new campus on the edge of the town: blue halls round a green.
function campus(){let best=null,bs=-1e9;for(let t=0;t<400;t++){const a=hsh(t,4,51)*Math.PI*2,r=60+hsh(t,5,51)*50,x=C0[0]+Math.cos(a)*r,y=C0[1]+Math.sin(a)*r;
    if(x<25||y<25||x>WW-25||y>WH-25||flood(x,y)||inPlot(x,y,10)||inPlace(x,y,12))continue;const sc=-Math.abs(r-80)*.05-slopeAt(x,y)/STEEP+hsh(t,6,51);if(sc>bs){bs=sc;best=[x,y];}}
  if(!best)return;const [x,y]=best;addPlace(blob(x,y,14,10,14,31),'garden',{name:'the Campus'});
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2,hx=x+Math.cos(a)*10,hy=y+Math.sin(a)*7;addLandmark('college',hx,hy,a,{pull:.6,reach:10,parts:[{poly:R(-3.4,-1.8,3.4,1.8),tone:'stone'}]});}}
// Sites on the map that can become questions: the canal, the chase, the market squares, palaces.
function mapSites(){const out=[];const c=mainCanal();if(c&&!c.covered&&!c.prom){const a=at(c,c.len*.5);out.push({id:'canal',kind:'canal',x:a.x,y:a.y,born:c.born});}
  const ch=places.find(q=>aliveO(q)&&q.kind==='chase');if(ch){const [x,y]=centre(ch.poly);out.push({id:'chase',kind:'chase',x,y,born:ch.born,ripe:surrounded(ch)});}
  for(const pl of places)if(aliveO(pl)&&pl.kind==='market'){const [x,y]=centre(pl.poly);out.push({id:`market:${pl.id}`,kind:'market',x,y,born:pl.born,name:pl.name});}
  if(fieldYear<0)computeFields();
  const pals=plots.filter(p=>aliveO(p)&&p.built&&stateAt(p,Y)?.b==='palace'&&Y-(stateAt(p,Y).built||p.born)>=60).map(p=>{const [x,y]=centre(p.pts);return {p,x,y,v:valAt(x,y)};}).sort((a,b)=>a.v-b.v).slice(0,2);
  for(const {p,x,y} of pals)out.push({id:`palace:${p.id}`,kind:'palace',x,y,born:stateAt(p,Y).built||p.born});
  return out;}
// Dear land changes use: the street front of the high street and the squares turns to shops; old dear houses are rebuilt.
function marketChange(){for(const pl of plots){if(!aliveO(pl)||!pl.built)continue;const st=stateAt(pl,Y);if(!st||st.b==='palace'||st.b==='works')continue;const [cx,cy]=centre(pl.pts),v=valAt(cx,cy);
  if(st.b==='house'&&v>70&&(pl.p?.high||pl.p?.kind==='edge')&&rnd()<.25)setState(pl,{b:'shop'});
  else if(v>80&&Y-(st.built||Y)>90&&STYLE_BY_YEAR(Y)!==st.style&&rnd()<.15)setState(pl,{style:STYLE_BY_YEAR(Y),dv:clamp(st.dv+.1,.3,.85),built:Y,gap:0});}}
function evolve(){
  if(Y===1310)digCanal();
  if(Y===1580)makeChase();
  if(Y%5===0){computeFields();if(Y>=1500)marketChange();}}
function yearStep(city){
  applyHeritage(city);
  const tgt=feed(city);
  evolve();
  infill();
  if(Y>=1500){rebuildWave();if(Y>=1520&&rnd()<.35)mergePalace();}
  rezoneStep();syncRaster();
  if(Y%10===0)for(const pl of rLive)pl.mv=null;
  // Each zone grows toward the houses the game has standing in it (at most 80 a year in all).
  const T=zoneTargets(city),have=new Map();for(const pl of rLive)if(pl.built&&aliveO(pl)){const [x,y]=centre(pl.pts),z=zoneC(x,y)||pl.zone;if(z)have.set(z,(have.get(z)||0)+1);}
  const need=[];for(const [o,t] of T){if(!aliveO(o))continue;const d=Math.round(t)-(have.get(o)||0);if(d>0)need.push([o,d]);}
  let budget=80;
  while(budget>0&&need.length){
    let tot=need.reduce((a,[,d])=>a+d,0),t=rnd()*tot,pick=0;for(let i=0;i<need.length;i++){t-=need[i][1];if(t<=0){pick=i;break;}}
    const [z]=need[pick];if(z.full>Y){need.splice(pick,1);continue;}
    HH=Y>=1500&&rnd()<.22?'wealthy':'ordinary';
    const pl=findHome(z);
    if(!pl){if(accreting(z)){z.miss=(z.miss||0)+1;if(z.miss>=5){z.full=Y+3;z.miss=0;}}else z.full=Y+4;if(z.full>Y){need.splice(pick,1);FAILS++;}budget--;continue;}
    z.miss=0;buildOn(pl);budget--;if(--need[pick][1]<=0)need.splice(pick,1);}
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
const INK={block:'#3f3a37',tower:'#3c3d3f',shed:'#4a4642',house:'#3b2f27',timber:'#3d3029',stone:'#433730',classical:'#463b34',brick:'#4a3029',modernist:'#43403d',contemporary:'#3f4446',works:'#2e2a28',shop:'#47362a',palace:'#3a2c25',farm:'#5a4c3b'};
const PUBLIC='#3e5a78',GARDEN='#c3c99a',GARDEN_EDGE='rgba(110,118,78,.35)',PAPER='#efe6cf',SQUARE='#f3ecda';
// ───────────── the paving: streets and squares as one surface ─────────────
// The built-up ground is one shape: every gap between houses narrower than two
// streets is filled, and its edge runs along the outer faces of the blocks (a
// morphological closing of the houses, squares and public buildings on the
// occupancy grid). Drawn once, under the houses, so streets merge into each other.
let pave=null,paveKey='';
function chamfer(D){for(let j=0;j<RH;j++)for(let i=0;i<RW;i++){const k=j*RW+i;let v=D[k];if(i>0)v=Math.min(v,D[k-1]+1);if(j>0){v=Math.min(v,D[k-RW]+1);if(i>0)v=Math.min(v,D[k-RW-1]+1.414);if(i<RW-1)v=Math.min(v,D[k-RW+1]+1.414);}D[k]=v;}
  for(let j=RH-1;j>=0;j--)for(let i=RW-1;i>=0;i--){const k=j*RW+i;let v=D[k];if(i<RW-1)v=Math.min(v,D[k+1]+1);if(j<RH-1){v=Math.min(v,D[k+RW]+1);if(i<RW-1)v=Math.min(v,D[k+RW+1]+1.414);if(i>0)v=Math.min(v,D[k+RW-1]+1.414);}D[k]=v;}}
let WATERC=null;
function paving(year,live){if(typeof document==='undefined')return null;const key=year+'|'+live.length;if(pave&&paveKey===key)return pave;paveKey=key;
  if(!WATERC){WATERC=new Uint8Array(RW*RH);for(let j=0;j<RH;j++)for(let i=0;i<RW;i++)if(flood((i+.5)*RC,(j+.5)*RC))WATERC[j*RW+i]=1;}
  const N=RW*RH,D=new Float32Array(N).fill(1e6);
  // Low-density planned districts keep their streets as streets: their houses are not paved round.
  for(const pl of live){if(!pl.built||pl.zone?.plan==='suburb'||pl.zone?.plan==='linear'||pl.zone?.detached)continue;cellsIn(pl.pts,k=>{D[k]=0;},true);}
  for(const pl of places)if(pl.born<=year&&(pl.died==null||pl.died>year)&&pl.kind!=='chase'&&pl.kind!=='park'&&pl.kind!=='lawn'&&pl.kind!=='turn'&&pl.kind!=='pit'&&pl.kind!=='spoil')cellsIn(pl.poly,k=>{D[k]=0;});
  for(const m of landmarks)if(m.born<=year&&(m.died==null||m.died>year))for(const part of m.parts)cellsIn(part.abs?part.poly:part.poly.map(([x,y])=>lmPoint(m,x,y)),k=>{D[k]=0;});
  chamfer(D);const R=3.5/RC,D2=new Float32Array(N);for(let k=0;k<N;k++)D2[k]=D[k]<=R?1e6:0;chamfer(D2);
  // Small open patches shut in by the town (a yard, a wide crossing) are paved too.
  {const lab=new Int32Array(N),Q=new Int32Array(N);let id=0;for(let k0=0;k0<N;k0++){if(lab[k0]||D2[k0]>=R||WATERC[k0])continue;id++;let h=0,t=0,edge=false;Q[t++]=k0;lab[k0]=id;
    while(h<t){const k=Q[h++],i=k%RW,j=(k/RW)|0;if(i===0||j===0||i===RW-1||j===RH-1)edge=true;for(const n of [i>0?k-1:-1,i<RW-1?k+1:-1,j>0?k-RW:-1,j<RH-1?k+RW:-1]){if(n<0||lab[n]||D2[n]>=R||WATERC[n])continue;lab[n]=id;Q[t++]=n;}}
    if(!edge&&t<700)for(let q=0;q<t;q++)D2[Q[q]]=R+1;}}
  // f > 0 inside the paving; bilinear up-sampling of f, then a hard edge, gives a smooth outline.
  const S=3,cw=RW*S,ch=RH*S,f=k=>WATERC[k]?-2:D2[k]-R;
  const c=document.createElement('canvas');c.width=cw;c.height=ch;const gg=c.getContext('2d'),img=gg.createImageData(cw,ch),d=img.data;
  const pc=[239,230,207];
  for(let py=0;py<ch;py++){const fy=py/S-.5,j=Math.max(0,Math.min(RH-2,Math.floor(fy))),ty=Math.max(0,Math.min(1,fy-j));
    for(let px=0;px<cw;px++){const fx=px/S-.5,i=Math.max(0,Math.min(RW-2,Math.floor(fx))),tx=Math.max(0,Math.min(1,fx-i)),k=j*RW+i;
      const v=(f(k)*(1-tx)+f(k+1)*tx)*(1-ty)+(f(k+RW)*(1-tx)+f(k+RW+1)*tx)*ty;if(v<=0)continue;const o=(py*cw+px)*4;d[o]=pc[0];d[o+1]=pc[1];d[o+2]=pc[2];d[o+3]=v>.35?255:Math.round(v/.35*255);}}
  gg.putImageData(img,0,0);pave=c;return c;}
// Streets coloured by a field (the traffic lens): the paving, tinted cell by cell, under the houses.
let tintC=null,tintK='';
function tinted(tint,pv){const key=tint.key+'|'+paveKey;if(tintC&&tintK===key)return tintC;tintK=key;
  const sm=document.createElement('canvas');sm.width=RW;sm.height=RH;const sg=sm.getContext('2d'),img=sg.createImageData(RW,RH),d=img.data;
  for(let j=0;j<RH;j++)for(let i=0;i<RW;i++){const c=tint.at((i+.5)*RC,(j+.5)*RC);if(!c)continue;const o=(j*RW+i)*4;d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=c[3];}
  sg.putImageData(img,0,0);const c=document.createElement('canvas');c.width=pv.width;c.height=pv.height;const cg=c.getContext('2d');cg.imageSmoothingEnabled=true;cg.drawImage(sm,0,0,c.width,c.height);
  cg.globalCompositeOperation='destination-in';cg.drawImage(pv,0,0);return tintC=c;}
function drawWorld(ctx,year,part='all',opts=null){g=ctx;const saveY=Y;Y=year;g.lineJoin='round';g.lineCap='round';
  if(part!=='features'){if(!ground)ground=paintGround();if(ground){g.imageSmoothingEnabled=true;g.drawImage(ground,0,0,WW,WH);}if(part==='ground'){Y=saveY;return;}}
  const live=plots.filter(p=>p.born<=year&&(p.died==null||p.died>year));
  // Woods outside the town.
  g.fillStyle='rgba(98,122,80,.42)';for(const [x,y,r] of trees){if(inPlot(x,y,1.5)||inPlace(x,y,1))continue;g.beginPath();g.arc(x,y,r,0,7);g.fill();}
  // Country roads: two fine edges; inside the town the street is only the gap between blocks.
  for(const p of paths){if(!aliveP(p)||p.kind==='edge')continue;
    if(p.kind==='path'){g.setLineDash([1,.9]);line(p.pts,.28,'rgba(120,96,66,.7)');g.setLineDash([]);continue;}
    if(p.kind==='canal')continue;
    if(p.kind==='walk'){line(p.pts,.6,'#ece4cc');continue;}
    if(p.kind==='rail'){line(p.pts,.9,'#3b2f27');g.setLineDash([.6,.6]);line(p.pts,.45,'#efe6cf');g.setLineDash([]);continue;}
    const w=p.hw*2;line(p.pts,w+.32,'rgba(92,74,52,.55)');line(p.pts,w,PAPER);}
  // The paving: inside the town the streets are one surface, edged by the blocks.
  {const pv=paving(year,live);if(pv){g.imageSmoothingEnabled=true;g.drawImage(pv,0,0,RW*RC,RH*RC);if(opts?.tint)g.drawImage(tinted(opts.tint,pv),0,0,RW*RC,RH*RC);}}
  for(const p of paths)if(aliveP(p)&&p.kind==='canal'){line(p.pts,1.3,'#8fb0ad');line(p.pts,.5,'#a9c6c4');}
  // Gardens and crofts behind the houses.
  for(const pl of live){if(pl.slot){if(!pl.built)continue;const k=pl.slot.plan;poly(pl.pts);g.fillStyle=k==='villa'||k==='block'?GARDEN:k==='shed'?'#d8d0bb':pl.slot.tall?'rgba(0,0,0,0)':SQUARE;g.fill();continue;}
    poly(pl.pts);g.fillStyle=GARDEN;g.fill();g.lineWidth=.1;g.strokeStyle=GARDEN_EDGE;g.stroke();}
  // Squares, the market, churchyards, public gardens.
  for(const pl of places){if(!aliveO(pl))continue;poly(pl.poly);
    g.fillStyle=pl.kind==='turn'?PAPER:pl.kind==='lawn'?'#c9d1a2':pl.kind==='garden'||pl.kind==='park'?'#b4c38a':pl.kind==='chase'?'#c4caa0':pl.kind==='churchyard'?'#cdd2a8':pl.kind==='pit'?'#b3a789':pl.kind==='spoil'?'#8c8170':SQUARE;g.fill();
    if(pl.kind==='pit'){g.lineWidth=.25;g.strokeStyle='#6f6553';g.setLineDash([.5,.4]);g.stroke();g.setLineDash([]);for(const sh of [.75,.5]){poly(grow(pl.poly,-(1-sh)*6));g.lineWidth=.15;g.stroke();}}
    if(pl.kind==='park'||pl.kind==='chase'){g.fillStyle=pl.kind==='park'?'rgba(78,104,64,.7)':'rgba(98,122,80,.6)';const [cx,cy]=pl.c||centre(pl.poly);for(let i=0;i<90;i++){const x=cx+(hsh(i,7,pl.born)-.5)*46,y=cy+(hsh(i,8,pl.born)-.5)*32;if(inPoly(x,y,pl.poly)){g.beginPath();g.arc(x,y,.7+hsh(i,9)*.5,0,7);g.fill();}}}
    if(pl.kind==='plaza'){const [cx,cy]=centre(pl.poly);g.fillStyle='rgba(78,104,64,.75)';for(const [x,y] of pl.poly){g.beginPath();g.arc(x+(cx-x)*.18,y+(cy-y)*.18,.55,0,7);g.fill();}g.beginPath();g.arc(cx,cy,.9,0,7);g.fillStyle='#8fb0ad';g.fill();}
    if(pl.kind==='garden'){g.fillStyle='rgba(78,104,64,.75)';for(const [x,y] of pl.poly.map((q,i)=>{const r=pl.poly[(i+1)%pl.poly.length];return [(q[0]+r[0])/2,(q[1]+r[1])/2];})){g.beginPath();g.arc(x,y,.6,0,7);g.fill();}}}
  // Promenades and boulevards: rows of trees.
  for(const p of paths)if(aliveP(p)&&(p.kind==='promenade'||p.kind==='boulevard'||p.prom)){g.fillStyle='rgba(78,104,64,.8)';const off=p.prom?p.hw+1:p.hw-.3;for(let s2=0;s2<p.len;s2+=2.2){const a=at(p,s2);for(const sd of [1,-1]){g.beginPath();g.arc(a.x-a.ty*sd*off,a.y+a.tx*sd*off,.5,0,7);g.fill();}}}
  // Walls: a heavy ink line with towers; gates as breaks with two towers.
  for(const w of walls){if(!aliveO(w))continue;poly(w.poly);
    if(w.kind==='bastion'){g.lineWidth=5;g.strokeStyle='rgba(150,165,118,.35)';g.stroke();g.lineWidth=1.5;g.strokeStyle='#2f2620';g.stroke();}
    else{g.lineWidth=1.25;g.strokeStyle='#2f2620';g.stroke();g.fillStyle='#2f2620';for(const [x,y] of w.towers){g.beginPath();g.arc(x,y,1.05,0,7);g.fill();}}
    for(const gt of w.gates){const big=gt===w.main;g.save();g.translate(gt.x,gt.y);g.rotate(gt.a);g.fillStyle=PAPER;g.fillRect(-1.4,-1.5,2.8,3);g.fillStyle='#2f2620';
      g.fillRect(-1.6,-(big?2.9:2.4),3.2,big?1.6:1.2);g.fillRect(-1.6,big?1.3:1.2,3.2,big?1.6:1.2);g.restore();}}
  // Buildings: solid ink, no outline, so neighbours read as one block.
  for(const pl of live){const st=stateAt(pl,year);if(!st||!st.tall)continue;const Q=Qf(pl);g.fillStyle='rgba(70,58,44,.28)';for(const part of housePlan(pl,st)){poly(part.uv.map(([u,v])=>Q(u,v)).map(([x,y])=>[x+1.1,y+1.1]));g.fill();}}
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
    const end=city.year,t0=(typeof performance!=='undefined'?performance:Date).now();while(Y<end){yearStep(city);Y++;if((typeof performance!=='undefined'?performance:Date).now()-t0>ms)break;}if(Y>=end)applyHeritage(city);return Y>=end;},
  draw(ctx,year,part,opts){drawWorld(ctx,year,part,opts);},
  // v3.6 fast open: the whole grown map as one object graph (IndexedDB keeps the references
  // between plots, zones and paths), and back. Functions, canvases and spatial indexes are left
  // out and rebuilt.
  snapshot(){for(const pl of plots)delete pl.Q;
    return {v:1,Y,rs,placeSeq,C0,carry,FAILS,rasterOn,reachDirty,rPaths,rPlaces,rLms,rPlots,rWalls,HH,ver,plazaN,started,
      stubs,paths,plots,places,landmarks,zones,walls,labels,town,census,rLive,applied,OCC,REACH,FV,FS,fieldYear,
      fed:{zones:fed.zones,lms:fed.lms,walls:fed.walls,bridges:fed.bridges,routes:fed.routes,implicit:fed.implicit}};},
  restore(S){if(!S||S.v!==1)return false;
    Y=S.Y;rs=S.rs;placeSeq=S.placeSeq;C0=S.C0;carry=S.carry;FAILS=S.FAILS;rasterOn=S.rasterOn;reachDirty=S.reachDirty;rPaths=S.rPaths;rPlaces=S.rPlaces;rLms=S.rLms;rPlots=S.rPlots;rWalls=S.rWalls;HH=S.HH;ver=S.ver;plazaN=S.plazaN;started=S.started;
    for(const [arr,src] of [[stubs,S.stubs],[paths,S.paths],[plots,S.plots],[places,S.places],[landmarks,S.landmarks],[zones,S.zones],[walls,S.walls],[labels,S.labels],[town,S.town],[census,S.census],[rLive,S.rLive]]){arr.length=0;for(const o of src)arr.push(o);}
    applied.clear();for(const k of S.applied)applied.add(k);OCC.set(S.OCC);REACH.set(S.REACH);FV=S.FV;FS=S.FS;
    fed.zones=S.fed.zones;fed.lms=S.fed.lms;fed.walls=S.fed.walls;fed.bridges=S.fed.bridges;fed.routes=S.fed.routes;fed.implicit=S.fed.implicit;
    // Spatial indexes, from the objects.
    pathBins.m.clear();for(const p of paths)for(let i=1;i<p.pts.length;i++){const a=p.pts[i-1],b=p.pts[i],m=p.hw+.5;pathBins.add({p,a,b},Math.min(a[0],b[0])-m,Math.min(a[1],b[1])-m,Math.max(a[0],b[0])+m,Math.max(a[1],b[1])+m);}
    plotBins.m.clear();for(const pl of plots){const xs=pl.pts.map(q=>q[0]),ys=pl.pts.map(q=>q[1]);plotBins.add(pl,Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys));}
    placeBins.m.clear();for(const pl of places){const xs=pl.poly.map(q=>q[0]),ys=pl.poly.map(q=>q[1]);placeBins.add(pl,Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys));}
    zoneVer=-1;zgKey='';ZG=null;fieldYear=S.fieldYear;TG=null;vMemoY=-1;zMemoV=-1;ground=null;pave=null;paveKey='';tintC=null;tintK='';return true;},
  // Outline what is drawn at a point (the selection on the map).
  outline(ctx,x,y,year,lw){const sy=Y;Y=Math.min(year,Y);let P=null;
    for(const m of landmarks){if(!aliveO(m)||!m.parts.length)continue;for(const part of m.parts){const Q=part.abs?part.poly:part.poly.map(([px,py])=>lmPoint(m,px,py));if(inPoly(x,y,Q)){P=Q;break;}}if(P)break;}
    if(!P){const pl=inPlot(x,y,0);if(pl)P=pl.pts;}if(!P)for(const pl of places)if(aliveO(pl)&&inPoly(x,y,pl.poly)){P=pl.poly;break;}
    Y=sy;if(!P)return false;ctx.save();ctx.beginPath();P.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.lineJoin='round';ctx.lineWidth=lw*2.2;ctx.strokeStyle='rgba(251,247,235,.95)';ctx.stroke();ctx.lineWidth=lw;ctx.strokeStyle='#235e4c';ctx.stroke();ctx.restore();return true;},
  // What is drawn at a point (world units): a house, a public building or a square.
  pick(x,y,year){const sy=Y;Y=Math.min(year,Y);let out=null;
    for(const m of landmarks){if(!aliveO(m)||!m.parts.length)continue;for(const part of m.parts){const P=part.abs?part.poly:part.poly.map(([px,py])=>lmPoint(m,px,py));if(inPoly(x,y,P)){out={kind:'landmark',type:m.kind,name:m.name,born:m.born};break;}}if(out)break;}
    if(!out){const pl=inPlot(x,y,0);if(pl&&pl.built){const st=stateAt(pl,Y);out={kind:'plot',type:st?.b||'house',style:st?.style,built:st?.built||pl.built,form:pl.zone?.form||null,use:pl.zone?.use||'res',w:pl.w,d:pl.d,palace:st?.b==='palace',converting:!!pl.conv};}}
    if(!out)for(const pl of places)if(aliveO(pl)&&inPoly(x,y,pl.poly)){out={kind:'place',type:pl.kind,name:pl.name};break;}
    Y=sy;return out;},
  // Sites the player may decide on (world units), and a version that changes when a decision lands.
  sites(){return mapSites();},
  get version(){return ver;},
  lens(ctx,kind){drawLens(ctx,kind);},
  labels(year){const out=[];const sy=Y;Y=year;for(const pl of places)if(aliveO(pl)&&pl.name){const [x,y]=centre(pl.poly);out.push({text:pl.name,x,y,kind:pl.kind});}for(const m of landmarks)if(aliveO(m)&&m.name&&['museum','ministry','library','arts','market_hall'].includes(m.kind))out.push({text:m.name,x:m.x,y:m.y-3,kind:'museum'});for(const p of paths)if(aliveP(p)&&p.name&&(p.covered||p.prom||p.walkOnly)){const a=at(p,p.len*.5);out.push({text:p.name,x:a.x,y:a.y-2,kind:'street'});}Y=sy;
    // One name per spot: overlapping places (a plaza on an older square) keep the first.
    return out.filter((l,i)=>!out.slice(0,i).some(o=>Math.hypot(o.x-l.x,o.y-l.y)<14));},
  living(){if(fieldYear<0)computeFields();let s=0,n=0,v=0;for(const pl of plots)if(aliveO(pl)&&pl.built){const [x,y]=centre(pl.pts);s+=solAt(x,y);v+=valAt(x,y);n++;}return {sol:n?Math.round(s/n):50,value:n?Math.round(v/n):0};},
  stats(){return {houses:plots.filter(p=>aliveO(p)&&p.built).length,plots:plots.length,paths:paths.length,fails:FAILS};}
};
}
