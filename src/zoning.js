// CIVITAS v3.3 — urban forms. A zone has an economic use (sim.js ZONES: res,
// trade, craft, farm, civic, hotel) and, from now on, a form: how that land is
// built. Each Age offers its own forms (medieval houses and guild workshops, the
// 19th-century grid, linear and garden cities, heavy industry and mines, the
// 20th-century towers, suburbs and offices). The form sets the game's figures
// (people and jobs per building, pollution, living) and how the organic map grows
// it (plot sizes, detached or terraced, planned or not, street width).
//
// Engine fields (organic/engine.js reads them): lot {w:[min,max], d:[min,max]}
// in map units (≈4 m), b: what is built ('house','palace','works','shop','tower',
// 'shed'), regular: planned (squared to a road, cross streets every `block` lots,
// street width S), detached: a gap between neighbours, spine: a main avenue laid
// through the zone first, green: a share of the zone kept as a green.
export const FORMS={
  // ── Medieval and Renaissance ──
  houses:{type:'res',label:'Houses',short:'Houses',icon:'⌂',from:1300,to:1849,
    note:'Ordinary dwellings, wall to wall along lanes',cap:1,jobs:1},
  fine:{type:'res',label:'Fine houses',short:'Fine',icon:'♜',from:1300,to:2030,
    note:'Palaces and merchant houses: fewer people, dearer land, better living',cap:.55,prosperity:.012,value:true,
    lot:{w:[3.4,5.2],d:[6,8]},b:'palace'},
  guild:{type:'craft',label:'Guilds & workshops',short:'Guilds',icon:'⚒',from:1300,to:1849,
    note:'Smiths, weavers, tanners: work in the town, some smoke',cap:1,jobs:1,
    lot:{w:[2.6,4.2],d:[4.5,6.5]},b:'works'},
  market:{type:'trade',label:'Market & shops',short:'Shops',icon:'⚖',from:1300,to:1849,
    note:'Shops on the street front, homes above',cap:1,jobs:1,b:'shop'},
  farm:{type:'farm',label:'Fields',short:'Fields',icon:'❦',from:1300,to:2030,
    note:'Farms and orchards around the town',cap:1,jobs:1},
  civic:{type:'civic',label:'Civic',short:'Civic',icon:'✚',from:1300,to:2030,
    note:'Land kept for public buildings',cap:1,jobs:1},
  // ── Enlightenment ──
  newtown:{type:'res',label:'Planned new town',short:'New town',icon:'▦',from:1700,to:1849,
    note:'A surveyed grid of terraces and squares',cap:1.15,jobs:1,prosperity:.006,
    lot:{w:[1.7,2.3],d:[5.4,6.2]},b:'house',regular:{block:10,S:3.1}},
  manufactory:{type:'craft',label:'Manufactories',short:'Mills',icon:'⚙',from:1700,to:1899,
    note:'Water mills and large workshops',cap:1,jobs:1.4,pollution:.6,
    lot:{w:[5,8],d:[7,10]},b:'works'},
  // ── Modern (1850–1949) ──
  grid:{type:'res',label:'Grid extension',short:'Grid',icon:'▦',from:1850,to:2030,
    note:'Large square blocks with chamfered corners and wide streets',cap:1.3,jobs:1,prosperity:.006,
    lot:{w:[3,4.2],d:[9,10.2]},b:'house',regular:{block:7,S:3.8}},
  linear:{plan:'linear',type:'res',label:'Linear city',short:'Linear',icon:'═',from:1850,to:2030,
    note:'Rows of houses either side of a tram avenue',cap:1,jobs:1,transport:.02,
    lot:{w:[2.6,3.4],d:[6.5,8]},b:'house',regular:{block:9,S:3.2},spine:true},
  garden:{type:'res',label:'Garden city',short:'Garden',icon:'❀',from:1880,to:2030,
    note:'Cottages in gardens round a green: few people, the best living',cap:.5,jobs:1,prosperity:.014,
    lot:{w:[3.6,5],d:[7,9]},b:'house',detached:1.6,green:.12,dv:[.35,.5]},
  workers:{type:'res',label:'Workers’ housing',short:'Terraces',icon:'▤',from:1850,to:1949,
    note:'Tight back-to-back terraces near the works: many people, poor living',cap:1.6,jobs:1,prosperity:-.01,
    lot:{w:[1.6,2],d:[4.4,5]},b:'house',regular:{block:14,S:2.6}},
  heavy:{plan:'estate',type:'craft',label:'Heavy industry',short:'Industry',icon:'🏭',from:1850,to:2030,
    note:'Steel, chemicals and engineering sheds: many jobs, much smoke',cap:1,jobs:2.2,pollution:2,
    lot:{w:[8,14],d:[10,16]},b:'shed',regular:{block:3,S:4}},
  mine:{type:'craft',label:'Mines & quarries',short:'Mines',icon:'⛏',from:1850,to:2030,
    note:'Pits and quarries, spoil heaps and headframes',cap:1,jobs:1.6,pollution:1.4,
    lot:{w:[5,8],d:[5,8]},b:'shed',pits:true},
  commerce:{type:'trade',label:'Commercial streets',short:'Shops',icon:'⚖',from:1850,to:2030,
    note:'Arcades, department stores and banks',cap:1,jobs:1.3,
    lot:{w:[3,5],d:[6,9]},b:'shop'},
  // The old town as it stands, from the Modern Age on: small streets and little room for cars.
  oldtown:{type:'res',label:'Historic quarter',short:'Historic',icon:'♖',from:1850,to:2030,
    note:'The old town as it stands: narrow streets, little room for cars',cap:1,jobs:1,prosperity:.004,b:'house'},
  // High-density grid from the 1880s: long narrow blocks between avenues, walls of apartments.
  highgrid:{plan:'ues',type:'res',label:'High-density grid',short:'Blocks',icon:'▤',from:1880,to:2030,
    note:'Long narrow blocks between avenues, tall apartment walls (Upper East Side)',cap:2.2,jobs:1,prosperity:.002,b:'block'},
  // ── Contemporary (1950–) ──
  dense:{plan:'pudong',type:'res',label:'High-density free',short:'Towers',icon:'▥',from:1950,to:2030,
    note:'Towers and slabs on lawns between wide roads (Pudong)',cap:2,jobs:1,prosperity:-.004,
    lot:{w:[6,10],d:[10,13]},b:'tower',regular:{block:4,S:5},dv:[.55,.7]},
  suburb:{plan:'suburb',type:'res',label:'Suburbs',short:'Suburbs',icon:'⌂',from:1950,to:2030,
    note:'Detached houses on curving streets: few people, long drives',cap:.45,jobs:1,prosperity:.008,transport:-.01,
    lot:{w:[3.6,4.6],d:[7,9]},b:'house',detached:1.8,curve:true,dv:[.3,.45]},
  offices:{plan:'cbd',type:'trade',label:'Offices',short:'Offices',icon:'▮',from:1950,to:2030,
    note:'Office towers: many jobs, empty at night',cap:1,jobs:2.4,
    lot:{w:[6,10],d:[8,12]},b:'tower',regular:{block:3,S:5}},
  retail:{type:'trade',label:'Retail park',short:'Retail',icon:'🛒',from:1970,to:2030,
    note:'Big boxes and car parks on the edge of town',cap:1,jobs:1.2,prosperity:-.004,
    lot:{w:[12,18],d:[12,16]},b:'shed',detached:4},
  hotel:{type:'hotel',label:'Tourism',short:'Hotels',icon:'✦',from:1300,to:2030,
    note:'Hotels and guest houses',cap:1,jobs:1,needs:'tourism'},
};
// The old six uses still work as tools (and old saves): the Age's default form for each.
const DEFAULT={res:y=>y>=1950?'dense':y>=1850?'grid':y>=1700?'newtown':'houses',trade:y=>y>=1850?'commerce':'market',craft:y=>y>=1850?'heavy':y>=1700?'manufactory':'guild',farm:()=>'farm',civic:()=>'civic',hotel:()=>'hotel'};
export const defaultForm=(type,year)=>DEFAULT[type]?.(year)||null;
// The form a zone is built in: its own, or the default for its use in the year it was zoned.
export function formOf(z){if(z?.form&&FORMS[z.form])return z.form;return defaultForm(z?.type,Number(z?.year)||1300);}
// Tools for an Age, in a fixed order: homes first, then work, then land.
const ORDER=['houses','oldtown','fine','newtown','workers','grid','highgrid','linear','garden','dense','suburb','market','commerce','offices','retail','guild','manufactory','heavy','mine','farm','civic','hotel'];
export function formsAt(year,{tourism=false}={}){return ORDER.filter(id=>{const f=FORMS[id];return year>=f.from&&year<=f.to&&(f.needs!=='tourism'||tourism);});}
// A tool id may be a form or a plain use; both resolve to {type, form}.
export function resolveZone(tool,year){if(FORMS[tool])return {type:FORMS[tool].type,form:tool};const f=defaultForm(tool,year);return f?{type:tool,form:f}:null;}
// The form a zone had in a given year (zones keep the history of their Age changes).
export function formAtYear(z,year){if(!z?.formHist)return formOf(z);let f=z.formHist[0][1];for(const [y,ff] of z.formHist)if(y<=year)f=ff;return f;}
// v3.5 a new Age: forms that belong to the old one turn into their successors. The medieval
// town becomes the Historic quarter (it is not rebuilt on its own; that is the player's
// decision), later houses become workers' terraces, guild quarters become manufactories, the planned
// new town becomes the grid, terraces become dense housing, mills become heavy industry.
const NEXT={houses:z=>(Number(z.year)||1300)<1700?'oldtown':'workers',guild:()=>'manufactory',market:()=>'commerce',newtown:()=>'grid',manufactory:()=>'heavy',workers:()=>'dense'};
export function successor(z,year){const f=formOf(z),F=FORMS[f];if(!F||year>=F.from&&year<=F.to)return null;let n=NEXT[f]?.(z)||defaultForm(F.type,year);
  for(let i=0;i<4&&n&&FORMS[n]&&!(year>=FORMS[n].from&&year<=FORMS[n].to);i++)n=NEXT[n]?.(z)||defaultForm(FORMS[n].type,year);return n&&n!==f?n:null;}
// Game figures: people and jobs per building in this form.
export const formCap=id=>FORMS[id]?.cap??1;
export const formJobs=id=>FORMS[id]?.jobs??1;
