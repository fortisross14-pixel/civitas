// CIVITAS v1.4 — the cartographic renderer.
// One pure drawing function for the live map, the archive and the timelapse:
// parchment and striped polder fields, soft shorelines, curved streets traced
// from the street network, rows of small houses fronting their streets,
// walls that follow the town with towers, bastions and gates, windmills,
// boats, district names and event captions in an old surveyor's italic.
import {W,H,ZONES,terrain,zoneCell,styleAt,cityOrigin,homeLand,cityFields,districtDetails,wallPolygon,wallSegments} from './sim.js';
import {hash,rand,valueNoise,waterGrid,clamp} from './geo.js';

export const DISTRICT_COLORS=['#b5835a','#6f8f9c','#9b8a4e','#8a6f9b','#6f9a7a','#a8706c','#7d8bb0','#a59267','#5f8c8c','#9c7a8a','#87955f','#b08a7a'];
const PAPER='#e9e0c6',LAND='#d9d3ad',FIELD_LINE='rgba(150,146,104,.45)',HEDGE='rgba(120,128,88,.55)';
const WATER='#a9c6c4',WATER_EDGE='#86a9a7',WATER_LIGHT='#b9d3cf';
const STREET='#efe5cc',STREET_EDGE='rgba(120,104,82,.42)';
// Street surfaces by era: packed-earth lanes, paved streets, grey setts, asphalt.
const STREET_TONE={organic:['#efe5cc','rgba(120,104,82,.42)'],regular:['#eee2c6','rgba(116,100,80,.45)'],industrial:['#e4ddcd','rgba(104,96,86,.48)'],modern:['#dedad1','rgba(96,92,86,.5)']};
const streetWidth=pattern=>pattern==='modern'?.56:pattern==='organic'?.38:.47;
// Roof colour is chosen by land use first, then building generation.
// Each use owns a muted hue family (as on the zoning layer, but in weathered
// earth tones): homes in rust-brown tile, shops in ochre, workshops in slate,
// civic halls in verdigris, farms in straw, hotels in faded mauve. The era then
// shifts lightness, saturation and a little hue within that family: dark aged
// timber, pale classical masonry, redder brick, greyer concrete, cooler glass.
export const USE_ROOF={
  res:{h:16,s:34,l:36},trade:{h:38,s:40,l:43},craft:{h:212,s:9,l:33},
  civic:{h:146,s:14,l:45},farm:{h:68,s:24,l:39},hotel:{h:318,s:17,l:42}
};
const ERA_ROOF={
  timber:{h:-3,s:-7,l:-6},stone:{h:0,s:-5,l:-1},classical:{h:2,s:-9,l:8},
  brick:{h:-4,s:2,l:0},modernist:{h:0,s:-13,l:4},contemporary:{h:6,s:-11,l:6}
};
const SHADE=[[0,0],[2,3],[-2,-3],[1,-6]]; // [hue, lightness] variants within one block
const roofCache=new Map();
function hsl(h,s,l){s/=100;l/=100;const f=n=>{const k=(n+h/30)%12,c=l-s*Math.min(l,1-l)*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(c*255).toString(16).padStart(2,'0');};return `#${f(0)}${f(8)}${f(4)}`;}
// Roof colour for a building of `type` in era `style`; `shade` 0–3 varies it,
// `red` picks the old fired-tile accent that only homes use.
export function roofTone(type,style,shade=0,red=false){
  const id=`${type}|${style}|${shade}|${red}`;if(roofCache.has(id))return roofCache.get(id);
  const u=USE_ROOF[type]||USE_ROOF.res,e=ERA_ROOF[style]||ERA_ROOF.timber,[dh,dl]=SHADE[shade&3];
  const out=red?hsl(9+e.h,46+e.s,40+e.l*.6):hsl((u.h+e.h+dh+360)%360,Math.max(4,u.s+e.s*(u.s>15?1:.4)),u.l+e.l+dl);
  roofCache.set(id,out);return out;
}
const STONE='#cbb995',STONE_EDGE='#6c5945';

// ───────────────────────── offscreen layers ─────────────────────────
const S=10; // offscreen pixels per map cell
const layerCache=new Map();
function offscreen(w,h){if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
// Polder fields: the map is split into irregular plots, each striped with
// drainage ditches at its own angle, bounded by hedgerows, with tree clumps.
function fieldsLayer(type,seed){
  const id=`fields:${type}:${seed}`;if(layerCache.has(id))return layerCache.get(id);
  const c=offscreen(W*S,H*S);if(!c)return null;const g=c.getContext('2d'),r=rand(hash(seed,8081));
  g.fillStyle=LAND;g.fillRect(0,0,c.width,c.height);
  const plots=[];const split=(x,y,w,h,depth)=>{
    if(depth>6||(w<14&&h<14&&r()<.65)||w<6||h<6){plots.push({x,y,w,h});return;}
    if(w>h?r()<.8:r()<.2){const cut=Math.round(w*(.3+r()*.4));split(x,y,cut,h,depth+1);split(x+cut,y,w-cut,h,depth+1);}
    else{const cut=Math.round(h*(.3+r()*.4));split(x,y,w,cut,depth+1);split(x,y+cut,w,h-cut,depth+1);}
  };split(0,0,W,H,0);
  for(const p of plots){
    const tone=r();g.fillStyle=tone<.3?'rgba(196,199,150,.55)':tone<.55?'rgba(214,206,166,.5)':tone<.75?'rgba(188,192,140,.45)':'rgba(222,214,178,.35)';
    g.fillRect(p.x*S,p.y*S,p.w*S,p.h*S);
    g.save();g.beginPath();g.rect(p.x*S,p.y*S,p.w*S,p.h*S);g.clip();
    const ang=(r()<.5?0:Math.PI/2)+(r()-.5)*.5,spacing=(.7+r()*.6)*S,cx=(p.x+p.w/2)*S,cy=(p.y+p.h/2)*S,len=Math.hypot(p.w,p.h)*S;
    g.strokeStyle=FIELD_LINE;g.lineWidth=.6;g.beginPath();
    for(let t=-len/2;t<=len/2;t+=spacing){const ox=Math.cos(ang+Math.PI/2)*t,oy=Math.sin(ang+Math.PI/2)*t;g.moveTo(cx+ox-Math.cos(ang)*len,cy+oy-Math.sin(ang)*len);g.lineTo(cx+ox+Math.cos(ang)*len,cy+oy+Math.sin(ang)*len);}
    g.stroke();g.restore();
    g.strokeStyle=HEDGE;g.lineWidth=1.1;g.strokeRect(p.x*S+.5,p.y*S+.5,p.w*S-1,p.h*S-1);
    if(r()<.18){g.fillStyle='rgba(112,128,86,.55)';const tx=(p.x+r()*p.w)*S,ty=(p.y+r()*p.h)*S;for(let i=0;i<5+r()*6;i++){g.beginPath();g.arc(tx+(r()-.5)*28,ty+(r()-.5)*22,3+r()*3,0,Math.PI*2);g.fill();}}
  }
  layerCache.set(id,c);return c;
}
// Water with smooth curved shores: blur the cell mask, then threshold it into
// a shoreline band, open water and a lighter shallow fringe.
function waterLayer(type){
  const id=`water:${type}`;if(layerCache.has(id))return layerCache.get(id);
  const c=offscreen(W*S,H*S);if(!c)return null;const g=c.getContext('2d');
  g.filter='blur(5px)';g.fillStyle='#000';
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(terrain(type,x,y)==='water')g.fillRect(x*S-2,y*S-2,S+4,S+4);
  g.filter='none';
  const img=g.getImageData(0,0,c.width,c.height),d=img.data;
  const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const edge=hex(WATER_EDGE),deep=hex(WATER),light=hex(WATER_LIGHT);
  for(let i=0;i<d.length;i+=4){const a=d[i+3];let col=null;
    if(a>=150)col=a<175?light:deep;else if(a>=118)col=edge;
    if(col){d[i]=col[0];d[i+1]=col[1];d[i+2]=col[2];d[i+3]=255;}else d[i+3]=0;}
  g.putImageData(img,0,0);
  // Faint current lines on open water.
  g.globalCompositeOperation='source-atop';g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1;
  for(let y=6;y<c.height;y+=14){g.beginPath();for(let x=0;x<c.width;x+=6)g.lineTo(x,y+Math.sin(x*.035+y)*2.2);g.stroke();}
  g.globalCompositeOperation='source-over';
  layerCache.set(id,c);return c;
}
let paper=null;
function paperPattern(ctx){
  if(!paper){paper=offscreen(160,160);if(!paper)return PAPER;const g=paper.getContext('2d'),r=rand(77);g.fillStyle=PAPER;g.fillRect(0,0,160,160);
    for(let i=0;i<900;i++){g.fillStyle=`rgba(${120+r()*60|0},${100+r()*50|0},${70+r()*30|0},${r()*.05})`;g.fillRect(r()*160,r()*160,1+r()*2,1+r()*2);}}
  return ctx.createPattern(paper,'repeat');
}

// ───────────────────────── hand-drawn warp ─────────────────────────
// Streets are laid on a grid of parcels, which reads stiff on a map. A smooth
// displacement field, applied alike to streets, buildings and the Town Center,
// bends the whole fabric as a surveyor's hand would: strongest in the old core,
// fading toward the planned outskirts, and fading out at the water so bridges,
// quays and shorelines stay where they are.
const warpCache=new Map();
function waterDistance(type){
  const water=waterGrid(type),d=new Float32Array(W*H).fill(4),queue=[];
  for(let k=0;k<W*H;k++)if(water[k]){d[k]=0;queue.push(k);}
  for(let i=0;i<queue.length;i++){const k=queue[i],x=k%W,y=Math.floor(k/W);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const n=ny*W+nx;if(d[n]>d[k]+1){d[n]=d[k]+1;if(d[n]<4)queue.push(n);}}}
  return d;
}
// Bilinear sample of a per-cell grid at map coordinates, so the warp stays continuous.
function sample(grid,x,y){const fx=clamp(x-.5,0,W-1.001),fy=clamp(y-.5,0,H-1.001),x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0,k=y0*W+x0;
  return (grid[k]*(1-tx)+grid[k+1]*tx)*(1-ty)+(grid[k+W]*(1-tx)+grid[k+W+1]*tx)*ty;}
export const WARP_AMPLITUDE=.46;
export function mapWarp(city){
  const o=cityOrigin(city),id=`${city.type}:${city.seed}:${o.x},${o.y}`;
  if(warpCache.has(id))return warpCache.get(id);
  if(warpCache.size>8)warpCache.clear();
  const wd=waterDistance(city.type),seed=(city.seed|0)^0x5bd1;
  const fn=(x,y)=>{
    const amp=WARP_AMPLITUDE*clamp(1.15-Math.hypot(x-o.x-.5,y-o.y-.5)/32,.25,1)*clamp(sample(wd,x,y)/2.5,0,1);
    if(amp<=0)return [x,y];
    return [x+(valueNoise(seed,x,y,6)-.5)*2*amp,y+(valueNoise(seed+17,x,y,6)-.5)*2*amp];
  };
  warpCache.set(id,fn);return fn;
}
const warpedChains=new WeakMap();
function warpChains(value,warp){
  const hit=warpedChains.get(value);if(hit&&hit.warp===warp)return hit.out;
  const out={chains:value.chains.map(ch=>({...ch,pts:ch.pts.map(([x,y])=>warp(x,y))})),dots:value.dots.map(([x,y])=>warp(x,y))};
  warpedChains.set(value,{warp,out});return out;
}
// ───────────────────────── streets ─────────────────────────
const chainCache=new WeakMap();
// Decompose the street grid into chains between junctions, then smooth each
// chain so lanes curve (medieval lanes also wander a little).
export function streetChains(city){
  const roads=city.roads||[],hit=chainCache.get(roads);if(hit&&hit.len===roads.length)return hit.value;
  const tiles=new Map();for(const r of roads)if(Number.isFinite(r.x)&&r.cls!=='bridge')tiles.set(r.y*W+r.x,r);
  const isMain=k=>tiles.get(k)?.cls==='main';
  const nbrs=k=>{const x=k%W,y=Math.floor(k/W),out=[];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const n=ny*W+nx;if(tiles.has(n)&&!(isMain(k)&&isMain(n)))out.push(n);}return out;};
  const deg=new Map();for(const k of tiles.keys())deg.set(k,nbrs(k).length);
  const used=new Set(),edgeKey=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`,chains=[];
  const walk=(start,next)=>{const path=[start,next];used.add(edgeKey(start,next));let prev=start,cur=next;
    while(deg.get(cur)===2&&!isMain(cur)){const n=nbrs(cur).find(v=>v!==prev);if(n==null||used.has(edgeKey(cur,n)))break;used.add(edgeKey(cur,n));path.push(n);prev=cur;cur=n;}
    return path;};
  for(const k of tiles.keys()){if(deg.get(k)===2&&!isMain(k))continue;for(const n of nbrs(k))if(!used.has(edgeKey(k,n)))chains.push(walk(k,n));}
  for(const k of tiles.keys())for(const n of nbrs(k))if(!used.has(edgeKey(k,n)))chains.push(walk(k,n)); // loops
  const value={chains:chains.map(path=>{
    const pattern=tiles.get(path[Math.floor(path.length/2)])?.pattern||'regular',organic=pattern==='organic';
    let pts=path.map((k,i)=>{let x=k%W+.5,y=Math.floor(k/W)+.5;
      // Interior points wander: medieval lanes a lot, planned streets barely.
      if(i>0&&i<path.length-1){const h=hash(k,99),amp=organic?.62:pattern==='regular'?.14:0;x+=((h&255)/255-.5)*amp;y+=(((h>>8)&255)/255-.5)*amp;}
      return [x,y];});
    pts=chaikin(pts,organic?3:2);
    return {pts,pattern};
  }),dots:[...tiles.keys()].filter(k=>deg.get(k)===0&&!isMain(k)).map(k=>[k%W+.5,Math.floor(k/W)+.5])};
  chainCache.set(roads,{len:roads.length,value});return value;
}
export function chaikin(points,rounds=3){
  let p=points;
  for(let r=0;r<rounds;r++){if(p.length<3)break;const out=[p[0]];
    for(let i=0;i<p.length-1;i++){const [ax,ay]=p[i],[bx,by]=p[i+1];out.push([ax*.75+bx*.25,ay*.75+by*.25],[ax*.25+bx*.75,ay*.25+by*.75]);}
    out.push(p.at(-1));p=out;}
  return p;
}
function strokePath(ctx,pts){ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);}

// ───────────────────────── buildings ─────────────────────────
// Each map building is a block: a few small houses (or a shed, a church, a
// courtyard block…) set along the street it faces, turned slightly to it.
const shapeCache=new WeakMap();
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
export const sizeOf=b=>(b.w||0)>1.2?2:1;
// Which way a building faces: a main road beside it, else any street beside
// it, else the nearest street within five parcels (so backlot buildings still
// turn toward a street instead of facing a random way).
export function frontOf(b,roadSet,mainSet,size=1){
  const x=Math.floor(b.x),y=Math.floor(b.y),h=hash(x,y,31);
  const sideCells=(dx,dy)=>Array.from({length:size},(_,i)=>dx?[dx>0?x+size:x-1,y+i]:[x+i,dy>0?y+size:y-1]);
  const sides=DIRS.map(([dx,dy])=>{const cells=sideCells(dx,dy).map(([cx,cy])=>cy*W+cx);return {dx,dy,road:cells.some(k=>roadSet.has(k)),main:cells.some(k=>mainSet.has(k))};});
  const main=sides.find(s=>s.main),roads=sides.filter(s=>s.road);
  if(main)return {d:main,corner:roads.length>1?roads.find(s=>s!==main):null};
  if(roads.length)return {d:roads[(h>>>4)%roads.length],corner:roads.length>1?roads[((h>>>4)+1)%roads.length]:null};
  const cx=x+size/2,cy=y+size/2;let best=null,bestD=Infinity;
  for(let yy=y-5;yy<y+size+5;yy++)for(let xx=x-5;xx<x+size+5;xx++){if(xx<0||yy<0||xx>=W||yy>=H||!roadSet.has(yy*W+xx))continue;const d=Math.hypot(xx+.5-cx,yy+.5-cy);if(d<bestD){bestD=d;best=[xx+.5-cx,yy+.5-cy];}}
  if(best){const [vx,vy]=best;return {d:Math.abs(vx)>=Math.abs(vy)?{dx:Math.sign(vx),dy:0}:{dx:0,dy:Math.sign(vy)},corner:null};}
  const [fx,fy]=DIRS[(h>>>0)%4];return {d:{dx:fx,dy:fy},corner:null};
}
function rect(u0,v0,u1,v1){return [[u0,v0],[u1,v0],[u1,v1],[u0,v1]];}
function circle(cu,cv,rad,n=10){return Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return [cu+Math.cos(a)*rad,cv+Math.sin(a)*rad];});}
// Local plans in (u along the street, v away from it) for each building kind.
function plan(b,r){
  const sty=b.style||styleAt(b.born||1300),lvl=b.level||1,out=[];
  const row=(n,dmin,dmax,wmin=.2)=>{let u=-.45;const widths=Array.from({length:n},()=>wmin+r()*.18),total=widths.reduce((a,v)=>a+v,0)+(n-1)*.03,scale=.9/total;
    for(const w0 of widths){const w=w0*scale,dep=dmin+r()*(dmax-dmin),off=r()*.04;out.push({poly:rect(u,off,u+w,off+dep),tone:'roof'});u+=w+.03*scale;}};
  if(b.special)return specialPlan(b,r);
  if(b.type==='res'||b.type==='trade'){
    if(lvl>=4&&sty!=='timber'){ // perimeter block with a courtyard
      out.push({poly:rect(-.25,.3,.25,.62),tone:'yard'},{poly:rect(-.45,0,.45,.3),tone:'roof'},{poly:rect(-.45,.62,.45,.9),tone:'roof'},{poly:rect(-.45,.3,-.25,.62),tone:'roof'},{poly:rect(.25,.3,.45,.62),tone:'roof'});
    }else if(sty==='modernist'){if(r()<.5)out.push({poly:rect(-.42,.05,.42,.42),tone:'roof'});else out.push({poly:rect(-.25,.1,.25,.65),tone:'roof'});}
    else if(sty==='contemporary')out.push({poly:rect(-.4,.04,.4,.6),tone:'roof'},{poly:rect(-.18,.6,.18,.82),tone:'roof'});
    else if(sty==='timber'){row(2+Math.floor(r()*3),.4,.62,.16);if(r()<.6){const u=-.4+r()*.5;out.push({poly:rect(u,.68,u+.25+r()*.15,.92),tone:'roof'});}}
    else if(sty==='stone'){row(2+Math.floor(r()*2),.5,.72,.24);if(r()<.4)out.push({poly:rect(-.3,.76,.2,.94),tone:'roof'});}
    else if(sty==='classical')row(2,.55,.68,.36);
    else row(3+Math.floor(r()*2),.5,.6,.2);
    if(b.type==='trade')out.push({poly:rect(-.45,-.04,.45,.03),tone:'awning'});
  }else if(b.type==='craft'){
    if(b.born<1750){out.push({poly:rect(-.42,0,.02,.45),tone:'roof'},{poly:rect(.08,.25,.44,.6),tone:'shed'});}
    else if(b.born<1950){out.push({poly:rect(-.44,.02,.44,.68),tone:'shed',saw:true});if(r()<.5)out.push({poly:circle(.32,.82,.07,8),tone:'chimney'});}
    else out.push({poly:rect(-.42,.04,.42,.72),tone:'shed'});
  }else if(b.type==='farm'){
    out.push({poly:rect(-.38,.05,-.02,.36),tone:'roof'},{poly:rect(.06,.3,.42,.55),tone:'shed'});
  }else if(b.type==='civic'){
    // Parish churches (the informal ones, and a third of early civic blocks);
    // otherwise halls, courtyard buildings, schools and modern civic blocks.
    const pick=hash(Math.floor(b.x),Math.floor(b.y),77)>>>0;
    if(b.born<1850&&(b.informal||pick%3===0))out.push(...church(.0,.12,.78,.9));
    else if(b.born<1600)out.push({poly:rect(-.42,0,.42,.3),tone:'roof'},{poly:rect(-.42,.3,-.12,.8),tone:'roof'});
    else if(b.born<1850)out.push({poly:rect(-.18,.28,.18,.6),tone:'yard'},{poly:rect(-.42,0,.42,.28),tone:'roof'},{poly:rect(-.42,.28,-.18,.6),tone:'roof'},{poly:rect(.18,.28,.42,.6),tone:'roof'},{poly:rect(-.42,.6,.42,.82),tone:'roof'});
    else if(b.born<1950)out.push({poly:rect(-.44,0,.44,.24),tone:'roof'},{poly:rect(-.44,.24,-.28,.72),tone:'roof'},{poly:rect(-.08,.24,.08,.6),tone:'roof'},{poly:rect(.28,.24,.44,.72),tone:'roof'});
    else out.push({poly:rect(-.42,0,.42,.16),tone:'square'},{poly:rect(-.36,.16,.36,.66),tone:'roof'});
  }else if(b.type==='hotel'){
    out.push({poly:rect(-.44,0,.44,.28),tone:'roof'},{poly:rect(-.44,.28,-.22,.75),tone:'roof'},{poly:rect(.22,.28,.44,.75),tone:'roof'});
  }else out.push({poly:rect(-.35,.05,.35,.6),tone:'roof'});
  return out;
}
// The local plan of one building (for tests and tools): shapes with tones.
export function buildingPlan(b){return plan(b,rand(hash(Math.floor(b.x),Math.floor(b.y),b.born|0,(b.id||'').length*7919)));}
function church(u,v0,len,scale=1){
  const w=.13*scale;return [{poly:rect(u-w,v0+.12,u+w,v0+len),tone:'stone'},{poly:rect(u-.3*scale,v0+len*.55,u+.3*scale,v0+len*.55+.15*scale),tone:'stone'},{poly:rect(u-.09*scale,v0-.06,u+.09*scale,v0+.14),tone:'tower'}];
}
function specialPlan(b,r){
  const k=b.special;
  if(['chapel','shrine'].includes(k))return church(0,.05,.86,1.15);
  if(k==='monastery')return [...church(-.12,.05,.8,1),{poly:rect(.08,.35,.46,.78),tone:'cloister'}];
  if(k==='market')return [{poly:rect(-.46,-.02,.46,.9),tone:'square'},...[[-.25,.25],[.15,.2],[-.1,.6],[.25,.6]].map(([u,v])=>({poly:rect(u,v,u+.12,v+.1),tone:'awning'}))];
  if(['town_hall','guildhall','library','civic_center','school','university','research_center','museum'].includes(k))
    return [{poly:rect(-.46,0,.46,.26),tone:'stone'},{poly:rect(-.46,.66,.46,.9),tone:'stone'},{poly:rect(-.46,.26,-.26,.66),tone:'stone'},{poly:rect(.26,.26,.46,.66),tone:'stone'},{poly:rect(-.2,.32,.2,.6),tone:'green'}];
  if(['garden'].includes(k))return [{poly:rect(-.46,-.02,.46,.9),tone:'green'},...[[-.28,.2],[.28,.2],[-.28,.65],[.28,.65],[0,.42]].map(([u,v])=>({poly:circle(u,v,.08,8),tone:'tree'}))];
  if(['clinic','hospital'].includes(k))return [{poly:rect(-.42,.05,-.22,.85),tone:'stone'},{poly:rect(.22,.05,.42,.85),tone:'stone'},{poly:rect(-.22,.38,.22,.52),tone:'stone'}];
  if(k==='waterworks')return [{poly:circle(-.15,.4,.26,14),tone:'water'},{poly:rect(.18,.1,.44,.7),tone:'stone'}];
  if(k==='powerworks')return [{poly:rect(-.44,.05,.3,.7),tone:'shed'},{poly:circle(.36,.2,.07,8),tone:'chimney'},{poly:circle(.36,.5,.07,8),tone:'chimney'}];
  if(['station','transit_hub'].includes(k))return [{poly:rect(-.48,.05,.48,.5),tone:'shed',saw:true},{poly:rect(-.48,.56,.48,.62),tone:'stone'}];
  if(k==='monument')return [{poly:circle(0,.42,.32,16),tone:'square'},{poly:rect(-.07,.35,.07,.49),tone:'tower'}];
  if(k==='port')return [{poly:rect(-.46,0,.46,.42),tone:'stone'},{poly:rect(-.3,.42,-.18,.98),tone:'stone'},{poly:rect(.18,.42,.3,.98),tone:'stone'}];
  if(k==='workshop')return [{poly:rect(-.42,.02,.12,.5),tone:'stone'},{poly:rect(.16,.2,.44,.62),tone:'shed'}];
  if(k==='metropolis_charter')return [{poly:rect(-.4,.05,-.02,.45),tone:'tower'},{poly:rect(.06,.1,.42,.7),tone:'tower'}];
  return [{poly:rect(-.38,.05,.38,.7),tone:'stone'}];
}
function buildingShapes(b,roadSet,mainSet,warp=null){
  const hit=shapeCache.get(b);if(hit&&hit.warp===warp)return hit;
  const x=Math.floor(b.x),y=Math.floor(b.y),r=rand(hash(x,y,b.born|0,(b.id||'').length*7919)),size=sizeOf(b);
  const {d}=frontOf(b,roadSet,mainSet,size);
  const organic=(b.born||1300)<1600,jitter=(organic?(r()-.5)*.22:(r()-.5)*.06);
  let dx=d.dx,dy=d.dy;const c=Math.cos(jitter),s=Math.sin(jitter);[dx,dy]=[dx*c-dy*s,dx*s+dy*c];
  const px=-dy,py=dx,cx=x+size/2,cy=y+size/2,shrink=(b.informal?.85:1)*size;
  const local=([u,v])=>[cx+px*u*shrink+dx*(.47-v)*shrink,cy+py*u*shrink+dy*(.47-v)*shrink];
  const toWorld=warp?pt=>{const [wx,wy]=local(pt);return warp(wx,wy);}:local;
  const shapes=plan(b,r).map(p=>({...p,pts:p.poly.map(toWorld)}));
  // Red fired-tile roofs are an accent of old residential quarters only, so
  // they never blur the distinction between uses.
  const value={shapes,red:b.type==='res'&&r()<(organic?.14:.09),shade:Math.floor(r()*4),warp,size};
  shapeCache.set(b,value);return value;
}
function toneColor(tone,b,look,layerColor){
  if(layerColor&&!['green','water','tree','square','yard'].includes(tone))return tone==='awning'?layerColor:layerColor;
  const sty=b.style||styleAt(b.born||1300);
  switch(tone){
    case 'roof':return roofTone(b.type,sty,look.shade,look.red);
    // Sheds (workshops, barns) are a darker shade of their use's roof.
    case 'shed':return roofTone(b.type,sty,3);
    case 'awning':return '#c49a5a';
    case 'stone':return STONE;case 'tower':return '#a8936f';case 'cloister':return '#bfae8c';
    case 'square':return '#e2d6b8';case 'yard':return '#cfc79f';case 'green':return '#9fb084';case 'tree':return '#6f8a5f';
    case 'water':return WATER;case 'chimney':return '#4f4640';
    default:return roofTone(b.type,sty,0);
  }
}

// An offscreen layer the size of the target canvas, carrying its transform,
// for drawing buildings that can then have the streets cut out of them.
// Returns null without a DOM (tests) or a plain recording context.
const buildingLayers=new Map();
function buildingLayer(ctx){
  const c=ctx.canvas;if(typeof document==='undefined'||!c||!(c.width>0)||typeof ctx.getTransform!=='function')return null;
  const id=`${c.width}x${c.height}`;let layer=buildingLayers.get(id);
  if(!layer){if(buildingLayers.size>3)buildingLayers.clear();layer=offscreen(c.width,c.height);if(!layer)return null;buildingLayers.set(id,layer);}
  const g=layer.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.globalAlpha=1;g.clearRect(0,0,layer.width,layer.height);g.setTransform(ctx.getTransform());
  return g;
}
// ───────────────────────── decorations ─────────────────────────
function windmill(ctx,x,y,angle,scale=1){
  ctx.save();ctx.translate(x,y);ctx.fillStyle='#5a4a3a';ctx.beginPath();ctx.arc(0,0,.16*scale,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#4a3d31';ctx.lineWidth=.07*scale;ctx.beginPath();
  for(let i=0;i<4;i++){const a=angle+i*Math.PI/2;ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*.55*scale,Math.sin(a)*.55*scale);}
  ctx.stroke();ctx.restore();
}
function boat(ctx,x,y,a,steam){
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='#5b4a3a';ctx.beginPath();ctx.ellipse(0,0,.42,.14,0,0,Math.PI*2);ctx.fill();
  if(steam){ctx.fillStyle='#3f3a36';ctx.fillRect(-.06,-.08,.12,.12);}else{ctx.fillStyle='#f4ecd8';ctx.beginPath();ctx.moveTo(-.05,-.05);ctx.lineTo(.18,-.05);ctx.lineTo(-.05,-.42);ctx.closePath();ctx.fill();}
  ctx.restore();
}
const boatCache=new Map();
function boatSpots(city){
  const id=`${city.type}:${city.seed}`;if(boatCache.has(id))return boatCache.get(id);
  const o=cityOrigin(city),spots=[],r=rand(hash(city.seed,515));
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){if(terrain(city.type,x,y)!=='water')continue;
    const shore=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>terrain(city.type,x+dx*2,y+dy*2)==='land');
    const d=Math.hypot(x-o.x,y-o.y);if(d<34&&(shore||r()<.2))spots.push({x:x+.5,y:y+.5,d,h:r()});}
  spots.sort((a,b)=>a.h-b.h);boatCache.set(id,spots);return spots;
}

// ───────────────────────── main entry ─────────────────────────
// Draw `city` into a 2D context sized width×height (CSS pixels).
// opts: {view:{zoom,dx,dy}, layer, selectedId, previewRing, bridgePreview,
//        selection:{x,y,w,h,line,fill}, hover:{x,y}, placing, captions:[{text,x,y,alpha}],
//        now (ms), cartouche (bool), population}
export function mapTransform(width,height,view={zoom:1,dx:0,dy:0}){const scale=Math.min(width/W,height/H)*view.zoom;return {scale,ox:(width-W*scale)/2+view.dx,oy:(height-H*scale)/2+view.dy};}
export function drawCity(ctx,city,width,height,opts={}){
  const layer=opts.layer||'urban',now=opts.now||0,warp=mapWarp(city);
  const {scale,ox,oy}=mapTransform(width,height,opts.view);
  ctx.fillStyle=paperPattern(ctx);ctx.fillRect(0,0,width,height);
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  const fields=fieldsLayer(city.type,city.seed);if(fields){ctx.imageSmoothingEnabled=true;ctx.drawImage(fields,0,0,W,H);}
  // Zoning: a wash on the zoning layer, a whisper on the urban map.
  if(layer==='zones'||layer==='urban')for(let y=0;y<H;y++)for(let x=0;x<W;x++){const type=zoneCell(city,x,y);if(type){ctx.fillStyle=ZONES[type].color+(layer==='zones'?'66':'18');ctx.fillRect(x,y,1,1);}}
  const influence=['value','pollution','coverage','pull'].includes(layer)?cityFields(city):null;
  const districts=['urban','districts','zones'].includes(layer)&&city.districts?.length?districtDetails(city,cityOrigin(city)):null;
  if(layer==='districts'&&districts)for(let k=0;k<W*H;k++){const i=districts.grid[k];if(i>=0){ctx.fillStyle=DISTRICT_COLORS[i%DISTRICT_COLORS.length]+'38';ctx.fillRect(k%W,Math.floor(k/W),1,1);}}
  if(influence)for(let k=0;k<W*H;k++){const x=k%W,y=Math.floor(k/W);
    if(layer==='value'){const v=Math.max(-1,Math.min(1,influence.prestige[k]*.7-influence.pollution[k]*influence.homeShield*.6));if(Math.abs(v)<.05)continue;ctx.fillStyle=v>0?`rgba(92,140,96,${Math.min(.55,v*.6)})`:`rgba(150,95,70,${Math.min(.55,-v*.6)})`;ctx.fillRect(x,y,1,1);}
    else if(layer==='pollution'){const v=influence.pollution[k]*influence.homeShield;if(v<.1)continue;ctx.fillStyle=`rgba(96,82,104,${Math.min(.6,v*.35)})`;ctx.fillRect(x,y,1,1);}
    else if(layer==='pull'){const hp=influence.homePull[k],sp=influence.shopPull[k],v=Math.max(hp,sp);if(v<.08)continue;ctx.fillStyle=hp>=sp?`rgba(151,103,76,${Math.min(.5,v*.32)})`:`rgba(196,150,62,${Math.min(.55,v*.36)})`;ctx.fillRect(x,y,1,1);}
    else if(layer==='coverage'){const v=influence.service[k];if(v<.05)continue;ctx.fillStyle=v>=.35?`rgba(83,135,115,${Math.min(.45,.15+v*.15)})`:'rgba(83,135,115,.08)';ctx.fillRect(x,y,1,1);}}
  const water=waterLayer(city.type);if(water)ctx.drawImage(water,0,0,W,H);
  const walls=city.walls||[];
  // Canals follow the old wall line, under the quays.
  for(const ring of walls)if(ring.state==='canal'){ctx.beginPath();for(const [a,b] of wallSegments(ring)){ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=WATER_EDGE;ctx.lineWidth=1.05;ctx.stroke();ctx.strokeStyle=WATER;ctx.lineWidth=.82;ctx.stroke();}
  // Town ground: built plots read as one urban fabric against the fields.
  if(layer!=='zones'){ctx.fillStyle='rgba(226,216,186,.92)';ctx.beginPath();
    for(const b of city.buildings||[]){if(b.type==='farm')continue;const n=sizeOf(b),[x,y]=warp(Math.floor(b.x)+n/2,Math.floor(b.y)+n/2);ctx.rect(x-n/2-.1,y-n/2-.1,n+.2,n+.2);}ctx.fill();}
  // Streets.
  const {chains,dots}=warpChains(streetChains(city),warp);
  const routeLines=(city.routes||[]).map(route=>chaikin(route.cells.map(([x,y])=>warp(x+.5,y+.5)),3)).filter(pts=>pts.length>=2);
  ctx.lineCap='round';ctx.lineJoin='round';
  for(const pass of [0,1]){
    for(const ch of chains){const wide=streetWidth(ch.pattern),[fill,edge]=STREET_TONE[ch.pattern]||STREET_TONE.organic;
      ctx.beginPath();strokePath(ctx,ch.pts);ctx.strokeStyle=pass?fill:edge;ctx.lineWidth=pass?wide*.58:wide;ctx.stroke();}
  }
  ctx.fillStyle=STREET;for(const [x,y] of dots){ctx.beginPath();ctx.arc(x,y,.16,0,Math.PI*2);ctx.fill();}
  for(const road of city.roads||[])if(road.orientation){ctx.beginPath();ctx.strokeStyle=STREET;ctx.lineWidth=.42;if(road.orientation==='h'){ctx.moveTo(road.from,road.v);ctx.lineTo(road.to,road.v);}else{ctx.moveTo(road.v,road.from);ctx.lineTo(road.v,road.to);}ctx.stroke();}
  // Main roads: the old country roads that became high streets.
  for(const pts of routeLines){
    ctx.beginPath();strokePath(ctx,pts);ctx.strokeStyle='rgba(112,94,70,.55)';ctx.lineWidth=.8;ctx.stroke();ctx.strokeStyle='#f2e7cd';ctx.lineWidth=.46;ctx.stroke();}
  // Boulevards on the old wall line, lined with trees.
  for(const ring of walls)if(ring.state==='boulevard'){ctx.beginPath();for(const [a,b] of wallSegments(ring)){ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.strokeStyle='rgba(112,94,70,.5)';ctx.lineWidth=1.05;ctx.stroke();ctx.strokeStyle='#f2e7cd';ctx.lineWidth=.62;ctx.stroke();}
  // Canal quays.
  for(const ring of walls)if(ring.state==='canal'){ctx.beginPath();for(const [a,b] of wallSegments(ring)){ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=.12;ctx.stroke();}
  // Bridges: decks with piers.
  for(const b of city.bridges||[]){if(!b.cells?.length)continue;const [ax,ay]=b.cells[0],[bx,by]=b.cells.at(-1),h=b.axis==='h';
    const x0=h?ax-.15:ax+.2,y0=h?ay+.2:ay-.15,w=h?bx-ax+1.3:.6,hh=h?.6:by-ay+1.3;
    ctx.fillStyle='rgba(60,50,40,.25)';ctx.fillRect(x0+.06,y0+.08,w,hh);ctx.fillStyle='#b7a27f';ctx.fillRect(x0,y0,w,hh);ctx.fillStyle=STREET;ctx.fillRect(h?x0:x0+.14,h?y0+.14:y0,h?w:.32,h?.32:hh);}
  // Buildings: shadows, then roofs grouped by colour.
  const roadSet=new Set(),mainSet=new Set();for(const r of city.roads||[])if(Number.isFinite(r.x)&&r.cls!=='bridge'){roadSet.add(r.y*W+r.x);if(r.cls==='main')mainSet.add(r.y*W+r.x);}
  const buckets=new Map(),shadows=[],vacant=[],saws=[],outlines=[],ridges=[],parapets=[];
  for(const b of city.buildings||[]){
    const look=buildingShapes(b,roadSet,mainSet,warp);
    let layerColor=null;
    if(layer==='age')layerColor=({timber:'#6d6252',stone:'#967d61',classical:'#c0a887',brick:'#ab765e',modernist:'#7c8d8b',contemporary:'#597f8b'})[b.style||styleAt(b.born||1300)];
    else if(layer==='coverage')layerColor=b.type==='civic'||['chapel','school','clinic','hospital','town_hall','library','civic_center','monastery','shrine','university','waterworks'].includes(b.special)?'#3f7462':b.type==='res'?(influence&&influence.service[Math.floor(b.y)*W+Math.floor(b.x)]>=.35?'#9fb7a5':'#c0806b'):'#c8c1b2';
    else if(layer==='pollution')layerColor=b.type==='craft'?'#5f5468':b.type==='res'?(influence&&influence.pollution[Math.floor(b.y)*W+Math.floor(b.x)]*influence.homeShield>=.8?'#a2513f':'#bcb3a2'):'#cdc6b6';
    else if(layer==='districts'&&districts){const i=districts.grid[Math.floor(b.y)*W+Math.floor(b.x)];layerColor=i>=0?DISTRICT_COLORS[i%DISTRICT_COLORS.length]:'#bdb6a4';}
    else if(layer==='economy')layerColor=b.type==='hotel'?'#ba7b9e':b.type==='trade'?'#d09e52':b.type==='craft'?'#9c8272':b.type==='farm'?'#b5bf79':b.type==='civic'?'#7d9a7e':'#b5aea1';
    else if(layer==='heritage')layerColor=b.protected?'#9a7149':city.year-(b.born||city.year)>=120?'#c09a67':'#c7c0ad';
    else if(layer==='influence')layerColor=b.special?(['workshop','monument','museum'].includes(b.special)?'#a27aa1':['monastery','shrine','chapel'].includes(b.special)?'#b6a16c':b.special==='university'?'#6d9aa4':'#7d9a7e'):b.type==='civic'?'#c0ac8a':'#c8c1b2';
    else if(layer==='zones')layerColor=ZONES[b.type]?.color;
    else if(layer==='pull')layerColor=b.type==='res'?'#977b60':b.type==='trade'?'#c2a064':b.special?'#7d9a7e':'#c8c1b2';
    for(const sh of look.shapes){
      if(b.vacant){vacant.push(sh.pts);continue;}
      if(!['green','square','water','yard'].includes(sh.tone))shadows.push(sh.pts);
      if(sh.tone==='roof'&&sh.pts.length===4&&layer==='urban'){const sty=b.style||styleAt(b.born||1300);(sty==='modernist'||sty==='contemporary'?parapets:ridges).push(sh.pts);}
      const col=toneColor(sh.tone,b,look,layerColor),alpha=b.informal?.78:1,key=`${col}|${alpha}`;
      if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(sh.pts);
      if(sh.saw)saws.push(sh.pts);
    }
    if(b.special&&!b.vacant&&layer==='urban')outlines.push(look.shapes);
  }
  const g=buildingLayer(ctx)||ctx;
  const fillPolys=(list)=>{g.beginPath();for(const pts of list){g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();}g.fill();};
  g.save();g.translate(.07,.09);g.fillStyle='rgba(58,44,32,.22)';fillPolys(shadows);g.restore();
  for(const [key,list] of buckets){const [col,alpha]=key.split('|');g.globalAlpha=Number(alpha);g.fillStyle=col;fillPolys(list);}
  g.globalAlpha=1;
  // Sawtooth roofs on industrial sheds.
  if(saws.length){g.strokeStyle='rgba(40,34,30,.45)';g.lineWidth=.04;g.beginPath();for(const p of saws){const [a,b,c2,d]=p;for(let t=.15;t<1;t+=.2){g.moveTo(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);g.lineTo(d[0]+(c2[0]-d[0])*t,d[1]+(c2[1]-d[1])*t);}}g.stroke();}
  // Landmarks get a fine ink outline.
  g.strokeStyle=STONE_EDGE;g.lineWidth=.05;for(const shapes of outlines){g.beginPath();for(const sh of shapes){const pts=sh.pts;g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();}g.stroke();}
  if(vacant.length){g.setLineDash([.1,.08]);g.strokeStyle='rgba(110,96,78,.8)';g.lineWidth=.05;g.beginPath();for(const pts of vacant){g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();}g.stroke();g.setLineDash([]);}
  // Pitched roofs: a ridge along the long axis and a lit slope; flat modern roofs: a parapet.
  if(ridges.length){g.fillStyle='rgba(255,246,226,.13)';g.beginPath();
    for(const [a,b,c2,d] of ridges){const long=Math.hypot(b[0]-a[0],b[1]-a[1])>=Math.hypot(c2[0]-b[0],c2[1]-b[1]);
      const [p,q,r2,t]=long?[a,b,c2,d]:[b,c2,d,a],m1=[(t[0]+p[0])/2,(t[1]+p[1])/2],m2=[(q[0]+r2[0])/2,(q[1]+r2[1])/2];
      g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.lineTo(m2[0],m2[1]);g.lineTo(m1[0],m1[1]);g.closePath();}
    g.fill();g.strokeStyle='rgba(42,30,22,.32)';g.lineWidth=.028;g.beginPath();
    for(const [a,b,c2,d] of ridges){const long=Math.hypot(b[0]-a[0],b[1]-a[1])>=Math.hypot(c2[0]-b[0],c2[1]-b[1]);
      const [p,q,r2,t]=long?[a,b,c2,d]:[b,c2,d,a],m1=[(t[0]+p[0])/2,(t[1]+p[1])/2],m2=[(q[0]+r2[0])/2,(q[1]+r2[1])/2],ins=.12;
      g.moveTo(m1[0]+(m2[0]-m1[0])*ins,m1[1]+(m2[1]-m1[1])*ins);g.lineTo(m2[0]+(m1[0]-m2[0])*ins,m2[1]+(m1[1]-m2[1])*ins);}
    g.stroke();}
  if(parapets.length){g.strokeStyle='rgba(255,252,244,.3)';g.lineWidth=.035;g.beginPath();
    for(const pts of parapets){const cx=pts.reduce((n,v)=>n+v[0],0)/4,cy=pts.reduce((n,v)=>n+v[1],0)/4;pts.forEach(([x,y],i)=>{const px=x+(cx-x)*.16,py=y+(cy-y)*.16;if(i)g.lineTo(px,py);else g.moveTo(px,py);});g.closePath();}
    g.stroke();}
  // Keep every building clear of the streets: cut the street network (with a
  // small setback) out of the building layer, then lay the layer on the map.
  if(g!==ctx){g.globalCompositeOperation='destination-out';g.lineCap='round';g.lineJoin='round';g.strokeStyle='#000';
    for(const ch of chains){g.beginPath();strokePath(g,ch.pts);g.lineWidth=streetWidth(ch.pattern)+.08;g.stroke();}
    for(const pts of routeLines){g.beginPath();strokePath(g,pts);g.lineWidth=.88;g.stroke();}
    for(const ring of walls)if(ring.state==='boulevard'){g.beginPath();for(const [a,b] of wallSegments(ring)){g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);}g.lineWidth=1.1;g.stroke();}
    g.globalCompositeOperation='source-over';
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.drawImage(g.canvas,0,0);ctx.restore();}
  // Windmills on farms and, in the Dutch manner, on the bastions (before 1900).
  if(city.year<1900){const turn=now/2600;
    for(const b of city.buildings||[])if(b.type==='farm'&&!b.vacant&&(hash(Math.floor(b.x),Math.floor(b.y),5)&3)===0)windmill(ctx,b.x+.75,b.y+.75,turn+(b.x+b.y),1);}
  // Standing walls: masonry following the town, towers or bastions, gates.
  for(const wall of walls)if(wall.state==='wall'){
    const segs=wallSegments(wall),bastions=(wall.built||1300)>=1550;
    ctx.beginPath();for(const [a,b] of segs){ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#5f4c3a';ctx.lineWidth=.5;ctx.stroke();ctx.strokeStyle='#9c8466';ctx.lineWidth=.2;ctx.stroke();
    const pts=wallPolygon(wall);
    pts.forEach((p,i)=>{if(p[2]||i%3)return;const cx=wall.cx??p[0],cy=wall.cy??p[1],a=Math.atan2(p[1]-cy,p[0]-cx);
      ctx.fillStyle='#5f4c3a';
      if(bastions){ctx.beginPath();ctx.moveTo(p[0]+Math.cos(a)*.8,p[1]+Math.sin(a)*.8);ctx.lineTo(p[0]+Math.cos(a+1.25)*.42,p[1]+Math.sin(a+1.25)*.42);ctx.lineTo(p[0]+Math.cos(a+Math.PI)*.2,p[1]+Math.sin(a+Math.PI)*.2);ctx.lineTo(p[0]+Math.cos(a-1.25)*.42,p[1]+Math.sin(a-1.25)*.42);ctx.closePath();ctx.fill();
        if(city.year<1900&&i%6===0)windmill(ctx,p[0]+Math.cos(a)*.35,p[1]+Math.sin(a)*.35,now/2600+i,.8);}
      else{ctx.beginPath();ctx.arc(p[0],p[1],.36,0,Math.PI*2);ctx.fill();}});
    // Gates where main roads pass through.
    for(const route of city.routes||[])for(const [x,y] of route.cells){const px=x+.5,py=y+.5;
      if(segs.some(([a,b])=>distToSeg(px,py,a,b)<.45)){ctx.fillStyle='#4d3d2f';ctx.fillRect(px-.42,py-.42,.84,.84);ctx.fillStyle='#e9dcc0';ctx.fillRect(px-.16,py-.16,.32,.32);break;}}
  }
  // Boulevard trees.
  for(const ring of walls)if(ring.state==='boulevard'){ctx.fillStyle='#6f8a5f';for(const [a,b] of wallSegments(ring)){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.floor(len/1.4)),nx=-(b[1]-a[1])/len,ny=(b[0]-a[0])/len;for(let i=0;i<n;i++){const t=(i+.5)/n;for(const s of [-.6,.6]){ctx.beginPath();ctx.arc(a[0]+(b[0]-a[0])*t+nx*s,a[1]+(b[1]-a[1])*t+ny*s,.18,0,Math.PI*2);ctx.fill();}}}}
  // Boats: more with trade; sail before 1850, steam after.
  if(city.type!=='plain'){const spots=boatSpots(city),trade=(city.buildings||[]).filter(b=>b.type==='trade').length+(city.buildings||[]).filter(b=>b.special==='port').length*12;
    const n=Math.min(spots.length,Math.min(18,2+Math.floor(trade/18)));
    for(let i=0;i<n;i++){const s=spots[i],bob=Math.sin(now/1700+i)*.12;boat(ctx,s.x+bob,s.y+Math.cos(now/2100+i)*.08,s.h*Math.PI,city.year>=1850&&i%3===0);}}
  if(city.center)townCenter(ctx,city.center,layer,1,warp(city.center.x+.5,city.center.y+.5));
  // Interaction overlays.
  for(const b of city.buildings||[]){
    if(!(b.protected&&layer==='heritage')&&opts.selectedId!==b.id)continue;
    const n=sizeOf(b),[wx,wy]=warp(Math.floor(b.x)+n/2,Math.floor(b.y)+n/2);
    if(b.protected&&layer==='heritage'){ctx.strokeStyle='#c99b3e';ctx.lineWidth=.1;ctx.strokeRect(wx-n/2+.04,wy-n/2+.04,n-.08,n-.08);}
    if(opts.selectedId===b.id){ctx.strokeStyle='#235e4c';ctx.lineWidth=.16;ctx.strokeRect(wx-n/2-.04,wy-n/2-.04,n+.08,n+.08);}
  }
  if(opts.previewRing){ctx.beginPath();const pts=wallPolygon(opts.previewRing);for(const [a,b] of wallSegments(opts.previewRing)){ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.setLineDash([.5,.4]);ctx.strokeStyle='#5f4c3a';ctx.lineWidth=.24;ctx.stroke();ctx.setLineDash([]);void pts;}
  if(opts.bridgePreview){ctx.fillStyle='#547b5c55';for(const k of opts.bridgePreview.cells)ctx.fillRect(k%W,Math.floor(k/W),1,1);ctx.strokeStyle='#547b5c';ctx.lineWidth=.12;for(const e of opts.bridgePreview.ends)ctx.strokeRect(e.x+.05,e.y+.05,.9,.9);}
  else if(opts.placingCenter&&opts.hover&&opts.hover.x>=0&&opts.hover.x<W&&opts.hover.y>=0&&opts.hover.y<H){
    // Where the first town will be laid out around the Town Center.
    const {x,y}=opts.hover;ctx.setLineDash([.4,.3]);ctx.strokeStyle='#547b5c';ctx.lineWidth=.12;ctx.fillStyle='rgba(84,123,92,.08)';
    ctx.fillRect(x-18,y-11,28,19);ctx.strokeRect(x-18,y-11,28,19);ctx.setLineDash([]);townCenter(ctx,{x,y,level:1},layer,.75);}
  else if(opts.placing&&opts.site){const t=opts.site,bad=!!t.error;ctx.fillStyle=bad?'rgba(162,81,63,.16)':'rgba(84,123,92,.14)';ctx.fillRect(t.x,t.y,t.size,t.size);
    ctx.strokeStyle=bad?'#a2513f':'#547b5c';ctx.lineWidth=.14;ctx.setLineDash([.15,.13]);ctx.strokeRect(t.x+.05,t.y+.05,t.size-.1,t.size-.1);ctx.setLineDash([]);}
  else if(opts.placing&&opts.hover&&opts.hover.x>=0&&opts.hover.x<W&&opts.hover.y>=0&&opts.hover.y<H){ctx.strokeStyle='#547b5c';ctx.lineWidth=.14;ctx.setLineDash([.15,.13]);ctx.strokeRect(opts.hover.x+.05,opts.hover.y+.05,.9,.9);ctx.setLineDash([]);}
  if(opts.selection){const s=opts.selection;ctx.lineWidth=.21;ctx.strokeStyle=s.line||'#3c6d57';ctx.fillStyle=s.fill||'#3c895231';ctx.fillRect(s.x,s.y,s.w,s.h);ctx.strokeRect(s.x,s.y,s.w,s.h);}
  // District names, lettered across the town.
  if(districts&&layer!=='zones'){
    ctx.textAlign='center';ctx.textBaseline='middle';
    for(const d of districts.list){if(d.count<15||(opts.archiveYear&&d.founded>opts.archiveYear))continue;
      const size=Math.max(11/scale,Math.min(1.5,.75+Math.sqrt(d.count)*.04));
      ctx.font=`italic ${size}px Georgia, 'Times New Roman', serif`;ctx.lineWidth=size*.32;ctx.strokeStyle='rgba(246,239,220,.85)';ctx.strokeText(d.name,d.centroid.x,d.centroid.y);
      ctx.fillStyle='#5b4632';ctx.fillText(d.name,d.centroid.x,d.centroid.y);}
    ctx.textAlign='start';ctx.textBaseline='alphabetic';
  }
  ctx.restore();
  // Event captions: italic notes in a soft paper glow, as on an old annotated map.
  for(const cap of opts.captions||[]){if(cap.alpha<=0)continue;
    const px=ox+cap.x*scale,py=oy+cap.y*scale;ctx.save();ctx.globalAlpha=Math.min(1,cap.alpha);
    ctx.font=`italic ${cap.size||14}px Georgia, 'Times New Roman', serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    const maxW=Math.min(300,width*.6),lines=wrap(ctx,cap.text,maxW);const lh=(cap.size||14)*1.25,boxH=lines.length*lh;
    const widest=Math.max(...lines.map(l=>ctx.measureText(l).width));
    // The note sits above its spot (below it near the top edge), kept on screen.
    const above=py-boxH-14>8;const sx=Math.max(widest/2+10,Math.min(width-widest/2-10,px));
    const sy=above?py-14-boxH/2:py+14+boxH/2,top=sy-(lines.length-1)*lh/2;
    ctx.strokeStyle='rgba(106,47,34,.6)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(sx,above?sy+boxH/2:sy-boxH/2);ctx.stroke();
    ctx.fillStyle='#6a2f22';ctx.beginPath();ctx.arc(px,py,2.6,0,Math.PI*2);ctx.fill();
    ctx.shadowColor='rgba(250,245,232,.95)';ctx.shadowBlur=18;ctx.fillStyle='rgba(250,245,232,.55)';
    for(let i=0;i<lines.length;i++){const w=ctx.measureText(lines[i]).width;ctx.fillRect(sx-w/2-6,top+i*lh-lh/2,w+12,lh);}
    ctx.shadowBlur=0;ctx.fillStyle='#6a2f22';for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],sx,top+i*lh);
    ctx.restore();}
  if(opts.cartouche!==false)drawCartouche(ctx,city,width,height,opts);
}
// The Town Center, drawn as the map's civic emblem over the founding
// crossroads: a market cross, then a square with a well, an arcaded piazza
// with a fountain, a tree-ringed plaza, and finally a metropolitan core with a
// tower. Each level is larger, so the town's heart grows with it.
const CENTER_RADIUS=[.55,.95,1.3,1.7,2.1];
function townCenter(ctx,c,layer,alpha=1,pos=null){
  const lvl=Math.max(1,Math.min(5,c.level|0)),R=CENTER_RADIUS[lvl-1],[x,y]=pos||[c.x+.5,c.y+.5];
  ctx.save();ctx.globalAlpha=alpha*(layer==='urban'?1:.75);
  const disc=(r,fill)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();};
  const ring=(r,w,col=STONE_EDGE)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.lineWidth=w;ctx.strokeStyle=col;ctx.stroke();};
  // Paving and a fine inked edge (doubled from the plaza onward).
  ctx.shadowColor='rgba(58,44,32,.25)';ctx.shadowBlur=.3;disc(R,'#e4d8ba');ctx.shadowBlur=0;ring(R,.06);
  if(lvl>=4)ring(R-.18,.035);
  if(lvl>=2){ctx.save();ctx.beginPath();ctx.arc(x,y,R-.06,0,Math.PI*2);ctx.clip();ctx.strokeStyle='rgba(120,104,82,.22)';ctx.lineWidth=.025;ctx.beginPath();
    for(let t=-R;t<=R;t+=.22){ctx.moveTo(x+t,y-R);ctx.lineTo(x+t,y+R);ctx.moveTo(x-R,y+t);ctx.lineTo(x+R,y+t);}ctx.stroke();ctx.restore();}
  // Arcades around a piazza and beyond.
  if(lvl>=3){const n=lvl>=5?16:12;ctx.fillStyle=STONE;ctx.strokeStyle=STONE_EDGE;ctx.lineWidth=.03;
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2,px=x+Math.cos(a)*(R-.32),py=y+Math.sin(a)*(R-.32);ctx.beginPath();ctx.arc(px,py,.09,0,Math.PI*2);ctx.fill();ctx.stroke();}}
  // A ring of trees on the plaza.
  if(lvl>=4){ctx.fillStyle='#6f8a5f';const n=lvl>=5?12:10;for(let i=0;i<n;i++){const a=(i+.5)/n*Math.PI*2;ctx.beginPath();ctx.arc(x+Math.cos(a)*(R-.62),y+Math.sin(a)*(R-.62),.14,0,Math.PI*2);ctx.fill();}}
  // Centrepiece: cross, well, fountain, obelisk, tower.
  if(lvl===1){ctx.fillStyle='#4d3f31';ctx.fillRect(x-.05,y-.3,.1,.6);ctx.fillRect(x-.2,y-.16,.4,.09);}
  else if(lvl===2){disc(.22,STONE);ring(.22,.04);disc(.11,WATER);}
  else if(lvl===3){disc(.38,STONE);ring(.38,.04);disc(.28,WATER);disc(.08,STONE);}
  else if(lvl===4){disc(.42,STONE);ring(.42,.04);disc(.32,WATER);ctx.fillStyle='#a8936f';ctx.beginPath();ctx.moveTo(x,y-.34);ctx.lineTo(x+.1,y);ctx.lineTo(x,y+.1);ctx.lineTo(x-.1,y);ctx.closePath();ctx.fill();}
  else{ctx.fillStyle='#a8936f';ctx.strokeStyle=STONE_EDGE;ctx.lineWidth=.05;ctx.fillRect(x-.42,y-.42,.84,.84);ctx.strokeRect(x-.42,y-.42,.84,.84);ctx.fillStyle='#7d8a8c';ctx.fillRect(x-.24,y-.24,.48,.48);disc(.1,'#4d3f31');}
  ctx.restore();
}
function distToSeg(px,py,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],t=Math.max(0,Math.min(1,((px-a[0])*vx+(py-a[1])*vy)/(vx*vx+vy*vy||1)));return Math.hypot(a[0]+vx*t-px,a[1]+vy*t-py);}
export function wrap(ctx,text,max){const words=String(text).split(/\s+/),lines=[];let line='';for(const w of words){const t=line?`${line} ${w}`:w;if(ctx.measureText(t).width>max&&line){lines.push(line);line=w;}else line=t;}if(line)lines.push(line);return lines;}
const ERA=y=>y<1500?'Medieval':y<1750?'Early modern':y<1850?'Enlightenment':y<1950?'Industrial':y<2000?'Metropolitan':'Contemporary';
// Title, year, era and population in the top-left; compass and scale below.
function drawCartouche(ctx,city,width,height,opts){
  const small=width<520,glow=(fn)=>{ctx.save();ctx.shadowColor='rgba(248,242,226,.95)';ctx.shadowBlur=10;fn();ctx.restore();};
  ctx.textBaseline='alphabetic';ctx.textAlign='left';
  const x=16,y=small?30:38,year=opts.archiveYear??city.year;
  // A soft parchment cloud behind the title keeps it legible over the town.
  const grad=ctx.createRadialGradient(x+70,y+8,10,x+70,y+8,small?120:170);grad.addColorStop(0,'rgba(240,233,212,.9)');grad.addColorStop(.6,'rgba(240,233,212,.6)');grad.addColorStop(1,'rgba(240,233,212,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,small?240:330,small?90:110);
  glow(()=>{ctx.fillStyle='#3e3326';ctx.font=`${small?26:34}px Georgia, 'Times New Roman', serif`;ctx.fillText(String(year),x,y+(small?2:6));});
  glow(()=>{ctx.fillStyle='#8a3b2b';ctx.font=`${small?10:12}px Georgia, serif`;ctx.fillText(city.name.toUpperCase().split('').join(' '),x,y+(small?18:26));});
  const pop=opts.population||0,rounded=pop>=10000?Math.round(pop/1000)*1000:Math.round(pop/100)*100;
  glow(()=>{ctx.fillStyle='#5b4b39';ctx.font=`italic ${small?11:13}px Georgia, serif`;ctx.fillText(`${ERA(year)}${pop?` · pop. c. ${rounded.toLocaleString('en-US')}`:''}`,x,y+(small?32:44));});
  // Compass rose.
  const cx=30,cy=height-62;ctx.save();ctx.translate(cx,cy);ctx.fillStyle='#4d3f31';
  for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,len=i%2?7:14;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a-.25)*3,Math.sin(a-.25)*3);ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len);ctx.lineTo(Math.cos(a+.25)*3,Math.sin(a+.25)*3);ctx.closePath();ctx.globalAlpha=i%2?.55:1;ctx.fill();}
  ctx.globalAlpha=1;ctx.font='10px Georgia, serif';ctx.textAlign='center';ctx.fillText('N',0,-18);ctx.restore();
  // Scale bar: a map cell is about 40 yards.
  const {scale}=mapTransform(width,height,opts.view),bar=5*scale;
  ctx.fillStyle='#4d3f31';ctx.fillRect(16,height-26,bar,1.6);ctx.fillRect(16,height-30,1.2,6);ctx.fillRect(16+bar-1.2,height-30,1.2,6);
  ctx.font='italic 11px Georgia, serif';ctx.textAlign='left';ctx.fillText('200 yards',16,height-34);
}
