// CIVITAS v2.6 — Trinkets: legacy relics won by completing scenarios. Take up
// to two into any run (a scenario or a free Chronicle). They are strong on
// purpose: a run without them is decent, one lifts a city a long way in its
// theme, and two of one theme build a world city (an industrial pair is what
// a 19th-century London or a 21st-century Shanghai takes).
// Effects use the same keys as cards (cityEffects). Two special keys:
// craftDemand / tradeDemand multiply how often new workshops / shops are built;
// faithIndex / cultureIndex / learningIndex multiply the city's renown in that field.
// No imports, so legacy.js and sim.js can both read it.
export const TRINKET_SLOTS=2;
export const TRINKETS=[
 {id:'market_cross',name:'The Market Cross',theme:'trade',glyph:'✚',scenario:'ford_market',
  short:'Trade +50% · faster growth',
  effects:{trade:.5,tradeDemand:1.6,development:.15,migration:.15}},
 {id:'plague_bell',name:'The Plague Bell',theme:'people',glyph:'♁',scenario:'black_year',
  short:'Families +60% · homes +30%',
  effects:{births:.6,housing:.3,migration:.25,development:.1}},
 {id:'pilgrim_shell',name:'The Pilgrim’s Shell',theme:'faith',glyph:'✦',scenario:'pilgrim_road',
  short:'Faith ×2 · pilgrims settle',
  effects:{faith:.5,faithIndex:2.4,pilgrimage:.6,faithMigration:.12,migration:.2,housing:.15}},
 {id:'canal_lock',name:'The Golden Lock',theme:'arts',glyph:'❖',scenario:'canal_city',
  short:'Culture ×2 · trade +40%',
  effects:{arts:.5,cultureIndex:2.2,heritage:.4,trade:.4,tradeDemand:1.3,migration:.1}},
 {id:'surveyors_square',name:'The Surveyor’s Square',theme:'growth',glyph:'⊞',scenario:'ensanche',
  short:'Homes +50% · building pace +35%',
  effects:{housing:.5,development:.35,migration:.3,transport:.1}},
 {id:'steam_governor',name:'The Steam Governor',theme:'industry',glyph:'⚙',scenario:'mill_abbey',
  short:'Factories ×2 · workers flock in',
  effects:{industry:1,industrialMultiplier:.6,craftDemand:2.2,development:.25,migration:.3,housing:.25}},
 {id:'phoenix_furnace',name:'The Phoenix Furnace',theme:'industry',glyph:'☼',scenario:'rebuilding',
  short:'Industry +80% · rebuilding pace',
  effects:{industry:.8,industryPerThousand:.4,craftDemand:1.8,development:.4,housing:.3,births:.3}},
 {id:'silicon_wafer',name:'The Silicon Wafer',theme:'learning',glyph:'◈',scenario:'new_century',
  short:'Learning ×2 · innovation',
  effects:{education:.5,learningIndex:2.2,innovation:.6,technology:.4,gdp:.25,tradeDemand:1.3}}
];
export const TRINKET_INDEX=Object.fromEntries(TRINKETS.map(t=>[t.id,t]));
export const DEMAND_KEYS=['craftDemand','tradeDemand','faithIndex','cultureIndex','learningIndex'];
// The trinkets a city carries, as {key: summed value}. Demand keys multiply.
export function trinketEffects(city){
  const out={};
  for(const id of city?.trinkets||[]){const t=TRINKET_INDEX[id];if(!t)continue;
    for(const [k,v] of Object.entries(t.effects))out[k]=DEMAND_KEYS.includes(k)?(out[k]||1)*v:(out[k]||0)+v;}
  return out;
}
export const trinketDemand=(city,key)=>{let m=1;for(const id of city?.trinkets||[]){const v=TRINKET_INDEX[id]?.effects?.[key];if(v)m*=v;}return m;};
