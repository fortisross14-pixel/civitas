// Measurements of a city's street plan, shared by the map tests and scripts/map-lab.mjs.
const W=100,H=72,D4=[[1,0],[-1,0],[0,1],[0,-1]];
export function mapMetrics(city,{from=0,to=9999}={}){
  const road=new Map();for(const r of city.roads||[])if(Number.isFinite(r.x))road.set(r.y*W+r.x,r);
  const built=new Uint8Array(W*H);for(const b of city.buildings||[]){const n=(b.w||0)>1.2?2:1,x0=Math.floor(b.x),y0=Math.floor(b.y);for(let y=y0;y<y0+n;y++)for(let x=x0;x<x0+n;x++)if(x>=0&&y>=0&&x<W&&y<H)built[y*W+x]=1;}
  const has=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&road.has(y*W+x);
  let streets=0,deadEnds=0,empty=0,slivers=0;
  for(const [k,r] of road){
    const x=k%W,y=(k/W)|0;if(r.cls==='main'||r.cls==='bridge'||r.cls==='square'||(r.born??0)<from||(r.born??0)>to)continue;
    streets++;
    const n=D4.filter(([dx,dy])=>has(x+dx,y+dy)).length;
    if(n<=1&&x>1&&y>1&&x<W-2&&y<H-2)deadEnds++;
    // A street cell with nothing built within two parcels serves nobody.
    let near=false;for(let dy=-2;dy<=2&&!near;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&built[yy*W+xx]){near=true;break;}}
    if(!near)empty++;
    // Sliver: two streets running side by side with one parcel between them.
    for(const [dx,dy] of [[1,0],[0,1]]){const ax=x+2*dx,ay=y+2*dy;if(!has(ax,ay)||has(x+dx,y+dy))continue;
      // both run on for at least two more cells in the same (perpendicular) direction, with the gap staying open
      const px=dy,py=dx;let run=0;for(const s of [1,-1]){let t=1;while(t<=3&&has(x+px*t*s,y+py*t*s)&&has(ax+px*t*s,ay+py*t*s)&&!has(x+dx+px*t*s,y+dy+py*t*s)){t++;run++;}}
      if(run>=2)slivers++;}
  }
  return {streets,deadEnds,deadEndShare:streets?deadEnds/streets:0,emptyShare:streets?empty/streets:0,slivers,sliverShare:streets?slivers/streets:0,buildings:(city.buildings||[]).length,
    streetsPerBuilding:streets/Math.max(1,(city.buildings||[]).length)};
}
// Buildings and street cells within `radius` parcels of a point.
export function around(city,x,y,radius=5){
  let buildings=0,streets=0;
  for(const b of city.buildings||[])if(Math.hypot(b.x-x,b.y-y)<=radius)buildings++;
  for(const r of city.roads||[])if(Number.isFinite(r.x)&&Math.hypot(r.x-x,r.y-y)<=radius)streets++;
  return {buildings,streets};
}
