// CIVITAS v2.3 — urban works: cards that lay out part of the town's street
// plan where you tap, one kind per age. A High Street in the Middle Ages, a
// planned New Town and garden squares in the 17th–18th centuries, an
// industrial grid and Haussmann boulevards in the 19th, garden suburbs and a
// ring road in the 20th. Each plan is pure: planUrbanWork() says which street
// cells, zones and cleared buildings the work needs; sim.js applies it.
import {W,H,key,kx,ky,within,DIRS4} from './geo.js';
import {buildGrids} from './growth.js';

// kind → plan settings. name: the quarter's name once it has houses.
export const URBAN_WORKS={
  high_street:{label:'High Street',w:14,zone:'trade',name:null},
  piazza:{label:'Piazza',w:9,zone:'trade',name:null},
  planned_extension:{label:'New Town',w:13,h:9,step:4,zone:'res',name:'New Town'},
  garden_square:{label:'Garden Square',w:9,h:9,zone:'res',name:'The Square'},
  industrial_quarter:{label:'Industrial Quarter',w:15,h:11,step:5,spine:true,zone:'craft',name:'The Works'},
  grand_boulevard:{label:'Grand Boulevard',w:0,name:null},
  garden_suburb:{label:'Garden Suburb',w:15,h:11,zone:'res',name:'Garden Suburb'},
  ring_road:{label:'Ring Road',w:0,name:null}
};

const cell=(x,y)=>({x,y});
// Land the work may use: on the map, not water. Streets over streets are fine.
function usable(g,x,y){return within(x,y)&&x>0&&y>0&&x<W-1&&y<H-1&&!g.water[key(x,y)];}
// Centre a w×h rectangle on (x,y), kept on the map.
function rectAt(x,y,w,h){const x0=Math.max(1,Math.min(W-1-w,Math.round(x-w/2))),y0=Math.max(1,Math.min(H-1-h,Math.round(y-h/2)));return {x:x0,y:y0,w,h};}
// Cells of a lattice inside a rectangle, its outline included.
function lattice(r,step){const out=[];for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){if((y-r.y)%step===0||y===r.y+r.h-1||(x-r.x)%step===0||x===r.x+r.w-1)out.push(cell(x,y));}return out;}
// Shortest straight-ish link from a point to the existing street network.
function linkToNetwork(g,from){
  let best=null,bd=Infinity;for(const k of g.roadKeys){const d=Math.abs(kx(k)-from.x)+Math.abs(ky(k)-from.y);if(d<bd){bd=d;best={x:kx(k),y:ky(k)};}}
  if(!best||bd>40)return [];
  const out=[];let x=from.x,y=from.y;while(x!==best.x){x+=Math.sign(best.x-x);out.push(cell(x,y));}while(y!==best.y){y+=Math.sign(best.y-y);out.push(cell(x,y));}return out;
}
// The point of a rectangle's outline nearest to the town centre.
function nearestEdge(r,o){const x=Math.max(r.x,Math.min(r.x+r.w-1,o.x)),y=Math.max(r.y,Math.min(r.y+r.h-1,o.y));return {x,y};}
function waterShare(g,cells){if(!cells.length)return 1;return cells.filter(c=>!usable(g,c.x,c.y)).length/cells.length;}

// Plan a work. ctx: {origin:{x,y}, reach}. Returns {streets:[{x,y,cls}], zone, clear:[ids], garden, name, summary} or {error}.
export function planUrbanWork(city,kind,x,y,ctx){
  const spec=URBAN_WORKS[kind];if(!spec)return {error:'Unknown work'};
  const g=buildGrids(city),o=ctx.origin;
  if(!within(x,y)||g.water[key(x,y)])return {error:'Choose dry land'};
  const streets=[],add=(list,cls='minor')=>{for(const c of list)if(usable(g,c.x,c.y))streets.push({x:c.x,y:c.y,cls});};
  let zone=null,clear=[],garden=null,summary='';
  if(kind==='high_street'){
    // A straight main street from the tap toward the town centre, up to w cells.
    const dx=o.x-x,dy=o.y-y,horizontal=Math.abs(dx)>=Math.abs(dy),line=[];
    for(let i=0;i<spec.w;i++){const cx=horizontal?x+Math.sign(dx||1)*i:x,cy=horizontal?y:y+Math.sign(dy||1)*i;if(!usable(g,cx,cy))break;line.push(cell(cx,cy));if(g.road[key(cx,cy)]&&i>2)break;}
    if(line.length<5)return {error:'Not enough open land for a high street here'};
    add(line,'main');const xs=line.map(c=>c.x),ys=line.map(c=>c.y);
    zone={x:Math.min(...xs)-(horizontal?0:1),y:Math.min(...ys)-(horizontal?1:0),w:horizontal?line.length:3,h:horizontal?3:line.length,type:spec.zone};
    summary=`a high street of ${line.length} parcels`;
  }else if(kind==='piazza'){
    // A paved square (a market place) with four straight main streets out of it.
    const arm=Math.floor(spec.w/2)+2,arms=[];
    for(const [dx,dy] of DIRS4)for(let i=2;i<=arm;i++){const cx=x+dx*i,cy=y+dy*i;if(!usable(g,cx,cy))break;arms.push(cell(cx,cy));}
    if(arms.length<8)return {error:'A piazza needs open land around it'};
    add(arms,'main');garden={x:x-1,y:y-1,kind:'market'};zone={x:x-arm,y:y-arm,w:arm*2+1,h:arm*2+1,type:'trade'};summary='a piazza with four straight streets';
  }else if(kind==='planned_extension'||kind==='industrial_quarter'){
    const r=rectAt(x,y,spec.w,spec.h),cells=lattice(r,spec.step);
    if(waterShare(g,cells)>.25)return {error:'Too much water here for a planned quarter'};
    // Framed by main avenues (so it becomes its own district), a lattice inside.
    const edge=c=>c.x===r.x||c.y===r.y||c.x===r.x+r.w-1||c.y===r.y+r.h-1;
    add(cells.filter(c=>!edge(c)));add(cells.filter(edge),'main');
    add(linkToNetwork(g,nearestEdge(r,o)),'main');
    zone={...r,type:spec.zone};summary=`a ${r.w}×${r.h} grid of streets`;
  }else if(kind==='garden_square'){
    // A square of garden ringed by a street, homes zoned around it.
    const r=rectAt(x,y,7,7),ring=[];for(let yy=r.y;yy<r.y+r.h;yy++)for(let xx=r.x;xx<r.x+r.w;xx++)if(yy===r.y||yy===r.y+r.h-1||xx===r.x||xx===r.x+r.w-1)ring.push(cell(xx,yy));
    if(waterShare(g,ring)>.1)return {error:'A square needs dry land all round'};
    add(ring);add(linkToNetwork(g,nearestEdge(r,o)));
    garden={x:r.x+2,y:r.y+2};zone={x:r.x-2,y:r.y-2,w:r.w+4,h:r.h+4,type:'res'};summary='a garden square';
  }else if(kind==='garden_suburb'){
    // A loop of road with a crescent inside: wide plots, curving streets.
    const r=rectAt(x,y,spec.w,spec.h),cx=r.x+r.w/2,cy=r.y+r.h/2;
    const oval=(rx,ry)=>{const out=[];for(let a=0;a<360;a+=3){const t=a*Math.PI/180,px=Math.round(cx+rx*Math.cos(t)),py=Math.round(cy+ry*Math.sin(t));if(!out.some(c=>c.x===px&&c.y===py))out.push(cell(px,py));}return out;};
    const outer=oval(r.w/2-.5,r.h/2-.5),inner=oval(r.w/4,r.h/4);
    if(waterShare(g,outer)>.25)return {error:'Too much water here for a suburb'};
    // The outer loop is a main road (the suburb's own district); a crescent and a lane inside.
    add(outer,'main');add(inner);add([...Array(Math.round(r.w/4))].map((_,i)=>cell(Math.round(cx-r.w/4-1-i),Math.round(cy))));
    add(linkToNetwork(g,nearestEdge(r,o)));zone={...r,type:'res'};summary='a garden suburb of curving streets';
  }else if(kind==='grand_boulevard'){
    // A straight avenue across the built town through the tap; buildings in its way are cleared.
    const built=city.buildings||[];let horizontal=true,span=[0,0];
    const along=(h)=>{const row=built.filter(b=>h?Math.abs(Math.floor(b.y)-y)<=3:Math.abs(Math.floor(b.x)-x)<=3).map(b=>h?b.x:b.y);return row.length?[Math.min(...row)-2,Math.max(...row)+2]:[0,0];};
    const hs=along(true),vs=along(false);horizontal=hs[1]-hs[0]>=vs[1]-vs[0];span=horizontal?hs:vs;
    if(span[1]-span[0]<8)return {error:'Lay a boulevard across the built town'};
    const line=[];for(let i=Math.max(1,Math.floor(span[0]));i<=Math.min(horizontal?W-2:H-2,Math.ceil(span[1]));i++){const cx=horizontal?i:x,cy=horizontal?y:i;if(usable(g,cx,cy))line.push(cell(cx,cy));}
    add(line,'main');
    const cells=new Set(line.map(c=>key(c.x,c.y)));
    clear=built.filter(b=>!b.protected&&!b.special&&cells.has(key(Math.floor(b.x),Math.floor(b.y)))).map(b=>b.id);
    summary=`a boulevard of ${line.length} parcels${clear.length?`, clearing ${clear.length} buildings`:''}`;
  }else if(kind==='ring_road'){
    const R=Math.max(8,Math.min(24,(ctx.reach||12)*.55)),ring=[];
    for(let a=0;a<360;a+=1){const t=a*Math.PI/180,px=Math.round(o.x+R*Math.cos(t)),py=Math.round(o.y+R*.8*Math.sin(t));if(!ring.some(c=>c.x===px&&c.y===py))ring.push(cell(px,py));}
    add(ring,'main');summary=`a ring road ${Math.round(R)} parcels out`;
  }
  // Drop duplicates and cells already of that class or better.
  const seen=new Set(),out=[];for(const s of streets){const k=key(s.x,s.y);if(seen.has(k))continue;seen.add(k);const have=g.road[k];if(have&&(s.cls==='minor'||have>=2))continue;out.push(s);}
  if(!out.length)return {error:'Nothing new to lay out here'};
  return {streets:out,zone,clear,garden,name:spec.name,summary};
}
export const urbanPreviewCells=plan=>plan?.streets?plan.streets.map(s=>({x:s.x,y:s.y,main:s.cls==='main'})):[];
export const DIRS=DIRS4;
