// CIVITAS v2.6 — World Cities: a Top 20 per Age and category, Europe and the
// Mediterranean. Historical cities are listed as they stood at the end of each
// Age; your finished cities join the table with the year they reached and the
// date you played them.
//
// Population is an approximate real figure (city or conurbation, rounded;
// sources disagree before 1800). Industry is estimated from each city's
// industrial character. Wealth, Faith, Culture
// and Learning are the game's own indexes: each historical city's character
// (0–1 per trait) is scaled so that the 20th place sits just above what a
// strong run without trinkets reaches. Trinkets are what lift a city into the
// table, and two of one kind can top it.
import {AGES} from './ages.js';

export const RANK_CATEGORIES=[
  {id:'population',name:'Population',unit:'people',stat:'population',note:'Residents at the end of the Age.'},
  {id:'industry',name:'Industry',unit:'workers',stat:'industryJobs',note:'People working in workshops, mills and factories.'},
  {id:'wealth',name:'Wealth',unit:'index',stat:'gdp',note:'The size of the city\'s economy (modelled output).'},
  {id:'faith',name:'Faith',unit:'renown',stat:'religiousInfluence',note:'Religious influence: cathedrals, pilgrims, orders.'},
  {id:'culture',name:'Culture',unit:'renown',stat:'culturalPrestige',note:'Cultural prestige: art, theatres, monuments.'},
  {id:'learning',name:'Learning',unit:'renown',stat:'educationIndex',note:'Universities, schools and scholars.'}
];
export const RANK_INDEX=Object.fromEntries(RANK_CATEGORIES.map(c=>[c.id,c]));

// The game-index value of the 20th place, per Age (medieval … contemporary).
const T20={
  wealth:[3.2e7,8.5e8,2.1e10,1.3e11,5.2e11],
  faith:[400,600,750,800,820],
  culture:[300,500,650,800,900],
  learning:[200,330,420,460,480]
};

// Rosters at each Age's end. [name, population, industry share, wealth per head, faith, culture, learning]
const R={
  medieval:[ // c. 1500
    ['Cairo',400000,.2,1,.9,.8,.8],['Constantinople',200000,.2,1,.9,.7,.5],['Paris',185000,.25,1,.8,.7,.9],['Naples',150000,.15,.8,.7,.5,.4],
    ['Fez',130000,.25,.9,.85,.6,.8],['Venice',115000,.3,1.8,.6,.9,.6],['Milan',100000,.35,1.4,.6,.7,.5],['Valencia',75000,.25,1,.6,.6,.5],
    ['Florence',70000,.35,1.6,.6,1,.8],['Granada',70000,.2,.9,.6,.8,.5],['Lisbon',65000,.15,1.3,.6,.5,.3],['Tunis',65000,.2,.8,.7,.4,.4],
    ['Genoa',60000,.2,1.6,.5,.5,.3],['Rome',55000,.1,.9,1,.9,.6],['Bologna',55000,.25,1,.6,.6,1],['Ghent',55000,.4,1.1,.6,.5,.3],
    ['Palermo',55000,.15,.8,.6,.4,.2],['London',50000,.25,1.2,.6,.4,.4],['Brescia',49000,.35,.9,.5,.3,.2],['Seville',45000,.2,1.2,.7,.5,.4],
    ['Antwerp',45000,.3,1.7,.5,.6,.4],['Cologne',40000,.3,1.1,.9,.5,.6],['Toledo',40000,.25,.9,.95,.6,.6],['Prague',40000,.2,.9,.8,.6,.8],
    ['Verona',40000,.25,.9,.5,.5,.3],['Cremona',40000,.3,.9,.5,.3,.2],['Bruges',35000,.3,1.4,.6,.7,.3],['Salamanca',20000,.15,.8,.8,.5,1]
  ],
  renaissance:[ // c. 1700
    ['Constantinople',700000,.2,1,.9,.7,.4],['London',550000,.3,1.6,.6,.8,.8],['Paris',530000,.3,1.4,.75,.9,.9],['Cairo',250000,.2,.9,.9,.6,.6],
    ['Naples',216000,.15,.8,.75,.6,.4],['Amsterdam',200000,.3,2,.5,.8,.7],['Lisbon',180000,.15,1.3,.75,.5,.3],['Venice',140000,.25,1.3,.6,.9,.6],
    ['Rome',140000,.1,.9,1,1,.6],['Moscow',130000,.2,.7,.85,.4,.3],['Milan',125000,.3,1.1,.65,.6,.5],['Aleppo',115000,.25,1,.8,.5,.5],
    ['Madrid',110000,.1,1,.8,.6,.4],['Vienna',105000,.2,1.1,.85,.8,.6],['Palermo',100000,.15,.7,.7,.4,.2],['Lyon',97000,.4,1.2,.7,.5,.4],
    ['Smyrna',90000,.2,1,.6,.4,.2],['Seville',80000,.15,.9,.8,.5,.3],['Genoa',80000,.2,1.3,.6,.5,.3],['Marseille',75000,.25,1.2,.6,.4,.3],
    ['Florence',72000,.25,1.1,.7,1,.6],['Antwerp',67000,.3,1.2,.7,.6,.4],['Rouen',64000,.35,1,.6,.3,.3],['Bologna',63000,.25,.9,.75,.6,.9],
    ['Copenhagen',62000,.2,1.1,.6,.4,.5],['Dublin',60000,.25,1,.7,.4,.5],['Berlin',55000,.3,1,.6,.4,.5],['Leiden',55000,.45,1.3,.5,.5,1]
  ],
  enlightenment:[ // c. 1850
    ['London',2320000,.35,1.8,.55,.85,.85],['Paris',1310000,.3,1.5,.6,1,.95],['Constantinople',785000,.15,.8,.85,.6,.4],['St Petersburg',502000,.25,1,.75,.7,.6],
    ['Vienna',426000,.3,1.2,.8,.9,.8],['Berlin',419000,.35,1.1,.6,.7,.9],['Naples',413000,.15,.7,.75,.6,.4],['Liverpool',376000,.3,1.4,.5,.3,.3],
    ['Moscow',373000,.3,.8,.9,.5,.5],['Glasgow',345000,.45,1.2,.5,.3,.5],['Manchester',303000,.5,1.3,.45,.3,.4],['Madrid',281000,.15,1,.8,.6,.5],
    ['Dublin',263000,.2,.9,.8,.5,.6],['Cairo',260000,.15,.7,.85,.5,.5],['Milan',242000,.3,1.1,.7,.7,.6],['Lisbon',240000,.15,.9,.75,.4,.3],
    ['Birmingham',233000,.55,1.2,.5,.3,.3],['Amsterdam',224000,.2,1.4,.5,.6,.6],['Brussels',208000,.3,1.3,.6,.6,.5],['Marseille',195000,.3,1.1,.6,.4,.3],
    ['Palermo',180000,.1,.6,.75,.4,.2],['Lyon',177000,.45,1.2,.7,.5,.4],['Rome',175000,.1,.8,1,1,.6],['Hamburg',175000,.25,1.5,.5,.4,.4],
    ['Barcelona',175000,.45,1.1,.7,.5,.4],['Leeds',172000,.5,1.1,.45,.2,.3],['Edinburgh',160000,.2,1.2,.6,.8,1],['Venice',141000,.1,.8,.7,.9,.4],['Munich',110000,.25,1.1,.8,.8,.8]
  ],
  modern:[ // c. 1950
    ['London',8360000,.35,1.6,.4,.95,.95],['Paris',6280000,.3,1.4,.45,1,.95],['Moscow',5360000,.4,.8,.4,.7,.85],['Berlin',3340000,.35,1,.35,.8,.8],
    ['Leningrad',2900000,.4,.8,.4,.8,.8],['Cairo',2500000,.25,.5,.85,.6,.6],['Manchester',2420000,.5,1.1,.35,.4,.5],['Birmingham',2230000,.55,1.1,.35,.3,.4],
    ['Rome',1880000,.15,.9,1,1,.6],['Glasgow',1760000,.5,.9,.4,.3,.5],['Madrid',1700000,.2,.8,.8,.6,.5],['Leeds',1690000,.5,1,.35,.2,.3],
    ['Vienna',1615000,.3,1,.6,.9,.7],['Budapest',1615000,.35,.8,.5,.6,.6],['Hamburg',1610000,.35,1.2,.3,.4,.5],['Milan',1400000,.45,1.2,.5,.6,.6],
    ['Brussels',1400000,.35,1.3,.4,.5,.5],['Liverpool',1380000,.35,1,.45,.3,.3],['Athens',1350000,.2,.6,.7,.7,.4],['Barcelona',1280000,.45,.9,.6,.6,.5],
    ['Naples',1210000,.25,.6,.75,.6,.3],['Bucharest',1100000,.3,.6,.5,.4,.4],['Istanbul',970000,.25,.6,.8,.6,.4],['Munich',830000,.35,1.1,.6,.8,.8],
    ['Kyiv',815000,.4,.6,.5,.4,.5],['Warsaw',800000,.3,.6,.7,.4,.5],['Lisbon',790000,.2,.7,.6,.4,.3],['Stockholm',740000,.3,1.4,.3,.6,.7]
  ],
  contemporary:[ // c. 2025
    ['Cairo',22000000,.2,.4,.9,.7,.6],['Istanbul',15600000,.25,.8,.75,.8,.6],['Moscow',12600000,.2,1.1,.55,.8,.85],['Paris',11300000,.12,1.8,.4,1,.95],
    ['London',9800000,.08,2,.35,1,1],['Madrid',6800000,.1,1.3,.6,.7,.6],['Barcelona',5700000,.15,1.2,.5,.8,.6],['St Petersburg',5600000,.25,.8,.55,.85,.7],
    ['Alexandria',5500000,.25,.4,.8,.6,.5],['Berlin',4600000,.1,1.3,.3,.9,.85],['Rome',4300000,.1,1.1,1,1,.6],['Tel Aviv',4300000,.15,1.6,.5,.6,.85],
    ['Casablanca',3800000,.3,.6,.7,.4,.3],['Algiers',3700000,.2,.5,.75,.4,.4],['Milan',3200000,.25,1.7,.5,.85,.7],['Athens',3150000,.1,.8,.65,.85,.5],
    ['Kyiv',3000000,.2,.5,.6,.5,.6],['Lisbon',3000000,.1,1,.55,.6,.5],['Manchester',2900000,.15,1.1,.3,.5,.7],['Birmingham',2650000,.2,1,.3,.4,.6],
    ['Naples',2200000,.1,.7,.7,.7,.4],['Brussels',2150000,.1,1.6,.35,.6,.6],['Vienna',2050000,.12,1.6,.45,.9,.8],['Hamburg',1900000,.2,1.6,.25,.5,.6],
    ['Warsaw',1900000,.15,1.1,.6,.5,.6],['Bucharest',1800000,.2,.8,.6,.4,.5],['Munich',1600000,.2,1.9,.45,.7,.85],['Oxford',170000,.1,1.6,.5,.7,1]
  ]
};
const AGE_IDS=AGES.map(a=>a.id);
const TRAIT={faith:4,culture:5,learning:6};
// Industry counts workshop, mill, factory, building and dock jobs; later Ages employ more of them per head than the share alone says.
const INDUSTRY_SCALE=[1,1,1.8,1.3,2.2];

// One Age's historical table for one category: [{name, value}] sorted, best first.
const cache={};
export function historicTable(ageId,catId){
  const k=ageId+':'+catId;if(cache[k])return cache[k];
  const rows=R[ageId]||[],ai=AGE_IDS.indexOf(ageId);let out;
  if(catId==='population')out=rows.map(r=>({name:r[0],value:r[1]}));
  else if(catId==='industry')out=rows.map(r=>({name:r[0],value:Math.round(r[1]*r[2]*INDUSTRY_SCALE[ai]/1000)*1000}));
  else{
    const raw=rows.map(r=>({name:r[0],raw:catId==='wealth'?r[1]*r[3]:r[TRAIT[catId]]**2*Math.pow(r[1],.25)})).sort((a,b)=>b.raw-a.raw);
    const twentieth=raw[Math.min(19,raw.length-1)].raw||1,t=T20[catId][ai];
    out=raw.map(r=>({name:r.name,value:catId==='wealth'?Math.round(r.raw/twentieth*t):Math.round(r.raw/twentieth*t)}));
  }
  return cache[k]=out.sort((a,b)=>b.value-a.value);
}

// What a finished city reached in each Age: the last yearly record inside the Age.
export function cityAgeRecords(city){
  const out={};const hist=city?.history||[];
  for(const a of AGES){
    let h=null;for(const x of hist)if(x.year>=a.from&&x.year<=a.to)h=x;
    if(!h)continue;
    const row={year:h.year};for(const c of RANK_CATEGORIES)row[c.id]=Math.max(0,Math.round(Number(h[c.stat])||0));
    out[a.id]=row;
  }
  return out;
}
export const WORLD_ENTRIES_KEPT=120;
// The entry a finished run leaves in the table.
export function worldEntry(city,playedAt=Date.now()){
  return {id:city.id,name:city.name,founder:city.founder||null,scenario:city.scenario?.id||null,trinkets:city.trinkets||[],playedAt,ages:cityAgeRecords(city)};
}
// Keep the entries that rank best anywhere, then the most recent.
export function addWorldEntry(entries,entry){
  const list=[...(entries||[]).filter(e=>e.id!==entry.id),entry];
  if(list.length<=WORLD_ENTRIES_KEPT)return list;
  const keep=new Set();
  for(const a of AGE_IDS)for(const c of RANK_CATEGORIES){
    [...list].filter(e=>e.ages?.[a]).sort((x,y)=>y.ages[a][c.id]-x.ages[a][c.id]).slice(0,5).forEach(e=>keep.add(e.id));
  }
  const recent=[...list].sort((x,y)=>y.playedAt-x.playedAt);
  for(const e of recent){if(keep.size>=WORLD_ENTRIES_KEPT)break;keep.add(e.id);}
  return list.filter(e=>keep.has(e.id));
}

// The Top 20 with your cities in it. Rows: {rank, name, value, mine, entry?, year?}.
// Also returns your best city if it did not make the cut.
export function worldTable(ageId,catId,entries=[],size=20){
  const hist=historicTable(ageId,catId).map(r=>({...r,mine:false}));
  const mine=(entries||[]).filter(e=>e.ages?.[ageId]&&e.ages[ageId][catId]>0).map(e=>({name:e.name,value:e.ages[ageId][catId],year:e.ages[ageId].year,mine:true,entry:e}));
  const all=[...hist,...mine].sort((a,b)=>b.value-a.value||(a.mine?1:-1)).map((r,i)=>({...r,rank:i+1}));
  const top=all.slice(0,size),best=all.find(r=>r.mine)||null;
  return {rows:top,best:best&&best.rank>size?best:null,cutoff:top.at(-1)?.value||0};
}

// Places a run earned: [{age, category, rank}] for every Top-20 placing.
export function placingsOf(entry,others=[]){
  const out=[];
  for(const a of AGE_IDS){if(!entry.ages?.[a])continue;
    for(const c of RANK_CATEGORIES){const t=worldTable(a,c.id,[...others.filter(e=>e.id!==entry.id),entry]);
      const row=t.rows.find(r=>r.mine&&r.entry.id===entry.id);if(row)out.push({age:a,category:c.id,rank:row.rank});}}
  return out.sort((x,y)=>x.rank-y.rank);
}
export function formatRankValue(catId,v){
  if(!v)return '—';
  if(catId==='population'||catId==='industry'){if(v>=1e6)return (v/1e6).toFixed(v>=1e7?0:1)+'M';if(v>=1e4)return Math.round(v/1000)+'k';return (Math.round(v/100)/10).toFixed(1)+'k';}
  if(catId==='wealth'){const u=[[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'k']];for(const [d,s] of u)if(v>=d)return (v/d).toFixed(v>=d*10?0:1)+s;return String(v);}
  return v.toLocaleString('en-US');
}
