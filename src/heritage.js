// CIVITAS v3.2 — the old city as decisions. Features that outlive their first use
// (a canal, a royal chase, the market square, the old bridge, the university, a
// palace, a parish church, the port) become sites the player decides on: keep,
// convert or replace. Each option costs coins now and changes the city for good:
// its effects join cityEffects, and the organic map redraws the site (organic/engine.js
// reads city.heritage). Nothing here changes by itself any more.
//
// A site is {id,kind,x,y,name,born,ripe?} in grid cells. Game sites come from the
// city's buildings and bridges (gameSites); map sites (canal, chase, squares, palaces)
// come from the organic map (organicSites in organic/index.js).

const modern=y=>y>=1950;
// Each kind: when it becomes a question (from), and its options. An option:
// id, label, detail (one short line), cost (coins; negative = the city is paid),
// effects (permanent, as building effects), unrest (once), name (the site's new name on the map).
export const HERITAGE={
  canal:{title:'The old canal',from:1750,lead:'It watered the fields. The town has grown over them.',
    options:y=>[
      {id:'keep',label:'Keep it for the fields',detail:'Farms and gardens keep their water',cost:0,effects:{prosperity:1}},
      {id:'street',label:'Cover it: a main street',detail:'A straight high street; shops line it',cost:320,effects:{trade:.06,transport:.06,heritage:-.02},name:'Canal Street'},
      {id:'walk',label:'Line it with promenades',detail:'Trees along the water; homes nearby gain',cost:260,effects:{prosperity:2,heritage:.04,tourismIncome:.04},name:'the Canal Walk'}]},
  chase:{title:'The Royal Chase',from:1650,needs:'ripe',lead:'The hunting woods are now surrounded by the city.',
    options:y=>[
      {id:'keep',label:'Keep it closed',detail:'Royal woods: no one walks there',cost:0,effects:{heritage:.02}},
      {id:'park',label:'Open it as a city park',detail:'The best living in town around it',cost:420,effects:{prosperity:4,migration:.04,tourismIncome:.03},name:'Chase Park'},
      {id:'sell',label:modern(y)?'Sell it for offices':'Sell it for building',detail:modern(y)?'Coins and jobs; living drops and people leave':'Coins and homes; the green is gone',cost:modern(y)?-1400:-700,effects:modern(y)?{trade:.08,prosperity:-3,migration:-.04}:{housing:.05,prosperity:-2},unrest:6}]},
  market:{title:'The old market square',from:1800,age:100,lead:'Stalls on the stones since the town began.',
    options:y=>[
      {id:'keep',label:'Keep the open market',detail:'Stalls stay; trade stays local',cost:0,effects:{trade:.02}},
      {id:'plaza',label:'Make it a plaza',detail:'Trees and a fountain; living and value rise',cost:240,effects:{prosperity:2,tourismIncome:.04,trade:-.02},name:'Plaza'},
      y>=1950?{id:'hall',label:'Replace it with a mall',detail:'Big trade; the old square is lost',cost:900,effects:{trade:.12,heritage:-.05,prosperity:-1},name:'the Mall'}
        :{id:'hall',label:'Build a covered market',detail:'An iron market hall on the square',cost:520,effects:{trade:.08,services:.03},name:'the Market Hall'}]},
  bridge:{title:'The old bridge',from:1850,lead:'Built for carts. Now come carriages, trams and cars.',
    options:y=>[
      {id:'walk',label:'Keep it for walking',detail:'Tourists and strollers; traffic goes round',cost:150,effects:{tourismIncome:.05,heritage:.04,transport:-.02},name:'the Old Bridge'},
      {id:'widen',label:y>=1900?'Widen it for cars':'Widen it for carriages',detail:'More traffic over the river; the old arches go',cost:600,effects:{transport:.08,heritage:-.04}},
      {id:'new',label:'Build a new bridge beside it',detail:'The old one is kept; the new one carries the traffic',cost:1200,effects:{transport:.10,tourismIncome:.03}}]},
  university:{title:'The old university',from:1850,age:150,lead:'Its colleges fill the old streets; it has no room to grow.',
    options:y=>[
      {id:'keep',label:'Keep it in the old town',detail:'A university town: students in every street',cost:0,effects:{education:.04,heritage:.03}},
      {id:'grow',label:'Let it take the quarter',detail:'It grows over the houses around it',cost:700,effects:{education:.12,housing:-.03},unrest:3},
      {id:'campus',label:'Move it to a new campus',detail:'The old halls become a library; a campus on the edge',cost:1400,effects:{education:.14,arts:.05},name:'the Old University Library'}]},
  palace:{title:'An old palace',from:1830,age:80,lead:'The family has gone; the rooms stand empty.',
    options:y=>[
      {id:'keep',label:'Leave it to its owners',detail:'It stays a private house',cost:0,effects:{}},
      {id:'museum',label:'Make it a museum',detail:'Culture and visitors; the cheap way to a museum',cost:480,effects:{arts:.10,tourismIncome:.06,heritage:.05},name:'the Museum'},
      {id:'offices',label:'Government offices',detail:'Ministries move in; services improve',cost:380,effects:{services:.08,treasury:.04},name:'the Ministry'},
      {id:'flats',label:'Pull it down for flats',detail:'Homes and a little coin; heritage lost',cost:-220,effects:{housing:.04,heritage:-.05}}]},
  church:{title:'The old parish church',from:1900,age:200,lead:'Fewer come to Mass; the roof needs mending.',
    options:y=>[
      {id:'keep',label:'Restore it',detail:'It stays a church',cost:220,effects:{faith:.04,heritage:.03}},
      {id:'culture',label:'Make it a cultural centre',detail:'Concerts and a library under the old vaults',cost:400,effects:{arts:.08,faith:-.05},name:'the Arts Centre'},
      {id:'sell',label:'Sell it for flats',detail:'Coins and homes; the parish is angry',cost:-300,effects:{housing:.03,faith:-.08,heritage:-.03},unrest:4}]},
  oldtown:{title:'The old town and the car',from:1920,needs:'ripe',lead:'Its streets were laid for carts and feet. Now they are jammed.',
    options:y=>[
      {id:'pedestrian',label:'Close it to cars',detail:'Streets for walking: visitors and value rise; shops lose drivers',cost:600,effects:{tourismIncome:.08,heritage:.08,trade:-.03},name:'Old Town (no cars)'},
      {id:'avenues',label:'Cut wide avenues through it',detail:'Traffic flows; some old houses come down',cost:1500,effects:{transport:.08,heritage:-.08},unrest:3},
      {id:'rebuild',label:'Rebuild it: towers and offices',detail:'Avenues and dense housing over decades; the old town is lost',cost:2500,effects:{trade:.08,housing:.06,heritage:-.18},unrest:8}]},
  port:{title:'The old port',from:1950,lead:'Ships are too big for the old quays.',
    options:y=>[
      {id:'keep',label:'Keep it working',detail:'Trade stays where it is',cost:0,effects:{trade:.02}},
      {id:'front',label:'A waterfront for people',detail:'Promenades and museums on the quays',cost:1500,effects:{tourismIncome:.12,prosperity:3,trade:-.08},name:'the Waterfront'},
      {id:'move',label:'A container port downstream',detail:'Big trade; smoke and lorries',cost:2200,effects:{trade:.15,pollution:.2}}]},
};
const CHURCH=new Set(['chapel','church','monastery','cathedral','shrine']);
// Sites the game itself knows: old bridges and landmark buildings.
export function gameSites(city){
  const out=[];
  for(const b of city.bridges||[])if(b.cells?.length){const m=b.cells[Math.floor(b.cells.length/2)];out.push({id:`bridge:${b.id}`,kind:'bridge',x:m[0]+.5,y:m[1]+.5,born:b.built||1300});}
  for(const b of city.buildings||[]){if(!b.special)continue;const kind=b.special==='university'?'university':CHURCH.has(b.special)&&b.special!=='cathedral'?'church':b.special==='port'?'port':null;
    if(kind)out.push({id:`b:${b.id}`,kind,x:b.x+1,y:b.y+1,born:b.born||1300,bid:b.id,name:b.label||null});}
  // The old town, once its streets are jammed (sim sets city.coreJam each year).
  if(city.center)out.push({id:'oldtown',kind:'oldtown',x:city.center.x+.5,y:city.center.y+.5,born:1300,ripe:(city.coreJam||0)>=.8});
  return out;
}
export const heritageOf=city=>city.heritage||{};
// Is this site a question now? Old enough, its Age reached, not decided yet.
export function isOpen(city,site){
  const def=HERITAGE[site.kind];if(!def||heritageOf(city)[site.id])return false;
  if(city.year<def.from)return false;
  if(site.kind==='bridge'&&site.born>=1800)return false;
  if(def.age&&city.year-site.born<def.age)return false;
  if(def.needs==='ripe'&&!site.ripe)return false;
  return true;
}
// v4.0 (M4): prices follow the city's income (last year's), so a big modern city still
// weighs a decision: ×1 up to 250 coins a year, rising with income, at most ×8.
export function costScale(city){const b=city.budget?.last||city.budget?.current;const inc=b?Object.values(b.income||{}).reduce((a,v)=>a+(Number(v)||0),0):0;return Math.max(1,Math.min(8,inc/250));}
const nice=v=>{const a=Math.abs(v),p=a>=5000?500:a>=1000?100:10;return Math.sign(v)*Math.round(a/p)*p;};
export const optionsFor=(city,site)=>{const k=costScale(city);return (HERITAGE[site.kind]?.options(city.year)||[]).map(o=>o.cost?{...o,cost:nice(o.cost*k)}:o);};
// At most MAX_OPEN questions at a time, one per kind first, the oldest first: the map stays readable.
export const MAX_OPEN=4;
export function openSites(city,mapSites=[]){
  const seen=new Set(),all=[...gameSites(city),...mapSites].filter(s=>{if(seen.has(s.id))return false;seen.add(s.id);return isOpen(city,s);}).sort((a,b)=>(a.born||0)-(b.born||0));
  const kinds=new Set(),first=[],rest=[];for(const s of all)(kinds.has(s.kind)?rest:first).push(s),kinds.add(s.kind);
  return [...first,...rest].slice(0,MAX_OPEN);
}
// Decide a site. Returns {city,error}.
export function decideHeritage(city,site,optionId){
  if(!site||!HERITAGE[site.kind])return {city,error:'Nothing to decide there.'};
  if(heritageOf(city)[site.id])return {city,error:'Already decided.'};
  if(!isOpen(city,site))return {city,error:'Not yet a question.'};
  const opt=optionsFor(city,site).find(o=>o.id===optionId);if(!opt)return {city,error:'Unknown choice.'};
  if(opt.cost>0&&opt.cost>(city.funds||0))return {city,error:`Needs ${opt.cost} coins.`};
  const def=HERITAGE[site.kind],rec={kind:site.kind,option:opt.id,year:city.year,x:site.x,y:site.y,effects:opt.effects||{},name:opt.name||null};
  const next={...city,funds:(city.funds||0)-opt.cost,heritage:{...heritageOf(city),[site.id]:rec},
    unrest:Math.min(100,(city.unrest||0)+(opt.unrest||0)),
    events:[...(city.events||[]),{year:city.year,type:'heritage',x:site.x,y:site.y,text:`${def.title}: ${opt.label.toLowerCase()}.`}]};
  return {city:next,error:null,option:opt};
}
// Permanent effects of every decision taken (added in cityEffects).
export function heritageEffects(city){
  const out={};for(const r of Object.values(heritageOf(city)))for(const [k,v] of Object.entries(r.effects||{}))out[k]=(out[k]||0)+v;return out;
}
