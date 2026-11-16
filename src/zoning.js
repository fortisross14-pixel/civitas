// CIVITAS v3.9 — zoning by use and by Age. A zone has a use (sim.js ZONES: res, trade,
// craft, farm, civic, hotel) and a form: how that land is built. Forms come in four groups,
// as in the classic city builders: Homes, Commercial, Industry and Land (farms, plantations,
// mines), each with a density (1 low, 2 middle, 3 high). Every Age offers its own forms;
// when an Age ends its forms are retired and each zone moves to the nearest form of the
// new Age (same group, closest density), with its neighbourhood law (Protect / Renew /
// Revamp, sim.js) deciding what happens to the buildings that stand.
//
// Engine fields (organic/engine.js reads them): lot {w:[min,max], d:[min,max]} in map
// units (≈4 m), b: what is built ('house','palace','works','shop','tower','shed','block'),
// regular: planned rows (block lots, street width S), detached: a gap between neighbours,
// spine/green/pits: a tram avenue, a village green, a quarry; plan: a planned district
// (ues, pudong, linear, suburb, cbd, estate, mall, retailpark, campus, orchard) and
// planOpt: its variant (shops in the blocks, no tall towers, small sheds…).
const M=[1300,1499],R=[1500,1699],E=[1700,1849],MO=[1850,1949],C=[1950,2030],ALL=[1300,2030];
const f=(span,o)=>({from:span[0],to:span[1],cap:1,jobs:1,...o});
export const FORMS={
  // ── Medieval (1300–1499) ──
  houses:f(M,{type:'res',group:'homes',den:2,label:'Houses',short:'Houses',icon:'⌂',note:'Ordinary dwellings, wall to wall along lanes'}),
  fine:f(M,{type:'res',group:'homes',den:1,label:'Fine houses',short:'Fine',icon:'♜',note:'Merchant houses and palaces: fewer people, dearer land, better living',cap:.55,prosperity:.012,lot:{w:[3.4,5.2],d:[6,8]},b:'palace'}),
  market:f(M,{type:'trade',group:'shops',den:2,label:'Market & shops',short:'Shops',icon:'⚖',note:'Shops on the street front, homes above',b:'shop'}),
  guild:f(M,{type:'craft',group:'work',den:1,label:'Guilds & workshops',short:'Guilds',icon:'⚒',note:'Smiths, weavers, tanners: work in the town, some smoke',lot:{w:[2.6,4.2],d:[4.5,6.5]},b:'works'}),
  // ── Renaissance (1500–1699) ──
  townhouses:f(R,{type:'res',group:'homes',den:2,label:'Town houses',short:'Houses',icon:'⌂',note:'Stone houses of three or four storeys along the streets',cap:1.1}),
  palazzi:f(R,{type:'res',group:'homes',den:1,label:'Palazzi',short:'Palazzi',icon:'♜',note:'Courtyard palaces of the great families',cap:.55,prosperity:.014,lot:{w:[3.6,5.4],d:[6.5,8.5]},b:'palace'}),
  arcades:f(R,{type:'trade',group:'shops',den:2,label:'Arcaded streets',short:'Arcades',icon:'⚖',note:'Shops under arcades, homes above',jobs:1.1,b:'shop'}),
  crafts:f(R,{type:'craft',group:'work',den:1,label:'Craftsmen’s quarter',short:'Crafts',icon:'⚒',note:'Printers, glassmakers, armourers',jobs:1.1,lot:{w:[2.8,4.4],d:[4.8,6.8]},b:'works'}),
  vineyard:f([1500,2030],{type:'farm',group:'land',den:1,label:'Vineyards & orchards',short:'Orchards',icon:'❧',note:'Rows of vines and fruit trees',plan:'orchard'}),
  // ── Enlightenment (1700–1849) ──
  faubourg:f(E,{type:'res',group:'homes',den:2,label:'Faubourg houses',short:'Houses',icon:'⌂',note:'Houses spreading along the roads out of town',cap:1.1}),
  hotels:f(E,{type:'res',group:'homes',den:1,label:'Grand houses',short:'Grand',icon:'♜',note:'Town mansions with gardens behind',cap:.55,prosperity:.014,lot:{w:[3.8,5.6],d:[7,9]},b:'palace'}),
  newtown:f(E,{type:'res',group:'homes',den:3,label:'Planned new town',short:'New town',icon:'▦',note:'A surveyed grid of terraces and squares',cap:1.15,prosperity:.006,lot:{w:[1.7,2.3],d:[5.4,6.2]},b:'house',regular:{block:10,S:3.1}}),
  shopstreets:f(E,{type:'trade',group:'shops',den:2,label:'Shopping streets',short:'Shops',icon:'⚖',note:'Shop windows and coffee houses',jobs:1.2,b:'shop'}),
  manufactory:f(E,{type:'craft',group:'work',den:3,label:'Manufactories',short:'Mills',icon:'⚙',note:'Water mills and large workshops',jobs:1.4,pollution:.6,lot:{w:[5,8],d:[7,10]},b:'works'}),
  // ── Modern (1850–1949) ──
  oldtown:f([1850,2030],{type:'res',group:'homes',den:2,label:'Historic quarter',short:'Historic',icon:'♖',note:'The old town as it stands: narrow streets, little room for cars',prosperity:.004,b:'house'}),
  workers:f(MO,{type:'res',group:'homes',den:2,label:'Workers’ terraces',short:'Terraces',icon:'▤',note:'Tight back-to-back terraces near the works: many people, poor living',cap:1.6,prosperity:-.01,lot:{w:[1.6,2],d:[4.4,5]},b:'house',regular:{block:14,S:2.6}}),
  grid:f(MO,{type:'res',group:'homes',den:2,label:'Grid extension',short:'Grid',icon:'▦',note:'Square blocks and wide streets',cap:1.3,prosperity:.006,lot:{w:[3,4.2],d:[9,10.2]},b:'house',regular:{block:7,S:3.8}}),
  highgrid:f([1880,2030],{plan:'ues',type:'res',group:'homes',den:3,label:'High-density grid',short:'Blocks',icon:'▤',note:'Long narrow blocks between avenues, tall apartment walls (Upper East Side)',cap:2.2,prosperity:.002,b:'block'}),
  linear:f(MO,{plan:'linear',type:'res',group:'homes',den:2,label:'Linear city',short:'Linear',icon:'═',note:'Villas either side of a tram avenue (Arturo Soria)',transport:.02,b:'house'}),
  garden:f([1880,1949],{type:'res',group:'homes',den:1,label:'Garden city',short:'Garden',icon:'❀',note:'Cottages in gardens round a green: few people, the best living',cap:.5,prosperity:.014,lot:{w:[3.6,5],d:[7,9]},b:'house',detached:1.6,green:.12,dv:[.35,.5]}),
  commerce:f(MO,{type:'trade',group:'shops',den:2,label:'Department stores',short:'Stores',icon:'⚖',note:'Arcades, department stores and banks',jobs:1.3,lot:{w:[3,5],d:[6,9]},b:'shop'}),
  mixed:f([1850,2030],{plan:'ues',planOpt:{shops:true},type:'trade',group:'shops',den:2,label:'Shops & flats',short:'Mixed',icon:'⊞',note:'Shops on the ground floor, flats above: busy streets',cap:1,jobs:1.2,b:'block'}),
  officeblocks:f([1900,2030],{plan:'cbd',planOpt:{mid:true},type:'trade',group:'shops',den:2,label:'Office blocks',short:'Offices',icon:'▮',note:'Office buildings of six to ten storeys',jobs:1.8,b:'tower'}),
  workshops:f([1850,2030],{plan:'estate',planOpt:{small:true},type:'craft',group:'work',den:1,label:'Small industry',short:'Workshops',icon:'⚒',note:'Garages, printers and small factories',jobs:1.2,pollution:.5,b:'shed'}),
  heavy:f([1850,2030],{plan:'estate',type:'craft',group:'work',den:3,label:'Heavy industry',short:'Industry',icon:'🏭',note:'Steel, chemicals and engineering sheds (a polígono): many jobs, much smoke',jobs:2.2,pollution:2,b:'shed'}),
  mine:f([1850,2030],{type:'craft',group:'land',den:2,label:'Mines & quarries',short:'Mines',icon:'⛏',note:'Pits and quarries, spoil heaps and headframes',jobs:1.6,pollution:1.4,lot:{w:[5,8],d:[5,8]},b:'shed',pits:true}),
  // ── Contemporary (1950–2030) ──
  suburb:f(C,{plan:'suburb',type:'res',group:'homes',den:1,label:'Suburbs',short:'Suburbs',icon:'⌂',note:'Detached houses on curving streets: few people, long drives',cap:.45,prosperity:.008,transport:-.01,b:'house'}),
  midrise:f(C,{plan:'pudong',planOpt:{slabs:true},type:'res',group:'homes',den:2,label:'Mid-rise blocks',short:'Mid-rise',icon:'▥',note:'Apartment slabs of five to eight storeys on lawns',cap:1.4,b:'tower'}),
  dense:f(C,{plan:'pudong',type:'res',group:'homes',den:3,label:'High-density free',short:'Towers',icon:'▥',note:'Towers and slabs on lawns between wide roads (Pudong)',cap:2,prosperity:-.004,b:'tower'}),
  mall:f(C,{plan:'mall',type:'trade',group:'shops',den:2,label:'Shopping mall',short:'Mall',icon:'🛍',note:'One big covered mall in a sea of parking',jobs:1.6,prosperity:-.002,b:'shed'}),
  offices:f(C,{plan:'cbd',type:'trade',group:'shops',den:3,label:'Office towers',short:'Towers',icon:'▮',note:'Office towers: many jobs, empty at night',jobs:2.4,b:'tower'}),
  retail:f([1970,2030],{plan:'retailpark',type:'trade',group:'shops',den:1,label:'Retail park',short:'Retail',icon:'🛒',note:'Big boxes round a car park on the edge of town',jobs:1.2,prosperity:-.004,b:'shed'}),
  techpark:f([1970,2030],{plan:'campus',type:'craft',group:'work',den:2,label:'Tech park',short:'Tech',icon:'◈',note:'Clean industry: labs and offices on a green campus',jobs:1.8,pollution:0,prosperity:.004,b:'tower'}),
  plantation:f(C,{plan:'orchard',planOpt:{big:true},type:'farm',group:'land',den:2,label:'Plantations',short:'Plantation',icon:'❧',note:'Large orchards and greenhouses',jobs:1.2}),
  // ── Every Age ──
  farm:f(ALL,{type:'farm',group:'land',den:1,label:'Fields',short:'Fields',icon:'❦',note:'Farms around the town'}),
  civic:f(ALL,{type:'civic',group:'civic',den:2,label:'Civic',short:'Civic',icon:'✚',note:'Land kept for public buildings'}),
  hotel:f(ALL,{type:'hotel',group:'shops',den:2,label:'Tourism',short:'Hotels',icon:'✦',note:'Hotels and guest houses',needs:'tourism'}),
};
// Groups in the zone bar, in order.
export const GROUPS=[['homes','Homes'],['shops','Commercial'],['work','Industry'],['land','Land'],['civic','Civic']];
// The old six uses still work as tools (and old saves): the Age's default form for each.
const DEFAULT={res:y=>y>=1950?'midrise':y>=1850?'grid':y>=1700?'faubourg':y>=1500?'townhouses':'houses',
  trade:y=>y>=1950?'mixed':y>=1850?'commerce':y>=1700?'shopstreets':y>=1500?'arcades':'market',
  craft:y=>y>=1950?'workshops':y>=1850?'workshops':y>=1700?'manufactory':y>=1500?'crafts':'guild',farm:()=>'farm',civic:()=>'civic',hotel:()=>'hotel'};
export const defaultForm=(type,year)=>DEFAULT[type]?.(year)||null;
// The form a zone is built in: its own, or the default for its use in the year it was zoned.
export function formOf(z){if(z?.form&&FORMS[z.form])return z.form;return defaultForm(z?.type,Number(z?.year)||1300);}
const ORDER=Object.keys(FORMS);
const live=(id,year)=>year>=FORMS[id].from&&year<=FORMS[id].to;
// Tools for an Age, grouped: homes first, then commercial, industry, land, civic.
export function formsAt(year,{tourism=false}={}){const out=[];for(const [g] of GROUPS)for(const id of ORDER){const F=FORMS[id];if(F.group===g&&live(id,year)&&(F.needs!=='tourism'||tourism))out.push(id);}return out;}
// A tool id may be a form or a plain use; both resolve to {type, form}.
export function resolveZone(tool,year){if(FORMS[tool])return {type:FORMS[tool].type,form:tool};const d=defaultForm(tool,year);return d?{type:tool,form:d}:null;}
// The form a zone had in a given year (zones keep the history of their Age changes).
export function formAtYear(z,year){if(!z?.formHist)return formOf(z);let x=z.formHist[0][1];for(const [y,ff] of z.formHist)if(y<=year)x=ff;return x;}
// A new Age: the nearest form of the new Age for a zone whose form is retired. The medieval
// town becomes the Historic quarter; otherwise the same group and use, the closest density.
export function successor(z,year){const cur=formOf(z),F=FORMS[cur];if(!F||live(cur,year))return null;
  if((F.group==='homes')&&(Number(z.year)||1300)<1700&&live('oldtown',year))return 'oldtown';
  const cands=ORDER.filter(id=>live(id,year)&&id!=='oldtown'&&FORMS[id].type===F.type&&FORMS[id].group===F.group&&!FORMS[id].needs);
  const pool=cands.length?cands:ORDER.filter(id=>live(id,year)&&FORMS[id].type===F.type&&!FORMS[id].needs);
  let best=null,bd=9;for(const id of pool){const d=Math.abs((FORMS[id].den||2)-(F.den||2))+(FORMS[id].plan&&!F.plan?.4:0);if(d<bd){bd=d;best=id;}}
  return best&&best!==cur?best:null;}
// Game figures: people and jobs per building in this form.
export const formCap=id=>FORMS[id]?.cap??1;
export const formJobs=id=>FORMS[id]?.jobs??1;
// Neighbourhood laws: what a zone does with the buildings that stand when its form changes.
export const LAWS={
  protect:{label:'Protect',note:'Buildings stay as they are; only empty land is built in the new form'},
  renew:{label:'Renew',note:'Old buildings are rebuilt over the years, the same kind but of this Age'},
  revamp:{label:'Revamp',note:'Everything is replaced over the years by the new form: unrest while it lasts, more people and value after'}
};
export function lawAt(z,year){if(!z?.lawHist)return z?.law||'protect';let x='protect';for(const [y,l] of z.lawHist)if(y<=year)x=l;return x;}
