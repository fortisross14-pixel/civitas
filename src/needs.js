// CIVITAS v1.6 — needs that appear on the map.
// Once a year every district checks three things against the city's own
// fields (src/spatial.js): are its homes within reach of public services, of
// a market, and (from 1750) out of the smoke? When most homes are not, the
// district shows a need with a ring that fills over NEED_YEARS. Serving it
// (placing the right building close enough) drains the ring twice as fast.
// A full ring means the district declines: homes empty, prosperity and
// migration suffer for a generation, and the Chronicle records it.
// Pure apart from the `apply*` helpers, which mutate a city copy inside the
// year tick like the rest of the engine.
import {W,DIRS4,key,within,rand,hash,POP_SCALE} from './geo.js';
import {districtPieces} from './districts.js';
import {BASIC_INDEX,basicsForYear} from './construction.js';
import {doctrineFlags} from './doctrines.js';

export const NEED_YEARS=30,RECOVER_YEARS=10,MIN_HOMES=8,DECLINE_SHARE=.15,DECLINE_YEARS=20,RESET_AFTER_DECLINE=0;

// Which basic buildings answer each need, by era (only ones on sale that year count).
const SERVICE_ANSWERS=year=>year<1500?['chapel']:year<1700?['school','town_hall']:year<1850?['clinic','waterworks']:year<1950?['hospital']:year<2000?['library','civic_center']:['research_center'];
export const NEEDS={
  services:{label:'Public services',icon:'✚',short:'services',
    why:'Most homes here are beyond the reach of a church, school or clinic.',
    answers:year=>SERVICE_ANSWERS(year),
    unserved:(f,k)=>f.service[k]<.35,share:.5},
  market:{label:'A market',icon:'⚖',short:'market',
    why:'Most homes here are far from a market or a main street.',
    answers:year=>['market',...(year>=1500&&year<1700?['guildhall']:[]),...(year>=1850&&year<1950?['station']:[]),...(year>=2000?['transit_hub']:[])],
    // The Town Center's Market Cross counts as a market for the homes around it.
    unserved:(f,k,city,extra)=>f.trade[k]<.3&&!nearCenter(city,k,5+(city.center?.level||1))&&!(extra&&extra.has(k)),share:.6},
  air:{label:'Clean air',icon:'❦',short:'air',from:1750,
    why:'Workshop smoke hangs over most homes here. Public gardens nearby clear the air.',
    answers:()=>['garden'],
    unserved:(f,k)=>f.pollution[k]*f.homeShield*(f.green&&f.green[k]>=.3?.4:1)>=.8,share:.4}
};
export const NEED_KINDS=Object.keys(NEEDS);
function nearCenter(city,k,r){const c=city?.center;if(!c)return false;const x=k%W,y=Math.floor(k/W);return Math.hypot(x-c.x,y-c.y)<=r;}

// Buildings that answer a need and can be built right now.
export function needAnswers(kind,year){
  const open=new Set(basicsForYear(year).map(b=>b.id));
  return NEEDS[kind].answers(year).filter(id=>open.has(id)).map(id=>BASIC_INDEX[id]);
}

// Districts with their buildings, matched by anchor like districtDetails().
export function districtsWithBuildings(city){
  const {piece,pieces}=districtPieces(city),out=[],used=new Set();
  for(const d of city.districts||[]){
    const [x,y]=d.anchor||[];if(!within(x,y))continue;let p=piece[key(x,y)];
    if(p<0)for(const [dx,dy] of DIRS4){if(within(x+dx,y+dy)&&piece[key(x+dx,y+dy)]>=0){p=piece[key(x+dx,y+dy)];break;}}
    if(p<0||used.has(p))continue;used.add(p);
    out.push({id:d.id,name:d.name,buildings:pieces[p].buildings});
  }
  return out;
}

// What each district lacks right now: [{district,name,kind,share,homes,x,y}].
export function assessNeeds(city,fields){
  const out=[];if(!fields)return out;
  const extraMarkets=doctrineMarkets(city);
  for(const d of districtsWithBuildings(city)){
    const homes=d.buildings.filter(b=>b.type==='res'&&!b.vacant);
    if(homes.length<MIN_HOMES)continue;
    let cx=0,cy=0;for(const b of homes){cx+=b.x;cy+=b.y;}cx=cx/homes.length+.5;cy=cy/homes.length+.5;
    for(const kind of NEED_KINDS){
      const def=NEEDS[kind];if(def.from&&city.year<def.from)continue;
      if(!needAnswers(kind,city.year).length)continue;
      const unserved=homes.filter(b=>def.unserved(fields,key(Math.floor(b.x),Math.floor(b.y)),city,kind==='market'?extraMarkets:null)).length,share=unserved/homes.length;
      if(share>=def.share)out.push({district:d.id,name:d.name,kind,share,homes:homes.length,x:cx,y:cy});
    }
  }
  return out;
}

// v1.8 Faith 4: churches count as markets (pilgrim fairs); Industry 4: workshops (company stores).
const RELIGIOUS=new Set(['chapel','monastery','shrine']);
function doctrineMarkets(city){
  const f=doctrineFlags(city);if(!f.churchMarket&&!f.workshopMarket)return null;
  const cells=new Set(),mark=(x0,y0,r)=>{for(let y=Math.floor(y0-r);y<=y0+r;y++)for(let x=Math.floor(x0-r);x<=x0+r;x++)if(within(x,y)&&Math.hypot(x-x0,y-y0)<=r)cells.add(key(x,y));};
  for(const b of city.buildings||[]){if(b.vacant)continue;
    if(f.churchMarket&&(RELIGIOUS.has(b.special)||(b.type==='civic'&&!b.special)))mark(Math.floor(b.x),Math.floor(b.y),6);
    if(f.workshopMarket&&b.type==='craft')mark(Math.floor(b.x),Math.floor(b.y),f.workshopMarket);}
  return cells;
}
export const needId=n=>`${n.district}:${n.kind}`;
export function needsOf(city){return Array.isArray(city?.needs)?city.needs:[];}

// One year of needs. Mutates `city` (a working copy inside the year tick).
// Returns the declines that happened, so the caller can score them.
export function advanceNeeds(city,fields,year){
  if(!city.needsOn)return [];
  const now=assessNeeds(city,fields),byId=new Map(now.map(n=>[needId(n),n]));
  const next=[],declines=[];
  for(const old of needsOf(city)){
    const cur=byId.get(needId(old));
    if(cur){byId.delete(needId(old));
      const progress=Math.min(1,old.progress+(.5+cur.share)/NEED_YEARS*fillRate(city,cur.kind));
      const n={...cur,progress,since:old.since};
      if(progress>=1){declines.push(applyDecline(city,n,year));n.progress=RESET_AFTER_DECLINE;}
      next.push(n);
    }else{
      // Served (or the district changed): the ring drains and the need fades.
      const progress=old.progress-1/RECOVER_YEARS;
      if(progress>0)next.push({...old,progress,served:true});
      else if(!old.served||old.progress>.2)city.events.push({year,type:'need_met',x:old.x,y:old.y,text:`${old.name} now has ${NEEDS[old.kind].label.toLowerCase()}.`});
    }
  }
  for(const n of byId.values()){next.push({...n,progress:(.5+n.share)/NEED_YEARS*fillRate(city,n.kind),since:year});
    city.events.push({year,type:'need',x:n.x,y:n.y,text:`${n.name} needs ${NEEDS[n.kind].label.toLowerCase()}. ${NEEDS[n.kind].why}`});}
  city.needs=next;
  return declines;
}

function fillRate(city,kind){const f=doctrineFlags(city);return (f.needRate||1)*(kind==='air'?f.airRate||1:1);}
// A district that waited too long empties out and loses heart for a generation.
function applyDecline(city,need,year){
  const r=rand(hash(city.seed,year,need.district,need.kind));
  const district=districtsWithBuildings(city).find(d=>d.id===need.district);
  const homes=(district?.buildings||[]).filter(b=>b.type==='res'&&!b.vacant);
  const emptied=new Set(homes.filter(()=>r()<DECLINE_SHARE*(doctrineFlags(city).declineShare||1)).map(b=>b.id));
  let people=0;
  city.buildings=city.buildings.map(b=>{if(!emptied.has(b.id))return b;people+=b.capacity||8*POP_SCALE;return {...b,vacant:true,vacantSince:year};});
  city.residents=Math.max(40*POP_SCALE,(city.residents||0)-Math.round(people*.8));
  // A district declines once at a time: a new decline replaces its previous penalty.
  city.effectsTimed=[...(city.effectsTimed||[]).filter(t=>t.until>year&&t.source!==`decline:${need.district}`),{source:`decline:${need.district}`,label:`${need.name} in decline`,until:year+DECLINE_YEARS,effects:{prosperity:-2,migration:-.04}}];
  city.declines=(city.declines||0)+1;
  const text=`${need.name} fell into decline for want of ${NEEDS[need.kind].label.toLowerCase()}: ${emptied.size} homes stand empty and the city's prosperity suffers for ${DECLINE_YEARS} years.`;
  city.events.push({year,type:'decline',x:need.x,y:need.y,impact:emptied.size,text});
  return {...need,homesEmptied:emptied.size,people};
}

export function normalizeNeeds(list){
  if(!Array.isArray(list))return [];
  return list.filter(n=>n&&typeof n.district==='string'&&NEEDS[n.kind]&&Number.isFinite(n.progress)&&Number.isFinite(n.x)&&Number.isFinite(n.y))
    .map(n=>({district:n.district,name:String(n.name||'A district'),kind:n.kind,share:Number(n.share)||0,homes:Number(n.homes)||0,x:n.x,y:n.y,progress:Math.max(0,Math.min(1,n.progress)),since:Number(n.since)||0,...(n.served?{served:true}:{})}));
}
